/* =====================================================================
   Khosob.js — คลังข้อสอบ (KruChauy)
   โหลดต่อท้าย ScriptKruChauy.js / tool.js (ใช้ apiGet / showView / toast / confirmDialog ของไฟล์หลัก)
   ไฟล์นี้สร้างหน้าจอ + CSS ของตัวเองทั้งหมด

   ข้อมูล: ชีท Khosob  →  ระดับ | วิชา | หมวดหมู่ | ชุดที่ | คำถาม | คำตอบ | ตัวลวง1 | ตัวลวง2 | ตัวลวง3 | คำอธิบาย
   ลำดับหน้า: คลังข้อสอบ (เลือกวิชา) → หมวดหมู่ → ชุดที่ → ทำทีละข้อ → ผลคะแนน
   ผลที่ดีที่สุดของแต่ละชุดจำไว้ในเครื่อง (localStorage) ไม่ส่งขึ้นชีท
   ===================================================================== */
(function(){
"use strict";

/* วาง URL (/exec) ของ Apps Script ตัวใหม่ (AppscriptKhosob.txt) ที่นี่ — ถ้าเว้นว่างจะใช้ apiGet("quiz") ของสคริปต์หลักแทน */
const QUIZ_API_URL = "";


const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const escH = v => String(v ?? "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const say = m => { if(typeof toast==="function") toast(m); };
const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

const LS_BEST = "kc_quiz_best", LS_LEVEL = "kc_quiz_level";
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v==null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

/* ================= ตรรกะล้วน (ไม่แตะ DOM) ================= */
const natCmp = (a, b) => String(a).localeCompare(String(b), "th", { numeric:true });
const uniq = arr => [...new Set(arr)];
const normKey = k => String(k || "").replace(/\s+/g, "");          // "ตัวลวง 3" = "ตัวลวง3"

/* แถวจากชีท → ข้อสอบ · แถวที่ไม่มีคำถาม / คำตอบ / ตัวลวงอย่างน้อย 1 ตัว จะถูกข้าม (นับไว้เตือนครู) */
function parseRows(raw){
  const items = []; let skipped = 0;
  (Array.isArray(raw) ? raw : []).forEach(r=>{
    const o = {};
    Object.keys(r || {}).forEach(k=>{ o[normKey(k)] = r[k]==null ? "" : String(r[k]).trim(); });
    const q = o["คำถาม"], a = o["คำตอบ"];
    const wrong = uniq([o["ตัวลวง1"], o["ตัวลวง2"], o["ตัวลวง3"]].filter(x => x && x !== a));
    if(!q || !a || !wrong.length){ if(q || a) skipped++; return; }
    items.push({
      level: o["ระดับ"] || "ไม่ระบุระดับ", subject: o["วิชา"] || "ไม่ระบุวิชา",
      cat: o["หมวดหมู่"] || "ทั่วไป", set: o["ชุดที่"] || "1",
      q, a, wrong, expl: o["คำอธิบาย"] || ""
    });
  });
  return { items, skipped };
}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1; i>0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/* ข้อสอบ 1 ข้อ → ข้อที่พร้อมทำ (สลับตัวเลือก) */
function makeQuestion(it){
  const opts = shuffle([{ t:it.a, ok:true }, ...it.wrong.map(t => ({ t, ok:false }))]);
  return { q:it.q, a:it.a, expl:it.expl, opts, picked:-1, correct:opts.findIndex(o=>o.ok), ms:0, done:false };
}
const pctOf = (c, n) => n ? Math.round(c / n * 100) : 0;
const gradeColor = p => p > 80 ? "#1E9E6A" : p >= 50 ? "#F59E0B" : "#E5484D";   // >80 เขียว · 50–80 เหลือง · <50 แดง
function gradeMsg(p){
  return p === 100 ? "เต็มร้อย! 🏆" : p > 80 ? "ยอดเยี่ยมมาก 🎉" : p >= 60 ? "ดีมาก 👍" : p >= 40 ? "พยายามอีกนิด 💪" : "ลองทบทวนแล้วทำใหม่นะ 📖";
}
function fmtMs(ms){
  const s = ms / 1000;
  if(s < 60) return s.toFixed(1) + " วิ";
  const m = Math.floor(s / 60), r = Math.round(s - m * 60);
  return m + ":" + String(r === 60 ? 59 : r).padStart(2, "0") + " นาที";
}
const fmtClock = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const LETTERS = ["ก", "ข", "ค", "ง"];
const bestKey = (lv, sj, ct, st) => [lv, sj, ct, st].join("|");

/* ================= CSS ================= */
const CSS = `
.c-slate{--c-bg:#E4E8F2; --c-main:#1E293B; --c-ink:#0F172A; --c-sh:rgba(15,23,42,.65);}
.qz-view{--c-main:#334155; --c-bg:#E4E8F2; --c-ink:#0F172A; --c-sh:rgba(15,23,42,.55); --c-on:#fff; --ok:#1E9E6A; --no:#E5484D;}
.qz-note{font-size:12.5px; color:var(--ink-soft); line-height:1.6; margin:2px 2px 12px;}
.qz-warn{background:#FFF7E6; border:1.5px solid #F7D9A0; color:#8A5A00; border-radius:16px; padding:11px 14px; font-size:13px; line-height:1.55; margin-bottom:12px;}
.qz-state{text-align:center; color:var(--ink-soft); padding:38px 14px; font-size:14px; line-height:1.7;}
.qz-state b{display:block; font-size:34px; margin-bottom:8px;}
#qzRefresh{background:var(--c-bg); color:var(--c-ink); border:1.5px solid var(--c-main); font-weight:700;}
.qz-state .btn{margin-top:14px; width:auto; display:inline-block;}
.qz-spin{width:34px; height:34px; border-radius:50%; border:4px solid var(--c-bg); border-top-color:var(--c-main); margin:0 auto 12px; animation:qzSpin .8s linear infinite;}
@keyframes qzSpin{to{transform:rotate(360deg);}}
.qz-chips{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;}
.qz-chip{padding:8px 14px; border-radius:999px; border:1.5px solid #E1E7F3; background:#fff; font:inherit; font-size:13.5px; font-weight:600; color:var(--ink); cursor:pointer;}
.qz-chip.on{background:var(--c-main); border-color:var(--c-main); color:#fff;}
.qz-crumb{display:flex; flex-wrap:wrap; gap:6px; align-items:center; font-size:12.5px; color:var(--ink-soft); margin:0 2px 12px;}
.qz-crumb b{color:var(--c-ink); font-weight:600;}
.qz-view .menu-item .txt p small{display:block; margin-top:3px; font-size:12px; color:var(--c-ink); font-weight:600;}

/* ---- เลือกชุด ---- */
.qz-sets{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
html.mode-pc .qz-sets{grid-template-columns:repeat(4,1fr);}
.qz-set{position:relative; background:#fff; border:1.5px solid #E1E7F3; border-radius:20px; padding:16px 14px; text-align:left; font:inherit; cursor:pointer; display:flex; flex-direction:column; gap:4px; min-height:112px; transition:transform .15s, border-color .15s; box-shadow:0 12px 24px -22px rgba(27,34,51,.5);}
.qz-set:active{transform:scale(.97);}
.qz-set:hover{border-color:var(--c-main);}
.qz-set h3{font-size:17px;}
.qz-set small{font-size:12.5px; color:var(--ink-soft);}
.qz-set .rg{position:absolute; right:12px; top:12px;}
.qz-set .nb{margin-top:auto; font-size:12px; font-weight:600; color:var(--c-ink);}
.qz-set.done{border-color:rgba(30,158,106,.45); background:linear-gradient(180deg,#fff,#F3FBF7);}

/* ---- วงกลม % ---- */
.qz-ring{display:block;}
.qz-ring .bg{fill:none; stroke:#E9EDF7;}
.qz-ring .fg{fill:none; stroke-linecap:round; transition:stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1);}
.qz-ring-wrap{position:relative; width:230px; height:230px; margin:0 auto;}
.qz-ring-wrap svg{width:100%; height:100%;}
.qz-ring-mid{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;}
.qz-ring-mid b{font-family:'Noto Sans Thai',sans-serif; font-size:72px; font-weight:800; line-height:1; letter-spacing:-2px; font-variant-numeric:tabular-nums; color:var(--ink);}
.qz-ring-mid b i{font-style:normal; font-size:30px; font-weight:700; letter-spacing:0; margin-left:2px;}
.qz-ring-mid span{margin-top:8px; font-size:14px; color:var(--ink-soft); font-weight:600;}
.qz-ring-mid b span{margin:0; font-size:inherit; color:inherit; font-weight:inherit;}

/* ---- ทำข้อสอบ ---- */
.qz-prog{display:flex; align-items:center; gap:10px; margin-bottom:14px;}
.qz-bar{flex:1; height:10px; background:#E9EDF7; border-radius:10px; overflow:hidden;}
.qz-bar i{display:block; height:100%; width:0; background:var(--c-main); border-radius:10px; transition:width .35s ease;}
.qz-no{font-size:13px; font-weight:700; color:var(--ink); white-space:nowrap;}
.qz-time{display:inline-flex; align-items:center; gap:5px; background:var(--c-bg); color:var(--c-ink); font-size:13px; font-weight:700; padding:6px 11px; border-radius:999px; font-variant-numeric:tabular-nums; white-space:nowrap;}
.qz-time.stop{background:#E9EDF7; color:var(--ink-soft);}
.qz-qcard{background:#fff; border-radius:24px; padding:20px 18px; margin-bottom:14px; box-shadow:0 1px 2px rgba(27,34,51,.05), 0 14px 26px -20px rgba(27,34,51,.35);}
.qz-qcard small{display:block; font-size:12px; font-weight:700; color:var(--c-main); margin-bottom:8px; letter-spacing:.3px;}
.qz-q{font-size:17px; line-height:1.7; font-weight:600; color:var(--ink); white-space:pre-wrap; word-break:break-word;}
html.mode-pc .qz-q{font-size:19px;}
.qz-opts{display:flex; flex-direction:column; gap:10px; margin-bottom:14px;}
.qz-opt{display:flex; align-items:flex-start; gap:12px; width:100%; text-align:left; padding:14px; border-radius:18px; border:1.5px solid #E1E7F3; background:#fff; font:inherit; font-size:15.5px; line-height:1.55; color:var(--ink); cursor:pointer; transition:transform .12s, border-color .15s, background .15s, opacity .2s; white-space:pre-wrap; word-break:break-word;}
.qz-opt:active{transform:scale(.985);}
.qz-opt .lt{flex:0 0 30px; height:30px; border-radius:50%; background:#F0F3FA; display:grid; place-items:center; font-weight:700; font-size:14px; color:var(--ink-soft);}
.qz-opt .tx{flex:1; padding-top:3px;}
.qz-opts.locked .qz-opt{pointer-events:none;}
.qz-opt.ok{border-color:var(--ok); background:#E8F7EF;}
.qz-opt.ok .lt{background:var(--ok); color:#fff;}
.qz-opt.no{border-color:var(--no); background:#FDECEC; animation:qzShake .35s;}
.qz-opt.no .lt{background:var(--no); color:#fff;}
.qz-opt.dim{opacity:.5;}
@keyframes qzShake{0%,100%{transform:translateX(0);} 25%{transform:translateX(-5px);} 75%{transform:translateX(5px);}}
.qz-fb{display:none; align-items:center; gap:8px; font-size:14px; font-weight:700; margin:0 2px 10px;}
.qz-fb.show{display:flex;}
.qz-fb.ok{color:var(--ok);} .qz-fb.no{color:var(--no);}
.qz-fb span{margin-left:auto; font-size:12.5px; font-weight:600; color:var(--ink-soft);}
.qz-expl{display:none; border:2px solid var(--ok); background:#EAF8F1; color:#0D5C3A; border-radius:18px; padding:14px 16px; margin-bottom:14px; font-size:14.5px; line-height:1.7; white-space:pre-wrap; word-break:break-word;}
.qz-expl.show{display:block; animation:qzUp .3s ease;}
.qz-expl b{display:block; font-size:13px; margin-bottom:4px; color:#0B7A4B;}
@keyframes qzUp{from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;}}
.qz-foot{position:sticky; bottom:0; margin-top:auto; padding:12px 0 14px; background:linear-gradient(0deg,var(--bg) 70%,rgba(244,246,251,0));}
.qz-foot .btn{background:var(--c-main); color:#fff;}
.qz-foot .btn:disabled{background:#CBD2E3; cursor:default;}

/* ---- ผลคะแนน ---- */
.qz-hero{background:#fff; border-radius:26px; padding:24px 16px 18px; text-align:center; margin-bottom:14px; box-shadow:0 1px 2px rgba(27,34,51,.05), 0 14px 26px -20px rgba(27,34,51,.35);}
.qz-hero h3{font-size:20px; margin:14px 0 2px;}
.qz-hero .sb{font-size:13px; color:var(--ink-soft);}
.qz-stats{display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:16px;}
.qz-stats div{background:#F0F3FA; border-radius:14px; padding:10px 4px;}
.qz-stats b{display:block; font-size:16px; color:var(--ink); font-variant-numeric:tabular-nums;}
.qz-stats span{display:block; font-size:11.5px; color:var(--ink-soft); margin-top:2px;}
.qz-stats .g b{color:var(--ok);} .qz-stats .r b{color:var(--no);}
.qz-best{display:inline-block; margin-top:12px; background:#FFF4D6; color:#8A5A00; font-size:12.5px; font-weight:700; border-radius:999px; padding:5px 12px;}
.qz-h{font-family:'Noto Serif Thai',serif; font-size:15px; margin:18px 2px 8px; color:var(--ink);}
.qz-h{display:flex; align-items:baseline; gap:8px;}
.qz-h small{font-family:'Noto Sans Thai',sans-serif; font-size:12px; font-weight:500; color:var(--ink-soft);}
.qz-tiles{display:grid; grid-template-columns:repeat(auto-fill,minmax(60px,1fr)); gap:8px; margin-bottom:12px;}
.qz-tile{display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; padding:8px 2px 7px; border:0; border-radius:12px; color:#fff; font:inherit; cursor:pointer; box-shadow:0 6px 12px -8px rgba(27,34,51,.45); transition:transform .12s, box-shadow .15s;}
.qz-tile:active{transform:scale(.94);}
.qz-tile b{font-size:15px; font-weight:800; line-height:1.2; font-family:'Noto Sans Thai',sans-serif;}
.qz-tile span{font-size:11.5px; font-weight:700; line-height:1.2; font-variant-numeric:tabular-nums; opacity:.95;}
.qz-tile.ok{background:var(--ok);} .qz-tile.no{background:var(--no);}
.qz-tile.sel{outline:3px solid var(--c-main); outline-offset:2px;}
.qz-detail{background:#fff; border:1.5px solid #E1E7F3; border-radius:16px; padding:12px 14px; margin-bottom:14px; font-size:13.5px; line-height:1.65; color:var(--ink); white-space:pre-wrap; word-break:break-word; animation:qzUp .25s ease;}
.qz-detail[hidden]{display:none;}
.qz-detail.ok{border-color:var(--ok);} .qz-detail.no{border-color:var(--no);}
.qz-detail .qt{font-weight:700; margin-bottom:6px;}
.qz-detail .tm{display:inline-block; margin-bottom:6px; font-size:12px; font-weight:700; color:var(--c-ink); background:var(--c-bg); border-radius:999px; padding:3px 10px; font-variant-numeric:tabular-nums;}
.qz-detail p{margin:0 0 6px;}
.qz-detail .yo{color:var(--no); font-weight:600;}
.qz-detail .ca{color:var(--ok); font-weight:600;}
.qz-detail .ex{margin-top:8px; border:1.5px solid var(--ok); background:#EAF8F1; color:#0D5C3A; border-radius:12px; padding:9px 12px;}
.qz-acts{display:flex; flex-direction:column; gap:10px; margin-bottom:8px;}
.qz-acts .btn{width:100%;}
.qz-acts .btn-main{background:var(--c-main); color:#fff;}

/* ---- โหมดมืด ---- */
html[data-theme="dark"] .qz-view{--c-main:#6C83FA; --c-bg:#252E4B; --c-ink:#C9D3F5; --c-sh:rgba(0,0,0,.55);}
html[data-theme="dark"] .qz-opt.ok{background:#173A2E;} html[data-theme="dark"] .qz-opt.no{background:#43202A;}
html[data-theme="dark"] .qz-best{background:#4A3A12; color:#FBD36B;}
html[data-theme="dark"] .c-slate{--c-bg:#2c3652;--c-ink:#e0e5f1}
html[data-theme="dark"] .qz-view{--c-bg:#2c3652;--c-ink:#e0e5f1}
html[data-theme="dark"] .qz-warn{background:#413316;border:1.5px solid #7f6739;color:#f4d59c}
html[data-theme="dark"] .qz-chip{border:1.5px solid #2d3754;background:#1e2538}
html[data-theme="dark"] .qz-set{background:#1e2538;border:1.5px solid #2d3754;box-shadow:0 12px 24px -22px rgba(0,0,0,0.75)}
html[data-theme="dark"] .qz-set.done{border-color:rgba(33,155,105,0.45);background:linear-gradient(180deg,#1e2538,#1d3228)}
html[data-theme="dark"] .qz-ring .bg{stroke:#29324c}
html[data-theme="dark"] .qz-bar{background:#29324c}
html[data-theme="dark"] .qz-time.stop{background:#29324c}
html[data-theme="dark"] .qz-qcard{background:#1e2538;box-shadow:0 1px 2px rgba(0,0,0,0.12), 0 14px 26px -20px rgba(0,0,0,0.56)}
html[data-theme="dark"] .qz-opt{border:1.5px solid #2d3754;background:#1e2538}
html[data-theme="dark"] .qz-opt .lt{background:#252d45}
html[data-theme="dark"] .qz-opt.ok{background:#213a2d}
html[data-theme="dark"] .qz-opt.no{background:#3c1717}
html[data-theme="dark"] .qz-expl{background:#20392c;color:#bceed9}
html[data-theme="dark"] .qz-expl b{color:#a6edcf}
html[data-theme="dark"] .qz-foot{background:linear-gradient(0deg,var(--bg) 70%,rgba(18,22,36,0))}
html[data-theme="dark"] .qz-foot .btn:disabled{background:#4b5571}
html[data-theme="dark"] .qz-hero{background:#1e2538;box-shadow:0 1px 2px rgba(0,0,0,0.12), 0 14px 26px -20px rgba(0,0,0,0.56)}
html[data-theme="dark"] .qz-stats div{background:#252d45}
html[data-theme="dark"] .qz-best{background:#4a3d19;color:#f4d59c}
html[data-theme="dark"] .qz-tile{box-shadow:0 6px 12px -8px rgba(0,0,0,0.72)}
html[data-theme="dark"] .qz-detail{background:#1e2538;border:1.5px solid #2d3754}
html[data-theme="dark"] .qz-detail .ex{background:#20392c;color:#bceed9}
`;
(function injectCss(){
  if($("#qzCss")) return;
  const st = document.createElement("style"); st.id = "qzCss"; st.textContent = CSS;
  document.head.appendChild(st);
})();

/* ================= สร้างหน้าจอ ================= */
const appEl = $("#app");
function makeView(id, { title, sub, icon, back }, bodyHtml){
  const sec = document.createElement("section");
  sec.id = id; sec.className = "view qz-view";
  sec.innerHTML =
    `<div class="topbar">
       <button type="button" class="back-btn" data-qzback="${back}" aria-label="ย้อนกลับ">‹</button>
       <div class="tb-txt"><h2>${escH(title)}</h2><div class="sub">${escH(sub||"")}</div></div>
       <span class="tb-ico">${icon||""}</span>
     </div>` + bodyHtml;
  appEl.insertBefore(sec, $("#toast") || null);
  return sec;
}
const V = {
  subj: makeView("view-quiz-subjects", { title:"คลังข้อสอบ", sub:"เลือกวิชาที่จะฝึกทำ", icon:"📚", back:"view-home" }, `<div id="qzSubjBody"></div>`),
  cats: makeView("view-quiz-cats",     { title:"หมวดหมู่", sub:"", icon:"🗂️", back:"view-quiz-subjects" }, `<div id="qzCatBody"></div>`),
  sets: makeView("view-quiz-sets",     { title:"เลือกชุดข้อสอบ", sub:"", icon:"📝", back:"view-quiz-cats" }, `<div id="qzSetBody"></div>`),
  play: makeView("view-quiz-play",     { title:"ทำข้อสอบ", sub:"", icon:"✍️", back:"view-quiz-sets" }, `<div id="qzPlayBody"></div>`),
  res:  makeView("view-quiz-result",   { title:"ผลคะแนน", sub:"", icon:"🏆", back:"view-quiz-sets" }, `<div id="qzResBody"></div>`)
};
const B = { subj:$("#qzSubjBody"), cats:$("#qzCatBody"), sets:$("#qzSetBody"), play:$("#qzPlayBody"), res:$("#qzResBody") };
const setSub = (view, text) => { const s = $(".topbar .sub", view); if(s) s.textContent = text || ""; };

/* ================= สถานะ ================= */
const Q = { items:null, skipped:0, loading:false, err:"", level:"", subject:"", cat:"", set:"", run:null };
const T = { id:0, last:0 };

const inLevel = () => Q.items.filter(r => r.level === Q.level);
const levelsList = () => uniq(Q.items.map(r => r.level));
const bests = () => store.get(LS_BEST, {});
const THEMES = [["c-blue","📘"], ["c-green","📗"], ["c-yellow","📙"], ["c-purple","📕"], ["c-rose","📒"], ["c-teal","📓"]];
const emptyHint = `ยังไม่มีข้อสอบ — เพิ่มข้อมูลที่ชีท <b>Khosob</b> (ระดับ | วิชา | หมวดหมู่ | ชุดที่ | คำถาม | คำตอบ | ตัวลวง1-3 | คำอธิบาย) แล้วกดรีเฟรช`;

/* ================= โหลดข้อมูล ================= */
async function loadQuiz(){
  Q.loading = true; Q.err = "";
  if(!Q.items) renderSubjects();                       // ยังไม่มีข้อมูลเลย → แสดงตัวหมุนระหว่างรอ
  try{
    let data;
    if(QUIZ_API_URL){
      const r = await fetch(QUIZ_API_URL, { cache: "no-store" });
      data = JSON.parse(await r.text());
    }else{
      data = await apiGet("quiz");
    }
    if(!Array.isArray(data)){
      Q.err = (data && data.message && /ประเภทข้อมูล/.test(data.message))
        ? "Apps Script ที่เชื่อมอยู่ยังเป็นเวอร์ชันเก่า (ยังไม่มีคลังข้อสอบ) — Deploy โค้ดล่าสุดก่อน แล้วลองใหม่"
        : String((data && data.message) || "อ่านชีท Khosob ไม่ได้");
    }else{
      const p = parseRows(data);
      Q.items = p.items; Q.skipped = p.skipped;
      if(!levelsList().includes(Q.level)) Q.level = (levelsList().includes(store.get(LS_LEVEL, "")) ? store.get(LS_LEVEL, "") : levelsList()[0]) || "";
    }
  }catch(err){
    Q.err = "โหลดข้อสอบไม่สำเร็จ — ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่";
  }
  Q.loading = false;
  if(V.subj.classList.contains("active")) renderSubjects();
}

/* ================= 1) เลือกวิชา ================= */
function renderSubjects(){
  const el = B.subj;
  if(Q.loading && !Q.items){ el.innerHTML = `<div class="qz-state"><div class="qz-spin"></div>กำลังโหลดคลังข้อสอบ…</div>`; return; }
  if(Q.err && !Q.items){
    el.innerHTML = `<div class="qz-state"><b>⚠️</b>${escH(Q.err)}<br><button type="button" class="btn btn-primary" id="qzRetry">ลองใหม่</button></div>`;
    $("#qzRetry", el).addEventListener("click", loadQuiz); return;
  }
  if(!Q.items || !Q.items.length){
    el.innerHTML = `<div class="qz-state"><b>📭</b>${emptyHint}<br><button type="button" class="btn btn-primary" id="qzRetry">↻ รีเฟรช</button></div>`;
    $("#qzRetry", el).addEventListener("click", loadQuiz); return;
  }
  const lvs = levelsList(), rows = inLevel();
  const subs = uniq(rows.map(r => r.subject));
  let h = "";
  if(Q.err) h += `<div class="qz-warn">${escH(Q.err)}</div>`;
  if(Q.skipped) h += `<div class="qz-warn">มี ${Q.skipped} แถวในชีทที่ข้อมูลไม่ครบ (ต้องมีคำถาม คำตอบ และตัวลวงอย่างน้อย 1 ช่อง) จึงยังไม่แสดง</div>`;
  if(lvs.length > 1) h += `<div class="qz-chips">${lvs.map(l=>`<button type="button" class="qz-chip${l===Q.level?" on":""}" data-lv="${escH(l)}">${escH(l)}</button>`).join("")}</div>`;
  else h += `<div class="qz-note">ระดับ: <b>${escH(Q.level)}</b> · ${rows.length} ข้อ</div>`;
  h += `<div class="menu">` + subs.map((s, i)=>{
    const rs = rows.filter(r => r.subject === s), cats = uniq(rs.map(r => r.cat)).length;
    const th = THEMES[i % THEMES.length];
    return `<button type="button" class="menu-item ${th[0]}" data-sj="${escH(s)}" style="--i:${i}">
      <span class="ico">${th[1]}</span>
      <span class="txt"><h3>${escH(s)}</h3><p>${cats} หมวดหมู่ · ${rs.length} ข้อ</p></span><span class="arrow">›</span></button>`;
  }).join("") + `</div>
  <div style="text-align:center; margin-top:16px;"><button type="button" class="btn btn-sm" id="qzRefresh">↻ รีเฟรชข้อสอบจากชีท</button></div>`;
  el.innerHTML = h;
  $$("[data-lv]", el).forEach(b => b.addEventListener("click", ()=>{ Q.level = b.dataset.lv; store.set(LS_LEVEL, Q.level); renderSubjects(); }));
  $$("[data-sj]", el).forEach(b => b.addEventListener("click", ()=>{ Q.subject = b.dataset.sj; renderCats(); showView("view-quiz-cats"); }));
  $("#qzRefresh", el).addEventListener("click", async ()=>{ say("กำลังโหลดข้อสอบใหม่…"); await loadQuiz(); if(!Q.err) say("อัปเดตข้อสอบแล้ว"); });
  setSub(V.subj, `ระดับ ${Q.level} · เลือกวิชาที่จะฝึกทำ`);
}

/* ================= 2) เลือกหมวดหมู่ ================= */
function renderCats(){
  const rows = inLevel().filter(r => r.subject === Q.subject);
  const cats = uniq(rows.map(r => r.cat)), bs = bests();
  setSub(V.cats, `${Q.level} · ${Q.subject}`);
  B.cats.innerHTML = `<div class="menu">` + cats.map((c, i)=>{
    const rs = rows.filter(r => r.cat === c), sets = uniq(rs.map(r => r.set));
    const done = sets.filter(s => bs[bestKey(Q.level, Q.subject, c, s)]).length;
    const th = THEMES[(i + 2) % THEMES.length];
    return `<button type="button" class="menu-item ${th[0]}" data-ct="${escH(c)}" style="--i:${i}">
      <span class="ico">🗂️</span>
      <span class="txt"><h3>${escH(c)}</h3><p>${sets.length} ชุด · ${rs.length} ข้อ<small>${done ? `ทำแล้ว ${done}/${sets.length} ชุด` : "ยังไม่เคยทำ"}</small></p></span><span class="arrow">›</span></button>`;
  }).join("") + `</div>`;
  $$("[data-ct]", B.cats).forEach(b => b.addEventListener("click", ()=>{ Q.cat = b.dataset.ct; renderSets(); showView("view-quiz-sets"); }));
}

/* ================= 3) เลือกชุด ================= */
function ringSvg(p, size, stroke, animate){
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - p / 100), col = gradeColor(p), mid = size / 2;
  return `<svg class="qz-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle class="bg" cx="${mid}" cy="${mid}" r="${r}" stroke-width="${stroke}"/>
    <circle class="fg" cx="${mid}" cy="${mid}" r="${r}" stroke-width="${stroke}" stroke="${col}" transform="rotate(-90 ${mid} ${mid})"
      stroke-dasharray="${c}" stroke-dashoffset="${animate ? c : off}" ${animate ? `data-off="${off}"` : ""}/></svg>`;
}
function runRing(root){
  const fgs = $$(".fg[data-off]", root);
  if(!fgs.length) return;
  const go = () => fgs.forEach(f => { f.style.strokeDashoffset = f.dataset.off; });
  if(reduceMotion){ fgs.forEach(f => { f.style.transition = "none"; }); go(); } else requestAnimationFrame(()=> requestAnimationFrame(go));
}
function renderSets(){
  const rows = inLevel().filter(r => r.subject === Q.subject && r.cat === Q.cat);
  const sets = uniq(rows.map(r => r.set)).sort(natCmp), bs = bests();
  setSub(V.sets, `${Q.subject} · ${Q.cat}`);
  B.sets.innerHTML = `<div class="qz-note">เลือกชุดที่ต้องการ — ทำทีละข้อ ตอบแล้วเห็นเฉลยและคำอธิบายทันที</div><div class="qz-sets">` + sets.map(s=>{
    const n = rows.filter(r => r.set === s).length, b = bs[bestKey(Q.level, Q.subject, Q.cat, s)];
    return `<button type="button" class="qz-set${b ? " done" : ""}" data-st="${escH(s)}">
      ${b ? `<span class="rg">${ringSvg(b.pct, 44, 6, false)}</span>` : ""}
      <h3>ชุดที่ ${escH(s)}</h3><small>${n} ข้อ</small>
      <span class="nb">${b ? `ดีที่สุด ${b.pct}% (${b.correct}/${b.total})` : "ยังไม่เคยทำ"}</span></button>`;
  }).join("") + `</div>`;
  $$("[data-st]", B.sets).forEach(b => b.addEventListener("click", ()=> startSet(b.dataset.st)));
}

/* ================= 4) ทำข้อสอบทีละข้อ ================= */
function startSet(setNo){
  const rows = inLevel().filter(r => r.subject === Q.subject && r.cat === Q.cat && r.set === setNo);
  if(!rows.length){ say("ไม่พบข้อสอบในชุดนี้"); return; }
  Q.set = setNo;
  startRun(rows, { save:true, label:`ชุดที่ ${setNo}`, full:rows, fullLabel:`ชุดที่ ${setNo}` });
}
function startRun(items, opt){
  Q.run = { qs: items.map(makeQuestion), srcItems: items, full: opt.full || items, fullLabel: opt.fullLabel || opt.label || "", i:0, save: !!opt.save, label: opt.label || "", total: 0 };
  Q.run.total = Q.run.qs.length;
  setSub(V.play, `${Q.subject} · ${Q.cat} · ${Q.run.label}`);
  renderQuestion();
  showView("view-quiz-play");
  window.scrollTo(0, 0);
}
function stopTimer(){ if(T.id){ clearInterval(T.id); T.id = 0; } }
function startTimer(){
  stopTimer(); T.last = Date.now();
  T.id = setInterval(()=>{
    const now = Date.now(), cur = Q.run && Q.run.qs[Q.run.i];
    if(!cur || cur.done || !V.play.classList.contains("active")){ T.last = now; if(!V.play.classList.contains("active")) stopTimer(); return; }
    if(!document.hidden) cur.ms += Math.min(now - T.last, 1000);   // ไม่นับตอนสลับแท็บ / ไม่ให้กระโดดเมื่อกลับมา
    T.last = now;
    const tm = $("#qzTime"); if(tm) tm.textContent = "⏱ " + fmtClock(cur.ms);
  }, 200);
}
function renderQuestion(){
  const R = Q.run, q = R.qs[R.i], n = R.total, last = R.i === n - 1;
  B.play.innerHTML = `
    <div class="qz-prog">
      <span class="qz-no">ข้อ ${R.i + 1}/${n}</span>
      <div class="qz-bar"><i style="width:${(R.i / n) * 100}%"></i></div>
      <span class="qz-time" id="qzTime">⏱ 0:00</span>
    </div>
    <div class="qz-qcard"><small>${escH(R.label)}</small><div class="qz-q">${escH(q.q)}</div></div>
    <div class="qz-opts" id="qzOpts">` + q.opts.map((o, k)=>
      `<button type="button" class="qz-opt" data-k="${k}"><span class="lt">${LETTERS[k]}</span><span class="tx">${escH(o.t)}</span></button>`).join("") + `</div>
    <div class="qz-fb" id="qzFb"></div>
    <div class="qz-expl" id="qzExpl"><b>💡 คำอธิบาย</b>${escH(q.expl)}</div>
    <div class="qz-foot"><button type="button" class="btn" id="qzNext" disabled>${last ? "ดูผลคะแนน" : "ข้อถัดไป ›"}</button></div>`;
  requestAnimationFrame(()=>{ const bar = $(".qz-bar i", B.play); if(bar) bar.style.width = ((R.i + 1) / n * 100) + "%"; });
  $$(".qz-opt", B.play).forEach(b => b.addEventListener("click", ()=> pick(+b.dataset.k)));
  $("#qzNext", B.play).addEventListener("click", ()=>{ if(last) finishRun(); else { R.i++; renderQuestion(); window.scrollTo(0, 0); } });
  startTimer();
}
function pick(k){
  const R = Q.run, q = R.qs[R.i];
  if(q.done) return;
  q.done = true; q.picked = k; stopTimer();
  const okAns = k === q.correct;
  $("#qzOpts", B.play).classList.add("locked");
  $$(".qz-opt", B.play).forEach((b, i)=>{
    if(i === q.correct){ b.classList.add("ok"); b.querySelector(".lt").textContent = "✓"; }
    else if(i === k){ b.classList.add("no"); b.querySelector(".lt").textContent = "✗"; }
    else b.classList.add("dim");
  });
  const tm = $("#qzTime"); if(tm){ tm.classList.add("stop"); tm.textContent = "⏱ " + fmtMs(q.ms); }
  const fb = $("#qzFb");
  fb.className = "qz-fb show " + (okAns ? "ok" : "no");
  fb.innerHTML = (okAns ? "✅ ถูกต้อง!" : "❌ ยังไม่ถูกต้อง — ข้อที่ถูกคือ " + LETTERS[q.correct]) + `<span>ใช้เวลา ${fmtMs(q.ms)}</span>`;
  if(q.expl) $("#qzExpl", B.play).classList.add("show");
  const nx = $("#qzNext", B.play); nx.disabled = false;
  setTimeout(()=>{ const t = q.expl ? $("#qzExpl", B.play) : nx; if(t && t.scrollIntoView) t.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block:"nearest" }); }, 60);
}

/* ================= 5) ผลคะแนน ================= */
function finishRun(){
  stopTimer();
  const R = Q.run, n = R.total, correct = R.qs.filter(q => q.picked === q.correct).length;
  const pct = pctOf(correct, n), totalMs = R.qs.reduce((a, q) => a + q.ms, 0);
  let newBest = false, prev = null;
  if(R.save){
    const bs = bests(), key = bestKey(Q.level, Q.subject, Q.cat, Q.set);
    prev = bs[key] || null;
    if(!prev || pct > prev.pct || (pct === prev.pct && totalMs < prev.ms)){
      bs[key] = { pct, correct, total:n, ms:Math.round(totalMs), at:Date.now() }; store.set(LS_BEST, bs); newBest = !!prev && pct > prev.pct;
    }
  }
  const wrongN = n - correct;
  setSub(V.res, `${Q.subject} · ${Q.cat} · ${R.label}`);
  B.res.innerHTML = `
    <div class="qz-hero">
      <div class="qz-ring-wrap">${ringSvg(pct, 230, 18, true)}
        <div class="qz-ring-mid"><b style="color:${gradeColor(pct)}"><span id="qzPct">0</span><i>%</i></b><span>ได้ ${correct} / ${n} ข้อ</span></div></div>
      <h3>${gradeMsg(pct)}</h3>
      <div class="sb">${escH(R.label)}${R.save ? "" : " · ฝึกเฉพาะข้อที่ผิด (ไม่บันทึกสถิติ)"}</div>
      ${newBest ? `<div class="qz-best">🎖 สถิติใหม่! (เดิม ${prev.pct}%)</div>` : ""}
      <div class="qz-stats">
        <div class="g"><b>${correct}</b><span>ถูก</span></div>
        <div class="r"><b>${wrongN}</b><span>ผิด</span></div>
        <div><b>${fmtMs(totalMs)}</b><span>เวลารวม</span></div>
        <div><b>${fmtMs(n ? totalMs / n : 0)}</b><span>เฉลี่ย/ข้อ</span></div>
      </div>
    </div>
    <div class="qz-h">สรุปรายข้อ <small>แตะที่ช่องเพื่อดูเฉลย</small></div>
    <div class="qz-tiles">` + R.qs.map((q, i)=>{
      const ok = q.picked === q.correct;
      return `<button type="button" class="qz-tile ${ok ? "ok" : "no"}" data-i="${i}" aria-label="ข้อ ${i + 1} ${ok ? "ถูก" : "ผิด"} ใช้เวลา ${fmtMs(q.ms)}"><b>${i + 1}</b><span>${fmtClock(q.ms)}s</span></button>`;
    }).join("") + `</div>
    <div class="qz-detail" id="qzDetail" hidden></div>
    <div class="qz-acts">
      <button type="button" class="btn btn-main" id="qzAgain">${R.save ? "↻ ทำชุดนี้อีกครั้ง" : "↻ ทำทั้งชุดอีกครั้ง"}</button>
      ${wrongN ? `<button type="button" class="btn btn-outline" id="qzWrong">ฝึกเฉพาะข้อที่ผิด (${wrongN} ข้อ)</button>` : ""}
      <button type="button" class="btn btn-outline" id="qzOther">เลือกชุดอื่น</button>
    </div>`;
  showView("view-quiz-result");
  window.scrollTo(0, 0);
  runRing(B.res);
  const pe = $("#qzPct", B.res);
  if(reduceMotion || !pct) pe.textContent = pct;
  else { const t0 = performance.now(), dur = 900; (function step(t){ const f = Math.min(1, (t - t0) / dur); pe.textContent = Math.round(pct * (1 - Math.pow(1 - f, 3))); if(f < 1) requestAnimationFrame(step); })(t0); }
  const det = $("#qzDetail", B.res), tiles = $$(".qz-tile", B.res);
  tiles.forEach(t => t.addEventListener("click", ()=>{
    const i = +t.dataset.i, q = R.qs[i], ok = q.picked === q.correct;
    if(t.classList.contains("sel")){ t.classList.remove("sel"); det.hidden = true; return; }
    tiles.forEach(x => x.classList.remove("sel")); t.classList.add("sel");
    det.className = "qz-detail " + (ok ? "ok" : "no");
    det.innerHTML = `<span class="tm">ข้อ ${i + 1} · ${fmtMs(q.ms)}</span><div class="qt">${escH(q.q)}</div>` +
      (ok || q.picked < 0 ? "" : `<p class="yo">คุณตอบ: ${escH(q.opts[q.picked].t)}</p>`) +
      `<p class="ca">เฉลย: ${escH(q.a)}</p>` + (q.expl ? `<div class="ex">💡 ${escH(q.expl)}</div>` : "");
    det.hidden = false;
    if(det.scrollIntoView) det.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block:"nearest" });
  }));
  $("#qzAgain", B.res).addEventListener("click", ()=> startRun(R.full, { save:true, label:R.fullLabel, full:R.full, fullLabel:R.fullLabel }));
  const wb = $("#qzWrong", B.res);
  if(wb) wb.addEventListener("click", ()=> startRun(R.qs.filter(q => q.picked !== q.correct).map(q => R.srcItems.find(it => it.q === q.q)).filter(Boolean), { save:false, label:R.fullLabel + " · ข้อที่ผิด", full:R.full, fullLabel:R.fullLabel }));
  $("#qzOther", B.res).addEventListener("click", ()=>{ renderSets(); showView("view-quiz-sets"); });
}

/* ================= ปุ่มย้อนกลับ ================= */
async function confirmLeave(){
  const R = Q.run;
  if(!R || !V.play.classList.contains("active") || !R.qs.some(q => q.done)) return true;
  if(typeof confirmDialog === "function"){
    return await confirmDialog({ title:"ออกจากการทำข้อสอบ?", icon:"📝", danger:true,
      message:"ข้อที่ทำไว้ในรอบนี้จะไม่ถูกนับ", okText:"ออกเลย", cancelText:"ทำต่อ" });
  }
  return window.confirm("ออกจากการทำข้อสอบ? ข้อที่ทำไว้ในรอบนี้จะไม่ถูกนับ");
}
$$("[data-qzback]").forEach(b => b.addEventListener("click", async ()=>{
  const to = b.dataset.qzback;
  if(!(await confirmLeave())) return;
  stopTimer();
  if(to === "view-quiz-sets") renderSets();
  else if(to === "view-quiz-cats") renderCats();
  else if(to === "view-quiz-subjects") renderSubjects();
  showView(to);
}));

/* ================= ปุ่ม "คลังข้อสอบ" หน้าแรก ================= */
(function bindHomeButton(){
  let btn = $('.menu-item[data-go="quiz"]');
  if(!btn){
    btn = document.createElement("button");
    btn.type = "button"; btn.className = "menu-item c-slate"; btn.dataset.go = "quiz"; btn.style.setProperty("--i", 6);
    btn.innerHTML = `<span class="ico">📚</span><span class="txt"><h3>คลังข้อสอบ</h3><p>ฝึกทำข้อสอบครูผู้ช่วย เลือกวิชา หมวดหมู่ ชุด · ดูคะแนน เวลา และเฉลย</p></span><span class="arrow">›</span>`;
    const menu = $("#view-home .menu"); if(menu) menu.appendChild(btn);
  }
  btn.addEventListener("click", ()=>{
    if(Q.items) renderSubjects(); else { Q.loading = true; renderSubjects(); }
    showView("view-quiz-subjects");
    loadQuiz();
  });
})();

document.addEventListener("visibilitychange", ()=>{ if(document.hidden) T.last = Date.now(); });
window.__khosob = { parseRows, makeQuestion, pctOf, fmtMs, fmtClock, gradeColor };   // ไว้ทดสอบ
})();