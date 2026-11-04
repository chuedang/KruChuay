/* ===== FixboyChat.js — น้อง Fixboy แชทบอทบนหน้าแรก KruChauy =====
   - ปุ่มเรียกน้อง (ลอยอยู่มุมขวา เฉพาะหน้าแรก) → เปิดแชท
   - พิมพ์ help หรือ /help เพื่อดูคำสั่งทั้งหมด (พิมพ์มี / หรือไม่มี / ก็ได้ ตัวพิมพ์เล็ก/ใหญ่ไม่สำคัญ)
   - /ขอไฟล์ รูปภาพ (หรือ ภาพ / .png) = แสดงรูปทั้งหมดใน Drive จากนามสกุลไฟล์ + แก้ชื่อรูปในแชทได้ (ต้องวางโค้ด Apps Script ใหม่)
   - 1 ข้อความตอบได้หลายคำสั่ง: ใส่หลายชื่อคั่นด้วย , เช่น  a, b, c · ค้นหาไฟล์ใน Drive: /drive ชื่อไฟล์ หรือ /ขอไฟล์ ชื่อไฟล์
   - คำสั่งเก็บในชีท Config (แถว ID = S1, S2, … · รหัสวิชา = ชื่อคำสั่ง · รายวิชา = ข้อความตอบ) แก้ในชีทตรง ๆ ได้
   - เพิ่ม/แก้/ลบที่ปุ่ม ⚙️ ในแชทก็ได้ (ถ้าเชื่อมชีทแล้วจะเขียนลงชีทให้ด้วย) · แคชไว้ในเครื่อง localStorage: kc_fixboy_cmds
   - ภาพน้องใช้จาก image/fixboy-1.png ถึง fixboy-8.png (ครอบมาจาก Fixboy.png)
   ชื่อไฟล์นี้ไม่ซ้ำกับ Fixboy.js (บอทค้นหาไฟล์ฝั่ง Node) */
(function () {
  "use strict";

  var IMG = "image/fixboy-";           // โฟลเดอร์ + คำนำหน้าชื่อภาพ
  var KEY = "kc_fixboy_cmds";
  /* ลิงก์ Web app ของชีท KruChauy ที่ฝังไว้ (ใช้คนเดียว) — ลำดับที่ใช้: ที่กรอกเองใน ⚙️ → ที่หาเจอจากแอปหลักอัตโนมัติ → ค่านี้ */
  var DEFAULT_SHEET_URL = "https://script.google.com/macros/s/AKfycbzw7PEyNTqMfdDe_2TnFEQLnpquxdilJpqvmag1j4eotO_dg91XZz61hXwvS4DE1QDY/exec";
  var SKEY = "kc_fixboy_sheet";        // ลิงก์ Web app ของชีท KruChauy (กรอกเองถ้าหาอัตโนมัติไม่เจอ)
  /* ค่าเชื่อม Google Drive ที่ฝังไว้ (ใช้คนเดียว) — เครื่องไหนยังไม่เคยตั้ง จะใช้ค่านี้อัตโนมัติ
     folder ว่าง = ให้สคริปต์สร้างโฟลเดอร์ "Fixboy Uploads" เอง · ถ้ากด "ยกเลิกการเชื่อมต่อ" ในแชท เครื่องนั้นจะไม่ใช้ค่านี้ */
  var DEFAULT_DRIVE = {
    url: "https://script.google.com/macros/s/AKfycbxL9zSEke6ABrDQWjFHSLUaxki32bZ4OO9i1RL457TaSE_KuZd4egPcVzyxqQE8EHzR/exec",
    key: "c5px37axjvgf0zdb",
    folder: ""
  };
  var DKEY = "kc_fixboy_drive";        // ค่าเชื่อม Google Drive {url, key, folder}
  var MAX_MB = 20;                      // ไฟล์ใหญ่สุดต่อไฟล์ (Apps Script รับก้อนใหญ่ไม่ไหว)
  var DRIVE_WORDS = ["drive", "ไดรฟ์", "ไดร์ฟ", "ไดรว์"];
  var FILE_WORDS = ["ขอไฟล์"];                      // /ขอไฟล์ ชื่อไฟล์  (เหมือน /drive ชื่อไฟล์)
  var SEARCH_WORDS = DRIVE_WORDS.concat(FILE_WORDS);
  /* /ขอไฟล์ รูปภาพ (หรือ ภาพ) = หาจาก "นามสกุลไฟล์ที่เป็นรูป" ไม่ใช้ชื่อไฟล์ · /ขอไฟล์ .png = เฉพาะนามสกุลนั้น */
  var IMAGE_WORDS = ["รูปภาพ", "รูป", "ภาพ", "รูปถ่าย", "image", "images", "photo", "photos", "picture", "pictures", "pic", "pics"];
  var IMG_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif", "svg", "tif", "tiff"];
  var IMG_PAGE = 20;                    // โหลดรูปครั้งละกี่รูป (กด “โหลดเพิ่ม” ต่อได้จนครบ)
  /* คืน "" = รูปทุกนามสกุล, "png" = เฉพาะนามสกุลนั้น, null = ไม่ใช่คำสั่งหารูป (ไปค้นหาตามชื่อไฟล์ตามเดิม) */
  function imageQuery(q) {
    var n = norm(q);
    if (IMAGE_WORDS.indexOf(n) >= 0) return "";
    var m = n.match(/^\.?([a-z0-9]+)$/);
    if (m && IMG_EXTS.indexOf(m[1]) >= 0) return m[1];
    return null;
  }

  /* ---------- คำสั่งเริ่มต้น (แก้ตรงนี้ได้ หรือไปแก้/เพิ่ม/ลบใน ⚙️ ก็ได้) ----------
     k = ชื่อคำสั่ง (ไม่ต้องใส่ /)   d = คำอธิบายสั้นที่โชว์ใน /help
     t = ข้อความที่ตอบกลับ           lock = true → ซ่อนไว้ก่อน แตะเพื่อดู (กันคนเห็นตอนฉายจอ) */
  var DEFAULTS = [
    { k: "ที่อยู่", d: "แสดงสถานที่อาศัยปัจจุบัน", lock: false,
      t: "🌻 99/99 หมู่ 9 บุญพรอพาร์ตเมนต์\nซอยติวานนท์ 32 ถนนติวานนท์\nอำเภอเมืองนนทบุรี\nตำบลบางกระสอ\nจังหวัดนนทบุรี 11000\nนายเมธัส เชื้อแดง\nTel.080-780-7089\n🫶🏻💛🌻✨" },
    { k: "ดล", d: "ที่อยู่โรงเรียนดลวิทยา และหนังสือแต่งตั้ง", lock: false,
      t: "โรงเรียนดลวิทยาตั้งอยู่ที่เลขที่ 1 ซอยศูนย์วิจัย 10 ถนนเพชรบุรีตัดใหม่ แขวงบางกะปิ เขตห้วยขวาง กรุงเทพมหานคร 10310\nหนังสือแต่งตั้ง: ดลว. 1017/2567" },
    { k: "exam", d: "เมลล์ส่งข้อสอบดลวิทยาและการรวมวิชา", lock: false,
      t: "taandtoi@hotmail.com\nConversation + EP + Reading" },
    { k: "บัญชี", d: "🏦", lock: true,
      t: "986-6-95445-5\nธนาคาร กรุงไทย\nนายเมธัส เชื้อแดง\nพร้อมเพย์ 0807807089" },
    { k: "regis", d: "เข้าระบบ Regis", lock: true,
      t: "Metat\n#MARKmark016" },
    { k: "Alevel", d: "ข้อสอบ A-Level ปี 66-68", lock: false,
      t: "A-Level คณิตประยุกต์ 1 ปี 66-68 พร้อมเฉลย\n🌻ปี 68\nhttps://assets.mytcas.com/68/answer/tcas68-math1-a-level.pdf\n🌹ปี 67\nhttps://drive.google.com/file/d/1nMKDvH9JloltYCY9Ka1-eY5C8YeRwBF4/view\n🪻ปี 66\nhttps://drive.google.com/file/d/1SsHN7lUCSIG2WhLiEL6P9xgH-9pR3TQI/view" },
    { k: "สอน", d: "เนื้อหา ม.2", lock: false,
      t: "ม.2\nเทอม 1 : แก้สมการ , เลขยกกำลัง\nเทอม 2 : คูณพหุนาม , (หาร+เศษส่วน)พหุนาม" },
    { k: "wifiดล", d: "รหัสเน็ตโรงเรียนดลวิทยา", lock: true,
      t: "00000UJW" }
  ];

  var HELP_WORDS = ["help", "ช่วยเหลือ", "คำสั่ง", "?"];

  /* ---------- helpers ---------- */
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function linkify(s) { return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
  function norm(s) { return String(s).trim().toLowerCase().replace(/^\/+/, "").replace(/\s+/g, ""); }
  /* 1 ข้อความตอบได้หลายคำสั่ง: ช่องชื่อคำสั่งใส่หลายชื่อคั่นด้วย , เช่น  a, b, c */
  function rawNames(k) { return String(k == null ? "" : k).split(/[\s,;\/،]+/).filter(function (x) { return x; }); }
  function nameList(k) { return rawNames(k).map(norm).filter(Boolean); }
  function uniqNames(k) { var seen = {}; return rawNames(k).filter(function (x) { var n = norm(x); if (!n || seen[n]) return false; seen[n] = 1; return true; }); }
  function nameSlash(c) { return rawNames(c.k).map(function (x) { return "/" + x; }).join(" "); }
  function firstName(c) { return rawNames(c.k)[0] || c.k; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(s) && s.every(function (c) { return c && typeof c.k === "string" && typeof c.t === "string"; })) return s;
    } catch (e) {}
    return clone(DEFAULTS);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cmds)); } catch (e) {} }

  function loadDrive() {
    try { var d = JSON.parse(localStorage.getItem(DKEY)); if (d && typeof d.url === "string") return d; } catch (e) {}
    return { url: DEFAULT_DRIVE.url, key: DEFAULT_DRIVE.key, folder: DEFAULT_DRIVE.folder };   // ยังไม่เคยตั้งในเครื่องนี้ → ใช้ค่าที่ฝังไว้
  }
  function saveDrive() { try { localStorage.setItem(DKEY, JSON.stringify(drive)); } catch (e) {} }
  /* ---------- เชื่อมชีท Config (คำสั่งเก็บในชีท) ---------- */
  var URL_VARS = ["API_URL", "SCRIPT_URL", "GAS_URL", "WEB_APP_URL", "WEBAPP_URL", "APP_URL", "SHEET_URL", "SHEETS_URL", "URL_API", "API", "GAS", "ENDPOINT", "BACKEND_URL", "SERVER_URL", "DATA_URL", "GS_URL", "APPS_SCRIPT_URL"];
  var detected = null;
  function loadSheetCfg() { try { var s = JSON.parse(localStorage.getItem(SKEY)); if (s && typeof s.url === "string") return s; } catch (e) {} return { url: "" }; }
  function saveSheetCfg() { try { localStorage.setItem(SKEY, JSON.stringify(sheetCfg)); } catch (e) {} }
  function globalStr(name) {   // อ่านตัวแปร const/let ระดับบนสุดของสคริปต์อื่น (ไม่อยู่บน window)
    try { var v = (new Function("return typeof " + name + "!=='undefined'?" + name + ":''"))(); return typeof v === "string" ? v : ""; } catch (e) { return ""; }
  }
  function detectSheetUrl() {
    if (window.FIXBOY_SHEET_URL && isExecUrl(window.FIXBOY_SHEET_URL)) return window.FIXBOY_SHEET_URL;
    for (var i = 0; i < URL_VARS.length; i++) { var v = globalStr(URL_VARS[i]); if (isExecUrl(v)) return v; }
    try {
      for (var j = 0; j < localStorage.length; j++) {
        var k = localStorage.key(j); if (k === DKEY || k === KEY || k === SKEY) continue;
        var m = (localStorage.getItem(k) || "").match(/https:\/\/script\.google\.com\/[^\s"'\\]+\/exec/);
        if (m && isExecUrl(m[0])) return m[0];
      }
    } catch (e) {}
    return "";
  }
  function sheetUrl() {
    if (sheetCfg.url && isExecUrl(sheetCfg.url)) return sheetCfg.url;
    if (detected === null) detected = detectSheetUrl();
    return detected || DEFAULT_SHEET_URL;   // หาจากแอปหลักไม่เจอ → ใช้ค่าที่ฝังไว้
  }
  function sheetGet(type) {
    var u = sheetUrl();
    return fetch(u + (u.indexOf("?") >= 0 ? "&" : "?") + "type=" + type).then(function (r) { return r.json(); });
  }
  function sheetPost(obj) {
    return fetch(sheetUrl(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(obj) }).then(function (r) { return r.json(); });
  }
  function sheetErr(e) {
    var m = String(e && e.message || e);
    return /Failed to fetch|NetworkError|Load failed|JSON|Unexpected/i.test(m) ? "ติดต่อชีทไม่ได้ — เช็กลิงก์ /exec และว่า Deploy เวอร์ชันใหม่แล้ว" : m;
  }
  function normList(a) {
    return a.map(function (o) { return { id: String(o.id || ""), k: String(o.k || ""), d: String(o.d || ""), t: String(o.t || ""), lock: !!o.lock }; })
            .filter(function (c) { return c.k && c.t; });
  }
  function refreshSettings() { if (!elSet.hidden && editing === -2) renderSettings(); }

  /* โหลดคำสั่งจากชีท Config → แทนที่คำสั่งในเครื่อง (ชีทคือต้นฉบับ) */
  function pullCmds() {
    if (!sheetUrl()) return Promise.resolve(false);
    return sheetGet("fixboy").then(function (j) {
      if (!Array.isArray(j)) throw new Error(j && j.message ? j.message : "Apps Script ยังไม่ใช่เวอร์ชันใหม่ — ต้อง Deploy เวอร์ชันใหม่ก่อน");
      var list = normList(j), hadSynced = cmds.some(function (c) { return c.id; });
      if (list.length || hadSynced) { cmds = list; save(); renderChips(); }   // ชีทว่างและยังไม่เคยซิงก์ = ใช้คำสั่งในเครื่องต่อ
      lastPull = Date.now();
      sheetMsg = { ok: true, text: list.length ? "🔄 โหลด " + list.length + " คำสั่งจากชีท Config แล้ว" : (hadSynced ? "ชีท Config ไม่มีคำสั่งเหลือแล้ว" : "ชีท Config ยังไม่มีคำสั่ง (แถว ID = S1, S2, …) — กด ⬆ ส่งขึ้นชีท ได้เลย") };
      refreshSettings();
      return true;
    }).catch(function (e) {
      sheetMsg = { ok: false, text: "โหลดจากชีทไม่สำเร็จ: " + sheetErr(e) };
      refreshSettings();
      return false;
    });
  }
  /* ส่งคำสั่งทั้งหมดในเครื่องขึ้นชีท (ชื่อซ้ำกับในชีท = ข้าม ไม่ทับ) */
  function pushCmds() {
    sheetMsg = { ok: true, text: "⏳ กำลังส่งขึ้นชีท…" }; refreshSettings();
    sheetPost({ type: "syncFixboyCmds", items: cmds.map(function (c) { return { k: c.k, d: c.d || "", t: c.t, lock: !!c.lock }; }) })
      .then(function (j) {
        if (!j || !j.success) throw new Error(j && j.message || "ไม่ทราบสาเหตุ");
        return pullCmds().then(function () { sheetMsg = { ok: true, text: "⬆ " + j.message }; refreshSettings(); });
      })
      .catch(function (e) { sheetMsg = { ok: false, text: "ส่งขึ้นชีทไม่สำเร็จ: " + sheetErr(e) }; refreshSettings(); });
  }
  function genKey() {
    var a = new Uint8Array(12), o = "";
    try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < a.length; j++) o += (a[j] % 36).toString(36);
    return o + Date.now().toString(36).slice(-4);
  }
  function parseFolder(s) {              // ลิงก์โฟลเดอร์ Drive → id ("" = ไม่ใส่, null = อ่านไม่ออก)
    s = String(s || "").trim();
    if (!s) return "";
    var m = s.match(/\/folders\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/);
    if (m) return m[1];
    if (/^[\w-]{20,}$/.test(s)) return s;
    return null;
  }
  function isExecUrl(u) { return /^https:\/\/script\.google\.com\/.+\/exec(\?.*)?$/.test(u); }
  function fmtSize(n) { return n < 1024 ? n + " B" : n < 1048576 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1) + " MB"; }
  function copyText(txt, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
    else { var ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (x) {} ta.remove(); done(); }
  }

  /* โค้ด Apps Script ที่ให้ผู้ใช้คัดลอกไปวาง (ใส่รหัสกันคนอื่นแอบอัปโหลดให้อัตโนมัติ) */
  function scriptCode(key) {
    return [
      "// Fixboy → Google Drive  (วางทับโค้ดเดิมทั้งหมด)",
      "var KEY = " + JSON.stringify(key || "") + ";",
      "var FOLDER_NAME = 'Fixboy Uploads';",
      "var IMG_EXT = ['jpg','jpeg','png','gif','webp','bmp','heic','heif','svg','tif','tiff'];",
      "",
      "function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }",
      "function folder_(id) {",
      "  if (id) return DriveApp.getFolderById(id);",
      "  var it = DriveApp.getFoldersByName(FOLDER_NAME);",
      "  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);",
      "}",
      "function n_(s) { return String(s).toLowerCase().replace(/[\\s.\\-_()\\[\\]]+/g, ''); }",
      "function extOf_(name) { var m = String(name).toLowerCase().match(/\\.([a-z0-9]+)$/); return m ? m[1] : ''; }",
      "function day_(f) { return Utilities.formatDate(f.getLastUpdated(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }",
      "function search_(root, q) {",
      "  var words = q.split(/\\s+/).map(n_).filter(Boolean).slice(0, 6);",
      "  if (!words.length) return [];",
      "  var hit = [], todo = [root], scanned = 0, t0 = new Date().getTime();",
      "  while (todo.length && scanned < 5000 && new Date().getTime() - t0 < 25000) {",
      "    var fo = todo.shift(), it = fo.getFiles();",
      "    while (it.hasNext() && scanned < 5000) {",
      "      var f = it.next(); scanned++;",
      "      var nm = n_(f.getName());",
      "      if (words.every(function (w) { return nm.indexOf(w) >= 0; })) hit.push(f);",
      "    }",
      "    var sub = fo.getFolders();",
      "    while (sub.hasNext()) todo.push(sub.next());",
      "  }",
      "  hit.sort(function (a, b) { return b.getLastUpdated() - a.getLastUpdated(); });",
      "  return hit.slice(0, 10).map(function (f) { return { name: f.getName(), url: f.getUrl(), size: f.getSize(), date: day_(f) }; });",
      "}",
      "// หารูปภาพทั้งหมดจาก \"นามสกุลไฟล์/ชนิดไฟล์\" (ไม่ใช้ชื่อไฟล์) — ext ว่าง = ทุกนามสกุลรูป, แบ่งหน้าด้วย offset/limit",
      "function images_(root, ext, offset, limit) {",
      "  var hit = [], todo = [root], scanned = 0, t0 = new Date().getTime();",
      "  while (todo.length && scanned < 5000 && new Date().getTime() - t0 < 20000) {",
      "    var fo = todo.shift(), it = fo.getFiles();",
      "    while (it.hasNext() && scanned < 5000) {",
      "      var f = it.next(); scanned++;",
      "      var e = extOf_(f.getName());",
      "      if (IMG_EXT.indexOf(e) < 0 && String(f.getMimeType()).indexOf('image/') !== 0) continue;",
      "      if (ext) {",
      "        var same = (e === ext) || (ext === 'jpg' && e === 'jpeg') || (ext === 'jpeg' && e === 'jpg');",
      "        if (!same) continue;",
      "      }",
      "      hit.push(f);",
      "    }",
      "    var sub = fo.getFolders();",
      "    while (sub.hasNext()) todo.push(sub.next());",
      "  }",
      "  hit.sort(function (a, b) { return b.getLastUpdated() - a.getLastUpdated(); });",
      "  var page = hit.slice(offset, offset + limit).map(function (f) {",
      "    var th = '';",
      "    try { var b = f.getThumbnail(); if (b) th = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); } catch (x) {}",
      "    return { id: f.getId(), name: f.getName(), url: f.getUrl(), size: f.getSize(), date: day_(f), thumb: th };",
      "  });",
      "  return { total: hit.length, files: page };",
      "}",
      "function doGet(e) {",
      "  var p = (e && e.parameter) || {};",
      "  if (KEY && p.key !== KEY) return out_({ ok: false, error: 'bad key' });",
      "  try {",
      "    var fo = folder_(p.folderId);",
      "    if (p.kind === 'images') {",
      "      var r = images_(fo, String(p.ext || '').toLowerCase().replace(/^\\./, ''), parseInt(p.offset, 10) || 0, Math.min(parseInt(p.limit, 10) || 20, 30));",
      "      return out_({ ok: true, folder: fo.getUrl(), total: r.total, files: r.files });",
      "    }",
      "    if (p.q) return out_({ ok: true, folder: fo.getUrl(), files: search_(fo, String(p.q)) });",
      "    return out_({ ok: true, folder: fo.getUrl() });",
      "  } catch (err) { return out_({ ok: false, error: String(err) }); }",
      "}",
      "function doPost(e) {",
      "  try {",
      "    var d = JSON.parse(e.postData.contents);",
      "    if (KEY && d.key !== KEY) return out_({ ok: false, error: 'bad key' });",
      "    if (d.action === 'rename') {   // แก้ชื่อไฟล์จากแชท",
      "      var nm = String(d.name || '').replace(/[\\\\\\/:*?\"<>|]+/g, ' ').trim();",
      "      if (!nm) return out_({ ok: false, error: 'ชื่อว่าง' });",
      "      var rf = DriveApp.getFileById(String(d.id));",
      "      rf.setName(nm);",
      "      return out_({ ok: true, name: rf.getName(), url: rf.getUrl() });",
      "    }",
      "    var fo = folder_(d.folderId);",
      "    var f = fo.createFile(Utilities.newBlob(Utilities.base64Decode(d.data), d.type || 'application/octet-stream', d.name));",
      "    return out_({ ok: true, name: f.getName(), url: f.getUrl(), folder: fo.getUrl() });",
      "  } catch (err) { return out_({ ok: false, error: String(err) }); }",
      "}"
    ].join("\n");
  }

  var drive = loadDrive();
  var sheetCfg = loadSheetCfg();
  var sheetMsg = null, lastPull = 0;
  var cmds = load();
  var isOpen = false, busy = false, greeted = false, full = false, dragDepth = 0;
  var poseTimer = null, idleTimer = null, typeTimer = null;
  var editing = -1;   // -1 = เพิ่มใหม่

  /* โหลดภาพล่วงหน้า */
  for (var i = 1; i <= 8; i++) { var pre = new Image(); pre.src = IMG + i + ".png"; }

  /* ---------- สร้าง DOM ---------- */
  var root = document.createElement("div");
  root.id = "fbRoot";
  root.innerHTML =
    '<button id="fbSummon" class="fb-summon" type="button" aria-label="เรียกน้อง Fixboy">' +
      '<span class="fb-tip">เรียกน้อง Fixboy ✨</span><img src="' + IMG + '1.png" alt="">' +
    '</button>' +
    '<div id="fbBackdrop" class="fb-backdrop"></div>' +
    '<section id="fbPanel" class="fb-panel" role="dialog" aria-label="แชทน้อง Fixboy" aria-hidden="true">' +
      '<div class="fb-stage"><img id="fbStage" src="' + IMG + '2.png" alt="Fixboy"></div>' +
      '<header class="fb-head">' +
        '<div class="fb-title"><b>น้อง Fixboy</b><small>ผู้ช่วยครู · พิมพ์ /help · /drive ชื่อไฟล์ · /ขอไฟล์ รูปภาพ</small></div>' +
        '<button type="button" class="fb-ico" id="fbGear" aria-label="ตั้งค่า">⚙️</button>' +
        '<button type="button" class="fb-ico" id="fbFull" aria-label="ขยายแชทเต็มจอ" title="ขยายเต็มจอ">⤢</button>' +
        '<button type="button" class="fb-ico" id="fbClose" aria-label="ปิด">✕</button>' +
      '</header>' +
      '<div class="fb-msgs" id="fbMsgs" aria-live="polite"></div>' +
      '<div class="fb-form">' +
        '<button type="button" id="fbImgBtn" class="fb-attach" aria-label="เพิ่มรูปภาพจากคลัง" title="เพิ่มรูปภาพจากคลัง → เก็บลง Google Drive">🖼️</button>' +
        '<input id="fbImg" type="file" accept="image/*" multiple hidden>' +
        '<button type="button" id="fbAttach" class="fb-attach" aria-label="เพิ่มไฟล์" title="เพิ่มไฟล์ → เก็บลง Google Drive">📎</button>' +
        '<input id="fbFile" type="file" multiple hidden>' +
        '<input id="fbInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" placeholder="พิมพ์ /help หรือชื่อคำสั่ง…">' +
        '<button type="button" id="fbSend" class="fb-send" aria-label="ส่ง">➤</button>' +
      '</div>' +
      '<div class="fb-settings" id="fbSettings" hidden></div>' +
      '<div class="fb-drop" id="fbDrop"><div>📂<br>ปล่อยไฟล์ตรงนี้เพื่อเก็บลง Google Drive</div></div>' +
    '</section>';
  document.body.appendChild(root);

  var elSummon = $("#fbSummon"), elBack = $("#fbBackdrop"), elPanel = $("#fbPanel"), elStage = $("#fbStage"),
      elMsgs = $("#fbMsgs"), elInput = $("#fbInput"), elSet = $("#fbSettings"), elFull = $("#fbFull"), elFile = $("#fbFile"), elImg = $("#fbImg");

  /* ---------- ท่าทางน้อง ---------- */
  function setPose(n) {
    var src = IMG + n + ".png";
    if (elStage.getAttribute("src") === src) return;
    elStage.setAttribute("src", src);
    elStage.classList.remove("fb-pop"); void elStage.offsetWidth; elStage.classList.add("fb-pop");
  }
  function stopTyping() { if (typeTimer) { clearInterval(typeTimer); typeTimer = null; } }
  function startTyping() {
    stopTyping(); var f = 0;
    setPose(6);
    typeTimer = setInterval(function () { f++; setPose(f % 2 ? 8 : 6); }, 320);
  }
  function backToIdle(ms) {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { if (isOpen) setPose(4); }, ms || 4000);
  }

  /* ---------- ข้อความในแชท ---------- */
  function scrollEnd() { elMsgs.scrollTop = elMsgs.scrollHeight; }
  function avatarHtml() { return '<img class="fb-av" src="' + IMG + '2.png" alt="">'; }

  function addUser(text) {
    var d = document.createElement("div");
    d.className = "fb-row me";
    d.innerHTML = '<div class="fb-bub">' + esc(text) + '</div>';
    elMsgs.appendChild(d); scrollEnd();
  }
  function addBot(html, opts) {
    opts = opts || {};
    var d = document.createElement("div");
    d.className = "fb-row bot" + (opts.wide ? " wide" : "");
    var body = html;
    if (opts.lock) {
      body = '<div class="fb-lock"><div class="fb-lock-in">' + html + '</div>' +
             '<button type="button" class="fb-reveal">🔒 แตะเพื่อดู</button></div>';
    }
    var tools = opts.copy ? '<button type="button" class="fb-copy">คัดลอก</button>' : "";
    d.innerHTML = avatarHtml() + '<div class="fb-col"><div class="fb-bub">' + body + '</div>' + tools + '</div>';
    if (opts.copy) d.querySelector(".fb-copy").dataset.text = opts.copy;
    elMsgs.appendChild(d); scrollEnd();
    return d;
  }
  function addTyping() {
    var d = document.createElement("div");
    d.className = "fb-row bot fb-typing";
    d.innerHTML = avatarHtml() + '<div class="fb-bub"><i></i><i></i><i></i></div>';
    elMsgs.appendChild(d); scrollEnd();
    return d;
  }

  function cmdButtons(list) {
    return '<div class="fb-cmdlist">' + list.map(function (c) {
      return '<button type="button" class="fb-cmd" data-cmd="' + esc(firstName(c)) + '"><b>' + esc(nameSlash(c)) + '</b><span>' + esc(c.d || "") + '</span></button>';
    }).join("") + '</div>';
  }

  function sysBtn(label, desc, attr, val) {
    return '<button type="button" class="fb-cmd" ' + attr + '="' + esc(val) + '"><b>' + esc(label) + '</b><span>' + esc(desc) + '</span></button>';
  }
  function helpHtml() {
    var h = cmds.length ? "📋 <b>คำสั่งทั้งหมด</b> (แตะเพื่อใช้ได้เลย)" + cmdButtons(cmds) : "ยังไม่มีคำสั่งที่เพิ่มไว้ กดปุ่ม ⚙️ ด้านบนเพื่อเพิ่มได้นะ";
    return h + "<br>🔧 <b>คำสั่งระบบ</b>" + '<div class="fb-cmdlist">' +
      sysBtn("/help", "แสดงคำสั่งทั้งหมด (พิมพ์ help ไม่ใส่ / ก็ได้)", "data-cmd", "help") +
      sysBtn("/drive ชื่อไฟล์", "ค้นหาไฟล์ในโฟลเดอร์ Google Drive (แตะแล้วพิมพ์ชื่อไฟล์ต่อ)", "data-fill", "/drive ") +
      sysBtn("/ขอไฟล์ ชื่อไฟล์", "เหมือน /drive — ค้นหาไฟล์ใน Drive", "data-fill", "/ขอไฟล์ ") +
      sysBtn("/ขอไฟล์ รูปภาพ", "แสดงรูปทั้งหมดใน Drive (หาจากนามสกุลไฟล์ ไม่ใช้ชื่อ) · แก้ชื่อรูปในแชทได้ · พิมพ์ /ขอไฟล์ .png เพื่อเลือกนามสกุล", "data-cmd", "ขอไฟล์ รูปภาพ") +
    '</div>';
  }

  function driveBtn(title, sub) {
    return '<div class="fb-cmdlist"><button type="button" class="fb-cmd" data-opendrive><b>☁️ ' + esc(title) + '</b><span>' + esc(sub) + '</span></button></div>';
  }

  /* ---------- อัปโหลดไฟล์ → Google Drive ---------- */
  function readB64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(",")[1] || ""); };
      r.onerror = function () { rej(r.error || new Error("read")); };
      r.readAsDataURL(file);
    });
  }
  function safeDriveUrl(u) { return /^https:\/\/(drive|docs)\.google\.com\//.test(String(u || "")) ? u : ""; }

  function uploadOne(file) {
    var row = addBot("⏳ กำลังอัปโหลด <b>" + esc(file.name) + "</b> (" + fmtSize(file.size) + ")…");
    var bub = row.querySelector(".fb-bub");
    function fail(msg, setupBtn) {
      bub.innerHTML = "❌ <b>" + esc(file.name) + "</b> ยังไม่สำเร็จ<br>" + msg + (setupBtn ? driveBtn("เปิดตั้งค่า Drive", "ตรวจลิงก์/รหัสอีกครั้ง") : "");
      setPose(5); scrollEnd();
    }
    if (file.size > MAX_MB * 1048576) { fail("ไฟล์ใหญ่เกิน " + MAX_MB + " MB (ไฟล์นี้ " + fmtSize(file.size) + ") ลองบีบอัดหรือแบ่งไฟล์ก่อนนะ", false); return Promise.resolve(false); }
    var fid = parseFolder(drive.folder);
    return readB64(file).then(function (b64) {
      return fetch(drive.url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },   // text/plain = ไม่ต้อง preflight (Apps Script ไม่รองรับ OPTIONS)
        body: JSON.stringify({ key: drive.key, folderId: fid || "", name: file.name, type: file.type || "application/octet-stream", data: b64 })
      });
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "unknown");
      var f = safeDriveUrl(j.url), fo = safeDriveUrl(j.folder);
      bub.innerHTML = "✅ เก็บ <b>" + esc(file.name) + "</b> ลง Google Drive แล้ว<br>" +
        (f ? '<a href="' + esc(f) + '" target="_blank" rel="noopener">เปิดไฟล์</a>' : "") +
        (f && fo ? " · " : "") + (fo ? '<a href="' + esc(fo) + '" target="_blank" rel="noopener">เปิดโฟลเดอร์</a>' : "");
      setPose(3); scrollEnd();
      return true;
    }).catch(function (err) {
      var m = String(err && err.message || err);
      if (/bad key/i.test(m)) fail("รหัสในแชทไม่ตรงกับโค้ดใน Apps Script — คัดลอกโค้ดใหม่ไปวางทับ แล้ว Deploy เป็นเวอร์ชันใหม่", true);
      else if (/Failed to fetch|NetworkError|Load failed|unknown|JSON|Unexpected/i.test(m)) fail("ติดต่อ Drive ไม่ได้ — เช็กว่า Deploy เป็น Web app, “Who has access” = Anyone และลิงก์ลงท้าย /exec", true);
      else fail("Drive ตอบกลับว่า: " + esc(m), true);
      return false;
    });
  }

  /* ค้นหาไฟล์ในโฟลเดอร์ Drive (ใช้ Apps Script ตัวเดียวกับที่อัปโหลด) — คืน Promise ของ {html, pose} เสมอ ไม่ reject */
  function searchDrive(q) {
    if (!drive.url) return Promise.resolve({ html: "ยังไม่ได้เชื่อม Google Drive เลยค้นหาไฟล์ให้ไม่ได้ 😅" + driveBtn("ตั้งค่า Google Drive", "มีขั้นตอนสั้น ๆ พาทำให้"), pose: 5 });
    var u = drive.url, fid = parseFolder(drive.folder) || "";
    return fetch(u + (u.indexOf("?") >= 0 ? "&" : "?") + "key=" + encodeURIComponent(drive.key) + "&folderId=" + encodeURIComponent(fid) + "&q=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || "unknown");
        if (!Array.isArray(j.files)) return { html: "โค้ด Apps Script ของ Drive ยังเป็นเวอร์ชันเก่า ค้นหาไฟล์ไม่ได้ 😅<br>คัดลอกโค้ดใหม่ไปวางทับ แล้ว Deploy เป็นเวอร์ชันใหม่นะ" + driveBtn("เปิดตั้งค่า Drive", "คัดลอกโค้ดใหม่ได้ที่นี่"), pose: 5 };
        var files = j.files.filter(function (f) { return safeDriveUrl(f.url); });
        if (!files.length) return { html: "หา <b>" + esc(q) + "</b> ไม่เจอในโฟลเดอร์ Drive เลย 🥲<br>ลองพิมพ์คำสั้น ๆ หรือส่วนหนึ่งของชื่อไฟล์ดูนะ", pose: 5 };
        var list = files.map(function (f) {
          var info = [f.size != null ? fmtSize(Number(f.size) || 0) : "", f.date || ""].filter(Boolean).join(" · ");
          return '<a class="fb-cmd" href="' + esc(f.url) + '" target="_blank" rel="noopener"><b>📄 ' + esc(f.name) + '</b><span>' + esc(info) + '</span></a>';
        }).join("");
        return { html: "🔎 เจอ " + files.length + " ไฟล์ สำหรับ <b>" + esc(q) + "</b>" + (files.length >= 10 ? " (แสดง 10 ไฟล์แรก — พิมพ์ชื่อให้เจาะจงขึ้นได้)" : "") + '<div class="fb-cmdlist">' + list + '</div>', pose: 3 };
      })
      .catch(function (err) {
        var m = String(err && err.message || err);
        if (/bad key/i.test(m)) return { html: "รหัสในแชทไม่ตรงกับโค้ดใน Apps Script ของ Drive ❌" + driveBtn("เปิดตั้งค่า Drive", "ตรวจรหัสอีกครั้ง"), pose: 5 };
        if (/Failed to fetch|NetworkError|Load failed|unknown|JSON|Unexpected/i.test(m)) return { html: "ติดต่อ Drive ไม่ได้ ❌ เช็กว่า Deploy เป็น Web app, Who has access = Anyone และลิงก์ลงท้าย /exec" + driveBtn("เปิดตั้งค่า Drive", "ตรวจลิงก์/รหัสอีกครั้ง"), pose: 5 };
        return { html: "Drive ตอบกลับว่า: " + esc(m), pose: 5 };
      });
  }

  /* ---------- แกลเลอรีรูปภาพใน Drive (หาจากนามสกุลไฟล์) + แก้ชื่อในแชท ---------- */
  function extOfName(n) { var m = String(n).match(/\.([A-Za-z0-9]+)$/); return m ? m[1] : ""; }
  function driveErr(err) {
    var m = String(err && err.message || err);
    if (/bad key/i.test(m)) return "รหัสในแชทไม่ตรงกับโค้ดใน Apps Script ของ Drive ❌";
    if (/Failed to fetch|NetworkError|Load failed|unknown|JSON|Unexpected/i.test(m)) return "ติดต่อ Drive ไม่ได้ ❌ เช็กว่า Deploy เป็น Web app, Who has access = Anyone และลิงก์ลงท้าย /exec";
    return "Drive ตอบกลับว่า: " + esc(m);
  }
  var OLD_SCRIPT_MSG = "โค้ด Apps Script ของ Drive ยังเป็นเวอร์ชันเก่า (ยังไม่รองรับดูรูป/แก้ชื่อ) 😅<br>คัดลอกโค้ดใหม่ไปวางทับ แล้ว Deploy เป็นเวอร์ชันใหม่นะ";
  function fetchImages(ext, offset) {
    var u = drive.url, fid = parseFolder(drive.folder) || "";
    return fetch(u + (u.indexOf("?") >= 0 ? "&" : "?") + "key=" + encodeURIComponent(drive.key) + "&folderId=" + encodeURIComponent(fid) +
        "&kind=images&ext=" + encodeURIComponent(ext || "") + "&offset=" + (offset || 0) + "&limit=" + IMG_PAGE)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || "unknown");
        if (!Array.isArray(j.files)) { var o = new Error("old"); o.old = true; throw o; }
        return { files: j.files.filter(function (f) { return safeDriveUrl(f.url) && f.id; }), total: Number(j.total) || j.files.length };
      });
  }
  function imgCard(f) {
    var ext = extOfName(f.name);
    var th = /^data:image\//.test(String(f.thumb || "")) ? '<img src="' + esc(f.thumb) + '" alt="" loading="lazy">' : "<span>🖼️</span>";
    return '<div class="fb-ic" data-id="' + esc(f.id) + '" data-ext="' + esc(ext) + '" data-url="' + esc(f.url) + '">' +
      '<a class="fb-ithumb" href="' + esc(f.url) + '" target="_blank" rel="noopener" title="เปิดไฟล์">' + th + '</a>' +
      imgNameRow(f.name) + '</div>';
  }
  function imgNameRow(name) {
    return '<div class="fb-iname"><span class="fb-itxt">' + esc(name) + '</span>' +
      '<button type="button" class="fb-iedit" data-imgedit aria-label="แก้ชื่อภาพ" title="แก้ชื่อภาพ">✏️</button></div>';
  }
  function imgMoreBtn(ext, offset, left) {
    return '<button type="button" class="fb-cmd fb-imore" data-imgmore data-ext="' + esc(ext) + '" data-offset="' + offset + '"><b>⬇ โหลดเพิ่ม</b><span>เหลืออีก ' + left + ' รูป</span></button>';
  }
  /* คืน Promise ของ {html, pose, wide} เสมอ ไม่ reject */
  function loadImages(ext) {
    if (!drive.url) return Promise.resolve({ html: "ยังไม่ได้เชื่อม Google Drive เลยหารูปให้ไม่ได้ 😅" + driveBtn("ตั้งค่า Google Drive", "มีขั้นตอนสั้น ๆ พาทำให้"), pose: 5 });
    return fetchImages(ext, 0).then(function (r) {
      var label = ext ? "นามสกุล <b>." + esc(ext) + "</b>" : "ที่เป็นรูปภาพ";
      if (!r.files.length) return { html: "ไม่เจอไฟล์" + label + "ในโฟลเดอร์ Drive เลย 🥲" + (ext ? "<br>ลองพิมพ์ <b>/ขอไฟล์ รูปภาพ</b> เพื่อดูทุกนามสกุลดูนะ" : ""), pose: 5 };
      var left = r.total - r.files.length;
      return {
        html: "🖼️ เจอไฟล์" + label + " <b>" + r.total + "</b> รูป" +
          '<div class="fb-igrid">' + r.files.map(imgCard).join("") + '</div>' +
          (left > 0 ? imgMoreBtn(ext, r.files.length, left) : "") +
          '<div class="fb-ihint">แตะรูปเพื่อเปิดไฟล์ · แตะ ✏️ ใต้รูปเพื่อแก้ชื่อ</div>',
        pose: 3, wide: true
      };
    }).catch(function (err) {
      if (err && err.old) return { html: OLD_SCRIPT_MSG + driveBtn("เปิดตั้งค่า Drive", "คัดลอกโค้ดใหม่ได้ที่นี่"), pose: 5 };
      return { html: driveErr(err) + driveBtn("เปิดตั้งค่า Drive", "ตรวจลิงก์/รหัสอีกครั้ง"), pose: 5 };
    });
  }
  function loadMoreImages(btn) {
    var grid = btn.parentNode.querySelector(".fb-igrid");
    var ext = btn.getAttribute("data-ext") || "", off = Number(btn.getAttribute("data-offset")) || 0;
    if (btn.disabled || !grid) return;
    btn.disabled = true; btn.querySelector("b").textContent = "⏳ กำลังโหลด…";
    fetchImages(ext, off).then(function (r) {
      grid.insertAdjacentHTML("beforeend", r.files.map(imgCard).join(""));
      var next = off + r.files.length, left = r.total - next;
      if (left > 0 && r.files.length) { btn.setAttribute("data-offset", next); btn.disabled = false; btn.querySelector("b").textContent = "⬇ โหลดเพิ่ม"; btn.querySelector("span").textContent = "เหลืออีก " + left + " รูป"; }
      else btn.remove();
      scrollEnd();
    }).catch(function (err) {
      btn.disabled = false; btn.querySelector("b").textContent = "⬇ โหลดเพิ่ม";
      btn.querySelector("span").innerHTML = err && err.old ? "โค้ด Apps Script ยังเป็นเวอร์ชันเก่า" : driveErr(err);
    });
  }
  /* แก้ชื่อภาพ: แก้เฉพาะชื่อ (นามสกุลล็อกไว้) แล้วส่งไปให้ Apps Script ของ Drive เปลี่ยนชื่อจริง */
  function startRename(card) {
    var nameEl = card.querySelector(".fb-itxt"); if (!nameEl || card.querySelector(".fb-ied")) return;
    var ext = card.getAttribute("data-ext") || "", full = nameEl.textContent;
    var base = ext && full.toLowerCase().slice(-(ext.length + 1)) === "." + ext.toLowerCase() ? full.slice(0, -(ext.length + 1)) : full;
    card.querySelector(".fb-iname").style.display = "none";
    var ed = document.createElement("div");
    ed.className = "fb-ied";
    ed.innerHTML = '<div class="fb-irow"><input type="text" class="fb-iinput" value="' + esc(base) + '" autocomplete="off" spellcheck="false" aria-label="ชื่อภาพใหม่">' +
      (ext ? '<span class="fb-iext">.' + esc(ext) + '</span>' : "") + '</div>' +
      '<div class="fb-irow"><button type="button" class="fb-iok" data-imgsave>✓ บันทึก</button><button type="button" class="fb-ino" data-imgcancel>ยกเลิก</button></div>' +
      '<div class="fb-ierr"></div>';
    card.appendChild(ed);
    var inp = ed.querySelector("input"); inp.focus(); inp.select();
  }
  function endRename(card) {
    var ed = card.querySelector(".fb-ied"); if (ed) ed.remove();
    card.querySelector(".fb-iname").style.display = "";
  }
  function saveRename(card) {
    var ed = card.querySelector(".fb-ied"); if (!ed || ed.dataset.busy) return;
    var inp = ed.querySelector("input"), err = ed.querySelector(".fb-ierr"), ext = card.getAttribute("data-ext") || "";
    var nm = inp.value.replace(/[\\\/:*?"<>|]+/g, " ").trim();
    if (ext && nm.toLowerCase().slice(-(ext.length + 1)) === "." + ext.toLowerCase()) nm = nm.slice(0, -(ext.length + 1)).trim();
    if (!nm) { err.textContent = "ใส่ชื่อก่อนนะ"; return; }
    var full = nm + (ext ? "." + ext : "");
    if (full === card.querySelector(".fb-itxt").textContent) { endRename(card); return; }
    ed.dataset.busy = "1"; err.textContent = "⏳ กำลังเปลี่ยนชื่อ…";
    ed.querySelectorAll("button,input").forEach(function (x) { x.disabled = true; });
    fetch(drive.url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ key: drive.key, action: "rename", id: card.getAttribute("data-id"), name: full }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || "unknown");
        card.querySelector(".fb-itxt").textContent = j.name || full;
        endRename(card); setPose(3); backToIdle(3000);
      })
      .catch(function (e) {
        delete ed.dataset.busy;
        ed.querySelectorAll("button,input").forEach(function (x) { x.disabled = false; });
        var m = String(e && e.message || e);
        err.innerHTML = (/bad key|Failed to fetch|NetworkError|Load failed|JSON|Unexpected/i.test(m) ? driveErr(e) : esc(m) + " — ถ้ายังไม่ได้อัปเดตโค้ด Apps Script ให้คัดลอกโค้ดใหม่ใน ⚙️ → ☁️ Drive แล้ว Deploy ใหม่");
      });
  }

  function handleFiles(list) {
    var files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    if (!isOpen) open();
    addUser("📎 " + files.map(function (f) { return f.name; }).join(", "));
    if (!drive.url) {
      addBot("ยังไม่ได้เชื่อม Google Drive เลยเก็บไฟล์ให้ไม่ได้ 😅<br>ตั้งค่าครั้งเดียว แล้วโยนไฟล์มาซ้ำได้เลยนะ" + driveBtn("ตั้งค่า Google Drive", "มีขั้นตอนสั้น ๆ พาทำให้"));
      setPose(5); return;
    }
    setPose(6);
    files.reduce(function (p, f) { return p.then(function () { return uploadOne(f); }); }, Promise.resolve())
      .then(function () { backToIdle(4000); });
  }

  /* ---------- ตอบคำสั่ง ---------- */
  function reply(raw) {
    var t0 = String(raw).trim();
    if (t0 === "/") return { html: helpHtml(), pose: 4 };
    var n = norm(raw);
    if (!n) return null;
    if (HELP_WORDS.indexOf(n) >= 0) return { html: helpHtml(), pose: 4 };
    var sm = t0.match(/^\/*\s*(\S+)\s+([\s\S]+)$/);          // /ขอไฟล์ ชื่อไฟล์  หรือ  /drive ชื่อไฟล์
    if (sm && SEARCH_WORDS.indexOf(norm(sm[1])) >= 0) {
      var q = sm[2].trim(), iq = imageQuery(q);
      if (iq !== null) return { task: function () { return loadImages(iq); }, pose: 6 };   // รูปภาพ/ภาพ/.png → หาจากนามสกุลไฟล์
      return { task: function () { return searchDrive(q); }, pose: 6 };
    }
    if (FILE_WORDS.indexOf(n) >= 0) return { html: "พิมพ์ชื่อไฟล์ต่อท้ายได้เลย เช่น <b>/ขอไฟล์ ใบงาน</b> น้องจะหาในโฟลเดอร์ Drive ให้ 🔎<br>อยากดูรูปทั้งหมด พิมพ์ <b>/ขอไฟล์ รูปภาพ</b> 🖼️", pose: 4 };
    if (DRIVE_WORDS.indexOf(n) >= 0) {
      return drive.url
        ? { html: "☁️ เชื่อม Google Drive แล้ว ลากไฟล์มาวางในแชท หรือกด 📎 ได้เลย<br>🔎 ค้นหาไฟล์: พิมพ์ <b>/drive ชื่อไฟล์</b> หรือ <b>/ขอไฟล์ ชื่อไฟล์</b><br>ตั้งค่าใหม่ได้ที่ปุ่ม ⚙️" + driveBtn("แก้ไขการเชื่อมต่อ", "กดเพื่อเปิดหน้าตั้งค่า Drive"), pose: 3 }
        : { html: "ยังไม่ได้เชื่อม Google Drive นะ ใช้เวลาไม่ถึง 2 นาที ทำครั้งเดียว 👇" + driveBtn("ตั้งค่า Google Drive", "มีขั้นตอนสั้น ๆ พาทำให้"), pose: 4 };
    }
    for (var i = 0; i < cmds.length; i++) {
      if (nameList(cmds[i].k).indexOf(n) >= 0) {
        return { html: linkify(cmds[i].t), pose: i % 2 ? 7 : 3, lock: !!cmds[i].lock, copy: cmds[i].t };
      }
    }
    var sim = cmds.filter(function (c) {
      return nameList(c.k).some(function (k) { return k.indexOf(n) >= 0 || n.indexOf(k) >= 0; }) || (c.d || "").toLowerCase().indexOf(raw.trim().toLowerCase()) >= 0;
    });
    if (sim.length) return { html: "น้องไม่แน่ใจว่าหมายถึงอันไหน ลองอันนี้ไหม?" + cmdButtons(sim), pose: 5 };
    return { html: "อื้ม… น้อง Fixboy ยังไม่รู้จักคำสั่งนี้ 😅<br>พิมพ์ <b>/help</b> เพื่อดูคำสั่งทั้งหมดนะ", pose: 5 };
  }

  function send(text) {
    text = (text == null ? elInput.value : text);
    if (!String(text).trim() || busy) return;
    elInput.value = "";
    addUser(String(text).trim());
    var r = reply(text);
    if (!r) return;
    busy = true;
    clearTimeout(idleTimer);
    var t = addTyping();
    startTyping();
    var wait = new Promise(function (res) { setTimeout(res, reduce ? 150 : rnd(650, 1000)); });
    Promise.all([r.task ? r.task() : Promise.resolve(r), wait]).then(function (a) {
      var x = a[0];
      stopTyping();
      t.remove();
      addBot(x.html, { lock: x.lock, copy: x.copy, wide: x.wide });
      setPose(x.pose);
      backToIdle(4200);
      busy = false;
      if (!reduce) elStage.classList.add("fb-jump");
      setTimeout(function () { elStage.classList.remove("fb-jump"); }, 700);
    });
  }

  /* ---------- ชิปคำสั่งด้านล่าง ---------- */
  function renderChips() { /* ไม่แสดงปุ่มแนะนำคำสั่งใต้แชทแล้ว — ดูคำสั่งทั้งหมดที่ /help */ }

  /* ---------- เปิด/ปิด ---------- */
  function setFull(on) {
    full = !!on;
    document.body.classList.toggle("fb-full", full);
    elFull.textContent = full ? "⤡" : "⤢";
    elFull.setAttribute("aria-label", full ? "ย่อแชท" : "ขยายแชทเต็มจอ");
    elFull.title = full ? "ย่อกลับ" : "ขยายเต็มจอ";
    setTimeout(scrollEnd, 80);
  }

  function open() {
    if (isOpen) return;
    setFull(false);
    isOpen = true;
    document.body.classList.add("fb-open");
    elPanel.setAttribute("aria-hidden", "false");
    setPose(2);
    backToIdle(3200);
    if (sheetUrl() && Date.now() - lastPull > 60000) pullCmds();   // แก้ใน Config แล้วเปิดแชทใหม่ เห็นของล่าสุดเลย
    if (!greeted) {
      greeted = true;
      renderChips();
      setTimeout(function () {
        addBot("สวัสดีครับ! น้อง <b>Fixboy</b> มาแล้ว 🔧✨<br>พิมพ์ <b>/help</b> เพื่อดูคำสั่งทั้งหมด<br>มีรูปหรือไฟล์ให้เก็บไหม? กด 🖼️ (รูปจากคลัง) หรือ 📎 (ไฟล์) หรือลากมาวางได้ · หาไฟล์ใน Drive พิมพ์ <b>/drive ชื่อไฟล์</b> (ต้องเชื่อม ☁️ Drive ก่อน)");
      }, reduce ? 0 : 250);
    }
    if (window.matchMedia && matchMedia("(pointer:fine)").matches) setTimeout(function () { elInput.focus(); }, 300);
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    document.body.classList.remove("fb-open");
    elPanel.setAttribute("aria-hidden", "true");
    closeSettings();
    stopTyping(); clearTimeout(idleTimer);
  }

  /* ---------- ตั้งค่าคำสั่ง ---------- */
  function openSettings(mode) { editing = (mode === -3 || mode === -4) ? mode : -2; renderSettings(); elSet.hidden = false; }
  function closeSettings() { elSet.hidden = true; editing = -2; }

  function renderDriveForm() {
    var key = drive.key || genKey();
    elSet.innerHTML =
      '<div class="fb-shead"><b>☁️ เชื่อม Google Drive</b><button type="button" class="fb-ico" data-cancel aria-label="กลับ">✕</button></div>' +
      '<div class="fb-sform">' +
        '<div class="fb-steps"><b>ทำครั้งเดียว ไม่ถึง 2 นาที</b><ol>' +
          '<li>กด <b>คัดลอกโค้ด</b> → กด <b>เปิด Apps Script</b> → วางทับโค้ดเดิมทั้งหมด → กด 💾 บันทึก (เคยตั้งไว้แล้ว? ต้องวางโค้ดใหม่ทับ + Deploy เวอร์ชันใหม่ จึงจะใช้ /drive ค้นหาไฟล์ และ /ขอไฟล์ รูปภาพ (ดู/แก้ชื่อรูป) ได้)</li>' +
          '<li><b>ขออนุมัติ:</b> กด ▶ Run 1 ครั้ง → Review permissions → เลือกบัญชี → Advanced → Go to … → Allow</li>' +
          '<li>กด <b>Deploy → New deployment → ⚙ Web app</b> ตั้ง Execute as = <b>Me</b>, Who has access = <b>Anyone</b> → Deploy</li>' +
          '<li>คัดลอก <b>Web app URL</b> (ลงท้าย /exec) มาวางช่องล่างนี้ แล้วกด <b>ทดสอบ</b></li>' +
        '</ol></div>' +
        '<div class="fb-btnrow"><button type="button" class="fb-btn" data-copycode>📋 คัดลอกโค้ด</button>' +
        '<a class="fb-btn pri" href="https://script.google.com/create" target="_blank" rel="noopener">เปิด Apps Script ↗</a></div>' +
        '<label>ลิงก์ Web app (ลงท้าย /exec)<input type="text" id="fbDUrl" value="' + esc(drive.url) + '" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false"></label>' +
        '<label>ลิงก์โฟลเดอร์ Drive (ไม่ใส่ก็ได้ — ถ้าไม่ใส่จะสร้างโฟลเดอร์ “Fixboy Uploads” ให้เอง)<input type="text" id="fbDFolder" value="' + esc(drive.folder || "") + '" placeholder="https://drive.google.com/drive/folders/…" autocomplete="off" spellcheck="false"></label>' +
        '<label>รหัสกันคนอื่นแอบอัปโหลด (สร้างให้แล้ว และอยู่ในโค้ดที่คัดลอกไป)<input type="text" id="fbDKey" value="' + esc(key) + '" autocomplete="off" spellcheck="false"></label>' +
        '<div class="fb-serr" id="fbDErr"></div>' +
        (drive.url ? '<button type="button" class="fb-btn fb-danger" data-ddisc>ยกเลิกการเชื่อมต่อ</button>' : '') +
      '</div>' +
      '<div class="fb-sfoot"><button type="button" class="fb-btn pri" data-dsave>บันทึก</button><button type="button" class="fb-btn" data-dtest>ทดสอบ</button></div>';
  }
  function readDriveForm(err) {
    var url = $("#fbDUrl").value.trim(), fol = $("#fbDFolder").value.trim(), key = $("#fbDKey").value.trim();
    err.className = "fb-serr";
    if (!url) { err.textContent = "วางลิงก์ Web app ก่อนนะ"; return null; }
    if (!isExecUrl(url)) { err.textContent = "ลิงก์ต้องขึ้นต้น https://script.google.com/ และลงท้าย /exec (อย่าใช้ลิงก์ที่ลงท้าย /dev)"; return null; }
    if (parseFolder(fol) === null) { err.textContent = "อ่านลิงก์โฟลเดอร์ไม่ออก — ใช้ลิงก์ที่มี /folders/… หรือเว้นว่างไว้"; return null; }
    if (!key) { err.textContent = "ใส่รหัสด้วยนะ (ใช้ที่สร้างให้ก็ได้)"; return null; }
    return { url: url, folder: fol, key: key };
  }
  function testDrive() {
    var err = $("#fbDErr"), d = readDriveForm(err);
    if (!d) return;
    err.textContent = "⏳ กำลังทดสอบ…";
    fetch(d.url + (d.url.indexOf("?") >= 0 ? "&" : "?") + "key=" + encodeURIComponent(d.key))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok) { err.className = "fb-serr ok"; err.textContent = "✅ เชื่อมต่อได้แล้ว! กด “บันทึก” ได้เลย"; }
        else if (j && /bad key/i.test(j.error || "")) err.textContent = "ติดต่อได้ แต่รหัสไม่ตรงกับโค้ดใน Apps Script — คัดลอกโค้ดใหม่ไปวางทับแล้ว Deploy เวอร์ชันใหม่";
        else err.textContent = "Drive ตอบกลับว่า: " + ((j && j.error) || "ไม่ทราบสาเหตุ") + " (ลองกด ▶ Run เพื่ออนุมัติสิทธิ์อีกครั้ง)";
      })
      .catch(function () { err.textContent = "ติดต่อไม่ได้ — เช็กว่า Deploy เป็น Web app, Who has access = Anyone และลิงก์ลงท้าย /exec"; });
  }

  function renderSheetForm() {
    var cur = sheetCfg.url || sheetUrl();
    elSet.innerHTML =
      '<div class="fb-shead"><b>📄 เชื่อมชีท Config</b><button type="button" class="fb-ico" data-cancel aria-label="กลับ">✕</button></div>' +
      '<div class="fb-sform">' +
        '<div class="fb-steps"><b>คำสั่งของน้องเก็บในชีท Config</b><ol>' +
          '<li>แถวคำสั่ง: <b>ID</b> = S1, S2, … · <b>รหัสวิชา</b> = ชื่อคำสั่ง (เช่น wifiดล) · <b>รายวิชา</b> = ข้อความที่น้องตอบ</li>' +
          '<li>คอลัมน์เสริม (ไม่บังคับ): <b>คำอธิบาย</b> = ข้อความใน /help · <b>ซ่อน</b> = พิมพ์ “ซ่อน” เพื่อปิดคำตอบไว้ก่อน</li>' +
          '<li>แถววิชาเดิม (M1, M2, …) ไม่ถูกแตะ — Deploy Apps Script เป็นเวอร์ชันใหม่ แล้ววางลิงก์ Web app ของ KruChauy (ลงท้าย /exec) ด้านล่าง</li>' +
        '</ol></div>' +
        '<label>ลิงก์ Web app ของชีท KruChauy (ลงท้าย /exec)<input type="text" id="fbSUrl" value="' + esc(cur) + '" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false"></label>' +
        '<div class="fb-serr" id="fbSErr"></div>' +
      '</div>' +
      '<div class="fb-sfoot"><button type="button" class="fb-btn pri" data-shsave>บันทึก</button><button type="button" class="fb-btn" data-shtest>ทดสอบ</button></div>';
  }
  function readSheetForm(err) {
    var url = $("#fbSUrl").value.trim();
    err.className = "fb-serr";
    if (!isExecUrl(url)) { err.textContent = "ลิงก์ต้องขึ้นต้น https://script.google.com/ และลงท้าย /exec"; return null; }
    return url;
  }
  function testSheet() {
    var err = $("#fbSErr"), url = readSheetForm(err);
    if (!url) return;
    err.textContent = "⏳ กำลังทดสอบ…";
    fetch(url + (url.indexOf("?") >= 0 ? "&" : "?") + "type=fixboy").then(function (r) { return r.json(); }).then(function (j) {
      if (Array.isArray(j)) { err.className = "fb-serr ok"; err.textContent = "✅ เชื่อมได้แล้ว · พบ " + j.length + " คำสั่งในชีท Config · กด “บันทึก” ได้เลย"; }
      else err.textContent = "ชีทตอบกลับว่า: " + ((j && j.message) || "ไม่ทราบสาเหตุ") + " (ถ้าเป็น “ไม่พบประเภทข้อมูล” = ยังไม่ได้ Deploy เวอร์ชันใหม่)";
    }).catch(function () { err.textContent = "ติดต่อไม่ได้ — เช็กลิงก์ /exec และ Who has access = Anyone"; });
  }

  function renderSettings() {
    if (editing === -4) { renderSheetForm(); return; }
    if (editing === -3) { renderDriveForm(); return; }
    if (editing === -2) {
      var driveRow = '<div class="fb-srow fb-drow"><div class="fb-sinfo"><b>☁️ Google Drive</b><small>' +
        (drive.url ? "✅ เชื่อมต่อแล้ว · ลากไฟล์มาวางในแชทได้" : "ยังไม่เชื่อมต่อ — แตะ ✏️ เพื่อตั้งค่า") + '</small></div>' +
        '<button type="button" class="fb-ico sm" data-drive aria-label="ตั้งค่า Google Drive">✏️</button></div>';
      var rows = cmds.map(function (c, i) {
        return '<div class="fb-srow"><div class="fb-sinfo"><b>' + esc(nameSlash(c)) + (c.lock ? ' 🔒' : '') + '</b><small>' + esc(c.d || "") + '</small></div>' +
          '<button type="button" class="fb-ico sm" data-edit="' + i + '" aria-label="แก้ไข">✏️</button>' +
          '<button type="button" class="fb-ico sm" data-del="' + i + '" aria-label="ลบ">🗑</button></div>';
      }).join("") || '<div class="fb-sempty">ยังไม่มีคำสั่ง กด “เพิ่มคำสั่ง” ได้เลย</div>';
      var sOn = !!sheetUrl();
      var sheetRow = '<div class="fb-srow fb-drow"><div class="fb-sinfo"><b>📄 ชีท Config</b><small>' +
        (sOn ? "✅ เชื่อมแล้ว · คำสั่งอ่าน/เขียนที่ชีท Config" : "⚠️ ยังไม่เชื่อม — เพิ่ม/ลบจะไม่ลงชีท · แตะ ✏️ เพื่อวางลิงก์ Web app") + '</small></div>' +
        '<button type="button" class="fb-ico sm" data-shedit aria-label="ตั้งค่าชีท Config">✏️</button></div>' +
        (sheetMsg ? '<div class="fb-serr' + (sheetMsg.ok ? ' ok' : '') + '">' + esc(sheetMsg.text) + '</div>' : '');
      rows = sheetRow + driveRow + rows;
      elSet.innerHTML =
        '<div class="fb-shead"><b>⚙️ ตั้งค่า</b><button type="button" class="fb-ico" data-sdone aria-label="กลับ">✕</button></div>' +
        '<div class="fb-slist">' + rows + '</div>' +
        (sOn ? '<div class="fb-sfoot" style="padding-bottom:0"><button type="button" class="fb-btn" data-shload>🔄 โหลดจากชีท</button><button type="button" class="fb-btn" data-shpush>⬆ ส่งขึ้นชีท</button></div>' : '') +
        '<div class="fb-sfoot"' + (sOn ? ' style="border-top:0;padding-top:8px"' : '') + '><button type="button" class="fb-btn pri" data-add>＋ เพิ่มคำสั่ง</button>' +
        (sOn ? '' : '<button type="button" class="fb-btn" data-reset>↺ ค่าเริ่มต้น</button>') + '</div>';
    } else {
      var c = editing >= 0 ? cmds[editing] : { k: "", d: "", t: "", lock: false };
      elSet.innerHTML =
        '<div class="fb-shead"><b>' + (editing >= 0 ? "แก้ไขคำสั่ง" : "เพิ่มคำสั่งใหม่") + '</b><button type="button" class="fb-ico" data-cancel aria-label="ยกเลิก">✕</button></div>' +
        '<div class="fb-sform">' +
          '<label>ชื่อคำสั่ง — ใส่ได้หลายชื่อ คั่นด้วย , (เช่น a, b, c แล้วพิมพ์ /a /b หรือ /c ก็ตอบข้อความเดียวกัน)<input id="fbK" maxlength="80" value="' + esc(c.k) + '" placeholder="เช่น ตาราง, table"></label>' +
          '<label>คำอธิบายสั้น (โชว์ใน /help)<input id="fbD" maxlength="60" value="' + esc(c.d || "") + '" placeholder="เช่น ตารางสอนสัปดาห์นี้"></label>' +
          '<label>ข้อความที่ตอบกลับ (ใส่ลิงก์ได้)<textarea id="fbT" rows="6" placeholder="พิมพ์ข้อความที่ต้องการให้น้องตอบ">' + esc(c.t) + '</textarea></label>' +
          '<label class="fb-check"><input type="checkbox" id="fbL"' + (c.lock ? " checked" : "") + '> 🔒 ซ่อนคำตอบไว้ก่อน แตะเพื่อดู (สำหรับรหัส/เลขบัญชี)</label>' +
          '<div class="fb-serr" id="fbErr"></div>' +
        '</div>' +
        '<div class="fb-sfoot"><button type="button" class="fb-btn pri" data-save>บันทึก</button><button type="button" class="fb-btn" data-cancel>ยกเลิก</button></div>';
    }
  }

  function saveForm() {
    var k = uniqNames($("#fbK").value).join(", "), d = $("#fbD").value.trim(),
        t = $("#fbT").value.replace(/\s+$/, ""), l = $("#fbL").checked, err = $("#fbErr");
    if (!k) { err.textContent = "ใส่ชื่อคำสั่งก่อนนะ"; return; }
    var mine = nameList(k);
    if (mine.some(function (x) { return HELP_WORDS.indexOf(x) >= 0 || SEARCH_WORDS.indexOf(x) >= 0; })) { err.textContent = "มีชื่อที่เป็นคำสั่งของระบบ (help / drive / ขอไฟล์) ใช้ไม่ได้"; return; }
    if (!t) { err.textContent = "ใส่ข้อความที่ให้น้องตอบด้วยนะ"; return; }
    var dup = cmds.some(function (c, i) { return i !== editing && nameList(c.k).some(function (x) { return mine.indexOf(x) >= 0; }); });
    if (dup) { err.textContent = "มีคำสั่งชื่อซ้ำกับคำสั่งอื่นอยู่แล้ว"; return; }
    var old = editing >= 0 ? cmds[editing] : null;
    var obj = { id: old ? (old.id || "") : "", k: k, d: d, t: t, lock: l };
    function applyLocal() {
      var ix = old ? cmds.indexOf(old) : -1;
      if (ix >= 0) cmds[ix] = obj; else cmds.push(obj);
      save(); renderChips(); editing = -2; renderSettings();
    }
    if (!sheetUrl()) {   // ยังไม่เชื่อมชีท → เก็บในเครื่องนี้อย่างเดียว (เตือนให้เห็นชัด)
      applyLocal();
      sheetMsg = { ok: false, text: "⚠️ ยังไม่ได้เชื่อมชีท Config — คำสั่งนี้บันทึกในเครื่องนี้เท่านั้น ไม่ได้ลงชีท (แตะ ✏️ ที่ 📄 ชีท Config เพื่อเชื่อม)" };
      renderSettings();
      return;
    }
    err.className = "fb-serr"; err.textContent = "⏳ กำลังบันทึกลงชีท Config…";   // เขียนชีทก่อน สำเร็จแล้วค่อยอัปเดตในแชท
    sheetPost({ type: "saveFixboyCmd", id: obj.id, oldK: old ? old.k : "", k: obj.k, d: obj.d, t: obj.t, lock: !!obj.lock })
      .then(function (j) {
        if (!j || !j.success) throw new Error(j && j.message || "ไม่ทราบสาเหตุ");
        obj.id = j.id || obj.id;
        applyLocal();
        sheetMsg = { ok: true, text: "✅ " + j.message }; renderSettings();
      })
      .catch(function (e) {
        var er = $("#fbErr");
        if (er) { er.className = "fb-serr"; er.textContent = "ลงชีทไม่สำเร็จ (ยังไม่ได้บันทึก): " + sheetErr(e); }
      });
  }

  /* ---------- events ---------- */
  elSummon.addEventListener("click", open);
  elBack.addEventListener("click", close);
  $("#fbClose").addEventListener("click", close);
  $("#fbGear").addEventListener("click", function () { openSettings(-2); });
  elFull.addEventListener("click", function () { setFull(!full); });
  $("#fbImgBtn").addEventListener("click", function () { elImg.click(); });
  elImg.addEventListener("change", function () { handleFiles(elImg.files); elImg.value = ""; });
  $("#fbAttach").addEventListener("click", function () { elFile.click(); });
  elFile.addEventListener("change", function () { handleFiles(elFile.files); elFile.value = ""; });
  elInput.addEventListener("paste", function (e) {
    var fs = e.clipboardData && e.clipboardData.files;
    if (fs && fs.length) { e.preventDefault(); handleFiles(fs); }
  });
  /* ลากไฟล์มาวางบนแผงแชท */
  function hasFiles(e) { var t = e.dataTransfer && e.dataTransfer.types; return !!t && Array.prototype.indexOf.call(t, "Files") >= 0; }
  elPanel.addEventListener("dragenter", function (e) { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; elPanel.classList.add("dragging"); });
  elPanel.addEventListener("dragover", function (e) { if (hasFiles(e)) e.preventDefault(); });
  elPanel.addEventListener("dragleave", function (e) { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) elPanel.classList.remove("dragging"); });
  elPanel.addEventListener("drop", function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault(); dragDepth = 0; elPanel.classList.remove("dragging");
    handleFiles(e.dataTransfer.files);
  });
  /* กันเบราว์เซอร์เปิดไฟล์ทิ้งทั้งหน้า ถ้าปล่อยพลาดนอกแผง ตอนแชทเปิดอยู่ */
  window.addEventListener("dragover", function (e) { if (isOpen && hasFiles(e)) e.preventDefault(); });
  window.addEventListener("drop", function (e) { if (isOpen && hasFiles(e)) e.preventDefault(); });
  $("#fbSend").addEventListener("click", function () { send(); });
  elInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); send(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) { if (!elSet.hidden) closeSettings(); else if (full) setFull(false); else close(); }
  });

  function onCmdClick(e) {
    var im = e.target.closest("[data-imgmore]");
    if (im) { loadMoreImages(im); return; }
    var ie = e.target.closest("[data-imgedit]");
    if (ie) { startRename(ie.closest(".fb-ic")); return; }
    var is = e.target.closest("[data-imgsave]");
    if (is) { saveRename(is.closest(".fb-ic")); return; }
    var ic = e.target.closest("[data-imgcancel]");
    if (ic) { endRename(ic.closest(".fb-ic")); return; }
    if (e.target.closest("[data-opendrive]")) { openSettings(-3); return; }
    var fl = e.target.closest("[data-fill]");
    if (fl) { elInput.value = fl.getAttribute("data-fill"); elInput.focus(); return; }
    var b = e.target.closest("[data-cmd]");
    if (b) { send("/" + b.getAttribute("data-cmd")); }
  }
  elMsgs.addEventListener("keydown", function (e) {     // ช่องแก้ชื่อภาพ: Enter = บันทึก, Esc = ยกเลิก (ไม่ให้ Esc ปิดแชททั้งอัน)
    var inp = e.target.closest && e.target.closest(".fb-iinput"); if (!inp || e.isComposing) return;
    var card = inp.closest(".fb-ic");
    if (e.key === "Enter") { e.preventDefault(); saveRename(card); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); endRename(card); }
  });
  elMsgs.addEventListener("click", function (e) {
    onCmdClick(e);
    var rv = e.target.closest(".fb-reveal");
    if (rv) {
      var box = rv.closest(".fb-lock"), on = box.classList.toggle("open");
      rv.textContent = on ? "🙈 ซ่อน" : "🔒 แตะเพื่อดู";
      return;
    }
    var cp = e.target.closest(".fb-copy");
    if (cp) {
      var txt = cp.dataset.text || "";
      copyText(txt, function () { cp.textContent = "คัดลอกแล้ว ✓"; setTimeout(function () { cp.textContent = "คัดลอก"; }, 1400); });
    }
  });

  elSet.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest("[data-sdone]")) { closeSettings(); return; }
    if (t.closest("[data-drive]")) { editing = -3; renderSettings(); return; }
    if (t.closest("[data-shedit]")) { editing = -4; renderSettings(); return; }
    if (t.closest("[data-shload]")) { sheetMsg = { ok: true, text: "⏳ กำลังโหลดจากชีท…" }; renderSettings(); pullCmds(); return; }
    if (t.closest("[data-shpush]")) { pushCmds(); return; }
    if (t.closest("[data-shtest]")) { testSheet(); return; }
    if (t.closest("[data-shsave]")) {
      var se = $("#fbSErr"), su = readSheetForm(se);
      if (!su) return;
      sheetCfg = { url: su }; saveSheetCfg(); sheetMsg = null;
      editing = -2; renderSettings(); pullCmds();
      return;
    }
    if (t.closest("[data-copycode]")) {
      var kEl = $("#fbDKey"), btn = t.closest("[data-copycode]");
      copyText(scriptCode(kEl ? kEl.value.trim() : drive.key), function () { btn.textContent = "คัดลอกแล้ว ✓"; setTimeout(function () { btn.textContent = "📋 คัดลอกโค้ด"; }, 1600); });
      return;
    }
    if (t.closest("[data-dtest]")) { testDrive(); return; }
    if (t.closest("[data-dsave]")) {
      var er = $("#fbDErr"), d = readDriveForm(er);
      if (!d) return;
      drive = d; saveDrive();
      addBot("☁️ เชื่อม Google Drive เรียบร้อย! ลากไฟล์มาวางหรือกด 📎 ได้เลย");
      setPose(3); backToIdle(4000);
      editing = -2; renderSettings(); closeSettings();
      return;
    }
    if (t.closest("[data-ddisc]")) {
      if (confirm("ยกเลิกการเชื่อมต่อ Google Drive บนเครื่องนี้? (ไฟล์ที่เก็บไว้ใน Drive ไม่หายนะ)")) { drive = { url: "", key: "", folder: "" }; saveDrive(); editing = -2; renderSettings(); }
      return;
    }
    if (t.closest("[data-add]")) { editing = -1; renderSettings(); return; }
    var ed = t.closest("[data-edit]");
    if (ed) { editing = +ed.getAttribute("data-edit"); renderSettings(); return; }
    var del = t.closest("[data-del]");
    if (del) {
      var i = +del.getAttribute("data-del");
      var gone = cmds[i];
      if (!confirm("ลบคำสั่ง /" + gone.k + " ?" + (sheetUrl() ? "\n(จะลบออกจากชีท Config ด้วย)" : ""))) return;
      function dropLocal() { var ix = cmds.indexOf(gone); if (ix >= 0) cmds.splice(ix, 1); save(); renderChips(); }
      if (!sheetUrl()) {
        dropLocal();
        sheetMsg = { ok: false, text: "⚠️ ยังไม่ได้เชื่อมชีท Config — ลบในเครื่องนี้เท่านั้น ในชีทยังอยู่ (แตะ ✏️ ที่ 📄 ชีท Config เพื่อเชื่อม)" };
        renderSettings();
        return;
      }
      sheetMsg = { ok: true, text: "⏳ กำลังลบออกจากชีท Config…" }; renderSettings();
      sheetPost({ type: "deleteFixboyCmd", id: gone.id || "", k: gone.k })
        .then(function (j) {
          if (!j || !j.success) throw new Error(j && j.message || "ไม่ทราบสาเหตุ");
          dropLocal();
          sheetMsg = { ok: true, text: "🗑 " + j.message }; renderSettings();
        })
        .catch(function (e) { sheetMsg = { ok: false, text: "ลบในชีทไม่สำเร็จ (ยังไม่ได้ลบ): " + sheetErr(e) }; renderSettings(); });
      return;
    }
    if (t.closest("[data-reset]")) {
      if (confirm("คืนคำสั่งทั้งหมดเป็นค่าเริ่มต้น? (คำสั่งที่เพิ่ม/แก้ไว้จะหายไป)")) { cmds = clone(DEFAULTS); save(); renderChips(); renderSettings(); }
      return;
    }
    if (t.closest("[data-save]")) { saveForm(); return; }
    if (t.closest("[data-cancel]")) { editing = -2; renderSettings(); }
  });

  /* ---------- โชว์ปุ่มเฉพาะหน้าแรก ---------- */
  function sync() {
    var h = document.getElementById("view-home");
    var on = !!(h && h.classList.contains("active"));
    document.body.classList.toggle("fb-home", on);
    if (!on && isOpen) close();
  }
  var home = document.getElementById("view-home");
  if (home && window.MutationObserver) new MutationObserver(sync).observe(home, { attributes: true, attributeFilter: ["class"] });
  sync();
  if (sheetUrl()) pullCmds();   // โหลดคำสั่งล่าสุดจากชีท Config ตอนเปิดหน้าเว็บ

  /* ทักทายสั้น ๆ ที่ปุ่มตอนเข้าหน้าแรก ให้รู้ว่ากดได้ */
  setTimeout(function () { elSummon.classList.add("hint"); setTimeout(function () { elSummon.classList.remove("hint"); }, 4200); }, 2600);
})();
