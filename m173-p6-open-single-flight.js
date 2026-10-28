/* Production P6 initialization: one request per room/market/generation scope.
   Merge only auction metadata into the latest local state after the RPC. */
(() => {
  'use strict';
  window.M173_VERSION='M173-P6-REVISION-FENCED-RESET';
  const resetFlights=new Map();
  // A reset must be built from the room revision after any already-started Host
  // save commits. The server revision fence remains the final authority.
  window.M173_RESET_LOCAL_GATE=false;
  window.m173WithFreshReset=async function(mode,buildState) {
    if(window.M173_RESET_LOCAL_GATE)throw new Error('RESET_ALREADY_IN_PROGRESS');
    window.M173_RESET_LOCAL_GATE=true;
    try {
      const deadline=Date.now()+12000;
      while(ROOM_PUSHING||ROOM_QUEUED_STATE){
        if(Date.now()>deadline)throw new Error('HOST_ROOM_WRITE_NOT_DRAINED');
        if(!ROOM_PUSHING&&ROOM_QUEUED_STATE){clearTimeout(ROOM_PUSH_TIMER);await pushRoomState()}
        else await new Promise(resolve=>setTimeout(resolve,25));
      }
      if(ROOM_STATUS==='error')throw new Error('HOST_ROOM_WRITE_FAILED');
      const row=await fetchRoomLatest();
      if(ROOM_PUSHING||ROOM_QUEUED_STATE)throw new Error('HOST_ROOM_WRITE_RACED_RESET');
      const source=deep(row.state),revision=Number(row.revision);
      if(source.phase!==mode)throw new Error('RESET_WRONG_PHASE');
      const state=buildState(source);
      return await window.m173ResetAuction(mode,state,m154P6Generation(source),revision);
    } finally {window.M173_RESET_LOCAL_GATE=false}
  };
  const timerTickBeforeResetGate=timerTick;
  timerTick=function(){if(window.M173_RESET_LOCAL_GATE||window.M161_PHASE_WRITE_GATE)return;return timerTickBeforeResetGate()};
  window.m173ResetAuction=function(mode,state,expectedGeneration=m154P6Generation(state),expectedRevision=Number(ROOM.revision)) {
    const room=ROOM.id,round=state.round,key=`${room}:${round}:${mode}:${expectedGeneration}`;
    if(resetFlights.has(key))return resetFlights.get(key);
    const requestId=crypto.randomUUID();
    const work=SB.rpc('m173_reset_project_auctions_admin',{
      p_admin_token:ADMIN_TOKEN,p_room_id:room,p_round:round,p_mode:mode,
      p_generation:expectedGeneration,p_request_id:requestId,p_reset_state:{expectedRevision,state}});
    resetFlights.set(key,work);
    work.finally(()=>{if(resetFlights.get(key)===work)resetFlights.delete(key)}).catch(()=>{});
    return work;
  };
  m12ResetProjectAuctionsOnServer=async function(ph,state) {
    const {data,error}=await window.m173ResetAuction(ph,state);
    if(error)throw error;
    const result=Array.isArray(data)?data[0]:data;
    if(result?.state&&Number.isFinite(Number(result.revision))) {
      await m154AcceptServerRow({state:result.state,revision:result.revision,status:'active'},'m173_reset_'+ph);
    }
    return result;
  };
  const flights = new Map();
  const scope = () => `${ROOM?.id}:${load()?.round}:${m154P6Generation(load())}`;
  ensureProcurementOpenV480 = function() {
    const s=load();
    if(s.phase!=='P6'||!ROOM?.id||!SB||!ADMIN_TOKEN) return Promise.resolve();
    const key=scope();
    if(flights.has(key)) return flights.get(key);
    const work=(async()=>{
      let changed=false;
      for(const pr of projects(s)) {
        const current=load();
        if(scope()!==key||current.phase!=='P6') return;
        const parts=eligibleProjectContenders(current,pr.id);
        if(parts.length<2||auctionState(current,pr.id)) continue;
        let data,error;
        for(let attempt=0;attempt<3;attempt++) {
         if(scope()!==key||load().phase!=='P6') return;
         ({data,error}=await SB.rpc('m173_open_project_auction_admin',{
          p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_round:current.round,
          p_project_id:pr.id,p_participants:parts,p_generation:m154P6Generation(current)}));
         if(!error||error.code!=='55P03'||!/HOST_PRIORITY_BUSY/.test(error.message||'')||attempt===2)break;
         await new Promise(resolve=>setTimeout(resolve,120*(attempt+1)+Math.floor(Math.random()*100)));
        }
        if(error) throw error;
        const fresh=load();
        if(scope()!==key||fresh.phase!=='P6') return;
        const row=Array.isArray(data)?data[0]:data;
        ensureAuctionStateRoot(fresh)[pr.id]={participants:row?.participants||parts,
          status:row?.status||'open',bidRound:Number(row?.bid_round)||1};
        // M174: auction rows are already authoritative in PostgreSQL. This is
        // local UI metadata, just like c17EnsurePlayerAuction. Publishing a
        // whole-room CAS here races settlement and is repeated after refetch.
        localStorage.setItem(STATE_KEY,JSON.stringify(fresh)); changed=true;
      }
      if(changed && scope()===key) {
        render();
      }
    })();
    flights.set(key,work);
    work.finally(()=>{if(flights.get(key)===work)flights.delete(key)}).catch(()=>{});
    return work;
  };
})();
