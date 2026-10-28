/* M1.6.6 candidate — bounded retry for player-owned snapshot sync.
   Retries only transient PostgreSQL/network failures on the existing CAS RPC.
   The room revision, member token, state delta and request scope stay unchanged. */
(() => {
  'use strict';
  if (typeof SB === 'undefined' || typeof SB.rpc !== 'function') throw new Error('M166_SUPABASE_CLIENT_MISSING');
  const rpc = SB.rpc.bind(SB);
  const waits = [160, 360, 760, 1200];
  const transient = error => /55P03|57014|40P01|deadlock|lock not available|statement timeout|timeout|failed to fetch|load failed|network|connection/i.test(
    [error?.code, error?.message, error?.details, error?.hint, error?.name].filter(Boolean).join(' ')
  );
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  // M1.6.7 owns read coalescing and its bounded jitter. A second debounce here
  // accidentally stacked another 0.25–5s on every realtime phase notification;
  // with a large room row, clients could miss the 15–18s convergence window.
  SB.rpc = function(name, args, ...rest) {
    // Capture once, before delay/retry. An old action must never acquire a new epoch.
    const scope = args?.p_state?._g526 || (typeof load === 'function' ? load()?._g526 : null);
    const capturedEpoch = scope?.epoch;
    const invoke = () => {
      const query = rpc(name, args, ...rest);
      if (Number.isSafeInteger(capturedEpoch) && capturedEpoch > 0) {
        if (query.headers && typeof query.headers.set === 'function') query.headers.set('x-g526-epoch', String(capturedEpoch));
        else query.headers = {...query.headers, 'x-g526-epoch': String(capturedEpoch)};
      }
      return query;
    };
    const playerStateWrite = name === 'update_game_room_state_secure' && session?.role === 'player';
    const roomRead = name === 'fetch_game_room_state_secure';
    // Keep Supabase's native PostgREST query builder intact until callers can
    // attach abortSignal(). Cancellation must happen before the thenable starts.
    if (roomRead) return invoke();
    // Other callers (including M173) rely on Promise methods such as finally().
    // Assimilate the PostgREST thenable, while keeping the room-read builder
    // native above so fetchRoomLatest can attach abortSignal() before execution.
    if (!playerStateWrite) return Promise.resolve(invoke());
    return (async () => {
    const started = Date.now();
    await sleep(Math.floor(Math.random() * 700));
    for (let attempt = 1; attempt <= waits.length + 1; attempt++) {
      let result;
      try { result = await invoke(); }
      catch (error) { result = { data: null, error }; }
      if (!result?.error || !transient(result.error)) {
        if (attempt > 1) console.info('[PLAYER_STATE_RETRY]', JSON.stringify({rpc: name, attempt, result: result?.error ? 'terminal' : 'success', code: result?.error?.code || '', elapsedMs: Date.now() - started}));
        return result;
      }
      if (attempt > waits.length) {
        console.error('[PLAYER_STATE_RETRY]', JSON.stringify({rpc: name, attempt, result: 'exhausted', code: result.error?.code || '', message: result.error?.message || String(result.error), elapsedMs: Date.now() - started}));
        return result;
      }
      const waitMs = waits[attempt - 1] + Math.floor(Math.random() * 41);
      console.warn('[PLAYER_STATE_RETRY]', JSON.stringify({rpc: name, attempt, result: 'retry', code: result.error?.code || '', message: result.error?.message || String(result.error), waitMs, elapsedMs: Date.now() - started}));
      await sleep(waitMs);
    }
    return {data: null, error: new Error('PLAYER_STATE_RETRY_EXHAUSTED')};
    })();
  };
  window.M166_VERSION = 'M1.6.6-PLAYER-STATE-RETRY';
})();
