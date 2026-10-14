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
    peerTeach: false,
    peerHelperSeatNo: null,
    plusHits: {},
    lotteryFate: null,
    lotteryFatePending: false,
    fateOffer: null,
    lotteryLastWinner: null,
    lotteryLastGroupId: 0,
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
    gradebookReady: false,
    gradeDirty: {},
    weekKey: '',
    statsView: 'check',
    careScope: 'class',
    statsPaperKey: '',
    statsSeatNo: '',
    schoolBusy: false,
    gradesSub: 'summary',
    teacherTab: 'roster',
    timetableSheet: 0,
    scheduleChanges: [],
    scheduleWeek: '',
    hwMissing: {},
    missingPick: {},
    missingSeatSaving: false,
    groupPanel: false,
    groupAssign: false,
    groupPick: 1,
    layoutMode: 'seatNo',
    statsBySeat: {},
    groupDeductions: [],
    timerOpen: false,
    timer: {
      totalMs: 180000,
      remainMs: 180000,
      running: false,
      endsAt: 0,
      tickId: null,
      done: false
    },
    appView: 'class',
    lessonLog: {}
  };

  const GROUP_COLORS = [
    '#c9783a', '#2f6f8f', '#2c7a4b', '#8b5a9e',
    '#b4413c', '#3d6b8a', '#9a6b2f', '#5a7a3c',
    '#6b4c8a', '#1b6e6a', '#a05a4a', '#4a6fa5'
  ];

  const els = {
    classSelect: document.getElementById('classSelect'),
    syncMeta: document.getElementById('syncMeta'),
    board: document.getElementById('board'),
    roster: document.getElementById('roster'),
    rankEmpty: document.getElementById('rankEmpty'),
    groupBar: document.getElementById('groupBar'),
    groupSize: document.getElementById('groupSize'),
    groupPick: document.getElementById('groupPick'),
    groupHint: document.getElementById('groupHint'),
    groupApplyScore: document.getElementById('groupApplyScore'),
    groupRankWrap: document.getElementById('groupRankWrap'),
    groupRoster: document.getElementById('groupRoster'),
    labBar: document.getElementById('labBar'),
    boardHint: document.getElementById('boardHint'),
    btnLayoutSeatNo: document.getElementById('btnLayoutSeatNo'),
    btnLayoutGroup: document.getElementById('btnLayoutGroup'),
    classModeTitle: document.getElementById('classModeTitle'),
    groupRankTitle: document.getElementById('groupRankTitle'),
    toast: document.getElementById('toast'),
    lotteryModal: document.getElementById('lotteryModal'),
    lotteryName: document.getElementById('lotteryName'),
    lotteryStamp: document.getElementById('lotteryStamp'),
    lotteryMeta: document.getElementById('lotteryMeta'),
    lotteryUnique: document.getElementById('lotteryUnique'),
    lotteryTierHigh: document.getElementById('lotteryTierHigh'),
    lotteryTierMid: document.getElementById('lotteryTierMid'),
    lotteryTierLow: document.getElementById('lotteryTierLow'),
    lotteryTierHint: document.getElementById('lotteryTierHint'),
    lotteryFateWrap: document.getElementById('lotteryFateWrap'),
    lotteryFateLabel: document.getElementById('lotteryFateLabel'),
    btnLotteryApplyFate: document.getElementById('btnLotteryApplyFate'),
    btnLotterySkipFate: document.getElementById('btnLotterySkipFate'),
    fatePanel: document.getElementById('fatePanel'),
    fatePanelWho: document.getElementById('fatePanelWho'),
    fatePanelLabel: document.getElementById('fatePanelLabel'),
    btnFateApply: document.getElementById('btnFateApply'),
    btnFateSkip: document.getElementById('btnFateSkip'),
    btnPeerTeach: document.getElementById('btnPeerTeach'),
    timerPanel: document.getElementById('timerPanel'),
    timerDisplay: document.getElementById('timerDisplay'),
    timerStatus: document.getElementById('timerStatus'),
    timerMinutes: document.getElementById('timerMinutes'),
    timerSeconds: document.getElementById('timerSeconds'),
    btnTimer: document.getElementById('btnTimer'),
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
    statsPlusCards: document.getElementById('statsPlusCards'),
    statsGroupDeduct: document.getElementById('statsGroupDeduct'),
    personGroupDeduct: document.getElementById('personGroupDeduct'),
    chartTrend: document.getElementById('chartTrend'),
    chartTerm: document.getElementById('chartTerm'),
    statsBody: document.getElementById('statsBody'),
    chartRank: document.getElementById('chartRank'),
    chartDist: document.getElementById('chartDist'),
    statsPersonSelect: document.getElementById('statsPersonSelect'),
    personCards: document.getElementById('personCards'),
    personWatch: document.getElementById('personWatch'),
    chartPersonRadar: document.getElementById('chartPersonRadar'),
    chartPersonVsClass: document.getElementById('chartPersonVsClass'),
    chartPersonTrend: document.getElementById('chartPersonTrend'),
    chartPersonPlusMinus: document.getElementById('chartPersonPlusMinus'),
    chartPersonHw: document.getElementById('chartPersonHw'),
    chartPersonAssess: document.getElementById('chartPersonAssess'),
    personAssessTable: document.getElementById('personAssessTable'),
    chartPersonPct: document.getElementById('chartPersonPct'),
    chartPersonBand: document.getElementById('chartPersonBand'),
    chartPersonSeries: document.getElementById('chartPersonSeries'),
    schoolCards: document.getElementById('schoolCards'),
    chartSchoolTermAvg: document.getElementById('chartSchoolTermAvg'),
    chartSchoolPass: document.getElementById('chartSchoolPass'),
    chartSchoolClassRaw: document.getElementById('chartSchoolClassRaw'),
    chartSchoolQuizAvg: document.getElementById('chartSchoolQuizAvg'),
    chartSchoolExamAvg: document.getElementById('chartSchoolExamAvg'),
    schoolClassBody: document.getElementById('schoolClassBody'),
    schoolTopBody: document.getElementById('schoolTopBody'),
    timetableSheets: document.getElementById('timetableSheets'),
    timetableStatus: document.getElementById('timetableStatus'),
    timetableClock: document.getElementById('timetableClock'),
    timetableNow: document.getElementById('timetableNow'),
    timetableGrid: document.getElementById('timetableGrid'),
    timetableOpenLink: document.getElementById('timetableOpenLink'),
    timetableFrame: document.getElementById('timetableFrame'),
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
  };

  document.getElementById('btnPlus').addEventListener('click', function () {
    setMode(App.mode === 'plus' ? 'select' : 'plus');
  });
  document.getElementById('btnMinus').addEventListener('click', function () {
    if (App.peerTeach) setPeerTeach(false);
    setMode(App.mode === 'minus' ? 'select' : 'minus');
  });
  document.getElementById('btnUndo').addEventListener('click', undoLast);
  if (els.btnPeerTeach) {
    els.btnPeerTeach.addEventListener('click', function () {
      if (!canEdit()) {
        toast('檢視模式不能互教加分');
        return;
      }
      setPeerTeach(!App.peerTeach);
    });
  }
  var resetScoresBtn = document.getElementById('btnResetScores');
  if (resetScoresBtn) {
    resetScoresBtn.addEventListener('click', function () {
      requireTeacher(resetAllScores);
    });
  }
  document.getElementById('btnLottery').addEventListener('click', function () {
    openLottery(true);
  });
  if (els.btnTimer) {
    els.btnTimer.addEventListener('click', toggleTimerPanel);
  }
  var btnTimerStart = document.getElementById('btnTimerStart');
  if (btnTimerStart) btnTimerStart.addEventListener('click', startAnswerTimer);
  var btnTimerPause = document.getElementById('btnTimerPause');
  if (btnTimerPause) btnTimerPause.addEventListener('click', pauseAnswerTimer);
  var btnTimerReset = document.getElementById('btnTimerReset');
  if (btnTimerReset) btnTimerReset.addEventListener('click', resetAnswerTimer);
  var btnTimerHide = document.getElementById('btnTimerHide');
  if (btnTimerHide) btnTimerHide.addEventListener('click', hideTimerPanel);
  var btnTimerApply = document.getElementById('btnTimerApply');
  if (btnTimerApply) btnTimerApply.addEventListener('click', applyTimerCustom);
  document.querySelectorAll('[data-timer-sec]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTimerDuration(Number(btn.getAttribute('data-timer-sec')) || 0, true);
    });
  });
  if (els.timerMinutes) {
    els.timerMinutes.addEventListener('change', applyTimerCustom);
  }
  if (els.timerSeconds) {
    els.timerSeconds.addEventListener('change', applyTimerCustom);
  }
  var btnGroup = document.getElementById('btnGroup');
  if (btnGroup) {
    btnGroup.addEventListener('click', function () {
      App.groupPanel = !App.groupPanel;
      if (!App.groupPanel) App.groupAssign = false;
      if (App.groupPanel && App.layoutMode !== 'group') setLayoutMode('group', true);
      renderAll();
      toast(App.groupPanel ? '分組面板已打開' : '分組面板已收合');
    });
  }
  if (els.btnLayoutSeatNo) {
    els.btnLayoutSeatNo.addEventListener('click', function () { setLayoutMode('seatNo'); });
  }
  if (els.btnLayoutGroup) {
    els.btnLayoutGroup.addEventListener('click', function () { setLayoutMode('group'); });
  }
  var btnGroupRandom = document.getElementById('btnGroupRandom');
  if (btnGroupRandom) btnGroupRandom.addEventListener('click', randomGroups);
  var btnSeatByGroup = document.getElementById('btnSeatByGroup');
  if (btnSeatByGroup) btnSeatByGroup.addEventListener('click', seatByGroups);
  var btnGroupClear = document.getElementById('btnGroupClear');
  if (btnGroupClear) btnGroupClear.addEventListener('click', clearGroups);
  var btnGroupManual = document.getElementById('btnGroupManual');
  if (btnGroupManual) {
    btnGroupManual.addEventListener('click', function () {
      App.groupPanel = true;
      App.groupAssign = !App.groupAssign;
      if (App.groupAssign) App.mode = 'select';
      renderAll();
      toast(App.groupAssign ? '手動分組：先選組別再點學生，再點一次可移出' : '已離開手動分組');
    });
  }
  var btnLabBySeat = document.getElementById('btnLabBySeat');
  if (btnLabBySeat) btnLabBySeat.addEventListener('click', function () { assignLabGroups(false); });
  var btnLabRandom = document.getElementById('btnLabRandom');
  if (btnLabRandom) btnLabRandom.addEventListener('click', function () { assignLabGroups(true); });
  if (els.groupSize) {
    els.groupSize.addEventListener('change', function () {
      var g = classGroups();
      g.size = clampGroupSize(els.groupSize.value);
      persistGroups();
    });
  }
  if (els.groupPick) {
    els.groupPick.addEventListener('change', function () {
      App.groupPick = parseInt(els.groupPick.value, 10) || 1;
      if (App.groupAssign) renderAll();
    });
  }
  document.getElementById('btnLotteryAgain').addEventListener('click', function () {
    openLottery(false);
  });
  document.getElementById('btnLotteryClose').addEventListener('click', function () {
    els.lotteryModal.hidden = true;
    App.lotteryBusy = false;
    hideLotteryFate();
    if (els.lotteryCard) {
      els.lotteryCard.classList.remove('rolling', 'revealed');
    }
    if (els.lotteryStamp) els.lotteryStamp.hidden = true;
  });
  document.getElementById('btnLotteryReset').addEventListener('click', resetDrawn);
  ['lotteryTierHigh', 'lotteryTierMid', 'lotteryTierLow'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function () {
      if (!App.classroom) return;
      prepareDrawData(function () {
        updateLotteryTierHint(buildLotteryPool(false).pool);
      });
    });
  });
  document.querySelectorAll('input[name="lotteryMode"]').forEach(function (el) {
    el.addEventListener('change', function () {
      if (!App.classroom) return;
      prepareDrawData(function () {
        updateLotteryTierHint(buildLotteryPool(false).pool);
      });
    });
  });
  if (els.btnLotteryApplyFate) {
    els.btnLotteryApplyFate.addEventListener('click', applyFateOffer);
  }
  if (els.btnLotterySkipFate) {
    els.btnLotterySkipFate.addEventListener('click', skipFateOffer);
  }
  if (els.btnFateApply) {
    els.btnFateApply.addEventListener('click', applyFateOffer);
  }
  if (els.btnFateSkip) {
    els.btnFateSkip.addEventListener('click', skipFateOffer);
  }
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
      if (view === 'lab') {
        showLabView();
        return;
      }
      showClassView();
    });
  });
  document.querySelectorAll('[data-stats-view]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setStatsView(btn.getAttribute('data-stats-view'));
    });
  });
  document.querySelectorAll('[data-care-scope]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setCareScope(btn.getAttribute('data-care-scope'));
    });
  });
  var checkOnly = document.getElementById('checkOnlyIssues');
  if (checkOnly) checkOnly.addEventListener('change', paintCheckStudents);
  var careBody = document.getElementById('careBody');
  if (careBody) {
    careBody.addEventListener('click', function (event) {
      var row = event.target.closest('tr[data-seat]');
      if (!row) return;
      openStatsPerson(row.getAttribute('data-class'), row.getAttribute('data-seat'));
    });
  }
  var paperSelect = document.getElementById('statsPaperSelect');
  if (paperSelect) {
    paperSelect.addEventListener('change', function () {
      App.statsPaperKey = paperSelect.value;
      renderPaperStats(App.statsPeople || []);
      renderSchoolPaper();
    });
  }
  var paperPrev = document.getElementById('btnPaperPrev');
  var paperNext = document.getElementById('btnPaperNext');
  if (paperPrev) paperPrev.addEventListener('click', function () { shiftStatsPaper(-1); });
  if (paperNext) paperNext.addEventListener('click', function () { shiftStatsPaper(1); });
  var schoolPaperBody = document.getElementById('schoolPaperBody');
  if (schoolPaperBody) {
    schoolPaperBody.addEventListener('click', function (event) {
      var row = event.target.closest('tr[data-class][data-seat]');
      if (!row) return;
      openStatsPerson(row.getAttribute('data-class'), row.getAttribute('data-seat'));
    });
  }
  if (els.statsPersonSelect) {
    els.statsPersonSelect.addEventListener('change', function () {
      App.statsSeatNo = els.statsPersonSelect.value;
      renderPersonStats();
    });
  }
  var prevPerson = document.getElementById('btnPersonPrev');
  var nextPerson = document.getElementById('btnPersonNext');
  if (prevPerson) prevPerson.addEventListener('click', function () { shiftStatsPerson(-1); });
  if (nextPerson) nextPerson.addEventListener('click', function () { shiftStatsPerson(1); });
  if (els.statsBody) {
    els.statsBody.addEventListener('click', function (event) {
      var row = event.target.closest('tr[data-seat]');
      if (!row) return;
      App.statsSeatNo = row.getAttribute('data-seat');
      setStatsView('person');
    });
  }
  if (els.schoolClassBody) {
    els.schoolClassBody.addEventListener('click', function (event) {
      var row = event.target.closest('tr[data-class]');
      if (!row) return;
      openStatsClass(row.getAttribute('data-class'));
    });
  }
  function schoolStudentClick(event) {
    var row = event.target.closest('tr[data-class][data-seat]');
    if (!row) return;
    openStatsPerson(row.getAttribute('data-class'), row.getAttribute('data-seat'));
  }
  if (els.schoolTopBody) els.schoolTopBody.addEventListener('click', schoolStudentClick);
  var lockBtn = document.getElementById('btnTeacherLock');
  if (lockBtn) {
    lockBtn.addEventListener('click', lockTeacher);
  }
  document.querySelectorAll('[data-sign-out]').forEach(function (btn) {
    btn.addEventListener('click', lockTeacher);
  });
  document.querySelectorAll('[data-teacher-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTeacherTab(btn.getAttribute('data-teacher-tab'));
    });
  });
  document.querySelectorAll('[data-grades-sub]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (App.teacherTab !== 'grades') switchTeacherTab('grades');
      setGradesSub(btn.getAttribute('data-grades-sub'));
    });
  });
  if (els.timetableSheets) {
    els.timetableSheets.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-tt-sheet]');
      if (!btn) return;
      App.timetableSheet = Number(btn.getAttribute('data-tt-sheet')) || 0;
      renderTimetable();
    });
  }
  var btnTimetableRefresh = document.getElementById('btnTimetableRefresh');
  if (btnTimetableRefresh) {
    btnTimetableRefresh.addEventListener('click', function () {
      loadTimetable(true);
    });
  }
  var btnTtSwapSave = document.getElementById('btnTtSwapSave');
  if (btnTtSwapSave) {
    btnTtSwapSave.addEventListener('click', function () {
      requireTeacher(saveScheduleChangeFromForm);
    });
  }
  var ttSwapList = document.getElementById('ttSwapList');
  if (ttSwapList) {
    ttSwapList.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-tt-swap-del]');
      if (!btn) return;
      requireTeacher(function () {
        deleteScheduleChange(btn.getAttribute('data-tt-swap-del'));
      });
    });
  }
  var ttSwapWeek = document.getElementById('ttSwapWeek');
  if (ttSwapWeek) {
    ttSwapWeek.addEventListener('change', function () {
      App.scheduleWeek = ttSwapWeek.value || mondayKeyOf(new Date());
      renderScheduleChangePanel();
      renderTimetable();
    });
  }
  if (els.timetableGrid) {
    els.timetableGrid.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-tt-class]');
      if (!btn) return;
      goToTimetableClass(btn.getAttribute('data-tt-class'));
    });
  }
  if (els.timetableNow) {
    els.timetableNow.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-tt-class]');
      if (!btn) return;
      goToTimetableClass(btn.getAttribute('data-tt-class'));
    });
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
      if (App.teacherTab === 'journal') {
        api('getLessonLog', []).then(function (data) {
          if (data && data.lessonLog) {
            App.lessonLog = mergeLessonLogClient_(App.lessonLog, data.lessonLog);
          }
          renderLessonJournal();
        }).catch(function () {
          renderLessonJournal();
        });
      }
      if (App.teacherTab === 'missing') renderHwMissingTab();
      if (App.teacherTab === 'grades' && App.gradesSub === 'stats' && statsNeedsSchool()) {
        ensureSchoolStats();
      }
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
    gradeTermWrap.addEventListener('input', onGradeCellInput);
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
  if (csvBtn) csvBtn.addEventListener('click', downloadClassExcel);
  var rosterTpl = document.getElementById('btnRosterTemplate');
  if (rosterTpl) rosterTpl.addEventListener('click', downloadRosterExcel);
  var pickRoster = document.getElementById('btnPickRoster');
  if (pickRoster) {
    pickRoster.addEventListener('click', function () {
      if (els.settingFile) els.settingFile.click();
    });
  }
  var importRosterBtn = document.getElementById('btnImportRoster');
  if (importRosterBtn) importRosterBtn.addEventListener('click', importPendingRoster);
  var journalSave = document.getElementById('btnJournalSave');
  if (journalSave) {
    journalSave.addEventListener('click', function () {
      requireTeacher(saveLessonJournal);
    });
  }
  var journalEventSave = document.getElementById('btnJournalEventSave');
  if (journalEventSave) {
    journalEventSave.addEventListener('click', function () {
      requireTeacher(saveLessonEventFromForm);
    });
  }
  var journalEventBody = document.getElementById('journalEventBody');
  if (journalEventBody) {
    journalEventBody.addEventListener('click', function (event) {
      var doneBtn = event.target.closest('[data-journal-event-done]');
      if (doneBtn) {
        requireTeacher(function () {
          toggleLessonEventDone(
            doneBtn.getAttribute('data-journal-event-class'),
            doneBtn.getAttribute('data-journal-event-done')
          );
        });
        return;
      }
      var btn = event.target.closest('[data-journal-event-del]');
      if (!btn) return;
      requireTeacher(function () {
        deleteLessonEvent(btn.getAttribute('data-journal-event-class'), btn.getAttribute('data-journal-event-del'));
      });
    });
  }
  var btnMissingSave = document.getElementById('btnMissingSave');
  if (btnMissingSave) {
    btnMissingSave.addEventListener('click', function () {
      requireTeacher(saveHwMissingFromForm);
    });
  }
  var btnMissingClearPick = document.getElementById('btnMissingClearPick');
  if (btnMissingClearPick) {
    btnMissingClearPick.addEventListener('click', function () {
      App.missingPick = {};
      var text = document.getElementById('missingSeatsText');
      if (text) text.value = '';
      renderHwMissingSeatPick();
    });
  }
  var missingSeatPick = document.getElementById('missingSeatPick');
  if (missingSeatPick) {
    missingSeatPick.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-missing-seat]');
      if (!btn) return;
      var seat = btn.getAttribute('data-missing-seat');
      if (!seat) return;
      if (App.missingPick[seat]) delete App.missingPick[seat];
      else App.missingPick[seat] = true;
      syncMissingSeatsTextFromPick();
      renderHwMissingSeatPick();
    });
  }
  var missingList = document.getElementById('missingList');
  if (missingList) {
    missingList.addEventListener('click', function (event) {
      var del = event.target.closest('[data-missing-del]');
      if (del) {
        requireTeacher(function () {
          deleteHwMissingItem(del.getAttribute('data-missing-class'), del.getAttribute('data-missing-del'));
        });
        return;
      }
      var seatBtn = event.target.closest('[data-missing-edit-seat]');
      if (!seatBtn || seatBtn.disabled) return;
      var itemId = seatBtn.getAttribute('data-missing-edit-id');
      var seat = seatBtn.getAttribute('data-missing-edit-seat');
      var className = seatBtn.getAttribute('data-missing-edit-class') || teacherTargetClass();
      if (!itemId || !seat || !className) return;
      requireTeacher(function () {
        toggleHwMissingItemSeat(className, itemId, seat);
      });
    });
  }
  var missingSeatsText = document.getElementById('missingSeatsText');
  if (missingSeatsText) {
    missingSeatsText.addEventListener('input', function () {
      App.missingPick = {};
      parseMissingSeatsText(missingSeatsText.value).forEach(function (seat) {
        App.missingPick[seat] = true;
      });
      renderHwMissingSeatPick();
    });
  }
  var cloudBtn = document.getElementById('btnCloudConnect');
  if (cloudBtn) cloudBtn.addEventListener('click', connectCloud);
  var repairGroupsBtn = document.getElementById('btnRepairGroups');
  if (repairGroupsBtn) {
    repairGroupsBtn.addEventListener('click', function () {
      requireTeacher(repairGroupsFromCloud);
    });
  }
  var cloudUrl = document.getElementById('cloudApiUrl');
  if (cloudUrl) {
    cloudUrl.addEventListener('input', function () {
      rememberCloudUrl(cloudUrl.value);
    });
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
  document.querySelectorAll('.delta-group .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      App.delta = Number(chip.getAttribute('data-delta')) || 1;
      renderDelta();
    });
  });

  function canEdit() {
    return !!(window.GoogleAuth && GoogleAuth.isTeacher());
  }

  var TIMER_STORAGE_KEY = 'class-seating-timer-secs';

  function formatTimerMs(ms) {
    var total = Math.max(0, Math.ceil(Number(ms) / 1000));
    var m = Math.floor(total / 60);
    var s = total % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function readSavedTimerSecs() {
    try {
      var n = parseInt(localStorage.getItem(TIMER_STORAGE_KEY), 10);
      if (isFinite(n) && n > 0 && n <= 99 * 60 + 59) return n;
    } catch (err) {}
    return 180;
  }

  function saveTimerSecs(secs) {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, String(secs));
    } catch (err) {}
  }

  function timerRemainMs() {
    if (App.timer.running && App.timer.endsAt) {
      return Math.max(0, App.timer.endsAt - Date.now());
    }
    return Math.max(0, App.timer.remainMs);
  }

  function renderTimerUi() {
    var remain = timerRemainMs();
    App.timer.remainMs = remain;
    if (els.timerDisplay) els.timerDisplay.textContent = formatTimerMs(remain);
    if (els.timerPanel) {
      els.timerPanel.hidden = !App.timerOpen;
      els.timerPanel.classList.toggle('running', !!App.timer.running);
      els.timerPanel.classList.toggle('warn', !App.timer.done && remain > 0 && remain <= 30000);
      els.timerPanel.classList.toggle('urgent', !App.timer.done && remain > 0 && remain <= 10000);
      els.timerPanel.classList.toggle('done', !!App.timer.done);
    }
    if (els.btnTimer) {
      els.btnTimer.classList.toggle('tab-on', !!App.timerOpen);
      els.btnTimer.setAttribute('aria-pressed', App.timerOpen ? 'true' : 'false');
      els.btnTimer.textContent = App.timer.running
        ? ('定時 ' + formatTimerMs(remain))
        : '定時';
    }
    var pauseBtn = document.getElementById('btnTimerPause');
    var startBtn = document.getElementById('btnTimerStart');
    if (pauseBtn) pauseBtn.disabled = !App.timer.running;
    if (startBtn) {
      startBtn.textContent = App.timer.running
        ? '計時中'
        : (App.timer.done || remain <= 0
          ? '再開始'
          : (remain > 0 && remain < App.timer.totalMs ? '繼續' : '開始'));
      startBtn.disabled = !!App.timer.running;
    }
    if (els.timerStatus) {
      if (App.timer.done) els.timerStatus.textContent = '時間到！';
      else if (App.timer.running) els.timerStatus.textContent = '作答進行中';
      else if (remain > 0 && remain < App.timer.totalMs) els.timerStatus.textContent = '已暫停，可按繼續';
      else els.timerStatus.textContent = '可調整時間後按開始';
    }
    document.querySelectorAll('[data-timer-sec]').forEach(function (btn) {
      var sec = Number(btn.getAttribute('data-timer-sec')) || 0;
      btn.classList.toggle('timer-preset-on', Math.round(App.timer.totalMs / 1000) === sec);
    });
    if (els.timerMinutes && document.activeElement !== els.timerMinutes) {
      els.timerMinutes.value = String(Math.floor(App.timer.totalMs / 60000));
    }
    if (els.timerSeconds && document.activeElement !== els.timerSeconds) {
      els.timerSeconds.value = String(Math.floor((App.timer.totalMs % 60000) / 1000));
    }
  }

  function stopTimerTick() {
    if (App.timer.tickId) {
      clearInterval(App.timer.tickId);
      App.timer.tickId = null;
    }
  }

  function playTimerDoneSound() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = playTimerDoneSound.ctx || new Ctx();
      playTimerDoneSound.ctx = ctx;
      if (ctx.state === 'suspended') ctx.resume();
      var now = ctx.currentTime;
      var master = ctx.createGain();
      master.gain.setValueAtTime(0.55, now);
      master.connect(ctx.destination);

      function beep(offset, freq, dur, type) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.9, now + offset + 0.015);
        gain.gain.setValueAtTime(0.9, now + offset + Math.max(0.04, dur - 0.05));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + offset);
        osc.stop(now + offset + dur + 0.02);
      }

      // 雙音警報：高／低交替，連響多段，教室裡較容易聽到
      var pattern = [
        [0.00, 988, 0.22], [0.24, 740, 0.22],
        [0.55, 988, 0.22], [0.79, 740, 0.22],
        [1.10, 988, 0.22], [1.34, 740, 0.22],
        [1.65, 1175, 0.28], [1.95, 880, 0.32],
        [2.35, 1175, 0.35]
      ];
      pattern.forEach(function (item) {
        beep(item[0], item[1], item[2], 'square');
        beep(item[0], item[1] * 2, item[2] * 0.85, 'triangle');
      });
    } catch (err) {}
    try {
      if (navigator.vibrate) navigator.vibrate([220, 100, 220, 100, 360, 120, 480]);
    } catch (err2) {}
  }

  function onTimerFinished() {
    stopTimerTick();
    App.timer.running = false;
    App.timer.endsAt = 0;
    App.timer.remainMs = 0;
    App.timer.done = true;
    App.timerOpen = true;
    renderTimerUi();
    playTimerDoneSound();
    toast('時間到！', 5000);
  }

  function tickAnswerTimer() {
    if (!App.timer.running) return;
    var remain = timerRemainMs();
    App.timer.remainMs = remain;
    var shown = Math.ceil(remain / 1000);
    var band = remain <= 0 ? 'done' : remain <= 10000 ? 'urgent' : remain <= 30000 ? 'warn' : 'ok';
    if (shown !== App.timer._uiSec || band !== App.timer._uiBand) {
      App.timer._uiSec = shown;
      App.timer._uiBand = band;
      renderTimerUi();
    }
    if (remain <= 0) onTimerFinished();
  }

  function setTimerDuration(secs, resetRemain) {
    secs = Math.max(1, Math.min(99 * 60 + 59, Math.round(Number(secs) || 0)));
    if (App.timer.running) pauseAnswerTimer();
    App.timer.totalMs = secs * 1000;
    if (resetRemain !== false) {
      App.timer.remainMs = App.timer.totalMs;
      App.timer.done = false;
    }
    saveTimerSecs(secs);
    renderTimerUi();
  }

  function applyTimerCustom() {
    var mins = Math.max(0, Math.min(99, parseInt(els.timerMinutes && els.timerMinutes.value, 10) || 0));
    var secs = Math.max(0, Math.min(59, parseInt(els.timerSeconds && els.timerSeconds.value, 10) || 0));
    var total = mins * 60 + secs;
    if (!total) {
      toast('時間至少要 1 秒');
      return;
    }
    setTimerDuration(total, true);
    toast('已設為 ' + formatTimerMs(total * 1000));
  }

  function startAnswerTimer() {
    if (!canEdit()) {
      toast('檢視模式不能操作定時器');
      return;
    }
    if (App.timer.running) return;
    if (App.timer.done || App.timer.remainMs <= 0) {
      App.timer.remainMs = App.timer.totalMs;
      App.timer.done = false;
    }
    if (App.timer.remainMs <= 0) {
      toast('請先設定時間');
      return;
    }
    App.timerOpen = true;
    App.timer.running = true;
    App.timer.done = false;
    App.timer.endsAt = Date.now() + App.timer.remainMs;
    stopTimerTick();
    App.timer.tickId = setInterval(tickAnswerTimer, 200);
    renderTimerUi();
    toast('定時開始：' + formatTimerMs(App.timer.remainMs));
  }

  function pauseAnswerTimer() {
    if (!App.timer.running) {
      renderTimerUi();
      return;
    }
    App.timer.remainMs = timerRemainMs();
    App.timer.running = false;
    App.timer.endsAt = 0;
    stopTimerTick();
    renderTimerUi();
    toast('已暫停');
  }

  function resetAnswerTimer() {
    stopTimerTick();
    App.timer.running = false;
    App.timer.endsAt = 0;
    App.timer.remainMs = App.timer.totalMs;
    App.timer.done = false;
    renderTimerUi();
    toast('已重設為 ' + formatTimerMs(App.timer.totalMs));
  }

  function toggleTimerPanel() {
    if (!canEdit()) {
      toast('檢視模式不能操作定時器');
      return;
    }
    App.timerOpen = !App.timerOpen;
    renderTimerUi();
  }

  function hideTimerPanel() {
    if (App.timer.running) {
      toast('計時仍在進行，工具列會顯示剩餘時間');
    }
    App.timerOpen = false;
    renderTimerUi();
  }

  function initAnswerTimer() {
    var secs = readSavedTimerSecs();
    App.timer.totalMs = secs * 1000;
    App.timer.remainMs = App.timer.totalMs;
    App.timer.running = false;
    App.timer.endsAt = 0;
    App.timer.done = false;
    App.timerOpen = false;
    renderTimerUi();
  }

  function teacherEmailHint() {
    var list = (window.GoogleAuth && GoogleAuth.teacherEmails && GoogleAuth.teacherEmails()) || [];
    return list[0] || 'chunhsinkuo@kcis.hc.edu.tw';
  }

  function applyTeacherUi(opts) {
    opts = opts || {};
    var teacher = canEdit();
    document.body.classList.toggle('teacher-on', teacher);
    if (!teacher && App.appView === 'teacher' && !opts.keepSettings) {
      showClassView();
    }
  }

  function isLabView() {
    return App.appView === 'lab';
  }

  function showClassView() {
    App.appView = 'class';
    if (els.app) els.app.hidden = false;
    if (els.teacherView) els.teacherView.hidden = true;
    document.body.classList.remove('view-teacher', 'view-lab');
    document.querySelectorAll('[data-app-view]').forEach(function (btn) {
      btn.classList.toggle('tab-on', btn.getAttribute('data-app-view') === 'class');
    });
    renderAll();
  }

  function showLabView() {
    App.appView = 'lab';
    App.groupPanel = false;
    App.groupAssign = false;
    if (els.app) els.app.hidden = false;
    if (els.teacherView) els.teacherView.hidden = true;
    document.body.classList.remove('view-teacher');
    document.body.classList.add('view-lab');
    document.querySelectorAll('[data-app-view]').forEach(function (btn) {
      btn.classList.toggle('tab-on', btn.getAttribute('data-app-view') === 'lab');
    });
    fillMissingLabAssign();
    if (fillMissingLabAssign.changed && canEdit()) persistLab();
    renderAll();
  }

  function showTeacherView() {
    if (!canEdit()) {
      toast('檢視模式沒有教師功能');
      showClassView();
      return;
    }
    App.appView = 'teacher';
    if (els.app) els.app.hidden = true;
    if (els.teacherView) els.teacherView.hidden = false;
    document.body.classList.add('view-teacher');
    document.body.classList.remove('view-lab');
    document.querySelectorAll('[data-app-view]').forEach(function (btn) {
      btn.classList.toggle('tab-on', btn.getAttribute('data-app-view') === 'teacher');
    });
  }

  function requireTeacher(nextFn) {
    if (canEdit()) {
      nextFn();
      return;
    }
    if (window.GoogleAuth && GoogleAuth.isViewer()) {
      toast('檢視模式只能看座位表，無法使用教師功能');
      return;
    }
    toast('請先用教師 Google 帳號登入');
  }

  function lockTeacher() {
    if (window.GoogleAuth) GoogleAuth.signOut();
  }

  function showLoadingBoard(text, canRetry) {
    if (!els.board || App.classroom) return;
    els.board.innerHTML = '<div class="empty-state"><div>' + escapeHtml(text) + '</div>' +
      (canRetry ? '<button type="button" class="tool primary" id="btnReloadCloud">重新載入</button>' : '') +
      '</div>';
    var btn = document.getElementById('btnReloadCloud');
    if (btn) {
      btn.addEventListener('click', function () {
        bootstrap();
      });
    }
  }

  var bootstrapSeq = 0;

  function bootstrap(attempt) {
    attempt = attempt || 1;
    var seq = ++bootstrapSeq;
    App.busy = true;
    if (els.syncMeta && !App.classroom) {
      els.syncMeta.textContent = attempt > 1 ? ('正在重試載入（' + attempt + '/3）…') : '正在載入…';
    }
    showLoadingBoard(attempt > 1 ? ('雲端較慢，正在重試第 ' + attempt + ' 次…') : '正在從雲端載入班級…', false);
    var finished = false;
    var slowTimer = setTimeout(function () {
      if (finished || App.classroom || seq !== bootstrapSeq) return;
      if (els.syncMeta) els.syncMeta.textContent = '載入時間較久，仍在連雲端…';
    }, 8000);
    var failAt = attempt === 1 ? 70000 : 90000;
    var failTimer = setTimeout(function () {
      if (finished || App.classroom || seq !== bootstrapSeq) return;
      if (attempt < 3) {
        finished = true;
        App.busy = false;
        clearTimeout(slowTimer);
        bootstrap(attempt + 1);
        return;
      }
      App.busy = false;
      if (els.syncMeta) els.syncMeta.textContent = '載入逾時，請再試一次';
      showLoadingBoard('雲端回應較慢，資料還沒進來。請再按一次重新載入。', true);
      toast('載入逾時，請再試一次');
    }, failAt);
    function settle() {
      if (finished || seq !== bootstrapSeq) return false;
      finished = true;
      App.busy = false;
      clearTimeout(slowTimer);
      clearTimeout(failTimer);
      return true;
    }
    function isRetryableLoadError(error) {
      var msg = error && error.message ? error.message : String(error || '');
      if (/登入已過期|登入憑證|請先用 Google|沒有權限|只有教師|沒有開放權限|打開該網址/.test(msg)) {
        return false;
      }
      return true;
    }
    api('getBootstrapData', []).then(function (data) {
      if (!settle()) return;
      applyPayload(data, true);
      fillCloudSettings();
      var merged = typeof SeatDB !== 'undefined' && SeatDB.takeHoldMerged ? SeatDB.takeHoldMerged() : 0;
      if (merged) {
        toast('雲端已有別台的新資料，已把這台還沒同步的 ' + merged + ' 筆加扣分合併進去。確認後請按「立即同步」', 9000);
      } else if (!cloudConnected()) {
        toast('資料還沒上雲端。請切到教師模式 → 設定，連上 Google 試算表，平板和筆電才能共用');
      } else if (App.classroom && !App.classroom.students.length) {
        toast('這個班還沒有學生，請切到「教師模式」輸入名單');
      } else {
        toast('已從雲端載入，平板與筆電會看到同一份資料');
      }
    }).catch(function (error) {
      if (!settle()) return;
      if (attempt < 3 && isRetryableLoadError(error)) {
        toast('載入失敗，正在重試（' + (attempt + 1) + '/3）…', 3000);
        setTimeout(function () {
          if (seq !== bootstrapSeq) return;
          bootstrap(attempt + 1);
        }, 900 * attempt);
        return;
      }
      var msg = error && error.message ? error.message : '載入失敗，請再試一次';
      if (els.syncMeta) els.syncMeta.textContent = '載入失敗：' + msg;
      showLoadingBoard(msg, true);
      toast(msg);
    });
  }

  setInterval(syncScoreDay, 30000);
  var PULL_BASE_MS = 25000;
  var PULL_MAX_MS = 120000;
  var pullDelay = PULL_BASE_MS;
  var pullInFlight = false;
  var pullTimer = null;

  function schedulePull(ms) {
    clearTimeout(pullTimer);
    pullTimer = setTimeout(function () {
      pullCloudQuiet();
      schedulePull(pullDelay);
    }, ms);
  }
  schedulePull(PULL_BASE_MS);

  window.addEventListener('beforeunload', function (event) {
    var info = typeof SeatDB !== 'undefined' && SeatDB.cloudStatus ? SeatDB.cloudStatus() : {};
    if (!info.scoreHold && !info.saving) return;
    event.preventDefault();
    event.returnValue = '';
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (typeof SeatDB !== 'undefined' && SeatDB.flushCloud) {
        SeatDB.flushCloud({ pendingOnly: true, skipHeld: true }).catch(function () {});
      }
      return;
    }
    syncScoreDay();
    pullCloudQuiet();
  });
  window.addEventListener('pagehide', function () {
    if (typeof SeatDB !== 'undefined' && SeatDB.flushCloud) {
      SeatDB.flushCloud({ pendingOnly: true, skipHeld: true }).catch(function () {});
    }
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
      else if (info.scoreHold) line.textContent = '加扣先留在這台。換平板／手機前請按「立即同步」，避免舊分頁蓋掉新紀錄';
      else if (info.enabled && !info.error) line.textContent = '已連上雲端。座位改完會自動存；加扣請按「立即同步」再換機';
      else if (info.error) line.textContent = info.error;
      else line.textContent = '尚未連線：請先部署 Apps Script 並貼上網址';
    }
    var link = document.getElementById('cloudSheetLink');
    if (link) {
      if (info.sheetUrl) {
        link.innerHTML = '<a href="' + escapeHtml(info.sheetUrl) + '" target="_blank" rel="noopener">打開成績資料庫（不是課表）</a>';
      } else {
        link.textContent = '';
      }
    }
  }

  function pullCloudQuiet() {
    if (document.hidden) return;
    if (App.busy || App.dirty || App.lotteryBusy) return;
    if (typeof SeatDB === 'undefined' || !SeatDB.pullIfNewer) return;
    var info = SeatDB.cloudStatus ? SeatDB.cloudStatus() : {};
    if (info.scoreHold) return;
    if (gradeSaveTimer || ruleSaveTimer) return;
    if (App.appView === 'teacher' && (App.teacherTab === 'settings' ||
      (App.teacherTab === 'grades' && App.gradesSub === 'summary'))) return;
    if (pullInFlight) return;
    var className = App.classroom && App.classroom.className;
    pullInFlight = true;
    SeatDB.pullIfNewer(className).then(function (data) {
      pullInFlight = false;
      pullDelay = PULL_BASE_MS;
      fillCloudSettings();
      renderMeta();
      if (!data || !data.changed) return;
      applyPayload(data, true);
      if (App.appView === 'teacher') refreshTeacherExtras();
      toast('已從雲端同步（另一台裝置剛更新）');
    }).catch(function () {
      pullInFlight = false;
      pullDelay = Math.min(PULL_MAX_MS, pullDelay * 2);
      fillCloudSettings();
      renderMeta();
    });
  }

  var RESUME_KEY = 'seat-resume';

  function rememberCloudUrl(url) {
    url = String(url || '').trim();
    if (!url || url.indexOf('/exec') < 0) return;
    if (window.CloudStore && CloudStore.setUrl) CloudStore.setUrl(url);
  }

  function saveResume(extra) {
    try {
      var urlInput = document.getElementById('cloudApiUrl');
      sessionStorage.setItem(RESUME_KEY, JSON.stringify(Object.assign({
        view: App.appView || 'teacher',
        tab: App.teacherTab || 'settings',
        cloudUrl: urlInput ? String(urlInput.value || '').trim() : '',
        retryConnect: false
      }, extra || {})));
    } catch (err) {}
  }

  function readResume() {
    try {
      var raw = sessionStorage.getItem(RESUME_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function clearResume() {
    try { sessionStorage.removeItem(RESUME_KEY); } catch (err) {}
  }

  function showCloudRelogin(show) {
    var box = document.getElementById('cloudRelogin');
    if (box) box.hidden = !show;
    if (show && window.GoogleAuth && GoogleAuth.renderExtraButtons) {
      GoogleAuth.renderExtraButtons();
    }
  }

  function needsCloudLogin(msg) {
    msg = String(msg || '');
    return /請先用 Google|登入已過期|登入憑證|尚未驗證|沒有信箱|打開該網址|沒有開放權限|沒有權限|UrlFetchApp|external_request|連線至外部/.test(msg);
  }

  function resumeAfterSignIn(account, alreadyBooted) {
    var resume = readResume();
    if (!resume || !account || !account.teacher) return false;
    if (resume.cloudUrl && window.CloudStore && CloudStore.setUrl) {
      CloudStore.setUrl(resume.cloudUrl);
      var urlInput = document.getElementById('cloudApiUrl');
      if (urlInput) urlInput.value = resume.cloudUrl;
    }
    App.pendingTeacherTab = resume.tab || 'settings';
    showCloudRelogin(false);
    var retry = !!resume.retryConnect;
    clearResume();
    function goSettingsAndMaybeConnect() {
      App.pendingTeacherTab = 'settings';
      openDatabase();
      if (retry) {
        whenIdle(function () {
          connectCloud({ skipResume: true });
        });
      }
    }

    function whenIdle(fn) {
      var n = 0;
      (function tick() {
        if (!App.busy || n > 25) {
          fn();
          return;
        }
        n += 1;
        setTimeout(tick, 200);
      })();
    }
    if (!alreadyBooted || !App.classroom) {
      App.busy = false;
      api('getBootstrapData', []).then(function (data) {
        applyPayload(data, true);
        fillCloudSettings();
        goSettingsAndMaybeConnect();
      }).catch(function () {
        goSettingsAndMaybeConnect();
      });
    } else {
      goSettingsAndMaybeConnect();
    }
    return true;
  }

  function connectCloud(opts) {
    opts = opts || {};
    var urlInput = document.getElementById('cloudApiUrl');
    var url = urlInput ? urlInput.value.trim() : '';
    if (!url) {
      toast('請先貼上 Apps Script 網頁應用程式網址', 4000);
      return;
    }
    rememberCloudUrl(url);
    if (!opts.skipResume) {
      saveResume({ view: 'teacher', tab: 'settings', cloudUrl: url, retryConnect: true });
    }
    if (window.GoogleAuth && (!GoogleAuth.isTeacher() || GoogleAuth.tokenExpired())) {
      showTeacherView();
      switchTeacherTab('settings');
      showCloudRelogin(true);
      toast('請在設定頁再登入一次教師帳號，登入後會自動連上，不會離開這一頁', 6000);
      return;
    }
    run('connectCloud', [url, App.classroom && App.classroom.className], function (data) {
      clearResume();
      showCloudRelogin(false);
      applyPayload(data, true);
      fillCloudSettings();
      showTeacherView();
      switchTeacherTab('settings');
      toast('已連上雲端，之後平板和筆電都會用這份資料', 4000);
    });
  }

  function repairGroupsFromCloud() {
    if (!cloudConnected()) {
      toast('請先連上雲端');
      return;
    }
    if (typeof SeatDB === 'undefined' || !SeatDB.repairGroups) {
      toast('請先重新整理頁面再試');
      return;
    }
    toast('正在嘗試還原分組…');
    SeatDB.repairGroups(App.classroom && App.classroom.className).then(function (data) {
      applyPayload(data, true);
      fillCloudSettings();
      var msg = data && data.repair && data.repair.message
        ? data.repair.message
        : (data && data.repair && data.repair.ok === false
          ? '找不到可還原的分組，請看試算表版本紀錄或重新分組'
          : '已嘗試還原分組，請切換班級查看');
      toast(msg, 8000);
      renderAll();
    }).catch(function (err) {
      toast(err && err.message ? err.message : '還原分組失敗');
    });
  }

  function loadClass(className) {
    run('loadClassroom', [className], function (data) {
      App.drawn[className] = App.drawn[className] || [];
      applyPayload(data, true);
      refreshClassStats();
    });
  }

  function seatLookupKey(seatNo) {
    var raw = String(seatNo == null ? '' : seatNo).trim();
    var digits = raw.replace(/\D/g, '');
    if (digits) return String(parseInt(digits, 10));
    return raw;
  }

  function refreshClassStats(done) {
    var className = App.classroom && App.classroom.className;
    if (!className) {
      if (done) done();
      return;
    }
    Promise.all([
      api('getClassStats', [className]).then(function (data) {
        App.statsBySeat = {};
        (data && data.students ? data.students : []).forEach(function (row) {
          if (!row) return;
          var keys = [String(row.seatNo), seatLookupKey(row.seatNo)];
          keys.forEach(function (k) {
            if (k) App.statsBySeat[k] = row;
          });
        });
        if (data && data.activeDate) App.activeDate = data.activeDate;
      }),
      api('listDaily', [className]).then(function (data) {
        if (data && data.days) {
          App.dailyDays = data.days;
          App.dailyDaysClass = String(data.className || className);
        }
        if (data && data.activeDate) App.activeDate = data.activeDate;
      }).catch(function () {})
    ]).then(function () {
      renderRoster();
      if (done) done();
    }).catch(function () {
      renderRoster();
      if (done) done();
    });
  }

  function statsRowFor(student) {
    if (!student) return null;
    var key = String(student.seatNo);
    return (App.statsBySeat && (App.statsBySeat[key] || App.statsBySeat[seatLookupKey(key)])) || null;
  }

  function buildRankIndex(list, scoreFn) {
    var ranked = (list || []).slice().sort(function (a, b) {
      var diff = Number(scoreFn(b)) - Number(scoreFn(a));
      if (diff) return diff;
      return String(a.seatNo).localeCompare(String(b.seatNo), 'zh-Hant', { numeric: true });
    });
    var map = {};
    ranked.forEach(function (s, i) {
      map[String(s.seatNo)] = i + 1;
      map[seatLookupKey(s.seatNo)] = i + 1;
    });
    return { ranked: ranked, map: map };
  }

  function renderRoster() {
    if (!els.roster || !App.classroom) return;
    var students = App.classroom.students || [];
    var todayIndex = buildRankIndex(students, function (s) { return Number(s.score) || 0; });
    var ranked = students.filter(function (student) {
      return Number(student.score) > 0;
    }).sort(function (a, b) {
      var diff = Number(b.score) - Number(a.score);
      if (diff) return diff;
      return String(a.seatNo).localeCompare(String(b.seatNo), 'zh-Hant', { numeric: true });
    });
    if (els.rankEmpty) els.rankEmpty.hidden = ranked.length > 0;
    if (!ranked.length) {
      els.roster.innerHTML = '';
      return;
    }
    els.roster.innerHTML = ranked.map(function (student) {
      var todayRank = todayIndex.map[String(student.seatNo)] || todayIndex.map[seatLookupKey(student.seatNo)] || '—';
      var todayScore = Number(student.score) || 0;
      var selected = student.seatNo === App.selectedSeatNo ? ' selected' : '';
      var medal = todayRank === 1 ? ' gold' : todayRank === 2 ? ' silver' : todayRank === 3 ? ' bronze' : '';
      var bump = student.seatNo === App.rankBumpSeat ? ' rank-up' : '';
      var signed = (todayScore > 0 ? '+' : '') + todayScore;
      return '<li><button type="button" class="' + selected + medal + bump + '" data-seat="' + escapeHtml(student.seatNo) + '">' +
        '<span class="rank-no">' + todayRank + '</span>' +
        '<span class="rank-main"><span class="rank-name">' + escapeHtml(student.name) + '</span>' +
        '<span class="rank-meta">' +
          '<span class="rank-chip">座 ' + escapeHtml(student.seatNo) + '</span>' +
          '<span class="rank-chip">今日 #' + todayRank + '</span>' +
        '</span></span>' +
        '<strong class="' + scoreClass(todayScore) + '">' + signed + '</strong></button></li>';
    }).join('');
    els.roster.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        const student = findStudent(button.getAttribute('data-seat'));
        if (!student) return;
        App.selectedSeatNo = student.seatNo;
        if (App.peerTeach && App.mode !== 'minus') {
          handlePeerTeachClick(student);
          return;
        }
        if (App.mode === 'plus') {
          beginManualFate(student);
        } else if (App.mode === 'minus') {
          changeScore(student, -App.delta);
        } else {
          renderAll();
        }
      });
    });
  }

  function applyPayload(data, replace) {
    App.classNames = data.classNames || [];
    noteScoreRoll(data);
    if (replace || !App.classroom) {
      App.classroom = data.classroom;
      App.dirty = false;
      App.selectedSeatNo = null;
      App.peerHelperSeatNo = null;
    }
    if (data.classroom && data.plusHits) {
      App.plusHits = App.plusHits || {};
      App.plusHits[data.classroom.className] = Object.assign({}, data.plusHits);
    }
    if (data.lessonLog) {
      App.lessonLog = mergeLessonLogClient_(App.lessonLog, data.lessonLog);
    }
    if (data.scheduleChanges) {
      App.scheduleChanges = mergeScheduleChangesClient_(App.scheduleChanges, data.scheduleChanges);
    }
    if (data.hwMissing) {
      App.hwMissing = mergeHwMissingClient_(App.hwMissing, data.hwMissing);
    }
    renderAll();
    if (App.classroom) refreshClassStats();
  }

  function mergeHwMissingClient_(localMap, remoteMap) {
    localMap = localMap && typeof localMap === 'object' ? localMap : {};
    remoteMap = remoteMap && typeof remoteMap === 'object' ? remoteMap : {};
    var names = {};
    Object.keys(localMap).forEach(function (cn) { names[cn] = true; });
    Object.keys(remoteMap).forEach(function (cn) { names[cn] = true; });
    var out = {};
    Object.keys(names).forEach(function (cn) {
      var byId = {};
      ((remoteMap[cn] || []).concat(localMap[cn] || [])).forEach(function (item) {
        if (!item || !item.id) return;
        var prev = byId[item.id];
        if (!prev || String(item.updatedAt || item.createdAt || '') >= String(prev.updatedAt || prev.createdAt || '')) {
          byId[item.id] = item;
        }
      });
      out[cn] = Object.keys(byId).map(function (id) { return byId[id]; }).filter(function (item) {
        return !item.deleted;
      }).sort(function (a, b) {
        return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
      });
    });
    return out;
  }

  function mergeScheduleChangesClient_(localList, remoteList) {
    var byId = {};
    (remoteList || []).concat(localList || []).forEach(function (item) {
      if (!item || !item.id || !item.className) return;
      var prev = byId[item.id];
      if (!prev || String(item.updatedAt || item.createdAt || '') >= String(prev.updatedAt || prev.createdAt || '')) {
        byId[item.id] = item;
      }
    });
    return Object.keys(byId).map(function (id) { return byId[id]; }).filter(function (item) {
      return !item.deleted;
    }).sort(function (a, b) {
      return String(b.weekStart || '').localeCompare(String(a.weekStart || '')) ||
        String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
  }

  function countLessonLogClient_(log) {
    var n = 0;
    Object.keys(log || {}).forEach(function (cn) {
      var pack = log[cn] || {};
      if (pack.current) n += 1;
      n += (pack.entries || []).length;
    });
    return n;
  }

  function mergeLessonLogClient_(localLog, remoteLog) {
    localLog = localLog && typeof localLog === 'object' ? localLog : {};
    remoteLog = remoteLog && typeof remoteLog === 'object' ? remoteLog : {};
    var out = {};
    var names = {};
    Object.keys(localLog).forEach(function (cn) { names[cn] = true; });
    Object.keys(remoteLog).forEach(function (cn) { names[cn] = true; });
    Object.keys(names).forEach(function (cn) {
      var localPack = localLog[cn] || { current: '', updatedAt: '', entries: [], events: [] };
      var remotePack = remoteLog[cn] || { current: '', updatedAt: '', entries: [], events: [] };
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
        if (!prevDate || String(entry.createdAt || '') >= String(prevDate.createdAt || '')) byDate[date] = entry;
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
      var eventById = {};
      (remotePack.events || []).concat(localPack.events || []).forEach(function (ev) {
        if (!ev || !ev.id) return;
        var prev = eventById[ev.id];
        if (!prev || String(ev.updatedAt || ev.createdAt || '') >= String(prev.updatedAt || prev.createdAt || '')) {
          eventById[ev.id] = ev;
        }
      });
      var events = Object.keys(eventById).map(function (id) { return eventById[id]; }).filter(function (ev) {
        return !ev.deleted;
      }).sort(function (a, b) {
        return String(a.date || '').localeCompare(String(b.date || '')) ||
          String(a.period || '').localeCompare(String(b.period || ''));
      });
      out[cn] = {
        current: String(localPack.current || remotePack.current || '').trim().slice(0, 80),
        updatedAt: (localPack.updatedAt || '') > (remotePack.updatedAt || '') ? localPack.updatedAt : (remotePack.updatedAt || localPack.updatedAt || ''),
        entries: entries,
        events: events
      };
    });
    if (!Object.keys(out).length && countLessonLogClient_(remoteLog) >= countLessonLogClient_(localLog)) {
      return remoteLog;
    }
    return out;
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
      App.plusHits = {};
      toast('已過晚上 10 點，已自動存下 ' + formatZhDate(data.closedDate) + ' 的加扣分');
    }
    updateScoreDayLabel();
  }

  function syncScoreDay() {
    if (!App.classroom || document.hidden || App.busy) return;
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
    renderClassChrome();
    renderBoard();
    renderRoster();
    renderGroupBar();
    renderGroupRoster();
    renderMode();
    renderDelta();
    if (App.appView === 'teacher' && App.teacherTab === 'journal') renderLessonJournal();
    if (App.appView === 'teacher' && App.teacherTab === 'missing') renderHwMissingTab();
    renderHwMissingBanner();
  }

  /** 能就地改分數就不要整板重建。 */
  function patchSeatScoresOnBoard() {
    if (!els.board || !App.classroom) return false;
    var cards = els.board.querySelectorAll('.seat-card[data-seat]');
    if (!cards.length) return false;
    var ok = 0;
    cards.forEach(function (card) {
      var student = findStudent(card.getAttribute('data-seat'));
      if (!student) return;
      ok += 1;
      card.classList.toggle('selected', String(student.seatNo) === String(App.selectedSeatNo));
      card.classList.toggle('peer-helper', !!(App.peerHelperSeatNo && String(student.seatNo) === String(App.peerHelperSeatNo)));
      var scoreEl = card.querySelector('.seat-score');
      if (!scoreEl) return;
      var todayScore = Number(student.score) || 0;
      scoreEl.className = 'seat-score ' + scoreClass(todayScore);
      scoreEl.textContent = String(todayScore);
    });
    return ok > 0;
  }

  /** 加扣分後的輕量更新：不重跑班級下拉／教師分頁，減少卡頓。 */
  function refreshScoreUi() {
    if (!App.classroom || !els.board) return;
    renderMeta();
    if (!patchSeatScoresOnBoard()) renderBoard();
    renderRoster();
    renderGroupBar();
    renderGroupRoster();
    renderMode();
    updateScoreDayLabel();
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
      : info.scoreHold ? '加扣尚未上傳，換機前請按立即同步'
      : (info.enabled && !info.error) ? '座位已自動存到雲端'
      : (info.error ? (info.error.indexOf('另一台') >= 0 ? info.error : '雲端同步失敗') : '只在這台裝置');
    els.syncMeta.textContent = App.classroom.students.length + ' 位學生 · ' + where +
      (time ? ' · ' + time : '') + dirty;
    var saveBtn = document.getElementById('btnSave');
    if (saveBtn) saveBtn.classList.toggle('need-sync', !!info.scoreHold);
  }

  function renderBoard() {
    const room = App.classroom;
    if (isLabView()) {
      renderLabBoard();
      return;
    }
    els.board.classList.remove('lab-board');
    els.board.classList.add('board-list');
    els.board.style.gridTemplateColumns = '';
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
    if (App.layoutMode === 'group') renderGroupListBoard();
    else renderSeatNoBoard();
    bindSeatEvents();
    updateLayoutChrome();
  }

  function seatScoreBlockHtml(student) {
    var todayScore = Number(student && student.score) || 0;
    return '<span class="seat-score ' + scoreClass(todayScore) + '">' + todayScore + '</span>';
  }

  function studentCardHtml(student) {
    if (!student) return '';
    const selected = student.seatNo === App.selectedSeatNo ? ' selected' : '';
    const helper = App.peerHelperSeatNo && String(student.seatNo) === String(App.peerHelperSeatNo) ? ' peer-helper' : '';
    const gid = studentGroupId(student.seatNo);
    const groupCls = gid ? ' has-group' : '';
    const pickedCls = (App.groupAssign && gid === App.groupPick) ? ' group-picked' : '';
    const missingCls = isSeatHwMissing(student.seatNo) ? ' hw-missing' : '';
    const groupStyle = gid ? ' style="--group-color:' + groupColor(gid) + '"' : '';
    const groupBadge = gid ? '<span class="seat-group">第' + gid + '組</span>' : '';
    const missingBadge = missingCls ? '<span class="seat-hw-missing">缺交</span>' : '';
    return '<div class="seat">' +
      '<article class="seat-card' + selected + helper + groupCls + pickedCls + missingCls + '" data-seat="' + escapeHtml(student.seatNo) + '"' + groupStyle + '>' +
        groupBadge + missingBadge +
        '<span class="seat-no">' + escapeHtml(student.seatNo) + '</span>' +
        '<span class="seat-name">' + escapeHtml(student.name) + '</span>' +
        seatScoreBlockHtml(student) +
      '</article></div>';
  }

  function renderSeatNoBoard() {
    var list = (App.classroom.students || []).slice().sort(seatOrder);
    els.board.innerHTML = list.map(studentCardHtml).join('');
  }

  function renderGroupListBoard() {
    var assign = (classGroups().assign) || {};
    var buckets = {};
    var ungrouped = [];
    (App.classroom.students || []).slice().sort(seatOrder).forEach(function (s) {
      var gid = parseInt(assign[String(s.seatNo)], 10) || 0;
      if (!gid) {
        ungrouped.push(s);
        return;
      }
      if (!buckets[gid]) buckets[gid] = [];
      buckets[gid].push(s);
    });
    var ids = Object.keys(buckets).map(Number).sort(function (a, b) { return a - b; });
    if (!ids.length && !ungrouped.length) {
      els.board.innerHTML = '';
      return;
    }
    var html = ids.map(function (gid) {
      return '<section class="board-group-block" style="--group-color:' + groupColor(gid) + '">' +
        '<div class="board-group-head"><span><span class="dot"></span>第' + gid + '組</span>' +
        '<span class="hint">' + buckets[gid].length + ' 人</span></div>' +
        '<div class="board-group-grid">' + buckets[gid].map(studentCardHtml).join('') + '</div></section>';
    }).join('');
    if (ungrouped.length) {
      html += '<section class="board-group-block">' +
        '<div class="board-group-head"><span>未分組</span><span class="hint">' + ungrouped.length + ' 人</span></div>' +
        '<div class="board-group-grid">' + ungrouped.map(studentCardHtml).join('') + '</div></section>';
    }
    if (!ids.length) {
      html = '<p class="hint" style="grid-column:1/-1;margin:0 0 8px">尚未分組，可先按「分組」再切回依分組檢視。</p>' + html;
    }
    els.board.innerHTML = html;
  }

  function setLayoutMode(mode, quiet) {
    App.layoutMode = mode === 'group' ? 'group' : 'seatNo';
    try { localStorage.setItem('class-layout-mode', App.layoutMode); } catch (err) {}
    updateLayoutChrome();
    if (!quiet) renderAll();
  }

  function updateLayoutChrome() {
    if (els.btnLayoutSeatNo) els.btnLayoutSeatNo.classList.toggle('tab-on', App.layoutMode !== 'group');
    if (els.btnLayoutGroup) els.btnLayoutGroup.classList.toggle('tab-on', App.layoutMode === 'group');
    if (els.boardHint) {
      var n = (App.classroom && App.classroom.students) ? App.classroom.students.length : 0;
      els.boardHint.textContent = App.layoutMode === 'group'
        ? ('依分組顯示全班 ' + n + ' 人；未分組列在最下方。')
        : ('依座號顯示全班 ' + n + ' 人；點學生即可加扣分。');
    }
  }

  function restoreLayoutMode() {
    try {
      var saved = localStorage.getItem('class-layout-mode');
      if (saved === 'group' || saved === 'seatNo') App.layoutMode = saved;
    } catch (err) {}
  }

  function bindSeatEvents() {
    els.board.querySelectorAll('.seat-card').forEach(function (card) {
      card.addEventListener('click', onSeatClick);
      if (isLabView()) card.addEventListener('pointerdown', onPointerDown);
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
    if (!canEdit()) {
      renderAll();
      return;
    }
    if (App.groupAssign && App.groupPanel) {
      toggleStudentGroup(student);
      return;
    }
    if (App.peerTeach && App.mode !== 'minus') {
      handlePeerTeachClick(student);
      return;
    }
    if (App.mode === 'plus') {
      beginManualFate(student);
    } else if (App.mode === 'minus') {
      changeScore(student, -App.delta);
    } else {
      renderAll();
    }
  }

  function onPointerDown(event) {
    if (!canEdit()) return;
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
    if (isLabView()) {
      const zone = target && target.closest ? target.closest('.lab-zone') : null;
      if (!zone) return;
      assignLabStudent(drag.seatNo, Number(zone.getAttribute('data-group')));
      return;
    }
    const seat = target && target.closest ? target.closest('.seat') : null;
    if (!seat) {
      return;
    }
    moveStudent(drag.seatNo, Number(seat.getAttribute('data-row')), Number(seat.getAttribute('data-col')));
  }

  function highlightDropTarget(x, y) {
    clearDropTargets();
    const target = document.elementFromPoint(x, y);
    if (isLabView()) {
      const zone = target && target.closest ? target.closest('.lab-zone') : null;
      if (zone) zone.classList.add('drop-target');
      return;
    }
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

  function setMode(mode) {
    if (!canEdit() && (mode === 'plus' || mode === 'minus')) {
      toast('檢視模式不能加扣分');
      return;
    }
    App.mode = mode;
    if (mode === 'plus' || mode === 'minus') App.groupAssign = false;
    if (mode === 'minus' && App.peerTeach) {
      App.peerTeach = false;
      App.peerHelperSeatNo = null;
    }
    renderMode();
    renderGroupBar();
    toast(mode === 'plus' ? '加分模式：點學生後會出現命運加分' : mode === 'minus' ? '扣分模式：點學生即可扣分' : '已回到選取模式');
  }

  function renderMode() {
    document.getElementById('btnPlus').classList.toggle('active-plus', App.mode === 'plus');
    document.getElementById('btnMinus').classList.toggle('active-minus', App.mode === 'minus');
    var btnGroup = document.getElementById('btnGroup');
    if (btnGroup) btnGroup.classList.toggle('active-group', App.groupPanel);
    var btnGroupManual = document.getElementById('btnGroupManual');
    if (btnGroupManual) btnGroupManual.classList.toggle('active-group', App.groupAssign);
    if (els.btnPeerTeach) {
      els.btnPeerTeach.classList.toggle('active-peer', !!App.peerTeach);
      els.btnPeerTeach.setAttribute('aria-pressed', App.peerTeach ? 'true' : 'false');
    }
  }

  function renderDelta() {
    document.querySelectorAll('.delta-group .chip').forEach(function (chip) {
      chip.classList.toggle('active', Number(chip.getAttribute('data-delta')) === App.delta);
    });
  }

  function groupColor(gid) {
    var i = (parseInt(gid, 10) || 1) - 1;
    return GROUP_COLORS[((i % GROUP_COLORS.length) + GROUP_COLORS.length) % GROUP_COLORS.length];
  }

  function clampGroupSize(value) {
    var n = parseInt(value, 10);
    if (!isFinite(n)) n = 4;
    return Math.min(12, Math.max(2, n));
  }

  function classGroups() {
    if (!App.classroom) return { size: 4, assign: {}, scores: {} };
    if (!App.classroom.groups) App.classroom.groups = { size: 4, assign: {}, scores: {} };
    if (!App.classroom.groups.assign) App.classroom.groups.assign = {};
    if (!App.classroom.groups.scores) App.classroom.groups.scores = {};
    return App.classroom.groups;
  }

  function studentGroupId(seatNo) {
    if (isLabView()) return studentLabGroupId(seatNo);
    return parseInt(classGroups().assign[String(seatNo)], 10) || 0;
  }

  function classLab() {
    if (!App.classroom) return { assign: {}, scores: {} };
    if (!App.classroom.lab) App.classroom.lab = { assign: {}, scores: {} };
    if (!App.classroom.lab.assign) App.classroom.lab.assign = {};
    if (!App.classroom.lab.scores) App.classroom.lab.scores = {};
    return App.classroom.lab;
  }

  function studentLabGroupId(seatNo) {
    return parseInt(classLab().assign[String(seatNo)], 10) || 0;
  }

  function renderClassChrome() {
    if (els.classModeTitle) els.classModeTitle.textContent = isLabView() ? '實驗室模式' : '上課模式';
    if (els.groupRankTitle) els.groupRankTitle.textContent = isLabView() ? '實驗小組' : '小組分數';
    if (els.btnLayoutSeatNo) els.btnLayoutSeatNo.hidden = !!isLabView();
    if (els.btnLayoutGroup) els.btnLayoutGroup.hidden = !!isLabView();
    if (els.boardHint) els.boardHint.hidden = !!isLabView();
    updateLayoutChrome();
  }

  var labSaveSeq = 0;

  function persistLab(message) {
    if (!App.classroom || !canEdit()) return;
    var seq = ++labSaveSeq;
    var lab = classLab();
    var snapshot = {
      assign: Object.assign({}, lab.assign),
      scores: Object.assign({}, lab.scores)
    };
    run('saveLab', [{
      className: App.classroom.className,
      lab: snapshot
    }], function (data) {
      if (seq !== labSaveSeq) return;
      if (data && data.classroom) {
        if (data.classroom.lab) App.classroom.lab = data.classroom.lab;
        if (data.classroom.updatedAt) App.classroom.updatedAt = data.classroom.updatedAt;
      }
      renderMeta();
      renderGroupRoster();
      if (isLabView()) renderLabBoard();
      if (message) toast(message);
    }, true);
  }

  function splitIntoSix(list, shuffle) {
    var students = (list || []).slice();
    if (shuffle) {
      var i;
      for (i = students.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = students[i];
        students[i] = students[j];
        students[j] = tmp;
      }
    } else {
      students.sort(seatOrder);
    }
    var assign = {};
    var n = students.length;
    var base = Math.floor(n / 6);
    var extra = n % 6;
    var idx = 0;
    var g;
    for (g = 1; g <= 6; g++) {
      var size = base + (g <= extra ? 1 : 0);
      var k;
      for (k = 0; k < size; k++) {
        assign[String(students[idx].seatNo)] = g;
        idx += 1;
      }
    }
    return assign;
  }

  function fillMissingLabAssign() {
    fillMissingLabAssign.changed = false;
    if (!App.classroom) return false;
    var students = App.classroom.students || [];
    if (!students.length) return false;
    var lab = classLab();
    var missing = students.filter(function (s) { return !studentLabGroupId(s.seatNo); });
    if (!Object.keys(lab.assign).length || missing.length === students.length) {
      lab.assign = splitIntoSix(students, false);
      fillMissingLabAssign.changed = true;
      return true;
    }
    if (missing.length) {
      missing.forEach(function (s) {
        var counts = [0, 0, 0, 0, 0, 0, 0];
        Object.keys(lab.assign).forEach(function (seat) {
          var gid = parseInt(lab.assign[seat], 10);
          if (gid >= 1 && gid <= 6) counts[gid] += 1;
        });
        var best = 1;
        var g;
        for (g = 2; g <= 6; g++) {
          if (counts[g] < counts[best]) best = g;
        }
        lab.assign[String(s.seatNo)] = best;
      });
      fillMissingLabAssign.changed = true;
      return true;
    }
    return false;
  }

  function assignLabGroups(shuffle) {
    if (!canEdit()) {
      toast('檢視模式不能改實驗分組');
      return;
    }
    if (!App.classroom) return;
    var students = App.classroom.students || [];
    if (!students.length) {
      toast('沒有學生可以分組');
      return;
    }
    if (Object.keys(classLab().assign).length && !window.confirm(shuffle
      ? '重新隨機會蓋掉目前的實驗分組，小組分數也會歸零。確定嗎？'
      : '依座號重分六組會蓋掉目前的實驗分組，小組分數也會歸零。確定嗎？')) {
      return;
    }
    classLab().assign = splitIntoSix(students, shuffle);
    classLab().scores = {};
    if (isLabView()) renderLabBoard();
    renderGroupRoster();
    persistLab(shuffle ? '已隨機分成六組' : '已依座號分成六組');
  }

  function assignLabStudent(seatNo, gid) {
    if (!canEdit()) return;
    gid = parseInt(gid, 10);
    if (gid < 1 || gid > 6) return;
    var student = findStudent(seatNo);
    if (!student) return;
    var prev = studentLabGroupId(seatNo);
    if (prev === gid) return;
    classLab().assign[String(seatNo)] = gid;
    if (isLabView()) renderLabBoard();
    persistLab(student.name + ' → 實驗第' + gid + '組');
  }

  function renderLabBoard() {
    var room = App.classroom;
    if (!room) return;
    els.board.classList.remove('board-list');
    els.board.classList.add('lab-board');
    els.board.style.gridTemplateColumns = '';
    if (!(room.students || []).length) {
      els.board.classList.remove('lab-board');
      els.board.innerHTML = '<div class="empty-state">' +
        '<div>「' + escapeHtml(room.className) + '」目前沒有學生</div>' +
        '<div>請先到教師模式匯入名單</div></div>';
      return;
    }
    fillMissingLabAssign();
    var lab = classLab();
    var buckets = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    (room.students || []).forEach(function (s) {
      var gid = studentLabGroupId(s.seatNo);
      if (gid >= 1 && gid <= 6) buckets[gid].push(s);
    });
    var html = '';
    var g;
    for (g = 1; g <= 6; g++) {
      buckets[g].sort(seatOrder);
      var score = Number(lab.scores[String(g)]) || 0;
      var signed = (score > 0 ? '+' : '') + score;
      html += '<div class="lab-zone" data-group="' + g + '" style="--group-color:' + groupColor(g) + '">' +
        '<div class="lab-zone-head"><span>第' + g + '組　' + buckets[g].length + '人</span>' +
        '<strong class="' + scoreClass(score) + '">' + signed + '</strong></div>' +
        '<div class="lab-zone-seats">' +
        buckets[g].map(function (student) { return labSeatCard(student, g); }).join('') +
        '</div></div>';
    }
    els.board.innerHTML = html;
    bindSeatEvents();
    els.board.querySelectorAll('.lab-zone').forEach(function (zone) {
      zone.addEventListener('click', onLabZoneClick);
    });
  }

  function labSeatCard(student, gid) {
    var selected = student.seatNo === App.selectedSeatNo ? ' selected' : '';
    var helper = App.peerHelperSeatNo && String(student.seatNo) === String(App.peerHelperSeatNo) ? ' peer-helper' : '';
    var missingCls = isSeatHwMissing(student.seatNo) ? ' hw-missing' : '';
    var missingBadge = missingCls ? '<span class="seat-hw-missing">缺交</span>' : '';
    return '<article class="seat-card has-group' + selected + helper + missingCls + '" data-seat="' + escapeHtml(student.seatNo) + '" style="--group-color:' + groupColor(gid) + '">' +
      missingBadge +
      '<span class="seat-no">' + escapeHtml(student.seatNo) + '</span>' +
      '<span class="seat-name">' + escapeHtml(student.name) + '</span>' +
      seatScoreBlockHtml(student) +
      '</article>';
  }

  function onLabZoneClick(event) {
    if (event.target.closest('.seat-card')) return;
    if (App.suppressClick || (App.drag && App.drag.moved)) return;
    var gid = parseInt(event.currentTarget.getAttribute('data-group'), 10);
    var members = (App.classroom.students || []).filter(function (s) {
      return studentLabGroupId(s.seatNo) === gid;
    }).sort(seatOrder);
    if (!members.length) return;
    var selected = members.filter(function (s) { return String(s.seatNo) === String(App.selectedSeatNo); })[0];
    if (App.mode === 'plus' || App.mode === 'minus') {
      var sign = App.mode === 'plus' ? 1 : -1;
      if (App.mode === 'minus' && !selected) {
        toast('請先點那位同學，再點這一組扣分，成績統計才會記下是因為誰');
      }
      var actor = selected || members[0];
      App.selectedSeatNo = actor.seatNo;
      if (App.mode === 'plus') {
        beginManualFate(actor, { forceGroup: true, groupId: gid });
        return;
      }
      changeScore(actor, sign * App.delta, true, selected ? selected.seatNo : '');
    } else {
      App.selectedSeatNo = (selected || members[0]).seatNo;
      renderAll();
    }
  }

  function assignedCount() {
    return Object.keys(classGroups().assign || {}).length;
  }

  function maxGroupId() {
    var g = classGroups();
    var size = clampGroupSize(g.size);
    var n = (App.classroom.students || []).length;
    var needed = Math.max(1, Math.ceil(n / size));
    var maxA = 0;
    Object.keys(g.assign || {}).forEach(function (k) {
      var gid = parseInt(g.assign[k], 10);
      if (gid > maxA) maxA = gid;
    });
    return Math.max(needed, maxA, App.groupPick || 1);
  }

  function fillGroupPick() {
    if (!els.groupPick) return;
    var extra = maxGroupId() + (App.groupAssign ? 1 : 0);
    var html = '';
    for (var i = 1; i <= extra; i++) {
      html += '<option value="' + i + '">第' + i + '組</option>';
    }
    if (els.groupPick.options.length !== extra) {
      els.groupPick.innerHTML = html;
    }
    els.groupPick.value = String(App.groupPick || 1);
    if (els.groupPick.selectedIndex < 0) {
      els.groupPick.value = '1';
      App.groupPick = 1;
    }
  }

  function renderGroupBar() {
    if (els.labBar) els.labBar.hidden = !isLabView();
    if (!els.groupBar) return;
    els.groupBar.hidden = isLabView() || !App.groupPanel;
    var btnGroup = document.getElementById('btnGroup');
    if (btnGroup) btnGroup.classList.toggle('active-group', !isLabView() && App.groupPanel);
    var btnGroupManual = document.getElementById('btnGroupManual');
    if (btnGroupManual) btnGroupManual.classList.toggle('active-group', App.groupAssign);
    var g = classGroups();
    if (els.groupSize && document.activeElement !== els.groupSize) {
      els.groupSize.value = String(g.size || 4);
    }
    fillGroupPick();
    if (els.groupHint) {
      els.groupHint.textContent = App.groupAssign
        ? '手動：點學生編入第' + (App.groupPick || 1) + '組，再點一次可移出。'
        : '隨機：依每組人數打散。排座位：同一組坐在一起。小組加分會進每位組員的平時成績。';
    }
  }

  function renderGroupRoster() {
    if (!els.groupRoster || !els.groupRankWrap || !App.classroom) return;
    var lab = isLabView();
    var g = lab ? classLab() : classGroups();
    var buckets = {};
    if (lab) {
      buckets[1] = []; buckets[2] = []; buckets[3] = [];
      buckets[4] = []; buckets[5] = []; buckets[6] = [];
    }
    (App.classroom.students || []).forEach(function (s) {
      var gid = parseInt(g.assign[String(s.seatNo)], 10);
      if (!gid) return;
      if (lab && (gid < 1 || gid > 6)) return;
      if (!buckets[gid]) buckets[gid] = [];
      buckets[gid].push(s);
    });
    var ids = Object.keys(buckets).map(Number).sort(function (a, b) { return a - b; });
    if (lab) ids = [1, 2, 3, 4, 5, 6];
    els.groupRankWrap.hidden = !lab && ids.length === 0;
    if (!ids.length) {
      els.groupRoster.innerHTML = '';
      return;
    }
    var ranked = ids.slice().sort(function (a, b) {
      var sa = Number(g.scores[String(a)]) || 0;
      var sb = Number(g.scores[String(b)]) || 0;
      if (sb !== sa) return sb - sa;
      return a - b;
    });
    var positiveIds = ranked.filter(function (gid) {
      return (Number(g.scores[String(gid)]) || 0) > 0;
    });
    els.groupRoster.innerHTML = ranked.map(function (gid) {
      var score = Number(g.scores[String(gid)]) || 0;
      var signed = (score > 0 ? '+' : '') + score;
      var names = (buckets[gid] || []).map(function (s) { return s.name; }).join('、');
      var selected = (buckets[gid] || []).some(function (s) { return s.seatNo === App.selectedSeatNo; }) ? ' selected' : '';
      var posIndex = positiveIds.indexOf(gid);
      var medal = score > 0 && posIndex === 0 ? ' gold' : score > 0 && posIndex === 1 ? ' silver' : score > 0 && posIndex === 2 ? ' bronze' : '';
      return '<li><button type="button" class="' + selected + medal + '" data-group="' + gid + '" style="--group-color:' + groupColor(gid) + '">' +
        '<span class="rank-no">' + gid + '</span>' +
        '<span class="rank-main"><span class="rank-name">' + (lab ? '實驗第' : '第') + gid + '組</span>' +
        '<span class="rank-meta">' + (buckets[gid] || []).length + '人 · ' + escapeHtml(names) + '</span></span>' +
        '<strong class="' + scoreClass(score) + '">' + signed + '</strong></button></li>';
    }).join('');
    els.groupRoster.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        var gid = parseInt(button.getAttribute('data-group'), 10);
        var members = buckets[gid] || [];
        var selected = members.filter(function (s) { return String(s.seatNo) === String(App.selectedSeatNo); })[0];
        var actor = selected || members[0];
        if (actor) App.selectedSeatNo = actor.seatNo;
        if (App.mode === 'plus' || App.mode === 'minus') {
          var sign = App.mode === 'plus' ? 1 : -1;
          if (App.mode === 'minus' && !selected) {
            toast('請先點座位上那位同學，再點小組扣分，成績統計才會記下是因為誰');
          }
          if (App.mode === 'plus') {
            if (actor) beginManualFate(actor, { forceGroup: true, groupId: gid });
            return;
          }
          if (actor) changeScore(actor, sign * App.delta, true, selected ? selected.seatNo : '');
        } else {
          renderAll();
        }
      });
    });
  }

  var groupsSaveSeq = 0;

  function persistGroups(message) {
    if (!App.classroom || !canEdit()) return;
    var seq = ++groupsSaveSeq;
    var g = classGroups();
    var snapshot = {
      size: g.size,
      assign: Object.assign({}, g.assign),
      scores: Object.assign({}, g.scores)
    };
    if (g.clearedAt && !Object.keys(snapshot.assign).length) {
      snapshot.clearedAt = g.clearedAt;
    }
    run('saveGroups', [{
      className: App.classroom.className,
      groups: snapshot
    }], function (data) {
      if (seq !== groupsSaveSeq) return;
      App.classroom = data.classroom;
      renderAll();
      if (message) toast(message);
      if (snapshot.clearedAt && cloudConnected() && typeof SeatDB !== 'undefined' && SeatDB.flushCloud) {
        SeatDB.flushCloud().then(function () {
          toast('已清除分組並同步到雲端');
        }).catch(function (err) {
          toast((err && err.message) || '清除已存本機，請再按立即同步');
        });
      }
    }, true);
  }

  function toggleStudentGroup(student) {
    var g = classGroups();
    var seat = String(student.seatNo);
    var pick = parseInt(App.groupPick, 10) || 1;
    if (parseInt(g.assign[seat], 10) === pick) {
      delete g.assign[seat];
      toast(student.name + ' 已移出第' + pick + '組');
    } else {
      g.assign[seat] = pick;
      toast(student.name + ' → 第' + pick + '組');
    }
    persistGroups();
  }

  function shuffleList_(list) {
    var arr = list.slice();
    var i;
    for (i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function gridCells_(rows, cols) {
    var cells = [];
    var r;
    var c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) cells.push({ row: r, col: c });
    }
    return cells;
  }

  function pickSeatCluster_(free, count) {
    if (count <= 0) return [];
    if (free.length <= count) return free.slice();
    var seed = free[Math.floor(Math.random() * free.length)];
    return free.slice().sort(function (a, b) {
      var da = (a.row - seed.row) * (a.row - seed.row) + (a.col - seed.col) * (a.col - seed.col);
      var db = (b.row - seed.row) * (b.row - seed.row) + (b.col - seed.col) * (b.col - seed.col);
      if (da !== db) return da - db;
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    }).slice(0, count);
  }

  function seatByGroups() {
    if (!canEdit()) {
      toast('檢視模式不能改座位');
      return;
    }
    if (isLabView()) {
      toast('請先回到上課模式再依分組排座位');
      return;
    }
    if (!App.classroom) return;
    var students = App.classroom.students || [];
    if (!students.length) {
      toast('沒有學生可以排座位');
      return;
    }
    var g = classGroups();
    var buckets = {};
    var ungrouped = [];
    students.forEach(function (s) {
      var gid = parseInt(g.assign[String(s.seatNo)], 10);
      if (!gid) {
        ungrouped.push(s);
        return;
      }
      if (!buckets[gid]) buckets[gid] = [];
      buckets[gid].push(s);
    });
    var gids = Object.keys(buckets).map(Number);
    if (!gids.length) {
      App.groupPanel = true;
      renderAll();
      toast('請先隨機或手動分組，再依分組排座位');
      return;
    }
    if (!window.confirm('依目前分組重新排座位？同一組會坐在一起，組的位置會打散。分組與加扣不會改。')) {
      return;
    }
    var used = {};
    function leftover() {
      return gridCells_(App.classroom.rows, App.classroom.cols).filter(function (cell) {
        return !used[cell.row + ',' + cell.col];
      });
    }
    function occupy(cells) {
      cells.forEach(function (cell) {
        used[cell.row + ',' + cell.col] = true;
      });
    }
    shuffleList_(gids).forEach(function (gid) {
      var members = shuffleList_(buckets[gid]);
      var cluster = pickSeatCluster_(leftover(), members.length);
      occupy(cluster);
      members.forEach(function (s, idx) {
        if (!cluster[idx]) return;
        s.row = cluster[idx].row;
        s.col = cluster[idx].col;
      });
    });
    shuffleList_(ungrouped).forEach(function (s) {
      var left = leftover();
      if (!left.length) return;
      var cell = left[Math.floor(Math.random() * left.length)];
      s.row = cell.row;
      s.col = cell.col;
      occupy([cell]);
    });
    App.dirty = true;
    run('saveLayout', [serializeClassroom()], function (data) {
      App.classroom = data.classroom;
      App.dirty = false;
      App.groupPanel = true;
      renderAll();
      toast('已依分組排好座位，同一組坐在一起');
    });
  }

  function randomGroups() {
    if (!canEdit()) {
      toast('檢視模式不能改分組');
      return;
    }
    if (!App.classroom) return;
    var students = (App.classroom.students || []).slice();
    if (!students.length) {
      toast('沒有學生可以分組');
      return;
    }
    var size = clampGroupSize(els.groupSize ? els.groupSize.value : classGroups().size);
    if (assignedCount() && !window.confirm('重新隨機會蓋掉目前分組，小組分數也會歸零。確定嗎？')) {
      return;
    }
    var i;
    for (i = students.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = students[i];
      students[i] = students[j];
      students[j] = tmp;
    }
    var assign = {};
    students.forEach(function (s, idx) {
      assign[String(s.seatNo)] = Math.floor(idx / size) + 1;
    });
    App.classroom.groups = { size: size, assign: assign, scores: {} };
    App.groupPanel = true;
    App.groupAssign = false;
    var n = Math.ceil(students.length / size);
    persistGroups('已分成 ' + n + ' 組，每組最多 ' + size + ' 人');
  }

  function clearGroups() {
    if (!assignedCount()) {
      toast('目前沒有分組');
      return;
    }
    if (!window.confirm('清除全班分組與小組分數？個人加扣分不會動。清除後按「立即同步」會把空白分組寫上雲端。')) return;
    var size = classGroups().size;
    App.classroom.groups = {
      size: size,
      assign: {},
      scores: {},
      clearedAt: new Date().toISOString()
    };
    App.groupAssign = false;
    persistGroups('已清除分組，請再按「立即同步」寫上雲端');
  }

  function changeScore(student, delta, forceGroup, causeSeatNo, opts) {
    if (!canEdit()) {
      toast('檢視模式不能加扣分');
      return;
    }
    if (!delta) {
      return;
    }
    opts = opts || {};
    var skipDiminish = opts.skipDiminish === true;
    var forceNoGroup = opts.forceNoGroup === true;
    var detailExtra = opts.detail || '';
    var applyDelta = delta;
    if (delta > 0 && !skipDiminish) {
      var eff = effectivePlusDelta(student, delta);
      applyDelta = eff.delta;
    }
    if (!applyDelta) return;
    var applyGroup = !forceNoGroup && (isLabView() || forceGroup === true || !!(els.groupApplyScore && els.groupApplyScore.checked));
    var body = {
      className: App.classroom.className,
      seatNo: student.seatNo,
      delta: applyDelta,
      applyGroup: applyGroup
    };
    if (isLabView()) body.lab = true;
    if (applyGroup) {
      body.causeSeatNo = causeSeatNo == null ? student.seatNo : causeSeatNo;
    }
    if (detailExtra) body.detail = detailExtra;
    run('applyScoreChange', [body], function (data) {
      App.classroom = data.classroom;
      if (data.plusHits) {
        App.plusHits = App.plusHits || {};
        App.plusHits[App.classroom.className] = Object.assign({}, data.plusHits);
      } else if (applyDelta > 0) {
        bumpPlusHits(data.changedSeatNos && data.changedSeatNos.length ? data.changedSeatNos : [student.seatNo]);
      }
      App.selectedSeatNo = student.seatNo;
      var seats = data.changedSeatNos && data.changedSeatNos.length ? data.changedSeatNos : [student.seatNo];
      App.rankBumpSeat = seats[0];
      refreshScoreUi();
      seats.forEach(function (sn) {
        flashSeat(sn, applyDelta > 0 ? 'score-plus' : 'score-minus');
        spawnScoreFloat(sn, applyDelta);
      });
      if (applyDelta > 0) spawnConfetti(18, ['#2c7a4b', '#7dce9a', '#f3c84b']);
      var label = data.groupId
        ? ((data.lab ? '實驗第' : '第') + data.groupId + '組（' + seats.length + '人）')
        : student.name;
      var extra = (applyGroup && !data.groupId) ? '（尚未分組，只加個人）' : '';
      toast(label + ' ' + (applyDelta > 0 ? '+' : '') + applyDelta + ' 分' + extra);
      setTimeout(function () {
        if (App.rankBumpSeat === seats[0]) App.rankBumpSeat = null;
      }, 900);
      refreshClassStats();
      if (typeof opts.onDone === 'function') opts.onDone(data);
    });
  }

  function undoLast() {
    run('undoLastAction', [App.classroom.className], function (data) {
      App.classroom = data.classroom;
      if (data.plusHits) {
        App.plusHits = App.plusHits || {};
        App.plusHits[App.classroom.className] = Object.assign({}, data.plusHits);
      } else if (data.undone && Number(data.undone.delta) > 0) {
        var seats = (data.undone.seatNos && data.undone.seatNos.length) ? data.undone.seatNos : [data.undone.seatNo];
        shrinkPlusHits(seats);
      }
      var seats2 = (data.undone.seatNos && data.undone.seatNos.length) ? data.undone.seatNos : [data.undone.seatNo];
      App.selectedSeatNo = data.undone.seatNo;
      App.rankBumpSeat = seats2[0];
      refreshScoreUi();
      seats2.forEach(function (sn) {
        flashSeat(sn, data.undone.reversedDelta > 0 ? 'score-plus' : 'score-minus');
        spawnScoreFloat(sn, data.undone.reversedDelta);
      });
      toast('已復原 ' + data.undone.name + ' 的加扣分');
      refreshClassStats();
    });
  }

  function resetAllScores() {
    if (!App.classroom) return;
    var changed = App.classroom.students.filter(function (s) {
      return Number(s.score) !== 0;
    }).length;
    var groupChanged = Object.keys((classGroups().scores) || {}).some(function (k) {
      return Number(classGroups().scores[k]) !== 0;
    });
    if (!changed && !groupChanged) {
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
    if (!canEdit()) {
      toast('檢視模式沒有教師功能');
      return;
    }
    // 立刻切畫面；不要等雲端 pull／也不要被 App.busy 擋住
    showTeacherView();
    switchTeacherTab(App.pendingTeacherTab || App.teacherTab || 'roster');
    App.pendingTeacherTab = null;

    function paintTeacherLocal() {
      return api('listRecords', []).then(function (data) {
        noteScoreRoll(data);
        App.dbRows = data.rows || [];
        App.dbFilter = (App.classroom && App.classroom.className) || '__all__';
        fillDatabaseFilter(data.classNames || App.classNames || []);
        if (els.dbClassFilter) els.dbClassFilter.value = App.dbFilter;
        if (!App.viewDate && App.activeDate) App.viewDate = App.activeDate;
        renderDatabaseTable(App.dbRows);
        refreshTeacherExtras();
      }).catch(function () {
        refreshTeacherExtras();
      });
    }

    paintTeacherLocal();

    if (typeof SeatDB !== 'undefined' && SeatDB.pullIfNewer && !App.dirty) {
      SeatDB.pullIfNewer(App.classroom && App.classroom.className).then(function (data) {
        if (!(data && data.changed)) return;
        applyPayload(data, true);
        if (App.appView === 'teacher') paintTeacherLocal();
      }).catch(function () {});
    }
  }

  function teacherTargetClass() {
    var filter = els.dbClassFilter ? els.dbClassFilter.value : '';
    if (filter && filter !== '__all__') return filter;
    return (App.classroom && App.classroom.className) || '';
  }

  function normalizeTeacherTab(tab) {
    var next = tab || 'roster';
    if (next === 'daily' || next === 'summary' || next === 'stats') {
      App.gradesSub = next;
      return 'grades';
    }
    if (next === 'exam' || next === 'homework') return 'grades';
    return next;
  }

  function setGradesSub(sub, quiet) {
    var next = sub === 'daily' || sub === 'stats' ? sub : 'summary';
    App.gradesSub = next;
    document.querySelectorAll('[data-grades-sub]').forEach(function (btn) {
      btn.classList.toggle('tab-on', btn.getAttribute('data-grades-sub') === next);
    });
    document.querySelectorAll('[data-grades-action]').forEach(function (btn) {
      btn.hidden = App.teacherTab !== 'grades' || btn.getAttribute('data-grades-action') !== next;
    });
    var daily = document.getElementById('tabDaily');
    var summary = document.getElementById('tabSummary');
    var stats = document.getElementById('tabStats');
    if (daily) daily.hidden = App.teacherTab !== 'grades' || next !== 'daily';
    if (summary) summary.hidden = App.teacherTab !== 'grades' || next !== 'summary';
    if (stats) stats.hidden = App.teacherTab !== 'grades' || next !== 'stats';
    if (!quiet && App.teacherTab === 'grades') {
      if (next === 'stats' && statsNeedsSchool()) ensureSchoolStats();
      if (next === 'daily' || next === 'summary' || next === 'stats') refreshTeacherExtras();
    }
  }

  function switchTeacherTab(tab) {
    var next = normalizeTeacherTab(tab);
    var changed = App.teacherTab !== next;
    App.teacherTab = next;
    document.querySelectorAll('[data-teacher-tab]').forEach(function (btn) {
      btn.classList.toggle('tab-on', btn.getAttribute('data-teacher-tab') === App.teacherTab);
    });
    var roster = document.getElementById('tabRoster');
    var timetable = document.getElementById('tabTimetable');
    var journal = document.getElementById('tabJournal');
    var missing = document.getElementById('tabMissing');
    var settings = document.getElementById('tabSettings');
    var gradesSubnav = document.getElementById('gradesSubnav');
    if (roster) roster.hidden = App.teacherTab !== 'roster';
    if (timetable) timetable.hidden = App.teacherTab !== 'timetable';
    if (journal) journal.hidden = App.teacherTab !== 'journal';
    if (missing) missing.hidden = App.teacherTab !== 'missing';
    if (settings) settings.hidden = App.teacherTab !== 'settings';
    if (gradesSubnav) gradesSubnav.hidden = App.teacherTab !== 'grades';
    setGradesSub(App.gradesSub || 'summary', true);
    if (changed && App.teacherTab === 'grades' && App.gradesSub === 'stats' && App.sheetModel) {
      renderStatsDashboard(App.sheetModel);
    }
    document.querySelectorAll('.teacher-tab-only').forEach(function (btn) {
      var forTab = btn.getAttribute('data-for-tab');
      var action = btn.getAttribute('data-grades-action');
      if (forTab === 'grades') {
        btn.hidden = App.teacherTab !== 'grades' || (action && action !== App.gradesSub);
      } else {
        btn.hidden = forTab !== App.teacherTab;
      }
    });
    var saveBtn = document.getElementById('btnDatabaseSave');
    if (saveBtn) saveBtn.hidden = App.teacherTab !== 'roster' || !viewingLiveScores();
    var footer = document.querySelector('.teacher-footer');
    if (footer) footer.hidden = App.teacherTab !== 'roster' || !viewingLiveScores();
    if (els.dbClassFilter && els.dbClassFilter.parentElement) {
      els.dbClassFilter.parentElement.hidden = App.teacherTab === 'settings' || App.teacherTab === 'timetable';
    }
    document.querySelectorAll('.teacher-date-only').forEach(function (el) {
      el.hidden = App.teacherTab !== 'grades' || App.gradesSub !== 'daily';
    });
    updateScoreDayLabel();
    if (App.teacherTab === 'settings' && changed) openSettings();
    if (App.teacherTab === 'journal') {
      api('getLessonLog', []).then(function (data) {
        if (data && data.lessonLog) {
          App.lessonLog = mergeLessonLogClient_(App.lessonLog, data.lessonLog);
        }
        renderLessonJournal();
      }).catch(function () {
        renderLessonJournal();
      });
    }
    if (App.teacherTab === 'missing') {
      loadHwMissingTab();
    }
    if (App.teacherTab === 'timetable') {
      App.ttFocusKey = '';
      loadTimetable();
      loadScheduleChanges();
      startTimetableClock();
    } else {
      stopTimetableClock();
    }
    if (App.teacherTab === 'grades') {
      if (App.gradesSub === 'stats' && statsNeedsSchool()) ensureSchoolStats();
      refreshTeacherExtras();
    }
  }

  function normalizeDisplaySeat_(seat) {
    var s = String(seat == null ? '' : seat).trim();
    if (/^\d+$/.test(s)) return s.padStart(2, '0');
    return s;
  }

  function parseMissingSeatsText(text) {
    return String(text || '').split(/[,，\s]+/).map(normalizeDisplaySeat_).filter(Boolean);
  }

  function activeHwMissingItems(className) {
    className = className || (App.classroom && App.classroom.className) || '';
    return ((App.hwMissing && App.hwMissing[className]) || []).filter(function (item) {
      return item && !item.deleted && (item.seats || []).length;
    });
  }

  function hwMissingSeatSet(className) {
    var set = {};
    activeHwMissingItems(className).forEach(function (item) {
      (item.seats || []).forEach(function (seat) {
        set[normalizeDisplaySeat_(seat)] = true;
        set[String(Number(seat) || seat)] = true;
      });
    });
    return set;
  }

  function isSeatHwMissing(seatNo) {
    if (!App.classroom) return false;
    var set = hwMissingSeatSet(App.classroom.className);
    var seat = String(seatNo || '');
    return !!(set[normalizeDisplaySeat_(seat)] || set[seat] || set[String(Number(seat) || '')]);
  }

  function syncMissingSeatsTextFromPick() {
    var text = document.getElementById('missingSeatsText');
    if (!text) return;
    var seats = Object.keys(App.missingPick || {}).filter(function (k) { return App.missingPick[k]; })
      .map(normalizeDisplaySeat_).sort(function (a, b) {
        return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0);
      });
    text.value = seats.join(',');
  }

  function loadHwMissingTab() {
    var className = teacherTargetClass();
    api('getHwMissing', [className]).then(function (data) {
      if (data && data.hwMissing) {
        App.hwMissing = mergeHwMissingClient_(App.hwMissing, data.hwMissing);
      }
      renderHwMissingTab();
      renderHwMissingBanner();
    }).catch(function () {
      renderHwMissingTab();
    });
  }

  function renderHwMissingTab() {
    var className = teacherTargetClass();
    renderHwMissingSeatPick();
    var list = document.getElementById('missingList');
    if (!list) return;
    if (!className) {
      list.innerHTML = '<p class="hint">請先在上方選班級。</p>';
      return;
    }
    var items = activeHwMissingItems(className);
    if (!items.length) {
      list.innerHTML = '<p class="hint">這班還沒有缺交名單。點座號或輸入座號後按「儲存缺交名單」。</p>';
      return;
    }
    var roster = studentsForMissingClass_(className);
    list.innerHTML = items.map(function (item) {
      var selected = {};
      (item.seats || []).forEach(function (seat) {
        selected[normalizeDisplaySeat_(seat)] = true;
      });
      var seatHtml = roster.length
        ? roster.map(function (s) {
            var seat = normalizeDisplaySeat_(s.seatNo);
            var on = selected[seat] ? ' tab-on' : '';
            return '<button type="button" class="tool missing-seat-btn' + on +
              '" data-missing-edit-seat="' + escapeHtml(seat) +
              '" data-missing-edit-id="' + escapeHtml(item.id) +
              '" data-missing-edit-class="' + escapeHtml(className) +
              '" title="' + escapeHtml(s.name || '') + '">' + escapeHtml(seat) + '</button>';
          }).join('')
        : '<span class="missing-seats">缺交座號：' + escapeHtml((item.seats || []).join('、')) +
          '</span><p class="hint">這班名單未載入，請先到上課模式選此班，或上方新建時用輸入框改。</p>';
      return '<div class="missing-item" data-missing-item="' + escapeHtml(item.id) + '">' +
        '<div class="missing-item-head">' +
          '<strong>' + escapeHtml(item.title || '缺交作業') + '</strong>' +
          '<button type="button" class="tool danger" data-missing-del="' + escapeHtml(item.id) +
            '" data-missing-class="' + escapeHtml(className) + '">刪除</button>' +
        '</div>' +
        (item.note ? '<span class="missing-note">' + escapeHtml(item.note) + '</span>' : '') +
        '<p class="hint missing-edit-hint">點座號即可增減缺交（會立刻儲存）</p>' +
        '<div class="missing-seat-pick missing-item-seats" role="group" aria-label="' +
          escapeHtml((item.title || '缺交') + ' 座號') + '">' + seatHtml + '</div>' +
        '</div>';
    }).join('');
  }

  function studentsForMissingClass_(className) {
    className = String(className || '').trim();
    if (!className) return [];
    if (App.classroom && App.classroom.className === className && (App.classroom.students || []).length) {
      return (App.classroom.students || []).slice().sort(seatOrder);
    }
    var rows = [];
    (App.dbRows || []).forEach(function (row) {
      if (String(row.className) === String(className) && row.seatNo) rows.push(row);
    });
    if (rows.length) {
      return rows.sort(function (a, b) {
        return (parseInt(a.seatNo, 10) || 0) - (parseInt(b.seatNo, 10) || 0);
      }).map(function (row) {
        return { seatNo: row.seatNo, name: row.name || '' };
      });
    }
    return [];
  }

  function renderHwMissingSeatPick() {
    var wrap = document.getElementById('missingSeatPick');
    if (!wrap) return;
    var className = teacherTargetClass();
    if (!className) {
      wrap.innerHTML = '<p class="hint">請先選班級。</p>';
      return;
    }
    var students = studentsForMissingClass_(className);
    if (!students.length) {
      wrap.innerHTML = '<p class="hint">這班還沒有名單，也可直接在上方輸入座號。</p>';
      return;
    }
    wrap.innerHTML = students.map(function (s) {
      var seat = normalizeDisplaySeat_(s.seatNo);
      var on = App.missingPick[seat] ? ' tab-on' : '';
      return '<button type="button" class="tool missing-seat-btn' + on + '" data-missing-seat="' +
        escapeHtml(seat) + '" title="' + escapeHtml(s.name || '') + '">' + escapeHtml(seat) + '</button>';
    }).join('');
  }

  function findHwMissingItem_(className, id) {
    return ((App.hwMissing && App.hwMissing[className]) || []).filter(function (item) {
      return item && item.id === id && !item.deleted;
    })[0] || null;
  }

  function toggleHwMissingItemSeat(className, itemId, seat) {
    className = String(className || '').trim();
    itemId = String(itemId || '').trim();
    seat = normalizeDisplaySeat_(seat);
    if (!className || !itemId || !seat) return;
    if (App.missingSeatSaving) {
      toast('正在儲存，請稍候');
      return;
    }
    var item = findHwMissingItem_(className, itemId);
    if (!item) {
      toast('找不到這筆缺交名單');
      return;
    }
    var seats = (item.seats || []).map(normalizeDisplaySeat_).filter(Boolean);
    var has = seats.indexOf(seat) >= 0;
    var next = has
      ? seats.filter(function (s) { return s !== seat; })
      : seats.concat([seat]);
    if (!next.length) {
      toast('至少要留一位缺交座號；若要清空請刪除整筆');
      return;
    }
    App.missingSeatSaving = true;
    var list = document.getElementById('missingList');
    if (list) {
      list.querySelectorAll('[data-missing-edit-seat]').forEach(function (btn) {
        if (btn.getAttribute('data-missing-edit-id') === itemId) btn.disabled = true;
      });
    }
    api('saveHwMissing', [{
      id: item.id,
      className: className,
      title: item.title || '',
      note: item.note || '',
      seats: next,
      createdAt: item.createdAt || ''
    }]).then(function (data) {
      if (data && data.hwMissing) {
        App.hwMissing = mergeHwMissingClient_(App.hwMissing, data.hwMissing);
      }
      renderHwMissingTab();
      renderHwMissingBanner();
      if (App.classroom && App.classroom.className === className) renderBoard();
      if (data && data.synced === false) {
        toast((data.cloudError || '已更新，但還沒同步到雲端') + '。請按「立即同步」', 7000);
      } else {
        toast(has ? ('已移除座號 ' + seat) : ('已加入座號 ' + seat));
      }
    }).catch(function (err) {
      toast(err && err.message ? err.message : '更新失敗');
      renderHwMissingTab();
    }).then(function () {
      App.missingSeatSaving = false;
    });
  }

  function saveHwMissingFromForm() {
    var className = teacherTargetClass();
    if (!className) {
      toast('請先選班級');
      return;
    }
    var titleEl = document.getElementById('missingTitle');
    var noteEl = document.getElementById('missingNote');
    var textEl = document.getElementById('missingSeatsText');
    var seats = Object.keys(App.missingPick || {}).filter(function (k) { return App.missingPick[k]; });
    if (!seats.length && textEl) seats = parseMissingSeatsText(textEl.value);
    api('saveHwMissing', [{
      className: className,
      title: titleEl ? titleEl.value : '',
      note: noteEl ? noteEl.value : '',
      seats: seats
    }]).then(function (data) {
      if (data && data.hwMissing) {
        App.hwMissing = mergeHwMissingClient_(App.hwMissing, data.hwMissing);
      }
      App.missingPick = {};
      if (textEl) textEl.value = '';
      if (noteEl) noteEl.value = '';
      renderHwMissingTab();
      renderHwMissingBanner();
      if (App.classroom && App.classroom.className === className) renderBoard();
      if (data && data.synced === false) {
        toast((data.cloudError || '已暫存，但還沒同步到雲端') + '。請按「立即同步」', 7000);
      } else {
        toast(className + ' 缺交名單已儲存');
      }
    }).catch(function (err) {
      toast(err && err.message ? err.message : '儲存失敗');
    });
  }

  function deleteHwMissingItem(className, id) {
    if (!window.confirm('刪掉這筆缺交名單？上課模式也不再顯示。')) return;
    api('deleteHwMissing', [{ className: className, id: id }]).then(function (data) {
      if (data && data.hwMissing) {
        App.hwMissing = mergeHwMissingClient_(App.hwMissing, data.hwMissing);
      } else if (App.hwMissing && App.hwMissing[className]) {
        App.hwMissing[className] = (App.hwMissing[className] || []).filter(function (item) {
          return item.id !== id;
        });
      }
      renderHwMissingTab();
      renderHwMissingBanner();
      if (App.classroom && App.classroom.className === className) renderBoard();
      if (data && data.synced === false) {
        toast((data.cloudError || '已刪除，但還沒同步到雲端') + '。請按「立即同步」', 7000);
      } else {
        toast('已刪除缺交名單');
      }
    }).catch(function (err) {
      toast(err && err.message ? err.message : '刪除失敗');
    });
  }

  function renderHwMissingBanner() {
    var el = document.getElementById('hwMissingBanner');
    if (!el) return;
    if (!App.classroom || App.appView === 'teacher') {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    var items = activeHwMissingItems(App.classroom.className);
    if (!items.length) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    el.innerHTML = '<strong>缺交作業</strong>' + items.map(function (item) {
      return '<span class="hw-missing-line">' +
        escapeHtml(item.title || '缺交') + '：' +
        escapeHtml((item.seats || []).join('、')) +
        '</span>';
    }).join('');
  }

  function lessonLogClassNames() {
    var names = (App.classNames || []).filter(function (name) {
      return name && name !== '範例班';
    });
    return names.length ? names : (App.classNames || []).slice();
  }

  function lessonPackFor(className) {
    var log = App.lessonLog || {};
    return log[className] || { current: '', updatedAt: '', entries: [], events: [] };
  }

  function lessonEventLabel(type) {
    return type === 'lab' ? '實驗' : '考試';
  }

  function activeEventsForClass(className) {
    return ((lessonPackFor(className).events) || []).filter(function (ev) {
      return ev && !ev.deleted && ev.date && ev.period;
    });
  }

  function allActiveLessonEvents() {
    var out = [];
    Object.keys(App.lessonLog || {}).forEach(function (cn) {
      activeEventsForClass(cn).forEach(function (ev) {
        out.push(ev);
      });
    });
    return out;
  }

  function lessonEventsForWeek(weekStart, model) {
    var map = {};
    var dates = {};
    var i;
    for (i = 0; i < 5; i++) {
      dates[addDaysToKey(weekStart, i)] = i;
    }
    allActiveLessonEvents().forEach(function (ev) {
      var day = dates[ev.date];
      if (day == null) return;
      var ri = model && model.rows ? findPeriodRowIndex(model.rows, ev.period) : -1;
      if (ri < 0) return;
      var key = day + ':' + ri;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }

  function eventTagsHtml(events) {
    if (!events || !events.length) return '';
    return '<div class="tt-event-tags">' + events.map(function (ev) {
      var kind = ev.type === 'lab' ? 'lab' : 'exam';
      var kindLabel = kind === 'lab' ? '實驗' : '考試';
      var done = !!ev.done;
      var tip = escapeHtml(ev.className + ' ' + kindLabel + (done ? '（已完成）' : '') + (ev.note ? '｜' + ev.note : ''));
      return '<span class="tt-event-tag ' + kind + (done ? ' done' : '') + '" title="' + tip + '">' +
        '<strong>' + (done ? '已完成·' : '') + kindLabel + '</strong>' +
        '<span>' + escapeHtml(ev.className) + (ev.note ? '·' + escapeHtml(ev.note) : '') + '</span></span>';
    }).join('') + '</div>';
  }

  function eventCellKindClass(events) {
    if (!events || !events.length) return '';
    var hasExam = false;
    var hasLab = false;
    var pending = false;
    events.forEach(function (ev) {
      if (!ev) return;
      if (!ev.done) pending = true;
      if (ev.type === 'lab') hasLab = true;
      else hasExam = true;
    });
    if (!pending) return 'tt-has-event tt-has-event-done-only';
    if (hasExam && hasLab) return 'tt-has-event tt-has-event-both';
    if (hasLab) return 'tt-has-event tt-has-event-lab';
    return 'tt-has-event tt-has-event-exam';
  }

  function fillJournalEventForm(className) {
    var dateEl = document.getElementById('journalEventDate');
    var periodEl = document.getElementById('journalEventPeriod');
    if (dateEl && document.activeElement !== dateEl && !dateEl.value) {
      dateEl.value = formatDateKey(new Date());
    }
    if (periodEl) {
      var periods = [];
      var sheet = App.timetableData && App.timetableData.sheets &&
        App.timetableData.sheets[App.timetableSheet || 0];
      if (sheet) {
        var model = parseTimetableSheet(sheet.values);
        ((model && model.rows) || []).forEach(function (row) {
          if (row.isBreak) return;
          var label = String(row.period || '').trim();
          if (label && periods.indexOf(label) < 0) periods.push(label);
        });
      }
      if (!periods.length) periods = ['1', '2', '3', '4', '5', '6', '7', '8'];
      var prev = periodEl.value;
      periodEl.innerHTML = periods.map(function (p) {
        return '<option value="' + escapeHtml(p) + '">' + escapeHtml(periodLabel({ period: p })) + '</option>';
      }).join('');
      if (prev && periods.indexOf(prev) >= 0) periodEl.value = prev;
    }
  }

  function renderJournalEvents(className) {
    var body = document.getElementById('journalEventBody');
    if (!body) return;
    if (!className) {
      body.innerHTML = '<tr><td colspan="6">請先選班級。</td></tr>';
      return;
    }
    var events = activeEventsForClass(className).slice().sort(function (a, b) {
      var da = a.done ? 1 : 0;
      var db = b.done ? 1 : 0;
      if (da !== db) return da - db;
      return String(a.date).localeCompare(String(b.date)) || String(a.period).localeCompare(String(b.period));
    });
    if (!events.length) {
      body.innerHTML = '<tr><td colspan="6">還沒有考試／實驗時間。填好後按「加入考試／實驗」。</td></tr>';
      return;
    }
    var today = formatDateKey(new Date());
    body.innerHTML = events.map(function (item) {
      var past = (item.done || item.date < today) ? ' style="opacity:.7"' : '';
      var status = item.done ? '已完成' : '未完成';
      var toggleLabel = item.done ? '改回未完成' : '標為已完成';
      return '<tr' + past + '>' +
        '<td>' + escapeHtml(lessonEventLabel(item.type)) + '</td>' +
        '<td>' + escapeHtml(formatZhDate(item.date)) + '</td>' +
        '<td>' + escapeHtml(periodLabel({ period: item.period })) + '</td>' +
        '<td>' + escapeHtml(item.note || '—') + '</td>' +
        '<td>' + escapeHtml(status) + '</td>' +
        '<td><div class="journal-event-actions">' +
        '<button type="button" class="tool" data-journal-event-done="' + escapeHtml(item.id) +
          '" data-journal-event-class="' + escapeHtml(className) + '">' + escapeHtml(toggleLabel) + '</button>' +
        '<button type="button" class="tool danger" data-journal-event-del="' + escapeHtml(item.id) +
          '" data-journal-event-class="' + escapeHtml(className) + '">刪</button>' +
        '</div></td>' +
        '</tr>';
    }).join('');
  }

  function toggleLessonEventDone(className, id) {
    className = String(className || '').trim();
    id = String(id || '').trim();
    if (!className || !id) return;
    var item = null;
    activeEventsForClass(className).forEach(function (ev) {
      if (ev && String(ev.id) === id) item = ev;
    });
    if (!item) {
      toast('找不到這筆考試／實驗');
      return;
    }
    api('saveLessonEvent', [{
      id: item.id,
      className: className,
      type: item.type,
      date: item.date,
      period: item.period,
      note: item.note || '',
      done: !item.done,
      createdAt: item.createdAt || ''
    }]).then(function (data) {
      App.lessonLog = mergeLessonLogClient_(App.lessonLog, data.lessonLog || {});
      renderLessonJournal();
      if (App.teacherTab === 'timetable') renderTimetable();
      if (data && data.synced === false) {
        toast((data.cloudError || '已暫存，但還沒同步到雲端') + '。請按「立即同步」', 7000);
      } else {
        toast((data.item && data.item.done) ? '已標為完成' : '已改回未完成');
      }
    }).catch(function (err) {
      toast(err && err.message ? err.message : '更新失敗');
    });
  }

  function saveLessonEventFromForm() {
    var className = (els.dbClassFilter && els.dbClassFilter.value !== '__all__')
      ? els.dbClassFilter.value
      : teacherTargetClass();
    if (!className) {
      toast('請先選班級');
      return;
    }
    var typeEl = document.getElementById('journalEventType');
    var dateEl = document.getElementById('journalEventDate');
    var periodEl = document.getElementById('journalEventPeriod');
    var noteEl = document.getElementById('journalEventNote');
    api('saveLessonEvent', [{
      className: className,
      type: typeEl ? typeEl.value : 'exam',
      date: dateEl ? dateEl.value : '',
      period: periodEl ? periodEl.value : '',
      note: noteEl ? noteEl.value : ''
    }]).then(function (data) {
      App.lessonLog = mergeLessonLogClient_(App.lessonLog, data.lessonLog || {});
      if (noteEl) noteEl.value = '';
      renderLessonJournal();
      if (App.teacherTab === 'timetable') renderTimetable();
      if (data && data.synced === false) {
        toast((data.cloudError || '已暫存，但還沒同步到雲端') + '。請按「立即同步」', 7000);
      } else {
        toast(className + ' 已加入' + lessonEventLabel((data.item && data.item.type) || 'exam') + '時間');
      }
    }).catch(function (err) {
      toast(err && err.message ? err.message : '儲存失敗');
    });
  }

  function deleteLessonEvent(className, id) {
    if (!window.confirm('刪掉這筆考試／實驗時間？課表上的標記也會一起消失。')) return;
    api('deleteLessonEvent', [{ className: className, id: id }]).then(function (data) {
      App.lessonLog = mergeLessonLogClient_(App.lessonLog, data.lessonLog || {});
      renderLessonJournal();
      if (App.teacherTab === 'timetable') renderTimetable();
      if (data && data.synced === false) {
        toast((data.cloudError || '已刪除，但還沒同步到雲端') + '。請按「立即同步」', 7000);
      } else {
        toast('已刪除');
      }
    }).catch(function (err) {
      toast(err && err.message ? err.message : '刪除失敗');
    });
  }

  function latestLessonEntry(pack) {
    var entries = ((pack && pack.entries) || []).slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || '')) ||
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    return entries[0] || null;
  }

  function fillJournalForm(className) {
    var progress = document.getElementById('journalProgress');
    var dateEl = document.getElementById('journalDate');
    var note = document.getElementById('journalNote');
    var title = document.getElementById('journalFormTitle');
    var latestHint = document.getElementById('journalLatestHint');
    var pack = lessonPackFor(className);
    var latest = latestLessonEntry(pack);
    var progressText = (latest && latest.progress) || pack.current || '';
    var dateText = (latest && latest.date) || formatDateKey(new Date());
    var noteText = (latest && latest.note) || '';
    if (progress && document.activeElement !== progress) progress.value = progressText;
    if (dateEl && document.activeElement !== dateEl) dateEl.value = dateText;
    if (note && document.activeElement !== note) note.value = noteText;
    if (title) title.textContent = className ? className + ' 最近進度' : '本班進度';
    if (latestHint) {
      if (latest) {
        latestHint.textContent = '目前顯示最近一筆：' + formatZhDate(latest.date) +
          (latest.note ? '　備註：' + latest.note : '') +
          '。若要記新的一天，請改日期後再按儲存。';
      } else {
        latestHint.textContent = '這班還沒有日誌。填進度後按「儲存進度」。';
      }
    }
  }

  function renderLessonJournal() {
    var overview = document.getElementById('journalOverview');
    var body = document.getElementById('journalBody');
    var names = lessonLogClassNames();
    var filter = els.dbClassFilter ? els.dbClassFilter.value : '__all__';
    var target = filter !== '__all__' ? filter : teacherTargetClass();
    if (overview) {
      if (!names.length) {
        overview.innerHTML = '<p class="hint">還沒有班級。請先到設定與上傳匯入名單。</p>';
      } else {
        overview.innerHTML = names.map(function (cn) {
          var pack = lessonPackFor(cn);
          var latest = latestLessonEntry(pack);
          var current = (latest && latest.progress) || pack.current || '尚未登記';
          var when = latest && latest.date
            ? formatZhDate(latest.date)
            : (pack.updatedAt ? formatTime(pack.updatedAt) : '');
          var noteBit = latest && latest.note ? latest.note : '';
          var events = activeEventsForClass(cn);
          var nextEv = events.filter(function (ev) {
            return !ev.done && ev.date >= formatDateKey(new Date());
          })[0];
          var eventBit = nextEv
            ? (lessonEventLabel(nextEv.type) + ' ' + formatZhDate(nextEv.date) + ' 第' + nextEv.period + '節')
            : '';
          var on = cn === target ? ' tab-on' : '';
          return '<button type="button" class="journal-card' + on + '" data-journal-class="' + escapeHtml(cn) + '">' +
            '<span>' + escapeHtml(cn) + '</span>' +
            '<strong>' + escapeHtml(current) + '</strong>' +
            (when ? '<em>' + escapeHtml(when) + '</em>' : '') +
            (noteBit ? '<small>' + escapeHtml(noteBit) + '</small>' : '') +
            (eventBit ? '<small class="journal-event-hint">' + escapeHtml(eventBit) + '</small>' : '') +
            '</button>';
        }).join('');
        overview.querySelectorAll('[data-journal-class]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var cn = btn.getAttribute('data-journal-class');
            if (els.dbClassFilter) {
              els.dbClassFilter.value = cn;
              App.dbFilter = cn;
            }
            renderLessonJournal();
          });
        });
      }
    }
    fillJournalForm(target);
    fillJournalEventForm(target);
    renderJournalEvents(target);
    if (!body) return;
    if (!target) {
      body.innerHTML = '<tr><td colspan="4">請先選班級。</td></tr>';
      return;
    }
    var entries = (lessonPackFor(target).entries || []).slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || '')) ||
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    if (!entries.length) {
      body.innerHTML = '<tr><td colspan="4">這班還沒有日誌。填目前進度後按「儲存進度」。</td></tr>';
      return;
    }
    body.innerHTML = entries.map(function (item, index) {
      var latestMark = index === 0 ? ' class="journal-latest-row"' : '';
      return '<tr' + latestMark + '>' +
        '<td>' + escapeHtml(formatZhDate(item.date)) + (index === 0 ? '（最近）' : '') + '</td>' +
        '<td>' + escapeHtml(item.progress) + '</td>' +
        '<td>' + escapeHtml(item.note || '—') + '</td>' +
        '<td><button type="button" class="tool danger" data-journal-del="' + escapeHtml(item.id) + '">刪</button></td>' +
        '</tr>';
    }).join('');
    body.querySelectorAll('[data-journal-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        requireTeacher(function () {
          deleteLessonEntry(target, btn.getAttribute('data-journal-del'));
        });
      });
    });
  }

  function saveLessonJournal() {
    var className = (els.dbClassFilter && els.dbClassFilter.value !== '__all__')
      ? els.dbClassFilter.value
      : teacherTargetClass();
    if (!className) {
      toast('請先選班級');
      return;
    }
    var progressEl = document.getElementById('journalProgress');
    var dateEl = document.getElementById('journalDate');
    var noteEl = document.getElementById('journalNote');
    api('saveLessonProgress', [{
      className: className,
      progress: progressEl ? progressEl.value : '',
      date: dateEl ? dateEl.value : '',
      note: noteEl ? noteEl.value : ''
    }]).then(function (data) {
      App.lessonLog = mergeLessonLogClient_(App.lessonLog, data.lessonLog || {});
      if (noteEl) noteEl.value = '';
      renderLessonJournal();
      if (data && data.synced === false) {
        toast((data.cloudError || '進度已暫存，但還沒同步到雲端') + '。請按「立即同步」', 7000);
      } else {
        toast(className + ' 已記下進度並同步雲端');
      }
    }).catch(function (err) {
      toast(err && err.message ? err.message : '儲存失敗');
    });
  }

  function deleteLessonEntry(className, id) {
    if (!window.confirm('刪掉這筆教學日誌？目前進度文字不會自動改。')) return;
    api('deleteLessonEntry', [{ className: className, id: id }]).then(function (data) {
      App.lessonLog = data.lessonLog || App.lessonLog;
      renderLessonJournal();
      if (data && data.synced === false) {
        toast((data.cloudError || '已刪除，但還沒同步到雲端') + '。請按「立即同步」', 7000);
      } else {
        toast('已刪除這筆日誌');
      }
    }).catch(function (err) {
      toast(err && err.message ? err.message : '刪除失敗');
    });
  }

  function refreshTeacherExtras() {
    var className = teacherTargetClass();
    if (!className) return;
    if (gradeSaveTimer && App.gradebookClass === className) saveGradebookFromTable(false);
    App.gradebookReady = false;
    clearTimeout(gradeSaveTimer);
    gradeSaveTimer = null;
    Promise.all([
      api('listDaily', [className]),
      api('getGradebook', [className])
    ]).then(function (results) {
      if (teacherTargetClass() !== className) return;
      var dailyData = results[0];
      var bookData = results[1];
      noteScoreRoll(dailyData);
      applyGradebook(bookData);
      renderDailyPanel(dailyData);
      renderDatabaseTable(App.dbRows || []);
    }).catch(function () {});
  }

  var TT_DAYS = ['週一', '週二', '週三', '週四', '週五'];
  var TT_CLASS_COLORS = ['#dbeaf2', '#dcecdc', '#f3e3c6', '#ead8f0', '#f6d9d4', '#e8e4d4'];

  function mondayKeyOf(date) {
    var d = date instanceof Date ? new Date(date.getTime()) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    var day = d.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + diff);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function shiftMondayKey(weekStart, weeks) {
    var parts = String(weekStart || '').split('-').map(Number);
    var d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 12, 0, 0);
    if (isNaN(d.getTime())) d = new Date();
    d.setDate(d.getDate() + (Number(weeks) || 0) * 7);
    return mondayKeyOf(d);
  }

  function formatWeekLabel(weekStart) {
    var parts = String(weekStart || '').split('-');
    if (parts.length !== 3) return weekStart || '';
    var mon = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    var fri = new Date(mon.getTime());
    fri.setDate(fri.getDate() + 4);
    function short(d) {
      return (d.getMonth() + 1) + '/' + d.getDate();
    }
    var thisMon = mondayKeyOf(new Date());
    var tag = weekStart === thisMon ? '（本週）' : (weekStart === shiftMondayKey(thisMon, 1) ? '（下週）' : '');
    return short(mon) + '～' + short(fri) + tag;
  }

  function periodKey(text) {
    return String(text || '').replace(/第|節|\s/g, '').trim();
  }

  function findPeriodRowIndex(rows, period) {
    var target = periodKey(period);
    if (!target) return -1;
    var i;
    for (i = 0; i < (rows || []).length; i++) {
      if (periodKey(rows[i].period) === target) return i;
      if (String(rows[i].period || '').trim() === String(period || '').trim()) return i;
    }
    return -1;
  }

  function scheduleChangesForWeek(weekStart) {
    var key = weekStart || App.scheduleWeek || mondayKeyOf(new Date());
    return (App.scheduleChanges || []).filter(function (item) {
      if (!item || item.deleted) return false;
      var fromWeek = item.weekStart || '';
      var toWeek = item.toWeekStart || item.weekStart || '';
      return fromWeek === key || toWeek === key;
    });
  }

  function applyScheduleChangesToModel(model, weekStart) {
    if (!model || model.raw || !model.rows) {
      return { model: model, marks: {} };
    }
    var rows = model.rows.map(function (row) {
      return {
        period: row.period,
        time: row.time,
        start: row.start,
        end: row.end,
        isBreak: row.isBreak,
        cells: (row.cells || []).slice()
      };
    });
    var marks = {};
    var key = weekStart || mondayKeyOf(new Date());
    scheduleChangesForWeek(key).forEach(function (ch) {
      var fromWeek = ch.weekStart || '';
      var toWeek = ch.toWeekStart || ch.weekStart || '';
      var sameWeek = fromWeek === toWeek;
      var fromRi = findPeriodRowIndex(rows, ch.fromPeriod);
      var toRi = findPeriodRowIndex(rows, ch.toPeriod);
      var fd = Number(ch.fromDay);
      var td = Number(ch.toDay);
      if (!(fd >= 0 && fd <= 4 && td >= 0 && td <= 4)) return;

      if (sameWeek && fromWeek === key) {
        if (fromRi < 0 || toRi < 0) return;
        var fromText = rows[fromRi].cells[fd] || '';
        var toText = rows[toRi].cells[td] || '';
        var fromCls = matchClassName(fromText);
        var movedText = fromText;
        if (ch.className && fromCls && fromCls !== ch.className) movedText = ch.className;
        else if (!fromText && ch.className) movedText = ch.className;
        rows[fromRi].cells[fd] = toText;
        rows[toRi].cells[td] = movedText || ch.className || '';
        marks[fd + ':' + fromRi] = 'from';
        marks[td + ':' + toRi] = 'to';
        return;
      }

      if (fromWeek === key && fromRi >= 0) {
        var src = rows[fromRi].cells[fd] || '';
        var srcCls = matchClassName(src);
        if (!src || !ch.className || srcCls === ch.className || src.indexOf(ch.className) >= 0) {
          rows[fromRi].cells[fd] = '';
        }
        marks[fd + ':' + fromRi] = 'from';
      }
      if (toWeek === key && toRi >= 0) {
        rows[toRi].cells[td] = ch.className || rows[toRi].cells[td] || '';
        marks[td + ':' + toRi] = 'to';
      }
    });
    return {
      model: { days: model.days, rows: rows },
      marks: marks
    };
  }

  /** 115 學年度相關國定假日／補假（含週末日供對照；課表只標週一～五）。 */
  var NATIONAL_HOLIDAYS = [
    { date: '2026-09-25', name: '中秋節' },
    { date: '2026-09-28', name: '教師節' },
    { date: '2026-10-09', name: '國慶日補假' },
    { date: '2026-10-10', name: '國慶日' },
    { date: '2026-10-25', name: '光復節' },
    { date: '2026-10-26', name: '光復節補假' },
    { date: '2026-12-25', name: '行憲紀念日' },
    { date: '2027-01-01', name: '開國紀念日' },
    { date: '2027-02-04', name: '小年夜' },
    { date: '2027-02-05', name: '除夕' },
    { date: '2027-02-06', name: '春節' },
    { date: '2027-02-07', name: '春節' },
    { date: '2027-02-08', name: '春節' },
    { date: '2027-02-09', name: '春節補假' },
    { date: '2027-02-10', name: '春節補假' },
    { date: '2027-02-28', name: '和平紀念日' },
    { date: '2027-03-01', name: '和平紀念日補假' },
    { date: '2027-04-03', name: '兒童清明連假' },
    { date: '2027-04-04', name: '兒童節' },
    { date: '2027-04-05', name: '清明節' },
    { date: '2027-04-06', name: '清明補假' },
    { date: '2027-04-30', name: '勞動節補假' },
    { date: '2027-05-01', name: '勞動節' },
    { date: '2027-06-09', name: '端午節' }
  ];

  function dateKeyFromParts(y, m, d) {
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  function addDaysToKey(weekStart, dayOffset) {
    var parts = String(weekStart || '').split('-').map(Number);
    var d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 12, 0, 0);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + (Number(dayOffset) || 0));
    return dateKeyFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function holidaysForWeek(weekStart) {
    var map = {};
    var i;
    for (i = 0; i < 5; i++) {
      var key = addDaysToKey(weekStart, i);
      NATIONAL_HOLIDAYS.forEach(function (h) {
        if (h.date === key) map[i] = h;
      });
    }
    return map;
  }

  function renderHolidayBanner(weekStart, holidayMap) {
    var el = document.getElementById('ttHolidayBanner');
    if (!el) return;
    var items = Object.keys(holidayMap || {}).map(function (day) {
      var h = holidayMap[day];
      return (TT_DAYS[Number(day)] || '') + ' ' + h.name + '（' + h.date.slice(5).replace('-', '/') + '）';
    });
    if (!items.length) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = '本週國定假日／補假：' + items.join('、') + '。假日欄位已標示，課表格子改顯示放假。';
  }

  function termLastWeekKey(now) {
    now = now || new Date();
    var y = now.getFullYear();
    var m = now.getMonth() + 1;
    var end;
    // 上學期（8 月～隔年 2 月）列到 2 月底；下學期（3～7 月）列到 7 月底
    if (m >= 8) end = new Date(y + 1, 2, 0, 12, 0, 0);
    else if (m <= 2) end = new Date(y, 2, 0, 12, 0, 0);
    else end = new Date(y, 7, 0, 12, 0, 0);
    return mondayKeyOf(end);
  }

  function weekSelectOptionsHtml(selected, extraKeys) {
    var thisMon = mondayKeyOf(new Date());
    var lastMon = termLastWeekKey(new Date());
    var keys = {};
    var cursor = shiftMondayKey(thisMon, -2);
    var guard = 0;
    while (cursor <= lastMon && guard < 60) {
      keys[cursor] = true;
      cursor = shiftMondayKey(cursor, 1);
      guard += 1;
    }
    (extraKeys || []).forEach(function (k) {
      if (k) keys[k] = true;
    });
    if (selected) keys[selected] = true;
    return Object.keys(keys).sort().map(function (key) {
      return '<option value="' + escapeHtml(key) + '"' + (key === selected ? ' selected' : '') + '>' +
        escapeHtml(formatWeekLabel(key)) + '</option>';
    }).join('');
  }

  function loadScheduleChanges() {
    if (!App.scheduleWeek) App.scheduleWeek = mondayKeyOf(new Date());
    api('getScheduleChanges', []).then(function (data) {
      if (data && data.scheduleChanges) {
        App.scheduleChanges = mergeScheduleChangesClient_(App.scheduleChanges, data.scheduleChanges);
      }
      if (data && data.weekStart && !App.scheduleWeek) App.scheduleWeek = data.weekStart;
      renderScheduleChangePanel();
      if (App.teacherTab === 'timetable') renderTimetable();
    }).catch(function () {
      renderScheduleChangePanel();
    });
  }

  function fillScheduleChangeFormOptions(model) {
    var classEl = document.getElementById('ttSwapClass');
    var fromPeriod = document.getElementById('ttSwapFromPeriod');
    var toPeriod = document.getElementById('ttSwapToPeriod');
    var weekEl = document.getElementById('ttSwapWeek');
    var fromWeekEl = document.getElementById('ttSwapFromWeek');
    var toWeekEl = document.getElementById('ttSwapToWeek');
    var thisMon = mondayKeyOf(new Date());
    var viewWeek = App.scheduleWeek || thisMon;
    if (weekEl) weekEl.innerHTML = weekSelectOptionsHtml(viewWeek);
    if (fromWeekEl) {
      var prevFrom = fromWeekEl.value || viewWeek;
      fromWeekEl.innerHTML = weekSelectOptionsHtml(prevFrom, [viewWeek]);
    }
    if (toWeekEl) {
      var prevTo = toWeekEl.value || viewWeek;
      toWeekEl.innerHTML = weekSelectOptionsHtml(prevTo, [viewWeek]);
    }
    if (classEl) {
      var names = (App.classNames || []).filter(function (n) { return n && n !== '範例班'; });
      if (!names.length) names = App.classNames || [];
      var prevClass = classEl.value;
      classEl.innerHTML = names.map(function (name) {
        return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
      }).join('');
      if (prevClass && names.indexOf(prevClass) >= 0) classEl.value = prevClass;
    }
    var periods = [];
    ((model && model.rows) || []).forEach(function (row) {
      if (row.isBreak) return;
      var label = String(row.period || '').trim();
      if (!label || periods.indexOf(label) >= 0) return;
      periods.push(label);
    });
    if (!periods.length) {
      periods = ['1', '2', '3', '4', '5', '6', '7'];
    }
    function fillPeriod(sel) {
      if (!sel) return;
      var prev = sel.value;
      sel.innerHTML = periods.map(function (p) {
        return '<option value="' + escapeHtml(p) + '">' + escapeHtml(periodLabel({ period: p })) + '</option>';
      }).join('');
      if (prev && periods.indexOf(prev) >= 0) sel.value = prev;
    }
    fillPeriod(fromPeriod);
    fillPeriod(toPeriod);
  }

  function renderScheduleChangePanel() {
    var list = document.getElementById('ttSwapList');
    if (!list) return;
    var week = App.scheduleWeek || mondayKeyOf(new Date());
    var items = scheduleChangesForWeek(week);
    if (!items.length) {
      list.innerHTML = '<p class="tt-swap-empty">這一週還沒有相關調課。可同週對調，也可跨週：原週某一節 → 另一週某一節。</p>';
      return;
    }
    list.innerHTML = items.map(function (item) {
      var fromWeek = item.weekStart || week;
      var toWeek = item.toWeekStart || item.weekStart || week;
      var from = formatWeekLabel(fromWeek) + ' ' + (TT_DAYS[item.fromDay] || '') + periodLabel({ period: item.fromPeriod });
      var to = formatWeekLabel(toWeek) + ' ' + (TT_DAYS[item.toDay] || '') + periodLabel({ period: item.toPeriod });
      var note = item.note ? '　' + item.note : '';
      var cross = fromWeek !== toWeek ? '（跨週）' : '';
      return '<div class="tt-swap-item">' +
        '<strong>' + escapeHtml(item.className) + escapeHtml(cross) + '</strong>' +
        '<span class="tt-swap-meta">' + escapeHtml(from) + ' → ' + escapeHtml(to) + escapeHtml(note) + '</span>' +
        '<button type="button" class="tool danger" data-tt-swap-del="' + escapeHtml(item.id) + '">刪除</button>' +
        '</div>';
    }).join('');
  }

  function saveScheduleChangeFromForm() {
    var weekEl = document.getElementById('ttSwapWeek');
    var classEl = document.getElementById('ttSwapClass');
    var fromWeekEl = document.getElementById('ttSwapFromWeek');
    var toWeekEl = document.getElementById('ttSwapToWeek');
    var fromDay = document.getElementById('ttSwapFromDay');
    var fromPeriod = document.getElementById('ttSwapFromPeriod');
    var toDay = document.getElementById('ttSwapToDay');
    var toPeriod = document.getElementById('ttSwapToPeriod');
    var noteEl = document.getElementById('ttSwapNote');
    var fromWeek = fromWeekEl ? fromWeekEl.value : mondayKeyOf(new Date());
    var toWeek = toWeekEl ? toWeekEl.value : fromWeek;
    var body = {
      weekStart: fromWeek,
      toWeekStart: toWeek,
      className: classEl ? classEl.value : '',
      fromDay: fromDay ? Number(fromDay.value) : 0,
      fromPeriod: fromPeriod ? fromPeriod.value : '',
      toDay: toDay ? Number(toDay.value) : 0,
      toPeriod: toPeriod ? toPeriod.value : '',
      note: noteEl ? noteEl.value : ''
    };
    api('saveScheduleChange', [body]).then(function (data) {
      if (data && data.scheduleChanges) {
        App.scheduleChanges = data.scheduleChanges;
      }
      App.scheduleWeek = weekEl && weekEl.value ? weekEl.value : fromWeek;
      if (noteEl) noteEl.value = '';
      renderScheduleChangePanel();
      renderTimetable();
      if (data && data.synced === false) {
        toast((data.cloudError || '調課已暫存，但還沒同步到雲端') + '。請按「立即同步」', 7000);
      } else {
        toast(body.className + (fromWeek !== toWeek ? ' 跨週調課' : ' 調課') + '已套用（Google 試算表未改動）');
      }
    }).catch(function (err) {
      toast(err && err.message ? err.message : '儲存調課失敗');
    });
  }

  function deleteScheduleChange(id) {
    if (!window.confirm('刪掉這筆調課提醒？課表顯示會恢復該週原本位置。')) return;
    api('deleteScheduleChange', [{ id: id }]).then(function (data) {
      App.scheduleChanges = (data && data.scheduleChanges) || App.scheduleChanges.filter(function (item) {
        return item.id !== id;
      });
      renderScheduleChangePanel();
      renderTimetable();
      if (data && data.synced === false) {
        toast((data.cloudError || '已刪除，但還沒同步到雲端') + '。請按「立即同步」', 7000);
      } else {
        toast('已刪除調課');
      }
    }).catch(function (err) {
      toast(err && err.message ? err.message : '刪除失敗');
    });
  }

  function fallbackTimetable() {
    return {
      ok: true,
      title: '115學年度課表',
      url: timetableUrl(),
      source: 'local',
      sheets: [{
        name: '課表',
        gid: '871518223',
        values: [
          ['', '', '周一', '週二', '週三', '週四', '週五'],
          ['1', '8:35~9:15', '804', '803', '802', '', ''],
          ['2', '9:20~10:00', '804', '803', '802', '', '802'],
          ['大下課', '10:00~10:20', '', '3樓連廊露台 Terrace on the 3rd floor', '', '', ''],
          ['3', '10:20~11:00', '', '社團(科展)', '', '領域會議', ''],
          ['4', '11:05~11:45', '', '社團(科展)', '', '領域會議', ''],
          ['午休', '', '', '', '', '', ''],
          ['5', '12:50~13:30', '803', '804', '', '', '國中會議'],
          ['6', '13:35~14:15', '803', '804', '', '', '國中會議'],
          ['大下課', '14:15~14:40', '', '3樓連廊露台 Terrace on the 3rd floor', '', '', ''],
          ['7', '14:40~15:20', '802', '', '801', '804', '801'],
          ['8', '15:25~16:05', '', '', '801', '', ''],
          ['9', '16:10~16:50', '', '801', '803', '801', '802'],
          ['角落課程', '17:00~18:30', '801教室', '904教室', '', '804教室', '804教室'],
          ['', '', '九年級', '九年級', '', '八年級', '八年級']
        ]
      }]
    };
  }

  function timetableUrl() {
    return String((window.SEAT_CONFIG && window.SEAT_CONFIG.timetableUrl) ||
      'https://docs.google.com/spreadsheets/d/13VrWBx6hoKpUON_JNxIrynH_gyRV8HnhUt0MMscjkWg/edit').trim();
  }

  function timetableEmbedUrl(bust) {
    var id = String((window.SEAT_CONFIG && window.SEAT_CONFIG.timetableId) ||
      '13VrWBx6hoKpUON_JNxIrynH_gyRV8HnhUt0MMscjkWg').trim();
    var url = 'https://docs.google.com/spreadsheets/d/' + id + '/htmlembed?widget=true&headers=false';
    if (bust) url += '&_=' + Date.now();
    return url;
  }

  function formatTimetableFetchedAt(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function applyTimetablePayload(data, meta) {
    meta = meta || {};
    if (!data || !data.sheets || !data.sheets.length) {
      throw new Error('課表沒有讀到工作表');
    }
    App.timetableData = {
      ok: true,
      title: data.title || '上課課表',
      url: data.url || timetableUrl(),
      source: data.source || meta.source || 'google',
      fetchedAt: data.fetchedAt || new Date().toISOString(),
      sheets: data.sheets.map(function (sheet) {
        return {
          name: String(sheet.name || '課表'),
          gid: String(sheet.gid || ''),
          values: sheet.values || []
        };
      })
    };
    if (App.timetableSheet >= App.timetableData.sheets.length) App.timetableSheet = 0;
    renderTimetable();
    setTimetableStatus(meta.message || '');
  }

  function loadTimetable(force) {
    if (!App.timetableData) {
      App.timetableData = fallbackTimetable();
      renderTimetable();
    }
    if (els.timetableStatus) {
      els.timetableStatus.textContent = force ? '正在重新抓取 Google 課表…' : '正在從 Google 課表載入…';
    }
    if (els.timetableFrame && (force || !els.timetableFrame.getAttribute('src'))) {
      els.timetableFrame.src = timetableEmbedUrl(true);
    }

    var chain;
    if (window.CloudStore && CloudStore.request && cloudConnected()) {
      chain = CloudStore.request('getTimetable', { _: Date.now() });
    } else {
      chain = Promise.reject(new Error('尚未連上雲端，無法讀取最新課表'));
    }

    chain.then(function (data) {
      if (data && data.ok === false) {
        throw new Error(data.error || '讀取課表失敗');
      }
      applyTimetablePayload(data, {
        source: 'google',
        message: '已載入 Google 課表最新內容'
      });
      api('getLessonLog', []).then(function (logData) {
        if (logData && logData.lessonLog) {
          App.lessonLog = mergeLessonLogClient_(App.lessonLog, logData.lessonLog);
          if (App.teacherTab === 'timetable') renderTimetable();
        }
      }).catch(function () {});
    }).catch(function (err) {
      if (!App.timetableData) App.timetableData = fallbackTimetable();
      renderTimetable();
      var msg = err && err.message ? err.message : '讀取課表失敗';
      if (/未知的操作/.test(msg)) {
        msg = '後端還沒更新 getTimetable。請把最新 Code.gs 貼上 Apps Script 並新增部署後再按重新整理。';
      }
      setTimetableStatus('目前先顯示備援課表。' + msg);
      toast(msg, 7000);
    });
  }

  function startTimetableClock() {
    stopTimetableClock();
    App.timetableTimer = setInterval(function () {
      if (App.teacherTab === 'timetable') renderTimetable();
    }, 10000);
  }

  function stopTimetableClock() {
    if (App.timetableTimer) {
      clearInterval(App.timetableTimer);
      App.timetableTimer = null;
    }
  }

  function setTimetableStatus(extra) {
    if (!els.timetableStatus) return;
    var data = App.timetableData || {};
    var when = formatTimetableFetchedAt(data.fetchedAt);
    var source = data.source === 'google' ? 'Google 試算表' : '本機備援';
    var base = '這份是上課課表，不是成績資料庫。來源：' + source +
      (when ? '（' + when + '）' : '') + '。上方會顯示該班最近教學日誌；點班級可去上課。';
    els.timetableStatus.textContent = extra ? (base + ' ' + extra) : base;
  }

  function weekdayIndex(now) {
    var d = (now || new Date()).getDay();
    return d >= 1 && d <= 5 ? d - 1 : -1;
  }

  function minutesNow(now) {
    var d = now || new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function parseClock(text) {
    var m = String(text || '').match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function parseTimeRange(text) {
    var s = String(text || '').replace(/－/g, '-').replace(/—/g, '-').replace(/~/g, '-').replace(/–/g, '-');
    var parts = s.split('-').map(function (p) { return p.trim(); }).filter(Boolean);
    if (parts.length < 2) return null;
    var a = parseClock(parts[0]);
    var b = parseClock(parts[1]);
    if (a == null || b == null) return null;
    return { start: a, end: b };
  }

  function dayColOf(text) {
    var s = String(text || '').replace(/\s/g, '');
    if (/週一|周一|星期一|^一$|^Mon/i.test(s)) return 0;
    if (/週二|周二|星期二|^二$|^Tue/i.test(s)) return 1;
    if (/週三|周三|星期三|^三$|^Wed/i.test(s)) return 2;
    if (/週四|周四|星期四|^四$|^Thu/i.test(s)) return 3;
    if (/週五|周五|星期五|^五$|^Fri/i.test(s)) return 4;
    return -1;
  }

  function looksLikeIndexCol(grid) {
    var hits = 0;
    var i;
    for (i = 0; i < Math.min(grid.length, 10); i++) {
      if (String((grid[i] || [])[0] || '') === String(i + 1)) hits += 1;
    }
    return hits >= 4;
  }

  function isBreakPeriod(label) {
    return /下課|午休|午餐|休息|導師時間/.test(String(label || ''));
  }

  function parseTimetableSheet(values) {
    var grid = (values || []).map(function (row) {
      return (row || []).map(function (cell) { return String(cell == null ? '' : cell).replace(/\r/g, '').trim(); });
    }).filter(function (row) { return row.some(function (cell) { return cell; }); });
    if (looksLikeIndexCol(grid)) {
      grid = grid.map(function (row) { return row.slice(1); });
    }
    var headerAt = -1;
    var dayCols = [];
    grid.forEach(function (row, r) {
      var found = [];
      row.forEach(function (cell, c) {
        var d = dayColOf(cell);
        if (d >= 0) found.push({ d: d, c: c });
      });
      if (found.length >= 3 && headerAt < 0) {
        headerAt = r;
        dayCols = found.sort(function (a, b) { return a.d - b.d; });
      }
    });
    if (headerAt < 0) {
      return { days: TT_DAYS, rows: [], raw: true, values: grid };
    }
    var used = {};
    dayCols.forEach(function (item) { used[item.c] = true; });
    var periodCol = 0;
    var timeCol = 1;
    var header = grid[headerAt] || [];
    header.forEach(function (cell, c) {
      if (used[c]) return;
      if (/節|時間/.test(cell) && /時間/.test(cell)) timeCol = c;
      else if (/節/.test(cell)) periodCol = c;
    });
    if (used[periodCol]) {
      periodCol = 0;
      while (used[periodCol]) periodCol += 1;
    }
    if (timeCol === periodCol || used[timeCol]) {
      timeCol = periodCol + 1;
      while (used[timeCol]) timeCol += 1;
    }
    var rows = [];
    var r;
    for (r = headerAt + 1; r < grid.length; r++) {
      var row = grid[r] || [];
      var period = row[periodCol] || '';
      var time = row[timeCol] || '';
      if (!period && !time && !dayCols.some(function (item) { return row[item.c]; })) continue;
      if (!period && !time && dayCols.every(function (item) {
        return /年級|^$/.test(row[item.c] || '');
      })) continue;
      var range = parseTimeRange(time);
      rows.push({
        period: period || '　',
        time: time,
        start: range ? range.start : null,
        end: range ? range.end : null,
        isBreak: isBreakPeriod(period) || isBreakPeriod(time),
        cells: dayCols.map(function (item) { return row[item.c] || ''; })
      });
    }
    fillMissingTimes(rows);
    return {
      days: dayCols.map(function (item) { return TT_DAYS[item.d]; }),
      rows: rows
    };
  }

  function fillMissingTimes(rows) {
    var i;
    for (i = 0; i < rows.length; i++) {
      if (rows[i].start != null && rows[i].end != null) continue;
      var prevEnd = null;
      var nextStart = null;
      var p;
      var n;
      for (p = i - 1; p >= 0; p--) {
        if (rows[p].end != null) { prevEnd = rows[p].end; break; }
      }
      for (n = i + 1; n < rows.length; n++) {
        if (rows[n].start != null) { nextStart = rows[n].start; break; }
      }
      if (prevEnd == null || nextStart == null || nextStart <= prevEnd) continue;
      rows[i].start = prevEnd;
      rows[i].end = nextStart;
      if (!rows[i].time) rows[i].time = clockFromMins(prevEnd) + '~' + clockFromMins(nextStart);
    }
  }

  function clockFromMins(n) {
    var h = Math.floor(n / 60);
    var m = n % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function remainText(fromMins, toMins) {
    var d = toMins - fromMins;
    if (d <= 0) return '不到 1 分鐘';
    if (d < 60) return d + ' 分鐘';
    var h = Math.floor(d / 60);
    var m = d % 60;
    return h + ' 小時' + (m ? m + ' 分鐘' : '');
  }

  function matchClassName(text) {
    var raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    var names = App.classNames || [];
    if (names.indexOf(raw) >= 0) return raw;
    var stripped = raw.replace(/教室|班$/, '');
    if (names.indexOf(stripped) >= 0) return stripped;
    var m = raw.match(/(\d{3,4})/);
    if (m && names.indexOf(m[1]) >= 0) return m[1];
    if (m && /^\d{3,4}$/.test(stripped)) return stripped;
    return '';
  }

  function classTone(name) {
    var n = parseInt(String(name).replace(/\D/g, ''), 10);
    if (!isFinite(n)) return TT_CLASS_COLORS[0];
    return TT_CLASS_COLORS[n % TT_CLASS_COLORS.length];
  }

  function currentPeriodIndex(model, now) {
    if (!model || !model.rows) return -1;
    var mins = minutesNow(now);
    var i;
    for (i = 0; i < model.rows.length; i++) {
      var row = model.rows[i];
      if (row.start == null || row.end == null) continue;
      if (mins >= row.start && mins < row.end) return i;
    }
    return -1;
  }

  function nextBusyIndex(model, today, afterIndex, nowMins) {
    if (!model || !model.rows) return -1;
    var i;
    for (i = Math.max(0, afterIndex + 1); i < model.rows.length; i++) {
      var row = model.rows[i];
      if (row.start == null) continue;
      if (today >= 0 && !(row.cells[today] || '').trim()) continue;
      if (afterIndex < 0 && (row.start == null || row.start <= nowMins)) continue;
      return i;
    }
    return -1;
  }

  function renderTimetable() {
    var data = App.timetableData || fallbackTimetable();
    var sheets = data.sheets || [];
    if (App.timetableSheet >= sheets.length) App.timetableSheet = 0;
    if (els.timetableOpenLink) {
      els.timetableOpenLink.href = data.url || timetableUrl();
    }
    if (els.timetableFrame && !els.timetableFrame.getAttribute('src')) {
      els.timetableFrame.src = timetableEmbedUrl(true);
    }
    if (els.timetableSheets) {
      els.timetableSheets.hidden = sheets.length < 2;
      els.timetableSheets.innerHTML = sheets.length < 2 ? '' : sheets.map(function (sheet, i) {
        return '<button type="button" class="tool' + (i === App.timetableSheet ? ' tab-on' : '') +
          '" data-tt-sheet="' + i + '">' + escapeHtml(sheet.name || ('工作表' + (i + 1))) + '</button>';
      }).join('');
    }
    var sheet = sheets[App.timetableSheet] || sheets[0];
    var model = parseTimetableSheet(sheet && sheet.values);
    var now = new Date();
    var thisWeek = mondayKeyOf(now);
    if (!App.scheduleWeek) App.scheduleWeek = thisWeek;
    fillScheduleChangeFormOptions(model);
    renderScheduleChangePanel();
    var viewWeek = App.scheduleWeek || thisWeek;
    var holidayLive = holidaysForWeek(thisWeek);
    var holidayView = holidaysForWeek(viewWeek);
    renderHolidayBanner(viewWeek, holidayView);
    var appliedLive = applyScheduleChangesToModel(model, thisWeek);
    var appliedView = applyScheduleChangesToModel(model, viewWeek);
    var liveModel = appliedLive.model || model;
    var viewModel = appliedView.model || model;
    var marks = appliedView.marks || {};
    var eventMarks = lessonEventsForWeek(viewWeek, viewModel);
    var liveEventMarks = lessonEventsForWeek(thisWeek, liveModel);
    var today = weekdayIndex(now);
    var mins = minutesNow(now);
    var todayIsHoliday = today >= 0 && !!holidayLive[today];
    var nowRow = (!todayIsHoliday && today >= 0) ? currentPeriodIndex(liveModel, now) : -1;
    var nextRow = (!todayIsHoliday && today >= 0) ? nextBusyIndex(liveModel, today, nowRow, mins) : -1;
    renderTimetableNow(liveModel, today, nowRow, nextRow, now, holidayLive, liveEventMarks);
    renderTimetableGrid(viewModel, today, nowRow, nextRow, marks, holidayView, eventMarks);
    setTimetableStatus();
    var focusKey = nowRow + ':' + nextRow + ':' + today + ':' + viewWeek;
    if (App.ttFocusKey !== focusKey) {
      App.ttFocusKey = focusKey;
      var mark = els.timetableGrid && (els.timetableGrid.querySelector('.tt-current') || els.timetableGrid.querySelector('.tt-upcoming'));
      if (mark && mark.scrollIntoView) mark.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }

  function periodLabel(row, compact) {
    if (!row) return '';
    if (/^\d+$/.test(row.period)) return compact ? row.period : ('第 ' + row.period + ' 節');
    return row.period;
  }

  function prettyTime(text) {
    return String(text || '').replace(/~/g, '–').replace(/－/g, '–').replace(/—/g, '–');
  }

  function ttClassButton(text) {
    var cls = matchClassName(text);
    if (!cls) return escapeHtml(text);
    return '<button type="button" class="tt-class" data-tt-class="' + escapeHtml(cls) +
      '" style="background:' + classTone(cls) + '">' + escapeHtml(text) + '</button>';
  }

  function slotText(row, today) {
    if (!row || today < 0) return '';
    return String(row.cells[today] || '').trim();
  }

  function renderFocusCard(kind, row, today, now, remainLabel, holidayName, events) {
    var period = row ? periodLabel(row) : (kind === 'now' ? '現在沒有課' : '沒有下一節');
    var time = row && row.time ? prettyTime(row.time) : '';
    var remain = '';
    if (remainLabel === 'end' && row && row.end != null) {
      remain = '還有 ' + remainText(minutesNow(now), row.end) + ' 下課';
    } else if (remainLabel === 'start' && row && row.start != null) {
      remain = '還有 ' + remainText(minutesNow(now), row.start) + ' 開始';
    }
    var title = period + (time ? '　' + time : '') + (remain ? '　' + remain : '');
    var text = holidayName ? '' : slotText(row, today);
    var cls = matchClassName(text);
    var go = cls
      ? '<button type="button" class="tool primary" data-tt-class="' + escapeHtml(cls) + '">去 ' + escapeHtml(cls) + ' 上課</button>'
      : '';
    var body = holidayName
      ? '<span class="tt-focus-empty">放假｜' + escapeHtml(holidayName) + '</span>'
      : (text
        ? (cls ? ttClassButton(text) : '<span class="tt-focus-item">' + escapeHtml(text) + '</span>')
        : '<span class="tt-focus-empty">' + (kind === 'now' ? '這一節沒有排課' : '沒有下一節') + '</span>');
    body += eventTagsHtml(events);
    return '<article class="tt-focus-card tt-focus-' + kind + '">' +
      '<p class="tt-kicker">' + (kind === 'now' ? '現在' : '接下來') + '</p>' +
      '<p class="tt-period">' + escapeHtml(title) + '</p>' +
      '<div class="tt-focus-body">' + body + '</div>' +
      '<div class="tt-focus-action">' + go + '</div>' +
      '</article>';
  }

  function renderTimetableNow(model, today, nowRow, nextRow, now, holidayMap, eventMarks) {
    if (!els.timetableNow) return;
    holidayMap = holidayMap || {};
    eventMarks = eventMarks || {};
    var weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    var clock = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    if (els.timetableClock) els.timetableClock.textContent = weekdays[now.getDay()] + '　' + clock;
    var todayHoliday = today >= 0 && holidayMap[today] ? holidayMap[today].name : '';
    var current = (!todayHoliday && nowRow >= 0) ? model.rows[nowRow] : null;
    var next = (!todayHoliday && nextRow >= 0) ? model.rows[nextRow] : null;
    var nowRemain = current ? 'end' : '';
    var nextRemain = next ? 'start' : '';
    var nowEvents = (today >= 0 && nowRow >= 0) ? (eventMarks[today + ':' + nowRow] || []) : [];
    var nextEvents = (today >= 0 && nextRow >= 0) ? (eventMarks[today + ':' + nextRow] || []) : [];
    var nowCard;
    if (today < 0) {
      nowCard = '<article class="tt-focus-card tt-focus-now">' +
        '<p class="tt-kicker">現在</p><p class="tt-period">週末</p>' +
        '<div class="tt-focus-body"><span class="tt-focus-empty">今天沒有排課</span></div>' +
        '<div class="tt-focus-action"></div></article>';
    } else if (todayHoliday) {
      nowCard = '<article class="tt-focus-card tt-focus-now">' +
        '<p class="tt-kicker">現在</p><p class="tt-period">國定假日</p>' +
        '<div class="tt-focus-body"><span class="tt-focus-empty">放假｜' + escapeHtml(todayHoliday) + '</span></div>' +
        '<div class="tt-focus-action"></div></article>';
    } else if (!current && !next) {
      nowCard = '<article class="tt-focus-card tt-focus-now">' +
        '<p class="tt-kicker">現在</p><p class="tt-period">今天課上完了</p>' +
        '<div class="tt-focus-body"><span class="tt-focus-empty">目前沒有下一節</span></div>' +
        '<div class="tt-focus-action"></div></article>';
    } else if (!current) {
      nowCard = '<article class="tt-focus-card tt-focus-now">' +
        '<p class="tt-kicker">現在</p><p class="tt-period">課間</p>' +
        '<div class="tt-focus-body"><span class="tt-focus-empty">先看接下來</span></div>' +
        '<div class="tt-focus-action"></div></article>';
    } else {
      nowCard = renderFocusCard('now', current, today, now, nowRemain, '', nowEvents);
    }
    var nextCard = todayHoliday
      ? '<article class="tt-focus-card tt-focus-next">' +
        '<p class="tt-kicker">接下來</p><p class="tt-period">放假</p>' +
        '<div class="tt-focus-body"><span class="tt-focus-empty">' + escapeHtml(todayHoliday) + '</span></div>' +
        '<div class="tt-focus-action"></div></article>'
      : renderFocusCard('next', next, today, now, nextRemain, '', nextEvents);
    els.timetableNow.innerHTML = '<div class="tt-focus-grid">' + nowCard + nextCard + '</div>';
  }

  function cellInner(cell, badge, events) {
    var mark = badge ? '<span class="tt-badge' + (badge === '調課' ? ' tt-badge-swap' : '') + '">' + badge + '</span>' : '';
    var body = cell ? (matchClassName(cell) ? ttClassButton(cell) : escapeHtml(cell)) : (badge ? '<span class="tt-focus-empty">空堂</span>' : '');
    return mark + body + eventTagsHtml(events);
  }

  function renderTimetableGrid(model, today, nowRow, nextRow, marks, holidayMap, eventMarks) {
    if (!els.timetableGrid) return;
    marks = marks || {};
    holidayMap = holidayMap || {};
    eventMarks = eventMarks || {};
    if (model.raw) {
      els.timetableGrid.innerHTML = '<div class="tt-table-wrap"><table class="tt-table">' +
        (model.values || []).map(function (row) {
          return '<tr>' + row.map(function (cell) {
            return '<td>' + (matchClassName(cell) ? ttClassButton(cell) : escapeHtml(cell)) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</table></div>';
      return;
    }
    var viewingThisWeek = (App.scheduleWeek || mondayKeyOf(new Date())) === mondayKeyOf(new Date());
    var colgroup = '<colgroup><col class="tt-col-period"><col class="tt-col-time">' +
      model.days.map(function () { return '<col class="tt-col-day">'; }).join('') + '</colgroup>';
    var head = '<th class="tt-col-period">節次</th><th class="tt-col-time">時間</th>' + model.days.map(function (day, i) {
      var holiday = holidayMap[i];
      var label = holiday ? (day + '·' + holiday.name) : day;
      return '<th class="tt-col-day' +
        (viewingThisWeek && i === today ? ' tt-today' : '') +
        (holiday ? ' tt-holiday-day' : '') + '">' + escapeHtml(label) + '</th>';
    }).join('');
    var body = model.rows.map(function (row, r) {
      var trClass = row.isBreak ? 'tt-break' : '';
      return '<tr class="' + trClass + '"><th class="tt-col-period">' + escapeHtml(periodLabel(row, true)) +
        '</th><td class="tt-col-time">' + escapeHtml(prettyTime(row.time)) + '</td>' +
        row.cells.map(function (cell, i) {
          var holiday = holidayMap[i];
          var cls = ['tt-col-day'];
          var badge = '';
          var swapMark = marks[i + ':' + r];
          var events = eventMarks[i + ':' + r] || [];
          if (viewingThisWeek && i === today) cls.push('tt-today');
          if (holiday) {
            cls.push('tt-holiday-day');
            return '<td class="' + cls.join(' ') + '">' +
              (row.isBreak ? escapeHtml(cell || '') : ('放假｜' + escapeHtml(holiday.name))) +
              '</td>';
          }
          if (events.length) cls.push(eventCellKindClass(events));
          if (swapMark) {
            cls.push('tt-swapped');
            badge = '調課';
          }
          if (viewingThisWeek && r === nowRow && i === today) {
            cls.push('tt-current');
            badge = badge || '現在';
          } else if (viewingThisWeek && r === nextRow && i === today) {
            cls.push('tt-upcoming');
            if (!badge) badge = '接下來';
          }
          return '<td class="' + cls.join(' ') + '">' + cellInner(cell, badge, events) + '</td>';
        }).join('') + '</tr>';
    }).join('');
    els.timetableGrid.innerHTML = '<div class="tt-table-wrap"><table class="tt-table">' + colgroup +
      '<thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function goToTimetableClass(name) {
    var className = matchClassName(name) || String(name || '').trim();
    if (!className) return;
    if ((App.classNames || []).indexOf(className) < 0) {
      toast(className + ' 還沒有座位表，請先到「設定與上傳」匯入這個班');
      return;
    }
    loadClass(className);
    showClassView();
    toast('已切到 ' + className + ' 上課');
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

  function buildSheetModelFrom(className, students, dates) {
    dates = (dates || []).slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    });
    students = (students || []).slice().sort(seatOrder);
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
        className: stu.className || className,
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

  function buildSheetModel() {
    var className = teacherTargetClass();
    var sameClassDays = !App.dailyDaysClass || App.dailyDaysClass === className;
    var dates = (sameClassDays ? (App.dailyDays || []) : []).slice().sort(function (a, b) {
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
    return buildSheetModelFrom(className, students, dates);
  }

  function renderDailyPanel(data) {
    data = data || {};
    if (data.days) App.dailyDays = data.days;
    if (data.className) App.dailyDaysClass = String(data.className);
    var model = buildSheetModel();
    App.sheetModel = model;
    renderScoreSheet(model);
    if (App.teacherTab === 'grades' && App.gradesSub === 'stats') renderStatsDashboard(model);
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
    var v = readSeatScore(col.scores, seatNo);
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

  function gradeDirtyKey(kind, id, seat, field) {
    return String(kind || '') + '\t' + String(id || '') + '\t' + String(seat || '') + '\t' + String(field || 'score');
  }

  function markGradeDirty(kind, id, seat, field) {
    App.gradeDirty = App.gradeDirty || {};
    App.gradeDirty[gradeDirtyKey(kind, id, seat, field)] = true;
  }

  function isGradeDirty(kind, id, seat, field) {
    return !!(App.gradeDirty && App.gradeDirty[gradeDirtyKey(kind, id, seat, field)]);
  }

  function isGradeCellDirty(kind, id, seat) {
    return isGradeDirty(kind, id, seat, 'score') || isGradeDirty(kind, id, seat, 'leave') ||
      isGradeDirty(kind, id, seat, 'status') || isGradeDirty(kind, id, seat, 'date');
  }

  function clearGradeDirty() {
    App.gradeDirty = {};
  }

  function markDirtyFromGradeEl(el) {
    if (!el) return;
    var score = el.closest('[data-grade-score]');
    var mark = el.closest('[data-grade-mark]');
    var hwStatus = el.closest('[data-hw-status]');
    var hwScore = el.closest('[data-hw-score]');
    var hwDate = el.closest('[data-hw-date]');
    if (score) {
      markGradeDirty(score.getAttribute('data-kind'), score.getAttribute('data-id'), score.getAttribute('data-seat'), 'score');
      return;
    }
    if (mark) {
      markGradeDirty(mark.getAttribute('data-kind'), mark.getAttribute('data-id'), mark.getAttribute('data-seat'), 'leave');
      return;
    }
    if (hwStatus) {
      markGradeDirty('homework', hwStatus.getAttribute('data-id'), hwStatus.getAttribute('data-seat'), 'status');
      return;
    }
    if (hwScore) {
      markGradeDirty('homework', hwScore.getAttribute('data-id'), hwScore.getAttribute('data-seat'), 'score');
      return;
    }
    if (hwDate) {
      markGradeDirty('homework', hwDate.getAttribute('data-id'), hwDate.getAttribute('data-seat'), 'date');
    }
  }

  function onGradeCellInput(event) {
    markDirtyFromGradeEl(event.target);
    scheduleAutoGradeSave();
  }

  function onGradeCellChange(event) {
    markDirtyFromGradeEl(event.target);
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
    if (!App.gradebookReady || !App.gradebook || !document.querySelector('#gradeTermWrap table')) return;
    if (!App.gradeDirty || !Object.keys(App.gradeDirty).length) return;
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
    App.gradebookClass = String(data.className || '');
    App.gradebookReady = true;
    clearGradeDirty();
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

  function seatKeyAliases(seatNo) {
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

  function readSeatScore(scores, seatNo) {
    scores = scores || {};
    var keys = seatKeyAliases(seatNo);
    var i;
    for (i = 0; i < keys.length; i++) {
      if (Object.prototype.hasOwnProperty.call(scores, keys[i])) {
        return scores[keys[i]];
      }
    }
    return undefined;
  }

  function writeSeatScore(scores, seatNo, value) {
    seatKeyAliases(seatNo).forEach(function (k) { delete scores[k]; });
    if (value === undefined) return;
    scores[String(seatNo)] = value;
  }

  function readHwRecord(records, seatNo) {
    records = records || {};
    var keys = seatKeyAliases(seatNo);
    var i;
    for (i = 0; i < keys.length; i++) {
      if (Object.prototype.hasOwnProperty.call(records, keys[i])) {
        return records[keys[i]] || {};
      }
    }
    return {};
  }

  function scoreCellHtml(kind, col, seatNo, allowLeave) {
    var v = readSeatScore(col.scores, seatNo);
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
    var rec = readHwRecord(col.records, seatNo);
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
    });
    var byScore = rows.slice().sort(function (a, b) {
      return (b.total == null ? -999 : b.total) - (a.total == null ? -999 : a.total);
    });
    var lastTotal = null;
    var lastRank = 0;
    byScore.forEach(function (row, index) {
      if (lastTotal === null || row.total !== lastTotal) {
        lastRank = index + 1;
        lastTotal = row.total;
      }
      row.rank = lastRank;
    });
    rows.sort(seatOrder);

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
      '<li>小組加分會加進每位組員的上課加扣，所以會列入平時成績；小組計分板只記整組分數，不會再加一次。</li>' +
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

  function collectGradebookFromTable(opts) {
    opts = opts || {};
    var dirtyOnly = opts.dirtyOnly !== false;
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
      var id = input.getAttribute('data-id');
      var seat = input.getAttribute('data-seat');
      if (dirtyOnly && !isGradeCellDirty(kind, id, seat)) return;
      var col = findCol(lists[kind], id);
      if (!col) return;
      var cell = input.closest('td');
      var mark = cell && cell.querySelector('[data-grade-mark]');
      var leave = mark && (mark.type === 'checkbox' ? mark.checked : mark.value === 'leave');
      if (leave) {
        writeSeatScore(col.scores, seat, 'leave');
        return;
      }
      if (input.value === '') writeSeatScore(col.scores, seat, undefined);
      else writeSeatScore(col.scores, seat, Number(input.value));
    });
    document.querySelectorAll('[data-hw-status]').forEach(function (sel) {
      var id = sel.getAttribute('data-id');
      var seat = sel.getAttribute('data-seat');
      if (dirtyOnly && !isGradeCellDirty('homework', id, seat)) return;
      var col = findCol(homeworks, id);
      if (!col) return;
      var cell = sel.closest('td');
      var score = cell && cell.querySelector('[data-hw-score]');
      var date = cell && cell.querySelector('[data-hw-date]');
      seatKeyAliases(seat).forEach(function (k) { delete col.records[k]; });
      if (sel.value !== 'submitted') {
        col.records[String(seat)] = { status: 'missing' };
        return;
      }
      var rec = { status: 'submitted' };
      if (score && score.value !== '') rec.score = Number(score.value);
      if (date && date.value) rec.submittedAt = date.value;
      col.records[String(seat)] = rec;
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
    if (!App.gradebookReady) {
      if (showToast) toast('成績還在載入，請稍後再存');
      return;
    }
    if (!showToast && (!App.gradeDirty || !Object.keys(App.gradeDirty).length)) return;
    var body = collectGradebookFromTable({ dirtyOnly: true });
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
    if (!App.gradebookReady) {
      toast('成績還在載入，請稍後再新增欄位');
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
      var n = data && data.sharedCount ? data.sharedCount : 1;
      toast('已在全校 ' + n + ' 個班新增「' + (title || GRADE_TYPE_LABEL[type] || '成績') + '」欄，可一起統計');
      App.schoolPacks = null;
    }).catch(function (error) {
      toast(error && error.message ? error.message : '新增失敗');
    });
  }

  function deleteGradeColumn(kind, id) {
    if (!window.confirm('要刪掉這一欄嗎？會從全校各班一起刪除，分數也會一起刪掉。')) return;
    api('deleteGradeColumn', [{ className: teacherTargetClass(), type: kind, id: id }]).then(function (data) {
      applyGradebook(data);
      renderGradebook();
      var n = data && data.sharedCount ? data.sharedCount : 1;
      toast('已從 ' + n + ' 個班刪除這一欄');
      App.schoolPacks = null;
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

  function meanOf(nums) {
    var list = (nums || []).filter(function (n) { return n != null && isFinite(n); });
    if (!list.length) return null;
    return round1(list.reduce(function (sum, n) { return sum + n; }, 0) / list.length);
  }

  function fmtMaybe(v, suffix) {
    if (v == null || v === '') return '—';
    return suffix ? v + suffix : String(v);
  }

  function peopleText(list, limit) {
    limit = limit || 4;
    if (!list || !list.length) return '目前沒有';
    var names = list.slice(0, limit).map(function (row) {
      return (row.className ? row.className + ' ' : '') + row.seatNo + ' ' + row.name;
    });
    var extra = list.length > limit ? ' 等 ' + list.length + ' 人' : '';
    return names.join('、') + extra;
  }

  function countLeaves(seatNo) {
    var book = App.gradebook || emptyGradebook();
    var n = 0;
    [book.yellow, book.morning, book.exams].forEach(function (cols) {
      (cols || []).forEach(function (col) {
        if (isLeaveScore(readSeatScore(col.scores, seatNo))) n += 1;
      });
    });
    return n;
  }

  function homeworkFlags(seatNo) {
    var missing = 0;
    var late = 0;
    ((App.gradebook && App.gradebook.homeworks) || []).forEach(function (col) {
      var result = homeworkResult(col, seatNo);
      if (result.status === 'missing') missing += 1;
      if (result.late) late += 1;
    });
    return { missing: missing, late: late };
  }

  function rosterMissingCount(seatNo, className) {
    className = className || (App.classroom && App.classroom.className) || '';
    var seat = String(seatNo || '');
    var keys = {};
    keys[normalizeDisplaySeat_(seat)] = true;
    keys[seat] = true;
    if (String(Number(seat) || '')) keys[String(Number(seat))] = true;
    var n = 0;
    activeHwMissingItems(className).forEach(function (item) {
      var hit = (item.seats || []).some(function (s) {
        var raw = String(s || '');
        return !!(keys[normalizeDisplaySeat_(raw)] || keys[raw] || keys[String(Number(raw) || '')]);
      });
      if (hit) n += 1;
    });
    return n;
  }

  function analyzeScoreColumn(col, students) {
    var scores = [];
    var leave = 0;
    var missing = 0;
    (students || []).forEach(function (stu) {
      var raw = readSeatScore(col.scores, stu.seatNo);
      if (isLeaveScore(raw)) {
        leave += 1;
        return;
      }
      var n = columnScore100(col, stu.seatNo);
      if (n == null) {
        missing += 1;
        return;
      }
      scores.push(n);
    });
    var below = scores.filter(function (n) { return n < 60; }).length;
    return {
      title: col.title || '未命名',
      date: col.date || '',
      avg: meanOf(scores),
      max: scores.length ? Math.max.apply(null, scores) : null,
      min: scores.length ? Math.min.apply(null, scores) : null,
      n: scores.length,
      leave: leave,
      missing: missing,
      below: below,
      passRate: scores.length ? round1((scores.length - below) / scores.length * 100) : null
    };
  }

  function analyzeHomeworkColumn(col, students) {
    var submitted = 0;
    var missing = 0;
    var late = 0;
    var scores = [];
    (students || []).forEach(function (stu) {
      var result = homeworkResult(col, stu.seatNo);
      if (result.status === 'missing') {
        missing += 1;
        return;
      }
      submitted += 1;
      if (result.late) late += 1;
      if (result.final != null) scores.push(result.final);
    });
    var total = students.length || 1;
    return {
      title: col.title || '作業',
      date: col.dueDate || col.date || '',
      avg: meanOf(scores),
      submitted: submitted,
      missing: missing,
      late: late,
      submitRate: round1(submitted / total * 100)
    };
  }

  function watchCard(tone, title, body) {
    return '<article class="watch-card tone-' + tone + '"><h4>' + escapeHtml(title) +
      '</h4><p>' + escapeHtml(body) + '</p></article>';
  }

  function enrichStatsRows(model, className) {
    className = className || (App.classroom && App.classroom.className) || '';
    return (model.rows || []).map(function (row) {
      var parts = studentGradeParts(row, '');
      var hw = homeworkFlags(row.seatNo);
      var activeDays = (row.cells || []).filter(function (n) { return Number(n) !== 0; }).length;
      var delta = null;
      if ((row.cells || []).length >= 4) {
        var mid = Math.floor(row.cells.length / 2);
        var first = meanOf(row.cells.slice(0, mid));
        var second = meanOf(row.cells.slice(mid));
        if (first != null && second != null) delta = round1(second - first);
      }
      var series = paperSeriesFor(row.seatNo);
      return Object.assign({}, row, parts, {
        leaveCount: countLeaves(row.seatNo),
        hwMissing: hw.missing,
        hwLate: hw.late,
        rosterMissing: rosterMissingCount(row.seatNo, className),
        plusHits: plusHitCount(row.seatNo, className),
        activeDays: activeDays,
        trend: delta,
        paperSeries: series,
        types: studentTypeFlags(parts, series)
      });
    });
  }

  /** 依日期排好的各次考卷百分制分數（略過未考與請假）。 */
  function paperSeriesFor(seatNo) {
    var book = App.gradebook || emptyGradebook();
    var cols = [];
    ['yellow', 'morning', 'exams', 'labs', 'practicals'].forEach(function (key) { cols = cols.concat(book[key] || []); });
    return byColDate(cols).map(function (col) {
      return columnScore100(col, seatNo);
    }).filter(function (n) { return n != null; });
  }

  function studentTypes() {
    return [
      { key: 'examLow', label: '段考失常', tone: 'alert', hint: '平時考試比段考高 15 分以上' },
      { key: 'quizLow', label: '平時偏低', tone: 'warn', hint: '段考比平時考試高 15 分以上，平時可再穩定' },
      { key: 'decline', label: '連續退步', tone: 'alert', hint: '最近三次考卷一次比一次低，共掉 10 分以上' },
      { key: 'unstable', label: '成績不穩', tone: 'warn', hint: '至少四次考卷，標準差 15 分以上' },
      { key: 'rise', label: '連續進步', tone: 'good', hint: '最近三次考卷一次比一次高，共進步 10 分以上' }
    ];
  }

  function studentTypeFlags(parts, series) {
    var flags = [];
    var quiz = parts && parts.quiz;
    var exam = parts && parts.exam;
    if (quiz != null && exam != null) {
      if (quiz - exam >= 15) flags.push({ key: 'examLow', detail: '平時 ' + quiz + '、段考 ' + exam });
      else if (exam - quiz >= 15) flags.push({ key: 'quizLow', detail: '平時 ' + quiz + '、段考 ' + exam });
    }
    var last = (series || []).slice(-3);
    if (last.length === 3) {
      if (last[0] > last[1] && last[1] > last[2] && last[0] - last[2] >= 10) {
        flags.push({ key: 'decline', detail: last.join('→') });
      } else if (last[0] < last[1] && last[1] < last[2] && last[2] - last[0] >= 10) {
        flags.push({ key: 'rise', detail: last.join('→') });
      }
    }
    if ((series || []).length >= 4 && stdevOf(series) >= 15) {
      flags.push({ key: 'unstable', detail: '標準差 ' + stdevOf(series) });
    }
    return flags;
  }

  function typeLabel(key) {
    var hit = studentTypes().filter(function (t) { return t.key === key; })[0];
    return hit ? hit.label : key;
  }

  function withGradebook(book, fn) {
    var prev = App.gradebook;
    App.gradebook = book || emptyGradebook();
    try {
      return fn();
    } finally {
      App.gradebook = prev;
    }
  }

  function isSchoolClassName(name) {
    name = String(name || '').trim();
    if (!name) return false;
    return name.indexOf('範例') < 0;
  }

  function needHelpRow(row) {
    return careReasons(row).length > 0;
  }

  function peopleHitsText(list, limit) {
    limit = limit || 3;
    if (!list || !list.length) return '目前沒有';
    var names = list.slice(0, limit).map(function (row) {
      return row.seatNo + ' ' + row.name + '（' + (row.plusHits || 0) + ' 次）';
    });
    var extra = list.length > limit ? ' 等 ' + list.length + ' 人' : '';
    return names.join('、') + extra;
  }

  function passRateOf(scores) {
    var list = (scores || []).filter(function (n) { return n != null && isFinite(n); });
    if (!list.length) return null;
    return round1(list.filter(function (n) { return n >= 60; }).length / list.length * 100);
  }

  function scoreBands(scores) {
    var bands = [
      { label: '90↑', count: 0 },
      { label: '80–89', count: 0 },
      { label: '70–79', count: 0 },
      { label: '60–69', count: 0 },
      { label: '未滿60', count: 0 }
    ];
    var n = 0;
    (scores || []).forEach(function (v) {
      if (v == null || !isFinite(v)) return;
      n += 1;
      if (v >= 90) bands[0].count += 1;
      else if (v >= 80) bands[1].count += 1;
      else if (v >= 70) bands[2].count += 1;
      else if (v >= 60) bands[3].count += 1;
      else bands[4].count += 1;
    });
    return { bands: bands, n: n };
  }

  function summarizeClassPack(pack) {
    var book = Object.assign(emptyGradebook(), pack.gradebook || {});
    var model = buildSheetModelFrom(pack.className, pack.students || [], pack.days || []);
    var people = withGradebook(book, function () {
      return enrichStatsRows(model, pack.className);
    });
    people.forEach(function (row) { row.className = pack.className; });
    var termScores = people.map(function (row) { return row.total; }).filter(function (n) { return n != null; });
    var pass60 = termScores.filter(function (n) { return n >= 60; }).length;
    var needHelp = people.filter(needHelpRow);
    var hwMissingPeople = people.filter(function (row) { return row.hwMissing > 0; }).length;
    var hwMissingCount = people.reduce(function (sum, row) { return sum + (row.hwMissing || 0); }, 0);
    return {
      className: pack.className,
      model: model,
      people: people,
      count: people.length,
      termAvg: meanOf(termScores),
      termMedian: termScores.length ? medianOf(termScores) : null,
      passRate: termScores.length ? round1(pass60 / termScores.length * 100) : null,
      passCount: pass60,
      termCount: termScores.length,
      usualAvg: meanOf(people.map(function (row) { return row.usual; })),
      quizAvg: meanOf(people.map(function (row) { return row.quiz; })),
      examAvg: meanOf(people.map(function (row) { return row.exam; })),
      quizPass: passRateOf(people.map(function (row) { return row.quiz; })),
      examPass: passRateOf(people.map(function (row) { return row.exam; })),
      classAvg: model.classAvg,
      plusTotal: model.plusTotal || 0,
      minusTotal: model.minusTotal || 0,
      hwMissingPeople: hwMissingPeople,
      hwMissingCount: hwMissingCount,
      needHelp: needHelp,
      needCount: needHelp.length
    };
  }

  function renderStatsDashboard(model) {
    model = model || App.sheetModel || buildSheetModel();
    if (model.className && App.gradebookClass && App.gradebookClass !== model.className) {
      withGradebook(emptyGradebook(), function () { renderStatsDashboardFor_(model); });
      return;
    }
    renderStatsDashboardFor_(model);
  }

  function renderStatsDashboardFor_(model) {
    var people = enrichStatsRows(model);
    var cols = scoreColumnsForCheck();
    people.forEach(function (row) {
      row.check = studentCheck(row, cols);
      row.care = careReasons(row);
    });
    App.statsPeople = people;
    App.statsModel = model;
    App.statsCols = cols;
    App.statsRendered = {};

    fillPersonSelect(people);
    applyStatsView();
    if (statsNeedsSchool()) ensureSchoolStats();
  }

  /** 只畫看得到的統計分頁；其他分頁切過去時才畫。 */
  function renderStatsView(view) {
    var people = App.statsPeople;
    var model = App.statsModel;
    if (!people || !model) return;
    App.statsRendered = App.statsRendered || {};
    if (App.statsRendered[view]) return;
    App.statsRendered[view] = true;
    if (view === 'check') {
      renderCheckPanel(people, App.statsCols || scoreColumnsForCheck());
      renderCharts(model, people);
    } else if (view === 'paper') {
      renderPaperStats(people);
      renderPaperTrend(people);
      renderSchoolPaper();
    } else if (view === 'care') {
      renderCarePanel();
    } else if (view === 'class') {
      renderClassPanel(model, people);
      renderCharts(model, people);
      renderGroupDeductStats();
    } else if (view === 'person') {
      renderPersonStats();
    }
  }

  /** 考卷欄（不含作業）依日期排，並標出整欄還沒輸入的欄。 */
  function scoreColumnsForCheck() {
    return specsByDate(listAssessColumns()).map(function (spec) {
      return {
        spec: spec,
        hasAny: spec.homework
          ? Object.keys((spec.col && spec.col.records) || {}).length > 0
          : Object.keys((spec.col && spec.col.scores) || {}).some(function (k) {
            var v = spec.col.scores[k];
            return v !== '' && v != null;
          })
      };
    });
  }

  function studentCheck(row, cols) {
    var blanks = [];
    var leaves = 0;
    var outOfRange = [];
    cols.forEach(function (item) {
      var spec = item.spec;
      if (spec.homework || !item.hasAny) return;
      var raw = readSeatScore(spec.col.scores, row.seatNo);
      if (isLeaveScore(raw)) { leaves += 1; return; }
      if (raw === '' || raw == null) { blanks.push(spec.title); return; }
      var n = Number(raw);
      var max = Number(spec.col.max) || 100;
      if (!isFinite(n) || n < 0 || n > max) outOfRange.push(spec.title);
    });
    var book = App.gradebook || emptyGradebook();
    var notes = [];
    if (outOfRange.length) notes.push('分數超出範圍：' + outOfRange.join('、'));
    if (row.total != null) {
      var gone = [];
      if (row.usual == null) gone.push('平時');
      if (row.quiz == null && ((book.yellow || []).length || (book.morning || []).length)) gone.push('平時考試');
      if (row.exam == null && (book.exams || []).length) gone.push('段考');
      if (gone.length) notes.push(gone.join('、') + '沒有成績，比重已重算');
    } else {
      notes.push('還沒有學期總分');
    }
    if (blanks.length) notes.push('空白：' + blanks.slice(0, 3).join('、') + (blanks.length > 3 ? ' 等 ' + blanks.length + ' 張' : ''));
    return { blanks: blanks.length, leaves: leaves, notes: notes, issue: notes.length > 0 };
  }

  function careReasons(row) {
    var out = [];
    if (row.total != null && row.total < 60) out.push({ key: 'fail', label: '學期未滿 60（' + row.total + '）' });
    if (row.hwMissing > 0) out.push({ key: 'hw', label: '未繳作業 ' + row.hwMissing + ' 次' });
    if ((row.rosterMissing || 0) > 0) out.push({ key: 'roster', label: '缺交登錄 ' + row.rosterMissing + ' 份' });
    (row.types || []).forEach(function (t) {
      if (t.key === 'examLow' || t.key === 'decline' || t.key === 'unstable') {
        out.push({ key: t.key, label: typeLabel(t.key) + '（' + t.detail + '）' });
      }
    });
    if ((row.minusSum || 0) <= -5) out.push({ key: 'minus', label: '上課扣分 ' + row.minusSum });
    return out;
  }

  function careKeys() {
    return [
      ['fail', '學期未滿 60'],
      ['hw', '未繳作業'],
      ['roster', '缺交登錄'],
      ['examLow', '段考失常'],
      ['decline', '連續退步'],
      ['unstable', '成績不穩'],
      ['minus', '上課扣分多']
    ];
  }

  function columnCheck(item, people) {
    var spec = item.spec;
    var col = spec.col;
    var max = Number(col.max) || 100;
    if (spec.homework) {
      var hw = analyzeHomeworkColumn(col, people);
      var missingPeople = people.filter(function (row) { return homeworkResult(col, row.seatNo).status === 'missing'; });
      return {
        filled: '已繳 ' + hw.submitted + '／未繳 ' + hw.missing + (hw.late ? '／遲交 ' + hw.late : ''),
        leave: '—',
        blank: '—',
        avg: hw.avg,
        pass: null,
        warn: missingPeople.length ? '未繳：' + peopleText(missingPeople, 5) : '',
        tone: missingPeople.length ? 'warn' : ''
      };
    }
    var info = analyzeScoreColumn(col, people);
    var nums = [];
    var over = 0;
    var neg = 0;
    people.forEach(function (row) {
      var raw = readSeatScore(col.scores, row.seatNo);
      if (raw === '' || raw == null || isLeaveScore(raw)) return;
      var n = Number(raw);
      if (!isFinite(n)) return;
      nums.push(n);
      if (n > max) over += 1;
      if (n < 0) neg += 1;
    });
    var warns = [];
    var tone = '';
    if (!item.hasAny) {
      warns.push('整欄還沒輸入（不影響總分）');
      tone = 'info';
    } else {
      if (max !== 100 && over > 0 && over >= nums.length / 2) {
        warns.push('疑似填成百分制（滿分 ' + max + '，' + over + ' 人超過）');
        tone = 'alert';
      } else if (over) {
        warns.push(over + ' 人超過滿分 ' + max);
        tone = 'alert';
      }
      if (neg) { warns.push(neg + ' 人是負分'); tone = 'alert'; }
      if (info.missing) {
        var blankPeople = people.filter(function (row) {
          var raw = readSeatScore(col.scores, row.seatNo);
          return (raw === '' || raw == null);
        });
        warns.push('空白：' + peopleText(blankPeople, 5));
        if (!tone) tone = 'warn';
      }
    }
    return {
      filled: info.n + ' / ' + people.length,
      leave: info.leave,
      blank: item.hasAny ? info.missing : '—',
      avg: info.avg,
      pass: info.passRate,
      warn: warns.join('；'),
      tone: tone
    };
  }

  function renderCheckPanel(people, cols) {
    var termScores = numsOf(people.map(function (row) { return row.total; }));
    var issuePeople = people.filter(function (row) { return row.check.issue; });
    var blankCells = people.reduce(function (sum, row) { return sum + row.check.blanks; }, 0);
    var colChecks = cols.map(function (item) { return { item: item, res: columnCheck(item, people) }; });
    var alertCols = colChecks.filter(function (c) { return c.res.tone === 'alert'; }).length;

    if (els.statsCards) {
      els.statsCards.innerHTML =
        statCard('學生人數', people.length) +
        statCard('有學期總分', termScores.length + ' / ' + people.length) +
        statCard('學期平均', fmtMaybe(meanOf(termScores))) +
        statCard('中位數', fmtMaybe(termScores.length ? medianOf(termScores) : null)) +
        statCard('及格率', fmtMaybe(passRateOf(termScores), '%')) +
        statCard('要核對的學生', issuePeople.length + ' 人') +
        statCard('空白格', blankCells) +
        statCard('可疑欄位', alertCols);
    }

    var colsEl = document.getElementById('checkCols');
    if (colsEl) {
      colsEl.innerHTML = colChecks.length
        ? '<table class="assess-table"><thead><tr><th>類型</th><th>名稱</th><th>日期</th><th>滿分</th><th>有分數</th><th>請假</th><th>空白</th><th>平均</th><th>及格率</th><th>要注意</th></tr></thead><tbody>' +
          colChecks.map(function (c) {
            var spec = c.item.spec;
            return '<tr class="' + (c.res.tone ? 'check-' + c.res.tone : '') + '"><td>' + escapeHtml(spec.group) + '</td><td>' +
              escapeHtml(spec.title) + '</td><td>' + escapeHtml(shortDate(spec.col.dueDate || spec.col.date)) + '</td><td>' +
              (Number(spec.col.max) || 100) + '</td><td>' + escapeHtml(String(c.res.filled)) + '</td><td>' +
              escapeHtml(String(c.res.leave)) + '</td><td>' + escapeHtml(String(c.res.blank)) + '</td><td>' +
              fmtMaybe(c.res.avg) + '</td><td>' + fmtMaybe(c.res.pass, '%') + '</td><td>' + escapeHtml(c.res.warn) + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<p class="chart-empty">到「學期成績」新增黃卷、早自習、段考、實作或作業欄位後，這裡會逐欄檢查。</p>';
    }

    paintCheckStudents();

    var borderEl = document.getElementById('checkBorder');
    if (borderEl) {
      var border = people.filter(function (row) { return row.total != null && row.total >= 55 && row.total < 60; })
        .sort(function (a, b) { return b.total - a.total; });
      var noTotal = people.filter(function (row) { return row.total == null; });
      var html = border.length
        ? '<ul class="border-list">' + border.map(function (row) {
          return '<li><strong>' + escapeHtml(row.seatNo + ' ' + row.name) + '</strong>　' + row.total +
            '（差 ' + round1(60 - row.total) + ' 分）</li>';
        }).join('') + '</ul>'
        : '<p class="hint">目前沒有 55～60 分之間的學生。</p>';
      if (noTotal.length) html += '<p class="hint">還沒有學期總分：' + escapeHtml(peopleText(noTotal, 8)) + '</p>';
      borderEl.innerHTML = html;
    }

    paintCheckGrid(people, cols);
  }

  function paintCheckStudents() {
    if (!els.statsBody) return;
    var people = App.statsPeople || [];
    var termScores = numsOf(people.map(function (row) { return row.total; }));
    var only = !!(document.getElementById('checkOnlyIssues') || {}).checked;
    var list = people.filter(function (row) { return !only || (row.check && row.check.issue); }).sort(function (a, b) {
      var av = a.total == null ? -999 : a.total;
      var bv = b.total == null ? -999 : b.total;
      return bv - av || seatOrder(a, b);
    });
    if (!list.length) {
      els.statsBody.innerHTML = '<tr><td colspan="11">' + (people.length ? '沒有需要核對的學生' : '尚無學生') + '</td></tr>';
      return;
    }
    els.statsBody.innerHTML = list.map(function (row) {
      var rank = rankAmong(row.total, termScores);
      var chk = row.check || { blanks: 0, leaves: 0, notes: [] };
      return '<tr data-seat="' + escapeHtml(String(row.seatNo)) + '"' + (chk.issue ? ' class="check-row-issue"' : '') + '>' +
        '<td>' + (rank == null ? '—' : rank) + '</td>' +
        '<td>' + escapeHtml(row.seatNo) + '</td>' +
        '<td>' + escapeHtml(row.name) + '</td>' +
        '<td>' + fmtMaybe(row.usual) + '</td>' +
        '<td>' + fmtMaybe(row.quiz) + '</td>' +
        '<td>' + fmtMaybe(row.exam) + '</td>' +
        '<td class="col-total">' + fmtMaybe(row.total) + '</td>' +
        '<td>' + (chk.blanks || '') + '</td>' +
        '<td>' + (chk.leaves || '') + '</td>' +
        '<td>' + (row.hwMissing || '') + '</td>' +
        '<td class="check-notes">' + escapeHtml(chk.notes.join('；')) + '</td>' +
        '</tr>';
    }).join('');
  }

  function paintCheckGrid(people, cols) {
    var el = document.getElementById('checkGrid');
    if (!el) return;
    if (!cols.length || !people.length) {
      el.innerHTML = '<p class="chart-empty">有學生和成績欄後，這裡會用一張表看全部分數。</p>';
      return;
    }
    var head = '<tr><th>座號</th><th>姓名</th>' + cols.map(function (item) {
      var spec = item.spec;
      var date = spec.col.dueDate || spec.col.date;
      return '<th title="' + escapeHtml(spec.group + '｜' + spec.title) + '">' + escapeHtml(spec.group) +
        '<small>' + escapeHtml(date ? shortDate(date) : spec.title) + '</small></th>';
    }).join('') + '</tr>';
    var body = people.slice().sort(seatOrder).map(function (row) {
      return '<tr><td>' + escapeHtml(row.seatNo) + '</td><td>' + escapeHtml(row.name) + '</td>' + cols.map(function (item) {
        var spec = item.spec;
        if (spec.homework) {
          var hw = homeworkResult(spec.col, row.seatNo);
          if (hw.status === 'missing') return '<td class="grid-low" title="未繳">未繳</td>';
          return '<td' + (hw.final != null && hw.final < 60 ? ' class="grid-low"' : '') + '>' + fmtMaybe(hw.final) + '</td>';
        }
        var raw = readSeatScore(spec.col.scores, row.seatNo);
        if (isLeaveScore(raw)) return '<td class="grid-leave">假</td>';
        var v = columnScore100(spec.col, row.seatNo);
        if (v == null) return '<td class="' + (item.hasAny ? 'grid-blank' : 'grid-none') + '"></td>';
        return '<td' + (v < 60 ? ' class="grid-low"' : '') + '>' + v + '</td>';
      }).join('') + '</tr>';
    }).join('');
    el.innerHTML = '<table class="check-grid"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
  }

  function renderClassPanel(model, people) {
    var silent = people.filter(function (row) { return !row.activeDays; });
    var hitPeople = people.filter(function (row) { return (row.plusHits || 0) > 0; })
      .sort(function (a, b) { return (b.plusHits || 0) - (a.plusHits || 0); });
    var mostPlus = people.slice().sort(function (a, b) { return b.plusSum - a.plusSum; })[0];
    var mostMinus = people.slice().sort(function (a, b) { return a.minusSum - b.minusSum; })[0];
    var improved = people.filter(function (row) { return row.trend != null && row.trend >= 1; })
      .sort(function (a, b) { return b.trend - a.trend; });
    var slipped = people.filter(function (row) { return row.trend != null && row.trend <= -1; })
      .sort(function (a, b) { return a.trend - b.trend; });
    var dayBest = null;
    var dayWorst = null;
    (model.dates || []).forEach(function (day, i) {
      var avg = model.dayAvgs[i];
      if (dayBest == null || avg > dayBest.avg) dayBest = { date: day.date, avg: avg };
      if (dayWorst == null || avg < dayWorst.avg) dayWorst = { date: day.date, avg: avg };
    });
    if (els.statsPlusCards) {
      els.statsPlusCards.innerHTML =
        statCard('全班平均加扣', model.classAvg) +
        statCard('加分總和', '+' + (model.plusTotal || 0)) +
        statCard('扣分總和', String(model.minusTotal || 0)) +
        statCard('有紀錄的人', people.length - silent.length + ' / ' + people.length) +
        statCard('紀錄天數', (model.dates || []).length) +
        statCard('有加分次數', hitPeople.length + ' 人');
    }
    if (els.statsInsights) {
      var items = [];
      if (silent.length) items.push(insightItem('還沒有加扣分紀錄', peopleText(silent, 6)));
      if (mostPlus && mostPlus.plusSum) items.push(insightItem('加分總和最多', mostPlus.seatNo + ' ' + mostPlus.name + '　+' + mostPlus.plusSum));
      if (mostMinus && mostMinus.minusSum) items.push(insightItem('扣分總和最多', mostMinus.seatNo + ' ' + mostMinus.name + '　' + mostMinus.minusSum));
      if (hitPeople.length) items.push(insightItem('加分次數最多', peopleHitsText(hitPeople, 3)));
      if (improved.length) items.push(insightItem('後半段加扣進步', peopleText(improved, 3)));
      if (slipped.length) items.push(insightItem('後半段加扣下滑', peopleText(slipped, 3)));
      if (dayBest) items.push(insightItem('全班最好的一天', formatZhDate(dayBest.date) + '　平均 ' + dayBest.avg));
      if (dayWorst && (!dayBest || dayWorst.date !== dayBest.date)) {
        items.push(insightItem('全班最低的一天', formatZhDate(dayWorst.date) + '　平均 ' + dayWorst.avg));
      }
      els.statsInsights.innerHTML = items.join('');
    }
  }

  function renderPaperTrend(people) {
    var trendEl = document.getElementById('chartOverviewTrend');
    if (!trendEl) return;
    var trendSpecs = specsByDate(listAssessColumns()).filter(function (spec) { return !spec.homework; });
    var trendAvg = [];
    var trendPass = [];
    trendSpecs.forEach(function (spec) {
      var vals = numsOf(people.map(function (stu) { return scoreForColumn(spec, stu.seatNo); }));
      trendAvg.push(meanOf(vals));
      trendPass.push(passRateOf(vals));
    });
    trendEl.innerHTML = trendAvg.some(function (n) { return n != null; })
      ? svgLine(trendSpecs.map(function (spec) {
        return spec.group + (spec.col.date ? ' ' + shortDate(spec.col.date) : '');
      }), trendAvg, { compare: trendPass, compareColor: '#9aa8b0' })
      : chartEmpty('輸入黃卷、早自習、段考或實作後，這裡會依日期畫出全班平均走勢');
  }

  function renderCarePanel() {
    var scope = App.careScope === 'school' ? 'school' : 'class';
    document.querySelectorAll('[data-care-scope]').forEach(function (btn) {
      btn.classList.toggle('tab-on', btn.getAttribute('data-care-scope') === scope);
    });
    var body = document.getElementById('careBody');
    var chips = document.getElementById('careChips');
    if (!body) return;
    var people;
    if (scope === 'school') {
      if (!App.schoolPacks) {
        body.innerHTML = '<tr><td colspan="5">正在彙整全校…</td></tr>';
        if (chips) chips.innerHTML = '';
        if (App.statsView === 'care') ensureSchoolStats();
        return;
      }
      people = [];
      App.schoolPacks.forEach(function (pack) { people = people.concat(pack.people); });
    } else {
      var cls = (App.statsModel && App.statsModel.className) || teacherTargetClass();
      people = (App.statsPeople || []).map(function (row) {
        return Object.assign({}, row, { className: row.className || cls });
      });
    }
    people.forEach(function (row) { if (!row.care) row.care = careReasons(row); });
    var list = people.filter(function (row) { return row.care.length; }).sort(function (a, b) {
      return b.care.length - a.care.length ||
        (a.total == null ? 999 : a.total) - (b.total == null ? 999 : b.total) ||
        String(a.className || '').localeCompare(String(b.className || '')) || seatOrder(a, b);
    });
    if (chips) {
      chips.innerHTML = '<span class="stats-chip"><em>需要關心</em><strong>' + list.length + ' / ' + people.length + ' 人</strong></span>' +
        careKeys().map(function (pair) {
          var n = list.filter(function (row) { return row.care.some(function (c) { return c.key === pair[0]; }); }).length;
          return n ? '<span class="stats-chip"><em>' + escapeHtml(pair[1]) + '</em><strong>' + n + ' 人</strong></span>' : '';
        }).join('');
    }
    body.innerHTML = list.length ? list.map(function (row) {
      return '<tr data-class="' + escapeHtml(String(row.className || '')) + '" data-seat="' + escapeHtml(String(row.seatNo)) + '">' +
        '<td>' + escapeHtml(row.className || '') + '</td>' +
        '<td>' + escapeHtml(row.seatNo) + '</td>' +
        '<td>' + escapeHtml(row.name) + '</td>' +
        '<td class="col-total">' + fmtMaybe(row.total) + '</td>' +
        '<td class="care-reasons">' + row.care.map(function (c) {
          return '<span class="care-tag care-' + c.key + '">' + escapeHtml(c.label) + '</span>';
        }).join('') + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="5">目前沒有需要關心的學生</td></tr>';
  }

  function formatHistoryTime(value) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    var hh = String(date.getHours()).padStart(2, '0');
    var mm = String(date.getMinutes()).padStart(2, '0');
    return formatZhDate(y + '-' + m + '-' + d) + ' ' + hh + ':' + mm;
  }

  function renderGroupDeductStats() {
    if (!els.statsGroupDeduct || !App.classroom) return;
    run('listGroupDeductions', [App.classroom.className], function (data) {
      App.groupDeductions = data.rows || [];
      paintGroupDeductBox();
      paintPersonGroupDeduct();
    }, true);
  }

  function paintGroupDeductBox() {
    var box = els.statsGroupDeduct;
    if (!box) return;
    var rows = App.groupDeductions || [];
    if (!rows.length) {
      box.innerHTML = '<p class="hint">還沒有小組扣分紀錄。上課時先點那位同學，再扣整組，這裡就會出現是哪一組、因為誰。</p>';
      return;
    }
    var agg = {};
    rows.forEach(function (r) {
      var gid = String(r.groupId || '?');
      if (!agg[gid]) agg[gid] = { groupId: gid, groupName: r.groupName, total: 0, causes: {} };
      agg[gid].total += Number(r.delta) || 0;
      var key = r.causeName ? (String(r.causeSeatNo) + '\t' + r.causeName) : '\t未指定同學';
      if (!agg[gid].causes[key]) {
        agg[gid].causes[key] = { seatNo: r.causeSeatNo || '', name: r.causeName || '', n: 0, sum: 0 };
      }
      agg[gid].causes[key].n += 1;
      agg[gid].causes[key].sum += Number(r.delta) || 0;
    });
    var summary = Object.keys(agg).sort(function (a, b) {
      return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0);
    }).map(function (gid) {
      var g = agg[gid];
      var causes = Object.keys(g.causes).map(function (key) { return g.causes[key]; })
        .sort(function (a, b) { return a.sum - b.sum; })
        .map(function (c) {
          if (!c.name) return '未指定同學 ' + c.n + ' 次（共 ' + c.sum + '）';
          return escapeHtml(c.seatNo + ' ' + c.name) + ' ' + c.n + ' 次（共 ' + c.sum + '）';
        }).join('；');
      return '<tr>' +
        '<td>' + escapeHtml(g.groupName || ('第' + gid + '組')) + '</td>' +
        '<td class="day-minus">' + g.total + '</td>' +
        '<td>' + causes + '</td>' +
        '</tr>';
    }).join('');
    var log = rows.map(function (r) {
      var who = r.causeName
        ? ('因 ' + escapeHtml(r.causeSeatNo + ' ' + r.causeName) + ' 被扣 ' + Math.abs(Number(r.delta) || 0) + ' 分')
        : ('整組扣 ' + Math.abs(Number(r.delta) || 0) + ' 分（未指定同學）');
      var when = formatHistoryTime(r.time);
      return '<li><strong>' + escapeHtml(r.groupName) + '</strong>　' + who +
        (when ? '<span class="rank-meta">　' + escapeHtml(when) + '</span>' : '') +
        (r.members ? '<div class="rank-meta">組員：' + escapeHtml(r.members) + '</div>' : '') +
        '</li>';
    }).join('');
    box.innerHTML =
      '<div class="sheet-wrap deduct-summary-wrap">' +
      '<table class="sheet-table report-table">' +
      '<thead><tr><th>小組</th><th>扣分合計</th><th>因為誰</th></tr></thead>' +
      '<tbody>' + summary + '</tbody></table></div>' +
      '<h4 class="deduct-sub">逐筆紀錄</h4>' +
      '<ol class="deduct-log">' + log + '</ol>';
  }

  function paintPersonGroupDeduct() {
    var box = els.personGroupDeduct;
    if (!box) return;
    var seatNo = String(App.statsSeatNo || '');
    var mine = (App.groupDeductions || []).filter(function (r) {
      return String(r.causeSeatNo) === seatNo && r.causeName;
    });
    if (!seatNo) {
      box.innerHTML = '';
      return;
    }
    if (!mine.length) {
      box.innerHTML = '<p class="hint">這位同學目前沒有「讓小組被扣分」的紀錄。</p>';
      return;
    }
    var byGroup = {};
    mine.forEach(function (r) {
      var gid = String(r.groupId || '?');
      if (!byGroup[gid]) byGroup[gid] = { name: r.groupName, n: 0, sum: 0 };
      byGroup[gid].n += 1;
      byGroup[gid].sum += Number(r.delta) || 0;
    });
    var bits = Object.keys(byGroup).sort().map(function (gid) {
      var g = byGroup[gid];
      return escapeHtml(g.name) + ' ' + g.n + ' 次（共 ' + g.sum + '）';
    }).join('；');
    var log = mine.map(function (r) {
      var when = formatHistoryTime(r.time);
      return '<li>' + escapeHtml(r.groupName) + ' 被扣 ' + Math.abs(Number(r.delta) || 0) + ' 分' +
        (when ? '　' + escapeHtml(when) : '') + '</li>';
    }).join('');
    box.innerHTML = '<h4 class="deduct-sub">讓小組被扣分</h4><p>' + bits + '</p><ol class="deduct-log">' + log + '</ol>';
  }

  function statsViews() {
    return ['check', 'paper', 'care', 'compare', 'class', 'person'];
  }

  function statsHint(view) {
    return {
      check: '學期算成績前先看這裡：哪些欄空白、哪些分數怪怪的、誰的總分少算了一項。點學生可看個人。',
      paper: '選一張考卷：本班分布、未滿 60、和上一次比；下面是同一張考卷的全校排名與各班比較。',
      care: '把低分、未繳、段考失常、連續退步、成績不穩、扣分多的學生列在同一張表，原因多的排前面。點學生可看個人。',
      compare: '比較你教的每一班（不含範例班）。點某一班會改看那一班。',
      class: '上課加扣分、參與度與小組扣分。',
      person: '單一學生的總分組成、走勢、與全班比較。可用上一位／下一位切換。'
    }[view] || '';
  }

  function statsNeedsSchool() {
    return App.statsView === 'paper' || App.statsView === 'compare' ||
      (App.statsView === 'care' && App.careScope === 'school');
  }

  function applyStatsView() {
    var view = statsViews().indexOf(App.statsView) >= 0 ? App.statsView : 'check';
    App.statsView = view;
    document.querySelectorAll('[data-stats-panel]').forEach(function (el) {
      el.hidden = el.getAttribute('data-stats-panel') !== view;
    });
    document.querySelectorAll('[data-stats-view]').forEach(function (btn) {
      btn.classList.toggle('tab-on', btn.getAttribute('data-stats-view') === view);
    });
    var hint = document.getElementById('statsHint');
    if (hint) hint.textContent = statsHint(view);
    renderStatsView(view);
  }

  function setStatsView(mode) {
    App.statsView = statsViews().indexOf(mode) >= 0 ? mode : 'check';
    applyStatsView();
    if (App.statsView === 'person') {
      App.schoolPacks = null;
      renderPersonStats();
    }
    if (App.statsView === 'care') renderCarePanel();
    if (statsNeedsSchool()) ensureSchoolStats();
  }

  function setCareScope(scope) {
    App.careScope = scope === 'school' ? 'school' : 'class';
    if (App.careScope === 'school') App.schoolPacks = null;
    renderCarePanel();
    if (statsNeedsSchool()) ensureSchoolStats();
  }

  function openStatsClass(className) {
    className = String(className || '').trim();
    if (!className) return;
    if (els.dbClassFilter) els.dbClassFilter.value = className;
    App.dbFilter = className;
    App.statsView = 'check';
    applyStatsView();
    refreshTeacherExtras();
    toast('改看 ' + className + ' 的成績檢核');
  }

  function openStatsPerson(className, seatNo) {
    className = String(className || '').trim();
    seatNo = String(seatNo || '').trim();
    if (!className || !seatNo) return;
    if (els.dbClassFilter) els.dbClassFilter.value = className;
    App.dbFilter = className;
    App.statsSeatNo = seatNo;
    App.statsView = 'person';
    applyStatsView();
    refreshTeacherExtras();
    toast('改看 ' + className + ' ' + seatNo);
  }

  /** 各班同一張考卷：同 id，或同類型＋同名稱＋同日期（各班分開建欄時）視為同一張。 */
  function collectSchoolPapers(rawClasses) {
    var byKey = {};
    var aliasKey = {};
    (rawClasses || []).forEach(function (pack) {
      var book = pack.gradebook || {};
      PAPER_KINDS.forEach(function (kind) {
        (book[kind.kind] || []).forEach(function (col) {
          if (!col) return;
          var alias = kind.kind + '|' + (col.title || '') + '|' + (col.date || '');
          var key = (col.id && byKey[String(col.id)]) ? String(col.id) : (aliasKey[alias] || String(col.id || alias));
          if (!byKey[key]) {
            byKey[key] = { id: key, kind: kind.kind, kindLabel: kind.label, title: col.title || '未命名', date: col.date || '', byClass: {} };
          }
          aliasKey[alias] = key;
          byKey[key].byClass[pack.className] = { col: col, students: pack.students || [] };
        });
      });
    });
    return Object.keys(byKey).map(function (key) { return byKey[key]; }).map(function (paper) {
      var rows = [];
      Object.keys(paper.byClass).forEach(function (cn) {
        var entry = paper.byClass[cn];
        entry.students.forEach(function (stu) {
          var raw = readSeatScore(entry.col.scores, stu.seatNo);
          rows.push({
            className: cn,
            seatNo: stu.seatNo,
            name: stu.name,
            raw: raw,
            leave: isLeaveScore(raw),
            score: columnScore100(entry.col, stu.seatNo),
            max: Number(entry.col.max) || 100
          });
        });
      });
      paper.rows = rows;
      paper.scored = rows.filter(function (r) { return r.score != null; });
      return paper;
    }).filter(function (paper) {
      return paper.scored.length > 0;
    }).sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date)) || String(a.title).localeCompare(String(b.title));
    });
  }

  /** 考後檢討下方的全校區塊：跟著上面選的考卷，找各班同一張。 */
  function renderSchoolPaper() {
    var hintEl = document.getElementById('schoolPaperHint');
    var cardsEl = document.getElementById('schoolPaperCards');
    var watchEl = document.getElementById('schoolPaperWatch');
    var avgEl = document.getElementById('chartSchoolPaperAvg');
    var passEl = document.getElementById('chartSchoolPaperPass');
    var bandsEl = document.getElementById('schoolPaperBands');
    var bodyEl = document.getElementById('schoolPaperBody');
    function clear(msg) {
      if (hintEl) hintEl.textContent = msg;
      [cardsEl, watchEl, avgEl, passEl, bandsEl].forEach(function (el) { if (el) el.innerHTML = ''; });
      if (bodyEl) bodyEl.innerHTML = '';
    }
    var current = null;
    listStatsPapers().forEach(function (p) { if (p.key === App.statsPaperKey) current = p; });
    if (!current) { clear('先在上面選一張考卷。'); return; }
    if (!App.schoolPapers) { clear('正在彙整全校…'); return; }
    var cls = (App.statsModel && App.statsModel.className) || teacherTargetClass();
    var col = current.col;
    var paper = App.schoolPapers.filter(function (p) {
      var mine = p.byClass[cls];
      if (p.kind !== current.kind || !mine) return false;
      if (col.id && mine.col.id) return String(mine.col.id) === String(col.id);
      return (mine.col.title || '') === (col.title || '') && (mine.col.date || '') === (col.date || '');
    })[0];
    var classCount = paper ? Object.keys(paper.byClass).filter(function (cn) {
      return paper.scored.some(function (r) { return r.className === cn; });
    }).length : 0;
    if (!paper || classCount < 2) {
      clear('其他班還沒有這張考卷的分數（在任一班新增的欄會同步到全校；各班都輸入後這裡才會比較）。');
      return;
    }
    if (hintEl) hintEl.textContent = '分數換算成百分制。' + classCount + ' 個班有分數。';
    var classNamesList = (App.schoolClassNames || []).filter(function (cn) { return paper.byClass[cn]; });
    var scores = paper.scored.map(function (r) { return r.score; });
    var perClass = classNamesList.map(function (cn) {
      var vals = paper.scored.filter(function (r) { return r.className === cn; }).map(function (r) { return r.score; });
      return {
        className: cn,
        n: vals.length,
        roster: paper.rows.filter(function (r) { return r.className === cn; }).length,
        avg: vals.length ? meanOf(vals) : null,
        pass: vals.length ? passRateOf(vals) : null,
        bands: scoreBands(vals).bands,
        values: vals
      };
    });
    var withAvg = perClass.filter(function (c) { return c.avg != null; }).sort(function (a, b) { return b.avg - a.avg; });
    var leaves = paper.rows.filter(function (r) { return r.leave; });
    var mineVals = (perClass.filter(function (c) { return c.className === cls; })[0] || {});

    if (cardsEl) {
      cardsEl.innerHTML =
        statCard('全校平均', fmtMaybe(meanOf(scores))) +
        statCard('本班平均', fmtMaybe(mineVals.avg)) +
        statCard('中位數', fmtMaybe(medianOf(scores))) +
        statCard('全校及格率', fmtMaybe(passRateOf(scores), '%')) +
        statCard('有成績', scores.length + ' / ' + paper.rows.length);
    }
    if (watchEl) {
      var cards = [];
      cards.push(watchCard('good', '全校最高', tiedText(topTiedRows(paper.scored, 'score'), 'score', 5, true)));
      if (withAvg.length >= 2) {
        var gap = round1(withAvg[0].avg - withAvg[withAvg.length - 1].avg);
        cards.push(watchCard(gap >= 10 ? 'warn' : 'info', '班級落差',
          '最高 ' + withAvg[0].className + '（' + withAvg[0].avg + '）、最低 ' +
          withAvg[withAvg.length - 1].className + '（' + withAvg[withAvg.length - 1].avg + '），相差 ' + gap + ' 分'));
      }
      var missingClasses = perClass.filter(function (c) { return c.roster && c.n < c.roster; }).map(function (c) {
        return c.className + ' 缺 ' + (c.roster - c.n);
      });
      if (missingClasses.length) {
        cards.push(watchCard('warn', '還沒有分數', missingClasses.join('、') +
          (leaves.length ? '（其中請假 ' + leaves.length + ' 人）' : '')));
      }
      watchEl.innerHTML = cards.join('');
    }
    if (avgEl) avgEl.innerHTML = svgBars(classNamesList, perClass.map(function (c) { return c.avg; }), { zeroLine: false });
    if (passEl) {
      passEl.innerHTML = svgBars(classNamesList, perClass.map(function (c) { return c.pass; }), {
        zeroLine: false,
        barColors: classNamesList.map(function () { return '#2f6f8f'; })
      });
    }
    if (bandsEl) {
      var bandLabels = scoreBands([]).bands.map(function (b) { return b.label; });
      bandsEl.innerHTML = '<table class="assess-table"><thead><tr><th>班級</th><th>有成績</th><th>平均</th><th>及格率</th>' +
        bandLabels.map(function (lb) { return '<th>' + escapeHtml(lb) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        perClass.map(function (c) {
          return '<tr' + (c.className === cls ? ' class="check-info"' : '') + '><td>' + escapeHtml(c.className) + '</td><td>' +
            c.n + ' / ' + c.roster + '</td><td>' + fmtMaybe(c.avg) + '</td><td>' + fmtMaybe(c.pass, '%') + '</td>' +
            c.bands.map(function (b) { return '<td>' + b.count + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
    }
    if (bodyEl) {
      var ranked = paper.scored.slice().sort(function (a, b) {
        return b.score - a.score || String(a.className).localeCompare(String(b.className)) || seatOrder(a, b);
      });
      bodyEl.innerHTML = ranked.map(function (r) {
        var classVals = (perClass.filter(function (c) { return c.className === r.className; })[0] || {}).values || [];
        return '<tr data-class="' + escapeHtml(r.className) + '" data-seat="' + escapeHtml(String(r.seatNo)) + '"' +
          (r.className === cls ? ' class="check-info"' : '') + '>' +
          '<td>' + rankAmong(r.score, scores) + '</td>' +
          '<td>' + escapeHtml(r.className) + '</td>' +
          '<td>' + rankAmong(r.score, classVals) + '</td>' +
          '<td>' + escapeHtml(r.seatNo) + '</td>' +
          '<td>' + escapeHtml(r.name) + '</td>' +
          '<td>' + escapeHtml(String(r.raw) + ' / ' + r.max) + '</td>' +
          '<td>' + fmtMaybe(r.score) + '</td>' +
          '</tr>';
      }).join('');
    }
  }

  function ensureSchoolStats() {
    if (App.schoolBusy) return;
    App.schoolBusy = true;
    if (els.schoolCards && !App.schoolPacks) {
      els.schoolCards.innerHTML = statCard('全校統計', '正在彙整各班…');
    }
    api('listSchoolOverview', []).then(function (data) {
      App.schoolBusy = false;
      renderSchoolStats(data);
    }).catch(function (err) {
      App.schoolBusy = false;
      if (els.schoolCards) {
        els.schoolCards.innerHTML = statCard('全校統計', '讀取失敗');
      }
      toast(err && err.message ? err.message : '全校統計讀取失敗');
    });
  }

  function renderSchoolStats(data) {
    var rawClasses = ((data && data.classes) || []).filter(function (pack) {
      return isSchoolClassName(pack.className);
    });
    var packs = rawClasses.map(summarizeClassPack);
    App.schoolPacks = packs;
    var people = [];
    packs.forEach(function (pack) { people = people.concat(pack.people); });
    var names = packs.map(function (pack) { return pack.className; });
    var termScores = numsOf(people.map(function (row) { return row.total; }));
    var rankedTerm = people.filter(function (row) { return row.total != null; }).sort(function (a, b) {
      return b.total - a.total || String(a.className).localeCompare(String(b.className)) || seatOrder(a, b);
    });
    var needTotal = packs.reduce(function (sum, pack) { return sum + pack.needCount; }, 0);

    if (els.schoolCards) {
      els.schoolCards.innerHTML = packs.length
        ? statCard('班級數', packs.length) +
          statCard('學生總數', people.length) +
          statCard('全校學期平均', fmtMaybe(meanOf(termScores))) +
          statCard('全校中位數', fmtMaybe(termScores.length ? medianOf(termScores) : null)) +
          statCard('全校及格率', fmtMaybe(passRateOf(termScores), '%')) +
          statCard('需要關心', needTotal + ' 人') +
          statCard('學期第一', tiedText(topTiedRows(rankedTerm, 'total'), 'total', 3, true))
        : statCard('全校統計', '還沒有正式班級');
    }
    function bars(id, values, opts, empty) {
      var el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = values.some(function (v) { return v != null; })
        ? svgBars(names, values, opts || { zeroLine: false })
        : chartEmpty(empty);
    }
    var blue = { zeroLine: false, barColors: names.map(function () { return '#2f6f8f'; }) };
    bars('chartSchoolTermAvg', packs.map(function (p) { return p.termAvg; }), null, '有學期總分後，這裡會比較各班平均');
    bars('chartSchoolPass', packs.map(function (p) { return p.passRate; }), blue, '有學期總分後，這裡會比較各班及格率');
    bars('chartSchoolQuizAvg', packs.map(function (p) { return p.quizAvg; }), null, '輸入黃卷或早自習後，這裡會比較各班平時考試');
    bars('chartSchoolExamAvg', packs.map(function (p) { return p.examAvg; }), null, '輸入段考後，這裡會比較各班段考');
    bars('chartSchoolClassRaw', packs.map(function (p) { return p.count ? p.classAvg : null; }), { zeroLine: true }, '有上課加扣後，這裡會比較各班');
    bars('chartSchoolNeed', packs.map(function (p) { return p.count ? p.needCount : null; }), {
      zeroLine: false,
      barColors: names.map(function () { return '#b4413c'; })
    }, '匯入名單後，這裡會比較各班需要關心人數');

    if (els.schoolClassBody) {
      els.schoolClassBody.innerHTML = packs.length ? packs.map(function (pack) {
        return '<tr data-class="' + escapeHtml(pack.className) + '">' +
          '<td>' + escapeHtml(pack.className) + '</td>' +
          '<td>' + pack.count + '</td>' +
          '<td class="col-total">' + fmtMaybe(pack.termAvg) + '</td>' +
          '<td>' + fmtMaybe(pack.termMedian) + '</td>' +
          '<td>' + fmtMaybe(pack.passRate, '%') + '</td>' +
          '<td>' + fmtMaybe(pack.quizAvg) + '</td>' +
          '<td>' + fmtMaybe(pack.quizPass, '%') + '</td>' +
          '<td>' + fmtMaybe(pack.examAvg) + '</td>' +
          '<td>' + fmtMaybe(pack.examPass, '%') + '</td>' +
          '<td class="' + scoreCellClass(pack.classAvg) + '">' + scoreCellText(pack.classAvg) + '</td>' +
          '<td>' + pack.hwMissingPeople + '</td>' +
          '<td>' + pack.needCount + '</td>' +
          '</tr>';
      }).join('') : '<tr><td colspan="12">還沒有正式班級</td></tr>';
    }
    if (els.schoolTopBody) {
      var schoolTotals = rankedTerm.map(function (row) { return row.total; });
      els.schoolTopBody.innerHTML = rankedTerm.length
        ? rankedTerm.slice(0, 10).map(function (row) {
          return '<tr data-class="' + escapeHtml(row.className) + '" data-seat="' + escapeHtml(String(row.seatNo)) + '">' +
            '<td>' + rankAmong(row.total, schoolTotals) + '</td>' +
            '<td>' + escapeHtml(row.className) + '</td>' +
            '<td>' + escapeHtml(row.seatNo) + '</td>' +
            '<td>' + escapeHtml(row.name) + '</td>' +
            '<td class="col-total">' + fmtMaybe(row.total) + '</td>' +
            '<td>' + fmtMaybe(row.quiz) + '</td>' +
            '<td>' + fmtMaybe(row.exam) + '</td>' +
            '<td class="' + scoreCellClass(row.classRaw) + '">' + scoreCellText(row.classRaw) + '</td>' +
            '</tr>';
        }).join('')
        : '<tr><td colspan="8">尚無學期成績</td></tr>';
    }
    App.schoolClassNames = names;
    App.schoolPapers = collectSchoolPapers(rawClasses);
    renderSchoolPaper();
    renderCarePanel();
  }

  function fillPersonSelect(people) {
    if (!els.statsPersonSelect) return;
    var list = people || App.statsPeople || [];
    if (!list.length) {
      els.statsPersonSelect.innerHTML = '<option value="">這個班還沒有學生</option>';
      return;
    }
    if (!App.statsSeatNo || !list.filter(function (row) { return String(row.seatNo) === String(App.statsSeatNo); }).length) {
      App.statsSeatNo = list[0].seatNo;
    }
    els.statsPersonSelect.innerHTML = list.slice().sort(seatOrder).map(function (row) {
      return '<option value="' + escapeHtml(String(row.seatNo)) + '"' +
        (String(row.seatNo) === String(App.statsSeatNo) ? ' selected' : '') + '>' +
        escapeHtml(row.seatNo + '　' + row.name) + '</option>';
    }).join('');
  }

  function shiftStatsPerson(dir) {
    var list = (App.statsPeople || []).slice().sort(seatOrder);
    if (!list.length) return;
    var i = 0;
    list.forEach(function (row, idx) {
      if (String(row.seatNo) === String(App.statsSeatNo)) i = idx;
    });
    i = (i + dir + list.length) % list.length;
    App.statsSeatNo = list[i].seatNo;
    fillPersonSelect(list);
    renderPersonStats();
  }

  function vsClassText(mine, avg) {
    if (mine == null || avg == null) return '尚無資料可比較';
    var d = round1(mine - avg);
    if (d > 0) return '高於全班平均 ' + d + ' 分';
    if (d < 0) return '低於全班平均 ' + Math.abs(d) + ' 分';
    return '與全班平均相同';
  }

  /** 全校排名：全校資料還沒讀過就先讀一次，讀完再重畫個人頁。 */
  function personSchoolRank(className, person) {
    var packs = App.schoolPacks;
    if (!packs) {
      if (App.statsView === 'person' && !App.schoolPersonBusy) {
        App.schoolPersonBusy = true;
        api('listSchoolOverview', []).then(function (data) {
          App.schoolPersonBusy = false;
          App.schoolPacks = ((data && data.classes) || []).filter(function (pack) {
            return isSchoolClassName(pack.className);
          }).map(summarizeClassPack);
          if (App.statsView === 'person') renderPersonStats();
        }).catch(function () {
          App.schoolPersonBusy = false;
          App.schoolPacks = [];
        });
      }
      return { text: '讀取中…', pct: null };
    }
    var totals = [];
    packs.forEach(function (pack) {
      pack.people.forEach(function (row) { if (row.total != null) totals.push(row.total); });
    });
    if (person.total == null || !totals.length) return { text: '尚無學期成績', pct: null };
    var rank = rankAmong(person.total, totals);
    return {
      text: rank == null ? '—' : rank + ' / ' + totals.length,
      pct: percentileRank(person.total, totals)
    };
  }

  function personAssessItems(people, person) {
    var book = App.gradebook || emptyGradebook();
    var items = [];
    function addScore(group, cols) {
      byColDate(cols).forEach(function (col) {
        var leave = isLeaveScore(readSeatScore(col.scores, person.seatNo));
        var mine = leave ? null : columnScore100(col, person.seatNo);
        var info = analyzeScoreColumn(col, people);
        var classVals = numsOf(people.map(function (row) { return columnScore100(col, row.seatNo); }));
        items.push({
          group: group,
          title: col.title || group,
          mine: mine,
          classAvg: info.avg,
          rank: mine == null ? null : rankAmong(mine, classVals),
          rankOf: classVals.length,
          note: leave ? '請假' : (mine == null ? '未填' : '')
        });
      });
    }
    addScore('黃卷', book.yellow);
    addScore('早自習', book.morning);
    addScore('段考', book.exams);
    addScore('實作評量', book.labs);
    addScore('實作成績', book.practicals);
    byColDate(book.homeworks).forEach(function (col) {
      var result = homeworkResult(col, person.seatNo);
      var info = analyzeHomeworkColumn(col, people);
      var mine = result.status === 'missing' ? 0 : result.final;
      items.push({
        group: '作業',
        title: col.title || '作業',
        mine: mine,
        classAvg: info.avg,
        note: result.status === 'missing' ? '未繳' : (result.late ? '遲交' : (result.final == null ? '已繳未評' : ''))
      });
    });
    return items;
  }

  function renderPersonStats() {
    var model = App.statsModel || App.sheetModel || buildSheetModel();
    var people = App.statsPeople || enrichStatsRows(model);
    if (!people.length) return;
    var person = people.filter(function (row) {
      return String(row.seatNo) === String(App.statsSeatNo);
    })[0] || people[0];
    App.statsSeatNo = person.seatNo;
    if (els.statsPersonSelect) els.statsPersonSelect.value = String(person.seatNo);

    var termScores = people.map(function (row) { return row.total; }).filter(function (n) { return n != null; });
    var usualAvg = meanOf(people.map(function (row) { return row.usual; }));
    var quizAvg = meanOf(people.map(function (row) { return row.quiz; }));
    var examAvg = meanOf(people.map(function (row) { return row.exam; }));
    var classRawAvg = meanOf(people.map(function (row) { return row.classRaw; }));
    var rank = rankAmong(person.total, termScores);
    var items = personAssessItems(people, person);
    var school = personSchoolRank(model.className || teacherTargetClass(), person);

    if (els.personCards) {
      els.personCards.innerHTML =
        statCard('學生', person.seatNo + ' ' + person.name) +
        statCard('班排名', rank == null ? '尚無學期成績' : rank + ' / ' + termScores.length) +
        statCard('全校排名', school.text) +
        statCard('全校百分位', school.pct == null ? '—' : '贏過 ' + school.pct + '%') +
        statCard('學期總分', fmtMaybe(person.total)) +
        statCard('平時', fmtMaybe(person.usual)) +
        statCard('平時考試', fmtMaybe(person.quiz)) +
        statCard('段考', fmtMaybe(person.exam)) +
        statCard('加扣合計', scoreCellText(person.classRaw)) +
        statCard('有紀錄天數', person.activeDays + ' / ' + (model.dates || []).length);
    }
    if (els.personWatch) {
      var cards = [];
      cards.push(watchCard(person.total != null && termScores.length && person.total >= meanOf(termScores) ? 'good' : 'info',
        '學期表現', vsClassText(person.total, meanOf(termScores))));
      studentTypes().forEach(function (type) {
        var flag = (person.types || []).filter(function (t) { return t.key === type.key; })[0];
        if (flag) cards.push(watchCard(type.tone, type.label, flag.detail + '。' + type.hint));
      });
      cards.push(watchCard(person.trend != null && person.trend >= 1 ? 'good' : (person.trend != null && person.trend <= -1 ? 'warn' : 'info'),
        '加扣走勢', person.trend == null ? '紀錄天數還少，還看不出前後半段變化' : (person.trend >= 0 ? '後半段比前半段 +' + person.trend : '後半段比前半段 ' + person.trend)));
      cards.push(watchCard(person.hwMissing ? 'alert' : 'good',
        '作業', person.hwMissing ? '未繳 ' + person.hwMissing + ' 次' + (person.hwLate ? '，遲交 ' + person.hwLate + ' 次' : '') : '目前沒有未繳作業'));
      cards.push(watchCard(person.leaveCount ? 'warn' : 'info',
        '請假', person.leaveCount ? '考試請假 ' + person.leaveCount + ' 次' : '沒有請假紀錄'));
      if (!person.activeDays) cards.push(watchCard('warn', '上課參與', '還沒有加扣分紀錄'));
      var caused = (App.groupDeductions || []).filter(function (r) {
        return String(r.causeSeatNo) === String(person.seatNo) && r.causeName;
      });
      if (caused.length) {
        cards.push(watchCard('alert', '讓小組被扣分', '共 ' + caused.length + ' 次'));
      }
      els.personWatch.innerHTML = cards.join('');
    }

    var formulaEl = document.getElementById('personFormula');
    if (formulaEl) {
      var usualBits = [];
      if (person.hasClass) usualBits.push('上課 ' + usualFromRaw(person.classRaw));
      if (person.labAvg != null) usualBits.push('實作評量 ' + person.labAvg);
      if (person.pracAvg != null) usualBits.push('實作成績 ' + person.pracAvg);
      if (person.hwAvg != null) usualBits.push('作業 ' + person.hwAvg);
      var quizBits = [];
      if (person.yellowAvg != null) quizBits.push('黃卷平均 ' + person.yellowAvg);
      if (person.morningAvg != null) quizBits.push('早自習平均 ' + person.morningAvg);
      var notes = (person.check && person.check.notes) || [];
      formulaEl.innerHTML = '<ul class="formula-list">' +
        '<li><strong>平時 ' + escapeHtml(fmtMaybe(person.usual)) + '</strong>　' +
          escapeHtml(usualBits.length ? usualBits.join('、') + ' 的平均' : '沒有上課加扣、實作或作業') + '</li>' +
        '<li><strong>平時考試 ' + escapeHtml(fmtMaybe(person.quiz)) + '</strong>　' +
          escapeHtml(quizBits.length ? quizBits.join('、') + '（每張一起平均）' : '沒有黃卷或早自習分數') + '</li>' +
        '<li><strong>段考 ' + escapeHtml(fmtMaybe(person.exam)) + '</strong>　' +
          escapeHtml(person.exam != null ? '各次段考平均' : '沒有段考分數') + '</li>' +
        '<li><strong>學期總分</strong>　' + escapeHtml(scoreFormula(person.usual, person.quiz, person.exam)) + '</li>' +
        '</ul>' +
        (notes.length
          ? '<p class="formula-warn">要核對：' + escapeHtml(notes.join('；')) + '</p>'
          : '<p class="hint">各項都有成績，沒有空白。</p>');
    }

    var radarMine = [person.usual, person.quiz, person.exam];
    var radarClass = [usualAvg, quizAvg, examAvg];
    var hasRadar = radarMine.every(function (n, i) { return n != null && radarClass[i] != null; });
    if (els.chartPersonRadar) {
      els.chartPersonRadar.innerHTML = hasRadar
        ? svgRadar(['平時', '平時考試', '段考'], [
          { label: '自己', color: '#2f6f8f', fill: 'rgba(47,111,143,0.22)', values: radarMine },
          { label: '全班平均', color: '#9aa8b0', fill: 'rgba(154,168,176,0.12)', values: radarClass }
        ])
        : chartEmpty('平時、平時考試、段考三項都有成績後才畫雷達圖；目前請看右邊的比較圖');
    }
    if (els.chartPersonVsClass) {
      els.chartPersonVsClass.innerHTML = svgPairBars(
        ['平時', '平時考試', '段考', '加扣合計'],
        [person.usual, person.quiz, person.exam, person.classRaw],
        [usualAvg, quizAvg, examAvg, classRawAvg],
        ['自己', '全班平均']
      );
    }
    if (els.chartPersonTrend) {
      var labels = (model.dates || []).map(function (day) { return shortDate(day.date); });
      els.chartPersonTrend.innerHTML = labels.length
        ? svgLine(labels, person.cells || [], { compare: model.dayAvgs || [], compareColor: '#9aa8b0' })
        : chartEmpty('有上課加扣後，這裡會出現個人走勢');
    }
    if (els.chartPersonPlusMinus) {
      els.chartPersonPlusMinus.innerHTML = svgBars(
        ['加分總和', '扣分總和'],
        [person.plusSum || 0, person.minusSum || 0],
        { zeroLine: true }
      );
    }
    if (els.chartPersonHw) {
      var hwTotal = ((App.gradebook && App.gradebook.homeworks) || []).length;
      els.chartPersonHw.innerHTML = svgBars(
        ['已繳作業', '未繳作業', '遲交', '請假'],
        [Math.max(0, hwTotal - (person.hwMissing || 0)), person.hwMissing || 0, person.hwLate || 0, person.leaveCount || 0],
        { zeroLine: false, barColors: ['#2c7a4b', '#b4413c', '#d9852b', '#7eb6d6'] }
      );
    }
    if (els.chartPersonAssess) {
      var shown = items.filter(function (it) { return it.mine != null || it.classAvg != null; });
      els.chartPersonAssess.innerHTML = shown.length
        ? svgPairBars(
          shown.map(function (it) { return it.title; }),
          shown.map(function (it) { return it.mine; }),
          shown.map(function (it) { return it.classAvg; }),
          ['自己', '全班平均']
        )
        : chartEmpty('輸入考卷或作業後，這裡會比較每一次成績');
    }
    if (els.chartPersonPct) {
      var pct = percentileRank(person.total, termScores);
      els.chartPersonPct.innerHTML = pct == null
        ? chartEmpty('有學期總分後，這裡會顯示他贏過全班多少比例')
        : svgPercentile(pct, person.name + ' 贏過全班 ' + pct + '% 的同學');
    }
    if (els.chartPersonBand) {
      els.chartPersonBand.innerHTML = termScores.length
        ? svgStrip(termScores, person.total, '學期總分')
        : chartEmpty('有學期總分後，藍點是這位學生，灰點是全班');
    }
    if (els.chartPersonSeries) {
      var seriesMine = items.map(function (it) { return it.mine; });
      var seriesAvg = items.map(function (it) { return it.classAvg; });
      var seriesLabels = items.map(function (it) { return it.title; });
      els.chartPersonSeries.innerHTML = items.length
        ? svgLine(seriesLabels, seriesMine, {
          compare: seriesAvg,
          compareColor: '#9aa8b0'
        })
        : chartEmpty('輸入各次成績後，這裡會出現個人成績折線');
    }
    if (els.personAssessTable) {
      els.personAssessTable.innerHTML = items.length
        ? '<table class="assess-table"><thead><tr><th>類型</th><th>名稱</th><th>自己</th><th>班排</th><th>全班平均</th><th>比較</th><th>備註</th></tr></thead><tbody>' +
          items.map(function (it) {
            return '<tr><td>' + escapeHtml(it.group) + '</td><td>' + escapeHtml(it.title) + '</td><td>' +
              fmtMaybe(it.mine) + '</td><td>' + (it.rank == null ? '—' : it.rank + ' / ' + it.rankOf) + '</td><td>' +
              fmtMaybe(it.classAvg) + '</td><td>' +
              escapeHtml(vsClassText(it.mine, it.classAvg)) + '</td><td>' +
              escapeHtml(it.note || '') + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<p class="chart-empty">還沒有個人考卷或作業紀錄。</p>';
    }
    paintPersonGroupDeduct();
  }

  var PAPER_KINDS = [
    { kind: 'yellow', label: '黃卷' },
    { kind: 'morning', label: '早自習' },
    { kind: 'exams', label: '段考' },
    { kind: 'labs', label: '實作評量' },
    { kind: 'practicals', label: '實作成績' }
  ];

  function paperKeyOf(kind, col, index) {
    return kind + ':' + (col && col.id ? col.id : '#' + index);
  }

  function listStatsPapers() {
    var book = App.gradebook || emptyGradebook();
    var out = [];
    PAPER_KINDS.forEach(function (meta) {
      var raw = book[meta.kind] || [];
      var cols = byColDate(raw);
      cols.forEach(function (col, index) {
        out.push({
          key: paperKeyOf(meta.kind, col, raw.indexOf(col)),
          kind: meta.kind,
          kindLabel: meta.label,
          col: col,
          prev: index > 0 ? cols[index - 1] : null
        });
      });
    });
    return byColDate(out.map(function (p) { return p.col; })).map(function (col) {
      return out.filter(function (p) { return p.col === col; })[0];
    });
  }

  function shiftStatsPaper(step) {
    var papers = listStatsPapers();
    if (!papers.length) return;
    var idx = -1;
    papers.forEach(function (p, i) { if (p.key === App.statsPaperKey) idx = i; });
    idx = idx < 0 ? 0 : (idx + step + papers.length) % papers.length;
    App.statsPaperKey = papers[idx].key;
    renderPaperStats(App.statsPeople || []);
    renderSchoolPaper();
  }

  function rawScoreText(col, seatNo) {
    var v = col && col.scores ? readSeatScore(col.scores, seatNo) : null;
    if (isLeaveScore(v)) return '請假';
    if (v === '' || v == null) return '—';
    return String(v) + ' / ' + (Number(col.max) || 100);
  }

  function renderPaperStats(people) {
    people = people || [];
    var select = document.getElementById('statsPaperSelect');
    var cardsEl = document.getElementById('statsPaperCards');
    var watchEl = document.getElementById('statsPaperWatch');
    var distEl = document.getElementById('chartPaperDist');
    var deltaEl = document.getElementById('chartPaperDelta');
    var bodyEl = document.getElementById('statsPaperBody');
    var papers = listStatsPapers();
    var navBtns = [document.getElementById('btnPaperPrev'), document.getElementById('btnPaperNext')];
    navBtns.forEach(function (btn) { if (btn) btn.disabled = papers.length < 2; });
    if (!papers.length) {
      if (select) select.innerHTML = '<option value="">尚無考卷</option>';
      if (cardsEl) cardsEl.innerHTML = '';
      if (watchEl) watchEl.innerHTML = '';
      if (distEl) distEl.innerHTML = chartEmpty('到「學期成績」新增黃卷、早自習、段考或實作欄位後，這裡可以逐張看');
      if (deltaEl) deltaEl.innerHTML = '';
      if (bodyEl) bodyEl.innerHTML = '<tr><td colspan="7">尚無考卷</td></tr>';
      return;
    }
    var current = null;
    papers.forEach(function (p) { if (p.key === App.statsPaperKey) current = p; });
    if (!current) {
      current = papers[papers.length - 1];
      App.statsPaperKey = current.key;
    }
    if (select) {
      select.innerHTML = papers.map(function (p) {
        var title = p.col.title || '未命名';
        var date = p.col.date ? '（' + shortDate(p.col.date) + '）' : '';
        return '<option value="' + escapeHtml(p.key) + '"' + (p.key === current.key ? ' selected' : '') + '>' +
          escapeHtml(p.kindLabel + '｜' + title + date) + '</option>';
      }).join('');
    }

    var col = current.col;
    var info = analyzeScoreColumn(col, people);
    var rows = people.map(function (row) {
      var v = columnScore100(col, row.seatNo);
      var prevV = current.prev ? columnScore100(current.prev, row.seatNo) : null;
      var raw = col.scores ? readSeatScore(col.scores, row.seatNo) : null;
      return {
        seatNo: row.seatNo,
        name: row.name,
        score: v,
        leave: isLeaveScore(raw),
        prev: prevV,
        delta: v != null && prevV != null ? round1(v - prevV) : null
      };
    });
    var scored = rows.filter(function (r) { return r.score != null; })
      .sort(function (a, b) { return b.score - a.score || seatOrder(a, b); });
    var scores = scored.map(function (r) { return r.score; });
    var avg = info.avg;
    var prevInfo = current.prev ? analyzeScoreColumn(current.prev, people) : null;
    var avgDelta = prevInfo && prevInfo.avg != null && avg != null ? round1(avg - prevInfo.avg) : null;
    var full = scored.filter(function (r) { return r.score >= 100; });
    var low = scored.filter(function (r) { return r.score < 60; }).sort(function (a, b) { return a.score - b.score; });
    var leaves = rows.filter(function (r) { return r.leave; });
    var blanks = rows.filter(function (r) { return r.score == null && !r.leave; });

    if (cardsEl) {
      cardsEl.innerHTML = scores.length
        ? statCard('全班平均', fmtMaybe(avg)) +
          statCard('中位數', fmtMaybe(medianOf(scores))) +
          statCard('標準差', stdevOf(scores)) +
          statCard('最高／最低', info.max + '／' + info.min) +
          statCard('及格率', fmtMaybe(info.passRate, '%')) +
          statCard('有成績', info.n + ' / ' + people.length) +
          statCard('比上一次平均', avgDelta == null ? '—' : (avgDelta > 0 ? '+' : '') + avgDelta) +
          statCard('滿分', Number(col.max) || 100)
        : statCard('這張考卷', '還沒有輸入分數');
    }

    if (watchEl) {
      var cards = [];
      cards.push(watchCard('good', '最高分', scored.length ? tiedText(topTiedRows(scored, 'score'), 'score', 5) : '尚無'));
      if (full.length) cards.push(watchCard('good', '滿分', peopleText(full, 5)));
      cards.push(watchCard(low.length ? 'alert' : 'good', '未滿 60 分', low.length
        ? low.slice(0, 5).map(function (r) { return r.seatNo + ' ' + r.name + '（' + r.score + '）'; }).join('、') +
          (low.length > 5 ? ' 等 ' + low.length + ' 人' : '')
        : '全部及格'));
      if (leaves.length || blanks.length) {
        var bits = [];
        if (leaves.length) bits.push('請假 ' + peopleText(leaves, 4));
        if (blanks.length) bits.push('未填 ' + peopleText(blanks, 4));
        cards.push(watchCard('warn', '請假／未填', bits.join('；')));
      }
      if (current.prev) {
        cards.push(watchCard('info', '比較對象', current.kindLabel + '上一次：' + (current.prev.title || '未命名') +
          (prevInfo && prevInfo.avg != null ? '（平均 ' + prevInfo.avg + '）' : '')));
      }
      watchEl.innerHTML = cards.join('');
    }

    if (distEl) {
      var dist = scoreBands(scores);
      distEl.innerHTML = dist.n
        ? svgBars(dist.bands.map(function (b) { return b.label; }), dist.bands.map(function (b) { return b.count; }), {
          zeroLine: false,
          barColors: ['#2c7a4b', '#5aa576', '#d9a441', '#d9852b', '#b4413c']
        })
        : chartEmpty('這張考卷還沒有分數');
    }

    if (deltaEl) {
      var movers = rows.filter(function (r) { return r.delta != null && r.delta !== 0; })
        .sort(function (a, b) { return b.delta - a.delta; });
      var pick = movers.slice(0, 5).concat(movers.length > 5 ? movers.slice(-5).filter(function (r) {
        return movers.indexOf(r) >= 5;
      }) : []);
      deltaEl.innerHTML = !current.prev
        ? chartEmpty('這是' + current.kindLabel + '第一次，還沒有上一次可以比')
        : (pick.length
          ? svgHBars(pick.map(function (r) { return r.seatNo + ' ' + r.name; }), pick.map(function (r) { return r.delta; }))
          : chartEmpty('和上一次相比沒有變化'));
    }

    if (bodyEl) {
      var ordered = scored.concat(rows.filter(function (r) { return r.score == null; }));
      bodyEl.innerHTML = ordered.length ? ordered.map(function (r) {
        var rank = r.score != null ? rankAmong(r.score, scores) : '—';
        var diff = r.score != null && avg != null ? round1(r.score - avg) : null;
        var diffCls = diff == null ? '' : (diff >= 0 ? 'day-plus' : 'day-minus');
        var deltaCls = r.delta == null ? '' : (r.delta >= 0 ? 'day-plus' : 'day-minus');
        return '<tr data-seat="' + escapeHtml(String(r.seatNo)) + '">' +
          '<td>' + rank + '</td>' +
          '<td>' + escapeHtml(r.seatNo) + '</td>' +
          '<td>' + escapeHtml(r.name) + '</td>' +
          '<td>' + escapeHtml(rawScoreText(col, r.seatNo)) + '</td>' +
          '<td>' + fmtMaybe(r.score) + '</td>' +
          '<td class="' + diffCls + '">' + (diff == null ? '—' : (diff > 0 ? '+' : '') + diff) + '</td>' +
          '<td class="' + deltaCls + '">' + (r.delta == null ? '—' : (r.delta > 0 ? '+' : '') + r.delta) + '</td>' +
          '</tr>';
      }).join('') : '<tr><td colspan="7">尚無學生</td></tr>';
    }
  }

  function chartEmpty(text) {
    return '<p class="chart-empty">' + escapeHtml(text) + '</p>';
  }

  function renderCharts(model, people) {
    people = people || enrichStatsRows(model);
    if (els.chartTrend) {
      var labels = (model.dates || []).map(function (day) { return shortDate(day.date); });
      els.chartTrend.innerHTML = labels.length
        ? svgLine(labels, model.dayAvgs || [])
        : chartEmpty('有上課加扣紀錄之後，這裡會出現每天全班平均走勢');
    }
    if (els.chartRank) {
      var top10 = (model.ranked || []).slice(0, 10);
      els.chartRank.innerHTML = top10.length
        ? svgHBars(top10.map(function (row) { return row.seatNo + ' ' + row.name; }), top10.map(function (row) { return row.classRaw != null ? row.classRaw : row.total; }))
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
    if (els.chartTerm) {
      var bands = [
        { label: '90↑', count: 0 },
        { label: '80–89', count: 0 },
        { label: '70–79', count: 0 },
        { label: '60–69', count: 0 },
        { label: '未滿60', count: 0 }
      ];
      var hasTerm = 0;
      people.forEach(function (row) {
        if (row.total == null) return;
        hasTerm += 1;
        if (row.total >= 90) bands[0].count += 1;
        else if (row.total >= 80) bands[1].count += 1;
        else if (row.total >= 70) bands[2].count += 1;
        else if (row.total >= 60) bands[3].count += 1;
        else bands[4].count += 1;
      });
      els.chartTerm.innerHTML = hasTerm
        ? svgBars(bands.map(function (b) { return b.label; }), bands.map(function (b) { return b.count; }), {
          zeroLine: false,
          barColors: ['#2c7a4b', '#5aa576', '#d9a441', '#d9852b', '#b4413c']
        })
        : chartEmpty('有學期總分之後，這裡會顯示 90／80／70／60 分段人數');
    }
  }

  function numsOf(list) {
    return (list || []).filter(function (n) { return n != null && isFinite(n); });
  }

  /** 成績欄依考試日期排；沒填日期的放後面、維持原本順序。 */
  function byColDate(cols) {
    return (cols || []).map(function (col, i) { return { col: col, i: i }; }).sort(function (a, b) {
      var da = a.col && a.col.date ? String(a.col.date) : '';
      var db = b.col && b.col.date ? String(b.col.date) : '';
      if (da && db && da !== db) return da < db ? -1 : 1;
      if (!da !== !db) return da ? -1 : 1;
      return a.i - b.i;
    }).map(function (item) { return item.col; });
  }

  /** 同分同名次（95、95、90 → 1、1、3）；沒有分數回 null。 */
  function rankAmong(value, values) {
    if (value == null || !isFinite(value)) return null;
    var rank = 1;
    (values || []).forEach(function (v) {
      if (v != null && isFinite(v) && v > value) rank += 1;
    });
    return rank;
  }

  function topTiedRows(rows, key) {
    var list = (rows || []).filter(function (row) { return row[key] != null && isFinite(row[key]); });
    if (!list.length) return [];
    var best = Math.max.apply(null, list.map(function (row) { return row[key]; }));
    return list.filter(function (row) { return row[key] === best; }).sort(function (a, b) {
      return String(a.className || '').localeCompare(String(b.className || '')) || seatOrder(a, b);
    });
  }

  function tiedText(rows, key, limit, withClass) {
    if (!rows.length) return '—';
    limit = limit || 3;
    var names = rows.slice(0, limit).map(function (row) {
      return (withClass && row.className ? row.className + ' ' : '') + row.seatNo + ' ' + row.name;
    });
    return names.join('、') + (rows.length > limit ? ' 等 ' + rows.length + ' 人' : '') + '（' + rows[0][key] + '）';
  }

  function percentileRank(value, list) {
    var nums = numsOf(list).slice().sort(function (a, b) { return a - b; });
    if (value == null || !nums.length) return null;
    var below = 0;
    nums.forEach(function (n) { if (n < value) below += 1; });
    return round1(below / nums.length * 100);
  }

  function listAssessColumns() {
    var book = App.gradebook || emptyGradebook();
    var out = [];
    function push(group, cols, homework) {
      byColDate(cols).forEach(function (col) {
        out.push({ group: group, col: col, homework: !!homework, title: col.title || group });
      });
    }
    push('黃卷', book.yellow);
    push('早自習', book.morning);
    push('段考', book.exams);
    push('實作評量', book.labs);
    push('實作成績', book.practicals);
    push('作業', book.homeworks, true);
    return out;
  }

  /** 不分類型、全部依日期排（各類型內原本順序不變）。 */
  function specsByDate(specs) {
    var list = specs || [];
    return byColDate(list.map(function (spec) { return spec.col; })).map(function (col) {
      return list.filter(function (spec) { return spec.col === col; })[0];
    });
  }

  function scoreForColumn(colSpec, seatNo) {
    if (colSpec.homework) {
      var result = homeworkResult(colSpec.col, seatNo);
      if (result.status === 'missing') return 0;
      return result.final;
    }
    if (isLeaveScore(readSeatScore(colSpec.col.scores, seatNo))) return null;
    return columnScore100(colSpec.col, seatNo);
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
      if (v == null || !isFinite(v)) return;
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
      if (v == null || !isFinite(v)) {
        return '<text x="' + (x + bw / 2) + '" y="' + (zeroY - 4) + '" text-anchor="middle" font-size="11" fill="#9aa8b0">無<title>' +
          escapeHtml(labels[i] + '：尚無資料') + '</title></text>';
      }
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
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart-svg chart-fixed" role="img">' + axis + bars + xlabels + maxLabel + '</svg>';
  }

  function svgHBars(labels, values) {
    var w = 640;
    var rowH = 28;
    var h = Math.max(120, labels.length * rowH + 16);
    var l = 128;
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

  function svgLine(labels, values, opts) {
    opts = opts || {};
    var compare = opts.compare || null;
    var w = 640;
    var h = 220;
    var l = 36;
    var r = 16;
    var t = 16;
    var b = 44;
    var iw = w - l - r;
    var ih = h - t - b;
    var max = 1;
    var min = 0;
    function scan(list) {
      (list || []).forEach(function (v) {
        if (v == null || !isFinite(v)) return;
        if (v > max) max = v;
        if (v < min) min = v;
      });
    }
    scan(values);
    scan(compare);
    if (max === min) max = min + 1;
    var span = max - min;
    function xOf(i, len) {
      return l + (len <= 1 ? iw / 2 : i * iw / (len - 1));
    }
    function yOf(v) {
      return t + ih - ((v - min) / span) * ih;
    }
    function series(list, color, filled) {
      if (!list || !list.length) return '';
      var chunks = [];
      var cur = [];
      list.forEach(function (v, i) {
        if (v == null || !isFinite(Number(v))) {
          if (cur.length) { chunks.push(cur); cur = []; }
          return;
        }
        cur.push(i);
      });
      if (cur.length) chunks.push(cur);
      var lines = chunks.map(function (idx) {
        if (idx.length < 2) return '';
        var pts = idx.map(function (i) { return xOf(i, list.length) + ',' + yOf(Number(list[i])); }).join(' ');
        return '<polyline fill="none" stroke="' + color + '" stroke-width="2.5" points="' + pts + '"/>';
      }).join('');
      var dots = list.map(function (v, i) {
        if (v == null || !isFinite(Number(v))) return '';
        return '<circle cx="' + xOf(i, list.length) + '" cy="' + yOf(Number(v)) + '" r="3.5" fill="' +
          (filled ? color : '#fff') + '" stroke="' + color + '" stroke-width="2">' +
          '<title>' + escapeHtml(labels[i] + '：' + v) + '</title></circle>';
      }).join('');
      return lines + dots;
    }
    var zeroY = yOf(0);
    var step = Math.max(1, Math.ceil(labels.length / 8));
    var xlabels = labels.map(function (lb, i) {
      if (i % step && i !== labels.length - 1) return '';
      return '<text x="' + xOf(i, labels.length) + '" y="' + (h - 16) + '" text-anchor="middle" font-size="11" fill="#5b7380">' +
        escapeHtml(lb) + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart-svg chart-fixed" role="img">' +
      '<line x1="' + l + '" y1="' + zeroY + '" x2="' + (w - r) + '" y2="' + zeroY + '" stroke="#d9d0c1"/>' +
      series(compare, opts.compareColor || '#9aa8b0', false) +
      series(values, '#2f6f8f', true) +
      xlabels +
      '<text x="8" y="' + (t + 10) + '" font-size="11" fill="#5b7380">' + max + '</text>' +
      '</svg>';
  }

  function svgRadar(labels, series) {
    var w = 420;
    var h = 280;
    var cx = 210;
    var cy = 138;
    var R = 92;
    var n = Math.max(labels.length, 3);
    function pt(i, ratio) {
      var ang = -Math.PI / 2 + (Math.PI * 2 * i) / n;
      return [cx + R * ratio * Math.cos(ang), cy + R * ratio * Math.sin(ang)];
    }
    var rings = [0.25, 0.5, 0.75, 1].map(function (ratio) {
      var pts = [];
      var i;
      for (i = 0; i < n; i++) pts.push(pt(i, ratio).join(','));
      return '<polygon points="' + pts.join(' ') + '" fill="none" stroke="#e4dbcc"/>';
    }).join('');
    var spokes = labels.map(function (lb, i) {
      var p = pt(i, 1);
      var lp = pt(i, 1.18);
      return '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#e4dbcc"/>' +
        '<text x="' + lp[0] + '" y="' + (lp[1] + 4) + '" text-anchor="middle" font-size="12" fill="#16303c">' +
        escapeHtml(lb) + '</text>';
    }).join('');
    var shapes = (series || []).map(function (item) {
      var pts = (item.values || []).map(function (v, i) {
        return pt(i, Math.max(0, Math.min(1, (Number(v) || 0) / 100))).join(',');
      }).join(' ');
      return '<polygon points="' + pts + '" fill="' + (item.fill || 'none') + '" stroke="' +
        (item.color || '#2f6f8f') + '" stroke-width="2"></polygon>';
    }).join('');
    var legend = (series || []).map(function (item, i) {
      var x = 24 + i * 150;
      return '<rect x="' + x + '" y="' + (h - 22) + '" width="12" height="12" fill="' + (item.color || '#2f6f8f') + '"/>' +
        '<text x="' + (x + 18) + '" y="' + (h - 12) + '" font-size="12" fill="#5b7380">' + escapeHtml(item.label || '') + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart-svg chart-fixed" role="img">' + rings + spokes + shapes + legend + '</svg>';
  }

  function svgPairBars(labels, mine, klass, legends) {
    var w = 640;
    var h = Math.max(200, 56 + labels.length * 28);
    var l = 96;
    var r = 16;
    var t = 12;
    var b = 28;
    var iw = w - l - r;
    var all = (mine || []).concat(klass || []);
    var max = 1;
    var min = 0;
    all.forEach(function (v) {
      if (v == null || !isFinite(v)) return;
      if (v > max) max = v;
      if (v < min) min = v;
    });
    if (max === min) max = min + 1;
    var span = max - min;
    function xOf(v) {
      return l + ((Number(v) || 0) - min) / span * iw;
    }
    var zeroX = xOf(0);
    var rows = labels.map(function (lb, i) {
      var y = t + i * 28;
      var a = mine[i];
      var b = klass[i];
      var barH = 8;
      var aRect = a == null ? '' : '<rect x="' + Math.min(zeroX, xOf(a)) + '" y="' + (y + 2) + '" width="' +
        Math.max(2, Math.abs(xOf(a) - zeroX)) + '" height="' + barH + '" fill="#2f6f8f"></rect>';
      var bRect = b == null ? '' : '<rect x="' + Math.min(zeroX, xOf(b)) + '" y="' + (y + 12) + '" width="' +
        Math.max(2, Math.abs(xOf(b) - zeroX)) + '" height="' + barH + '" fill="#c5d0d6"></rect>';
      return '<text x="8" y="' + (y + 14) + '" font-size="11" fill="#16303c">' + escapeHtml(lb) + '</text>' + aRect + bRect;
    }).join('');
    var names = legends || ['自己', '全班平均'];
    var legend = '<rect x="' + l + '" y="' + (h - 18) + '" width="12" height="12" fill="#2f6f8f"/>' +
      '<text x="' + (l + 16) + '" y="' + (h - 8) + '" font-size="11" fill="#5b7380">' + escapeHtml(names[0]) + '</text>' +
      '<rect x="' + (l + 90) + '" y="' + (h - 18) + '" width="12" height="12" fill="#c5d0d6"/>' +
      '<text x="' + (l + 106) + '" y="' + (h - 8) + '" font-size="11" fill="#5b7380">' + escapeHtml(names[1] || '') + '</text>';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart-svg" role="img">' +
      '<line x1="' + zeroX + '" y1="' + t + '" x2="' + zeroX + '" y2="' + (h - b) + '" stroke="#d9d0c1"/>' +
      rows + legend + '</svg>';
  }

  function svgPercentile(pct, label) {
    var w = 640;
    var h = 90;
    var l = 24;
    var r = 24;
    var y = 42;
    var iw = w - l - r;
    var x = l + pct / 100 * iw;
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart-svg" role="img">' +
      '<rect x="' + l + '" y="' + (y - 8) + '" width="' + iw + '" height="16" rx="8" fill="#e8eef2"/>' +
      '<rect x="' + l + '" y="' + (y - 8) + '" width="' + Math.max(8, pct / 100 * iw) + '" height="16" rx="8" fill="#7eb6d6"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="9" fill="#1b3a4b"/>' +
      '<text x="' + (w / 2) + '" y="78" text-anchor="middle" font-size="14" fill="#16303c">' + escapeHtml(label) + '</text>' +
      '<text x="' + l + '" y="18" font-size="11" fill="#5b7380">0%</text>' +
      '<text x="' + (w - r) + '" y="18" text-anchor="end" font-size="11" fill="#5b7380">100%</text></svg>';
  }

  function svgStrip(values, mark, label) {
    var w = 640;
    var h = 110;
    var l = 28;
    var r = 28;
    var y = 58;
    var iw = w - l - r;
    var min = Math.min.apply(null, values.concat([mark == null ? 0 : mark]));
    var max = Math.max.apply(null, values.concat([mark == null ? 100 : mark]));
    if (min === max) max = min + 1;
    function xOf(v) { return l + (v - min) / (max - min) * iw; }
    var dots = values.map(function (v) {
      return '<circle cx="' + xOf(v) + '" cy="' + y + '" r="5" fill="#c5d0d6"></circle>';
    }).join('');
    var mine = mark == null ? '' : '<circle cx="' + xOf(mark) + '" cy="' + y + '" r="8" fill="#2f6f8f">' +
      '<title>' + escapeHtml(label + ' ' + mark) + '</title></circle>';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart-svg" role="img">' +
      '<line x1="' + l + '" y1="' + y + '" x2="' + (w - r) + '" y2="' + y + '" stroke="#d9d0c1"/>' +
      dots + mine +
      '<text x="' + l + '" y="24" font-size="11" fill="#5b7380">' + min + '</text>' +
      '<text x="' + (w - r) + '" y="24" text-anchor="end" font-size="11" fill="#5b7380">' + max + '</text>' +
      '<text x="' + (w / 2) + '" y="98" text-anchor="middle" font-size="12" fill="#5b7380">灰點全班，藍點這位學生</text></svg>';
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

  var xlsxWaiters = null;

  function withXlsx(done) {
    if (typeof XLSX !== 'undefined') {
      done(XLSX);
      return;
    }
    if (xlsxWaiters) {
      xlsxWaiters.push(done);
      return;
    }
    xlsxWaiters = [done];
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async = true;
    script.onload = function () {
      var queue = xlsxWaiters || [];
      xlsxWaiters = null;
      if (typeof XLSX === 'undefined') {
        toast('Excel 功能載入失敗，請重新整理後再試');
        return;
      }
      queue.forEach(function (fn) {
        try { fn(XLSX); } catch (err) {}
      });
    };
    script.onerror = function () {
      xlsxWaiters = null;
      toast('Excel 功能載入失敗，請檢查網路後再試');
    };
    document.head.appendChild(script);
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
          var rec = readHwRecord(field.col.records, stu.seatNo);
          if (field.kind === 'homework-status') line.push(rec.status === 'submitted' ? '已繳交' : (rec.status === 'missing' ? '未繳交' : ''));
          else if (field.kind === 'homework-score') line.push(rec.score == null || rec.score === '' ? '' : rec.score);
          else line.push(rec.submittedAt || '');
          return;
        }
        var v = readSeatScore(field.col.scores, stu.seatNo);
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
      ['4. 空白格＝不改動，匯入時會保留雲端已有分數，不會用空白蓋掉。若要在網頁清除某格，請到成績表手動清空後儲存。'],
      ['5. 填完後，回到網頁按「從 Excel 匯入」，選這個檔。'],
      ['6. 「學期總表」「每週成績」是計算結果，匯入時會略過，改了也不會寫回。'],
      ['7. 若要在 Excel 新增一欄，欄名格式請用：黃卷｜第三次　或　段考｜第一次段考　或　作業繳交｜第一次作業。'],
      ['8. 座號要和網頁名單一致，系統用座號對應學生。']
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
    if (!App.gradebookReady) {
      toast('成績還在載入，請稍後再匯入');
      return;
    }
    var headers = (rows[0] || []).map(function (h) { return String(h || '').trim(); });
    if (isReadCardSheet(headers)) {
      importReadCardRows(rows, headers);
      return;
    }
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
    var kept = 0;
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
          var rec = Object.assign({}, readHwRecord(item.col.records, seat));
          seatKeyAliases(seat).forEach(function (k) { delete item.col.records[k]; });
          if (item.kind === 'homework-status') {
            var status = parseHwStatus(raw);
            if (status) {
              rec.status = status;
              updated += 1;
            } else if (String(raw || '').trim() === '') {
              kept += 1;
            }
          } else if (item.kind === 'homework-score') {
            var parsed = parseLeaveOrScore(raw);
            if (parsed.score != null) {
              rec.score = parsed.score;
              if (!rec.status) rec.status = 'submitted';
              updated += 1;
            } else if (parsed.empty) {
              kept += 1;
            }
          } else {
            var day = parseExcelDateValue(raw);
            if (day) {
              rec.submittedAt = day;
              updated += 1;
            } else if (String(raw || '').trim() === '') {
              kept += 1;
            }
          }
          if (rec.status || rec.score != null || rec.submittedAt) {
            if (rec.status !== 'submitted' && rec.score == null) rec.status = rec.status || 'missing';
            item.col.records[String(seat)] = rec;
          }
          return;
        }
        var cell = parseLeaveOrScore(raw);
        if (cell.leave) {
          writeSeatScore(item.col.scores, seat, 'leave');
          updated += 1;
        } else if (cell.score != null) {
          writeSeatScore(item.col.scores, seat, cell.score);
          updated += 1;
        } else {
          kept += 1;
        }
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
      var msg = '已從 Excel 匯入成績（空白格會保留雲端舊分數，不會清掉）';
      if (created) msg += '，並新增 ' + created + ' 欄';
      if (updated) msg += '，更新 ' + updated + ' 格';
      toast(msg);
    }).catch(function (error) {
      toast(error && error.message ? error.message : '匯入失敗');
    });
  }

  function isReadCardSheet(headers) {
    return headers.indexOf('班級名稱') >= 0 && headers.indexOf('座號') >= 0 && headers.indexOf('成績') >= 0;
  }

  function readCardExamTitle(category) {
    var s = String(category || '').trim();
    var m = s.match(/第\s*0*(\d+)\s*次\s*(.+)$/);
    if (m) return '第' + Number(m[1]) + '次' + m[2].trim();
    return s;
  }

  function shortList(items, limit) {
    if (items.length <= limit) return items.join('、');
    return items.slice(0, limit).join('、') + ' 等 ' + items.length + ' 筆';
  }

  function importReadCardRows(rows, headers) {
    var classIdx = headers.indexOf('班級名稱');
    var seatIdx = headers.indexOf('座號');
    var scoreIdx = headers.indexOf('成績');
    var nameIdx = headers.indexOf('學生姓名');
    var catIdx = headers.indexOf('試卷分類');
    var paperIdx = headers.indexOf('試卷名稱');
    var groups = {};
    var order = [];
    var title = '';
    rows.slice(1).forEach(function (row) {
      var code = String(row[classIdx] || '').trim();
      var seat = String(row[seatIdx] || '').trim();
      var cell = parseLeaveOrScore(row[scoreIdx]);
      if (!code || !seat || cell.empty) return;
      if (!title) {
        title = readCardExamTitle(catIdx >= 0 ? row[catIdx] : '') ||
          String(paperIdx >= 0 ? row[paperIdx] || '' : '').trim();
      }
      if (!groups[code]) {
        groups[code] = [];
        order.push(code);
      }
      groups[code].push({
        seatNo: seat,
        name: nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '',
        score: cell.leave ? 'leave' : cell.score
      });
    });
    if (!order.length) {
      toast('檔案裡沒有可匯入的成績');
      return;
    }
    var payload = {
      type: 'exam',
      title: title || '學科競試',
      date: App.activeDate || formatDateKey(new Date()),
      groups: order.map(function (code) { return { classCode: code, rows: groups[code] }; })
    };
    api('importReadCardScores', [Object.assign({ dryRun: true }, payload)]).then(function (report) {
      if (!report.classes.length) {
        toast('檔案裡的班級（' + order.join('、') + '）對不到網頁上的班級', 7000);
        return;
      }
      var lines = ['要把「' + report.title + '」匯入「段考」嗎？', ''];
      report.classes.forEach(function (c) { lines.push(c.className + '：' + c.count + ' 人'); });
      if (report.unmatchedClasses.length) lines.push('', '對不到網頁班級，會略過：' + report.unmatchedClasses.join('、'));
      if (report.missingSeats.length) lines.push('', '名單裡沒有這個座號，會略過：' + shortList(report.missingSeats, 8));
      if (report.nameMismatch.length) lines.push('', '座號對得到但姓名不同（仍依座號匯入，請確認）：' + shortList(report.nameMismatch, 8));
      lines.push('', '各班共用同一個段考欄；同名欄位已存在時，會覆蓋檔案裡這些座號的分數。');
      if (!window.confirm(lines.join('\n'))) return;
      var className = teacherTargetClass();
      clearTimeout(gradeSaveTimer);
      gradeSaveTimer = null;
      var flush = App.gradeDirty && Object.keys(App.gradeDirty).length
        ? api('saveGradebook', [collectGradebookFromTable({ dirtyOnly: true })])
        : Promise.resolve();
      return flush.then(function () {
        return api('importReadCardScores', [payload]);
      }).then(function (done) {
        var refresh = className ? api('getGradebook', [className]) : Promise.resolve(null);
        return refresh.then(function (book) {
          if (book && teacherTargetClass() === className) {
            applyGradebook(book);
            renderGradebook();
          }
          toast('已匯入「' + done.title + '」：' + done.classes.map(function (c) {
            return c.className + ' ' + c.count + ' 人';
          }).join('、'), 7000);
        });
      });
    }).catch(function (error) {
      toast(error && error.message ? error.message : '匯入失敗');
    });
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

  /** 抽籤只能用「上課中班級」的加扣與成績；教師模式可能正開著別班。 */
  function usualScoreForDraw(student) {
    var cn = App.classroom && App.classroom.className;
    var draw = App.drawData && App.drawData.className === cn ? App.drawData : null;
    var days = draw ? draw.days : (!App.dailyDaysClass || App.dailyDaysClass === cn ? App.dailyDays : []);
    var book = draw ? draw.book : (!App.gradebookClass || App.gradebookClass === cn ? App.gradebook : null);
    var prevDays = App.dailyDays;
    var prevBook = App.gradebook;
    App.dailyDays = days || [];
    App.gradebook = book || emptyGradebook();
    try {
      return usualScoreForDrawNow_(student);
    } finally {
      App.dailyDays = prevDays;
      App.gradebook = prevBook;
    }
  }

  function usualScoreForDrawNow_(student) {
    var act = classActivity(student.seatNo, '');
    var live = Number(student.score) || 0;
    var today = App.activeDate || '';
    var todayOld = 0;
    if (today) {
      (App.dailyDays || []).forEach(function (day) {
        if (day.date !== today) return;
        (day.students || []).forEach(function (s) {
          if (String(s.seatNo) === String(student.seatNo)) todayOld = Number(s.score) || 0;
        });
      });
    }
    var raw = (act.raw || 0) - todayOld + live;
    var has = act.has || live !== 0;
    var book = App.gradebook || emptyGradebook();
    var bundle = usualBundle(student.seatNo, raw, has, book.labs || [], book.practicals || [], book.homeworks || []);
    return bundle.usual == null ? 60 : bundle.usual;
  }

  function setPeerTeach(on) {
    App.peerTeach = !!on;
    if (!App.peerTeach) App.peerHelperSeatNo = null;
    if (App.peerTeach) {
      App.mode = 'plus';
      App.groupAssign = false;
      toast('互教模式：先點「教的人」，再點「被教的人」');
    } else {
      toast('已關閉互教模式');
    }
    renderAll();
  }

  function handlePeerTeachClick(student) {
    if (!App.peerHelperSeatNo) {
      App.peerHelperSeatNo = student.seatNo;
      App.selectedSeatNo = student.seatNo;
      renderAll();
      toast('已選教的人：' + student.name + '。再點被教的人');
      return;
    }
    if (String(App.peerHelperSeatNo) === String(student.seatNo)) {
      App.peerHelperSeatNo = null;
      renderAll();
      toast('已取消教的人，請重新選');
      return;
    }
    var helper = findStudent(App.peerHelperSeatNo);
    if (!helper) {
      App.peerHelperSeatNo = null;
      renderAll();
      toast('找不到教的人，請重選');
      return;
    }
    applyPeerTeachScores(helper, student, App.delta);
  }

  function applyPeerTeachScores(helper, learner, baseDelta) {
    var mainBase = Math.max(1, Number(baseDelta) || 1);
    changeScore(learner, mainBase, false, '', {
      forceNoGroup: true,
      detail: '互教·被教',
      onDone: function () {
        changeScore(helper, 1, false, '', {
          forceNoGroup: true,
          detail: '互教·教學獎勵',
          onDone: function () {
            App.peerHelperSeatNo = null;
            App.selectedSeatNo = learner.seatNo;
            refreshScoreUi();
          }
        });
      }
    });
  }

  function tierLabelZh(tier) {
    if (tier === 'high') return '高';
    if (tier === 'low') return '低';
    return '中';
  }

  function studentTierOf(seatNo) {
    if (!App.classroom) return 'mid';
    var info = assignLotteryTiers(App.classroom.students || []);
    return info.map[String(seatNo)] || 'mid';
  }

  function plusHitCount(seatNo, className) {
    var cn = className || (App.classroom && App.classroom.className);
    if (!cn) return 0;
    App.plusHits = App.plusHits || {};
    App.plusHits[cn] = App.plusHits[cn] || {};
    return Number(App.plusHits[cn][String(seatNo)]) || 0;
  }

  function bumpPlusHits(seatNos) {
    var cn = App.classroom && App.classroom.className;
    if (!cn) return;
    App.plusHits = App.plusHits || {};
    App.plusHits[cn] = App.plusHits[cn] || {};
    (seatNos || []).forEach(function (sn) {
      sn = String(sn);
      App.plusHits[cn][sn] = (Number(App.plusHits[cn][sn]) || 0) + 1;
    });
  }

  function shrinkPlusHits(seatNos) {
    var cn = App.classroom && App.classroom.className;
    if (!cn) return;
    App.plusHits = App.plusHits || {};
    App.plusHits[cn] = App.plusHits[cn] || {};
    (seatNos || []).forEach(function (sn) {
      sn = String(sn);
      App.plusHits[cn][sn] = Math.max(0, (Number(App.plusHits[cn][sn]) || 0) - 1);
    });
  }

  function diminishFactor(tier, n) {
    n = Number(n) || 0;
    if (tier === 'low') return Math.max(0.5, 1 - 0.1 * n);
    if (tier === 'high') return Math.max(0.25, 1 - 0.3 * n);
    return Math.max(0.4, 1 - 0.2 * n);
  }

  function effectivePlusDelta(student, baseDelta) {
    var base = Math.max(0, Number(baseDelta) || 0);
    if (!base) return { delta: 0, note: '', tier: 'mid', factor: 1 };
    var n = plusHitCount(student.seatNo);
    var tier = studentTierOf(student.seatNo);
    var factor = diminishFactor(tier, n);
    var actual = Math.max(1, Math.round(base * factor));
    return { delta: actual, base: base, factor: factor, tier: tier, note: '', hits: n };
  }

  function lotteryMode() {
    var checked = document.querySelector('input[name="lotteryMode"]:checked');
    return checked ? checked.value : 'person';
  }

  function selectedLotteryTiers() {
    var out = [];
    if (els.lotteryTierHigh && els.lotteryTierHigh.checked) out.push('high');
    if (els.lotteryTierMid && els.lotteryTierMid.checked) out.push('mid');
    if (els.lotteryTierLow && els.lotteryTierLow.checked) out.push('low');
    return out;
  }

  function lotteryTierOfIndex(i, n) {
    if (n <= 0) return 'mid';
    if (n === 1) return 'mid';
    if (n === 2) return i === 0 ? 'high' : 'low';
    var hiEnd = Math.ceil(n / 3);
    var midEnd = Math.ceil((2 * n) / 3);
    if (i < hiEnd) return 'high';
    if (i < midEnd) return 'mid';
    return 'low';
  }

  function assignLotteryTiers(students) {
    var rows = (students || []).map(function (s) {
      return {
        student: s,
        seatNo: String(s.seatNo),
        score: Number(usualScoreForDraw(s))
      };
    });
    rows.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.seatNo).localeCompare(String(b.seatNo), 'zh-Hant', { numeric: true });
    });
    var map = {};
    var counts = { high: 0, mid: 0, low: 0 };
    rows.forEach(function (row, i) {
      var tier = lotteryTierOfIndex(i, rows.length);
      map[row.seatNo] = tier;
      counts[tier] += 1;
    });
    return { map: map, counts: counts, n: rows.length };
  }

  function buildLotteryPool(applyUnique) {
    var mode = lotteryMode();
    var students = (App.classroom && App.classroom.students) || [];
    var tiers = assignLotteryTiers(students);
    var selected = selectedLotteryTiers();
    var drawn = (App.classroom && App.drawn[App.classroom.className]) || [];
    var unique = applyUnique !== false && els.lotteryUnique && els.lotteryUnique.checked;
    var assign = (classGroups().assign) || {};
    var groupedStudents = students.filter(function (s) {
      return !!assign[String(s.seatNo)];
    });

    if (mode === 'group') {
      var groupMap = {};
      groupedStudents.forEach(function (s) {
        var gid = String(assign[String(s.seatNo)]);
        if (!groupMap[gid]) groupMap[gid] = [];
        groupMap[gid].push(s);
      });
      var groupIds = Object.keys(groupMap).filter(function (gid) {
        var members = groupMap[gid];
        var hasTier = members.some(function (s) {
          return selected.indexOf(tiers.map[String(s.seatNo)]) >= 0;
        });
        if (!hasTier) return false;
        if (unique && drawn.indexOf('g:' + gid) !== -1) return false;
        return true;
      });
      return {
        mode: mode,
        pool: groupIds.map(function (gid) {
          return { kind: 'group', groupId: gid, members: groupMap[gid], name: '第' + gid + '組', seatNo: 'g:' + gid };
        }),
        tiers: tiers,
        selected: selected,
        unique: unique,
        drawn: drawn,
        needsGroups: !Object.keys(groupMap).length
      };
    }

    var poolStudents = mode === 'inGroup' ? groupedStudents : students;
    var pool = poolStudents.filter(function (s) {
      var tier = tiers.map[String(s.seatNo)];
      if (selected.indexOf(tier) === -1) return false;
      if (unique && drawn.indexOf(s.seatNo) !== -1) return false;
      return true;
    });
    return {
      mode: mode,
      pool: pool,
      tiers: tiers,
      selected: selected,
      unique: unique,
      drawn: drawn,
      needsGroups: mode === 'inGroup' && !groupedStudents.length
    };
  }

  function updateLotteryTierHint(pool) {
    if (!els.lotteryTierHint || !App.classroom) return;
    var info = assignLotteryTiers(App.classroom.students || []);
    var selected = selectedLotteryTiers();
    var labels = { high: '高', mid: '中', low: '低' };
    var picked = selected.map(function (t) { return labels[t]; }).join('／') || '（未選）';
    var mode = lotteryMode();
    var n = (pool || []).length;
    var unit = mode === 'group' ? '組' : '人';
    els.lotteryTierHint.textContent =
      '本班分成 高' + info.counts.high + '／中' + info.counts.mid + '／低' + info.counts.low +
      '；目前可抽「' + picked + '」共 ' + n + ' ' + unit;
  }

  function rollFatePoints() {
    // 1% 抽到 -1；其餘均分 +0 / +1 / +2
    if (Math.random() < 0.01) return -1;
    return Math.floor(Math.random() * 3);
  }

  function fateTotalText(total) {
    if (!total) return '合計不加分';
    return '合計 ' + (total > 0 ? '+' : '') + total;
  }

  function renderFateOfferUi(revealedTotal) {
    var offer = App.fateOffer;
    var pending = !!(offer && offer.pending);
    var who = offer
      ? (offer.forceGroup && offer.groupId
        ? ((offer.lab ? '實驗第' : '第') + offer.groupId + '組')
        : (offer.name || '同學'))
      : '';
    if (els.fatePanel) {
      els.fatePanel.hidden = !(pending && offer && offer.source === 'manual');
    }
    if (els.fatePanelWho) {
      els.fatePanelWho.textContent = who ? ('給 ' + who) : '';
    }
    if (els.fatePanelLabel) {
      els.fatePanelLabel.textContent = revealedTotal != null
        ? fateTotalText(revealedTotal)
        : '命運加分待揭曉';
    }
    if (els.btnFateApply) els.btnFateApply.disabled = !pending || revealedTotal != null;
    if (els.lotteryFateWrap) {
      els.lotteryFateWrap.hidden = !(pending && offer && offer.source === 'lottery');
    }
    if (els.lotteryFateLabel) {
      els.lotteryFateLabel.textContent = revealedTotal != null
        ? fateTotalText(revealedTotal)
        : '命運加分待揭曉';
    }
    if (els.btnLotteryApplyFate) {
      els.btnLotteryApplyFate.disabled = !pending || revealedTotal != null;
    }
  }

  function hideFateOffer() {
    App.fateOffer = null;
    App.lotteryFate = null;
    App.lotteryFatePending = false;
    renderFateOfferUi();
    if (els.fatePanel) els.fatePanel.hidden = true;
    if (els.lotteryFateWrap) els.lotteryFateWrap.hidden = true;
    if (els.btnFateApply) els.btnFateApply.disabled = false;
    if (els.btnLotteryApplyFate) els.btnLotteryApplyFate.disabled = false;
  }

  function beginManualFate(student, opts) {
    opts = opts || {};
    if (!canEdit()) {
      toast('檢視模式不能加分');
      return;
    }
    if (!student) return;
    if (App.fateOffer && App.fateOffer.pending) {
      toast('請先完成或略過目前的命運加分');
      return;
    }
    App.selectedSeatNo = student.seatNo;
    var forceGroup = opts.forceGroup === true ||
      isLabView() ||
      !!(els.groupApplyScore && els.groupApplyScore.checked);
    var groupId = Number(opts.groupId) || 0;
    if (forceGroup && !groupId) {
      groupId = isLabView() ? studentLabGroupId(student.seatNo) : studentGroupId(student.seatNo);
    }
    if (forceGroup && !groupId) forceGroup = false;
    showFateOffer({
      source: 'manual',
      seatNo: student.seatNo,
      name: student.name,
      forceGroup: forceGroup,
      groupId: groupId || 0,
      lab: isLabView(),
      fixedDelta: Math.max(1, Number(App.delta) || 1)
    });
    renderAll();
  }

  function showFateOffer(opts) {
    opts = opts || {};
    App.fateOffer = {
      pending: true,
      source: opts.source || 'manual',
      seatNo: opts.seatNo || '',
      name: opts.name || '',
      forceGroup: !!opts.forceGroup,
      groupId: opts.groupId || 0,
      lab: !!opts.lab,
      fixedDelta: Math.max(0, Number(opts.fixedDelta) || 0)
    };
    App.lotteryFatePending = true;
    App.lotteryFate = null;
    renderFateOfferUi();
  }

  function showLotteryFate() {
    var winner = App.lotteryLastWinner || findStudent(App.selectedSeatNo);
    var mode = lotteryMode();
    showFateOffer({
      source: 'lottery',
      seatNo: winner ? winner.seatNo : (App.selectedSeatNo || ''),
      name: winner ? winner.name : '',
      forceGroup: mode === 'group' && !!App.lotteryLastGroupId,
      groupId: App.lotteryLastGroupId || 0,
      lab: false,
      fixedDelta: 0
    });
  }

  function hideLotteryFate() {
    hideFateOffer();
  }

  function skipFateOffer() {
    hideFateOffer();
    toast('已略過命運加分');
  }

  function applyFateOffer() {
    var offer = App.fateOffer;
    if (!offer || !offer.pending || !App.classroom) {
      toast('目前沒有命運加分可套用');
      return;
    }
    var fate = rollFatePoints();
    App.lotteryFate = fate;
    offer.pending = false;
    App.lotteryFatePending = false;

    var isManual = offer.source === 'manual';
    var fixed = isManual ? Math.max(1, Number(offer.fixedDelta) || Number(App.delta) || 1) : 0;

    function resolveActor() {
      if (offer.forceGroup && offer.groupId) {
        var members = (App.classroom.students || []).filter(function (s) {
          var gid = offer.lab ? studentLabGroupId(s.seatNo) : parseInt(classGroups().assign[String(s.seatNo)], 10);
          return String(gid) === String(offer.groupId);
        });
        if (!members.length) return null;
        return members.filter(function (s) {
          return String(s.seatNo) === String(offer.seatNo || App.selectedSeatNo);
        })[0] || members[0];
      }
      return findStudent(offer.seatNo) || App.lotteryLastWinner || findStudent(App.selectedSeatNo);
    }

    var actor = resolveActor();
    if (!actor) {
      hideFateOffer();
      toast(offer.forceGroup ? '找不到該組成員' : '找不到同學');
      return;
    }

    var total = fate;
    if (isManual) {
      var base = effectivePlusDelta(actor, fixed).delta;
      total = base + fate;
    }

    // 寫入畫面只顯示合計，不拆開固定分／命運分
    renderFateOfferUi(total);

    if (!total) {
      setTimeout(hideFateOffer, 1000);
      return;
    }

    if (isManual && offer.forceGroup && offer.groupId) {
      changeScore(actor, total, true, actor.seatNo, {
        skipDiminish: true,
        onDone: function () { hideFateOffer(); }
      });
      return;
    }

    if (isManual) {
      changeScore(actor, total, false, '', {
        skipDiminish: true,
        forceNoGroup: true,
        onDone: function () { hideFateOffer(); }
      });
      return;
    }

    // 抽籤：只有命運分
    if (App.peerTeach && App.peerHelperSeatNo &&
        String(App.peerHelperSeatNo) !== String(actor.seatNo) && fate > 0) {
      var helper = findStudent(App.peerHelperSeatNo);
      if (helper) {
        applyPeerTeachScores(helper, actor, fate);
        hideFateOffer();
        return;
      }
    }
    if (offer.forceGroup && offer.groupId) {
      changeScore(actor, fate, true, actor.seatNo, {
        skipDiminish: true,
        onDone: function () { hideFateOffer(); }
      });
      return;
    }
    changeScore(actor, fate, false, '', {
      skipDiminish: true,
      forceNoGroup: true,
      onDone: function () { hideFateOffer(); }
    });
  }

  function pickFromPool(pool) {
    if (!pool || !pool.length) return null;
    if (pool[0] && pool[0].kind === 'group') {
      return pool[Math.floor(Math.random() * pool.length)];
    }
    var sum = 0;
    var weights = [];
    var i;
    for (i = 0; i < pool.length; i++) {
      var t = Math.max(0, Math.min(100, Number(usualScoreForDraw(pool[i])) || 60));
      var w = 0.55 + (100 - t) / 100 * 1.45;
      weights.push(w);
      sum += w;
    }
    var r = Math.random() * (sum || pool.length);
    for (i = 0; i < pool.length; i++) {
      r -= weights[i] || 1;
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function prepareDrawData(done) {
    var className = App.classroom && App.classroom.className;
    if (!className) {
      done();
      return;
    }
    Promise.all([
      api('listDaily', [className]),
      api('getGradebook', [className])
    ]).then(function (results) {
      var book = results[1] || {};
      App.drawData = {
        className: className,
        days: (results[0] && results[0].days) || [],
        book: Object.assign(emptyGradebook(), {
          labs: book.labs || [],
          practicals: book.practicals || [],
          homeworks: book.homeworks || [],
          rules: Object.assign(defaultGradeRules(), book.rules || {})
        })
      };
    }).catch(function () {}).then(done);
  }

  function openLottery(fromButton) {
    if (!canEdit()) {
      toast('檢視模式不能抽籤');
      return;
    }
    if (App.lotteryBusy) return;
    if (!selectedLotteryTiers().length) {
      toast('請至少勾選一個成績區間（高／中／低）');
      els.lotteryModal.hidden = false;
      return;
    }
    hideLotteryFate();
    App.lotteryBusy = true;
    els.lotteryModal.hidden = false;
    if (els.lotteryStamp) els.lotteryStamp.hidden = true;
    if (els.lotteryCard) {
      els.lotteryCard.classList.remove('revealed');
      els.lotteryCard.classList.add('rolling');
    }
    prepareDrawData(function () {
      var built = buildLotteryPool(true);
      updateLotteryTierHint(built.pool);
      if (built.needsGroups) {
        App.lotteryBusy = false;
        if (els.lotteryCard) els.lotteryCard.classList.remove('rolling');
        toast('請先分組再抽整組／組內一人');
        return;
      }
      if (!built.pool.length) {
        App.lotteryBusy = false;
        if (els.lotteryCard) els.lotteryCard.classList.remove('rolling');
        toast(built.unique
          ? '可抽名單已空，請改區間或重置'
          : '這個成績區間目前沒有可抽對象');
        return;
      }
      var winner = pickFromPool(built.pool);
      var animPool = built.mode === 'group'
        ? built.pool
        : built.pool;
      animateLottery(animPool, winner, function () {
        if (built.mode === 'group') {
          App.drawn[App.classroom.className] = built.drawn.concat(['g:' + winner.groupId]);
          App.lotteryLastGroupId = winner.groupId;
          App.lotteryLastWinner = winner.members[0] || null;
          App.selectedSeatNo = App.lotteryLastWinner ? App.lotteryLastWinner.seatNo : null;
          els.lotteryName.textContent = winner.name;
          els.lotteryMeta.textContent = '整組中籤！共 ' + winner.members.length + ' 人';
          if (els.lotteryStamp) els.lotteryStamp.hidden = false;
          if (els.lotteryCard) {
            els.lotteryCard.classList.remove('rolling');
            els.lotteryCard.classList.add('revealed');
          }
          updateLotteryTierHint(buildLotteryPool(true).pool);
          renderAll();
          winner.members.forEach(function (m) {
            flashSeat(m.seatNo, 'winner');
            spawnSparkBurst(els.board.querySelector('.seat-card[data-seat="' + cssEscape(m.seatNo) + '"]'), 10);
          });
          spawnSparkBurst(els.lotteryCard, 28);
          showLotteryFate();
          App.lotteryBusy = false;
          run('logLottery', [{
            className: App.classroom.className,
            seatNo: App.selectedSeatNo || ('g:' + winner.groupId),
            name: winner.name,
            detail: (fromButton ? '抽籤' : '再抽一次') + '·整組'
          }], function () {}, true);
          return;
        }

        App.drawn[App.classroom.className] = built.drawn.concat([winner.seatNo]);
        App.lotteryLastWinner = winner;
        App.lotteryLastGroupId = studentGroupId(winner.seatNo) || 0;
        App.selectedSeatNo = winner.seatNo;
        var tier = built.tiers.map[String(winner.seatNo)];
        var gid = studentGroupId(winner.seatNo);
        var bits = ['就是你！座號 ' + winner.seatNo, tierLabelZh(tier) + '分組', '目前 ' + winner.score + ' 分'];
        if (built.mode === 'inGroup' && gid) bits.splice(1, 0, '第' + gid + '組');
        els.lotteryName.textContent = winner.name;
        els.lotteryMeta.textContent = bits.join(' · ');
        if (els.lotteryStamp) els.lotteryStamp.hidden = false;
        if (els.lotteryCard) {
          els.lotteryCard.classList.remove('rolling');
          els.lotteryCard.classList.add('revealed');
        }
        updateLotteryTierHint(buildLotteryPool(true).pool);
        renderAll();
        flashSeat(winner.seatNo, 'winner');
        spawnSparkBurst(els.lotteryCard, 28);
        spawnSparkBurst(els.board.querySelector('.seat-card[data-seat="' + cssEscape(winner.seatNo) + '"]'), 16);
        showLotteryFate();
        App.lotteryBusy = false;
        run('logLottery', [{
          className: App.classroom.className,
          seatNo: winner.seatNo,
          name: winner.name,
          detail: fromButton ? '抽籤' : '再抽一次'
        }], function () {}, true);
      });
    });
  }

  function animateLottery(pool, winner, done) {
    let i = 0;
    const steps = 9;
    function tick() {
      const temp = i >= steps - 1 ? winner : pool[Math.floor(Math.random() * pool.length)];
      els.lotteryName.textContent = temp.name;
      if (temp.kind === 'group') {
        els.lotteryMeta.textContent = '共 ' + (temp.members ? temp.members.length : 0) + ' 人';
      } else {
        els.lotteryMeta.textContent = '座號 ' + temp.seatNo;
      }
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
    App.lotteryLastWinner = null;
    App.lotteryLastGroupId = 0;
    hideLotteryFate();
    els.lotteryName.textContent = '？';
    els.lotteryMeta.textContent = '已重置，可再抽全部對象';
    if (els.lotteryStamp) els.lotteryStamp.hidden = true;
    if (els.lotteryCard) els.lotteryCard.classList.remove('rolling', 'revealed');
    if (App.classroom) {
      prepareDrawData(function () {
        updateLotteryTierHint(buildLotteryPool(true).pool);
      });
    }
    toast('抽籤名單已重置');
  }

  function saveAll() {
    if (!canEdit()) {
      toast('檢視模式不能改資料');
      return;
    }
    run('saveClassroomState', [serializeClassroom()], function (data) {
      applyPayload(data, true);
      if (typeof SeatDB !== 'undefined' && SeatDB.flushCloud) {
        SeatDB.flushCloud().then(function () {
          fillCloudSettings();
          renderMeta();
          toast(cloudConnected() ? '加扣已上傳雲端。換到另一台請重新整理再上課' : '已暫存在這台。請到設定連上雲端，另一台才看得到');
        }).catch(function (err) {
          fillCloudSettings();
          renderMeta();
          toast(err && err.message ? err.message : '同步失敗');
        });
      } else {
        toast('已暫存在這台');
      }
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

  function downloadRosterExcel() {
    withXlsx(function (X) {
      var wb = X.utils.book_new();
      var data = [
        ['班級', '座號', '姓名'],
        ['301', '01', '陳安安'],
        ['301', '02', '林冠宇'],
        ['301', '03', '黃詩涵'],
        ['302', '01', '吳品萱'],
        ['302', '02', '劉子豪']
      ];
      var sheet = X.utils.aoa_to_sheet(data);
      sheet['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 14 }];
      X.utils.book_append_sheet(wb, sheet, '學生名單');
      var help = X.utils.aoa_to_sheet([
        ['使用說明'],
        ['1. 在「學生名單」工作表填班級、座號、姓名。'],
        ['2. 一個檔案可以有多個班級，只要班級欄填不同名稱。'],
        ['3. 座號建議兩位數，例如 01、02。'],
        ['4. 存檔後回到座位表 → 教師模式 → 設定與上傳 → 選擇 Excel 檔 → 匯入名單。'],
        ['5. 若只要新增一個班，班級欄全部填同一個名稱即可。'],
        ['6. 分數欄可以沒有。']
      ]);
      help['!cols'] = [{ wch: 70 }];
      X.utils.book_append_sheet(wb, help, '說明');
      X.writeFile(wb, '學生名單範本.xlsx');
      toast('已下載 Excel 範本，用 Excel 打開改成你的學生後再上傳');
    });
  }

  function downloadClassExcel() {
    if (!App.classroom || !App.classroom.students) {
      toast('沒有可下載的名單');
      return;
    }
    withXlsx(function (X) {
      var rows = [['班級', '座號', '姓名']];
      App.classroom.students.forEach(function (s) {
        rows.push([App.classroom.className, s.seatNo, s.name]);
      });
      if (rows.length === 1) {
        toast('這個班還沒有學生');
        return;
      }
      var wb = X.utils.book_new();
      var sheet = X.utils.aoa_to_sheet(rows);
      sheet['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 14 }];
      X.utils.book_append_sheet(wb, sheet, '學生名單');
      X.writeFile(wb, App.classroom.className + '-學生名單.xlsx');
      toast('已下載本班 Excel，改完後可再上傳匯入');
    });
  }

  function importPendingRoster() {
    var className = els.settingClassName.value.trim();
    var rows = rosterRowsToImport();
    var replace = !!(els.settingReplace && els.settingReplace.checked);
    if (!rows.length) {
      toast('請先上傳 Excel，或在下方貼上名單');
      return;
    }
    if (App.busy) return;
    App.busy = true;
    importRoster(rows, replace, className)
      .then(function () {
        App.busy = false;
      })
      .catch(function (error) {
        App.busy = false;
        toast(error && error.message ? error.message : '匯入失敗，請再試一次');
      });
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
    const pasted = rosterRowsToImport();
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
            if (!cloudConnected() || typeof SeatDB === 'undefined' || !SeatDB.flushCloud) {
              toast('班級行列設定已儲存');
              return;
            }
            return SeatDB.flushCloud().then(function () {
              fillCloudSettings();
              toast('班級行列設定已儲存並寫入資料庫');
            });
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
      renderUploadPreview(null);
      return flushRosterToCloud(rows.length);
    });
  }

  function rosterRowsToImport() {
    if (App.pendingImport && App.pendingImport.length) {
      return App.pendingImport.slice();
    }
    return parseRosterText(els.settingStudents.value, els.settingClassName.value.trim());
  }

  function flushRosterToCloud(count) {
    if (!cloudConnected() || typeof SeatDB === 'undefined' || !SeatDB.flushCloud) {
      toast('已匯入 ' + count + ' 位學生，但還沒連上雲端。請到設定連上雲端，資料庫才會出現');
      return Promise.resolve();
    }
    toast('正在寫入雲端資料庫…');
    return SeatDB.flushCloud().then(function (info) {
      fillCloudSettings();
      renderMeta();
      if (info && info.error) {
        throw new Error(info.error);
      }
      toast('已匯入 ' + count + ' 位學生，並寫進資料庫「學生／班級設定」');
    }).catch(function (error) {
      fillCloudSettings();
      throw new Error((error && error.message ? error.message : '雲端寫入失敗') +
        '。畫面已有名單，請按「立即同步」，並確認 Apps Script 已貼上最新 Code.gs');
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
      withXlsx(function (X) {
        const reader = new FileReader();
        reader.onload = function (event) {
          try {
            const workbook = X.read(event.target.result, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const table = X.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
            App.pendingImport = parseRosterTable(table, els.settingClassName.value.trim());
            afterFileParsed(file.name);
          } catch (err) {
            toast('Excel 讀取失敗，請確認第一個工作表有班級、座號、姓名');
          }
        };
        reader.readAsArrayBuffer(file);
      });
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
    toast('已讀取 ' + App.pendingImport.length + ' 位學生，請按「匯入名單」');
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
    var seatNo = String(row.seatNo || '').trim();
    if (/^\d+$/.test(seatNo) && seatNo.length < 2) seatNo = ('0' + seatNo).slice(-2);
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
      }),
      groups: classGroups(),
      lab: classLab()
    };
  }

  var seatIndex = { room: null, bySeat: null, byKey: null, byPos: null };

  function rebuildSeatIndex() {
    var room = App.classroom;
    seatIndex.room = room;
    seatIndex.bySeat = Object.create(null);
    seatIndex.byKey = Object.create(null);
    seatIndex.byPos = Object.create(null);
    if (!room || !room.students) return;
    room.students.forEach(function (s) {
      if (!s) return;
      var sn = String(s.seatNo);
      seatIndex.bySeat[sn] = s;
      seatIndex.byKey[seatLookupKey(sn)] = s;
      if (s.row != null && s.col != null) {
        seatIndex.byPos[s.row + ',' + s.col] = s;
      }
    });
  }

  function ensureSeatIndex() {
    if (seatIndex.room !== App.classroom || !seatIndex.bySeat) rebuildSeatIndex();
  }

  function studentAt(row, col) {
    if (!App.classroom) return null;
    ensureSeatIndex();
    return seatIndex.byPos[row + ',' + col] || null;
  }

  function findStudent(seatNo) {
    if (!App.classroom) return null;
    ensureSeatIndex();
    var sn = String(seatNo);
    return seatIndex.bySeat[sn] || seatIndex.byKey[seatLookupKey(sn)] || null;
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
    if (App.busy && !silent) {
      toast('正在載入或同步，請稍候再試');
      return;
    }
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
          showLoadingBoard(msg, true);
        }
        if (fnName === 'connectCloud') {
          showTeacherView();
          switchTeacherTab('settings');
          if (needsCloudLogin(msg)) showCloudRelogin(true);
          toast(msg, 7000);
          return;
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

  function toast(message, ms) {
    els.toast.hidden = false;
    els.toast.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      els.toast.hidden = true;
    }, ms || 2200);
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

  // 啟動要放在最後：上方的 var 常數（計時器、bootstrapSeq、seatIndex…）此時才已賦值
  applyTeacherUi();
  restoreLayoutMode();
  initAnswerTimer();
  if (window.GoogleAuth) {
    GoogleAuth.start({
      onSignedIn: function (account, alreadyBooted) {
        var resume = readResume();
        var reconnecting = !!(resume && resume.retryConnect);
        if (!account.teacher) {
          applyTeacherUi({ keepSettings: reconnecting || App.appView === 'teacher' });
          showCloudRelogin(true);
          toast('這個帳號沒有教師權限：' + (account.email || '') + '。請改選 ' + teacherEmailHint(), 8000);
          return;
        }
        applyTeacherUi();
        if (resumeAfterSignIn(account, alreadyBooted)) return;
        if (alreadyBooted) {
          renderAll();
          return;
        }
        bootstrap();
      }
    });
  } else {
    bootstrap();
  }
})();