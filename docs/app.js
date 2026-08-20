(function () {
  const App = {
    classNames: [],
    classroom: null,
    mode: 'select',
    delta: 1,
    selectedSeatNo: null,
    dirty: false,
    busy: false,
    drawn: {},
    drag: null,
    suppressClick: false
  };

  const els = {
    classSelect: document.getElementById('classSelect'),
    syncMeta: document.getElementById('syncMeta'),
    board: document.getElementById('board'),
    roster: document.getElementById('roster'),
    toast: document.getElementById('toast'),
    lotteryModal: document.getElementById('lotteryModal'),
    lotteryName: document.getElementById('lotteryName'),
    lotteryMeta: document.getElementById('lotteryMeta'),
    lotteryUnique: document.getElementById('lotteryUnique'),
    settingsModal: document.getElementById('settingsModal'),
    settingClassName: document.getElementById('settingClassName'),
    settingRows: document.getElementById('settingRows'),
    settingCols: document.getElementById('settingCols'),
    settingStudents: document.getElementById('settingStudents')
  };

  document.getElementById('btnPlus').addEventListener('click', function () {
    setMode(App.mode === 'plus' ? 'select' : 'plus');
  });
  document.getElementById('btnMinus').addEventListener('click', function () {
    setMode(App.mode === 'minus' ? 'select' : 'minus');
  });
  document.getElementById('btnUndo').addEventListener('click', undoLast);
  document.getElementById('btnLottery').addEventListener('click', function () {
    openLottery(true);
  });
  document.getElementById('btnLotteryAgain').addEventListener('click', function () {
    openLottery(false);
  });
  document.getElementById('btnLotteryClose').addEventListener('click', function () {
    els.lotteryModal.hidden = true;
  });
  document.getElementById('btnLotteryReset').addEventListener('click', resetDrawn);
  document.getElementById('btnSync').addEventListener('click', function () {
    syncFromServer(true);
  });
  document.getElementById('btnSave').addEventListener('click', saveAll);
  document.getElementById('btnSettings').addEventListener('click', openSettings);
  document.getElementById('btnSettingsClose').addEventListener('click', function () {
    els.settingsModal.hidden = true;
  });
  document.getElementById('btnSettingsSave').addEventListener('click', saveSettings);
  var sheetBtn = document.getElementById('btnSheet');
  if (sheetBtn) {
    sheetBtn.addEventListener('click', function () {
      var url = SeatDB.spreadsheetUrl();
      if (!url) {
        toast('請在 docs/config.js 填入 spreadsheetUrl');
        return;
      }
      window.open(url, '_blank');
    });
  }
  els.classSelect.addEventListener('change', function () {
    loadClass(els.classSelect.value);
  });
  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      App.delta = Number(chip.getAttribute('data-delta')) || 1;
      renderDelta();
    });
  });

  bootstrap();
  setInterval(function () {
    if (!App.busy && !App.dirty && App.classroom && SeatDB.configured && SeatDB.configured()) {
      var lottery = document.getElementById('lotteryModal');
      var settings = document.getElementById('settingsModal');
      if (lottery && !lottery.hidden) return;
      if (settings && !settings.hidden) return;
      syncFromServer(false);
    }
  }, 20000);

  function bootstrap() {
    if (typeof SeatDB === 'undefined' || !SeatDB.configured()) {
      els.syncMeta.textContent = '尚未連接 Google 試算表';
      var setup = document.getElementById('setupOverlay');
      if (setup) setup.hidden = false;
      return;
    }
    run('getBootstrapData', [], function (data) {
      applyPayload(data, true);
      if (App.classroom && !App.classroom.students.length) {
        openSettings();
        toast('這個班還沒有學生，可在試算表或這裡輸入');
      } else {
        toast('已從 Google 試算表載入，可直接打開試算表改名單');
      }
    });
  }

  function loadClass(className) {
    run('loadClassroom', [className], function (data) {
      App.drawn[className] = App.drawn[className] || [];
      applyPayload(data, true);
    });
  }

  function applyPayload(data, replace) {
    App.classNames = data.classNames || [];
    if (replace || !App.classroom) {
      App.classroom = data.classroom;
      App.dirty = false;
      App.selectedSeatNo = null;
    }
    renderAll();
  }

  function renderAll() {
    if (!App.classroom || !els.board) {
      return;
    }
    renderClassSelect();
    renderMeta();
    renderBoard();
    renderRoster();
    renderMode();
    renderDelta();
  }

  function renderClassSelect() {
    const current = App.classroom ? App.classroom.className : '';
    els.classSelect.innerHTML = App.classNames.map(function (name) {
      return '<option value="' + escapeHtml(name) + '"' + (name === current ? ' selected' : '') + '>' +
        escapeHtml(name) + '</option>';
    }).join('');
  }

  function renderMeta() {
    if (!App.classroom) {
      els.syncMeta.textContent = '尚無資料';
      return;
    }
    const time = formatTime(App.classroom.updatedAt);
    const dirty = App.dirty ? '（有未存檔變更）' : '';
    els.syncMeta.textContent = App.classroom.students.length + ' 位學生 · 版本 ' +
      (App.classroom.version || 1) + (time ? ' · ' + time : '') + dirty;
  }

  function renderBoard() {
    const room = App.classroom;
    els.board.style.gridTemplateColumns = 'repeat(' + room.cols + ', minmax(0, 1fr))';
    if (!room.students.length) {
      els.board.innerHTML = '<div class="empty-state">' +
        '<div>「' + escapeHtml(room.className) + '」目前沒有學生</div>' +
        '<div>每行輸入：座號,姓名　例如　01,陳安安</div>' +
        '<button type="button" class="tool primary" id="btnEmptySetup">輸入學生名單</button>' +
        '</div>';
      var emptyBtn = document.getElementById('btnEmptySetup');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', openSettings);
      }
      return;
    }
    const cells = [];
    for (let r = 0; r < room.rows; r++) {
      for (let c = 0; c < room.cols; c++) {
        cells.push(seatCell(r, c));
      }
    }
    els.board.innerHTML = cells.join('');
    bindSeatEvents();
  }

  function seatCell(row, col) {
    const student = studentAt(row, col);
    const selected = student && student.seatNo === App.selectedSeatNo ? ' selected' : '';
    const card = student ? (
      '<article class="seat-card' + selected + '" data-seat="' + escapeHtml(student.seatNo) + '">' +
        '<span class="seat-no">' + escapeHtml(student.seatNo) + '</span>' +
        '<span class="seat-name">' + escapeHtml(student.name) + '</span>' +
        '<span class="seat-score ' + scoreClass(student.score) + '">' + student.score + '</span>' +
      '</article>'
    ) : '';
    return '<div class="seat" data-row="' + row + '" data-col="' + col + '">' + card + '</div>';
  }

  function bindSeatEvents() {
    els.board.querySelectorAll('.seat-card').forEach(function (card) {
      card.addEventListener('pointerdown', onPointerDown);
      card.addEventListener('click', onSeatClick);
    });
  }

  function onSeatClick(event) {
    if (App.suppressClick || (App.drag && App.drag.moved)) {
      return;
    }
    const seatNo = event.currentTarget.getAttribute('data-seat');
    const student = findStudent(seatNo);
    if (!student) {
      return;
    }
    App.selectedSeatNo = seatNo;
    if (App.mode === 'plus' || App.mode === 'minus') {
      const sign = App.mode === 'plus' ? 1 : -1;
      changeScore(student, sign * App.delta);
    } else {
      renderAll();
    }
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }
    const card = event.currentTarget;
    const seatNo = card.getAttribute('data-seat');
    const student = findStudent(seatNo);
    if (!student) {
      return;
    }
    card.setPointerCapture(event.pointerId);
    App.drag = {
      seatNo: seatNo,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      ghost: null,
      pointerId: event.pointerId
    };
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerup', onPointerUp);
    card.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(event) {
    if (!App.drag) {
      return;
    }
    const dx = event.clientX - App.drag.startX;
    const dy = event.clientY - App.drag.startY;
    if (!App.drag.moved && (dx * dx + dy * dy) < 64) {
      return;
    }
    App.drag.moved = true;
    const student = findStudent(App.drag.seatNo);
    if (!App.drag.ghost) {
      const source = event.currentTarget;
      source.classList.add('dragging');
      App.drag.ghost = document.createElement('div');
      App.drag.ghost.className = 'ghost';
      App.drag.ghost.innerHTML = '<div class="seat-no">' + escapeHtml(student.seatNo) + '</div>' +
        '<div class="seat-name">' + escapeHtml(student.name) + '</div>';
      document.body.appendChild(App.drag.ghost);
    }
    App.drag.ghost.style.left = (event.clientX - 55) + 'px';
    App.drag.ghost.style.top = (event.clientY - 36) + 'px';
    highlightDropTarget(event.clientX, event.clientY);
  }

  function onPointerUp(event) {
    const card = event.currentTarget;
    card.removeEventListener('pointermove', onPointerMove);
    card.removeEventListener('pointerup', onPointerUp);
    card.removeEventListener('pointercancel', onPointerUp);
    const drag = App.drag;
    App.drag = null;
    card.classList.remove('dragging');
    if (drag && drag.ghost) {
      drag.ghost.remove();
    }
    clearDropTargets();
    if (!drag || !drag.moved) {
      return;
    }
    App.suppressClick = true;
    setTimeout(function () {
      App.suppressClick = false;
    }, 350);
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const seat = target && target.closest ? target.closest('.seat') : null;
    if (!seat) {
      return;
    }
    moveStudent(drag.seatNo, Number(seat.getAttribute('data-row')), Number(seat.getAttribute('data-col')));
  }

  function highlightDropTarget(x, y) {
    clearDropTargets();
    const target = document.elementFromPoint(x, y);
    const seat = target && target.closest ? target.closest('.seat') : null;
    if (seat) {
      seat.classList.add('drop-target');
    }
  }

  function clearDropTargets() {
    els.board.querySelectorAll('.drop-target').forEach(function (node) {
      node.classList.remove('drop-target');
    });
  }

  function moveStudent(seatNo, row, col) {
    const mover = findStudent(seatNo);
    if (!mover || (mover.row === row && mover.col === col)) {
      return;
    }
    const occupant = studentAt(row, col);
    if (occupant) {
      occupant.row = mover.row;
      occupant.col = mover.col;
    }
    mover.row = row;
    mover.col = col;
    App.dirty = true;
    App.selectedSeatNo = seatNo;
    renderAll();
    run('saveLayout', [serializeClassroom()], function (data) {
      App.classroom = data.classroom;
      App.dirty = false;
      App.selectedSeatNo = seatNo;
      renderAll();
    }, true);
  }

  function renderRoster() {
    els.roster.innerHTML = App.classroom.students.map(function (student) {
      const selected = student.seatNo === App.selectedSeatNo ? ' selected' : '';
      return '<li><button type="button" class="' + selected + '" data-seat="' + escapeHtml(student.seatNo) + '">' +
        '<span>' + escapeHtml(student.seatNo) + ' ' + escapeHtml(student.name) + '</span>' +
        '<strong>' + student.score + '</strong></button></li>';
    }).join('');
    els.roster.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        const student = findStudent(button.getAttribute('data-seat'));
        App.selectedSeatNo = student.seatNo;
        if (App.mode === 'plus' || App.mode === 'minus') {
          const sign = App.mode === 'plus' ? 1 : -1;
          changeScore(student, sign * App.delta);
        } else {
          renderAll();
        }
      });
    });
  }

  function setMode(mode) {
    App.mode = mode;
    renderMode();
    toast(mode === 'plus' ? '加分模式：點學生即可加分' : mode === 'minus' ? '扣分模式：點學生即可扣分' : '已回到選取模式');
  }

  function renderMode() {
    document.getElementById('btnPlus').classList.toggle('active-plus', App.mode === 'plus');
    document.getElementById('btnMinus').classList.toggle('active-minus', App.mode === 'minus');
  }

  function renderDelta() {
    document.querySelectorAll('.chip').forEach(function (chip) {
      chip.classList.toggle('active', Number(chip.getAttribute('data-delta')) === App.delta);
    });
  }

  function changeScore(student, delta) {
    if (!delta) {
      return;
    }
    run('applyScoreChange', [{
      className: App.classroom.className,
      seatNo: student.seatNo,
      delta: delta
    }], function (data) {
      App.classroom = data.classroom;
      App.selectedSeatNo = student.seatNo;
      renderAll();
      flashSeat(student.seatNo, delta > 0 ? 'score-plus' : 'score-minus');
      toast(student.name + ' ' + (delta > 0 ? '+' : '') + delta + ' 分');
    });
  }

  function undoLast() {
    run('undoLastAction', [App.classroom.className], function (data) {
      App.classroom = data.classroom;
      App.selectedSeatNo = data.undone.seatNo;
      renderAll();
      toast('已復原 ' + data.undone.name + ' 的加扣分');
    });
  }

  function openLottery(fromButton) {
    const unique = els.lotteryUnique.checked;
    const drawn = App.drawn[App.classroom.className] || [];
    let pool = App.classroom.students.slice();
    if (unique) {
      pool = pool.filter(function (s) {
        return drawn.indexOf(s.seatNo) === -1;
      });
    }
    if (!pool.length) {
      toast('可抽名單已空，請先重置');
      els.lotteryModal.hidden = false;
      return;
    }
    els.lotteryModal.hidden = false;
    animateLottery(pool, function (winner) {
      App.drawn[App.classroom.className] = drawn.concat([winner.seatNo]);
      App.selectedSeatNo = winner.seatNo;
      els.lotteryName.textContent = winner.name;
      els.lotteryMeta.textContent = '座號 ' + winner.seatNo + ' · 目前 ' + winner.score + ' 分';
      renderAll();
      flashSeat(winner.seatNo, 'winner');
      run('logLottery', [{
        className: App.classroom.className,
        seatNo: winner.seatNo,
        name: winner.name,
        detail: fromButton ? '抽籤' : '再抽一次'
      }], function () {}, true);
    });
  }

  function animateLottery(pool, done) {
    let ticks = 18;
    const timer = setInterval(function () {
      const temp = pool[Math.floor(Math.random() * pool.length)];
      els.lotteryName.textContent = temp.name;
      els.lotteryMeta.textContent = '座號 ' + temp.seatNo;
      ticks -= 1;
      if (ticks <= 0) {
        clearInterval(timer);
        done(pool[Math.floor(Math.random() * pool.length)]);
      }
    }, 70);
  }

  function resetDrawn() {
    App.drawn[App.classroom.className] = [];
    els.lotteryName.textContent = '？';
    els.lotteryMeta.textContent = '已重置，可再抽全部學生';
    toast('抽籤名單已重置');
  }

  function saveAll() {
    run('saveClassroomState', [serializeClassroom()], function (data) {
      applyPayload(data, true);
      toast('已寫入 Google 試算表，其他平板按同步即可看到');
    });
  }

  function syncFromServer(manual) {
    run('loadClassroom', [App.classroom.className], function (data) {
      applyPayload(data, true);
      if (manual) {
        toast('已從 Google 試算表同步最新資料');
      }
    });
  }

  function openSettings() {
    els.settingClassName.value = (App.classroom && App.classroom.className) || '301';
    els.settingRows.value = (App.classroom && App.classroom.rows) || 6;
    els.settingCols.value = (App.classroom && App.classroom.cols) || 7;
    els.settingStudents.value = App.classroom && App.classroom.students.length
      ? App.classroom.students.map(function (s) {
          return s.seatNo + ',' + s.name;
        }).join('\n')
      : '';
    els.settingStudents.placeholder = '01,陳安安\n02,林冠宇\n03,黃詩涵';
    els.settingsModal.hidden = false;
    setTimeout(function () {
      els.settingStudents.focus();
    }, 50);
  }

  function saveSettings() {
    const className = els.settingClassName.value.trim();
    const rows = Number(els.settingRows.value);
    const cols = Number(els.settingCols.value);
    const students = parseStudentText(els.settingStudents.value);
    if (!className) {
      toast('請輸入班級名稱');
      return;
    }
    run('saveSettings', [{ className: className, rows: rows, cols: cols }], function () {
      if (!students.length) {
        loadClass(className);
        els.settingsModal.hidden = true;
        toast('班級行列設定已儲存');
        return;
      }
      run('upsertStudents', [{ className: className, students: students }], function (data) {
        App.drawn[className] = App.drawn[className] || [];
        applyPayload(data, true);
        els.classSelect.value = className;
        els.settingsModal.hidden = true;
        toast('班級設定與學生名單已儲存');
      });
    });
  }

  function parseStudentText(text) {
    return String(text || '').split(/\r?\n/).map(function (line) {
      const trimmed = line.trim();
      if (!trimmed) {
        return null;
      }
      const parts = trimmed.split(/[,，\s]+/);
      return {
        seatNo: String(parts[0] || '').trim(),
        name: String(parts.slice(1).join(' ') || '').trim()
      };
    }).filter(function (item) {
      return item && item.seatNo && item.name;
    });
  }

  function serializeClassroom() {
    return {
      className: App.classroom.className,
      rows: App.classroom.rows,
      cols: App.classroom.cols,
      students: App.classroom.students.map(function (s) {
        return {
          seatNo: s.seatNo,
          name: s.name,
          score: s.score,
          row: s.row,
          col: s.col,
          note: s.note || ''
        };
      })
    };
  }

  function studentAt(row, col) {
    return App.classroom.students.find(function (s) {
      return s.row === row && s.col === col;
    });
  }

  function findStudent(seatNo) {
    return App.classroom.students.find(function (s) {
      return String(s.seatNo) === String(seatNo);
    });
  }

  function flashSeat(seatNo, className) {
    const card = els.board.querySelector('.seat-card[data-seat="' + cssEscape(seatNo) + '"]');
    if (!card) {
      return;
    }
    card.classList.add(className);
    setTimeout(function () {
      card.classList.remove(className);
    }, 1200);
  }

  function scoreClass(score) {
    if (score < 0) {
      return 'score-neg';
    }
    if (score >= 10) {
      return 'score-high';
    }
    if (score > 0) {
      return 'score-mid';
    }
    return '';
  }

  function run(fnName, args, onSuccess, silent) {
    if (App.busy && !silent) return;
    if (!silent) App.busy = true;
    Promise.resolve()
      .then(function () {
        if (typeof SeatDB[fnName] !== 'function') throw new Error('找不到功能 ' + fnName);
        return SeatDB[fnName].apply(SeatDB, args);
      })
      .then(function (result) {
        if (!silent) App.busy = false;
        onSuccess(result);
      })
      .catch(function (error) {
        if (!silent) App.busy = false;
        var msg = error && error.message ? error.message : '操作失敗，請再試一次';
        if (fnName === 'getBootstrapData' || fnName === 'loadClassroom') {
          els.syncMeta.textContent = '載入失敗：' + msg;
        }
        toast(msg);
      });
  }

  function toast(message) {
    els.toast.hidden = false;
    els.toast.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      els.toast.hidden = true;
    }, 2200);
  }

  function formatTime(value) {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return '';
    }
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return '更新 ' + hh + ':' + mm;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cssEscape(value) {
    return String(value).replace(/"/g, '\\"');
  }
})();