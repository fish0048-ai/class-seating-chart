window.SEAT_CONFIG = window.SEAT_CONFIG || {
  apiUrl: '',
  spreadsheetUrl: ''
};

(function (global) {
  function config() {
    return global.SEAT_CONFIG || {};
  }

  function isConfigured() {
    var url = String(config().apiUrl || '');
    return /^https:\/\/script\.google\.com\/macros\/s\//.test(url);
  }

  function jsonp(params) {
    return new Promise(function (resolve, reject) {
      var name = 'seatCb' + String(Date.now()) + 'x' + Math.floor(Math.random() * 1e6);
      var qs = [];
      Object.keys(params).forEach(function (key) {
        var value = params[key];
        if (value === undefined || value === null) return;
        if (typeof value === 'object') value = JSON.stringify(value);
        qs.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
      });
      qs.push('callback=' + name);
      var timer = setTimeout(function () {
        cleanup();
        reject(new Error('連線試算表逾時，請確認 API 網址與部署權限'));
      }, 20000);
      function cleanup() {
        clearTimeout(timer);
        try { delete global[name]; } catch (err) { global[name] = undefined; }
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }
      global[name] = function (data) {
        cleanup();
        resolve(data);
      };
      var script = document.createElement('script');
      script.src = config().apiUrl + (config().apiUrl.indexOf('?') >= 0 ? '&' : '?') + qs.join('&');
      script.onerror = function () {
        cleanup();
        reject(new Error('無法連線資料庫，請檢查 GitHub 的 config.js 與 Apps Script 部署'));
      };
      document.body.appendChild(script);
    });
  }

  function unwrap(data) {
    if (!data || data.ok === false) {
      throw new Error((data && data.error) || '試算表回應失敗');
    }
    return data;
  }

  global.SeatDB = {
    configured: isConfigured,
    spreadsheetUrl: function () {
      return config().spreadsheetUrl || '';
    },
    getBootstrapData: function () {
      return jsonp({ action: 'bootstrap' }).then(unwrap);
    },
    loadClassroom: function (className) {
      return jsonp({ action: 'load', className: className }).then(unwrap);
    },
    saveClassroomState: function (state) {
      return jsonp({ action: 'save', payload: JSON.stringify(state) }).then(unwrap);
    },
    saveLayout: function (state) {
      return jsonp({ action: 'layout', payload: JSON.stringify(state) }).then(unwrap);
    },
    applyScoreChange: function (body) {
      return jsonp({
        action: 'score',
        className: body.className,
        seatNo: body.seatNo,
        delta: body.delta
      }).then(unwrap);
    },
    undoLastAction: function (className) {
      return jsonp({ action: 'undo', className: className }).then(unwrap);
    },
    saveSettings: function (body) {
      return jsonp({
        action: 'settings',
        className: body.className,
        rows: body.rows,
        cols: body.cols
      }).then(unwrap);
    },
    upsertStudents: function (body) {
      return jsonp({
        action: 'students',
        className: body.className,
        students: JSON.stringify(body.students || [])
      }).then(unwrap);
    },
    logLottery: function (body) {
      return jsonp({
        action: 'lottery',
        className: body.className,
        seatNo: body.seatNo,
        name: body.name,
        detail: body.detail
      }).then(unwrap);
    }
  };
})(window);
