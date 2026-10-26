/* =====================================================================
   tool.js — เครื่องมือครู (KruChauy)
   โหลดต่อท้าย ScriptKruChauy.js (ใช้ state / qs / showView / toast / uniqueRooms / studentsOfRoom ของไฟล์หลัก)
   ไฟล์นี้สร้างหน้าจอ + CSS ของตัวเองทั้งหมด

   เพิ่มเครื่องมือใหม่ในอนาคต: เขียนฟังก์ชัน แล้วเรียก registerTool({...}) ที่ท้ายไฟล์ (ดูตัวอย่าง "สุ่มนักเรียน" / "เซต" / "เมทริกซ์")
     registerTool({
       id:"xxx", icon:"🧮", color:"c-green", title:"ชื่อเครื่องมือ", desc:"คำอธิบายสั้นๆ",
       theme:{ main:"#..", bg:"#..", ink:"#..", sh:"rgba(..)", on:"#fff" },   // สีหัวหน้า (ไม่ใส่ก็ได้)
       html:`...เนื้อหาหน้า...`,
       init(view){ ...ผูก event ... },     // เรียกครั้งเดียวตอนสร้างหน้า
       onOpen(view){ ...ทุกครั้งที่เปิดหน้านี้ ... }
     });
   ===================================================================== */
(function(){
"use strict";

const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const rndInt = n => Math.floor(Math.random()*n);
const wait = ms => new Promise(r=>setTimeout(r, ms));
const $ = (s, r=document) => r.querySelector(s);
const escH = v => String(v ?? "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const say = m => { if(typeof toast==="function") toast(m); };

/* ================= CSS ================= */
const CSS = `
.c-teal{--c-bg:#DDF5F1; --c-main:#12B5A6; --c-ink:#0B6B62; --c-sh:rgba(18,181,166,.7);}
#view-tools{--c-main:#12B5A6; --c-bg:#DDF5F1; --c-ink:#0B6B62; --c-sh:rgba(18,181,166,.6); --c-on:#fff;}
.tl-row{display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;}
.tl-sub{font-size:12.5px; color:var(--ink-soft); line-height:1.5;}
.tl-h{font-family:'Noto Serif Thai',serif; font-size:15px; margin:18px 2px 8px; color:var(--ink);}

/* ---- สุ่มนักเรียน ---- */
#view-tool-random{--c-main:#FBBC04; --c-bg:#FEF3D0; --c-ink:#7A4F00; --c-sh:rgba(251,188,4,.7); --c-on:#4a3000;}
.tl-reel{position:relative; overflow:hidden; border-radius:22px; background:#fff; border:1.5px solid #E1E7F3; padding:24px 0; margin:6px 0 14px; box-shadow:0 12px 26px -20px rgba(27,34,51,.5);}
.tl-reel::before,.tl-reel::after{content:""; position:absolute; top:0; bottom:0; width:20%; z-index:2; pointer-events:none;}
.tl-reel::before{left:0; background:linear-gradient(90deg,#fff,rgba(255,255,255,0));}
.tl-reel::after{right:0; background:linear-gradient(270deg,#fff,rgba(255,255,255,0));}
.tl-mark{position:absolute; left:50%; top:0; bottom:0; width:3px; margin-left:-1.5px; background:var(--c-main); z-index:3; border-radius:3px;}
.tl-mark::before,.tl-mark::after{content:""; position:absolute; left:50%; margin-left:-8px; border:8px solid transparent;}
.tl-mark::before{top:0; border-top-color:var(--c-main);}
.tl-mark::after{bottom:0; border-bottom-color:var(--c-main);}
.tl-track{display:flex; gap:10px; position:relative; will-change:transform;}
.tl-card{flex:0 0 112px; height:108px; border-radius:18px; background:#F4F6FB; border:1.5px solid #E1E7F3; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; padding:8px; text-align:center; transition:transform .35s cubic-bezier(.2,.8,.2,1), background .3s, border-color .3s, box-shadow .3s;}
.tl-card b{min-width:34px; height:34px; padding:0 6px; border-radius:17px; background:var(--c-main); color:var(--c-on); display:flex; align-items:center; justify-content:center; font-size:15px;}
.tl-card span{font-size:13px; font-weight:600; line-height:1.3; color:var(--ink); overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; word-break:break-word;}
.tl-card.win{background:var(--c-bg); border-color:var(--c-main); transform:scale(1.1); box-shadow:0 14px 26px -14px var(--c-sh);}
html.mode-pc .tl-card{flex-basis:150px; height:124px;}
html.mode-pc .tl-card span{font-size:15px;}
.tl-result{display:none; text-align:center; background:var(--c-bg); color:var(--c-ink); border-radius:20px; padding:16px 14px; margin-bottom:14px;}
.tl-result.show{display:block; animation:tlPop .55s cubic-bezier(.2,1.3,.4,1);}
.tl-result small{display:block; font-size:12.5px; opacity:.75;}
.tl-result b{display:block; font-family:'Noto Serif Thai',serif; font-size:26px; margin-top:4px; line-height:1.3;}
@keyframes tlPop{0%{transform:scale(.7); opacity:0;} 100%{transform:scale(1); opacity:1;}}
.tl-hist{display:flex; flex-wrap:wrap; gap:8px;}
.tl-hist span{background:#fff; border:1.5px solid #E1E7F3; border-radius:12px; padding:6px 10px; font-size:13px; color:var(--ink);}
.tl-hist span i{font-style:normal; color:var(--ink-soft); margin-right:4px;}
#tlFw{position:fixed; inset:0; width:100%; height:100%; pointer-events:none; z-index:300;}

/* ---- เซต ---- */
#view-tool-sets{--c-main:#4285F4; --c-bg:#E8F0FE; --c-ink:#174EA6; --c-sh:rgba(66,133,244,.6); --c-on:#fff;}
.tl-sets-grid{display:grid; grid-template-columns:1fr; gap:0;}
html.mode-pc .tl-sets-grid{grid-template-columns:1fr 1fr 1fr; gap:14px;}
.field .tl-ta{min-height:64px;}
.tl-setlab{display:flex; align-items:center; gap:8px;}
.tl-dot{width:12px; height:12px; border-radius:50%; display:inline-block;}
.tl-chips,.tl-keys{display:flex; flex-wrap:wrap; gap:8px;}
.tl-chip,.tl-keys button{padding:8px 13px; border-radius:12px; border:1.5px solid #E1E7F3; background:#fff; font:inherit; font-size:15px; font-weight:600; color:var(--ink); cursor:pointer; transition:background .15s, color .15s, border-color .15s, transform .1s;}
.tl-chip:active,.tl-keys button:active{transform:scale(.95);}
.tl-chip.on{background:var(--c-main); border-color:var(--c-main); color:#fff;}
.tl-keys button{min-width:42px; padding:9px 10px; font-size:16px;}
.tl-keys button.fn{background:#F4F6FB; font-size:13px;}
.tl-expr{font-size:18px !important; font-weight:600; letter-spacing:1px;}
.tl-err{color:var(--absent); font-size:13px; margin:6px 2px 0; min-height:18px;}
.tl-venn{background:#fff; border:1.5px solid #E1E7F3; border-radius:20px; padding:10px; margin:14px 0;}
.tl-venn svg{display:block; width:100%; max-width:480px; height:auto; margin:0 auto;}
.tl-res{background:var(--c-bg); color:var(--c-ink); border-radius:20px; padding:14px 16px;}
.tl-res .ex{font-size:13px; opacity:.8;}
.tl-res .set{font-family:'Noto Serif Thai',serif; font-size:20px; font-weight:600; margin:4px 0; word-break:break-word; line-height:1.5;}
.tl-res .n{font-size:13px; font-weight:600;}
.tl-info{display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;}
.tl-pow{background:#fff; border:1.5px solid #E1E7F3; border-radius:20px; padding:4px 16px; margin-top:14px;}
.tl-mode{margin:14px 0 0;}
.tl-venn.cus svg{touch-action:none; cursor:grab; user-select:none; -webkit-user-select:none;}
.tl-venn.cus.drag svg{cursor:grabbing;}
.tl-cus{background:#fff; border:1.5px solid #E1E7F3; border-radius:20px; padding:12px 16px; margin:-4px 0 14px;}
.tl-cus-row{display:flex; align-items:center; gap:10px; padding:6px 0;}
.tl-cus-row b{min-width:64px; font-size:15px; color:var(--ink);}
.tl-cus-row input[type=color]{width:44px; height:34px; padding:2px; border:1.5px solid #E1E7F3; border-radius:8px; background:#fff; cursor:pointer; flex:none;}
#tlShot{position:fixed; inset:0; z-index:1000; background:#fff; display:flex; align-items:center; justify-content:center;}
#tlShot svg{display:block; width:min(96vw, calc((100vh - 24px) * 360 / 276)); height:auto; max-height:calc(100vh - 24px); font-family:inherit;}
#tlShot .x{position:absolute; top:max(10px, env(safe-area-inset-top)); right:12px; width:40px; height:40px; border-radius:50%; border:1.5px solid #CBD5E1; background:rgba(255,255,255,.9); font-size:20px; line-height:1; cursor:pointer; color:#475569; transition:opacity .6s;}
#tlShot .h{position:absolute; left:0; right:0; bottom:max(8px, env(safe-area-inset-bottom)); text-align:center; font-size:13px; color:#94A3B8; transition:opacity .6s; pointer-events:none;}
#tlShot.quiet .x{opacity:.25;} #tlShot.quiet .h{opacity:0;}
.tl-cus-row input[type=range]{flex:1; min-width:0; accent-color:var(--c-main);}
.tl-pow .pw{padding:12px 0; border-bottom:1px solid #EEF1F8;}
.tl-pow .pw:last-child{border-bottom:0;}
.tl-pow .pw b{display:block; font-size:12.5px; color:var(--ink-soft); font-weight:600; margin-bottom:4px;}
.tl-pow .pw .v{font-size:16px; font-weight:600; color:var(--ink); word-break:break-word; line-height:1.7;}
.tl-pow .pw .v i{display:block; font-style:normal; font-size:12px; font-weight:600; color:var(--ink-soft); margin:8px 0 4px;}
.tl-pow .sb{display:inline-block; background:var(--c-bg); color:var(--c-ink); border-radius:10px; padding:3px 9px; margin:0 6px 6px 0; font-size:14px; font-weight:600;}
.tl-info span{background:#fff; border:1.5px solid #E1E7F3; border-radius:12px; padding:5px 10px; font-size:12.5px; color:var(--ink); word-break:break-word;}

/* ---- จับกลุ่ม ---- */
#view-tool-groups{--c-main:#EC5E9B; --c-bg:#FDE7F1; --c-ink:#9B1F5A; --c-sh:rgba(236,94,155,.6); --c-on:#fff;}
.gp-modes{display:flex; flex-wrap:wrap; gap:8px; margin-top:4px;}
.gp-step{display:flex; align-items:center; gap:10px;}
.gp-step button{width:44px; height:44px; border-radius:14px; border:1.5px solid #E1E7F3; background:#fff; font-size:22px; font-weight:700; color:var(--ink); cursor:pointer; flex:none; transition:transform .1s;}
.gp-step button:active{transform:scale(.92);}
.gp-step input{flex:1; min-width:0; text-align:center; font-size:20px !important; font-weight:700;}
.gp-tools{display:flex; flex-wrap:wrap; gap:8px; margin:14px 0 4px;}
.gp-out{display:grid; grid-template-columns:1fr; gap:14px; margin-top:14px; scroll-margin-top:10px;}
html.mode-pc .gp-out{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));}
.gp-card{--gc:#EC5E9B; --gb:#FDE7F1; background:#fff; border:1.5px solid #E1E7F3; border-radius:22px; overflow:hidden; box-shadow:0 12px 24px -20px rgba(27,34,51,.5); animation:gpIn .5s cubic-bezier(.2,1.2,.4,1) both; animation-delay:var(--d,0ms);}
.gp-h{display:flex; align-items:baseline; justify-content:space-between; padding:10px 16px; background:var(--gc); color:#fff;}
.gp-h b{font-family:'Noto Serif Thai',serif; font-size:17px;}
.gp-h small{font-size:12.5px; opacity:.9;}
.gp-ms{display:grid; grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); gap:6px; padding:12px 10px;}
.gp-m{display:flex; flex-direction:column; align-items:center; text-align:center; padding:8px 4px 6px; border-radius:16px; background:var(--gb);}
.gp-m img{width:64px; height:64px; object-fit:contain; display:block; user-select:none; -webkit-user-drag:none;}
.gp-m .no{margin-top:2px; font-size:11.5px; font-weight:700; color:var(--gc);}
.gp-m .nm{font-size:12.5px; font-weight:600; line-height:1.3; color:var(--ink); word-break:break-word; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;}
.gp-c0{--gc:#EC5E9B; --gb:#FDE7F1;} .gp-c1{--gc:#4285F4; --gb:#E8F0FE;} .gp-c2{--gc:#12B5A6; --gb:#DDF5F1;} .gp-c3{--gc:#F29900; --gb:#FEF3D0;}
.gp-c4{--gc:#8B5CF6; --gb:#EFE9FE;} .gp-c5{--gc:#34A853; --gb:#E3F5E8;} .gp-c6{--gc:#EA4335; --gb:#FDE8E6;} .gp-c7{--gc:#0891B2; --gb:#DDF3F8;}
.gp-shake{display:flex; flex-wrap:wrap; justify-content:center; gap:6px; padding:18px 0;}
.gp-shake img{width:60px; height:60px; object-fit:contain; animation:gpWob .26s ease-in-out infinite alternate;}
.gp-shake img:nth-child(even){animation-delay:.13s;}
@keyframes gpIn{0%{transform:translateY(16px) scale(.92); opacity:0;} 100%{transform:none; opacity:1;}}
@keyframes gpWob{0%{transform:rotate(-9deg) translateY(2px);} 100%{transform:rotate(9deg) translateY(-6px);}}
@media (prefers-reduced-motion:reduce){ .gp-card,.gp-shake img{animation:none;} }
html[data-theme="dark"] .gp-card,html[data-theme="black"] .gp-card{background:#1d2233; border-color:#2c3450;}
html[data-theme="dark"] .gp-m,html[data-theme="black"] .gp-m{background:rgba(255,255,255,.07);}
html[data-theme="dark"] .gp-step button,html[data-theme="black"] .gp-step button{background:#1d2233; border-color:#2c3450;}

`;
(function injectCss(){
  if($("#tlCss")) return;
  const st = document.createElement("style"); st.id = "tlCss"; st.textContent = CSS;
  document.head.appendChild(st);
})();

/* ================= ระบบลงทะเบียนเครื่องมือ ================= */
const appEl = $("#app");
const toolRefs = [];

function makeView(id, { title, sub, icon, back }, bodyHtml){
  const sec = document.createElement("section");
  sec.id = id; sec.className = "view";
  sec.innerHTML =
    `<div class="topbar">
       <button type="button" class="back-btn" data-tlback="${back}">‹</button>
       <div class="tb-txt"><h2>${escH(title)}</h2><div class="sub">${escH(sub||"")}</div></div>
       <span class="tb-ico">${icon||""}</span>
     </div>` + bodyHtml;
  appEl.insertBefore(sec, $("#toast") || null);
  const b = $("[data-tlback]", sec);
  if(b) b.addEventListener("click", ()=> showView(b.dataset.tlback));
  return sec;
}

/* หน้าเมนูเครื่องมือ */
const toolsView = makeView("view-tools", { title:"เครื่องมือครู", sub:"ตัวช่วยใช้ในห้องเรียน", icon:"🧰", back:"view-home" }, `<div class="menu" id="toolsMenu"></div>`);
const toolsMenu = $("#toolsMenu", toolsView);

function registerTool(t){
  const viewId = "view-tool-" + t.id;
  const view = makeView(viewId, { title:t.title, sub:t.desc, icon:t.icon, back:"view-tools" }, t.html || "");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "menu-item " + (t.color || "c-blue");
  btn.style.setProperty("--i", toolRefs.length);
  btn.innerHTML = `<span class="ico">${t.icon||"🧰"}</span><span class="txt"><h3>${escH(t.title)}</h3><p>${escH(t.desc||"")}</p></span><span class="arrow">›</span>`;
  btn.addEventListener("click", ()=>{ if(t.onOpen) t.onOpen(view); showView(viewId); });
  t._btn = btn;
  toolsMenu.appendChild(btn);
  if(t.init) t.init(view);
  toolRefs.push(t);
  return view;
}

/* ปุ่ม "เครื่องมือครู" หน้าแรก */
(function bindHomeButton(){
  let btn = $('.menu-item[data-go="tools"]');
  if(!btn){
    btn = document.createElement("button");
    btn.className = "menu-item c-teal"; btn.dataset.go = "tools"; btn.style.setProperty("--i", 5);
    btn.innerHTML = `<span class="ico">🧰</span><span class="txt"><h3>เครื่องมือครู</h3><p>สุ่มนักเรียน · จับกลุ่ม · เซต · และอื่นๆ</p></span><span class="arrow">›</span>`;
    const menu = $("#view-home .menu"); if(menu) menu.appendChild(btn);
  }
  btn.addEventListener("click", ()=> showView("view-tools"));
})();

/* ================= พลุ ================= */
const FW = { cv:null, cx:null, p:[], raf:0, until:0, next:0 };
function fwSize(){
  const d = Math.min(window.devicePixelRatio||1, 2);
  FW.cv.width = innerWidth*d; FW.cv.height = innerHeight*d;
  FW.cx.setTransform(d,0,0,d,0,0);
}
function fwInit(){
  if(FW.cv) return;
  const cv = document.createElement("canvas"); cv.id = "tlFw"; document.body.appendChild(cv);
  FW.cv = cv; FW.cx = cv.getContext("2d");
  addEventListener("resize", fwSize); fwSize();
}
function fwBurst(x, y){
  const hue = rndInt(360), n = 70 + rndInt(30);
  for(let i=0;i<n;i++){
    const a = Math.PI*2*i/n + Math.random()*.2, sp = 1.5 + Math.random()*4.8;
    FW.p.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:1, decay:.008+Math.random()*.012,
                h:hue + rndInt(40) - 20, s:Math.random()<.25 ? 25 : 100, r:1.4 + Math.random()*1.6 });
  }
}
function fwLoop(now){
  const cx = FW.cx;
  cx.globalCompositeOperation = "destination-out";
  cx.fillStyle = "rgba(0,0,0,.22)"; cx.fillRect(0,0,innerWidth,innerHeight);
  cx.globalCompositeOperation = "lighter";
  if(now < FW.until && now >= FW.next){
    fwBurst(innerWidth*(.15 + Math.random()*.7), innerHeight*(.12 + Math.random()*.38));
    FW.next = now + 200 + Math.random()*260;
  }
  for(let i=FW.p.length-1;i>=0;i--){
    const q = FW.p[i];
    q.vx *= .985; q.vy = q.vy*.985 + .05; q.x += q.vx; q.y += q.vy; q.life -= q.decay;
    if(q.life <= 0){ FW.p.splice(i,1); continue; }
    cx.fillStyle = `hsla(${q.h},${q.s}%,60%,${q.life})`;
    cx.beginPath(); cx.arc(q.x, q.y, q.r, 0, Math.PI*2); cx.fill();
  }
  if(FW.p.length || now < FW.until){ FW.raf = requestAnimationFrame(fwLoop); }
  else { FW.raf = 0; cx.globalCompositeOperation = "source-over"; cx.clearRect(0,0,innerWidth,innerHeight); }
}
function fireworks(ms=3200, x, y){
  fwInit();
  const now = performance.now();
  FW.until = now + ms; FW.next = now + 160;
  if(x!=null) fwBurst(x, y);
  if(!FW.raf) FW.raf = requestAnimationFrame(fwLoop);
}

/* =====================================================================
   เครื่องมือ 1: สุ่มนักเรียน
   ===================================================================== */
const R = { room:"", pool:[], remaining:[], picked:[], spinning:false, center:null, stride:122, cardW:112 };
const stuNo   = s => String(s["เลขที่"] ?? "").trim();
const stuName = s => String(s["ชื่อ-สกุล"] ?? "").trim();
const PLACEHOLDER = { "เลขที่":"?", "ชื่อ-สกุล":"เลือกห้องก่อน" };

function cardHtml(s){ return `<div class="tl-card"><b>${escH(stuNo(s)||"•")}</b><span>${escH(stuName(s))}</span></div>`; }

function rndFrom(arr){ return arr.length ? arr[rndInt(arr.length)] : PLACEHOLDER; }

const rnd = {};   // อ้างอิง element (ตั้งตอน init)

function measure(){
  const cs = rnd.track.children;
  if(!cs.length) return;
  R.cardW = cs[0].offsetWidth;
  R.stride = cs.length > 1 ? cs[1].offsetLeft - cs[0].offsetLeft : R.cardW + 10;
}
function centerOffset(i, jitter=0){ return i*R.stride + R.cardW/2 - rnd.reel.clientWidth/2 + jitter; }
function setTrack(items){ rnd.track.innerHTML = items.map(cardHtml).join(""); measure(); }

function renderIdle(){
  const items = Array.from({length:13}, ()=> rndFrom(R.pool));
  items[6] = R.center = R.pool.length ? rndFrom(R.pool) : PLACEHOLDER;
  setTrack(items);
  rnd.track.style.transition = "none";
  rnd.track.style.transform = `translateX(${-centerOffset(6)}px)`;
}
function renderInfo(){
  const total = R.pool.length;
  rnd.info.textContent = total ? `เหลือ ${R.remaining.length} / ${total} คน` : "";
}
function renderHistory(){
  rnd.hist.innerHTML = R.picked.length
    ? R.picked.map((s,i)=>`<span><i>${i+1}.</i>${escH(stuNo(s))} ${escH(stuName(s))}</span>`).join("")
    : `<div class="tl-sub">ยังไม่มีการสุ่ม</div>`;
  rnd.resetBtn.style.display = R.picked.length ? "" : "none";
}
function loadRoom(room){
  R.room = room;
  R.pool = room && typeof studentsOfRoom==="function" ? studentsOfRoom(room).filter(s=>stuName(s)) : [];
  R.remaining = R.pool.slice(); R.picked = []; R.center = null;
  rnd.result.classList.remove("show");
  renderIdle(); renderInfo(); renderHistory();
  if(room && !R.pool.length) say("ห้องนี้ยังไม่มีรายชื่อนักเรียน");
}
function fillRoomOptions(){
  const rooms = typeof uniqueRooms==="function" ? uniqueRooms() : [];
  const keep = rnd.room.value;
  rnd.room.innerHTML = `<option value="">เลือกห้อง/ชั้นปี</option>` + rooms.map(r=>`<option value="${escH(r)}">${escH(r)}</option>`).join("");
  if(rooms.includes(keep)) rnd.room.value = keep;
}

async function spin(){
  if(R.spinning) return;
  if(!R.pool.length){ say("เลือกห้องที่มีรายชื่อนักเรียนก่อนนะครับ"); return; }
  const noRepeat = rnd.noRepeat.checked;
  const cand = noRepeat ? R.remaining : R.pool;
  if(!cand.length){ say("สุ่มครบทุกคนแล้ว กด \"เริ่มใหม่\" ได้เลยครับ"); return; }
  const winner = rndFrom(cand);

  R.spinning = true; rnd.spinBtn.disabled = true; rnd.resetBtn.disabled = true;
  rnd.result.classList.remove("show");

  const WI = 38 + rndInt(6), TOTAL = WI + 9;
  const items = [];
  for(let i=0;i<TOTAL;i++) items.push(i===0 ? (R.center || rndFrom(R.pool)) : i===WI ? winner : rndFrom(R.pool));
  setTrack(items);
  rnd.track.style.transition = "none";
  rnd.track.style.transform = `translateX(${-centerOffset(0)}px)`;
  void rnd.track.offsetWidth;

  const jitter = (Math.random()-.5) * R.stride * .5;
  const dur = reduceMotion ? 700 : 5200;
  rnd.track.style.transition = `transform ${dur}ms cubic-bezier(.12,.6,.08,1)`;
  rnd.track.style.transform = `translateX(${-centerOffset(WI, jitter)}px)`;
  await wait(dur + 150);

  const card = rnd.track.children[WI];
  if(card) card.classList.add("win");
  R.center = winner; R.picked.push(winner);
  if(noRepeat) R.remaining = R.remaining.filter(s=>s!==winner);
  rnd.result.innerHTML = `<small>🎉 ผู้โชคดีคือ</small><b>เลขที่ ${escH(stuNo(winner))} · ${escH(stuName(winner))}</b>`;
  void rnd.result.offsetWidth; rnd.result.classList.add("show");
  renderInfo(); renderHistory();
  const rc = rnd.reel.getBoundingClientRect();
  fireworks(3200, rc.left + rc.width/2, rc.top + rc.height/2);
  R.spinning = false; rnd.spinBtn.disabled = false; rnd.resetBtn.disabled = false;
  if(noRepeat && !R.remaining.length) say("สุ่มครบทุกคนในห้องแล้ว 🎊");
}

registerTool({
  id:"random", icon:"🎲", color:"c-yellow", title:"สุ่มนักเรียน", desc:"เลือกห้อง แล้วสุ่มชื่อด้วยแถบเลื่อน พร้อมพลุ",
  html:`
    <div class="card">
      <div class="field"><label>ห้อง / ชั้นปี</label><select id="tlRoom"></select></div>
      <div class="tl-row">
        <label class="sw"><input type="checkbox" id="tlNoRepeat" checked><span class="sw-track"></span>ไม่สุ่มซ้ำคนเดิม</label>
        <span class="score-info" id="tlInfo"></span>
      </div>
    </div>
    <div class="tl-reel" id="tlReel"><div class="tl-mark"></div><div class="tl-track" id="tlTrack"></div></div>
    <div class="tl-result" id="tlResult"></div>
    <button type="button" id="tlSpin" class="btn btn-primary">🎲 สุ่มเลย!</button>
    <div class="tl-row" style="margin-top:18px;"><div class="tl-h" style="margin:0;">ประวัติการสุ่ม</div><button type="button" id="tlReset" class="btn btn-outline btn-sm" style="display:none;">↺ เริ่มใหม่</button></div>
    <div class="tl-hist" id="tlHist" style="margin-top:8px;"></div>`,
  init(v){
    rnd.room = $("#tlRoom", v); rnd.noRepeat = $("#tlNoRepeat", v); rnd.info = $("#tlInfo", v);
    rnd.reel = $("#tlReel", v); rnd.track = $("#tlTrack", v); rnd.result = $("#tlResult", v);
    rnd.spinBtn = $("#tlSpin", v); rnd.resetBtn = $("#tlReset", v); rnd.hist = $("#tlHist", v);
    rnd.room.addEventListener("change", ()=>{ if(!R.spinning) loadRoom(rnd.room.value); else rnd.room.value = R.room; });
    rnd.spinBtn.addEventListener("click", spin);
    rnd.resetBtn.addEventListener("click", ()=>{ if(!R.spinning) loadRoom(R.room); });
    rnd.noRepeat.addEventListener("change", ()=>{ R.remaining = R.pool.filter(s=>!rnd.noRepeat.checked || !R.picked.includes(s)); renderInfo(); });
    addEventListener("resize", ()=>{ if(!R.spinning && v.classList.contains("active")) renderIdle(); });
  },
  onOpen(){
    fillRoomOptions();
    /* หน้ายังซ่อนอยู่ตอนนี้ จึงวัดขนาดไม่ได้ — รอให้แสดงก่อนค่อยวาดแถบ */
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(!R.spinning) loadRoom(rnd.room.value); }));
  }
});

/* =====================================================================
   เครื่องมือ 2: เซต + แผนภาพเวนน์-ออยเลอร์
   ===================================================================== */
const SET_COLOR = { A:"#4285F4", B:"#EA4335", C:"#34A853" };
const SHADE = "#8B5CF6";

/* แยกสมาชิก: คั่นด้วย , ; หรือเว้นวรรค/ขึ้นบรรทัดใหม่
   รองรับเซตซ้อนเซต เช่น  1, {1}, {{1}}, {1,2}, ∅
   - สมาชิกที่เป็นเซตจะถูกแปลงเป็นรูปมาตรฐาน (เรียงสมาชิกข้างใน + ตัดตัวซ้ำ) จึงถือว่า {1,2} = {2,1}
   - ถ้าพิมพ์ครอบทั้งช่องด้วย { } คู่เดียว (เช่น {1,2,3}) จะถือเป็นการเขียนเซตนั้นเอง ไม่ใช่สมาชิกตัวเดียว */
function keyRank(k){ return k[0]==="{" ? 2 : (!isNaN(Number(k)) ? 0 : 1); }
function cmpKey(a, b){
  const ra = keyRank(a), rb = keyRank(b);
  if(ra !== rb) return ra - rb;
  if(ra === 0) return Number(a) - Number(b);
  if(ra === 2 && a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}
function canonSet(items){ return "{" + [...new Set(items)].sort(cmpKey).join(",") + "}"; }
function parseGroup(s, pos, inside){
  const items = []; let buf = "";
  const flush = () => { if(buf){ items.push(buf); buf = ""; } };
  while(pos < s.length){
    const ch = s[pos];
    if(ch === "{"){ flush(); const r = parseGroup(s, pos+1, true); items.push(canonSet(r.items)); pos = r.pos; }
    else if(ch === "}"){ pos++; if(inside){ flush(); return { items, pos }; } }   // } เกินมา → ข้าม
    else if(/[,;\s]/.test(ch)){ flush(); pos++; }
    else { buf += ch; pos++; }
  }
  flush(); return { items, pos };
}
function parseList(t){
  const s = String(t||"").replace(/[\[\]]/g," ").replace(/[，、]/g,",").replace(/[∅Øø]/g," {} ").trim();
  if(s[0] === "{"){
    const r = parseGroup(s, 1, true);
    if(r.pos >= s.length) return [...new Set(r.items)];   // ครอบทั้งช่องด้วย { } คู่เดียว
  }
  return [...new Set(parseGroup(s, 0, false).items)];
}
function sortEls(arr){
  const atoms = arr.filter(x => x[0] !== "{"), sets = arr.filter(x => x[0] === "{").sort(cmpKey);
  const num = atoms.length && atoms.every(x => !isNaN(Number(x)));
  return (num ? atoms.slice().sort((a,b)=>Number(a)-Number(b)) : atoms).concat(sets);
}
/* แสดงสมาชิก: {} → ∅ , คอมมาเว้นวรรคให้อ่านง่าย (fmtElC = แบบกระชับ ใช้ในแผนภาพ) */
const fmtElC = k => k.replace(/\{\}/g, "∅");
const fmtEl  = k => fmtElC(k).replace(/,/g, ", ");

/* แปลงสมการเซต → ฟังก์ชันรับ mask (bit0=A, bit1=B, bit2=C) คืน true/false
   ∩ มาก่อน ∪ / − / Δ (ซ้ายไปขวา) · ′ = ส่วนเติมเต็ม */
function parseExpr(src){
  const toks = [];
  for(const ch of String(src).replace(/\s+/g,"")){
    if("ABC".includes(ch)) toks.push({ t:"set", v:"ABC".indexOf(ch) });
    else if("Uu∪".includes(ch)) toks.push({ t:"u" });
    else if("nN∩".includes(ch)) toks.push({ t:"n" });
    else if("-−–\\".includes(ch)) toks.push({ t:"d" });
    else if("Δ△∆".includes(ch)) toks.push({ t:"x" });
    else if("'’′ᶜ`c".includes(ch)) toks.push({ t:"c" });
    else if(ch==="^") continue;
    else if("([".includes(ch)) toks.push({ t:"(" });
    else if(")]".includes(ch)) toks.push({ t:")" });
    else throw new Error(`ไม่รู้จักสัญลักษณ์ "${ch}"`);
  }
  if(!toks.length) throw new Error("");
  let i = 0, usesC = false;
  const peek = () => toks[i] && toks[i].t;
  function atom(){
    const k = toks[i];
    if(!k) throw new Error("สมการไม่ครบ — ขาดเซตหลังเครื่องหมาย");
    if(k.t==="set"){ i++; if(k.v===2) usesC = true; const b = k.v; return m => !!((m>>b)&1); }
    if(k.t==="("){ i++; const f = expr(); if(peek()!==")") throw new Error("วงเล็บไม่ครบ"); i++; return f; }
    throw new Error("รูปแบบสมการไม่ถูกต้อง");
  }
  function factor(){
    let f = atom();
    while(peek()==="c"){ i++; const g = f; f = m => !g(m); }
    return f;
  }
  function term(){
    let f = factor();
    while(peek()==="n"){ i++; const a = f, b = factor(); f = m => a(m) && b(m); }
    return f;
  }
  function expr(){
    let f = term();
    while(peek()==="u" || peek()==="d" || peek()==="x"){
      const op = toks[i++].t, a = f, b = term();
      f = op==="u" ? (m => a(m) || b(m)) : op==="d" ? (m => a(m) && !b(m)) : (m => a(m) !== b(m));
    }
    return f;
  }
  const f = expr();
  if(i < toks.length) throw new Error(toks[i].t===")" ? "วงเล็บปิดเกิน" : "รูปแบบสมการไม่ถูกต้อง (ลองใส่ ∪ ∩ − คั่นระหว่างเซต)");
  const pretty = toks.map(k => k.t==="set" ? "ABC"[k.v] : ({u:"∪",n:"∩",d:"−",x:"Δ",c:"′","(":"(",")":")"})[k.t]).join("");
  return { f, usesC, pretty };
}

function regionText(list){
  if(!list.length) return "";
  let s = "", shown = 0;
  for(const raw of list){
    const e = fmtElC(raw);
    const next = shown ? s + "," + e : e;
    if(shown && next.length > 13){ s += ",…"; break; }
    s = next; shown++;
  }
  return s;
}

/* ---- แผนภาพ: โหมดมาตรฐาน + โหมดกำหนดเอง (ลาก/ย่อ-ขยาย/เลือกสีวงกลม) ---- */
const VENN_DEF2 = { A:[135,120,72], B:[225,120,72] };
const VENN_DEF3 = { A:[140,104,62], B:[220,104,62], C:[180,168,62] };
const CUS_W = 360, CUS_H = 276, CUS_MINR = 24, CUS_MAXR = 130, HANDLE_ANG = 0.7;
const SV_CUS = { on:false, cc:null, col:Object.assign({}, SET_COLOR), shade:SHADE };

function clampCirc(c){
  c[2] = Math.max(CUS_MINR, Math.min(CUS_MAXR, c[2]));
  c[0] = Math.max(8 + c[2], Math.min(CUS_W - 8 - c[2], c[0]));
  c[1] = Math.max(8 + c[2], Math.min(CUS_H - 8 - c[2], c[1]));
}
function ensureCus(use3){
  if(!SV_CUS.cc){
    const base = use3 ? VENN_DEF3 : VENN_DEF2, dy = use3 ? 0 : (CUS_H - 240) / 2;
    SV_CUS.cc = {};
    Object.keys(base).forEach(s => { SV_CUS.cc[s] = [base[s][0], base[s][1] + dy, base[s][2]]; });
  }
  if(use3 && !SV_CUS.cc.C) SV_CUS.cc.C = VENN_DEF3.C.slice();
}
/* หาจุดวางสมาชิกของแต่ละส่วน = จุดในส่วนนั้นที่อยู่ห่างขอบวงกลมมากที่สุด */
function labelSpots(cc, sets, W, H){
  const best = {};
  for(let y = 10; y <= H - 10; y += 4) for(let x = 10; x <= W - 10; x += 4){
    let m = 0, d = Math.min(x - 8, W - 8 - x, y - 8, H - 8 - y);
    sets.forEach((s, i) => {
      const c = cc[s], dist = Math.hypot(x - c[0], y - c[1]);
      if(dist <= c[2]) m |= (1 << i);
      d = Math.min(d, Math.abs(dist - c[2]));
    });
    if(!best[m] || d > best[m].d) best[m] = { x, y, d };
  }
  return best;
}
function regionLines(list, d){
  const maxC = Math.max(4, Math.floor(d * 1.7 / 6)), maxL = Math.max(1, Math.floor(d * 1.7 / 12.5));
  let lines = [], cur = "";
  list.forEach(raw => {
    const e = fmtElC(raw);
    if(!cur) cur = e; else if((cur + "," + e).length <= maxC) cur += "," + e; else { lines.push(cur); cur = e; }
  });
  if(cur) lines.push(cur);
  lines = lines.map((l, i) => i < lines.length - 1 ? l + "," : l);
  if(lines.length > maxL){ lines = lines.slice(0, maxL); lines[maxL - 1] = lines[maxL - 1].replace(/,$/, "") + ",…"; }
  return lines;
}

function vennSvg(use3, f, regs, opt){
  const cus = !!(opt && opt.custom), clean = !!(opt && opt.clean), idp = (opt && opt.idp) || "tl";
  const W = 360, H = (use3 || cus) ? 276 : 240, sets = use3 ? ["A","B","C"] : ["A","B"];
  const cc = cus ? opt.cc : (use3 ? VENN_DEF3 : VENN_DEF2);
  const col = cus ? opt.col : SET_COLOR, shadeCol = cus ? opt.shade : SHADE;
  const lab = use3 ? { A:[86,48], B:[274,48], C:[252,238] } : { A:[62,58], B:[298,58] };
  const pos = use3
    ? { 1:[106,90], 2:[254,90], 4:[180,208], 3:[180,78], 5:[142,146], 6:[218,146], 7:[180,118], 0:[16,H-14] }
    : { 1:[92,122], 2:[268,122], 3:[180,122], 0:[16,H-14] };
  const masks = use3 ? [0,1,2,3,4,5,6,7] : [0,1,2,3];
  let defs = "";
  sets.forEach(s=>{
    const [x,y,r] = cc[s];
    defs += `<clipPath id="${idp}c${s}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath>` +
            `<mask id="${idp}o${s}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${r}" fill="#000"/></mask>`;
  });
  let shade = "";
  masks.forEach(m=>{
    if(!f(m)) return;
    let inner = `<rect x="8" y="8" width="${W-16}" height="${H-16}" rx="14" fill="${shadeCol}" fill-opacity=".55"/>`;
    sets.forEach((s,i)=>{ inner = ((m>>i)&1) ? `<g clip-path="url(#${idp}c${s})">${inner}</g>` : `<g mask="url(#${idp}o${s})">${inner}</g>`; });
    shade += inner;
  });
  const ring = sets.map(s=>`<circle cx="${cc[s][0]}" cy="${cc[s][1]}" r="${cc[s][2]}" fill="none" stroke="${col[s]}" stroke-width="${cus && opt.active===s ? 4 : 2.5}"/>`).join("");

  /* ชื่อเซต */
  let names;
  if(cus){
    const ang = { A:-3*Math.PI/4, B:-Math.PI/4, C:Math.PI/2 };
    names = sets.map(s=>{
      const [x,y,r] = cc[s], a = ang[s];
      const lx = Math.max(20, Math.min(W-20, x + (r + 12) * Math.cos(a)));
      const ly = Math.max(26, Math.min(H-12, y + (r + 12) * Math.sin(a) + 7));
      return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="20" font-weight="700" fill="${col[s]}">${s}</text>`;
    }).join("");
  } else {
    names = sets.map(s=>`<text x="${lab[s][0]}" y="${lab[s][1]}" text-anchor="middle" font-size="20" font-weight="700" fill="${col[s]}">${s}</text>`).join("");
  }

  /* สมาชิกในแต่ละส่วน */
  let missing = false, els;
  if(clean){ els = ""; }
  else if(!cus){
    els = masks.map(m=>{
      const t = regionText(regs[m] || []);
      if(!t) return "";
      return `<text x="${pos[m][0]}" y="${pos[m][1]}" text-anchor="${m===0?"start":"middle"}" font-size="10.5" font-weight="600" fill="#1B2233">${escH(t)}</text>`;
    }).join("");
  } else {
    const spots = labelSpots(cc, sets, W, H);
    els = masks.map(m=>{
      const list = regs[m] || [];
      if(!list.length) return "";
      if(m === 0) return `<text x="16" y="${H-14}" font-size="10.5" font-weight="600" fill="#1B2233">${escH(regionText(list))}</text>`;
      const sp = spots[m];
      if(!sp || sp.d < 3){ missing = true; return ""; }
      const lines = regionLines(list, sp.d), y0 = sp.y - (lines.length - 1) * 6.25 + 3.5;
      return lines.map((tx, i) => `<text x="${sp.x}" y="${(y0 + i * 12.5).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#1B2233">${escH(tx)}</text>`).join("");
    }).join("");
  }

  /* จุดจับ (เฉพาะโหมดกำหนดเอง): จุดกลาง = ย้าย · จุดสีขาวที่ขอบ = ปรับขนาด */
  let grips = "", handles = "";
  if(cus && !clean){
    sets.forEach(s=>{
      const [x,y,r] = cc[s];
      grips += `<circle cx="${x}" cy="${y}" r="2.5" fill="${col[s]}" fill-opacity=".55"/>`;
      handles += `<circle cx="${(x + r*Math.cos(HANDLE_ANG)).toFixed(1)}" cy="${(y + r*Math.sin(HANDLE_ANG)).toFixed(1)}" r="6.5" fill="#fff" stroke="${col[s]}" stroke-width="2.5"/>`;
    });
  }
  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="แผนภาพเวนน์-ออยเลอร์">
    <defs>${defs}</defs>
    <rect x="8" y="8" width="${W-16}" height="${H-16}" rx="14" fill="#fff" stroke="#CBD5E1" stroke-width="2"/>
    <text x="18" y="29" font-size="14" font-weight="700" fill="#64748B">U</text>
    ${shade}${ring}${names}${grips}${els}${handles}
  </svg>`;
  return { svg, missing };
}

const SV = {};   // อ้างอิง element ของหน้าเซต
let svTimer = 0;
const svAll = (s, r) => Array.from(r.querySelectorAll(s));
function curSets(){ return SV.vs && SV.vs.use3 ? ["A","B","C"] : ["A","B"]; }
function drawVenn(){
  const vs = SV.vs; if(!vs) return;
  if(SV_CUS.on) ensureCus(vs.use3);
  const r = vennSvg(vs.use3, vs.f, vs.regs, SV_CUS.on ? { custom:true, cc:SV_CUS.cc, col:SV_CUS.col, shade:SV_CUS.shade, active:SV.drag && SV.drag.s } : null);
  SV.venn.innerHTML = r.svg;
  SV.venn.classList.toggle("cus", SV_CUS.on);
  SV.venn.classList.toggle("drag", !!SV.drag);
  SV.note.textContent = (SV_CUS.on && r.missing) ? "มีสมาชิกในส่วนที่วงกลมไม่ได้ซ้อนกัน จึงยังไม่แสดงในแผนภาพ — ลองลากวงกลมให้ซ้อนกัน" : "";
  syncCus();
}
function syncCus(){
  SV.cus.style.display = SV_CUS.on ? "" : "none";
  if(!SV_CUS.on || !SV_CUS.cc) return;
  const sets = curSets();
  svAll(".tl-cus-row[data-s]", SV.cus).forEach(row => {
    const s = row.dataset.s, on = sets.includes(s) && SV_CUS.cc[s];
    row.style.display = on ? "" : "none";
    if(!on) return;
    $(".cc", row).value = SV_CUS.col[s];
    $(".cr", row).value = Math.round(SV_CUS.cc[s][2]);
  });
  SV.shadeIn.value = SV_CUS.shade;
}
function openShot(){
  if(!SV.vs) return;
  if(SV_CUS.on) ensureCus(SV.vs.use3);
  const r = vennSvg(SV.vs.use3, SV.vs.f, SV.vs.regs, { custom:true, clean:true, idp:"tlx", cc:SV_CUS.cc, col:SV_CUS.col, shade:SV_CUS.shade });
  const ov = document.createElement("div");
  ov.id = "tlShot";
  ov.innerHTML = r.svg + '<button type="button" class="x" aria-label="ปิด">✕</button><div class="h">แคปหน้าจอได้เลย · แตะ ✕ หรือกด Esc เพื่อปิด</div>';
  document.body.appendChild(ov);
  const quiet = setTimeout(() => ov.classList.add("quiet"), 2500);
  let closed = false;
  const close = () => {
    if(closed) return; closed = true; clearTimeout(quiet);
    document.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onFs);
    if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    ov.remove();
  };
  const onKey = e => { if(e.key === "Escape") close(); };
  const onFs = () => { if(!document.fullscreenElement) close(); };
  document.addEventListener("keydown", onKey);
  ov.querySelector(".x").addEventListener("click", close);
  if(ov.requestFullscreen){
    ov.requestFullscreen().then(() => document.addEventListener("fullscreenchange", onFs)).catch(()=>{});
  }
}
function svPoint(e){
  const svg = SV.venn.querySelector("svg"), m = svg && svg.getScreenCTM();
  if(!m) return { x:0, y:0 };
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(m.inverse());
}
function bindVennDrag(){
  const el = SV.venn;
  const redraw = () => { if(!SV.raf) SV.raf = requestAnimationFrame(() => { SV.raf = 0; drawVenn(); }); };
  el.addEventListener("pointerdown", e => {
    if(!SV_CUS.on || !SV_CUS.cc || (e.pointerType === "mouse" && e.button !== 0)) return;
    const sets = curSets(), cc = SV_CUS.cc, p = svPoint(e);
    let hit = null;
    for(const s of sets){   /* 1) จุดปรับขนาดที่ขอบ */
      const [x,y,r] = cc[s];
      if(Math.hypot(p.x - (x + r*Math.cos(HANDLE_ANG)), p.y - (y + r*Math.sin(HANDLE_ANG))) <= 16){ hit = { s, mode:"r", off: Math.hypot(p.x - x, p.y - y) - r }; break; }
    }
    if(!hit) for(const s of sets){   /* 2) จุดกลางวงกลม */
      const [x,y] = cc[s];
      if(Math.hypot(p.x - x, p.y - y) <= 18){ hit = { s, mode:"m", ox:p.x - x, oy:p.y - y }; break; }
    }
    if(!hit){   /* 3) ที่ใดก็ได้ในวงกลม (เลือกวงที่จุดกดอยู่ใกล้ศูนย์กลางที่สุดเมื่อเทียบกับรัศมี) */
      let best = 1e9;
      for(const s of sets){
        const [x,y,r] = cc[s], d = Math.hypot(p.x - x, p.y - y);
        if(d <= r && d / r < best){ best = d / r; hit = { s, mode:"m", ox:p.x - x, oy:p.y - y }; }
      }
    }
    if(!hit) return;
    e.preventDefault();
    SV.drag = Object.assign({ id:e.pointerId }, hit);
    try{ el.setPointerCapture(e.pointerId); }catch(_){}
    redraw();
  });
  el.addEventListener("pointermove", e => {
    const d = SV.drag; if(!d || e.pointerId !== d.id) return;
    const c = SV_CUS.cc[d.s], p = svPoint(e);
    if(d.mode === "m"){ c[0] = p.x - d.ox; c[1] = p.y - d.oy; clampCirc(c); }
    else{
      const room = Math.min(c[0] - 8, CUS_W - 8 - c[0], c[1] - 8, CUS_H - 8 - c[1]);
      c[2] = Math.max(CUS_MINR, Math.min(CUS_MAXR, room, Math.hypot(p.x - c[0], p.y - c[1]) - d.off));
    }
    redraw();
  });
  const end = e => {
    const d = SV.drag; if(!d || e.pointerId !== d.id) return;
    SV.drag = null;
    try{ el.releasePointerCapture(e.pointerId); }catch(_){}
    drawVenn();
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}
function insertAtCursor(str){
  const el = SV.expr, a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? el.value.length;
  el.setRangeText(str, a, b, "end"); el.focus(); renderSets();
}
function renderSets(){
  const A = parseList(SV.A.value), B = parseList(SV.B.value), C = parseList(SV.C.value), Uin = parseList(SV.U.value);
  const uni = sortEls([...new Set([...Uin, ...A, ...B, ...C])]);
  const inA = new Set(A), inB = new Set(B), inC = new Set(C);
  const maskOf = e => (inA.has(e)?1:0) | (inB.has(e)?2:0) | (inC.has(e)?4:0);

  let parsed = null, err = "";
  const src = SV.expr.value;
  if(src.trim()){ try{ parsed = parseExpr(src); }catch(e){ err = e.message; } }
  SV.err.textContent = err;

  const use3 = C.length > 0 || (parsed && parsed.usesC) || (!parsed && /C/.test(src));
  const f = parsed ? parsed.f : () => false;
  const regs = {}; uni.forEach(e=>{ (regs[maskOf(e)] = regs[maskOf(e)] || []).push(e); });
  SV.vs = { use3, f, regs }; drawVenn();

  /* ผลลัพธ์ */
  if(parsed){
    const res = uni.filter(e => f(maskOf(e)));
    SV.res.innerHTML =
      `<div class="ex">ผลของ ${escH(parsed.pretty)}</div>` +
      `<div class="set">${res.length ? "{ " + res.map(e => escH(fmtEl(e))).join(", ") + " }" : "∅ (เซตว่าง)"}</div>` +
      `<div class="n">n(${escH(parsed.pretty)}) = ${res.length}</div>`;
  } else {
    SV.res.innerHTML = `<div class="ex">${err ? "แก้สมการให้ถูกต้องก่อนนะครับ" : "พิมพ์สมการด้านบน เช่น A∪B"}</div>`;
  }
  const info = [`n(A) = ${A.length}`, `n(B) = ${B.length}`];
  if(use3) info.push(`n(C) = ${C.length}`);
  info.push(`n(U) = ${uni.length}`);
  SV.info.innerHTML = info.map(t=>`<span>${t}</span>`).join("");

  /* สมาชิก / สับเซต / เพาเวอร์เซต ของเซตผลลัพธ์ */
  if(parsed){ SV.pow.style.display = ""; SV.pow.innerHTML = powHtml(uni.filter(e => f(maskOf(e))), parsed.pretty); }
  else { SV.pow.style.display = "none"; SV.pow.innerHTML = ""; }
}

/* ---- สับเซต / เพาเวอร์เซต ---- */
const POW_LIST_MAX = 6;   // เซตผลลัพธ์มีสมาชิกไม่เกินนี้ถึงจะแจกแจงสับเซตทั้งหมด (2^6 = 64 ตัว)
function subsetsBySize(S){
  const n = S.length, out = Array.from({length:n+1}, () => []);
  for(let m = 0; m < (1 << n); m++){
    const sub = []; for(let i = 0; i < n; i++) if((m >> i) & 1) sub.push(S[i]);
    out[sub.length].push(sub);
  }
  return out;
}
const subTxt = a => a.length ? "{" + a.map(e => escH(fmtEl(e))).join(", ") + "}" : "∅";
function powHtml(S, label){
  const n = S.length, L = escH(label), cnt = (BigInt(2) ** BigInt(n)).toString();
  const row = (t, v) => `<div class="pw"><b>${t}</b><div class="v">${v}</div></div>`;
  let h = row("จำนวนสมาชิก", `n(${L}) = ${n}`);
  h += row("จำนวนสับเซต", `2<sup>n</sup> = 2<sup>${n}</sup> = ${cnt}`);
  if(n <= POW_LIST_MAX){
    const g = subsetsBySize(S);
    h += row("สับเซตทั้งหมด", g.map((list, k) =>
      `<i>${k === 0 ? "ไม่มีสมาชิก" : "มี " + k + " สมาชิก"} (${list.length})</i>` + list.map(a => `<span class="sb">${subTxt(a)}</span>`).join("")
    ).join(""));
    h += row("จำนวนเพาเวอร์เซต", `n(P(${L})) = 2<sup>${n}</sup> = ${cnt}`);
    h += row("เพาเวอร์เซต", `P(${L}) = { ${g.flat().map(subTxt).join(", ")} }`);
  } else {
    h += row("จำนวนเพาเวอร์เซต", `n(P(${L})) = 2<sup>${n}</sup> = ${cnt}`);
    h += `<div class="pw"><div class="tl-sub">สมาชิกเกิน ${POW_LIST_MAX} ตัว จึงไม่แจกแจงสับเซตและเพาเวอร์เซต (จะยาวเกินไป)</div></div>`;
  }
  return h;
}

registerTool({
  id:"sets", icon:"🔵", color:"c-blue", title:"เซต", desc:"หา ∪ ∩ − ′ พร้อมแผนภาพเวนน์-ออยเลอร์ (ลาก ย่อ-ขยาย เลือกสีเองได้)",
  html:`
    <div class="card">
      <div class="tl-sets-grid">
        <div class="field"><label class="tl-setlab"><i class="tl-dot" style="background:#4285F4"></i>สมาชิกเซต A</label><textarea id="svA" class="tl-ta" placeholder="เช่น 1, 2, {1}, {1,2}"></textarea></div>
        <div class="field"><label class="tl-setlab"><i class="tl-dot" style="background:#EA4335"></i>สมาชิกเซต B</label><textarea id="svB" class="tl-ta" placeholder="เช่น 3, 4, 5, 6"></textarea></div>
        <div class="field"><label class="tl-setlab"><i class="tl-dot" style="background:#34A853"></i>สมาชิกเซต C (ไม่ใส่ก็ได้)</label><textarea id="svC" class="tl-ta" placeholder="เช่น 4, 6, 7"></textarea></div>
      </div>
      <div class="field" style="margin-bottom:0;"><label>เอกภพสัมพัทธ์ U (ไม่ใส่ก็ได้ — ถ้าไม่ใส่ จะใช้ A∪B∪C)</label><input id="svU" placeholder="เช่น 1, 2, 3, 4, 5, 6, 7, 8, 9, 10"></div>
      <p class="tl-sub" style="margin:10px 0 0;">คั่นสมาชิกด้วยคอมมา หรือเว้นวรรคก็ได้ · สมาชิกเป็นเซตได้ เช่น 1, {1}, {{1}}, {1,2}, ∅</p>
    </div>
    <div class="field" style="margin:16px 0 8px;"><label>พิมพ์สมการ (∪ = U · ∩ = n · − · Δ · ′)</label><input id="svExpr" class="tl-expr" value="A∪B" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
    <div class="tl-keys" id="svKeys">
      <button type="button" data-k="A">A</button><button type="button" data-k="B">B</button><button type="button" data-k="C">C</button>
      <button type="button" data-k="∪">∪</button><button type="button" data-k="∩">∩</button><button type="button" data-k="−">−</button><button type="button" data-k="Δ">Δ</button><button type="button" data-k="′">′</button>
      <button type="button" data-k="(">(</button><button type="button" data-k=")">)</button>
      <button type="button" class="fn" data-k="⌫">⌫ ลบ</button><button type="button" class="fn" data-k="clear">ล้าง</button>
    </div>
    <div class="tl-err" id="svErr"></div>
    <div class="tl-chips tl-mode" id="svMode">
      <button type="button" class="tl-chip on" data-m="std">แบบมาตรฐาน</button><button type="button" class="tl-chip" data-m="cus">✥ กำหนดเอง</button>
    </div>
    <div class="tl-venn" id="svVenn"></div>
    <div class="tl-err" id="svNote" style="margin:-8px 2px 10px;"></div>
    <div class="tl-cus" id="svCus" style="display:none;">
      <p class="tl-sub" style="margin:0 0 6px;">ลากวงกลมเพื่อย้าย · ลากจุดสีขาวที่ขอบวงกลมเพื่อขยาย/ย่อ · เลือกสีและปรับขนาดได้ด้านล่าง</p>
      <div class="tl-cus-row" data-s="A"><i class="tl-dot" style="background:#4285F4"></i><b>วงกลม A</b><input type="color" class="cc" aria-label="สีวงกลม A"><input type="range" class="cr" min="24" max="130" step="1" aria-label="ขนาดวงกลม A"></div>
      <div class="tl-cus-row" data-s="B"><i class="tl-dot" style="background:#EA4335"></i><b>วงกลม B</b><input type="color" class="cc" aria-label="สีวงกลม B"><input type="range" class="cr" min="24" max="130" step="1" aria-label="ขนาดวงกลม B"></div>
      <div class="tl-cus-row" data-s="C"><i class="tl-dot" style="background:#34A853"></i><b>วงกลม C</b><input type="color" class="cc" aria-label="สีวงกลม C"><input type="range" class="cr" min="24" max="130" step="1" aria-label="ขนาดวงกลม C"></div>
      <div class="tl-cus-row"><button type="button" class="btn btn-sm" id="svExport" style="width:100%;">📷 ส่งภาพออก (เต็มจอ ไว้แคป)</button></div>
      <div class="tl-cus-row"><b style="min-width:0;">สีแรเงา</b><input type="color" id="svShade" aria-label="สีแรเงา"><span style="flex:1"></span><button type="button" class="btn btn-outline btn-sm" id="svCusReset">↺ คืนค่าเริ่มต้น</button></div>
    </div>
    <div class="tl-res" id="svRes"></div>
    <div class="tl-info" id="svInfo"></div>
    <div class="tl-pow" id="svPow" style="display:none;"></div>`,
  init(v){
    SV.A = $("#svA", v); SV.B = $("#svB", v); SV.C = $("#svC", v); SV.U = $("#svU", v);
    SV.expr = $("#svExpr", v); SV.err = $("#svErr", v); SV.venn = $("#svVenn", v);
    SV.note = $("#svNote", v); SV.cus = $("#svCus", v); SV.shadeIn = $("#svShade", v);
    SV.res = $("#svRes", v); SV.info = $("#svInfo", v); SV.pow = $("#svPow", v);
    const later = () => { clearTimeout(svTimer); svTimer = setTimeout(renderSets, 120); };
    [SV.A, SV.B, SV.C, SV.U, SV.expr].forEach(el=> el.addEventListener("input", later));
    $("#svKeys", v).addEventListener("click", e=>{
      const b = e.target.closest("button"); if(!b) return;
      const k = b.dataset.k;
      if(k==="clear"){ SV.expr.value = ""; renderSets(); }
      else if(k==="⌫"){
        const el = SV.expr, a = el.selectionStart ?? el.value.length, z = el.selectionEnd ?? a;
        if(a !== z) el.setRangeText("", a, z, "end"); else if(a > 0) el.setRangeText("", a-1, a, "end");
        renderSets();
      } else insertAtCursor(k);
    });
    bindVennDrag();
    $("#svMode", v).addEventListener("click", e=>{
      const b = e.target.closest("button"); if(!b) return;
      SV_CUS.on = b.dataset.m === "cus";
      svAll("#svMode button", v).forEach(x => x.classList.toggle("on", x === b));
      drawVenn();
    });
    SV.cus.addEventListener("input", e=>{
      const row = e.target.closest(".tl-cus-row"); if(!row || !SV_CUS.cc) return;
      if(e.target.id === "svShade"){ SV_CUS.shade = e.target.value; }
      else if(row.dataset.s){
        const s = row.dataset.s;
        if(e.target.classList.contains("cc")) SV_CUS.col[s] = e.target.value;
        else if(e.target.classList.contains("cr")){ const c = SV_CUS.cc[s]; c[2] = Number(e.target.value); clampCirc(c); }
      }
      drawVenn();
    });
    $("#svExport", v).addEventListener("click", openShot);
    $("#svCusReset", v).addEventListener("click", ()=>{
      SV_CUS.cc = null; SV_CUS.col = Object.assign({}, SET_COLOR); SV_CUS.shade = SHADE; drawVenn();
    });
    renderSets();
  },
  onOpen(){ renderSets(); }
});

/* =====================================================================
   เครื่องมือ 3: ตรรกศาสตร์ (ตารางค่าความจริง)
   - พิมพ์เงื่อนไข เช่น (p ∧ q) → ¬r  แล้วได้ตาราง: ตัวแปร | คอลัมน์ย่อยของแต่ละ ¬ และแต่ละวงเล็บ | ผลลัพธ์สุดท้าย
   - ลำดับความสำคัญ: ¬  >  ∧  >  ∨ ⊕  >  →  >  ↔   (ใส่วงเล็บเพื่อกำหนดเองได้)
   ===================================================================== */
(function injectLogicCss(){
  if($("#tlLgCss")) return;
  const st = document.createElement("style"); st.id = "tlLgCss";
  st.textContent = `
#view-tool-logic{--c-main:#A142F4; --c-bg:#F3E8FD; --c-ink:#6B21A8; --c-sh:rgba(161,66,244,.6); --c-on:#fff;}
.tl-lg-wrap{overflow-x:auto; -webkit-overflow-scrolling:touch; border:1.5px solid #E1E7F3; border-radius:18px; background:#fff; margin:12px 0;}
.tl-lg{border-collapse:separate; border-spacing:0; margin:0 auto; font-size:15px;}
.tl-lg th,.tl-lg td{padding:9px 14px; text-align:center; white-space:nowrap; border-bottom:1px solid #EEF1F8; border-right:1px solid #EEF1F8;}
.tl-lg tr:last-child td{border-bottom:0;}
.tl-lg thead th{background:#F4F6FB; color:var(--ink); font-weight:700; font-size:15px; letter-spacing:.3px;}
.tl-lg thead th small{display:block; font-size:10.5px; font-weight:600; color:var(--ink-soft); margin-top:2px; letter-spacing:0;}
.tl-lg th.v{background:var(--c-bg); color:var(--c-ink);}
.tl-lg .sep{border-left:2px solid #CBD5E1;}
.tl-lg td.t{color:var(--present); font-weight:700;}
.tl-lg td.fl{color:var(--absent); font-weight:700;}
.tl-lg thead th.f{background:var(--c-main); color:#fff; border-left:2px solid var(--c-main);}
.tl-lg thead th.f small{color:rgba(255,255,255,.85);}
.tl-lg td.f{background:var(--c-bg); border-left:2px solid var(--c-main); font-size:16px;}
.tl-lg td.f.t{color:#127A50;}
.tl-lg td.f.fl{color:#C23439;}
.tl-lg-note{font-size:12.5px; color:var(--ink-soft); line-height:1.6; margin:4px 2px 0;}
`;
  document.head.appendChild(st);
})();

const LG = {};
let lgTimer = 0, lgMode = "TF";
const LG_SYM = { and:"∧", or:"∨", imp:"→", iff:"↔", xor:"⊕" };
const LG_PRESET = [
  "p → q", "p ↔ q", "¬(p ∧ q)", "¬p ∨ q",
  "¬(p ∨ q) ↔ (¬p ∧ ¬q)", "¬(p → q) ↔ (p ∧ ¬q)",
  "(p ∧ q) → ¬r", "((p → q) ∧ (q → r)) → (p → r)"
];
const LG_MAXVAR = 6;

function lgTokens(src){
  const ops = [["<=>","iff"],["<->","iff"],["=>","imp"],["->","imp"],["↔","iff"],["⇔","iff"],["→","imp"],["⇒","imp"],
               ["⊕","xor"],["⊻","xor"],["∧","and"],["^","and"],["&","and"],["∨","or"],["|","or"],
               ["¬","not"],["~","not"],["!","not"],["∼","not"],["(","("],["[","("],[")",")"],["]",")"]];
  const out = []; let i = 0;
  while(i < src.length){
    const ch = src[i];
    if(/\s/.test(ch)){ i++; continue; }
    let hit = null;
    for(const o of ops){ if(src.startsWith(o[0], i)){ hit = o; break; } }
    if(hit){ out.push({ t:hit[1] }); i += hit[0].length; continue; }
    if(ch === "v" || ch === "V"){ out.push({ t:"or" }); i++; continue; }
    if(/[A-Za-z]/.test(ch)){ out.push({ t:"var", v:ch.toLowerCase() }); i++; continue; }
    throw new Error("ไม่รู้จักตัวอักษร \"" + ch + "\"");
  }
  return out;
}

function lgParse(src){
  const tk = lgTokens(src); let i = 0;
  const peek = () => tk[i];
  const eat = () => tk[i++];
  const bin = (op, a, b) => ({ t:"bin", op, a, b });
  function parseIff(){ let a = parseImp(); while(peek() && peek().t === "iff"){ eat(); a = bin("iff", a, parseImp()); } return a; }
  function parseImp(){ const a = parseOr(); if(peek() && peek().t === "imp"){ eat(); return bin("imp", a, parseImp()); } return a; }
  function parseOr(){ let a = parseAnd(); while(peek() && (peek().t === "or" || peek().t === "xor")){ const op = eat().t; a = bin(op, a, parseAnd()); } return a; }
  function parseAnd(){ let a = parseNot(); while(peek() && peek().t === "and"){ eat(); a = bin("and", a, parseNot()); } return a; }
  function parseNot(){
    const k = peek();
    if(!k) throw new Error("เงื่อนไขไม่ครบ — ขาดตัวแปรต่อท้าย");
    if(k.t === "not"){ eat(); return { t:"not", a:parseNot() }; }
    if(k.t === "var"){ eat(); return { t:"var", v:k.v }; }
    if(k.t === "("){
      eat(); const a = parseIff();
      if(!peek() || peek().t !== ")") throw new Error("วงเล็บเปิดไม่มีวงเล็บปิดคู่กัน");
      eat(); return a;
    }
    if(k.t === ")") throw new Error("วงเล็บปิด ) ไม่มีคู่ หรือมีวงเล็บว่าง");
    throw new Error("ตัวเชื่อม " + LG_SYM[k.t] + " ต้องมีตัวแปรอยู่ข้างหน้า");
  }
  const ast = parseIff();
  if(i < tk.length){
    if(tk[i].t === ")") throw new Error("วงเล็บปิด ) เกินมา");
    throw new Error("ตัวแปรสองตัวติดกัน ต้องมีตัวเชื่อมคั่น เช่น ∧ ∨ →");
  }
  return ast;
}

function lgStr(n, root){
  if(n.t === "var") return n.v;
  if(n.t === "not") return "¬" + lgStr(n.a, false);
  const s = lgStr(n.a, false) + " " + LG_SYM[n.op] + " " + lgStr(n.b, false);
  return root ? s : "(" + s + ")";
}

function lgEval(n, env){
  if(n.t === "var") return env[n.v];
  if(n.t === "not") return !lgEval(n.a, env);
  const a = lgEval(n.a, env), b = lgEval(n.b, env);
  switch(n.op){
    case "and": return a && b;
    case "or":  return a || b;
    case "imp": return !a || b;
    case "iff": return a === b;
    default:    return a !== b;   // xor
  }
}

/* เก็บตัวแปร + คอลัมน์ย่อย (ทุก ¬ และทุกวงเล็บ ตามลำดับที่ต้องคิดก่อน-หลัง) */
function lgCollect(root){
  const vars = new Set(), cols = [], seen = new Set();
  (function walk(n){
    if(n.t === "var"){ vars.add(n.v); return; }
    if(n.t === "not") walk(n.a); else { walk(n.a); walk(n.b); }
    if(n !== root){
      const k = lgStr(n, false);
      if(!seen.has(k)){ seen.add(k); cols.push({ n, label:k }); }
    }
  })(root);
  return { vars:[...vars].sort(), cols };
}

const lgCell = v => lgMode === "TF" ? (v ? "T" : "F") : (v ? "1" : "0");

function renderLogic(){
  const src = LG.expr.value;
  if(!src.trim()){
    LG.err.textContent = "";
    LG.out.innerHTML = "<p class=\"tl-lg-note\">พิมพ์เงื่อนไขด้านบน หรือเลือกตัวอย่างด้านล่าง</p>";
    LG.res.style.display = "none";
    return;
  }
  let ast;
  try{
    ast = lgParse(src);
    if(lgCollect(ast).vars.length > LG_MAXVAR) throw new Error("ใช้ตัวแปรได้ไม่เกิน " + LG_MAXVAR + " ตัว (ตารางจะยาวเกิน " + Math.pow(2, LG_MAXVAR) + " แถว)");
  }catch(e){ LG.err.textContent = e.message; return; }
  LG.err.textContent = "";

  const { vars, cols } = lgCollect(ast);
  const fin = { n:ast, label:lgStr(ast, true) };
  const nv = vars.length, rows = 1 << nv;

  let head = "<tr>" + vars.map(v => "<th class=\"v\">" + escH(v) + "</th>").join("");
  cols.forEach((c, k) => { head += "<th" + (k === 0 ? " class=\"sep\"" : "") + ">" + escH(c.label) + "<small>ขั้น " + (k + 1) + "</small></th>"; });
  head += "<th class=\"f\">" + escH(fin.label) + "<small>ผลลัพธ์</small></th></tr>";

  let body = "", nT = 0;
  for(let r = 0; r < rows; r++){
    const env = {};
    vars.forEach((v, j) => { env[v] = !((r >> (nv - 1 - j)) & 1); });   // แถวแรก = จริงทั้งหมด
    let tr = "<tr>";
    vars.forEach(v => { tr += "<td class=\"" + (env[v] ? "t" : "fl") + "\">" + lgCell(env[v]) + "</td>"; });
    cols.forEach((c, k) => {
      const val = lgEval(c.n, env);
      tr += "<td class=\"" + (val ? "t" : "fl") + (k === 0 ? " sep" : "") + "\">" + lgCell(val) + "</td>";
    });
    const res = lgEval(ast, env); if(res) nT++;
    tr += "<td class=\"f " + (res ? "t" : "fl") + "\">" + lgCell(res) + "</td></tr>";
    body += tr;
  }
  LG.out.innerHTML = "<div class=\"tl-lg-wrap\"><table class=\"tl-lg\"><thead>" + head + "</thead><tbody>" + body + "</tbody></table></div>";

  const kind = nT === rows ? "สัจนิรันดร์ (Tautology) — เป็นจริงทุกกรณี"
             : nT === 0    ? "ความขัดแย้ง (Contradiction) — เป็นเท็จทุกกรณี"
             :               "ไม่เป็นสัจนิรันดร์ — มีทั้งกรณีจริงและเท็จ";
  LG.res.style.display = "";
  LG.res.innerHTML =
    "<div class=\"ex\">ผลของ " + escH(fin.label) + "</div>" +
    "<div class=\"set\" style=\"font-size:17px;\">" + kind + "</div>" +
    "<div class=\"n\">ตัวแปร " + nv + " ตัว → " + rows + " แถว · จริง " + nT + " แถว · เท็จ " + (rows - nT) + " แถว</div>";
}

function lgInsert(str){
  const el = LG.expr, a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? el.value.length;
  el.setRangeText(str, a, b, "end"); el.focus(); renderLogic();
}

registerTool({
  id:"logic", icon:"🔣", color:"c-purple", title:"ตรรกศาสตร์", desc:"สร้างตารางค่าความจริง พร้อมตารางย่อยของแต่ละวงเล็บและนิเสธ",
  html:`
    <div class="card">
      <div class="field" style="margin-bottom:0;">
        <label>พิมพ์เงื่อนไข (ตัวแปร p q r … · ∧ = ^ หรือ &amp; · ∨ = v หรือ | · ¬ = ~ หรือ ! · → = -&gt; · ↔ = &lt;-&gt; · ⊕)</label>
        <input id="lgExpr" class="tl-expr" value="(p ∧ q) → ¬r" autocomplete="off" autocapitalize="none" spellcheck="false">
      </div>
      <p class="tl-sub" style="margin:10px 0 14px;">ลำดับความสำคัญ: ¬ → ∧ → ∨ → → → ↔ (ใส่วงเล็บเพื่อกำหนดเองได้)</p>
    </div>
    <div class="tl-keys" id="lgKeys">
      <button type="button" data-k="p">p</button><button type="button" data-k="q">q</button><button type="button" data-k="r">r</button><button type="button" data-k="s">s</button>
      <button type="button" data-k="¬">¬</button><button type="button" data-k=" ∧ ">∧</button><button type="button" data-k=" ∨ ">∨</button><button type="button" data-k=" → ">→</button><button type="button" data-k=" ↔ ">↔</button><button type="button" data-k=" ⊕ ">⊕</button>
      <button type="button" data-k="(">(</button><button type="button" data-k=")">)</button>
      <button type="button" class="fn" data-k="⌫">⌫ ลบ</button><button type="button" class="fn" data-k="clear">ล้าง</button>
    </div>
    <div class="tl-err" id="lgErr"></div>
    <div class="tl-row" style="margin:2px 0 0;">
      <span class="tl-sub">แสดงค่าเป็น</span>
      <div class="tl-chips" id="lgMode"><button type="button" class="tl-chip on" data-m="TF">T / F</button><button type="button" class="tl-chip" data-m="01">1 / 0</button></div>
    </div>
    <div id="lgOut"></div>
    <div class="tl-res" id="lgRes"></div>
    <div class="tl-h">ตัวอย่าง</div>
    <div class="tl-chips" id="lgChips"></div>
    <p class="tl-lg-note" style="margin-top:12px;">คอลัมน์ซ้ายสุดคือตัวแปร ถัดมาคือตารางย่อยของแต่ละ ¬ และแต่ละวงเล็บ (เรียงตามลำดับที่ต้องคิดก่อน) และคอลัมน์สุดท้ายคือผลลัพธ์ของทั้งประโยค</p>`,
  init(v){
    LG.expr = $("#lgExpr", v); LG.err = $("#lgErr", v); LG.out = $("#lgOut", v); LG.res = $("#lgRes", v);
    LG.chips = $("#lgChips", v); LG.modeBox = $("#lgMode", v);
    LG.chips.innerHTML = LG_PRESET.map(e => "<button type=\"button\" class=\"tl-chip\" data-e=\"" + escH(e) + "\">" + escH(e) + "</button>").join("");
    LG.expr.addEventListener("input", () => { clearTimeout(lgTimer); lgTimer = setTimeout(renderLogic, 120); });
    LG.chips.addEventListener("click", e => { const b = e.target.closest(".tl-chip"); if(!b) return; LG.expr.value = b.dataset.e; renderLogic(); });
    LG.modeBox.addEventListener("click", e => {
      const b = e.target.closest(".tl-chip"); if(!b) return;
      lgMode = b.dataset.m;
      LG.modeBox.querySelectorAll(".tl-chip").forEach(x => x.classList.toggle("on", x === b));
      renderLogic();
    });
    $("#lgKeys", v).addEventListener("click", e => {
      const b = e.target.closest("button"); if(!b) return;
      const k = b.dataset.k;
      if(k === "clear"){ LG.expr.value = ""; renderLogic(); LG.expr.focus(); }
      else if(k === "⌫"){
        const el = LG.expr, a = el.selectionStart ?? el.value.length, z = el.selectionEnd ?? a;
        if(a !== z) el.setRangeText("", a, z, "end"); else if(a > 0) el.setRangeText("", a - 1, a, "end");
        el.focus(); renderLogic();
      } else lgInsert(k);
    });
    renderLogic();
  },
  onOpen(){ renderLogic(); }
});

/* =====================================================================
   เครื่องมือ 4: เรขาคณิตวิเคราะห์และภาคตัดกรวย
   - 5 แท็บ: ระยะ จุด–จุด · จุด–เส้นตรง · เส้นตรง–เส้นตรง (2 มิติ/3 มิติ) · สมการเส้นตรงผ่าน 2 จุด · ภาคตัดกรวย
   - ช่องตัวเลขพิมพ์ได้ทั้ง 1/2, 0.5, √3, 2^3, (1+2)/3
   - ภาคตัดกรวย: กรอกค่ามาตรฐาน (h, k, a, b, c, r) หรือกรอกสมการทั่วไป Ax²+Cy²+Dx+Ey+F=0 แล้วระบบหาชนิดให้
   ===================================================================== */
(function injectGeoCss(){
  if($("#tlGmCss")) return;
  const st = document.createElement("style"); st.id = "tlGmCss";
  st.textContent = `
#view-tool-geo{--c-main:#34A853; --c-bg:#E6F4EA; --c-ink:#0D652D; --c-sh:rgba(52,168,83,.6); --c-on:#fff;}
#view-tool-geo[data-dim="2"] .on3{display:none;}
#view-tool-geo[data-dim="3"] .on2{display:none;}
.gm-bar{display:flex; gap:8px; margin:0 0 12px;}
.gm-bar select{flex:1; min-width:0; padding:11px 12px; border:1.5px solid #E1E7F3; border-radius:12px; background:#fff; font:inherit; font-size:15px; font-weight:600; color:var(--ink);}
.gm-in{display:none;}
.gm-in.on{display:block;}
.gm-in .field:last-child{margin-bottom:0;}
#view-tool-geo .tl-err{min-height:0; margin:8px 2px 0;}
#view-tool-geo .gm-in.card{margin-bottom:0;}
.gm-g{display:grid; grid-template-columns:repeat(auto-fit,minmax(78px,1fr)); gap:8px;}
.gm-i{position:relative;}
.gm-i i{position:absolute; left:12px; top:50%; transform:translateY(-50%); font-style:normal; font-size:13px; font-weight:600; color:var(--ink-soft); pointer-events:none;}
.gm-i input{padding-left:30px !important; text-align:right; font-weight:600;}
.gm-eq{font-family:'Noto Serif Thai',serif; font-size:15px; color:var(--c-ink); background:var(--c-bg); border-radius:12px; padding:8px 12px; margin:0 0 14px; line-height:1.6; word-break:break-word;}
.gm-box{background:#fff; border:1.5px solid #E1E7F3; border-radius:20px; padding:4px 16px; margin-top:12px;}
.gm-r{display:grid; grid-template-columns:minmax(92px,30%) 1fr; gap:10px; padding:11px 0; border-bottom:1px solid #EEF1F8; align-items:baseline;}
.gm-r:last-child{border-bottom:0;}
.gm-r b{font-size:12.5px; font-weight:600; color:var(--ink-soft);}
.gm-r span{font-size:15px; font-weight:600; color:var(--ink); line-height:1.65; word-break:break-word;}
.gm-r span small{display:block; font-size:12px; font-weight:500; color:var(--ink-soft);}
.gm-st{padding:12px 16px;}
.gm-st b{display:block; font-size:12.5px; font-weight:600; color:var(--ink-soft); margin-bottom:4px;}
.gm-st div{font-size:14px; color:var(--ink); line-height:1.8; word-break:break-word;}
.gm-plot{background:#fff; border:1.5px solid #E1E7F3; border-radius:20px; padding:8px; margin-top:12px;}
.gm-plot svg{display:block; width:100%; max-width:460px; height:auto; margin:0 auto; border-radius:14px;}
.gm-leg{display:flex; flex-wrap:wrap; justify-content:center; gap:6px 16px; font-size:12px; color:var(--ink-soft); padding:8px 0 2px;}
.gm-leg i{display:inline-block; width:18px; height:0; border-top:2px dashed; vertical-align:middle; margin-right:6px;}
.gm-leg i.d{width:9px; height:9px; border:0; border-radius:50%;}
`;
  document.head.appendChild(st);
})();

const GM = { tab:"pp", dim:2, cn:"circle", ori:"h", timer:0, view:null, out:null, err:null };
const GM_EPS = 1e-9, gmZ = x => Math.abs(x) < GM_EPS;
const gmGcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while(b){ const t = a % b; a = b; b = t; } return a; };
const gmLcm = (a, b) => a / gmGcd(a, b) * b;
const gmV = {
  sub:(a, b) => a.map((x, i) => x - b[i]),
  dot:(a, b) => a.reduce((s, x, i) => s + x * b[i], 0),
  nsq:a => a.reduce((s, x) => s + x * x, 0),
  cross:(a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]]
};

/* ---------- อ่านตัวเลข (รองรับ 1/2 · √3 · 2^3 · (1+2)/3) ---------- */
function gmNum(src){
  let s = String(src).trim().replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, ".");
  s = s.replace(/√\s*(\d+(?:\.\d+)?)/g, (m, n) => "(" + Math.sqrt(+n) + ")").replace(/\^/g, "**");
  if(!s || !/^[0-9+\-*/().\s]*$/.test(s)) return NaN;
  try{ const v = Function('"use strict";return (' + s + ')')(); return typeof v === "number" && isFinite(v) ? v : NaN; }
  catch(e){ return NaN; }
}
function gmN(id){
  const el = $("#" + id), v = gmNum(el.value);
  if(!isFinite(v)){
    const g = el.closest(".field"), lb = g && g.querySelector("label"), sy = el.previousElementSibling;
    throw new Error("กรอกตัวเลขให้ถูกต้อง" + (lb ? " — " + lb.textContent.trim() + (sy ? " ช่อง " + sy.textContent : "") : ""));
  }
  return v;
}

/* ---------- แสดงตัวเลข: เศษส่วน / รูปกรณฑ์ ---------- */
function gmFrac(x){
  if(Number.isInteger(x)) return [x, 1];
  const sg = x < 0 ? -1 : 1, a = Math.abs(x);
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = a;
  for(let i = 0; i < 24; i++){
    const f = Math.floor(b), h2 = f*h1 + h0, k2 = f*k1 + k0;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if(k1 > 1000) return null;
    if(Math.abs(a - h1/k1) < 1e-9 * Math.max(1, a)) return [sg*h1, k1];
    const r = b - f; if(r < 1e-12) return null;
    b = 1 / r;
  }
  return null;
}
const gmDec = v => String(+v.toFixed(4)).replace("-", "−");
function gmF(x){
  if(!isFinite(x)) return "—";
  if(gmZ(x)) return "0";
  const f = gmFrac(x);
  return (f ? (f[1] === 1 ? String(f[0]) : f[0] + "/" + f[1]) : String(+x.toFixed(4))).replace("-", "−");
}
const gmP = x => x < 0 ? "(" + gmF(x) + ")" : gmF(x);
const gmPtS = a => "(" + a.map(gmF).join(", ") + ")";
const gmRt = s => { const t = gmF(s); return /^\d+$/.test(t) ? "√" + t : "√(" + t + ")"; };
/* √s ในรูปอย่างง่าย เช่น √12 → 2√3 */
function gmSqrt(s){
  const v = Math.sqrt(Math.max(s, 0));
  if(gmZ(s)) return { t:"0", v:0, ex:true };
  const fr = gmFrac(s);
  if(!fr || fr[0] * fr[1] > 1e12) return { t:"√" + gmF(s), v, ex:false };
  const d = fr[1]; let q = fr[0] * d, p = 1;
  for(let f = 2; f * f <= q; f++){ while(q % (f*f) === 0){ q /= f*f; p *= f; } }
  const g = gmGcd(p, d), pp = p / g, dd = d / g;
  const t = (q === 1 ? String(pp) : (pp === 1 ? "" : pp) + "√" + q) + (dd > 1 ? "/" + dd : "");
  return { t, v, ex: q === 1 };
}
const gmSq = s => { const r = gmSqrt(s); return r.ex ? r.t : r.t + " ≈ " + gmDec(r.v); };
/* ค่าบวก v ที่อาจเป็นจำนวนตรรกยะหรือกรณฑ์ */
const gmRV = v => gmFrac(v) ? gmF(v) : (gmFrac(v * v) ? gmSq(v * v) : gmDec(v));

/* ---------- ช่วยเขียนสมการ ---------- */
const gmCf = v => { if(gmZ(v - 1)) return ""; if(gmZ(v + 1)) return "−"; const s = gmF(v); return /^−?\d+(\.\d+)?$/.test(s) ? s : "(" + s + ")"; };
const gmSh = (v, s) => gmZ(v) ? s : "(" + s + (v > 0 ? " − " : " + ") + gmF(Math.abs(v)) + ")";
const gmLin = (v, s) => gmZ(v) ? s : s + (v > 0 ? " − " : " + ") + gmF(Math.abs(v));
const gmSqT = (v, s) => gmZ(v) ? s + "²" : gmSh(v, s) + "²";
const gmDen = v => { const s = gmF(v); return /^\d+(\.\d+)?$/.test(s) ? s : "(" + s + ")"; };
function gmPoly(c, sy){
  let s = "";
  c.forEach((v, i) => {
    if(gmZ(v)) return;
    const neg = v < 0, av = Math.abs(v), body = sy[i] && gmZ(av - 1) ? sy[i] : gmF(av) + sy[i];
    s += s === "" ? (neg ? "−" : "") + body : (neg ? " − " : " + ") + body;
  });
  return (s || "0") + " = 0";
}
/* คูณให้สัมประสิทธิ์เป็นจำนวนเต็มอย่างต่ำ ถ้าทำได้ */
function gmClear(a){
  const fr = a.map(gmFrac);
  if(fr.some(f => !f)) return a;
  let L = 1; fr.forEach(f => { L = gmLcm(L, f[1]); });
  let v = fr.map(f => f[0] * (L / f[1]));
  const g = v.reduce((g, x) => gmGcd(g, x), 0) || 1;
  v = v.map(x => x / g);
  const i = v.findIndex(x => x !== 0);
  if(i >= 0 && v[i] < 0) v = v.map(x => -x);
  return v;
}
/* จุดสองจุดที่ห่างจาก (h,k) ระยะ r (ผลของ gmSqrt) ตามแกน o */
function gmOff(h, k, r, o){
  const base = o === "h" ? h : k, pt = v => o === "h" ? gmPtS([v, k]) : gmPtS([h, v]);
  if(r.ex) return pt(base - r.v) + " และ " + pt(base + r.v);
  const mid = (gmZ(base) ? "" : gmF(base) + " ") + "± " + r.t;
  const pd = v => o === "h" ? "(" + gmDec(v) + ", " + gmDec(k) + ")" : "(" + gmDec(h) + ", " + gmDec(v) + ")";
  return (o === "h" ? "(" + mid + ", " + gmF(k) + ")" : "(" + gmF(h) + ", " + mid + ")") +
         "<small>≈ " + pd(base - r.v) + " และ " + pd(base + r.v) + "</small>";
}
function gmLines(nm, base, r){
  if(r.ex) return nm + " = " + gmF(base - r.v) + " และ " + nm + " = " + gmF(base + r.v);
  return nm + " = " + (gmZ(base) ? "" : gmF(base) + " ") + "± " + r.t +
         "<small>≈ " + nm + " = " + gmDec(base - r.v) + " และ " + nm + " = " + gmDec(base + r.v) + "</small>";
}

/* =============== ระยะห่าง และ สมการเส้นตรง =============== */
function gmPP(){
  const ax = ["x", "y", "z"].slice(0, GM.dim);
  const A = ax.map(c => gmN("gpa" + c)), B = ax.map(c => gmN("gpb" + c));
  const d = gmV.sub(B, A), s = gmV.nsq(d), r = gmSqrt(s);
  return {
    label:"ระยะห่างระหว่างจุด A และ B", main:r.t, sub:r.ex ? "" : "≈ " + gmDec(r.v),
    rows:[["จุดกึ่งกลาง AB", gmPtS(A.map((v, i) => (v + B[i]) / 2))], ["เวกเตอร์ AB", gmPtS(d)]],
    steps:[
      "d = √[" + ax.map(c => "(" + c + "₂ − " + c + "₁)²").join(" + ") + "]",
      "= √[" + A.map((v, i) => "(" + gmF(B[i]) + " − " + gmP(v) + ")²").join(" + ") + "]",
      "= √(" + d.map(v => gmF(v * v)).join(" + ") + ") = " + gmSq(s)
    ]
  };
}

function gmPL(){
  if(GM.dim === 2){
    const x0 = gmN("glpx"), y0 = gmN("glpy"), a = gmN("gl2a"), b = gmN("gl2b"), c = gmN("gl2c");
    if(gmZ(a) && gmZ(b)) throw new Error("A และ B ต้องไม่เป็น 0 พร้อมกัน");
    const num = a*x0 + b*y0 + c, den = a*a + b*b, s = num*num/den, r = gmSqrt(s), t = num/den;
    return {
      label:"ระยะจากจุด P ถึงเส้นตรง", main:r.t, sub:r.ex ? "" : "≈ " + gmDec(r.v),
      rows:[["เท้าของเส้นตั้งฉาก H", gmPtS([x0 - a*t, y0 - b*t])]],
      steps:[
        "d = |Ax₀ + By₀ + C| / √(A² + B²)",
        "= |" + gmP(a) + "(" + gmF(x0) + ") + " + gmP(b) + "(" + gmF(y0) + ") + " + gmP(c) + "| / √(" + gmP(a) + "² + " + gmP(b) + "²)",
        "= " + gmF(Math.abs(num)) + " / " + gmRt(den) + " = " + gmSq(s)
      ]
    };
  }
  const P = ["x", "y", "z"].map(c => gmN("glp" + c)), Q = ["x", "y", "z"].map(c => gmN("gl3" + c)), u = ["a", "b", "c"].map(c => gmN("gl3" + c));
  const uu = gmV.nsq(u);
  if(gmZ(uu)) throw new Error("เวกเตอร์ทิศทางต้องไม่เป็นศูนย์");
  const w = gmV.sub(P, Q), cr = gmV.cross(w, u), s = gmV.nsq(cr) / uu, r = gmSqrt(s), t = gmV.dot(w, u) / uu;
  return {
    label:"ระยะจากจุด P ถึงเส้นตรง", main:r.t, sub:r.ex ? "" : "≈ " + gmDec(r.v),
    rows:[["เท้าของเส้นตั้งฉาก H", gmPtS(Q.map((v, i) => v + t * u[i]))]],
    steps:[
      "d = |(P − P₀) × u| / |u|",
      "P − P₀ = " + gmPtS(w) + " · (P − P₀) × u = " + gmPtS(cr),
      "d = " + gmRt(gmV.nsq(cr)) + " / " + gmRt(uu) + " = " + gmSq(s)
    ]
  };
}

function gmLL(){
  if(GM.dim === 2){
    const L1 = ["a", "b", "c"].map(c => gmN("gm1" + c)), L2 = ["a", "b", "c"].map(c => gmN("gm2" + c));
    if((gmZ(L1[0]) && gmZ(L1[1])) || (gmZ(L2[0]) && gmZ(L2[1]))) throw new Error("A และ B ของแต่ละเส้นต้องไม่เป็น 0 พร้อมกัน");
    const D = L1[0]*L2[1] - L2[0]*L1[1];
    if(!gmZ(D)){
      const x = (L1[1]*L2[2] - L2[1]*L1[2]) / D, y = (L1[2]*L2[0] - L2[2]*L1[0]) / D;
      return { label:"ระยะห่างระหว่างเส้นตรง", main:"0", sub:"ตัดกัน",
        rows:[["ความสัมพันธ์", "ตัดกัน"], ["จุดตัด", gmPtS([x, y])]],
        steps:["A₁B₂ − A₂B₁ = " + gmF(D) + " ≠ 0 จึงไม่ขนานกัน → ตัดกันที่จุดเดียว ระยะห่าง = 0"] };
    }
    const k = !gmZ(L1[0]) ? L1[0] / L2[0] : L1[1] / L2[1], c2 = L2[2] * k, df = L1[2] - c2;
    if(gmZ(df)) return { label:"ระยะห่างระหว่างเส้นตรง", main:"0", sub:"ทับกัน", rows:[["ความสัมพันธ์", "ทับกัน (เป็นเส้นเดียวกัน)"]], steps:["เมื่อทำให้สัมประสิทธิ์ของ x, y เท่ากัน ค่าคงที่เท่ากัน → เป็นเส้นตรงเดียวกัน"] };
    const den = L1[0]*L1[0] + L1[1]*L1[1], s = df*df/den, r = gmSqrt(s);
    return { label:"ระยะห่างระหว่างเส้นตรงขนาน", main:r.t, sub:r.ex ? "" : "≈ " + gmDec(r.v),
      rows:[["ความสัมพันธ์", "ขนานกัน"]],
      steps:[
        "ทำสัมประสิทธิ์ของ x, y ให้เท่ากัน: L₁ : " + gmPoly([L1[0], L1[1], L1[2]], ["x", "y", ""]) + " · L₂ : " + gmPoly([L1[0], L1[1], c2], ["x", "y", ""]),
        "d = |C₁ − C₂| / √(A² + B²)",
        "= |" + gmF(L1[2]) + " − " + gmP(c2) + "| / " + gmRt(den) + " = " + gmSq(s)
      ] };
  }
  const g = p => ["x", "y", "z"].map(c => gmN(p + c));
  const P1 = g("gn1"), P2 = g("gn2"), d1 = ["a", "b", "c"].map(c => gmN("gn1" + c)), d2 = ["a", "b", "c"].map(c => gmN("gn2" + c));
  if(gmZ(gmV.nsq(d1)) || gmZ(gmV.nsq(d2))) throw new Error("เวกเตอร์ทิศทางต้องไม่เป็นศูนย์");
  const n = gmV.cross(d1, d2), w = gmV.sub(P2, P1), nn = gmV.nsq(n);
  if(nn <= 1e-12 * gmV.nsq(d1) * gmV.nsq(d2)){
    const cr = gmV.cross(w, d1);
    if(gmV.nsq(cr) <= 1e-12 * Math.max(gmV.nsq(w), 1) * gmV.nsq(d1))
      return { label:"ระยะห่างระหว่างเส้นตรง", main:"0", sub:"ทับกัน", rows:[["ความสัมพันธ์", "ทับกัน (เป็นเส้นเดียวกัน)"]], steps:["u₁ ∥ u₂ และ P₂ − P₁ ขนานกับ u₁ → เป็นเส้นตรงเดียวกัน"] };
    const s = gmV.nsq(cr) / gmV.nsq(d1), r = gmSqrt(s);
    return { label:"ระยะห่างระหว่างเส้นตรงขนาน", main:r.t, sub:r.ex ? "" : "≈ " + gmDec(r.v),
      rows:[["ความสัมพันธ์", "ขนานกัน"]],
      steps:[
        "u₁ × u₂ = (0, 0, 0) → ขนานกัน ใช้ d = |(P₂ − P₁) × u₁| / |u₁|",
        "(P₂ − P₁) × u₁ = " + gmPtS(cr),
        "d = " + gmRt(gmV.nsq(cr)) + " / " + gmRt(gmV.nsq(d1)) + " = " + gmSq(s)
      ] };
  }
  const tri = gmV.dot(w, n);
  if(Math.abs(tri) <= 1e-9 * Math.sqrt(nn) * Math.max(1, Math.sqrt(gmV.nsq(w)))){
    const t = gmV.dot(gmV.cross(w, d2), n) / nn;
    return { label:"ระยะห่างระหว่างเส้นตรง", main:"0", sub:"ตัดกัน",
      rows:[["ความสัมพันธ์", "ตัดกัน"], ["จุดตัด", gmPtS(P1.map((v, i) => v + t * d1[i]))]],
      steps:["n = u₁ × u₂ = " + gmPtS(n), "(P₂ − P₁)·n = 0 → อยู่ในระนาบเดียวกันและไม่ขนาน → ตัดกัน ระยะห่าง = 0"] };
  }
  const s = tri * tri / nn, r = gmSqrt(s);
  return { label:"ระยะห่างระหว่างเส้นตรงเบ้", main:r.t, sub:r.ex ? "" : "≈ " + gmDec(r.v),
    rows:[["ความสัมพันธ์", "เบ้ (ไม่ขนาน ไม่ตัดกัน)"]],
    steps:[
      "n = u₁ × u₂ = " + gmPtS(n) + " · P₂ − P₁ = " + gmPtS(w),
      "d = |(P₂ − P₁)·n| / |n|",
      "= |" + gmF(tri) + "| / " + gmRt(nn) + " = " + gmSq(s)
    ] };
}

function gmTP(){
  const ax = ["x", "y", "z"].slice(0, GM.dim);
  const A = ax.map(c => gmN("gta" + c)), B = ax.map(c => gmN("gtb" + c)), d = gmV.sub(B, A);
  if(gmZ(gmV.nsq(d))) throw new Error("จุด A และ B เป็นจุดเดียวกัน ไม่สามารถสร้างเส้นตรงได้");
  if(GM.dim === 2){
    const [x1, y1] = A, [x2, y2] = B;
    const gen = gmPoly(gmClear([y2 - y1, x1 - x2, x2*y1 - x1*y2]), ["x", "y", ""]);
    if(gmZ(d[0])) return { label:"สมการเส้นตรงผ่านจุด A และ B", main:"x = " + gmF(x1), sub:"เส้นแนวตั้ง · " + gen,
      rows:[["เวกเตอร์ทิศทาง", gmPtS(d)], ["ความชัน", "ไม่นิยาม"]], steps:[] };
    const m = d[1] / d[0], c = y1 - m * x1, mx = gmZ(m) ? "" : gmCf(m) + "x";
    let main = "y = " + mx;
    if(!gmZ(c)) main += mx ? (c > 0 ? " + " : " − ") + gmF(Math.abs(c)) : gmF(c); else if(!mx) main += "0";
    return { label:"สมการเส้นตรงผ่านจุด A และ B", main, sub:"รูปทั่วไป: " + gen,
      rows:[
        ["เวกเตอร์ทิศทาง", gmPtS(d)],
        ["ความชัน m", gmF(m)],
        ["รูปจุด–ความชัน", gmLin(y1, "y") + " = " + (gmZ(m) ? "0" : gmCf(m) + gmSh(x1, "x"))],
        ["รูปทั่วไป", gen]
      ],
      steps:["m = (y₂ − y₁) / (x₂ − x₁) = (" + gmF(y2) + " − " + gmP(y1) + ") / (" + gmF(x2) + " − " + gmP(x1) + ") = " + gmF(m)] };
  }
  const par = ax.map((c, i) => c + " = " + (gmZ(d[i]) ? gmF(A[i]) : (gmZ(A[i]) ? (d[i] < 0 ? "−" : "") : gmF(A[i]) + (d[i] > 0 ? " + " : " − ")) + gmCf(Math.abs(d[i])) + "t"));
  const sym = ax.map((c, i) => gmZ(d[i]) ? null : gmSh(A[i], c) + "/" + gmP(d[i])).filter(Boolean).join(" = ");
  const fix = ax.map((c, i) => gmZ(d[i]) ? c + " = " + gmF(A[i]) : null).filter(Boolean).join(" , ");
  return { label:"สมการเส้นตรงผ่านจุด A และ B", main:par[0] + " , " + par[1] + " , " + par[2], sub:"เมื่อ t เป็นจำนวนจริง",
    rows:[["เวกเตอร์ทิศทาง u = AB", gmPtS(d)], ["สมการพาราเมทริก", par.join("<br>")], ["สมการสมมาตร", sym + (fix ? " , " + fix : "")]],
    steps:[] };
}

/* =============== ภาคตัดกรวย =============== */
function gmCnFromStd(){
  const t = GM.cn, o = GM.ori, h = gmN("gch"), k = gmN("gck");
  if(t === "circle"){
    const r = gmN("gcr"); if(!(r > 0)) throw new Error("รัศมี r ต้องมากกว่า 0");
    return { type:"circle", h, k, r };
  }
  if(t === "parabola"){
    const c = gmN("gcc"); if(gmZ(c)) throw new Error("c ต้องไม่เป็น 0");
    return { type:"parabola", o, h, k, c };
  }
  const a = gmN("gca"), b = gmN("gcb");
  if(!(a > 0 && b > 0)) throw new Error("a และ b ต้องมากกว่า 0");
  if(t === "ellipse"){
    if(a < b - GM_EPS) throw new Error("a (ครึ่งแกนเอก) ต้องไม่น้อยกว่า b (ครึ่งแกนโท)");
    if(gmZ(a - b)) return { type:"circle", h, k, r:a, note:"a = b จึงเป็นวงกลม" };
  }
  return { type:t, o, h, k, a, b };
}
function gmCnFromGen(){
  const A = gmN("ggA"), C = gmN("ggC"), D = gmN("ggD"), E = gmN("ggE"), F = gmN("ggF");
  const za = gmZ(A), zc = gmZ(C);
  if(za && zc) throw new Error("ต้องมีพจน์ x² หรือ y² อย่างน้อยหนึ่งพจน์ (ถ้าไม่มีจะเป็นเส้นตรง)");
  if(zc){
    if(gmZ(E)) throw new Error("ไม่มีพจน์ y จึงเป็นเส้นตรงขนานแกน y (หรือไม่มีกราฟ) ไม่ใช่พาราโบลา");
    const u = D / (2*A); return { type:"parabola", o:"v", h:-u, k:(u*u*A - F) / E, c:-E / A / 4 };
  }
  if(za){
    if(gmZ(D)) throw new Error("ไม่มีพจน์ x จึงเป็นเส้นตรงขนานแกน x (หรือไม่มีกราฟ) ไม่ใช่พาราโบลา");
    const u = E / (2*C); return { type:"parabola", o:"h", k:-u, h:(u*u*C - F) / D, c:-D / C / 4 };
  }
  const h = -D / (2*A), k = -E / (2*C), R = D*D / (4*A) + E*E / (4*C) - F, p = R / A, q = R / C;
  if(A * C > 0){
    if(gmZ(R)) throw new Error("ได้เพียงจุดเดียว " + gmPtS([h, k]) + " ไม่ใช่เส้นโค้ง");
    if(p < 0) throw new Error("ไม่มีจุดใดบนกราฟ (ด้านขวาของสมการมาตรฐานเป็นลบ)");
    if(gmZ(A - C)) return { type:"circle", h, k, r:Math.sqrt(p) };
    return p > q ? { type:"ellipse", o:"h", h, k, a:Math.sqrt(p), b:Math.sqrt(q) } : { type:"ellipse", o:"v", h, k, a:Math.sqrt(q), b:Math.sqrt(p) };
  }
  if(gmZ(R)) throw new Error("ได้เส้นตรงสองเส้นตัดกัน ไม่ใช่ไฮเพอร์โบลา");
  return p > 0 ? { type:"hyperbola", o:"h", h, k, a:Math.sqrt(p), b:Math.sqrt(-q) } : { type:"hyperbola", o:"v", h, k, a:Math.sqrt(q), b:Math.sqrt(-p) };
}

function gmCnInfo(m){
  const { h, k } = m, O = m.o === "h", rows = [], R = (l, v) => rows.push([l, v]);
  const sy = ["x²", "y²", "x", "y", ""];
  let name, std, G;
  if(m.type === "circle"){
    name = "วงกลม"; std = gmSqT(h, "x") + " + " + gmSqT(k, "y") + " = " + gmF(m.r * m.r);
    G = [1, 1, -2*h, -2*k, h*h + k*k - m.r*m.r];
    R("จุดศูนย์กลาง", gmPtS([h, k])); R("รัศมี r", gmRV(m.r));
  }else if(m.type === "parabola"){
    const c = m.c;
    name = "พาราโบลา";
    std = O ? gmSqT(k, "y") + " = " + gmCf(4*c) + gmSh(h, "x") : gmSqT(h, "x") + " = " + gmCf(4*c) + gmSh(k, "y");
    G = O ? [0, 1, -4*c, -2*k, k*k + 4*c*h] : [1, 0, -2*h, -4*c, h*h + 4*c*k];
    R("จุดยอด", gmPtS([h, k]));
    R("ระยะ c (จุดยอด → โฟกัส)", gmF(Math.abs(c)));
    R("โฟกัส", O ? gmPtS([h + c, k]) : gmPtS([h, k + c]));
    R("เส้นไดเรกตริกซ์", O ? "x = " + gmF(h - c) : "y = " + gmF(k - c));
    R("แกนสมมาตร", O ? "y = " + gmF(k) : "x = " + gmF(h));
    R("ทิศที่เปิด", O ? (c > 0 ? "ไปทางขวา" : "ไปทางซ้าย") : (c > 0 ? "ขึ้นบน" : "ลงล่าง"));
  }else{
    const ell = m.type === "ellipse", a = m.a, b = m.b, a2 = a*a, b2 = b*b, c2 = ell ? a2 - b2 : a2 + b2;
    const ra = gmSqrt(a2), rb = gmSqrt(b2), rc = gmSqrt(c2), dd = gmSqrt(a2 * a2 / c2), o = O ? "h" : "v", p = O ? "v" : "h";
    const lineA = O ? "y = " + gmF(k) : "x = " + gmF(h), lineB = O ? "x = " + gmF(h) : "y = " + gmF(k);
    if(ell){
      name = "วงรี";
      std = O ? gmSqT(h, "x") + " / " + gmDen(a2) + " + " + gmSqT(k, "y") + " / " + gmDen(b2) + " = 1"
              : gmSqT(h, "x") + " / " + gmDen(b2) + " + " + gmSqT(k, "y") + " / " + gmDen(a2) + " = 1";
      G = O ? [b2, a2, -2*b2*h, -2*a2*k, b2*h*h + a2*k*k - a2*b2] : [a2, b2, -2*a2*h, -2*b2*k, a2*h*h + b2*k*k - a2*b2];
    }else{
      name = "ไฮเพอร์โบลา";
      std = O ? gmSqT(h, "x") + " / " + gmDen(a2) + " − " + gmSqT(k, "y") + " / " + gmDen(b2) + " = 1"
              : gmSqT(k, "y") + " / " + gmDen(a2) + " − " + gmSqT(h, "x") + " / " + gmDen(b2) + " = 1";
      G = O ? [b2, -a2, -2*b2*h, 2*a2*k, b2*h*h - a2*k*k - a2*b2] : [-a2, b2, 2*a2*h, -2*b2*k, -a2*h*h + b2*k*k - a2*b2];
    }
    R("จุดศูนย์กลาง", gmPtS([h, k]));
    R("a · b · c", "a = " + gmRV(a) + " · b = " + gmRV(b) + " · c = " + gmSq(c2));
    R(ell ? "แกนเอก" : "แกนตามขวาง (แกนเอก)", "ยาว " + gmRV(2*a) + " · อยู่บนเส้น " + lineA);
    R(ell ? "จุดปลายแกนเอก" : "จุดยอด", gmOff(h, k, ra, o));
    R(ell ? "แกนโท" : "แกนสังยุค (แกนโท)", "ยาว " + gmRV(2*b) + " · อยู่บนเส้น " + lineB);
    R(ell ? "จุดปลายแกนโท" : "จุดปลายแกนสังยุค", gmOff(h, k, rb, p));
    R("โฟกัส", gmOff(h, k, rc, o));
    R("เส้นไดเรกตริกซ์", gmLines(O ? "x" : "y", O ? h : k, dd));
    if(!ell){
      const sl = gmSqrt((O ? b2 / a2 : a2 / b2)), st = sl.t === "1" ? "" : /^\d+$/.test(sl.t) ? sl.t : "(" + sl.t + ")";
      R("เส้นกำกับ", gmLin(k, "y") + " = ± " + st + gmSh(h, "x") + (sl.ex ? "" : "<small>ความชัน ± " + gmDec(sl.v) + "</small>"));
    }
    R("ความเยื้องศูนย์กลาง e", gmSq(c2 / a2));
  }
  return { name, std, gen:"สมการทั่วไป: " + gmPoly(gmClear(G), sy), rows };
}

function gmCN(){
  const m = GM.cn === "gen" ? gmCnFromGen() : gmCnFromStd(), I = gmCnInfo(m);
  return { label:I.name + (m.note ? " · " + m.note : ""), main:I.std, sub:I.gen, plot:gmDraw(m), rows:I.rows };
}

/* วาดกราฟ SVG: ปรับขอบเขตให้พอดีกับรูป */
function gmDraw(m){
  const { h, k } = m, O = m.o === "h", S = 420, a = m.a, b = m.b;
  const P = [[h, k]], D = [], Ls = [];
  let f = 1.4, c = 0;
  if(m.type === "circle"){
    P.push([h - m.r, k - m.r], [h + m.r, k + m.r]); D.push({ x:h, y:k, t:"C" });
  }else if(m.type === "parabola"){
    const cc = m.c, Fp = O ? [h + cc, k] : [h, k + cc];
    P.push(Fp, O ? [h + cc, k + 2*cc] : [h + 2*cc, k], O ? [h + cc, k - 2*cc] : [h - 2*cc, k], O ? [h - cc, k] : [h, k - cc]);
    D.push({ x:h, y:k, t:"V" }, { x:Fp[0], y:Fp[1], t:"F", c:"f" });
    Ls.push(O ? { t:"y", v:k, c:"ax" } : { t:"x", v:h, c:"ax" }, O ? { t:"x", v:h - cc, c:"dr" } : { t:"y", v:k - cc, c:"dr" });
    f = 1.6;
  }else{
    const ell = m.type === "ellipse", rx = O ? a : b, ry = O ? b : a;
    c = Math.sqrt(ell ? a*a - b*b : a*a + b*b);
    const F1 = O ? [h - c, k] : [h, k - c], F2 = O ? [h + c, k] : [h, k + c], dd = a * a / c;
    P.push([h - rx, k - ry], [h + rx, k + ry], F1, F2);
    D.push({ x:h, y:k, t:"C" }, { x:F1[0], y:F1[1], t:"F₁", c:"f" }, { x:F2[0], y:F2[1], t:"F₂", c:"f" });
    const V1 = O ? [h - a, k] : [h, k - a], V2 = O ? [h + a, k] : [h, k + a];
    D.push({ x:V1[0], y:V1[1], c:"v" }, { x:V2[0], y:V2[1], c:"v" });
    if(ell) D.push({ x:O ? h : h - b, y:O ? k - b : k, c:"v" }, { x:O ? h : h + b, y:O ? k + b : k, c:"v" });
    Ls.push({ t:O ? "y" : "x", v:O ? k : h, c:"ax" }, { t:O ? "x" : "y", v:O ? h : k, c:"ax" },
            { t:O ? "x" : "y", v:(O ? h : k) - dd, c:"dr" }, { t:O ? "x" : "y", v:(O ? h : k) + dd, c:"dr" });
    if(!ell || dd <= 2.5 * a) P.push(O ? [h - dd, k] : [h, k - dd], O ? [h + dd, k] : [h, k + dd]);
    if(!ell){ const sl = O ? b / a : a / b; Ls.push({ t:"a", s:sl, c:"as" }, { t:"a", s:-sl, c:"as" }); f = 1.8; }
  }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  P.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
  let span = Math.max(x1 - x0, y1 - y0) * f; if(!(span > 0)) span = 2;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, xmin = cx - span/2, xmax = cx + span/2, ymin = cy - span/2, ymax = cy + span/2;
  const sx = x => ((x - xmin) / span * S).toFixed(1), sy = y => (S - (y - ymin) / span * S).toFixed(1);
  const raw = span / 8, pw = Math.pow(10, Math.floor(Math.log10(raw))), nn = raw / pw, step = (nn < 1.5 ? 1 : nn < 3.5 ? 2 : nn < 7.5 ? 5 : 10) * pw;
  const tk = v => String(+v.toPrecision(10)).replace("-", "−");
  let s = '<svg viewBox="0 0 ' + S + " " + S + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="กราฟ" font-family="inherit"><rect width="' + S + '" height="' + S + '" fill="#fff"/>';
  for(let i = Math.ceil(xmin / step); i <= Math.floor(xmax / step); i++){
    const v = +(i * step).toPrecision(12), X = sx(v);
    s += '<line x1="' + X + '" y1="0" x2="' + X + '" y2="' + S + '" stroke="' + (i === 0 ? "#94A3B8" : "#EEF1F8") + '" stroke-width="' + (i === 0 ? 1.4 : 1) + '"/>';
    if(i !== 0) s += '<text x="' + X + '" y="' + (S - 4) + '" font-size="10" fill="#94A3B8" text-anchor="middle">' + tk(v) + "</text>";
  }
  for(let i = Math.ceil(ymin / step); i <= Math.floor(ymax / step); i++){
    const v = +(i * step).toPrecision(12), Y = sy(v);
    s += '<line x1="0" y1="' + Y + '" x2="' + S + '" y2="' + Y + '" stroke="' + (i === 0 ? "#94A3B8" : "#EEF1F8") + '" stroke-width="' + (i === 0 ? 1.4 : 1) + '"/>';
    if(i !== 0) s += '<text x="4" y="' + (Y - 3) + '" font-size="10" fill="#94A3B8">' + tk(v) + "</text>";
  }
  const LS = { ax:["เส้นแกน", "#94A3B8", "6 4"], dr:["เส้นไดเรกตริกซ์", "#F59E0B", "7 4"], as:["เส้นกำกับ", "#A78BFA", "2 4"] };
  Ls.forEach(l => {
    let X1 = 0, Y1 = 0, X2 = S, Y2 = 0;
    if(l.t === "x"){ X1 = X2 = sx(l.v); Y1 = 0; Y2 = S; }
    else if(l.t === "y"){ Y1 = Y2 = sy(l.v); }
    else{ Y1 = sy(k + l.s * (xmin - h)); Y2 = sy(k + l.s * (xmax - h)); }
    s += '<line x1="' + X1 + '" y1="' + Y1 + '" x2="' + X2 + '" y2="' + Y2 + '" stroke="' + LS[l.c][1] + '" stroke-width="1.6" stroke-dasharray="' + LS[l.c][2] + '"/>';
  });
  /* เส้นโค้ง */
  const N = 240, curves = [], mk = fn => { const a = []; for(let i = 0; i <= N; i++){ const q = fn(i / N); if(q) a.push(q); } return a; };
  if(m.type === "circle" || m.type === "ellipse"){
    const rx = m.type === "circle" ? m.r : (O ? a : b), ry = m.type === "circle" ? m.r : (O ? b : a);
    curves.push(mk(t => [h + rx * Math.cos(2*Math.PI*t), k + ry * Math.sin(2*Math.PI*t)]));
  }else if(m.type === "parabola"){
    curves.push(O ? mk(t => { const y = ymin + t*span; return [h + (y - k)*(y - k) / (4*m.c), y]; })
                  : mk(t => { const x = xmin + t*span; return [x, k + (x - h)*(x - h) / (4*m.c)]; }));
  }else{
    const w = (u, v) => a * Math.sqrt(1 + (u/v)*(u/v));
    if(O){ curves.push(mk(t => { const y = ymin + t*span; return [h + w(y - k, b), y]; }), mk(t => { const y = ymin + t*span; return [h - w(y - k, b), y]; })); }
    else { curves.push(mk(t => { const x = xmin + t*span; return [x, k + w(x - h, b)]; }), mk(t => { const x = xmin + t*span; return [x, k - w(x - h, b)]; })); }
  }
  curves.forEach(cv => { s += '<path d="M' + cv.map(q => sx(q[0]) + " " + sy(q[1])).join("L") + '" fill="none" style="stroke:var(--c-main)" stroke-width="2.8" stroke-linejoin="round"/>'; });
  D.forEach(d => {
    const X = sx(d.x), Y = sy(d.y), col = d.c === "f" ? "#E5484D" : "#1B2233";
    if(d.c === "v") s += '<circle cx="' + X + '" cy="' + Y + '" r="3.4" fill="#fff" stroke="' + col + '" stroke-width="1.6"/>';
    else s += '<circle cx="' + X + '" cy="' + Y + '" r="4.6" fill="' + col + '"/><text x="' + (+X + 8) + '" y="' + (+Y - 8) + '" font-size="14" font-weight="700" fill="' + col + '" style="paint-order:stroke;stroke:#fff;stroke-width:3px">' + d.t + "</text>";
  });
  s += "</svg>";
  const used = [...new Set(Ls.map(l => l.c))];
  const leg = used.map(u => '<span><i style="border-color:' + LS[u][1] + '"></i>' + LS[u][0] + "</span>").join("") +
              (D.some(d => d.c === "f") ? '<span><i class="d" style="background:#E5484D"></i>โฟกัส</span>' : "");
  return '<div class="gm-plot">' + s + (leg ? '<div class="gm-leg">' + leg + "</div>" : "") + "</div>";
}

/* =============== หน้าจอ =============== */
const GM_TABS = [
  ["pp", "จุด – จุด", "หาระยะห่างระหว่างจุดสองจุด พร้อมจุดกึ่งกลาง"],
  ["pl", "จุด – เส้นตรง", "หาระยะจากจุดถึงเส้นตรง พร้อมเท้าของเส้นตั้งฉาก"],
  ["ll", "เส้นตรง – เส้นตรง", "หาระยะห่างระหว่างเส้นตรงสองเส้น (ขนาน · ตัดกัน · เบ้)"],
  ["tp", "สมการเส้นตรง", "หาสมการเส้นตรงที่ผ่านจุด A และ B"],
  ["cn", "ภาคตัดกรวย", "กราฟ พร้อมจุดศูนย์กลาง โฟกัส แกน และเส้นไดเรกตริกซ์"]
];
const GM_CN_TYPES = [["circle", "วงกลม"], ["ellipse", "วงรี"], ["parabola", "พาราโบลา"], ["hyperbola", "ไฮเพอร์โบลา"], ["gen", "กรอกสมการทั่วไป"]];
const GM_CN_SHOW = { circle:["gch", "gck", "gcr"], ellipse:["gch", "gck", "gca", "gcb"], parabola:["gch", "gck", "gcc"], hyperbola:["gch", "gck", "gca", "gcb"], gen:["ggA", "ggC", "ggD", "ggE", "ggF"] };
const GM_CN_DEF = {
  circle:{ gch:0, gck:0, gcr:3 }, ellipse:{ gch:1, gck:-1, gca:5, gcb:3 }, parabola:{ gch:1, gck:2, gcc:2 }, hyperbola:{ gch:0, gck:0, gca:3, gcb:4 },
  gen:{ ggA:9, ggC:16, ggD:-18, ggE:64, ggF:-71 }
};
const GM_CN_HINT = {
  circle:{ h:"(x − h)² + (y − k)² = r²" },
  ellipse:{ h:"(x − h)²/a² + (y − k)²/b² = 1  (a ≥ b)", v:"(x − h)²/b² + (y − k)²/a² = 1  (a ≥ b)" },
  parabola:{ h:"(y − k)² = 4c(x − h)", v:"(x − h)² = 4c(y − k)" },
  hyperbola:{ h:"(x − h)²/a² − (y − k)²/b² = 1", v:"(y − k)²/a² − (x − h)²/b² = 1" },
  gen:{ h:"Ax² + Cy² + Dx + Ey + F = 0  (ไม่มีพจน์ xy)" }
};

const gmIn = (id, sym, val, cls) => '<div class="gm-i' + (cls ? " " + cls : "") + '"><i>' + sym + '</i><input id="' + id + '" value="' + val + '" autocomplete="off" spellcheck="false"></div>';
const gmXYZ = (p, ttl, v, keys, cls) => {
  const K = keys || ["x", "y", "z"];
  return '<div class="field' + (cls ? " " + cls : "") + '"><label>' + ttl + '</label><div class="gm-g">' + gmIn(p + K[0], K[0], v[0]) + gmIn(p + K[1], K[1], v[1]) + gmIn(p + K[2], K[2], v[2], keys ? "" : "on3") + "</div></div>";
};
const gmABC = (p, ttl, v, cls) => '<div class="field' + (cls ? " " + cls : "") + '"><label>' + ttl + '</label><div class="gm-g">' + gmIn(p + "a", "A", v[0]) + gmIn(p + "b", "B", v[1]) + gmIn(p + "c", "C", v[2]) + "</div></div>";
const gmVec = (p, ttl, v, cls) => '<div class="field' + (cls ? " " + cls : "") + '"><label>' + ttl + '</label><div class="gm-g">' + gmIn(p + "a", "a", v[0]) + gmIn(p + "b", "b", v[1]) + gmIn(p + "c", "c", v[2]) + "</div></div>";

function gmLayout(){
  const v = GM.view;
  v.dataset.dim = String(GM.dim);
  $("#gmTab", v).value = GM.tab;
  $("#gmDim", v).value = String(GM.dim);
  v.querySelectorAll(".gm-in").forEach(p => p.classList.toggle("on", p.dataset.p === GM.tab));
  $("#gmDim", v).style.display = GM.tab === "cn" ? "none" : "";
}
function gmCnSet(type, keep){
  GM.cn = type; if(!keep) GM.ori = "h";
  const v = GM.view, show = GM_CN_SHOW[type];
  if(!keep) Object.entries(GM_CN_DEF[type]).forEach(([id, val]) => { $("#" + id, v).value = val; });
  v.querySelectorAll("#gmCnBox .gm-i").forEach(w => { w.style.display = show.includes(w.querySelector("input").id) ? "" : "none"; });
  $("#gmCnType", v).value = type;
  const hasOri = type === "ellipse" || type === "parabola" || type === "hyperbola";
  $("#gmCnOri", v).style.display = hasOri ? "" : "none";
  const lab = type === "parabola" ? ["เปิดซ้าย–ขวา", "เปิดขึ้น–ลง"] : ["แนวนอน", "แนวตั้ง"];
  const os = $("#gmCnOri", v); os.options[0].textContent = lab[0]; os.options[1].textContent = lab[1]; os.value = GM.ori;
  $("#gmCnEq", v).textContent = GM_CN_HINT[type][GM.ori] || GM_CN_HINT[type].h;
}

const GM_HTML =
  '<div class="gm-bar"><select id="gmTab" aria-label="หัวข้อ"></select><select id="gmDim" aria-label="มิติ"><option value="2">2 มิติ</option><option value="3">3 มิติ</option></select></div>' +
  '<div class="card gm-in on" data-p="pp">' + gmXYZ("gpa", "จุด A", [1, 2, 3]) + gmXYZ("gpb", "จุด B", [4, 6, 15]) + "</div>" +
  '<div class="card gm-in" data-p="pl">' + gmXYZ("glp", "จุด P", [3, 4, 5]) +
    gmABC("gl2", "เส้นตรง Ax + By + C = 0", [3, 4, -5], "on2") +
    gmXYZ("gl3", "เส้นตรงผ่านจุด P₀", [1, 0, 0], ["x", "y", "z"], "on3") + gmVec("gl3", "เวกเตอร์ทิศทาง u", [0, 0, 1], "on3") + "</div>" +
  '<div class="card gm-in" data-p="ll">' +
    gmABC("gm1", "เส้นตรง L₁ : A₁x + B₁y + C₁ = 0", [3, 4, -5], "on2") + gmABC("gm2", "เส้นตรง L₂ : A₂x + B₂y + C₂ = 0", [3, 4, 10], "on2") +
    gmXYZ("gn1", "เส้นตรง L₁ ผ่านจุด P₁", [0, 0, 0], ["x", "y", "z"], "on3") + gmVec("gn1", "ทิศทางของ L₁ (u₁)", [1, 0, 0], "on3") +
    gmXYZ("gn2", "เส้นตรง L₂ ผ่านจุด P₂", [0, 0, 3], ["x", "y", "z"], "on3") + gmVec("gn2", "ทิศทางของ L₂ (u₂)", [0, 1, 0], "on3") + "</div>" +
  '<div class="card gm-in" data-p="tp">' + gmXYZ("gta", "จุด A", [1, 2, 3]) + gmXYZ("gtb", "จุด B", [4, 8, 9]) + "</div>" +
  '<div class="card gm-in" data-p="cn"><div class="gm-bar"><select id="gmCnType" aria-label="ชนิดภาคตัดกรวย">' +
    GM_CN_TYPES.map(t => '<option value="' + t[0] + '">' + t[1] + "</option>").join("") + '</select><select id="gmCnOri" aria-label="ทิศของกราฟ"><option value="h"></option><option value="v"></option></select></div>' +
    '<div class="gm-eq" id="gmCnEq"></div>' +
    '<div class="field" id="gmCnBox"><div class="gm-g">' +
      gmIn("gch", "h", 0) + gmIn("gck", "k", 0) + gmIn("gcr", "r", 3) + gmIn("gca", "a", 5) + gmIn("gcb", "b", 3) + gmIn("gcc", "c", 2) +
      gmIn("ggA", "A", 9) + gmIn("ggC", "C", 16) + gmIn("ggD", "D", -18) + gmIn("ggE", "E", 64) + gmIn("ggF", "F", -71) +
    "</div></div></div>" +
  '<div class="tl-err" id="gmErr"></div><div id="gmOut"></div>' +
  '<p class="tl-lg-note" style="margin-top:14px;">ช่องตัวเลขพิมพ์ได้เช่น 1/2 · √3 · 2^3 · (1+2)/3 — ผลลัพธ์แสดงเป็นเศษส่วนหรือรูปกรณฑ์ พร้อมค่าทศนิยม</p>';

function gmShow(r){
  GM.out.innerHTML =
    '<div class="tl-res"><div class="ex">' + r.label + '</div><div class="set">' + r.main + "</div>" + (r.sub ? '<div class="n">' + r.sub + "</div>" : "") + "</div>" +
    (r.plot || "") +
    (r.rows && r.rows.length ? '<div class="gm-box">' + r.rows.map(x => '<div class="gm-r"><b>' + x[0] + "</b><span>" + x[1] + "</span></div>").join("") + "</div>" : "") +
    (r.steps && r.steps.length ? '<div class="gm-box gm-st"><b>วิธีทำ</b>' + r.steps.map(x => "<div>" + x + "</div>").join("") + "</div>" : "");
}
function gmRender(){
  GM.err.textContent = "";
  try{ gmShow({ pp:gmPP, pl:gmPL, ll:gmLL, tp:gmTP, cn:gmCN }[GM.tab]()); }
  catch(e){ GM.err.textContent = e.message; GM.out.innerHTML = ""; }
}

registerTool({
  id:"geo", icon:"📐", color:"c-green", title:"เรขาคณิตวิเคราะห์และภาคตัดกรวย", desc:"ระยะห่าง สมการเส้นตรง และภาคตัดกรวย",
  html:GM_HTML,
  init(v){
    GM.view = v; GM.out = $("#gmOut", v); GM.err = $("#gmErr", v);
    $("#gmTab", v).innerHTML = GM_TABS.map(t => '<option value="' + t[0] + '">' + t[1] + "</option>").join("");
    $("#gmTab", v).addEventListener("change", e => { GM.tab = e.target.value; gmLayout(); gmRender(); });
    $("#gmDim", v).addEventListener("change", e => { GM.dim = +e.target.value; gmLayout(); gmRender(); });
    $("#gmCnType", v).addEventListener("change", e => { gmCnSet(e.target.value); gmRender(); });
    $("#gmCnOri", v).addEventListener("change", e => { GM.ori = e.target.value; gmCnSet(GM.cn, true); gmRender(); });
    v.addEventListener("input", () => { clearTimeout(GM.timer); GM.timer = setTimeout(gmRender, 120); });
    gmLayout(); gmCnSet("circle"); gmRender();
  },
  onOpen(){ gmRender(); }
});

/* =====================================================================
   เครื่องมือ: เมทริกซ์ (A, B, C, ... · Aᵀ · det · A⁻¹ · นิพจน์ เช่น 2A+B, AB, (A+B)ᵀ)
   ===================================================================== */
(function injectMxCss(){
  if($("#mxCss")) return;
  const st = document.createElement("style"); st.id = "mxCss";
  st.textContent = `
#view-tool-matrix{--c-main:#8E5CF0; --c-bg:#EFE8FD; --c-ink:#4B22A8; --c-sh:rgba(142,92,240,.6); --c-on:#fff;}
.mx-card{background:#fff; border:1.5px solid #E1E7F3; border-radius:20px; padding:12px 14px 14px; margin-bottom:12px;}
.mx-head{display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;}
.mx-name{width:34px; height:34px; border-radius:11px; background:var(--c-main); color:var(--c-on); display:flex; align-items:center; justify-content:center; font-family:'Noto Serif Thai',serif; font-size:18px; font-weight:700;}
.mx-size{display:flex; align-items:center; gap:5px; font-size:13px; font-weight:600; color:var(--ink-soft); margin-left:auto;}
.mx-size select{padding:6px 8px; border:1.5px solid #E1E7F3; border-radius:10px; background:#fff; font:inherit; font-size:14px; font-weight:600; color:var(--ink);}
.mx-del{width:32px; height:32px; border-radius:10px; border:1.5px solid #E1E7F3; background:#fff; color:var(--absent,#C23439); font-size:15px; cursor:pointer;}
.mx-scroll{overflow-x:auto; padding:2px;}
.mx-grid{display:grid; gap:6px; width:max-content; margin:0 auto; padding:0 10px; position:relative; border-left:3px solid var(--c-main); border-right:3px solid var(--c-main); border-radius:8px;}
.mx-grid input{width:58px; height:42px; padding:0 4px !important; text-align:center; font-weight:600; font-size:15px; border:1.5px solid #E1E7F3; border-radius:10px; background:#fff; color:var(--ink); font-family:inherit; min-width:0;}
.mx-grid input:focus{outline:none; border-color:var(--c-main); box-shadow:0 0 0 3px var(--c-bg);}
.mx-add{width:100%; padding:11px; border-radius:14px; border:1.5px dashed var(--c-main); background:transparent; color:var(--c-ink); font:inherit; font-size:15px; font-weight:600; cursor:pointer; margin-bottom:6px;}
.mx-add:disabled{opacity:.4; cursor:default;}
.mx-sel{display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:14px; font-weight:600; color:var(--ink);}
.mx-sel select{padding:8px 12px; border:1.5px solid #E1E7F3; border-radius:12px; background:#fff; font:inherit; font-size:15px; font-weight:600; color:var(--ink);}
.mx-ops{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:6px;}
.mx-ops button,.mx-ex button{padding:9px 14px; border-radius:12px; border:1.5px solid var(--c-main); background:var(--c-bg); color:var(--c-ink); font:inherit; font-size:15px; font-weight:700; cursor:pointer; transition:transform .1s, background .15s, color .15s;}
.mx-ops button:active,.mx-ex button:active{transform:scale(.95);}
.mx-ops button:hover,.mx-ex button:hover{background:var(--c-main); color:var(--c-on);}
.mx-ex{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px;}
.mx-ex button{background:#fff;}
.mx-exin{display:flex; gap:8px;}
.mx-exin input{flex:1; min-width:0; padding:11px 12px; border:1.5px solid #E1E7F3; border-radius:12px; font:inherit; font-size:16px; font-weight:600; color:var(--ink); background:#fff;}
.mx-exin input:focus{outline:none; border-color:var(--c-main);}
.mx-exin .btn{width:auto; padding:0 18px; flex:0 0 auto;}
.mx-out{margin-top:14px;}
.mx-out .tl-res .ex{font-family:'Noto Serif Thai',serif; font-size:15px; opacity:.9;}
.mx-show{display:flex; justify-content:center; padding:10px 0 4px; overflow-x:auto;}
.mx-m{display:grid; gap:6px 16px; padding:2px 12px; border-left:3px solid var(--c-ink); border-right:3px solid var(--c-ink); border-radius:8px; width:max-content;}
.mx-m span{text-align:center; font-family:'Noto Serif Thai',serif; font-size:19px; font-weight:600; min-width:26px;}
.mx-sc{font-family:'Noto Serif Thai',serif; font-size:26px; font-weight:700; text-align:center; padding:8px 0 2px;}
.mx-pre{font-family:'Noto Serif Thai',serif; font-size:19px; font-weight:600; margin:0 8px; align-self:center;}
.mx-eq{display:flex; align-items:center; justify-content:center; flex-wrap:nowrap;}
`;
  document.head.appendChild(st);
})();

const MX = { mats:[], sel:"A", view:null, out:null, err:null };
const MX_NAMES = "ABCDEF";
const MX_MAX = 6, MX_DIM = 6;

function mxMake(name, r, c, fill){
  return { name, r, c, v: Array.from({length:r}, (_, i) => Array.from({length:c}, (_, j) => fill ? fill(i, j) : "0")) };
}
const mxGet = n => MX.mats.find(m => m.name === n);

/* ---------- ส่วนติดต่อผู้ใช้ ---------- */
function mxDrawMats(){
  const box = $("#mxMats", MX.view);
  box.innerHTML = MX.mats.map(m => {
    const opts = k => Array.from({length:MX_DIM}, (_, i) => '<option value="' + (i+1) + '"' + (i+1 === k ? " selected" : "") + ">" + (i+1) + "</option>").join("");
    let cells = "";
    for(let i = 0; i < m.r; i++) for(let j = 0; j < m.c; j++)
      cells += '<input inputmode="text" autocomplete="off" spellcheck="false" data-m="' + m.name + '" data-i="' + i + '" data-j="' + j + '" value="' + escH(m.v[i][j]) + '" aria-label="' + m.name + ' แถว ' + (i+1) + ' หลัก ' + (j+1) + '">';
    return '<div class="mx-card" data-m="' + m.name + '"><div class="mx-head"><span class="mx-name">' + m.name + "</span>" +
      '<span class="mx-size"><select data-sz="r" data-m="' + m.name + '" aria-label="จำนวนแถว">' + opts(m.r) + '</select>×<select data-sz="c" data-m="' + m.name + '" aria-label="จำนวนหลัก">' + opts(m.c) + "</select></span>" +
      (MX.mats.length > 1 ? '<button type="button" class="mx-del" data-del="' + m.name + '" aria-label="ลบเมทริกซ์ ' + m.name + '">✕</button>' : "") +
      '</div><div class="mx-scroll"><div class="mx-grid" style="grid-template-columns:repeat(' + m.c + ',58px);">' + cells + "</div></div></div>";
  }).join("");
  $("#mxAdd", MX.view).disabled = MX.mats.length >= MX_MAX;
  $("#mxAdd", MX.view).textContent = MX.mats.length >= MX_MAX ? "มีครบ " + MX_MAX + " เมทริกซ์แล้ว" : "＋ เพิ่มเมทริกซ์ " + MX_NAMES[nextFree()];
  mxDrawOps();
}
function nextFree(){
  for(let i = 0; i < MX_NAMES.length; i++) if(!mxGet(MX_NAMES[i])) return i;
  return MX_NAMES.length - 1;
}
function mxDrawOps(){
  if(!mxGet(MX.sel)) MX.sel = MX.mats[0].name;
  const multi = MX.mats.length > 1, n = MX.sel;
  const selBox = $("#mxSel", MX.view);
  selBox.style.display = multi ? "" : "none";
  selBox.innerHTML = '<span>เลือกเมทริกซ์</span><select id="mxSelS" aria-label="เลือกเมทริกซ์">' + MX.mats.map(m => '<option value="' + m.name + '"' + (m.name === n ? " selected" : "") + ">" + m.name + "</option>").join("") + "</select>";
  $("#mxOps", MX.view).innerHTML =
    '<button type="button" data-op="t">' + n + "ᵀ</button>" +
    '<button type="button" data-op="det">det(' + n + ")</button>" +
    '<button type="button" data-op="inv">' + n + "⁻¹</button>";
  const exCard = $("#mxExCard", MX.view);
  exCard.style.display = multi ? "" : "none";
  if(multi){
    const [a, b] = [MX.mats[0].name, MX.mats[1].name];
    const sug = [a + "+" + b, a + "−" + b, "2" + a + "+" + b, a + b];
    if(MX.mats.length > 2) sug.push(a + "+" + b + "+" + MX.mats[2].name);
    $("#mxEx", MX.view).innerHTML = sug.map(s => '<button type="button" data-ex="' + s + '">' + s + "</button>").join("");
  }
}

/* ---------- อ่านค่าจากช่อง ---------- */
function mxVal(m){
  return m.v.map((row, i) => row.map((s, j) => {
    const x = gmNum(s);
    if(!isFinite(x)) throw new Error("เมทริกซ์ " + m.name + " แถว " + (i+1) + " หลัก " + (j+1) + " — กรอกตัวเลขให้ถูกต้อง");
    return x;
  }));
}

/* ---------- คำนวณเมทริกซ์ ---------- */
const mxZero = x => Math.abs(x) < 1e-9;
const mxDims = a => a.length + "×" + a[0].length;
const mxSq = (a, nm) => { if(a.length !== a[0].length) throw new Error((nm || "เมทริกซ์") + " ต้องเป็นเมทริกซ์จัตุรัส (ตอนนี้ขนาด " + mxDims(a) + ")"); };
const mxT = a => a[0].map((_, j) => a.map(r => r[j]));
function mxMinor(a, i, j){ return a.filter((_, r) => r !== i).map(r => r.filter((_, c) => c !== j)); }
function mxDet(a){
  const n = a.length;
  if(n === 1) return a[0][0];
  if(n === 2) return a[0][0]*a[1][1] - a[0][1]*a[1][0];
  let s = 0;
  for(let j = 0; j < n; j++) if(a[0][j] !== 0) s += (j % 2 ? -1 : 1) * a[0][j] * mxDet(mxMinor(a, 0, j));
  return s;
}
function mxAdj(a){
  const n = a.length;
  if(n === 1) return [[1]];
  return Array.from({length:n}, (_, i) => Array.from({length:n}, (_, j) => ((i + j) % 2 ? -1 : 1) * mxDet(mxMinor(a, j, i))));
}
function mxInv(a, nm){
  mxSq(a, nm);
  const d = mxDet(a);
  if(mxZero(d)) throw new Error("det" + (nm ? "(" + nm + ")" : "") + " = 0 จึงไม่มีอินเวอร์ส");
  return mxAdj(a).map(r => r.map(x => x / d));
}
const mxMul = (a, b) => {
  if(a[0].length !== b.length) throw new Error("คูณกันไม่ได้ — จำนวนหลักของตัวหน้า (" + a[0].length + ") ต้องเท่ากับจำนวนแถวของตัวหลัง (" + b.length + ")");
  return a.map(r => b[0].map((_, j) => r.reduce((s, x, k) => s + x * b[k][j], 0)));
};

/* ---------- แปลงข้อความนิพจน์ ---------- */
/* ค่า: {s:ตัวเลข} หรือ {m:เมทริกซ์, n:ชื่อ(ถ้ามี)} */
function mxEval(src){
  const toks = [];
  const s = String(src).replace(/−|–/g, "-").replace(/×|·|∙/g, "*").replace(/\s+/g, "");
  const supT = { "ᵀ":"T", "ᵗ":"T" };
  for(let i = 0; i < s.length;){
    const ch = s[i];
    let m;
    if((m = /^\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?/.exec(s.slice(i)))){ const p = m[0].split("/"); toks.push({ t:"num", v: p.length > 1 ? (+p[0]) / (+p[1]) : +p[0] }); i += m[0].length; }
    else if(/^det/i.test(s.slice(i))){ toks.push({ t:"det" }); i += 3; }
    else if(MX_NAMES.includes(ch.toUpperCase()) && !(ch === "T" )){ toks.push({ t:"mat", v: ch.toUpperCase() }); i++; }
    else if(supT[ch]){ toks.push({ t:"tr" }); i++; }
    else if(ch === "'" || ch === "′" || ch === "’"){ toks.push({ t:"tr" }); i++; }
    else if(ch === "T" || ch === "t"){ toks.push({ t:"Tl" }); i++; }
    else if("+-*^()".includes(ch)){ toks.push({ t:ch }); i++; }
    else if(ch === "⁻" && s[i+1] === "¹"){ toks.push({ t:"inv" }); i += 2; }
    else throw new Error('ไม่รู้จักสัญลักษณ์ "' + ch + '"');
  }
  if(!toks.length) throw new Error("");
  let p = 0;
  const pk = () => toks[p] && toks[p].t;
  const add = (x, y, sg) => {
    if(x.s !== undefined && y.s !== undefined) return { s: x.s + sg * y.s };
    if(x.m && y.m){
      if(x.m.length !== y.m.length || x.m[0].length !== y.m[0].length) throw new Error("บวก/ลบกันไม่ได้ — ขนาดต่างกัน (" + mxDims(x.m) + " กับ " + mxDims(y.m) + ")");
      return { m: x.m.map((r, i) => r.map((v, j) => v + sg * y.m[i][j])) };
    }
    throw new Error("บวก/ลบเมทริกซ์กับตัวเลขเดี่ยวๆ ไม่ได้");
  };
  const mul = (x, y) => {
    if(x.s !== undefined && y.s !== undefined) return { s: x.s * y.s };
    if(x.s !== undefined) return { m: y.m.map(r => r.map(v => v * x.s)) };
    if(y.s !== undefined) return { m: x.m.map(r => r.map(v => v * y.s)) };
    return { m: mxMul(x.m, y.m) };
  };
  const needM = (x, w) => { if(!x.m) throw new Error(w + " ใช้กับเมทริกซ์เท่านั้น"); return x.m; };
  function expr(){
    let v = term();
    while(pk() === "+" || pk() === "-"){ const sg = toks[p++].t === "+" ? 1 : -1; v = add(v, term(), sg); }
    return v;
  }
  function term(){
    let v = unary();
    for(;;){
      const k = pk();
      if(k === "*"){ p++; v = mul(v, unary()); }
      else if(k === "num" || k === "mat" || k === "(" || k === "det"){ v = mul(v, unary()); }
      else break;
    }
    return v;
  }
  function unary(){
    if(pk() === "-"){ p++; return mul({ s:-1 }, unary()); }
    if(pk() === "+"){ p++; return unary(); }
    return power();
  }
  function power(){
    let v = atom();
    for(;;){
      const k = pk();
      if(k === "tr"){ p++; v = { m: mxT(needM(v, "ทรานสโพส")) }; }
      else if(k === "inv"){ p++; v = { m: mxInv(needM(v, "อินเวอร์ส")) }; }
      else if(k === "^"){
        p++;
        const q = pk();
        if(q === "Tl"){ p++; v = { m: mxT(needM(v, "ทรานสโพส")) }; }
        else {
          let sg = 1;
          if(q === "-"){ p++; sg = -1; }
          if(pk() !== "num") throw new Error("หลังเครื่องหมาย ^ ต้องเป็น T หรือจำนวนเต็ม");
          const e = toks[p++].v;
          if(!Number.isInteger(e)) throw new Error("เลขชี้กำลังต้องเป็นจำนวนเต็ม");
          if(v.s !== undefined){ v = { s: Math.pow(v.s, sg * e) }; }
          else {
            let a = v.m; mxSq(a);
            if(sg < 0) a = mxInv(a);
            if(e === 0) v = { m: a.map((r, i) => r.map((_, j) => i === j ? 1 : 0)) };
            else { let r = a; for(let i = 1; i < e; i++) r = mxMul(r, a); v = { m: r }; }
          }
        }
      }
      else break;
    }
    return v;
  }
  function atom(){
    const k = toks[p];
    if(!k) throw new Error("นิพจน์ไม่ครบ");
    if(k.t === "num"){ p++; return { s: k.v }; }
    if(k.t === "mat"){
      p++;
      const m = mxGet(k.v);
      if(!m) throw new Error("ยังไม่มีเมทริกซ์ " + k.v);
      return { m: mxVal(m) };
    }
    if(k.t === "det"){
      p++;
      if(pk() !== "(") throw new Error("det ต้องตามด้วยวงเล็บ เช่น det(A)");
      p++; const v = expr();
      if(pk() !== ")") throw new Error("วงเล็บไม่ครบ");
      p++;
      const a = needM(v, "det"); mxSq(a, "det");
      return { s: mxDet(a) };
    }
    if(k.t === "("){
      p++; const v = expr();
      if(pk() !== ")") throw new Error("วงเล็บไม่ครบ");
      p++; return v;
    }
    throw new Error("รูปแบบนิพจน์ไม่ถูกต้อง");
  }
  const v = expr();
  if(p < toks.length) throw new Error("นิพจน์ไม่ถูกต้อง");
  return v;
}

/* ---------- แสดงผล ---------- */
function mxHtml(a){
  return '<div class="mx-m" style="grid-template-columns:repeat(' + a[0].length + ',auto);">' + a.map(r => r.map(x => "<span>" + gmF(x) + "</span>").join("")).join("") + "</div>";
}
function mxShowMat(label, a, extra){
  MX.out.innerHTML = '<div class="tl-res"><div class="ex">' + label + '</div><div class="mx-show">' + mxHtml(a) + "</div>" +
    '<div class="n">ขนาด ' + mxDims(a) + "</div></div>" + (extra || "");
}
function mxShowScalar(label, x, extra){
  MX.out.innerHTML = '<div class="tl-res"><div class="ex">' + label + '</div><div class="mx-sc">' + gmF(x) + "</div>" +
    (gmFrac(x) || Number.isInteger(x) ? "" : "") + "</div>" + (extra || "");
}
function mxRun(op){
  MX.err.textContent = "";
  try{
    const n = MX.sel, a = mxVal(mxGet(n));
    if(op === "t"){
      mxShowMat(n + "ᵀ  (สลับแถวเป็นหลัก)", mxT(a));
    } else if(op === "det"){
      mxSq(a, "เมทริกซ์ " + n);
      mxShowScalar("det(" + n + ")", mxDet(a));
    } else {
      mxSq(a, "เมทริกซ์ " + n);
      const d = mxDet(a);
      if(mxZero(d)) throw new Error("det(" + n + ") = 0 จึงไม่มีอินเวอร์ส (" + n + " เป็นเมทริกซ์เอกฐาน)");
      const adj = mxAdj(a);
      const inv = adj.map(r => r.map(x => x / d));
      mxShowMat(n + "⁻¹", inv,
        '<div class="gm-box gm-st"><b>วิธีทำ</b><div>det(' + n + ") = " + gmF(d) + "</div><div>" + n + "⁻¹ = (1/" + gmP(d) + ") × adj(" + n + ")</div>" +
        '<div class="mx-eq"><span class="mx-pre">adj(' + n + ") =</span>" + mxHtml(adj) + "</div></div>");
    }
  } catch(e){ MX.err.textContent = e.message; MX.out.innerHTML = ""; }
}
function mxCalc(){
  MX.err.textContent = "";
  const src = $("#mxExIn", MX.view).value;
  if(!src.trim()){ MX.err.textContent = "พิมพ์นิพจน์ก่อน เช่น 2A+B"; MX.out.innerHTML = ""; return; }
  try{
    const r = mxEval(src);
    const lab = escH(src.trim());
    if(r.s !== undefined) mxShowScalar(lab + " =", r.s);
    else mxShowMat(lab + " =", r.m);
  } catch(e){ MX.err.textContent = e.message; MX.out.innerHTML = ""; }
}

registerTool({
  id:"matrix", icon:"🔢", color:"c-purple", title:"เมทริกซ์", desc:"ตั้งขนาด A B C … หา Aᵀ det(A) A⁻¹ และ A+B, 2A−B, AB",
  html:
    '<div id="mxMats"></div>' +
    '<button type="button" class="mx-add" id="mxAdd">＋ เพิ่มเมทริกซ์</button>' +
    '<h3 class="tl-h">หาค่าของเมทริกซ์เดี่ยว</h3>' +
    '<div class="card"><div class="mx-sel" id="mxSel"></div><div class="mx-ops" id="mxOps"></div></div>' +
    '<div id="mxExCard" style="display:none;"><h3 class="tl-h">คำนวณหลายเมทริกซ์</h3>' +
    '<div class="card"><div class="mx-ex" id="mxEx"></div>' +
    '<div class="mx-exin"><input id="mxExIn" placeholder="เช่น 2A+B หรือ AB" autocomplete="off" spellcheck="false" aria-label="นิพจน์เมทริกซ์"><button type="button" class="btn btn-primary" id="mxGo">คำนวณ</button></div>' +
    '<p class="tl-lg-note" style="margin-top:10px;">ใช้ + − × (หรือเขียนติดกัน เช่น 2A, AB) · วงเล็บได้ · Aᵀ พิมพ์ A^T · A⁻¹ พิมพ์ A^-1 · A² พิมพ์ A^2 · det(A+B)</p></div></div>' +
    '<div class="tl-err" id="mxErr"></div><div class="mx-out" id="mxOut"></div>' +
    '<p class="tl-lg-note" style="margin-top:14px;">ช่องตัวเลขพิมพ์ได้เช่น 1/2 · √3 · 2^3 · (1+2)/3 — ผลลัพธ์แสดงเป็นเศษส่วนเมื่อทำได้</p>',
  init(v){
    MX.view = v; MX.out = $("#mxOut", v); MX.err = $("#mxErr", v);
    MX.mats = [mxMake("A", 2, 2, (i, j) => String(i*2 + j + 1))];
    MX.sel = "A";
    mxDrawMats();
    v.addEventListener("input", e => {
      const t = e.target;
      if(t.matches(".mx-grid input")){ const m = mxGet(t.dataset.m); if(m) m.v[+t.dataset.i][+t.dataset.j] = t.value; }
    });
    v.addEventListener("keydown", e => {
      if(e.key === "Enter" && e.target.id === "mxExIn"){ e.preventDefault(); mxCalc(); }
    });
    v.addEventListener("change", e => {
      const t = e.target;
      if(t.dataset && t.dataset.sz){
        const m = mxGet(t.dataset.m), k = +t.value;
        if(t.dataset.sz === "r"){ while(m.v.length < k) m.v.push(Array(m.c).fill("0")); m.v.length = k; m.r = k; }
        else { m.v.forEach(r => { while(r.length < k) r.push("0"); r.length = k; }); m.c = k; }
        mxDrawMats(); MX.out.innerHTML = ""; MX.err.textContent = "";
      } else if(t.id === "mxSelS"){ MX.sel = t.value; mxDrawOps(); }
    });
    v.addEventListener("click", e => {
      const b = e.target.closest("button"); if(!b) return;
      if(b.id === "mxAdd"){
        if(MX.mats.length >= MX_MAX) return;
        const nm = MX_NAMES[nextFree()], last = MX.mats[MX.mats.length - 1];
        MX.mats.push(mxMake(nm, last.r, last.c));
        MX.mats.sort((x, y) => x.name.localeCompare(y.name));
        mxDrawMats();
      } else if(b.dataset.del){
        MX.mats = MX.mats.filter(m => m.name !== b.dataset.del);
        mxDrawMats(); MX.out.innerHTML = ""; MX.err.textContent = "";
      } else if(b.dataset.op){ mxRun(b.dataset.op); }
      else if(b.dataset.ex){ $("#mxExIn", v).value = b.dataset.ex; mxCalc(); }
      else if(b.id === "mxGo"){ mxCalc(); }
    });
  }
});

/* =====================================================================
   เครื่องมือ: จับกลุ่มนักเรียน (ตัวการ์ตูนสุ่มให้แต่ละคน — รูป image/student_01..20.png)
   ===================================================================== */
const GRP_AV = 20, GRP_DIR = "image/student_";
const grpSrc = n => GRP_DIR + String(n).padStart(2,"0") + ".png";
const GR = { room:"", pool:[], av:{}, groups:[], mode:"count", busy:false };
const grp = {};
const grpShuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=rndInt(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const grpKey = s => stuNo(s) + "|" + stuName(s);
const grpStoreKey = room => "kcGrpAv:" + room;
function grpLoadAv(room){
  let m = {};
  try{ m = JSON.parse(localStorage.getItem(grpStoreKey(room)) || "{}") || {}; }catch(e){ m = {}; }
  return m;
}
function grpSaveAv(){ try{ localStorage.setItem(grpStoreKey(GR.room), JSON.stringify(GR.av)); }catch(e){} }
/* สุ่มตัวละคร: ไม่ซ้ำกันจนกว่าจะครบ 20 แล้วค่อยวนใหม่ */
function grpAssign(force){
  const need = GR.pool.filter(s => force || !GR.av[grpKey(s)]);
  if(force) GR.av = {};
  let bag = [];
  const used = {}; Object.values(GR.av).forEach(n => used[n] = (used[n]||0)+1);
  need.forEach(s => {
    if(!bag.length){
      const min = Math.min(...Array.from({length:GRP_AV},(_,i)=>used[i+1]||0));
      bag = grpShuffle(Array.from({length:GRP_AV},(_,i)=>i+1).filter(n=>(used[n]||0)===min));
    }
    const n = bag.pop(); GR.av[grpKey(s)] = n; used[n] = (used[n]||0)+1;
  });
  grpSaveAv();
}
function grpLoadRoom(room){
  GR.room = room; GR.groups = [];
  GR.pool = room && typeof studentsOfRoom==="function" ? studentsOfRoom(room).filter(s=>stuName(s)) : [];
  GR.av = room ? grpLoadAv(room) : {};
  if(room) grpAssign(false);
  grp.out.innerHTML = ""; grp.tools.style.display = "none";
  grpInfo();
  if(room && !GR.pool.length) say("ห้องนี้ยังไม่มีรายชื่อนักเรียน");
}
function grpInfo(){
  const n = GR.pool.length, k = Number(grp.num.value) || 0;
  let t = "";
  if(n){
    const g = GR.mode==="count" ? Math.min(Math.max(k,1), n) : Math.ceil(n / Math.max(k,1));
    const base = Math.floor(n/g), ext = n % g;
    t = `${n} คน → ${g} กลุ่ม · ` + (ext ? `กลุ่มละ ${base}–${base+1} คน` : `กลุ่มละ ${base} คน`);
  }
  grp.info.textContent = t;
  grp.numLab.textContent = GR.mode==="count" ? "จำนวนกลุ่ม" : "จำนวนคนต่อกลุ่ม";
}
function grpSplit(){
  const n = GR.pool.length, k = Math.max(1, Math.floor(Number(grp.num.value) || 1));
  const g = GR.mode==="count" ? Math.min(k, n) : Math.ceil(n / Math.min(k, n));
  const list = grpShuffle(GR.pool), out = Array.from({length:g}, ()=>[]);
  /* แบ่งเท่าๆ กัน: แจกทีละคนวนไปทุกกลุ่ม → ต่างกันไม่เกิน 1 คน */
  list.forEach((s,i)=> out[i % g].push(s));
  return out;
}
function grpCard(members, gi){
  const mem = members.map(s => {
    const a = GR.av[grpKey(s)] || 1;
    return `<div class="gp-m"><img src="${grpSrc(a)}" alt="" loading="lazy" draggable="false"><span class="no">${escH(stuNo(s))}</span><span class="nm">${escH(stuName(s))}</span></div>`;
  }).join("");
  return `<div class="gp-card gp-c${gi % 8}" style="--d:${gi*90}ms"><div class="gp-h"><b>กลุ่ม ${gi+1}</b><small>${members.length} คน</small></div><div class="gp-ms">${mem}</div></div>`;
}
function grpRender(){
  grp.out.innerHTML = GR.groups.map(grpCard).join("");
  grp.tools.style.display = GR.groups.length ? "" : "none";
}
async function grpRun(){
  if(GR.busy) return;
  if(!GR.pool.length){ say("เลือกห้องที่มีรายชื่อนักเรียนก่อนนะครับ"); return; }
  GR.busy = true; grp.go.disabled = true;
  /* เขย่าเล็กน้อยก่อนเฉลย */
  if(!reduceMotion){
    for(let i=0;i<7;i++){
      const tmp = grpShuffle(GR.pool).slice(0, Math.min(GR.pool.length, 12));
      grp.out.innerHTML = `<div class="gp-shake">${tmp.map(s=>`<img src="${grpSrc(GR.av[grpKey(s)]||1)}" alt="">`).join("")}</div>`;
      await wait(130);
    }
  }
  GR.groups = grpSplit();
  grpRender();
  grp.out.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block:"start" });
  GR.busy = false; grp.go.disabled = false;
}
function grpCopy(){
  const t = GR.groups.map((g,i)=> `กลุ่ม ${i+1}\n` + g.map(s=>`  ${stuNo(s)}. ${stuName(s)}`).join("\n")).join("\n\n");
  const done = () => say("คัดลอกรายชื่อกลุ่มแล้ว");
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, ()=>say("คัดลอกไม่สำเร็จ"));
  else { const ta=document.createElement("textarea"); ta.value=t; document.body.appendChild(ta); ta.select(); try{ document.execCommand("copy"); done(); }catch(e){ say("คัดลอกไม่สำเร็จ"); } ta.remove(); }
}

registerTool({
  id:"groups", icon:"👥", color:"c-rose", title:"จับกลุ่ม", desc:"สุ่มแบ่งกลุ่มนักเรียน พร้อมตัวการ์ตูนประจำตัว",
  html:`
    <div class="card">
      <div class="field"><label>ห้อง / ชั้นปี</label><select id="gpRoom"></select></div>
      <div class="gp-modes">
        <button type="button" class="tl-chip on" data-m="count">แบ่งตามจำนวนกลุ่ม</button>
        <button type="button" class="tl-chip" data-m="size">แบ่งตามจำนวนคนต่อกลุ่ม</button>
      </div>
      <div class="field" style="margin-top:12px;"><label id="gpNumLab">จำนวนกลุ่ม</label>
        <div class="gp-step"><button type="button" id="gpMinus" aria-label="ลด">−</button><input type="number" id="gpNum" inputmode="numeric" min="1" max="60" value="4"><button type="button" id="gpPlus" aria-label="เพิ่ม">+</button></div>
      </div>
      <div class="tl-sub" id="gpInfo" style="min-height:18px;"></div>
    </div>
    <button type="button" id="gpGo" class="btn btn-primary">👥 จับกลุ่มเลย!</button>
    <div class="gp-tools" id="gpTools" style="display:none;">
      <button type="button" id="gpRe" class="btn btn-outline btn-sm">🔀 จับใหม่</button>
      <button type="button" id="gpAv" class="btn btn-outline btn-sm">🎭 สุ่มตัวการ์ตูนใหม่</button>
      <button type="button" id="gpCopy" class="btn btn-outline btn-sm">📋 คัดลอก</button>
    </div>
    <div class="gp-out" id="gpOut"></div>`,
  init(v){
    grp.room = $("#gpRoom", v); grp.num = $("#gpNum", v); grp.info = $("#gpInfo", v); grp.numLab = $("#gpNumLab", v);
    grp.go = $("#gpGo", v); grp.out = $("#gpOut", v); grp.tools = $("#gpTools", v);
    grp.room.addEventListener("change", ()=>{ if(!GR.busy) grpLoadRoom(grp.room.value); else grp.room.value = GR.room; });
    v.querySelectorAll(".gp-modes .tl-chip").forEach(b => b.addEventListener("click", ()=>{
      v.querySelectorAll(".gp-modes .tl-chip").forEach(x => x.classList.toggle("on", x===b));
      GR.mode = b.dataset.m; grp.num.value = GR.mode==="count" ? 4 : 5; grpInfo();
    }));
    const bump = d => { grp.num.value = Math.min(60, Math.max(1, (Number(grp.num.value)||1) + d)); grpInfo(); };
    $("#gpMinus", v).addEventListener("click", ()=>bump(-1));
    $("#gpPlus", v).addEventListener("click", ()=>bump(1));
    grp.num.addEventListener("input", grpInfo);
    grp.go.addEventListener("click", grpRun);
    $("#gpRe", v).addEventListener("click", grpRun);
    $("#gpAv", v).addEventListener("click", ()=>{ if(GR.busy) return; grpAssign(true); if(GR.groups.length) grpRender(); say("สุ่มตัวการ์ตูนใหม่แล้ว"); });
    $("#gpCopy", v).addEventListener("click", grpCopy);
  },
  onOpen(){
    const rooms = typeof uniqueRooms==="function" ? uniqueRooms() : [];
    const keep = grp.room.value;
    grp.room.innerHTML = `<option value="">เลือกห้อง/ชั้นปี</option>` + rooms.map(r=>`<option value="${escH(r)}">${escH(r)}</option>`).join("");
    if(rooms.includes(keep)) grp.room.value = keep;
    if(grp.room.value !== GR.room) grpLoadRoom(grp.room.value); else grpInfo();
  }
});

/* =====================================================================
   เครื่องมือ: แผนการสอน — เลือกระดับชั้น แล้วเลือกตัวชี้วัด
   ข้อมูล: ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้คณิตศาสตร์ (ฉบับปรับปรุง พ.ศ. ๒๕๖๐)
   k = core (ตัวชี้วัดแกนกลาง) / extra (ผลการเรียนรู้เพิ่มเติม ม.๔-๖) · c = รหัสมาตรฐาน · s = สาระ · d = ข้อความมาตรฐาน
   g[ชั้น] = { i:[ตัวชี้วัดข้อ ๑,๒,๓...], n:หมายเหตุ }
   ===================================================================== */
const PLAN_DATA = [{"k":"core","c":"ค ๑.๑","s":"จำนวนและพีชคณิต","d":"เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน ผลที่เกิดขึ้นจากการดำเนินการ สมบัติของการดำเนินการ และนำไปใช้","g":{"ป.๑":{"i":["บอกจำนวนของสิ่งต่าง ๆ แสดงสิ่งต่าง ๆ ตามจำนวนที่กำหนด อ่านและเขียนตัวเลขฮินดูอารบิก ตัวเลขไทย แสดงจำนวนนับไม่เกิน ๑๐๐ และ ๐","เปรียบเทียบจำนวนนับไม่เกิน ๑๐๐ และ ๐ โดยใช้เครื่องหมาย = ≠ > <","เรียงลำดับจำนวนนับไม่เกิน ๑๐๐ และ ๐ ตั้งแต่ ๓ ถึง ๕ จำนวน","หาค่าของตัวไม่ทราบค่าในประโยคสัญลักษณ์แสดงการบวกและประโยคสัญลักษณ์แสดงการลบของจำนวนนับไม่เกิน ๑๐๐ และ ๐","แสดงวิธีหาคำตอบของโจทย์ปัญหาการบวกและโจทย์ปัญหาการลบของจำนวนนับไม่เกิน ๑๐๐ และ ๐"]},"ป.๒":{"i":["บอกจำนวนของสิ่งต่าง ๆ แสดงสิ่งต่าง ๆ ตามจำนวนที่กำหนด อ่านและเขียนตัวเลขฮินดูอารบิก ตัวเลขไทย ตัวหนังสือแสดงจำนวนนับไม่เกิน ๑,๐๐๐ และ ๐","เปรียบเทียบจำนวนนับไม่เกิน ๑,๐๐๐ และ ๐ โดยใช้เครื่องหมาย = ≠ > <","เรียงลำดับจำนวนนับไม่เกิน ๑,๐๐๐ และ ๐ ตั้งแต่ ๓ ถึง ๕ จำนวนจากสถานการณ์ต่าง ๆ","หาค่าของตัวไม่ทราบค่าในประโยคสัญลักษณ์แสดงการบวกและประโยคสัญลักษณ์แสดงการลบของจำนวนนับไม่เกิน ๑,๐๐๐ และ ๐","หาค่าของตัวไม่ทราบค่าในประโยคสัญลักษณ์แสดงการคูณของจำนวน ๑ หลักกับจำนวนไม่เกิน ๒ หลัก","หาค่าของตัวไม่ทราบค่าในประโยคสัญลักษณ์แสดงการหารที่ตัวตั้งไม่เกิน ๒ หลัก ตัวหาร ๑ หลัก โดยที่ผลหารมี ๑ หลักทั้งหารลงตัวและหารไม่ลงตัว","หาผลลัพธ์การบวก ลบ คูณ หารระคนของจำนวนนับไม่เกิน ๑,๐๐๐ และ ๐","แสดงวิธีหาคำตอบของโจทย์ปัญหา ๒ ขั้นตอนของจำนวนนับไม่เกิน ๑,๐๐๐ และ ๐"]},"ป.๓":{"i":["อ่านและเขียนตัวเลขฮินดูอารบิก ตัวเลขไทย และตัวหนังสือแสดงจำนวนนับไม่เกิน ๑๐๐,๐๐๐ และ ๐","เปรียบเทียบและเรียงลำดับจำนวนนับไม่เกิน ๑๐๐,๐๐๐ จากสถานการณ์ต่าง ๆ","บอก อ่าน และเขียนเศษส่วนแสดงปริมาณสิ่งต่าง ๆ และแสดงสิ่งต่าง ๆ ตามเศษส่วนที่กำหนด","เปรียบเทียบเศษส่วนที่ตัวเศษเท่ากัน โดยที่ตัวเศษน้อยกว่าหรือเท่ากับตัวส่วน","หาค่าของตัวไม่ทราบค่าในประโยคสัญลักษณ์แสดงการบวกและประโยคสัญลักษณ์แสดงการลบของจำนวนนับไม่เกิน ๑๐๐,๐๐๐ และ ๐","หาค่าของตัวไม่ทราบค่าในประโยคสัญลักษณ์แสดงการคูณของจำนวน ๑ หลักกับจำนวนไม่เกิน ๔ หลัก และจำนวน ๒ หลักกับจำนวน ๒ หลัก","หาค่าของตัวไม่ทราบค่าในประโยคสัญลักษณ์แสดงการหารที่ตัวตั้งไม่เกิน ๔ หลัก ตัวหาร ๑ หลัก","หาผลลัพธ์การบวก ลบ คูณ หารระคนของจำนวนนับไม่เกิน ๑๐๐,๐๐๐ และ ๐","แสดงวิธีหาคำตอบของโจทย์ปัญหา ๒ ขั้นตอนของจำนวนนับไม่เกิน ๑๐๐,๐๐๐ และ ๐","หาผลบวกของเศษส่วนที่มีตัวส่วนเท่ากันและผลบวกไม่เกิน ๑ และหาผลลบของเศษส่วนที่มีตัวส่วนเท่ากัน","แสดงวิธีหาคำตอบของโจทย์ปัญหาการบวกเศษส่วนที่มีตัวส่วนเท่ากันและผลบวกไม่เกิน ๑ และโจทย์ปัญหาการลบเศษส่วนที่มีตัวส่วนเท่ากัน"]},"ป.๔":{"i":["อ่านและเขียนตัวเลขฮินดูอารบิก ตัวเลขไทย และตัวหนังสือแสดงจำนวนนับที่มากกว่า ๑๐๐,๐๐๐ และ ๐","เปรียบเทียบและเรียงลำดับจำนวนนับที่มากกว่า ๑๐๐,๐๐๐ จากสถานการณ์ต่าง ๆ","บอก อ่าน และเขียนเศษส่วนและจำนวนคละ แสดงปริมาณสิ่งต่าง ๆ และแสดงสิ่งต่าง ๆ ตามเศษส่วนและจำนวนคละที่กำหนด","เปรียบเทียบ เรียงลำดับเศษส่วนและจำนวนคละที่ตัวส่วนตัวหนึ่งเป็นพหุคูณของอีกตัวหนึ่ง","อ่านและเขียนทศนิยมไม่เกิน ๓ ตำแหน่ง แสดงปริมาณของสิ่งต่าง ๆ และแสดงสิ่งต่าง ๆ ตามทศนิยมที่กำหนด","เปรียบเทียบและเรียงลำดับทศนิยมไม่เกิน ๓ ตำแหน่งจากสถานการณ์ต่าง ๆ","ประมาณผลลัพธ์ของการบวก การลบ การคูณ การหาร จากสถานการณ์ต่าง ๆ อย่างสมเหตุสมผล","หาค่าของตัวไม่ทราบค่าในประโยคสัญลักษณ์แสดงการบวกและประโยคสัญลักษณ์แสดงการลบของจำนวนนับที่มากกว่า ๑๐๐,๐๐๐ และ ๐","หาค่าของตัวไม่ทราบค่าในประโยคสัญลักษณ์แสดงการคูณของจำนวนหลายหลัก ๒ จำนวน ที่มีผลคูณไม่เกิน ๖ หลักและประโยคสัญลักษณ์แสดงการหารที่ตัวตั้งไม่เกิน ๖ หลัก ตัวหารไม่เกิน ๒ หลัก","หาผลลัพธ์การบวก ลบ คูณ หารระคนของจำนวนนับและ ๐","แสดงวิธีหาคำตอบของโจทย์ปัญหา ๒ ขั้นตอนของจำนวนนับที่มากกว่า ๑๐๐,๐๐๐ และ ๐","สร้างโจทย์ปัญหา ๒ ขั้นตอนของจำนวนนับและ ๐ พร้อมทั้งหาคำตอบ","หาผลบวก ผลลบของเศษส่วนและจำนวนคละที่ตัวส่วนตัวหนึ่งเป็นพหุคูณของอีกตัวหนึ่ง","แสดงวิธีหาคำตอบของโจทย์ปัญหาการบวกและโจทย์ปัญหาการลบเศษส่วนและจำนวนคละที่ตัวส่วนตัวหนึ่งเป็นพหุคูณของอีกตัวหนึ่ง","หาผลบวก ผลลบของทศนิยมไม่เกิน ๓ ตำแหน่ง","แสดงวิธีหาคำตอบของโจทย์ปัญหาการบวก การลบ ๒ ขั้นตอนของทศนิยมไม่เกิน ๓ ตำแหน่ง"]},"ป.๕":{"i":["เขียนเศษส่วนที่มีตัวส่วนเป็นตัวประกอบของ ๑๐ หรือ ๑๐๐ หรือ ๑,๐๐๐ ในรูปทศนิยม","แสดงวิธีหาคำตอบของโจทย์ปัญหาโดยใช้บัญญัติไตรยางศ์","หาผลบวก ผลลบของเศษส่วนและจำนวนคละ","หาผลคูณ ผลหารของเศษส่วนและจำนวนคละ","แสดงวิธีหาคำตอบของโจทย์ปัญหาการบวก การลบ การคูณ การหารเศษส่วน ๒ ขั้นตอน","หาผลคูณของทศนิยมที่ผลคูณเป็นทศนิยมไม่เกิน ๓ ตำแหน่ง","หาผลหารที่ตัวตั้งเป็นจำนวนนับหรือทศนิยมไม่เกิน ๓ ตำแหน่ง และตัวหารเป็นจำนวนนับ ผลหารเป็นทศนิยมไม่เกิน ๓ ตำแหน่ง","แสดงวิธีหาคำตอบของโจทย์ปัญหาการบวก การลบ การคูณ การหารทศนิยม ๒ ขั้นตอน","แสดงวิธีหาคำตอบของโจทย์ปัญหาร้อยละไม่เกิน ๒ ขั้นตอน"]},"ป.๖":{"i":["เปรียบเทียบ เรียงลำดับเศษส่วนและจำนวนคละ จากสถานการณ์ต่าง ๆ โดยใช้ความรู้เรื่อง ค.ร.น.","เขียนอัตราส่วนแสดงการเปรียบเทียบปริมาณ ๒ ปริมาณ จากข้อความหรือสถานการณ์ โดยที่ปริมาณแต่ละปริมาณเป็นจำนวนนับ","หาอัตราส่วนที่เท่ากับอัตราส่วนที่กำหนดให้","หา ห.ร.ม. ของจำนวนนับไม่เกิน ๓ จำนวน","หา ค.ร.น. ของจำนวนนับไม่เกิน ๓ จำนวน","แสดงวิธีหาคำตอบของโจทย์ปัญหาโดยใช้ความรู้เกี่ยวกับ ห.ร.ม. และ ค.ร.น.","หาผลลัพธ์ของการบวก ลบ คูณ หารระคนของเศษส่วนและจำนวนคละ โดยใช้ความรู้เรื่อง ค.ร.น.","แสดงวิธีหาคำตอบของโจทย์ปัญหาเศษส่วนและจำนวนคละ ๒ - ๓ ขั้นตอน","หาผลหารของทศนิยมที่ตัวหารและผลหารเป็นทศนิยมไม่เกิน ๓ ตำแหน่ง","แสดงวิธีหาคำตอบของโจทย์ปัญหาการบวก การลบ การคูณ การหารทศนิยม ๓ ขั้นตอน","แสดงวิธีหาคำตอบของโจทย์ปัญหาอัตราส่วน","แสดงวิธีหาคำตอบของโจทย์ปัญหาร้อยละ ๒ - ๓ ขั้นตอน"]},"ม.๑":{"i":["เข้าใจจำนวนตรรกยะและความสัมพันธ์ของจำนวนตรรกยะ และใช้สมบัติของจำนวนตรรกยะในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง","เข้าใจและใช้สมบัติของเลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนเต็มบวกในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง","เข้าใจและประยุกต์ใช้อัตราส่วน สัดส่วน และร้อยละ ในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง"]},"ม.๒":{"i":["เข้าใจและใช้สมบัติของเลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนเต็มในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง","เข้าใจจำนวนจริงและความสัมพันธ์ของจำนวนจริง และใช้สมบัติของจำนวนจริงในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง"]},"ม.๔":{"i":["เข้าใจและใช้ความรู้เกี่ยวกับเซตและตรรกศาสตร์เบื้องต้น ในการสื่อสารและสื่อความหมายทางคณิตศาสตร์"]},"ม.๕":{"i":["เข้าใจความหมายและใช้สมบัติเกี่ยวกับการบวก การคูณ การเท่ากัน และการไม่เท่ากันของจำนวนจริงในรูปกรณฑ์ และจำนวนจริงในรูปเลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนตรรกยะ"]}}},{"k":"core","c":"ค ๑.๒","s":"จำนวนและพีชคณิต","d":"เข้าใจและวิเคราะห์แบบรูป ความสัมพันธ์ ฟังก์ชัน ลำดับและอนุกรม และนำไปใช้","g":{"ป.๑":{"i":["ระบุจำนวนที่หายไปในแบบรูปของจำนวนที่เพิ่มขึ้นหรือลดลงทีละ ๑ และทีละ ๑๐ และระบุรูปที่หายไปในแบบรูปซ้ำของรูปเรขาคณิตและรูปอื่น ๆ ที่สมาชิกในแต่ละชุดที่ซ้ำมี ๒ รูป"]},"ป.๒":{"i":[],"n":"(มีการจัดการเรียนการสอนเพื่อเป็นพื้นฐาน แต่ไม่วัดผล)"},"ป.๓":{"i":["ระบุจำนวนที่หายไปในแบบรูปของจำนวนที่เพิ่มขึ้นหรือลดลงทีละเท่า ๆ กัน"]},"ป.๔":{"i":[],"n":"(มีการจัดการเรียนการสอนเพื่อเป็นพื้นฐาน แต่ไม่วัดผล)"},"ป.๖":{"i":["แสดงวิธีคิดและหาคำตอบของปัญหาเกี่ยวกับแบบรูป"]},"ม.๒":{"i":["เข้าใจหลักการการดำเนินการของพหุนาม และใช้พหุนามในการแก้ปัญหาคณิตศาสตร์","เข้าใจและใช้การแยกตัวประกอบของพหุนามดีกรีสองในการแก้ปัญหาคณิตศาสตร์"]},"ม.๓":{"i":["เข้าใจและใช้การแยกตัวประกอบของพหุนามที่มีดีกรีสูงกว่าสองในการแก้ปัญหาคณิตศาสตร์","เข้าใจและใช้ความรู้เกี่ยวกับฟังก์ชันกำลังสองในการแก้ปัญหาคณิตศาสตร์"]},"ม.๕":{"i":["ใช้ฟังก์ชันและกราฟของฟังก์ชันอธิบายสถานการณ์ที่กำหนด","เข้าใจและนำความรู้เกี่ยวกับลำดับและอนุกรมไปใช้"]}}},{"k":"core","c":"ค ๑.๓","s":"จำนวนและพีชคณิต","d":"ใช้นิพจน์ สมการ และอสมการ อธิบายความสัมพันธ์หรือช่วยแก้ปัญหาที่กำหนดให้","g":{"ม.๑":{"i":["เข้าใจและใช้สมบัติของการเท่ากันและสมบัติของจำนวน เพื่อวิเคราะห์และแก้ปัญหาโดยใช้สมการเชิงเส้นตัวแปรเดียว","เข้าใจและใช้ความรู้เกี่ยวกับกราฟในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง","เข้าใจและใช้ความรู้เกี่ยวกับความสัมพันธ์เชิงเส้นในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง"]},"ม.๓":{"i":["เข้าใจและใช้สมบัติของการไม่เท่ากัน เพื่อวิเคราะห์และแก้ปัญหาโดยใช้อสมการเชิงเส้นตัวแปรเดียว","ประยุกต์ใช้สมการกำลังสองตัวแปรเดียวในการแก้ปัญหาคณิตศาสตร์","ประยุกต์ใช้ระบบสมการเชิงเส้นสองตัวแปรในการแก้ปัญหาคณิตศาสตร์"]},"ม.๕":{"i":["เข้าใจและใช้ความรู้เกี่ยวกับดอกเบี้ยและมูลค่าของเงินในการแก้ปัญหา"]}}},{"k":"core","c":"ค ๒.๑","s":"การวัดและเรขาคณิต","d":"เข้าใจพื้นฐานเกี่ยวกับการวัด วัดและคาดคะเนขนาดของสิ่งที่ต้องการวัด และนำไปใช้","g":{"ป.๑":{"i":["วัดและเปรียบเทียบความยาวเป็นเซนติเมตร เป็นเมตร","วัดและเปรียบเทียบน้ำหนักเป็นกิโลกรัม เป็นขีด"]},"ป.๒":{"i":["แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับเวลาที่มีหน่วยเดี่ยวและเป็นหน่วยเดียวกัน","วัดและเปรียบเทียบความยาวเป็นเมตรและเซนติเมตร","แสดงวิธีหาคำตอบของโจทย์ปัญหาการบวก การลบเกี่ยวกับความยาวที่มีหน่วยเป็นเมตรและเซนติเมตร","วัดและเปรียบเทียบน้ำหนักเป็นกิโลกรัมและกรัม กิโลกรัมและขีด","แสดงวิธีหาคำตอบของโจทย์ปัญหาการบวก การลบเกี่ยวกับน้ำหนักที่มีหน่วยเป็นกิโลกรัมและกรัม กิโลกรัมและขีด","วัดและเปรียบเทียบปริมาตรและความจุเป็นลิตร"]},"ป.๓":{"i":["แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับเงิน","แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับเวลาและระยะเวลา","เลือกใช้เครื่องวัดความยาวที่เหมาะสม วัดและบอกความยาวของสิ่งต่าง ๆ เป็นเซนติเมตรและมิลลิเมตร เมตรและเซนติเมตร กิโลเมตรและเมตร","คาดคะเนความยาวเป็นเมตรและเป็นเซนติเมตร","เปรียบเทียบความยาวระหว่างเซนติเมตรกับมิลลิเมตร เมตรกับเซนติเมตร กิโลเมตรกับเมตร จากสถานการณ์ต่าง ๆ","แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับความยาวที่มีหน่วยเป็นเซนติเมตรและมิลลิเมตร เมตรและเซนติเมตร กิโลเมตรและเมตร","เลือกใช้เครื่องชั่งที่เหมาะสม วัดและบอกน้ำหนักเป็นกิโลกรัมและขีด กิโลกรัมและกรัม","คาดคะเนน้ำหนักเป็นกิโลกรัมและเป็นขีด","เปรียบเทียบน้ำหนักระหว่างกิโลกรัมกับกรัม เมตริกตันกับกิโลกรัม จากสถานการณ์ต่าง ๆ","แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับน้ำหนักที่มีหน่วยเป็นกิโลกรัมกับกรัม เมตริกตันกับกิโลกรัม","เลือกใช้เครื่องตวงที่เหมาะสม วัดและเปรียบเทียบปริมาตร ความจุเป็นลิตรและมิลลิลิตร","คาดคะเนปริมาตรและความจุเป็นลิตร","แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับปริมาตรและความจุที่มีหน่วยเป็นลิตรและมิลลิลิตร"]},"ป.๔":{"i":["แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับเวลา","วัดและสร้างมุม โดยใช้โพรแทรกเตอร์","แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับความยาวรอบรูปและพื้นที่ของรูปสี่เหลี่ยมมุมฉาก"]},"ป.๕":{"i":["แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับความยาวที่มีการเปลี่ยนหน่วยและเขียนในรูปทศนิยม","แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับน้ำหนักที่มีการเปลี่ยนหน่วยและเขียนในรูปทศนิยม","แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับปริมาตรของทรงสี่เหลี่ยมมุมฉากและความจุของภาชนะทรงสี่เหลี่ยมมุมฉาก","แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับความยาวรอบรูปของรูปสี่เหลี่ยมและพื้นที่ของรูปสี่เหลี่ยมด้านขนานและรูปสี่เหลี่ยมขนมเปียกปูน"]},"ป.๖":{"i":["แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับปริมาตรของรูปเรขาคณิตสามมิติที่ประกอบด้วยทรงสี่เหลี่ยมมุมฉาก","แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับความยาวรอบรูปและพื้นที่ของรูปหลายเหลี่ยม","แสดงวิธีหาคำตอบของโจทย์ปัญหาเกี่ยวกับความยาวรอบรูปและพื้นที่ของวงกลม"]},"ม.๒":{"i":["ประยุกต์ใช้ความรู้เรื่องพื้นที่ผิวของปริซึมและทรงกระบอกในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง","ประยุกต์ใช้ความรู้เรื่องปริมาตรของปริซึมและทรงกระบอกในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง"]},"ม.๓":{"i":["ประยุกต์ใช้ความรู้เรื่องพื้นที่ผิวของพีระมิด กรวย และทรงกลมในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง","ประยุกต์ใช้ความรู้เรื่องปริมาตรของพีระมิด กรวย และทรงกลมในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง"]}}},{"k":"core","c":"ค ๒.๒","s":"การวัดและเรขาคณิต","d":"เข้าใจและวิเคราะห์รูปเรขาคณิต สมบัติของรูปเรขาคณิต ความสัมพันธ์ระหว่างรูปเรขาคณิต และทฤษฎีบททางเรขาคณิต และนำไปใช้","g":{"ป.๑":{"i":["จำแนกรูปสามเหลี่ยม รูปสี่เหลี่ยม วงกลม วงรี ทรงสี่เหลี่ยมมุมฉาก ทรงกลม ทรงกระบอก และกรวย"]},"ป.๒":{"i":["จำแนกและบอกลักษณะของรูปหลายเหลี่ยมและวงกลม"]},"ป.๓":{"i":["ระบุรูปเรขาคณิตสองมิติที่มีแกนสมมาตรและจำนวนแกนสมมาตร"]},"ป.๔":{"i":["จำแนกชนิดของมุม บอกชื่อมุม ส่วนประกอบของมุมและเขียนสัญลักษณ์แสดงมุม","สร้างรูปสี่เหลี่ยมมุมฉากเมื่อกำหนดความยาวของด้าน"]},"ป.๕":{"i":["สร้างเส้นตรงหรือส่วนของเส้นตรงให้ขนานกับเส้นตรงหรือส่วนของเส้นตรงที่กำหนดให้","จำแนกรูปสี่เหลี่ยมโดยพิจารณาจากสมบัติของรูป","สร้างรูปสี่เหลี่ยมชนิดต่าง ๆ เมื่อกำหนดความยาวของด้านและขนาดของมุม หรือเมื่อกำหนดความยาวของเส้นทแยงมุม","บอกลักษณะของปริซึม"]},"ป.๖":{"i":["จำแนกรูปสามเหลี่ยมโดยพิจารณาจากสมบัติของรูป","สร้างรูปสามเหลี่ยมเมื่อกำหนดความยาวของด้านและขนาดของมุม","บอกลักษณะของรูปเรขาคณิตสามมิติชนิดต่าง ๆ","ระบุรูปเรขาคณิตสามมิติที่ประกอบจากรูปคลี่ และระบุรูปคลี่ของรูปเรขาคณิตสามมิติ"]},"ม.๑":{"i":["ใช้ความรู้ทางเรขาคณิตและเครื่องมือ เช่น วงเวียนและสันตรง รวมทั้งโปรแกรม The Geometer’s Sketchpad หรือโปรแกรมเรขาคณิตพลวัตอื่น ๆ เพื่อสร้างรูปเรขาคณิต ตลอดจนนำความรู้เกี่ยวกับการสร้างนี้ไปประยุกต์ใช้ในการแก้ปัญหา","เข้าใจและใช้ความรู้ทางเรขาคณิตในการวิเคราะห์หาความสัมพันธ์ระหว่างรูปเรขาคณิตสองมิติและรูปเรขาคณิตสามมิติ"]},"ม.๒":{"i":["ใช้ความรู้ทางเรขาคณิตและเครื่องมือ เช่น วงเวียนและสันตรง รวมทั้งโปรแกรม The Geometer’s Sketchpad หรือโปรแกรมเรขาคณิตพลวัตอื่น ๆ เพื่อสร้างรูปเรขาคณิต ตลอดจนนำความรู้เกี่ยวกับการสร้างนี้ไปประยุกต์ใช้ในการแก้ปัญหา","นำความรู้เกี่ยวกับสมบัติของเส้นขนานและรูปสามเหลี่ยมไปใช้ในการแก้ปัญหาคณิตศาสตร์","เข้าใจและใช้ความรู้เกี่ยวกับการแปลงทางเรขาคณิตในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง","เข้าใจและใช้สมบัติของรูปสามเหลี่ยมที่เท่ากันทุกประการในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง","เข้าใจและใช้ทฤษฎีบทพีทาโกรัสและบทกลับในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง"]},"ม.๓":{"i":["เข้าใจและใช้สมบัติของรูปสามเหลี่ยมที่คล้ายกันในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง","เข้าใจและใช้ความรู้เกี่ยวกับอัตราส่วนตรีโกณมิติในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง","เข้าใจและใช้ทฤษฎีบทเกี่ยวกับวงกลมในการแก้ปัญหาคณิตศาสตร์"]}}},{"k":"core","c":"ค ๓.๑","s":"สถิติและความน่าจะเป็น","d":"เข้าใจกระบวนการทางสถิติ และใช้ความรู้ทางสถิติในการแก้ปัญหา","g":{"ป.๑":{"i":["ใช้ข้อมูลจากแผนภูมิรูปภาพในการหาคำตอบของโจทย์ปัญหา เมื่อกำหนดรูป ๑ รูปแทน ๑ หน่วย"]},"ป.๒":{"i":["ใช้ข้อมูลจากแผนภูมิรูปภาพในการหาคำตอบของโจทย์ปัญหาเมื่อกำหนดรูป ๑ รูปแทน ๒ หน่วย ๕ หน่วย หรือ ๑๐ หน่วย"]},"ป.๓":{"i":["เขียนแผนภูมิรูปภาพ และใช้ข้อมูลจากแผนภูมิรูปภาพในการหาคำตอบของโจทย์ปัญหา","เขียนตารางทางเดียวจากข้อมูลที่เป็นจำนวนนับ และใช้ข้อมูลจากตารางทางเดียวในการหาคำตอบของโจทย์ปัญหา"]},"ป.๔":{"i":["ใช้ข้อมูลจากแผนภูมิแท่ง ตารางสองทาง ในการหาคำตอบของโจทย์ปัญหา"]},"ป.๕":{"i":["ใช้ข้อมูลจากกราฟเส้นในการหาคำตอบของโจทย์ปัญหา","เขียนแผนภูมิแท่งจากข้อมูลที่เป็นจำนวนนับ"]},"ป.๖":{"i":["ใช้ข้อมูลจากแผนภูมิรูปวงกลมในการหาคำตอบของโจทย์ปัญหา"]},"ม.๑":{"i":["เข้าใจและใช้ความรู้ทางสถิติในการนำเสนอข้อมูลและแปลความหมายข้อมูล รวมทั้งนำสถิติไปใช้ในชีวิตจริงโดยใช้เทคโนโลยีที่เหมาะสม"]},"ม.๒":{"i":["เข้าใจและใช้ความรู้ทางสถิติในการนำเสนอข้อมูลและวิเคราะห์ข้อมูลจากแผนภาพจุด แผนภาพต้น - ใบ ฮิสโทแกรม และค่ากลางของข้อมูล และแปลความหมายผลลัพธ์ รวมทั้งนำสถิติไปใช้ในชีวิตจริงโดยใช้เทคโนโลยีที่เหมาะสม"]},"ม.๓":{"i":["เข้าใจและใช้ความรู้ทางสถิติในการนำเสนอและวิเคราะห์ข้อมูลจากแผนภาพกล่อง และแปลความหมายผลลัพธ์รวมทั้งนำสถิติไปใช้ในชีวิตจริงโดยใช้เทคโนโลยีที่เหมาะสม"]},"ม.๖":{"i":["เข้าใจและใช้ความรู้ทางสถิติในการนำเสนอข้อมูลและแปลความหมายของค่าสถิติ เพื่อประกอบการตัดสินใจ"]}}},{"k":"core","c":"ค ๓.๒","s":"สถิติและความน่าจะเป็น","d":"เข้าใจหลักการนับเบื้องต้น ความน่าจะเป็น และนำไปใช้","g":{"ม.๓":{"i":["เข้าใจเกี่ยวกับการทดลองสุ่มและนำผลที่ได้ไปหาความน่าจะเป็นของเหตุการณ์"]},"ม.๔":{"i":["เข้าใจและใช้หลักการบวกและการคูณ การเรียงสับเปลี่ยน และการจัดหมู่ ในการแก้ปัญหา","หาความน่าจะเป็นและนำความรู้เกี่ยวกับความน่าจะเป็นไปใช้"]}}},{"k":"extra","c":"จำนวนและพีชคณิต ๑","s":"จำนวนและพีชคณิต","d":"เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน ผลที่เกิดขึ้นจากการดำเนินการ สมบัติของการดำเนินการ และนำไปใช้","g":{"ม.๔":{"i":["เข้าใจและใช้ความรู้เกี่ยวกับเซตในการสื่อสารและสื่อความหมายทางคณิตศาสตร์","เข้าใจและใช้ความรู้เกี่ยวกับตรรกศาสตร์เบื้องต้น ในการสื่อสาร สื่อความหมาย และอ้างเหตุผล","เข้าใจจำนวนจริงและใช้สมบัติของจำนวนจริงในการแก้ปัญหา"]},"ม.๕":{"i":["เข้าใจจำนวนเชิงซ้อนและใช้สมบัติของจำนวนเชิงซ้อนในการแก้ปัญหา","หารากที่ n ของจำนวนเชิงซ้อน เมื่อ n เป็นจำนวนนับที่มากกว่า ๑"]}}},{"k":"extra","c":"จำนวนและพีชคณิต ๒","s":"จำนวนและพีชคณิต","d":"เข้าใจและวิเคราะห์แบบรูป ความสัมพันธ์ ฟังก์ชัน ลำดับและอนุกรม และนำไปใช้","g":{"ม.๔":{"i":["หาผลลัพธ์ของการบวก การลบ การคูณ การหารฟังก์ชัน หาฟังก์ชันประกอบ และฟังก์ชันผกผัน","ใช้สมบัติของฟังก์ชันในการแก้ปัญหา","เข้าใจลักษณะกราฟของฟังก์ชันเอกซ์โพเนนเชียลและฟังก์ชันลอการิทึม และนำไปใช้ในการแก้ปัญหา"]},"ม.๕":{"i":["เข้าใจฟังก์ชันตรีโกณมิติและลักษณะกราฟของฟังก์ชันตรีโกณมิติ และนำไปใช้ในการแก้ปัญหา"]},"ม.๖":{"i":["ระบุได้ว่าลำดับที่กำหนดให้เป็นลำดับลู่เข้าหรือลู่ออก","หาผลบวก n พจน์แรกของอนุกรมเลขคณิตและอนุกรมเรขาคณิต","หาผลบวกอนุกรมอนันต์","เข้าใจและนำความรู้เกี่ยวกับลำดับและอนุกรมไปใช้"]}}},{"k":"extra","c":"จำนวนและพีชคณิต ๓","s":"จำนวนและพีชคณิต","d":"ใช้นิพจน์ สมการ อสมการ และเมทริกซ์ อธิบายความสัมพันธ์ หรือช่วยแก้ปัญหาที่กำหนดให้","g":{"ม.๔":{"i":["แก้สมการและอสมการพหุนามตัวแปรเดียว ดีกรีไม่เกินสี่ และนำไปใช้ในการแก้ปัญหา","แก้สมการและอสมการเศษส่วนของพหุนามตัวแปรเดียว และนำไปใช้ในการแก้ปัญหา","แก้สมการและอสมการค่าสัมบูรณ์ของพหุนามตัวแปรเดียว และนำไปใช้ในการแก้ปัญหา","แก้สมการเอกซ์โพเนนเชียลและสมการลอการิทึม และนำไปใช้ในการแก้ปัญหา"]},"ม.๕":{"i":["แก้สมการตรีโกณมิติ และนำไปใช้ในการแก้ปัญหา","ใช้กฎของโคไซน์และกฎของไซน์ในการแก้ปัญหา","เข้าใจความหมาย หาผลลัพธ์ของการบวกเมทริกซ์ การคูณเมทริกซ์กับจำนวนจริง การคูณระหว่างเมทริกซ์ และหาเมทริกซ์สลับเปลี่ยน หาดีเทอร์มิแนนต์ของเมทริกซ์ n x n เมื่อ n เป็นจำนวนนับที่ไม่เกินสาม","หาเมทริกซ์ผกผันของเมทริกซ์ ๒ x ๒","แก้ระบบสมการเชิงเส้นโดยใช้เมทริกซ์ผกผันและการดำเนินการตามแถว","แก้สมการพหุนามตัวแปรเดียว ดีกรีไม่เกินสี่ที่มีสัมประสิทธิ์เป็นจำนวนเต็ม และนำไปใช้ในการแก้ปัญหา"]}}},{"k":"extra","c":"การวัดและเรขาคณิต ๑","s":"การวัดและเรขาคณิต","d":"เข้าใจเรขาคณิตวิเคราะห์ และนำไปใช้","g":{"ม.๔":{"i":["เข้าใจและใช้ความรู้เกี่ยวกับเรขาคณิตวิเคราะห์ในการแก้ปัญหา"]}}},{"k":"extra","c":"การวัดและเรขาคณิต ๒","s":"การวัดและเรขาคณิต","d":"เข้าใจเวกเตอร์ การดำเนินการของเวกเตอร์ และนำไปใช้","g":{"ม.๕":{"i":["หาผลลัพธ์ของการบวก การลบเวกเตอร์ การคูณเวกเตอร์ด้วยสเกลาร์ หาผลคูณเชิงสเกลาร์ และผลคูณเชิงเวกเตอร์","นำความรู้เกี่ยวกับเวกเตอร์ในสามมิติไปใช้ในการแก้ปัญหา"]}}},{"k":"extra","c":"สถิติและความน่าจะเป็น ๑","s":"สถิติและความน่าจะเป็น","d":"เข้าใจหลักการนับเบื้องต้น ความน่าจะเป็น และนำไปใช้","g":{"ม.๕":{"i":["เข้าใจและใช้หลักการบวกและการคูณ การเรียงสับเปลี่ยน และการจัดหมู่ ในการแก้ปัญหา","หาความน่าจะเป็นและนำความรู้เกี่ยวกับความน่าจะเป็นไปใช้"]},"ม.๖":{"i":["หาความน่าจะเป็นของเหตุการณ์ที่เกิดจากตัวแปรสุ่มที่มีการแจกแจงเอกรูป การแจกแจงทวินาม และการแจกแจงปกติ และนำไปใช้ในการแก้ปัญหา"]}}},{"k":"extra","c":"แคลคูลัส ๑","s":"แคลคูลัส","d":"เข้าใจลิมิตและความต่อเนื่องของฟังก์ชัน อนุพันธ์ของฟังก์ชัน และปริพันธ์ของฟังก์ชัน และนำไปใช้","g":{"ม.๖":{"i":["ตรวจสอบความต่อเนื่องของฟังก์ชันที่กำหนดให้","หาอนุพันธ์ของฟังก์ชันพีชคณิตที่กำหนดให้ และนำไปใช้แก้ปัญหา","หาปริพันธ์ไม่จำกัดเขตและจำกัดเขตของฟังก์ชันพีชคณิตที่กำหนดให้ และนำไปใช้แก้ปัญหา"]}}}];
const PLAN_GROUPS = [
  { title:"ประถมศึกษา", grades:["ป.๑","ป.๒","ป.๓","ป.๔","ป.๕","ป.๖"] },
  { title:"มัธยมศึกษาตอนต้น", grades:["ม.๑","ม.๒","ม.๓"] },
  { title:"มัธยมศึกษาตอนปลาย", grades:["ม.๔","ม.๕","ม.๖"] }
];
const PL = { grade:"", sel:{}, secs:[] };      // sel[ชั้น] = Set(คีย์ตัวชี้วัด)
const pl = {};                                 // อ้างอิง element (ตั้งตอน init)
const plNum = n => String(n).replace(/\d/g, d => "๐๑๒๓๔๕๖๗๘๙"[d]);

/* รายการตัวชี้วัดของชั้นที่เลือก → [{ title, desc, extra, note, items:[{key,code,text}] }] */
function plBuild(grade){
  const secs = [], none = [];
  PLAN_DATA.forEach(s=>{
    const g = s.g[grade], extra = s.k === "extra";
    if(!g){ if(!extra) none.push(s.c); return; }
    secs.push({
      extra, note:g.n || "",
      title: extra ? `เพิ่มเติม · สาระ${s.c}` : `${s.c} · สาระ${s.s}`,
      desc: s.d,
      items: g.i.map((text,i)=>({ key:`${s.k}|${s.c}|${i}`, code: extra ? `${grade}/${plNum(i+1)}` : `${s.c} ${grade}/${plNum(i+1)}`, text }))
    });
  });
  return { secs, none };
}
const plSel = () => PL.sel[PL.grade] || (PL.sel[PL.grade] = new Set());
const plAllItems = () => PL.secs.flatMap(s=>s.items);

/* ---------- ป๊อปอัป (เลือกระดับชั้น / ตัวชี้วัด) ---------- */
const pm = { el:null, body:null, act:null, title:null, mode:"" };
function pmEnsure(){
  if(pm.el) return;
  const el = document.createElement("div");
  el.className = "pm-back"; el.id = "plModal";
  el.innerHTML = `<div class="pm-sheet" role="dialog" aria-modal="true"><div class="pm-head"><b id="pmTitle"></b><div class="pm-act" id="pmAct"></div></div><div class="pm-body" id="pmBody"></div></div>`;
  document.body.appendChild(el);
  pm.el = el; pm.title = $("#pmTitle", el); pm.act = $("#pmAct", el); pm.body = $("#pmBody", el);
  el.addEventListener("click", e=>{
    if(e.target === el || e.target.closest("#pmDone")){ pmClose(); return; }
    const chip = e.target.closest(".pl-chip");
    if(chip){ PL.grade = chip.dataset.g; plRender(); pmClose(); return; }
    const all = e.target.closest(".pl-all");
    if(all){
      const s = PL.secs[+all.dataset.sec], sel = plSel();
      const every = s.items.every(it=>sel.has(it.key));
      s.items.forEach(it=>plSetKey(it.key, !every)); plUpdate(); return;
    }
    if(e.target.closest("#plClear")){ plSel().clear(); pm.body.innerHTML = plIndHtml(); plUpdate(); }
  });
  el.addEventListener("change", e=>{
    const cb = e.target.closest("input[data-k]");
    if(cb){ plSetKey(cb.dataset.k, cb.checked); plUpdate(); }
  });
  document.addEventListener("keydown", e=>{ if(e.key === "Escape" && el.classList.contains("show")) pmClose(); });
}
function pmOpen(mode, title, act, html){
  pmEnsure();
  pm.mode = mode; pm.title.textContent = title; pm.act.innerHTML = act; pm.body.innerHTML = html; pm.body.scrollTop = 0;
  pm.el.classList.add("show"); document.documentElement.style.overflow = "hidden";
  plUpdate();
}
function pmClose(){
  if(!pm.el) return;
  pm.el.classList.remove("show"); pm.mode = ""; document.documentElement.style.overflow = "";
}
function plOpenGrade(){
  pmOpen("grade", "เลือกระดับชั้น", `<button type="button" id="pmDone">ปิด</button>`,
    PLAN_GROUPS.map(g=>`<div class="pl-gl">${g.title}</div><div class="pl-grades">${g.grades.map(x=>`<button type="button" class="pl-chip${x===PL.grade?" on":""}" data-g="${x}">${x}</button>`).join("")}</div>`).join(""));
}
function plOpenInd(){
  if(!PL.grade){ say("เลือกระดับชั้นก่อนนะครับ"); return; }
  pmOpen("ind", `ตัวชี้วัด · ${PL.grade}`, `<span id="plCount"></span><button type="button" id="plClear">ล้าง</button><button type="button" class="pm-done" id="pmDone">เสร็จสิ้น</button>`, plIndHtml());
}
function plIndHtml(){
  const sel = plSel(), g = PL.grade;
  let html = PL.secs.map((s,si)=>{
    const head = `<div class="pl-sh"><div><b>${escH(s.title)}</b><small>${escH(s.desc)}</small></div>`
      + (s.items.length ? `<button type="button" class="pl-all" data-sec="${si}">เลือกทั้งหมด</button>` : "") + `</div>`;
    const body = s.items.length
      ? s.items.map(it=>`<label class="pl-it${sel.has(it.key)?" on":""}"><input type="checkbox" data-k="${escH(it.key)}"${sel.has(it.key)?" checked":""}><span class="pl-box"></span><span class="pl-tx"><i>${escH(it.code)}</i>${escH(it.text)}</span></label>`).join("")
      : `<div class="tl-sub pl-none">ไม่มีตัวชี้วัดที่วัดผลในชั้นนี้ ${escH(s.note)}</div>`;
    return `<div class="pm-sec">${head}${body}</div>`;
  }).join("");
  if(PL.none && PL.none.length) html += `<div class="tl-sub pl-nonebar">มาตรฐานที่ไม่มีตัวชี้วัดในชั้น ${escH(g)}: ${PL.none.map(escH).join(", ")}</div>`;
  return html;
}

function plRender(){
  const g = PL.grade;
  if(g){ const b = plBuild(g); PL.secs = b.secs; PL.none = b.none; } else { PL.secs = []; PL.none = []; }
  pfShow(); pfCodeRefresh();
  plUpdate();
}

/* อัปเดตปุ่ม/รายการสรุป (และป๊อปอัปถ้าเปิดอยู่) */
function plUpdate(){
  if(!pl.view) return;
  const g = PL.grade, sel = plSel(), picked = plAllItems().filter(it=>sel.has(it.key));
  const gt = $("#plGradeTxt", pl.view), it = $("#plIndTxt", pl.view);
  gt.textContent = g || "แตะเพื่อเลือก"; $("#plPickGrade", pl.view).classList.toggle("set", !!g);
  it.textContent = !g ? "เลือกระดับชั้นก่อน" : picked.length ? `เลือกแล้ว ${plNum(picked.length)} ตัวชี้วัด` : "แตะเพื่อเลือก";
  $("#plPickInd", pl.view).classList.toggle("set", picked.length > 0);
  pl.sum.innerHTML = picked.length
    ? PL.secs.map(s=>{
        const rows = s.items.filter(x=>sel.has(x.key)); if(!rows.length) return "";
        return `<div class="pl-sg">${escH(s.title)}</div>` + rows.map(x=>`<div class="pl-pk"><span class="pl-clamp"><i>${escH(x.code)}</i>${escH(x.text)}</span><button type="button" data-rm="${escH(x.key)}" aria-label="เอาออก">✕</button></div>`).join("");
      }).join("")
    : "";
  if(pm.el && pm.mode === "ind"){
    const c = $("#plCount", pm.act); if(c) c.textContent = `${plNum(picked.length)} ข้อ`;
    PL.secs.forEach((s,si)=>{
      const b = $(`.pl-all[data-sec="${si}"]`, pm.body);
      if(b) b.textContent = s.items.every(x=>sel.has(x.key)) ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด";
    });
  }
}
function plSetKey(key, on){
  const sel = plSel(); on ? sel.add(key) : sel.delete(key);
  if(!pm.body) return;
  const cb = [...pm.body.querySelectorAll("input[data-k]")].find(x=>x.dataset.k === key);
  if(cb){ cb.checked = on; cb.closest(".pl-it").classList.toggle("on", on); }
}

function plText(){
  const sel = plSel(), lines = [];
  const n = plAllItems().filter(it=>sel.has(it.key)).length;
  lines.push(`แผนการสอน วิชาคณิตศาสตร์ ชั้น ${PL.grade}`, `ตัวชี้วัดที่เลือก ${plNum(n)} ข้อ`, "");
  PL.secs.forEach(s=>{
    const rows = s.items.filter(it=>sel.has(it.key)); if(!rows.length) return;
    lines.push(`[${s.title}]`);
    rows.forEach(it=> lines.push(`${it.code} ${it.text}`));
    lines.push("");
  });
  return lines.join("\n").trim();
}
async function plCopy(){
  const t = plText();
  try{ await navigator.clipboard.writeText(t); say("คัดลอกรายการตัวชี้วัดแล้ว"); return; }catch(e){}
  const ta = document.createElement("textarea");
  ta.value = t; ta.style.cssText = "position:fixed; opacity:0; top:0; left:0;";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); say("คัดลอกรายการตัวชี้วัดแล้ว"); }catch(e){ say("คัดลอกไม่สำเร็จ ลองกดค้างที่ข้อความแทนนะครับ"); }
  ta.remove();
}

/* =====================================================================
   สร้าง Prompt แผนการสอน — กรอกรายละเอียด → ได้ Prompt ภาษาไทยไปวางใน AI (ChatGPT / Gemini / Claude)
   โครงตามองค์ประกอบ ๑๓ หัวข้อ (🔴 สำคัญมาก / 🟡 ต้องตรงกับที่สอน / ⚪ ตามแบบฟอร์ม)
   ===================================================================== */
const PF_KEY = "kc_plan_form_v1";
const PF_COMP = ["ความสามารถในการสื่อสาร","ความสามารถในการคิด","ความสามารถในการแก้ปัญหา","ความสามารถในการใช้ทักษะชีวิต","ความสามารถในการใช้เทคโนโลยี"];
const PF_TRAIT = ["รักชาติ ศาสน์ กษัตริย์","ซื่อสัตย์สุจริต","มีวินัย","ใฝ่เรียนรู้","อยู่อย่างพอเพียง","มุ่งมั่นในการทำงาน","รักความเป็นไทย","มีจิตสาธารณะ"];
const PF_PROC = ["5E","GPAS 5 Steps","นำเข้าสู่บทเรียน → สอน → ฝึก → สรุป (ทั่วไป)","ตามแบบฟอร์มโรงเรียน (ระบุในหมายเหตุ)"];
const PF_TEACHER = "นายเมธัส เชื้อแดง", PF_PLAN0 = "แผนการจัดการเรียนรู้ที่ ", PF_SCHOOL0 = "โรงเรียนดลวิทยา";
const PF = { v:{}, comp:[], trait:[], open:{}, raw:"", sec:[], chk:"" };
try{ const o = JSON.parse(localStorage.getItem(PF_KEY) || "{}") || {}; PF.v = o.v || {}; PF.comp = o.comp || []; PF.trait = o.trait || []; PF.open = o.open || {}; PF.raw = o.raw || ""; PF.sec = o.sec || []; PF.chk = o.chk || ""; }catch(e){}
const pfSave = () => { try{ localStorage.setItem(PF_KEY, JSON.stringify(PF)); }catch(e){} };

function pfIn(id, label, ph, big, def){
  const val = escH(PF.v[id] ?? def ?? "");
  return `<div class="field"><label>${label}</label>` + (big
    ? `<textarea class="tl-ta" data-f="${id}" placeholder="${escH(ph||"")}">${val}</textarea>`
    : `<input data-f="${id}" value="${val}" placeholder="${escH(ph||"")}" autocomplete="off">`) + `</div>`;
}
function pfSel(id, label, opts){
  const cur = PF.v[id] || "";
  return `<div class="field"><label>${label}</label><select data-f="${id}">`
    + opts.map(o=>{ const [val,txt] = Array.isArray(o) ? o : [o,o]; return `<option value="${escH(val)}"${val===cur?" selected":""}>${escH(txt)}</option>`; }).join("")
    + `</select></div>`;
}
function pfChips(grp, arr){
  return `<div class="pf-chips">` + arr.map(x=>`<button type="button" class="pf-chk${PF[grp].includes(x)?" on":""}" data-grp="${grp}" data-v="${escH(x)}">${escH(x)}</button>`).join("") + `</div>`;
}

const thNum = x => parseInt(String(x).replace(/[๐-๙]/g, d => "๐๑๒๓๔๕๖๗๘๙".indexOf(d)), 10);
const pf = { editing:false };
const PF_SEC = ["มาตรฐานการเรียนรู้","สาระสำคัญ","สาระการเรียนรู้","จุดประสงค์การเรียนรู้","คุณลักษณะอันพึงประสงค์","สมรรถนะสำคัญของผู้เรียน","จุดเน้นสู่การพัฒนาคุณภาพผู้เรียน","ชิ้นงาน/ภาระงาน","กิจกรรมการเรียนรู้","สื่อ/แหล่งการเรียนรู้","การวัดและการประเมิน","เครื่องมือวัด","เกณฑ์การประเมิน"];
function pdSecTitle(i){ return i === 0 && (PF.v.subj || "") === "เพิ่มเติม" ? "ผลการเรียนรู้" : PF_SEC[i]; }

function pfSubject(){
  const sj = PF.v.subj || "พื้นฐาน";
  return sj === "custom" ? (PF.v.subjCustom || "").trim() : sj === "เพิ่มเติม" ? "คณิตศาสตร์เพิ่มเติม" : "คณิตศาสตร์พื้นฐาน";
}
function pfPlanName(){
  const t = (PF.v.planName ?? PF_PLAN0).trim();
  return t === PF_PLAN0.trim() ? t + " [ครูกรอก: ลำดับแผนและชื่อเรื่อง]" : t;
}
/* รหัสวิชาตามตารางที่ครูส่งมา (ป. = ตลอดปี "*" · ม.๒–๖ เป็นรูปแบบตัวอย่าง ต้องตรวจกับโรงเรียน) [ชั้น, ภาคเรียน, ประเภท, รหัส] */
const PF_CODES = [
  ["ป.๑","*","พื้นฐาน","ค11101"], ["ป.๒","*","พื้นฐาน","ค12101"], ["ป.๓","*","พื้นฐาน","ค13101"], ["ป.๔","*","พื้นฐาน","ค14101"],
  ["ป.๕","*","พื้นฐาน","ค15101"], ["ป.๖","*","พื้นฐาน","ค16101"], ["ม.๑","๑","พื้นฐาน","ค21101"], ["ม.๑","๒","พื้นฐาน","ค21102"],
  ["ม.๑","๑","เพิ่มเติม","ค21201"], ["ม.๑","๒","เพิ่มเติม","ค21202"], ["ม.๒","๑","พื้นฐาน","ค22101"], ["ม.๒","๒","พื้นฐาน","ค22102"],
  ["ม.๒","๑","เพิ่มเติม","ค22201"], ["ม.๒","๒","เพิ่มเติม","ค22202"], ["ม.๓","๑","พื้นฐาน","ค23101"], ["ม.๓","๒","พื้นฐาน","ค23102"],
  ["ม.๓","๑","เพิ่มเติม","ค23201"], ["ม.๓","๒","เพิ่มเติม","ค23202"], ["ม.๔","๑","พื้นฐาน","ค31101"], ["ม.๔","๒","พื้นฐาน","ค31102"],
  ["ม.๔","๑","เพิ่มเติม","ค31201"], ["ม.๔","๒","เพิ่มเติม","ค31202"], ["ม.๕","๑","พื้นฐาน","ค32101"], ["ม.๕","๒","พื้นฐาน","ค32102"],
  ["ม.๕","๑","เพิ่มเติม","ค32201"], ["ม.๕","๒","เพิ่มเติม","ค32202"], ["ม.๖","๑","พื้นฐาน","ค33101"], ["ม.๖","๒","พื้นฐาน","ค33102"],
  ["ม.๖","๑","เพิ่มเติม","ค33201"], ["ม.๖","๒","เพิ่มเติม","ค33202"]
];
function pfAutoCode(){
  const sj = PF.v.subj || "พื้นฐาน", g = PL.grade, t = PF.v.term;
  if(sj === "custom" || !g) return "";
  const r = PF_CODES.find(x=>x[0] === g && x[2] === sj && (x[1] === "*" || x[1] === t));
  return r ? r[3] : "";
}
function pfCodeRefresh(){
  const w = pl.form, inp = w && $("#pfCode", w); if(!inp) return;
  const auto = pfAutoCode();
  if(!PF.v.codeManual) PF.v.code = auto;
  inp.value = PF.v.code || ""; inp.readOnly = !pf.editing;
  $("#pfCodeHint", w).textContent = PF.v.codeManual ? "(แก้เอง)" : auto ? (PL.grade.charAt(0) === "ป" ? "(อัตโนมัติ · ตลอดปี)" : "(อัตโนมัติ)") : "(ไม่มีรหัสในตาราง — เลือกชั้น/ภาคเรียนให้ครบ หรือกดดินสอเพื่อใส่เอง)";
  $("#pfCodeEdit", w).textContent = pf.editing ? "✓" : "✏️";
  $("#pfCodeAuto", w).style.display = PF.v.codeManual ? "" : "none";
  pfSave();
}

function pfFormHtml(){
  const sj = PF.v.subj || "พื้นฐาน";
  const opt = (v,t,cur) => `<option value="${v}"${v===cur?" selected":""}>${t}</option>`;
  return `
  <div class="card pf-card${PF.open.form === false ? " collapsed" : ""}">
    <button type="button" class="pf-toggle" data-open="form"><span>✨ สร้าง Prompt สำหรับให้ AI ร่างแผน</span><i>▾</i></button>
    <div class="pf-collapse">
    <div class="tl-sub">กรอกเท่าที่รู้ได้เลย ช่องไหนเว้นไว้ AI จะใส่ [ครูกรอก] ให้แทนการเดา · ข้อมูลจะถูกจำไว้ในเครื่องนี้</div>

    <div class="pf-t">๑ ข้อมูลทั่วไปของแผน <small>ต้องครบและตรงกันทุกจุด</small></div>
    ${pfIn("planName","ชื่อแผน / ลำดับแผน","เช่น แผนการจัดการเรียนรู้ที่ 3 การแยกตัวประกอบพหุนาม", false, PF_PLAN0)}
    ${pfIn("school","โรงเรียน","", false, PF_SCHOOL0)}
    <div class="field"><label>รายวิชา</label>
      <select data-f="subj">${opt("พื้นฐาน","คณิตศาสตร์พื้นฐาน",sj)}${opt("เพิ่มเติม","คณิตศาสตร์เพิ่มเติม",sj)}${opt("custom","อื่น ๆ (พิมพ์เอง)",sj)}</select>
      <input data-f="subjCustom" id="pfSubjCustom" value="${escH(PF.v.subjCustom || "")}" placeholder="พิมพ์ชื่อรายวิชา" style="margin-top:8px;${sj === "custom" ? "" : " display:none;"}" autocomplete="off">
    </div>
    <div class="pf-2">${pfSel("term","ภาคเรียน",[["","— เลือก —"],["๑","ภาคเรียนที่ ๑"],["๒","ภาคเรียนที่ ๒"]])}${pfIn("year","ปีการศึกษา","เช่น ๒๕๖๙")}</div>
    <div class="field"><label>รหัสวิชา <small id="pfCodeHint" class="pf-hint"></small></label>
      <div class="pf-code"><input id="pfCode" data-f="code" readonly autocomplete="off" placeholder="เช่น ค๒๓๑๐๑"><button type="button" id="pfCodeEdit" title="แก้ไขรหัสวิชา">✏️</button><button type="button" id="pfCodeAuto" title="กลับเป็นรหัสอัตโนมัติ" style="display:none;">↺</button></div>
    </div>
    ${pfIn("unit","หน่วยการเรียนรู้","เช่น 1 เรื่อง การแยกตัวประกอบ")}
    ${pfIn("topic","เรื่องที่สอน","เช่น การแยกตัวประกอบด้วยสูตรผลต่างกำลังสาม")}
    <div class="pf-2">${pfIn("hours","จำนวนชั่วโมง","เช่น 5 ชั่วโมง")}${pfIn("teacher","ชื่อผู้สอน","", false, PF_TEACHER)}</div>
    ${pfSel("split","แบบฟอร์มโรงเรียนแยกตัวชี้วัด “ระหว่างทาง / ปลายทาง” หรือไม่",[["ไม่แยก","ไม่แยก (ใช้ตัวชี้วัดชั้นปีรวมกัน)"],["แยก","แยก — ให้ AI จัดประเภทเบื้องต้น แล้วครูตรวจกับหลักสูตร"]])}

    <div class="pf-t">๕ สาระการเรียนรู้ <small>ต้องตรงกับที่สอนจริง</small></div>
    ${pfIn("content","เนื้อหาหลักที่จะสอน (บรรทัดละ ๑ หัวข้อ)","เช่น\nการแยกตัวประกอบด้วยสูตรผลต่างกำลังสอง\nการแยกตัวประกอบด้วยสูตรผลบวก/ผลต่างกำลังสาม",true)}

    <div class="pf-t">๙ กิจกรรมการเรียนรู้</div>
    ${pfSel("proc","กระบวนการสอนที่โรงเรียนใช้ (เลือกอันเดียว ไม่ผสมกัน)",[["","ให้ AI เลือก ๑ รูปแบบที่เหมาะ"]].concat(PF_PROC))}
    ${pfIn("students","บริบทนักเรียน / ข้อจำกัด (ไม่ใส่ก็ได้)","เช่น ห้องละ ๓๐ คน มีนักเรียนอ่อนเรื่องเครื่องหมาย ไม่มีโปรเจกเตอร์",true)}

    <div class="pf-t">๖ สมรรถนะสำคัญ <small>เลือกเฉพาะที่กิจกรรมเปิดโอกาสให้เกิด</small></div>
    ${pfChips("comp", PF_COMP)}
    <div class="pf-t">๗ คุณลักษณะอันพึงประสงค์ <small>เลือกให้สัมพันธ์กับพฤติกรรมในคาบ</small></div>
    ${pfChips("trait", PF_TRAIT)}
    <div class="tl-sub" style="margin-top:6px;">ไม่เลือก = ให้ AI เลือกเฉพาะข้อที่สอดคล้องกับกิจกรรมจริง</div>

    <div class="pf-t">๘ ชิ้นงาน · ๑๐ สื่อ · ๑๑ การประเมิน</div>
    ${pfIn("work","ชิ้นงาน / ภาระงานที่ต้องการให้ส่ง","เช่น ใบงานที่ ๓.๒ และการอธิบายวิธีทำหน้าชั้น",true)}
    ${pfIn("media","สื่อและแหล่งเรียนรู้ที่ใช้จริง","เช่น หนังสือเรียน สสวท. ใบงาน สไลด์ GeoGebra",true)}
    ${pfIn("assess","แนวทางการวัดและเกณฑ์ผ่านที่โรงเรียนใช้","เช่น เกณฑ์ผ่านร้อยละ ๖๐ แบบสังเกตระดับคุณภาพ ๑–๓",true)}

    <div class="pf-t">ตัวเลือกเพิ่มเติม</div>
    ${pfIn("note","หมายเหตุ / โครงแบบฟอร์มโรงเรียน (ไม่ใส่ก็ได้)","เช่น แบบฟอร์มของโรงเรียนมีหัวข้อ “ประเด็นบูรณาการ” เพิ่ม",true)}

    <button type="button" class="btn btn-primary" id="pfGo" style="margin-top:6px;">✨ สร้าง Prompt</button>
    <button type="button" class="btn btn-outline btn-sm" id="pfReset" style="margin-top:8px;">↺ ล้างข้อมูลฟอร์ม</button>
    <div id="pfOutWrap" style="display:none; margin-top:14px;">
      <div class="tl-row"><div class="tl-h" style="margin:0;">Prompt ที่ได้</div><span class="tl-sub" id="pfLen"></span></div>
      <textarea id="pfOut" class="tl-ta pf-out" spellcheck="false"></textarea>
      <button type="button" class="btn btn-primary" id="pfCopy" style="margin-top:8px;">📋 คัดลอก Prompt</button>
      <div class="tl-sub" style="margin-top:8px;">นำไปวางใน ChatGPT / Gemini / Claude ได้เลย แล้วเอาคำตอบมาใส่ในขั้นที่ ๒ ด้านล่าง</div>
    </div>
    </div>
  </div>`;
}

function pdFormHtml(){
  return `
  <div class="card pf-card${PF.open.doc === false ? " collapsed" : ""}">
    <button type="button" class="pf-toggle" data-open="doc"><span>📄 ขั้นที่ ๒ · นำคำตอบจาก AI มาทำเป็นไฟล์</span><i>▾</i></button>
    <div class="pf-collapse">
      <div class="tl-sub">วางคำตอบทั้งหมดจาก AI แล้วกด “แยกเป็นหัวข้อ” (หรือพิมพ์/วางทีละหัวข้อเองก็ได้) แก้ไขได้ทุกช่อง แล้วค่อยดาวน์โหลด</div>
      <div class="field" style="margin-top:10px;"><label>คำตอบจาก AI (ทั้งแผน)</label><textarea id="pdRaw" class="tl-ta pf-out" style="min-height:140px;" placeholder="วางข้อความที่ AI เขียนให้ที่นี่">${escH(PF.raw)}</textarea></div>
      <button type="button" class="btn btn-primary" id="pdSplit">✂️ แยกเป็นหัวข้อ ๑–๑๓</button>
      <div class="pf-t">เนื้อหาแต่ละหัวข้อ</div>
      ${PF_SEC.map((t,i)=>`<div class="field"><label>${plNum(i+1)}. ${escH(pdSecTitle(i))}</label><textarea class="tl-ta pd-s" data-s="${i}" placeholder="(เว้นว่างได้)">${escH(PF.sec[i] || "")}</textarea></div>`).join("")}
      <div class="field" id="pdChkBox" style="${PF.chk ? "" : "display:none;"}"><label>รายการให้ครูตรวจก่อนใช้ (AI เขียนมาให้ — ไม่ใส่ในไฟล์)</label><textarea class="tl-ta" id="pdChk" readonly>${escH(PF.chk)}</textarea></div>
      <div class="pd-btns">
        <button type="button" class="btn btn-primary" id="pdWord">⬇ ดาวน์โหลด Word (.doc)</button>
        <button type="button" class="btn btn-outline" id="pdPrint">🖨 พิมพ์ / บันทึกเป็น PDF</button>
      </div>
      <button type="button" class="btn btn-outline btn-sm" id="pdClear" style="margin-top:8px;">↺ ล้างเนื้อหาขั้นที่ ๒</button>
    </div>
  </div>`;
}

function pfPrompt(){
  const v = PF.v, g = PL.grade;
  const f = (k, hint) => (v[k]||"").trim() || `[ครูกรอก: ${hint}]`;
  const sel = plSel(), picked = plAllItems().filter(it=>sel.has(it.key));
  const L = [];
  L.push("# บทบาท");
  L.push("คุณเป็นครูคณิตศาสตร์ผู้เชี่ยวชาญการเขียนแผนการจัดการเรียนรู้ ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑ (ฉบับปรับปรุง พ.ศ. ๒๕๖๐) กลุ่มสาระการเรียนรู้คณิตศาสตร์");
  L.push("งานของคุณ: ร่างแผนการจัดการเรียนรู้ฉบับเต็ม ๑ แผน เป็นภาษาไทยแบบทางการ ที่ครูนำไปใช้สอนจริงได้ ตามข้อมูลและข้อกำหนดด้านล่าง");
  L.push("");
  L.push("# ข้อมูลจากครู");
  L.push(`- ชื่อแผน / ลำดับแผน: ${pfPlanName()}`);
  L.push(`- กลุ่มสาระการเรียนรู้: คณิตศาสตร์ | รายวิชา: ${pfSubject() || "[ครูกรอก: ชื่อรายวิชา]"} | รหัสวิชา: ${(v.code||"").trim() || "[ครูกรอก: รหัสวิชา]"}`);
  L.push(`- ระดับชั้น: ${g} | ภาคเรียน: ${v.term ? "ที่ "+v.term : "[ครูกรอก: ภาคเรียน]"} | ปีการศึกษา: ${f("year","ปีการศึกษา")}`);
  L.push(`- หน่วยการเรียนรู้: ${f("unit","หน่วยการเรียนรู้")}`);
  L.push(`- เรื่องที่สอน: ${f("topic","เรื่องที่สอน")}`);
  L.push(`- จำนวนชั่วโมง: ${f("hours","จำนวนชั่วโมง")}`);
  L.push(`- โรงเรียน: ${(v.school ?? PF_SCHOOL0).trim() || "(ไม่ระบุ)"}`);
  L.push(`- ผู้สอน: ${(v.teacher ?? PF_TEACHER).trim() || "(ไม่ระบุ — เว้นว่างตามแบบฟอร์ม)"}`);
  L.push(`- แบบฟอร์มแยกตัวชี้วัดระหว่างทาง/ปลายทาง: ${v.split === "แยก" ? "แยก (จัดประเภทเบื้องต้นให้ แล้วหมายเหตุให้ครูตรวจกับหลักสูตรที่ใช้)" : "ไม่แยก"}`);
  L.push("");
  L.push("## ตัวชี้วัดที่ครูเลือก (ใช้ข้อความนี้ตามต้นฉบับ ห้ามแก้ถ้อยคำหรือแต่งเพิ่ม)");
  L.push(picked.length ? plText() : "[ครูยังไม่ได้เลือกตัวชี้วัด — ให้ขอจากครู ห้ามแต่งขึ้นเอง]");
  L.push("");
  L.push("## สาระการเรียนรู้ที่ครูต้องการสอน");
  L.push((v.content||"").trim() || "[ครูกรอก: เนื้อหาหลักที่จะสอน — ถ้าไม่มี ให้เสนอหัวข้อย่อยจากเรื่องที่สอน แล้วทำเครื่องหมายว่าให้ครูตรวจ]");
  L.push("");
  L.push(`## กระบวนการสอน: ${v.proc || "ให้เลือกเพียง ๑ รูปแบบที่เหมาะกับเรื่องนี้ แล้วบอกชื่อรูปแบบที่เลือก"}`);
  L.push("ใช้ชื่อขั้นตอนของรูปแบบเดียวเท่านั้น ไม่นำชื่อขั้นตอนของหลายรูปแบบมาปะปนกัน");
  if((v.students||"").trim()) L.push(`## บริบทนักเรียน/ข้อจำกัด: ${v.students.trim()}`);
  L.push("");
  L.push(`## สมรรถนะสำคัญที่ต้องการ: ${PF.comp.length ? PF.comp.join(", ") : "ให้เลือกเฉพาะที่กิจกรรมเปิดโอกาสให้เกิดและมีหลักฐานให้ประเมินได้"}`);
  L.push(`## คุณลักษณะอันพึงประสงค์ที่ต้องการ: ${PF.trait.length ? PF.trait.join(", ") : "ให้เลือกเฉพาะที่สัมพันธ์กับพฤติกรรมในคาบจริง (เช่น ส่งงานตามเวลา ตรวจสอบคำตอบ พยายามแก้โจทย์)"}`);
  L.push(`## ชิ้นงาน/ภาระงาน: ${(v.work||"").trim() || "ให้เสนอ แล้วแยกให้ชัดว่าอะไรคือ “ชิ้นงาน” (หลักฐานที่ตรวจได้)"}`);
  L.push(`## สื่อและแหล่งเรียนรู้: ${(v.media||"").trim() || "ให้เสนอเฉพาะสื่อที่ใช้ในกิจกรรมจริง"}`);
  L.push(`## แนวทางวัดผลและเกณฑ์ผ่านของโรงเรียน: ${(v.assess||"").trim() || "[ครูกรอก: เกณฑ์ผ่าน] (ถ้าไม่ระบุ ให้เสนอเกณฑ์ทั่วไปและติดป้าย “ปรับตามโรงเรียน”)"}`);
  if((v.note||"").trim()) L.push(`## หมายเหตุ/โครงแบบฟอร์มโรงเรียน: ${v.note.trim()}`);
  L.push("");
  const addl = (v.subj || "") === "เพิ่มเติม", sp = v.split === "แยก";
  L.push("# โครงแผนและข้อกำหนดรายหัวข้อ");
  L.push("เขียนตามลำดับ 13 หัวข้อนี้เท่านั้น ใช้ชื่อหัวข้อตรงตามที่กำหนด และใช้เลขอารบิก (1 2 3) ทั้งแผน (🔴 = สำคัญมาก เขียนละเอียดและตรวจความถูกต้องเข้ม · 🟡 = ต้องครบและตรงกับที่สอนจริง · ⚪ = ทำตามแบบฟอร์ม)");
  L.push(`1. 🔴 ${addl ? "ผลการเรียนรู้ (วิชาเพิ่มเติมใช้ชื่อหัวข้อนี้แทน “มาตรฐานการเรียนรู้”): เขียนผลการเรียนรู้ที่สอดคล้องกับตัวชี้วัดที่ครูเลือก ไม่แต่งเกินตัวชี้วัด" : "มาตรฐานการเรียนรู้: บรรทัดแรกเขียน “มาตรฐาน ค x.x …” (ใช้เฉพาะมาตรฐานที่ตรงกับตัวชี้วัด ไม่แต่งเอง) แล้วขึ้นบรรทัดใหม่เขียนคำว่า " + (sp ? "“ตัวชี้วัดระหว่างทาง” และ “ตัวชี้วัดปลายทาง” ตามลำดับ (บรรทัดละคำ)" : "“ตัวชี้วัด”") + " โดยเขียนข้อความตัวชี้วัดตามต้นฉบับไว้ใต้แต่ละคำ ห้ามแก้ถ้อยคำ (ถ้าไม่มีให้ใส่ -)"}`);
  L.push("2. 🟡 สาระสำคัญ: เป็นรายการสั้น ๆ 3–4 ข้อ ขึ้นต้นด้วย 1. 2. 3. บอกแนวคิดหลักที่นักเรียนต้องเข้าใจ ไม่คัดลอกเนื้อหาทั้งบท");
  L.push("3. 🟡 สาระการเรียนรู้: รายการหัวข้อย่อยขึ้นต้นด้วย 1. 2. 3. ตรงกับสิ่งที่สอนจริง");
  L.push("4. 🔴 จุดประสงค์การเรียนรู้: เขียนเพียง 3 บรรทัด อย่างละ 1 ข้อเท่านั้น ในรูปแบบ");
  L.push("   ด้านความรู้ (K): …");
  L.push("   ด้านทักษะกระบวนการ (P): …");
  L.push("   ด้านเจตคติ (A): …");
  L.push("   ข้อกำหนดของจุดประสงค์ K P A (เน้นเป็นพิเศษ):");
  L.push("   - ทุกข้อต้องวัดได้จริง: ขึ้นต้นด้วยคำกริยาที่เห็นพฤติกรรมและตรวจได้ (อธิบาย จำแนก คำนวณ แสดงวิธีทำ ตรวจสอบ เปรียบเทียบ) ห้ามใช้คำกว้าง ๆ เช่น เข้าใจ รู้ ตระหนัก ซาบซึ้ง");
  L.push("   - ระบุสิ่งที่นักเรียนทำได้ + เนื้อหา/ขอบเขต + เงื่อนไขหรือเกณฑ์ที่ตรวจได้ (เช่น ... ได้ถูกต้อง ... ข้อ จาก ... ข้อ) เพื่อให้ตัดสินได้ว่าบรรลุหรือไม่บรรลุ");
  L.push("   - ปริมาณและความยากของแต่ละข้อต้องพอดีกับเนื้อหาที่สอนจริงภายใน \"จำนวนชั่วโมง\" ที่ครูกำหนดและตรงกับสาระการเรียนรู้ ห้ามตั้งเกินเวลาหรือเกินตัวชี้วัดที่เลือก");
  L.push("   - K เน้นสิ่งที่รู้/อธิบายได้ · P เน้นสิ่งที่ลงมือทำ/แสดงวิธีคิด · A ต้องเป็นพฤติกรรมที่สังเกตเห็นได้ในคาบ ไม่ใช่ความรู้สึกที่วัดไม่ได้");
  L.push("   - ถ้าเขียนเกณฑ์เป็น “ประเด็น/ข้อ” (เช่น 3 ประเด็นจาก 4 ประเด็น) ต้องระบุให้ชัดในหัวข้อ 12 ว่า 4 ประเด็นนั้นคืออะไร ห้ามอ้างประเด็นหรือเกณฑ์ที่ไม่ได้นิยามไว้");
  L.push("   - ด้านเจตคติ (A) เขียนเป็นประโยคเดียวสั้น ๆ และต้องมาจากพฤติกรรมในแบบสังเกตที่ระบบสร้างให้เท่านั้น ได้แก่ รับผิดชอบงานที่ได้รับมอบหมาย · รับฟังความคิดเห็นของผู้อื่น · ให้ความร่วมมือ · นำเสนอผลงานได้น่าสนใจ · ทำงานเสร็จตามเวลาที่กำหนด (เลือกให้ตรงกับกิจกรรมจริง 2–3 พฤติกรรม ไม่เขียนพฤติกรรมอื่นที่แบบสังเกตไม่มี)");
  L.push("   - ตัวชี้วัดทุกข้อที่ครูเลือกต้องมีจุดประสงค์และกิจกรรมรองรับ ถ้าตัวชี้วัดข้อใดทำไม่ทันในจำนวนชั่วโมงที่กำหนด ห้ามบิดเนื้อหาให้ครบ ให้เขียนเตือนไว้ใน “รายการให้ครูตรวจก่อนใช้”");
  L.push("   - จุดประสงค์ต้องสอดคล้องกับกิจกรรม (หัวข้อ 9) และการประเมิน (หัวข้อ 11–13)");
  L.push(`5. ⚪ คุณลักษณะอันพึงประสงค์: เขียนเฉพาะชื่อข้อที่เลือก คั่นด้วยจุลภาค ในบรรทัดเดียว โดยเลือกจากรายการนี้และใช้ชื่อตรงตามนี้เท่านั้น: ${PF_TRAIT.join(", ")} (เลือกเฉพาะที่สัมพันธ์กับพฤติกรรมในคาบจริง)`);
  L.push(`6. ⚪ สมรรถนะสำคัญของผู้เรียน: เขียนเฉพาะชื่อข้อที่เลือก คั่นด้วยจุลภาค ในบรรทัดเดียว โดยเลือกจากรายการนี้และใช้ชื่อตรงตามนี้เท่านั้น: ${PF_COMP.join(", ")} (เลือกเพียง 2–3 ข้อที่มีหลักฐานในกิจกรรมจริง ห้ามเลือกครบทุกข้อ และไม่เลือกข้อที่กิจกรรมไม่ได้เปิดโอกาส เช่น ความสามารถในการใช้เทคโนโลยี ถ้าไม่ได้ใช้เทคโนโลยีในคาบ)`);
  L.push("7. จุดเน้นสู่การพัฒนาคุณภาพผู้เรียน: เขียนเฉพาะบรรทัดหัวข้อ “7. จุดเน้นสู่การพัฒนาคุณภาพผู้เรียน” แล้วเว้นเนื้อหาว่าง (ระบบจะเติมให้เอง)");
  L.push("8. 🔴 ชิ้นงาน/ภาระงาน: ระบุชื่อชิ้นงานที่เป็นหลักฐานตรวจได้ เช่น ใบงาน/แบบฝึกหัด เรื่อง … และแยกให้ชัดว่ากิจกรรมกับชิ้นงานต่างกัน ถ้ามีใบงานหลายข้อให้ระบุว่าข้อใดทำในชั่วโมงใด (เช่น ชั่วโมงที่ 1 ข้อ 1–5 ชั่วโมงที่ 2 ข้อ 6–10) และปริมาณต้องทำเสร็จได้จริงในเวลาของขั้นประเมินผล (ประมาณ 2–3 นาทีต่อข้อ) ห้ามแต่งโจทย์ในใบงานเอง ให้ระบุว่าเป็นหน้าที่ครูจัดทำ");
  L.push("9. 🔴 กิจกรรมการเรียนรู้: แบ่งตามชั่วโมง โดยขึ้นบรรทัดใหม่เป็น “ชั่วโมงที่ 1 เรื่อง … (เวลา … นาที)” แล้วเขียนตามขั้นตอนของกระบวนการสอนรูปแบบเดียว โดยชื่อขั้นแต่ละขั้นอยู่บรรทัดของตัวเอง (ขึ้นต้นด้วยคำว่า “ขั้น”) ใต้แต่ละขั้นเขียนเป็นข้อ ๆ ขึ้นต้น 1. 2. 3. ต่อเนื่องในชั่วโมงนั้น (1 ข้อ = 1 ย่อหน้า ไม่ขึ้นบรรทัดกลางข้อ) แต่ละข้อต้องระบุให้ครบ 4 อย่าง: (1) บทบาทครู ครูทำอะไร (2) บทบาทผู้เรียน นักเรียนทำอะไร (3) คำถามกระตุ้นการคิดจริง ๆ พร้อมแนวคำตอบในวงเล็บ (4) หลักฐานการเรียนรู้ที่เกิดขึ้นในขั้นนั้น (เช่น คำตอบที่พูด/เขียน ใบงานข้อที่ … การแสดงวิธีทำ) และต้องเชื่อมกับจุดประสงค์โดยลงท้ายข้อสำคัญด้วย (K) (P) หรือ (A) ให้ครบทั้ง 3 ด้านในแต่ละชั่วโมง/แผน ทุกจุดประสงค์ต้องมีกิจกรรมรองรับอย่างน้อย 1 ขั้น และทุกกิจกรรมต้องรองรับจุดประสงค์อย่างน้อย 1 ข้อ มีแนวทางช่วยนักเรียนที่ยังไม่เข้าใจ และมีโจทย์ท้าทายสำหรับนักเรียนที่ทำเสร็จก่อน ถ้าตัวชี้วัดมีคำว่า แก้ปัญหา/ประยุกต์/สถานการณ์ ต้องมีโจทย์สถานการณ์จริงอย่างน้อย 1 โจทย์ในขั้นขยายความรู้ ข้อที่ติดป้าย (A) ต้องเป็นพฤติกรรมตามแบบสังเกตในหัวข้อ 4 เท่านั้น และเวลารวมทุกชั่วโมงต้องเท่ากับจำนวนชั่วโมงที่ให้ ห้ามเขียนยาวซ้ำไปซ้ำมา");
  L.push("10. 🟡 สื่อ/แหล่งการเรียนรู้: บรรทัด “สื่อการเรียนรู้” ตามด้วยรายการขึ้นต้น “- ” แล้วบรรทัด “แหล่งการเรียนรู้” ตามด้วยรายการขึ้นต้น “- ” เฉพาะที่ใช้ในกิจกรรมจริง ชื่อใบงานต้องตรงกับหัวข้ออื่น");
  L.push("11. 🔴 การวัดและการประเมิน: คัดลอกจุดประสงค์ K P A ทั้ง 3 บรรทัดจากหัวข้อ 4 มาตรงตัวตามรูปแบบเดิม");
  L.push("12. 🔴 เครื่องมือวัด: รายการขึ้นต้น 1. 2. 3. ระบุชื่อเครื่องมือที่ใช้จริง เช่น ใบงานที่ … แบบทดสอบย่อย/บัตรคำถามท้ายคาบ แบบสังเกตพฤติกรรม ให้ตรงกับหัวข้อ 8 9 13 เครื่องมือที่วัดด้านความรู้ (K) ต้องเหลือหลักฐานที่ตรวจย้อนหลังได้ (คำตอบที่เขียนไว้) ไม่ใช้การถามตอบปากเปล่าอย่างเดียว และถ้าจุดประสงค์ใช้เกณฑ์เป็นประเด็น/ข้อ ต้องระบุว่าแต่ละประเด็นคืออะไร โดยทุกเครื่องมือต้องตรวจวัดจุดประสงค์ K P A ข้อใดข้อหนึ่งได้จริง และชื่อต้องตรงกับที่ใช้ในหัวข้อ 8 และตาราง 13 ทุกตัวอักษร");
  L.push("13. 🔴 เกณฑ์การประเมิน: เป็นตาราง Markdown ตารางเดียว 4 คอลัมน์ ส่วนหัวตารางคือ “รายละเอียด | วิธีการวัด | เครื่องมือ | เกณฑ์การประเมิน” แถวของตารางเรียงดังนี้ (1) แถวหัวกลุ่ม “จุดประสงค์การเรียนรู้ (KPA)” โดยใส่ข้อความเฉพาะช่องแรกและเว้นอีก 3 ช่องว่าง แล้วตามด้วยแถว K, P, A อย่างละ 1 แถว (2) แถวหัวกลุ่ม “คุณลักษณะอันพึงประสงค์” แล้วตามด้วย 1 แถวที่ระบุข้อที่เลือกในหัวข้อ 5 พร้อมวิธีวัด/เครื่องมือ/เกณฑ์ (3) แถวหัวกลุ่ม “สมรรถนะสำคัญของผู้เรียน (ตามกรอบหลักสูตรฐานสมรรถนะ 2565)” แล้วตามด้วย 1 แถวที่เลือก 2–3 ข้อจาก การจัดการตนเอง, การสื่อสาร, การรวมพลังทำงานเป็นทีม, การคิดขั้นสูง, การเป็นพลเมืองที่เข้มแข็ง ถ้าต้องการขึ้นบรรทัดใหม่ในช่องตารางให้ใช้ <br> ทุกแถวต้องเชื่อมกับหัวข้อ 4 11 12 โดยแต่ละแถวต้องสอดคล้องกันครบ 3 อย่าง คือ วิธีการวัด (เช่น ตรวจใบงาน ซักถาม สังเกต) → เครื่องมือ (ชื่อตรงกับหัวข้อ 12) → เกณฑ์ที่วัดได้จริง (เช่น ทำถูกอย่างน้อย … ข้อจาก … ข้อ หรือได้ระดับคุณภาพ … ขึ้นไป) ห้ามให้วิธีวัดกับเครื่องมือไม่ตรงกัน และห้ามตั้งเกณฑ์ที่เครื่องมือนั้นวัดไม่ได้ เกณฑ์ผ่านใช้ตามที่ครูกำหนดในหัวข้อ “แนวทางวัดผลและเกณฑ์ผ่านของโรงเรียน” ถ้าไม่ได้ระบุให้ใส่ [ครูกรอก: เกณฑ์ผ่าน] ส่วนเกณฑ์ของด้าน A คุณลักษณะ และสมรรถนะ ให้ใช้ระดับคุณภาพของแบบสังเกตที่ระบบสร้างให้ (คะแนนเต็ม 20: ดีมาก 18–20 ดี 14–17 พอใช้ 11–13 ควรปรับปรุง 0–10) เช่น “ได้ระดับดีขึ้นไป (14 คะแนนขึ้นไปจาก 20 คะแนน)” แถวสมรรถนะ (กรอบ 2565) ให้เลือกข้อที่เทียบเคียงกับข้อที่เลือกในหัวข้อ 6 เช่น ความสามารถในการสื่อสาร ↔ การสื่อสาร, ความสามารถในการคิด/แก้ปัญหา ↔ การคิดขั้นสูง, ความสามารถในการใช้ทักษะชีวิต ↔ การจัดการตนเอง ห้ามเลือกข้อที่ไม่มีในหัวข้อ 6 ");
  L.push("ห้ามเขียนหัวข้อ “บันทึกหลังการสอน” และ “แบบสังเกตพฤติกรรม” เพราะระบบสร้างให้เอง และห้ามคาดเดาหรือเขียนผลการสอนล่วงหน้า (เช่น นักเรียนทำได้ร้อยละ … ปัญหาที่พบ …) เพราะครูต้องเว้นช่องไว้สะท้อนผลจากการสอนจริง");
  L.push("");
  L.push("# รูปแบบการส่งคำตอบ (ทำตามอย่างเคร่งครัด)");
  L.push("- ส่งแผนทั้งหมดเป็น code block เดียว (เปิดด้วย ```text และปิดด้วย ```) เพื่อให้ครูกดปุ่มคัดลอกแล้วนำไปวางต่อได้ทันที ห้ามมีข้อความใด ๆ นอก code block ทั้งก่อนและหลัง (ไม่ทักทาย ไม่อธิบาย ไม่ถามต่อ)");
  L.push("- ภายใน code block เป็นข้อความธรรมดา ไม่ใช้สัญลักษณ์ตกแต่งแบบ Markdown (# ** __) และไม่ใช้อีโมจิ ยกเว้น (ก) เครื่องหมาย $ ที่ครอบสูตร/สมการ ซึ่งต้องใช้ตามหัวข้อ “การเขียนสูตรและสมการ” ด้านล่าง ไม่ถือเป็นสัญลักษณ์ตกแต่ง และ (ข) ตารางที่ใช้เครื่องหมาย | คั่นคอลัมน์ตามที่กำหนด");
  L.push("- หัวข้อหลักขึ้นต้นบรรทัดด้วย “เลข. ชื่อหัวข้อ” เช่น “1. มาตรฐานการเรียนรู้” เรียงตามลำดับ 1–13 ไม่ข้ามเลข ไม่เพิ่มหัวข้อหลักอื่น และใช้ชื่อหัวข้อตรงตามที่กำหนด ส่วนข้อย่อยภายในหัวข้อใช้ 1. 2. 3. หรือ “- ” ได้ ให้แต่ละข้อจบในย่อหน้าเดียว");
  L.push("");
  L.push("# กติกาทั่วไป");
  L.push("- ข้อมูลที่ครูไม่ได้ให้ ให้ใส่ [ครูกรอก: …] ห้ามเดา โดยเฉพาะรหัสวิชา เวลา และเกณฑ์ผ่าน");
  L.push("- ตรวจความสอดคล้อง: จุดประสงค์ ↔ กิจกรรม ↔ ชิ้นงาน ↔ การประเมิน ต้องโยงกันครบ");
  L.push("- ก่อนส่งให้ตรวจตนเองตามนี้: (1) จุดประสงค์ K P A วัดได้และพอดีกับจำนวนชั่วโมง (2) ทุกจุดประสงค์มีกิจกรรมที่ระบุบทบาทครู บทบาทผู้เรียน คำถาม และหลักฐานการเรียนรู้ (3) วิธีวัด เครื่องมือ และเกณฑ์ผ่านสอดคล้องกันทุกแถว (4) เวลารวมเท่ากับจำนวนชั่วโมง (5) สูตรและสมการทุกตัวอยู่ใน $...$ ตามหัวข้อ “การเขียนสูตรและสมการ” (6) หัวข้อครบ 1–13 เลขอารบิก ชื่อหัวข้อตรงตามที่กำหนด ไม่มีข้อความนอก code block และไม่มีผลการสอนที่แต่งขึ้นเอง แล้วแก้ให้เรียบร้อยก่อนส่ง ไม่ต้องแสดงผลการตรวจ");
  L.push("- โจทย์และตัวอย่างทางคณิตศาสตร์ต้องคำนวณถูกต้อง ให้ตรวจคำตอบซ้ำอีกรอบก่อนส่ง");
  L.push("");
  L.push("# การเขียนสูตรและสมการ (สำคัญมาก — เว็บจะแปลง $...$ เป็นสมการตอนทำ PDF ถ้าไม่ใส่ $ สมการจะแสดงเป็นตัวอักษรดิบและอ่านไม่ออก)");
  L.push("- ทุกสิ่งที่เป็นสัญลักษณ์ทางคณิตศาสตร์ต้องอยู่ใน $...$ ทั้งก้อน ไม่ว่าจะอยู่ในกิจกรรม แนวคำตอบ ตาราง หรือรายการใดก็ตาม ได้แก่ ฟังก์ชันที่กำหนดค่า นิพจน์ สมการ อสมการ เศษส่วน ยกกำลัง ราก เซต ช่วง โดเมน/เรนจ์ และการดำเนินการของฟังก์ชัน ห้ามพิมพ์ ^ _ / * หรือตัวอักษรกรีกนอก $...$");
  L.push("- ชื่อฟังก์ชันหรือตัวแปรเดี่ยว ๆ ที่แทรกในประโยค (f, g, x) ก็ใส่ $f$ $g$ $x$ เพื่อให้ตัวอักษรเหมือนกันทั้งแผน ส่วนข้อความภาษาไทยอยู่นอก $ เสมอ (ถ้าจำเป็นต้องมีภาษาไทยในสมการให้ใช้ \\text{...})");
  L.push("- รูปแบบที่ต้องใช้ (ซ้ายคือผิด ขวาคือถูก):");
  L.push("  f(x) = 2x + 1  →  $f(x) = 2x + 1$");
  L.push("  x^2 , x^2+4x+4  →  $x^{2}$ , $x^{2} + 4x + 4$");
  L.push("  (f+g)(x) , (f-g)(x) , (fg)(x)  →  $(f+g)(x)$ , $(f-g)(x)$ , $(fg)(x)$");
  L.push("  (f/g)(x) หรือ “f(x) หารด้วย g(x)”  →  $\\left(\\frac{f}{g}\\right)(x) = \\frac{f(x)}{g(x)}$ (เมื่อ $g(x) \\neq 0$)");
  L.push("  (g∘f)(x) , g(f(x))  →  $(g \\circ f)(x)$ , $g(f(x))$");
  L.push("  x ≠ 3 , x ≥ 0  →  $x \\neq 3$ , $x \\geq 0$");
  L.push("  โดเมน {x | x ≠ 3}  →  $\\{x \\mid x \\neq 3\\}$ (ใช้ \\mid แทน | เสมอ)  ช่วง  →  $(-\\infty, 3) \\cup (3, \\infty)$");
  L.push("- การหารฟังก์ชันต้องเขียนด้วยสัญลักษณ์ $\\left(\\frac{f}{g}\\right)(x)$ เสมอ ห้ามเขียนเป็นข้อความ “f(x) หารด้วย g(x)” หรือ f(x)/g(x) ในส่วนที่เป็นนิยามหรือผลลัพธ์ และเศษส่วนทุกตัวใช้ \\frac{a}{b} ห้ามใช้ / แทนเศษส่วน");
  L.push("- คำสั่งที่ใช้ได้: \\frac{a}{b}  \\sqrt{x}  x^{2}  x_{1}  \\times  \\div  \\leq  \\geq  \\neq  \\pi  \\circ  \\cup  \\cap  \\in  \\infty  \\therefore  \\left( \\right) สมการที่ต้องขึ้นบรรทัดใหม่ใช้ $$...$$ โดยเปิดและปิดให้จบในบรรทัดเดียว");
  L.push("- ห้ามใช้เลขยกกำลังแบบ Unicode (², ³) ห้ามใช้ \\( \\) หรือ \\[ \\] ห้ามใช้เครื่องหมาย | ในสมการที่อยู่ในตาราง (ใช้ \\lvert x \\rvert แทน) ห้ามใช้เครื่องหมาย $ กับเรื่องอื่น เช่น จำนวนเงิน และห้ามใส่ $ ซ้อนกันหรือเปิดแล้วไม่ปิด");
  L.push("- ตรวจก่อนส่ง: ค้นทั้งแผนว่าไม่มีเครื่องหมาย ^ _ ≠ ≥ ≤ ∘ × ÷ หรือ f(x)/g(x) หลงอยู่นอก $...$ และทุก $ ที่เปิดมีตัวปิดครบ");
  L.push("- ท้ายแผน (ยังอยู่ใน code block เดียวกัน) เพิ่มบรรทัดหัวข้อว่า “รายการให้ครูตรวจก่อนใช้” แล้วตามด้วยรายการสั้น ๆ ไม่เกิน ๕ ข้อ ระบุจุดที่ AI ไม่แน่ใจหรือต้องเทียบกับหลักสูตร/แบบฟอร์มโรงเรียน");
  return L.join("\n");
}

async function pfCopyText(t, msg){
  try{ await navigator.clipboard.writeText(t); say(msg); return; }catch(e){}
  const ta = document.createElement("textarea");
  ta.value = t; ta.style.cssText = "position:fixed; opacity:0; top:0; left:0;";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); say(msg); }catch(e){ say("คัดลอกไม่สำเร็จ ลองกดค้างที่ข้อความแทนนะครับ"); }
  ta.remove();
}
/* แยกคำตอบ AI เป็นหัวข้อ ๑–๑๓ (หัวข้อต้องเรียงตามลำดับ ๑. ๒. ๓. …) */
function pdIsTitle(rest, i){
  const n = x => String(x).replace(/[\s*\/#]/g, "");
  const r = n(rest);
  return r.startsWith(n(PF_SEC[i]).slice(0, 4)) || (i === 0 && r.startsWith("ผลการ"));
}
function pdSplit(t){
  const sec = Array(13).fill(""), chk = []; let cur = -1, inChk = false;
  String(t||"").split(/\r?\n/).forEach(line=>{
    if(/^\s*```/.test(line)) return;
    if(/^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*รายการให้ครูตรวจ/.test(line)){ inChk = true; return; }
    if(inChk){ chk.push(line); return; }
    const m = line.match(/^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*([๐-๙0-9]{1,2})\s*[\.\)]\s*(.*)$/);
    if(m && thNum(m[1]) === cur + 2 && cur + 2 <= 13 && pdIsTitle(m[2], cur + 1)){
      cur++;
      const after = m[2].split(/[:：]/).slice(1).join(":").replace(/\*\*/g,"").trim();
      if(after) sec[cur] = after;
      return;
    }
    if(cur >= 0) sec[cur] += (sec[cur] ? "\n" : "") + line;
  });
  return { sec: sec.map(x=>x.trim()), chk: chk.join("\n").trim(), found: cur >= 0 };
}
/* เลขไทย → เลขอารบิก (ตามตัวอย่างฟอร์มที่ใช้เลขอารบิกทั้งเอกสาร) */
const pdAr = x => String(x ?? "").replace(/[๐-๙]/g, d => "๐๑๒๓๔๕๖๗๘๙".indexOf(d));
/* ในสมการ $...$: แปลง a/b เป็นเศษส่วน \frac{a}{b} ให้อัตโนมัติ (กรณี AI เขียน (f/g)(x) หรือ x/2) */
function pdFixMath(t){
  return String(t).replace(/\$\$([^$]+)\$\$|\$([^$]+)\$/g, (m, a, b) => {
    const body = a !== undefined ? a : b;
    if(/\\text|\\frac/.test(body) && !/[A-Za-z0-9)]\/[A-Za-z0-9(]/.test(body.replace(/\\text\{[^}]*\}/g,""))) return m;
    let r = body.replace(/\(([A-Za-z0-9]+)\/([A-Za-z0-9]+)\)/g, "\\left(\\frac{$1}{$2}\\right)")
                .replace(/(?<![A-Za-z0-9\\])([A-Za-z0-9]+)\/([A-Za-z0-9]+)(?![A-Za-z0-9])/g, "\\frac{$1}{$2}");
    return a !== undefined ? "$$" + r + "$$" : "$" + r + "$";
  });
}
/* ข้อความจาก AI → HTML (หัวขั้น/ชั่วโมง ข้อเลข รายการ ตาราง)
   ข้อเลข (1. 2. 3.) ในเนื้อหาชุดเดียวกันใช้การเยื้องแบบเดียวกันทั้งหมด และบรรทัดที่ AI ตัดต่อท้ายข้อเลขจะถูกรวมเป็นย่อหน้าเดียวกัน */
function pdMd(t){
  const esc = x => escH(pdFixMath(pdAr(x))).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/&lt;br\s*\/?&gt;/gi,"<br>");
  const lines = String(t||"").split(/\r?\n/), items = [];
  const isNum = x => /^(?:\d+[\.\)]|\([ก-ฮ]\))\s+/.test(pdAr(x).trim());
  const longN = lines.some(l => isNum(l) && pdAr(l).trim().length > 70);
  let i = 0;
  while(i < lines.length){
    const ln = lines[i];
    if(/^\s*\|/.test(ln)){
      const rows = [];
      while(i < lines.length && /^\s*\|/.test(lines[i])){ rows.push(lines[i]); i++; }
      const cells = r => r.trim().replace(/^\||\|$/g,"").split("|").map(c=>c.trim());
      const data = rows.filter(r=>!/^\s*\|?[\s:\-|]+\|?\s*$/.test(r)).map(cells);
      items.push({ t:"html", h: '<table class="dt">' + data.map((r,ri)=>{
        if(ri > 0 && r.length > 1 && r[0] && r.slice(1).every(c=>!c)) return `<tr><td colspan="${r.length}" class="g">${esc(r[0])}</td></tr>`;
        return "<tr>" + r.map(c=>`<${ri?"td":"th"}>${esc(c)}</${ri?"td":"th"}>`).join("") + "</tr>";
      }).join("") + "</table>" });
      continue;
    }
    const tx = ln.trim(), ta = pdAr(tx);
    const b = ln.match(/^\s*[-*•]\s+(.*)$/);
    const hd = ln.match(/^\s*#{1,6}\s*(.*)$/);
    const kpa = ta.match(/^(ด้าน[^:：]{1,30})[:：]\s*(.+)$/);
    if(b) items.push({ t:"li", x:b[1] });
    else if(hd) items.push({ t:"st", x:hd[1] });
    else if(/^(ตัวชี้วัดระหว่างทาง|ตัวชี้วัดปลายทาง|ตัวชี้วัด|สื่อการเรียนรู้|แหล่งการเรียนรู้|ผลการเรียนรู้)\s*[:：]?$/.test(ta)) items.push({ t:"st", x:tx.replace(/[:：]$/,"") });
    else if((/^ขั้น\S/.test(ta) && ta.length <= 60) || (/^ชั่วโมงที่\s*\d/.test(ta) && ta.length <= 90)) items.push({ t:"st", x:tx.replace(/[:：]$/,"") });
    else if(kpa) items.push({ t:"st", x:kpa[1] }, { t:"ind", x:kpa[2] });
    else if(isNum(tx)) items.push({ t:"n", x:tx });
    else if(tx){
      const last = items[items.length - 1], prevBlank = i > 0 && !lines[i-1].trim();
      if(last && last.t === "n" && !prevBlank && (/^\(/.test(tx) || /(?:ดังนี้|[:：,])$/.test(last.x))) last.x += " " + tx;
      else items.push({ t:"p", x:tx });
    }
    i++;
  }
  let h = "", ul = false;
  items.forEach(it=>{
    if(it.t !== "li" && ul){ h += "</ul>"; ul = false; }
    if(it.t === "li"){ if(!ul){ h += "<ul>"; ul = true; } h += `<li>${esc(it.x)}</li>`; }
    else if(it.t === "html") h += it.h;
    else if(it.t === "n") h += `<p class="n${longN ? " l" : ""}">${esc(it.x)}</p>`;
    else h += `<p${it.t === "p" ? "" : ` class="${it.t}"`}>${esc(it.x)}</p>`;
  });
  if(ul) h += "</ul>";
  return h;
}
/* คุณลักษณะ / สมรรถนะ: แสดงครบทุกข้อเป็นช่อง ☑ ☐ (ติ๊กตามที่ครูเลือก หรือตามชื่อที่ AI เขียน) */
function pdChk(list, picked, text, cols){
  text = String(text || "");
  const sel = (picked && picked.length) ? picked : list.filter(x => text.includes(x));
  if(!sel.length) return text.trim() ? pdMd(text) : "<p>-</p>";
  const cells = list.map(x => `<td>${sel.includes(x) ? "☑" : "☐"} ${escH(x)}</td>`);
  let h = '<table class="ck">';
  for(let i = 0; i < cells.length; i += cols) h += "<tr>" + cells.slice(i, i + cols).join("") + "</tr>";
  return h + "</table>";
}
/* หัวข้อ 7 ข้อความคงที่ตามตัวอย่าง */
function pdFocus(){
  const ck = x => `<p class="ck">☑ ${escH(x)}</p>`;
  const r3 = ["Reading (อ่านออก)","(W) Riting (เขียนได้)","(A) Rithmetics (คิดเลขเป็น)"];
  const c8 = ["ทักษะด้านการคิดอย่างมีวิจารณญาณและทักษะในการแก้ไขปัญหา (Critical Thinking and Problem Solving)","ทักษะด้านการสร้างสรรค์ และนวัตกรรม (Creativity and Innovation)","ทักษะด้านความเข้าใจความต่างวัฒนธรรม ต่างกระบวนทัศน์ (Cross-cultural Understanding)","ทักษะด้านความร่วมมือ การทำงานเป็นทีมและภาวะผู้นำ (Collaboration, Teamwork and Leadership)","ทักษะด้านการสื่อสาร สารสนเทศและรู้เท่าทันสื่อ (Communication, Information, and Media Literacy)","ทักษะด้านคอมพิวเตอร์ และเทคโนโลยีสารสนเทศและการสื่อสาร (Computing and ICT Literacy)","ทักษะอาชีพ และทักษะการเรียนรู้ (Career and Learning)","ทักษะการเปลี่ยนแปลง (Change)"];
  const l2 = ["ความยืดหยุ่นและการปรับตัว","การริเริ่มสร้างสรรค์และเป็นตัวของตัวเอง","ทักษะสังคมและสังคมข้ามวัฒนธรรม","การเป็นผู้สร้างหรือผู้ผลิต (Productivity) และความรับผิดชอบเชื่อถือได้ (Accountability)","ภาวะผู้นำและความรับผิดชอบ (Responsibility)"];
  const l3 = ["คุณลักษณะด้านการทำงาน ได้แก่ การปรับตัว ความเป็นผู้นำ","คุณลักษณะด้านการเรียนรู้ ได้แก่ การชี้นำตนเอง การตรวจสอบการเรียนรู้ของตนเอง","คุณลักษณะด้านศีลธรรม ได้แก่ ความเคารพผู้อื่น ความซื่อสัตย์ ความสำนึกพลเมือง"];
  return '<p class="st">7.1 ทักษะของคนในศตวรรษที่ 21 คือการเรียนรู้ 3R x 8C</p>' + r3.concat(c8).map(ck).join("")
    + '<p class="st">7.2 ทักษะด้านชีวิตและอาชีพ ของคนในศตวรรษที่ 21</p>' + l2.map(ck).join("")
    + '<p class="st">7.3 คุณลักษณะของคนในศตวรรษที่ 21</p>' + l3.map(ck).join("");
}
/* ขนาดสมการเทียบกับตัวอักษรไทย (ฟอนต์ TH Sarabun ตัวเล็ก จึงต้องย่อสมการลง) — ใหญ่ไป ลดเลข / เล็กไป เพิ่มเลข */
const PD_MATH_SIZE = 0.8;
/* ใช้ฟอนต์ Latin Modern Math จริง: ใส่ URL ไฟล์ latinmodern-math.woff2 ที่โฮสต์เอง (เช่น "/fonts/latinmodern-math.woff2")
   ถ้าเว้นว่าง ใช้สมการแบบ KaTeX ซึ่งเป็นฟอนต์ Computer Modern (ตระกูลเดียวกับ Latin Modern) */
const PD_LM_URL = "";
/* สคริปต์ในหน้าพิมพ์: แปลง $...$ / $$...$$ เป็นสมการ (KaTeX) แล้วค่อยสั่งพิมพ์ — ถ้าโหลด KaTeX ไม่ได้ก็พิมพ์ต่อ (สมการจะเป็นข้อความ LaTeX) */
const PD_KATEX = '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>'
  + '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>'
  + '<script>(function(){var done=false;function go(){if(done)return;done=true;'
  + 'try{if(window.renderMathInElement)renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false' + (PD_LM_URL ? ',output:"mathml"' : '') + '});document.querySelectorAll(".katex").forEach(function(e){var p=e.closest("p,li,td");if(p)p.style.textAlign="left";});}catch(e){}'
  + 'var p=function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},300);};'
  + '(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(p,p);}'
  + 'window.addEventListener("load",go);setTimeout(go,8000);})();<\/script>';
function pdFull(print){
  const v = PF.v, g = pdAr(PL.grade || ""), tch = (v.teacher ?? PF_TEACHER).trim();
  const pn = (v.planName ?? PF_PLAN0).trim() || "แผนการสอน";
  const T = x => (x == null ? "" : String(x)).trim();
  const j = (...a) => a.filter(Boolean).join(" ");
  const subj = pfSubject();
  const gm = pdAr(PL.grade || "").match(/^(ม|ป)\.?\s*(\d)/);
  const gFull = gm ? (gm[1] === "ม" ? "ชั้นมัธยมศึกษาปีที่ " : "ชั้นประถมศึกษาปีที่ ") + gm[2] : (g ? "ชั้น " + g : "");
  const hrs = /^\d+(\.\d+)?$/.test(pdAr(T(v.hours))) ? pdAr(T(v.hours)) + " ชั่วโมง" : T(v.hours);
  const infoRows = [
    ["กลุ่มสาระการเรียนรู้คณิตศาสตร์", T(v.school ?? PF_SCHOOL0)],
    [subj ? j("รายวิชา", subj, T(v.code) && "รหัส " + T(v.code)) : "", gFull],
    [T(v.unit) ? "หน่วยการเรียนรู้ " + T(v.unit) : "", j(T(v.term) && "ภาคเรียนที่ " + T(v.term), T(v.year) && "ปีการศึกษา " + T(v.year))],
    [T(v.topic) ? "เรื่อง " + T(v.topic) : "", j(hrs && "เวลา " + hrs, tch && "ผู้สอน " + tch)]
  ].filter(r => r[0] || r[1]);
  const rows = infoRows.map(r => `<tr><td>${escH(pdAr(r[0]))}</td><td class="r">${escH(pdAr(r[1]))}</td></tr>`).join("");
  const dots = n => Array(n).fill('<div class="dot">&nbsp;</div>').join("");
  const sig = `<div class="sig"><p>ลงชื่อ...............................................ครูผู้สอน</p><p>(${tch ? escH(tch) : "................................................."})</p><p>............./................../..............</p></div>`;
  const body = PF_SEC.map((t,i)=>{
    const c = (PF.sec[i] || "").trim();
    let inner;
    if(i === 4) inner = pdChk(PF_TRAIT, PF.trait, c, 4);
    else if(i === 5) inner = pdChk(PF_COMP, PF.comp, c, 2);
    else if(i === 6) inner = pdFocus();
    else inner = c ? pdMd(c) : "<p>-</p>";
    return `<div class="h">${i+1}. ${escH(pdSecTitle(i))}</div><div class="sec">${inner}</div>`;
  }).join("");
  const note = `<div class="pb"></div><div class="h">บันทึกผลหลังการสอน</div><div class="sec">`
    + ["ข้อสังเกต/ข้อค้นพบ","แนวทางแก้ไขเพื่อการปรับปรุงพัฒนา","ผลการพัฒนา (บันทึกหลังจากที่ได้พัฒนาผู้เรียนด้วยวิธีการต่าง ๆ แล้ว)"].map(x=>`<p class="st">${x}</p>${dots(4)}`).join("")
    + `</div>${sig}`;
  const th = (x, a = "") => `<th ${a}>${x}</th>`;
  const items = ["รับผิดชอบงานที่ได้รับมอบหมาย","รับฟังความคิดเห็นของผู้อื่น","ให้ความร่วมมือ","นำเสนอผลงานได้น่าสนใจ","ทำงานเสร็จตามเวลาที่กำหนด"];
  const obs = `<div class="pb"></div><h2>แบบสังเกตพฤติกรรมการเข้าร่วมกิจกรรมกลุ่ม</h2>
<p class="cl"><b>คำชี้แจง</b> ให้ทำเครื่องหมาย ✓ ลงในช่องรายการสังเกตพฤติกรรมที่นักเรียนปฏิบัติ</p>
<table class="dt ob"><tr>${th("เลขที่",'rowspan="2" style="width:7%"')}${th("ชื่อ-สกุล",'rowspan="2" style="width:21%"')}${th("รายการสังเกตพฤติกรรม",'colspan="5"')}${th("รวมคะแนน",'rowspan="2" style="width:9%"')}${th("สรุปผล",'colspan="2"')}</tr>
<tr>${items.map(x=>th(x,'style="width:9%"')).join("")}${th("ผ่าน",'style="width:6%"')}${th("ไม่ผ่าน",'style="width:6%"')}</tr>
<tr><td></td><td class="c"><b>คะแนนเต็ม</b></td>${[4,4,4,4,4,20].map(x=>`<td class="c">${x}</td>`).join("")}<td></td><td></td></tr>
${Array.from({length:12},(_,k)=>`<tr class="er"><td class="c">${k+1}</td>${"<td>&nbsp;</td>".repeat(9)}</tr>`).join("")}</table>
<p class="st2">เกณฑ์การประเมิน</p>
<p class="cl2">คะแนน 18-20 ระดับ ดีมาก</p><p class="cl2">คะแนน 14-17 ระดับ ดี</p><p class="cl2">คะแนน 11-13 ระดับ พอใช้</p><p class="cl2">คะแนน 0-10 ระดับ ควรปรับปรุง</p>${sig}`;
  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="th"><head><meta charset="utf-8"><title>${escH(pn)}</title>
<style>
${print ? "@page{size:A4; margin:2.5cm 2.3cm 2cm 3.5cm;}" : "@page WordSection1{size:595.3pt 841.9pt; margin:70.9pt 65pt 56.7pt 99pt;} div.WordSection1{page:WordSection1;}"}
body{font-family:'TH Sarabun New','TH SarabunPSK','Sarabun',Tahoma,sans-serif; font-size:16pt; line-height:1.3; color:#000;}
h1{font-size:18pt; font-weight:bold; text-align:center; margin:0 0 10pt;}
h2{font-size:17pt; font-weight:bold; text-align:center; margin:0 0 6pt;}
table.info{width:100%; border-collapse:collapse;}
table.info td{border:0; padding:0 0 3pt; font-weight:bold; vertical-align:top; font-size:16pt;} table.info td.r{text-align:right; white-space:nowrap; padding-left:10pt;}
.rule{border-top:2.25pt solid #000; margin:3pt 0 6pt; height:1pt; font-size:1pt;}
.h{font-weight:bold; margin:14pt 0 3pt; page-break-after:avoid;}
.sec{margin-left:0; text-align:justify; text-justify:inter-character;}
.sec p{margin:0 0 3pt; text-indent:1.4cm;}
.sec p.st{font-weight:bold; margin-top:5pt; text-indent:0.7cm; page-break-after:avoid;}
.sec p.ind{text-indent:0.7cm;}
.sec p.n{text-indent:0.7cm;} .sec p.n.l{text-indent:1.4cm;}
.sec p.ck{margin-left:1.4cm; text-indent:-0.6cm; margin-bottom:1pt; text-align:left;}
.sec ul{margin:0 0 3pt; padding-left:2.2cm;} .sec li{margin:0;}
table.ck{border-collapse:collapse; width:100%; margin-left:0.7cm;} table.ck td{border:0; padding:0 6pt 1pt 0; vertical-align:top;}
table.dt{border-collapse:collapse; width:100%; margin:4pt 0;}
.dt td,.dt th{border:1px solid #000; padding:2pt 5pt; vertical-align:top; font-size:15pt; text-align:left; text-indent:0;} .dt th{text-align:center; font-weight:bold;} .dt td.g{font-weight:bold;}
table.ob{table-layout:fixed;} .ob th{font-size:13pt; vertical-align:middle; padding:2pt 2pt;} .ob td{font-size:14pt; padding:2pt 3pt;} .ob td.c{text-align:center;} .ob tr.er td{height:22pt;}
tr{page-break-inside:avoid;}
.pb{page-break-before:always; height:0; font-size:1pt; line-height:1pt;}
.dot{border-bottom:1px dotted #000; height:20pt; line-height:20pt; margin:0;}
.sig{margin-left:50%; margin-top:18pt; text-align:center; page-break-inside:avoid;} .sig p{margin:0; text-indent:0;}
p.cl{margin:0 0 6pt;} p.st2{font-weight:bold; margin:8pt 0 2pt;} p.cl2{margin:0 0 1pt 0.7cm;}
.katex{font-size:${PD_LM_URL ? 1 : PD_MATH_SIZE}em !important; line-height:1.15 !important; font-weight:normal; padding:0 1.5pt;} .katex-display{margin:5pt 0 !important;} .katex-display > .katex{padding:0;}
${print && PD_LM_URL ? `@font-face{font-family:"LMMathWeb"; src:local("Latin Modern Math"), local("LatinModernMath-Regular"), url("${PD_LM_URL}") format("woff2");} math{font-family:"LMMathWeb","Latin Modern Math",serif; font-size:1em;}` : ""}
</style>${print && !PD_LM_URL ? `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">` : ""}</head><body><div class="WordSection1"><h1>${escH(pn)}</h1><table class="info">${rows}</table><div class="rule">&nbsp;</div>${body}${note}${obs}</div>${print ? PD_KATEX : ""}</body></html>`;
}
function pdFileName(){ return ((PF.v.planName ?? PF_PLAN0).trim() || "แผนการสอน").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80); }
function pdWord(){
  const blob = new Blob(["\ufeff", pdFull(false)], { type:"application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = pdFileName() + ".doc";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  say("กำลังดาวน์โหลดไฟล์ Word");
}
function pdPrint(){
  const w = window.open("", "_blank");
  if(!w){ say("เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาตป๊อปอัปแล้วลองอีกครั้ง"); return; }
  w.document.open(); w.document.write(pdFull(true)); w.document.close();
}

function pfShow(){
  const on = !!PL.grade;
  if(pl.form) pl.form.style.display = on ? "" : "none";
  if(pl.doc) pl.doc.style.display = on ? "" : "none";
}
function pfInit(v){
  const w = pl.form, d = pl.doc;
  w.innerHTML = pfFormHtml(); d.innerHTML = pdFormHtml();
  const q = id => $(id, w), qd = id => $(id, d);
  const upd = () => { const o = q("#pfOut"), l = q("#pfLen"); if(o && l) l.textContent = `${plNum(o.value.length.toLocaleString("en-US"))} ตัวอักษร`; };
  const toggle = e => {
    const t = e.target.closest(".pf-toggle"); if(!t) return false;
    const card = t.closest(".pf-card"), k = t.dataset.open;
    card.classList.toggle("collapsed"); PF.open[k] = !card.classList.contains("collapsed"); pfSave(); return true;
  };

  w.addEventListener("input", e=>{
    const el = e.target.closest("[data-f]");
    if(el){ PF.v[el.dataset.f] = el.value; pfSave(); }
    if(e.target.id === "pfOut") upd();
  });
  w.addEventListener("change", e=>{
    const el = e.target.closest("select[data-f]"); if(!el) return;
    PF.v[el.dataset.f] = el.value; pfSave();
    if(el.dataset.f === "subj") q("#pfSubjCustom").style.display = el.value === "custom" ? "" : "none";
    if(el.dataset.f === "subj" || el.dataset.f === "term") pfCodeRefresh();
  });
  w.addEventListener("click", e=>{
    if(toggle(e)) return;
    const chk = e.target.closest(".pf-chk");
    if(chk){
      const a = PF[chk.dataset.grp], x = chk.dataset.v, i = a.indexOf(x);
      i < 0 ? a.push(x) : a.splice(i,1);
      chk.classList.toggle("on", i < 0); pfSave(); return;
    }
    if(e.target.closest("#pfCodeEdit")){
      pf.editing = !pf.editing;
      if(pf.editing) PF.v.codeManual = true;
      else if(!(PF.v.code || "").trim()) PF.v.codeManual = false;
      pfCodeRefresh();
      if(pf.editing){ const i = q("#pfCode"); i.focus(); i.select(); }
      return;
    }
    if(e.target.closest("#pfCodeAuto")){ PF.v.codeManual = false; pf.editing = false; pfCodeRefresh(); return; }
    if(e.target.closest("#pfGo")){
      if(!PL.grade){ say("เลือกระดับชั้นก่อนนะครับ"); return; }
      if(!plAllItems().some(it=>plSel().has(it.key))) say("ยังไม่ได้เลือกตัวชี้วัด — Prompt จะให้ AI ขอตัวชี้วัดจากครู");
      q("#pfOut").value = pfPrompt(); q("#pfOutWrap").style.display = ""; upd();
      q("#pfOutWrap").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block:"start" });
      return;
    }
    if(e.target.closest("#pfCopy")){ pfCopyText(q("#pfOut").value, "คัดลอก Prompt แล้ว นำไปวางใน AI ได้เลย"); return; }
    if(e.target.closest("#pfReset")){
      if(!confirm("ล้างข้อมูลที่กรอกในฟอร์มทั้งหมด?")) return;
      PF.v = {}; PF.comp = []; PF.trait = []; pf.editing = false; pfSave();
      w.innerHTML = pfFormHtml(); pfCodeRefresh();
    }
  });

  d.addEventListener("input", e=>{
    if(e.target.id === "pdRaw"){ PF.raw = e.target.value; pfSave(); return; }
    const s = e.target.closest("[data-s]");
    if(s){ PF.sec[+s.dataset.s] = s.value; pfSave(); }
  });
  d.addEventListener("click", e=>{
    if(toggle(e)) return;
    if(e.target.closest("#pdSplit")){
      const r = pdSplit(qd("#pdRaw").value);
      if(!r.found){ say("ไม่พบหัวข้อ ๑. ๒. ๓. … ในข้อความ ลองวางทีละหัวข้อในช่องด้านล่างแทนนะครับ"); return; }
      PF.sec = r.sec; PF.chk = r.chk; pfSave();
      d.querySelectorAll("[data-s]").forEach(t=>{ t.value = PF.sec[+t.dataset.s] || ""; });
      qd("#pdChk").value = PF.chk; qd("#pdChkBox").style.display = PF.chk ? "" : "none";
      say("แยกเป็นหัวข้อแล้ว ตรวจและแก้ไขได้เลย");
      return;
    }
    if(e.target.closest("#pdWord")){ pdWord(); return; }
    if(e.target.closest("#pdPrint")){ pdPrint(); return; }
    if(e.target.closest("#pdClear")){
      if(!confirm("ล้างเนื้อหาขั้นที่ ๒ ทั้งหมด?")) return;
      PF.raw = ""; PF.sec = []; PF.chk = ""; pfSave(); d.innerHTML = pdFormHtml();
    }
  });
  pfShow(); pfCodeRefresh();
}

registerTool({
  id:"plan", icon:"📝", color:"c-blue", title:"แผนการสอน", desc:"เลือกตัวชี้วัด · สร้าง Prompt ให้ AI ร่างแผน · ทำเป็นไฟล์",
  html:`<div class="card">
      <div class="tl-sub">คณิตศาสตร์ · ตัวชี้วัดแกนกลาง ฉบับปรับปรุง พ.ศ. ๒๕๖๐</div>
      <button type="button" class="pl-pick" id="plPickGrade"><small>ระดับชั้น</small><b id="plGradeTxt">แตะเพื่อเลือก</b><i>›</i></button>
      <button type="button" class="pl-pick" id="plPickInd"><small>ตัวชี้วัด</small><b id="plIndTxt">เลือกระดับชั้นก่อน</b><i>›</i></button>
      <div id="plSum"></div>
    </div>
    <div id="plFormWrap"></div>
    <div id="plDocWrap"></div>`,
  init(v){
    pl.view = v; pl.sum = $("#plSum", v); pl.form = $("#plFormWrap", v); pl.doc = $("#plDocWrap", v);
    pmEnsure();
    v.addEventListener("click", e=>{
      if(e.target.closest("#plPickGrade")){ plOpenGrade(); return; }
      if(e.target.closest("#plPickInd")){ plOpenInd(); return; }
      const rm = e.target.closest("[data-rm]");
      if(rm){ plSetKey(rm.dataset.rm, false); plUpdate(); }
    });
    pfInit(v);
    plRender();
  }
});

const plStyle = document.createElement("style");
plStyle.id = "plCss";
plStyle.textContent = `
#view-tool-plan{--c-main:#4285F4; --c-bg:#E8F0FE; --c-ink:#1B4FB5; --c-sh:rgba(66,133,244,.6); --c-on:#fff;}
.pl-gl{font-size:12.5px; font-weight:600; color:var(--ink-soft); margin:12px 2px 6px;}
.pl-grades{display:flex; flex-wrap:wrap; gap:8px;}
.pl-chip{min-width:58px; padding:9px 14px; border-radius:14px; border:1.5px solid #E1E7F3; background:#fff; color:var(--ink); font:inherit; font-size:15px; font-weight:600; cursor:pointer; transition:background .2s,border-color .2s,color .2s;}
.pl-chip.on{background:var(--c-main); border-color:var(--c-main); color:var(--c-on);}
.pl-sh{display:flex; justify-content:space-between; align-items:flex-start; gap:10px;}
.pl-sh b{display:block; font-family:'Noto Serif Thai',serif; font-size:15px; color:var(--ink);}
.pl-sh small{display:block; margin-top:2px; font-size:12.5px; line-height:1.5; color:var(--ink-soft);}
.pl-all{flex:0 0 auto; padding:5px 10px; border-radius:12px; border:1.5px solid var(--c-main); background:transparent; color:var(--c-ink); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;}
.pl-it{position:relative; display:flex; align-items:flex-start; gap:10px; margin-top:8px; padding:10px; border-radius:14px; border:1.5px solid #E1E7F3; background:#fff; cursor:pointer; transition:background .2s,border-color .2s;}
.pl-it input{position:absolute; opacity:0; pointer-events:none;}
.pl-it:focus-within{outline:2px solid var(--c-main); outline-offset:1px;}
.pl-box{flex:0 0 22px; height:22px; margin-top:1px; border-radius:7px; border:2px solid #B9C3DA; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:transparent;}
.pl-box::after{content:"✓";}
.pl-it.on{background:var(--c-bg); border-color:var(--c-main);}
.pl-it.on .pl-box{background:var(--c-main); border-color:var(--c-main); color:var(--c-on);}
.pl-tx{font-size:14px; line-height:1.6; color:var(--ink);}
.pl-tx i,.pl-pk i{display:block; font-style:normal; font-size:12px; font-weight:700; color:var(--c-ink);}
.pl-none{margin-top:8px;}
.pl-nonebar{margin:4px 2px 0;}
.pl-bar{position:sticky; bottom:12px; z-index:5; display:flex; align-items:center; gap:8px; margin-top:14px; padding:10px 12px 10px 16px; border-radius:18px; background:var(--c-main); color:var(--c-on); box-shadow:0 14px 26px -14px var(--c-sh);}
.pl-bar span{flex:1; font-size:14px; font-weight:600;}
.pl-bar button{padding:7px 12px; border-radius:12px; border:0; background:rgba(255,255,255,.22); color:var(--c-on); font:inherit; font-size:13.5px; font-weight:600; cursor:pointer;}
.pl-bar #plCopy{background:#fff; color:var(--c-ink);}
.pl-sg{margin:12px 0 4px; font-size:12.5px; font-weight:600; color:var(--ink-soft);}
.pl-pk{display:flex; align-items:flex-start; gap:8px; padding:8px 0; border-top:1px solid #E8ECF5; font-size:14px; line-height:1.6; color:var(--ink);}
.pl-pk span{flex:1;}
.pl-pk button{flex:0 0 auto; width:28px; height:28px; border-radius:50%; border:0; background:#F1F3F9; color:var(--ink-soft); font:inherit; cursor:pointer;}
html[data-theme="dark"] .pl-chip,html[data-theme="black"] .pl-chip,html[data-theme="dark"] .pl-it,html[data-theme="black"] .pl-it{background:#1d2233; border-color:#2c3450;}
html[data-theme="dark"] .pl-chip.on,html[data-theme="black"] .pl-chip.on{background:var(--c-main); border-color:var(--c-main);}
html[data-theme="dark"] .pl-it.on,html[data-theme="black"] .pl-it.on{background:rgba(66,133,244,.2); border-color:var(--c-main);}
html[data-theme="dark"] .pl-box,html[data-theme="black"] .pl-box{border-color:#4a5578;}
html[data-theme="dark"] .pl-it.on .pl-box,html[data-theme="black"] .pl-it.on .pl-box{border-color:var(--c-main);}
html[data-theme="dark"] .pl-tx i,html[data-theme="black"] .pl-tx i,html[data-theme="dark"] .pl-pk i,html[data-theme="black"] .pl-pk i,html[data-theme="dark"] .pl-all,html[data-theme="black"] .pl-all{color:#9DBBFF;}
html[data-theme="dark"] .pl-pk,html[data-theme="black"] .pl-pk{border-top-color:#2c3450;}
html[data-theme="dark"] .pl-pk button,html[data-theme="black"] .pl-pk button{background:#2c3450;}

.pf-card{margin-top:14px;}
.pf-t{margin:18px 0 8px; font-family:'Noto Serif Thai',serif; font-size:14.5px; font-weight:600; color:var(--ink);}
.pf-t small{display:block; margin-top:2px; font-family:inherit; font-size:12px; font-weight:400; color:var(--ink-soft);}
.pf-2{display:grid; grid-template-columns:1fr; gap:0 12px;}
html.mode-pc .pf-2{grid-template-columns:1fr 1fr;}
.pf-chips{display:flex; flex-wrap:wrap; gap:8px;}
.pf-chk{padding:8px 12px; border-radius:12px; border:1.5px solid #E1E7F3; background:#fff; color:var(--ink); font:inherit; font-size:13.5px; font-weight:600; cursor:pointer; text-align:left; transition:background .2s,border-color .2s,color .2s;}
.pf-chk.on{background:var(--c-main); border-color:var(--c-main); color:var(--c-on);}
.pf-out{min-height:340px; font-size:13px; line-height:1.7;}
html[data-theme="dark"] .pf-chk,html[data-theme="black"] .pf-chk{background:#1d2233; border-color:#2c3450;}
html[data-theme="dark"] .pf-chk.on,html[data-theme="black"] .pf-chk.on{background:var(--c-main); border-color:var(--c-main);}

.pl-pick{display:flex; align-items:center; gap:10px; width:100%; margin-top:10px; padding:12px 14px; border-radius:16px; border:1.5px solid #E1E7F3; background:#fff; color:var(--ink); font:inherit; text-align:left; cursor:pointer; transition:border-color .2s,background .2s;}
.pl-pick small{flex:0 0 74px; font-size:12.5px; font-weight:600; color:var(--ink-soft);}
.pl-pick b{flex:1; font-size:15px; font-weight:600; color:var(--ink-soft);}
.pl-pick i{font-style:normal; font-size:22px; line-height:1; color:var(--ink-soft);}
.pl-pick.set{border-color:var(--c-main); background:var(--c-bg);} .pl-pick.set b{color:var(--c-ink);}
#plSum{margin-top:6px;}
.pl-clamp{display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;}
.pm-back{--c-main:#4285F4; --c-bg:#E8F0FE; --c-ink:#1B4FB5; --c-sh:rgba(66,133,244,.6); --c-on:#fff; position:fixed; inset:0; z-index:500; display:none; align-items:flex-end; justify-content:center; background:rgba(15,20,40,.5);}
.pm-back.show{display:flex; animation:pmFade .2s;}
.pm-sheet{width:100%; max-width:640px; max-height:88vh; display:flex; flex-direction:column; background:#fff; border-radius:24px 24px 0 0; box-shadow:0 -12px 40px -16px rgba(0,0,0,.4); padding-bottom:env(safe-area-inset-bottom); animation:pmUp .28s cubic-bezier(.2,.8,.2,1);}
html.mode-pc .pm-back{align-items:center;} html.mode-pc .pm-sheet{border-radius:24px; max-height:84vh;}
.pm-head{display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px 16px; border-bottom:1.5px solid #EEF1F8;}
.pm-head b{font-family:'Noto Serif Thai',serif; font-size:16px; color:var(--ink);}
.pm-act{display:flex; align-items:center; gap:8px;}
.pm-act span{font-size:13px; color:var(--ink-soft);}
.pm-act button{padding:7px 12px; border-radius:12px; border:1.5px solid #E1E7F3; background:#fff; color:var(--ink); font:inherit; font-size:13.5px; font-weight:600; cursor:pointer;}
.pm-act .pm-done{background:var(--c-main); border-color:var(--c-main); color:var(--c-on);}
.pm-body{padding:8px 16px 20px; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain;}
.pm-sec{padding:12px 0; border-bottom:1px solid #EEF1F8;} .pm-sec:last-child{border-bottom:0;}
@keyframes pmFade{from{opacity:0}to{opacity:1}} @keyframes pmUp{from{transform:translateY(40px); opacity:0}to{transform:none; opacity:1}}
.pf-toggle{display:flex; width:100%; align-items:center; justify-content:space-between; gap:10px; padding:0; border:0; background:none; color:var(--ink); font:inherit; text-align:left; cursor:pointer;}
.pf-toggle span{font-family:'Noto Serif Thai',serif; font-size:15px; font-weight:600;}
.pf-toggle i{font-style:normal; transition:transform .2s;}
.pf-card.collapsed .pf-toggle i{transform:rotate(-90deg);} .pf-card.collapsed .pf-collapse{display:none;}
.pf-collapse{margin-top:8px;}
.pf-hint{font-weight:400; color:var(--ink-soft);}
.pf-code{display:flex; gap:8px;} .pf-code input{flex:1; min-width:0;}
.pf-code button{flex:0 0 44px; border-radius:12px; border:1.5px solid #E1E7F3; background:#fff; font:inherit; font-size:16px; cursor:pointer; color:var(--ink);}
.pf-code input[readonly]{opacity:.85;}
.pd-btns{display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;}
html[data-theme="dark"] .pl-pick,html[data-theme="black"] .pl-pick,html[data-theme="dark"] .pf-code button,html[data-theme="black"] .pf-code button{background:#1d2233; border-color:#2c3450;}
html[data-theme="dark"] .pl-pick.set,html[data-theme="black"] .pl-pick.set{background:rgba(66,133,244,.2); border-color:var(--c-main);}
html[data-theme="dark"] .pm-sheet,html[data-theme="black"] .pm-sheet{background:#171b2b;}
html[data-theme="dark"] .pm-head,html[data-theme="black"] .pm-head,html[data-theme="dark"] .pm-sec,html[data-theme="black"] .pm-sec{border-color:#2c3450;}
html[data-theme="dark"] .pm-act button,html[data-theme="black"] .pm-act button{background:#1d2233; border-color:#2c3450;}
html[data-theme="dark"] .pm-act .pm-done,html[data-theme="black"] .pm-act .pm-done{background:var(--c-main); border-color:var(--c-main);}
`;
document.head.appendChild(plStyle);

/* =====================================================================
   เครื่องมือ: แบบฝึกหัด — เลือกชั้น/เรื่อง/ตัวชี้วัด → ได้ Prompt ให้ AI ออกโจทย์ง่าย→ยาก (พร้อมคัดลอก + AI คิดจำนวนบรรทัดตอบให้)
   → วางคำตอบของ AI → สร้างใบงาน ๑ หน้า A4 (การ์ดโจทย์ เส้นประ) พิมพ์ / บันทึกเป็น PDF
   รูปแบบที่ AI ต้องส่งกลับ (ทีละข้อ ๑ บรรทัด):  ข้อ | จำนวนบรรทัดตอบ | โจทย์   (// = ขึ้นบรรทัดใหม่ในข้อ, [__] = ช่องเติมคำตอบ)
   ===================================================================== */
const EX_KEY = "kc_ex_v1";
const EX = { grade:"", sel:{}, v:{}, raw:"", secs:[] };
try{
  const o = JSON.parse(localStorage.getItem(EX_KEY) || "{}") || {};
  EX.grade = o.grade || ""; EX.v = o.v || {}; EX.raw = o.raw || "";
  Object.keys(o.sel || {}).forEach(g => { EX.sel[g] = new Set(o.sel[g]); });
}catch(e){}
const exSave = () => { try{
  const sel = {}; Object.keys(EX.sel).forEach(g => { sel[g] = [...EX.sel[g]]; });
  localStorage.setItem(EX_KEY, JSON.stringify({ grade:EX.grade, sel, v:EX.v, raw:EX.raw }));
}catch(e){} };
const ex = {};              // อ้างอิง element
let exCur = null;           // ผลที่แยกจากคำตอบ AI
const exSelSet = () => EX.sel[EX.grade] || (EX.sel[EX.grade] = new Set());
const exAllItems = () => EX.secs.flatMap(s => s.items);
const exPicked = () => { const s = exSelSet(); return exAllItems().filter(it => s.has(it.key)); };

/* ---------- ฟอร์ม ---------- */
function exIn(id, label, ph, def){
  return `<div class="field"><label>${label}</label><input data-ef="${id}" value="${escH(EX.v[id] ?? def ?? "")}" placeholder="${escH(ph||"")}" autocomplete="off"></div>`;
}
function exSelect(id, label, opts, def){
  const cur = String(EX.v[id] ?? def);
  return `<div class="field"><label>${label}</label><select data-ef="${id}">`
    + opts.map(o => { const [val,txt] = Array.isArray(o) ? o : [o,o]; return `<option value="${escH(val)}"${String(val)===cur?" selected":""}>${escH(txt)}</option>`; }).join("")
    + `</select></div>`;
}
const EX_LAY = ["perPage","cols","lines","lh","lstyle","theme","title","head","gcoord"];
const EX_THEMES = [["plain","แบบปกติ","แบบปกติ"],["stitch","ตะเข็บผ้า (ขอบเย็บ + กระดุม)","ตะเข็บผ้า"],["note","โน้ตติดเทป (เงาเหลี่ยม + เทปกาว)","โน้ตติดเทป"],["star","ตราดาว (ตราประทับ + ประกาย)","ตราดาว"]];
const EX_LSTYLES = [["solid","เส้นทึบ"],["dotted","เส้นประ"],["graph","กราฟ (แกน X, Y มีขีด ไม่มีตัวเลข)"]];
/* ---------- ตั้งค่าแยกตามช่วงข้อ ---------- */
const EX_PER = [1,2,3,4,5,6,8,9,10,12];
const exPerLabel = n => n === 1 ? "1 ข้อ/หน้า (เต็มหน้า)" : n + " ข้อ/หน้า";
const EX_LH = [[5,"5 มม."],[6,"6 มม."],["7.2","7.2 มม."],[8,"8 มม."],[9,"9 มม."],[10,"10 มม."],[12,"12 มม."]];
const exGroups = () => Array.isArray(EX.v.groups) ? EX.v.groups : (EX.v.groups = []);
function exGOpt(arr, cur){ return arr.map(o => { const [val,txt] = Array.isArray(o) ? o : [o,o]; return `<option value="${escH(val)}"${String(val)===String(cur)?" selected":""}>${escH(txt)}</option>`; }).join(""); }
function exGrpHtml(){
  const g = exGroups();
  if(!g.length) return `<div class="tl-sub">ยังไม่มีช่วงข้อ — เช่น ข้อ 1–12 ให้ 6 ข้อ/หน้า แล้วข้อ 13–18 ให้ 3 ข้อ/หน้า</div>`;
  return g.map((x,i)=>`<div class="ex-g" data-gi="${i}">
    <div class="ex-gh"><b>ช่วงที่ ${plNum(i+1)}</b> ข้อ <input type="number" inputmode="numeric" min="1" data-gf="from" value="${escH(x.from ?? "")}"> ถึง <input type="number" inputmode="numeric" min="1" data-gf="to" value="${escH(x.to ?? "")}"><button type="button" class="ex-gx" data-gdel="${i}" aria-label="ลบช่วง">✕</button></div>
    <div class="ex-gs">
      <select data-gf="perPage" aria-label="ข้อต่อหน้า">${exGOpt(EX_PER.map(n=>[n,exPerLabel(n)]), x.perPage ?? 6)}</select>
      <select data-gf="cols" aria-label="การ์ดต่อแถว">${exGOpt([[2,"2 คอลัมน์"],[3,"3 คอลัมน์"],[1,"1 คอลัมน์"]], x.cols ?? 2)}</select>
      <select data-gf="lines" aria-label="บรรทัดวิธีทำ">${exGOpt([["auto","บรรทัดอัตโนมัติ"]].concat([2,3,4,5,6,7,8,10,12,15,20,25,30].map(n=>[n,n+" บรรทัด"])), x.lines ?? "auto")}</select>
      <select data-gf="lh" aria-label="ระยะห่างเส้น">${exGOpt(EX_LH.map(o=>[o[0],"ห่าง "+o[1]]), x.lh ?? "7.2")}</select>
      <select data-gf="lstyle" aria-label="ชนิดเส้น">${exGOpt([["main","ชนิดเส้น: ตามค่าหลัก"],["solid","เส้นทึบ"],["dotted","เส้นประ"],["graph","กราฟ (แกน X, Y)"]], x.lstyle ?? "main")}</select>
      <select data-gf="theme" aria-label="รูปแบบ">${exGOpt([["main","รูปแบบ: ตามค่าหลัก"]].concat(EX_THEMES.map(t=>[t[0],t[2]])), x.theme ?? "main")}</select>
    </div></div>`).join("");
}
/* ค่าตั้งของแต่ละข้อ: ช่วงข้อที่ตรงกัน (ช่วงหลังมาก่อน) ไม่งั้นใช้ค่าหลัก */
function exCfgFor(n){
  const v = EX.v, g = exGroups();
  for(let i = g.length - 1; i >= 0; i--){
    const x = g[i], a = +x.from, b = +x.to;
    if(a >= 1 && b >= a && n >= a && n <= b){
      const per = Math.max(1, +x.perPage || 6), cols0 = [1,2,3].includes(+x.cols) ? +x.cols : 2;
      return { gi:i, per, cols:Math.min(cols0, per), lines:x.lines ?? "auto", lh:x.lh ?? "7.2", lstyle:(x.lstyle && x.lstyle !== "main") ? x.lstyle : (v.lstyle || "solid"), theme:(x.theme && x.theme !== "main") ? x.theme : (v.theme || "plain") };
    }
  }
  const per0 = Math.max(1, +v.perPage || 6), cols1 = [1,2,3].includes(+v.cols) ? +v.cols : 2;
  return { gi:-1, per:per0, cols:Math.min(cols1, per0), lines:v.lines ?? "auto", lh:v.lh ?? "7.2", lstyle:v.lstyle || "solid", theme:v.theme || "plain" };
}
const EX_STEPS = [["สร้าง Prompt","ขั้นที่ ๑"],["สร้างแบบฝึกหัด","ขั้นที่ ๒"],["แก้ไข & PDF","ขั้นที่ ๓"],["รวมแบบฝึก","ขั้นที่ ๔"]];
function exStepperHtml(){
  const chk = '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return `<div class="exs" id="exSteps">` + EX_STEPS.map((x,i)=>`<button type="button" class="exs-i" data-exs="${i}" aria-label="${x[1]} ${x[0]}"><span class="exs-b"><span class="exs-c"><b>${plNum(i+1)}</b>${chk}</span></span><span class="exs-l">${x[0]}</span><span class="exs-d">${x[1]}</span></button>`).join("") + `</div>`;
}
function exFormHtml(){
  return `${exStepperHtml()}<div class="ex-vp" id="exVp"><div class="ex-tr" id="exTr"><section class="ex-sl" data-s="0"><div class="card">
    <div class="tl-sub">ขั้นที่ ๑ · บอกรายละเอียดโจทย์ แล้วสร้าง Prompt ไปวางใน AI (ChatGPT / Gemini / Claude)</div>
    <button type="button" class="pl-pick" id="exPickGrade"><small>ระดับชั้น</small><b id="exGradeTxt">แตะเพื่อเลือก</b><i>›</i></button>
    <button type="button" class="pl-pick" id="exPickInd"><small>ตัวชี้วัด</small><b id="exIndTxt">เลือกระดับชั้นก่อน (ไม่เลือกก็ได้)</b><i>›</i></button>
    <div id="exSum"></div>
    <div style="margin-top:12px;">
      ${exIn("topic", "สร้างโจทย์เรื่อง", "เช่น จุดกึ่งกลางของส่วนของเส้นตรง · การบวกลบเศษส่วน · สมการเชิงเส้นตัวแปรเดียว")}
      <div class="pf-2">
        <div class="field"><label>จำนวนข้อทั้งหมด (พิมพ์เองได้ 4–100)</label><input type="number" inputmode="numeric" min="4" max="100" step="1" data-ef="count" value="${escH(EX.v.count ?? 18)}"></div>
        ${exSelect("work", "ลักษณะโจทย์", [["much","ต้องแสดงวิธีทำทุกข้อ"],["mid","ผสม (วิธีทำ + ตอบสั้น)"],["low","ตอบสั้น/เติมคำตอบ"]], "much")}
      </div>
      <div class="pf-2">
        ${exSelect("gmode", "รูปแบบโจทย์: ข้อความ / กราฟ", [["none","โจทย์ข้อความอย่างเดียว"],["some","ผสม — บางข้อมีกราฟประกอบ"],["all","ทุกข้อมีกราฟประกอบโจทย์"]], "none")}
        <div id="exGaWrap" style="${(EX.v.gmode || "none") === "none" ? "display:none;" : ""}">${exSelect("gans", "กราฟในเฉลย", [["no","ไม่ต้องมีกราฟในเฉลย"],["yes","มีกราฟในเฉลย (เฉพาะข้อที่ช่วยอธิบาย)"]], "no")}${exSelect("gcoord", "พิกัดของจุดบนกราฟ", [["show","แสดงพิกัดทุกจุดที่มีชื่อ เช่น A(2, 1)"],["cmd","ตามคำสั่งของ AI (pt = ชื่ออย่างเดียว)"]], "show")}</div>
      </div>
      <div class="tl-sub" id="exGHint" style="margin:-4px 0 10px;${(EX.v.gmode || "none") === "none" ? "display:none;" : ""}">📈 AI จะส่งกราฟมาเป็นสมการ/พิกัดแบบ LaTeX ในโจทย์ (รูปแบบ [[G: …]]) แล้วระบบวาดแกนและเส้นกราฟให้ตอนสร้างใบงาน พร้อมปรับขนาดให้พอดีการ์ดอัตโนมัติ</div>
      <div class="field"><label>ความต้องการเพิ่มเติม <span class="pf-hint">(ไม่ใส่ก็ได้)</span></label><textarea class="tl-ta" data-ef="extra" placeholder="เช่น ข้อท้ายเป็นโจทย์ปัญหา · ใช้ตัวเลขไม่เกิน 100 · เน้นจำนวนเต็มลบ">${escH(EX.v.extra || "")}</textarea></div>
    </div>
    <button type="button" class="btn btn-primary" id="exMake">📋 สร้าง Prompt</button>
    <div id="exPromptBox" style="display:none; margin-top:12px;">
      <div class="field"><label>Prompt (พร้อมคัดลอก) <span class="pf-hint" id="exLen"></span></label><textarea id="exPrompt" class="tl-ta pf-out" style="min-height:220px;" readonly></textarea></div>
      <button type="button" class="btn btn-outline" id="exCopy">คัดลอก Prompt</button>
      <div class="tl-sub" style="margin-top:8px;">นำไปวางใน AI → AI จะตอบเป็นกล่องโค้ดกล่องเดียว กดคัดลอกจากกล่องนั้นแล้วมาวางในขั้นที่ ๒</div>
    </div>
  </div></section><section class="ex-sl" data-s="1"><div class="card">
    <div class="tl-sub">ขั้นที่ ๒ · วางคำตอบจาก AI แล้วตั้งค่าหน้ากระดาษ</div>
    <div class="field" style="margin-top:8px;"><label>คำตอบจาก AI</label><textarea id="exRaw" class="tl-ta pf-out" style="min-height:160px;" placeholder="วางข้อความที่ AI ตอบมาที่นี่">${escH(EX.raw)}</textarea></div>
    <div class="tl-h" style="margin-top:6px;">ตั้งค่าหน้ากระดาษ <span class="pf-hint">(เปลี่ยนแล้วตัวอย่างอัปเดตให้เอง)</span></div>
    <div class="pf-2">
      ${exSelect("perPage", "จำนวนข้อต่อ 1 หน้า", EX_PER.map(n=>[n,exPerLabel(n)]), 6)}
      ${exSelect("cols", "การ์ดต่อแถว", [[2,"2 คอลัมน์"],[3,"3 คอลัมน์"],[1,"1 คอลัมน์ (เต็มแถว)"]], 2)}
      ${exSelect("lines", "บรรทัดเขียนวิธีทำต่อข้อ", [["auto","อัตโนมัติ (เต็มกรอบ)"]].concat([2,3,4,5,6,7,8,10,12,15,20,25,30].map(n=>[n,n+" บรรทัด"])), "auto")}
      ${exSelect("lh", "ระยะห่างระหว่างเส้นเขียนวิธีทำ", [[5,"แคบมาก (5 มม.)"],[6,"แคบ (6 มม.)"],["7.2","ปกติ (7.2 มม.)"],[8,"กว้าง (8 มม.)"],[9,"กว้างมาก (9 มม.)"],[10,"เขียนใหญ่ (10 มม.)"],[12,"กว้างพิเศษ (12 มม.)"]], "7.2")}
      ${exSelect("lstyle", "ชนิดเส้น / พื้นที่ตอบ", EX_LSTYLES, "solid")}
      ${exSelect("theme", "รูปแบบใบงาน (ลายการ์ด)", EX_THEMES.map(t=>[t[0],t[1]]), "plain")}
      ${exIn("title", "ชื่อแบบฝึกหัด", "เว้นว่าง = ใช้ตามที่ AI เขียน")}
      ${exIn("head", "ข้อความมุมขวาบน (ไม่บังคับ — เลขหน้าไปใส่ตอนรวม PDF ขั้นที่ ๔)", "เว้นว่างไว้ได้", "")}
    </div>
    <div class="pd-btns">
      <button type="button" class="btn btn-primary" id="exBuild" style="width:100%; padding:14px; font-size:16px; font-weight:700;">🧾 สร้างแบบฝึกหัด</button>
    </div>
  </div></section><section class="ex-sl" data-s="2"><div class="card">
    <div class="tl-sub">ขั้นที่ ๓ · แก้ไขโจทย์ เพิ่ม/ลบข้อ ใส่เฉลย แล้วทำเป็น PDF</div>
    <div id="exEmpty" class="ex-empty">ยังไม่มีแบบฝึกหัด — ไปขั้นที่ ๒ วางคำตอบจาก AI แล้วกด “สร้างแบบฝึกหัด”<br><button type="button" class="btn btn-outline btn-sm" data-exs="1" style="margin-top:10px;">‹ ไปขั้นที่ ๒</button></div>
    <div class="tl-sub" id="exStat" style="margin-top:8px;"></div>
    <div id="exEdBox" style="display:none; margin-top:12px;">
      <div class="tl-h" style="margin:0 0 6px;">แก้ไขโจทย์ / จำนวนข้อ <span class="pf-hint">(ลบ เพิ่ม หรือแก้ข้อความได้เอง — ตัวอย่างอัปเดตให้เอง)</span></div>
      <div id="exEd"></div>
      <button type="button" class="btn btn-outline btn-sm" id="exEdAdd" style="margin-top:8px;">＋ เพิ่มข้อ</button>
      <span class="tl-sub" style="margin-left:8px;">กลับไปขั้นที่ ๒ แล้วกด “สร้างแบบฝึกหัด” อีกครั้งจะอ่านจากคำตอบ AI ใหม่ (ล้างที่แก้)</span>
      <div class="ex-grpbox" style="margin-top:16px; padding-top:12px; border-top:1.5px dashed #CBD5E1;">
      <div class="tl-h" style="margin-top:6px;">ตั้งค่าแยกตามช่วงข้อ <span class="pf-hint">(ไม่บังคับ — ข้อที่ไม่อยู่ในช่วงใดใช้ค่าด้านบน และแต่ละช่วงจะขึ้นหน้าใหม่)</span></div>
      <div id="exGrp">${exGrpHtml()}</div>
      <button type="button" class="btn btn-outline btn-sm" id="exGrpAdd" style="margin-top:8px;">＋ เพิ่มช่วงข้อ</button>
      </div>
    </div>
    <label class="mg-sw ex-ansrow" id="exAnsRow" style="display:none;"><input type="checkbox" id="exAns"${EX.v.showAns ? " checked" : ""}><span><b>เฉลย</b> — ติ๊กเพื่อแสดงเฉลยพร้อมวิธีทำในแต่ละข้อ (ใช้ทำ PDF แบบเฉลย) <small id="exAnsHint"></small></span></label>
    <div class="ex-pv" id="exPv" style="display:none;"><iframe id="exFrame" title="ตัวอย่างใบงาน" tabindex="-1" sandbox="allow-scripts"></iframe></div>
    <button type="button" class="ex-pdf" id="exPrint" style="display:none;"><i class="sp s1">✦</i><i class="sp s2">✦</i><i class="sp s3">✧</i><i class="sp s4">✦</i><span class="ex-pdf-ic"><svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2.8h7.2L19.2 8v12.2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1z"/><path d="M14.2 2.8V8h5"/><path d="M12.6 11.2v6.2M9.9 14.8l2.7 2.7 2.7-2.7"/></svg></span><span class="ex-pdf-tx"><span id="exPdfT">ทำเป็น PDF</span><small id="exPdfS">พิมพ์ / บันทึกเป็นไฟล์ PDF</small></span></button>
  </div></section><section class="ex-sl" data-s="3"><div class="card">${exMgHtml()}</div></section></div></div>
  <div class="ex-nav"><button type="button" class="btn btn-outline" id="exBack">‹ ย้อนกลับ</button><button type="button" class="btn btn-primary" id="exNext">ถัดไป ›</button></div>`;
}

/* ---------- ป๊อปอัปเลือกชั้น / ตัวชี้วัด ---------- */
const exm = { el:null, body:null, act:null, title:null, mode:"" };
function exmEnsure(){
  if(exm.el) return;
  const el = document.createElement("div");
  el.className = "pm-back"; el.id = "exModal";
  el.innerHTML = `<div class="pm-sheet" role="dialog" aria-modal="true"><div class="pm-head"><b id="exmTitle"></b><div class="pm-act" id="exmAct"></div></div><div class="pm-body" id="exmBody"></div></div>`;
  document.body.appendChild(el);
  exm.el = el; exm.title = $("#exmTitle", el); exm.act = $("#exmAct", el); exm.body = $("#exmBody", el);
  el.addEventListener("click", e=>{
    if(e.target === el || e.target.closest("#exmDone")){ exmClose(); return; }
    const chip = e.target.closest(".pl-chip[data-eg]");
    if(chip){ EX.grade = chip.dataset.eg; exRender(); exmClose(); return; }
    const all = e.target.closest(".pl-all[data-esec]");
    if(all){
      const s = EX.secs[+all.dataset.esec], sel = exSelSet();
      const every = s.items.every(it=>sel.has(it.key));
      s.items.forEach(it=>exSetKey(it.key, !every)); exUpdate(); exSave(); return;
    }
    if(e.target.closest("#exmClear")){ exSelSet().clear(); exm.body.innerHTML = exIndHtml(); exUpdate(); exSave(); }
  });
  el.addEventListener("change", e=>{
    const cb = e.target.closest("input[data-ek]");
    if(cb){ exSetKey(cb.dataset.ek, cb.checked); exUpdate(); exSave(); }
  });
  document.addEventListener("keydown", e=>{ if(e.key === "Escape" && el.classList.contains("show")) exmClose(); });
}
function exmOpen(mode, title, act, html){
  exmEnsure();
  exm.mode = mode; exm.title.textContent = title; exm.act.innerHTML = act; exm.body.innerHTML = html; exm.body.scrollTop = 0;
  exm.el.classList.add("show"); document.documentElement.style.overflow = "hidden";
  exUpdate();
}
function exmClose(){
  if(!exm.el) return;
  exm.el.classList.remove("show"); exm.mode = ""; document.documentElement.style.overflow = "";
}
function exOpenGrade(){
  exmOpen("grade", "เลือกระดับชั้น", `<button type="button" id="exmDone">ปิด</button>`,
    PLAN_GROUPS.map(g=>`<div class="pl-gl">${g.title}</div><div class="pl-grades">${g.grades.map(x=>`<button type="button" class="pl-chip${x===EX.grade?" on":""}" data-eg="${x}">${x}</button>`).join("")}</div>`).join(""));
}
function exOpenInd(){
  if(!EX.grade){ say("เลือกระดับชั้นก่อนนะครับ"); return; }
  exmOpen("ind", `ตัวชี้วัด · ${EX.grade}`, `<span id="exCount"></span><button type="button" id="exmClear">ล้าง</button><button type="button" class="pm-done" id="exmDone">เสร็จสิ้น</button>`, exIndHtml());
}
function exIndHtml(){
  const sel = exSelSet();
  return EX.secs.map((s,si)=>{
    const head = `<div class="pl-sh"><div><b>${escH(s.title)}</b><small>${escH(s.desc)}</small></div>`
      + (s.items.length ? `<button type="button" class="pl-all" data-esec="${si}">เลือกทั้งหมด</button>` : "") + `</div>`;
    const body = s.items.length
      ? s.items.map(it=>`<label class="pl-it${sel.has(it.key)?" on":""}"><input type="checkbox" data-ek="${escH(it.key)}"${sel.has(it.key)?" checked":""}><span class="pl-box"></span><span class="pl-tx"><i>${escH(it.code)}</i>${escH(it.text)}</span></label>`).join("")
      : `<div class="tl-sub pl-none">ไม่มีตัวชี้วัดที่วัดผลในชั้นนี้ ${escH(s.note)}</div>`;
    return `<div class="pm-sec">${head}${body}</div>`;
  }).join("");
}
function exSetKey(key, on){
  const sel = exSelSet(); on ? sel.add(key) : sel.delete(key);
  if(!exm.body) return;
  const cb = [...exm.body.querySelectorAll("input[data-ek]")].find(x=>x.dataset.ek === key);
  if(cb){ cb.checked = on; cb.closest(".pl-it").classList.toggle("on", on); }
}
function exRender(){
  EX.secs = EX.grade ? plBuild(EX.grade).secs : [];
  exSave(); exUpdate();
}
function exUpdate(){
  if(!ex.view) return;
  const g = EX.grade, sel = exSelSet(), picked = exPicked();
  $("#exGradeTxt", ex.view).textContent = g || "แตะเพื่อเลือก";
  $("#exPickGrade", ex.view).classList.toggle("set", !!g);
  $("#exIndTxt", ex.view).textContent = !g ? "เลือกระดับชั้นก่อน (ไม่เลือกก็ได้)" : picked.length ? `เลือกแล้ว ${plNum(picked.length)} ตัวชี้วัด` : "แตะเพื่อเลือก (ไม่เลือกก็ได้)";
  $("#exPickInd", ex.view).classList.toggle("set", picked.length > 0);
  ex.sum.innerHTML = picked.length
    ? EX.secs.map(s=>{
        const rows = s.items.filter(x=>sel.has(x.key)); if(!rows.length) return "";
        return `<div class="pl-sg">${escH(s.title)}</div>` + rows.map(x=>`<div class="pl-pk"><span class="pl-clamp"><i>${escH(x.code)}</i>${escH(x.text)}</span><button type="button" data-erm="${escH(x.key)}" aria-label="เอาออก">✕</button></div>`).join("");
      }).join("")
    : "";
  if(exm.el && exm.mode === "ind"){
    const c = $("#exCount", exm.act); if(c) c.textContent = `${plNum(picked.length)} ข้อ`;
    EX.secs.forEach((s,si)=>{
      const b = $(`.pl-all[data-esec="${si}"]`, exm.body);
      if(b) b.textContent = s.items.every(x=>sel.has(x.key)) ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด";
    });
  }
}

/* ---------- Prompt ---------- */
const EX_UNITS = 35;                       // ความสูงที่ใช้ได้ต่อหน้า (หน่วย = ๑ บรรทัด ≈ 7.2 มม.)
const EX_ROWPAD = 1.2;                     // ระยะขอบ+ช่องว่างต่อแถว (หน่วยบรรทัด)
const EX_CHARS = { 3:23, 2:37 };           // ตัวอักษรไทยโดยประมาณต่อบรรทัดโจทย์
function exCounts(n){
  const a = Math.round(n*0.3), b = Math.round(n*0.3), c = Math.round(n*0.25), d = n - a - b - c;
  return [a,b,c,d];
}
function exPromptText(){
  const v = EX.v, g = EX.grade, n = Math.min(100, Math.max(4, Math.round(+v.count) || 18));
  const topic = (v.topic || "").trim();
  const [a,b,c,d] = exCounts(n);
  const rg = (s,e) => s >= e ? `ข้อ ${e}` : `ข้อ ${s}–${e}`;
  const work = v.work || "much";
  const wkTxt = work === "low"
    ? "โจทย์ส่วนใหญ่ให้ตอบสั้นๆ หรือเติมคำตอบ (ใช้ [__] เป็นช่องเติมในบรรทัดได้) มีข้อให้คิดหลายขั้นตอนบ้างในช่วงท้าย"
    : work === "mid"
      ? "ผสมกัน: ครึ่งหนึ่งเป็นโจทย์ที่ต้องแสดงวิธีทำหลายขั้นตอน อีกครึ่งตอบสั้นได้ (ใช้ [__] เป็นช่องเติมได้)"
      : "นักเรียนต้อง “เขียนแสดงวิธีทำ” ทุกข้อ: ออกโจทย์ที่ต้องคิดคำนวณเป็นขั้นตอน (ไม่ใช่ตอบสั้นๆ ได้ทันที) เหมาะกับการเขียนวิธีทำลงในช่องว่างใต้โจทย์";
  const picked = exPicked(), sel = exSelSet();
  const L = [];
  L.push("# บทบาท");
  L.push("คุณเป็นครูคณิตศาสตร์ผู้เชี่ยวชาญการออกแบบแบบฝึกหัด ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑ (ฉบับปรับปรุง พ.ศ. ๒๕๖๐) กลุ่มสาระการเรียนรู้คณิตศาสตร์");
  L.push(`งานของคุณ: สร้างโจทย์แบบฝึกหัด ${n} ข้อ เรียงจากง่ายไปยากต่อเนื่องตลอดทุกข้อ พร้อมเฉลยแบบแสดงวิธีทำ (ระบบของครูจะจัดหน้ากระดาษและเส้นสำหรับเขียนวิธีทำให้เอง คุณไม่ต้องคิดเรื่องบรรทัดหรือหน้ากระดาษ)`);
  L.push("");
  L.push("# ข้อมูลจากครู");
  L.push(`- ระดับชั้น: ${g || "[ครูกรอก: ระดับชั้น]"}`);
  L.push(`- เรื่องที่ออกโจทย์: ${topic || "[ครูกรอก: เรื่อง]"}`);
  L.push(`- จำนวนข้อ: ${n} ข้อ`);
  L.push(`- ลักษณะโจทย์: ${wkTxt}`);
  if(picked.length){
    L.push("");
    L.push("## ขอบเขต: ตัวชี้วัดที่ครูเลือก (โจทย์ทุกข้อต้องอยู่ในขอบเขตนี้ ห้ามออกเกินตัวชี้วัดหรือเกินระดับชั้น)");
    EX.secs.forEach(s=>{
      const r = s.items.filter(it=>sel.has(it.key)); if(!r.length) return;
      L.push(`[${s.title}]`); r.forEach(it=>L.push(`${it.code} ${it.text}`));
    });
  }else{
    L.push("- ขอบเขต: เนื้อหาเรื่องที่ระบุ ตามหลักสูตรแกนกลางของระดับชั้นนี้ ห้ามออกเกินระดับชั้น");
  }
  if((v.extra||"").trim()){ L.push(""); L.push(`## ความต้องการเพิ่มเติมจากครู: ${v.extra.trim()}`); }
  L.push("");
  L.push("# การไล่ระดับความยาก (ง่าย → ยาก ตามลำดับข้อ ห้ามสลับ)");
  L.push(`- ${rg(1,a)} (${a} ข้อ) ขั้นพื้นฐาน: ตรวจความเข้าใจนิยาม/สัญลักษณ์ ตัวเลขเล็ก ตรงไปตรงมา`);
  L.push(`- ${rg(a+1,a+b)} (${b} ข้อ) ขั้นฝึกใช้: ใช้สมบัติ/วิธีการโดยตรง ตัวเลขคล้ายตัวอย่างในหนังสือเรียน`);
  L.push(`- ${rg(a+b+1,a+b+c)} (${c} ข้อ) ขั้นประยุกต์: ตัวเลขหลากหลายขึ้น (เช่น จำนวนติดลบ เศษส่วน) หรือต้องทำหลายขั้นตอน`);
  L.push(`- ${rg(a+b+c+1,n)} (${d} ข้อ) ขั้นท้าทาย: โจทย์ปัญหา/คิดวิเคราะห์/หาตัวแปรไม่ทราบค่า (ยังอยู่ในขอบเขตตัวชี้วัด)`);
  L.push("- ข้อที่อยู่ติดกันควรมีรูปแบบโจทย์หลากหลาย ไม่ซ้ำสูตรเดิมเกิน ๓ ข้อติดกัน");
  L.push("- โจทย์แต่ละข้อให้กระชับ ไม่เกินประมาณ ๘๐ ตัวอักษร (ข้อท้ายที่เป็นโจทย์ปัญหาไม่เกินประมาณ ๑๒๐ ตัวอักษร) เพราะต้องใส่ในการ์ดขนาดเล็ก");
  L.push("- ห้ามให้โจทย์แต่ละข้อขึ้นต้นด้วยคำสั่งซ้ำกันทุกข้อ (เช่น “จงหา…ของ”, “จงคำนวณ…”, “จงแก้สมการ…”) ให้เอาคำสั่งกลางที่ใช้ร่วมกันไปไว้ในบรรทัด INSTR เพียงครั้งเดียว แล้วในแต่ละข้อเขียนเฉพาะข้อมูลที่โจทย์กำหนดให้เท่านั้น (เช่น เขียนแค่ $A(0,0)$ และ $B(2,4)$ ไม่ต้องเขียนว่า “จงหาจุดกึ่งกลางของ…”)");
  L.push("- ข้อยกเว้น: ข้อที่คำสั่งแตกต่างจากคำสั่งกลางใน INSTR (เช่น หาตัวแปรหรือค่าที่ไม่ทราบ โจทย์ปัญหา โจทย์ที่ต้องอธิบายสถานการณ์) ให้เขียนโจทย์เต็มประโยคพร้อมคำสั่งของข้อนั้นได้ตามปกติ");
  L.push("- ต้องเขียนคำสั่งกลางใน INSTR ให้ครอบคลุมสิ่งที่ต้องทำในข้อที่เขียนแบบย่อ เช่น “จงแสดงวิธีหาจุดกึ่งกลางของส่วนของเส้นตรงที่กำหนดจุดปลายต่อไปนี้” ผู้เรียนต้องอ่านแล้วรู้ทันทีว่าแต่ละข้อให้ทำอะไร");
  const gm = v.gmode || "none";
  if(gm !== "none"){
    L.push("");
    L.push("# โจทย์ที่มีกราฟประกอบ (ครูเลือก: " + (gm === "all" ? "ทุกข้อมีกราฟประกอบโจทย์" : "ผสม — บางข้อมีกราฟ บางข้อเป็นข้อความอย่างเดียว") + ")");
    L.push(gm === "all"
      ? "- ทุกข้อต้องมีกราฟประกอบโจทย์ ให้นักเรียนอ่านข้อมูลจากกราฟแล้วแสดงวิธีทำ"
      : "- เลือกข้อที่เนื้อหาเหมาะกับการให้กราฟ (ประมาณครึ่งหนึ่งของทั้งชุด กระจายทั้งช่วงง่ายและช่วงยาก) ให้มีกราฟประกอบ ส่วนข้ออื่นเป็นโจทย์ข้อความล้วนตามปกติ");
    L.push("- ห้ามวาดกราฟเองด้วยตัวอักษร/ASCII/รูปภาพ ให้เขียนเป็น “คำสั่งกราฟ” ในรูป [[G: …]] แทรกในบรรทัดโจทย์ตรงตำแหน่งที่กราฟควรอยู่ (ปกติอยู่ท้ายโจทย์ ต่อจาก //) ระบบเว็บจะอ่านสมการ LaTeX แล้ววาดแกน x, y และเส้นกราฟให้เอง พร้อมปรับขนาดให้พอดีการ์ดโดยอัตโนมัติ");
    L.push("- สิ่งที่โจทย์ให้นักเรียนอ่านจากกราฟ ห้ามเขียนซ้ำในตัวโจทย์ (เช่น ให้หาสมการเส้นตรงจากกราฟ ห้ามบอกสมการ ความชัน หรือจุดตัดแกนในข้อความ) ให้ปรากฏเฉพาะในกราฟ");
    L.push("- ทำให้อ่านค่าจากกราฟได้ชัด: จุดสำคัญ (จุดตัดแกน จุดยอด จุดที่ใช้คิด) ให้มีพิกัดเป็นจำนวนเต็มบนจุดตัดของตาราง จุดที่มีชื่อ (เช่น A, B) ให้ใช้ ptc (ชื่อ+พิกัด) เป็นค่าเริ่มต้น ใช้ pt (มีแต่ชื่อจุด) เฉพาะเมื่อโจทย์ให้นักเรียนอ่านพิกัดของจุดนั้นเองเท่านั้น");
    L.push("- เส้นกราฟต้องผ่านจุดที่ระบุจริง ให้แทนพิกัดทุกจุดลงในสมการตรวจก่อนส่ง และเฉลยต้องสอดคล้องกับกราฟ");
    L.push("- คำสั่งกราฟไม่นับรวมความยาวโจทย์ (ส่วนข้อความโจทย์ยังต้องกระชับตามเดิม)");
    L.push("- รูปแบบคำสั่งกราฟ: [[G: รายการที่ ๑; รายการที่ ๒; …]] เขียนทั้งหมดในบรรทัดเดียว คั่นรายการด้วย ; และห้ามมีเครื่องหมาย | หรือ // อยู่ภายใน (ห้ามใช้ \\; \\, \\! ในสมการ):");
    L.push("  range: xmin,xmax,ymin,ymax   ← ต้องมีเสมอ และเขียนเป็นรายการแรก ช่วงของแกนต้องครอบคลุมจุด/เส้นสำคัญและมีจุดกำเนิดอยู่ในช่วง เช่น range: -4,6,-3,5");
    L.push("  eq: สมการหรืออสมการ LaTeX (ไม่ต้องใส่ $) ระบบวาดเส้นตรง พาราโบลา วงกลม วงรี ไฮเพอร์โบลา และฟังก์ชันให้เอง เช่น");
    L.push("      eq: y=2x+1     eq: x=3     eq: y=x^{2}-4x+3     eq: x^{2}+y^{2}=25     eq: (x-1)^{2}+(y+2)^{2}=9");
    L.push("      eq: \\frac{x^{2}}{9}+\\frac{y^{2}}{4}=1     eq: y^{2}=4x     eq: y=\\sqrt{x}     eq: y=2^{x}     eq: y=\\lvert x \\rvert");
    L.push("      ใช้ได้เฉพาะตัวแปร x และ y กับ + - \\cdot \\times \\frac{}{} ^{} \\sqrt{} \\lvert \\rvert \\sin \\cos \\tan \\ln \\log e \\pi");
    L.push("  eqd: เหมือน eq แต่วาดเป็นเส้นประ");
    L.push("  อสมการ (\\leq \\geq < >) ใน eq: ระบบแรเงาบริเวณคำตอบให้เอง (ถ้าเป็น < > เส้นขอบเป็นเส้นประอัตโนมัติ) ถ้าต้องการแรเงาเฉพาะส่วนที่จริงทุกเงื่อนไขพร้อมกัน ใช้ reg: เงื่อนไข1 & เงื่อนไข2 & เงื่อนไข3 เช่น reg: x\\geq 0 & y\\geq 0 & x+y\\leq 4");
    L.push("  pt: A(2,3) = จุดพร้อมชื่อ (ไม่แสดงพิกัด)     ptc: A(2,3) = จุดพร้อมชื่อและพิกัด (ใช้เป็นหลัก)     dot: (2,3) = จุดไม่มีชื่อ");
    L.push("  seg: (0,0)-(3,4) = ส่วนของเส้นตรง     segd: ... = เส้นประ     poly: (0,0)-(4,0)-(2,3) = รูปหลายเหลี่ยมปิด     polyf: ... = รูปหลายเหลี่ยมแรเงา");
    L.push("  ติดชื่อเส้น/รูป: เติม  ~ ชื่อ  ท้ายรายการ eq, eqd, seg, poly เช่น eq: y=2x+1 ~ l_{1}     วางข้อความ: txt: ชื่อ @ (x,y)");
    L.push("  ไม่บังคับ: step: 1 (ระยะขีดบนแกน)  grid: off (ปิดเส้นตาราง)  num: off (ปิดตัวเลขบนแกน)  ratio: free (สเกลแกน x, y ไม่เท่ากัน ใช้เมื่อช่วงแกนต่างกันมาก)");
    L.push("ตัวอย่างรูปแบบเท่านั้น (ห้ามลอกเนื้อหา):");
    L.push("3 | จากกราฟ จงหาความชันของเส้นตรง $l$ // [[G: range: -3,6,-3,6; eq: y=\\frac{1}{2}x+1 ~ l; ptc: A(0,1); ptc: B(4,3)]]");
    L.push("5 | จากกราฟ จงเขียนระบบอสมการที่แสดงบริเวณที่แรเงา // [[G: range: -1,6,-1,6; reg: x\\geq 0 & y\\geq 0 & x+y\\leq 4; ptc: A(4,0); ptc: B(0,4)]]");
    L.push(v.gans === "yes"
      ? "- เฉลย: ข้อที่ต้องมีกราฟช่วยอธิบายจริง (เช่น กราฟของสมการที่หาได้ ภาพแสดงบริเวณคำตอบ) ใส่ [[G: …]] ไว้ท้ายบรรทัดเฉลยของข้อนั้นได้ ข้อละไม่เกิน ๑ กราฟ ข้อที่ไม่จำเป็นไม่ต้องใส่"
      : "- เฉลย: ห้ามใส่ [[G: …]] ในส่วน ANSWERS (เฉลยเป็นข้อความอย่างเดียว)");
  }
  L.push("");
  L.push("# รูปแบบการส่งคำตอบ (ทำตามอย่างเคร่งครัด — ครูจะกดคัดลอกจากกล่องโค้ดไปวางในเว็บทันที)");
  L.push("- ส่งคำตอบทั้งหมดเป็น code block เดียว (เปิดด้วย ```text และปิดด้วย ```) ห้ามมีข้อความอื่นนอก code block ทั้งก่อนและหลัง (ไม่ทักทาย ไม่อธิบาย ไม่ถามต่อ) เพื่อให้กดคัดลอกแล้วใช้ได้ทันที");
  L.push("- ภายใน code block เป็นข้อความธรรมดา ไม่ใช้ Markdown ตกแต่ง (# ** __) ไม่ใช้อีโมจิ");
  L.push("- ห้ามวาดเส้นหรือจุดสำหรับเขียนตอบเอง (เช่น ------ ...... ______) ระบบวาดเส้นให้ใต้โจทย์ทุกข้อแล้ว");
  L.push("- โครงสร้าง (ห้ามเพิ่มหรือเปลี่ยนชื่อบรรทัดหัว):");
  L.push("  บรรทัดที่ ๑:  TITLE: แบบฝึกหัดที่ 1");
  L.push("  บรรทัดที่ ๒:  INSTR: คำสั่งกลางของแบบฝึกหัด ๑ บรรทัด ที่ใช้ร่วมกันกับโจทย์ส่วนใหญ่ เช่น จงแสดงวิธีหาจุดกึ่งกลางของส่วนของเส้นตรงที่กำหนดจุดปลายต่อไปนี้ (เขียนให้ตรงกับเนื้อหา และไม่ต้องพูดซ้ำคำสั่งนี้ในแต่ละข้อ)");
  L.push("  จากนั้นโจทย์ทีละข้อ ข้อละ ๑ บรรทัด ในรูป:  เลขข้อ | โจทย์");
  L.push("    - เลขข้อ เป็นเลขอารบิก เรียง 1 ถึง " + n + " ครบ ไม่ข้าม");
  L.push("    - ในโจทย์ใช้ // เมื่อต้องการขึ้นบรรทัดใหม่ภายในข้อเดียวกัน และห้ามใช้เครื่องหมาย | ในโจทย์ (ค่าสัมบูรณ์ให้เขียน $\\lvert x \\rvert$)");
  L.push("    - ไม่ต้องเขียนคำว่า “ข้อ” นำหน้าโจทย์ ระบบใส่เลขข้อให้เอง");
  L.push("  ท้ายสุด: บรรทัด ANSWERS แล้วตามด้วยเฉลยแบบ “แสดงวิธีทำ” ข้อละ ๑ บรรทัด ในรูป:  เลขข้อ | ขั้นที่ ๑ // ขั้นที่ ๒ // ตอบ …  (เฉลยต้องคำนวณถูกต้อง ตรวจซ้ำก่อนส่ง)");
  L.push("    - เฉลยแต่ละข้อแสดงวิธีทำเป็นขั้นตอน ๒–๕ ขั้น คั่นแต่ละขั้นด้วย // (เว็บจะขึ้นบรรทัดใหม่ให้เอง) และขั้นสุดท้ายขึ้นต้นด้วยคำว่า “ตอบ” ตามด้วยคำตอบ");
  L.push("    - วางโครงก่อนเขียน: จัดกลุ่มข้อที่วิธีทำเหมือนกัน (เช่น ข้อ 1–3) แล้วกำหนด “โครงวิธีทำ” ของกลุ่มนั้น ๑ แบบ (จำนวนขั้น ลำดับขั้น และถ้อยคำเหมือนกันทุกข้อในกลุ่ม) จากนั้นเขียนเฉลยแต่ละข้อโดยเปลี่ยนเฉพาะตัวเลข/ค่าที่แทนลงไปตามโจทย์ข้อนั้น ผลคำนวณทุกขั้นต้องคิดใหม่ให้ถูกต้องตามตัวเลขของข้อนั้น");
  L.push("    - ห้ามเขียนลัดว่า “ทำเหมือนข้อ 1” “ทำนองเดียวกัน” หรือ “ดังข้างต้น” ต้องเขียนวิธีทำเต็มทุกข้อ เพราะเว็บพิมพ์เฉลยแยกไว้ในการ์ดของแต่ละข้อ");
  L.push("    - เฉลยจะถูกพิมพ์ในการ์ดเล็ก ให้กระชับ: ขั้นละไม่เกินประมาณ ๕๐ ตัวอักษร รวมไม่เกิน ๕ ขั้น (โจทย์ปัญหาท้ายชุดไม่เกิน ๖ ขั้น)");
  L.push("    - ข้อที่วิธีทำต่างออกไป (เช่น โจทย์ปัญหา หาค่าที่ไม่ทราบ) ให้เขียนวิธีทำของข้อนั้นเอง");
  L.push("    - เฉลยแต่ละข้อต้องอยู่ในบรรทัดเดียว (ห้ามขึ้นบรรทัดจริง ใช้ // แทน) ห้ามใช้เครื่องหมาย | ในเนื้อเฉลย ใส่สูตรใน $...$ เหมือนโจทย์ และไม่ใช้ Markdown");
  L.push("");
  L.push("ตัวอย่างรูปแบบเท่านั้น (ห้ามลอกเนื้อหา):");
  L.push("TITLE: แบบฝึกหัดที่ 1");
  L.push("INSTR: จงแสดงวิธีหาจุดกึ่งกลางของส่วนของเส้นตรงที่กำหนดจุดปลายต่อไปนี้");
  L.push("1 | $A(0,0)$ และ $B(2,4)$");
  L.push("2 | $A(2,2)$ และ $B(6,4)$");
  L.push("3 | $A(-2,3)$ และ $B(4,-1)$");
  L.push("4 | จุดกึ่งกลางของ $AB$ คือ $M(3,2)$ และ $A(1,-2)$ จงหาพิกัดจุด $B$");
  L.push("ANSWERS");
  L.push("1 | $M=\\left(\\frac{0+2}{2},\\frac{0+4}{2}\\right)$ // $M=(1,2)$ // ตอบ $(1,2)$");
  L.push("2 | $M=\\left(\\frac{2+6}{2},\\frac{2+4}{2}\\right)$ // $M=(4,3)$ // ตอบ $(4,3)$");
  L.push("3 | $M=\\left(\\frac{-2+4}{2},\\frac{3+(-1)}{2}\\right)$ // $M=(1,1)$ // ตอบ $(1,1)$");
  L.push("4 | ให้ $B(x,y)$ // $\\frac{1+x}{2}=3$ จะได้ $x=5$ // $\\frac{-2+y}{2}=2$ จะได้ $y=6$ // ตอบ $B(5,6)$");
  L.push("(ตัวอย่างข้อ 1–3 วิธีทำแบบเดียวกัน จึงใช้ฟอร์มเดิมเปลี่ยนเลข ส่วนข้อ 4 วิธีต่างออกไป)");
  L.push("");
  L.push("# การเขียนสูตรและสมการ (สำคัญ — เว็บจะแปลง $...$ เป็นสมการตอนสร้างใบงาน)");
  L.push("- สัญลักษณ์ทางคณิตศาสตร์ที่ไม่ใช่ตัวเลขธรรมดา ต้องอยู่ใน $...$ ทั้งก้อน เช่น นิพจน์ สมการ อสมการ เศษส่วน ยกกำลัง ราก เซต คู่อันดับ ตัวแปร ส่วนข้อความภาษาไทยอยู่นอก $ เสมอ");
  L.push("- ใช้ x^{2} สำหรับยกกำลัง \\frac{a}{b} สำหรับเศษส่วน \\sqrt{x} สำหรับราก \\times \\div \\leq \\geq \\neq \\in \\cup \\cap \\emptyset  และใช้ \\{ \\} สำหรับวงเล็บปีกกาของเซต ห้ามใช้ ^ / ² ³ ≠ ≥ ≤ × ÷ นอก $...$ ห้ามใช้ \\( \\) หรือ \\[ \\]");
  L.push("- ตัวเลขธรรมดาที่ไม่ใช่สมการ (เช่น จำนวนคน 12 คน) เขียนนอก $ ได้ และห้ามใช้เครื่องหมาย $ กับเรื่องอื่น เช่น จำนวนเงิน");
  L.push("- ตรวจก่อนส่ง: ทุก $ ที่เปิดมีตัวปิดครบ และโจทย์ทุกข้อคำนวณได้คำตอบที่ชัดเจนเพียงคำตอบเดียว");
  L.push("");
  L.push("# ก่อนส่งให้ตรวจตนเอง");
  L.push(`(1) มีครบ ${n} ข้อ และยากขึ้นตามลำดับ (2) ทุกข้ออยู่ในขอบเขตเรื่อง/ตัวชี้วัด/ระดับชั้นที่ครูกำหนด (3) ใช้รูปแบบ “เลขข้อ | โจทย์” ครบทุกบรรทัด และไม่มีเส้น/จุดสำหรับเขียนตอบ (4) ไม่มีข้อความนอก code block (5) ไม่มีข้อที่ขึ้นต้นด้วยคำสั่งซ้ำกับ INSTR (ยกเว้นข้อที่คำสั่งต่างออกไป เช่น หาตัวแปร/โจทย์ปัญหา) (6) ANSWERS มีครบทุกข้อ แสดงวิธีทำ คั่นขั้นด้วย // อยู่ในบรรทัดเดียว ลงท้ายด้วย “ตอบ” ไม่มีข้อที่เขียนลัดว่าทำเหมือนข้ออื่น และตัวเลขทุกขั้นถูกต้อง`);
  if(gm !== "none") L.push("(7) ทุกคำสั่งกราฟเปิด [[G: และปิด ]] ครบ มี range เป็นรายการแรก ไม่มี | หรือ // ภายใน จุดที่ระบุอยู่บนเส้นกราฟจริง และไม่บอกคำตอบที่ต้องอ่านจากกราฟในตัวโจทย์");
  return L.join("\n");
}

/* ---------- แยกคำตอบ AI ---------- */
/* ล้างเส้น/จุด/ขีดที่ AI วาดเองสำหรับเขียนตอบ (ระบบวาดเส้นให้เอง) */
function exClean(t){
  const run = /(?<!\[)[-_.…·~=]{4,}(?!\])/g;
  return String(t).split("//").map(x=>x.trim())
    .filter(x=>x && !/^(?:ตอบ|วิธีทำ|คำตอบ)?\s*[:：]?\s*[-_.…·~=\s]{4,}$/.test(x))
    .map(x=>x.replace(run, "[__]")).join(" // ");
}
function exParse(raw){
  const lines = String(raw||"").split(/\r?\n/);
  const r = { title:"", instr:"", items:[], ans:[] };
  let inAns = false;
  lines.forEach(ln0=>{
    const ln = pdAr(ln0).replace(/^\s*[-*•]\s+(?=\d+\s*[|｜])/, "");
    if(/^\s*```/.test(ln) || !ln.trim()) return;
    let m;
    if((m = ln.match(/^\s*(?:TITLE|ชื่อ)\s*[:：]\s*(.+?)\s*$/i))){ r.title = m[1]; return; }
    if((m = ln.match(/^\s*(?:INSTR|คำสั่ง)\s*[:：]\s*(.+?)\s*$/i))){ r.instr = m[1]; return; }
    if(/^\s*(?:ANSWERS?|เฉลย)\s*[:：]?\s*$/i.test(ln)){ inAns = true; return; }
    if(inAns){
      m = ln.match(/^\s*(\d+)\s*[|｜.)]\s*(.+?)\s*$/);
      if(m) r.ans.push({ n:+m[1], t:m[2].replace(/\s*\/\/\s*/g, "\n") });
      return;
    }
    m = ln.match(/^\s*(\d+)\s*[|｜]\s*(.+?)\s*$/);
    if(m){
      let t = m[2];
      const o = t.match(/^(\d)\s*[|｜]\s*(.+)$/); if(o) t = o[2];   // รองรับรูปแบบเก่า: เลขข้อ | จำนวนบรรทัด | โจทย์
      t = exClean(t);
      if(t) r.items.push({ n:+m[1], t });
    }
  });
  return r;
}

/* ---------- ใบงาน HTML (ตาราง ๑ หน้า A4 + ย่อ/ขยายให้พอดีอัตโนมัติ) ---------- */
/* =====================================================================
   กราฟประกอบโจทย์ — AI ส่งคำสั่งในรูป [[G: range: -3,6,-3,6; eq: y=2x+1 ~ l; ptc: A(0,1)]] (สมการเป็น LaTeX)
   → อ่านสมการเอง (ไม่ใช้ eval) → วาดเป็น SVG แกน x,y + เส้นโค้ง/จุด/แรเงา → ปรับขนาดให้พอดีการ์ดของแต่ละข้ออัตโนมัติ
   ===================================================================== */
const GX_PXMM = 96 / 25.4;
let GX_ID = 0;
const GX_FUN = { sin:Math.sin, cos:Math.cos, tan:Math.tan, cot:v=>1/Math.tan(v), sec:v=>1/Math.cos(v), csc:v=>1/Math.sin(v),
  arcsin:Math.asin, arccos:Math.acos, arctan:Math.atan, ln:Math.log, log:Math.log10, lg:Math.log10, exp:Math.exp, abs:Math.abs };
const GX_REL = { leq:"<=", le:"<=", leqslant:"<=", geq:">=", ge:">=", geqslant:">=", lt:"<", gt:">" };

/* ---------- อ่านนิพจน์ LaTeX ---------- */
function gxTok(src){
  const s = String(src).replace(/\\left|\\right/g, "").replace(/\\[,;:!]|\\ |~/g, " ").replace(/[−–]/g, "-").replace(/≤/g, "\\leq ").replace(/≥/g, "\\geq ");
  const out = []; let i = 0, m;
  while(i < s.length){
    const c = s[i];
    if(/\s/.test(c)){ i++; continue; }
    const rest = s.slice(i);
    if((m = rest.match(/^\d+(?:\.\d+)?|^\.\d+/))){ out.push({ k:"n", v:parseFloat(m[0]) }); i += m[0].length; continue; }
    if(c === "\\"){
      m = rest.slice(1).match(/^[A-Za-z]+/);
      if(!m){ out.push({ k:"o", v:rest[1] || "" }); i += 2; continue; }
      out.push({ k:"c", v:m[0] }); i += 1 + m[0].length; continue;
    }
    if((m = rest.match(/^(?:arcsin|arccos|arctan|sin|cos|tan|cot|sec|csc|ln|log|lg|exp|sqrt|abs)(?![A-Za-z])/))){ out.push({ k:"c", v:m[0] }); i += m[0].length; continue; }
    if(/[A-Za-z]/.test(c)){ out.push({ k:"v", v:c }); i++; continue; }
    out.push({ k:"o", v:c }); i++;
  }
  return out;
}
function gxParse(tokens){
  let p = 0, usesX = false, usesY = false;
  const peek = () => tokens[p];
  const isO = (t, v) => !!t && t.k === "o" && t.v === v;
  const isC = (t, v) => !!t && t.k === "c" && t.v === v;
  const expect = v => { if(!isO(peek(), v)) throw new Error("ขาดเครื่องหมาย " + v); p++; };
  const startsAtom = t => !t ? false : (t.k === "n" || t.k === "v") ? true
    : t.k === "c" ? (["frac","dfrac","tfrac","sqrt","pi","lvert"].includes(t.v) || t.v in GX_FUN)
    : (isO(t, "(") || isO(t, "{") || isO(t, "["));
  const startsPlain = t => !t ? false : (t.k === "n" || t.k === "v" || isC(t, "pi") || isO(t, "(") || isO(t, "{") || isO(t, "["));
  function expr(){
    let f = term();
    for(;;){
      const t = peek();
      if(isO(t, "+")){ p++; const a = f, b = term(); f = (x,y) => a(x,y) + b(x,y); }
      else if(isO(t, "-")){ p++; const a = f, b = term(); f = (x,y) => a(x,y) - b(x,y); }
      else return f;
    }
  }
  function term(){
    let f = unary();
    for(;;){
      const t = peek();
      if(isO(t, "*") || isC(t, "cdot") || isC(t, "times")){ p++; const a = f, b = unary(); f = (x,y) => a(x,y) * b(x,y); }
      else if(isO(t, "/") || isC(t, "div")){ p++; const a = f, b = unary(); f = (x,y) => a(x,y) / b(x,y); }
      else if(startsAtom(t)){ const a = f, b = power(); f = (x,y) => a(x,y) * b(x,y); }
      else return f;
    }
  }
  function unary(){
    const t = peek();
    if(isO(t, "-")){ p++; const a = unary(); return (x,y) => -a(x,y); }
    if(isO(t, "+")){ p++; return unary(); }
    return power();
  }
  function power(){
    const b = atom();
    if(isO(peek(), "^")){ p++; const e = expo(); return (x,y) => Math.pow(b(x,y), e(x,y)); }
    return b;
  }
  function expo(){
    const t = peek();
    if(isO(t, "{")){ p++; const e = expr(); expect("}"); return e; }
    if(isO(t, "-")){ p++; const e = expo(); return (x,y) => -e(x,y); }
    if(t && (t.k === "n" || t.k === "v" || isC(t, "pi") || isO(t, "("))) return atom();
    throw new Error("ตัวยกไม่ถูกต้อง");
  }
  function group(){ expect("{"); const e = expr(); expect("}"); return e; }
  function atom(){
    const t = tokens[p++];
    if(!t) throw new Error("นิพจน์ไม่สมบูรณ์");
    if(t.k === "n"){ const v = t.v; return () => v; }
    if(t.k === "v"){
      if(t.v === "x"){ usesX = true; return x => x; }
      if(t.v === "y"){ usesY = true; return (x,y) => y; }
      if(t.v === "e") return () => Math.E;
      throw new Error("ใช้ได้เฉพาะตัวแปร x, y (พบ " + t.v + ")");
    }
    if(t.k === "o"){
      if(t.v === "("){ const e = expr(); expect(")"); return e; }
      if(t.v === "["){ const e = expr(); expect("]"); return e; }
      if(t.v === "{"){ const e = expr(); expect("}"); return e; }
      throw new Error("เครื่องหมาย " + t.v + " ไม่ถูกที่");
    }
    if(t.v === "pi") return () => Math.PI;
    if(t.v === "frac" || t.v === "dfrac" || t.v === "tfrac"){ const a = group(), b = group(); return (x,y) => a(x,y) / b(x,y); }
    if(t.v === "lvert"){ const e = expr(); if(!isC(peek(), "rvert")) throw new Error("ขาด \\rvert"); p++; return (x,y) => Math.abs(e(x,y)); }
    if(t.v === "sqrt"){
      let n = null;
      if(isO(peek(), "[")){ p++; n = expr(); expect("]"); }
      const e = group();
      if(!n) return (x,y) => Math.sqrt(e(x,y));
      return (x,y) => { const a = e(x,y), k = n(x,y); return (a < 0 && Math.round(k) % 2 === 1) ? -Math.pow(-a, 1/k) : Math.pow(a, 1/k); };
    }
    if(t.v in GX_FUN){
      const fn = GX_FUN[t.v]; let pw = null, base = null;
      if(isO(peek(), "^")){ p++; pw = expo(); }
      if(isO(peek(), "_") && t.v === "log"){ p++; base = isO(peek(), "{") ? group() : atom(); }
      let arg;
      if(isO(peek(), "(") || isO(peek(), "[")) arg = atom();
      else{ arg = power(); while(startsPlain(peek())){ const a = arg, b = power(); arg = (x,y) => a(x,y) * b(x,y); } }
      const call = base ? ((x,y) => Math.log(arg(x,y)) / Math.log(base(x,y))) : (x,y) => fn(arg(x,y));
      return pw ? ((x,y) => Math.pow(call(x,y), pw(x,y))) : call;
    }
    throw new Error("ไม่รู้จัก \\" + t.v);
  }
  const f = expr();
  if(p < tokens.length) throw new Error("อ่านไม่ครบ ติดที่ “" + (tokens[p].v) + "”");
  return { f, usesX, usesY };
}
const gxNum = s => { const r = gxParse(gxTok(s)); if(r.usesX || r.usesY) throw new Error("ต้องเป็นตัวเลข"); const v = r.f(0, 0); if(!isFinite(v)) throw new Error("ค่าไม่ถูกต้อง"); return v; };

/* สมการ/อสมการ: แยกที่เครื่องหมาย = < > ≤ ≥ ระดับนอกสุด */
function gxRel(src){
  const tk = gxTok(src); let d = 0, idx = -1, op = "", len = 1;
  for(let i = 0; i < tk.length; i++){
    const t = tk[i];
    if(t.k === "o"){
      if(t.v === "(" || t.v === "{" || t.v === "[") d++;
      else if(t.v === ")" || t.v === "}" || t.v === "]") d--;
      else if(d === 0 && (t.v === "=" || t.v === "<" || t.v === ">")){
        idx = i; op = t.v; len = 1;
        if(t.v !== "=" && tk[i+1] && tk[i+1].k === "o" && tk[i+1].v === "="){ op += "="; len = 2; }
        break;
      }
    }else if(t.k === "c" && d === 0 && GX_REL[t.v]){ idx = i; op = GX_REL[t.v]; len = 1; break; }
  }
  if(idx < 0) throw new Error("ไม่มีเครื่องหมาย = < > ในสมการ");
  let lt = tk.slice(0, idx), rt = tk.slice(idx + len);
  if(!lt.length || !rt.length) throw new Error("สมการไม่ครบสองข้าง");
  const isVar = (a, v) => a.length === 1 && a[0].k === "v" && a[0].v === v;
  const flip = { "<":">", ">":"<", "<=":">=", ">=":"<=", "=":"=" };
  if((isVar(rt, "y") || isVar(rt, "x")) && !(isVar(lt, "y") || isVar(lt, "x"))){ const t = lt; lt = rt; rt = t; op = flip[op]; }
  const L = gxParse(lt), R = gxParse(rt);
  let mode = "imp";
  if(isVar(lt, "y") && !R.usesY) mode = "y";
  else if(isVar(lt, "x") && !R.usesX) mode = "x";
  return { op, mode, g:R.f, F:(x,y) => L.f(x,y) - R.f(x,y) };
}
const gxHolds = (op, v) => op === ">" ? v > 0 : op === ">=" ? v >= 0 : op === "<" ? v < 0 : op === "<=" ? v <= 0 : Math.abs(v) < 1e-9;

/* ---------- อ่านคำสั่งกราฟ ---------- */
function gxPoints(s){
  const out = []; const re = /\(([^()]*)\)/g; let m;
  while((m = re.exec(s))){
    const parts = []; let d = 0, cur = "";
    for(const ch of m[1]){
      if(ch === "(" || ch === "{" || ch === "[") d++; else if(ch === ")" || ch === "}" || ch === "]") d--;
      if(ch === "," && d === 0){ parts.push(cur); cur = ""; } else cur += ch;
    }
    parts.push(cur);
    if(parts.length !== 2) throw new Error("พิกัดต้องมี 2 ค่า: (" + m[1] + ")");
    out.push([gxNum(parts[0]), gxNum(parts[1])]);
  }
  return out;
}
function gxSpec(src){
  const sp = { range:null, items:[], errors:[], grid:true, num:true, free:false, step:0 };
  String(src).replace(/\\[;,:!]/g, " ").split(";").map(x => x.trim()).filter(Boolean).forEach(it => {
    const m = it.match(/^([A-Za-z]+)\s*[:：]\s*([\s\S]*)$/);
    if(!m){ sp.errors.push(it); return; }
    const key = m[1].toLowerCase(), val = m[2].trim();
    try{
      if(key === "range"){
        const a = val.split(",").map(gxNum);
        if(a.length !== 4 || !(a[1] > a[0]) || !(a[3] > a[2])) throw new Error("range ต้องเป็น xmin,xmax,ymin,ymax");
        sp.range = a;
      }else if(key === "grid"){ sp.grid = !/^(off|no|false|0)/i.test(val); }
      else if(key === "num"){ sp.num = !/^(off|no|false|0)/i.test(val); }
      else if(key === "ratio"){ sp.free = /^free/i.test(val); }
      else if(key === "step"){ sp.step = Math.abs(gxNum(val)) || 0; }
      else if(key === "txt"){
        const k = val.lastIndexOf("@"); if(k < 0) throw new Error("txt ต้องมี @ (x,y)");
        const pt = gxPoints(val.slice(k + 1))[0]; if(!pt) throw new Error("txt ต้องมีพิกัด");
        sp.items.push({ t:"txt", text:val.slice(0, k).trim(), p:pt });
      }else if(key === "pt" || key === "ptc" || key === "dot"){
        const k = val.indexOf("("); if(k < 0) throw new Error("จุดต้องมีพิกัด");
        const pt = gxPoints(val.slice(k))[0]; if(!pt) throw new Error("จุดต้องมีพิกัด");
        sp.items.push({ t:"pt", name:val.slice(0, k).trim(), p:pt, coord:key === "ptc", dot:key === "dot" });
      }else if(key === "seg" || key === "segd" || key === "poly" || key === "polyf"){
        const parts = val.split(/\s*~\s*/);
        const pts = gxPoints(parts[0]);
        if(pts.length < 2) throw new Error("ต้องมีอย่างน้อย 2 จุด");
        sp.items.push({ t:key.startsWith("seg") ? "seg" : "poly", dash:key === "segd", fill:key === "polyf", pts, label:(parts[1] || "").trim() });
      }else if(key === "eq" || key === "eqd" || key === "reg"){
        const parts = val.split(/\s*~\s*/);
        const rels = parts[0].split("&").map(x => x.trim()).filter(Boolean).map(gxRel);
        if(!rels.length) throw new Error("ไม่มีสมการ");
        sp.items.push({ t:key === "reg" ? "reg" : "eq", dash:key === "eqd", rels, label:(parts[1] || "").trim() });
      }else sp.errors.push(it);
    }catch(e){ sp.errors.push(key + ": " + e.message); }
  });
  return sp;
}

/* ---------- ตัวช่วยวาด ---------- */
const gxNice = raw => { if(!(raw > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
const gxFmt = v => { const r = Math.round(v * 1e6) / 1e6; return String(r).replace("-", "−"); };
const gxR = v => Math.round(v * 100) / 100;
const GX_GREEK = { alpha:"α", beta:"β", gamma:"γ", delta:"δ", theta:"θ", lambda:"λ", mu:"μ", pi:"π", sigma:"σ", phi:"φ", omega:"ω", Delta:"Δ" };
/* ข้อความในกราฟ: ตัวอักษรเป็นตัวเอียง รองรับ _{ } ตัวห้อย ^{ } ตัวยก */
function gxText(s){
  const t = String(s).replace(/\\([A-Za-z]+)/g, (m, c) => GX_GREEK[c] || "").replace(/[$]/g, "");
  let out = "", i = 0, off = 0;
  const run = (txt, ital) => txt ? `<tspan${ital ? ' font-style="italic"' : ""}>${escH(txt)}</tspan>` : "";
  const shift = d => { if(!d) return ""; const r = `<tspan dy="${d}"></tspan>`; return r; };
  while(i < t.length){
    const c = t[i];
    if(c === "_" || c === "^"){
      let body = ""; i++;
      if(t[i] === "{"){ const j = t.indexOf("}", i); body = t.slice(i + 1, j < 0 ? t.length : j); i = j < 0 ? t.length : j + 1; }
      else{ body = t[i] || ""; i++; }
      const dy = c === "_" ? 4 : -6;
      out += `<tspan dy="${dy}" font-size="75%">${escH(body)}</tspan><tspan dy="${-dy}"></tspan>`;
      continue;
    }
    const m = t.slice(i).match(/^[A-Za-zα-ωΑ-Ω]+/);
    if(m){ out += run(m[0], true); i += m[0].length; continue; }
    const n = t.slice(i).match(/^[^A-Za-zα-ωΑ-Ω_^]+/);
    out += run(n[0], false); i += n[0].length;
  }
  return out;
}
const gxPtW = s => { let w = 0; String(s).replace(/\\[A-Za-z]+/g, "a").split("").forEach(ch => { w += /[0-9]/.test(ch) ? 8 : /[A-Za-z]/.test(ch) ? 9 : /[(),.\s]/.test(ch) ? 4.6 : 9; }); return w * 1.04 + 3; };
const gxTxtW = s => String(s).replace(/\\[A-Za-z]+/g, "a").replace(/[_^{}$]/g, "").length * 8.6;

/* เส้นโค้งแบบ implicit (วงกลม วงรี ไฮเพอร์โบลา ฯลฯ) ด้วย marching squares → คืนเส้นต่อเนื่อง (พิกัดคณิตศาสตร์) */
function gxImplicit(F, x0, x1, y0, y1, nx, ny){
  const dx = (x1 - x0) / nx, dy = (y1 - y0) / ny, val = [];
  for(let j = 0; j <= ny; j++){
    const row = new Float64Array(nx + 1), yy = y1 - j * dy;
    for(let i = 0; i <= nx; i++){ let v; try{ v = F(x0 + i * dx, yy); }catch(e){ v = NaN; } row[i] = isFinite(v) ? v : NaN; }
    val.push(row);
  }
  const segs = [], adj = new Map();
  const add = (a, b) => { const k = segs.length; segs.push([a, b]); (adj.get(a) || adj.set(a, []).get(a)).push(k); (adj.get(b) || adj.set(b, []).get(b)).push(k); };
  for(let j = 0; j < ny; j++) for(let i = 0; i < nx; i++){
    const a = val[j][i], b = val[j][i+1], c = val[j+1][i+1], d = val[j+1][i];
    if(a !== a || b !== b || c !== c || d !== d) continue;
    const idx = (a >= 0 ? 1 : 0) | (b >= 0 ? 2 : 0) | (c >= 0 ? 4 : 0) | (d >= 0 ? 8 : 0);
    if(idx === 0 || idx === 15) continue;
    const T = "h" + i + "_" + j, B = "h" + i + "_" + (j+1), Lf = "v" + i + "_" + j, Rt = "v" + (i+1) + "_" + j;
    switch(idx){
      case 1: case 14: add(Lf, T); break;
      case 2: case 13: add(T, Rt); break;
      case 4: case 11: add(Rt, B); break;
      case 8: case 7: add(B, Lf); break;
      case 3: case 12: add(Lf, Rt); break;
      case 6: case 9: add(T, B); break;
      case 5: { const cen = (a + b + c + d) / 4 >= 0; if(cen){ add(T, Rt); add(B, Lf); } else { add(Lf, T); add(Rt, B); } break; }
      case 10: { const cen = (a + b + c + d) / 4 >= 0; if(cen){ add(Lf, T); add(Rt, B); } else { add(T, Rt); add(B, Lf); } break; }
    }
  }
  const pt = k => {
    const m = k.match(/^([hv])(\d+)_(\d+)$/), i = +m[2], j = +m[3];
    if(m[1] === "h"){ const fa = val[j][i], fb = val[j][i+1], t = fa / (fa - fb); return [x0 + (i + (isFinite(t) ? t : .5)) * dx, y1 - j * dy]; }
    const fa = val[j][i], fb = val[j+1][i], t = fa / (fa - fb); return [x0 + i * dx, y1 - (j + (isFinite(t) ? t : .5)) * dy];
  };
  const used = new Uint8Array(segs.length), chains = [];
  for(let s = 0; s < segs.length; s++){
    if(used[s]) continue; used[s] = 1;
    const ch = [segs[s][0], segs[s][1]];
    for(let dir = 0; dir < 2; dir++) for(;;){
      const end = dir === 0 ? ch[ch.length-1] : ch[0];
      const q = (adj.get(end) || []).find(z => !used[z]);
      if(q === undefined) break;
      used[q] = 1; const nk = segs[q][0] === end ? segs[q][1] : segs[q][0];
      if(dir === 0) ch.push(nk); else ch.unshift(nk);
    }
    chains.push(ch.map(pt));
  }
  return chains;
}

/* ---------- วาดกราฟ → SVG (ขนาดจริง มม.) ---------- */
function gxBuild(src, Wmm, Hmm){
  const sp = gxSpec(src);
  let rg = sp.range;
  if(!rg){
    const all = []; sp.items.forEach(it => { if(it.p) all.push(it.p); if(it.pts) it.pts.forEach(q => all.push(q)); });
    if(all.length){
      let a = Math.min(0, ...all.map(q => q[0])), b = Math.max(0, ...all.map(q => q[0])), c = Math.min(0, ...all.map(q => q[1])), d = Math.max(0, ...all.map(q => q[1]));
      rg = [Math.floor(a - 1), Math.ceil(b + 1), Math.floor(c - 1), Math.ceil(d + 1)];
    }else rg = [-6, 6, -6, 6];
  }
  const [x0, x1, y0, y1] = rg, xr = x1 - x0, yr = y1 - y0;
  const M = { l:32, r:26, t:20, b:26 };
  const Wp = Wmm * GX_PXMM, Hp = Hmm * GX_PXMM;
  let ux, uy;
  if(sp.free){ ux = (Wp - M.l - M.r) / xr; uy = (Hp - M.t - M.b) / yr; }
  else{ ux = uy = Math.max(4, Math.min((Wp - M.l - M.r) / xr, (Hp - M.t - M.b) / yr)); }
  const pw = ux * xr, ph = uy * yr, W = pw + M.l + M.r, H = ph + M.t + M.b;
  const X = v => M.l + (v - x0) * ux, Y = v => M.t + (y1 - v) * uy;
  const id = ++GX_ID, clip = "gc" + id, hat = "gh" + id;
  const axX = X(Math.min(x1, Math.max(x0, 0))), axY = Y(Math.min(y1, Math.max(y0, 0)));
  const FONT = 'font-family="Cambria Math,Times New Roman,Tahoma,serif"';
  const halo = 'stroke="#fff" stroke-width="3.6" stroke-linejoin="round" paint-order="stroke"';
  const o = [];
  /* ตาราง + ขีดตัวเลข */
  let sx = sp.step || gxNice((x0 < 0 ? 22 : 15) / ux), sy = sp.step || gxNice(13 / uy);
  if(!sp.free && !sp.step){ sx = sy = Math.max(sx, sy); }
  const gridL = [], ticks = [], numBoxes = [];
  const oIn = x0 <= 0 && x1 >= 0 && y0 <= 0 && y1 >= 0, oNamed = sp.items.some(it => it.t === "pt" && !it.dot && it.name && it.p[0] === 0 && it.p[1] === 0), showO = sp.num && !oNamed && oIn;
  for(let k = Math.ceil(x0 / sx - 1e-9); k * sx <= x1 + 1e-9; k++){
    const v = k * sx; if(Math.abs(v) < 1e-9) continue;
    if(sp.grid) gridL.push(`<line x1="${gxR(X(v))}" y1="${M.t}" x2="${gxR(X(v))}" y2="${gxR(M.t + ph)}"/>`);
    ticks.push(`<line x1="${gxR(X(v))}" y1="${gxR(axY - 3.5)}" x2="${gxR(X(v))}" y2="${gxR(axY + 3.5)}" stroke="#111" stroke-width="1.3"/>`);
    if(sp.num && !(showO && v < 0 && -v * ux < 26)){ const nw = gxFmt(v).length * 7.6 + 2; numBoxes.push({ x0:X(v) - nw / 2, x1:X(v) + nw / 2, y0:axY + 4, y1:axY + 21 }); }
    if(sp.num && !(showO && v < 0 && -v * ux < 26)) ticks.push(`<text x="${gxR(X(v))}" y="${gxR(axY + 17)}" text-anchor="middle" font-size="13.5" ${FONT} ${halo}>${gxFmt(v)}</text>`);
  }
  for(let k = Math.ceil(y0 / sy - 1e-9); k * sy <= y1 + 1e-9; k++){
    const v = k * sy; if(Math.abs(v) < 1e-9) continue;
    if(sp.grid) gridL.push(`<line x1="${M.l}" y1="${gxR(Y(v))}" x2="${gxR(M.l + pw)}" y2="${gxR(Y(v))}"/>`);
    ticks.push(`<line x1="${gxR(axX - 3.5)}" y1="${gxR(Y(v))}" x2="${gxR(axX + 3.5)}" y2="${gxR(Y(v))}" stroke="#111" stroke-width="1.3"/>`);
    if(sp.num && !(v < 0 && Y(v) - axY < 20 && axY < M.t + ph - 4)){ const nw = gxFmt(v).length * 7.6 + 2; numBoxes.push({ x0:axX - 8 - nw, x1:axX - 6, y0:Y(v) - 9, y1:Y(v) + 6 }); }
    if(sp.num && !(v < 0 && Y(v) - axY < 20 && axY < M.t + ph - 4)) ticks.push(`<text x="${gxR(axX - 8)}" y="${gxR(Y(v) + 4.7)}" text-anchor="end" font-size="13.5" ${FONT} ${halo}>${gxFmt(v)}</text>`);
  }
  o.push(`<g stroke="#d4d4d4" stroke-width=".8">${gridL.join("")}</g>`);
  /* ส่วนที่ถูกตัดตามกรอบกราฟ */
  const cur = [], fills = [], labels = [], dots = [], placed = [], ptLabs = [], ptDots = [], curvePts = [];
  const poly = (pts, close) => "M" + pts.map(q => gxR(q[0]) + " " + gxR(q[1])).join("L") + (close ? "Z" : "");
  const stroke = (d, dash) => `<path d="${d}" fill="none" stroke="#111" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"${dash ? ' stroke-dasharray="7 5"' : ""}/>`;
  const inBox = q => q[0] >= M.l + 2 && q[0] <= M.l + pw - 2 && q[1] >= M.t + 2 && q[1] <= M.t + ph - 2;
  /* เก็บจุดตัวอย่างบนเส้นกราฟ ไว้ให้ป้ายของจุดเลี่ยง */
  const addPl = pl => { for(let i = 0; i < pl.length; i++){ const a = pl[i], b = pl[i + 1] || a, n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3)); for(let k = 0; k < n; k++){ const q = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]; if(inBox(q)) curvePts.push(q); } } };
  const label = (text, polys, closed) => {
    if(!text) return;
    let best = null, bi = -1, bp = null;
    polys.forEach(pl => pl.forEach((q, k) => { if(inBox(q) && (!best || q[0] > best[0] + 0.5 || (Math.abs(q[0] - best[0]) <= 0.5 && q[1] < best[1]))){ best = q; bi = k; bp = pl; } }));
    if(!best) return;
    let tx, ty, anc = "start";
    if(closed){ tx = best[0] + 6; ty = best[1] - 5; }
    else{
      const nb = bp[Math.max(0, bi - 8)] === best ? bp[Math.min(bp.length - 1, bi + 8)] : bp[Math.max(0, bi - 8)];
      let dx = best[0] - nb[0], dy = best[1] - nb[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      let nx = -dy, ny = dx; if(ny > 0){ nx = -nx; ny = -ny; }
      tx = best[0] + nx * 11 - dx * 6; ty = best[1] + ny * 11 - dy * 6 + 5;
      if(nx < -0.2) anc = "end";
    }
    const w = gxTxtW(text);
    if(anc === "start" && tx + w > W - 2) { tx = W - 2 - w; }
    if(anc === "end" && tx - w < 2) { tx = 2 + w; }
    ty = Math.min(H - 4, Math.max(14, ty));
    placed.push({ x0:anc === "start" ? tx : tx - w, x1:anc === "start" ? tx + w : tx, y0:ty - 13, y1:ty + 3 });
    labels.push(`<text x="${gxR(tx)}" y="${gxR(ty)}" text-anchor="${anc}" font-size="16" ${FONT} ${halo}>${gxText(text)}</text>`);
  };
  const nx = Math.min(240, Math.max(60, Math.round(pw / 3))), ny = Math.min(240, Math.max(60, Math.round(ph / 3)));
  const regionPath = (tests) => {
    const cw = pw / nx, ch = ph / ny, d = [];
    for(let j = 0; j < ny; j++){
      let run = -1;
      const yy = y1 - (j + .5) * (yr / ny);
      for(let i = 0; i <= nx; i++){
        let ok = false;
        if(i < nx){ const xx = x0 + (i + .5) * (xr / nx); ok = tests.every(t => { let v; try{ v = t.F(xx, yy); }catch(e){ v = NaN; } return isFinite(v) && gxHolds(t.op, v); }); }
        if(ok && run < 0) run = i;
        if(!ok && run >= 0){ d.push(`M${gxR(M.l + run * cw - .3)} ${gxR(M.t + j * ch - .3)}h${gxR((i - run) * cw + .6)}v${gxR(ch + .6)}h${gxR(-((i - run) * cw + .6))}z`); run = -1; }
      }
    }
    return d.join("");
  };
  let hasHat = false;
  const drawRel = (r, dash, lab) => {
    const polys = []; let closed = false;
    if(r.mode === "y"){
      const N = Math.max(160, Math.round(pw / 1.5)); let seg = [], prev = null;
      const flush = () => { if(seg.length > 1) polys.push(seg); seg = []; prev = null; };
      for(let k = 0; k <= N; k++){
        const xv = x0 + xr * k / N; let v; try{ v = r.g(xv, 0); }catch(e){ v = NaN; }
        if(!isFinite(v)){ flush(); continue; }
        const q = [X(xv), Math.max(-6 * H, Math.min(7 * H, Y(v)))];
        if(prev && Math.abs(q[1] - prev[1]) > 2.2 * ph){ flush(); }
        seg.push(q); prev = q;
      }
      flush();
    }else if(r.mode === "x"){
      const N = Math.max(160, Math.round(ph / 1.5)); let seg = [], prev = null;
      const flush = () => { if(seg.length > 1) polys.push(seg); seg = []; prev = null; };
      for(let k = 0; k <= N; k++){
        const yv = y0 + yr * k / N; let v; try{ v = r.g(0, yv); }catch(e){ v = NaN; }
        if(!isFinite(v)){ flush(); continue; }
        const q = [Math.max(-6 * W, Math.min(7 * W, X(v))), Y(yv)];
        if(prev && Math.abs(q[0] - prev[0]) > 2.2 * pw){ flush(); }
        seg.push(q); prev = q;
      }
      flush();
    }else{
      gxImplicit(r.F, x0, x1, y0, y1, nx, ny).forEach(ch => {
        const pl = ch.map(q => [X(q[0]), Y(q[1])]);
        if(pl.length > 3 && Math.hypot(pl[0][0] - pl[pl.length-1][0], pl[0][1] - pl[pl.length-1][1]) < 0.01) closed = true;
        polys.push(pl);
      });
    }
    polys.forEach(pl => cur.push(stroke(poly(pl, false), dash)));
    polys.forEach(addPl);
    label(lab, polys, closed);
  };
  sp.items.forEach(it => {
    try{
      if(it.t === "eq" || it.t === "reg"){
        const rels = it.rels, ineq = rels.filter(r => r.op !== "=");
        if(ineq.length){
          const d = regionPath(ineq.map(r => ({ F:r.F, op:r.op, eq:r.op }))); hasHat = true;
          if(d) fills.push(`<path d="${d}" fill="url(#${hat})"/>`);
        }
        rels.forEach((r, k) => drawRel(r, it.dash || r.op === "<" || r.op === ">", k === rels.length - 1 ? it.label : ""));
      }else if(it.t === "seg"){
        const pl = it.pts.map(q => [X(q[0]), Y(q[1])]);
        cur.push(stroke(poly(pl, false), it.dash)); addPl(pl);
        const mid = pl[Math.floor(pl.length / 2)], prv = pl[Math.floor(pl.length / 2) - 1] || pl[0], nxt = pl[Math.floor(pl.length / 2)];
        if(it.label){ const mx = (prv[0] + nxt[0]) / 2, my = (prv[1] + nxt[1]) / 2; labels.push(`<text x="${gxR(mx + 6)}" y="${gxR(my - 6)}" font-size="16" ${FONT} ${halo}>${gxText(it.label)}</text>`); }
      }else if(it.t === "poly"){
        const pl = it.pts.map(q => [X(q[0]), Y(q[1])]);
        if(it.fill){ hasHat = true; fills.push(`<path d="${poly(pl, true)}" fill="url(#${hat})"/>`); }
        cur.push(stroke(poly(pl, true), false)); addPl(pl.concat([pl[0]]));
        if(it.label){ const cx = pl.reduce((s, q) => s + q[0], 0) / pl.length, cy = pl.reduce((s, q) => s + q[1], 0) / pl.length; placed.push({ x0:cx - gxTxtW(it.label) / 2, x1:cx + gxTxtW(it.label) / 2, y0:cy - 8, y1:cy + 8 }); labels.push(`<text x="${gxR(cx)}" y="${gxR(cy + 5)}" text-anchor="middle" font-size="16" ${FONT} ${halo}>${gxText(it.label)}</text>`); }
      }else if(it.t === "pt"){
        const px = X(it.p[0]), py = Y(it.p[1]);
        dots.push(`<circle cx="${gxR(px)}" cy="${gxR(py)}" r="3.6" fill="#111"/>`);
        ptDots.push({ x0:px - 5, x1:px + 5, y0:py - 5, y1:py + 5 });
        const txt = it.dot ? "" : (it.name + ((it.coord || (it.name && EX.v.gcoord !== "cmd")) ? "(" + gxFmt(it.p[0]) + ", " + gxFmt(it.p[1]) + ")" : ""));
        if(txt) ptLabs.push({ px, py, txt, w:gxPtW(txt), own:ptDots.length - 1 });
      }else if(it.t === "txt"){
        { const tw = gxTxtW(it.text), qx = X(it.p[0]), qy = Y(it.p[1]); placed.push({ x0:qx - tw / 2, x1:qx + tw / 2, y0:qy - 13, y1:qy + 3 }); }
        labels.push(`<text x="${gxR(X(it.p[0]))}" y="${gxR(Y(it.p[1]))}" text-anchor="middle" font-size="16" ${FONT} ${halo}>${gxText(it.text)}</text>`);
      }
    }catch(e){ sp.errors.push(e.message); }
  });
  /* วางป้ายชื่อ/พิกัดของจุด: ไม่ให้ทับกัน ทับจุด ทับเส้นกราฟ ทับตัวเลขบนแกน หรือทับป้ายอื่น (ถ้าแน่นมากจะยกขึ้นเป็นขั้นพร้อมเส้นโยง) */
  if(ptLabs.length){
    const base = placed.slice();
    numBoxes.forEach(b => base.push(b));
    if(showO) base.push({ x0:axX - 24, x1:axX - 5, y0:axY + 4, y1:axY + 21 });
    const ov = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    const CA = [[7,-7,"start",0],[-7,-7,"end",0],[7,17,"start",0],[-7,17,"end",0],[0,-11,"middle",0],[0,23,"middle",0],[11,5,"start",0],[-11,5,"end",0]];
    for(let k = 1; k <= 4; k++){ const u = -7 - 17 * k, d = 17 + 17 * k; CA.push([-2,u,"start",1],[2,u,"end",1],[0,u,"middle",1],[-2,d,"start",1],[2,d,"end",1],[0,d,"middle",1]); }
    const obsOf = b => b.c[3] ? [b.r, { x0:b.P.px - 1, x1:b.P.px + 1, y0:Math.min(b.sy, b.ly), y1:Math.max(b.sy, b.ly) }] : [b.r];
    const evalP = (P, now) => {
      let best = null;
      CA.forEach((c, idx) => {
        const ty = P.py + c[1], x0 = c[2] === "start" ? P.px + c[0] : c[2] === "end" ? P.px + c[0] - P.w : P.px + c[0] - P.w / 2;
        const r = { x0:x0 - 3, x1:x0 + P.w + 3, y0:ty - 13, y1:ty + 3 };
        let cost = idx * 3;
        if(r.x0 < 2 || r.x1 > W - 2 || r.y0 < 1 || r.y1 > H - 1) cost += 3000;
        else if(r.y1 > M.t + ph + 2 || r.y0 < M.t - 2) cost += 80;
        now.forEach(b => { const a = ov(r, b); if(a > 0) cost += 1000 + a; });
        ptDots.forEach((b, bi) => { if(bi === P.own) return; const a = ov(r, b); if(a > 0) cost += 1000 + a; });
        let nc = 0; for(let q = 0; q < curvePts.length; q++){ const z = curvePts[q]; if(z[0] > r.x0 - 1 && z[0] < r.x1 + 1 && z[1] > r.y0 - 1 && z[1] < r.y1 + 1) nc++; }
        if(nc) cost += 30 + Math.min(nc, 40);
        let lx = 0, ly = 0, sy = 0;
        if(c[3]){
          cost += 20;
          lx = Math.min(Math.max(P.px, r.x0 + 2), r.x1 - 2); sy = P.py + (c[1] < 0 ? -5 : 5); ly = c[1] < 0 ? r.y1 - 1 : r.y0 + 1;
          for(let q = 1; q <= 8; q++){ const t = q / 8, qx = P.px + (lx - P.px) * t, qy = sy + (ly - sy) * t; if(now.some(b => qx > b.x0 - 1 && qx < b.x1 + 1 && qy > b.y0 - 1 && qy < b.y1 + 1)){ cost += 1000; break; } }
        }
        if(!best || cost < best.cost) best = { cost, c, r, ty, lx, ly, sy, P };
      });
      return best;
    };
    const run = order => {
      let cur = [];
      order.forEach(P => { const now = base.slice(); cur.forEach(b => obsOf(b).forEach(z => now.push(z))); cur.push(evalP(P, now)); });
      for(let pass = 0; pass < 3; pass++){
        let moved = false;
        for(let i = 0; i < cur.length; i++){
          const now = base.slice(); cur.forEach((b, j) => { if(j !== i) obsOf(b).forEach(z => now.push(z)); });
          const nb = evalP(cur[i].P, now); if(nb.c !== cur[i].c) moved = true; cur[i] = nb;
        }
        if(!moved) break;
      }
      return { out:cur, total:cur.reduce((t, b) => t + b.cost, 0) };
    };
    const byX = ptLabs.slice().sort((a, b) => a.px - b.px);
    const orders = [byX, byX.slice().reverse(), ptLabs];
    let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    if(ptLabs.length > 2) for(let t = 0; t < 12; t++){ const o2 = ptLabs.slice(); for(let i = o2.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); const tmp = o2[i]; o2[i] = o2[j]; o2[j] = tmp; } orders.push(o2); }
    let win = null;
    for(const od of orders){ const r = run(od); if(!win || r.total < win.total) win = r; if(win.total < 60 * ptLabs.length) break; }
    win.out.forEach(b => {
      const c = b.c, P = b.P;
      if(c[3]) labels.push(`<line x1="${gxR(P.px)}" y1="${gxR(b.sy)}" x2="${gxR(b.lx)}" y2="${gxR(b.ly)}" stroke="#444" stroke-width="1"/>`);
      labels.push(`<text x="${gxR(P.px + c[0])}" y="${gxR(b.ty)}" text-anchor="${c[2]}" font-size="16" ${FONT} ${halo}>${gxText(P.txt)}</text>`);
    });
  }
  if(hasHat) o.push(`<defs><pattern id="${hat}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#555" stroke-width="1"/></pattern></defs>`);
  o.push(`<defs><clipPath id="${clip}"><rect x="${M.l}" y="${M.t}" width="${gxR(pw)}" height="${gxR(ph)}"/></clipPath></defs>`);
  o.push(`<g clip-path="url(#${clip})">${fills.join("")}${cur.join("")}</g>`);
  /* แกน x, y พร้อมหัวลูกศร */
  const tipX = M.l + pw + 9, tipY = M.t - 9;
  o.push(`<g stroke="#111" stroke-width="1.6" fill="#111"><line x1="${M.l - 2}" y1="${gxR(axY)}" x2="${gxR(tipX - 6)}" y2="${gxR(axY)}"/><path d="M${gxR(tipX)} ${gxR(axY)} l-10 -3.8 v7.6z" stroke="none"/>`
    + `<line x1="${gxR(axX)}" y1="${gxR(M.t + ph + 2)}" x2="${gxR(axX)}" y2="${gxR(tipY + 6)}"/><path d="M${gxR(axX)} ${gxR(tipY)} l-3.8 10 h7.6z" stroke="none"/></g>`);
  o.push(`<text x="${gxR(tipX + 3)}" y="${gxR(axY + 5.5)}" font-size="17" font-style="italic" ${FONT}>x</text>`);
  o.push(`<text x="${gxR(axX + 9)}" y="${gxR(tipY + 5)}" font-size="17" font-style="italic" ${FONT}>y</text>`);
  if(showO) o.push(`<text x="${gxR(axX - 7)}" y="${gxR(axY + 17)}" text-anchor="end" font-size="15" font-style="italic" ${FONT} ${halo}>O</text>`);
  o.push(ticks.join(""));
  o.push(dots.join(""), labels.join(""));
  if(sp.errors.length) o.push(`<text x="4" y="${gxR(H - 3)}" font-size="11" fill="#888" font-family="Tahoma,sans-serif">⚠ ${escH(sp.errors[0]).slice(0, 70)}</text>`);
  const wmm = W / GX_PXMM, hmm = H / GX_PXMM;
  return { svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${gxR(W)} ${gxR(H)}" preserveAspectRatio="xMidYMid meet" style="width:calc(${gxR(wmm)}mm*var(--s,1)); max-width:100%; height:auto;" role="img" aria-label="กราฟประกอบโจทย์">${o.join("")}</svg>`, w:wmm, h:hmm, errors:sp.errors };
}
function gxHtml(spec, g, n){
  g = g || { w:80, h:48 };
  try{
    const r = gxBuild(spec, g.w, Math.max(18, g.h / Math.max(1, n || 1)));
    return `<div class="fg">${r.svg}</div>`;
  }catch(e){ return `<div class="fg gerr">⚠ อ่านคำสั่งกราฟไม่ได้: ${escH(e.message)}</div>`; }
}

const exFmt = (t, g) => {
  const gs = [];
  t = String(t).replace(/\[\[\s*G\s*[:：]([\s\S]*?)\]\]/gi, (m, sp) => { gs.push(sp); return "\uE000" + (gs.length - 1) + "\uE001"; });
  const h = escH(pdFixMath(pdAr(t)))
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\s*\/\/\s*/g, "<br>")
    .replace(/\[_{2,}\]/g, '<span class="bl"></span>');
  return h.replace(/(?:<br>)?\s*\uE000(\d+)\uE001\s*(?:<br>)?/g, (m, i) => gxHtml(gs[+i], g, gs.length));
};
const EX_GRIN = '<i class="gx"><b>x</b></i><i class="gy"><b>y</b></i><i class="tx"></i><i class="ty"></i>';
function exAnsHtml(it, g){
  const ls = String(it.a || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if(!ls.length) return '<div class="ans"><span class="al">เฉลย</span><div class="as nn">ยังไม่ได้ใส่เฉลย</div></div>';
  return '<div class="ans"><span class="al">เฉลย</span>' + ls.map(x => `<div class="as${/^\s*ตอบ/.test(x) ? " fin" : ""}">${exFmt(x, g)}</div>`).join("") + '</div>';
}
/* gc = {w,h} มม. ขนาดสูงสุดของกราฟในการ์ดของชุดนี้ (คำนวณจากจำนวนคอลัมน์/แถว/บรรทัดวิธีทำ) */
function exTable(items, cols, nl, gr, ans, gc){
  const trs = [];
  for(let i = 0; i < items.length; i += cols){
    const tds = [];
    for(let k = 0; k < cols; k++){
      const it = items[i+k];
      tds.push(it
        ? `<td class="q"><span class="no">${it.n}</span><div class="t">${exFmt(it.t, gc)}</div>${ans ? exAnsHtml(it, gc) : gr ? (nl > 0 ? `<div class="gr" style="--n:${Math.max(3, nl)}">${EX_GRIN}</div>` : "") : Array(nl).fill('<div class="dl"></div>').join("")}</td>`
        : `<td class="e"></td>`);
    }
    trs.push(`<tr>${tds.join("")}</tr>`);
  }
  return `<table class="g">${trs.join("")}</table>`;
}
const EX_GRIN_JS = '<i class="gx"><b>x</b></i><i class="gy"><b>y</b></i><i class="tx"></i><i class="ty"></i>';
const EX_SEAL = "polygon(50.0% 0.0%,58.2% 8.8%,69.1% 3.8%,73.3% 15.1%,85.4% 14.6%,84.9% 26.7%,96.2% 30.9%,91.2% 41.8%,100.0% 50.0%,91.2% 58.2%,96.2% 69.1%,84.9% 73.3%,85.4% 85.4%,73.3% 84.9%,69.1% 96.2%,58.2% 91.2%,50.0% 100.0%,41.8% 91.2%,30.9% 96.2%,26.7% 84.9%,14.6% 85.4%,15.1% 73.3%,3.8% 69.1%,8.8% 58.2%,0.0% 50.0%,8.8% 41.8%,3.8% 30.9%,15.1% 26.7%,14.6% 14.6%,26.7% 15.1%,30.9% 3.8%,41.8% 8.8%)";
const EX_CSS_EXTRA = `
.gr{position:relative; height:calc(var(--lh)*var(--s)*var(--n,4)); margin:calc(1mm*var(--s)) 0 calc(.6mm*var(--s));}
.gr i{position:absolute; display:block;}
.gr b{position:absolute; font-weight:400; font-style:italic; font-size:calc(13pt*var(--s)); line-height:1;}
.gr .gx{left:0; right:0; top:50%; border-top:1.2pt solid #111;}
.gr .gx b{right:0; top:calc(1.8mm*var(--s));}
.gr .gx::after{content:""; position:absolute; right:calc(-.4mm*var(--s)); top:calc(-1.3mm*var(--s)); border-left:calc(2.4mm*var(--s)) solid #111; border-top:calc(1.1mm*var(--s)) solid transparent; border-bottom:calc(1.1mm*var(--s)) solid transparent;}
.gr .gy{top:0; bottom:0; left:50%; border-left:1.2pt solid #111;}
.gr .gy b{left:calc(2.2mm*var(--s)); top:0;}
.gr .gy::before{content:""; position:absolute; top:calc(-.4mm*var(--s)); left:calc(-1.3mm*var(--s)); border-bottom:calc(2.4mm*var(--s)) solid #111; border-left:calc(1.1mm*var(--s)) solid transparent; border-right:calc(1.1mm*var(--s)) solid transparent;}
.gr .tx{left:calc(3.5mm*var(--s)); right:calc(3.5mm*var(--s)); top:50%; height:calc(2.8mm*var(--s)); transform:translateY(-50%); background:linear-gradient(90deg,#111 1pt,transparent 1pt) 50% 0 / calc(6mm*var(--s)) 100% repeat-x;}
.gr .ty{top:calc(3.5mm*var(--s)); bottom:calc(3.5mm*var(--s)); left:50%; width:calc(2.8mm*var(--s)); transform:translateX(-50%); background:linear-gradient(180deg,#111 1pt,transparent 1pt) 0 50% / 100% calc(6mm*var(--s)) repeat-y;}
/* กราฟประกอบโจทย์ */
.fg{text-align:center; text-indent:0; margin:calc(1.2mm*var(--s)) 0 calc(.8mm*var(--s)); line-height:0;}
.fg svg{display:inline-block; max-width:100%; height:auto; overflow:visible;}
.fg.gerr{line-height:1.25; font-size:calc(12pt*var(--s)); color:#777; font-style:italic;}
/* เฉลย */
.ans{margin-top:calc(1.8mm*var(--s)); padding-top:calc(1.6mm*var(--s)); border-top:1.1pt dashed #111; font-size:calc(14.5pt*var(--s)); line-height:1.32;}
.ans .al{display:inline-block; background:#111; color:#fff; border-radius:calc(2mm*var(--s)); padding:0 calc(2.2mm*var(--s)); font-size:calc(11.5pt*var(--s)); font-weight:700; margin-bottom:calc(.8mm*var(--s)); line-height:1.4;}
.ans .as.fin{font-weight:700;}
.ans .as.nn{color:#777; font-style:italic;}
.ans .katex{font-size:.86em !important;}
/* รูปแบบ: ตะเข็บผ้า */
.th-stitch td.q{border-radius:calc(6mm*var(--s)); padding:calc(3.4mm*var(--s)) calc(4.2mm*var(--s)) calc(2.2mm*var(--s));}
.th-stitch td.q::before{content:""; position:absolute; inset:calc(1.2mm*var(--s)); border:1.1pt dashed #111; border-radius:calc(4.8mm*var(--s)); pointer-events:none;}
.th-stitch .no{background:#111; color:#fff; border-color:#111; outline:1pt dashed #111; outline-offset:calc(.7mm*var(--s));}
/* รูปแบบ: โน้ตติดเทป */
.th-note td.q{border-radius:calc(1.4mm*var(--s)); box-shadow:calc(1.5mm*var(--s)) calc(1.5mm*var(--s)) 0 #111; padding-top:calc(5.2mm*var(--s));}
.th-note td.q::before{content:""; position:absolute; top:calc(-3.6mm*var(--s)); left:50%; width:calc(15mm*var(--s)); height:calc(5.4mm*var(--s)); margin-left:calc(-7.5mm*var(--s)); transform:rotate(-3deg); border:1pt solid #111; background:repeating-linear-gradient(45deg,#fff 0 1.1mm,#c9c9c9 1.1mm 2.2mm);}
.th-note .no{border-radius:calc(1.6mm*var(--s)); transform:rotate(-7deg); border-width:1.3pt; box-shadow:calc(.7mm*var(--s)) calc(.7mm*var(--s)) 0 #111;}
/* รูปแบบ: ตราดาว */
.th-star td.q{border-radius:calc(7mm*var(--s)) calc(2mm*var(--s)) calc(7mm*var(--s)) calc(2mm*var(--s));}
.th-star td.q::after{content:"\\2726 \\2661 \\2726"; position:absolute; right:calc(5mm*var(--s)); top:calc(-2.9mm*var(--s)); background:#fff; padding:0 calc(1.4mm*var(--s)); font-size:calc(11pt*var(--s)); line-height:1.25; letter-spacing:.3mm; font-family:"Segoe UI Symbol","Noto Sans Symbols 2","Apple Symbols",sans-serif;}
.th-star .no{background:#111; color:#fff; border:0; border-radius:0; clip-path:${EX_SEAL}; width:calc(8.6mm*var(--s)); height:calc(8.6mm*var(--s)); left:calc(-3.2mm*var(--s)); top:calc(-3.8mm*var(--s)); line-height:calc(8.6mm*var(--s)); font-size:calc(13.5pt*var(--s));}
`;
const EX_FIT = `(function(){var done=false;
function fitOne(pg){
  var box=pg.querySelector('.box'),tb=pg.querySelector('table.g'),rows=tb?tb.rows:[];
  var s=1;pg.style.setProperty('--s',s);
  var used=function(){return tb.getBoundingClientRect().bottom-box.getBoundingClientRect().top;};
  if(pg.getAttribute('data-auto')==='1'&&rows.length){
    var t0=pg.querySelector('td.q'),unit=t0?parseFloat(getComputedStyle(t0).lineHeight):0,free=box.clientHeight-used();
    if(unit>0&&free>0){var cap=(+pg.getAttribute('data-per')||6)<=2?40:12,k=Math.min(cap,Math.floor((free-4)/(rows.length*unit)));
      if(k>0){var cells=tb.querySelectorAll('td.q'),isg=pg.getAttribute('data-gr')==='1';
        for(var c=0;c<cells.length;c++){
          if(isg){var gd=document.createElement('div');gd.className='gr';gd.style.setProperty('--n',Math.max(3,k));gd.innerHTML='${EX_GRIN_JS}';cells[c].appendChild(gd);}
          else for(var j=0;j<k;j++){var dv=document.createElement('div');dv.className='dl';cells[c].appendChild(dv);}}}}
  }
  while(used()>box.clientHeight+1&&s>0.7){s=Math.round((s-0.02)*100)/100;pg.style.setProperty('--s',s);}
  var over=used()>box.clientHeight+1;
  if(!over&&rows.length){
    var extra=box.clientHeight-used()-6;
    if(extra>0){var each=extra/rows.length;
      for(var i=0;i<rows.length;i++){var h=rows[i].offsetHeight;rows[i].style.height=(h+Math.min(each,h*0.6))+'px';}}
  }
  return {s:s,over:over};
}
function fit(){
  var pgs=document.querySelectorAll('.pg'),min=1,bad=0;
  for(var i=0;i<pgs.length;i++){var r=fitOne(pgs[i]);if(r.s<min)min=r.s;if(r.over&&!bad)bad=i+1;}
  try{if(window.parent!==window)window.parent.postMessage({kcEx:1,s:min,over:bad,pages:pgs.length,h:Math.max(document.documentElement.scrollHeight,1123)},'*');}catch(e){}
}
function go(){if(done)return;done=true;
  try{if(window.renderMathInElement)renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});}catch(e){}
  var after=function(){fit();if(window.__kcPrint){setTimeout(function(){try{window.focus();window.print();}catch(e){}},250);}};
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(after,after);
}
window.addEventListener('load',go);setTimeout(go,8000);})();`;
/* ฟอนต์ไทย: ใช้ TH Sarabun New ที่ติดตั้งในเครื่อง (ถ้ามี) — ถ้าอัปโหลดไฟล์ฟอนต์ไว้บนเว็บ ใส่ URL ที่นี่ เช่น "font/THSarabunNew.ttf" */
const EX_FONT_URL = "", EX_MATH_SIZE = 0.72;
function exDoc(mode){
  const d = exCur, print = mode === "print";
  const ans = !!EX.v.showAns;
  const title = ((EX.v.title || "").trim() || d.title || "แบบฝึกหัดที่ 1") + (ans ? " (เฉลย)" : "");
  const ls = EX.v.lstyle === "dotted" ? "1px dotted #222" : "1px solid #666";
  const headBase = String(EX.v.head ?? "").replace(/\s*หน้าที่\s*[\d๐-๙]+\s*$/, "").trim();
  const chunks = [];
  for(let i = 0; i < d.items.length;){
    const cf = exCfgFor(d.items[i].n); let j = i;
    while(j < d.items.length && j - i < cf.per && exCfgFor(d.items[j].n).gi === cf.gi) j++;
    chunks.push({ it:d.items.slice(i, j), cf }); i = j;
  }
  const pages = chunks.map((ch, k) => { const c = ch.it, cf = ch.cf, auto = !ans && cf.lines === "auto", nl = (auto || ans) ? 0 : Math.min(40, Math.max(0, +cf.lines || 0)), lh = Math.min(14, Math.max(4.5, parseFloat(cf.lh) || 7.2)), cols = cf.cols;
    const rowsN = Math.max(1, Math.ceil(c.length / cols)), availH = 279 - 9 - (k === 0 ? 16 : 0) - 4, rowH = availH / rowsN - 3.6 - 6;
    const gh = ans ? rowH * 0.4 : (nl > 0 ? rowH - 14 - nl * lh : rowH * 0.58), gw = (194.4 - 3.2 * (cols + 1)) / cols - 8;
    const gc = { w:Math.max(30, gw), h:Math.min(85, Math.max(24, gh)) };
    const gr = !ans && cf.lstyle === "graph", th = EX_THEMES.some(t => t[0] === cf.theme) ? cf.theme : "plain", lsx = cf.lstyle === "dotted" ? "1px dotted #222" : "1px solid #666";
    return `<div class="pg th-${th}" style="--lh:${lh}mm; --ls:${lsx}" data-auto="${auto ? 1 : 0}" data-gr="${gr ? 1 : 0}" data-per="${cf.per}"><div class="box">
<div class="hd">${headBase ? escH(headBase) : "&nbsp;"}</div>
${k === 0 ? `<div class="tr"><div class="tb">${escH(title)}</div><div class="ti">${escH(d.instr || "")}</div></div>` : ""}
${exTable(c, cols, nl, gr, ans, gc)}
</div></div>`; }).join("");
  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>${escH(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>
@font-face{font-family:"KCThai"; src:local("TH Sarabun New"), local("THSarabunNew"), local("TH SarabunPSK"), local("THSarabunPSK")${EX_FONT_URL ? `, url("${EX_FONT_URL}")` : ""};}
@page{size:A4; margin:0;}
*{box-sizing:border-box;}
html,body{margin:0; padding:0; background:#fff;}
body{font-family:'KCThai','TH Sarabun New','TH SarabunPSK','Sarabun',Tahoma,sans-serif; color:#111; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
.pg{--s:1; --lh:7.2mm; width:210mm; height:297mm; padding:9mm 11mm 8mm; position:relative; overflow:hidden; break-after:page; page-break-after:always;}
.pg:last-child{break-after:auto; page-break-after:auto;}
${print ? "" : ".pg{border-bottom:1px dashed #bbb;}"}
.box{height:279mm;}
.hd{text-align:right; font-size:calc(16pt*var(--s)); line-height:1.2; margin:0 0 calc(2mm*var(--s));}
.tr{display:flex; align-items:center; gap:calc(4mm*var(--s)); margin:0 0 calc(3mm*var(--s));}
.tb{flex:none; border:1.4pt solid #111; border-radius:calc(4mm*var(--s)); padding:calc(1.6mm*var(--s)) calc(4mm*var(--s)); font-weight:700; font-size:calc(19pt*var(--s)); background:#fff;}
.ti{font-size:calc(18pt*var(--s)); line-height:1.25;}
table.g{border-collapse:separate; border-spacing:calc(3.2mm*var(--s)) calc(3.6mm*var(--s)); table-layout:fixed; margin:calc(1.5mm*var(--s)) calc(-3.2mm*var(--s)); width:calc(100% + 6.4mm*var(--s));}
td.q{border:1.3pt solid #111; border-radius:calc(3.5mm*var(--s)); padding:calc(2.4mm*var(--s)) calc(3mm*var(--s)) calc(1.6mm*var(--s)); vertical-align:top; position:relative; font-size:calc(17.5pt*var(--s)); line-height:calc(var(--lh)*var(--s)); word-wrap:break-word; overflow-wrap:anywhere;}
td.e{border:0;}
.no{position:absolute; left:calc(-2.6mm*var(--s)); top:calc(-3.2mm*var(--s)); width:calc(7.6mm*var(--s)); height:calc(7.6mm*var(--s)); border:1.1pt solid #111; border-radius:50%; background:#fff; text-align:center; line-height:calc(6.8mm*var(--s)); font-size:calc(14.5pt*var(--s)); font-weight:600;}
.t{text-indent:calc(5mm*var(--s));}
.dl{border-bottom:var(--ls,1px solid #666); height:calc(var(--lh)*var(--s));}
.bl{display:inline-block; min-width:calc(24mm*var(--s)); height:0.95em; border-bottom:1px dotted #222; vertical-align:baseline;}
.katex{font-size:${EX_MATH_SIZE}em !important; line-height:1.2 !important;} .katex-display{margin:0.3em 0 !important;}
${EX_CSS_EXTRA}
</style></head><body>${pages}
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>
<script>${print ? "window.__kcPrint=1;" : ""}${EX_FIT}<\/script></body></html>`;
}

function exScale(){
  if(!ex.pv || ex.pv.style.display === "none") return;
  const k = Math.min(1, ex.pv.clientWidth / 794);
  ex.frame.style.transform = `scale(${k})`;
  ex.pv.style.height = (ex.h * k) + "px";
}
function exEdHtml(){
  const c = (cls, attr, txt, label) => `<button type="button" class="ex-c ${cls}" ${attr} title="${label}" aria-label="${label}">${txt}</button>`;
  return exCur.items.map((it,i)=>`<div class="ex-ed" data-ei="${i}"><b>${it.n}</b>
    <div class="ex-edm"><textarea class="tl-ta" data-et rows="2" aria-label="โจทย์ข้อ ${it.n}">${escH(it.t)}</textarea>
    <textarea class="tl-ta" data-ea rows="2" placeholder="เฉลย / วิธีทำ (ไม่บังคับ — ไม่พิมพ์ลงใบงาน)" aria-label="เฉลยข้อ ${it.n}">${escH(it.a || "")}</textarea></div>
    <div class="ex-side">${c("add", `data-eins="${i}"`, "＋", "แทรกข้อก่อนข้อ " + it.n)}${c("del", `data-edel="${i}"`, "✕", "ลบข้อ " + it.n)}${c("add", `data-eins="${i+1}"`, "＋", "แทรกข้อหลังข้อ " + it.n)}</div></div>`).join("");
}
function exKeyText(){}
function exPreview(){
  const act = document.activeElement;
  const keep = act && act.closest && act.closest("#exEd") ? { el:act, a:act.selectionStart, b:act.selectionEnd } : null;
  const back = () => { if(keep && keep.el.isConnected && document.activeElement !== keep.el){
    try{ keep.el.focus({ preventScroll:true }); if(keep.a != null) keep.el.setSelectionRange(keep.a, keep.b); }catch(e){} } };
  ex.h = 1123;
  ex.pv.style.display = ""; ex.printBtn.style.display = "";
  const arow = $("#exAnsRow", ex.view); if(arow) arow.style.display = "";
  const em = $("#exEmpty", ex.view); if(em) em.style.display = "none";
  ex.stat.textContent = `โจทย์ ${plNum(exCur.items.length)} ข้อ — กำลังจัดหน้า…`;
  /* สร้าง iframe ใหม่ทุกครั้ง (ชัวร์กว่าสั่ง srcdoc ซ้ำ) แล้วค่อยสลับเมื่อโหลดเสร็จ */
  const old = ex.frame, nf = document.createElement("iframe");
  nf.id = "exFrame"; nf.title = "ตัวอย่างใบงาน"; nf.tabIndex = -1; nf.setAttribute("sandbox", "allow-scripts");
  nf.style.height = ex.h + "px"; nf.style.visibility = "hidden";
  nf.onload = () => { [...ex.pv.querySelectorAll("iframe")].forEach(f => { if(f !== nf) f.remove(); }); nf.style.visibility = ""; back(); };
  if(old) old.id = "";
  ex.pv.appendChild(nf); ex.frame = nf;
  nf.srcdoc = exDoc("preview");
  exScale(); setTimeout(back, 0); exStepUi(); exAnsUi();
}
/* =====================================================================
   ขั้นที่ ๔ — รวมแบบฝึก: รวมไฟล์ PDF หลายไฟล์เป็นเล่มเดียว + รันเลขหน้ามุมขวาบน (ใช้ pdf-lib โหลดจาก CDN ครั้งแรก)
   เลขหน้าวาดเป็นภาพจาก canvas เพื่อให้ภาษาไทยแสดงได้โดยไม่ต้องฝังฟอนต์
   ===================================================================== */
const MG = { files:[], seq:0, out:null, busy:false };
const MG_DEF = { on:true, tpl:"วิชาคณิตศาสตร์ หน้าที่ {n}", start:1, skip:0, num:"ar", mode:"all", size:16, top:9, right:11, name:"รวมแบบฝึกหัด" };
const MG_FAM = '"TH Sarabun New","TH SarabunPSK","Sarabun",Tahoma,sans-serif';
const mgCfg = () => { const m = EX.v.mg || (EX.v.mg = {}); Object.keys(MG_DEF).forEach(k => { if(m[k] === undefined) m[k] = MG_DEF[k]; }); return m; };
const mgN = (x, d) => { const n = parseFloat(x); return Number.isFinite(n) ? n : d; };
const mgThai = n => String(n).replace(/\d/g, d => "๐๑๒๓๔๕๖๗๘๙"[d]);
const mgTick = () => new Promise(r => setTimeout(r, 0));
const mgKb = b => b >= 1048576 ? (b/1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b/1024)) + " KB";
function mgText(c, n, total){
  const num = c.num === "th" ? mgThai(n) : String(n), tot = c.num === "th" ? mgThai(total) : String(total);
  let t = String(c.tpl ?? "").trim(); if(!t) return num;
  if(!/\{n\}/.test(t)) t += " {n}";
  return t.replace(/\{n\}/g, num).replace(/\{total\}/g, tot);
}
function mgLib(){
  if(window.PDFLib) return Promise.resolve(window.PDFLib);
  if(mgLib.p) return mgLib.p;
  const urls = ["https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js", "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"];
  mgLib.p = (async () => {
    for(const u of urls){
      try{ await new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = u; sc.onload = ok; sc.onerror = () => no(new Error("x")); document.head.appendChild(sc); }); }catch(e){}
      if(window.PDFLib) return window.PDFLib;
    }
    mgLib.p = null; throw new Error("โหลดตัวรวม PDF ไม่สำเร็จ — ต้องต่ออินเทอร์เน็ตในครั้งแรก");
  })();
  return mgLib.p;
}
async function mgFont(){
  if(!document.getElementById("mgFontLink")){
    const l = document.createElement("link"); l.id = "mgFontLink"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600&display=swap"; document.head.appendChild(l);
  }
  try{ await Promise.race([document.fonts.load('32px Sarabun', "หน้าที่ 0123456789"), new Promise(r => setTimeout(r, 2500))]); }catch(e){}
}
function mgField(k, label, attrs, hint){
  const c = mgCfg();
  return `<div class="field"><label>${label}${hint ? ` <span class="pf-hint">${hint}</span>` : ""}</label><input data-mg="${k}" ${attrs || ""} value="${escH(c[k])}" autocomplete="off"></div>`;
}
function mgSel(k, label, opts){
  const c = mgCfg();
  return `<div class="field"><label>${label}</label><select data-mg="${k}">${opts.map(o => `<option value="${o[0]}"${String(c[k]) === String(o[0]) ? " selected" : ""}>${o[1]}</option>`).join("")}</select></div>`;
}
function exMgHtml(){
  const c = mgCfg();
  return `<div class="tl-sub">ขั้นที่ ๔ · รวมไฟล์ PDF หลายไฟล์เป็นเล่มเดียว พร้อมรันเลขหน้ามุมขวาบน</div>
    <div class="mg-drop" id="mgDrop">
      <input type="file" id="mgFile" accept="application/pdf,.pdf" multiple hidden>
      <button type="button" class="btn btn-outline" id="mgPick">＋ เลือกไฟล์ PDF</button>
      <div class="tl-sub" style="margin-top:6px;">เลือกได้หลายไฟล์พร้อมกัน หรือลากไฟล์มาวางตรงนี้ (ไฟล์อยู่ในเครื่องคุณ ไม่ถูกอัปโหลดไปที่ไหน)</div>
    </div>
    <div id="mgList"></div>
    <div class="mg-tools" id="mgTools" style="display:none;"><span id="mgSum" class="tl-sub"></span><span style="flex:1"></span><button type="button" class="btn btn-outline btn-sm" id="mgSort">เรียงตามชื่อไฟล์</button><button type="button" class="btn btn-outline btn-sm" id="mgClear">ล้างทั้งหมด</button></div>
    <div class="tl-h" style="margin-top:14px;">รันเลขหน้า <span class="pf-hint">(มุมขวาบน — ตั้งค่าแล้วจำไว้ให้)</span></div>
    <label class="mg-sw"><input type="checkbox" data-mg="on"${c.on ? " checked" : ""}> ใส่เลขหน้าให้ทุกหน้าในไฟล์ที่รวม</label>
    <div class="mg-set">
      ${mgField("tpl", "ข้อความ", 'placeholder="วิชาคณิตศาสตร์ หน้าที่ {n}"', "ใช้ {n} = เลขหน้า, {total} = จำนวนหน้าทั้งหมด")}
      <div class="pf-2">
        ${mgField("start", "เริ่มนับที่เลข", 'type="number" inputmode="numeric" step="1"')}
        ${mgField("skip", "ข้ามหน้าแรก (ไม่ใส่เลข)", 'type="number" inputmode="numeric" min="0" step="1"', "หน้า เช่น ปก")}
        ${mgSel("num", "ชนิดตัวเลข", [["ar", "อารบิก 1 2 3"], ["th", "ไทย ๑ ๒ ๓"]])}
        ${mgSel("mode", "การนับ", [["all", "ต่อเนื่องทั้งเล่ม"], ["file", "เริ่มนับใหม่ทุกไฟล์"]])}
        ${mgField("size", "ขนาดตัวอักษร (pt)", 'type="number" inputmode="decimal" min="6" max="48" step="1"')}
        ${mgField("top", "ห่างจากขอบบน (มม.)", 'type="number" inputmode="decimal" min="0" step="0.5"')}
        ${mgField("right", "ห่างจากขอบขวา (มม.)", 'type="number" inputmode="decimal" min="0" step="0.5"')}
        ${mgField("name", "ชื่อไฟล์ที่ได้", 'placeholder="รวมแบบฝึกหัด"')}
      </div>
      <div class="mg-pvw"><div class="mg-pv" id="mgPv"><span id="mgPvT"></span></div><div class="tl-sub">ตัวอย่างตำแหน่งเลขหน้า (หน้า A4)<br>ค่าเริ่มต้นตรงกับตำแหน่งมุมขวาบนของใบงานที่ขั้นที่ ๓</div></div>
    </div>
    <button type="button" class="ex-pdf" id="mgGo" disabled><i class="sp s1">✦</i><i class="sp s2">✦</i><i class="sp s3">✧</i><i class="sp s4">✦</i><span class="ex-pdf-ic"><svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg></span><span class="ex-pdf-tx">รวมเป็น PDF เล่มเดียว<small>รวมไฟล์ + รันเลขหน้าให้อัตโนมัติ</small></span></button>
    <div class="tl-sub" id="mgStat" style="margin-top:10px;"></div>
    <div id="mgRes"></div>`;
}
function mgRanges(c){
  const skip = Math.max(0, Math.round(mgN(c.skip, 0))), start = mgN(c.start, 1), per = c.mode === "file";
  let g = 0;
  return MG.files.map(f => {
    const base = per ? 0 : g; g += f.pages;
    const from = Math.max(0, skip - base);
    if(!c.on || from >= f.pages) return null;
    const a = start + base + from - skip; return [a, a + (f.pages - from - 1)];
  });
}
function mgRefresh(){
  const v = ex.view; if(!v || !$("#mgList", v)) return;
  const c = mgCfg(), rg = mgRanges(c), fmt = n => c.num === "th" ? mgThai(n) : n;
  $("#mgList", v).innerHTML = MG.files.map((f, i) => `<div class="mg-it" data-mi="${i}"><b>${plNum(i+1)}</b>
    <div class="mg-nm"><span>${escH(f.name)}</span><small>${plNum(f.pages)} หน้า · ${mgKb(f.size)}${rg[i] ? ` · เลขหน้า ${fmt(rg[i][0])}${rg[i][1] !== rg[i][0] ? "–" + fmt(rg[i][1]) : ""}` : (c.on ? " · ไม่ใส่เลข" : "")}</small></div>
    <div class="mg-bt"><button type="button" data-mup="${i}" aria-label="เลื่อนขึ้น"${i === 0 ? " disabled" : ""}>▲</button><button type="button" data-mdn="${i}" aria-label="เลื่อนลง"${i === MG.files.length - 1 ? " disabled" : ""}>▼</button><button type="button" data-mdel="${i}" aria-label="เอาออก" class="x">✕</button></div></div>`).join("");
  const tot = MG.files.reduce((a, f) => a + f.pages, 0);
  $("#mgTools", v).style.display = MG.files.length ? "" : "none";
  $("#mgSum", v).textContent = `${plNum(MG.files.length)} ไฟล์ · ${plNum(tot)} หน้า`;
  $("#mgGo", v).disabled = !MG.files.length || MG.busy;
  [...v.querySelectorAll("[data-mg]")].forEach(el => { if(el.dataset.mg !== "on" && el.dataset.mg !== "name" && el.dataset.mg !== "mode"){ el.disabled = !c.on; } });
  /* ตัวอย่างตำแหน่ง */
  const pv = $("#mgPv", v), sp = $("#mgPvT", v), size = Math.min(48, Math.max(6, mgN(c.size, 16)));
  sp.style.display = c.on ? "" : "none";
  sp.textContent = mgText(c, mgN(c.start, 1), Math.max(tot, 1));
  sp.style.fontSize = (size * (pv.clientWidth || 150) / 595.28) + "px";
  sp.style.top = (Math.max(0, mgN(c.top, 9)) / 297 * 100) + "%";
  sp.style.right = (Math.max(0, mgN(c.right, 11)) / 210 * 100) + "%";
  exStepUi();
}
function mgInput(e){
  const f = e.target.closest && e.target.closest("[data-mg]"); if(!f) return false;
  const c = mgCfg(); c[f.dataset.mg] = f.type === "checkbox" ? f.checked : f.value;
  exSave(); MG.out = null; const rs = $("#mgRes", ex.view); if(rs) rs.innerHTML = "";
  mgRefresh(); return true;
}
async function mgAdd(list){
  const arr = list.filter(f => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
  if(!arr.length){ say("เลือกได้เฉพาะไฟล์ PDF นะครับ"); return; }
  const st = $("#mgStat", ex.view); st.textContent = "กำลังอ่านไฟล์…";
  let lib; try{ lib = await mgLib(); }catch(err){ st.textContent = "⚠️ " + err.message; return; }
  let bad = 0;
  for(const f of arr){
    try{
      const bytes = new Uint8Array(await f.arrayBuffer());
      const d = await lib.PDFDocument.load(bytes, { ignoreEncryption:true, updateMetadata:false });
      MG.files.push({ id:++MG.seq, name:f.name, size:f.size, bytes, pages:d.getPageCount() });
    }catch(err){ bad++; }
  }
  st.textContent = bad ? `⚠️ อ่านไม่ได้ ${plNum(bad)} ไฟล์ (อาจมีรหัสผ่านหรือไฟล์เสีย)` : "";
  MG.out = null; $("#mgRes", ex.view).innerHTML = ""; mgRefresh();
}
function mgClick(e){
  const v = ex.view;
  if(e.target.closest("#mgPick")){ $("#mgFile", v).click(); return true; }
  if(e.target.closest("#mgSort")){ MG.files.sort((a, b) => a.name.localeCompare(b.name, "th", { numeric:true })); MG.out = null; mgRefresh(); return true; }
  if(e.target.closest("#mgClear")){ MG.files = []; MG.out = null; $("#mgRes", v).innerHTML = ""; $("#mgStat", v).textContent = ""; mgRefresh(); return true; }
  const up = e.target.closest("[data-mup]"), dn = e.target.closest("[data-mdn]"), dl = e.target.closest("[data-mdel]");
  if(up || dn){
    const i = +(up || dn).dataset[up ? "mup" : "mdn"], j = up ? i - 1 : i + 1;
    if(MG.files[i] && MG.files[j]){ [MG.files[i], MG.files[j]] = [MG.files[j], MG.files[i]]; MG.out = null; mgRefresh(); }
    return true;
  }
  if(dl){ MG.files.splice(+dl.dataset.mdel, 1); MG.out = null; mgRefresh(); return true; }
  if(e.target.closest("#mgGo")){ mgRun(); return true; }
  return false;
}
function mgStamp(text, sizePt){
  const S = 5, px = sizePt * S, c = document.createElement("canvas"), x = c.getContext("2d");
  x.font = `${px}px ${MG_FAM}`;
  const w = Math.ceil(x.measureText(text).width) + 4, h = Math.ceil(px * 1.6);
  c.width = w; c.height = h;
  x.font = `${px}px ${MG_FAM}`; x.fillStyle = "#111"; x.textBaseline = "alphabetic"; x.textAlign = "left";
  x.fillText(text, 2, px * 1.15);
  return { url:c.toDataURL("image/png"), w:w / S, h:h / S };
}
async function mgRun(){
  if(MG.busy || !MG.files.length) return;
  MG.busy = true; mgRefresh();
  const v = ex.view, st = $("#mgStat", v), rs = $("#mgRes", v); rs.innerHTML = "";
  try{
    st.textContent = "กำลังเตรียมตัวรวม PDF…";
    const { PDFDocument } = await mgLib(), c = mgCfg(), out = await PDFDocument.create(), meta = [], n = MG.files.length;
    for(let i = 0; i < n; i++){
      st.textContent = `กำลังรวมไฟล์ ${plNum(i+1)}/${plNum(n)}…`; await mgTick();
      const src = await PDFDocument.load(MG.files[i].bytes, { ignoreEncryption:true, updateMetadata:false });
      const pgs = await out.copyPages(src, src.getPageIndices());
      pgs.forEach((p, j) => { out.addPage(p); meta.push({ fi:i, j }); });
    }
    const pages = out.getPages();
    if(c.on){
      await mgFont();
      const skip = Math.max(0, Math.round(mgN(c.skip, 0))), start = mgN(c.start, 1), per = c.mode === "file";
      const size = Math.min(48, Math.max(6, mgN(c.size, 16))), top = Math.max(0, mgN(c.top, 9)) * 72 / 25.4, right = Math.max(0, mgN(c.right, 11)) * 72 / 25.4;
      const cache = new Map();
      for(let g = 0; g < pages.length; g++){
        const m = meta[g], pos = (per ? m.j : g) - skip;
        if(pos < 0) continue;
        if(g % 15 === 0){ st.textContent = `กำลังใส่เลขหน้า ${plNum(g+1)}/${plNum(pages.length)}…`; await mgTick(); }
        const total = (per ? MG.files[m.fi].pages : pages.length) - skip;
        const text = mgText(c, start + pos, total);
        let im = cache.get(text);
        if(!im){ const sp = mgStamp(text, size); im = { emb:await out.embedPng(sp.url), w:sp.w, h:sp.h }; cache.set(text, im); }
        const pg = pages[g], { width, height } = pg.getSize();
        pg.drawImage(im.emb, { x:width - right - im.w, y:height - (top - 0.2 * size) - im.h, width:im.w, height:im.h });
      }
    }
    const name = (String(c.name || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "รวมแบบฝึกหัด");
    out.setTitle(name);
    const bytes = await out.save(), blob = new Blob([bytes], { type:"application/pdf" });
    if(MG.out) try{ URL.revokeObjectURL(MG.out.url); }catch(e){}
    const url = URL.createObjectURL(blob);
    MG.out = { url, name:name + ".pdf", pages:pages.length, size:blob.size };
    const a = document.createElement("a"); a.href = url; a.download = MG.out.name; document.body.appendChild(a); a.click(); a.remove();
    st.textContent = "";
    rs.innerHTML = `<div class="mg-ok">✅ รวม ${plNum(n)} ไฟล์ · ${plNum(pages.length)} หน้า (${mgKb(blob.size)}) เรียบร้อย<br><a class="btn btn-outline btn-sm" href="${url}" download="${escH(MG.out.name)}" style="margin-top:8px;">⬇ ดาวน์โหลด ${escH(MG.out.name)} อีกครั้ง</a> <a class="btn btn-outline btn-sm" href="${url}" target="_blank" rel="noopener" style="margin-top:8px;">👁 เปิดดู</a></div>`;
  }catch(err){
    st.textContent = "⚠️ รวมไม่สำเร็จ: " + (err && err.message ? err.message : err);
  }
  MG.busy = false; mgRefresh();
}

let exStep = 0;
function exStepUi(){
  if(!ex.steps) return;
  const pr = $("#exPrompt", ex.view);
  const done = [!!(pr && pr.value) || !!exCur, !!exCur, false, !!MG.out];
  [...ex.steps.children].forEach((b,i)=>{
    b.classList.toggle("cur", i === exStep);
    b.classList.toggle("done", !!done[i]);
    b.classList.toggle("line", i > 0 && (!!done[i-1] || i <= exStep));
  });
}
function exFit(){
  if(!ex.vp || !ex.sls) return;
  const sl = ex.sls[exStep]; if(sl) ex.vp.style.height = (sl.offsetHeight + 14) + "px";
}
function exGo(i, scroll){
  if(!ex.tr) return;
  exStep = Math.max(0, Math.min(3, i));
  ex.tr.style.transform = `translateX(-${exStep * 100}%)`;
  ex.sls.forEach((sl,k)=>{ if(k === exStep){ sl.removeAttribute("inert"); sl.setAttribute("aria-hidden","false"); } else { sl.setAttribute("inert",""); sl.setAttribute("aria-hidden","true"); } });
  $("#exBack", ex.view).style.visibility = exStep === 0 ? "hidden" : "";
  $("#exNext", ex.view).style.visibility = exStep === 3 ? "hidden" : "";
  if(exStep === 3){ mgFont(); mgRefresh(); }
  exStepUi(); exFit();
  if(scroll !== false && ex.steps) ex.steps.scrollIntoView({ behavior:"smooth", block:"start" });
  setTimeout(()=>{ exFit(); exScale(); }, 380);
}
function exAnsUi(){
  if(!ex.view) return;
  const on = !!EX.v.showAns, t = $("#exPdfT", ex.view), sb = $("#exPdfS", ex.view), h = $("#exAnsHint", ex.view), cb = $("#exAns", ex.view);
  if(t) t.textContent = on ? "ทำ PDF แบบเฉลย" : "ทำเป็น PDF";
  if(sb) sb.textContent = on ? "ใบงานที่มีวิธีทำในทุกข้อ" : "พิมพ์ / บันทึกเป็นไฟล์ PDF";
  if(cb) cb.checked = on;
  if(h){
    const tot = exCur ? exCur.items.length : 0, n = exCur ? exCur.items.filter(it => (it.a || "").trim()).length : 0;
    h.textContent = exCur ? `(มีเฉลย ${plNum(n)}/${plNum(tot)} ข้อ)` + (on && n < tot ? " — ข้อที่ยังไม่มีจะขึ้นว่า “ยังไม่ได้ใส่เฉลย”" : "") : "";
  }
}
function exRenumber(){ exCur.items.forEach((it,i)=>{ it.n = i + 1; }); }
/* keep=true: ใช้ข้อที่แก้ไว้เดิม ไม่อ่านจากคำตอบ AI ใหม่ (ใช้ตอนเปลี่ยนการตั้งค่าหน้ากระดาษ) */
function exBuild(silent, keep){
  if(keep && exCur){ exPreview(); return true; }
  const raw = $("#exRaw", ex.view).value; EX.raw = raw; exSave();
  const r = exParse(raw);
  if(!r.items.length){ if(silent) return false; say("ไม่พบโจทย์ในรูปแบบ “เลขข้อ | โจทย์” ตรวจคำตอบที่วางอีกครั้งนะครับ"); return false; }
  r.items.sort((x,y)=>x.n-y.n);
  r.items.forEach(it=>{ const a = r.ans.find(x=>x.n === it.n); it.a = a ? a.t : ""; });
  exCur = r;
  $("#exEdBox", ex.view).style.display = ""; $("#exEd", ex.view).innerHTML = exEdHtml();
  exPreview();
  return true;
}
function exPrint(){
  if(!exCur){ say("กดสร้างแบบฝึกหัดก่อนนะครับ"); return; }
  const w = window.open("", "_blank");
  if(!w){ say("เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาตป๊อปอัปแล้วลองอีกครั้ง"); return; }
  w.document.open(); w.document.write(exDoc("print")); w.document.close();
}
async function exCopy(){
  const t = $("#exPrompt", ex.view).value;
  try{ await navigator.clipboard.writeText(t); say("คัดลอก Prompt แล้ว นำไปวางใน AI ได้เลย"); return; }catch(e){}
  const ta = document.createElement("textarea");
  ta.value = t; ta.style.cssText = "position:fixed; opacity:0; top:0; left:0;";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); say("คัดลอก Prompt แล้ว นำไปวางใน AI ได้เลย"); }catch(e){ say("คัดลอกไม่สำเร็จ ลองกดค้างที่ข้อความแทนนะครับ"); }
  ta.remove();
}

registerTool({
  id:"ex", icon:"✏️", color:"c-green", title:"แบบฝึกหัด", desc:"เลือกชั้น/เรื่อง · Prompt ให้ AI ออกโจทย์ง่าย→ยาก · สร้างใบงานพร้อมที่เขียนวิธีทำ · รวม PDF พร้อมรันเลขหน้า",
  html:`<div id="exWrap"></div>`,
  init(v){
    ex.view = v;
    $("#exWrap", v).innerHTML = exFormHtml();
    ex.sum = $("#exSum", v); ex.pv = $("#exPv", v); ex.frame = $("#exFrame", v);
    ex.stat = $("#exStat", v); ex.printBtn = $("#exPrint", v); ex.h = 1123;
    exAnsUi(); ex.steps = $("#exSteps", v); ex.vp = $("#exVp", v); ex.tr = $("#exTr", v); ex.sls = [...v.querySelectorAll(".ex-sl")];
    ex.vp.addEventListener("scroll", () => { ex.vp.scrollLeft = 0; });
    const dz = $("#mgDrop", v);
    ["dragenter","dragover"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add("on"); }));
    ["dragleave","drop"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove("on"); }));
    dz.addEventListener("drop", e => { if(e.dataTransfer && e.dataTransfer.files) mgAdd([...e.dataTransfer.files]); });
    if(window.ResizeObserver){ const ro = new ResizeObserver(() => exFit()); ex.sls.forEach(x => ro.observe(x)); }
    exmEnsure();
    let layT = 0;
    const layRefresh = k => { if(EX_LAY.includes(k) && exCur){ clearTimeout(layT); layT = setTimeout(()=>exBuild(true,true), 350); } };
    let edT = 0;
    const edRefresh = () => { clearTimeout(edT); edT = setTimeout(()=>exPreview(), 700); };
    const edInput = e => {
      const row = e.target.closest("[data-ei]"); if(!row || !exCur) return false;
      const it = exCur.items[+row.dataset.ei]; if(!it) return true;
      if(e.target.matches("[data-et]")) it.t = e.target.value; else if(e.target.matches("[data-ea]")) it.a = e.target.value; else return false;
      edRefresh(); return true;
    };
    const grpEdit = e => {
      const f = e.target.closest("[data-gf]"); if(!f) return false;
      const row = f.closest("[data-gi]"), x = exGroups()[+row.dataset.gi]; if(!x) return true;
      x[f.dataset.gf] = f.value; exSave(); clearTimeout(layT); layT = setTimeout(()=>exBuild(true,true), 350); return true;
    };
    v.addEventListener("input", e=>{
      if(edInput(e) || grpEdit(e) || mgInput(e)) return;
      const f = e.target.closest("[data-ef]"); if(f){ EX.v[f.dataset.ef] = f.value; exSave(); layRefresh(f.dataset.ef); }
      if(e.target.id === "exRaw"){ EX.raw = e.target.value; exSave(); }
    });
    v.addEventListener("change", e=>{
      if(e.target.id === "exAns"){ EX.v.showAns = e.target.checked; exSave(); exAnsUi(); if(exCur) exPreview(); return; }
      if(e.target.id === "mgFile"){ const fl = [...e.target.files]; e.target.value = ""; mgAdd(fl); return; }
      if(mgInput(e) || grpEdit(e)) return;
      const f = e.target.closest("select[data-ef]"); if(f){ EX.v[f.dataset.ef] = f.value; exSave(); layRefresh(f.dataset.ef);
        if(f.dataset.ef === "gmode"){ const on = f.value !== "none", w = $("#exGaWrap", v), h = $("#exGHint", v); if(w) w.style.display = on ? "" : "none"; if(h) h.style.display = on ? "" : "none"; } }
    });
    v.addEventListener("click", e=>{
      if(mgClick(e)) return;
      const st = e.target.closest("[data-exs]"); if(st){ exGo(+st.dataset.exs); return; }
      if(e.target.closest("#exBack")){ exGo(exStep - 1); return; }
      if(e.target.closest("#exNext")){ exGo(exStep + 1); return; }
      if(e.target.closest("#exPickGrade")){ exOpenGrade(); return; }
      if(e.target.closest("#exPickInd")){ exOpenInd(); return; }
      const rm = e.target.closest("[data-erm]");
      if(rm){ exSetKey(rm.dataset.erm, false); exUpdate(); exSave(); return; }
      if(e.target.closest("#exMake")){
        if(!EX.grade){ say("เลือกระดับชั้นก่อนนะครับ"); return; }
        if(!(EX.v.topic || "").trim()){ say("ใส่เรื่องที่จะสร้างโจทย์ก่อนนะครับ"); return; }
        const t = exPromptText();
        $("#exPrompt", v).value = t; $("#exPromptBox", v).style.display = "";
        $("#exLen", v).textContent = `${plNum(t.length.toLocaleString("en-US"))} ตัวอักษร`;
        $("#exPromptBox", v).scrollIntoView({ behavior:"smooth", block:"nearest" });
        exStepUi();
        return;
      }
      const ed = e.target.closest("[data-edel]");
      if(ed && exCur){
        if(exCur.items.length <= 1){ say("ต้องเหลืออย่างน้อย ๑ ข้อ"); return; }
        exCur.items.splice(+ed.dataset.edel, 1); exRenumber();
        $("#exEd", v).innerHTML = exEdHtml(); exPreview(); return;
      }
      const ni = e.target.closest("[data-eins]");
      if(ni && exCur){
        const at = +ni.dataset.eins;
        exCur.items.splice(at, 0, { n:at + 1, t:"", a:"" }); exRenumber();
        $("#exEd", v).innerHTML = exEdHtml(); exPreview();
        const focusNew = () => { const t = $("#exEd", v).querySelectorAll("[data-et]")[at]; if(t){ t.focus(); try{ t.setSelectionRange(0,0); }catch(e){} } };
        focusNew(); setTimeout(focusNew, 150);
        return;
      }
      if(e.target.closest("#exEdAdd") && exCur){
        exCur.items.push({ n:exCur.items.length + 1, t:"", a:"" }); exRenumber();
        $("#exEd", v).innerHTML = exEdHtml(); exPreview();
        const focusNew = () => { const t = [...$("#exEd", v).querySelectorAll("[data-et]")].pop(); if(t){ t.focus(); try{ t.setSelectionRange(0,0); }catch(e){} } };
        focusNew(); setTimeout(focusNew, 150);
        return;
      }
      if(e.target.closest("#exGrpAdd")){
        const g = exGroups(), last = g[g.length - 1], mx = exCur ? exCur.items.length : 0;
        const from = last && +last.to ? +last.to + 1 : 1;
        g.push({ from, to:Math.max(from, mx || from), perPage:EX.v.perPage || 6, cols:EX.v.cols || 2, lines:EX.v.lines || "auto", lh:EX.v.lh || "7.2", lstyle:"main", theme:"main" });
        exSave(); $("#exGrp", v).innerHTML = exGrpHtml(); if(exCur) exBuild(true,true); return;
      }
      const gd = e.target.closest("[data-gdel]");
      if(gd){ exGroups().splice(+gd.dataset.gdel, 1); exSave(); $("#exGrp", v).innerHTML = exGrpHtml(); if(exCur) exBuild(true,true); return; }
      if(e.target.closest("#exCopy")){ exCopy(); return; }
      if(e.target.closest("#exBuild")){ if(exBuild()) exGo(2); return; }
      if(e.target.closest("#exPrint")){ exPrint(); return; }
    });
    window.addEventListener("message", e=>{
      if(!e.data || !e.data.kcEx || e.source !== ex.frame.contentWindow) return;
      ex.h = e.data.h || 1123; ex.frame.style.height = ex.h + "px"; exScale();
      const pc = Math.round(e.data.s * 100), n = exCur ? exCur.items.length : 0, pg = e.data.pages || 1;
      ex.stat.textContent = e.data.over
        ? `⚠️ หน้าที่ ${plNum(e.data.over)} ล้นเกิน ๑ หน้าแม้ย่อสุดแล้ว (${plNum(pc)}%) — ลดจำนวนบรรทัดเขียนวิธีทำต่อข้อ หรือลดจำนวนข้อต่อหน้า (ตั้งค่าด้านบนแล้วตัวอย่างอัปเดตให้เอง)`
        : `✅ ${plNum(n)} ข้อ · ${plNum(pg)} หน้า พอดีทุกหน้า` + (pc < 100 ? ` (ย่อเล็กน้อยเหลือ ${plNum(pc)}%)` : "");
    });
    window.addEventListener("resize", exScale);
    exRender(); exGo(exStep, false);
  },
  onOpen(){ exRender(); exGo(exStep, false); setTimeout(exScale, 60); }
});

const exStyle = document.createElement("style");
exStyle.id = "exCss";
exStyle.textContent = `
#view-tool-ex .ex-side{flex:0 0 28px; align-self:stretch; display:flex; flex-direction:column; justify-content:space-between; align-items:center; gap:4px;}
#view-tool-ex .ex-c{width:26px; height:26px; padding:0; border-radius:50%; border:1.5px solid #CBD5E1; background:#fff; color:var(--ink-soft); font:inherit; font-size:13px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s,color .15s,border-color .15s,transform .1s;}
#view-tool-ex .ex-c:active{transform:scale(.9);}
#view-tool-ex .ex-c.add:hover,#view-tool-ex .ex-c.add:focus-visible{background:var(--c-main); border-color:var(--c-main); color:var(--c-on);}
#view-tool-ex .ex-c.del:hover,#view-tool-ex .ex-c.del:focus-visible{background:#EA4335; border-color:#EA4335; color:#fff;}
html[data-theme="dark"] #view-tool-ex .ex-c,html[data-theme="black"] #view-tool-ex .ex-c{background:#1d2233; border-color:#2c3450;}
#view-tool-ex .ex-ed{display:flex; align-items:flex-start; gap:8px; margin-top:8px; padding:8px 10px; border:1.5px solid #E1E7F3; border-radius:14px; background:#fff;}
#view-tool-ex .ex-ed > b{flex:0 0 28px; height:28px; margin-top:4px; border-radius:50%; border:1.5px solid var(--ink); display:flex; align-items:center; justify-content:center; font-size:13px; color:var(--ink);}
#view-tool-ex .ex-edm{flex:1; min-width:0; display:grid; gap:6px;}
#view-tool-ex .ex-edm textarea{min-height:48px;}
#view-tool-ex .ex-edm textarea[data-ea]{background:#FFFBEA; border-color:#F2D675; font-size:13.5px;}
#view-tool-ex .ex-edm input{padding:7px 10px; border:1.5px solid #E1E7F3; border-radius:10px; font:inherit; font-size:13.5px; background:#fff; color:var(--ink); min-width:0;}
html[data-theme="dark"] #view-tool-ex .ex-ed,html[data-theme="black"] #view-tool-ex .ex-ed,html[data-theme="dark"] #view-tool-ex .ex-edm input,html[data-theme="black"] #view-tool-ex .ex-edm input{background:#1d2233; border-color:#2c3450;}
#view-tool-ex .ex-g{margin-top:8px; padding:10px 12px; border:1.5px solid #E1E7F3; border-radius:14px; background:#fff;}
#view-tool-ex .ex-gh{display:flex; align-items:center; flex-wrap:wrap; gap:6px; font-size:14px; color:var(--ink);}
#view-tool-ex .ex-gh input{width:64px; padding:7px 8px; border:1.5px solid #E1E7F3; border-radius:10px; font:inherit; font-size:14px; text-align:center; background:#fff; color:var(--ink);}
#view-tool-ex .ex-gx{margin-left:auto; width:30px; height:30px; border-radius:50%; border:0; background:#F1F3F9; color:var(--ink-soft); cursor:pointer;}
#view-tool-ex .ex-gs{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;}
#view-tool-ex .ex-gs select{padding:8px 10px; border:1.5px solid #E1E7F3; border-radius:10px; font:inherit; font-size:13.5px; background:#fff; color:var(--ink); min-width:0;}
html[data-theme="dark"] #view-tool-ex .ex-g,html[data-theme="black"] #view-tool-ex .ex-g,html[data-theme="dark"] #view-tool-ex .ex-gh input,html[data-theme="black"] #view-tool-ex .ex-gh input,html[data-theme="dark"] #view-tool-ex .ex-gs select,html[data-theme="black"] #view-tool-ex .ex-gs select{background:#1d2233; border-color:#2c3450;}
#view-tool-ex{--c-main:#34A853; --c-bg:#E3F5E8; --c-ink:#17692F; --c-sh:rgba(52,168,83,.6); --c-on:#fff;}
#view-tool-ex .ex-pdf{position:relative; overflow:hidden; isolation:isolate; display:flex; align-items:center; justify-content:center; width:100%; margin-top:18px; padding:18px 16px; border:0; border-radius:20px; cursor:pointer; font:inherit; color:#4a2e00; text-shadow:0 1px 0 rgba(255,255,255,.55);
  background:linear-gradient(135deg,#a86d00 0%,#f7c23a 22%,#fff1a8 45%,#f2b01e 62%,#d98f00 82%,#ffd75e 100%); background-size:220% 220%;
  box-shadow:0 0 0 2px #fff3b8 inset, 0 0 0 4px rgba(168,109,0,.55) inset, 0 16px 30px -12px rgba(217,143,0,.95), 0 0 26px rgba(255,200,40,.55);
  animation:exGoldFlow 5s ease-in-out infinite, exGoldGlow 2.4s ease-in-out infinite; transition:transform .12s;}
#view-tool-ex .ex-pdf:hover{transform:translateY(-2px) scale(1.01);}
#view-tool-ex .ex-pdf:active{transform:scale(.97);}
#view-tool-ex .ex-pdf::before{content:""; position:absolute; top:-30%; bottom:-30%; left:-40%; width:30%; z-index:1; pointer-events:none;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.85),transparent); transform:skewX(-20deg); animation:exShine 2.8s ease-in-out infinite;}
#view-tool-ex .ex-pdf-tx{position:relative; z-index:2; display:flex; flex-direction:column; align-items:flex-start; font-size:22px; font-weight:800; line-height:1.15; letter-spacing:.3px;}
#view-tool-ex .ex-pdf-tx small{font-size:13px; font-weight:600; opacity:.8; margin-top:2px; letter-spacing:0;}
#view-tool-ex .ex-pdf-ic{position:relative; z-index:2; display:inline-flex; margin-right:12px; color:#4a2e00; filter:drop-shadow(0 1px 0 rgba(255,255,255,.6)) drop-shadow(0 2px 3px rgba(120,70,0,.35));}
#view-tool-ex .ex-pdf .sp{position:absolute; z-index:3; pointer-events:none; font-style:normal; color:#fff; text-shadow:0 0 6px #fff,0 0 12px #ffd54a; animation:exTwinkle 1.9s ease-in-out infinite; opacity:0;}
#view-tool-ex .ex-pdf .s1{left:9%; top:16%; font-size:16px;}
#view-tool-ex .ex-pdf .s2{right:10%; top:20%; font-size:20px; animation-delay:.6s;}
#view-tool-ex .ex-pdf .s3{left:22%; bottom:12%; font-size:14px; animation-delay:1.1s;}
#view-tool-ex .ex-pdf .s4{right:24%; bottom:14%; font-size:13px; animation-delay:1.5s;}
@keyframes exShine{0%{left:-40%;} 55%,100%{left:130%;}}
@keyframes exGoldFlow{0%,100%{background-position:0% 50%;} 50%{background-position:100% 50%;}}
@keyframes exGoldGlow{0%,100%{box-shadow:0 0 0 2px #fff3b8 inset, 0 0 0 4px rgba(168,109,0,.55) inset, 0 16px 30px -12px rgba(217,143,0,.95), 0 0 18px rgba(255,200,40,.4);} 50%{box-shadow:0 0 0 2px #fff3b8 inset, 0 0 0 4px rgba(168,109,0,.55) inset, 0 16px 30px -12px rgba(217,143,0,.95), 0 0 36px rgba(255,214,70,.9);}}
@keyframes exTwinkle{0%,100%{opacity:0; transform:scale(.3) rotate(0);} 45%{opacity:1; transform:scale(1.15) rotate(40deg);} 70%{opacity:0; transform:scale(.5) rotate(90deg);}}
@media (prefers-reduced-motion:reduce){#view-tool-ex .ex-pdf,#view-tool-ex .ex-pdf::before,#view-tool-ex .ex-pdf .sp{animation:none;} #view-tool-ex .ex-pdf .sp{opacity:.9;}}
#view-tool-ex .exs{display:flex; margin:6px 0 18px;}
#view-tool-ex .exs-i{flex:1; position:relative; display:flex; flex-direction:column; align-items:center; gap:2px; padding:0 2px; border:0; background:none; font:inherit; cursor:pointer; color:var(--ink); -webkit-tap-highlight-color:transparent;}
#view-tool-ex .exs-i + .exs-i::before{content:""; position:absolute; top:31px; left:-50%; width:100%; height:3px; border-radius:3px; background:#CBD5E1; z-index:0; transition:background .4s;}
#view-tool-ex .exs-i.line::before{background:linear-gradient(90deg,#34A853,#4A90E2);}
#view-tool-ex .exs-b{position:relative; z-index:1; width:62px; height:62px; border-radius:20px; background:#EEF1FD; display:grid; place-items:center; margin-bottom:6px; transition:transform .25s, box-shadow .25s, background .25s;}
#view-tool-ex .exs-c{width:34px; height:34px; border-radius:50%; display:grid; place-items:center; background:#CBD5E1; color:#fff; font-size:16px; font-weight:800; transition:background .3s;}
#view-tool-ex .exs-c svg{display:none;}
#view-tool-ex .exs-i.done .exs-c,#view-tool-ex .exs-i.cur .exs-c{background:linear-gradient(135deg,#5BE08A 0%,#34A853 45%,#4A90E2 100%); box-shadow:0 4px 10px -3px rgba(52,168,83,.7);}
#view-tool-ex .exs-i.done:not(.cur) .exs-c b{display:none;}
#view-tool-ex .exs-i.done:not(.cur) .exs-c svg{display:block;}
#view-tool-ex .exs-i.cur .exs-b{background:#fff; transform:translateY(-3px) scale(1.06); box-shadow:0 0 0 3px #34A853, 0 14px 24px -12px rgba(52,168,83,.85);}
#view-tool-ex .exs-i.cur .exs-c{animation:exsPulse 2s ease-in-out infinite;}
#view-tool-ex .exs-l{font-size:15px; font-weight:700; line-height:1.2; text-align:center;}
#view-tool-ex .exs-i.cur .exs-l{color:var(--c-ink);}
#view-tool-ex .exs-d{font-size:12.5px; color:#A0AEC0; font-weight:600;}
@keyframes exsPulse{0%,100%{transform:scale(1);} 50%{transform:scale(1.1);}}
html[data-theme="dark"] #view-tool-ex .exs-b,html[data-theme="black"] #view-tool-ex .exs-b{background:#1d2233;}
html[data-theme="dark"] #view-tool-ex .exs-i.cur .exs-b,html[data-theme="black"] #view-tool-ex .exs-i.cur .exs-b{background:#232a40;}
#view-tool-ex .ex-vp{overflow:hidden; padding:2px 2px 12px; box-sizing:border-box; transition:height .3s ease;}
#view-tool-ex .ex-tr{display:flex; align-items:flex-start; transition:transform .38s cubic-bezier(.4,.1,.2,1);}
#view-tool-ex .ex-sl{flex:0 0 100%; min-width:0; box-sizing:border-box;}
#view-tool-ex .ex-nav{display:flex; gap:10px; margin-top:6px;}
#view-tool-ex .ex-nav .btn{flex:1; padding:12px;}
#view-tool-ex .ex-ansrow{margin-top:14px; padding:12px 14px; border:1.5px dashed #CBD5E1; border-radius:14px; background:#fff; align-items:flex-start;}
#view-tool-ex .ex-ansrow input{flex:0 0 22px; width:22px; height:22px; margin-top:2px;}
#view-tool-ex .ex-ansrow span{font-weight:500; font-size:14.5px; line-height:1.4;}
#view-tool-ex .ex-ansrow small{display:block; color:var(--ink-soft); font-size:12.5px; font-weight:500;}
html[data-theme="dark"] #view-tool-ex .ex-ansrow,html[data-theme="black"] #view-tool-ex .ex-ansrow{background:#1d2233; border-color:#2c3450;}
#view-tool-ex .ex-empty{margin-top:10px; padding:22px 14px; border:2px dashed #CBD5E1; border-radius:16px; text-align:center; color:var(--ink-soft); font-size:14.5px;}
@media (prefers-reduced-motion:reduce){#view-tool-ex .ex-tr,#view-tool-ex .ex-vp{transition:none;} #view-tool-ex .exs-i.cur .exs-c{animation:none;}}
#view-tool-ex .exs-l{font-size:14px;}
#view-tool-ex .mg-drop{margin-top:10px; padding:16px 12px; border:2px dashed #CBD5E1; border-radius:16px; text-align:center; transition:background .15s,border-color .15s;}
#view-tool-ex .mg-drop.on{background:var(--c-bg); border-color:var(--c-main);}
#view-tool-ex .mg-it{display:flex; align-items:center; gap:10px; margin-top:8px; padding:8px 10px; border:1.5px solid #E1E7F3; border-radius:14px; background:#fff;}
#view-tool-ex .mg-it > b{flex:0 0 28px; height:28px; border-radius:50%; background:linear-gradient(135deg,#5BE08A,#4A90E2); color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px;}
#view-tool-ex .mg-nm{flex:1; min-width:0; display:flex; flex-direction:column;}
#view-tool-ex .mg-nm span{font-weight:600; font-size:14.5px; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
#view-tool-ex .mg-nm small{font-size:12.5px; color:var(--ink-soft);}
#view-tool-ex .mg-bt{display:flex; gap:4px;}
#view-tool-ex .mg-bt button{width:30px; height:30px; padding:0; border-radius:50%; border:1.5px solid #CBD5E1; background:#fff; color:var(--ink-soft); font:inherit; font-size:12px; cursor:pointer;}
#view-tool-ex .mg-bt button:disabled{opacity:.35; cursor:default;}
#view-tool-ex .mg-bt button:not(:disabled):hover{background:var(--c-main); border-color:var(--c-main); color:#fff;}
#view-tool-ex .mg-bt button.x:hover{background:#EA4335; border-color:#EA4335;}
#view-tool-ex .mg-tools{display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:10px;}
#view-tool-ex .mg-sw{display:flex; align-items:center; gap:8px; margin:6px 0 8px; font-weight:600; color:var(--ink); cursor:pointer;}
#view-tool-ex .mg-sw input{width:20px; height:20px; accent-color:#34A853;}
#view-tool-ex .mg-set select,#view-tool-ex .mg-set input:not([type=checkbox]){min-width:0;}
#view-tool-ex .mg-pvw{display:flex; align-items:center; gap:14px; margin-top:6px;}
#view-tool-ex .mg-pv{position:relative; flex:0 0 150px; width:150px; aspect-ratio:210/297; background:#fff; border:1.5px solid #CBD5E1; border-radius:6px; box-shadow:0 8px 18px -12px rgba(27,34,51,.5); overflow:hidden; background-image:repeating-linear-gradient(#fff 0 18px,#EEF1F7 18px 19px); background-position:0 34px; background-repeat:no-repeat; background-size:84% 78%; background-position:8% 14%;}
#view-tool-ex .mg-pv span{position:absolute; white-space:nowrap; line-height:1.2; color:#111; font-family:"TH Sarabun New","TH SarabunPSK","Sarabun",Tahoma,sans-serif;}
#view-tool-ex .mg-ok{margin-top:12px; padding:12px 14px; border-radius:14px; background:#E3F5E8; color:#17692F; font-weight:600;}
#view-tool-ex .ex-pdf[disabled]{filter:grayscale(.85) brightness(1.05); opacity:.65; cursor:not-allowed; animation:none; transform:none;}
html[data-theme="dark"] #view-tool-ex .mg-it,html[data-theme="black"] #view-tool-ex .mg-it,html[data-theme="dark"] #view-tool-ex .mg-bt button,html[data-theme="black"] #view-tool-ex .mg-bt button{background:#1d2233; border-color:#2c3450;}
html[data-theme="dark"] #view-tool-ex .mg-ok,html[data-theme="black"] #view-tool-ex .mg-ok{background:#17301f; color:#8ee0a6;}
.ex-pv{position:relative; overflow:hidden; margin-top:12px; border-radius:14px; border:1.5px solid #E1E7F3; background:#fff; box-shadow:0 12px 26px -20px rgba(27,34,51,.5);}
.ex-pv iframe{position:absolute; top:0; left:0; width:794px; height:1123px; border:0; background:#fff; transform-origin:0 0;}
`;
document.head.appendChild(exStyle);

/* จัดลำดับปุ่มในเมนู: แผนการสอน → แบบฝึกหัด → สุ่มนักเรียน → จับกลุ่ม → ที่เหลือตามเดิม */
(function orderMenu(){
  const first = ["plan","ex","random","groups"];
  const rank = t => { const i = first.indexOf(t.id); return i < 0 ? first.length : i; };
  toolRefs.map((t,i)=>({t,i})).sort((x,y)=> rank(x.t)-rank(y.t) || x.i-y.i)
    .forEach(({t},n)=>{ t._btn.style.setProperty("--i", n); toolsMenu.appendChild(t._btn); });
})();

/* เปิดเว็บ/เปลี่ยนหน้าทุกครั้งให้อยู่บนสุด (ไม่เลื่อนไปล่างสุดเอง) */
(function scrollTopOnNav(){
  try{ if("scrollRestoration" in history) history.scrollRestoration = "manual"; }catch(e){}
  const top = () => {
    try{ window.scrollTo(0, 0); }catch(e){}
    [document.documentElement, document.body, $("#app"), $(".view.active")].forEach(el => { if(el) el.scrollTop = 0; });
  };
  const topSoon = () => { top(); requestAnimationFrame(() => { top(); setTimeout(top, 120); }); };
  new MutationObserver(ms => {
    for(const m of ms){
      const t = m.target;
      if(t.classList && t.classList.contains("view") && t.classList.contains("active") && !(m.oldValue || "").split(/\s+/).includes("active")){ topSoon(); return; }
    }
  }).observe(appEl, { attributes:true, attributeFilter:["class"], attributeOldValue:true, subtree:true });
  topSoon();
  addEventListener("load", topSoon);
  addEventListener("pageshow", topSoon);
})();

/* ให้ไฟล์อื่น/เครื่องมือใหม่ในอนาคตเรียกใช้ได้ */
window.KCTools = { registerTool, fireworks, parseExpr };

})();
