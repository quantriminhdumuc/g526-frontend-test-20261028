/* =========================================================
   V4.8.1 — FLOW SAFETY + P3 INTERACTION/CONCURRENCY PATCH
   Additive patch over V4.8.0. No rule rewrite outside the
   flow/P3 safety boundaries described below.
   ========================================================= */
const V481_VERSION='V4.8.1';
const V481_PHASE_ORDER=['P1','P2','P3','P4','P5','P6','P7'];
let V481_FLOW_SWITCH_BUSY=false;
let V481_PHASE_SWITCH_BUSY=false;
let V481_AUCTION_START_BUSY=false;
let V481_AUCTION_FINISH_BUSY=false;
let V481_PS_QUEUE_BUSY_UNTIL=0;
const V481_PLAYER_BID_BUSY=new Set();

(function installV481Styles(){
  const st=document.createElement('style');
  st.id='v481-safety-style';
  st.textContent=`
    .phaseBtn.v481-locked,.phaseBtn:disabled{opacity:.48!important;cursor:not-allowed!important;filter:grayscale(.18)}
    .phaseBtn.v481-locked:hover,.phaseBtn:disabled:hover{transform:none!important;box-shadow:none!important}
    .v481-auto-lock-note{margin-top:8px;padding:8px 10px;border-radius:10px;background:#ecfdf5;border:1px solid #86efac;color:#166534;font-size:11px;font-weight:850;line-height:1.4}
    #psPrepPanel .v481-queue-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:11px 0 7px;font-weight:950}
    #psPrepPanel .v481-queue-status{min-height:18px;margin:5px 0;font-size:11px;font-weight:850;color:#047857}
    #psPrepPanel .v481-queue-status.warn{color:#b45309}
    #psPrepPanel .v481-queue-status.bad{color:#b91c1c}
    #psPrepPanel .v481-busy{pointer-events:none;opacity:.62}
    #psPrepPanel .removePsLotV45,#psPrepPanel .addSmartLotV480,#psPrepPanel #addPsLotV45,#psPrepPanel #startPsAuctionV45{touch-action:manipulation}
    .flow-card-v480.v481-auto-active .flow-status-v480{box-shadow:0 0 0 2px rgba(16,185,129,.12)}
    .v481-structural-locked{opacity:.55!important;cursor:not-allowed!important;pointer-events:none!important}
  `;
  document.head.appendChild(st)
})();

function phaseIndexV481(p){return V481_PHASE_ORDER.indexOf(p)}
function ensureFlowV481(s){
  if(!s||typeof s!=='object')return s;
  if(typeof ensureFlowV480==='function')ensureFlowV480(s);
  s.flowV481=s.flowV481&&typeof s.flowV481==='object'?s.flowV481:{};
  if(Number(s.flowV481.round)!==Number(s.round)){
    s.flowV481.round=Number(s.round)||1;
    s.flowV481.maxPhaseIndex=Math.max(0,phaseIndexV481(s.phase));
    s.flowV481.interestTransitions={};
  }
  if(!Number.isFinite(Number(s.flowV481.maxPhaseIndex)))s.flowV481.maxPhaseIndex=Math.max(0,phaseIndexV481(s.phase));
  if(!s.flowV481.interestTransitions||typeof s.flowV481.interestTransitions!=='object')s.flowV481.interestTransitions={};
  return s
}

const _loadV481Base=load;
load=function(){return ensureFlowV481(_loadV481Base())};

const _initialStateV481Base=initialState;
initialState=function(setup=loadSetup()){
  const s=ensureFlowV481(_initialStateV481Base(setup));
  s.flowV481.round=Number(s.round)||1;
  s.flowV481.maxPhaseIndex=Math.max(0,phaseIndexV481(s.phase));
  s.flowV481.interestTransitions={};
  return s
};

/* ---------------------------------------------------------
   CONTROL phase navigation must not charge phase-interest
   repeatedly just because Host revisits an earlier screen.
   A forward progression charges at most once; backwards is
   navigation only. P7 -> next-market P1 remains a valid edge.
   --------------------------------------------------------- */
const _applyPhaseInterestV481Base=applyPhaseInterestV475;
applyPhaseInterestV475=function(s,fromPhase,toPhase){
  ensureFlowV481(s);
  if(!fromPhase||!toPhase||fromPhase===toPhase)return false;
  const crossRound=fromPhase==='P7'&&toPhase==='P1';
  const fi=phaseIndexV481(fromPhase),ti=phaseIndexV481(toPhase);
  if(!crossRound&&(fi<0||ti<0||ti<=fi))return false;
  const key=`${Number(s.round)||1}:${fromPhase}>${toPhase}`;
  if(s.flowV481.interestTransitions[key])return false;
  if(!crossRound&&ti<=Number(s.flowV481.maxPhaseIndex||0))return false;
  s.flowV481.interestTransitions[key]=true;
  if(!crossRound)s.flowV481.maxPhaseIndex=Math.max(Number(s.flowV481.maxPhaseIndex)||0,ti);
  return _applyPhaseInterestV481Base(s,fromPhase,toPhase)
};

function ensureRealtimeRunningV481(s){
  if(!s||s.gameOver||s.gameControl?.paused)return false;
  s.realtimeClock=s.realtimeClock||{running:false,elapsedMs:0,startedAt:null};
  if(s.realtimeClock.running)return false;
  s.realtimeClock.running=true;
  s.realtimeClock.startedAt=Date.now();
  logPush(s,'⏱ AUTO kích hoạt đồng hồ REALTIME.');
  return true
}

function resumePhaseCountdownV481(s){
  if(!s||s.phase==='P7')return false;
  const rem=Math.max(0,remainingTime(s));
  if(s.timer?.running&&rem>0)return false;
  if(rem>0){
    s.timer.running=true;
    s.timer.remaining=rem;
    s.timer.endAt=Date.now()+rem*1000;
    s.timer.expired=false;
  }else{
    setPhaseTimerV480(s,s.phase,true);
  }
  return true
}

async function waitRoomSyncV481(timeout=2200){
  const end=Date.now()+timeout;
  while(Date.now()<end){
    if(!ROOM_PUSHING&&!ROOM_QUEUED_STATE)return true;
    await new Promise(r=>setTimeout(r,35));
  }
  return !ROOM_PUSHING&&!ROOM_QUEUED_STATE
}

/* ---------------------------------------------------------
   Host-vs-player CAS: V4.7 already rebased player writes, but
   Host writes were discarded on a revision race. Rebase Host
   structural deltas over the latest server state and retry.
   specialAuction stays server-authoritative.
   --------------------------------------------------------- */
function notifyStalePhaseActionV481(fromPhase,toPhase){
  const old=document.getElementById('v481-phase-conflict-toast');if(old)old.remove();
  const el=document.createElement('div');el.id='v481-phase-conflict-toast';
  el.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;max-width:min(92vw,520px);padding:11px 14px;border-radius:12px;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;font-weight:850;font-size:12px;box-shadow:0 12px 30px rgba(15,23,42,.2)';
  el.textContent=`Host vừa chuyển ${fromPhase||'P'} → ${toPhase||'P mới'}. Thao tác cũ cùng thời điểm không được ghi để tránh giao dịch/chốt bị chồng trạng thái.`;
  document.body.appendChild(el);setTimeout(()=>el.remove(),4200)
}
function rebaseHostStateV481(base,local,latest){
  let out=rebasePlayerStateV47(base,local,latest);
  const keys=[
    'phase','timer','flowMode','phaseDurations','flowV480','flowV481',
    'round','markets','branchMarket','p5Auctions','results','settledRound',
    'snapshots','gameOver','endedAtRound','gameEndedAt','gameControl',
    'realtimeClock','activeSince','activeElapsedMs','tradeAdviceP2V473','bank','setup'
  ];
  for(const k of keys){
    if(JSON.stringify(local?.[k])!==JSON.stringify(base?.[k]))out[k]=deep(local[k]);
  }
  // Nếu người chơi đã ACCEPT thành công trước khi Host giành được CAS chuyển P,
  // giữ giao dịch đã hoàn tất thay vì để lệnh expire của Host đổi nhãn ngược lại.
  const latestTradeMap=new Map((latest?.trades||[]).map(t=>[String(t.id),t]));
  for(const t of out.trades||[]){
    const rt=latestTradeMap.get(String(t.id));
    if(rt?.status==='accepted'&&t.status!=='accepted')Object.assign(t,deep(rt));
  }
  return ensureFlowV481(out)
}

pushRoomState=async function(){
  if(ROOM_PUSHING||!ROOM?.id||!ROOM_QUEUED_STATE||!SB)return;
  ROOM_PUSHING=true;
  let state=ROOM_QUEUED_STATE;
  ROOM_QUEUED_STATE=null;
  let expected=Number(ROOM.revision)||0;
  let base=ROOM_BASE_STATE_V47?deep(ROOM_BASE_STATE_V47):null;
  setRoomStatus('sync');
  try{
    for(let attempt=0;attempt<5;attempt++){
      const {data,error}=await SB.rpc('update_game_room_state_secure',{
        p_room_id:ROOM.id,
        p_expected_revision:expected,
        p_state:state,
        p_member_token:accessIsAdmin()?null:currentMemberToken(),
        p_admin_token:accessIsAdmin()?ADMIN_TOKEN:null
      });
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      if(!row)break;
      if(row.ok){
        ROOM.revision=Number(row.revision)||expected+1;
        ROOM.status=row.status||ROOM.status;
        storeRoom(ROOM);
        ROOM_BASE_STATE_V47=deep(row.state||state);
        localStorage.setItem(STATE_KEY,JSON.stringify(row.state||state));
        setRoomStatus('live');
        await broadcastRoomSignal('state_changed',{revision:ROOM.revision});
        break
      }
      if(base&&row.state){
        // Một player write bắt đầu ở P cũ nhưng Host đã chuyển P trước trên server:
        // không replay thao tác cũ sang P mới. Đây là hàng rào cho P4 giao dịch,
        // P5 chốt dự án và các hành động phase-scoped sau này.
        if(session?.role==='player'&&base.phase&&state?.phase===base.phase&&row.state.phase&&row.state.phase!==base.phase){
          const from=base.phase,to=row.state.phase;
          ROOM.revision=Number(row.revision)||ROOM.revision;ROOM.status=row.status||ROOM.status;storeRoom(ROOM);
          ROOM_BASE_STATE_V47=deep(row.state);applyRemoteState(row.state,row.revision);setRoomStatus('live');
          setTimeout(()=>notifyStalePhaseActionV481(from,to),0);
          break
        }
        state=session?.role==='player'
          ? rebasePlayerStateV47(base,state,row.state)
          : rebaseHostStateV481(base,state,row.state);
        base=deep(row.state);
        expected=Number(row.revision)||expected;
        ROOM.revision=expected;
        storeRoom(ROOM);
        continue
      }
      ROOM.revision=Number(row.revision)||ROOM.revision;
      storeRoom(ROOM);
      applyRemoteState(row.state,row.revision);
      setRoomStatus('live');
      break
    }
  }catch(e){
    console.error(e);
    setRoomStatus('error')
  }finally{
    ROOM_PUSHING=false;
    if(ROOM_QUEUED_STATE)setTimeout(pushRoomState,20)
  }
};

/* ---------- AUTO / CONTROL UI safety ---------- */
phaseButtons=function(s){
  ensureFlowV481(s);
  const arr=Object.keys(PHASES),cur=arr.indexOf(s.phase),locked=s.flowMode==='auto';
  return`<div class="btn-row">${arr.map((p,i)=>`<button class="btn phase-step ${p===s.phase?'active':cur>i?'done':''} phaseBtn ${locked?'v481-locked':''}" data-phase="${p}" ${locked?'disabled aria-disabled="true" title="AUTO đang điều khiển tiến trình"':''}>${locked?'🔒 ':''}${p}<span style="display:block;font-size:10px;font-weight:600;margin-top:2px">${phaseDurationLabelV480(s,p)}</span></button>`).join('')}</div>${locked?'<div class="v481-auto-lock-note">🤖 AUTO đang giữ tiến trình P. Host chỉ điều chỉnh thời gian; hệ thống tự xử lý và chuyển P. Muốn chuyển P thủ công, hãy đổi sang CONTROL.</div>':''}`
};

const _flowControlCardV481Base=flowControlCardV480;
flowControlCardV480=function(s){
  let html=_flowControlCardV481Base(s),box=document.createElement('div');
  box.innerHTML=html;
  const card=box.firstElementChild;
  if(card&&s.flowMode==='auto'){
    card.classList.add('v481-auto-active');
    const status=card.querySelector('.flow-status-v480');
    if(status)status.innerHTML=`🤖 AUTO đang bật · nút chuyển P và thao tác cấu trúc P3/P6 được khóa. Host vẫn chỉnh thời gian. REALTIME: <b>${s.realtimeClock?.running?'ĐANG CHẠY':'SẼ TỰ BẬT'}</b>.`;
  }
  return card?.outerHTML||html
};

async function setFlowModeV481(mode){
  mode=mode==='auto'?'auto':'control';
  if(V481_FLOW_SWITCH_BUSY||V481_PHASE_SWITCH_BUSY||V481_AUCTION_START_BUSY||V481_AUCTION_FINISH_BUSY||AUCTION_FINISHING){
    alert('Hệ thống đang hoàn tất một thao tác chuyển trạng thái. Hãy chờ giây lát rồi thử lại.');
    return
  }
  const s=load();
  // Nhấn lại AUTO là thao tác an toàn/idempotent: nếu REALTIME đang dừng thì bật lại,
  // không đụng timer P3 khi một phiên đấu giá đang chạy.
  if(s.flowMode==='auto'&&mode==='auto') {
    const changed=ensureRealtimeRunningV481(s);
    if(changed){save(s);render();await waitRoomSyncV481()}
    return
  }
  if(s.specialAuction?.active){
    alert('Không đổi AUTO / CONTROL khi phiên đấu giá đang chạy. Hãy kết thúc phiên đấu giá trước để tránh hai luồng điều khiển chồng nhau.');
    return
  }
  V481_FLOW_SWITCH_BUSY=true;
  try{
    const changed=s.flowMode!==mode;
    s.flowMode=mode;
    if(mode==='auto'){
      const d=readPsPrepV45();
      if(d.open){d.open=false;writePsPrepV45(d)}
      ensureRealtimeRunningV481(s);
      if(s.phase!=='P7')resumePhaseCountdownV481(s);
    }
    if(changed)logPush(s,`⚙️ Host chuyển chế độ điều khiển sang ${mode.toUpperCase()}.`);
    else if(mode==='auto')logPush(s,'🤖 Host xác nhận lại AUTO; kiểm tra REALTIME và đồng hồ P hiện tại.');
    save(s);
    allowPsRenderV471?.(1200);
    render();
    await waitRoomSyncV481();
    if(mode==='auto'&&load().flowMode==='auto'&&load().phase==='P3'&&!load().specialAuction?.active){
      await startAutoP3AuctionV480()
    }
    if(load().phase==='P6')await ensureProcurementOpenV480()
  }finally{
    V481_FLOW_SWITCH_BUSY=false
  }
}
setFlowModeV480=setFlowModeV481;

function clearProjectLocksForRewindV481(s){
  for(const p of Object.values(s.players||{})){
    p.projectDecisions={};
    if(typeof syncLegacyProjectFieldsV475==='function')syncLegacyProjectFieldsV475(p,s)
  }
}
function clearProcurementForRewindV481(s){
  if(s.p5Auctions?.[String(s.round)])delete s.p5Auctions[String(s.round)];
  try{HOST_BIDS_V476=[];HOST_BIDS_AT_V476=0}catch(e){}
}

async function controlPhaseChangeV481(ph){
  if(V481_PHASE_SWITCH_BUSY||V481_FLOW_SWITCH_BUSY||V481_AUCTION_START_BUSY||V481_AUCTION_FINISH_BUSY)return;
  const s=load(),before=s.phase;
  if(s.flowMode!=='control'){
    alert('AUTO đang bật nên nút chuyển P bị khóa. Chuyển sang CONTROL nếu muốn điều khiển P thủ công.');
    return
  }
  if(s.specialAuction?.active){
    alert('Phiên đấu giá đang chạy. Hãy kết thúc đấu giá trước khi đổi P.');
    return
  }
  if(before===ph)return;
  const bi=phaseIndexV481(before),ti=phaseIndexV481(ph);
  if(bi<0||ti<0)return;
  if(before==='P7'||Number(s.settledRound)===Number(s.round)){
    alert('Thị trường này đã thanh toán/kết thúc. Muốn quay lại, dùng RESET THỊ TRƯỜNG để khôi phục đúng dữ liệu thay vì đổi P trực tiếp.');
    return
  }
  if(ti>bi+1){
    alert(`CONTROL chỉ cho đi tới từng bước liền kề để không bỏ qua logic ${V481_PHASE_ORDER[bi+1]}. Bạn vẫn có thể quay ngược P để kiểm tra/chỉnh lại.`);
    return
  }
  if(before==='P6'&&ph==='P7'){
    await finalizeP6V480(false);
    return
  }
  V481_PHASE_SWITCH_BUSY=true;
  try{
    const closingTradePhase=before==='P4'&&ph==='P5';
    if(closingTradePhase){
      expireOpenTrades(s,s.round);
      logPush(s,'🎛 CONTROL đóng P4: các giao dịch chưa hoàn tất được hết hạn trước khi sang P5.');
    }
    if(ti<bi&&bi>=phaseIndexV481('P5')&&ti<=phaseIndexV481('P4')){
      clearProjectLocksForRewindV481(s);
      logPush(s,'↩ CONTROL quay lại trước P5: trạng thái chốt dự án được mở lại để người chơi chỉnh mục tiêu.')
    }
    if(ti<bi&&bi>=phaseIndexV481('P6')){
      clearProcurementForRewindV481(s);
      logPush(s,'↩ CONTROL quay lại trước P6: lượt đấu thầu cũ sẽ được làm mới khi trở lại P6.')
    }
    const wasRunning=!!s.timer?.running;
    _changePhaseV480Base(s,ph);
    setPhaseTimerV480(s,ph,wasRunning);
    logPush(s,`🎛 CONTROL ${before} → ${ph}. Đồng hồ ${wasRunning?'tiếp tục với thời lượng P mới':'đang chờ Host chạy'}.`);
    save(s);
    render();
    await waitRoomSyncV481();
    if(closingTradePhase)await closeAllNegotiationsV480();
    await broadcastRoomSignal('state_changed',{reason:`control_phase_${ph}`}).catch(()=>{});
    if(ph==='P6')await ensureProcurementOpenV480()
  }finally{
    V481_PHASE_SWITCH_BUSY=false
  }
}

async function setTimerZeroSafeV481(){
  const s=load();
  s.timer=s.timer||{};
  s.timer.running=false;
  s.timer.remaining=0;
  s.timer.endAt=null;
  s.timer.expired=true;
  logPush(s,`⏱ Host đưa ${s.phase} về 00:00.${s.flowMode==='auto'?' AUTO sẽ xử lý bước kết thúc P.':' CONTROL chờ Host chọn P tiếp theo.'}`);
  save(s);render();
  if(s.flowMode==='auto'){
    if(s.specialAuction?.active&&s.phase==='P3')await finishPsAuctionV45(true);
    else await autoPhaseEndV480()
  }
}

/* ---------------------------------------------------------
   P3 preparation: preserve the form and update ONLY the queue
   on add/remove. This avoids the old full-render guard conflict
   that made buttons appear not to respond and caused repeats.
   --------------------------------------------------------- */
function capturePsFormV481(){
  try{capturePsFormV463?.()}catch(e){}
  const panel=document.getElementById('psPrepPanel');if(!panel)return;
  const d=readPsPrepV45();d.form=d.form||{};const f=d.form;
  f.kind=document.getElementById('psLotKindV45')?.value??f.kind??'resources';
  f.durationRaw=document.getElementById('psDurationV45')?.value??f.durationRaw??String(d.duration??60);
  f.title=document.getElementById('psLotTitleV45')?.value??f.title??'';
  f.startPrice=document.getElementById('psStartPriceV45')?.value??f.startPrice??'10';
  f.promoPct=document.getElementById('psPromoPctV45')?.value??f.promoPct??'10';
  f.promoQty=document.getElementById('psPromoQtyV45')?.value??f.promoQty??'1';
  f.resources=f.resources||{};
  panel.querySelectorAll('.psResQtyV45').forEach(i=>f.resources[i.dataset.res]=i.value);
  f.branchMode=document.getElementById('psBranchModeV480')?.value??f.branchMode??'universal';
  f.branchRes=document.getElementById('psBranchResV480')?.value??f.branchRes??'';
  f.branchQty=document.getElementById('psBranchQtyV480')?.value??f.branchQty??'1';
  d.open=true;writePsPrepV45(d)
}

const _psPrepPanelV481Base=psPrepPanelV45;
psPrepPanelV45=function(s){
  let html=_psPrepPanelV481Base(s),box=document.createElement('div');box.innerHTML=html;const panel=box.firstElementChild;if(!panel)return html;
  const d=readPsPrepV45(),f=d.form||{};
  const set=(sel,val)=>{const el=panel.querySelector(sel);if(el&&val!==undefined&&val!==null)el.value=String(val);return el};
  const kind=set('#psLotKindV45',f.kind||'resources');
  set('#psDurationV45',f.durationRaw!=null?f.durationRaw:d.duration);
  set('#psLotTitleV45',f.title??'');
  set('#psStartPriceV45',f.startPrice??10);
  set('#psPromoPctV45',f.promoPct??10);
  set('#psPromoQtyV45',f.promoQty??1);
  panel.querySelectorAll('.psResQtyV45').forEach(i=>{const raw=f.resources?.[i.dataset.res];if(raw!==undefined)i.value=String(raw||'')});
  set('#psBranchModeV480',f.branchMode||'universal');
  if(f.branchRes)set('#psBranchResV480',f.branchRes);
  set('#psBranchQtyV480',f.branchQty??1);
  const k=kind?.value||'resources';
  panel.querySelector('#psResourceEditorV45')?.classList.toggle('hidden',k!=='resources');
  panel.querySelector('#psPromoEditorV45')?.classList.toggle('hidden',k!=='promo');
  panel.querySelector('#psBranchEditorV480')?.classList.toggle('hidden',k!=='branch');
  const queue=panel.querySelector('.ps-queue');
  if(queue&&!panel.querySelector('.v481-queue-head'))queue.insertAdjacentHTML('beforebegin',`<div class="v481-queue-head"><span>📋 Combo trong phiên</span><span class="badge v481-queue-count">${(d.lots||[]).length}/20</span></div><div class="v481-queue-status"></div>`);
  if(s.flowMode==='auto')panel.classList.add('v481-auto-prep-locked');
  return panel.outerHTML
};

function psQueueItemHtmlV481(lot,i){
  return`<div class="ps-queue-item"><div class="split"><b>#${i+1} ${esc(lot.title)}</b><button type="button" class="btn bad removePsLotV45" data-i="${i}">XÓA</button></div><div class="tiny" style="margin-top:4px">${auctionLotItemsLabelV480(lot)} · Khởi điểm <b>${Number(lot.startPrice)||0}M</b></div></div>`
}
function setPsStatusV481(text,tone='ok'){
  const el=document.querySelector('#psPrepPanel .v481-queue-status');if(!el)return;
  el.textContent=text||'';el.classList.toggle('warn',tone==='warn');el.classList.toggle('bad',tone==='bad');
  if(text)setTimeout(()=>{if(el.isConnected&&el.textContent===text)el.textContent=''},1800)
}
function lockPsMutationV481(){
  if(Date.now()<V481_PS_QUEUE_BUSY_UNTIL)return false;
  V481_PS_QUEUE_BUSY_UNTIL=Date.now()+420;return true
}
function bindPsQueueControlsV481(){
  document.querySelectorAll('#psPrepPanel .removePsLotV45').forEach(b=>b.onclick=()=>{
    if(!lockPsMutationV481())return;
    capturePsFormV481();
    const d=readPsPrepV45(),i=Number(b.dataset.i);
    if(!Number.isInteger(i)||i<0||i>=d.lots.length)return;
    const removed=d.lots[i];d.lots.splice(i,1);d.open=true;writePsPrepV45(d);
    patchPsQueueV481();setPsStatusV481(`Đã xóa: ${removed?.title||`combo #${i+1}`}.`)
  });
  const start=document.getElementById('startPsAuctionV45');
  if(start)start.onclick=async()=>{
    if(load().flowMode!=='control'){alert('AUTO đang bật. Hệ thống sẽ tự quyết combo P3; chuyển sang CONTROL nếu muốn mở đấu giá thủ công.');return}
    if(V481_AUCTION_START_BUSY)return;
    capturePsFormV481();start.disabled=true;start.textContent='ĐANG MỞ ĐẤU GIÁ...';
    try{await startPsAuctionV45()}catch(e){alert('Không bắt đầu được đấu giá: '+(e.message||e));if(start.isConnected){start.disabled=false;start.textContent='▶ BẮT ĐẦU ĐẤU GIÁ'}}
  }
}
function patchPsQueueV481(){
  const panel=document.getElementById('psPrepPanel'),queue=panel?.querySelector('.ps-queue');if(!panel||!queue)return;
  const d=readPsPrepV45(),lots=d.lots||[];
  queue.innerHTML=lots.length?lots.map(psQueueItemHtmlV481).join(''):'<div class="muted">Chưa có combo nào trong phiên.</div>';
  const count=panel.querySelector('.v481-queue-count');if(count)count.textContent=`${lots.length}/20`;
  let start=panel.querySelector('#startPsAuctionV45');
  if(lots.length&&!start){
    queue.insertAdjacentHTML('afterend',`<button class="btn ps-launch-btn big" id="startPsAuctionV45" style="margin-top:10px">▶ BẮT ĐẦU ĐẤU GIÁ ${lots.length} COMBO</button>`);
  }else if(lots.length&&start){
    start.textContent=`▶ BẮT ĐẦU ĐẤU GIÁ ${lots.length} COMBO`;
    start.disabled=false
  }else if(start)start.remove();
  bindPsQueueControlsV481()
}
function buildManualPsLotV481(){
  const k=document.getElementById('psLotKindV45')?.value||'resources';
  const title=String(document.getElementById('psLotTitleV45')?.value||'').trim();
  const start=Math.max(0,Number(document.getElementById('psStartPriceV45')?.value)||0);
  if(k==='resources'){
    const items={};document.querySelectorAll('#psPrepPanel .psResQtyV45').forEach(i=>{const q=Math.max(0,Math.floor(Number(i.value)||0));if(q>0)items[i.dataset.res]=q});
    if(!Object.keys(items).length)throw new Error('Chọn ít nhất 1 tài nguyên và số lượng > 0.');
    return{kind:'resources',title:title||`Combo ${psItemsLabelV45(items)}`,items,startPrice:start}
  }
  if(k==='promo'){
    const pct=Math.max(1,Math.min(200,Number(document.getElementById('psPromoPctV45')?.value)||10));
    const qty=Math.max(1,Math.min(20,Math.floor(Number(document.getElementById('psPromoQtyV45')?.value)||1)));
    return{kind:'promo',title:title||`Phiếu KM +${pct}%`,promoPercent:pct,promoQty:qty,startPrice:start}
  }
  const mode=document.getElementById('psBranchModeV480')?.value||'universal';
  const res=document.getElementById('psBranchResV480')?.value;
  const qty=Math.max(1,Math.min(20,Math.floor(Number(document.getElementById('psBranchQtyV480')?.value)||1)));
  if(mode==='specific'&&(!res||!RES[res]))throw new Error('Hãy chọn loại chi nhánh cụ thể.');
  return{kind:'branch',title:title||(mode==='universal'?`Chi nhánh vạn năng ×${qty}`:`Chi nhánh ${RES[res]?.label||res} ×${qty}`),items:{branchMode:mode,resource:mode==='specific'?res:null,qty},startPrice:start}
}

const _bindPsPrepV481Base=bindPsPrepV45;
bindPsPrepV45=function(){
  _bindPsPrepV481Base();
  const panel=document.getElementById('psPrepPanel');if(!panel)return;
  const s=load();
  // Bấm đề xuất phải dùng đúng snapshot đã render trên màn hình, không tính lại giữa click
  // (realtime có thể làm dữ liệu nền thay đổi trong khi interaction-island đang được giữ nguyên).
  const smartRecByIdV481=new Map(buildAuctionRecommendationsV480(s).map(r=>[String(r.id),r]));
  panel.querySelectorAll('input,select,textarea').forEach(el=>{
    el.addEventListener('input',capturePsFormV481);
    el.addEventListener('change',capturePsFormV481)
  });
  const kind=document.getElementById('psLotKindV45');
  if(kind)kind.onchange=()=>{
    capturePsFormV481();const k=kind.value||'resources';
    document.getElementById('psResourceEditorV45')?.classList.toggle('hidden',k!=='resources');
    document.getElementById('psPromoEditorV45')?.classList.toggle('hidden',k!=='promo');
    document.getElementById('psBranchEditorV480')?.classList.toggle('hidden',k!=='branch');
    if(k==='branch')updateBranchSuggestionV480()
  };
  for(const id of ['psBranchModeV480','psBranchResV480','psBranchQtyV480']){
    const el=document.getElementById(id);if(el){const fn=()=>{capturePsFormV481();updateBranchSuggestionV480()};el.oninput=fn;el.onchange=fn}
  }
  const dur=document.getElementById('psDurationV45');if(dur){const saveDur=()=>{capturePsFormV481();const d=readPsPrepV45();d.duration=Math.max(5,Math.min(3600,Number(dur.value)||d.duration||60));writePsPrepV45(d)};dur.oninput=saveDur;dur.onchange=saveDur}
  document.querySelectorAll('.addSmartLotV480').forEach(b=>b.onclick=()=>{
    if(s.flowMode!=='control'){alert('AUTO đang bật nên combo P3 do thuật toán tự vận hành. Chuyển sang CONTROL để chỉnh phiên thủ công.');return}
    if(!lockPsMutationV481())return;capturePsFormV481();
    const rec=smartRecByIdV481.get(String(b.dataset.rec));if(!rec){setPsStatusV481('Đề xuất này vừa thay đổi; đóng/mở lại bảng để làm mới.','warn');return}
    const d=readPsPrepV45();d.lots=d.lots||[];if(d.lots.length>=20){setPsStatusV481('Một phiên tối đa 20 combo.','bad');return}
    d.lots.push(deep(rec.lot));d.open=true;writePsPrepV45(d);patchPsQueueV481();setPsStatusV481(`✓ Đã thêm “${rec.lot.title}”.`)
  });
  const add=document.getElementById('addPsLotV45');if(add)add.onclick=()=>{
    if(s.flowMode!=='control'){alert('AUTO đang bật nên Host không thêm combo thủ công.');return}
    if(!lockPsMutationV481())return;capturePsFormV481();
    try{
      const lot=buildManualPsLotV481(),d=readPsPrepV45();d.lots=d.lots||[];if(d.lots.length>=20){setPsStatusV481('Một phiên tối đa 20 combo.','bad');return}
      d.lots.push(lot);d.open=true;writePsPrepV45(d);patchPsQueueV481();setPsStatusV481(`✓ Đã thêm “${lot.title}”.`)
    }catch(e){alert(e.message||e)}
  };
  bindPsQueueControlsV481();
  updatePsSuggestionV45?.();updateBranchSuggestionV480?.();
  if(s.flowMode==='auto'){
    panel.querySelectorAll('.addSmartLotV480,#addPsLotV45,.removePsLotV45,#startPsAuctionV45').forEach(el=>{el.disabled=true;el.classList.add('v481-structural-locked')});
    setPsStatusV481('AUTO đang bật: phiên P3 được hệ thống điều khiển. Chuyển CONTROL để chỉnh combo thủ công.','warn')
  }
};

/* ---------------------------------------------------------
   One start path for AUTO and CONTROL. No stale-room save is
   issued after the auction RPC; snapshot is rendered directly.
   --------------------------------------------------------- */
async function fetchAuctionSnapshotDirectV481(){
  const {data,error}=await SB.rpc('get_market_auction_snapshot',{
    p_room_id:ROOM.id,
    p_member_token:accessIsAdmin()?null:currentMemberToken(),
    p_admin_token:accessIsAdmin()?ADMIN_TOKEN:null
  });
  if(error)throw error;return data||null
}
async function startMarketAuctionV481(lots,duration,source='manual'){
  if(V481_AUCTION_START_BUSY)return false;
  let s=load();
  if(s.specialAuction?.active){allowPsRenderV471?.(1200);render();return true}
  if(source==='manual'&&s.flowMode!=='control')throw new Error('AUTO đang bật; không thể mở đồng thời một phiên đấu giá thủ công.');
  if(source==='auto'&&(s.flowMode!=='auto'||s.phase!=='P3'))return false;
  if(!ROOM?.id||!SB||!ADMIN_TOKEN)throw new Error('Phòng online/phiên Admin chưa sẵn sàng.');
  if(!Array.isArray(lots)||!lots.length)return false;
  duration=Math.max(5,Math.min(3600,Number(duration)||60));
  V481_AUCTION_START_BUSY=true;
  try{
    const {data,error}=await SB.rpc('start_market_auction_admin',{
      p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_duration_seconds:duration,p_lots:lots
    });
    if(error){
      if(/AUCTION_ALREADY_ACTIVE/i.test(String(error.message||''))){await fetchRoomLatest();allowPsRenderV471?.(1200);render();return true}
      throw error
    }
    let snap=null;
    try{snap=await fetchAuctionSnapshotDirectV481()}catch(e){console.warn('snapshot immediate',e)}
    if(snap){
      AUCTION_SNAPSHOT=snap;
      const optimistic=load();
      optimistic.specialAuction={...(optimistic.specialAuction||{}),...deep(snap),active:true,auctionId:String(data||snap.auctionId||snap.id||''),returnPhase:snap.returnPhase||optimistic.phase};
      localStorage.setItem(STATE_KEY,JSON.stringify(optimistic));
      allowPsRenderV471?.(1500);render()
    }
    if(source==='manual'){
      const d=readPsPrepV45();writePsPrepV45({open:false,duration,lots:[],form:d.form||{}})
    }
    await fetchRoomLatest();
    await broadcastRoomSignal('state_changed',{reason:source==='auto'?'auto_p3_started':'ps_started'});
    await broadcastRoomSignal('market_auction_changed',{auctionId:data});
    render();return true
  }finally{V481_AUCTION_START_BUSY=false}
}

startPsAuctionV45=async function(){
  const d=readPsPrepV45();if(!d.lots?.length)return false;
  capturePsFormV481();
  const duration=Math.max(5,Math.min(3600,Number(document.getElementById('psDurationV45')?.value)||Number(d.duration)||60));
  d.duration=duration;writePsPrepV45(d);
  return startMarketAuctionV481(deep(d.lots),duration,'manual')
};

startAutoP3AuctionV480=async function(){
  const s=load();
  if(V480_AUTO_BUSY||V481_AUCTION_START_BUSY||s.flowMode!=='auto'||s.phase!=='P3'||s.specialAuction?.active||!ROOM?.id||!SB)return false;
  V480_AUTO_BUSY=true;
  try{
    ensureRealtimeRunningV481(s);
    const recs=buildAuctionRecommendationsV480(s).slice(0,20),lots=recs.map(r=>deep(r.lot));
    const duration=Math.max(5,phaseDurationV480(s,'P3')||60);
    if(!lots.length){V480_AUTO_BUSY=false;await enterPhaseV480('P4',true);return true}
    return await startMarketAuctionV481(lots,duration,'auto')
  }finally{V480_AUTO_BUSY=false}
};

/* Wait for the P change to reach Supabase BEFORE P3/P6 RPCs. */
enterPhaseV480=async function(ph,autoRun=false){
  const s=load(),before=s.phase;if(before===ph)return;
  _changePhaseV480Base(s,ph);
  setPhaseTimerV480(s,ph,autoRun&&ph!=='P7');
  if(autoRun)ensureRealtimeRunningV481(s);
  logPush(s,`🤖 ${before} → ${ph}${autoRun?' tự động':''}.`);
  save(s);render();
  await waitRoomSyncV481();
  await broadcastRoomSignal('state_changed',{reason:`phase_${ph}`}).catch(()=>{});
  if(ph==='P3'&&load().flowMode==='auto')await startAutoP3AuctionV480();
  if(ph==='P6')await ensureProcurementOpenV480()
};

/* Last-second bid protection on the client; server serialization is in the SQL patch. */
function bidButtonForLotV481(lotId){
  const id=String(lotId);
  return [...document.querySelectorAll('.psSubmitBidV45')].find(b=>String(b.dataset.lot)===id)||null
}
const _submitPsBidV481Base=submitPsBidV45;
submitPsBidV45=async function(lotId){
  if(V481_PLAYER_BID_BUSY.has(String(lotId)))return;
  V481_PLAYER_BID_BUSY.add(String(lotId));
  const btn=bidButtonForLotV481(lotId);
  if(btn){btn.disabled=true;btn.textContent='ĐANG GỬI...'}
  try{return await _submitPsBidV481Base(lotId)}
  finally{
    V481_PLAYER_BID_BUSY.delete(String(lotId));
    const b=bidButtonForLotV481(lotId);if(b){b.disabled=false;b.textContent='GỬI GIÁ'}
  }
};

const _finishPsAuctionV481Base=finishPsAuctionV45;
finishPsAuctionV45=async function(force=false){
  if(V481_AUCTION_FINISH_BUSY)return;
  V481_AUCTION_FINISH_BUSY=true;
  try{return await _finishPsAuctionV481Base(force)}finally{V481_AUCTION_FINISH_BUSY=false}
};

/* AUTO recovery: if a Player client was first to finalize P3 on the server,
   Host still advances P3 -> P4 once the finished auction reaches Host state. */
const _timerTickV481Base=timerTick;
timerTick=function(){
  _timerTickV481Base();
  if(session?.role!=='host'||V480_AUTO_BUSY||V481_PHASE_SWITCH_BUSY||V481_AUCTION_START_BUSY||V481_AUCTION_FINISH_BUSY)return;
  const s=load(),a=s.specialAuction;
  if(s.flowMode!=='auto'||s.phase!=='P3'||a?.active||!a)return;
  const ended=Number(a.endedAtMs)||0,entered=Number(s.flowV480?.phaseEnteredAt)||0;
  if(a.returnPhase==='P3'&&ended>0&&ended>=Math.max(0,entered-2000)&&remainingTime(s)<=0){
    autoPhaseEndV480().catch(e=>console.warn('AUTO P3 recovery',e))
  }
};

/* AUTO remains the owner of P progression; CONTROL keeps safe manual navigation. */
const _bindHostV481Base=bindHost;
bindHost=function(){
  _bindHostV481Base();
  const s=load();
  document.querySelectorAll('.phaseBtn').forEach(b=>{
    b.onclick=()=>controlPhaseChangeV481(b.dataset.phase).catch(e=>alert(e.message||e));
    if(s.flowMode==='auto'){b.disabled=true;b.classList.add('v481-locked')}
  });
  const open=document.getElementById('openPsPrepV45');
  if(open&&s.flowMode==='auto'){
    open.disabled=true;open.classList.add('v481-structural-locked');open.title='AUTO tự chuẩn bị và mở P3; chuyển CONTROL để thao tác P/s thủ công.'
  }
  const fin=document.getElementById('finalizeP6V480');
  if(fin&&s.flowMode==='auto'){
    fin.disabled=true;fin.classList.add('v481-structural-locked');fin.title='AUTO sẽ chốt P6 khi hết thời gian.'
  }
  const zero=document.getElementById('timerSetZero');if(zero)zero.onclick=()=>setTimerZeroSafeV481().catch(e=>alert(e.message||e));
  const end=document.getElementById('timerEndNow');if(end)end.onclick=()=>setTimerZeroSafeV481().catch(e=>alert(e.message||e));
};

/* If AUTO starts/continues the countdown later, keep REALTIME coherent too. */
const _toggleTimerV481Base=toggleTimer;
toggleTimer=function(){
  const before=load(),was=!!before.timer?.running,out=_toggleTimerV481Base(),s=load();
  if(!was&&s.flowMode==='auto'&&s.timer?.running&&ensureRealtimeRunningV481(s)){save(s);render()}
  return out
};

/* Next market: AUTO should also ensure realtime is active. */
const _nextRoundV481Base=nextRound;
nextRound=function(){
  const out=_nextRoundV481Base(),s=load();
  if(s.flowMode==='auto'&&s.phase==='P1'&&ensureRealtimeRunningV481(s)){save(s);render()}
  return out
};

/* Host rendering: AUTO structural controls are visibly locked. */
const _hostViewV481Base=hostView;
hostView=function(){
  const html=_hostViewV481Base(),s=load();
  if(s.gameOver||s.specialAuction?.active)return html;
  const box=document.createElement('div');box.innerHTML=html;
  if(s.flowMode==='auto'){
    box.querySelectorAll('.phaseBtn').forEach(b=>{b.disabled=true;b.classList.add('v481-locked')});
    for(const id of ['openPsPrepV45','finalizeP6V480']){const el=box.querySelector('#'+id);if(el){el.disabled=true;el.classList.add('v481-structural-locked')}}
  }
  return box.innerHTML
};

/* ---------- Version ---------- */
const _loginViewV481Base=loginView;
loginView=function(){return _loginViewV481Base().replace(/V4\.8\.0 Multiplayer/g,'V4.8.1 Multiplayer')};
document.title=document.title.replace(/V4\.8\.0/g,'V4.8.1');
