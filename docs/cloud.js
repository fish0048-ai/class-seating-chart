(function (global) {
  var URL_KEY = 'class-seating-cloud-url';
  var cloudChain_ = Promise.resolve();
  var inflightGet_ = null;
  var lastGetCache_ = { at: 0, data: null };

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
    invalidateGetCache_();
  }

  function joinQuery(url, query) {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + query;
  }

  function wait_(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function authToken_() {
    return (global.GoogleAuth && GoogleAuth.getIdToken && GoogleAuth.getIdToken()) || '';
  }

  function invalidateGetCache_() {
    lastGetCache_ = { at: 0, data: null };
  }

  /** 雲端請求串行，避免讀寫互相踩、冷啟動被打爆。 */
  function enqueueCloud_(fn) {
    var run = cloudChain_.then(fn, fn);
    cloudChain_ = run.then(function () {}, function () {});
    return run;
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
        reject(new Error('雲端連線逾時。請確認 /exec 網址正確、後端 Code.gs 可執行，並用教師帳號登入後再試。'));
      }, 90000);
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
      var query = 'action=' + encodeURIComponent(action) + '&callback=' + cb;
      var token = authToken_();
      if (token) query += '&idToken=' + encodeURIComponent(token);
      script.src = joinQuery(url, query);
      script.onerror = function () {
        cleanup();
        reject(new Error('無法連到雲端資料庫。常見原因：後端 Code.gs 有錯、/exec 網址不對，或部署對象不是「任何人」。請先用瀏覽器直接打開 /exec 看是否顯示錯誤頁。'));
      };
      document.head.appendChild(script);
    });
  }

  function externalRequestError_(msg) {
    if (!/UrlFetchApp|script\.external_request|連線至外部服務|authorizeScript/i.test(msg || '')) return '';
    return '後端還沒允許「連線至外部服務」。請打開成績庫試算表 → 擴充功能 → Apps Script，上方選函式 authorizeScript 按執行並允許權限。完成後「部署 → 管理部署 → 編輯」選新版本（網址不要換）。';
  }

  function parseAppsScriptHtmlError_(text) {
    var raw = String(text || '');
    var m = raw.match(/ReferenceError:\s*([^<]+?)\s*\(/i) ||
      raw.match(/SyntaxError:\s*([^<]+?)\s*\(/i) ||
      raw.match(/TypeError:\s*([^<]+?)\s*\(/i) ||
      raw.match(/Error:\s*([^<]+?)\s*\(/i);
    if (!m) {
      if (/<title>\s*錯誤\s*<\/title>/i.test(raw) || /Google Apps Script/i.test(raw) && /errorMessage/i.test(raw)) {
        return 'Apps Script 後端程式有錯，請把倉庫最新的 Code.gs 全部貼上並儲存，再「部署 → 管理部署 → 編輯」選新版本（/exec 網址不要換）。';
      }
      return '';
    }
    return 'Apps Script 後端程式錯誤：' + m[1].trim() +
      '。請把倉庫最新的 Code.gs 全部貼上覆蓋（不要只貼片段），儲存後再更新同一支部署。';
  }

  function parseCloudText_(text) {
    var raw = String(text || '').trim();
    var scriptErr = parseAppsScriptHtmlError_(raw);
    if (scriptErr) throw new Error(scriptErr);
    var ext = externalRequestError_(raw);
    if (ext) throw new Error(ext);
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
    if (data && data.error) {
      ext = externalRequestError_(String(data.error));
      throw new Error(ext || data.error);
    }
    return data;
  }

  function hwFriendlyCloudError_(err) {
    var msg = err && err.message ? err.message : String(err || '連線失敗');
    if (msg.indexOf('未知的操作') >= 0) {
      return '後端還沒更新作業檢核。請把最新 Code.gs 與 HwStudent.html 貼進 Apps Script，再「部署 → 管理部署 → 編輯」同一個 /exec（不要另外產生新網址）。';
    }
    var ext = externalRequestError_(msg);
    if (ext) return ext;
    if (/Failed to fetch|NetworkError|Load failed|雲端回應不是資料|HTTP\s*[45]/i.test(msg)) {
      return '連不上作業 API。請確認已用教師帳號登入，並用同一個 /exec 更新部署。';
    }
    return msg;
  }

  function isFatalCloudError_(err) {
    var msg = err && err.message ? err.message : String(err || '');
    if (err && err.retryable) return false;
    if (/HTTP\s*(404|408|429|500|502|503|504)/i.test(msg)) return false;
    if (/雲端暫時|讀取逾時|連線逾時|Failed to fetch|NetworkError|Load failed|AbortError/i.test(msg)) return false;
    return /沒有開放權限|打開該網址|請先用 Google|登入已過期|登入憑證|未知的操作|沒有權限|只有教師|UrlFetchApp|external_request|連線至外部|Apps Script 後端程式/.test(msg);
  }

  function postOnce_(action, body, timeoutMs) {
    var url = apiUrl();
    if (!url) {
      return Promise.reject(new Error('尚未連上雲端資料庫'));
    }
    var payload = Object.assign({ action: action, idToken: authToken_() }, body || {});
    var raw = JSON.stringify(payload);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;
    var req = fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: raw,
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.text().then(function (text) {
        // Apps Script 冷啟動常先回 404／5xx，屬可重試
        if (!res.ok) {
          throw Object.assign(
            new Error('雲端暫時連不上（HTTP ' + res.status + '），請再試一次'),
            { retryable: true, status: res.status }
          );
        }
        return parseCloudText_(text);
      });
    });
    if (ctrl) {
      timer = setTimeout(function () {
        try { ctrl.abort(); } catch (err) {}
      }, timeoutMs || 90000);
      req = req.then(function (data) {
        clearTimeout(timer);
        return data;
      }, function (err) {
        clearTimeout(timer);
        throw err;
      });
    }
    return req.then(null, function (err) {
      if (err && err.name === 'AbortError') {
        throw Object.assign(new Error('雲端讀取逾時，請再試一次'), { retryable: true });
      }
      throw err;
    });
  }

  function withRetry_(fn, maxTries) {
    var tries = 0;
    function attempt() {
      tries += 1;
      return fn(tries).catch(function (err) {
        if (isFatalCloudError_(err) || tries >= maxTries) throw err;
        return wait_(900 * tries).then(attempt);
      });
    }
    return attempt();
  }

  function postAction(action, body) {
    return enqueueCloud_(function () {
      return withRetry_(function () {
        return postOnce_(action, body, 90000);
      }, 3).catch(function (err) {
        if (isFatalCloudError_(err)) throw err;
        if (action !== 'putStore' && action !== 'verifyAuth') throw err;
        // put 最後手段：no-cors 送出後再讀一次確認
        if (action !== 'putStore') throw err;
        var url = apiUrl();
        var payload = Object.assign({ action: action, idToken: authToken_() }, body || {});
        var raw = JSON.stringify(payload);
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
              throw new Error('雲端還沒收到這次資料，請再按一次同步');
            }
            return { ok: true, updatedAt: remoteAt };
          });
        });
      });
    });
  }

  function fetchStoreOnce_() {
    return postOnce_('getStore', {}, 90000);
  }

  function getStoreWithRetry_() {
    var now = Date.now();
    if (lastGetCache_.data && now - lastGetCache_.at < 3000) {
      return Promise.resolve(lastGetCache_.data);
    }
    if (inflightGet_) return inflightGet_;
    inflightGet_ = enqueueCloud_(function () {
      return withRetry_(function () {
        return fetchStoreOnce_();
      }, 3).catch(function (err) {
        if (isFatalCloudError_(err)) throw err;
        var token = authToken_();
        if (token && token.length > 1400) throw err;
        return jsonpGet('getStore');
      });
    }).then(function (data) {
      lastGetCache_ = { at: Date.now(), data: data };
      inflightGet_ = null;
      return data;
    }, function (err) {
      inflightGet_ = null;
      throw err;
    });
    return inflightGet_;
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
      return getStoreWithRetry_();
    },
    putStore: function (store) {
      invalidateGetCache_();
      return postAction('putStore', { store: store }).then(function (data) {
        invalidateGetCache_();
        return data;
      });
    },
    request: function (action, body) {
      return enqueueCloud_(function () {
        return withRetry_(function () {
          return postOnce_(action, body || {}, 90000);
        }, 3).catch(function (err) {
          throw new Error(hwFriendlyCloudError_(err));
        });
      });
    }
  };
})(window);
