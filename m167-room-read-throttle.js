/* M1.6.7 candidate — spread full-room reads across swarm clients.
   Player-private P5/P6 acknowledgements already update the originating tab. Their
   peer fan-out is narrowed to Host; all players still verify the committed row on
   the next Host phase-change broadcast. Realtime remains primary for phases. */
(() => {
  'use strict';
  if (typeof m153FetchRoomCoalesced !== 'function') throw new Error('M167_ROOM_FETCH_BASE_MISSING');
  // M173: one queue, revision-aware completion. A response may satisfy events
  // that arrived during its flight. Unversioned/staged input requests still need
  // a read started after their arrival; never use room revision for private inputs.
  let fetchTimer = null, fetchFlight = null, fetchWaiters = [], lastRow = null;
  let serial = 0, lastScope = '';
  const identity = () => `${ROOM?.id}:${session?.role}:${typeof currentMemberToken==='function'?currentMemberToken():''}`;
  const playerSlot = () => Object.keys(load()?.players||{}).indexOf(session?.name);
  const readAdmissionMs = () => {
    const slot=playerSlot();
    return session?.role==='player'&&slot>=0?250+slot*250:250;
  };
  const metrics={requests:0,reads:0,covered:0,readLockRetries:0};
  const FETCH_DEADLINE_MS = 10000;
  const READ_LOCK_RETRY_DELAYS_MS = [160,360,760];
  window.__M173_READ_STATUS__=()=>({...metrics,pending:fetchWaiters.length,inFlight:!!fetchFlight});
  const covered = w => w.revision > 0 && lastScope === identity() && lastRow?.id === ROOM?.id &&
    Number(lastRow.revision) >= w.revision;
  const drainFetch = async () => {
    fetchTimer = null;
    if (fetchFlight) return;
    const batch = fetchWaiters.splice(0);
    if (!batch.length) return;
    const startedSerial = serial, roomId = ROOM?.id, requestScope=identity();
    metrics.reads++;
    let deadlineTimer = null;
    try {
      if (typeof AbortController !== 'function') { const unsupported = new Error('ROOM_READ_ABORT_UNSUPPORTED'); unsupported.code = 'ROOM_READ_ABORT_UNSUPPORTED'; throw unsupported; }
      const controller = new AbortController();
      const operation = Promise.resolve().then(() => fetchRoomLatest(controller.signal));
      const deadline = new Promise((_, reject) => { deadlineTimer = setTimeout(() => { const timeout = new Error('ROOM_READ_TIMEOUT'); timeout.code = 'ROOM_READ_TIMEOUT'; reject(timeout); controller.abort(); }, FETCH_DEADLINE_MS); });
      fetchFlight = Promise.race([operation, deadline]);
      const value = await fetchFlight;
      if (roomId === ROOM?.id && value?.id === roomId && requestScope===identity()) {lastRow = value;lastScope=requestScope;}
      batch.forEach(w => {
        if(w.revision>0 && !covered(w)) {
          if((w.attempt=(w.attempt||0)+1)<4) fetchWaiters.push(w);
          else w.reject(new Error('ROOM_REVISION_NOT_REACHED'));
        } else w.resolve(value);
      });
      fetchWaiters = fetchWaiters.filter(w => {
        if (covered(w) || (!w.revision && w.serial <= startedSerial)) { w.resolve(value); return false; }
        return true;
      });
    } catch (error) {
      // A 55P03 means this idempotent SELECT could not acquire its lock.
      // Retry it a small, bounded number of times here, where each retry creates
      // a fresh native PostgREST query and can still be cancelled by AbortSignal.
      // Do not retry statement timeouts, explicit cancellation, or other errors.
      if (String(error?.code || '') === '55P03') {
        const retryable=[], exhausted=[];
        for (const waiter of batch) {
          waiter.lockRetries=(waiter.lockRetries||0)+1;
          (waiter.lockRetries<=READ_LOCK_RETRY_DELAYS_MS.length?retryable:exhausted).push(waiter);
        }
        if (retryable.length) {
          metrics.readLockRetries+=retryable.length;
          fetchWaiters=retryable.concat(fetchWaiters);
          if (!fetchTimer) {
            const retries=Math.max(...retryable.map(w=>w.lockRetries));
            const delay=READ_LOCK_RETRY_DELAYS_MS[Math.min(retries-1,READ_LOCK_RETRY_DELAYS_MS.length-1)];
            fetchTimer=setTimeout(drainFetch,delay);
          }
        }
        for (const waiter of exhausted) waiter.reject(error);
      } else batch.forEach(w => w.reject(error));
    }
    finally {
      if (deadlineTimer !== null) clearTimeout(deadlineTimer);
      fetchFlight = null;
      if (fetchWaiters.length && !fetchTimer) fetchTimer = setTimeout(drainFetch, 0);
    }
  };
  m153FetchRoomCoalesced = function(hint) {
    // Only revisions explicitly identifying room-state commits are reusable.
    const reason = String(hint?.reason || '');
    const revision = /^(m154_trade|m156_trade|m156_resource_trade|m156_resource_cancel|m154_cancel|m156_cancel|m154_control_phase_|m161_host_)/.test(reason)
      ? Number(hint?.revision) || 0 : 0;
    const waiter = {revision, serial: ++serial};
    metrics.requests++;
    if (covered(waiter)) {metrics.covered++;return Promise.resolve(lastRow);}
    const promise = new Promise((resolve, reject) => fetchWaiters.push({...waiter,resolve,reject}));
    if (!fetchTimer && !fetchFlight) fetchTimer = setTimeout(drainFetch, readAdmissionMs());
    return promise;
  };

  // A Host phase commit fans out to every player. Each client must read the
  // authoritative row, but issuing 15 large SELECTs in the same millisecond
  // overloaded P5→P6 at Market 3. Give each player a stable admission slot;
  // the caller still waits for the committed phase and revision as its barrier.
  window.__M167_FETCH_NOW__ = function(hint, admissionMs=0) {
    const promise = m153FetchRoomCoalesced(hint);
    if (fetchTimer) clearTimeout(fetchTimer);
    fetchTimer = null;
    if (!fetchFlight && fetchWaiters.length) fetchTimer=setTimeout(drainFetch,admissionMs);
    else if (fetchFlight && fetchWaiters.length && !fetchTimer) {
      fetchTimer = setTimeout(drainFetch, admissionMs);
    }
    return promise;
  };
  window.__M167_FETCH_PHASE__ = async function(phase, revision) {
    const target = String(phase || '');
    const minimumRevision = Number(revision) || 0;
    const slot=playerSlot();
    const admissionMs=session?.role==='player'&&slot>=0?slot*250:0;
    for (let attempt = 0; attempt < 8; attempt++) {
      // A stale replica response must still be checked against both boundaries.
      if (attempt) await new Promise(resolve => setTimeout(resolve, 120 + Math.floor(Math.random() * 360)));
      await window.__M167_FETCH_NOW__({reason:'m161_host_'+target,revision:minimumRevision},attempt?0:admissionMs);
      const state = load();
      if (String(state?.phase || '') === target &&
          (!minimumRevision || Number(ROOM?.revision || 0) >= minimumRevision)) return true;
    }
    return false;
  };

  // Peer UI does not need 15 full snapshots for a player-owned private-field
  // acknowledgement or an unlabelled local CAS update. Preserve the broadcast
  // to Host, which owns the aggregate view; player tabs apply their own RPC ack
  // locally and receive the authoritative full state at the next Host phase.
  const baseBroadcast = broadcastRoomSignal;
  if (typeof baseBroadcast !== 'function') throw new Error('M167_BROADCAST_BASE_MISSING');
  broadcastRoomSignal = function(event, payload, ...args) {
    if (event === 'state_changed' && session?.role === 'player' &&
        (!payload?.reason || /^m160_p[56]_/.test(payload.reason))) {
      const state = typeof load === 'function' ? load() : null;
      payload = {
        ...(payload || {}),
        __m167SenderRole: 'player',
        // P2 targets are private player inputs. Every client already has its
        // own local acknowledgement; peer snapshots are needed only when the
        // Host closes P2 and rebases its transition against the authoritative
        // row. Fan-out here made the Host fetch the entire growing room JSON
        // once for each of 15 target writes, causing 57014 statement timeouts.
        ...(state?.phase === 'P2' ? { __m168PrivatePhase: 'P2' } : {})
      };
    }
    return baseBroadcast.call(this, event, payload, ...args);
  };

  // The production poll is only a recovery path for missed realtime messages.
  // Lengthen it for high-player rooms so it cannot contend with the write path;
  // broadcasts still trigger bounded, jittered reads immediately.
  const baseSubscribe = subscribeRoom;
  if (typeof baseSubscribe !== 'function') throw new Error('M167_ROOM_SUBSCRIBE_BASE_MISSING');
  subscribeRoom = async function(...args) {
    const result = await baseSubscribe.apply(this, args);
    if (ROOM_SIGNAL_POLL) clearInterval(ROOM_SIGNAL_POLL);
    const count = Object.keys(load()?.players || {}).length;
    const pollMs = count > 7 ? 30000 : count > 5 ? 18000 : 9000;
    ROOM_SIGNAL_POLL = setInterval(() => {
      if (ROOM?.id) m153FetchRoomCoalesced().catch(() => verifyRoomActiveV464?.(ROOM?.code));
    }, pollMs);
    return result;
  };
  // A restored network must not wait an entire 30-second recovery poll.
  // One debounced, staggered read uses the existing coalescing queue; no new loop.
  let onlineRecoveryTimer = null;
  window.addEventListener('offline', () => {
    if (onlineRecoveryTimer !== null) clearTimeout(onlineRecoveryTimer);
    onlineRecoveryTimer = null;
  });
  window.addEventListener('online', () => {
    if (!ROOM?.id || onlineRecoveryTimer !== null) return;
    const scope = identity();
    onlineRecoveryTimer = setTimeout(() => {
      onlineRecoveryTimer = null;
      if (navigator.onLine && ROOM?.id && identity() === scope)
        m153FetchRoomCoalesced({reason:'network_online'}).catch(() => {});
    }, 250);
  });
  window.M167_VERSION = 'M1.6.7-ROOM-READ-THROTTLE';
  window.M168_VERSION = 'M1.6.8-PRIVATE-P2-READ-FANOUT';
})();
