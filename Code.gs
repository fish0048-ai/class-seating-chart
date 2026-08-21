/**
 * 班級座位表 — Google Apps Script 後端
 * 以「座位／成績」那份試算表為資料庫。課表是另一份檔案，這裡不會寫入。
 */

const SHEETS = {
  STUDENTS: '學生',
  CONFIG: '班級設定',
  HISTORY: '操作紀錄',
  HELP: '使用說明',
  CLOUD: '雲端資料'
};

const CLOUD_CHUNK = 45000;

const HEADERS = {
  STUDENTS: ['班級', '座號', '姓名', '分數', '列', '欄', '備註'],
  CONFIG: ['班級', '列數', '欄數', '版本', '更新時間'],
  HISTORY: ['時間', '班級', '類型', '座號', '姓名', '分數變化', '新分數', '詳情', '可復原', '已復原']
};

const MAX_HISTORY_ROWS = 800;

/** 你的座位表／成績資料庫（Google 試算表 ID）。課表不在這份裡。 */
const SPREADSHEET_ID = '1AES93Jv8l65YI2LQ-scVRPqYSLFxtVOD-UqIU99gQSA';

/**
 * GitHub Pages 前端會呼叫這個 API。
 * GET  ?action=bootstrap&callback=seatCb123
 * POST { "action": "save", "payload": {...} }
 */
function doGet(e) {
  e = e || { parameter: {} };
  if (e.parameter.view === 'app') {
    ensureSheets_(getSs_());
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('班級座位表')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
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
    var action = String(req.action || 'bootstrap');
    var payload = parseMaybeJson_(req.payload);
    if (payload && typeof payload === 'object' && !req.className && payload.className) {
      var merged = {};
      Object.keys(payload).forEach(function (key) { merged[key] = payload[key]; });
      Object.keys(req).forEach(function (key) { merged[key] = req[key]; });
      req = merged;
    }
    switch (action) {
      case 'bootstrap':
        return getBootstrapData();
      case 'load':
        return loadClassroom(req.className || req.class || '');
      case 'save':
        return saveClassroomState(payload && payload.className ? payload : req);
      case 'layout':
        return saveLayout(payload && payload.className ? payload : req);
      case 'score':
        return applyScoreChange({
          className: req.className,
          seatNo: req.seatNo,
          delta: Number(req.delta)
        });
      case 'undo':
        return undoLastAction(req.className);
      case 'settings':
        return saveSettings({
          className: req.className,
          rows: req.rows,
          cols: req.cols
        });
      case 'students':
        return upsertStudents({
          className: req.className,
          students: parseMaybeJson_(req.students) || (payload && payload.students) || payload || []
        });
      case 'clearClass':
        return clearClassStudents(req.className);
      case 'lottery':
        return logLottery(req);
      case 'getStore':
        return getCloudStore();
      case 'putStore':
        return putCloudStore(req.store || payload);
      default:
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
    .addItem('初始化／修復工作表', 'setupSheets')
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

/**
 * 前端啟動時一次載入所有班級資料。
 */
function getBootstrapData() {
  return withLock_(function () {
    const ss = getSs_();
    ensureSheets_(ss);
    const classNames = listClassNames_(ss);
    const className = classNames[0] || '範例班';
    return {
      ok: true,
      classNames: classNames,
      classroom: loadClassroom_(ss, className)
    };
  });
}

function loadClassroom(className) {
  return withLock_(function () {
    const ss = getSs_();
    ensureSheets_(ss);
    return {
      ok: true,
      classNames: listClassNames_(ss),
      classroom: loadClassroom_(ss, className)
    };
  });
}

/**
 * 一鍵存檔：座位座標、分數、行列設定。
 */
function saveClassroomState(state) {
  return withLock_(function () {
    const ss = getSs_();
    ensureSheets_(ss);
    const classroom = normalizeIncomingState_(state);
    persistClassroom_(ss, classroom, true);
    appendHistory_(ss, {
      className: classroom.className,
      type: '存檔',
      seatNo: '',
      name: '',
      delta: 0,
      newScore: '',
      detail: '一鍵存檔（座位與分數）',
      undoable: false
    });
    return {
      ok: true,
      classroom: loadClassroom_(ss, classroom.className),
      classNames: listClassNames_(ss)
    };
  });
}

/**
 * 加分／扣分。立即寫入試算表，方便其他載具同步。
 */
function applyScoreChange(payload) {
  return withLock_(function () {
    const ss = getSs_();
    ensureSheets_(ss);
    const className = String(payload.className || '').trim();
    const seatNo = String(payload.seatNo || '').trim();
    const delta = Number(payload.delta);
    if (!className || !seatNo || !isFinite(delta) || delta === 0) {
      throw new Error('加扣分資料不完整');
    }

    const classroom = loadClassroom_(ss, className);
    const student = classroom.students.find(function (s) {
      return String(s.seatNo) === seatNo;
    });
    if (!student) {
      throw new Error('找不到座號 ' + seatNo);
    }

    const oldScore = Number(student.score) || 0;
    student.score = oldScore + delta;
    persistClassroom_(ss, classroom, false);
    appendHistory_(ss, {
      className: className,
      type: delta > 0 ? '加分' : '扣分',
      seatNo: seatNo,
      name: student.name,
      delta: delta,
      newScore: student.score,
      detail: (delta > 0 ? '+' : '') + delta,
      undoable: true
    });

    return {
      ok: true,
      classroom: loadClassroom_(ss, className)
    };
  });
}

/**
 * 復原上一筆可復原的加扣分。
 */
function undoLastAction(className) {
  return withLock_(function () {
    const ss = getSs_();
    ensureSheets_(ss);
    className = String(className || '').trim();
    const sheet = ss.getSheetByName(SHEETS.HISTORY);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      throw new Error('沒有可復原的紀錄');
    }

    const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.HISTORY.length).getValues();
    let targetIndex = -1;
    for (let i = values.length - 1; i >= 0; i--) {
      const row = values[i];
      if (String(row[1]) === className && row[8] === true && row[9] !== true) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex < 0) {
      throw new Error('沒有可復原的加扣分');
    }

    const row = values[targetIndex];
    const seatNo = String(row[3]);
    const delta = Number(row[5]) || 0;
    const classroom = loadClassroom_(ss, className);
    const student = classroom.students.find(function (s) {
      return String(s.seatNo) === seatNo;
    });
    if (!student) {
      throw new Error('找不到要復原的學生');
    }

    student.score = (Number(student.score) || 0) - delta;
    persistClassroom_(ss, classroom, false);
    sheet.getRange(targetIndex + 2, 10).setValue(true);
    appendHistory_(ss, {
      className: className,
      type: '復原',
      seatNo: seatNo,
      name: student.name,
      delta: -delta,
      newScore: student.score,
      detail: '復原 ' + (delta > 0 ? '+' : '') + delta,
      undoable: false
    });

    return {
      ok: true,
      classroom: loadClassroom_(ss, className),
      undone: {
        seatNo: seatNo,
        name: student.name,
        reversedDelta: -delta
      }
    };
  });
}

function saveLayout(payload) {
  return withLock_(function () {
    const ss = getSs_();
    ensureSheets_(ss);
    const incoming = normalizeIncomingState_(payload);
    const current = loadClassroom_(ss, incoming.className);
    const scoreBySeat = {};
    current.students.forEach(function (s) {
      scoreBySeat[String(s.seatNo)] = s.score;
    });
    incoming.rows = current.rows;
    incoming.cols = current.cols;
    incoming.students.forEach(function (s) {
      if (Object.prototype.hasOwnProperty.call(scoreBySeat, String(s.seatNo))) {
        s.score = scoreBySeat[String(s.seatNo)];
      }
    });
    persistClassroom_(ss, incoming, false);
    return {
      ok: true,
      classroom: loadClassroom_(ss, incoming.className)
    };
  });
}

function saveSettings(payload) {
  return withLock_(function () {
    const ss = getSs_();
    ensureSheets_(ss);
    const className = String(payload.className || '').trim();
    if (!className) {
      throw new Error('請輸入班級名稱');
    }
    const rows = clampInt_(payload.rows, 1, 20, 6);
    const cols = clampInt_(payload.cols, 1, 16, 7);
    const existing = loadClassroom_(ss, className);
    existing.rows = rows;
    existing.cols = cols;
    persistClassroom_(ss, existing, true);
    return {
      ok: true,
      classNames: listClassNames_(ss),
      classroom: loadClassroom_(ss, className)
    };
  });
}

function upsertStudents(payload) {
  return withLock_(function () {
    const ss = getSs_();
    ensureSheets_(ss);
    const className = String(payload.className || '').trim();
    if (!className) {
      throw new Error('請輸入班級名稱');
    }
    const incoming = Array.isArray(payload.students) ? payload.students : [];
    if (!incoming.length) {
      throw new Error('請至少輸入一位學生');
    }

    const classroom = loadClassroom_(ss, className);
    const bySeat = {};
    classroom.students.forEach(function (s) {
      bySeat[String(s.seatNo)] = s;
    });

    incoming.forEach(function (raw) {
      const seatNo = String(raw.seatNo || '').trim();
      const name = String(raw.name || '').trim();
      if (!seatNo || !name) {
        return;
      }
      const current = bySeat[seatNo];
      if (current) {
        current.name = name;
        if (raw.score !== undefined && raw.score !== '') {
          current.score = Number(raw.score) || 0;
        }
      } else {
        bySeat[seatNo] = {
          seatNo: seatNo,
          name: name,
          score: Number(raw.score) || 0,
          row: null,
          col: null,
          note: String(raw.note || '')
        };
      }
    });

    classroom.students = Object.keys(bySeat).map(function (key) {
      return bySeat[key];
    });
    autoPlace_(classroom);
    persistClassroom_(ss, classroom, true);
    return {
      ok: true,
      classNames: listClassNames_(ss),
      classroom: loadClassroom_(ss, className)
    };
  });
}

function clearClassStudents(className) {
  return withLock_(function () {
    const ss = getSs_();
    ensureSheets_(ss);
    className = String(className || '').trim();
    if (!className) {
      throw new Error('缺少班級名稱');
    }
    const classroom = loadClassroom_(ss, className);
    classroom.students = [];
    persistClassroom_(ss, classroom, true);
    appendHistory_(ss, {
      className: className,
      type: '清空名單',
      seatNo: '',
      name: '',
      delta: 0,
      newScore: '',
      detail: '上傳名單前清空本班學生',
      undoable: false
    });
    return {
      ok: true,
      classNames: listClassNames_(ss),
      classroom: loadClassroom_(ss, className)
    };
  });
}

function logLottery(payload) {
  const ss = getSs_();
  ensureSheets_(ss);
  appendHistory_(ss, {
    className: String(payload.className || ''),
    type: '抽籤',
    seatNo: String(payload.seatNo || ''),
    name: String(payload.name || ''),
    delta: 0,
    newScore: '',
    detail: payload.detail || '隨機抽籤',
    undoable: false
  });
  return { ok: true };
}

function getSs_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
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
  return withLock_(function () {
    var ss = getSs_();
    var sheet = ensureCloudSheet_(ss);
    var json = readCloudChunks_(sheet);
    if (json) {
      try {
        return { ok: true, empty: false, store: JSON.parse(json) };
      } catch (err) {
        throw new Error('雲端資料損壞，請從備份還原');
      }
    }
    return { ok: true, empty: true, store: null };
  });
}

function putCloudStore(store) {
  if (!store || typeof store !== 'object') {
    throw new Error('沒有可儲存的資料');
  }
  return withLock_(function () {
    var ss = getSs_();
    var sheet = ensureCloudSheet_(ss);
    store.updatedAt = new Date().toISOString();
    writeCloudChunks_(sheet, JSON.stringify(store));
    return { ok: true, updatedAt: store.updatedAt };
  });
}

function ensureCloudSheet_(ss) {
  var sheet = ss.getSheetByName(SHEETS.CLOUD);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.CLOUD);
    sheet.getRange(1, 1, 1, 2).setValues([['說明', '這張表是座位表／成績的線上資料庫，請勿手動改內容。']]);
  }
  return sheet;
}

function writeCloudChunks_(sheet, json) {
  var n = Math.max(1, Math.ceil(String(json).length / CLOUD_CHUNK));
  var last = sheet.getLastRow();
  if (last > 2) {
    sheet.getRange(3, 1, last - 2, 1).clearContent();
  }
  sheet.getRange(2, 1, 1, 2).setValues([['chunkCount', n]]);
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

function ensureSheets_(ss) {
  ensureSheetWithHeaders_(ss, SHEETS.STUDENTS, HEADERS.STUDENTS);
  ensureSheetWithHeaders_(ss, SHEETS.CONFIG, HEADERS.CONFIG);
  ensureSheetWithHeaders_(ss, SHEETS.HISTORY, HEADERS.HISTORY);
  ensureCloudSheet_(ss);
  ensureHelpSheet_(ss);

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
    return;
  }
  const lines = [
    ['班級座位表使用說明'],
    [''],
    ['一、在試算表輸入學生'],
    ['1. 開啟「學生」工作表。'],
    ['2. 每一列填：班級、座號、姓名。分數可留 0。'],
    ['3. 「列」「欄」可空白，系統會依座號自動排座位。'],
    ['4. 同一個班級請使用相同的班級名稱，例如：301。'],
    [''],
    ['二、發布網頁給平板使用'],
    ['1. 上方選單：擴充功能 > Apps Script。'],
    ['2. 部署 > 新增部署作業 > 類型選「網頁應用程式」。'],
    ['3. 執行身分：我。'],
    ['4. 存取權：任何人（含匿名）或貴校 Google 帳號。'],
    ['5. 把網址加到平板主畫面，即可當座位表 App 使用。'],
    [''],
    ['三、網頁功能'],
    ['上傳名單：設定裡可上傳 CSV／Excel，欄位為班級、座號、姓名。'],
    ['拖放：按住學生卡片拖到其他座位，可對調或移到空位。'],
    ['抽籤：隨機抽出一位（可設定本堂不重複）。'],
    ['加分／扣分：先選分數，再點學生。'],
    ['復原：撤銷上一筆加扣分。'],
    ['存檔：把目前座位與分數寫回試算表。'],
    ['同步：從試算表拉取最新資料，方便換平板繼續用。'],
    [''],
    ['四、跨載具同步'],
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
    return ['範例班', seatNo, name, 0, row, col, ''];
  });
  ss.getSheetByName(SHEETS.STUDENTS)
    .getRange(2, 1, students.length, HEADERS.STUDENTS.length)
    .setValues(students);
  ss.getSheetByName(SHEETS.CONFIG)
    .getRange(2, 1, 1, HEADERS.CONFIG.length)
    .setValues([['範例班', 4, 6, 1, new Date()]]);
}

function listClassNames_(ss) {
  const names = {};
  const studentSheet = ss.getSheetByName(SHEETS.STUDENTS);
  const last = studentSheet.getLastRow();
  if (last >= 2) {
    studentSheet.getRange(2, 1, last - 1, 1).getValues().forEach(function (row) {
      const name = String(row[0] || '').trim();
      if (name) {
        names[name] = true;
      }
    });
  }
  const configSheet = ss.getSheetByName(SHEETS.CONFIG);
  const configLast = configSheet.getLastRow();
  if (configLast >= 2) {
    configSheet.getRange(2, 1, configLast - 1, 1).getValues().forEach(function (row) {
      const name = String(row[0] || '').trim();
      if (name) {
        names[name] = true;
      }
    });
  }
  return Object.keys(names).sort();
}

function loadClassroom_(ss, className) {
  className = String(className || '').trim() || '範例班';
  const config = readConfig_(ss, className);
  const students = readStudents_(ss, className);
  const classroom = {
    className: className,
    rows: config.rows,
    cols: config.cols,
    version: config.version,
    updatedAt: config.updatedAt,
    students: students
  };
  autoPlace_(classroom);
  return classroom;
}

function readConfig_(ss, className) {
  const sheet = ss.getSheetByName(SHEETS.CONFIG);
  const last = sheet.getLastRow();
  const fallback = { rows: 6, cols: 7, version: 1, updatedAt: '' };
  if (last < 2) {
    return fallback;
  }
  const values = sheet.getRange(2, 1, last - 1, HEADERS.CONFIG.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === className) {
      return {
        rows: clampInt_(values[i][1], 1, 20, 6),
        cols: clampInt_(values[i][2], 1, 16, 7),
        version: Number(values[i][3]) || 1,
        updatedAt: values[i][4] ? new Date(values[i][4]).toISOString() : ''
      };
    }
  }
  return fallback;
}

function readStudents_(ss, className) {
  const sheet = ss.getSheetByName(SHEETS.STUDENTS);
  const last = sheet.getLastRow();
  if (last < 2) {
    return [];
  }
  const values = sheet.getRange(2, 1, last - 1, HEADERS.STUDENTS.length).getValues();
  const students = [];
  values.forEach(function (row) {
    if (String(row[0]).trim() !== className) {
      return;
    }
    const seatNo = String(row[1] || '').trim();
    const name = String(row[2] || '').trim();
    if (!seatNo || !name) {
      return;
    }
    students.push({
      seatNo: seatNo,
      name: name,
      score: Number(row[3]) || 0,
      row: toNullableInt_(row[4]),
      col: toNullableInt_(row[5]),
      note: String(row[6] || '')
    });
  });
  students.sort(function (a, b) {
    return seatNoValue_(a.seatNo) - seatNoValue_(b.seatNo);
  });
  return students;
}

function persistClassroom_(ss, classroom, bumpVersion) {
  autoPlace_(classroom);
  writeStudents_(ss, classroom);
  writeConfig_(ss, classroom, bumpVersion);
}

function writeStudents_(ss, classroom) {
  const sheet = ss.getSheetByName(SHEETS.STUDENTS);
  const last = sheet.getLastRow();
  const kept = [];
  if (last >= 2) {
    const values = sheet.getRange(2, 1, last - 1, HEADERS.STUDENTS.length).getValues();
    values.forEach(function (row) {
      if (String(row[0]).trim() !== classroom.className) {
        kept.push(row);
      }
    });
  }
  const next = kept.concat(classroom.students.map(function (s) {
    return [
      classroom.className,
      s.seatNo,
      s.name,
      Number(s.score) || 0,
      s.row == null ? '' : Number(s.row) + 1,
      s.col == null ? '' : Number(s.col) + 1,
      s.note || ''
    ];
  }));
  if (last >= 2) {
    sheet.getRange(2, 1, last - 1, HEADERS.STUDENTS.length).clearContent();
  }
  if (next.length) {
    sheet.getRange(2, 1, next.length, HEADERS.STUDENTS.length).setValues(next);
  }
}

function writeConfig_(ss, classroom, bumpVersion) {
  const sheet = ss.getSheetByName(SHEETS.CONFIG);
  const last = sheet.getLastRow();
  let rowIndex = -1;
  let version = 1;
  if (last >= 2) {
    const values = sheet.getRange(2, 1, last - 1, HEADERS.CONFIG.length).getValues();
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim() === classroom.className) {
        rowIndex = i + 2;
        version = Number(values[i][3]) || 1;
        break;
      }
    }
  }
  if (bumpVersion) {
    version += 1;
  }
  const row = [classroom.className, classroom.rows, classroom.cols, version, new Date()];
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, HEADERS.CONFIG.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function appendHistory_(ss, item) {
  const sheet = ss.getSheetByName(SHEETS.HISTORY);
  sheet.appendRow([
    new Date(),
    item.className,
    item.type,
    item.seatNo,
    item.name,
    item.delta,
    item.newScore,
    item.detail,
    item.undoable === true,
    false
  ]);
  const last = sheet.getLastRow();
  if (last - 1 > MAX_HISTORY_ROWS) {
    sheet.deleteRows(2, last - 1 - MAX_HISTORY_ROWS);
  }
}

function normalizeIncomingState_(state) {
  const className = String(state.className || '').trim();
  if (!className) {
    throw new Error('缺少班級名稱');
  }
  const classroom = {
    className: className,
    rows: clampInt_(state.rows, 1, 20, 6),
    cols: clampInt_(state.cols, 1, 16, 7),
    students: (state.students || []).map(function (s) {
      return {
        seatNo: String(s.seatNo || '').trim(),
        name: String(s.name || '').trim(),
        score: Number(s.score) || 0,
        row: s.row === null || s.row === undefined || s.row === '' ? null : Number(s.row),
        col: s.col === null || s.col === undefined || s.col === '' ? null : Number(s.col),
        note: String(s.note || '')
      };
    }).filter(function (s) {
      return s.seatNo && s.name;
    })
  };
  autoPlace_(classroom);
  return classroom;
}

function autoPlace_(classroom) {
  const taken = {};
  classroom.students.forEach(function (s) {
    if (s.row == null || s.col == null) {
      return;
    }
    if (s.row < 0 || s.col < 0 || s.row >= classroom.rows || s.col >= classroom.cols) {
      s.row = null;
      s.col = null;
      return;
    }
    const key = s.row + ',' + s.col;
    if (taken[key]) {
      s.row = null;
      s.col = null;
    } else {
      taken[key] = true;
    }
  });
  classroom.students.forEach(function (s) {
    if (s.row != null && s.col != null) {
      return;
    }
    const slot = nextEmptySlot_(classroom.rows, classroom.cols, taken);
    if (!slot) {
      return;
    }
    s.row = slot.row;
    s.col = slot.col;
    taken[slot.row + ',' + slot.col] = true;
  });
}

function nextEmptySlot_(rows, cols, taken) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!taken[r + ',' + c]) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function clampInt_(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (!isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

function toNullableInt_(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const n = parseInt(value, 10);
  if (!isFinite(n) || n <= 0) {
    return null;
  }
  return n - 1;
}

function seatNoValue_(seatNo) {
  const n = parseInt(String(seatNo).replace(/\D/g, ''), 10);
  return isFinite(n) ? n : 0;
}
