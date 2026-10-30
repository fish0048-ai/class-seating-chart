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
  DAILY: '每日加扣'
};

const CLOUD_CHUNK = 45000;

const HEADERS = {
  STUDENTS: ['班級', '座號', '姓名', '分數', '列', '欄', '備註', '組別'],
  CONFIG: ['班級', '列數', '欄數', '版本', '更新時間'],
  HISTORY: ['時間', '班級', '類型', '座號', '姓名', '分數變化', '新分數', '詳情', '可復原', '已復原'],
  GRADES: ['班級', '座號', '姓名', '類型', '項目', '日期', '分數', '滿分', '狀態'],
  DAILY: ['班級', '日期', '座號', '姓名', '加扣分']
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
    if (/^hw[A-Z]/.test(action)) {
      return { ok: false, error: '作業檢核已停用' };
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
      case 'readClassroomHandouts':
        return readClassroomHandoutsApi_(req.url || (payload && payload.url));
      case 'readClassroomCourse':
        return readClassroomCourseApi_(req.className || (payload && payload.className));
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

/** 欄名含這些科名的「學習講義」是別科的，不匯入（老師教理化）。 */
const HANDOUT_OTHER_SUBJECTS_ = /公民|地理|歷史|社會|國文|國語|英文|英語|數學|本土語|閩南語|客語|健康|體育|音樂|美術|視覺|表演|童軍|家政|輔導|資訊|生科|科技/;

function spreadsheetIdFromUrl_(url) {
  var s = String(url || '').trim();
  var m = s.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{20,}$/.test(s) ? s : '';
}

/** 「9月17日」「2026/9/17」→ YYYY-MM-DD；沒寫年份時取最接近今天、不超過今天 60 天後的那一年。 */
function classroomDueDate_(text, now) {
  var s = String(text || '').trim();
  var y = 0;
  var m;
  var d;
  var full = s.match(/(\d{4})\s*[\/\-年]\s*(\d{1,2})\s*[\/\-月]\s*(\d{1,2})/);
  var md = s.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/) || s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (full) {
    y = Number(full[1]); m = Number(full[2]); d = Number(full[3]);
  } else if (md) {
    m = Number(md[1]); d = Number(md[2]);
    now = now || new Date();
    y = now.getFullYear();
    var limit = new Date(now.getTime() + 60 * 86400000);
    if (new Date(y, m - 1, d) > limit) y -= 1;
  } else {
    return '';
  }
  var dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime()) || dt.getMonth() !== m - 1 || dt.getDate() !== d) return '';
  return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

/**
 * 解析 Google Classroom 匯出的成績表：一欄是「801-01」這種班級座號，
 * 標題列有作業名稱、上一列是期限、下一列是滿分。只挑理化的「學習講義」欄。
 * 回傳的分數以「801-01」為鍵；不含姓名與 email。
 */
function parseClassroomHandouts_(values, now) {
  values = values || [];
  var codeRe = /^(\d{3})-(\d{1,2})$/;
  var codeCol = -1;
  values.some(function (row) {
    return (row || []).some(function (cell, c) {
      if (codeRe.test(String(cell || '').trim())) {
        codeCol = c;
        return true;
      }
      return false;
    });
  });
  if (codeCol < 0) return { classCodes: [], students: 0, columns: [] };
  var students = [];
  values.forEach(function (row, r) {
    var mm = String((row || [])[codeCol] || '').trim().match(codeRe);
    if (mm) students.push({ r: r, code: mm[1] + '-' + ('0' + mm[2]).slice(-2), cls: mm[1] });
  });
  var classCodes = [];
  students.forEach(function (s) {
    if (classCodes.indexOf(s.cls) < 0) classCodes.push(s.cls);
  });
  var titleRow = -1;
  for (var r = 0; r < students[0].r; r++) {
    if ((values[r] || []).some(function (cell) { return /學習講義/.test(String(cell || '')); })) {
      titleRow = r;
      break;
    }
  }
  var columns = [];
  if (titleRow >= 0) {
    (values[titleRow] || []).forEach(function (cell, c) {
      var title = String(cell || '').replace(/\s+/g, ' ').trim();
      if (!/學習講義/.test(title) || HANDOUT_OTHER_SUBJECTS_.test(title)) return;
      var maxRaw = Number(String(((values[titleRow + 1] || [])[c]) || '').trim());
      var scores = {};
      var filled = 0;
      students.forEach(function (s) {
        var raw = String(((values[s.r] || [])[c]) || '').trim();
        var n = raw === '' ? NaN : Number(raw);
        if (isFinite(n)) {
          scores[s.code] = n;
          filled += 1;
        } else if (/已繳|已交|繳交|turned\s*in|submitted/i.test(raw) && !/未繳|缺交|missing/i.test(raw)) {
          // 交了但還沒打分數
          scores[s.code] = 'submitted';
          filled += 1;
        } else {
          scores[s.code] = '';
        }
      });
      columns.push({
        title: title.slice(0, 80),
        dueDate: classroomDueDate_(titleRow > 0 ? (values[titleRow - 1] || [])[c] : '', now),
        max: isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 100,
        filled: filled,
        scores: scores
      });
    });
  }
  return { classCodes: classCodes, students: students.length, columns: columns };
}

/** 讀老師指定的 Classroom 成績表（只讀，絕不寫入那份試算表）。 */
function readClassroomHandoutsApi_(url) {
  var id = spreadsheetIdFromUrl_(url);
  if (!id) throw new Error('網址看起來不是 Google 試算表，請貼上 Classroom 成績表的網址');
  if (id === SPREADSHEET_ID || id === TIMETABLE_SPREADSHEET_ID) {
    throw new Error('這是成績庫或課表，不是 Classroom 成績表');
  }
  var ss;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (err) {
    // 不帶 Google 原始英文訊息：前端看到 "permission" 會誤判成 /exec 部署設定問題
    throw new Error('打不開這份 Classroom 成績表。請確認網址正確，而且部署 Apps Script 的教師帳號在瀏覽器裡能直接開啟這個檔案');
  }
  var best = null;
  ss.getSheets().some(function (sh) {
    var range = sh.getDataRange();
    var parsed = parseClassroomHandouts_(range ? range.getDisplayValues() : [], new Date());
    if (!parsed.students) return false;
    parsed.sheetName = sh.getName();
    if (!best || parsed.columns.length > best.columns.length) best = parsed;
    return parsed.columns.length > 0;
  });
  if (!best) throw new Error('這份試算表找不到「801-01」這種班級座號，請確認是 Classroom 匯出的成績表');
  best.ok = true;
  best.title = ss.getName();
  return best;
}

/** Classroom 學生帳號的姓名（通常姓氏就是「801-01」）→「801-01」；認不出回空字串。 */
function classroomSeatCode_(profile) {
  profile = profile || {};
  var name = profile.name || {};
  var tries = [name.familyName, name.fullName, name.givenName];
  for (var i = 0; i < tries.length; i++) {
    var m = String(tries[i] || '').match(/(?:^|\D)(\d{3})-(\d{1,2})(?!\d)/);
    if (m) return m[1] + '-' + ('0' + m[2]).slice(-2);
  }
  return '';
}

/** 老師按「發還」時沒交的學生也會變 RETURNED，要看繳交紀錄裡有沒有 TURNED_IN。 */
function classroomTurnedIn_(sub) {
  if (!sub) return false;
  if (sub.state === 'TURNED_IN') return true;
  if (sub.state !== 'RETURNED') return false;
  if (!Array.isArray(sub.submissionHistory)) return true;
  return sub.submissionHistory.some(function (h) {
    return h && h.stateHistory && h.stateHistory.state === 'TURNED_IN';
  });
}

/**
 * 把 Classroom API 的名單、作業、繳交狀態整理成和 parseClassroomHandouts_ 一樣的格式。
 * 有分數（已發還或草稿）＝分數；有繳交過但未打分＝'submitted'；其他＝空白（未繳交）。
 * 沒指派給某位學生的作業，那位學生不列入。
 */
function classroomCourseColumns_(students, courseWork, submissions) {
  var codeOf = {};
  var classCodes = [];
  var unmatched = 0;
  (students || []).forEach(function (s) {
    var code = classroomSeatCode_(s.profile);
    if (!code) {
      unmatched += 1;
      return;
    }
    codeOf[s.userId] = code;
    var cls = code.slice(0, 3);
    if (classCodes.indexOf(cls) < 0) classCodes.push(cls);
  });
  var subsByWork = {};
  (submissions || []).forEach(function (sub) {
    if (!sub || !sub.courseWorkId) return;
    (subsByWork[sub.courseWorkId] = subsByWork[sub.courseWorkId] || []).push(sub);
  });
  var columns = [];
  (courseWork || []).forEach(function (cw) {
    var title = String((cw && cw.title) || '').replace(/\s+/g, ' ').trim();
    if (!/學習講義/.test(title) || HANDOUT_OTHER_SUBJECTS_.test(title)) return;
    var scores = {};
    var filled = 0;
    (subsByWork[cw.id] || []).forEach(function (sub) {
      var code = codeOf[sub.userId];
      if (!code) return;
      var grade = sub.assignedGrade != null ? sub.assignedGrade : sub.draftGrade;
      if (grade != null && isFinite(Number(grade))) {
        scores[code] = Number(grade);
        filled += 1;
      } else if (classroomTurnedIn_(sub)) {
        scores[code] = 'submitted';
        filled += 1;
      } else {
        scores[code] = '';
      }
    });
    var due = cw.dueDate && cw.dueDate.year
      ? cw.dueDate.year + '-' + ('0' + cw.dueDate.month).slice(-2) + '-' + ('0' + cw.dueDate.day).slice(-2)
      : '';
    var max = Number(cw.maxPoints);
    columns.push({
      title: title.slice(0, 80),
      dueDate: due,
      max: isFinite(max) && max > 0 ? max : 100,
      filled: filled,
      scores: scores
    });
  });
  return { classCodes: classCodes, students: Object.keys(codeOf).length, unmatched: unmatched, columns: columns };
}

function classroomListAll_(fn, key) {
  var out = [];
  var token = '';
  for (var guard = 0; guard < 50; guard++) {
    var res = fn(token) || {};
    out = out.concat(res[key] || []);
    token = res.nextPageToken || '';
    if (!token) break;
  }
  return out;
}

/** 直接從 Classroom 讀這班的學習講義（只讀；要先在 Apps Script「服務」加入 Google Classroom API）。 */
function readClassroomCourseApi_(className) {
  var cn = String(className || '').trim();
  if (!/^\d{3}$/.test(cn)) throw new Error('班級名稱要是三位數，例如 801');
  if (typeof Classroom === 'undefined') {
    throw new Error('CLASSROOM_SERVICE_OFF：Apps Script 還沒加入 Google Classroom API 服務');
  }
  // 不帶 Google 原始英文訊息：前端看到 permission 字樣會誤判成 /exec 部署問題
  try {
    return readClassroomCourseInner_(cn);
  } catch (err) {
    var msg = String(err && err.message ? err.message : err);
    if (/^CLASSROOM_/.test(msg)) throw err;
    throw new Error('CLASSROOM_DENIED：讀不到 Classroom，請在 Apps Script 執行 authorizeClassroom 並按允許；若仍不行，可能是學校限制 Classroom API');
  }
}

function readClassroomCourseInner_(cn) {
  var courses = classroomListAll_(function (token) {
    return Classroom.Courses.list({ teacherId: 'me', courseStates: ['ACTIVE'], pageSize: 100, pageToken: token || undefined });
  }, 'courses');
  var matched = courses.filter(function (c) {
    return (String(c.name || '') + ' ' + String(c.section || '')).indexOf(cn) >= 0;
  });
  if (!matched.length) throw new Error('CLASSROOM_NO_COURSE：Classroom 找不到名稱含「' + cn + '」的課程');
  var best = { classCodes: [], students: 0, unmatched: 0, columns: [] };
  var byTitle = {};
  matched.forEach(function (course) {
    var students = classroomListAll_(function (token) {
      return Classroom.Courses.Students.list(course.id, { pageSize: 100, pageToken: token || undefined });
    }, 'students');
    var work = classroomListAll_(function (token) {
      return Classroom.Courses.CourseWork.list(course.id, { courseWorkStates: ['PUBLISHED'], pageSize: 100, pageToken: token || undefined });
    }, 'courseWork').filter(function (cw) {
      return /學習講義/.test(String(cw.title || '')) && !HANDOUT_OTHER_SUBJECTS_.test(String(cw.title || ''));
    });
    if (!work.length) return;
    var subs = classroomListAll_(function (token) {
      return Classroom.Courses.CourseWork.StudentSubmissions.list(course.id, '-', { pageSize: 1000, pageToken: token || undefined });
    }, 'studentSubmissions');
    var parsed = classroomCourseColumns_(students, work, subs);
    parsed.classCodes.forEach(function (code) {
      if (best.classCodes.indexOf(code) < 0) best.classCodes.push(code);
    });
    best.students = Math.max(best.students, parsed.students);
    best.unmatched = Math.max(best.unmatched, parsed.unmatched);
    parsed.columns.forEach(function (col) {
      var prev = byTitle[col.title];
      if (!prev || col.filled > prev.filled) byTitle[col.title] = col;
    });
  });
  best.columns = Object.keys(byTitle).map(function (t) { return byTitle[t]; }).sort(function (a, b) {
    return String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999'));
  });
  best.ok = true;
  best.source = 'classroom';
  best.title = matched.map(function (c) { return c.name; }).join('、');
  return best;
}

/**
 * 在編輯器執行，看 Classroom 實際回傳的繳交狀態（只列座號與統計，不列姓名）。
 * 要查別班就把下面的 '801' 改掉再執行。
 */
function diagnoseClassroom() {
  var cn = '801';
  var courses = classroomListAll_(function (token) {
    return Classroom.Courses.list({ teacherId: 'me', courseStates: ['ACTIVE'], pageSize: 100, pageToken: token || undefined });
  }, 'courses').filter(function (c) {
    return (String(c.name || '') + ' ' + String(c.section || '')).indexOf(cn) >= 0;
  });
  Logger.log('版本 2026-10-30b｜' + cn + ' 對到課程：' + courses.map(function (c) { return c.name; }).join('、'));
  courses.forEach(function (course) {
    var students = classroomListAll_(function (token) {
      return Classroom.Courses.Students.list(course.id, { pageSize: 100, pageToken: token || undefined });
    }, 'students');
    var codeOf = {};
    students.forEach(function (s) { codeOf[s.userId] = classroomSeatCode_(s.profile) || '?'; });
    var work = classroomListAll_(function (token) {
      return Classroom.Courses.CourseWork.list(course.id, { courseWorkStates: ['PUBLISHED'], pageSize: 100, pageToken: token || undefined });
    }, 'courseWork').filter(function (cw) {
      return /學習講義/.test(String(cw.title || '')) && !HANDOUT_OTHER_SUBJECTS_.test(String(cw.title || ''));
    });
    Logger.log('學生 ' + students.length + ' 人；學習講義 ' + work.length + ' 份');
    work.forEach(function (cw) {
      var subs = classroomListAll_(function (token) {
        return Classroom.Courses.CourseWork.StudentSubmissions.list(course.id, cw.id, { pageSize: 100, pageToken: token || undefined });
      }, 'studentSubmissions');
      var tally = {};
      var neverTurnedIn = [];
      var noHistory = 0;
      subs.forEach(function (sub) {
        var grade = sub.assignedGrade != null ? 'assigned' : (sub.draftGrade != null ? 'draft' : 'none');
        var key = sub.state + '/' + grade;
        tally[key] = (tally[key] || 0) + 1;
        if (!Array.isArray(sub.submissionHistory)) noHistory += 1;
        var turned = (sub.submissionHistory || []).some(function (h) {
          return h && h.stateHistory && h.stateHistory.state === 'TURNED_IN';
        });
        if (!turned && sub.state !== 'TURNED_IN') {
          var g = sub.assignedGrade != null ? sub.assignedGrade : sub.draftGrade;
          neverTurnedIn.push((codeOf[sub.userId] || '?').slice(-2) + (g != null ? '(' + g + '分)' : ''));
        }
      });
      Logger.log('【' + cw.title + '】' + subs.length + ' 筆｜' +
        Object.keys(tally).sort().map(function (k) { return k + '=' + tally[k]; }).join('、') +
        '｜沒有繳交紀錄欄位 ' + noHistory + ' 筆｜從沒按繳交：' + (neverTurnedIn.join(' ') || '無'));
    });
  });
}

/** 在 Apps Script 編輯器執行一次，允許「讀取 Classroom 課程、名單與作業」權限。 */
function authorizeClassroom() {
  if (typeof Classroom === 'undefined') {
    throw new Error('請先在左側「服務」按＋，加入 Google Classroom API，再執行一次');
  }
  var res = Classroom.Courses.list({ teacherId: 'me', courseStates: ['ACTIVE'], pageSize: 50 });
  var names = ((res && res.courses) || []).map(function (c) { return c.name; });
  Logger.log('已允許 Classroom 讀取。找到 ' + names.length + ' 門課程：' + names.join('、'));
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

/**
 * 學科競試算平時考試（課堂考卷），不算段考。前端 api.js 的 moveContestToQuiz_ 是同一套；
 * 合併後一定要套用，不然舊分頁段考裡同 id 的欄會被補回來，變成兩份。
 */
function moveCloudContestToQuiz_(book) {
  if (!book || !Array.isArray(book.exams)) return book;
  var isContest = function (col) { return col && /學科競試/.test(String(col.title || '')); };
  var contest = book.exams.filter(isContest);
  if (!contest.length) return book;
  book.exams = book.exams.filter(function (col) { return !isContest(col); });
  if (!Array.isArray(book.yellow)) book.yellow = [];
  contest.forEach(function (col) {
    var hit = book.yellow.filter(function (y) { return y && String(y.id) === String(col.id); })[0];
    if (hit) hit.scores = mergeCloudScoreMap_(hit.scores || {}, col.scores || {});
    else book.yellow.push(col);
  });
  return book;
}

/**
 * 已刪除的成績欄 id（removedCols）。合併會把另一邊仍有的欄補回來，所以兩邊的刪除紀錄要合併，
 * 再把這些 id 從所有成績類別排除（前端 api.js 的 applyRemovedCols_ 是同一套）。
 */
function removeCloudDeletedCols_(book) {
  if (!book) return book;
  var rm = {};
  Object.keys(book.removedCols && typeof book.removedCols === 'object' ? book.removedCols : {}).forEach(function (id) {
    if (id) rm[String(id)] = String(book.removedCols[id] || '1');
  });
  book.removedCols = rm;
  if (!Object.keys(rm).length) return book;
  ['yellow', 'morning', 'exams', 'labs', 'practicals', 'homeworks'].forEach(function (key) {
    if (Array.isArray(book[key])) {
      book[key] = book[key].filter(function (col) { return !(col && rm[String(col.id)]); });
    }
  });
  return book;
}

function mergeCloudGradeBook_(localBook, remoteBook) {
  var merged = mergeCloudGradeBookRaw_(localBook, remoteBook);
  merged.removedCols = Object.assign({},
    (remoteBook && remoteBook.removedCols) || {},
    (localBook && localBook.removedCols) || {});
  return moveCloudContestToQuiz_(removeCloudDeletedCols_(merged));
}

function mergeCloudGradeBookRaw_(localBook, remoteBook) {
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
  Object.keys(store.grades).forEach(function (cn) {
    removeCloudDeletedCols_(store.grades[cn]);
    moveCloudContestToQuiz_(store.grades[cn]);
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
  store.classroomSources = mergeCloudClassroomSources_(store.classroomSources, existing.classroomSources);
  if ((!store.hwMissing || !Object.keys(store.hwMissing).length) && existing.hwMissing) {
    store.hwMissing = existing.hwMissing;
  }
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

/** 各班 Classroom 成績表網址：較新的 updatedAt 為準；舊分頁沒有這份設定時保留雲端的。 */
function mergeCloudClassroomSources_(local, remote) {
  var ok = function (x) { return x && typeof x === 'object' && x.urls && typeof x.urls === 'object'; };
  if (!ok(local)) return ok(remote) ? remote : { urls: {}, updatedAt: '' };
  if (!ok(remote)) return local;
  return String(local.updatedAt || '') >= String(remote.updatedAt || '') ? local : remote;
}

/** 代課：kind in＝我代別人、out＝別人代我、off＝學生活動停課（periods 多節）。所有欄位都要保留，舊分頁沒有代課資料也不能清掉雲端。 */
function mergeCloudSubstitutes_(localList, remoteList) {
  var byId = {};
  function take(item) {
    if (!item || typeof item !== 'object') return;
    var id = String(item.id || '').trim();
    if (!id) return;
    var kind = String(item.kind || '').trim();
    var periods = [];
    (Array.isArray(item.periods) ? item.periods : []).forEach(function (p) {
      p = String(p == null ? '' : p).trim().slice(0, 20);
      if (p && periods.indexOf(p) < 0) periods.push(p);
    });
    if (periods.length > 20) periods = periods.slice(0, 20);
    var period = String(item.period || '').trim().slice(0, 20);
    if (kind === 'off') {
      if (!periods.length && period) periods = [period];
      period = periods[0] || '';
    }
    var norm = {
      id: id,
      kind: kind === 'in' || kind === 'out' || kind === 'off' ? kind : '',
      date: normalizeCloudHwDueDate_(item.date),
      period: period,
      periods: kind === 'off' ? periods : [],
      className: String(item.className || '').trim().slice(0, 20),
      teacher: String(item.teacher || '').trim().slice(0, 20),
      note: String(item.note || '').trim().slice(0, 120),
      deleted: !!item.deleted,
      createdAt: String(item.createdAt || ''),
      updatedAt: String(item.updatedAt || item.createdAt || '')
    };
    if (!norm.deleted && (!norm.kind || !norm.date || !norm.period ||
        (norm.kind !== 'off' && !norm.className))) return;
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
  Object.keys(books).forEach(function (cn) {
    removeCloudDeletedCols_(books[cn]);
    moveCloudContestToQuiz_(books[cn]);
  });
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
        var title = (String((col && col.title) || '').trim() || '未命名') + (col && col.excluded ? '（暫不計算）' : '');
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
      var title = (String((col && col.title) || '').trim() || '作業') + (col && col.excluded ? '（暫不計算）' : '');
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
    ['5. 分數是從座位表網頁存檔後寫進來的；若這幾張表是空的，請到網頁教師模式改一筆再同步。'],
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
