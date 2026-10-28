/* M171: isolated P2 intent queue. One in-flight request per player, never per room.
   Requires production M171 DB migration; rooms are explicitly enabled in P1. */
(() => {
  'use strict';
  const one=x=>Array.isArray(x)?x[0]:x, clone=x=>JSON.parse(JSON.stringify(x));
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  const rawToggle=toggleProjectSelectionV475, rawApply=applyRemoteState;
  let queue=null;
  // Membership is already committed by claimLockedRole. The legacy login handler
  // sent a whole-room snapshot just to set a UI joined flag, racing Host P1→P2.
  const loginBase=bindLogin;
  bindLogin=function(...args){
    const out=loginBase.apply(this,args);
    if(!load().m171P2?.enabled||accessIsAdmin())return out;
    document.querySelectorAll('[data-player-card]').forEach(card=>{
      const name=card.dataset.playerCard;
      card.onclick=async()=>{
        const claim=CLAIM_STATUS_CACHE[name]||{count:0,multi:false};
        if(claim.count>0&&!claim.multi)return;
        card.style.pointerEvents='none';
        try{
          const locked=await claimLockedRole('player',name),s=load();
          if(s.players?.[locked.name])s.players[locked.name].joined=true;
          localStorage.setItem(STATE_KEY,JSON.stringify(s));setSession(locked);
        }catch(error){alert(error.message||error);card.style.pointerEvents='';refreshClaimStatusV45()}
      };
    });return out;
  };
  const scope=s=>`${ROOM?.id}|${session?.name}|${s?.round}|${s?.m171P2?.generation}`;
  const active=(q,s=load())=>q&&q.scope===scope(s)&&s.phase==='P2'&&s.m171P2?.enabled;
  const metadata=p=>p?.m171P2Input||{};
  function install(q,targets,version){
    const s=load(); if(!active(q,s))return;
    const p=s.players?.[q.name];if(!p)return;
    setPlayerTargetsV475(p,targets,s);
    p.m171P2Input={version,generation:q.generation,requestId:q.requestId||null};
    localStorage.setItem(STATE_KEY,JSON.stringify(s));
    window.dispatchEvent(new Event('tt-state'));render();
  }
  function obtain(){
    const s=load();if(!s.m171P2?.enabled||s.phase!=='P2'||session?.role!=='player')throw new Error('P2_PHASE_CLOSED');
    if(!queue||queue.scope!==scope(s)){
      if(queue)queue.invalidated=true;
      const p=s.players?.[session.name];
      queue={scope:scope(s),room:ROOM.id,name:session.name,round:s.round,generation:s.m171P2.generation,
        version:metadata(p).generation===s.m171P2.generation?Number(metadata(p).version)||0:0,
        accepted:[...(p?.targets||[])],desired:[...(p?.targets||[])],flight:null,pending:false,error:null,invalidated:false};
    }
    return queue;
  }
  async function rpc(name,args){
    let timer;
    try{return await Promise.race([SB.rpc(name,args),new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('P2_RPC_ACK_UNKNOWN')),8000);
    })]);}finally{clearTimeout(timer)}
  }
  async function pump(q){
    if(q.flight)return q.flight;
    q.flight=(async()=>{
      while(q.pending&&!q.invalidated){
        if(!active(q))throw new Error('P2_SCOPE_INVALIDATED');
        const desired=[...q.desired],requestId=crypto.randomUUID(),before=q.version;
        q.pending=false;q.requestId=requestId;
        const args={p_room_id:q.room,p_round:q.round,p_generation:q.generation,
          p_expected_version:before,p_request_id:requestId,p_targets:desired,p_member_token:currentMemberToken()};
        const started=performance.now();let row;
        for(let attempt=1;attempt<=5;attempt++){
          if(!active(q)||q.invalidated)throw new Error('P2_SCOPE_INVALIDATED');
          const {data,error}=await rpc('m171_set_p2_targets',args);
          console.info('[P2_OPERATION]',JSON.stringify({room_id:q.room,browser_id:q.name,market:q.round,phase:'P2',generation:q.generation,
            request_id:requestId,revision_before:Number(ROOM?.revision)||0,revision_after:one(data)?.revision??null,
            version_before:before,version_after:one(data)?.version??null,attempt,latency:performance.now()-started,
            result:error?error.message:'committed',code:error?.code||''}));
          if(!error){row=one(data);break}
          if(error.message==='P2_VERSION_CONFLICT'){
            // Another device committed. Read fresh authoritative input, invalidate this
            // intent rather than replaying its stale target snapshot over that device.
            await window.__M167_FETCH_NOW__();throw new Error('P2_VERSION_CONFLICT');
          }
          if(!/55P03|Failed to fetch|network/i.test(`${error.code} ${error.message}`)||attempt===5)throw error;
          await pause(Math.min(80*2**(attempt-1),640)+Math.floor(Math.random()*61));
        }
        if(!row?.ok)throw new Error('P2_ACK_MISSING');
        q.version=Number(row.version);q.accepted=[...row.targets];
        if(!active(q)||q.invalidated){q.invalidated=true;q.pending=false;break}
        install(q,q.pending?q.desired:q.accepted,q.version);
      }
    })().catch(async error=>{
      q.error=String(error?.message||error);q.pending=false;
      if(active(q)){
        install(q,q.accepted,q.version);setRoomStatus('error');
        if(typeof c1Toast==='function')c1Toast('Lựa chọn chưa được xác nhận. Đang đọc lại dữ liệu máy chủ.','sell');
        q.refreshing=true;try{await window.__M167_FETCH_NOW__()}catch{}
      }
      throw error;
    }).finally(()=>{q.flight=null});
    return q.flight;
  }
  toggleProjectSelectionV475=function(name,pid){
    const s=load();if(!s.m171P2?.enabled||s.phase!=='P2')return rawToggle(name,pid);
    if(name!==session?.name||session?.role!=='player'||s.players?.[name]?.bankrupt||!projectById(s,pid))return;
    const q=obtain();if(q.error&&!q.flight){queue=null;return toggleProjectSelectionV475(name,pid)}
    const ids=[...q.desired],at=ids.indexOf(pid);
    if(at>=0)ids.splice(at,1);else{
      if(ids.length>=projectChoiceLimitV475(s)){alert(`Bạn được nhắm tối đa ${projectChoiceLimitV475(s)} dự án.`);return}
      ids.push(pid);
    }
    q.desired=ids;q.pending=true;install(q,ids,q.version);
    pump(q).catch(()=>{}); // UI reports error; harness reads explicit error, never false success.
  };
  applyRemoteState=function(st,revision){
    const q=queue;
    if(q&&active(q,st)){
      const p=st.players?.[q.name],m=metadata(p);
      if(p&&!q.refreshing&&(q.flight||q.pending||Number(m.version||0)<q.version)){
        st=clone(st);setPlayerTargetsV475(st.players[q.name],q.pending||q.flight?q.desired:q.accepted,st);
        st.players[q.name].m171P2Input={version:q.version,generation:q.generation,requestId:q.requestId||null};
      }else if(p&&!q.flight){q.version=Number(m.version)||0;q.accepted=[...(p.targets||[])];q.desired=[...q.accepted]}
    }else if(q&&Number(revision)>=Number(ROOM?.revision||0)){
      q.invalidated=true;q.pending=false;
    }
    return rawApply(st,revision);
  };
  window.M171={
    async enable(){
      const {data,error}=await SB.rpc('m171_enable_p2_admin',{p_room_id:ROOM.id,p_admin_token:ADMIN_TOKEN});
      if(error)throw error;const row=one(data);await m154AcceptServerRow(row,'m171_p2_enabled');return row;
    },
    status(){return queue?{scope:queue.scope,pending:Number(!!queue.flight)+Number(queue.pending),error:queue.error,
      invalidated:queue.invalidated,version:queue.version,generation:queue.generation,targets:[...queue.accepted]}:{pending:0,error:null}},
    async drain(){const q=queue;if(q?.flight)await q.flight;if(q?.error)throw new Error(q.error);return !q?.pending},
  };
  const createBase=createOnlineRoom;
  createOnlineRoom=async function(...args){
    const room=await createBase.apply(this,args);
    const enabled=await window.M171.enable();
    return {...room,revision:enabled.revision,state:enabled.state};
  };
  window.M171_VERSION='M1.7.1-P2-ISOLATED-STAGING';
})();
