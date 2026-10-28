/* =========================================================
   C1.1 — INVESTMENT ECONOMY + STABLE INPUT/RESPONSIVE PATCH
   Additive compatibility layer over V4.8.1.
   ========================================================= */
const C1_VERSION='C1.1';
const C1_MAX_MARKETS=10;
const C1_PROPERTY_CAPACITY_PER_M2=10;
const C1_SHARE_TOTAL=100;
let C1_EDITING_UNTIL=0;
let C1_EDITING_NODE=null;
let C1_EDITING_PHASE=null;
let C1_SETUP_CASH_STEP=100;
let C1_ACTION_BUSY=false;

(function installC1Styles(){
  const st=document.createElement('style');st.id='c1-styles';st.textContent=`
    :root{--c1-buy:#2563eb;--c1-sell:#dc2626;--c1-open:#15803d;--c1-ink:#0f172a}
    .c1-version{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:#111827;color:#fff;font-size:10px;font-weight:1000;letter-spacing:.08em;white-space:nowrap}
    .c1-money,.money,.ps-price,.branch-price,.trade-price-v476 strong,.exec-total{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-variant-numeric:tabular-nums;letter-spacing:-.025em}
    input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}input[type=number]{-moz-appearance:textfield}
    .c1-stepper{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:6px;align-items:stretch;width:100%}
    .c1-stepper>input{min-width:0;width:100%;text-align:right}
    .c1-step{border:1px solid;border-radius:10px;font-size:21px;font-weight:1000;line-height:1;cursor:pointer;min-height:42px}
    .c1-step.minus{color:#b91c1c;border-color:#fca5a5;background:#fff1f2}.c1-step.plus{color:#047857;border-color:#6ee7b7;background:#ecfdf5}
    .c1-disclosure{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:10px;padding:8px 11px;font-weight:950;white-space:nowrap}
    .c1-disclosure.open{border-color:#86efac;background:#f0fdf4;color:#166534}
    .c1-section-no{display:inline-grid;place-items:center;min-width:26px;height:26px;margin-right:6px;padding:0 7px;border-radius:8px;background:#0f172a;color:#fff;font-size:11px;font-weight:1000;vertical-align:middle}
    .c1-setup-quick{margin:12px 0;padding:12px;border:2px solid #93c5fd;border-radius:15px;background:linear-gradient(135deg,#eff6ff,#fff)}
    .c1-setup-quick-grid{display:grid;grid-template-columns:repeat(7,minmax(74px,1fr));gap:7px;margin-top:8px}.c1-setup-quick-grid button{min-height:40px}
    .setup-row{grid-template-columns:42px minmax(150px,.82fr) minmax(170px,1.25fr) minmax(130px,.66fr)!important}.setup-row .setupBiz{width:100%;min-width:0}.setup-money-field{min-width:0}
    .c1-invest-setup{border:2px solid #a78bfa;background:linear-gradient(135deg,#faf5ff,#fff);border-radius:15px;padding:12px;margin-top:12px}
    .c1-invest-card{border:2px solid #8b5cf6;background:linear-gradient(145deg,#faf5ff,#eff6ff 55%,#fff);overflow:hidden}
    .c1-invest-card .title{color:#5b21b6}.c1-invest-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:9px 0}
    .c1-stat{padding:9px;border:1px solid #ddd6fe;border-radius:12px;background:rgba(255,255,255,.84);font-size:11px}.c1-stat b{display:block;margin-top:3px;color:#312e81;font-size:16px}
    .c1-capacity{height:12px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin:8px 0}.c1-capacity span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#16a34a,#f59e0b,#dc2626)}
    .c1-invest-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.c1-property-market{padding:10px;border:1px solid #bae6fd;border-radius:13px;background:#f0f9ff;margin-top:9px}
    .c1-holdings{display:grid;gap:6px;margin-top:8px}.c1-holding{display:flex;justify-content:space-between;gap:8px;padding:7px 9px;border-radius:10px;background:#fff;border:1px solid #ddd6fe;font-size:12px}
    .c1-stock-price{color:#166534;font-weight:950}.c1-stock-income{color:#7c3aed;font-weight:850}
    .c1-trade-card{border:2px solid #a78bfa;background:#fff;border-radius:15px;padding:11px;margin-top:9px}.c1-trade-card.direct{border-color:#ef4444}.c1-trade-card.counter{border-color:#0ea5e9}.c1-trade-card.all{border-color:#f59e0b}
    .c1-trade-head{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}.c1-trade-msg{margin-top:7px;padding:7px 9px;border-radius:9px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px}
    .c1-trade-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.c1-trade-form .field{margin:0}.c1-divider-option{font-weight:900;color:#64748b}
    .c1-toast-stack{position:fixed;right:14px;top:82px;z-index:150;display:grid;gap:8px;width:min(360px,calc(100vw - 28px));pointer-events:none}.c1-toast{padding:11px 13px;border-radius:14px;color:#fff;font-weight:900;box-shadow:0 16px 40px rgba(15,23,42,.26);animation:c1toast .24s ease-out}.c1-toast.buy{background:#2563eb}.c1-toast.sell{background:#dc2626}.c1-toast.info{background:#0f766e}.c1-toast.error{background:#b91c1c}@keyframes c1toast{from{transform:translateX(18px);opacity:0}}
    .c1-p3-wait{position:fixed;inset:0;z-index:118;background:rgba(15,23,42,.9);display:grid;place-items:center;padding:18px}.c1-p3-wait-card{width:min(560px,100%);padding:28px;border:3px solid #f59e0b;border-radius:26px;background:#fff;text-align:center;box-shadow:0 30px 90px rgba(0,0,0,.45)}.c1-p3-wait-card .icon{font-size:56px}.c1-p3-wait-card h2{margin:8px 0;color:#9a3412}
    .ps-stage .ps-hero{position:sticky!important;top:0;z-index:44;box-shadow:0 12px 28px rgba(15,23,42,.24)}.ps-stage .bank-auction-dock-v475{left:14px!important;right:auto!important;bottom:14px!important;width:min(310px,calc(100vw - 92px))!important}
    .c11-auction-cash{display:inline-flex;align-items:center;gap:6px;margin-left:auto;padding:7px 10px;border-radius:12px;background:#fff;color:#0f172a;border:1px solid rgba(255,255,255,.7);box-shadow:0 5px 16px rgba(15,23,42,.16);font-size:12px;font-weight:850;white-space:nowrap}.c11-auction-cash b{font-size:16px;color:#047857}
    .c1-auction-tools{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.c1-auction-panel{position:relative;border:2px solid #93c5fd;background:#eff6ff;border-radius:15px;padding:12px;margin:8px 0}.c1-auction-panel .c1-panel-close{position:absolute;right:8px;top:8px;width:34px;height:34px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;font-weight:1000}
    .c1-project-notice{border:2px solid #f59e0b;background:#fffbeb;border-radius:11px;padding:9px 11px;margin-top:8px;color:#92400e;font-size:12px;font-weight:800}
    .c1-branch-body.hidden,.c1-invest-body.hidden,.c1-trade-body.hidden{display:none!important}.branch-card>.split{gap:9px;align-items:flex-start}.c1-branch-toggle{flex:0 0 auto}
    .c1-host-invest{border:2px solid #8b5cf6}.c1-host-company{padding:9px;border:1px solid #ddd6fe;border-radius:11px;background:#fff;margin-top:7px}.c1-host-company .split{align-items:flex-start}
    .c1-project-need{display:grid!important;grid-template-columns:minmax(104px,1fr) 40px minmax(74px,96px) 40px!important;gap:5px!important;align-items:center}.c1-project-need .qty{min-width:0!important;width:100%!important}.c1-project-need input{display:block!important;text-align:center!important;min-width:0!important;width:100%!important;max-width:100%!important;min-height:40px!important;padding:7px 5px!important;font-size:16px!important;line-height:1.15!important;font-weight:850!important}.c1-project-need .c1-step{width:40px!important;min-width:40px!important;min-height:40px!important;padding:0!important;font-size:19px!important}.host-project-editor .projectRewardInput{min-width:0!important;width:100%!important;font-size:16px!important;line-height:1.2!important;padding:8px!important;text-align:right!important}.c1-project-update{margin-top:9px;width:100%}
    .c11-phase-resets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:9px}.c11-phase-reset{min-height:50px;padding:8px!important}.c11-phase-reset span{display:block;font-size:10px;font-weight:700;margin-top:3px}.c11-phase-reset:disabled{opacity:.45;cursor:not-allowed}
    .c1-open-badge{background:#dcfce7!important;border-color:#86efac!important;color:#166534!important}
    .c1-property-lot{border-color:#06b6d4!important;background:linear-gradient(145deg,#ecfeff,#fff)!important}
    @media(max-width:900px){.c1-setup-quick-grid{grid-template-columns:repeat(4,minmax(70px,1fr))}.setup-row{grid-template-columns:42px minmax(0,1fr) minmax(0,1fr)!important}.setup-money-field{grid-column:2/4}.c1-invest-summary{grid-template-columns:1fr 1fr}}
    @media(max-width:767px){.setup-row{grid-template-columns:36px minmax(0,1fr)!important}.setup-row>.field{grid-column:2}.c1-setup-quick-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.c1-invest-summary,.c1-invest-actions,.c1-trade-form{grid-template-columns:1fr}.c1-toast-stack{top:72px;right:8px;width:calc(100vw - 16px)}.ps-stage .bank-auction-dock-v475{left:8px!important;right:auto!important;bottom:10px!important;width:min(270px,calc(100vw - 94px))!important}.ps-stage .ps-hero{top:0}.c1-auction-tools{display:grid;grid-template-columns:1fr 1fr}.c1-auction-tools button{width:100%}.c11-phase-resets{grid-template-columns:1fr 1fr}.host-project-grid{grid-template-columns:1fr!important}.c11-auction-cash{margin-left:0;padding:5px 8px}.c11-auction-cash b{font-size:14px}}
    @media(max-width:420px){.card{overflow-wrap:anywhere}.split{align-items:flex-start}.c1-stepper{grid-template-columns:42px minmax(0,1fr) 42px}.c1-invest-summary{grid-template-columns:1fr}.v475-project-head-main{display:grid;grid-template-columns:auto minmax(0,1fr)}.v475-project-head-main .badge{grid-column:1/3;width:max-content;max-width:100%}}
  `;document.head.appendChild(st)
})();

function c1RoundMoney(x){return Math.round((Number(x)||0)*10)/10}
function c1ParseNumber(value){
  let s=String(value??'').trim().replace(/[^0-9,.-]/g,'');if(!s)return 0;const neg=s.startsWith('-');s=s.replace(/-/g,'');const dot=s.lastIndexOf('.'),comma=s.lastIndexOf(',');
  if(dot>=0&&comma>=0){if(comma>dot)s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'')}
  else if(comma>=0)s=s.replace(/\./g,'').replace(',','.')
  else if(/^\d{1,3}(?:\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  const n=Number(s);return Number.isFinite(n)?(neg?-n:n):0
}
function c1FormatNumber(x){
  x=c1RoundMoney(x);const neg=x<0?'-':'';let [a,b]=String(Math.abs(x).toFixed(1)).split('.');if(b==='0')b='';a=a.replace(/\B(?=(\d{3})+(?!\d))/g,'.');return neg+a+(b?','+b:'')
}
function c1Money(x){return`${c1FormatNumber(x)}💵`}
function c1LocalizeText(text){
  if(!text||(!text.includes('M')&&!text.includes('m')))return text;
  return text.replace(/(-?\d+(?:[.,]\d+)?)\s*M(?![\p{L}\p{N}_])/gu,(_,n)=>c1Money(c1ParseNumber(n)))
    .replace(/\((?:M)\)/g,'(💵)').replace(/\bM\s*\/\s*(?=chi nhánh|phút|P|lần)/g,'💵/')
}
function c1LocalizeMoneyDom(root=document){
  if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.matches('script,style,input,textarea,option')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});const rows=[];while(walker.nextNode())rows.push(walker.currentNode);for(const n of rows){const v=c1LocalizeText(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}
  root.querySelectorAll?.('option').forEach(o=>{o.textContent=c1LocalizeText(o.textContent)});
  root.querySelectorAll?.('input,textarea,button,[title],[aria-label]').forEach(el=>{for(const attr of ['placeholder','title','aria-label']){const old=el.getAttribute?.(attr);if(old){const next=c1LocalizeText(old);if(next!==old)el.setAttribute(attr,next)}}if(el.tagName==='BUTTON'&&el.value){el.value=c1LocalizeText(el.value)}});
}
function c1Toast(message,tone='info'){
  let stack=document.querySelector('.c1-toast-stack');if(!stack){stack=document.createElement('div');stack.className='c1-toast-stack';document.body.appendChild(stack)}const el=document.createElement('div');el.className=`c1-toast ${tone}`;el.textContent=c1LocalizeText(String(message||''));stack.prepend(el);setTimeout(()=>el.remove(),4300)
}
function c1PushError(message){c1Toast(message,'error')}
function c1Roman(n){const a=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];return a[n-1]||String(n)}

/* ---------- Economy initialization and formulas ---------- */
const _normalizeSetupC1Base=normalizeSetup;
normalizeSetup=function(x){const money=Array.isArray(x?.players)?x.players.map(p=>Number(p.money)):[];x=_normalizeSetupC1Base(x);for(let i=0;i<x.players.length;i++)if(Number.isFinite(money[i]))x.players[i].money=Math.max(0,c1RoundMoney(money[i]));if(typeof x.investmentEnabled!=='boolean')x.investmentEnabled=false;x.maxMarkets=Math.max(1,Math.min(C1_MAX_MARKETS,Math.round(Number(x.maxMarkets)||5)));return x};

function c1ShareBook(s){
  const names=Object.keys(s.players||{}),book={};for(const company of names){book[company]={};for(const holder of names)book[company][holder]=company===holder?C1_SHARE_TOTAL:0}return book
}
function c1InitialPropertyM2(p){return Math.max(1,Math.ceil(sumRes(p.res||{})*5/C1_PROPERTY_CAPACITY_PER_M2))}
function c1EnsureInvestment(s){
  if(!s||typeof s!=='object')return s;s.setup=normalizeSetup(s.setup||loadSetup());s.investments=s.investments&&typeof s.investments==='object'?s.investments:{};const inv=s.investments;inv.schema=1;inv.enabled=typeof inv.enabled==='boolean'?inv.enabled:!!s.setup.investmentEnabled;inv.trades=Array.isArray(inv.trades)?inv.trades:[];inv.seq=Math.max(1,Number(inv.seq)||1);inv.dividends=Array.isArray(inv.dividends)?inv.dividends:[];inv.auctionAwards=Array.isArray(inv.auctionAwards)?inv.auctionAwards:[];inv.shares=inv.shares&&typeof inv.shares==='object'?inv.shares:c1ShareBook(s);
  const names=Object.keys(s.players||{});for(const company of names){inv.shares[company]=inv.shares[company]&&typeof inv.shares[company]==='object'?inv.shares[company]:{};for(const holder of names)if(!Number.isFinite(Number(inv.shares[company][holder])))inv.shares[company][holder]=company===holder?C1_SHARE_TOTAL:0}
  for(const [name,p] of Object.entries(s.players||{})){if(!Number.isFinite(Number(p.propertyM2)))p.propertyM2=c1InitialPropertyM2(p);p.propertyM2=Math.max(0,c1RoundMoney(p.propertyM2));p.shareIncome=p.shareIncome&&typeof p.shareIncome==='object'?p.shareIncome:{};for(const company of names)if(!Number.isFinite(Number(p.shareIncome[company])))p.shareIncome[company]=0}
  c1RefreshPropertyMarket(s);return s
}
function c1PropertyOwnedTotal(s){return Object.values(s.players||{}).reduce((t,p)=>t+(Number(p.propertyM2)||0),0)}
function c1ResourceValue(s,p){const rows=currentMarketMetrics(s).rows||[],prices=Object.fromEntries(rows.map(x=>[x.k,Number(x.price)||10]));return RESOURCE_KEYS.reduce((t,k)=>t+(Number(p?.res?.[k])||0)*(prices[k]||10),0)}
function c1CompanyValue(s,name){const p=s.players?.[name];if(!p)return 0;const branches=(p.branches||[]).reduce((t,b)=>t+(Number(b.cost)||0)*.7,0),debt=typeof bankBalanceV475==='function'?bankBalanceV475(p):0;return Math.max(1,c1RoundMoney((Number(p.money)||0)+c1ResourceValue(s,p)+branches-debt))}
function c1SharePrice(s,company){const n=Math.max(1,Object.keys(s.players||{}).length),activity=1+Math.min(.18,(n-3)*.015);return Math.max(.1,c1RoundMoney(c1CompanyValue(s,company)/C1_SHARE_TOTAL*activity))}
function c1RefreshPropertyMarket(s){
  if(!s?.investments)return;const inv=s.investments,players=Object.values(s.players||{}),cash=players.reduce((t,p)=>t+Math.max(0,Number(p.money)||0),0),resources=players.reduce((t,p)=>t+sumRes(p.res||{}),0),projectsValue=projects(s).reduce((t,p)=>t+(Number(p.reward)||0),0),owned=c1PropertyOwnedTotal(s),seedOwned=Math.max(0,Number(inv.property?.seedOwned)||owned),economicUnits=resources+cash/10+projectsValue/20,prior=Math.max(0,Number(inv.property?.total)||0),total=Math.max(owned,prior,Math.ceil(seedOwned*1.75),Math.ceil((economicUnits*1.45)/C1_PROPERTY_CAPACITY_PER_M2));const available=Math.max(0,c1RoundMoney(total-owned)),scarcity=total>0?1-available/total:1,avgRes=(currentMarketMetrics(s).rows||[]).reduce((t,x)=>t+(Number(x.price)||10),0)/Math.max(1,(currentMarketMetrics(s).rows||[]).length),buy=Math.max(.5,c1RoundMoney(avgRes*.28*(1+2.4*scarcity*scarcity))),discount=.30-.25*scarcity,sell=Math.max(.1,c1RoundMoney(buy*(1-discount)));inv.property={...(inv.property||{}),seedOwned,total,available,buyPrice:buy,sellPrice:sell,scarcity:c1RoundMoney(scarcity*100),updatedAt:Date.now()}
}
function c1Capacity(p){const owned=Math.max(0,Number(p?.propertyM2)||0),used=sumRes(p?.res||{}),capacity=Math.floor(owned*C1_PROPERTY_CAPACITY_PER_M2);return{owned,used,capacity,free:Math.max(0,capacity-used),ratio:capacity?Math.min(100,used/capacity*100):100}}
function c1CanReceiveResources(p,qty){return c1Capacity(p).free>=Math.max(0,Number(qty)||0)}
function c1ShareQty(s,company,holder){return Math.max(0,Number(s.investments?.shares?.[company]?.[holder])||0)}

const _normalizeStateC1Base=normalizeState;
normalizeState=function(s){return c1EnsureInvestment(_normalizeStateC1Base(s))};

const _makeRoundSnapshotC1Base=makeRoundSnapshot;
makeRoundSnapshot=function(s){return{..._makeRoundSnapshotC1Base(s),investments:deep(s.investments||null),setup:deep(s.setup||null)}};

const _initialStateC1Base=initialState;
initialState=function(setup=loadSetup()){
  setup=normalizeSetup(setup);const s=_initialStateC1Base(setup),avg=(setup.players||[]).reduce((t,p)=>t+(Number(p.money)||0),0)/Math.max(1,(setup.players||[]).length),own=Math.max(1,Math.round(avg*4/100)),other=Math.max(1,Math.round(avg/100)),names=setup.players||[];
  for(let i=0;i<names.length;i++){const e=names[i],p=s.players?.[e.name];if(!p)continue;p.money=Math.max(0,c1RoundMoney(e.money??p.money));for(const k of RESOURCE_KEYS)p.res[k]=0;p.res[e.businessId]=own;const candidates=names.map(x=>x.businessId).filter(k=>k!==e.businessId),k=candidates[(i+s.round)%Math.max(1,candidates.length)];if(k)p.res[k]=(p.res[k]||0)+other;p.refill={[e.businessId]:Math.max(1,Math.round(own*.75))}}
  s.setup=deep(setup);s.markets=buildScenarioMarketsC1(s);s.investments={schema:1,enabled:!!setup.investmentEnabled,trades:[],seq:1,dividends:[],auctionAwards:[],shares:c1ShareBook(s)};for(const p of Object.values(s.players||{}))p.propertyM2=c1InitialPropertyM2(p);c1EnsureInvestment(s);s.snapshots={'1':makeRoundSnapshot(s)};return s
};

function c1ProjectCount(n){return Math.max(1,Math.min(12,Math.floor(Math.max(1,n)*.70)))}
function c1RoundName(round,i){const names=SCENARIO_NAMES[((round-1)%5)+1]||SCENARIO_NAMES[1];return names[i%names.length]}
function c1BuildProjects(supply,n,round){
  const count=c1ProjectCount(n),needs=allocateNeeds(supply,count,round),demand=projectDemand(needs.map(need=>({need}))),prices=marketPriceRowsFrom(supply,demand,n),icons=['📈','🤝','🏙️','🏭','🌐','💼','📦','🚀','🏬','⚡','🧩','🏆'];return needs.map((need,i)=>{const range=rewardRangeFrom(need,prices),reward=ceil5((range.min+range.max)/2+(round-1)*10+i*4);return{id:`DA${round}${String(i+1).padStart(2,'0')}`,name:`${icons[i%icons.length]} ${c1RoundName(round,i)}`,reward,need}})
}
function buildScenarioMarketsC1(source){
  let setup,players;if(source?.players&&!Array.isArray(source.players)){players=source.players;setup=source.setup}else{setup=source&&Array.isArray(source.players)?source:loadSetup()}const n=players?Object.keys(players).length:setup.players.length,out={};for(let r=1;r<=C1_MAX_MARKETS;r++){const supply=players?playerSupply(players):setupSupply(setup,Math.min(r,5));out[r]=c1BuildProjects(supply,n,r)}return out
}
buildScenarioMarkets=function(source){return buildScenarioMarketsC1(source)};
buildCurrentRoundProjects=function(players,round){return c1BuildProjects(playerSupply(players),Object.keys(players||{}).length,round)};

/* ---------- Setup UI ---------- */
const _newSetupDraftC1Base=newSetupDraftV461;
newSetupDraftV461=function(){const d=_newSetupDraftC1Base(),cfg=normalizeSetup(loadSetup());d.investmentEnabled=!!cfg.investmentEnabled;d.maxMarkets=cfg.maxMarkets||5;for(let i=0;i<cfg.players.length;i++)if(d.players[i])d.players[i].money=Math.max(0,c1RoundMoney(cfg.players[i].money??d.players[i].money));return d};
const _syncSetupDraftC1Base=syncSetupDraftFromDomV461;
syncSetupDraftFromDomV461=function(){const d=_syncSetupDraftC1Base();document.querySelectorAll('.setupMoney').forEach((x,i)=>{if(d.players[i])d.players[i].money=String(x.value).trim()===''?80:Math.max(0,c1RoundMoney(c1ParseNumber(x.value)))});const yes=document.querySelector('.investmentToggleC1[data-value="yes"]');if(yes)d.investmentEnabled=yes.classList.contains('selected');const mm=document.getElementById('maxMarketsC1');if(mm)d.maxMarkets=Math.max(1,Math.min(C1_MAX_MARKETS,Math.round(Number(mm.value)||5)));return d};
const _applySetupDraftC1Base=applySetupDraftToDomV461;
applySetupDraftToDomV461=function(){const out=_applySetupDraftC1Base();const d=ensureSetupDraftV461();document.querySelectorAll('.setupMoney').forEach((x,i)=>{x.type='text';x.inputMode='decimal';x.autocomplete='off';if(d.players[i])x.value=c1FormatNumber(d.players[i].money??80)});return out};
const _saveSetupC1Base=saveSetup;
saveSetup=function(x){if(session?.role==='setup'&&SETUP_DRAFT_V461)x={...x,investmentEnabled:!!SETUP_DRAFT_V461.investmentEnabled,maxMarkets:SETUP_DRAFT_V461.maxMarkets||5};return _saveSetupC1Base(x)};

const _setupViewC1Base=setupView;
setupView=function(){
  const d=ensureSetupDraftV461();if(!('investmentEnabled' in d)){const cfg=normalizeSetup(loadSetup());d.investmentEnabled=!!cfg.investmentEnabled;d.maxMarkets=cfg.maxMarkets||5}const box=document.createElement('div');box.innerHTML=_setupViewC1Base();const shell=box.querySelector('.setup-shell');if(!shell)return box.innerHTML;
  box.querySelector('.setup-head .badge')?.insertAdjacentHTML('beforebegin','<span class="c1-version">BUILD C1.1</span>');const summary=box.querySelector('.setup-summary');if(summary)summary.insertAdjacentHTML('afterend',`<div class="c1-setup-quick"><b>💵 Cộng nhanh tiền cho TẤT CẢ người chơi</b><div class="muted tiny">Mỗi lần bấm sẽ cộng mức đã chọn vào giá trị hiện có của từng người. Ô tiền vẫn cho phép nhập tay.</div><div class="c1-setup-quick-grid">${[10,50,100,250,500,1000,1500].map(v=>`<button type="button" class="btn secondary c1CashAll" data-add="${v}">+${c1Money(v)}</button>`).join('')}</div></div>`);
  const bank=box.querySelector('.bank-setup-v475'),anchor=bank||box.querySelector('.setup-options');anchor?.insertAdjacentHTML('afterend',`<div class="c1-invest-setup"><div class="split"><div><b>🏙️ Cơ chế Đầu tư C1</b><div class="muted tiny">Bật chung Bất động sản + Cổ phiếu doanh nghiệp. 100 cổ phiếu = 100%; cổ tức lấy từ doanh thu dự án.</div></div><span class="badge">TÙY CHỌN</span></div><div class="toggle-row" style="margin-top:9px"><button type="button" class="toggle-choice investmentToggleC1 ${d.investmentEnabled?'selected':''}" data-value="yes">CÓ</button><button type="button" class="toggle-choice investmentToggleC1 ${!d.investmentEnabled?'selected':''}" data-value="no">KHÔNG</button></div><div class="field" style="margin-top:10px"><label>Số thị trường tối đa (1–10)</label><input id="maxMarketsC1" type="text" inputmode="numeric" value="${d.maxMarkets||5}"></div></div>`);
  box.querySelectorAll('.setupMoney').forEach((x,i)=>{x.type='text';x.inputMode='decimal';x.autocomplete='off';x.value=c1FormatNumber(d.players[i]?.money??c1ParseNumber(x.value))});box.querySelectorAll('.setup-head .sub,.scenario-note').forEach(x=>x.innerHTML=x.innerHTML.replace(/tối đa 5 (vòng|thị trường)/gi,'tối đa 10 thị trường'));return box.innerHTML
};

const _bindSetupC1Base=bindSetup;
bindSetup=function(){
  _bindSetupC1Base();const d=ensureSetupDraftV461();document.querySelectorAll('.investmentToggleC1').forEach(b=>b.onclick=()=>{d.investmentEnabled=b.dataset.value==='yes';d.dirty=true;document.querySelectorAll('.investmentToggleC1').forEach(x=>x.classList.toggle('selected',(x.dataset.value==='yes')===d.investmentEnabled))});const mm=document.getElementById('maxMarketsC1');if(mm)mm.oninput=()=>{mm.value=mm.value.replace(/\D/g,'');if(mm.value)d.maxMarkets=Math.max(1,Math.min(C1_MAX_MARKETS,Number(mm.value)))};
  document.querySelectorAll('.c1CashAll').forEach(b=>b.onclick=()=>{const add=Number(b.dataset.add)||0;document.querySelectorAll('.setupMoney').forEach((x,i)=>{const next=Math.max(0,c1RoundMoney(c1ParseNumber(x.value)+add));x.value=c1FormatNumber(next);if(d.players[i])d.players[i].money=next});d.dirty=true;c1Toast(`Đã cộng ${c1Money(add)} cho tất cả người chơi.`,'buy')});
  document.querySelectorAll('.setupMoney').forEach((x,i)=>{x.type='text';x.inputMode='decimal';x.value=c1FormatNumber(d.players[i]?.money??c1ParseNumber(x.value));x.oninput=()=>{if(d.players[i])d.players[i].money=Math.max(0,c1RoundMoney(c1ParseNumber(x.value)));d.dirty=true};x.onblur=()=>{x.value=c1FormatNumber(Math.max(0,c1ParseNumber(x.value)))}});
  const saveBtn=document.getElementById('saveSetupBtn');if(saveBtn)saveBtn.onclick=async()=>{const err=document.getElementById('setupError'),fail=msg=>{if(err){err.textContent=msg;err.classList.remove('hidden')}},hide=()=>err?.classList.add('hidden');hide();syncSetupDraftFromDomV461();const n=d.count,names=d.players.slice(0,n).map(x=>String(x.name||'').trim()),biz=d.players.slice(0,n).map(x=>x.businessId),money=d.players.slice(0,n).map(x=>Number.isFinite(Number(x.money))?Math.max(0,c1RoundMoney(x.money)):80);if(!Number.isInteger(n)||n<3||n>20)return fail('Số người chơi phải là số nguyên từ 3 đến 20.');if(names.some(x=>!x))return fail('Mỗi người chơi phải có tên.');if(new Set(names.map(x=>x.toLocaleLowerCase('vi'))).size!==names.length)return fail('Tên người chơi không được trùng nhau.');if(new Set(biz).size!==biz.length)return fail('Mỗi người cần một loại doanh nghiệp khác nhau.');const next={players:names.map((name,i)=>({name,businessId:biz[i],money:money[i]})),branchEnabled:!!d.branchEnabled,branchStartPrice:Math.max(0,Number(d.branchStartPrice)||0),loanEnabled:!!d.loanEnabled,loanDefaultMode:d.loanDefaultMode==='phase'?'phase':'minute',investmentEnabled:!!d.investmentEnabled,maxMarkets:Math.max(1,Math.min(C1_MAX_MARKETS,Math.round(Number(d.maxMarkets)||5))),startedAt:null};saveSetup(next);const fresh=initialState(next);fresh.gameControl={paused:false,roundWasRunning:false,realtimeWasRunning:false,pausedAt:null};localStorage.setItem(STATE_KEY,JSON.stringify(fresh));if(ROOM?.id){scheduleRoomPush(fresh);await broadcastRoomSignal('state_changed',{reason:'setup_new_game'}).catch(()=>{})}clearSetupDraftV461();logout()}
};

/* ---------- Property/share trade state ---------- */
function c1TradeRoot(s,t){return(s.investments?.trades||[]).find(x=>Number(x.id)===Number(t.rootId))||t}
function c1TradeIncoming(name,t){if(!t||t.status!=='pending')return false;if(t.mode==='all'&&t.stage==='root')return t.initiator!==name&&!['declined','closed'].includes(t.responses?.[name]);return t.recipient===name}
function c1TradeParties(t,actor){if(t.buyer&&t.seller)return{buyer:t.buyer,seller:t.seller};if(t.direction==='sell')return{seller:t.initiator,buyer:t.target==='ALL'?actor:t.target};return{buyer:t.initiator,seller:t.target==='ALL'?actor:t.target}}
function c1AssetAvailable(s,name,type,company){const p=s.players?.[name];if(type==='property'){const c=c1Capacity(p);return Math.max(0,c1RoundMoney(c.owned-Math.ceil(c.used/C1_PROPERTY_CAPACITY_PER_M2)))}return c1ShareQty(s,company,name)}
function c1HoldAsset(s,name,type,company,qty,root){if(c1AssetAvailable(s,name,type,company)<qty)return false;if(type==='property')s.players[name].propertyM2=c1RoundMoney(s.players[name].propertyM2-qty);else s.investments.shares[company][name]=c1RoundMoney(c1ShareQty(s,company,name)-qty);root.escrow={owner:name,assetType:type,company:company||null,qty,status:'held'};return true}
function c1ReleaseEscrow(s,root){const e=root?.escrow;if(!e||e.status!=='held')return;if(e.assetType==='property')s.players[e.owner].propertyM2=c1RoundMoney((Number(s.players[e.owner].propertyM2)||0)+e.qty);else s.investments.shares[e.company][e.owner]=c1RoundMoney(c1ShareQty(s,e.company,e.owner)+e.qty);e.status='released'}
function c1TransferHeld(s,root,buyer){const e=root?.escrow;if(!e||e.status!=='held')return false;if(e.assetType==='property')s.players[buyer].propertyM2=c1RoundMoney((Number(s.players[buyer].propertyM2)||0)+e.qty);else s.investments.shares[e.company][buyer]=c1RoundMoney(c1ShareQty(s,e.company,buyer)+e.qty);e.status='transferred';return true}
function c1ApplyLocalAction(s,actor,a){
  c1EnsureInvestment(s);const inv=s.investments,p=s.players?.[actor];if(!p||p.bankrupt)throw new Error('Người chơi không hợp lệ hoặc đã phá sản.');if(s.gameOver||s.gameControl?.paused)throw new Error('Game đang khóa thao tác.');const kind=a.kind;
  if(kind==='buy_property'||kind==='sell_property'){
    if(!['P1','P2','P4'].includes(s.phase))throw new Error('Mua/bán trực tiếp bất động sản chỉ mở ở P1, P2 và P4.');c1RefreshPropertyMarket(s);const q=c1RoundMoney(a.qty);if(!(q>0))throw new Error('Số m² phải lớn hơn 0.');if(kind==='buy_property'){const cost=c1RoundMoney(q*inv.property.buyPrice);if(q>inv.property.available)throw new Error('Thị trường không còn đủ bất động sản.');if((Number(p.money)||0)<cost)throw new Error('Bạn không đủ tiền.');p.money=c1RoundMoney(p.money-cost);p.propertyM2=c1RoundMoney(p.propertyM2+q);return{tone:'buy',message:`Đã mua ${q} m² bất động sản với ${c1Money(cost)}.`}}const max=c1AssetAvailable(s,actor,'property');if(q>max)throw new Error('Phần bất động sản này đang cần để chứa tồn kho, chưa thể bán.');const gain=c1RoundMoney(q*inv.property.sellPrice);p.propertyM2=c1RoundMoney(p.propertyM2-q);p.money=c1RoundMoney(p.money+gain);return{tone:'sell',message:`Đã bán lại ${q} m² bất động sản, nhận ${c1Money(gain)}.`}
  }
  if(kind==='offer'){
    if(!['P2','P4'].includes(s.phase))throw new Error('Giao dịch đầu tư chỉ mở ở P2 và P4.');const type=a.assetType==='property'?'property':'share',company=type==='share'?String(a.company||''):null,q=c1RoundMoney(a.qty),price=c1RoundMoney(a.price),target=a.target==='ALL'?'ALL':String(a.target||'');if(!(q>0)||price<0||!target||target===actor||(!s.players[target]&&target!=='ALL'))throw new Error('Thông tin đề nghị chưa hợp lệ.');if(type==='share'&&(!s.players[company]||!Number.isInteger(q)))throw new Error('Cổ phiếu dùng số nguyên và phải thuộc doanh nghiệp trong game.');const message=String(a.message||'').trim().slice(0,240),direction=a.direction==='sell'?'sell':'buy';if(inv.trades.some(t=>t.status==='pending'&&t.proposer===actor&&t.direction===direction&&t.target===target&&t.assetType===type&&t.company===company&&Number(t.qty)===q&&Number(t.price)===price&&String(t.message||'')===message))throw new Error('Đề nghị này trùng hoàn toàn một đề nghị đang chờ. Hãy đổi ít nhất một thông tin.');if(direction==='buy'&&(Number(p.money)||0)<price)throw new Error('Bạn không đủ tiền cho đề nghị mua.');const id=inv.seq++,t={id,rootId:id,round:s.round,mode:target==='ALL'?'all':'direct',stage:'root',status:'pending',direction,assetType:type,company,qty:q,price,initiator:actor,target,proposer:actor,recipient:target==='ALL'?null:target,buyer:direction==='buy'?actor:(target==='ALL'?null:target),seller:direction==='sell'?actor:(target==='ALL'?null:target),message,createdAt:Date.now(),responses:{}};if(direction==='sell'&&!c1HoldAsset(s,actor,type,company,q,t))throw new Error('Tài sản khả dụng vừa thay đổi, không đủ để giữ chỗ.');inv.trades.push(t);return{tone:direction==='buy'?'buy':'sell',message:`Đã gửi đề nghị ${direction==='buy'?'mua':'bán'} #${id}.`}
  }
  const t=inv.trades.find(x=>Number(x.id)===Number(a.tradeId)),root=t&&c1TradeRoot(s,t);if(!t||!c1TradeIncoming(actor,t))throw new Error('Đề nghị đã được xử lý hoặc không dành cho bạn.');
  if(kind==='decline'){if(t.mode==='all'&&t.stage==='root'){t.responses[actor]='declined'}else{t.status='declined';c1ReleaseEscrow(s,root)}return{tone:'sell',message:'Đã từ chối đề nghị.'}}
  const parties=c1TradeParties(t,actor),buyer=parties.buyer,seller=parties.seller;if(!buyer||!seller||buyer===seller)throw new Error('Không xác định được hai bên giao dịch.');
  if(kind==='counter'){
    const price=c1RoundMoney(a.price),message=String(a.message||'').trim().slice(0,240);if(price<0)throw new Error('Giá thương lượng không hợp lệ.');if(actor===buyer&&(Number(s.players[buyer].money)||0)<price)throw new Error('Bạn không đủ tiền cho mức giá này.');if(actor===seller&&!root.escrow&&!c1HoldAsset(s,seller,t.assetType,t.company,t.qty,root))throw new Error('Bạn không còn đủ tài sản để giữ chỗ.');t.status='superseded';const id=inv.seq++,other=actor===buyer?seller:buyer;inv.trades.push({...t,id,rootId:root.id,stage:'counter',mode:'direct',status:'pending',proposer:actor,recipient:other,buyer,seller,price,message,createdAt:Date.now(),parentId:t.id,responses:{},escrow:undefined});return{tone:actor===buyer?'buy':'sell',message:`Đã gửi giá thương lượng mới ${c1Money(price)}.`}
  }
  if(kind==='accept'){
    const bp=s.players[buyer];if((Number(bp.money)||0)<Number(t.price))throw new Error(`${buyer} không còn đủ tiền.`);if(!root.escrow){if(!c1HoldAsset(s,seller,t.assetType,t.company,t.qty,root))throw new Error(`${seller} không còn đủ tài sản.`)}bp.money=c1RoundMoney(bp.money-t.price);s.players[seller].money=c1RoundMoney((Number(s.players[seller].money)||0)+t.price);if(!c1TransferHeld(s,root,buyer))throw new Error('Không chuyển được tài sản giữ chỗ.');t.status='accepted';t.acceptedAt=Date.now();t.buyer=buyer;t.seller=seller;for(const x of inv.trades)if(x.rootId===root.id&&x.id!==t.id&&x.status==='pending')x.status='closed';root.status=root.id===t.id?'accepted':'closed';return{tone:buyer===actor?'buy':'sell',message:`Giao dịch #${t.id} hoàn tất: ${buyer} mua từ ${seller} với ${c1Money(t.price)}.`}
  }
  throw new Error('Thao tác không được hỗ trợ.')
}

async function c1CommitAction(actor,action){
  if(C1_ACTION_BUSY)return;C1_ACTION_BUSY=true;try{
    if(ROOM?.id&&SB){const request={roomId:ROOM.id,action,memberToken:accessIsAdmin()?null:currentMemberToken(),adminToken:accessIsAdmin()?ADMIN_TOKEN:null,adminPlayerName:accessIsAdmin()?actor:null},{data,error}=await SB.rpc('c11_apply_economy_action',{p_request:request});if(error){const m=String(error.message||error);if(/schema cache|PGRST202|Could not find the function/i.test(m))throw new Error('Máy chủ chưa nhận bản SQL C1.1. Hãy chạy file C1.1 SERVER COMPLETE PATCH trên Supabase rồi tải lại trang.');throw error}const row=Array.isArray(data)?data[0]:data;if(!row?.ok)throw new Error(row?.message||'Không cập nhật được giao dịch.');ROOM.revision=Number(row.revision)||ROOM.revision;storeRoom(ROOM);ROOM_BASE_STATE_V47=deep(row.state);localStorage.setItem(STATE_KEY,JSON.stringify(row.state));await broadcastRoomSignal('state_changed',{reason:'c11_economy'}).catch(()=>{});render();c1Toast(row.message||'Giao dịch hoàn tất.',row.tone||'info');return}
    const s=load(),out=c1ApplyLocalAction(s,actor,action);c1RefreshPropertyMarket(s);save(s);render();c1Toast(out.message,out.tone)
  }catch(e){c1PushError(c14VietnameseError(e));throw e}finally{C1_ACTION_BUSY=false}
}

function c1AssetLabel(t){return t.assetType==='property'?`🏙️ Bất động sản ×${t.qty} m²`:`📊 Cổ phiếu ${t.company} ×${t.qty}`}
function c1TradePriority(t){if(t.mode==='direct'&&t.stage==='root')return 1;if(t.stage==='counter')return 2;return 3}
function c1TradeCard(name,t){const p=c1TradeParties(t,name),incoming=c1TradeIncoming(name,t),cls=t.stage==='counter'?'counter':t.mode==='direct'?'direct':'all',verb=t.proposer===p.buyer?'MUA':'BÁN';return`<div class="c1-trade-card ${cls}"><div class="c1-trade-head"><div><b>${verb==='MUA'?'🔵 ĐỀ NGHỊ MUA':'🔴 ĐỀ NGHỊ BÁN'}</b> ${t.mode==='all'?'· 📣 ALL':t.stage==='counter'?'· 💬 THƯƠNG LƯỢNG':'· 🔒 RIÊNG'}</div><span class="badge">#${t.id}</span></div><div style="margin-top:7px"><b>${esc(c1AssetLabel(t))}</b> · tổng giá <b class="c1-money">${c1Money(t.price)}</b><br><span class="tiny muted">${esc(p.buyer||'?')} mua từ ${esc(p.seller||'?')}</span></div>${t.message?`<div class="c1-trade-msg">💬 ${esc(t.message)}</div>`:''}${incoming?`<div class="btn-row" style="margin-top:9px"><button class="btn good c1AcceptTrade" data-id="${t.id}">CHẤP NHẬN</button><button class="btn bad c1DeclineTrade" data-id="${t.id}">TỪ CHỐI</button><button class="btn secondary c1OpenCounter" data-id="${t.id}">THƯƠNG LƯỢNG</button></div><div class="counter-panel hidden c1-local-island" id="c1Counter-${t.id}"><div class="field"><label>Giá mới (💵)</label><input class="c1CounterPrice" data-id="${t.id}" type="text" inputmode="decimal" value="${t.price}"></div><div class="field"><label>Một lời nhắn duy nhất</label><textarea class="c1CounterMessage" data-id="${t.id}" maxlength="240"></textarea></div><button class="btn secondary big c1SendCounter" data-id="${t.id}">GỬI GIÁ + LỜI NHẮN</button></div>`:''}</div>`}

function c1InvestmentCard(name,s){
  if(!s.investments?.enabled)return'';const p=s.players[name],cap=c1Capacity(p),prop=s.investments.property||{},names=Object.keys(s.players||{}),holdings=names.filter(c=>c1ShareQty(s,c,name)>0),open=['P1','P2','P4'].includes(s.phase),tradeOpen=['P2','P4'].includes(s.phase);return`<div class="card c1-invest-card c1-local-island" id="c1InvestmentCard"><div class="split"><div><div class="title">🏙️ Tài sản đầu tư</div><div class="muted tiny">Bất động sản quyết định sức chứa; cổ phiếu chia doanh thu dự án theo tỷ lệ sở hữu.</div></div><button type="button" class="c1-disclosure open c1ToggleInvest">ĐÓNG</button></div><div class="c1-invest-body"><div class="c1-invest-summary"><div class="c1-stat">Bất động sản sở hữu<b>${c1FormatNumber(cap.owned)} m²</b></div><div class="c1-stat">Sức chứa đã dùng<b>${cap.used}/${cap.capacity}</b></div><div class="c1-stat">Còn chứa thêm<b>${cap.free} tài nguyên</b></div></div><div class="c1-capacity"><span style="width:${cap.ratio}%"></span></div><div class="tiny muted">Bạn sở hữu ${c1FormatNumber(cap.owned)}/${c1FormatNumber(c1PropertyOwnedTotal(s))} m² bất động sản hiện có của tất cả người chơi.</div><div class="c1-property-market"><div class="split"><div><b>Thị trường bất động sản liên tục</b><div class="tiny muted">Còn ${c1FormatNumber(prop.available||0)} m² · khan hiếm ${prop.scarcity||0}%</div></div><span class="badge c1-open-badge">${open?'ĐANG MỞ':'CHỈ XEM'}</span></div><div class="tiny" style="margin-top:6px">Giá mua <b>${c1Money(prop.buyPrice||0)}/m²</b> · bán lại <b>${c1Money(prop.sellPrice||0)}/m²</b></div>${open?`<div class="field"><label>Số m²</label><input id="c1PropertyQty" type="text" inputmode="decimal" value="1"></div><div class="c1-invest-actions"><button class="btn good" id="c1BuyProperty">MUA BẤT ĐỘNG SẢN</button><button class="btn bad" id="c1SellProperty">BÁN LẠI</button></div>`:'<div class="c1-project-notice">Trong P3 tài sản chỉ để xem; mua/bán trực tiếp mở lại ở P4.</div>'}</div><div class="c1-holdings"><b>📊 Danh mục cổ phiếu</b>${holdings.length?holdings.map(c=>`<div class="c1-holding"><span>${c===name?'Cổ phiếu của bạn':`Doanh nghiệp ${esc(c)}`} · <b>${c1ShareQty(s,c,name)}%</b></span><span><span class="c1-stock-price">${c1Money(c1SharePrice(s,c))}/phiếu</span><br><span class="c1-stock-income">Đã nhận ${c1Money(p.shareIncome?.[c]||0)}</span></span></div>`).join(''):'<div class="muted tiny">Chưa sở hữu cổ phiếu doanh nghiệp khác.</div>'}</div>${tradeOpen?c1InvestmentTradeComposer(name,s):'<div class="c1-project-notice">Mua bán cổ phiếu/bất động sản giữa người chơi chỉ mở ở P2 và P4.</div>'}</div></div>`
}
function c1InvestmentTradeComposer(name,s){const names=Object.keys(s.players||{});return`<div class="c1-trade-card c1-local-island" id="c1TradeComposer"><div class="split"><b>📨 Đề nghị giao dịch đầu tư</b><button type="button" class="c1-disclosure open c1ToggleTrade">ĐÓNG</button></div><div class="c1-trade-body"><div class="c1-trade-form" style="margin-top:9px"><div class="field"><label>Hành động</label><select id="c1TradeDirection"><option value="buy">MUA</option><option value="sell">BÁN</option></select></div><div class="field"><label>Gửi đến</label><select id="c1TradeTarget"><option value="ALL">📣 TẤT CẢ</option>${names.filter(n=>n!==name).map(n=>`<option value="${esc(n)}">🔒 ${esc(n)}</option>`).join('')}</select></div><div class="field"><label>Tài sản</label><select id="c1TradeAsset"><option value="property">🏙️ Bất động sản (m²)</option><option disabled>──────────</option>${names.map(n=>`<option value="share:${esc(n)}">📊 ${n===name?'Cổ phiếu của bạn':`Cổ phiếu ${esc(n)}`}</option>`).join('')}</select></div><div class="field"><label>Số lượng</label><input id="c1TradeQty" type="text" inputmode="decimal" value="1"></div><div class="field"><label>Tổng giá (💵)</label><input id="c1TradePrice" type="text" inputmode="decimal" value="10"></div><div class="field"><label>Lời nhắn duy nhất</label><input id="c1TradeMessage" maxlength="240" placeholder="Có thể để trống"></div></div><button class="btn good big" id="c1SendTrade" style="margin-top:9px">GỬI ĐỀ NGHỊ</button></div></div>`}
function c1InvestmentInbox(name,s){if(!s.investments?.enabled||!['P2','P4'].includes(s.phase))return'';const incoming=(s.investments.trades||[]).filter(t=>t.round===s.round&&c1TradeIncoming(name,t)).sort((a,b)=>c1TradePriority(a)-c1TradePriority(b)||(Number(b.createdAt)||0)-(Number(a.createdAt)||0));return`<div class="card c1-host-invest" id="c1InvestmentInbox"><div class="split"><div class="title">📨 Giao dịch đầu tư cần phản hồi</div>${incoming.length?`<span class="tap-badge">${incoming.length} MỚI</span>`:''}</div><div class="tiny muted">Ưu tiên: riêng → thương lượng riêng mới nhất → ALL mới nhất. Mỗi phản hồi chỉ có một lời nhắn.</div><div class="stack">${incoming.length?incoming.map(t=>c1TradeCard(name,t)).join(''):'<div class="muted" style="margin-top:8px">Chưa có đề nghị đầu tư chờ xử lý.</div>'}</div></div>`}

function c1BindInvestment(name){
  const q=()=>Math.max(0,c1ParseNumber(document.getElementById('c1PropertyQty')?.value));document.getElementById('c1BuyProperty')?.addEventListener('click',()=>c1CommitAction(name,{kind:'buy_property',qty:q()}).catch(()=>{}));document.getElementById('c1SellProperty')?.addEventListener('click',()=>c1CommitAction(name,{kind:'sell_property',qty:q()}).catch(()=>{}));
  document.getElementById('c1SendTrade')?.addEventListener('click',()=>{const raw=document.getElementById('c1TradeAsset')?.value||'property',share=raw.startsWith('share:'),qty=Math.max(0,c1ParseNumber(document.getElementById('c1TradeQty')?.value)),price=Math.max(0,c1ParseNumber(document.getElementById('c1TradePrice')?.value));c1CommitAction(name,{kind:'offer',direction:document.getElementById('c1TradeDirection')?.value||'buy',target:document.getElementById('c1TradeTarget')?.value||'ALL',assetType:share?'share':'property',company:share?raw.slice(6):null,qty,price,message:document.getElementById('c1TradeMessage')?.value||''}).catch(()=>{})});
  document.querySelectorAll('.c1AcceptTrade').forEach(b=>b.onclick=()=>c1CommitAction(name,{kind:'accept',tradeId:Number(b.dataset.id)}).catch(()=>{}));document.querySelectorAll('.c1DeclineTrade').forEach(b=>b.onclick=()=>c1CommitAction(name,{kind:'decline',tradeId:Number(b.dataset.id)}).catch(()=>{}));document.querySelectorAll('.c1OpenCounter').forEach(b=>b.onclick=()=>document.getElementById(`c1Counter-${b.dataset.id}`)?.classList.toggle('hidden'));document.querySelectorAll('.c1SendCounter').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.id),price=c1ParseNumber(document.querySelector(`.c1CounterPrice[data-id="${id}"]`)?.value),message=document.querySelector(`.c1CounterMessage[data-id="${id}"]`)?.value||'';c1CommitAction(name,{kind:'counter',tradeId:id,price,message}).catch(()=>{})});
  document.querySelector('.c1ToggleInvest')?.addEventListener('click',e=>{const body=document.querySelector('.c1-invest-body'),closed=!body?.classList.contains('hidden');body?.classList.toggle('hidden',closed);e.currentTarget.textContent=closed?'XEM':'ĐÓNG';e.currentTarget.classList.toggle('open',!closed)});document.querySelector('.c1ToggleTrade')?.addEventListener('click',e=>{const body=document.querySelector('.c1-trade-body'),closed=!body?.classList.contains('hidden');body?.classList.toggle('hidden',closed);e.currentTarget.textContent=closed?'XEM':'ĐÓNG';e.currentTarget.classList.toggle('open',!closed)})
}

/* ---------- Capacity, dividends, ranking ---------- */
const _executeTradeC1Base=executeTrade;
executeTrade=function(s,t,actor){const parties=tradeParties(t,actor),buyer=parties.buyer;if(s.investments?.enabled&&buyer&&!c1CanReceiveResources(s.players?.[buyer],t.qty))return`${buyer} không còn đủ sức chứa bất động sản cho ${t.qty} tài nguyên.`;return _executeTradeC1Base(s,t,actor)};

function c1ApplyDividends(s){
  if(!s.investments?.enabled)return false;let changed=false;for(const [company,p] of Object.entries(s.players||{}))for(const w of p.wins||[]){const key=`${w.round}:${company}:${w.projectId}`,exists=s.investments.dividends.some(x=>x.key===key);if(exists)continue;const reward=Math.max(0,Number(w.reward)||0),payments=[];for(const holder of Object.keys(s.players||{})){if(holder===company)continue;const shares=c1ShareQty(s,company,holder);if(shares<=0)continue;const amount=c1RoundMoney(reward*shares/C1_SHARE_TOTAL);if(amount<=0)continue;payments.push({holder,shares,amount});s.players[holder].money=c1RoundMoney((Number(s.players[holder].money)||0)+amount);s.players[holder].shareIncome[company]=c1RoundMoney((Number(s.players[holder].shareIncome?.[company])||0)+amount)}const total=c1RoundMoney(payments.reduce((t,x)=>t+x.amount,0));if(total>0)p.money=c1RoundMoney((Number(p.money)||0)-total);s.investments.dividends.push({key,round:w.round,projectId:w.projectId,company,reward,total,payments,at:Date.now()});changed=true}return changed
}
const _settleProjectsCoreC1Base=settleProjectsCore;
settleProjectsCore=function(s){const ok=_settleProjectsCoreC1Base(s);if(ok&&c1ApplyDividends(s))logPush(s,'📊 C1 đã chia cổ tức dự án theo tỷ lệ cổ phiếu; tiền được trừ từ doanh nghiệp trúng thầu.');return ok};

const _processRealtimeEconomyC1Base=processRealtimeEconomy;
processRealtimeEconomy=function(s,now=Date.now()){const before=Object.fromEntries(Object.entries(s.players||{}).map(([n,p])=>[n,deep(p.res||{})])),changed=_processRealtimeEconomyC1Base(s,now);if(!s.investments?.enabled)return changed;let adjusted=false;for(const [name,p] of Object.entries(s.players||{})){const cap=c1Capacity(p),over=Math.max(0,sumRes(p.res)-cap.capacity);if(over<=0){p.capacityBlocked=false;continue}let left=over,playerAdjusted=false;for(const k of RESOURCE_KEYS){const add=Math.max(0,(Number(p.res[k])||0)-(Number(before[name]?.[k])||0)),cut=Math.min(left,add);if(cut>0){p.res[k]-=cut;left-=cut;adjusted=true;playerAdjusted=true}}p.capacityBlocked=true;if(playerAdjusted)logPush(s,`🏙️ Chi nhánh của ${name} tạm dừng phần sản lượng vượt sức chứa bất động sản.`)}c1RefreshPropertyMarket(s);return changed||adjusted};

const _rankingC1Base=ranking;
ranking=function(s){if(!s.investments?.enabled)return _rankingC1Base(s);c1EnsureInvestment(s);const names=Object.keys(s.players||{}),rows=Object.entries(s.players||{}).map(([name,p])=>{const resCount=sumRes(p.res||{}),resValue=typeof liquidationValueV464==='function'?liquidationValueV464(resCount):resCount*LIQUIDATION_VALUE,propertyValue=c1RoundMoney((Number(p.propertyM2)||0)*(Number(s.investments.property?.buyPrice)||0)),externalHoldings=c1RoundMoney(names.filter(c=>c!==name).reduce((t,c)=>t+c1ShareQty(s,c,name)*c1SharePrice(s,c),0)),ownCompanyDilution=c1RoundMoney(names.filter(h=>h!==name).reduce((t,h)=>t+c1ShareQty(s,name,h)*c1SharePrice(s,name),0)),stockValue=c1RoundMoney(externalHoldings-ownCompanyDilution),debt=typeof bankBalanceV475==='function'?bankBalanceV475(p):0,tradeCount=(s.trades||[]).filter(t=>t.status==='accepted'&&(t.buyer===name||t.seller===name)).length+(s.investments.trades||[]).filter(t=>t.status==='accepted'&&(t.buyer===name||t.seller===name)).length,total=c1RoundMoney((Number(p.money)||0)+resValue+propertyValue+stockValue-debt);return{name,cash:Number(p.money)||0,resCount,resValue,total,wins:(p.wins||[]).length,projectRevenue:(p.wins||[]).reduce((a,w)=>a+(Number(w.reward)||0),0),auctionCost:0,tradeCount,company:p.company,debt,propertyValue,stockValue,bankrupt:!!p.bankrupt}}).sort((a,b)=>Number(a.bankrupt)-Number(b.bankrupt)||b.total-a.total||b.cash-a.cash||b.wins-a.wins||a.name.localeCompare(b.name,'vi'));let key=null,rank=0;rows.forEach((r,i)=>{const k=`${r.bankrupt}:${r.total}`;if(k!==key)rank=i+1;r.rank=rank;key=k});return rows};

function c1SettleBankAtGameEnd(s){
  if(s.c1FinalDebtSettled)return;c1EnsureInvestment(s);const prices=typeof bankPriceMapV475==='function'?(bankPriceMapV475(s)||{}):{};
  for(const [name,p] of Object.entries(s.players||{})){
    const loan=typeof normalizeBankLoanV475==='function'?normalizeBankLoanV475(p,s):p.bankLoan,debt=Math.max(0,Number(loan?.balance)||0);if(!debt)continue;
    p.money=c1RoundMoney((Number(p.money)||0)-debt);let recovered=0,guard=0;
    while(p.money<0&&guard++<20000){const key=RESOURCE_KEYS.filter(k=>(Number(p.res?.[k])||0)>0).sort((a,b)=>(Number(p.res[b])||0)-(Number(p.res[a])||0))[0];if(!key)break;p.res[key]=Math.max(0,(Number(p.res[key])||0)-1);const gain=Math.max(.1,Number(prices[key])||10);p.money=c1RoundMoney(p.money+gain);recovered=c1RoundMoney(recovered+gain)}
    while(p.money<0&&(Number(p.propertyM2)||0)>.09&&guard++<20000){const qty=Math.min(1,Number(p.propertyM2)||0),gain=c1RoundMoney(qty*(Number(s.investments?.property?.sellPrice)||.1));p.propertyM2=c1RoundMoney(p.propertyM2-qty);p.money=c1RoundMoney(p.money+gain);recovered=c1RoundMoney(recovered+gain)}
    for(const company of Object.keys(s.players||{}).filter(c=>c!==name))while(p.money<0&&c1ShareQty(s,company,name)>0&&guard++<20000){s.investments.shares[company][name]=c1ShareQty(s,company,name)-1;s.investments.shares[company][company]=c1ShareQty(s,company,company)+1;const gain=c1SharePrice(s,company);p.money=c1RoundMoney(p.money+gain);recovered=c1RoundMoney(recovered+gain)}
    if(loan){loan.totalPaid=c1RoundMoney((Number(loan.totalPaid)||0)+debt);loan.totalCollateralLiquidated=c1RoundMoney((Number(loan.totalCollateralLiquidated)||0)+recovered);loan.balance=0;loan.principal=0;loan.active=false;loan.closedAt=Date.now();loan.status=p.money<0?'defaulted':'closed'}
    if(p.money<0&&typeof markBankruptV475==='function')markBankruptV475(s,name,'Không còn đủ tài sản để tất toán nợ cuối game');
    logPush(s,`🏦 Kết game: ${name} đã được tự động khấu trừ khoản nợ ${c1Money(debt)} vào tài sản.`)
  }
  s.c1FinalDebtSettled=true;c1RefreshPropertyMarket(s)
}

const _finishGameC1Base=finishGame;
finishGame=function(){const s=load();if(s.phase!=='P7')return;c1SettleBankAtGameEnd(s);save(s);return _finishGameC1Base()};

/* ---------- Host project drafts and overview ---------- */
function c1ProjectDraftKey(pid,s=load()){return`tt_c1_project:${ROOM?.code||'offline'}:R${s.round}:${pid}`}
function c1ReadProjectDraft(pr,s){try{return{reward:pr.reward,need:deep(pr.need),...JSON.parse(sessionStorage.getItem(c1ProjectDraftKey(pr.id,s))||'{}')}}catch(e){return{reward:pr.reward,need:deep(pr.need)}}}
function c1WriteProjectDraft(pid,d,s=load()){sessionStorage.setItem(c1ProjectDraftKey(pid,s),JSON.stringify(d))}
const _hostProjectEditorC1Base=hostProjectEditor;
hostProjectEditor=function(pr,s){const html=_hostProjectEditorC1Base(pr,s),box=document.createElement('div');box.innerHTML=html;const card=box.firstElementChild;if(!card)return html;card.dataset.c1EditIsland='project';card.dataset.pid=pr.id;const d=c1ReadProjectDraft(pr,s),editable=['P1','P2','P3','P4'].includes(s.phase);card.querySelectorAll('.ingredient-row').forEach(row=>{const minus=row.querySelector('.needAdjust[data-delta="-1"]'),plus=row.querySelector('.needAdjust[data-delta="1"]'),k=minus?.dataset.res||plus?.dataset.res,qty=row.querySelector('.qty');if(!k||!qty)return;qty.innerHTML=`<input class="c1ProjectNeedInput" data-pid="${pr.id}" data-res="${k}" type="text" inputmode="numeric" value="${Math.max(0,Number(d.need?.[k])||0)}" ${editable?'':'disabled'}>`;minus?.classList.add('c1-step','minus');plus?.classList.add('c1-step','plus');row.classList.add('c1-project-need')});const reward=card.querySelector('.projectRewardInput');if(reward){reward.type='text';reward.inputMode='decimal';reward.value=String(d.reward??pr.reward)}card.querySelector('.applyProjectReward')?.remove();card.insertAdjacentHTML('beforeend',`<button type="button" class="btn good c1-project-update c1ApplyProject" data-pid="${pr.id}" ${editable?'':'disabled'}>CẬP NHẬT TOÀN BỘ DỰ ÁN</button><div class="tiny muted" style="margin-top:6px">Mọi số đang là nháp riêng trên máy Host; người chơi chỉ nhận thay đổi sau khi bấm cập nhật.</div>`);return card.outerHTML};

function c1HostInvestmentOverview(s){if(!s.investments?.enabled)return'';return`<div class="card c1-host-invest"><div class="title">📊 Đầu tư & sở hữu doanh nghiệp</div><div class="tiny muted">Giá cổ phiếu thay đổi theo tiền, tồn kho, chi nhánh và dư nợ. Tổng mỗi doanh nghiệp luôn 100 phiếu.</div>${Object.keys(s.players||{}).map(company=>{const holders=Object.keys(s.players||{}).filter(n=>c1ShareQty(s,company,n)>0);return`<div class="c1-host-company"><div class="split"><b>${esc(company)} · ${esc(s.players[company].company)}</b><span class="c1-stock-price">${c1Money(c1SharePrice(s,company))}/phiếu</span></div><div class="tiny">${holders.map(n=>`${esc(n)} ${c1ShareQty(s,company,n)}% · đã nhận ${c1Money(s.players[n].shareIncome?.[company]||0)}`).join('<br>')}</div></div>`}).join('')}</div>`}

const _finalViewC1Base=finalView;
finalView=function(s,viewer){const html=_finalViewC1Base(s,viewer),box=document.createElement('div');box.innerHTML=html;const max=Math.max(1,Math.min(C1_MAX_MARKETS,Number(s.setup?.maxMarkets)||5));box.querySelectorAll('.exec-kicker').forEach(x=>x.textContent=x.textContent.replace(/\/\d+\s*$/,`/${max}`));if(s.investments?.enabled){const rows=ranking(s),cards=box.querySelectorAll('.exec-rank-card');cards.forEach(card=>{const name=card.querySelector('.exec-name')?.textContent,row=rows.find(x=>x.name===name);if(row)card.insertAdjacentHTML('beforeend',`<div class="tiny" style="margin-top:6px;color:#5b21b6">🏙️ ${c1Money(row.propertyValue)} · 📊 ròng ${c1Money(row.stockValue)}</div>`)});const rankCard=[...box.querySelectorAll('.exec-card')].find(x=>x.textContent.includes('Bảng xếp hạng toàn bộ'));rankCard?.insertAdjacentHTML('afterend',`<div class="exec-card" style="margin-top:14px"><div class="title">🏙️📊 Tài sản đầu tư C1</div><div class="grid grid-2">${rows.map(r=>`<div class="c1-holding"><b>${esc(r.name)}</b><span>BĐS ${c1Money(r.propertyValue)} · CP ròng ${c1Money(r.stockValue)}</span></div>`).join('')}</div><div class="footer-note"><b>Cách tính:</b> Bất động sản theo giá thị trường cuối game. Cổ phiếu ròng = cổ phần sở hữu ở doanh nghiệp khác − phần doanh nghiệp của mình đã bán, tránh tính trùng tài sản.</div></div>`)}return box.innerHTML};

/* ---------- Auction property + player wait/read-only tools ---------- */
const _psPrepPanelC1Base=psPrepPanelV45;
psPrepPanelV45=function(s){const html=_psPrepPanelC1Base(s);if(!s.investments?.enabled)return html;const box=document.createElement('div');box.innerHTML=html;const panel=box.firstElementChild,kind=panel?.querySelector('#psLotKindV45');if(!panel||!kind)return html;if(![...kind.options].some(o=>o.value==='property'))kind.insertAdjacentHTML('beforeend','<option value="property">🏙️ GÓI BẤT ĐỘNG SẢN</option>');const promo=panel.querySelector('#psPromoEditorV45');promo?.insertAdjacentHTML('afterend',`<div id="c1PropertyEditor" class="hidden"><div class="grid grid-2"><div class="field"><label>Số m² bất động sản</label><input id="c1AuctionPropertyQty" type="text" inputmode="decimal" value="10"></div><div class="c1-project-notice" id="c1PropertySuggestion">Khoảng gợi ý sẽ dựa trên lượng còn lại và mức khan hiếm.</div></div></div>`);return panel.outerHTML};

const _buildManualPsLotC1Base=buildManualPsLotV481;
buildManualPsLotV481=function(){const kind=document.getElementById('psLotKindV45')?.value;if(kind!=='property')return _buildManualPsLotC1Base();const s=load(),qty=Math.max(.1,c1RoundMoney(c1ParseNumber(document.getElementById('c1AuctionPropertyQty')?.value))),available=Number(s.investments?.property?.available)||0;if(qty>available)throw new Error(`Gói không được vượt ${available} m² bất động sản còn lại.`);const start=Math.max(0,c1ParseNumber(document.getElementById('psStartPriceV45')?.value)),title=String(document.getElementById('psLotTitleV45')?.value||'').trim();return{kind:'property',title:title||`Bất động sản ×${qty} m²`,items:{propertyM2:qty},startPrice:start}};
const _auctionLotItemsHtmlC1Base=auctionLotItemsHtmlV45;
auctionLotItemsHtmlV45=function(lot){if(lot.kind==='property')return`<div class="ps-item-line"><span>🏙️ Bất động sản</span><b>×${c1FormatNumber(lot.items?.propertyM2||0)} m²</b></div>`;return _auctionLotItemsHtmlC1Base(lot)};
const _auctionLotItemsLabelC1Base=auctionLotItemsLabelV480;
auctionLotItemsLabelV480=function(lot){return lot.kind==='property'?`🏙️ ${c1FormatNumber(lot.items?.propertyM2||0)} m² bất động sản`:_auctionLotItemsLabelC1Base(lot)};
const _lotPriceRangeC1Base=lotPriceRangeV480;
lotPriceRangeV480=function(s,lot){if(lot.kind!=='property')return _lotPriceRangeC1Base(s,lot);const ref=c1RoundMoney((Number(lot.items?.propertyM2)||0)*(Number(s.investments?.property?.buyPrice)||1));return{ref,min:Math.max(1,c1RoundMoney(ref*.65)),max:Math.max(1,c1RoundMoney(ref*.95)),start:Math.max(1,c1RoundMoney(ref*.75))}};
const _auctionLotCardC1Base=auctionLotCardV45;
auctionLotCardV45=function(lot,role,name,ended=false){const html=_auctionLotCardC1Base(lot,role,name,ended),box=document.createElement('div');box.innerHTML=html;if(lot.kind==='property')box.firstElementChild?.classList.add('c1-property-lot');return box.innerHTML};
const _patchAuctionStageC1Base=patchAuctionStageV45;
patchAuctionStageV45=function(){const out=_patchAuctionStageC1Base();document.querySelectorAll('[data-ps-price]').forEach(x=>{const lot=AUCTION_SNAPSHOT?.lots?.find(l=>String(l.id)===String(x.closest('[data-ps-lot]')?.dataset.psLot));if(lot)x.textContent=c1Money(lot.currentBidder?(Number(lot.currentPrice)||0):(Number(lot.startPrice)||0))});return out};

let C1_PROPERTY_SETTLE_BUSY=false;
let C1_PROPERTY_SETTLE_KEY='';
let C1_PROPERTY_SETTLE_LAST=0;
async function c1SettlePropertyAuction(){
  const s=load(),auctionId=s.specialAuction?.lastAuctionId,now=Date.now();if(!auctionId)return;const key=`${ROOM?.id||''}:${s.round}:${auctionId}`;if(C1_PROPERTY_SETTLE_BUSY||C1_PROPERTY_SETTLE_KEY===key||now-C1_PROPERTY_SETTLE_LAST<5000||!ROOM?.id||!SB||!accessIsAdmin())return;C1_PROPERTY_SETTLE_BUSY=true;C1_PROPERTY_SETTLE_LAST=now;try{const {data,error}=await SB.rpc('c1_settle_property_auction_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(row?.state){ROOM.revision=Number(row.revision)||ROOM.revision;storeRoom(ROOM);ROOM_BASE_STATE_V47=deep(row.state);localStorage.setItem(STATE_KEY,JSON.stringify(row.state));await broadcastRoomSignal('state_changed',{reason:'c1_property_award'}).catch(()=>{});render()}C1_PROPERTY_SETTLE_KEY=key}catch(e){console.warn('C1 property award',e)}finally{C1_PROPERTY_SETTLE_BUSY=false}
}
const _finishPsAuctionC1Base=finishPsAuctionV45;
finishPsAuctionV45=async function(force=false){const hadProperty=!!AUCTION_SNAPSHOT?.lots?.some(l=>l.kind==='property');const out=await _finishPsAuctionC1Base(force);if(hadProperty&&session?.role==='host')await c1SettlePropertyAuction();return out};

const _timerTickC1Base=timerTick;
timerTick=function(){const out=_timerTickC1Base();const s=load();if(session?.role==='host'&&s.phase!=='P3'&&!s.specialAuction?.active&&s.investments?.enabled)c1SettlePropertyAuction();return out};

function c1AuctionAssetPanel(name,s){const p=s.players[name],cap=c1Capacity(p);return`<div class="c1-auction-panel" id="c1AuctionAssetPanel"><button class="c1-panel-close">✕</button><div class="title">🔒 Tài sản của bạn · chỉ xem</div><div class="c1-invest-summary"><div class="c1-stat">Tiền mặt<b>${c1Money(p.money)}</b></div><div class="c1-stat">Tài nguyên<b>${sumRes(p.res)}</b></div>${s.investments?.enabled?`<div class="c1-stat">Bất động sản<b>${c1FormatNumber(cap.owned)} m²</b></div>`:''}</div>${assetGroupsHtmlV44(name,s)}</div>`}
function c1AuctionProjectPanel(s){return`<div class="c1-auction-panel" id="c1AuctionProjectPanel"><button class="c1-panel-close">✕</button><div class="title">📋 Dự án hiện có · chỉ xem</div><div class="grid">${projects(s).map(pr=>`<div class="project"><b>${esc(pr.id)} · ${esc(pr.name)}</b><div class="tiny">${needText(pr.need)}</div><div class="tokens">${Object.entries(s.players||{}).filter(([,p])=>playerTargetsV475(p,s).includes(pr.id)).map(([n])=>`<span class="token">${esc(n)}</span>`).join('')||'<span class="muted tiny">Chưa có người nhắm</span>'}</div></div>`).join('')}</div></div>`}
const _auctionStageC1Base=auctionStageV45;
auctionStageV45=function(s,role,name=null){const html=_auctionStageC1Base(s,role,name),box=document.createElement('div');box.innerHTML=html;const stage=box.firstElementChild,hero=stage?.querySelector('.ps-hero');if(!stage)return html;if(role==='player'&&name&&hero){hero.insertAdjacentHTML('afterend',`<div class="c1-auction-tools"><button class="btn secondary c1ShowAuctionAsset">XEM TÀI SẢN</button><button class="btn secondary c1ShowAuctionProject">XEM DỰ ÁN</button></div><div id="c1AuctionPanelSlot"></div>`);const bank=stage.querySelector('.bank-auction-dock-v475');if(bank)stage.appendChild(bank)}return box.innerHTML};

function c1P3WaitOverlay(){return`<div class="c1-p3-wait"><div class="c1-p3-wait-card"><div class="icon">🔨</div><h2>HÃY CHỜ PHIÊN ĐẤU GIÁ</h2><p>Host đang chuẩn bị các gói đấu giá. Mọi thao tác tạm khóa để dữ liệu không bị chồng chéo.</p><div class="tiny muted">Màn hình sẽ tự mở phiên khi Host hoàn tất.</div></div></div>`}

/* ---------- View composition ---------- */
roundTabs=function(s,host=false){const max=Math.max(1,Math.min(C1_MAX_MARKETS,Number(s.setup?.maxMarkets)||5));return`<div class="round-tabs">${Array.from({length:max},(_,i)=>i+1).map(r=>host?`<button class="round-tab host-round-btn ${r===s.round?'active':''} ${!s.snapshots[String(r)]?'future':''}" data-round="${r}" ${!s.snapshots[String(r)]?'disabled':''}>Thị trường ${r}</button>`:`<span class="round-tab ${r===s.round?'active':''}">Thị trường ${r}</span>`).join('')}</div>`};

const _hostPrimaryActionC1Base=hostPrimaryAction;
hostPrimaryAction=function(s){if(s.phase!=='P7')return _hostPrimaryActionC1Base(s);const max=Math.max(1,Math.min(C1_MAX_MARKETS,Number(s.setup?.maxMarkets)||5));if(s.round>=max)return`<div class="market-decision"><b>Đã hoàn thành Thị trường ${s.round}/${max}.</b><div class="muted">Đây là số thị trường tối đa đã thiết lập.</div><button class="btn good big" id="finishGameBtn" style="margin-top:10px">🏆 TỔNG KẾT & VINH DANH</button></div>`;return`<div class="market-decision"><b>Host quyết định sau Thị trường ${s.round}</b><div class="muted" style="margin-top:4px">Mở Thị trường ${s.round+1} hoặc dừng để tổng kết.</div><div class="market-decision-grid"><button class="btn good big" id="nextRoundBtn">▶ THỊ TRƯỜNG ${s.round+1}</button><button class="btn finish big" id="finishGameBtn">🏆 DỪNG & TỔNG KẾT</button></div></div>`};

restoreRound=function(target){
  const s=load(),max=Math.max(1,Math.min(C1_MAX_MARKETS,Number(s.setup?.maxMarkets)||5));target=Number(target);if(!Number.isInteger(target)||target<1||target>max)return;const snap=s.snapshots?.[String(target)];if(!snap){logPush(s,`Không thể quay lại Thị trường ${target}: chưa có mốc lưu.`);save(s);render();return}
  s.round=target;s.phase='P1';s.players=deep(snap.players);s.trades=deep(snap.trades);s.results=deep(snap.results);s.settledRound=snap.settledRound;s.seq=snap.seq;if(snap.branchMarket)s.branchMarket=deep(snap.branchMarket);if(snap.investments)s.investments=deep(snap.investments);if(snap.setup)s.setup=deep(snap.setup);s.gameOver=false;s.endedAtRound=null;s.gameEndedAt=null;s.c1FinalDebtSettled=false;pauseGameClock(s);s.timer=defaultTimer();for(const k of Object.keys(s.snapshots||{}))if(+k>target)delete s.snapshots[k];logPush(s,`↩ Đã khôi phục về ĐẦU THỊ TRƯỜNG ${target}.`);save(s);render()
};

function c1NumberSections(box,selector){let i=0;box.querySelectorAll(selector).forEach(card=>{const title=card.querySelector(':scope .title');if(!title||title.dataset.c1Numbered)return;title.dataset.c1Numbered='1';title.insertAdjacentHTML('afterbegin',`<span class="c1-section-no">${c1Roman(++i)}</span>`)})}
function c1PatchMarketMax(box,s){const max=Math.max(1,Math.min(C1_MAX_MARKETS,Number(s.setup?.maxMarkets)||5)),walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes)n.nodeValue=n.nodeValue.replace(/(Vòng|Thị trường) (\d+)\/5\b/g,`$1 $2/${max}`).replace(/5 vòng tối đa/g,`${max} thị trường tối đa`)}
function c1DisclosureKey(name,s,section){return`tt_c1_open:${ROOM?.code||'offline'}:${name}:R${s.round}:${section}`}
function c1DisclosureOpen(name,s,section,fallback=true){try{const v=sessionStorage.getItem(c1DisclosureKey(name,s,section));return v===null?fallback:v==='1'}catch(e){return fallback}}
function c1StoreDisclosure(name,s,section,open){try{sessionStorage.setItem(c1DisclosureKey(name,s,section),open?'1':'0')}catch(e){}}
function c1PatchPlayerDisclosures(box,name,s){
  const set=(button,body,section,fallback)=>{if(!button||!body)return;const open=c1DisclosureOpen(name,s,section,fallback);body.classList.toggle('hidden',!open);button.textContent=open?'ĐÓNG':'XEM';button.classList.toggle('open',open)};
  set(box.querySelector('.c1ToggleInvest'),box.querySelector('.c1-invest-body'),'investment',true);set(box.querySelector('.c1ToggleTrade'),box.querySelector('.c1-trade-body'),'trade',true);
  const card=box.querySelector('.branch-card');if(card){const head=card.querySelector(':scope > .split');if(head){const body=document.createElement('div');body.className='c1-branch-body';[...card.children].filter(x=>x!==head).forEach(x=>body.appendChild(x));card.appendChild(body);const button=document.createElement('button');button.type='button';button.className='c1-disclosure c1-branch-toggle';head.appendChild(button);set(button,body,'branch',true)}}
}
const _playerViewC1Base=playerView;
playerView=function(name){const s=load(),html=_playerViewC1Base(name);if(s.gameOver)return html;const box=document.createElement('div');box.innerHTML=html;const app=box.querySelector('.app');if(!app)return html;app.querySelector('.topbar .badge')?.insertAdjacentHTML('beforebegin','<span class="c1-version">C1.1</span>');c1PatchMarketMax(box,s);if(s.specialAuction?.active)return box.innerHTML;const main=app.querySelector(':scope > .grid.grid-2'),left=main?.children[0],right=main?.children[1],asset=left?.querySelector('#playerAssetReadout')||left?.querySelector('.money')?.closest('.card');if(left&&s.investments?.enabled&&!left.querySelector('#c1InvestmentCard'))(asset||left.firstElementChild)?.insertAdjacentHTML('afterend',c1InvestmentCard(name,s));if(right&&s.investments?.enabled&&!right.querySelector('#c1InvestmentInbox'))right.insertAdjacentHTML('afterbegin',c1InvestmentInbox(name,s));c1PatchPlayerDisclosures(box,name,s);if(s.phase==='P3'&&!s.specialAuction?.active)app.insertAdjacentHTML('beforeend',c1P3WaitOverlay());c1NumberSections(box,'.stack > .card');return box.innerHTML};

const _hostViewC1Base=hostView;
hostView=function(){const s=load(),html=_hostViewC1Base();if(s.gameOver)return html;const box=document.createElement('div');box.innerHTML=html;const app=box.querySelector('.app');if(!app)return html;app.querySelector('.topbar .badge')?.insertAdjacentHTML('beforebegin','<span class="c1-version">C1.1</span>');c1PatchMarketMax(box,s);if(s.specialAuction?.active)return box.innerHTML;const right=box.querySelector('.host-dashboard')?.children?.[1];if(right&&s.investments?.enabled&&!right.querySelector('.c1-host-invest'))right.insertAdjacentHTML('afterbegin',c1HostInvestmentOverview(s));c1NumberSections(box,'.host-dashboard > .stack > .card');box.querySelectorAll('.badge').forEach(b=>{if(/ĐANG MỞ|CÓ THỂ MUA|SẴN SÀNG/.test(b.textContent))b.classList.add('c1-open-badge')});return box.innerHTML};

const _observerViewC1Base=observerView;
observerView=function(){const s=load(),box=document.createElement('div');box.innerHTML=_observerViewC1Base();c1PatchMarketMax(box,s);return box.innerHTML};

const _loginViewC1Base=loginView;
loginView=function(){const box=document.createElement('div');box.innerHTML=_loginViewC1Base();const s=load();box.querySelector('.brand,.setup-head,.login-head')?.insertAdjacentHTML('beforeend','<span class="c1-version">BUILD C1.1</span>');c1PatchMarketMax(box,s);return box.innerHTML.replace(/V\d+\.\d+(?:\.\d+)? Multiplayer/g,'C1.1 Multiplayer')};
const _entryViewC1Base=entryView;
entryView=function(){const box=document.createElement('div');box.innerHTML=_entryViewC1Base();box.querySelector('.access-brand')?.insertAdjacentHTML('beforeend','<span class="c1-version">BUILD C1.1</span>');return box.innerHTML};
document.title='THƯƠNG TRƯỜNG — C1.1 Multiplayer';

/* ---------- Bindings and stable-edit islands ---------- */
function c1BindProjectDrafts(){
  document.querySelectorAll('.host-project-editor[data-c1-edit-island="project"]:not(.c11-project-editor)').forEach(card=>{const pid=card.dataset.pid,read=()=>{const s=load(),pr=projectById(s,pid),d=c1ReadProjectDraft(pr,s);card.querySelectorAll('.c1ProjectNeedInput').forEach(x=>d.need[x.dataset.res]=Math.max(0,Math.round(c1ParseNumber(x.value))));d.reward=Math.max(0,c1RoundMoney(c1ParseNumber(card.querySelector('.projectRewardInput')?.value)));c1WriteProjectDraft(pid,d,s);return d};card.querySelectorAll('.c1ProjectNeedInput,.projectRewardInput').forEach(x=>x.addEventListener('input',read));card.querySelectorAll('.needAdjust').forEach(b=>b.onclick=()=>{const x=card.querySelector(`.c1ProjectNeedInput[data-res="${b.dataset.res}"]`),next=Math.max(0,c1ParseNumber(x?.value)+Number(b.dataset.delta||0));if(x){x.value=String(next);x.dispatchEvent(new Event('input',{bubbles:true}))}});card.querySelector('.c1ApplyProject')?.addEventListener('click',()=>{const s=load(),pr=projectById(s,pid);if(!pr)return;const old=deep(pr),d=read();pr.need=deep(d.need);pr.reward=d.reward;resetProjectDecisionAfterEdit?.(s,pid,JSON.stringify(old.need)!==JSON.stringify(pr.need));logPush(s,`📢 Thị trường đã thay đổi dự án ${pid}: giá hoặc thành phần vừa được Host cập nhật.`);save(s);sessionStorage.removeItem(c1ProjectDraftKey(pid,s));render();c1Toast(`Đã cập nhật ${pid}; toàn bộ người chơi đã nhận thông báo.`,'info')})})
}
function c1InstallSteppers(root=document){
  root.querySelectorAll?.('input[type="number"],input[inputmode="numeric"],input[inputmode="decimal"]').forEach(input=>{if(input.classList.contains('setupMoney')||input.classList.contains('c1ProjectNeedInput')||input.classList.contains('projectRewardInput')||input.id==='setupCount'||input.id==='branchQty'||input.id==='branchPriceInput'||input.closest('.c1-stepper,.branch-qty-stepper-v472,.ps-qty-stepper-v47')||input.disabled||input.readOnly)return;const wrap=document.createElement('div');wrap.className='c1-stepper';input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);const step=Math.max(.1,Number(input.step)||1),minus=document.createElement('button'),plus=document.createElement('button');minus.type=plus.type='button';minus.className='c1-step minus';plus.className='c1-step plus';minus.textContent='−';plus.textContent='+';wrap.insertBefore(minus,input);wrap.appendChild(plus);const move=d=>{const raw=c1ParseNumber(input.value),min=input.min===''?-Infinity:Number(input.min),max=input.max===''?Infinity:Number(input.max),next=Math.max(min,Math.min(max,c1RoundMoney(raw+d*step)));input.value=String(next);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus({preventScroll:true});if(typeof placeCaretAtEndV472==='function')placeCaretAtEndV472(input)};minus.onclick=()=>move(-1);plus.onclick=()=>move(1)})
}
function c1BindAuctionTools(name){document.querySelector('.c1ShowAuctionAsset')?.addEventListener('click',()=>{const slot=document.getElementById('c1AuctionPanelSlot');if(slot)slot.innerHTML=c1AuctionAssetPanel(name,load());slot?.querySelector('.c1-panel-close')?.addEventListener('click',()=>slot.innerHTML='');c1LocalizeMoneyDom(slot)});document.querySelector('.c1ShowAuctionProject')?.addEventListener('click',()=>{const slot=document.getElementById('c1AuctionPanelSlot');if(slot)slot.innerHTML=c1AuctionProjectPanel(load());slot?.querySelector('.c1-panel-close')?.addEventListener('click',()=>slot.innerHTML='');c1LocalizeMoneyDom(slot)})}

const _bindPlayerC1Base=bindPlayer;
bindPlayer=function(name){_bindPlayerC1Base(name);const s=load(),res=document.getElementById('branchRes'),branchDefaultKey=`tt_c1_branch_choice:${ROOM?.code||'offline'}:${name}:R${s.round}`;if(res&&s.phase==='P2'){if(!sessionStorage.getItem(branchDefaultKey)&&s.players?.[name]?.businessId){res.value=s.players[name].businessId;writeBranchDraftV47?.(name,{res:res.value,qty:document.getElementById('branchQty')?.value||'1'},s);res.dispatchEvent(new Event('change',{bubbles:true}))}res.addEventListener('change',()=>sessionStorage.setItem(branchDefaultKey,'chosen'))}if(s.specialAuction?.active){c1BindAuctionTools(name);c1InstallSteppers();c1LocalizeMoneyDom();return}c1BindInvestment(name);const remember=(button,body,section)=>button?.addEventListener('click',()=>c1StoreDisclosure(name,s,section,!body?.classList.contains('hidden')));remember(document.querySelector('.c1ToggleInvest'),document.querySelector('.c1-invest-body'),'investment');remember(document.querySelector('.c1ToggleTrade'),document.querySelector('.c1-trade-body'),'trade');const branchToggle=document.querySelector('.c1-branch-toggle'),branchBody=document.querySelector('.c1-branch-body');branchToggle?.addEventListener('click',()=>{const closed=!branchBody?.classList.contains('hidden');branchBody?.classList.toggle('hidden',closed);branchToggle.textContent=closed?'XEM':'ĐÓNG';branchToggle.classList.toggle('open',!closed);c1StoreDisclosure(name,s,'branch',!closed)});c1InstallSteppers();c1LocalizeMoneyDom()};
const _bindHostC1Base=bindHost;
bindHost=function(){_bindHostC1Base();c1BindProjectDrafts();const kind=document.getElementById('psLotKindV45');if(kind){const change=()=>{const k=kind.value;document.getElementById('c1PropertyEditor')?.classList.toggle('hidden',k!=='property');if(k==='property'){const s=load(),qty=c1ParseNumber(document.getElementById('c1AuctionPropertyQty')?.value),range=lotPriceRangeV480(s,{kind:'property',items:{propertyM2:qty}}),el=document.getElementById('c1PropertySuggestion');if(el)el.innerHTML=`Khoảng phù hợp ${c1Money(range.min)} ~ ${c1Money(range.max)} · còn ${c1FormatNumber(s.investments?.property?.available||0)} m².`}};kind.addEventListener('change',change);document.getElementById('c1AuctionPropertyQty')?.addEventListener('input',change);change()}c1InstallSteppers();c1LocalizeMoneyDom()};

/* CONTROL navigation is non-destructive. Going backwards only changes the
   visible phase; the V4.8.1 transition ledger prevents repeated interest. */
controlPhaseChangeV481=async function(ph){
  if(V481_PHASE_SWITCH_BUSY||V481_FLOW_SWITCH_BUSY||V481_AUCTION_START_BUSY||V481_AUCTION_FINISH_BUSY)return;
  const s=load(),before=s.phase,bi=phaseIndexV481(before),ti=phaseIndexV481(ph);if(s.flowMode!=='control'){alert('AUTO đang bật. Hãy chuyển sang CONTROL để đổi P thủ công.');return}if(s.specialAuction?.active){alert('Phiên đấu giá đang chạy. Hãy kết thúc đấu giá trước khi đổi P.');return}if(before===ph||bi<0||ti<0)return;if(ti>bi+1){alert(`Hãy chuyển lần lượt qua ${V481_PHASE_ORDER[bi+1]} để không bỏ qua bước xử lý.`);return}
  if(before==='P6'&&ph==='P7'){await finalizeP6V480(false);return}
  V481_PHASE_SWITCH_BUSY=true;try{c11CapturePhaseCheckpoint(s,ph);const wasRunning=!!s.timer?.running;_changePhaseV480Base(s,ph);setPhaseTimerV480(s,ph,ph!=='P7'&&(wasRunning||true));logPush(s,`↔ CONTROL ${before} → ${ph}. Dữ liệu giao dịch và kết quả được giữ nguyên.`);save(s);render();await waitRoomSyncV481();await broadcastRoomSignal('state_changed',{reason:`c11_control_phase_${ph}`}).catch(()=>{});if(ph==='P6')await ensureProcurementOpenV480()}finally{V481_PHASE_SWITCH_BUSY=false}
};

document.addEventListener('focusin',e=>{if(e.target?.matches?.('input,select,textarea')&&(session?.role==='player'||session?.role==='host'||session?.role==='setup')){C1_EDITING_NODE=e.target;C1_EDITING_PHASE=session?.role==='setup'?'SETUP':load().phase;C1_EDITING_UNTIL=Date.now()+30*60*1000;if(e.target.matches('input')&&typeof placeCaretAtEndV472==='function')setTimeout(()=>placeCaretAtEndV472(e.target),0)}},true);
document.addEventListener('focusout',e=>{if(e.target===C1_EDITING_NODE)setTimeout(()=>{if(document.activeElement!==C1_EDITING_NODE){C1_EDITING_NODE=null;C1_EDITING_PHASE=null;C1_EDITING_UNTIL=0}},180)},true);
function c1Editing(){const a=document.activeElement;if(!C1_EDITING_NODE||Date.now()>C1_EDITING_UNTIL)return false;if(!C1_EDITING_NODE.isConnected||a!==C1_EDITING_NODE)return false;const nowPhase=session?.role==='setup'?'SETUP':load().phase;if(C1_EDITING_PHASE!==nowPhase)return false;return a.matches('input,select,textarea')}

const _renderC1Base=render;
render=function(){if(c1Editing()){patchTradeClockAlertV465?.();patchBankLiveV476?.();return}const out=_renderC1Base();c1InstallSteppers();c1LocalizeMoneyDom();return out};

const _uiConfirmC1Base=uiConfirmV46;
uiConfirmV46=function(opts){const p=_uiConfirmC1Base(opts);setTimeout(()=>c1LocalizeMoneyDom(document.querySelector('.v46-confirm-backdrop')),0);return p};

const _bindAuctionStageC1Base=bindAuctionStageV45;
bindAuctionStageV45=function(){_bindAuctionStageC1Base();if(session?.role==='player')c1BindAuctionTools(session.name);c1InstallSteppers();c1LocalizeMoneyDom()};

/* P3 is a hard player barrier until the server auction is live. */
const _partialPlayerP3C1Base=typeof partialPlayerP3RenderV44==='function'?partialPlayerP3RenderV44:null;
if(_partialPlayerP3C1Base)partialPlayerP3RenderV44=function(name){const ok=_partialPlayerP3C1Base(name),s=load();document.querySelector('.c1-p3-wait')?.remove();if(s.phase==='P3'&&!s.specialAuction?.active)document.querySelector('.app')?.insertAdjacentHTML('beforeend',c1P3WaitOverlay());return ok};

/* Markets can run up to the Host-selected maximum without briefly ending the
   game at market 5. This is a single state transition, so realtime clients
   never observe an intermediate game-over frame. */
nextRound=function(){
  const s=load(),max=Math.max(1,Math.min(C1_MAX_MARKETS,Number(s.setup?.maxMarkets)||5));if(s.phase!=='P7')return;if(s.round>=max){finishGame();return}const prev=s.round,mode=s.flowMode,durations=deep(s.phaseDurations||{});applyPhaseInterestV475?.(s,'P7','P1');s.round++;s.phase='P1';s.c1FinalDebtSettled=false;
  for(const p of Object.values(s.players||{})){p.targets=[];p.p2Targets=[];p.p2TargetsRound=null;p.projectDecisions={};p.target=null;p.locked=false;p.declinedProject=false;p.bid=null;p.projectBids={};for(const [k,v] of Object.entries(p.refill||{}))p.res[k]=(p.res[k]||0)+v;const loan=typeof normalizeBankLoanV475==='function'?normalizeBankLoanV475(p,s):null;if(loan)loan.lastMinuteIndex=Math.floor(activeElapsedMsNow(s)/BANK_MINUTE_MS_V475)}
  expireOpenTrades(s,prev);const expiredRoots=new Set();for(const t of s.investments?.trades||[])if(t.round===prev&&t.status==='pending'){t.status='expired';expiredRoots.add(Number(t.rootId)||Number(t.id))}for(const id of expiredRoots){const root=(s.investments?.trades||[]).find(t=>Number(t.id)===id);c1ReleaseEscrow(s,root)}s.markets[s.round]=buildCurrentRoundProjects(s.players,s.round);s.flowMode=mode;s.phaseDurations=durations;s.timer=defaultTimer();if(typeof setPhaseTimerV480==='function')setPhaseTimerV480(s,'P1',mode==='auto');if(mode==='auto'&&typeof ensureRealtimeRunningV481==='function')ensureRealtimeRunningV481(s);c1RefreshPropertyMarket(s);s.snapshots[String(s.round)]=makeRoundSnapshot(s);logPush(s,`✅ Host mở Thị trường ${s.round}/${max}. Mỗi người được nhắm tối đa ${projectChoiceLimitV475(s)} dự án.`);save(s);render()
};

/* Keep local investment fields during normal CAS rebases. Authoritative asset
   commits use the C1 SQL RPC and therefore never depend on this merge path. */
const _rebasePlayerStateC1Base=rebasePlayerStateV47;
rebasePlayerStateV47=function(base,local,latest){const out=_rebasePlayerStateC1Base(base,local,latest);if(JSON.stringify(local.investments)!==JSON.stringify(base.investments))out.investments=deep(local.investments);for(const n of Object.keys(local.players||{})){if(!out.players?.[n])continue;for(const k of ['propertyM2','shareIncome'])if(JSON.stringify(local.players[n]?.[k])!==JSON.stringify(base.players?.[n]?.[k]))out.players[n][k]=deep(local.players[n][k])}return c1EnsureInvestment(out)};

/* =========================================================
   C1.1 — focused reliability corrections
   ========================================================= */
(function installC11Styles(){
  const st=document.createElement('style');st.id='c11-styles';st.textContent=`
    input[type="number"],input[inputmode="numeric"],input[inputmode="decimal"],#branchPriceInput,.projectRewardInput{text-align:center!important}
    .c11-phase-notice{position:fixed;inset:0;z-index:114;background:rgba(15,23,42,.68);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)}
    .c11-phase-notice-card{position:relative;width:min(600px,100%);max-height:min(78vh,720px);overflow:auto;border:3px solid #60a5fa;border-radius:24px;background:#fff;padding:25px 22px 22px;box-shadow:0 28px 90px rgba(15,23,42,.42)}
    .c11-phase-notice-card.p4{border-color:#22c55e}.c11-phase-notice-card.p5{border-color:#f59e0b}.c11-phase-notice-card.p6{border-color:#8b5cf6}.c11-phase-notice-title{text-align:center;font-size:21px;font-weight:1000;margin:0 36px 12px}.c11-phase-close{position:absolute;left:10px;top:10px;width:38px;height:38px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;color:#0f172a;font-size:19px;font-weight:1000;cursor:pointer}.c11-phase-notice .decision-grid{margin:14px auto 0;max-width:500px}.c11-phase-notice .btn{min-height:48px}
    .bank-modal-backdrop-v475{align-items:center!important;padding:14px 14px max(14px,env(safe-area-inset-bottom))!important}.bank-modal-v475{max-height:min(82vh,720px)!important;overscroll-behavior:contain}.v46-confirm-backdrop{align-items:center!important;padding:14px!important}.v46-confirm{max-height:78vh;overflow:auto}
    @media(max-width:767px){.bank-modal-v475{max-height:78vh!important;border-radius:19px!important;transform:translateY(-4vh)}.c11-phase-notice{padding:12px}.c11-phase-notice-card{max-height:76vh;padding:23px 14px 16px}.c11-phase-notice-title{font-size:18px}.c11-phase-notice .decision-grid{grid-template-columns:1fr 1fr!important}.v46-confirm{border-radius:18px!important}.v46-confirm-actions{position:sticky;bottom:0;background:#fff;padding-bottom:14px!important;box-shadow:0 -8px 18px rgba(15,23,42,.07)}}
  `;document.head.appendChild(st)
})();

/* Host branch draft uses exactly one-unit controls and no duplicate wrapper. */
const _branchMarketHostCardC11Base=branchMarketHostCard;
branchMarketHostCard=function(s){const html=_branchMarketHostCardC11Base(s);if(!html)return html;const box=document.createElement('div');box.innerHTML=html;const input=box.querySelector('#branchPriceInput');if(input)input.step='1';box.querySelectorAll('.branchPriceDelta').forEach(b=>{const d=Number(b.dataset.delta)<0?-1:1;b.dataset.delta=String(d);b.textContent=d<0?'−1':'+1'});const note=box.querySelector('.branch-price-draft-note-v463');if(note)note.innerHTML='✍️ −1 / +1 chỉ chỉnh <b>GIÁ NHÁP</b>. Giá thị trường chỉ đổi sau khi bấm <b>ÁP DỤNG GIÁ</b>.';return box.innerHTML};

/* On a short phone viewport the primary bank confirmation stays above the
   optional quick-add row, keeping the important action near the screen center. */
const _bankModalHtmlC11Base=bankModalHtmlV475;
bankModalHtmlV475=function(name,s){const html=_bankModalHtmlC11Base(name,s),box=document.createElement('div');box.innerHTML=html;const modal=box.querySelector('.bank-modal-v475'),quick=modal?.querySelector('.bank-quick-v475'),confirm=modal?.querySelector('#bankBorrowConfirmV475');if(quick&&confirm){quick.insertAdjacentElement('beforebegin',confirm);confirm.style.margin='8px 0'}return box.innerHTML};

/* Money strings can be updated by realtime patches without a full render.
   Observe those mutations so M never returns after the first paint. */
let C11_MONEY_OBSERVER_BUSY=false,C11_MONEY_OBSERVER_QUEUED=false;const C11_MONEY_ROOTS=new Set();
function c11LocalizeRealtimeMoney(){if(C11_MONEY_OBSERVER_BUSY)return;C11_MONEY_OBSERVER_BUSY=true;try{const roots=[...C11_MONEY_ROOTS];C11_MONEY_ROOTS.clear();for(const root of roots)c1LocalizeMoneyDom(root)}finally{C11_MONEY_OBSERVER_BUSY=false}}
const C11_MONEY_OBSERVER=new MutationObserver(records=>{if(C11_MONEY_OBSERVER_BUSY)return;for(const r of records){const target=r.target?.nodeType===1?r.target:r.target?.parentElement;if(target)C11_MONEY_ROOTS.add(target);for(const n of r.addedNodes||[]){const root=n.nodeType===1?n:n.parentElement;if(root)C11_MONEY_ROOTS.add(root)}}if(!C11_MONEY_ROOTS.size||C11_MONEY_OBSERVER_QUEUED)return;C11_MONEY_OBSERVER_QUEUED=true;requestAnimationFrame(()=>{C11_MONEY_OBSERVER_QUEUED=false;c11LocalizeRealtimeMoney()})});
C11_MONEY_OBSERVER.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
const _patchBankLiveC11Base=patchBankLiveV476;
patchBankLiveV476=function(){const out=_patchBankLiveC11Base();c1LocalizeMoneyDom(document.getElementById('bankModalV475'));document.querySelectorAll('[data-bank-live-balance-v476]').forEach(x=>c1LocalizeMoneyDom(x));return out};

/* Remaining spendable cash travels with the sticky auction timer. */
function c11AuctionCash(name,s){const held=(AUCTION_SNAPSHOT?.lots||[]).filter(l=>l.currentBidder===name).reduce((t,l)=>t+(Number(l.currentPrice)||0),0),cash=Number(s.players?.[name]?.money)||0;return{held,available:Math.max(0,c1RoundMoney(cash-held))}}
const _auctionStageC11Base=auctionStageV45;
auctionStageV45=function(s,role,name=null){const html=_auctionStageC11Base(s,role,name);if(role!=='player'||!name)return html;const box=document.createElement('div');box.innerHTML=html;const hero=box.querySelector('.ps-hero'),split=hero?.querySelector('.split')||hero;if(hero&&!hero.querySelector('.c11-auction-cash')){const x=c11AuctionCash(name,s);split?.insertAdjacentHTML('beforeend',`<div class="c11-auction-cash" title="Tiền mặt trừ số đang được giữ cho các giá dẫn đầu">CÒN DÙNG <b data-c11-auction-cash>${c1Money(x.available)}</b></div>`)}return box.innerHTML};
const _patchAuctionStageC11Base=patchAuctionStageV45;
patchAuctionStageV45=function(){const out=_patchAuctionStageC11Base();if(session?.role==='player'){const x=c11AuctionCash(session.name,load()),el=document.querySelector('[data-c11-auction-cash]');if(el)el.textContent=c1Money(x.available)}return out};

/* Dismissible phase notice: a modal announcement, not a hard phase gate. */
function c11PhaseNoticeKey(name,s){return`tt_c11_phase_notice:${ROOM?.code||roomInfo()?.code||'offline'}:${name}:R${s.round}:${s.phase}`}
function c11PhaseNotice(name,s){if(!['P4','P5','P6'].includes(s.phase)||sessionStorage.getItem(c11PhaseNoticeKey(name,s))==='1')return'';const titles={P4:'P4 · XÁC NHẬN DỰ ÁN',P5:'P5 · ĐẤU THẦU KÍN',P6:'P6 · KẾT QUẢ & THANH TOÁN'};return`<div class="c11-phase-notice" id="c11PhaseNotice"><div class="c11-phase-notice-card ${s.phase.toLowerCase()}" role="dialog" aria-modal="true"><button type="button" class="c11-phase-close" aria-label="Đóng thông báo">×</button><div class="c11-phase-notice-title">${titles[s.phase]}</div>${phaseAction(name,s)}</div></div>`}
const _playerViewC11Base=playerView;
playerView=function(name){const s=load(),html=_playerViewC11Base(name);if(s.gameOver||s.specialAuction?.active)return html;const box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('.phase-gate-v476').forEach(x=>x.remove());box.querySelector('.app')?.insertAdjacentHTML('beforeend',c11PhaseNotice(name,s));return box.innerHTML};
const _bindPlayerC11Base=bindPlayer;
bindPlayer=function(name){_bindPlayerC11Base(name);document.body.classList.remove('v476-phase-locked');document.querySelector('.c11-phase-close')?.addEventListener('click',()=>{sessionStorage.setItem(c11PhaseNoticeKey(name,load()),'1');document.getElementById('c11PhaseNotice')?.remove()});c1LocalizeMoneyDom()};

/* Save compact per-phase recovery points. Normal backwards navigation never
   restores these; only the explicit RESET P button does. */
function c11StoreCheckpointTrades(checkpoints,trades){
  const rows=Array.isArray(trades)?trades:[];
  const base=checkpoints?.items?.P3?.trades;
  if(!Array.isArray(base))return deep(rows);
  let prefix=0;
  while(prefix<base.length&&prefix<rows.length&&JSON.stringify(base[prefix])===JSON.stringify(rows[prefix]))prefix++;
  const compact={__c11TradeTailV1:true,prefix,tail:deep(rows.slice(prefix))};
  return JSON.stringify(compact).length<JSON.stringify(rows).length?compact:deep(rows);
}
function c11RestoreCheckpointTrades(checkpoints,checkpoint){
  const saved=checkpoint?.trades;
  if(Array.isArray(saved))return deep(saved);
  const base=checkpoints?.items?.P3?.trades;
  if(!saved?.__c11TradeTailV1||!Array.isArray(base)||!Array.isArray(saved.tail)||
     !Number.isInteger(saved.prefix)||saved.prefix<0||saved.prefix>base.length)
    throw new Error('C11_CHECKPOINT_TRADES_INVALID');
  return deep(base.slice(0,saved.prefix)).concat(deep(saved.tail));
}
function c11CapturePhaseCheckpoint(s,ph){if(!['P3','P4','P5','P6'].includes(ph))return;s.c11PhaseCheckpoints=s.c11PhaseCheckpoints&&Number(s.c11PhaseCheckpoints.round)===Number(s.round)?s.c11PhaseCheckpoints:{round:Number(s.round),items:{}};s.c11PhaseCheckpoints.items=s.c11PhaseCheckpoints.items||{};if(s.c11PhaseCheckpoints.items[ph])return;s.c11PhaseCheckpoints.items[ph]={at:Date.now(),players:deep(s.players),trades:c11StoreCheckpointTrades(s.c11PhaseCheckpoints,s.trades||[]),results:deep(s.results||[]),settledRound:s.settledRound,seq:s.seq,p5Auctions:deep(s.p5Auctions||{}),investments:deep(s.investments||null),specialAuction:deep(s.specialAuction||null),tradeAdviceP2V473:deep(s.tradeAdviceP2V473||null)}}
async function c11ResetPhase(ph){const s=load(),cp=s.c11PhaseCheckpoints?.items?.[ph];if(!cp){c1Toast(`Chưa có mốc đầu ${ph} trong thị trường này.`,'error');return}if(s.specialAuction?.active){c1Toast('Hãy kết thúc phiên đấu giá đang chạy trước khi reset P.','error');return}const ok=await uiConfirmV46({title:`RESET ${ph}?`,tone:'sell',rows:[['Khôi phục',`Đầu ${ph}`],['Thị trường',s.round]],message:'Chỉ nút RESET này mới khôi phục dữ liệu về mốc đầu P. Việc bấm ngược P thông thường không làm mất dữ liệu.',confirmText:`RESET ${ph}`});if(!ok)return;for(const k of ['players','trades','results','p5Auctions','investments','specialAuction','tradeAdviceP2V473'])s[k]=deep(cp[k]);s.trades=c11RestoreCheckpointTrades(s.c11PhaseCheckpoints,cp);s.settledRound=cp.settledRound;s.seq=cp.seq;s.phase=ph;s.gameOver=false;s.endedAtRound=null;s.gameEndedAt=null;for(const p of V481_PHASE_ORDER){if(phaseIndexV481(p)>phaseIndexV481(ph))delete s.c11PhaseCheckpoints.items[p]}setPhaseTimerV480(s,ph,true);logPush(s,`↩ Host RESET ${ph} về mốc đầu giai đoạn.`);save(s);render();await broadcastRoomSignal('state_changed',{reason:`c11_reset_${ph}`}).catch(()=>{});c1Toast(`Đã reset ${ph} về mốc đầu.`,'info')}
const _hostViewC11Base=hostView;
hostView=function(){const s=load();if(['P3','P4','P5','P6'].includes(s.phase)&&!s.specialAuction?.active&&!s.c11PhaseCheckpoints?.items?.[s.phase]){c11CapturePhaseCheckpoint(s,s.phase);localStorage.setItem(STATE_KEY,JSON.stringify(s))}const current=load(),html=_hostViewC11Base();if(current.gameOver||current.specialAuction?.active)return html;const box=document.createElement('div');box.innerHTML=html;const actions=box.querySelector('.rewind .action-grid');if(actions&&!box.querySelector('.c11-phase-resets'))actions.insertAdjacentHTML('afterend',`<div class="c11-phase-resets">${['P3','P4','P5','P6'].map(p=>`<button type="button" class="btn secondary c11-phase-reset" data-phase="${p}" ${current.c11PhaseCheckpoints?.items?.[p]?'':'disabled'}>↩ RESET ${p}<span>về mốc đầu ${p}</span></button>`).join('')}</div>`);return box.innerHTML};
const _bindHostC11Base=bindHost;
bindHost=function(){_bindHostC11Base();document.querySelectorAll('.c11-phase-reset').forEach(b=>b.onclick=()=>c11ResetPhase(b.dataset.phase).catch(e=>alert(e.message||e)));c1LocalizeMoneyDom()};

/* Player alerts become non-blocking, color-coded top-right notifications.
   Full-screen game/phase overlays are separate and remain untouched. */
const C11_NATIVE_ALERT=window.alert.bind(window);
function c11ToastTone(message){const m=String(message||'');return /không|lỗi|thất bại|chưa|thiếu|từ chối|hết hạn|khóa/i.test(m)?'error':/bán/i.test(m)?'sell':/mua|chấp nhận|thành công/i.test(m)?'buy':'info'}
window.alert=function(message){if(session?.role==='player'){c1Toast(message,c11ToastTone(message));return}return C11_NATIVE_ALERT(message)};

/* Action-specific success notices that did not previously call alert(). */
for(const [name,tone,label] of [['acceptTrade','buy','Đã chấp nhận giao dịch.'],['declineTrade','sell','Đã từ chối giao dịch.'],['sendCounterOffer','info','Đã gửi phản hồi thương lượng.']]){const base=window[name];if(typeof base==='function')window[name]=async function(...args){const before=JSON.stringify(load().trades||[]),out=await base.apply(this,args),after=JSON.stringify(load().trades||[]);if(before!==after)c1Toast(label,tone);return out}}
const C11_ACTION_TOASTS=[
  ['.lockProjectV475','Đã chốt dự án.','buy'],['.declineProjectV475','Đã từ chối dự án.','sell'],['.projectToggleV475','Đã cập nhật dự án đang nhắm.','info'],
  ['#buyBranch','Đã mua chi nhánh.','buy'],['#bankBorrowConfirmV475','Đã nhận khoản vay.','buy'],['#bankRepayConfirmV475','Đã thanh toán khoản nợ.','info'],['#bankRepayAllV475','Đã tất toán khoản nợ.','info'],
  ['.submitBidV475','Đã gửi giá chào kín.','info'],['.psSubmitBidV45','Đã gửi giá đấu giá.','info'],['#sendTrade','Đã gửi đề nghị giao dịch.','info']
];
function c11ActionState(name){const s=load();return JSON.stringify({player:s.players?.[name],trades:s.trades,investments:s.investments,auction:s.specialAuction,results:s.results})}
document.addEventListener('click',e=>{if(session?.role!=='player')return;const hit=C11_ACTION_TOASTS.find(([sel])=>e.target?.closest?.(sel));if(!hit)return;const name=session.name,before=c11ActionState(name);setTimeout(()=>{if(c11ActionState(name)!==before)c1Toast(hit[1],hit[2])},900)},true);

/* C1.1 responsive polish + true host-side project drafts. */
(function installC11ResponsiveProjectStyles(){
  const st=document.createElement('style');st.id='c11-responsive-project-styles';st.textContent=`
    .host-bank-list-c11{display:grid;gap:8px;margin-top:10px}.host-bank-row-c11{display:grid;grid-template-columns:minmax(90px,1.15fr) repeat(4,minmax(92px,1fr));gap:8px;align-items:stretch;padding:9px;border:1px solid #bae6fd;border-radius:13px;background:linear-gradient(135deg,#f0f9ff,#fff)}.host-bank-name-c11,.host-bank-stat-c11{min-width:0;padding:8px;border-radius:10px;background:#fff;border:1px solid #dbeafe}.host-bank-name-c11{display:flex;align-items:center;font-size:15px}.host-bank-stat-c11 small{display:block;color:#64748b;font-size:10px;font-weight:800;line-height:1.15}.host-bank-stat-c11 b{display:block;margin-top:4px;font-size:14px;line-height:1.15;overflow-wrap:anywhere}
    .host-project-editor.c11-project-editor{overflow:visible}.c11-project-editor .ingredient-editor{display:grid!important;gap:7px!important}.c11-project-row{display:grid;grid-template-columns:minmax(118px,1fr) 38px minmax(64px,88px) 38px 54px;gap:6px;align-items:center}.c11-project-row .c1ProjectNeedInput{height:40px!important;padding:6px!important;text-align:center!important;font-size:16px!important}.c11-project-row .c1-step{width:38px!important;min-width:38px!important;height:40px!important;padding:0!important}.c11-project-delete{height:40px;padding:0 8px!important;background:#c81e1e!important;color:#fff!important;border-color:#c81e1e!important;font-size:11px!important}.c11-project-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:10px}.c11-project-add select{min-width:0}.c11-project-editor .reward-editor{grid-template-columns:38px minmax(0,1fr) 38px!important;align-items:center}.c11-project-actions{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:9px}.c11-project-actions .c1ApplyProject{width:100%}.c11-draft-badge{background:#fff7ed!important;border-color:#fdba74!important;color:#9a3412!important}
    @media(max-width:1050px){.host-bank-row-c11{grid-template-columns:repeat(2,minmax(0,1fr))}.host-bank-name-c11{grid-column:1/-1}.c11-project-row{grid-template-columns:minmax(112px,1fr) 36px minmax(60px,82px) 36px 50px}}
    @media(max-width:560px){
      .app,.card{min-width:0}.card{padding:12px!important}.bank-card-v475{overflow:hidden}.bank-card-v475>*{min-width:0}.card>.split,.c1-invest-card>.split,.branch-card>.split,.host-bank-overview-v476>.split{display:flex!important;flex-wrap:wrap!important;align-items:flex-start!important;gap:8px!important}.card>.split>div,.c1-invest-card>.split>div,.branch-card>.split>div,.host-bank-overview-v476>.split>div{min-width:0;flex:1 1 190px}.card>.split>.badge,.card>.split>button,.c1-invest-card>.split>.c1-disclosure,.branch-card>.split>.c1-disclosure{flex:0 0 auto;max-width:100%}
      .title,.editor-title{font-size:clamp(16px,5.3vw,22px)!important;line-height:1.15!important;overflow-wrap:anywhere}.muted{line-height:1.35}.c1-invest-card .c1-invest-summary{grid-template-columns:repeat(auto-fit,minmax(135px,1fr))!important}.c1-invest-card .c1-holding{display:grid!important;grid-template-columns:minmax(0,1fr) auto}.c1-property-market>.split>div{flex-basis:180px}
      .host-bank-row-c11{grid-template-columns:1fr 1fr}.host-bank-name-c11{grid-column:1/-1}.c11-project-row{grid-template-columns:minmax(0,1fr) 40px minmax(58px,76px) 40px}.c11-project-row .c11-project-delete{grid-column:1/-1;width:100%;height:36px}.c11-project-add,.c11-project-actions{grid-template-columns:1fr}.c11-project-actions .c11DiscardProject{order:2}.c11-project-add button,.c11-project-actions button{width:100%}
    }
    @media(max-width:380px){.card{padding:10px!important}.c1-section-no{min-width:23px;height:23px;margin-right:4px;padding:0 5px}.c1-invest-card .c1-invest-summary{grid-template-columns:1fr!important}.c11-project-row{grid-template-columns:minmax(0,1fr) 36px minmax(52px,68px) 36px}.c11-project-row .c1-step{width:36px!important;min-width:36px!important}.host-bank-row-c11{grid-template-columns:1fr}.host-bank-name-c11,.host-bank-stat-c11{grid-column:1}}
  `;document.head.appendChild(st)
})();

hostBankOverviewV476=function(s){if(!s.bank?.enabled)return'';const rows=Object.entries(s.players||{}).map(([name,p])=>({name,loan:normalizeBankLoanV475(p,s)})).filter(x=>x.loan.active||x.loan.balance>0).sort((a,b)=>b.loan.balance-a.loan.balance);return`<div class="card host-bank-overview-v476"><div class="split"><div><div class="title">🏦 Theo dõi vay nợ Ngân hàng Cơ</div><div class="muted tiny">Dư nợ gồm gốc và toàn bộ lãi đã cộng đến thời điểm hiện tại.</div></div><span class="badge">${rows.length} NGƯỜI ĐANG NỢ</span></div>${rows.length?`<div class="host-bank-list-c11">${rows.map(x=>`<div class="host-bank-row-c11"><div class="host-bank-name-c11"><b>${esc(x.name)}</b></div><div class="host-bank-stat-c11"><small>DƯ NỢ HIỆN TẠI</small><b>${c1Money(x.loan.balance)}</b></div><div class="host-bank-stat-c11"><small>GÓI LÃI</small><b>${bankModeLabelV475(x.loan.mode)}</b></div><div class="host-bank-stat-c11"><small>LÃI ĐÃ CỘNG</small><b>${c1Money(x.loan.totalInterestAccrued)}</b></div><div class="host-bank-stat-c11"><small>ĐÃ THANH TOÁN</small><b>${c1Money(x.loan.totalPaid)}</b></div></div>`).join('')}</div>`:'<div class="footer-note">Chưa có người chơi nào mang dư nợ.</div>'}</div>`};

hostProjectEditor=function(pr,s){
  const d=c1ReadProjectDraft(pr,s),editable=['P1','P2','P3','P4'].includes(s.phase),active=activeResourceKeys(s),included=active.filter(k=>(Number(d.need?.[k])||0)>0),available=active.filter(k=>!included.includes(k)),m=currentMarketMetrics(s),draftProject={...pr,need:deep(d.need||{}),reward:Math.max(0,c1RoundMoney(d.reward??pr.reward))},range=projectRewardRange(s,draftProject),impossible=included.some(k=>(Number(d.need?.[k])||0)>(Number(m.supply?.[k])||0)),outside=draftProject.reward<range.min||draftProject.reward>range.max,tokens=Object.entries(s.players||{}).filter(([,p])=>(typeof playerTargetsV475==='function'?playerTargetsV475(p,s):[p.target]).includes(pr.id)).map(([n,p])=>`<span class="token">${esc(n)}${p.locked?' 🔒':''}</span>`).join(''),win=(s.results||[]).find(r=>r.round===s.round&&r.projectId===pr.id&&r.winner);
  return`<div class="host-project-editor c11-project-editor ${impossible?'impossible':''}" data-c1-edit-island="project" data-pid="${esc(pr.id)}"><div class="split"><div><div class="tiny muted">${esc(pr.id)} · LIVE ${c1Money(pr.reward)}</div><div class="editor-title">${esc(pr.name)}</div></div><span class="badge c11-draft-badge">NHÁP ${c1Money(draftProject.reward)}</span></div><div class="tokens" style="margin-top:7px">${tokens||'<span class="muted tiny">Chưa có người chọn</span>'}</div>${win?`<div class="success" style="margin-top:7px">🏆 ${esc(win.winner)} thắng dự án</div>`:''}<div class="ingredient-editor">${included.map(k=>`<div class="c11-project-row"><div><b>${RES[k].icon} ${RES[k].label}</b><div class="supply-badge">Tổng cung: ${m.supply[k]||0}</div></div><button type="button" class="c1-step minus c11NeedAdjust" data-res="${k}" data-delta="-1" ${editable?'':'disabled'}>−</button><input class="c1ProjectNeedInput" data-res="${k}" type="text" inputmode="numeric" value="${Math.max(0,Math.round(Number(d.need[k])||0))}" ${editable?'':'disabled'}><button type="button" class="c1-step plus c11NeedAdjust" data-res="${k}" data-delta="1" ${editable?'':'disabled'}>+</button><button type="button" class="btn bad c11-project-delete c11RemoveProjectResource" data-res="${k}" ${editable?'':'disabled'}>XÓA</button></div>`).join('')||'<div class="footer-note">Dự án chưa có thành phần tài nguyên.</div>'}</div>${available.length&&editable?`<div class="c11-project-add"><select class="c11AddResourceSelect">${available.map(k=>`<option value="${k}">${RES[k].icon} ${RES[k].label}</option>`).join('')}</select><button type="button" class="btn secondary c11AddProjectResource">+ THÊM THÀNH PHẦN</button></div>`:''}<div class="price-range ${outside?'warn':''}" data-c14-live-range><b>Định giá đề xuất:</b> ${c1Money(range.min)}–${c1Money(range.max)} · Chi phí tài nguyên tham chiếu ≈ ${c1Money(range.input)}.${outside?' Giá nháp nằm ngoài khoảng đề xuất; Host vẫn có thể giữ mức này.':''}</div><div class="reward-editor"><button type="button" class="c1-step minus c11RewardAdjust" data-delta="-1" ${editable?'':'disabled'}>−</button><input id="c11ProjectReward-${esc(pr.id)}" name="c11ProjectReward-${esc(pr.id)}" autocomplete="off" class="projectRewardInput" type="text" inputmode="decimal" value="${c1FormatNumber(draftProject.reward)}" ${editable?'':'disabled'}><button type="button" class="c1-step plus c11RewardAdjust" data-delta="1" ${editable?'':'disabled'}>+</button></div><div class="c11-project-actions"><button type="button" class="btn good c1ApplyProject" ${editable?'':'disabled'}>CẬP NHẬT DỰ ÁN</button><button type="button" class="btn secondary c11DiscardProject" ${editable?'':'disabled'}>BỎ DRAFT</button></div><div class="tiny muted" style="margin-top:6px">Mọi thay đổi chỉ lưu trên máy Host. Người chơi chỉ nhận sau khi bấm CẬP NHẬT DỰ ÁN.</div>${impossible?'<div class="danger" style="margin-top:8px">⚠️ Ít nhất một thành phần lớn hơn tổng nguồn cung hiện có.</div>':''}${!editable?'<div class="muted tiny" style="margin-top:8px">Sửa dự án được khóa từ P5; Host có thể quay lại P4 để chỉnh.</div>':''}</div>`
};

function c11BindProjectDraftEditors(){document.querySelectorAll('.c11-project-editor').forEach(card=>{const pid=card.dataset.pid,read=()=>{const s=load(),pr=projectById(s,pid);if(!pr)return null;const d=c1ReadProjectDraft(pr,s);card.querySelectorAll('.c1ProjectNeedInput').forEach(x=>d.need[x.dataset.res]=Math.max(0,Math.round(c1ParseNumber(x.value))));d.reward=Math.max(0,c1RoundMoney(c1ParseNumber(card.querySelector('.projectRewardInput')?.value)));c1WriteProjectDraft(pid,d,s);return d};card.querySelectorAll('.c1ProjectNeedInput').forEach(x=>x.addEventListener('input',()=>{const s=load(),pr=projectById(s,pid);if(!pr)return;const d=c1ReadProjectDraft(pr,s);d.need[x.dataset.res]=Math.max(0,Math.round(c1ParseNumber(x.value)));c1WriteProjectDraft(pid,d,s)}));card.querySelector('.projectRewardInput')?.addEventListener('input',e=>{const s=load(),pr=projectById(s,pid);if(!pr)return;const d=c1ReadProjectDraft(pr,s);d.reward=Math.max(0,c1RoundMoney(c1ParseNumber(e.currentTarget.value)));c1WriteProjectDraft(pid,d,s)});card.querySelectorAll('.c11NeedAdjust').forEach(b=>b.onclick=()=>{const x=card.querySelector(`.c1ProjectNeedInput[data-res="${b.dataset.res}"]`);if(!x)return;x.value=String(Math.max(0,Math.round(c1ParseNumber(x.value)+Number(b.dataset.delta||0))));x.dispatchEvent(new Event('input',{bubbles:true}));x.focus({preventScroll:true})});card.querySelectorAll('.c11RewardAdjust').forEach(b=>b.onclick=()=>{const x=card.querySelector('.projectRewardInput');if(!x)return;x.value=c1FormatNumber(Math.max(0,c1RoundMoney(c1ParseNumber(x.value)+Number(b.dataset.delta||0))));x.dispatchEvent(new Event('input',{bubbles:true}));x.focus({preventScroll:true})});card.querySelectorAll('.c11RemoveProjectResource').forEach(b=>b.addEventListener('click',e=>{const s=load(),pr=projectById(s,pid);if(!pr)return;const d=c1ReadProjectDraft(pr,s);d.need[e.currentTarget.dataset.res]=0;c1WriteProjectDraft(pid,d,s);render()}));card.querySelector('.c11AddProjectResource')?.addEventListener('click',()=>{const s=load(),pr=projectById(s,pid),key=card.querySelector('.c11AddResourceSelect')?.value;if(!pr||!key)return;const d=c1ReadProjectDraft(pr,s);d.need[key]=Math.max(1,Number(d.need[key])||0);c1WriteProjectDraft(pid,d,s);render()});card.querySelector('.c11DiscardProject')?.addEventListener('click',()=>{sessionStorage.removeItem(c1ProjectDraftKey(pid,load()));render();c1Toast(`Đã bỏ bản nháp ${pid}.`,'info')});card.querySelector('.c1ApplyProject')?.addEventListener('click',()=>{const s=load(),pr=projectById(s,pid);if(!pr)return;const old=deep(pr),d=read();if(!d)return;pr.need=Object.fromEntries(activeResourceKeys(s).map(k=>[k,Math.max(0,Math.round(Number(d.need?.[k])||0))]));pr.reward=Math.max(0,c1RoundMoney(d.reward));resetProjectDecisionAfterEdit?.(s,pid,JSON.stringify(old.need)!==JSON.stringify(pr.need));logPush(s,`📢 Host cập nhật dự án ${pid}: thành phần hoặc giá đã thay đổi.`);sessionStorage.removeItem(c1ProjectDraftKey(pid,s));save(s);render();c1Toast(`Đã cập nhật ${pid}; người chơi đã nhận dữ liệu mới.`,'info')})})}

const _bindHostC11ProjectBase=bindHost;
bindHost=function(){_bindHostC11ProjectBase();c11BindProjectDraftEditors();c1LocalizeMoneyDom()};

/* Keep every Host P-duration edit as a local draft until the single Save
   button is pressed. Realtime renders may rebuild the card but never replace
   the values the Host has already typed. */
function c11PhaseDurationDraftKey(){return`tt_c11_phase_duration_draft:${ROOM?.code||roomInfo()?.code||'offline'}`}
function c11ReadPhaseDurationDraft(){try{const x=JSON.parse(localStorage.getItem(c11PhaseDurationDraftKey())||'null');return x&&typeof x==='object'?x:{}}catch(e){return{}}}
function c11WritePhaseDurationDraft(d){try{localStorage.setItem(c11PhaseDurationDraftKey(),JSON.stringify(d))}catch(e){}}
function c11PersistPhaseDurationDraft(input){if(!input?.dataset?.phase||input.dataset.phase==='P7')return;const d=c11ReadPhaseDurationDraft();d[input.dataset.phase]=input.value;c11WritePhaseDurationDraft(d)}
const _flowControlCardC11Base=flowControlCardV480;
flowControlCardV480=function(s){const html=_flowControlCardC11Base(s),draft=c11ReadPhaseDurationDraft(),box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('.phaseDurationInputV480').forEach(input=>{const p=input.dataset.phase;if(p!=='P7'){input.setAttribute('oninput','c11PersistPhaseDurationDraft(this)');input.setAttribute('autocomplete','off');input.setAttribute('name',`c11PhaseDuration-${p}`);if(Object.prototype.hasOwnProperty.call(draft,p))input.value=String(draft[p])}});return box.innerHTML};
const _applyPhaseDurationsC11Base=applyPhaseDurationsV480;
applyPhaseDurationsV480=function(){const inputs=[...document.querySelectorAll('.phaseDurationInputV480')].filter(x=>x.dataset.phase!=='P7'),valid=inputs.every(x=>parsePhaseDurationV480(x.value)!==null);if(valid)localStorage.removeItem(c11PhaseDurationDraftKey());return _applyPhaseDurationsC11Base()};
const _bindHostC11DurationBase=bindHost;
bindHost=function(){_bindHostC11DurationBase();const persist=()=>{const d=c11ReadPhaseDurationDraft();document.querySelectorAll('.phaseDurationInputV480').forEach(input=>{if(input.dataset.phase!=='P7')d[input.dataset.phase]=input.value});c11WritePhaseDurationDraft(d)};document.querySelectorAll('.phaseDurationInputV480').forEach(input=>input.addEventListener('input',persist));const apply=document.getElementById('applyPhaseDurationsV480');if(apply)apply.onclick=applyPhaseDurationsV480};

/* C1.1C: interaction drafts. Realtime must never close a negotiation or
   replace a form while the player is choosing/typing. */
function c11cScope(name,s=load()){return`${ROOM?.code||roomInfo()?.code||'offline'}:${name}:R${s.round}`}
function c11cRead(key){try{return JSON.parse(sessionStorage.getItem(key)||'{}')}catch(e){return{}}}
function c11cWrite(key,value){try{sessionStorage.setItem(key,JSON.stringify(value))}catch(e){}}
function c11cInvestmentKey(name,s=load()){return`tt_c11c_invest_form:${c11cScope(name,s)}`}
function c11cCounterKey(name,id,s=load()){return`tt_c11c_invest_counter:${c11cScope(name,s)}:${id}`}
function c11cPersistInvestmentField(el){if(!session?.name||!el?.id)return;const key=c11cInvestmentKey(session.name),d=c11cRead(key);d[el.id]=el.value;c11cWrite(key,d)}
function c11cPersistResourceTrade(){if(session?.name)persistTradeDraft(session.name)}

const _c1InvestmentTradeComposerC11C=c1InvestmentTradeComposer;
c1InvestmentTradeComposer=function(name,s){const html=_c1InvestmentTradeComposerC11C(name,s),d=c11cRead(c11cInvestmentKey(name,s)),box=document.createElement('div');box.innerHTML=html;for(const id of ['c1TradeDirection','c1TradeTarget','c1TradeAsset','c1TradeQty','c1TradePrice','c1TradeMessage']){const el=box.querySelector('#'+id);if(!el)continue;if(d[id]!==undefined)el.value=String(d[id]);el.setAttribute('oninput','c11cPersistInvestmentField(this)');el.setAttribute('onchange','c11cPersistInvestmentField(this)');el.setAttribute('autocomplete','off')}return box.innerHTML};
const _c1TradeCardC11C=c1TradeCard;
c1TradeCard=function(name,t){const html=_c1TradeCardC11C(name,t),d=c11cRead(c11cCounterKey(name,t.id)),box=document.createElement('div');box.innerHTML=html;const panel=box.querySelector(`#c1Counter-${t.id}`);if(panel&&d.open)panel.classList.remove('hidden');const price=box.querySelector(`.c1CounterPrice[data-id="${t.id}"]`),msg=box.querySelector(`.c1CounterMessage[data-id="${t.id}"]`);if(price&&d.price!==undefined)price.value=String(d.price);if(msg&&d.message!==undefined)msg.value=String(d.message);return box.innerHTML};

const _persistTradeDraftC11C=persistTradeDraft;
persistTradeDraft=function(name){const s=load();writeUiDraft(name,{trade:{kind:document.getElementById('tradeKind')?.value||'buy',to:document.getElementById('tradeTo')?.value||'ALL',res:document.getElementById('tradeRes')?.value||activeResourceKeys(s)[0],qty:document.getElementById('tradeQty')?.value||'1',money:document.getElementById('tradeMoney')?.value||'10',message:document.getElementById('tradeMessage')?.value||''}},s)};
const _tradeComposerC11C=tradeComposer;
tradeComposer=function(name,s){const html=_tradeComposerC11C(name,s),box=document.createElement('div');box.innerHTML=html;for(const id of ['tradeTo','tradeRes','tradeQty','tradeMoney','tradeMessage']){const el=box.querySelector('#'+id);if(el){el.setAttribute('oninput','c11cPersistResourceTrade()');el.setAttribute('onchange','c11cPersistResourceTrade()');el.setAttribute('autocomplete','off')}}box.querySelectorAll('.tradeKindBtn').forEach(b=>b.setAttribute('onclick','setTimeout(c11cPersistResourceTrade,0)'));return box.innerHTML};

const _partialPlayerP3C11C=partialPlayerP3RenderV44;
partialPlayerP3RenderV44=function(name){const active=document.activeElement;if(active?.closest?.('#p3TradeComposer,#tradeInboxCardV463,.counter-panel,#c1TradeComposer,#c1InvestmentInbox')){patchTradeClockAlertV465?.();refreshTradeAdvicePanelV473?.(name,load());return false}return _partialPlayerP3C11C(name)};

const _bindPlayerC11C=bindPlayer;
bindPlayer=function(name){_bindPlayerC11C(name);const form=document.getElementById('c1TradeComposer'),key=c11cInvestmentKey(name);if(form){const save=()=>{const d={};for(const id of ['c1TradeDirection','c1TradeTarget','c1TradeAsset','c1TradeQty','c1TradePrice','c1TradeMessage']){const el=document.getElementById(id);if(el)d[id]=el.value}c11cWrite(key,d)};form.querySelectorAll('input,select,textarea').forEach(el=>{el.addEventListener('input',save);el.addEventListener('change',save)})}document.querySelectorAll('.c1OpenCounter').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.id),panel=document.getElementById(`c1Counter-${id}`),open=panel?.classList.contains('hidden');panel?.classList.toggle('hidden',!open);const k=c11cCounterKey(name,id),d=c11cRead(k);d.open=!!open;c11cWrite(k,d);if(open)panel?.querySelector('input,textarea')?.focus({preventScroll:true})});document.querySelectorAll('.c1CounterPrice,.c1CounterMessage').forEach(el=>{const id=Number(el.dataset.id),save=()=>{const k=c11cCounterKey(name,id),d=c11cRead(k);d.open=true;if(el.classList.contains('c1CounterPrice'))d.price=el.value;else d.message=el.value;c11cWrite(k,d)};el.addEventListener('input',save);el.addEventListener('change',save)})};

(function installC11CLayoutFixes(){const st=document.createElement('style');st.id='c11c-layout-fixes';st.textContent=`
  #psPrepPanel .ps-qty-stepper-v47{display:grid!important;grid-template-columns:42px minmax(48px,1fr) 42px!important;gap:6px!important;min-width:142px!important;width:100%!important}
  #psPrepPanel .ps-qty-stepper-v47>input{display:block!important;min-width:48px!important;width:100%!important;color:#0f172a!important;background:#fff!important;text-align:center!important;font-size:16px!important;font-weight:850!important;padding:6px 3px!important}
  #psPrepPanel .ps-resource-row{grid-template-columns:minmax(0,1fr) minmax(170px,190px)!important}#psPrepPanel .ps-resource-row>.c1-stepper{grid-template-columns:42px minmax(48px,1fr) 42px!important;min-width:170px!important}#psPrepPanel .ps-resource-row>.c1-stepper>input{color:#0f172a!important;background:#fff!important;text-align:center!important;font-size:16px!important;font-weight:850!important;min-width:48px!important;padding:6px 3px!important}
  #psPrepPanel .branch-editor-grid-v480{grid-template-columns:minmax(190px,1fr) minmax(190px,1fr) minmax(180px,220px)!important}
  #psPrepPanel #psBranchQtyV480{color:#0f172a!important;background:#fff!important;text-align:center!important;font-size:16px!important;font-weight:850!important;min-width:48px!important}
  .c11-auction-cash{min-width:0!important;max-width:100%!important;overflow:hidden!important}.c11-auction-cash b{min-width:0!important;overflow-wrap:anywhere!important}
  @media(max-width:700px){.ps-hero>.split{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:9px!important}.ps-hero>.split>div:first-child{grid-column:1/-1!important;min-width:0!important}.ps-hero>.split>.badge{grid-column:1!important;justify-self:start!important}.ps-hero>.split>.c11-auction-cash{grid-column:2!important;margin-left:0!important;justify-self:end!important;white-space:normal!important}.ps-hero>.split>.c11-auction-cash b{font-size:clamp(13px,4vw,17px)!important}#psPrepPanel .branch-editor-grid-v480{grid-template-columns:1fr!important}}
  @media(max-width:420px){.ps-hero>.split{grid-template-columns:1fr!important}.ps-hero>.split>.badge,.ps-hero>.split>.c11-auction-cash{grid-column:1!important;justify-self:stretch!important}.ps-hero>.split>.c11-auction-cash{display:flex!important;justify-content:space-between!important;width:100%!important}#psPrepPanel .ps-resource-row{grid-template-columns:1fr!important}#psPrepPanel .ps-qty-stepper-v47{min-width:0!important}}
`;document.head.appendChild(st)})();

setTimeout(()=>{render();c1InstallSteppers();c1LocalizeMoneyDom()},0);

/* ========================================================================== */
/* C1.4 — P4 trade command centre, unseen alerts, withdrawal and P7 notice.   */
/* ========================================================================== */
const C14_VERSION='C1.4';

function c14LogicalOpenRoots(s,actor){
  const sources=[['resource',s.trades||[]],['investment',s.investments?.trades||[]]],out=[];
  for(const [type,list] of sources){
    const roots=list.filter(t=>String(t.id)===String(t.rootId??t.id)&&t.initiator===actor);
    for(const root of roots){const active=list.some(t=>String(t.rootId??t.id)===String(root.id)&&t.status==='pending');if(active)out.push({type,root})}
  }
  return out
}
function c14TradeLimitError(s,actor,target){const open=c14LogicalOpenRoots(s,actor).filter(x=>(x.root.target||'ALL')===target);return target==='ALL'?(open.length>=3?'Bạn đã có 3 giao dịch chung đang chờ. Hãy thu hồi một giao dịch trước khi gửi mới.':''):(open.length>=1?`Bạn đã có một giao dịch riêng đang chờ với ${target}. Hãy thu hồi giao dịch đó trước.`:'')}

const _c1ApplyLocalActionC14=c1ApplyLocalAction;
c1ApplyLocalAction=function(s,actor,a){
  if(a?.kind==='offer'){const target=a.target==='ALL'?'ALL':String(a.target||''),err=c14TradeLimitError(s,actor,target);if(err)throw new Error(err)}
  if(a?.kind==='cancel'){
    c1EnsureInvestment(s);const t=(s.investments.trades||[]).find(x=>Number(x.id)===Number(a.tradeId)),root=t&&c1TradeRoot(s,t);if(!root||root.initiator!==actor)throw new Error('Bạn chỉ có thể thu hồi giao dịch do mình khởi tạo.');const group=s.investments.trades.filter(x=>Number(x.rootId??x.id)===Number(root.id));if(!group.some(x=>x.status==='pending'))throw new Error('Giao dịch này không còn ở trạng thái chờ.');group.forEach(x=>{if(['pending','superseded'].includes(x.status))x.status='cancelled'});c1ReleaseEscrow(s,root);return{tone:'sell',message:`Đã thu hồi giao dịch đầu tư #${root.id}.`}
  }
  return _c1ApplyLocalActionC14(s,actor,a)
};

const _c1CommitActionC14=c1CommitAction;
c1CommitAction=async function(actor,action){
  if(ROOM?.id&&SB&&['offer','cancel'].includes(action?.kind)){
    if(C1_ACTION_BUSY)return;C1_ACTION_BUSY=true;try{const request={roomId:ROOM.id,action,memberToken:accessIsAdmin()?null:currentMemberToken(),adminToken:accessIsAdmin()?ADMIN_TOKEN:null,adminPlayerName:accessIsAdmin()?actor:null},{data,error}=await SB.rpc('c14_apply_trade_action',{p_request:request});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row?.ok)throw new Error(row?.message||'Không cập nhật được giao dịch.');ROOM.revision=Number(row.revision)||ROOM.revision;storeRoom(ROOM);ROOM_BASE_STATE_V47=deep(row.state);localStorage.setItem(STATE_KEY,JSON.stringify(row.state));await broadcastRoomSignal('state_changed',{reason:'c14_trade'}).catch(()=>{});render();c1Toast(row.message||'Đã cập nhật giao dịch.',row.tone||'info')}catch(e){c1Toast(c14VietnameseError(e),'sell')}finally{C1_ACTION_BUSY=false}return
  }
  return _c1CommitActionC14(actor,action)
};

function c14OutgoingInvestment(name,s){const roots=c14LogicalOpenRoots(s,name).filter(x=>x.type==='investment').map(x=>x.root);if(!roots.length)return'';return`<div class="c14-outgoing"><b>📤 Đầu tư bạn đã gửi · đang chờ</b>${roots.map(t=>`<div class="c14-out-row"><span>#${t.id} · ${t.target==='ALL'?'📣 TẤT CẢ':`🔒 ${esc(t.target)}`} · ${esc(c1AssetLabel(t))}</span><button type="button" class="btn bad c14CancelInvestment" data-id="${t.id}">THU HỒI</button></div>`).join('')}</div>`}
const _c1InvestmentInboxC14=c1InvestmentInbox;
c1InvestmentInbox=function(name,s){const html=_c1InvestmentInboxC14(name,s);if(!html)return html;const box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('.c1-trade-card').forEach((x,i)=>{const t=(s.investments?.trades||[]).filter(t=>t.round===s.round&&c1TradeIncoming(name,t)).sort((a,b)=>c1TradePriority(a)-c1TradePriority(b)||(Number(b.createdAt)||0)-(Number(a.createdAt)||0))[i];if(t)x.dataset.c14TradeKey=`i:${t.id}`});box.firstElementChild?.insertAdjacentHTML('beforeend',c14OutgoingInvestment(name,s));return box.innerHTML};

function c14OutgoingResource(name,s){const roots=c14LogicalOpenRoots(s,name).filter(x=>x.type==='resource').map(x=>x.root);if(!roots.length)return'';return`<div class="c14-outgoing"><b>📤 Giao dịch bạn đã gửi · đang chờ</b>${roots.map(t=>`<div class="c14-out-row"><span>#${t.id} · ${t.target==='ALL'?'📣 TẤT CẢ':`🔒 ${esc(t.target)}`} · ${RES[t.res]?.icon||''} ${esc(RES[t.res]?.label||t.res)} ×${t.qty}</span><button type="button" class="btn bad c14CancelResource" data-id="${t.id}">THU HỒI</button></div>`).join('')}</div>`}
const _tradeInboxC14=tradeInbox;
tradeInbox=function(name,s){const html=_tradeInboxC14(name,s);if(!html)return html;const box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('[data-trade-id]').forEach(x=>x.dataset.c14TradeKey=`r:${x.dataset.tradeId}`);box.firstElementChild?.insertAdjacentHTML('beforeend',c14OutgoingResource(name,s));return box.innerHTML};

function c14SeenKey(name,s=load()){return`tt_c14_seen:${ROOM?.code||roomInfo()?.code||'offline'}:${name}:R${s.round}`}
function c14Seen(name,s=load()){try{return new Set(JSON.parse(sessionStorage.getItem(c14SeenKey(name,s))||'[]'))}catch(e){return new Set()}}
function c14MarkSeen(name,key,s=load()){const seen=c14Seen(name,s);seen.add(key);sessionStorage.setItem(c14SeenKey(name,s),JSON.stringify([...seen]));c14RefreshBell(name)}
function c14IncomingKeys(name,s=load()){const out=[];(s.investments?.trades||[]).filter(t=>t.round===s.round&&c1TradeIncoming(name,t)).forEach(t=>out.push(`i:${t.id}`));(s.trades||[]).filter(t=>Number(t.round)===Number(s.round)&&isIncomingTrade(name,t)).forEach(t=>out.push(`r:${t.id}`));return out}
function c14RefreshBell(name){const s=load(),seen=c14Seen(name,s),keys=c14IncomingKeys(name,s).filter(k=>!seen.has(k)),b=document.getElementById('c14TradeBell');if(!b)return;b.hidden=!['P2','P3','P4'].includes(s.phase)||!keys.length;b.querySelector('b').textContent=String(keys.length);b.dataset.first=keys[0]||''}
function c14BindVisibility(name){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>=.35)c14MarkSeen(name,e.target.dataset.c14TradeKey)}),{threshold:[.35]});document.querySelectorAll('[data-c14-trade-key]').forEach(x=>observer.observe(x));c14RefreshBell(name)}

function c14PatchPlayerLayout(box,name,s){
  box.querySelectorAll('.c1-version').forEach(x=>x.textContent=C14_VERSION);
  const app=box.querySelector('.app'),main=app?.querySelector(':scope > .grid.grid-2'),left=main?.children[0],asset=left?.querySelector('#playerAssetReadout')||left?.querySelector('.money')?.closest('.card');
  if(s.phase==='P4'&&left&&asset){const inv=box.querySelector('#c1InvestmentInbox'),reg=box.querySelector('#tradeInboxCardV463');let anchor=asset;if(inv){anchor.after(inv);anchor=inv}if(reg){anchor.after(reg);anchor=reg}}
  const bank=box.querySelector('.bank-card-v475');if(bank&&!bank.querySelector('.c14-bank-toggle')){const head=bank.querySelector(':scope > .split'),body=document.createElement('div');body.className='c14-bank-body';while(head?.nextSibling)body.appendChild(head.nextSibling);bank.appendChild(body);head?.insertAdjacentHTML('beforeend','<button type="button" class="btn secondary c14-bank-toggle">ĐÓNG</button>')}
  const clocks=box.querySelector('.sticky-game-clocks');if(clocks&&!clocks.querySelector('#c14TradeBell'))clocks.insertAdjacentHTML('beforeend','<button type="button" id="c14TradeBell" class="c14-trade-bell" hidden aria-label="Mở giao dịch mới">🔔 <b>0</b><span>GIAO DỊCH MỚI</span></button>')
}
const _playerViewC14=playerView;
playerView=function(name){const s=load(),html=_playerViewC14(name),box=document.createElement('div');box.innerHTML=html;c14PatchPlayerLayout(box,name,s);return box.innerHTML};

const _c11PhaseNoticeC14=c11PhaseNotice;
c11PhaseNotice=function(name,s){if(s.phase!=='P7')return _c11PhaseNoticeC14(name,s);if(sessionStorage.getItem(c11PhaseNoticeKey(name,s))==='1')return'';const last=Number(s.round)>=Number(s.maxMarkets||s.maxRounds||5);return`<div class="c11-phase-notice" id="c11PhaseNotice"><div class="c11-phase-notice-card p7" role="dialog" aria-modal="true"><button type="button" class="c11-phase-close" aria-label="Đóng thông báo">×</button><div class="c11-phase-notice-title">${last?'🏆 CHỜ KẾT QUẢ CHUNG CUỘC':'⏳ ĐANG CHỜ MỞ THỊ TRƯỜNG KẾ TIẾP'}</div><div class="phase"><small>${last?'Host đang chuẩn bị bảng xếp hạng và kết quả cuối cùng.':'Thị trường hiện tại đã kết thúc. Host sẽ mở thị trường tiếp theo.'}</small></div></div></div>`};

const _bindPlayerC14=bindPlayer;
bindPlayer=function(name){_bindPlayerC14(name);
  const liveClocks=document.querySelector('.sticky-game-clocks');if(liveClocks&&!document.getElementById('c14TradeBell'))liveClocks.insertAdjacentHTML('beforeend','<button type="button" id="c14TradeBell" class="c14-trade-bell" hidden aria-label="Mở giao dịch mới">🔔 <b>0</b><span>GIAO DỊCH MỚI</span></button>');
  document.querySelectorAll('.c14CancelInvestment').forEach(b=>b.onclick=()=>c1CommitAction(name,{kind:'cancel',tradeId:Number(b.dataset.id)}));
  document.querySelectorAll('.c14CancelResource').forEach(b=>b.onclick=()=>c14CancelResource(name,Number(b.dataset.id)));
  document.querySelector('.c14-bank-toggle')?.addEventListener('click',e=>{const card=e.currentTarget.closest('.bank-card-v475'),closed=card.classList.toggle('c14-bank-closed');e.currentTarget.textContent=closed?'XEM':'ĐÓNG'});
  document.getElementById('c14TradeBell')?.addEventListener('click',e=>{const key=e.currentTarget.dataset.first,el=document.querySelector(`[data-c14-trade-key="${CSS.escape(key)}"]`);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.classList.add('c14-highlight');setTimeout(()=>el?.classList.remove('c14-highlight'),1800)});
  c14BindVisibility(name)
};

async function c14CancelResource(name,id){
  if(ROOM?.id&&SB){try{const request={roomId:ROOM.id,action:{kind:'cancel_resource',tradeId:id},memberToken:accessIsAdmin()?null:currentMemberToken(),adminToken:accessIsAdmin()?ADMIN_TOKEN:null,adminPlayerName:accessIsAdmin()?name:null},{data,error}=await SB.rpc('c14_apply_trade_action',{p_request:request});if(error)throw error;const row=Array.isArray(data)?data[0]:data;ROOM.revision=Number(row.revision)||ROOM.revision;storeRoom(ROOM);ROOM_BASE_STATE_V47=deep(row.state);localStorage.setItem(STATE_KEY,JSON.stringify(row.state));render();c1Toast(row.message,'sell');return}catch(e){c1Toast(c14VietnameseError(e),'sell');return}}
  const s=load(),root=(s.trades||[]).find(t=>Number(t.id)===id&&t.initiator===name);if(!root)return c1Toast('Không tìm thấy giao dịch có thể thu hồi.','sell');const group=s.trades.filter(t=>String(t.rootId??t.id)===String(root.id));if(!group.some(t=>t.status==='pending'))return c1Toast('Giao dịch không còn ở trạng thái chờ.','sell');group.forEach(t=>{if(['pending','superseded'].includes(t.status))t.status='cancelled'});releaseTradeReservationV476(s,root,'cancelled');save(s);render();c1Toast(`Đã thu hồi giao dịch #${id}.`,'sell')
}

const _sendTradeOfferC14=sendTradeOffer;
sendTradeOffer=async function(name){
  const s=load(),d=tradeDraft(name,s),target=d.to==='ALL'?'ALL':String(d.to||''),err=c14TradeLimitError(s,name,target);if(err){c1Toast(err,'sell');return}
  if(!ROOM?.id||!SB)return _sendTradeOfferC14(name);
  if(s.phase!=='P4'){c1Toast('Giao dịch tự do diễn ra ở P4.','sell');return}persistTradeDraft(name);const kind=d.kind,res=d.res,qty=d.qty,price=d.money,message=String(d.message||'').trim(),actor=s.players[name];
  if(kind==='buy'&&actor.money<price)return c1Toast('Bạn không đủ tiền cho đề nghị mua này.','sell');if(kind==='sell'&&(Number(actor.res?.[res])||0)<qty)return c1Toast('Bạn không đủ tài nguyên để bán.','sell');
  const verb=kind==='buy'?'MUA':'BÁN',ok=await uiConfirmV46({title:`XÁC NHẬN GỬI ${verb}`,tone:kind==='buy'?'buy':'sell',rows:[['Tài nguyên',`${RES[res].icon} ${RES[res].label} ×${qty}`],['Đối tác',target==='ALL'?'TẤT CẢ':target],['Tổng giá',c1Money(price)]],message:kind==='sell'?(message?message+'\n\n':'')+'Tài nguyên sẽ được giữ riêng ngay khi gửi và tự hoàn lại nếu giao dịch không thành.':message,confirmText:`GỬI ${verb}`});if(!ok)return;
  try{const request={roomId:ROOM.id,action:{kind:'offer_resource',direction:kind,target,res,qty,price,message},memberToken:accessIsAdmin()?null:currentMemberToken(),adminToken:accessIsAdmin()?ADMIN_TOKEN:null,adminPlayerName:accessIsAdmin()?name:null},{data,error}=await SB.rpc('c14_apply_trade_action',{p_request:request});if(error)throw error;const row=Array.isArray(data)?data[0]:data;ROOM.revision=Number(row.revision)||ROOM.revision;storeRoom(ROOM);ROOM_BASE_STATE_V47=deep(row.state);localStorage.setItem(STATE_KEY,JSON.stringify(row.state));await broadcastRoomSignal('state_changed',{reason:'c14_resource_trade'}).catch(()=>{});render();c1Toast(row.message||'Đã gửi giao dịch.',row.tone||kind)}catch(e){c1Toast(c14VietnameseError(e),'sell')}
};

(function installC14Styles(){const st=document.createElement('style');st.id='c14-styles';st.textContent=`
  .c14-outgoing{margin-top:12px;padding:10px;border:1px solid #93c5fd;border-radius:12px;background:#eff6ff}.c14-out-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;margin-top:7px;padding-top:7px;border-top:1px dashed #bfdbfe}.c14-out-row span{min-width:0;overflow-wrap:anywhere}.c14-out-row .btn{padding:8px 10px}
  .c14-trade-bell{border:2px solid #f59e0b;background:#fff7ed;color:#9a3412;border-radius:12px;padding:6px 10px;font-weight:950;display:grid;grid-template-columns:auto auto;gap:0 5px;align-items:center;line-height:1}.c14-trade-bell[hidden]{display:none!important}.c14-trade-bell span{grid-column:1/-1;font-size:9px;white-space:nowrap}.c14-highlight{animation:c14flash .45s ease 3}@keyframes c14flash{50%{box-shadow:0 0 0 5px #fbbf24}}
  .c14-bank-toggle{margin-left:auto}.c14-bank-closed .c14-bank-body{display:none}.c14-bank-body{margin-top:8px}
  @media(max-width:700px){.sticky-game-clocks{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important}.c14-trade-bell{grid-column:1/-1;width:100%;display:flex;justify-content:center;gap:6px}.c14-trade-bell span{font-size:10px}.c14-out-row{grid-template-columns:1fr}.c14-out-row .btn{width:100%}}
`;document.head.appendChild(st)})();

function c14Relabel(html){const box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('.c1-version').forEach(x=>x.textContent=x.textContent.includes('BUILD')?'BUILD C1.4':'C1.4');return box.innerHTML.replace(/C1\.1 Multiplayer/g,'C1.4 Multiplayer')}
const _hostViewC14=hostView;hostView=function(){return c14Relabel(_hostViewC14())};
const _setupViewC14=setupView;setupView=function(){return c14Relabel(_setupViewC14())};
const _loginViewC14=loginView;loginView=function(){return c14Relabel(_loginViewC14())};
const _entryViewC14=entryView;entryView=function(){return c14Relabel(_entryViewC14())};
document.title='THƯƠNG TRƯỜNG — C1.4 Multiplayer';

function c14VietnameseError(error){const raw=String(error?.message||error||'').replace(/^.*(?:P0001|42501):\s*/i,'').trim(),map={ASSET_NOT_AVAILABLE:'Bạn không có đủ tài sản khả dụng để thực hiện giao dịch này.',CASH_NOT_ENOUGH:'Bạn không có đủ tiền để thực hiện giao dịch này.',BUYER_CASH_CHANGED:'Người mua không còn đủ tiền để hoàn tất giao dịch.',SELLER_ASSET_CHANGED:'Người bán không còn đủ tài sản để hoàn tất giao dịch.',OFFER_NOT_PENDING:'Giao dịch đã được xử lý hoặc không còn chờ phản hồi.',OFFER_NOT_FOR_PLAYER:'Giao dịch này không dành cho bạn.',PROPERTY_NOT_ENOUGH:'Thị trường không còn đủ bất động sản.',PROPERTY_REQUIRED_FOR_INVENTORY:'Bạn cần giữ phần bất động sản này để chứa tồn kho.',PLAYER_BANKRUPT:'Người chơi đã phá sản nên không thể thao tác.',GAME_PAUSED:'Game đang tạm dừng.',GAME_OVER:'Game đã kết thúc.',INVESTMENT_TRADE_CLOSED:'Giao dịch đầu tư hiện chưa mở.',INVALID_OFFER:'Thông tin đề nghị chưa hợp lệ.'};return map[raw]||map[raw.split(/\s|:/)[0]]||raw.replace(/_/g,' ').toLocaleLowerCase('vi').replace(/^./,c=>c.toLocaleUpperCase('vi'))||'Không thể thực hiện thao tác này.'}

function c14UpdateProjectRange(card){const s=load(),pid=card?.dataset.pid,pr=projectById(s,pid),el=card?.querySelector('[data-c14-live-range]');if(!pr||!el)return;const d=c1ReadProjectDraft(pr,s);card.querySelectorAll('.c1ProjectNeedInput').forEach(x=>d.need[x.dataset.res]=Math.max(0,Math.round(c1ParseNumber(x.value))));d.reward=Math.max(0,c1RoundMoney(c1ParseNumber(card.querySelector('.projectRewardInput')?.value)));const draft={...pr,need:deep(d.need||{}),reward:d.reward},range=projectRewardRange(s,draft),outside=d.reward<range.min||d.reward>range.max;el.classList.toggle('warn',outside);el.innerHTML=`<b>Định giá đề xuất:</b> ${c1Money(range.min)}–${c1Money(range.max)} · Chi phí tài nguyên tham chiếu ≈ ${c1Money(range.input)}.${outside?' Giá nháp nằm ngoài khoảng đề xuất; Host vẫn có thể giữ mức này.':''}`;card.querySelector('.c11-draft-badge').textContent=`NHÁP ${c1Money(d.reward)}`}
const _bindHostC14LiveRange=bindHost;
bindHost=function(){_bindHostC14LiveRange();document.querySelectorAll('.c11-project-editor').forEach(card=>card.querySelectorAll('.c1ProjectNeedInput,.projectRewardInput').forEach(x=>{x.addEventListener('input',()=>c14UpdateProjectRange(card));x.addEventListener('change',()=>c14UpdateProjectRange(card))}))};

/* ========================================================================== */
/* C1.5 — focused presentation fixes (bank, P4 order, negotiation cards).     */
/* ========================================================================== */
const C15_VERSION='M1.5.2';

hostBankOverviewV476=function(s){
  if(!s.bank?.enabled)return'';const rows=Object.entries(s.players||{}).map(([name,p])=>({name,loan:normalizeBankLoanV475(p,s)})).filter(x=>x.loan.active||x.loan.balance>0).sort((a,b)=>b.loan.balance-a.loan.balance);
  return`<div class="card host-bank-overview-v476 c15-host-bank"><div class="split"><div><div class="title">🏦 Theo dõi vay nợ Ngân hàng Cơ</div><div class="muted tiny">Mỗi người vay nằm trong một thẻ riêng; số liệu tự co giãn theo màn hình.</div></div><span class="badge">${rows.length} NGƯỜI ĐANG NỢ</span></div>${rows.length?`<div class="c15-host-bank-list">${rows.map(x=>`<section class="c15-host-bank-player"><div class="c15-bank-player-head"><b>${esc(x.name)}</b><span>${bankModeLabelV475(x.loan.mode)}</span></div><div class="c15-bank-stat-grid"><div><small>DƯ NỢ HIỆN TẠI</small><strong>${c1Money(x.loan.balance)}</strong></div><div><small>LÃI ĐÃ CỘNG</small><strong>${c1Money(x.loan.totalInterestAccrued)}</strong></div><div><small>ĐÃ THANH TOÁN</small><strong>${c1Money(x.loan.totalPaid)}</strong></div><div><small>TÀI SẢN ĐÃ KHẤU TRỪ</small><strong>${c1Money(x.loan.totalCollateralLiquidated)}</strong></div></div></section>`).join('')}</div>`:'<div class="footer-note">Chưa có người chơi nào mang dư nợ.</div>'}</div>`
};

/* The chat service may still retain messages for compatibility, but trade
   cards intentionally render only the latest message attached to the offer. */
negotiationHistoryBox=function(){return''};
negotiationArchive=function(){return''};

const _incomingTradeCardC15=incomingTradeCard;
incomingTradeCard=function(name,t){const html=_incomingTradeCardC15(name,t),box=document.createElement('div');box.innerHTML=html;const card=box.firstElementChild;if(!card)return html;card.classList.add('c15-trade-card');card.querySelectorAll('.neg-chat,.negotiation-history').forEach(x=>x.remove());if(t.stage==='counter'){const parent=(load().trades||[]).find(x=>String(x.id)===String(t.parentId)),price=card.querySelector('.trade-price-v476');if(price)price.innerHTML=`<span>GIÁ THƯƠNG LƯỢNG</span><div class="c15-price-change">${parent?`<del>${c1Money(parent.price)}</del><b>→</b>`:''}<strong>${c1Money(t.price)}</strong></div>`}return box.innerHTML};

const _c1TradeCardC15=c1TradeCard;
c1TradeCard=function(name,t){const html=_c1TradeCardC15(name,t),box=document.createElement('div');box.innerHTML=html;const card=box.firstElementChild;if(!card)return html;card.classList.add('c15-trade-card');if(t.stage==='counter'){const parent=(load().investments?.trades||[]).find(x=>Number(x.id)===Number(t.parentId)),money=card.querySelector('.c1-money');if(money){const line=document.createElement('div');line.className='c15-invest-price-change';line.innerHTML=`<span>GIÁ THƯƠNG LƯỢNG</span>${parent?`<del>${c1Money(parent.price)}</del><b>→</b>`:''}<strong>${c1Money(t.price)}</strong>`;money.closest('div')?.insertAdjacentElement('afterend',line)}}return box.innerHTML};

function c15PatchPlayer(box,name,s){
  box.querySelectorAll('.c1-version').forEach(x=>x.textContent=C15_VERSION);
  const main=box.querySelector('.app > .grid.grid-2'),left=main?.children[0],asset=left?.querySelector('#playerAssetReadout')||left?.querySelector('.money')?.closest('.card');
  if(s.phase==='P4'&&left&&asset){const composer=box.querySelector('#p3TradeComposer'),invest=box.querySelector('#c1InvestmentInbox'),regular=box.querySelector('#tradeInboxCardV463'),advice=box.querySelector('#tradeAdvicePanelV473');let anchor=asset;for(const el of [composer,invest,regular,advice])if(el){anchor.after(el);anchor=el}}
  const bank=box.querySelector('.bank-card-v475'),button=bank?.querySelector('.c14-bank-toggle');if(bank&&button){const open=c1DisclosureOpen(name,s,'bank',true);bank.classList.toggle('c14-bank-closed',!open);button.textContent=open?'ĐÓNG':'XEM'}
}
const _playerViewC15=playerView;
playerView=function(name){const s=load(),box=document.createElement('div');box.innerHTML=_playerViewC15(name);c15PatchPlayer(box,name,s);return box.innerHTML};

const _bindPlayerC15=bindPlayer;
bindPlayer=function(name){_bindPlayerC15(name);document.querySelector('.c14-bank-toggle')?.addEventListener('click',e=>{const closed=e.currentTarget.closest('.bank-card-v475')?.classList.contains('c14-bank-closed');c1StoreDisclosure(name,load(),'bank',!closed)})};

function c15Relabel(html){const box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('.c1-version').forEach(x=>x.textContent=x.textContent.includes('BUILD')?'BUILD M1.5.2':'M1.5.2');return box.innerHTML.replace(/C1\.4 Multiplayer/g,'M1.5.2 Multiplayer')}
const _hostViewC15=hostView;hostView=function(){return c15Relabel(_hostViewC15())};
const _setupViewC15=setupView;setupView=function(){return c15Relabel(_setupViewC15())};
const _loginViewC15=loginView;loginView=function(){return c15Relabel(_loginViewC15())};
const _entryViewC15=entryView;entryView=function(){return c15Relabel(_entryViewC15())};
document.title='THƯƠNG TRƯỜNG — M1.5.2 Multiplayer';

(function installC15Styles(){const st=document.createElement('style');st.id='c15-styles';st.textContent=`
  .c15-host-bank{overflow:hidden}.c15-host-bank-list{display:grid;gap:10px;margin-top:12px}.c15-host-bank-player{min-width:0;padding:11px;border:1px solid #7dd3fc;border-radius:14px;background:linear-gradient(135deg,#f0f9ff,#fff)}.c15-bank-player-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:9px;border-bottom:1px solid #bae6fd}.c15-bank-player-head>b{font-size:16px}.c15-bank-player-head>span{max-width:60%;padding:4px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:11px;font-weight:900;text-align:right}.c15-bank-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:9px}.c15-bank-stat-grid>div{min-width:0;padding:9px;border:1px solid #dbeafe;border-radius:10px;background:#fff}.c15-bank-stat-grid small{display:block;min-height:24px;color:#64748b;font-size:9px;font-weight:900;line-height:1.2}.c15-bank-stat-grid strong{display:block;margin-top:4px;color:#0c4a6e;font-size:15px;overflow-wrap:anywhere}
  .c15-trade-card{padding:14px!important;border-width:2px!important;border-radius:16px!important}.c15-trade-card .trade-summary-v476{margin:10px 0;font-size:16px;line-height:1.4}.c15-trade-card .trade-price-v476{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px!important;border-radius:12px}.c15-price-change,.c15-invest-price-change{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.c15-price-change del,.c15-invest-price-change del{color:#94a3b8;font-weight:900;text-decoration-thickness:2px}.c15-price-change strong,.c15-invest-price-change strong{color:#fbbf24;font-size:22px}.c15-invest-price-change{margin:9px 0;padding:11px;border-radius:11px;background:#0f172a;color:#fff}.c15-invest-price-change>span{margin-right:auto;font-size:11px;font-weight:900}.c15-trade-card .trade-message-note,.c15-trade-card .c1-trade-msg{margin-top:9px;padding:10px;border-left:4px solid #6366f1;border-radius:9px;background:#eef2ff}.c15-trade-card>.btn-row{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.c15-trade-card>.btn-row .btn{min-width:0;white-space:normal;line-height:1.15}
  @media(max-width:1050px){.c15-bank-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:560px){.c15-bank-stat-grid{grid-template-columns:1fr 1fr}.c15-trade-card{padding:11px!important}.c15-trade-card>.btn-row{grid-template-columns:1fr 1fr}.c15-trade-card>.btn-row .negotiateTrade,.c15-trade-card>.btn-row .c1OpenCounter{grid-column:1/-1}.c15-trade-card .trade-price-v476{align-items:flex-start;flex-direction:column}.c15-bank-player-head{align-items:flex-start}}
  @media(max-width:360px){.c15-bank-stat-grid{grid-template-columns:1fr}.c15-bank-player-head{display:grid}.c15-bank-player-head>span{max-width:100%;text-align:left}}
`;document.head.appendChild(st)})();

/* ========================================================================== */
/* C1.5 — durable input drafts + auction capacity/auth + focused P5 gate.     */
/* ========================================================================== */
let C15_FORM_SNAPSHOT=null,C15_SKIP_FORM_RESTORE=false;
function c15FormContext(){const s=load();return`${ROOM?.code||roomInfo()?.code||'offline'}:${session?.role||'none'}:${session?.name||''}:R${s.round}:${s.phase}:${s.specialAuction?.auctionId||''}`}
function c15FieldKey(el){
  if(el.id)return`#${el.id}`;
  if(el.name)return`n:${el.name}`;
  const island=el.closest('[data-v475-bid-island],[data-trade-id],[data-pid],[data-ps-lot],.card,.modal,.c11-phase-notice-card'),root=island||document;
  const tag=el.tagName.toLowerCase(),classes=[...el.classList],selector=tag+(classes.length?'.'+classes.join('.'):'');const same=[...root.querySelectorAll(selector)];
  return`p:${island?.id||island?.dataset?.tradeId||island?.dataset?.pid||island?.dataset?.psLot||island?.className||'root'}:${tag}:${same.indexOf(el)}`
}
function c15CaptureForms(){
  const active=document.activeElement,fields={};
  document.querySelectorAll('input:not([type="hidden"]),select,textarea').forEach(el=>{if(el.disabled)return;fields[c15FieldKey(el)]={value:el.value,checked:el.checked,tag:el.tagName,type:el.type}});
  C15_FORM_SNAPSHOT={context:c15FormContext(),fields,focus:active?.matches?.('input,select,textarea')?c15FieldKey(active):null,start:active?.selectionStart,end:active?.selectionEnd,scrollX,scrollY}
}
function c15RestoreForms(){
  const snap=C15_FORM_SNAPSHOT;if(!snap||snap.context!==c15FormContext())return;
  document.querySelectorAll('input:not([type="hidden"]),select,textarea').forEach(el=>{const d=snap.fields[c15FieldKey(el)];if(!d||el.disabled)return;if(el.type==='checkbox'||el.type==='radio')el.checked=!!d.checked;else if(el.tagName==='SELECT'){if([...el.options].some(o=>o.value===d.value))el.value=d.value}else el.value=d.value});
  if(snap.focus){const el=[...document.querySelectorAll('input,select,textarea')].find(x=>c15FieldKey(x)===snap.focus);if(el){el.focus({preventScroll:true});try{el.setSelectionRange(snap.start,snap.end)}catch(e){}}}
  scrollTo(snap.scrollX,snap.scrollY)
}
function c15IsCommitButton(btn){if(!btn||btn.matches('.c1-step,.minus,.plus,.tradeKindBtn,.c1-disclosure,.c14-bank-toggle,.c1-panel-close,.c11-phase-close,[data-flow-v480],.projectExpandV475,.v475-project-chevron'))return false;const t=(btn.textContent||'').trim().toUpperCase();return /^(MUA|BÁN|GỬI|CẬP NHẬT|LƯU|CHỐT|THU HỒI|XÁC NHẬN|BẮT ĐẦU|TỪ CHỐI|ĐỒNG Ý|ÁP DỤNG|ĐẶT|TRẢ HẾT|THANH TOÁN)/.test(t)}
document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(c15IsCommitButton(b)){C15_SKIP_FORM_RESTORE=true;C15_FORM_SNAPSHOT=null}},true);
const _renderC15Forms=render;
render=function(){if(!C15_SKIP_FORM_RESTORE)c15CaptureForms();const out=_renderC15Forms();if(C15_SKIP_FORM_RESTORE){C15_SKIP_FORM_RESTORE=false;C15_FORM_SNAPSHOT=null}else c15RestoreForms();return out};

function c15QueuedPropertyM2(d=readPsPrepV45()){return(d.lots||[]).filter(l=>l.kind==='property').reduce((n,l)=>n+Math.max(0,Number(l.items?.propertyM2)||0),0)}
const _buildManualPsLotC15=buildManualPsLotV481;
buildManualPsLotV481=function(){const lot=_buildManualPsLotC15();if(lot?.kind==='property'){const s=load(),available=Math.max(0,Number(s.investments?.property?.available)||0),queued=c15QueuedPropertyM2(),qty=Math.max(0,Number(lot.items?.propertyM2)||0),left=Math.max(0,c1RoundMoney(available-queued));if(qty>left)throw new Error(`Không thể thêm gói ${c1FormatNumber(qty)} m²: phiên chỉ còn ${c1FormatNumber(left)} m² chưa xếp vào combo. Hãy giảm số m² hoặc xóa một combo bất động sản đã tạo.`)}return lot};
function c15AuctionError(error){const m=String(error?.message||error||'');if(/PROPERTY_LOTS_EXCEED_AVAILABLE/.test(m))return'Tổng bất động sản trong các combo vượt lượng còn lại. Hãy giảm số m² hoặc xóa bớt combo bất động sản rồi thử lại.';if(/PLAYER_AUTH_REQUIRED/.test(m))return'Phiên người chơi trên thiết bị này đã hết hạn. Hãy bấm “Đổi vai trò”, chọn lại đúng người chơi rồi gửi giá lại.';if(/ADMIN_AUTH_REQUIRED/.test(m))return'Phiên Host đã hết hạn. Hãy đăng nhập lại quyền Host rồi thao tác lại.';if(/INVALID_AUCTION_DURATION/.test(m))return'Thời gian đấu giá phải từ 5 đến 3.600 giây.';if(/INVALID_AUCTION_LOTS/.test(m))return'Phiên phải có từ 1 đến 20 combo hợp lệ.';if(/AUCTION_ALREADY_ACTIVE/.test(m))return'Một phiên đấu giá khác đang chạy. Hãy chờ hoặc kết thúc phiên đó trước.';return m||'Không thực hiện được thao tác đấu giá.'}
const _startMarketAuctionC15=startMarketAuctionV481;
startMarketAuctionV481=async function(lots,duration,source='manual'){const available=Math.max(0,Number(load().investments?.property?.available)||0),total=(lots||[]).filter(l=>l.kind==='property').reduce((n,l)=>n+Math.max(0,Number(l.items?.propertyM2)||0),0);if(total>available)throw new Error(`Tổng ${c1FormatNumber(total)} m² trong phiên vượt ${c1FormatNumber(available)} m² còn lại. Hãy giảm hoặc xóa bớt combo bất động sản.`);try{return await _startMarketAuctionC15(lots,duration,source)}catch(e){throw new Error(c15AuctionError(e))}};

async function c15ValidatePlayerSession(){const token=currentMemberToken();if(!ROOM?.id||!ROOM?.code||!token)throw new Error('PLAYER_AUTH_REQUIRED');const {data,error}=await SB.rpc('resume_game_role',{p_room_code:ROOM.code,p_member_token:token});if(error)throw new Error('PLAYER_AUTH_REQUIRED');const row=Array.isArray(data)?data[0]:data;if(!row||row.role!=='player'||row.player_name!==session?.name)throw new Error('PLAYER_AUTH_REQUIRED');return token}
submitPsBidV45=async function(lotId){if(V481_PLAYER_BID_BUSY.has(String(lotId)))return;const input=document.querySelector(`.psBidInputV45[data-lot="${CSS.escape(String(lotId))}"]`),bid=c1ParseNumber(input?.value);if(!Number.isFinite(bid)||bid<0){c1Toast('Hãy nhập một mức giá hợp lệ.','sell');input?.focus({preventScroll:true});return}V481_PLAYER_BID_BUSY.add(String(lotId));const btn=bidButtonForLotV481(lotId);if(btn){btn.disabled=true;btn.textContent='ĐANG GỬI...'}try{const token=await c15ValidatePlayerSession(),{data,error}=await SB.rpc('submit_market_auction_bid',{p_room_id:ROOM.id,p_lot_id:lotId,p_bid:bid,p_member_token:token});if(error)throw error;if(AUCTION_SNAPSHOT){const lot=(AUCTION_SNAPSHOT.lots||[]).find(l=>String(l.id)===String(lotId));if(lot){lot.currentPrice=Number(data?.currentPrice??bid);lot.currentBidder=data?.currentBidder||session.name}}if(input)input.value='';patchAuctionStageV45();await fetchAuctionSnapshotV45();await broadcastRoomSignal('market_auction_changed',{lotId});c1Toast('Đã ghi nhận giá đấu của bạn.','buy')}catch(e){c1Toast(c15AuctionError(e),'sell')}finally{V481_PLAYER_BID_BUSY.delete(String(lotId));const b=bidButtonForLotV481(lotId);if(b){b.disabled=false;b.textContent='GỬI GIÁ'}}};

const _c11PhaseNoticeC15=c11PhaseNotice;
c11PhaseNotice=function(name,s){if(s.phase!=='P5')return _c11PhaseNoticeC15(name,s);const p=s.players?.[name],ids=p?playerTargetsV475(p,s):[],pending=ids.filter(pid=>!['locked','declined','ineligible'].includes(projectDecisionV475(p,pid)));if(!ids.length)return sessionStorage.getItem(c11PhaseNoticeKey(name,s))==='1'?'':`<div class="c11-phase-notice" id="c11PhaseNotice"><div class="c11-phase-notice-card p5" role="dialog" aria-modal="true"><button type="button" class="c11-phase-close" aria-label="Đóng thông báo">×</button><div class="c11-phase-notice-title">⏳ P5 · ĐANG CHỜ NGƯỜI CHƠI CHỐT DỰ ÁN</div><div class="notice">Bạn không có dự án cần chốt ở giai đoạn này. Bạn có thể đóng thông báo và tiếp tục xem giao diện.</div></div></div>`;return`<div class="c11-phase-notice c15-p5-focus" id="c11PhaseNotice"><div class="c11-phase-notice-card p5" role="dialog" aria-modal="true"><div class="c11-phase-notice-title">${pending.length?'🎯 P5 · CHỐT DỰ ÁN':'✅ ĐÃ GỬI QUYẾT ĐỊNH · ĐANG CHỜ'}</div>${pending.length?p4ActionV475(name,s):'<div class="success">Quyết định của bạn đã được ghi nhận. Hãy chờ những người chơi còn lại và Host chuyển sang bước đấu thầu.</div>'}</div></div>`};

/* Host chốt P6 luôn tự điền trần dự án cho người chưa gửi, kể cả CONTROL. */
finalizeP6V480=async function(){if(V480_AUTO_BUSY)return false;const s=load();if(s.phase!=='P6'||!ROOM?.id||!SB||!ADMIN_TOKEN)return false;V480_AUTO_BUSY=true;try{await ensureProcurementOpenV480();const fresh=load(),{data,error}=await SB.rpc('finalize_project_auctions_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_round:fresh.round,p_auto_mode:true});if(error)throw error;const rows=Array.isArray(data?.results)?data.results:[],out=[];for(const pr of projects(fresh)){const parts=eligibleProjectContenders(fresh,pr.id);if(!parts.length){out.push({round:fresh.round,projectId:pr.id,winner:null,bid:0,payout:0,competitive:false,solo:false,competitors:[]});continue}if(parts.length===1){out.push({round:fresh.round,projectId:pr.id,winner:parts[0],bid:0,payout:Number(pr.reward)||0,competitive:false,solo:true,competitors:parts});continue}const r=rows.find(x=>String(x.project_id)===String(pr.id));out.push({round:fresh.round,projectId:pr.id,winner:r?.winner||null,bid:Number(r?.winning_bid)||0,payout:Number(r?.winning_bid)||0,competitive:true,solo:false,competitors:parts,autoFilled:r?.auto_filled||[]})}fresh.results=(fresh.results||[]).filter(r=>r.round!==fresh.round).concat(out);for(const r of out)if(r.autoFilled?.length)logPush(fresh,`${r.projectId}: ${r.autoFilled.join(', ')} chưa gửi giá nên hệ thống dùng mức tối đa của dự án.`);if(settleProjectsCore(fresh)){fresh.timer={duration:0,remaining:0,endAt:null,running:false,expired:true,autoPassed:{}};logPush(fresh,'✅ Đã chốt giá thấp nhất, tự điền mức tối đa cho người chưa gửi và thanh toán dự án.');save(fresh);await broadcastRoomSignal('state_changed',{reason:'P6_finalized'});render();return true}return false}finally{V480_AUTO_BUSY=false}};

/* A trade card owns one immutable latest-message block; no async chat history. */
function c15FreezeLatestMessage(card,t){card.querySelectorAll('.trade-message-note,.c1-trade-msg,.neg-chat,.negotiation-history').forEach(x=>x.remove());if(t?.message){const price=card.querySelector('.trade-price-v476')||card.querySelector('.c15-invest-price-change')||card.querySelector('.c1-money')?.closest('div');price?.insertAdjacentHTML('afterend',`<div class="trade-message-note c15-latest-message">💬 <b>Lời nhắn mới nhất:</b> ${esc(t.message)}</div>`)}}
const _incomingTradeCardC15Stable=incomingTradeCard;
incomingTradeCard=function(name,t){const html=_incomingTradeCardC15Stable(name,t),box=document.createElement('div');box.innerHTML=html;const card=box.firstElementChild;if(card)c15FreezeLatestMessage(card,t);return box.innerHTML};
const _c1TradeCardC15Stable=c1TradeCard;
c1TradeCard=function(name,t){const html=_c1TradeCardC15Stable(name,t),box=document.createElement('div');box.innerHTML=html;const card=box.firstElementChild;if(card)c15FreezeLatestMessage(card,t);return box.innerHTML};

(function installC15SafetyStyles(){const st=document.createElement('style');st.id='c15-safety-styles';st.textContent=`
  .c15-p5-focus{cursor:default}.c15-p5-focus .c11-phase-notice-card{max-height:min(84vh,780px)}
  .c15-latest-message{contain:layout paint;overflow-wrap:anywhere;min-height:44px;display:flex;align-items:center}
  input,select,textarea{caret-color:auto} input:focus,select:focus,textarea:focus{position:relative;z-index:2}
`;document.head.appendChild(st)})();

/* ========================================================================== */
/* C1.6 — trạng thái màu cá nhân hóa cho từng combo đấu giá.                 */
/* Chỉ tác động trình bày; không thay đổi giá, người dẫn hoặc luồng RPC.      */
/* ========================================================================== */
function c16AuctionVisualState(lot,role=session?.role,name=session?.name){
  if(!lot?.currentBidder)return'unbid';
  return role==='player'&&name&&String(lot.currentBidder)===String(name)?'mine':'other';
}
function c16ApplyAuctionLotVisual(card,lot,role=session?.role,name=session?.name){
  if(!card||!lot)return;
  const state=c16AuctionVisualState(lot,role,name),leader=card.querySelector('[data-ps-leader]');
  card.classList.remove('c16-auction-unbid','c16-auction-other','c16-auction-mine');
  card.classList.add(`c16-auction-${state}`);
  card.classList.toggle('high',state==='mine');
  card.dataset.auctionVisualState=state;
  if(leader){
    leader.classList.add('c16-auction-status');
    leader.textContent=state==='unbid'?'○ Chưa có ai trả giá':state==='mine'?'✓ Bạn đang dẫn đầu':`● ${lot.currentBidder} đang dẫn đầu`;
  }
}
const _auctionLotCardC16Base=auctionLotCardV45;
auctionLotCardV45=function(lot,role,name,ended=false){
  const html=_auctionLotCardC16Base(lot,role,name,ended),box=document.createElement('div');box.innerHTML=html;
  c16ApplyAuctionLotVisual(box.firstElementChild,lot,role,name);
  return box.innerHTML;
};
const _patchAuctionStageC16Base=patchAuctionStageV45;
patchAuctionStageV45=function(){
  const out=_patchAuctionStageC16Base(),snap=AUCTION_SNAPSHOT;
  for(const lot of snap?.lots||[]){
    const card=[...document.querySelectorAll('[data-ps-lot]')].find(x=>String(x.dataset.psLot)===String(lot.id));
    c16ApplyAuctionLotVisual(card,lot,session?.role,session?.name);
  }
  return out;
};
(function installC16AuctionStyles(){const st=document.createElement('style');st.id='c16-auction-visual-styles';st.textContent=`
  .ps-lot.c16-auction-unbid,.ps-lot.c16-auction-other,.ps-lot.c16-auction-mine{transition:border-color .18s ease,background-color .18s ease,box-shadow .18s ease;overflow:hidden}
  .ps-lot.c16-auction-unbid{border:2px solid #cbd5e1!important;background:linear-gradient(145deg,#f8fafc,#f1f5f9)!important;box-shadow:none!important}
  .ps-lot.c16-auction-unbid .ps-price{color:#64748b!important}.ps-lot.c16-auction-unbid .c16-auction-status{color:#64748b!important;background:#e2e8f0!important;border-color:#cbd5e1!important}
  .ps-lot.c16-auction-other{border:2px solid #f59e0b!important;background:linear-gradient(145deg,#fffbeb,#fff7ed)!important;box-shadow:0 7px 20px rgba(245,158,11,.13)!important}
  .ps-lot.c16-auction-other .ps-price{color:#9a3412!important}.ps-lot.c16-auction-other .c16-auction-status{color:#9a3412!important;background:#ffedd5!important;border-color:#fdba74!important}
  .ps-lot.c16-auction-mine{border:3px solid #10b981!important;background:linear-gradient(145deg,#ecfdf5,#d1fae5)!important;box-shadow:0 9px 24px rgba(5,150,105,.24),inset 0 0 0 1px rgba(255,255,255,.78)!important}
  .ps-lot.c16-auction-mine .ps-price{color:#047857!important}.ps-lot.c16-auction-mine .c16-auction-status{color:#065f46!important;background:#bbf7d0!important;border-color:#34d399!important;font-weight:950!important}
  .ps-lot .c16-auction-status{display:inline-flex;align-items:center;max-width:100%;margin-top:7px;padding:6px 9px;border:1px solid;border-radius:999px;line-height:1.25;overflow-wrap:anywhere}
  @media(max-width:480px){.ps-lot .c16-auction-status{display:flex;width:100%;border-radius:10px}.ps-lot.c16-auction-mine{border-width:2px!important}}
`;document.head.appendChild(st)})();

/* ========================================================================== */
/* M1 — P5/P6 multi-project procurement + per-project promo + time input.     */
/* ========================================================================== */
V480_PHASE_DEFAULTS.P1=120;
V480_PHASE_DEFAULTS.P5=15;
V480_PHASE_DEFAULTS.P6=30;

function c17ProjectDecisionDone(p,pid){return['locked','declined','ineligible'].includes(projectDecisionV475(p,pid))}
function c17SetProjectDecision(name,pid,decision){
  const s=load(),p=s.players?.[name];
  if(!p||s.phase!=='P5'||!playerTargetsV475(p,s).includes(pid)||c17ProjectDecisionDone(p,pid))return false;
  p.projectDecisions=p.projectDecisions&&typeof p.projectDecisions==='object'?p.projectDecisions:{};
  if(decision==='locked'){
    if(!canLockProjectV475(p,s,pid)){c1Toast(`Không đủ tài nguyên còn lại để chốt ${pid}.`,'sell');return false}
    p.projectDecisions[String(pid)]='locked';logPush(s,`${name} chốt riêng dự án ${pid}.`)
  }else{
    p.projectDecisions[String(pid)]='declined';logPush(s,`${name} từ chối riêng dự án ${pid}.`)
  }
  syncLegacyProjectFieldsV475(p,s);save(s);render();return true
}
bindP4ActionsV475=function(name){
  document.querySelectorAll('.lockProjectV475').forEach(b=>b.onclick=()=>c17SetProjectDecision(name,b.dataset.project,'locked'));
  document.querySelectorAll('.declineProjectV475').forEach(b=>b.onclick=()=>c17SetProjectDecision(name,b.dataset.project,'declined'))
};

const C17_AUCTION_ENSURE_BUSY=new Set(),C17_AUCTION_ENSURE_DONE=new Set();
function c17ProcurementKey(s,pid){return`${ROOM?.id||ROOM?.code||'offline'}:R${s.round}:${pid}`}
async function c17EnsurePlayerAuction(name,pid){
  const s=load(),key=c17ProcurementKey(s,pid);if(s.phase!=='P6'||auctionState(s,pid)||C17_AUCTION_ENSURE_BUSY.has(key)||C17_AUCTION_ENSURE_DONE.has(key)||!ROOM?.id||!SB)return auctionState(s,pid);
  C17_AUCTION_ENSURE_BUSY.add(key);
  try{
    const token=await c15ValidatePlayerSession(),{data,error}=await SB.rpc('c17_ensure_project_auction_player',{p_room_id:ROOM.id,p_round:s.round,p_project_id:pid,p_member_token:token});
    if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row)throw new Error('Không nhận được trạng thái phiên đấu thầu.');
    const fresh=load(),root=ensureAuctionStateRoot(fresh);root[pid]={participants:row.participants||[],status:row.status||'open',bidRound:Number(row.bid_round)||1};
    localStorage.setItem(STATE_KEY,JSON.stringify(fresh));C17_AUCTION_ENSURE_DONE.add(key);render();return root[pid]
  }catch(e){
    const m=String(e?.message||e);const el=document.querySelector(`[data-c17-auction-wait="${CSS.escape(String(pid))}"]`);
    const msg=/PGRST202|schema cache|Could not find the function/i.test(m)?'Máy chủ thiếu bộ cài M1. Host cần chạy file SQL M1 rồi tải lại trang.':/NOT_AUCTION_PARTICIPANT|NOT_CONTESTED/i.test(m)?'Dự án này chưa đủ hai người đã chốt hợp lệ để mở thầu.':/PLAYER_AUTH_REQUIRED/i.test(m)?'Phiên người chơi đã hết hạn. Hãy vào lại đúng vai trò người chơi.':`Chưa mở được phiên thầu: ${m}`;
    if(el)el.textContent=msg;else c1Toast(msg,'sell');throw e
  }finally{C17_AUCTION_ENSURE_BUSY.delete(key)}
}
function c17EnsureAllPlayerAuctions(name){
  const s=load(),p=s.players?.[name];if(s.phase!=='P6'||!p)return;
  for(const pid of lockedProjectIdsV475(p,s).filter(id=>eligibleProjectContenders(s,id).length>1))c17EnsurePlayerAuction(name,pid).catch(()=>{})
}

const _bidCardC17Base=bidCard;
bidCard=function(name,s){
  const html=_bidCardC17Base(name,s);if(!html)return html;const box=document.createElement('div');box.innerHTML=html,card=box.firstElementChild;
  card?.classList.add('c17-procurement-card');
  card?.querySelectorAll('.v475-bid-item').forEach(item=>{if(!item.dataset.v475BidIsland){const text=item.querySelector('.notice');const pid=[...lockedProjectIdsV475(s.players?.[name],s)].find(id=>item.textContent.includes(id));if(text&&pid){text.dataset.c17AuctionWait=pid;text.textContent='Đang đồng bộ phiên đấu thầu an toàn với máy chủ…'}}});
  return card?.outerHTML||html
};

submitSealedBidV475=async function(name,pid){
  let s=load(),p=s.players?.[name];if(!p||s.phase!=='P6'||!ROOM?.id)throw new Error('P6 hoặc phòng chơi chưa sẵn sàng.');
  let a=auctionState(s,pid);if(!a){await c17EnsurePlayerAuction(name,pid);s=load();a=auctionState(s,pid)}
  if(!a||!Array.isArray(a.participants)||!a.participants.includes(name))throw new Error(`Bạn chưa được ghi nhận trong phiên thầu ${pid}. Hãy tải lại trang; nếu vẫn lỗi, Host chạy SQL M1.`);
  const x=bidInputStateV475(name,pid,s);if(!x.valid){const msg=!x.hasLegalBid?`Không còn mức giá hợp lệ cho ${pid}: máy chủ yêu cầu tối thiểu ${x.min}M${x.exclusive?` và giá phải thấp hơn ${x.exclusive}M`:''}. Không thể gửi giá trong vòng này.`:x.exclusive?`Giá vòng hòa của ${pid} phải từ ${x.min}M đến ${x.max}M, thấp hơn ${x.exclusive}M.`:`Giá chào ${pid} phải từ ${x.min} đến tối đa ${x.max}M và chỉ dùng một chữ số thập phân.`;c1Toast(msg,'sell');x.input?.focus({preventScroll:true});return}
  const ok=await uiConfirmV46({title:'GỬI GIÁ CHÀO KÍN?',rows:[['Dự án',pid],['Đối thủ',(a.participants||[]).filter(n=>n!==name).join(' · ')],['Giá chào',`${x.amount}M`],['Tối đa',`${x.max}M`]],message:'Giá này chỉ áp dụng cho đúng dự án và vòng thầu đang hiển thị.',confirmText:'GỬI GIÁ CHÀO'});if(!ok)return;
  const token=await c15ValidatePlayerSession(),{data,error}=await SB.rpc('submit_project_auction_bid',{p_room_id:ROOM.id,p_round:s.round,p_project_id:pid,p_bid:x.amount,p_member_token:token,p_admin_token:null,p_admin_player_name:null});
  if(error){const m=String(error.message||error);if(/BID_ALREADY_SUBMITTED/.test(m)){setAuctionSubmittedLocal(name,s,pid,a.bidRound,true);render();return}if(/BID_EXCEEDS_CASH/.test(m))throw new Error('Supabase vẫn đang dùng luật cũ giới hạn giá chào theo tiền mặt. Host hãy chạy SQL M1.3_TO_M1.4 rồi thử lại.');if(/BID_ABOVE_PROJECT_BUDGET/.test(m))throw new Error(`Giá chào vượt mức tối đa ${x.max}M của ${pid}.`);if(/BID_NOT_LOWER_THAN_TIE/.test(m))throw new Error(`Vòng hòa yêu cầu giá mới thấp hơn ${x.exclusive||a.tieCeiling}M.`);if(/AUCTION_NOT_OPEN/.test(m)){C17_AUCTION_ENSURE_DONE.delete(c17ProcurementKey(s,pid));throw new Error(`Phiên ${pid} chưa mở hoặc vừa được Host chốt. Hãy tải lại trạng thái.`)}if(/NOT_AUCTION_PARTICIPANT/.test(m))throw new Error(`Bạn không nằm trong danh sách thầu ${pid} của vòng hiện tại.`);if(/PLAYER_AUTH_REQUIRED/.test(m))throw new Error('Phiên người chơi đã hết hạn. Hãy vào lại đúng vai trò rồi gửi lại.');throw error}
  const round=Number(data?.bid_round)||Number(a.bidRound)||1;setAuctionSubmittedLocal(name,s,pid,round,true);writeBidDraftV475(name,pid,'',s);logPush(s,`${name} đã gửi giá kín riêng cho ${pid}, vòng #${round}.`);save(s);render();c1Toast(`Đã ghi nhận giá thầu ${pid}.`,'buy')
};

function c17PromoRoundMap(p,s,create=false){
  if(create)p.projectPromoChoices=p.projectPromoChoices&&typeof p.projectPromoChoices==='object'?p.projectPromoChoices:{};
  if(create)p.projectPromoChoices[String(s.round)]=p.projectPromoChoices[String(s.round)]&&typeof p.projectPromoChoices[String(s.round)]==='object'?p.projectPromoChoices[String(s.round)]:{};
  return p.projectPromoChoices?.[String(s.round)]||{}
}
function c17PromoDraftKey(name,s,pid){return`tt_c17_promo:${ROOM?.code||roomInfo()?.code||'offline'}:${name}:R${s.round}:${pid}`}
function c17PromoDraft(name,s,pid){try{const v=sessionStorage.getItem(c17PromoDraftKey(name,s,pid));return v===null?null:v}catch(e){return null}}
function c17PromoCard(name,s){
  if(s.phase!=='P6')return'';const p=s.players?.[name],ids=lockedProjectIdsV475(p,s);if(!p||!ids.length)return'';
  const available=(p.promoCodes||[]).filter(c=>c.status==='available'),saved=c17PromoRoundMap(p,s),assigned=new Set(Object.values(saved).filter(Boolean).map(String));
  return`<div class="card c17-promo-card" id="c17PromoByProject"><div class="title">🎟️ Mã khuyến mãi theo từng dự án</div><div class="muted tiny">Chọn và xác nhận riêng cho từng dự án. Mã chỉ bị dùng nếu bạn thắng dự án đó; mỗi mã chỉ áp dụng cho một dự án.</div><div class="c17-promo-list">${ids.map(pid=>{const pr=projectById(s,pid),draft=c17PromoDraft(name,s,pid),current=draft!==null?draft:String(saved[pid]||'');return`<div class="c17-promo-project" data-c17-promo-project="${esc(pid)}"><div class="split"><b>${esc(pid)} · ${esc(pr?.name||pid)}</b><span class="badge">TỐI ĐA ${c1Money(pr?.reward||0)}</span></div>${available.length?`<div class="field"><label>Mã áp dụng nếu thắng dự án này</label><select class="c17PromoSelect" data-project="${esc(pid)}"><option value="">KHÔNG DÙNG MÃ</option>${available.map(c=>`<option value="${esc(c.id)}" ${(current===String(c.id))?'selected':''} ${(assigned.has(String(c.id))&&String(saved[pid]||'')!==String(c.id))?'disabled':''}>🎟️ ${esc(c.id)} · +${Number(c.percent)||0}%</option>`).join('')}</select></div><button type="button" class="btn secondary c17ConfirmPromo" data-project="${esc(pid)}">XÁC NHẬN CHO ${esc(pid)}</button>`:'<div class="notice">Bạn chưa có mã khuyến mãi khả dụng. Dự án sẽ nhận giá trị gốc.</div>'}${Object.prototype.hasOwnProperty.call(saved,pid)?`<div class="success c17-promo-saved">✓ Đã xác nhận: ${saved[pid]?esc(saved[pid]):'không dùng mã'}</div>`:''}</div>`}).join('')}</div></div>`
}
function c17BindPromo(name){
  document.querySelectorAll('.c17PromoSelect').forEach(sel=>{const saveDraft=()=>{try{sessionStorage.setItem(c17PromoDraftKey(name,load(),sel.dataset.project),sel.value)}catch(e){}};sel.oninput=saveDraft;sel.onchange=saveDraft});
  document.querySelectorAll('.c17ConfirmPromo').forEach(btn=>btn.onclick=()=>{const s=load(),p=s.players?.[name],pid=btn.dataset.project,sel=document.querySelector(`.c17PromoSelect[data-project="${CSS.escape(pid)}"]`);if(!p||s.phase!=='P6'||!sel)return;const map=c17PromoRoundMap(p,s,true),value=String(sel.value||''),duplicate=value&&Object.entries(map).some(([id,code])=>id!==pid&&String(code)===value);if(duplicate){c1Toast(`Mã ${value} đã được chọn cho dự án khác.`,'sell');return}map[pid]=value;try{sessionStorage.removeItem(c17PromoDraftKey(name,s,pid))}catch(e){}save(s);render();c1Toast(`Đã xác nhận mã cho ${pid}.`,'buy')})
}

const _normalizeStateC17=normalizeState;
normalizeState=function(s){s=_normalizeStateC17(s);for(const p of Object.values(s.players||{}))p.projectPromoChoices=p.projectPromoChoices&&typeof p.projectPromoChoices==='object'?p.projectPromoChoices:{};return s};
const _rebasePlayerStateC17=rebasePlayerStateV47;
rebasePlayerStateV47=function(base,local,latest){const out=_rebasePlayerStateC17(base,local,latest);for(const name of Object.keys(local.players||{})){const bp=base.players?.[name],lp=local.players?.[name],rp=out.players?.[name];if(bp&&lp&&rp&&JSON.stringify(lp.projectPromoChoices||{})!==JSON.stringify(bp.projectPromoChoices||{}))rp.projectPromoChoices=deep(lp.projectPromoChoices||{})}return out};

settleProjectsCore=function(s){
  if(s.settledRound===s.round)return false;const used=new Set();
  for(const r of (s.results||[]).filter(x=>x.round===s.round&&x.winner)){
    const pr=projectById(s,r.projectId),p=s.players?.[r.winner];if(!pr||!p||p.bankrupt||!enough(p,pr.need))continue;for(const[k,v]of Object.entries(pr.need))p.res[k]-=v;
    const base=resultBasePayoutV475(r,s),choice=String(c17PromoRoundMap(p,s)[r.projectId]||''),code=(p.promoCodes||[]).find(c=>String(c.id)===choice&&c.status==='available'&&!used.has(`${r.winner}:${c.id}`)),pct=Math.max(0,Number(code?.percent)||0),paid=Math.round(base*(1+pct/100)),bonus=Math.max(0,paid-base);
    p.money=roundMoneyV475((Number(p.money)||0)+paid);Object.assign(r,{payout:base,paidAmount:paid,promoPercent:pct,promoCode:code?.id||null,promoBonus:bonus});
    if(code){code.status='used';code.usedRound=s.round;code.usedProjectId=pr.id;code.usedAt=Date.now();used.add(`${r.winner}:${code.id}`);logPush(s,`🎟️ ${r.winner} dùng ${code.id} cho ${pr.id}: ${base}M + ${bonus}M = ${paid}M.`)}
    p.wins=p.wins||[];p.wins.push({round:s.round,projectId:r.projectId,reward:paid,bid:Number(r.bid)||0,payoutBase:base,competitive:!!r.competitive,promoPercent:pct,promoCode:code?.id||null,promoBonus:bonus});p.promoSelectedId=null
  }
  applyPhaseInterestV475(s,'P6','P7');s.settledRound=s.round;s.phase='P7';if(c1ApplyDividends(s))logPush(s,'📊 C1 đã chia cổ tức dự án theo tỷ lệ cổ phiếu; tiền được trừ từ doanh nghiệp trúng thầu.');logPush(s,`Đã thanh toán Thị trường ${s.round}: mã khuyến mãi được tính riêng theo từng dự án.`);return true
};
function c17P7ProjectResult(name,s){
  if(s.phase!=='P7')return'';const rows=(s.results||[]).filter(r=>r.round===s.round&&r.winner===name);if(!rows.length)return`<div class="card c17-result-card"><div class="title">📋 Kết quả dự án của bạn</div><div class="muted">Bạn không nhận dự án nào trong thị trường này.</div></div>`;
  return`<div class="card c17-result-card"><div class="title">🏆 Kết quả dự án và khuyến mãi của bạn</div>${rows.map(r=>{const base=resultBasePayoutV475(r,s),paid=Number(r.paidAmount??base)||0,bonus=Math.max(0,Number(r.promoBonus??paid-base)||0);return`<div class="c17-result-project"><div class="split"><b>${esc(r.projectId)}</b><b class="c17-result-total">${c1Money(paid)}</b></div><div class="c17-result-breakdown"><span>Giá dự án: <b>${c1Money(base)}</b></span><span>Mã: <b>${r.promoCode?`${esc(r.promoCode)} (+${Number(r.promoPercent)||0}%)`:'Không dùng'}</b></span><span>Tiền tăng thêm: <b class="bonus">+${c1Money(bonus)}</b></span></div></div>`}).join('')}</div>`
}

function c17PrivateAssetCard(left){return[...left?.children||[]].find(x=>x.querySelector?.('.money')||/Tài sản riêng/i.test(x.textContent||''))||null}
const _playerViewC17Base=playerView;
playerView=function(name){
  const s=load(),html=_playerViewC17Base(name);if(s.gameOver||s.specialAuction?.active)return html;const box=document.createElement('div');box.innerHTML=html,main=box.querySelector('.app > .grid.grid-2'),left=main?.children[0];if(!left)return html;
  const asset=c17PrivateAssetCard(left);if(s.phase==='P6'){
    left.querySelectorAll('#projectBidGroupV475,#c17PromoByProject,#promoP6CardV474,.promo-p6').forEach(x=>x.remove());
    const bidHtml=bidCard(name,s),promoHtml=c17PromoCard(name,s),slot=document.createElement('div');slot.className='c17-p6-focus-slot';slot.innerHTML=bidHtml+promoHtml;(asset||left.firstElementChild)?.insertAdjacentElement('afterend',slot)
  }
  if(s.phase==='P7'){left.querySelectorAll('.c17-result-card').forEach(x=>x.remove());const slot=document.createElement('div');slot.innerHTML=c17P7ProjectResult(name,s);(asset||left.firstElementChild)?.insertAdjacentElement('afterend',slot.firstElementChild)}
  return box.innerHTML
};
const _bindPlayerC17Base=bindPlayer;
bindPlayer=function(name){_bindPlayerC17Base(name);bindP4ActionsV475(name);c17BindPromo(name);c17EnsureAllPlayerAuctions(name)};

function c17ParseAuctionDuration(raw,fallback=60){const text=String(raw??'').trim();let sec=parsePhaseDurationV480(text);if(sec===null&&/^\d+$/.test(text))sec=Number(text);if(sec===null)sec=Number(fallback)||60;return Math.max(5,Math.min(3600,Math.round(sec)))}
const _psPrepPanelC17Base=psPrepPanelV45;
psPrepPanelV45=function(s){const html=_psPrepPanelC17Base(s),box=document.createElement('div');box.innerHTML=html,panel=box.firstElementChild,input=panel?.querySelector('#psDurationV45');if(input){const raw=String(input.value||readPsPrepV45().duration||60);input.type='text';input.inputMode='numeric';input.pattern='[0-9:]*';input.placeholder='VD: 01:30';if(!raw.includes(':')&&/^\d+$/.test(raw))input.value=fmtTime(Math.max(0,Number(raw)||0));const label=input.closest('.field')?.querySelector('label');if(label)label.textContent='Thời gian phiên đấu giá (MM:SS)'}return panel?.outerHTML||html};
const _bindPsPrepC17Base=bindPsPrepV45;
bindPsPrepV45=function(){_bindPsPrepC17Base();const old=document.getElementById('psDurationV45');if(!old)return;const input=old.cloneNode(true);old.replaceWith(input);if(!String(input.value||'').includes(':')&&/^\d+$/.test(String(input.value||'')))input.value=fmtTime(c17ParseAuctionDuration(input.value,readPsPrepV45().duration));const sync=()=>{capturePsFormV481();const d=readPsPrepV45();d.duration=c17ParseAuctionDuration(input.value,d.duration);d.form=d.form||{};d.form.durationRaw=input.value;writePsPrepV45(d)};input.oninput=sync;input.onchange=()=>{sync();input.value=fmtTime(c17ParseAuctionDuration(input.value,readPsPrepV45().duration));sync()}};
startPsAuctionV45=async function(){const d=readPsPrepV45();if(!d.lots?.length)return false;capturePsFormV481();const input=document.getElementById('psDurationV45'),duration=c17ParseAuctionDuration(input?.value,d.duration);d.duration=duration;d.form=d.form||{};d.form.durationRaw=fmtTime(duration);writePsPrepV45(d);return startMarketAuctionV481(deep(d.lots),duration,'manual')};

(function installC17Styles(){const st=document.createElement('style');st.id='c17-styles';st.textContent=`
  .c17-p6-focus-slot{display:grid;gap:12px;margin:0 0 12px}.c17-procurement-card{border:3px solid #0ea5e9!important;background:linear-gradient(145deg,#ecfeff,#fff)!important}.c17-promo-card{border:3px solid #a855f7;background:linear-gradient(145deg,#faf5ff,#fff7ed)}
  .c17-promo-list{display:grid;gap:9px;margin-top:10px}.c17-promo-project{border:1px solid #d8b4fe;background:rgba(255,255,255,.88);border-radius:13px;padding:10px}.c17-promo-project .field{margin-top:8px}.c17-promo-saved{margin-top:7px}.c17-result-card{border:3px solid #22c55e;background:linear-gradient(145deg,#f0fdf4,#fff)}
  .c17-result-project{border:1px solid #86efac;background:#fff;border-radius:13px;padding:11px;margin-top:9px}.c17-result-total{font-size:22px;color:#047857}.c17-result-breakdown{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:8px}.c17-result-breakdown span{background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:7px;font-size:12px}.c17-result-breakdown .bonus{color:#15803d}
  @media(max-width:600px){.c17-result-breakdown{grid-template-columns:1fr}.c17-p6-focus-slot{gap:9px}.c17-promo-project>.split{align-items:flex-start}.c17-promo-project>.split .badge{white-space:normal;text-align:right}}
`;document.head.appendChild(st)})();

/* M1 — unlimited system property market with dynamic, isolated pricing. */
const C17_PROPERTY_SYSTEM_SUPPLY=1000000000000;
function c17PropertyMarketMetrics(s){
  const players=Object.values(s?.players||{}),playerCount=Math.max(1,players.length),owned=players.reduce((n,p)=>n+Math.max(0,Number(p?.propertyM2)||0),0),used=players.reduce((n,p)=>n+Math.max(0,sumRes(p?.res||{})),0),capacity=Math.max(0,owned*C1_PROPERTY_CAPACITY_PER_M2),occupancy=capacity>0?Math.max(0,Math.min(1,used/capacity)):(used>0?1:0),round=Math.max(1,Number(s?.round)||1),growth=1+Math.max(0,round-1)*.12+Math.max(0,playerCount-3)*.025,base=2,buy=Math.max(.5,c1RoundMoney(base*growth*(.65+1.85*occupancy*occupancy))),sell=Math.max(.1,c1RoundMoney(buy*.60));
  return{owned,used,capacity,occupancy,occupancyPercent:c1RoundMoney(occupancy*100),growth:c1RoundMoney(growth),buyPrice:buy,sellPrice:sell,spreadPercent:40}
}
c1RefreshPropertyMarket=function(s){
  if(!s?.investments)return;const inv=s.investments,m=c17PropertyMarketMetrics(s);inv.property={...(inv.property||{}),schema:2,unlimited:true,available:C17_PROPERTY_SYSTEM_SUPPLY,total:C17_PROPERTY_SYSTEM_SUPPLY,seedOwned:Math.max(0,Number(inv.property?.seedOwned)||m.owned),buyPrice:m.buyPrice,sellPrice:m.sellPrice,scarcity:m.occupancyPercent,occupancy:m.occupancyPercent,marketGrowth:m.growth,spreadPercent:m.spreadPercent,updatedAt:Date.now()}
};

const _c1ApplyLocalActionC17Property=c1ApplyLocalAction;
c1ApplyLocalAction=function(s,actor,a){
  if(!['buy_property','sell_property'].includes(a?.kind))return _c1ApplyLocalActionC17Property(s,actor,a);
  c1EnsureInvestment(s);const p=s.players?.[actor];if(!p||p.bankrupt)throw new Error('Người chơi không hợp lệ hoặc đã phá sản.');if(s.gameOver||s.gameControl?.paused)throw new Error('Game đang khóa thao tác.');if(!['P1','P2','P4'].includes(s.phase))throw new Error('Mua/bán trực tiếp bất động sản chỉ mở ở P1, P2 và P4.');
  c1RefreshPropertyMarket(s);const q=c1RoundMoney(a.qty);if(!(q>0))throw new Error('Số m² phải lớn hơn 0.');const unit=a.kind==='buy_property'?Number(s.investments.property.buyPrice)||0:Number(s.investments.property.sellPrice)||0,total=c1RoundMoney(q*unit);
  if(a.kind==='buy_property'){if((Number(p.money)||0)<total)throw new Error(`Bạn cần ${c1Money(total)} để mua ${c1FormatNumber(q)} m² nhưng hiện không đủ tiền.`);p.money=c1RoundMoney(p.money-total);p.propertyM2=c1RoundMoney(p.propertyM2+q);c1RefreshPropertyMarket(s);return{tone:'buy',message:`Đã mua ${c1FormatNumber(q)} m² từ hệ thống với ${c1Money(total)}.`}}
  const max=c1AssetAvailable(s,actor,'property');if(q>max)throw new Error(`Bạn chỉ có thể bán ${c1FormatNumber(max)} m² đang không dùng chứa tồn kho.`);p.propertyM2=c1RoundMoney(p.propertyM2-q);p.money=c1RoundMoney(p.money+total);c1RefreshPropertyMarket(s);return{tone:'sell',message:`Đã bán ${c1FormatNumber(q)} m² lại cho hệ thống và nhận ${c1Money(total)}.`}
};

const _c1CommitActionC17Property=c1CommitAction;
c1CommitAction=async function(actor,action){
  if(!ROOM?.id||!SB||!['buy_property','sell_property'].includes(action?.kind))return _c1CommitActionC17Property(actor,action);
  if(C1_ACTION_BUSY)return;C1_ACTION_BUSY=true;
  try{
    const request={roomId:ROOM.id,action,memberToken:accessIsAdmin()?null:currentMemberToken(),adminToken:accessIsAdmin()?ADMIN_TOKEN:null,adminPlayerName:accessIsAdmin()?actor:null},{data,error}=await SB.rpc('c17_apply_property_market_action',{p_request:request});if(error){const m=String(error.message||error);if(/schema cache|PGRST202|Could not find the function/i.test(m))throw new Error('Máy chủ thiếu bộ cài bất động sản M1. Host cần chạy file SQL M1 rồi tải lại trang.');throw error}const row=Array.isArray(data)?data[0]:data;if(!row?.ok)throw new Error(row?.message||'Không cập nhật được bất động sản.');ROOM.revision=Number(row.revision)||ROOM.revision;storeRoom(ROOM);ROOM_BASE_STATE_V47=deep(row.state);localStorage.setItem(STATE_KEY,JSON.stringify(row.state));await broadcastRoomSignal('state_changed',{reason:'c17_property_market'}).catch(()=>{});render();c1Toast(row.message||'Đã cập nhật bất động sản.',row.tone||'info')
  }catch(e){c1PushError(c14VietnameseError(e));throw e}finally{C1_ACTION_BUSY=false}
};

const _c1InvestmentCardC17Property=c1InvestmentCard;
c1InvestmentCard=function(name,s){
  c1RefreshPropertyMarket(s);const html=_c1InvestmentCardC17Property(name,s),box=document.createElement('div');box.innerHTML=html;const market=box.querySelector('.c1-property-market'),prop=s.investments?.property||{};if(market){const info=market.querySelector('.split .muted.tiny');if(info)info.textContent=`Nguồn cung hệ thống không giới hạn · mức lấp đầy chung ${c1FormatNumber(prop.occupancy||0)}%`;const price=[...market.querySelectorAll('.tiny')].find(x=>x.textContent.includes('Giá mua'));price?.insertAdjacentHTML('afterend',`<div class="c17-property-formula">Giá tăng theo thị trường/vòng và mức lấp đầy tài nguyên chung. Hệ thống bán <b>${c1Money(prop.buyPrice||0)}/m²</b>, mua lại <b>${c1Money(prop.sellPrice||0)}/m²</b>; giao dịch giữa người chơi không dùng giá này.</div>`)}return box.innerHTML
};

const _buildManualPsLotC17Unlimited=buildManualPsLotV481;
buildManualPsLotV481=function(){
  const kind=document.getElementById('psLotKindV45')?.value;if(kind!=='property')return _buildManualPsLotC17Unlimited();const s=load(),qty=Math.max(.1,c1RoundMoney(c1ParseNumber(document.getElementById('c1AuctionPropertyQty')?.value))),start=Math.max(0,c1ParseNumber(document.getElementById('psStartPriceV45')?.value)),title=String(document.getElementById('psLotTitleV45')?.value||'').trim();return{kind:'property',title:title||`Bất động sản ×${qty} m²`,items:{propertyM2:qty},startPrice:start}
};

const _startMarketAuctionC17Unlimited=_startMarketAuctionC15;
startMarketAuctionV481=async function(lots,duration,source='manual'){
  if((lots||[]).some(l=>l.kind==='property')&&ROOM?.id&&SB&&accessIsAdmin()){
    const {data,error}=await SB.rpc('c17_enable_unlimited_property_market_admin',{p_room_id:ROOM.id,p_admin_token:ADMIN_TOKEN});if(error){const m=String(error.message||error);if(/schema cache|PGRST202|Could not find the function/i.test(m))throw new Error('Máy chủ thiếu bộ cài đấu giá bất động sản M1. Host cần chạy file SQL M1 rồi tải lại trang.');throw error}const row=Array.isArray(data)?data[0]:data;if(row?.state){ROOM.revision=Number(row.revision)||ROOM.revision;storeRoom(ROOM);ROOM_BASE_STATE_V47=deep(row.state);localStorage.setItem(STATE_KEY,JSON.stringify(row.state))}
  }
  try{return await _startMarketAuctionC17Unlimited(lots,duration,source)}catch(e){throw new Error(c15AuctionError(e))}
};

/* M1 hotfix — riêng bộ chỉnh thời gian đấu giá của Host: mỗi lần ±30 giây. */
(function installM1AuctionDurationStepStyles(){
  if(document.getElementById('m1-auction-duration-step-styles'))return;
  const st=document.createElement('style');st.id='m1-auction-duration-step-styles';st.textContent=`
    #psPrepPanel .m1-auction-duration-stepper{grid-template-columns:58px minmax(72px,1fr) 58px}
    #psPrepPanel .m1-auction-duration-stepper>.c1-step{font-size:13px;padding-inline:4px;white-space:nowrap}
    #psPrepPanel .m1-auction-duration-stepper>#psDurationV45{text-align:center}
  `;document.head.appendChild(st)
})();
function m1BindAuctionDurationStep(){
  const input=document.getElementById('psDurationV45'),wrap=input?.closest('.c1-stepper');
  if(!input||!wrap)return;
  const minus=wrap.querySelector('.c1-step.minus'),plus=wrap.querySelector('.c1-step.plus');
  if(!minus||!plus)return;
  wrap.classList.add('m1-auction-duration-stepper');minus.textContent='−30s';plus.textContent='+30s';
  const move=delta=>{
    const draft=readPsPrepV45(),current=c17ParseAuctionDuration(input.value,draft.duration),next=Math.max(5,Math.min(3600,current+delta));
    input.value=fmtTime(next);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus({preventScroll:true});
    if(typeof placeCaretAtEndV472==='function')placeCaretAtEndV472(input)
  };
  minus.onclick=()=>move(-30);plus.onclick=()=>move(30)
}
const _bindHostM1AuctionDuration=bindHost;
bindHost=function(){const result=_bindHostM1AuctionDuration();m1BindAuctionDurationStep();return result};

/* M1 hotfix — Host tạm dừng/tiếp tục đồng hồ đấu giá trên máy chủ. */
(function installM1AuctionPauseStyles(){
  if(document.getElementById('m1-auction-pause-styles'))return;
  const st=document.createElement('style');st.id='m1-auction-pause-styles';st.textContent=`
    .m1-auction-host-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
    .m1-auction-host-actions .btn{margin:0}
    .ps-hero.m1-auction-paused{background:linear-gradient(135deg,#334155,#475569)!important;border-color:#94a3b8!important}
    .m1-auction-paused-note{display:inline-flex;margin-top:7px;padding:5px 9px;border-radius:999px;background:#fff;color:#334155;font-size:12px;font-weight:900}
    .ps-stage.m1-auction-is-paused .psSubmitBidV45,.ps-stage.m1-auction-is-paused .psBidInputV45{pointer-events:none;opacity:.55}
    @media(max-width:520px){.m1-auction-host-actions{display:grid;grid-template-columns:1fr}.m1-auction-host-actions .btn{width:100%}}
  `;document.head.appendChild(st)
})();
function m12AuctionEndMs(snap=AUCTION_SNAPSHOT){
  const raw=snap?.endsAtMs??snap?.ends_at??snap?.endsAt;let value=Number(raw);
  if(Number.isFinite(value)&&value>0)return value<1e12?value*1000:value;
  const parsed=Date.parse(String(raw||''));if(Number.isFinite(parsed))return parsed;
  return 0
}
function m12AuctionIsClosed(snap=AUCTION_SNAPSHOT){
  const status=String(snap?.status||'live').toLowerCase();return snap?.active===false||['closed','finished','settled','cancelled'].includes(status)
}
function m1AuctionSeconds(snap=AUCTION_SNAPSHOT){
  if(m12AuctionIsClosed(snap))return 0;
  if(snap?.paused)return Math.max(0,Math.min(3600,Number(snap.pausedRemainingSeconds)||0));
  return Math.max(0,Math.min(3600,Math.ceil((m12AuctionEndMs(snap)-Date.now())/1000)));
}
function m1PatchAuctionPauseUi(){
  const snap=AUCTION_SNAPSHOT,stage=document.querySelector('[data-ps-stage="1"]');if(!snap||!stage)return;
  const closed=m12AuctionIsClosed(snap),paused=!closed&&!!snap.paused,hero=stage.querySelector('.ps-hero'),timer=stage.querySelector('#psTimerV45');
  stage.classList.toggle('m1-auction-is-paused',paused);hero?.classList.toggle('m1-auction-paused',paused);
  if(timer)timer.textContent=fmtTime(m1AuctionSeconds(snap));
  let note=hero?.querySelector('.m1-auction-paused-note');
  if(paused&&!note){note=document.createElement('div');note.className='m1-auction-paused-note';note.textContent='⏸ ĐẤU GIÁ ĐANG TẠM DỪNG';timer?.insertAdjacentElement('afterend',note)}
  if(!paused)note?.remove();
  const toggle=document.getElementById('togglePsAuctionPauseM1');
  if(toggle){toggle.textContent=closed?'✓ ĐẤU GIÁ ĐÃ KẾT THÚC':paused?'▶ TIẾP TỤC ĐẤU GIÁ':'⏸ DỪNG ĐẤU GIÁ';toggle.classList.toggle('good',paused);toggle.classList.toggle('secondary',!paused);toggle.disabled=closed}
}
const _auctionStageM1PauseBase=auctionStageV45;
auctionStageV45=function(s,role,name=null){
  const snap=AUCTION_SNAPSHOT,oldEnd=snap?.endsAtMs,normalizedEnd=m12AuctionEndMs(snap);if(snap&&normalizedEnd)snap.endsAtMs=normalizedEnd;
  let html;try{html=_auctionStageM1PauseBase(s,role,name)}finally{if(snap)snap.endsAtMs=oldEnd}
  if(role!=='host')return html;
  const box=document.createElement('div');box.innerHTML=html;const hero=box.querySelector('.ps-hero'),finish=box.querySelector('#finishPsAuctionV45');
  if(hero&&finish&&!box.querySelector('#togglePsAuctionPauseM1')){
    const actions=document.createElement('div');actions.className='m1-auction-host-actions';
    finish.insertAdjacentElement('beforebegin',actions);actions.appendChild(finish);
    actions.insertAdjacentHTML('afterbegin','<button type="button" class="btn secondary" id="togglePsAuctionPauseM1">⏸ DỪNG ĐẤU GIÁ</button>')
  }
  return box.innerHTML
};
async function m1ToggleAuctionPause(){
  const btn=document.getElementById('togglePsAuctionPauseM1');if(!btn||btn.disabled||!ROOM?.id||!SB)return;
  btn.disabled=true;
  try{
    const latest=await fetchAuctionSnapshotV45();if(m12AuctionIsClosed(latest)){m1PatchAuctionPauseUi();c1Toast('Phiên đấu giá đã kết thúc.','info');return}
    const {data,error}=await SB.rpc('toggle_market_auction_pause_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id});if(error)throw error;
    AUCTION_SNAPSHOT=data||await fetchAuctionSnapshotV45();m1PatchAuctionPauseUi();
    await broadcastRoomSignal('market_auction_changed',{reason:data?.paused?'auction_paused':'auction_resumed',auctionId:data?.auctionId});
    c1Toast(data?.paused?'Đã dừng thời gian đấu giá.':'Đấu giá đã tiếp tục.','info')
  }catch(e){const message=String(e?.message||e);if(/AUCTION_CLOSED/i.test(message)){await fetchRoomLatest().catch(()=>{});c1Toast('Phiên đấu giá đã kết thúc nên không thể đổi đồng hồ.','info');render();return}c1Toast('Không đổi được trạng thái thời gian đấu giá: '+message,'sell');btn.disabled=false}
}
const _patchAuctionStageM1PauseBase=patchAuctionStageV45;
patchAuctionStageV45=function(){const out=_patchAuctionStageM1PauseBase();m1PatchAuctionPauseUi();return out};
const _bindAuctionStageM1PauseBase=bindAuctionStageV45;
bindAuctionStageV45=function(){
  const out=_bindAuctionStageM1PauseBase(),btn=document.getElementById('togglePsAuctionPauseM1');if(btn)btn.onclick=m1ToggleAuctionPause;
  if(AUCTION_POLL)clearInterval(AUCTION_POLL);
  AUCTION_POLL=setInterval(async()=>{try{
    const snap=await fetchAuctionSnapshotV45();if(!snap)return;
    m1PatchAuctionPauseUi();if(m12AuctionIsClosed(snap)||snap.paused)return;
    const sec=m1AuctionSeconds(snap),el=document.getElementById('psTimerV45');if(el)el.textContent=fmtTime(sec);
    if(sec<=0){document.querySelectorAll('.ps-lot').forEach(x=>x.classList.add('ps-ended'));await finishPsAuctionV45(false)}
  }catch(e){}},700);
  m1PatchAuctionPauseUi();return out
};
const _timerTickM1AuctionPauseBase=timerTick;
timerTick=function(){
  const snap=AUCTION_SNAPSHOT;if(!snap?.paused)return _timerTickM1AuctionPauseBase();
  const old=snap.endsAtMs;snap.endsAtMs=Date.now()+m1AuctionSeconds(snap)*1000;
  try{return _timerTickM1AuctionPauseBase()}finally{snap.endsAtMs=old;m1PatchAuctionPauseUi()}
};

/* M1 hotfix — tách tuyệt đối Tên / Doanh nghiệp / Tiền trong Setup. */
function m1SetupPlayersFromLiveGame(){
  const s=load(),entries=Object.entries(s?.players||{});if(!ROOM?.id||!entries.length)return null;
  const configured=Array.isArray(s.setup?.players)?s.setup.players:[];
  return entries.map(([name,p],i)=>{
    const cfg=configured.find(x=>String(x?.name||'')===String(name))||configured[i]||{};
    return{name:String(name),businessId:p?.businessId||cfg.businessId||BUSINESS_CATALOG[i]?.id,money:Number.isFinite(Number(cfg.money))?Math.max(0,c1RoundMoney(cfg.money)):80}
  })
}
const _newSetupDraftM1SafeBase=newSetupDraftV461;
newSetupDraftV461=function(){
  const d=_newSetupDraftM1SafeBase(),live=m1SetupPlayersFromLiveGame();if(!live)return d;
  d.count=Math.max(3,Math.min(20,live.length));
  live.forEach((p,i)=>{if(d.players[i])d.players[i]={...d.players[i],...p}});
  d.dirty=false;return d
};
function m1LockSetupCashWhileGameRunning(){
  const running=!!ROOM?.id&&Object.keys(load()?.players||{}).length>0&&!load()?.gameOver;
  document.querySelectorAll('.c1CashAll').forEach(btn=>{btn.disabled=running;btn.title=running?'Không thể đổi tiền đầu game khi ván đang chạy.':''});
  const card=document.querySelector('.c1-setup-quick');
  if(card&&running&&!card.querySelector('.m1-live-setup-lock'))card.insertAdjacentHTML('beforeend','<div class="notice m1-live-setup-lock" style="margin-top:8px"><b>Ván đang chạy:</b> khóa cộng tiền đầu game để bảo toàn tên và dữ liệu người chơi. Hãy kết thúc ván trước khi tạo thiết lập mới.</div>')
}
const _setupViewM1SafeBase=setupView;
setupView=function(){
  const html=_setupViewM1SafeBase(),box=document.createElement('div');box.innerHTML=html,d=ensureSetupDraftV461();
  box.querySelectorAll('[data-setup-row]').forEach((row,i)=>{
    const p=d.players[i];if(!p)return;
    const name=row.querySelector('input.setupName'),money=row.querySelector('input.setupMoney'),biz=row.querySelector('select.setupBiz');
    if(name)name.value=String(p.name||'');if(money)money.value=c1FormatNumber(p.money??80);if(biz)biz.value=p.businessId||BUSINESS_CATALOG[i]?.id
  });
  return box.innerHTML
};
const _bindSetupM1SafeBase=bindSetup;
bindSetup=function(){
  const out=_bindSetupM1SafeBase(),d=ensureSetupDraftV461();
  document.querySelectorAll('[data-setup-row]').forEach((row,i)=>{
    const name=row.querySelector('input.setupName'),money=row.querySelector('input.setupMoney'),biz=row.querySelector('select.setupBiz');if(!d.players[i])return;
    if(name)name.oninput=()=>{d.players[i].name=String(name.value);d.dirty=true};
    if(money)money.oninput=()=>{d.players[i].money=Math.max(0,c1RoundMoney(c1ParseNumber(money.value)));d.dirty=true};
    if(biz)biz.onchange=()=>{d.players[i].businessId=biz.value;d.dirty=true}
  });
  m1LockSetupCashWhileGameRunning();return out
};

/* M1 hotfix — sức chứa khi đấu giá tài nguyên + theo dõi quyết định P5 của Host. */
const _c15AuctionErrorM1CapacityBase=c15AuctionError;
c15AuctionError=function(error){
  const m=String(error?.message||error||'');
  if(/AUCTION_PROPERTY_CAPACITY_EXCEEDED/.test(m)){
    const free=m.match(/FREE=([\d.]+)/)?.[1],need=m.match(/NEEDED=([\d.]+)/)?.[1];
    return`Bất động sản không đủ sức chứa nếu bạn thắng combo này.${free&&need?` Còn chứa ${c1FormatNumber(free)} đơn vị nhưng cần thêm ${c1FormatNumber(need)}.`:''} Hãy mua thêm bất động sản hoặc giảm lượng tài nguyên đang giữ.`
  }
  if(/AUCTION_PAUSED/.test(m))return'Đấu giá đang được Host tạm dừng. Hãy chờ Host cho tiếp tục.';
  return _c15AuctionErrorM1CapacityBase(error)
};
function m1AuctionCapacityCheck(name,lotId,s=load()){
  if(!s.investments?.enabled)return{ok:true};const p=s.players?.[name],lots=AUCTION_SNAPSHOT?.lots||[],lot=lots.find(x=>String(x.id)===String(lotId));
  if(!p||!lot||lot.kind!=='resources')return{ok:true};
  const cap=c1Capacity(p),qty=x=>Object.values(x?.items||{}).reduce((n,v)=>n+Math.max(0,Number(v)||0),0),already=lot.currentBidder===name;
  const held=lots.filter(x=>x.kind==='resources'&&x.currentBidder===name&&String(x.id)!==String(lotId)).reduce((n,x)=>n+qty(x),0),needed=already?0:qty(lot),free=Math.max(0,cap.free-held);
  return{ok:needed<=free,free,needed,held}
}
const _submitPsBidM1CapacityBase=submitPsBidV45;
submitPsBidV45=async function(lotId){
  const x=m1AuctionCapacityCheck(session?.name,lotId);if(!x.ok){c1Toast(`Bất động sản chỉ còn chứa ${c1FormatNumber(x.free)} đơn vị; combo cần thêm ${c1FormatNumber(x.needed)}. Hãy mua thêm bất động sản trước khi trả giá.`,'sell');return false}
  return _submitPsBidM1CapacityBase(lotId)
};
function m1ProjectDecisionStatus(p,pid,s){
  const targeted=playerTargetsV475(p,s).includes(pid),decision=projectDecisionV475(p,pid);
  if(decision==='locked')return['locked','✓ ĐÃ CHỐT'];if(decision==='declined')return['declined','✕ TỪ CHỐI'];if(targeted&&(decision==='ineligible'||!canLockProjectV475(p,s,pid)))return['ineligible','❌ KHÔNG ĐỦ ĐIỀU KIỆN'];if(targeted)return['pending','… CHƯA CHỐT'];return['untargeted','— KHÔNG CHỌN']
}
function m1HostP5DecisionPanel(s){
  const names=Object.keys(s.players||{}),rows=projects(s);return`<div class="card m1-p5-monitor"><div class="split"><div><div class="title">📋 Theo dõi chốt dự án P5</div><div class="muted tiny">Cập nhật theo trạng thái thực tế của từng người chơi.</div></div><span class="badge">${names.length} NGƯỜI</span></div><div class="m1-p5-projects">${rows.map(pr=>`<div class="m1-p5-project"><b>${esc(pr.id)} · ${esc(pr.name)}</b><div class="m1-p5-statuses">${names.map(name=>{const [cls,label]=m1ProjectDecisionStatus(s.players[name],pr.id,s);return`<span class="m1-p5-status ${cls}"><strong>${esc(name)}</strong>${label}</span>`}).join('')}</div></div>`).join('')}</div></div>`
}
(function installM1P5MonitorStyles(){
  if(document.getElementById('m1-p5-monitor-styles'))return;const st=document.createElement('style');st.id='m1-p5-monitor-styles';st.textContent=`
    .m1-p5-projects{display:grid;gap:9px;margin-top:10px}.m1-p5-project{padding:10px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc}
    .m1-p5-statuses{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}.m1-p5-status{display:inline-grid;gap:1px;padding:6px 8px;border:1px solid;border-radius:9px;font-size:11px;line-height:1.2}.m1-p5-status strong{font-size:12px}
    .m1-p5-status.locked{color:#166534;background:#dcfce7;border-color:#86efac}.m1-p5-status.declined{color:#991b1b;background:#fee2e2;border-color:#fca5a5}.m1-p5-status.ineligible{color:#991b1b;background:#fff1f2;border-color:#fb7185}.m1-p5-status.pending{color:#92400e;background:#fef3c7;border-color:#fcd34d}.m1-p5-status.untargeted{color:#64748b;background:#f1f5f9;border-color:#cbd5e1}
    @media(max-width:520px){.m1-p5-statuses{display:grid;grid-template-columns:1fr 1fr}.m1-p5-status{min-width:0}}
  `;document.head.appendChild(st)
})();
const _hostViewM1P5MonitorBase=hostView;
hostView=function(){
  const html=_hostViewM1P5MonitorBase(),s=load();if(s.phase!=='P5'||s.specialAuction?.active||s.gameOver)return html;
  const box=document.createElement('div');box.innerHTML=html,left=box.querySelector('.host-dashboard > .stack');if(left&&!box.querySelector('.m1-p5-monitor')){
    const phase=[...left.children].find(x=>x.querySelector?.('.phase'));phase?.insertAdjacentHTML('afterend',m1HostP5DecisionPanel(s))
  }
  return box.innerHTML
};

/* M1 — mã hiển thị ngắn, ổn định cho giao dịch; ID dữ liệu thật không đổi. */
function m1TradeCode(id,namespace='R'){
  const src=`${namespace}:${String(id)}`;let h=2166136261;
  for(let i=0;i<src.length;i++){h^=src.charCodeAt(i);h=Math.imul(h,16777619)}
  return Math.abs(h>>>0).toString(36).toUpperCase().padStart(5,'0').slice(-5)
}
function m1ReplaceTradeCodes(root){
  if(!root)return;
  const patch=(scope,namespace)=>{
    if(!scope||scope.dataset?.m1Codes==='1')return;const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const n of nodes)n.nodeValue=n.nodeValue.replace(/#(\d+)/g,(_,id)=>`#${m1TradeCode(id,namespace)}`);
    if(scope.dataset)scope.dataset.m1Codes='1'
  };
  root.querySelectorAll?.('.c1-trade-card,#c1InvestmentInbox .c14-outgoing').forEach(x=>patch(x,'I'));
  root.querySelectorAll?.('.trade[data-trade-id],#tradeInboxCardV463 .footer-note,#tradeInboxCardV463 .neg-chat,#tradeInboxCardV463 .neg-archive,.c14-outgoing').forEach(x=>{if(!x.closest('#c1InvestmentInbox'))patch(x,'R')})
}
(function installM1TradeCodeStyles(){
  if(document.getElementById('m1-trade-code-styles'))return;const st=document.createElement('style');st.id='m1-trade-code-styles';st.textContent=`
    .trade-status,.c1-trade-head .badge,.neg-chat-head .tiny,.c14-out-row>span{font-variant-numeric:tabular-nums}
    .trade-status,.c1-trade-head .badge{font-size:10px!important;font-weight:750!important;letter-spacing:.035em!important;color:#64748b!important;background:#f8fafc!important}
  `;document.head.appendChild(st)
})();
const _playerViewM1TradeCodeBase=playerView;
playerView=function(name){const html=_playerViewM1TradeCodeBase(name),box=document.createElement('div');box.innerHTML=html;m1ReplaceTradeCodes(box);return box.innerHTML};
const _renderM1TradeCodeBase=render;
render=function(){const out=_renderM1TradeCodeBase();m1ReplaceTradeCodes(document);return out};

const _bindHostC17Property=bindHost;
bindHost=function(){_bindHostC17Property();const change=()=>{if(document.getElementById('psLotKindV45')?.value!=='property')return;const s=load(),qty=Math.max(.1,c1ParseNumber(document.getElementById('c1AuctionPropertyQty')?.value)),range=lotPriceRangeV480(s,{kind:'property',items:{propertyM2:qty}}),el=document.getElementById('c1PropertySuggestion');if(el)el.innerHTML=`Nguồn cung Host không giới hạn · khoảng giá tham khảo ${c1Money(range.min)}–${c1Money(range.max)}.`};document.getElementById('psLotKindV45')?.addEventListener('change',change);document.getElementById('c1AuctionPropertyQty')?.addEventListener('input',change);change()};

(function installC17PropertyStyles(){const st=document.createElement('style');st.id='c17-property-market-styles';st.textContent=`
  .c17-property-formula{margin-top:7px;padding:8px 10px;border:1px solid #7dd3fc;border-radius:10px;background:#fff;color:#334155;font-size:12px;line-height:1.4}
`;document.head.appendChild(st)})();

/* M1 hotfix — P6 tách chốt thầu khỏi thanh toán để người thắng chọn mã KM. */
function m1PromoSettlementReady(s){return s.phase==='P6'&&Number(s.m1PromoSettlement?.round)===Number(s.round)&&!!s.m1PromoSettlement?.prepared}
function m1WinningProjectRows(s){return(s.results||[]).filter(r=>Number(r.round)===Number(s.round)&&r.winner&&projectById(s,r.projectId))}
function m1AvailablePromoCodes(p){return(p?.promoCodes||[]).filter(c=>c.status==='available')}
function m1PromoChoiceStatus(s,r){
  const p=s.players?.[r.winner],codes=m1AvailablePromoCodes(p),map=c17PromoRoundMap(p||{},s),answered=Object.prototype.hasOwnProperty.call(map,String(r.projectId)),choice=answered?String(map[r.projectId]||''):'';
  if(!codes.length)return{kind:'no_code',label:'Không có mã khuyến mại',percent:0};
  if(!answered)return{kind:'waiting',label:'Đang chờ chọn mã hoặc bỏ qua',percent:0};
  if(!choice)return{kind:'skip',label:'Đã chọn không sử dụng mã',percent:0};
  const code=codes.find(c=>String(c.id)===choice);return code?{kind:'selected',label:`Đã thêm mã +${Number(code.percent)||0}%`,percent:Number(code.percent)||0,code}:{kind:'waiting',label:'Mã đã chọn không còn khả dụng; cần chọn lại',percent:0}
}
function m1PromoWaitRows(s){return m1WinningProjectRows(s).filter(r=>m1PromoChoiceStatus(s,r).kind==='waiting')}
function m1SkipUnansweredPromos(s){
  for(const r of m1PromoWaitRows(s)){const p=s.players?.[r.winner];if(p)c17PromoRoundMap(p,s,true)[String(r.projectId)]=''}
}

c17PromoCard=function(name,s){
  if(!m1PromoSettlementReady(s))return'';const p=s.players?.[name],ids=m1WinningProjectRows(s).filter(r=>r.winner===name).map(r=>String(r.projectId));if(!p||!ids.length)return'';
  const available=m1AvailablePromoCodes(p),saved=c17PromoRoundMap(p,s),assigned=new Set(Object.values(saved).filter(Boolean).map(String));
  return`<div class="card c17-promo-card m1-promo-choice" id="c17PromoByProject"><div class="title">🎟️ Chọn mã khuyến mại trước khi thanh toán</div><div class="muted tiny">Chỉ các dự án bạn đã thắng mới xuất hiện. Xác nhận một mã hoặc bấm “Không sử dụng”; mỗi mã chỉ dùng cho một dự án.</div><div class="c17-promo-list">${ids.map(pid=>{const pr=projectById(s,pid),draft=c17PromoDraft(name,s,pid),hasSaved=Object.prototype.hasOwnProperty.call(saved,pid),current=draft!==null?draft:String(saved[pid]||'');return`<div class="c17-promo-project" data-c17-promo-project="${esc(pid)}"><div class="split"><b>${esc(pid)} · ${esc(pr?.name||pid)}</b><span class="badge">TỐI ĐA ${c1Money(pr?.reward||0)}</span></div>${available.length?`<div class="m1-promo-code-grid">${available.map(c=>`<button type="button" class="m1PromoPick ${(current===String(c.id))?'selected':''}" data-project="${esc(pid)}" data-code="${esc(c.id)}" ${(assigned.has(String(c.id))&&String(saved[pid]||'')!==String(c.id))?'disabled':''}><span>🎟️ ${esc(c.id)}</span><strong>+${Number(c.percent)||0}%</strong></button>`).join('')}</div><div class="m1-promo-actions"><button type="button" class="btn good c17ConfirmPromo" data-project="${esc(pid)}" data-value="${esc(current)}" ${!current?'disabled':''}>DÙNG MÃ ĐÃ CHỌN</button><button type="button" class="btn secondary m1SkipPromo" data-project="${esc(pid)}">KHÔNG SỬ DỤNG</button></div>`:'<div class="notice">Bạn không có mã khuyến mại khả dụng; hệ thống không chờ lựa chọn này.</div>'}${hasSaved?`<div class="success c17-promo-saved">✓ ${saved[pid]?`Đã chọn mã ${esc(saved[pid])}`:'Đã xác nhận không sử dụng mã'}</div>`:''}</div>`}).join('')}</div></div>`
};
c17BindPromo=function(name){
  document.querySelectorAll('.m1PromoPick').forEach(btn=>btn.onclick=()=>{const root=btn.closest('[data-c17-promo-project]');root?.querySelectorAll('.m1PromoPick').forEach(x=>x.classList.toggle('selected',x===btn));const confirm=root?.querySelector('.c17ConfirmPromo');if(confirm){confirm.dataset.value=btn.dataset.code||'';confirm.disabled=false}});
  const commit=(btn,value)=>{const s=load(),p=s.players?.[name],pid=String(btn.dataset.project||'');if(!p||!m1PromoSettlementReady(s)||!m1WinningProjectRows(s).some(r=>r.winner===name&&String(r.projectId)===pid))return;const map=c17PromoRoundMap(p,s,true),duplicate=value&&Object.entries(map).some(([id,code])=>id!==pid&&String(code)===value);if(duplicate){c1Toast(`Mã ${value} đã được chọn cho dự án khác.`,'sell');return}map[pid]=value;try{sessionStorage.removeItem(c17PromoDraftKey(name,s,pid))}catch(e){}save(s);broadcastRoomSignal('state_changed',{reason:'P6_promo_answered',player:name,projectId:pid}).catch(()=>{});render();c1Toast(value?`Đã chọn mã ${value} cho ${pid}.`:`Đã xác nhận không dùng mã cho ${pid}.`,'buy')};
  document.querySelectorAll('.c17ConfirmPromo').forEach(btn=>btn.onclick=()=>commit(btn,String(btn.dataset.value||'')));
  document.querySelectorAll('.m1SkipPromo').forEach(btn=>btn.onclick=()=>commit(btn,''))
};

function m1HostPromoStatusPanel(s){
  if(s.phase!=='P6')return'';if(!m1PromoSettlementReady(s))return`<div class="m1-promo-host"><b>🎟️ Trạng thái mã khuyến mại</b><div class="muted tiny">Chưa chốt kết quả đấu thầu. Bấm nút chốt để xác định người thắng và kiểm tra người cần chọn mã.</div></div>`;
  const rows=m1WinningProjectRows(s);if(!rows.length)return`<div class="m1-promo-host"><b>🎟️ Trạng thái mã khuyến mại</b><div class="success">Không có người thắng dự án cần thanh toán.</div></div>`;
  return`<div class="m1-promo-host"><div class="split"><b>🎟️ Đang chờ người chơi thêm khuyến mại</b><span class="badge">${m1PromoWaitRows(s).length} ĐANG CHỜ</span></div><div class="m1-promo-host-list">${rows.map(r=>{const x=m1PromoChoiceStatus(s,r);return`<div class="m1-promo-host-row ${x.kind}"><span><b>${esc(r.winner)}</b><small>${esc(r.projectId)}</small></span><strong>${esc(x.label)}</strong></div>`}).join('')}</div></div>`
}
function m1PatchHostPromoUi(root,s){
  const card=root?.querySelector('.p6-procurement-v480');if(!card)return;card.querySelector('.m1-promo-host')?.remove();card.querySelector('.tiny.muted:last-child')?.insertAdjacentHTML('beforebegin',m1HostPromoStatusPanel(s));
  const btn=card.querySelector('#finalizeP6V480'),waiting=m1PromoWaitRows(s).length;if(!btn)return;
  if(!m1PromoSettlementReady(s))btn.textContent='CHỐT THẦU & KIỂM TRA MÃ';else if(waiting){btn.textContent=`ĐANG CHỜ ${waiting} LỰA CHỌN`;btn.disabled=true}else btn.textContent='CHỐT & THANH TOÁN'
}

const _hostViewM1PromoBase=hostView;
hostView=function(){const html=_hostViewM1PromoBase(),box=document.createElement('div');box.innerHTML=html;m1PatchHostPromoUi(box,load());return box.innerHTML};

const _playerViewM1PromoBase=playerView;
playerView=function(name){
  const html=_playerViewM1PromoBase(name),s=load();if(!m1PromoSettlementReady(s))return html;const box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('#projectBidGroupV475').forEach(x=>x.remove());let promo=box.querySelector('#c17PromoByProject'),notice=box.querySelector('.c11-phase-notice-card');
  if(!notice){box.querySelector('.app')?.insertAdjacentHTML('beforeend','<div class="c11-phase-notice" id="c11PhaseNotice"><div class="c11-phase-notice-card p6" role="dialog" aria-modal="true"><div class="c11-phase-notice-title">P6 · KẾT QUẢ & THANH TOÁN</div></div></div>');notice=box.querySelector('.c11-phase-notice-card')}
  if(notice){notice.querySelector('.c11-phase-close')?.remove();notice.querySelector('.phase')?.remove();if(promo){promo.classList.remove('card');notice.appendChild(promo)}else if(m1WinningProjectRows(s).some(r=>r.winner===name))notice.insertAdjacentHTML('beforeend','<div class="success">✅ Bạn không có mã khuyến mại khả dụng. Không cần thao tác; hãy chờ Host thanh toán.</div>');else notice.insertAdjacentHTML('beforeend','<div class="notice">Bạn không thắng dự án trong vòng này. Hãy chờ Host hoàn tất thanh toán.</div>')}
  return box.innerHTML
};

finalizeP6V480=async function(autoMode=false){
  if(V480_AUTO_BUSY)return false;let s=load();if(s.phase!=='P6'||!ROOM?.id||!SB||!ADMIN_TOKEN)return false;V480_AUTO_BUSY=true;
  try{
    if(!m1PromoSettlementReady(s)){
      await ensureProcurementOpenV480();const fresh=load(),{data,error}=await SB.rpc('finalize_project_auctions_admin',{p_admin_token:ADMIN_TOKEN,p_room_id:ROOM.id,p_round:fresh.round,p_auto_mode:!!autoMode});if(error)throw error;const rows=Array.isArray(data?.results)?data.results:[],out=[];
      const pending=rows.filter(r=>['tie_rebid','waiting'].includes(String(r?.status||'')));
      if(pending.length){
        const root=ensureAuctionStateRoot(fresh);for(const r of pending){const pid=String(r.project_id||''),previous=root[pid]||{};root[pid]={...previous,participants:r.participants||previous.participants||[],status:'open',bidRound:Number(r.bid_round)||Number(previous.bidRound)||1,tieCeiling:r.max_bid_exclusive??r.winning_bid??previous.tieCeiling??null};if(r.status==='tie_rebid')logPush(fresh,`${pid} hòa giá thấp nhất ${r.winning_bid}M. Chỉ ${(r.participants||[]).join(', ')} đấu lại vòng #${root[pid].bidRound} với giá thấp hơn ${r.winning_bid}M.`)}
        const ties=pending.filter(r=>r.status==='tie_rebid'),waiting=pending.filter(r=>r.status==='waiting');delete fresh.m1PromoSettlement;fresh.results=(fresh.results||[]).filter(r=>Number(r.round)!==Number(fresh.round));fresh.timer.autoPassed=fresh.timer.autoPassed||{};
        if(ties.length){const duration=Math.max(5,typeof m14P6Seconds==='function'?m14P6Seconds(fresh):60);fresh.timer={duration,remaining:duration,endAt:Date.now()+duration*1000,running:true,expired:false,autoPassed:{...fresh.timer.autoPassed,P6:false}}}else if(autoMode){fresh.timer.running=false;fresh.timer.endAt=null;fresh.timer.expired=true;fresh.timer.autoPassed.P6=true}
        save(fresh);await broadcastRoomSignal('state_changed',{reason:'P6_tie_rebid',projects:pending.map(r=>r.project_id)});render();if(ties.length)c1Toast(`Có ${ties.length} dự án hòa giá. Các bên hòa phải gửi giá thấp hơn ở vòng mới.`,'info');else c1Toast(`Đang chờ: ${waiting.flatMap(r=>r.missing_players||[]).join(', ')} gửi giá vòng hòa.`,'info');return false
      }
      for(const pr of projects(fresh)){const parts=eligibleProjectContenders(fresh,pr.id);if(!parts.length){out.push({round:fresh.round,projectId:pr.id,winner:null,bid:0,payout:0,competitive:false,solo:false,competitors:[]});continue}if(parts.length===1){out.push({round:fresh.round,projectId:pr.id,winner:parts[0],bid:0,payout:Number(pr.reward)||0,competitive:false,solo:true,competitors:parts});continue}const r=rows.find(x=>String(x.project_id)===String(pr.id));out.push({round:fresh.round,projectId:pr.id,winner:r?.winner||null,bid:Number(r?.winning_bid)||0,payout:Number(r?.winning_bid)||0,competitive:true,solo:false,competitors:parts,autoFilled:r?.auto_filled||[]})}
      const promoSeconds=30;fresh.results=(fresh.results||[]).filter(r=>Number(r.round)!==Number(fresh.round)).concat(out);fresh.m1PromoSettlement={round:fresh.round,prepared:true,preparedAt:Date.now(),deadlineAt:Date.now()+promoSeconds*1000};fresh.timer={duration:promoSeconds,remaining:promoSeconds,endAt:Date.now()+promoSeconds*1000,running:true,expired:false,autoPassed:{P6:false}};for(const r of out)if(r.autoFilled?.length)logPush(fresh,`${r.projectId}: ${r.autoFilled.join(', ')} chưa gửi giá nên hệ thống dùng mức tối đa của dự án.`);logPush(fresh,'🎟️ Đã xác định người thắng. Dành 30 giây để người thắng chọn mã khuyến mại hoặc bỏ qua.');save(fresh);await broadcastRoomSignal('state_changed',{reason:'P6_promo_wait_started'});render();return false
    }
    const expired=s.timer?.expired||remainingTime(s)<=0;if(expired)m1SkipUnansweredPromos(s);
    const waiting=m1PromoWaitRows(s);if(waiting.length){save(s);render();c1Toast(`Đang chờ ${waiting.length} lựa chọn mã khuyến mại.`,'info');return false}
    if(settleProjectsCore(s)){s.timer={duration:0,remaining:0,endAt:null,running:false,expired:true,autoPassed:{}};delete s.m1PromoSettlement;logPush(s,'✅ Đã hoàn tất lựa chọn mã khuyến mại và thanh toán dự án.');save(s);await broadcastRoomSignal('state_changed',{reason:'P6_finalized'});render();return true}return false
  }finally{V480_AUTO_BUSY=false}
};

(function installM1PromoWaitingStyles(){if(document.getElementById('m1-promo-wait-styles'))return;const st=document.createElement('style');st.id='m1-promo-wait-styles';st.textContent=`
  .m1-promo-host{margin-top:10px;padding:11px;border:2px solid #a855f7;border-radius:12px;background:#faf5ff}.m1-promo-host-list{display:grid;gap:7px;margin-top:9px}.m1-promo-host-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border:1px solid;border-radius:10px;background:#fff}.m1-promo-host-row span{display:grid}.m1-promo-host-row small{color:#64748b}.m1-promo-host-row.waiting{border-color:#f59e0b;color:#92400e}.m1-promo-host-row.selected{border-color:#22c55e;color:#166534}.m1-promo-host-row.skip,.m1-promo-host-row.no_code{border-color:#cbd5e1;color:#475569}
  .m1-promo-code-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.m1PromoPick{display:flex;justify-content:space-between;align-items:center;padding:10px;border:2px solid #d8b4fe;border-radius:11px;background:#fff;color:#581c87}.m1PromoPick strong{font-size:18px}.m1PromoPick.selected{border-color:#16a34a;background:#dcfce7;color:#166534}.m1-promo-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.c11-phase-notice-card .m1-promo-choice{max-height:min(65vh,620px);overflow:auto;margin-top:8px}.c11-phase-notice-card .m1-promo-choice>.title{text-align:left}
  @media(max-width:560px){.m1-promo-code-grid,.m1-promo-actions{grid-template-columns:1fr}.m1-promo-host-row{align-items:flex-start;flex-direction:column}.c11-phase-notice-card .m1-promo-choice{max-height:66vh}}
`;document.head.appendChild(st)})();

/* M1 view-only — dự toán tiền mua/bán theo số m² đang nhập. */
const _c1InvestmentCardM1PropertyEstimateBase=c1InvestmentCard;
c1InvestmentCard=function(name,s){
  const html=_c1InvestmentCardM1PropertyEstimateBase(name,s),box=document.createElement('div');box.innerHTML=html,input=box.querySelector('#c1PropertyQty');
  if(input&&!box.querySelector('#m1PropertyEstimate'))input.closest('.field')?.insertAdjacentHTML('afterend','<div class="m1-property-estimate" id="m1PropertyEstimate" aria-live="polite"></div>');
  return box.innerHTML
};
function m1UpdatePropertyEstimate(){
  const input=document.getElementById('c1PropertyQty'),el=document.getElementById('m1PropertyEstimate');if(!input||!el)return;const s=load();c1RefreshPropertyMarket(s);const q=Math.max(0,c1ParseNumber(input.value)),prop=s.investments?.property||{},buy=c1RoundMoney(q*(Number(prop.buyPrice)||0)),sell=c1RoundMoney(q*(Number(prop.sellPrice)||0));
  el.innerHTML=`<span>Nếu mua <b>${c1FormatNumber(q)} m²</b></span><strong>Chi ${c1Money(buy)}</strong><span>Nếu bán lại</span><strong>Nhận ${c1Money(sell)}</strong>`
}
const _bindPlayerM1PropertyEstimateBase=bindPlayer;
bindPlayer=function(name){const out=_bindPlayerM1PropertyEstimateBase(name),input=document.getElementById('c1PropertyQty');input?.addEventListener('input',m1UpdatePropertyEstimate);input?.addEventListener('change',m1UpdatePropertyEstimate);document.querySelectorAll('#c1InvestmentCard .c1-step').forEach(b=>b.addEventListener('click',()=>setTimeout(m1UpdatePropertyEstimate,0)));m1UpdatePropertyEstimate();return out};

/* M1 — Host thêm dự án thủ công vào riêng thị trường hiện tại. */
function m1ManualProjectLimit(s){return c1ProjectCount(Object.keys(s.players||{}).length)}
function m1ManualProjectId(s){const used=new Set(projects(s).map(p=>String(p.id))),prefix=`DA${Number(s.round)||1}`;for(let i=1;i<100;i++){const id=prefix+String(i).padStart(2,'0');if(!used.has(id))return id}return`${prefix}${Date.now().toString(36).slice(-3).toUpperCase()}`}
function m1ManualProjectForm(s){
  const editable=['P1','P2','P3','P4'].includes(s.phase),count=projects(s).length,limit=m1ManualProjectLimit(s),replaceable=projects(s).filter(pr=>!Object.values(s.players||{}).some(p=>playerTargetsV475(p,s).includes(pr.id)));return`<div class="m1-manual-project"><div class="split"><div><b>＋ Thêm dự án thủ công</b><div class="muted tiny">Chỉ tác động Thị trường ${s.round}; bộ sinh dự án tự động không thay đổi.</div></div><span class="badge">${count}/${limit} DỰ ÁN</span></div>${editable&&(count<limit||replaceable.length)?`${count>=limit?`<div class="field"><label>Đã đủ trần 70% — chọn dự án chưa có người nhắm để thay thế</label><select id="m1ReplaceProject"><option value="">CHỌN DỰ ÁN CẦN THAY</option>${replaceable.map(pr=>`<option value="${esc(pr.id)}">${esc(pr.id)} · ${esc(pr.name)}</option>`).join('')}</select></div>`:''}<div class="field"><label>Tên dự án mới</label><input id="m1NewProjectName" type="text" autocomplete="off" maxlength="60" placeholder="Ví dụ: Trung tâm phân phối"></div><div class="m1-new-project-needs">${activeResourceKeys(s).map(k=>`<label><span>${RES[k].icon} ${RES[k].label}</span><input class="m1NewProjectNeed" data-res="${k}" type="text" inputmode="numeric" value="0"></label>`).join('')}</div><div class="field"><label>Giá trị tối đa của dự án (M)</label><input id="m1NewProjectReward" type="text" inputmode="decimal" value="10"></div><button type="button" class="btn good big" id="m1AddManualProject">${count>=limit?'THAY BẰNG DỰ ÁN THỦ CÔNG':'THÊM DỰ ÁN'} · THỊ TRƯỜNG ${s.round}</button>`:`<div class="notice" style="margin-top:9px">${!editable?'Chỉ được thêm dự án trong P1–P4 để không ảnh hưởng bước chốt và thanh toán.':`Đã đạt giới hạn ${limit} dự án và mọi dự án đều đang có người nhắm; không thể thay thế an toàn.`}</div>`}</div>`
}
function m1PatchManualProjectUi(root,s){
  const grid=root?.querySelector('.host-project-grid');if(!grid||root.querySelector('.m1-manual-project'))return;grid.insertAdjacentHTML('afterend',m1ManualProjectForm(s))
}
const _hostViewM1ManualProjectBase=hostView;
hostView=function(){const html=_hostViewM1ManualProjectBase(),box=document.createElement('div');box.innerHTML=html;m1PatchManualProjectUi(box,load());return box.innerHTML};
function m1BindManualProject(){
  const btn=document.getElementById('m1AddManualProject');if(!btn)return;btn.onclick=async()=>{const s=load(),list=projects(s),limit=m1ManualProjectLimit(s);if(!['P1','P2','P3','P4'].includes(s.phase)){c1Toast('Chỉ thêm dự án trong P1–P4.','sell');return}const replaceId=String(document.getElementById('m1ReplaceProject')?.value||'');if(list.length>=limit&&!replaceId){c1Toast(`Đã đủ trần ${limit} dự án; hãy chọn một dự án chưa có người nhắm để thay thế.`,'sell');return}if(replaceId&&Object.values(s.players||{}).some(p=>playerTargetsV475(p,s).includes(replaceId))){c1Toast('Dự án cần thay vừa có người nhắm; hãy chọn dự án khác.','sell');return}const name=String(document.getElementById('m1NewProjectName')?.value||'').trim(),reward=Math.max(0,c1RoundMoney(c1ParseNumber(document.getElementById('m1NewProjectReward')?.value))),need={};document.querySelectorAll('.m1NewProjectNeed').forEach(x=>need[x.dataset.res]=Math.max(0,Math.round(c1ParseNumber(x.value))));if(!name){c1Toast('Hãy nhập tên dự án mới.','sell');return}if(!Object.values(need).some(v=>v>0)){c1Toast('Dự án phải cần ít nhất một loại tài nguyên.','sell');return}if(!(reward>0)){c1Toast('Giá trị dự án phải lớn hơn 0.','sell');return}const id=m1ManualProjectId(s),pr={id,name,need,reward,manual:true,createdRound:s.round,createdAt:Date.now()};s.markets=s.markets||{};s.markets[s.round]=Array.isArray(s.markets[s.round])?s.markets[s.round]:[];if(replaceId){const at=s.markets[s.round].findIndex(x=>String(x.id)===replaceId);if(at<0){c1Toast('Dự án cần thay không còn tồn tại.','sell');return}s.markets[s.round].splice(at,1,pr);logPush(s,`🔁 Host thay dự án ${replaceId} bằng dự án thủ công ${id} · ${name}.`)}else{s.markets[s.round].push(pr);logPush(s,`➕ Host thêm dự án thủ công ${id} · ${name} vào Thị trường ${s.round}.`)}save(s);await broadcastRoomSignal('state_changed',{reason:'manual_project_added',projectId:id,replacedProjectId:replaceId||null}).catch(()=>{});render();c1Toast(`Đã đưa ${id} vào Thị trường ${s.round}.`,'buy')}
}
const _bindHostM1ManualProjectBase=bindHost;
bindHost=function(){const out=_bindHostM1ManualProjectBase();m1BindManualProject();return out};

(function installM1PropertyEstimateAndProjectStyles(){if(document.getElementById('m1-property-project-styles'))return;const st=document.createElement('style');st.id='m1-property-project-styles';st.textContent=`
  .m1-property-estimate{display:grid;grid-template-columns:1fr auto;gap:5px 10px;margin:7px 0 10px;padding:10px 12px;border:1px solid #7dd3fc;border-radius:11px;background:#fff;color:#334155;font-size:12px}.m1-property-estimate strong{text-align:right;font-size:14px}.m1-property-estimate strong:first-of-type{color:#b91c1c}.m1-property-estimate strong:last-of-type{color:#047857}
  .m1-manual-project{margin-top:12px;padding:13px;border:2px dashed #8b5cf6;border-radius:14px;background:#faf5ff}.m1-new-project-needs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.m1-new-project-needs label{display:grid;grid-template-columns:minmax(0,1fr) 80px;align-items:center;gap:7px;padding:8px;border:1px solid #ddd6fe;border-radius:10px;background:#fff}.m1-new-project-needs input{text-align:center}
  @media(max-width:560px){.m1-new-project-needs{grid-template-columns:1fr}.m1-new-project-needs label{grid-template-columns:minmax(0,1fr) 72px}}
`;document.head.appendChild(st)})();

/* M1.1 — chi tiết chia cổ tức ngay trong bảng kết quả P7. */
function m11DividendForResult(s,r){return(s.investments?.dividends||[]).find(d=>Number(d.round)===Number(r.round)&&String(d.projectId)===String(r.projectId)&&String(d.company)===String(r.winner))||null}
function m11DividendDetail(s,r){
  const d=m11DividendForResult(s,r),gross=Math.max(0,Number(r.paidAmount??r.payout??r.bid)||0);if(!s.investments?.enabled)return'';const payments=d?.payments||[],paid=payments.reduce((n,x)=>n+(Number(x.amount)||0),0),owner=Math.max(0,c1RoundMoney(gross-paid)),external=payments.reduce((n,x)=>n+(Number(x.shares)||0),0),ownerPct=Math.max(0,C1_SHARE_TOTAL-external);
  return`<div class="m11-dividend-detail"><div><span>${esc(r.winner)} thực nhận <b>${ownerPct}%</b></span><strong>${c1Money(owner)}</strong></div>${payments.length?payments.map(x=>`<div><span>Cổ đông <b>${esc(x.holder)}</b> · ${Number(x.shares)||0}%</span><strong>+${c1Money(x.amount)}</strong></div>`).join(''):'<div><span>Không có cổ đông bên ngoài</span><strong>0%</strong></div>'}</div>`
}
p7ResultsOverlayV476=function(s){
  if(s.phase!=='P7'||sessionStorage.getItem(p7DismissKeyV476(s))==='1')return'';const rows=m1WinningProjectRows(s).slice().sort((a,b)=>resultDisplayPayoutV475(b,s)-resultDisplayPayoutV475(a,s));if(!rows.length)return'';
  return`<div class="p7-overlay-v476" id="p7OverlayV476"><div class="p7-card-v476" role="dialog" aria-modal="true"><div class="p7-title-v476">🏆 KẾT QUẢ THỊ TRƯỜNG ${s.round}</div><div class="p7-sub-v476">Danh sách trúng dự án · kèm phần thực nhận và cổ tức</div>${rows.map((r,i)=>{const defeated=(r.competitors||[]).filter(n=>n!==r.winner),money=resultDisplayPayoutV475(r,s);return`<div class="p7-result-v476 m11-result"><span class="rank">${i+1}</span><div class="m11-result-main"><b>${esc(r.winner)} · ${esc(r.projectId)}</b><div class="tiny muted">${r.solo||!r.competitive?'Trúng thầu một mình':`Thắng ${defeated.length?defeated.map(esc).join(' · '):'các doanh nghiệp cạnh tranh'} với giá ${c1Money(r.bid||0)}`}</div>${m11DividendDetail(s,r)}</div><span class="money">${c1Money(money)}</span></div>`}).join('')}<button class="btn good big" id="dismissP7V476" style="margin-top:12px;width:100%">TÔI ĐÃ XEM KẾT QUẢ</button></div></div>`
};

/* M1.1 — chu kỳ sản xuất chi nhánh là cấu hình Host, mặc định 60 giây. */
const M11_BRANCH_PERIODS=[60,30,10];
function m11BranchPeriod(s){const n=Number(s?.branchMarket?.productionSeconds);return M11_BRANCH_PERIODS.includes(n)?n:60}
function m11BranchPeriodLabel(seconds){const n=Number(seconds)||60;return n%60===0?`${n/60} phút`:`${n} giây`}
const _normalizeStateM11BranchBase=normalizeState;
normalizeState=function(s){s=_normalizeStateM11BranchBase(s);if(s.branchMarket&&!M11_BRANCH_PERIODS.includes(Number(s.branchMarket.productionSeconds)))s.branchMarket.productionSeconds=60;return s};
const _processRealtimeEconomyM11BranchBase=processRealtimeEconomy;
processRealtimeEconomy=function(s,now=Date.now()){
  const held=new Map();for(const p of Object.values(s?.players||{})){held.set(p,p.branches);p.branches=[]}let changed=false;try{changed=!!_processRealtimeEconomyM11BranchBase(s,now)}finally{for(const[p,branches]of held)p.branches=branches}
  if(!s||s.gameOver||!s.realtimeClock?.running)return changed;const activeNow=activeElapsedMsNow(s,now),baseSeconds=m11BranchPeriod(s);
  for(const[name,p]of Object.entries(s.players||{}))for(const b of p.branches||[]){const own=b.res===p.businessId,period=(own?baseSeconds:baseSeconds*3)*1000,perCycle=own?(Number(b.count)||0):(Math.floor((Number(b.count)||0)/3)*2);if(perCycle<=0)continue;const bought=Math.max(0,Number(b.boughtAtActiveMs)||0),cycles=Math.floor(Math.max(0,activeNow-bought)/period),credited=Number(b.cyclesCredited)||0;if(cycles<=credited)continue;const planned=(cycles-credited)*perCycle,free=s.investments?.enabled?c1Capacity(p).free:planned,add=Math.max(0,Math.min(planned,free));if(add>0){p.res[b.res]=(Number(p.res[b.res])||0)+add;b.produced=Math.max(0,Number(b.produced)||0)+add;logPush(s,`🏭 Chi nhánh của ${name} tạo +${add} ${RES[b.res]?.icon||''} ${RES[b.res]?.label||b.res} theo chu kỳ ${m11BranchPeriodLabel(baseSeconds)}.`);changed=true}if(add<planned){p.capacityBlocked=true;logPush(s,`🏙️ Chi nhánh của ${name} dừng ${planned-add} đơn vị vượt sức chứa bất động sản.`)}b.cyclesCredited=cycles}
  return changed
};
function m11BranchDraftKey(){return`tt_m11_branch_draft:${ROOM?.code||roomInfo()?.code||'offline'}`}
function m11ReadBranchDraft(s){try{const x=JSON.parse(sessionStorage.getItem(m11BranchDraftKey())||'null');if(x&&typeof x==='object')return x}catch(e){}return{price:Number(s.branchMarket?.price)||0,seconds:m11BranchPeriod(s)}}
function m11WriteBranchDraft(d){try{sessionStorage.setItem(m11BranchDraftKey(),JSON.stringify(d))}catch(e){}}
const _branchMarketHostCardM11Base=branchMarketHostCard;
branchMarketHostCard=function(s){
  const html=_branchMarketHostCardM11Base(s);if(!html)return html;const box=document.createElement('div');box.innerHTML=html,card=box.firstElementChild,d=m11ReadBranchDraft(s),input=card?.querySelector('#branchPriceInput');if(input)input.value=c1FormatNumber(d.price);const apply=card?.querySelector('#applyBranchPrice');if(apply)apply.textContent='CẬP NHẬT GIÁ & CHU KỲ SẢN XUẤT';const note=card?.querySelector('.branch-price-draft-note-v463');if(note)note.innerHTML='✍️ Giá và chu kỳ bên dưới chỉ là <b>NHÁP</b>; chỉ đổi sau khi bấm nút cập nhật chung.';const controls=card?.querySelector('.branch-controls');controls?.insertAdjacentHTML('afterend',`<div class="m11-branch-period"><b>Chu kỳ sản xuất cơ bản</b><div>${M11_BRANCH_PERIODS.map(x=>`<button type="button" class="m11BranchPeriod ${Number(d.seconds)===x?'selected':''}" data-seconds="${x}">${m11BranchPeriodLabel(x)}</button>`).join('')}</div><small>Đúng thế mạnh: mỗi chu kỳ · ngoài thế mạnh: mỗi 3 chu kỳ.</small></div>`);const rules=card?.querySelectorAll('.branch-rule');rules?.forEach(x=>{if(/Cân bằng mặc định/.test(x.textContent))x.innerHTML=`<b>Chu kỳ hiện hành:</b> ${m11BranchPeriodLabel(m11BranchPeriod(s))}. Nhánh đúng thế mạnh: +1 đơn vị/nhánh mỗi chu kỳ. Nhánh ngoài thế mạnh: mỗi cụm 3 tạo +2 đơn vị sau 3 chu kỳ.`});return card?.outerHTML||html
};
const _branchPurchaseCardM11Base=branchPurchaseCard;
branchPurchaseCard=function(name,s){const html=_branchPurchaseCardM11Base(name,s),box=document.createElement('div');box.innerHTML=html,card=box.firstElementChild,label=m11BranchPeriodLabel(m11BranchPeriod(s));card?.querySelector('.title')?.insertAdjacentHTML('afterend',`<div class="m11-branch-current">⏱ Đang sản xuất theo chu kỳ <b>${label}</b></div>`);card?.querySelectorAll('.branch-chip').forEach(x=>{x.innerHTML=x.innerHTML.replace(/\+1 đơn vị\/phút\/nhánh/g,`+1 đơn vị/${label}/nhánh`).replace(/\+2 đơn vị\/3 phút mỗi cụm 3/g,`+2 đơn vị/${m11BranchPeriodLabel(m11BranchPeriod(s)*3)} mỗi cụm 3`) });return card?.outerHTML||html};
function m11BranchNotice(name,s){const n=s.branchMarket?.productionNotice;if(!n?.id||sessionStorage.getItem(`tt_m11_branch_notice:${ROOM?.code||'offline'}:${name}:${n.id}`)==='1')return'';return`<div class="m11-branch-notice" id="m11BranchNotice"><div><h2>🏭 CHU KỲ CHI NHÁNH ĐÃ THAY ĐỔI</h2><p>Host đã đổi chu kỳ sản xuất cơ bản thành <b>${m11BranchPeriodLabel(n.seconds)}</b>.</p><small>Chi nhánh đúng thế mạnh sản xuất mỗi chu kỳ; chi nhánh ngoài thế mạnh sản xuất sau 3 chu kỳ.</small><button type="button" class="btn good big" id="m11AckBranchNotice" data-notice="${esc(n.id)}">ĐÃ NHẬN TIN</button></div></div>`}
const _playerViewM11BranchNoticeBase=playerView;
playerView=function(name){const html=_playerViewM11BranchNoticeBase(name),s=load(),box=document.createElement('div');box.innerHTML=html;box.querySelector('.app')?.insertAdjacentHTML('beforeend',m11BranchNotice(name,s));return box.innerHTML};
const _bindPlayerM11BranchNoticeBase=bindPlayer;
bindPlayer=function(name){const out=_bindPlayerM11BranchNoticeBase(name),btn=document.getElementById('m11AckBranchNotice');if(btn)btn.onclick=()=>{sessionStorage.setItem(`tt_m11_branch_notice:${ROOM?.code||'offline'}:${name}:${btn.dataset.notice}`,'1');document.getElementById('m11BranchNotice')?.remove()};return out};
const _bindHostM11BranchBase=bindHost;
bindHost=function(){
  const out=_bindHostM11BranchBase(),s=load(),input=document.getElementById('branchPriceInput');if(input){input.oninput=()=>{const d=m11ReadBranchDraft(load());d.price=Math.max(0,c1ParseNumber(input.value));m11WriteBranchDraft(d)}}
  document.querySelectorAll('.branchPriceDelta').forEach(b=>b.onclick=()=>{const d=m11ReadBranchDraft(load()),next=Math.max(0,c1RoundMoney((Number(d.price)||0)+(Number(b.dataset.delta)||0)));d.price=next;m11WriteBranchDraft(d);if(input)input.value=c1FormatNumber(next)});
  document.querySelectorAll('.m11BranchPeriod').forEach(b=>b.onclick=()=>{const d=m11ReadBranchDraft(load());d.seconds=Number(b.dataset.seconds)||60;m11WriteBranchDraft(d);document.querySelectorAll('.m11BranchPeriod').forEach(x=>x.classList.toggle('selected',x===b))});
  const apply=document.getElementById('applyBranchPrice');if(apply)apply.onclick=async()=>{const state=load(),d=m11ReadBranchDraft(state),old=m11BranchPeriod(state),seconds=M11_BRANCH_PERIODS.includes(Number(d.seconds))?Number(d.seconds):60,price=Math.max(0,c1RoundMoney(d.price));state.branchMarket.price=price;state.branchMarket.lastPriceBumpActiveMs=activeElapsedMsNow(state);state.branchMarket.productionSeconds=seconds;if(seconds!==old){for(const p of Object.values(state.players||{}))for(const branch of p.branches||[]){branch.boughtAtActiveMs=activeElapsedMsNow(state);branch.cyclesCredited=0}state.branchMarket.productionNotice={id:`${Date.now().toString(36)}-${seconds}`,seconds,at:Date.now()};logPush(state,`📢 Host đổi chu kỳ sản xuất chi nhánh: ${m11BranchPeriodLabel(old)} → ${m11BranchPeriodLabel(seconds)}.`)}logPush(state,`Host cập nhật giá chi nhánh = ${c1Money(price)} và chu kỳ ${m11BranchPeriodLabel(seconds)}.`);sessionStorage.removeItem(m11BranchDraftKey());save(state);await broadcastRoomSignal('state_changed',{reason:'branch_settings_updated'}).catch(()=>{});render();c1Toast('Đã cập nhật giá và chu kỳ chi nhánh.','buy')};return out
};

/* M1.1 — bố cục trạng thái Host và số tiền lớn. */
function m11MoveHostPlayerStatus(root){const dash=root?.querySelector('.host-dashboard'),left=dash?.children?.[0],right=dash?.children?.[1];if(!left||!right)return;const status=[...right.children].find(x=>/Trạng thái người chơi/i.test(x.querySelector?.('.title')?.textContent||''));if(status){status.classList.add('m11-player-status');const flow=[...left.children].find(x=>x.querySelector?.('.phase'));(flow||left.firstElementChild)?.insertAdjacentElement('afterend',status)}}
const _hostViewM11LayoutBase=hostView;
hostView=function(){const html=_hostViewM11LayoutBase(),box=document.createElement('div');box.innerHTML=html;m11MoveHostPlayerStatus(box);return box.innerHTML};

/* Nhãn bản phát hành: mọi bề mặt đều dùng M1.1. */
const M11_VERSION='M1.5.2';
function m11Relabel(root=document){root?.querySelectorAll?.('.c1-version').forEach(x=>x.textContent=x.textContent.includes('BUILD')?`BUILD ${M11_VERSION}`:M11_VERSION);document.title=`THƯƠNG TRƯỜNG — ${M11_VERSION} Multiplayer`}
const _renderM11VersionBase=render;
render=function(){const out=_renderM11VersionBase();m11Relabel(document);return out};

(function installM11LayoutStyles(){if(document.getElementById('m11-layout-styles'))return;const st=document.createElement('style');st.id='m11-layout-styles';st.textContent=`
  .m11-dividend-detail{display:grid;gap:4px;margin-top:7px;padding:7px 9px;border:1px solid #dbeafe;border-radius:9px;background:#f8fafc}.m11-dividend-detail>div{display:flex;justify-content:space-between;gap:12px;font-size:11px}.m11-dividend-detail strong{white-space:nowrap;color:#166534}.m11-result-main{min-width:0}.p7-result-v476.m11-result{grid-template-columns:auto minmax(0,1fr) auto;align-items:start}
  .m11-branch-period{margin:9px 0;padding:10px;border:1px solid #c4b5fd;border-radius:11px;background:#fff}.m11-branch-period>div{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:7px}.m11BranchPeriod{padding:9px;border:1px solid #cbd5e1;border-radius:9px;background:#f8fafc;font-weight:850}.m11BranchPeriod.selected{border:2px solid #7c3aed;background:#ede9fe;color:#5b21b6}.m11-branch-period small,.m11-branch-current{display:block;margin-top:6px;color:#64748b;font-size:11px}.m11-branch-notice{position:fixed;inset:0;z-index:190;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.72);backdrop-filter:blur(4px)}.m11-branch-notice>div{width:min(520px,100%);padding:20px;border:3px solid #8b5cf6;border-radius:20px;background:#fff;text-align:center}.m11-branch-notice h2{margin:0 0 8px;color:#5b21b6}.m11-branch-notice p{font-size:17px}.m11-branch-notice .btn{margin-top:14px}
  .m11-player-status{overflow:hidden}.m11-player-status table{table-layout:fixed}.m11-player-status th,.m11-player-status td{vertical-align:top;overflow-wrap:anywhere}.m11-player-status th:nth-child(1){width:14%}.m11-player-status th:nth-child(2){width:22%}.m11-player-status th:nth-child(3){width:20%}.m11-player-status th:nth-child(4){width:28%}.m11-player-status th:nth-child(5){width:16%}
  .money,.observer-money,.branch-price{max-width:100%;font-size:clamp(22px,4vw,34px)!important;overflow-wrap:anywhere;word-break:break-word;line-height:1.05}.c1-money{white-space:nowrap}
  @media(max-width:650px){.p7-result-v476.m11-result{grid-template-columns:auto minmax(0,1fr)}.p7-result-v476.m11-result>.money{grid-column:2}.m11-dividend-detail>div{align-items:flex-start;flex-direction:column;gap:2px}.m11-player-status{overflow-x:auto}.m11-player-status table{min-width:650px}.m11-branch-period>div{grid-template-columns:1fr}}
`;document.head.appendChild(st)})();

/* ========================================================================== */
/* M1.2 — vá hiển thị Host, đồng bộ dự toán BĐS và khôi phục điều khiển P/s.   */
/* ========================================================================== */

/* Giá chỉ đọc từ trạng thái hiện hành; không tự tính lại thị trường khi vẽ. */
m1UpdatePropertyEstimate=function(){
  const input=document.getElementById('c1PropertyQty'),el=document.getElementById('m1PropertyEstimate');if(!input||!el)return;
  const s=load(),q=Math.max(0,c1ParseNumber(input.value)),prop=s.investments?.property||{},buy=c1RoundMoney(q*(Number(prop.buyPrice)||0)),sell=c1RoundMoney(q*(Number(prop.sellPrice)||0));
  el.innerHTML=`<span>Nếu mua <b>${c1FormatNumber(q)} m²</b></span><strong>Chi ${c1Money(buy)}</strong><span>Nếu bán lại</span><strong>Nhận ${c1Money(sell)}</strong>`
};
function m12SyncPropertyEstimate(){queueMicrotask(m1UpdatePropertyEstimate);requestAnimationFrame(m1UpdatePropertyEstimate);setTimeout(m1UpdatePropertyEstimate,40)}
document.addEventListener('input',e=>{if(e.target?.id==='c1PropertyQty')m1UpdatePropertyEstimate()},true);
document.addEventListener('change',e=>{if(e.target?.id==='c1PropertyQty')m1UpdatePropertyEstimate()},true);
const _c15RestoreFormsM12=c15RestoreForms;
c15RestoreForms=function(){const out=_c15RestoreFormsM12();m12SyncPropertyEstimate();return out};
const _bindPlayerM12Property=bindPlayer;
bindPlayer=function(name){const out=_bindPlayerM12Property(name);m12SyncPropertyEstimate();return out};

/* P/s là điều khiển Host cốt lõi: luôn dựng lại launcher/panel nếu lớp giao diện trước làm mất. */
function m12EnsurePsControls(root,s){
  if(!root||s.gameOver||s.specialAuction?.active)return;
  const left=root.querySelector('.host-dashboard > .stack'),control=left?[...left.querySelectorAll('.card')].find(c=>c.querySelector('.phase')):null,phase=control?.querySelector('.phase');if(!left||!control||!phase)return;
  let open=left.querySelector('#openPsPrepV45');if(!open){phase.insertAdjacentHTML('afterend','<button type="button" class="btn ps-launch-btn big" id="openPsPrepV45" style="margin-top:9px">P/s — CHUẨN BỊ ĐẤU GIÁ</button>');open=left.querySelector('#openPsPrepV45')}
  if(s.flowMode==='auto'&&open){open.disabled=true;open.classList.add('v481-structural-locked');open.title='AUTO tự chuẩn bị và mở P3; chuyển sang CONTROL để thiết lập P/s thủ công.'}
  if(readPsPrepV45().open){let panel=left.querySelector('#psPrepPanel');if(!panel){control.insertAdjacentHTML('afterend',psPrepPanelV45(s));panel=left.querySelector('#psPrepPanel')}else control.insertAdjacentElement('afterend',panel);const title=panel?.querySelector('.title');if(title&&/CHUẨN BỊ ĐẤU GIÁ/i.test(title.textContent||''))title.textContent='VI · P/s — CHUẨN BỊ ĐẤU GIÁ'}
}
const _hostViewM12Ps=hostView;
hostView=function(){const html=_hostViewM12Ps(),box=document.createElement('div');box.innerHTML=html;m12EnsurePsControls(box,load());return box.innerHTML};
const _bindHostM12Ps=bindHost;
bindHost=function(){const out=_bindHostM12Ps(),open=document.getElementById('openPsPrepV45');if(open&&!open.disabled)open.onclick=()=>{const d=readPsPrepV45();d.open=true;writePsPrepV45(d);render()};return out};

/* Không gửi lệnh kết thúc lần hai nếu snapshot máy chủ đã đóng. */
const _finishPsAuctionM12Safe=finishPsAuctionV45;
finishPsAuctionV45=async function(force=false){
  if(m12AuctionIsClosed(AUCTION_SNAPSHOT)){m1PatchAuctionPauseUi();if(force)c1Toast('Phiên đấu giá đã kết thúc.','info');return false}
  return _finishPsAuctionM12Safe(force)
};

/* Giao dịch tài nguyên đã có thông báo thật từ RPC; bỏ thông báo suy đoán thứ hai. */
for(let i=C11_ACTION_TOASTS.length-1;i>=0;i--)if(C11_ACTION_TOASTS[i]?.[0]==='#sendTrade')C11_ACTION_TOASTS.splice(i,1);

/* Nhãn phát hành M1.2. */
const M12_VERSION='M1.5.2';
function m12Relabel(root=document){root?.querySelectorAll?.('.c1-version').forEach(x=>x.textContent=x.textContent.includes('BUILD')?`BUILD ${M12_VERSION}`:M12_VERSION);document.title=`THƯƠNG TRƯỜNG — ${M12_VERSION} Multiplayer`}
const _renderM12Version=render;
render=function(){const out=_renderM12Version();m12Relabel(document);return out};

(function installM12Styles(){if(document.getElementById('m12-styles'))return;const st=document.createElement('style');st.id='m12-styles';st.textContent=`
  .m1-new-project-needs{grid-template-columns:repeat(2,minmax(0,1fr))!important;align-items:stretch}
  .m1-new-project-needs label{display:grid!important;grid-template-columns:1fr!important;align-content:start;gap:7px!important;min-width:0;overflow:hidden}
  .m1-new-project-needs label>span{display:block;min-width:0;font-weight:850}
  .m1-new-project-needs label>.c1-stepper{width:100%!important;min-width:0!important;grid-template-columns:44px minmax(48px,1fr) 44px!important}
  .m1-new-project-needs label>.c1-stepper>input{min-width:0!important;width:100%!important;text-align:center!important}
  .m1-manual-project>.field,.m1-manual-project>.c1-stepper,.m1-manual-project>button{max-width:100%}
  @media(max-width:760px){.m1-new-project-needs{grid-template-columns:1fr!important}}
`;document.head.appendChild(st)})();

/* Reset P5/P6 phải đồng bộ vòng thầu thật trên Supabase. */
async function m12ResetProjectAuctionsOnServer(ph,s){
  if(!ROOM?.id||!SB||!ADMIN_TOKEN||!['P5','P6'].includes(ph))return null;
  const {data,error}=await window.m173ResetAuction(ph,s,m154P6Generation(s),Number(ROOM.revision));
  if(error){const m=String(error.message||error);if(/PGRST202|schema cache|Could not find the function/i.test(m))throw new Error('Supabase chưa có RPC reset đấu thầu. Hãy chạy bản vá SQL nâng cấp đến M1.5.');throw error}
  return data||null
}
const _c11ResetPhaseM12=c11ResetPhase;
c11ResetPhase=async function(ph){
  const before=JSON.stringify(load()),out=await _c11ResetPhaseM12(ph),after=load();if(!['P5','P6'].includes(ph)||JSON.stringify(after)===before||after.phase!==ph)return out;
  try{
    const result=await m12ResetProjectAuctionsOnServer(ph,after),fresh=load();fresh.p5Auctions=fresh.p5Auctions||{};
    if(ph==='P5')fresh.p5Auctions[String(fresh.round)]={};
    else{
      /* Reset P6 là một checkpoint mới thật sự: không giữ tieCeiling/bidRound/participants
         đã bị thu hẹp từ phiên cũ. Server đã xóa auction + bids đúng room/round. */
      fresh.p5Auctions[String(fresh.round)]={};
      fresh.results=(fresh.results||[]).filter(r=>Number(r.round)!==Number(fresh.round));delete fresh.m1PromoSettlement
    }
    C17_AUCTION_ENSURE_BUSY.clear();C17_AUCTION_ENSURE_DONE.clear();save(fresh);await broadcastRoomSignal('state_changed',{reason:ph==='P5'?'m12_reset_p5_decisions':'m12_reset_p6_rebid'}).catch(()=>{});render();
    if(ph==='P6')await ensureProcurementOpenV480();
    c1Toast(ph==='P5'?'Đã đặt lại P5: mọi người xác nhận chốt hoặc từ chối lại.':'Đã đặt lại P6: vòng giá cũ đã đóng, mọi người nhập giá lại.','info')
  }catch(e){c1PushError(c14VietnameseError(e));throw e}return out
};

/* Đồng bộ tổng tài nguyên đã sinh cho dữ liệu M1.1 cũ và các chu kỳ mới. */
const _normalizeStateM12BranchProduced=normalizeState;
normalizeState=function(s){
  s=_normalizeStateM12BranchProduced(s);for(const p of Object.values(s.players||{}))for(const b of p.branches||[]){const perCycle=b.res===p.businessId?(Number(b.count)||0):(Math.floor((Number(b.count)||0)/3)*2),credited=Math.max(0,Number(b.cyclesCredited)||0);if(!Number.isFinite(Number(b.produced))||(Number(b.produced)===0&&credited>0))b.produced=Math.max(0,credited*perCycle)}return s
};

/* M1.3 — vòng hòa giá kín: chỉ nhóm hòa đấu lại với trần thấp hơn vòng trước. */
function m13BidLimits(pid,s=load()){
  const pr=projectById(s,pid),a=auctionState(s,pid),rawBudget=Number(pr?.reward),budget=Number.isFinite(rawBudget)?Math.max(0,rawBudget):0,ceiling=Number(a?.tieCeiling),exclusive=Number.isFinite(ceiling)&&ceiling>0?ceiling:null;
  const ceilingMax=exclusive===null?budget:Math.max(0,(Math.ceil((exclusive-1e-9)*10)-1)/10),max=Math.min(budget,ceilingMax),min=1;
  return{min,max,exclusive,hasLegalBid:max+1e-9>=min}
}
bidInputStateV475=function(name,pid,s=load()){
  const input=document.getElementById(bidDomIdV475(pid)),raw=String(input?.value||'').trim(),normal=raw.replace(',','.'),amount=/^\d+(?:\.\d)?$/.test(normal)?Number(normal):null,limit=m13BidLimits(pid,s);
  return{input,raw,amount,min:limit.min,max:limit.max,exclusive:limit.exclusive,hasLegalBid:limit.hasLegalBid,valid:limit.hasLegalBid&&Number.isFinite(amount)&&amount>=limit.min&&amount<=limit.max&&(!limit.exclusive||amount<limit.exclusive)}
};
refreshBidValidationV475=function(name,pid){
  const x=bidInputStateV475(name,pid),msg=document.querySelector(`[data-bid-validation-v475="${pid}"]`),btn=document.querySelector(`.submitBidV475[data-project="${pid}"]`);if(btn)btn.disabled=!x.valid;if(!msg)return;msg.classList.toggle('ok',x.valid);
  const range=`${x.min}M đến ${x.max}M${x.exclusive?` (bắt buộc thấp hơn ${x.exclusive}M)`:''}`;msg.textContent=!x.hasLegalBid?`Không còn mức giá hợp lệ: tối thiểu ${x.min}M${x.exclusive?` và phải thấp hơn ${x.exclusive}M`:''}. Không thể gửi giá vòng này.`:x.raw===''?`Nhập ${range}; tối đa 1 chữ số thập phân.`:x.amount===null?'Nhập số như 4, 4.1 hoặc 4,4.':x.amount<x.min?`Giá chào tối thiểu là ${x.min}M.`:x.exclusive&&x.amount>=x.exclusive?`Vòng hòa: giá mới phải thấp hơn ${x.exclusive}M.`:x.amount>x.max?`Giá tối đa vòng này là ${x.max}M.`:`✓ Giá chào hợp lệ: ${x.amount}M.`
};
const _bidCardM13Tie=bidCard;
bidCard=function(name,s){
  const html=_bidCardM13Tie(name,s),box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('[data-v475-bid-island]').forEach(item=>{const pid=item.dataset.v475BidIsland,a=auctionState(s,pid),limit=m13BidLimits(pid,s),badge=item.querySelector('.badge'),input=item.querySelector('.v475-bid-input');if(badge)badge.textContent=`TỐI ĐA VÒNG NÀY ${limit.max}M`;if(input&&Number(String(input.value).replace(',','.'))>limit.max)input.value=String(limit.max);if(a?.tieCeiling){item.classList.add('m13-tie-rebid');item.querySelector('.split')?.insertAdjacentHTML('afterend',`<div class="m13-tie-rule">🔁 Hòa vòng 1 ở <b>${c1Money(a.tieCeiling)}</b>. Vòng 2: chỉ nhóm hòa được đấu lại, giá phải <b>thấp hơn ${c1Money(a.tieCeiling)}</b>; nếu tiếp tục hòa, người gửi sớm hơn thắng.</div>`)}});return box.innerHTML
};
const _hostP5AuctionPanelM13Tie=hostP5AuctionPanel;
hostP5AuctionPanel=function(s){
  const html=_hostP5AuctionPanelM13Tie(s),box=document.createElement('div');box.innerHTML=html;for(const [pid,a] of Object.entries(s.p5Auctions?.[String(s.round)]||{})){if(!a?.tieCeiling)continue;const live=box.querySelector(`[data-v476-live-bids="${CSS.escape(pid)}"]`),row=live?.closest('.auction-row');row?.classList.add('m13-tie-host');row?.querySelector('.split')?.insertAdjacentHTML('afterend',`<div class="m13-tie-rule">🔁 Vòng 2: <b>${(a.participants||[]).map(esc).join(' · ')}</b> đấu lại dưới <b>${c1Money(a.tieCeiling)}</b>. Nếu giá thấp nhất vẫn hòa, người gửi giá đó sớm nhất thắng.</div>`)}return box.innerHTML
};
(function installM13TieStyles(){if(document.getElementById('m13-tie-styles'))return;const st=document.createElement('style');st.id='m13-tie-styles';st.textContent=`
  .m13-tie-rule{margin:8px 0;padding:8px 10px;border:1px solid #f59e0b;border-radius:10px;background:#fffbeb;color:#92400e;font-size:12px;line-height:1.35}.m13-tie-rebid{border-color:#f59e0b!important}.m13-tie-host{box-shadow:inset 0 0 0 2px rgba(245,158,11,.2)}
`;document.head.appendChild(st)})();

/* M1.3 — lựa chọn mã là nháp bền vững qua Realtime và hiển thị đúng tổng nhận. */
function m13PromoNumbers(name,pid,codeId,s=load()){
  const r=m1WinningProjectRows(s).find(x=>x.winner===name&&String(x.projectId)===String(pid)),p=s.players?.[name],base=r?resultBasePayoutV475(r,s):0,code=(p?.promoCodes||[]).find(c=>c.status==='available'&&String(c.id)===String(codeId||'')),pct=Math.max(0,Number(code?.percent)||0),total=Math.round(base*(1+pct/100));return{r,base,code,pct,total,bonus:Math.max(0,total-base)}
}
function m13UpdatePromoPreview(root,name,pid,codeId){
  const el=root?.querySelector('.m13-promo-preview');if(!el)return;const x=m13PromoNumbers(name,pid,codeId);el.innerHTML=`<span>Giá trúng / giá trị gốc <b>${c1Money(x.base)}</b></span><span>Mã ${x.code?`+${x.pct}% · tăng <b>+${c1Money(x.bonus)}</b>`:'chưa chọn'}</span><strong>TỔNG DỰ KIẾN: ${c1Money(x.total)}</strong>`
}
const _c17PromoCardM13Stable=c17PromoCard;
c17PromoCard=function(name,s){
  const html=_c17PromoCardM13Stable(name,s),box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('[data-c17-promo-project]').forEach(root=>{const pid=root.dataset.c17PromoProject,draft=c17PromoDraft(name,s,pid),saved=c17PromoRoundMap(s.players?.[name]||{},s),selected=draft!==null?draft:String(saved[pid]||''),x=m13PromoNumbers(name,pid,selected,s),badge=root.querySelector('.badge');if(badge)badge.textContent=`GIÁ TRÚNG ${c1Money(x.base)}`;root.querySelector('.split')?.insertAdjacentHTML('afterend',`<div class="m13-promo-preview"><span>Giá trúng / giá trị gốc <b>${c1Money(x.base)}</b></span><span>Mã ${x.code?`+${x.pct}% · tăng <b>+${c1Money(x.bonus)}</b>`:'chưa chọn'}</span><strong>TỔNG DỰ KIẾN: ${c1Money(x.total)}</strong></div>`)});return box.innerHTML
};
c17BindPromo=function(name){
  document.querySelectorAll('.m1PromoPick').forEach(btn=>btn.onclick=()=>{const root=btn.closest('[data-c17-promo-project]'),pid=String(btn.dataset.project||''),code=String(btn.dataset.code||'');root?.querySelectorAll('.m1PromoPick').forEach(x=>x.classList.toggle('selected',x===btn));try{sessionStorage.setItem(c17PromoDraftKey(name,load(),pid),code)}catch(e){}const confirm=root?.querySelector('.c17ConfirmPromo');if(confirm){confirm.dataset.value=code;confirm.disabled=false}m13UpdatePromoPreview(root,name,pid,code)});
  const commit=(btn,value)=>{const s=load(),p=s.players?.[name],pid=String(btn.dataset.project||'');if(!p||!m1PromoSettlementReady(s)||!m1WinningProjectRows(s).some(r=>r.winner===name&&String(r.projectId)===pid))return;const code=(p.promoCodes||[]).find(c=>c.status==='available'&&String(c.id)===String(value||''));if(value&&!code){c1Toast('Mã đã chọn không còn thuộc sở hữu hoặc không còn khả dụng. Hãy chọn lại.','sell');return}const map=c17PromoRoundMap(p,s,true),duplicate=value&&Object.entries(map).some(([id,x])=>id!==pid&&String(x)===value);if(duplicate){c1Toast(`Mã ${value} đã được chọn cho dự án khác.`,'sell');return}map[pid]=value;try{sessionStorage.removeItem(c17PromoDraftKey(name,s,pid))}catch(e){}save(s);broadcastRoomSignal('state_changed',{reason:'P6_promo_answered',player:name,projectId:pid}).catch(()=>{});render();c1Toast(value?`Đã áp dụng mã ${value} cho ${pid}.`:`Đã xác nhận không dùng mã cho ${pid}.`,'buy')};
  document.querySelectorAll('.c17ConfirmPromo').forEach(btn=>btn.onclick=()=>commit(btn,String(btn.dataset.value||c17PromoDraft(name,load(),btn.dataset.project)||'')));
  document.querySelectorAll('.m1SkipPromo').forEach(btn=>btn.onclick=()=>commit(btn,''))
};

const _resultDisplayPayoutM13=resultDisplayPayoutV475;
resultDisplayPayoutV475=function(r,s){const paid=Number(r?.paidAmount);return Number.isFinite(paid)?Math.max(0,paid):_resultDisplayPayoutM13(r,s)};
m11DividendDetail=function(s,r){
  const d=m11DividendForResult(s,r),base=resultBasePayoutV475(r,s),gross=Math.max(0,Number(r.paidAmount??base)||0),pct=Math.max(0,Number(r.promoPercent)||0),bonus=Math.max(0,Number(r.promoBonus??gross-base)||0),total=`<div class="m13-result-total"><span>Tổng dự án: ${c1Money(base)}${pct?` + mã <b>${pct}%</b> (${c1Money(bonus)})`:''}</span><strong>${c1Money(gross)}</strong></div>`;if(!s.investments?.enabled)return`<div class="m11-dividend-detail">${total}</div>`;const payments=d?.payments||[],paid=payments.reduce((n,x)=>n+(Number(x.amount)||0),0),owner=Math.max(0,c1RoundMoney(gross-paid)),external=payments.reduce((n,x)=>n+(Number(x.shares)||0),0),ownerPct=Math.max(0,C1_SHARE_TOTAL-external);
  return`<div class="m11-dividend-detail">${total}<div><span>${esc(r.winner)} thực nhận <b>${ownerPct}%</b></span><strong>${c1Money(owner)}</strong></div>${payments.length?payments.map(x=>`<div><span>Cổ đông <b>${esc(x.holder)}</b> · ${Number(x.shares)||0}%</span><strong>+${c1Money(x.amount)}</strong></div>`).join(''):'<div><span>Không có cổ đông bên ngoài</span><strong>0%</strong></div>'}</div>`
};
(function installM13PromoStyles(){if(document.getElementById('m13-promo-styles'))return;const st=document.createElement('style');st.id='m13-promo-styles';st.textContent=`
  .m13-promo-preview{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;margin:8px 0;padding:8px 10px;border:1px solid #d8b4fe;border-radius:10px;background:#faf5ff;font-size:12px}.m13-promo-preview strong{grid-column:1/-1;color:#166534;font-size:14px}.m13-result-total{padding-bottom:5px;margin-bottom:3px;border-bottom:1px dashed #cbd5e1}.m13-result-total strong{font-size:14px!important}
  @media(max-width:520px){.m13-promo-preview{grid-template-columns:1fr}}
`;document.head.appendChild(st)})();

/* ========================================================================== */
/* M1.4 — đồng hồ/AUTO bền vững, P6 có cửa sổ mã, dự án và combo đa dạng.    */
/* ========================================================================== */
const M14_VERSION='M1.5.2';

function m14P6Seconds(s){
  const contested=projects(s).some(pr=>eligibleProjectContenders(s,pr.id).length>1);
  return contested?60:30
}
const _setPhaseTimerM14Base=setPhaseTimerV480;
setPhaseTimerV480=function(s,ph,run=false){
  ensureFlowV480(s);if(ph==='P5')s.phaseDurations.P5=15;if(ph==='P6')s.phaseDurations.P6=m14P6Seconds(s);
  return _setPhaseTimerM14Base(s,ph,run)
};

/* AUTO luôn bắt đầu từ đúng thời lượng của P hiện tại, không kế thừa preset 15 phút. */
const _setFlowModeM14Base=setFlowModeV480;
setFlowModeV480=async function(mode){
  const before=load(),switching=mode==='auto'&&before.flowMode!=='auto';
  if(!switching)return _setFlowModeM14Base(mode);
  before.flowMode='auto';setPhaseTimerV480(before,before.phase,before.phase!=='P7');
  if(typeof ensureRealtimeRunningV481==='function')ensureRealtimeRunningV481(before);
  logPush(before,`🤖 AUTO bắt đầu ${before.phase} theo thời lượng ${fmtTime(phaseDurationV480(before,before.phase))}.`);save(before);render();
  await broadcastRoomSignal('state_changed',{reason:'m14_auto_started_at_phase_default'}).catch(()=>{});
  if(before.phase==='P3'&&!before.specialAuction?.active)await startAutoP3AuctionV480();
  if(before.phase==='P6')await ensureProcurementOpenV480()
};

/* Phân bổ 70/30: phần lớn theo nhóm doanh nghiệp ưu tiên, phần còn lại buộc mua bán. */
function m14AllocateGroup(total,keys,supply,out){
  total=Math.max(0,Math.round(total));if(!total||!keys.length)return;
  const weights=keys.map(k=>Math.max(1,Number(supply[k])||0)),sum=weights.reduce((a,b)=>a+b,0);let used=0;
  keys.forEach((k,i)=>{const q=i===keys.length-1?total-used:Math.max(0,Math.round(total*weights[i]/sum));out[k]=(out[k]||0)+q;used+=q})
}
const _c1BuildProjectsM14Base=c1BuildProjects;
c1BuildProjects=function(supply,n,round){
  const list=_c1BuildProjectsM14Base(supply,n,round),active=RESOURCE_KEYS.filter(k=>(Number(supply[k])||0)>0);
  if(active.length<2)return list;
  const priorityCount=Math.max(1,Math.min(active.length-1,Math.ceil(active.length*.70)));
  return list.map((pr,i)=>{const baseTotal=Math.max(active.length,Object.values(pr.need||{}).reduce((a,b)=>a+(Number(b)||0),0)),start=(round*3+i*priorityCount)%active.length,priority=Array.from({length:priorityCount},(_,j)=>active[(start+j)%active.length]),other=active.filter(k=>!priority.includes(k)),need={},main=Math.max(1,Math.round(baseTotal*.70)),trade=Math.max(1,baseTotal-main);m14AllocateGroup(main,priority,supply,need);m14AllocateGroup(trade,other,supply,need);for(const k of Object.keys(need))need[k]=Math.max(1,Math.min(Math.max(1,Number(supply[k])||1),need[k]));const demand=projectDemand([{need}]),prices=marketPriceRowsFrom(supply,demand,n),range=rewardRangeFrom(need,prices);return{...pr,need,reward:ceil5((range.min+range.max)/2+(round-1)*10+i*4),demandProfile:{priority,tradeShare:30}}})
};

/* Đề xuất P/s gồm gói bù thiếu, gói dự trữ và gói hỗn hợp theo từng người chơi. */
const _lotPriceRangeM14Base=lotPriceRangeV480;
lotPriceRangeV480=function(s,lot){const range=_lotPriceRangeM14Base(s,lot),low=ceil5V480(Math.max(1,range.ref*.18));return{...range,start:Math.max(1,Math.min(low,range.min>5?range.min-5:range.min))}};
const _buildAuctionRecommendationsM14Base=buildAuctionRecommendationsV480;
buildAuctionRecommendationsV480=function(s){
  const base=_buildAuctionRecommendationsM14Base(s),active=activeResourceKeys(s),names=Object.keys(s.players||{}),short=globalShortageV480(s),extra=[];
  names.forEach((name,i)=>{const p=s.players[name],profile=playerNeedProfileV480(name,s),missing=active.slice().sort((a,b)=>(profile.missing[b]||0)-(profile.missing[a]||0)),stock=active.slice().sort((a,b)=>(Number(p?.res?.[b])||0)-(Number(p?.res?.[a])||0));let items={};
    for(const k of missing.slice(0,2))if((profile.missing[k]||0)>0)items[k]=Math.max(1,Math.min(6,Math.ceil(profile.missing[k]*.6)));
    if(Object.keys(items).length){const lot={kind:'resources',title:`Combo bù thiếu · ${name}`,items,startPrice:10},range=lotPriceRangeV480(s,lot);lot.startPrice=range.start;extra.push({id:`M14-N-${i}`,owner:name,lot,reason:'Bù nhanh phần tài nguyên còn thiếu cho các dự án đang nhắm.',range})}
    items={};const own=p?.businessId&&active.includes(p.businessId)?p.businessId:stock[0],cross=missing.find(k=>k!==own&&(profile.missing[k]||0)>0)||active.filter(k=>k!==own).sort((a,b)=>(short[b]||0)-(short[a]||0))[0];if(cross)items[cross]=Math.max(1,Math.min(5,Math.ceil(profile.missing[cross]||short[cross]||1)));if(own)items[own]=2+((i+(Number(s.round)||0))%5);if(Object.keys(items).length){const lot={kind:'resources',title:`Combo nhu cầu & dự trữ · ${name}`,items,startPrice:10},range=lotPriceRangeV480(s,lot);lot.startPrice=range.start;extra.push({id:`M14-S-${i}`,owner:name,lot,reason:'Luôn có tài nguyên đang thiếu theo dự án; phần còn lại tạo dự trữ để trao đổi ở P4.',range})}
  });
  const seen=new Set(),merged=[...extra,...base].filter(r=>{const key=`${r.lot.kind}:${JSON.stringify(r.lot.items||{})}:${r.lot.promoPercent||0}:${r.lot.promoQty||0}`;if(seen.has(key))return false;seen.add(key);return true});return merged.slice(0,20)
};

/* Vẽ đồng hồ trực tiếp mỗi nhịp trên mọi vai trò; không cần render lại toàn trang. */
function m14PaintClocks(s){
  const rem=remainingTime(s),label=fmtTime(rem);document.querySelectorAll('#timerText,.sticky-countdown .clock-main').forEach(el=>{el.textContent=label;el.classList.toggle('expired',rem<=0)});document.querySelectorAll('.sticky-countdown .clock-meta').forEach(el=>el.innerHTML=`<b>VÒNG ${s.round} · ${s.phase}</b><br>${esc(phaseEndEstimateV45(s))}`);
  const input=document.getElementById('manualTimerInput');if(input&&document.activeElement!==input&&!s.timer?.running)input.value=fmtTime(remainingTime(s))
}

let M14_WAKE_CHANNEL=null,M14_WAKE_ROOM=null,M14_WAKE_SENT='';
function m14EnsureWakeChannel(){
  if(!SB||!ROOM?.id)return;if(M14_WAKE_CHANNEL&&M14_WAKE_ROOM===ROOM.id)return;
  if(M14_WAKE_CHANNEL)SB.removeChannel(M14_WAKE_CHANNEL).catch(()=>{});M14_WAKE_ROOM=ROOM.id;
  M14_WAKE_CHANNEL=SB.channel(`tt-auto-wake-${ROOM.code}`).on('broadcast',{event:'phase_due'},()=>{if(session?.role==='host')m14HostCatchup()}).subscribe()
}
async function m14HostCatchup(){
  const s=load();if(session?.role!=='host'||s.flowMode!=='auto'||s.specialAuction?.active||!s.timer?.running||remainingTime(s)>0||V480_AUTO_BUSY||V481_PHASE_SWITCH_BUSY)return;
  s.timer.running=false;s.timer.remaining=0;s.timer.endAt=null;s.timer.expired=true;if(s._g526)localStorage.setItem(STATE_KEY,JSON.stringify(s));else save(s);await autoPhaseEndV480().catch(e=>console.warn('M1.4 AUTO recovery',e))
}
const _timerTickM14Base=timerTick;
timerTick=function(){
  const out=_timerTickM14Base(),s=load();m14PaintClocks(s);m14EnsureWakeChannel();
  if(ROOM?.id&&s.flowMode==='auto'&&s.timer?.running&&remainingTime(s)<=0){const key=`${s.round}:${s.phase}:${s.flowV480?.phaseEnteredAt||0}`;if(M14_WAKE_SENT!==key){M14_WAKE_SENT=key;M14_WAKE_CHANNEL?.send({type:'broadcast',event:'phase_due',payload:{key,at:Date.now()}}).catch(()=>{})}if(session?.role==='host')m14HostCatchup()}
  if(session?.role==='player'&&m1PromoSettlementReady(s)&&!document.querySelector('.m1-promo-choice,.c11-phase-notice'))render();return out
};
for(const ev of ['focus','online','pageshow','visibilitychange'])addEventListener(ev,()=>{if(ev!=='visibilitychange'||document.visibilityState==='visible'){m14PaintClocks(load());m14HostCatchup()}});

/* Nhãn phát hành M1.4. */
const _renderM14VersionBase=render;
render=function(){const out=_renderM14VersionBase();document.querySelectorAll('.c1-version').forEach(x=>x.textContent=x.textContent.includes('BUILD')?`BUILD ${M14_VERSION}`:M14_VERSION);document.title=`THƯƠNG TRƯỜNG — ${M14_VERSION} Multiplayer`;m14PaintClocks(load());return out};

/* ========================================================================== */
/* M1.5 — vá hiển thị có giới hạn và reset P6 về checkpoint sạch. */
/* ========================================================================== */
function m15BranchHint(name){
  const s=load(),p=s.players?.[name],res=document.getElementById('branchRes'),qty=document.getElementById('branchQty'),hint=document.getElementById('branchBuyHint');if(!p||!res||!qty||!hint||!RES[res.value])return;
  const q=Math.max(1,Math.floor(Number(qty.value)||1)),base=Math.max(0,Number(s.branchMarket?.price)||0),own=res.value===p.businessId,unit=own?base:base*3,total=unit*q,period=m11BranchPeriod(s),label=m11BranchPeriodLabel(period);
  hint.innerHTML=own?`Giá cơ sở: <b>${c1Money(base)}</b>. Chi nhánh <b>đúng thế mạnh</b>: ${q} × ${c1Money(unit)} = <b>${c1Money(total)}</b> · tạo <b>+${q}</b> ${RES[res.value].icon}/${label}.`:`Giá cơ sở: <b>${c1Money(base)}</b>. Chi nhánh <b>ngoài thế mạnh</b> giá gấp 3: ${q} × ${c1Money(unit)} = <b>${c1Money(total)}</b> · mỗi cụm 3 chi nhánh tạo <b>+2</b> ${RES[res.value].icon}/${m11BranchPeriodLabel(period*3)}.`
}
const _bindBranchUIM15Base=bindBranchUI;
bindBranchUI=function(name){const out=_bindBranchUIM15Base(name),refresh=()=>m15BranchHint(name),res=document.getElementById('branchRes'),qty=document.getElementById('branchQty');res?.addEventListener('change',refresh);qty?.addEventListener('input',refresh);qty?.addEventListener('change',refresh);refresh();return out};

phaseEndEstimateV45=function(s){
  const next={P1:'P2',P2:'P3',P3:'P4',P4:'P5',P5:'P6',P6:'P7',P7:'CHỜ HOST'}[s.phase]||'';
  if(!s.timer?.running)return`${s.phase} · đồng hồ đang dừng`;
  const d=new Date(Date.now()+remainingTime(s)*1000),hh=String(d.getHours()).padStart(2,'0'),mm=String(d.getMinutes()).padStart(2,'0'),ss=String(d.getSeconds()).padStart(2,'0');return`${s.phase} → ${next} lúc ${hh}:${mm}:${ss}`
};
const _stickyClockBarM15Base=stickyClockBarV45;
stickyClockBarV45=function(s){const html=_stickyClockBarM15Base(s),box=document.createElement('div');box.innerHTML=html,bar=box.firstElementChild;bar?.querySelector('.sticky-realtime')?.remove();if(bar)bar.style.gridTemplateColumns='1fr';return bar?.outerHTML||html};

const _playerViewM15Base=playerView;
playerView=function(name){
  const html=_playerViewM15Base(name),s=load();if(s.phase!=='P2'||s.specialAuction?.active||s.gameOver)return html;const box=document.createElement('div');box.innerHTML=html,main=box.querySelector('.app > .grid.grid-2'),left=main?.children[0],right=main?.children[1],asset=c17PrivateAssetCard(left),title=[...right?.querySelectorAll('.title')||[]].find(x=>/Dự án công khai/i.test(x.textContent||'')),card=title?.closest('.card');if(left&&card)(asset||left.firstElementChild)?.insertAdjacentElement('afterend',card);return box.innerHTML
};

const _auctionStageM15Base=auctionStageV45;
auctionStageV45=function(s,role,name=null){const html=_auctionStageM15Base(s,role,name),box=document.createElement('div');box.innerHTML=html;box.querySelectorAll('.ps-lot').forEach((card,i)=>{const title=card.querySelector('.split > b');if(title&&!title.querySelector('.m15-lot-no'))title.insertAdjacentHTML('afterbegin',`<span class="m15-lot-no">${i+1}</span>`)});return box.innerHTML};

/* P5 Host: bảng theo dõi nằm ngay sau điều khiển ván và trước trạng thái người chơi. */
const _hostViewM15P5OrderBase=hostView;
hostView=function(){
  const html=_hostViewM15P5OrderBase(),s=load();if(s.phase!=='P5'||s.specialAuction?.active||s.gameOver)return html;
  const box=document.createElement('div');box.innerHTML=html;const left=box.querySelector('.host-dashboard > .stack'),monitor=left?.querySelector('.m1-p5-monitor');
  if(left&&monitor){const control=[...left.children].find(x=>x.querySelector?.('.phase'));if(control)control.insertAdjacentElement('afterend',monitor)}
  return box.innerHTML
};

(function installM15DisplayStyles(){if(document.getElementById('m15-display-styles'))return;const st=document.createElement('style');st.id='m15-display-styles';st.textContent=`
  .m15-lot-no{display:inline-grid;place-items:center;min-width:24px;height:24px;margin-right:7px;padding:0 6px;border-radius:8px;background:#111827;color:#fff;font-size:12px;font-weight:950;vertical-align:middle}.sticky-countdown .clock-meta{font-size:11px}.sticky-countdown .clock-meta b{font-size:11px}
`;document.head.appendChild(st)})();

/* M1.5.1 — chỉ cập nhật số lượng loại hình doanh nghiệp trong phần giới thiệu Setup. */
const _setupViewM151BusinessCountBase=setupView;
setupView=function(){return _setupViewM151BusinessCountBase().replace('3–20 người · 20 doanh nghiệp · tối đa 5 vòng','3–20 người · 30 doanh nghiệp · tối đa 5 vòng')};

/* M1.5.2 — chào mừng một lần khi thiết bị lần đầu chọn người chơi trong phòng. */
function m152WelcomeKey(name){return`tt_m152_welcome:${ROOM?.code||roomInfo()?.code||'offline'}:${String(name||'')}`}
function m152WelcomeSeen(name){try{return localStorage.getItem(m152WelcomeKey(name))==='1'}catch(e){return false}}
function m152WelcomeHtml(name,s){
  const company=s.players?.[name]?.company||'doanh nghiệp của bạn';
  return`<div class="m152-welcome" id="m152Welcome" role="dialog" aria-modal="true" aria-labelledby="m152WelcomeTitle"><div class="m152-welcome-card"><div class="m152-sparkles" aria-hidden="true"><span>✦</span><span>◆</span><span>✦</span><span>◆</span><span>✦</span></div><div class="m152-crown" aria-hidden="true">👑</div><div class="m152-eyebrow">CHÀO MỪNG ĐẾN THƯƠNG TRƯỜNG</div><h2 id="m152WelcomeTitle">Xin chào, chủ nhân tỷ phú<br><strong>${esc(name)}!</strong></h2><div class="m152-company">${esc(company)}</div><p>Hãy phấn đấu để không ai dám coi thường khả năng kinh doanh bá đạo của bạn nhé!</p><div class="m152-motto">Bản lĩnh tạo cơ hội · Chiến lược tạo đế chế</div><button type="button" class="btn good big" id="m152WelcomeClose">BẮT ĐẦU CHINH PHỤC</button></div></div>`
}
const _playerViewM152WelcomeBase=playerView;
playerView=function(name){const html=_playerViewM152WelcomeBase(name),s=load();if(m152WelcomeSeen(name))return html;const box=document.createElement('div');box.innerHTML=html;box.querySelector('.app')?.insertAdjacentHTML('beforeend',m152WelcomeHtml(name,s));return box.innerHTML};
const _bindPlayerM152WelcomeBase=bindPlayer;
bindPlayer=function(name){const out=_bindPlayerM152WelcomeBase(name),close=document.getElementById('m152WelcomeClose');if(close)close.onclick=()=>{try{localStorage.setItem(m152WelcomeKey(name),'1')}catch(e){}document.getElementById('m152Welcome')?.remove()};return out};

(function installM152WelcomeStyles(){if(document.getElementById('m152-welcome-styles'))return;const st=document.createElement('style');st.id='m152-welcome-styles';st.textContent=`
  .m152-welcome{position:fixed;inset:0;z-index:320;display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 50% 25%,rgba(124,58,237,.35),rgba(2,6,23,.88) 58%);backdrop-filter:blur(8px)}
  .m152-welcome-card{position:relative;isolation:isolate;overflow:hidden;width:min(620px,100%);padding:34px 28px 28px;border:3px solid #f4cf62;border-radius:28px;background:linear-gradient(145deg,#fffdf5,#fff 48%,#f5f3ff);box-shadow:0 28px 80px rgba(0,0,0,.45),inset 0 0 50px rgba(245,158,11,.08);text-align:center}
  .m152-welcome-card:before,.m152-welcome-card:after{content:"";position:absolute;z-index:-1;width:210px;height:210px;border-radius:50%;filter:blur(4px)}.m152-welcome-card:before{left:-100px;top:-110px;background:rgba(250,204,21,.18)}.m152-welcome-card:after{right:-100px;bottom:-120px;background:rgba(124,58,237,.15)}
  .m152-crown{font-size:58px;line-height:1;filter:drop-shadow(0 8px 8px rgba(146,64,14,.24));animation:m152Float 1.8s ease-in-out infinite}.m152-eyebrow{margin-top:12px;color:#92400e;font-size:12px;font-weight:950;letter-spacing:.18em}.m152-welcome h2{margin:9px 0 8px;color:#172033;font-size:31px;line-height:1.18}.m152-welcome h2 strong{color:#6d28d9;font-size:38px}.m152-company{display:inline-flex;padding:7px 13px;border:1px solid #c4b5fd;border-radius:999px;background:#f5f3ff;color:#5b21b6;font-weight:900}.m152-welcome p{max-width:500px;margin:18px auto 10px;color:#334155;font-size:18px;font-weight:750;line-height:1.5}.m152-motto{margin-bottom:18px;color:#a16207;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.m152-welcome .btn{width:100%;min-height:54px;background:linear-gradient(90deg,#047857,#059669,#047857);box-shadow:0 10px 24px rgba(5,150,105,.24)}
  .m152-sparkles span{position:absolute;color:#eab308;font-size:22px;animation:m152Blink 1.4s ease-in-out infinite}.m152-sparkles span:nth-child(1){left:8%;top:16%}.m152-sparkles span:nth-child(2){left:18%;top:43%;animation-delay:.3s}.m152-sparkles span:nth-child(3){right:9%;top:19%;animation-delay:.6s}.m152-sparkles span:nth-child(4){right:17%;top:47%;animation-delay:.9s}.m152-sparkles span:nth-child(5){right:8%;bottom:15%;animation-delay:1.1s}
  @keyframes m152Float{50%{transform:translateY(-7px) rotate(2deg)}}@keyframes m152Blink{50%{transform:scale(1.5) rotate(20deg);opacity:.4}}@media(max-width:520px){.m152-welcome{align-items:end;padding:8px}.m152-welcome-card{padding:26px 18px 18px;border-radius:24px 24px 12px 12px}.m152-welcome h2{font-size:25px}.m152-welcome h2 strong{font-size:31px}.m152-welcome p{font-size:16px}}@media(prefers-reduced-motion:reduce){.m152-crown,.m152-sparkles span{animation:none}}
`;document.head.appendChild(st)})();

/* G526 business candidate: approved timer defaults; preserve NORMAL baseline separately. */
Object.assign(V480_PHASE_DEFAULTS,{P1:120,P2:180,P3:300,P4:900,P5:300,P6:300,P7:0});
setPhaseTimerV480=function(state,phase,run=false){return _setPhaseTimerM14Base(state,phase,!!run&&!state.gameControl?.paused)};
