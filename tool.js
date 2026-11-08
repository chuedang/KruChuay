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
const PLAN_CONTENT = {"ค ๑.๑": {"ป.๑": ["จำนวนนับ ๑ ถึง ๑๐๐ และ ๐", "- การนับทีละ ๑ และทีละ ๑๐", "- การอ่านและการเขียนตัวเลขฮินดูอารบิก ตัวเลขไทยแสดงจำนวน", "- การแสดงจำนวนนับไม่เกิน ๒๐ ในรูปความสัมพันธ์ของจำนวนแบบส่วนย่อย - ส่วนรวม (part - whole relationship)", "- การบอกอันดับที่", "- หลัก ค่าของเลขโดดในแต่ละหลักและการเขียนตัวเลขแสดงจำนวนในรูปกระจาย", "- การเปรียบเทียบจำนวนและการใช้เครื่องหมาย = ≠ > <", "- การเรียงลำดับจำนวน", "การบวก การลบ จำนวนนับ ๑ ถึง ๑๐๐ และ ๐", "- ความหมายของการบวก ความหมายของการลบ การหาผลบวก การหาผลลบ และความสัมพันธ์ของการบวกและการลบ", "- การแก้โจทย์ปัญหาการบวก โจทย์ปัญหาการลบ และการสร้างโจทย์ปัญหาพร้อมทั้งหาคำตอบ"], "ป.๒": ["จำนวนนับไม่เกิน ๑,๐๐๐ และ ๐", "- การนับทีละ ๒ ทีละ ๕ ทีละ ๑๐ และทีละ ๑๐๐", "- การอ่านและการเขียนตัวเลขฮินดูอารบิก ตัวเลขไทย และตัวหนังสือแสดงจำนวน", "- จำนวนคู่ จำนวนคี่", "- หลัก ค่าของเลขโดดในแต่ละหลักและการเขียนตัวเลขแสดงจำนวนในรูปกระจาย", "- การเปรียบเทียบและเรียงลำดับจำนวน", "การบวก การลบ การคูณ การหาร จำนวนนับไม่เกิน ๑,๐๐๐ และ ๐", "- การบวกและการลบ", "- ความหมายของการคูณ ความหมายของการหาร การหาผลคูณ การหาผลหารและเศษ และความสัมพันธ์ของการคูณและการหาร", "- การบวก ลบ คูณ หารระคน", "- การแก้โจทย์ปัญหาและการสร้างโจทย์ปัญหา พร้อมทั้งหาคำตอบ"], "ป.๓": ["จำนวนนับไม่เกิน ๑๐๐,๐๐๐ และ ๐", "- การอ่าน การเขียนตัวเลขฮินดูอารบิก ตัวเลขไทย และตัวหนังสือแสดงจำนวน", "- หลัก ค่าของเลขโดดในแต่ละหลักและการเขียนตัวเลขแสดงจำนวนในรูปกระจาย", "- การเปรียบเทียบและเรียงลำดับจำนวน", "เศษส่วน", "- เศษส่วนที่ตัวเศษน้อยกว่าหรือเท่ากับตัวส่วน", "- การเปรียบเทียบและเรียงลำดับเศษส่วน", "การบวก การลบ การคูณ การหารจำนวนนับไม่เกิน ๑๐๐,๐๐๐ และ ๐", "- การบวกและการลบ", "- การคูณ การหารยาวและการหารสั้น", "- การบวก ลบ คูณ หารระคน", "- การแก้โจทย์ปัญหาและการสร้างโจทย์ปัญหา พร้อมทั้งหาคำตอบ", "การบวก การลบเศษส่วน", "- การบวกและการลบเศษส่วน", "- การแก้โจทย์ปัญหาการบวกและโจทย์ปัญหาการลบเศษส่วน"], "ป.๔": ["จำนวนนับที่มากกว่า ๑๐๐,๐๐๐ และ ๐", "- การอ่าน การเขียนตัวเลขฮินดูอารบิก ตัวเลขไทย และตัวหนังสือแสดงจำนวน", "- หลัก ค่าประจำหลักและค่าของเลขโดดในแต่ละหลัก และการเขียนตัวเลขแสดงจำนวนในรูปกระจาย", "- การเปรียบเทียบและเรียงลำดับจำนวน", "- ค่าประมาณของจำนวนนับและการใช้เครื่องหมาย ≈", "เศษส่วน", "- เศษส่วนแท้ เศษเกิน", "- จำนวนคละ", "- ความสัมพันธ์ระหว่างจำนวนคละและเศษเกิน", "- เศษส่วนที่เท่ากัน เศษส่วนอย่างต่ำ และเศษส่วนที่เท่ากับจำนวนนับ", "- การเปรียบเทียบ เรียงลำดับเศษส่วนและจำนวนคละ", "ทศนิยม", "- การอ่านและการเขียนทศนิยมไม่เกิน ๓ ตำแหน่ง ตามปริมาณที่กำหนด", "- หลัก ค่าประจำหลัก ค่าของเลขโดดในแต่ละหลักของทศนิยม และการเขียนตัวเลขแสดงทศนิยมในรูปกระจาย", "- ทศนิยมที่เท่ากัน", "- การเปรียบเทียบและเรียงลำดับทศนิยม", "การบวก การลบ การคูณ การหารจำนวนนับที่มากกว่า ๑๐๐,๐๐๐ และ ๐", "- การประมาณผลลัพธ์ของการบวก การลบ การคูณ การหาร", "- การบวกและการลบ", "- การคูณและการหาร", "- การบวก ลบ คูณ หารระคน", "- การแก้โจทย์ปัญหาและการสร้างโจทย์ปัญหา พร้อมทั้งหาคำตอบ", "การบวก การลบเศษส่วน", "- การบวก การลบเศษส่วนและจำนวนคละ", "- การแก้โจทย์ปัญหาการบวกและโจทย์ปัญหาการลบเศษส่วนและจำนวนคละ", "การบวก การลบทศนิยม", "- การบวก การลบทศนิยม", "- การแก้โจทย์ปัญหาการบวก การลบทศนิยมไม่เกิน ๒ ขั้นตอน"], "ป.๕": ["ทศนิยม", "- ความสัมพันธ์ระหว่างเศษส่วนและทศนิยม", "- ค่าประมาณของทศนิยมไม่เกิน ๓ ตำแหน่ง ที่เป็นจำนวนเต็ม ทศนิยม ๑ ตำแหน่ง และ ๒ ตำแหน่ง การใช้เครื่องหมาย ≈", "จำนวนนับและ ๐ การบวก การลบ การคูณ และการหาร", "- การแก้โจทย์ปัญหาโดยใช้บัญญัติไตรยางศ์", "เศษส่วน และการบวก การลบ การคูณ การหารเศษส่วน", "- การเปรียบเทียบเศษส่วนและจำนวนคละ", "- การบวก การลบของเศษส่วนและจำนวนคละ", "- การคูณ การหารของเศษส่วนและจำนวนคละ", "- การบวก ลบ คูณ หารระคนของเศษส่วนและจำนวนคละ", "- การแก้โจทย์ปัญหาเศษส่วนและจำนวนคละ", "การคูณ การหารทศนิยม", "- การประมาณผลลัพธ์ของการบวก การลบ การคูณ การหารทศนิยม", "- การคูณทศนิยม", "- การหารทศนิยม", "- การแก้โจทย์ปัญหาเกี่ยวกับทศนิยม", "ร้อยละหรือเปอร์เซ็นต์", "- การอ่านและการเขียนร้อยละหรือเปอร์เซ็นต์", "- การแก้โจทย์ปัญหาร้อยละ"], "ป.๖": ["เศษส่วน", "- การเปรียบเทียบและเรียงลำดับเศษส่วนและจำนวนคละโดยใช้ความรู้เรื่อง ค.ร.น.", "อัตราส่วน", "- อัตราส่วน อัตราส่วนที่เท่ากัน และมาตราส่วน", "จำนวนนับและ ๐", "- ตัวประกอบ จำนวนเฉพาะ ตัวประกอบเฉพาะ และการแยกตัวประกอบ", "- ห.ร.ม. และ ค.ร.น.", "- การแก้โจทย์ปัญหาเกี่ยวกับ ห.ร.ม. และ ค.ร.น.", "การบวก การลบ การคูณ การหารเศษส่วน", "- การบวก การลบเศษส่วนและจำนวนคละ โดยใช้ความรู้เรื่อง ค.ร.น.", "- การบวก ลบ คูณ หารระคนของเศษส่วนและจำนวนคละ", "- การแก้โจทย์ปัญหาเศษส่วนและจำนวนคละ", "ทศนิยม และการบวก การลบ การคูณ การหาร", "- ความสัมพันธ์ระหว่างเศษส่วนและทศนิยม", "- การหารทศนิยม", "- การแก้โจทย์ปัญหาเกี่ยวกับทศนิยม (รวมการแลกเงินต่างประเทศ)", "อัตราส่วนและร้อยละ", "- การแก้โจทย์ปัญหาอัตราส่วนและมาตราส่วน", "- การแก้โจทย์ปัญหาร้อยละ"], "ม.๑": ["จำนวนตรรกยะ", "- จำนวนเต็ม", "- สมบัติของจำนวนเต็ม", "- ทศนิยมและเศษส่วน", "- จำนวนตรรกยะและสมบัติของจำนวนตรรกยะ", "- เลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนเต็มบวก", "- การนำความรู้เกี่ยวกับจำนวนเต็ม จำนวนตรรกยะ และเลขยกกำลังไปใช้ในการแก้ปัญหา", "อัตราส่วน", "- อัตราส่วนของจำนวนหลาย ๆ จำนวน", "- สัดส่วน", "- การนำความรู้เกี่ยวกับอัตราส่วน สัดส่วน และร้อยละไปใช้ในการแก้ปัญหา"], "ม.๒": ["จำนวนตรรกยะ", "- เลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนเต็ม", "- การนำความรู้เกี่ยวกับเลขยกกำลังไปใช้ในการแก้ปัญหา", "จำนวนจริง", "- จำนวนอตรรกยะ", "- จำนวนจริง", "- รากที่สองและรากที่สามของจำนวนตรรกยะ", "- การนำความรู้เกี่ยวกับจำนวนจริงไปใช้"], "ม.๔": ["เซต", "- ความรู้เบื้องต้นและสัญลักษณ์พื้นฐานเกี่ยวกับเซต", "- ยูเนียน อินเตอร์เซกชัน และคอมพลีเมนต์ของเซต", "ตรรกศาสตร์เบื้องต้น", "- ประพจน์และตัวเชื่อม (นิเสธ และ หรือ ถ้า...แล้ว... ก็ต่อเมื่อ)"], "ม.๕": ["เลขยกกำลัง", "- รากที่ n ของจำนวนจริง เมื่อ n เป็นจำนวนนับที่มากกว่า ๑", "- เลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนตรรกยะ"]}, "ค ๑.๒": {"ป.๑": ["แบบรูป", "- แบบรูปของจำนวนที่เพิ่มขึ้นหรือลดลงทีละ ๑ และทีละ ๑๐", "- แบบรูปซ้ำของจำนวน รูปเรขาคณิต และรูปอื่น ๆ"], "ป.๒": ["แบบรูป", "- แบบรูปของจำนวนที่เพิ่มขึ้นหรือลดลงทีละ ๒ ทีละ ๕ และทีละ ๑๐๐", "- แบบรูปซ้ำ"], "ป.๓": ["แบบรูป", "- แบบรูปของจำนวนที่เพิ่มขึ้นหรือลดลงทีละเท่า ๆ กัน"], "ป.๔": ["แบบรูป", "- แบบรูปของจำนวนที่เกิดจากการคูณ การหารด้วยจำนวนเดียวกัน"], "ป.๖": ["แบบรูป", "- การแก้ปัญหาเกี่ยวกับแบบรูป"], "ม.๒": ["พหุนาม", "- พหุนาม", "- การบวก การลบ และการคูณของพหุนาม", "- การหารพหุนามด้วยเอกนามที่มีผลหารเป็นพหุนาม", "การแยกตัวประกอบของพหุนาม", "- การแยกตัวประกอบของพหุนามดีกรีสอง โดยใช้", "    o สมบัติการแจกแจง", "    o กำลังสองสมบูรณ์", "    o ผลต่างของกำลังสอง"], "ม.๓": ["การแยกตัวประกอบของพหุนาม", "- การแยกตัวประกอบของพหุนามดีกรีสูงกว่าสอง", "ฟังก์ชันกำลังสอง", "- กราฟของฟังก์ชันกำลังสอง", "- การนำความรู้เกี่ยวกับฟังก์ชันกำลังสองไปใช้ในการแก้ปัญหา"], "ม.๕": ["ฟังก์ชัน", "- ฟังก์ชันและกราฟของฟังก์ชัน (ฟังก์ชันเชิงเส้น ฟังก์ชันกำลังสอง ฟังก์ชันขั้นบันได ฟังก์ชันเอกซ์โพเนนเชียล)", "ลำดับและอนุกรม", "- ลำดับเลขคณิตและลำดับเรขาคณิต", "- อนุกรมเลขคณิตและอนุกรมเรขาคณิต"]}, "ค ๑.๓": {"ม.๑": ["สมการเชิงเส้นตัวแปรเดียว", "- สมการเชิงเส้นตัวแปรเดียว", "- การแก้สมการเชิงเส้นตัวแปรเดียว", "- การนำความรู้เกี่ยวกับการแก้สมการเชิงเส้นตัวแปรเดียวไปใช้ในชีวิตจริง", "สมการเชิงเส้นสองตัวแปร", "- กราฟของความสัมพันธ์เชิงเส้น", "- สมการเชิงเส้นสองตัวแปร", "- การนำความรู้เกี่ยวกับสมการเชิงเส้นสองตัวแปรและกราฟของความสัมพันธ์เชิงเส้นไปใช้ในชีวิตจริง"], "ม.๓": ["อสมการเชิงเส้นตัวแปรเดียว", "- อสมการเชิงเส้นตัวแปรเดียว", "- การแก้อสมการเชิงเส้นตัวแปรเดียว", "- การนำความรู้เกี่ยวกับการแก้อสมการเชิงเส้นตัวแปรเดียวไปใช้ในการแก้ปัญหา", "สมการกำลังสองตัวแปรเดียว", "- สมการกำลังสองตัวแปรเดียว", "- การแก้สมการกำลังสองตัวแปรเดียว", "- การนำความรู้เกี่ยวกับการแก้สมการกำลังสองตัวแปรเดียวไปใช้ในการแก้ปัญหา", "ระบบสมการ", "- ระบบสมการเชิงเส้นสองตัวแปร", "- การแก้ระบบสมการเชิงเส้นสองตัวแปร", "- การนำความรู้เกี่ยวกับการแก้ระบบสมการเชิงเส้นสองตัวแปรไปใช้ในการแก้ปัญหา"], "ม.๕": ["ดอกเบี้ยและมูลค่าของเงิน", "- ดอกเบี้ย", "- มูลค่าของเงิน", "- ค่ารายงวด"]}, "ค ๒.๑": {"ป.๑": ["ความยาว", "- การวัดความยาวโดยใช้หน่วยที่ไม่ใช่หน่วยมาตรฐาน", "- การวัดความยาวเป็นเซนติเมตร เป็นเมตร", "- การเปรียบเทียบความยาวเป็นเซนติเมตร เป็นเมตร", "- การแก้โจทย์ปัญหาการบวก การลบเกี่ยวกับความยาวที่มีหน่วยเป็นเซนติเมตร เป็นเมตร", "น้ำหนัก", "- การวัดน้ำหนักโดยใช้หน่วยที่ไม่ใช่หน่วยมาตรฐาน", "- การวัดน้ำหนักเป็นกิโลกรัม เป็นขีด", "- การเปรียบเทียบน้ำหนักเป็นกิโลกรัม เป็นขีด", "- การแก้โจทย์ปัญหาการบวก การลบเกี่ยวกับน้ำหนักที่มีหน่วยเป็นกิโลกรัม เป็นขีด"], "ป.๒": ["เวลา", "- การบอกเวลาเป็นนาฬิกาและนาที (ช่วง ๕ นาที)", "- การบอกระยะเวลาเป็นชั่วโมง เป็นนาที", "- การเปรียบเทียบระยะเวลาเป็นชั่วโมง เป็นนาที", "- การอ่านปฏิทิน", "- การแก้โจทย์ปัญหาเกี่ยวกับเวลา", "ความยาว", "- การวัดความยาวเป็นเมตรและเซนติเมตร", "- การคาดคะเนความยาวเป็นเมตร", "- การเปรียบเทียบความยาวโดยใช้ความสัมพันธ์ระหว่างเมตรกับเซนติเมตร", "- การแก้โจทย์ปัญหาเกี่ยวกับความยาวที่มีหน่วยเป็นเมตรและเซนติเมตร", "น้ำหนัก", "- การวัดน้ำหนักเป็นกิโลกรัมและกรัม กิโลกรัมและขีด", "- การคาดคะเนน้ำหนักเป็นกิโลกรัม", "- การเปรียบเทียบน้ำหนักโดยใช้ความสัมพันธ์ระหว่างกิโลกรัมกับกรัม กิโลกรัมกับขีด", "- การแก้โจทย์ปัญหาเกี่ยวกับน้ำหนักที่มีหน่วยเป็นกิโลกรัมและกรัม กิโลกรัมและขีด", "ปริมาตรและความจุ", "- การวัดปริมาตรและความจุโดยใช้หน่วยที่ไม่ใช่หน่วยมาตรฐาน", "- การวัดปริมาตรและความจุเป็นช้อนชา ช้อนโต๊ะ ถ้วยตวง ลิตร", "- การเปรียบเทียบปริมาตรและความจุเป็นช้อนชา ช้อนโต๊ะ ถ้วยตวง ลิตร", "- การแก้โจทย์ปัญหาเกี่ยวกับปริมาตรและความจุ ที่มีหน่วยเป็นช้อนชา ช้อนโต๊ะ ถ้วยตวง ลิตร"], "ป.๓": ["เงิน", "- การบอกจำนวนเงินและเขียนแสดงจำนวนเงิน แบบใช้จุด", "- การเปรียบเทียบจำนวนเงินและการแลกเงิน", "- การอ่านและเขียนบันทึกรายรับ รายจ่าย", "- การแก้โจทย์ปัญหาเกี่ยวกับเงิน", "เวลา", "- การบอกเวลาเป็นนาฬิกาและนาที", "- การเขียนบอกเวลาโดยใช้มหัพภาค (.) หรือทวิภาค (:) และการอ่าน", "- การบอกระยะเวลาเป็นชั่วโมงและนาที", "- การเปรียบเทียบระยะเวลาโดยใช้ความสัมพันธ์ระหว่างชั่วโมงกับนาที", "- การอ่านและการเขียนบันทึกกิจกรรมที่ระบุเวลา", "- การแก้โจทย์ปัญหาเกี่ยวกับเวลาและระยะเวลา", "ความยาว", "- การวัดความยาวเป็นเซนติเมตรและมิลลิเมตร เมตรและเซนติเมตร กิโลเมตรและเมตร", "- การเลือกเครื่องวัดความยาวที่เหมาะสม", "- การคาดคะเนความยาวเป็นเมตรและเป็นเซนติเมตร", "- การเปรียบเทียบความยาวโดยใช้ความสัมพันธ์ระหว่างหน่วยความยาว", "- การแก้โจทย์ปัญหาเกี่ยวกับความยาว", "น้ำหนัก", "- การเลือกเครื่องชั่งที่เหมาะสม", "- การคาดคะเนน้ำหนักเป็นกิโลกรัมและเป็นขีด", "- การเปรียบเทียบน้ำหนักโดยใช้ความสัมพันธ์ระหว่างกิโลกรัมกับกรัม เมตริกตันกับกิโลกรัม", "- การแก้โจทย์ปัญหาเกี่ยวกับน้ำหนัก", "ปริมาตรและความจุ", "- การวัดปริมาตรและความจุเป็นลิตรและมิลลิลิตร", "- การเลือกเครื่องตวงที่เหมาะสม", "- การคาดคะเนปริมาตรและความจุเป็นลิตร", "- การเปรียบเทียบปริมาตรและความจุโดยใช้ความสัมพันธ์ระหว่างลิตรกับมิลลิลิตร ช้อนชา ช้อนโต๊ะ ถ้วยตวงกับมิลลิลิตร", "- การแก้โจทย์ปัญหาเกี่ยวกับปริมาตรและความจุที่มีหน่วยเป็นลิตรและมิลลิลิตร"], "ป.๔": ["เวลา", "- การบอกระยะเวลาเป็นวินาที นาที ชั่วโมง วัน สัปดาห์ เดือน ปี", "- การเปรียบเทียบระยะเวลาโดยใช้ความสัมพันธ์ระหว่างหน่วยเวลา", "- การอ่านตารางเวลา", "- การแก้โจทย์ปัญหาเกี่ยวกับเวลา", "การวัดและสร้างมุม", "- การวัดขนาดของมุมโดยใช้โพรแทรกเตอร์", "- การสร้างมุมเมื่อกำหนดขนาดของมุม", "รูปสี่เหลี่ยมมุมฉาก", "- ความยาวรอบรูปของรูปสี่เหลี่ยมมุมฉาก", "- พื้นที่ของรูปสี่เหลี่ยมมุมฉาก", "- การแก้โจทย์ปัญหาเกี่ยวกับความยาวรอบรูป และพื้นที่ของรูปสี่เหลี่ยมมุมฉาก"], "ป.๕": ["ความยาว", "- ความสัมพันธ์ระหว่างหน่วยความยาว เซนติเมตรกับมิลลิเมตร เมตรกับเซนติเมตร กิโลเมตรกับเมตร โดยใช้ความรู้เรื่องทศนิยม", "- การแก้โจทย์ปัญหาเกี่ยวกับความยาวโดยใช้ความรู้เรื่องการเปลี่ยนหน่วยและทศนิยม", "น้ำหนัก", "- ความสัมพันธ์ระหว่างหน่วยน้ำหนัก กิโลกรัมกับกรัม โดยใช้ความรู้เรื่องทศนิยม", "- การแก้โจทย์ปัญหาเกี่ยวกับน้ำหนัก โดยใช้ความรู้เรื่องการเปลี่ยนหน่วยและทศนิยม", "ปริมาตรและความจุ", "- ปริมาตรของทรงสี่เหลี่ยมมุมฉากและความจุของภาชนะทรงสี่เหลี่ยมมุมฉาก", "- ความสัมพันธ์ระหว่าง มิลลิลิตร ลิตร ลูกบาศก์เซนติเมตร และลูกบาศก์เมตร", "- การแก้โจทย์ปัญหาเกี่ยวกับปริมาตรของทรงสี่เหลี่ยมมุมฉากและความจุของภาชนะทรงสี่เหลี่ยมมุมฉาก", "รูปเรขาคณิตสองมิติ", "- ความยาวรอบรูปของรูปสี่เหลี่ยม", "- พื้นที่ของรูปสี่เหลี่ยมด้านขนานและรูปสี่เหลี่ยมขนมเปียกปูน", "- การแก้โจทย์ปัญหาเกี่ยวกับความยาวรอบรูปของรูปสี่เหลี่ยมและพื้นที่ของรูปสี่เหลี่ยมด้านขนานและรูปสี่เหลี่ยมขนมเปียกปูน"], "ป.๖": ["ปริมาตรและความจุ", "- ปริมาตรของรูปเรขาคณิตสามมิติที่ประกอบด้วยทรงสี่เหลี่ยมมุมฉาก", "- การแก้โจทย์ปัญหาเกี่ยวกับปริมาตรของรูปเรขาคณิตสามมิติที่ประกอบด้วยทรงสี่เหลี่ยมมุมฉาก", "รูปเรขาคณิตสองมิติ", "- ความยาวรอบรูปและพื้นที่ของรูปสามเหลี่ยม", "- มุมภายในของรูปหลายเหลี่ยม", "- ความยาวรอบรูปและพื้นที่ของรูปหลายเหลี่ยม", "- การแก้โจทย์ปัญหาเกี่ยวกับความยาวรอบรูปและพื้นที่ของรูปหลายเหลี่ยม", "- ความยาวรอบรูปและพื้นที่ของวงกลม", "- การแก้โจทย์ปัญหาเกี่ยวกับความยาวรอบรูปและพื้นที่ของวงกลม"], "ม.๒": ["พื้นที่ผิว", "- การหาพื้นที่ผิวของปริซึมและทรงกระบอก", "- การนำความรู้เกี่ยวกับพื้นที่ผิวของปริซึมและทรงกระบอกไปใช้ในการแก้ปัญหา", "ปริมาตร", "- การหาปริมาตรของปริซึมและทรงกระบอก", "- การนำความรู้เกี่ยวกับปริมาตรของปริซึมและทรงกระบอกไปใช้ในการแก้ปัญหา"], "ม.๓": ["พื้นที่ผิว", "- การหาพื้นที่ผิวของพีระมิด กรวย และทรงกลม", "- การนำความรู้เกี่ยวกับพื้นที่ผิวของพีระมิด กรวย และทรงกลมไปใช้ในการแก้ปัญหา", "ปริมาตร", "- การหาปริมาตรของพีระมิด กรวย และทรงกลม", "- การนำความรู้เกี่ยวกับปริมาตรของพีระมิด กรวย และทรงกลมไปใช้ในการแก้ปัญหา"]}, "ค ๒.๒": {"ป.๑": ["รูปเรขาคณิตสองมิติและรูปเรขาคณิตสามมิติ", "- ลักษณะของทรงสี่เหลี่ยมมุมฉาก ทรงกลม ทรงกระบอก กรวย", "- ลักษณะของรูปสามเหลี่ยม รูปสี่เหลี่ยม วงกลม และวงรี"], "ป.๒": ["รูปเรขาคณิตสองมิติ", "- ลักษณะของรูปหลายเหลี่ยม วงกลม และวงรี และการเขียนรูปเรขาคณิตสองมิติโดยใช้แบบของรูป"], "ป.๓": ["รูปเรขาคณิตสองมิติ", "- รูปที่มีแกนสมมาตร"], "ป.๔": ["รูปเรขาคณิต", "- ระนาบ จุด เส้นตรง รังสี ส่วนของเส้นตรง และสัญลักษณ์แสดงเส้นตรง รังสี ส่วนของเส้นตรง", "- มุม", "    o ส่วนประกอบของมุม", "    o การเรียกชื่อมุม", "    o สัญลักษณ์แสดงมุม", "    o ชนิดของมุม", "- ชนิดและสมบัติของรูปสี่เหลี่ยมมุมฉาก", "- การสร้างรูปสี่เหลี่ยมมุมฉาก"], "ป.๕": ["รูปเรขาคณิต", "- เส้นตั้งฉากและสัญลักษณ์แสดงการตั้งฉาก", "- เส้นขนานและสัญลักษณ์แสดงการขนาน", "- การสร้างเส้นขนาน", "- มุมแย้ง มุมภายใน และมุมภายนอกที่อยู่บนข้างเดียวกันของเส้นตัดขวาง (Transversal)", "รูปเรขาคณิตสองมิติ", "- ชนิดและสมบัติของรูปสี่เหลี่ยม", "- การสร้างรูปสี่เหลี่ยม", "รูปเรขาคณิตสามมิติ", "- ลักษณะและส่วนต่าง ๆ ของปริซึม"], "ป.๖": ["รูปเรขาคณิตสองมิติ", "- ชนิดและสมบัติของรูปสามเหลี่ยม", "- การสร้างรูปสามเหลี่ยม", "- ส่วนต่าง ๆ ของวงกลม", "- การสร้างวงกลม", "รูปเรขาคณิตสามมิติ", "- ทรงกลม ทรงกระบอก กรวย พีระมิด", "- รูปคลี่ของทรงกระบอก กรวย ปริซึม พีระมิด"], "ม.๑": ["การสร้างทางเรขาคณิต", "- การสร้างพื้นฐานทางเรขาคณิต", "- การสร้างรูปเรขาคณิตสองมิติ โดยใช้การสร้างพื้นฐานทางเรขาคณิต", "- การนำความรู้เกี่ยวกับการสร้างพื้นฐานทางเรขาคณิตไปใช้ในชีวิตจริง", "มิติสัมพันธ์ของรูปเรขาคณิต", "- หน้าตัดของรูปเรขาคณิตสามมิติ", "- ภาพที่ได้จากการมองด้านหน้า ด้านข้าง ด้านบนของรูปเรขาคณิตสามมิติที่ประกอบขึ้นจากลูกบาศก์"], "ม.๒": ["การสร้างทางเรขาคณิต", "- การนำความรู้เกี่ยวกับการสร้างทางเรขาคณิตไปใช้ในชีวิตจริง", "เส้นขนาน", "- สมบัติเกี่ยวกับเส้นขนานและรูปสามเหลี่ยม", "การแปลงทางเรขาคณิต", "- การเลื่อนขนาน", "- การสะท้อน", "- การหมุน", "- การนำความรู้เกี่ยวกับการแปลงทางเรขาคณิตไปใช้ในการแก้ปัญหา", "ความเท่ากันทุกประการ", "- ความเท่ากันทุกประการของรูปสามเหลี่ยม", "- การนำความรู้เกี่ยวกับความเท่ากันทุกประการไปใช้ในการแก้ปัญหา", "ทฤษฎีบทพีทาโกรัส", "- ทฤษฎีบทพีทาโกรัสและบทกลับ", "- การนำความรู้เกี่ยวกับทฤษฎีบทพีทาโกรัสและบทกลับไปใช้ในชีวิตจริง"], "ม.๓": ["ความคล้าย", "- รูปสามเหลี่ยมที่คล้ายกัน", "- การนำความรู้เกี่ยวกับความคล้ายไปใช้ในการแก้ปัญหา", "อัตราส่วนตรีโกณมิติ", "- อัตราส่วนตรีโกณมิติ", "- การนำค่าอัตราส่วนตรีโกณมิติของมุม ๓๐ องศา ๔๕ องศา และ ๖๐ องศา ไปใช้ในการแก้ปัญหา", "วงกลม", "- วงกลม คอร์ด และเส้นสัมผัส", "- ทฤษฎีบทเกี่ยวกับวงกลม"]}, "ค ๓.๑": {"ป.๑": ["การนำเสนอข้อมูล", "- การอ่านแผนภูมิรูปภาพ"], "ป.๒": ["การนำเสนอข้อมูล", "- การอ่านแผนภูมิรูปภาพ"], "ป.๓": ["การเก็บรวบรวมข้อมูลและการนำเสนอข้อมูล", "- การเก็บรวบรวมข้อมูลและจำแนกข้อมูล", "- การอ่านและการเขียนแผนภูมิรูปภาพ", "- การอ่านและการเขียนตารางทางเดียว (one - way table)"], "ป.๔": ["การนำเสนอข้อมูล", "- การอ่านและการเขียนแผนภูมิแท่ง (ไม่รวมการย่นระยะ)", "- การอ่านตารางสองทาง (two - way table)"], "ป.๕": ["การนำเสนอข้อมูล", "- การอ่านกราฟเส้น", "- การอ่านและการเขียนแผนภูมิแท่ง"], "ป.๖": ["การนำเสนอข้อมูล", "- การอ่านแผนภูมิรูปวงกลม"], "ม.๑": ["สถิติ", "- การตั้งคำถามทางสถิติ", "- การเก็บรวบรวมข้อมูล", "- การนำเสนอข้อมูล", "    o แผนภูมิรูปภาพ", "    o แผนภูมิแท่ง", "    o กราฟเส้น", "    o แผนภูมิรูปวงกลม", "- การแปลความหมายข้อมูล", "- การนำสถิติไปใช้ในชีวิตจริง"], "ม.๒": ["สถิติ", "- การนำเสนอและวิเคราะห์ข้อมูล", "    o แผนภาพจุด", "    o แผนภาพต้น - ใบ", "    o ฮิสโทแกรม", "    o ค่ากลางของข้อมูล", "- การแปลความหมายผลลัพธ์", "- การนำสถิติไปใช้ในชีวิตจริง"], "ม.๓": ["สถิติ", "- ข้อมูลและการวิเคราะห์ข้อมูล", "    o แผนภาพกล่อง", "- การแปลความหมายผลลัพธ์", "- การนำสถิติไปใช้ในชีวิตจริง"], "ม.๖": ["สถิติ", "- ข้อมูล", "- ตำแหน่งที่ของข้อมูล", "- ค่ากลาง (ฐานนิยม มัธยฐาน ค่าเฉลี่ยเลขคณิต)", "- ค่าการกระจาย (พิสัย ส่วนเบี่ยงเบนมาตรฐาน ความแปรปรวน)", "- การนำเสนอข้อมูลเชิงคุณภาพและเชิงปริมาณ", "- การแปลความหมายของค่าสถิติ"]}, "ค ๓.๒": {"ม.๓": ["ความน่าจะเป็น", "- เหตุการณ์จากการทดลองสุ่ม", "- ความน่าจะเป็น", "- การนำความรู้เกี่ยวกับความน่าจะเป็นไปใช้ในชีวิตจริง"], "ม.๔": ["หลักการนับเบื้องต้น", "- หลักการบวกและการคูณ", "- การเรียงสับเปลี่ยนเชิงเส้นกรณีที่สิ่งของแตกต่างกันทั้งหมด", "- การจัดหมู่กรณีที่สิ่งของแตกต่างกันทั้งหมด", "ความน่าจะเป็น", "- การทดลองสุ่มและเหตุการณ์", "- ความน่าจะเป็นของเหตุการณ์"]}, "จำนวนและพีชคณิต ๑": {"ม.๔": ["เซต", "- ความรู้เบื้องต้นและสัญลักษณ์พื้นฐานเกี่ยวกับเซต", "- ยูเนียน อินเตอร์เซกชัน และคอมพลีเมนต์ของเซต", "ตรรกศาสตร์", "- ประพจน์และตัวเชื่อม", "- ประโยคที่มีตัวบ่งปริมาณตัวเดียว", "- การอ้างเหตุผล", "จำนวนจริงและพหุนาม", "- จำนวนจริงและสมบัติของจำนวนจริง", "- ค่าสัมบูรณ์ของจำนวนจริงและสมบัติของค่าสัมบูรณ์ของจำนวนจริง", "- จำนวนจริงในรูปกรณฑ์ และจำนวนจริงในรูปเลขยกกำลัง"], "ม.๕": ["จำนวนเชิงซ้อน", "- จำนวนเชิงซ้อนและสมบัติของจำนวนเชิงซ้อน", "- จำนวนเชิงซ้อนในรูปเชิงขั้ว", "- รากที่ n ของจำนวนเชิงซ้อน เมื่อ n เป็นจำนวนนับที่มากกว่า ๑"]}, "จำนวนและพีชคณิต ๒": {"ม.๔": ["ฟังก์ชัน", "- การบวก การลบ การคูณ การหารฟังก์ชัน", "- ฟังก์ชันประกอบ", "- ฟังก์ชันผกผัน", "ฟังก์ชันเอกซ์โพเนนเชียลและฟังก์ชันลอการิทึม", "- ฟังก์ชันเอกซ์โพเนนเชียล", "- ฟังก์ชันลอการิทึม"], "ม.๕": ["ฟังก์ชันตรีโกณมิติ", "- ฟังก์ชันตรีโกณมิติ", "- ฟังก์ชันตรีโกณมิติผกผัน"], "ม.๖": ["ลำดับและอนุกรม", "- ลำดับจำกัดและลำดับอนันต์", "- ลำดับเลขคณิตและลำดับเรขาคณิต", "- ลิมิตของลำดับอนันต์", "- อนุกรมจำกัดและอนุกรมอนันต์", "- อนุกรมเลขคณิตและอนุกรมเรขาคณิต", "- ผลบวกอนุกรมอนันต์", "- การนำความรู้เกี่ยวกับลำดับและอนุกรมไปใช้ในการแก้ปัญหามูลค่าของเงินและค่ารายงวด"]}, "จำนวนและพีชคณิต ๓": {"ม.๔": ["จำนวนจริงและพหุนาม", "- ตัวประกอบของพหุนาม", "- สมการและอสมการพหุนาม", "- สมการและอสมการเศษส่วนของพหุนาม", "- สมการและอสมการค่าสัมบูรณ์ของพหุนาม", "ฟังก์ชันเอกซ์โพเนนเชียลและฟังก์ชันลอการิทึม", "- สมการเอกซ์โพเนนเชียลและสมการลอการิทึม"], "ม.๕": ["ฟังก์ชันตรีโกณมิติ", "- เอกลักษณ์และสมการตรีโกณมิติ", "- กฎของโคไซน์และกฎของไซน์", "เมทริกซ์", "- เมทริกซ์และเมทริกซ์สลับเปลี่ยน", "- การบวกเมทริกซ์ การคูณเมทริกซ์กับจำนวนจริง การคูณระหว่างเมทริกซ์", "- ดีเทอร์มิแนนต์", "- เมทริกซ์ผกผัน", "- การแก้ระบบสมการเชิงเส้นโดยใช้เมทริกซ์", "จำนวนเชิงซ้อน", "- สมการพหุนามตัวแปรเดียว"]}, "การวัดและเรขาคณิต ๑": {"ม.๔": ["เรขาคณิตวิเคราะห์", "- จุดและเส้นตรง", "- วงกลม", "- พาราโบลา", "- วงรี", "- ไฮเพอร์โบลา"]}, "การวัดและเรขาคณิต ๒": {"ม.๕": ["เวกเตอร์ในสามมิติ", "- เวกเตอร์ นิเสธของเวกเตอร์", "- การบวก การลบเวกเตอร์ การคูณเวกเตอร์ด้วยสเกลาร์", "- ผลคูณเชิงสเกลาร์ ผลคูณเชิงเวกเตอร์"]}, "สถิติและความน่าจะเป็น ๑": {"ม.๕": ["หลักการนับเบื้องต้น", "- หลักการบวกและการคูณ", "- การเรียงสับเปลี่ยน", "    o การเรียงสับเปลี่ยนเชิงเส้น", "    o การเรียงสับเปลี่ยนเชิงวงกลม", "    กรณีที่สิ่งของแตกต่างกันทั้งหมด", "- การจัดหมู่กรณีที่สิ่งของแตกต่างกันทั้งหมด", "- ทฤษฎีบททวินาม", "ความน่าจะเป็น", "- การทดลองสุ่มและเหตุการณ์", "- ความน่าจะเป็นของเหตุการณ์"], "ม.๖": ["การแจกแจงความน่าจะเป็นเบื้องต้น", "- การแจกแจงเอกรูป", "- การแจกแจงทวินาม", "- การแจกแจงปกติ"]}, "แคลคูลัส ๑": {"ม.๖": ["แคลคูลัสเบื้องต้น", "- ลิมิตและความต่อเนื่องของฟังก์ชัน", "- อนุพันธ์ของฟังก์ชันพีชคณิต", "- ปริพันธ์ของฟังก์ชันพีชคณิต"]}};
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
      extra, grade, content:((PLAN_CONTENT[s.c] || {})[grade]) || [], note:g.n || "",
      title: extra ? `เพิ่มเติม · สาระ${s.c}` : `${s.c} · สาระ${s.s}`,
      desc: s.d,
      items: g.i.map((text,i)=>({ key:`${s.k}|${s.c}|${i}`, code: extra ? `${grade}/${plNum(i+1)}` : `${s.c} ${grade}/${plNum(i+1)}`, text, grade }))
    });
  });
  return { secs, none };
}

/* =====================================================================
   ตัวเลือกตัวชี้วัดแบบ "ค้นหาได้ + กรองตามชั้น" ใช้ร่วมกัน: แผนการสอน / แบบฝึกหัด / สร้างข้อสอบ
   cfg = { sel(grade)→Set, cur()→ชั้นที่เครื่องมือใช้อยู่, setGrade(g), save?(), after() }
   ===================================================================== */
const kiNorm = s => plNum(String(s ?? "")).toLowerCase().replace(/\s+/g, " ").trim();
const kiTerms = q => kiNorm(q).split(" ").filter(Boolean);
let kiAllC = null;
function kiAll(){
  if(kiAllC) return kiAllC;
  kiAllC = [];
  PLAN_GROUPS.forEach(g => g.grades.forEach(gr => plBuild(gr).secs.forEach(s => kiAllC.push(s))));
  return kiAllC;
}
function kiHay(it, s){ return it._h || (it._h = kiNorm([it.code, it.text, s.title, s.desc, (s.content || []).join(" ")].join(" "))); }
function kiPick(s, terms){ return terms.length ? s.items.filter(it => { const h = kiHay(it, s); return terms.every(t => h.includes(t)); }) : s.items; }
/* สาระการเรียนรู้แกนกลางของมาตรฐานที่มีตัวชี้วัดถูกเลือก → บรรทัดสำหรับใส่ใน Prompt */
function kiContentLines(secs, sel){
  const out = [];
  secs.forEach(s => {
    if(!s.content || !s.content.length || !s.items.some(it => sel.has(it.key))) return;
    out.push(`[${s.title}]`); s.content.forEach(l => out.push("  " + l));
  });
  return out;
}
function kiShell(st){
  const opt = (g, t) => `<option value="${g}"${st.g === g ? " selected" : ""}>${t}</option>`;
  const sel = `<select class="ki-gsel" aria-label="เลือกระดับชั้น">${opt("", "ทุกระดับชั้น")}`
    + PLAN_GROUPS.map(g => `<optgroup label="${g.title}">${g.grades.map(x => opt(x, x)).join("")}</optgroup>`).join("") + `</select>`;
  return `<div class="ki-bar"><div class="ki-row"><input type="search" class="ki-q" value="${escH(st.q)}" placeholder="🔍 ค้นหา เช่น เมทริกซ์ เศษส่วน พื้นที่ ค.ร.น." autocomplete="off" enterkeyhint="search">${sel}</div></div><div class="ki-list"></div>`;
}
function kiList(st, cfg){
  const terms = kiTerms(st.q); let html = "", shown = 0;
  kiAll().forEach((s, si) => {
    if(st.g && s.grade !== st.g) return;
    const items = kiPick(s, terms);
    if(terms.length && !items.length) return;
    if(!st.g && !s.items.length) return;
    const sel = cfg.sel(s.grade), every = items.length > 0 && items.every(it => sel.has(it.key));
    const head = `<div class="pl-sh"><div><b>${st.g ? "" : `<em class="ki-gb">${escH(s.grade)}</em>`}${escH(s.title)}</b><small>${escH(s.desc)}</small></div>`
      + (items.length ? `<button type="button" class="ki-all" data-si="${si}">${every ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}</button>` : "") + `</div>`;
    const body = items.length
      ? items.map(it => `<label class="pl-it${sel.has(it.key) ? " on" : ""}"><input type="checkbox" data-ik="${escH(it.key)}" data-ig="${escH(it.grade)}"${sel.has(it.key) ? " checked" : ""}><span class="pl-box"></span><span class="pl-tx"><i>${escH(it.code)}</i>${escH(it.text)}</span></label>`).join("")
      : `<div class="tl-sub pl-none">ไม่มีตัวชี้วัดที่วัดผลในชั้นนี้ ${escH(s.note)}</div>`;
    const cont = s.content && s.content.length
      ? `<details class="ki-ct"><summary>สาระการเรียนรู้แกนกลาง</summary>${s.content.map(l => `<div class="${/^\s*(?:-|o)\s/.test(l) ? "b" : "h"}">${escH(l.trim())}</div>`).join("")}</details>` : "";
    shown += items.length;
    html += `<div class="pm-sec">${head}${body}${cont}</div>`;
  });
  if(!html) return `<div class="tl-sub ki-empty">ไม่พบตัวชี้วัดที่ตรงกับ “${escH(st.q)}”${st.g ? " ในชั้น " + escH(st.g) : ""} — ลองเปลี่ยนคำค้น หรือกด “ทั้งหมด”</div>`;
  return (terms.length ? `<div class="tl-sub ki-cnt">พบ ${plNum(shown)} ตัวชี้วัด${st.g ? " (ชั้น " + escH(st.g) + ")" : " (ทุกชั้น)"}</div>` : "") + html;
}
function kiSet(cfg, grade, keys, on){
  if(cfg.cur() !== grade){ cfg.setGrade(grade); say("สลับเป็นชั้น " + grade); }
  const sel = cfg.sel(grade); keys.forEach(k => on ? sel.add(k) : sel.delete(k));
  if(cfg.save) cfg.save();
  cfg.after();
}
function kiMount(body, st, cfg){
  body._ki = { st, cfg };
  body.innerHTML = kiShell(st);
  body._kiRedraw = () => { const l = $(".ki-list", body); if(l) l.innerHTML = kiList(body._ki.st, body._ki.cfg); };
  if(!body._kiBound){
    body._kiBound = true;
    body.addEventListener("input", e => { if(e.target.classList && e.target.classList.contains("ki-q")){ body._ki.st.q = e.target.value; body._kiRedraw(); } });
    body.addEventListener("change", e => {
      if(e.target.classList && e.target.classList.contains("ki-gsel")){ body._ki.st.g = e.target.value; body._kiRedraw(); }
    });
    body.addEventListener("click", e => {
      const { st, cfg } = body._ki;
      const al = e.target.closest(".ki-all");
      if(al){
        const s = kiAll()[+al.dataset.si], items = kiPick(s, kiTerms(st.q)), sel = cfg.sel(s.grade);
        kiSet(cfg, s.grade, items.map(it => it.key), !items.every(it => sel.has(it.key)));
        body._kiRedraw();
      }
    });
    body.addEventListener("change", e => {
      const cb = e.target.closest("input[data-ik]"); if(!cb) return;
      kiSet(body._ki.cfg, cb.dataset.ig, [cb.dataset.ik], cb.checked);
      cb.closest(".pl-it").classList.toggle("on", cb.checked);
      const sec = cb.closest(".pm-sec"), b = sec && $(".ki-all", sec);
      if(b) b.textContent = [...sec.querySelectorAll("input[data-ik]")].every(x => x.checked) ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด";
    });
  }
  body._kiRedraw();
}
const kiStyle = document.createElement("style");
kiStyle.id = "kiCss";
kiStyle.textContent = `
.ki-bar{position:sticky; top:-8px; z-index:3; margin:0 -16px 6px; padding:10px 16px 8px; background:#fff; border-bottom:1px solid #EEF1F8;}
.ki-row{display:flex; flex-wrap:wrap; gap:8px; align-items:stretch;}
.ki-q{flex:1 1 200px; min-width:0; box-sizing:border-box; padding:11px 14px; border:1.5px solid #E1E7F3; border-radius:14px; font:inherit; font-size:15px; background:#fff; color:var(--ink);}
.ki-q:focus,.ki-gsel:focus{outline:none; border-color:var(--c-main); box-shadow:0 0 0 3px var(--c-bg);}
.ki-gsel{flex:0 1 150px; min-width:120px; box-sizing:border-box; padding:11px 12px; border:1.5px solid var(--c-main); border-radius:14px; font:inherit; font-size:15px; font-weight:600; background:#fff; color:var(--ink); cursor:pointer;}
.ki-chip.on{background:var(--c-main); border-color:var(--c-main); color:var(--c-on);}
.ki-all{flex:0 0 auto; padding:5px 10px; border-radius:12px; border:1.5px solid var(--c-main); background:transparent; color:var(--c-ink); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;}
.ki-gb{font-style:normal; display:inline-block; padding:1px 7px; margin-right:5px; border-radius:8px; background:var(--c-bg); color:var(--c-ink); font-size:12.5px;}
.ki-ct{margin-top:8px; font-size:12.5px; color:var(--ink-soft);}
.ki-ct summary{cursor:pointer; font-weight:600; color:var(--c-ink);}
.ki-ct .h{font-weight:600; margin-top:5px; color:var(--ink);}
.ki-ct .b{padding-left:10px; line-height:1.55;}
.ki-cnt{margin:6px 2px 0;} .ki-empty{padding:26px 6px; text-align:center;}
html[data-theme="dark"] .ki-bar,html[data-theme="black"] .ki-bar{background:#171b2b; border-color:#2c3450;}
html[data-theme="dark"] .ki-q,html[data-theme="black"] .ki-q,html[data-theme="dark"] .ki-gsel,html[data-theme="black"] .ki-gsel,html[data-theme="dark"] .ki-chip,html[data-theme="black"] .ki-chip{background:#1d2233; border-color:#2c3450;}
html[data-theme="dark"] .ki-chip.on,html[data-theme="black"] .ki-chip.on{background:var(--c-main); border-color:var(--c-main);}
html[data-theme="dark"] .ki-all,html[data-theme="black"] .ki-all,html[data-theme="dark"] .ki-ct summary,html[data-theme="black"] .ki-ct summary{color:#9DBBFF;}
`;
document.head.appendChild(kiStyle);
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
    if(e.target.closest("#plClear")){ plSel().clear(); if(pm.body._kiRedraw) pm.body._kiRedraw(); plUpdate(); }
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
  pmOpen("ind", "เลือกตัวชี้วัด", `<span id="plCount"></span><button type="button" id="plClear">ล้าง</button><button type="button" class="pm-done" id="pmDone">เสร็จสิ้น</button>`, "");
  kiMount(pm.body, { q:"", g:PL.grade || "" }, {
    sel: g => PL.sel[g] || (PL.sel[g] = new Set()), cur: () => PL.grade,
    setGrade: g => { PL.grade = g; plRender(); }, after: () => plUpdate()
  });
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
  it.textContent = !g ? "แตะเพื่อเลือก (ค้นหาได้ทุกชั้น)" : picked.length ? `เลือกแล้ว ${plNum(picked.length)} ตัวชี้วัด` : "แตะเพื่อเลือก";
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
  const kcn = kiContentLines(PL.secs, sel);
  if(kcn.length){
    L.push("## สาระการเรียนรู้แกนกลาง (กรอบเนื้อหาตามหลักสูตรของตัวชี้วัดที่เลือก)");
    L.push("ใช้เป็นกรอบในการเลือกสาระการเรียนรู้/เนื้อหาที่สอน ห้ามออกนอกกรอบนี้ และเลือกเฉพาะหัวข้อที่ตรงกับเรื่องที่สอนและจำนวนชั่วโมง (ไม่ต้องนำมาทั้งหมด)");
    kcn.forEach(x => L.push(x));
    L.push("");
  }
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
      <button type="button" class="pl-pick" id="plPickInd"><small>ตัวชี้วัด</small><b id="plIndTxt">แตะเพื่อเลือก (ค้นหาได้ทุกชั้น)</b><i>›</i></button>
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
const exAnsOn = () => EX.v.ansGen !== "no";
const EX_LAY = ["perPage","cols","lines","lh","lstyle","theme","title","head","gcoord"];
const EX_THEMES = [["plain","แบบปกติ","แบบปกติ"],["stitch","ตะเข็บผ้า (ขอบเย็บ + กระดุม)","ตะเข็บผ้า"],["note","โน้ตติดเทป (เงาเหลี่ยม + เทปกาว)","โน้ตติดเทป"],["cloud","ก้อนเมฆ (เลขข้อรูปเมฆ ขอบการ์ดปกติ)","ก้อนเมฆ"],["animal","สัตว์น่ารัก (เลขข้อมีหูสัตว์ + หน้าสัตว์/รอยเท้าตามขอบ)","สัตว์"],["flower","ดอกไม้ (เลขข้อเป็นกลีบดอกไม้ + ดอกไม้/ผีเสื้อ/เถาวัลย์ตามขอบ)","ดอกไม้"]];
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
    <button type="button" class="pl-pick" id="exPickInd"><small>ตัวชี้วัด</small><b id="exIndTxt">แตะเพื่อเลือก (ค้นหาได้ทุกชั้น)</b><i>›</i></button>
    <div id="exSum"></div>
    <div style="margin-top:12px;">
      ${exIn("topic", "สร้างโจทย์เรื่อง", "เช่น จุดกึ่งกลางของส่วนของเส้นตรง · การบวกลบเศษส่วน · สมการเชิงเส้นตัวแปรเดียว")}
      <div class="pf-2">
        <div class="field"><label>จำนวนข้อทั้งหมด (พิมพ์เองได้ 4–100)</label><input type="number" inputmode="numeric" min="4" max="100" step="1" data-ef="count" value="${escH(EX.v.count ?? 18)}"></div>
        ${exSelect("work", "ลักษณะโจทย์", [["much","ต้องแสดงวิธีทำทุกข้อ"],["mid","ผสม (วิธีทำ + ตอบสั้น)"],["low","ตอบสั้น/เติมคำตอบ"]], "much")}
      </div>
      <div class="ex-ag" id="exAg">
        <i class="sp s1">✦</i><i class="sp s2">✧</i><i class="sp s3">✦</i>
        <div class="ex-ag-t"><span class="ex-shim">✨ ให้ AI สร้างเฉลยด้วยไหม?</span></div>
        <div class="ex-ag-b">
          <button type="button" data-eag="yes" aria-pressed="${exAnsOn()}" class="${exAnsOn() ? "on" : ""}"><b>✅ สร้างเฉลย</b><small>AI เขียนวิธีทำทุกข้อ · พิมพ์ PDF แบบเฉลยได้</small></button>
          <button type="button" data-eag="no" aria-pressed="${!exAnsOn()}" class="${exAnsOn() ? "" : "on"}"><b>🚫 ไม่ต้องมีเฉลย</b><small>ได้เฉพาะโจทย์ · Prompt สั้นลง ตอบเร็วขึ้น</small></button>
        </div>
      </div>
      <div class="pf-2">
        ${exSelect("gmode", "รูปแบบโจทย์: ข้อความ / กราฟ", [["none","โจทย์ข้อความอย่างเดียว"],["some","ผสม — บางข้อมีกราฟประกอบ"],["all","ทุกข้อมีกราฟประกอบโจทย์"]], "none")}
        <div id="exGaWrap" style="${(EX.v.gmode || "none") === "none" || !exAnsOn() ? "display:none;" : ""}">${exSelect("gans", "กราฟในเฉลย", [["no","ไม่ต้องมีกราฟในเฉลย"],["yes","มีกราฟในเฉลย (เฉพาะข้อที่ช่วยอธิบาย)"]], "no")}${exSelect("gcoord", "พิกัดของจุดบนกราฟ", [["show","แสดงพิกัดทุกจุดที่มีชื่อ เช่น A(2, 1)"],["cmd","ตามคำสั่งของ AI (pt = ชื่ออย่างเดียว)"]], "show")}</div>
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
    <div class="ex-work" id="exWork"><div class="ex-left">
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
    </div><div class="ex-right"><div class="ex-pvbar"><b>ตัวอย่างใบงาน</b></div>
    <div class="tl-sub" id="exStat" style="margin-top:8px;"></div>
    <label class="mg-sw ex-ansrow" id="exAnsRow" style="display:none;"><input type="checkbox" id="exAns"${EX.v.showAns ? " checked" : ""}><span><b>เฉลย</b> — ติ๊กเพื่อแสดงเฉลยพร้อมวิธีทำในแต่ละข้อ (ใช้ทำ PDF แบบเฉลย) <small id="exAnsHint"></small></span></label>
    <label class="mg-sw ex-ansrow" id="exDecoRow"><input type="checkbox" id="exDeco"${EX.v.deco === false ? "" : " checked"}><span><b>ตกแต่งขอบกระดาษ</b> — ใส่ลายสีสันรอบขอบหน้า แตกต่างกันตามรูปแบบใบงาน (ก้อนเมฆ / ตะเข็บผ้า / โน้ตติดเทป / ปกติ)</span></label>
    <div class="ex-pv" id="exPv" style="display:none;"><iframe id="exFrame" title="ตัวอย่างใบงาน" tabindex="-1" sandbox="allow-scripts"></iframe></div>
    <button type="button" class="ex-pdf" id="exPrint" style="display:none;"><i class="sp s1">✦</i><i class="sp s2">✦</i><i class="sp s3">✧</i><i class="sp s4">✦</i><span class="ex-pdf-ic"><svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2.8h7.2L19.2 8v12.2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1z"/><path d="M14.2 2.8V8h5"/><path d="M12.6 11.2v6.2M9.9 14.8l2.7 2.7 2.7-2.7"/></svg></span><span class="ex-pdf-tx"><span id="exPdfT">ทำเป็น PDF</span><small id="exPdfS">พิมพ์ / บันทึกเป็นไฟล์ PDF</small></span></button>
    </div></div>
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
    if(e.target.closest("#exmClear")){ exSelSet().clear(); if(exm.body._kiRedraw) exm.body._kiRedraw(); exUpdate(); exSave(); }
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
  exmOpen("ind", "เลือกตัวชี้วัด", `<span id="exCount"></span><button type="button" id="exmClear">ล้าง</button><button type="button" class="pm-done" id="exmDone">เสร็จสิ้น</button>`, "");
  kiMount(exm.body, { q:"", g:EX.grade || "" }, {
    sel: g => EX.sel[g] || (EX.sel[g] = new Set()), cur: () => EX.grade,
    setGrade: g => { EX.grade = g; exRender(); }, save: () => exSave(), after: () => exUpdate()
  });
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
  $("#exIndTxt", ex.view).textContent = !g ? "แตะเพื่อเลือก (ค้นหาได้ทุกชั้น)" : picked.length ? `เลือกแล้ว ${plNum(picked.length)} ตัวชี้วัด` : "แตะเพื่อเลือก (ไม่เลือกก็ได้)";
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
  const wa = exAnsOn();
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
  L.push(`งานของคุณ: สร้างโจทย์แบบฝึกหัด ${n} ข้อ เรียงจากง่ายไปยากต่อเนื่องตลอดทุกข้อ ${wa ? "พร้อมเฉลยแบบแสดงวิธีทำ" : "(ไม่ต้องสร้างเฉลย)"} (ระบบของครูจะจัดหน้ากระดาษและเส้นสำหรับเขียนวิธีทำให้เอง คุณไม่ต้องคิดเรื่องบรรทัดหรือหน้ากระดาษ)`);
  L.push("");
  L.push("# ข้อมูลจากครู");
  L.push(`- ระดับชั้น: ${g || "[ครูกรอก: ระดับชั้น]"}`);
  L.push(`- เรื่องที่ออกโจทย์: ${topic || "[ครูกรอก: เรื่อง]"}`);
  L.push(`- จำนวนข้อ: ${n} ข้อ`);
  L.push(`- เฉลย: ${wa ? "ให้สร้างเฉลยแบบแสดงวิธีทำทุกข้อ ต่อท้ายหลังโจทย์" : "ไม่ต้องสร้างเฉลย (ครูไม่ต้องการ) ส่งเฉพาะโจทย์"}`);
  L.push(`- ลักษณะโจทย์: ${wkTxt}`);
  if(picked.length){
    L.push("");
    L.push("## ขอบเขต: ตัวชี้วัดที่ครูเลือก (โจทย์ทุกข้อต้องอยู่ในขอบเขตนี้ ห้ามออกเกินตัวชี้วัดหรือเกินระดับชั้น)");
    EX.secs.forEach(s=>{
      const r = s.items.filter(it=>sel.has(it.key)); if(!r.length) return;
      L.push(`[${s.title}]`); r.forEach(it=>L.push(`${it.code} ${it.text}`));
    });
    const kcn = kiContentLines(EX.secs, sel);
    if(kcn.length){ L.push(""); L.push("## สาระการเรียนรู้แกนกลางของตัวชี้วัดข้างต้น (กรอบเนื้อหา — ออกโจทย์เฉพาะส่วนที่ตรงกับเรื่องที่ระบุ ห้ามออกนอกกรอบ)"); kcn.forEach(x => L.push(x)); }
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
    L.push("- เส้นกราฟต้องผ่านจุดที่ระบุจริง ให้แทนพิกัดทุกจุดลงในสมการตรวจก่อนส่ง" + (wa ? " และเฉลยต้องสอดคล้องกับกราฟ" : ""));
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
    if(wa) L.push(v.gans === "yes"
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
  if(wa){
  L.push("  ท้ายสุด: บรรทัด ANSWERS แล้วตามด้วยเฉลยแบบ “แสดงวิธีทำ” ข้อละ ๑ บรรทัด ในรูป:  เลขข้อ | ขั้นที่ ๑ // ขั้นที่ ๒ // ตอบ …  (เฉลยต้องคำนวณถูกต้อง ตรวจซ้ำก่อนส่ง)");
  L.push("    - เฉลยแต่ละข้อแสดงวิธีทำเป็นขั้นตอน ๒–๕ ขั้น คั่นแต่ละขั้นด้วย // (เว็บจะขึ้นบรรทัดใหม่ให้เอง) และขั้นสุดท้ายขึ้นต้นด้วยคำว่า “ตอบ” ตามด้วยคำตอบ");
  L.push("    - วางโครงก่อนเขียน: จัดกลุ่มข้อที่วิธีทำเหมือนกัน (เช่น ข้อ 1–3) แล้วกำหนด “โครงวิธีทำ” ของกลุ่มนั้น ๑ แบบ (จำนวนขั้น ลำดับขั้น และถ้อยคำเหมือนกันทุกข้อในกลุ่ม) จากนั้นเขียนเฉลยแต่ละข้อโดยเปลี่ยนเฉพาะตัวเลข/ค่าที่แทนลงไปตามโจทย์ข้อนั้น ผลคำนวณทุกขั้นต้องคิดใหม่ให้ถูกต้องตามตัวเลขของข้อนั้น");
  L.push("    - ห้ามเขียนลัดว่า “ทำเหมือนข้อ 1” “ทำนองเดียวกัน” หรือ “ดังข้างต้น” ต้องเขียนวิธีทำเต็มทุกข้อ เพราะเว็บพิมพ์เฉลยแยกไว้ในการ์ดของแต่ละข้อ");
  L.push("    - เฉลยจะถูกพิมพ์ในการ์ดเล็ก ให้กระชับ: ขั้นละไม่เกินประมาณ ๕๐ ตัวอักษร รวมไม่เกิน ๕ ขั้น (โจทย์ปัญหาท้ายชุดไม่เกิน ๖ ขั้น)");
  L.push("    - ข้อที่วิธีทำต่างออกไป (เช่น โจทย์ปัญหา หาค่าที่ไม่ทราบ) ให้เขียนวิธีทำของข้อนั้นเอง");
  L.push("    - เฉลยแต่ละข้อต้องอยู่ในบรรทัดเดียว (ห้ามขึ้นบรรทัดจริง ใช้ // แทน) ห้ามใช้เครื่องหมาย | ในเนื้อเฉลย ใส่สูตรใน $...$ เหมือนโจทย์ และไม่ใช้ Markdown");
  }else{
  L.push("  ไม่ต้องสร้างเฉลย: ห้ามมีบรรทัด ANSWERS และห้ามใส่เฉลยหรือวิธีทำในคำตอบทุกกรณี ส่งเฉพาะ TITLE, INSTR และโจทย์เท่านั้น");
  }
  L.push("");
  L.push("ตัวอย่างรูปแบบเท่านั้น (ห้ามลอกเนื้อหา):");
  L.push("TITLE: แบบฝึกหัดที่ 1");
  L.push("INSTR: จงแสดงวิธีหาจุดกึ่งกลางของส่วนของเส้นตรงที่กำหนดจุดปลายต่อไปนี้");
  L.push("1 | $A(0,0)$ และ $B(2,4)$");
  L.push("2 | $A(2,2)$ และ $B(6,4)$");
  L.push("3 | $A(-2,3)$ และ $B(4,-1)$");
  L.push("4 | จุดกึ่งกลางของ $AB$ คือ $M(3,2)$ และ $A(1,-2)$ จงหาพิกัดจุด $B$");
  if(wa){
  L.push("ANSWERS");
  L.push("1 | $M=\\left(\\frac{0+2}{2},\\frac{0+4}{2}\\right)$ // $M=(1,2)$ // ตอบ $(1,2)$");
  L.push("2 | $M=\\left(\\frac{2+6}{2},\\frac{2+4}{2}\\right)$ // $M=(4,3)$ // ตอบ $(4,3)$");
  L.push("3 | $M=\\left(\\frac{-2+4}{2},\\frac{3+(-1)}{2}\\right)$ // $M=(1,1)$ // ตอบ $(1,1)$");
  L.push("4 | ให้ $B(x,y)$ // $\\frac{1+x}{2}=3$ จะได้ $x=5$ // $\\frac{-2+y}{2}=2$ จะได้ $y=6$ // ตอบ $B(5,6)$");
  L.push("(ตัวอย่างข้อ 1–3 วิธีทำแบบเดียวกัน จึงใช้ฟอร์มเดิมเปลี่ยนเลข ส่วนข้อ 4 วิธีต่างออกไป)");
  }
  L.push("");
  L.push("# การเขียนสูตรและสมการ (สำคัญ — เว็บจะแปลง $...$ เป็นสมการตอนสร้างใบงาน)");
  L.push("- สัญลักษณ์ทางคณิตศาสตร์ที่ไม่ใช่ตัวเลขธรรมดา ต้องอยู่ใน $...$ ทั้งก้อน เช่น นิพจน์ สมการ อสมการ เศษส่วน ยกกำลัง ราก เซต คู่อันดับ ตัวแปร ส่วนข้อความภาษาไทยอยู่นอก $ เสมอ");
  L.push("- ใช้ x^{2} สำหรับยกกำลัง \\frac{a}{b} สำหรับเศษส่วน \\sqrt{x} สำหรับราก \\times \\div \\leq \\geq \\neq \\in \\cup \\cap \\emptyset  และใช้ \\{ \\} สำหรับวงเล็บปีกกาของเซต ห้ามใช้ ^ / ² ³ ≠ ≥ ≤ × ÷ นอก $...$ ห้ามใช้ \\( \\) หรือ \\[ \\]");
  L.push("- ตัวเลขธรรมดาที่ไม่ใช่สมการ (เช่น จำนวนคน 12 คน) เขียนนอก $ ได้ และห้ามใช้เครื่องหมาย $ กับเรื่องอื่น เช่น จำนวนเงิน");
  L.push("- ตรวจก่อนส่ง: ทุก $ ที่เปิดมีตัวปิดครบ และโจทย์ทุกข้อคำนวณได้คำตอบที่ชัดเจนเพียงคำตอบเดียว");
  L.push("");
  L.push("# ก่อนส่งให้ตรวจตนเอง");
  L.push(`(1) มีครบ ${n} ข้อ และยากขึ้นตามลำดับ (2) ทุกข้ออยู่ในขอบเขตเรื่อง/ตัวชี้วัด/ระดับชั้นที่ครูกำหนด (3) ใช้รูปแบบ “เลขข้อ | โจทย์” ครบทุกบรรทัด และไม่มีเส้น/จุดสำหรับเขียนตอบ (4) ไม่มีข้อความนอก code block (5) ไม่มีข้อที่ขึ้นต้นด้วยคำสั่งซ้ำกับ INSTR (ยกเว้นข้อที่คำสั่งต่างออกไป เช่น หาตัวแปร/โจทย์ปัญหา)${wa ? " (6) ANSWERS มีครบทุกข้อ แสดงวิธีทำ คั่นขั้นด้วย // อยู่ในบรรทัดเดียว ลงท้ายด้วย “ตอบ” ไม่มีข้อที่เขียนลัดว่าทำเหมือนข้ออื่น และตัวเลขทุกขั้นถูกต้อง" : ""}`);
  if(gm !== "none") L.push(`(${wa ? 7 : 6}) ทุกคำสั่งกราฟเปิด [[G: และปิด ]] ครบ มี range เป็นรายการแรก ไม่มี | หรือ // ภายใน จุดที่ระบุอยู่บนเส้นกราฟจริง และไม่บอกคำตอบที่ต้องอ่านจากกราฟในตัวโจทย์`);
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
        ? `<td class="q c${(((parseInt(it.n, 10) || (i + k + 1)) % 6) + 6) % 6}"><span class="no">${it.n}</span><div class="t">${exFmt(it.t, gc)}</div>${ans ? exAnsHtml(it, gc) : gr ? (nl > 0 ? `<div class="gr" style="--n:${Math.max(3, nl)}">${EX_GRIN}</div>` : "") : Array(nl).fill('<div class="dl"></div>').join("")}</td>`
        : `<td class="e"></td>`);
    }
    trs.push(`<tr>${tds.join("")}</tr>`);
  }
  return `<table class="g">${trs.join("")}</table>`;
}
const EX_GRIN_JS = '<i class="gx"><b>x</b></i><i class="gy"><b>y</b></i><i class="tx"></i><i class="ty"></i>';
/* ขอบก้อนเมฆแบบยืดตามขนาดการ์ด: สร้างจากครึ่งวงรีเรียงรอบ 4 ด้าน + พื้นกลาง (round = ปรับให้ลงตัวพอดีทุกด้าน) */
/* ชุดสีใบงาน: [สีหลัก, พื้นอ่อน, สีเส้นบรรทัด, สีเข้ม] — การ์ดข้อที่ n ใช้สีลำดับ n mod 6 (วนซ้ำ) */
const EX_PAL = [["E5484D","FFF1F1","F2A5A8","B3262B"],["F08C00","FFF5E3","F7C06B","B35F00"],["2F9E44","EDF8EF","8FD19E","1F7A32"],["1C7ED6","EAF4FD","8DC1F0","14589A"],["7048E8","F2EEFE","B7A2F5","4F2DB8"],["D6336C","FFEEF5","F29BBB","9C1F4D"]];
const EX_CLOUD_C = "%3Ccircle cx='45' cy='34' r='26'/%3E%3Ccircle cx='79' cy='35' r='21'/%3E%3Ccircle cx='95' cy='56' r='19'/%3E%3Ccircle cx='82' cy='76' r='17'/%3E%3Ccircle cx='46' cy='76' r='18'/%3E%3Ccircle cx='32' cy='56' r='19'/%3E%3Ccircle cx='64' cy='56' r='36'/%3E";
const exCloudSvg = (fill, edge) => "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='11 6 105 90'%3E%3Cg fill='%23" + edge + "' stroke='%23" + edge + "' stroke-width='3.2' stroke-linejoin='round'%3E" + EX_CLOUD_C + "%3C/g%3E%3Cg fill='%23" + fill + "'%3E" + EX_CLOUD_C + "%3C/g%3E%3C/svg%3E";
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
/* รูปแบบ: ก้อนเมฆ (เลขข้อเป็นก้อนเมฆใหญ่ขอบบาง เกยมุมการ์ด / ขอบการ์ดวิธีทำเป็นแบบปกติ) */
.th-cloud .t{text-indent:calc(9mm*var(--s));}
.th-cloud .no{border:0; border-radius:0; background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='11 6 105 90'%3E%3Cg fill='%23333' stroke='%23333' stroke-width='3.2' stroke-linejoin='round'%3E%3Ccircle cx='45' cy='34' r='26'/%3E%3Ccircle cx='79' cy='35' r='21'/%3E%3Ccircle cx='95' cy='56' r='19'/%3E%3Ccircle cx='82' cy='76' r='17'/%3E%3Ccircle cx='46' cy='76' r='18'/%3E%3Ccircle cx='32' cy='56' r='19'/%3E%3Ccircle cx='64' cy='56' r='36'/%3E%3C/g%3E%3Cg fill='%23fff'%3E%3Ccircle cx='45' cy='34' r='26'/%3E%3Ccircle cx='79' cy='35' r='21'/%3E%3Ccircle cx='95' cy='56' r='19'/%3E%3Ccircle cx='82' cy='76' r='17'/%3E%3Ccircle cx='46' cy='76' r='18'/%3E%3Ccircle cx='32' cy='56' r='19'/%3E%3Ccircle cx='64' cy='56' r='36'/%3E%3C/g%3E%3C/svg%3E") center / 100% 100% no-repeat; width:calc(14mm*var(--s)); height:calc(12mm*var(--s)); left:calc(-5.8mm*var(--s)); top:calc(-3.8mm*var(--s)); line-height:calc(12.4mm*var(--s)); font-size:calc(19pt*var(--s)); font-weight:600; z-index:2;}
/* ===== สีสันใบงาน (ทุกลวดลาย) ===== */
${EX_PAL.map((p, i) => `td.q.c${i}{--a:#${p[0]}; --b:#${p[1]}; --l:#${p[2]}; --k:#${p[3]};}`).join("\n")}
.pg td.q{border-color:var(--a,#111); background:var(--b,#fff);}
.pg td.q .no{background:var(--a,#111); border-color:var(--a,#111); color:#fff;}
.pg td.q .dl{border-bottom-color:var(--l,#666);}
.pg td.q .ans{border-top-color:var(--a,#111);}
.pg td.q .ans .al{background:var(--k,#111);}
.th-plain .tb{border-color:#1C7ED6; background:#EAF4FD; color:#14589A;}
.th-stitch .tb{border-color:#D6336C; background:#FFEEF5; color:#9C1F4D;}
.th-note .tb{border-color:#E8A400; background:#FFF3BF; color:#7A5200; box-shadow:calc(1.2mm*var(--s)) calc(1.2mm*var(--s)) 0 #E8A400;}
.th-cloud .tb{border-color:#1C7ED6; background:#D0EBFF; color:#14589A;}
.th-stitch td.q::before{border-color:var(--a,#111);}
.th-stitch td.q .no{outline-color:var(--a,#111);}
.th-note td.q{box-shadow:calc(1.5mm*var(--s)) calc(1.5mm*var(--s)) 0 var(--a,#111);}
.th-note td.q::before{border-color:var(--a,#111); background:repeating-linear-gradient(45deg,#fff 0 1.1mm,var(--l,#c9c9c9) 1.1mm 2.2mm);}
.th-note td.q .no{box-shadow:calc(.7mm*var(--s)) calc(.7mm*var(--s)) 0 var(--k,#111);}
.th-cloud td.q .no{background-color:transparent; color:#fff; text-shadow:0 0 .6mm var(--k,#333);}
.th-animal td.q{border-radius:calc(5mm*var(--s));}
.th-animal .tb{border-color:#F08C00; background:#FFF5E3; color:#B35F00;}
.th-animal .no::before,.th-animal .no::after{content:""; position:absolute; top:calc(-1.9mm*var(--s)); width:calc(3mm*var(--s)); height:calc(3mm*var(--s)); border-radius:50% 50% 25% 25%; background:var(--a,#111); border:1.1pt solid var(--a,#111);}
.th-animal .no::before{left:calc(-.1mm*var(--s)); transform:rotate(-18deg);}
.th-animal .no::after{right:calc(-.1mm*var(--s)); transform:rotate(18deg);}
.th-flower td.q{border-radius:calc(5mm*var(--s));}
.th-flower .tb{border-color:#D6336C; background:#FFEEF5; color:#9C1F4D;}
.th-flower .no{box-shadow:0 calc(-2.3mm*var(--s)) 0 calc(-1.1mm*var(--s)) var(--l,#f3a), 0 calc(2.3mm*var(--s)) 0 calc(-1.1mm*var(--s)) var(--l,#f3a), calc(-2.3mm*var(--s)) 0 0 calc(-1.1mm*var(--s)) var(--l,#f3a), calc(2.3mm*var(--s)) 0 0 calc(-1.1mm*var(--s)) var(--l,#f3a), calc(-1.7mm*var(--s)) calc(-1.7mm*var(--s)) 0 calc(-1.1mm*var(--s)) var(--l,#f3a), calc(1.7mm*var(--s)) calc(-1.7mm*var(--s)) 0 calc(-1.1mm*var(--s)) var(--l,#f3a), calc(-1.7mm*var(--s)) calc(1.7mm*var(--s)) 0 calc(-1.1mm*var(--s)) var(--l,#f3a), calc(1.7mm*var(--s)) calc(1.7mm*var(--s)) 0 calc(-1.1mm*var(--s)) var(--l,#f3a);}
.deco{position:absolute; left:0; top:0; width:210mm; height:297mm; z-index:0; pointer-events:none;}
.box{position:relative; z-index:1;}
${EX_PAL.map((p, i) => `.th-cloud td.q.c${i} .no{background-image:url("data:image/svg+xml,${exCloudSvg(p[0], p[3])}");}`).join("\n")}
`;
/* ===== ตกแต่งขอบกระดาษ: SVG หน่วย mm (A4 = 210x297) วางหลังการ์ด แต่ละรูปแบบมีลวดลายต่างกัน ===== */
const EX_DC = ["E5484D","F08C00","FAB005","2F9E44","15AABF","1C7ED6","7048E8","D6336C"];
const EX_DCD = ["B3262B","B35F00","C98B00","1F7A32","0D7C8F","14589A","4F2DB8","9C1F4D"];
const exRng = seed => { let a = (seed * 2654435761 + 1013904223) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const exN = n => Math.round(n * 100) / 100;
const dcStar = (x, y, r, rot, f, outline) => { let p = ""; for(let i = 0; i < 10; i++){ const a = (rot + i * 36 - 90) * Math.PI / 180, q = i % 2 ? r * 0.46 : r; p += (i ? "L" : "M") + exN(x + q * Math.cos(a)) + " " + exN(y + q * Math.sin(a)); }
  return outline ? `<path d="${p}Z" fill="none" stroke="#${f}" stroke-width=".5" stroke-linejoin="round"/>` : `<path d="${p}Z" fill="#${f}" stroke="#${f}" stroke-width=".35" stroke-linejoin="round"/>`; };
const dcSpark = (x, y, r, f) => { x = exN(x); y = exN(y); r = exN(r); return `<path d="M${x} ${exN(y-r)}Q${x} ${y} ${exN(x+r)} ${y}Q${x} ${y} ${x} ${exN(y+r)}Q${x} ${y} ${exN(x-r)} ${y}Q${x} ${y} ${x} ${exN(y-r)}Z" fill="#${f}"/>`; };
const dcDot = (x, y, r, f, op) => `<circle cx="${exN(x)}" cy="${exN(y)}" r="${exN(r)}" fill="#${f}"${op ? ` opacity="${op}"` : ""}/>`;
const dcHeart = (x, y, s, f, outline) => { const p = `M${exN(x)} ${exN(y+s*.9)}C${exN(x-s*1.6)} ${exN(y-s*.2)} ${exN(x-s*.7)} ${exN(y-s*1.1)} ${exN(x)} ${exN(y-s*.35)}C${exN(x+s*.7)} ${exN(y-s*1.1)} ${exN(x+s*1.6)} ${exN(y-s*.2)} ${exN(x)} ${exN(y+s*.9)}Z`;
  return outline ? `<path d="${p}" fill="none" stroke="#${f}" stroke-width=".5" stroke-linejoin="round"/>` : `<path d="${p}" fill="#${f}"/>`; };
const dcCloud = (x, y, s, f, e, face) => { const c = `<circle cx="-6" cy="0" r="5"/><circle cx="0.5" cy="-2.6" r="6.4"/><circle cx="7" cy="0" r="5"/><circle cx="-11" cy="3.3" r="3.2"/><circle cx="12" cy="3.3" r="3.2"/><rect x="-11" y="1.4" width="23" height="5.1" rx="2.5"/>`;
  const fc = face ? `<circle cx="-3" cy="1.4" r=".85" fill="#4A6FA5"/><circle cx="4" cy="1.4" r=".85" fill="#4A6FA5"/><path d="M-1.2 3.4Q.5 5 2.2 3.4" fill="none" stroke="#4A6FA5" stroke-width=".6" stroke-linecap="round"/><circle cx="-5.6" cy="3.5" r="1.1" fill="#FF8787" opacity=".5"/><circle cx="6.6" cy="3.5" r="1.1" fill="#FF8787" opacity=".5"/>` : "";
  return `<g transform="translate(${exN(x)} ${exN(y)}) scale(${s})"><g fill="#${e}" stroke="#${e}" stroke-width="1.6" stroke-linejoin="round">${c}</g><g fill="#${f}">${c}</g>${fc}</g>`; };
const dcPlanet = (x, y, r, f, d, ring) => { x = exN(x); y = exN(y); const rx = exN(r * 2), ry = exN(r * .52), sw = exN(r * .3); let s = "";
  if(ring) s += `<g transform="rotate(-22 ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="#${d}" stroke-width="${sw}" opacity=".85"/></g>`;
  s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#${f}"/><path d="M${exN(x-r*.9)} ${exN(y-r*.2)}Q${x} ${exN(y+r*.1)} ${exN(x+r*.9)} ${exN(y-r*.2)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="${exN(r*.22)}"/><path d="M${exN(x-r*.8)} ${exN(y+r*.45)}Q${x} ${exN(y+r*.75)} ${exN(x+r*.8)} ${exN(y+r*.45)}" fill="none" stroke="#${d}" stroke-opacity=".45" stroke-width="${exN(r*.18)}"/>${dcDot(x - r * .35, y - r * .4, r * .2, "FFFFFF", .5)}`;
  if(ring) s += `<g transform="rotate(-22 ${x} ${y})"><path d="M${exN(x-rx)} ${y}A${rx} ${ry} 0 0 0 ${exN(x+rx)} ${y}" fill="none" stroke="#${d}" stroke-width="${sw}"/></g>`;
  return s; };
const dcMoon = (x, y, r, f, rot) => `<path transform="rotate(${rot} ${exN(x)} ${exN(y)})" d="M${exN(x)} ${exN(y-r)}A${exN(r)} ${exN(r)} 0 0 0 ${exN(x)} ${exN(y+r)}A${exN(r*1.35)} ${exN(r*1.35)} 0 0 1 ${exN(x)} ${exN(y-r)}Z" fill="#${f}"/>`;
const dcOrbit = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#${c}" stroke-width=".35" stroke-dasharray="1 1.5" opacity=".75"/>`;
const dcCorners = [[9, 9], [201, 9], [9, 288], [201, 288]];
/* จุดกระจายตามแถบขอบกระดาษ 4 ด้าน (ไม่ล้ำเข้าพื้นที่การ์ด) */
function dcEdge(rn, gap){ const p = [];
  for(let y = 22 + rn() * 5; y < 276; y += gap * (.8 + rn() * .5)){ p.push([3.8 + rn() * 4.6, y, "l"]); }
  for(let y = 22 + rn() * 5; y < 276; y += gap * (.8 + rn() * .5)){ p.push([201.6 + rn() * 4.6, y, "r"]); }
  for(let x = 26 + rn() * 5; x < 184; x += gap * (.8 + rn() * .5)){ p.push([x, 3.4 + rn() * 3, "t"]); }
  for(let x = 26 + rn() * 5; x < 184; x += gap * (.8 + rn() * .5)){ p.push([x, 290 + rn() * 3, "b"]); }
  return p; }
function dcCloudTheme(rn, k){ let o = "";
  const kinds = ["saturn", "cloud", "planet", "moon"];
  dcCorners.forEach(([x, y], i) => { const kd = kinds[(i + k) % 4], dx = x < 105 ? 1 : -1;
    if(kd === "saturn") o += dcOrbit(x, y, 14, "F08C00") + dcPlanet(x, y, 4.2, "FAB005", "B35F00", true);
    else if(kd === "cloud") o += dcCloud(x + dx * 8.5, y + (y < 150 ? 4 : -3), .42, "F3F9FF", "74B3EE", false) + dcCloud(x, y, .56, "FFFFFF", "74B3EE", true) + dcSpark(x + dx * 12, y + (y < 150 ? -3 : 3), 1.8, "FAB005");
    else if(kd === "planet") o += dcOrbit(x, y, 13, "7048E8") + dcPlanet(x, y, 3.8, "9775FA", "4F2DB8", false) + dcDot(x + dx * 12.6, y + (y < 150 ? 3.4 : -3.4), 1.3, "FF8787");
    else o += dcMoon(x, y, 4.6, "FAB005", x < 105 ? 20 : -20) + dcStar(x + dx * 8, y + (y < 150 ? 5 : -5), 2.2, 0, "F08C00") + dcSpark(x + dx * 11, y + (y < 150 ? -2 : 2), 1.6, "15AABF"); });
  dcEdge(rn, 13).forEach(([x, y, sd], i) => { const c = EX_DC[(i * 3 + k + Math.floor(rn() * 8)) % 8], q = rn();
    if(q < .34) o += dcStar(x, y, 1.2 + rn() * .8, rn() * 72, c);
    else if(q < .58) o += dcSpark(x, y, 1.6 + rn() * .9, c);
    else if(q < .8) o += dcDot(x, y, .5 + rn() * .5, c);
    else if(q < .9) o += dcCloud(x, y, .26, "F3F9FF", "74B3EE", false);
    else o += dcPlanet(x, y, 1.3, c, EX_DCD[EX_DC.indexOf(c)], false); });
  return o; }
function dcStitchTheme(rn, k){ let o = ""; const pc = EX_PAL.map(p => p[0]), pd = EX_PAL.map(p => p[3]);
  pc.forEach((c, i) => { o += `<rect x="5.5" y="5.5" width="199" height="286" rx="7" fill="none" stroke="#${c}" stroke-width=".7" stroke-dasharray="2.2 11" stroke-dashoffset="${exN(i * 2.2)}"/>`; });
  const items = [];
  for(let x = 32 + rn() * 4; x < 180; x += 29) { items.push([x, 5.5], [x + 6, 291.5]); }
  for(let y = 32 + rn() * 4; y < 266; y += 29) { items.push([5.5, y], [204.5, y + 5]); }
  items.forEach(([x, y], i) => { const t = (i + k) % 4, ci = (i * 2 + k) % 6; o += dcDot(x, y, 3.5, "FFFFFF");
    if(t === 0){ for(let j = 0; j < 5; j++){ const a = j * 72 * Math.PI / 180; o += dcDot(x + 1.55 * Math.cos(a), y + 1.55 * Math.sin(a), 1.15, pc[ci]); } o += dcDot(x, y, .95, "FAB005"); }
    else if(t === 1) o += dcHeart(x, y, 1.9, pc[ci]);
    else if(t === 2) o += dcButton(x, y, 2.3, pc[ci], pd[ci]);
    else o += dcStar(x, y, 2.5, 0, pc[ci]); });
  dcCorners.forEach(([x, y], i) => { const x2 = x < 105 ? 8.5 : 201.5, y2 = y < 150 ? 8.5 : 288.5, ci = (i + k) % 6; o += dcDot(x2, y2, 5.2, "FFFFFF") + dcButton(x2, y2, 4.3, pc[ci], pd[ci]); });
  return o; }
function dcButton(x, y, r, f, d){ const q = exN(r * .27); x = exN(x); y = exN(y);
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#${f}"/><circle cx="${x}" cy="${y}" r="${exN(r*.72)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".4"/><path d="M${exN(x-q)} ${exN(y-q)}L${exN(x+q)} ${exN(y+q)}M${exN(x+q)} ${exN(y-q)}L${exN(x-q)} ${exN(y+q)}" stroke="#fff" stroke-width=".5" stroke-linecap="round"/>`
    + [[-q, -q], [q, -q], [-q, q], [q, q]].map(([a, b]) => dcDot(x + a, y + b, r * .13, d)).join(""); }
function dcNoteTheme(rn, k, id){ let defs = "", o = "";
  const pats = [
    `<pattern id="${id}0" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="#FFD43B"/><rect width="1.5" height="3" fill="#FF8787"/></pattern>`,
    `<pattern id="${id}1" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><rect width="3.2" height="3.2" fill="#A5D8FF"/><circle cx="1.6" cy="1.6" r=".75" fill="#fff"/></pattern>`,
    `<pattern id="${id}2" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#B2F2BB"/><rect width="1.5" height="1.5" fill="#fff"/><rect x="1.5" y="1.5" width="1.5" height="1.5" fill="#fff"/></pattern>`,
    `<pattern id="${id}3" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#D0BFFF"/><rect y="1" width="3" height="1" fill="#F8C8E8"/></pattern>`];
  defs = pats.join("");
  const tape = (cx, cy, ang, pi) => { const w = 24, h = 6.5, n = 4, th = h / n, d = .9; let p = `M${-w/2} ${-h/2}L${w/2} ${-h/2}`;
    for(let j = 0; j < n; j++) p += `L${w/2-d} ${exN(-h/2+th*(j+.5))}L${w/2} ${exN(-h/2+th*(j+1))}`; p += `L${-w/2} ${h/2}`;
    for(let j = 0; j < n; j++) p += `L${-w/2+d} ${exN(h/2-th*(j+.5))}L${-w/2} ${exN(h/2-th*(j+1))}`; p += "Z";
    return `<g transform="translate(${cx} ${cy}) rotate(${ang})"><path d="${p}" fill="url(#${id}${pi})" opacity=".93"/><path d="${p}" fill="none" stroke="#000" stroke-opacity=".1" stroke-width=".25"/></g>`; };
  o += tape(5.5, 5.5, -45, k % 4) + tape(204.5, 5.5, 45, (k + 1) % 4) + tape(5.5, 291.5, 45, (k + 2) % 4) + tape(204.5, 291.5, -45, (k + 3) % 4);
  dcEdge(rn, 15).forEach(([x, y, sd], i) => { const c = EX_DC[(i * 3 + k + Math.floor(rn() * 8)) % 8], vert = (sd === "l" || sd === "r"), rot = vert ? 90 : 0, t = (i + k) % 7; x = exN(x); y = exN(y);
    if(t === 0) o += `<g transform="rotate(${rot} ${x} ${y})"><path d="M${x-4.5} ${y}q1.5 -2 3 0t3 0t3 0" fill="none" stroke="#${c}" stroke-width=".55" stroke-linecap="round"/></g>`;
    else if(t === 1) o += `<rect x="-3.5" y="-1.5" width="7" height="3" fill="#${c}" opacity=".72" transform="translate(${x} ${y}) rotate(${exN(rot + (rn() - .5) * 50)})"/>`;
    else if(t === 2) o += dcStar(x, y, 2, rn() * 40, c, true);
    else if(t === 3) o += dcHeart(x, y, 1.6, c, true);
    else if(t === 4) o += `<g transform="rotate(${rot} ${x} ${y})">${dcDot(x - 2.4, y, .65, c)}${dcDot(x, y, .65, c)}${dcDot(x + 2.4, y, .65, c)}</g>`;
    else if(t === 5) o += `<g transform="rotate(${rot} ${x} ${y})"><path d="M${x-4} ${y}l1.3 -1.6l1.3 1.6l1.3 -1.6l1.3 1.6l1.3 -1.6l1.3 1.6" fill="none" stroke="#${c}" stroke-width=".5" stroke-linejoin="round"/></g>`;
    else o += dcSpark(x, y, 1.9, c); });
  return `<defs>${defs}</defs>` + o; }
function dcPlainTheme(rn, k){ let o = "";
  const cs = [[0, 0], [210, 0], [0, 297], [210, 297]];
  cs.forEach(([x, y], i) => { const b = (i * 2 + k) % 8; [12, 9, 6].forEach((r, j) => { o += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#${EX_DC[(b + j * 3) % 8]}" stroke-width="1.7" opacity=".9"/>`; }); o += dcDot(x, y, 3, EX_DC[(b + 1) % 8]); });
  dcEdge(rn, 12).forEach(([x, y, sd], i) => { const c = EX_DC[(i * 3 + k + Math.floor(rn() * 8)) % 8], r = 1 + rn() * .9, t = (i + k) % 6, a = Math.floor(rn() * 90); x = exN(x); y = exN(y);
    if(t === 0) o += dcDot(x, y, r, c);
    else if(t === 1) o += `<circle cx="${x}" cy="${y}" r="${exN(r)}" fill="none" stroke="#${c}" stroke-width=".55"/>`;
    else if(t === 2) o += `<path transform="rotate(${a} ${x} ${y})" d="M${x} ${exN(y-r*1.2)}L${exN(x+r*1.1)} ${exN(y+r*.8)}L${exN(x-r*1.1)} ${exN(y+r*.8)}Z" fill="#${c}"/>`;
    else if(t === 3) o += `<path transform="rotate(${a} ${x} ${y})" d="M${exN(x-r*1.2)} ${y}L${exN(x+r*1.2)} ${y}M${x} ${exN(y-r*1.2)}L${x} ${exN(y+r*1.2)}" stroke="#${c}" stroke-width=".6" stroke-linecap="round"/>`;
    else if(t === 4) o += `<path transform="rotate(${(sd === "l" || sd === "r") ? 90 : 0} ${x} ${y})" d="M${exN(x-3.6)} ${y}q1.2 -1.8 2.4 0t2.4 0t2.4 0" fill="none" stroke="#${c}" stroke-width=".55" stroke-linecap="round"/>`;
    else o += `<rect x="${exN(-r)}" y="${exN(-r)}" width="${exN(r*2)}" height="${exN(r*2)}" fill="#${c}" transform="translate(${x} ${y}) rotate(45)"/>`; });
  return o; }
/* ===== ลวดลายสัตว์น่ารัก (รูปแบบ "สัตว์") ===== */
const DC_INK = "6B4F3A", DC_AN = ["cat","dog","bunny","bear","panda","frog","chick","pig"];
function dcFace(kind, x, y, r){ const P = (a, b) => exN(x + a * r) + " " + exN(y + b * r), N = v => exN(v * r), ink = `stroke="#${DC_INK}" stroke-width=".4" stroke-linejoin="round"`;
  const c = (a, b, rr, f, ex) => `<circle cx="${exN(x + a * r)}" cy="${exN(y + b * r)}" r="${N(rr)}" fill="#${f}" ${ex || ""}/>`;
  const el = (a, b, rx, ry, f, rot, ex) => `<ellipse cx="${exN(x + a * r)}" cy="${exN(y + b * r)}" rx="${N(rx)}" ry="${N(ry)}" fill="#${f}" ${ex || ""}${rot ? ` transform="rotate(${rot} ${exN(x + a * r)} ${exN(y + b * r)})"` : ""}/>`;
  const poly = (pts, f, ex) => `<path d="M${pts.map(p => P(p[0], p[1])).join("L")}Z" fill="#${f}" ${ex === undefined ? ink : ex}/>`;
  const eyes = c(-.38, -.02, .11, DC_INK) + c(.38, -.02, .11, DC_INK) + c(-.35, -.07, .04, "FFFFFF") + c(.41, -.07, .04, "FFFFFF");
  const cheeks = c(-.66, .3, .17, "FF8FA3", 'opacity=".55"') + c(.66, .3, .17, "FF8FA3", 'opacity=".55"');
  const mouth = `<path d="M${P(-.17,.38)}Q${P(-.085,.5)} ${P(0,.38)}Q${P(.085,.5)} ${P(.17,.38)}" fill="none" stroke="#${DC_INK}" stroke-width=".3" stroke-linecap="round"/>`;
  const head = f => c(0, 0, 1, f, ink), nose = f => el(0, .2, .11, .08, f);
  let s = "";
  if(kind === "cat"){ s += poly([[-.92,-.1],[-.8,-1],[-.15,-.72]], "F7B267") + poly([[.92,-.1],[.8,-1],[.15,-.72]], "F7B267") + poly([[-.74,-.3],[-.72,-.78],[-.38,-.62]], "FFB3C1", "") + poly([[.74,-.3],[.72,-.78],[.38,-.62]], "FFB3C1", "") + head("F7B267")
    + `<path d="M${P(-.12,-.95)}L${P(-.1,-.62)}M${P(0,-.98)}L${P(0,-.6)}M${P(.12,-.95)}L${P(.1,-.62)}" stroke="#D9822B" stroke-width=".4" stroke-linecap="round"/>` + eyes + nose("FF6B81") + mouth + cheeks
    + `<path d="M${P(-.72,.2)}L${P(-1.2,.1)}M${P(-.72,.3)}L${P(-1.2,.34)}M${P(.72,.2)}L${P(1.2,.1)}M${P(.72,.3)}L${P(1.2,.34)}" stroke="#${DC_INK}" stroke-width=".22" stroke-linecap="round"/>`; }
  else if(kind === "dog"){ s += el(-.95, .05, .3, .58, "9C6B3E", 14, ink) + el(.95, .05, .3, .58, "9C6B3E", -14, ink) + head("E9C79A") + c(-.4, -.05, .3, "9C6B3E", 'opacity=".9"') + el(0, .32, .5, .36, "FFF3DD") + eyes.replace(`fill="#FFFFFF"`, `fill="#FFFFFF"`) + el(0, .17, .17, .11, "3B2A20") + mouth.replace(P(-.17,.38), P(-.17,.42)) + el(0, .62, .12, .1, "FF6B81") + cheeks; }
  else if(kind === "bunny"){ s += el(-.4, -1, .24, .64, "FFFFFF", -8, ink) + el(.4, -1, .24, .64, "FFFFFF", 8, ink) + el(-.4, -1, .11, .44, "FFB3C1", -8) + el(.4, -1, .11, .44, "FFB3C1", 8) + head("FFFFFF") + eyes + el(0, .2, .1, .07, "FF6B81") + mouth + `<rect x="${exN(x - .07 * r)}" y="${exN(y + .4 * r)}" width="${N(.14)}" height="${N(.16)}" fill="#fff" ${ink}/>` + cheeks; }
  else if(kind === "bear"){ s += c(-.72, -.72, .32, "B07D4F", ink) + c(.72, -.72, .32, "B07D4F", ink) + c(-.72, -.72, .16, "D9A36F") + c(.72, -.72, .16, "D9A36F") + head("B07D4F") + el(0, .3, .43, .32, "E8C9A0") + eyes + el(0, .17, .15, .1, "3B2A20") + mouth + cheeks; }
  else if(kind === "panda"){ s += c(-.72, -.72, .33, "3B3B3B", ink) + c(.72, -.72, .33, "3B3B3B", ink) + head("FFFFFF") + el(-.4, 0, .23, .31, "3B3B3B", 20) + el(.4, 0, .23, .31, "3B3B3B", -20) + c(-.38, -.04, .09, "FFFFFF") + c(.38, -.04, .09, "FFFFFF") + c(-.38, -.04, .045, DC_INK) + c(.38, -.04, .045, DC_INK) + el(0, .22, .13, .09, "3B3B3B") + mouth + c(-.7, .42, .15, "FF8FA3", 'opacity=".5"') + c(.7, .42, .15, "FF8FA3", 'opacity=".5"'); }
  else if(kind === "frog"){ s += el(0, .12, 1, .85, "7BC96F", 0, ink) + c(-.5, -.72, .38, "7BC96F", ink) + c(.5, -.72, .38, "7BC96F", ink) + c(-.5, -.72, .24, "FFFFFF") + c(.5, -.72, .24, "FFFFFF") + c(-.48, -.7, .12, DC_INK) + c(.52, -.7, .12, DC_INK)
    + `<path d="M${P(-.45,.3)}Q${P(0,.7)} ${P(.45,.3)}" fill="none" stroke="#${DC_INK}" stroke-width=".35" stroke-linecap="round"/>` + c(-.7, .22, .15, "FF8FA3", 'opacity=".55"') + c(.7, .22, .15, "FF8FA3", 'opacity=".55"') + c(-.12, .06, .04, "3E8E41") + c(.12, .06, .04, "3E8E41"); }
  else if(kind === "chick"){ s += el(-.1, -1, .12, .22, "FFD43B", -20, ink) + el(.12, -1.02, .12, .22, "FFD43B", 20, ink) + head("FFD43B") + eyes + poly([[-.2,.12],[.2,.12],[0,.4]], "FF922B") + cheeks; }
  else { s += poly([[-.95,-.2],[-.7,-.95],[-.12,-.72]], "FFB3C1") + poly([[.95,-.2],[.7,-.95],[.12,-.72]], "FFB3C1") + head("FFB3C1") + eyes + el(0, .26, .42, .3, "FF8FA3", 0, ink) + el(-.15, .26, .07, .1, "B3405A") + el(.15, .26, .07, .1, "B3405A") + c(-.68, .22, .14, "FF6B81", 'opacity=".45"') + c(.68, .22, .14, "FF6B81", 'opacity=".45"'); }
  return s; }
const dcPaw = (x, y, r, f) => `<g fill="#${f}"><ellipse cx="${exN(x)}" cy="${exN(y+r*.55)}" rx="${exN(r*.8)}" ry="${exN(r*.62)}"/>${[[-.42,-.5,.3],[.42,-.5,.3],[-.95,.05,.27],[.95,.05,.27]].map(t => `<circle cx="${exN(x+t[0]*r)}" cy="${exN(y+t[1]*r)}" r="${exN(t[2]*r)}"/>`).join("")}</g>`;
const dcBone = (x, y, a, f) => { const g = `<rect x="-2.3" y="-.65" width="4.6" height="1.3"/><circle cx="-2.5" cy="-.7" r=".8"/><circle cx="-2.5" cy=".7" r=".8"/><circle cx="2.5" cy="-.7" r=".8"/><circle cx="2.5" cy=".7" r=".8"/>`;
  return `<g transform="translate(${exN(x)} ${exN(y)}) rotate(${a})"><g fill="#${DC_INK}" stroke="#${DC_INK}" stroke-width=".9" stroke-linejoin="round">${g}</g><g fill="#${f}">${g}</g></g>`; };
const dcFish = (x, y, a, f) => `<g transform="translate(${exN(x)} ${exN(y)}) rotate(${a})"><path d="M1.6 0L3.4 -1.4L3.4 1.4Z" fill="#${f}"/><ellipse cx="0" cy="0" rx="2.2" ry="1.3" fill="#${f}"/><circle cx="-1.2" cy="-.3" r=".35" fill="#${DC_INK}"/></g>`;
function dcAnimalTheme(rn, k){ let o = "";
  const cn = [[8.5, 8.5], [203.5, 8.5], [8.5, 288.5], [203.5, 288.5]];
  cn.forEach(([x, y], i) => { const dx = x < 105 ? 1 : -1, dy = y < 150 ? 1 : -1;
    o += dcFace(DC_AN[(i * 2 + k) % 8], x, y + dy * .5, 4.3) + dcHeart(x + dx * 10, y + dy * 3, 1.5, EX_DC[(i * 3 + k) % 8]) + dcPaw(x + dx * 10.5, y - dy * 2.5, 1.3, EX_DC[(i * 3 + k + 4) % 8]); });
  dcEdge(rn, 14).forEach(([x, y, sd], i) => { const c = EX_DC[(i * 3 + k + Math.floor(rn() * 8)) % 8], vert = sd === "l" || sd === "r", t = (i + k) % 6;
    if(t === 0) o += dcPaw(x, y - 1, 1.5, c);
    else if(t === 1) o += dcBone(x, y, vert ? 90 : Math.floor(rn() * 40 - 20), "FFF3DD");
    else if(t === 2) o += dcFace(DC_AN[(i + k * 3) % 8], x, y, 2.1);
    else if(t === 3) o += dcHeart(x, y, 1.5, c);
    else if(t === 4) o += dcFish(x, y, vert ? 90 : 0, c);
    else o += dcSpark(x, y, 1.7, c); });
  return o; }
/* ===== ลวดลายดอกไม้ (รูปแบบ "ดอกไม้") ===== */
const DC_FL = [["FFB3C1","E64980"],["F783AC","C2255C"],["D0BFFF","7950F2"],["FFD8A8","F76707"],["A5D8FF","339AF0"],["FFFFFF","F06595"]];
const DC_FLK = ["daisy","sakura","tulip","rose","sunflower","hydra"];
const dcLeaf = (x, y, len, a, f) => `<path transform="translate(${exN(x)} ${exN(y)}) rotate(${exN(a)}) scale(${len})" d="M0 0Q.5 -.38 1 0Q.5 .38 0 0Z" fill="#${f || "8CE99A"}" stroke="#2F9E44" stroke-width="${exN(.35 / len)}" stroke-linejoin="round"/>`;
function dcFlower(kind, x, y, r, pi){ const [pc, ec] = DC_FL[pi % DC_FL.length], sw = exN(.3 / r), st = `fill="#${pc}" stroke="#${ec}" stroke-width="${sw}" stroke-linejoin="round"`;
  const ring = (n, inner, off) => { let s = ""; for(let i = 0; i < n; i++) s += `<g transform="rotate(${exN(i * 360 / n + (off || 0))})">${inner}</g>`; return s; };
  let b = "";
  if(kind === "daisy") b = ring(10, `<ellipse cx="0" cy="-.62" rx=".2" ry=".42" ${st}/>`) + `<circle r=".3" fill="#FFD43B" stroke="#F08C00" stroke-width="${sw}"/>`;
  else if(kind === "sakura") b = ring(5, `<path d="M0 0C-.5 -.2 -.66 -.85 -.22 -.98L0 -.8L.22 -.98C.66 -.85 .5 -.2 0 0Z" ${st}/>`) + ring(5, `<path d="M0 -.1L0 -.36" stroke="#${ec}" stroke-width="${sw}"/><circle cy="-.38" r=".055" fill="#${ec}"/>`, 36) + `<circle r=".1" fill="#${ec}"/>`;
  else if(kind === "tulip") b = `<g transform="translate(0 -.25)"><path d="M0 .6L0 1.5" stroke="#2F9E44" stroke-width="${exN(.1)}" fill="none" stroke-linecap="round"/><path d="M0 1.35Q.8 1.1 .65 .45Q.1 .75 0 1.35Z" fill="#8CE99A" stroke="#2F9E44" stroke-width="${sw}"/><path d="M-.55 -.1C-.6 .4 -.3 .7 0 .7C.3 .7 .6 .4 .55 -.1L.32 -.72L.13 -.28L0 -.85L-.13 -.28L-.32 -.72Z" ${st}/><path d="M0 -.85L0 .3" stroke="#${ec}" stroke-width="${sw}" opacity=".5" fill="none"/></g>`;
  else if(kind === "rose") b = ring(5, `<circle cy="-.62" r=".38" ${st}/>`) + `<circle r=".66" fill="#${pc}"/><path d="M0 -.05A.12 .12 0 1 1 .12 .07A.26 .26 0 1 1 -.2 -.1A.42 .42 0 1 1 .34 .22" fill="none" stroke="#${ec}" stroke-width="${exN(sw * 1.3)}" stroke-linecap="round"/>`;
  else if(kind === "sunflower") b = ring(14, `<path d="M0 -.36Q.19 -.7 0 -1.02Q-.19 -.7 0 -.36Z" fill="#FFD43B" stroke="#F59F00" stroke-width="${sw}" stroke-linejoin="round"/>`) + `<circle r=".46" fill="#8B5A2B" stroke="#5C3A1E" stroke-width="${sw}"/>` + ring(6, `<circle cy="-.25" r=".05" fill="#5C3A1E"/>`) + `<circle r=".05" fill="#5C3A1E"/>`;
  else b = [[-.5,-.4],[.5,-.4],[0,.02],[-.5,.44],[.5,.44],[0,-.8]].map(([a, c]) => `<g transform="translate(${a} ${c})">${[[.17,0],[-.17,0],[0,.17],[0,-.17]].map(([u, v]) => `<circle cx="${u}" cy="${v}" r=".17" ${st}/>`).join("")}<circle r=".07" fill="#${ec}"/></g>`).join("");
  return `<g transform="translate(${exN(x)} ${exN(y)}) scale(${r})">${b}</g>`; }
function dcButterfly(x, y, r, pi, a){ const [pc, ec] = DC_FL[pi % DC_FL.length], sw = exN(.3 / r), st = `fill="#${pc}" stroke="#${ec}" stroke-width="${sw}" stroke-linejoin="round"`;
  const w = `<path d="M0 0C-.2 -.9 -1.2 -1 -1.1 -.35C-1.05 .05 -.4 .1 0 0Z" ${st}/><path d="M0 0C-.8 .05 -1 .8 -.5 .85C-.2 .85 0 .4 0 0Z" ${st}/><circle cx="-.62" cy="-.4" r=".13" fill="#${ec}"/><circle cx="-.4" cy=".5" r=".09" fill="#${ec}"/>`;
  return `<g transform="translate(${exN(x)} ${exN(y)}) rotate(${exN(a)}) scale(${r})">${w}<g transform="scale(-1 1)">${w}</g><ellipse rx=".07" ry=".42" fill="#${DC_INK}"/><path d="M0 -.38Q-.08 -.7 -.24 -.74M0 -.38Q.08 -.7 .24 -.74" fill="none" stroke="#${DC_INK}" stroke-width="${exN(.22 / r)}" stroke-linecap="round"/></g>`; }
function dcBow(x, y, r, pi){ const [pc, ec] = DC_FL[pi % DC_FL.length], sw = exN(.3 / r), st = `fill="#${pc}" stroke="#${ec}" stroke-width="${sw}" stroke-linejoin="round"`;
  return `<g transform="translate(${exN(x)} ${exN(y)}) scale(${r})"><path d="M-.1 .15L-.55 .95L-.15 .8L-.05 1Z" ${st}/><path d="M.1 .15L.55 .95L.15 .8L.05 1Z" ${st}/><path d="M0 0C-.4 -.6 -1.1 -.6 -1.05 0C-1.1 .6 -.4 .6 0 0Z" ${st}/><path d="M0 0C.4 -.6 1.1 -.6 1.05 0C1.1 .6 .4 .6 0 0Z" ${st}/><circle r=".2" ${st}/></g>`; }
function dcVine(){ let o = ""; const pa = p => "M" + p.map(q => exN(q[0]) + " " + exN(q[1])).join("L");
  const L = [], R = [], T = [], B = [];
  for(let y = 22; y <= 276; y += 2){ const w = 1.1 * Math.sin(y / 3); L.push([5.8 + w, y]); R.push([204.2 + w, y]); }
  for(let x = 26; x <= 184; x += 2){ const w = 1.1 * Math.sin(x / 3); T.push([x, 5.2 + w]); B.push([x, 291.8 + w]); }
  [L, R, T, B].forEach(p => { o += `<path d="${pa(p)}" fill="none" stroke="#51B263" stroke-width=".5" stroke-linecap="round"/>`; });
  for(let y = 26, j = 0; y < 274; y += 8, j++){ const a = 90 + (j % 2 ? 42 : -42); o += dcLeaf(5.8, y, 3, a) + dcLeaf(204.2, y + 3, 3, 180 - a, "69DB7C"); }
  for(let x = 30, j = 0; x < 182; x += 8, j++){ const a = j % 2 ? 42 : -42; o += dcLeaf(x, 5.2, 3, a) + dcLeaf(x + 3, 291.8, 3, -a, "69DB7C"); }
  return o; }
function dcFlowerTheme(rn, k){ let o = dcVine();
  const cn = [[8.5, 8.5], [203.5, 8.5], [8.5, 288.5], [203.5, 288.5]];
  cn.forEach(([x, y], i) => { const dx = x < 105 ? 1 : -1, dy = y < 150 ? 1 : -1, top = y < 150;
    [20, 45, 70].forEach((a, j) => { const rad = a * Math.PI / 180; o += dcLeaf(x, y, 7.5, Math.atan2(dy * Math.sin(rad), dx * Math.cos(rad)) * 180 / Math.PI, j === 1 ? "69DB7C" : "8CE99A"); });
    o += dcFlower(DC_FLK[(i + k) % 6], x, y, 4.6, (i * 2 + k) % 6);
    o += dcFlower(DC_FLK[(i + k + 3) % 6], x, y + dy * 11, 2.6, (i * 2 + k + 3) % 6);
    if(!top) o += dcFlower(DC_FLK[(i + k + 2) % 6], x + dx * 10.5, y, 2.6, (i * 2 + k + 1) % 6);
    o += dcDot(x + dx * 5.5, y + dy * 6.5, .7, "FFD43B") + dcDot(x + dx * 7.5, y + dy * 4.2, .55, "F783AC"); });
  const pts = [];
  for(let y = 29 + rn() * 4; y < 270; y += 15 + rn() * 4){ pts.push([5.8, y, "l"], [204.2, y + 4, "r"]); }
  for(let x = 32 + rn() * 4; x < 180; x += 15 + rn() * 4){ pts.push([x, 5.2, "t"], [x + 5, 291.8, "b"]); }
  pts.forEach(([x, y, sd], i) => { const t = (i + k) % 6, pi = (i * 2 + k) % 6, kd = DC_FLK[(i * 5 + k) % 6], r = 2 + rn() * .5;
    if(t === 1) o += dcButterfly(x, y, 2.7, pi, rn() * 50 - 25);
    else if(t === 3) o += dcHeart(x, y, 1.4, DC_FL[pi][1]) + dcDot(x + 2.4, y, .5, "FFD43B");
    else if(t === 5) o += dcBow(x, y, 2.1, pi);
    else o += dcFlower(kd, x, y, r, pi); });
  return o; }
function exDeco(theme, k){ const rn = exRng(k * 131 + 7 + theme.length * 17);
  const body = theme === "cloud" ? dcCloudTheme(rn, k) : theme === "flower" ? dcFlowerTheme(rn, k) : theme === "animal" ? dcAnimalTheme(rn, k) : theme === "stitch" ? dcStitchTheme(rn, k) : theme === "note" ? dcNoteTheme(rn, k, "tp" + k + "_") : dcPlainTheme(rn, k);
  return `<svg class="deco" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="210mm" height="297mm" aria-hidden="true">${body}</svg>`; }
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
    const gr = !ans && cf.lstyle === "graph", th = (t => EX_THEMES.some(x => x[0] === t) ? t : "plain")(cf.theme === "star" ? "cloud" : cf.theme), lsx = cf.lstyle === "dotted" ? "1px dotted #222" : "1px solid #666";
    return `<div class="pg th-${th}" style="--lh:${lh}mm; --ls:${lsx}" data-auto="${auto ? 1 : 0}" data-gr="${gr ? 1 : 0}" data-per="${cf.per}">${EX.v.deco === false ? "" : exDeco(th, k)}<div class="box">
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
  /* ไม่รีเซ็ตความสูงเป็น ๑ หน้า — ไม่งั้นหน้าเว็บหดแล้วเบราว์เซอร์เลื่อนขึ้นบนสุดทุกครั้งที่แก้ไข */
  if(!ex.h || ex.h < 1123) ex.h = 1123;
  const sc = []; for(let n = ex.pv; n; n = n.parentElement){ if(n.scrollTop > 0) sc.push([n, n.scrollTop]); } const wy = window.scrollY;
  ex.rest = () => { sc.forEach(([n, t]) => { if(n.isConnected && n.scrollTop < t - 40) n.scrollTop = t; }); if(window.scrollY < wy - 40) window.scrollTo(window.scrollX, wy); };
  ex.restUntil = Date.now() + 2500;
  ex.pv.style.display = ""; ex.printBtn.style.display = "";
  const arow = $("#exAnsRow", ex.view); if(arow) arow.style.display = "";
  const em = $("#exEmpty", ex.view); if(em) em.style.display = "none";
  ex.stat.textContent = `โจทย์ ${plNum(exCur.items.length)} ข้อ — กำลังจัดหน้า…`;
  /* สร้าง iframe ใหม่ทุกครั้ง (ชัวร์กว่าสั่ง srcdoc ซ้ำ) แล้วค่อยสลับเมื่อโหลดเสร็จ */
  const old = ex.frame, nf = document.createElement("iframe");
  nf.id = "exFrame"; nf.title = "ตัวอย่างใบงาน"; nf.tabIndex = -1; nf.setAttribute("sandbox", "allow-scripts");
  nf.style.height = ex.h + "px"; nf.style.visibility = "hidden";
  nf.onload = () => { [...ex.pv.querySelectorAll("iframe")].forEach(f => { if(f !== nf) f.remove(); }); nf.style.visibility = ""; back(); ex.rest(); };
  if(old) old.id = "";
  ex.pv.appendChild(nf); ex.frame = nf;
  nf.srcdoc = exDoc("preview");
  exScale(); setTimeout(back, 0); setTimeout(() => ex.rest && ex.rest(), 0); exStepUi(); exAnsUi();
}
/* =====================================================================
   ขั้นที่ ๔ — รวมแบบฝึก: รวมไฟล์ PDF หลายไฟล์เป็นเล่มเดียว + รันเลขหน้ามุมขวาบน (ใช้ pdf-lib โหลดจาก CDN ครั้งแรก)
   เลขหน้าวาดเป็นภาพจาก canvas เพื่อให้ภาษาไทยแสดงได้โดยไม่ต้องฝังฟอนต์
   ===================================================================== */
const MG = { files:[], seq:0, out:null, busy:false };
const MG_DEF = { on:true, tpl:"วิชาคณิตศาสตร์ หน้าที่ {n}", start:1, skip:0, num:"ar", mode:"all", view:"card", size:16, top:9, right:11, name:"รวมแบบฝึกหัด" };
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
    <div class="mg-hint" id="mgHint" style="display:none;">✋ จับไฟล์ลากไปวางตำแหน่งที่ต้องการได้เลย — เส้นสีเขียวคือจุดที่จะวาง</div>
    <div id="mgList"></div>
    <div class="mg-tools" id="mgTools" style="display:none;"><span id="mgSum" class="tl-sub"></span><span style="flex:1"></span><div class="seg mg-vseg" id="mgView"><button type="button" data-mgv="card">🗂 กรอบกระดาษ</button><button type="button" data-mgv="list">☰ รายการ</button></div><button type="button" class="btn btn-outline btn-sm" id="mgSort">เรียงตามชื่อไฟล์</button><button type="button" class="btn btn-outline btn-sm" id="mgClear">ล้างทั้งหมด</button></div>
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
  const lst = $("#mgList", v), cardMode = c.view !== "list";
  lst.className = cardMode ? "mg-cards" : "";
  const rtx = i => rg[i] ? `เลขหน้า ${fmt(rg[i][0])}${rg[i][1] !== rg[i][0] ? "–" + fmt(rg[i][1]) : ""}` : (c.on ? "ไม่ใส่เลข" : "");
  lst.innerHTML = cardMode
    ? MG.files.map((f, i) => `<div class="mg-cd" data-mid="${f.id}" data-mi="${i}" title="${escH(f.name)}"><div class="mg-paper${f.pages > 1 ? " multi" : ""}"><div class="mg-th">${mgThumbHtml(f)}</div><b class="mg-no">${plNum(i+1)}</b><span class="mg-pg">${plNum(f.pages)} หน้า</span><button type="button" class="mg-x" data-mdel="${i}" aria-label="เอาออก">✕</button><span class="mg-grip" aria-hidden="true">⠿</span></div><div class="mg-cn">${escH(f.name)}</div><small>${rtx(i)}</small></div>`).join("")
    : MG.files.map((f, i) => `<div class="mg-it" data-mid="${f.id}" data-mi="${i}"><span class="mg-grip" aria-hidden="true">⠿</span><b>${plNum(i+1)}</b>
    <div class="mg-nm"><span>${escH(f.name)}</span><small>${plNum(f.pages)} หน้า · ${mgKb(f.size)}${rtx(i) ? " · " + rtx(i) : ""}</small></div>
    <div class="mg-bt"><button type="button" data-mup="${i}" aria-label="เลื่อนขึ้น"${i === 0 ? " disabled" : ""}>▲</button><button type="button" data-mdn="${i}" aria-label="เลื่อนลง"${i === MG.files.length - 1 ? " disabled" : ""}>▼</button><button type="button" data-mdel="${i}" aria-label="เอาออก" class="x">✕</button></div></div>`).join("");
  v.querySelectorAll("#mgView button").forEach(b => b.classList.toggle("on", b.dataset.mgv === (cardMode ? "card" : "list")));
  const hn = $("#mgHint", v); if(hn) hn.style.display = MG.files.length > 1 ? "" : "none";
  if(cardMode) mgThumbs();
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

/* ---------- กรอบกระดาษ: แสดงหน้าแรกของแต่ละไฟล์ (ใช้ pdf.js โหลดจาก CDN ครั้งแรก) ---------- */
function mgPdfJs(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if(mgPdfJs.p) return mgPdfJs.p;
  const L = [["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"],
             ["https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js", "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"]];
  mgPdfJs.p = (async () => {
    for(const [u, w] of L){
      try{ await new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = u; sc.onload = ok; sc.onerror = () => no(new Error("x")); document.head.appendChild(sc); }); }catch(e){}
      if(window.pdfjsLib){ window.pdfjsLib.GlobalWorkerOptions.workerSrc = w; return window.pdfjsLib; }
    }
    mgPdfJs.p = null; throw new Error("no pdfjs");
  })();
  return mgPdfJs.p;
}
function mgThumbHtml(f){
  return f.thumb ? `<img src="${f.thumb}" alt="" draggable="false">` : (f.tfail ? `<span class="mg-pdfic">PDF</span>` : `<span class="mg-ld">กำลังโหลด…</span>`);
}
function mgThumbSet(){
  const v = ex.view; if(!v) return;
  MG.files.forEach(f => { const th = v.querySelector(`.mg-cd[data-mid="${f.id}"] .mg-th`); if(th) th.innerHTML = mgThumbHtml(f); });
}
const mgTq = { busy:false };
function mgThumbs(){
  if(mgTq.busy || !MG.files.some(f => !f.thumb && !f.tfail)) return;
  mgTq.busy = true;
  (async () => {
    try{
      const lib = await mgPdfJs();
      for(;;){
        const f = MG.files.find(x => !x.thumb && !x.tfail); if(!f) break;
        try{
          const doc = await lib.getDocument({ data: f.bytes.slice(0) }).promise;   // สำเนา — pdf.js ย้าย buffer ไปที่ worker ห้ามกระทบไฟล์ต้นฉบับที่ใช้รวม
          const pg = await doc.getPage(1), w0 = pg.getViewport({ scale:1 }).width, vp = pg.getViewport({ scale: 320 / w0 });
          const cv = document.createElement("canvas"); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
          const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height);
          await pg.render({ canvasContext:cx, viewport:vp }).promise;
          f.thumb = cv.toDataURL("image/jpeg", .82); try{ doc.destroy(); }catch(e){}
        }catch(e){ f.tfail = true; }
        mgThumbSet(); await mgTick();
      }
    }catch(e){ MG.files.forEach(x => { if(!x.thumb) x.tfail = true; }); mgThumbSet(); }
    mgTq.busy = false;
    if(MG.files.some(f => !f.thumb && !f.tfail)) mgThumbs();
  })();
}
/* ---------- จับลากสลับลำดับ (เมาส์: จับตรงไหนของไฟล์ก็ได้ · นิ้ว/ปากกา: จับที่ไอคอน ⠿) ---------- */
function mgScroller(el){
  for(let p = el.parentElement; p && p !== document.body; p = p.parentElement){
    const o = getComputedStyle(p).overflowY;
    if((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight + 2) return p;
  }
  return null;
}
function mgDragInit(list){
  list.addEventListener("pointerdown", e => {
    if(e.pointerType === "mouse" && e.button !== 0) return;
    const it = e.target.closest(".mg-it,.mg-cd"); if(!it || !list.contains(it) || e.target.closest("button,a,input,select")) return;
    if(e.pointerType !== "mouse" && !e.target.closest(".mg-grip")) return;
    if(e.pointerType === "mouse") e.preventDefault();
    const pid = e.pointerId, sx = e.clientX, sy = e.clientY, grid = list.classList.contains("mg-cards");
    const items = () => [...list.querySelectorAll(".mg-it,.mg-cd")];
    let on = false, ghost = null, ind = null, tm = 0, from = -1, tgt = -1, ox = 0, oy = 0, last = { x:sx, y:sy };
    const calc = () => {
      const arr = items(); if(!arr.length) return;
      let best = -1, bd = Infinity, after = false;
      arr.forEach((el, i) => {
        const r = el.getBoundingClientRect(), dx = Math.max(r.left - last.x, 0, last.x - r.right), dy = Math.max(r.top - last.y, 0, last.y - r.bottom), d = dx*dx + dy*dy;
        if(d < bd){ bd = d; best = i; after = grid ? last.x > r.left + r.width / 2 : last.y > r.top + r.height / 2; }
      });
      tgt = best + (after ? 1 : 0);
      if(tgt === from || tgt === from + 1){ ind.style.display = "none"; return; }
      const r = arr[best].getBoundingClientRect(); ind.style.display = "block";
      if(grid){ ind.style.left = ((after ? r.right + 5 : r.left - 5) - 2.5) + "px"; ind.style.top = r.top + "px"; ind.style.width = "5px"; ind.style.height = r.height + "px"; }
      else { ind.style.left = r.left + "px"; ind.style.top = ((after ? r.bottom + 4 : r.top - 4) - 2.5) + "px"; ind.style.width = r.width + "px"; ind.style.height = "5px"; }
    };
    const begin = () => {
      on = true; from = items().indexOf(it);
      const r = it.getBoundingClientRect(); ox = sx - r.left; oy = sy - r.top;
      ghost = document.createElement("div"); ghost.className = "kc-mgg";
      const img = it.querySelector(".mg-th img");
      ghost.innerHTML = grid ? (img ? `<img src="${img.src}" alt="">` : `<span>PDF</span>`) : `<span>${escH((it.querySelector(".mg-nm span") || {}).textContent || "")}</span>`;
      ghost.style.width = r.width + "px"; ghost.style.height = (grid ? r.width * 297 / 210 : r.height) + "px";
      ind = document.createElement("div"); ind.className = "kc-mgi";
      document.body.appendChild(ghost); document.body.appendChild(ind);
      it.classList.add("mg-dragging"); document.body.classList.add("kc-mgb");
      tm = setInterval(() => {
        const sp = mgScroller(list), r2 = sp ? sp.getBoundingClientRect() : { top:0, bottom:innerHeight };
        let dy = 0;
        if(last.y < r2.top + 70) dy = -Math.min(20, (r2.top + 70 - last.y) / 3 + 4); else if(last.y > r2.bottom - 70) dy = Math.min(20, (last.y - (r2.bottom - 70)) / 3 + 4);
        if(dy){ (sp || window).scrollBy(0, dy); calc(); }
      }, 16);
    };
    const mv = ev => {
      if(ev.pointerId !== pid) return;
      last = { x:ev.clientX, y:ev.clientY };
      if(!on){ if(Math.hypot(last.x - sx, last.y - sy) < 6) return; begin(); }
      ghost.style.left = (last.x - ox) + "px"; ghost.style.top = (last.y - oy) + "px";
      calc();
    };
    const end = ev => {
      if(ev.pointerId !== pid) return;
      document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", end); document.removeEventListener("pointercancel", end);
      clearInterval(tm);
      if(!on) return;
      ghost.remove(); ind.remove(); it.classList.remove("mg-dragging"); document.body.classList.remove("kc-mgb");
      if(ev.type === "pointerup" && tgt >= 0){
        let to = tgt; if(to > from) to--;
        if(to !== from){
          const [f] = MG.files.splice(from, 1); MG.files.splice(to, 0, f);
          MG.out = null; const rs = $("#mgRes", ex.view); if(rs) rs.innerHTML = "";
          mgRefresh();
          const el = list.querySelector(`[data-mid="${f.id}"]`); if(el){ el.classList.add("mg-pop"); setTimeout(() => el.classList.remove("mg-pop"), 450); }
        }
      }
    };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", end); document.addEventListener("pointercancel", end);
  });
  list.addEventListener("dragstart", e => e.preventDefault());
}
function mgClick(e){
  const v = ex.view;
  const vw = e.target.closest("[data-mgv]");
  if(vw){ mgCfg().view = vw.dataset.mgv === "list" ? "list" : "card"; exSave(); mgRefresh(); return true; }
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
    mgDragInit($("#mgList", v));
    const dz = $("#mgDrop", v);
    ["dragenter","dragover"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add("on"); }));
    ["dragleave","drop"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove("on"); }));
    dz.addEventListener("drop", e => { if(e.dataTransfer && e.dataTransfer.files) mgAdd([...e.dataTransfer.files]); });
    if(window.ResizeObserver){ const ro = new ResizeObserver(() => exFit()); ex.sls.forEach(x => ro.observe(x)); }
    if(window.ResizeObserver && ex.pv){ let pw = 0; new ResizeObserver(() => { const w = ex.pv.clientWidth; if(w !== pw){ pw = w; exScale(); } }).observe(ex.pv); }
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
      if(e.target.id === "exDeco"){ EX.v.deco = e.target.checked; exSave(); if(exCur) exPreview(); return; }
      if(e.target.id === "exAns"){ EX.v.showAns = e.target.checked; exSave(); exAnsUi(); if(exCur) exPreview(); return; }
      if(e.target.id === "mgFile"){ const fl = [...e.target.files]; e.target.value = ""; mgAdd(fl); return; }
      if(mgInput(e) || grpEdit(e)) return;
      const f = e.target.closest("select[data-ef]"); if(f){ EX.v[f.dataset.ef] = f.value; exSave(); layRefresh(f.dataset.ef);
        if(f.dataset.ef === "gmode"){ const on = f.value !== "none", w = $("#exGaWrap", v), h = $("#exGHint", v); if(w) w.style.display = on && exAnsOn() ? "" : "none"; if(h) h.style.display = on ? "" : "none"; } }
    });
    v.addEventListener("click", e=>{
      if(mgClick(e)) return;
      const ag = e.target.closest("[data-eag]");
      if(ag){
        EX.v.ansGen = ag.dataset.eag === "no" ? "no" : "yes"; exSave();
        v.querySelectorAll("[data-eag]").forEach(b => { const on = b === ag; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
        const w = $("#exGaWrap", v); if(w) w.style.display = (EX.v.gmode || "none") !== "none" && exAnsOn() ? "" : "none";
        const pb = $("#exPromptBox", v); if(pb && pb.style.display !== "none"){ const t = exPromptText(); $("#exPrompt", v).value = t; $("#exLen", v).textContent = `${plNum(t.length.toLocaleString("en-US"))} ตัวอักษร`; }
        return;
      }
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
      if(ex.rest && Date.now() < ex.restUntil) ex.rest();
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

/* ขั้นที่ ๓ — โหมด PC: ซ้าย = แก้โจทย์รายข้อ · ขวา = ตัวอย่างใบงาน (ค้างอยู่กับที่ขณะเลื่อน) เหมือนหน้าสร้างข้อสอบ ; มือถือคงเดิม */
#view-tool-ex .ex-work{display:flex; flex-direction:column;}
#view-tool-ex .ex-left,#view-tool-ex .ex-right{display:contents;}
#view-tool-ex #exStat{order:0;} #view-tool-ex #exEdBox{order:1;}
#view-tool-ex .ex-right > :not(#exStat){order:2;}
#view-tool-ex .ex-pvbar{display:none;}
html.mode-pc #view-tool-ex .ex-vp{overflow:clip; overflow-clip-margin:0;}
html.mode-pc #view-tool-ex .ex-sl > .card{overflow:visible;}
html.mode-pc #view-tool-ex .ex-work{display:grid; grid-template-columns:minmax(360px,5fr) minmax(420px,6fr); gap:22px; align-items:start;}
html.mode-pc #view-tool-ex .ex-left{display:block; min-width:0;}
html.mode-pc #view-tool-ex .ex-right{display:block; min-width:0; position:sticky; top:10px; max-height:calc(100vh - 20px); overflow:auto; scrollbar-gutter:stable; padding-right:2px;}
html.mode-pc #view-tool-ex .ex-pvbar{display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:12px; font-size:15px; color:var(--c-ink);}
html.mode-pc #view-tool-ex .ex-right > :not(#exStat){order:0;}
html.mode-pc #view-tool-ex .ex-right .ex-pdf{margin-top:14px; padding:14px 16px;}
html.mode-pc #view-tool-ex .ex-right .ex-pdf-tx{font-size:19px;}

/* เลือกให้ AI สร้างเฉลย — การ์ดวิบวับเด่น */
#view-tool-ex .ex-ag{position:relative; isolation:isolate; margin:4px 0 16px; padding:14px; border-radius:20px; border:2px solid transparent;
  background:linear-gradient(#FFFDF4,#FFFDF4) padding-box, linear-gradient(110deg,#34A853,#F59F00,#EC5E9B,#8E5CF0,#2F9BFF,#34A853) border-box; background-size:100% 100%,300% 100%;
  box-shadow:0 10px 26px -14px rgba(142,92,240,.75), 0 0 22px rgba(245,159,0,.28); animation:exAgBorder 4s linear infinite, exAgGlow 2.6s ease-in-out infinite;}
#view-tool-ex .ex-ag-t{text-align:center; margin-bottom:10px;}
#view-tool-ex .ex-shim{display:inline-block; font-weight:800; font-size:18px; letter-spacing:.2px; background:linear-gradient(100deg,#34A853 0%,#F59F00 18%,#EC5E9B 38%,#8E5CF0 58%,#2F9BFF 78%,#34A853 100%); background-size:300% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; animation:exAgShim 3.2s linear infinite; filter:drop-shadow(0 0 5px rgba(245,159,0,.45));}
#view-tool-ex .ex-ag-b{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
#view-tool-ex .ex-ag-b button{position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center; gap:3px; padding:12px 8px; border-radius:16px; border:2px solid #E1E7F3; background:#fff; color:var(--ink); font:inherit; cursor:pointer; text-align:center; transition:transform .12s,border-color .2s,box-shadow .2s,background .2s;}
#view-tool-ex .ex-ag-b button b{font-size:16px;}
#view-tool-ex .ex-ag-b button small{font-size:12px; color:var(--ink-soft); font-weight:500; line-height:1.3;}
#view-tool-ex .ex-ag-b button:hover{transform:translateY(-2px);}
#view-tool-ex .ex-ag-b button:active{transform:scale(.97);}
#view-tool-ex .ex-ag-b button.on{border-color:#34A853; background:linear-gradient(135deg,#E3F5E8,#fff); box-shadow:0 0 0 3px rgba(52,168,83,.25), 0 10px 20px -12px rgba(52,168,83,.9);}
#view-tool-ex .ex-ag-b button[data-eag="no"].on{border-color:#8E5CF0; background:linear-gradient(135deg,#F0E8FF,#fff); box-shadow:0 0 0 3px rgba(142,92,240,.25), 0 10px 20px -12px rgba(142,92,240,.9);}
#view-tool-ex .ex-ag-b button.on::after{content:""; position:absolute; top:-30%; bottom:-30%; left:-40%; width:28%; background:linear-gradient(100deg,transparent,rgba(255,255,255,.9),transparent); transform:skewX(-20deg); animation:exAgShine 2.8s ease-in-out infinite; pointer-events:none;}
#view-tool-ex .ex-ag .sp{position:absolute; z-index:2; pointer-events:none; font-style:normal; color:#F59F00; text-shadow:0 0 6px #fff,0 0 12px #ffd54a; animation:exTwinkle 1.9s ease-in-out infinite; opacity:0;}
#view-tool-ex .ex-ag .s1{left:10px; top:6px; font-size:16px;}
#view-tool-ex .ex-ag .s2{right:14px; top:8px; font-size:20px; animation-delay:.7s;}
#view-tool-ex .ex-ag .s3{right:30%; bottom:4px; font-size:13px; animation-delay:1.3s;}
@keyframes exAgBorder{0%{background-position:0 0,0% 50%;} 100%{background-position:0 0,300% 50%;}}
@keyframes exAgGlow{0%,100%{box-shadow:0 10px 26px -14px rgba(142,92,240,.75), 0 0 14px rgba(245,159,0,.25);} 50%{box-shadow:0 10px 26px -14px rgba(142,92,240,.75), 0 0 30px rgba(245,159,0,.6);}}
@keyframes exAgShim{0%{background-position:0% 50%;} 100%{background-position:300% 50%;}}
@keyframes exAgShine{0%{left:-40%;} 55%,100%{left:130%;}}
html[data-theme="dark"] #view-tool-ex .ex-ag,html[data-theme="black"] #view-tool-ex .ex-ag{background:linear-gradient(#1d2233,#1d2233) padding-box, linear-gradient(110deg,#34A853,#F59F00,#EC5E9B,#8E5CF0,#2F9BFF,#34A853) border-box; background-size:100% 100%,300% 100%;}
html[data-theme="dark"] #view-tool-ex .ex-ag-b button,html[data-theme="black"] #view-tool-ex .ex-ag-b button{background:#232a40; border-color:#2c3450;}
html[data-theme="dark"] #view-tool-ex .ex-ag-b button.on,html[data-theme="black"] #view-tool-ex .ex-ag-b button.on{background:#17301f;}
html[data-theme="dark"] #view-tool-ex .ex-ag-b button[data-eag="no"].on,html[data-theme="black"] #view-tool-ex .ex-ag-b button[data-eag="no"].on{background:#2a2147;}
@media (prefers-reduced-motion:reduce){#view-tool-ex .ex-ag,#view-tool-ex .ex-shim,#view-tool-ex .ex-ag-b button.on::after,#view-tool-ex .ex-ag .sp{animation:none;} #view-tool-ex .ex-ag .sp{opacity:.9;}}

/* รวม PDF: โหมดกรอบกระดาษ + จับลากสลับลำดับ */
#view-tool-ex .mg-vseg{flex:0 0 auto;}
#view-tool-ex .mg-vseg button{padding:6px 11px;}
#view-tool-ex .mg-hint{margin-top:10px; padding:7px 12px; border-radius:12px; background:var(--c-bg); color:var(--c-ink); font-size:12.5px;}
#view-tool-ex #mgList.mg-cards{display:grid; grid-template-columns:repeat(auto-fill,minmax(132px,1fr)); gap:16px 14px; margin-top:12px;}
#view-tool-ex .mg-cd{position:relative; display:flex; flex-direction:column; gap:3px; cursor:grab; user-select:none; -webkit-user-select:none; transition:transform .15s;}
#view-tool-ex .mg-cd:hover{transform:translateY(-3px);}
#view-tool-ex .mg-paper{position:relative; aspect-ratio:210/297; background:#fff; border:1.5px solid #D6DCEB; border-radius:6px; box-shadow:0 8px 16px -10px rgba(27,34,51,.55);}
#view-tool-ex .mg-paper.multi{box-shadow:3px 3px 0 -1px #fff, 3px 3px 0 0 #D6DCEB, 6px 6px 0 -1px #fff, 6px 6px 0 0 #D6DCEB, 0 10px 16px -10px rgba(27,34,51,.55);}
#view-tool-ex .mg-th{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius:5px; background:#fff;}
#view-tool-ex .mg-th img{width:100%; height:100%; object-fit:contain; display:block; pointer-events:none; -webkit-user-drag:none;}
#view-tool-ex .mg-pdfic{font-weight:800; font-size:20px; color:#EA4335; letter-spacing:1px;}
#view-tool-ex .mg-ld{font-size:11.5px; color:var(--ink-soft);}
#view-tool-ex .mg-no{position:absolute; left:6px; top:6px; min-width:24px; height:24px; padding:0 7px; border-radius:12px; background:linear-gradient(135deg,#5BE08A,#4A90E2); color:#fff; display:flex; align-items:center; justify-content:center; font-size:12.5px; box-shadow:0 2px 6px rgba(0,0,0,.3);}
#view-tool-ex .mg-pg{position:absolute; left:6px; bottom:6px; background:rgba(27,34,51,.78); color:#fff; font-size:11px; padding:1px 8px; border-radius:999px;}
#view-tool-ex .mg-x{position:absolute; right:5px; top:5px; width:24px; height:24px; padding:0; border-radius:50%; border:0; background:rgba(255,255,255,.95); color:#555; font-size:11px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,.3); opacity:0; transition:opacity .15s;}
#view-tool-ex .mg-cd:hover .mg-x{opacity:1;} #view-tool-ex .mg-x:hover{background:#EA4335; color:#fff;}
@media (hover:none){ #view-tool-ex .mg-x{opacity:1;} }
#view-tool-ex .mg-cd .mg-grip{position:absolute; right:5px; bottom:5px; width:26px; height:26px; border-radius:8px; background:rgba(255,255,255,.95); color:#6B7894; display:flex; align-items:center; justify-content:center; font-size:17px; box-shadow:0 2px 6px rgba(0,0,0,.25); touch-action:none; cursor:grab;}
#view-tool-ex .mg-cn{font-size:12.5px; font-weight:600; color:var(--ink); text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:0 2px;}
#view-tool-ex .mg-cd small{font-size:11px; color:var(--ink-soft); text-align:center; min-height:1em;}
#view-tool-ex .mg-it{cursor:grab; user-select:none; -webkit-user-select:none;}
#view-tool-ex .mg-it .mg-grip{flex:0 0 16px; color:#9AA6BF; font-size:19px; line-height:1; text-align:center; touch-action:none; cursor:grab;}
#view-tool-ex .mg-dragging{opacity:.3;}
@keyframes mgPop{0%{transform:scale(.9);} 60%{transform:scale(1.06);} 100%{transform:scale(1);}}
#view-tool-ex .mg-pop{animation:mgPop .38s ease;}
.kc-mgg{position:fixed; z-index:99999; pointer-events:none; display:flex; align-items:center; justify-content:center; padding:6px; border-radius:10px; background:#fff; border:2px solid #34A853; box-shadow:0 20px 34px -10px rgba(0,0,0,.5); opacity:.96; transform:rotate(2.5deg) scale(1.04); overflow:hidden; font:600 14px 'Noto Sans Thai',sans-serif; color:#1B2233;}
.kc-mgg img{max-width:100%; max-height:100%; object-fit:contain;}
.kc-mgg span{overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.kc-mgi{position:fixed; z-index:99998; pointer-events:none; display:none; background:#34A853; border-radius:3px; box-shadow:0 0 10px rgba(52,168,83,.9);}
body.kc-mgb, body.kc-mgb *{cursor:grabbing !important; user-select:none !important; -webkit-user-select:none !important;}
html[data-theme="dark"] #view-tool-ex .mg-cd .mg-grip,html[data-theme="black"] #view-tool-ex .mg-cd .mg-grip,html[data-theme="dark"] #view-tool-ex .mg-x,html[data-theme="black"] #view-tool-ex .mg-x{background:#2c3450; color:#d6dcf0;}
`;
document.head.appendChild(exStyle);

/* =====================================================================
   เครื่องมือ: สร้างข้อสอบ — เลือกชั้น/ตัวชี้วัด + กรอกโครงข้อสอบ → ได้ Prompt ให้ AI
   → วางคำตอบของ AI → ได้ข้อสอบพร้อมพิมพ์ (ปรนัย ก ข ค ง / อัตนัย เส้นประ) + ปุ่มแสดงเฉลย
   รูปแบบที่ AI ต้องส่งกลับ (ระบบอ่านอัตโนมัติ — ใช้ $...$ เป็น LaTeX ได้ทุกช่อง):
     FORMULA: $สูตร1$ ;; $สูตร2$                (ถ้าให้ AI เลือกสูตร)
     [[MC 1]]  IND: / LAY: 1|2 / Q: / A: B: C: D: / ANS: / SOL:
     [[WR 1]]  IND: / PTS: / LINES: / Q: / SOL: / ANS:
   ===================================================================== */
const XM_KEY = "kc_exam_v1";
const XM_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const XM_L = "กขคงจ";
const xmAr = s => String(s ?? "").replace(/[๐-๙]/g, d => "๐๑๒๓๔๕๖๗๘๙".indexOf(d));
const xmMonthNow = () => { const d = new Date(); return XM_MONTHS[d.getMonth()] + " " + (d.getFullYear() + 543); };
const XM_DEF = { subj:"เพิ่มเติม", subjCustom:"", topic:"", note:"", n1:20, s1:15, n2:5, s2:15, lay:"auto", diff:"ramp",
  formula:false, formulaTxt:"", hdrGrade:"", month:xmMonthNow(), time:"1 ชั่วโมง 30 นาที", exName:"", nameLine:true, cols:"2", fs:"16", newPage:true, dots:true, sheet:true, gmode:"none", tmode:"none" };
const XM = { v:{}, grade:"", sel:{}, cnt:{}, raw:"", lay:{}, open:{}, parsedRaw:"", ans:false, data:null, edited:false, cur:"" };
try{
  const o = JSON.parse(localStorage.getItem(XM_KEY) || "{}") || {};
  XM.v = o.v || {}; XM.grade = o.grade || ""; XM.cnt = o.cnt || {}; XM.raw = o.raw || ""; XM.lay = o.lay || {}; XM.open = o.open || {}; XM.parsedRaw = o.parsedRaw || ""; XM.data = o.data || null; XM.edited = !!o.edited; XM.cur = o.cur || "";
  Object.keys(o.sel || {}).forEach(g => { XM.sel[g] = new Set(o.sel[g]); });
}catch(e){}
const xmSave = () => { try{
  const sel = {}; Object.keys(XM.sel).forEach(g => { sel[g] = [...XM.sel[g]]; });
  localStorage.setItem(XM_KEY, JSON.stringify({ v:XM.v, grade:XM.grade, sel, cnt:XM.cnt, raw:XM.raw, lay:XM.lay, open:XM.open, parsedRaw:XM.parsedRaw, data:XM.data, edited:XM.edited, cur:XM.cur }));
  xmLibStatusSoon();
}catch(e){} };
const xm = {};                                   // อ้างอิง element

/* ---------- คลังข้อสอบที่บันทึกไว้ (kc_exam_lib_v1) ---------- */
const XM_LIB = "kc_exam_lib_v1";
function xmLibGet(){ try{ const a = JSON.parse(localStorage.getItem(XM_LIB) || "[]"); return Array.isArray(a) ? a : []; }catch(e){ return []; } }
function xmLibPut(a){ try{ localStorage.setItem(XM_LIB, JSON.stringify(a)); return true; }catch(e){ say("บันทึกไม่สำเร็จ — พื้นที่เก็บข้อมูลของเบราว์เซอร์เต็ม ลองลบรายการเก่าก่อนนะครับ"); return false; } }
/* ---------- ซิงก์คลังข้อสอบขึ้น Google Sheet (ชีท ExamLib) ----------
   ในเครื่อง (localStorage) ยังเป็นแคชหลักเสมอ — ถ้าออฟไลน์/ส่งไม่สำเร็จ จะจำไว้ใน "คิวค้างส่ง" แล้วส่งให้ตอนซิงก์ครั้งถัดไป */
const XM_PEND = "kc_exam_lib_pend_v1";
function xmPendGet(){ try{ const o = JSON.parse(localStorage.getItem(XM_PEND) || "{}") || {}; return { put:Array.isArray(o.put) ? o.put : [], del:Array.isArray(o.del) ? o.del : [] }; }catch(e){ return { put:[], del:[] }; } }
function xmPendSet(p){ try{ localStorage.setItem(XM_PEND, JSON.stringify(p)); }catch(e){} }
function xmCloudOk(){ return typeof apiPost === "function" && typeof apiGet === "function"; }
function xmCloudMsg(t){ xm.cloudMsg = t; const el = $("#xmLibBox .xm-cloud", xm.view); if(el) el.textContent = t; }
async function xmCloudPush(id){
  const p = xmPendGet(), it = xmLibGet().find(x => x.id === id);
  if(!it || !it.snap) return true;
  p.del = p.del.filter(x => x !== id);
  let res; try{ res = xmCloudOk() ? await apiPost({ type:"saveExamLib", id:it.id, name:it.name, t:it.t, mc:it.mc || 0, wr:it.wr || 0, snap:it.snap }) : null; }catch(e){ res = null; }
  const ok = !!(res && res.success);
  p.put = p.put.filter(x => x !== id); if(!ok) p.put.push(id);
  xmPendSet(p);
  xmCloudMsg(ok ? "☁ ซิงก์ขึ้นชีทแล้ว" : "⚠ ยังไม่ได้ซิงก์ขึ้นชีท" + (res && res.message ? " — " + res.message : "") + " (จะส่งซ้ำให้ตอนกด ☁ ซิงก์)");
  return ok;
}
async function xmCloudDel(id){
  const p = xmPendGet();
  p.put = p.put.filter(x => x !== id);
  let res; try{ res = xmCloudOk() ? await apiPost({ type:"deleteExamLib", id }) : null; }catch(e){ res = null; }
  const ok = !!(res && res.success);
  p.del = p.del.filter(x => x !== id); if(!ok) p.del.push(id);
  xmPendSet(p);
  if(!ok) xmCloudMsg("⚠ ลบในชีทยังไม่สำเร็จ (จะลองใหม่ตอนกด ☁ ซิงก์)");
  return ok;
}
let xmSyncing = false;
async function xmCloudSync(quiet){
  if(xmSyncing) return; if(!xmCloudOk()){ if(!quiet) say("ยังเชื่อมชีทไม่ได้"); return; }
  xmSyncing = true; xmCloudMsg("☁ กำลังซิงก์…");
  try{
    let p = xmPendGet();
    for(const id of [...p.del]) await xmCloudDel(id);
    for(const id of [...xmPendGet().put]) await xmCloudPush(id);
    const remote = await apiGet("examLib");
    if(!Array.isArray(remote)) throw new Error((remote && remote.message) || "อ่านชีท ExamLib ไม่ได้ (Deploy Apps Script ล่าสุดแล้วหรือยัง?)");
    p = xmPendGet();
    const a = xmLibGet(), byId = {}; a.forEach(x => { byId[x.id] = x; });
    let down = 0, up = 0; const remoteIds = new Set(remote.map(r => r.id));
    remote.forEach(r => {
      if(p.del.includes(r.id) || !r.snap) return;
      const l = byId[r.id];
      if(!l){ a.push({ id:r.id, name:r.name, t:r.t, mc:r.mc, wr:r.wr, snap:r.snap }); down++; }
      else if((r.t || 0) > (l.t || 0)){ l.name = r.name; l.t = r.t; l.mc = r.mc; l.wr = r.wr; l.snap = r.snap; down++; }
    });
    const toUp = a.filter(x => x.snap && (!remoteIds.has(x.id) || ((x.t || 0) > ((remote.find(r => r.id === x.id) || {}).t || 0))));
    a.sort((x, y) => (y.t || 0) - (x.t || 0));
    xmLibPut(a);
    for(const x of toUp){ if(await xmCloudPush(x.id)) up++; }
    const left = xmPendGet(); const bad = left.put.length + left.del.length;
    xmCloudMsg(bad ? `⚠ ซิงก์แล้ว แต่ยังมี ${bad} รายการค้างส่ง` : `☁ ซิงก์แล้ว${down || up ? ` (ดึงลงมา ${down} · ส่งขึ้น ${up})` : " — ข้อมูลตรงกันแล้ว"}`);
    if(!quiet) say(bad ? "ซิงก์ไม่ครบ ลองใหม่อีกครั้ง" : "ซิงก์คลังข้อสอบกับชีทเรียบร้อย ✓");
  }catch(err){
    xmCloudMsg("⚠ ซิงก์ไม่สำเร็จ — " + ((err && (err.detail || err.message)) || "ตรวจเน็ต"));
    if(!quiet) say("ซิงก์ไม่สำเร็จ: " + ((err && (err.detail || err.message)) || "ตรวจเน็ต"));
  }finally{ xmSyncing = false; xmLibRefresh(); }
}
function xmSnap(){
  const sel = {}; Object.keys(XM.sel).forEach(g => { sel[g] = [...XM.sel[g]]; });
  return JSON.parse(JSON.stringify({ v:XM.v, grade:XM.grade, sel, cnt:XM.cnt, raw:XM.raw, lay:XM.lay, parsedRaw:XM.parsedRaw, data:XM.data, edited:XM.edited }));
}
function xmApply(sn){
  XM.v = sn.v || {}; XM.grade = sn.grade || ""; XM.cnt = sn.cnt || {}; XM.raw = sn.raw || ""; XM.lay = sn.lay || {};
  XM.parsedRaw = sn.parsedRaw || ""; XM.data = sn.data || null; XM.edited = !!sn.edited; XM.ans = false; XM.sel = {};
  Object.keys(sn.sel || {}).forEach(g => { XM.sel[g] = new Set(sn.sel[g]); });
}
/* ไม่บันทึกทับอัตโนมัติ — บันทึกเมื่อครูกดปุ่ม "บันทึกข้อสอบ" แล้วเลือกเองเท่านั้น (ฉบับที่กำลังแก้ยังจำไว้ในเบราว์เซอร์เสมอ) */
function xmLibDirty(){
  if(!XM.cur || !XM.data) return false;
  const it = xmLibGet().find(x => x.id === XM.cur); if(!it || !it.snap) return false;
  try{ return JSON.stringify(xmSnap()) !== JSON.stringify(it.snap); }catch(e){ return false; }
}
const xmLibStTxt = (name, dirty) => dirty ? `กำลังแก้ไข “${name}” · มีการแก้ไขที่ยังไม่ได้บันทึก` : `เปิดอยู่: “${name}” · บันทึกแล้ว`;
let xmLibStT = 0;
function xmLibStatusSoon(){
  clearTimeout(xmLibStT);
  xmLibStT = setTimeout(() => {
    if(!xm.view || !XM.cur) return;
    const el = $("#xmLibBox .xm-lst", xm.view); if(!el) return;
    const it = xmLibGet().find(x => x.id === XM.cur); if(!it) return;
    const d = xmLibDirty(); el.textContent = xmLibStTxt(it.name, d); el.classList.toggle("warn", d);
  }, 350);
}
/* กล่องถามแบบเลือกได้หลายปุ่ม → คืนค่า v ของปุ่มที่กด (หรือ null ถ้ายกเลิก) */
function xmAsk(title, msg, btns){
  return new Promise(res => {
    const el = document.createElement("div"); el.className = "xm-ask";
    el.innerHTML = `<div class="xm-ask-box" role="dialog" aria-modal="true"><b>${escH(title)}</b><p>${msg}</p><div class="xm-ask-btns">${btns.map((b, i) => `<button type="button" class="btn ${b.cls || "btn-outline"}" data-i="${i}">${escH(b.t)}</button>`).join("")}</div></div>`;
    const kd = e => { if(e.key === "Escape") done(null); };
    const done = v => { document.removeEventListener("keydown", kd); el.remove(); res(v); };
    el.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if(b) done(btns[+b.dataset.i].v); else if(e.target === el) done(null); });
    document.addEventListener("keydown", kd); document.body.appendChild(el);
    const f = $("button", el); if(f) f.focus();
  });
}
function xmLibName(){ return String(xs("exName") || xs("topic") || "").trim() || ("ข้อสอบ " + new Date().toLocaleDateString("th-TH")); }
async function xmLibSave(asNew){
  if(!XM.data){ say("ยังไม่มีข้อสอบให้บันทึก — สร้างข้อสอบก่อนนะครับ"); return; }
  const fmt = t => new Date(t).toLocaleString("th-TH", { day:"numeric", month:"short", year:"2-digit", hour:"2-digit", minute:"2-digit" });
  const stamp = it => { it.snap = xmSnap(); it.t = Date.now(); it.mc = XM.data.mc.length; it.wr = XM.data.wr.length; };
  const cur0 = XM.cur && xmLibGet().find(x => x.id === XM.cur);
  let target = null, defName = xmLibName();
  if(cur0 && !asNew){
    const c = await xmAsk("บันทึกข้อสอบ", `ข้อสอบนี้เปิดมาจาก <b>“${escH(cur0.name)}”</b> (บันทึกไว้เมื่อ ${fmt(cur0.t)})<br>ต้องการบันทึกอย่างไร?`, [
      { t:"💾 บันทึกทับของเดิม", v:"over", cls:"btn-primary" },
      { t:"＋ บันทึกเป็นฉบับใหม่ (ของเดิมไม่เปลี่ยน)", v:"new" },
      { t:"ยกเลิก", v:null }]);
    if(!c) return;
    if(c === "over") target = cur0; else defName = cur0.name + " (ฉบับใหม่)";
  }else if(cur0) defName = cur0.name + " (ฉบับใหม่)";
  let name = "";
  if(!target){
    const nm = prompt("ตั้งชื่อข้อสอบที่จะบันทึก", defName); if(nm === null) return;
    name = nm.trim() || defName;
    const dup = xmLibGet().find(x => String(x.name).trim() === name);
    if(dup){
      const c = await xmAsk("มีชื่อนี้อยู่แล้ว", `มีข้อสอบชื่อ <b>“${escH(dup.name)}”</b> ที่บันทึกไว้เมื่อ ${fmt(dup.t)} อยู่แล้ว<br>ต้องการบันทึกอย่างไร?`, [
        { t:"💾 บันทึกทับ “" + dup.name + "”", v:"over", cls:"btn-primary" },
        { t:"＋ บันทึกเป็นรายการใหม่ (ชื่อซ้ำกัน)", v:"new" },
        { t:"ยกเลิก", v:null }]);
      if(!c) return;
      if(c === "over") target = dup;
    }
  }
  const a = xmLibGet();
  if(target){
    const it = a.find(x => x.id === target.id);
    if(!it){ say("ไม่พบรายการเดิม — ลองบันทึกเป็นฉบับใหม่"); return; }
    stamp(it); if(!xmLibPut(a)) return; XM.cur = it.id; xmSave(); say("บันทึกทับ “" + it.name + "” แล้ว ✓"); xmCloudPush(it.id);
  }else{
    const it = { id:"x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, t:Date.now(), mc:0, wr:0, snap:null }; stamp(it);
    a.unshift(it); if(!xmLibPut(a)) return; XM.cur = it.id; xmSave(); say("บันทึกเป็นข้อสอบใหม่แล้ว ✓"); xmCloudPush(it.id);
  }
  xmLibRefresh();
}
function xmLibRefresh(){ const b = $("#xmLibBox", xm.view); if(b) b.outerHTML = xmLibBox(); }
function xmLibBox(){
  const a = xmLibGet(), cur = XM.cur && a.find(x => x.id === XM.cur), open = !!xm.libOpen;
  const fmt = t => new Date(t).toLocaleString("th-TH", { day:"numeric", month:"short", year:"2-digit", hour:"2-digit", minute:"2-digit" });
  const rows = a.length ? a.map(x => `<div class="xm-lrow${x.id === XM.cur ? " on" : ""}" data-lid="${x.id}"><div class="xm-lmeta"><b>${escH(x.name)}</b><span>ปรนัย ${x.mc || 0} · อัตนัย ${x.wr || 0} · แก้ล่าสุด ${fmt(x.t)}</span></div><div class="xm-lbtns"><button type="button" class="btn btn-primary btn-sm" data-lact="open">เปิดแก้ไข</button><button type="button" class="btn btn-outline btn-sm" data-lact="ren">✎ ชื่อ</button><button type="button" class="btn btn-outline btn-sm" data-lact="dup">⧉ ทำสำเนา</button><button type="button" class="btn btn-outline btn-sm" data-lact="del">🗑</button></div></div>`).join("")
    : `<div class="tl-sub" style="padding:8px 2px;">ยังไม่มีข้อสอบที่บันทึกไว้ — สร้างข้อสอบแล้วกด “💾 บันทึกข้อสอบ”</div>`;
  const dirtyNow = cur ? xmLibDirty() : false;
  const status = cur ? `<span class="xm-lst on${dirtyNow ? " warn" : ""}">${xmLibStTxt(escH(cur.name), dirtyNow)}</span>` : (XM.data ? `<span class="xm-lst">ยังไม่ได้บันทึกเก็บไว้</span>` : "");
  return `<div class="xm-lib" id="xmLibBox"><div class="xm-lhead"><button type="button" class="btn btn-outline btn-sm" id="xmLibTog">📚 ข้อสอบที่บันทึกไว้ (${a.length}) ${open ? "▴" : "▾"}</button>${status}<button type="button" class="btn btn-outline btn-sm" id="xmLibSave" style="margin-left:auto;">💾 บันทึกข้อสอบ</button></div>${open ? `<div class="xm-llist">${rows}<div class="xm-lfoot"><button type="button" class="btn btn-outline btn-sm" id="xmLibSync" title="ส่งขึ้น/ดึงจากชีท ExamLib ใน Google Sheet">☁ ซิงก์กับชีท</button><button type="button" class="btn btn-outline btn-sm" id="xmLibNew">＋ เริ่มข้อสอบใหม่</button>${XM.cur ? `<button type="button" class="btn btn-outline btn-sm" id="xmLibCopy">⧉ บันทึกเป็นฉบับใหม่</button>` : ""}</div><div class="tl-sub xm-cloud">${escH(xm.cloudMsg || "☁ สำรองไว้ในชีท ExamLib ของ Google Sheet อัตโนมัติ — เปลี่ยนเครื่องแล้วกด “ซิงก์กับชีท” เพื่อดึงข้อสอบมา")}</div></div>` : ""}</div>`;
}
function xmLibReload(step){
  const v = xm.view, open = XM.open; $("#xmWrap", v).innerHTML = xmFormHtml(); XM.open = open;
  xmRefs(); xmUpdate(); xmGoStep(step, false); xmScale(); xmSave();
}
function xmLibClick(e){
  const g = id => e.target.closest(id);
  if(g("#xmLibTog")){ xm.libOpen = !xm.libOpen; xmLibRefresh(); if(xm.libOpen) xmCloudSync(true); return true; }
  if(g("#xmLibSync")){ xmCloudSync(false); return true; }
  if(g("#xmLibSave") || g("#xmSaveLib")){ xmLibSave(false); return true; }
  if(g("#xmLibCopy")){ xmLibSave(true); return true; }
  if(g("#xmLibNew")){
    if(XM.data && (!XM.cur || xmLibDirty()) && !confirm(XM.cur ? "ข้อสอบนี้มีการแก้ไขที่ยังไม่ได้บันทึก — เริ่มใหม่จะหายไป ต้องการเริ่มใหม่?" : "ข้อสอบปัจจุบันยังไม่ได้บันทึก — เริ่มใหม่จะหายไป ต้องการเริ่มใหม่?")) return true;
    XM.cur = ""; XM.raw = ""; XM.data = null; XM.lay = {}; XM.parsedRaw = ""; XM.edited = false; XM.ans = false;
    xmLibReload(0); return true;
  }
  const act = g("[data-lact]"); if(!act) return false;
  const id = act.closest("[data-lid]").dataset.lid, a = xmLibGet(), it = a.find(x => x.id === id); if(!it) return true;
  const k = act.dataset.lact;
  if(k === "open"){
    if(XM.data && (!XM.cur || xmLibDirty()) && !confirm(XM.cur ? "ข้อสอบที่เปิดอยู่มีการแก้ไขที่ยังไม่ได้บันทึก — เปิดรายการนี้จะทิ้งส่วนที่แก้ ต้องการเปิด?" : "ข้อสอบปัจจุบันยังไม่ได้บันทึก — เปิดรายการนี้จะทับของเดิม ต้องการเปิด?")) return true;
    xmApply(it.snap); XM.cur = id; xm.libOpen = false; xmLibReload(it.snap.data ? 1 : 0); return true;
  }
  if(k === "ren"){ const nm = prompt("ชื่อข้อสอบ", it.name); if(nm === null || !nm.trim()) return true; it.name = nm.trim(); it.t = Date.now(); xmLibPut(a); xmLibRefresh(); xmCloudPush(it.id); return true; }
  if(k === "dup"){ const c = JSON.parse(JSON.stringify(it)); c.id = "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); c.name = it.name + " (สำเนา)"; c.t = Date.now(); a.unshift(c); xmLibPut(a); xmLibRefresh(); xmCloudPush(c.id); return true; }
  if(k === "del"){
    if(!confirm(`ลบ “${it.name}” ออกจากที่บันทึกไว้? (กู้คืนไม่ได้)`)) return true;
    xmLibPut(a.filter(x => x.id !== id)); if(XM.cur === id){ XM.cur = ""; xmSave(); } xmLibRefresh(); xmCloudDel(id); return true;
  }
  return true;
}
const xs = k => XM.v[k] === undefined ? XM_DEF[k] : XM.v[k];
const xn = k => { const n = parseInt(xs(k), 10); return Number.isFinite(n) ? Math.min(200, Math.max(0, n)) : 0; };
function xmSubject(){
  const sj = xs("subj");
  return sj === "custom" ? String(xs("subjCustom") || "").trim() : sj === "เพิ่มเติม" ? "คณิตศาสตร์เพิ่มเติม" : "คณิตศาสตร์พื้นฐาน";
}
function xmGradeFull(g){
  const a = xmAr(g).trim(), m = a.match(/^(ม|ป)\.?\s*(\d)(\s*\/\s*\d+)?/);
  return m ? (m[1] === "ม" ? "ชั้นมัธยมศึกษาปีที่ " : "ชั้นประถมศึกษาปีที่ ") + m[2] + (m[3] ? m[3].replace(/\s/g, "") : "") : (a ? "ชั้น " + a : "");
}

/* ระดับชั้นที่พิมพ์ในหัวกระดาษ: ครูกำหนดเองได้ (เช่น ใช้ตัวชี้วัด ม.5 แต่สอบ ม.4) — เว้นว่าง = ตามชั้นของตัวชี้วัดที่เลือก */
const xmHdrGrade = () => String(xs("hdrGrade") || "").trim() || XM.grade;

/* ---------- ตัวชี้วัด (ใช้ข้อมูลชุดเดียวกับแผนการสอน) ---------- */
let xmSecs = [];
const xmRefreshSecs = () => { xmSecs = XM.grade ? plBuild(XM.grade).secs : []; };
const xmSel = () => XM.sel[XM.grade] || (XM.sel[XM.grade] = new Set());
const xmAllItems = () => xmSecs.flatMap(s => s.items);
const xmPicked = () => { const s = xmSel(); return xmAllItems().filter(it => s.has(it.key)); };
function xmTally(){ let a = 0, b = 0; xmPicked().forEach(it => { const c = XM.cnt[it.key] || {}; a += parseInt(c.mc) || 0; b += parseInt(c.wr) || 0; }); return { mc:a, wr:b }; }

/* =====================================================================
   Prompt
   ===================================================================== */
const XM_DIFF = [
  ["ramp","เรียงจากง่ายไปยาก (ง่าย ๓๐% · ปานกลาง ๕๐% · ยาก ๒๐%)"],
  ["easy","ง่ายเป็นส่วนใหญ่ (ง่าย ๗๐% · ปานกลาง ๒๐% · ยาก ๑๐%)"],
  ["mid","ปานกลางเป็นส่วนใหญ่ (ง่าย ๒๐% · ปานกลาง ๖๐% · ยาก ๒๐%)"],
  ["hard","ค่อนข้างยาก (ปานกลาง ๔๐% · ยาก ๖๐%)"]
];
const XM_SYM = String.raw`- สมการ เมทริกซ์ เวกเตอร์ และสัญลักษณ์ทางคณิตศาสตร์ทุกอย่าง ให้เขียนเป็น LaTeX ครอบด้วย $...$ เช่น $x^2-5x+6=0$ · $\frac{a}{b}$ · $\sqrt{3}$ · $\vec{u}=3\vec{i}+4\vec{j}$ · $|\vec{u}|$ · $\vec{u}\cdot\vec{v}$ · $A^{-1}$ · $A^{t}$
- เมทริกซ์ใช้ $\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$ (เขียนให้อยู่ในบรรทัดเดียว) · เวกเตอร์คอลัมน์ใช้ $\begin{bmatrix} 3 \\ -2 \end{bmatrix}$
- ใช้ LaTeX เฉพาะส่วนที่เป็นสัญลักษณ์หรือนิพจน์ทางคณิตศาสตร์จริง ๆ เท่านั้น ส่วนตัวเลขธรรมดาที่ไม่มีสัญลักษณ์พิเศษ ให้พิมพ์เป็นตัวอักษรปกติ ไม่ต้องครอบ $...$ เช่น ตัวเลือก 1, 2, 3, 4 · -3 · 2.5 · 120 · 15 ตารางเมตร (ห้ามเขียนเป็น $1, 2, 3, 4$ หรือ $120$) แต่ถ้ามีเศษส่วน เลขยกกำลัง รากที่สอง ตัวแปร เซต เวกเตอร์ เมทริกซ์ หรือเครื่องหมายพิเศษ ให้ใช้ $...$ ตามข้างต้น และถ้านิพจน์เดียวมีทั้งตัวเลขและสัญลักษณ์ปนกัน ให้ครอบทั้งนิพจน์ด้วย $...$ ครั้งเดียว
- ข้อความภาษาไทยให้อยู่นอก $...$ เสมอ (ห้ามใส่ภาษาไทยในสมการ) และใช้เลขอารบิก
- ถ้าต้องการขึ้นบรรทัดใหม่ในช่องเดียวกัน ให้ใช้ // (ห้ามกด Enter กลางสมการ)`;

const XM_TABLE_RULES = String.raw`- ถ้าโจทย์ต้องมีตาราง (เช่น ตารางแจกแจงความถี่ ตารางข้อมูล ตารางค่าฟังก์ชัน) ห้ามใช้ตาราง Markdown ให้เขียนเป็น “คำสั่งตาราง” ในรูป [[T: … ]] แทรกในช่อง Q: (ต่อท้ายโจทย์) แล้วระบบจะวาดตารางเส้นขอบให้เอง ใช้ในช่องตัวเลือก A: B: C: D: และ SOL: ได้ แต่ไม่ควรใช้เกิน ๑ ตารางต่อช่อง
- ภายใน [[T: … ]] ให้เขียน ๑ บรรทัด = ๑ แถว แบ่งช่องด้วยเครื่องหมาย | และ แถวแรกคือหัวตาราง (ตัวหนา พื้นเทา) ปิดท้ายด้วย ]] ในบรรทัดสุดท้าย ตัวอย่าง:
[[T:
@title: ตารางแสดงคะแนนสอบของนักเรียน ๔๐ คน
คะแนน | ความถี่ ($f$) | ความถี่สะสม
1-10 | 5 | 5
11-20 | 12 | 17
21-30 | 23 | 40
รวม | 40 |
@total
]]
- บรรทัดที่ขึ้นต้นด้วย @ เป็นตัวเลือกของตาราง (ใส่หรือไม่ใส่ก็ได้): @title: ชื่อตาราง (อยู่เหนือตาราง) · @note: หมายเหตุใต้ตาราง · @total แถวสุดท้ายเป็นแถวรวม · @head: 2 หัวตารางมี ๒ แถว (0 = ไม่มีแถวหัวตาราง) · @rowhead คอลัมน์แรกเป็นหัวแถว · @align: l c r จัดชิดซ้าย/กลาง/ขวาทีละคอลัมน์ · @width: 80 ความกว้างเป็นเปอร์เซ็นต์ · @rowh: 9 ความสูงแถวขั้นต่ำเป็น มม. (ใช้กับตารางที่ให้นักเรียนเติม)
- ช่องที่ให้นักเรียนเติมคำตอบให้เขียน __ (ขีดล่าง ๒ ตัว) ระบบจะเว้นเป็นช่องว่าง · รวมช่อง: ใส่ < เพื่อรวมกับช่องทางซ้าย ใส่ ^ เพื่อรวมกับช่องด้านบน · ในช่องใส่สมการด้วย $…$ ได้ตามปกติ · ขึ้นบรรทัดใหม่ในช่องใช้ <br>
- ตัวเลขในตารางต้องสอดคล้องกัน ตรวจผลรวม ความถี่สะสม และค่าเฉลี่ยให้ถูกต้องก่อนส่ง · สิ่งที่โจทย์ให้นักเรียนหาจากตาราง ห้ามเขียนซ้ำในข้อความของโจทย์ · ห้ามเริ่มช่องแรกของแถวด้วยรูปแบบ “ก.” “ข.” (ระบบจะอ่านเป็นตัวเลือก)
`;
const XM_GRAPH_RULES = String.raw`- ห้ามวาดกราฟเองด้วยตัวอักษร/ASCII/รูปภาพ ให้เขียนเป็น “คำสั่งกราฟ” ในรูป [[G: …]] แทรกต่อท้ายโจทย์ (หลัง //) ระบบจะอ่านสมการ LaTeX แล้ววาดแกน x, y และเส้นกราฟให้เองพร้อมปรับขนาด
- ใช้ได้ในช่อง Q: (โจทย์) และในช่องตัวเลือก A: B: C: D: (เช่นโจทย์ “กราฟใดคือกราฟของ …” ให้ตัวเลือกแต่ละข้อเป็น [[G: …]] ล้วน ๆ) และใน SOL: ของอัตนัยได้ข้อละไม่เกิน ๑ กราฟ ห้ามใช้ในที่อื่น
- สิ่งที่โจทย์ให้นักเรียนอ่านจากกราฟ ห้ามเขียนซ้ำในข้อความ (เช่น ให้หาสมการเส้นตรงจากกราฟ ห้ามบอกสมการ ความชัน หรือจุดตัดแกนในโจทย์)
- จุดสำคัญ (จุดตัดแกน จุดยอด จุดที่ใช้คิด) ให้มีพิกัดเป็นจำนวนเต็มบนจุดตัดของตาราง เส้นกราฟต้องผ่านจุดที่ระบุจริง ให้แทนค่าตรวจก่อนส่ง และเฉลยต้องสอดคล้องกับกราฟ
- รูปแบบ: [[G: รายการที่ ๑; รายการที่ ๒; …]] เขียนทั้งหมดในบรรทัดเดียว คั่นรายการด้วย ; ใช้เลขอารบิก สมการเป็น LaTeX ไม่ต้องใส่ $ ห้ามมี // ภายใน และห้ามใช้ | (ค่าสัมบูรณ์ให้ใช้ \lvert x \rvert):
  range: xmin,xmax,ymin,ymax   ← ต้องมีเสมอ เขียนเป็นรายการแรก ช่วงแกนต้องครอบคลุมจุด/เส้นสำคัญและมีจุดกำเนิดอยู่ในช่วง เช่น range: -4,6,-3,5
  eq: สมการหรืออสมการ LaTeX (เส้นทึบ) ระบบวาดเส้นตรง พาราโบลา วงกลม วงรี ไฮเพอร์โบลา และฟังก์ชันให้เอง เช่น
      eq: y=2x+1     eq: x=3     eq: y=x^{2}-4x+3     eq: x^{2}+y^{2}=25     eq: (x-1)^{2}+(y+2)^{2}=9
      eq: \frac{x^{2}}{9}+\frac{y^{2}}{4}=1     eq: y=\sqrt{x}     eq: y=2^{x}     eq: y=\log_{2} x     eq: y=\lvert x \rvert     eq: y=\sin x
      ใช้ได้เฉพาะตัวแปร x และ y กับ + - \cdot \times \frac{}{} ^{} \sqrt{} \lvert \rvert \sin \cos \tan \ln \log \log_{a} e \pi
  eqd: เหมือน eq แต่วาดเป็นเส้นประ
  อสมการ (\leq \geq < >) ใน eq: ระบบแรเงาบริเวณคำตอบให้เอง (ถ้าเป็น < > เส้นขอบเป็นเส้นประอัตโนมัติ) ถ้าต้องการแรเงาเฉพาะส่วนที่จริงทุกเงื่อนไขพร้อมกัน ใช้ reg: เงื่อนไข1 & เงื่อนไข2 เช่น reg: x\geq 0 & y\geq 0 & x+y\leq 4
  pt: A(2,3) = จุดพร้อมชื่อ (ไม่แสดงพิกัด)     ptc: A(2,3) = จุดพร้อมชื่อและพิกัด (ใช้เป็นหลัก)     dot: (2,3) = จุดไม่มีชื่อ
  seg: (0,0)-(3,4) = ส่วนของเส้นตรง (ใส่หลายจุดต่อกันเป็นเส้นหักได้)     segd: ... = เส้นประ     poly: (0,0)-(4,0)-(2,3) = รูปหลายเหลี่ยมปิด     polyf: ... = รูปหลายเหลี่ยมแรเงา
  ติดชื่อเส้น/รูป: เติม  ~ ชื่อ  ท้ายรายการ eq, eqd, seg, poly เช่น eq: y=2x+1 ~ l_{1}     วางข้อความ: txt: ชื่อ @ (x,y)
  ไม่บังคับ: step: 1 (ระยะขีดบนแกน)  grid: off (ปิดเส้นตาราง)  num: off (ปิดตัวเลขบนแกน)  ratio: free (สเกลแกน x, y ไม่เท่ากัน)
- ตัวอย่างรูปแบบเท่านั้น (ห้ามลอกเนื้อหา):
  Q: จากกราฟ จงหาความชันของเส้นตรง $l$ // [[G: range: -3,6,-3,6; eq: y=\frac{1}{2}x+1 ~ l; ptc: A(0,1); ptc: B(4,3)]]
  Q: กราฟใดเป็นกราฟของ $y=2^{x}$     A: [[G: range: -3,3,-1,5; eq: y=2^{x}]]     B: [[G: range: -3,3,-1,5; eq: y=\log_{2} x]]`;

function xmPrompt(){
  const subj = xmSubject() || "คณิตศาสตร์", g = XM.grade;
  const n1 = xn("n1"), s1 = xn("s1"), n2 = xn("n2"), s2 = xn("s2");
  const topic = String(xs("topic") || "").trim(), time = String(xs("time") || "").trim(), note = String(xs("note") || "").trim();
  const picked = xmPicked(), lay = xs("lay"), L = [];
  L.push("คุณเป็นครูคณิตศาสตร์ผู้เชี่ยวชาญด้านการวัดและประเมินผล ช่วยออกข้อสอบตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน (ฉบับปรับปรุง พ.ศ. ๒๕๖๐) ตามรายละเอียดด้านล่าง", "⚠ สำคัญ: คำตอบสุดท้ายต้องเป็น code block เดียวที่พร้อมให้ครูกดคัดลอกไปวางได้ทันที (ดูรายละเอียดในหัวข้อ “รูปแบบคำตอบ” ท้ายข้อความนี้)", "");
  L.push("## ข้อมูลข้อสอบ", `- รายวิชา: ${subj}`);
  if(g) L.push(`- ระดับชั้น: ${g}`);
  const hgc = String(xs("hdrGrade") || "").trim();
  if(hgc && hgc !== g) L.push(g ? `- ระดับชั้นของผู้สอบจริง: ${hgc} (ตัวชี้วัดอ้างอิงจากชั้น ${g} — ให้ปรับภาษา ตัวเลข และความยากให้เหมาะกับผู้เรียนชั้น ${hgc} แต่ยังต้องอยู่ในขอบเขตของตัวชี้วัดที่เลือก)` : `- ระดับชั้นของผู้สอบ: ${hgc}`);
  if(topic) L.push(`- เรื่อง/ขอบเขตเนื้อหา: ${topic}`);
  if(time) L.push(`- เวลาสอบ: ${time} (ปริมาณข้อสอบต้องทำเสร็จทันเวลานี้)`);
  L.push("", "## ตัวชี้วัดที่ใช้เป็นกรอบการออกข้อสอบ");
  if(picked.length){
    L.push("ทุกข้อต้องวัดตัวชี้วัดข้อใดข้อหนึ่งด้านล่างเท่านั้น ห้ามออกนอกขอบเขต และต้องครอบคลุมทุกตัวชี้วัด (ถ้ากำหนดจำนวนข้อไว้ให้ทำตามนั้น ส่วนที่ไม่ได้กำหนดให้กระจายตามความเหมาะสม)");
    picked.forEach((it, i) => {
      const c = XM.cnt[it.key] || {}, a = parseInt(c.mc) || 0, b = parseInt(c.wr) || 0;
      const need = [a ? `ปรนัย ${a} ข้อ` : "", b ? `อัตนัย ${b} ข้อ` : ""].filter(Boolean).join(", ");
      L.push(`${i + 1}. [${it.code}] ${it.text}${need ? ` → กำหนด: ${need}` : ""}`);
    });
    const kcn = kiContentLines(xmSecs, xmSel());
    if(kcn.length){ L.push("", "## สาระการเรียนรู้แกนกลางของตัวชี้วัดข้างต้น (กรอบเนื้อหา — ออกข้อสอบเฉพาะส่วนที่ตรงกับเรื่อง/ขอบเขต ห้ามออกนอกกรอบ)"); kcn.forEach(x => L.push(x)); }
  }else L.push("ครูไม่ได้เลือกตัวชี้วัด: ให้ออกข้อสอบตามเรื่อง/ขอบเขตที่ระบุ และในช่อง IND ให้ระบุตัวชี้วัดแกนกลางที่ข้อนั้นวัด (ครูจะตรวจอีกครั้ง)");
  L.push("", "## โครงข้อสอบ");
  if(n1) L.push(`- ตอนที่ ๑ ปรนัย ๔ ตัวเลือก (ก ข ค ง) ${n1} ข้อ รวม ${s1} คะแนน — ถูกเพียง ๑ ตัวเลือก ตัวลวงต้องสมเหตุสมผล (มาจากข้อผิดพลาดที่นักเรียนมักทำ) และกระจายตำแหน่งคำตอบที่ถูกให้ใกล้เคียงกัน`);
  if(n1) L.push(`- การสลับตำแหน่งคำตอบปรนัย (สำคัญ): ต้องสุ่มตำแหน่งคำตอบที่ถูกให้สลับกันจริง ๆ ห้ามเรียงเป็นแพทเทิร์นซ้ำ ๆ เช่น ก ข ค ง ก ข ค ง หรือ ก ข ค ง ต่อกันไปเรื่อย ๆ · ห้ามให้คำตอบเดียวกันติดกันเกิน ๒ ข้อ · ทั้งชุดให้ ก ข ค ง ปรากฏเป็นคำตอบจำนวนใกล้เคียงกัน (เช่น ${n1} ข้อ ต่างกันไม่เกิน ๑–๒ ข้อ) · ตัวเลือกที่เป็นตัวเลขให้เรียงจากน้อยไปมากหรือมากไปน้อยได้ตามธรรมชาติ แต่ตำแหน่งของคำตอบที่ถูกยังต้องกระจายตามกฎนี้ · ก่อนส่งให้ตรวจลำดับ ANS ทั้งชุดอีกครั้ง ถ้าเห็นแพทเทิร์นให้สลับตัวเลือกในข้อนั้นใหม่`);
  if(n2) L.push(`- ตอนที่ ${n1 ? "๒" : "๑"} อัตนัย ${n2} ข้อ รวม ${s2} คะแนน — ระบุคะแนนแต่ละข้อ (จำนวนเต็ม รวมกันได้ ${s2}) ข้อที่ต้องทำหลายขั้นตอนให้คะแนนมากกว่า`);
  L.push(`- ระดับความยาก: ${(XM_DIFF.find(x => x[0] === xs("diff")) || XM_DIFF[0])[1]} และเรียงจากง่ายไปยากในแต่ละตอน`);
  L.push("", "## สูตรที่พิมพ์ไว้ส่วนหัวของข้อสอบ");
  if(xs("formula")){
    const ft = String(xs("formulaTxt") || "").trim();
    if(ft) L.push("ครูกำหนดสูตรไว้แล้ว ระบบจะพิมพ์ให้เอง ไม่ต้องเขียน FORMULA — ให้ข้อสอบใช้สูตรเหล่านี้เป็นหลัก:", ...ft.split(/\n/).map(x => "  " + x.trim()).filter(x => x.trim()));
    else L.push("ให้เขียนสูตรที่นักเรียนต้องใช้ในข้อสอบนี้ไว้บรรทัดแรกของคำตอบ ในรูป  FORMULA: $สูตร1$ ;; $สูตร2$ ;; ...  (คั่นด้วย ;;) เฉพาะสูตรที่จำเป็นจริง ไม่เกิน ๘ สูตร");
  }else L.push("ข้อสอบนี้ไม่พิมพ์สูตร — ไม่ต้องเขียน FORMULA");
  L.push("", "## การเขียนสัญลักษณ์", XM_SYM);
  const gm = xs("gmode");
  if(gm === "some" || gm === "many"){
    L.push("", "## กราฟประกอบโจทย์", gm === "many" ? "- ให้ประมาณครึ่งหนึ่งของข้อที่เนื้อหาเหมาะกับการให้กราฟ มีกราฟประกอบ (กระจายทั้งช่วงง่ายและยาก) ข้ออื่นเป็นโจทย์ข้อความล้วน" : "- เลือกข้อที่เนื้อหาเหมาะกับการให้กราฟ ประมาณ ๑ ใน ๔ ของทั้งชุด ให้มีกราฟประกอบ ข้ออื่นเป็นโจทย์ข้อความล้วน", XM_GRAPH_RULES);
  }
  const tm = xs("tmode");
  if(tm === "some" || tm === "many"){
    L.push("", "## ตารางประกอบโจทย์", tm === "many" ? "- ให้ประมาณครึ่งหนึ่งของข้อที่เนื้อหาเหมาะกับการให้ตารางข้อมูล มีตารางประกอบ (กระจายทั้งช่วงง่ายและยาก) ข้ออื่นเป็นโจทย์ข้อความล้วน" : "- เลือกข้อที่เนื้อหาเหมาะกับการให้ตารางข้อมูล ประมาณ ๑ ใน ๔ ของทั้งชุด ให้มีตารางประกอบ ข้ออื่นเป็นโจทย์ข้อความล้วน", XM_TABLE_RULES);
  }
  L.push("", "## รูปแบบคำตอบ (สำคัญมาก ระบบจะอ่านอัตโนมัติ)");
  L.push("ต้องส่งคำตอบทั้งหมดในรูปแบบที่คัดลอกได้ทันที: ใส่คำตอบทั้งหมดไว้ใน code block เดียว (เริ่มด้วย ``` บรรทัดแรก และจบด้วย ``` บรรทัดสุดท้าย) เพื่อให้ครูกดปุ่มคัดลอกได้ในคลิกเดียว ห้ามแยกเป็นหลาย code block ห้ามมีข้อความอื่นนอก code block (ไม่ต้องทักทาย ไม่ต้องอธิบายก่อนหรือหลัง) และห้ามแปลง $...$ หรือสัญลักษณ์ LaTeX เป็นรูปแบบแสดงผลอื่น ให้คงเป็นข้อความดิบตามที่เขียน", "");
  L.push("ตอบตามรูปแบบนี้เท่านั้น ห้ามมีคำอธิบายนอกรูปแบบ ห้ามใช้ตารางแบบ Markdown (เครื่องหมาย | และ ---) ห้ามใส่ ก. ข. ค. ง. ซ้ำในช่อง A–D และต้องเว้น ๑ บรรทัดระหว่างข้อ", "");
  if(n1){
    L.push(`ตอนปรนัย — ส่ง [[MC 1]] ถึง [[MC ${n1}]]`, "[[MC 1]]", "IND: รหัสตัวชี้วัดที่ข้อนี้วัด (คัดลอกตามด้านบน)",
      lay === "1" ? "LAY: 1" : lay === "2" ? "LAY: 2" : "LAY: 1 หรือ 2",
      "Q: โจทย์", "A: ตัวเลือก ก", "B: ตัวเลือก ข", "C: ตัวเลือก ค", "D: ตัวเลือก ง", "ANS: ก หรือ ข หรือ ค หรือ ง", "SOL: วิธีคิดสั้น ๆ (๑–๓ บรรทัด)", "");
    if(lay === "auto") L.push("LAY: 1 = ตัวเลือกเรียงลงทีละบรรทัด (ใช้เมื่อตัวเลือกยาว) · 2 = จัด ๒ บรรทัด คือ ก ข อยู่บรรทัดบน ค ง อยู่บรรทัดล่าง (ใช้เมื่อตัวเลือกสั้น เช่น ตัวเลข เมทริกซ์ เวกเตอร์)", "");
  }
  if(n2){
    L.push(`ตอนอัตนัย — ส่ง [[WR 1]] ถึง [[WR ${n2}]]`, "[[WR 1]]", "IND: รหัสตัวชี้วัด", "PTS: คะแนนของข้อนี้ (จำนวนเต็ม)", "LINES: จำนวนบรรทัดเส้นประที่เหมาะกับวิธีทำ (๔–๒๔)", "Q: โจทย์",
      "SOL: วิธีทำอย่างละเอียดทีละขั้น (ขึ้นบรรทัดใหม่ด้วย //)", "ANS: คำตอบสุดท้ายสั้น ๆ", "");
  }
  L.push("ก่อนส่ง ให้คำนวณตรวจเฉลยทุกข้อซ้ำอีกครั้ง และตรวจว่าโจทย์ทุกข้ออยู่ในตัวชี้วัดที่กำหนด");
  L.push("", "⚠ ย้ำรูปแบบการส่ง: ตอบเป็น code block เดียว (เปิด ``` และปิด ```) ที่พร้อมคัดลอกได้ทันที ห้ามมีข้อความใดนอก code block และถ้าไม่แน่ใจว่าข้อความจะคัดลอกได้ครบ ให้ใส่ทั้งหมดใน code block นั้นเสมอ");
  if(note) L.push("", "## หมายเหตุเพิ่มเติมจากครู", note);
  return L.join("\n");
}

/* =====================================================================
   อ่านคำตอบของ AI
   ===================================================================== */
const xmOdd = s => ((String(s).match(/(?<!\\)\$/g) || []).length % 2) === 1;
function xmParse(raw){
  const out = { mc:[], wr:[], formula:[], warn:[] }, fRaw = [];
  const KEY = /^(IND|LAY|Q|ANS|SOL|PTS|LINES|FORMULA|A|B|C|D|E)\s*(?:\*\*|__)?\s*[:：]\s*(?:\*\*|__)?\s*(.*)$/i;
  const HEAD = /^(?:#+\s*)?(?:\*\*|__|`)*\[\[\s*(MC|WR|ปรนัย|อัตนัย)\s*[-_ ]?\s*\d*\s*\]\](?:\*\*|__|`)*\s*$/i;
  const THC = /^([กขคงจ])\s*[.)：:]\s*(.*)$/;
  let cur = null, tgt = null;
  const add = (t, s) => { if(!s) return; t.o[t.k] = (t.o[t.k] ? t.o[t.k] + (xmOdd(t.o[t.k]) ? " " : "\n") : "") + s; };
  const fld = () => ({ IND:"", LAY:"", Q:"", ANS:"", SOL:"", PTS:"", LINES:"" });
  String(raw || "").replace(/\r/g, "").split("\n").forEach(line0 => {
    if(/^\s*```/.test(line0)) return;
    let line = line0.replace(/^\s*(?:\*\*|__|`)+(?=\s*(?:IND|LAY|Q|ANS|SOL|PTS|LINES|FORMULA|[A-E])\b)/i, "").replace(/^\s*[-*•]\s+(?=(?:IND|LAY|Q|ANS|SOL|PTS|LINES|FORMULA|[A-E])\s*[:：])/i, "").trim();
    let m;
    if((m = line.match(HEAD))){
      cur = { type: /^(MC|ปรนัย)$/i.test(m[1]) ? "mc" : "wr", f:fld(), ch:[] }; (cur.type === "mc" ? out.mc : out.wr).push(cur); tgt = null; return;
    }
    if((m = line.match(KEY))){
      const k = m[1].toUpperCase(), val = m[2].replace(/(?:\*\*|__)\s*$/, "").trim();
      if(k === "FORMULA"){ tgt = { o:{ f:"" }, k:"f" }; fRaw.push(tgt.o); add(tgt, val); return; }
      if(!cur) return;
      if(/^[A-E]$/.test(k)){ const i = "ABCDE".indexOf(k); while(cur.ch.length <= i) cur.ch.push(""); tgt = { o:cur.ch, k:i }; add(tgt, val); return; }
      tgt = { o:cur.f, k }; add(tgt, val); return;
    }
    if(cur && cur.type === "mc" && cur.f.Q && (m = line.match(THC))){
      const i = XM_L.indexOf(m[1]); while(cur.ch.length <= i) cur.ch.push(""); tgt = { o:cur.ch, k:i }; add(tgt, m[2].trim()); return;
    }
    if(line && tgt) add(tgt, line);
  });
  out.formula = fRaw.map(o => o.f).join("\n").split(/;;|\n/).map(x => x.trim()).filter(Boolean);
  const ansIdx = s => { const m = String(s || "").match(/[ก-จ]|[A-Ea-e]/); if(!m) return -1; const c = m[0]; return /[ก-จ]/.test(c) ? XM_L.indexOf(c) : "ABCDE".indexOf(c.toUpperCase()); };
  out.mc = out.mc.map((c, i) => {
    const ch = c.ch.map(x => String(x || "").trim()); while(ch.length && !ch[ch.length - 1]) ch.pop();
    const it = { n:i + 1, ind:c.f.IND.trim(), lay:parseInt(c.f.LAY) === 2 ? 2 : parseInt(c.f.LAY) === 1 ? 1 : 0, q:c.f.Q.trim(), ch, ans:ansIdx(c.f.ANS), sol:c.f.SOL.trim() };
    if(!it.q) out.warn.push(`ปรนัยข้อ ${it.n}: ไม่พบโจทย์ (Q:)`);
    if(ch.length < 2) out.warn.push(`ปรนัยข้อ ${it.n}: ตัวเลือกไม่ครบ`);
    else if(ch.length !== 4) out.warn.push(`ปรนัยข้อ ${it.n}: มี ${ch.length} ตัวเลือก (ปกติ ๔)`);
    if(it.ans < 0 || it.ans >= ch.length) out.warn.push(`ปรนัยข้อ ${it.n}: ไม่พบเฉลย (ANS:)`);
    return it;
  });
  out.wr = out.wr.map((c, i) => {
    const pts = parseFloat(c.f.PTS), ln = parseInt(c.f.LINES);
    const it = { n:i + 1, ind:c.f.IND.trim(), pts:Number.isFinite(pts) && pts > 0 ? pts : 0, lines:Number.isFinite(ln) && ln > 0 ? Math.min(40, ln) : 0, q:c.f.Q.trim(), sol:c.f.SOL.trim(), ans:c.f.ANS.trim() };
    if(!it.q) out.warn.push(`อัตนัยข้อ ${it.n}: ไม่พบโจทย์ (Q:)`);
    return it;
  });
  const chkT = (lb, fs) => fs.forEach(f => { const t = String(f || ""), o = (t.match(/\[\[\s*T\s*[:：]/gi) || []).length, k = (t.match(/\[\[\s*T\s*[:：][\s\S]*?\]\]/gi) || []).length; if(o > k) out.warn.push(`${lb}: ตาราง [[T: …]] ไม่ได้ปิดด้วย ]]`); });
  out.mc.forEach(it => chkT(`ปรนัยข้อ ${it.n}`, [it.q, it.sol, ...it.ch])); out.wr.forEach(it => chkT(`อัตนัยข้อ ${it.n}`, [it.q, it.sol, it.ans]));
  return out;
}
function xmAutoLay(it){
  const t = it.ch.map(x => x.replace(/\[\[\s*T\s*[:：][\s\S]*?\]\]/gi, "x".repeat(30)).replace(/\[\[\s*G\s*[:：][\s\S]*?\]\]/gi, "xxxxxx").replace(/\$[^$]*\$/g, mm => mm.length > 44 ? "x".repeat(24) : "xxxxxx"));
  return Math.max(0, ...t.map(x => x.length)) <= 22 ? 2 : 1;
}
function xmLayOf(it){
  if(it.lo === 1 || it.lo === 2) return it.lo;
  const mo = parseInt(XM.lay[it.n]); if(mo === 1 || mo === 2) return mo;
  const g = xs("lay"); if(g === "1") return 1; if(g === "2") return 2;
  return it.lay || xmAutoLay(it);
}

/* =====================================================================
   เอกสารข้อสอบ (HTML สำหรับพรีวิว / พิมพ์) — สมการด้วย KaTeX
   ===================================================================== */
/* กล่องกราฟ (มม.) ตามตำแหน่งที่วาง: โจทย์ปรนัย / ตัวเลือก (2 บรรทัด, 1 บรรทัด) / โจทย์-เฉลยอัตนัย / เฉลยปรนัย */
const XM_GBOX = { mc:{ w:72, h:56 }, ch2:{ w:34, h:34 }, ch1:{ w:54, h:44 }, wr:{ w:88, h:64 }, sol:{ w:64, h:50 } };
const XM_GRE = /\[\[\s*G\s*[:：]([\s\S]*?)\]\]/gi;
/* =====================================================================
   ตารางในข้อสอบ — [[T: … ]]  (๑ บรรทัด = ๑ แถว · แบ่งช่องด้วย | · แถวแรกเป็นหัวตาราง · บรรทัด @ = ตัวเลือก)
   ===================================================================== */
const XT_RE = /\[\[\s*T\s*[:：]([\s\S]*?)\]\]/gi;
function xtSplit(str, rowMode){
  const out = []; let cur = "", math = false;
  for(let i = 0; i < str.length; i++){
    const ch = str[i];
    if(ch === "\\" && i + 1 < str.length){ if(!math && !rowMode && str[i + 1] === "|") cur += "|"; else cur += ch + str[i + 1]; i++; continue; }
    if(ch === "$") math = !math;
    if(!math){
      if(rowMode){
        if(ch === "\n"){ out.push(cur); cur = ""; continue; }
        if(str.startsWith(";;", i) || str.startsWith("//", i)){ out.push(cur); cur = ""; i++; continue; }
      }else if(ch === "|"){ out.push(cur); cur = ""; continue; }
    }
    cur += ch;
  }
  out.push(cur); return out;
}
function xtHtml(spec){
  try{
    const opt = { head:1, align:[], width:0, rowh:0, total:false, rowhead:false, title:"", note:"" }, rows = [];
    xtSplit(String(spec || ""), true).forEach(l0 => {
      const l = l0.trim(); if(!l) return;
      const m = l.match(/^@\s*([A-Za-z]+)\s*(?:[:：]\s*(.*))?$/);
      if(m){
        const k = m[1].toLowerCase(), v = (m[2] || "").trim(), off = /^(0|no|false|off)$/i.test(v);
        if(k === "title") opt.title = v;
        else if(k === "note") opt.note = v;
        else if(k === "align") opt.align = v.split(/[\s,]+/).filter(Boolean).map(x => ({ l:"left", c:"center", r:"right" })[x.toLowerCase()] || "center");
        else if(k === "width"){ const n = parseFloat(v); if(n > 0) opt.width = Math.min(100, n); }
        else if(k === "head"){ const n = parseInt(v, 10); opt.head = Number.isFinite(n) ? Math.max(0, Math.min(4, n)) : 1; }
        else if(k === "rowh"){ const n = parseFloat(v); if(n > 0) opt.rowh = Math.min(40, n); }
        else if(k === "total") opt.total = !off;
        else if(k === "rowhead") opt.rowhead = !off;
        return;
      }
      rows.push(xtSplit(l, false).map(c => c.trim()));
    });
    if(!rows.length) return `<div class="fg gerr">⚠ ตาราง: ไม่พบข้อมูลในตาราง</div>`;
    const R = rows.length, C = Math.max(...rows.map(r => r.length));
    rows.forEach(r => { while(r.length < C) r.push(""); });
    const skip = rows.map(() => Array(C).fill(false));
    const cell = s => /^_{2,}$/.test(s) ? "&nbsp;" : (escH(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/&lt;br&gt;/gi, "<br>") || "&nbsp;");
    let h = "";
    rows.forEach((r, ri) => {
      const hd = ri < opt.head, tot = opt.total && ri === R - 1 && R > opt.head;
      let tr = "";
      for(let ci = 0; ci < C; ci++){
        if(skip[ri][ci]) continue;
        let t = r[ci], cs = 1, rs = 1;
        if(t === "<" || t === "^") t = "";
        else{
          while(ci + cs < C && r[ci + cs] === "<") cs++;
          while(ri + rs < R && rows[ri + rs][ci] === "^") rs++;
        }
        for(let a = 0; a < rs; a++) for(let b = 0; b < cs; b++) if(a || b) skip[ri + a][ci + b] = true;
        const tag = hd ? "th" : "td", cls = (!hd && opt.rowhead && ci === 0 ? " class=\"rh\"" : "");
        const al = opt.align[ci] && opt.align[ci] !== "center" ? ` style="text-align:${opt.align[ci]}"` : "";
        tr += `<${tag}${cls}${cs > 1 ? ` colspan="${cs}"` : ""}${rs > 1 ? ` rowspan="${rs}"` : ""}${al}>${cell(t)}</${tag}>`;
      }
      h += `<tr${tot ? ' class="tot"' : ""}${!hd && opt.rowh ? ` style="height:${opt.rowh}mm"` : ""}>${tr}</tr>`;
    });
    return `<div class="xtw">${opt.title ? `<div class="xtc">${cell(opt.title)}</div>` : ""}<table class="xt"${opt.width ? ` style="width:${opt.width}%"` : ""}>${h}</table>${opt.note ? `<div class="xtn">${cell(opt.note)}</div>` : ""}</div>`;
  }catch(e){ return `<div class="fg gerr">⚠ ตาราง: อ่านไม่ได้ (${escH(e.message)})</div>`; }
}
const xmTx = (s, box) => {
  const gs = [], ts = [];
  const t = String(s ?? "").replace(XT_RE, (m, sp) => { ts.push(sp); return "\uE002" + (ts.length - 1) + "\uE003"; }).replace(XM_GRE, (m, sp) => { gs.push(sp); return "\uE000" + (gs.length - 1) + "\uE001"; });
  const h = escH(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/[ \t]*\/\/[ \t]*/g, "<br>").replace(/\n/g, "<br>").replace(/(?:<br>)?\s*\uE002(\d+)\uE003\s*(?:<br>)?/g, (m, i) => xtHtml(ts[+i]));
  return h.replace(/(?:<br>)?\s*\uE000(\d+)\uE001\s*(?:<br>)?/g, (m, i) => gxHtml(gs[+i], box || XM_GBOX.mc, gs.length));
};
const xmCss = s => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
const XM_MATH = 0.85;
const XM_DOTS = "…".repeat(150);
const XM_FONT_URL = EX_FONT_URL;
const XM_KATEX_CSS = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">';
const XM_KATEX_JS = '<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script><script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>';
function xmDoc(opt){
  const d = XM.data || { mc:[], wr:[], formula:[] }, ans = !!opt.ans, print = !!opt.print;
  const subj = xmSubject(), gS = xmAr(xmHdrGrade()).trim(), gFull = xmGradeFull(xmHdrGrade());
  const mc = d.mc, wr = d.wr, s1 = mc.length ? xn("s1") : 0, s2 = wr.length ? xn("s2") : 0, total = s1 + s2;
  const fs = [14,15,16,17,18].includes(+xs("fs")) ? +xs("fs") : 16, cols2 = xs("cols") !== "1";
  const hdr = ["ข้อสอบ", subj ? "วิชา" + subj : "", gS].filter(Boolean).join(" ") + (ans ? " (เฉลย)" : "");
  const month = String(xs("month") || "").trim(), time = String(xs("time") || "").trim(), exName = String(xs("exName") || "").trim();
  const dots = n => `<i class="dl${n ? "" : " w"}"></i>`;
  /* ส่วนหัว */
  let head = `<div class="top1">${escH(hdr)} หน้าที่ 1</div><h1>${escH(subj || "ข้อสอบ")}</h1>${exName ? `<div class="exn">${escH(exName)}</div>` : ""}`
    + `<div class="row"><span>${escH(gFull)}</span><span>${escH(month)}</span></div>`
    + `<div class="row"><span>${total ? `คะแนน ${total} คะแนน` : ""}</span><span>${time ? "เวลา " + escH(time) : ""}</span></div>`
    + (xs("nameLine") ? `<div class="row nm"><span class="f2">ชื่อ <i class="dl"></i></span><span class="f1">ชั้น <i class="dl"></i></span><span class="f1">เลขที่ <i class="dl"></i></span></div>` : "")
    + `<div class="ru"></div>`;
  const pl = [];
  if(mc.length) pl.push(`ตอนที่ ${pl.length + 1} เป็นข้อสอบปรนัย ${mc.length} ข้อ ${s1} คะแนน`);
  if(wr.length) pl.push(`ตอนที่ ${pl.length + 1} เป็นข้อสอบอัตนัย ${wr.length} ข้อ ${s2} คะแนน`);
  head += `<div class="ins"><b class="insl"><u>คำสั่ง</u></b><div class="insa">ข้อสอบมี ${pl.length} ตอน</div><div class="insb">${pl.join("<br>")}</div></div>`;
  /* สูตร */
  if(xs("formula")){
    const ft = String(xs("formulaTxt") || "").trim();
    const fm = (ft ? ft.split(/\n|;;/) : d.formula).map(x => x.trim()).filter(Boolean)
      .map(f => (!/\$/.test(f) && /[\\^_{}]/.test(f)) ? "$" + f + "$" : f);
    if(fm.length) {
      const segs = f => { const m = f.match(/\$[^$]+\$/g); return m && m.length > 1 && !f.replace(/\$[^$]+\$/g, "").trim() ? m : [f]; };
      const items = f => segs(f).map(x => `<span class="fi">${xmTx(x)}</span>`).join("");
      head += `<div class="fm"><b><u>สูตร</u></b><div>${ft ? fm.map(f => `<div class="fr">${items(f)}</div>`).join("") : fm.map(items).join("")}</div></div>`;
    }
  }
  /* ปรนัย */
  const mcQ = it => {
    const lay = xmLayOf(it);
    const chs = it.ch.map((c, i) => `<div class="c${ans && i === it.ans ? " ok" : ""}"><span class="cl">${XM_L[i]}.</span><span class="ct">${xmTx(c, lay === 2 ? XM_GBOX.ch2 : XM_GBOX.ch1)}</span></div>`).join("");
    const key = ans ? `<div class="key"><b>เฉลย ${it.ans >= 0 && it.ans < it.ch.length ? XM_L[it.ans] : "?"}</b>${it.sol ? " — " + xmTx(it.sol, XM_GBOX.sol) : ""}${it.ind ? `<span class="ind">${escH(it.ind)}</span>` : ""}</div>` : "";
    return `<div class="q"><div class="qn">${it.n}.</div><div class="qb"><div class="qt">${xmTx(it.q, XM_GBOX.mc)}</div><div class="ch g${lay}">${chs}</div>${key}</div></div>`;
  };
  let body = "", pn = 0;
  if(mc.length){
    pn++;
    body += `<div class="pt">ตอนที่ ${pn} ให้นักเรียนเลือกคำตอบที่ถูกต้องเพียงข้อเดียว</div><div class="cols${cols2 ? "" : " c1"}">${mc.map(mcQ).join("")}</div>`;
    if(ans){
      const per = 10, nOpt = Math.max(4, ...mc.map(it => it.ch.length));
      let grid = "";
      for(let s = 0; s < mc.length; s += per){
        const part = mc.slice(s, s + per);
        grid += `<div class="bs"><div class="bsh"><i></i>${Array.from({length:nOpt}, (_, k) => `<b>${XM_L[k]}</b>`).join("")}</div>${part.map(it => `<div class="bsr"><i>${it.n}</i>${Array.from({length:nOpt}, (_, k) => `<u${it.ans === k ? ' class="on"' : ""}></u>`).join("")}</div>`).join("")}</div>`;
      }
      body += `<div class="sum"><b>สรุปเฉลยปรนัย</b><div class="bsw">${grid}</div></div>`;
    }
  }
  /* กระดาษคำตอบ (ภาพ image/Answer.png) */
  if(mc.length && !ans && xs("sheet")){
    const src = new URL("image/Answer.png", location.href).href;
    body += `<div class="as${xs("newPage") ? " pb" : ""}"><div class="asn"><b><u>คำชี้แจง</u></b> ให้นักเรียนฝนคำตอบด้วยดินสอหรือปากกา ภายในวงกลมให้ถูกต้อง (ห้ามขีดเขียน ■)</div><div class="asi"><img src="${escH(src)}" alt="กระดาษคำตอบ" onerror="this.outerHTML='<div class=&quot;aserr&quot;>ไม่พบไฟล์ image/Answer.png</div>'"></div></div>`;
  }
  /* อัตนัย */
  if(wr.length){
    pn++;
    const dp = Math.max(1, Math.round((s2 / wr.length) * 2) / 2);
    body += `<div class="pt${mc.length && xs("newPage") && !(!ans && xs("sheet")) ? " pb" : ""}">ตอนที่ ${pn} ข้อสอบอัตนัย ${wr.length} ข้อ จงแสดงวิธีทำอย่างละเอียด <span class="pn">(ให้คะแนนจากวิธีทำ)</span></div>`;
    body += wr.map(it => {
      const pts = it.pts || dp, nl = it.lines || Math.max(5, Math.round(pts * 3));
      const inner = ans
        ? `<div class="sol"><b>วิธีทำ</b> ${it.sol ? xmTx(it.sol, XM_GBOX.wr) : "-"}${it.ans ? `<div class="sa"><b>ตอบ</b> ${xmTx(it.ans, XM_GBOX.sol)}</div>` : ""}${it.ind ? `<span class="ind">${escH(it.ind)}</span>` : ""}</div>`
        : xs("dots") ? `<div class="dls">${"<i></i>".repeat(nl)}</div>` : `<div style="height:${nl * 8}mm"></div>`;
      return `<div class="w"><div class="wh"><span class="wn">${it.n})</span><span class="wt">${xmTx(it.q, XM_GBOX.wr)}</span><span class="wp">(${pts} คะแนน)</span></div>${inner}</div>`;
    }).join("");
  }
  if(!body) body = `<p>ยังไม่มีข้อสอบ</p>`;
  const FAM = "'KCThai','TH Sarabun New','TH SarabunPSK','TH Sarabun','Sarabun',Tahoma,sans-serif";
  const css = `
@font-face{font-family:"KCThai"; src:local("TH Sarabun New"), local("THSarabunNew"), local("TH SarabunPSK"), local("THSarabunPSK"), local("TH Sarabun")${XM_FONT_URL ? `, url("${XM_FONT_URL}")` : ""};}
${print ? `@page{size:A4; margin:18mm 15mm 16mm 15mm;}` : ""}
html,body{margin:0; background:#fff;}
body{font-family:${FAM}; font-size:${fs}pt; line-height:1.28; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
.paper{box-sizing:border-box;}
.top1{text-align:right; margin-bottom:3pt;}
h1{font-size:1.15em; text-align:center; margin:0 0 2pt;} .exn{text-align:center; margin-bottom:2pt;}
.row{display:flex; justify-content:space-between; gap:12pt;} .row.nm{margin-top:2pt;} .row.nm .f2{flex:3;} .row.nm .f1{flex:1.3;}
.row.nm span{display:flex; align-items:flex-end; gap:4pt; white-space:nowrap; min-width:0; overflow:hidden;}
.dl{display:inline-block; flex:1; width:0; min-width:30pt; height:1.2em; line-height:1.2em; overflow:hidden; white-space:nowrap;} .dl::before{content:"${XM_DOTS}";}
.ru{border-top:1.6pt solid #000; margin:4pt 0 6pt;}
.ins,.fm{display:flex; gap:8pt; margin-bottom:2pt;} .fm > div{flex:1;} .insl{flex:0 0 auto;} .insa{flex:0 0 auto; white-space:nowrap; margin-right:14pt;} .insb{flex:1; min-width:0;}
.fm .fi{display:inline-block; margin:0 22pt 2pt 0;} .fm .fr{margin:0;}
.pt{font-weight:bold; text-decoration:underline; margin:6pt 0 5pt; break-after:avoid;} .pt .pn{font-weight:normal; text-decoration:none;}
.pb{break-before:page;}
.cols{column-count:2; column-gap:11mm; column-rule:1px solid #000;} .cols.c1{column-count:1; column-rule:0;}
.q{display:flex; gap:5pt; break-inside:avoid; margin:0 0 8pt;} .qn{flex:0 0 auto; min-width:1.5em;} .qb{flex:1; min-width:0;}
.ch{display:grid; grid-template-columns:1fr; margin-top:2pt; column-gap:6pt; row-gap:1pt;} .ch.g2{grid-template-columns:1fr 1fr;}
.c{display:flex; gap:4pt; min-width:0; padding:0 2pt; border-radius:3pt;} .cl{flex:0 0 auto;} .ct{min-width:0;}
.c.ok{background:#d7f0dd; font-weight:bold;}
.key{margin-top:3pt; padding:1pt 4pt; border-left:2pt solid #2b8a3e; background:#f1faf3; font-size:.88em;}
.ind{display:block; font-size:.8em; color:#666;}
.w{break-inside:avoid; margin:0 0 6pt;} .wh{display:flex; gap:5pt; align-items:flex-start;} .wn{flex:0 0 auto;} .wt{flex:1; min-width:0;} .wp{flex:0 0 auto; white-space:nowrap;}
.dls{margin:4pt 0 0 1.5em;} .dls i{display:block; height:8mm; line-height:8mm; overflow:hidden; white-space:nowrap;} .dls i::before{content:"${XM_DOTS}";}
.sol{margin:3pt 0 0 1.5em; padding:3pt 6pt; border:1px solid #2b8a3e; background:#f1faf3; border-radius:4pt;} .sa{margin-top:3pt;}
.sum{margin-top:8pt; break-inside:avoid;} .sum > div{display:flex; flex-wrap:wrap; gap:2pt 14pt; margin-top:2pt;}
.bsw{gap:10pt 26pt !important; margin-top:6pt !important;} .bs{border:1.5px solid #333; border-radius:6pt; padding:6pt 12pt; min-width:170pt;}
.bsh,.bsr{display:flex; align-items:center; gap:12pt; line-height:1.4;} .bsh b{width:18pt; text-align:center; font-weight:700; font-size:1.15em;}
.bsh i,.bsr i{width:26pt; font-style:normal; text-align:right; font-size:1.2em; font-weight:600;} .bsr{margin-top:4pt;}
.bsr u{display:inline-block; width:18pt; height:18pt; border:1.5px solid #555; border-radius:50%; box-sizing:border-box; text-decoration:none;} .bsr u.on{background:#000; border-color:#000;}
.as{margin:8pt 0 10pt; break-inside:avoid;} .asi{text-align:center; margin-top:8pt;} .asi img{display:inline-block; width:95mm; max-width:100%; height:auto;} .aserr{padding:20pt; border:1px dashed #999; color:#777; font-size:.9em;}
.katex{font-size:${XM_MATH}em !important; line-height:1.15 !important; font-weight:normal;} .katex-display{margin:4pt 0 !important;}
.fg{text-align:center; margin:1.5mm 0 1mm; line-height:0; break-inside:avoid;} .fg svg{display:inline-block; max-width:100%; height:auto; overflow:visible;}
.fg.gerr{line-height:1.25; font-size:.8em; color:#777; font-style:italic;}
.c .fg{text-align:left; margin:0;}
.xtw{margin:2pt 0 3pt; break-inside:avoid;} .xtc{text-align:center; font-weight:bold; margin:0 0 2pt;} .xtn{text-align:center; font-size:.85em; margin-top:2pt;}
.xt{border-collapse:collapse; margin:0 auto; max-width:100%; font-size:.95em;} .xt th,.xt td{border:.8pt solid #000; padding:1pt 6pt; text-align:center; vertical-align:middle; line-height:1.25;} .xt th{background:#e9e9e9; font-weight:bold;} .xt td.rh{background:#f3f3f3; font-weight:bold;} .xt tr.tot td{font-weight:bold; border-top:1.8pt double #000;}
.c .xtw{margin:0;} .c .xt{margin:0;}
${print ? "" : `.strip{position:absolute; left:0; top:0; visibility:hidden; height:263mm; width:4550mm; column-count:24; column-width:auto; column-gap:10mm; column-fill:auto;}
.strip .pb{break-before:column;}
html,body{background:#e9ecf1;}
.sheet{position:relative; width:210mm; height:297mm; background:#fff; overflow:hidden; box-shadow:inset 0 0 0 1px #cfd5df;}
.sheet + .sheet{margin-top:0;}
.sheet .vp{position:absolute; left:10mm; top:18mm; width:190mm; height:263mm; overflow:hidden;}
.sheet .clone{position:absolute; top:0;}
.sheet + .sheet::before{content:""; position:absolute; left:0; right:0; top:0; border-top:2px dashed #e8590c; z-index:5;}
.sheet .pgtag{position:absolute; left:4mm; top:2mm; font:700 9pt/1 Tahoma,sans-serif; color:#e8590c; z-index:5;}
.sheet .pgno{position:absolute; right:4mm; bottom:2.5mm; font:600 8pt/1 Tahoma,sans-serif; color:#adb5bd; z-index:5;}
.sheet .hd2{position:absolute; right:15mm; top:9mm; font-size:${Math.max(12, fs - 2)}pt; white-space:nowrap;}`}
`;
  const hdrCss = print ? `<style>@page{@top-right{content:"${xmCss(hdr)} หน้าที่ " counter(page); font-family:${FAM}; font-size:${Math.max(12, fs - 2)}pt; vertical-align:bottom; padding-bottom:3mm;}} @page:first{@top-right{content:none;}}</style>` : "";
  const js = `<script>(function(){var done=false;
var HDR=${JSON.stringify(hdr).replace(/</g,"\\u003c")};
function post(){try{parent.postMessage({kcXm:1,h:Math.max(document.documentElement.scrollHeight,300),pages:document.querySelectorAll('.sheet').length},'*');}catch(e){}}
function waitImgs(){var im=[].slice.call(document.images).filter(function(i){return !i.complete;});if(!im.length)return Promise.resolve();return Promise.race([Promise.all(im.map(function(i){return new Promise(function(r){i.onload=i.onerror=r;});})),new Promise(function(r){setTimeout(r,3000);})]);}
function build(){var src=document.getElementById('xsrc');if(!src)return;
var pr=document.createElement('div');pr.style.cssText='position:absolute;visibility:hidden;width:180mm;height:1px';document.body.appendChild(pr);var W=pr.getBoundingClientRect().width;pr.style.width='10mm';var G=pr.getBoundingClientRect().width;pr.style.width='5mm';var G5=pr.getBoundingClientRect().width;pr.remove();var ST=W+G;
var b=src.getBoundingClientRect().left,mx=0,els=src.querySelectorAll('.top1,h1,.exn,.ru,.ins,.fm,.pt,.cols,.q,.w,.sum,.as,.row,p');
for(var i=0;i<els.length;i++){var r=els[i].getBoundingClientRect();if((r.width||r.height)&&r.right>mx)mx=r.right;}
var n=Math.max(1,Math.min(60,Math.floor(Math.max(0,mx-b-2)/ST)+1)),pg=document.getElementById('pages');
for(var k=0;k<n;k++){var sh=document.createElement('div');sh.className='sheet';var vp=document.createElement('div');vp.className='vp';
var c=src.cloneNode(true);c.removeAttribute('id');c.className='paper strip clone';c.style.visibility='visible';c.style.left=(G5-k*ST)+'px';vp.appendChild(c);sh.appendChild(vp);
if(k>0){var h2=document.createElement('div');h2.className='hd2';h2.textContent=HDR+' หน้าที่ '+(k+1);sh.appendChild(h2);var tg=document.createElement('div');tg.className='pgtag';tg.textContent='✂ ขึ้นหน้าที่ '+(k+1);sh.appendChild(tg);}
var pn=document.createElement('div');pn.className='pgno';pn.textContent='หน้า '+(k+1)+' / '+n;sh.appendChild(pn);pg.appendChild(sh);}
src.remove();}
function go(){if(done)return;done=true;
try{if(window.renderMathInElement)renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});}catch(e){}
var after=function(){${print ? "" : "build();"}post();${print ? "setTimeout(function(){try{window.focus();window.print();}catch(e){}},300);" : ""}};
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){return ${print ? "null" : "waitImgs()"};}).then(after,after);}
window.addEventListener('load',go);setTimeout(go,8000);window.addEventListener('resize',post);})();<\/script>`;
  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>${escH(hdr)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap">${XM_KATEX_CSS}
<style>${css}</style>${hdrCss}</head><body>${print ? `<div class="paper">${head}${body}</div>` : `<div class="paper strip" id="xsrc">${head}${body}</div><div id="pages"></div>`}${XM_KATEX_JS}${js}</body></html>`;
}

/* =====================================================================
   หน้าจอ
   ===================================================================== */
const xmOpts = (id, opts) => `<select data-xf="${id}">` + opts.map(([v, t]) => `<option value="${escH(v)}"${String(xs(id)) === String(v) ? " selected" : ""}>${escH(t)}</option>`).join("") + `</select>`;
const xmInp = (id, ph, num) => `<input data-xf="${id}" value="${escH(xs(id))}" placeholder="${escH(ph || "")}" autocomplete="off"${num ? ' type="number" inputmode="numeric" min="0"' : ""}>`;
const xmSw = (id, label) => `<label class="sw xm-sw"><input type="checkbox" data-xc="${id}"${xs(id) ? " checked" : ""}><span class="sw-track"></span>${label}</label>`;
const xmCard = (key, title, inner) => `<div class="card pf-card${XM.open[key] === false ? " collapsed" : ""}" data-card="${key}"><button type="button" class="pf-toggle" data-open="${key}"><span>${title}</span><i>▾</i></button><div class="pf-collapse">${inner}</div></div>`;

function xmFormHtml(){
  const pick = `<div class="card">
    <div class="tl-sub">เลือกระดับชั้นและตัวชี้วัด — ใช้เป็นกรอบในการออกข้อสอบ</div>
    <button type="button" class="pl-pick" id="xmPickGrade"><small>ระดับชั้น</small><b id="xmGradeTxt">แตะเพื่อเลือก</b><i>›</i></button>
    <button type="button" class="pl-pick" id="xmPickInd"><small>ตัวชี้วัด</small><b id="xmIndTxt">แตะเพื่อเลือก (ค้นหาได้ทุกชั้น)</b><i>›</i></button>
    <div id="xmSum"></div><div class="tl-sub" id="xmTally"></div>
  </div>`;
  const setup = xmCard("form", "✨ ขั้นที่ ๑ · ตั้งค่าข้อสอบ แล้วสร้าง Prompt", `
    <div class="pf-t">เนื้อหา</div>
    <div class="field"><label>รายวิชา</label>${xmOpts("subj", [["พื้นฐาน","คณิตศาสตร์พื้นฐาน"],["เพิ่มเติม","คณิตศาสตร์เพิ่มเติม"],["custom","อื่น ๆ (พิมพ์เอง)"]])}
      <input data-xf="subjCustom" id="xmSubjCustom" value="${escH(xs("subjCustom"))}" placeholder="พิมพ์ชื่อรายวิชา" style="margin-top:8px;${xs("subj") === "custom" ? "" : " display:none;"}" autocomplete="off"></div>
    <div class="field"><label>เรื่อง / ขอบเขตที่สอบ <small class="pf-hint">(ไม่ใส่ก็ได้ ถ้าเลือกตัวชี้วัดแล้ว)</small></label>${xmInp("topic", "เช่น เมทริกซ์ และเวกเตอร์ใน ๒–๓ มิติ")}</div>

    <div class="pf-t">โครงข้อสอบ <small>ใส่ 0 ที่จำนวนข้อ ถ้าไม่ต้องการตอนนั้น</small></div>
    <div class="xm-part"><b>ตอนปรนัย</b>
      <div class="pf-2"><div class="field"><label>จำนวนข้อ</label>${xmInp("n1", "", true)}</div><div class="field"><label>คะแนนรวม</label>${xmInp("s1", "", true)}</div></div>
      <div class="field"><label>การจัดวางตัวเลือก <small class="pf-hint">(สลับรายข้อได้ทีหลัง)</small></label>${xmOpts("lay", [["auto","ให้ AI เลือกตามความยาวตัวเลือก"],["1","เรียงลงทีละบรรทัด  ก. ข. ค. ง."],["2","2 บรรทัด  ก. ข. / ค. ง."]])}</div>
    </div>
    <div class="xm-part"><b>ตอนอัตนัย</b>
      <div class="pf-2"><div class="field"><label>จำนวนข้อ</label>${xmInp("n2", "", true)}</div><div class="field"><label>คะแนนรวม</label>${xmInp("s2", "", true)}</div></div>
    </div>
    <div class="field"><label>ระดับความยาก</label>${xmOpts("diff", XM_DIFF)}</div>
    <div class="field"><label>กราฟประกอบโจทย์ <small class="pf-hint">(วิธีเขียนดูที่ปุ่ม 📖 คู่มือ)</small></label>${xmOpts("gmode", [["none","ไม่มีกราฟ"],["some","มีบางข้อที่เหมาะสม (ประมาณ ๑ ใน ๔)"],["many","มีหลายข้อ (ประมาณครึ่งหนึ่ง)"]])}</div>
    <div class="field"><label>ตารางประกอบโจทย์ <small class="pf-hint">(เช่น ตารางแจกแจงความถี่ — วิธีเขียนดูที่ปุ่ม 📖 คู่มือ)</small></label>${xmOpts("tmode", [["none","ไม่มีตาราง"],["some","มีบางข้อที่เหมาะสม (ประมาณ ๑ ใน ๔)"],["many","มีหลายข้อ (ประมาณครึ่งหนึ่ง)"]])}</div>

    <div class="pf-t">สูตร</div>
    ${xmSw("formula", "ใส่สูตรไว้ส่วนหัวของข้อสอบ")}
    <div class="field" id="xmFormulaBox" style="margin-top:8px;${xs("formula") ? "" : " display:none;"}"><label>สูตรที่ต้องการ <small class="pf-hint">(บรรทัดละสูตร · เว้นว่าง = ให้ AI เลือกสูตรที่จำเป็นให้)</small></label>
      <textarea class="tl-ta" data-xf="formulaTxt" placeholder="เช่น $|\\vec{u}|=\\sqrt{a^2+b^2}$&#10;$\\vec{u}\\cdot\\vec{v}=|\\vec{u}||\\vec{v}|\\cos\\theta$">${escH(xs("formulaTxt"))}</textarea></div>

    <details class="xm-det"><summary><span class="xm-shim">✨ ตั้งค่าหัวกระดาษและหน้ากระดาษ</span></summary>
      <div class="pf-2"><div class="field"><label>เดือน ปี</label>${xmInp("month", "เช่น ตุลาคม ๒๕๖๙")}</div><div class="field"><label>เวลาสอบ</label>${xmInp("time", "เช่น 1 ชั่วโมง 30 นาที")}</div></div>
      <div class="field"><label>ระดับชั้นที่แสดงในหัวกระดาษ <small class="pf-hint">(เว้นว่าง = ตามชั้นของตัวชี้วัดที่เลือก · พิมพ์เองได้ เช่น ม.4 หรือ ม.4/2)</small></label><input data-xf="hdrGrade" value="${escH(xs("hdrGrade"))}" placeholder="เช่น ม.4" autocomplete="off" list="xmGradeList"><datalist id="xmGradeList">${PLAN_GROUPS.flatMap(g => g.grades).map(x => `<option value="${escH(x)}"></option>`).join("")}</datalist></div>
      <div class="field"><label>ชื่อการสอบ <small class="pf-hint">(ไม่ใส่ก็ได้)</small></label>${xmInp("exName", "เช่น สอบกลางภาคเรียนที่ ๑")}</div>
      <div class="pf-2"><div class="field"><label>คอลัมน์ตอนปรนัย</label>${xmOpts("cols", [["2","2 คอลัมน์ (แบบข้อสอบจริง)"],["1","1 คอลัมน์"]])}</div>
        <div class="field"><label>ขนาดตัวอักษร</label>${xmOpts("fs", [["14","14 pt"],["15","15 pt"],["16","16 pt"],["17","17 pt"],["18","18 pt"]])}</div></div>
      <div class="xm-sws">${xmSw("nameLine", "ช่องชื่อ ชั้น เลขที่")}${xmSw("dots", "เส้นประให้เขียนวิธีทำ (อัตนัย)")}${xmSw("newPage", "ขึ้นหน้าใหม่ (กระดาษคำตอบ / ตอนอัตนัย)")}${xmSw("sheet", "แนบกระดาษคำตอบ (image/Answer.png) ต่อท้ายตอนปรนัย")}</div>
    </details>

    <div class="field" style="margin-top:12px;"><label>หมายเหตุถึง AI <small class="pf-hint">(ไม่ใส่ก็ได้)</small></label>${xmInp("note", "เช่น ใช้ตัวเลขจำนวนเต็ม ไม่ต้องมีเศษส่วน")}</div>
    <button type="button" class="btn btn-primary" id="xmGo" style="margin-top:6px;">✨ สร้าง Prompt</button>
    <button type="button" class="btn btn-outline btn-sm" id="xmReset" style="margin-top:8px;">↺ ล้างข้อมูลฟอร์ม</button>
    <div id="xmOutWrap" style="display:none; margin-top:14px;">
      <div class="tl-row"><div class="tl-h" style="margin:0;">Prompt ที่ได้</div><span class="tl-sub" id="xmLen"></span></div>
      <textarea id="xmOut" class="tl-ta pf-out" spellcheck="false"></textarea>
      <button type="button" class="btn btn-primary" id="xmCopy" style="margin-top:8px;">📋 คัดลอก Prompt</button>
      <div class="tl-sub" style="margin-top:8px;">นำไปวางใน ChatGPT / Gemini / Claude แล้วเอาคำตอบมาวางในขั้นที่ ๒</div>
      <button type="button" class="btn btn-outline" id="xmNext1" style="margin-top:10px;">ต่อไป: วางคำตอบจาก AI →</button>
    </div>`);
  const step2 = xmCard("ans", "📄 ขั้นที่ ๒ · วางคำตอบจาก AI → ได้ข้อสอบ", `
    <div class="field" style="margin-top:6px;"><label>คำตอบจาก AI</label><textarea id="xmRaw" class="tl-ta pf-out" style="min-height:140px;" placeholder="วางข้อความที่ AI ตอบกลับมาที่นี่ (ที่ขึ้นต้นด้วย [[MC 1]] …)">${escH(XM.raw)}</textarea></div>
    <button type="button" class="btn btn-primary" id="xmBuild">🧩 สร้างข้อสอบ</button>
    <button type="button" class="btn btn-outline btn-sm" id="xmClear" style="margin-left:6px;">↺ ล้าง</button>`);
  const work = `<div id="xmRes" class="xm-work" style="display:none;">
    <div class="xm-left">
      <div class="xm-stat" id="xmStat"></div><div class="xm-cov" id="xmCov"></div>
      <div id="xmLayBox" class="xm-layall"><span>จัดวางตัวเลือกทุกข้อปรนัย</span><button type="button" class="btn btn-outline btn-sm" data-layall="1">☰ เรียงลง</button><button type="button" class="btn btn-outline btn-sm" data-layall="2">▦ 2 บรรทัด</button><button type="button" class="btn btn-outline btn-sm" data-layall="0">↺ ตามที่ตั้งไว้</button><span style="margin-left:10px">สลับตัวเลือก</span><button type="button" class="btn btn-outline btn-sm" data-shufall="1" title="สลับเฉพาะตัวเลือกปรนัยทั้งฉบับ และกระจายตำแหน่งเฉลย">🔀 สลับช้อยทั้งฉบับ</button></div>
      <div id="xmEd"></div>
      <div class="xm-bottom">
        <div class="tl-sub">แก้ข้อความ ตัวเลือก เฉลย ได้ทุกข้อ — ตัวอย่างด้านขวาอัปเดตให้เอง</div>
        <div class="pd-btns"><button type="button" class="btn btn-primary" id="xmPrint">🖨 พิมพ์ข้อสอบ</button><button type="button" class="btn btn-outline" id="xmPrintKey">🖨 พิมพ์เฉลย</button><button type="button" class="btn btn-outline" id="xmSaveLib">💾 บันทึกข้อสอบ</button></div>
      </div>
    </div>
    <div class="xm-right">
      <div class="xm-pvbar"><b>ตัวอย่างข้อสอบ <small id="xmPgInfo" style="font-weight:600; font-size:13px; color:#e8590c;"></small></b><button type="button" class="btn btn-outline btn-sm" id="xmAnsBtn">👁 แสดงเฉลย</button></div>
      <div class="xm-pv" id="xmPv"><iframe id="xmFrame" title="ตัวอย่างข้อสอบ"></iframe></div>
    </div>
  </div>`;
  const stepper = `<div class="xm-steps" id="xmSteps"><button type="button" data-xs="0"><b>1</b><span>สร้าง Prompt</span></button><i></i><button type="button" data-xs="1"><b>2</b><span>วางคำตอบ · แก้ไข · พิมพ์</span></button></div>`;
  return xmLibBox() + `<div class="xm-guide-row"><button type="button" class="btn btn-outline btn-sm" id="xmGuideBtn">📖 คู่มือ (สมการ · กราฟ)</button></div>` + stepper + `<section class="xm-pg" data-pg="0">${pick}${setup}</section><section class="xm-pg" data-pg="1" hidden>${step2}${work}</section>`;
}

/* ---------- ป๊อปอัปเลือกชั้น / ตัวชี้วัด ---------- */
function xmModal(){
  if(xm.modal) return xm.modal;
  const el = document.createElement("div");
  el.className = "pm-back"; el.id = "xmModal";
  el.innerHTML = `<div class="pm-sheet" role="dialog" aria-modal="true"><div class="pm-head"><b></b><div class="pm-act"></div></div><div class="pm-body"></div></div>`;
  document.body.appendChild(el);
  xm.modal = el; xm.mTitle = $("b", el); xm.mAct = $(".pm-act", el); xm.mBody = $(".pm-body", el);
  el.addEventListener("click", e => {
    if(e.target === el || e.target.closest(".xm-done")){ xmModalClose(); return; }
    const chip = e.target.closest(".pl-chip");
    if(chip){ XM.grade = chip.dataset.g; xmSave(); xmRefreshSecs(); xmUpdate(); xmModalClose(); return; }
    const all = e.target.closest(".pl-all");
    if(all){ const s = xmSecs[+all.dataset.sec], sel = xmSel(), every = s.items.every(it => sel.has(it.key)); s.items.forEach(it => every ? sel.delete(it.key) : sel.add(it.key)); xmSave(); xm.mBody.innerHTML = xmIndHtml(); xmUpdate(); return; }
    if(e.target.closest(".xm-clear")){ xmSel().clear(); xmSave(); if(xm.mBody._kiRedraw) xm.mBody._kiRedraw(); xmUpdate(); }
  });
  el.addEventListener("change", e => {
    const cb = e.target.closest("input[data-k]"); if(!cb) return;
    const sel = xmSel(); cb.checked ? sel.add(cb.dataset.k) : sel.delete(cb.dataset.k);
    cb.closest(".pl-it").classList.toggle("on", cb.checked); xmSave(); xmUpdate();
  });
  document.addEventListener("keydown", e => { if(e.key === "Escape" && el.classList.contains("show")) xmModalClose(); });
  return el;
}
function xmModalOpen(title, act, html){
  xmModal(); xm.mTitle.textContent = title; xm.mAct.innerHTML = act; xm.mBody.innerHTML = html; xm.mBody.scrollTop = 0;
  xm.modal.classList.add("show"); document.documentElement.style.overflow = "hidden";
}
function xmModalClose(){ if(!xm.modal) return; xm.modal.classList.remove("show"); document.documentElement.style.overflow = ""; }
function xmOpenGrade(){
  xmModalOpen("เลือกระดับชั้น", `<button type="button" class="xm-done">ปิด</button>`,
    PLAN_GROUPS.map(g => `<div class="pl-gl">${g.title}</div><div class="pl-grades">${g.grades.map(x => `<button type="button" class="pl-chip${x === XM.grade ? " on" : ""}" data-g="${x}">${x}</button>`).join("")}</div>`).join(""));
}
function xmIndHtml(){
  const sel = xmSel();
  return xmSecs.map((s, si) => {
    const head = `<div class="pl-sh"><div><b>${escH(s.title)}</b><small>${escH(s.desc)}</small></div>` + (s.items.length ? `<button type="button" class="pl-all" data-sec="${si}">เลือกทั้งหมด</button>` : "") + `</div>`;
    const body = s.items.length
      ? s.items.map(it => `<label class="pl-it${sel.has(it.key) ? " on" : ""}"><input type="checkbox" data-k="${escH(it.key)}"${sel.has(it.key) ? " checked" : ""}><span class="pl-box"></span><span class="pl-tx"><i>${escH(it.code)}</i>${escH(it.text)}</span></label>`).join("")
      : `<div class="tl-sub pl-none">ไม่มีตัวชี้วัดที่วัดผลในชั้นนี้ ${escH(s.note)}</div>`;
    return `<div class="pm-sec">${head}${body}</div>`;
  }).join("");
}
function xmOpenInd(){
  xmModalOpen("เลือกตัวชี้วัด", `<span id="xmCount"></span><button type="button" class="xm-clear">ล้าง</button><button type="button" class="pm-done xm-done">เสร็จสิ้น</button>`, "");
  kiMount(xm.mBody, { q:"", g:XM.grade || "" }, {
    sel: g => XM.sel[g] || (XM.sel[g] = new Set()), cur: () => XM.grade,
    setGrade: g => { XM.grade = g; xmSave(); xmRefreshSecs(); xmUpdate(); }, save: () => xmSave(), after: () => xmUpdate()
  });
  xmUpdate();
}

/* =====================================================================
   📖 คู่มือเขียนสมการ (LaTeX) + คำสั่งกราฟ [[G: …]] + ตาราง [[T: …]] — เปิดจากปุ่ม "คู่มือ" ในหน้าสร้างข้อสอบ
   ===================================================================== */
const XG_MATH = [
 ["พื้นฐาน", [
  ["เศษส่วน", "\\frac{a}{b}"],
  ["เลขยกกำลัง", "x^{2}"],
  ["ยกกำลังหลายตัวอักษร (ต้องมี { })", "x^{10}"],
  ["ตัวห้อย", "a_{n}"],
  ["รากที่สอง", "\\sqrt{x}"],
  ["รากที่สาม / รากที่ n", "\\sqrt[3]{x}"],
  ["ค่าสัมบูรณ์", "\\left| x-2 \\right|"],
  ["คูณ หาร บวกลบ", "a \\times b \\quad a \\div b \\quad a \\pm b"],
  ["เปรียบเทียบ", "a \\leq b \\quad a \\geq b \\quad a \\neq b \\quad a \\approx b"],
  ["องศา", "30^{\\circ}"],
  ["อนันต์ / จุดไข่ปลา", "\\infty \\quad 1, 2, 3, \\ldots"],
  ["ร้อยละ (ต้องมี \\ นำหน้า %)", "50\\%"],
  ["เว้นระยะ: เล็ก / กลาง / มาก", "a \\, b \\quad c \\qquad d"],
  ["เว้นระยะระหว่างสูตรหลายตัวในบรรทัดเดียว", "x=1 \\qquad y=2 \\qquad z=3"]
 ]],
 ["ลอการิทึมและเลขยกกำลัง", [
  ["log ฐาน a  (ใช้ _ ใส่ฐาน)", "\\log_{a} x"],
  ["ตัวอย่าง log ฐาน 2", "\\log_{2} 8 = 3"],
  ["log ฐาน 10 (ไม่ต้องใส่ฐาน)", "\\log x"],
  ["ln (ลอการิทึมธรรมชาติ)", "\\ln x"],
  ["log ของนิพจน์", "\\log_{3}(x+1)"],
  ["e ยกกำลัง", "e^{x}"],
  ["เอกซ์โพเนนเชียล", "y=2^{x}"]
 ]],
 ["ตรีโกณมิติ", [
  ["sin cos tan", "\\sin\\theta \\quad \\cos 60^{\\circ} \\quad \\tan x"],
  ["กำลังของฟังก์ชัน", "\\sin^{2}\\theta+\\cos^{2}\\theta=1"],
  ["พาย", "\\pi \\quad 2\\pi r"]
 ]],
 ["เซตและช่วง", [
  ["เซตแบบแจกแจง", "\\{1, 2, 3\\}"],
  ["เซตแบบบอกเงื่อนไข", "\\{x \\mid x > 2\\}"],
  ["ยูเนียน / อินเตอร์เซกชัน", "A \\cup B \\quad A \\cap B"],
  ["คอมพลีเมนต์", "A' \\quad A^{c}"],
  ["สมาชิก / สับเซต", "x \\in A \\quad x \\notin A \\quad A \\subset B \\quad A \\subseteq B"],
  ["เซตว่าง / จำนวนสมาชิก", "\\emptyset \\quad n(A)"],
  ["เซตของจำนวน", "\\mathbb{N} \\quad \\mathbb{Z} \\quad \\mathbb{Q} \\quad \\mathbb{R}"],
  ["ช่วง", "(a, b] \\quad [a, b) \\quad (-\\infty, 3)"]
 ]],
 ["ตรรกศาสตร์", [
  ["และ / หรือ / นิเสธ", "p \\land q \\quad p \\lor q \\quad \\neg p"],
  ["ถ้า...แล้ว / ก็ต่อเมื่อ", "p \\rightarrow q \\quad p \\leftrightarrow q"],
  ["สำหรับทุก / มีอย่างน้อยหนึ่ง", "\\forall x \\quad \\exists x"],
  ["ดังนั้น", "\\therefore"]
 ]],
 ["เมทริกซ์ เวกเตอร์ ระบบสมการ", [
  ["เมทริกซ์ (เขียนให้อยู่บรรทัดเดียว)", "\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}"],
  ["ดีเทอร์มิแนนต์", "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}"],
  ["เมทริกซ์ผกผัน / สลับเปลี่ยน", "A^{-1} \\quad A^{t}"],
  ["เวกเตอร์", "\\vec{u}=3\\vec{i}+4\\vec{j}"],
  ["ขนาดเวกเตอร์ / ผลคูณเชิงสเกลาร์", "|\\vec{u}| \\quad \\vec{u}\\cdot\\vec{v}"],
  ["ระบบสมการ", "\\begin{cases} x+y=5 \\\\ x-y=1 \\end{cases}"]
 ]],
 ["อื่น ๆ", [
  ["แฟกทอเรียล / การจัดหมู่", "n! \\quad \\binom{n}{r}"],
  ["การเรียงสับเปลี่ยน / จัดหมู่", "{}_{n}P_{r} \\quad {}_{n}C_{r}"],
  ["ผลบวก", "\\sum_{i=1}^{n} i"],
  ["ลำดับและอนุกรม", "a_{n}=a_{1}+(n-1)d \\quad S_{n}=\\frac{n}{2}(a_{1}+a_{n})"],
  ["ลิมิต / อินทิกรัล", "\\lim_{x \\to 2} f(x) \\quad \\int_{0}^{1} x\\,dx"],
  ["ค่าเฉลี่ย / ส่วนเบี่ยงเบนมาตรฐาน", "\\bar{x} \\quad \\sigma"],
  ["ตัวอักษรกรีก", "\\alpha \\ \\beta \\ \\theta \\ \\lambda \\ \\mu \\ \\Delta"],
  ["หน่วยในสมการ", "12\\text{ cm}^{2}"]
 ]]
];
const XG_CMDS = [
 ["range: x₁,x₂,y₁,y₂", "ช่วงแกน (xmin,xmax,ymin,ymax) — ต้องมีเสมอ และเขียนเป็นรายการแรก", "range: -4,6,-3,5"],
 ["eq: สมการ", "เส้นกราฟทึบ: เส้นตรง พาราโบลา วงกลม วงรี ไฮเพอร์โบลา ฟังก์ชันต่าง ๆ", "eq: y=x^{2}-4x+3"],
 ["eqd: สมการ", "เหมือน eq แต่เป็น เส้นประ", "eqd: y=2x-1"],
 ["eq: อสมการ", "แรเงาบริเวณคำตอบให้อัตโนมัติ (ถ้าใช้ < หรือ > เส้นขอบจะเป็นเส้นประเอง)", "eq: y\\geq x+1"],
 ["reg: เงื่อนไข & เงื่อนไข", "แรเงาเฉพาะบริเวณที่จริงทุกเงื่อนไขพร้อมกัน (ระบบอสมการ)", "reg: x\\geq 0 & y\\geq 0 & x+y\\leq 4"],
 ["ptc: ชื่อ(x,y)", "จุด พร้อมชื่อและพิกัด", "ptc: A(2,3)"],
 ["pt: ชื่อ(x,y)", "จุด พร้อมชื่อ แต่ไม่แสดงพิกัด (ใช้เมื่อให้นักเรียนอ่านพิกัดเอง)", "pt: B(-1,2)"],
 ["dot: (x,y)", "จุดเฉย ๆ ไม่มีชื่อ ไม่มีพิกัด", "dot: (1,0)"],
 ["seg: (x,y)-(x,y)", "ส่วนของเส้นตรง (ใส่หลายจุดต่อกัน = เส้นหัก)", "seg: (0,0)-(2,3)-(4,1)"],
 ["segd: …", "ส่วนของเส้นตรงแบบ เส้นประ", "segd: (0,0)-(3,4)"],
 ["poly: …", "รูปหลายเหลี่ยมปิด (เส้นทึบ)", "poly: (0,0)-(4,0)-(2,3)"],
 ["polyf: …", "รูปหลายเหลี่ยมแรเงา", "polyf: (0,0)-(4,0)-(2,3)"],
 ["… ~ ชื่อ", "ติดชื่อเส้น/รูป ต่อท้ายรายการ eq eqd seg poly", "eq: y=2x+1 ~ l_{1}"],
 ["txt: ข้อความ @ (x,y)", "วางข้อความตรงตำแหน่งที่ต้องการ", "txt: A @ (3,4)"],
 ["step / grid / num / ratio", "step: 1 = ระยะขีดบนแกน · grid: off = ปิดเส้นตาราง · num: off = ปิดตัวเลขบนแกน · ratio: free = สเกลแกน x, y ไม่เท่ากัน", "grid: off"]
];
const XG_EX = [
 ["เส้นตรงผ่าน ๒ จุด (ให้หาความชัน)", "range: -3,6,-3,6; eq: y=\\frac{1}{2}x+1 ~ l; ptc: A(0,1); ptc: B(4,3)"],
 ["พาราโบลา + จุดตัดแกน x", "range: -2,6,-3,5; eq: y=x^{2}-4x+3 ~ f; dot: (1,0); dot: (3,0); ptc: V(2,-1)"],
 ["เส้นประ + จุด", "range: -4,6,-3,5; eqd: y=2x-1 ~ m; ptc: A(1,1)"],
 ["ระบบอสมการ (แรเงา)", "range: -1,6,-1,6; reg: x\\geq 0 & y\\geq 0 & x+y\\leq 4; ptc: A(4,0); ptc: B(0,4)"],
 ["วงกลม", "range: -5,5,-5,5; eq: x^{2}+y^{2}=16 ~ C"],
 ["เอกซ์โพเนนเชียล กับ ลอการิทึม", "range: -3,5,-3,5; eq: y=2^{x} ~ f; eq: y=\\log_{2} x ~ g; eqd: y=x"],
 ["รูปสามเหลี่ยม", "range: -1,6,-1,5; poly: (0,0)-(4,0)-(2,3); ptc: A(0,0); ptc: B(4,0); ptc: C(2,3)"],
 ["เส้นหัก (เช่น กราฟข้อมูล)", "range: 0,6,0,6; seg: (0,1)-(2,3)-(4,2)-(6,5); dot: (2,3); dot: (4,2)"]
];
const XG_FULL = String.raw`[[MC 1]]
IND: (รหัสตัวชี้วัด)
LAY: 2
Q: จากกราฟ เส้นตรง $l$ มีความชันเท่าใด // [[G: range: -3,6,-3,6; eq: y=\frac{1}{2}x+1 ~ l; ptc: A(0,1); ptc: B(4,3)]]
A: $-2$
B: $-\frac{1}{2}$
C: $\frac{1}{2}$
D: $2$
ANS: ค
SOL: ความชัน $=\frac{3-1}{4-0}=\frac{1}{2}$

[[MC 2]]
IND: (รหัสตัวชี้วัด)
LAY: 2
Q: กราฟใดเป็นกราฟของ $y=2^{x}$
A: [[G: range: -3,3,-1,5; eq: y=\log_{2} x]]
B: [[G: range: -3,3,-1,5; eq: y=2^{x}]]
C: [[G: range: -3,3,-1,5; eq: y=x^{2}]]
D: [[G: range: -3,3,-1,5; eq: y=-2^{x}]]
ANS: ข
SOL: เส้นโค้งผ่านจุด $(0,1)$ และเพิ่มขึ้นเมื่อ $x$ เพิ่มขึ้น`;

const xgCode = (t, shown) => `<code class="xg-c" data-xgc="${escH(t)}" title="แตะเพื่อคัดลอก">${escH(shown ?? t)}</code>`;
function xgMathHtml(){
  const intro = `<div class="xg-box"><b>หลักสำคัญ</b><ul>
    <li>ครอบสมการด้วย <code>$ … $</code> เช่น <code>$x^{2}-5x+6=0$</code> ส่วนข้อความภาษาไทยให้อยู่ <b>นอก</b> $ เสมอ</li>
    <li>ต้องมี $ เปิดและปิดเป็นคู่ — ถ้าเหลือตัวเดียว สมการจะไม่แสดง</li>
    <li>ตัวเลขธรรมดา (เช่น 120 หรือ -3) ไม่ต้องใส่ $ · ถ้ามีตัวแปร เศษส่วน ยกกำลัง ราก ให้ใส่ทั้งนิพจน์ใน $ ครั้งเดียว</li>
    <li>ยกกำลัง/ตัวห้อยที่มีมากกว่า ๑ ตัวอักษรต้องใส่ { } เช่น <code>x^{10}</code> <code>a_{n+1}</code></li>
    <li>ขึ้นบรรทัดใหม่ในช่องเดียวกันใช้ <code>//</code> · ตัวหนาใช้ <code>**ข้อความ**</code></li>
  </ul><div class="xg-sub">แตะที่โค้ดสีส้มเพื่อคัดลอก · คอลัมน์ขวาคือผลลัพธ์ที่ได้ (ต้องต่ออินเทอร์เน็ตจึงจะแสดง)</div></div>`;
  const groups = XG_MATH.map(([title, rows]) => `<div class="xg-h">${escH(title)}</div><div class="xg-tw"><table class="xg-t"><tbody>`
    + rows.map(([lb, code]) => `<tr><td class="xg-l">${escH(lb)}</td><td>${xgCode("$" + code + "$")}</td><td class="xg-r"><span class="xg-m" data-t="${escH(code)}"></span></td></tr>`).join("")
    + `</tbody></table></div>`).join("");
  return intro + groups;
}
const XT_OPTS = [
 ["@title: ชื่อตาราง", "หัวข้อตัวหนา อยู่เหนือตาราง", "@title: ตารางแสดงคะแนนสอบ"],
 ["@note: หมายเหตุ", "ข้อความเล็ก ๆ ใต้ตาราง", "@note: f แทนความถี่"],
 ["@head: n", "จำนวนแถวหัวตาราง (ตัวหนา พื้นเทา) ค่าเริ่มต้น 1 · ใส่ 0 = ไม่มีแถวหัวตาราง · ใส่ 2 เมื่อหัวตารางซ้อนกัน 2 ชั้น", "@head: 2"],
 ["@total", "แถวสุดท้ายเป็นแถว “รวม” (ตัวหนา มีเส้นคู่ด้านบน)", "@total"],
 ["@rowhead", "คอลัมน์แรกเป็นหัวแถว (ตัวหนา พื้นเทาอ่อน)", "@rowhead"],
 ["@align: l c r", "จัดชิดซ้าย (l) / กึ่งกลาง (c) / ขวา (r) ทีละคอลัมน์ — ค่าเริ่มต้นกึ่งกลางทุกคอลัมน์", "@align: l c c"],
 ["@width: n", "ความกว้างตารางเป็น % ของความกว้างที่มี — ค่าเริ่มต้นกว้างพอดีเนื้อหา", "@width: 80"],
 ["@rowh: n", "ความสูงแถวขั้นต่ำ (มม.) ใช้กับตารางที่ให้นักเรียนเขียนเติม", "@rowh: 9"],
 ["__", "ช่องว่างให้นักเรียนเติม (ขีดล่าง ๒ ตัว)", "y=2x+1 | __ | __ | __"],
 ["<", "รวมช่องกับช่องทางซ้าย (แนวนอน)", "จำนวนนักเรียน | <"],
 ["^", "รวมช่องกับช่องด้านบน (แนวตั้ง)", "^ | ชาย | หญิง"]
];
const XT_EX = [
 ["ตารางแจกแจงความถี่ (มีแถวรวม)", String.raw`@title: ตารางแสดงคะแนนสอบของนักเรียน ๔๐ คน
คะแนน | ความถี่ ($f$)
1-10 | 4
11-20 | 9
21-30 | 15
31-40 | 12
รวม | 40
@total`],
 ["ความถี่สะสม + ร้อยละ", String.raw`ช่วงน้ำหนัก (กก.) | ความถี่ | ความถี่สะสม | ร้อยละ
40-49 | 6 | 6 | 15
50-59 | 14 | 20 | 35
60-69 | 12 | 32 | 30
70-79 | 8 | 40 | 20
รวม | 40 | | 100
@total`],
 ["ตารางข้อมูล (หัวแถวอยู่ซ้าย ไม่มีแถวหัวตาราง)", String.raw`@head: 0
@rowhead
$x$ | 1 | 2 | 3 | 4 | 5
$f(x)$ | 3 | 5 | 7 | 9 | 11
@note: ตารางแสดงค่าของฟังก์ชัน $f(x)=2x+1$`],
 ["หัวตาราง ๒ ชั้น (รวมช่อง)", String.raw`@head: 2
ชั้น | จำนวนนักเรียน | <
^ | ชาย | หญิง
ม.4/1 | 18 | 22
ม.4/2 | 20 | 19
@width: 70`],
 ["ตารางให้นักเรียนเติม (ช่องว่าง)", String.raw`@rowh: 9
$x$ | -2 | -1 | 0 | 1 | 2
$y=2x+1$ | __ | __ | __ | __ | __`]
];
const XT_FULL = String.raw`[[MC 1]]
IND: (รหัสตัวชี้วัด)
LAY: 2
Q: จากตารางแจกแจงความถี่ นักเรียนที่ได้คะแนน 11-20 มีกี่คน // [[T:
@title: คะแนนสอบของนักเรียน ๔๐ คน
คะแนน | ความถี่
1-10 | 4
11-20 | 9
21-30 | 15
31-40 | 12
รวม | 40
@total
]]
A: 4 คน
B: 9 คน
C: 15 คน
D: 12 คน
ANS: ข
SOL: ช่วงคะแนน 11-20 มีความถี่ 9 จึงมี 9 คน

[[WR 1]]
IND: (รหัสตัวชี้วัด)
PTS: 4
LINES: 8
Q: จากตาราง จงหาความถี่สะสมของช่วงคะแนน 21-30 // [[T:
คะแนน | ความถี่ | ความถี่สะสม
1-10 | 4 | 4
11-20 | 9 | __
21-30 | 15 | __
]]
SOL: ความถี่สะสมของ 11-20 $=4+9=13$ // ความถี่สะสมของ 21-30 $=13+15=28$
ANS: 28`;
function xgTableHtml(){
  const how = `<div class="xg-box"><b>วิธีใส่ตารางในข้อสอบ</b><ol>
    <li>พิมพ์ <code>[[T: … ]]</code> ในช่อง <code>Q:</code> ต่อท้ายโจทย์ (หลัง <code>//</code>) — ใช้ในตัวเลือก <code>A: B: C: D:</code> หรือ <code>SOL:</code> ได้เช่นกัน</li>
    <li>เขียนตารางข้างใน <b>๑ บรรทัด = ๑ แถว</b> แบ่งช่องด้วยเครื่องหมาย <code>|</code> · <b>แถวแรกเป็นหัวตาราง</b> (ตัวหนา พื้นเทา)</li>
    <li>ปิดด้วย <code>]]</code> ที่ท้ายตาราง · ระบบวาดเส้นขอบและจัดให้พอดีกับหน้ากระดาษเอง</li>
    <li>ใส่สมการในช่องด้วย <code>$ … $</code> ได้ตามปกติ · ตัวหนา <code>**ข้อความ**</code> · ขึ้นบรรทัดใหม่ในช่องใช้ <code>&lt;br&gt;</code></li>
    <li>บรรทัดที่ขึ้นต้นด้วย <code>@</code> คือตัวเลือกของตาราง (ชื่อตาราง แถวรวม ฯลฯ) ดูตารางด้านล่าง</li>
    <li>หรือเลือก “ตารางประกอบโจทย์” ในขั้นที่ ๑ แล้ว AI จะเขียนตารางให้เอง</li></ol></div>`;
  const opts = `<div class="xg-h">ตัวเลือกและสัญลักษณ์พิเศษ</div><div class="xg-tw"><table class="xg-t"><tbody>`
    + XT_OPTS.map(([c, d, ex]) => `<tr><td class="xg-l"><b>${escH(c)}</b></td><td>${escH(d)}</td><td>${xgCode(ex)}</td></tr>`).join("") + `</tbody></table></div>`;
  const exs = `<div class="xg-h">ตัวอย่าง (แตะโค้ดเพื่อคัดลอก · กด “ลองแก้” เพื่อทดลองในช่องทดสอบ)</div>` + XT_EX.map(([t, sp]) => {
    const full = "[[T:\n" + sp + "\n]]";
    return `<div class="xg-ex"><div class="xg-exh"><b>${escH(t)}</b><button type="button" class="xg-try" data-xgtry="${escH(full)}">ลองแก้</button></div><pre class="xg-pre" data-xgc="${escH(full)}" title="แตะเพื่อคัดลอก">${escH(full)}</pre><div class="xg-exg xtp">${xtHtml(sp)}</div></div>`;
  }).join("");
  const full = `<div class="xg-h">ตัวอย่างข้อสอบเต็มรูปแบบ (ตารางในโจทย์ปรนัยและอัตนัย)</div><pre class="xg-pre" data-xgc="${escH(XT_FULL)}" title="แตะเพื่อคัดลอก">${escH(XT_FULL)}</pre>`;
  return how + opts + exs + full;
}
function xgRenderTbl(){
  xgKatex(() => { const b = xm.mBody; if(!b) return; b.querySelectorAll(".xtp").forEach(el => { try{ window.renderMathInElement(el, { delimiters:[{ left:"$$", right:"$$", display:true }, { left:"$", right:"$", display:false }], throwOnError:false }); }catch(e){} }); });
}
function xgGraphHtml(){
  const how = `<div class="xg-box"><b>วิธีใส่กราฟในข้อสอบ</b><ol>
    <li>พิมพ์ <code>[[G: … ]]</code> ต่อท้ายโจทย์ (หลัง <code>//</code>) ในช่อง <code>Q:</code> — ใช้ในตัวเลือก <code>A: B: C: D:</code> หรือ <code>SOL:</code> ของอัตนัยได้เช่นกัน</li>
    <li>เขียนทั้งหมดในบรรทัดเดียว คั่นแต่ละรายการด้วย <code>;</code> และ <b>รายการแรกต้องเป็น</b> <code>range:</code></li>
    <li>ระบบวาดแกน x, y ตาราง และปรับขนาดให้พอดีโจทย์เอง · สมการเขียนแบบ LaTeX <b>ไม่ต้องใส่ $</b></li>
    <li>ใช้ค่าสัมบูรณ์ให้เขียน <code>\\lvert x \\rvert</code> (ไม่ใช้ | ) · ใช้เลขอารบิก</li>
    <li>หรือเลือก “กราฟประกอบโจทย์” ในขั้นที่ ๑ แล้ว AI จะเขียนคำสั่งกราฟให้เอง</li></ol></div>`;
  const cmds = `<div class="xg-h">คำสั่งทั้งหมด</div><div class="xg-tw"><table class="xg-t"><tbody>`
    + XG_CMDS.map(([c, d, ex]) => `<tr><td class="xg-l"><b>${escH(c)}</b></td><td>${escH(d)}</td><td>${xgCode(ex)}</td></tr>`).join("") + `</tbody></table></div>`;
  const lines = `<div class="xg-h">จุด เส้นตรง เส้นประ — สรุปสั้น ๆ</div><div class="xg-box"><ul>
    <li><b>วางจุด:</b> <code>ptc: A(2,3)</code> (มีชื่อ+พิกัด) · <code>pt: A(2,3)</code> (มีชื่อ) · <code>dot: (2,3)</code> (จุดเฉย ๆ)</li>
    <li><b>เส้นตรง/เส้นโค้ง (ทึบ):</b> <code>eq: y=2x+1</code> · แนวตั้ง <code>eq: x=3</code></li>
    <li><b>เส้นประ:</b> <code>eqd: y=2x+1</code> (จากสมการ) · <code>segd: (0,0)-(3,4)</code> (ส่วนของเส้นตรง)</li>
    <li><b>ลากเส้นระหว่างจุด:</b> <code>seg: (0,0)-(3,4)</code> · ต่อหลายจุดเป็นเส้นหัก <code>seg: (0,0)-(2,3)-(4,1)</code></li>
    <li><b>แรเงาบริเวณ:</b> ใช้อสมการ <code>eq: y\\geq x+1</code> หรือหลายเงื่อนไข <code>reg: x\\geq 0 &amp; y\\geq 0</code></li></ul></div>`;
  const exs = `<div class="xg-h">ตัวอย่าง (แตะโค้ดเพื่อคัดลอก · กด “ลองแก้” เพื่อทดลองในช่องทดสอบ)</div>` + XG_EX.map(([t, sp]) => {
    const full = "[[G: " + sp + "]]";
    return `<div class="xg-ex"><div class="xg-exh"><b>${escH(t)}</b><button type="button" class="xg-try" data-xgtry="${escH(full)}">ลองแก้</button></div>${xgCode(full)}<div class="xg-exg">${gxHtml(sp, { w:50, h:44 }, 1)}</div></div>`;
  }).join("");
  const full = `<div class="xg-h">ตัวอย่างข้อสอบเต็มรูปแบบ (กราฟในโจทย์ และกราฟในตัวเลือก)</div><pre class="xg-pre" data-xgc="${escH(XG_FULL)}" title="แตะเพื่อคัดลอก">${escH(XG_FULL)}</pre>`;
  return how + lines + cmds + exs + full;
}
function xgTryHtml(){
  return `<div class="xg-box"><b>ช่องทดลองพิมพ์</b><div class="xg-sub">พิมพ์สมการ ($ … $) คำสั่งกราฟ ([[G: … ]]) หรือตาราง ([[T: … ]]) แล้วดูผลทันที — เหมือนที่จะปรากฏในข้อสอบ</div></div>
    <textarea id="xgTry" class="xg-ta" spellcheck="false">จงหาความชันของเส้นตรง $l$ จากกราฟ // [[G: range: -3,6,-3,6; eq: y=\\frac{1}{2}x+1 ~ l; ptc: A(0,1); ptc: B(4,3)]]</textarea>
    <div class="xg-h">ผลลัพธ์</div><div class="xg-pv" id="xgPv"></div>`;
}
function xgNoteHtml(){
  const li = a => a.map(x => `<li>${x}</li>`).join("");
  return `<div class="xg-box"><b>รูปแบบคำตอบที่ระบบอ่านได้</b><ul>${li([
    "<code>[[MC 1]]</code> ขึ้นต้นข้อปรนัย · <code>[[WR 1]]</code> ขึ้นต้นข้ออัตนัย · เว้น ๑ บรรทัดระหว่างข้อ",
    "<code>Q:</code> โจทย์ · <code>A: B: C: D:</code> ตัวเลือก (ไม่ต้องใส่ ก. ข. ค. ง.) · <code>ANS:</code> เฉลย (ก ข ค ง) · <code>SOL:</code> วิธีคิด",
    "อัตนัยเพิ่ม <code>PTS:</code> คะแนนข้อนั้น · <code>LINES:</code> จำนวนบรรทัดเส้นประ · <code>ANS:</code> คำตอบสุดท้าย",
    "<code>IND:</code> รหัสตัวชี้วัด · <code>LAY:</code> 1 = ตัวเลือกเรียงลง · 2 = จัด ๒ บรรทัด"])}</ul></div>
    <div class="xg-box"><b>ข้อควรระวัง</b><ul>${li([
    "ห้ามเว้นบรรทัดกลางสมการ ถ้าจะขึ้นบรรทัดใหม่ให้ใช้ <code>//</code>",
    "การเคาะเว้นวรรคในสมการไม่มีผล (ถูกยุบทิ้ง) ถ้าต้องการเว้นระยะให้ใส่ <code>\\,</code> (เล็ก) · <code>\\quad</code> (กลาง) · <code>\\qquad</code> (มาก) <b>ไว้ข้างใน</b> $ … $",
    "ช่อง “สูตรที่ต้องการ” (หัวกระดาษ): ๑ บรรทัด = ๑ แถว สูตรหลายตัวในบรรทัดเดียวระบบเว้นระยะให้เอง",
    "เมทริกซ์และระบบสมการ (<code>\\begin{…} … \\end{…}</code>) ต้องเขียนอยู่ในบรรทัดเดียว",
    "เปอร์เซ็นต์ในสมการต้องเป็น <code>\\%</code> (ถ้าอยู่นอก $ พิมพ์ % ได้ตามปกติ)",
    "ในสมการใช้เลขอารบิก (0-9) และห้ามใส่ภาษาไทยใน $ … $",
    "ตาราง <code>[[T: … ]]</code> ต้องปิดด้วย <code>]]</code> เสมอ · ห้ามใช้ตาราง Markdown แบบ <code>|---|</code> · ช่องแรกของแถวห้ามขึ้นต้นด้วย “ก.” “ข.” เพราะระบบจะอ่านเป็นตัวเลือก · ตัวเลือกปรนัยที่เป็นตารางจะถูกจัดเป็นแถวเดียวต่อบรรทัด",
    "ถ้าคำสั่งกราฟผิด จะมีข้อความสีเทา “⚠ …” ใต้กราฟ บอกว่าผิดที่รายการไหน — แก้ในช่องแก้ไขข้อสอบได้เลย",
    "กราฟแสดงเฉพาะแกน x, y แบบเส้น จุด และบริเวณแรเงา (ยังไม่รองรับแผนภูมิแท่ง วงกลม หรือเส้นจำนวน)",
    "ถ้าให้นักเรียนอ่านค่าจากกราฟ อย่าเขียนค่านั้นซ้ำในโจทย์ และให้จุดสำคัญอยู่บนจุดตัดของตาราง (พิกัดเป็นจำนวนเต็ม)"])}</ul></div>`;
}
function xgHtml(){
  const tab = (k, t, on) => `<button type="button" data-xgt="${k}"${on ? ' class="on"' : ""}>${t}</button>`;
  return `<div class="xg-wrap"><div class="xg-tabs">${tab("m", "✍ สมการ", 1)}${tab("g", "📈 กราฟ")}${tab("b", "📊 ตาราง")}${tab("t", "🧪 ลองพิมพ์")}${tab("n", "⚠ ข้อควรรู้")}</div>`
    + `<section data-xgp="m">${xgMathHtml()}</section><section data-xgp="g" hidden>${xgGraphHtml()}</section><section data-xgp="b" hidden>${xgTableHtml()}</section>`
    + `<section data-xgp="t" hidden>${xgTryHtml()}</section><section data-xgp="n" hidden>${xgNoteHtml()}</section></div>`;
}
/* KaTeX สำหรับหน้าคู่มือ (โหลดครั้งแรกที่เปิดคู่มือ) */
function xgKatex(cb){
  if(window.katex && window.renderMathInElement){ cb(); return; }
  if(!xgKatex.p) xgKatex.p = new Promise((ok, no) => {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"; document.head.appendChild(l);
    const a = document.createElement("script"); a.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    a.onload = () => { const b = document.createElement("script"); b.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"; b.onload = ok; b.onerror = no; document.head.appendChild(b); };
    a.onerror = no; document.head.appendChild(a);
  });
  xgKatex.p.then(cb, () => { xgKatex.p = null; });
}
function xgRenderMath(){
  xgKatex(() => { const b = xm.mBody; if(!b) return; b.querySelectorAll(".xg-m").forEach(el => { try{ window.katex.render(el.dataset.t, el, { throwOnError:false }); }catch(e){ el.textContent = el.dataset.t; } }); });
}
function xgTry(){
  const b = xm.mBody, ta = $("#xgTry", b), pv = $("#xgPv", b); if(!ta || !pv) return;
  pv.innerHTML = xmTx(ta.value, XM_GBOX.mc);
  xgKatex(() => { try{ window.renderMathInElement(pv, { delimiters:[{ left:"$$", right:"$$", display:true }, { left:"$", right:"$", display:false }], throwOnError:false }); }catch(e){} });
}
function xgTab(k){
  const b = xm.mBody;
  b.querySelectorAll("[data-xgt]").forEach(x => x.classList.toggle("on", x.dataset.xgt === k));
  b.querySelectorAll("[data-xgp]").forEach(x => { x.hidden = x.dataset.xgp !== k; });
  b.scrollTop = 0; if(k === "t") xgTry();
}
function xmGuideBind(){
  const b = xm.mBody; if(b._xg) return; b._xg = 1;
  b.addEventListener("click", e => {
    const tb = e.target.closest("[data-xgt]"); if(tb){ xgTab(tb.dataset.xgt); return; }
    const tr = e.target.closest("[data-xgtry]"); if(tr){ const ta = $("#xgTry", b); if(ta){ ta.value = tr.dataset.xgtry; xgTab("t"); } return; }
    const c = e.target.closest("[data-xgc]"); if(c){ pfCopyText(c.dataset.xgc, "คัดลอกแล้ว"); }
  });
  b.addEventListener("input", e => { if(e.target.id === "xgTry") xgTry(); });
}
function xmOpenGuide(){
  xmModalOpen("📖 คู่มือเขียนสมการ กราฟ และตาราง", `<button type="button" class="xm-done">ปิด</button>`, xgHtml());
  xmGuideBind(); xgRenderMath(); xgRenderTbl();
}
const xgStyle = document.createElement("style");
xgStyle.id = "xgCss";
xgStyle.textContent = `
#xmModal .xg-exg .xtw,#xmModal .xg-pv .xtw{line-height:1.5; color:#000;} #xmModal .xtw{margin:6px 0 2px; line-height:1.5;} #xmModal .xtc{text-align:center; font-weight:700; margin-bottom:4px;} #xmModal .xtn{text-align:center; font-size:12.5px; color:#6B7280; margin-top:4px;}
#xmModal .xt{border-collapse:collapse; margin:0 auto; font-size:14px;} #xmModal .xt th,#xmModal .xt td{border:1.3px solid #333; padding:3px 12px; text-align:center; vertical-align:middle; line-height:1.5;} #xmModal .xt th{background:#ECEFF5; font-weight:700;} #xmModal .xt td.rh{background:#F5F7FB; font-weight:700;} #xmModal .xt tr.tot td{font-weight:700; border-top:3px double #333;}
html[data-theme="dark"] #xmModal .xt th,html[data-theme="dark"] #xmModal .xt td,html[data-theme="black"] #xmModal .xt th,html[data-theme="black"] #xmModal .xt td{border-color:#8A93A8;} html[data-theme="dark"] #xmModal .xt th,html[data-theme="black"] #xmModal .xt th{background:#262d44;}
.xm-guide-row{display:flex; justify-content:flex-end; margin:10px 0 0;}
#xmModal .xg-wrap{--c-main:#E8590C; --c-bg:#FFF0E5; --c-ink:#9A3A00; font-size:14.5px; line-height:1.55; color:var(--ink,#1B2233);}
#xmModal .xg-tabs{display:flex; gap:6px; flex-wrap:wrap; position:sticky; top:-8px; z-index:3; margin:-8px -16px 10px; padding:10px 16px 8px; background:#fff; border-bottom:1px solid #EEF1F8;}
#xmModal .xg-tabs button{padding:7px 12px; border-radius:12px; border:1.5px solid #E1E7F3; background:#fff; color:var(--ink,#1B2233); font:inherit; font-size:14px; font-weight:600; cursor:pointer;}
#xmModal .xg-tabs button.on{background:var(--c-main); border-color:var(--c-main); color:#fff;}
#xmModal .xg-box{margin:0 0 10px; padding:10px 14px; border-radius:14px; background:var(--c-bg); border:1.5px solid #FFD8BF;}
#xmModal .xg-box ul,#xmModal .xg-box ol{margin:6px 0 2px; padding-left:20px;} #xmModal .xg-box li{margin:3px 0;}
#xmModal .xg-sub{margin-top:6px; font-size:12.5px; color:#6B7280;}
#xmModal .xg-h{margin:16px 0 6px; font-weight:700; color:var(--c-ink);}
#xmModal .xg-tw{overflow-x:auto; -webkit-overflow-scrolling:touch;}
#xmModal .xg-t{width:100%; border-collapse:collapse; font-size:13.5px;}
#xmModal .xg-t td{padding:6px 8px; border-bottom:1px solid #EEF1F8; vertical-align:middle;}
#xmModal .xg-t .xg-l{min-width:130px; font-weight:600;} #xmModal .xg-t .xg-r{min-width:90px;}
#xmModal code,#xmModal .xg-c{font-family:Consolas,Menlo,monospace; font-size:12.5px; background:#F4F6FB; border-radius:6px; padding:1px 5px; color:#9A3A00; word-break:break-word;}
#xmModal .xg-c{display:inline-block; cursor:pointer;} #xmModal .xg-c:hover{background:#FFE8D6;}
#xmModal .xg-ex{margin:8px 0; padding:10px 12px; border:1.5px solid #E1E7F3; border-radius:14px;}
#xmModal .xg-exh{display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;}
#xmModal .xg-try{padding:4px 10px; border-radius:10px; border:1.5px solid var(--c-main); background:transparent; color:var(--c-ink); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;}
#xmModal .xg-exg{margin-top:8px; padding:6px; background:#fff; border:1px dashed #D8DEEC; border-radius:10px; text-align:center; line-height:0;}
#xmModal .xg-exg .fg,#xmModal .xg-pv .fg{margin:0; text-align:center; line-height:0;} #xmModal .xg-exg svg,#xmModal .xg-pv svg{display:inline-block; max-width:100%; height:auto;}
#xmModal .xg-exg .gerr,#xmModal .xg-pv .gerr{line-height:1.3; font-size:12.5px; color:#B45309;}
#xmModal .xg-pre{margin:0; padding:10px 12px; background:#F4F6FB; border-radius:12px; font-family:Consolas,Menlo,monospace; font-size:12px; line-height:1.5; white-space:pre-wrap; word-break:break-word; cursor:pointer; color:#1B2233;}
#xmModal .xg-ta{width:100%; box-sizing:border-box; min-height:110px; padding:10px 12px; border:1.5px solid #E1E7F3; border-radius:14px; font-family:Consolas,Menlo,monospace; font-size:13px; line-height:1.5; background:#fff; color:#1B2233; resize:vertical;}
#xmModal .xg-ta:focus{outline:none; border-color:var(--c-main);}
#xmModal .xg-pv{padding:12px 14px; border:1.5px solid #E1E7F3; border-radius:14px; background:#fff; color:#000; font-size:16px; line-height:1.5; min-height:60px;}
html[data-theme="dark"] #xmModal .xg-tabs,html[data-theme="black"] #xmModal .xg-tabs{background:#171b2b; border-color:#2c3450;}
html[data-theme="dark"] #xmModal .xg-tabs button,html[data-theme="black"] #xmModal .xg-tabs button,html[data-theme="dark"] #xmModal .xg-ta,html[data-theme="black"] #xmModal .xg-ta{background:#1d2233; border-color:#2c3450; color:#E8ECF6;}
html[data-theme="dark"] #xmModal .xg-tabs button.on,html[data-theme="black"] #xmModal .xg-tabs button.on{background:var(--c-main); border-color:var(--c-main); color:#fff;}
html[data-theme="dark"] #xmModal .xg-box,html[data-theme="black"] #xmModal .xg-box{background:#2a2118; border-color:#4a3524;}
html[data-theme="dark"] #xmModal .xg-ex,html[data-theme="black"] #xmModal .xg-ex,html[data-theme="dark"] #xmModal .xg-t td,html[data-theme="black"] #xmModal .xg-t td,html[data-theme="dark"] #xmModal .xg-pv,html[data-theme="black"] #xmModal .xg-pv{border-color:#2c3450;}
html[data-theme="dark"] #xmModal code,html[data-theme="black"] #xmModal code,html[data-theme="dark"] #xmModal .xg-pre,html[data-theme="black"] #xmModal .xg-pre{background:#1d2233; color:#FFB98A;}
html[data-theme="dark"] #xmModal .xg-wrap,html[data-theme="black"] #xmModal .xg-wrap{color:#E8ECF6;} html[data-theme="dark"] #xmModal .xg-h,html[data-theme="black"] #xmModal .xg-h{color:#FFB98A;}
`;
document.head.appendChild(xgStyle);

const xaStyle = document.createElement("style");
xaStyle.id = "xaCss";
xaStyle.textContent = `
.xm-ask{position:fixed; inset:0; z-index:100000; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(20,24,38,.5);}
.xm-ask-box{width:min(420px,100%); box-sizing:border-box; padding:20px 20px 16px; border-radius:20px; background:#fff; color:#1B2233; box-shadow:0 24px 60px -20px rgba(0,0,0,.5);}
.xm-ask-box b:first-child{display:block; font-size:17px; margin-bottom:6px;}
.xm-ask-box p{margin:0 0 14px; line-height:1.6; font-size:14.5px;}
.xm-ask-btns{display:grid; gap:8px;} .xm-ask-btns .btn{width:100%; justify-content:center;}
html[data-theme="dark"] .xm-ask-box,html[data-theme="black"] .xm-ask-box{background:#1d2233; color:#E8ECF6;}
`;
document.head.appendChild(xaStyle);

/* ---------- อัปเดตหน้าจอ ---------- */
function xmSumHtml(){
  const sel = xmSel();
  return xmSecs.map(s => {
    const rows = s.items.filter(x => sel.has(x.key)); if(!rows.length) return "";
    return `<div class="pl-sg">${escH(s.title)}</div>` + rows.map(x => {
      const c = XM.cnt[x.key] || {};
      return `<div class="pl-pk xm-pk"><span class="pl-clamp"><i>${escH(x.code)}</i>${escH(x.text)}</span>`
        + `<span class="xm-n"><label>ปรนัย<input type="number" inputmode="numeric" min="0" max="99" data-cn="mc" data-k="${escH(x.key)}" value="${escH(c.mc ?? "")}" placeholder="–"></label><label>อัตนัย<input type="number" inputmode="numeric" min="0" max="99" data-cn="wr" data-k="${escH(x.key)}" value="${escH(c.wr ?? "")}" placeholder="–"></label></span>`
        + `<button type="button" data-rm="${escH(x.key)}" aria-label="เอาออก">✕</button></div>`;
    }).join("");
  }).join("");
}
function xmTallyUpdate(){
  const el = $("#xmTally", xm.view); if(!el) return;
  const picked = xmPicked(); if(!picked.length){ el.textContent = ""; return; }
  const t = xmTally(), n1 = xn("n1"), n2 = xn("n2"), over = t.mc > n1 || t.wr > n2;
  el.innerHTML = `ช่อง “ปรนัย/อัตนัย” ใส่จำนวนข้อต่อตัวชี้วัดได้ (เว้นว่าง = ให้ AI กระจายเอง) · กำหนดแล้ว ปรนัย ${t.mc}/${n1} · อัตนัย ${t.wr}/${n2}` + (over ? ` <b style="color:#EA4335;">เกินจำนวนข้อทั้งหมด</b>` : "");
}
function xmUpdate(){
  if(!xm.view) return;
  const g = XM.grade, picked = xmPicked();
  $("#xmGradeTxt", xm.view).textContent = g || "แตะเพื่อเลือก"; $("#xmPickGrade", xm.view).classList.toggle("set", !!g);
  $("#xmIndTxt", xm.view).textContent = !g ? "แตะเพื่อเลือก (ค้นหาได้ทุกชั้น)" : picked.length ? `เลือกแล้ว ${plNum(picked.length)} ตัวชี้วัด` : "แตะเพื่อเลือก";
  $("#xmPickInd", xm.view).classList.toggle("set", picked.length > 0);
  $("#xmSum", xm.view).innerHTML = xmSumHtml();
  xmTallyUpdate();
  if(xm.modal && xm.modal.classList.contains("show")){
    const c = $("#xmCount", xm.mAct); if(c) c.textContent = `${plNum(picked.length)} ข้อ`;
    xmSecs.forEach((s, si) => { const b = $(`.pl-all[data-sec="${si}"]`, xm.mBody); if(b) b.textContent = s.items.every(x => xmSel().has(x.key)) ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"; });
  }
}

/* ---------- ผลลัพธ์ ---------- */
function xmWarns(d){
  const w = [];
  d.mc.forEach(it => {
    if(!String(it.q).trim()) w.push(`ปรนัยข้อ ${it.n}: ยังไม่มีโจทย์`);
    if(it.ch.length < 2) w.push(`ปรนัยข้อ ${it.n}: ตัวเลือกไม่ครบ`);
    else if(it.ch.length !== 4) w.push(`ปรนัยข้อ ${it.n}: มี ${it.ch.length} ตัวเลือก (ปกติ ๔)`);
    if(it.ans < 0 || it.ans >= it.ch.length) w.push(`ปรนัยข้อ ${it.n}: ยังไม่มีเฉลย`);
  });
  d.wr.forEach(it => { if(!String(it.q).trim()) w.push(`อัตนัยข้อ ${it.n}: ยังไม่มีโจทย์`); });
  return w;
}
function xmStatusHtml(){
  const d = XM.data, a = d.mc.length, b = d.wr.length, n1 = xn("n1"), n2 = xn("n2"), warn = xmWarns(d);
  let h = `<b>ปรนัย ${a} ข้อ · อัตนัย ${b} ข้อ</b>`;
  if(a !== n1 || b !== n2) h += ` <span class="xm-w">(ที่ตั้งไว้ ${n1}/${n2})</span>`;
  if(warn.length) h += `<div class="xm-w">⚠ ${warn.slice(0, 6).map(escH).join("<br>⚠ ")}${warn.length > 6 ? `<br>… และอีก ${warn.length - 6} รายการ` : ""}</div>`;
  return h;
}
function xmCovHtml(){
  const d = XM.data, map = new Map();
  d.mc.forEach(it => { const k = xmAr(it.ind).replace(/\s+/g, " ").trim() || "(ไม่ระบุ)"; (map.get(k) || map.set(k, { a:0, b:0 }).get(k)).a++; });
  d.wr.forEach(it => { const k = xmAr(it.ind).replace(/\s+/g, " ").trim() || "(ไม่ระบุ)"; (map.get(k) || map.set(k, { a:0, b:0 }).get(k)).b++; });
  if(!map.size || (map.size === 1 && map.has("(ไม่ระบุ)"))) return "";
  return `<div class="xm-covt">ความครอบคลุมตัวชี้วัด</div>` + [...map].map(([k, v]) => `<span class="xm-cv"><i>${escH(k)}</i> ปรนัย ${v.a} · อัตนัย ${v.b}</span>`).join("");
}
function xmStatRefresh(){
  if(!XM.data || !xm.view) return;
  $("#xmStat", xm.view).innerHTML = xmStatusHtml();
  $("#xmCov", xm.view).innerHTML = xmCovHtml();
}
/* ---------- ตัวแก้ไขรายข้อ (ฝั่งซ้าย) ---------- */
const xmLayLbl = l => l === 2 ? "▦ 2 บรรทัด" : "☰ เรียงลง";
function xmEdMc(it, i){
  const bad = it.ans < 0 || it.ans >= it.ch.length;
  return `<div class="xm-ed" data-t="mc" data-i="${i}">
    <div class="xm-edh"><b class="xm-no">${it.n}</b>
      <label class="xm-ans">เฉลย <select data-ef="ans">${bad ? `<option value="-1" selected>?</option>` : ""}${it.ch.map((c, k) => `<option value="${k}"${it.ans === k ? " selected" : ""}>${XM_L[k]}</option>`).join("")}</select></label>
      <button type="button" class="xm-lay" data-lay title="สลับการจัดวางตัวเลือก">${xmLayLbl(xmLayOf(it))}</button>
      <button type="button" class="xm-lay" data-shuf title="สลับตำแหน่งตัวเลือกข้อนี้">🔀 สลับช้อย</button>
      <button type="button" class="xm-x" data-del aria-label="ลบข้อ ${it.n}">✕</button></div>
    <textarea class="tl-ta xm-q" data-ef="q" rows="2" aria-label="โจทย์ข้อ ${it.n}">${escH(it.q)}</textarea>
    <div class="xm-chs">${it.ch.map((c, k) => `<label class="xm-ch"><span>${XM_L[k]}.</span><textarea class="tl-ta" data-ef="ch" data-k="${k}" rows="1" aria-label="ตัวเลือก ${XM_L[k]} ข้อ ${it.n}">${escH(c)}</textarea></label>`).join("")}</div>
    <textarea class="tl-ta xm-sol" data-ef="sol" rows="2" placeholder="วิธีคิด / เฉลย (แสดงเฉพาะตอนพิมพ์เฉลย)" aria-label="เฉลยข้อ ${it.n}">${escH(it.sol)}</textarea>
    <input class="xm-in" data-ef="ind" value="${escH(it.ind)}" placeholder="ตัวชี้วัดที่ข้อนี้วัด" autocomplete="off">
  </div>`;
}
function xmEdWr(it, i){
  return `<div class="xm-ed" data-t="wr" data-i="${i}">
    <div class="xm-edh"><b class="xm-no">${it.n}</b>
      <label class="xm-ans">คะแนน <input type="number" inputmode="decimal" min="0" step="0.5" data-ef="pts" value="${it.pts || ""}" placeholder="–"></label>
      <label class="xm-ans">บรรทัด <input type="number" inputmode="numeric" min="0" max="40" data-ef="lines" value="${it.lines || ""}" placeholder="auto"></label>
      <button type="button" class="xm-x" data-del aria-label="ลบข้ออัตนัย ${it.n}">✕</button></div>
    <textarea class="tl-ta xm-q" data-ef="q" rows="3" aria-label="โจทย์อัตนัยข้อ ${it.n}">${escH(it.q)}</textarea>
    <textarea class="tl-ta xm-sol" data-ef="sol" rows="3" placeholder="วิธีทำ (ขึ้นบรรทัดใหม่ด้วย //) — แสดงเฉพาะตอนพิมพ์เฉลย" aria-label="วิธีทำข้อ ${it.n}">${escH(it.sol)}</textarea>
    <input class="xm-in" data-ef="ans" value="${escH(it.ans)}" placeholder="คำตอบสุดท้าย" autocomplete="off">
    <input class="xm-in" data-ef="ind" value="${escH(it.ind)}" placeholder="ตัวชี้วัดที่ข้อนี้วัด" autocomplete="off">
  </div>`;
}
function xmEdHtml(){
  const d = XM.data; if(!d) return "";
  let h = "";
  if(d.mc.length || !d.wr.length) h += `<div class="xm-sech">ตอนปรนัย <small>${d.mc.length} ข้อ</small></div>` + d.mc.map(xmEdMc).join("") + `<button type="button" class="btn btn-outline btn-sm xm-add" id="xmAddMc">＋ เพิ่มข้อปรนัย</button>`;
  if(d.wr.length || !d.mc.length) h += `<div class="xm-sech">ตอนอัตนัย <small>${d.wr.length} ข้อ</small></div>` + d.wr.map(xmEdWr).join("") + `<button type="button" class="btn btn-outline btn-sm xm-add" id="xmAddWr">＋ เพิ่มข้ออัตนัย</button>`;
  else h += `<button type="button" class="btn btn-outline btn-sm xm-add" id="xmAddWr">＋ เพิ่มข้ออัตนัย</button>`;
  return h;
}
function xmEdRender(){ const el = $("#xmEd", xm.view); if(el) el.innerHTML = xmEdHtml(); }
function xmRender(){
  if(!XM.data) return;
  xmStatRefresh();
  xmEdRender();
  $("#xmLayBox", xm.view).style.display = XM.data.mc.length ? "" : "none";
  $("#xmAnsBtn", xm.view).textContent = XM.ans ? "🙈 ซ่อนเฉลย" : "👁 แสดงเฉลย";
  xmPreview();
}
function xmPreview(){
  if(!XM.data || !xm.frame) return;
  xm.frame.srcdoc = xmDoc({ ans:XM.ans, print:false });
}
let xmPvT = 0;
const xmPreviewSoon = () => { if(!XM.data) return; clearTimeout(xmPvT); xmPvT = setTimeout(() => { xmStatRefresh(); xmPreview(); }, 450); };
function xmScale(){
  if(!xm.pv || !xm.frame) return;
  const w = xm.pv.clientWidth || 794, s = Math.min(1, w / 794), h = xm.h || 1123;
  xm.frame.style.height = h + "px"; xm.frame.style.transform = `scale(${s})`; xm.frame.style.left = Math.max(0, Math.round((w - 794 * s) / 2)) + "px"; xm.pv.style.height = Math.round(h * s) + "px";
}
function xmRefs(){ xm.pv = $("#xmPv", xm.view); xm.frame = $("#xmFrame", xm.view); if(xm.pv && window.ResizeObserver && xm.roEl !== xm.pv){ xm.roEl = xm.pv; try{ new ResizeObserver(() => xmScale()).observe(xm.pv); }catch(e){} } }
/* ไปขั้นที่ 0 = Prompt, 1 = วางคำตอบ/แก้ไข/พิมพ์ */
function xmGoStep(i, scroll){
  xm.step = i; const v = xm.view; if(!v) return;
  v.querySelectorAll(".xm-pg").forEach(p => { p.hidden = +p.dataset.pg !== i; });
  v.querySelectorAll("#xmSteps button").forEach(b => b.classList.toggle("on", +b.dataset.xs === i));
  v.classList.toggle("xm-wide", i === 1);
  if(i === 1 && XM.data){ $("#xmRes", v).style.display = ""; xmRender(); setTimeout(xmScale, 80); }
  if(scroll !== false){ const st = $("#xmSteps", v); if(st) st.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block:"start" }); }
}
function xmBuild(){
  const raw = ($("#xmRaw", xm.view).value || "").trim();
  if(!raw){ say("วางคำตอบจาก AI ก่อนนะครับ"); return; }
  const d = xmParse(raw);
  if(!d.mc.length && !d.wr.length){ say("ไม่พบข้อสอบในข้อความ — ต้องมี [[MC 1]] หรือ [[WR 1]] ตามที่ Prompt กำหนด"); return; }
  if(XM.data && XM.edited && !confirm("ข้อสอบนี้มีส่วนที่แก้ไขไว้ การสร้างใหม่จะทับการแก้ไขทั้งหมด ต้องการสร้างใหม่ไหม?")) return;
  XM.lay = {}; XM.parsedRaw = raw; XM.edited = false;
  XM.raw = raw; XM.data = d; XM.open.ans = false; xmSave(); xmLibRefresh();
  const card = $('[data-card="ans"]', xm.view); if(card) card.classList.add("collapsed");
  $("#xmRes", xm.view).style.display = ""; xmRender();
  setTimeout(xmScale, 80);
  $("#xmRes", xm.view).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block:"start" });
}
/* แก้ไขรายข้อ */
function xmEdInput(e){
  const ed = e.target.closest && e.target.closest(".xm-ed"); if(!ed || !XM.data) return false;
  const f = e.target.dataset && e.target.dataset.ef; if(!f) return false;
  const it = (XM.data[ed.dataset.t] || [])[+ed.dataset.i]; if(!it) return true;
  const v = e.target.value;
  if(f === "ch") it.ch[+e.target.dataset.k] = v;
  else if(f === "ans" && ed.dataset.t === "mc") it.ans = parseInt(v, 10);
  else if(f === "pts"){ const p = parseFloat(v); it.pts = Number.isFinite(p) && p > 0 ? p : 0; }
  else if(f === "lines"){ const n = parseInt(v, 10); it.lines = Number.isFinite(n) && n > 0 ? Math.min(40, n) : 0; }
  else it[f] = v;
  XM.edited = true; xmSave(); xmPreviewSoon();
  return true;
}
/* สลับตัวเลือกปรนัย: ย้ายเฉลยไปตำแหน่งเป้าหมาย แล้วสุ่มตำแหน่งตัวเลือกที่เหลือ (ข้ามข้อที่ตัวเลือกอ้างอิงกันเอง) */
const XM_REFCH = /ทุกข้อ|ข้อ\s*[กขคง]|[กขคง]\s*(และ|กับ|หรือ)\s*[กขคง]|ถูกทั้ง|ไม่มีข้อ|ไม่มีตัวเลือก|ข้างต้น/;
function xmShufOk(it){ return it.ch.length >= 2 && it.ans >= 0 && it.ans < it.ch.length && !it.ch.some(c => XM_REFCH.test(c)); }
function xmShufTo(it, target){
  const n = it.ch.length, right = it.ch[it.ans];
  const rest = it.ch.filter((_, k) => k !== it.ans);
  for(let k = rest.length - 1; k > 0; k--){ const j = Math.floor(Math.random() * (k + 1)); [rest[k], rest[j]] = [rest[j], rest[k]]; }
  rest.splice(Math.min(target, n - 1), 0, right);
  it.ch = rest; it.ans = Math.min(target, n - 1);
}
function xmShufAll(){
  const list = XM.data.mc.filter(xmShufOk);
  if(!list.length) return 0;
  const n = 4;
  let t = [], best = null;
  for(let tries = 0; tries < 200; tries++){
    t = list.map((_, k) => k % n);
    for(let k = t.length - 1; k > 0; k--){ const j = Math.floor(Math.random() * (k + 1)); [t[k], t[j]] = [t[j], t[k]]; }
    const runOk = t.every((v, k) => k < 2 || !(v === t[k-1] && v === t[k-2]));
    const patOk = t.every((v, k) => k < 3 || !(t[k] === (t[k-1] + 1) % n && t[k-1] === (t[k-2] + 1) % n && t[k-2] === (t[k-3] + 1) % n));
    if(runOk && patOk){ best = t; break; }
  }
  t = best || t;
  list.forEach((it, k) => xmShufTo(it, t[k]));
  return list.length;
}
function xmEdClick(e){
  if(!XM.data) return false;
  const ed = e.target.closest(".xm-ed");
  if(ed){
    const arr = XM.data[ed.dataset.t], i = +ed.dataset.i, it = arr[i];
    if(e.target.closest("[data-lay]") && it){ it.lo = xmLayOf(it) === 2 ? 1 : 2; e.target.closest("[data-lay]").textContent = xmLayLbl(it.lo); XM.edited = true; xmSave(); xmPreviewSoon(); return true; }
    if(e.target.closest("[data-shuf]") && it){
      if(!xmShufOk(it)){ say(`ข้อ ${it.n}: สลับไม่ได้ (ตัวเลือกอ้างอิงกันเอง เช่น "ข้อ ก และ ข ถูก" หรือยังไม่มีเฉลย)`); return true; }
      let np; do{ np = Math.floor(Math.random() * it.ch.length); }while(it.ch.length > 1 && np === it.ans);
      xmShufTo(it, np); XM.edited = true; xmSave(); xmEdRender(); xmPreviewSoon(); return true;
    }
    if(e.target.closest("[data-del]") && it){
      if(!confirm(`ลบข้อ ${it.n} ออกจากข้อสอบ?`)) return true;
      arr.splice(i, 1); arr.forEach((x, k) => { x.n = k + 1; }); XM.edited = true; xmSave(); xmEdRender(); xmStatRefresh(); xmPreviewSoon(); return true;
    }
    return false;
  }
  if(e.target.closest("#xmAddMc")){ XM.data.mc.push({ n:XM.data.mc.length + 1, ind:"", lay:0, q:"", ch:["", "", "", ""], ans:0, sol:"" }); XM.edited = true; xmSave(); xmEdRender(); xmStatRefresh(); xmPreviewSoon(); const t = [...$("#xmEd", xm.view).querySelectorAll('[data-t="mc"] [data-ef="q"]')].pop(); if(t) t.focus(); return true; }
  if(e.target.closest("#xmAddWr")){ XM.data.wr.push({ n:XM.data.wr.length + 1, ind:"", pts:0, lines:0, q:"", sol:"", ans:"" }); XM.edited = true; xmSave(); xmEdRender(); xmStatRefresh(); xmPreviewSoon(); const t = [...$("#xmEd", xm.view).querySelectorAll('[data-t="wr"] [data-ef="q"]')].pop(); if(t) t.focus(); return true; }
  if(e.target.closest("[data-shufall]")){
    const c = xmShufAll(), tot = XM.data.mc.length;
    if(!c){ say("ไม่มีข้อที่สลับได้"); return true; }
    XM.edited = true; xmSave(); xmEdRender(); xmPreviewSoon();
    say(c < tot ? `สลับตัวเลือกแล้ว ${c} ข้อ (ข้าม ${tot - c} ข้อที่ตัวเลือกอ้างอิงกันเอง/ไม่มีเฉลย)` : `สลับตัวเลือกครบ ${c} ข้อแล้ว`);
    return true;
  }
  const all = e.target.closest("[data-layall]");
  if(all){ const k = +all.dataset.layall; XM.data.mc.forEach(it => { if(k) it.lo = k; else delete it.lo; }); XM.lay = {}; XM.edited = true; xmSave(); xmEdRender(); xmPreviewSoon(); return true; }
  return false;
}
function xmPrint(ans){
  if(!XM.data) return;
  const w = window.open("", "_blank");
  if(!w){ say("เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาตป๊อปอัปแล้วลองอีกครั้ง"); return; }
  w.document.open(); w.document.write(xmDoc({ ans, print:true })); w.document.close();
}

registerTool({
  id:"exam", icon:"📋", color:"c-rose", title:"สร้างข้อสอบ", desc:"เลือกตัวชี้วัด · Prompt ให้ AI ออกข้อสอบปรนัย/อัตนัย · วางคำตอบเป็นข้อสอบพร้อมเฉลย",
  html:`<div id="xmWrap"></div>`,
  init(v){
    xm.view = v; xmRefreshSecs();
    $("#xmWrap", v).innerHTML = xmFormHtml();
    xmRefs(); xm.h = 1123;
    window.addEventListener("message", e => { if(xm.frame && e.source === xm.frame.contentWindow && e.data && e.data.kcXm){ xm.h = e.data.h; xmScale(); const pi = $("#xmPgInfo", xm.view); if(pi) pi.textContent = e.data.pages ? "· " + e.data.pages + " หน้า (เส้นประสีส้ม = ขอบหน้ากระดาษ)" : ""; } });
    window.addEventListener("resize", xmScale);
    if(window.ResizeObserver) new ResizeObserver(xmScale).observe(xm.pv);
    const toggle = e => {
      const t = e.target.closest(".pf-toggle"); if(!t) return false;
      const card = t.closest(".pf-card"), k = t.dataset.open;
      card.classList.toggle("collapsed"); XM.open[k] = !card.classList.contains("collapsed"); xmSave(); return true;
    };
    v.addEventListener("input", e => {
      const t = e.target;
      if(xmEdInput(e)) return;
      if(t.matches("[data-cn]")){ const c = XM.cnt[t.dataset.k] || (XM.cnt[t.dataset.k] = { mc:"", wr:"" }); c[t.dataset.cn] = t.value; xmSave(); xmTallyUpdate(); return; }
      if(t.matches("[data-xf]")){ XM.v[t.dataset.xf] = t.value; xmSave(); if(t.dataset.xf === "n1" || t.dataset.xf === "n2") xmTallyUpdate(); xmPreviewSoon(); return; }
      if(t.id === "xmRaw"){ XM.raw = t.value; xmSave(); return; }
      if(t.id === "xmOut"){ const l = $("#xmLen", v); if(l) l.textContent = `${plNum(t.value.length.toLocaleString("en-US"))} ตัวอักษร`; }
    });
    v.addEventListener("change", e => {
      const t = e.target;
      if(xmEdInput(e)) return;
      if(t.matches("select[data-xf]")){
        XM.v[t.dataset.xf] = t.value; xmSave();
        if(t.dataset.xf === "subj") $("#xmSubjCustom", v).style.display = t.value === "custom" ? "" : "none";
        xmPreviewSoon(); return;
      }
      if(t.matches("[data-xc]")){
        XM.v[t.dataset.xc] = t.checked; xmSave();
        if(t.dataset.xc === "formula") $("#xmFormulaBox", v).style.display = t.checked ? "" : "none";
        xmPreviewSoon();
      }
    });
    v.addEventListener("click", e => {
      if(toggle(e)) return;
      if(xmLibClick(e)) return;
      const st = e.target.closest("[data-xs]"); if(st){ xmGoStep(+st.dataset.xs); return; }
      if(e.target.closest("#xmNext1")){ xmGoStep(1); return; }
      if(e.target.closest("#xmGuideBtn")){ xmOpenGuide(); return; }
      if(e.target.closest("#xmPickGrade")){ xmOpenGrade(); return; }
      if(e.target.closest("#xmPickInd")){ xmOpenInd(); return; }
      const rm = e.target.closest("[data-rm]");
      if(rm){ xmSel().delete(rm.dataset.rm); xmSave(); xmUpdate(); return; }
      if(e.target.closest("#xmGo")){
        if(!xn("n1") && !xn("n2")){ say("ตั้งจำนวนข้อปรนัยหรืออัตนัยก่อนนะครับ"); return; }
        if(!xmPicked().length && !String(xs("topic") || "").trim()){ say("เลือกตัวชี้วัด หรือพิมพ์เรื่องที่จะสอบก่อนนะครับ"); return; }
        const o = $("#xmOut", v); o.value = xmPrompt(); $("#xmOutWrap", v).style.display = "";
        $("#xmLen", v).textContent = `${plNum(o.value.length.toLocaleString("en-US"))} ตัวอักษร`;
        $("#xmOutWrap", v).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block:"start" });
        return;
      }
      if(e.target.closest("#xmCopy")){ pfCopyText($("#xmOut", v).value, "คัดลอก Prompt แล้ว นำไปวางใน AI ได้เลย"); return; }
      if(e.target.closest("#xmReset")){
        if(!confirm("ล้างข้อมูลที่กรอกในฟอร์มทั้งหมด?")) return;
        XM.v = {}; XM.cnt = {}; xmSave();
        const open = XM.open, step = xm.step || 0; $("#xmWrap", v).innerHTML = xmFormHtml(); XM.open = open;
        xmRefs(); xmUpdate(); xmGoStep(step, false); xmScale();
        return;
      }
      if(e.target.closest("#xmBuild")){ xmBuild(); return; }
      if(e.target.closest("#xmClear")){
        if(!confirm("ล้างคำตอบและข้อสอบที่สร้างไว้?")) return;
        XM.raw = ""; XM.data = null; XM.lay = {}; XM.parsedRaw = ""; XM.ans = false; XM.edited = false; XM.cur = ""; xmSave(); xmLibRefresh();
        $("#xmRaw", v).value = ""; $("#xmRes", v).style.display = "none"; return;
      }
      if(e.target.closest("#xmAnsBtn")){ XM.ans = !XM.ans; $("#xmAnsBtn", v).textContent = XM.ans ? "🙈 ซ่อนเฉลย" : "👁 แสดงเฉลย"; xmPreview(); return; }
      if(e.target.closest("#xmPrint")){ xmPrint(false); return; }
      if(e.target.closest("#xmPrintKey")){ xmPrint(true); return; }
      xmEdClick(e);
    });
    xmUpdate();
    if(!XM.data && XM.raw){ const d = xmParse(XM.raw); if(d.mc.length || d.wr.length){ XM.data = d; } }
    xmGoStep(XM.data ? 1 : 0, false);
  },
  onOpen(){ xmGoStep(xm.step || 0, false); setTimeout(xmScale, 80); if(!xm.autoSynced){ xm.autoSynced = true; setTimeout(() => xmCloudSync(true), 600); } }
});

const xmStyle = document.createElement("style");
xmStyle.id = "xmCss";
xmStyle.textContent = `
#view-tool-exam{--c-main:#E8590C; --c-bg:#FFF0E5; --c-ink:#9A3A00; --c-sh:rgba(232,89,12,.6); --c-on:#fff;}
#view-tool-exam .pl-pick.set{border-color:var(--c-main); background:var(--c-bg);}
#view-tool-exam .xm-part{margin-top:6px; padding:10px 12px 2px; border:1.5px solid #E1E7F3; border-radius:16px;}
#view-tool-exam .xm-part > b{display:block; margin-bottom:4px; font-size:14px; color:var(--c-ink);}
#view-tool-exam .xm-det{margin-top:14px; border:1.5px solid #E1E7F3; border-radius:16px; padding:0 12px 6px;}
#view-tool-exam .xm-det summary{cursor:pointer; padding:11px 0; font-weight:600; font-size:14px; color:var(--ink);}
#view-tool-exam .xm-sws{display:grid; gap:8px; margin-top:6px;}
#view-tool-exam .xm-pk .xm-n{flex:0 0 auto; display:flex; gap:6px;}
#view-tool-exam .xm-n label{display:flex; flex-direction:column; gap:2px; font-size:11px; color:var(--ink-soft);}
#view-tool-exam .xm-n input{width:48px; padding:5px 6px; border:1.5px solid #E1E7F3; border-radius:10px; font:inherit; font-size:13.5px; text-align:center; background:#fff; color:var(--ink);}
#view-tool-exam .xm-stat{margin-top:12px; font-size:14px; line-height:1.6; color:var(--ink);}
#view-tool-exam .xm-w{font-size:12.5px; color:#B45309;}
#view-tool-exam .xm-covt{margin-top:8px; font-size:12.5px; font-weight:600; color:var(--ink-soft);}
#view-tool-exam .xm-cv{display:inline-block; margin:4px 6px 0 0; padding:4px 9px; border-radius:10px; background:var(--c-bg); color:var(--c-ink); font-size:12.5px;}
#view-tool-exam .xm-cv i{font-style:normal; font-weight:700;}
#view-tool-exam .xm-chips{display:flex; flex-wrap:wrap; gap:6px;}
#view-tool-exam .xm-chip{min-width:48px; padding:6px 8px; border-radius:12px; border:1.5px solid #E1E7F3; background:#fff; color:var(--ink); font:inherit; font-size:13.5px; font-weight:600; cursor:pointer;}
#view-tool-exam .xm-chip i{font-style:normal; margin-left:5px; color:var(--c-main);}
#view-tool-exam .xm-chip:hover{border-color:var(--c-main);}
#view-tool-exam .xm-pv{position:relative; overflow:hidden; margin-top:14px; border-radius:14px; border:1.5px solid #E1E7F3; background:#fff; box-shadow:0 12px 26px -20px rgba(27,34,51,.5);}
#view-tool-exam .xm-pv iframe{position:absolute; top:0; left:0; width:794px; height:1123px; border:0; background:#fff; transform-origin:0 0;}
html[data-theme="dark"] #view-tool-exam .xm-part,html[data-theme="black"] #view-tool-exam .xm-part,html[data-theme="dark"] #view-tool-exam .xm-det,html[data-theme="black"] #view-tool-exam .xm-det,html[data-theme="dark"] #view-tool-exam .xm-pv,html[data-theme="black"] #view-tool-exam .xm-pv{border-color:#2c3450;}
html[data-theme="dark"] #view-tool-exam .xm-chip,html[data-theme="black"] #view-tool-exam .xm-chip,html[data-theme="dark"] #view-tool-exam .xm-n input,html[data-theme="black"] #view-tool-exam .xm-n input{background:#1d2233; border-color:#2c3450;}
html[data-theme="dark"] #view-tool-exam .xm-cv,html[data-theme="black"] #view-tool-exam .xm-cv{background:rgba(232,89,12,.2); color:#FFB27F;}
#view-tool-exam .xm-det{border-color:rgba(232,89,12,.5); background:linear-gradient(180deg,#FFF6EE,#fff); box-shadow:0 8px 20px -16px rgba(232,89,12,.8);}
#view-tool-exam .xm-det summary::marker{color:#E8590C;}
#view-tool-exam .xm-shim{display:inline-block; font-weight:800; font-size:15.5px; letter-spacing:.2px; background:linear-gradient(100deg,#E8590C 0%,#F59F00 18%,#EC5E9B 38%,#8E5CF0 58%,#2F9BFF 78%,#E8590C 100%); background-size:300% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; animation:xmShim 3.2s linear infinite; filter:drop-shadow(0 0 5px rgba(245,159,0,.45));}
@keyframes xmShim{0%{background-position:0% 50%;} 100%{background-position:300% 50%;}}
html[data-theme="dark"] #view-tool-exam .xm-det,html[data-theme="black"] #view-tool-exam .xm-det{background:#1d2233;}
@media (prefers-reduced-motion:reduce){#view-tool-exam .xm-shim{animation:none;}}
#view-tool-exam .xm-pg[hidden]{display:none !important;}
#view-tool-exam .xm-steps{display:flex; align-items:center; gap:8px; margin:6px 0 16px;}
#view-tool-exam .xm-steps i{flex:0 0 18px; height:2px; background:#E1E7F3;}
#view-tool-exam .xm-steps button{flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:9px 10px; border-radius:16px; border:1.5px solid #E1E7F3; background:#fff; color:var(--ink-soft); font:inherit; font-size:14px; font-weight:700; cursor:pointer; line-height:1.25;}
#view-tool-exam .xm-steps button b{flex:0 0 auto; width:26px; height:26px; border-radius:50%; display:grid; place-items:center; background:#CBD5E1; color:#fff; font-size:13.5px;}
#view-tool-exam .xm-steps button.on{border-color:var(--c-main); background:var(--c-bg); color:var(--c-ink);}
#view-tool-exam .xm-steps button.on b{background:var(--c-main);}
#view-tool-exam .xm-pg[data-pg="0"]{max-width:760px; margin:0 auto;}
#view-tool-exam .xm-work{display:flex; flex-direction:column; gap:14px; margin-top:12px;}
#view-tool-exam .xm-right{order:-1;}
#view-tool-exam .xm-pvbar{display:flex; align-items:center; justify-content:space-between; gap:8px;}
#view-tool-exam .xm-pv{margin-top:8px;}
#view-tool-exam .xm-layall{display:flex; align-items:center; flex-wrap:wrap; gap:6px; margin-top:8px; font-size:13px; color:var(--ink-soft);}
#view-tool-exam .xm-sech{margin:16px 0 4px; font-weight:800; font-size:15px; color:var(--c-ink);} #view-tool-exam .xm-sech small{font-weight:500; color:var(--ink-soft); margin-left:6px;}
#view-tool-exam .xm-ed{display:grid; gap:6px; margin-top:8px; padding:10px 12px; border:1.5px solid #E1E7F3; border-radius:14px; background:#fff;}
#view-tool-exam .xm-ed:focus-within{border-color:var(--c-main); box-shadow:0 0 0 3px var(--c-bg);}
#view-tool-exam .xm-edh{display:flex; align-items:center; gap:8px; flex-wrap:wrap;}
#view-tool-exam .xm-no{flex:0 0 auto; min-width:28px; height:28px; padding:0 6px; border-radius:14px; border:1.5px solid var(--ink); display:grid; place-items:center; font-size:13.5px; color:var(--ink); box-sizing:border-box;}
#view-tool-exam .xm-ans{display:flex; align-items:center; gap:5px; font-size:13px; color:var(--ink-soft);}
#view-tool-exam .xm-ans select,#view-tool-exam .xm-ans input{padding:5px 8px; border:1.5px solid #E1E7F3; border-radius:10px; font:inherit; font-size:13.5px; background:#fff; color:var(--ink);} #view-tool-exam .xm-ans input{width:64px;}
#view-tool-exam .xm-lay{margin-left:auto; padding:5px 10px; border-radius:10px; border:1.5px solid #E1E7F3; background:#fff; color:var(--c-ink); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;}
#view-tool-exam .xm-edh > .xm-x:first-of-type{margin-left:auto;}
#view-tool-exam .xm-x{width:28px; height:28px; padding:0; border-radius:50%; border:1.5px solid #CBD5E1; background:#fff; color:var(--ink-soft); cursor:pointer; font-size:13px;} #view-tool-exam .xm-x:hover{background:#EA4335; border-color:#EA4335; color:#fff;}
#view-tool-exam .xm-ed textarea{min-height:0; resize:vertical; font-size:14px;} #view-tool-exam .xm-q{min-height:56px;}
#view-tool-exam .xm-chs{display:grid; grid-template-columns:1fr 1fr; gap:6px;} #view-tool-exam .xm-ch{display:flex; align-items:flex-start; gap:5px; min-width:0;} #view-tool-exam .xm-ch span{flex:0 0 auto; padding-top:8px; font-weight:700; font-size:13.5px;} #view-tool-exam .xm-ch textarea{flex:1; min-width:0;}
#view-tool-exam .xm-sol{background:#F1FAF3; border-color:#BFE3C8;}
#view-tool-exam .xm-in{padding:7px 10px; border:1.5px solid #E1E7F3; border-radius:10px; font:inherit; font-size:13.5px; background:#fff; color:var(--ink); min-width:0;}
#view-tool-exam .xm-add{margin-top:10px;}
#view-tool-exam .xm-lib{margin:0 0 12px; padding:10px 12px; border:1.5px solid var(--c-main); border-radius:16px; background:var(--c-bg);}
#view-tool-exam .xm-lhead{display:flex; flex-wrap:wrap; align-items:center; gap:8px;}
#view-tool-exam .xm-lst{font-size:12.5px; color:#667;} #view-tool-exam .xm-lst.on{color:var(--c-ink); font-weight:600;} #view-tool-exam .xm-lst.warn{color:#B45309;}
#view-tool-exam .xm-llist{margin-top:10px; display:grid; gap:8px;}
#view-tool-exam .xm-lrow{display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; padding:9px 11px; background:#fff; border:1.5px solid #E1E7F3; border-radius:12px;}
#view-tool-exam .xm-lrow.on{border-color:var(--c-main);}
#view-tool-exam .xm-lmeta{display:grid; gap:2px; min-width:0;} #view-tool-exam .xm-lmeta b{font-size:14px; word-break:break-word;} #view-tool-exam .xm-lmeta span{font-size:12px; color:#667;}
#view-tool-exam .xm-lbtns,#view-tool-exam .xm-lfoot{display:flex; flex-wrap:wrap; gap:6px;}
#view-tool-exam .xm-bottom{margin-top:18px; padding-top:12px; border-top:2px solid var(--c-main);} #view-tool-exam .xm-bottom .pd-btns{margin-top:8px;}
html[data-theme="dark"] #view-tool-exam .xm-steps button,html[data-theme="black"] #view-tool-exam .xm-steps button,html[data-theme="dark"] #view-tool-exam .xm-ed,html[data-theme="black"] #view-tool-exam .xm-ed,html[data-theme="dark"] #view-tool-exam .xm-in,html[data-theme="black"] #view-tool-exam .xm-in,html[data-theme="dark"] #view-tool-exam .xm-ans select,html[data-theme="black"] #view-tool-exam .xm-ans select,html[data-theme="dark"] #view-tool-exam .xm-ans input,html[data-theme="black"] #view-tool-exam .xm-ans input,html[data-theme="dark"] #view-tool-exam .xm-lay,html[data-theme="black"] #view-tool-exam .xm-lay,html[data-theme="dark"] #view-tool-exam .xm-x,html[data-theme="black"] #view-tool-exam .xm-x{background:#1d2233; border-color:#2c3450;}
html[data-theme="dark"] #view-tool-exam .xm-sol,html[data-theme="black"] #view-tool-exam .xm-sol{background:#17261d; border-color:#2b5a3b;}
/* โหมด PC ของเว็บ (html.mode-pc): ซ้าย = ตั้งค่า/แก้ไขรายข้อ · ขวา = ตัวอย่างข้อสอบ (ค้างอยู่กับที่ขณะเลื่อน) */
html.mode-pc #view-tool-exam .xm-work{display:grid; grid-template-columns:minmax(360px,5fr) minmax(420px,6fr); gap:22px; align-items:start;}
html.mode-pc #view-tool-exam .xm-right{order:0; position:sticky; top:10px; max-height:calc(100vh - 20px); overflow:auto; padding-right:2px;}
html.mode-pc #view-tool-exam .xm-chs{grid-template-columns:1fr 1fr;}
`;
document.head.appendChild(xmStyle);

/* จัดลำดับปุ่มในเมนู: แผนการสอน → แบบฝึกหัด → สร้างข้อสอบ → สุ่มนักเรียน → จับกลุ่ม → ที่เหลือตามเดิม */
(function orderMenu(){
  const first = ["plan","ex","exam","random","groups"];
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

/* =====================================================================
   เครื่องมือ: สร้าง QR Code จากลิงก์
   - ตัวสร้าง QR เขียนเองในไฟล์นี้ (ไม่ต้องใช้อินเทอร์เน็ต/ไลบรารีภายนอก) รองรับเวอร์ชัน 1–40 ระดับแก้ไขข้อผิดพลาด L/M/Q/H
   - บันทึกเป็น PNG / SVG · คัดลอกรูป · พิมพ์
   ===================================================================== */
/* ---------- QR encoder (byte mode / UTF-8 / v1-40 / ECC L M Q H) ---------- */
const QRGEN = (function(){
  const ECC_PER_BLOCK = [
    [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
    [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
    [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]
  ];
  const NUM_BLOCKS = [
    [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
    [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
    [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
    [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]
  ];
  const ECL = { L:0, M:1, Q:2, H:3 };
  const FMT = [1, 0, 3, 2];

  const bit = (v, i) => ((v >>> i) & 1) !== 0;

  function rawModules(ver){
    let r = (16 * ver + 128) * ver + 64;
    if(ver >= 2){
      const n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if(ver >= 7) r -= 36;
    }
    return r;
  }
  const dataCodewords = (ver, e) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[e][ver] * NUM_BLOCKS[e][ver];

  function gfMul(x, y){
    let z = 0;
    for(let i = 7; i >= 0; i--){ z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
    return z;
  }
  function rsDivisor(deg){
    const r = new Array(deg).fill(0); r[deg - 1] = 1;
    let root = 1;
    for(let i = 0; i < deg; i++){
      for(let j = 0; j < r.length; j++){ r[j] = gfMul(r[j], root); if(j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = gfMul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, div){
    const r = div.map(() => 0);
    for(const b of data){
      const f = b ^ r.shift(); r.push(0);
      div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
    }
    return r;
  }

  function utf8(str){
    return Array.from(unescape(encodeURIComponent(str)), c => c.charCodeAt(0));
  }

  function alignPos(ver){
    if(ver === 1) return [];
    const n = Math.floor(ver / 7) + 2;
    const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    const r = [6];
    for(let p = ver * 4 + 10; r.length < n; p -= step) r.splice(1, 0, p);
    return r;
  }

  function penalty(m, size){
    let p = 0;
    const line = (get) => {
      let run = 1, prev = get(0);
      for(let i = 1; i < size; i++){
        const c = get(i);
        if(c === prev) run++; else { if(run >= 5) p += 3 + (run - 5); run = 1; prev = c; }
      }
      if(run >= 5) p += 3 + (run - 5);
      // finder-like 1:1:3:1:1 with 4 light modules on a side
      for(let i = 0; i + 11 <= size; i++){
        let a = true, b = true;
        const A = [1,0,1,1,1,0,1,0,0,0,0], B = [0,0,0,0,1,0,1,1,1,0,1];
        for(let k = 0; k < 11 && (a || b); k++){
          const v = get(i + k) ? 1 : 0;
          if(v !== A[k]) a = false;
          if(v !== B[k]) b = false;
        }
        if(a) p += 40;
        if(b) p += 40;
      }
    };
    for(let y = 0; y < size; y++) line(i => m[y][i]);
    for(let x = 0; x < size; x++) line(i => m[i][x]);
    let dark = 0;
    for(let y = 0; y < size; y++) for(let x = 0; x < size; x++){
      if(m[y][x]) dark++;
      if(x < size - 1 && y < size - 1){
        const c = m[y][x];
        if(c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
      }
    }
    const total = size * size;
    p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return p;
  }

  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => x * y % 2 + x * y % 3 === 0,
    (x, y) => (x * y % 2 + x * y % 3) % 2 === 0,
    (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0
  ];

  /* คืน { size, modules:[[bool]], version } หรือโยน Error ถ้าข้อความยาวเกิน */
  function encode(text, level){
    const e = ECL[level] === undefined ? 1 : ECL[level];
    const bytes = utf8(text);
    let ver = 0, capBits = 0;
    for(let v = 1; v <= 40; v++){
      const ccBits = v <= 9 ? 8 : 16;
      const need = 4 + ccBits + bytes.length * 8;
      capBits = dataCodewords(v, e) * 8;
      if(need <= capBits){ ver = v; break; }
    }
    if(!ver) throw new Error("ลิงก์ยาวเกินไปสำหรับ QR (สูงสุดราว " + (dataCodewords(40, e) - 3) + " ตัวอักษร ที่ระดับนี้)");

    // bit stream
    const bits = [];
    const put = (val, len) => { for(let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(0x4, 4);
    put(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, capBits - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for(let pad = 0xEC; bits.length < capBits; pad ^= 0xEC ^ 0x11) put(pad, 8);
    const data = [];
    for(let i = 0; i < bits.length; i += 8){ let b = 0; for(let k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; data.push(b); }

    // ECC + interleave
    const nb = NUM_BLOCKS[e][ver], eccLen = ECC_PER_BLOCK[e][ver];
    const raw = Math.floor(rawModules(ver) / 8);
    const nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    const div = rsDivisor(eccLen);
    const blocks = [];
    for(let i = 0, k = 0; i < nb; i++){
      const len = shortLen - eccLen + (i < nShort ? 0 : 1);
      const dat = data.slice(k, k + len); k += len;
      const ecc = rsRemainder(dat, div);
      if(i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const all = [];
    for(let i = 0; i < blocks[0].length; i++)
      blocks.forEach((b, j) => { if(i !== shortLen - eccLen || j >= nShort) all.push(b[i]); });

    // matrix
    const size = ver * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, v) => { m[y][x] = v; fn[y][x] = true; };
    for(let i = 0; i < size; i++){ set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for(let dy = -4; dy <= 4; dy++) for(let dx = -4; dx <= 4; dx++){
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if(x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const ap = alignPos(ver), n = ap.length;
    for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){
      if((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++)
        set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    const drawFormat = (mask) => {
      const d = (FMT[e] << 3) | mask;
      let rem = d;
      for(let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const b = ((d << 10) | rem) ^ 0x5412;
      for(let i = 0; i <= 5; i++) set(8, i, bit(b, i));
      set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8));
      for(let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
      for(let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(b, i));
      for(let i = 8; i < 15; i++) set(8, size - 15 + i, bit(b, i));
      set(8, size - 8, true);
    };
    drawFormat(0);
    if(ver >= 7){
      let rem = ver;
      for(let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      const b = (ver << 12) | rem;
      for(let i = 0; i < 18; i++){
        const c = bit(b, i), a = size - 11 + i % 3, t = Math.floor(i / 3);
        set(a, t, c); set(t, a, c);
      }
    }
    // data placement
    let idx = 0;
    for(let right = size - 1; right >= 1; right -= 2){
      if(right === 6) right = 5;
      for(let vert = 0; vert < size; vert++) for(let j = 0; j < 2; j++){
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if(!fn[y][x] && idx < all.length * 8){ m[y][x] = bit(all[idx >>> 3], 7 - (idx & 7)); idx++; }
      }
    }
    // choose mask
    let best = 0, bestP = Infinity;
    for(let k = 0; k < 8; k++){
      for(let y = 0; y < size; y++) for(let x = 0; x < size; x++) if(!fn[y][x] && MASKS[k](x, y)) m[y][x] = !m[y][x];
      drawFormat(k);
      const p = penalty(m, size);
      if(p < bestP){ bestP = p; best = k; }
      for(let y = 0; y < size; y++) for(let x = 0; x < size; x++) if(!fn[y][x] && MASKS[k](x, y)) m[y][x] = !m[y][x];
    }
    for(let y = 0; y < size; y++) for(let x = 0; x < size; x++) if(!fn[y][x] && MASKS[best](x, y)) m[y][x] = !m[y][x];
    drawFormat(best);
    return { size, modules: m, version: ver };
  }
  return { encode };
})();

(function injectQrCss(){
  if($("#qrCss")) return;
  const st = document.createElement("style"); st.id = "qrCss";
  st.textContent = `
#view-tool-qr{--c-main:#12B5A6; --c-bg:#DDF5F1; --c-ink:#0B6B62; --c-sh:rgba(18,181,166,.6); --c-on:#fff;}
.qr-ta{display:block; width:100%; min-height:66px; resize:vertical; padding:10px 12px; border:1.5px solid #E1E7F3; border-radius:14px; background:#fff; font:inherit; font-size:15px; color:var(--ink); box-sizing:border-box;}
.qr-ta:focus{outline:none; border-color:var(--c-main); box-shadow:0 0 0 3px var(--c-bg);}
.qr-in{display:block; width:100%; padding:10px 12px; border:1.5px solid #E1E7F3; border-radius:14px; background:#fff; font:inherit; font-size:15px; color:var(--ink); box-sizing:border-box;}
.qr-in:focus{outline:none; border-color:var(--c-main); box-shadow:0 0 0 3px var(--c-bg);}
.qr-row{display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;}
.qr-note{font-size:12.5px; color:var(--ink-soft); line-height:1.5; margin:6px 2px 0; min-height:18px;}
.qr-stage{display:flex; flex-direction:column; align-items:center; gap:10px; padding:16px 12px 14px; background:#fff; border:1.5px solid #E1E7F3; border-radius:20px; margin:12px 0;}
.qr-stage canvas{max-width:100%; height:auto; display:block; border-radius:6px; box-shadow:0 2px 12px rgba(20,30,60,.14);}
.qr-empty{padding:34px 12px; text-align:center; color:var(--ink-soft); font-size:14px; line-height:1.6;}
.qr-empty b{display:block; font-size:38px; margin-bottom:6px; filter:grayscale(.2);}
.qr-meta{font-size:12.5px; color:var(--ink-soft); text-align:center; line-height:1.5;}
.qr-warn{color:#B45309; font-size:13px; text-align:center; line-height:1.5;}
.qr-acts{display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%; max-width:420px;}
.qr-acts .btn{width:100%; margin:0;}
.qr-acts .qr-wide{grid-column:1 / -1;}
.qr-opt{margin-top:14px;}
.qr-opt>label{display:block; font-size:13.5px; font-weight:700; color:var(--ink); margin-bottom:6px;}
.qr-sw{display:flex; gap:9px; flex-wrap:wrap; align-items:center;}
.qr-sw button{width:32px; height:32px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 0 1.5px #D5DBE8; cursor:pointer; padding:0;}
.qr-sw button.on{box-shadow:0 0 0 3px var(--c-main);}
.qr-sw input[type=color]{width:38px; height:32px; padding:0; border:1.5px solid #E1E7F3; border-radius:10px; background:#fff; cursor:pointer;}
`;
  document.head.appendChild(st);
})();

const qrs = { view:null, data:null, text:"", ecc:"M", px:800, fg:"#111827", bg:"#FFFFFF", timer:0, busy:false };
const QR_FG = ["#111827","#0B3D91","#0B6B62","#6B21A8","#B3261E","#1B5E20"];
const QR_BG = ["#FFFFFF","#FFF8E1","#E8F0FE","#E6F4EA"];

/* ลิงก์ที่พิมพ์มาแต่โดเมน เช่น kruchauy.com → เติม https:// ให้ */
function qrNorm(raw){
  const t = String(raw || "").trim();
  if(!t) return { text:"", note:"" };
  if(/^[a-z][a-z0-9+.\-]*:/i.test(t)) return { text:t, note:"" };
  if(/^[^\s\/?#]+\.[^\s\/?#]{2,}([\/?#]\S*)?$/.test(t)) return { text:"https://" + t, note:"เติม https:// ให้อัตโนมัติ" };
  return { text:t, note:"ไม่ใช่รูปแบบลิงก์ — จะสร้าง QR ของข้อความนี้ตามที่พิมพ์" };
}

const qrLum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

/* จัดวาง: หน่วยเป็น "ช่อง" ของ QR (โซนเงียบ 4 ช่อง + ข้อความใต้ภาพถ้ามี) */
function qrLayout(){
  const q = qrs.data, m = 4, n = q.size + 2 * m;
  const cap = (qrs.cap ? qrs.cap.value : "").trim();
  const out = { n, m, W:n, H:n, fs:0, lines:[] };
  if(!cap) return out;
  const fs = Math.max(1.8, n * 0.056);
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const cx = document.createElement("canvas").getContext("2d");
  cx.font = "600 100px " + font;
  const wOf = s => cx.measureText(s).width / 100 * fs;
  const maxW = n * 0.92, lines = [];
  cap.split(/\n/).forEach(par => {
    let cur = "";
    for(const ch of Array.from(par)){
      if(cur && wOf(cur + ch) > maxW){ lines.push(cur); cur = ch; } else cur += ch;
    }
    lines.push(cur);
  });
  out.lines = lines.slice(0, 3); out.fs = fs; out.font = font;
  out.H = n + out.lines.length * fs * 1.35 + fs * 0.45;
  return out;
}

function qrDraw(cv, px){
  const L = qrLayout(), q = qrs.data, s = Math.max(1, Math.floor(px / L.W));
  cv.width = Math.round(L.W * s); cv.height = Math.ceil(L.H * s);
  const g = cv.getContext("2d");
  g.fillStyle = qrs.bg; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = qrs.fg;
  for(let y = 0; y < q.size; y++) for(let x = 0; x < q.size; x++) if(q.modules[y][x]) g.fillRect((L.m + x) * s, (L.m + y) * s, s, s);
  if(L.lines.length){
    g.font = "600 " + (L.fs * s) + "px " + L.font; g.textAlign = "center"; g.textBaseline = "top";
    L.lines.forEach((ln, i) => g.fillText(ln, cv.width / 2, (L.n + L.fs * 0.1 + i * L.fs * 1.35) * s));
  }
  return { w:cv.width, h:cv.height };
}

function qrSvg(){
  const L = qrLayout(), q = qrs.data;
  let d = "";
  for(let y = 0; y < q.size; y++){
    let x = 0;
    while(x < q.size){
      if(!q.modules[y][x]){ x++; continue; }
      let e = x; while(e < q.size && q.modules[y][e]) e++;
      d += "M" + (L.m + x) + " " + (L.m + y) + "h" + (e - x) + "v1h-" + (e - x) + "z";
      x = e;
    }
  }
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const txt = L.lines.map((ln, i) => '<text x="' + (L.W / 2) + '" y="' + (L.n + L.fs * 0.1 + i * L.fs * 1.35 + L.fs * 0.8).toFixed(2) + '">' + esc(ln) + "</text>").join("");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + L.W + " " + L.H.toFixed(2) + '" width="' + (L.W * 10) + '" height="' + Math.ceil(L.H * 10) + '">' +
    '<rect width="100%" height="100%" fill="' + qrs.bg + '"/>' +
    '<path d="' + d + '" fill="' + qrs.fg + '" shape-rendering="crispEdges"/>' +
    (txt ? '<g fill="' + qrs.fg + '" font-family="' + esc((L.font || "sans-serif").replace(/"/g, "'")) + '" font-size="' + L.fs.toFixed(2) + '" font-weight="600" text-anchor="middle">' + txt + "</g>" : "") +
    "</svg>";
}

function qrFileBase(){
  let h = qrs.text;
  try{ h = new URL(qrs.text).hostname || qrs.text; }catch(e){}
  h = h.replace(/[^\w.\-\u0E00-\u0E7F]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return "qrcode" + (h ? "-" + h : "");
}
function qrSave(blob, name){
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function qrPngBlob(cb){
  const cv = document.createElement("canvas"); qrDraw(cv, qrs.px);
  cv.toBlob(b => cb(b), "image/png");
}

function qrUpdate(){
  const v = qrs.view; if(!v) return;
  const { text, note } = qrNorm(qrs.inp.value);
  qrs.text = text; qrs.data = null;
  qrs.note.textContent = note; qrs.err.textContent = "";
  qrs.warn.textContent = "";
  const has = !!text;
  if(has){
    try{ qrs.data = QRGEN.encode(text, qrs.ecc); }
    catch(e){ qrs.err.textContent = e.message; }
  }
  qrs.empty.style.display = qrs.data ? "none" : "";
  qrs.cv.style.display = qrs.data ? "" : "none";
  qrs.acts.style.display = qrs.data ? "" : "none";
  qrs.meta.textContent = "";
  if(!qrs.data) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const r = qrDraw(qrs.cv, Math.round(340 * dpr));
  qrs.cv.style.width = (r.w / dpr) + "px";
  const L = qrLayout(), s = Math.max(1, Math.floor(qrs.px / L.W));
  qrs.meta.textContent = "QR เวอร์ชัน " + qrs.data.version + " · " + qrs.data.size + "×" + qrs.data.size + " ช่อง · ไฟล์ PNG ≈ " + Math.round(L.W * s) + "×" + Math.ceil(L.H * s) + " พิกเซล";
  const lf = qrLum(qrs.fg), lb = qrLum(qrs.bg);
  if(lf > lb) qrs.warn.textContent = "⚠️ ควรใช้สีเข้มเป็นจุด และสีอ่อนเป็นพื้น ไม่เช่นนั้นแอปสแกนบางตัวอ่านไม่ได้";
  else if ((lb + 0.05) / (lf + 0.05) < 3) qrs.warn.textContent = "⚠️ สีจุดกับสีพื้นใกล้กันเกินไป อาจสแกนไม่ติด";
}
function qrUpdateSoon(){ clearTimeout(qrs.timer); qrs.timer = setTimeout(qrUpdate, 140); }

function qrMarkOpts(){
  const v = qrs.view;
  v.querySelectorAll("[data-ecc]").forEach(b => b.classList.toggle("on", b.dataset.ecc === qrs.ecc));
  v.querySelectorAll("[data-px]").forEach(b => b.classList.toggle("on", +b.dataset.px === qrs.px));
  v.querySelectorAll("[data-fg]").forEach(b => b.classList.toggle("on", b.dataset.fg.toLowerCase() === qrs.fg.toLowerCase()));
  v.querySelectorAll("[data-bg]").forEach(b => b.classList.toggle("on", b.dataset.bg.toLowerCase() === qrs.bg.toLowerCase()));
  qrs.fgPick.value = qrs.fg; qrs.bgPick.value = qrs.bg;
}

registerTool({
  id:"qr", icon:"📱", color:"c-teal", title:"สร้าง QR Code", desc:"วางลิงก์ แล้วได้ QR Code พร้อมบันทึกเป็นรูปหรือพิมพ์",
  html:`
    <div class="card">
      <div class="field"><label for="qrInp">ลิงก์ (URL) หรือข้อความ</label>
        <textarea id="qrInp" class="qr-ta" rows="2" placeholder="เช่น https://www.example.com หรือ kruchauy.com" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"></textarea>
      </div>
      <div class="qr-row">
        <button type="button" class="btn btn-outline btn-sm" id="qrPaste">📋 วางจากคลิปบอร์ด</button>
        <button type="button" class="btn btn-outline btn-sm" id="qrClear">✕ ล้าง</button>
      </div>
      <div class="qr-note" id="qrNote"></div>
      <div class="tl-err" id="qrErr"></div>
      <div class="field" style="margin-top:6px;"><label for="qrCap">ข้อความใต้ QR <small class="pf-hint">(ไม่ใส่ก็ได้ เช่น ชื่อกิจกรรม)</small></label>
        <input id="qrCap" class="qr-in" type="text" maxlength="90" placeholder="เช่น สแกนเพื่อส่งงานคณิตศาสตร์" autocomplete="off">
      </div>
    </div>

    <div class="qr-stage">
      <div class="qr-empty" id="qrEmpty"><b>📱</b>พิมพ์หรือวางลิงก์ด้านบน<br>QR Code จะขึ้นที่นี่ทันที</div>
      <canvas id="qrCv" style="display:none;" aria-label="QR Code"></canvas>
      <div class="qr-meta" id="qrMeta"></div>
      <div class="qr-warn" id="qrWarn"></div>
      <div class="qr-acts" id="qrActs" style="display:none;">
        <button type="button" class="btn btn-primary" id="qrPng">⬇️ บันทึก PNG</button>
        <button type="button" class="btn btn-outline" id="qrSvgBtn">⬇️ บันทึก SVG</button>
        <button type="button" class="btn btn-outline" id="qrCopy">📋 คัดลอกรูป</button>
        <button type="button" class="btn btn-outline" id="qrPrint">🖨️ พิมพ์</button>
      </div>
    </div>

    <h3 class="tl-h">ตั้งค่า</h3>
    <div class="card">
      <div class="qr-opt" style="margin-top:0;"><label>ความทนทาน (แก้ไขข้อผิดพลาด)</label>
        <div class="tl-chips" id="qrEcc">
          <button type="button" class="tl-chip" data-ecc="L">ต่ำ ~7%</button>
          <button type="button" class="tl-chip" data-ecc="M">กลาง ~15%</button>
          <button type="button" class="tl-chip" data-ecc="Q">สูง ~25%</button>
          <button type="button" class="tl-chip" data-ecc="H">สูงสุด ~30%</button>
        </div>
        <div class="qr-note">ยิ่งสูง ยิ่งสแกนง่ายเมื่อภาพเปื้อน/ถูกบังบางส่วน แต่ QR จะแน่นขึ้น — ลิงก์ยาวแนะนำ "ต่ำ" หรือ "กลาง"</div>
      </div>
      <div class="qr-opt"><label>ขนาดไฟล์ที่บันทึก</label>
        <div class="tl-chips" id="qrPx">
          <button type="button" class="tl-chip" data-px="400">เล็ก</button>
          <button type="button" class="tl-chip" data-px="800">กลาง</button>
          <button type="button" class="tl-chip" data-px="1600">ใหญ่ (พิมพ์)</button>
        </div>
      </div>
      <div class="qr-opt"><label>สีจุด</label>
        <div class="qr-sw" id="qrFgSw"></div>
      </div>
      <div class="qr-opt"><label>สีพื้น</label>
        <div class="qr-sw" id="qrBgSw"></div>
      </div>
    </div>
    <p class="tl-lg-note" style="margin-top:14px;">QR สร้างในเครื่องนี้ทั้งหมด ไม่ส่งลิงก์ไปที่ไหน · ก่อนแจกจริง ลองสแกนด้วยมือถือสักครั้งเพื่อความชัวร์</p>`,
  init(v){
    qrs.view = v;
    qrs.inp = $("#qrInp", v); qrs.cap = $("#qrCap", v); qrs.note = $("#qrNote", v); qrs.err = $("#qrErr", v);
    qrs.empty = $("#qrEmpty", v); qrs.cv = $("#qrCv", v); qrs.meta = $("#qrMeta", v); qrs.warn = $("#qrWarn", v); qrs.acts = $("#qrActs", v);
    const sw = (host, arr, key) => {
      host.innerHTML = arr.map(c => '<button type="button" data-' + key + '="' + c + '" style="background:' + c + ';" aria-label="สี ' + c + '"></button>').join("") +
        '<input type="color" id="' + (key === "fg" ? "qrFgPick" : "qrBgPick") + '" aria-label="เลือกสีเอง">';
    };
    sw($("#qrFgSw", v), QR_FG, "fg"); sw($("#qrBgSw", v), QR_BG, "bg");
    qrs.fgPick = $("#qrFgPick", v); qrs.bgPick = $("#qrBgPick", v);
    qrMarkOpts();

    v.addEventListener("input", e => {
      const t = e.target;
      if(t === qrs.inp || t === qrs.cap) qrUpdateSoon();
      else if(t === qrs.fgPick){ qrs.fg = t.value; qrMarkOpts(); qrUpdate(); }
      else if(t === qrs.bgPick){ qrs.bg = t.value; qrMarkOpts(); qrUpdate(); }
    });
    v.addEventListener("click", e => {
      const b = e.target.closest("button"); if(!b) return;
      if(b.dataset.ecc){ qrs.ecc = b.dataset.ecc; qrMarkOpts(); qrUpdate(); return; }
      if(b.dataset.px){ qrs.px = +b.dataset.px; qrMarkOpts(); qrUpdate(); return; }
      if(b.dataset.fg){ qrs.fg = b.dataset.fg; qrMarkOpts(); qrUpdate(); return; }
      if(b.dataset.bg){ qrs.bg = b.dataset.bg; qrMarkOpts(); qrUpdate(); return; }
      switch(b.id){
        case "qrClear": qrs.inp.value = ""; qrs.cap.value = ""; qrUpdate(); qrs.inp.focus(); break;
        case "qrPaste":
          if(navigator.clipboard && navigator.clipboard.readText){
            navigator.clipboard.readText().then(t => { qrs.inp.value = t; qrUpdate(); }, () => say("เบราว์เซอร์ไม่อนุญาตให้วาง — กดค้างที่ช่องแล้วเลือกวางแทน"));
          } else say("เบราว์เซอร์นี้ไม่รองรับปุ่มวาง — กดค้างที่ช่องแล้วเลือกวางแทน");
          break;
        case "qrPng": if(qrs.data) qrPngBlob(bl => { if(bl){ qrSave(bl, qrFileBase() + ".png"); say("บันทึก PNG แล้ว"); } }); break;
        case "qrSvgBtn": if(qrs.data){ qrSave(new Blob([qrSvg()], { type:"image/svg+xml" }), qrFileBase() + ".svg"); say("บันทึก SVG แล้ว"); } break;
        case "qrCopy":
          if(!qrs.data) break;
          if(!(navigator.clipboard && window.ClipboardItem)){ say("เบราว์เซอร์นี้คัดลอกรูปไม่ได้ — ใช้ปุ่มบันทึก PNG แทน"); break; }
          qrPngBlob(bl => navigator.clipboard.write([new ClipboardItem({ "image/png":bl })]).then(() => say("คัดลอกรูป QR แล้ว"), () => say("คัดลอกไม่สำเร็จ — ใช้ปุ่มบันทึก PNG แทน")));
          break;
        case "qrPrint":
          if(!qrs.data) break;
          qrPngBlob(bl => {
            const rd = new FileReader();
            rd.onload = () => {
              const w = window.open("", "_blank");
              if(!w){ say("เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาตป๊อปอัปแล้วลองอีกครั้ง"); return; }
              w.document.open();
              w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>QR Code</title><style>@page{margin:14mm}html,body{margin:0;background:#fff}body{display:flex;justify-content:center;padding-top:10mm}img{width:min(100%,120mm);height:auto;image-rendering:pixelated}</style></head><body><img src="' + rd.result + '" onload="setTimeout(function(){window.print()},200)"></body></html>');
              w.document.close();
            };
            rd.readAsDataURL(bl);
          });
          break;
      }
    });
  },
  onOpen(){ qrMarkOpts(); qrUpdate(); }
});

/* =====================================================================
   เครื่องมือ: คำนวณเกรด — 3 หน้าต่อ 1 ภาคเรียน
     ① กลางภาค  ② ปลายภาค  (กรอก/วางคะแนนเต็ม 100 คนละหน้า · วางจาก Google Sheet ได้ คอลัมน์เรียงตามวิชา)
     ③ คำนวณเกรด (อ่านอย่างเดียว) = กลางภาค × 40% + ปลายภาค × 60% · ผลการเรียน 0–4 · พิมพ์ตารางรายบุคคล
   เลือกห้องอย่างเดียว ไม่ต้องเลือกวิชา
   ===================================================================== */
const GD_SUBJ = ["หลักภาษาและการใช้ภาษาไทย","วรรณคดี","คณิตศาสตร์ (พื้นฐาน)","คณิตศาสตร์ (เพิ่มเติม)","Reading","Grammar","Essay/Conversation","E.P.","วิทยาศาสตร์","วิทยาการคำนวณ","สังคมศึกษา","ประวัติศาสตร์","การงานอาชีพ","สุขศึกษาและพลศึกษา","ดนตรี-นาฏศิลป์","ทัศนศิลป์","ภาษาจีน","หน้าที่พลเมือง"];
/* หน่วยกิตตั้งต้น (เติมเฉพาะวิชาที่ตรงกับตารางตัวอย่าง) — แก้ได้ในแถว "หน่วยกิต" */
const GD_CR0 = { "หลักภาษาและการใช้ภาษาไทย":"0.5", "วรรณคดี":"0.5", "ดนตรี-นาฏศิลป์":"0.5", "ทัศนศิลป์":"0.5", "คณิตศาสตร์ (พื้นฐาน)":"1", "คณิตศาสตร์ (เพิ่มเติม)":"1.5", "Grammar":"1.5", "วิทยาศาสตร์":"1.5", "วิทยาการคำนวณ":"0.5", "สังคมศึกษา":"1", "ประวัติศาสตร์":"0.5", "การงานอาชีพ":"0.5", "หน้าที่พลเมือง":"0.5" };
/* วิชาที่รวมกันตอนคำนวณเกรด/พิมพ์ (c = ลำดับวิชาย่อยใน GD_SUBJ) — คะแนนวิชาย่อยถ่วงน้ำหนักด้วยหน่วยกิต แล้วจึงคิดกลาง 40 + ปลาย 60 · หน่วยกิตรวมกัน */
const GD_OUT = [
  { n:"ภาษาไทย", c:[0,1] }, { n:"คณิตศาสตร์ (พื้นฐาน)", c:[2] }, { n:"คณิตศาสตร์ (เพิ่มเติม)", c:[3] },
  { n:"ภาษาอังกฤษพื้นฐาน", c:[4,6,7] }, { n:"ภาษาอังกฤษ (ไวยากรณ์)", c:[5] },
  { n:"วิทยาศาสตร์", c:[8] }, { n:"วิทยาการคำนวณ", c:[9] }, { n:"สังคมศึกษา", c:[10] }, { n:"ประวัติศาสตร์", c:[11] },
  { n:"การงานอาชีพ", c:[12] }, { n:"สุขศึกษาและพลศึกษา", c:[13] }, { n:"ศิลปะ", c:[14,15] }, { n:"ภาษาจีน", c:[16] }, { n:"หน้าที่พลเมือง", c:[17] }
];
const GD_N = GD_SUBJ.length, GD_NO = GD_OUT.length, GD_KEY = "kc_grade_v1";
const GD = { view:null, room:"", term:"1", tab:"mid", rows:[], store:null };
const gdOff = () => GD.tab === "end" ? 1 : 0;

function gdYear0(){ const d = new Date(); return String(d.getFullYear() + 543 - (d.getMonth() < 4 ? 1 : 0)); }
function gdLoad(){
  let o = {}; try{ o = JSON.parse(localStorage.getItem(GD_KEY) || "{}") || {}; }catch(e){ o = {}; }
  if(!Array.isArray(o.credits) || o.credits.length !== GD_N) o.credits = GD_SUBJ.map(n => GD_CR0[n] || "");
  if(o.crv !== 2){            // รุ่นก่อนหน้าเคยตั้งหน่วยกิตเดาไว้ — ปรับให้ตรงกับการรวมวิชาแบบใหม่
    [0, 1, 14, 15].forEach(i => { if(!String(o.credits[i]).trim()) o.credits[i] = "0.5"; });
    if(o.credits[6] === "1.5") o.credits[6] = "";
    o.crv = 2;
  }
  if(!o.sets || typeof o.sets !== "object") o.sets = {};
  if(!o.year) o.year = gdYear0();
  if(o.round === undefined) o.round = true;
  return o;
}
function gdSave(){ try{ localStorage.setItem(GD_KEY, JSON.stringify(GD.store)); }catch(e){} }
const gdNum = v => { const t = String(v ?? "").trim().replace(/,/g, ""); if(t === "") return NaN; const n = Number(t); return isFinite(n) ? n : NaN; };
const gdFmt = n => String(Math.round(n * 100) / 100);
function gdGP(t){ return t >= 80 ? 4 : t >= 75 ? 3.5 : t >= 70 ? 3 : t >= 65 ? 2.5 : t >= 60 ? 2 : t >= 55 ? 1.5 : t >= 50 ? 1 : 0; }
/* กลาง×40% + ปลาย×60% — ต้องมีทั้งสองช่องถึงจะคำนวณ */
function gdCalc(mid, end){
  const m = gdNum(mid), e = gdNum(end);
  if(isNaN(m) || isNaN(e)) return null;
  const m40 = m * 0.4, e60 = e * 0.6, raw = m40 + e60;
  const tot = GD.store.round ? Math.floor(raw + 0.5 + 1e-9) : Math.round(raw * 100) / 100;
  return { m40, e60, tot, gp:gdGP(tot) };
}
function gdId(s){
  const ks = Object.keys(s || {});
  for(const re of [/รหัสนักเรียน|รหัสประจำตัว|เลขประจำตัว/, /รหัส/, /^(student)?_?id$/i]){
    for(const k of ks){ if(re.test(k)){ const v = String(s[k] ?? "").trim(); if(v) return v; } }
  }
  return "";
}
const gdRowKey = s => stuNo(s) + "|" + stuName(s);
const gdSetKey = () => GD.room + "|" + GD.term;
function gdSet(){ const k = gdSetKey(); return GD.store.sets[k] || (GD.store.sets[k] = {}); }
function gdVals(r){ const set = gdSet(), k = gdRowKey(GD.rows[r]); return set[k] || (set[k] = new Array(GD_N * 2).fill("")); }

/* ---------- CSS ---------- */
(function gdCss(){
  if($("#gdCss")) return;
  const st = document.createElement("style"); st.id = "gdCss";
  st.textContent = `
#view-tool-grade{--c-main:#34A853; --c-bg:#E3F5E8; --c-ink:#1B6B33; --c-sh:rgba(52,168,83,.6); --c-on:#fff;}
.gd-ctl{display:grid; grid-template-columns:1fr; gap:0 12px;}
html.mode-pc .gd-ctl{grid-template-columns:2fr 1fr 1fr;}
.gd-acts{display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;}
.gd-note{font-size:12.5px; color:var(--ink-soft); line-height:1.6; margin-top:10px;}
.gd-wrap{--gb:#fff; --gl:#E1E7F3; --gh:#E3F5E8; --gz:#F5FAF6; overflow:auto; max-height:72vh; border:1.5px solid var(--gl); border-radius:16px; background:var(--gb); margin-top:12px; -webkit-overflow-scrolling:touch;}
.gd-tbl{border-collapse:separate; border-spacing:0; font-size:13px; color:var(--ink);}
.gd-tbl th,.gd-tbl td{border-right:1px solid var(--gl); border-bottom:1px solid var(--gl); padding:0; text-align:center; white-space:nowrap; background:var(--gb);}
.gd-tbl thead th{position:sticky; z-index:3; background:var(--gh); height:34px; font-weight:700; padding:0 8px;}
.gd-tbl thead tr:nth-child(1) th{top:0;}
.gd-tbl thead tr:nth-child(2) th{top:34px;}
.gd-tbl thead tr:nth-child(3) th{top:68px; font-size:12px; color:var(--c-ink);}
.gd-c1,.gd-c2,.gd-c3{position:sticky; z-index:2;}
.gd-c1{left:0; min-width:46px; width:46px;} .gd-c2{left:46px; min-width:84px;} .gd-c3{left:130px; min-width:170px; text-align:left !important; padding:0 10px !important; box-shadow:2px 0 0 var(--gl);}
.gd-tbl thead .gd-c1,.gd-tbl thead .gd-c2,.gd-tbl thead .gd-c3{z-index:5;}
.gd-tbl td.gs1,.gd-tbl th.gs1{background:var(--gz);}
.gd-in{width:64px; height:34px; border:0; background:transparent; text-align:center; font:inherit; color:var(--ink); border-radius:0; outline:none; padding:0;}
.gd-in:focus{background:var(--c-bg); box-shadow:inset 0 0 0 2px var(--c-main);}
.gd-in.bad{background:#FDE8E6; color:#B3261E; font-weight:700;}
.gd-cr{width:64px; height:30px; border:0; border-bottom:1.5px dashed var(--c-main); background:transparent; text-align:center; font:inherit; color:var(--ink); outline:none;}
.gd-tot{min-width:66px; line-height:1.15; padding:3px 6px !important; background:var(--c-bg) !important; color:var(--c-ink);}
.gd-tot b{display:block; font-size:14px;} .gd-tot small{display:block; font-size:11px; opacity:.8;}
.gd-pb{border:0; background:transparent; font-size:17px; cursor:pointer; padding:4px 10px; border-radius:10px;}
.gd-pb:hover{background:var(--c-bg);}
.gd-tabs{display:flex; gap:8px; margin:12px 0 0; flex-wrap:wrap;}
.gd-tab{flex:1 1 0; min-width:96px; padding:11px 8px; border-radius:14px; border:1.5px solid #E1E7F3; background:#fff; font:inherit; font-size:15px; font-weight:700; color:var(--ink); cursor:pointer; transition:transform .1s;}
.gd-tab:active{transform:scale(.97);}
.gd-tab.on{background:var(--c-main); border-color:var(--c-main); color:var(--c-on); box-shadow:0 10px 18px -12px var(--c-sh);}
.gd-tab small{display:block; font-size:11.5px; font-weight:600; opacity:.85; margin-top:2px;}
.gd-tbl.inp thead tr:nth-child(1) th{height:58px; white-space:normal; line-height:1.2; font-size:12.5px; min-width:84px;}
.gd-tbl.inp thead tr:nth-child(1) th.gd-c1,.gd-tbl.inp thead tr:nth-child(1) th.gd-c2,.gd-tbl.inp thead tr:nth-child(1) th.gd-c3{font-size:13px;}
.gd-tbl.inp thead tr:nth-child(2) th{top:58px; font-size:11.5px; color:var(--c-ink);}
.gd-sc{min-width:56px; padding:0 6px !important; color:var(--ink-soft);}
.gd-gpa{min-width:70px; font-weight:700; background:var(--c-bg) !important; color:var(--c-ink);}
html[data-theme="dark"] .gd-tab,html[data-theme="black"] .gd-tab{background:#1d2233; border-color:#2c3450;}
html[data-theme="dark"] .gd-tab.on,html[data-theme="black"] .gd-tab.on{background:var(--c-main); border-color:var(--c-main);}
.gd-crbox{margin-top:12px; background:#fff; border:1.5px solid #E1E7F3; border-radius:16px; padding:10px 14px;}
.gd-crbox summary{cursor:pointer; font-weight:700; font-size:14px; color:var(--ink);}
.gd-crgrid{display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:10px 14px; margin-top:12px;}
.gd-crg{background:var(--c-bg); border-radius:12px; padding:8px 10px;}
.gd-crh{font-weight:700; font-size:13px; color:var(--c-ink); margin-bottom:4px; display:flex; justify-content:space-between; gap:6px;}
.gd-crh span{font-weight:600; font-size:12px;}
.gd-crl{display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12.5px; color:var(--ink); margin-top:4px;}
.gd-crl .gd-cr{flex:none;}
html[data-theme="dark"] .gd-crbox,html[data-theme="black"] .gd-crbox{background:#1d2233; border-color:#2c3450;}
.gd-empty{text-align:center; padding:28px 12px; color:var(--ink-soft); font-size:14px;}
html[data-theme="dark"] .gd-wrap,html[data-theme="black"] .gd-wrap{--gb:#1d2233; --gl:#2c3450; --gh:#26304a; --gz:#222a40;}
html[data-theme="dark"] .gd-in:focus,html[data-theme="black"] .gd-in:focus{background:#2c3450;}
html[data-theme="dark"] .gd-tot,html[data-theme="black"] .gd-tot{background:#1f3a2a !important; color:#9be3b0;}
`;
  document.head.appendChild(st);
})();

/* ---------- ตาราง ---------- */
function gdFillRooms(){
  const sel = $("#gdRoom", GD.view), rooms = typeof uniqueRooms === "function" ? uniqueRooms() : [], keep = sel.value || GD.room;
  sel.innerHTML = `<option value="">เลือกห้อง/ชั้นปี</option>` + rooms.map(r => `<option value="${escH(r)}">${escH(r)}</option>`).join("");
  if(rooms.includes(keep)) sel.value = keep;
}
function gdLoadRoom(room){
  GD.room = room || "";
  GD.rows = room && typeof studentsOfRoom === "function" ? studentsOfRoom(room).filter(s => stuName(s)) : [];
  gdRender();
  if(room && !GD.rows.length) say("ห้องนี้ยังไม่มีรายชื่อนักเรียน");
}
const GD_HINT = {
  mid:"กรอกคะแนน <b>กลางภาค</b> (เต็ม 100) · วางจาก Google Sheet: คัดลอกบล็อกคะแนน (คอลัมน์เรียงตามวิชาด้านบน · แถวเรียงตามรายชื่อในตาราง) แล้วคลิกช่องวิชาแรกของนักเรียนคนแรก → วาง · Enter / ↓ ลงแถวถัดไป",
  end:"กรอกคะแนน <b>ปลายภาค</b> (เต็ม 100) · วางจาก Google Sheet ได้เหมือนหน้ากลางภาค · Enter / ↓ ลงแถวถัดไป",
  calc:"รวม = กลางภาค × 40% + ปลายภาค × 60% · ผลการเรียน: 80↑=4 · 75=3.5 · 70=3 · 65=2.5 · 60=2 · 55=1.5 · 50=1 · ต่ำกว่า 50=0 · ช่องที่ไม่มีคะแนนกลางภาคหรือปลายภาค นับเป็น 0 (เฉพาะวิชาที่ในห้องมีคะแนนอย่างน้อย 1 คน) · รวมวิชา: ภาษาไทย = หลักภาษา+วรรณคดี · ภาษาอังกฤษพื้นฐาน = Reading+Essay/Conversation+E.P. · ศิลปะ = ดนตรี-นาฏศิลป์+ทัศนศิลป์ (ถ่วงน้ำหนักด้วยหน่วยกิต) · พิมพ์จะแสดงเฉพาะวิชาที่มีคะแนน"
};
function gdTabs(){
  const v = GD.view, calc = GD.tab === "calc";
  v.querySelectorAll(".gd-tab").forEach(b => b.classList.toggle("on", b.dataset.tab === GD.tab));
  $("#gdHint", v).innerHTML = GD_HINT[GD.tab];
  if(calc && !$("#gdCrGrid", v).firstChild) gdCrBox();
  $("#gdPrintAll", v).hidden = !calc; $("#gdRoundSw", v).hidden = !calc;
  $("#gdCopyHead", v).hidden = calc; $("#gdClear", v).hidden = calc; $("#gdCrBox", v).hidden = !calc;
}
function gdFilled(off){ return GD.rows.filter((_, r) => { const v = gdVals(r); for(let s = 0; s < GD_N; s++) if(String(v[s * 2 + off]).trim() !== "") return true; return false; }).length; }
function gdRender(){
  const wrap = $("#gdWrap", GD.view), n = GD.rows.length;
  gdTabs();
  const info = $("#gdInfo", GD.view);
  if(!n){
    info.textContent = ""; $("#gdPrintAll", GD.view).disabled = true;
    wrap.innerHTML = `<div class="gd-empty">${GD.room ? "ห้องนี้ยังไม่มีรายชื่อนักเรียน" : "เลือกห้องด้านบน แล้วตารางรายชื่อจะขึ้นที่นี่"}</div>`; return;
  }
  $("#gdPrintAll", GD.view).disabled = false;
  const fm = gdFilled(0), fe = gdFilled(1);
  const tabs = GD.view.querySelectorAll(".gd-tab");
  tabs[0].innerHTML = `① กลางภาค<small>กรอกแล้ว ${fm}/${n} คน</small>`;
  tabs[1].innerHTML = `② ปลายภาค<small>กรอกแล้ว ${fe}/${n} คน</small>`;
  tabs[2].innerHTML = `③ คำนวณเกรด<small>ดูผล · พิมพ์</small>`;
  info.textContent = `${n} คน · ${GD.room} · ภาคเรียนที่ ${GD.term}`;
  if(GD.tab === "calc") gdRenderCalc(wrap, n); else gdRenderInput(wrap, n);
}
function gdRenderInput(wrap, n){
  const off = gdOff();
  let h = `<table class="gd-tbl inp"><thead><tr><th class="gd-c1" rowspan="2">เลขที่</th><th class="gd-c2" rowspan="2">รหัสนักเรียน</th><th class="gd-c3" rowspan="2">ชื่อ-สกุล</th>`;
  h += GD_SUBJ.map((s, i) => `<th class="gs${i % 2}">${escH(s)}</th>`).join("") + `</tr>`;
  h += `<tr>` + GD_SUBJ.map((s, i) => `<th class="gs${i % 2}">${off ? "ปลายภาค" : "กลางภาค"} /100</th>`).join("") + `</tr></thead><tbody>`;
  GD.rows.forEach((st, r) => {
    const v = gdVals(r);
    h += `<tr><td class="gd-c1">${escH(stuNo(st))}</td><td class="gd-c2">${escH(gdId(st))}</td><td class="gd-c3">${escH(stuName(st))}</td>`;
    for(let s = 0; s < GD_N; s++) h += `<td class="gs${s % 2}"><input class="gd-in" inputmode="decimal" autocomplete="off" data-r="${r}" data-c="${s}" value="${escH(v[s * 2 + off])}"></td>`;
    h += `</tr>`;
  });
  wrap.innerHTML = h + `</tbody></table>`;
  wrap.querySelectorAll(".gd-in").forEach(gdMark);
}
function gdRenderCalc(wrap, n){
  const used = gdUsed();
  let h = `<table class="gd-tbl"><thead>`;
  h += `<tr><th class="gd-c1" rowspan="3">เลขที่</th><th class="gd-c2" rowspan="3">รหัสนักเรียน</th><th class="gd-c3" rowspan="3">ชื่อ-สกุล</th>`;
  h += GD_OUT.map((g, i) => `<th colspan="3" class="gs${i % 2}">${escH(g.n)}</th>`).join("") + `<th rowspan="3">เกรดเฉลี่ย</th><th rowspan="3">พิมพ์</th></tr>`;
  h += `<tr>` + GD_OUT.map((g, i) => { const k = gdCreditOf(g); return `<th colspan="3" class="gs${i % 2}" style="font-weight:600;font-size:12px;">หน่วยกิต ${isNaN(k) ? "–" : gdFmt(k)}</th>`; }).join("") + `</tr>`;
  h += `<tr>` + GD_OUT.map((g, i) => `<th class="gs${i % 2}">กลาง 40</th><th class="gs${i % 2}">ปลาย 60</th><th class="gs${i % 2}">รวม 100</th>`).join("") + `</tr></thead><tbody>`;
  GD.rows.forEach((st, r) => {
    const v = gdVals(r);
    h += `<tr><td class="gd-c1">${escH(stuNo(st))}</td><td class="gd-c2">${escH(gdId(st))}</td><td class="gd-c3">${escH(stuName(st))}</td>`;
    GD_OUT.forEach((g, i) => {
      const gc = "gs" + (i % 2), c = gdGroup(v, g, used[i]);
      h += `<td class="${gc} gd-sc">${c ? gdFmt(c.m40) : ""}</td><td class="${gc} gd-sc">${c ? gdFmt(c.e60) : ""}</td>`;
      h += `<td class="${gc} gd-tot">${c ? `<b>${gdFmt(c.tot)}</b><small>${c.gp.toFixed(1)}</small>` : ""}</td>`;
    });
    h += `<td class="gd-gpa" data-g="${r}"></td><td><button type="button" class="gd-pb" data-pr="${r}" title="พิมพ์ตารางของคนนี้" aria-label="พิมพ์ ${escH(stuName(st))}">🖨️</button></td></tr>`;
  });
  wrap.innerHTML = h + `</tbody></table>`;
  gdGpaAll();
}
/* กล่องแก้หน่วยกิต (วิชาย่อย) */
function gdCrBox(){
  const box = $("#gdCrBox", GD.view), cr = GD.store.credits;
  $("#gdCrGrid", GD.view).innerHTML = GD_OUT.map((g, gi) => {
    const k = gdCreditOf(g);
    return `<div class="gd-crg"><div class="gd-crh">${escH(g.n)}${g.c.length > 1 ? ` <span data-crsum="${gi}">รวม ${isNaN(k) ? "–" : gdFmt(k)}</span>` : ""}</div>` +
      g.c.map(i => `<label class="gd-crl"><span>${escH(GD_SUBJ[i])}</span><input class="gd-cr" data-cs="${i}" inputmode="decimal" autocomplete="off" value="${escH(cr[i])}" placeholder="–"></label>`).join("") + `</div>`;
  }).join("");
}
function gdCreditOf(g){
  const ks = g.c.map(i => gdNum(GD.store.credits[i]));
  return ks.every(k => !isNaN(k) && k > 0) ? Math.round(ks.reduce((a, b) => a + b, 0) * 100) / 100 : NaN;
}
/* วิชารวม: ช่องที่ไม่มีคะแนน (กลางหรือปลาย) นับเป็น 0 · ถ้าไม่มีใครในห้องมีคะแนนวิชานี้เลย (used=false) ถือว่าไม่ได้เรียน · หน่วยกิตวิชาย่อยไม่ครบ → เฉลี่ยเท่ากัน */
function gdGroup(v, g, used){
  if(used === false) return null;
  const ks = g.c.map(i => gdNum(GD.store.credits[i])), ok = ks.every(k => !isNaN(k) && k > 0);
  let sm = 0, se = 0, sw = 0;
  for(let j = 0; j < g.c.length; j++){
    const i = g.c[j], m = gdNum(v[i * 2]) || 0, e = gdNum(v[i * 2 + 1]) || 0;
    const w = ok ? ks[j] : 1; sm += w * m; se += w * e; sw += w;
  }
  const c = gdCalc(sm / sw, se / sw);
  return c ? Object.assign(c, { credit: gdCreditOf(g) }) : null;
}
function gdGpa(r, used){
  const v = gdVals(r); let sc = 0, sg = 0;
  GD_OUT.forEach((g, gi) => { const c = gdGroup(v, g, used[gi]); if(c && !isNaN(c.credit)){ sc += c.credit; sg += c.credit * c.gp; } });
  return sc > 0 ? sg / sc : null;
}
function gdGpaAll(){ const used = gdUsed(); GD.view.querySelectorAll("[data-g]").forEach(td => { const g = gdGpa(+td.dataset.g, used); td.textContent = g == null ? "" : g.toFixed(2); }); }
function gdMark(inp){ const t = inp.value.trim(), x = gdNum(t); inp.classList.toggle("bad", t !== "" && (isNaN(x) || x < 0 || x > 100)); }
function gdSetCell(r, s, val){
  const v = gdVals(r), i = s * 2 + gdOff(); v[i] = String(val).trim();
  const inp = $(`.gd-in[data-r="${r}"][data-c="${s}"]`, GD.view);
  if(inp){ inp.value = v[i]; gdMark(inp); }
}
function gdPaste(e){
  const t = e.target; if(!t.classList || !t.classList.contains("gd-in")) return;
  const txt = (e.clipboardData || window.clipboardData).getData("text") || "";
  if(!/[\t\n]/.test(txt.replace(/\r?\n$/, ""))) return;      // วางค่าเดียว → ให้ทำงานปกติ
  e.preventDefault();
  const lines = txt.replace(/\r/g, "").split("\n"); if(lines.length && lines[lines.length - 1] === "") lines.pop();
  const r0 = +t.dataset.r, c0 = +t.dataset.c; let cells = 0, rows = 0;
  lines.forEach((ln, i) => {
    const r = r0 + i; if(r >= GD.rows.length) return; rows++;
    ln.split("\t").forEach((x, j) => { const c = c0 + j; if(c < GD_N){ gdSetCell(r, c, x); cells++; } });
  });
  gdSave();
  say(`วางแล้ว ${rows} แถว · ${cells} ช่อง` + (lines.length > GD.rows.length - r0 ? " (แถวเกินจำนวนนักเรียนถูกตัดออก)" : ""));
}

/* ---------- พิมพ์ ---------- */
function gdUsed(){
  return GD_OUT.map(g => GD.rows.some((_, r) => { const v = gdVals(r); return g.c.some(i => String(v[i * 2]).trim() !== "" || String(v[i * 2 + 1]).trim() !== ""); }));
}
function gdPage(r, used, last){
  const st = GD.rows[r], v = gdVals(r), show = used.some(Boolean) ? used : GD_OUT.map(() => true);
  let body = "", sumC = 0, sumG = 0;
  GD_OUT.forEach((g, gi) => {
    if(!show[gi]) return;
    const c = gdGroup(v, g, used[gi]), k = gdCreditOf(g);
    if(c && !isNaN(k)){ sumC += k; sumG += k * c.gp; }
    body += `<tr><td class="l">${escH(g.n)}</td><td>${isNaN(k) ? "" : gdFmt(k)}</td><td>${c ? gdFmt(c.m40) : ""}</td><td>${c ? gdFmt(c.e60) : ""}</td><td class="tt">${c ? gdFmt(c.tot) : ""}</td><td class="tt">${c ? c.gp.toFixed(1) : ""}</td></tr>`;
  });
  if(sumC > 0) body += `<tr class="sum"><td class="l" colspan="5">ผลการเรียนเฉลี่ย</td><td class="tt">${(sumG / sumC).toFixed(2)}</td></tr>`;
  const f = (k, val, cls) => `<span class="f ${cls}"><span class="k">${k}</span><span class="val">${escH(val)}</span></span>`;
  return `<section class="pg${last ? " last" : ""}">
<div class="hdr"><div class="t1">แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล</div><div class="t2">ปีการศึกษา ${escH(GD.store.year)}</div></div>
<div class="who">${f("เลขประจำตัว", gdId(st), "f1")}${f("ชื่อ-สกุล", stuName(st), "f2")}${f("ชั้น", GD.room, "f3")}${f("เลขที่", stuNo(st), "f4")}</div>
<table>
<colgroup><col><col style="width:17mm"><col style="width:22mm"><col style="width:22mm"><col style="width:22mm"><col style="width:22mm"></colgroup>
<tr><th colspan="6" class="term">ภาคเรียนที่ ${escH(GD.term)}</th></tr>
<tr class="hd"><th class="subj">รายวิชา</th><th><div class="v">หน่วยกิต</div></th><th><div class="v">คะแนนกลางภาค</div></th><th><div class="v">คะแนนปลายภาค</div></th><th><div class="v">รวมคะแนน</div></th><th><div class="v">ผลการเรียน</div></th></tr>
<tr class="mx"><td></td><td></td><td>40</td><td>60</td><td>100</td><td>4.00</td></tr>
${body}
</table></section>`;
}
const GD_PRINT_CSS = `@page{size:A4 portrait;margin:12mm 14mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;background:#fff;color:#111}
body{font-family:'Sarabun','Noto Sans Thai','Leelawadee UI',Tahoma,sans-serif;font-size:13px;line-height:1.35}
.pg{break-after:page;page-break-after:always}.pg.last{break-after:auto;page-break-after:auto}
.hdr{text-align:center;margin:2mm 0 6mm}
.t1{font-size:16px;font-weight:700}
.t2{font-size:14px;font-weight:600;margin-top:1.2mm}
.who{display:flex;align-items:flex-end;gap:5mm;margin-bottom:5mm;font-size:13px}
.f{display:flex;align-items:flex-end;gap:2mm;white-space:nowrap}
.f .k{flex:none}
.f .val{flex:1;min-height:5.5mm;padding:0 2mm;text-align:center;border-bottom:.6pt dotted #333;overflow:hidden;text-overflow:clip}
.f1{width:46mm}.f2{flex:1}.f3{width:30mm}.f4{width:24mm}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border:.6pt solid #333;padding:0 2mm;height:8mm;text-align:center;vertical-align:middle;font-size:12.5px;font-weight:400}
td.l{text-align:left;padding-left:3mm;white-space:nowrap;overflow:hidden}
th.term{background:#ececec;font-size:13.5px;font-weight:700;height:8.5mm}
tr.hd th{height:31mm;background:#f6f6f6;font-size:12px;font-weight:600;padding:0}
tr.hd th.subj{text-align:left;vertical-align:bottom;padding:0 3mm 2mm;font-size:12.5px}
.v{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;margin:0 auto;line-height:1}
tr.mx td{height:6.5mm;font-size:11.5px;color:#444;background:#fafafa}
td.tt{font-weight:600}
tr.sum td{background:#f2f2f2;font-weight:600}
tr.sum td.l{text-align:right;padding-right:3mm}`;
function gdPrintHtml(list){
  const used = gdUsed();
  const pages = list.map((r, i) => gdPage(r, used, i === list.length - 1)).join("");
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ผลการเรียน ${escH(GD.room)} ภาคเรียนที่ ${escH(GD.term)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>${GD_PRINT_CSS}</style></head><body>${pages}
<script>(function(){var d=false;function go(){if(d)return;d=true;setTimeout(function(){try{window.focus();window.print();}catch(e){}},300);}
var f=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();f.then(go,go);setTimeout(go,4000);})();<\/script></body></html>`;
}
function gdPrint(list){
  if(!GD.rows.length){ say("เลือกห้องก่อนนะครับ"); return; }
  const w = window.open("", "_blank");
  if(!w){ say("เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาตป๊อปอัปแล้วลองอีกครั้ง"); return; }
  w.document.open(); w.document.write(gdPrintHtml(list)); w.document.close();
}

registerTool({
  id:"grade", icon:"🧮", color:"c-green", title:"คำนวณเกรด", desc:"กลางภาค · ปลายภาค · คำนวณเกรด (3 หน้าต่อเทอม) วางจาก Google Sheet ได้ แล้วพิมพ์รายบุคคล",
  html:`
    <div class="card">
      <div class="gd-ctl">
        <div class="field"><label for="gdRoom">ห้อง / ชั้นปี</label><select id="gdRoom"></select></div>
        <div class="field"><label for="gdTerm">ภาคเรียน</label><select id="gdTerm"><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select></div>
        <div class="field"><label for="gdYear">ปีการศึกษา</label><input id="gdYear" type="text" inputmode="numeric" maxlength="4" autocomplete="off"></div>
      </div>
      <div class="gd-tabs">
        <button type="button" class="gd-tab on" data-tab="mid">① กลางภาค</button>
        <button type="button" class="gd-tab" data-tab="end">② ปลายภาค</button>
        <button type="button" class="gd-tab" data-tab="calc">③ คำนวณเกรด</button>
      </div>
      <div class="tl-row" style="margin-top:12px;">
        <label class="sw" id="gdRoundSw"><input type="checkbox" id="gdRound" checked><span class="sw-track"></span>ปัดคะแนนรวมเป็นจำนวนเต็ม</label>
        <span class="score-info" id="gdInfo"></span>
      </div>
      <div class="gd-acts">
        <button type="button" class="btn btn-primary btn-sm" id="gdPrintAll">🖨️ พิมพ์ทั้งห้อง (1 คน/หน้า)</button>
        <button type="button" class="btn btn-outline btn-sm" id="gdCopyHead">📋 คัดลอกหัวคอลัมน์ไปวางใน Sheet</button>
        <button type="button" class="btn btn-outline btn-sm" id="gdClear">🗑️ ล้างคะแนนหน้านี้</button>
      </div>
      <div class="gd-note" id="gdHint"></div>
    </div>
    <details class="gd-crbox" id="gdCrBox" hidden><summary>⚙️ หน่วยกิตรายวิชา (แก้ได้ · วิชาที่รวมกันจะบวกหน่วยกิตให้เอง)</summary><div class="gd-crgrid" id="gdCrGrid"></div></details>
    <div class="gd-wrap" id="gdWrap"></div>`,
  init(v){
    GD.view = v; GD.store = gdLoad();
    $("#gdYear", v).value = GD.store.year; $("#gdRound", v).checked = !!GD.store.round;
    $("#gdRoom", v).addEventListener("change", e => gdLoadRoom(e.target.value));
    $("#gdTerm", v).addEventListener("change", e => { GD.term = e.target.value; gdRender(); });
    $("#gdYear", v).addEventListener("input", e => { GD.store.year = e.target.value.trim(); gdSave(); });
    $("#gdRound", v).addEventListener("change", e => { GD.store.round = e.target.checked; gdSave(); gdRender(); });
    v.querySelectorAll(".gd-tab").forEach(b => b.addEventListener("click", () => { GD.tab = b.dataset.tab; gdRender(); const w = $("#gdWrap", v); w.scrollTop = 0; w.scrollLeft = 0; }));
    $("#gdPrintAll", v).addEventListener("click", () => gdPrint(GD.rows.map((_, i) => i)));
    $("#gdCopyHead", v).addEventListener("click", () => {
      const txt = GD_SUBJ.join("\t");
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => say("คัดลอกหัวคอลัมน์แล้ว — วางที่แถวหัวตารางใน Sheet"), () => say("คัดลอกไม่สำเร็จ"));
      else say("เบราว์เซอร์นี้คัดลอกอัตโนมัติไม่ได้");
    });
    $("#gdClear", v).addEventListener("click", () => {
      if(!GD.rows.length){ say("เลือกห้องก่อนนะครับ"); return; }
      const nm = GD.tab === "end" ? "ปลายภาค" : "กลางภาค";
      if(!confirm(`ล้างคะแนน${nm}ทั้งหมดของ ${GD.room} ภาคเรียนที่ ${GD.term} ?`)) return;
      const off = gdOff(); GD.rows.forEach((_, r) => { const x = gdVals(r); for(let s = 0; s < GD_N; s++) x[s * 2 + off] = ""; });
      gdSave(); gdRender(); say(`ล้างคะแนน${nm}แล้ว`);
    });
    const wrap = $("#gdWrap", v);
    wrap.addEventListener("input", e => {
      const t = e.target;
      if(t.classList.contains("gd-in")){ gdVals(+t.dataset.r)[+t.dataset.c * 2 + gdOff()] = t.value.trim(); gdMark(t); gdSave(); }
    });
    $("#gdCrBox", v).addEventListener("input", e => {
      const t = e.target; if(!t.classList.contains("gd-cr")) return;
      GD.store.credits[+t.dataset.cs] = t.value.trim(); gdSave();
      GD_OUT.forEach((g, gi) => { const el = $(`[data-crsum="${gi}"]`, GD.view); if(el){ const k = gdCreditOf(g); el.textContent = "รวม " + (isNaN(k) ? "–" : gdFmt(k)); } });
      gdRenderCalc($("#gdWrap", GD.view), GD.rows.length);
    });
    wrap.addEventListener("paste", gdPaste);
    wrap.addEventListener("keydown", e => {
      const t = e.target; if(!t.classList.contains("gd-in")) return;
      const d = e.key === "Enter" || e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0; if(!d) return;
      e.preventDefault();
      const nx = $(`.gd-in[data-r="${+t.dataset.r + d}"][data-c="${t.dataset.c}"]`, wrap);
      if(nx){ nx.focus(); nx.select(); }
    });
    wrap.addEventListener("click", e => { const b = e.target.closest(".gd-pb"); if(b) gdPrint([+b.dataset.pr]); });
    gdTabs();
  },
  onOpen(){
    gdFillRooms();
    const sel = $("#gdRoom", GD.view); gdLoadRoom(sel.value);
  }
});

/* ================= กระดาน (เขียนทดเล่น · มีโหมดปิดนิ้ววาด ใช้ Apple Pencil ได้) ================= */
(function(){
const WB_KEY = "kc_wb_v1";
const WB_COLORS = ["#1B2233","#1A73E8","#D93025","#188038","#F29900","#8B5CF6","#FFFFFF"];
const WB_BGS = [["plain","ขาว"],["lined","บรรทัด"],["grid","ตาราง"],["dots","จุด"],["board","กระดานดำ"]];
const WB_PAPER = { plain:"#FFFFFF", lined:"#FFFFFF", grid:"#FFFFFF", dots:"#FFFFFF", board:"#21463C" };
const WB_MODES = [["auto","🤖 อัตโนมัติ"],["pen","🔒 ปิดนิ้ววาด"],["all","👆 นิ้วก็วาดได้"]];
const WB_HOLD_MS = 600, WB_HOLD_R = 6;   // หยุดค้างกี่ ms / ขยับไม่เกินกี่ px ถึงนับว่า "หยุด"
const WB_TOOLS = ["pen","hl","er","eo","ob"];
const WB_ICO = { pen:"✏️", hl:"🖍️", er:"🧽", eo:"🧹", ob:"🖐️" };

const WB_CSS = `
#view-tool-board,.wb-root{--c-main:#8B5CF6; --c-bg:#EFE9FE; --c-ink:#5B2FC9; --c-sh:rgba(139,92,246,.6); --c-on:#fff;}
.wb-root{display:flex; flex-direction:column; gap:8px; margin-top:6px;}
.wb-bar{display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; padding:8px 10px; background:#fff; color:#1B2233; border:1.5px solid #E1E7F3; border-radius:18px; box-shadow:0 10px 22px -20px rgba(27,34,51,.5);}
.wb-grp{display:flex; align-items:center; gap:6px; flex-wrap:wrap;}
.wb-lab{font-size:12.5px; font-weight:700; opacity:.65;}
.wb-b{display:inline-flex; align-items:center; justify-content:center; gap:5px; min-height:40px; min-width:40px; padding:0 11px; border-radius:12px; border:1.5px solid #E1E7F3; background:#fff; color:inherit; font:inherit; font-size:15px; font-weight:600; cursor:pointer; touch-action:manipulation; -webkit-tap-highlight-color:transparent; transition:background .15s, color .15s, border-color .15s, transform .1s;}
.wb-b span{font-size:13px;}
.wb-b:active{transform:scale(.95);}
.wb-b.on{background:var(--c-main); border-color:var(--c-main); color:#fff;}
.wb-b:disabled{opacity:.4; cursor:default; transform:none;}
.wb-sw{width:30px; height:30px; padding:0; border-radius:50%; border:2px solid #fff; box-shadow:0 0 0 1.5px #D5DBE8; cursor:pointer; flex:none; touch-action:manipulation;}
.wb-sw.on{box-shadow:0 0 0 3px var(--c-main);}
.wb-size input[type=range]{width:110px; accent-color:var(--c-main); touch-action:manipulation;}
.wb-pv{width:34px; height:34px; display:flex; align-items:center; justify-content:center; flex:none;}
.wb-pv i{display:block; border-radius:50%; box-sizing:border-box;}
.wb-num{width:74px; min-height:40px; padding:0 8px; border-radius:12px; border:1.5px solid #E1E7F3; background:#fff; color:inherit; font:inherit; font-size:15px; font-weight:600; text-align:center; touch-action:manipulation; box-sizing:border-box;}
.wb-num:focus{outline:2px solid var(--c-main); outline-offset:1px;}
html[data-theme="dark"] .wb-num,html[data-theme="black"] .wb-num{background:#262e45; border-color:#2c3450;}
.wb-stat{font-size:12.5px; line-height:1.5; padding:0 4px; color:var(--ink-soft); min-height:19px; transition:color .2s;}
.wb-stat.flash{color:#D93025; font-weight:700;}
.wb-stage{position:relative; height:68vh; height:68dvh; min-height:340px; max-height:920px; border-radius:20px; overflow:hidden; border:1.5px solid #E1E7F3; background:#fff; box-shadow:0 12px 26px -20px rgba(27,34,51,.5);}
html.mode-pc .wb-stage{height:72vh; height:72dvh;}
.wb-stage canvas{position:absolute; left:0; top:0; width:100%; height:100%; display:block;}
.wb-top{touch-action:none; -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; cursor:crosshair;}
.wb-panel{display:flex; flex-direction:column; gap:8px;}
.wb-fab{display:none;}
.wb-root.full{position:fixed; inset:0; z-index:250; margin:0; gap:0; padding:0; background:#0d1020; overscroll-behavior:contain;}
.wb-root.full .wb-stage{position:absolute; inset:0; height:auto; min-height:0; max-height:none; border-radius:0; border:none; box-shadow:none;}
.wb-root.full .wb-fab{display:flex; position:absolute; z-index:5; left:max(14px,env(safe-area-inset-left)); top:max(14px,env(safe-area-inset-top)); width:54px; height:54px; padding:0; border-radius:50%; border:none; align-items:center; justify-content:center; font-size:24px; line-height:1; background:var(--c-main); color:#fff; box-shadow:0 10px 24px -8px rgba(0,0,0,.55), 0 0 0 3px rgba(255,255,255,.9); cursor:pointer; touch-action:none; -webkit-user-select:none; user-select:none; -webkit-tap-highlight-color:transparent; transition:transform .15s;}
.wb-root.full .wb-fab:active{transform:scale(.92);}
.wb-fab i{position:absolute; right:2px; bottom:2px; width:16px; height:16px; border-radius:50%; border:2.5px solid #fff; box-sizing:border-box; box-shadow:0 0 0 1px rgba(0,0,0,.25);}
.wb-root.full .wb-panel{position:absolute; z-index:4; width:min(620px, calc(100vw - 16px)); max-height:calc(100vh - 16px); max-height:calc(100dvh - 16px); overflow:auto; padding:2px; visibility:hidden; opacity:0; transform:scale(.35); pointer-events:none; transition:transform .2s cubic-bezier(.2,1.25,.4,1), opacity .15s, visibility 0s linear .2s;}
.wb-root.full .wb-panel.open{visibility:visible; opacity:1; transform:none; pointer-events:auto; transition:transform .2s cubic-bezier(.2,1.25,.4,1), opacity .15s, visibility 0s;}
.wb-root.full .wb-bar{box-shadow:0 14px 30px -10px rgba(0,0,0,.5);}
.wb-root.full .wb-stat{background:rgba(20,25,45,.9); color:#E8ECF8; border-radius:12px; padding:6px 12px;}
@media (prefers-reduced-motion:reduce){ .wb-root.full .wb-panel,.wb-root.full .wb-panel.open{transition:none;} }
html.wb-lock,html.wb-lock body{overflow:hidden;}
html[data-theme="dark"] .wb-bar,html[data-theme="black"] .wb-bar{background:#1d2233; border-color:#2c3450; color:#E8ECF8;}
html[data-theme="dark"] .wb-b,html[data-theme="black"] .wb-b{background:#262e45; border-color:#2c3450;}
html[data-theme="dark"] .wb-b.on,html[data-theme="black"] .wb-b.on{background:var(--c-main); border-color:var(--c-main);}
html[data-theme="dark"] .wb-sw,html[data-theme="black"] .wb-sw{border-color:#1d2233; box-shadow:0 0 0 1.5px #3a4466;}
html[data-theme="dark"] .wb-sw.on,html[data-theme="black"] .wb-sw.on{box-shadow:0 0 0 3px var(--c-main);}
html[data-theme="dark"] .wb-stage,html[data-theme="black"] .wb-stage{border-color:#2c3450;}
`;
(function(){
  if($("#wbCss")) return;
  const st = document.createElement("style"); st.id = "wbCss"; st.textContent = WB_CSS; document.head.appendChild(st);
})();

const WB = { root:null, stage:null, bgc:null, bgx:null, dcv:null, dx:null, base:null, bx:null, ph:null,
  w:0, h:0, d:1, strokes:[], hist:[], future:[], open:false, fsReq:false, cur:null, raf:0, pendSize:false, full:false, saveT:0, statT:0,
  tool:"pen", color:WB_COLORS[0], size:4, bg:"plain", mode:"auto", penSeen:false, snap:true, cubeAuto:true, selId:null, an:null, pr:{ n:3, a:4, h:6, m:true }, prT:0, shT:0 };
const el = {};

/* ---------- เก็บ/โหลด (localStorage) ---------- */
function wbLoad(){
  try{
    const j = JSON.parse(localStorage.getItem(WB_KEY) || "null"); if(!j) return;
    if(WB_TOOLS.includes(j.tool)) WB.tool = j.tool;
    if(typeof j.color === "string" && /^#[0-9a-f]{6}$/i.test(j.color)) WB.color = j.color.toUpperCase();
    if(typeof j.size === "number" && j.size >= 1 && j.size <= 20) WB.size = Math.round(j.size);
    if(WB_PAPER[j.bg]) WB.bg = j.bg;
    if(["auto","pen","all"].includes(j.mode)) WB.mode = j.mode;
    WB.penSeen = !!j.penSeen;
    if(typeof j.snap === "boolean") WB.snap = j.snap;
    if(typeof j.cubeAuto === "boolean") WB.cubeAuto = j.cubeAuto;
    if(j.pr && typeof j.pr === "object"){
      const p = j.pr;
      if(Number.isInteger(p.n) && p.n >= 3 && p.n <= 8) WB.pr.n = p.n;
      if(typeof p.a === "number" && p.a > 0 && p.a <= 9999) WB.pr.a = p.a;
      if(typeof p.h === "number" && p.h > 0 && p.h <= 9999) WB.pr.h = p.h;
      if(typeof p.m === "boolean") WB.pr.m = p.m;
    }
    if(Array.isArray(j.s)) WB.strokes = j.s.filter(s => s && (wbIs3D(s) ? (s.t === "cube" ? wbCubeOk(s) : wbPrismOk(s)) : (["pen","hl","er"].includes(s.t) && Array.isArray(s.p) && s.p.length && /^#[0-9a-f]{6}$/i.test(s.c || "#000000"))));
  }catch(_){}
}
function wbSave(){
  clearTimeout(WB.saveT);
  WB.saveT = setTimeout(() => {
    const base = { tool:WB.tool, color:WB.color, size:WB.size, bg:WB.bg, mode:WB.mode, penSeen:WB.penSeen, snap:WB.snap, cubeAuto:WB.cubeAuto, pr:WB.pr };
    try{
      let s = JSON.stringify(Object.assign({ s:WB.strokes }, base));
      if(s.length > 3000000) s = JSON.stringify(base);   // เส้นเยอะเกินพื้นที่เก็บ — เก็บแค่ค่าตั้ง
      localStorage.setItem(WB_KEY, s);
    }catch(_){}
  }, 600);
}

/* ---------- วาด ---------- */
function wbW(s, k){ return s.t === "er" ? s.s * 4 + 8 : Math.max(.8, s.s * k); }
function wbStyle(x, s){
  x.globalAlpha = 1; x.lineCap = "round"; x.lineJoin = "round";
  if(s.t === "er"){ x.globalCompositeOperation = "destination-out"; x.strokeStyle = "#000"; x.fillStyle = "#000"; }
  else { x.globalCompositeOperation = "source-over"; x.strokeStyle = s.c; x.fillStyle = s.c; }
}
function wbSeg(x, s, i){
  const p = s.p; wbStyle(x, s);
  if(i === 0){ x.beginPath(); x.arc(p[0][0], p[0][1], wbW(s, p[0][2]) / 2, 0, 6.2832); x.fill(); return; }
  const a = p[i-1], b = p[i];
  x.lineWidth = wbW(s, (a[2] + b[2]) / 2);
  x.beginPath();
  if(i === 1){ x.moveTo(a[0], a[1]); x.lineTo((a[0]+b[0])/2, (a[1]+b[1])/2); }
  else { const z = p[i-2]; x.moveTo((z[0]+a[0])/2, (z[1]+a[1])/2); x.quadraticCurveTo(a[0], a[1], (a[0]+b[0])/2, (a[1]+b[1])/2); }
  x.stroke();
}
function wbTail(x, s){
  const p = s.p, n = p.length; if(n < 2) return;
  const a = p[n-1], z = p[n-2]; wbStyle(x, s);
  x.lineWidth = wbW(s, a[2]);
  x.beginPath(); x.moveTo((z[0]+a[0])/2, (z[1]+a[1])/2); x.lineTo(a[0], a[1]); x.stroke();
}
function wbHl(x, s){
  const p = s.p, n = p.length; if(!n) return;
  const w = s.s * 3 + 8;
  x.save(); x.globalCompositeOperation = "source-over"; x.globalAlpha = .38;
  x.strokeStyle = s.c; x.fillStyle = s.c; x.lineCap = "round"; x.lineJoin = "round"; x.lineWidth = w;
  x.beginPath();
  if(n === 1){ x.arc(p[0][0], p[0][1], w / 2, 0, 6.2832); x.fill(); }
  else {
    x.moveTo(p[0][0], p[0][1]);
    for(let i = 1; i < n - 1; i++) x.quadraticCurveTo(p[i][0], p[i][1], (p[i][0]+p[i+1][0])/2, (p[i][1]+p[i+1][1])/2);
    x.lineTo(p[n-1][0], p[n-1][1]); x.stroke();
  }
  x.restore();
}
function wbDraw(x, s){
  if(wbIs3D(s)){ wbShapeDraw(x, s); return; }
  if(s.t === "hl"){ wbHl(x, s); return; }
  for(let i = 0; i < s.p.length; i++) wbSeg(x, s, i);
  wbTail(x, s);
}
function wbPaper(x, w, h, k){
  x.save();
  x.fillStyle = WB_PAPER[k]; x.fillRect(0, 0, w, h);
  x.lineWidth = 1;
  if(k === "lined"){
    x.strokeStyle = "#CFD8EC"; x.beginPath();
    for(let y = 40.5; y < h; y += 34){ x.moveTo(0, y); x.lineTo(w, y); }
    x.stroke();
    x.strokeStyle = "#F2B0B0"; x.beginPath(); x.moveTo(56.5, 0); x.lineTo(56.5, h); x.stroke();
  }else if(k === "grid"){
    x.strokeStyle = "#D9E1F2"; x.beginPath();
    for(let X = .5; X < w; X += 32){ x.moveTo(X, 0); x.lineTo(X, h); }
    for(let Y = .5; Y < h; Y += 32){ x.moveTo(0, Y); x.lineTo(w, Y); }
    x.stroke();
  }else if(k === "dots"){
    x.fillStyle = "#B4BFDA";
    for(let X = 28; X < w; X += 28) for(let Y = 28; Y < h; Y += 28){ x.beginPath(); x.arc(X, Y, 1.5, 0, 6.2832); x.fill(); }
  }
  x.restore();
}
function wbRedrawBase(skip){
  if(!skip){ const lv = WB.an ? WB.an.orig : (WB.cur && WB.cur.ob ? WB.cur.orig : null); if(lv) skip = new Set([lv]); }
  const x = WB.bx;
  x.save(); x.setTransform(1,0,0,1,0,0); x.clearRect(0, 0, WB.base.width, WB.base.height); x.restore();
  WB.strokes.forEach(s => { if(!skip || !skip.has(s)) wbDraw(x, s); });
}
function wbShow(live){
  const x = WB.dx;
  x.save(); x.setTransform(1,0,0,1,0,0); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
  x.clearRect(0, 0, WB.dcv.width, WB.dcv.height); x.drawImage(WB.base, 0, 0);
  x.restore();
  if(live) wbShapeDraw(x, live);
  { const sp = live || wbSel(); if(sp && sp.t === "prism" && sp.m) wbPrismCard(x, sp); }
  if(WB.tool === "ob"){ const c = live || wbSel(); if(c) wbObOverlay(x, c); }
}
function wbSize(){
  if(!WB.stage) return;
  const r = WB.stage.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
  if(w < 20 || h < 20) return;
  const d = Math.min(window.devicePixelRatio || 1, 2);
  if(w === WB.w && h === WB.h && d === WB.d) return;
  WB.w = w; WB.h = h; WB.d = d;
  [WB.bgc, WB.dcv, WB.base].forEach(c => { c.width = Math.round(w * d); c.height = Math.round(h * d); });
  [WB.bgx, WB.dx, WB.bx].forEach(x => x.setTransform(d, 0, 0, d, 0, 0));
  wbPaper(WB.bgx, w, h, WB.bg);
  wbRedrawBase(); wbShow();
}

/* ---------- ปากกา / นิ้ว (ปิดนิ้ววาด) ---------- */
function wbLocked(){ return WB.mode === "pen" || (WB.mode === "auto" && WB.penSeen); }
function wbStatus(){
  el.stat.textContent =
    WB.mode === "pen" ? "🔒 ปิดนิ้ววาดอยู่ — วาดด้วยปากกา (Apple Pencil / Stylus) หรือเมาส์เท่านั้น วางฝ่ามือบนจอได้เลย"
  : WB.mode === "all" ? "👆 วาดได้ทั้งนิ้วและปากกา (ถ้าฝ่ามือทำเส้นเลอะ ให้เลือก “ปิดนิ้ววาด”)"
  : WB.penSeen ? "🔒 ตรวจพบปากกาแล้ว — ปิดนิ้ววาดให้อัตโนมัติ (กด “นิ้วก็วาดได้” ถ้าอยากใช้นิ้ว)"
  : "🤖 ตอนนี้วาดด้วยนิ้วได้ — พอแตะด้วยปากกาครั้งแรก ระบบจะปิดนิ้วให้เอง";
}
function wbFlash(){
  el.stat.classList.add("flash"); clearTimeout(WB.statT);
  WB.statT = setTimeout(() => el.stat.classList.remove("flash"), 700);
}
function wbCancelCur(){ const c = WB.cur; WB.cur = null; if(c) clearTimeout(c.ht); if(WB.raf){ cancelAnimationFrame(WB.raf); WB.raf = 0; } if(c && (c.eo || c.ob)) wbRedrawBase(); wbShow(); }

/* ---------- ยางลบแบบลบวัตถุ (ลบทั้งเส้นที่ลากผ่าน) ---------- */
function wbBox(s){
  if(s._b) return s._b;
  if(wbIs3D(s)){
    const g = wbGeo(s), m = (s.w || 3) / 2 + 2, bx = [g.b[0] - m, g.b[1] - m, g.b[2] + m, g.b[3] + m];
    Object.defineProperty(s, "_b", { value:bx, enumerable:false, writable:true });
    return bx;
  }
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for(const q of s.p){ if(q[0] < a) a = q[0]; if(q[0] > c) c = q[0]; if(q[1] < b) b = q[1]; if(q[1] > d) d = q[1]; }
  const m = (s.t === "hl" ? s.s * 3 + 8 : s.s * 1.6) / 2 + 2;
  const bx = [a - m, b - m, c + m, d + m];
  Object.defineProperty(s, "_b", { value:bx, enumerable:false, writable:true });
  return bx;
}
function wbSegDist(px, py, ax, ay, bx, by){
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function wbHit(s, x, y, R){
  const b = wbBox(s);
  if(x < b[0] - R || x > b[2] + R || y < b[1] - R || y > b[3] + R) return false;
  if(wbIs3D(s)) return wbCubeHit(s, x, y, R);
  const lim = R + (s.t === "hl" ? s.s * 3 + 8 : s.s * 1.2) / 2, p = s.p;
  if(p.length === 1) return Math.hypot(p[0][0] - x, p[0][1] - y) <= lim;
  for(let i = 1; i < p.length; i++) if(wbSegDist(x, y, p[i-1][0], p[i-1][1], p[i][0], p[i][1]) <= lim) return true;
  return false;
}
function wbEoAdd(e){
  const c = WB.cur, r = WB.rect, R = 8 + WB.size;
  const co = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
  const list = co && co.length ? co : [e];
  let changed = false;
  for(const ev of list){
    const x = ev.clientX - r.left, y = ev.clientY - r.top, from = c.pt || { x, y };
    const n = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (R * .6)));
    for(let i = 1; i <= n; i++){
      const px = from.x + (x - from.x) * i / n, py = from.y + (y - from.y) * i / n;
      for(const s of WB.strokes){
        if(s.t === "er" || c.set.has(s)) continue;
        if(wbHit(s, px, py, R)){ c.set.add(s); changed = true; }
      }
    }
    c.pt = { x, y };
  }
  if(changed) wbRedrawBase(c.set);
  if(!WB.raf) WB.raf = requestAnimationFrame(() => {
    WB.raf = 0; const k = WB.cur; if(!k || !k.eo || !k.pt) return;
    wbShow();
    const x = WB.dx; x.save(); x.beginPath(); x.arc(k.pt.x, k.pt.y, R, 0, 6.2832);
    x.setLineDash([5, 4]); x.lineWidth = 1.5; x.strokeStyle = "#8B5CF6"; x.stroke(); x.restore();
  });
}

/* ---------- จัดรูปอัตโนมัติ (ลากแล้วหยุดค้าง → เส้นตรง / วงกลม / สี่เหลี่ยม / สามเหลี่ยม) ---------- */
function wbResample(P, n){
  const d = [0];
  for(let i = 1; i < P.length; i++) d.push(d[i-1] + Math.hypot(P[i][0] - P[i-1][0], P[i][1] - P[i-1][1]));
  const L = d[d.length - 1], out = [];
  if(!L) return P.slice();
  let j = 1;
  for(let i = 0; i < n; i++){
    const t = L * i / (n - 1);
    while(j < P.length - 1 && d[j] < t) j++;
    const a = P[j-1], b = P[j], u = (t - d[j-1]) / ((d[j] - d[j-1]) || 1);
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}
function wbP90(a){ a.sort((x, y) => x - y); return a[Math.floor((a.length - 1) * .9)]; }
function wbHull(pts){
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for(const q of p){ while(lo.length >= 2 && cr(lo[lo.length-2], lo[lo.length-1], q) <= 0) lo.pop(); lo.push(q); }
  for(let i = p.length - 1; i >= 0; i--){ const q = p[i]; while(up.length >= 2 && cr(up[up.length-2], up[up.length-1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop(); return lo.concat(up);
}
function wbPoly(V){   // ต่อจุดตามขอบรูป ห่างกัน ~3px (มุมจะได้ไม่มน) แล้ววนกลับจุดเริ่ม
  const out = [];
  for(let i = 0; i < V.length; i++){
    const a = V[i], b = V[(i + 1) % V.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
    for(let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  out.push([V[0][0], V[0][1]]);
  return out;
}
function wbLineEnd(S, E){   // ใกล้แนวนอน/ตั้ง/เฉียง 45° (±5°) → ดึงให้พอดีแนวนั้น
  const dx = E[0] - S[0], dy = E[1] - S[1], len = Math.hypot(dx, dy);
  if(len < 1) return E;
  const a = Math.atan2(dy, dx), q = Math.PI / 4, na = Math.round(a / q) * q;
  return Math.abs(a - na) <= .087 ? [S[0] + Math.cos(na) * len, S[1] + Math.sin(na) * len] : E;
}
function wbFitEllipse(R){
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for(const q of R){ if(q[0] < a) a = q[0]; if(q[0] > c) c = q[0]; if(q[1] < b) b = q[1]; if(q[1] > d) d = q[1]; }
  const cx = (a + c) / 2, cy = (b + d) / 2;
  let rx = (c - a) / 2, ry = (d - b) / 2; if(rx < 1 || ry < 1) return null;
  const ds = R.map(q => Math.abs(Math.sqrt(((q[0] - cx) / rx) ** 2 + ((q[1] - cy) / ry) ** 2) - 1) * (rx + ry) / 2);
  const e = wbP90(ds) / Math.sqrt(Math.PI * rx * ry);
  if(Math.abs(rx - ry) / Math.max(rx, ry) <= .15) rx = ry = (rx + ry) / 2;   // เกือบกลม → กลมเป๊ะ
  return { e, cx, cy, rx, ry };
}
function wbFitRect(R){
  let cx = 0, cy = 0; for(const q of R){ cx += q[0]; cy += q[1]; } cx /= R.length; cy /= R.length;
  const ev = deg => {
    const a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const T = R.map(q => { const x = q[0] - cx, y = q[1] - cy, u = x * co + y * si, v = -x * si + y * co;
      if(u < x0) x0 = u; if(u > x1) x1 = u; if(v < y0) y0 = v; if(v > y1) y1 = v; return [u, v]; });
    const w = x1 - x0, h = y1 - y0; if(w < 1 || h < 1) return null;
    const e = wbP90(T.map(t => Math.min(t[0] - x0, x1 - t[0], t[1] - y0, y1 - t[1]))) / Math.sqrt(w * h);
    return { e, a, co, si, x0, y0, x1, y1 };
  };
  let best = null, bd = 0;
  for(let deg = 0; deg < 90; deg += 3){ const r = ev(deg); if(r && (!best || r.e < best.e)){ best = r; bd = deg; } }
  if(!best) return null;
  if(bd <= 6 || bd >= 84){ const r0 = ev(0); if(r0) best = r0; }   // เกือบตั้งตรง → ตั้งตรง
  const { co, si, x0, y0, x1, y1 } = best;
  const rot = (u, v) => [u * co - v * si + cx, u * si + v * co + cy];
  return { e: best.e, V: [rot(x0, y0), rot(x1, y0), rot(x1, y1), rot(x0, y1)] };
}
function wbFitTri(R){
  const H = wbHull(R), m = H.length; if(m < 3) return null;
  let best = 0, T = null;
  for(let i = 0; i < m - 2; i++) for(let j = i + 1; j < m - 1; j++) for(let k = j + 1; k < m; k++){
    const a = Math.abs((H[j][0] - H[i][0]) * (H[k][1] - H[i][1]) - (H[k][0] - H[i][0]) * (H[j][1] - H[i][1])) / 2;
    if(a > best){ best = a; T = [H[i], H[j], H[k]]; }
  }
  if(!T || best < 50) return null;
  const ds = R.map(q => Math.min(wbSegDist(q[0], q[1], T[0][0], T[0][1], T[1][0], T[1][1]),
                                  wbSegDist(q[0], q[1], T[1][0], T[1][1], T[2][0], T[2][1]),
                                  wbSegDist(q[0], q[1], T[2][0], T[2][1], T[0][0], T[0][1])));
  return { e: wbP90(ds) / Math.sqrt(best), V: T };
}
function wbRecognize(p){
  const n = p.length; if(n < 6) return null;
  const P = p.map(q => [q[0], q[1]]);
  let L = 0; for(let i = 1; i < n; i++) L += Math.hypot(P[i][0] - P[i-1][0], P[i][1] - P[i-1][1]);
  if(L < 40) return null;
  let k = 0; for(const q of p) k += q[2]; k = +(k / n).toFixed(2);
  const S = P[0], E = P[n-1], d = Math.hypot(E[0] - S[0], E[1] - S[1]);
  const fin = pts => pts.map(q => [+q[0].toFixed(1), +q[1].toFixed(1), k]);

  if(d < .28 * L){                                   // เส้นวนกลับมาใกล้จุดเริ่ม → ลองเป็นรูปปิด
    let a = 1e9, b = 1e9, c = -1e9, dd = -1e9;
    for(const q of P){ if(q[0] < a) a = q[0]; if(q[0] > c) c = q[0]; if(q[1] < b) b = q[1]; if(q[1] > dd) dd = q[1]; }
    if(L < 90 || Math.min(c - a, dd - b) < 22) return null;
    const R = wbResample(P, 72);
    const H = wbHull(R); let ha = 0;
    for(let i = 0; i < H.length; i++){ const u = H[i], v = H[(i + 1) % H.length]; ha += u[0] * v[1] - v[0] * u[1]; }
    if(Math.abs(ha) / 2 < .012 * L * L) return null;   // แบนเกินไป (เช่น ลากไปแล้วลากย้อนทับเส้นเดิม) ไม่ใช่รูปปิด
    const fe = wbFitEllipse(R), fr = wbFitRect(R), ft = wbFitTri(R);
    const cand = [];
    if(fe) cand.push({ kind:"ellipse", e:fe.e, fit:fe });
    if(fr) cand.push({ kind:"rect", e:fr.e, fit:fr });
    if(ft) cand.push({ kind:"tri", e:ft.e, fit:ft });
    const fh = wbFitHex(R); if(fh && fh.e <= .09) cand.push({ kind:"hex", e:fh.e, fit:fh });
    cand.sort((x, y) => x.e - y.e);
    const w = cand[0]; if(!w || w.e > .12) return null;
    if(w.kind === "ellipse"){
      const f = w.fit, t0 = Math.atan2((S[1] - f.cy) / f.ry, (S[0] - f.cx) / f.rx), N = 96, pts = [];
      for(let i = 0; i <= N; i++){ const t = t0 + Math.PI * 2 * i / N; pts.push([f.cx + f.rx * Math.cos(t), f.cy + f.ry * Math.sin(t)]); }
      return { kind:"ellipse", pts:fin(pts) };
    }
    if(w.kind === "hex"){
      const f = w.fit, V = []; let bi = 0, bd = 1e9;
      for(let i = 0; i < 6; i++){ const a = f.th + i * Math.PI / 3; V.push([f.cx + f.r * Math.cos(a), f.cy + f.r * Math.sin(a)]); const dd = Math.hypot(V[i][0] - S[0], V[i][1] - S[1]); if(dd < bd){ bd = dd; bi = i; } }
      return { kind:"hex", pts:fin(wbPoly(V.slice(bi).concat(V.slice(0, bi)))) };
    }
    return { kind:w.kind, pts:fin(wbPoly(w.fit.V)) };
  }
  if(d >= 30){                                       // เส้นเปิด → ตรงพอไหม
    let dev = 0; for(const q of P) dev = Math.max(dev, wbSegDist(q[0], q[1], S[0], S[1], E[0], E[1]));
    if(dev <= .12 * d){ const E2 = wbLineEnd(S, E); return { kind:"line", pts:fin([S, E2]) }; }
  }
  return null;
}
function wbSnap(c){
  c.ht = 0;
  if(WB.cur !== c || c.snap || c.eo) return;
  const s = c.s; if(s.t !== "pen" && s.t !== "hl") return;
  const res = wbRecognize(s.p); if(!res) return;
  s.p = res.pts; c.n = s.p.length;
  c.snap = { kind:res.kind, S:[res.pts[0][0], res.pts[0][1]], k:res.pts[0][2] };
  if(WB.raf){ cancelAnimationFrame(WB.raf); WB.raf = 0; }
  wbShow(); wbDraw(WB.dx, s);
}

function wbAdd(e){
  const c = WB.cur, s = c.s, r = WB.rect;
  if(c.eo){ wbEoAdd(e); return; }
  if(c.snap){                                        // จัดรูปแล้ว: เส้นตรงยังลากปลายปรับได้ รูปอื่นล็อกไว้
    if(c.snap.kind === "line"){
      const E = wbLineEnd(c.snap.S, [e.clientX - r.left, e.clientY - r.top]), k = c.snap.k;
      s.p = [[c.snap.S[0], c.snap.S[1], k], [+E[0].toFixed(1), +E[1].toFixed(1), k]];
      wbShow(); wbDraw(WB.dx, s);
    }
    return;
  }
  const co = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
  const list = co && co.length ? co : [e];
  for(const ev of list){
    const x = ev.clientX - r.left, y = ev.clientY - r.top, last = s.p[s.p.length - 1];
    if(last && Math.abs(x - last[0]) + Math.abs(y - last[1]) < .8) continue;
    let k = 1;
    if(c.type === "pen"){
      const raw = ev.pressure > 0 ? ev.pressure : .5;
      k = .35 + raw * 1.15;
      if(last) k = last[2] * .55 + k * .45;
    }
    s.p.push([+x.toFixed(1), +y.toFixed(1), +k.toFixed(2)]);
  }
  if(s.t === "hl"){
    if(!WB.raf) WB.raf = requestAnimationFrame(() => { WB.raf = 0; if(WB.cur){ wbShow(); wbHl(WB.dx, WB.cur.s); } });
  }else{
    for(; c.n < s.p.length; c.n++) wbSeg(WB.dx, s, c.n);
  }
  if(WB.snap && (s.t === "pen" || s.t === "hl") && s.p.length >= 6){   // นับเวลา "หยุดค้าง"
    const q = s.p[s.p.length - 1];
    if(!c.anc || Math.hypot(q[0] - c.anc[0], q[1] - c.anc[1]) > WB_HOLD_R){
      c.anc = [q[0], q[1]]; clearTimeout(c.ht); c.ht = setTimeout(() => wbSnap(c), WB_HOLD_MS);
    }
  }
}
function wbDown(e){
  if(e.pointerType === "pen" && !WB.penSeen){
    WB.penSeen = true; wbSave();
    if(WB.mode === "auto"){ wbStatus(); say("ตรวจพบปากกา — ปิดนิ้ววาดให้แล้ว ✏️"); }
  }
  if(e.pointerType === "touch" && wbLocked() && !(WB.tool === "ob" && wbObPick(e))){ wbFlash(); return; }
  if(e.pointerType === "mouse" && e.button !== 0 && e.button !== 5) return;
  if(WB.cur){
    if(e.pointerType === "pen" && WB.cur.type !== "pen") wbCancelCur();   // ปากกามาทีหลัง = ยกเลิกเส้นที่เกิดจากฝ่ามือ/นิ้ว
    else return;
  }
  e.preventDefault();
  clearTimeout(WB.shT); WB.shT = 0;                  // วาดต่อ = ยังไม่ต้องเทียบรูปทรง
  if(WB.an) wbAnimStop(true);
  WB.rect = WB.dcv.getBoundingClientRect();
  try{ WB.dcv.setPointerCapture(e.pointerId); }catch(_){}
  if(WB.tool === "ob"){ const pk = wbObPick(e); if(pk){ wbObStart(e, pk); return; } }
  if(WB.tool === "eo"){
    WB.cur = { eo:true, s:{ t:"eo", p:[] }, id:e.pointerId, type:e.pointerType, n:0, set:new Set(), pt:null };
    wbAdd(e); return;
  }
  const er = WB.tool === "er" || (e.buttons & 32) || e.button === 5;   // ปลายยางลบของปากกา (ถ้าอุปกรณ์ส่งมา)
  WB.cur = { s:{ t: er ? "er" : (WB.tool === "ob" ? "pen" : WB.tool), c:WB.color, s:WB.size, p:[], ts:Date.now() }, id:e.pointerId, type:e.pointerType, n:0 };
  wbAdd(e);
}
function wbMove(e){
  if(!WB.cur || e.pointerId !== WB.cur.id) return;
  e.preventDefault();
  if(WB.cur.ob){ wbObMove(e); return; }
  wbAdd(e);
}
function wbUp(e, cancel){
  const c = WB.cur; if(!c || e.pointerId !== c.id) return;
  if(cancel){ wbCancelCur(); }
  else if(c.eo){
    WB.cur = null;
    if(WB.raf){ cancelAnimationFrame(WB.raf); WB.raf = 0; }
    if(c.set.size){ wbPush(); WB.strokes = WB.strokes.filter(s => !c.set.has(s)); wbBtns(); wbSave(); }
    wbRedrawBase(); wbShow();
  }else if(c.ob){
    WB.cur = null;
    if(WB.raf){ cancelAnimationFrame(WB.raf); WB.raf = 0; }
    if(c.moved){ wbPush(); WB.strokes = WB.strokes.map(s => s === c.orig ? c.tmp : s); }
    wbRender();
  }else{
    WB.cur = null;
    if(WB.raf){ cancelAnimationFrame(WB.raf); WB.raf = 0; }
    clearTimeout(c.ht);
    c.s.te = Date.now();
    wbDraw(WB.bx, c.s); wbPush(); WB.strokes.push(c.s);
    wbShow(); wbBtns(); wbSave();
    if(WB.cubeAuto && c.s.t === "pen"){ clearTimeout(WB.shT); WB.shT = setTimeout(wbShScan, WB_SH_MS); }   // วาดเสร็จและหยุดสักครู่ → เทียบรูปทรง
  }
  if(WB.pendSize){ WB.pendSize = false; wbSize(); }
}

/* ---------- รูปทรง 3D: ลูกบาศก์ (วาดแบบไหนก็ได้ แล้วหยุดสักครู่ ระบบเทียบรูปทรงให้ · หมุน/ย้าย/ย่อขยาย/คลี่ได้) ---------- */
const WB_ISO = 0.6155, WB_PERSP = 16;
const WB_NETS = [          // แบบการคลี่ [คอลัมน์, แถว] ของหน้าทั้ง 6
  [[1,0],[0,1],[1,1],[2,1],[3,1],[1,2]],
  [[0,0],[0,1],[1,1],[2,1],[3,1],[3,2]],
  [[0,0],[1,0],[1,1],[2,1],[3,1],[1,2]],
  [[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]],
  [[0,0],[1,0],[2,0],[2,1],[3,1],[4,1]],
  [[0,0],[1,0],[2,0],[1,1],[1,2],[1,3]]
];

function wbNetBuild(cells, u){     // พับหน้าทั้งหมดตามแบบที่คลี่ → จุดมุม 3 มิติ (u=0 ปิดเป็นลูกบาศก์, u=1 แบนราบ)
  const key = (a, b) => a + "," + b, map = new Map();
  cells.forEach((q, i) => map.set(key(q[0], q[1]), i));
  const D = [[1,0],[-1,0],[0,1],[0,-1]];
  let base = 0, bn = -1;
  cells.forEach((q, i) => { let n = 0; D.forEach(d => { if(map.has(key(q[0] + d[0], q[1] + d[1]))) n++; }); if(n > bn){ bn = n; base = i; } });
  const phi = (1 - u) * Math.PI / 2, out = new Array(cells.length), seen = new Set([base]);
  const P = (c, r) => [c, -r, 0];
  const rot = (p, a, d, ang) => {
    const vx = p[0] - a[0], vy = p[1] - a[1], vz = p[2] - a[2], co = Math.cos(ang), si = Math.sin(ang);
    const dot = d[0] * vx + d[1] * vy;
    return [vx * co + d[1] * vz * si + d[0] * dot * (1 - co) + a[0],
            vy * co - d[0] * vz * si + d[1] * dot * (1 - co) + a[1],
            vz * co + (d[0] * vy - d[1] * vx) * si + a[2]];
  };
  const visit = (i, M) => {
    const q = cells[i], c = q[0], r = q[1];
    const m0 = M([c + .5, -(r + .5), 0]), m1 = M([c + .5, -(r + .5), 1]);
    out[i] = { v:[P(c, r), P(c + 1, r), P(c + 1, r + 1), P(c, r + 1)].map(M), n:[m1[0] - m0[0], m1[1] - m0[1], m1[2] - m0[2]], id:i };
    D.forEach(d => {
      const j = map.get(key(c + d[0], r + d[1]));
      if(j === undefined || seen.has(j)) return;
      seen.add(j);
      let a, b;
      if(d[0] === 1){ a = P(c + 1, r); b = P(c + 1, r + 1); }
      else if(d[0] === -1){ a = P(c, r); b = P(c, r + 1); }
      else if(d[1] === 1){ a = P(c, r + 1); b = P(c + 1, r + 1); }
      else { a = P(c, r); b = P(c + 1, r); }
      const ln = Math.hypot(b[0] - a[0], b[1] - a[1]), ax = [(b[0] - a[0]) / ln, (b[1] - a[1]) / ln, 0];
      const cj = cells[j], zz = ax[0] * (-(cj[1] + .5) - a[1]) - ax[1] * (cj[0] + .5 - a[0]);
      const ang = zz > 0 ? -phi : phi;                 // พับลงด้านหลังกระดาษ → ด้านหน้า (+Z) เป็นผิวนอกของลูกบาศก์
      visit(j, p => M(rot(p, a, ax, ang)));
    });
  };
  visit(base, p => p.slice());
  return out;
}
function wbCubeOk(s){
  const f = v => typeof v === "number" && isFinite(v);
  return f(s.x) && f(s.y) && f(s.L) && s.L > 4 && f(s.rx) && f(s.ry) && /^#[0-9a-f]{6}$/i.test(s.c || "");
}
function wbCubeGeo(c){     // ฉายภาพ: ได้หน้า 6 หน้า (จุดบนจอ, มองเห็นไหม, ความลึก) และกรอบ
  const fs = wbNetBuild(WB_NETS[(c.net | 0) % WB_NETS.length], c.u || 0);
  const w = p => [p[0], p[2], -p[1]];                  // กระดาษ (X,Y,Z) → โลก (x, สูง, z)
  let px = 0, py = 0, pz = 0, m = 0;
  fs.forEach(f => f.v.forEach(p => { const q = w(p); px += q[0]; py += q[1]; pz += q[2]; m++; }));
  px /= m; py /= m; pz /= m;
  const cy = Math.cos(c.ry), sy = Math.sin(c.ry), cx = Math.cos(c.rx), sx = Math.sin(c.rx), D = WB_PERSP, L = c.L;
  const R = q => { const x1 = q[0] * cy + q[2] * sy, z1 = -q[0] * sy + q[2] * cy; return [x1, q[1] * cx - z1 * sx, q[1] * sx + z1 * cx]; };
  let a = 1e9, b = 1e9, e = -1e9, d = -1e9;
  const F = fs.map(f => {
    const P3 = f.v.map(p => { const q = w(p); return R([q[0] - px, q[1] - py, q[2] - pz]); });
    const n = R(w(f.n)), mx = (P3[0][0] + P3[1][0] + P3[2][0] + P3[3][0]) / 4, my = (P3[0][1] + P3[1][1] + P3[2][1] + P3[3][1]) / 4, mz = (P3[0][2] + P3[1][2] + P3[2][2] + P3[3][2]) / 4;
    const P2 = P3.map(q => { const s = D / (D - q[2]) * L; return [c.x + q[0] * s, c.y - q[1] * s]; });
    P2.forEach(q => { if(q[0] < a) a = q[0]; if(q[0] > e) e = q[0]; if(q[1] < b) b = q[1]; if(q[1] > d) d = q[1]; });
    return { p:P2, z:mz, n, id:f.id, vis:(n[0] * -mx + n[1] * -my + n[2] * (D - mz)) > 0 };
  });
  return { f:F, b:[a, b, e, d] };
}
function wbCubeDraw(x, c){
  const g = wbCubeGeo(c), path = p => { x.beginPath(); x.moveTo(p[0][0], p[0][1]); for(let i = 1; i < 4; i++) x.lineTo(p[i][0], p[i][1]); x.closePath(); };
  x.save();
  x.globalCompositeOperation = "source-over"; x.lineJoin = "round"; x.lineCap = "round"; x.lineWidth = c.w || 3;
  x.strokeStyle = c.c; x.fillStyle = c.c;
  x.setLineDash([6, 5]); x.globalAlpha = .5;                  // เส้นด้านหลัง = เส้นประ
  g.f.forEach(f => { if(!f.vis){ path(f.p); x.stroke(); } });
  x.setLineDash([]);
  g.f.filter(f => f.vis).sort((p, q) => p.z - q.z).forEach(f => {
    const nl = Math.hypot(f.n[0], f.n[1], f.n[2]) || 1, lit = Math.max(0, (-.4 * f.n[0] + .8 * f.n[1] + .45 * f.n[2]) / nl / .99);
    path(f.p); x.globalAlpha = .1 + .24 * lit; x.fill();
    x.globalAlpha = 1; x.stroke();
    if((c.u || 0) > .04){
      let sx = 0, sy = 0; f.p.forEach(q => { sx += q[0]; sy += q[1]; });
      x.font = "700 " + Math.max(11, Math.round(c.L * .32)) + "px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(String(f.id + 1), sx / 4, sy / 4);
    }
  });
  x.restore();
}
function wbInPoly(x, y, P){
  let k = false;
  for(let i = 0, j = P.length - 1; i < P.length; j = i++){
    if((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) k = !k;
  }
  return k;
}
function wbCubeHit(s, x, y, R){
  const g = wbGeo(s);
  for(const f of g.f){
    if(wbInPoly(x, y, f.p)) return true;
    for(let i = 0, k = f.p.length; i < k; i++){ const u = f.p[i], v = f.p[(i + 1) % k]; if(wbSegDist(x, y, u[0], u[1], v[0], v[1]) <= R + 2) return true; }
  }
  return false;
}
function wbSel(){
  const cs = WB.strokes.filter(wbIs3D);
  return cs.find(c => c.id === WB.selId) || cs[cs.length - 1] || null;
}

/* ---------- รูปทรง 3D: ปริซึม (ฐานเป็นรูปหลายเหลี่ยมด้านเท่า 3–8 ด้าน · หมุน/ย้าย/ย่อขยาย/คลี่ได้ · แสดงขนาด + คำนวณพื้นที่ผิว/ปริมาตร) ---------- */
const WB_PR_RY = .6;
const WB_PR_NAMES = { 3:"สามเหลี่ยม", 4:"สี่เหลี่ยม", 5:"ห้าเหลี่ยม", 6:"หกเหลี่ยม", 7:"เจ็ดเหลี่ยม", 8:"แปดเหลี่ยม" };
const WB_PR_BASE = { 3:"สามเหลี่ยมด้านเท่า", 4:"สี่เหลี่ยมจัตุรัส", 5:"ห้าเหลี่ยมด้านเท่า", 6:"หกเหลี่ยมด้านเท่า", 7:"เจ็ดเหลี่ยมด้านเท่า", 8:"แปดเหลี่ยมด้านเท่า" };
const wbIs3D = s => !!s && (s.t === "cube" || s.t === "prism");
const wbFmt = v => String(+(+v).toFixed(2));
function wbGeo(s){ return s.t === "prism" ? wbPrismGeo(s) : wbCubeGeo(s); }
function wbShapeDraw(x, s){ if(s.t === "prism") wbPrismDraw(x, s); else wbCubeDraw(x, s); }
function wbPrismOk(s){
  const f = v => typeof v === "number" && isFinite(v);
  return f(s.x) && f(s.y) && f(s.L) && s.L > 4 && f(s.rx) && f(s.ry) && Number.isInteger(s.n) && s.n >= 3 && s.n <= 8
      && f(s.a) && s.a > 0 && f(s.h) && s.h > 0 && /^#[0-9a-f]{6}$/i.test(s.c || "");
}
function wbPrismRatio(c){ return Math.max(.35, Math.min(3.5, c.h / c.a)); }   // สัดส่วนสูง/ด้านฐาน ที่ใช้วาด (ตัวเลขจริงแสดงตามที่ตั้ง)
function wbPrismCalc(c){
  const n = c.n | 0, a = +c.a, h = +c.h, A = n * a * a / (4 * Math.tan(Math.PI / n)), P = n * a;
  return { n, a, h, A, P, LA:P * h, TA:2 * A + P * h, V:A * h };
}
function wbRot3(p, a, d, ang){     // หมุนจุด p รอบแกนที่ผ่านจุด a ทิศ d (หน่วยเวกเตอร์) — สูตรของ Rodrigues
  const vx = p[0] - a[0], vy = p[1] - a[1], vz = p[2] - a[2], co = Math.cos(ang), si = Math.sin(ang), dot = d[0] * vx + d[1] * vy + d[2] * vz;
  return [vx * co + (d[1] * vz - d[2] * vy) * si + d[0] * dot * (1 - co) + a[0],
          vy * co + (d[2] * vx - d[0] * vz) * si + d[1] * dot * (1 - co) + a[1],
          vz * co + (d[0] * vy - d[1] * vx) * si + d[2] * dot * (1 - co) + a[2]];
}
function wbPrismFlat(n, H, net){     // แบบคลี่ (แบนราบ): หน้าข้าง n หน้าเรียงแถว + ฐานบน/ฐานล่างติดที่หน้าข้างหน้าที่ j  (ด้านฐาน = 1)
  const F = [], R = 1 / (2 * Math.sin(Math.PI / n)), ap = 1 / (2 * Math.tan(Math.PI / n));
  for(let i = 0; i < n; i++) F.push({ id:i, par:i ? i - 1 : -1, v:[[i,0,0],[i+1,0,0],[i+1,H,0],[i,H,0]], ax:i ? [[i,0,0],[i,H,0]] : null, ang:2 * Math.PI / n });
  const j = [0, n >> 1, n - 1][net % 3], cx = j + .5, cy = H + ap, th0 = -Math.PI / 2 - Math.PI / n, top = [];
  for(let t = 0; t < n; t++){ const q = th0 + t * 2 * Math.PI / n; top.push([cx + R * Math.cos(q), cy + R * Math.sin(q), 0]); }
  F.push({ id:n,     par:j, v:top,                              ax:[[j,H,0],[j+1,H,0]], ang:Math.PI / 2, base:true });
  F.push({ id:n + 1, par:j, v:top.map(p => [p[0], H - p[1], 0]), ax:[[j,0,0],[j+1,0,0]], ang:Math.PI / 2, base:true });
  return F;
}
function wbPrismFold(F, u){          // พับหน้าทั้งหมดตามบานพับ → จุดมุม 3 มิติ (u=0 ปิดเป็นปริซึม, u=1 แบนราบ)
  const ph = 1 - u, M = new Array(F.length), out = new Array(F.length);
  F.forEach((f, i) => {
    const k = f.v.length, cen = [0, 0, 0];
    f.v.forEach(p => { cen[0] += p[0] / k; cen[1] += p[1] / k; cen[2] += p[2] / k; });
    if(f.par < 0) M[i] = p => p.slice();
    else{
      const a = f.ax[0], b = f.ax[1], ln = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / ln, (b[1] - a[1]) / ln, 0];
      const sg = wbRot3(cen, a, d, .3)[2] < 0 ? 1 : -1, ang = sg * f.ang * ph, mp = M[f.par];     // พับลงด้านหลังกระดาษ → ด้านหน้า (+Z) เป็นผิวนอก
      M[i] = p => mp(wbRot3(p, a, d, ang));
    }
    const m0 = M[i](cen), m1 = M[i]([cen[0], cen[1], 1]);
    out[i] = { v:f.v.map(M[i]), n:[m1[0] - m0[0], m1[1] - m0[1], m1[2] - m0[2]], id:f.id, base:!!f.base, lat:!f.base };
  });
  return out;
}
function wbPrismGeo(c){
  const u = c.u || 0, fl = wbPrismFlat(c.n | 0, wbPrismRatio(c), c.net | 0), A = wbPrismFold(fl, 0), B = wbPrismFold(fl, 1), C = u ? wbPrismFold(fl, u) : A;
  let px = 0, py = 0, pz = 0, m = 0;
  A.forEach(f => f.v.forEach(p => { px += p[0]; py += p[1]; pz += p[2]; m++; }));
  px /= m; py /= m; pz /= m;
  let l = 1e9, t = 1e9, r = -1e9, bt = -1e9;
  B.forEach(f => f.v.forEach(p => { if(p[0] < l) l = p[0]; if(p[0] > r) r = p[0]; if(p[1] < t) t = p[1]; if(p[1] > bt) bt = p[1]; }));
  const ox = px + ((l + r) / 2 - px) * u, oy = py + ((t + bt) / 2 - py) * u, oz = pz * (1 - u);      // จุดหมุน: กลางตัวปริซึม → กลางรูปคลี่
  const cy = Math.cos(c.ry), sy = Math.sin(c.ry), cx = Math.cos(c.rx), sx = Math.sin(c.rx), D = WB_PERSP, L = c.L;
  const R = q => { const x1 = q[0] * cy + q[2] * sy, z1 = -q[0] * sy + q[2] * cy; return [x1, q[1] * cx - z1 * sx, q[1] * sx + z1 * cx]; };
  let a = 1e9, b = 1e9, e = -1e9, d = -1e9;
  const F = C.map(f => {
    const P3 = f.v.map(p => R([p[0] - ox, p[1] - oy, p[2] - oz])), n = R(f.n), k = P3.length;
    let mx = 0, my = 0, mz = 0; P3.forEach(q => { mx += q[0] / k; my += q[1] / k; mz += q[2] / k; });
    const P2 = P3.map(q => { const s = D / (D - q[2]) * L; return [c.x + q[0] * s, c.y - q[1] * s]; });
    P2.forEach(q => { if(q[0] < a) a = q[0]; if(q[0] > e) e = q[0]; if(q[1] < b) b = q[1]; if(q[1] > d) d = q[1]; });
    const vx = -mx, vy = -my, vz = D - mz, dt = n[0] * vx + n[1] * vy + n[2] * vz;
    return { p:P2, z:mz, n, id:f.id, base:f.base, lat:f.lat, vis:dt > 0, k:dt / ((Math.hypot(n[0], n[1], n[2]) * Math.hypot(vx, vy, vz)) || 1) };
  });
  return { f:F, b:[a, b, e, d] };
}
function wbRR(x, l, t, w, h, r){
  x.beginPath(); x.moveTo(l + r, t); x.lineTo(l + w - r, t); x.arcTo(l + w, t, l + w, t + r, r); x.lineTo(l + w, t + h - r); x.arcTo(l + w, t + h, l + w - r, t + h, r);
  x.lineTo(l + r, t + h); x.arcTo(l, t + h, l, t + h - r, r); x.lineTo(l, t + r); x.arcTo(l, t, l + r, t, r); x.closePath();
}
function wbPrismDraw(x, c){
  const g = wbPrismGeo(c), path = p => { x.beginPath(); x.moveTo(p[0][0], p[0][1]); for(let i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1]); x.closePath(); };
  x.save();
  x.globalCompositeOperation = "source-over"; x.lineJoin = "round"; x.lineCap = "round"; x.lineWidth = c.w || 3;
  x.strokeStyle = c.c; x.fillStyle = c.c;
  x.setLineDash([6, 5]); x.globalAlpha = .5;                  // เส้นด้านหลัง = เส้นประ
  g.f.forEach(f => { if(!f.vis){ path(f.p); x.stroke(); } });
  x.setLineDash([]);
  g.f.filter(f => f.vis).sort((p, q) => p.z - q.z).forEach(f => {
    const nl = Math.hypot(f.n[0], f.n[1], f.n[2]) || 1, lit = Math.max(0, (-.4 * f.n[0] + .8 * f.n[1] + .45 * f.n[2]) / nl / .99);
    path(f.p); x.globalAlpha = (f.base ? .17 : .07) + .24 * lit; x.fill();     // ฐานเข้มกว่าหน้าข้างเล็กน้อย
    x.globalAlpha = 1; x.stroke();
    if((c.u || 0) > .04){
      let sx = 0, sy = 0; f.p.forEach(q => { sx += q[0]; sy += q[1]; }); sx /= f.p.length; sy /= f.p.length;
      x.font = "700 " + Math.max(11, Math.round(c.L * .27)) + "px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(f.base ? "ฐาน" : String(f.id + 1), sx, sy);
    }
  });
  x.restore();
  if(c.m) wbPrismLabels(x, c, g);
}
function wbPrismLabels(x, c, g){      // ป้ายความยาว: ด้านของฐาน (a) และความสูง (h) บนหน้าข้างที่หันมาทางเรา
  let f = null;
  if((c.u || 0) > .5) f = g.f.find(q => q.id === 0 && q.vis);
  else g.f.forEach(q => { if(q.lat && q.vis && (!f || q.k > f.k)) f = q; });
  if(!f) return;
  let cx = 0, cy = 0; f.p.forEach(q => { cx += q[0]; cy += q[1]; }); cx /= 4; cy /= 4;
  const v = parseInt(c.c.slice(1), 16), lum = .299 * (v >> 16) + .587 * ((v >> 8) & 255) + .114 * (v & 255);
  const bg = lum > 200 ? "rgba(20,25,45,.82)" : "rgba(255,255,255,.9)", fg = lum > 200 ? "#fff" : c.c;
  const tag = (p, q, txt) => {
    x.save(); x.font = "700 13px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    const tw = x.measureText(txt).width + 14, th = 21, mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    let dx = mx - cx, dy = my - cy; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const off = 6 + Math.abs(dx) * tw / 2 + Math.abs(dy) * th / 2, lx = mx + dx * off, ly = my + dy * off;
    x.globalAlpha = 1; x.setLineDash([]); wbRR(x, lx - tw / 2, ly - th / 2, tw, th, 7); x.fillStyle = bg; x.fill(); x.lineWidth = 1.5; x.strokeStyle = c.c; x.stroke();
    x.fillStyle = fg; x.fillText(txt, lx, ly + .5); x.restore();
  };
  tag(f.p[0], f.p[1], wbFmt(c.a) + " ซม.");
  tag(f.p[3], f.p[0], wbFmt(c.h) + " ซม.");
}
function wbPrismCard(x, c){           // การ์ดสรุปจำนวนหน้า/ขอบ/จุดยอด + สูตรและผลคำนวณ (วาดทับเฉพาะตอนแสดงผล ไม่เก็บลงเส้น)
  const m = wbPrismCalc(c), f = wbFmt, n = m.n;
  const rows = [
    ["ปริซึม" + WB_PR_NAMES[n] + "  (ฐานเป็น" + WB_PR_BASE[n] + ")", 2],
    [(n + 2) + " หน้า (ฐาน 2 + หน้าข้าง " + n + ") · " + (3 * n) + " ขอบ · " + (2 * n) + " จุดยอด", 0],
    ["ด้านของฐาน = " + f(m.a) + " ซม. · สูง = " + f(m.h) + " ซม.", 0],
    ["พื้นที่ฐาน (1 ฐาน) = " + f(m.A) + " ตร.ซม.", 0],
    ["เส้นรอบฐาน = " + n + " × " + f(m.a) + " = " + f(m.P) + " ซม.", 0],
    ["พื้นที่ผิวข้าง = " + f(m.P) + " × " + f(m.h) + " = " + f(m.LA) + " ตร.ซม.", 0],
    ["พื้นที่ผิวทั้งหมด = 2×" + f(m.A) + " + " + f(m.LA) + " = " + f(m.TA) + " ตร.ซม.", 1],
    ["ปริมาตร = " + f(m.A) + " × " + f(m.h) + " = " + f(m.V) + " ลบ.ซม.", 1]
  ];
  const dark = WB.bg === "board", lh = 21, pad = 10;
  x.save(); x.setLineDash([]); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.textAlign = "left"; x.textBaseline = "middle";
  let w = 0; rows.forEach(r => { x.font = (r[1] ? "700 " : "500 ") + "13px sans-serif"; w = Math.max(w, x.measureText(r[0]).width); });
  w = Math.min(w + pad * 2, WB.w - 12);
  const l = Math.max(6, WB.w - w - 8), t = 8, h = rows.length * lh + pad * 2 - 4;
  wbRR(x, l, t, w, h, 12); x.fillStyle = dark ? "rgba(14,28,24,.92)" : "rgba(255,255,255,.94)"; x.fill();
  x.lineWidth = 1.5; x.strokeStyle = "#8B5CF6"; x.stroke();
  rows.forEach((r, i) => {
    x.font = (r[1] ? "700 " : "500 ") + "13px sans-serif";
    x.fillStyle = r[1] === 2 ? "#8B5CF6" : r[1] ? (dark ? "#FFE08A" : "#5B2FC9") : (dark ? "#F1F5F2" : "#1B2233");
    x.fillText(r[0], l + pad, t + pad + i * lh + lh / 2 - 2, w - pad * 2);
  });
  x.restore();
}
function wbPrismOpenTo(c){        // เป้าหมายตอนคลี่: แบนราบ หันหน้าตรง ย่อให้พอดีจอ วางกลางกระดาน
  const pr = Object.assign({}, c, { u:1, rx:0, ry:0, L:100, x:0, y:0 }), b = wbPrismGeo(pr).b, bw = Math.max(1, b[2] - b[0]) / 100, bh = Math.max(1, b[3] - b[1]) / 100;
  const L = Math.max(24, Math.min(c.L, WB.w * .9 / bw, WB.h * .9 / bh));
  return { u:1, rx:0, ry:0, L, x:WB.w / 2, y:WB.h / 2, L0:c.L };
}
function wbAddPrism(){
  if(!WB.w || WB.cur) return;
  wbAnimStop(true);
  const k = WB.strokes.filter(wbIs3D).length, L = Math.max(50, Math.min(130, Math.min(WB.w, WB.h) * .2)), p = WB.pr;
  const pr = { t:"prism", id:Date.now().toString(36) + Math.random().toString(36).slice(2, 6), x:WB.w / 2 + (k % 5) * 30, y:WB.h / 2 + (k % 5) * 30,
               L, rx:WB_ISO, ry:WB_PR_RY, u:0, net:0, n:p.n, a:p.a, h:p.h, m:!!p.m, c:WB.color, w:Math.max(2, Math.min(8, WB.size)) };
  wbPush(); WB.strokes.push(pr); WB.selId = pr.id; WB.tool = "ob";
  wbSync(); wbRender();
  say("เพิ่มปริซึม" + WB_PR_NAMES[p.n] + "แล้ว 🔺 ลากที่ตัวปริซึมเพื่อหมุน · ✥ ย้าย · ⤢ ย่อ/ขยาย · 📖 คลี่ · แก้ตัวเลขด้านฐาน/ความสูงได้ที่แถบปริซึม");
}
function wbPrSync(){
  const s = wbSel(), p = s && s.t === "prism" ? s : null, d = p || WB.pr;
  el.prNs.forEach(b => b.classList.toggle("on", +b.dataset.pn === d.n));
  if(document.activeElement !== el.prA) el.prA.value = d.a;
  if(document.activeElement !== el.prH) el.prH.value = d.h;
  el.prM.classList.toggle("on", !!d.m);
}
function wbPrEdit(patch, coalesce){      // แก้ปริซึมที่เลือกอยู่ (ถ้าไม่มี = เปลี่ยนค่าตั้งต้นของปริซึมอันถัดไป)
  Object.assign(WB.pr, patch);
  if(WB.cur){ wbPrSync(); wbSave(); return; }
  wbAnimStop(true);
  const s = wbSel();
  if(s && s.t === "prism"){
    const now = Date.now();
    if(!coalesce || now - WB.prT > 900) wbPush();
    WB.prT = now;
    const t = Object.assign({}, s, patch);
    WB.strokes = WB.strokes.map(q => q === s ? t : q);
    wbRender();
  }else{ wbPrSync(); wbSave(); }
}

/* ---------- จับ ย้าย หมุน ย่อขยาย ---------- */
function wbObHandles(c){
  const g = wbGeo(c), b = g.b, y = Math.min(b[3] + 34, WB.h - 24);
  const mx = Math.max(26, Math.min((b[0] + b[2]) / 2 - 28, WB.w - 84));
  return { b, mv:[mx, y], sz:[mx + 56, y] };
}
function wbObOverlay(x, c){
  const h = wbObHandles(c), b = h.b;
  x.save();
  x.setLineDash([5, 4]); x.lineWidth = 1.2; x.strokeStyle = "#8B5CF6"; x.strokeRect(b[0] - 6, b[1] - 6, b[2] - b[0] + 12, b[3] - b[1] + 12); x.setLineDash([]);
  const ch = (px, py, dx, dy) => { const qx = -dy, qy = dx; x.moveTo(px - 4 * dx + 4 * qx, py - 4 * dy + 4 * qy); x.lineTo(px, py); x.lineTo(px - 4 * dx - 4 * qx, py - 4 * dy - 4 * qy); };
  [[h.mv, 0], [h.sz, 1]].forEach(([p, k]) => {
    x.beginPath(); x.arc(p[0], p[1], 17, 0, 6.2832); x.fillStyle = "#8B5CF6"; x.fill(); x.lineWidth = 2; x.strokeStyle = "#fff"; x.stroke();
    x.lineCap = "round"; x.lineJoin = "round"; x.beginPath();
    if(!k){
      x.moveTo(p[0] - 9, p[1]); x.lineTo(p[0] + 9, p[1]); x.moveTo(p[0], p[1] - 9); x.lineTo(p[0], p[1] + 9);
      ch(p[0] + 9, p[1], 1, 0); ch(p[0] - 9, p[1], -1, 0); ch(p[0], p[1] + 9, 0, 1); ch(p[0], p[1] - 9, 0, -1);
    }else{
      x.moveTo(p[0] - 7, p[1] + 7); x.lineTo(p[0] + 7, p[1] - 7);
      ch(p[0] + 7, p[1] - 7, .7071, -.7071); ch(p[0] - 7, p[1] + 7, -.7071, .7071);
    }
    x.stroke();
  });
  x.restore();
}
function wbObPick(e){
  const r = WB.dcv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, sel = wbSel();
  if(sel){
    const h = wbObHandles(sel);
    if(Math.hypot(x - h.mv[0], y - h.mv[1]) <= 24) return { c:sel, mode:"move" };
    if(Math.hypot(x - h.sz[0], y - h.sz[1]) <= 24) return { c:sel, mode:"size" };
  }
  for(let i = WB.strokes.length - 1; i >= 0; i--){
    const s = WB.strokes[i];
    if(wbIs3D(s) && wbCubeHit(s, x, y, 6)) return { c:s, mode:"rot" };
  }
  return null;
}
function wbObStart(e, pk){
  const r = WB.rect, x = e.clientX - r.left, y = e.clientY - r.top;
  WB.selId = pk.c.id;
  WB.cur = { ob:true, id:e.pointerId, type:e.pointerType, mode:pk.mode, orig:pk.c, tmp:Object.assign({}, pk.c), sx:x, sy:y, moved:false,
             d0:Math.max(12, Math.hypot(x - pk.c.x, y - pk.c.y)) };
  wbRedrawBase(new Set([pk.c]));
  wbShow(WB.cur.tmp); wbBtns();
}
function wbObMove(e){
  const c = WB.cur, r = WB.rect, x = e.clientX - r.left, y = e.clientY - r.top, dx = x - c.sx, dy = y - c.sy;
  if(!c.moved && Math.hypot(dx, dy) < 3) return;
  c.moved = true;
  const o = c.orig, t = c.tmp;
  if(c.mode === "rot"){ t.ry = o.ry + dx * .011; t.rx = o.rx + dy * .011; }
  else if(c.mode === "move"){ t.x = o.x + dx; t.y = o.y + dy; }
  else t.L = Math.max(24, Math.min(700, o.L * Math.hypot(x - o.x, y - o.y) / c.d0));
  if(!WB.raf) WB.raf = requestAnimationFrame(() => { WB.raf = 0; if(WB.cur && WB.cur.ob) wbShow(WB.cur.tmp); });
}

/* ---------- เคลื่อนไหว: คลี่ / พับ / เปลี่ยนแบบ ---------- */
function wbAnim(orig, from, to, dur, nopush, then){
  const a = Object.assign({}, orig, from || {}), b = Object.assign({}, a, to), K = ["u", "rx", "ry", "L", "x", "y"];
  ["rx", "ry"].forEach(k => { if(k in to){ b[k] = a[k] + (((b[k] - a[k] + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI); } });
  if(!nopush) wbPush();
  wbRedrawBase(new Set([orig]));
  const an = WB.an = { orig, a, b, then, t0:0, raf:0 };
  const step = now => {
    if(WB.an !== an) return;
    if(!an.t0) an.t0 = now;
    const k = Math.min(1, (now - an.t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, cur = Object.assign({}, b);
    K.forEach(q => { if(q in to) cur[q] = a[q] + (b[q] - a[q]) * e; });
    wbShow(cur);
    if(k < 1) an.raf = requestAnimationFrame(step);
    else { const th = an.then; wbAnimStop(true); if(th) th(b); }
  };
  an.raf = requestAnimationFrame(step);
}
function wbAnimStop(commit){
  const an = WB.an; if(!an) return;
  WB.an = null; cancelAnimationFrame(an.raf);
  if(commit) WB.strokes = WB.strokes.map(s => s === an.orig ? an.b : s);
  wbRender();
}
function wbOpenTo(c){          // เป้าหมายตอนคลี่: แบนราบ มองจากด้านบน และย่อให้พอดีจอ
  if(c.t === "prism") return wbPrismOpenTo(c);
  const L = Math.min(c.L, WB.w * .9 / 4.4, WB.h * .9 / 3.4), ex = Math.min(WB.w / 2, L * 2.3), ey = Math.min(WB.h / 2, L * 1.8);
  return { u:1, rx:Math.PI / 2, ry:0, L, x:Math.max(ex, Math.min(WB.w - ex, c.x)), y:Math.max(ey, Math.min(WB.h - ey, c.y)), L0:c.L };
}
function wbFold(){
  const c = wbSel(); if(!c || WB.cur) return;
  wbAnimStop(true);
  if((c.u || 0) > .5) wbAnim(c, null, { u:0, rx:WB_ISO, ry:c.t === "prism" ? WB_PR_RY : Math.PI / 4, L:c.L0 || c.L, L0:0 }, 650);
  else wbAnim(c, null, wbOpenTo(c), 750);
}
function wbNetNext(){
  const c = wbSel(); if(!c || WB.cur) return;
  wbAnimStop(true);
  const NN = c.t === "prism" ? 3 : WB_NETS.length, nn = ((c.net | 0) + 1) % NN;
  const go = cc => wbAnim(cc, { net:nn, u:0 }, wbOpenTo(Object.assign({}, cc, { net:nn })), 800, true);
  if((c.u || 0) > .02) wbAnim(c, null, { u:0 }, 380, false, cc => go(cc));
  else go(c);
  say("แบบการคลี่ที่ " + (nn + 1) + " จาก " + NN);
}
function wbAddCube(){
  if(!WB.w || WB.cur) return;
  wbAnimStop(true);
  const k = WB.strokes.filter(s => s.t === "cube").length, L = Math.max(60, Math.min(170, Math.min(WB.w, WB.h) * .24));
  const cube = { t:"cube", id:Date.now().toString(36) + Math.random().toString(36).slice(2, 6), x:WB.w / 2 + (k % 5) * 30, y:WB.h / 2 + (k % 5) * 30,
                 L, rx:WB_ISO, ry:Math.PI / 4, u:0, net:0, c:WB.color, w:Math.max(2, Math.min(8, WB.size)) };
  wbPush(); WB.strokes.push(cube); WB.selId = cube.id; WB.tool = "ob";
  wbSync(); wbRender();
  say("เพิ่มลูกบาศก์แล้ว 🧊 ลากที่ตัวลูกบาศก์เพื่อหมุน · จับปุ่ม ✥ เพื่อย้าย · จับปุ่ม ⤢ เพื่อย่อ/ขยาย · กด 📖 เพื่อคลี่");
}

/* ---------- หกเหลี่ยมด้านเท่า (ใช้จัดรูป 2 มิติตอนหยุดค้าง) ---------- */
function wbFitHex(R){      // หกเหลี่ยมด้านเท่า: จุดกลาง = กึ่งกลางกรอบ (ไม่โดนเส้นที่วาดซ้อนทับดึงเพี้ยน) แล้วไล่หามุมหมุน/ขนาด
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for(const q of R){ if(q[0] < a) a = q[0]; if(q[0] > c) c = q[0]; if(q[1] < b) b = q[1]; if(q[1] > d) d = q[1]; }
  const cx = (a + c) / 2, cy = (b + d) / 2;
  let r0 = 0; for(const q of R) r0 = Math.max(r0, Math.hypot(q[0] - cx, q[1] - cy));
  if(r0 < 8) return null;
  let best = null;
  for(let g = 0; g < 60; g += 3) for(const sc of [.88, .92, .96, 1, 1.04]){
    const r = r0 * sc, th = g * Math.PI / 180, V = [];
    for(let k = 0; k < 6; k++){ const t = th + k * Math.PI / 3; V.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
    const ds = R.map(q => { let m = 1e9; for(let k = 0; k < 6; k++){ const u = V[k], v = V[(k + 1) % 6]; m = Math.min(m, wbSegDist(q[0], q[1], u[0], u[1], v[0], v[1])); } return m; });
    const e = wbP90(ds) / (r * 1.612);
    if(!best || e < best.e) best = { e, cx, cy, r, th };
  }
  return best;
}
/* ---------- เทียบรูปทรง: เก็บเส้นล่าสุดทั้งกลุ่ม → เทียบกับลูกบาศก์/ปริซึม 3–8 เหลี่ยมจากหลายมุมมอง → ถ้าใกล้พอ แทนที่ด้วยรูป 3D ---------- */
const WB_SH_MS = 900;     // หยุดวาดกี่ ms ถึงเริ่มเทียบ
const WB_SH_GAP = 2800;   // เส้นห่างกันไม่เกินกี่ ms ถึงนับเป็นกลุ่มเดียวกัน
const WB_SH_MAX = 16;     // เก็บมาเทียบไม่เกินกี่เส้น
const WB_SH_OK = .045;    // ความคลาดเคลื่อนสูงสุดที่ยอมรับ (สัดส่วนของขนาดรูป) — เกินนี้ = ปล่อยเป็นเส้นเดิม
const WB_SH_WIN = 1.25;   // ต้องดีกว่าทรงอื่น (ฐานคนละจำนวนเหลี่ยม) อย่างน้อยกี่เท่า ไม่งั้นถือว่าไม่แน่ใจ
const WB_SH_3D = .85;     // ต้องดีกว่า "แค่เส้นขอบรอบนอก" อย่างน้อยกี่เท่า (กันสี่เหลี่ยม/หกเหลี่ยมแบนๆ ถูกเดาเป็น 3D)

function wbPq(a, q){ a.sort((x, y) => x - y); return a[Math.floor((a.length - 1) * q)]; }

function wbShPts(G){       // รวมเส้นทั้งกลุ่มเป็นจุดห่างๆ เท่าๆ กัน (ย่อ/ขยายทีหลัง) + กรอบ
  const per = G.map(s => { let l = 0; for(let i = 1; i < s.p.length; i++) l += Math.hypot(s.p[i][0] - s.p[i-1][0], s.p[i][1] - s.p[i-1][1]); return l; });
  const len = per.reduce((u, v) => u + v, 0), step = Math.max(2.5, len / 240), D = [];
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  G.forEach((s, i) => {
    const P = s.p.map(q => [q[0], q[1]]);
    P.forEach(q => { if(q[0] < a) a = q[0]; if(q[0] > c) c = q[0]; if(q[1] < b) b = q[1]; if(q[1] > d) d = q[1]; });
    if(per[i] < step){ D.push(P[0]); return; }
    wbResample(P, Math.max(2, Math.ceil(per[i] / step) + 1)).forEach(q => D.push(q));
  });
  return { D, len, b:[a, b, c, d] };
}
function wbShSample(segs, N){       // จุดบนขอบรูป ห่างเท่าๆ กัน
  let T = 0; segs.forEach(s => { T += Math.hypot(s[2] - s[0], s[3] - s[1]); });
  const step = T / N || 1, out = [];
  segs.forEach((s, j) => {
    const n = Math.max(2, Math.round(Math.hypot(s[2] - s[0], s[3] - s[1]) / step));
    for(let i = 0; i < n; i++){ const t = (i + .5) / n; out.push([s[0] + (s[2] - s[0]) * t, s[1] + (s[3] - s[1]) * t, j]); }
  });
  return out;
}
function wbShSets(c){               // เส้นขอบของรูป 3D (ไม่ซ้ำกัน): ทั้งหมด / เฉพาะที่มองเห็น / เฉพาะเส้นขอบรอบนอก
  const g = wbGeo(c), M = new Map();
  g.f.forEach(f => {
    const k = f.p.length;
    for(let i = 0; i < k; i++){
      const u = f.p[i], v = f.p[(i + 1) % k], A = Math.round(u[0] * 10) + "," + Math.round(u[1] * 10), B = Math.round(v[0] * 10) + "," + Math.round(v[1] * 10), key = A < B ? A + "|" + B : B + "|" + A;
      let e = M.get(key); if(!e){ e = { s:[u[0], u[1], v[0], v[1]], nv:0 }; M.set(key, e); }
      if(f.vis) e.nv++;
    }
  });
  const ar = [];      // พื้นที่หน้าที่มองเห็น — ต้องเห็นอย่างน้อย 2 หน้าที่ใหญ่พอ ไม่งั้นหน้าตาเหมือนรูป 2 มิติ (เช่น สี่เหลี่ยมที่มีแถบด้านบนบางๆ)
  g.f.forEach(f => { if(!f.vis) return; let a = 0; for(let i = 0, k = f.p.length; i < k; i++){ const u = f.p[i], v = f.p[(i + 1) % k]; a += u[0] * v[1] - v[0] * u[1]; } ar.push(Math.abs(a) / 2); });
  const tot = ar.reduce((u, v) => u + v, 0), three = ar.filter(a => a >= .14 * tot).length >= 2;
  const all = [], vis = [], sil = [];
  M.forEach(e => { all.push(e.s); if(e.nv > 0) vis.push(e.s); if(e.nv === 1) sil.push(e.s); });
  const mk = segs => ({ segs, pts:wbShSample(segs, 80) });
  return { all:mk(all), vis:mk(vis), sil:mk(sil), b:g.b, three };
}
function wbShErr(D, S, E, k, tx, ty){   // วัดว่าเส้นที่วาดกับรูปห่างกันแค่ไหน (สองทาง: เส้นที่วาดไกลจากรูป / ขอบรูปที่ไม่มีเส้นวาดถึง) หารด้วยขนาดรูป
  const sg = E.segs, n = sg.length;
  if(!n) return 9;
  const X = new Array(n * 4);
  for(let j = 0; j < n; j++){ X[j*4] = tx + k * sg[j][0]; X[j*4+1] = ty + k * sg[j][1]; X[j*4+2] = tx + k * sg[j][2]; X[j*4+3] = ty + k * sg[j][3]; }
  const d1 = new Array(D.length);
  for(let i = 0; i < D.length; i++){
    const px = D[i][0], py = D[i][1]; let m = 1e9;
    for(let j = 0; j < n; j++){ const d = wbSegDist(px, py, X[j*4], X[j*4+1], X[j*4+2], X[j*4+3]); if(d < m) m = d; }
    d1[i] = m;
  }
  const es = new Array(n).fill(0), ec = new Array(n).fill(0);
  const d2 = E.pts.map(p => {
    const x = tx + k * p[0], y = ty + k * p[1]; let m = 1e18;
    for(let i = 0; i < D.length; i++){ const dx = D[i][0] - x, dy = D[i][1] - y, dd = dx * dx + dy * dy; if(dd < m) m = dd; }
    m = Math.sqrt(m); es[p[2]] += m; ec[p[2]]++; return m;
  });
  let worst = 0; for(let j = 0; j < n; j++) if(ec[j]) worst = Math.max(worst, es[j] / ec[j]);   // เส้นขอบที่ไม่มีเส้นวาดถึงมากที่สุด (ขาดเส้นไหนไปเส้นหนึ่งก็ไม่ใช่)
  return Math.max((wbPq(d1, .9) + wbPq(d2, .85)) / (2 * S), .9 * worst / S);
}
function wbShPlace(bb, Eb){         // ย่อ/ขยาย + เลื่อนรูปให้ขนาดและกึ่งกลางตรงกับที่วาด
  const k = ((bb[2] - bb[0]) + (bb[3] - bb[1])) / (((Eb[2] - Eb[0]) + (Eb[3] - Eb[1])) || 1);
  return { k, tx:(bb[0] + bb[2]) / 2 - k * (Eb[0] + Eb[2]) / 2, ty:(bb[1] + bb[3]) / 2 - k * (Eb[1] + Eb[3]) / 2 };
}
function wbShEval(D, S, p){
  const c = { t:"prism", n:p.n, a:1, h:p.r, rx:p.rx, ry:p.ry, L:100, x:0, y:0, u:0, net:0 }, E = wbShSets(c);
  const ev = V => {          // V = เส้นที่มองเห็น หรือ เส้นทั้งหมด (ถ้าวาดเส้นหลังด้วย)
    let l = 0; V.segs.forEach(s => { l += Math.hypot(s[2] - s[0], s[3] - s[1]); });
    const q = (D.len || 0) / ((l * p.k) || 1);       // หมึกที่วาด ต่อ ความยาวขอบของรูป: มากเกิน (เช่น ตาราง) หรือน้อยเกิน = ไม่ใช่รูปนี้
    return wbShErr(D, S, V, p.k, p.tx, p.ty) + (q < .7 || q > 1.45 ? .1 : 0);
  };
  return { err:Math.min(ev(E.vis), ev(E.all)) + (E.three ? 0 : .1), E };
}
function wbShRefine(D, S, p){       // ขยับมุมมอง/สัดส่วน/ขนาด/ตำแหน่งทีละนิด เอาที่ใกล้ขึ้น
  let best = Object.assign({}, p), be = wbShEval(D, S, best).err;
  const st = { k:.06, t:.03 * S, rx:.12, ry:.14, r:.18 };
  for(let round = 0; round < 4; round++){
    for(const key of ["k", "tx", "ty", "rx", "ry", "r"]){
      for(const sg of [1, -1]){
        const q = Object.assign({}, best), s = st[key === "tx" || key === "ty" ? "t" : key];
        if(key === "k") q.k = best.k * (1 + sg * s);
        else if(key === "r") q.r = Math.max(.35, Math.min(3.5, best.r * (1 + sg * s)));
        else if(key === "rx"){ const m = Math.abs(best.rx) + sg * s; q.rx = Math.sign(best.rx) * Math.max(.25, Math.min(1.3, m)); }
        else q[key] = best[key] + sg * s;
        const e = wbShEval(D, S, q).err;
        if(e < be){ be = e; best = q; break; }
      }
    }
    for(const key in st) st[key] *= .5;
  }
  best.err = be; return best;
}
function wbShFit(G){        // เทียบทุกฐาน 3–8 เหลี่ยม จากหลายมุมมอง → { ok, why, best, ... }
  const pt = wbShPts(G), D = pt.D, bb = pt.b, dw = bb[2] - bb[0], dh = bb[3] - bb[1];
  if(pt.len < 110 || Math.min(dw, dh) < 36 || D.length < 12) return { ok:false, why:"small" };
  const S = (dw + dh) / 2, asp = dw / dh, Dh = D.filter((_, i) => i % 2 === 0), cls = [];
  D.len = Dh.len = pt.len;
  for(let n = 3; n <= 8; n++){
    const rs = n === 4 ? [.5, .75, 1, 1.4, 2, 3] : [.6, 1, 1.7, 2.8], per = 2 * Math.PI / n;
    let top = null;
    for(const r of rs) for(const rx of [-.95, -.6, -.35, .35, .6, .95]) for(let i = 0; i < 6; i++){
      const ry = i * per / 6 + .1;
      const c = { t:"prism", n, a:1, h:r, rx, ry, L:100, x:0, y:0, u:0, net:0 }, g = wbGeo(c), cw = g.b[2] - g.b[0], ch = g.b[3] - g.b[1];
      const q = (cw / ch) / asp; if(q < .7 || q > 1.45) continue;           // สัดส่วนกรอบต่างจากที่วาดมากเกิน → ข้าม
      const p = Object.assign({ n, r, rx, ry }, wbShPlace(bb, g.b)), e = wbShEval(Dh, S, p).err;
      if(!top || e < top.err){ top = p; top.err = e; }
    }
    if(top) cls.push(top);
  }
  if(!cls.length) return { ok:false, why:"none" };
  cls.sort((a, b) => a.err - b.err);
  const fin = cls.filter(c => c.err <= cls[0].err * 1.7).slice(0, 4).map(c => wbShRefine(D, S, c)).sort((a, b) => a.err - b.err);
  const best = fin[0], sec = fin[1] || null, ratio = sec ? sec.err / Math.max(best.err, 1e-4) : 9;
  const E = wbShEval(D, S, best).E, silE = wbShErr(D, S, E.sil, best.k, best.tx, best.ty);
  const res = { best, sec, ratio, silE, S, D };
  if(best.err > WB_SH_OK) return Object.assign(res, { ok:false, why:"far" });
  if(best.err > silE * WB_SH_3D) return Object.assign(res, { ok:false, why:"flat" });
  if(ratio < WB_SH_WIN) return Object.assign(res, { ok:false, why:"unsure" });
  return Object.assign(res, { ok:true });
}

function wbShName(b){ return b.n === 4 && b.r > .82 && b.r < 1.22 ? "ลูกบาศก์" : "ปริซึม" + WB_PR_NAMES[b.n]; }
function wbShMake(r, G){     // สร้างรูป 3D ตามตำแหน่ง/มุมมอง/ขนาดที่เทียบได้ (ถ้าเป็นฐานสี่เหลี่ยมจัตุรัสสูงเท่าด้าน = ลูกบาศก์)
  const b = r.best; let w = 2; G.forEach(s => { w = Math.max(w, Math.min(8, s.s || 4)); });
  const base = { id:Date.now().toString(36) + Math.random().toString(36).slice(2, 6), x:+b.tx.toFixed(1), y:+b.ty.toFixed(1), L:+(100 * b.k).toFixed(1),
                 rx:+b.rx.toFixed(3), ry:+b.ry.toFixed(3), u:0, net:0, c:G[0].c, w };
  if(b.n === 4 && b.r > .82 && b.r < 1.22){
    const cube = Object.assign({ t:"cube" }, base), E = wbShSets(Object.assign({}, cube, { x:0, y:0, L:100 }));
    const e = Math.min(wbShErr(r.D, r.S, E.vis, b.k, b.tx, b.ty), wbShErr(r.D, r.S, E.all, b.k, b.tx, b.ty));
    if(e <= Math.max(b.err * 1.25, b.err + .01)) return cube;      // ลูกบาศก์ตัวจริงต้องเข้ากับเส้นที่วาดพอๆ กับที่เทียบไว้
  }
  return Object.assign({ t:"prism", n:b.n, a:WB.pr.a, h:+(WB.pr.a * b.r).toFixed(1), m:!!WB.pr.m }, base);
}
function wbShConf(r){        // ความมั่นใจ: ยิ่งเส้นตรงกับรูป และยิ่งชนะรูปอื่นขาด ยิ่งสูง
  const fit = 1 - r.best.err / (WB_SH_OK * 2), sep = Math.min(1, .6 + .4 * (r.ratio - WB_SH_WIN) / .5);
  return Math.max(1, Math.min(99, Math.round(100 * Math.min(fit, sep))));
}

function wbShGroup(){        // เก็บเส้นล่าสุดทั้งกลุ่ม: เส้นปากกาติดกันท้ายกระดาน ห่างกันไม่เกิน WB_SH_GAP และอยู่ใกล้กันบนจอ
  const S = WB.strokes, G = []; let bx = null;
  for(let i = S.length - 1; i >= 0 && G.length < WB_SH_MAX; i--){
    const s = S[i]; if(s.t !== "pen" || !s.ts || !s.te) break;
    if(G.length && G[G.length - 1].ts - s.te > WB_SH_GAP) break;
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    for(const q of s.p){ if(q[0] < a) a = q[0]; if(q[0] > c) c = q[0]; if(q[1] < b) b = q[1]; if(q[1] > d) d = q[1]; }
    const mg = bx ? Math.max(80, .6 * Math.max(bx[2] - bx[0], bx[3] - bx[1])) : 0;      // วาดข้ามไปมาได้ แต่ต้องอยู่ในย่านเดียวกับรูป (ห่างจากกรอบรูปไม่เกิน ~60% ของขนาด)
    if(bx && (c < bx[0] - mg || a > bx[2] + mg || d < bx[1] - mg || b > bx[3] + mg)) break;
    bx = bx ? [Math.min(bx[0], a), Math.min(bx[1], b), Math.max(bx[2], c), Math.max(bx[3], d)] : [a, b, c, d];
    G.push(s);
  }
  return G.reverse();
}
function wbShScan(){
  WB.shT = 0;
  if(!WB.cubeAuto || !WB.w || WB.cur || WB.an) return;
  const G = wbShGroup(); if(G.length < 2) return;
  const r = wbShFit(G);
  if(!r.ok){
    if(r.why === "unsure" && r.sec) say("เส้นที่วาดคล้ายทั้ง" + wbShName(r.best) + "และ" + wbShName(r.sec) + " — ไม่แน่ใจ เลยปล่อยเป็นเส้นเดิมไว้ก่อน (กด 🔺 เพิ่มปริซึม แล้วเลือกฐานเองได้)");
    return;
  }
  const st = wbShMake(r, G), gone = new Set(G), name = wbShName(r.best);
  wbPush(); WB.strokes = WB.strokes.filter(s => !gone.has(s)); WB.strokes.push(st);
  WB.selId = st.id; WB.tool = "ob";
  wbSync(); wbRender();
  say((st.t === "cube" ? "🧊 " : "🔺 ") + "เทียบแล้วเป็น" + name + " (มั่นใจ ~" + wbShConf(r) + "%) — แทนที่เส้นที่วาดเป็นรูป 3D แล้ว · ลากที่ตัวรูปเพื่อหมุน · กด 📖 เพื่อคลี่ · ↩️ ย้อนกลับเป็นเส้นที่วาดได้");
}

/* ---------- ปุ่มต่างๆ ---------- */
function wbBtns(){
  if(el.fold){ const hc = !!wbSel(); el.fold.disabled = el.net.disabled = !hc; }
  if(el.prA) wbPrSync();
  el.undo.disabled = !(WB.hist.length || WB.strokes.length);
  el.redo.disabled = !WB.future.length;
}
function wbPush(){ WB.hist.push(WB.strokes.slice()); if(WB.hist.length > 150) WB.hist.shift(); WB.future = []; }
function wbRender(){ wbRedrawBase(); wbShow(); wbBtns(); wbSave(); }
function wbUndo(){
  if(WB.cur) return;
  clearTimeout(WB.shT); WB.shT = 0;
  wbAnimStop(true);
  if(WB.hist.length){ WB.future.push(WB.strokes); WB.strokes = WB.hist.pop(); }
  else if(WB.strokes.length){ WB.future.push(WB.strokes); WB.strokes = WB.strokes.slice(0, -1); }
  else return;
  wbRender();
}
function wbRedo(){
  if(WB.cur) return;
  clearTimeout(WB.shT); WB.shT = 0;
  wbAnimStop(true);
  if(!WB.future.length) return;
  WB.hist.push(WB.strokes); WB.strokes = WB.future.pop(); wbRender();
}
function wbClear(){
  if(WB.cur) return;
  clearTimeout(WB.shT); WB.shT = 0;
  wbAnimStop(true);
  if(!WB.strokes.length){ say("กระดานว่างอยู่แล้วครับ"); return; }
  wbPush(); WB.strokes = []; wbRender();
  say("ล้างกระดานแล้ว — กด ↩️ เพื่อกู้คืน");
}
function wbExport(){
  if(!WB.w) return;
  const d = WB.d, c = document.createElement("canvas"); c.width = Math.round(WB.w * d); c.height = Math.round(WB.h * d);
  const x = c.getContext("2d");
  x.setTransform(d, 0, 0, d, 0, 0); wbPaper(x, WB.w, WB.h, WB.bg);
  x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(WB.base, 0, 0);
  { const sp = wbSel(); if(sp && sp.t === "prism" && sp.m){ x.setTransform(d, 0, 0, d, 0, 0); wbPrismCard(x, sp); x.setTransform(1, 0, 0, 1, 0, 0); } }
  const t = new Date(), z = n => String(n).padStart(2, "0");
  const name = `board-${t.getFullYear()}${z(t.getMonth()+1)}${z(t.getDate())}-${z(t.getHours())}${z(t.getMinutes())}.png`;
  c.toBlob(b => {
    if(!b){ say("บันทึกรูปไม่สำเร็จ"); return; }
    const url = URL.createObjectURL(b), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    say("บันทึกรูปกระดานแล้ว");
  }, "image/png");
}
function wbFabSync(){
  const noInk = WB.tool === "er" || WB.tool === "eo";
  el.fabIco.textContent = WB.open ? "✕" : WB_ICO[WB.tool];
  el.fabDot.style.display = noInk ? "none" : "block";
  el.fabDot.style.background = WB.color;
}
function wbPlacePanel(){
  const f = el.fab.getBoundingClientRect(), p = el.panel, vw = innerWidth, vh = innerHeight;
  const pw = p.offsetWidth, ph = p.offsetHeight;
  const left = Math.max(8, Math.min(f.left, vw - pw - 8));
  let top = f.bottom + 10;
  if(top + ph > vh - 8) top = f.top - ph - 10;
  if(top < 8) top = 8;
  p.style.left = left + "px"; p.style.top = top + "px";
  p.style.transformOrigin = (f.left + f.width / 2 - left) + "px " + (f.top + f.height / 2 - top) + "px";
}
function wbPanel(on){
  WB.open = on; el.panel.classList.toggle("open", on);
  if(on) wbPlacePanel();
  wbFabSync();
}
function wbClampFab(){
  const f = el.fab; if(!f.style.left) return;
  const r = f.getBoundingClientRect();
  f.style.left = Math.max(4, Math.min(r.left, innerWidth - r.width - 4)) + "px";
  f.style.top = Math.max(4, Math.min(r.top, innerHeight - r.height - 4)) + "px";
}
function wbFull(on){
  if(on === WB.full) return;
  WB.full = on;
  if(!on && (document.fullscreenElement || document.webkitFullscreenElement)){
    WB.fsReq = false;
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    try{ const pr = ex.call(document); if(pr && pr.catch) pr.catch(() => {}); }catch(_){}
  }
  if(on){
    WB.ph = document.createComment("wb"); WB.root.parentNode.insertBefore(WB.ph, WB.root); document.body.appendChild(WB.root);
  }else if(WB.ph && WB.ph.parentNode){
    WB.ph.parentNode.insertBefore(WB.root, WB.ph); WB.ph.remove(); WB.ph = null;
  }
  WB.root.classList.toggle("full", on);
  document.documentElement.classList.toggle("wb-lock", on);
  WB.open = false; el.panel.classList.remove("open");
  el.panel.style.left = el.panel.style.top = "";
  el.full.innerHTML = on ? "✕<span>ออก</span>" : "⛶<span>เต็มจอ</span>";
  if(on){
    const rq = WB.root.requestFullscreen || WB.root.webkitRequestFullscreen;   // ไอแพด/คอมที่รองรับ → ซ่อนแถบเบราว์เซอร์ด้วย (ไม่รองรับก็ใช้แบบเต็มหน้าเว็บ)
    if(rq){
      try{
        const pr = rq.call(WB.root, { navigationUI:"hide" });
        if(pr && pr.then) pr.then(() => { WB.fsReq = true; }).catch(() => {}); else WB.fsReq = true;
      }catch(_){}
    }
  }
  wbFabSync();
  requestAnimationFrame(wbSize);
}
function wbPrev(){
  const i = el.pv, er = WB.tool === "er", hl = WB.tool === "hl";
  const w = er ? WB.size * 4 + 8 : hl ? WB.size * 3 + 8 : WB.size;
  const d = Math.min(32, Math.max(3, w));
  i.style.width = i.style.height = d + "px";
  i.style.background = er ? "transparent" : WB.color;
  i.style.opacity = hl ? ".45" : "1";
  i.style.border = er ? "2px dashed #99a3bd" : (WB.color === "#FFFFFF" ? "1px solid #C9D1E6" : "none");
}
function wbSync(){
  el.tools.forEach(b => b.classList.toggle("on", b.dataset.tool === WB.tool));
  el.sws.forEach(b => b.classList.toggle("on", b.dataset.c === WB.color));
  el.bgs.forEach(b => b.classList.toggle("on", b.dataset.bg === WB.bg));
  el.modes.forEach(b => b.classList.toggle("on", b.dataset.mode === WB.mode));
  el.size.value = WB.size; el.snap.classList.toggle("on", WB.snap); el.cauto.classList.toggle("on", WB.cubeAuto);
  wbPrev(); wbStatus(); wbBtns(); wbFabSync();
}

registerTool({
  id:"board", icon:"🖊️", color:"c-purple", title:"กระดาน", desc:"เขียนทดเล่นได้ · มีโหมดปิดนิ้ววาด ใช้ Apple Pencil ได้ · วาดลูกบาศก์/ปริซึมแบบไหนก็ได้ ระบบเทียบรูปทรงแล้วเปลี่ยนเป็น 3D ให้ หมุน/คลี่ได้ · มีปริซึม พร้อมวัดขนาดและคำนวณพื้นที่ผิว/ปริมาตร",
  html:`
    <div class="wb-root" id="wbRoot">
      <div class="wb-panel" id="wbPanel">
      <div class="wb-bar">
        <div class="wb-grp">
          <button type="button" class="wb-b" data-tool="pen" aria-label="ปากกา">✏️<span>ปากกา</span></button>
          <button type="button" class="wb-b" data-tool="hl" aria-label="ไฮไลต์">🖍️<span>ไฮไลต์</span></button>
          <button type="button" class="wb-b" data-tool="er" aria-label="ยางลบ">🧽<span>ยางลบ</span></button>
          <button type="button" class="wb-b" data-tool="eo" aria-label="ลบวัตถุ (ลบทั้งเส้น)">🧹<span>ลบวัตถุ</span></button>
        </div>
        <div class="wb-grp" id="wbColors" role="group" aria-label="สี"></div>
        <div class="wb-grp wb-size">
          <input type="range" id="wbSize" min="1" max="20" step="1" value="4" aria-label="ขนาดเส้น">
          <span class="wb-pv"><i id="wbPv"></i></span>
        </div>
        <div class="wb-grp">
          <button type="button" class="wb-b" id="wbUndo" aria-label="ย้อนกลับ">↩️</button>
          <button type="button" class="wb-b" id="wbRedo" aria-label="ทำซ้ำ">↪️</button>
          <button type="button" class="wb-b" id="wbClear" aria-label="ล้างกระดาน">🗑️<span>ล้าง</span></button>
        </div>
        <div class="wb-grp">
          <button type="button" class="wb-b" id="wbSave" aria-label="บันทึกเป็นรูป">⬇️<span>บันทึกรูป</span></button>
          <button type="button" class="wb-b" id="wbFull" aria-label="เต็มจอ">⛶<span>เต็มจอ</span></button>
        </div>
      </div>
      <div class="wb-bar">
        <div class="wb-grp" id="wbBgs"><span class="wb-lab">พื้นหลัง</span></div>
        <div class="wb-grp" id="wbModes"><span class="wb-lab">การวาด</span></div>
        <div class="wb-grp"><button type="button" class="wb-b" id="wbSnap" title="ลากเส้นแล้วหยุดปากกาค้างไว้ — เส้นจะตรง หรือวงกลม สี่เหลี่ยม สามเหลี่ยม หกเหลี่ยมจะเป็นรูปทรงให้เอง">✨ หยุดค้างเพื่อจัดรูป</button></div>
      </div>
      <div class="wb-bar">
        <div class="wb-grp"><span class="wb-lab">รูปทรง 3D</span>
          <button type="button" class="wb-b" id="wbCubeAdd" title="เพิ่มลูกบาศก์ลงกระดาน">🧊<span>เพิ่มลูกบาศก์</span></button>
          <button type="button" class="wb-b" data-tool="ob" title="ลากที่ตัวรูปทรงเพื่อหมุน · จับปุ่ม ✥ เพื่อย้าย · จับปุ่ม ⤢ เพื่อย่อ/ขยาย · ลากที่ว่างเพื่อวาดปกติ">🖐️<span>หมุน/ย้าย 3D</span></button>
          <button type="button" class="wb-b" id="wbCubeFold" title="คลี่รูปทรง 3D ออกเป็นรูปคลี่ / พับกลับ">📖<span>คลี่ / พับ</span></button>
          <button type="button" class="wb-b" id="wbCubeNet" title="เปลี่ยนแบบการคลี่">🔀<span>แบบการคลี่</span></button>
        </div>
        <div class="wb-grp"><button type="button" class="wb-b" id="wbCubeAuto" title="วาดเส้นขอบลูกบาศก์หรือปริซึม 3–8 เหลี่ยมแบบไหนก็ได้ แล้วหยุดสักครู่ → ระบบเทียบรูปทรง ถ้าใกล้พอจะแทนที่เส้นด้วยรูป 3D (ไม่แน่ใจ = ปล่อยเป็นเส้นเดิม · ↩️ ย้อนกลับได้)">🧊 เทียบรูปทรง 3D จากเส้นที่วาด</button></div>
      </div>
      <div class="wb-bar" id="wbPrBar">
        <div class="wb-grp"><span class="wb-lab">ปริซึม</span>
          <button type="button" class="wb-b" id="wbPrAdd" title="เพิ่มปริซึมลงกระดาน (ฐานตามจำนวนเหลี่ยมที่เลือก)">🔺<span>เพิ่มปริซึม</span></button>
        </div>
        <div class="wb-grp" id="wbPrN" role="group" aria-label="จำนวนเหลี่ยมของฐาน"><span class="wb-lab">ฐานกี่เหลี่ยม</span></div>
        <div class="wb-grp">
          <label class="wb-lab" for="wbPrA">ด้านฐาน</label><input type="number" class="wb-num" id="wbPrA" inputmode="decimal" min="0.1" max="9999" step="0.5" value="4"><span class="wb-lab">ซม.</span>
          <label class="wb-lab" for="wbPrH">สูง</label><input type="number" class="wb-num" id="wbPrH" inputmode="decimal" min="0.1" max="9999" step="0.5" value="6"><span class="wb-lab">ซม.</span>
        </div>
        <div class="wb-grp"><button type="button" class="wb-b" id="wbPrM" title="แสดงความยาวบนปริซึม พร้อมสูตรและผลคำนวณพื้นที่ผิว/ปริมาตร">📏<span>แสดงขนาด+คำนวณ</span></button></div>
      </div>
      <div class="wb-stat" id="wbStat" role="status"></div>
      </div>
      <div class="wb-stage" id="wbStage">
        <canvas id="wbBgc"></canvas>
        <canvas id="wbDcv" class="wb-top"></canvas>
      </div>
      <button type="button" class="wb-fab" id="wbFab" aria-label="เครื่องมือ"><span id="wbFabIco">✏️</span><i id="wbFabDot"></i></button>
    </div>`,
  init(v){
    const q = s => $(s, v), qa = s => Array.from(v.querySelectorAll(s));
    WB.root = q("#wbRoot"); WB.stage = q("#wbStage"); WB.bgc = q("#wbBgc"); WB.dcv = q("#wbDcv");
    WB.bgx = WB.bgc.getContext("2d"); WB.dx = WB.dcv.getContext("2d");
    WB.base = document.createElement("canvas"); WB.bx = WB.base.getContext("2d");
    wbLoad();

    const colors = q("#wbColors");
    WB_COLORS.forEach(c => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "wb-sw"; b.dataset.c = c; b.style.background = c; b.setAttribute("aria-label", "สี " + c);
      colors.appendChild(b);
    });
    WB_BGS.forEach(([k, n]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "wb-b"; b.dataset.bg = k; b.textContent = n; q("#wbBgs").appendChild(b);
    });
    WB_MODES.forEach(([k, n]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "wb-b"; b.dataset.mode = k; b.textContent = n; q("#wbModes").appendChild(b);
    });
    el.tools = qa("[data-tool]"); el.sws = qa(".wb-sw"); el.bgs = qa("[data-bg]"); el.modes = qa("[data-mode]");
    el.size = q("#wbSize"); el.pv = q("#wbPv"); el.stat = q("#wbStat");
    el.snap = q("#wbSnap"); el.fold = q("#wbCubeFold"); el.net = q("#wbCubeNet"); el.cauto = q("#wbCubeAuto");
    el.undo = q("#wbUndo"); el.redo = q("#wbRedo"); el.full = q("#wbFull");
    el.prA = q("#wbPrA"); el.prH = q("#wbPrH"); el.prM = q("#wbPrM"); el.prNs = [];
    for(let n = 3; n <= 8; n++){
      const b = document.createElement("button");
      b.type = "button"; b.className = "wb-b"; b.dataset.pn = n; b.textContent = n; b.title = "ปริซึม" + WB_PR_NAMES[n]; b.setAttribute("aria-label", "ฐาน" + WB_PR_NAMES[n]);
      q("#wbPrN").appendChild(b); el.prNs.push(b);
      b.addEventListener("click", () => wbPrEdit({ n }));
    }
    q("#wbPrAdd").addEventListener("click", wbAddPrism);
    el.prA.addEventListener("input", () => { const v = parseFloat(el.prA.value); if(v > 0 && v <= 9999) wbPrEdit({ a:v }, true); });
    el.prH.addEventListener("input", () => { const v = parseFloat(el.prH.value); if(v > 0 && v <= 9999) wbPrEdit({ h:v }, true); });
    el.prM.addEventListener("click", () => { const s = wbSel(), cur = s && s.t === "prism" ? !!s.m : !!WB.pr.m; wbPrEdit({ m:!cur }); });

    el.tools.forEach(b => b.addEventListener("click", () => { WB.tool = b.dataset.tool; wbSync(); wbSave(); if(WB.w && !WB.cur) wbShow();
      if(WB.tool === "ob") say(wbSel() ? "ลากที่ตัวรูปทรงเพื่อหมุน · ปุ่ม ✥ ย้าย · ปุ่ม ⤢ ย่อ/ขยาย · ลากที่ว่างเพื่อวาดปกติ" : "ยังไม่มีรูปทรง 3D — กด 🧊 เพิ่มลูกบาศก์ / 🔺 เพิ่มปริซึม หรือวาดเส้นขอบรูปทรงแล้วหยุดสักครู่ ให้ระบบเทียบรูปให้"); }));
    q("#wbCubeAdd").addEventListener("click", wbAddCube);
    el.fold.addEventListener("click", wbFold);
    el.net.addEventListener("click", wbNetNext);
    el.cauto.addEventListener("click", () => { WB.cubeAuto = !WB.cubeAuto; wbSync(); wbSave(); say(WB.cubeAuto ? "เปิดเทียบรูปทรง 3D — วาดเส้นขอบลูกบาศก์/ปริซึมแล้วหยุดสักครู่" : "ปิดเทียบรูปทรง 3D แล้ว"); });
    el.sws.forEach(b => b.addEventListener("click", () => {
      WB.color = b.dataset.c; if(WB.tool === "er") WB.tool = "pen"; wbSync(); wbSave();
    }));
    el.bgs.forEach(b => b.addEventListener("click", () => {
      WB.bg = b.dataset.bg;
      if(WB.bg === "board" && WB.color === WB_COLORS[0]) WB.color = "#FFFFFF";          // กระดานดำ → เปลี่ยนหมึกดำเป็นขาวให้
      else if(WB.bg !== "board" && WB.color === "#FFFFFF") WB.color = WB_COLORS[0];
      if(WB.w){ wbPaper(WB.bgx, WB.w, WB.h, WB.bg); }
      wbSync(); wbSave();
    }));
    el.modes.forEach(b => b.addEventListener("click", () => {
      WB.mode = b.dataset.mode; if(WB.mode === "auto") WB.penSeen = false;
      wbSync(); wbSave();
    }));
    el.snap.addEventListener("click", () => {
      WB.snap = !WB.snap; wbSync(); wbSave();
      say(WB.snap ? "เปิดจัดรูปอัตโนมัติ — วาดแล้วหยุดปากกาค้างไว้ ระบบจะจัดเป็นเส้นตรง/รูปทรงให้" : "ปิดจัดรูปอัตโนมัติแล้ว");
    });
    el.size.addEventListener("input", () => { WB.size = +el.size.value; wbPrev(); wbSave(); });
    el.undo.addEventListener("click", wbUndo);
    el.redo.addEventListener("click", wbRedo);
    q("#wbClear").addEventListener("click", wbClear);
    q("#wbSave").addEventListener("click", wbExport);
    el.full.addEventListener("click", () => wbFull(!WB.full));

    el.fab = q("#wbFab"); el.panel = q("#wbPanel"); el.fabIco = q("#wbFabIco"); el.fabDot = q("#wbFabDot");

    /* ก้อนกลมตอนเต็มจอ: แตะ = เปิด/ยุบแผงเครื่องมือ · ลาก = ย้ายตำแหน่ง */
    let fd = null;
    el.fab.addEventListener("pointerdown", e => {
      const r = el.fab.getBoundingClientRect();
      fd = { id:e.pointerId, sx:e.clientX, sy:e.clientY, ox:r.left, oy:r.top, moved:false };
      try{ el.fab.setPointerCapture(e.pointerId); }catch(_){}
      e.preventDefault();
    });
    el.fab.addEventListener("pointermove", e => {
      if(!fd || e.pointerId !== fd.id) return;
      const dx = e.clientX - fd.sx, dy = e.clientY - fd.sy;
      if(!fd.moved && Math.hypot(dx, dy) > 7) fd.moved = true;
      if(!fd.moved) return;
      el.fab.style.left = Math.max(4, Math.min(fd.ox + dx, innerWidth - 58)) + "px";
      el.fab.style.top = Math.max(4, Math.min(fd.oy + dy, innerHeight - 58)) + "px";
      if(WB.open) wbPlacePanel();
    });
    el.fab.addEventListener("pointerup", e => {
      if(!fd || e.pointerId !== fd.id) return;
      const tap = !fd.moved; fd = null;
      if(tap) wbPanel(!WB.open);
    });
    el.fab.addEventListener("pointercancel", () => { fd = null; });
    el.fab.addEventListener("contextmenu", e => e.preventDefault());

    const fsc = () => {
      if(WB.full && WB.fsReq && !document.fullscreenElement && !document.webkitFullscreenElement){ WB.fsReq = false; wbFull(false); }
    };
    document.addEventListener("fullscreenchange", fsc);
    document.addEventListener("webkitfullscreenchange", fsc);
    addEventListener("resize", () => { if(WB.full){ wbClampFab(); if(WB.open) wbPlacePanel(); } });

    const cv = WB.dcv;
    cv.addEventListener("pointerdown", wbDown);
    cv.addEventListener("pointermove", wbMove);
    cv.addEventListener("pointerup", e => wbUp(e, false));
    cv.addEventListener("pointercancel", e => wbUp(e, true));
    cv.addEventListener("contextmenu", e => e.preventDefault());

    document.addEventListener("keydown", e => {
      if(!WB.stage || !WB.stage.offsetParent) return;
      if(e.key === "Escape" && WB.full){ wbFull(false); return; }
      const t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if(typing && t.type !== "range") return;
      if((e.ctrlKey || e.metaKey) && !e.altKey){
        const k = e.key.toLowerCase();
        if(k === "z" && !e.shiftKey){ e.preventDefault(); wbUndo(); }
        else if(k === "y" || (k === "z" && e.shiftKey)){ e.preventDefault(); wbRedo(); }
      }
    });

    if(window.ResizeObserver){
      new ResizeObserver(() => { if(WB.cur){ WB.pendSize = true; return; } wbSize(); }).observe(WB.stage);
    }else addEventListener("resize", () => { if(WB.cur){ WB.pendSize = true; return; } wbSize(); });

    wbSync();
  },
  onOpen(){ requestAnimationFrame(wbSize); }
});
})();

/* ให้ไฟล์อื่น/เครื่องมือใหม่ในอนาคตเรียกใช้ได้ */
window.KCTools = { registerTool, fireworks, parseExpr };

})();
