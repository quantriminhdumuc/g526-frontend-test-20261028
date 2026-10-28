/* Auction table metadata is a local projection. A room snapshot may predate a
   tie/rebid without changing room revision. Never rewind that projection within
   a generation, and never carry it over a phase/market/reset boundary. */
(() => {
  'use strict';
  const sameScope=(a,b)=>a?.phase==='P6'&&b?.phase==='P6'&&
    Number(a.round)===Number(b.round)&&m154P6Generation(a)===m154P6Generation(b)&&
    a?._g526?.epoch===b?._g526?.epoch;
  function mergeMetadata(incoming,current) {
    if(!sameScope(incoming,current))return incoming;
    const round=String(incoming.round),local=current.p5Auctions?.[round]||{},remote=incoming.p5Auctions?.[round]||{};
    let merged=null;
    for(const [pid,a] of Object.entries(local)) {
      const b=remote[pid];
      if(!b||Number(a.bidRound)>Number(b.bidRound)) {
        merged=merged||{...remote};merged[pid]=a;
      }
    }
    return merged?{...incoming,p5Auctions:{...(incoming.p5Auctions||{}),[round]:merged}}:incoming;
  }
  const baseApply=applyRemoteState;
  applyRemoteState=function(state,revision){return baseApply.call(this,mergeMetadata(state,load()),revision)};
  // The old done key survives a reset. Scope it to generation so an empty
  // projection can be initialized again after the authoritative reset.
  c17ProcurementKey=function(s,pid){return `${ROOM?.id||ROOM?.code||'offline'}:R${s.round}:G${m154P6Generation(s)}:E${s._g526?.epoch||0}:${pid}`};
  window.M174_VERSION='M174-P6-LOCAL-METADATA';
  window.__M174_MERGE_METADATA__=mergeMetadata;
})();

/* G5.26 enrolled rooms use server control; legacy NORMAL remains separate. */
(() => {
  const legacyRemaining = remainingTime, legacyReset = c11ResetPhase, legacyExtend = extendTimer;
  let controlPending = null;
  remainingTime = function(s) {
    if (!s?._g526) return legacyRemaining(s);
    if (s._g526.phase === 'P7' || s._g526.deadline === null) return 0;
    return Math.max(0, Math.ceil((Date.parse(s._g526.deadline) - Date.now()) / 1000));
  };
  async function control(action, extra={}) {
    if (controlPending) throw new Error('G526_CONTROL_IN_PROGRESS');
    const s=load();
    if (!accessIsAdmin() || !s._g526 || !ROOM?.id) throw new Error('G526_ADMIN_CONTROL_REQUIRED');
    const args={p_admin_token:ADMIN_TOKEN,p_room:ROOM.id,p_action:action,p_request:crypto.randomUUID(),p_expected_revision:ROOM.revision,p_epoch:s._g526.epoch,...extra};
    controlPending=(async()=>{
      const {data,error}=await SB.rpc('g526_phase_control',args);
      if(error)throw error;
      await fetchRoomLatest();
      if(Number(load()?._g526?.epoch)!==Number(data.epoch)||Number(ROOM.revision)<Number(data.revision)||load()?._g526?.deadline!==data.deadline)throw new Error('G526_CONTROL_READBACK_REQUIRED');
      if(action==='reset'){m154ClearLocalP6BidFlags(load());C17_AUCTION_ENSURE_DONE.clear();}
      render();return data;
    })();
    try{return await controlPending;}finally{controlPending=null;}
  }
  c11ResetPhase=async function(ph){
    const s=load();if(!s._g526)return legacyReset(ph);
    if(ph!==s.phase||ph==='P7')throw new Error('CURRENT_PHASE_ONLY');
    return control('reset',{p_target:ph});
  };
  extendTimer=function(seconds){return load()?._g526?control('extend',{p_seconds:Number(seconds)}):legacyExtend(seconds);};
  const oldAuctionKey=localAuctionSubmittedKey;
  localAuctionSubmittedKey=function(name,s,pid,bidRound){return oldAuctionKey(name,s,pid,bidRound)+`:E${s._g526?.epoch||0}`;};
  const oldHostView=hostView;
  hostView=function(){const html=oldHostView(),s=load();if(!s._g526)return html;
    const box=document.createElement('div');box.innerHTML=html;
    box.querySelectorAll('#resetCurrentMarket,#restorePrevRound,#resetWholeGame,#resetFinalMarket,.c11-phase-resets').forEach(e=>e.remove());
    if(s.phase!=='P7'&&!s.gameOver)box.querySelector('.rewind')?.insertAdjacentHTML('beforeend',`<button class="btn secondary c11-phase-reset" data-phase="${s.phase}">RESET ${s.phase}</button>`);
    return box.innerHTML;
  };
})();
