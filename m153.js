/* M1.5.4 — concurrency + isolated Setup hotfix. Loaded last on purpose. */
const M153_VERSION='M1.6.2 DEEP-FIX';
window.M161_PHASE_WRITE_GATE=false;
let M161_ROOM_WRITE_UNRESOLVED=false;

/* A queued write must keep the revision and phase it was created from. Never let
   a later realtime refresh "upgrade" an old snapshot so it can overwrite P/market. */
scheduleRoomPush=function(st){
  if(!ROOM?.id||!SB)return;
  const previous=ROOM_QUEUED_STATE?.m153Envelope?ROOM_QUEUED_STATE:null;
  ROOM_QUEUED_STATE={
    m153Envelope:true,
    state:deep(st),
    expectedRevision:previous?.expectedRevision??(Number(ROOM.revision)||0),
    base:previous?.base||deep(ROOM_BASE_STATE_V47||load()),
    phase:String(st?.phase||''),round:Number(st?.round)||0,
    market:Number(st?.marketIndex??st?.market??0)||0
  };
  clearTimeout(ROOM_PUSH_TIMER);
  ROOM_PUSH_TIMER=setTimeout(pushRoomState,120)
};

pushRoomState=async function(){
  if(window.M161_PHASE_WRITE_GATE||ROOM_PUSHING||!ROOM?.id||!ROOM_QUEUED_STATE||!SB)return;
  ROOM_PUSHING=true;
  M161_ROOM_WRITE_UNRESOLVED=true;
  const queued=ROOM_QUEUED_STATE;ROOM_QUEUED_STATE=null;
  let state=queued.m153Envelope?queued.state:queued;
  let expected=queued.m153Envelope?queued.expectedRevision:(Number(ROOM.revision)||0);
  let base=queued.m153Envelope?queued.base:deep(ROOM_BASE_STATE_V47||load());
  setRoomStatus('sync');
  try{
    for(let attempt=0;attempt<4;attempt++){
      const {data,error}=await SB.rpc('update_game_room_state_secure',{p_room_id:ROOM.id,p_expected_revision:expected,p_state:state,p_member_token:accessIsAdmin()?null:currentMemberToken(),p_admin_token:accessIsAdmin()?ADMIN_TOKEN:null});
      if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row)break;
      if(row.ok){
        M161_ROOM_WRITE_UNRESOLVED=false;
        ROOM.revision=Number(row.revision)||expected+1;ROOM.status=row.status||ROOM.status;storeRoom(ROOM);
        ROOM_BASE_STATE_V47=deep(row.state||state);localStorage.setItem(STATE_KEY,JSON.stringify(row.state||state));setRoomStatus('live');
        /* A second local action made while this request was running is based on
           our successful result, so only that same-client envelope advances. */
        if(ROOM_QUEUED_STATE?.m153Envelope&&ROOM_QUEUED_STATE.expectedRevision===expected)ROOM_QUEUED_STATE.expectedRevision=ROOM.revision;
        broadcastRoomSignal('state_changed',{revision:ROOM.revision}).catch(()=>{});break
      }
      const latest=row.state;
      ROOM.revision=Number(row.revision)||ROOM.revision;ROOM.status=row.status||ROOM.status;storeRoom(ROOM);
      if(!latest){setRoomStatus('live');break}
      const crossed=String(latest.phase||'')!==String(state.phase||'')||Number(latest.round||0)!==Number(state.round||0)||Number(latest.marketIndex??latest.market??0)!==Number(state.marketIndex??state.market??0);
      if(crossed){
        M161_ROOM_WRITE_UNRESOLVED=false;
        applyRemoteState(latest,row.revision);setRoomStatus('live');
        if(session?.role==='player')setTimeout(()=>notifyStalePhaseActionV481?.(state.phase,latest.phase),0);
        break
      }
      state=session?.role==='player'?rebasePlayerStateV47(base,state,latest):rebaseHostStateV481(base,state,latest);
      base=deep(latest);expected=Number(row.revision)||expected;continue
    }
  }catch(e){console.error('M1.5.4 room sync',e);setRoomStatus('error')}
  finally{ROOM_PUSHING=false;if(ROOM_QUEUED_STATE)setTimeout(pushRoomState,30)}
};

/* Realtime is primary. Coalesce broadcast bursts; polling is only a fallback.
   This avoids N players causing N×N snapshot reads and full DOM refreshes. */
let M153_ROOM_FETCH=null,M153_ROOM_FETCH_AGAIN=false,M153_AUCTION_FETCH_TIMER=null;
async function m153FetchRoomCoalesced(){
  if(M153_ROOM_FETCH){M153_ROOM_FETCH_AGAIN=true;return M153_ROOM_FETCH}
  M153_ROOM_FETCH=(async()=>{try{return await fetchRoomLatest()}finally{M153_ROOM_FETCH=null;if(M153_ROOM_FETCH_AGAIN){M153_ROOM_FETCH_AGAIN=false;setTimeout(m153FetchRoomCoalesced,120)}}})();
  return M153_ROOM_FETCH
}
function m153AuctionRefresh(delay=140){clearTimeout(M153_AUCTION_FETCH_TIMER);M153_AUCTION_FETCH_TIMER=setTimeout(()=>fetchAuctionSnapshotV45().catch(()=>{}),delay)}
subscribeRoom=async function(){
  if(!SB||!ROOM?.id)return;
  if(ROOM_CHANNEL){try{await SB.removeChannel(ROOM_CHANNEL)}catch(e){}ROOM_CHANNEL=null}
  if(ROOM_SIGNAL_POLL){clearInterval(ROOM_SIGNAL_POLL);ROOM_SIGNAL_POLL=null}
  setRoomStatus('sync');
  ROOM_CHANNEL=SB.channel('tt-room-'+ROOM.code)
    .on('broadcast',{event:'state_changed'},message=>{const payload=message?.payload||{},diag=window.__M168_DIAG__||(window.__M168_DIAG__={received:0,privateP2Skipped:0,playerPeerSkipped:0,reasons:[]});diag.received++;if(payload.reason&&diag.reasons.length<30)diag.reasons.push(String(payload.reason));if(payload.__m167SenderRole==='player'&&payload.__m168PrivatePhase==='P2'){diag.privateP2Skipped++;return}if(session?.role==='player'&&payload.__m167SenderRole==='player'){diag.playerPeerSkipped++;return}(()=>{const reason=String(payload.reason||''),phase=reason.match(/^m154_control_phase_(P[1-7])$/)?.[1]||reason.match(/^m161_host_.*_(P[1-7])$/)?.[1]||(reason==='m161_p6_settled'?'P7':'');if(phase&&window.__M167_FETCH_PHASE__)return window.__M167_FETCH_PHASE__(phase,payload.revision);if(reason==='m163_next_market'&&window.__M167_FETCH_PHASE__)return window.__M167_FETCH_PHASE__('P1',payload.revision);return m153FetchRoomCoalesced(payload)})().then(()=>{if(load().specialAuction?.active)m153AuctionRefresh();setRoomStatus('live')}).catch(()=>verifyRoomActiveV464?.(ROOM?.code))})
    .on('broadcast',{event:'market_auction_changed'},()=>m153AuctionRefresh(80))
    .on('broadcast',{event:'negotiation_changed'},()=>{if(session?.role==='player')refreshNegotiationHistories(session.name)})
    .on('broadcast',{event:'room_closed'},()=>m153VerifyClosedRoom())
    .subscribe(status=>{if(status==='SUBSCRIBED')setRoomStatus('live');else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setRoomStatus('error')});
  const count=Math.max(1,Object.keys(load()?.players||{}).length),poll=count>7?9000:count>5?7000:5000;
  ROOM_SIGNAL_POLL=setInterval(()=>{if(ROOM?.id)m153FetchRoomCoalesced().catch(()=>verifyRoomActiveV464?.(ROOM?.code))},poll)
};

/* Do not validate the same player token with a second RPC before every bid.
   submit_market_auction_bid already authenticates it atomically on the server. */
c15ValidatePlayerSession=async function(){const token=currentMemberToken();if(!ROOM?.id||!token)throw new Error('PLAYER_AUTH_REQUIRED');return token};
submitPsBidV45=async function(lotId){
  const id=String(lotId);if(V481_PLAYER_BID_BUSY.has(id))return false;
  const cap=m1AuctionCapacityCheck(session?.name,lotId);if(!cap.ok){c1Toast(`Bất động sản chỉ còn chứa ${c1FormatNumber(cap.free)} đơn vị; combo cần thêm ${c1FormatNumber(cap.needed)}.`,'sell');return false}
  const input=document.querySelector(`.psBidInputV45[data-lot="${CSS.escape(id)}"]`),bid=c1ParseNumber(input?.value);
  if(!Number.isFinite(bid)||bid<0){c1Toast('Hãy nhập một mức giá hợp lệ.','sell');input?.focus({preventScroll:true});return false}
  V481_PLAYER_BID_BUSY.add(id);const btn=bidButtonForLotV481(lotId);if(btn){btn.disabled=true;btn.textContent='ĐANG GỬI...'}
  try{const {data,error}=await SB.rpc('submit_market_auction_bid',{p_room_id:ROOM.id,p_lot_id:lotId,p_bid:bid,p_member_token:currentMemberToken()});if(error)throw error;const lot=(AUCTION_SNAPSHOT?.lots||[]).find(x=>String(x.id)===id);if(lot){lot.currentPrice=Number(data?.currentPrice??bid);lot.currentBidder=data?.currentBidder||session.name}if(input)input.value='';patchAuctionStageV45();broadcastRoomSignal('market_auction_changed',{lotId}).catch(()=>{});m153AuctionRefresh(160);c1Toast('Đã ghi nhận giá đấu của bạn.','buy');return true}catch(e){c1Toast(c15AuctionError(e),'sell');return false}finally{V481_PLAYER_BID_BUSY.delete(id);const b=bidButtonForLotV481(lotId);if(b){b.disabled=false;b.textContent='GỬI GIÁ'}}
};

const _bindAuctionStageM153Base=bindAuctionStageV45;
bindAuctionStageV45=function(){const out=_bindAuctionStageM153Base();if(AUCTION_POLL)clearInterval(AUCTION_POLL);const count=Object.keys(load()?.players||{}).length,ms=count>7?1400:count>5?1100:800;AUCTION_POLL=setInterval(()=>{if(document.visibilityState!=='visible')return;m153AuctionRefresh(0);const snap=AUCTION_SNAPSHOT;if(!snap||snap.paused)return;const el=document.getElementById('psTimerV45');if(el)el.textContent=fmtTime(m1AuctionSeconds(snap));if(m12AuctionIsClosed(snap)&&session?.role==='host')finishPsAuctionV45(false).catch(()=>{})},ms);return out};

m1ToggleAuctionPause=async function(){const btn=document.getElementById('togglePsAuctionPauseM1');if(!btn||btn.disabled||!ROOM?.id||!SB)return;btn.disabled=true;try{const {data,error}=await SB.rpc('toggle_market_auction_pause_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id});if(error)throw error;AUCTION_SNAPSHOT=data||AUCTION_SNAPSHOT;m1PatchAuctionPauseUi();broadcastRoomSignal('market_auction_changed',{reason:data?.paused?'auction_paused':'auction_resumed'}).catch(()=>{})}catch(e){const m=String(e?.message||e);if(/NO_ACTIVE_AUCTION|AUCTION_CLOSED/i.test(m)){await fetchRoomLatest().catch(()=>{});await fetchAuctionSnapshotV45().catch(()=>{});c1Toast('Phiên đã hết; đang hoàn tất và đồng bộ kết quả.','info');await finishPsAuctionV45(false).catch(()=>{});render();return}c1Toast('Không đổi được trạng thái đấu giá: '+m,'sell')}finally{const b=document.getElementById('togglePsAuctionPauseM1');if(b)b.disabled=false}};

/* Setup: keep name/cash fields isolated and offer a newline-based name importer. */
function m153NameKey(x){return String(x||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN')}
/* Setup is the only page where many visually similar text inputs coexist.
   Never replay the generic whole-page form snapshot over this page. */
const _c15CaptureFormsM154Base=c15CaptureForms,_c15RestoreFormsM154Base=c15RestoreForms;
c15CaptureForms=function(){if(document.querySelector('.setup-shell')){C15_FORM_SNAPSHOT=null;return}return _c15CaptureFormsM154Base()};
c15RestoreForms=function(){if(document.querySelector('.setup-shell'))return;return _c15RestoreFormsM154Base()};

const _setupViewM153Base=setupView;
setupView=function(){const html=_setupViewM153Base(),box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('[data-setup-row]').forEach((row,i)=>{const name=row.querySelector('input.setupName'),money=row.querySelector('input.setupMoney');if(name){name.name=`player_name_${i}`;name.autocomplete='off';name.dataset.field='name'}if(money){money.name=`player_cash_${i}`;money.autocomplete='off';money.dataset.field='money'}});if(!box.querySelector('#m153BulkNames')){const first=box.querySelector('[data-setup-row]');first?.insertAdjacentHTML('beforebegin','<div class="card m153-bulk"><div class="title">⚡ Nhập nhanh danh sách người chơi</div><div class="muted tiny">Mỗi dòng là một tên. Hệ thống phân tên xuống từng ô; doanh nghiệp và tiền đầu game vẫn giữ cơ chế hiện tại.</div><textarea id="m153BulkNames" rows="4" autocomplete="off" placeholder="Ngân\nThông\nTrâm"></textarea><button type="button" class="btn secondary" id="m153ApplyNames">PHÂN TÊN XUỐNG CÁC Ô</button></div>')}return box.innerHTML};

const _syncSetupDraftM154Base=syncSetupDraftFromDomV461;
syncSetupDraftFromDomV461=function(){const d=_syncSetupDraftM154Base();document.querySelectorAll('[data-setup-row]').forEach((row,i)=>{if(!d.players[i])return;const name=row.querySelector('[data-field="name"]'),money=row.querySelector('[data-field="money"]'),biz=row.querySelector('select.setupBiz');if(name)d.players[i].name=String(name.value);if(money)d.players[i].money=Math.max(0,c1RoundMoney(c1ParseNumber(money.value)));if(biz)d.players[i].businessId=biz.value});return d};
const _applySetupDraftM154Base=applySetupDraftToDomV461;
applySetupDraftToDomV461=function(){const out=_applySetupDraftM154Base(),d=ensureSetupDraftV461();document.querySelectorAll('[data-setup-row]').forEach((row,i)=>{if(!d.players[i])return;const name=row.querySelector('[data-field="name"]'),money=row.querySelector('[data-field="money"]'),biz=row.querySelector('select.setupBiz');if(name)name.value=String(d.players[i].name||'');if(money)money.value=c1FormatNumber(d.players[i].money??80);if(biz)biz.value=d.players[i].businessId||BUSINESS_CATALOG[i]?.id});return out};

const _bindSetupM153Base=bindSetup;
bindSetup=function(){const out=_bindSetupM153Base(),d=ensureSetupDraftV461();document.querySelectorAll('[data-setup-row]').forEach((row,i)=>{const name=row.querySelector('[data-field="name"]'),money=row.querySelector('[data-field="money"]');if(name)name.oninput=()=>{d.players[i].name=String(name.value);d.dirty=true};if(money)money.oninput=()=>{d.players[i].money=Math.max(0,c1RoundMoney(c1ParseNumber(money.value)));d.dirty=true}});document.querySelectorAll('.c1CashAll').forEach(btn=>btn.onclick=()=>{const add=Number(btn.dataset.add)||0;document.querySelectorAll('[data-setup-row]').forEach((row,i)=>{if(!d.players[i])return;const money=row.querySelector('[data-field="money"]');d.players[i].money=Math.max(0,c1RoundMoney(Number(d.players[i].money||0)+add));if(money)money.value=c1FormatNumber(d.players[i].money)});d.dirty=true;c1Toast(`Đã cộng ${c1Money(add)} cho tất cả người chơi.`,'buy')});const apply=document.getElementById('m153ApplyNames');if(apply)apply.onclick=()=>{const names=String(document.getElementById('m153BulkNames')?.value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,20);if(!names.length)return c1Toast('Hãy nhập ít nhất một tên.','sell');const keys=names.map(m153NameKey);if(new Set(keys).size!==keys.length)return c1Toast('Danh sách có tên trùng nhau.','sell');const countInput=document.getElementById('setupCount'),requested=Math.max(3,Math.min(20,Number(countInput?.value)||d.count||3));d.count=Math.max(requested,names.length);names.forEach((name,i)=>{d.players[i].name=name});d.dirty=true;C15_SKIP_FORM_RESTORE=true;applySetupDraftToDomV461();if(countInput)countInput.value=d.count;render()};const save=document.getElementById('saveSetupBtn');if(save)save.onclick=()=>m154SaveSetupAsNewRoom(save);return out};

async function m154RetireCurrentRoom(){
  if(!ROOM?.id||!SB)return;const old={...ROOM};
  clearTimeout(ROOM_PUSH_TIMER);ROOM_QUEUED_STATE=null;
  const {error}=await SB.rpc('close_game_room_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:old.id});if(error)throw error;
  await broadcastRoomSignal('room_closed',{roomId:old.id,code:old.code}).catch(()=>{});
  if(ROOM_CHANNEL)await SB.removeChannel(ROOM_CHANNEL).catch(()=>{});ROOM_CHANNEL=null;
  if(ROOM_SIGNAL_POLL)clearInterval(ROOM_SIGNAL_POLL);ROOM_SIGNAL_POLL=null;
  clearMemberTokenForRoomV462?.(old.code);ROOM=null;storeRoom(null)
}
async function m154SaveSetupAsNewRoom(button){
  const d=ensureSetupDraftV461(),err=document.getElementById('setupError'),fail=msg=>{if(err){err.textContent=msg;err.classList.remove('hidden')}};err?.classList.add('hidden');
  const countInput=document.getElementById('setupCount'),n=Number(countInput?.value);d.count=n;syncSetupDraftFromDomV461();
  const players=d.players.slice(0,n),names=players.map(x=>String(x.name||'').trim()),biz=players.map(x=>x.businessId),money=players.map(x=>Number.isFinite(Number(x.money))?Math.max(0,c1RoundMoney(x.money)):80);
  if(!Number.isInteger(n)||n<3||n>20)return fail('Số người chơi phải là số nguyên từ 3 đến 20.');
  if(names.some(x=>!x))return fail('Mỗi người chơi phải có tên.');
  if(new Set(names.map(m153NameKey)).size!==names.length)return fail('Tên người chơi không được trùng nhau.');
  if(new Set(biz).size!==biz.length)return fail('Mỗi người cần một loại doanh nghiệp khác nhau.');
  const next={players:names.map((name,i)=>({name,businessId:biz[i],money:money[i]})),branchEnabled:!!d.branchEnabled,branchStartPrice:Math.max(0,Number(d.branchStartPrice)||0),loanEnabled:!!d.loanEnabled,loanDefaultMode:d.loanDefaultMode==='phase'?'phase':'minute',investmentEnabled:!!d.investmentEnabled,maxMarkets:Math.max(1,Math.min(C1_MAX_MARKETS,Math.round(Number(d.maxMarkets)||5))),startedAt:null};
  button.disabled=true;button.textContent='ĐANG XÓA VÁN CŨ & TẠO VÁN MỚI...';
  try{await m154RetireCurrentRoom();saveSetup(next);const fresh=initialState(next);fresh.timer={...(fresh.timer||{}),running:false,endAt:null};fresh.realtimeClock={running:false,elapsedMs:0,startedAt:null};fresh.activeSince=null;fresh.activeElapsedMs=0;localStorage.setItem(STATE_KEY,JSON.stringify(fresh));clearSetupDraftV461();await createOnlineRoom();logout();c1Toast('Đã xóa ván cũ và tạo mã game mới.','buy')}
  catch(e){fail('Không tạo được ván mới: '+(e?.message||e));button.disabled=false;button.textContent='LƯU THIẾT LẬP & TẠO VÁN MỚI'}
}

/* Closing a room broadcasts a fast wake-up; clients verify against the server
   before clearing their local role, so a forged broadcast cannot kick them. */
async function m153VerifyClosedRoom(){const code=ROOM?.code;if(!code)return;try{await fetchRoomLatest()}catch(e){if(code===ROOM?.code)m153ClearRoom(false)}}
function m153ClearRoom(wasAdmin){const code=ROOM?.code||roomInfo()?.code;if(code)clearMemberTokenForRoomV462?.(code);if(ROOM_PUSH_TIMER)clearTimeout(ROOM_PUSH_TIMER);ROOM_QUEUED_STATE=null;ROOM_PUSHING=false;if(ROOM_SIGNAL_POLL)clearInterval(ROOM_SIGNAL_POLL);if(AUCTION_POLL)clearInterval(AUCTION_POLL);ROOM_SIGNAL_POLL=AUCTION_POLL=null;ROOM_CHANNEL=null;ROOM=null;storeRoom(null);session=null;sessionStorage.removeItem(SESSION_KEY);if(!wasAdmin)setAccessMode(null);const u=new URL(location.href);u.searchParams.delete('room');history.replaceState(null,'',u.toString());setRoomStatus('offline');render()}
const _leaveOnlineRoomM153Base=leaveOnlineRoom;
leaveOnlineRoom=async function(){if(!accessIsAdmin())return _leaveOnlineRoomM153Base();const wasAdmin=true,roomId=ROOM?.id;if(roomId&&SB){try{const {error}=await SB.rpc('close_game_room_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:roomId});if(error)throw error;await broadcastRoomSignal('room_closed',{roomId})}catch(e){alert('Không đóng được phòng: '+(e.message||e));return}}if(ROOM_CHANNEL&&SB)SB.removeChannel(ROOM_CHANNEL).catch(()=>{});m153ClearRoom(wasAdmin)};

/* A newly created room is a lobby. Only Host's realtime button starts clocks. */
const _createOnlineRoomM153Base=createOnlineRoom;
createOnlineRoom=async function(){const row=await _createOnlineRoomM153Base(),s=load();s.timer={...(s.timer||{}),running:false,endAt:null,expired:false};s.realtimeClock={running:false,elapsedMs:0,startedAt:null};s.activeSince=null;s.activeElapsedMs=0;localStorage.setItem(STATE_KEY,JSON.stringify(s));scheduleRoomPush(s);return row};

(function(){const st=document.createElement('style');st.textContent='.m153-bulk{margin:12px 0;border-color:#93c5fd}.m153-bulk textarea{width:100%;margin:9px 0;padding:10px;border:1px solid #cbd5e1;border-radius:10px;resize:vertical;font:inherit}.m153-bulk .btn{width:100%}';document.head.appendChild(st)})();
const _renderM153Base=render;render=function(){const out=_renderM153Base();document.querySelectorAll('.c1-version').forEach(x=>x.textContent=x.textContent.includes('BUILD')?'BUILD '+M153_VERSION:M153_VERSION);document.title='THƯƠNG TRƯỜNG — '+M153_VERSION+' Multiplayer';return out};
document.querySelectorAll('.c1-version').forEach(x=>x.textContent=x.textContent.includes('BUILD')?'BUILD '+M153_VERSION:M153_VERSION);
document.title='THƯƠNG TRƯỜNG — '+M153_VERSION+' Multiplayer';

/* M1.5.4b — Host keeps lifetime loan history until a fresh game reset. */
hostBankOverviewV476=function(s){
  if(!s.bank?.enabled)return'';
  const rows=Object.entries(s.players||{}).map(([name,p])=>({name,loan:normalizeBankLoanV475(p,s)})).filter(x=>Number(x.loan.totalBorrowed)>0).sort((a,b)=>Number(b.loan.balance)-Number(a.loan.balance)||Number(b.loan.totalBorrowed)-Number(a.loan.totalBorrowed));
  const owing=rows.filter(x=>Number(x.loan.balance)>0).length;
  return`<div class="card host-bank-overview-v476 c15-host-bank"><div class="split"><div><div class="title">🏦 Theo dõi vay nợ Ngân hàng Cơ</div><div class="muted tiny">Giữ lịch sử mọi người đã từng vay đến khi reset/tạo ván mới.</div></div><span class="badge">${owing} ĐANG NỢ · ${rows.length} ĐÃ TỪNG VAY</span></div>${rows.length?`<div class="c15-host-bank-list">${rows.map(x=>`<section class="c15-host-bank-player"><div class="c15-bank-player-head"><b>${esc(x.name)}</b><span>${Number(x.loan.balance)>0?bankModeLabelV475(x.loan.mode):'✅ ĐÃ TRẢ HẾT'}</span></div><div class="c15-bank-stat-grid"><div><small>TỔNG ĐÃ VAY</small><strong>${c1Money(x.loan.totalBorrowed)}</strong></div><div><small>DƯ NỢ HIỆN TẠI</small><strong>${c1Money(x.loan.balance)}</strong></div><div><small>LÃI ĐÃ CỘNG</small><strong>${c1Money(x.loan.totalInterestAccrued)}</strong></div><div><small>ĐÃ THANH TOÁN</small><strong>${c1Money(x.loan.totalPaid)}</strong></div></div></section>`).join('')}</div>`:'<div class="footer-note">Chưa có người chơi nào từng vay trong ván này.</div>'}</div>`
};

/* M1.5.4 branch rule: outside-strength changes price only. Quantity and
   production cadence are identical to the player's strength branch. */
const _branchPurchaseCardM154Base=branchPurchaseCard;
branchPurchaseCard=function(name,s){const html=_branchPurchaseCardM154Base(name,s);if(!html)return html;const box=document.createElement('div');box.innerHTML=html,card=box.firstElementChild,label=m11BranchPeriodLabel(m11BranchPeriod(s));card?.querySelectorAll('.branch-chip').forEach(chip=>{chip.innerHTML=chip.innerHTML.replace(/Giá mua ×3 · \+2 đơn vị\/[^<]*\/chi nhánh/g,`Giá mua ×3 · +1 đơn vị/${label}/chi nhánh`).replace(/\+2 đơn vị\/[^<]*mỗi cụm 3/g,`Giá mua ×3 · +1 đơn vị/${label}/nhánh`);if(!chip.querySelector('.m154-cycle-label'))chip.insertAdjacentHTML('beforeend',`<div class="m154-cycle-label">⏱ Chu kỳ hiện hành: <b>${label}</b> · +1/nhánh</div>`)});const hint=card?.querySelector('#branchBuyHint');hint?.insertAdjacentHTML('afterend',`<div class="tiny m154-branch-rule">Ngoài thế mạnh được mua từng chi nhánh với <b>đơn giá gấp 3</b>; mỗi chi nhánh vẫn sinh +1 tài nguyên sau ${label}.</div>`);return card?.outerHTML||html};
const _assetGroupsHtmlM154Base=assetGroupsHtmlV44;
assetGroupsHtmlV44=function(name,s){const html=_assetGroupsHtmlM154Base(name,s),box=document.createElement('div');box.innerHTML=html,label=m11BranchPeriodLabel(m11BranchPeriod(s));box.querySelectorAll('.branch-assets .res').forEach(card=>{if(!card.querySelector('.m154-cycle-label'))card.insertAdjacentHTML('beforeend',`<div class="m154-cycle-label">+1/nhánh mỗi ${label}</div>`)});return box.innerHTML};
const _bindBranchUIM154Base=bindBranchUI;
bindBranchUI=function(name){const out=_bindBranchUIM154Base(name),buy=document.getElementById('buyBranch'),qty=document.getElementById('branchQty');if(!buy||!qty)return out;qty.min='1';qty.step='1';const old=buy.onclick;buy.onclick=e=>{buy.disabled=true;try{return old?.call(buy,e)}finally{setTimeout(()=>{const b=document.getElementById('buyBranch');if(b)b.disabled=false},350)}};return out};

(function(){const st=document.createElement('style');st.textContent='.m154-cycle-label{margin-top:5px;color:#5b21b6;font-size:10px;font-weight:800}.m154-branch-rule{margin-top:6px;padding:7px;border-radius:8px;background:#faf5ff;color:#5b21b6}';document.head.appendChild(st)})();

/* Final branch binder: one server transaction per purchase. Realtime only wakes
   other screens; it never carries the financial mutation itself. */
let M154_BRANCH_BUY_BUSY=false;
const _bindBranchUIM154AtomicBase=bindBranchUI;
bindBranchUI=function(name){const out=_bindBranchUIM154AtomicBase(name),buy=document.getElementById('buyBranch'),res=document.getElementById('branchRes'),qty=document.getElementById('branchQty');if(!buy||!res||!qty||!ROOM?.id||!SB)return out;qty.min='1';qty.step='1';buy.onclick=async()=>{if(M154_BRANCH_BUY_BUSY)return;const s=load(),p=s.players?.[name],q=Math.floor(Number(qty.value)||0);if(!p||!RES[res.value]||q<=0)return;M154_BRANCH_BUY_BUSY=true;buy.disabled=true;buy.textContent='ĐANG MUA...';try{const request={roomId:ROOM.id,resource:res.value,quantity:q,memberToken:accessIsAdmin()?null:currentMemberToken(),adminToken:accessIsAdmin()?ADMIN_TOKEN:null,adminPlayerName:accessIsAdmin()?name:null},{data,error}=await SB.rpc('m154_buy_branch',{p_request:request});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row?.ok)throw new Error('Không ghi nhận được giao dịch mua chi nhánh.');const accepted=await m154AcceptServerRow(row,'branch_bought',false);if(!accepted)return;writeBranchReceiptV476(name,row.state,{res:res.value,qty:q,cost:Math.max(0,(Number(s.players[name].money)||0)-(Number(row.state.players?.[name]?.money)||0))});render();c1Toast(row.message||'Mua chi nhánh thành công.','buy')}catch(e){const m=String(e?.message||e);c1Toast(/CASH_NOT_ENOUGH/.test(m)?'Tiền vừa thay đổi và không còn đủ để mua.':/BRANCH_MARKET_CLOSED/.test(m)?'Thị trường chi nhánh vừa đóng hoặc không đúng P.':/Could not find|PGRST202|schema cache/i.test(m)?'Server chưa có bản SQL M1.5.4. Hãy chạy file SQL cập nhật rồi thử lại.':m,'sell')}finally{M154_BRANCH_BUY_BUSY=false;const b=document.getElementById('buyBranch');if(b){b.disabled=false;b.textContent='MUA CHI NHÁNH'}}};return out};

/* M1.5.4c — P3 expiry and Host navigation use authoritative, priority paths.
   The screen changes immediately; Supabase CAS then serializes the change. */
let M154_HOST_PRIORITY_BUSY=false,M154_AUCTION_FINALIZE_BUSY=false;
function m154PreparePhaseNoPublish(s,ph){
  // changePhase() calls save(), which exposes the new phase before the Host
  // transaction commits. Prepare the same payload without writing local state.
  s.phase=ph;s.timer.autoPassed=s.timer.autoPassed||{};
  const th=AUTO_PHASE_THRESHOLDS[ph],rem=remainingTime(s);
  if(th!==undefined)s.timer.autoPassed[ph]=rem<=th;
  logPush(s,`Host chuyển sang ${PHASES[ph].name}.`)
}
function m154InstallLocalState(s){
  localStorage.setItem(STATE_KEY,JSON.stringify(s));
  render()
}
async function m154PushHostPriorityState(local,base,expected,reason){
  if(!ROOM?.id||!SB||!ADMIN_TOKEN)throw new Error('HOST_ROOM_REQUIRED');
  let state=deep(local),ancestor=deep(base),revision=Number(expected)||0;
  for(let attempt=0;attempt<12;attempt++){
    const {data,error}=await SB.rpc('update_game_room_state_secure',{
      p_room_id:ROOM.id,p_expected_revision:revision,p_state:state,
      p_member_token:null,p_admin_token:ADMIN_TOKEN
    });
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    if(!row)throw new Error('ROOM_STATE_EMPTY');
    ROOM.revision=Number(row.revision)||ROOM.revision;
    ROOM.status=row.status||ROOM.status;storeRoom(ROOM);
    if(row.ok){
      const committed=row.state||state;
      M154_HIGHEST_REVISION=Math.max(m154RevisionFloor(),ROOM.revision);
      ROOM_BASE_STATE_V47=deep(committed);
      localStorage.setItem(STATE_KEY,JSON.stringify(committed));
      setRoomStatus('live');
      broadcastRoomSignal('state_changed',{reason,revision:ROOM.revision}).catch(()=>{});
      return committed
    }
    if(!row.state)throw new Error('ROOM_STATE_CONFLICT');
    if(String(row.state.phase||'')!==String(ancestor.phase||'')
      ||Number(row.state.round||0)!==Number(ancestor.round||0)
      ||Number(row.state.marketIndex??row.state.market??0)!==Number(ancestor.marketIndex??ancestor.market??0))
      throw new Error('HOST_STATE_SCOPE_CHANGED');
    state=rebaseHostStateV481(ancestor,state,row.state);
    ancestor=deep(row.state);revision=Number(row.revision)||revision
  }
  throw new Error('ROOM_STATE_BUSY')
}
async function m156CloseP4HostFinal(round){
  if(!ROOM?.id||!SB||!ADMIN_TOKEN)throw new Error('HOST_ROOM_REQUIRED');
  let last=null;
  for(let attempt=0;attempt<5;attempt++){
    try{
      const {data,error}=await SB.rpc('m156_close_p4_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_round:Number(round)||1});
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      if(!row?.ok)throw new Error('P4_CLOSE_NOT_CONFIRMED');
      await m154AcceptServerRow(row,'m156_p4_closed');
      return row
    }catch(e){last=e;if(attempt<4)await m156Sleep(120+attempt*180+Math.floor(Math.random()*180))}
  }
  throw last||new Error('P4_CLOSE_FAILED')
}

async function m154RunHostPhaseTransition(ph,autoRun=false,control=false){
  if(M154_HOST_PRIORITY_BUSY||V481_PHASE_SWITCH_BUSY||V481_FLOW_SWITCH_BUSY||V481_AUCTION_START_BUSY||V481_AUCTION_FINISH_BUSY)return false;
  let s=load(),before=s.phase;
  /* Never enter P6 with unfinished P4 escrow/negotiation cleanup. If P4->P5
     committed but the cleanup response was interrupted, this preflight repairs it. */
  if(before==='P5'&&ph==='P6'&&Number(s.m156P4ClosedRound)!==Number(s.round)){
    await m156CloseP4HostFinal(s.round);
    s=load();before=s.phase;
    if(before!=='P5')return false
  }
  const bi=phaseIndexV481(before),ti=phaseIndexV481(ph),closingP4=before==='P4'&&ph==='P5';
  if(before===ph)return false;
  if(control){
    if(s.flowMode!=='control'){alert('AUTO đang bật. Hãy chuyển sang CONTROL để đổi P thủ công.');return false}
    if(s.specialAuction?.active){alert('Phiên đấu giá đang chạy. Hãy kết thúc đấu giá trước khi đổi P.');return false}
    if(bi<0||ti<0)return false;
    if(ti>bi+1){alert(`Hãy chuyển lần lượt qua ${V481_PHASE_ORDER[bi+1]} để không bỏ qua bước xử lý.`);return false}
    if(before==='P6'&&ph==='P7'){await finalizeP6V480(false);return true}
  }
  M154_HOST_PRIORITY_BUSY=V481_PHASE_SWITCH_BUSY=true;
  const base=deep(ROOM_BASE_STATE_V47||s),expected=Number(ROOM?.revision)||0;
  try{
    if(control)c11CapturePhaseCheckpoint(s,ph);
    m154PreparePhaseNoPublish(s,ph);
    setPhaseTimerV480(s,ph,control?ph!=='P7':!!autoRun&&ph!=='P7');
    if(autoRun)ensureRealtimeRunningV481(s);
    logPush(s,control?`↔ CONTROL ${before} → ${ph}. Dữ liệu giao dịch và kết quả được giữ nguyên.`:`🤖 ${before} → ${ph}${autoRun?' tự động':''}.`);
    clearTimeout(ROOM_PUSH_TIMER);ROOM_QUEUED_STATE=null;
    /* Keep the published phase authoritative. An in-flight older room fetch
       may finish while this Host RPC is pending; exposing ph before commit
       would make that valid old response appear as a phase rollback. */
    let committed=await m154PushHostPriorityState(s,base,expected,control?`m154_control_phase_${ph}`:`m154_auto_phase_${ph}`);
    m154InstallLocalState(committed);
    if(closingP4){
      /* P4 cleanup is part of the transition's success contract. A transient
         network/lock failure is retried; P5->P6 is blocked until the marker exists. */
      const row=await m156CloseP4HostFinal(Number(committed.round)||Number(s.round)||1);
      committed=row.state||committed;
      m154InstallLocalState(committed)
    }
    if(ph==='P3'&&committed.flowMode==='auto')await startAutoP3AuctionV480();
    if(ph==='P6')await ensureProcurementOpenV480();
    return true
  }catch(e){
    await m153FetchRoomCoalesced().catch(()=>{});render();throw e
  }finally{M154_HOST_PRIORITY_BUSY=V481_PHASE_SWITCH_BUSY=false}
}

controlPhaseChangeV481=function(ph){return m154RunHostPhaseTransition(ph,false,true)};
enterPhaseV480=function(ph,autoRun=false){return m154RunHostPhaseTransition(ph,autoRun,false)};

/* Do not infer completion from a stale browser snapshot. At 00:00 every client
   may ask the database to finish; the row lock makes the operation exactly-once. */
finishPsAuctionV45=async function(force=false){
  if(M154_AUCTION_FINALIZE_BUSY||!ROOM?.id||!SB)return false;
  M154_AUCTION_FINALIZE_BUSY=V481_AUCTION_FINISH_BUSY=AUCTION_FINISHING=true;
  const hadProperty=!!AUCTION_SNAPSHOT?.lots?.some(l=>l.kind==='property');
  try{
    const admin=accessIsAdmin(),rpc=force&&admin?'finish_market_auction_admin':'finish_market_auction_if_due';
    const args=force&&admin
      ?{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id}
      :{p_room_id:ROOM.id,p_member_token:admin?null:currentMemberToken(),p_admin_token:admin?ADMIN_TOKEN:null};
    const {data,error}=await SB.rpc(rpc,args);
    if(error)throw error;
    AUCTION_SNAPSHOT=null;
    await m153FetchRoomCoalesced();
    await fetchAuctionSnapshotV45().catch(()=>{});
    broadcastRoomSignal('state_changed',{reason:'m154_p3_auction_finished'}).catch(()=>{});
    broadcastRoomSignal('market_auction_changed',{reason:'m154_p3_auction_finished'}).catch(()=>{});
    if(hadProperty&&session?.role==='host')await c1SettlePropertyAuction();
    render();return !!data?.ok
  }catch(e){
    const message=String(e?.message||e);
    if(/NO_ACTIVE_AUCTION|AUCTION_CLOSED/i.test(message)){
      AUCTION_SNAPSHOT=null;
      await m153FetchRoomCoalesced().catch(()=>{});
      await fetchAuctionSnapshotV45().catch(()=>{});
      render();return true
    }
    if(force)alert('Không kết thúc được đấu giá: '+message);
    else console.warn('P3 auction finalize',e);
    return false
  }finally{M154_AUCTION_FINALIZE_BUSY=V481_AUCTION_FINISH_BUSY=AUCTION_FINISHING=false}
};

const _bindAuctionStageM154FinalBase=bindAuctionStageV45;
bindAuctionStageV45=function(){
  const out=_bindAuctionStageM154FinalBase();
  if(AUCTION_POLL)clearInterval(AUCTION_POLL);
  const count=Object.keys(load()?.players||{}).length,ms=count>7?1250:count>5?1000:750;
  AUCTION_POLL=setInterval(()=>{
    if(document.visibilityState!=='visible')return;
    const snap=AUCTION_SNAPSHOT;
    if(!snap)return m153AuctionRefresh(0);
    const seconds=m1AuctionSeconds(snap),el=document.getElementById('psTimerV45');
    if(el)el.textContent=fmtTime(seconds);
    if(!snap.paused&&!m12AuctionIsClosed(snap)&&seconds<=0)finishPsAuctionV45(false).catch(()=>{});
    else m153AuctionRefresh(0)
  },ms);
  return out
};

/* Revision fence: an older RPC/fetch response may arrive after a newer Host
   transition. It may never replace the visible state or lower ROOM.revision. */
let M154_REVISION_ROOM=ROOM?.id||null,M154_HIGHEST_REVISION=Number(ROOM?.revision)||0;
function m154RevisionFloor(){
  const id=ROOM?.id||null;
  if(id!==M154_REVISION_ROOM){M154_REVISION_ROOM=id;M154_HIGHEST_REVISION=Number(ROOM?.revision)||0}
  else M154_HIGHEST_REVISION=Math.max(M154_HIGHEST_REVISION,Number(ROOM?.revision)||0);
  return M154_HIGHEST_REVISION
}
const _applyRemoteStateM154Fence=applyRemoteState;
applyRemoteState=function(st,revision){
  const incoming=Number(revision)||0,floor=m154RevisionFloor();
  if(incoming&&incoming<floor){
    if(ROOM){ROOM.revision=floor;storeRoom(ROOM)}
    return false
  }
  M154_HIGHEST_REVISION=Math.max(floor,incoming);
  return _applyRemoteStateM154Fence(st,revision)
};
async function m154AcceptServerRow(row,reason,doRender=true){
  if(!row?.state)throw new Error('ROOM_STATE_EMPTY');
  const revision=Number(row.revision)||0,floor=m154RevisionFloor();
  if(revision<floor){
    await m153FetchRoomCoalesced().catch(()=>{});
    return false
  }
  M154_HIGHEST_REVISION=Math.max(floor,revision);
  ROOM.revision=revision;ROOM.status=row.status||ROOM.status;storeRoom(ROOM);
  ROOM_BASE_STATE_V47=deep(row.state);
  localStorage.setItem(STATE_KEY,JSON.stringify(row.state));
  setRoomStatus('live');
  broadcastRoomSignal('state_changed',{reason,revision}).catch(()=>{});
  if(doRender)render();
  return true
}

/* Investment/property actions already use locked RPCs. This final dispatcher
   adds the revision fence so a late response cannot resurrect an old card. */
const _c1CommitActionM154Base=c1CommitAction;
c1CommitAction=async function(actor,action){
  if(!ROOM?.id||!SB)return _c1CommitActionM154Base(actor,action);
  if(C1_ACTION_BUSY)return false;
  C1_ACTION_BUSY=true;
  try{
    const request={roomId:ROOM.id,action,memberToken:accessIsAdmin()?null:currentMemberToken(),adminToken:accessIsAdmin()?ADMIN_TOKEN:null,adminPlayerName:accessIsAdmin()?actor:null};
    let result;
    if(['buy_property','sell_property'].includes(action?.kind))result=await SB.rpc('c17_apply_property_market_action',{p_request:request});
    else if(['offer','cancel'].includes(action?.kind))result=await SB.rpc('c14_apply_trade_action',{p_request:request});
    else result=await SB.rpc('c11_apply_economy_action',{p_request:request});
    if(result.error)throw result.error;
    const row=Array.isArray(result.data)?result.data[0]:result.data;
    if(!row?.ok)throw new Error(row?.message||'Không cập nhật được giao dịch.');
    const accepted=await m154AcceptServerRow(row,'m154_economy_action');
    if(accepted)c1Toast(row.message||'Giao dịch đã được ghi nhận.',row.tone||'info');
    return accepted
  }catch(e){c1Toast(c14VietnameseError(e),'sell');return false}
  finally{C1_ACTION_BUSY=false}
};

/* Resource proposals, counters and decisions share one server row lock. First
   valid arrival wins; all later decisions read the terminal state and fail. */
const M154_RESOURCE_TRADE_BUSY=new Set();
function m154ResourceTradeAuth(name,action){return{roomId:ROOM.id,action,memberToken:accessIsAdmin()?null:currentMemberToken(),adminToken:accessIsAdmin()?ADMIN_TOKEN:null,adminPlayerName:accessIsAdmin()?name:null}}
function m154TradeButtons(id,disabled,label='ĐANG XỬ LÝ...'){
  const card=document.querySelector(`[data-trade-id="${CSS.escape(String(id))}"]`);
  card?.querySelectorAll('button').forEach(b=>{b.disabled=disabled;if(disabled&&!b.dataset.m154Text){b.dataset.m154Text=b.textContent;b.textContent=label}else if(!disabled&&b.dataset.m154Text){b.textContent=b.dataset.m154Text;delete b.dataset.m154Text}})
}
async function m154CommitResourceTrade(name,action){
  const key=String(action.tradeId||'new');if(M154_RESOURCE_TRADE_BUSY.has(key))return false;
  M154_RESOURCE_TRADE_BUSY.add(key);if(action.tradeId)m154TradeButtons(action.tradeId,true);
  try{
    const {data,error}=await SB.rpc('m154_apply_resource_trade_action',{p_request:m154ResourceTradeAuth(name,action)});
    if(error)throw error;const row=Array.isArray(data)?data[0]:data;
    if(!row?.ok)throw new Error(row?.message||'Không cập nhật được giao dịch.');
    const accepted=await m154AcceptServerRow(row,'m154_resource_trade');
    if(accepted)c1Toast(row.message||'Đã cập nhật giao dịch.',row.tone||'info');
    return accepted
  }catch(e){
    const raw=String(e?.message||e),friendly=/OFFER_NOT_PENDING/.test(raw)?'Giao dịch đã được người khác xử lý trước; đang tải trạng thái mới.':/TRADE_PHASE_CLOSED|GAME_ACTION_LOCKED/.test(raw)?'Host đã chuyển P hoặc khóa thời gian; thao tác cũ không được ghi.':c14VietnameseError(e);
    c1Toast(friendly,'sell');await m153FetchRoomCoalesced().catch(()=>{});return false
  }finally{M154_RESOURCE_TRADE_BUSY.delete(key);if(action.tradeId)m154TradeButtons(action.tradeId,false)}
}

const _sendTradeOfferM154Base=sendTradeOffer;
sendTradeOffer=async function(name){
  if(!ROOM?.id||!SB)return _sendTradeOfferM154Base(name);
  if(M154_RESOURCE_TRADE_BUSY.has('offer'))return false;
  const s=load(),d=tradeDraft(name,s),target=d.to==='ALL'?'ALL':String(d.to||''),limit=c14TradeLimitError(s,name,target);
  if(s.phase!=='P4')return c1Toast('Giao dịch tự do diễn ra ở P4.','sell');
  if(limit)return c1Toast(limit,'sell');
  const kind=d.kind,res=d.res,qty=d.qty,price=d.money,message=String(d.message||'').trim(),actor=s.players[name];
  if(kind==='buy'&&actor.money<price)return c1Toast('Bạn không đủ tiền cho đề nghị mua này.','sell');
  if(kind==='sell'&&(Number(actor.res?.[res])||0)<qty)return c1Toast('Bạn không đủ tài nguyên để bán.','sell');
  persistTradeDraft(name);
  const verb=kind==='buy'?'MUA':'BÁN',ok=await uiConfirmV46({title:`XÁC NHẬN GỬI ${verb}`,tone:kind==='buy'?'buy':'sell',rows:[['Tài nguyên',`${RES[res].icon} ${RES[res].label} ×${qty}`],['Đối tác',target==='ALL'?'TẤT CẢ':target],['Tổng giá',c1Money(price)]],message:kind==='sell'?(message?message+'\n\n':'')+'Tài nguyên được giữ riêng ngay khi gửi và tự hoàn lại nếu giao dịch không thành.':message,confirmText:`GỬI ${verb}`});
  if(!ok)return false;
  const request=m154ResourceTradeAuth(name,{kind:'offer_resource',direction:kind,target,res,qty,price,message});
  M154_RESOURCE_TRADE_BUSY.add('offer');
  try{
    const {data,error}=await SB.rpc('c14_apply_trade_action',{p_request:request});if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;if(!row?.ok)throw new Error(row?.message||'Không gửi được giao dịch.');
    const accepted=await m154AcceptServerRow(row,'m154_resource_offer');if(accepted)c1Toast(row.message||'Đã gửi giao dịch.',row.tone||kind);return accepted
  }catch(e){c1Toast(c14VietnameseError(e),'sell');await m153FetchRoomCoalesced().catch(()=>{});return false}
  finally{M154_RESOURCE_TRADE_BUSY.delete('offer')}
};
acceptTrade=function(name,id){return m154CommitResourceTrade(name,{kind:'accept',tradeId:Number(id)})};
declineTrade=function(name,id){return m154CommitResourceTrade(name,{kind:'decline',tradeId:Number(id)})};
sendCounterOffer=async function(name,id,newPrice,message=''){
  const s=load(),t=(s.trades||[]).find(x=>Number(x.id)===Number(id)),price=Number(newPrice);
  if(s.phase!=='P4')return c1Toast('Thương lượng tự do diễn ra ở P4.','sell');
  if(!Number.isFinite(price)||price<0)return c1Toast('Giá thương lượng không hợp lệ.','sell');
  if(!canRespondToTrade(name,t))return m153FetchRoomCoalesced();
  const parties=tradeParties(t,name),other=name===parties.buyer?parties.seller:parties.buyer;
  const ok=await uiConfirmV46({title:'GỬI PHẢN HỒI THƯƠNG LƯỢNG?',rows:[['Giá mới',c1Money(price)],['Gửi đến',other||'?']],message:String(message||'').trim(),confirmText:'GỬI GIÁ MỚI'});
  if(!ok)return false;
  return m154CommitResourceTrade(name,{kind:'counter',tradeId:Number(id),price,message:String(message||'').trim()})
};

/* One owned promotion code may enhance every project won in the same market.
   It becomes used after all winning projects have been paid, not after the first. */
const _settleProjectsCoreM154Promo=settleProjectsCore;
settleProjectsCore=function(s){
  if(s.settledRound===s.round)return false;
  const available=new Map();
  const selectedByPlayer=new Map();
  for(const [name,p] of Object.entries(s.players||{})){
    const codes=new Map((p.promoCodes||[]).filter(c=>c.status==='available').map(c=>[String(c.id),c]));
    available.set(name,codes);
    /* A legacy/in-flight client may have saved the choice on only one project.
       Treat that as the player's single choice for every winning project. */
    const chosen=Object.values(c17PromoRoundMap(p,s)).map(String).find(id=>id&&codes.has(id));
    if(chosen)selectedByPlayer.set(name,chosen)
  }
  const usedByPlayer=new Map();
  for(const r of (s.results||[]).filter(x=>Number(x.round)===Number(s.round)&&x.winner)){
    const pr=projectById(s,r.projectId),p=s.players?.[r.winner];if(!pr||!p||p.bankrupt||!enough(p,pr.need))continue;
    for(const[k,v]of Object.entries(pr.need))p.res[k]-=v;
    const choice=selectedByPlayer.get(r.winner)||String(c17PromoRoundMap(p,s)[r.projectId]||''),base=resultBasePayoutV475(r,s),code=available.get(r.winner)?.get(choice),pct=Math.max(0,Number(code?.percent)||0),paid=Math.round(base*(1+pct/100)),bonus=Math.max(0,paid-base);
    p.money=roundMoneyV475((Number(p.money)||0)+paid);Object.assign(r,{payout:base,paidAmount:paid,promoPercent:pct,promoCode:code?.id||null,promoBonus:bonus});
    if(code){if(!usedByPlayer.has(r.winner))usedByPlayer.set(r.winner,new Map());const rec=usedByPlayer.get(r.winner).get(String(code.id))||{code,projects:[]};rec.projects.push(pr.id);usedByPlayer.get(r.winner).set(String(code.id),rec);logPush(s,`🎟️ ${r.winner} dùng ${code.id} cho ${pr.id}: ${base}M + ${bonus}M = ${paid}M.`)}
    p.wins=p.wins||[];p.wins.push({round:s.round,projectId:r.projectId,reward:paid,bid:Number(r.bid)||0,payoutBase:base,competitive:!!r.competitive,promoPercent:pct,promoCode:code?.id||null,promoBonus:bonus});p.promoSelectedId=null
  }
  for(const [name,codes] of usedByPlayer)for(const rec of codes.values()){rec.code.status='used';rec.code.usedRound=s.round;rec.code.usedProjectIds=rec.projects;rec.code.usedProjectId=rec.projects[0]||null;rec.code.usedAt=Date.now();logPush(s,`✅ ${name}: mã ${rec.code.id} đã áp dụng cho ${rec.projects.length} dự án thắng.`)}
  applyPhaseInterestV475(s,'P6','P7');s.settledRound=s.round;s.phase='P7';if(c1ApplyDividends(s))logPush(s,'📊 C1 đã chia cổ tức dự án theo tỷ lệ cổ phiếu; tiền được trừ từ doanh nghiệp trúng thầu.');logPush(s,`Đã thanh toán Thị trường ${s.round}: một mã có thể áp dụng cho mọi dự án người chơi thắng.`);return true
};

const _m1PromoChoiceStatusM154Multi=m1PromoChoiceStatus;
m1PromoChoiceStatus=function(s,r){
  const p=s.players?.[r.winner],codes=m1AvailablePromoCodes(p);if(!codes.length)return _m1PromoChoiceStatusM154Multi(s,r);
  const map=c17PromoRoundMap(p||{},s),chosen=Object.values(map).map(String).find(id=>id&&codes.some(c=>String(c.id)===id));
  if(chosen){const code=codes.find(c=>String(c.id)===chosen);return{kind:'selected',label:`Đã thêm mã +${Number(code.percent)||0}% cho mọi dự án thắng`,percent:Number(code.percent)||0,code}}
  return _m1PromoChoiceStatusM154Multi(s,r)
};

const _c17PromoCardM154Multi=c17PromoCard;
c17PromoCard=function(name,s){return _c17PromoCardM154Multi(name,s).replace('Chỉ các dự án bạn đã thắng mới xuất hiện. Xác nhận một mã hoặc bấm “Không sử dụng”; mỗi mã chỉ dùng cho một dự án.','Chọn một lần: mã đã xác nhận sẽ áp dụng cho tất cả dự án bạn thắng trong thị trường này. “Không sử dụng” cũng xác nhận cho toàn bộ dự án.')};
const _c17BindPromoM154Multi=c17BindPromo;
c17BindPromo=function(name){
  _c17BindPromoM154Multi(name);
  document.querySelectorAll('.m1PromoPick').forEach(btn=>{btn.disabled=false;btn.onclick=()=>{const root=btn.closest('[data-c17-promo-project]'),pid=String(btn.dataset.project||''),code=String(btn.dataset.code||'');root?.querySelectorAll('.m1PromoPick').forEach(x=>x.classList.toggle('selected',x===btn));try{sessionStorage.setItem(c17PromoDraftKey(name,load(),pid),code)}catch(e){}const confirm=root?.querySelector('.c17ConfirmPromo');if(confirm){confirm.dataset.value=code;confirm.disabled=false}m13UpdatePromoPreview(root,name,pid,code)}});
  const applyAll=(btn,value)=>{const s=load(),p=s.players?.[name],wins=m1WinningProjectRows(s).filter(r=>r.winner===name).map(r=>String(r.projectId));if(!p||!m1PromoSettlementReady(s)||!wins.length)return;const chosen=String(value||''),code=chosen?(p.promoCodes||[]).find(c=>c.status==='available'&&String(c.id)===chosen):null;if(chosen&&!code){c1Toast('Mã đã chọn không còn khả dụng. Hãy chọn lại.','sell');return}const map=c17PromoRoundMap(p,s,true);for(const pid of wins){map[pid]=code?String(code.id):'';try{sessionStorage.removeItem(c17PromoDraftKey(name,s,pid))}catch(e){}}save(s);broadcastRoomSignal('state_changed',{reason:code?'P6_promo_applied_all':'P6_promo_skipped_all',player:name,projects:wins}).catch(()=>{});render();c1Toast(code?`Đã áp dụng ${code.id} cho ${wins.length} dự án thắng.`:`Đã xác nhận không dùng mã cho ${wins.length} dự án thắng.`,'buy')};
  document.querySelectorAll('.c17ConfirmPromo').forEach(btn=>btn.onclick=()=>applyAll(btn,String(btn.dataset.value||c17PromoDraft(name,load(),btn.dataset.project)||'')));
  document.querySelectorAll('.m1SkipPromo').forEach(btn=>btn.onclick=()=>applyAll(btn,''))
};

/* M1.5.4d — outside-strength branches cost 3x but produce exactly like a
   strength branch: one resource per branch on every Host-defined cycle. */
const _normalizeStateM154UniformBranch=normalizeState;
normalizeState=function(s){
  s=_normalizeStateM154UniformBranch(s);
  for(const p of Object.values(s.players||{}))for(const b of p.branches||[]){
    if(!Number.isFinite(Number(b.produced)))b.produced=0
  }
  return s
};

const _processRealtimeEconomyM154UniformBranch=processRealtimeEconomy;
processRealtimeEconomy=function(s,now=Date.now()){
  /* Suppress every older branch producer while retaining price bumps,
     investment capacity refreshes and the rest of the realtime economy. */
  const held=new Map();for(const p of Object.values(s?.players||{})){held.set(p,p.branches);p.branches=[]}
  let changed=false;try{changed=!!_processRealtimeEconomyM154UniformBranch(s,now)}finally{for(const[p,branches]of held)p.branches=branches}
  if(!s||s.gameOver||!s.realtimeClock?.running)return changed;
  const activeNow=activeElapsedMsNow(s,now),period=m11BranchPeriod(s)*1000;
  for(const[name,p]of Object.entries(s.players||{}))for(const b of p.branches||[]){
    const count=Math.max(0,Number(b.count)||0);if(count<=0)continue;
    /* Existing outside-strength branches start the new cadence from the first
       authoritative tick, preventing an accidental retroactive payout. */
    if(b.res!==p.businessId&&b.productionRule!=='uniform-v154'){
      b.productionRule='uniform-v154';b.boughtAtActiveMs=activeNow;b.cyclesCredited=0;changed=true;continue
    }
    if(!b.productionRule)b.productionRule='uniform-v154';
    const bought=Math.max(0,Number(b.boughtAtActiveMs)||0),cycles=Math.floor(Math.max(0,activeNow-bought)/period),credited=Math.max(0,Number(b.cyclesCredited)||0);
    if(cycles<=credited)continue;
    const planned=(cycles-credited)*count,free=s.investments?.enabled?c1Capacity(p).free:planned,add=Math.max(0,Math.min(planned,free));
    if(add>0){p.res[b.res]=(Number(p.res[b.res])||0)+add;b.produced=Math.max(0,Number(b.produced)||0)+add;logPush(s,`🏭 Chi nhánh của ${name} tạo +${add} ${RES[b.res]?.icon||''} ${RES[b.res]?.label||b.res} theo chu kỳ ${m11BranchPeriodLabel(period/1000)}.`);changed=true}
    if(add<planned){p.capacityBlocked=true;logPush(s,`🏙️ Chi nhánh của ${name} dừng ${planned-add} đơn vị vượt sức chứa bất động sản.`)}
    b.cyclesCredited=cycles
  }
  return changed
};

const _branchMarketHostCardM154Uniform=branchMarketHostCard;
branchMarketHostCard=function(s){
  return _branchMarketHostCardM154Uniform(s)
    .replace('Đúng thế mạnh: mỗi chu kỳ · ngoài thế mạnh: mỗi 3 chu kỳ.','Mọi chi nhánh sản xuất mỗi chu kỳ; ngoài thế mạnh chỉ khác ở đơn giá gấp 3.')
    .replace(/Nhánh ngoài thế mạnh: mỗi cụm 3 tạo \+2 đơn vị sau 3 chu kỳ\./g,'Nhánh ngoài thế mạnh: giá mua gấp 3, sản lượng vẫn +1 đơn vị/nhánh mỗi chu kỳ.')
};
const _m11BranchNoticeM154Uniform=m11BranchNotice;
m11BranchNotice=function(name,s){return _m11BranchNoticeM154Uniform(name,s).replace('Chi nhánh đúng thế mạnh sản xuất mỗi chu kỳ; chi nhánh ngoài thế mạnh sản xuất sau 3 chu kỳ.','Mọi chi nhánh đều sản xuất mỗi chu kỳ; chi nhánh ngoài thế mạnh chỉ có giá mua gấp 3.')};
const _observerBranchesCardM154Uniform=observerBranchesCard;
observerBranchesCard=function(s){return _observerBranchesCardM154Uniform(s).replace(/(×(\d+) · )\+\d+\/3 phút/g,'$1+$2/chu kỳ').replace(/(×(\d+) · )\+\d+\/phút/g,'$1+$2/chu kỳ')};

/* M1.5.4e — a P6 reset creates a new server generation. Old round-1 local
   markers and in-flight requests can never be mistaken for the new round 1. */
function m154P6Generation(s=load()){return Math.max(0,Number(s?.p6AuctionGenerations?.[String(s.round)])||0)}
localAuctionSubmittedKey=function(name,s,pid,bidRound){return`${UI_DRAFT_PREFIX}:auction:${ROOM?.code||'offline'}:${name}:R${s.round}:${pid}:G${m154P6Generation(s)}:B${bidRound}`};
c17ProcurementKey=function(s,pid){return`${ROOM?.id||ROOM?.code||'offline'}:R${s.round}:G${m154P6Generation(s)}:${pid}`};
function m154ClearLocalP6BidFlags(s){
  const prefix=`${UI_DRAFT_PREFIX}:auction:${ROOM?.code||'offline'}:`;for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith(prefix)&&key.includes(`:R${s.round}:`))localStorage.removeItem(key)}
}

let M154_P6_RESET_BUSY=false;
const _c11ResetPhaseM154Generation=c11ResetPhase;
c11ResetPhase=async function(ph){
  if(ph==='P5'){
    if(!ROOM?.id||!SB||!ADMIN_TOKEN)return _c11ResetPhaseM154Generation(ph);
    const current=load(),cp=current.c11PhaseCheckpoints?.items?.P5;
    if(!cp){c1Toast('Chưa có mốc đầu P5 trong thị trường này.','error');return false}
    if(current.phase!=='P5'||current.specialAuction?.active||M154_P6_RESET_BUSY||M154_HOST_PRIORITY_BUSY)return false;
    const confirmed=await uiConfirmV46({title:'RESET P5?',tone:'sell',rows:[['Khôi phục','Đầu P5'],['Thị trường',current.round]],message:'Khôi phục quyết định dự án về mốc đầu P5.',confirmText:'RESET P5'});
    if(!confirmed)return false;
    M154_P6_RESET_BUSY=M154_HOST_PRIORITY_BUSY=V481_PHASE_SWITCH_BUSY=true;
    try{
      const {data,error}=await window.m173WithFreshReset('P5',fresh=>{
        const mark=fresh.c11PhaseCheckpoints?.items?.P5;if(!mark||fresh.specialAuction?.active||fresh.round!==current.round)throw new Error('RESET_BASE_CHANGED');
        const reset=deep(fresh);
        for(const k of ['players','trades','results','p5Auctions','investments','specialAuction','tradeAdviceP2V473'])reset[k]=deep(mark[k]);reset.trades=c11RestoreCheckpointTrades(fresh.c11PhaseCheckpoints,mark);
        reset.settledRound=mark.settledRound;reset.seq=mark.seq;reset.phase='P5';reset.gameOver=false;reset.endedAtRound=null;reset.gameEndedAt=null;
        reset.p5Auctions=reset.p5Auctions||{};reset.p5Auctions[String(reset.round)]={};
        for(const p of V481_PHASE_ORDER)if(phaseIndexV481(p)>phaseIndexV481('P5'))delete reset.c11PhaseCheckpoints.items[p];
        setPhaseTimerV480(reset,'P5',true);logPush(reset,'↩ Host RESET P5 về mốc đầu giai đoạn.');return reset;
      });if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;if(!row?.ok)throw new Error('P5_RESET_FAILED');
      await m154AcceptServerRow(row,'m173_p5_reset');C17_AUCTION_ENSURE_BUSY.clear();C17_AUCTION_ENSURE_DONE.clear();render();c1Toast('Đã reset P5.','info');return true;
    }catch(e){await m153FetchRoomCoalesced().catch(()=>{});render();c1Toast(c14VietnameseError(e),'sell');return false}
    finally{M154_P6_RESET_BUSY=M154_HOST_PRIORITY_BUSY=V481_PHASE_SWITCH_BUSY=false}
  }
  if(ph!=='P6')return _c11ResetPhaseM154Generation(ph);
  if(!ROOM?.id||!SB||!ADMIN_TOKEN)return _c11ResetPhaseM154Generation(ph);
  const current=load(),cp=current.c11PhaseCheckpoints?.items?.P6;
  if(!cp){c1Toast('Chưa có mốc đầu P6 trong thị trường này.','error');return false}
  if(current.specialAuction?.active){c1Toast('Hãy kết thúc phiên đấu giá đang chạy trước khi reset P6.','error');return false}
  if(M154_P6_RESET_BUSY||M154_HOST_PRIORITY_BUSY)return false;
  const confirmed=await uiConfirmV46({title:'RESET P6?',tone:'sell',rows:[['Xóa sạch giá thầu','Vòng 1, 2, 3…'],['Thị trường',current.round]],message:'Tạo một phiên P6 hoàn toàn mới. Mọi giá, dấu đã gửi, vòng hòa và trần giá cũ sẽ bị xóa.',confirmText:'RESET SẠCH P6'});
  if(!confirmed)return false;
  M154_P6_RESET_BUSY=M154_HOST_PRIORITY_BUSY=V481_PHASE_SWITCH_BUSY=true;
  let reset;
  try{
    const {data,error}=await window.m173WithFreshReset('P6',fresh=>{
      const mark=fresh.c11PhaseCheckpoints?.items?.P6;if(!mark||fresh.specialAuction?.active||fresh.round!==current.round)throw new Error('RESET_BASE_CHANGED');
      reset=deep(fresh);
      for(const k of ['players','trades','results','p5Auctions','investments','specialAuction','tradeAdviceP2V473'])reset[k]=deep(mark[k]);reset.trades=c11RestoreCheckpointTrades(fresh.c11PhaseCheckpoints,mark);
      reset.settledRound=mark.settledRound;reset.seq=mark.seq;reset.phase='P6';reset.gameOver=false;reset.endedAtRound=null;reset.gameEndedAt=null;
      reset.p5Auctions=reset.p5Auctions||{};reset.p5Auctions[String(reset.round)]={};reset.results=(reset.results||[]).filter(r=>Number(r.round)!==Number(reset.round));delete reset.m1PromoSettlement;
      reset.p6AuctionGenerations={...(fresh.p6AuctionGenerations||{}),[String(reset.round)]:m154P6Generation(fresh)+1};
      for(const p of V481_PHASE_ORDER)if(phaseIndexV481(p)>phaseIndexV481('P6'))delete reset.c11PhaseCheckpoints.items[p];
      setPhaseTimerV480(reset,'P6',true);logPush(reset,`↩ Host RESET sạch P6 · thế hệ #${reset.p6AuctionGenerations[String(reset.round)]}.`);return reset;
    });if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;if(!row?.ok)throw new Error('P6_RESET_FAILED');
    await m154AcceptServerRow(row,'m154_p6_reset_clean');m154ClearLocalP6BidFlags(row.state||reset);C17_AUCTION_ENSURE_BUSY.clear();C17_AUCTION_ENSURE_DONE.clear();
    await ensureProcurementOpenV480();render();c1Toast('Đã reset sạch P6: toàn bộ lịch sử giá và vòng đấu thầu cũ đã xóa.','info');return true
  }catch(e){await m153FetchRoomCoalesced().catch(()=>{});render();const raw=String(e?.message||e);c1Toast(/PGRST202|Could not find|schema cache/i.test(raw)?'Server chưa có RPC reset sạch P6. Hãy chạy lại SQL M1.5.4.':c14VietnameseError(e),'sell');return false}
  finally{M154_P6_RESET_BUSY=M154_HOST_PRIORITY_BUSY=V481_PHASE_SWITCH_BUSY=false}
};

const M154_PROJECT_BID_BUSY=new Set();
submitSealedBidV475=async function(name,pid){
  let s=load(),p=s.players?.[name];if(!p||s.phase!=='P6'||!ROOM?.id)throw new Error('P6 hoặc phòng chơi chưa sẵn sàng.');
  let a=auctionState(s,pid);if(!a){await c17EnsurePlayerAuction(name,pid);s=load();a=auctionState(s,pid)}
  if(!a||!Array.isArray(a.participants)||!a.participants.includes(name))throw new Error(`Bạn chưa được ghi nhận trong phiên thầu ${pid}. Hãy tải lại trang.`);
  const generation=m154P6Generation(s),busyKey=`${name}:${s.round}:${pid}:${generation}:${a.bidRound}`;if(M154_PROJECT_BID_BUSY.has(busyKey))return false;
  const x=bidInputStateV475(name,pid,s);if(!x.valid){const msg=x.exclusive?`Giá vòng hòa của ${pid} phải từ ${x.min}M đến ${x.max}M, thấp hơn ${x.exclusive}M.`:`Giá chào ${pid} phải từ ${x.min} đến tối đa ${x.max}M và chỉ dùng một chữ số thập phân.`;c1Toast(msg,'sell');x.input?.focus({preventScroll:true});return false}
  const confirmed=await uiConfirmV46({title:'GỬI GIÁ CHÀO KÍN?',rows:[['Dự án',pid],['Đối thủ',(a.participants||[]).filter(n=>n!==name).join(' · ')],['Giá chào',`${x.amount}M`],['Tối đa',`${x.max}M`]],message:'Giá chỉ thuộc đúng phiên P6 đang hiển thị. Nếu Host reset, request cũ tự động bị loại.',confirmText:'GỬI GIÁ CHÀO'});if(!confirmed)return false;
  M154_PROJECT_BID_BUSY.add(busyKey);
  try{
    const token=await c15ValidatePlayerSession(),{data,error}=await SB.rpc('m154_submit_project_bid',{p_request:{roomId:ROOM.id,round:s.round,projectId:pid,bid:x.amount,generation,memberToken:token}});if(error)throw error;
    const row=Array.isArray(data)?data[0]:data,fresh=load();if(!row?.ok)throw new Error('PROJECT_BID_NOT_RECORDED');
    if(Number(row.generation)!==m154P6Generation(fresh)||Number(fresh.round)!==Number(s.round)||fresh.phase!=='P6'){await m153FetchRoomCoalesced();return false}
    const round=Number(row.bid_round)||Number(a.bidRound)||1;setAuctionSubmittedLocal(name,fresh,pid,round,true);writeBidDraftV475(name,pid,'',fresh);render();c1Toast(`Đã ghi nhận giá thầu ${pid} · phiên #${generation}.`,'buy');return true
  }catch(e){
    const raw=String(e?.message||e);if(/P6_RESET_CHANGED|PROJECT_AUCTION_WRONG_PHASE|AUCTION_NOT_OPEN/.test(raw)){C17_AUCTION_ENSURE_BUSY.clear();C17_AUCTION_ENSURE_DONE.clear();await m153FetchRoomCoalesced().catch(()=>{});render();c1Toast('Host vừa reset/chuyển P; giá của phiên cũ không được ghi sang phiên mới. Hãy gửi lại.','info');return false}
    if(/BID_ALREADY_SUBMITTED/.test(raw)){setAuctionSubmittedLocal(name,load(),pid,a.bidRound,true);render();return true}
    if(/PGRST202|Could not find|schema cache/i.test(raw))throw new Error('Server chưa có RPC giá thầu M1.5.4. Hãy chạy lại SQL M1.5.4.');
    throw e
  }finally{M154_PROJECT_BID_BUSY.delete(busyKey)}
};

/* M1.5.4f — desktop player workspace. Keep the personal asset/action rail in
   view without changing DOM ownership or any game event bindings. Narrow
   desktop windows fall back to the established single-column flow. */
const _playerViewM154DesktopBase=playerView;
playerView=function(name){
  const html=_playerViewM154DesktopBase(name),box=document.createElement('div');box.innerHTML=html;
  const app=box.querySelector('.app'),main=app?.querySelector(':scope > .grid.grid-2');
  if(!main||main.children.length<2)return html;
  const personal=main.children[0],content=main.children[1];
  main.classList.add('m154-player-workspace');
  personal.classList.add('m154-player-asset-rail');
  content.classList.add('m154-player-main-content');
  return box.innerHTML
};

(function installM154DesktopPlayerLayout(){
  if(document.getElementById('m154-desktop-player-layout'))return;
  const st=document.createElement('style');st.id='m154-desktop-player-layout';st.textContent=`
    .m154-player-workspace,.m154-player-workspace>*{min-width:0}
    .m154-player-asset-rail .card,.m154-player-asset-rail .asset-groups,
    .m154-player-asset-rail .resources,.m154-player-asset-rail .res{min-width:0;max-width:100%}
    .m154-player-asset-rail .money{max-width:100%;font-size:clamp(27px,3vw,43px);line-height:1.05;overflow-wrap:anywhere}
    .m154-player-asset-rail .resources{grid-template-columns:repeat(auto-fit,minmax(min(100%,128px),1fr))!important}
    .m154-player-asset-rail .res,.m154-player-asset-rail .branch-chip,
    .m154-player-asset-rail .business-asset-note,.m154-player-asset-rail .promo-chip,
    .m154-player-asset-rail td,.m154-player-asset-rail th{overflow-wrap:anywhere;word-break:normal}
    .m154-player-asset-rail input,.m154-player-asset-rail select,
    .m154-player-asset-rail textarea,.m154-player-asset-rail button{max-width:100%;min-width:0}
    .m154-player-asset-rail img,.m154-player-asset-rail svg{max-width:100%;height:auto}
    @media (min-width:1100px){
      .m154-player-workspace{grid-template-columns:minmax(0,1.45fr) minmax(330px,.72fr)!important;align-items:start}
      .m154-player-main-content{grid-column:1;grid-row:1}
      .m154-player-asset-rail{grid-column:2;grid-row:1;position:sticky;top:68px;align-self:start;
        max-height:calc(100vh - 84px);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;
        scrollbar-gutter:stable;scrollbar-width:thin;padding-right:3px}
    }
    @media (min-width:768px) and (max-width:1099px){
      .m154-player-workspace{grid-template-columns:minmax(0,1fr)!important}
      .m154-player-asset-rail{position:static;max-height:none;overflow:visible}
    }
  `;document.head.appendChild(st)
})();

/* ========================================================================== */
/* M1.5.6 — focused P4 workspace, phase guidance and P3 auction receipt.       */
/* ========================================================================== */
const M156_VERSION='M1.6.2';

function m156PhaseGuide(s){
  const rules={
    P1:['Nghiên cứu dự án, nguồn lực và thị trường.','Lập kế hoạch nhu cầu trước khi chọn mục tiêu.','Chưa nhắm dự án, chưa mua chi nhánh, chưa giao dịch.'],
    P2:['Chọn hoặc hủy mục tiêu dự án; mua chi nhánh và quản lý tài sản đầu tư.','Chọn dự án phù hợp rồi chuẩn bị nguồn lực còn thiếu.','Chưa chốt dự án và chưa đấu thầu dự án.'],
    P3:['Tham gia phiên đấu giá thị trường do Host mở.','Theo dõi giá và chỉ mua các combo phục vụ mục tiêu đã chọn.','Không thể thao tác giao dịch khi màn hình đấu giá đang mở.'],
    P4:['Mua, bán, thương lượng tài nguyên và tài sản đầu tư.','Hoàn thiện phần tài nguyên còn thiếu trước P5; thu hồi đề nghị không còn phù hợp.','Không mua thêm chi nhánh và chưa chốt/đấu thầu dự án.'],
    P5:['Chốt từng dự án đã nhắm khi đủ tài nguyên hoặc chủ động từ chối.','Kiểm tra kỹ tài nguyên cho từng dự án trước khi chốt.','Không đổi mục tiêu; dự án thiếu tài nguyên không thể chốt.'],
    P6:['Gửi giá kín cho dự án cạnh tranh và chọn mã khuyến mại cho dự án thắng.','Giá thấp nhất thắng; vòng hòa phải thấp hơn giá hòa trước.','Không dùng dữ liệu của phiên P6 cũ sau khi Host reset.'],
    P7:['Xem kết quả, tiền nhận và tài sản chuyển tiếp.','Đối chiếu dự án, mã khuyến mại và phần thưởng.','Chờ Host mở thị trường tiếp theo hoặc tổng kết ván.']
  },r=rules[s.phase]||['Theo dõi trạng thái hiện tại.','Làm theo hướng dẫn của Host.','Không thao tác ngoài giai đoạn.'];
  return`<div class="m156-phase-guide"><div><b>✅ ĐƯỢC LÀM</b><span>${r[0]}</span></div><div><b>💡 NÊN LÀM</b><span>${r[1]}</span></div><div><b>⛔ KHÔNG ĐƯỢC</b><span>${r[2]}</span></div></div>`
}

function m156AuctionNoticeKey(name,s){
  const a=s.specialAuction||{},id=a.lastAuctionId||a.auctionId||a.id||a.endedAt||'latest';
  return`tt_m156_ps_result:${ROOM?.code||roomInfo()?.code||'offline'}:${name}:R${s.round}:${id}`
}
function m156AuctionResultNotice(name,s){
  const a=s.specialAuction||{},rows=Array.isArray(a.results)?a.results:[];
  if(!['P3','P4'].includes(s.phase)||a.active||!rows.length||sessionStorage.getItem(m156AuctionNoticeKey(name,s))==='1')return'';
  return`<div class="m156-auction-notice" id="m156AuctionNotice"><div class="m156-auction-notice-card" role="dialog" aria-modal="true" aria-labelledby="m156AuctionNoticeTitle"><button type="button" class="m156-auction-close" aria-label="Đóng thông báo">×</button><div class="m156-auction-crown">🏆</div><h2 id="m156AuctionNoticeTitle">KẾT QUẢ ĐẤU GIÁ THỊ TRƯỜNG</h2><p>Phiên đấu giá đã kết thúc. Đây là danh sách người mua và mặt hàng đã nhận.</p><div class="m156-auction-result-list">${rows.map((r,i)=>{const winner=String(r.winner||'').trim(),mine=winner===name;return`<div class="m156-auction-result ${mine?'mine':''}"><span class="m156-auction-rank">${i+1}</span><div><b>${esc(r.title||`Combo ${i+1}`)}</b><small>${winner?`${mine?'🎉 Bạn':'👤 '+esc(winner)} đã mua với giá ${c1Money(Number(r.price)||0)}`:'Không có người mua'}</small></div>${mine?'<strong>BẠN ĐÃ MUA</strong>':''}</div>`}).join('')}</div><button type="button" class="btn good big m156-auction-done">TÔI ĐÃ XEM KẾT QUẢ</button></div></div>`
}

function m156CardByTitle(root,pattern){return[...root?.querySelectorAll(':scope > .card')||[]].find(x=>pattern.test(x.querySelector('.title')?.textContent||''))||null}
function m156PatchP4Layout(box){
  const main=box.querySelector('.app > .grid.grid-2'),personal=main?.children[0],content=main?.children[1];if(!personal||!content)return;
  main.classList.add('m156-p4-workspace');personal.classList.add('m156-p4-right');content.classList.add('m156-p4-left');
  const asset=personal.querySelector('#playerAssetReadout')||m156CardByTitle(personal,/Tài sản riêng/i)||personal.querySelector('.money')?.closest('.card');
  const status=[...box.querySelectorAll('.card')].find(x=>x.querySelector(':scope .phase'));
  const publicProjects=m156CardByTitle(content,/Dự án công khai/i);
  const regular=box.querySelector('#tradeInboxCardV463'),investmentInbox=box.querySelector('#c1InvestmentInbox'),investment=box.querySelector('#c1InvestmentCard');
  const bank=box.querySelector('.bank-card-v475'),branch=box.querySelector('.branch-card'),composer=box.querySelector('#p3TradeComposer'),advice=box.querySelector('#tradeAdvicePanelV473');
  const outgoing=regular?.querySelector(':scope > .c14-outgoing');let outgoingCard=null;
  if(outgoing){outgoingCard=document.createElement('div');outgoingCard.className='card m156-outgoing-card';outgoingCard.id='m156OutgoingTrades';outgoingCard.innerHTML='<div class="title">📤 Giao dịch đã gửi · đang chờ</div>';outgoingCard.appendChild(outgoing)}
  let leftAnchor=publicProjects||content.firstElementChild;
  for(const el of [regular,investmentInbox,investment,bank,branch])if(el){leftAnchor?.insertAdjacentElement('afterend',el);leftAnchor=el}
  let rightAnchor=asset||personal.firstElementChild;
  for(const el of [composer,outgoingCard,advice,status])if(el){rightAnchor?.insertAdjacentElement('afterend',el);rightAnchor=el}
  const title=advice?.querySelector('.title');if(title)title.textContent='💡 Bản đề xuất giao dịch P4';
  const rule=advice?.querySelector('.advisor-rule-v473');if(rule)rule.textContent='Mục tiêu và nhu cầu lấy từ lựa chọn P2 của thị trường hiện tại. Tồn kho của chính bạn được tính lại sau giao dịch; dữ liệu riêng của người chơi khác vẫn được bảo mật. Khoảng giá chỉ để tham khảo khi thương lượng ở P4.'
}

const _playerViewM156Base=playerView;
playerView=function(name){
  const s=load(),html=_playerViewM156Base(name);if(s.gameOver||s.specialAuction?.active)return html;
  const box=document.createElement('div');box.innerHTML=html;
  box.querySelectorAll('.c1-version').forEach(x=>x.textContent=x.textContent.includes('BUILD')?`BUILD ${M156_VERSION}`:M156_VERSION);
  const status=[...box.querySelectorAll('.card')].find(x=>x.querySelector(':scope .phase'));
  if(status&&!status.querySelector('.m156-phase-guide'))status.querySelector('.phase')?.insertAdjacentHTML('afterend',m156PhaseGuide(s));
  if(s.phase==='P4')m156PatchP4Layout(box);
  const app=box.querySelector('.app');if(app)app.insertAdjacentHTML('beforeend',m156AuctionResultNotice(name,s));
  return box.innerHTML
};

const _bindPlayerM156Base=bindPlayer;
bindPlayer=function(name){
  const out=_bindPlayerM156Base(name),close=()=>{sessionStorage.setItem(m156AuctionNoticeKey(name,load()),'1');document.getElementById('m156AuctionNotice')?.remove()};
  document.querySelector('.m156-auction-close')?.addEventListener('click',close);document.querySelector('.m156-auction-done')?.addEventListener('click',close);return out
};

const _renderM156Base=render;
render=function(){const out=_renderM156Base();document.querySelectorAll('.c1-version').forEach(x=>x.textContent=x.textContent.includes('BUILD')?`BUILD ${M156_VERSION}`:M156_VERSION);document.title=`THƯƠNG TRƯỜNG — ${M156_VERSION} Multiplayer`;return out};
document.title=`THƯƠNG TRƯỜNG — ${M156_VERSION} Multiplayer`;

(function installM156Styles(){
  if(document.getElementById('m156-styles'))return;const st=document.createElement('style');st.id='m156-styles';st.textContent=`
    .m156-phase-guide{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}
    .m156-phase-guide>div{min-width:0;padding:8px 9px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc}
    .m156-phase-guide b,.m156-phase-guide span{display:block}.m156-phase-guide b{font-size:10px;color:#334155}.m156-phase-guide span{margin-top:4px;font-size:11px;line-height:1.35;color:#475569;overflow-wrap:anywhere}
    .m156-outgoing-card>.c14-outgoing{margin-top:7px}.m156-outgoing-card>.c14-outgoing>b{display:none}
    .m156-auction-notice{position:fixed;inset:0;z-index:205;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.76);backdrop-filter:blur(5px)}
    .m156-auction-notice-card{position:relative;width:min(680px,100%);max-height:min(84vh,760px);overflow:auto;padding:26px 22px 20px;border:3px solid #f59e0b;border-radius:24px;background:linear-gradient(145deg,#fffbeb,#fff);box-shadow:0 28px 90px rgba(15,23,42,.45)}
    .m156-auction-close{position:absolute;left:10px;top:10px;width:38px;height:38px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;font-size:20px;font-weight:950;cursor:pointer}
    .m156-auction-crown{text-align:center;font-size:44px}.m156-auction-notice h2{text-align:center;margin:4px 34px 6px;color:#92400e}.m156-auction-notice p{text-align:center;color:#64748b}
    .m156-auction-result-list{display:grid;gap:8px;margin:14px 0}.m156-auction-result{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px;border:1px solid #fcd34d;border-radius:12px;background:#fff}
    .m156-auction-result.mine{border:2px solid #10b981;background:#ecfdf5}.m156-auction-rank{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#92400e;color:#fff;font-weight:950}.m156-auction-result b,.m156-auction-result small{display:block;overflow-wrap:anywhere}.m156-auction-result small{margin-top:3px;color:#64748b}.m156-auction-result>strong{color:#047857;font-size:11px}
    @media(min-width:1100px){.m156-p4-workspace{grid-template-columns:minmax(0,1.45fr) minmax(330px,.72fr)!important;align-items:start}.m156-p4-left{grid-column:1!important;grid-row:1!important}.m156-p4-right{grid-column:2!important;grid-row:1!important}}
    @media(max-width:1099px){.m156-phase-guide{grid-template-columns:1fr}.m156-p4-workspace{grid-template-columns:1fr!important}.m156-p4-left,.m156-p4-right{grid-column:auto!important;grid-row:auto!important;position:static!important;max-height:none!important;overflow:visible!important}}
    @media(max-width:560px){.m156-auction-notice{padding:10px}.m156-auction-notice-card{padding:22px 12px 14px;border-radius:18px}.m156-auction-notice h2{font-size:19px}.m156-auction-result{grid-template-columns:34px minmax(0,1fr)}.m156-auction-result>strong{grid-column:2}}
  `;document.head.appendChild(st)
})();

/* M1.5.6b — compact UI corrections. These wrappers deliberately sit at the
   final presentation layer; auction/trade writes continue through the existing
   atomic RPCs and their current busy/idempotency guards. */
function m156TargetProjectPanel(name,s){
  const p=s.players?.[name],ids=p?playerTargetsV475(p,s):[],list=ids.map(id=>projectById(s,id)).filter(Boolean);
  return`<section class="c1-auction-panel m156-auction-projects" id="c1AuctionProjectPanel"><div class="split"><div class="title">📋 Dự án bạn đã nhắm từ P2</div><span class="tap-badge">REALTIME</span></div>${list.length?`<div class="m156-project-list">${list.map(pr=>{const rows=Object.entries(pr.need||{}),ok=rows.every(([k,q])=>(Number(p.res?.[k])||0)>=Number(q));return`<article class="m156-project ${ok?'enough':'missing'}"><div class="split"><b>${esc(pr.id)} · ${esc(pr.name)}</b><span>${ok?'✅ ĐÃ ĐỦ':'⚠️ CÒN THIẾU'}</span></div>${rows.map(([k,q])=>{const have=Number(p.res?.[k])||0,missing=Math.max(0,Number(q)-have);return`<div class="m156-project-need"><span>${RES[k]?.icon||''} ${esc(RES[k]?.label||k)}</span><b>${have}/${q}${missing?` · thiếu ${missing}`:' · đủ'}</b></div>`}).join('')}</article>`}).join('')}</div>`:'<div class="notice">Bạn chưa nhắm dự án nào ở P2.</div>'}</section>`
}

const _auctionStageM156UiBase=auctionStageV45;
auctionStageV45=function(s,role,name=null){
  const html=_auctionStageM156UiBase(s,role,name);if(role!=='player'||!name)return html;
  const box=document.createElement('div');box.innerHTML=html;const stage=box.querySelector('[data-ps-stage="1"]'),hero=stage?.querySelector('.ps-hero'),lots=stage?.querySelector('#psLotsV45');if(!stage||!hero||!lots)return html;
  stage.querySelector('.c1-auction-tools')?.remove();stage.querySelector('#c1AuctionPanelSlot')?.remove();
  const grid=document.createElement('div');grid.className='m156-auction-workspace';const main=document.createElement('main');main.className='m156-auction-main';const aside=document.createElement('aside');aside.className='m156-auction-sidebar';
  main.appendChild(lots);aside.innerHTML=c1AuctionAssetPanel(name,s)+m156TargetProjectPanel(name,s);aside.querySelectorAll('.c1-panel-close').forEach(x=>x.remove());grid.append(main,aside);hero.insertAdjacentElement('afterend',grid);
  return box.innerHTML
};

const _bindAuctionStageM156UiBase=bindAuctionStageV45;
bindAuctionStageV45=function(){
  const out=_bindAuctionStageM156UiBase();document.querySelectorAll('.psBidInputV45').forEach(input=>{if(input.dataset.m156Enter==='1')return;input.dataset.m156Enter='1';input.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.isComposing||e.repeat)return;e.preventDefault();const button=document.querySelector(`.psSubmitBidV45[data-lot="${CSS.escape(input.dataset.lot||'')}"]`);if(button&&!button.disabled)button.click()})});return out
};

const _c14OutgoingResourceM156Base=c14OutgoingResource;
c14OutgoingResource=function(name,s){
  const roots=c14LogicalOpenRoots(s,name).filter(x=>x.type==='resource').map(x=>x.root);if(!roots.length)return'';
  return`<div class="c14-outgoing"><b>📤 Giao dịch bạn đã gửi · đang chờ</b>${roots.map(t=>`<div class="c14-out-row"><span>#${t.id} · ${t.target==='ALL'?'📣 TẤT CẢ':`🔒 ${esc(t.target)}`}<small>${RES[t.res]?.icon||''} ${esc(RES[t.res]?.label||t.res)} ×${Number(t.qty)||0} · Tổng giá <b>${c1Money(Number(t.price)||0)}</b></small></span><button type="button" class="btn bad c14CancelResource" data-id="${t.id}">THU HỒI</button></div>`).join('')}</div>`
};

function m156EnhanceTradeResources(box){
  box.querySelectorAll('#tradeInboxCardV463 .trade-summary-v476,#tradeInboxCardV463 .trade-summary').forEach(el=>{for(const r of Object.values(RES||{})){const needle=`${r.icon||''} ${r.label||''}`.trim();if(needle&&el.innerHTML.includes(needle)&&!el.querySelector('.m156-trade-resource'))el.innerHTML=el.innerHTML.replace(needle,`<span class="m156-trade-resource">${needle}</span>`)}})
}
function m156MoveP2Projects(box){
  const main=box.querySelector('.app > .grid.grid-2'),content=main?.querySelector('.m154-player-main-content')||main?.children?.[1];if(!content)return;
  const card=[...main.querySelectorAll('.card')].find(x=>/Dự án công khai/i.test(x.querySelector('.title')?.textContent||''));if(card)content.insertAdjacentElement('afterbegin',card)
}

const _playerViewM156UiBase=playerView;
playerView=function(name){
  const s=load(),html=_playerViewM156UiBase(name);if(s.gameOver||s.specialAuction?.active)return html;const box=document.createElement('div');box.innerHTML=html;
  m156EnhanceTradeResources(box);if(s.phase==='P2')m156MoveP2Projects(box);
  const rail=box.querySelector('.m154-player-asset-rail');if(rail)rail.dataset.m156ScrollKey=`${ROOM?.code||'offline'}:${name}:${s.round}:${s.phase}`;
  return box.innerHTML
};

const M156_RAIL_SCROLL=new Map();
const _bindPlayerM156UiBase=bindPlayer;
bindPlayer=function(name){const out=_bindPlayerM156UiBase(name),rail=document.querySelector('.m154-player-asset-rail');if(rail){const key=rail.dataset.m156ScrollKey;if(key&&M156_RAIL_SCROLL.has(key))rail.scrollTop=M156_RAIL_SCROLL.get(key);rail.addEventListener('scroll',()=>{if(key)M156_RAIL_SCROLL.set(key,rail.scrollTop)},{passive:true})}return out};

function m156AdminLabel(){document.querySelectorAll('.login .brand .sub').forEach(x=>{if(/Multiplayer\s*[—-]\s*ADMIN/i.test(x.textContent||''))x.textContent='ADMIN'})}
const _renderM156UiBase=render;
render=function(){const old=document.querySelector('.m154-player-asset-rail'),key=old?.dataset.m156ScrollKey;if(old&&key)M156_RAIL_SCROLL.set(key,old.scrollTop);const out=_renderM156UiBase();m156AdminLabel();const fresh=document.querySelector('.m154-player-asset-rail'),freshKey=fresh?.dataset.m156ScrollKey;if(fresh&&freshKey&&M156_RAIL_SCROLL.has(freshKey))fresh.scrollTop=M156_RAIL_SCROLL.get(freshKey);return out};

(function installM156UiStyles(){if(document.getElementById('m156-ui-corrections'))return;const st=document.createElement('style');st.id='m156-ui-corrections';st.textContent=`
  .m156-auction-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(330px,.45fr);gap:14px;align-items:start;margin-top:14px}.m156-auction-main,.m156-auction-sidebar{min-width:0}.m156-auction-sidebar{position:sticky;top:72px;display:grid;gap:12px;max-height:calc(100vh - 88px);overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable}.m156-auction-sidebar .c1-auction-panel{margin:0}.m156-auction-sidebar .resources{grid-template-columns:repeat(auto-fit,minmax(110px,1fr))!important}.m156-project-list{display:grid;gap:8px;margin-top:9px}.m156-project{padding:9px;border:1px solid #cbd5e1;border-radius:11px;background:#fff}.m156-project.enough{border-color:#34d399;background:#ecfdf5}.m156-project.missing{border-color:#fbbf24;background:#fffbeb}.m156-project .split>span{font-size:10px;font-weight:900}.m156-project-need{display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:12px}.m156-project-need b{text-align:right}.m156-auction-main .ps-lots{margin-top:0}
  .m156-trade-resource{display:inline-block;padding:2px 7px;border-radius:8px;background:#fff7ed;color:#9a3412;font-size:1.28em;font-weight:950;line-height:1.35}.c14-out-row span{min-width:0}.c14-out-row small{display:block;margin-top:4px;font-size:12px;color:#334155}.c14-out-row small b{color:#92400e}
  @media(max-width:1099px){.m156-auction-workspace{grid-template-columns:1fr}.m156-auction-sidebar{position:static;max-height:none;overflow:visible;grid-row:1}.m156-auction-main{grid-row:2}}
`;document.head.appendChild(st)})();

/* ================================================================
   M1.5.6 MULTIPLAYER TRADE SAFETY HOTFIX
   - Idempotent request IDs: retry can never settle a trade twice.
   - Server wrappers enforce a bounded room-lock wait.
   - Short jittered retries absorb simultaneous clicks from many clients.
   ================================================================ */
function m156RequestId(prefix='trade'){
  try{if(globalThis.crypto?.randomUUID)return `${prefix}:${crypto.randomUUID()}`}catch(_e){}
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}:${Math.random().toString(36).slice(2)}`
}
function m156Sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function m156TransientRpcError(err){
  const s=[err?.code,err?.message,err?.details,err?.hint,err].filter(Boolean).join(' ');
  return /55P03|57014|40P01|deadlock|lock timeout|statement timeout|timeout|timed out|failed to fetch|load failed|network|connection/i.test(s)
}
async function m156TradeRpc(rpc,request,attempts=12){
  let last={data:null,error:new Error('RPC_NOT_RUN')};
  for(let i=0;i<attempts;i++){
    try{last=await SB.rpc(rpc,{p_request:request})}catch(error){last={data:null,error}}
    if(!last?.error)return last;
    if(!m156TransientRpcError(last.error)||i===attempts-1)return last;
    // Desynchronise simultaneous clients instead of hammering the same room lock again.
    await m156Sleep(35+(i*35)+Math.floor(Math.random()*90));
  }
  return last
}
function m156TradeRequest(name,action,prefix='trade'){
  return {...m154ResourceTradeAuth(name,action),requestId:m156RequestId(prefix)}
}

/* Investment offer/cancel keeps the original business rules but gains
   idempotency + bounded waiting when many players act at once. */
c1CommitAction=async function(actor,action){
  if(!ROOM?.id||!SB)return false;
  if(C1_ACTION_BUSY)return false;
  C1_ACTION_BUSY=true;
  try{
    const request={roomId:ROOM.id,action,memberToken:accessIsAdmin()?null:currentMemberToken(),adminToken:accessIsAdmin()?ADMIN_TOKEN:null,adminPlayerName:accessIsAdmin()?actor:null,requestId:m156RequestId(`c1:${action?.kind||'action'}`)};
    let result;
    if(['buy_property','sell_property'].includes(action?.kind))result=await SB.rpc('c17_apply_property_market_action',{p_request:request});
    else if(['offer','cancel','accept','decline','counter'].includes(action?.kind))result=await m156TradeRpc('m156_safe_trade_action',request);
    else result=await SB.rpc('c11_apply_economy_action',{p_request:request});
    if(result.error)throw result.error;
    const row=Array.isArray(result.data)?result.data[0]:result.data;
    if(!row?.ok)throw new Error(row?.message||'Không cập nhật được giao dịch.');
    const accepted=await m154AcceptServerRow(row,'m156_economy_action');
    if(accepted)c1Toast(row.message||'Giao dịch đã được ghi nhận.',row.tone||'info');
    return accepted
  }catch(e){
    c1Toast(m156TransientRpcError(e)?'Có nhiều người đang thao tác cùng lúc. Máy chủ chưa ghi thao tác này, hãy bấm lại sau 1 giây.':c14VietnameseError(e),'sell');
    await m153FetchRoomCoalesced().catch(()=>{});return false
  }finally{C1_ACTION_BUSY=false}
};

m154CommitResourceTrade=async function(name,action){
  const key=String(action.tradeId||'new');if(M154_RESOURCE_TRADE_BUSY.has(key))return false;
  M154_RESOURCE_TRADE_BUSY.add(key);if(action.tradeId)m154TradeButtons(action.tradeId,true);
  const request=m156TradeRequest(name,action,`resource:${action.kind||'action'}:${action.tradeId||'new'}`);
  try{
    const {data,error}=await m156TradeRpc('m156_safe_resource_trade_action',request,12);
    if(error)throw error;const row=Array.isArray(data)?data[0]:data;
    if(!row?.ok)throw new Error(row?.message||'Không cập nhật được giao dịch.');
    const accepted=await m154AcceptServerRow(row,'m156_resource_trade');
    if(accepted)c1Toast(row.message||'Đã cập nhật giao dịch.',row.tone||'info');
    return accepted
  }catch(e){
    const raw=String(e?.message||e),friendly=/OFFER_NOT_PENDING/.test(raw)?'Giao dịch đã được người khác xử lý trước; đang tải trạng thái mới.':/TRADE_PHASE_CLOSED|GAME_ACTION_LOCKED/.test(raw)?'Host đã chuyển P hoặc khóa thời gian; thao tác cũ không được ghi.':m156TransientRpcError(e)?'Nhiều người đang giao dịch cùng lúc. Máy chủ đã chống ghi trùng nhưng chưa lấy được lượt; hãy bấm lại sau 1 giây.':c14VietnameseError(e);
    c1Toast(friendly,'sell');await m153FetchRoomCoalesced().catch(()=>{});return false
  }finally{M154_RESOURCE_TRADE_BUSY.delete(key);if(action.tradeId)m154TradeButtons(action.tradeId,false)}
};

sendTradeOffer=async function(name){
  if(!ROOM?.id||!SB)return false;
  if(M154_RESOURCE_TRADE_BUSY.has('offer'))return false;
  const s=load(),d=tradeDraft(name,s),target=d.to==='ALL'?'ALL':String(d.to||''),limit=c14TradeLimitError(s,name,target);
  if(s.phase!=='P4')return c1Toast('Giao dịch tự do diễn ra ở P4.','sell');
  if(limit)return c1Toast(limit,'sell');
  const kind=d.kind,res=d.res,qty=d.qty,price=d.money,message=String(d.message||'').trim(),actor=s.players[name];
  if(kind==='buy'&&actor.money<price)return c1Toast('Bạn không đủ tiền cho đề nghị mua này.','sell');
  if(kind==='sell'&&(Number(actor.res?.[res])||0)<qty)return c1Toast('Bạn không đủ tài nguyên để bán.','sell');
  persistTradeDraft(name);
  const verb=kind==='buy'?'MUA':'BÁN',ok=await uiConfirmV46({title:`XÁC NHẬN GỬI ${verb}`,tone:kind==='buy'?'buy':'sell',rows:[['Tài nguyên',`${RES[res].icon} ${RES[res].label} ×${qty}`],['Đối tác',target==='ALL'?'TẤT CẢ':target],['Tổng giá',c1Money(price)]],message:kind==='sell'?(message?message+'\n\n':'')+'Tài nguyên được giữ riêng ngay khi gửi và tự hoàn lại nếu giao dịch không thành.':message,confirmText:`GỬI ${verb}`});
  if(!ok)return false;
  const request={...m154ResourceTradeAuth(name,{kind:'offer_resource',direction:kind,target,res,qty,price,message}),requestId:m156RequestId(`offer:${kind}`)};
  M154_RESOURCE_TRADE_BUSY.add('offer');
  try{
    const {data,error}=await m156TradeRpc('m156_safe_trade_action',request,12);if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;if(!row?.ok)throw new Error(row?.message||'Không gửi được giao dịch.');
    const accepted=await m154AcceptServerRow(row,'m156_resource_offer');if(accepted)c1Toast(row.message||'Đã gửi giao dịch.',row.tone||kind);return accepted
  }catch(e){
    c1Toast(m156TransientRpcError(e)?'Nhiều người đang gửi giao dịch cùng lúc. Không có giao dịch nào bị ghi trùng; hãy thử lại sau 1 giây.':c14VietnameseError(e),'sell');
    await m153FetchRoomCoalesced().catch(()=>{});return false
  }finally{M154_RESOURCE_TRADE_BUSY.delete('offer')}
};

/* Final multiplayer coverage: resource-offer cancellation must use the same
   authenticated idempotent/bounded-wait path as send/accept/decline/counter. */
c14CancelResource=async function(name,id){
  if(!ROOM?.id||!SB){
    const s=load(),root=(s.trades||[]).find(t=>Number(t.id)===Number(id)&&t.initiator===name);
    if(!root)return c1Toast('Không tìm thấy giao dịch có thể thu hồi.','sell');
    const group=s.trades.filter(t=>String(t.rootId??t.id)===String(root.id));
    if(!group.some(t=>t.status==='pending'))return c1Toast('Giao dịch không còn ở trạng thái chờ.','sell');
    group.forEach(t=>{if(['pending','superseded'].includes(t.status))t.status='cancelled'});
    releaseTradeReservationV476(s,root,'cancelled');save(s);render();c1Toast(`Đã thu hồi giao dịch #${id}.`,'sell');return true
  }
  const key=`cancel:${id}`;if(M154_RESOURCE_TRADE_BUSY.has(key))return false;
  M154_RESOURCE_TRADE_BUSY.add(key);m154TradeButtons(id,true,'ĐANG THU HỒI...');
  const request={...m154ResourceTradeAuth(name,{kind:'cancel_resource',tradeId:Number(id)}),requestId:m156RequestId(`cancel-resource:${id}`)};
  try{
    const {data,error}=await m156TradeRpc('m156_safe_trade_action',request,12);if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;if(!row?.ok)throw new Error(row?.message||'Không thu hồi được giao dịch.');
    const accepted=await m154AcceptServerRow(row,'m156_resource_cancel');if(accepted)c1Toast(row.message||`Đã thu hồi giao dịch #${id}.`,row.tone||'sell');return accepted
  }catch(e){
    const raw=String(e?.message||e),friendly=/Giao dịch không còn|OFFER_NOT_PENDING|không còn ở trạng thái chờ/i.test(raw)?'Giao dịch đã được người khác xử lý trước; đang tải trạng thái mới.':m156TransientRpcError(e)?'Nhiều người đang thao tác cùng lúc. Máy chủ chưa ghi thao tác thu hồi; hãy bấm lại sau 1 giây.':c14VietnameseError(e);
    c1Toast(friendly,'sell');await m153FetchRoomCoalesced().catch(()=>{});return false
  }finally{M154_RESOURCE_TRADE_BUSY.delete(key);m154TradeButtons(id,false)}
};


/* ================================================================
   M1.5.6 FINAL PHASE AUTHORITY FENCE
   - Host P4->P5 cleanup is server-authoritative (m156_close_p4_admin).
   - P6->P7 does not report completion until the P7 snapshot is committed.
   ================================================================ */
const _m156FinalizeP6ServerSync=finalizeP6V480;
finalizeP6V480=async function(...args){
  const out=await _m156FinalizeP6ServerSync(...args);
  if(out&&load()?.phase==='P7'){
    await waitRoomSyncV481().catch(()=>false);
    await m153FetchRoomCoalesced().catch(()=>{});
  }
  return out
};


/* AUTO P4 used to expire a browser snapshot and queue a generic save before
   changing phase. That legacy path can race a just-completed trade. For P4 only,
   use the same server-authoritative Host transition as CONTROL. */
const _m156AutoPhaseEndSafeBase=autoPhaseEndV480;
autoPhaseEndV480=async function(){
  const s=load();
  if(s.flowMode==='auto'&&s.phase==='P4'&&!s.specialAuction?.active){
    if(V480_AUTO_BUSY||M154_HOST_PRIORITY_BUSY)return false;
    return enterPhaseV480('P5',true)
  }
  return _m156AutoPhaseEndSafeBase()
};


/* ========================================================================== */
/* M1.6.0 FINAL — CRITICAL PLAYER WRITE ISOLATION                            */
/*                                                                            */
/* P4 trade already uses idempotent action RPCs and P6 bids already live in   */
/* dedicated auction tables. The remaining contention was caused by P5        */
/* decisions and P6 promo choices saving the entire room snapshot. These two  */
/* paths now update only the authenticated player's own object on the server. */
/* ========================================================================== */
let M160_P5_WRITE_BUSY=false,M160_P6_PROMO_BUSY=false;

async function m160PhaseRpc(name,args,attempts=14){
  let last={data:null,error:new Error('M160_RPC_NOT_RUN')};
  for(let i=0;i<attempts;i++){
    try{last=await SB.rpc(name,args)}catch(error){last={data:null,error}}
    if(!last?.error)return last;
    const raw=String(last.error?.code||'')+' '+String(last.error?.message||last.error||'');
    if(!/55P03|PLAYER_WRITE_BUSY|lock not available|lock timeout|57014|40P01|deadlock|statement timeout|failed to fetch|network|load failed/i.test(raw)||i===attempts-1)return last;
    await m156Sleep(28+i*22+Math.floor(Math.random()*75));
  }
  return last
}

async function m160AcceptPlayerPatch(row,name,reason){
  if(!row?.player)return false;
  const revision=Number(row.revision)||0,floor=m154RevisionFloor();
  if(revision&&revision<floor){await m153FetchRoomCoalesced().catch(()=>{});return false}
  const s=load();
  if(!s.players?.[name]){await m153FetchRoomCoalesced().catch(()=>{});return false}
  s.players[name]=deep(row.player);
  localStorage.setItem(STATE_KEY,JSON.stringify(s));
  if(ROOM_BASE_STATE_V47?.players?.[name])ROOM_BASE_STATE_V47.players[name]=deep(row.player);
  M154_HIGHEST_REVISION=Math.max(floor,revision);
  if(ROOM){ROOM.revision=Math.max(Number(ROOM.revision)||0,revision);storeRoom(ROOM)}
  setRoomStatus('live');
  broadcastRoomSignal('state_changed',{reason,revision}).catch(()=>{});
  render();
  return true
}

const _m160P5OfflineDecisionBase=c17SetProjectDecision;
c17SetProjectDecision=async function(name,pid,decision){
  if(!ROOM?.id||!SB)return _m160P5OfflineDecisionBase(name,pid,decision);
  if(M160_P5_WRITE_BUSY)return false;
  const s=load(),p=s.players?.[name];
  if(!p||s.phase!=='P5'||!playerTargetsV475(p,s).includes(pid)||c17ProjectDecisionDone(p,pid))return false;
  if(decision==='locked'&&!canLockProjectV475(p,s,pid)){c1Toast(`Không đủ tài nguyên còn lại để chốt ${pid}.`,'sell');return false}
  const next=deep(p.projectDecisions||{});next[String(pid)]=decision==='locked'?'locked':'declined';
  M160_P5_WRITE_BUSY=true;
  try{
    /* Optimistic paint: the click feels immediate; the authoritative result
       replaces only this player's object when the RPC returns. */
    p.projectDecisions=deep(next);syncLegacyProjectFieldsV475(p,s);localStorage.setItem(STATE_KEY,JSON.stringify(s));render();
    const out=await m160PhaseRpc('m160_set_p5_decisions',{p_room_id:ROOM.id,p_decisions:next,p_member_token:currentMemberToken()});
    if(out.error)throw out.error;
    const row=Array.isArray(out.data)?out.data[0]:out.data;
    if(!row?.ok)throw new Error('P5_DECISION_NOT_RECORDED');
    await m160AcceptPlayerPatch(row,name,'m160_p5_decision');
    c1Toast(row.message||`Đã ghi nhận lựa chọn ${pid}.`,row.tone||'buy');return true
  }catch(e){
    const raw=String(e?.message||e);
    await m153FetchRoomCoalesced().catch(()=>{});render();
    c1Toast(/P5_PHASE_CLOSED/.test(raw)?'Host đã chuyển khỏi P5; lựa chọn vừa bấm không được ghi sang P mới.':/PROJECT_RESOURCE_NOT_ENOUGH/.test(raw)?'Tài nguyên vừa thay đổi nên không còn đủ để chốt dự án này.':m156TransientRpcError(e)?'Máy chủ đang xử lý nhiều thao tác; lựa chọn chưa được ghi, hãy bấm lại.':c14VietnameseError(e),'sell');return false
  }finally{M160_P5_WRITE_BUSY=false}
};

bindP4ActionsV475=function(name){
  document.querySelectorAll('.lockProjectV475').forEach(b=>b.onclick=()=>c17SetProjectDecision(name,b.dataset.project,'locked'));
  document.querySelectorAll('.declineProjectV475').forEach(b=>b.onclick=()=>c17SetProjectDecision(name,b.dataset.project,'declined'))
};

const _m160PromoOfflineBindBase=c17BindPromo;
c17BindPromo=function(name){
  if(!ROOM?.id||!SB)return _m160PromoOfflineBindBase(name);
  document.querySelectorAll('.m1PromoPick').forEach(btn=>{btn.disabled=false;btn.onclick=()=>{const root=btn.closest('[data-c17-promo-project]'),pid=String(btn.dataset.project||''),code=String(btn.dataset.code||'');root?.querySelectorAll('.m1PromoPick').forEach(x=>x.classList.toggle('selected',x===btn));try{sessionStorage.setItem(c17PromoDraftKey(name,load(),pid),code)}catch(e){}const confirm=root?.querySelector('.c17ConfirmPromo');if(confirm){confirm.dataset.value=code;confirm.disabled=false}m13UpdatePromoPreview(root,name,pid,code)}});
  const applyAll=async(value)=>{
    if(M160_P6_PROMO_BUSY)return false;
    const s=load(),p=s.players?.[name],wins=m1WinningProjectRows(s).filter(r=>r.winner===name).map(r=>String(r.projectId));
    if(!p||s.phase!=='P6'||!m1PromoSettlementReady(s)||!wins.length)return false;
    const chosen=String(value||''),code=chosen?(p.promoCodes||[]).find(c=>c.status==='available'&&String(c.id)===chosen):null;
    if(chosen&&!code){c1Toast('Mã đã chọn không còn khả dụng. Hãy chọn lại.','sell');return false}
    const next=deep(c17PromoRoundMap(p,s));for(const pid of wins)next[pid]=code?String(code.id):'';
    M160_P6_PROMO_BUSY=true;
    try{
      const root=p.projectPromoChoices=p.projectPromoChoices&&typeof p.projectPromoChoices==='object'?p.projectPromoChoices:{};root[String(s.round)]=deep(next);for(const pid of wins)try{sessionStorage.removeItem(c17PromoDraftKey(name,s,pid))}catch(_e){}
      localStorage.setItem(STATE_KEY,JSON.stringify(s));render();
      const out=await m160PhaseRpc('m160_set_p6_promos',{p_room_id:ROOM.id,p_choices:next,p_member_token:currentMemberToken()});
      if(out.error)throw out.error;
      const row=Array.isArray(out.data)?out.data[0]:out.data;if(!row?.ok)throw new Error('P6_PROMO_NOT_RECORDED');
      await m160AcceptPlayerPatch(row,name,'m160_p6_promo');
      c1Toast(code?`Đã áp dụng ${code.id} cho ${wins.length} dự án thắng.`:`Đã xác nhận không dùng mã cho ${wins.length} dự án thắng.`,row.tone||'buy');return true
    }catch(e){
      const raw=String(e?.message||e);await m153FetchRoomCoalesced().catch(()=>{});render();
      c1Toast(/P6_PHASE_CLOSED/.test(raw)?'Host đã chuyển khỏi P6; lựa chọn vừa bấm không được ghi sang P mới.':/PROMO_CODE_NOT_AVAILABLE|PROMO_CODE_DUPLICATED/.test(raw)?'Mã khuyến mãi vừa thay đổi hoặc đã được dùng cho lựa chọn khác.':m156TransientRpcError(e)?'Máy chủ đang xử lý nhiều thao tác; lựa chọn chưa được ghi, hãy bấm lại.':c14VietnameseError(e),'sell');return false
    }finally{M160_P6_PROMO_BUSY=false}
  };
  document.querySelectorAll('.c17ConfirmPromo').forEach(btn=>btn.onclick=()=>applyAll(String(btn.dataset.value||c17PromoDraft(name,load(),btn.dataset.project)||'')));
  document.querySelectorAll('.m1SkipPromo').forEach(btn=>btn.onclick=()=>applyAll(''))
};


/* ========================================================================== */
/* M1.6.2 DEEP-FIX — REAL GAME PATCH                                           */
/* 1) P4 player actions fail-fast instead of forming a lock queue.             */
/* 2) P4->P5 and P5->P6 are server-authoritative Host commits.                 */
/* 3) P6 result preparation + payout + promo + dividends are server atomic.    */
/* ========================================================================== */

async function m161Rpc(name,args){
  const out=await SB.rpc(name,args);
  if(out?.error)throw out.error;
  return Array.isArray(out?.data)?out.data[0]:out?.data
}

/* P4 fail-fast server responses retry in short, jittered slices. The requestId
   remains constant, so a network retry can never settle twice. */
m156TradeRpc=async function(rpc,request,attempts=24){
  let last={data:null,error:new Error('RPC_NOT_RUN')};
  for(let i=0;i<attempts;i++){
    try{last=await SB.rpc(rpc,{p_request:request})}catch(error){last={data:null,error}}
    if(!last?.error)return last;
    if(!m156TransientRpcError(last.error)||i===attempts-1)return last;
    await m156Sleep(18+Math.min(120,i*9)+Math.floor(Math.random()*55));
  }
  return last
};

async function m161HostPhaseTransition(ph,autoRun=false,control=false){
  if(!ROOM?.id||!SB||!ADMIN_TOKEN)return false;
  let current=load(),before=current.phase;
  if(before===ph)return false;
  if(before==='P6'&&ph==='P7')return finalizeP6V480(false);
  if(!((before==='P4'&&ph==='P5')||(before==='P5'&&ph==='P6'))){
    return m154RunHostPhaseTransition(ph,autoRun,control)
  }
  if(M154_HOST_PRIORITY_BUSY||V481_PHASE_SWITCH_BUSY||V481_FLOW_SWITCH_BUSY)return false;
  if(control){
    if(current.flowMode!=='control'){alert('AUTO đang bật. Hãy chuyển sang CONTROL để đổi P thủ công.');return false}
    if(current.specialAuction?.active){alert('Phiên đấu giá đang chạy. Hãy kết thúc đấu giá trước khi đổi P.');return false}
  }
  M154_HOST_PRIORITY_BUSY=V481_PHASE_SWITCH_BUSY=true;
  let transitionAcquired=false;
  try{
    // Commit already queued Host writes before taking the phase lock. A later
    // timer/save remains queued and must face the new server revision/phase.
    const writeDeadline=Date.now()+12000;
    while(ROOM_PUSHING||ROOM_QUEUED_STATE){
      if(Date.now()>writeDeadline)throw new Error('HOST_ROOM_WRITE_NOT_DRAINED');
      if(!ROOM_PUSHING&&ROOM_QUEUED_STATE){clearTimeout(ROOM_PUSH_TIMER);await pushRoomState()}
      else await new Promise(resolve=>setTimeout(resolve,25));
    }
    if(M161_ROOM_WRITE_UNRESOLVED)throw new Error('HOST_ROOM_WRITE_UNRESOLVED');
    if(ROOM_STATUS==='error'){
      const fresh=await fetchRoomLatest();
      if(!fresh||fresh.id!==ROOM.id||fresh.status!=='active'||fresh.state?.phase!==before||Number(fresh.state?.round)!==Number(current.round))throw new Error('HOST_ROOM_READBACK_INVALID');
      if(ROOM_PUSHING||ROOM_QUEUED_STATE||M161_ROOM_WRITE_UNRESOLVED)throw new Error('HOST_ROOM_WRITE_UNRESOLVED');
    }
    window.M161_PHASE_WRITE_GATE=true;
    const begun=await m161Rpc('m161_begin_host_transition_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_target_phase:ph});
    if(begun!==true)throw new Error('HOST_TRANSITION_NOT_ACQUIRED');
    transitionAcquired=true;
    const visual=deep(load());
    if(control)c11CapturePhaseCheckpoint(visual,ph);
    m154PreparePhaseNoPublish(visual,ph);
    setPhaseTimerV480(visual,ph,control?ph!=='P7':!!autoRun&&ph!=='P7');
    if(autoRun)ensureRealtimeRunningV481(visual);
    logPush(visual,`🔒 HOST SERVER ${before} → ${ph}.`);
    clearTimeout(ROOM_PUSH_TIMER);
    /* Commit before exposing the phase locally. A delayed old-phase fetch may
       still arrive while the RPC is pending. */
    const row=await m161Rpc('m161_host_phase_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_from_phase:before,p_to_phase:ph,p_phase_state:visual});
    if(!row?.ok)throw new Error(row?.message||'HOST_PHASE_COMMIT_FAILED');
    await m154AcceptServerRow({ok:true,revision:row.revision,state:row.state,status:'active'},`m161_host_${before}_${ph}`);
    broadcastRoomSignal('state_changed',{reason:`m161_host_${before}_${ph}`,revision:row.revision}).catch(()=>{});
    if(ph==='P6')await ensureProcurementOpenV480();
    return true
  }catch(e){
    await m153FetchRoomCoalesced().catch(()=>{});render();
    c1Toast(`Host chưa chuyển được ${before} → ${ph}: ${c14VietnameseError(e)}`,'sell');
    return false
  }finally{
    if(transitionAcquired)await SB.rpc('m161_end_host_transition_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id}).catch(()=>{});
    M154_HOST_PRIORITY_BUSY=V481_PHASE_SWITCH_BUSY=false;
    window.M161_PHASE_WRITE_GATE=false;
    if(ROOM_QUEUED_STATE&&!ROOM_PUSHING){clearTimeout(ROOM_PUSH_TIMER);ROOM_PUSH_TIMER=setTimeout(pushRoomState,0)}
  }
}
controlPhaseChangeV481=function(ph){return m161HostPhaseTransition(ph,false,true)};
enterPhaseV480=function(ph,autoRun=false){return m161HostPhaseTransition(ph,autoRun,false)};

/* P6 is now a two-step server transaction:
   A. determine winners -> atomically store results + promo window;
   B. atomically consume resources, pay project revenue, apply promo, distribute
      shareholder dividends, mark codes used, and commit P7. */
finalizeP6V480=async function(autoMode=false){
  if(V480_AUTO_BUSY||!ROOM?.id||!SB||!ADMIN_TOKEN)return false;
  let s=load();if(s.phase!=='P6')return false;V480_AUTO_BUSY=true;
  try{
    if(!m1PromoSettlementReady(s)){
      await ensureProcurementOpenV480();
      const fresh=load();
      const {data,error}=await SB.rpc('finalize_project_auctions_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_round:fresh.round,p_auto_mode:!!autoMode});
      if(error)throw error;
      const rows=Array.isArray(data?.results)?data.results:[],pending=rows.filter(r=>['tie_rebid','waiting'].includes(String(r?.status||'')));
      if(pending.length){
        await m153FetchRoomCoalesced().catch(()=>{});await fetchAuctionSnapshotV45().catch(()=>{});render();
        const ties=pending.filter(r=>r.status==='tie_rebid'),waiting=pending.filter(r=>r.status==='waiting');
        if(ties.length)c1Toast(`Có ${ties.length} dự án hòa giá. Các bên hòa phải gửi vòng giá mới.`,'info');
        else c1Toast(`Đang chờ: ${waiting.flatMap(r=>r.missing_players||[]).join(', ')} gửi giá.`,'info');
        return false
      }
      const out=[];
      for(const pr of projects(fresh)){
        const parts=eligibleProjectContenders(fresh,pr.id);
        if(!parts.length){out.push({round:fresh.round,projectId:pr.id,winner:null,bid:0,payout:0,competitive:false,solo:false,competitors:[]});continue}
        if(parts.length===1){out.push({round:fresh.round,projectId:pr.id,winner:parts[0],bid:0,payout:Number(pr.reward)||0,competitive:false,solo:true,competitors:parts});continue}
        const r=rows.find(x=>String(x.project_id)===String(pr.id));
        out.push({round:fresh.round,projectId:pr.id,winner:r?.winner||null,bid:Number(r?.winning_bid)||0,payout:Number(r?.winning_bid)||0,competitive:true,solo:false,competitors:parts,autoFilled:r?.auto_filled||[]})
      }
      const row=await m161Rpc('m161_prepare_p6_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_round:fresh.round,p_results:out,p_promo_seconds:30});
      if(!row?.ok)throw new Error('P6_PREPARE_FAILED');
      await m154AcceptServerRow({ok:true,revision:row.revision,state:row.state,status:'active'},'m161_p6_prepared');
      broadcastRoomSignal('state_changed',{reason:'m161_p6_promo_wait',revision:row.revision}).catch(()=>{});
      render();return false
    }

    s=load();
    const expired=!!s.timer?.expired||remainingTime(s)<=0;
    const row=await m161Rpc('m161_settle_p6_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_round:s.round,p_force_skip:expired});
    if(!row?.ok){
      c1Toast(row?.message||`Đang chờ ${row?.waiting||0} lựa chọn mã khuyến mại.`,'info');
      await m153FetchRoomCoalesced().catch(()=>{});render();return false
    }
    await m154AcceptServerRow({ok:true,revision:row.revision,state:row.state,status:'active'},'m161_p6_settled');
    broadcastRoomSignal('state_changed',{reason:'m161_p6_settled',revision:row.revision}).catch(()=>{});
    c1Toast('Đã thanh toán dự án, áp mã khuyến mại và chia cổ tức.','buy');
    render();return true
  }catch(e){
    console.error('M1.6.2 finalize',e);await m153FetchRoomCoalesced().catch(()=>{});render();
    c1Toast(`Không thể chốt/thanh toán: ${c14VietnameseError(e)}`,'sell');return false
  }finally{V480_AUTO_BUSY=false}
};
