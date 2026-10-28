/* M1.6.9 candidate — losslessly delta-encode per-market restore snapshots.
   The old format copied every player's full history, all trades, and all
   settlements into every market snapshot. This made a five-market game grow
   quadratically and made otherwise-correct CAS/fetch RPCs time out on the large
   room JSON row. Market rollback still reconstructs the exact point-in-time
   player state and derives historical trades/results from the authoritative
   room history. */
(() => {
  'use strict';
  if (typeof makeRoundSnapshot !== 'function' || typeof restoreRound !== 'function') {
    throw new Error('M169_ROUND_SNAPSHOT_BASE_MISSING');
  }

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const stable = value => {
    if (Array.isArray(value)) return value.map(stable);
    if (isObject(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
    return value;
  };
  const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
  const expectedSnapshots = Object.create(null);

  function firstDifference(a, b, path = '') {
    if (same(a, b)) return null;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return `${path}.length (${a.length} != ${b.length})`;
      for (let i = 0; i < a.length; i++) {
        const found = firstDifference(a[i], b[i], `${path}[${i}]`);
        if (found) return found;
      }
      return path;
    }
    if (isObject(a) && isObject(b)) {
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
      for (const key of keys) {
        if (!(key in a) || !(key in b)) return `${path}.${key} (${key in a ? 'extra in actual' : 'missing in actual'})`;
        const found = firstDifference(a[key], b[key], path ? `${path}.${key}` : key);
        if (found) return found;
      }
    }
    return path || '$';
  }

  function diff(before, after) {
    if (same(before, after)) return null;
    if (!isObject(before) || !isObject(after)) return { value: clone(after) };
    const set = {}, remove = [], nested = {};
    for (const key of Object.keys(before)) if (!(key in after)) remove.push(key);
    for (const [key, value] of Object.entries(after)) {
      if (!(key in before)) set[key] = clone(value);
      else {
        const change = diff(before[key], value);
        if (change) nested[key] = change;
      }
    }
    return { set, remove, nested };
  }

  function patch(before, change) {
    if (!change) return clone(before);
    if (Object.prototype.hasOwnProperty.call(change, 'value')) return clone(change.value);
    const out = isObject(before) ? clone(before) : {};
    for (const key of change.remove || []) delete out[key];
    Object.assign(out, clone(change.set || {}));
    for (const [key, nested] of Object.entries(change.nested || {})) out[key] = patch(out[key], nested);
    return out;
  }

  function materialize(state, round) {
    const snapshots = state?.snapshots || {};
    const target = Number(round);
    let anchor = target;
    while (anchor >= 1 && snapshots[String(anchor)]?.__m169Delta) anchor--;
    const first = snapshots[String(anchor)];
    if (!first) return null;
    let players = clone(first.players || {});
    for (let r = anchor + 1; r <= target; r++) {
      const snap = snapshots[String(r)];
      if (!snap) return null;
      if (snap.__m169Delta) {
        for (const name of snap.playerRemove || []) delete players[name];
        Object.assign(players, clone(snap.playerSet || {}));
        for (const [name, change] of Object.entries(snap.playerPatch || {})) players[name] = patch(players[name], change);
      } else players = clone(snap.players || {});
    }
    const stored = snapshots[String(target)];
    if (!stored) return null;
    if (!stored.__m169Delta) return clone(stored);
    return {
      players,
      trades: (state.trades || []).filter(row => Number(row.round) < target),
      results: (state.results || []).filter(row => Number(row.round) < target),
      settledRound: Number(stored.settledRound) || Math.min(Number(state.settledRound) || 0, target - 1),
      seq: Number(stored.seq) || 1,
      branchMarket: clone(stored.branchMarket || null),
      ...(stored.investments ? { investments: clone(stored.investments) } : {}),
      ...(stored.setup ? { setup: clone(stored.setup) } : {})
    };
  }

  const makeBase = makeRoundSnapshot;
  makeRoundSnapshot = function(state) {
    const round = Number(state?.round) || 1;
    const snapshot = makeBase(state);
    // Keep an in-memory full oracle for the Browser Swarm test only. It is
    // never attached to room state or sent to the backend.
    expectedSnapshots[String(round)] = clone(snapshot);
    if (round <= 1) return snapshot;
    const previous = materialize(state, round - 1);
    if (!previous?.players) return snapshot;
    const playerSet = {}, playerRemove = [], playerPatch = {};
    const before = previous.players || {}, after = snapshot.players || {};
    for (const name of Object.keys(before)) if (!(name in after)) playerRemove.push(name);
    for (const [name, player] of Object.entries(after)) {
      if (!(name in before)) playerSet[name] = clone(player);
      else {
        const change = diff(before[name], player);
        if (change) playerPatch[name] = change;
      }
    }
    return {
      __m169Delta: true,
      playerSet,
      playerRemove,
      playerPatch,
      settledRound: snapshot.settledRound,
      seq: snapshot.seq,
      branchMarket: clone(snapshot.branchMarket || null),
      ...(snapshot.investments ? { investments: clone(snapshot.investments) } : {}),
      ...(snapshot.setup ? { setup: clone(snapshot.setup) } : {})
    };
  };

  const restoreBase = restoreRound;
  restoreRound = function(round) {
    const state = load(), snap = state?.snapshots?.[String(Number(round))];
    if (!snap?.__m169Delta) return restoreBase(round);
    const full = materialize(state, Number(round));
    if (!full) throw new Error(`M169_SNAPSHOT_CHAIN_BROKEN_R${round}`);
    const max = Math.max(1, Math.min(10, Number(state.setup?.maxMarkets) || 5));
    const target = Number(round);
    if (!Number.isInteger(target) || target < 1 || target > max) return;
    state.round = target;
    state.phase = 'P1';
    state.players = clone(full.players);
    state.trades = clone(full.trades);
    state.results = clone(full.results);
    state.settledRound = full.settledRound;
    state.seq = full.seq;
    if (full.branchMarket) state.branchMarket = clone(full.branchMarket);
    if (full.investments) state.investments = clone(full.investments);
    if (full.setup) state.setup = clone(full.setup);
    state.gameOver = false;
    state.endedAtRound = null;
    state.gameEndedAt = null;
    state.c1FinalDebtSettled = false;
    pauseGameClock(state);
    state.timer = defaultTimer();
    for (const key of Object.keys(state.snapshots || {})) if (Number(key) > target) delete state.snapshots[key];
    logPush(state, `↩ Đã khôi phục về ĐẦU THỊ TRƯỜNG ${target}.`);
    save(state);
    render();
  };

  window.__M169_TEST__ = {
    materialize: (state, round) => materialize(clone(state), round),
    audit: (state, round) => {
      const expected = expectedSnapshots[String(Number(round))];
      const restored = materialize(clone(state), Number(round));
      if (!expected || !restored) return { ok: false, reason: 'oracle-or-snapshot-missing' };
      const fields = ['players', 'trades', 'results', 'settledRound', 'seq', 'branchMarket'];
      const mismatches = fields.filter(key => !same(restored[key] ?? null, expected[key] ?? null));
      const paths = mismatches.slice(0, 2).map(key => `${key}: ${firstDifference(restored[key] ?? null, expected[key] ?? null, key)}`);
      return { ok: mismatches.length === 0, mismatches, paths, fields: fields.length };
    }
  };
  window.M169_VERSION = 'M1.6.9-LOSSLESS-ROUND-SNAPSHOT-DELTA';
})();
