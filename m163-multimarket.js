/* THUONG TRUONG M1.6.3 — MULTI-MARKET AUTHORITY
   Load AFTER index game code + c1.js.
   Surgical scope: P7 -> next market only.
*/
(() => {
  'use strict';
  const M163_VERSION = 'M1.6.3-MULTI-MARKET';
  let M163_NEXT_BUSY = false;
  const clone = x => JSON.parse(JSON.stringify(x));

  // A Host transition may briefly hold the input gate. Retry only this
  // classified transient response; business-rule and stale-phase failures
  // must remain visible to the caller immediately.
  const hostBusy = error => {
    const raw=[error?.code,error?.message,error?.details,error?.hint,error].filter(Boolean).join(' ');
    return /55P03|HOST_PRIORITY_BUSY|(?:^|\b)BUSY(?:\b|$)/i.test(raw);
  };
  const retryWaits=[80,160,320,640,1000];
  async function playerWriteRpc(name,args){
    const started=Date.now();
    for(let attempt=1;attempt<=retryWaits.length+1;attempt++){
      let out;
      try{out=await SB.rpc(name,args)}catch(error){out={data:null,error}}
      if(!out?.error){
        if(attempt>1)console.info('[SWARM_RETRY]',JSON.stringify({rpc:name,attempt,result:'success',elapsedMs:Date.now()-started}));
        return out;
      }
      if(!hostBusy(out.error)||attempt>retryWaits.length){
        console.info('[SWARM_RETRY]',JSON.stringify({rpc:name,attempt,result:'terminal',code:out.error?.code||'',message:out.error?.message||String(out.error),elapsedMs:Date.now()-started}));
        return out;
      }
      const wait=retryWaits[attempt-1]+Math.floor(Math.random()*26);
      console.info('[SWARM_RETRY]',JSON.stringify({rpc:name,attempt,result:'busy',code:out.error?.code||'',message:out.error?.message||String(out.error),waitMs:wait,elapsedMs:Date.now()-started}));
      await new Promise(resolve=>setTimeout(resolve,wait));
    }
    return {data:null,error:new Error('HOST_PRIORITY_BUSY_RETRY_EXHAUSTED')};
  }
  // The real P5/P6 client action functions call this shared helper. The swarm
  // hooks use the same path, so the test cannot mask production behavior.
  if(typeof window.m160PhaseRpc==='function')window.m160PhaseRpc=playerWriteRpc;

  async function endHostGate(reason){
    let last=null;
    for(let attempt=1;attempt<=3;attempt++){
      try{
        const {error}=await SB.rpc('m161_end_host_transition_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id});
        if(!error){console.info('[HOST_GATE_RELEASE]',JSON.stringify({reason,attempt,result:'released'}));return true}
        last=error;
      }catch(error){last=error}
      console.warn('[HOST_GATE_RELEASE]',JSON.stringify({reason,attempt,result:'retry',code:last?.code||'',message:last?.message||String(last)}));
      if(attempt<3)await new Promise(resolve=>setTimeout(resolve,100*attempt));
    }
    console.error('[HOST_GATE_RELEASE]',JSON.stringify({reason,result:'failed',code:last?.code||'',message:last?.message||String(last)}));
    return false;
  }

  function maxMarkets(s){
    const max = Number(s?.setup?.maxMarkets || 5);
    return Math.max(1, Math.min(10, Number.isFinite(max) ? max : 5));
  }

  function buildNextStateFromServer(serverState){
    const s = clone(serverState);
    const max = maxMarkets(s);
    if(s.phase !== 'P7') throw new Error(`NEXT_MARKET_REQUIRES_P7:${s.phase}`);
    if(Number(s.round) >= max) return {finish:true,state:s,max};

    const prev = Number(s.round)||1;
    const mode = s.flowMode;
    const durations = clone(s.phaseDurations || {});

    if(typeof applyPhaseInterestV475 === 'function') applyPhaseInterestV475(s,'P7','P1');
    s.round = prev + 1;
    s.phase = 'P1';
    s.gameOver = false;
    s.c1FinalDebtSettled = false;

    for(const p of Object.values(s.players || {})){
      p.targets=[];
      p.p2Targets=[];
      p.p2TargetsRound=null;
      p.projectDecisions={};
      p.projectPromoChoices=p.projectPromoChoices || {};
      p.target=null;
      p.locked=false;
      p.declinedProject=false;
      p.bid=null;
      p.projectBids={};
      for(const [k,v] of Object.entries(p.refill || {})) p.res[k]=(Number(p.res?.[k])||0)+Number(v||0);
      if(typeof normalizeBankLoanV475 === 'function'){
        const loan=normalizeBankLoanV475(p,s);
        if(loan && typeof activeElapsedMsNow === 'function' && typeof BANK_MINUTE_MS_V475 !== 'undefined'){
          loan.lastMinuteIndex=Math.floor(activeElapsedMsNow(s)/BANK_MINUTE_MS_V475);
        }
      }
    }

    if(typeof expireOpenTrades === 'function') expireOpenTrades(s,prev);

    // Expire pending investment offers from the completed market and release escrow once.
    const expiredRoots = new Set();
    for(const t of (s.investments?.trades || [])){
      if(Number(t.round)===prev && t.status==='pending'){
        t.status='expired';
        expiredRoots.add(Number(t.rootId)||Number(t.id));
      }
    }
    if(typeof c1ReleaseEscrow === 'function'){
      for(const id of expiredRoots){
        const root=(s.investments?.trades || []).find(t=>Number(t.id)===id);
        if(root) c1ReleaseEscrow(s,root);
      }
    }

    if(!s.markets) s.markets={};
    if(typeof buildCurrentRoundProjects !== 'function') throw new Error('NEXT_MARKET_PROJECT_BUILDER_MISSING');
    s.markets[String(s.round)] = buildCurrentRoundProjects(s.players,s.round);

    s.flowMode=mode;
    s.phaseDurations=durations;
    if(typeof defaultTimer === 'function') s.timer=defaultTimer();
    else s.timer={duration:300,remaining:300,endAt:null,running:false,expired:false,autoPassed:{}};
    if(typeof setPhaseTimerV480 === 'function') setPhaseTimerV480(s,'P1',mode==='auto');
    if(mode==='auto' && typeof ensureRealtimeRunningV481 === 'function') ensureRealtimeRunningV481(s);
    if(typeof c1RefreshPropertyMarket === 'function') c1RefreshPropertyMarket(s);

    s.p5Auctions=s.p5Auctions || {};
    s.p5Auctions[String(s.round)]={};
    s.p6AuctionGenerations=s.p6AuctionGenerations || {};
    if(!(String(s.round) in s.p6AuctionGenerations)) s.p6AuctionGenerations[String(s.round)]=0;

    s.snapshots=s.snapshots || {};
    if(typeof makeRoundSnapshot === 'function') s.snapshots[String(s.round)]=makeRoundSnapshot(s);
    if(typeof logPush === 'function'){
      const lim=typeof projectChoiceLimitV475==='function'?projectChoiceLimitV475(s):'';
      logPush(s,`✅ Host mở Thị trường ${s.round}/${max}.${lim!==''?` Mỗi người được nhắm tối đa ${lim} dự án.`:''}`);
    }
    return {finish:false,state:s,max};
  }

  function adoptServerState(row){
    const state=row?.state;
    if(!state) throw new Error('NEXT_MARKET_SERVER_STATE_MISSING');
    // Advance the shared revision fence before exposing a committed next market.
    // Otherwise a pre-transition fetch can restore P7 after the P1 commit.
    if(typeof M154_HIGHEST_REVISION!=='undefined'){
      M154_HIGHEST_REVISION=Math.max(typeof m154RevisionFloor==='function'?m154RevisionFloor():0,Number(row.revision)||0);
    }
    if(typeof ROOM_BASE_STATE_V47!=='undefined')ROOM_BASE_STATE_V47=JSON.parse(JSON.stringify(state));
    if(typeof ROOM !== 'undefined' && ROOM){
      ROOM.revision=Number(row.revision)||Number(ROOM.revision)||0;
      if(typeof storeRoom==='function') storeRoom(ROOM);
    }
    localStorage.setItem(STATE_KEY,JSON.stringify(state));
    window.dispatchEvent(new Event('tt-state'));
    if(typeof setRoomStatus==='function') setRoomStatus('online');
    if(typeof render==='function') render();
    return state;
  }

  async function fetchAuthoritativeRoom(){
    const {data,error}=await SB.rpc('fetch_game_room_state_secure',{
      p_room_id:ROOM.id,
      p_member_token:null,
      p_admin_token:ADMIN_TOKEN
    });
    if(error) throw error;
    return Array.isArray(data)?data[0]:data;
  }

  async function m163NextRound(){
    if(M163_NEXT_BUSY) return;
    const local=load();
    if(local.phase!=='P7') return;
    const max=maxMarkets(local);
    if(Number(local.round)>=max){
      if(typeof finishGame==='function') finishGame();
      return;
    }

    // Offline/local mode keeps the legacy implementation.
    if(typeof ROOM==='undefined' || !ROOM?.id || typeof SB==='undefined' || !SB || typeof ADMIN_TOKEN==='undefined' || !ADMIN_TOKEN){
      return M163_LEGACY_NEXT?.();
    }

    M163_NEXT_BUSY=true;
    const btn=document.getElementById('nextRoundBtn');
    if(btn){btn.disabled=true;btn.dataset.oldText=btn.textContent;btn.textContent='ĐANG MỞ THỊ TRƯỜNG...'}

    try{
      const {error:beginError}=await SB.rpc('m161_begin_host_transition_admin',{
        p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_target_phase:'P1'
      });
      if(beginError) throw beginError;

      let committed=null;
      for(let attempt=1;attempt<=3;attempt++){
        const cur=await fetchAuthoritativeRoom();
        if(!cur?.state) throw new Error('NEXT_MARKET_FETCH_FAILED');

        // Network retry after an already committed transition.
        if(cur.state.phase==='P1' && Number(cur.state.round)===Number(local.round)+1){
          committed={ok:true,revision:cur.revision,state:cur.state,message:'IDEMPOTENT'};
          break;
        }

        const built=buildNextStateFromServer(cur.state);
        if(built.finish){ if(typeof finishGame==='function') finishGame(); return; }

        const {data,error}=await SB.rpc('m163_next_market_admin',{
          p_admin_token:ADMIN_TOKEN,
          p_room_id:ROOM.id,
          p_expected_revision:Number(cur.revision)||0,
          p_from_round:Number(cur.state.round)||1,
          p_next_state:built.state
        });
        if(error) throw error;
        const row=Array.isArray(data)?data[0]:data;
        if(row?.ok){committed=row;break;}
        if(row?.message!=='STALE_RETRY') throw new Error(row?.message||'NEXT_MARKET_REJECTED');
      }
      if(!committed?.ok) throw new Error('NEXT_MARKET_RETRY_EXHAUSTED');

      const state=adoptServerState(committed);
      if(typeof broadcastRoomSignal==='function'){
        try{await broadcastRoomSignal('state_changed',{reason:'m163_next_market',round:state.round,version:M163_VERSION})}catch(_){ }
      }
    }catch(err){
      console.error('[M1.6.3 next market]',err);
      if(typeof setRoomStatus==='function') setRoomStatus('error');
      try{ if(typeof fetchRoomLatest==='function') await fetchRoomLatest(); }catch(_){ }
      if(typeof render==='function') render();
      if(typeof uiAlertV46==='function') uiAlertV46({title:'Không mở được thị trường kế tiếp',message:String(err?.message||err),tone:'bad'});
      else alert('Không mở được thị trường kế tiếp: '+String(err?.message||err));
    }finally{
      await endHostGate('next_market');
      M163_NEXT_BUSY=false;
      const b=document.getElementById('nextRoundBtn');
      if(b){b.disabled=false;if(b.dataset.oldText)b.textContent=b.dataset.oldText}
    }
  }

  const M163_LEGACY_NEXT = (typeof nextRound==='function') ? nextRound : null;
  nextRound = m163NextRound;

  // P5/P6 transition cleanup belongs to m161HostPhaseTransition, which knows
  // whether begin succeeded. A second unconditional release could clear a gate
  // this invocation never acquired. Next-market cleanup above remains separate.

  // Capture phase guarantees an older already-bound click handler cannot bypass M1.6.3.
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('#nextRoundBtn');
    if(!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    m163NextRound();
  },true);

  window.M163_VERSION=M163_VERSION;
})();
