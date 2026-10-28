/* =========================================================
   V4.8.0 — AUTO FLOW + P3 AUCTION + SMART RECOMMENDATIONS
   Additive compatibility layer over V4.7.6.3.
   ========================================================= */
const V480_VERSION='V4.8.0';
const V480_PHASE_DEFAULTS={P1:120,P2:180,P3:300,P4:900,P5:300,P6:300,P7:0};
let V480_AUTO_BUSY=false;

(function installV480Styles(){
  const st=document.createElement('style');st.id='v480-styles';st.textContent=`
    .flow-card-v480{border:3px solid #0ea5e9;background:linear-gradient(145deg,#ecfeff,#eff6ff)}
    .flow-mode-grid-v480{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .flow-mode-v480{border:2px solid #cbd5e1;background:#fff;border-radius:14px;padding:12px;text-align:left;font-weight:900;cursor:pointer}
    .flow-mode-v480.selected{border-color:#0f766e;background:#ecfdf5;color:#065f46;box-shadow:0 0 0 3px rgba(15,118,110,.08)}
    .flow-mode-v480 small{display:block;font-weight:600;color:#64748b;margin-top:4px;line-height:1.35}
    .phase-duration-grid-v480{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr));gap:8px;margin-top:11px}
    .phase-duration-v480{border:1px solid #bae6fd;background:#fff;border-radius:12px;padding:8px}
    .phase-duration-v480 label{display:block;font-size:10px;font-weight:1000;color:#0369a1;letter-spacing:.05em;margin-bottom:5px}
    .phase-duration-v480 input{width:100%;font-weight:900;text-align:center}
    .flow-status-v480{margin-top:9px;padding:9px 11px;border-radius:11px;background:#0f172a;color:#fff;font-size:12px;font-weight:800}
    .flow-status-v480.auto{background:#065f46}.flow-status-v480.control{background:#334155}
    .smart-recs-v480{border:2px solid #22c55e;background:linear-gradient(145deg,#f0fdf4,#fff);border-radius:14px;padding:10px;margin-top:10px}
    .smart-rec-grid-v480{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
    .smart-rec-v480{border:1px solid #86efac;background:#fff;border-radius:12px;padding:10px}
    .smart-rec-v480 .reason{font-size:11px;color:#475569;line-height:1.4;margin:5px 0}
    .smart-rec-v480 .range{font-size:11px;font-weight:900;color:#166534}
    .smart-rec-v480 button{margin-top:7px;width:100%}
    .branch-editor-v480{border:1px solid #c4b5fd;background:#faf5ff;border-radius:12px;padding:9px;margin-top:8px}
    .branch-editor-grid-v480{display:grid;grid-template-columns:1fr 1fr 120px;gap:8px}
    .auction-branch-v480{border-color:#8b5cf6!important;background:linear-gradient(145deg,#faf5ff,#fff)!important}
    .p3-wait-v480{border:2px solid #f59e0b;background:#fffbeb;border-radius:12px;padding:12px;margin-top:10px}
    .phase-main-v480{font-weight:1000;color:#0f172a}
    .branch-success-v476{animation:none!important}
    .trade-phase-v480{border:2px solid #f59e0b;background:linear-gradient(145deg,#fffbeb,#fff)}
    .p5-lock-v480{border:3px solid #22c55e!important;background:linear-gradient(145deg,#f0fdf4,#fff)!important}
    .p6-procurement-v480{border:3px solid #0ea5e9!important;background:linear-gradient(145deg,#ecfeff,#fff)!important}
    @media(max-width:900px){.phase-duration-grid-v480{grid-template-columns:repeat(2,minmax(0,1fr))}.smart-rec-grid-v480{grid-template-columns:1fr}}
    @media(max-width:620px){.flow-mode-grid-v480,.branch-editor-grid-v480{grid-template-columns:1fr}.phase-duration-grid-v480{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;document.head.appendChild(st)
})();

/* ---------- New canonical phase meanings ---------- */
PHASES.P1={name:'P1 — Nghiên cứu thị trường',desc:'Quan sát dự án, doanh nghiệp và nguồn lực. Chưa giao dịch.'};
PHASES.P2={name:'P2 — Nhắm dự án',desc:'Chọn dự án mục tiêu và chuẩn bị nhu cầu trước phiên đấu giá.'};
PHASES.P3={name:'P3 — Đấu giá',desc:'Đấu giá combo tài nguyên, khuyến mại và chi nhánh. AUTO có thể tự đề xuất và mở phiên.'};
PHASES.P4={name:'P4 — Giao dịch tự do',desc:'Mua, bán, thương lượng và điều chỉnh mục tiêu trước khi chốt.'};
PHASES.P5={name:'P5 — Chốt dự án',desc:'Chốt các dự án đủ tài nguyên hoặc từ chối. AUTO tự chốt hợp lệ khi hết giờ.'};
PHASES.P6={name:'P6 — Đấu thầu & thanh toán',desc:'Các dự án cạnh tranh tự mở đấu thầu kín; hết giờ chốt giá thấp nhất và thanh toán.'};
PHASES.P7={name:'P7 — Kết thúc thị trường',desc:'Công bố kết quả. Chỉ Host xác nhận mới sang thị trường kế tiếp hoặc tổng kết.'};

function ensureFlowV480(s){
  if(!s||typeof s!=='object')return s;
  s.phaseDurations=s.phaseDurations&&typeof s.phaseDurations==='object'?s.phaseDurations:{};
  for(const p of Object.keys(V480_PHASE_DEFAULTS)){
    const n=Number(s.phaseDurations[p]);
    if(!Number.isFinite(n)||n<0)s.phaseDurations[p]=V480_PHASE_DEFAULTS[p];
    else s.phaseDurations[p]=Math.max(0,Math.min(3600,Math.round(n)));
  }
  if(!['auto','control'].includes(s.flowMode))s.flowMode='control';
  if(!s.flowV480)s.flowV480={schema:1};
  return s
}

const _loadV480Base=load;
load=function(){return ensureFlowV480(_loadV480Base())};

const _initialStateV480Base=initialState;
initialState=function(setup=loadSetup()){
  const s=ensureFlowV480(_initialStateV480Base(setup));
  s.flowMode='control';
  setPhaseTimerV480(s,'P1',false);
  return s
};

function phaseDurationV480(s,p=s.phase){ensureFlowV480(s);return Math.max(0,Number(s.phaseDurations?.[p])||0)}
function setPhaseTimerV480(s,ph,run=false){
  ensureFlowV480(s);const sec=phaseDurationV480(s,ph);
  s.timer={duration:sec,remaining:sec,endAt:run&&sec>0?Date.now()+sec*1000:null,running:!!(run&&sec>0),expired:sec===0,autoPassed:{}};
  if(s.timer.running)resumeGameClock(s);else pauseGameClock(s);
  s.flowV480=s.flowV480||{};s.flowV480.phaseEnteredAt=Date.now();s.flowV480.phase=ph;
  return s
}
function phaseDurationLabelV480(s,p){return p==='P7'?'CHỜ HOST':fmtTime(phaseDurationV480(s,p))}

phaseButtons=function(s){
  ensureFlowV480(s);const arr=Object.keys(PHASES),cur=arr.indexOf(s.phase);
  return`<div class="btn-row">${arr.map((p,i)=>`<button class="btn phase-step ${p===s.phase?'active':cur>i?'done':''} phaseBtn" data-phase="${p}">${p}<span style="display:block;font-size:10px;font-weight:600;margin-top:2px">${phaseDurationLabelV480(s,p)}</span></button>`).join('')}</div>`
};

const _timerCardV480Base=timerCard;
timerCard=function(s,host=false){
  ensureFlowV480(s);const box=document.createElement('div');box.innerHTML=_timerCardV480Base(s,host);const card=box.firstElementChild;if(!card)return box.innerHTML;
  const title=card.querySelector('.title');if(title)title.textContent=`⏱️ Đồng hồ ${s.phase} · Thị trường ${s.round}`;
  const muted=title?.parentElement?.querySelector('.muted');if(muted)muted.innerHTML=`Thời lượng riêng của <b>${s.phase}</b>: <b>${phaseDurationLabelV480(s,s.phase)}</b>. ${s.flowMode==='auto'?'AUTO sẽ tự xử lý và chuyển P khi hết giờ.':'CONTROL giữ quyền chuyển P cho Host.'}`;
  const timeline=card.querySelector('.timeline');if(timeline)timeline.innerHTML=Object.keys(PHASES).map(p=>`<div class="time-mark ${p===s.phase?'active':''}"><b>${p}</b><span>${phaseDurationLabelV480(s,p)}</span></div>`).join('');
  return card.outerHTML
};

function flowControlCardV480(s){
  ensureFlowV480(s);return`<div class="card flow-card-v480"><div class="split"><div><div class="title">⚙️ Điều khiển ván — AUTO / CONTROL</div><div class="muted tiny">AUTO tự chạy P1 → P7; CONTROL giữ toàn bộ nút can thiệp hiện có. P7 luôn dừng để Host xác nhận thị trường kế.</div></div><span class="badge">${s.flowMode==='auto'?'AUTO':'CONTROL'}</span></div><div class="flow-mode-grid-v480"><button class="flow-mode-v480 ${s.flowMode==='auto'?'selected':''}" data-flow-v480="auto">🤖 AUTO<small>Tự chuyển P, tự mở P3 theo combo đề xuất, tự chốt P5, tự mở/chốt P6.</small></button><button class="flow-mode-v480 ${s.flowMode==='control'?'selected':''}" data-flow-v480="control">🎛 CONTROL<small>Host chủ động chuyển P và dùng P/s như cơ chế cũ. Đồng hồ vẫn dùng được.</small></button></div><div class="phase-duration-grid-v480">${Object.keys(PHASES).map(p=>`<div class="phase-duration-v480"><label>${p} · ${p==='P7'?'DỪNG':'THỜI LƯỢNG'}</label><input class="phaseDurationInputV480" data-phase="${p}" type="text" inputmode="numeric" value="${p==='P7'?'0:00':fmtTime(phaseDurationV480(s,p))}" ${p==='P7'?'disabled':''}></div>`).join('')}</div><button class="btn secondary big" id="applyPhaseDurationsV480" style="margin-top:9px">LƯU THỜI GIAN TỪNG P</button><div class="flow-status-v480 ${s.flowMode}">${s.flowMode==='auto'?`🤖 AUTO đang bật · ${s.phase==='P7'?'đã dừng tại P7, chờ Host xác nhận.':`hết giờ ${s.phase} hệ thống sẽ tự xử lý bước tiếp theo.`}`:`🎛 CONTROL đang bật · Host quyết định thời điểm chuyển P; các cơ chế tự động nền không ép chuyển pha.`}</div></div>`
}

/* ---------- Host primary actions under the new flow ---------- */
hostPrimaryAction=function(s){
  if(s.phase==='P3')return`<div class="p3-wait-v480"><b>🔨 P3 — ĐẤU GIÁ</b><div class="tiny" style="margin-top:4px">${s.flowMode==='auto'?'AUTO sẽ dùng thuật toán nhu cầu để tạo combo và mở đấu giá. Host vẫn có thể dùng nút P/s để chuẩn bị thủ công khi ở CONTROL.':'Dùng nút “P/s — CHUẨN BỊ ĐẤU GIÁ” để xem đề xuất, thêm/sửa combo rồi mở tất cả cùng lúc.'}</div></div>`;
  if(s.phase==='P4')return`<div class="notice trade-phase-v480" style="margin-top:10px"><b>💬 P4 — GIAO DỊCH TỰ DO.</b> Người chơi có thể mua/bán/thương lượng và thay đổi dự án mục tiêu. Deal ALL ưu tiên người hoàn tất trước.</div>`;
  if(s.phase==='P5')return`<div class="notice p5-lock-v480" style="margin-top:10px"><b>🔒 P5 — CHỐT DỰ ÁN.</b> Mỗi người chốt dự án đủ tài nguyên hoặc từ chối. AUTO sẽ tự chốt các dự án hợp lệ khi hết giờ.</div>`;
  if(s.phase==='P6')return`<div class="p6-procurement-v480" style="margin-top:10px;padding:12px;border-radius:12px"><div class="split"><b>⚔️ P6 — ĐẤU THẦU & THANH TOÁN</b><button class="btn good" id="finalizeP6V480">CHỐT & THANH TOÁN NGAY</button></div>${hostP5AuctionPanel(s)}<div class="tiny muted" style="margin-top:7px">Dự án có ≥2 người đủ điều kiện được mở đấu thầu tự động khi vào P6. AUTO: hết giờ sẽ tự điền mức tối đa cho người chưa gửi, giá thấp nhất thắng; hòa giá được xử lý theo người gửi sớm hơn để ván không bị kẹt.</div></div>`;
  if(s.phase==='P7'){
    if(s.round>=5)return`<div class="market-decision"><b>Đã hoàn thành Thị trường 5/5.</b><div class="muted">AUTO dừng tại đây. Host xác nhận tổng kết.</div><button class="btn good big" id="finishGameBtn" style="margin-top:10px">🏆 TỔNG KẾT & VINH DANH</button></div>`;
    return`<div class="market-decision"><b>✅ AUTO đã dừng tại P7.</b><div class="muted" style="margin-top:4px">Chỉ khi Host xác nhận mới mở Thị trường ${s.round+1}.</div><div class="market-decision-grid"><button class="btn good big" id="nextRoundBtn">▶ XÁC NHẬN THỊ TRƯỜNG ${s.round+1}</button><button class="btn finish big" id="finishGameBtn">🏆 DỪNG & TỔNG KẾT</button></div></div>`
  }
  return''
};

/* ---------- Player phase behavior: P4 trade, P5 lock, P6 procurement ---------- */
projectCard=function(pr,s,opt={}){
  const names=Object.entries(s.players||{}).filter(([,pl])=>playerTargetsV475(pl,s).includes(pr.id)).map(([n,pl])=>`<span class="token">${esc(n)}${projectDecisionV475(pl,pr.id)==='locked'?' 🔒':''}</span>`).join('');
  const name=opt.name,p=name?s.players?.[name]:null,selected=!!p&&playerTargetsV475(p,s).includes(pr.id),wasP2=!!p&&p2TargetsV475(p,s).includes(pr.id),afterP2=['P3','P4','P5','P6','P7'].includes(s.phase),collapsed=!!name&&afterP2&&!wasP2&&!projectExpandedV475(name,s,pr.id),win=(s.results||[]).find(r=>r.round===s.round&&r.projectId===pr.id&&r.winner),canChoose=!!name&&['P2','P4'].includes(s.phase)&&!p?.bankrupt;
  const miss=p&&selected?shortageList(p,pr.need):[],decision=p?projectDecisionV475(p,pr.id):null;
  return`<div class="project v475-project ${selected?'selected':''} ${decision==='locked'?'locked':''} ${win?'winner':''} ${collapsed?'collapsed':''}" data-v475-project="${esc(pr.id)}" data-project="${esc(pr.id)}"><div class="v475-project-head projectExpandV475" role="button" tabindex="0" aria-expanded="${collapsed?'false':'true'}"><div class="v475-project-head-main"><b>${esc(pr.id)}</b><span class="v475-project-name">${esc(pr.name)}</span><span class="badge">TỐI ĐA ${Number(pr.reward)||0}M</span>${selected?'<span class="v475-target-chip">✓ ĐANG NHẮM</span>':''}</div><button type="button" class="v475-project-chevron" aria-label="${collapsed?'Mở chi tiết':'Thu gọn'}">${collapsed?'＋':'−'}</button></div><div class="v475-project-body"><div class="need">${needListHtml(pr.need)}</div>${selected?`<div class="target-gap-card ${miss.length?'':'ok'}"><div class="target-gap-title">${miss.length?'🎯 Phần bạn còn thiếu':'✅ Hiện đã đủ tài nguyên'}</div>${miss.length?miss.map(x=>`<div class="need-line"><span>${RES[x.k].icon} ${RES[x.k].label}</span><span class="need-qty">thiếu × ${x.missing}</span></div>`).join(''):'<div class="tiny">Tài nguyên được kiểm tra chính thức ở P5.</div>'}</div>`:''}<div class="tokens">${names||'<span class="muted tiny">Chưa có người nhắm dự án</span>'}</div>${canChoose?`<div class="v475-project-actions"><button type="button" class="btn ${selected?'bad':'good'} projectToggleV475" data-project="${esc(pr.id)}">${selected?'HỦY NHẮM DỰ ÁN':'NHẮM DỰ ÁN NÀY'}</button></div>`:''}${win?`<div class="success" style="margin-top:8px">🏆 ${esc(win.winner)} trúng thầu · nhận ${Number(win.paidAmount??win.payout??win.bid??pr.reward)||0}M</div>`:''}</div></div>`
};

toggleProjectSelectionV475=function(name,pid){
  const s=load(),p=s.players?.[name];if(!p||p.bankrupt||!['P2','P4'].includes(s.phase)||!projectById(s,pid))return;
  const ids=playerTargetsV475(p,s),at=ids.indexOf(pid),limit=projectChoiceLimitV475(s);
  if(at>=0){ids.splice(at,1);setPlayerTargetsV475(p,ids,s);logPush(s,`${name} hủy nhắm ${pid} trong ${s.phase}.`)}
  else{if(ids.length>=limit){alert(`Bạn được nhắm tối đa ${limit} dự án trong Thị trường ${s.round}.`);return}ids.push(pid);setPlayerTargetsV475(p,ids,s);setProjectExpandedV475(name,s,pid,true);logPush(s,`${name} nhắm ${pid} trong ${s.phase} (${ids.length}/${limit}).`)}
  save(s);render()
};

phaseAction=function(name,s){
  const p=s.players[name];if(p?.bankrupt)return`<div class="danger" style="margin-top:9px"><b>BẠN ĐÃ PHÁ SẢN.</b> Mọi thao tác trong game đã bị khóa.</div>`;
  if(s.phase==='P1')return`<div class="notice" style="margin-top:10px">🔎 Nghiên cứu dự án và thị trường.</div>`;
  if(s.phase==='P2')return selectedSummaryV475(name,s);
  if(s.phase==='P3')return`<div class="p3-wait-v480"><b>🔨 P3 — Đấu giá.</b><div class="tiny" style="margin-top:4px">${s.specialAuction?.active?'Phiên đấu giá đang diễn ra.':'Chờ Host mở phiên đấu giá hoặc AUTO khởi tạo combo đề xuất.'}</div></div>`;
  if(s.phase==='P4')return`<div class="notice trade-phase-v480" style="margin-top:10px"><b>💬 Giao dịch tự do.</b> Bạn có thể thương lượng và đổi dự án mục tiêu trước P5.</div>${selectedSummaryV475(name,s)}`;
  if(s.phase==='P5')return p4ActionV475(name,s);
  if(s.phase==='P6')return p5StageMessageV475(name,s);
  if(s.phase==='P7')return`<div class="success" style="margin-top:10px">Thị trường ${s.round} đã hoàn tất. Chờ Host xác nhận thị trường tiếp theo hoặc tổng kết.</div>`;
  return''
};

bindP4ActionsV475=function(name){
  document.querySelectorAll('.lockProjectV475').forEach(b=>b.onclick=()=>{const s=load(),p=s.players?.[name],pid=b.dataset.project;if(!p||s.phase!=='P5'||!playerTargetsV475(p,s).includes(pid)||!canLockProjectV475(p,s,pid))return;p.projectDecisions=p.projectDecisions||{};p.projectDecisions[pid]='locked';syncLegacyProjectFieldsV475(p,s);logPush(s,`${name} chốt dự án ${pid}.`);save(s);render()});
  document.querySelectorAll('.declineProjectV475').forEach(b=>b.onclick=()=>{const s=load(),p=s.players?.[name],pid=b.dataset.project;if(!p||s.phase!=='P5'||!playerTargetsV475(p,s).includes(pid))return;p.projectDecisions=p.projectDecisions||{};p.projectDecisions[pid]='declined';syncLegacyProjectFieldsV475(p,s);logPush(s,`${name} từ chối dự án ${pid}.`);save(s);render()})
};

const _bidCardV480Base=bidCard;
bidCard=function(name,s){if(s.phase!=='P6')return'';return _bidCardV480Base(name,s)};

playerBlockedAtPhaseV476=function(){return false};
phaseGateV476=function(){return''};

const _playerViewV480Base=playerView;
playerView=function(name){
  const s=load(),html=_playerViewV480Base(name);if(s.gameOver||s.specialAuction?.active)return html;
  const box=document.createElement('div');box.innerHTML=html;const main=box.querySelector('.app > .grid.grid-2'),left=main?.children[0],right=main?.children[1];
  if(s.phase==='P3'){
    box.querySelector('#p3TradeComposer')?.remove();box.querySelector('#tradeInboxCardV463')?.remove();box.querySelector('#tradeAdvicePanelV473')?.remove();box.querySelector('#projectBidGroupV475')?.remove();
  }
  if(s.phase==='P4'){
    if(left&&!left.querySelector('#p3TradeComposer'))left.insertAdjacentHTML('beforeend',tradeComposer(name,s));
    if(right&&!right.querySelector('#tradeInboxCardV463'))right.insertAdjacentHTML('beforeend',tradeInbox(name,s));
  }
  if(s.phase==='P5'&&left){
    const status=[...left.children].find(x=>x.querySelector?.('.phase')),action=status?.querySelector('.v475-p4-list,.v475-static-stage');
    if(action){const card=document.createElement('div');card.className='card p5-lock-v480';card.appendChild(action);const asset=left.querySelector('.money')?.closest('.card');(asset||status)?.insertAdjacentElement('afterend',card)}
  }
  if(s.phase==='P6'&&left&&!left.querySelector('#projectBidGroupV475'))left.insertAdjacentHTML('beforeend',bidCard(name,s));
  return box.innerHTML
};

/* ---------- Trade phase moves P3 -> P4 ---------- */
const _sendTradeOfferV480Base=sendTradeOffer;
sendTradeOffer=async function(name){
  const s=load();if(s.phase!=='P4'){alert('Giao dịch tự do diễn ra ở P4.');return}
  reserveTradeSeqV47();persistTradeDraft(name);const d=tradeDraft(name,s),kind=d.kind,target=d.to,res=d.res,qty=d.qty,price=d.money,message=String(d.message||'').trim(),actor=s.players[name];
  if(kind==='buy'&&actor.money<price){alert('Bạn không đủ tiền cho đề nghị mua này.');return}if(kind==='sell'&&(Number(actor.res?.[res])||0)<qty){alert('Bạn không đủ tài nguyên để bán.');return}
  const verb=kind==='buy'?'MUA':'BÁN',who=target==='ALL'?'TẤT CẢ':target,ok=await uiConfirmV46({title:`XÁC NHẬN GỬI ${verb}`,tone:kind==='buy'?'buy':'sell',rows:[['Tài nguyên',`${RES[res].icon} ${RES[res].label} ×${qty}`],['Đối tác',who],['Tổng giá',`${price}M`]],message:kind==='sell'?(message?message+'\n\n':'')+'Tài nguyên sẽ được giữ riêng ngay khi gửi và tự hoàn lại nếu giao dịch không thành.':message,confirmText:`GỬI ${verb}`});if(!ok)return;
  const id=s.seq++,all=target==='ALL',trade={schema:2,id,rootId:id,round:s.round,mode:all?'all':'direct',originType:kind,initiator:name,target:all?'ALL':target,res,qty,price,proposer:name,recipient:all?null:target,buyer:kind==='buy'?name:(all?null:target),seller:kind==='sell'?name:(all?null:target),stage:'root',status:'pending',responses:{},branchWith:all?null:target,createdAt:Date.now(),message};
  if(kind==='sell'&&!reserveTradeInventoryV476(s,trade,name)){alert('Tồn kho vừa thay đổi, không thể giữ đủ tài nguyên cho đơn bán.');return}s.trades.push(trade);logPush(s,`${name} gửi #${id} ${verb} ${RES[res].label} ×${qty} ${all?'cho ALL':`với ${target}`} · ${price}M${kind==='sell'?' (đã giữ hàng)':''}.`);save(s);render()
};

async function closeNegotiationRootV480(t,decision='accepted'){
  if(!ROOM?.id||!SB||!t)return;try{await SB.rpc('close_negotiation_root',{p_room_id:ROOM.id,p_root_trade_id:Number(t.rootId),p_member_token:accessIsAdmin()?null:currentMemberToken(),p_admin_token:accessIsAdmin()?ADMIN_TOKEN:null,p_decision:decision});await broadcastRoomSignal('negotiation_changed',{rootId:t.rootId,reason:decision})}catch(e){console.warn('close negotiation root v480',e)}
}

acceptTrade=async function(name,id){
  const s=load(),t=s.trades.find(x=>x.id===id);if(s.phase!=='P4'){alert('Chỉ chấp nhận giao dịch trong P4.');return}if(!canRespondToTrade(name,t)){render();return}
  const err=executeTrade(s,t,name);if(err){alert(err);return}save(s);await closeNegotiationRootV480(t,'accepted_elsewhere');render()
};

sendCounterOffer=withNegotiationCommitV465(async function(name,id,newPrice,message=''){
  reserveTradeSeqV47();const s=load(),t=s.trades.find(x=>x.id===id);newPrice=Number(newPrice);if(s.phase!=='P4'){alert('Thương lượng tự do diễn ra ở P4.');return}if(!Number.isFinite(newPrice)||newPrice<0){alert('Giá thương lượng không hợp lệ.');return}if(!canRespondToTrade(name,t)){render();return}
  const parties=tradeParties(t,name),buyer=parties.buyer,seller=parties.seller;if(!buyer||!seller)return;const root=tradeRootV476(s,t),sellerCovered=heldReservationV476(root,seller);if(name===buyer&&Number(s.players[name].money)<newPrice){alert('Bạn không đủ tiền cho giá thương lượng này.');return}if(name===seller&&!sellerCovered&&(Number(s.players[name].res?.[t.res])||0)<Number(t.qty)){alert('Bạn không còn đủ tài nguyên cho đề nghị này.');return}
  const other=name===buyer?seller:buyer,ok=await uiConfirmV46({title:'GỬI PHẢN HỒI THƯƠNG LƯỢNG?',rows:[['Vai trò',name===buyer?'MUA':'BÁN'],['Giá mới',`${newPrice}M`],['Gửi đến',other]],message:String(message||'').trim(),confirmText:'GỬI GIÁ MỚI'});if(!ok)return;
  if(name===seller&&!sellerCovered&&!reserveTradeInventoryV476(s,root,seller)){alert('Không thể giữ đủ tài nguyên cho phản hồi bán này.');return}
  if(String(message||'').trim()){try{await sendNegotiationMessage(name,t,message)}catch(e){alert('Không gửi được tin nhắn: '+(e.message||e));return}}
  const branchWith=root.mode==='all'?(root.initiator===name?other:name):(t.branchWith||other);if(t.mode==='all'&&t.stage==='root'){t.responses=t.responses||{};t.responses[name]='negotiating'}else{t.status='superseded';if(root.mode==='all'){root.responses=root.responses||{};root.responses[branchWith]='negotiating'}}
  const nid=s.seq++;s.trades.push({schema:2,id:nid,rootId:t.rootId,round:s.round,mode:t.mode,originType:t.originType,initiator:root.initiator,target:root.target,res:t.res,qty:t.qty,price:newPrice,proposer:name,recipient:other,buyer,seller,stage:'counter',status:'pending',responses:{},branchWith,createdAt:Date.now(),parentId:t.id});logPush(s,`💬 ${name} thương lượng lại giao dịch #${t.rootId}: ${newPrice}M.`);save(s);render();setTimeout(()=>refreshNegotiationHistories(name),120)
});

/* ---------- Smart P/s recommendations ---------- */
function ceil5V480(x){return Math.max(1,Math.ceil(Math.max(0,Number(x)||0)/5)*5)}
function playerNeedProfileV480(name,s){
  const p=s.players?.[name],ids=playerTargetsV475(p,s),need=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,0]));let reward=0;
  for(const pid of ids){const pr=projectById(s,pid);if(!pr)continue;reward+=Number(pr.reward)||0;for(const k of RESOURCE_KEYS)need[k]+=Number(pr.need?.[k])||0}
  const missing=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,Math.max(0,(need[k]||0)-(Number(p?.res?.[k])||0))]));return{ids,need,missing,reward}
}
function globalShortageV480(s){
  const out=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,0]));for(const name of Object.keys(s.players||{})){const x=playerNeedProfileV480(name,s);for(const k of RESOURCE_KEYS)out[k]+=x.missing[k]||0}return out
}
function lotPriceRangeV480(s,lot){
  const prices=auctionPriceMapV45(s),base=Math.max(10,Number(s.branchMarket?.price)||Number(s.setup?.branchStartPrice)||50);let ref=0;
  if(lot.kind==='resources')for(const [k,q] of Object.entries(lot.items||{}))ref+=(prices[k]||10)*(Number(q)||0);
  else if(lot.kind==='promo'){const avg=projects(s).reduce((a,p)=>a+(Number(p.reward)||0),0)/Math.max(1,projects(s).length);ref=Math.max(10,avg*(Number(lot.promoPercent)||10)/100*(Number(lot.promoQty)||1))}
  else if(lot.kind==='branch'){const q=Math.max(1,Number(lot.items?.qty)||1);ref=base*q*(lot.items?.branchMode==='specific'?1.6:1)}
  const min=ceil5V480(ref*.55),max=Math.max(min,ceil5V480(ref*.85));return{ref:Math.round(ref),min,max,start:ceil5V480(ref*.68)}
}
function buildAuctionRecommendationsV480(s){
  ensureFlowV480(s);const names=Object.keys(s.players||{}),active=activeResourceKeys(s),short=globalShortageV480(s),sorted=active.slice().sort((a,b)=>(short[b]||0)-(short[a]||0)||a.localeCompare(b)),recs=[];
  const categories=['resources','branch-universal','promo','branch-specific'];const targetCount=Math.min(20,Math.max(4,names.length));
  for(let i=0;i<targetCount;i++){
    const name=names[i%Math.max(1,names.length)]||'Hệ thống',p=s.players?.[name],profile=p?playerNeedProfileV480(name,s):{missing:{},ids:[],reward:0},cat=categories[i%categories.length];let lot,reason;
    if(cat==='resources'){
      const items={};if(i===0){for(const k of active)items[k]=1}
      const personal=active.slice().sort((a,b)=>(profile.missing[b]||0)-(profile.missing[a]||0));for(const k of personal.slice(0,2))if((profile.missing[k]||0)>0)items[k]=(items[k]||0)+Math.min(3,Math.max(1,profile.missing[k]));
      if(!Object.keys(items).length&&sorted[0])items[sorted[0]]=1;
      lot={kind:'resources',title:`Combo nhu cầu ${name}`,items,startPrice:10};reason=`Bám nhu cầu ${profile.ids.join(' · ')||'thị trường'}; ưu tiên phần thiếu của ${name}.`;
    }else if(cat==='branch-universal'){
      lot={kind:'branch',title:`Chi nhánh vạn năng · ${name}`,items:{branchMode:'universal',resource:null,qty:1},startPrice:10};reason=`Người thắng nhận 1 chi nhánh tự chuyển thành đúng doanh nghiệp của họ — hữu ích khi nhu cầu phân tán.`;
    }else if(cat==='promo'){
      const pct=Math.min(30,10+Math.max(0,s.round-1)*5);lot={kind:'promo',title:`Phiếu tăng doanh thu +${pct}%`,promoPercent:pct,promoQty:1,startPrice:10};reason=`Tạo lựa chọn chiến lược khác tài nguyên, phù hợp người đang theo dự án giá trị cao.`;
    }else{
      const r=sorted.find(k=>k!==p?.businessId)||sorted[0]||active[0];lot={kind:'branch',title:`Chi nhánh ${RES[r]?.label||r}`,items:{branchMode:'specific',resource:r,qty:1},startPrice:10};reason=`Nguồn thiếu nổi bật hiện tại: ${RES[r]?.icon||''} ${RES[r]?.label||r}. Chi nhánh cụ thể giúp tăng cung về sau.`;
    }
    const range=lotPriceRangeV480(s,lot);lot.startPrice=range.start;recs.push({id:`R${i+1}`,owner:name,lot,reason,range})
  }
  return recs
}
function auctionLotItemsLabelV480(lot){
  if(lot.kind==='promo')return`🎟️ ${Number(lot.promoQty)||1} mã × +${Number(lot.promoPercent)||0}%`;
  if(lot.kind==='branch'){const q=Math.max(1,Number(lot.items?.qty)||1);return lot.items?.branchMode==='specific'?`🏪 ${q} chi nhánh ${RES[lot.items?.resource]?.icon||''} ${RES[lot.items?.resource]?.label||lot.items?.resource}`:`🏪 ${q} chi nhánh VẠN NĂNG`}
  return psItemsLabelV45(lot.items)
}

psPrepPanelV45=function(s){
  const d=readPsPrepV45(),active=activeResourceKeys(s),recs=buildAuctionRecommendationsV480(s);return`<div class="card ps-prep" id="psPrepPanel"><div class="split"><div><div class="title">P/s — CHUẨN BỊ ĐẤU GIÁ</div><div class="muted tiny">Thuật toán đọc số người, doanh nghiệp, dự án đang nhắm, phần thiếu và tỷ giá hiện tại. Đề xuất chỉ để tăng tốc; Host vẫn quyết định toàn bộ giá và combo.</div></div><button class="btn secondary" id="closePsPrepV45">ĐÓNG P/s</button></div><div class="smart-recs-v480"><div class="split"><b>🧠 Combo đề xuất theo tình hình game</b><span class="badge">${recs.length} ĐỀ XUẤT</span></div><div class="smart-rec-grid-v480">${recs.map(r=>`<div class="smart-rec-v480"><div class="split"><b>${esc(r.lot.title)}</b><span class="badge">${esc(r.owner)}</span></div><div class="tiny">${auctionLotItemsLabelV480(r.lot)}</div><div class="reason">${esc(r.reason)}</div><div class="range">Khoảng giá hợp lý: ${r.range.min}–${r.range.max}M · đề xuất mở ${r.lot.startPrice}M</div><button class="btn good addSmartLotV480" data-rec="${r.id}">+ THÊM COMBO ĐỀ XUẤT</button></div>`).join('')}</div></div><div class="grid grid-2" style="margin-top:10px"><div class="field"><label>Loại combo tự tạo</label><select id="psLotKindV45"><option value="resources">📦 COMBO TÀI NGUYÊN</option><option value="promo">🎟️ PHIẾU KHUYẾN MẠI</option><option value="branch">🏪 CHI NHÁNH</option></select></div><div class="field"><label>Thời gian phiên đấu giá (giây)</label><input id="psDurationV45" type="number" min="5" max="3600" value="${Math.max(5,Number(d.duration)||phaseDurationV480(s,'P3')||60)}"></div></div><div id="psResourceEditorV45"><div class="ps-resource-grid">${active.map(k=>`<div class="ps-resource-row"><span>${RES[k].icon} ${RES[k].label}</span><input class="psResQtyV45" data-res="${k}" type="number" min="0" value="0"></div>`).join('')}</div><div class="ps-suggestion" id="psSuggestionV45">Chọn số lượng tài nguyên để hệ thống tính khoảng giá.</div></div><div id="psPromoEditorV45" class="hidden"><div class="grid grid-2"><div class="field"><label>% KHUYẾN MẠI / mã</label><input id="psPromoPctV45" type="number" min="1" max="200" value="10"></div><div class="field"><label>Số mã người thắng nhận</label><input id="psPromoQtyV45" type="number" min="1" max="20" value="1"></div></div></div><div id="psBranchEditorV480" class="branch-editor-v480 hidden"><div class="branch-editor-grid-v480"><div class="field"><label>Loại chi nhánh</label><select id="psBranchModeV480"><option value="universal">VẠN NĂNG — theo doanh nghiệp người thắng</option><option value="specific">CỤ THỂ — Host chọn loại</option></select></div><div class="field"><label>Chi nhánh cụ thể</label><select id="psBranchResV480">${active.map(k=>`<option value="${k}">${RES[k].icon} ${RES[k].label}</option>`).join('')}</select></div><div class="field"><label>Số lượng</label><input id="psBranchQtyV480" type="number" min="1" max="20" value="1"></div></div><div class="ps-suggestion" id="psBranchSuggestionV480"></div></div><div class="grid grid-2"><div class="field"><label>Tên combo</label><input id="psLotTitleV45" placeholder="VD: Combo cứu nguồn cung"></div><div class="field"><label>Giá khởi điểm Host quyết định (M)</label><input id="psStartPriceV45" type="number" min="0" value="10"></div></div><button class="btn secondary big" id="addPsLotV45">+ THÊM COMBO VÀO PHIÊN</button><div class="ps-queue">${(d.lots||[]).length?(d.lots||[]).map((lot,i)=>`<div class="ps-queue-item"><div class="split"><b>#${i+1} ${esc(lot.title)}</b><button class="btn bad removePsLotV45" data-i="${i}">XÓA</button></div><div class="tiny" style="margin-top:4px">${auctionLotItemsLabelV480(lot)} · Khởi điểm <b>${lot.startPrice}M</b></div></div>`).join(''):'<div class="muted">Chưa có combo nào trong phiên.</div>'}</div>${(d.lots||[]).length?`<button class="btn ps-launch-btn big" id="startPsAuctionV45" style="margin-top:10px">▶ BẮT ĐẦU ĐẤU GIÁ ${d.lots.length} COMBO</button>`:''}</div>`
};

function updateBranchSuggestionV480(){
  const s=load(),mode=document.getElementById('psBranchModeV480')?.value||'universal',res=document.getElementById('psBranchResV480')?.value,qty=Math.max(1,Number(document.getElementById('psBranchQtyV480')?.value)||1),lot={kind:'branch',items:{branchMode:mode,resource:mode==='specific'?res:null,qty}},range=lotPriceRangeV480(s,lot),el=document.getElementById('psBranchSuggestionV480');if(el)el.innerHTML=`Khoảng giá thuật toán: <b>${range.min}–${range.max}M</b> · mức mở tham khảo <b>${range.start}M</b>. Host có thể đặt bất kỳ giá nào.`;return range
}

bindPsPrepV45=function(){
  const open=document.getElementById('openPsPrepV45');if(open)open.onclick=()=>{const d=readPsPrepV45();d.open=true;writePsPrepV45(d);render()};
  const close=document.getElementById('closePsPrepV45');if(close)close.onclick=()=>{const d=readPsPrepV45();d.open=false;writePsPrepV45(d);render()};
  const kind=document.getElementById('psLotKindV45'),switchKind=()=>{const k=kind?.value||'resources';document.getElementById('psResourceEditorV45')?.classList.toggle('hidden',k!=='resources');document.getElementById('psPromoEditorV45')?.classList.toggle('hidden',k!=='promo');document.getElementById('psBranchEditorV480')?.classList.toggle('hidden',k!=='branch');if(k==='branch'){const r=updateBranchSuggestionV480(),sp=document.getElementById('psStartPriceV45');if(sp&&Number(sp.value)===10)sp.value=String(r.start)}};if(kind){kind.onchange=switchKind;switchKind()}
  document.querySelectorAll('.psResQtyV45').forEach(i=>i.oninput=()=>{const {suggested}=updatePsSuggestionV45();const start=document.getElementById('psStartPriceV45');if(start&&Number(start.value)===10&&suggested>0)start.value=String(suggested)});
  for(const id of ['psBranchModeV480','psBranchResV480','psBranchQtyV480'])document.getElementById(id)?.addEventListener('change',updateBranchSuggestionV480);
  document.querySelectorAll('.addSmartLotV480').forEach(b=>b.onclick=()=>{const rec=buildAuctionRecommendationsV480(load()).find(x=>x.id===b.dataset.rec);if(!rec)return;const d=readPsPrepV45();d.lots=d.lots||[];if(d.lots.length>=20){alert('Một phiên tối đa 20 combo.');return}d.lots.push(deep(rec.lot));d.open=true;writePsPrepV45(d);render()});
  const dur=document.getElementById('psDurationV45');if(dur)dur.onchange=()=>{const d=readPsPrepV45();d.duration=Math.max(5,Number(dur.value)||60);writePsPrepV45(d)};
  const add=document.getElementById('addPsLotV45');if(add)add.onclick=()=>{const d=readPsPrepV45(),k=kind?.value||'resources',title=String(document.getElementById('psLotTitleV45')?.value||'').trim(),start=Math.max(0,Number(document.getElementById('psStartPriceV45')?.value)||0);let lot;if(k==='resources'){const items={};document.querySelectorAll('.psResQtyV45').forEach(i=>{const q=Math.max(0,Math.floor(Number(i.value)||0));if(q>0)items[i.dataset.res]=q});if(!Object.keys(items).length){alert('Chọn ít nhất 1 tài nguyên và số lượng > 0.');return}lot={kind:'resources',title:title||`Combo ${psItemsLabelV45(items)}`,items,startPrice:start}}else if(k==='promo'){const pct=Math.max(1,Math.min(200,Number(document.getElementById('psPromoPctV45')?.value)||10)),qty=Math.max(1,Math.min(20,Math.floor(Number(document.getElementById('psPromoQtyV45')?.value)||1)));lot={kind:'promo',title:title||`Phiếu KM +${pct}%`,promoPercent:pct,promoQty:qty,startPrice:start}}else{const mode=document.getElementById('psBranchModeV480')?.value||'universal',res=document.getElementById('psBranchResV480')?.value,qty=Math.max(1,Math.min(20,Math.floor(Number(document.getElementById('psBranchQtyV480')?.value)||1)));lot={kind:'branch',title:title||(mode==='universal'?`Chi nhánh vạn năng ×${qty}`:`Chi nhánh ${RES[res]?.label||res} ×${qty}`),items:{branchMode:mode,resource:mode==='specific'?res:null,qty},startPrice:start}}
    d.lots=d.lots||[];if(d.lots.length>=20){alert('Một phiên tối đa 20 combo.');return}d.lots.push(lot);d.duration=Math.max(5,Number(dur?.value)||d.duration||60);d.open=true;writePsPrepV45(d);render()};
  document.querySelectorAll('.removePsLotV45').forEach(b=>b.onclick=()=>{const d=readPsPrepV45();d.lots.splice(Number(b.dataset.i),1);writePsPrepV45(d);render()});
  const start=document.getElementById('startPsAuctionV45');if(start)start.onclick=()=>{start.disabled=true;start.textContent='ĐANG MỞ ĐẤU GIÁ...';startPsAuctionV45().catch(e=>{alert('Không bắt đầu được đấu giá: '+(e.message||e));start.disabled=false;start.textContent='▶ BẮT ĐẦU ĐẤU GIÁ'})};updatePsSuggestionV45();updateBranchSuggestionV480()
};

startPsAuctionV45=async function(){
  const d=readPsPrepV45();if(!d.lots?.length)return;const duration=Math.max(5,Math.min(3600,Number(document.getElementById('psDurationV45')?.value)||Number(d.duration)||60));d.duration=duration;writePsPrepV45(d);const {data,error}=await SB.rpc('start_market_auction_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_duration_seconds:duration,p_lots:d.lots});if(error)throw error;writePsPrepV45({open:false,duration,lots:[]});await fetchRoomLatest();await broadcastRoomSignal('state_changed',{reason:'ps_started'});await broadcastRoomSignal('market_auction_changed',{auctionId:data});render()
};

auctionLotItemsHtmlV45=function(lot){
  if(lot.kind==='promo')return`<div class="ps-item-line"><span>🎟️ Phiếu KHUYẾN MẠI</span><b>${lot.promoQty} mã × +${Number(lot.promoPercent)||0}%</b></div>`;
  if(lot.kind==='branch'){const q=Math.max(1,Number(lot.items?.qty)||1),specific=lot.items?.branchMode==='specific',r=lot.items?.resource;return`<div class="ps-item-line"><span>🏪 ${specific?'Chi nhánh CỤ THỂ':'Chi nhánh VẠN NĂNG'}</span><b>×${q}</b></div>${specific?`<div class="ps-item-line"><span>${RES[r]?.icon||''} ${RES[r]?.label||r}</span><b>Host đã chọn</b></div>`:`<div class="tiny muted">Khi trúng, chi nhánh tự trở thành đúng loại doanh nghiệp của người thắng.</div>`}`}
  return Object.entries(lot.items||{}).filter(([,q])=>Number(q)>0).map(([k,q])=>`<div class="ps-item-line"><span>${RES[k]?.icon||''} ${RES[k]?.label||k}</span><b>×${q}</b></div>`).join('')
};

const _auctionLotCardV480Base=auctionLotCardV45;
auctionLotCardV45=function(lot,role,name,ended=false){const html=_auctionLotCardV480Base(lot,role,name,ended),box=document.createElement('div');box.innerHTML=html;if(lot.kind==='branch')box.firstElementChild?.classList.add('auction-branch-v480');return box.innerHTML};

const _auctionStageV480Base=auctionStageV45;
auctionStageV45=function(s,role,name=null){let html=_auctionStageV480Base(s,role,name);if(s.phase==='P3'){html=html.replace(/P hiện tại P3 đang tạm dừng\. Kết thúc P\/s sẽ quay lại đúng trạng thái trước đó\./g,'Đây là phiên đấu giá chính thức của P3. AUTO sẽ chuyển sang P4 khi phiên kết thúc.')}return html};

/* ---------- Phase transitions + AUTO engine ---------- */
const _changePhaseV480Base=changePhase;
changePhase=function(s,ph){
  ensureFlowV480(s);const before=s.phase,wasRunning=!!s.timer?.running;const out=_changePhaseV480Base(s,ph);ensureFlowV480(s);if(before!==ph){setPhaseTimerV480(s,ph,s.flowMode==='auto'||wasRunning);logPush(s,`⏱ ${ph} dùng thời lượng ${phaseDurationLabelV480(s,ph)}.`);save(s);if(ph==='P3'&&s.flowMode==='auto')setTimeout(()=>startAutoP3AuctionV480().catch(e=>console.warn('auto P3',e)),100);if(ph==='P6')setTimeout(()=>ensureProcurementOpenV480().catch(e=>console.warn('auto open P6',e)),100)}return out
};

async function setFlowModeV480(mode){
  const s=load();mode=mode==='auto'?'auto':'control';if(s.flowMode===mode)return;s.flowMode=mode;logPush(s,`⚙️ Host chuyển chế độ điều khiển sang ${mode.toUpperCase()}.`);if(mode==='auto'&&s.phase!=='P7'){const rem=remainingTime(s);if(rem<=0||!s.timer?.running)setPhaseTimerV480(s,s.phase,true)}save(s);render();if(mode==='auto'&&s.phase==='P3'&&!s.specialAuction?.active)await startAutoP3AuctionV480();if(s.phase==='P6')await ensureProcurementOpenV480()
}
function parsePhaseDurationV480(v){const x=String(v||'').trim();if(/^\d+$/.test(x))return Math.min(3600,Number(x));const m=x.match(/^(\d{1,2}):([0-5]\d)$/);return m?Math.min(3600,Number(m[1])*60+Number(m[2])):null}
function applyPhaseDurationsV480(){
  const s=load();for(const el of document.querySelectorAll('.phaseDurationInputV480')){const p=el.dataset.phase;if(p==='P7')continue;const sec=parsePhaseDurationV480(el.value);if(sec===null){alert(`Thời gian ${p} không hợp lệ. Dùng MM:SS, ví dụ 2:30.`);el.focus();return}s.phaseDurations[p]=sec}s.phaseDurations.P7=0;const cur=phaseDurationV480(s,s.phase);if(s.phase!=='P7'){const running=!!s.timer?.running;setPhaseTimerV480(s,s.phase,running)}logPush(s,'⏱ Host cập nhật thời lượng riêng cho từng P.');save(s);render()
}

function autoLockProjectsV480(s){
  for(const [name,p] of Object.entries(s.players||{})){if(p.bankrupt)continue;p.projectDecisions=p.projectDecisions||{};const ids=playerTargetsV475(p,s);for(const pid of ids){if(projectDecisionV475(p,pid)==='locked')continue;if(canLockProjectV475(p,s,pid)){p.projectDecisions[pid]='locked';logPush(s,`🤖 AUTO chốt ${pid} cho ${name}.`)}else{p.projectDecisions[pid]='ineligible';logPush(s,`🤖 AUTO loại ${pid} của ${name}: không đủ tài nguyên.`)}}syncLegacyProjectFieldsV475(p,s)}return s
}

async function closeAllNegotiationsV480(){if(!ROOM?.id||!SB||!ADMIN_TOKEN)return;try{await SB.rpc('close_all_negotiations_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_decision:'P4_closed'});await broadcastRoomSignal('negotiation_changed',{reason:'P4_closed'})}catch(e){console.warn('close all negotiation',e)}}

async function startAutoP3AuctionV480(){
  const s=load();if(V480_AUTO_BUSY||s.flowMode!=='auto'||s.phase!=='P3'||s.specialAuction?.active||!ROOM?.id||!SB)return;V480_AUTO_BUSY=true;try{const recs=buildAuctionRecommendationsV480(s).slice(0,20),lots=recs.map(r=>deep(r.lot)),duration=Math.max(5,phaseDurationV480(s,'P3')||60);if(!lots.length){await enterPhaseV480('P4',true);return}const {data,error}=await SB.rpc('start_market_auction_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_duration_seconds:duration,p_lots:lots});if(error)throw error;logPush(s,`🤖 AUTO P3 tạo ${lots.length} combo theo nhu cầu và mở đấu giá ${duration}s.`);save(s);await fetchRoomLatest();await broadcastRoomSignal('state_changed',{reason:'auto_p3_started'});await broadcastRoomSignal('market_auction_changed',{auctionId:data});render()}finally{V480_AUTO_BUSY=false}
}

async function ensureProcurementOpenV480(){
  const s=load();if(s.phase!=='P6'||!ROOM?.id||!SB||!ADMIN_TOKEN)return;const root=ensureAuctionStateRoot(s);let changed=false;
  for(const pr of projects(s)){const parts=eligibleProjectContenders(s,pr.id);if(parts.length<2||auctionState(s,pr.id))continue;const {data,error}=await SB.rpc('open_project_auction_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_round:s.round,p_project_id:pr.id,p_participants:parts});if(error)throw error;const row=Array.isArray(data)?data[0]:data;root[pr.id]={participants:row?.participants||parts,status:'open',bidRound:Number(row?.bid_round)||1};logPush(s,`⚔️ Tự mở đấu thầu ${pr.id} cho ${parts.join(', ')}.`);changed=true}
  if(changed){save(s);await broadcastRoomSignal('state_changed',{reason:'P6_auctions_opened'});render()}
}

async function finalizeP6V480(autoMode=true){
  if(V480_AUTO_BUSY)return false;const s=load();if(s.phase!=='P6'||!ROOM?.id||!SB||!ADMIN_TOKEN)return false;V480_AUTO_BUSY=true;try{await ensureProcurementOpenV480();const fresh=load();const {data,error}=await SB.rpc('finalize_project_auctions_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_round:fresh.round,p_auto_mode:!!autoMode});if(error)throw error;const rows=Array.isArray(data?.results)?data.results:[];
    if(!autoMode&&rows.some(r=>r.status==='waiting'||r.status==='tie_rebid')){const root=ensureAuctionStateRoot(fresh);for(const r of rows){if(r.status==='tie_rebid')root[r.project_id]={participants:r.participants||[],status:'open',bidRound:Number(r.bid_round)||1}}logPush(fresh,'⚠️ CONTROL: còn lượt đấu thầu chưa hoàn tất; chưa thanh toán.');save(fresh);render();return false}
    const out=[];for(const pr of projects(fresh)){const parts=eligibleProjectContenders(fresh,pr.id);if(!parts.length){out.push({round:fresh.round,projectId:pr.id,winner:null,bid:0,payout:0,competitive:false,solo:false,competitors:[]});continue}if(parts.length===1){out.push({round:fresh.round,projectId:pr.id,winner:parts[0],bid:0,payout:Number(pr.reward)||0,competitive:false,solo:true,competitors:parts});continue}const r=rows.find(x=>String(x.project_id)===String(pr.id));const bid=Number(r?.winning_bid)||0;out.push({round:fresh.round,projectId:pr.id,winner:r?.winner||null,bid,payout:bid,competitive:true,solo:false,competitors:parts,autoFilled:r?.auto_filled||[]})}
    fresh.results=(fresh.results||[]).filter(r=>r.round!==fresh.round).concat(out);for(const r of out)if(r.autoFilled?.length)logPush(fresh,`🤖 ${r.projectId}: người chưa gửi giá được AUTO dùng mức tối đa: ${r.autoFilled.join(', ')}.`);if(settleProjectsCore(fresh)){fresh.timer={duration:0,remaining:0,endAt:null,running:false,expired:true,autoPassed:{}};logPush(fresh,'✅ P6 tự chốt giá thấp nhất, thanh toán tất cả dự án trúng và chuyển P7.');save(fresh);await broadcastRoomSignal('state_changed',{reason:'P6_finalized'});render();return true}return false
  }finally{V480_AUTO_BUSY=false}
}

async function enterPhaseV480(ph,autoRun=false){
  const s=load(),before=s.phase;if(before===ph)return;_changePhaseV480Base(s,ph);setPhaseTimerV480(s,ph,autoRun&&ph!=='P7');logPush(s,`🤖 ${before} → ${ph}${autoRun?' tự động':''}.`);save(s);await broadcastRoomSignal('state_changed',{reason:`phase_${ph}`}).catch(()=>{});render();if(ph==='P3'&&s.flowMode==='auto')setTimeout(()=>startAutoP3AuctionV480().catch(e=>console.warn(e)),80);if(ph==='P6')setTimeout(()=>ensureProcurementOpenV480().catch(e=>console.warn(e)),80)
}

async function autoPhaseEndV480(){
  if(V480_AUTO_BUSY)return;const s=load();if(s.flowMode!=='auto'||s.phase==='P7'||s.specialAuction?.active)return;V480_AUTO_BUSY=true;try{
    if(s.phase==='P1'){V480_AUTO_BUSY=false;await enterPhaseV480('P2',true);return}
    if(s.phase==='P2'){captureP2TargetsV475(s);save(s);V480_AUTO_BUSY=false;await enterPhaseV480('P3',false);return}
    if(s.phase==='P3'){V480_AUTO_BUSY=false;await enterPhaseV480('P4',true);return}
    if(s.phase==='P4'){expireOpenTrades(s,s.round);save(s);await closeAllNegotiationsV480();V480_AUTO_BUSY=false;await enterPhaseV480('P5',true);return}
    if(s.phase==='P5'){autoLockProjectsV480(s);if(s._g526)localStorage.setItem(STATE_KEY,JSON.stringify(s));else save(s);V480_AUTO_BUSY=false;await enterPhaseV480('P6',true);return}
    if(s.phase==='P6'){V480_AUTO_BUSY=false;await finalizeP6V480(true);return}
  }finally{V480_AUTO_BUSY=false}
}

/* Official P3 AUTO auction ends -> P4 automatically. Manual P/s still returns normally. */
finishPsAuctionV45=async function(force=false){
  if(AUCTION_FINISHING||!ROOM?.id)return;AUCTION_FINISHING=true;try{const rpc=force&&accessIsAdmin()?'finish_market_auction_admin':'finish_market_auction_if_due',args=force&&accessIsAdmin()?{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id}:{p_room_id:ROOM.id,p_member_token:accessIsAdmin()?null:currentMemberToken(),p_admin_token:accessIsAdmin()?ADMIN_TOKEN:null};const {data,error}=await SB.rpc(rpc,args);if(error)throw error;if(data?.ok){AUCTION_SNAPSHOT=null;await fetchRoomLatest();await broadcastRoomSignal('state_changed',{reason:'ps_finished'});render()}}catch(e){if(force)alert('Không kết thúc được đấu giá: '+(e.message||e))}finally{AUCTION_FINISHING=false}
};

/* ---------- Timer tick: phase timer authority, no legacy threshold jumps ---------- */
timerTick=function(){
  const s=load(),rem=remainingTime(s);document.querySelectorAll('#timerText').forEach(el=>{el.textContent=fmtTime(rem);el.classList.toggle('expired',rem<=0)});document.querySelectorAll('.game-elapsed').forEach(el=>{if(!el.id){const running=!!(s.realtimeClock?.running&&!s.gameOver);el.textContent=(running?'⏱':'⏸')+' REALTIME '+fmtElapsed(elapsedSeconds(s));el.classList.toggle('running',running);el.classList.toggle('paused',!running)}});patchBankLiveV476?.();refreshHostBidsV476?.();
  if(ROOM?.id&&session?.role!=='host')return;
  let changed=false;if(processRealtimeEconomy(s,Date.now()))changed=true;if(changed){save(s);render();return}
  if(s.flowMode==='auto'&&s.timer?.running&&rem<=0&&!s.specialAuction?.active){s.timer.running=false;s.timer.remaining=0;s.timer.endAt=null;s.timer.expired=true;if(s._g526)localStorage.setItem(STATE_KEY,JSON.stringify(s));else save(s);autoPhaseEndV480().catch(e=>{console.error('AUTO phase',e);alert('AUTO gặp lỗi: '+(e.message||e))});return}
  if(s.flowMode==='control'&&s.timer?.running&&rem<=0){pauseGameClock(s);s.timer.running=false;s.timer.remaining=0;s.timer.endAt=null;s.timer.expired=true;logPush(s,`⏱ ${s.phase} hết giờ. CONTROL đang bật nên chờ Host quyết định.`);if(s._g526)localStorage.setItem(STATE_KEY,JSON.stringify(s));else save(s);render()}
};

/* ---------- Host binding ---------- */
const _hostViewV480Base=hostView;
hostView=function(){const s=load(),html=_hostViewV480Base();if(s.gameOver||s.specialAuction?.active)return html;const box=document.createElement('div');box.innerHTML=html;const left=box.querySelector('.host-dashboard > .stack');if(left&&!box.querySelector('.flow-card-v480')){const timer=left.querySelector('.timer-card');if(timer)timer.insertAdjacentHTML('afterend',flowControlCardV480(s))}return box.innerHTML};

const _bindHostV480Base=bindHost;
bindHost=function(){_bindHostV480Base();document.querySelectorAll('[data-flow-v480]').forEach(b=>b.onclick=()=>setFlowModeV480(b.dataset.flowV480).catch(e=>alert(e.message||e)));const apply=document.getElementById('applyPhaseDurationsV480');if(apply)apply.onclick=applyPhaseDurationsV480;const fin=document.getElementById('finalizeP6V480');if(fin)fin.onclick=()=>finalizeP6V480(false).catch(e=>alert('Không chốt được P6: '+(e.message||e)));if(load().phase==='P6')ensureProcurementOpenV480().catch(e=>console.warn(e))};

/* ---------- P6 bid helpers move from P5 to P6 ---------- */
let HOST_BIDS_FLIGHT_V511=null;
refreshHostBidsV476=async function(force=false){
  if(session?.role!=='host'||load().phase!=='P6'||!ROOM?.id||!SB||!ADMIN_TOKEN)return;
  const scope=ROOM.id+':'+load().round;
  if(HOST_BIDS_FLIGHT_V511?.scope===scope)return HOST_BIDS_FLIGHT_V511.promise;
  if(!force&&Date.now()-HOST_BIDS_AT_V476<1400)return;
  HOST_BIDS_AT_V476=Date.now();
  const s=load();
  const flight=(async()=>{try{
    const {data,error}=await SB.rpc('get_project_auction_bids_admin',{
      p_admin_token:ADMIN_TOKEN,
      p_room_id:ROOM.id,
      p_round:s.round
    });
    if(error)throw error;
    if(ROOM?.id+':'+load().round!==scope)return;
    HOST_BIDS_V476=Array.isArray(data)?data:[];
    HOST_BIDS_ERROR_V476='';
    patchHostLiveBidsV476();
  }catch(e){
    if(ROOM?.id+':'+load().round!==scope)return;
    const m=String(e?.message||e);
    HOST_BIDS_ERROR_V476=/schema cache|PGRST202/i.test(m)
      ?'Hãy chạy file SQL V4.8.0 trên Supabase rồi tải lại trang.'
      :m;
    patchHostLiveBidsV476();
  }})();
  HOST_BIDS_FLIGHT_V511={scope,promise:flight};
  try{return await flight}finally{if(HOST_BIDS_FLIGHT_V511?.promise===flight)HOST_BIDS_FLIGHT_V511=null}
};
bidEditingV475=function(){if(session?.role!=='player'||!BID_EDIT_PID_V475||Date.now()>=BID_EDIT_UNTIL_V475)return false;const s=load(),p=s.players?.[session.name],a=auctionState(s,BID_EDIT_PID_V475),card=[...document.querySelectorAll('[data-v475-bid-island]')].find(x=>x.dataset.v475BidIsland===BID_EDIT_PID_V475);if(!card||s.phase!=='P6'||p?.bankrupt||!a||Number(card.dataset.round)!==Number(s.round)||Number(card.dataset.bidRound)!==Number(a.bidRound)||auctionSubmittedLocal(session.name,s,BID_EDIT_PID_V475,a.bidRound)){BID_EDIT_PID_V475=null;BID_EDIT_UNTIL_V475=0;return false}return true};

bankBorrowAllowedV475=function(s){return ['P1','P2','P3','P4','P6'].includes(s.phase)||!!s.specialAuction?.active};

/* ---------- Direct branch market follows the old free-trade window: P2 + new P4 ---------- */
const _setupViewV480BranchPhaseBase=setupView;
setupView=function(){return _setupViewV480BranchPhaseBase()
  .replace(/người chơi được mua chi nhánh trong P1–P3; P4–P7 khóa mua\./g,'người chơi được mua chi nhánh trong P2 và P4; P3 dành riêng cho đấu giá, P5–P7 khóa mua.')
  .replace(/P4–P7 không được mua thêm chi nhánh/g,'P3 và P5–P7 không được mua thêm chi nhánh')};

const _branchPurchaseCardV480PhaseBase=branchPurchaseCard;
branchPurchaseCard=function(name,s){
  if(s.setup?.branchEnabled===false)return'';
  const viewState=s.phase==='P4'?{...s,phase:'P3'}:s.phase==='P3'?{...s,phase:'P5'}:s;
  let html=_branchPurchaseCardV480PhaseBase(name,viewState);
  if(!html)return html;
  html=html.replace(/P4–P7 không được mua thêm chi nhánh/g,'P3 và P5–P7 không được mua thêm chi nhánh');
  return html
};

const _bindBranchUIV480PhaseBase=bindBranchUI;
bindBranchUI=function(name){
  _bindBranchUIV480PhaseBase(name);
  const buy=document.getElementById('buyBranch'),res=document.getElementById('branchRes'),qty=document.getElementById('branchQty');
  if(!buy||!res||!qty)return;
  const old=buy.onclick;
  buy.onclick=e=>{
    const s=load();
    if(s.phase==='P3'){alert('P3 là phiên đấu giá. Mua chi nhánh trực tiếp sẽ mở lại ở P4.');return}
    if(s.phase!=='P4')return old?.call(buy,e);
    const p=s.players?.[name];if(!p||!s.branchMarket?.enabled)return;
    if(s.branchMarket.frozen){alert('Host đang đóng băng bán chi nhánh.');return}
    const base=Math.max(0,Number(s.branchMarket.price)||0);if(base<=0){alert('Thị trường chi nhánh đang hết hàng.');return}
    const r=res.value,q=Math.floor(Number(qty.value)||0);
    if(!r||!RES[r]){alert('Hãy chọn loại chi nhánh.');return}
    if(!Number.isInteger(q)||q<=0){alert('Số lượng chi nhánh phải là số nguyên lớn hơn 0.');return}
    const own=r===p.businessId,unit=own?base:base*3,cost=unit*q;
    if((Number(p.money)||0)<cost){alert(`Bạn cần ${cost}M nhưng hiện chỉ có ${p.money}M.`);return}
    p.money=Number(p.money||0)-cost;if(!Array.isArray(p.branches))p.branches=[];
    for(const b of p.branches){if(!Number.isFinite(Number(b.boughtAtActiveMs)))b.boughtAtActiveMs=activeElapsedMsNow(s);if(!Number.isFinite(Number(b.produced)))b.produced=0}
    p.branches.push({res:r,count:q,boughtAt:Date.now(),boughtAtActiveMs:activeElapsedMsNow(s),cyclesCredited:0,produced:0,unitPrice:unit,baseUnitPrice:base,cost});
    logPush(s,`🏪 ${name} mua ${q} chi nhánh ${RES[r].label} với ${cost}M${own?' (đúng thế mạnh)':` (ngoài thế mạnh · ${unit}M/chi nhánh)`}.`);
    writeBranchReceiptV476(name,s,{res:r,qty:q,cost});save(s);render()
  }
};

/* ---------- Branch direct-buy confirmation: one green line, short-lived, no flashing ---------- */
readBranchReceiptV476=function(name,s){try{const x=JSON.parse(sessionStorage.getItem(branchReceiptKeyV476(name,s))||'null');return x&&Date.now()-Number(x.at)<4500?x:null}catch(e){return null}};
const _branchPurchaseCardV480Base=branchPurchaseCard;
branchPurchaseCard=function(name,s){const html=_branchPurchaseCardV480Base(name,s);if(!html)return html;const box=document.createElement('div');box.innerHTML=html;const card=box.firstElementChild;if(!card)return html;card.querySelectorAll('.branch-success-v476').forEach((x,i)=>{if(i>0)x.remove()});const receipt=readBranchReceiptV476(name,s);if(receipt&&!card.querySelector('.branch-success-v476'))card.insertAdjacentHTML('beforeend',`<div class="branch-success-v476">✓ Mua thành công ${receipt.qty} chi nhánh ${RES[receipt.res]?.icon||''} ${esc(RES[receipt.res]?.label||receipt.res)} · ${receipt.cost}M.</div>`);return card.outerHTML};

/* If direct branch purchase was disabled in Setup, auction-earned branches still produce,
   but the direct-purchase card remains hidden. */
const _branchPurchaseCardV480Visibility=branchPurchaseCard;
branchPurchaseCard=function(name,s){if(s.setup?.branchEnabled===false)return'';return _branchPurchaseCardV480Visibility(name,s)};
const _branchMarketHostCardV480Base=branchMarketHostCard;
branchMarketHostCard=function(s){if(s.setup?.branchEnabled===false)return'';return _branchMarketHostCardV480Base(s)};

/* ---------- Next market preserves flow settings and waits only for Host confirmation ---------- */
const _nextRoundV480Base=nextRound;
nextRound=function(){const before=load(),mode=before.flowMode,durations=deep(before.phaseDurations);const out=_nextRoundV480Base();const s=load();s.flowMode=mode;s.phaseDurations=durations;setPhaseTimerV480(s,'P1',mode==='auto');logPush(s,`✅ Host xác nhận Thị trường ${s.round}. ${mode==='auto'?'AUTO bắt đầu P1.':'CONTROL chờ Host bấm chạy.'}`);save(s);render();return out};

/* ---------- Version ---------- */
const _loginViewV480Base=loginView;
loginView=function(){return _loginViewV480Base().replace(/V4\.7\.6\.3 Multiplayer/g,'V4.8.0 Multiplayer')};
document.title=document.title.replace(/V4\.7\.6\.3/g,'V4.8.0');
