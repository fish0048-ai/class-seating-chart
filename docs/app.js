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
    pendingImport: null
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
    settingStudents: document.getElementById('settingStudents'),
    settingFile: document.getElementById('settingFile'),
    settingReplace: document.getElementById('settingReplace'),
    uploadBox: document.getElementById('uploadBox'),
    uploadPreview: document.getElementById('uploadPreview')
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
  document.getElementById('btnSave').addEventListener('click', saveAll);
  document.getElementById('btnSettings').addEventListener('click', openSettings);
  document.getElementById('btnSettingsClose').addEventListener('click', function () {
    els.settingsModal.hidden = true;
  });
  document.getElementById('btnSettingsSave').addEventListener('click', saveSettings);
  var uploadBtn = document.getElementById('btnUpload');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', function () {
      openSettings();
      setTimeout(function () {
        if (els.settingFile) els.settingFile.click();
      }, 80);
    });
  }
  var pickBtn = document.getElementById('btnPickFile');
  if (pickBtn) {
    pickBtn.addEventListener('click', function () {
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
  if (exportBtn) exportBtn.addEventListener('click', downloadBackup);
  var importBtn = document.getElementById('btnImport');
  var backupFile = document.getElementById('backupFile');
  if (importBtn && backupFile) {
    importBtn.addEventListener('click', function () {
      backupFile.click();
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

  function bootstrap() {
    run('getBootstrapData', [], function (data) {
      applyPayload(data, true);
      if (App.classroom && !App.classroom.students.length) {
        openSettings();
        toast('這個班還沒有學生，請上傳或貼上名單');
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
    els.settingsModal.hidden = false;
    setTimeout(function () {
      els.settingStudents.focus();
    }, 50);
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
            els.settingsModal.hidden = true;
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
      els.settingsModal.hidden = true;
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