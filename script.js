const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzw7PEyNTqMfdDe_2TnFEQLnpquxdilJpqvmag1j4eotO_dg91XZz61hXwvS4DE1QDY/exec"
};

const SLOT_MIN = 36; // จำนวนช่องว่างเริ่มต้นเมื่อยังไม่มีหัวคะแนน (18 สัปดาห์ x 2 คาบ) — ถ้ามีหัวแล้วจะคำนวณจาก slotTarget()
const WEEKDAYS = ["อา","จ","อ","พ","พฤ","ศ","ส"];

const state = {
  students: [], scores: [], activities: [], attendance: [], teaching: [], config: [], examRows: [], examSetup: [], examKeyRows: [], blocked: [], hrDocs: [], hrOrders: [], hrSetup: [],
  examUi: { mc:"", es:"", fb:"", wmc:"", wes:"", vals:new Map(), dirty:false },
  attend: { room:"", subject:"", date:"", rows:[] },
  score: { tab:"beh", room:"", subject:"", headers:[], editingDate:null, pickCell:null, pending:new Map(), warned:false, scrolled:false },
  examSets: []
};
const EXAM_QN = 20;   // จำนวนข้อสูงสุดต่อชุดข้อสอบ — ต้องตรงกับ EXAM_KEY_QN ฝั่ง GS.txt เสมอ

const qs = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
const _reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayISO = () => toISO(new Date());
const isValidDate = t => /^\d{4}-\d{2}-\d{2}$/.test(t);
/* รับได้เฉพาะ yyyy-mm-dd หรือ ISO จาก Google Sheet (yyyy-mm-ddT...) นอกนั้นคืน "" (ไม่ใช่วันที่) */
const dateKey = v => {
  const t = String(v ?? "");
  if(isValidDate(t)) return t;
  if(/^\d{4}-\d{2}-\d{2}T/.test(t)){ const d = new Date(t); if(!isNaN(d)) return toISO(d); }
  return "";
};
const fmtShort = iso => { if(!isValidDate(iso)) return "?"; const d=new Date(iso+"T00:00:00"); return `${d.getDate()}/${d.getMonth()+1}`; };
const fmtWd = iso => isValidDate(iso) ? WEEKDAYS[new Date(iso+"T00:00:00").getDay()] : "";
const sameStr = (x, y) => String(x ?? "").trim() === String(y ?? "").trim();
/* เทียบข้อความแบบทนทาน: ตัดช่องว่าง/อักขระล่องหนที่มักติดมาจากชีท */
const normKey = v => String(v ?? "").replace(/[\s\u200b-\u200d\u2060\ufeff]/g, "").toLowerCase();
const sameLv = (x, y) => normKey(x) === normKey(y);
/* อ่านค่าจากแถวชีทโดยไม่สนช่องว่างในชื่อหัวคอลัมน์ (เช่น "ระดับชั้น " ที่มีเว้นวรรคท้าย) */
function rget(r, name){
  if(!r) return "";
  if(name in r) return r[name];
  const n = normKey(name);
  for(const k in r){ if(normKey(k) === n) return r[k]; }
  return "";
}
const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
const fmtLong = iso => { const d=new Date(iso+"T00:00:00"); return d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}); };
/* เลขที่นักเรียน แสดงหน้าชื่อ */
const snum = no => (no===undefined||no===null||no==="") ? "" : `<b class="sn">${esc(no)}</b>`;
const numOrNull = v => (v===""||v==null||isNaN(Number(v))) ? null : Number(v);

/* ================= ภาคเรียน / ประเภท (จำไว้ใน localStorage) ================= */
const TYPES = ["กลางภาค","ปลายภาค"];
const TK = { "กลางภาค":"m", "ปลายภาค":"f" };
const PERIOD_KEY = "kc_period";
const period = (()=>{
  try{ const p = JSON.parse(localStorage.getItem(PERIOD_KEY)); if(p && ["1","2"].includes(String(p.term)) && TYPES.includes(p.type)) return { term:String(p.term), type:p.type }; }catch(e){}
  return { term:"1", type:"กลางภาค" };
})();

/* ================= ตรวจข้อสอบ (เก็บในเครื่องด้วย localStorage — เฉลย+ชื่อชุด สำรองขึ้นชีท ExamKey ด้วย) =================
   ชุดข้อสอบแต่ละชุด: { id, name, term, level, subject, answerKey:{ "1":"ก", ... }, students:{ "7":{score,total,headerImage,scannedAt}, ... } }
   answerKey/name/term/level/subject สำรองขึ้นชีท ExamKey (ผ่าน saveExamKey) ทุกครั้งที่สร้าง/แก้เฉลย เผื่อเปิดจากเครื่องอื่นหรือ localStorage หาย
   students (คะแนนที่สแกนได้ + รูปหัวกระดาษ) ยังเก็บในเครื่องอย่างเดียวเหมือนเดิม ยังไม่ขึ้นชีท */
const EXAM_SETS_KEY = "kc_examsets";
const EXAM_LETTERS = ["ก","ข","ค","ง"];
function loadExamSets(){
  try{ const a = JSON.parse(localStorage.getItem(EXAM_SETS_KEY)); if(Array.isArray(a)) return a; }catch(e){}
  return [];
}
function saveExamSets(){ try{ localStorage.setItem(EXAM_SETS_KEY, JSON.stringify(state.examSets)); }catch(e){} }
state.examSets = loadExamSets();
let currentExamId = null;
const currentExamSet = () => state.examSets.find(s=>s.id===currentExamId);
/* ดึงชุดข้อสอบ (เฉลย+ห้อง+วิชา) ที่มีในชีท ExamKey แต่ยังไม่มีในเครื่องนี้ (เช่น สร้างไว้จากเครื่องอื่น) มาเพิ่มให้
   ของในเครื่องที่มีอยู่แล้วถือเป็นตัวหลัก (ไม่ทับ) เพื่อไม่ให้ข้อมูลที่กำลังแก้ไขอยู่หายไปโดยไม่ตั้งใจ */
function syncExamKeysFromSheet(){
  const rows = state.examKeyRows || [];
  let added = false;
  rows.forEach(r=>{
    const id = String(r["รหัสชุด"]||"").trim();
    if(!id || state.examSets.some(s=>s.id===id)) return;
    const answerKey = {};
    for(let i=1;i<=EXAM_QN;i++){
      const v = String(r["ข้อ"+i] ?? "").trim();
      if(v) answerKey[i] = v;
    }
    state.examSets.push({
      id, name: String(r["ชื่อชุดข้อสอบ"]||"").trim(),
      term: String(r["ภาคเรียนที่"]||"").trim(), level: String(r["ระดับชั้น"]||"").trim(), subject: String(r["รายวิชา"]||"").trim(),
      answerKey, students:{}
    });
    added = true;
  });
  if(added) saveExamSets();
}
/* แถวในชีทที่อยู่ในภาคเรียน+ประเภทที่เลือกอยู่ (แถวเก่าที่ช่อง ภาคเรียนที่/ประเภท ว่าง จะไม่ตรง) */
const inPeriod = r => sameStr(rget(r,"ภาคเรียนที่"), period.term) && sameStr(r["ประเภท"], period.type);
const scoreUnsaved = () => state.score.pending.size + (state.examUi.dirty ? 1 : 0);

function renderPeriodBars(){
  qsa(".period-bar").forEach(el=>{
    const mode = el.dataset.mode || "full";
    const termOnly = mode==="term" || mode==="lock-term";   // ไม่แยกกลางภาค/ปลายภาค (เช่น สรุปการมาเรียน — เก็บข้อมูลเป็นรายภาคเรียนเท่านั้น)
    const locked = mode==="lock" || mode==="lock-term";
    el.dataset.type = termOnly ? "" : period.type;
    const now = termOnly ? `ภาคเรียนที่ ${period.term}` : `ภาคเรียนที่ ${period.term} · ${period.type}`;
    const key = mode + "|" + TYPES.join(",");
    /* โครงปุ่มเดิมอยู่แล้ว → แค่สลับสถานะ .on กับเปลี่ยนข้อความ เพื่อให้ transition/สีไหลได้ (ไม่สร้างปุ่มใหม่ให้กระพริบ) */
    if(el._pbKey === key && el.querySelector(".pb-now")){
      qsa("[data-term]", el).forEach(b=> b.classList.toggle("on", b.dataset.term===period.term));
      qsa("[data-type]", el).forEach(b=> b.classList.toggle("on", b.dataset.type===period.type));
      const nowEl = el.querySelector(".pb-now");
      if(nowEl.textContent !== now){
        nowEl.textContent = now;
        nowEl.classList.remove("pb-tick"); void nowEl.offsetWidth; nowEl.classList.add("pb-tick");
      }
      return;
    }
    el._pbKey = key;
    const termBtns = ["1","2"].map(n=>`<button type="button" data-term="${n}" class="${period.term===n?"on":""}">${n}</button>`).join("");
    const typeBtns = TYPES.map(x=>`<button type="button" data-type="${x}" class="${period.type===x?"on":""}">${x}</button>`).join("");
    el.innerHTML = `<div class="pb-head"><span class="pb-lbl">📌 กำลังทำงานกับ</span><b class="pb-now">${now}</b></div>` +
      (locked ? "" :
        `<div class="pb-ctl"><div class="pb-seg pb-term"><em>ภาคเรียนที่</em>${termBtns}</div>` +
        (termOnly ? "" : `<div class="pb-seg pb-type">${typeBtns}</div>`) + `</div>`);
  });
}
function setPeriod(patch){
  const next = { ...period, ...patch };
  if(next.term===period.term && next.type===period.type) return;
  if(qs("#view-scores-table").classList.contains("active") && scoreUnsaved()>0){
    toast("มีคะแนนที่ยังไม่ได้บันทึก — กดบันทึกก่อนเปลี่ยนภาคเรียน/ประเภทครับ"); return;
  }
  if((qs("#view-hr-docs").classList.contains("active") && hrdDirty()) || (qs("#view-hr-order").classList.contains("active") && hroDirty())){
    toast("มีข้อมูลที่ยังไม่ได้บันทึก — กดบันทึกก่อนเปลี่ยนภาคเรียนครับ"); return;
  }
  Object.assign(period, next);
  try{ localStorage.setItem(PERIOD_KEY, JSON.stringify(period)); }catch(e){}
  renderPeriodBars();
  onPeriodChanged();
}
document.addEventListener("click", e=>{
  const b = e.target.closest(".period-bar button"); if(!b) return;
  setPeriod(b.dataset.term ? { term:b.dataset.term } : { type:b.dataset.type });
});
function onPeriodChanged(){
  const act = id => qs("#"+id).classList.contains("active");
  if(act("view-scores-table")){
    state.score.scrolled = false; syncHeadersWithActivities(); loadExamUi(); renderScoreTable(); renderExam();
  }
  if(act("view-attend-report-setup")) updateRepSource();
  if(act("view-summary")) renderSummary();
  hrOnPeriodChanged();
  softSwap();
}
/* เนื้อหาที่วาดใหม่ตอนเปลี่ยนภาค/ประเภท: ให้จางเข้านุ่มๆ แทนที่จะเปลี่ยนวับ */
function softSwap(){
  if(_reduceMotion) return;
  const els = qsa(".view.active .score-scroll, .view.active .w-card, .view.active #examWrap, .view.active #sumStats, .view.active #examSetupBox");
  els.forEach(el=>{ el.classList.remove("soft-in"); void el.offsetWidth; el.classList.add("soft-in"); });
  setTimeout(()=> els.forEach(el=>el.classList.remove("soft-in")), 520);
}

function toast(msg){
  const t = qs("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove("show"), Math.min(9000, Math.max(2200, msg.length*70)));
}

const SAVING_TIPS = [
  "กำลังเชื่อมต่อ Google Sheet",
  "กำลังส่งข้อมูลอย่างปลอดภัย 🔒",
  "กำลังเขียนข้อมูลลงชีท ✍️",
  "ตรวจความถูกต้องอีกรอบ ✨",
  "ใกล้เสร็จแล้ว อดใจอีกนิด 🚀"
];
let _savingTimer = null, _savingStart = 0;
function showSaving(msg="กำลังบันทึกข้อมูล..."){
  const el = qs("#savingOverlay"), sub = qs("#savingSub");
  qs("#savingMsg").textContent = String(msg).replace(/[.…]+\s*$/, ""); /* จุดไข่ปลาเคลื่อนไหวด้วย CSS แทน */
  el.classList.add("active");
  if(!sub) return;
  clearInterval(_savingTimer); _savingStart = Date.now(); let i = 0;
  sub.textContent = SAVING_TIPS[0]; sub.classList.remove("swap");
  _savingTimer = setInterval(()=>{
    const slow = Date.now() - _savingStart > 12000;
    const next = slow ? "เน็ตช้านิดหน่อย รออีกสักครู่นะ 🙏" : SAVING_TIPS[Math.min(++i, SAVING_TIPS.length-1)];
    if(sub.textContent === next) return;
    sub.classList.add("swap");
    setTimeout(()=>{ sub.textContent = next; sub.classList.remove("swap"); }, 300);
  }, 2200);
}
function hideSaving(){ clearInterval(_savingTimer); qs("#savingOverlay").classList.remove("active"); }

/* หน้าต่างยืนยันสวยๆ แทน confirm() ของเบราว์เซอร์ — คืน Promise<boolean>
   ใช้: if(await confirmDialog({title, message, stats:[{label,value,cls}], okText, danger:true})) {...} */
function confirmDialog({ title="ยืนยัน", message="", stats=[], okText="ตกลง", cancelText="ยกเลิก", icon="⚠️", danger=false } = {}){
  return new Promise(resolve=>{
    const m = qs("#modalConfirm"), ok = qs("#confirmOk"), no = qs("#confirmCancel");
    qs("#confirmIco").textContent = icon;
    qs("#confirmTitle").textContent = title;
    qs("#confirmMsg").innerHTML = esc(message).replace(/\n/g, "<br>");
    qs("#confirmStats").innerHTML = stats.map(s=>`<div class="cs ${s.cls||""}"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("");
    ok.textContent = okText; no.textContent = cancelText;
    m.classList.toggle("danger", !!danger);
    const done = v => { m.classList.remove("active"); ok.onclick = no.onclick = m.onclick = null; resolve(v); };
    ok.onclick = () => done(true);
    no.onclick = () => done(false);
    m.onclick = e => { if(e.target===m) done(false); };
    m.classList.add("active");
  });
}

/* เปลี่ยนหน้าแบบไหลต่อกัน: หน้าเก่าจางออกอยู่กับที่ ขณะหน้าใหม่เลื่อนเข้า (ปุ่มย้อนกลับ/หน้าแรก = ทิศย้อน) */
let _navBack = false, _navBackT = 0;
document.addEventListener("click", e=>{
  if(e.target.closest && e.target.closest(".back-btn")){ _navBack = true; clearTimeout(_navBackT); _navBackT = setTimeout(()=>{ _navBack = false; }, 700); }
}, true);
function _clearOut(v){
  v.classList.remove("v-out","nav-fwd","nav-back");
  ["left","top","width","height"].forEach(p=>v.style.removeProperty(p));
}
function showView(id){
  const prevActive = qs(".view.active");
  const next = qs("#"+id);
  if(prevActive && prevActive.id==="view-exam-scan" && id!=="view-exam-scan") stopExamScan();
  const back = _navBack || id==="view-home";
  const animate = !_reduceMotion && document.body.classList.contains("ready") && prevActive && prevActive!==next;
  qsa(".view.v-out").forEach(_clearOut);
  const rect = animate ? prevActive.getBoundingClientRect() : null;
  qsa(".view").forEach(v=>v.classList.remove("active"));
  next.classList.add("active");
  if(animate){
    const dir = back ? "nav-back" : "nav-fwd";
    Object.assign(prevActive.style, { left:rect.left+"px", top:rect.top+"px", width:rect.width+"px", height:rect.height+"px" });
    prevActive.classList.add("v-out", dir);
    setTimeout(()=>{ if(!prevActive.classList.contains("active")) _clearOut(prevActive); }, 260);
    if(id!=="view-home"){
      next.classList.remove("v-in","nav-fwd","nav-back"); void next.offsetWidth;
      next.classList.add("v-in", dir);
      setTimeout(()=>next.classList.remove("v-in","nav-fwd","nav-back"), 520);
    }
  }
  if(id==="view-exam-scan") startExamScan();
}

async function apiGet(type){
  const res = await fetch(`${CONFIG.API_URL}?type=${type}&_=${Date.now()}`, { cache:"no-store" });
  const txt = await res.text();
  try{ return JSON.parse(txt); }
  catch(e){
    /* Apps Script ตอบเป็นหน้าเว็บ (หน้า error / ขอสิทธิ์ / ล็อกอิน) → ดึงข้อความในหน้านั้นมาบอกผู้ใช้ */
    const title = ((txt.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
    const body = txt.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<title>[\s\S]*?<\/title>/gi, " ")
      .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 260);
    const err = new Error("SERVER_HTML");
    err.detail = [title, body].filter(Boolean).join(" | ");
    throw err;
  }
}
const GS_REQUIRED = "v13";
const sleep = ms => new Promise(r=>setTimeout(r, ms));
async function apiPost(payload, tries=3){
  if(state.gsOld) return { success:false, message:"Apps Script ที่เชื่อมอยู่ยังเป็นเวอร์ชันเก่า (ไม่รองรับภาคเรียน/ประเภท) — Deploy โค้ด GS.txt ล่าสุด แล้วใส่ลิงก์ใน CONFIG.API_URL ของ script.js จากนั้นรีเฟรชแบบล้างแคช" };
  for(let i=0; i<tries; i++){
    try{
      const res = await fetch(CONFIG.API_URL, {
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body: JSON.stringify(payload)
      });
      return await res.json();
    }catch(err){
      // เน็ตมือถือหลุดกลางทางบ่อย ทั้งที่ Apps Script มักบันทึกสำเร็จไปแล้วฝั่งหลังบ้าน (ทุกคำสั่งเขียนเป็นแบบ upsert
      // จึงส่งซ้ำได้อย่างปลอดภัย ไม่สร้างแถวซ้ำ) — ลองใหม่อัตโนมัติก่อนแจ้งว่าไม่สำเร็จ
      if(i < tries-1){ await sleep(1000 * (i+1)); continue; }
      return { success:false, network:true, message:"เชื่อมต่อชีทไม่สำเร็จ (ตรวจเน็ต หรือ Deploy Apps Script เป็นเวอร์ชันใหม่แล้วหรือยัง) — ข้อมูลอาจบันทึกไปแล้วฝั่งหลังบ้าน ลองกดรีเฟรชดูอีกครั้งก่อนบันทึกซ้ำ" };
    }
  }
}

/* ถ้ามี error ที่ไม่คาดคิด ให้บอกผู้ใช้ และปิดหน้าจอ "กำลังบันทึก" ไม่ให้ค้าง */
window.addEventListener("error", e=>{ hideSaving(); toast("เกิดข้อผิดพลาด: " + (e.message || "ไม่ทราบสาเหตุ") + " (ลองรีเฟรชแบบล้างแคช)"); });
window.addEventListener("unhandledrejection", e=>{ hideSaving(); toast("เกิดข้อผิดพลาด: " + ((e.reason && e.reason.message) || e.reason || "ไม่ทราบสาเหตุ")); });

async function loadAll(){
  try{
    const data = await apiGet("all");
    state.loadErr = "";
    state.cfgMsg = (data && data.config && !Array.isArray(data.config)) ? String(data.config.message || "ชีท Config อ่านไม่ได้") : "";
    state.gsOld = (data.gsVersion !== GS_REQUIRED);   // Deploy เก่า/คนละลิงก์ = บล็อกการบันทึก กันข้อมูลเข้าชีทผิดรูปแบบ
    if(state.gsOld) toast("Apps Script ยังเป็นเวอร์ชันเก่า — ต้อง Deploy GS.txt ล่าสุดและใช้ลิงก์ใหม่ก่อนบันทึกครับ");
    state.students = data.students || [];
    state.scores = data.scores || [];
    state.activities = data.activities || [];
    state.attendance = data.attendance || [];
    state.teaching = data.teaching || [];
    state.config = Array.isArray(data.config) ? data.config : [];
    state.examRows = Array.isArray(data.exam) ? data.exam : [];
    state.examSetup = Array.isArray(data.examSetup) ? data.examSetup : [];
    state.examKeyRows = Array.isArray(data.examKey) ? data.examKey : [];
    state.blocked = Array.isArray(data.blocked) ? data.blocked : [];
    state.hrDocs = Array.isArray(data.hrDocs) ? data.hrDocs : [];
    state.hrOrders = Array.isArray(data.hrOrders) ? data.hrOrders : [];
    state.hrSetup = Array.isArray(data.hrSetup) ? data.hrSetup : [];
    syncExamKeysFromSheet();
  }catch(err){
    state.loadErr = String((err && err.message) || err || "ไม่ทราบสาเหตุ");
    state.loadDetail = (err && err.detail) || "";
    toast("โหลดข้อมูลไม่สำเร็จ ตรวจการเชื่อมต่อ");
  }
}

function uniqueRooms(){
  // ห้อง/ชั้นปี ดึงจากชีท Config (เรียงตามลำดับในชีท) ถ้ายังไม่มีข้อมูล Config ให้ใช้จากรายชื่อนักเรียนแทน
  const fromCfg = [...new Set(state.config.map(c=>String(c["ระดับชั้น"]||"").trim()).filter(Boolean))];
  if(fromCfg.length) return fromCfg;
  return [...new Set(state.students.map(s=>s["ชั้นปี"]).filter(Boolean))].sort();
}
/* วิชาดึงจากชีท Config (รหัสวิชาแสดงเฉยๆ ใช้ชื่อวิชาเป็นตัวอ้างอิง) */
function subjectsOfRoom(room){
  const cfg = state.config.filter(c => c["รายวิชา"]);
  const lv = c => String(c["ระดับชั้น"]||"").trim();
  let rows = cfg.filter(c => lv(c)==="" || lv(c)===room || room.startsWith(lv(c)));
  if(rows.length===0) rows = cfg; // ไม่พบระดับชั้นที่ตรง -> แสดงทุกวิชา
  const map = new Map();
  rows.forEach(c=>{
    const n = String(c["รายวิชา"]).trim(), code = String(c["รหัสวิชา"]||"").trim();
    if(!map.has(n)) map.set(n, new Set());
    if(code) map.get(n).add(code);
  });
  return [...map].map(([name,codes])=>({ name, label: codes.size ? `${name} (${[...codes].join(", ")})` : name }));
}
function fillSubjectSelect(roomSel){
  const subSel = roomSel.closest(".view, .modal-sheet").querySelector("select.subject-select");
  if(!roomSel.value){ subSel.innerHTML = `<option value="">เลือกห้องก่อน</option>`; return; }
  subSel.innerHTML = `<option value="">เลือกวิชา</option>` +
    subjectsOfRoom(roomSel.value).map(s=>`<option value="${s.name}">${s.label}</option>`).join("");
}
function fillRoomSelects(scope=document){
  const opts = uniqueRooms().map(r=>`<option value="${r}">${r}</option>`).join("");
  qsa("select.room-select", scope).forEach(sel=>{
    sel.innerHTML = `<option value="">เลือกห้อง/ชั้นปี</option>` + opts;
    fillSubjectSelect(sel);
  });
}
qsa("select.room-select").forEach(sel=> sel.addEventListener("change", ()=> fillSubjectSelect(sel)));
function studentsOfRoom(room){
  return state.students.filter(s=>sameLv(s["ชั้นปี"], room))
    .sort((a,b)=> (a["เลขที่"]||0) - (b["เลขที่"]||0));
}

/* ================= HOME ================= */
qsa(".menu-item[data-go]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const go = btn.dataset.go;
    if(go==="attend"){ fillRoomSelects(); qs("#attendDate").value = todayISO(); showView("view-attend-setup"); }
    if(go==="scores"){ fillRoomSelects(); showView("view-scores-setup"); }
    if(go==="teaching"){ fillRoomSelects(); qs("#teachDate").value = todayISO(); showView("view-teaching"); }
    if(go==="exam"){ renderExamHome(); showView("view-exam"); }
    if(go==="homeroom"){ openHomeroom(); }
  });
});
qsa("[data-back]").forEach(b=> b.addEventListener("click", async ()=>{
  if(b.closest("#view-scores-table") && scoreUnsaved()>0){
    const ok = await confirmDialog({
      title:"ยังไม่ได้บันทึกคะแนน", icon:"📝", danger:true,
      message:"มีคะแนนที่ลงไว้แต่ยังไม่ได้กดบันทึก\nถ้าออกตอนนี้คะแนนเหล่านี้จะหายไป",
      stats:[{ label:"รายการที่ยังไม่บันทึก", value:scoreUnsaved(), cls:"bad" }],
      okText:"ออกโดยไม่บันทึก", cancelText:"อยู่ต่อ"
    });
    if(!ok) return;
    state.score.pending.clear(); state.examUi.dirty = false;
  }
  showView(b.dataset.back);
}));

/* ================= ATTENDANCE ================= */
qs("#attendStartBtn").addEventListener("click", async ()=>{
  exitFocusMode();
  const room = qs("#attendRoom").value, subject = qs("#attendSubject").value.trim(), date = qs("#attendDate").value;
  if(!room || !subject || !date){ toast("กรอกข้อมูลให้ครบก่อนครับ"); return; }
  state.attend.room = room; state.attend.subject = subject; state.attend.date = date;
  state.attend.term = period.term; state.attend.type = period.type;

  // ตรวจชีท Attend ล่าสุดก่อนว่าห้อง+วิชา+วันที่นี้เคยเช็คไว้แล้วหรือยัง (กันข้อมูลค้างจากเครื่องอื่น)
  showSaving("กำลังตรวจข้อมูลการเช็คชื่อ...");
  try{ const fresh = await apiGet("attendance"); if(Array.isArray(fresh)) state.attendance = fresh; }catch(err){ /* ใช้ข้อมูลที่โหลดไว้ */ }
  hideSaving();

  const existing = state.attendance.find(a => sameStr(a["ระดับชั้น"],room) && sameStr(a["รายวิชา"],subject) && dateKey(a["วันที่"])===date && inPeriod(a));
  state.attend.existing = !!existing;
  qs("#attendExistNote").style.display = existing ? "" : "none";
  qs("#attendSaveBtn").textContent = existing ? "บันทึกการแก้ไข" : "บันทึกการเช็คชื่อ";
  const absentSet = new Set((existing?.["ขาดเรียน"]||"").split(",").map(s=>s.trim()).filter(Boolean));
  const leaveSet = new Set((existing?.["ลา"]||"").split(",").map(s=>s.trim()).filter(Boolean));
  const lateSet = new Set((existing?.["สาย"]||"").split(",").map(s=>s.trim()).filter(Boolean));

  state.attend.rows = studentsOfRoom(room).map(s=>{
    const name = s["ชื่อ-สกุล"];
    let status = "present";
    if(absentSet.has(name)) status="absent"; else if(leaveSet.has(name)) status="leave"; else if(lateSet.has(name)) status="late";
    return { no:s["เลขที่"], name, status };
  });

  qs("#attendHeadSub").textContent = `${room} · ${subject} · ${fmtLong(date)}`;
  renderPeriodBars();
  renderRoster();
  showView("view-attend-list");
});

const STATUS_LABEL = { present:"มา", absent:"ขาด", leave:"ลา", late:"สาย" };
function updateAttendSummary(){
  const wrap = qs("#rosterList");
  let box = qs("#attendSummary");
  if(!box){ box = document.createElement("div"); box.id = "attendSummary"; wrap.parentNode.insertBefore(box, wrap); }
  const rows = state.attend.rows, c = { present:0, absent:0, leave:0, late:0 };
  rows.forEach(r=> c[r.status]++);
  box.innerHTML = rows.length===0 ? "" :
    Object.keys(STATUS_LABEL).map(k=>`<div class="sum-tile ${c[k]?"":"zero"}" data-status="${k}"><b>${c[k]}</b><span>${STATUS_LABEL[k]}</span></div>`).join("") +
    `<button class="sum-all" id="attendAllBtn" title="ตั้งเป็นมาทั้งหมด">↺ มาครบ</button>`;
  const all = qs("#attendAllBtn");
  if(all) all.addEventListener("click", ()=>{ state.attend.rows.forEach(r=>r.status="present"); renderRoster(); });
}

function renderRoster(){
  const wrap = qs("#rosterList"); wrap.innerHTML = "";
  if(state.attend.rows.length===0){ wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; updateAttendSummary(); return; }
  state.attend.rows.forEach((row, idx)=>{
    const div = document.createElement("div"); div.className="roster-row"; div.dataset.s = row.status;
    div.innerHTML = `
      <div class="no">${row.no||""}</div>
      <div class="name">${esc(row.name)}</div>
      <div class="chip-group">
        <button class="chip" data-status="present">มา</button>
        <button class="chip" data-status="absent">ขาด</button>
        <button class="chip" data-status="leave">ลา</button>
        <button class="chip" data-status="late">สาย</button>
      </div>`;
    qsa(".chip", div).forEach(c=>{
      if(c.dataset.status===row.status) c.classList.add("active");
      c.addEventListener("click", ()=>{
        state.attend.rows[idx].status = c.dataset.status;
        div.dataset.s = c.dataset.status;
        qsa(".chip", div).forEach(x=>x.classList.remove("active"));
        c.classList.add("active");
        updateAttendSummary();
      });
    });
    wrap.appendChild(div);
  });
  updateAttendSummary();
}

qs("#attendSaveBtn").addEventListener("click", async ()=>{
  const { room, subject, date, rows, term, type } = state.attend;
  const absent = rows.filter(r=>r.status==="absent").map(r=>r.name).join(", ");
  const leave = rows.filter(r=>r.status==="leave").map(r=>r.name).join(", ");
  const late = rows.filter(r=>r.status==="late").map(r=>r.name).join(", ");
  const nos = st => rows.filter(r=>r.status===st).map(r=>r.no).join(", ");
  qs("#attendSaveBtn").disabled = true;
  showSaving("กำลังบันทึกการเช็คชื่อ...");
  const res = await apiPost({ type:"addAttendance", term, ptype:type, level:room, subject, absent, leave, late, date, absentNo:nos("absent"), leaveNo:nos("leave"), lateNo:nos("late") });
  qs("#attendSaveBtn").disabled = false;
  if(res.success){
    await loadAll();
    hideSaving();
    toast(state.attend.existing ? "แก้ไขการเช็คชื่อเดิมของวันนี้แล้ว" : "บันทึกการเช็คชื่อแล้ว");
    showView("view-home");
  } else if(res.network){
    // เน็ตสะดุดตอนรอผล แต่ addAttendance เป็น upsert — โหลดชีทมาเช็คก่อนว่าวันนี้ถูกบันทึกไปแล้วหรือยัง
    await loadAll();
    const ok = state.attendance.some(a => sameStr(a["รายวิชา"],subject) && sameStr(a["ระดับชั้น"],room) && dateKey(a["วันที่"])===date && inPeriod(a));
    hideSaving();
    if(ok){ toast("การเชื่อมต่อสะดุดแต่บันทึกสำเร็จแล้ว ✓ (ตรวจกับชีทให้แล้ว)"); showView("view-home"); }
    else toast(res.message || "บันทึกไม่สำเร็จ");
  } else { hideSaving(); toast(res.message || "บันทึกไม่สำเร็จ"); }
});

/* ================= SCORES ================= */
qs("#addHeaderBtn").addEventListener("click", ()=> openAssignmentModal(null));
qs("#scoreStartBtn").addEventListener("click", ()=>{
  exitFocusMode();
  const room = qs("#scoreRoom").value, subject = qs("#scoreSubject").value.trim();
  if(!room || !subject){ toast("เลือกห้องและวิชาก่อนครับ"); return; }
  state.score.room = room; state.score.subject = subject;
  state.score.pending = new Map();
  state.score.warned = false;
  localStorage.removeItem(`kc_headers_${room}_${subject}`);   // ระบบเก่าเก็บหัวไว้ในเครื่อง — ล้างทิ้ง ใช้ชีท Act อย่างเดียว
  state.score.scrolled = false;
  state.score.headers = [];
  state.examUi.dirty = false;
  syncHeadersWithActivities();
  qs("#scoreHeadSub").textContent = `${room} · ${subject}`;
  setScoreTab("beh"); loadExamUi();
  renderScoreTable(); renderExam();
  renderPeriodBars();
  showView("view-scores-table");
  refreshScoreData();
});

/* เช็คข้อมูลล่าสุดใน Act / Scores ทุกครั้งที่เปิดตาราง (กันข้อมูลเก่าค้าง เช่น แก้จากเครื่องอื่น)
   หัวตารางที่มีงานใน Act แล้วจะถูกดึงมาและปลดล็อกให้ลงคะแนนได้ทันที; คะแนนที่ยังไม่กดบันทึกไม่หาย */
async function refreshScoreData(){
  const room = state.score.room, subject = state.score.subject;
  try{
    const [acts, scores, exRows, exSetup] = await Promise.all([apiGet("activities"), apiGet("scores"), apiGet("exam"), apiGet("examSetup")]);
    if(room!==state.score.room || subject!==state.score.subject) return;
    if(Array.isArray(acts)) state.activities = acts;
    if(Array.isArray(scores)) state.scores = scores;
    if(Array.isArray(exRows)) state.examRows = exRows;
    if(Array.isArray(exSetup)) state.examSetup = exSetup;
    syncHeadersWithActivities();
    if(qs("#view-scores-table").classList.contains("active")){
      renderScoreTable();
      if(!state.examUi.dirty){ loadExamUi(); renderExam(); }
    }

  }catch(err){ /* ใช้ข้อมูลที่โหลดไว้ตอนเปิดแอปต่อไป */ }
}

/* หัวตาราง = วันที่ทั้งหมดของ (รายวิชา + ระดับชั้น) ที่มีอยู่ในชีท Act เท่านั้น (Act คือแหล่งข้อมูลจริง) */
function syncHeadersWithActivities(){
  const set = new Set();
  let bad = 0;
  state.activities
    .filter(a => a["รายวิชา"]===state.score.subject && a["ระดับชั้น"]===state.score.room && inPeriod(a))
    .forEach(a => { const k = dateKey(a["วันที่"]); if(k) set.add(k); else bad++; });
  state.score.headers = [...set].sort();
  // คะแนนที่ยังไม่บันทึกของวันที่ที่ไม่มีหัวตารางแล้ว (เช่น หลังรีเซตวันที่) ให้ทิ้ง
  for(const k of [...state.score.pending.keys()]){
    if(!set.has(splitPendingKey(k).date)) state.score.pending.delete(k);
  }
  if(bad && !state.score.warned){
    state.score.warned = true;
    toast(`ข้ามแถวในชีท Act ที่คอลัมน์ "วันที่" ไม่ใช่วันที่ ${bad} แถว (ตรวจแก้ในชีทได้ครับ)`);
  }
}

function findActivity(date){
  if(!date) return null;
  return state.activities.find(a => a["รายวิชา"]===state.score.subject && a["ระดับชั้น"]===state.score.room && inPeriod(a) && dateKey(a["วันที่"])===date);
}
function findScore(name, date){
  if(!date) return null;
  return state.scores.find(s => s["ระดับชั้น"]===state.score.room && inPeriod(s) && s["ชื่อ"]===name && dateKey(s["วันที่"])===date);
}
function pendingKey(name, date){ return `${name}|${date}`; }
/* คะแนนที่บันทึกไว้ในชีทแล้ว (ตัวเลข) หรือ null ถ้ายังไม่มี */
function savedScore(name, date){
  const sc = findScore(name, date);
  const v = sc ? sc["คะแนน"] : "";
  return (v==="" || v==null || isNaN(Number(v))) ? null : Number(v);
}
/* คะแนนที่เห็นอยู่ตอนนี้: pending (ตัวเลข / null = รอลบ) มาก่อน แล้วค่อยเป็นค่าที่บันทึกไว้ */
function currentScore(name, date){
  const p = state.score.pending.get(pendingKey(name, date));
  return p!==undefined ? p : savedScore(name, date);
}
const splitPendingKey = k => ({ date: k.slice(-10), name: k.slice(0,-11) });

/* รายชื่อสำหรับลงคะแนน: แถวที่ชื่อ+เลขที่ซ้ำกันเป๊ะ (ซ้ำในชีท NameList) รวมเป็นคนเดียว
   ส่วนคนละคนแต่ชื่อเหมือนกัน จะใช้ "ชื่อ (เลขที่ N)" เป็นตัวระบุ เพื่อไม่ให้คะแนนไปโผล่ให้ทั้งคู่ */
function scoreRoster(room){
  const seen = new Set(), list = [];
  studentsOfRoom(room).forEach(s=>{
    const name = String(s["ชื่อ-สกุล"]||"").trim(), no = s["เลขที่"];
    const sig = `${name}#${no}`;
    if(!name || seen.has(sig)) return;
    seen.add(sig); list.push({ name, no });
  });
  const count = {}; list.forEach(x=>{ count[x.name] = (count[x.name]||0)+1; });
  return list.map(x=>({ label:x.name, no:x.no, key: count[x.name]>1 ? `${x.name} (เลขที่ ${x.no})` : x.name }));
}

function renderScoreTable(){
  const wrap = qs("#scoreTableWrap");
  const roster = scoreRoster(state.score.room);
  if(roster.length===0){ wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; updateScoreSaveBar(); return; }

  if(state.score.headers.length===0){
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="es-ico">🗓️</div>
        <h4>ยังไม่มีหัวตาราง</h4>
        <p>ห้องและวิชานี้ยังไม่มีวันที่ในชีท Act<br>สร้างวันที่ทั้งเทอมรวดเดียว หรือเพิ่มทีละวันก็ได้</p>
        <div class="es-actions">
          <button class="btn btn-primary btn-sm" id="esGen">✨ สร้างหัวคะแนน</button>
          <button class="btn btn-outline btn-sm" id="esAdd">＋ เพิ่มวันที่เอง</button>
        </div>
      </div>`;
    qs("#esGen").addEventListener("click", ()=> qs("#genHeaderBtn").click());
    qs("#esAdd").addEventListener("click", ()=> openAssignmentModal(null));
    updateScoreSaveBar();
    return;
  }

  let thead = `<tr><th class="name-head">ชื่อ</th>`;
  state.score.headers.forEach(d=>{
    const title = String(findActivity(d)?.["งาน"] ?? "").trim();
    thead += `<th data-date="${d}" class="${d===todayISO()?"today-col":""}">${fmtShort(d)}<small class="wd">${fmtWd(d)}</small>${title ? `<span class="head-badge">${esc(title)}</span>` : `<span class="head-badge noname">＋ ชื่องาน</span>`}</th>`;
  });
  const emptyCount = 0;   // แสดงเฉพาะหัวคะแนนที่มีจริงในชีท Act (ลบแถวใน Act แล้วคอลัมน์หายตามทันที) — เพิ่มวันที่ใช้ปุ่ม "＋ เพิ่มวันที่"
  for(let i=0;i<emptyCount;i++){
    thead += `<th data-date="">—<span class="head-badge slot">ยังไม่มีหัว</span></th>`;
  }
  thead += `</tr>`;

  let rows = "";
  roster.forEach(st=>{
    rows += `<tr><td class="name-cell">${snum(st.no)}${esc(st.label)}</td>`;
    state.score.headers.forEach(d=>{
      const pend = state.score.pending.get(pendingKey(st.key, d));
      const saved = savedScore(st.key, d);
      let val = "", cls = "";
      if(pend===null){ val = "✕"; cls = "pending removing"; }            // รอลบตอนกดบันทึก
      else if(pend!==undefined){ val = pend; cls = `pending v${pend}`; }   // ลงแล้วแต่ยังไม่บันทึก
      else if(saved!==null){ val = saved; cls = `filled v${saved}`; }
      rows += `<td class="${d===todayISO()?"today-col":""}"><div class="score-circle ${cls}" data-name="${esc(st.key)}" data-date="${d}">${val}</div></td>`;
    });
    for(let i=0;i<emptyCount;i++){
      rows += `<td><div class="score-circle locked slot" data-name="${esc(st.key)}" data-date=""></div></td>`;
    }
    rows += `</tr>`;
  });

  const hint = `<div class="hint" style="padding:10px 12px 0;">แตะวงกลมเพื่อให้คะแนน · แตะหัวคอลัมน์เพื่อแก้วันที่/ชื่องาน · ลงเสร็จกด "บันทึกคะแนน" ด้านล่างครั้งเดียว</div>`;
  wrap.innerHTML = `<table class="score-table"><thead>${thead}</thead><tbody>${rows}</tbody></table>${hint}`;

  const info = qs("#scoreInfo");
  if(info) info.textContent = `${roster.length} คน · ${state.score.headers.length} วัน`;
  if(!state.score.scrolled){   // เปิดมาครั้งแรก เลื่อนไปที่คอลัมน์ของวันนี้ (หรือวันสอนถัดไป) ให้เลย
    state.score.scrolled = true;
    const hs = state.score.headers, t = todayISO();
    let i = hs.findIndex(d=>d>=t); if(i<0) i = hs.length-1;
    const anchor = qs(`th[data-date="${hs[Math.max(0, i-1)]}"]`, wrap), box = qs(".score-scroll");   // เว้นให้เห็นคอลัมน์ก่อนหน้า 1 ช่อง
    if(anchor && box) requestAnimationFrame(()=>{
      const nameW = (qs("th.name-head", wrap)||{}).offsetWidth || 122;
      box.scrollLeft = Math.max(0, anchor.offsetLeft - nameW - 8);
    });
  }
  qsa("th[data-date]", wrap).forEach(th=>{
    th.addEventListener("click", ()=> openAssignmentModal(th.dataset.date || null));
  });
  qsa(".score-circle", wrap).forEach(c=>{
    c.addEventListener("click", ()=> openScorePick(c.dataset.name, c.dataset.date));
  });
  updateScoreSaveBar();
}

function updateScoreSaveBar(){
  const n = state.score.pending.size;
  qs("#scoreSaveBar").style.display = "";
  qs("#scoreSaveCount").textContent = n>0 ? `(${n})` : "";
  qs("#scoreSaveBtn").disabled = (n===0);
}

/* กดติ๊กคะแนนแล้วแค่เก็บไว้ในเครื่องก่อน (ไม่ยิง API ทุกครั้ง เพื่อไม่ให้ช้า) แล้วค่อยกด "บันทึกคะแนน" ทีเดียว */
qs("#scoreSaveBtn").addEventListener("click", async ()=>{
  if(state.score.pending.size===0) return;
  const noOf = new Map(scoreRoster(state.score.room).map(x=>[x.key, x.no]));
  const items = [...state.score.pending.entries()].map(([key, score])=>{
    const { name, date } = splitPendingKey(key);
    return {
      term: period.term, type: period.type, level: state.score.room, name, date, no: noOf.get(name),
      assignment: findActivity(date)?.["งาน"] || fmtShort(date),
      score
    };
  });
  qs("#scoreSaveBtn").disabled = true;
  showSaving(`กำลังบันทึกคะแนน ${items.length} รายการ...`);
  const res = await apiPost({ type:"addScores", items });
  qs("#scoreSaveBtn").disabled = false;
  if(res.success){
    state.score.pending.clear();
    await loadAll();
    hideSaving();
    toast("บันทึกคะแนนแล้ว ✓");
    renderScoreTable();
  } else if(res.network){
    // เน็ตสะดุดตอนรอผล แต่คำสั่งเป็น upsert — โหลดชีทมาเช็คว่ารายการที่ค้างอยู่เข้าไปจริงหรือยังก่อนฟันธงว่าพัง
    await loadAll();
    const stillPending = items.some(it => findScore(it.name, it.date) === null);
    hideSaving();
    if(!stillPending){ state.score.pending.clear(); toast("การเชื่อมต่อสะดุดแต่บันทึกสำเร็จแล้ว ✓ (ตรวจกับชีทให้แล้ว)"); }
    else toast(res.message || "บันทึกไม่สำเร็จ");
    renderScoreTable();
  } else { hideSaving(); toast(res.message || "บันทึกไม่สำเร็จ"); }
});

/* header generator modal: เลือกจำนวนคาบสอนต่อสัปดาห์ (1-3 = A / AB / ABC)
   แล้วบวกทีละ 7 วันให้ทุกวัน ครบ 18 สัปดาห์ → บันทึกลงชีท Act ทับหัวคะแนนเดิมของห้อง+วิชานี้ทั้งหมด */
const GEN_WEEKS = 18;
const GEN_LABELS = ["A","B","C"];
const gen = { periods: 2 };

const daysBetween = (a, b) => Math.round((new Date(b+"T00:00:00") - new Date(a+"T00:00:00")) / 86400000);

/* จำนวนช่องหัวคะแนนที่ควรแสดง (รวมช่องว่าง) เดาจากจำนวนหัวที่มีอยู่: ≤18 = 1 คาบ, ≤36 = 2 คาบ, มากกว่านั้น = 3 คาบ */
function slotTarget(){
  const n = state.score.headers.length;
  if(!n) return SLOT_MIN;
  return GEN_WEEKS * Math.min(3, Math.max(1, Math.ceil(n / GEN_WEEKS)));
}
/* แถวใน Act ทั้งหมดของห้อง+วิชานี้ (นับรวมแถวซ้ำ/วันที่เสียด้วย) */
function actRowsOfRoom(){
  return state.activities.filter(a => a["รายวิชา"]===state.score.subject && a["ระดับชั้น"]===state.score.room && inPeriod(a));
}
/* days = วันสอนแต่ละคาบ (A, B, C) → บวกทีละ 7 วัน ครบ GEN_WEEKS สัปดาห์ เรียงตามวันที่ */
function buildHeaderDates(days){
  const out = new Set();
  for(let w=0; w<GEN_WEEKS; w++){
    days.forEach(iso=>{
      const d = new Date(iso+"T00:00:00"); d.setDate(d.getDate()+7*w);
      out.add(toISO(d));
    });
  }
  return [...out].sort();
}
function genDays(){ return ["#genDateA","#genDateB","#genDateC"].slice(0, gen.periods).map(s => qs(s).value); }
/* คืนข้อความ error ถ้าวันที่ไม่ครบ หรือมี 2 วันตรงกับวันเดียวกันของสัปดาห์ */
function genDaysError(days){
  if(days.some(d => !d)) return "เลือกวันที่ " + GEN_LABELS.slice(0, days.length).join(", ") + " ให้ครบก่อนครับ";
  for(let i=0;i<days.length;i++) for(let k=i+1;k<days.length;k++){
    if(daysBetween(days[i], days[k]) % 7 === 0) return `วัน ${GEN_LABELS[i]} และ ${GEN_LABELS[k]} ต้องเป็นคนละวันในสัปดาห์ (เช่น จันทร์ กับ พุธ)`;
  }
  return "";
}

function ensureGenEl(id, cls){
  let el = qs("#"+id);
  if(!el){
    el = document.createElement("p"); el.id = id; el.className = cls; el.style.display = "none";
    const anchor = qs("#modalHeaderGen .modal-actions");
    anchor.parentNode.insertBefore(el, anchor);
  }
  return el;
}
function updateGenPreview(){
  const el = ensureGenEl("genPreview", "gen-preview");
  const days = genDays();
  if(genDaysError(days)){ el.style.display = "none"; return; }
  const d = buildHeaderDates(days);
  el.style.display = "";
  el.innerHTML = `<b>${d.length} วัน · ${GEN_WEEKS} สัปดาห์</b><span>${fmtLong(d[0])} → ${fmtLong(d[d.length-1])}</span>`;
}
/* เตือนตามข้อมูลจริงใน Act ของห้อง+วิชานี้ */
function updateGenWarn(){
  const warn = ensureGenEl("genWarn", "hint warn");
  const rows = actRowsOfRoom().length, total = GEN_WEEKS * gen.periods;
  warn.style.display = rows ? "" : "none";
  if(!rows){ warn.textContent = ""; return; }
  warn.textContent =
    `⚠ ตรวจใน Act พบหัวคะแนนของห้อง/วิชานี้ ${rows} แถว ระบบจะรีเซตให้เหลือ ${total} คอลัมน์พอดี (${GEN_WEEKS} สัปดาห์ × ${gen.periods} คาบ) ` +
    `โดยวันที่เดิมทั้งหมดจะถูกแทนที่ด้วยวันที่ใหม่ (ชื่องานและคำอธิบายเดิมอยู่กับแถวเดิมตามลำดับ)` +
    (rows > total ? ` · เกินมา ${rows-total} แถว → แถวส่วนเกินจะถูกลบออกจากชีท Act` : rows < total ? ` · จะเพิ่มอีก ${total-rows} แถว` : "") +
    ` · คะแนนที่เคยลงตามวันที่เดิมจะไม่แสดงในคอลัมน์ใหม่`;
}
function setGenPeriods(n){
  gen.periods = n;
  qsa("#genPeriods button").forEach(b => b.classList.toggle("on", Number(b.dataset.n)===n));
  qs("#genFieldB").style.display = n>=2 ? "" : "none";
  qs("#genFieldC").style.display = n>=3 ? "" : "none";
  qs("#genHint").textContent =
    `ระบบจะบวกทีละ 7 วันให้ ${GEN_LABELS.slice(0,n).join(", ")} ไปเรื่อยๆ จนครบ ${GEN_WEEKS} สัปดาห์ (${GEN_WEEKS*n} คอลัมน์) แล้วบันทึกลงชีท Act ทับของเดิมให้เลย`;
  updateGenWarn();
  updateGenPreview();
}
qsa("#genPeriods button").forEach(b => b.addEventListener("click", ()=> setGenPeriods(Number(b.dataset.n))));
["#genDateA","#genDateB","#genDateC"].forEach(s => qs(s).addEventListener("input", updateGenPreview));

qs("#genHeaderBtn").addEventListener("click", ()=>{
  // เปิดมาใหม่ทุกครั้ง = ช่องวันที่ว่าง ไม่ดึงวันที่เดิมมาใส่ (เพราะเป็นการรีเซตทั้งหมด)
  ["#genDateA","#genDateB","#genDateC"].forEach(s => qs(s).value = "");
  const n = actRowsOfRoom().length;
  qs("#genConfirmBtn").textContent = n ? "รีเซตวันที่ทั้งหมด" : "สร้างหัวคะแนน";
  // เดาจำนวนคาบจากหัวเดิม (18 = 1 คาบ, 36 = 2 คาบ, 54 = 3 คาบ) ถ้ายังไม่มีใช้ 2 คาบ
  setGenPeriods(n ? Math.min(3, Math.max(1, Math.ceil(n / GEN_WEEKS))) : 2);
  qs("#modalHeaderGen").classList.add("active");
});
qsa("#modalHeaderGen [data-close]").forEach(b=>b.addEventListener("click", ()=> qs("#modalHeaderGen").classList.remove("active")));
qs("#genConfirmBtn").addEventListener("click", async ()=>{
  const days = genDays();
  const err = genDaysError(days);
  if(err){ toast(err); return; }
  const dates = buildHeaderDates(days);
  const existing = actRowsOfRoom().length;
  if(existing){
    const diff = existing - dates.length;
    const stats = [
      { label:"ใน Act ตอนนี้", value:`${existing} แถว` },
      { label:"หลังรีเซต", value:`${dates.length} วัน`, cls:"ok" }
    ];
    if(diff>0) stats.push({ label:"ลบส่วนเกิน", value:`${diff} แถว`, cls:"bad" });
    else if(diff<0) stats.push({ label:"เพิ่มใหม่", value:`${-diff} แถว` });
    const ok = await confirmDialog({
      title:"รีเซตหัวคะแนนทั้งหมด?", icon:"🗓️", danger:true,
      message:`ระบบจะแก้ "วันที่" ของหัวคะแนนเดิมทั้งหมดให้เป็นวันที่ใหม่ ${GEN_WEEKS} สัปดาห์ (${gen.periods} คาบต่อสัปดาห์) ทับของเดิมทั้งหมด ไม่ว่าคอลัมน์เดิมจะมีงานหรือคะแนนอยู่หรือไม่\nคะแนนที่เคยลงไว้กับวันที่เดิมจะไม่แสดงในตารางใหม่`,
      stats, okText:"รีเซตเลย", cancelText:"ยกเลิก"
    });
    if(!ok) return;
  }
  qs("#modalHeaderGen").classList.remove("active");
  showSaving("กำลังบันทึกหัวคะแนนลงชีท Act...");
  const res = await apiPost({ type:"setHeaders", term: period.term, ptype: period.type, subject: state.score.subject, level: state.score.room, dates, weeks: GEN_WEEKS, periods: gen.periods });
  if(res.success || res.network){
    // res.network = เน็ตหลุดตอนรอผลลัพธ์ แต่ Apps Script อาจเขียนสำเร็จไปแล้วฝั่งหลังบ้าน (มือถือเจอบ่อย) —
    // โหลดข้อมูลจริงจากชีทมาตรวจก่อน ถ้าจำนวนแถวตรงกับที่ควรจะเป็นก็ถือว่าสำเร็จ ไม่ต้องให้ผู้ใช้เข้าใจผิดว่าพัง
    await loadAll();
    state.score.scrolled = false;
    syncHeadersWithActivities();
    hideSaving();
    renderScoreTable();
    const left = actRowsOfRoom().length;
    if(left === dates.length){
      toast(res.success ? (res.message || "สร้างหัวคะแนนเรียบร้อย") : "การเชื่อมต่อสะดุดแต่บันทึกสำเร็จแล้ว ✓ (ตรวจกับชีทให้แล้ว)");
    } else if(res.success){
      toast(`⚠ ใน Act เหลือ ${left} แถว (ควรเป็น ${dates.length}) — ตรวจสคริปต์ setHeaders ฝั่ง Apps Script`);
    } else {
      toast(res.message || "สร้างหัวคะแนนไม่สำเร็จ");
    }
  } else { hideSaving(); toast(res.message || "สร้างหัวคะแนนไม่สำเร็จ"); }
});

/* assignment modal — แก้ชื่องาน/คำอธิบาย และ "วันที่" ของหัวคอลัมน์นี้ได้ด้วย
   (เผื่อวันสอนจริงเลื่อนเพราะวันหยุด ไม่ต้องลบแล้วสร้างหัวใหม่) */
function openAssignmentModal(date){
  state.score.editingDate = date;
  const act = date ? findActivity(date) : null;
  qs("#actDateLabel").textContent = date ? fmtLong(date) : "หัวคะแนนใหม่";
  qs("#actDateInput").value = date || "";
  qs("#actName").value = act?.["งาน"] || "";
  qs("#actDesc").value = act?.["คำอธิบายงาน"] || "";
  qs("#modalAssignment").classList.add("active");
}
qsa("#modalAssignment [data-close]").forEach(b=>b.addEventListener("click", ()=> qs("#modalAssignment").classList.remove("active")));
qs("#actSaveBtn").addEventListener("click", async ()=>{
  const oldDate = state.score.editingDate;
  const newDate = qs("#actDateInput").value;
  const assignment = qs("#actName").value.trim();
  const description = qs("#actDesc").value.trim();
  if(!newDate){ toast("เลือกวันที่ก่อนครับ"); return; }
  const existedInAct = !!findActivity(newDate);
  if(oldDate && newDate!==oldDate && existedInAct){
    toast("วันที่นี้มีหัวตารางอยู่แล้ว (วิชาและห้องเดียวกัน) เลือกวันอื่น หรือแตะหัวคอลัมน์ของวันนั้นเพื่อแก้ไขแทนครับ"); return;
  }

  showSaving("กำลังบันทึกงาน...");
  const res = await apiPost({
    type:"addActivity", term: period.term, ptype: period.type, subject: state.score.subject, level: state.score.room,
    date: newDate, oldDate: oldDate || "", assignment, description
  });
  if(res.success){
    const movedWithScores = !!oldDate && newDate!==oldDate &&
      state.scores.some(s=>s["ระดับชั้น"]===state.score.room && inPeriod(s) && s["ชื่อ"] && dateKey(s["วันที่"])===oldDate);
    await loadAll();
    syncHeadersWithActivities();
    hideSaving();
    toast(movedWithScores
      ? "ย้ายวันที่แล้ว (คะแนนเดิมของวันเก่ายังอยู่ในชีท แต่จะไม่แสดงในคอลัมน์นี้อีก)"
      : (!oldDate && existedInAct ? "วันที่นี้มีในชีท Act อยู่แล้ว จึงแก้ทับแถวเดิมให้ (ไม่เพิ่มแถวใหม่)" : "บันทึกหัวตารางแล้ว"));
    qs("#modalAssignment").classList.remove("active");
    renderScoreTable();
  } else { hideSaving(); toast(res.message || "บันทึกไม่สำเร็จ"); }
});

/* score pick modal — ใช้ร่วมกัน 2 โหมด: "weekly" (คะแนนเก็บ/จิตพิสัยรายวัน จำไว้ในเครื่องก่อน ยังไม่ยิง API
   จนกว่าจะกด "บันทึกคะแนน") และ "examBeh" (จิตพิสัยของรอบสอบ กลางภาค/ปลายภาค บันทึกทันทีลง state.examUi) */
function openScorePick(name, date, mode="weekly"){
  if(mode==="weekly" && !date){ openAssignmentModal(null); return; }   // ช่องว่างที่ยังไม่มีวันที่ -> เปิดหน้าเพิ่มวันที่
  state.score.pickCell = { name, date, mode };
  const cur = mode==="examBeh" ? (state.examUi.vals.get(name)?.beh ?? null) : currentScore(name, date);
  qs("#pickLabel").textContent = mode==="examBeh" ? `${name} · จิตพิสัย (${period.type})` : `${name} · ${fmtLong(date)}`;
  qsa("#scorePickGrid button").forEach(b=> b.classList.toggle("cur", cur!==null && Number(b.dataset.v)===cur));
  const clr = qs("#scoreClearBtn"); if(clr) clr.style.display = (cur===null) ? "none" : "";     // มีคะแนนอยู่ถึงจะมีปุ่มลบ
  qs("#modalScorePick").classList.add("active");
}
qsa("#modalScorePick [data-close]").forEach(b=>b.addEventListener("click", ()=> qs("#modalScorePick").classList.remove("active")));
qsa("#scorePickGrid button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const { name, date, mode } = state.score.pickCell;
    const v = Number(btn.dataset.v);
    if(mode==="examBeh"){
      const rec = state.examUi.vals.get(name); if(rec){ rec.beh = v; state.examUi.dirty = true; }
      qs("#modalScorePick").classList.remove("active");
      refreshExamBehCircle(name); updateExamSaveBar();
      return;
    }
    const key = pendingKey(name, date);
    if(v === savedScore(name, date)) state.score.pending.delete(key);   // เท่าค่าเดิม ไม่ต้องบันทึกซ้ำ
    else state.score.pending.set(key, v);
    qs("#modalScorePick").classList.remove("active");
    renderScoreTable();
  });
});
/* ลบคะแนน: ถ้าเคยบันทึกไว้แล้ว -> ทำเครื่องหมายรอลบ (ลบจริงตอนกดบันทึกคะแนน) / ถ้าเพิ่งลงยังไม่บันทึก -> ยกเลิกเฉยๆ */
qs("#scoreClearBtn")?.addEventListener("click", ()=>{
  const { name, date, mode } = state.score.pickCell;
  if(mode==="examBeh"){
    const rec = state.examUi.vals.get(name); if(rec){ rec.beh = null; state.examUi.dirty = true; }
    qs("#modalScorePick").classList.remove("active");
    refreshExamBehCircle(name); updateExamSaveBar();
    return;
  }
  const key = pendingKey(name, date);
  if(savedScore(name, date)!==null) state.score.pending.set(key, null);
  else state.score.pending.delete(key);
  qs("#modalScorePick").classList.remove("active");
  renderScoreTable();
});

/* ================= TEACHING LOG ================= */
qs("#teachSaveBtn").addEventListener("click", async ()=>{
  const payload = {
    type:"addTeaching", term: period.term, ptype: period.type,
    level: qs("#teachRoom").value,
    subject: qs("#teachSubject").value.trim(),
    date: qs("#teachDate").value,
    observation: qs("#teachObs").value.trim(),
    solution: qs("#teachSolution").value.trim(),
    development: qs("#teachDev").value.trim()
  };
  if(!payload.level || !payload.subject || !payload.date){ toast("กรอกห้อง วิชา วันที่ให้ครบ"); return; }
  showSaving("กำลังบันทึกข้อมูล...");
  const res = await apiPost(payload);
  if(res.success){
    await loadAll();
    hideSaving();
    toast("บันทึกหลังการสอนแล้ว");
    ["teachSubject","teachObs","teachSolution","teachDev"].forEach(id=> qs("#"+id).value="");
    showView("view-home");
  } else { hideSaving(); toast(res.message || "บันทึกไม่สำเร็จ"); }
});

/* ================= ATTENDANCE REPORT (สรุปการมาเรียน) =================
   ข้อมูลการมาเรียนเก็บเป็นรายภาคเรียนเท่านั้น (ไม่แยกกลางภาค/ปลายภาค) — หน้านี้จึงกรองด้วย "ภาคเรียนที่" อย่างเดียว
   ไม่ใช้ inPeriod() ที่กรองประเภทด้วยเหมือนหน้าอื่นๆ */
const rep = { room:"", subject:"", start:"", periods:2, mode:"", dates:[], hoursWeek:0 };
const addDays = (iso, n) => { const d = new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return toISO(d); };
const wdOf = iso => new Date(iso+"T00:00:00").getDay();
const inTerm = r => sameStr(rget(r,"ภาคเรียนที่"), period.term);

/* วันที่ใน Act ของห้อง+วิชานี้ ที่อยู่ในช่วง 18 สัปดาห์นับจากวันที่เริ่ม (รวมทั้งกลางภาคและปลายภาค) */
function actDatesFor(room, subject, from){
  const end = addDays(from, GEN_WEEKS*7 - 1), set = new Set();
  state.activities.forEach(a=>{
    if(a["รายวิชา"]!==subject || a["ระดับชั้น"]!==room || !inTerm(a)) return;
    const k = dateKey(a["วันที่"]);
    if(k && k>=from && k<=end) set.add(k);
  });
  return [...set].sort();
}
/* จำระยะ "จำนวนคาบต่อสัปดาห์" ที่เคยกรอกไว้ต่อห้อง+วิชา ไว้ในเครื่อง เพื่อไม่ต้องพิมพ์ใหม่ทุกครั้ง */
const hoursKey = (room, subject) => `kc_hoursweek_${room}||${subject}`;
function loadHoursWeek(room, subject){
  try{ const v = localStorage.getItem(hoursKey(room, subject)); return v ? Number(v) : ""; }catch(e){ return ""; }
}
function saveHoursWeek(room, subject, v){
  try{
    if(v>0) localStorage.setItem(hoursKey(room, subject), String(v));
    else localStorage.removeItem(hoursKey(room, subject));
  }catch(e){}
}
/* เกณฑ์ มส. (หมดสิทธิ์สอบ): คาบต่อสัปดาห์ × 18 สัปดาห์ × 20% = คาบต่อสัปดาห์ × 3.6 (ปัดเศษตามหลักคณิตศาสตร์)
   ขาด+ลา "เกิน" ค่านี้ (ไม่ใช่เท่ากับ) ถึงจะติด มส. */
function msThreshold(hoursWeek){
  return hoursWeek>0 ? Math.round(hoursWeek * GEN_WEEKS * 0.2) : null;
}
function setRepPeriods(n){
  rep.periods = n;
  qsa("#repPeriods button").forEach(b => b.classList.toggle("on", Number(b.dataset.n)===n));
  qs("#repFieldB").style.display = n>=2 ? "" : "none";
  qs("#repFieldC").style.display = n>=3 ? "" : "none";
}
/* ตัดสินใจว่าจะใช้วันจาก Act หรือคำนวณเอง แล้วโชว์ให้ผู้ใช้เห็น */
function updateRepSource(){
  const room = qs("#repRoom").value, subject = qs("#repSubject").value, start = qs("#repStart").value;
  const note = qs("#repSourceNote"), box = qs("#repCalcBox");
  if(!room || !subject || !start){ note.style.display = "none"; box.style.display = "none"; rep.mode = ""; return; }
  const acts = actDatesFor(room, subject, start);
  note.style.display = "";
  if(acts.length){
    rep.mode = "act"; box.style.display = "none";
    note.innerHTML = `<b>ใช้วันที่จาก Act · ${acts.length} วัน</b><span>${fmtLong(acts[0])} → ${fmtLong(acts[acts.length-1])}</span>`;
  }else{
    rep.mode = "calc"; box.style.display = "";
    note.innerHTML = `<b>ไม่พบวันที่ใน Act ตั้งแต่วันนี้</b><span>ระบบจะคำนวณให้ ${GEN_WEEKS} สัปดาห์ · ระบุจำนวนคาบและวันสอนด้านล่าง</span>`;
  }
}
function fillRepHoursWeek(){
  const room = qs("#repRoom").value, subject = qs("#repSubject").value;
  qs("#repHoursWeek").value = (room && subject) ? loadHoursWeek(room, subject) : "";
}
qsa("#repPeriods button").forEach(b => b.addEventListener("click", ()=> setRepPeriods(Number(b.dataset.n))));
["#repRoom","#repSubject"].forEach(s => qs(s).addEventListener("change", ()=>{ updateRepSource(); fillRepHoursWeek(); }));
qs("#repStart").addEventListener("input", updateRepSource);

qs("#attendReportBtn").addEventListener("click", ()=>{
  const view = qs("#view-attend-report-setup");
  fillRoomSelects(view);
  const r = qs("#attendRoom").value, s = qs("#attendSubject").value;
  if(r){ qs("#repRoom").value = r; fillSubjectSelect(qs("#repRoom")); if(s) qs("#repSubject").value = s; }
  qs("#repStart").value = qs("#attendDate").value || todayISO();
  qs("#repDateB").value = ""; qs("#repDateC").value = "";
  setRepPeriods(rep.periods);
  fillRepHoursWeek();
  updateRepSource();
  showView("view-attend-report-setup");
});

qs("#repStartBtn").addEventListener("click", async ()=>{
  exitFocusMode();
  const room = qs("#repRoom").value, subject = qs("#repSubject").value.trim(), start = qs("#repStart").value;
  if(!room || !subject || !start){ toast("เลือกห้อง วิชา และวันที่เริ่มต้นให้ครบก่อนครับ"); return; }
  showSaving("กำลังโหลดข้อมูลการเช็คชื่อ...");
  await loadAll();                       // ดึง Act + การเช็คชื่อล่าสุด
  hideSaving();
  updateRepSource();
  let dates;
  if(rep.mode === "act"){
    dates = actDatesFor(room, subject, start);
  }else{
    const raw = [start, qs("#repDateB").value, qs("#repDateC").value].slice(0, rep.periods);
    const err = genDaysError(raw);
    if(err){ toast(err); return; }
    // B, C = วันในสัปดาห์เดียวกับที่เลือก แต่ขยับให้อยู่ในสัปดาห์แรกที่นับจากวันเริ่ม
    const bases = raw.map((d,i)=> i===0 ? d : addDays(start, (wdOf(d)-wdOf(start)+7)%7));
    dates = buildHeaderDates(bases);
  }
  const hoursWeek = Math.max(0, numOrNull(qs("#repHoursWeek").value) ?? 0);
  saveHoursWeek(room, subject, hoursWeek);
  Object.assign(rep, { room, subject, start, dates, hoursWeek });
  qs("#repHeadSub").textContent = `${room} · ${subject}`;
  renderPeriodBars();
  renderRepTable();
  showView("view-attend-report");
});

function renderRepTable(){
  const wrap = qs("#repTableWrap"), msBox = qs("#repMsWarn");
  const roster = scoreRoster(rep.room);
  if(roster.length===0){ wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; qs("#repInfo").textContent = ""; msBox.style.display = "none"; return; }

  const toSet = v => new Set(String(v||"").split(",").map(s=>s.trim()).filter(Boolean));
  const recs = new Map();   // วันที่ -> { absent, leave, late } (ถ้าเช็คซ้ำวันเดียวกัน ใช้อันล่าสุด)
  state.attendance.forEach(a=>{
    if(!sameStr(a["ระดับชั้น"],rep.room) || !sameStr(a["รายวิชา"],rep.subject) || !inTerm(a)) return;
    const k = dateKey(a["วันที่"]); if(!k) return;
    recs.set(k, { absent:toSet(a["ขาดเรียน"]), leave:toSet(a["ลา"]), late:toSet(a["สาย"]) });
  });
  const statusOf = (name, d) => {
    const r = recs.get(d); if(!r) return "none";
    return r.absent.has(name) ? "absent" : r.leave.has(name) ? "leave" : r.late.has(name) ? "late" : "present";
  };
  const LBL = { present:"✓", absent:"ขาด", leave:"ลา", late:"สาย", none:"·" };
  const today = todayISO();
  const threshold = msThreshold(rep.hoursWeek);

  let thead = `<tr><th class="name-head">ชื่อ</th><th class="sum">ขาด</th><th class="sum">ลา</th><th class="sum">สาย</th>` +
    rep.dates.map(d=>`<th class="${d===today?"today-col":""}">${fmtShort(d)}<small class="wd">${fmtWd(d)}</small></th>`).join("") + `</tr>`;
  let rows = "";
  const msNames = [];
  roster.forEach(st=>{
    const cnt = { absent:0, leave:0, late:0 };
    const cells = rep.dates.map(d=>{
      const s = statusOf(st.label, d);
      if(cnt[s]!==undefined) cnt[s]++;
      return `<td><span class="ar ar-${s}">${LBL[s]}</span></td>`;
    }).join("");
    const sum = k => `<td class="sum"><b class="s-${k} ${cnt[k]?"on":""}">${cnt[k]}</b></td>`;
    const overMs = threshold!=null && (cnt.absent + cnt.leave) > threshold;
    if(overMs) msNames.push(st.label);
    rows += `<tr class="${overMs?"ms-row":""}"><td class="name-cell">${snum(st.no)}${esc(st.label)}${overMs?'<span class="ms-badge">มส.</span>':""}</td>${sum("absent")}${sum("leave")}${sum("late")}${cells}</tr>`;
  });
  wrap.innerHTML = `<table class="score-table"><thead>${thead}</thead><tbody>${rows}</tbody></table>`;

  const checked = rep.dates.filter(d=>recs.has(d)).length;
  qs("#repInfo").textContent = `${roster.length} คน · เช็คแล้ว ${checked}/${rep.dates.length} วัน` +
    (threshold!=null ? ` · เกณฑ์ มส. > ${threshold} ครั้ง (ขาด+ลา)` : "");

  if(msNames.length){
    msBox.style.display = "";
    msBox.innerHTML = `⚠ ${msNames.length} คน ขาด+ลา เกิน ${threshold} ครั้ง เข้าเกณฑ์ <b>มส. (หมดสิทธิ์สอบ)</b>: ${msNames.map(esc).join(", ")}`;
  } else {
    msBox.style.display = "none";
  }
}

/* ================= TABS ในหน้าลงคะแนน: งาน/จิตพิสัย 1-5  |  คะแนนสอบ ================= */
function setScoreTab(tab){
  state.score.tab = tab;
  qsa("#scoreTabs [data-tab]").forEach(b=> b.classList.toggle("on", b.dataset.tab===tab));
  const beh = tab==="beh";
  qs("#behPane").style.display = beh ? "" : "none";
  qs("#examPane").style.display = beh ? "none" : "";
  if(!_reduceMotion){ const p = qs(beh ? "#behPane" : "#examPane"); p.classList.remove("pane-in"); void p.offsetWidth; p.classList.add("pane-in"); setTimeout(()=>p.classList.remove("pane-in"), 480); }
  qs("#scoreSaveBtn").style.display = beh ? "" : "none";
  qs("#examSaveBtn").style.display = beh ? "none" : "";
}
qsa("#scoreTabs [data-tab]").forEach(b=> b.addEventListener("click", ()=> setScoreTab(b.dataset.tab)));

/* ================= คะแนนสอบ (ปรนัย / อัตนัย) ================= */
const findExamSetup = (term, type, room, subject) => state.examSetup.find(r =>
  sameStr(r["ภาคเรียนที่"],term) && sameStr(r["ประเภท"],type) && sameStr(r["รายวิชา"],subject) && sameStr(r["ระดับชั้น"],room));
const findExamRow = (term, type, room, subject, name) => state.examRows.find(r =>
  sameStr(r["ภาคเรียนที่"],term) && sameStr(r["ประเภท"],type) && sameStr(r["รายวิชา"],subject) && sameStr(r["ระดับชั้น"],room) && sameStr(r["ชื่อ"],name));
const fmtNum = n => String(Math.round(n*100)/100);

/* สัดส่วนคะแนนสอบ: ปรนัย/อัตนัยแต่ละส่วนเทียบบัญญัติไตรยางศ์เข้ากับ "สัดส่วนที่นับ"
   เช่น ปรนัยเต็ม 20 อัตนัยเต็ม 10 ตั้งสัดส่วน 10:10 -> ได้ปรนัย 15/20 = 7.5, อัตนัย 8/10 = 8 -> รวม 15.5 จาก 20
   ถ้าไม่ใส่สัดส่วน (ว่าง) ใช้คะแนนเต็มเดิมเป็นสัดส่วน = บวกคะแนนดิบเหมือนเดิม */
function examWeights(fm, fe, wm, we){
  const pm = wm!==null && wm!==undefined ? wm : (fm||0);
  const pe = we!==null && we!==undefined ? we : (fe||0);
  return { pm, pe, full: pm + pe, custom: (wm!==null && wm!==undefined) || (we!==null && we!==undefined) };
}
function examWeighted(mc, es, fm, fe, pm, pe){
  const part = (v, f, p) => (v!==null && v!==undefined && f>0) ? v / f * p : 0;
  return part(mc, fm, pm) + part(es, fe, pe);
}

/* โหลดคะแนนสอบที่บันทึกไว้ของ (ภาคเรียน + ประเภทที่เลือก + ห้อง + วิชา) เข้ามาในหน้าจอ */
function loadExamUi(){
  const { room, subject } = state.score, u = state.examUi;
  if(!room || !subject) return;
  const s = findExamSetup(period.term, period.type, room, subject);
  u.mc = numOrNull(s?.["คะแนนเต็มปรนัย"]) ?? "";
  u.es = numOrNull(s?.["คะแนนเต็มอัตนัย"]) ?? "";
  u.wmc = numOrNull(s?.["สัดส่วนปรนัย"]) ?? "";
  u.wes = numOrNull(s?.["สัดส่วนอัตนัย"]) ?? "";
  u.fb = numOrNull(s?.["คะแนนเต็มจิตพิสัย"]) ?? "";
  u.setupOpen = undefined;     // ให้ renderExam ตัดสินใหม่ว่าจะกาง/พับกล่องคะแนนเต็ม
  u.vals = new Map();
  scoreRoster(room).forEach(st=>{
    const r = findExamRow(period.term, period.type, room, subject, st.key);
    u.vals.set(st.key, { beh: numOrNull(r?.["จิตพิสัย"]), mc: numOrNull(r?.["ปรนัย"]), es: numOrNull(r?.["อัตนัย"]) });
  });
  u.dirty = false;
}

function renderExam(){
  const box = qs("#examSetupBox"), wrap = qs("#examWrap"), u = state.examUi;
  const roster = scoreRoster(state.score.room);
  if(roster.length===0){ box.innerHTML = ""; wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; updateExamSaveBar(); return; }
  // ตั้งคะแนนเต็มไว้แล้ว = พับกล่องเก็บ (ให้ตารางลงคะแนนได้พื้นที่เต็ม) / ยังไม่เคยตั้ง = กางไว้ให้กรอก
  if(u.setupOpen===undefined) u.setupOpen = (u.mc==="" && u.es==="" && u.fb==="");
  box.innerHTML = `
    <div class="exam-setup ${u.setupOpen?"open":""}" id="examSetupCard">
      <button type="button" class="ex-head" id="examSetupToggle">
        <span class="ex-head-t">📐 คะแนนเต็ม${esc(period.type)}</span>
        <span class="ex-chips" id="examChips"></span>
        <span class="ex-caret">▾</span>
      </button>
      <div class="ex-body">
        <div class="ex-grid ex-g4">
          <label>จิตพิสัย<input id="examFullBeh" type="number" inputmode="decimal" min="0" step="any" placeholder="เต็ม" value="${esc(u.fb)}"></label>
          <label>ปรนัย<input id="examFullMc" type="number" inputmode="decimal" min="0" step="any" placeholder="เต็ม" value="${esc(u.mc)}"></label>
          <label>อัตนัย<input id="examFullEs" type="number" inputmode="decimal" min="0" step="any" placeholder="เต็ม" value="${esc(u.es)}"></label>
          <div class="ex-sum"><span>สอบเต็ม</span><b id="examFullTot">—</b></div>
        </div>
        <div class="ex-sub">สัดส่วนคะแนนสอบที่นับรวม <small>(เว้นว่าง = ใช้คะแนนเต็มเดิม · เช่น เต็ม 20/10 อยากนับ 10:10 ให้ใส่ 10 กับ 10)</small></div>
        <div class="ex-grid">
          <label>ปรนัย นับเป็น<input id="examWMc" type="number" inputmode="decimal" min="0" step="any" placeholder="เท่าเต็ม" value="${esc(u.wmc)}"></label>
          <label>อัตนัย นับเป็น<input id="examWEs" type="number" inputmode="decimal" min="0" step="any" placeholder="เท่าเต็ม" value="${esc(u.wes)}"></label>
          <div class="ex-sum"><span>รวมนับ</span><b id="examWTot">—</b></div>
        </div>
      </div>
    </div>`;
  let rows = "";
  roster.forEach(st=>{
    const v = u.vals.get(st.key) || { beh:null, mc:null, es:null };
    rows += `<tr data-name="${esc(st.key)}"><td class="name-cell">${snum(st.no)}${esc(st.label)}</td>
      <td><input class="exam-in" data-k="beh" type="number" inputmode="decimal" step="any" value="${v.beh===null?"":v.beh}"></td>
      <td><input class="exam-in" data-k="mc" type="number" inputmode="decimal" min="0" step="any" value="${v.mc===null?"":v.mc}"></td>
      <td><input class="exam-in" data-k="es" type="number" inputmode="decimal" min="0" step="any" value="${v.es===null?"":v.es}"></td>
      <td class="exam-tot"></td></tr>`;
  });
  wrap.innerHTML = `<table class="score-table exam-table"><thead><tr><th class="name-head">ชื่อ</th><th>จิตพิสัย<small class="wd" id="behHeadFull"></small></th><th>ปรนัย</th><th>อัตนัย</th><th>รวม<small class="wd" id="examTotFull"></small></th></tr></thead><tbody>${rows}</tbody></table>
    <div class="hint" style="padding:10px 12px 0;">จิตพิสัยพิมพ์คะแนนเองได้ (ใส่เกินคะแนนเต็มได้เล็กน้อยเพื่อปัดคะแนน — ช่องจะเป็นสีเหลือง) · ปรนัย/อัตนัย ช่องสีแดง = เกินคะแนนเต็ม · รวมปัดเป็นจำนวนเต็ม · กด "บันทึกคะแนนสอบ" ด้านล่างครั้งเดียว</div>`;
  refreshExamCalc();
}
/* คำนวณรวม/ตรวจเกินคะแนนเต็มโดยไม่วาดตารางใหม่ (ไม่ให้แป้นพิมพ์หลุด) */
function refreshExamCalc(){
  const u = state.examUi, fm = numOrNull(u.mc), fe = numOrNull(u.es), fb = numOrNull(u.fb);
  const W = examWeights(fm, fe, numOrNull(u.wmc), numOrNull(u.wes));
  const tot = qs("#examFullTot"); if(tot) tot.textContent = (fm===null && fe===null) ? "—" : fmtNum((fm||0)+(fe||0));
  const wtot = qs("#examWTot"); if(wtot) wtot.textContent = W.full>0 ? fmtNum(W.full) : "—";
  const chips = qs("#examChips");
  if(chips){
    const parts = [];
    if(fb!==null) parts.push(`จิต ${fmtNum(fb)}`);
    if(fm!==null) parts.push(`ปรนัย ${fmtNum(fm)}`);
    if(fe!==null) parts.push(`อัตนัย ${fmtNum(fe)}`);
    chips.textContent = parts.length ? parts.join(" · ") : "ยังไม่ได้ตั้ง · แตะเพื่อตั้งคะแนนเต็ม";
  }
  const bh = qs("#behHeadFull"); if(bh) bh.textContent = fb!==null ? `เต็ม ${fmtNum(fb)}` : "";
  const th = qs("#examTotFull"); if(th) th.textContent = W.full>0 ? `เต็ม ${fmtNum(W.full)}` : "";
  let filled = 0;
  qsa("#examWrap tr[data-name]").forEach(tr=>{
    const v = u.vals.get(tr.dataset.name) || { beh:null, mc:null, es:null };
    const over = (val, full) => val!==null && (val<0 || (full!==null && val>full));
    qs('[data-k="mc"]', tr).classList.toggle("over", over(v.mc, fm));
    qs('[data-k="es"]', tr).classList.toggle("over", over(v.es, fe));
    const be = qs('[data-k="beh"]', tr);
    be.classList.toggle("over", v.beh!==null && v.beh<0);                                 // ติดลบ = แดง
    be.classList.toggle("plus", v.beh!==null && v.beh>=0 && fb!==null && v.beh>fb);       // เกินเต็ม = เหลือง (อนุญาต ใช้ปัดคะแนน)
    const has = v.mc!==null || v.es!==null;
    if(has || v.beh!==null) filled++;
    const raw = W.custom ? examWeighted(v.mc, v.es, fm, fe, W.pm, W.pe) : (v.mc||0)+(v.es||0);
    qs(".exam-tot", tr).innerHTML = has ? `<b>${Math.round(raw + 1e-9)}</b>` : "";       // ปัดเศษแบบปกติ .5 ขึ้น ไม่เหลือทศนิยม
  });
  const info = qs("#examInfo"); if(info) info.textContent = `${u.vals.size} คน · ลงแล้ว ${filled}`;
  updateExamSaveBar();
}
/* วาดใหม่แค่วงกลมจิตพิสัยช่องเดียว (กันตารางกระพริบ/แป้นพิมพ์หลุดตอนพิมพ์ปรนัย-อัตนัยอยู่) */
function refreshExamBehCircle(name){
  const v = state.examUi.vals.get(name); if(!v) return;
  const el = qs(`.beh-circle[data-name="${CSS.escape(name)}"]`); if(!el) return;
  el.className = `score-circle beh-circle ${v.beh===null ? "" : `filled v${v.beh}`}`;
  el.textContent = v.beh===null ? "" : v.beh;
}
function updateExamSaveBar(){ const b = qs("#examSaveBtn"); if(b) b.disabled = !state.examUi.dirty; }

qs("#examSetupBox").addEventListener("input", e=>{
  const u = state.examUi;
  if(e.target.id==="examFullMc") u.mc = e.target.value;
  else if(e.target.id==="examFullEs") u.es = e.target.value;
  else if(e.target.id==="examFullBeh") u.fb = e.target.value;
  else if(e.target.id==="examWMc") u.wmc = e.target.value;
  else if(e.target.id==="examWEs") u.wes = e.target.value;
  else return;
  u.dirty = true; refreshExamCalc();
});
qs("#examSetupBox").addEventListener("click", e=>{      // พับ/กางกล่องคะแนนเต็ม (ไม่วาดตารางใหม่)
  if(!e.target.closest("#examSetupToggle")) return;
  const c = qs("#examSetupCard"), body = c.querySelector(".ex-body");
  const opening = !c.classList.contains("open") || c.classList.contains("collapsing");
  state.examUi.setupOpen = opening;
  if(_reduceMotion || !body.animate){ c.classList.toggle("open"); return; }
  if(c._anim){ c._anim.onfinish = null; c._anim.cancel(); }
  c.classList.remove("collapsing");
  const pb = getComputedStyle(body).paddingBottom;
  body.style.overflow = "hidden";
  const endAnim = ()=>{ body.style.overflow = ""; c._anim = null; };
  if(opening){
    c.classList.add("open");
    const h = body.scrollHeight;
    c._anim = body.animate([{ height:"0px", paddingBottom:"0px", opacity:0 }, { height:h+"px", paddingBottom:pb, opacity:1 }], { duration:420, easing:"cubic-bezier(.22,1,.36,1)" });
    c._anim.onfinish = endAnim;
  } else {
    const h = body.offsetHeight;
    c.classList.add("collapsing");
    c._anim = body.animate([{ height:h+"px", paddingBottom:pb, opacity:1 }, { height:"0px", paddingBottom:"0px", opacity:0 }], { duration:300, easing:"cubic-bezier(.4,0,.2,1)", fill:"forwards" });
    const a = c._anim;
    a.onfinish = ()=>{ c.classList.remove("open","collapsing"); a.cancel(); endAnim(); };
  }
});
qs("#examWrap").addEventListener("input", e=>{
  const inp = e.target.closest(".exam-in"); if(!inp) return;
  const tr = inp.closest("tr"), v = state.examUi.vals.get(tr.dataset.name); if(!v) return;
  v[inp.dataset.k] = numOrNull(inp.value);
  state.examUi.dirty = true; refreshExamCalc();
});
qs("#examSaveBtn").addEventListener("click", async ()=>{
  const u = state.examUi, { room, subject } = state.score;
  const fm = numOrNull(u.mc), fe = numOrNull(u.es), fb = numOrNull(u.fb);
  let bad = false;
  u.vals.forEach(v=>{
    if(v.beh!==null && v.beh<0) bad = true;      // จิตพิสัยเกินเต็มได้ (ปัดคะแนน) แต่ห้ามติดลบ
    if(v.mc!==null && (v.mc<0 || fm===null || v.mc>fm)) bad = true;
    if(v.es!==null && (v.es<0 || fe===null || v.es>fe)) bad = true;
  });
  if(bad){ toast("มีคะแนนเกินคะแนนเต็ม หรือยังไม่ได้ใส่คะแนนเต็ม — ตรวจช่องสีแดงก่อนครับ"); return; }
  const wm = numOrNull(u.wmc), we = numOrNull(u.wes);
  if((wm!==null && wm<0) || (we!==null && we<0)){ toast("สัดส่วนคะแนนต้องไม่ติดลบครับ"); return; }
  const items = [...u.vals].map(([name, v]) => ({ name, beh:v.beh, mc:v.mc, es:v.es }));
  qs("#examSaveBtn").disabled = true;
  showSaving("กำลังบันทึกคะแนนสอบ...");
  const res = await apiPost({ type:"saveExam", term:period.term, ptype:period.type, subject, level:room, fullMc:fm, fullEs:fe, wMc:wm, wEs:we, fullBeh:fb, items });
  if(res.success){
    await loadAll();
    loadExamUi(); renderExam();
    hideSaving();
    toast("บันทึกคะแนนสอบแล้ว ✓");
  } else if(res.network){
    // เน็ตสะดุดตอนรอผล แต่ saveExam เป็น upsert — โหลดชีทมาเช็คก่อนว่าบันทึกไปแล้วจริงหรือยัง
    await loadAll();
    const s = findExamSetup(period.term, period.type, room, subject);
    const ok = s && numOrNull(s["คะแนนเต็มปรนัย"])===fm && numOrNull(s["คะแนนเต็มอัตนัย"])===fe && numOrNull(s["สัดส่วนปรนัย"])===wm && numOrNull(s["สัดส่วนอัตนัย"])===we && numOrNull(s["คะแนนเต็มจิตพิสัย"])===fb;
    hideSaving();
    if(ok){ loadExamUi(); renderExam(); toast("การเชื่อมต่อสะดุดแต่บันทึกสำเร็จแล้ว ✓ (ตรวจกับชีทให้แล้ว)"); }
    else { updateExamSaveBar(); toast(res.message || "บันทึกไม่สำเร็จ"); }
  } else { hideSaving(); updateExamSaveBar(); toast(res.message || "บันทึกไม่สำเร็จ"); }
});

/* ================= สรุปคะแนน + ตัดเกรด ================= */
const GRADES = [[80,"4"],[75,"3.5"],[70,"3"],[65,"2.5"],[60,"2"],[55,"1.5"],[50,"1"]];
const PASS_MIN = GRADES[GRADES.length-1][0];   // คะแนนรวมต่ำสุดที่ได้เกรด 1 (= 50) — ใช้คำนวณคะแนนปลายภาคเมื่อแก้ 0 → 1
const gradeOf = n => { for(const [min,g] of GRADES) if(n>=min) return g; return "0"; };
const WDEFAULT = { work:40, beh:10, mid:20, fin:30 };
const WLABEL = { work:"งาน / คะแนนเก็บ", beh:"จิตพิสัย", mid:"สอบกลางภาค", fin:"สอบปลายภาค" };
const wKey = () => `kc_weights|${period.term}|${state.score.room}|${state.score.subject}`;
function loadWeights(){
  try{ const w = JSON.parse(localStorage.getItem(wKey())); if(w) return { ...WDEFAULT, ...w }; }catch(e){}
  return { ...WDEFAULT };
}
function saveWeights(w){ try{ localStorage.setItem(wKey(), JSON.stringify(w)); }catch(e){} }
const fmt1 = n => String(Math.round(n*10)/10);

function computeSummary(w, ov){
  const { room, subject } = state.score, term = period.term;
  const roster = scoreRoster(room);
  const T = s => String(s ?? "").trim();

  // หัวคะแนนที่มีชื่องาน = "งาน" (จิตพิสัยไม่ใช้หัวคะแนนรายวันแล้ว — กรอกคะแนนเองในแท็บคะแนนสอบ)
  const cols = [], seen = new Set();
  state.activities.forEach(a=>{
    if(!sameStr(a["รายวิชา"],subject) || !sameStr(a["ระดับชั้น"],room) || !sameStr(a["ภาคเรียนที่"],term)) return;
    const d = dateKey(a["วันที่"]), t = T(a["ประเภท"]);
    if(!d || !TYPES.includes(t) || seen.has(t+"|"+d)) return;
    seen.add(t+"|"+d);
    if(T(a["งาน"])) cols.push({ t, d });
  });
  const smap = new Map();
  state.scores.forEach(s=>{
    if(!sameStr(s["ระดับชั้น"],room) || !sameStr(s["ภาคเรียนที่"],term)) return;
    const d = dateKey(s["วันที่"]), v = numOrNull(s["คะแนน"]);
    if(!d || v===null) return;
    smap.set(`${T(s["ประเภท"])}|${T(s["ชื่อ"])}|${d}`, v);
  });
  const sk = (c, st) => `${c.t}|${T(st.key)}|${c.d}`;
  // นับเฉพาะคอลัมน์ที่มีคนได้คะแนนแล้ว (ยังไม่ถึงวันสอนจะไม่ถูกนับเป็นคะแนนที่หายไป)
  const used = cols.filter(c => roster.some(st => smap.has(sk(c, st))));
  const usedWork = used.length;

  const full = {}, exW = {}, fb = {};
  TYPES.forEach(t=>{
    const s = findExamSetup(term, t, room, subject);
    const W = examWeights(numOrNull(s?.["คะแนนเต็มปรนัย"]), numOrNull(s?.["คะแนนเต็มอัตนัย"]), numOrNull(s?.["สัดส่วนปรนัย"]), numOrNull(s?.["สัดส่วนอัตนัย"]));
    full[t] = W.full;
    exW[t] = { fm: numOrNull(s?.["คะแนนเต็มปรนัย"]), fe: numOrNull(s?.["คะแนนเต็มอัตนัย"]), pm: W.pm, pe: W.pe };
    fb[t] = numOrNull(s?.["คะแนนเต็มจิตพิสัย"]);
    if(ov && ov.t===t && ov.fb!==undefined && ov.fb!==null) fb[t] = ov.fb;      // พรีวิวตอนยังไม่เคยตั้งคะแนนเต็มจิตพิสัย
  });
  // จิตพิสัย: สัดส่วน = คะแนนที่ได้ ÷ ผลรวมคะแนนเต็มจิตพิสัย (กลางภาค+ปลายภาค) × น้ำหนักจิตพิสัย — เหมือนวิธีของงาน
  const fbSum = TYPES.reduce((a,t)=> a + (fb[t]>0 ? fb[t] : 0), 0);
  // คะแนนเต็มที่ "ได้จริง" ของแต่ละครึ่งภาค (ใช้หาเปอร์เซ็นต์ข้างช่องรวม): งาน + จิตพิสัย + สอบ เฉพาะส่วนที่ตั้งค่าไว้แล้ว
  const maxOf = t => {
    const wk = usedWork ? used.filter(c=>c.t===t).length / usedWork * w.work : 0;
    const bh = (fbSum>0 && fb[t]>0) ? fb[t] / fbSum * w.beh : 0;
    const ex = full[t]>0 ? (t==="กลางภาค" ? w.mid : w.fin) : 0;
    return wk + bh + ex;
  };
  const maxm = maxOf("กลางภาค"), maxf = maxOf("ปลายภาค");

  // การมาเรียนทั้งภาคเรียน (ขาด+ลา) เทียบเกณฑ์ มส. = คาบ/สัปดาห์ × 18 × 20%
  const hw = Number(loadHoursWeek(room, subject)) || 0, threshold = msThreshold(hw);
  const toSet = v => new Set(String(v||"").split(",").map(s=>s.trim()).filter(Boolean));
  const recs = new Map();
  state.attendance.forEach(a=>{
    if(!sameStr(a["ระดับชั้น"],room) || !sameStr(a["รายวิชา"],subject) || !inTerm(a)) return;
    const k = dateKey(a["วันที่"]); if(!k) return;
    recs.set(k, { absent:toSet(a["ขาดเรียน"]), leave:toSet(a["ลา"]) });
  });

  const nameRows = studentsOfRoom(room);
  const rows = roster.map(st=>{
    const o = { st };
    o.bRaw = {};
    o.workm = 0; o.workf = 0;
    TYPES.forEach(t=>{
      const sum = used.filter(c=>c.t===t).reduce((a,c)=> a + (smap.get(sk(c,st))||0), 0);
      o["work"+TK[t]] = usedWork ? sum / (5*usedWork) * w.work : 0;
      const r = findExamRow(term, t, room, subject, st.key);
      let b = numOrNull(r?.["จิตพิสัย"]);
      if(ov && ov.name===st.key && ov.t===t) b = ov.v;
      o.bRaw[t] = b;
      o["beh"+TK[t]] = (fbSum>0 && fb[t]>0 && b!==null) ? b / fbSum * w.beh : 0;
      const mc = numOrNull(r?.["ปรนัย"]), es = numOrNull(r?.["อัตนัย"]);
      let ex = 0;
      if(full[t]>0 && (mc!==null || es!==null)){
        const sc = Math.round(examWeighted(mc, es, exW[t].fm, exW[t].fe, exW[t].pm, exW[t].pe) + 1e-9);   // คะแนนสอบปัดเป็นจำนวนเต็มเหมือนหน้าลงคะแนน
        ex = sc / full[t] * (t==="กลางภาค" ? w.mid : w.fin);
      }
      o["ex"+TK[t]] = ex;
    });
    o.mid = o.workm + o.behm + o.exm;
    o.fin = o.workf + o.behf + o.exf;
    o.total = o.mid + o.fin;
    o.r = Math.round(o.total + 1e-9);                       // ปัดเป็นจำนวนเต็มก่อนตัดเกรด
    o.grade = gradeOf(o.r);
    o.near = o.r >= 45 && o.r < 80 && o.r % 5 === 4;         // ขาดอีก 1 คะแนนจะได้เกรดสูงขึ้น (49, 54, 59, 64, 69, 74, 79)

    // สถานะ มส. / ติด 0 จากชีท Blocked (แยกตามภาคเรียน + ห้อง + วิชา)
    o.ms = blkFromRec(findBlocked(term, room, subject, st, "มส"));
    o.zero = blkFromRec(findBlocked(term, room, subject, st, "0"));
    o.gEff = (o.grade==="0" && o.zero.on && o.zero.fixed) ? "1" : o.grade;    // 0 ที่แก้แล้ว = เกรด 1
    // 0 ที่แก้แล้ว: คะแนนรวมใหม่ = 50 ⇒ คะแนนรวมปลายภาคที่ต้องกรอกในระบบโรงเรียน = 50 − คะแนนรวมกลางภาค
    o.zFix = o.grade==="0" && o.zero.on && o.zero.fixed;
    o.finNew = o.zFix ? Math.max(0, Math.round((PASS_MIN - o.mid)*10)/10) : null;
    o.pctm = maxm>0 ? o.mid / maxm * 100 : null;
    o.pctf = maxf>0 ? o.fin / maxf * 100 : null;
    o.pctfNew = (o.zFix && maxf>0) ? o.finNew / maxf * 100 : null;

    let ab = 0, lv = 0;
    recs.forEach(r=>{ if(r.absent.has(st.label)) ab++; else if(r.leave.has(st.label)) lv++; });
    o.al = ab + lv;
    o.over = threshold!=null && o.al > threshold;
    return o;
  });
  return { rows, usedWork, full, fb, fbSum, hw, threshold, maxm, maxf };
}

const wFoldOpen = () => { try{ return localStorage.getItem("kc_wFold")!=="0"; }catch(e){ return true; } };
function renderWeights(){
  const w = loadWeights(), box = qs("#sumWeights");
  const hw = loadHoursWeek(state.score.room, state.score.subject);
  box.innerHTML = `<details class="w-fold" id="wFold" ${wFoldOpen() ? "open" : ""}>
    <summary><span class="w-title">⚖️ สัดส่วนคะแนน (%) · ภาคเรียนที่ ${period.term}</span><span class="w-mini" id="wMini"></span></summary>
    <div class="w-body">
    <div class="w-grid">${Object.keys(WLABEL).map(k=>`<label><span>${WLABEL[k]}</span><input type="number" inputmode="decimal" min="0" step="any" data-w="${k}" value="${w[k]}"></label>`).join("")}</div>
    <div class="w-total" id="wTotal"></div>
    <div class="w-hours"><label><span>คาบ/สัปดาห์ <small>(ใช้หาเกณฑ์ มส. = ×18 สัปดาห์ ×20%)</small></span><input type="number" inputmode="numeric" min="0" step="1" data-hw="1" placeholder="เช่น 2" value="${hw===""?"":hw}"></label></div>
    <div class="hint" style="margin:8px 0 0;">งาน = หัวคะแนนที่ตั้งชื่องานไว้ · จิตพิสัย = คะแนนที่กรอกเองในแท็บคะแนนสอบ (เทียบกับคะแนนเต็มจิตพิสัย กลางภาค+ปลายภาค) · สอบ = (ปรนัย+อัตนัย ปัดเป็นจำนวนเต็ม) ÷ คะแนนเต็ม · แตะ ✎ ข้างช่องจิตเพื่อแก้คะแนนได้เลย</div>
    </div></details>`;
  qs("#wFold").addEventListener("toggle", e=>{ try{ localStorage.setItem("kc_wFold", e.target.open ? "1" : "0"); }catch(err){} });
}
function readWeights(){
  const w = {};
  qsa("#sumWeights [data-w]").forEach(i=>{ w[i.dataset.w] = Math.max(0, numOrNull(i.value) ?? 0); });
  return w;
}
qs("#sumWeights").addEventListener("input", e=>{
  if(e.target.dataset.hw!==undefined){ saveHoursWeek(state.score.room, state.score.subject, Math.max(0, numOrNull(e.target.value) ?? 0)); renderSumTable(); return; }
  if(!e.target.dataset.w) return;
  saveWeights(readWeights()); renderSumTable();
});

let sumCur = null;     // ผลสรุปล่าสุดที่วาดอยู่ (ให้ปุ่มดินสอ/ปุ่มเกรดอ้างถึง)
const msDisKey = st => `kc_msno|${period.term}|${state.score.room}|${state.score.subject}|${st.key}`;
const msDismissed = st => { try{ return localStorage.getItem(msDisKey(st))==="1"; }catch(e){ return false; } };
const setMsDismissed = (st, on) => { try{ on ? localStorage.setItem(msDisKey(st), "1") : localStorage.removeItem(msDisKey(st)); }catch(e){} };
const gCls = g => g==="มส" ? "gms" : "g" + String(g).replace(".","_");

/* ช่องเกรด: มส. → 0 → 1 (มส. แก้แล้วเกรดตามคะแนนจริง · 0 แก้แล้วได้สูงสุดเกรด 1 สีม่วง) */
function gradeCellHTML(o, i){
  let main, sub = "";
  if(o.ms.on && !o.ms.fixed){
    main = `<button type="button" class="gr gms gbtn" data-act="ms" data-i="${i}">มส.</button>`;
    sub = `<small class="gsub">แก้แล้ว → <b class="${gCls(o.gEff)}">${o.gEff}</b></small>`;
  } else if(o.grade==="0"){
    main = o.gEff==="1"
      ? `<button type="button" class="gr gfix gbtn" data-act="zerofix" data-i="${i}">1</button>`
      : `<button type="button" class="gr g0 gbtn" data-act="zero" data-i="${i}">0</button>`;
    sub = o.gEff==="1" ? `<small class="gsub fixed">แก้ 0 แล้ว</small>` : `<small class="gsub">แตะเพื่อแก้ 0</small>`;
  } else {
    main = `<span class="gr ${gCls(o.grade)}">${o.grade}</span>`;
    if(o.near) sub = `<small class="near-tag">อีก 1 → ${gradeOf(o.r+1)}</small>`;
  }
  if(o.ms.on && o.ms.fixed) sub += `<small class="gsub fixed">มส. แก้แล้ว</small>`;
  // ขาด+ลา เกินเกณฑ์ และยังไม่ได้ให้ มส. → ต้องพิจารณา
  if(o.over && !o.ms.on){
    sub += msDismissed(o.st)
      ? `<button type="button" class="chip-dis" data-act="consider" data-i="${i}">ไม่ให้ มส. · พิจารณาแล้ว</button>`
      : `<button type="button" class="chip-consider" data-act="consider" data-i="${i}">⚠ พิจารณา มส.</button>`;
  }
  return `<td class="gcell">${main}${sub}</td>`;
}

function renderSumTable(){
  const w = readWeights(), wrap = qs("#sumTableWrap");
  const wsum = Object.values(w).reduce((a,b)=>a+b, 0);
  const tot = qs("#wTotal");
  tot.className = "w-total " + (Math.abs(wsum-100) < 0.001 ? "ok" : "bad");
  const mini = qs("#wMini"); if(mini) mini.textContent = `งาน ${fmt1(w.work)} · จิต ${fmt1(w.beh)} · กลาง ${fmt1(w.mid)} · ปลาย ${fmt1(w.fin)}` + (Math.abs(wsum-100) < 0.001 ? "" : " ⚠");
  tot.innerHTML = Math.abs(wsum-100) < 0.001 ? `รวม <b>100</b>% ✓` : `รวม <b>${fmt1(wsum)}</b>% — ควรเป็น 100 (คะแนนเต็มจะเป็น ${fmt1(wsum)})`;

  const roster = scoreRoster(state.score.room);
  if(roster.length===0){ wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; qs("#sumStats").innerHTML = ""; return; }
  const S = computeSummary(w);
  sumCur = S;

  let head = `<tr class="r1"><th class="name-head" rowspan="2">ชื่อ</th><th colspan="5" class="g-mid">กลางภาค</th><th colspan="5" class="g-fin">ปลายภาค</th><th colspan="2" class="g-all">ทั้งภาค</th></tr>
    <tr class="r2"><th>งาน</th><th>จิต</th><th>สอบ</th><th class="tot">รวม</th><th class="pct">%</th><th>งาน</th><th>จิต</th><th>สอบ</th><th class="tot">รวม</th><th class="pct">%</th><th class="tot">รวม</th><th>เกรด</th></tr>`;
  let body = "";
  const dist = {}; let nearN = 0, considerN = 0;
  S.rows.forEach((o,i)=>{
    dist[(o.ms.on && !o.ms.fixed) ? "มส" : o.gEff] = (dist[(o.ms.on && !o.ms.fixed) ? "มส" : o.gEff]||0) + 1;
    if(o.near) nearN++;
    const consider = o.over && !o.ms.on && !msDismissed(o.st);
    if(consider) considerN++;
    const c = v => `<td>${fmt1(v)}</td>`, t = v => `<td class="tot">${fmt1(v)}</td>`;
    const beh = tp => {
      const raw = o.bRaw[tp], f = S.fb[tp];
      const rawTxt = raw!==null ? `<small class="braw">${fmtNum(raw)}${f>0 ? "/"+fmtNum(f) : ""}</small>` : "";
      return `<td class="behcell"><span class="bv">${fmt1(tp==="กลางภาค" ? o.behm : o.behf)}</span>${tp==="ปลายภาค" ? `<button type="button" class="pen" data-i="${i}" data-t="${tp}" title="แก้จิตพิสัย${tp}" aria-label="แก้จิตพิสัย${tp}">✎</button>` : ""}${rawTxt}</td>`;
    };
    /* เปอร์เซ็นต์ปัดขึ้นเป็นจำนวนเต็ม (กันเศษลอยตัวเลขเช่น 80.0000001 ไม่ให้ขึ้นเป็น 81) */
    const pctTxt = v => v===null ? "–" : Math.ceil(v - 1e-9) + "%";
    const pct = v => `<td class="pct">${pctTxt(v)}</td>`;
    // ติด 0 ที่แก้แล้ว: คะแนนเก่าขีดฆ่าสีแดง แล้วโชว์คะแนนใหม่ (ปลายภาค = 50 − กลางภาค · รวมทั้งภาค = 50)
    const chg = (oldTxt, newTxt) => `<s class="oldv">${oldTxt}</s><b class="newv">${newTxt}</b>`;
    const finCell = o.zFix ? `<td class="tot fixedv">${chg(fmt1(o.fin), fmt1(o.finNew))}</td>` : t(o.fin);
    const finPct = o.zFix ? `<td class="pct fixedv">${chg(pctTxt(o.pctf), pctTxt(o.pctfNew))}</td>` : pct(o.pctf);
    const grandCell = o.zFix ? `<td class="tot grand fixedv">${chg(o.r, PASS_MIN)}</td>` : `<td class="tot grand">${o.r}</td>`;
    body += `<tr class="${o.near?"near":""} ${consider?"consider":""}"><td class="name-cell">${snum(o.st.no)}${esc(o.st.label)}${o.over ? `<small class="al-tag">ขาด+ลา ${o.al}/${S.threshold}</small>` : ""}</td>
      ${c(o.workm)}${beh("กลางภาค")}${c(o.exm)}${t(o.mid)}${pct(o.pctm)}${c(o.workf)}${beh("ปลายภาค")}${c(o.exf)}${finCell}${finPct}
      ${grandCell}
      ${gradeCellHTML(o, i)}</tr>`;
  });
  wrap.innerHTML = `<table class="score-table sum-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;

  const notes = [];
  if(!S.usedWork) notes.push("ยังไม่มีคะแนนงาน (หัวคะแนนที่มีชื่องาน)");
  if(!S.fbSum) notes.push("ยังไม่ได้ตั้งคะแนนเต็มจิตพิสัย (ตั้งในแท็บคะแนนสอบ หรือแตะ ✎ ที่ช่องจิตปลายภาค)");
  TYPES.forEach(t=>{ if(!S.full[t]) notes.push(`ยังไม่ได้ตั้งคะแนนเต็มสอบ${t}`); });
  if(S.threshold==null) notes.push("ยังไม่ได้ใส่จำนวนคาบ/สัปดาห์ จึงยังตรวจเกณฑ์ มส. จากการขาด+ลาไม่ได้");
  const chips = ["4","3.5","3","2.5","2","1.5","1","0","มส"].filter(g=>dist[g]).map(g=>`<span class="gr ${gCls(g)}">${g==="มส"?"มส.":g}<i>×${dist[g]}</i></span>`).join("");
  renderSumChart(S);
  qs("#sumStats").innerHTML =
    `<div class="ss-row"><b>${S.rows.length}</b> คน ${chips}</div>` +
    (considerN ? `<div class="ss-consider">⚠ ${considerN} คน ขาด+ลา เกิน ${S.threshold} ครั้ง — ต้องพิจารณาว่าจะให้ มส. ไหม (แถวสีส้ม แตะปุ่ม "พิจารณา มส." ที่ช่องเกรด)</div>` : "") +
    (nearN ? `<div class="ss-near">⚡ ${nearN} คน ขาดอีก 1 คะแนนจะได้เกรดสูงขึ้น (แถวสีเหลือง)</div>` : "") +
    (notes.length ? `<div class="ss-warn">⚠ ${notes.join(" · ")}</div>` : "");
}

/* ---------- ป๊อปอัพกลาง (bottom sheet) ใช้กับแก้จิตพิสัย / แก้ มส. / แก้ 0 ---------- */
function closeSheet(){ qs("#modalSheetGen")?.classList.remove("active"); }
function openSheet({ title, who="", body="", actions=[] }){
  let m = qs("#modalSheetGen");
  if(!m){
    m = document.createElement("div"); m.className = "modal-backdrop"; m.id = "modalSheetGen";
    m.innerHTML = `<div class="modal-sheet"><h3 id="sgTitle"></h3><div class="pick-who" id="sgWho"></div><div id="sgBody"></div><div class="modal-actions" id="sgActions"></div></div>`;
    m.addEventListener("click", e=>{ if(e.target===m) closeSheet(); });
    document.body.appendChild(m);
  }
  qs("#sgTitle").textContent = title; qs("#sgWho").innerHTML = who; qs("#sgBody").innerHTML = body;
  const act = qs("#sgActions"); act.innerHTML = "";
  actions.forEach(a=>{
    const b = document.createElement("button"); b.type = "button"; b.className = "btn " + (a.cls || "btn-outline"); b.textContent = a.text;
    b.addEventListener("click", ()=>{ if(!a.keep) closeSheet(); if(a.fn) a.fn(); });
    act.appendChild(b);
  });
  m.classList.add("active");
}
const whoHTML = o => `${snum(o.st.no)}${esc(o.st.label)}`;

/* แก้จิตพิสัยจากหน้าสรุปได้ทันที — บันทึกลงชีท Exam (คอลัมน์ จิตพิสัย) เหมือนที่กรอกในแท็บคะแนนสอบ
   และมีพรีวิว "คะแนนรวม/เกรด" ให้เห็นก่อนกดบันทึก */
function openBehEdit(i, t){
  const S = sumCur, o = S && S.rows[i]; if(!o) return;
  const { room, subject } = state.score, key = o.st.key;
  const fbCur = S.fb[t], cur = o.bRaw[t];
  openSheet({
    title: `แก้จิตพิสัย · ${t}`, who: whoHTML(o),
    body: `<div class="beh-edit">
      <label><span>คะแนนจิตพิสัย ${fbCur>0 ? `<small>(เต็ม ${fmtNum(fbCur)} · ใส่เกินได้เล็กน้อยเพื่อปัดคะแนน)</small>` : ""}</span>
        <input id="beScore" type="number" inputmode="decimal" step="any" value="${cur===null?"":cur}" placeholder="คะแนนที่ได้"></label>
      ${fbCur>0 ? "" : `<label><span>คะแนนเต็มจิตพิสัย${t} <small>(ยังไม่เคยตั้ง · ใช้ทั้งห้อง)</small></span><input id="beFull" type="number" inputmode="decimal" min="0" step="any" placeholder="เช่น 10"></label>`}
      <div class="be-prev" id="bePrev"></div></div>`,
    actions: [
      { text:"ปิด", cls:"btn-outline" },
      { text:"บันทึก", cls:"btn-primary", keep:true, fn: async ()=>{
          const v = numOrNull(qs("#beScore").value), full = fbCur>0 ? fbCur : numOrNull(qs("#beFull")?.value);
          if(v!==null && v<0){ toast("คะแนนต้องไม่ติดลบครับ"); return; }
          if(v!==null && !(full>0)){ toast("ใส่คะแนนเต็มจิตพิสัยก่อนครับ"); return; }
          const s = findExamSetup(period.term, t, room, subject), r = findExamRow(period.term, t, room, subject, key);
          closeSheet(); showSaving("กำลังบันทึกจิตพิสัย...");
          const res = await apiPost({ type:"saveExam", term:period.term, ptype:t, subject, level:room,
            fullMc:numOrNull(s?.["คะแนนเต็มปรนัย"]), fullEs:numOrNull(s?.["คะแนนเต็มอัตนัย"]),
            wMc:numOrNull(s?.["สัดส่วนปรนัย"]), wEs:numOrNull(s?.["สัดส่วนอัตนัย"]),
            fullBeh: full>0 ? full : numOrNull(s?.["คะแนนเต็มจิตพิสัย"]),
            items:[{ name:key, beh:v, mc:numOrNull(r?.["ปรนัย"]), es:numOrNull(r?.["อัตนัย"]) }] });
          if(res && res.success){ await loadAll(); hideSaving(); renderSumTable(); toast("บันทึกจิตพิสัยแล้ว ✓"); }
          else { hideSaving(); toast((res && res.message) || "บันทึกไม่สำเร็จ"); }
      } }
    ]
  });
  const upd = ()=>{
    const v = numOrNull(qs("#beScore").value), fv = fbCur>0 ? undefined : numOrNull(qs("#beFull")?.value);
    const P = computeSummary(readWeights(), { name:key, t, v, fb:fv });
    const n = P.rows.find(x=> x.st.key===key); if(!n) return;
    qs("#bePrev").innerHTML = `คะแนนรวม <b>${n.r}</b> · เกรด <b class="${gCls(n.grade)}">${n.grade}</b>` + (n.r!==o.r || n.grade!==o.grade ? ` <small>(เดิม ${o.r} · ${o.grade})</small>` : ` <small>(ไม่เปลี่ยน)</small>`);
  };
  qs("#beScore").addEventListener("input", upd); qs("#beFull")?.addEventListener("input", upd);
  upd(); setTimeout(()=> qs("#beScore")?.focus(), 150);
}

/* เขียนสถานะ มส./ติด 0 ลงชีท Blocked (แยกรายวิชา) แล้ววาดตารางสรุปใหม่ */
async function sumSetStatus(o, key, opts, okMsg){
  const ok = await blkSave({ term:period.term, room:state.score.room, subject:state.score.subject, no:o.st.no, name:o.st.label }, BLK_FIELDS[key].kind, opts);
  if(!ok) return false;
  renderSumTable(); toast(okMsg);
  return true;
}

function openStatusSheet(i, act){
  const S = sumCur, o = S && S.rows[i]; if(!o) return;
  const who = whoHTML(o);
  const needFin = Math.max(0, Math.round((PASS_MIN - o.mid)*10)/10);
  if(act==="ms"){
    openSheet({ title:"มส. (หมดสิทธิ์สอบ)", who,
      body:`<p class="sg-p">ขาด+ลา <b>${o.al}</b> ครั้ง${S.threshold!=null ? ` (เกณฑ์ &gt; ${S.threshold})` : ""}<br>ถ้าแก้ มส. แล้ว เกรดจะเป็นตามคะแนนจริง = <b class="${gCls(o.gEff)}">${o.grade==="0" ? "0 (ยังต้องแก้ 0 ต่อ)" : o.grade}</b></p>
      <div class="sg-flow"><span class="on">มส.</span>→<span>${o.grade==="0"?"0":o.grade}</span>${o.grade==="0" ? "→<span>1</span>" : ""}</div>`,
      actions:[{ text:"ปิด" },
        { text:"ยกเลิก มส.", cls:"btn-danger", fn:()=> sumSetStatus(o, "ms", { remove:true }, `${o.st.label} · ยกเลิก มส. แล้ว`) },
        { text:"✓ แก้ มส. แล้ว", cls:"btn-primary", fn:()=> sumSetStatus(o, "ms", { fixed:true, oldTotal:o.r }, `${o.st.label} · แก้ มส. แล้ว`) }] });
  } else if(act==="zero"){
    openSheet({ title:"ติด 0", who,
      body:`<p class="sg-p">คะแนนรวม <b>${o.r}</b> → เกรด <b class="g0">0</b><br>แก้ 0 แล้วจะได้เกรด <b>1</b> (รวมทั้งภาค = <b>${PASS_MIN}</b>)<br>คะแนนรวมปลายภาคที่ต้องกรอกในระบบ = ${PASS_MIN} − กลางภาค ${fmt1(o.mid)} = <b>${fmt1(needFin)}</b><br><small>บันทึกลงชีท Blocked แยกตามรายวิชา</small></p>
      <div class="sg-flow"><span class="zero">0</span>→<span class="fix">1</span></div>`,
      actions:[{ text:"ปิด" }, { text:"✓ แก้ 0 → เกรด 1", cls:"btn-primary", fn:()=> sumSetStatus(o, "zero", { fixed:true, oldTotal:o.r, newFinal:needFin, newTotal:PASS_MIN }, `${o.st.label} · แก้ 0 → เกรด 1`) }] });
  } else if(act==="zerofix"){
    openSheet({ title:"แก้ 0 แล้ว (เกรด 1)", who,
      body:`<p class="sg-p">คะแนนจริงรวม <b>${o.r}</b> (เกรด 0) · แก้เป็นเกรด 1 แล้ว<br>คะแนนรวมปลายภาคที่ต้องกรอกในระบบ = <b>${fmt1(o.finNew ?? needFin)}</b> (รวมทั้งภาค ${PASS_MIN})</p>`,
      actions:[{ text:"ปิด" }, { text:"↩ ยกเลิกการแก้ 0", cls:"btn-danger", fn:()=> sumSetStatus(o, "zero", { remove:true }, `ยกเลิกการแก้ 0 ของ ${o.st.label} แล้ว`) }] });
  } else if(act==="consider"){
    const dis = msDismissed(o.st);
    openSheet({ title:"พิจารณา มส.", who,
      body:`<p class="sg-p">ขาด+ลา <b>${o.al}</b> ครั้ง เกินเกณฑ์ <b>${S.threshold}</b> ครั้ง<br><small>(20% ของ ${GEN_WEEKS} สัปดาห์ × ${S.hw} คาบ)</small><br>${dis ? "ตอนนี้: <b>พิจารณาแล้ว ไม่ให้ มส.</b>" : "จะให้ นร. คนนี้ มส. ไหม?"}</p>`,
      actions:[
        dis ? { text:"ล้างการพิจารณา", fn:()=>{ setMsDismissed(o.st, false); renderSumTable(); } }
            : { text:"ไม่ให้ มส.", fn:()=>{ setMsDismissed(o.st, true); renderSumTable(); toast(`${o.st.label} · ไม่ให้ มส.`); } },
        { text:"ให้ มส.", cls:"btn-danger", fn:()=>{ setMsDismissed(o.st, false); sumSetStatus(o, "ms", { fixed:false, oldTotal:o.r }, `${o.st.label} · ให้ มส. แล้ว`); } }
      ] });
  }
}
qs("#sumTableWrap").addEventListener("click", e=>{
  const pen = e.target.closest(".pen");
  if(pen){ openBehEdit(Number(pen.dataset.i), pen.dataset.t); return; }
  const b = e.target.closest("[data-act]"); if(!b) return;
  openStatusSheet(Number(b.dataset.i), b.dataset.act);
});
/* ================= กราฟการกระจายเกรด (SVG วาดเอง ไม่พึ่งไลบรารี) =================
   แกนเกรด 0,1,1.5,...,4 · เลือกแท่ง/วงกลม · สลับแกนได้ (เฉพาะแท่ง) · จำค่าที่เลือกไว้ในเครื่อง
   นับตามเกรดจริงหลังแก้ (0 ที่แก้แล้ว = เกรด 1) · มส. ที่ยังไม่แก้ไม่นับในกราฟ */
const CH_GRADES = ["0","1","1.5","2","2.5","3","3.5","4"];
const CH_COLORS = { "0":"#F08A8A", "1":"#F4B27A", "1.5":"#EFD06B", "2":"#B7D87B", "2.5":"#7FCC9B", "3":"#6CC3C2", "3.5":"#72A9EA", "4":"#9391EC" };
const chartPref = (()=>{ try{ return { type:"bar", swap:false, open:true, ...JSON.parse(localStorage.getItem("kc_chart")) }; }catch(e){ return { type:"bar", swap:false, open:true }; } })();
const saveChartPref = () => { try{ localStorage.setItem("kc_chart", JSON.stringify(chartPref)); }catch(e){} };
let chartAnim = true;
const cgId = g => "cg" + g.replace(".","_");

function chartNiceMax(m){
  const step = m<=5 ? 1 : m<=10 ? 2 : m<=25 ? 5 : m<=50 ? 10 : 20;
  return { step, top: Math.max(step, Math.ceil(m/step)*step) };
}
function chartDefs(){
  return `<defs>${CH_GRADES.map(g=>`<linearGradient id="${cgId(g)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CH_COLORS[g]}"/><stop offset="1" stop-color="${CH_COLORS[g]}" stop-opacity=".72"/></linearGradient>`).join("")}</defs>`;
}
function chartBarsV(cnt){
  const W=340, H=236, L=42, R=10, T=20, B=44, pw=W-L-R, ph=H-T-B;
  const { step, top } = chartNiceMax(Math.max(...CH_GRADES.map(g=>cnt[g])));
  const slot = pw/CH_GRADES.length, bw = slot*0.62;
  let grid = "";
  for(let v=0; v<=top; v+=step){
    const y = T + ph - v/top*ph;
    grid += `<line class="ch-grid" x1="${L}" x2="${W-R}" y1="${y}" y2="${y}"/><text class="ch-ax" x="${L-6}" y="${y+3.5}" text-anchor="end">${v}</text>`;
  }
  let bars = "";
  CH_GRADES.forEach((g,i)=>{
    const v = cnt[g], x = L + slot*i + (slot-bw)/2, h = v/top*ph, y = T + ph - h, r = Math.min(7, bw/2, h);
    const d = v>0 ? `M${x},${y+h} V${y+r} Q${x},${y} ${x+r},${y} H${x+bw-r} Q${x+bw},${y} ${x+bw},${y+r} V${y+h} Z` : "";
    bars += (v>0 ? `<path class="ch-bar ch-bar-v" style="animation-delay:${i*45}ms" d="${d}" fill="url(#${cgId(g)})"/>` : "") +
      `<text class="ch-val ${v?"":"zero"}" x="${x+bw/2}" y="${v>0 ? y-5 : T+ph-5}" text-anchor="middle">${v}</text>` +
      `<text class="ch-ax" x="${x+bw/2}" y="${T+ph+15}" text-anchor="middle">${g}</text>`;
  });
  return `<svg class="ch-svg ${chartAnim?"anim":""}" viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟแท่งจำนวนนักเรียนตามเกรด">${chartDefs()}${grid}
    <line class="ch-axis" x1="${L}" x2="${W-R}" y1="${T+ph}" y2="${T+ph}"/>${bars}
    <text class="ch-title" x="${L+pw/2}" y="${H-6}" text-anchor="middle">เกรด</text>
    <text class="ch-title" transform="translate(11 ${T+ph/2}) rotate(-90)" text-anchor="middle">จำนวนนักเรียน (คน)</text></svg>`;
}
function chartBarsH(cnt){
  const order = CH_GRADES.slice().reverse();                 // 4 อยู่บน → 0 อยู่ล่าง
  const W=340, rowH=25, L=40, R=30, T=8, B=40, pw=W-L-R, ph=rowH*order.length, H=T+ph+B;
  const { step, top } = chartNiceMax(Math.max(...CH_GRADES.map(g=>cnt[g])));
  let grid = "";
  for(let v=0; v<=top; v+=step){
    const x = L + v/top*pw;
    grid += `<line class="ch-grid" x1="${x}" x2="${x}" y1="${T}" y2="${T+ph}"/><text class="ch-ax" x="${x}" y="${T+ph+14}" text-anchor="middle">${v}</text>`;
  }
  let bars = "";
  order.forEach((g,i)=>{
    const v = cnt[g], y = T + rowH*i + 3.5, bh = rowH-7, w = v/top*pw, r = Math.min(7, bh/2, w);
    const d = v>0 ? `M${L},${y} H${L+w-r} Q${L+w},${y} ${L+w},${y+r} V${y+bh-r} Q${L+w},${y+bh} ${L+w-r},${y+bh} H${L} Z` : "";
    bars += (v>0 ? `<path class="ch-bar ch-bar-h" style="animation-delay:${i*45}ms" d="${d}" fill="${CH_COLORS[g]}"/>` : "") +
      `<text class="ch-ax" x="${L-7}" y="${y+bh/2+3.5}" text-anchor="end">${g}</text>` +
      `<text class="ch-val ${v?"":"zero"}" x="${L+w+5}" y="${y+bh/2+4}" text-anchor="start">${v}</text>`;
  });
  return `<svg class="ch-svg ${chartAnim?"anim":""}" viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟแท่งแนวนอนจำนวนนักเรียนตามเกรด">${grid}
    <line class="ch-axis" x1="${L}" x2="${L}" y1="${T}" y2="${T+ph}"/>${bars}
    <text class="ch-title" x="${L+pw/2}" y="${H-4}" text-anchor="middle">จำนวนนักเรียน (คน)</text>
    <text class="ch-title" transform="translate(9 ${T+ph/2}) rotate(-90)" text-anchor="middle">เกรด</text></svg>`;
}
function chartPie(cnt, total){
  const cx=110, cy=110, R=96, r0=56, sl = CH_GRADES.filter(g=>cnt[g]>0);
  let a0 = -Math.PI/2, slices = "";
  const pt = (rad, ang) => [cx + rad*Math.cos(ang), cy + rad*Math.sin(ang)];
  sl.forEach((g,i)=>{
    const frac = cnt[g]/total, a1 = a0 + frac*Math.PI*2;
    if(frac>=0.9999){
      slices += `<circle class="ch-slice" cx="${cx}" cy="${cy}" r="${(R+r0)/2}" fill="none" stroke="${CH_COLORS[g]}" stroke-width="${R-r0}"/>`;
    }else{
      const [x0,y0]=pt(R,a0), [x1,y1]=pt(R,a1), [x2,y2]=pt(r0,a1), [x3,y3]=pt(r0,a0), big = frac>0.5 ? 1 : 0;
      slices += `<path class="ch-slice" style="animation-delay:${i*60}ms" d="M${x0},${y0} A${R},${R} 0 ${big} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${big} 0 ${x3},${y3} Z" fill="${CH_COLORS[g]}"/>`;
    }
    if(frac>=0.07){ const [lx,ly]=pt((R+r0)/2,(a0+a1)/2); slices += `<text class="ch-pl" x="${lx}" y="${ly+3.5}" text-anchor="middle">${cnt[g]}</text>`; }
    a0 = a1;
  });
  const legend = sl.map(g=>`<li><i style="background:${CH_COLORS[g]}"></i><b>เกรด ${g}</b><span>${cnt[g]} คน · ${fmt1(cnt[g]/total*100)}%</span></li>`).join("");
  return `<div class="ch-pie"><svg class="ch-svg ch-pie-svg ${chartAnim?"anim":""}" viewBox="0 0 220 220" role="img" aria-label="กราฟวงกลมสัดส่วนเกรด">${slices}
    <text class="ch-center-n" x="${cx}" y="${cy+4}" text-anchor="middle">${total}</text><text class="ch-center-l" x="${cx}" y="${cy+22}" text-anchor="middle">คน</text></svg>
    <ul class="ch-legend">${legend}</ul></div>`;
}
function renderSumChart(S){
  const box = qs("#sumChart"); if(!box) return;
  const cnt = {}; CH_GRADES.forEach(g=>{ cnt[g]=0; });
  let ms = 0;
  S.rows.forEach(o=>{ if(o.ms.on && !o.ms.fixed){ ms++; return; } if(cnt[o.gEff]!==undefined) cnt[o.gEff]++; });
  const total = CH_GRADES.reduce((a,g)=>a+cnt[g],0), pie = chartPref.type==="pie";
  const body = total===0 ? `<div class="empty-note">ยังไม่มีข้อมูลเกรดให้แสดง</div>`
    : pie ? chartPie(cnt, total) : (chartPref.swap ? chartBarsH(cnt) : chartBarsV(cnt));
  box.innerHTML = `<details class="ch-fold" id="chFold" ${chartPref.open ? "open" : ""}>
    <summary><span class="w-title">📊 การกระจายเกรด</span><span class="w-mini">${total} คน</span></summary>
    <div class="ch-ctl">
      <div class="seg"><button type="button" data-ch="bar" class="${pie?"":"on"}">📊 แท่ง</button><button type="button" data-ch="pie" class="${pie?"on":""}">🍩 วงกลม</button></div>
      <label class="sw ${pie?"dis":""}"><input type="checkbox" data-chswap ${chartPref.swap?"checked":""} ${pie?"disabled":""}><span class="sw-track"></span>สลับแกน</label>
    </div>
    ${body}
    <div class="ch-note">นับตามเกรดหลังแก้ (0 ที่แก้แล้ว = เกรด 1)${ms ? ` · ไม่รวม มส. ${ms} คน` : ""}</div>
  </details>`;
  chartAnim = false;
}
qs("#sumChart")?.addEventListener("click", e=>{
  const b = e.target.closest("[data-ch]"); if(!b || chartPref.type===b.dataset.ch) return;
  chartPref.type = b.dataset.ch; saveChartPref(); chartAnim = true; if(sumCur) renderSumChart(sumCur);
});
qs("#sumChart")?.addEventListener("change", e=>{
  if(e.target.dataset.chswap===undefined) return;
  chartPref.swap = e.target.checked; saveChartPref(); chartAnim = true; if(sumCur) renderSumChart(sumCur);
});
qs("#sumChart")?.addEventListener("toggle", e=>{
  if(e.target.id==="chFold"){ chartPref.open = e.target.open; saveChartPref(); }
}, true);

function renderSummary(){
  chartAnim = true;
  qs("#sumHeadSub").textContent = `${state.score.room} · ${state.score.subject} · ภาคเรียนที่ ${period.term}`;
  renderWeights(); renderSumTable();
}
let sumBack = "view-scores-setup";
async function openSummary(room, subject, back){
  exitFocusMode();
  if(!room || !subject){ toast("เลือกห้องและวิชาก่อนครับ"); return; }
  if(state.score.room!==room || state.score.subject!==subject){
    state.score.room = room; state.score.subject = subject; state.score.pending = new Map(); state.examUi.dirty = false;
  }
  if(back==="view-scores-table" && scoreUnsaved()>0) toast("คะแนนที่ยังไม่ได้บันทึกจะยังไม่ถูกรวมในสรุป");
  sumBack = back;
  showSaving("กำลังโหลดคะแนนล่าสุด...");
  await loadAll();
  hideSaving();
  renderPeriodBars();
  renderSummary();
  showView("view-summary");
}
qs("#scoreSummaryBtn").addEventListener("click", ()=> openSummary(qs("#scoreRoom").value, qs("#scoreSubject").value.trim(), "view-scores-setup"));
qs("#openSummaryBtn").addEventListener("click", ()=> openSummary(state.score.room, state.score.subject, "view-scores-table"));
qs("#sumBackBtn").addEventListener("click", ()=> showView(sumBack));

renderPeriodBars();

/* ================= สรุปงานค้างนักเรียน (ไม่โชว์คะแนน ใช้ให้เด็กดูได้ว่ายังขาดงานอะไรบ้าง) ================= */
const pendOnlyMissing = () => { try{ return localStorage.getItem("kc_pendOnly")==="1"; }catch(e){ return false; } };
function renderPending(){
  const { room, subject } = state.score;
  qs("#pendHeadSub").textContent = `${room} · ${subject} · ภาคเรียนที่ ${period.term} · ${period.type}`;
  const acts = state.activities
    .filter(a=> sameStr(a["รายวิชา"],subject) && sameStr(a["ระดับชั้น"],room) && inPeriod(a) && dateKey(a["วันที่"]))
    .map(a=> ({ date: dateKey(a["วันที่"]), name: String(a["งาน"]||"").trim() }))
    .sort((x,y)=> x.date.localeCompare(y.date));
  const roster = scoreRoster(room);
  const wrap = qs("#pendTableWrap");
  if(roster.length===0){ wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; qs("#pendInfo").textContent = ""; return; }
  if(acts.length===0){ wrap.innerHTML = `<div class="empty-note">ยังไม่มีหัวคะแนนของวิชานี้ในภาคเรียน/ประเภทที่เลือก</div>`; qs("#pendInfo").textContent = ""; return; }

  let doneN = 0, shown = 0;
  const onlyMissing = pendOnlyMissing();
  const tg = qs("#pendOnly"); if(tg) tg.checked = onlyMissing;
  const rowsHtml = roster.map(st=>{
    const missing = acts.filter(a => savedScore(st.key, a.date) === null);
    if(missing.length===0) doneN++;
    if(onlyMissing && missing.length===0) return "";      // ติ๊ก "เฉพาะคนที่มีงานค้าง" → ซ่อนคนที่ครบแล้ว
    shown++;
    const chips = missing.map(a=> `<span class="pend-chip">${fmtLong(a.date)}${a.name ? ` · ${esc(a.name)}` : ""}</span>`).join("");
    return `<tr><td class="name-cell">${snum(st.no)}${esc(st.label)}</td>
      <td class="pend-cell">${missing.length ? chips : `<span class="pend-ok">✅ ครบแล้ว</span>`}</td></tr>`;
  }).join("");
  wrap.innerHTML = shown
    ? `<table class="score-table pend-table"><thead><tr><th class="name-head">ชื่อ</th><th>งานที่ค้าง</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
    : `<div class="empty-note">ทุกคนส่งงานครบแล้ว 🎉<br><small>(ปิดสวิตช์ "เฉพาะคนที่มีงานค้าง" เพื่อดูทั้งห้อง)</small></div>`;
  qs("#pendInfo").textContent = `${acts.length} งาน · ครบแล้ว ${doneN}/${roster.length} คน` + (onlyMissing ? ` · แสดง ${shown} คนที่ค้าง` : "");
}
qs("#pendOnly")?.addEventListener("change", e=>{ try{ localStorage.setItem("kc_pendOnly", e.target.checked ? "1" : "0"); }catch(err){} renderPending(); });
let pendBack = "view-scores-setup";
async function openPending(room, subject){
  exitFocusMode();
  if(!room || !subject){ toast("เลือกห้องและวิชาก่อนครับ"); return; }
  if(state.score.room!==room || state.score.subject!==subject){
    state.score.room = room; state.score.subject = subject; state.score.pending = new Map(); state.examUi.dirty = false;
  }
  showSaving("กำลังโหลดข้อมูลล่าสุด...");
  await loadAll();
  hideSaving();
  renderPeriodBars();
  renderPending();
  showView("view-pending");
}
qs("#scorePendingBtn").addEventListener("click", ()=> openPending(qs("#scoreRoom").value, qs("#scoreSubject").value.trim()));
qs("#pendBackBtn").addEventListener("click", ()=> showView(pendBack));

/* ================= รายชื่อ มส. / ติด 0 ทุกห้อง =================
   เก็บในชีท Blocked (แยกตาม ภาคเรียน + ห้อง + รายวิชา) · 1 แถว = นักเรียน 1 คน × ประเภท (มส / 0)
   สถานะ "รอแก้" / "แก้แล้ว" · ติด 0 ที่แก้แล้วเก็บ "คะแนนปลายภาคที่ต้องกรอก" (= 50 − รวมกลางภาค) ไว้ด้วย */
const BLK_FIELDS = {
  ms:   { kind:"มส", label:"มส.",   fixLabel:"ติ๊กว่าแก้ มส. แล้ว" },
  zero: { kind:"0",  label:"ติด 0", fixLabel:"ติ๊กว่าแก้ 0 แล้ว" }
};
const blk = { filter:"all", showFixed:false, items:[] };
const T2 = v => String(v ?? "").trim();

function findBlocked(term, room, subject, st, kind){
  return state.blocked.find(r =>
    sameStr(r["ภาคเรียนที่"],term) && sameStr(r["ระดับชั้น"],room) && sameStr(r["รายวิชา"],subject) &&
    T2(r["ชื่อ-สกุล"])===T2(st.label) && T2(r["เลขที่"])===T2(st.no) && T2(r["ประเภท"])===kind) || null;
}
const blkFromRec = rec => ({ on:!!rec, fixed: !!rec && T2(rec["สถานะ"])==="แก้แล้ว", rec });

/* บันทึก/ลบแถวในชีท Blocked แล้วอัปเดต state.blocked ในเครื่องทันที
   who = { term, room, subject, no, name } · opts = { fixed, remove, oldTotal, newFinal, newTotal } */
async function blkSave(who, kind, opts={}){
  showSaving("กำลังบันทึก...");
  const res = await apiPost({ type:"setBlocked", term:who.term, level:who.room, subject:who.subject, no:who.no, name:who.name, kind,
    fixed:!!opts.fixed, remove:!!opts.remove, oldTotal:opts.oldTotal ?? "", newFinal:opts.newFinal ?? "", newTotal:opts.newTotal ?? "" });
  hideSaving();
  if(!res || !res.success){ toast((res && res.message) || "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"); return false; }
  const same = r => sameStr(r["ภาคเรียนที่"],who.term) && sameStr(r["ระดับชั้น"],who.room) && sameStr(r["รายวิชา"],who.subject) &&
                    T2(r["ชื่อ-สกุล"])===T2(who.name) && T2(r["เลขที่"])===T2(who.no) && T2(r["ประเภท"])===kind;
  state.blocked = state.blocked.filter(r => !same(r));
  if(!opts.remove) state.blocked.push({ "ภาคเรียนที่":who.term, "ระดับชั้น":who.room, "รายวิชา":who.subject, "เลขที่":who.no, "ชื่อ-สกุล":who.name, "ประเภท":kind,
    "สถานะ": opts.fixed ? "แก้แล้ว" : "รอแก้", "คะแนนรวมเดิม":opts.oldTotal ?? "", "คะแนนปลายภาคที่ต้องกรอก":opts.newFinal ?? "", "คะแนนรวมใหม่":opts.newTotal ?? "", "วันที่แก้":"" });
  return true;
}

/* รวมรายการของภาคเรียนปัจจุบัน เป็น "นักเรียน 1 คน ต่อ 1 วิชา" จาก 2 แหล่ง:
   1) ชีท Blocked (มส. ที่ให้ไว้ / ติด 0 ที่แก้แล้ว)
   2) คำนวณจากคะแนนจริงของนักเรียนทุกคน ทุกห้อง ทุกวิชา — ใครเกรด 0 ขึ้นรายการเอง (ข้อมูลอยู่ในเครื่องแล้ว ไม่ต้องเรียกเน็ตเพิ่ม)
   วิชาที่ยังไม่ได้ตั้งคะแนนเต็มสอบปลายภาค ถือว่ายังไม่จบภาค จะไม่นับ (ไม่งั้นทุกคนจะเป็น 0 หมด) */
function blkCollect(){
  const map = new Map(), list = [];
  const getItem = (room, subject, no, name)=>{
    const sig = `${room}#${subject}#${no}#${name}`;
    let it = map.get(sig);
    if(!it){ it = { room, subject, no, name, ms:{on:false,fixed:false,rec:null}, zero:{on:false,fixed:false,rec:null} }; map.set(sig, it); list.push(it); }
    return it;
  };
  state.blocked.forEach(r=>{
    if(!sameStr(rget(r,"ภาคเรียนที่"), period.term)) return;
    const room = T2(r["ระดับชั้น"]), subject = T2(r["รายวิชา"]), name = T2(r["ชื่อ-สกุล"]), no = r["เลขที่"];
    const key = T2(r["ประเภท"])==="มส" ? "ms" : T2(r["ประเภท"])==="0" ? "zero" : "";
    if(!room || !name || !key) return;
    getItem(room, subject, no, name)[key] = blkFromRec(r);
  });

  // ไล่คิดเกรดทุกห้อง/วิชาที่มีข้อมูลในภาคเรียนนี้ (สลับ state.score ชั่วคราวเพื่อใช้ computeSummary ตัวเดิม แล้วคืนค่าเสมอ)
  const pairs = new Map();
  const addPair = (room, subject)=>{ if(room && subject) pairs.set(room+"#"+subject, { room, subject }); };
  state.activities.forEach(a=>{ if(sameStr(a["ภาคเรียนที่"], period.term)) addPair(T2(a["ระดับชั้น"]), T2(a["รายวิชา"])); });
  state.examSetup.forEach(a=>{ if(sameStr(a["ภาคเรียนที่"], period.term)) addPair(T2(a["ระดับชั้น"]), T2(a["รายวิชา"])); });
  const saveRoom = state.score.room, saveSub = state.score.subject;
  try{
    pairs.forEach(({room, subject})=>{
      if(!scoreRoster(room).length) return;
      state.score.room = room; state.score.subject = subject;
      const S = computeSummary(loadWeights());
      if(!(S.full["ปลายภาค"] > 0)) return;
      S.rows.forEach(o=>{
        if(o.grade!=="0") return;
        const it = getItem(room, subject, o.st.no, o.st.label);
        const calc = { oldTotal:o.r, newFinal:Math.max(0, Math.round((PASS_MIN - o.mid)*10)/10), newTotal:PASS_MIN };
        it.zero = { on:true, fixed:o.zero.fixed, rec:o.zero.rec, calc };
      });
    });
  }catch(e){ console.error(e); }
  finally{ state.score.room = saveRoom; state.score.subject = saveSub; }
  return list;
}

/* tag ที่จะแสดงของนักเรียนคนหนึ่ง ตามตัวกรองปัจจุบัน */
function blkVisibleKeys(it){
  return ["ms","zero"].filter(k => it[k].on && (blk.filter==="all" || blk.filter===k) && (blk.showFixed || !it[k].fixed));
}

function renderBlocked(){
  const all = blkCollect();
  const act = k => all.filter(x=> x[k].on && !x[k].fixed).length;
  const fixedN = all.reduce((n,x)=> n + (x.ms.on && x.ms.fixed ? 1 : 0) + (x.zero.on && x.zero.fixed ? 1 : 0), 0);
  qs("#blkFilters").innerHTML =
    `<button type="button" data-f="all" class="${blk.filter==="all"?"on":""}">ทั้งหมด ${act("ms")+act("zero")}</button>` +
    `<button type="button" data-f="ms" class="${blk.filter==="ms"?"on":""}">มส. ${act("ms")}</button>` +
    `<button type="button" data-f="zero" class="${blk.filter==="zero"?"on":""}">ติด 0 ${act("zero")}</button>` +
    `<button type="button" data-fixed="1" class="fx ${blk.showFixed?"on":""}">${blk.showFixed?"✓ ":""}แสดงที่แก้แล้ว ${fixedN}</button>`;

  const wrap = qs("#blkWrap");
  // เรียงห้องตามลำดับใน Config ก่อน ห้องอื่นที่เหลือต่อท้าย
  const rooms = uniqueRooms().slice();
  all.forEach(x=>{ if(!rooms.includes(x.room)) rooms.push(x.room); });
  blk.items = [];
  let html = "";
  rooms.forEach(room=>{
    const mine = all.filter(x=> x.room===room)
      .sort((p,q)=> p.subject.localeCompare(q.subject, "th") || (Number(p.no)||0)-(Number(q.no)||0))
      .filter(x=> blkVisibleKeys(x).length);
    if(!mine.length) return;
    const cMs = mine.filter(x=> blkVisibleKeys(x).includes("ms")).length;
    const cZero = mine.filter(x=> blkVisibleKeys(x).includes("zero")).length;
    let lastSub = null;
    const rows = mine.map(it=>{
      const idx = blk.items.push(it) - 1;
      const tags = blkVisibleKeys(it).map(k=>{
        const f = BLK_FIELDS[k], d = it[k];
        const finVal = k==="zero" ? (d.calc ? d.calc.newFinal : (d.rec ? T2(d.rec["คะแนนปลายภาคที่ต้องกรอก"]) : "")) : "";
        const newFin = finVal!=="" && finVal!==undefined ? ` · ปลายภาคกรอก ${esc(fmt1(Number(finVal)))}` : "";
        return `<div class="blk-tag ${k} ${d.fixed?"fixed":""}">
          <span class="blk-lbl">${f.label}${d.fixed ? " · แก้แล้ว" : ""}${newFin}</span>
          <button type="button" class="blk-act" data-act="${d.fixed?"undo":"fix"}" data-k="${k}" data-i="${idx}">${d.fixed ? "↩ ยกเลิก" : "✓ " + f.fixLabel}</button>
        </div>`;
      }).join("");
      const subHead = it.subject!==lastSub ? `<div class="blk-sub">📘 ${esc(it.subject || "(ไม่ระบุวิชา)")}</div>` : "";
      lastSub = it.subject;
      return `${subHead}<div class="blk-row"><div class="blk-who">${snum(it.no)}<span>${esc(it.name)}</span></div><div class="blk-tags">${tags}</div></div>`;
    }).join("");
    const parts = [cMs ? `มส. ${cMs}` : "", cZero ? `ติด 0 ${cZero}` : ""].filter(Boolean).join(" · ");
    html += `<div class="blk-room">
      <div class="blk-head"><div><b>${esc(room)}</b><small>${mine.length} รายการ · ${parts}</small></div>
      <button type="button" class="btn btn-outline btn-sm blk-copy" data-room="${esc(room)}">📋 คัดลอก</button></div>
      <div class="blk-list">${rows}</div></div>`;
  });
  wrap.innerHTML = html || `<div class="empty-note">${blk.showFixed || !fixedN ? "ยังไม่มีนักเรียนที่ติด มส. / ติด 0 ในภาคเรียนนี้ 🎉<br><small>(ติด 0 คิดจากคะแนนจริง เฉพาะวิชาที่ตั้งคะแนนเต็มสอบปลายภาคแล้ว)</small>" : "ไม่มีรายการค้างแล้ว 🎉<br>กด “แสดงที่แก้แล้ว” เพื่อดูย้อนหลัง"}</div>`;
}

/* คัดลอก: เฉพาะคนที่ "ยังไม่แก้" ตามตัวกรองปัจจุบัน แยกตามห้อง แล้วแยกตามวิชา
   รูปแบบ:  นักเรียนที่ติด 0 รายวิชา "..." ดังนี้  →  บรรทัดละ "เลขที่ ชื่อ-สกุล" (ไม่ใส่ชื่อวิชาซ้ำทุกคน) */
function blkCopyText(room){
  const mine = blkCollect().filter(x=> x.room===room)
    .sort((p,q)=> p.subject.localeCompare(q.subject, "th") || (Number(p.no)||0)-(Number(q.no)||0));
  const blocks = [];
  ["ms","zero"].forEach(k=>{
    if(!(blk.filter==="all" || blk.filter===k)) return;
    const bySub = new Map();
    mine.filter(x=> x[k].on && !x[k].fixed).forEach(x=>{ if(!bySub.has(x.subject)) bySub.set(x.subject, []); bySub.get(x.subject).push(x); });
    bySub.forEach((arr, sub)=>{
      blocks.push([`นักเรียนที่ติด ${BLK_FIELDS[k].label} รายวิชา "${sub}" ดังนี้`]
        .concat(arr.map(x=> `${x.no!==undefined && x.no!=="" ? x.no + " " : ""}${x.name}`)).join("\n"));
    });
  });
  return blocks.length ? room + "\n" + blocks.join("\n\n") : "";
}
async function copyToClipboard(text){
  try{ await navigator.clipboard.writeText(text); return true; }catch(e){}
  try{
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok;
  }catch(e){ return false; }
}

/* ปุ่มในหน้ารายชื่อ: fix = ทำเป็น "แก้แล้ว" · undo = มส. กลับเป็น "รอแก้" / ติด 0 ลบแถว (ติด 0 ที่ยังไม่แก้ไม่ต้องเก็บ) */
async function blkSetFixed(it, key, makeFixed){
  const f = BLK_FIELDS[key], rec = it[key].rec || {}, calc = it[key].calc || {};
  const who = { term:period.term, room:it.room, subject:it.subject, no:it.no, name:it.name };
  const keep = { oldTotal: calc.oldTotal ?? rec["คะแนนรวมเดิม"], newFinal: calc.newFinal ?? rec["คะแนนปลายภาคที่ต้องกรอก"], newTotal: calc.newTotal ?? rec["คะแนนรวมใหม่"] };
  const opts = makeFixed ? { fixed:true, ...keep } : (key==="zero" ? { remove:true } : { fixed:false, ...keep });
  if(!(await blkSave(who, f.kind, opts))) return;
  renderBlocked();
  toast(makeFixed ? `${it.name} · แก้ ${f.label} แล้ว ✓` : `ยกเลิกการแก้ ${f.label} ของ ${it.name} แล้ว`);
}

qs("#blkFilters").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if(b.dataset.f) blk.filter = b.dataset.f;
  else if(b.dataset.fixed) blk.showFixed = !blk.showFixed;
  renderBlocked();
});
qs("#blkWrap").addEventListener("click", async e=>{
  const copy = e.target.closest(".blk-copy");
  if(copy){
    const text = blkCopyText(copy.dataset.room);
    if(!text){ toast("ไม่มีรายชื่อให้คัดลอก"); return; }
    toast((await copyToClipboard(text)) ? `คัดลอกรายชื่อ ${copy.dataset.room} แล้ว` : "คัดลอกไม่สำเร็จ");
    return;
  }
  const b = e.target.closest(".blk-act"); if(!b) return;
  const it = blk.items[Number(b.dataset.i)]; if(!it) return;
  await blkSetFixed(it, b.dataset.k, b.dataset.act==="fix");
});
async function openBlocked(){
  exitFocusMode();
  showSaving("กำลังโหลดรายชื่อล่าสุด...");
  await loadAll();
  hideSaving();
  blk.filter = "all";
  renderBlocked();
  showView("view-blocked");
}
qs("#blockedBtn").addEventListener("click", openBlocked);

/* ================= ตรวจข้อสอบ : หน้าแรก (รายการชุดข้อสอบ) ================= */
function renderExamHome(){
  const wrap = qs("#examSetList");
  if(!state.examSets.length){
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="es-ico">🧾</div>
        <h4>ยังไม่มีชุดข้อสอบ</h4>
        <p>กดปุ่ม "＋ สร้างชุดข้อสอบ" ด้านบนเพื่อเริ่มชุดแรก<br>เช่น ม.4, ม.5, คณิตศาสตร์ ม.2/1</p>
      </div>`;
    return;
  }
  wrap.innerHTML = state.examSets.map(s=>{
    const keyCount = Object.keys(s.answerKey||{}).length;
    const stCount = Object.values(s.students||{}).filter(st=>st && st.total!=null).length;
    const meta = (s.level || s.subject) ? `${esc(s.level||"")}${s.level && s.subject ? " · " : ""}${esc(s.subject||"")} · ` : "";
    return `<div class="examset-card" data-id="${s.id}">
      <div class="ec-main">
        <h3>${esc(s.name)}</h3>
        <p>${meta}เฉลยแล้ว ${keyCount}/${EXAM_QN} · สแกนแล้ว ${stCount}/20</p>
      </div>
      <button class="ec-del" type="button" data-id="${s.id}" title="ลบชุดข้อสอบ">🗑</button>
    </div>`;
  }).join("");
}
qs("#examNewBtn").addEventListener("click", ()=>{
  qs("#examNewName").value = "";
  fillRoomSelects(qs("#modalExamNew"));
  qs("#examNewRoom").value = ""; fillSubjectSelect(qs("#examNewRoom"));
  qs("#modalExamNew").classList.add("active");
  setTimeout(()=> qs("#examNewName").focus(), 200);
});
qsa("#modalExamNew [data-close]").forEach(b=> b.addEventListener("click", ()=> qs("#modalExamNew").classList.remove("active")));
qs("#examNewSaveBtn").addEventListener("click", async ()=>{
  const level = qs("#examNewRoom").value, subject = qs("#examNewSubject").value.trim(), name = qs("#examNewName").value.trim();
  if(!level || !subject){ toast("เลือกห้องและวิชาก่อนครับ"); return; }
  if(!name){ toast("ตั้งชื่อชุดข้อสอบก่อนครับ"); return; }
  const set = { id:"ex_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), name, term:period.term, level, subject, answerKey:{}, students:{} };
  state.examSets.push(set);
  saveExamSets();
  qs("#modalExamNew").classList.remove("active");
  renderExamHome();
  toast(`สร้างชุด "${name}" แล้ว`);
  // สำรองห้อง/วิชา/ชื่อชุด ขึ้นชีท ExamKey ไว้ด้วย (เฉลยยังว่างอยู่ ค่อยอัปเดตตอนตั้งเฉลย) — ทำเบื้องหลัง ไม่บล็อกผู้ใช้
  const res = await apiPost({ type:"saveExamKey", id:set.id, term:set.term, level:set.level, subject:set.subject, name:set.name, answerKey:set.answerKey });
  if(!res.success) toast(res.message || "สำรองชุดข้อสอบขึ้นชีทไม่สำเร็จ (ยังใช้งานในเครื่องนี้ได้ตามปกติ)");
});
qs("#examSetList").addEventListener("click", async e=>{
  const del = e.target.closest(".ec-del");
  if(del){
    const set = state.examSets.find(s=>s.id===del.dataset.id);
    if(!set) return;
    const ok = await confirmDialog({
      title:"ลบชุดข้อสอบ", icon:"🗑", danger:true,
      message:`ต้องการลบ "${set.name}" ใช่ไหม\nเฉลยและคะแนนทั้งหมดในชุดนี้จะหายไปด้วย`,
      okText:"ลบเลย", cancelText:"ยกเลิก"
    });
    if(!ok) return;
    state.examSets = state.examSets.filter(s=>s.id!==set.id);
    saveExamSets();
    examDBDeletePrefix(set.id+"_"); // ลบรูปหัวกระดาษของชุดนี้ทิ้งด้วย กัน IndexedDB บวมไปเรื่อยๆ
    renderExamHome();
    apiPost({ type:"deleteExamKey", id:set.id });   // ลบเฉลยของชุดนี้ออกจากชีท ExamKey ด้วย (เบื้องหลัง)
    return;
  }
  const card = e.target.closest(".examset-card");
  if(card) openExamManage(card.dataset.id);
});

/* ================= ตรวจข้อสอบ : จัดการชุด (เฉลย / Scan / สรุปคะแนน) ================= */
function openExamManage(id){
  currentExamId = id;
  if(!currentExamSet()) return;
  renderExamManage();
  showView("view-exam-manage");
}
function renderExamManage(){
  const set = currentExamSet(); if(!set) return;
  qs("#emTitle").textContent = set.name;
  qs("#emSub").textContent = (set.level || set.subject)
    ? `${set.level||""}${set.level && set.subject ? " · " : ""}${set.subject||""} · ภาคเรียนที่ ${set.term||period.term}`
    : "เฉลย · สแกน · สรุปคะแนน";
  const keyCount = Object.keys(set.answerKey||{}).length;
  const scanned = Object.values(set.students||{}).filter(st=>st && st.total!=null).length;
  qs("#emKeySub").textContent = keyCount ? `เฉลยแล้ว ${keyCount}/${EXAM_QN} ข้อ · คะแนนเต็ม ${keyCount}` : "ยังไม่ได้ตั้งเฉลย";
  qs("#emSummarySub").textContent = scanned ? `สแกนแล้ว ${scanned}/20 คน` : "ยังไม่มีนักเรียนสแกน";
  qs("#emStats").innerHTML =
    `<div class="es-stat"><b>${keyCount}/${EXAM_QN}</b><span>เฉลยแล้ว</span></div>
     <div class="es-stat"><b>${scanned}/20</b><span>สแกนแล้ว</span></div>`;
}
qs("#emKeyBtn").addEventListener("click", ()=> openExamKey());
qs("#emScanBtn").addEventListener("click", ()=> showView("view-exam-scan"));
qs("#emSummaryBtn").addEventListener("click", ()=> openExamSummary());

/* ================= ตรวจข้อสอบ : ตั้งเฉลย 1-20 ================= */
function openExamKey(){
  if(!currentExamSet()) return;
  renderExamKey();
  showView("view-exam-key");
}
function renderExamKey(){
  const set = currentExamSet(); if(!set) return;
  const keyCount = Object.keys(set.answerKey||{}).length;
  const meta = (set.level || set.subject) ? `${set.level||""}${set.level && set.subject ? " · " : ""}${set.subject||""} · ` : "";
  qs("#ekSub").textContent = `${meta}${set.name} · เฉลยแล้ว ${keyCount}/${EXAM_QN} ข้อ · คะแนนเต็มปัจจุบัน ${keyCount}`;
  const rows = [];
  for(let i=1; i<=EXAM_QN; i++){
    const cur = set.answerKey ? set.answerKey[i] : null;
    const opts = EXAM_LETTERS.map(L=> `<button type="button" data-v="${L}" class="${cur===L?"on":""}">${L}</button>`).join("");
    rows.push(`<div class="ek-row" data-q="${i}"><div class="ek-num">${i}</div><div class="ek-opts">${opts}</div></div>`);
  }
  qs("#examKeyList").innerHTML = rows.join("");
}
qs("#examKeyList").addEventListener("click", e=>{
  const btn = e.target.closest(".ek-opts button"); if(!btn) return;
  const set = currentExamSet(); if(!set) return;
  const q = btn.closest(".ek-row").dataset.q;
  set.answerKey = set.answerKey || {};
  if(set.answerKey[q] === btn.dataset.v) delete set.answerKey[q]; // กดซ้ำที่เดิม = ยกเลิกเฉลยข้อนี้
  else set.answerKey[q] = btn.dataset.v;
  renderExamKey();
});
qs("#examKeySaveBtn").addEventListener("click", async ()=>{
  const set = currentExamSet(); if(!set) return;
  saveExamSets();
  if(set.level && set.subject){
    showSaving("กำลังบันทึกเฉลยขึ้นชีท...");
    const res = await apiPost({ type:"saveExamKey", id:set.id, term:set.term||period.term, level:set.level, subject:set.subject, name:set.name, answerKey:set.answerKey });
    hideSaving();
    toast(res.success ? "บันทึกเฉลยแล้ว" : (res.message || "บันทึกเฉลยขึ้นชีทไม่สำเร็จ (เก็บไว้ในเครื่องนี้แล้ว)"));
  } else {
    // ชุดข้อสอบที่สร้างไว้ก่อนอัปเดตนี้ ยังไม่ผูกห้อง/วิชา จึงยังไม่สำรองขึ้นชีท — เก็บในเครื่องได้ตามปกติ
    toast("บันทึกเฉลยแล้ว (ชุดนี้สร้างไว้ก่อนหน้า ยังไม่ผูกห้อง/วิชา จึงไม่ได้สำรองขึ้นชีท)");
  }
  renderExamManage();
  showView("view-exam-manage");
});

/* ================= ตรวจข้อสอบ : สรุปคะแนนเลขที่ 1-20 ================= */
function openExamSummary(){
  if(!currentExamSet()) return;
  renderExamSummary();
  showView("view-exam-summary");
}
function renderExamSummary(){
  const set = currentExamSet(); if(!set) return;
  qs("#esSub").textContent = set.name;
  const rows = [];
  for(let i=1; i<=20; i++){
    const st = set.students ? set.students[i] : null;
    const scoreTxt = (st && st.total!=null) ? `${st.score}/${st.total}` : `<span class="pend-ok" style="color:var(--ink-soft); font-weight:500;">ยังไม่มีข้อมูล</span>`;
    const thumb = (st && st.headerImage) ? `<img class="ec-thumb" data-img-key="${esc(st.headerImage)}" data-full-key="${esc(st.fullImage||"")}" title="แตะดูภาพเต็ม">` : `<div class="ec-thumb-empty">—</div>`;
    rows.push(`<tr><td>${i}</td><td class="ec-thumb-cell">${thumb}</td><td>${scoreTxt}</td></tr>`);
  }
  qs("#examSumWrap").innerHTML =
    `<table class="score-table exam-sum-table"><thead><tr><th>เลขที่</th><th>นักเรียน</th><th>คะแนน</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  /* รูปหัวกระดาษเก็บใน IndexedDB (ไม่ใช่ในตัว object นักเรียนโดยตรง) — โหลดทีหลังแบบ async กันหน้าเว็บค้างรอ
     ตอนตารางเพิ่งเรนเดอร์เสร็จใหม่ๆ ยังไม่มีรูป ก็ค่อยแปลง Blob เป็น URL ใส่ทีหลัง */
  qsa("#examSumWrap img[data-img-key]").forEach(async img=>{
    const key = img.dataset.imgKey;
    try{
      const blob = await examDBGet(key);
      if(blob){ img.src = URL.createObjectURL(blob); }
      else { img.outerHTML = `<div class="ec-thumb-empty">—</div>`; }
    }catch(e){ img.outerHTML = `<div class="ec-thumb-empty">—</div>`; }
  });
}
// แตะรูปหัวกระดาษในตารางสรุปคะแนน เพื่อดูภาพกระดาษคำตอบเต็มแผ่น (มีวงกลมคำตอบที่ตรวจแล้ว) — ผูก listener ครั้งเดียวแบบ delegation
qs("#examSumWrap").addEventListener("click", e=>{
  const img = e.target.closest("img.ec-thumb[data-full-key]");
  if(img && img.dataset.fullKey) openImgView(img.dataset.fullKey);
});

/* =====================================================================
   Round 17 : Scan กระดาษคำตอบด้วยกล้อง (OMR)
   ไอเดีย: กระดาษคำตอบมีจุดดำทึบสี่เหลี่ยม (marker) อยู่ 4 มุม → ใช้หาตำแหน่งกระดาษในภาพจากกล้อง
   เมื่อเจอครบ 4 มุมและถือนิ่งพอ จะถ่ายภาพ แล้วครอปเฉพาะกรอบที่ล้อมกระดาษออกมาก่อนแบบหยาบ (ตัดพื้นหลัง/สิ่งของสีดำอื่นๆ
   นอกกระดาษทิ้งไป กันปนกับการตรวจจับ) ตรวจจับหมุดซ้ำในภาพที่ครอปแล้วให้แม่นขึ้น แล้วค่อยคำนวณ perspective transform
   (homography) ปรับมุมภาพให้กระดาษเป็นสี่เหลี่ยมตรงมาตรฐาน จากนั้นอ่านความเข้มของวงกลมคำตอบแต่ละข้อเทียบกับเฉลย ให้คะแนนอัตโนมัติ
   พร้อม crop "หัวกระดาษ" (ช่องเขียนชื่อ/เลขที่) เก็บไว้เป็นรูปให้ครูดูทวนภายหลังได้
   นอกจากนี้ยังเก็บภาพกระดาษคำตอบเต็มแผ่นหลังปรับมุมแล้ว พร้อมวงกลมคำตอบที่ระบบอ่านได้ (เขียว=ตรงเฉลย, แดง=ไม่ตรงเฉลย)
   ไว้เป็น "fullImage" แยกอีกชุด ให้ครูแตะรูปหัวกระดาษเพื่อเปิดดูภาพเต็มย้อนหลังได้ว่าระบบตรวจข้อไหนลงไปว่าอย่างไร
   รูปภาพที่ crop ไว้ เก็บใน IndexedDB แยกจาก localStorage (ที่เก็บแค่ชุดข้อสอบ/คะแนน) เพราะรูปภาพหนักกว่ามาก
   หมายเหตุ: อัลกอริทึมตรวจจับ/อ่านค่าเป็นแบบง่าย ปรับ threshold ได้ตามการทดสอบจริงในรอบถัดไป
   ===================================================================== */

/* ---- IndexedDB: เก็บ/ดึง/ลบรูปหัวกระดาษ (key = "<examSetId>_<เลขที่>") ---- */
const EXAM_DB_NAME = "kc_exam_images", EXAM_DB_STORE = "images";
function examDBOpen(){
  return new Promise((resolve, reject)=>{
    if(!window.indexedDB){ reject(new Error("ไม่รองรับ IndexedDB")); return; }
    const req = indexedDB.open(EXAM_DB_NAME, 1);
    req.onupgradeneeded = ()=>{ if(!req.result.objectStoreNames.contains(EXAM_DB_STORE)) req.result.createObjectStore(EXAM_DB_STORE); };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}
async function examDBPut(key, blob){
  const db = await examDBOpen();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(EXAM_DB_STORE, "readwrite");
    tx.objectStore(EXAM_DB_STORE).put(blob, key);
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
  });
}
async function examDBGet(key){
  const db = await examDBOpen();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(EXAM_DB_STORE, "readonly");
    const req = tx.objectStore(EXAM_DB_STORE).get(key);
    req.onsuccess = ()=> resolve(req.result || null);
    req.onerror = ()=> reject(req.error);
  });
}
async function examDBDeletePrefix(prefix){
  try{
    const db = await examDBOpen();
    await new Promise((resolve, reject)=>{
      const tx = db.transaction(EXAM_DB_STORE, "readwrite");
      const store = tx.objectStore(EXAM_DB_STORE);
      const req = store.openCursor();
      req.onsuccess = e=>{
        const cur = e.target.result;
        if(cur){ if(String(cur.key).startsWith(prefix)) cur.delete(); cur.continue(); }
      };
      tx.oncomplete = ()=> resolve();
      tx.onerror = ()=> reject(tx.error);
    });
  }catch(e){ /* ไม่มี IndexedDB หรือเบราว์เซอร์บล็อกไว้ — ปล่อยผ่าน ไม่ให้กระทบการลบชุดข้อสอบ */ }
}

/* ---- ผังกระดาษคำตอบ: พิกัดสัดส่วน (0-1) เทียบกับกรอบสี่เหลี่ยมที่ล้อมด้วยจุดกึ่งกลางหมุดทั้ง 6 จุด
   (บนซ้าย/บนขวา, กลางซ้าย/กลางขวา, ล่างซ้าย/ล่างขวา — ไม่ใช่แค่ 4 มุมแบบเดิม)
   ค่าพิกัดด้านล่างวัดจากไฟล์ Answer.png จริง (1537x1911px) แล้วแปลงเป็นสัดส่วนเทียบกรอบหมุดนอกสุด (tl-tr-bl-br)
   กระดาษจริงเป็น "2 คอลัมน์ x 10 แถว" (ข้อ 1-10 คอลัมน์ซ้าย, ข้อ 11-20 คอลัมน์ขวา อยู่แถวเดียวกัน) ไม่ใช่คอลัมน์เดียว 20 แถวแบบที่โค้ดเดิมสมมติไว้ (นี่คือสาเหตุหลักที่อ่านค่าคลาดเคลื่อน)
   ใช้ชุดค่าเดียวกันทั้งตอน "พิมพ์แบบฟอร์มเปล่า" และตอน "อ่านผลจากภาพที่ปรับมุมแล้ว" กันพิกัดสองฝั่งเพี้ยนไม่ตรงกัน ---- */
const EXAM_LAYOUT = {
  markerFrac: 0.049,                                // ขนาดหมุดจริง (55px/1122px) — เก็บไว้อ้างอิงเฉยๆ ตอนนี้พิมพ์จากรูป Answer.png ตรงๆ เลยไม่ได้ใช้คำนวณ
  header: { x0:0.064, y0:0.0, x1:0.939, y1:0.150 },  // กรอบหัวกระดาษ (ชื่อ-สกุล/ชั้น/เลขที่ เขียนเอง) ที่จะ crop เก็บไว้ดู
  qStart: 1, qEnd: 20,
  rowsPerCol: 10,                                    // ข้อ 1-10 อยู่คอลัมน์ซ้าย, 11-20 อยู่คอลัมน์ขวา แถวตรงกัน
  rowY0: 0.279, rowY1: 0.893,                        // ช่วงแนวตั้งของแถวที่ 1-10 (ใช้ร่วมกันทั้ง 2 คอลัมน์)
  colLeft:  { x0:0.160, x1:0.362 },                  // ช่วงแนวนอนของ ก ข ค ง คอลัมน์ซ้าย (ข้อ 1-10)
  colRight: { x0:0.641, x1:0.845 },                  // ช่วงแนวนอนของ ก ข ค ง คอลัมน์ขวา (ข้อ 11-20)
  midYFrac: 0.5533,                                  // ตำแหน่งแนวตั้งของหมุดกลาง (ml/mr) เทียบกรอบ tl-tr-bl-br ใช้ตอนปรับมุมภาพแบบ 2 ช่วง
  lock: { x0:0.594, x1:0.710, y0:0.902, y1:0.963 },  // กรอบของ "ตัวล็อค" (ลวดลายขั้นบันไดใต้ Test Version) ใช้ตรวจสอบความถูกต้องของการปรับมุมภาพ
  bubbleR: 0.017                                     // รัศมีวงกลมคำตอบ (สัดส่วนความกว้างภาพที่ปรับมุมแล้ว)
};
function examBubblePos(q, k){ // q = 1..20, k = 0..3 (ก ข ค ง) -> {x,y} สัดส่วน 0-1
  const rowIdx = (q - EXAM_LAYOUT.qStart) % EXAM_LAYOUT.rowsPerCol;      // 0..9 ภายในคอลัมน์
  const col = (q - EXAM_LAYOUT.qStart) < EXAM_LAYOUT.rowsPerCol ? EXAM_LAYOUT.colLeft : EXAM_LAYOUT.colRight;
  const y = EXAM_LAYOUT.rowY0 + rowIdx * (EXAM_LAYOUT.rowY1 - EXAM_LAYOUT.rowY0) / (EXAM_LAYOUT.rowsPerCol - 1);
  const x = col.x0 + k * (col.x1 - col.x0) / (EXAM_LETTERS.length - 1);
  return { x, y };
}
const EXAM_RECT_W = 700, EXAM_RECT_H = Math.round(700 * 297/210); // ภาพหลังปรับมุม ~700x990 (สัดส่วน A4 แนวตั้ง)

/* ---- Homography 3x3 จากจุด 4 คู่ (src -> dst) : Direct Linear Transform เชิงเส้น 8 สมการ 8 ตัวไม่รู้ค่า (h33=1) ---- */
function solveLinear8(A, B){
  const n = 8;
  const M = A.map((row,i)=> [...row, B[i]]);
  for(let col=0; col<n; col++){
    let piv = col;
    for(let r=col+1; r<n; r++) if(Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if(Math.abs(M[piv][col]) < 1e-9) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for(let r=0; r<n; r++){
      if(r===col) continue;
      const f = M[r][col] / M[col][col];
      for(let c=col; c<=n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row,i)=> row[n] / row[i]);
}
function computeHomography(src, dst){
  const A = [], B = [];
  for(let i=0; i<4; i++){
    const {x,y} = src[i], X = dst[i].x, Y = dst[i].y;
    A.push([x,y,1,0,0,0,-x*X,-y*X]); B.push(X);
    A.push([0,0,0,x,y,1,-x*Y,-y*Y]); B.push(Y);
  }
  const h = solveLinear8(A, B);
  if(!h) return null;
  return [h[0],h[1],h[2], h[3],h[4],h[5], h[6],h[7],1];
}
function invertHomography(h){
  const [a,b,c,d,e,f,g,i,j] = h;
  const det = a*(e*j - f*i) - b*(d*j - f*g) + c*(d*i - e*g);
  if(Math.abs(det) < 1e-12) return null;
  const inv = 1/det;
  return [
    (e*j - f*i)*inv, (c*i - b*j)*inv, (b*f - c*e)*inv,
    (f*g - d*j)*inv, (a*j - c*g)*inv, (c*d - a*f)*inv,
    (d*i - e*g)*inv, (b*g - a*i)*inv, (a*e - b*d)*inv
  ];
}
function applyH(h, x, y){
  const w = h[6]*x + h[7]*y + h[8];
  return { x: (h[0]*x + h[1]*y + h[2]) / w, y: (h[3]*x + h[4]*y + h[5]) / w };
}

/* ---- ตรวจจับหมุด 6 จุดจากเฟรมวิดีโอปัจจุบัน (ทำงานบนภาพที่ย่อเล็กแล้ว เพื่อความเร็ว) ----
   วิธีคร่าวๆ: แบ่งภาพเป็นตารางช่องเล็กๆ, หาว่าช่องไหน "มืด" กว่าค่าเฉลี่ยทั้งภาพมากพอ,
   รวมกลุ่มช่องมืดที่ติดกัน (flood fill), กรองเอาก้อนที่ทรงเหมือนสี่เหลี่ยมจัตุรัสและขนาดสมเหตุสมผล,
   แล้วจัดกลุ่มเป็น 3 แถว (บน/กลาง/ล่าง) ตามช่องว่างแนวตั้งที่ห่างที่สุด 2 จุด (แทนที่จะหารครึ่งภาพตายตัว
   เพราะกระดาษอาจเอียง/ไม่เต็มเฟรม) แล้วแยกซ้าย/ขวาในแต่ละแถวด้วยตำแหน่ง x
   ถ้าหาครบ 6 จุดไม่ได้ (เช่น หมุดกลางโดนนิ้ว/เงาบัง) จะ fallback ใช้แค่ 4 มุมนอกสุดแทน เพื่อให้ยังสแกนได้
   แม้จะแม่นน้อยกว่า ---- */
function detectMarkers(procCtx, w, h){
  const img = procCtx.getImageData(0, 0, w, h).data;
  let sum = 0, n0 = 0;
  for(let p=0; p<img.length; p+=4*7){ sum += img[p]*0.299 + img[p+1]*0.587 + img[p+2]*0.114; n0++; }
  const avg = n0 ? sum/n0 : 128;
  const thresh = avg * 0.55; // เข้มกว่าค่าเฉลี่ยพอสมควรถึงจะนับเป็น "หมุดดำ" — ปรับตามแสงจริงได้ในรอบถัดไป
  const cell = 4;
  const cols = Math.floor(w/cell), rows = Math.floor(h/cell);
  const dark = new Uint8Array(cols*rows);
  for(let cy=0; cy<rows; cy++){
    for(let cx=0; cx<cols; cx++){
      let s=0, n=0;
      for(let yy=0; yy<cell; yy++){
        const py = cy*cell+yy; if(py>=h) continue;
        for(let xx=0; xx<cell; xx++){
          const px = cx*cell+xx; if(px>=w) continue;
          const idx = (py*w+px)*4;
          s += img[idx]*0.299 + img[idx+1]*0.587 + img[idx+2]*0.114; n++;
        }
      }
      dark[cy*cols+cx] = (n && s/n < thresh) ? 1 : 0;
    }
  }
  const seen = new Uint8Array(cols*rows);
  const comps = [];
  for(let idx0=0; idx0<cols*rows; idx0++){
    if(!dark[idx0] || seen[idx0]) continue;
    const stack = [idx0]; seen[idx0] = 1;
    let minX=cols, maxX=0, minY=rows, maxY=0, count=0;
    while(stack.length){
      const idx = stack.pop();
      const cx = idx % cols, cy = (idx / cols) | 0;
      count++;
      if(cx<minX) minX=cx; if(cx>maxX) maxX=cx; if(cy<minY) minY=cy; if(cy>maxY) maxY=cy;
      const nbrs = [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]];
      for(const [nx,ny] of nbrs){
        if(nx<0 || nx>=cols || ny<0 || ny>=rows) continue;
        const nb = ny*cols+nx;
        if(!seen[nb] && dark[nb]){ seen[nb]=1; stack.push(nb); }
      }
    }
    comps.push({minX,maxX,minY,maxY,count});
  }
  const minCells = 3, maxCells = Math.max(cols, rows) * 0.28;
  // ---- ตัวกรองเสริม: แยก "สี่เหลี่ยมทึบจริง" ออกจาก "วงกลมคำตอบที่ฝนเต็ม" ----
  // ปัญหาที่พบจริง: กระดาษที่ฝนคำตอบแล้วมีวงกลมดำเข้มกระจายอยู่ทั่วแผ่น (20 ข้อ) ซึ่งวงกลมที่ฝนเต็มก็ผ่านเกณฑ์
  // ขนาด/สัดส่วน/ความหนาแน่นด้านบนได้เหมือนกัน (วงกลมเต็มมีความหนาแน่นในกรอบสี่เหลี่ยมล้อมรอบสูงถึง ~0.785)
  // ทำให้ระบบสับสนระหว่างหมุดจริง 6 จุด กับวงกลมคำตอบที่ฝนแล้วนับสิบจุด แล้วจัดกลุ่มแถว/เลือกซ้าย-ขวาผิดไปหมด
  // (นี่คือสาเหตุหลักที่ภาพออกมาบิดเบี้ยวมากทั้งที่มีหมุดครบ ไม่ใช่แค่ความคลาดเคลื่อนเล็กน้อย)
  // จุดแยกที่ชัดเจน: สี่เหลี่ยมทึบมี "มุมทั้ง 4" ของกรอบมืดสนิท ส่วนวงกลมที่แนบสนิทกับกรอบสี่เหลี่ยมของตัวเอง
  // จะมี "มุมทั้ง 4" ว่างเป็นสีขาวเสมอ (เรขาคณิตของวงกลมในกรอบสี่เหลี่ยม) ใช้เช็คมุมเป็นตัวตัดสินหลัก
  function cornerDarkFrac(c){
    const cw = c.maxX-c.minX+1, ch = c.maxY-c.minY+1;
    const cs = Math.max(1, Math.round(Math.min(cw,ch)*0.3));
    function blockFrac(x0,y0){
      let s=0,n=0;
      for(let y=y0; y<y0+cs; y++){
        for(let x=x0; x<x0+cs; x++){
          if(x<0||x>=cols||y<0||y>=rows) continue;
          s += dark[y*cols+x]; n++;
        }
      }
      return n ? s/n : 0;
    }
    const tl = blockFrac(c.minX, c.minY), tr = blockFrac(c.maxX-cs+1, c.minY);
    const bl = blockFrac(c.minX, c.maxY-cs+1), br = blockFrac(c.maxX-cs+1, c.maxY-cs+1);
    return (tl+tr+bl+br)/4;
  }
  const candidates = comps.filter(c=>{
    const cw = c.maxX-c.minX+1, ch = c.maxY-c.minY+1;
    if(cw<minCells || ch<minCells || cw>maxCells || ch>maxCells) return false;
    const ratio = cw/ch;
    if(ratio<0.5 || ratio>2) return false;
    const fill = c.count/(cw*ch);
    if(fill < 0.55) return false; // สี่เหลี่ยมทึบควรมีความหนาแน่นพิกเซลมืดสูง
    return cornerDarkFrac(c) >= 0.6; // มุมทั้ง 4 ต้องมืดด้วย — กันวงกลมคำตอบที่ฝนเต็มหลุดมาปนเป็น "หมุด" ปลอม
  }).map(c=> ({
    cx: ((c.minX+c.maxX)/2 + 0.5) * cell,
    cy: ((c.minY+c.maxY)/2 + 0.5) * cell,
    area: (c.maxX-c.minX+1) * (c.maxY-c.minY+1)
  }));
  if(candidates.length < 4) return null;

  // จัดกลุ่มเป็นแถวตามช่องว่างแนวตั้งที่มากที่สุด (รองรับกระดาษเอียง/ไม่เต็มเฟรม ดีกว่าหารครึ่งภาพตายตัว)
  function splitByLargestGaps(items, nGroups, key){
    const sorted = [...items].sort((a,b)=> a[key]-b[key]);
    const gaps = [];
    for(let i=1;i<sorted.length;i++) gaps.push({i, gap: sorted[i][key]-sorted[i-1][key]});
    gaps.sort((a,b)=> b.gap-a.gap);
    const cuts = gaps.slice(0, nGroups-1).map(g=>g.i).sort((a,b)=>a-b);
    const groups = []; let start=0;
    for(const c of cuts){ groups.push(sorted.slice(start,c)); start=c; }
    groups.push(sorted.slice(start));
    return groups;
  }
  function pickLR(group){ // ในแต่ละแถว เลือกก้อนที่ใหญ่สุดฝั่งซ้ายและฝั่งขวา
    if(group.length < 2) return null;
    const byX = [...group].sort((a,b)=> a.cx-b.cx);
    const leftHalf = byX.slice(0, Math.ceil(byX.length/2));
    const rightHalf = byX.slice(Math.ceil(byX.length/2));
    const L = leftHalf.reduce((best,c)=> (!best||c.area>best.area)?c:best, null);
    const R = rightHalf.reduce((best,c)=> (!best||c.area>best.area)?c:best, null);
    if(!L || !R || L===R) return null;
    return {L, R};
  }
  // ตรวจสอบรูปทรงว่าสมเหตุสมผลกับ "กระดาษคำตอบจริง" ก่อนเชื่อ — กันเคสหลุดไปจับจุดดำ/เงาจากพื้นหลัง
  // นอกกระดาษ แล้วเอาไปครอป/ปรับมุมภาพผิดที่ (บทเรียนจากรอบก่อน: ต้องเช็คทรง ไม่ใช่แค่ "เจอครบจำนวนจุด")
  function validQuad(p, w, h){
    const {tl,tr,bl,br} = p;
    for(const pt of [tl,tr,bl,br]) if(!pt || !isFinite(pt.x) || !isFinite(pt.y)) return false;
    if(tl.x>=tr.x || bl.x>=br.x || tl.y>=bl.y || tr.y>=br.y) return false; // มุมต้องเรียงถูกทิศ ไม่ไขว้กัน
    const minX=Math.min(tl.x,bl.x), maxX=Math.max(tr.x,br.x);
    const minY=Math.min(tl.y,tr.y), maxY=Math.max(bl.y,br.y);
    const bw=maxX-minX, bh=maxY-minY;
    if(bw < w*0.25 || bh < h*0.25) return false;      // เล็กเกินไป — น่าจะเป็นจุดดำ/สิ่งอื่นที่ไม่ใช่ตัวกระดาษเต็มแผ่น
    const ratio = bw/bh;
    if(ratio < 0.35 || ratio > 1.3) return false;      // กระดาษ A4 แนวตั้งถ่ายเอียงยังไงก็ไม่ควรหลุดช่วงนี้
    if(Math.abs(tl.x-bl.x) > bw*0.5) return false;     // ขอบซ้าย (tl-bl) ควรตั้งฉากคร่าวๆ ไม่เอียงมาก
    if(Math.abs(tr.x-br.x) > bw*0.5) return false;     // ขอบขวา (tr-br) เช่นกัน
    if(p.ml && p.mr){
      if(p.ml.x > p.mr.x) return false;                // ml ต้องอยู่ซ้ายของ mr เสมอ
      if(Math.abs(p.ml.y - p.mr.y) > bh*0.25) return false; // หมุดกลางสองจุดควรสูงใกล้เคียงกัน
      const loY = minY + bh*0.25, hiY = minY + bh*0.85;
      if(p.ml.y < loY || p.ml.y > hiY || p.mr.y < loY || p.mr.y > hiY) return false; // ต้องอยู่แถวกลางจริงๆ ไม่ใช่หลุดไปแถวบน/ล่าง
    }
    return true;
  }

  // พยายามหาครบ 6 จุดก่อน (บน/กลาง/ล่าง)
  if(candidates.length >= 6){
    const rows3 = splitByLargestGaps(candidates, 3, "cy");
    if(rows3.length === 3){
      const top = pickLR(rows3[0]), mid = pickLR(rows3[1]), bot = pickLR(rows3[2]);
      if(top && mid && bot){
        const pts6 = {
          tl:{x:top.L.cx,y:top.L.cy}, tr:{x:top.R.cx,y:top.R.cy},
          ml:{x:mid.L.cx,y:mid.L.cy}, mr:{x:mid.R.cx,y:mid.R.cy},
          bl:{x:bot.L.cx,y:bot.L.cy}, br:{x:bot.R.cx,y:bot.R.cy}
        };
        if(validQuad(pts6, w, h)) return pts6;
      }
    }
  }
  // Fallback: หาไม่ครบ 6 จุด (เช่น หมุดกลางโดนบัง) หรือรูปทรง 6 จุดข้างบนไม่ผ่านการตรวจสอบ
  // → ใช้แค่ 4 มุมนอกสุด ยังสแกนได้แต่แม่นน้อยกว่า
  const rows2 = splitByLargestGaps(candidates, 2, "cy");
  if(rows2.length !== 2) return null;
  const top = pickLR(rows2[0]), bot = pickLR(rows2[1]);
  if(!top || !bot) return null;
  const pts4 = {
    tl:{x:top.L.cx,y:top.L.cy}, tr:{x:top.R.cx,y:top.R.cy},
    bl:{x:bot.L.cx,y:bot.L.cy}, br:{x:bot.R.cx,y:bot.R.cy}
  };
  return validQuad(pts4, w, h) ? pts4 : null;
}

/* ---- ปรับมุมภาพ (perspective correction) จากจุดหมุดที่ตรวจเจอ ให้เป็นสี่เหลี่ยมมาตรฐาน EXAM_RECT_W x EXAM_RECT_H
   ถ้ามีหมุดกลาง (ml/mr) ครบ จะปรับมุมแบบ "2 ช่วง" (บน: tl-tr-ml-mr, ล่าง: ml-mr-bl-br) แยกกัน
   ช่วยแก้ปัญหากระดาษโค้ง/งอตรงกลางตอนถ่ายด้วยมือ ซึ่ง homography เดียวจากแค่ 4 มุมนอกสุดแก้ไม่ได้
   ถ้าหาหมุดกลางไม่เจอ จะ fallback เป็น homography เดียวแบบเดิม ---- */
function rectifyImage(srcCanvas, srcPts){
  const sw = srcCanvas.width, sh = srcCanvas.height;
  const srcImg = srcCanvas.getContext("2d").getImageData(0, 0, sw, sh).data;
  const out = document.createElement("canvas");
  out.width = EXAM_RECT_W; out.height = EXAM_RECT_H;
  const octx = out.getContext("2d");
  const outImg = octx.createImageData(EXAM_RECT_W, EXAM_RECT_H);
  function sampleInto(Hinv, y0, y1){
    for(let y=y0; y<y1; y++){
      for(let x=0; x<EXAM_RECT_W; x++){
        const p = applyH(Hinv, x, y);
        const sx = Math.round(p.x), sy = Math.round(p.y);
        const di = (y*EXAM_RECT_W+x)*4;
        if(sx>=0 && sx<sw && sy>=0 && sy<sh){
          const si = (sy*sw+sx)*4;
          outImg.data[di]=srcImg[si]; outImg.data[di+1]=srcImg[si+1]; outImg.data[di+2]=srcImg[si+2]; outImg.data[di+3]=255;
        } else {
          outImg.data[di]=255; outImg.data[di+1]=255; outImg.data[di+2]=255; outImg.data[di+3]=255;
        }
      }
    }
  }
  const midY = Math.round(EXAM_RECT_H * EXAM_LAYOUT.midYFrac);
  if(srcPts.ml && srcPts.mr){
    const Htop = computeHomography(
      [srcPts.tl, srcPts.tr, srcPts.ml, srcPts.mr],
      [{x:0,y:0}, {x:EXAM_RECT_W,y:0}, {x:0,y:midY}, {x:EXAM_RECT_W,y:midY}]
    );
    const Hbot = computeHomography(
      [srcPts.ml, srcPts.mr, srcPts.bl, srcPts.br],
      [{x:0,y:midY}, {x:EXAM_RECT_W,y:midY}, {x:0,y:EXAM_RECT_H}, {x:EXAM_RECT_W,y:EXAM_RECT_H}]
    );
    const HtopInv = Htop && invertHomography(Htop), HbotInv = Hbot && invertHomography(Hbot);
    if(HtopInv && HbotInv){
      sampleInto(HtopInv, 0, midY);
      sampleInto(HbotInv, midY, EXAM_RECT_H);
      octx.putImageData(outImg, 0, 0);
      return out;
    }
    // ถ้าคำนวณ homography ช่วงใดช่วงหนึ่งไม่ได้ (จุดเรียงเสีย) ให้ตกไป fallback ด้านล่าง
  }
  const dst = [{x:0,y:0}, {x:EXAM_RECT_W,y:0}, {x:0,y:EXAM_RECT_H}, {x:EXAM_RECT_W,y:EXAM_RECT_H}];
  const src = [srcPts.tl, srcPts.tr, srcPts.bl, srcPts.br];
  const H = computeHomography(src, dst);
  if(!H) return null;
  const Hinv = invertHomography(H);
  if(!Hinv) return null;
  sampleInto(Hinv, 0, EXAM_RECT_H);
  octx.putImageData(outImg, 0, 0);
  return out;
}
function cropFraction(canvas, x0, y0, x1, y1){
  const w = canvas.width, h = canvas.height;
  const px0 = Math.round(x0*w), py0 = Math.round(y0*h), pw = Math.round((x1-x0)*w), ph = Math.round((y1-y0)*h);
  const out = document.createElement("canvas"); out.width = Math.max(1,pw); out.height = Math.max(1,ph);
  out.getContext("2d").drawImage(canvas, px0, py0, pw, ph, 0, 0, pw, ph);
  return out;
}

/* ---- อ่านวงกลมคำตอบ 20 ข้อ x 4 ตัวเลือก จากภาพที่ปรับมุมแล้ว เทียบกับเฉลย ----
   ปรับปรุงรอบนี้ (แก้ปัญหาฝนไม่เข้ม/ฝนไม่เต็มวงแล้วระบบอ่านไม่ออก):
   เดิมใช้ "ความสว่างเฉลี่ยทั้งวง" เทียบกับ "วงที่สว่างสุดในกระดาษทั้งแผ่น" เป็นเส้นฐานเดียวทั้งแผ่น
   ปัญหา 2 อย่าง:
   1) ถ้านักเรียนฝนไม่เต็มวง/ฝนเบา ค่าเฉลี่ยทั้งวงจะถูกพิกเซลขาวรอบๆ รอยฝนดึงขึ้นมาจนไม่ผ่าน threshold
   2) แสงบนกระดาษไม่สม่ำเสมอทั้งแผ่น (เงา/มุมกล้อง/ไฟส่องเฉียง) ทำให้ "วงที่สว่างสุดทั้งแผ่น" ใช้เป็นเส้นฐานรวมไม่แม่น
      บางแถวมืดกว่าแถวอื่นทั้งแถวโดยธรรมชาติ (ไม่เกี่ยวกับมีรอยฝนหรือไม่)
   แก้ใหม่:
   - หาเส้นฐาน "กระดาษเปล่า" แยกเป็นรายข้อ (เฉลี่ย 3 ตัวเลือกที่สว่างสุดในข้อนั้น สมมติฝนจริงไม่เกิน 1 ข้อ)
     แทนเส้นฐานรวมทั้งแผ่น ทนต่อแสง/เงาที่ไม่สม่ำเสมอในแต่ละส่วนของกระดาษได้ดีกว่า
   - เพิ่มการนับ "สัดส่วนพิกเซลในวงที่เข้มกว่าเส้นฐานอย่างมีนัยสำคัญ" (darkRatio) ควบคู่กับค่าเฉลี่ย
     จับรอยฝนที่ไม่เต็มวง/ฝนเบา/ฝนมุมเดียวได้ดีกว่าดูแค่ค่าเฉลี่ยทั้งวง
   - ขยายรัศมีเก็บค่าเล็กน้อย ทนต่อการเยื้องศูนย์เล็กน้อยจากการปรับมุมภาพ (perspective) ---- */
function sampleBubble(imgData, w, h, cx, cy, r){
  const r2=r*r;
  const x0=Math.max(0,Math.floor(cx-r)), x1=Math.min(w-1,Math.ceil(cx+r));
  const y0=Math.max(0,Math.floor(cy-r)), y1=Math.min(h-1,Math.ceil(cy+r));
  let sum=0, n=0; const vals=[];
  for(let y=y0; y<=y1; y++){
    for(let x=x0; x<=x1; x++){
      const dx=x-cx, dy=y-cy; if(dx*dx+dy*dy>r2) continue;
      const idx=(y*w+x)*4;
      const v = imgData[idx]*0.299 + imgData[idx+1]*0.587 + imgData[idx+2]*0.114;
      sum+=v; n++; vals.push(v);
    }
  }
  return { mean: n?sum/n:255, vals };
}
/* ตรวจสอบ "ตัวล็อค" (ลวดลายขั้นบันไดใต้ Test Version) หลังปรับมุมภาพแล้ว — ควรมีทั้งส่วนมืดและสว่างปนกันมาก
   (ค่าเบี่ยงเบนมาตรฐานของความสว่างในกรอบนี้สูง) ถ้าออกมาเรียบๆ (ขาวล้วน/เข้มล้วน) แปลว่าปรับมุมภาพพลาด/เอียง/เบลอ
   ใช้เป็นตัวเช็คความมั่นใจก่อนเชื่อผลอ่าน ไม่ใช่แค่พึ่งจำนวนหมุดที่เจอ ---- */
function checkLockMark(imgData, w, h){
  const x0 = Math.round(EXAM_LAYOUT.lock.x0*w), x1 = Math.round(EXAM_LAYOUT.lock.x1*w);
  const y0 = Math.round(EXAM_LAYOUT.lock.y0*h), y1 = Math.round(EXAM_LAYOUT.lock.y1*h);
  let sum=0, sum2=0, n=0;
  for(let y=Math.max(0,y0); y<Math.min(h,y1); y++){
    for(let x=Math.max(0,x0); x<Math.min(w,x1); x++){
      const idx=(y*w+x)*4;
      const v = imgData[idx]*0.299 + imgData[idx+1]*0.587 + imgData[idx+2]*0.114;
      sum+=v; sum2+=v*v; n++;
    }
  }
  if(!n) return { ok:false, std:0 };
  const mean = sum/n, variance = Math.max(0, sum2/n - mean*mean), std = Math.sqrt(variance);
  return { ok: std > 35, std }; // ลวดลายขั้นบันไดจริงมีคอนทราสต์สูง std ควรเกิน ~35 ชัดเจน
}
function readAnswers(rectCanvas){
  const w = rectCanvas.width, h = rectCanvas.height;
  const imgData = rectCanvas.getContext("2d").getImageData(0, 0, w, h).data;
  const set = currentExamSet();
  const answerKey = (set && set.answerKey) || {};
  const total = Object.keys(answerKey).length;
  const r = EXAM_LAYOUT.bubbleR * w * 1.15; // ขยายรัศมีเก็บค่าเล็กน้อย ทนต่อการเยื้องศูนย์เล็กน้อยจากการปรับมุมภาพ

  const lock = checkLockMark(imgData, w, h);

  let score = 0;
  const answers = {};
  for(let q=EXAM_LAYOUT.qStart; q<=EXAM_LAYOUT.qEnd; q++){
    const samples = EXAM_LETTERS.map((L,k)=>{
      const {x,y} = examBubblePos(q,k);
      return sampleBubble(imgData, w, h, x*w, y*h, r);
    });
    const means = samples.map(s=>s.mean);

    // เส้นฐาน "กระดาษเปล่า" ของข้อนี้โดยเฉพาะ = ค่าเฉลี่ยของ 3 ตัวเลือกที่สว่างที่สุดในข้อเดียวกัน
    // (สมมติว่าฝนจริงไม่เกิน 1 ข้อ) แทนเส้นฐานรวมทั้งแผ่น เพื่อทนต่อแสง/เงาที่ไม่สม่ำเสมอในแต่ละจุดของกระดาษ
    const orderByMean = means.map((v,i)=>i).sort((a,b)=>means[a]-means[b]);
    const rowBlank = (means[orderByMean[1]] + means[orderByMean[2]] + means[orderByMean[3]]) / 3;
    const darkCut = rowBlank - 30; // พิกเซลเข้มกว่าเส้นฐานของข้อนี้เกิน 30 ระดับ ถือว่าเป็น "หมึก" ของรอยฝน

    // สัดส่วนพิกเซลในวงที่เข้มกว่าเส้นฐานอย่างมีนัยสำคัญ (จับรอยฝนไม่เต็มวง/ฝนเบาได้ดีกว่าดูแค่ค่าเฉลี่ยทั้งวง)
    const darkRatios = samples.map(s=> s.vals.length ? s.vals.filter(v=>v<darkCut).length/s.vals.length : 0);
    const orderByRatio = darkRatios.map((v,i)=>i).sort((a,b)=>darkRatios[b]-darkRatios[a]);
    const topIdx = orderByRatio[0], secondIdx = orderByRatio[1];
    const topRatio = darkRatios[topIdx], secondRatio = darkRatios[secondIdx];
    const fillDrop = rowBlank - means[topIdx]; // ตัวเลือกที่ฝนต้องเข้มกว่าเส้นฐานของข้อนี้ชัดเจนด้วย (กันรอยเปื้อน/เงาเล็กๆ)

    // เงื่อนไขฟันธงว่า "ฝนข้อนี้": (1) มีสัดส่วนหมึกในวงมากพอ (2) เข้มกว่าเส้นฐานของข้อนี้จริง (3) ทิ้งห่างจากตัวเลือกอันดับ 2
    // ชัดเจน ไม่งั้นถือว่าอ่านไม่ชัด/ไม่ได้ฝน (ปล่อยว่างให้ครูตรวจเองดีกว่าฟันธงผิด)
    let chosen = null;
    if(topRatio > 0.30 && fillDrop > 20 && (topRatio - secondRatio) > 0.15){
      chosen = EXAM_LETTERS[topIdx];
    }
    answers[q] = chosen;
    if(chosen && answerKey[q] && chosen===answerKey[q]) score++;
  }
  return { score, total, answers, lowConfidence: !lock.ok };
}

/* ---- วาดวงกลมทับตำแหน่งคำตอบที่ระบบอ่านได้ ลงบนภาพที่ปรับมุมแล้วทั้งแผ่น (เขียว=ตรงเฉลย, แดง=ไม่ตรงเฉลย)
   เก็บภาพนี้ไว้เป็น "fullImage" แยกจาก headerImage เพื่อให้ครูแตะดูย้อนหลังได้ว่าระบบตรวจข้อไหนว่าอย่างไร
   หมายเหตุเรื่องขอบเขตครอป: rectified ที่ส่งเข้ามาถูกปรับมุมด้วย homography ให้พอดีกับกรอบหมุดทั้ง 6 จุดอยู่แล้ว
   (มุม tl/tr/bl/br แม็ปตรงกับขอบภาพ 0..EXAM_RECT_W/H พอดี ไม่มีส่วนเกินขอบกระดาษหลุดเข้ามา) จึงใช้ทั้งภาพได้เลยไม่ต้อง crop ซ้ำ ---- */
function markAnswersOnImage(rectCanvas, answers, answerKey){
  const ctx = rectCanvas.getContext("2d");
  const w = rectCanvas.width;
  const r = EXAM_LAYOUT.bubbleR * w * 1.4; // วาดใหญ่กว่าวงจริงเล็กน้อยให้เห็นชัดตอนดูย้อนหลัง
  ctx.lineWidth = Math.max(2, w*0.007);
  for(let q=EXAM_LAYOUT.qStart; q<=EXAM_LAYOUT.qEnd; q++){
    const chosen = answers[q];
    if(!chosen) continue;
    const k = EXAM_LETTERS.indexOf(chosen);
    if(k < 0) continue;
    const { x, y } = examBubblePos(q, k);
    const correct = answerKey[q] && chosen === answerKey[q];
    ctx.strokeStyle = correct ? "#1E8E3E" : "#D93025";
    ctx.beginPath();
    ctx.arc(x*rectCanvas.width, y*rectCanvas.height, r, 0, Math.PI*2);
    ctx.stroke();
  }
  return rectCanvas;
}

/* ---- สถานะกล้อง/การสแกน ---- */
let scanStream=null, scanRAF=null, scanBusy=false, scanStableQueue=[], scanCurNum=1, scanFacing="environment";
let scanProcCanvas=null, scanProcCtx=null, scanOverlayCtx=null;
const SCAN_PROC_W = 200, SCAN_STABLE_FRAMES = 6, SCAN_STABLE_TOL = 3;

function examFirstUnscanned(set){
  for(let i=1; i<=20; i++){ if(!set.students || !set.students[i] || set.students[i].total==null) return i; }
  return 1;
}
function updateScanNumUI(){ const el = qs("#scanNumCur"); if(el) el.textContent = scanCurNum; }

async function startExamScan(){
  const set = currentExamSet();
  if(!set){ showView("view-exam"); return; }
  if(!Object.keys(set.answerKey||{}).length){
    toast("ตั้งเฉลยให้ครบก่อนถึงจะตรวจคะแนนได้ครับ");
    showView("view-exam-manage");
    return;
  }
  scanCurNum = examFirstUnscanned(set);
  updateScanNumUI();
  qs("#scanResult").style.display = "none";
  qs("#scanStatus").textContent = "กำลังเปิดกล้อง…";
  try{
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode:{ideal:scanFacing}, width:{ideal:1280}, height:{ideal:960} },
      audio: false
    });
  }catch(err){
    qs("#scanStatus").textContent = "เปิดกล้องไม่สำเร็จ — ตรวจสิทธิ์การเข้าถึงกล้องในเบราว์เซอร์ (" + (err.message||"") + ")";
    return;
  }
  const video = qs("#scanVideo");
  video.srcObject = scanStream;
  video.onloadedmetadata = ()=>{
    const stage = qs("#scanStage");
    if(stage && video.videoWidth && video.videoHeight) stage.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
  };
  try{ await video.play(); }catch(e){}
  scanStableQueue = [];
  scanLoop();
}
function stopExamScan(){
  if(scanRAF){ cancelAnimationFrame(scanRAF); scanRAF=null; }
  if(scanStream){ scanStream.getTracks().forEach(t=>t.stop()); scanStream=null; }
  const video = qs("#scanVideo"); if(video) video.srcObject = null;
  scanStableQueue = []; scanBusy = false;
}
document.addEventListener("visibilitychange", ()=>{
  const inScan = qs("#view-exam-scan") && qs("#view-exam-scan").classList.contains("active");
  if(!inScan) return;
  if(document.hidden) stopExamScan(); else startExamScan();
});

/* ---- สี่เหลี่ยมไกด์สีเขียว 4 อัน ที่ "วิ่งเข้าไปเกาะ" จุดดำ 4 มุมที่ตรวจจับได้จริงในแต่ละเฟรม
   (เปลี่ยนจากกรอบไกด์คงที่แบบเดิมที่ค้างอยู่กับที่แล้วให้ผู้ใช้ขยับมือถือเข้าหา มาเป็นระบบช่วยตรวจจับที่ขยับตามภาพแทน)
   วาดเฉพาะตอนตรวจจับหมุดได้แล้วเท่านั้น — ถ้ายังไม่เจอจะไม่มีกรอบใดๆ ค้างอยู่ มีแต่ข้อความสถานะบอกให้เล็งกล้อง ---- */
function drawMarkerSquares(ctx, markers, sx, sy, w, h, color){
  const size = Math.max(14, Math.min(w,h) * 0.06); // ขนาดกรอบสัมพัทธ์กับพื้นที่วิดีโอที่แสดง
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = "round";
  [markers.tl, markers.tr, markers.bl, markers.br].forEach(p=>{
    if(!p) return;
    const x = p.x*sx, y = p.y*sy;
    ctx.strokeRect(x-size/2, y-size/2, size, size);
  });
}

function scanLoop(){
  scanRAF = requestAnimationFrame(scanLoop);
  const video = qs("#scanVideo");
  if(!video || !video.videoWidth || scanBusy) return;
  if(!scanProcCanvas){ scanProcCanvas = document.createElement("canvas"); scanProcCtx = scanProcCanvas.getContext("2d", {willReadFrequently:true}); }
  const vw = video.videoWidth, vh = video.videoHeight;
  const pw = SCAN_PROC_W, ph = Math.max(1, Math.round(SCAN_PROC_W * vh/vw));
  scanProcCanvas.width = pw; scanProcCanvas.height = ph;
  scanProcCtx.drawImage(video, 0, 0, pw, ph);
  const markers = detectMarkers(scanProcCtx, pw, ph);

  const overlay = qs("#scanOverlay");
  if(overlay){
    if(overlay.width !== overlay.clientWidth) overlay.width = overlay.clientWidth;
    if(overlay.height !== overlay.clientHeight) overlay.height = overlay.clientHeight;
    if(!scanOverlayCtx) scanOverlayCtx = overlay.getContext("2d");
    scanOverlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    if(markers && overlay.width && overlay.height){
      const sx = overlay.width/pw, sy = overlay.height/ph;
      const hasMid = !!(markers.ml && markers.mr);
      const color = hasMid ? "#34D399" : "#FBBF24"; // เขียว = เจอครบ 6 จุด, เหลือง = เจอแค่ 4 มุมนอกสุด (fallback)
      drawMarkerSquares(scanOverlayCtx, markers, sx, sy, overlay.width, overlay.height, color);
      if(hasMid){
        // จุดกลางซ้าย/ขวา แสดงเป็นวงกลมเล็กแทนสี่เหลี่ยม (ไม่ใช่มุมกระดาษ ไว้ช่วยดูว่าเจอครบ 6 จุด)
        scanOverlayCtx.fillStyle = color;
        [markers.ml, markers.mr].forEach(p=>{
          scanOverlayCtx.beginPath(); scanOverlayCtx.arc(p.x*sx, p.y*sy, 5, 0, Math.PI*2); scanOverlayCtx.fill();
        });
      }
    }
  }

  const statusEl = qs("#scanStatus");
  if(!markers){
    scanStableQueue = [];
    if(statusEl) statusEl.textContent = "เล็งกล้องให้เห็นกระดาษคำตอบครบ (จุดดำ 6 จุด)";
    return;
  }
  scanStableQueue.push(markers);
  if(scanStableQueue.length > SCAN_STABLE_FRAMES) scanStableQueue.shift();
  if(scanStableQueue.length < SCAN_STABLE_FRAMES){
    if(statusEl) statusEl.textContent = "เจอกระดาษแล้ว ถือนิ่งๆ…";
    return;
  }
  // เทียบเฉพาะ key ที่มีอยู่ในทุกเฟรมของคิว (กันเคสสลับไปมาระหว่างเจอ 6 จุด/4 จุด)
  const commonKeys = Object.keys(scanStableQueue[scanStableQueue.length-1]).filter(k=> scanStableQueue.every(m=>m[k]));
  let maxMove = 0;
  for(const key of commonKeys){
    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
    for(const m of scanStableQueue){ const p=m[key]; if(p.x<minX)minX=p.x; if(p.x>maxX)maxX=p.x; if(p.y<minY)minY=p.y; if(p.y>maxY)maxY=p.y; }
    maxMove = Math.max(maxMove, maxX-minX, maxY-minY);
  }
  if(maxMove > SCAN_STABLE_TOL){
    if(statusEl) statusEl.textContent = "ถือนิ่งๆ อีกนิดนะครับ";
    return;
  }
  if(statusEl) statusEl.textContent = "กำลังถ่าย…";
  scanBusy = true;
  const finalMarkers = scanStableQueue[scanStableQueue.length-1];
  const scaleX = vw/pw, scaleY = vh/ph;
  const scalePt = p=> ({x:p.x*scaleX, y:p.y*scaleY});
  const srcPts = {
    tl: scalePt(finalMarkers.tl), tr: scalePt(finalMarkers.tr),
    bl: scalePt(finalMarkers.bl), br: scalePt(finalMarkers.br),
    ml: finalMarkers.ml ? scalePt(finalMarkers.ml) : null,
    mr: finalMarkers.mr ? scalePt(finalMarkers.mr) : null
  };
  captureAndScore(video, srcPts).finally(()=>{ scanBusy=false; scanStableQueue=[]; });
}

/* ---- ครอปภาพแบบหยาบจากกรอบสี่เหลี่ยมที่ล้อมจุดหมุดทั้งหมดที่ตรวจเจอ (มีขอบเผื่อเล็กน้อย) ก่อนปรับมุมภาพแบบละเอียด
   เหตุผล: การตรวจจับหมุดตอนเล็งกล้อง (detectMarkers) ทำงานบนเฟรมที่ย่อเล็กมาก (SCAN_PROC_W=200px) เพื่อความเร็ว
   ถ้าเอาพิกัดหมุดที่ได้จากตรงนั้นไปคำนวณปรับมุมภาพ (perspective) กับเฟรมเต็มความละเอียดสูงทันทีเลย ตำแหน่งหมุดอาจคลาดเคลื่อนได้
   (โดยเฉพาะตอนถือมือถือเอียง) แถมพื้นหลังนอกกระดาษที่มีของสีดำอื่นๆ (เช่น เงา/ปากกา/เก้าอี้) ยังปนอยู่เต็มเฟรม
   ทำให้ระบบตรวจจับ/อ่านค่าคลาดเคลื่อนไปตรวจจับสิ่งอื่นที่ไม่ใช่หมุดจริงของเราปนเข้ามาได้
   วิธีแก้: ครอปเฉพาะกรอบที่ล้อมกระดาษออกมาก่อน (ตัดพื้นหลังทิ้ง) แล้วค่อยตรวจจับหมุดซ้ำในภาพที่ครอปแล้ว (ดูโค้ดใน captureAndScore)
   ซึ่งหมุดจะดูใหญ่ขึ้นชัดขึ้นเทียบกับเฟรม ทำให้ตำแหน่งหมุดที่ได้แม่นกว่า ก่อนจะนำไปปรับมุมภาพ (rectifyImage) จริงในขั้นสุดท้าย ---- */
function roughCropToMarkers(srcCanvas, pts){
  const all = [pts.tl, pts.tr, pts.bl, pts.br, pts.ml, pts.mr].filter(Boolean);
  if(all.length < 4) return null;
  let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  all.forEach(p=>{ if(p.x<minX)minX=p.x; if(p.x>maxX)maxX=p.x; if(p.y<minY)minY=p.y; if(p.y>maxY)maxY=p.y; });
  const bw = maxX-minX, bh = maxY-minY;
  if(bw<=0 || bh<=0) return null;
  const padX = bw*0.08, padY = bh*0.08; // เผื่อขอบไว้เล็กน้อย กันหมุดโดนตัดขอบพอดี
  const x0 = Math.max(0, Math.floor(minX-padX)), y0 = Math.max(0, Math.floor(minY-padY));
  const x1 = Math.min(srcCanvas.width, Math.ceil(maxX+padX)), y1 = Math.min(srcCanvas.height, Math.ceil(maxY+padY));
  const cw = x1-x0, ch = y1-y0;
  if(cw<=0 || ch<=0) return null;
  const out = document.createElement("canvas"); out.width = cw; out.height = ch;
  out.getContext("2d").drawImage(srcCanvas, x0, y0, cw, ch, 0, 0, cw, ch);
  // แปลงพิกัดจุดหมุดเดิมให้อ้างอิงกับภาพที่ครอปแล้ว (ลบออฟเซ็ตมุมครอปออก) แทนภาพเต็มแบบเดิม
  const shift = p=> p ? {x:p.x-x0, y:p.y-y0} : null;
  return { canvas: out, pts: { tl:shift(pts.tl), tr:shift(pts.tr), bl:shift(pts.bl), br:shift(pts.br), ml:shift(pts.ml), mr:shift(pts.mr) } };
}

async function captureAndScore(video, srcPts){
  const vw = video.videoWidth, vh = video.videoHeight;
  const shot = document.createElement("canvas"); shot.width=vw; shot.height=vh;
  shot.getContext("2d").drawImage(video, 0, 0);

  // ---- ขั้นที่ 1: ครอปกระดาษออกมาก่อนแบบหยาบจากกรอบที่ล้อมจุดหมุด (ตัดพื้นหลัง/สิ่งของสีดำอื่นๆนอกกระดาษทิ้งไป)
  //      แล้วตรวจจับหมุดซ้ำในภาพที่ครอปแล้ว (ขยายให้ชัดขึ้น หมุดดูใหญ่ขึ้นเทียบเฟรม แม่นกว่าตรวจจับจากเฟรมเต็มตรงๆ
  //      โดยเฉพาะตอนมือถือเอียง) ก่อนค่อยปรับมุมภาพแบบละเอียดในขั้นที่ 2 ---- */
  const rough = roughCropToMarkers(shot, srcPts);
  const cropCanvas = rough ? rough.canvas : shot;
  let finalPts = rough ? rough.pts : srcPts;
  if(rough){
    const RECHECK_W = 500;
    const reCanvas = document.createElement("canvas");
    reCanvas.width = RECHECK_W;
    reCanvas.height = Math.max(1, Math.round(RECHECK_W * cropCanvas.height / cropCanvas.width));
    const reCtx = reCanvas.getContext("2d", {willReadFrequently:true});
    reCtx.drawImage(cropCanvas, 0, 0, reCanvas.width, reCanvas.height);
    const reMarkers = detectMarkers(reCtx, reCanvas.width, reCanvas.height);
    if(reMarkers){
      const rsx = cropCanvas.width/reCanvas.width, rsy = cropCanvas.height/reCanvas.height;
      const scaleBack = p=> p ? {x:p.x*rsx, y:p.y*rsy} : null;
      finalPts = {
        tl: scaleBack(reMarkers.tl), tr: scaleBack(reMarkers.tr),
        bl: scaleBack(reMarkers.bl), br: scaleBack(reMarkers.br),
        ml: reMarkers.ml ? scaleBack(reMarkers.ml) : null,
        mr: reMarkers.mr ? scaleBack(reMarkers.mr) : null
      };
    }
    // ตรวจซ้ำไม่เจอ (เช่นครอปพลาดหมุดบางจุดไปนิดหน่อย) ก็ยังใช้ finalPts จากขั้นแรก (rough.pts) ต่อได้ตามเดิม ไม่บล็อกการทำงาน
  }

  // ---- ขั้นที่ 2: ปรับมุมภาพ (perspective correction) แบบละเอียดจากภาพที่ครอปแล้วในขั้นที่ 1 ---- //
  const rectified = rectifyImage(cropCanvas, finalPts);
  if(!rectified){
    toast("คำนวณมุมภาพไม่สำเร็จ ลองถือกระดาษให้เห็นครบ 4 มุมอีกครั้ง");
    const statusEl = qs("#scanStatus"); if(statusEl) statusEl.textContent = "ลองอีกครั้งครับ";
    return;
  }
  const set = currentExamSet(); if(!set) return;
  const { score, total, answers, lowConfidence } = readAnswers(rectified);
  const headerCanvas = cropFraction(rectified, EXAM_LAYOUT.header.x0, EXAM_LAYOUT.header.y0, EXAM_LAYOUT.header.x1, EXAM_LAYOUT.header.y1);
  const headerBlob = await new Promise(res=> headerCanvas.toBlob(res, "image/jpeg", 0.85));
  // วงกลมคำตอบที่ตรวจได้ลงบนภาพเต็มแผ่น (rectified) หลังจาก crop หัวกระดาษออกไปแล้ว เพื่อเก็บไว้ให้ครูแตะดูย้อนหลังได้
  markAnswersOnImage(rectified, answers, set.answerKey || {});
  const fullBlob = await new Promise(res=> rectified.toBlob(res, "image/jpeg", 0.85));
  const imgKey = `${set.id}_${scanCurNum}`;
  const fullKey = `${imgKey}_full`;
  if(headerBlob){ try{ await examDBPut(imgKey, headerBlob); }catch(e){} }
  if(fullBlob){ try{ await examDBPut(fullKey, fullBlob); }catch(e){} }
  set.students = set.students || {};
  set.students[scanCurNum] = { score, total, headerImage: imgKey, fullImage: fullKey, scannedAt: Date.now() };
  saveExamSets();
  // ตัวล็อคใต้กระดาษไม่ชัด แปลว่าปรับมุมภาพอาจคลาดเคลื่อน (เอียง/เบลอ/แสงไม่พอ) — เตือนให้ครูตรวจซ้ำ ไม่บล็อกผลไว้เฉยๆ
  if(lowConfidence) toast("ภาพอาจไม่ชัดหรือมุมกระดาษเพี้ยน ลองตรวจคะแนนที่ได้เทียบกับกระดาษจริงอีกครั้ง");
  showScanResult(headerBlob, score, total, fullKey);
}
function showScanResult(headerBlob, score, total, fullKey){
  const res = qs("#scanResult"), thumb = qs("#scanResultThumb");
  if(headerBlob){
    if(thumb.dataset.url) URL.revokeObjectURL(thumb.dataset.url);
    const url = URL.createObjectURL(headerBlob);
    thumb.src = url; thumb.dataset.url = url;
  }
  thumb.dataset.fullKey = fullKey || "";
  qs("#scanResultScore").textContent = `เลขที่ ${scanCurNum} · ได้ ${score}/${total} คะแนน`;
  res.style.display = "flex";
  const statusEl = qs("#scanStatus"); if(statusEl) statusEl.textContent = 'แตะรูปเพื่อดูภาพเต็มและตรวจทาน แล้วกด "ถัดไป"';
}
/* ---- เปิด modal ดูภาพกระดาษคำตอบเต็มแผ่น (พร้อมวงกลมคำตอบที่ตรวจแล้ว) จาก key ใน IndexedDB ---- */
async function openImgView(key){
  if(!key) return;
  try{
    const blob = await examDBGet(key);
    if(!blob){ toast("ไม่พบภาพนี้ (อาจเป็นชุดข้อสอบเก่าก่อนมีฟีเจอร์นี้)"); return; }
    const img = qs("#imgViewPic");
    if(img.dataset.url) URL.revokeObjectURL(img.dataset.url);
    const url = URL.createObjectURL(blob);
    img.src = url; img.dataset.url = url;
    qs("#modalImgView").classList.add("active");
  }catch(e){ toast("เปิดภาพไม่สำเร็จ"); }
}
qs("#scanResultThumb").addEventListener("click", ()=> openImgView(qs("#scanResultThumb").dataset.fullKey));
qsa("#modalImgView [data-close]").forEach(b=> b.addEventListener("click", ()=> qs("#modalImgView").classList.remove("active")));

qs("#scanNumPrev").addEventListener("click", ()=>{
  scanCurNum = scanCurNum>1 ? scanCurNum-1 : 20; updateScanNumUI(); qs("#scanResult").style.display="none";
});
qs("#scanNumNext").addEventListener("click", ()=>{
  scanCurNum = scanCurNum<20 ? scanCurNum+1 : 1; updateScanNumUI(); qs("#scanResult").style.display="none";
});
qs("#scanOkBtn").addEventListener("click", ()=>{
  renderExamManage();
  const set = currentExamSet();
  scanCurNum = set ? examFirstUnscanned(set) : (scanCurNum<20 ? scanCurNum+1 : 1);
  updateScanNumUI();
  qs("#scanResult").style.display = "none";
  const statusEl = qs("#scanStatus"); if(statusEl) statusEl.textContent = "เล็งกล้องให้เห็นกระดาษคำตอบครบทั้ง 4 มุม";
});
qs("#scanRedoBtn").addEventListener("click", ()=>{
  qs("#scanResult").style.display = "none";
  const statusEl = qs("#scanStatus"); if(statusEl) statusEl.textContent = "เล็งกล้องให้เห็นกระดาษคำตอบครบทั้ง 4 มุม";
});
qs("#scanManualBtn").addEventListener("click", ()=>{
  if(scanBusy) return;
  const video = qs("#scanVideo");
  if(!video || !video.videoWidth){ toast("กล้องยังไม่พร้อม"); return; }
  // ถ่ายเองแบบไม่ยึดหมุด (เผื่อกรณีตรวจจับหมุดยาก) — ใช้กรอบภาพทั้งหมดแทน 4 มุม เหมาะกับตอนถือกระดาษให้เต็มเฟรมพอดี
  scanBusy = true;
  const vw = video.videoWidth, vh = video.videoHeight;
  const srcPts = { tl:{x:0,y:0}, tr:{x:vw,y:0}, bl:{x:0,y:vh}, br:{x:vw,y:vh} };
  captureAndScore(video, srcPts).finally(()=>{ scanBusy=false; });
});
qs("#scanFlipBtn").addEventListener("click", async ()=>{
  scanFacing = scanFacing==="environment" ? "user" : "environment";
  stopExamScan();
  await startExamScan();
});

/* ---- พิมพ์กระดาษคำตอบเปล่า ----
   ใช้ไฟล์ภาพ Answer.png ตัวจริงเป็นแบบฟอร์มพิมพ์โดยตรง (ไม่ใช้ CSS วาดจุด/วงกลมเองแบบเดิมอีกต่อไป)
   เหตุผล: EXAM_LAYOUT ทั้งหมดด้านบน (ตำแหน่งหมุด 6 จุด/แถว/คอลัมน์/ตัวล็อค) คำนวณมาจากการวัดพิกเซลจริงของไฟล์นี้
   ถ้าให้เบราว์เซอร์ประกอบหน้าพิมพ์เองใหม่ด้วย CSS/font จะเสี่ยงคลาดเคลื่อนเล็กน้อยตามแต่ละเครื่อง/เบราว์เซอร์
   (ระยะขอบ, การเรนเดอร์ฟอนต์, ขนาดพิกเซลตอนพิมพ์) ซึ่งพอสะสมแล้วมีผลต่อความแม่นยำตอนสแกนอ่านค่ากลับ
   การพิมพ์รูปเดิมตรงๆ จึงรับประกันได้ว่ากระดาษที่พิมพ์ออกมาตรงกับพิกัดที่ใช้คำนวณในระบบสแกน 100%
   ครูต้องนำไฟล์ Answer.png ไปวางไว้โฟลเดอร์เดียวกับ KruChuay.html/script.js (หรือแก้ ANSWER_SHEET_IMG ด้านล่างเป็น URL อื่น) ---- */
const ANSWER_SHEET_IMG = "Answer.png";
function buildPrintSheetHTML(examName){
  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
<title>กระดาษคำตอบ${examName ? ": "+examName : ""}</title>
<style>
  @page{ size:A4 portrait; margin:8mm; }
  *{box-sizing:border-box;}
  body{margin:0; font-family:'Noto Sans Thai',Tahoma,sans-serif;}
  .ps-title{ text-align:center; font-size:14px; font-weight:700; margin:2mm 0; }
  .ps-page{ width:100%; }
  .ps-page img{ display:block; width:100%; height:auto; }
  .ps-foot{ text-align:center; font-size:9px; color:#666; margin-top:1mm; }
  .ps-noprint{ text-align:center; padding:14px; font-family:sans-serif; }
  .ps-noprint .err{ color:#b91c1c; font-size:13px; }
  @media print{ .ps-noprint{display:none;} }
</style></head>
<body>
  <div class="ps-noprint">
    <button onclick="window.print()" style="font-size:16px; padding:8px 22px; cursor:pointer;">🖨 พิมพ์</button>
    <button onclick="window.close()" style="font-size:16px; padding:8px 22px; cursor:pointer; margin-left:8px;">‹ ปิดหน้านี้</button>
    <p style="font-size:13px;color:#666">ตั้งค่าพิมพ์เป็นขนาด 100% (ไม่ใช่ Fit to page) เพื่อให้ตำแหน่งจุดดำตรงตามที่ระบบสแกนคำนวณไว้</p>
    <p class="err" id="psImgErr" style="display:none">โหลดรูป ${esc(ANSWER_SHEET_IMG)} ไม่สำเร็จ — วางไฟล์นี้ไว้โฟลเดอร์เดียวกับหน้าเว็บ แล้วรีเฟรชอีกครั้ง</p>
  </div>
  ${examName ? `<div class="ps-title">${esc(examName)}</div>` : ""}
  <div class="ps-page"><img src="${esc(ANSWER_SHEET_IMG)}" alt="กระดาษคำตอบ" onerror="document.getElementById('psImgErr').style.display='block'"></div>
  <div class="ps-foot">ระบายวงกลมให้เข้มและเต็มวงด้วยปากกา/ดินสอเข้ม ห้ามพับหรือทำให้จุดดำเสียหาย</div>
</body></html>`;
}
function openPrintSheet(){
  const set = currentExamSet();
  const html = buildPrintSheetHTML(set ? set.name : "");
  const win = window.open("", "_blank");
  if(!win){ toast("เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตแล้วลองใหม่"); return; }
  win.document.open(); win.document.write(html); win.document.close();
}
qs("#emPrintBtn").addEventListener("click", openPrintSheet);

/* ================= ปุ่มขยายเต็มจอ: ยุบทุกอย่างเหลือแค่ตาราง (เลขที่/รายชื่อ/ช่องลงคะแนน/หัวตาราง)
   + ขอเข้าโหมด Fullscreen จริงของมือถือ (ซ่อนแถบที่อยู่/แถบเบราว์เซอร์ ให้เว็บกินเต็มจอจริง ๆ)
   - ไม่จำค่าไว้ข้ามหน้า: ทุกครั้งที่กด "เข้าดู/เข้าลงคะแนน" ใหม่ (จากหน้าเลือกห้อง) จะเริ่มแบบปกติเสมอ
   - ตอนโฟกัสอยู่ ปุ่มย้อนกลับ (back-btn) ในแถบหัวจะถูกซ่อนไปด้วย เหลือแค่ปุ่ม ⤡ นี้ปุ่มเดียวที่กดได้
     ต้องกดยุบโหมดนี้ออกก่อน ถึงจะเห็นปุ่มย้อนกลับแล้วกดออกจากหน้าได้ (กันกดย้อนกลับมาแล้วค้างเป็นเต็มจอ)
   - หมายเหตุ: Fullscreen API นี้ Android Chrome รองรับเต็มที่ (ซ่อนแถบด้านบน/ล่างจริง) ส่วน iPhone Safari
     ตัวเบราว์เซอร์เองยังไม่รองรับการขอ fullscreen ของหน้าเว็บทั่วไป (ข้อจำกัดจาก Apple) จึงจะเห็นแค่โหมดยุบ UI
     ให้ใหญ่/อ่านง่ายขึ้นตามปกติ แต่แถบที่อยู่ของ Safari จะไม่หายไป — ถ้าอยากได้เต็มจอจริงบน iPhone ต้องกด
     "แชร์ > เพิ่มไปยังหน้าจอโฮม" แล้วเปิดแอปจากไอคอนนั้นแทนการเปิดผ่าน Safari ตรง ๆ */
function requestFS(el){
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.webkitEnterFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if(fn){ try{ const r = fn.call(el); if(r && r.catch) r.catch(()=>{}); }catch(e){} }
}
function exitFS(){
  if(!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)) return;
  const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
  if(fn){ try{ const r = fn.call(document); if(r && r.catch) r.catch(()=>{}); }catch(e){} }
}
/* จอมือถือ (แคบ) เท่านั้นที่จะขอ Fullscreen API จริงของเบราว์เซอร์ — บนคอม/จอกว้าง ปุ่มนี้จะแค่สลับโหมด
   ย่อ UI (ตัวใหญ่ขึ้น/เคลียร์ส่วนที่ไม่จำเป็น) โดยไม่ยิงขอเต็มจอทั้งหน้าต่างเบราว์เซอร์ */
function isMobileViewport(){ return window.matchMedia("(max-width:600px)").matches; }
let focusMode = false;
function applyFocusMode(){
  document.body.classList.toggle("focus-mode", focusMode);
  qsa(".focus-btn").forEach(b=>{ b.textContent = focusMode ? "⤡" : "⤢"; b.title = focusMode ? "ย่อกลับ / ย้อนกลับได้" : "ขยายเต็มจอ"; });
}
function exitFocusMode(){ if(focusMode){ focusMode = false; applyFocusMode(); exitFS(); } }
qsa(".focus-btn").forEach(b=> b.addEventListener("click", ()=>{
  focusMode = !focusMode;
  applyFocusMode();
  if(focusMode){ if(isMobileViewport()) requestFS(document.documentElement); }
  else exitFS();
}));
/* เผื่อผู้ใช้กดออกจาก fullscreen เอง (เช่น ปุ่มย้อนกลับของระบบ Android) ให้ UI ย่อตามกลับมาปกติด้วย */
["fullscreenchange","webkitfullscreenchange","mozfullscreenchange","MSFullscreenChange"].forEach(ev=>
  document.addEventListener(ev, ()=>{
    const inFS = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if(!inFS && focusMode){ focusMode = false; applyFocusMode(); }
  })
);
applyFocusMode();

/* =====================================================================
   ครูประจำชั้น (Homeroom)
   - รายชื่อนักเรียนห้องประจำชั้น (รูป / ชื่อเล่น / โทรออก / แก้ข้อมูล)
   - เช็คเอกสาร (หัวตารางเพิ่มเองได้ ติ๊กแล้วบันทึกรวดเดียว)
   - เงินอุดหนุน (สั่งซื้อรายคน + สรุปรวมทั้งห้อง)
   ห้องประจำชั้นดูจากชีท Config : รายวิชา = Homeroom , ระดับชั้น = ห้อง
   ===================================================================== */
const HR_ROOM_KEY = "kc_hr_room";
const hr = { room:"", q:"", cur:null, edit:false, draft:{} };
const hrPhotoCache = new Map();   // รหัสไฟล์รูป -> data URL (ไฟล์ใหม่ = รหัสใหม่ จึงแคชได้ตลอด)
const hrPhotoPending = new Map();

const isHomeroomName = n => { const k = normKey(n); return !!k && k.length < 40 && (/home-?room/.test(k) || k.includes("โฮมรูม") || k.includes("ประจำชั้น")); };
function homeroomRooms(){
  const out = [];
  const add = c => { const lv = String(rget(c, "ระดับชั้น") ?? "").trim(); if(lv && !out.some(x=>sameLv(x, lv))) out.push(lv); };
  state.config.forEach(c=>{ if(isHomeroomName(rget(c, "รายวิชา"))) add(c); });
  if(!out.length){   // สำรอง: ชื่อหัวคอลัมน์ไม่ตรง → หาคำว่า Homeroom ในทุกช่องของแถว
    state.config.forEach(c=>{ if(Object.values(c).some(v=> typeof v==="string" && isHomeroomName(v))) add(c); });
  }
  return out;
}
function hrEnsureRoom(){
  const rooms = homeroomRooms();
  if(!rooms.includes(hr.room)){
    let saved = ""; try{ saved = localStorage.getItem(HR_ROOM_KEY) || ""; }catch(e){}
    hr.room = rooms.includes(saved) ? saved : (rooms[0] || "");
  }
  return rooms;
}

/* ---------- ตัวช่วยทั่วไป ---------- */
function fixPhone(v){
  let s = String(v ?? "").replace(/[^\d+]/g, "");
  if(/^\d{9}$/.test(s)) s = "0" + s;   // Google Sheet ชอบตัดเลข 0 หน้าเบอร์มือถือทิ้ง
  return s;
}
function fmtPhone(s){
  const d = String(s||"");
  if(/^0\d{9}$/.test(d)) return d.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  if(/^0\d{8}$/.test(d)) return d.replace(/(\d{2})(\d{3})(\d{4})/, "$1-$2-$3");
  return d;
}
const baht = n => "฿" + Number(n||0).toLocaleString("en-US");
const PHONE_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.6 21 3 13.4 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg>`;

function photoId(v){
  const s = String(v||"").trim(); if(!s) return "";
  const m = s.match(/(?:\/d\/|id=)([-\w]{20,})/); if(m) return m[1];
  return /^[-\w]{20,}$/.test(s) ? s : "";
}
function photoSrc(v){
  const s = String(v||"").trim(); if(!s) return "";
  const id = photoId(s);
  if(id) return hrPhotoCache.get(id) || `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
  return /^(https?:|data:)/.test(s) ? s : "";
}
/* รูปจาก Drive โหลดตรงๆ ไม่ได้ (โดเมนโรงเรียนห้ามแชร์ลิงก์ ฯลฯ) → ขอผ่าน Apps Script แทน แล้วแคชไว้ */
document.addEventListener("error", e=>{
  const im = e.target;
  if(!(im instanceof HTMLImageElement) || !im.closest(".hr-av")) return;
  if(!im.dataset.pid || im.dataset.fb){ im.style.display = "none"; return; }   // โหลดไม่ได้จริงๆ → ซ่อนรูป เหลือตัวอักษรย่อ
  im.dataset.fb = "1";
  const id = im.dataset.pid;
  let p = hrPhotoPending.get(id);
  if(!p){
    p = apiGet("photo&id=" + encodeURIComponent(id)).then(r=>{
      if(r && r.dataUrl){ hrPhotoCache.set(id, r.dataUrl); return r.dataUrl; }
      return "";
    }).catch(()=>"");
    hrPhotoPending.set(id, p);
  }
  p.then(url=>{ if(url) im.src = url; else im.style.display = "none"; });
}, true);

const HR_AV_COLORS = [["#E8F0FE","#174EA6"],["#E6F4EA","#0D652D"],["#FEF3D0","#7A4F00"],["#F3E8FD","#6B21A8"],["#FFE9F1","#9D174D"],["#E0F7FA","#006064"],["#FFF0E0","#9A3412"]];
function hrInitial(st){
  const src = st.nick || st.name.replace(/^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นางสาว|น\.ส\.|นาย|นาง)\s*/, "");
  const ch = [...src]; let i = 0;
  while(i < ch.length-1 && /[เแโใไ]/.test(ch[i])) i++;
  return ch[i] || "?";
}
function hrAvatar(st, cls="", badge=true){
  const [bg, fg] = HR_AV_COLORS[(Number(st.no) || st.name.length) % HR_AV_COLORS.length];
  const src = photoSrc(st.photo), pid = photoId(st.photo);
  return `<span class="hr-av ${cls}" style="--av-bg:${bg};--av-fg:${fg}"><i>${esc(hrInitial(st))}</i>` +
    (src ? `<img src="${esc(src)}" ${pid ? `data-pid="${pid}"` : ""} alt="">` : "") +
    (badge && st.no!=="" && st.no!=null ? `<b class="hr-badge">${esc(st.no)}</b>` : "") + `</span>`;
}

/* นักเรียนห้องประจำชั้น (ชื่อซ้ำ -> ต่อท้ายเลขที่ เหมือนหน้าลงคะแนน) */
function hrStudents(room=hr.room){
  const seen = new Set(), list = [];
  studentsOfRoom(room).forEach(r=>{
    const name = String(r["ชื่อ-สกุล"]||"").trim(), no = r["เลขที่"];
    const sig = `${name}#${no}`;
    if(!name || seen.has(sig)) return;
    seen.add(sig); list.push({ row:r, name, no });
  });
  const count = {}; list.forEach(x=>{ count[x.name] = (count[x.name]||0)+1; });
  list.forEach(x=>{
    x.key = count[x.name]>1 ? `${x.name} (เลขที่ ${x.no})` : x.name;
    x.get = k => String(x.row[k] ?? "").trim();
    x.nick = x.get("ชื่อเล่น"); x.photo = x.get("รูปภาพ"); x.code = x.get("รหัสนักเรียน"); x.hobby = x.get("งานอดิเรก");
    x.sphone = fixPhone(x.row["เบอร์โทรนักเรียน"]); x.pphone = fixPhone(x.row["เบอร์โทรผู้ปกครอง"]);
  });
  return list;
}
const hrFind = key => hrStudents().find(s=>s.key===key);
const hrLabel = st => st.nick ? `${st.nick} (${st.name})` : st.name;

/* ================= หน้าหลัก: รายชื่อห้องประจำชั้น ================= */
function openHomeroom(){
  exitFocusMode();
  hr.q = ""; const s = qs("#hrSearch"); if(s) s.value = "";
  renderHomeroom();
  showView("view-homeroom");
  apiGet("students").then(r=>{   // ดึงรายชื่อล่าสุดเงียบๆ (เผื่อแก้ในชีทมา) โดยไม่ขึ้นหน้าจอโหลด
    if(!Array.isArray(r)) return;
    state.students = r;
    if(qs("#view-homeroom").classList.contains("active")) renderHomeroom();
  }).catch(()=>{});
}
function hrCallBtns(st){
  const call = (num, cls, ttl)=> `<a class="hr-call ${cls}" href="tel:${esc(num)}" title="โทร${ttl} ${esc(fmtPhone(num))}">${PHONE_SVG}</a>`;
  let h = st.pphone ? call(st.pphone, "gdn", "ผู้ปกครอง") : `<button type="button" class="hr-call empty" data-add="เบอร์โทรผู้ปกครอง" title="เพิ่มเบอร์ผู้ปกครอง">＋</button>`;
  if(st.sphone) h += call(st.sphone, "stu", "นักเรียน");
  return h;
}
function renderHomeroom(){
  const rooms = hrEnsureRoom();
  const list = qs("#hrList"), body = qs("#hrBody"), empty = qs("#hrEmpty");
  if(!rooms.length){
    body.style.display = "none"; empty.style.display = "";
    const why = state.loadErr ? (state.loadErr === "SERVER_HTML"
        ? `Apps Script ตอบกลับเป็นหน้าเว็บแทนข้อมูล · ข้อความในหน้านั้นคือ: <b>${esc(state.loadDetail || "(ว่าง)")}</b>`
        : `ติดต่อ Apps Script ไม่สำเร็จ (${esc(state.loadErr)}) — เช็คอินเทอร์เน็ต และลิงก์ใน script.js ให้ตรงกับ Deploy ล่าสุด`)
      : state.gsOld ? "Apps Script ที่เชื่อมอยู่เป็นเวอร์ชันเก่า — วาง Appscript.txt ล่าสุดแล้ว Deploy ใหม่"
      : state.cfgMsg ? `${esc(state.cfgMsg)} — ตรวจชื่อชีทต้องเป็น Config`
      : "";
    const cfgInfo = why ? `<small style="opacity:.8;color:#C2410C">${why}</small>` : state.config.length ? `<small style="opacity:.7">อ่านชีท Config ได้ ${state.config.length} แถว · รายวิชาที่พบ: ${esc([...new Set(state.config.map(c=>String(rget(c,"รายวิชา")||"").trim()).filter(Boolean))].slice(0,6).join(", ") || "(ไม่มี)")}</small>` : `<small style="opacity:.7">อ่านชีท Config ไม่ได้เลย (0 แถว) — ลองรีเฟรชหน้า หรือตรวจว่า Deploy Apps Script เป็นเวอร์ชันล่าสุด</small>`;
    empty.innerHTML = `<div class="empty-state"><div class="es-ico">🏫</div><h4>ยังไม่ได้ตั้งห้องประจำชั้น</h4>
      <p>ที่ชีท <b>Config</b> เพิ่มแถวใหม่<br>คอลัมน์ <b>รายวิชา</b> พิมพ์ <b>Homeroom</b><br>คอลัมน์ <b>ระดับชั้น</b> พิมพ์ห้องประจำชั้นของคุณ (เช่น ม.1/2)<br>แล้วกลับมาเปิดหน้านี้ใหม่</p>${cfgInfo}</div>`;
    qs("#hrHeadSub").textContent = "Homeroom";
    return;
  }
  body.style.display = ""; empty.style.display = "none";
  qs("#hrHeadSub").textContent = `${hr.room} · ครูประจำชั้น`;
  qs("#hrRooms").innerHTML = rooms.length>1 ? rooms.map(r=>`<button type="button" data-room="${esc(r)}" class="${r===hr.room?"on":""}">${esc(r)}</button>`).join("") : "";

  const all = hrStudents();
  const withPhoto = all.filter(s=>photoSrc(s.photo)).length, withGdn = all.filter(s=>s.pphone).length;
  qs("#hrStats").innerHTML =
    `<div class="es-stat"><b>${all.length}</b><span>นักเรียน</span></div>` +
    `<div class="es-stat"><b>${withPhoto}/${all.length}</b><span>มีรูปแล้ว</span></div>` +
    `<div class="es-stat"><b>${withGdn}/${all.length}</b><span>เบอร์ผู้ปกครอง</span></div>`;

  const q = hr.q.trim().toLowerCase();
  const shown = !q ? all : all.filter(s=> [s.name, s.nick, String(s.no), s.code].some(v=>String(v||"").toLowerCase().includes(q)));
  if(all.length===0){ list.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนห้อง ${esc(hr.room)} ในชีท NameList<br><small>(คอลัมน์ ชั้นปี ต้องตรงกับ ระดับชั้น ใน Config)</small></div>`; return; }
  if(shown.length===0){ list.innerHTML = `<div class="empty-note">ไม่พบ "${esc(hr.q)}"</div>`; return; }
  list.innerHTML = shown.map(st=>`
    <div class="hr-row" data-k="${esc(st.key)}">
      ${hrAvatar(st)}
      <div class="hr-id">
        <div class="hr-nick ${st.nick?"":"noni"}">${esc(st.nick || st.name)}</div>
        <div class="hr-real">${st.nick ? esc(st.name) : "ยังไม่ได้ใส่ชื่อเล่น"}</div>
      </div>
      <div class="hr-calls">${hrCallBtns(st)}</div>
    </div>`).join("");
}
qs("#hrSearch")?.addEventListener("input", e=>{ hr.q = e.target.value; renderHomeroom(); });
qs("#hrRooms")?.addEventListener("click", e=>{
  const b = e.target.closest("[data-room]"); if(!b) return;
  hr.room = b.dataset.room; try{ localStorage.setItem(HR_ROOM_KEY, hr.room); }catch(err){}
  renderHomeroom();
});
qs("#hrList")?.addEventListener("click", e=>{
  if(e.target.closest("a.hr-call")) return;   // ลิงก์โทรออก ปล่อยให้ทำงานตามปกติ
  const row = e.target.closest(".hr-row"); if(!row) return;
  const add = e.target.closest("[data-add]");
  openHrDetail(row.dataset.k, add ? add.dataset.add : null);
});
qs("#hrGoDocs")?.addEventListener("click", openHrDocs);
qs("#hrGoSubsidy")?.addEventListener("click", openHrOrders);

/* ================= รายละเอียดนักเรียน ================= */
const HR_FIELDS = [
  { k:"รหัสนักเรียน", ico:"🪪", inputmode:"numeric" },
  { k:"เลขบัตรประจำตัวประชาชน", ico:"💳", idcard:true },
  { k:"ชื่อเล่น", ico:"😊" },
  { k:"เบอร์โทรนักเรียน", ico:"📱", phone:true },
  { k:"เบอร์โทรผู้ปกครอง", ico:"👪", phone:true },
  { k:"ที่อยู่", ico:"📍", area:true, rows:3 },
  { k:"งานอดิเรก", ico:"🎨", area:true }
];
/* เลขบัตรประชาชน 13 หลัก: เก็บในชีทเป็นตัวเลขล้วน แสดงเป็น 1-2345-67890-12-3 */
function fmtId(v){
  const d = String(v ?? "").replace(/\D/g, "").slice(0, 13); let i = 0; const out = [];
  [1,4,5,2,1].forEach(n=>{ const p = d.slice(i, i+n); if(p) out.push(p); i += n; });
  return out.join("-");
}
const hrNorm = (f, v) => f.idcard ? String(v ?? "").replace(/\D/g, "") : String(v ?? "").trim();
const hrOrig = (st, f) => f.phone ? (f.k==="เบอร์โทรนักเรียน" ? st.sphone : st.pphone) : f.idcard ? hrNorm(f, st.get(f.k)) : st.get(f.k);
const hrDirty = st => HR_FIELDS.some(f => f.k in hr.draft && hrNorm(f, hr.draft[f.k]) !== hrOrig(st, f));

function openHrDetail(key, focusField){
  hr.cur = key; hr.draft = {}; hr.edit = !!focusField;
  renderHrDetail();
  showView("view-hr-detail");
  if(focusField) setTimeout(()=>{ const el = qs(`#hrdForm [data-f="${focusField}"]`); if(el) el.focus(); }, 380);
}
function renderHrDetail(){
  const st = hrFind(hr.cur);
  if(!st){ showView("view-homeroom"); return; }
  qs("#hrdTitle").textContent = st.nick || st.name;
  qs("#hrdSub").textContent = `เลขที่ ${st.no ?? "-"} · ${hr.room}`;
  qs("#hrdEditBtn").textContent = hr.edit ? "✕" : "✏️";
  qs("#hrdEditBtn").title = hr.edit ? "ยกเลิกการแก้ไข" : "แก้ไขข้อมูล";
  const rows = HR_FIELDS.map(f=>{
    const orig = hrOrig(st, f), cur = f.k in hr.draft ? hr.draft[f.k] : (f.idcard ? fmtId(orig) : orig);
    const showInput = hr.edit || !orig;
    const val = f.phone ? fmtPhone(orig) : f.idcard ? fmtId(orig) : orig;
    const call = (f.phone && orig && !hr.edit) ? `<a class="hr-call ${f.k==="เบอร์โทรนักเรียน"?"stu":"gdn"} sm" href="tel:${esc(orig)}" title="โทร">${PHONE_SVG}</a>` : "";
    const input = f.area
      ? `<textarea data-f="${f.k}" rows="${f.rows||2}" placeholder="เพิ่ม${f.k}">${esc(cur)}</textarea>`
      : `<input data-f="${f.k}" value="${esc(cur)}" placeholder="เพิ่ม${f.k}" ${f.phone ? `type="tel" inputmode="tel" maxlength="14"` : f.idcard ? `inputmode="numeric" maxlength="17" autocomplete="off"` : `inputmode="${f.inputmode||"text"}"`}>`;
    return `<div class="hr-f"><div class="hr-f-ico">${f.ico}</div><div class="hr-f-main"><label>${f.k}</label>${showInput ? input : `<div class="hr-f-val">${esc(val)}</div>`}</div>${call}</div>`;
  }).join("");
  qs("#hrdBody").innerHTML = `
    <div class="hr-profile">
      ${hrAvatar(st, "xl", false)}
      <div class="hr-pbtns">
        <button type="button" class="btn btn-gold btn-sm" id="hrdCam">📷 ถ่ายรูป</button>
        <button type="button" class="btn btn-outline btn-sm" id="hrdPick">🖼 อัปโหลด</button>
      </div>
      <h3 class="hr-pname">${esc(st.nick || st.name)}</h3>
      ${st.nick ? `<div class="hr-pfull">${esc(st.name)}</div>` : ""}
      <div class="hr-chips"><span>เลขที่ ${esc(st.no ?? "-")}</span><span>${esc(hr.room)}</span></div>
    </div>
    <div class="card hr-info" id="hrdForm">${rows}</div>`;
  qs("#hrdCam").onclick = () => qs("#hrCamInput").click();
  qs("#hrdPick").onclick = () => qs("#hrFileInput").click();
  hrUpdateSaveBar();
}
function hrUpdateSaveBar(){
  const st = hrFind(hr.cur);
  const dirty = !!st && hrDirty(st);
  qs("#hrdSaveBar").style.display = (hr.edit || dirty) ? "" : "none";
  qs("#hrdSaveBtn").disabled = !dirty;
}
qs("#hrdBody")?.addEventListener("input", e=>{
  const el = e.target.closest("[data-f]"); if(!el) return;
  const fd = HR_FIELDS.find(x=>x.k===el.dataset.f);
  if(fd && fd.idcard) el.value = fmtId(el.value);
  hr.draft[el.dataset.f] = el.value;
  hrUpdateSaveBar();
});
qs("#hrdEditBtn")?.addEventListener("click", async ()=>{
  const st = hrFind(hr.cur); if(!st) return;
  if(hr.edit){
    if(hrDirty(st) && !(await confirmDialog({ title:"ยกเลิกการแก้ไข?", icon:"✏️", message:"ข้อมูลที่พิมพ์ไว้จะไม่ถูกบันทึก", okText:"ยกเลิกการแก้ไข", cancelText:"แก้ไขต่อ", danger:true }))) return;
    hr.edit = false; hr.draft = {};
  } else hr.edit = true;
  renderHrDetail();
});
qs("#hrdCancelBtn")?.addEventListener("click", ()=>{ hr.edit = false; hr.draft = {}; renderHrDetail(); });
qs("#hrdBack")?.addEventListener("click", async ()=>{
  const st = hrFind(hr.cur);
  if(st && hrDirty(st) && !(await confirmDialog({ title:"ยังไม่ได้บันทึก", icon:"📝", danger:true, message:"มีข้อมูลที่แก้ไว้แต่ยังไม่ได้กดบันทึก\nถ้าออกตอนนี้ข้อมูลจะหายไป", okText:"ออกโดยไม่บันทึก", cancelText:"อยู่ต่อ" }))) return;
  hr.edit = false; hr.draft = {};
  renderHomeroom(); showView("view-homeroom");
});
qs("#hrdSaveBtn")?.addEventListener("click", async ()=>{
  const st = hrFind(hr.cur); if(!st) return;
  const fields = {};
  for(const f of HR_FIELDS){
    if(!(f.k in hr.draft)) continue;
    let v = hrNorm(f, hr.draft[f.k]);
    if(f.idcard && v && v.length !== 13){ toast("เลขบัตรประชาชนต้องมี 13 หลัก"); return; }
    if(f.phone){
      v = v.replace(/[^\d+]/g, "");
      if(v && !/^\+?\d{8,13}$/.test(v)){ toast(`${f.k} ไม่ถูกต้อง (ต้องเป็นตัวเลข 8-13 หลัก)`); return; }
    }
    if(v !== hrOrig(st, f)) fields[f.k] = v;
  }
  if(!Object.keys(fields).length){ hr.edit = false; hr.draft = {}; renderHrDetail(); return; }
  qs("#hrdSaveBtn").disabled = true;
  showSaving("กำลังบันทึกข้อมูลนักเรียน...");
  const res = await apiPost({ type:"saveStudentInfo", level:hr.room, no:st.no, name:st.name, fields });
  hideSaving();
  if(res.success){
    Object.assign(st.row, fields);
    hr.edit = false; hr.draft = {};
    renderHrDetail(); toast("บันทึกข้อมูลแล้ว ✓");
  } else { toast(res.message || "บันทึกไม่สำเร็จ"); hrUpdateSaveBar(); }
});

/* รูปภาพ: ถ่าย/เลือกไฟล์ → ย่อเป็นสี่เหลี่ยมจัตุรัส 480px (ไฟล์เล็ก ~30KB) → ส่งไปเก็บใน Google Drive */
function hrResize(file, size=480){
  return new Promise((resolve, reject)=>{
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = ()=>{
      const w = im.naturalWidth, h = im.naturalHeight, s = Math.min(w, h);
      const out = Math.min(size, s), c = document.createElement("canvas");
      c.width = c.height = out;
      c.getContext("2d").drawImage(im, (w-s)/2, (h-s)*0.3, s, s, 0, 0, out, out);   // ครอปตรงกลาง เอนไปทางด้านบน (ส่วนใหญ่หน้าอยู่ตอนบนของภาพ)
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    im.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error("อ่านไฟล์รูปไม่ได้")); };
    im.src = url;
  });
}
async function hrUploadPhoto(file){
  const st = hrFind(hr.cur);
  if(!st || !file) return;
  let dataUrl;
  try{ dataUrl = await hrResize(file); }catch(e){ toast(e.message || "อ่านไฟล์รูปไม่ได้"); return; }
  showSaving("กำลังอัปโหลดรูป...");
  const res = await apiPost({ type:"saveStudentPhoto", level:hr.room, no:st.no, name:st.name, image:dataUrl.split(",")[1] });
  hideSaving();
  if(res.success && res.photoId){
    hrPhotoCache.set(res.photoId, dataUrl);
    st.row["รูปภาพ"] = res.photoId;
    renderHrDetail(); toast("บันทึกรูปแล้ว ✓");
  } else toast(res.message || "อัปโหลดรูปไม่สำเร็จ (ตรวจว่าให้สิทธิ์ Drive กับ Apps Script แล้ว)");
}
["#hrCamInput", "#hrFileInput"].forEach(sel=> qs(sel)?.addEventListener("change", e=>{
  const f = e.target.files && e.target.files[0]; e.target.value = "";
  hrUploadPhoto(f);
}));

/* ================= เช็คเอกสาร ================= */
const hrd = { docs:[], snap:"", cur:null };
const HRD_SUGGEST = ["สำเนาบัตรประชาชนนักเรียน", "สำเนาบัตรประชาชนผู้ปกครอง", "สำเนาทะเบียนบ้าน", "ใบเซ็นรับทราบ"];
function hrDocsFromState(){
  return state.hrDocs
    .filter(r=> sameStr(rget(r,"ภาคเรียนที่"), period.term) && sameLv(rget(r,"ระดับชั้น"), hr.room))
    .sort((a,b)=> (Number(rget(a,"ลำดับ"))||0) - (Number(rget(b,"ลำดับ"))||0))
    .map(r=>({ title:String(rget(r,"เอกสาร")||"").trim(), set:new Set(String(rget(r,"ส่งแล้ว") ?? "").split(",").map(s=>s.trim()).filter(Boolean)) }))
    .filter(d=>d.title);
}
const hrdSerialize = () => JSON.stringify(hrd.docs.map(d=>[d.title, [...d.set].sort()]));
const hrdDirty = () => qs("#view-hr-docs").classList.contains("active") && hrdSerialize() !== hrd.snap;

function openHrDocs(){
  exitFocusMode();
  hrd.docs = hrDocsFromState(); hrd.snap = hrdSerialize();
  renderPeriodBars(); renderHrDocs();
  showView("view-hr-docs");
}
function renderHrDocs(){
  const roster = hrStudents(), wrap = qs("#hrdocsWrap");
  qs("#hrdocsSub").textContent = `${hr.room} · ภาคเรียนที่ ${period.term}`;
  if(roster.length===0){ wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; hrdPaint(); return; }
  if(hrd.docs.length===0){
    wrap.innerHTML = `<div class="empty-state"><div class="es-ico">📄</div><h4>ยังไม่มีหัวข้อเอกสาร</h4>
      <p>เพิ่มหัวข้อ เช่น "สำเนาบัตรประชาชน"<br>แล้วติ๊กว่าใครส่งแล้วบ้าง กดบันทึกครั้งเดียวจบ</p>
      <div class="es-actions"><button class="btn btn-primary btn-sm" id="hrdEmptyAdd">＋ เพิ่มหัวข้อเอกสาร</button></div></div>`;
    qs("#hrdEmptyAdd").addEventListener("click", ()=> openHrDocModal(null));
    hrdPaint(); return;
  }
  let thead = `<tr><th class="name-head">ชื่อ</th>`;
  hrd.docs.forEach((d,i)=>{ thead += `<th data-i="${i}"><span class="hd-title">${esc(d.title)}</span><span class="hd-cnt"></span><i class="hd-bar"><u></u></i></th>`; });
  thead += `<th class="sum">ค้าง</th></tr>`;
  const rows = roster.map(st=>{
    let r = `<tr data-k="${esc(st.key)}"><td class="name-cell">${snum(st.no)}${esc(st.nick ? st.nick : st.name)}${st.nick ? `<small class="nm-sub">${esc(st.name)}</small>` : ""}</td>`;
    hrd.docs.forEach((d,i)=>{ r += `<td><div class="hr-chk" data-i="${i}" data-k="${esc(st.key)}"></div></td>`; });
    return r + `<td class="hr-miss"></td></tr>`;
  }).join("");
  wrap.innerHTML = `<table class="score-table hr-docs"><thead>${thead}</thead><tbody>${rows}</tbody></table>
    <div class="hint" style="padding:10px 12px 0;">แตะวงกลมเพื่อติ๊กว่าส่งแล้ว · แตะหัวคอลัมน์เพื่อแก้ชื่อ/ลบหัวข้อ · ติ๊กเสร็จกด "บันทึก" ด้านล่างครั้งเดียว</div>`;
  hrdPaint();
}
/* อัปเดตเฉพาะตัวเลข/สถานะติ๊ก ไม่วาดตารางใหม่ (เร็ว และเลื่อนค้างตำแหน่งเดิม) */
function hrdPaint(){
  const wrap = qs("#hrdocsWrap"), total = hrStudents().length;
  const missByKey = new Map();
  qsa(".hr-chk", wrap).forEach(c=>{
    const d = hrd.docs[+c.dataset.i], on = !!d && d.set.has(c.dataset.k);
    c.classList.toggle("on", on); c.textContent = on ? "✓" : "";
    if(!on) missByKey.set(c.dataset.k, (missByKey.get(c.dataset.k)||0)+1);
  });
  qsa("th[data-i]", wrap).forEach(th=>{
    const d = hrd.docs[+th.dataset.i]; if(!d) return;
    const n = hrStudents().filter(s=>d.set.has(s.key)).length;
    qs(".hd-cnt", th).textContent = `${n}/${total}`;
    qs(".hd-bar u", th).style.width = total ? (n/total*100)+"%" : "0";
    th.classList.toggle("done", total>0 && n===total);
  });
  qsa("tbody tr[data-k]", wrap).forEach(tr=>{
    const m = missByKey.get(tr.dataset.k) || 0, td = qs(".hr-miss", tr);
    td.innerHTML = m ? `<b class="miss-n">${m}</b>` : `<span class="miss-ok">✓</span>`;
  });
  const sum = qs("#hrdocsInfo");
  if(sum) sum.textContent = hrd.docs.length ? `${total} คน · ${hrd.docs.length} หัวข้อ` : "";
  const dirty = hrdSerialize() !== hrd.snap;
  qs("#hrdocsSaveBtn").disabled = !dirty;
}
qs("#hrdocsWrap")?.addEventListener("click", e=>{
  const c = e.target.closest(".hr-chk");
  if(c){
    const d = hrd.docs[+c.dataset.i]; if(!d) return;
    d.set.has(c.dataset.k) ? d.set.delete(c.dataset.k) : d.set.add(c.dataset.k);
    hrdPaint(); return;
  }
  const th = e.target.closest("th[data-i]");
  if(th) openHrDocModal(+th.dataset.i);
});
qs("#hrdocsAddBtn")?.addEventListener("click", ()=> openHrDocModal(null));

function openHrDocModal(i){
  hrd.cur = i;
  const edit = i!==null;
  qs("#hrDocTitle").textContent = edit ? "แก้ไขหัวข้อเอกสาร" : "เพิ่มหัวข้อเอกสาร";
  qs("#hrDocName").value = edit ? hrd.docs[i].title : "";
  qs("#hrDocSuggest").style.display = edit ? "none" : "";
  qs("#hrDocSuggest").innerHTML = HRD_SUGGEST.map(s=>`<button type="button" class="so-chip">${esc(s)}</button>`).join("");
  qs("#hrDocTools").style.display = edit ? "" : "none";
  qs("#hrDocOk").textContent = edit ? "ตกลง" : "เพิ่มหัวข้อ";
  qs("#modalHrDoc").classList.add("active");
  setTimeout(()=> qs("#hrDocName").focus(), 300);
}
const closeHrDocModal = () => qs("#modalHrDoc").classList.remove("active");
qsa("#modalHrDoc [data-close]").forEach(b=> b.addEventListener("click", closeHrDocModal));
qs("#modalHrDoc")?.addEventListener("click", e=>{ if(e.target.id==="modalHrDoc") closeHrDocModal(); });
qs("#hrDocSuggest")?.addEventListener("click", e=>{ const b = e.target.closest("button"); if(b) qs("#hrDocName").value = b.textContent; });
qs("#hrDocOk")?.addEventListener("click", ()=>{
  const title = qs("#hrDocName").value.trim();
  if(!title){ toast("ใส่ชื่อหัวข้อเอกสารก่อนครับ"); return; }
  if(hrd.docs.some((d,i)=> i!==hrd.cur && d.title.toLowerCase()===title.toLowerCase())){ toast("มีหัวข้อชื่อนี้อยู่แล้ว"); return; }
  if(hrd.cur===null){
    hrd.docs.push({ title, set:new Set() });
    closeHrDocModal(); renderHrDocs();
    const box = qs("#view-hr-docs .score-scroll"); if(box) requestAnimationFrame(()=>{ box.scrollLeft = box.scrollWidth; });
  } else { hrd.docs[hrd.cur].title = title; closeHrDocModal(); renderHrDocs(); }
});
qs("#hrDocAll")?.addEventListener("click", ()=>{ hrStudents().forEach(s=>hrd.docs[hrd.cur].set.add(s.key)); closeHrDocModal(); hrdPaint(); });
qs("#hrDocNone")?.addEventListener("click", ()=>{ hrd.docs[hrd.cur].set.clear(); closeHrDocModal(); hrdPaint(); });
qs("#hrDocDel")?.addEventListener("click", async ()=>{
  const d = hrd.docs[hrd.cur]; if(!d) return;
  closeHrDocModal();
  const ok = await confirmDialog({ title:"ลบหัวข้อเอกสาร?", icon:"🗑️", danger:true, message:`ลบ "${d.title}" และรายชื่อคนที่ติ๊กส่งแล้วทั้งหมด\n(จะถูกลบจริงในชีทตอนกดบันทึก)`, okText:"ลบหัวข้อ", cancelText:"ไม่ลบ" });
  if(!ok) return;
  hrd.docs.splice(hrd.cur, 1); renderHrDocs();
});
qs("#hrdocsSaveBtn")?.addEventListener("click", async ()=>{
  const roster = hrStudents();
  const docs = hrd.docs.map((d,i)=>{
    const picked = roster.filter(s=>d.set.has(s.key));
    return { title:d.title, order:i+1, keys:picked.map(s=>s.key), nos:picked.map(s=>s.no) };
  });
  qs("#hrdocsSaveBtn").disabled = true;
  showSaving("กำลังบันทึกเอกสาร...");
  const res = await apiPost({ type:"saveHomeroomDocs", term:period.term, level:hr.room, docs });
  if(res.success){
    /* ใส่ผลที่เพิ่งบันทึกลง state ทันที (กันกรณีโหลดซ้ำแล้วได้ข้อมูลเก่ากลับมา) */
    state.hrDocs = state.hrDocs.filter(r=> !(sameStr(rget(r,"ภาคเรียนที่"), period.term) && sameLv(rget(r,"ระดับชั้น"), hr.room)));
    docs.forEach((d,i)=> state.hrDocs.push({ "ภาคเรียนที่":period.term, "ระดับชั้น":hr.room, "ลำดับ":i+1, "เอกสาร":d.title, "ส่งแล้ว":d.keys.join(", "), "เลขที่ส่งแล้ว":d.nos.join(", ") }));
    hideSaving();
    hrd.docs = hrDocsFromState(); hrd.snap = hrdSerialize();
    renderHrDocs(); toast("บันทึกเอกสารแล้ว ✓");
  } else { hideSaving(); hrdPaint(); toast(res.message || "บันทึกไม่สำเร็จ"); }
});
qs("#hrdocsBack")?.addEventListener("click", async ()=>{
  if(hrdDirty() && !(await confirmDialog({ title:"ยังไม่ได้บันทึก", icon:"📝", danger:true, message:"มีการติ๊กเอกสารที่ยังไม่ได้กดบันทึก\nถ้าออกตอนนี้จะหายไป", okText:"ออกโดยไม่บันทึก", cancelText:"อยู่ต่อ" }))) return;
  hrd.snap = hrdSerialize(); showView("view-homeroom");
});

/* ================= เงินอุดหนุน ================= */
const SUB_DEFAULT = 550;   // วงเงินเริ่มต้นต่อคน (เปลี่ยนในหน้าเงินอุดหนุนได้ เก็บแยกตามภาคเรียน+ห้อง)
const SHIRT_PRICES = { 28:285, 30:285, 32:285, 34:295, 36:305, 38:325, 40:335, 42:345, 44:355, 46:365, 48:375, 50:395, 52:425, 54:455 };
const PANTS_PRICES = { "20":320, "22":320, "24":320, "26":330, "28":330, "30":330, "S":340, "M":340, "L":340, "XL":350, "XXL":370 };
const BOW_COLORS = ["ขาว", "ดำ", "น้ำเงิน", "น้ำตาล"];
/* รายการสินค้า + ราคา — แก้ราคา/เพิ่มรายการที่นี่ที่เดียว (ใบสั่งที่บันทึกไปแล้วเก็บราคา ณ วันที่สั่งไว้ ไม่เปลี่ยนตาม) */
const SUB_ITEMS = [
  { id:"shirt",  name:"เสื้อพละ",              ico:"👕", levels:["ประถม","มัธยม"], sizeLabel:"รอบอก (นิ้ว)", sizes:Object.keys(SHIRT_PRICES), prices:SHIRT_PRICES, range:"฿285–455" },
  { id:"pants",  name:"กางเกงวอร์ม",           ico:"👖", levels:["ประถม","มัธยม"], sizeLabel:"ไซส์",         sizes:Object.keys(PANTS_PRICES), prices:PANTS_PRICES, range:"฿320–370" },
  { id:"socks",  name:"ถุงเท้านักเรียน",        ico:"🧦", sizeLabel:"ไซส์", sizes:["5-7","Free size"], unit:25 },
  { id:"bunny",  name:"โบว์หูกระต่าย",         ico:"🎀", unit:45 },
  { id:"buckle", name:"หัวเข็มขัด ตราโรงเรียน", ico:"🔘", unit:100 },
  { id:"pin",    name:"เข็มกลัด ตราโรงเรียน",   ico:"📌", unit:50 },
  { id:"belt",   name:"เข็มขัดหนังเทียมสีดำ",   ico:"🥋", waist:true, unit:25 },
  { id:"bowL",   name:"โบว์ผูกผม เส้นใหญ่ 1 เส้น", short:"โบว์เส้นใหญ่", ico:"🎗️", colors:true, unit:8 },
  { id:"bowS",   name:"โบว์ผูกผม เส้นเล็ก 2 เส้น", short:"โบว์เส้นเล็ก", ico:"🎗️", colors:true, unit:5 }
];
const SUB_BY_ID = Object.fromEntries(SUB_ITEMS.map(i=>[i.id, i]));
const itemShort = it => it.short || it.name;

function subsidyAmount(){
  const r = state.hrSetup.find(x=> sameStr(rget(x,"ภาคเรียนที่"), period.term) && sameLv(rget(x,"ระดับชั้น"), hr.room));
  const n = r ? Number(r["เงินอุดหนุน"]) : NaN;
  return Number.isFinite(n) && n>=0 ? n : SUB_DEFAULT;
}
const hrOrderRows = st => state.hrOrders.filter(r=> sameStr(rget(r,"ภาคเรียนที่"), period.term) && sameLv(rget(r,"ระดับชั้น"), hr.room) && sameStr(r["ชื่อ-สกุล"], st.name) && sameStr(r["เลขที่"], st.no));
const rowsTotal = rows => rows.reduce((a,r)=> a + (Number(r["รวม"])||0), 0);
const extraPay = (total, sub) => Math.max(0, total - sub);

/* ---------- หน้ารายคน ---------- */
function openHrOrders(){
  exitFocusMode();
  renderPeriodBars(); renderHrOrders();
  showView("view-hr-orders");
}
function renderHrOrders(){
  const roster = hrStudents(), sub = subsidyAmount();
  qs("#hroSub").textContent = `${hr.room} · ภาคเรียนที่ ${period.term}`;
  const inp = qs("#hroSubInput");
  if(document.activeElement !== inp){ inp.value = sub; inp.dataset.saved = String(sub); }
  qs("#hroSubSave").style.display = String(inp.value) !== inp.dataset.saved ? "" : "none";
  let ordered = 0, sumAll = 0, sumExtra = 0;
  const rowsHtml = roster.map(st=>{
    const rows = hrOrderRows(st), total = rowsTotal(rows), extra = extraPay(total, sub);
    if(rows.length){ ordered++; sumAll += total; sumExtra += extra; }
    const chip = !rows.length ? `<span class="o-chip">ยังไม่สั่ง</span>`
      : `<span class="o-chip ${extra>0?"over":"ok"}">${baht(total)}${extra>0 ? ` · เพิ่ม ${baht(extra)}` : " · ในวงเงิน"}</span>`;
    return `<div class="hr-row" data-k="${esc(st.key)}">${hrAvatar(st, "sm")}
      <div class="hr-id"><div class="hr-nick">${esc(st.nick || st.name)}</div>
      <div class="hr-real">${rows.length ? `${rows.length} รายการ` : esc(st.nick ? st.name : "")}</div></div>${chip}</div>`;
  }).join("");
  qs("#hroStats").innerHTML =
    `<div class="es-stat"><b>${ordered}/${roster.length}</b><span>สั่งแล้ว (คน)</span></div>` +
    `<div class="es-stat"><b>${baht(sumAll)}</b><span>ยอดรวมทั้งห้อง</span></div>` +
    `<div class="es-stat"><b>${baht(sumExtra)}</b><span>ต้องเก็บเพิ่ม</span></div>`;
  qs("#hroList").innerHTML = roster.length ? rowsHtml : `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`;
}
qs("#hroSubInput")?.addEventListener("input", e=>{
  qs("#hroSubSave").style.display = String(e.target.value) !== e.target.dataset.saved ? "" : "none";
});
qs("#hroSubSave")?.addEventListener("click", async ()=>{
  const inp = qs("#hroSubInput"), amount = Number(inp.value);
  if(inp.value==="" || !Number.isFinite(amount) || amount<0){ toast("ใส่จำนวนเงินเป็นตัวเลขครับ"); return; }
  showSaving("กำลังบันทึกเงินอุดหนุน...");
  const res = await apiPost({ type:"saveSubsidyCfg", term:period.term, level:hr.room, amount });
  hideSaving();
  if(res.success){
    const r = state.hrSetup.find(x=> sameStr(rget(x,"ภาคเรียนที่"), period.term) && sameLv(rget(x,"ระดับชั้น"), hr.room));
    if(r) r["เงินอุดหนุน"] = amount; else state.hrSetup.push({ "ภาคเรียนที่":period.term, "ระดับชั้น":hr.room, "เงินอุดหนุน":amount });
    inp.dataset.saved = String(amount); renderHrOrders(); toast("บันทึกเงินอุดหนุนแล้ว ✓");
  } else toast(res.message || "บันทึกไม่สำเร็จ");
});
qs("#hroList")?.addEventListener("click", e=>{ const r = e.target.closest(".hr-row"); if(r) openHrOrder(r.dataset.k); });
qs("#hroSummaryBtn")?.addEventListener("click", openHrSummary);
qs("#hrordersBack")?.addEventListener("click", ()=> showView("view-homeroom"));

/* ---------- ฟอร์มสั่งซื้อรายคน ---------- */
const hro = { key:null, lines:{}, snap:"" };
const hroSerialize = () => JSON.stringify(hro.lines);
const hroDirty = () => qs("#view-hr-order").classList.contains("active") && hroSerialize() !== hro.snap;

function linesFromRows(rows){
  const lines = {};
  rows.forEach(r=>{
    const id = String(r["รหัสรายการ"]||"").trim(), it = SUB_BY_ID[id]; if(!it) return;
    const ln = { level:String(r["ระดับ"]||"").trim(), size:String(r["ขนาด/ตัวเลือก"] ?? "").trim(), qty:Number(r["จำนวน"])||1, colors:{} };
    if(it.colors){
      ln.size.split(",").forEach(p=>{ const m = p.trim().match(/^(.+?)×\s*(\d+)$/); if(m) ln.colors[m[1].trim()] = Number(m[2]); });
      ln.size = "";
    }
    lines[id] = ln;
  });
  return lines;
}
function lineInfo(it, ln){
  const qty = it.colors ? Object.values(ln.colors).reduce((a,b)=>a+b, 0) : ln.qty;
  const unit = it.prices ? it.prices[ln.size] : it.unit;
  const ok = qty>0 && unit!=null && (!it.levels || !!ln.level) && (!it.sizes || !!ln.size) && (!it.waist || Number(ln.size)>0);
  return { qty, unit: unit||0, total:(unit||0)*qty, ok };
}
const lineSizeText = (it, ln) => it.colors ? BOW_COLORS.filter(c=>ln.colors[c]>0).map(c=>`${c}×${ln.colors[c]}`).join(", ") : String(ln.size ?? "");
const lineName = (it, ln) => it.levels && ln.level ? `${it.name} (${ln.level})` : it.name;
const defaultLevel = () => /^ป/.test(hr.room) ? "ประถม" : "มัธยม";

function openHrOrder(key){
  const st = hrFind(key); if(!st) return;
  hro.key = key; hro.lines = linesFromRows(hrOrderRows(st)); hro.snap = hroSerialize();
  qs("#hroWho").innerHTML = `${hrAvatar(st, "sm", false)}<div><div class="hr-nick">${esc(st.nick || st.name)}</div><div class="hr-real">${st.nick ? esc(st.name)+" · " : ""}เลขที่ ${esc(st.no ?? "-")}</div></div>`;
  qs("#hroTitle2").textContent = `เลขที่ ${st.no ?? "-"} · ${hr.room}`;
  renderOrderForm();
  showView("view-hr-order");
}
function orderCardHTML(it){
  const ln = hro.lines[it.id], on = !!ln;
  let body = "";
  if(on){
    const info = lineInfo(it, ln);
    if(it.levels) body += `<div class="so-sec"><label>ระดับ</label><div class="seg so-seg">${it.levels.map(l=>`<button type="button" data-act="lvl" data-id="${it.id}" data-v="${l}" class="${ln.level===l?"on":""}">${l}</button>`).join("")}</div></div>`;
    if(it.sizes) body += `<div class="so-sec"><label>${it.sizeLabel}</label><div class="so-chips">${it.sizes.map(s=>`<button type="button" data-act="size" data-id="${it.id}" data-v="${s}" class="so-chip ${ln.size===String(s)?"on":""}">${s}${it.prices ? `<small>${baht(it.prices[s])}</small>` : ""}</button>`).join("")}</div></div>`;
    if(it.waist) body += `<div class="so-sec"><label>รอบเอว (นิ้ว)</label><input class="so-input" type="number" inputmode="decimal" min="10" max="70" step="0.5" placeholder="เช่น 26" value="${esc(ln.size)}" data-act="waist" data-id="${it.id}"></div>`;
    if(it.colors) body += `<div class="so-sec"><label>เลือกสี (เลือกได้หลายสี ระบุจำนวนแต่ละสี)</label><div class="so-cols">${BOW_COLORS.map(c=>`<div class="so-col ${ln.colors[c]>0?"on":""}"><span>${c}</span><div class="so-step"><button type="button" data-act="col" data-id="${it.id}" data-c="${c}" data-d="-1">−</button><b>${ln.colors[c]||0}</b><button type="button" data-act="col" data-id="${it.id}" data-c="${c}" data-d="1">＋</button></div></div>`).join("")}</div></div>`;
    else body += `<div class="so-sec so-row"><label>จำนวน</label><div class="so-step"><button type="button" data-act="qty" data-id="${it.id}" data-d="-1">−</button><b>${ln.qty}</b><button type="button" data-act="qty" data-id="${it.id}" data-d="1">＋</button></div></div>`;
    body += `<div class="so-line ${info.ok?"":"warn"}">${info.ok ? `${baht(info.unit)} × ${info.qty} = <b>${baht(info.total)}</b>` : "เลือกรายละเอียดให้ครบเพื่อคิดราคา"}</div>`;
  }
  return `<div class="so-card ${on?"on":""}" data-card="${it.id}">
    <div class="so-head"><span class="so-ico">${it.ico}</span><div class="so-nm"><b>${esc(it.name)}</b><small>${it.range || baht(it.unit)}${it.range ? "" : " / ชิ้น"}</small></div>
    <label class="sw"><input type="checkbox" data-act="tog" data-id="${it.id}" ${on?"checked":""}><span class="sw-track"></span></label></div>${body}</div>`;
}
function renderOrderForm(){ qs("#hroItems").innerHTML = SUB_ITEMS.map(orderCardHTML).join(""); paintOrderTotals(); }
function repaintCard(id){ const el = qs(`#hroItems [data-card="${id}"]`); if(el) el.outerHTML = orderCardHTML(SUB_BY_ID[id]); paintOrderTotals(); }
function paintOrderTotals(){
  let total = 0, n = 0;
  SUB_ITEMS.forEach(it=>{ const ln = hro.lines[it.id]; if(!ln) return; const i = lineInfo(it, ln); if(i.ok){ total += i.total; n++; } });
  const sub = subsidyAmount(), extra = extraPay(total, sub);
  qs("#hroTotal").textContent = baht(total);
  qs("#hroSubTxt").textContent = baht(sub);
  const ex = qs("#hroExtra"); ex.textContent = baht(extra); ex.parentElement.classList.toggle("over", extra>0);
  qs("#hroSaveBtn").textContent = Object.keys(hro.lines).length ? `บันทึกรายการสั่งซื้อ (${n} รายการ)` : "บันทึก (ไม่มีรายการสั่งซื้อ)";
}
qs("#hroItems")?.addEventListener("click", e=>{
  const b = e.target.closest("button[data-act]"); if(!b) return;
  const it = SUB_BY_ID[b.dataset.id], ln = hro.lines[b.dataset.id]; if(!it || !ln) return;
  const act = b.dataset.act;
  if(act==="lvl") ln.level = b.dataset.v;
  else if(act==="size") ln.size = b.dataset.v;
  else if(act==="qty") ln.qty = Math.max(1, Math.min(99, ln.qty + Number(b.dataset.d)));
  else if(act==="col"){ const c = b.dataset.c; ln.colors[c] = Math.max(0, Math.min(99, (ln.colors[c]||0) + Number(b.dataset.d))); if(!ln.colors[c]) delete ln.colors[c]; }
  repaintCard(it.id);
});
qs("#hroItems")?.addEventListener("change", e=>{
  const t = e.target.closest("input[data-act='tog']"); if(!t) return;
  const it = SUB_BY_ID[t.dataset.id];
  if(t.checked) hro.lines[it.id] = { level: it.levels ? defaultLevel() : "", size:"", qty:1, colors:{} };
  else delete hro.lines[it.id];
  repaintCard(it.id);
});
qs("#hroItems")?.addEventListener("input", e=>{
  const w = e.target.closest("input[data-act='waist']"); if(!w) return;
  const ln = hro.lines[w.dataset.id]; if(!ln) return;
  ln.size = w.value; paintOrderTotals();
  const line = w.closest(".so-card").querySelector(".so-line"), it = SUB_BY_ID[w.dataset.id], i = lineInfo(it, ln);
  if(line){ line.classList.toggle("warn", !i.ok); line.innerHTML = i.ok ? `${baht(i.unit)} × ${i.qty} = <b>${baht(i.total)}</b>` : "เลือกรายละเอียดให้ครบเพื่อคิดราคา"; }
});
qs("#hroSaveBtn")?.addEventListener("click", async ()=>{
  const st = hrFind(hro.key); if(!st) return;
  const lines = [];
  for(const it of SUB_ITEMS){
    const ln = hro.lines[it.id]; if(!ln) continue;
    const i = lineInfo(it, ln);
    if(!i.ok){
      const why = it.levels && !ln.level ? "เลือกระดับ" : it.waist ? "ใส่รอบเอว" : it.sizes && !ln.size ? "เลือกไซส์" : it.colors ? "เลือกสีอย่างน้อย 1 สี" : "ตรวจรายละเอียด";
      toast(`${it.name}: ${why}ก่อนครับ (หรือปิดสวิตช์รายการนี้)`); 
      qs(`#hroItems [data-card="${it.id}"]`)?.scrollIntoView({ behavior:"smooth", block:"center" });
      return;
    }
    lines.push({ id:it.id, name:lineName(it, ln), level:ln.level || "", size:lineSizeText(it, ln), qty:i.qty, unit:i.unit, total:i.total });
  }
  qs("#hroSaveBtn").disabled = true;
  showSaving("กำลังบันทึกรายการสั่งซื้อ...");
  const res = await apiPost({ type:"saveSubsidyOrder", term:period.term, level:hr.room, no:st.no, name:st.name, lines });
  qs("#hroSaveBtn").disabled = false;
  if(res.success){
    await loadAll(); hideSaving();
    hro.snap = hroSerialize();
    renderHrOrders(); showView("view-hr-orders"); toast("บันทึกรายการสั่งซื้อแล้ว ✓");
  } else { hideSaving(); toast(res.message || "บันทึกไม่สำเร็จ"); }
});
qs("#hroBack")?.addEventListener("click", async ()=>{
  if(hroDirty() && !(await confirmDialog({ title:"ยังไม่ได้บันทึก", icon:"📝", danger:true, message:"รายการสั่งซื้อที่แก้ไว้ยังไม่ได้กดบันทึก\nถ้าออกตอนนี้จะหายไป", okText:"ออกโดยไม่บันทึก", cancelText:"อยู่ต่อ" }))) return;
  hro.snap = hroSerialize(); showView("view-hr-orders");
});

/* ---------- สรุปรวมทั้งห้อง ---------- */
const hrs = { tab:"table" };
function openHrSummary(){
  exitFocusMode();
  renderPeriodBars(); setHrsTab(hrs.tab);
  showView("view-hr-summary");
}
function setHrsTab(t){
  hrs.tab = t;
  qsa("#hrsTabs [data-t]").forEach(b=> b.classList.toggle("on", b.dataset.t===t));
  qs("#hrsPaneTable").style.display = t==="table" ? "" : "none";
  qs("#hrsPaneTotal").style.display = t==="total" ? "" : "none";
  renderHrSummary();
}
qs("#hrsTabs")?.addEventListener("click", e=>{ const b = e.target.closest("[data-t]"); if(b) setHrsTab(b.dataset.t); });
qs("#hrsBack")?.addEventListener("click", ()=>{ renderHrOrders(); showView("view-hr-orders"); });

/* ข้อความในช่องของแต่ละรายการ */
function cellParts(it, r){
  const size = String(r["ขนาด/ตัวเลือก"] ?? "").trim(), lvl = String(r["ระดับ"]||"").trim(), qty = Number(r["จำนวน"])||0;
  const main = it.colors ? size.replace(/, /g, " · ") : it.waist ? `เอว ${size}″` : size;
  return { main, sub: [lvl, `×${qty}`].filter(Boolean).join(" "), total: Number(r["รวม"])||0 };
}
function summaryData(){
  const sub = subsidyAmount();
  return hrStudents().map(st=>{
    const rows = hrOrderRows(st), byId = {};
    rows.forEach(r=>{ byId[String(r["รหัสรายการ"]||"").trim()] = r; });
    const total = rowsTotal(rows);
    return { st, rows, byId, total, extra:extraPay(total, sub) };
  });
}
function renderHrSummary(){
  const data = summaryData(), sub = subsidyAmount();
  qs("#hrsSub").textContent = `${hr.room} · ภาคเรียนที่ ${period.term} · เงินอุดหนุนคนละ ${baht(sub)}`;
  if(hrs.tab==="total") return renderHrTotals(data);
  const wrap = qs("#hrsTableWrap");
  if(data.length===0){ wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; return; }
  let thead = `<tr><th class="name-head">ชื่อ</th>` + SUB_ITEMS.map(it=>`<th>${it.ico}<span class="hd-title">${esc(itemShort(it))}</span></th>`).join("") + `<th class="sum">รวม</th><th class="sum">ชำระเพิ่ม</th></tr>`;
  const cnt = {}, money = {}; let gTotal = 0, gExtra = 0;
  const body = data.map(d=>{
    gTotal += d.total; gExtra += d.extra;
    const cells = SUB_ITEMS.map(it=>{
      const r = d.byId[it.id];
      if(!r) return `<td class="sub-none">·</td>`;
      const p = cellParts(it, r);
      cnt[it.id] = (cnt[it.id]||0) + (Number(r["จำนวน"])||0); money[it.id] = (money[it.id]||0) + p.total;
      return `<td><div class="sub-cell">${p.main ? `<b>${esc(p.main)}</b>` : ""}<span>${esc(p.sub)}</span><em>${baht(p.total)}</em></div></td>`;
    }).join("");
    return `<tr><td class="name-cell">${snum(d.st.no)}${esc(d.st.nick || d.st.name)}${d.st.nick ? `<small class="nm-sub">${esc(d.st.name)}</small>` : ""}</td>${cells}
      <td class="sub-total">${d.rows.length ? baht(d.total) : `<span class="o-chip">ยังไม่สั่ง</span>`}</td>
      <td class="sub-extra ${d.extra>0?"over":""}">${d.rows.length ? (d.extra>0 ? baht(d.extra) : "—") : ""}</td></tr>`;
  }).join("");
  const foot = `<tr><td class="name-cell">รวมทั้งห้อง</td>` + SUB_ITEMS.map(it=> cnt[it.id] ? `<td><div class="sub-cell"><b>${cnt[it.id]} ชิ้น</b><em>${baht(money[it.id])}</em></div></td>` : `<td class="sub-none">·</td>`).join("") +
    `<td class="sub-total">${baht(gTotal)}</td><td class="sub-extra ${gExtra>0?"over":""}">${baht(gExtra)}</td></tr>`;
  wrap.innerHTML = `<table class="score-table hr-sum"><thead>${thead}</thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table>`;
}
/* ยอดสั่งรวมแยกตามรายการ/ไซส์ — เอาไว้สั่งของจากร้าน */
function renderHrTotals(data){
  const box = qs("#hrsPaneTotal");
  const groups = SUB_ITEMS.map(it=>{
    const map = new Map();
    data.forEach(d=>{
      const r = d.byId[it.id]; if(!r) return;
      const lvl = String(r["ระดับ"]||"").trim(), size = String(r["ขนาด/ตัวเลือก"] ?? "").trim(), qty = Number(r["จำนวน"])||0;
      const add = (label, n, sortKey)=>{ const o = map.get(label) || { n:0, sortKey }; o.n += n; map.set(label, o); };
      if(it.colors){ size.split(",").forEach(p=>{ const m = p.trim().match(/^(.+?)×\s*(\d+)$/); if(m) add(m[1].trim(), Number(m[2]), BOW_COLORS.indexOf(m[1].trim())); }); }
      else {
        const label = [lvl, it.waist ? (size ? `เอว ${size}″` : "") : size].filter(Boolean).join(" · ") || "ทั้งหมด";
        const idx = it.sizes ? it.sizes.indexOf(size) : 0;
        add(label, qty, (it.levels ? it.levels.indexOf(lvl)*100 : 0) + (idx<0 ? 99 : idx) + (it.waist ? Number(size)||0 : 0));
      }
    });
    if(!map.size) return null;
    const items = [...map.entries()].sort((a,b)=> a[1].sortKey - b[1].sortKey);
    const pieces = items.reduce((s,[,o])=>s+o.n, 0);
    const money = data.reduce((s,d)=> s + (d.byId[it.id] ? Number(d.byId[it.id]["รวม"])||0 : 0), 0);
    return `<div class="tot-card"><div class="tot-head"><span class="so-ico">${it.ico}</span><b>${esc(it.name)}</b><span class="tot-sum">${pieces} ชิ้น · ${baht(money)}</span></div>
      <div class="tot-chips">${items.map(([label,o])=>`<span class="tot-chip">${esc(label)} <b>×${o.n}</b></span>`).join("")}</div></div>`;
  }).filter(Boolean);
  box.innerHTML = groups.length ? groups.join("") : `<div class="empty-note">ยังไม่มีใครสั่งอะไรในภาคเรียนนี้</div>`;
}
/* ดาวน์โหลด CSV (เปิดใน Excel / Google Sheet ได้ ภาษาไทยไม่เพี้ยน) */
qs("#hrsCsv")?.addEventListener("click", ()=>{
  const data = summaryData(), sub = subsidyAmount();
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["เลขที่", "ชื่อ-สกุล", "ชื่อเล่น", ...SUB_ITEMS.map(i=>i.name), "รวม", "เงินอุดหนุน", "ชำระเพิ่ม"];
  const lines = [head.map(q).join(",")];
  data.forEach(d=>{
    const cells = SUB_ITEMS.map(it=>{ const r = d.byId[it.id]; if(!r) return ""; const p = cellParts(it, r); return [p.main, p.sub, baht(p.total)].filter(Boolean).join(" "); });
    lines.push([d.st.no, d.st.name, d.st.nick, ...cells, d.total, sub, d.extra].map(q).join(","));
  });
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type:"text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `เงินอุดหนุน_${hr.room.replace(/[\\/:*?"<>|]/g,"-")}_ภาค${period.term}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
});

/* เปลี่ยนภาคเรียนจากแถบด้านบนขณะอยู่หน้าเหล่านี้ → วาดข้อมูลของภาคเรียนใหม่ */
function hrOnPeriodChanged(){
  const act = id => qs("#"+id).classList.contains("active");
  if(act("view-hr-docs")){ hrd.docs = hrDocsFromState(); hrd.snap = hrdSerialize(); renderHrDocs(); }
  if(act("view-hr-orders")) renderHrOrders();
  if(act("view-hr-summary")) renderHrSummary();
}

/* ================= SPLASH (ค้างจนกว่าจะโหลดข้อมูลเสร็จ) ================= */
(async function splash(){
  const sp = qs("#splash"), logo = qs("#splashLogo"), mark = qs(".brand .mark");
  const loadingEl = qs("#splashLoading");
  const done = ()=>{ document.body.classList.add("ready"); if(sp) sp.remove(); };
  try{
    if(document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r=>setTimeout(r,1500))]);
    logo.classList.add("show");
    await new Promise(r=>setTimeout(r,500)); // ให้โลโก้เด้งขึ้นมาก่อนค่อยโชว์ข้อความโหลด
    if(loadingEl) loadingEl.classList.add("show");

    // ค้างอยู่หน้านี้จนกว่าจะโหลดข้อมูลจาก Google Sheet เสร็จจริงๆ (กันปัญหา dropdown ว่างเพราะ config ยังไม่มา)
    await loadAll();

    if(loadingEl) loadingEl.classList.remove("show");
    await new Promise(r=>setTimeout(r,250));
    const m = mark.getBoundingClientRect();
    const dx = m.left + m.width/2 - innerWidth/2, dy = m.top + m.height/2 - innerHeight/2;
    logo.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`;
    logo.classList.add("go");
    qs("#splashBg").classList.add("fade");
    setTimeout(done, 1000);
  }catch(e){ done(); }
})();
