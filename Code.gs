/**
 * 班級座位表 — Google Apps Script 後端
 * 以「座位／成績」那份試算表為資料庫。課表是另一份檔案，這裡不會寫入。
 */

const SHEETS = {
  STUDENTS: '學生',
  CONFIG: '班級設定',
  HISTORY: '操作紀錄',
  HELP: '使用說明',
  CLOUD: '雲端資料',
  GRADES: '成績',
  DAILY: '每日加扣',
  HW_STUDENTS: 'HW_Students',
  HW_ASSIGNMENTS: 'HW_Assignments',
  HW_SUBMISSIONS: 'HW_Submissions',
  HW_WRONG: 'HW_WrongItems',
  HW_SPOT: 'HW_SpotChecks',
  HW_OVERRIDES: 'HW_Overrides',
  HW_QUESTIONS: 'HW_Questions'
};

const CLOUD_CHUNK = 45000;

const HEADERS = {
  STUDENTS: ['班級', '座號', '姓名', '分數', '列', '欄', '備註', '組別'],
  CONFIG: ['班級', '列數', '欄數', '版本', '更新時間'],
  HISTORY: ['時間', '班級', '類型', '座號', '姓名', '分數變化', '新分數', '詳情', '可復原', '已復原'],
  GRADES: ['班級', '座號', '姓名', '類型', '項目', '日期', '分數', '滿分', '狀態'],
  DAILY: ['班級', '日期', '座號', '姓名', '加扣分'],
  HW_STUDENTS: ['班級', '座號', '姓名', 'Email'],
  HW_ASSIGNMENTS: ['作業編號', '名稱', '班級', '題數', '抽查題數', '開始時間', '截止時間', '滿分', '每工作天扣分', '最低分', '學生連結', '建立時間'],
  HW_SUBMISSIONS: ['作業編號', '班級', '座號', '提交時間', '狀態', '遲交工作天', '計算分數', '教師加減', '調整原因', '最終分數', '調整者', '調整時間', '允許補交'],
  HW_WRONG: ['作業編號', '班級', '座號', '題號', '原因'],
  HW_SPOT: ['作業編號', '班級', '座號', '抽查題號', '已看詳解'],
  HW_OVERRIDES: ['作業編號', '班級', '座號', '個別截止', '原因'],
  HW_QUESTIONS: ['作業編號', '題號', '詳解']
};

/** 第一版不呼叫 Classroom API。改 true 才逐步接成績回寫。 */
const CLASSROOM_API_ENABLED = false;

var HW_STUDENT_ACTIONS_ = {
  hwLogin: true,
  hwLoginGoogle: true,
  hwGetAssignment: true,
  hwSaveProgress: true,
  hwSubmit: true,
  hwMyResult: true
};

var HW_TEACHER_ACTIONS_ = {
  hwListAssignments: true,
  hwCreateAssignment: true,
  hwDashboard: true,
  hwExportCsv: true,
  hwAdjust: true,
  hwOverride: true,
  hwSetMissing: true,
  hwImportStudents: true,
  hwListStudents: true
};

/** 你的座位表／成績資料庫（Google 試算表 ID）。課表不在這份裡。 */
const SPREADSHEET_ID = '1AES93Jv8l65YI2LQ-scVRPqYSLFxtVOD-UqIU99gQSA';

/** 上課課表試算表（只讀）。請與 docs/config.js 的 timetableId 保持一致。 */
const TIMETABLE_SPREADSHEET_ID = '13VrWBx6hoKpUON_JNxIrynH_gyRV8HnhUt0MMscjkWg';

/** 只有這些 Google 帳號能讀寫資料；其他帳號一律拒絕。 */
const TEACHER_EMAILS = ['chunhsinkuo@kcis.hc.edu.tw', 'chiajungtu@kcis.hc.edu.tw'];

/**
 * Google Cloud「網頁應用程式」OAuth 用戶端 ID（結尾 .apps.googleusercontent.com）。
 * 與 docs/config.js 的 googleClientId 相同。還沒填時仍會檢查 Google 登入信箱。
 */
const GOOGLE_CLIENT_ID = '556988999591-tc3b8orn6ov3guinfiq5p0c9u6g0n802.apps.googleusercontent.com';

function googleClientId_() {
  var fromCode = String(GOOGLE_CLIENT_ID || '').trim();
  if (fromCode) return fromCode;
  try {
    return String(PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID') || '').trim();
  } catch (err) {
    return '';
  }
}

function teacherEmailList_() {
  return TEACHER_EMAILS.map(function (email) {
    return String(email || '').trim().toLowerCase();
  }).filter(Boolean);
}

function externalRequestHint_() {
  return '後端還沒允許「連線至外部服務」。請打開成績庫試算表 → 擴充功能 → Apps Script，上方選函式 authorizeScript 按執行，在權限畫面允許連線。完成後「部署 → 管理部署 → 編輯」選新版本（網址不要換）。';
}

function fetchTokenInfo_(idToken) {
  try {
    return UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { muteHttpExceptions: true, followRedirects: true }
    );
  } catch (err) {
    var msg = String(err && err.message ? err.message : err);
    if (/UrlFetchApp|external_request|外部/i.test(msg)) {
      throw new Error(externalRequestHint_());
    }
    throw err;
  }
}

/** 老師在 Apps Script 編輯器按一次「執行」，允許驗證 Google 登入。 */
function authorizeScript() {
  try {
    UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=ping', {
      muteHttpExceptions: true,
      followRedirects: true
    });
    // 存檔後延遲寫出成績工作表要用時間觸發器
    ScriptApp.getProjectTriggers();
    SpreadsheetApp.getUi().alert(
      '已允許連線外部服務與觸發器。\n\n請再到 Apps Script「部署 → 管理部署 → 編輯」，版本選「新版本」，執行身分「我」、對象「任何人」。網址不要換。'
    );
  } catch (err) {
    SpreadsheetApp.getUi().alert(
      '授權還沒完成：' + String(err && err.message ? err.message : err) +
      '\n\n請再按執行並允許權限。若學校管理員禁止 Apps Script 連外網，請請資訊組開放「連線至外部服務」。'
    );
  }
}

function verifyIdToken_(idToken) {
  idToken = String(idToken || '').trim();
  if (!idToken) throw new Error('請先用 Google 帳號登入');

  // 快取到憑證到期，背景輪詢不必每次都打 Google tokeninfo
  var cache = CacheService.getScriptCache();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken);
  var cacheKey = 'idtok:' + Utilities.base64EncodeWebSafe(digest).substring(0, 80);
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      var hit = JSON.parse(cached);
      if (hit && hit.email && (!hit.exp || hit.exp * 1000 > Date.now())) return hit;
    } catch (ignore) {}
  }

  var res = fetchTokenInfo_(idToken);
  var data = {};
  try {
    data = JSON.parse(res.getContentText() || '{}');
  } catch (err) {
    throw new Error('無法確認 Google 登入，請再登入一次');
  }
  if (data.error || data.error_description) {
    throw new Error('登入已過期，請再按一次 Google 登入');
  }
  var expectedAud = googleClientId_();
  if (expectedAud && String(data.aud || '') !== expectedAud) {
    throw new Error('登入憑證與這個座位表不符');
  }
  if (String(data.email_verified) !== 'true' && data.email_verified !== true) {
    throw new Error('這個 Google 帳號尚未驗證信箱');
  }
  var email = String(data.email || '').trim().toLowerCase();
  if (!email) throw new Error('Google 登入沒有信箱');
  var exp = Number(data.exp) || 0;
  var user = {
    email: email,
    teacher: teacherEmailList_().indexOf(email) >= 0,
    exp: exp
  };
  var ttl = exp ? Math.floor(exp - Date.now() / 1000) : 300;
  ttl = Math.min(3600, ttl);
  if (ttl > 0) {
    try {
      cache.put(cacheKey, JSON.stringify(user), ttl);
    } catch (cacheErr) {}
  }
  return user;
}

function verifyAuthPayload_(idToken) {
  var user = verifyIdToken_(idToken);
  return { ok: true, email: user.email, teacher: user.teacher };
}

/**
 * 網頁前端會呼叫這個 API（都要教師 idToken）。
 * POST { "action": "getStore" | "getStoreMeta" | "putStore" | "getTimetable" | "repairGroups", "idToken": "..." }
 * GET  ?action=getStore&idToken=...&callback=seatCb123（JSONP 備援）
 */
function doGet(e) {
  e = e || { parameter: {} };
  if (e.parameter && e.parameter.assignment) {
    return HtmlService.createHtmlOutput('作業檢核已停用，請洽老師。').setTitle('作業檢核');
  }
  return apiResponse_(handleRequest_(collectParams_(e)), e);
}

function doPost(e) {
  var body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return apiResponse_({ ok: false, error: 'JSON 格式錯誤' }, e);
  }
  var params = collectParams_(e);
  Object.keys(params).forEach(function (key) {
    if (body[key] === undefined) {
      body[key] = params[key];
    }
  });
  return apiResponse_(handleRequest_(body), e);
}

function collectParams_(e) {
  return (e && e.parameter) ? e.parameter : {};
}

function parseMaybeJson_(value) {
  if (typeof value !== 'string') {
    return value;
  }
  var text = value.trim();
  if (!text) {
    return value;
  }
  if (text.charAt(0) === '{' || text.charAt(0) === '[') {
    try {
      return JSON.parse(text);
    } catch (err) {
      return value;
    }
  }
  return value;
}

function handleRequest_(req) {
  try {
    req = req || {};
    var action = String(req.action || 'getStore');
    if (action === 'verifyAuth') {
      return verifyAuthPayload_(req.idToken);
    }
    if (HW_STUDENT_ACTIONS_[action]) {
      return { ok: false, error: '作業檢核學生端已停用' };
    }
    var user = verifyIdToken_(req.idToken);
    // 整包資料含全部學生成績：讀與寫都只開放教師帳號
    if (!user || !user.teacher) {
      throw new Error('這個帳號沒有權限，請改用教師 Google 帳號登入');
    }
    var payload = parseMaybeJson_(req.payload);
    switch (action) {
      case 'getStore':
        return getCloudStore();
      case 'getStoreMeta':
        return getCloudStoreMeta();
      case 'getTimetable':
        return getTimetableApi_(req.fresh === true || req.fresh === 'true' || req.fresh === '1');
      case 'putStore':
        return putCloudStore(req.store || payload);
      case 'repairGroups':
        return repairGroupsApi_();
      default:
        if (HW_TEACHER_ACTIONS_[action]) {
          ensureHwSheets_(getSs_());
          return handleHwTeacher_(req, action, user);
        }
        return { ok: false, error: '未知的操作：' + action };
    }
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

function apiResponse_(data, e) {
  var output = JSON.stringify(data);
  var callback = e && e.parameter && e.parameter.callback;
  if (callback && /^[A-Za-z_][A-Za-z0-9_]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + output + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('座位表')
    .addItem('開啟座位表網頁', 'openSeatingApp')
    .addItem('授權連線外部服務（驗證登入）', 'authorizeScript')
    .addItem('初始化／修復工作表', 'setupSheets')
    .addItem('立即更新成績／學生工作表', 'refreshReadableSheets')
    .addToUi();
}

function openSeatingApp() {
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:12px;line-height:1.6;">' +
    '<p>這個 Apps Script 現在是<strong>試算表資料庫 API</strong>。</p>' +
    '<p>座位表畫面請放到 GitHub Pages，平板開 GitHub 網址。</p>' +
    '<p>學生、分數、座位請直接在本試算表的「學生」工作表查看與修改，然後在網頁按「同步」。</p>' +
    '</div>'
  )
    .setWidth(440)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, '座位表');
}

function setupSheets() {
  ensureSheets_(getSs_());
  SpreadsheetApp.getActive().toast('工作表已就緒', '座位表');
}

function getSs_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

var TIMETABLE_CACHE_SECS_ = 600;
var TIMETABLE_CACHE_PART_ = 90000;

/** 課表很少變：快取 10 分鐘。CacheService 單筆上限 100KB，所以分段存。 */
function getTimetableApi_(fresh) {
  var cache = CacheService.getScriptCache();
  if (!fresh) {
    try {
      var count = Number(cache.get('tt:n') || 0);
      if (count > 0) {
        var keys = [];
        for (var i = 0; i < count; i++) keys.push('tt:' + i);
        var parts = cache.getAll(keys);
        var text = '';
        var complete = keys.every(function (k) {
          if (parts[k] == null) return false;
          text += parts[k];
          return true;
        });
        if (complete) {
          var hit = JSON.parse(text);
          hit.cached = true;
          return hit;
        }
      }
    } catch (ignore) {}
  }
  var data = readTimetable_();
  try {
    var json = JSON.stringify(data);
    var n = Math.ceil(json.length / TIMETABLE_CACHE_PART_);
    if (n <= 20) {
      var entries = { 'tt:n': String(n) };
      for (var j = 0; j < n; j++) entries['tt:' + j] = json.substr(j * TIMETABLE_CACHE_PART_, TIMETABLE_CACHE_PART_);
      cache.putAll(entries, TIMETABLE_CACHE_SECS_);
    }
  } catch (ignore2) {}
  return data;
}

/** 從另一份「上課課表」試算表讀取最新內容（只讀，不寫入）。 */
function readTimetable_() {
  var id = String(TIMETABLE_SPREADSHEET_ID || '').trim();
  if (!id) throw new Error('尚未設定課表試算表 ID');
  var ss;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (err) {
    throw new Error('打不開課表試算表，請確認部署帳號有權限開啟該檔：' + (err && err.message ? err.message : err));
  }
  var sheets = ss.getSheets().map(function (sh) {
    var range = sh.getDataRange();
    var values = range ? range.getDisplayValues() : [];
    return {
      name: sh.getName(),
      gid: String(sh.getSheetId()),
      values: values
    };
  }).filter(function (sheet) {
    return sheet.values && sheet.values.length;
  });
  if (!sheets.length) throw new Error('課表試算表目前是空的');
  return {
    ok: true,
    title: ss.getName() || '上課課表',
    url: ss.getUrl(),
    source: 'google',
    fetchedAt: new Date().toISOString(),
    sheets: sheets
  };
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function getCloudStore() {
  var ss = getSs_();
  var sheet = ensureCloudSheet_(ss);
  // 拿鎖讀，避免讀到 putStore 寫到一半的分段
  var json = withLock_(function () { return readCloudChunks_(sheet); });
  if (json) {
    try {
      var store = JSON.parse(json);
      healStoreGroupsInPlace_(ss, store);
      healStoreGroupsFromHistory_(store);
      return { ok: true, empty: false, store: store };
    } catch (err) {
      throw new Error('雲端資料損壞，請從備份還原');
    }
  }
  return { ok: true, empty: true, store: null };
}

var STORE_AT_CACHE_KEY_ = 'storeUpdatedAt';

function noteStoreUpdated_(at) {
  try {
    CacheService.getScriptCache().put(STORE_AT_CACHE_KEY_, String(at || ''), 21600);
  } catch (ignore) {}
}

function getCloudStoreMeta() {
  var cached = null;
  try { cached = CacheService.getScriptCache().get(STORE_AT_CACHE_KEY_); } catch (ignore) {}
  if (cached) return { ok: true, empty: false, updatedAt: cached };
  var ss = getSs_();
  var sheet = ss.getSheetByName(SHEETS.CLOUD);
  if (!sheet) return { ok: true, empty: true, updatedAt: '' };
  var at = String(sheet.getRange(2, 3).getValue() || '').trim();
  if (at) {
    noteStoreUpdated_(at);
    return { ok: true, empty: false, updatedAt: at };
  }
  var json = readCloudChunks_(sheet);
  if (!json) return { ok: true, empty: true, updatedAt: '' };
  try {
    at = String((JSON.parse(json) || {}).updatedAt || '');
  } catch (err) {
    at = '';
  }
  if (at) {
    try { sheet.getRange(2, 3).setValue(at); } catch (ignore) {}
  }
  return { ok: true, empty: false, updatedAt: at };
}

function putCloudStore(store) {
  if (!store || typeof store !== 'object') {
    throw new Error('沒有可儲存的資料');
  }
  return withLock_(function () {
    var ss = getSs_();
    ensureSheetsOnce_(ss);
    var sheet = ensureCloudSheet_(ss);
    var existing = null;
    try {
      var json = readCloudChunks_(sheet);
      existing = json ? JSON.parse(json) : null;
    } catch (readErr) {
      existing = null;
    }
    if (existing) {
      store = mergeProtectCloudStore_(store, existing);
    }
    healStoreGroupsInPlace_(ss, store);
    healStoreGroupsFromHistory_(store);
    store.updatedAt = new Date().toISOString();
    writeCloudChunks_(sheet, JSON.stringify(store), store.updatedAt);
    noteStoreUpdated_(store.updatedAt);
    scheduleReadableSync_(ss, store);
    return { ok: true, updatedAt: store.updatedAt };
  });
}

/** 工作表結構改了就調這個版本，讓 ensureSheets_ 再跑一次。 */
const SHEETS_SCHEMA_VERSION = '2026-10-14';

function ensureSheetsOnce_(ss) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('SHEETS_READY') === SHEETS_SCHEMA_VERSION) return;
  ensureSheets_(ss);
  props.setProperty('SHEETS_READY', SHEETS_SCHEMA_VERSION);
}

function syncReadableNow_(ss, store) {
  syncVisibleRoster_(ss, store);
  try {
    syncReadableGrades_(ss, store);
  } catch (gradeErr) {}
}

/**
 * 「學生／班級設定／成績／每日加扣」是給人看的副本，整張重寫很慢。
 * 存檔時只排一個約 1 分鐘後的觸發器，連續存檔只會重寫一次。
 */
function scheduleReadableSync_(ss, store) {
  var props = PropertiesService.getScriptProperties();
  var pendingAt = Number(props.getProperty('READABLE_TRIGGER_AT') || 0);
  if (pendingAt && Date.now() - pendingAt < 10 * 60 * 1000) return;
  try {
    deleteReadableTriggers_();
    ScriptApp.newTrigger('refreshReadableSheets').timeBased().after(60 * 1000).create();
    props.setProperty('READABLE_TRIGGER_AT', String(Date.now()));
  } catch (err) {
    // 還沒授權觸發器時退回立即寫出
    syncReadableNow_(ss, store);
  }
}

function deleteReadableTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'refreshReadableSheets') ScriptApp.deleteTrigger(t);
  });
}

/** 觸發器或選單呼叫：依雲端資料重寫「學生／班級設定／成績／每日加扣」。 */
function refreshReadableSheets() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('READABLE_TRIGGER_AT');
  try { deleteReadableTriggers_(); } catch (ignore) {}
  withLock_(function () {
    var ss = getSs_();
    ensureSheets_(ss);
    var json = readCloudChunks_(ensureCloudSheet_(ss));
    if (!json) return;
    syncReadableNow_(ss, JSON.parse(json));
  });
}

/**
 * 老師可在 Apps Script 編輯器選這個函式按「執行」，
 * 從「學生」工作表的「組別」欄把分組寫回雲端 JSON。
 */
function repairGroupsFromStudentSheet() {
  var result = repairGroupsApi_();
  return result && result.message ? result.message : '已嘗試還原分組';
}

function repairGroupsApi_() {
  return withLock_(function () {
    var ss = getSs_();
    ensureSheets_(ss);
    var sheet = ensureCloudSheet_(ss);
    var json = readCloudChunks_(sheet);
    if (!json) throw new Error('雲端還沒有資料');
    var store = JSON.parse(json);
    var fromSheet = healStoreGroupsInPlace_(ss, store);
    var fromHistory = healStoreGroupsFromHistory_(store);
    if (!fromSheet && !fromHistory) {
      return {
        ok: false,
        message: '學生表組別欄與操作紀錄都找不到可還原的分組。請到試算表「檔案 → 版本紀錄」找回有組別的版本，或重新分組。',
        store: store
      };
    }
    store.updatedAt = new Date().toISOString();
    writeCloudChunks_(sheet, JSON.stringify(store), store.updatedAt);
    noteStoreUpdated_(store.updatedAt);
    syncVisibleRoster_(ss, store);
    return {
      ok: true,
      message: '已還原分組（學生表：' + (fromSheet ? '有' : '無') + '，操作紀錄：' + (fromHistory ? '有' : '無') + '）。請重新整理座位表。',
      fromSheet: fromSheet,
      fromHistory: fromHistory,
      updatedAt: store.updatedAt,
      store: store
    };
  });
}

function countAssignMap_(assign) {
  return Object.keys(assign || {}).length;
}

function healStoreGroupsInPlace_(ss, store) {
  if (!store || !store.classes) return false;
  var needsHeal = Object.keys(store.classes).some(function (cn) {
    var room = store.classes[cn];
    if (!room || !(room.students || []).length) return false;
    var groups = room.groups || {};
    if (groups.clearedAt) return false;
    return countAssignMap_(groups.assign || {}) === 0;
  });
  // 讀整張「學生」工作表很慢；分組都在時就不必讀
  if (!needsHeal) return false;
  var sheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (!sheet || sheet.getLastRow() < 2) return false;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.STUDENTS.length).getValues();
  var byClass = {};
  values.forEach(function (row) {
    var cn = String(row[0] || '').trim();
    var seat = String(row[1] || '').trim();
    var gid = parseInt(row[7], 10);
    if (!cn || !seat || !isFinite(gid) || gid < 1) return;
    if (!byClass[cn]) byClass[cn] = {};
    byClass[cn][seat] = gid;
  });
  var changed = false;
  Object.keys(byClass).forEach(function (cn) {
    var room = store.classes[cn];
    if (!room) return;
    room.groups = room.groups || { size: 4, assign: {}, scores: {} };
    room.groups.assign = room.groups.assign || {};
    if (countAssignMap_(room.groups.assign) > 0) return;
    if (room.groups.clearedAt) return;
    var assign = byClass[cn];
    if (!countAssignMap_(assign)) return;
    room.groups.assign = assign;
    room.groups.size = room.groups.size || 4;
    room.groups.scores = room.groups.scores || {};
    changed = true;
  });
  return changed;
}

function healStoreGroupsFromHistory_(store) {
  if (!store || !store.classes) return false;
  var changed = false;
  Object.keys(store.classes).forEach(function (cn) {
    var room = store.classes[cn];
    if (!room) return;
    room.groups = room.groups || { size: 4, assign: {}, scores: {} };
    room.groups.assign = room.groups.assign || {};
    if (countAssignMap_(room.groups.assign) > 0) return;
    if (room.groups.clearedAt) return;
    var assign = {};
    (store.history || []).forEach(function (item) {
      if (!item || item.undone) return;
      if (String(item.className || '') !== cn) return;
      if (item.lab) return;
      var gid = parseInt(item.groupId, 10);
      if (!isFinite(gid) || gid < 1) return;
      var seats = (item.seatNos && item.seatNos.length) ? item.seatNos : [];
      seats.forEach(function (seat) {
        var key = String(seat || '').trim();
        if (key) assign[key] = gid;
      });
    });
    if (!countAssignMap_(assign)) return;
    room.groups.assign = assign;
    room.groups.size = room.groups.size || 4;
    room.groups.scores = room.groups.scores || {};
    changed = true;
  });
  return changed;
}

function countCloudScoreMap_(scores) {
  var n = 0;
  Object.keys(scores || {}).forEach(function (seat) {
    var v = scores[seat];
    if (v === '' || v == null) return;
    n += 1;
  });
  return n;
}

function countCloudBookScores_(book) {
  var n = 0;
  if (!book) return 0;
  ['yellow', 'morning', 'exams', 'labs', 'practicals', 'quizzes'].forEach(function (key) {
    (book[key] || []).forEach(function (col) {
      n += countCloudScoreMap_(col && col.scores);
    });
  });
  (book.homeworks || []).forEach(function (col) {
    Object.keys((col && col.records) || {}).forEach(function (seat) {
      var rec = col.records[seat] || {};
      if (rec.status || rec.score != null || rec.submittedAt) n += 1;
    });
  });
  return n;
}

function mergeCloudScoreMap_(localScores, remoteScores) {
  var out = {};
  Object.keys(localScores || {}).forEach(function (seat) {
    var v = localScores[seat];
    if (v === '' || v == null) return;
    out[String(seat)] = v;
  });
  Object.keys(remoteScores || {}).forEach(function (seat) {
    var rv = remoteScores[seat];
    if (rv === '' || rv == null) return;
    if (!Object.prototype.hasOwnProperty.call(out, seat)) out[String(seat)] = rv;
  });
  return out;
}

function mergeCloudGradeColumns_(localList, remoteList, fillEmptyScores) {
  var local = JSON.parse(JSON.stringify(localList || []));
  var byId = {};
  local.forEach(function (col, idx) {
    if (col && col.id) byId[String(col.id)] = idx;
  });
  (remoteList || []).forEach(function (remoteCol) {
    if (!remoteCol || !remoteCol.id) return;
    var id = String(remoteCol.id);
    if (!Object.prototype.hasOwnProperty.call(byId, id)) {
      local.push(JSON.parse(JSON.stringify(remoteCol)));
      byId[id] = local.length - 1;
      return;
    }
    if (!fillEmptyScores) return;
    var cur = local[byId[id]];
    if (remoteCol.scores) cur.scores = mergeCloudScoreMap_(cur.scores, remoteCol.scores);
    if (remoteCol.records) {
      cur.records = cur.records || {};
      Object.keys(remoteCol.records).forEach(function (seat) {
        if (!cur.records[seat]) cur.records[seat] = JSON.parse(JSON.stringify(remoteCol.records[seat]));
      });
    }
  });
  return local;
}

function mergeCloudGradeBook_(localBook, remoteBook) {
  localBook = localBook || {};
  remoteBook = remoteBook || {};
  var lc = countCloudBookScores_(localBook);
  var rc = countCloudBookScores_(remoteBook);
  var fillEmpty = rc > 0 && (lc === 0 || (rc > lc && (rc - lc) >= 3 && lc * 2 < rc));
  return {
    rules: localBook.rules || remoteBook.rules,
    yellow: mergeCloudGradeColumns_(localBook.yellow || localBook.quizzes, remoteBook.yellow || remoteBook.quizzes, fillEmpty),
    morning: mergeCloudGradeColumns_(localBook.morning, remoteBook.morning, fillEmpty),
    exams: mergeCloudGradeColumns_(localBook.exams, remoteBook.exams, fillEmpty),
    labs: mergeCloudGradeColumns_(localBook.labs, remoteBook.labs, fillEmpty),
    practicals: mergeCloudGradeColumns_(localBook.practicals, remoteBook.practicals, fillEmpty),
    homeworks: mergeCloudGradeColumns_(localBook.homeworks, remoteBook.homeworks, fillEmpty)
  };
}

function dayCloudWeight_(day) {
  var w = 0;
  ((day && day.students) || []).forEach(function (s) {
    w += Math.abs(Number(s.score) || 0);
  });
  return w;
}

function mergeCloudDailyLists_(localList, remoteList) {
  var byDate = {};
  (remoteList || []).forEach(function (day) {
    if (day && day.date) byDate[day.date] = day;
  });
  (localList || []).forEach(function (day) {
    if (!day || !day.date) return;
    var prev = byDate[day.date];
    if (!prev || dayCloudWeight_(day) >= dayCloudWeight_(prev)) byDate[day.date] = day;
  });
  return Object.keys(byDate).sort().map(function (d) { return byDate[d]; });
}

/** 後端最後一道防護：本機空成績／缺班級／空每日紀錄時，保留雲端舊資料。 */
function mergeProtectCloudStore_(incoming, existing) {
  if (!incoming || !existing) return incoming || existing;
  var store = incoming;
  store.grades = store.grades || {};
  Object.keys(existing.grades || {}).forEach(function (cn) {
    if (!store.grades[cn]) {
      store.grades[cn] = existing.grades[cn];
      return;
    }
    store.grades[cn] = mergeCloudGradeBook_(store.grades[cn], existing.grades[cn]);
  });
  store.daily = store.daily || {};
  Object.keys(existing.daily || {}).forEach(function (cn) {
    if (!store.daily[cn] || !store.daily[cn].length) {
      if ((existing.daily[cn] || []).length) store.daily[cn] = existing.daily[cn];
    } else {
      store.daily[cn] = mergeCloudDailyLists_(store.daily[cn], existing.daily[cn]);
    }
  });
  store.classes = store.classes || {};
  Object.keys(existing.classes || {}).forEach(function (cn) {
    if (!store.classes[cn]) {
      store.classes[cn] = existing.classes[cn];
      return;
    }
    var lroom = store.classes[cn];
    var rroom = existing.classes[cn];
    lroom.groups = lroom.groups || { size: 4, assign: {}, scores: {} };
    rroom.groups = rroom.groups || { size: 4, assign: {}, scores: {} };
    if (countAssignMap_(lroom.groups.assign) === 0 && countAssignMap_(rroom.groups.assign) > 0) {
      if (lroom.groups.clearedAt) {
        lroom.groups.assign = {};
        lroom.groups.scores = {};
      } else {
        lroom.groups.assign = rroom.groups.assign;
        lroom.groups.size = lroom.groups.size || rroom.groups.size || 4;
        lroom.groups.scores = Object.assign({}, rroom.groups.scores || {}, lroom.groups.scores || {});
      }
    }
    lroom.lab = lroom.lab || { assign: {}, scores: {} };
    rroom.lab = rroom.lab || { assign: {}, scores: {} };
    if (countAssignMap_(lroom.lab.assign) === 0 && countAssignMap_(rroom.lab.assign) > 0) {
      lroom.lab.assign = rroom.lab.assign;
      lroom.lab.scores = Object.assign({}, rroom.lab.scores || {}, lroom.lab.scores || {});
    }
  });
  mergeCloudLiveScores_(store, existing);
  if ((!store.mockExam || !store.mockExam.byClass || !Object.keys(store.mockExam.byClass).length) &&
      existing.mockExam && existing.mockExam.byClass && Object.keys(existing.mockExam.byClass).length) {
    store.mockExam = existing.mockExam;
  }
  store.lessonLog = mergeCloudLessonLog_(store.lessonLog, existing.lessonLog);
  store.scheduleChanges = mergeCloudScheduleChanges_(store.scheduleChanges, existing.scheduleChanges);
  store.substitutes = mergeCloudSubstitutes_(store.substitutes, existing.substitutes);
  store.hwMissing = mergeCloudHwMissing_(store.hwMissing, existing.hwMissing);
  return store;
}

function mergeCloudLessonPack_(localPack, remotePack) {
  localPack = localPack || { current: '', updatedAt: '', entries: [] };
  remotePack = remotePack || { current: '', updatedAt: '', entries: [] };
  var byId = {};
  var byDate = {};
  function take(entry) {
    if (!entry || !entry.date || !entry.progress) return;
    var id = String(entry.id || '');
    var date = String(entry.date);
    if (id) {
      var prev = byId[id];
      if (!prev || String(entry.createdAt || '') >= String(prev.createdAt || '')) byId[id] = entry;
    }
    var prevDate = byDate[date];
    if (!prevDate || String(entry.createdAt || '') >= String(prevDate.createdAt || '')) {
      byDate[date] = entry;
    }
  }
  (remotePack.entries || []).forEach(take);
  (localPack.entries || []).forEach(take);
  var merged = {};
  Object.keys(byId).forEach(function (id) { merged[id] = byId[id]; });
  Object.keys(byDate).forEach(function (date) {
    var entry = byDate[date];
    var id = String(entry.id || '');
    if (!id) merged['date:' + date] = entry;
    else if (!merged[id]) merged[id] = entry;
  });
  var entries = Object.keys(merged).map(function (k) { return merged[k]; });
  entries.sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date)) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
  if (entries.length > 200) entries = entries.slice(0, 200);
  var current = String(localPack.current || '').trim() || String(remotePack.current || '').trim();
  var updatedAt = localPack.updatedAt || '';
  if ((remotePack.updatedAt || '') > updatedAt) updatedAt = remotePack.updatedAt;
  return {
    current: current.slice(0, 80),
    updatedAt: updatedAt,
    entries: entries,
    events: mergeCloudLessonEvents_(localPack.events, remotePack.events)
  };
}

function mergeCloudLessonEvents_(localList, remoteList) {
  var byId = {};
  function take(item) {
    if (!item || typeof item !== 'object') return;
    var id = String(item.id || '').trim();
    var className = String(item.className || '').trim();
    var date = String(item.date || '').trim();
    var period = String(item.period || '').trim();
    if (!id || !className || !date || !period) return;
    var type = String(item.type || '').trim().toLowerCase();
    if (type !== 'lab') type = 'exam';
    var norm = {
      id: id,
      className: className,
      type: type,
      date: date,
      period: period,
      note: String(item.note || '').trim().slice(0, 80),
      done: !!item.done,
      deleted: !!item.deleted,
      createdAt: String(item.createdAt || ''),
      updatedAt: String(item.updatedAt || item.createdAt || '')
    };
    var prev = byId[id];
    if (!prev || String(norm.updatedAt || '') >= String(prev.updatedAt || '')) byId[id] = norm;
  }
  (remoteList || []).forEach(take);
  (localList || []).forEach(take);
  var out = Object.keys(byId).map(function (id) { return byId[id]; });
  out.sort(function (a, b) {
    return String(a.date).localeCompare(String(b.date)) ||
      String(a.period).localeCompare(String(b.period)) ||
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
  if (out.length > 120) out = out.slice(0, 120);
  return out;
}

function mergeCloudLessonLog_(localLog, remoteLog) {
  localLog = localLog && typeof localLog === 'object' ? localLog : {};
  remoteLog = remoteLog && typeof remoteLog === 'object' ? remoteLog : {};
  var out = {};
  var names = {};
  Object.keys(localLog).forEach(function (cn) { names[cn] = true; });
  Object.keys(remoteLog).forEach(function (cn) { names[cn] = true; });
  Object.keys(names).forEach(function (cn) {
    out[cn] = mergeCloudLessonPack_(localLog[cn], remoteLog[cn]);
  });
  return out;
}

function mergeCloudScheduleChanges_(localList, remoteList) {
  var byId = {};
  function take(item) {
    if (!item || typeof item !== 'object') return;
    var id = String(item.id || '').trim();
    var className = String(item.className || '').trim();
    var fromPeriod = String(item.fromPeriod || '').trim();
    var toPeriod = String(item.toPeriod || '').trim();
    if (!id || !className || !fromPeriod || !toPeriod) return;
    var fromDay = Number(item.fromDay);
    var toDay = Number(item.toDay);
    if (!isFinite(fromDay) || fromDay < 0 || fromDay > 4) fromDay = 0;
    if (!isFinite(toDay) || toDay < 0 || toDay > 4) toDay = 0;
    var weekStart = String(item.weekStart || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return;
    var toWeekStart = String(item.toWeekStart || item.weekStart || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(toWeekStart)) toWeekStart = weekStart;
    var norm = {
      id: id,
      weekStart: weekStart,
      toWeekStart: toWeekStart,
      className: className,
      fromDay: fromDay,
      fromPeriod: fromPeriod,
      toDay: toDay,
      toPeriod: toPeriod,
      note: String(item.note || '').trim().slice(0, 120),
      deleted: !!item.deleted,
      createdAt: String(item.createdAt || ''),
      updatedAt: String(item.updatedAt || item.createdAt || '')
    };
    var prev = byId[id];
    if (!prev || String(norm.updatedAt || '') >= String(prev.updatedAt || '')) byId[id] = norm;
  }
  (remoteList || []).forEach(take);
  (localList || []).forEach(take);
  var out = Object.keys(byId).map(function (id) { return byId[id]; });
  out.sort(function (a, b) {
    return String(b.weekStart).localeCompare(String(a.weekStart)) ||
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
  if (out.length > 80) out = out.slice(0, 80);
  return out;
}

/** 代課：kind in＝我代別人、out＝別人代我。所有欄位都要保留，舊分頁沒有代課資料也不能清掉雲端。 */
function mergeCloudSubstitutes_(localList, remoteList) {
  var byId = {};
  function take(item) {
    if (!item || typeof item !== 'object') return;
    var id = String(item.id || '').trim();
    if (!id) return;
    var kind = String(item.kind || '').trim();
    var norm = {
      id: id,
      kind: kind === 'in' || kind === 'out' ? kind : '',
      date: normalizeCloudHwDueDate_(item.date),
      period: String(item.period || '').trim().slice(0, 20),
      className: String(item.className || '').trim().slice(0, 20),
      teacher: String(item.teacher || '').trim().slice(0, 20),
      note: String(item.note || '').trim().slice(0, 120),
      deleted: !!item.deleted,
      createdAt: String(item.createdAt || ''),
      updatedAt: String(item.updatedAt || item.createdAt || '')
    };
    if (!norm.deleted && (!norm.kind || !norm.date || !norm.period || !norm.className)) return;
    var prev = byId[id];
    if (!prev || String(norm.updatedAt || '') >= String(prev.updatedAt || '')) byId[id] = norm;
  }
  (Array.isArray(remoteList) ? remoteList : []).forEach(take);
  (Array.isArray(localList) ? localList : []).forEach(take);
  var out = Object.keys(byId).map(function (id) { return byId[id]; });
  out.sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date)) ||
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
  if (out.length > 200) out = out.slice(0, 200);
  return out;
}

/** 缺交作業繳交期限：只接受 YYYY-MM-DD，並用回推日期擋非法日。 */
function normalizeCloudHwDueDate_(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  var y = Number(s.slice(0, 4));
  var m = Number(s.slice(5, 7));
  var d = Number(s.slice(8, 10));
  var dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return '';
  var key = dt.getFullYear() + '-' +
    String(dt.getMonth() + 1).padStart(2, '0') + '-' +
    String(dt.getDate()).padStart(2, '0');
  return key === s ? s : '';
}

function mergeCloudHwMissing_(localMap, remoteMap) {
  localMap = localMap && typeof localMap === 'object' ? localMap : {};
  remoteMap = remoteMap && typeof remoteMap === 'object' ? remoteMap : {};
  var names = {};
  Object.keys(localMap).forEach(function (cn) { names[cn] = true; });
  Object.keys(remoteMap).forEach(function (cn) { names[cn] = true; });
  var out = {};
  Object.keys(names).forEach(function (cn) {
    var byId = {};
    function take(item) {
      if (!item || typeof item !== 'object') return;
      var id = String(item.id || '').trim();
      if (!id) return;
      var seats = [];
      var seen = {};
      (item.seats || []).forEach(function (raw) {
        var seat = String(raw == null ? '' : raw).trim();
        if (!seat) return;
        if (/^\d+$/.test(seat) && seat.length < 2) seat = ('0' + seat).slice(-2);
        if (seen[seat]) return;
        seen[seat] = true;
        seats.push(seat);
      });
      var norm = {
        id: id,
        className: String(item.className || cn || '').trim(),
        title: String(item.title || '').trim().slice(0, 60) || '缺交作業',
        seats: seats,
        note: String(item.note || '').trim().slice(0, 120),
        dueDate: normalizeCloudHwDueDate_(item.dueDate),
        deleted: !!item.deleted,
        createdAt: String(item.createdAt || ''),
        updatedAt: String(item.updatedAt || item.createdAt || '')
      };
      var prev = byId[id];
      if (!prev || String(norm.updatedAt || '') >= String(prev.updatedAt || '')) byId[id] = norm;
    }
    (remoteMap[cn] || []).forEach(take);
    (localMap[cn] || []).forEach(take);
    out[cn] = Object.keys(byId).map(function (id) { return byId[id]; });
    out[cn].sort(function (a, b) {
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
    if (out[cn].length > 40) out[cn] = out[cn].slice(0, 40);
  });
  return out;
}

function classCloudAbsSum_(room) {
  var sum = 0;
  ((room && room.students) || []).forEach(function (s) {
    sum += Math.abs(Number(s.score) || 0);
  });
  return sum;
}

function mergeCloudLiveScores_(local, remote) {
  var localDate = local.scoreDate || '';
  var remoteDate = remote.scoreDate || '';
  if (localDate && remoteDate && localDate > remoteDate) return;
  Object.keys(remote.classes || {}).forEach(function (cn) {
    var lroom = local.classes && local.classes[cn];
    var rroom = remote.classes[cn];
    if (!lroom || !rroom) return;
    if (localDate && remoteDate && localDate !== remoteDate) return;
    if (!(classCloudAbsSum_(rroom) > 0 && classCloudAbsSum_(lroom) === 0)) return;
    var bySeat = {};
    (rroom.students || []).forEach(function (s) {
      bySeat[String(s.seatNo)] = Number(s.score) || 0;
    });
    (lroom.students || []).forEach(function (s) {
      var key = String(s.seatNo);
      if (Object.prototype.hasOwnProperty.call(bySeat, key)) s.score = bySeat[key];
    });
  });
}

function ensureCloudSheet_(ss) {
  var sheet = ss.getSheetByName(SHEETS.CLOUD);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.CLOUD);
    sheet.getRange(1, 1, 1, 2).setValues([['說明', '這是系統資料庫，請勿手動改這裡。要看分數請打開「成績」和「每日加扣」工作表。']]);
  }
  return sheet;
}

function writeCloudChunks_(sheet, json, updatedAt) {
  var n = Math.max(1, Math.ceil(String(json).length / CLOUD_CHUNK));
  var last = sheet.getLastRow();
  if (last > 2) {
    sheet.getRange(3, 1, last - 2, 1).clearContent();
  }
  // C2 存更新時間，讓 getStoreMeta 不必下載整包就能判斷有沒有新資料
  sheet.getRange(2, 1, 1, 3).setValues([['chunkCount', n, String(updatedAt || '')]]);
  var rows = [];
  var i;
  for (i = 0; i < n; i++) {
    rows.push([String(json).substr(i * CLOUD_CHUNK, CLOUD_CHUNK)]);
  }
  sheet.getRange(3, 1, rows.length, 1).setValues(rows);
}

function readCloudChunks_(sheet) {
  var n = Number(sheet.getRange(2, 2).getValue()) || 0;
  if (n <= 0) {
    n = Number(sheet.getRange(2, 1).getValue()) || 0;
  }
  if (n <= 0) return '';
  var values = sheet.getRange(3, 1, n, 1).getValues();
  var out = '';
  var i;
  for (i = 0; i < values.length; i++) {
    out += String(values[i][0] || '');
  }
  return out;
}

function groupIdOf_(room, seatNo) {
  var assign = room && room.groups && room.groups.assign;
  if (!assign) return '';
  var gid = assign[String(seatNo)];
  return gid ? String(gid) : '';
}

/** 把 JSON 裡的班級／學生同步到「學生」「班級設定」，方便在試算表後台直接看到。 */
function syncVisibleRoster_(ss, store) {
  var classes = (store && store.classes) || {};
  var names = Object.keys(classes).sort();
  var studentRows = [];
  var configRows = [];
  names.forEach(function (cn) {
    var room = classes[cn] || {};
    var className = String(room.className || cn || '').trim();
    if (!className) return;
    (room.students || []).forEach(function (s) {
      if (!s) return;
      var seatNo = String(s.seatNo || '').trim();
      var name = String(s.name || '').trim();
      if (!seatNo || !name) return;
      studentRows.push([
        className,
        seatNo,
        name,
        Number(s.score) || 0,
        s.row == null || s.row === '' ? '' : Number(s.row) + 1,
        s.col == null || s.col === '' ? '' : Number(s.col) + 1,
        s.note || '',
        groupIdOf_(room, seatNo)
      ]);
    });
    configRows.push([
      className,
      Number(room.rows) || 6,
      Number(room.cols) || 7,
      Number(room.version) || 1,
      room.updatedAt ? new Date(room.updatedAt) : new Date()
    ]);
  });
  var studentSheet = ss.getSheetByName(SHEETS.STUDENTS);
  var configSheet = ss.getSheetByName(SHEETS.CONFIG);
  if (!studentSheet || !configSheet) return;
  var lastS = studentSheet.getLastRow();
  if (lastS >= 2) {
    studentSheet.getRange(2, 1, lastS - 1, HEADERS.STUDENTS.length).clearContent();
  }
  if (studentRows.length) {
    studentSheet.getRange(2, 1, studentRows.length, HEADERS.STUDENTS.length).setValues(studentRows);
  }
  var lastC = configSheet.getLastRow();
  if (lastC >= 2) {
    configSheet.getRange(2, 1, lastC - 1, HEADERS.CONFIG.length).clearContent();
  }
  if (configRows.length) {
    configSheet.getRange(2, 1, configRows.length, HEADERS.CONFIG.length).setValues(configRows);
  }
}

/** 把成績簿與每日加扣寫成可讀工作表，老師打開試算表就能看到分數。 */
function syncReadableGrades_(ss, store) {
  var gradeSheet = ensureSheetWithHeaders_(ss, SHEETS.GRADES, HEADERS.GRADES);
  var dailySheet = ensureSheetWithHeaders_(ss, SHEETS.DAILY, HEADERS.DAILY);
  var classes = (store && store.classes) || {};
  var books = (store && store.grades) || {};
  var daily = (store && store.daily) || {};
  var names = Object.keys(classes);
  Object.keys(books).forEach(function (cn) {
    if (names.indexOf(cn) < 0) names.push(cn);
  });
  names.sort();
  var gradeRows = [];
  var dailyRows = [];
  var kinds = [
    { key: 'yellow', label: '課堂考卷' },
    { key: 'morning', label: '早自習小考' },
    { key: 'exams', label: '段考' },
    { key: 'labs', label: '實作評量' },
    { key: 'practicals', label: '實作成績' }
  ];
  names.forEach(function (cn) {
    var room = classes[cn] || {};
    var className = String(room.className || cn || '').trim();
    if (!className) return;
    var roster = (room.students || []).slice().sort(function (a, b) {
      return seatNoValue_(a.seatNo) - seatNoValue_(b.seatNo);
    });
    var nameBySeat = {};
    roster.forEach(function (s) {
      nameBySeat[String(s.seatNo)] = String(s.name || '');
    });
    var book = books[cn] || {};
    kinds.forEach(function (kind) {
      (book[kind.key] || []).forEach(function (col) {
        var title = String((col && col.title) || '').trim() || '未命名';
        var date = String((col && col.date) || '');
        var max = col && col.max != null ? col.max : 100;
        var scores = (col && col.scores) || {};
        roster.forEach(function (s) {
          var seat = String(s.seatNo || '');
          var raw = scores[seat];
          if (raw === undefined || raw === null || raw === '') raw = scores[String(Number(seat))];
          gradeRows.push([
            className,
            seat,
            s.name || '',
            kind.label,
            title,
            date,
            gradeCell_(raw),
            max,
            gradeStatus_(raw)
          ]);
        });
      });
    });
    (book.homeworks || []).forEach(function (col) {
      var title = String((col && col.title) || '').trim() || '作業';
      var date = String((col && col.dueDate) || (col && col.date) || '');
      var max = col && col.max != null ? col.max : 100;
      var records = (col && col.records) || {};
      roster.forEach(function (s) {
        var seat = String(s.seatNo || '');
        var rec = records[seat] || records[String(Number(seat))] || {};
        var status = rec.status === 'submitted' ? '已繳' : (rec.status === 'missing' ? '未繳' : '');
        var score = rec.score === undefined || rec.score === null || rec.score === '' ? '' : rec.score;
        gradeRows.push([
          className,
          seat,
          s.name || '',
          '作業',
          title,
          date,
          score,
          max,
          status || (score === '' ? '未登錄' : '已繳')
        ]);
      });
    });
    (daily[cn] || []).forEach(function (day) {
      var dayDate = String((day && day.date) || '');
      (day && day.students ? day.students : []).forEach(function (s) {
        dailyRows.push([
          className,
          dayDate,
          String(s.seatNo || ''),
          s.name || nameBySeat[String(s.seatNo)] || '',
          Number(s.score) || 0
        ]);
      });
    });
  });
  rewriteSheetBody_(gradeSheet, HEADERS.GRADES, gradeRows);
  rewriteSheetBody_(dailySheet, HEADERS.DAILY, dailyRows);
}

function gradeCell_(raw) {
  if (raw === 'leave' || raw === '請假') return '請假';
  if (raw === undefined || raw === null || raw === '') return '';
  return raw;
}

function gradeStatus_(raw) {
  if (raw === 'leave' || raw === '請假') return '請假';
  if (raw === undefined || raw === null || raw === '') return '未登錄';
  return '已登錄';
}

function rewriteSheetBody_(sheet, headers, rows) {
  var last = sheet.getLastRow();
  var cols = Math.max(headers.length, sheet.getLastColumn() || headers.length);
  if (last >= 2) {
    sheet.getRange(2, 1, last - 1, cols).clearContent();
  }
  if (rows && rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function ensureSheets_(ss) {
  ensureSheetWithHeaders_(ss, SHEETS.STUDENTS, HEADERS.STUDENTS);
  ensureSheetWithHeaders_(ss, SHEETS.CONFIG, HEADERS.CONFIG);
  ensureSheetWithHeaders_(ss, SHEETS.HISTORY, HEADERS.HISTORY);
  ensureSheetWithHeaders_(ss, SHEETS.GRADES, HEADERS.GRADES);
  ensureSheetWithHeaders_(ss, SHEETS.DAILY, HEADERS.DAILY);
  ensureCloudSheet_(ss);
  ensureHelpSheet_(ss);
  ensureHwSheets_(ss);

  const studentSheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (studentSheet.getLastRow() < 2) {
    seedSampleData_(ss);
  }
}

function ensureSheetWithHeaders_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const mismatch = headers.some(function (title, i) {
    return String(existing[i] || '') !== title;
  });
  if (mismatch) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureHelpSheet_(ss) {
  let sheet = ss.getSheetByName(SHEETS.HELP);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.HELP);
  }
  if (sheet.getLastRow() > 0) {
    var probe = String(sheet.getRange(1, 1).getValue() || '') + String(sheet.getRange(8, 1).getValue() || '');
    if (probe.indexOf('成績在哪裡看') >= 0) return;
    sheet.clear();
  }
  const lines = [
    ['班級座位表使用說明'],
    [''],
    ['一、在試算表輸入學生'],
    ['1. 開啟「學生」工作表。'],
    ['2. 每一列填：班級、座號、姓名。分數可留 0。'],
    ['3. 「列」「欄」可空白，系統會依座號自動排座位。'],
    ['4. 同一個班級請使用相同的班級名稱，例如：301。'],
    ['5. 從網頁「設定與上傳」匯入的名單，也會寫進「學生」與「班級設定」。'],
    [''],
    ['二、成績在哪裡看'],
    ['1. 「學生」工作表的「分數」只是今天的上課加扣，不是學期成績。'],
    ['2. 「雲端資料」是系統備份，請不要改、也不用從這裡找分數。'],
    ['3. 考卷、作業、段考請看「成績」工作表。'],
    ['4. 每天的上課加扣紀錄請看「每日加扣」工作表。'],
    ['5. 紙本作業檢核請看 HW_Submissions。'],
    ['6. 分數是從座位表網頁存檔後寫進來的；若這幾張表是空的，請到網頁教師模式改一筆再同步。'],
    [''],
    ['三、發布網頁給平板使用'],
    ['1. 上方選單：擴充功能 > Apps Script。'],
    ['2. 部署 > 新增部署作業 > 類型選「網頁應用程式」。'],
    ['3. 執行身分：我。'],
    ['4. 存取權：任何人（含匿名）或貴校 Google 帳號。'],
    ['5. 把網址加到平板主畫面，即可當座位表 App 使用。'],
    [''],
    ['四、網頁功能'],
    ['上傳名單：設定裡可上傳 CSV／Excel，欄位為班級、座號、姓名。'],
    ['拖放：按住學生卡片拖到其他座位，可對調或移到空位。'],
    ['抽籤：隨機抽出一位（可設定本堂不重複）。'],
    ['加分／扣分：先選分數，再點學生。小組加分會加進每位組員的平時成績。'],
    ['分組：上課模式可隨機或手動分組，並設定每組人數。'],
    ['復原：撤銷上一筆加扣分。'],
    ['存檔：把目前座位與分數寫回試算表。'],
    ['同步：從試算表拉取最新資料，方便換平板繼續用。'],
    [''],
    ['五、跨載具同步'],
    ['所有資料存在這份試算表。不同平板開同一個網頁網址，'],
    ['按「同步」或「存檔」後即可看到同一份座位與分數。']
  ];
  sheet.getRange(1, 1, lines.length, 1).setValues(lines);
  sheet.setColumnWidth(1, 640);
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
}

function seedSampleData_(ss) {
  const sampleNames = [
    '陳安安', '林冠宇', '黃詩涵', '張承恩', '吳品萱',
    '劉子豪', '蔡宜庭', '楊柏宇', '許雅琪', '周子翔',
    '羅欣怡', '簡廷偉'
  ];
  const students = sampleNames.map(function (name, i) {
    const seatNo = String(i + 1).padStart(2, '0');
    const row = Math.floor(i / 6) + 1;
    const col = (i % 6) + 1;
    return ['範例班', seatNo, name, 0, row, col, '', ''];
  });
  ss.getSheetByName(SHEETS.STUDENTS)
    .getRange(2, 1, students.length, HEADERS.STUDENTS.length)
    .setValues(students);
  ss.getSheetByName(SHEETS.CONFIG)
    .getRange(2, 1, 1, HEADERS.CONFIG.length)
    .setValues([['範例班', 4, 6, 1, new Date()]]);
}

function clampInt_(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (!isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

function seatNoValue_(seatNo) {
  const n = parseInt(String(seatNo).replace(/\D/g, ''), 10);
  return isFinite(n) ? n : 0;
}

/* ========== 紙本作業檢核（低權限 A：不依賴 Classroom API） ========== */

var ClassroomSyncService = {
  enabled: function () {
    return CLASSROOM_API_ENABLED === true;
  },
  syncGrade: function () {
    return { ok: true, skipped: true, reason: 'CLASSROOM_API_ENABLED=false' };
  },
  syncRoster: function () {
    return { ok: true, skipped: true, reason: 'CLASSROOM_API_ENABLED=false' };
  },
  createCourseWork: function () {
    return { ok: true, skipped: true, reason: 'CLASSROOM_API_ENABLED=false' };
  }
};

function ensureHwSheets_(ss) {
  ss = ss || getSs_();
  ensureSheetWithHeaders_(ss, SHEETS.HW_STUDENTS, HEADERS.HW_STUDENTS);
  ensureSheetWithHeaders_(ss, SHEETS.HW_ASSIGNMENTS, HEADERS.HW_ASSIGNMENTS);
  ensureSheetWithHeaders_(ss, SHEETS.HW_SUBMISSIONS, HEADERS.HW_SUBMISSIONS);
  ensureSheetWithHeaders_(ss, SHEETS.HW_WRONG, HEADERS.HW_WRONG);
  ensureSheetWithHeaders_(ss, SHEETS.HW_SPOT, HEADERS.HW_SPOT);
  ensureSheetWithHeaders_(ss, SHEETS.HW_OVERRIDES, HEADERS.HW_OVERRIDES);
  ensureSheetWithHeaders_(ss, SHEETS.HW_QUESTIONS, HEADERS.HW_QUESTIONS);
}

function hwWebAppUrl_() {
  try {
    var url = ScriptApp.getService().getUrl();
    if (url) return String(url).replace(/\/$/, '');
  } catch (err) {}
  try {
    var saved = String(PropertiesService.getScriptProperties().getProperty('WEB_APP_URL') || '').trim();
    if (saved) return saved.replace(/\/$/, '');
  } catch (err2) {}
  return 'https://script.google.com/macros/s/AKfycbwIYM_8utJmG48nzk20YHfepKQIinKZqS2GDXd_v1Ylh9YU4OR-UbgxXrjRrIax43-T/exec';
}

function hwStudentUrl_(assignmentId) {
  return hwWebAppUrl_() + '?assignment=' + encodeURIComponent(assignmentId);
}

function hwReadObjects_(sheetName, headerKey) {
  var sheet = ensureSheetWithHeaders_(getSs_(), sheetName, HEADERS[headerKey]);
  var last = sheet.getLastRow();
  var cols = HEADERS[headerKey].length;
  if (last < 2) return [];
  var headers = HEADERS[headerKey];
  var values = sheet.getRange(2, 1, last - 1, cols).getValues();
  return values.map(function (row, idx) {
    var o = { _row: idx + 2 };
    headers.forEach(function (h, i) {
      o[h] = row[i];
    });
    return o;
  });
}

function hwAppend_(sheetName, headerKey, obj) {
  hwAppendMany_(sheetName, headerKey, [obj]);
}

function hwAppendMany_(sheetName, headerKey, objs) {
  if (!objs || !objs.length) return;
  var sheet = ensureSheetWithHeaders_(getSs_(), sheetName, HEADERS[headerKey]);
  var headers = HEADERS[headerKey];
  var values = objs.map(function (obj) {
    return headers.map(function (h) {
      var v = obj[h];
      return v === undefined || v === null ? '' : v;
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function hwUpdateRow_(sheetName, headerKey, rowIndex, obj) {
  var sheet = ensureSheetWithHeaders_(getSs_(), sheetName, HEADERS[headerKey]);
  var headers = HEADERS[headerKey];
  var row = headers.map(function (h) {
    var v = obj[h];
    return v === undefined || v === null ? '' : v;
  });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
}

function hwDeleteRowsWhere_(sheetName, headerKey, matchFn) {
  var rows = hwReadObjects_(sheetName, headerKey);
  var sheet = ensureSheetWithHeaders_(getSs_(), sheetName, HEADERS[headerKey]);
  var toDelete = [];
  rows.forEach(function (r) {
    if (matchFn(r)) toDelete.push(r._row);
  });
  toDelete.sort(function (a, b) { return b - a; });
  toDelete.forEach(function (rowIndex) {
    sheet.deleteRow(rowIndex);
  });
}

function hwNormSeat_(seatNo) {
  return String(seatNo || '').trim();
}

function hwNormName_(name) {
  return String(name || '').trim();
}

function hwNormClass_(className) {
  return String(className || '').trim();
}

function hwNormEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function hwGetAssignment_(id) {
  id = String(id || '').trim();
  if (!id) return null;
  var list = hwReadObjects_(SHEETS.HW_ASSIGNMENTS, 'HW_ASSIGNMENTS');
  for (var i = 0; i < list.length; i++) {
    if (String(list[i]['作業編號']).trim() === id) {
      return hwAssignmentFromRow_(list[i]);
    }
  }
  return null;
}

function hwIso_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  var d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

function hwAssignmentFromRow_(row) {
  return {
    assignmentId: String(row['作業編號'] || '').trim(),
    title: String(row['名稱'] || '').trim(),
    className: hwNormClass_(row['班級']),
    questionCount: clampInt_(row['題數'], 1, 200, 10),
    spotCount: clampInt_(row['抽查題數'], 1, 20, 2),
    startAt: hwIso_(row['開始時間']),
    dueAt: hwIso_(row['截止時間']),
    maxScore: Number(row['滿分']) || 100,
    latePenalty: Number(row['每工作天扣分']) || 10,
    minScore: Number(row['最低分']) === 0 ? 0 : (Number(row['最低分']) || 0),
    studentUrl: String(row['學生連結'] || '').trim(),
    createdAt: hwIso_(row['建立時間'])
  };
}

function hwNextId_() {
  var list = hwReadObjects_(SHEETS.HW_ASSIGNMENTS, 'HW_ASSIGNMENTS');
  var max = 0;
  list.forEach(function (row) {
    var m = String(row['作業編號'] || '').match(/^HW(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  var n = max + 1;
  var pad = String(n);
  while (pad.length < 3) pad = '0' + pad;
  return 'HW' + pad;
}

function hwCalcScore_(assignment, lateWorkdays, adjustment) {
  var maxScore = Number(assignment.maxScore) || 100;
  var minScore = Number(assignment.minScore);
  if (!isFinite(minScore)) minScore = 0;
  var penalty = Number(assignment.latePenalty);
  if (!isFinite(penalty)) penalty = 10;
  var calculated = Math.max(minScore, maxScore - (Number(lateWorkdays) || 0) * penalty);
  var adj = Number(adjustment) || 0;
  var finalScore = calculated + adj;
  if (finalScore < 0) finalScore = 0;
  return { calculated: calculated, finalScore: finalScore, penaltyPoints: (Number(lateWorkdays) || 0) * penalty };
}

function hwFindSubmission_(assignmentId, className, seatNo) {
  var rows = hwReadObjects_(SHEETS.HW_SUBMISSIONS, 'HW_SUBMISSIONS');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i]['作業編號']).trim() === assignmentId &&
        hwNormClass_(rows[i]['班級']) === className &&
        hwNormSeat_(rows[i]['座號']) === seatNo) {
      return rows[i];
    }
  }
  return null;
}

function hwSubmissionPublic_(row, assignment, sess) {
  if (!row) {
    return {
      status: '未交',
      submittedAt: '',
      lateWorkdays: '',
      calculatedScore: '',
      adjustment: 0,
      adjustmentReason: '',
      finalScore: '',
      allowMakeup: false
    };
  }
  var status = String(row['狀態'] || '').trim() || '未交';
  var adj = Number(row['教師加減']) || 0;
  return {
    status: status,
    submittedAt: hwIso_(row['提交時間']),
    lateWorkdays: status === '未交' ? '' : (Number(row['遲交工作天']) || 0),
    calculatedScore: row['計算分數'] === '' || row['計算分數'] == null ? '' : Number(row['計算分數']),
    adjustment: adj,
    adjustmentReason: String(row['調整原因'] || ''),
    finalScore: row['最終分數'] === '' || row['最終分數'] == null ? '' : Number(row['最終分數']),
    allowMakeup: String(row['允許補交']) === '是' || row['允許補交'] === true
  };
}

function hwStudentKey_(className, seatNo) {
  return hwNormClass_(className) + '\t' + hwNormSeat_(seatNo);
}

function hwCsvCell_(value) {
  var s = String(value == null ? '' : value);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function hwIndexByStudent_(rows, assignmentId) {
  var map = {};
  (rows || []).forEach(function (r) {
    if (String(r['作業編號']).trim() !== String(assignmentId || '').trim()) return;
    map[hwStudentKey_(r['班級'], r['座號'])] = r;
  });
  return map;
}

function hwImportStudentsFromSeating_(className) {
  var cn = hwNormClass_(className);
  if (!cn) throw new Error('請先選班級');
  var cloud = getCloudStore();
  var store = cloud && cloud.store ? cloud.store : null;
  var room = store && store.classes && store.classes[cn];
  if (!room || !room.students || !room.students.length) {
    throw new Error('座位表這個班還沒有學生');
  }
  var existing = hwReadObjects_(SHEETS.HW_STUDENTS, 'HW_STUDENTS');
  var toAdd = [];
  room.students.forEach(function (s) {
    var seat = hwNormSeat_(s.seatNo);
    var name = hwNormName_(s.name);
    var found = existing.some(function (r) {
      return hwNormClass_(r['班級']) === cn && hwNormSeat_(r['座號']) === seat;
    });
    if (found || !seat || !name) return;
    toAdd.push({
      '班級': cn,
      '座號': seat,
      '姓名': name,
      'Email': ''
    });
    existing.push({ '班級': cn, '座號': seat, '姓名': name });
  });
  hwAppendMany_(SHEETS.HW_STUDENTS, 'HW_STUDENTS', toAdd);
  ClassroomSyncService.syncRoster();
  return { ok: true, added: toAdd.length, className: cn };
}

function handleHwTeacher_(req, action, user) {
  req = req || {};
  if (action === 'hwListStudents') {
    var className = hwNormClass_(req.className);
    var students = hwReadObjects_(SHEETS.HW_STUDENTS, 'HW_STUDENTS').filter(function (r) {
      return !className || hwNormClass_(r['班級']) === className;
    }).map(function (r) {
      return {
        className: hwNormClass_(r['班級']),
        seatNo: hwNormSeat_(r['座號']),
        name: hwNormName_(r['姓名']),
        email: hwNormEmail_(r['Email'])
      };
    }).sort(function (a, b) {
      return seatNoValue_(a.seatNo) - seatNoValue_(b.seatNo);
    });
    return { ok: true, students: students };
  }

  if (action === 'hwImportStudents') {
    var imported = hwImportStudentsFromSeating_(req.className);
    return { ok: true, added: imported.added, className: imported.className };
  }

  if (action === 'hwListAssignments') {
    var filter = hwNormClass_(req.className);
    var list = hwReadObjects_(SHEETS.HW_ASSIGNMENTS, 'HW_ASSIGNMENTS').map(hwAssignmentFromRow_);
    if (filter) list = list.filter(function (a) { return a.className === filter; });
    list.sort(function (a, b) {
      return String(b.assignmentId).localeCompare(String(a.assignmentId));
    });
    return { ok: true, assignments: list, webAppUrl: hwWebAppUrl_(), classroomApiEnabled: CLASSROOM_API_ENABLED };
  }

  if (action === 'hwCreateAssignment') {
    return withLock_(function () {
      var classN = hwNormClass_(req.className);
      var title = String(req.title || '').trim();
      if (!classN) throw new Error('請先選班級');
      if (!title) throw new Error('請填作業名稱');
      var id = hwNextId_();
      var maxScore = Number(req.maxScore);
      if (!isFinite(maxScore)) maxScore = 100;
      var latePenalty = Number(req.latePenalty);
      if (!isFinite(latePenalty)) latePenalty = 10;
      var minScore = Number(req.minScore);
      if (!isFinite(minScore)) minScore = 0;
      var qCount = clampInt_(req.questionCount, 1, 200, 10);
      var spot = clampInt_(req.spotCount, 1, Math.max(1, qCount), 2);
      if (spot > qCount) spot = qCount;
      var startAt = req.startAt ? hwIso_(req.startAt) : new Date().toISOString();
      var dueAt = req.dueAt ? hwIso_(req.dueAt) : '';
      if (!dueAt) throw new Error('請填截止時間');
      var studentUrl = hwStudentUrl_(id);
      hwAppend_(SHEETS.HW_ASSIGNMENTS, 'HW_ASSIGNMENTS', {
        '作業編號': id,
        '名稱': title,
        '班級': classN,
        '題數': qCount,
        '抽查題數': spot,
        '開始時間': startAt,
        '截止時間': dueAt,
        '滿分': maxScore,
        '每工作天扣分': latePenalty,
        '最低分': minScore,
        '學生連結': studentUrl,
        '建立時間': new Date().toISOString()
      });
      var qRows = [];
      var qi;
      for (qi = 1; qi <= qCount; qi++) {
        qRows.push({ '作業編號': id, '題號': qi, '詳解': '' });
      }
      hwAppendMany_(SHEETS.HW_QUESTIONS, 'HW_QUESTIONS', qRows);
      var imported = { added: 0 };
      try {
        imported = hwImportStudentsFromSeating_(classN);
      } catch (importErr) {
        imported = { added: 0, error: String(importErr && importErr.message ? importErr.message : importErr) };
      }
      ClassroomSyncService.createCourseWork();
      return {
        ok: true,
        assignment: hwGetAssignment_(id),
        studentUrl: studentUrl,
        imported: imported.added || 0
      };
    });
  }

  if (action === 'hwDashboard' || action === 'hwExportCsv') {
    var asg = hwGetAssignment_(req.assignmentId);
    if (!asg) throw new Error('找不到作業');
    var roster = hwReadObjects_(SHEETS.HW_STUDENTS, 'HW_STUDENTS').filter(function (r) {
      return hwNormClass_(r['班級']) === asg.className;
    }).sort(function (a, b) {
      return seatNoValue_(a['座號']) - seatNoValue_(b['座號']);
    });
    var subMap = hwIndexByStudent_(hwReadObjects_(SHEETS.HW_SUBMISSIONS, 'HW_SUBMISSIONS'), asg.assignmentId);
    var spotMap = hwIndexByStudent_(hwReadObjects_(SHEETS.HW_SPOT, 'HW_SPOT'), asg.assignmentId);
    var wrongAll = hwReadObjects_(SHEETS.HW_WRONG, 'HW_WRONG');
    var wrongMap = {};
    wrongAll.forEach(function (r) {
      if (String(r['作業編號']).trim() !== asg.assignmentId) return;
      var k = hwStudentKey_(r['班級'], r['座號']);
      if (!wrongMap[k]) wrongMap[k] = [];
      wrongMap[k].push({ q: Number(r['題號']) || 0, reason: String(r['原因'] || '') });
    });
    var rows = roster.map(function (r) {
      var sess = {
        className: hwNormClass_(r['班級']),
        seatNo: hwNormSeat_(r['座號']),
        name: hwNormName_(r['姓名']),
        email: hwNormEmail_(r['Email'])
      };
      var key = hwStudentKey_(sess.className, sess.seatNo);
      var sub = subMap[key] || null;
      var pub = hwSubmissionPublic_(sub, asg, sess);
      var wrong = wrongMap[key] || [];
      var spotRow = spotMap[key];
      var spotNos = '';
      if (spotRow) {
        spotNos = String(spotRow['抽查題號'] || '').split(',').map(function (x) {
          return String(x).trim();
        }).filter(Boolean).join(',');
      }
      var done = pub.status && pub.status !== '未交' && pub.status !== '進行中';
      return {
        className: sess.className,
        seatNo: sess.seatNo,
        name: sess.name,
        email: sess.email,
        done: done,
        status: pub.status,
        submittedAt: pub.submittedAt,
        wrongCount: wrong.length,
        wrongNos: wrong.map(function (w) { return w.q; }).join(','),
        spotNos: spotNos,
        lateWorkdays: pub.lateWorkdays,
        penalty: done ? ((Number(asg.maxScore) || 100) - (Number(pub.calculatedScore) || 0)) : '',
        calculatedScore: pub.calculatedScore,
        adjustment: pub.adjustment,
        adjustmentReason: pub.adjustmentReason,
        finalScore: pub.finalScore,
        allowMakeup: pub.allowMakeup
      };
    });
    if (action === 'hwExportCsv') {
      var simple = ['student_email,student_name,score'];
      var full = ['student_email,student_name,seat_number,score,submitted_at,late_workdays,status'];
      rows.forEach(function (row) {
        var score = row.finalScore === '' || row.finalScore == null ? '' : row.finalScore;
        simple.push([hwCsvCell_(row.email), hwCsvCell_(row.name), hwCsvCell_(score)].join(','));
        full.push([
          hwCsvCell_(row.email),
          hwCsvCell_(row.name),
          hwCsvCell_(row.seatNo),
          hwCsvCell_(score),
          hwCsvCell_(row.submittedAt),
          hwCsvCell_(row.lateWorkdays),
          hwCsvCell_(row.status)
        ].join(','));
      });
      return {
        ok: true,
        csv: '\uFEFF' + simple.join('\r\n'),
        csvFull: '\uFEFF' + full.join('\r\n'),
        assignment: asg
      };
    }
    return { ok: true, assignment: asg, rows: rows };
  }

  if (action === 'hwAdjust') {
    var asgA = hwGetAssignment_(req.assignmentId);
    if (!asgA) throw new Error('找不到作業');
    var seatA = hwNormSeat_(req.seatNo);
    var classA = asgA.className;
    var subA = hwFindSubmission_(asgA.assignmentId, classA, seatA);
    if (!subA) throw new Error('這位學生還沒有繳交紀錄，無法調整');
    var adj = Number(req.adjustment);
    if (!isFinite(adj)) throw new Error('加減分請填數字');
    var lateA = Number(subA['遲交工作天']) || 0;
    var scoredA = hwCalcScore_(asgA, lateA, adj);
    subA['教師加減'] = adj;
    subA['調整原因'] = String(req.reason || '');
    subA['最終分數'] = scoredA.finalScore;
    subA['計算分數'] = scoredA.calculated;
    subA['調整者'] = user && user.email ? user.email : '';
    subA['調整時間'] = new Date().toISOString();
    hwUpdateRow_(SHEETS.HW_SUBMISSIONS, 'HW_SUBMISSIONS', subA._row, subA);
    ClassroomSyncService.syncGrade();
    return { ok: true };
  }

  if (action === 'hwOverride') {
    var asgO = hwGetAssignment_(req.assignmentId);
    if (!asgO) throw new Error('找不到作業');
    var seatO = hwNormSeat_(req.seatNo);
    if (!seatO || !req.customDueAt) throw new Error('請填座號與個別截止時間');
    hwDeleteRowsWhere_(SHEETS.HW_OVERRIDES, 'HW_OVERRIDES', function (r) {
      return String(r['作業編號']).trim() === asgO.assignmentId &&
        hwNormClass_(r['班級']) === asgO.className &&
        hwNormSeat_(r['座號']) === seatO;
    });
    hwAppend_(SHEETS.HW_OVERRIDES, 'HW_OVERRIDES', {
      '作業編號': asgO.assignmentId,
      '班級': asgO.className,
      '座號': seatO,
      '個別截止': hwIso_(req.customDueAt),
      '原因': String(req.reason || '')
    });
    return { ok: true };
  }

  if (action === 'hwSetMissing') {
    var asgM = hwGetAssignment_(req.assignmentId);
    if (!asgM) throw new Error('找不到作業');
    var seatM = hwNormSeat_(req.seatNo);
    var subM = hwFindSubmission_(asgM.assignmentId, asgM.className, seatM);
    var mode = String(req.mode || '').trim();
    if (mode === 'zero') {
      var recM = {
        '作業編號': asgM.assignmentId,
        '班級': asgM.className,
        '座號': seatM,
        '提交時間': subM ? subM['提交時間'] : '',
        '狀態': '未交',
        '遲交工作天': '',
        '計算分數': 0,
        '教師加減': 0,
        '調整原因': String(req.reason || '教師給 0 分'),
        '最終分數': 0,
        '調整者': user && user.email ? user.email : '',
        '調整時間': new Date().toISOString(),
        '允許補交': '否'
      };
      if (subM) hwUpdateRow_(SHEETS.HW_SUBMISSIONS, 'HW_SUBMISSIONS', subM._row, recM);
      else hwAppend_(SHEETS.HW_SUBMISSIONS, 'HW_SUBMISSIONS', recM);
      return { ok: true };
    }
    if (mode === 'allowMakeup') {
      if (!subM) {
        hwAppend_(SHEETS.HW_SUBMISSIONS, 'HW_SUBMISSIONS', {
          '作業編號': asgM.assignmentId,
          '班級': asgM.className,
          '座號': seatM,
          '提交時間': '',
          '狀態': '未交',
          '遲交工作天': '',
          '計算分數': '',
          '教師加減': 0,
          '調整原因': '',
          '最終分數': '',
          '調整者': '',
          '調整時間': '',
          '允許補交': '是'
        });
      } else {
        subM['允許補交'] = '是';
        hwUpdateRow_(SHEETS.HW_SUBMISSIONS, 'HW_SUBMISSIONS', subM._row, subM);
      }
      return { ok: true };
    }
    throw new Error('未知的未交處理');
  }

  throw new Error('未知的教師作業操作');
}

