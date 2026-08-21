(function (global) {
  var KEY = 'class-seating-v1';

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clampInt(value, min, max, fallback) {
    var n = parseInt(value, 10);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  var rollNotice = null;

  function formatDateKey_(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function todayKey_() {
    return formatDateKey_(new Date());
  }

  function scoreDateFromNow_(now) {
    var d = now ? new Date(now.getTime()) : new Date();
    if (d.getHours() >= 22) d.setDate(d.getDate() + 1);
    return formatDateKey_(d);
  }

  function localDateKeyFromIso_(iso) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return todayKey_();
    return formatDateKey_(d);
  }

  function inferScoreDate_(store) {
    var latest = '';
    Object.keys(store.classes || {}).forEach(function (cn) {
      var iso = store.classes[cn] && store.classes[cn].updatedAt;
      if (!iso) return;
      var key = localDateKeyFromIso_(iso);
      if (!latest || key > latest) latest = key;
    });
    return latest || todayKey_();
  }

  function takeRollNotice_() {
    var notice = rollNotice;
    rollNotice = null;
    return notice;
  }

  function withRoll_(data, store) {
    var notice = takeRollNotice_();
    data.activeDate = store.scoreDate || scoreDateFromNow_();
    data.rolled = !!(notice && notice.rolled);
    data.closedDate = notice && notice.closedDate ? notice.closedDate : '';
    return data;
  }

  function makeDayRecord_(room, date, inProgress) {
    var summary = summarizeStudents_(room.students);
    return {
      date: date,
      settledAt: inProgress ? '' : nowIso(),
      inProgress: !!inProgress,
      students: (room.students || []).map(function (s) {
        return { seatNo: s.seatNo, name: s.name, score: Number(s.score) || 0 };
      }),
      total: summary.total,
      plusCount: summary.plusCount,
      minusCount: summary.minusCount,
      zeroCount: summary.zeroCount,
      average: summary.average
    };
  }

  function settleClassDate_(store, className, date) {
    var room = ensureClass(store, className);
    store.daily = store.daily || {};
    store.daily[className] = store.daily[className] || [];
    var already = store.daily[className].some(function (item) {
      return item.date === date;
    });
    var hasScore = (room.students || []).some(function (s) {
      return Number(s.score) !== 0;
    });
    if (hasScore) {
      var record = makeDayRecord_(room, date, false);
      store.daily[className] = store.daily[className].filter(function (item) {
        return item.date !== date;
      });
      store.daily[className].push(record);
      if (!already) {
        addHistory(store, {
          className: className,
          type: '每日結算',
          seatNo: '',
          name: '',
          delta: 0,
          newScore: 0,
          detail: date + ' 晚上10點自動存檔，總分 ' + record.total,
          undoable: false
        });
      }
    }
    room.students.forEach(function (s) {
      s.score = 0;
    });
    autoPlace(room);
    room.updatedAt = nowIso();
    store.classes[className] = room;
  }

  function ensureRolledScores_(store) {
    var active = scoreDateFromNow_();
    if (!store.scoreDate) store.scoreDate = inferScoreDate_(store);
    if (store.scoreDate === active) return false;
    var closed = store.scoreDate;
    Object.keys(store.classes || {}).forEach(function (cn) {
      settleClassDate_(store, cn, closed);
    });
    store.scoreDate = active;
    rollNotice = { rolled: true, closedDate: closed, activeDate: active };
    return true;
  }

  function summarizeStudents_(students) {
  var total = 0;
  var plusCount = 0;
  var minusCount = 0;
  var zeroCount = 0;
  (students || []).forEach(function (s) {
    var score = Number(s.score) || 0;
    total += score;
    if (score > 0) plusCount += 1;
    else if (score < 0) minusCount += 1;
    else zeroCount += 1;
  });
  var n = (students || []).length;
  return {
    total: total,
    plusCount: plusCount,
    minusCount: minusCount,
    zeroCount: zeroCount,
    average: n ? Math.round((total / n) * 10) / 10 : 0
  };
}

  var GRADE_LISTS_ = {
    yellow: { key: 'yellow', title: '課堂考卷' },
    morning: { key: 'morning', title: '早自習小考' },
    exam: { key: 'exams', title: '段考' },
    lab: { key: 'labs', title: '實作評量' },
    practical: { key: 'practicals', title: '實作成績' },
    homework: { key: 'homeworks', title: '作業' }
  };

  function defaultGradeRules_() {
    return {
      base: 60,
      classWeight: 40,
      quizWeight: 30,
      examWeight: 30,
      latePenalty: 10,
      lateWorkDays: 1,
      holidays: [],
      min: 0,
      max: 100
    };
  }

  function ensureGrades_(store, className) {
    store.grades = store.grades || {};
    if (!store.grades[className]) store.grades[className] = {};
    var book = store.grades[className];
    book.rules = Object.assign({}, defaultGradeRules_(), book.rules || {});
    if (!Array.isArray(book.yellow) || (!book.yellow.length && Array.isArray(book.quizzes) && book.quizzes.length)) {
      book.yellow = Array.isArray(book.quizzes) ? book.quizzes : [];
    }
    if (!Array.isArray(book.morning)) book.morning = [];
    if (!Array.isArray(book.exams)) book.exams = [];
    if (!Array.isArray(book.labs)) book.labs = [];
    if (!Array.isArray(book.practicals)) book.practicals = [];
    if (!Array.isArray(book.homeworks)) book.homeworks = [];
    return book;
  }

  function normalizeScoreMap_(raw) {
    var scores = {};
    Object.keys(raw || {}).forEach(function (seatNo) {
      var v = raw[seatNo];
      if (v === 'leave' || v === '請假') {
        scores[String(seatNo)] = 'leave';
        return;
      }
      var n = Number(v);
      if (isFinite(n)) scores[String(seatNo)] = n;
    });
    return scores;
  }

  function normalizeGradeColumns_(list) {
    return (list || []).map(function (raw) {
      return {
        id: String(raw.id || ('g' + Date.now())),
        title: String(raw.title || '').trim() || '未命名',
        date: String(raw.date || todayKey_()),
        max: clampInt(raw.max, 1, 200, 100),
        scores: normalizeScoreMap_(raw.scores)
      };
    });
  }

  function normalizeHolidayList_(value) {
    var text = Array.isArray(value) ? value.join(',') : String(value || '');
    var out = [];
    text.split(/[,\s;]+/).forEach(function (item) {
      var key = String(item || '').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && out.indexOf(key) < 0) out.push(key);
    });
    return out;
  }

  function normalizeHomeworkColumns_(list) {
    return (list || []).map(function (raw) {
      var records = {};
      Object.keys(raw.records || {}).forEach(function (seatNo) {
        var rec = raw.records[seatNo] || {};
        var item = { status: rec.status === 'submitted' ? 'submitted' : 'missing' };
        if (item.status === 'submitted') {
          if (rec.score !== '' && rec.score != null && isFinite(Number(rec.score))) {
            item.score = Number(rec.score);
          }
          if (rec.submittedAt) item.submittedAt = String(rec.submittedAt);
        }
        records[String(seatNo)] = item;
      });
      return {
        id: String(raw.id || ('h' + Date.now())),
        title: String(raw.title || '').trim() || '作業',
        date: String(raw.date || todayKey_()),
        dueDate: String(raw.dueDate || raw.date || todayKey_()),
        max: clampInt(raw.max, 1, 200, 100),
        records: records
      };
    });
  }

  function gradebookResult_(className, book) {
    return wrap({
      ok: true,
      className: className,
      rules: clone(book.rules),
      yellow: clone(book.yellow || []),
      morning: clone(book.morning || []),
      exams: clone(book.exams || []),
      labs: clone(book.labs || []),
      practicals: clone(book.practicals || []),
      homeworks: clone(book.homeworks || [])
    });
  }

  function wrap(result) {
    return Promise.resolve(result);
  }

  var memStore = null;
  var hydrated = false;
  var saveTimer = null;
  var lastPushAt = '';
  var cloudError = '';
  var cloudSaving = false;

  function cloudOn() {
    return typeof CloudStore !== 'undefined' && CloudStore.enabled();
  }

  function normalizeLoadedStore_(parsed) {
    if (!parsed || !parsed.classes) return null;
    if (!parsed.daily) parsed.daily = {};
    if (!parsed.history) parsed.history = [];
    if (!parsed.grades) parsed.grades = {};
    return parsed;
  }

  function readLegacyLocal_() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return normalizeLoadedStore_(JSON.parse(raw));
    } catch (err) {
      return null;
    }
  }

  function clearLegacyLocal_() {
    try { localStorage.removeItem(KEY); } catch (err) {}
  }

  function loadStore() {
    if (!memStore) {
      memStore = { classes: {}, history: [], daily: {}, grades: {}, scoreDate: scoreDateFromNow_() };
    }
    if (!memStore.daily) memStore.daily = {};
    if (!memStore.history) memStore.history = [];
    if (!memStore.grades) memStore.grades = {};
    if (hydrated && ensureRolledScores_(memStore)) saveStore(memStore);
    return memStore;
  }

  function saveStore(store) {
    memStore = store;
    if (!hydrated) return;
    store.updatedAt = nowIso();
    if (!cloudOn()) {
      try {
        localStorage.setItem(KEY, JSON.stringify(store));
      } catch (err) {}
      return;
    }
    scheduleCloudSave_();
  }

  function notifyCloud_(phase) {
    try {
      document.dispatchEvent(new CustomEvent('seat-cloud', { detail: { phase: phase || '' } }));
    } catch (err) {}
  }

  function scheduleCloudSave_() {
    if (!cloudOn() || !hydrated || !memStore) return;
    cloudSaving = true;
    notifyCloud_('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      pushCloud_(memStore).catch(function () {});
    }, 400);
  }

  function pushCloud_(store, attempt) {
    if (!cloudOn() || !store) return Promise.resolve();
    attempt = attempt || 1;
    cloudSaving = true;
    lastPushAt = store.updatedAt || nowIso();
    store.updatedAt = lastPushAt;
    notifyCloud_('saving');
    return CloudStore.putStore(store).then(function (data) {
      cloudSaving = false;
      cloudError = '';
      if (data && data.updatedAt) {
        store.updatedAt = data.updatedAt;
        lastPushAt = data.updatedAt;
      }
      notifyCloud_('ok');
      return data;
    }).catch(function (err) {
      if (attempt < 3) {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            pushCloud_(store, attempt + 1).then(resolve, reject);
          }, 700 * attempt);
        });
      }
      cloudSaving = false;
      cloudError = err && err.message ? err.message : '雲端存檔失敗';
      notifyCloud_('error');
      return Promise.reject(err);
    });
  }

  function hydrateFromCloud_() {
    if (!cloudOn()) {
      return Promise.reject(Object.assign(new Error('尚未連上雲端資料庫。請到教師模式 → 設定與上傳，貼上 Apps Script 網址。'), { code: 'NO_CLOUD' }));
    }
    return CloudStore.getStore().then(function (data) {
      var remote = data && data.store ? normalizeLoadedStore_(data.store) : null;
      cloudError = '';
      if (remote) {
        memStore = remote;
        hydrated = true;
        clearLegacyLocal_();
        if (ensureRolledScores_(memStore)) saveStore(memStore);
        return memStore;
      }
      memStore = hasClasses_(memStore) ? memStore : (readLegacyLocal_() || seedStore());
      hydrated = true;
      return pushCloud_(memStore).then(function () {
        clearLegacyLocal_();
        return memStore;
      });
    });
  }

  function hasClasses_(store) {
    return !!(store && store.classes && Object.keys(store.classes).length);
  }

  function seedStore() {
    var names = ['陳安安', '林冠宇', '黃詩涵', '張承恩', '吳品萱', '劉子豪', '蔡宜庭', '楊柏宇', '許雅琪', '周子翔', '羅欣怡', '簡廷偉'];
    var students = names.map(function (name, i) {
      return {
        seatNo: String(i + 1).padStart(2, '0'),
        name: name,
        score: 0,
        row: Math.floor(i / 6),
        col: i % 6,
        note: ''
      };
    });
    return {
      classes: {
        '範例班': {
          className: '範例班',
          rows: 4,
          cols: 6,
          version: 1,
          updatedAt: nowIso(),
          students: students
        }
      },
      history: [],
      daily: {},
      grades: {},
      scoreDate: scoreDateFromNow_()
    };
  }

  function cloudStatusPayload_() {
    return {
      enabled: cloudOn(),
      url: cloudOn() ? CloudStore.url() : '',
      sheetUrl: typeof CloudStore !== 'undefined' ? CloudStore.spreadsheetUrl() : '',
      hydrated: hydrated,
      saving: cloudSaving,
      error: cloudError,
      updatedAt: memStore && memStore.updatedAt ? memStore.updatedAt : '',
      localOnly: !cloudOn()
    };
  }

  function bootstrapPayload_(store) {
    var names = classNames(store);
    return Object.assign(payload(store, names[0] || '範例班'), { cloud: cloudStatusPayload_() });
  }

  function classNames(store) {
    return Object.keys(store.classes).sort();
  }

  function ensureClass(store, className) {
    if (!store.classes[className]) {
      store.classes[className] = {
        className: className,
        rows: 6,
        cols: 7,
        version: 1,
        updatedAt: nowIso(),
        students: []
      };
    }
    return store.classes[className];
  }

  function autoPlace(classroom) {
    var taken = {};
    classroom.students.forEach(function (s) {
      if (s.row == null || s.col == null || s.row < 0 || s.col < 0 || s.row >= classroom.rows || s.col >= classroom.cols) {
        s.row = null;
        s.col = null;
        return;
      }
      var key = s.row + ',' + s.col;
      if (taken[key]) {
        s.row = null;
        s.col = null;
      } else {
        taken[key] = true;
      }
    });
    classroom.students.forEach(function (s) {
      if (s.row != null && s.col != null) return;
      for (var r = 0; r < classroom.rows && s.row == null; r++) {
        for (var c = 0; c < classroom.cols; c++) {
          if (!taken[r + ',' + c]) {
            s.row = r;
            s.col = c;
            taken[r + ',' + c] = true;
            break;
          }
        }
      }
    });
    classroom.students.sort(function (a, b) {
      return parseInt(String(a.seatNo).replace(/\D/g, ''), 10) - parseInt(String(b.seatNo).replace(/\D/g, ''), 10);
    });
    return classroom;
  }

  function payload(store, className) {
    var room = ensureClass(store, className);
    autoPlace(room);
    return withRoll_({
      ok: true,
      classNames: classNames(store),
      classroom: clone(room)
    }, store);
  }

  function persistRoom(store, classroom, bump) {
    autoPlace(classroom);
    if (bump) classroom.version = (Number(classroom.version) || 1) + 1;
    classroom.updatedAt = nowIso();
    store.classes[classroom.className] = classroom;
    saveStore(store);
  }

  function addHistory(store, item) {
    store.history = store.history || [];
    store.history.push({
      time: nowIso(),
      className: item.className,
      type: item.type,
      seatNo: item.seatNo,
      name: item.name,
      delta: item.delta || 0,
      newScore: item.newScore,
      detail: item.detail || '',
      undoable: item.undoable === true,
      undone: false
    });
    if (store.history.length > 800) store.history = store.history.slice(-800);
  }

  function normalize(state) {
    var className = String(state.className || '').trim();
    if (!className) throw new Error('缺少班級名稱');
    return {
      className: className,
      rows: clampInt(state.rows, 1, 20, 6),
      cols: clampInt(state.cols, 1, 16, 7),
      version: Number(state.version) || 1,
      updatedAt: state.updatedAt || nowIso(),
      students: (state.students || []).map(function (s) {
        return {
          seatNo: String(s.seatNo || '').trim(),
          name: String(s.name || '').trim(),
          score: Number(s.score) || 0,
          row: s.row === null || s.row === undefined || s.row === '' ? null : Number(s.row),
          col: s.col === null || s.col === undefined || s.col === '' ? null : Number(s.col),
          note: String(s.note || '')
        };
      }).filter(function (s) { return s.seatNo && s.name; })
    };
  }

  global.SeatDB = {
    getBootstrapData: function () {
      if (hydrated) {
        return wrap(bootstrapPayload_(loadStore()));
      }
      if (!cloudOn()) {
        memStore = readLegacyLocal_() || seedStore();
        hydrated = true;
        cloudError = '尚未連上雲端資料庫';
        return wrap(bootstrapPayload_(memStore));
      }
      return hydrateFromCloud_().then(function (store) {
        return bootstrapPayload_(store);
      });
    },
    cloudStatus: function () {
      return cloudStatusPayload_();
    },
    connectCloud: function (url, className) {
      if (typeof CloudStore === 'undefined') {
        return Promise.reject(new Error('雲端模組尚未載入'));
      }
      url = String(url || '').trim();
      if (!url || url.indexOf('/exec') < 0) {
        return Promise.reject(new Error('請貼上結尾是 /exec 的網頁應用程式網址'));
      }
      CloudStore.setUrl(url);
      hydrated = false;
      cloudError = '';
      return hydrateFromCloud_().then(function (store) {
        var names = classNames(store);
        var current = className && store.classes[className] ? className : (names[0] || '範例班');
        return Object.assign(payload(store, current), { cloud: cloudStatusPayload_() });
      });
    },
    flushCloud: function () {
      if (!cloudOn() || !memStore || !hydrated) {
        return wrap(cloudStatusPayload_());
      }
      clearTimeout(saveTimer);
      return pushCloud_(memStore).then(function () {
        return cloudStatusPayload_();
      });
    },
    pullIfNewer: function (className) {
      if (!cloudOn() || !hydrated || cloudSaving) {
        return wrap({ changed: false, cloud: cloudStatusPayload_() });
      }
      return CloudStore.getStore().then(function (data) {
        var remote = data && data.store ? normalizeLoadedStore_(data.store) : null;
        if (!remote || !remote.updatedAt) {
          return { changed: false, cloud: cloudStatusPayload_() };
        }
        var localAt = (memStore && memStore.updatedAt) || '';
        if (!localAt || remote.updatedAt > localAt) {
          if (remote.updatedAt === lastPushAt) {
            return { changed: false, cloud: cloudStatusPayload_() };
          }
          memStore = remote;
          cloudError = '';
          var names = classNames(memStore);
          var target = className && memStore.classes[className] ? className : (names[0] || '範例班');
          return Object.assign(payload(memStore, target), {
            changed: true,
            cloud: cloudStatusPayload_()
          });
        }
        return { changed: false, cloud: cloudStatusPayload_() };
      });
    },
    loadClassroom: function (className) {
      var store = loadStore();
      return wrap(payload(store, String(className || '').trim() || classNames(store)[0]));
    },
    saveClassroomState: function (state) {
      var store = loadStore();
      var classroom = normalize(state);
      persistRoom(store, classroom, true);
      addHistory(store, { className: classroom.className, type: '存檔', detail: '一鍵存檔', undoable: false });
      saveStore(store);
      return wrap(payload(store, classroom.className));
    },
    saveLayout: function (state) {
      var store = loadStore();
      var incoming = normalize(state);
      var current = ensureClass(store, incoming.className);
      var scores = {};
      current.students.forEach(function (s) { scores[String(s.seatNo)] = s.score; });
      incoming.rows = current.rows;
      incoming.cols = current.cols;
      incoming.version = current.version;
      incoming.students.forEach(function (s) {
        if (Object.prototype.hasOwnProperty.call(scores, String(s.seatNo))) s.score = scores[String(s.seatNo)];
      });
      persistRoom(store, incoming, false);
      return wrap(payload(store, incoming.className));
    },
    applyScoreChange: function (body) {
      var store = loadStore();
      var className = String(body.className || '').trim();
      var seatNo = String(body.seatNo || '').trim();
      var delta = Number(body.delta);
      if (!className || !seatNo || !isFinite(delta) || delta === 0) throw new Error('加扣分資料不完整');
      var room = ensureClass(store, className);
      var student = room.students.filter(function (s) { return String(s.seatNo) === seatNo; })[0];
      if (!student) throw new Error('找不到座號 ' + seatNo);
      student.score = (Number(student.score) || 0) + delta;
      persistRoom(store, room, false);
      addHistory(store, {
        className: className,
        type: delta > 0 ? '加分' : '扣分',
        seatNo: seatNo,
        name: student.name,
        delta: delta,
        newScore: student.score,
        detail: (delta > 0 ? '+' : '') + delta,
        undoable: true
      });
      saveStore(store);
      return wrap(payload(store, className));
    },
    undoLastAction: function (className) {
      var store = loadStore();
      className = String(className || '').trim();
      var history = store.history || [];
      var idx = -1;
      for (var i = history.length - 1; i >= 0; i--) {
        if (history[i].className === className && history[i].undoable && !history[i].undone) {
          idx = i;
          break;
        }
      }
      if (idx < 0) throw new Error('沒有可復原的加扣分');
      var item = history[idx];
      var room = ensureClass(store, className);
      var student = room.students.filter(function (s) { return String(s.seatNo) === String(item.seatNo); })[0];
      if (!student) throw new Error('找不到要復原的學生');
      student.score = (Number(student.score) || 0) - Number(item.delta || 0);
      item.undone = true;
      persistRoom(store, room, false);
      addHistory(store, {
        className: className,
        type: '復原',
        seatNo: item.seatNo,
        name: student.name,
        delta: -Number(item.delta || 0),
        newScore: student.score,
        detail: '復原',
        undoable: false
      });
      saveStore(store);
      var data = payload(store, className);
      data.undone = { seatNo: item.seatNo, name: student.name, reversedDelta: -Number(item.delta || 0) };
      return wrap(data);
    },
    resetScores: function (className) {
      var store = loadStore();
      className = String(className || '').trim();
      if (!className) throw new Error('缺少班級名稱');
      var room = ensureClass(store, className);
      room.students.forEach(function (s) {
        s.score = 0;
      });
      (store.history || []).forEach(function (item) {
        if (item.className === className && item.undoable) item.undone = true;
      });
      persistRoom(store, room, true);
      addHistory(store, {
        className: className,
        type: '重製加扣分',
        seatNo: '',
        name: '',
        delta: 0,
        newScore: 0,
        detail: '本班分數全部歸零',
        undoable: false
      });
      saveStore(store);
      return wrap(payload(store, className));
    },
    saveSettings: function (body) {
      var store = loadStore();
      var className = String(body.className || '').trim();
      if (!className) throw new Error('請輸入班級名稱');
      var room = ensureClass(store, className);
      room.rows = clampInt(body.rows, 1, 20, 6);
      room.cols = clampInt(body.cols, 1, 16, 7);
      persistRoom(store, room, true);
      return wrap(payload(store, className));
    },
    upsertStudents: function (body) {
      var store = loadStore();
      var className = String(body.className || '').trim();
      if (!className) throw new Error('請輸入班級名稱');
      var incoming = body.students || [];
      if (!incoming.length) throw new Error('請至少輸入一位學生');
      var room = ensureClass(store, className);
      var bySeat = {};
      room.students.forEach(function (s) { bySeat[String(s.seatNo)] = s; });
      incoming.forEach(function (raw) {
        var seatNo = String(raw.seatNo || '').trim();
        var name = String(raw.name || '').trim();
        if (!seatNo || !name) return;
        if (bySeat[seatNo]) {
          bySeat[seatNo].name = name;
          if (raw.score !== undefined && raw.score !== '') {
            bySeat[seatNo].score = Number(raw.score) || 0;
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
      room.students = Object.keys(bySeat).map(function (k) { return bySeat[k]; });
      persistRoom(store, room, true);
      return wrap(payload(store, className));
    },
    clearClassStudents: function (className) {
      var store = loadStore();
      className = String(className || '').trim();
      if (!className) throw new Error('缺少班級名稱');
      var room = ensureClass(store, className);
      room.students = [];
      persistRoom(store, room, true);
      return wrap(payload(store, className));
    },
    logLottery: function () {
      return wrap({ ok: true });
    },
    listRecords: function () {
      var store = loadStore();
      var rows = [];
      classNames(store).forEach(function (cn) {
        ensureClass(store, cn).students.forEach(function (s) {
          rows.push({
            className: cn,
            seatNo: s.seatNo,
            name: s.name,
            score: Number(s.score) || 0
          });
        });
      });
      return wrap(withRoll_({ ok: true, rows: rows, classNames: classNames(store) }, store));
    },
    saveRecords: function (body) {
      var store = loadStore();
      var incoming = (body && body.rows) || [];
      var mode = (body && body.mode) || 'all';
      var targetClass = String((body && body.className) || '').trim();
      var grouped = {};
      incoming.forEach(function (raw) {
        var className = String(raw.className || '').trim();
        var seatNo = String(raw.seatNo || '').trim();
        var name = String(raw.name || '').trim();
        if (!className || !seatNo || !name) return;
        if (mode === 'class' && targetClass && className !== targetClass) return;
        if (!grouped[className]) grouped[className] = [];
        grouped[className].push({
          seatNo: seatNo,
          name: name,
          score: isFinite(Number(raw.score)) ? Number(raw.score) : 0
        });
      });
      var names = Object.keys(grouped);
      if (mode === 'class') {
        if (!targetClass) throw new Error('缺少班級名稱');
        if (!grouped[targetClass] || !grouped[targetClass].length) {
          throw new Error('這個班請至少保留一位學生');
        }
        names = [targetClass];
      } else if (!names.length) {
        throw new Error('請至少保留一位學生');
      }

      names.forEach(function (cn) {
        var room = ensureClass(store, cn);
        var pos = {};
        room.students.forEach(function (s) {
          pos[String(s.seatNo)] = { row: s.row, col: s.col, note: s.note || '' };
        });
        room.students = grouped[cn].map(function (s) {
          var old = pos[s.seatNo] || {};
          return {
            seatNo: s.seatNo,
            name: s.name,
            score: s.score,
            row: old.row == null ? null : old.row,
            col: old.col == null ? null : old.col,
            note: old.note || ''
          };
        });
        persistRoom(store, room, true);
      });

      if (mode === 'all') {
        Object.keys(store.classes).forEach(function (cn) {
          if (!grouped[cn]) delete store.classes[cn];
        });
        saveStore(store);
      }

      var stay = targetClass && store.classes[targetClass] ? targetClass : names[0];
      return wrap(payload(store, stay));
    },
    listDaily: function (className) {
      var store = loadStore();
      className = String(className || '').trim();
      var room = ensureClass(store, className);
      var active = store.scoreDate || scoreDateFromNow_();
      var days = ((store.daily || {})[className] || []).slice();
      var live = makeDayRecord_(room, active, true);
      live.count = room.students.length;
      var hasActive = days.some(function (item) { return item.date === active; });
      if (!hasActive) days.push(live);
      days.sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
      return wrap(withRoll_({
        ok: true,
        className: className,
        activeDate: active,
        today: live,
        days: days
      }, store));
    },
    settleToday: function (className) {
      var store = loadStore();
      className = String(className || '').trim();
      if (!className) throw new Error('缺少班級名稱');
      return wrap(withRoll_(payload(store, className), store));
    },
    getClassStats: function (className) {
      var store = loadStore();
      className = String(className || '').trim();
      var room = ensureClass(store, className);
      var active = store.scoreDate || scoreDateFromNow_();
      var days = ((store.daily || {})[className] || []).slice().sort(function (a, b) {
        return String(a.date).localeCompare(String(b.date));
      });
      var totals = {};
      room.students.forEach(function (s) {
        totals[String(s.seatNo)] = {
          seatNo: s.seatNo,
          name: s.name,
          settledTotal: 0,
          todayScore: Number(s.score) || 0,
          daysScored: 0
        };
      });
      days.forEach(function (day) {
        (day.students || []).forEach(function (s) {
          var key = String(s.seatNo);
          if (!totals[key]) {
            totals[key] = { seatNo: s.seatNo, name: s.name, settledTotal: 0, todayScore: 0, daysScored: 0 };
          }
          totals[key].name = s.name || totals[key].name;
          totals[key].settledTotal += Number(s.score) || 0;
          if (Number(s.score)) totals[key].daysScored += 1;
        });
      });
      var students = Object.keys(totals).map(function (key) {
        var item = totals[key];
        item.grand = item.settledTotal + item.todayScore;
        return item;
      }).sort(function (a, b) {
        return b.grand - a.grand;
      });
      var today = summarizeStudents_(room.students);
      today.date = active;
      var settledTotal = days.reduce(function (sum, day) { return sum + (Number(day.total) || 0); }, 0);
      var recentDays = days.slice(-7).reverse();
      return wrap(withRoll_({
        ok: true,
        className: className,
        activeDate: active,
        today: today,
        settledDays: days.length,
        settledTotal: settledTotal,
        grandTotal: settledTotal + today.total,
        studentCount: room.students.length,
        recentDays: recentDays,
        students: students
      }, store));
    },
    getGradebook: function (className) {
      var store = loadStore();
      className = String(className || '').trim();
      var book = ensureGrades_(store, className);
      return gradebookResult_(className, book);
    },
    addGradeColumn: function (body) {
      var store = loadStore();
      var className = String((body && body.className) || '').trim();
      var type = String((body && body.type) || 'yellow');
      if (!GRADE_LISTS_[type]) type = 'yellow';
      if (!className) throw new Error('缺少班級名稱');
      var book = ensureGrades_(store, className);
      var meta = GRADE_LISTS_[type];
      var item = {
        id: 'g' + Date.now() + Math.floor(Math.random() * 1000),
        title: String((body && body.title) || meta.title).trim() || meta.title,
        date: String((body && body.date) || todayKey_()),
        max: clampInt((body && body.max) || 100, 1, 200, 100)
      };
      if (type === 'homework') {
        item.dueDate = String((body && body.dueDate) || item.date);
        item.records = {};
        book.homeworks.push(item);
      } else {
        item.scores = {};
        book[meta.key].push(item);
      }
      saveStore(store);
      return gradebookResult_(className, book);
    },
    deleteGradeColumn: function (body) {
      var store = loadStore();
      var className = String((body && body.className) || '').trim();
      var type = String((body && body.type) || 'yellow');
      if (!GRADE_LISTS_[type]) type = 'yellow';
      var id = String((body && body.id) || '');
      var book = ensureGrades_(store, className);
      var key = GRADE_LISTS_[type].key;
      book[key] = (book[key] || []).filter(function (item) { return item.id !== id; });
      saveStore(store);
      return gradebookResult_(className, book);
    },
    saveGradebook: function (body) {
      var store = loadStore();
      var className = String((body && body.className) || '').trim();
      if (!className) throw new Error('缺少班級名稱');
      var book = ensureGrades_(store, className);
      if (body.rules) {
        book.rules = Object.assign({}, defaultGradeRules_(), {
          base: clampInt(body.rules.base, 0, 100, 60),
          classWeight: clampInt(body.rules.classWeight, 0, 100, 40),
          quizWeight: clampInt(body.rules.quizWeight, 0, 100, 30),
          examWeight: clampInt(body.rules.examWeight, 0, 100, 30),
          latePenalty: clampInt(body.rules.latePenalty, 0, 100, 10),
          lateWorkDays: clampInt(body.rules.lateWorkDays, 0, 10, 1),
          holidays: normalizeHolidayList_(body.rules.holidays),
          min: 0,
          max: 100
        });
      }
      if (body.yellow) book.yellow = normalizeGradeColumns_(body.yellow);
      if (body.morning) book.morning = normalizeGradeColumns_(body.morning);
      if (body.exams) book.exams = normalizeGradeColumns_(body.exams);
      if (body.labs) book.labs = normalizeGradeColumns_(body.labs);
      if (body.practicals) book.practicals = normalizeGradeColumns_(body.practicals);
      if (body.homeworks) book.homeworks = normalizeHomeworkColumns_(body.homeworks);
      saveStore(store);
      return gradebookResult_(className, book);
    },
    getTimetable: function () {
      if (typeof CloudStore === 'undefined' || !CloudStore.getTimetable) {
        return Promise.reject(new Error('尚未連上雲端資料庫'));
      }
      return CloudStore.getTimetable();
    },
    exportJSON: function () {
      return JSON.stringify(loadStore());
    },
    importJSON: function (text) {
      var parsed = normalizeLoadedStore_(JSON.parse(text));
      if (!parsed) throw new Error('備份檔格式不正確');
      memStore = parsed;
      hydrated = true;
      saveStore(memStore);
      var self = this;
      return this.flushCloud().then(function () {
        return self.getBootstrapData();
      });
    },
    exportCSV: function (className) {
      var store = loadStore();
      var room = ensureClass(store, className);
      var lines = ['班級,座號,姓名,分數'];
      room.students.forEach(function (s) {
        lines.push([room.className, s.seatNo, s.name, s.score].join(','));
      });
      return '\uFEFF' + lines.join('\r\n');
    }
  };
})(window);

(function (global) {
  var SESSION_KEY = 'class-seating-teacher-ok';
  var OFFICIAL_PASSWORD = 'Ff128256033';

  global.TeacherAuth = {
    hasPassword: function () {
      return true;
    },
    isUnlocked: function () {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    },
    unlock: function () {
      sessionStorage.setItem(SESSION_KEY, '1');
    },
    lock: function () {
      sessionStorage.removeItem(SESSION_KEY);
    },
    setPassword: function () {
      return Promise.resolve();
    },
    verify: function (password) {
      return Promise.resolve(String(password) === OFFICIAL_PASSWORD);
    }
  };
})(window);
