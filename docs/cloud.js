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
      }, 12000);
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
    var raw = String(text || '').trim();
    if (/沒有權限|does not have permission|do not have (permission|access)|access denied/i.test(raw)) {
      throw new Error('這個 /exec 沒有開放權限。請到 Apps Script「部署 → 管理部署 → 編輯」：執行身分選「我」，對象選「任何人」，再按連上雲端。');
    }
    if (!raw || raw.charAt(0) === '<' || /accounts\.google\.com/i.test(raw)) {
      throw new Error('新的 /exec 第一次請先用瀏覽器打開該網址，用教師帳號 chunhsinkuo@kcis.hc.edu.tw 登入授權，再回到座位表按「連上雲端」。不要按登出。');
    }
    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      throw new Error('雲端回應不是資料，請確認 Apps Script 已部署成網頁應用程式');
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  function hwFriendlyCloudError_(err) {
    var msg = err && err.message ? err.message : String(err || '連線失敗');
    if (msg.indexOf('未知的操作') >= 0) {
      return '後端還沒更新作業檢核。請把最新 Code.gs 與 HwStudent.html 貼進 Apps Script，再「部署 → 管理部署 → 編輯」同一個 /exec（不要另外產生新網址）。';
    }
    if (/Failed to fetch|NetworkError|Load failed|雲端回應不是資料/i.test(msg)) {
      return '連不上作業 API。請確認已用教師帳號登入，並用同一個 /exec 更新部署。';
    }
    return msg;
  }

  function wait_(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function authToken_() {
    return (global.GoogleAuth && GoogleAuth.getIdToken && GoogleAuth.getIdToken()) || '';
  }

  function postAction(action, body) {
    var url = apiUrl();
    if (!url) {
      return Promise.reject(new Error('尚未連上雲端資料庫'));
    }
    var payload = Object.assign({ action: action, idToken: authToken_() }, body || {});
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
        return wait_(2500).then(function () {
          return jsonpGet('getStore');
        }).then(function (data) {
          var remoteAt = data && data.store && data.store.updatedAt;
          var expected = payload.store && payload.store.updatedAt;
          if (!remoteAt) throw new Error('雲端存檔後讀不到資料，請再試一次');
          if (expected && remoteAt < expected) {
            throw new Error('雲端還沒收到這次名單，請再按一次匯入');
          }
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
    verifyAuth: function (idToken) {
      return postAction('verifyAuth', { idToken: idToken || authToken_() });
    },
    getStore: function () {
      var url = apiUrl();
      if (!url) {
        return Promise.reject(new Error('尚未連上雲端資料庫'));
      }
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getStore', idToken: authToken_() }),
        redirect: 'follow'
      }).then(function (res) {
        return res.text();
      }).then(parseCloudText_).catch(function () {
        return jsonpGet('getStore');
      });
    },
    putStore: function (store) {
      return postAction('putStore', { store: store });
    },
    request: function (action, body) {
      var url = apiUrl();
      if (!url) {
        return Promise.reject(new Error('尚未連上雲端資料庫'));
      }
      var payload = Object.assign({ action: action, idToken: authToken_() }, body || {});
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      }).then(function (res) {
        return res.text();
      }).then(parseCloudText_).catch(function (err) {
        throw new Error(hwFriendlyCloudError_(err));
      });
    }
  };
})(window);
