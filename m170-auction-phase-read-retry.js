/* M1.7.0 candidate — re-read the committed phase before retrying an auction
   ensure request that raced a P5→P6 read-replica update. */
(() => {
  'use strict';
  if (typeof c17EnsurePlayerAuction !== 'function' || typeof m153FetchRoomCoalesced !== 'function') {
    throw new Error('M170_AUCTION_RETRY_BASE_MISSING');
  }
  const baseEnsure = c17EnsurePlayerAuction;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  c17EnsurePlayerAuction = async function(name, projectId) {
    let lastError;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await baseEnsure(name, projectId);
      } catch (error) {
        lastError = error;
        const message = String(error?.message || error);
        if (!/PROJECT_AUCTION_WRONG_PHASE/i.test(message) || attempt === 3) throw error;
        await m153FetchRoomCoalesced().catch(() => {});
        if (load()?.phase !== 'P6') await sleep(180 + attempt * 240);
      }
    }
    throw lastError || new Error('M170_AUCTION_RETRY_EXHAUSTED');
  };
  window.M170_VERSION = 'M1.7.0-AUCTION-PHASE-READ-RETRY';
})();
