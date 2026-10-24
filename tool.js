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
    btn.innerHTML = `<span class="ico">🧰</span><span class="txt"><h3>เครื่องมือครู</h3><p>สุ่มนักเรียน · เซต · ตรรกศาสตร์ · และอื่นๆ</p></span><span class="arrow">›</span>`;
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

/* ให้ไฟล์อื่น/เครื่องมือใหม่ในอนาคตเรียกใช้ได้ */
window.KCTools = { registerTool, fireworks, parseExpr };

})();