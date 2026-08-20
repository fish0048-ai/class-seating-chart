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

  function wrap(result) {
    return Promise.resolve(result);
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.classes) return parsed;
      }
    } catch (err) {}
    return seedStore();
  }

  function saveStore(store) {
    localStorage.setItem(KEY, JSON.stringify(store));
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
    var store = {
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
      history: []
    };
    saveStore(store);
    return store;
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
    return {
      ok: true,
      classNames: classNames(store),
      classroom: clone(room)
    };
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
      var store = loadStore();
      var names = classNames(store);
      return wrap(payload(store, names[0] || '範例班'));
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
      return wrap({ ok: true, rows: rows, classNames: classNames(store) });
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
    exportJSON: function () {
      return localStorage.getItem(KEY) || JSON.stringify(loadStore());
    },
    importJSON: function (text) {
      var parsed = JSON.parse(text);
      if (!parsed || !parsed.classes) throw new Error('備份檔格式不正確');
      saveStore(parsed);
      return this.getBootstrapData();
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
