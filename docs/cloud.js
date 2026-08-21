(function (global) {
  var URL_KEY = 'class-seating-cloud-url';

  function configUrl() {
    return String((global.SEAT_CONFIG && global.SEAT_CONFIG.apiUrl) || '').trim();
  }

  function savedUrl() {
    try {
      return String(localStorage.getItem(URL_KEY) || '').trim();
    } catch (err) {
      return '';
    }
  }

  function apiUrl() {
    return configUrl() || savedUrl();
  }

  function setApiUrl(url) {
    url = String(url || '').trim();
    try {
      if (url) localStorage.setItem(URL_KEY, url);
      else localStorage.removeItem(URL_KEY);
    } catch (err) {}
    if (global.SEAT_CONFIG) global.SEAT_CONFIG.apiUrl = url;
  }

  function joinQuery(url, query) {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + query;
  }

  function jsonpGet(action) {
    var url = apiUrl();
    if (!url) {
      return Promise.reject(new Error('尚未連上雲端資料庫'));
    }
    return new Promise(function (resolve, reject) {
      var cb = 'seatCloud' + Date.now() + Math.floor(Math.random() * 1000);
      var script = document.createElement('script');
      var timer = setTimeout(function () {
        cleanup();
        reject(new Error('雲端連線逾時，請檢查網路或部署網址'));
      }, 25000);
      function cleanup() {
        clearTimeout(timer);
        try { delete global[cb]; } catch (err) { global[cb] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      global[cb] = function (data) {
        cleanup();
        if (data && data.error) {
          reject(new Error(data.error));
          return;
        }
        resolve(data);
      };
      script.async = true;
      script.src = joinQuery(url, 'action=' + encodeURIComponent(action) + '&callback=' + cb);
      script.onerror = function () {
        cleanup();
        reject(new Error('無法連到雲端資料庫，請確認 Apps Script 已部署成「任何人」可執行'));
      };
      document.head.appendChild(script);
    });
  }

  function parseCloudText_(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('雲端回應不是資料，請確認 Apps Script 已部署成網頁應用程式');
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  function wait_(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function postAction(action, body) {
    var url = apiUrl();
    if (!url) {
      return Promise.reject(new Error('尚未連上雲端資料庫'));
    }
    var payload = Object.assign({ action: action }, body || {});
    var raw = JSON.stringify(payload);
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: raw,
      redirect: 'follow'
    }).then(function (res) {
      return res.text();
    }).then(parseCloudText_).catch(function () {
      return fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: raw
      }).then(function () {
        return wait_(900).then(function () {
          return jsonpGet('getStore');
        }).then(function (data) {
          var remoteAt = data && data.store && data.store.updatedAt;
          if (!remoteAt) throw new Error('雲端存檔後讀不到資料，請再試一次');
          return { ok: true, updatedAt: remoteAt };
        });
      });
    });
  }

  global.CloudStore = {
    url: apiUrl,
    setUrl: setApiUrl,
    enabled: function () {
      return !!apiUrl();
    },
    spreadsheetUrl: function () {
      return String((global.SEAT_CONFIG && global.SEAT_CONFIG.spreadsheetUrl) || '').trim();
    },
    getStore: function () {
      return jsonpGet('getStore');
    },
    putStore: function (store) {
      return postAction('putStore', { store: store });
    },
    getTimetable: function () {
      return jsonpGet('getTimetable');
    }
  };
})(window);
