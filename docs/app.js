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
    suppressClick: false,
    lotteryBusy: false,
    rankBumpSeat: null,
    dbRows: [],
    dbFilter: '__all__',
    pendingImport: null
  };

  const els = {
    classSelect: document.getElementById('classSelect'),
    syncMeta: document.getElementById('syncMeta'),
    board: document.getElementById('board'),
    roster: document.getElementById('roster'),
    rankEmpty: document.getElementById('rankEmpty'),
    toast: document.getElementById('toast'),
    lotteryModal: document.getElementById('lotteryModal'),
    lotteryName: document.getElementById('lotteryName'),
    lotteryStamp: document.getElementById('lotteryStamp'),
    lotteryMeta: document.getElementById('lotteryMeta'),
    lotteryUnique: document.getElementById('lotteryUnique'),
    settingClassName: document.getElementById('settingClassName'),
    settingRows: document.getElementById('settingRows'),
    settingCols: document.getElementById('settingCols'),
    settingStudents: document.getElementById('settingStudents'),
    settingFile: document.getElementById('settingFile'),
    settingReplace: document.getElementById('settingReplace'),
    uploadBox: document.getElementById('uploadBox'),
    uploadPreview: document.getElementById('uploadPreview'),
    fxLayer: document.getElementById('fxLayer'),
    lotteryCard: document.getElementById('lotteryCard'),
    app: document.getElementById('app'),
    teacherView: document.getElementById('teacherView'),
    dbBody: document.getElementById('dbBody'),
    dbClassFilter: document.getElementById('dbClassFilter'),
    dailyToday: document.getElementById('dailyToday'),
    dailyBody: document.getElementById('dailyBody'),
    statsCards: document.getElementById('statsCards'),
    statsBody: document.getElementById('statsBody'),
    authModal: document.getElementById('authModal'),
    authTitle: document.getElementById('authTitle'),
    authHint: document.getElementById('authHint'),
    authPassword: document.getElementById('authPassword'),
    authPassword2: document.getElementById('authPassword2'),
    authPassword2Wrap: document.getElementById('authPassword2Wrap')
  };

  document.getElementById('btnPlus').addEventListener('click', function () {
    setMode(App.mode === 'plus' ? 'select' : 'plus');
  });
  document.getElementById('btnMinus').addEventListener('click', function () {
    setMode(App.mode === 'minus' ? 'select' : 'minus');
  });
  document.getElementById('btnUndo').addEventListener('click', undoLast);
  var resetScoresBtn = document.getElementById('btnResetScores');
  if (resetScoresBtn) {
    resetScoresBtn.addEventListener('click', function () {
      requireTeacher(resetAllScores);
    });
  }
  document.getElementById('btnLottery').addEventListener('click', function () {
    openLottery(true);
  });
  document.getElementById('btnLotteryAgain').addEventListener('click', function () {
    openLottery(false);
  });
  document.getElementById('btnLotteryClose').addEventListener('click', function () {
    els.lotteryModal.hidden = true;
    App.lotteryBusy = false;
    if (els.lotteryCard) {
      els.lotteryCard.classList.remove('rolling', 'revealed');
    }
    if (els.lotteryStamp) els.lotteryStamp.hidden = true;
  });
  document.getElementById('btnLotteryReset').addEventListener('click', resetDrawn);
  document.getElementById('btnSave').addEventListener('click', saveAll);
  var settingsSave = document.getElementById('btnSettingsSave');
  if (settingsSave) settingsSave.addEventListener('click', saveSettings);
  document.querySelectorAll('[data-app-view]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var view = btn.getAttribute('data-app-view');
      if (view === 'teacher') {
        requireTeacher(openDatabase);
        return;
      }
      showClassView();
    });
  });
  var lockBtn = document.getElementById('btnTeacherLock');
  if (lockBtn) {
    lockBtn.addEventListener('click', lockTeacher);
  }
  var authCancel = document.getElementById('btnAuthCancel');
  if (authCancel) {
    authCancel.addEventListener('click', function () {
      if (els.authModal) els.authModal.hidden = true;
      App.teacherNext = null;
    });
  }
  var authSubmit = document.getElementById('btnAuthSubmit');
  if (authSubmit) authSubmit.addEventListener('click', submitAuth);
  if (els.authPassword) {
    els.authPassword.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') submitAuth();
    });
  }
  if (els.authPassword2) {
    els.authPassword2.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') submitAuth();
    });
  }
  document.querySelectorAll('[data-teacher-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTeacherTab(btn.getAttribute('data-teacher-tab'));
    });
  });
  var settleBtn = document.getElementById('btnSettleToday');
  if (settleBtn) {
    settleBtn.addEventListener('click', settleTodayScores);
  }
  var dbSave = document.getElementById('btnDatabaseSave');
  if (dbSave) dbSave.addEventListener('click', saveDatabase);
  var dbAdd = document.getElementById('btnDbAdd');
  if (dbAdd) dbAdd.addEventListener('click', function () {
    addDatabaseRow({
      className: (els.dbClassFilter && els.dbClassFilter.value !== '__all__')
        ? els.dbClassFilter.value
        : ((App.classroom && App.classroom.className) || ''),
      seatNo: '',
      name: '',
      score: 0
    }, true);
  });
  if (els.dbClassFilter) {
    els.dbClassFilter.addEventListener('change', function () {
      mergeVisibleDatabaseRows();
      App.dbFilter = els.dbClassFilter.value;
      renderDatabaseTable(App.dbRows || []);
      refreshTeacherExtras();
    });
  }
  if (els.dbBody) {
    els.dbBody.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-del]');
      if (!btn) return;
      var tr = btn.closest('tr');
      if (tr) tr.remove();
    });
  }
  var uploadBtn = document.getElementById('btnUpload');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', function () {
      switchTeacherTab('settings');
      if (els.settingFile) els.settingFile.click();
    });
  }
  if (els.settingFile) {
    els.settingFile.addEventListener('change', function () {
      if (els.settingFile.files && els.settingFile.files[0]) {
        readRosterFile(els.settingFile.files[0]);
      }
    });
  }
  if (els.uploadBox) {
    ['dragenter', 'dragover'].forEach(function (type) {
      els.uploadBox.addEventListener(type, function (event) {
        event.preventDefault();
        els.uploadBox.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      els.uploadBox.addEventListener(type, function (event) {
        event.preventDefault();
        els.uploadBox.classList.remove('dragover');
      });
    });
    els.uploadBox.addEventListener('drop', function (event) {
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) readRosterFile(file);
    });
  }
  var exportBtn = document.getElementById('btnExport');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      requireTeacher(downloadBackup);
    });
  }
  var importBtn = document.getElementById('btnImport');
  var backupFile = document.getElementById('backupFile');
  if (importBtn && backupFile) {
    importBtn.addEventListener('click', function () {
      requireTeacher(function () {
        backupFile.click();
      });
    });
    backupFile.addEventListener('change', function () {
      if (backupFile.files && backupFile.files[0]) {
        restoreBackup(backupFile.files[0]);
        backupFile.value = '';
      }
    });
  }
  var csvBtn = document.getElementById('btnExportCsv');
  if (csvBtn) csvBtn.addEventListener('click', downloadClassCsv);
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
  applyTeacherUi();

  function applyTeacherUi() {
    document.body.classList.toggle('teacher-on', !!(window.TeacherAuth && TeacherAuth.isUnlocked()));
  }

  function showClassView() {
    App.appView = 'class';
    if (els.app) els.app.hidden = false;
    if (els.teacherView) els.teacherView.hidden = true;
    document.body.classList.remove('view-teacher');
    document.querySelectorAll('[data-app-view]').forEach(function (btn) {
      btn.classList.toggle('tab-on', btn.getAttribute('data-app-view') === 'class');
    });
  }

  function showTeacherView() {
    App.appView = 'teacher';
    if (els.app) els.app.hidden = true;
    if (els.teacherView) els.teacherView.hidden = false;
    document.body.classList.add('view-teacher');
    document.querySelectorAll('[data-app-view]').forEach(function (btn) {
      btn.classList.toggle('tab-on', btn.getAttribute('data-app-view') === 'teacher');
    });
  }

  function requireTeacher(nextFn) {
    if (window.TeacherAuth && TeacherAuth.isUnlocked()) {
      nextFn();
      return;
    }
    App.teacherNext = nextFn;
    openAuthModal('unlock');
  }

  function lockTeacher() {
    if (window.TeacherAuth) TeacherAuth.lock();
    if (els.authModal) els.authModal.hidden = true;
    applyTeacherUi();
    showClassView();
    toast('已鎖定並回到上課模式');
  }

  function openAuthModal(mode) {
    App.authMode = 'unlock';
    if (els.authPassword) els.authPassword.value = '';
    if (els.authPassword2) els.authPassword2.value = '';
    if (els.authPassword2Wrap) els.authPassword2Wrap.hidden = true;
    if (els.authTitle) els.authTitle.textContent = '教師模式';
    if (els.authHint) els.authHint.textContent = '請輸入教師密碼後進入教師頁。';
    var submit = document.getElementById('btnAuthSubmit');
    if (submit) submit.textContent = '進入';
    if (els.authModal) els.authModal.hidden = false;
    setTimeout(function () {
      if (els.authPassword) els.authPassword.focus();
    }, 50);
  }

  function submitAuth() {
    if (!window.TeacherAuth) {
      toast('無法使用教師密碼');
      return;
    }
    var password = els.authPassword ? els.authPassword.value : '';
    TeacherAuth.verify(password).then(function (ok) {
      if (!ok) {
        toast('密碼不正確');
        return;
      }
      TeacherAuth.unlock();
      if (els.authModal) els.authModal.hidden = true;
      applyTeacherUi();
      toast('已進入教師模式');
      finishTeacherNext();
    });
  }

  function finishTeacherNext() {
    var next = App.teacherNext;
    App.teacherNext = null;
    if (typeof next === 'function') next();
  }

  function bootstrap() {
    run('getBootstrapData', [], function (data) {
      applyPayload(data, true);
      if (App.classroom && !App.classroom.students.length) {
        toast('這個班還沒有學生，請切到「教師模式」輸入名單');
      } else {
        toast('已載入，拖放、抽籤、加扣分都會自動存檔');
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
    els.syncMeta.textContent = App.classroom.students.length + ' 位學生 · 已存在這個瀏覽器' +
      (time ? ' · ' + time : '') + dirty;
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
        emptyBtn.addEventListener('click', function () {
          App.pendingTeacherTab = 'settings';
          requireTeacher(openDatabase);
        });
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
    if (!els.roster || !App.classroom) return;
    const ranked = App.classroom.students.filter(function (student) {
      return Number(student.score) !== 0;
    }).sort(function (a, b) {
      const diff = Number(b.score) - Number(a.score);
      if (diff) return diff;
      return String(a.seatNo).localeCompare(String(b.seatNo), 'zh-Hant', { numeric: true });
    });
    if (els.rankEmpty) els.rankEmpty.hidden = ranked.length > 0;
    if (!ranked.length) {
      els.roster.innerHTML = '';
      return;
    }
    els.roster.innerHTML = ranked.map(function (student, index) {
      const selected = student.seatNo === App.selectedSeatNo ? ' selected' : '';
      const medal = index === 0 ? ' gold' : index === 1 ? ' silver' : index === 2 ? ' bronze' : '';
      const bump = student.seatNo === App.rankBumpSeat ? ' rank-up' : '';
      const signed = (student.score > 0 ? '+' : '') + student.score;
      return '<li><button type="button" class="' + selected + medal + bump + '" data-seat="' + escapeHtml(student.seatNo) + '">' +
        '<span class="rank-no">' + (index + 1) + '</span>' +
        '<span class="rank-main"><span class="rank-name">' + escapeHtml(student.name) + '</span>' +
        '<span class="rank-meta">座號 ' + escapeHtml(student.seatNo) + '</span></span>' +
        '<strong class="' + scoreClass(student.score) + '">' + signed + '</strong></button></li>';
    }).join('');
    els.roster.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        const student = findStudent(button.getAttribute('data-seat'));
        if (!student) return;
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
      App.rankBumpSeat = student.seatNo;
      renderAll();
      flashSeat(student.seatNo, delta > 0 ? 'score-plus' : 'score-minus');
      spawnScoreFloat(student.seatNo, delta);
      if (delta > 0) spawnConfetti(18, ['#2c7a4b', '#7dce9a', '#f3c84b']);
      toast(student.name + ' ' + (delta > 0 ? '+' : '') + delta + ' 分');
      setTimeout(function () {
        if (App.rankBumpSeat === student.seatNo) App.rankBumpSeat = null;
      }, 900);
    });
  }

  function undoLast() {
    run('undoLastAction', [App.classroom.className], function (data) {
      App.classroom = data.classroom;
      App.selectedSeatNo = data.undone.seatNo;
      App.rankBumpSeat = data.undone.seatNo;
      renderAll();
      flashSeat(data.undone.seatNo, data.undone.reversedDelta > 0 ? 'score-plus' : 'score-minus');
      spawnScoreFloat(data.undone.seatNo, data.undone.reversedDelta);
      toast('已復原 ' + data.undone.name + ' 的加扣分');
    });
  }

  function resetAllScores() {
    if (!App.classroom) return;
    var changed = App.classroom.students.filter(function (s) {
      return Number(s.score) !== 0;
    }).length;
    if (!changed) {
      toast('目前沒有加扣分可以重製');
      return;
    }
    if (!window.confirm('要把「' + App.classroom.className + '」全班加扣分都歸零嗎？座位不會變。')) {
      return;
    }
    run('resetScores', [App.classroom.className], function (data) {
      App.classroom = data.classroom;
      App.rankBumpSeat = null;
      renderAll();
      toast('已重製本班加扣分，排行已清空');
    });
  }

  function openDatabase() {
    run('listRecords', [], function (data) {
      App.dbRows = data.rows || [];
      App.dbFilter = (App.classroom && App.classroom.className) || '__all__';
      fillDatabaseFilter(data.classNames || App.classNames || []);
      if (els.dbClassFilter) els.dbClassFilter.value = App.dbFilter;
      renderDatabaseTable(App.dbRows);
      switchTeacherTab(App.pendingTeacherTab || App.teacherTab || 'roster');
      App.pendingTeacherTab = null;
      refreshTeacherExtras();
      showTeacherView();
    });
  }

  function teacherTargetClass() {
    var filter = els.dbClassFilter ? els.dbClassFilter.value : '';
    if (filter && filter !== '__all__') return filter;
    return (App.classroom && App.classroom.className) || '';
  }

  function switchTeacherTab(tab) {
    var next = tab || 'roster';
    var changed = App.teacherTab !== next;
    App.teacherTab = next;
    document.querySelectorAll('[data-teacher-tab]').forEach(function (btn) {
      btn.classList.toggle('tab-on', btn.getAttribute('data-teacher-tab') === App.teacherTab);
    });
    var roster = document.getElementById('tabRoster');
    var daily = document.getElementById('tabDaily');
    var stats = document.getElementById('tabStats');
    var settings = document.getElementById('tabSettings');
    if (roster) roster.hidden = App.teacherTab !== 'roster';
    if (daily) daily.hidden = App.teacherTab !== 'daily';
    if (stats) stats.hidden = App.teacherTab !== 'stats';
    if (settings) settings.hidden = App.teacherTab !== 'settings';
    document.querySelectorAll('.teacher-tab-only').forEach(function (btn) {
      btn.hidden = btn.getAttribute('data-for-tab') !== App.teacherTab;
    });
    var saveBtn = document.getElementById('btnDatabaseSave');
    if (saveBtn) saveBtn.hidden = App.teacherTab !== 'roster';
    var footer = document.querySelector('.teacher-footer');
    if (footer) footer.hidden = App.teacherTab !== 'roster';
    if (els.dbClassFilter && els.dbClassFilter.parentElement) {
      els.dbClassFilter.parentElement.hidden = App.teacherTab === 'settings';
    }
    if (App.teacherTab === 'settings' && changed) openSettings();
    if (App.teacherTab !== 'roster' && App.teacherTab !== 'settings') refreshTeacherExtras();
  }

  function refreshTeacherExtras() {
    var className = teacherTargetClass();
    if (!className) return;
    api('listDaily', [className]).then(renderDailyPanel).catch(function () {});
    api('getClassStats', [className]).then(renderStatsPanel).catch(function () {});
  }

  function settleTodayScores() {
    var className = teacherTargetClass();
    if (!className) {
      toast('請先選擇班級');
      return;
    }
    if (!window.confirm('要結算「' + className + '」今天的分數嗎？結算後今日分數會歸零，紀錄會留在每日結算。')) {
      return;
    }
    run('settleToday', [className], function (data) {
      applyPayload(data, true);
      toast(className + ' 今日已結算，分數已歸零');
      App.pendingTeacherTab = 'daily';
      openDatabase();
    });
  }

  function statCard(label, value) {
    return '<div class="stat-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(String(value)) + '</strong></div>';
  }

  function renderDailyPanel(data) {
    if (els.dailyToday && data.today) {
      els.dailyToday.innerHTML =
        statCard('今日日期', data.today.date) +
        statCard('今日總分', data.today.total) +
        statCard('加分人數', data.today.plusCount) +
        statCard('扣分人數', data.today.minusCount) +
        statCard('尚未加減', data.today.zeroCount);
    }
    if (!els.dailyBody) return;
    var days = data.days || [];
    if (!days.length) {
      els.dailyBody.innerHTML = '<tr><td colspan="5">還沒有結算紀錄。下課前按「結算今日分數」即可。</td></tr>';
      return;
    }
    els.dailyBody.innerHTML = days.map(function (day) {
      return '<tr><td>' + escapeHtml(day.date) + '</td><td>' + day.total + '</td><td>' +
        day.plusCount + '</td><td>' + day.minusCount + '</td><td>' + day.average + '</td></tr>';
    }).join('');
  }

  function renderStatsPanel(data) {
    if (els.statsCards) {
      var top = (data.students && data.students[0]) ? data.students[0].name + '（' + data.students[0].grand + '）' : '—';
      els.statsCards.innerHTML =
        statCard('學生人數', data.studentCount) +
        statCard('已結算天數', data.settledDays) +
        statCard('已結算總分', data.settledTotal) +
        statCard('今日進行中', data.today ? data.today.total : 0) +
        statCard('合計總分', data.grandTotal) +
        statCard('目前第一', top);
    }
    if (!els.statsBody) return;
    var rows = data.students || [];
    if (!rows.length) {
      els.statsBody.innerHTML = '<tr><td colspan="6">尚無統計資料</td></tr>';
      return;
    }
    els.statsBody.innerHTML = rows.map(function (row, index) {
      return '<tr><td>' + (index + 1) + '</td><td>' + escapeHtml(row.seatNo) + '</td><td>' +
        escapeHtml(row.name) + '</td><td>' + row.settledTotal + '</td><td>' +
        row.todayScore + '</td><td><strong>' + row.grand + '</strong></td></tr>';
    }).join('');
  }

  function mergeVisibleDatabaseRows() {
    var visible = collectDatabaseRows();
    var oldFilter = App.dbFilter || '__all__';
    if (oldFilter === '__all__') {
      App.dbRows = visible;
      return;
    }
    var kept = (App.dbRows || []).filter(function (row) {
      return row.className !== oldFilter;
    });
    App.dbRows = kept.concat(visible);
  }

  function fillDatabaseFilter(classNames) {
    if (!els.dbClassFilter) return;
    var current = els.dbClassFilter.value || (App.classroom && App.classroom.className) || '__all__';
    var names = classNames.slice();
    els.dbClassFilter.innerHTML = '<option value="__all__">全部班級</option>' + names.map(function (name) {
      return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
    }).join('');
    if (current && (current === '__all__' || names.indexOf(current) >= 0)) {
      els.dbClassFilter.value = current;
    } else if (App.classroom) {
      els.dbClassFilter.value = App.classroom.className;
    }
  }

  function renderDatabaseTable(rows) {
    if (!els.dbBody) return;
    var filter = els.dbClassFilter ? els.dbClassFilter.value : '__all__';
    var list = (rows || []).filter(function (row) {
      return filter === '__all__' || row.className === filter;
    });
    els.dbBody.innerHTML = '';
    if (!list.length) {
      addDatabaseRow({
        className: filter === '__all__' ? ((App.classroom && App.classroom.className) || '') : filter,
        seatNo: '',
        name: '',
        score: 0
      }, false);
      return;
    }
    list.forEach(function (row) {
      addDatabaseRow(row, false);
    });
  }

  function addDatabaseRow(row, focus) {
    if (!els.dbBody) return;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="col-class"><input data-col="className" type="text" maxlength="40" value="' + escapeHtml(row.className || '') + '" /></td>' +
      '<td class="col-seat"><input data-col="seatNo" type="text" maxlength="12" value="' + escapeHtml(row.seatNo || '') + '" /></td>' +
      '<td class="col-name"><input data-col="name" type="text" maxlength="40" value="' + escapeHtml(row.name || '') + '" /></td>' +
      '<td class="col-score"><input data-col="score" type="number" step="1" value="' + (Number(row.score) || 0) + '" /></td>' +
      '<td class="col-del"><button type="button" class="tool danger" data-del>刪</button></td>';
    els.dbBody.appendChild(tr);
    if (focus) {
      var seat = tr.querySelector('[data-col="seatNo"]');
      if (seat) seat.focus();
    }
  }

  function collectDatabaseRows() {
    var rows = [];
    if (!els.dbBody) return rows;
    els.dbBody.querySelectorAll('tr').forEach(function (tr) {
      var className = tr.querySelector('[data-col="className"]').value.trim();
      var seatNo = tr.querySelector('[data-col="seatNo"]').value.trim();
      var name = tr.querySelector('[data-col="name"]').value.trim();
      var score = Number(tr.querySelector('[data-col="score"]').value);
      if (!className && !seatNo && !name) return;
      rows.push({
        className: className,
        seatNo: seatNo,
        name: name,
        score: isFinite(score) ? score : 0
      });
    });
    return rows;
  }

  function saveDatabase() {
    mergeVisibleDatabaseRows();
    var filter = els.dbClassFilter ? els.dbClassFilter.value : '__all__';
    var rows = filter === '__all__' ? (App.dbRows || []) : collectDatabaseRows();
    var incomplete = rows.filter(function (row) {
      return !row.className || !row.seatNo || !row.name;
    });
    if (incomplete.length) {
      toast('每一列都要填班級、座號、姓名');
      return;
    }
    if (!rows.length) {
      toast('請至少保留一位學生');
      return;
    }
    var body = {
      rows: rows,
      mode: filter === '__all__' ? 'all' : 'class',
      className: filter === '__all__' ? '' : filter
    };
    run('saveRecords', [body], function (data) {
      applyPayload(data, true);
      renderDatabaseTable(App.dbRows || rows);
      toast('資料已更改，座位表已更新');
      refreshTeacherExtras();
    });
  }

  function openLottery(fromButton) {
    if (App.lotteryBusy) return;
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
    App.lotteryBusy = true;
    els.lotteryModal.hidden = false;
    if (els.lotteryStamp) els.lotteryStamp.hidden = true;
    if (els.lotteryCard) {
      els.lotteryCard.classList.remove('revealed');
      els.lotteryCard.classList.add('rolling');
    }
    const winner = pool[Math.floor(Math.random() * pool.length)];
    animateLottery(pool, winner, function () {
      App.drawn[App.classroom.className] = drawn.concat([winner.seatNo]);
      App.selectedSeatNo = winner.seatNo;
      els.lotteryName.textContent = winner.name;
      els.lotteryMeta.textContent = '就是你！座號 ' + winner.seatNo + ' · 目前 ' + winner.score + ' 分';
      if (els.lotteryStamp) els.lotteryStamp.hidden = false;
      if (els.lotteryCard) {
        els.lotteryCard.classList.remove('rolling');
        els.lotteryCard.classList.add('revealed');
      }
      renderAll();
      flashSeat(winner.seatNo, 'winner');
      spawnSparkBurst(els.lotteryCard, 28);
      spawnSparkBurst(els.board.querySelector('.seat-card[data-seat="' + cssEscape(winner.seatNo) + '"]'), 16);
      App.lotteryBusy = false;
      run('logLottery', [{
        className: App.classroom.className,
        seatNo: winner.seatNo,
        name: winner.name,
        detail: fromButton ? '抽籤' : '再抽一次'
      }], function () {}, true);
    });
  }

  function animateLottery(pool, winner, done) {
    let i = 0;
    const steps = 9;
    function tick() {
      const temp = i >= steps - 1 ? winner : pool[Math.floor(Math.random() * pool.length)];
      els.lotteryName.textContent = temp.name;
      els.lotteryMeta.textContent = '座號 ' + temp.seatNo;
      if (els.lotteryStamp) els.lotteryStamp.hidden = true;
      i += 1;
      if (i >= steps) {
        done();
        return;
      }
      setTimeout(tick, 35 + i * 12);
    }
    tick();
  }

  function resetDrawn() {
    App.drawn[App.classroom.className] = [];
    els.lotteryName.textContent = '？';
    els.lotteryMeta.textContent = '已重置，可再抽全部學生';
    if (els.lotteryStamp) els.lotteryStamp.hidden = true;
    if (els.lotteryCard) els.lotteryCard.classList.remove('rolling', 'revealed');
    toast('抽籤名單已重置');
  }

  function saveAll() {
    run('saveClassroomState', [serializeClassroom()], function (data) {
      applyPayload(data, true);
      toast('已存到這個瀏覽器，關掉再開還在');
    });
  }

  function downloadBackup() {
    if (typeof SeatDB === 'undefined' || !SeatDB.exportJSON) {
      toast('無法下載備份');
      return;
    }
    downloadText('座位表備份.json', SeatDB.exportJSON(), 'application/json;charset=utf-8');
    toast('已下載備份，換電腦時用「還原備份」即可');
  }

  function downloadClassCsv() {
    if (!App.classroom || typeof SeatDB === 'undefined' || !SeatDB.exportCSV) {
      toast('沒有可下載的名單');
      return;
    }
    downloadText(App.classroom.className + '-學生名單.csv', SeatDB.exportCSV(App.classroom.className), 'text/csv;charset=utf-8');
    toast('已下載本班 CSV，可用 Excel 打開修改後再上傳');
  }

  function restoreBackup(file) {
    var reader = new FileReader();
    reader.onload = function (event) {
      SeatDB.importJSON(String(event.target.result || ''))
        .then(function (data) {
          applyPayload(data, true);
          toast('已還原備份');
        })
        .catch(function () {
          toast('備份檔格式不正確');
        });
    };
    reader.readAsText(file, 'UTF-8');
  }

  function downloadText(filename, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 500);
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
    els.settingStudents.placeholder = '301,01,陳安安\n301,02,林冠宇';
    if (els.settingReplace) els.settingReplace.checked = false;
    if (els.settingFile) els.settingFile.value = '';
    App.pendingImport = null;
    renderUploadPreview(null);
  }

  function saveSettings() {
    const className = els.settingClassName.value.trim();
    const rows = Number(els.settingRows.value);
    const cols = Number(els.settingCols.value);
    const pasted = parseRosterText(els.settingStudents.value, className);
    const imported = pasted;
    const replace = !!(els.settingReplace && els.settingReplace.checked);
    if (!className) {
      toast('請輸入班級名稱');
      return;
    }
    if (App.busy) return;
    App.busy = true;
    api('saveSettings', [{ className: className, rows: rows, cols: cols }])
      .then(function () {
        if (!imported.length) {
          return api('loadClassroom', [className]).then(function (data) {
            applyPayload(data, true);
            toast('班級行列設定已儲存');
          });
        }
        return importRoster(imported, replace, className);
      })
      .then(function () {
        App.busy = false;
      })
      .catch(function (error) {
        App.busy = false;
        toast(error && error.message ? error.message : '儲存失敗，請再試一次');
      });
  }

  function importRoster(rows, replace, fallbackClass) {
    const grouped = groupByClass(rows, fallbackClass);
    const classNames = Object.keys(grouped);
    if (!classNames.length) {
      throw new Error('找不到有效的班級、座號、姓名');
    }
    toast('正在匯入 ' + classNames.length + ' 個班級…');
    let chain = Promise.resolve();
    classNames.forEach(function (cn) {
      chain = chain.then(function () {
        if (replace) {
          return api('clearClassStudents', [cn]);
        }
      }).then(function () {
        return upsertInBatches(cn, grouped[cn]);
      });
    });
    return chain.then(function () {
      const target = grouped[fallbackClass] ? fallbackClass : classNames[0];
      return api('loadClassroom', [target]);
    }).then(function (data) {
      App.drawn[data.classroom.className] = App.drawn[data.classroom.className] || [];
      applyPayload(data, true);
      els.classSelect.value = data.classroom.className;
      App.pendingImport = null;
      toast('已匯入 ' + rows.length + ' 位學生');
    });
  }

  function upsertInBatches(className, students) {
    return api('upsertStudents', [{ className: className, students: students }]);
  }

  function groupByClass(rows, fallbackClass) {
    const grouped = {};
    rows.forEach(function (row) {
      const className = String(row.className || fallbackClass || '').trim();
      if (!className || !row.seatNo || !row.name) return;
      if (!grouped[className]) grouped[className] = [];
      grouped[className].push({
        seatNo: row.seatNo,
        name: row.name,
        score: row.score
      });
    });
    return grouped;
  }

  function readRosterFile(file) {
    const name = String(file && file.name || '').toLowerCase();
    if (/\.xlsx?$/.test(name)) {
      if (typeof XLSX === 'undefined') {
        toast('無法讀取 Excel，請另存成 CSV UTF-8 再上傳');
        return;
      }
      const reader = new FileReader();
      reader.onload = function (event) {
        try {
          const workbook = XLSX.read(event.target.result, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const table = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
          App.pendingImport = parseRosterTable(table, els.settingClassName.value.trim());
          afterFileParsed(file.name);
        } catch (err) {
          toast('Excel 讀取失敗，請改用 CSV 範本');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = function (event) {
      App.pendingImport = parseRosterText(event.target.result, els.settingClassName.value.trim());
      afterFileParsed(file.name);
    };
    reader.onerror = function () {
      toast('檔案讀取失敗');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function afterFileParsed(fileName) {
    if (!App.pendingImport || !App.pendingImport.length) {
      renderUploadPreview(null);
      toast('檔案裡找不到班級、座號、姓名，請用範本格式');
      return;
    }
    renderUploadPreview(fileName);
    const lines = App.pendingImport.map(function (row) {
      var line = row.className + ',' + row.seatNo + ',' + row.name;
      if (row.score !== undefined) line += ',' + row.score;
      return line;
    }).join('\n');
    els.settingStudents.value = lines;
    if (App.pendingImport[0].className) {
      els.settingClassName.value = App.pendingImport[0].className;
    }
    toast('已讀取 ' + App.pendingImport.length + ' 位學生，按儲存即可');
  }

  function renderUploadPreview(fileName) {
    if (!els.uploadPreview) return;
    if (!App.pendingImport || !App.pendingImport.length) {
      els.uploadPreview.hidden = true;
      els.uploadPreview.textContent = '';
      return;
    }
    const classes = {};
    App.pendingImport.forEach(function (row) {
      classes[row.className] = true;
    });
    els.uploadPreview.hidden = false;
    els.uploadPreview.textContent = (fileName ? fileName + '：' : '') +
      '共 ' + App.pendingImport.length + ' 位學生、' + Object.keys(classes).length + ' 個班級';
  }

  function parseRosterText(text, fallbackClass) {
    const table = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).map(function (line) {
      return splitCsvLine(line);
    });
    return parseRosterTable(table, fallbackClass);
  }

  function splitCsvLine(line) {
    return String(line || '').split(/[,，\t;]+/).map(function (part) {
      return String(part || '').trim().replace(/^["']|["']$/g, '');
    });
  }

  function parseRosterTable(table, fallbackClass) {
    const rows = Array.isArray(table) ? table : [];
    const students = [];
    let map = null;
    rows.forEach(function (raw, index) {
      const cells = (raw || []).map(function (cell) {
        return String(cell == null ? '' : cell).trim();
      }).filter(function (cell, i, arr) {
        return cell || arr.join('');
      });
      if (!cells.length) return;
      if (index === 0 && isHeaderRow(cells)) {
        map = headerMap(cells);
        return;
      }
      const parsed = map ? rowFromHeader(cells, map, fallbackClass) : rowFromPosition(cells, fallbackClass);
      if (parsed && parsed.seatNo && parsed.name) {
        students.push(parsed);
      }
    });
    return students;
  }

  function isHeaderRow(cells) {
    const text = cells.join(',').toLowerCase();
    return /班級|班別|class|座號|座号|seat|姓名|名字|name/.test(text);
  }

  function headerMap(cells) {
    const map = { className: -1, seatNo: -1, name: -1, score: -1 };
    cells.forEach(function (cell, i) {
      const key = String(cell).toLowerCase();
      if (/班級|班別|class/.test(key)) map.className = i;
      else if (/座號|座号|seat|學號|学号/.test(key)) map.seatNo = i;
      else if (/姓名|名字|name/.test(key)) map.name = i;
      else if (/分數|分数|score|成績|成绩/.test(key)) map.score = i;
    });
    return map;
  }

  function rowFromHeader(cells, map, fallbackClass) {
    return normalizeStudent({
      className: map.className >= 0 ? cells[map.className] : fallbackClass,
      seatNo: map.seatNo >= 0 ? cells[map.seatNo] : '',
      name: map.name >= 0 ? cells[map.name] : '',
      score: map.score >= 0 ? cells[map.score] : undefined
    }, fallbackClass);
  }

  function rowFromPosition(cells, fallbackClass) {
    if (cells.length >= 3 && !looksLikeSeatNo(cells[0])) {
      return normalizeStudent({
        className: cells[0],
        seatNo: cells[1],
        name: cells[2],
        score: cells[3]
      }, fallbackClass);
    }
    if (cells.length >= 3 && looksLikeSeatNo(cells[0]) && isNumeric(cells[2])) {
      return normalizeStudent({
        className: fallbackClass,
        seatNo: cells[0],
        name: cells[1],
        score: cells[2]
      }, fallbackClass);
    }
    return normalizeStudent({
      className: fallbackClass,
      seatNo: cells[0],
      name: cells.slice(1).join(' ')
    }, fallbackClass);
  }

  function normalizeStudent(row, fallbackClass) {
    const seatNo = String(row.seatNo || '').trim();
    const name = String(row.name || '').trim();
    const className = String(row.className || fallbackClass || '').trim();
    const item = { className: className, seatNo: seatNo, name: name };
    if (row.score !== undefined && row.score !== '') {
      const score = Number(row.score);
      if (isFinite(score)) item.score = score;
    }
    return item;
  }

  function looksLikeSeatNo(value) {
    return /^\d+[A-Za-z]?$|^[A-Za-z]\d+$/.test(String(value || '').trim());
  }

  function isNumeric(value) {
    return /^-?\d+(\.\d+)?$/.test(String(value || '').trim());
  }

  function parseStudentText(text) {
    return parseRosterText(text, (App.classroom && App.classroom.className) || '');
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
    card.classList.remove('score-plus', 'score-minus', 'winner');
    void card.offsetWidth;
    card.classList.add(className);
    setTimeout(function () {
      card.classList.remove(className);
    }, className === 'winner' ? 1200 : 900);
  }

  function spawnScoreFloat(seatNo, delta) {
    const card = els.board.querySelector('.seat-card[data-seat="' + cssEscape(seatNo) + '"]');
    const node = document.createElement('div');
    node.className = 'score-float ' + (delta > 0 ? 'plus' : 'minus');
    node.textContent = (delta > 0 ? '+' : '') + delta;
    const rect = card ? card.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    node.style.left = (rect.left + rect.width / 2) + 'px';
    node.style.top = (rect.top + Math.max(8, rect.height * 0.15)) + 'px';
    document.body.appendChild(node);
    setTimeout(function () {
      node.remove();
    }, 1100);
  }

  function spawnSparkBurst(origin, count) {
    const layer = els.fxLayer;
    if (!layer) return;
    const rect = origin && origin.getBoundingClientRect
      ? origin.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const palette = ['#ffe28a', '#d9852b', '#fff', '#7eb6d6', '#f3c84b'];
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 70 + Math.random() * 90;
      spark.className = 'spark';
      spark.style.left = cx + 'px';
      spark.style.top = cy + 'px';
      spark.style.background = palette[i % palette.length];
      spark.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      spark.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      layer.appendChild(spark);
      setTimeout(function () {
        spark.remove();
      }, 700);
    }
    const ring = document.createElement('span');
    ring.className = 'spark-ring';
    ring.style.left = cx + 'px';
    ring.style.top = cy + 'px';
    layer.appendChild(ring);
    setTimeout(function () {
      ring.remove();
    }, 650);
  }

  function spawnConfetti(count, colors) {
    const layer = els.fxLayer;
    if (!layer) return;
    const palette = colors || ['#d9852b', '#f3c84b', '#2c7a4b', '#7eb6d6'];
    for (let i = 0; i < count; i++) {
      const bit = document.createElement('span');
      bit.className = 'confetti';
      bit.style.left = Math.random() * 100 + 'vw';
      bit.style.background = palette[i % palette.length];
      bit.style.animationDuration = (1.1 + Math.random() * 1.4) + 's';
      bit.style.animationDelay = (Math.random() * 0.18) + 's';
      bit.style.transform = 'rotate(' + Math.floor(Math.random() * 180) + 'deg)';
      layer.appendChild(bit);
      setTimeout(function () {
        bit.remove();
      }, 2600);
    }
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
    api(fnName, args)
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

  function api(fnName, args) {
    return Promise.resolve().then(function () {
      if (typeof SeatDB[fnName] !== 'function') {
        throw new Error('找不到功能 ' + fnName);
      }
      return SeatDB[fnName].apply(SeatDB, args);
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