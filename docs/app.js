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
    pendingImport: null,
    activeDate: '',
    viewDate: '',
    dailyDays: [],
    gradeView: 'term',
    gradeOpen: { usual: true, quiz: false, exam: false, sum: false },
    gradebook: null,
    weekKey: ''
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
    dbDateFilter: document.getElementById('dbDateFilter'),
    scoreDayLabel: document.getElementById('scoreDayLabel'),
    dbScoreHead: document.getElementById('dbScoreHead'),
    sheetStats: document.getElementById('sheetStats'),
    sheetHead: document.getElementById('sheetHead'),
    sheetBody: document.getElementById('sheetBody'),
    sheetFoot: document.getElementById('sheetFoot'),
    statsCards: document.getElementById('statsCards'),
    statsInsights: document.getElementById('statsInsights'),
    statsBody: document.getElementById('statsBody'),
    chartDaily: document.getElementById('chartDaily'),
    chartRank: document.getElementById('chartRank'),
    chartPlusMinus: document.getElementById('chartPlusMinus'),
    chartDist: document.getElementById('chartDist'),
    gradeTermWrap: document.getElementById('gradeTermWrap'),
    gradeWeekHead: document.getElementById('gradeWeekHead'),
    gradeWeekBody: document.getElementById('gradeWeekBody'),
    gradeRuleBox: document.getElementById('gradeRuleBox'),
    weekSelect: document.getElementById('weekSelect'),
    gradeColName: document.getElementById('gradeColName'),
    gradeColDate: document.getElementById('gradeColDate'),
    gradeColType: document.getElementById('gradeColType'),
    gradeColDue: document.getElementById('gradeColDue'),
    gradeDueWrap: document.getElementById('gradeDueWrap'),
    ruleBase: document.getElementById('ruleBase'),
    ruleClassW: document.getElementById('ruleClassW'),
    ruleQuizW: document.getElementById('ruleQuizW'),
    ruleExamW: document.getElementById('ruleExamW'),
    ruleHolidays: document.getElementById('ruleHolidays'),
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
  if (els.dbDateFilter) {
    els.dbDateFilter.addEventListener('change', function () {
      setViewDate(els.dbDateFilter.value);
    });
  }
  var prevDay = document.getElementById('btnDayPrev');
  if (prevDay) prevDay.addEventListener('click', function () { shiftViewDate(-1); });
  var nextDay = document.getElementById('btnDayNext');
  if (nextDay) nextDay.addEventListener('click', function () { shiftViewDate(1); });
  var sheetTable = document.getElementById('scoreSheet');
  if (sheetTable) {
    sheetTable.addEventListener('click', function (event) {
      var cell = event.target.closest('[data-day]');
      if (!cell) return;
      setViewDate(cell.getAttribute('data-day'));
    });
  }
  var exportSheet = document.getElementById('btnExportSheet');
  if (exportSheet) exportSheet.addEventListener('click', downloadScoreSheet);
  var exportReport = document.getElementById('btnExportReport');
  if (exportReport) exportReport.addEventListener('click', exportGradeExcel);
  var importGrades = document.getElementById('btnImportGrades');
  if (importGrades) importGrades.addEventListener('click', function () {
    var input = document.getElementById('gradeExcelFile');
    if (input) input.click();
  });
  var gradeExcelOut = document.getElementById('btnGradeExcelOut');
  if (gradeExcelOut) gradeExcelOut.addEventListener('click', exportGradeExcel);
  var gradeExcelIn = document.getElementById('btnGradeExcelIn');
  if (gradeExcelIn) gradeExcelIn.addEventListener('click', function () {
    var input = document.getElementById('gradeExcelFile');
    if (input) input.click();
  });
  var gradeExcelFile = document.getElementById('gradeExcelFile');
  if (gradeExcelFile) {
    gradeExcelFile.addEventListener('change', function () {
      if (gradeExcelFile.files && gradeExcelFile.files[0]) {
        importGradeExcel(gradeExcelFile.files[0]);
        gradeExcelFile.value = '';
      }
    });
  }
  var gradeTermFold = document.getElementById('gradeTermView');
  var gradeWeekFold = document.getElementById('gradeWeekView');
  if (gradeTermFold) {
    gradeTermFold.addEventListener('toggle', function () {
      if (gradeTermFold.open) App.gradeView = 'term';
    });
  }
  if (gradeWeekFold) {
    gradeWeekFold.addEventListener('toggle', function () {
      if (gradeWeekFold.open) App.gradeView = 'week';
    });
  }
  var addGradeCol = document.getElementById('btnAddGradeCol');
  if (addGradeCol) addGradeCol.addEventListener('click', function () {
    addGradeColumn(els.gradeColType ? els.gradeColType.value : 'yellow');
  });
  if (els.gradeColType) {
    els.gradeColType.addEventListener('change', syncGradeDueField);
    syncGradeDueField();
  }
  var saveGrades = document.getElementById('btnSaveGrades');
  if (saveGrades) saveGrades.addEventListener('click', function () { saveGradebookFromTable(true); });
  var saveRules = document.getElementById('btnSaveRules');
  if (saveRules) saveRules.addEventListener('click', saveGradeRules);
  if (els.weekSelect) {
    els.weekSelect.addEventListener('change', function () {
      App.weekKey = els.weekSelect.value;
      renderWeekGrades();
    });
  }
  var gradeTermWrap = document.getElementById('gradeTermWrap');
  if (gradeTermWrap) {
    gradeTermWrap.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-del-grade]');
      if (!btn) return;
      deleteGradeColumn(btn.getAttribute('data-kind'), btn.getAttribute('data-id'));
    });
    gradeTermWrap.addEventListener('change', onGradeCellChange);
    gradeTermWrap.addEventListener('input', scheduleAutoGradeSave);
  }
  ['ruleBase', 'ruleClassW', 'ruleQuizW', 'ruleExamW', 'ruleHolidays'].forEach(function (id) {
    var field = document.getElementById(id);
    if (!field) return;
    field.addEventListener('change', scheduleAutoRuleSave);
    field.addEventListener('input', scheduleAutoRuleSave);
  });
  document.addEventListener('seat-cloud', function () {
    fillCloudSettings();
    renderMeta();
  });
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
  var cloudBtn = document.getElementById('btnCloudConnect');
  if (cloudBtn) cloudBtn.addEventListener('click', connectCloud);
  var cloudUrl = document.getElementById('cloudApiUrl');
  if (cloudUrl) {
    cloudUrl.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        connectCloud();
      }
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
      fillCloudSettings();
      if (!cloudConnected()) {
        toast('資料還沒上雲端。請切到教師模式 → 設定，連上 Google 試算表，平板和筆電才能共用');
      } else if (App.classroom && !App.classroom.students.length) {
        toast('這個班還沒有學生，請切到「教師模式」輸入名單');
      } else {
        toast('已從雲端載入，平板與筆電會看到同一份資料');
      }
    });
  }

  setInterval(syncScoreDay, 30000);
  setInterval(pullCloudQuiet, 12000);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (typeof SeatDB !== 'undefined' && SeatDB.flushCloud) SeatDB.flushCloud().catch(function () {});
      return;
    }
    syncScoreDay();
    pullCloudQuiet();
  });
  window.addEventListener('pagehide', function () {
    if (typeof SeatDB !== 'undefined' && SeatDB.flushCloud) SeatDB.flushCloud().catch(function () {});
  });

  function cloudConnected() {
    var info = typeof SeatDB !== 'undefined' && SeatDB.cloudStatus ? SeatDB.cloudStatus() : {};
    return !!(info.enabled && !info.localOnly);
  }

  function fillCloudSettings() {
    var info = typeof SeatDB !== 'undefined' && SeatDB.cloudStatus ? SeatDB.cloudStatus() : {};
    var urlInput = document.getElementById('cloudApiUrl');
    if (urlInput && (!urlInput.value || urlInput !== document.activeElement)) {
      urlInput.value = info.url || '';
    }
    var line = document.getElementById('cloudStatusLine');
    if (line) {
      if (info.saving) line.textContent = '正在存到雲端…';
      else if (info.enabled && !info.error) line.textContent = '已連上雲端，修改後會自動存，平板與筆電共用';
      else if (info.error) line.textContent = info.error;
      else line.textContent = '尚未連線：請先部署 Apps Script 並貼上網址';
    }
    var link = document.getElementById('cloudSheetLink');
    if (link) {
      if (info.sheetUrl) {
        link.innerHTML = '<a href="' + escapeHtml(info.sheetUrl) + '" target="_blank" rel="noopener">打開 Google 試算表資料庫</a>';
      } else {
        link.textContent = '';
      }
    }
  }

  function pullCloudQuiet() {
    if (App.busy || App.dirty || App.lotteryBusy) return;
    if (typeof SeatDB === 'undefined' || !SeatDB.pullIfNewer) return;
    if (gradeSaveTimer || ruleSaveTimer) return;
    if (App.appView === 'teacher' && (App.teacherTab === 'summary' || App.teacherTab === 'settings')) return;
    var className = App.classroom && App.classroom.className;
    SeatDB.pullIfNewer(className).then(function (data) {
      fillCloudSettings();
      renderMeta();
      if (!data || !data.changed) return;
      applyPayload(data, true);
      if (App.appView === 'teacher') refreshTeacherExtras();
      toast('已從雲端同步（另一台裝置剛更新）');
    }).catch(function () {
      fillCloudSettings();
      renderMeta();
    });
  }

  function connectCloud() {
    var urlInput = document.getElementById('cloudApiUrl');
    var url = urlInput ? urlInput.value.trim() : '';
    if (!url) {
      toast('請先貼上 Apps Script 網頁應用程式網址');
      return;
    }
    run('connectCloud', [url, App.classroom && App.classroom.className], function (data) {
      applyPayload(data, true);
      fillCloudSettings();
      toast('已連上雲端，之後平板和筆電都會用這份資料');
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
    noteScoreRoll(data);
    if (replace || !App.classroom) {
      App.classroom = data.classroom;
      App.dirty = false;
      App.selectedSeatNo = null;
    }
    renderAll();
  }

  function noteScoreRoll(data) {
    if (!data) return;
    var prevActive = App.activeDate;
    if (data.activeDate) {
      App.activeDate = data.activeDate;
      if (!App.viewDate || !prevActive || App.viewDate === prevActive) {
        App.viewDate = data.activeDate;
      }
    }
    if (data.rolled && data.closedDate) {
      toast('已過晚上 10 點，已自動存下 ' + formatZhDate(data.closedDate) + ' 的加扣分');
    }
    updateScoreDayLabel();
  }

  function syncScoreDay() {
    if (!App.classroom) return;
    api('loadClassroom', [App.classroom.className]).then(function (data) {
      if (!data || !data.rolled) {
        if (data && data.activeDate) noteScoreRoll(data);
        return;
      }
      applyPayload(data, true);
      if (App.appView === 'teacher') openDatabase();
    }).catch(function () {});
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
    var info = typeof SeatDB !== 'undefined' && SeatDB.cloudStatus ? SeatDB.cloudStatus() : {};
    var where = info.saving ? '正在存到雲端'
      : (info.enabled && !info.error) ? '已自動存到雲端'
      : (info.error ? '雲端同步失敗' : '只在這台裝置');
    els.syncMeta.textContent = App.classroom.students.length + ' 位學生 · ' + where +
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
    if (!window.confirm('要把「' + App.classroom.className + '」目前這一天的加扣分都歸零嗎？以前存檔的日期不會刪，座位也不會變。')) {
      return;
    }
    run('resetScores', [App.classroom.className], function (data) {
      App.classroom = data.classroom;
      App.rankBumpSeat = null;
      renderAll();
      toast('已重製目前這一天的加扣分，以前的日期還在');
    });
  }

  function openDatabase() {
    var start = function () {
      run('listRecords', [], function (data) {
        noteScoreRoll(data);
        App.dbRows = data.rows || [];
        App.dbFilter = (App.classroom && App.classroom.className) || '__all__';
        fillDatabaseFilter(data.classNames || App.classNames || []);
        if (els.dbClassFilter) els.dbClassFilter.value = App.dbFilter;
        if (!App.viewDate && App.activeDate) App.viewDate = App.activeDate;
        renderDatabaseTable(App.dbRows);
        switchTeacherTab(App.pendingTeacherTab || App.teacherTab || 'roster');
        App.pendingTeacherTab = null;
        refreshTeacherExtras();
        showTeacherView();
      });
    };
    if (typeof SeatDB !== 'undefined' && SeatDB.pullIfNewer && !App.dirty) {
      SeatDB.pullIfNewer(App.classroom && App.classroom.className).then(function (data) {
        if (data && data.changed) applyPayload(data, true);
        start();
      }).catch(start);
      return;
    }
    start();
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
    var summary = document.getElementById('tabSummary');
    var stats = document.getElementById('tabStats');
    var settings = document.getElementById('tabSettings');
    if (roster) roster.hidden = App.teacherTab !== 'roster';
    if (daily) daily.hidden = App.teacherTab !== 'daily';
    if (summary) summary.hidden = App.teacherTab !== 'summary';
    if (stats) stats.hidden = App.teacherTab !== 'stats';
    if (settings) settings.hidden = App.teacherTab !== 'settings';
    document.querySelectorAll('.teacher-tab-only').forEach(function (btn) {
      btn.hidden = btn.getAttribute('data-for-tab') !== App.teacherTab;
    });
    var saveBtn = document.getElementById('btnDatabaseSave');
    if (saveBtn) saveBtn.hidden = App.teacherTab !== 'roster' || !viewingLiveScores();
    var footer = document.querySelector('.teacher-footer');
    if (footer) footer.hidden = App.teacherTab !== 'roster' || !viewingLiveScores();
    if (els.dbClassFilter && els.dbClassFilter.parentElement) {
      els.dbClassFilter.parentElement.hidden = App.teacherTab === 'settings';
    }
    document.querySelectorAll('.teacher-date-only').forEach(function (el) {
      el.hidden = App.teacherTab === 'settings' || App.teacherTab === 'stats' || App.teacherTab === 'summary';
    });
    updateScoreDayLabel();
    if (App.teacherTab === 'settings' && changed) openSettings();
    if (App.teacherTab !== 'roster' && App.teacherTab !== 'settings') refreshTeacherExtras();
  }

  function refreshTeacherExtras() {
    var className = teacherTargetClass();
    if (!className) return;
    api('listDaily', [className]).then(function (data) {
      noteScoreRoll(data);
      renderDailyPanel(data);
      renderDatabaseTable(App.dbRows || []);
      return api('getGradebook', [className]);
    }).then(function (data) {
      applyGradebook(data);
      renderGradebook();
    }).catch(function () {});
  }

  function viewingLiveScores() {
    if (!App.viewDate || !App.activeDate) return true;
    return App.viewDate === App.activeDate;
  }

  function formatZhDate(key) {
    var parts = String(key || '').split('-');
    if (parts.length !== 3) return key || '';
    return Number(parts[0]) + '年' + Number(parts[1]) + '月' + Number(parts[2]) + '日';
  }

  function formatDateKey(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function parseDateKey(key) {
    var parts = String(key || '').split('-');
    if (parts.length !== 3) return new Date();
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function findDayRecord(date) {
    var days = App.dailyDays || [];
    for (var i = 0; i < days.length; i++) {
      if (days[i].date === date) return days[i];
    }
    return null;
  }

  function scoreForView(row) {
    if (viewingLiveScores()) return Number(row.score) || 0;
    var day = findDayRecord(App.viewDate);
    if (!day) return 0;
    var hit = (day.students || []).filter(function (s) {
      return String(s.seatNo) === String(row.seatNo) && String(s.name || '') === String(row.name || '');
    })[0];
    if (!hit) {
      hit = (day.students || []).filter(function (s) {
        return String(s.seatNo) === String(row.seatNo);
      })[0];
    }
    return hit ? Number(hit.score) || 0 : 0;
  }

  function updateScoreDayLabel() {
    var date = App.viewDate || App.activeDate;
    if (!date) return;
    var live = viewingLiveScores();
    var text = '正在看 ' + formatZhDate(date) + ' 的加扣分';
    text += live ? '（進行中，晚上 10 點自動存檔）' : '（已存檔）';
    if (els.scoreDayLabel) els.scoreDayLabel.textContent = text;
    if (els.dbDateFilter) {
      els.dbDateFilter.value = date;
      if (App.activeDate) els.dbDateFilter.max = App.activeDate;
    }
    if (els.dbScoreHead) els.dbScoreHead.textContent = live ? '進行中分數' : formatZhDate(date);
    var hint = document.getElementById('rosterHint');
    if (hint) {
      hint.textContent = live
        ? '直接改班級、座號、姓名與這一天的分數。晚上 10 點會自動存檔。改完按「儲存名單」。'
        : '這是 ' + formatZhDate(date) + ' 已存檔的加扣分，只能查看。要改名單請回到目前計分日。';
    }
    var saveBtn = document.getElementById('btnDatabaseSave');
    if (saveBtn && App.teacherTab === 'roster') saveBtn.hidden = !live;
    var footer = document.querySelector('.teacher-footer');
    if (footer && App.teacherTab === 'roster') footer.hidden = !live;
    var addBtn = document.getElementById('btnDbAdd');
    if (addBtn && App.teacherTab === 'roster') addBtn.hidden = !live;
  }

  function setViewDate(date) {
    if (!date) return;
    if (App.activeDate && date > App.activeDate) date = App.activeDate;
    App.viewDate = date;
    updateScoreDayLabel();
    renderDatabaseTable(App.dbRows || []);
    renderDailyPanel({
      days: App.dailyDays || [],
      activeDate: App.activeDate
    });
  }

  function shiftViewDate(delta) {
    var current = parseDateKey(App.viewDate || App.activeDate || formatDateKey(new Date()));
    current.setDate(current.getDate() + delta);
    setViewDate(formatDateKey(current));
  }

  function statCard(label, value) {
    return '<div class="stat-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(String(value)) + '</strong></div>';
  }

  function insightItem(label, value) {
    return '<div class="insight-item"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(String(value)) + '</strong></div>';
  }

  function shortDate(key) {
    var parts = String(key || '').split('-');
    if (parts.length !== 3) return key || '';
    return Number(parts[1]) + '/' + Number(parts[2]);
  }

  function seatOrder(a, b) {
    return parseInt(String(a.seatNo).replace(/\D/g, ''), 10) - parseInt(String(b.seatNo).replace(/\D/g, ''), 10);
  }

  function scoreCellClass(n) {
    n = Number(n) || 0;
    if (n > 0) return 'day-plus';
    if (n < 0) return 'day-minus';
    return 'muted-zero';
  }

  function scoreCellText(n) {
    n = Number(n) || 0;
    return n > 0 ? '+' + n : String(n);
  }

  function medianOf(nums) {
    var list = nums.slice().sort(function (a, b) { return a - b; });
    if (!list.length) return 0;
    var mid = Math.floor(list.length / 2);
    if (list.length % 2) return list[mid];
    return Math.round(((list[mid - 1] + list[mid]) / 2) * 10) / 10;
  }

  function stdevOf(nums) {
    if (!nums.length) return 0;
    var mean = nums.reduce(function (sum, n) { return sum + n; }, 0) / nums.length;
    var variance = nums.reduce(function (sum, n) {
      return sum + (n - mean) * (n - mean);
    }, 0) / nums.length;
    return Math.round(Math.sqrt(variance) * 10) / 10;
  }

  function buildSheetModel() {
    var className = teacherTargetClass();
    var dates = (App.dailyDays || []).slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    });
    var students = (App.dbRows || []).filter(function (row) {
      return row.className === className;
    }).slice().sort(seatOrder);
    if (!students.length && App.classroom && App.classroom.className === className) {
      students = (App.classroom.students || []).map(function (s) {
        return { className: className, seatNo: s.seatNo, name: s.name, score: s.score };
      }).sort(seatOrder);
    }
    var maps = dates.map(function (day) {
      var map = {};
      (day.students || []).forEach(function (s) {
        map[String(s.seatNo)] = Number(s.score) || 0;
      });
      return map;
    });
    var rows = students.map(function (stu) {
      var cells = maps.map(function (map) {
        return Object.prototype.hasOwnProperty.call(map, String(stu.seatNo))
          ? map[String(stu.seatNo)]
          : 0;
      });
      var total = 0;
      var plusDays = 0;
      var minusDays = 0;
      var plusSum = 0;
      var minusSum = 0;
      var max = null;
      var min = null;
      cells.forEach(function (n) {
        total += n;
        if (n > 0) {
          plusDays += 1;
          plusSum += n;
        }
        if (n < 0) {
          minusDays += 1;
          minusSum += n;
        }
        if (max == null || n > max) max = n;
        if (min == null || n < min) min = n;
      });
      var avg = cells.length ? Math.round((total / cells.length) * 10) / 10 : 0;
      return {
        seatNo: stu.seatNo,
        name: stu.name,
        cells: cells,
        total: total,
        avg: avg,
        plusDays: plusDays,
        minusDays: minusDays,
        plusSum: plusSum,
        minusSum: minusSum,
        max: max == null ? 0 : max,
        min: min == null ? 0 : min
      };
    });
    var dayTotals = dates.map(function (day, i) {
      var sum = 0;
      rows.forEach(function (row) { sum += row.cells[i]; });
      return sum;
    });
    var dayAvgs = dates.map(function (day, i) {
      return rows.length ? Math.round((dayTotals[i] / rows.length) * 10) / 10 : 0;
    });
    var plusCounts = dates.map(function (day, i) {
      return rows.filter(function (row) { return row.cells[i] > 0; }).length;
    });
    var minusCounts = dates.map(function (day, i) {
      return rows.filter(function (row) { return row.cells[i] < 0; }).length;
    });
    var grand = rows.reduce(function (sum, row) { return sum + row.total; }, 0);
    var plusTotal = rows.reduce(function (sum, row) { return sum + row.plusSum; }, 0);
    var minusTotal = rows.reduce(function (sum, row) { return sum + row.minusSum; }, 0);
    var plusPeople = rows.filter(function (row) { return row.total > 0; }).length;
    var minusPeople = rows.filter(function (row) { return row.total < 0; }).length;
    var zeroPeople = rows.filter(function (row) { return row.total === 0; }).length;
    var classAvg = rows.length ? Math.round((grand / rows.length) * 10) / 10 : 0;
    var ranked = rows.slice().sort(function (a, b) { return b.total - a.total; });
    return {
      className: className,
      dates: dates,
      rows: rows,
      ranked: ranked,
      dayTotals: dayTotals,
      dayAvgs: dayAvgs,
      plusCounts: plusCounts,
      minusCounts: minusCounts,
      grand: grand,
      plusTotal: plusTotal,
      minusTotal: minusTotal,
      plusPeople: plusPeople,
      minusPeople: minusPeople,
      zeroPeople: zeroPeople,
      classAvg: classAvg,
      median: medianOf(rows.map(function (row) { return row.total; }))
    };
  }

  function renderDailyPanel(data) {
    data = data || {};
    if (data.days) App.dailyDays = data.days;
    var model = buildSheetModel();
    App.sheetModel = model;
    renderScoreSheet(model);
    renderStatsDashboard(model);
    renderGradebook();
  }

  function renderScoreSheet(model) {
    model = model || App.sheetModel || buildSheetModel();
    var viewDate = App.viewDate || App.activeDate;
    var viewDay = findDayRecord(viewDate);
    if (els.sheetStats) {
      els.sheetStats.innerHTML =
        statCard('班級', model.className || '—') +
        statCard('學生人數', model.rows.length) +
        statCard('紀錄天數', model.dates.length) +
        statCard('全班合計', model.grand) +
        statCard('全班平均', model.classAvg) +
        statCard('中位數', model.median) +
        statCard('查看中', formatZhDate(viewDate || '')) +
        statCard('當天總分', viewDay ? viewDay.total : 0);
    }
    if (!els.sheetHead || !els.sheetBody || !els.sheetFoot) return;
    if (!model.rows.length) {
      els.sheetHead.innerHTML = '<tr><th class="sticky-1">座號</th><th class="sticky-2">姓名</th><th>合計</th></tr>';
      els.sheetBody.innerHTML = '<tr><td class="sticky-1" colspan="3">這個班還沒有學生</td></tr>';
      els.sheetFoot.innerHTML = '';
      return;
    }
    var dateHeads = model.dates.map(function (day) {
      var on = day.date === viewDate ? ' col-on' : '';
      var mark = day.inProgress ? '*' : '';
      return '<th class="' + on + '" data-day="' + escapeHtml(day.date) + '">' +
        escapeHtml(shortDate(day.date)) + mark + '</th>';
    }).join('');
    els.sheetHead.innerHTML = '<tr>' +
      '<th class="sticky-1">座號</th><th class="sticky-2">姓名</th>' +
      dateHeads +
      '<th class="col-total">合計</th><th class="col-total">平均</th>' +
      '</tr>';
    els.sheetBody.innerHTML = model.rows.map(function (row) {
      var cells = row.cells.map(function (n, i) {
        var date = model.dates[i].date;
        var on = date === viewDate ? ' col-on' : '';
        return '<td class="' + scoreCellClass(n) + on + '" data-day="' + escapeHtml(date) + '">' +
          scoreCellText(n) + '</td>';
      }).join('');
      return '<tr>' +
        '<td class="sticky-1">' + escapeHtml(row.seatNo) + '</td>' +
        '<td class="sticky-2">' + escapeHtml(row.name) + '</td>' +
        cells +
        '<td class="col-total ' + scoreCellClass(row.total) + '">' + scoreCellText(row.total) + '</td>' +
        '<td class="col-total">' + row.avg + '</td>' +
        '</tr>';
    }).join('');
    var footDays = model.dayTotals.map(function (n, i) {
      var date = model.dates[i].date;
      var on = date === viewDate ? ' col-on' : '';
      return '<td class="' + scoreCellClass(n) + on + '" data-day="' + escapeHtml(date) + '">' +
        scoreCellText(n) + '</td>';
    }).join('');
    els.sheetFoot.innerHTML = '<tr>' +
      '<td class="sticky-1"></td><td class="sticky-2">當天總分</td>' +
      footDays +
      '<td class="col-total ' + scoreCellClass(model.grand) + '">' + scoreCellText(model.grand) + '</td>' +
      '<td class="col-total">' + model.classAvg + '</td>' +
      '</tr>';
  }

  function defaultGradeRules() {
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

  function emptyGradebook() {
    return {
      yellow: [],
      morning: [],
      exams: [],
      labs: [],
      practicals: [],
      homeworks: [],
      rules: defaultGradeRules()
    };
  }

  var GRADE_TYPE_LABEL = {
    yellow: '課堂考卷',
    morning: '早自習小考',
    exam: '段考',
    lab: '實作評量',
    practical: '實作成績',
    homework: '作業'
  };

  var TW_HOLIDAYS = {
    '2025-01-01': 1, '2025-01-27': 1, '2025-01-28': 1, '2025-01-29': 1, '2025-01-30': 1, '2025-01-31': 1,
    '2025-02-28': 1, '2025-04-03': 1, '2025-04-04': 1, '2025-05-01': 1, '2025-05-30': 1, '2025-05-31': 1,
    '2025-10-06': 1, '2025-10-10': 1,
    '2026-01-01': 1, '2026-02-16': 1, '2026-02-17': 1, '2026-02-18': 1, '2026-02-19': 1, '2026-02-20': 1,
    '2026-02-27': 1, '2026-02-28': 1, '2026-04-03': 1, '2026-04-04': 1, '2026-04-05': 1, '2026-04-06': 1,
    '2026-05-01': 1, '2026-06-19': 1, '2026-09-25': 1, '2026-09-26': 1, '2026-10-09': 1, '2026-10-10': 1,
    '2027-01-01': 1, '2027-02-04': 1, '2027-02-05': 1, '2027-02-06': 1, '2027-02-07': 1, '2027-02-08': 1,
    '2027-02-27': 1, '2027-02-28': 1, '2027-04-04': 1, '2027-04-05': 1, '2027-05-01': 1, '2027-06-09': 1,
    '2027-09-15': 1, '2027-10-10': 1, '2027-10-11': 1
  };

  function gradeRules() {
    return (App.gradebook && App.gradebook.rules) || defaultGradeRules();
  }

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  function usualFromRaw(raw) {
    var rules = gradeRules();
    var n = (Number(rules.base) || 0) + (Number(raw) || 0);
    return Math.max(rules.min || 0, Math.min(rules.max || 100, n));
  }

  function isLeaveScore(v) {
    return v === 'leave' || v === '請假';
  }

  function columnScore100(col, seatNo) {
    if (!col || !col.scores) return null;
    var v = col.scores[seatNo];
    if (isLeaveScore(v) || v === '' || v == null) return null;
    var n = Number(v);
    if (!isFinite(n)) return null;
    var max = Number(col.max) || 100;
    return round1(n / max * 100);
  }

  function average100(cols, seatNo) {
    var vals = [];
    (cols || []).forEach(function (col) {
      var v = columnScore100(col, seatNo);
      if (v != null) vals.push(v);
    });
    if (!vals.length) return null;
    return round1(vals.reduce(function (sum, n) { return sum + n; }, 0) / vals.length);
  }

  function isNonWorkday(dateKey) {
    var d = parseDateKey(dateKey);
    var wd = d.getDay();
    if (wd === 0 || wd === 6) return true;
    if (TW_HOLIDAYS[dateKey]) return true;
    var extra = gradeRules().holidays || [];
    return extra.indexOf(dateKey) >= 0;
  }

  function workDaysLate(dueKey, submittedKey) {
    if (!dueKey || !submittedKey || submittedKey <= dueKey) return 0;
    var d = parseDateKey(dueKey);
    var count = 0;
    for (var i = 0; i < 400; i++) {
      d.setDate(d.getDate() + 1);
      var key = formatDateKey(d);
      if (key > submittedKey) break;
      if (!isNonWorkday(key)) count++;
    }
    return count;
  }

  function isLateHomework(dueKey, submittedKey) {
    var allow = Number(gradeRules().lateWorkDays);
    if (!isFinite(allow)) allow = 1;
    return workDaysLate(dueKey, submittedKey) >= Math.max(allow, 1);
  }

  function homeworkResult(col, seatNo) {
    var rec = ((col && col.records) || {})[seatNo] || {};
    var rules = gradeRules();
    if (rec.status !== 'submitted') {
      return { status: 'missing', raw: null, final: 0, late: false, penalty: 0 };
    }
    if (rec.score === '' || rec.score == null || !isFinite(Number(rec.score))) {
      return { status: 'submitted', raw: null, final: null, late: false, penalty: 0 };
    }
    var max = Number(col.max) || 100;
    var raw100 = round1(Number(rec.score) / max * 100);
    var submittedAt = rec.submittedAt || col.dueDate || col.date;
    var late = isLateHomework(col.dueDate || col.date, submittedAt);
    var penalty = late ? (Number(rules.latePenalty) || 10) : 0;
    return {
      status: 'submitted',
      raw: Number(rec.score),
      final: Math.max(0, round1(raw100 - penalty)),
      late: late,
      penalty: penalty
    };
  }

  function averageHomework(cols, seatNo) {
    if (!(cols || []).length) return null;
    var vals = [];
    cols.forEach(function (col) {
      var result = homeworkResult(col, seatNo);
      if (result.status === 'submitted' && result.final == null) return;
      vals.push(result.final);
    });
    if (!vals.length) return null;
    return round1(vals.reduce(function (sum, n) { return sum + n; }, 0) / vals.length);
  }

  function classActivity(seatNo, mondayKey) {
    var sum = 0;
    var has = false;
    (App.dailyDays || []).forEach(function (day) {
      if (mondayKey && !inWeek(day.date, mondayKey)) return;
      (day.students || []).forEach(function (s) {
        if (String(s.seatNo) !== String(seatNo)) return;
        var n = Number(s.score) || 0;
        sum += n;
        if (n) has = true;
      });
    });
    return { raw: sum, has: has };
  }

  function usualBundle(seatNo, classRaw, hasClass, labs, practicals, homeworks) {
    var parts = [];
    if (hasClass) parts.push({ label: '上課', v: usualFromRaw(classRaw) });
    var labAvg = average100(labs, seatNo);
    if (labAvg != null) parts.push({ label: '實作評量', v: labAvg });
    var pracAvg = average100(practicals, seatNo);
    if (pracAvg != null) parts.push({ label: '實作成績', v: pracAvg });
    if ((homeworks || []).length) {
      var hwAvg = averageHomework(homeworks, seatNo);
      if (hwAvg != null) parts.push({ label: '作業', v: hwAvg });
    }
    if (!parts.length) return { usual: null, parts: [] };
    return {
      usual: round1(parts.reduce(function (sum, p) { return sum + p.v; }, 0) / parts.length),
      parts: parts
    };
  }

  function quizExamAvg(yellow, morning, seatNo) {
    return average100((yellow || []).concat(morning || []), seatNo);
  }

  function weightedScore(usual, quiz, exam) {
    var rules = gradeRules();
    var parts = [];
    if (usual != null) parts.push({ v: usual, w: Number(rules.classWeight) || 0 });
    if (quiz != null) parts.push({ v: quiz, w: Number(rules.quizWeight) || 0 });
    if (exam != null) parts.push({ v: exam, w: Number(rules.examWeight) || 0 });
    var wsum = parts.reduce(function (sum, p) { return sum + p.w; }, 0);
    if (!wsum) return null;
    return round1(parts.reduce(function (sum, p) { return sum + p.v * p.w; }, 0) / wsum);
  }

  function scoreFormula(usual, quiz, exam) {
    var rules = gradeRules();
    var parts = [];
    if (usual != null) parts.push({ label: '平時', v: usual, w: Number(rules.classWeight) || 0 });
    if (quiz != null) parts.push({ label: '平時考試', v: quiz, w: Number(rules.quizWeight) || 0 });
    if (exam != null) parts.push({ label: '段考', v: exam, w: Number(rules.examWeight) || 0 });
    var wsum = parts.reduce(function (sum, p) { return sum + p.w; }, 0);
    var total = weightedScore(usual, quiz, exam);
    if (!wsum || total == null) return '尚無成績';
    var bits = parts.map(function (p) {
      return p.label + ' ' + p.v + '×' + round1(p.w / wsum * 100) + '%';
    });
    var missing = [];
    if (usual == null) missing.push('無平時成績，只算平時考試');
    else if (quiz == null) missing.push('平時考試無');
    if (exam == null) missing.push('段考無');
    var note = '';
    if (usual == null) note = '（無平時成績，只算平時考試' + (exam == null ? '' : '與段考') + '，比重重算）';
    else if (missing.length) note = '（' + missing.join('、') + '，比重重算）';
    return bits.join(' ＋ ') + note + ' → ' + total;
  }

  function mondayOf(dateKey) {
    var d = parseDateKey(dateKey);
    var day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return formatDateKey(d);
  }

  function sundayOf(mondayKey) {
    var d = parseDateKey(mondayKey);
    d.setDate(d.getDate() + 6);
    return formatDateKey(d);
  }

  function inWeek(dateKey, mondayKey) {
    return dateKey >= mondayKey && dateKey <= sundayOf(mondayKey);
  }

  function colDateKey(col) {
    return (col && (col.dueDate || col.date)) || '';
  }

  function syncGradeDueField() {
    var isHw = els.gradeColType && els.gradeColType.value === 'homework';
    if (els.gradeDueWrap) els.gradeDueWrap.hidden = !isHw;
  }

  function onGradeCellChange(event) {
    var mark = event.target.closest('[data-grade-mark]');
    if (mark) {
      var cell = mark.closest('td');
      var input = cell && cell.querySelector('[data-grade-score]');
      var leave = mark.type === 'checkbox' ? mark.checked : mark.value === 'leave';
      if (input) {
        input.disabled = leave;
        if (leave) input.value = '';
      }
      scheduleAutoGradeSave();
      return;
    }
    var hwStatus = event.target.closest('[data-hw-status]');
    if (hwStatus) {
      var hwCell = hwStatus.closest('td');
      if (hwCell) {
        var submitted = hwStatus.value === 'submitted';
        hwCell.setAttribute('data-submitted', submitted ? '1' : '0');
        var score = hwCell.querySelector('[data-hw-score]');
        var date = hwCell.querySelector('[data-hw-date]');
        if (score) score.disabled = !submitted;
        if (date) {
          date.disabled = !submitted;
          if (submitted && !date.value) date.value = formatDateKey(new Date());
        }
      }
    }
    scheduleAutoGradeSave();
  }

  var gradeSaveTimer = null;
  var ruleSaveTimer = null;

  function scheduleAutoGradeSave() {
    if (!App.gradebook || !document.querySelector('#gradeTermWrap table')) return;
    clearTimeout(gradeSaveTimer);
    gradeSaveTimer = setTimeout(function () {
      saveGradebookFromTable(false);
    }, 700);
  }

  function scheduleAutoRuleSave() {
    clearTimeout(ruleSaveTimer);
    ruleSaveTimer = setTimeout(function () {
      saveGradeRules(false);
    }, 700);
  }

  function applyGradebook(data) {
    if (!data) return;
    App.gradebook = {
      yellow: data.yellow || data.quizzes || [],
      morning: data.morning || [],
      exams: data.exams || [],
      labs: data.labs || [],
      practicals: data.practicals || [],
      homeworks: data.homeworks || [],
      rules: Object.assign(defaultGradeRules(), data.rules || {})
    };
    fillRuleInputs();
  }

  function fillRuleInputs() {
    var rules = gradeRules();
    if (els.ruleBase) els.ruleBase.value = rules.base;
    if (els.ruleClassW) els.ruleClassW.value = rules.classWeight;
    if (els.ruleQuizW) els.ruleQuizW.value = rules.quizWeight;
    if (els.ruleExamW) els.ruleExamW.value = rules.examWeight;
    if (els.ruleHolidays) els.ruleHolidays.value = (rules.holidays || []).join(', ');
  }

  function switchGradeView(view) {
    App.gradeView = view === 'week' ? 'week' : 'term';
    var term = document.getElementById('gradeTermView');
    var week = document.getElementById('gradeWeekView');
    if (term) term.open = App.gradeView === 'term';
    if (week) week.open = App.gradeView === 'week';
  }

  function rememberOpenBoards() {
    var open = App.gradeOpen || { usual: true, quiz: false, exam: false, sum: false };
    var wrap = els.gradeTermWrap || document.getElementById('gradeTermWrap');
    if (wrap) {
      wrap.querySelectorAll('details.grade-board').forEach(function (el) {
        var hit = el.className.match(/tone-([a-z]+)/);
        if (hit) open[hit[1]] = el.open;
      });
    }
    App.gradeOpen = open;
    return open;
  }

  function renderGradebook() {
    if (!App.gradebook) {
      App.gradebook = emptyGradebook();
      fillRuleInputs();
    }
    if (els.gradeColDate && !els.gradeColDate.value && App.activeDate) {
      els.gradeColDate.value = App.activeDate;
    }
    if (els.gradeColDue && !els.gradeColDue.value && App.activeDate) {
      els.gradeColDue.value = App.activeDate;
    }
    syncGradeDueField();
    renderTermGrades();
    renderWeekGrades();
  }

  function columnsInWeek(cols, mondayKey) {
    return (cols || []).filter(function (col) { return inWeek(colDateKey(col), mondayKey); });
  }

  function listWeekKeys() {
    var keys = {};
    (App.dailyDays || []).forEach(function (day) {
      if (day.date) keys[mondayOf(day.date)] = true;
    });
    var book = App.gradebook || emptyGradebook();
    ['yellow', 'morning', 'exams', 'labs', 'practicals', 'homeworks'].forEach(function (key) {
      (book[key] || []).forEach(function (col) {
        var date = colDateKey(col);
        if (date) keys[mondayOf(date)] = true;
      });
    });
    var today = App.activeDate || formatDateKey(new Date());
    keys[mondayOf(today)] = true;
    return Object.keys(keys).sort().reverse();
  }

  function studentGradeParts(stu, mondayKey) {
    var book = App.gradebook || emptyGradebook();
    var take = mondayKey
      ? function (cols) { return columnsInWeek(cols, mondayKey); }
      : function (cols) { return cols || []; };
    var act = mondayKey
      ? classActivity(stu.seatNo, mondayKey)
      : { raw: stu.total, has: !!(Number(stu.plusSum) || Number(stu.minusSum) || Number(stu.total)) };
    var labs = take(book.labs);
    var practicals = take(book.practicals);
    var homeworks = take(book.homeworks);
    var yellow = take(book.yellow);
    var morning = take(book.morning);
    var exams = take(book.exams);
    var usual = usualBundle(stu.seatNo, act.raw, act.has, labs, practicals, homeworks);
    var quiz = quizExamAvg(yellow, morning, stu.seatNo);
    var examAvg = average100(exams, stu.seatNo);
    return {
      classRaw: act.raw,
      hasClass: act.has,
      labAvg: average100(labs, stu.seatNo),
      pracAvg: average100(practicals, stu.seatNo),
      hwAvg: homeworks.length ? averageHomework(homeworks, stu.seatNo) : null,
      usual: usual.usual,
      yellowAvg: average100(yellow, stu.seatNo),
      morningAvg: average100(morning, stu.seatNo),
      quiz: quiz,
      exam: examAvg,
      total: weightedScore(usual.usual, quiz, examAvg)
    };
  }

  function gradeColHead(col, kind, extra) {
    return '<th>' +
      '<span class="col-title">' + escapeHtml(col.title) + '</span>' +
      '<small>' + escapeHtml(shortDate(col.date)) + (extra || '') + '</small>' +
      '<button type="button" class="col-del-mini" data-del-grade data-kind="' +
      kind + '" data-id="' + escapeHtml(col.id) + '">刪</button></th>';
  }

  function scoreCellHtml(kind, col, seatNo, allowLeave) {
    var v = col.scores && col.scores[seatNo];
    var leave = isLeaveScore(v);
    var shown = leave || v == null || v === '' ? '' : v;
    var input = '<input class="mini-num" data-grade-score data-kind="' + kind + '" data-id="' + escapeHtml(col.id) +
      '" data-seat="' + escapeHtml(String(seatNo)) + '" type="number" min="0" max="' + (col.max || 100) +
      '" value="' + escapeHtml(String(shown)) + '"' + (leave ? ' disabled' : '') + ' />';
    if (!allowLeave) return '<td>' + input + '</td>';
    return '<td class="grade-cell">' +
      '<div class="cell-row">' + input +
      '<label class="leave-toggle"><input data-grade-mark data-kind="' + kind + '" data-id="' +
      escapeHtml(col.id) + '" data-seat="' + escapeHtml(String(seatNo)) +
      '" type="checkbox"' + (leave ? ' checked' : '') + ' />假</label>' +
      '</div></td>';
  }

  function hwCellHtml(col, seatNo) {
    var rec = (col.records || {})[seatNo] || {};
    var submitted = rec.status === 'submitted';
    var result = homeworkResult(col, seatNo);
    var note = '未繳 0';
    if (submitted && result.final == null) note = '已繳未評';
    else if (submitted && result.late) note = '遲交−' + result.penalty + ' → ' + result.final;
    else if (submitted) note = '實得 ' + result.final;
    return '<td class="hw-cell" data-submitted="' + (submitted ? '1' : '0') + '">' +
      '<div class="cell-stack">' +
      '<select data-hw-status data-id="' + escapeHtml(col.id) + '" data-seat="' + escapeHtml(String(seatNo)) + '">' +
      '<option value="missing">未繳交</option>' +
      '<option value="submitted"' + (submitted ? ' selected' : '') + '>已繳交</option></select>' +
      '<div class="hw-detail">' +
      '<input class="mini-num" data-hw-score data-id="' + escapeHtml(col.id) + '" data-seat="' + escapeHtml(String(seatNo)) +
      '" type="number" min="0" max="' + (col.max || 100) + '" placeholder="成績" value="' +
      (rec.score == null || rec.score === '' ? '' : escapeHtml(String(rec.score))) + '"' +
      (submitted ? '' : ' disabled') + ' />' +
      '<input class="mini-date" data-hw-date data-id="' + escapeHtml(col.id) + '" data-seat="' + escapeHtml(String(seatNo)) +
      '" type="date" value="' + escapeHtml(rec.submittedAt || '') + '"' + (submitted ? '' : ' disabled') + ' />' +
      '</div>' +
      '<span class="hw-final' + (result.late ? ' is-late' : '') + '">' + escapeHtml(note) + '</span>' +
      '</div></td>';
  }

  function fmtScore(v) {
    return v == null ? '—' : v;
  }

  function studentHeadCells() {
    return '<th class="sticky-1">座號</th><th class="sticky-2">姓名</th>';
  }

  function studentBodyCells(row) {
    return '<td class="sticky-1">' + escapeHtml(row.seatNo) + '</td>' +
      '<td class="sticky-2 name-col">' + escapeHtml(row.name) + '</td>';
  }

  function gradeBoardHtml(title, tone, headCells, bodyRows) {
    var open = App.gradeOpen && App.gradeOpen[tone];
    return '<details class="grade-board tone-' + tone + '"' + (open ? ' open' : '') + '>' +
      '<summary>' + title + '</summary>' +
      '<div class="sheet-wrap">' +
      '<table class="sheet-table report-table">' +
      '<thead><tr>' + studentHeadCells() + headCells + '</tr></thead>' +
      '<tbody>' + bodyRows + '</tbody>' +
      '</table></div></details>';
  }

  function renderTermGrades() {
    var wrap = els.gradeTermWrap || document.getElementById('gradeTermWrap');
    if (!wrap) return;
    var model = App.sheetModel || buildSheetModel();
    var book = App.gradebook || emptyGradebook();
    var yellow = book.yellow || [];
    var morning = book.morning || [];
    var exams = book.exams || [];
    var labs = book.labs || [];
    var practicals = book.practicals || [];
    var homeworks = book.homeworks || [];
    var students = (model.rows || []).slice().sort(seatOrder);
    if (!students.length) {
      wrap.innerHTML = '<p class="empty-board">這個班還沒有學生</p>';
      return;
    }
    rememberOpenBoards();
    var rows = students.map(function (stu) {
      var parts = studentGradeParts(stu, '');
      return Object.assign({ seatNo: stu.seatNo, name: stu.name }, parts);
    }).sort(function (a, b) {
      return (b.total == null ? -999 : b.total) - (a.total == null ? -999 : a.total);
    });
    var lastTotal = null;
    var lastRank = 0;
    rows.forEach(function (row, index) {
      if (lastTotal === null || row.total !== lastTotal) {
        lastRank = index + 1;
        lastTotal = row.total;
      }
      row.rank = lastRank;
    });

    var usualHead = '<th>上課加扣</th><th>換算分</th>' +
      labs.map(function (col) { return gradeColHead(col, 'lab'); }).join('') +
      (labs.length ? '<th>實作評量平均</th>' : '') +
      practicals.map(function (col) { return gradeColHead(col, 'practical'); }).join('') +
      (practicals.length ? '<th>實作成績平均</th>' : '') +
      homeworks.map(function (col) {
        return gradeColHead(col, 'homework', ' · 期限 ' + shortDate(col.dueDate || col.date));
      }).join('') +
      (homeworks.length ? '<th>作業平均</th>' : '') +
      '<th class="col-total">平時平均</th>';
    var usualBody = rows.map(function (row) {
      return '<tr>' + studentBodyCells(row) +
        '<td class="' + scoreCellClass(row.classRaw) + '">' + scoreCellText(row.classRaw) + '</td>' +
        '<td>' + (row.hasClass ? usualFromRaw(row.classRaw) : '—') + '</td>' +
        labs.map(function (col) { return scoreCellHtml('lab', col, row.seatNo, false); }).join('') +
        (labs.length ? '<td>' + fmtScore(row.labAvg) + '</td>' : '') +
        practicals.map(function (col) { return scoreCellHtml('practical', col, row.seatNo, false); }).join('') +
        (practicals.length ? '<td>' + fmtScore(row.pracAvg) + '</td>' : '') +
        homeworks.map(function (col) { return hwCellHtml(col, row.seatNo); }).join('') +
        (homeworks.length ? '<td>' + fmtScore(row.hwAvg) + '</td>' : '') +
        '<td class="col-total">' + fmtScore(row.usual) + '</td></tr>';
    }).join('');

    var quizHead = yellow.map(function (col) { return gradeColHead(col, 'yellow'); }).join('') +
      (yellow.length ? '<th>黃卷平均</th>' : '') +
      morning.map(function (col) { return gradeColHead(col, 'morning'); }).join('') +
      (morning.length ? '<th>早自習平均</th>' : '') +
      '<th class="col-total">平時考試平均</th>';
    var quizBody = rows.map(function (row) {
      return '<tr>' + studentBodyCells(row) +
        yellow.map(function (col) { return scoreCellHtml('yellow', col, row.seatNo, true); }).join('') +
        (yellow.length ? '<td>' + fmtScore(row.yellowAvg) + '</td>' : '') +
        morning.map(function (col) { return scoreCellHtml('morning', col, row.seatNo, true); }).join('') +
        (morning.length ? '<td>' + fmtScore(row.morningAvg) + '</td>' : '') +
        '<td class="col-total">' + fmtScore(row.quiz) + '</td></tr>';
    }).join('');

    var examHead = exams.map(function (col) { return gradeColHead(col, 'exam'); }).join('') +
      '<th class="col-total">段考平均</th>';
    var examBody = rows.map(function (row) {
      return '<tr>' + studentBodyCells(row) +
        exams.map(function (col) { return scoreCellHtml('exam', col, row.seatNo, true); }).join('') +
        '<td class="col-total">' + fmtScore(row.exam) + '</td></tr>';
    }).join('');

    var sumHead = '<th>平時</th><th>平時考試</th><th>段考</th><th class="col-total">加權總分</th><th>名次</th>';
    var sumBody = rows.map(function (row) {
      return '<tr>' + studentBodyCells(row) +
        '<td>' + fmtScore(row.usual) + '</td>' +
        '<td>' + fmtScore(row.quiz) + '</td>' +
        '<td>' + fmtScore(row.exam) + '</td>' +
        '<td class="col-total">' + fmtScore(row.total) + '</td>' +
        '<td>' + row.rank + '</td></tr>';
    }).join('');

    wrap.innerHTML =
      gradeBoardHtml('平時表現', 'usual', usualHead, usualBody) +
      gradeBoardHtml('平時考試（黃卷／早自習）', 'quiz', quizHead, quizBody) +
      gradeBoardHtml('段考成績', 'exam', examHead, examBody) +
      gradeBoardHtml('學期成績', 'sum', sumHead, sumBody);
  }

  function renderWeekGrades() {
    renderGradeRules();
    if (!els.gradeWeekHead || !els.gradeWeekBody) return;
    var weeks = listWeekKeys();
    if (!App.weekKey || weeks.indexOf(App.weekKey) < 0) App.weekKey = weeks[0] || mondayOf(formatDateKey(new Date()));
    if (els.weekSelect) {
      els.weekSelect.innerHTML = weeks.map(function (key) {
        return '<option value="' + escapeHtml(key) + '"' + (key === App.weekKey ? ' selected' : '') + '>' +
          escapeHtml(formatZhDate(key) + '～' + formatZhDate(sundayOf(key))) + '</option>';
      }).join('');
    }
    var model = App.sheetModel || buildSheetModel();
    var students = (model.rows || []).slice().sort(seatOrder);
    els.gradeWeekHead.innerHTML = '<tr>' +
      '<th class="sticky-1">座號</th><th class="sticky-2">姓名</th>' +
      '<th>上課加扣</th><th>實作評量</th><th>實作成績</th><th>作業</th><th>平時</th>' +
      '<th>黃卷</th><th>早自習</th><th>平時考試</th><th>段考</th>' +
      '<th class="col-total">每週成績</th><th>計算過程</th>' +
      '</tr>';
    if (!students.length) {
      els.gradeWeekBody.innerHTML = '<tr><td colspan="13">這個班還沒有學生</td></tr>';
      return;
    }
    els.gradeWeekBody.innerHTML = students.map(function (stu) {
      var parts = studentGradeParts(stu, App.weekKey);
      return '<tr>' +
        '<td class="sticky-1">' + escapeHtml(stu.seatNo) + '</td>' +
        '<td class="sticky-2 name-col">' + escapeHtml(stu.name) + '</td>' +
        '<td class="' + scoreCellClass(parts.classRaw) + '">' + scoreCellText(parts.classRaw) + '</td>' +
        '<td>' + (parts.labAvg == null ? '無' : parts.labAvg) + '</td>' +
        '<td>' + (parts.pracAvg == null ? '無' : parts.pracAvg) + '</td>' +
        '<td>' + (parts.hwAvg == null ? '無' : parts.hwAvg) + '</td>' +
        '<td>' + (parts.usual == null ? '無' : parts.usual) + '</td>' +
        '<td>' + (parts.yellowAvg == null ? '無' : parts.yellowAvg) + '</td>' +
        '<td>' + (parts.morningAvg == null ? '無' : parts.morningAvg) + '</td>' +
        '<td>' + (parts.quiz == null ? '無' : parts.quiz) + '</td>' +
        '<td>' + (parts.exam == null ? '無' : parts.exam) + '</td>' +
        '<td class="col-total">' + fmtScore(parts.total) + '</td>' +
        '<td class="formula-col">' + escapeHtml(scoreFormula(parts.usual, parts.quiz, parts.exam)) + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderGradeRules() {
    if (!els.gradeRuleBox) return;
    var rules = gradeRules();
    els.gradeRuleBox.innerHTML =
      '<details class="rule-details">' +
      '<summary>每週成績計算規則</summary>' +
      '<ol>' +
      '<li>平時表現包含：上課加扣、實作評量（實驗室）、實作成績（回家做）、作業。有幾項就平均幾項。</li>' +
      '<li>上課換算分 ＝ 底分 ' + rules.base + ' ＋ 該週上課加扣合計，最低 ' + rules.min + '、最高 ' + rules.max + '。該週沒有加扣分就不列入平時。</li>' +
      '<li>平時考試 ＝ 黃卷與早自習平均（換算成 100 分制）。請假不計入。</li>' +
      '<li>段考平均同樣換算成 100 分制，請假不計入。</li>' +
      '<li>作業可記未繳交／已繳交，繳交後再登錄成績與繳交日。超過期限 ' + rules.lateWorkDays +
      ' 個工作天（週六日與國定假日不算）扣 ' + rules.latePenalty + ' 分。未繳交以 0 分計。</li>' +
      '<li>每週成績 ＝ 平時×' + rules.classWeight + '% ＋ 平時考試×' + rules.quizWeight + '% ＋ 段考×' + rules.examWeight + '%。</li>' +
      '<li>若本週完全沒有平時成績，就不使用底分，只算平時考試（有段考仍一併加權）。缺的項目不計，其餘比重按比例重算。</li>' +
      '</ol>' +
      '<p class="rule-note">學期成績用同一套規則，只是改成全部日期與全部欄位。額外假日填在下方，作業遲交就不算那些日子。</p>' +
      '</details>';
  }

  function cloneScoreCols(list) {
    return (list || []).map(function (col) {
      return {
        id: col.id,
        title: col.title,
        date: col.date,
        max: col.max,
        scores: Object.assign({}, col.scores || {})
      };
    });
  }

  function cloneHomeworkCols(list) {
    return (list || []).map(function (col) {
      return {
        id: col.id,
        title: col.title,
        date: col.date,
        dueDate: col.dueDate,
        max: col.max,
        records: JSON.parse(JSON.stringify(col.records || {}))
      };
    });
  }

  function findCol(list, id) {
    var hit = null;
    (list || []).forEach(function (item) { if (item.id === id) hit = item; });
    return hit;
  }

  function collectGradebookFromTable() {
    var book = App.gradebook || emptyGradebook();
    var yellow = cloneScoreCols(book.yellow);
    var morning = cloneScoreCols(book.morning);
    var exams = cloneScoreCols(book.exams);
    var labs = cloneScoreCols(book.labs);
    var practicals = cloneScoreCols(book.practicals);
    var homeworks = cloneHomeworkCols(book.homeworks);
    var lists = {
      yellow: yellow,
      morning: morning,
      exam: exams,
      lab: labs,
      practical: practicals
    };
    document.querySelectorAll('[data-grade-score]').forEach(function (input) {
      var kind = input.getAttribute('data-kind');
      var col = findCol(lists[kind], input.getAttribute('data-id'));
      if (!col) return;
      var seat = input.getAttribute('data-seat');
      var cell = input.closest('td');
      var mark = cell && cell.querySelector('[data-grade-mark]');
      var leave = mark && (mark.type === 'checkbox' ? mark.checked : mark.value === 'leave');
      if (leave) {
        col.scores[seat] = 'leave';
        return;
      }
      if (input.value === '') delete col.scores[seat];
      else col.scores[seat] = Number(input.value);
    });
    document.querySelectorAll('[data-hw-status]').forEach(function (sel) {
      var col = findCol(homeworks, sel.getAttribute('data-id'));
      if (!col) return;
      var seat = sel.getAttribute('data-seat');
      var cell = sel.closest('td');
      var score = cell && cell.querySelector('[data-hw-score]');
      var date = cell && cell.querySelector('[data-hw-date]');
      if (sel.value !== 'submitted') {
        col.records[seat] = { status: 'missing' };
        return;
      }
      var rec = { status: 'submitted' };
      if (score && score.value !== '') rec.score = Number(score.value);
      if (date && date.value) rec.submittedAt = date.value;
      col.records[seat] = rec;
    });
    return {
      className: teacherTargetClass(),
      rules: gradeRules(),
      yellow: yellow,
      morning: morning,
      exams: exams,
      labs: labs,
      practicals: practicals,
      homeworks: homeworks
    };
  }

  function saveGradebookFromTable(showToast) {
    var body = collectGradebookFromTable();
    if (!body.className) {
      toast('請先選擇班級');
      return;
    }
    api('saveGradebook', [body]).then(function (data) {
      applyGradebook(data);
      if (showToast) {
        renderGradebook();
        toast('成績已存到雲端');
      }
    }).catch(function (error) {
      toast(error && error.message ? error.message : '儲存成績失敗');
    });
  }

  function addGradeColumn(type) {
    var className = teacherTargetClass();
    if (!className) {
      toast('請先選擇班級');
      return;
    }
    var title = els.gradeColName ? els.gradeColName.value.trim() : '';
    var date = els.gradeColDate ? els.gradeColDate.value : (App.activeDate || formatDateKey(new Date()));
    var due = els.gradeColDue ? els.gradeColDue.value : date;
    var body = collectGradebookFromTable();
    api('saveGradebook', [body]).then(function () {
      return api('addGradeColumn', [{
        className: className,
        type: type || 'yellow',
        title: title,
        date: date,
        dueDate: due,
        max: 100
      }]);
    }).then(function (data) {
      applyGradebook(data);
      if (els.gradeColName) els.gradeColName.value = '';
      rememberOpenBoards();
      var fold = { yellow: 'quiz', morning: 'quiz', exam: 'exam', lab: 'usual', practical: 'usual', homework: 'usual' };
      App.gradeOpen[fold[type] || 'usual'] = true;
      var term = document.getElementById('gradeTermView');
      if (term) term.open = true;
      renderGradebook();
      toast('已新增' + (GRADE_TYPE_LABEL[type] || '成績') + '欄');
    }).catch(function (error) {
      toast(error && error.message ? error.message : '新增失敗');
    });
  }

  function deleteGradeColumn(kind, id) {
    if (!window.confirm('要刪掉這一欄成績嗎？分數也會一起刪除。')) return;
    api('deleteGradeColumn', [{ className: teacherTargetClass(), type: kind, id: id }]).then(function (data) {
      applyGradebook(data);
      renderGradebook();
      toast('已刪除');
    }).catch(function () {
      toast('刪除失敗');
    });
  }

  function saveGradeRules(showToast) {
    var className = teacherTargetClass();
    if (!className) return;
    var body = collectGradebookFromTable();
    body.rules = {
      base: Number(els.ruleBase && els.ruleBase.value),
      classWeight: Number(els.ruleClassW && els.ruleClassW.value),
      quizWeight: Number(els.ruleQuizW && els.ruleQuizW.value),
      examWeight: Number(els.ruleExamW && els.ruleExamW.value),
      holidays: els.ruleHolidays ? els.ruleHolidays.value : ''
    };
    api('saveGradebook', [body]).then(function (data) {
      applyGradebook(data);
      if (showToast !== false) {
        renderGradebook();
        toast('已套用計算規則');
      }
    }).catch(function (error) {
      toast(error && error.message ? error.message : '儲存規則失敗');
    });
  }

  function renderStatsDashboard(model) {
    model = model || App.sheetModel || buildSheetModel();
    var ranked = model.ranked || [];
    var top = ranked[0];
    var bottom = ranked.length ? ranked[ranked.length - 1] : null;
    var mostPlus = ranked.slice().sort(function (a, b) { return b.plusSum - a.plusSum || b.total - a.total; })[0];
    var mostMinus = ranked.slice().sort(function (a, b) { return a.minusSum - b.minusSum || a.total - b.total; })[0];
    if (els.statsCards) {
      els.statsCards.innerHTML =
        statCard('學生人數', model.rows.length) +
        statCard('全班合計', model.grand) +
        statCard('全班平均', model.classAvg) +
        statCard('中位數', model.median) +
        statCard('正分人數', model.plusPeople || 0) +
        statCard('零分人數', model.zeroPeople || 0) +
        statCard('負分人數', model.minusPeople || 0) +
        statCard('目前第一', top ? top.name + '（' + top.total + '）' : '—');
    }
    if (els.statsInsights) {
      var items = [];
      if (top) items.push(insightItem('最高合計', top.seatNo + ' ' + top.name + '　' + top.total + ' 分'));
      if (bottom && (!top || bottom.seatNo !== top.seatNo)) {
        items.push(insightItem('最低合計', bottom.seatNo + ' ' + bottom.name + '　' + bottom.total + ' 分'));
      }
      if (mostPlus && mostPlus.plusSum) {
        items.push(insightItem('加分總和最多', mostPlus.name + '　+' + mostPlus.plusSum));
      }
      if (mostMinus && mostMinus.minusSum) {
        items.push(insightItem('扣分總和最多', mostMinus.name + '　' + mostMinus.minusSum));
      }
      items.push(insightItem('全班加分總和', '+' + (model.plusTotal || 0)));
      items.push(insightItem('全班扣分總和', String(model.minusTotal || 0)));
      els.statsInsights.innerHTML = items.join('');
    }
    if (els.statsBody) {
      if (!ranked.length) {
        els.statsBody.innerHTML = '<tr><td colspan="6">尚無統計資料</td></tr>';
      } else {
        els.statsBody.innerHTML = ranked.map(function (row, index) {
          return '<tr><td>' + (index + 1) + '</td><td>' + escapeHtml(row.seatNo) + '</td><td>' +
            escapeHtml(row.name) + '</td><td class="' + scoreCellClass(row.total) + '">' +
            scoreCellText(row.total) + '</td><td class="day-plus">+' + (row.plusSum || 0) +
            '</td><td class="day-minus">' + (row.minusSum || 0) + '</td></tr>';
        }).join('');
      }
    }
    renderCharts(model);
  }

  function chartEmpty(text) {
    return '<p class="chart-empty">' + escapeHtml(text) + '</p>';
  }

  function renderCharts(model) {
    if (els.chartRank) {
      var top10 = (model.ranked || []).slice(0, 10);
      els.chartRank.innerHTML = top10.length
        ? svgHBars(top10.map(function (row) { return row.seatNo + ' ' + row.name; }), top10.map(function (row) { return row.total; }))
        : chartEmpty('有學生分數之後，這裡會出現排行圖');
    }
    if (els.chartDist) {
      var buckets = [
        { label: '≤-5', count: 0 },
        { label: '-4~-1', count: 0 },
        { label: '0', count: 0 },
        { label: '1~4', count: 0 },
        { label: '5~9', count: 0 },
        { label: '≥10', count: 0 }
      ];
      model.rows.forEach(function (row) {
        var n = row.total;
        if (n <= -5) buckets[0].count += 1;
        else if (n < 0) buckets[1].count += 1;
        else if (n === 0) buckets[2].count += 1;
        else if (n < 5) buckets[3].count += 1;
        else if (n < 10) buckets[4].count += 1;
        else buckets[5].count += 1;
      });
      els.chartDist.innerHTML = model.rows.length
        ? svgBars(buckets.map(function (b) { return b.label; }), buckets.map(function (b) { return b.count; }), { zeroLine: false })
        : chartEmpty('有學生之後，這裡會出現分布圖');
    }
    if (els.chartDaily) {
      els.chartDaily.innerHTML = model.rows.length
        ? svgBars(['正分', '零分', '負分'], [model.plusPeople || 0, model.zeroPeople || 0, model.minusPeople || 0], {
          zeroLine: false,
          barColors: ['#2c7a4b', '#9aa8b0', '#b4413c']
        })
        : chartEmpty('有學生之後，這裡會出現正負分人數');
    }
    if (els.chartPlusMinus) {
      els.chartPlusMinus.innerHTML = model.rows.length
        ? svgBars(['加分總和', '扣分總和'], [model.plusTotal || 0, model.minusTotal || 0], { zeroLine: true })
        : chartEmpty('有加扣分之後，這裡會出現加扣分總和');
    }
  }

  function svgBars(labels, values, opts) {
    opts = opts || {};
    var w = 640;
    var h = 220;
    var l = 36;
    var r = 12;
    var t = 12;
    var b = 44;
    var iw = w - l - r;
    var ih = h - t - b;
    var max = 0;
    var min = 0;
    values.forEach(function (v) {
      if (v > max) max = v;
      if (v < min) min = v;
    });
    if (max === min) max = min + 1;
    var span = max - min;
    function yOf(v) { return t + ih - ((v - min) / span) * ih; }
    var zeroY = opts.zeroLine ? yOf(0) : t + ih;
    var gap = Math.max(2, 8 - labels.length / 4);
    var bw = Math.max(5, iw / Math.max(labels.length, 1) - gap);
    var bars = values.map(function (v, i) {
      var x = l + (i + 0.5) * (iw / Math.max(labels.length, 1)) - bw / 2;
      var y1 = yOf(v);
      var top = Math.min(y1, zeroY);
      var height = Math.max(2, Math.abs(y1 - zeroY));
      var color = (opts.barColors && opts.barColors[i])
        ? opts.barColors[i]
        : (v > 0 ? '#2c7a4b' : (v < 0 ? '#b4413c' : '#9aa8b0'));
      return '<rect x="' + x + '" y="' + top + '" width="' + bw + '" height="' + height +
        '" fill="' + color + '"><title>' + escapeHtml(labels[i] + '：' + v) + '</title></rect>';
    }).join('');
    var step = Math.max(1, Math.ceil(labels.length / 8));
    var xlabels = labels.map(function (lb, i) {
      if (i % step && i !== labels.length - 1) return '';
      var x = l + (i + 0.5) * (iw / Math.max(labels.length, 1));
      return '<text x="' + x + '" y="' + (h - 16) + '" text-anchor="middle" font-size="11" fill="#5b7380">' +
        escapeHtml(lb) + '</text>';
    }).join('');
    var axis = '<line x1="' + l + '" y1="' + zeroY + '" x2="' + (w - r) + '" y2="' + zeroY + '" stroke="#d9d0c1"/>';
    var maxLabel = '<text x="8" y="' + (t + 10) + '" font-size="11" fill="#5b7380">' + max + '</text>';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart-svg" role="img">' + axis + bars + xlabels + maxLabel + '</svg>';
  }

  function svgHBars(labels, values) {
    var w = 640;
    var rowH = 28;
    var h = Math.max(120, labels.length * rowH + 16);
    var l = 108;
    var r = 36;
    var t = 8;
    var iw = w - l - r;
    var max = 1;
    values.forEach(function (v) {
      if (Math.abs(v) > max) max = Math.abs(v);
    });
    var bars = values.map(function (v, i) {
      var y = t + i * rowH;
      var bw = Math.max(2, (Math.abs(v) / max) * iw);
      var color = v > 0 ? '#2c7a4b' : (v < 0 ? '#b4413c' : '#9aa8b0');
      var x = v < 0 ? l + iw - bw : l;
      return '<text x="8" y="' + (y + 16) + '" font-size="12" fill="#16303c">' + escapeHtml(labels[i]) + '</text>' +
        '<rect x="' + x + '" y="' + (y + 4) + '" width="' + bw + '" height="16" fill="' + color + '"></rect>' +
        '<text x="' + (l + iw + 6) + '" y="' + (y + 16) + '" font-size="12" fill="#5b7380">' + v + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart-svg" role="img">' + bars + '</svg>';
  }

  function downloadScoreSheet() {
    var model = App.sheetModel || buildSheetModel();
    if (!model.rows.length) {
      toast('目前沒有成績表可以下載');
      return;
    }
    var header = ['座號', '姓名'].concat(model.dates.map(function (d) { return d.date; })).concat(['合計', '平均']);
    var lines = [header.join(',')];
    model.rows.forEach(function (row) {
      lines.push([row.seatNo, row.name].concat(row.cells).concat([row.total, row.avg]).join(','));
    });
    downloadText((model.className || '成績表') + '-成績表.csv', '\uFEFF' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    toast('已下載成績表，可用 Excel 打開');
  }

  var GRADE_EXCEL_KIND = {
    yellow: '黃卷',
    morning: '早自習',
    exam: '段考',
    lab: '實作評量',
    practical: '實作成績'
  };

  var GRADE_EXCEL_PREFIX = {
    '黃卷': 'yellow',
    '早自習': 'morning',
    '段考': 'exam',
    '實作評量': 'lab',
    '實作成績': 'practical',
    '作業繳交': 'homework-status',
    '作業成績': 'homework-score',
    '作業日期': 'homework-date'
  };

  function withXlsx(done) {
    if (typeof XLSX !== 'undefined') {
      done(XLSX);
      return;
    }
    var n = 0;
    var timer = setInterval(function () {
      n += 1;
      if (typeof XLSX !== 'undefined') {
        clearInterval(timer);
        done(XLSX);
      } else if (n > 25) {
        clearInterval(timer);
        toast('Excel 功能還沒載入完成，請重新整理頁面後再試');
      }
    }, 200);
  }

  function newGradeColId() {
    return 'g' + Date.now() + Math.floor(Math.random() * 1000);
  }

  function scoreColsOf(book, kind) {
    if (kind === 'yellow') return book.yellow || [];
    if (kind === 'morning') return book.morning || [];
    if (kind === 'exam') return book.exams || [];
    if (kind === 'lab') return book.labs || [];
    if (kind === 'practical') return book.practicals || [];
    if (kind === 'homework') return book.homeworks || [];
    return [];
  }

  function excelHeaderFor(kind, col) {
    return GRADE_EXCEL_KIND[kind] + '｜' + (col.title || '未命名');
  }

  function hwExcelHeader(part, col) {
    var prefix = part === 'status' ? '作業繳交' : (part === 'score' ? '作業成績' : '作業日期');
    return prefix + '｜' + (col.title || '作業');
  }

  function splitExcelHeader(name) {
    var parts = String(name || '').split('｜');
    return { prefix: (parts[0] || '').trim(), title: (parts.slice(1).join('｜') || '').trim() };
  }

  function findColByTitle(list, title) {
    var hit = null;
    (list || []).forEach(function (col) {
      if (!hit && String(col.title || '') === String(title || '')) hit = col;
    });
    return hit;
  }

  function matchSeat(students, seat) {
    var raw = String(seat || '').trim();
    if (!raw) return null;
    var hit = students.filter(function (s) { return String(s.seatNo) === raw; })[0];
    if (hit) return hit;
    if (/^\d+$/.test(raw)) {
      hit = students.filter(function (s) { return String(Number(s.seatNo)) === String(Number(raw)); })[0];
    }
    return hit || null;
  }

  function parseLeaveOrScore(value) {
    var s = String(value == null ? '' : value).trim();
    if (!s) return { empty: true };
    if (s === '請假' || s === '假' || s.toLowerCase() === 'leave') return { leave: true };
    var n = Number(s);
    if (!isFinite(n)) return { empty: true };
    return { score: n };
  }

  function parseHwStatus(value) {
    var s = String(value == null ? '' : value).trim();
    if (!s) return '';
    if (/^(已繳交|已繳|submitted)$/i.test(s)) return 'submitted';
    if (/^(未繳交|未繳|missing)$/i.test(s)) return 'missing';
    return '';
  }

  function parseExcelDateValue(value) {
    var s = String(value == null ? '' : value).trim().replace(/\//g, '-');
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return '';
    return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  }

  function aoaToSheet(X, rows) {
    var sheet = X.utils.aoa_to_sheet(rows);
    var cols = (rows[0] || []).map(function (name) {
      var n = String(name || '').length;
      return { wch: Math.max(10, Math.min(18, n + 2)) };
    });
    if (cols[0]) cols[0].wch = 8;
    if (cols[1]) cols[1].wch = 12;
    sheet['!cols'] = cols;
    return sheet;
  }

  function buildInputSheetRows(book, students) {
    var kinds = ['yellow', 'morning', 'exam', 'lab', 'practical'];
    var headers = ['座號', '姓名'];
    var fields = [];
    kinds.forEach(function (kind) {
      scoreColsOf(book, kind).forEach(function (col) {
        headers.push(excelHeaderFor(kind, col));
        fields.push({ kind: kind, col: col });
      });
    });
    (book.homeworks || []).forEach(function (col) {
      headers.push(hwExcelHeader('status', col), hwExcelHeader('score', col), hwExcelHeader('date', col));
      fields.push({ kind: 'homework-status', col: col });
      fields.push({ kind: 'homework-score', col: col });
      fields.push({ kind: 'homework-date', col: col });
    });
    var rows = [headers];
    students.forEach(function (stu) {
      var line = [stu.seatNo, stu.name];
      fields.forEach(function (field) {
        if (field.kind.indexOf('homework') === 0) {
          var rec = ((field.col.records || {})[stu.seatNo]) || {};
          if (field.kind === 'homework-status') line.push(rec.status === 'submitted' ? '已繳交' : (rec.status === 'missing' ? '未繳交' : ''));
          else if (field.kind === 'homework-score') line.push(rec.score == null || rec.score === '' ? '' : rec.score);
          else line.push(rec.submittedAt || '');
          return;
        }
        var v = field.col.scores && field.col.scores[stu.seatNo];
        if (isLeaveScore(v)) line.push('請假');
        else if (v == null || v === '') line.push('');
        else line.push(v);
      });
      rows.push(line);
    });
    return rows;
  }

  function buildMapSheetRows(book) {
    var rows = [['欄位名稱', '類型', '編號', '日期', '期限', '滿分']];
    ['yellow', 'morning', 'exam', 'lab', 'practical'].forEach(function (kind) {
      scoreColsOf(book, kind).forEach(function (col) {
        rows.push([excelHeaderFor(kind, col), kind, col.id, col.date || '', '', col.max || 100]);
      });
    });
    (book.homeworks || []).forEach(function (col) {
      rows.push([hwExcelHeader('status', col), 'homework', col.id, col.date || '', col.dueDate || '', col.max || 100]);
    });
    return rows;
  }

  function buildTermSheetRows(students) {
    var rows = [['座號', '姓名', '上課加扣', '換算分', '實作評量平均', '實作成績平均', '作業平均', '平時平均', '黃卷平均', '早自習平均', '平時考試平均', '段考平均', '加權總分']];
    students.forEach(function (stu) {
      var p = studentGradeParts(stu, '');
      rows.push([
        stu.seatNo, stu.name, p.classRaw,
        p.hasClass ? usualFromRaw(p.classRaw) : '',
        p.labAvg == null ? '' : p.labAvg,
        p.pracAvg == null ? '' : p.pracAvg,
        p.hwAvg == null ? '' : p.hwAvg,
        p.usual == null ? '' : p.usual,
        p.yellowAvg == null ? '' : p.yellowAvg,
        p.morningAvg == null ? '' : p.morningAvg,
        p.quiz == null ? '' : p.quiz,
        p.exam == null ? '' : p.exam,
        p.total == null ? '' : p.total
      ]);
    });
    return rows;
  }

  function buildWeekSheetRows(students) {
    var monday = App.weekKey || mondayOf(formatDateKey(new Date()));
    var rows = [['週次', formatZhDate(monday) + '～' + formatZhDate(sundayOf(monday))]];
    rows.push(['座號', '姓名', '上課加扣', '實作評量', '實作成績', '作業', '平時', '黃卷', '早自習', '平時考試', '段考', '每週成績', '計算過程']);
    students.forEach(function (stu) {
      var p = studentGradeParts(stu, monday);
      rows.push([
        stu.seatNo, stu.name, p.classRaw,
        p.labAvg == null ? '' : p.labAvg,
        p.pracAvg == null ? '' : p.pracAvg,
        p.hwAvg == null ? '' : p.hwAvg,
        p.usual == null ? '' : p.usual,
        p.yellowAvg == null ? '' : p.yellowAvg,
        p.morningAvg == null ? '' : p.morningAvg,
        p.quiz == null ? '' : p.quiz,
        p.exam == null ? '' : p.exam,
        p.total == null ? '' : p.total,
        scoreFormula(p.usual, p.quiz, p.exam)
      ]);
    });
    return rows;
  }

  function buildHelpSheetRows() {
    return [
      ['班級座位表　成績 Excel 使用說明'],
      [''],
      ['1. 請在「成績輸入」工作表填分數，不要改第一列欄名。'],
      ['2. 黃卷、早自習、段考、實作：填數字；請假請填「請假」。'],
      ['3. 作業分三欄：作業繳交填「已繳交」或「未繳交」；作業成績填分數；作業日期填 YYYY-MM-DD。'],
      ['4. 填完後，回到網頁按「從 Excel 匯入」，選這個檔。'],
      ['5. 「學期總表」「每週成績」是計算結果，匯入時會略過，改了也不會寫回。'],
      ['6. 若要在 Excel 新增一欄，欄名格式請用：黃卷｜第三次　或　段考｜第一次段考　或　作業繳交｜第一次作業。'],
      ['7. 座號要和網頁名單一致，系統用座號對應學生。']
    ];
  }

  function exportGradeExcel() {
    var model = App.sheetModel || buildSheetModel();
    var students = (model.rows || []).slice().sort(seatOrder);
    if (!students.length) {
      toast('目前沒有成績可以下載');
      return;
    }
    var book = collectGradebookFromTable();
    App.gradebook = {
      yellow: book.yellow,
      morning: book.morning,
      exams: book.exams,
      labs: book.labs,
      practicals: book.practicals,
      homeworks: book.homeworks,
      rules: book.rules || gradeRules()
    };
    withXlsx(function (X) {
      var wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, aoaToSheet(X, buildInputSheetRows(App.gradebook, students)), '成績輸入');
      X.utils.book_append_sheet(wb, aoaToSheet(X, buildTermSheetRows(students)), '學期總表');
      X.utils.book_append_sheet(wb, aoaToSheet(X, buildWeekSheetRows(students)), '每週成績');
      X.utils.book_append_sheet(wb, aoaToSheet(X, buildHelpSheetRows()), '說明');
      X.utils.book_append_sheet(wb, aoaToSheet(X, buildMapSheetRows(App.gradebook)), '欄位對照');
      X.writeFile(wb, (teacherTargetClass() || '成績') + '-成績簿.xlsx');
      toast('已下載 Excel，可直接在裡面輸入成績後再匯入');
    });
  }

  function importGradeExcel(file) {
    if (!file) return;
    var className = teacherTargetClass();
    if (!className) {
      toast('請先選擇班級');
      return;
    }
    var name = String(file.name || '').toLowerCase();
    withXlsx(function (X) {
      var reader = new FileReader();
      reader.onload = function (event) {
        try {
          var rows;
          if (/\.csv$/.test(name)) {
            var text = new TextDecoder('utf-8').decode(event.target.result);
            rows = text.split(/\r?\n/).map(function (line) {
              return line.split(',').map(function (cell) { return cell.replace(/^"|"$/g, '').trim(); });
            }).filter(function (line) { return line.some(function (cell) { return cell !== ''; }); });
          } else {
            var wb = X.read(event.target.result, { type: 'array' });
            var sheetName = wb.SheetNames.indexOf('成績輸入') >= 0 ? '成績輸入' : wb.SheetNames[0];
            var sheet = wb.Sheets[sheetName];
            rows = X.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
          }
          applyGradeExcelRows(rows);
        } catch (err) {
          toast('Excel 讀取失敗，請確認檔案是成績簿格式');
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function applyGradeExcelRows(table) {
    var rows = (table || []).filter(function (row) {
      return (row || []).some(function (cell) { return String(cell || '').trim() !== ''; });
    });
    if (!rows.length) {
      toast('檔案是空的');
      return;
    }
    var headers = (rows[0] || []).map(function (h) { return String(h || '').trim(); });
    var seatIdx = headers.indexOf('座號');
    var nameIdx = headers.indexOf('姓名');
    if (seatIdx < 0) {
      toast('找不到「座號」欄，請用網頁下載的 Excel 範本');
      return;
    }
    var model = App.sheetModel || buildSheetModel();
    var students = (model.rows || []).slice();
    var body = collectGradebookFromTable();
    var book = {
      yellow: cloneScoreCols(body.yellow),
      morning: cloneScoreCols(body.morning),
      exams: cloneScoreCols(body.exams),
      labs: cloneScoreCols(body.labs),
      practicals: cloneScoreCols(body.practicals),
      homeworks: cloneHomeworkCols(body.homeworks),
      rules: body.rules || gradeRules()
    };
    var updated = 0;
    var created = 0;
    var unknown = 0;

    function listFor(kind) {
      if (kind === 'yellow') return book.yellow;
      if (kind === 'morning') return book.morning;
      if (kind === 'exam') return book.exams;
      if (kind === 'lab') return book.labs;
      if (kind === 'practical') return book.practicals;
      if (kind === 'homework' || kind.indexOf('homework') === 0) return book.homeworks;
      return null;
    }

    function ensureCol(kind, title) {
      var list = listFor(kind);
      if (!list) return null;
      var col = findColByTitle(list, title);
      if (col) return col;
      col = {
        id: newGradeColId(),
        title: title || GRADE_TYPE_LABEL[kind] || '未命名',
        date: App.activeDate || formatDateKey(new Date()),
        max: 100
      };
      if (kind.indexOf('homework') === 0) {
        col.dueDate = col.date;
        col.records = {};
        book.homeworks.push(col);
      } else {
        col.scores = {};
        list.push(col);
      }
      created += 1;
      return col;
    }

    var colMap = headers.map(function (header, index) {
      if (index === seatIdx || index === nameIdx) return null;
      var parts = splitExcelHeader(header);
      var kind = GRADE_EXCEL_PREFIX[parts.prefix];
      if (!kind) {
        unknown += 1;
        return null;
      }
      var realKind = kind.indexOf('homework') === 0 ? 'homework' : kind;
      var col = ensureCol(realKind, parts.title);
      return { index: index, kind: kind, col: col };
    }).filter(function (item) { return item && item.col; });

    rows.slice(1).forEach(function (row) {
      var stu = matchSeat(students, row[seatIdx]);
      if (!stu) return;
      var seat = stu.seatNo;
      colMap.forEach(function (item) {
        var raw = row[item.index];
        if (item.kind === 'homework-status' || item.kind === 'homework-score' || item.kind === 'homework-date') {
          var rec = item.col.records[seat] || {};
          if (item.kind === 'homework-status') {
            var status = parseHwStatus(raw);
            if (status) rec.status = status;
            else if (String(raw || '').trim() === '') rec.status = rec.status || 'missing';
          } else if (item.kind === 'homework-score') {
            var parsed = parseLeaveOrScore(raw);
            if (parsed.score != null) {
              rec.score = parsed.score;
              if (!rec.status) rec.status = 'submitted';
            } else if (parsed.empty) {
              delete rec.score;
            }
          } else {
            var day = parseExcelDateValue(raw);
            if (day) rec.submittedAt = day;
            else if (String(raw || '').trim() === '') delete rec.submittedAt;
          }
          if (rec.status !== 'submitted' && rec.score == null) rec.status = rec.status || 'missing';
          item.col.records[seat] = rec;
          updated += 1;
          return;
        }
        var cell = parseLeaveOrScore(raw);
        if (cell.leave) item.col.scores[seat] = 'leave';
        else if (cell.score != null) item.col.scores[seat] = cell.score;
        else delete item.col.scores[seat];
        updated += 1;
      });
    });

    api('saveGradebook', [{
      className: teacherTargetClass(),
      rules: book.rules,
      yellow: book.yellow,
      morning: book.morning,
      exams: book.exams,
      labs: book.labs,
      practicals: book.practicals,
      homeworks: book.homeworks
    }]).then(function (data) {
      applyGradebook(data);
      renderGradebook();
      var msg = '已從 Excel 匯入成績';
      if (created) msg += '，並新增 ' + created + ' 欄';
      toast(msg);
    }).catch(function (error) {
      toast(error && error.message ? error.message : '匯入失敗');
    });
  }

  function downloadScoreReport() {
    exportGradeExcel();
  }

  function mergeVisibleDatabaseRows() {
    if (!viewingLiveScores()) return;
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
    var live = viewingLiveScores();
    var score = scoreForView(row);
    var locked = live ? '' : ' readonly';
    var del = live
      ? '<button type="button" class="tool danger" data-del>刪</button>'
      : '';
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="col-class"><input data-col="className" type="text" maxlength="40" value="' + escapeHtml(row.className || '') + '"' + locked + ' /></td>' +
      '<td class="col-seat"><input data-col="seatNo" type="text" maxlength="12" value="' + escapeHtml(row.seatNo || '') + '"' + locked + ' /></td>' +
      '<td class="col-name"><input data-col="name" type="text" maxlength="40" value="' + escapeHtml(row.name || '') + '"' + locked + ' /></td>' +
      '<td class="col-score"><input data-col="score" type="number" step="1" value="' + score + '"' + locked + ' /></td>' +
      '<td class="col-del">' + del + '</td>';
    els.dbBody.appendChild(tr);
    if (focus && live) {
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
    if (!viewingLiveScores()) {
      toast('目前是在看舊的日期，請先回到進行中的那一天再改名單');
      return;
    }
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
      if (typeof SeatDB !== 'undefined' && SeatDB.flushCloud) {
        SeatDB.flushCloud().then(function () {
          fillCloudSettings();
          renderMeta();
        }).catch(function () {
          fillCloudSettings();
          renderMeta();
        });
      }
      toast(cloudConnected() ? '已同步到雲端。平時改完就會自動存，不必再按' : '已暫存在這台。請到設定連上雲端，另一台才看得到');
    });
  }

  function downloadBackup() {
    if (typeof SeatDB === 'undefined' || !SeatDB.exportJSON) {
      toast('無法下載備份');
      return;
    }
    downloadText('座位表備份.json', SeatDB.exportJSON(), 'application/json;charset=utf-8');
    toast('已下載備份。平時請用雲端同步，這份是保險用');
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
    fillCloudSettings();
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