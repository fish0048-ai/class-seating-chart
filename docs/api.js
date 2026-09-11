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

  function countScoreMap_(scores) {
    var n = 0;
    Object.keys(scores || {}).forEach(function (seat) {
      var v = scores[seat];
      if (v === '' || v == null) return;
      n += 1;
    });
    return n;
  }

  function countBookScores_(book) {
    var n = 0;
    if (!book) return 0;
    ['yellow', 'morning', 'exams', 'labs', 'practicals'].forEach(function (key) {
      (book[key] || []).forEach(function (col) {
        n += countScoreMap_(col && col.scores);
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

  function mergeScoreMapPreserve_(localScores, remoteScores) {
    var out = Object.assign({}, normalizeScoreMap_(localScores));
    Object.keys(remoteScores || {}).forEach(function (seat) {
      var rv = remoteScores[seat];
      if (rv === '' || rv == null) return;
      if (!Object.prototype.hasOwnProperty.call(out, seat) || out[seat] === '' || out[seat] == null) {
        if (rv === 'leave' || rv === '請假') out[String(seat)] = 'leave';
        else if (isFinite(Number(rv))) out[String(seat)] = Number(rv);
      }
    });
    return out;
  }

  function mergeGradeColumnsPreserve_(localList, remoteList, fillEmptyScores) {
    var local = (localList || []).map(function (col) {
      return {
        id: String(col.id || ''),
        title: col.title,
        date: col.date,
        dueDate: col.dueDate,
        max: col.max,
        scores: Object.assign({}, col.scores || {}),
        records: col.records ? JSON.parse(JSON.stringify(col.records)) : undefined
      };
    });
    var byId = {};
    local.forEach(function (col, idx) { if (col.id) byId[col.id] = idx; });
    (remoteList || []).forEach(function (remoteCol) {
      var id = String((remoteCol && remoteCol.id) || '');
      if (!id) return;
      if (!Object.prototype.hasOwnProperty.call(byId, id)) {
        local.push(JSON.parse(JSON.stringify(remoteCol)));
        byId[id] = local.length - 1;
        return;
      }
      if (!fillEmptyScores) return;
      var cur = local[byId[id]];
      if (remoteCol.scores) {
        cur.scores = mergeScoreMapPreserve_(cur.scores, remoteCol.scores);
      }
      if (remoteCol.records) {
        cur.records = cur.records || {};
        Object.keys(remoteCol.records).forEach(function (seat) {
          if (!cur.records[seat]) cur.records[seat] = JSON.parse(JSON.stringify(remoteCol.records[seat]));
        });
      }
    });
    return local;
  }

  function mergeGradeBookPreserve_(localBook, remoteBook) {
    localBook = localBook || {};
    remoteBook = remoteBook || {};
    var lc = countBookScores_(localBook);
    var rc = countBookScores_(remoteBook);
    var fillEmpty = rc > 0 && (lc === 0 || (rc > lc && (rc - lc) >= 3 && lc * 2 < rc));
    var out = {
      rules: localBook.rules || remoteBook.rules,
      yellow: mergeGradeColumnsPreserve_(localBook.yellow, remoteBook.yellow, fillEmpty),
      morning: mergeGradeColumnsPreserve_(localBook.morning, remoteBook.morning, fillEmpty),
      exams: mergeGradeColumnsPreserve_(localBook.exams, remoteBook.exams, fillEmpty),
      labs: mergeGradeColumnsPreserve_(localBook.labs, remoteBook.labs, fillEmpty),
      practicals: mergeGradeColumnsPreserve_(localBook.practicals, remoteBook.practicals, fillEmpty),
      homeworks: mergeGradeColumnsPreserve_(localBook.homeworks, remoteBook.homeworks, fillEmpty)
    };
    if (remoteBook.quizzes && (!out.yellow || !out.yellow.length)) out.yellow = remoteBook.quizzes;
    return out;
  }

  function dayScoreWeight_(day) {
    var w = 0;
    ((day && day.students) || []).forEach(function (s) {
      w += Math.abs(Number(s.score) || 0);
    });
    return w;
  }

  function mergeDailyListsPreserve_(localList, remoteList) {
    var byDate = {};
    (remoteList || []).forEach(function (day) {
      if (day && day.date) byDate[day.date] = day;
    });
    (localList || []).forEach(function (day) {
      if (!day || !day.date) return;
      var prev = byDate[day.date];
      if (!prev || dayScoreWeight_(day) >= dayScoreWeight_(prev)) byDate[day.date] = day;
    });
    return Object.keys(byDate).sort().map(function (d) { return byDate[d]; });
  }

  function countLessonEntries_(log) {
    var n = 0;
    Object.keys(log || {}).forEach(function (cn) {
      var pack = log[cn] || {};
      if (pack.current) n += 1;
      n += (pack.entries || []).length;
    });
    return n;
  }

  function mergeLessonPackProtect_(localPack, remotePack) {
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
    Object.keys(byId).forEach(function (id) {
      merged[id] = byId[id];
    });
    Object.keys(byDate).forEach(function (date) {
      var entry = byDate[date];
      var id = String(entry.id || '');
      if (!id) {
        merged['date:' + date] = entry;
        return;
      }
      if (!merged[id]) merged[id] = entry;
    });
    var entries = Object.keys(merged).map(function (k) { return merged[k]; });
    entries.sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date)) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    if (entries.length > 200) entries = entries.slice(0, 200);
    var current = String(localPack.current || '').trim() || String(remotePack.current || '').trim();
    var updatedAt = localPack.updatedAt || '';
    if ((remotePack.updatedAt || '') > updatedAt) updatedAt = remotePack.updatedAt;
    if (!updatedAt) updatedAt = nowIso();
    return { current: current.slice(0, 80), updatedAt: updatedAt, entries: entries };
  }

  function mergeLessonLogProtect_(localLog, remoteLog) {
    localLog = localLog && typeof localLog === 'object' ? localLog : {};
    remoteLog = remoteLog && typeof remoteLog === 'object' ? remoteLog : {};
    var out = {};
    var names = {};
    Object.keys(localLog).forEach(function (cn) { names[cn] = true; });
    Object.keys(remoteLog).forEach(function (cn) { names[cn] = true; });
    Object.keys(names).forEach(function (cn) {
      out[cn] = mergeLessonPackProtect_(localLog[cn], remoteLog[cn]);
    });
    return out;
  }

  /** 上傳前保護：避免本機空成績／空每日紀錄把雲端舊資料蓋掉。 */
  function mergeProtectStore_(local, remote) {
    if (!local || !remote) return local || remote;
    local.grades = local.grades || {};
    Object.keys(remote.grades || {}).forEach(function (cn) {
      if (!local.grades[cn]) {
        local.grades[cn] = clone(remote.grades[cn]);
        return;
      }
      local.grades[cn] = mergeGradeBookPreserve_(local.grades[cn], remote.grades[cn]);
    });
    local.daily = local.daily || {};
    Object.keys(remote.daily || {}).forEach(function (cn) {
      if (!local.daily[cn] || !local.daily[cn].length) {
        if ((remote.daily[cn] || []).length) local.daily[cn] = clone(remote.daily[cn]);
      } else {
        local.daily[cn] = mergeDailyListsPreserve_(local.daily[cn], remote.daily[cn]);
      }
    });
    local.classes = local.classes || {};
    Object.keys(remote.classes || {}).forEach(function (cn) {
      if (!local.classes[cn]) {
        local.classes[cn] = clone(remote.classes[cn]);
        return;
      }
      var lroom = local.classes[cn];
      var rroom = remote.classes[cn];
      lroom.groups = preferFilledGroups_(
        normalizeGroups(lroom.groups, lroom.students),
        normalizeGroups(rroom.groups, lroom.students)
      );
      lroom.lab = preferFilledLab_(
        normalizeLab(lroom.lab, lroom.students),
        normalizeLab(rroom.lab, lroom.students)
      );
    });
    if (!scoreHold_) {
      mergeLiveScoresProtect_(local, remote);
    }
    if ((!local.mockExam || !local.mockExam.byClass || !Object.keys(local.mockExam.byClass).length) &&
        remote.mockExam && remote.mockExam.byClass && Object.keys(remote.mockExam.byClass).length) {
      local.mockExam = clone(remote.mockExam);
    }
    local.lessonLog = mergeLessonLogProtect_(local.lessonLog, remote.lessonLog);
    return local;
  }

  function classAbsScoreSum_(room) {
    var sum = 0;
    ((room && room.students) || []).forEach(function (s) {
      sum += Math.abs(Number(s.score) || 0);
    });
    return sum;
  }

  /** 同日加扣：本機全 0、雲端有分，且不是換日時，避免座位改動把加扣蓋成空白。 */
  function mergeLiveScoresProtect_(local, remote) {
    var localDate = local.scoreDate || '';
    var remoteDate = remote.scoreDate || '';
    if (localDate && remoteDate && localDate > remoteDate) return;
    Object.keys(remote.classes || {}).forEach(function (cn) {
      var lroom = local.classes && local.classes[cn];
      var rroom = remote.classes[cn];
      if (!lroom || !rroom) return;
      if (localDate && remoteDate && localDate !== remoteDate) return;
      var lSum = classAbsScoreSum_(lroom);
      var rSum = classAbsScoreSum_(rroom);
      if (rSum > 0 && lSum === 0) {
        var bySeat = {};
        (rroom.students || []).forEach(function (s) {
          bySeat[String(s.seatNo)] = Number(s.score) || 0;
        });
        (lroom.students || []).forEach(function (s) {
          var key = String(s.seatNo);
          if (Object.prototype.hasOwnProperty.call(bySeat, key)) s.score = bySeat[key];
        });
      }
      if (rroom.groups && rroom.groups.scores) {
        var gRemote = Object.keys(rroom.groups.scores).reduce(function (n, k) {
          return n + Math.abs(Number(rroom.groups.scores[k]) || 0);
        }, 0);
        var gLocal = lroom.groups && lroom.groups.scores
          ? Object.keys(lroom.groups.scores).reduce(function (n, k) {
            return n + Math.abs(Number(lroom.groups.scores[k]) || 0);
          }, 0)
          : 0;
        if (gRemote > 0 && gLocal === 0) {
          lroom.groups = lroom.groups || { size: rroom.groups.size || 0, assign: {}, scores: {} };
          lroom.groups.scores = Object.assign({}, rroom.groups.scores, lroom.groups.scores || {});
        }
      }
      if (rroom.lab && rroom.lab.scores) {
        var labSum = Object.keys(rroom.lab.scores).reduce(function (n, k) {
          return n + Math.abs(Number(rroom.lab.scores[k]) || 0);
        }, 0);
        var localLabSum = lroom.lab && lroom.lab.scores
          ? Object.keys(lroom.lab.scores).reduce(function (n, k) {
            return n + Math.abs(Number(lroom.lab.scores[k]) || 0);
          }, 0)
          : 0;
        if (labSum > 0 && localLabSum === 0) {
          lroom.lab = lroom.lab || { assign: {}, scores: {} };
          lroom.lab.scores = Object.assign({}, rroom.lab.scores, lroom.lab.scores || {});
        }
      }
    });
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

  function replaceGradeListIfSafe_(incoming, existing) {
    if (!incoming) return existing;
    if (!incoming.length && (existing || []).length) return existing;
    var normalized = normalizeGradeColumns_(incoming);
    var exById = {};
    (existing || []).forEach(function (col) {
      if (col && col.id) exById[String(col.id)] = col;
    });
    return normalized.map(function (col) {
      var prev = exById[String(col.id)];
      if (!prev) return col;
      var ic = countScoreMap_(col.scores);
      var ec = countScoreMap_(prev.scores);
      if (ec > 0 && ic === 0) {
        col.scores = Object.assign({}, normalizeScoreMap_(prev.scores));
      } else if (ec > ic && (ec - ic) >= 3 && ic * 2 < ec) {
        col.scores = mergeScoreMapPreserve_(col.scores, prev.scores);
      }
      return col;
    });
  }

  function replaceHomeworkListIfSafe_(incoming, existing) {
    if (!incoming) return existing;
    if (!incoming.length && (existing || []).length) return existing;
    var normalized = normalizeHomeworkColumns_(incoming);
    var exById = {};
    (existing || []).forEach(function (col) {
      if (col && col.id) exById[String(col.id)] = col;
    });
    return normalized.map(function (col) {
      var prev = exById[String(col.id)];
      if (!prev) return col;
      var ic = Object.keys(col.records || {}).length;
      var ec = Object.keys(prev.records || {}).length;
      if (ec > 0 && ic === 0) {
        col.records = JSON.parse(JSON.stringify(prev.records || {}));
      } else if (ec > ic && (ec - ic) >= 3 && ic * 2 < ec) {
        col.records = col.records || {};
        Object.keys(prev.records || {}).forEach(function (seat) {
          if (!col.records[seat]) col.records[seat] = JSON.parse(JSON.stringify(prev.records[seat]));
        });
      }
      return col;
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
  var lastSyncedAt_ = '';
  var scoreHold_ = false;
  var cloudError = '';
  var cloudSaving = false;
  var SCORE_HOLD_KEY = 'class-seating-score-hold';

  function cloudOn() {
    return typeof CloudStore !== 'undefined' && CloudStore.enabled();
  }

  function normalizeLoadedStore_(parsed) {
    if (!parsed || !parsed.classes) return null;
    if (!parsed.daily) parsed.daily = {};
    if (!parsed.history) parsed.history = [];
    if (!parsed.grades) parsed.grades = {};
    parsed.mockExam = normalizeMockExam_(parsed.mockExam);
    parsed.lessonLog = normalizeLessonLog_(parsed.lessonLog);
    return parsed;
  }

  function emptyMockExam_() {
    return { meta: {}, byClass: {} };
  }

  function emptyLessonLog_() {
    return {};
  }

  function normalizeLessonEntry_(raw, className) {
    raw = raw || {};
    var id = String(raw.id || '').trim();
    if (!id) id = 'L' + Date.now() + String(Math.floor(Math.random() * 1000));
    return {
      id: id,
      className: String(raw.className || className || ''),
      date: String(raw.date || '').trim(),
      progress: String(raw.progress || '').trim().slice(0, 80),
      note: String(raw.note || '').trim().slice(0, 200),
      createdAt: String(raw.createdAt || nowIso())
    };
  }

  function normalizeLessonLog_(raw) {
    if (!raw || typeof raw !== 'object') return emptyLessonLog_();
    var out = {};
    Object.keys(raw).forEach(function (cn) {
      var src = raw[cn] || {};
      var entries = Array.isArray(src.entries) ? src.entries.map(function (item) {
        return normalizeLessonEntry_(item, cn);
      }).filter(function (item) {
        return item.date && item.progress;
      }) : [];
      entries.sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt));
      });
      if (entries.length > 200) entries = entries.slice(0, 200);
      out[String(cn)] = {
        current: String(src.current || '').trim().slice(0, 80),
        updatedAt: String(src.updatedAt || ''),
        entries: entries
      };
    });
    return out;
  }

  function ensureLessonClass_(store, className) {
    store.lessonLog = normalizeLessonLog_(store.lessonLog);
    if (!store.lessonLog[className]) {
      store.lessonLog[className] = { current: '', updatedAt: '', entries: [] };
    }
    return store.lessonLog[className];
  }

  function normalizeMockExam_(raw) {
    if (!raw || typeof raw !== 'object') return emptyMockExam_();
    var meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
    var byClass = {};
    Object.keys(raw.byClass || {}).forEach(function (cn) {
      var src = raw.byClass[cn] || {};
      var dest = {};
      Object.keys(src).forEach(function (seat) {
        var row = src[seat] || {};
        dest[String(seat)] = {
          className: String(row.className || cn),
          seatNo: String(row.seatNo || seat),
          name: String(row.name || ''),
          combo: String(row.combo || ''),
          points: row.points == null ? '' : String(row.points),
          writing: row.writing == null ? '' : String(row.writing),
          classRank: row.classRank == null ? '' : String(row.classRank),
          schoolRank: row.schoolRank == null ? '' : String(row.schoolRank),
          levels: row.levels && typeof row.levels === 'object' ? row.levels : {}
        };
      });
      if (Object.keys(dest).length) byClass[String(cn)] = dest;
    });
    return { meta: meta, byClass: byClass };
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
    if (!memStore.mockExam) memStore.mockExam = emptyMockExam_();
    if (!memStore.lessonLog) memStore.lessonLog = emptyLessonLog_();
    if (hydrated && ensureRolledScores_(memStore)) saveStore(memStore);
    return memStore;
  }

  function saveStore(store, opts) {
    opts = opts || {};
    memStore = store;
    if (!hydrated) return;
    if (typeof GoogleAuth !== 'undefined' && GoogleAuth.isSignedIn && GoogleAuth.isSignedIn() && !GoogleAuth.isTeacher()) {
      return;
    }
    if (opts.cloud === false) {
      scoreHold_ = true;
      persistScoreHold_(store);
      notifyCloud_('held');
      return;
    }
    store.updatedAt = nowIso();
    if (!cloudOn()) {
      try {
        localStorage.setItem(KEY, JSON.stringify(store));
      } catch (err) {}
      scoreHold_ = false;
      clearScoreHold_();
      return;
    }
    scheduleCloudSave_();
  }

  function notifyCloud_(phase) {
    try {
      document.dispatchEvent(new CustomEvent('seat-cloud', { detail: { phase: phase || '' } }));
    } catch (err) {}
  }

  function markSynced_(store) {
    lastSyncedAt_ = (store && store.updatedAt) || '';
    lastPushAt = lastSyncedAt_;
    scoreHold_ = false;
    clearScoreHold_();
  }

  function clearScoreHold_() {
    try { sessionStorage.removeItem(SCORE_HOLD_KEY); } catch (err) {}
  }

  function persistScoreHold_(store) {
    try {
      sessionStorage.setItem(SCORE_HOLD_KEY, JSON.stringify({
        baseUpdatedAt: lastSyncedAt_,
        store: store
      }));
    } catch (err) {}
  }

  function restoreScoreHold_(remote) {
    try {
      var raw = sessionStorage.getItem(SCORE_HOLD_KEY);
      if (!raw) return remote;
      var hold = JSON.parse(raw);
      var held = hold && hold.store ? normalizeLoadedStore_(hold.store) : null;
      if (!held) {
        clearScoreHold_();
        return remote;
      }
      var remoteAt = (remote && remote.updatedAt) || '';
      if (hold.baseUpdatedAt && remoteAt && hold.baseUpdatedAt !== remoteAt) {
        scoreHold_ = false;
        clearScoreHold_();
        return remote;
      }
      scoreHold_ = true;
      return held;
    } catch (err) {
      return remote;
    }
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
    notifyCloud_('saving');
    return CloudStore.getStore().then(function (data) {
      var remote = data && data.store ? normalizeLoadedStore_(data.store) : null;
      var remoteAt = (remote && remote.updatedAt) || '';
      if (remoteAt && lastSyncedAt_ && remoteAt > lastSyncedAt_) {
        if (remote) {
          mergeProtectStore_(store, remote);
          lastSyncedAt_ = remoteAt;
        } else {
          cloudSaving = false;
          cloudError = '另一台已有較新資料，這台沒有覆蓋雲端。請重新載入後再加扣。';
          notifyCloud_('conflict');
          return Promise.reject(new Error(cloudError));
        }
      } else if (remote) {
        mergeProtectStore_(store, remote);
      }
      lastPushAt = nowIso();
      store.updatedAt = lastPushAt;
      return CloudStore.putStore(store);
    }).then(function (data) {
      if (!data) return data;
      cloudSaving = false;
      cloudError = '';
      if (data.updatedAt) {
        store.updatedAt = data.updatedAt;
      }
      markSynced_(store);
      notifyCloud_('ok');
    return data;
    }).catch(function (err) {
      var msg = err && err.message ? err.message : '雲端存檔失敗';
      if (/另一台已有較新/.test(msg)) {
        cloudSaving = false;
        return Promise.reject(err);
      }
      if (attempt < 3) {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            pushCloud_(store, attempt + 1).then(resolve, reject);
          }, 700 * attempt);
        });
      }
      cloudSaving = false;
      cloudError = msg;
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
        lastSyncedAt_ = remote.updatedAt || '';
        lastPushAt = lastSyncedAt_;
        clearLegacyLocal_();
        memStore = restoreScoreHold_(memStore);
        healGroupsFromHistoryLocal_(memStore);
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

  function healGroupsFromHistoryLocal_(store) {
    if (!store || !store.classes) return false;
    var changed = false;
    Object.keys(store.classes).forEach(function (cn) {
      var room = store.classes[cn];
      if (!room) return;
      room.groups = room.groups || emptyGroups(4);
      room.groups.assign = room.groups.assign || {};
      if (Object.keys(room.groups.assign).length) return;
      var assign = {};
      (store.history || []).forEach(function (item) {
        if (!item || item.undone) return;
        if (String(item.className || '') !== cn) return;
        if (item.lab) return;
        var gid = parseInt(item.groupId, 10);
        if (!isFinite(gid) || gid < 1) return;
        (item.seatNos || []).forEach(function (seat) {
          var key = String(seat || '').trim();
          if (key) assign[key] = gid;
        });
      });
      if (!Object.keys(assign).length) return;
      room.groups.assign = assign;
      changed = true;
    });
    return changed;
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
      scoreHold: scoreHold_,
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

  function emptyGroups(size) {
    return { size: clampInt(size, 2, 12, 4), assign: {}, scores: {} };
  }

  function seatAliasKeys_(seatNo) {
    var raw = String(seatNo == null ? '' : seatNo).trim();
    var keys = [];
    function add(k) {
      if (k !== '' && keys.indexOf(k) < 0) keys.push(k);
    }
    add(raw);
    if (/^\d+$/.test(raw)) {
      var n = String(Number(raw));
      add(n);
      add(n.length < 2 ? ('0' + n) : n);
    }
    return keys;
  }

  function countAssign_(assign) {
    return Object.keys(assign || {}).length;
  }

  function preferFilledGroups_(incoming, existing) {
    incoming = incoming || emptyGroups(4);
    existing = existing || emptyGroups(4);
    if (countAssign_(incoming.assign) > 0) return incoming;
    if (countAssign_(existing.assign) > 0) {
      return {
        size: incoming.size || existing.size || 4,
        assign: Object.assign({}, existing.assign),
        scores: Object.assign({}, existing.scores || {}, incoming.scores || {})
      };
    }
    return incoming;
  }

  function preferFilledLab_(incoming, existing) {
    incoming = incoming || emptyLab();
    existing = existing || emptyLab();
    if (countAssign_(incoming.assign) > 0) return incoming;
    if (countAssign_(existing.assign) > 0) {
      return {
        assign: Object.assign({}, existing.assign),
        scores: Object.assign({}, existing.scores || {}, incoming.scores || {})
      };
    }
    return incoming;
  }

  function normalizeGroups(raw, students) {
    raw = raw || {};
    var size = clampInt(raw.size, 2, 12, 4);
    var seatCanon = {};
    (students || []).forEach(function (s) {
      var canon = String(s.seatNo);
      seatAliasKeys_(canon).forEach(function (k) { seatCanon[k] = canon; });
    });
    var assign = {};
    Object.keys(raw.assign || {}).forEach(function (seat) {
      var canon = seatCanon[String(seat)];
      if (!canon && /^\d+$/.test(String(seat))) canon = seatCanon[String(Number(seat))];
      if (!canon) return;
      var gid = parseInt(raw.assign[seat], 10);
      if (gid >= 1 && gid <= 40) assign[canon] = gid;
    });
    var used = {};
    Object.keys(assign).forEach(function (seat) {
      used[String(assign[seat])] = true;
    });
    var scores = {};
    Object.keys(raw.scores || {}).forEach(function (gid) {
      if (!used[String(gid)]) return;
      scores[String(gid)] = Number(raw.scores[gid]) || 0;
    });
    return { size: size, assign: assign, scores: scores };
  }

  function ensureGroups(classroom) {
    classroom.groups = normalizeGroups(classroom.groups, classroom.students);
    return classroom.groups;
  }

  function groupIdOf(room, seatNo) {
    var assign = room && room.groups && room.groups.assign;
    if (!assign) return 0;
    return parseInt(assign[String(seatNo)], 10) || 0;
  }

  function groupMembers(room, gid) {
    gid = parseInt(gid, 10);
    if (!gid) return [];
    var assign = (room.groups && room.groups.assign) || {};
    return (room.students || []).filter(function (s) {
      return parseInt(assign[String(s.seatNo)], 10) === gid;
    });
  }

  function emptyLab() {
    return { assign: {}, scores: {} };
  }

  function normalizeLab(raw, students) {
    raw = raw || {};
    var seatCanon = {};
    (students || []).forEach(function (s) {
      var canon = String(s.seatNo);
      seatAliasKeys_(canon).forEach(function (k) { seatCanon[k] = canon; });
    });
    var assign = {};
    Object.keys(raw.assign || {}).forEach(function (seat) {
      var canon = seatCanon[String(seat)];
      if (!canon && /^\d+$/.test(String(seat))) canon = seatCanon[String(Number(seat))];
      if (!canon) return;
      var gid = parseInt(raw.assign[seat], 10);
      if (gid >= 1 && gid <= 6) assign[canon] = gid;
    });
    var scores = {};
    var i;
    for (i = 1; i <= 6; i++) {
      var key = String(i);
      scores[key] = Number((raw.scores || {})[key]) || 0;
    }
    return { assign: assign, scores: scores };
  }

  function ensureLab(classroom) {
    classroom.lab = normalizeLab(classroom.lab, classroom.students);
    return classroom.lab;
  }

  function groupIdFromPack(pack, seatNo) {
    var assign = pack && pack.assign;
    if (!assign) return 0;
    return parseInt(assign[String(seatNo)], 10) || 0;
  }

  function membersFromPack(room, pack, gid) {
    gid = parseInt(gid, 10);
    if (!gid) return [];
    var assign = (pack && pack.assign) || {};
    return (room.students || []).filter(function (s) {
      return parseInt(assign[String(s.seatNo)], 10) === gid;
    });
  }

  function ensureClass(store, className) {
    if (!store.classes[className]) {
      store.classes[className] = {
        className: className,
        rows: 6,
        cols: 7,
        version: 1,
        updatedAt: nowIso(),
        students: [],
        groups: emptyGroups(4),
        lab: emptyLab()
      };
    }
    var room = store.classes[className];
    if (!Array.isArray(room.students)) room.students = [];
    if (!room.groups) room.groups = emptyGroups(4);
    if (!room.lab) room.lab = emptyLab();
    return room;
  }

  function autoPlace(classroom) {
    var taken = {};
    if (!classroom || !Array.isArray(classroom.students)) {
      if (classroom) classroom.students = [];
      return classroom;
    }
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

  function plusHitsForClass_(store, className) {
    var active = store.scoreDate || scoreDateFromNow_();
    var hits = {};
    (store.history || []).forEach(function (item) {
      if (!item || item.undone) return;
      if (String(item.className || '') !== String(className || '')) return;
      if (item.type !== '加分' && item.type !== '小組加分') return;
      if ((Number(item.delta) || 0) <= 0) return;
      var day = String(item.time || '').slice(0, 10);
      if (day !== active) return;
      var seats = (item.seatNos && item.seatNos.length) ? item.seatNos : [item.seatNo];
      seats.forEach(function (sn) {
        sn = String(sn || '');
        if (!sn) return;
        hits[sn] = (Number(hits[sn]) || 0) + 1;
      });
    });
    return hits;
  }

  function payload(store, className) {
    var room = ensureClass(store, className);
    autoPlace(room);
    ensureGroups(room);
    ensureLab(room);
    return withRoll_({
      ok: true,
      classNames: classNames(store),
      classroom: clone(room),
      mockExam: store.mockExam || emptyMockExam_(),
      lessonLog: store.lessonLog || emptyLessonLog_(),
      plusHits: plusHitsForClass_(store, className)
    }, store);
  }

  function persistRoom(store, classroom, bump, skipCloud) {
    autoPlace(classroom);
    ensureGroups(classroom);
    ensureLab(classroom);
    if (bump) classroom.version = (Number(classroom.version) || 1) + 1;
    classroom.updatedAt = nowIso();
    store.classes[classroom.className] = classroom;
    saveStore(store, skipCloud ? { cloud: false } : {});
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
      undone: false,
      groupId: item.groupId ? String(item.groupId) : '',
      seatNos: Array.isArray(item.seatNos) ? item.seatNos.map(String) : [],
      causeSeatNo: item.causeSeatNo ? String(item.causeSeatNo) : '',
      causeName: item.causeName ? String(item.causeName) : '',
      lab: item.lab === true
    });
    if (store.history.length > 800) store.history = store.history.slice(-800);
  }

  function normalize(state) {
    var className = String(state.className || '').trim();
    if (!className) throw new Error('缺少班級名稱');
    var students = (state.students || []).map(function (s) {
      return {
        seatNo: String(s.seatNo || '').trim(),
        name: String(s.name || '').trim(),
        score: Number(s.score) || 0,
        row: s.row === null || s.row === undefined || s.row === '' ? null : Number(s.row),
        col: s.col === null || s.col === undefined || s.col === '' ? null : Number(s.col),
        note: String(s.note || '')
      };
    }).filter(function (s) { return s.seatNo && s.name; });
    return {
      className: className,
      rows: clampInt(state.rows, 1, 20, 6),
      cols: clampInt(state.cols, 1, 16, 7),
      version: Number(state.version) || 1,
      updatedAt: state.updatedAt || nowIso(),
      students: students,
      groups: normalizeGroups(state.groups, students),
      lab: normalizeLab(state.lab, students)
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
    repairGroups: function (className) {
      if (!cloudOn()) {
        return Promise.reject(new Error('尚未連上雲端'));
      }
      return CloudStore.request('repairGroups', {}).then(function (data) {
        if (data && data.store) {
          memStore = normalizeLoadedStore_(data.store) || data.store;
          hydrated = true;
          lastSyncedAt_ = (memStore && memStore.updatedAt) || '';
          lastPushAt = lastSyncedAt_;
          healGroupsFromHistoryLocal_(memStore);
        } else {
          return hydrateFromCloud_().then(function () {
            return data;
          });
        }
        var names = classNames(memStore);
        var current = className && memStore.classes[className] ? className : (names[0] || '範例班');
        return Object.assign(payload(memStore, current), {
          cloud: cloudStatusPayload_(),
          repair: data
        });
      });
    },
    flushCloud: function (opts) {
      opts = opts || {};
      if (!cloudOn() || !memStore || !hydrated) {
        return wrap(cloudStatusPayload_());
      }
      if (opts.pendingOnly && !saveTimer) {
        return wrap(cloudStatusPayload_());
      }
      if (opts.skipHeld && scoreHold_) {
        clearTimeout(saveTimer);
        saveTimer = null;
        cloudSaving = false;
        notifyCloud_('held');
        return wrap(cloudStatusPayload_());
      }
      clearTimeout(saveTimer);
      saveTimer = null;
      return pushCloud_(memStore).then(function () {
        return cloudStatusPayload_();
      });
    },
    pullIfNewer: function (className) {
      if (!cloudOn() || !hydrated || cloudSaving || scoreHold_) {
        return wrap({ changed: false, cloud: cloudStatusPayload_() });
      }
      return CloudStore.getStore().then(function (data) {
        var remote = data && data.store ? normalizeLoadedStore_(data.store) : null;
        if (!remote || !remote.updatedAt) {
          return { changed: false, cloud: cloudStatusPayload_() };
        }
        var localAt = lastSyncedAt_ || (memStore && memStore.updatedAt) || '';
        if (!localAt || remote.updatedAt > localAt) {
          if (remote.updatedAt === lastPushAt) {
            return { changed: false, cloud: cloudStatusPayload_() };
          }
          memStore = remote;
          lastSyncedAt_ = remote.updatedAt;
          lastPushAt = remote.updatedAt;
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
      var className = String((state && state.className) || '').trim();
      var current = className && store.classes[className] ? store.classes[className] : null;
      var classroom = normalize(state);
      if (current) {
        classroom.groups = preferFilledGroups_(
          normalizeGroups(classroom.groups, classroom.students),
          normalizeGroups(current.groups, classroom.students)
        );
        classroom.lab = preferFilledLab_(
          normalizeLab(classroom.lab, classroom.students),
          normalizeLab(current.lab, classroom.students)
        );
      }
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
      incoming.groups = normalizeGroups(state.groups || current.groups, incoming.students);
      incoming.lab = normalizeLab(state.lab || current.lab, incoming.students);
      persistRoom(store, incoming, false);
      return wrap(payload(store, incoming.className));
    },
    saveGroups: function (body) {
      var store = loadStore();
      var className = String(body.className || '').trim();
      if (!className) throw new Error('缺少班級名稱');
      var room = ensureClass(store, className);
      room.groups = normalizeGroups(body.groups, room.students);
      persistRoom(store, room, false);
      return wrap(payload(store, className));
    },
    saveLab: function (body) {
      var store = loadStore();
      var className = String(body.className || '').trim();
      if (!className) throw new Error('缺少班級名稱');
      var room = ensureClass(store, className);
      room.lab = normalizeLab(body.lab, room.students);
      persistRoom(store, room, false);
      return wrap(payload(store, className));
    },
    applyScoreChange: function (body) {
      var store = loadStore();
      var className = String(body.className || '').trim();
      var seatNo = String(body.seatNo || '').trim();
      var delta = Number(body.delta);
      if (!className || !seatNo || !isFinite(delta) || delta === 0) throw new Error('加扣分資料不完整');
      var room = ensureClass(store, className);
      var useLab = body.lab === true;
      var pack = useLab ? ensureLab(room) : ensureGroups(room);
      var student = room.students.filter(function (s) { return String(s.seatNo) === seatNo; })[0];
      if (!student) throw new Error('找不到座號 ' + seatNo);
      var gid = body.applyGroup ? groupIdFromPack(pack, seatNo) : 0;
      if (useLab && gid && (gid < 1 || gid > 6)) gid = 0;
      var members = gid ? membersFromPack(room, pack, gid) : [student];
      if (!members.length) members = [student];
      members.forEach(function (s) {
        s.score = (Number(s.score) || 0) + delta;
      });
      var seatNos = members.map(function (s) { return String(s.seatNo); });
      if (gid) {
        pack.scores[String(gid)] = (Number(pack.scores[String(gid)]) || 0) + delta;
      }
      persistRoom(store, room, false, true);
      var causeSeatNo = '';
      var causeName = '';
      if (gid) {
        if (Object.prototype.hasOwnProperty.call(body, 'causeSeatNo')) {
          causeSeatNo = String(body.causeSeatNo || '').trim();
        } else {
          causeSeatNo = seatNo;
        }
        var cause = causeSeatNo
          ? room.students.filter(function (s) { return String(s.seatNo) === causeSeatNo; })[0]
          : null;
        if (cause) {
          causeSeatNo = String(cause.seatNo);
          causeName = cause.name;
        } else {
          causeSeatNo = '';
          causeName = '';
        }
      }
      var groupLabel = gid ? ((useLab ? '實驗第' : '第') + gid + '組') : '';
      addHistory(store, {
        className: className,
        type: gid ? (delta > 0 ? '小組加分' : '小組扣分') : (delta > 0 ? '加分' : '扣分'),
        seatNo: seatNo,
        name: gid ? groupLabel : student.name,
        delta: delta,
        newScore: gid ? (Number(pack.scores[String(gid)]) || 0) : student.score,
        detail: body.detail
          ? String(body.detail)
          : (gid
            ? (members.map(function (s) { return s.name; }).join('、') + ' 各 ' + (delta > 0 ? '+' : '') + delta)
            : ((delta > 0 ? '+' : '') + delta)),
        undoable: true,
        groupId: gid || '',
        seatNos: seatNos,
        causeSeatNo: causeSeatNo,
        causeName: causeName,
        lab: useLab
      });
      saveStore(store, { cloud: false });
      var data = payload(store, className);
      data.changedSeatNos = seatNos;
      data.groupId = gid || 0;
      data.lab = useLab;
      return wrap(data);
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
      var pack = item.lab ? ensureLab(room) : ensureGroups(room);
      var seatNos = (item.seatNos && item.seatNos.length) ? item.seatNos.map(String) : [String(item.seatNo)];
      var touched = [];
      seatNos.forEach(function (sn) {
        var s = room.students.filter(function (stu) { return String(stu.seatNo) === sn; })[0];
        if (s) {
          s.score = (Number(s.score) || 0) - Number(item.delta || 0);
          touched.push(s);
        }
      });
      if (!touched.length) throw new Error('找不到要復原的學生');
      if (item.groupId) {
        var gidKey = String(item.groupId);
        pack.scores[gidKey] = (Number(pack.scores[gidKey]) || 0) - Number(item.delta || 0);
      }
      item.undone = true;
      persistRoom(store, room, false, true);
      addHistory(store, {
        className: className,
        type: '復原',
        seatNo: item.seatNo,
        name: item.name || touched[0].name,
        delta: -Number(item.delta || 0),
        newScore: touched[0].score,
        detail: item.groupId ? ('復原' + (item.name || ('第' + item.groupId + '組'))) : '復原',
        undoable: false,
        groupId: item.groupId || '',
        seatNos: seatNos,
        lab: item.lab === true
      });
      saveStore(store, { cloud: false });
      var data = payload(store, className);
      data.undone = {
        seatNo: item.seatNo,
        name: item.name || touched[0].name,
        reversedDelta: -Number(item.delta || 0),
        seatNos: seatNos,
        groupId: item.groupId || 0
      };
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
      ensureGroups(room);
      room.groups.scores = {};
      ensureLab(room);
      room.lab.scores = {};
      (store.history || []).forEach(function (item) {
        if (item.className === className && item.undoable) item.undone = true;
      });
      persistRoom(store, room, true, true);
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
      saveStore(store, { cloud: false });
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
    listSchoolOverview: function () {
      var store = loadStore();
      var active = store.scoreDate || scoreDateFromNow_();
      var names = classNames(store);
      var classes = names.map(function (cn) {
        var room = ensureClass(store, cn);
        var days = ((store.daily || {})[cn] || []).slice();
        var live = makeDayRecord_(room, active, true);
        if (!days.some(function (item) { return item.date === active; })) days.push(live);
        days.sort(function (a, b) {
          return String(a.date).localeCompare(String(b.date));
        });
        var rawBook = (store.grades && store.grades[cn]) || {};
        return {
          className: cn,
          students: (room.students || []).map(function (s) {
            return {
              className: cn,
              seatNo: s.seatNo,
              name: s.name,
              score: Number(s.score) || 0
            };
          }),
          days: clone(days),
          gradebook: {
            yellow: clone(rawBook.yellow || rawBook.quizzes || []),
            morning: clone(rawBook.morning || []),
            exams: clone(rawBook.exams || []),
            labs: clone(rawBook.labs || []),
            practicals: clone(rawBook.practicals || []),
            homeworks: clone(rawBook.homeworks || []),
            rules: Object.assign({}, defaultGradeRules_(), rawBook.rules || {})
          }
        };
      });
      return wrap({ ok: true, classNames: names, classes: classes });
    },
    listGroupDeductions: function (className) {
      var store = loadStore();
      className = String(className || '').trim();
      var room = className ? ensureClass(store, className) : null;
      var bySeat = {};
      if (room) {
        (room.students || []).forEach(function (s) {
          bySeat[String(s.seatNo)] = s;
        });
      }
      var rows = [];
      (store.history || []).forEach(function (item) {
        if (!item || item.undone) return;
        if (className && item.className !== className) return;
        if (item.type !== '小組扣分') return;
        var delta = Number(item.delta) || 0;
        if (delta >= 0) return;
        var causeSeatNo = '';
        var causeName = '';
        if (item.causeSeatNo != null && String(item.causeSeatNo) !== '') {
          causeSeatNo = String(item.causeSeatNo);
          causeName = String(item.causeName || '');
        } else if (item.causeSeatNo === '') {
          causeSeatNo = '';
          causeName = '';
        } else {
          causeSeatNo = String(item.seatNo || '');
          causeName = '';
        }
        if (causeSeatNo && !causeName && bySeat[causeSeatNo]) {
          causeName = bySeat[causeSeatNo].name;
        }
        rows.push({
          time: item.time,
          className: item.className,
          groupId: String(item.groupId || ''),
          groupName: item.name || (item.groupId ? ('第' + item.groupId + '組') : '小組'),
          delta: delta,
          causeSeatNo: causeSeatNo,
          causeName: causeName,
          members: item.detail || ''
        });
      });
      rows.reverse();
      return wrap({ ok: true, rows: rows });
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
      var meta = GRADE_LISTS_[type];
      var title = String((body && body.title) || meta.title).trim() || meta.title;
      var date = String((body && body.date) || todayKey_());
      var max = clampInt((body && body.max) || 100, 1, 200, 100);
      var dueDate = String((body && body.dueDate) || date);
      var sharedId = 'g' + Date.now() + Math.floor(Math.random() * 1000);
      var targets = classNames(store).filter(function (cn) {
        return cn && cn.indexOf('範例') < 0;
      });
      if (targets.indexOf(className) < 0) targets.push(className);
      targets.forEach(function (cn) {
        var book = ensureGrades_(store, cn);
        var list = type === 'homework' ? book.homeworks : book[meta.key];
        var exists = (list || []).some(function (col) { return col && col.id === sharedId; });
        if (exists) return;
        var item = {
          id: sharedId,
          title: title,
          date: date,
          max: max
        };
        if (type === 'homework') {
          item.dueDate = dueDate;
          item.records = {};
          book.homeworks.push(item);
        } else {
          item.scores = {};
          book[meta.key].push(item);
        }
      });
      saveStore(store);
      return gradebookResult_(className, ensureGrades_(store, className)).then(function (data) {
        data.sharedId = sharedId;
        data.sharedClasses = targets;
        data.sharedCount = targets.length;
        return data;
      });
    },
    deleteGradeColumn: function (body) {
      var store = loadStore();
      var className = String((body && body.className) || '').trim();
      var type = String((body && body.type) || 'yellow');
      if (!GRADE_LISTS_[type]) type = 'yellow';
      var id = String((body && body.id) || '');
      if (!id) throw new Error('缺少欄位');
      var key = GRADE_LISTS_[type].key;
      var targets = classNames(store).filter(function (cn) {
        return cn && cn.indexOf('範例') < 0;
      });
      if (className && targets.indexOf(className) < 0) targets.push(className);
      var removed = 0;
      targets.forEach(function (cn) {
        var book = ensureGrades_(store, cn);
        var before = (book[key] || []).length;
        book[key] = (book[key] || []).filter(function (item) { return item.id !== id; });
        if ((book[key] || []).length < before) removed += 1;
      });
      saveStore(store);
      return gradebookResult_(className || targets[0] || '', ensureGrades_(store, className || targets[0] || '範例班')).then(function (data) {
        data.sharedCount = removed;
        return data;
      });
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
      if (body.yellow) book.yellow = replaceGradeListIfSafe_(body.yellow, book.yellow);
      if (body.morning) book.morning = replaceGradeListIfSafe_(body.morning, book.morning);
      if (body.exams) book.exams = replaceGradeListIfSafe_(body.exams, book.exams);
      if (body.labs) book.labs = replaceGradeListIfSafe_(body.labs, book.labs);
      if (body.practicals) book.practicals = replaceGradeListIfSafe_(body.practicals, book.practicals);
      if (body.homeworks) book.homeworks = replaceHomeworkListIfSafe_(body.homeworks, book.homeworks);
      saveStore(store);
      return gradebookResult_(className, book);
    },
    importMockExam: function (pack) {
      var store = loadStore();
      store.mockExam = normalizeMockExam_(pack);
      saveStore(store);
      return wrap({
        ok: true,
        mockExam: store.mockExam,
        classNames: classNames(store)
      });
    },
    clearMockExam: function () {
      var store = loadStore();
      store.mockExam = emptyMockExam_();
      saveStore(store);
      return wrap({ ok: true, mockExam: store.mockExam });
    },
    getMockExam: function () {
      var store = loadStore();
      return wrap({ ok: true, mockExam: store.mockExam || emptyMockExam_() });
    },
    getLessonLog: function () {
      var store = loadStore();
      return wrap({
        ok: true,
        lessonLog: store.lessonLog || emptyLessonLog_(),
        classNames: classNames(store)
      });
    },
    saveLessonProgress: function (body) {
      var store = loadStore();
      var className = String((body && body.className) || '').trim();
      if (!className) throw new Error('請先選班級');
      var progress = String((body && body.progress) || '').trim().slice(0, 80);
      if (!progress) throw new Error('請填目前進度，例如第 3 冊 Ch.2');
      var date = String((body && body.date) || todayKey_()).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = todayKey_();
      var note = String((body && body.note) || '').trim().slice(0, 200);
      var pack = ensureLessonClass_(store, className);
      pack.current = progress;
      pack.updatedAt = nowIso();
      var existing = pack.entries.filter(function (item) { return item.date === date; })[0];
      if (existing) {
        existing.progress = progress;
        existing.note = note;
      } else {
        pack.entries.unshift(normalizeLessonEntry_({
          date: date,
          progress: progress,
          note: note,
          createdAt: nowIso()
        }, className));
      }
      store.lessonLog = normalizeLessonLog_(store.lessonLog);
      saveStore(store);
      var result = {
        ok: true,
        lessonLog: store.lessonLog,
        className: className
      };
      if (!cloudOn() || !hydrated) return wrap(result);
      clearTimeout(saveTimer);
      saveTimer = null;
      return pushCloud_(memStore).then(function () {
        result.lessonLog = memStore.lessonLog || result.lessonLog;
        result.synced = true;
        return result;
      }).catch(function (err) {
        result.synced = false;
        result.cloudError = err && err.message ? err.message : '雲端同步失敗';
        return result;
      });
    },
    deleteLessonEntry: function (body) {
      var store = loadStore();
      var className = String((body && body.className) || '').trim();
      var id = String((body && body.id) || '').trim();
      if (!className || !id) throw new Error('缺少要刪的紀錄');
      var pack = ensureLessonClass_(store, className);
      pack.entries = pack.entries.filter(function (item) { return item.id !== id; });
      store.lessonLog = normalizeLessonLog_(store.lessonLog);
      saveStore(store);
      var result = { ok: true, lessonLog: store.lessonLog, className: className };
      if (!cloudOn() || !hydrated) return wrap(result);
      clearTimeout(saveTimer);
      saveTimer = null;
      return pushCloud_(memStore).then(function () {
        result.lessonLog = memStore.lessonLog || result.lessonLog;
        result.synced = true;
        return result;
      }).catch(function (err) {
        result.synced = false;
        result.cloudError = err && err.message ? err.message : '雲端同步失敗';
        return result;
      });
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
