const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwTpyynyD9rT0RGSJVwIEZMPBDElaDsbmfFioWre4Q7pDM9-GHJS8OEthnDpVaQwzs6/exec"
};

const SLOT_MIN = 36; // จำนวนช่องว่างเริ่มต้นเมื่อยังไม่มีหัวคะแนน (18 สัปดาห์ x 2 คาบ) — ถ้ามีหัวแล้วจะคำนวณจาก slotTarget()
const WEEKDAYS = ["อา","จ","อ","พ","พฤ","ศ","ส"];

const state = {
  students: [], scores: [], activities: [], attendance: [], teaching: [], config: [], examRows: [], examSetup: [],
  examUi: { mc:"", es:"", vals:new Map(), dirty:false },
  attend: { room:"", subject:"", date:"", rows:[] },
  score: { tab:"beh", room:"", subject:"", headers:[], editingDate:null, pickCell:null, pending:new Map(), warned:false, scrolled:false }
};

const qs = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
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
const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
const fmtLong = iso => { const d=new Date(iso+"T00:00:00"); return d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}); };
const numOrNull = v => (v===""||v==null||isNaN(Number(v))) ? null : Number(v);

/* ================= ภาคเรียน / ประเภท (จำไว้ใน localStorage) ================= */
const TYPES = ["กลางภาค","ปลายภาค"];
const TK = { "กลางภาค":"m", "ปลายภาค":"f" };
const PERIOD_KEY = "kc_period";
const period = (()=>{
  try{ const p = JSON.parse(localStorage.getItem(PERIOD_KEY)); if(p && ["1","2"].includes(String(p.term)) && TYPES.includes(p.type)) return { term:String(p.term), type:p.type }; }catch(e){}
  return { term:"1", type:"กลางภาค" };
})();
/* แถวในชีทที่อยู่ในภาคเรียน+ประเภทที่เลือกอยู่ (แถวเก่าที่ช่อง ภาคเรียนที่/ประเภท ว่าง จะไม่ตรง) */
const inPeriod = r => sameStr(r["ภาคเรียนที่"], period.term) && sameStr(r["ประเภท"], period.type);
const scoreUnsaved = () => state.score.pending.size + (state.examUi.dirty ? 1 : 0);

function renderPeriodBars(){
  qsa(".period-bar").forEach(el=>{
    const mode = el.dataset.mode || "full";
    el.dataset.type = mode==="term" ? "" : period.type;
    const termBtns = ["1","2"].map(n=>`<button type="button" data-term="${n}" class="${period.term===n?"on":""}">${n}</button>`).join("");
    const typeBtns = TYPES.map(x=>`<button type="button" data-type="${x}" class="${period.type===x?"on":""}">${x}</button>`).join("");
    const now = mode==="term" ? `ภาคเรียนที่ ${period.term}` : `ภาคเรียนที่ ${period.term} · ${period.type}`;
    el.innerHTML = `<div class="pb-head"><span class="pb-lbl">📌 กำลังทำงานกับ</span><b class="pb-now">${now}</b></div>` +
      (mode==="lock" ? "" :
        `<div class="pb-ctl"><div class="pb-seg pb-term"><em>ภาคเรียนที่</em>${termBtns}</div>` +
        (mode==="term" ? "" : `<div class="pb-seg pb-type">${typeBtns}</div>`) + `</div>`);
  });
}
function setPeriod(patch){
  const next = { ...period, ...patch };
  if(next.term===period.term && next.type===period.type) return;
  if(qs("#view-scores-table").classList.contains("active") && scoreUnsaved()>0){
    toast("มีคะแนนที่ยังไม่ได้บันทึก — กดบันทึกก่อนเปลี่ยนภาคเรียน/ประเภทครับ"); return;
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
}

function toast(msg){
  const t = qs("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove("show"), Math.min(9000, Math.max(2200, msg.length*70)));
}

function showSaving(msg="กำลังบันทึกข้อมูล..."){
  const el = qs("#savingOverlay");
  qs("#savingMsg").textContent = msg;
  el.classList.add("active");
}
function hideSaving(){ qs("#savingOverlay").classList.remove("active"); }

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

function showView(id){
  qsa(".view").forEach(v=>v.classList.remove("active"));
  qs("#"+id).classList.add("active");
}

async function apiGet(type){
  const res = await fetch(`${CONFIG.API_URL}?type=${type}`);
  return res.json();
}
async function apiPost(payload){
  try{
    const res = await fetch(CONFIG.API_URL, {
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify(payload)
    });
    return await res.json();
  }catch(err){
    return { success:false, message:"เชื่อมต่อชีทไม่สำเร็จ (ตรวจเน็ต หรือ Deploy Apps Script เป็นเวอร์ชันใหม่แล้วหรือยัง)" };
  }
}

/* ถ้ามี error ที่ไม่คาดคิด ให้บอกผู้ใช้ และปิดหน้าจอ "กำลังบันทึก" ไม่ให้ค้าง */
window.addEventListener("error", e=>{ hideSaving(); toast("เกิดข้อผิดพลาด: " + (e.message || "ไม่ทราบสาเหตุ") + " (ลองรีเฟรชแบบล้างแคช)"); });
window.addEventListener("unhandledrejection", e=>{ hideSaving(); toast("เกิดข้อผิดพลาด: " + ((e.reason && e.reason.message) || e.reason || "ไม่ทราบสาเหตุ")); });

async function loadAll(){
  try{
    const data = await apiGet("all");
    state.students = data.students || [];
    state.scores = data.scores || [];
    state.activities = data.activities || [];
    state.attendance = data.attendance || [];
    state.teaching = data.teaching || [];
    state.config = Array.isArray(data.config) ? data.config : [];
    state.examRows = Array.isArray(data.exam) ? data.exam : [];
    state.examSetup = Array.isArray(data.examSetup) ? data.examSetup : [];
  }catch(err){
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
  const subSel = roomSel.closest(".view").querySelector("select.subject-select");
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
  return state.students.filter(s=>s["ชั้นปี"]===room)
    .sort((a,b)=> (a["เลขที่"]||0) - (b["เลขที่"]||0));
}

/* ================= HOME ================= */
qsa(".menu-item[data-go]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const go = btn.dataset.go;
    if(go==="attend"){ fillRoomSelects(); qs("#attendDate").value = todayISO(); showView("view-attend-setup"); }
    if(go==="scores"){ fillRoomSelects(); showView("view-scores-setup"); }
    if(go==="teaching"){ fillRoomSelects(); qs("#teachDate").value = todayISO(); showView("view-teaching"); }
    if(go==="exam"){ showView("view-exam"); }
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
    Object.keys(STATUS_LABEL).map(k=>`<div class="sum-tile" data-status="${k}"><b>${c[k]}</b><span>${STATUS_LABEL[k]}</span></div>`).join("") +
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
  qs("#attendSaveBtn").disabled = true;
  showSaving("กำลังบันทึกการเช็คชื่อ...");
  const res = await apiPost({ type:"addAttendance", term, ptype:type, level:room, subject, absent, leave, late, date });
  qs("#attendSaveBtn").disabled = false;
  if(res.success){
    await loadAll();
    hideSaving();
    toast(state.attend.existing ? "แก้ไขการเช็คชื่อเดิมของวันนี้แล้ว" : "บันทึกการเช็คชื่อแล้ว");
    showView("view-home");
  } else { hideSaving(); toast(res.message || "บันทึกไม่สำเร็จ"); }
});

/* ================= SCORES ================= */
qs("#scoreStartBtn").addEventListener("click", ()=>{
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
  return list.map(x=>({ label:x.name, key: count[x.name]>1 ? `${x.name} (เลขที่ ${x.no})` : x.name }));
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
  const emptyCount = Math.max(0, slotTarget() - state.score.headers.length);
  for(let i=0;i<emptyCount;i++){
    thead += `<th data-date="">—<span class="head-badge slot">ยังไม่มีหัว</span></th>`;
  }
  thead += `</tr>`;

  let rows = "";
  roster.forEach(st=>{
    rows += `<tr><td class="name-cell">${esc(st.label)}</td>`;
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
  const items = [...state.score.pending.entries()].map(([key, score])=>{
    const { name, date } = splitPendingKey(key);
    return {
      term: period.term, type: period.type, level: state.score.room, name, date,
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
  if(res.success){
    await loadAll();
    state.score.scrolled = false;
    syncHeadersWithActivities();
    hideSaving();
    renderScoreTable();
    // ตรวจซ้ำหลังบันทึก: Act ต้องเหลือเท่าจำนวนวันใหม่พอดี ไม่มีแถวเก่าค้าง
    const left = actRowsOfRoom().length;
    toast(left !== dates.length
      ? `⚠ ใน Act เหลือ ${left} แถว (ควรเป็น ${dates.length}) — ตรวจสคริปต์ setHeaders ฝั่ง Apps Script`
      : (res.message || "สร้างหัวคะแนนเรียบร้อย"));
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

/* score pick modal — แค่ "จำ" ค่าไว้ในเครื่องก่อน ยังไม่ยิง API จนกว่าจะกด "บันทึกคะแนน" */
function openScorePick(name, date){
  if(!date){ openAssignmentModal(null); return; }        // ช่องว่างที่ยังไม่มีวันที่ -> เปิดหน้าเพิ่มวันที่
  state.score.pickCell = { name, date };
  const cur = currentScore(name, date);
  qs("#pickLabel").textContent = `${name} · ${fmtLong(date)}`;
  qsa("#scorePickGrid button").forEach(b=> b.classList.toggle("cur", cur!==null && Number(b.dataset.v)===cur));
  const clr = qs("#scoreClearBtn"); if(clr) clr.style.display = (cur===null) ? "none" : "";     // มีคะแนนอยู่ถึงจะมีปุ่มลบ
  qs("#modalScorePick").classList.add("active");
}
qsa("#modalScorePick [data-close]").forEach(b=>b.addEventListener("click", ()=> qs("#modalScorePick").classList.remove("active")));
qsa("#scorePickGrid button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const { name, date } = state.score.pickCell;
    const v = Number(btn.dataset.v), key = pendingKey(name, date);
    if(v === savedScore(name, date)) state.score.pending.delete(key);   // เท่าค่าเดิม ไม่ต้องบันทึกซ้ำ
    else state.score.pending.set(key, v);
    qs("#modalScorePick").classList.remove("active");
    renderScoreTable();
  });
});
/* ลบคะแนน: ถ้าเคยบันทึกไว้แล้ว -> ทำเครื่องหมายรอลบ (ลบจริงตอนกดบันทึกคะแนน) / ถ้าเพิ่งลงยังไม่บันทึก -> ยกเลิกเฉยๆ */
qs("#scoreClearBtn")?.addEventListener("click", ()=>{
  const { name, date } = state.score.pickCell;
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

/* ================= ATTENDANCE REPORT (สรุปการมาเรียน) ================= */
const rep = { room:"", subject:"", start:"", periods:2, mode:"", dates:[] };
const addDays = (iso, n) => { const d = new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return toISO(d); };
const wdOf = iso => new Date(iso+"T00:00:00").getDay();

/* วันที่ใน Act ของห้อง+วิชานี้ ที่อยู่ในช่วง 18 สัปดาห์นับจากวันที่เริ่ม */
function actDatesFor(room, subject, from){
  const end = addDays(from, GEN_WEEKS*7 - 1), set = new Set();
  state.activities.forEach(a=>{
    if(a["รายวิชา"]!==subject || a["ระดับชั้น"]!==room || !inPeriod(a)) return;
    const k = dateKey(a["วันที่"]);
    if(k && k>=from && k<=end) set.add(k);
  });
  return [...set].sort();
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
qsa("#repPeriods button").forEach(b => b.addEventListener("click", ()=> setRepPeriods(Number(b.dataset.n))));
["#repRoom","#repSubject"].forEach(s => qs(s).addEventListener("change", updateRepSource));
qs("#repStart").addEventListener("input", updateRepSource);

qs("#attendReportBtn").addEventListener("click", ()=>{
  const view = qs("#view-attend-report-setup");
  fillRoomSelects(view);
  const r = qs("#attendRoom").value, s = qs("#attendSubject").value;
  if(r){ qs("#repRoom").value = r; fillSubjectSelect(qs("#repRoom")); if(s) qs("#repSubject").value = s; }
  qs("#repStart").value = qs("#attendDate").value || todayISO();
  qs("#repDateB").value = ""; qs("#repDateC").value = "";
  setRepPeriods(rep.periods);
  updateRepSource();
  showView("view-attend-report-setup");
});

qs("#repStartBtn").addEventListener("click", async ()=>{
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
  Object.assign(rep, { room, subject, start, dates });
  qs("#repHeadSub").textContent = `${room} · ${subject}`;
  renderPeriodBars();
  renderRepTable();
  showView("view-attend-report");
});

function renderRepTable(){
  const wrap = qs("#repTableWrap");
  const roster = scoreRoster(rep.room);
  if(roster.length===0){ wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; qs("#repInfo").textContent = ""; return; }

  const toSet = v => new Set(String(v||"").split(",").map(s=>s.trim()).filter(Boolean));
  const recs = new Map();   // วันที่ -> { absent, leave, late } (ถ้าเช็คซ้ำวันเดียวกัน ใช้อันล่าสุด)
  state.attendance.forEach(a=>{
    if(!sameStr(a["ระดับชั้น"],rep.room) || !sameStr(a["รายวิชา"],rep.subject) || !inPeriod(a)) return;
    const k = dateKey(a["วันที่"]); if(!k) return;
    recs.set(k, { absent:toSet(a["ขาดเรียน"]), leave:toSet(a["ลา"]), late:toSet(a["สาย"]) });
  });
  const statusOf = (name, d) => {
    const r = recs.get(d); if(!r) return "none";
    return r.absent.has(name) ? "absent" : r.leave.has(name) ? "leave" : r.late.has(name) ? "late" : "present";
  };
  const LBL = { present:"✓", absent:"ขาด", leave:"ลา", late:"สาย", none:"·" };
  const today = todayISO();

  let thead = `<tr><th class="name-head">ชื่อ</th><th class="sum">ขาด</th><th class="sum">ลา</th><th class="sum">สาย</th>` +
    rep.dates.map(d=>`<th class="${d===today?"today-col":""}">${fmtShort(d)}<small class="wd">${fmtWd(d)}</small></th>`).join("") + `</tr>`;
  let rows = "";
  roster.forEach(st=>{
    const cnt = { absent:0, leave:0, late:0 };
    const cells = rep.dates.map(d=>{
      const s = statusOf(st.label, d);
      if(cnt[s]!==undefined) cnt[s]++;
      return `<td><span class="ar ar-${s}">${LBL[s]}</span></td>`;
    }).join("");
    const sum = k => `<td class="sum"><b class="s-${k} ${cnt[k]?"on":""}">${cnt[k]}</b></td>`;
    rows += `<tr><td class="name-cell">${esc(st.label)}</td>${sum("absent")}${sum("leave")}${sum("late")}${cells}</tr>`;
  });
  wrap.innerHTML = `<table class="score-table"><thead>${thead}</thead><tbody>${rows}</tbody></table>`;

  const checked = rep.dates.filter(d=>recs.has(d)).length;
  qs("#repInfo").textContent = `${roster.length} คน · เช็คแล้ว ${checked}/${rep.dates.length} วัน`;
}

/* ================= TABS ในหน้าลงคะแนน: งาน/จิตพิสัย 1-5  |  คะแนนสอบ ================= */
function setScoreTab(tab){
  state.score.tab = tab;
  qsa("#scoreTabs [data-tab]").forEach(b=> b.classList.toggle("on", b.dataset.tab===tab));
  const beh = tab==="beh";
  qs("#behPane").style.display = beh ? "" : "none";
  qs("#examPane").style.display = beh ? "none" : "";
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

/* โหลดคะแนนสอบที่บันทึกไว้ของ (ภาคเรียน + ประเภทที่เลือก + ห้อง + วิชา) เข้ามาในหน้าจอ */
function loadExamUi(){
  const { room, subject } = state.score, u = state.examUi;
  if(!room || !subject) return;
  const s = findExamSetup(period.term, period.type, room, subject);
  u.mc = numOrNull(s?.["คะแนนเต็มปรนัย"]) ?? "";
  u.es = numOrNull(s?.["คะแนนเต็มอัตนัย"]) ?? "";
  u.vals = new Map();
  scoreRoster(room).forEach(st=>{
    const r = findExamRow(period.term, period.type, room, subject, st.key);
    u.vals.set(st.key, { mc: numOrNull(r?.["ปรนัย"]), es: numOrNull(r?.["อัตนัย"]) });
  });
  u.dirty = false;
}

function renderExam(){
  const box = qs("#examSetupBox"), wrap = qs("#examWrap"), u = state.examUi;
  const roster = scoreRoster(state.score.room);
  if(roster.length===0){ box.innerHTML = ""; wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; updateExamSaveBar(); return; }
  box.innerHTML = `
    <div class="exam-setup">
      <div class="ex-title">📐 คะแนนเต็มสอบ${esc(period.type)} · ภาคเรียนที่ ${period.term}</div>
      <div class="ex-grid">
        <label>ปรนัย<input id="examFullMc" type="number" inputmode="decimal" min="0" step="any" placeholder="เต็ม" value="${esc(u.mc)}"></label>
        <label>อัตนัย<input id="examFullEs" type="number" inputmode="decimal" min="0" step="any" placeholder="เต็ม" value="${esc(u.es)}"></label>
        <div class="ex-sum"><span>รวมเต็ม</span><b id="examFullTot">—</b></div>
      </div>
    </div>`;
  let rows = "";
  roster.forEach(st=>{
    const v = u.vals.get(st.key) || { mc:null, es:null };
    rows += `<tr data-name="${esc(st.key)}"><td class="name-cell">${esc(st.label)}</td>
      <td><input class="exam-in" data-k="mc" type="number" inputmode="decimal" min="0" step="any" value="${v.mc===null?"":v.mc}"></td>
      <td><input class="exam-in" data-k="es" type="number" inputmode="decimal" min="0" step="any" value="${v.es===null?"":v.es}"></td>
      <td class="exam-tot"></td></tr>`;
  });
  wrap.innerHTML = `<table class="score-table exam-table"><thead><tr><th class="name-head">ชื่อ</th><th>ปรนัย</th><th>อัตนัย</th><th>รวม</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="hint" style="padding:10px 12px 0;">พิมพ์คะแนนที่ได้ในแต่ละช่อง · ช่องสีแดง = เกินคะแนนเต็ม · กด "บันทึกคะแนนสอบ" ด้านล่างครั้งเดียว</div>`;
  refreshExamCalc();
}
/* คำนวณรวม/ตรวจเกินคะแนนเต็มโดยไม่วาดตารางใหม่ (ไม่ให้แป้นพิมพ์หลุด) */
function refreshExamCalc(){
  const u = state.examUi, fm = numOrNull(u.mc), fe = numOrNull(u.es);
  const tot = qs("#examFullTot"); if(tot) tot.textContent = (fm===null && fe===null) ? "—" : fmtNum((fm||0)+(fe||0));
  let filled = 0;
  qsa("#examWrap tr[data-name]").forEach(tr=>{
    const v = u.vals.get(tr.dataset.name) || { mc:null, es:null };
    const over = (val, full) => val!==null && (val<0 || (full!==null && val>full));
    qs('[data-k="mc"]', tr).classList.toggle("over", over(v.mc, fm));
    qs('[data-k="es"]', tr).classList.toggle("over", over(v.es, fe));
    const has = v.mc!==null || v.es!==null;
    if(has) filled++;
    qs(".exam-tot", tr).innerHTML = has ? `<b>${fmtNum((v.mc||0)+(v.es||0))}</b>` : "";
  });
  const info = qs("#examInfo"); if(info) info.textContent = `${u.vals.size} คน · ลงแล้ว ${filled}`;
  updateExamSaveBar();
}
function updateExamSaveBar(){ const b = qs("#examSaveBtn"); if(b) b.disabled = !state.examUi.dirty; }

qs("#examSetupBox").addEventListener("input", e=>{
  const u = state.examUi;
  if(e.target.id==="examFullMc") u.mc = e.target.value;
  else if(e.target.id==="examFullEs") u.es = e.target.value;
  else return;
  u.dirty = true; refreshExamCalc();
});
qs("#examWrap").addEventListener("input", e=>{
  const inp = e.target.closest(".exam-in"); if(!inp) return;
  const tr = inp.closest("tr"), v = state.examUi.vals.get(tr.dataset.name); if(!v) return;
  v[inp.dataset.k] = numOrNull(inp.value);
  state.examUi.dirty = true; refreshExamCalc();
});
qs("#examSaveBtn").addEventListener("click", async ()=>{
  const u = state.examUi, { room, subject } = state.score;
  const fm = numOrNull(u.mc), fe = numOrNull(u.es);
  let bad = false;
  u.vals.forEach(v=>{
    if(v.mc!==null && (v.mc<0 || fm===null || v.mc>fm)) bad = true;
    if(v.es!==null && (v.es<0 || fe===null || v.es>fe)) bad = true;
  });
  if(bad){ toast("มีคะแนนเกินคะแนนเต็ม หรือยังไม่ได้ใส่คะแนนเต็ม — ตรวจช่องสีแดงก่อนครับ"); return; }
  const items = [...u.vals].map(([name, v]) => ({ name, mc:v.mc, es:v.es }));
  qs("#examSaveBtn").disabled = true;
  showSaving("กำลังบันทึกคะแนนสอบ...");
  const res = await apiPost({ type:"saveExam", term:period.term, ptype:period.type, subject, level:room, fullMc:fm, fullEs:fe, items });
  if(res.success){
    await loadAll();
    loadExamUi(); renderExam();
    hideSaving();
    toast("บันทึกคะแนนสอบแล้ว ✓");
  } else { hideSaving(); updateExamSaveBar(); toast(res.message || "บันทึกไม่สำเร็จ"); }
});

/* ================= สรุปคะแนน + ตัดเกรด ================= */
const GRADES = [[80,"4"],[75,"3.5"],[70,"3"],[65,"2.5"],[60,"2"],[55,"1.5"],[50,"1"]];
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

function computeSummary(w){
  const { room, subject } = state.score, term = period.term;
  const roster = scoreRoster(room);
  const T = s => String(s ?? "").trim();

  // คอลัมน์หัวคะแนนทั้งเทอม (ทั้งกลางภาค+ปลายภาค): มีชื่องาน = "งาน", ไม่มีชื่องาน = "จิตพิสัย"
  const cols = [], seen = new Set();
  state.activities.forEach(a=>{
    if(!sameStr(a["รายวิชา"],subject) || !sameStr(a["ระดับชั้น"],room) || !sameStr(a["ภาคเรียนที่"],term)) return;
    const d = dateKey(a["วันที่"]), t = T(a["ประเภท"]);
    if(!d || !TYPES.includes(t) || seen.has(t+"|"+d)) return;
    seen.add(t+"|"+d);
    cols.push({ t, d, grp: T(a["งาน"]) ? "work" : "beh" });
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
  const usedN = grp => used.filter(c=>c.grp===grp).length;

  const full = {};
  TYPES.forEach(t=>{
    const s = findExamSetup(term, t, room, subject);
    full[t] = (numOrNull(s?.["คะแนนเต็มปรนัย"])||0) + (numOrNull(s?.["คะแนนเต็มอัตนัย"])||0);
  });

  const rows = roster.map(st=>{
    const o = { st };
    ["work","beh"].forEach(g=> TYPES.forEach(t=>{
      const sum = used.filter(c=>c.grp===g && c.t===t).reduce((a,c)=> a + (smap.get(sk(c,st))||0), 0);
      o[g+TK[t]] = usedN(g) ? sum / (5*usedN(g)) * w[g] : 0;
    }));
    TYPES.forEach(t=>{
      const r = findExamRow(term, t, room, subject, st.key);
      const mc = numOrNull(r?.["ปรนัย"]), es = numOrNull(r?.["อัตนัย"]);
      o["ex"+TK[t]] = (full[t]>0 && (mc!==null || es!==null)) ? ((mc||0)+(es||0)) / full[t] * (t==="กลางภาค" ? w.mid : w.fin) : 0;
    });
    o.mid = o.workm + o.behm + o.exm;
    o.fin = o.workf + o.behf + o.exf;
    o.total = o.mid + o.fin;
    o.r = Math.round(o.total + 1e-9);                       // ปัดเป็นจำนวนเต็มก่อนตัดเกรด
    o.grade = gradeOf(o.r);
    o.near = o.r >= 45 && o.r < 80 && o.r % 5 === 4;         // ขาดอีก 1 คะแนนจะได้เกรดสูงขึ้น (49, 54, 59, 64, 69, 74, 79)
    return o;
  });
  return { rows, usedWork: usedN("work"), usedBeh: usedN("beh"), full };
}

function renderWeights(){
  const w = loadWeights(), box = qs("#sumWeights");
  box.innerHTML = `<div class="w-title">⚖️ สัดส่วนคะแนน (%) · ภาคเรียนที่ ${period.term}</div>
    <div class="w-grid">${Object.keys(WLABEL).map(k=>`<label><span>${WLABEL[k]}</span><input type="number" inputmode="decimal" min="0" step="any" data-w="${k}" value="${w[k]}"></label>`).join("")}</div>
    <div class="w-total" id="wTotal"></div>
    <div class="hint" style="margin:8px 0 0;">งาน = หัวคะแนนที่ตั้งชื่องานไว้ · จิตพิสัย = หัวคะแนนที่ไม่มีชื่องาน (คิดจากคะแนน 1-5 เทียบกับ 5 คะแนนต่อวันที่ลงแล้ว) · สอบ = (ปรนัย+อัตนัย) ÷ คะแนนเต็ม</div>`;
}
function readWeights(){
  const w = {};
  qsa("#sumWeights [data-w]").forEach(i=>{ w[i.dataset.w] = Math.max(0, numOrNull(i.value) ?? 0); });
  return w;
}
qs("#sumWeights").addEventListener("input", e=>{
  if(!e.target.dataset.w) return;
  saveWeights(readWeights()); renderSumTable();
});

function renderSumTable(){
  const w = readWeights(), wrap = qs("#sumTableWrap");
  const wsum = Object.values(w).reduce((a,b)=>a+b, 0);
  const tot = qs("#wTotal");
  tot.className = "w-total " + (Math.abs(wsum-100) < 0.001 ? "ok" : "bad");
  tot.innerHTML = Math.abs(wsum-100) < 0.001 ? `รวม <b>100</b>% ✓` : `รวม <b>${fmt1(wsum)}</b>% — ควรเป็น 100 (คะแนนเต็มจะเป็น ${fmt1(wsum)})`;

  const roster = scoreRoster(state.score.room);
  if(roster.length===0){ wrap.innerHTML = `<div class="empty-note">ไม่พบรายชื่อนักเรียนในห้องนี้</div>`; qs("#sumStats").innerHTML = ""; return; }
  const S = computeSummary(w);

  let head = `<tr class="r1"><th class="name-head" rowspan="2">ชื่อ</th><th colspan="4" class="g-mid">กลางภาค</th><th colspan="4" class="g-fin">ปลายภาค</th><th colspan="2" class="g-all">ทั้งภาค</th></tr>
    <tr class="r2"><th>งาน</th><th>จิต</th><th>สอบ</th><th class="tot">รวม</th><th>งาน</th><th>จิต</th><th>สอบ</th><th class="tot">รวม</th><th class="tot">รวม</th><th>เกรด</th></tr>`;
  let body = "";
  const dist = {}; let nearN = 0;
  S.rows.forEach(o=>{
    dist[o.grade] = (dist[o.grade]||0) + 1; if(o.near) nearN++;
    const c = v => `<td>${fmt1(v)}</td>`, t = v => `<td class="tot">${fmt1(v)}</td>`;
    body += `<tr class="${o.near?"near":""}"><td class="name-cell">${esc(o.st.label)}</td>
      ${c(o.workm)}${c(o.behm)}${c(o.exm)}${t(o.mid)}${c(o.workf)}${c(o.behf)}${c(o.exf)}${t(o.fin)}
      <td class="tot grand">${o.r}</td>
      <td class="gcell"><span class="gr g${o.grade.replace(".","_")}">${o.grade}</span>${o.near ? `<small class="near-tag">อีก 1 → ${gradeOf(o.r+1)}</small>` : ""}</td></tr>`;
  });
  wrap.innerHTML = `<table class="score-table sum-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;

  const notes = [];
  if(!S.usedWork) notes.push("ยังไม่มีคะแนนงาน (หัวคะแนนที่มีชื่องาน)");
  if(!S.usedBeh) notes.push("ยังไม่มีคะแนนจิตพิสัย (หัวคะแนนที่ไม่มีชื่องาน)");
  TYPES.forEach(t=>{ if(!S.full[t]) notes.push(`ยังไม่ได้ตั้งคะแนนเต็มสอบ${t}`); });
  const chips = ["4","3.5","3","2.5","2","1.5","1","0"].filter(g=>dist[g]).map(g=>`<span class="gr g${g.replace(".","_")}">${g}<i>×${dist[g]}</i></span>`).join("");
  qs("#sumStats").innerHTML =
    `<div class="ss-row"><b>${S.rows.length}</b> คน ${chips}</div>` +
    (nearN ? `<div class="ss-near">⚡ ${nearN} คน ขาดอีก 1 คะแนนจะได้เกรดสูงขึ้น (แถวสีเหลือง)</div>` : "") +
    (notes.length ? `<div class="ss-warn">⚠ ${notes.join(" · ")}</div>` : "");
}
function renderSummary(){
  qs("#sumHeadSub").textContent = `${state.score.room} · ${state.score.subject} · ภาคเรียนที่ ${period.term}`;
  renderWeights(); renderSumTable();
}
let sumBack = "view-scores-setup";
async function openSummary(room, subject, back){
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