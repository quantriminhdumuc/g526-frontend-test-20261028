/* M1.6.4 candidate — preserve only the current player's P2 target deltas.
   Load after production scripts and before Browser Swarm hooks. */
(() => {
  'use strict';
  const baseRebase = window.rebasePlayerStateV47;
  if (typeof baseRebase !== 'function') throw new Error('M164_TARGET_REBASE_BASE_MISSING');

  window.rebasePlayerStateV47 = function(base, local, latest) {
    const out = baseRebase(base, local, latest);
    const name = typeof session !== 'undefined' ? session?.name : null;
    if (!name || session?.role !== 'player') return out;
    if (Number(local?.round) !== Number(latest?.round) || local?.phase !== latest?.phase) return out;

    const before = base?.players?.[name], changed = local?.players?.[name], merged = out?.players?.[name];
    if (!before || !changed || !merged) return out;
    for (const key of ['targets', 'p2Targets', 'p2TargetsRound']) {
      if (JSON.stringify(changed[key]) !== JSON.stringify(before[key])) merged[key] = JSON.parse(JSON.stringify(changed[key]));
    }
    return out;
  };
  window.M164_VERSION = 'M1.6.4-P2-TARGET-REBASE';
})();
