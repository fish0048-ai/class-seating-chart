(function (global) {
  var CLIENT_KEY = 'class-seating-google-client-id';
  var user = null;
  var onSignedInCb = null;
  var booted = false;

  function configClientId() {
    return String((global.SEAT_CONFIG && global.SEAT_CONFIG.googleClientId) || '').trim();
  }

  function savedClientId() {
    try {
      return String(localStorage.getItem(CLIENT_KEY) || '').trim();
    } catch (err) {
      return '';
    }
  }

  function clientId() {
    return configClientId() || savedClientId();
  }

  function teacherEmails() {
    var list = (global.SEAT_CONFIG && global.SEAT_CONFIG.teacherEmails) || [];
    return list.map(function (email) {
      return String(email || '').trim().toLowerCase();
    }).filter(Boolean);
  }

  function isTeacherEmail(email) {
    return teacherEmails().indexOf(String(email || '').trim().toLowerCase()) >= 0;
  }

  function parseJwt(token) {
    try {
      var payload = String(token || '').split('.')[1] || '';
      payload = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (payload.length % 4) payload += '=';
      var json = decodeURIComponent(atob(payload).split('').map(function (ch) {
        return '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(json);
    } catch (err) {
      return null;
    }
  }

  function showGate(show) {
    var gate = document.getElementById('loginGate');
    document.body.classList.toggle('need-login', !!show);
    if (gate) gate.hidden = !show;
  }

  function renderAccount() {
    var text = '';
    if (user && user.email) {
      text = (user.teacher ? '教師' : '檢視') + ' · ' + user.email;
    }
    document.querySelectorAll('[data-account-label]').forEach(function (el) {
      el.textContent = text;
    });
    document.body.classList.toggle('role-teacher', !!(user && user.teacher));
    document.body.classList.toggle('role-viewer', !!(user && user.email && !user.teacher));
    document.body.classList.toggle('teacher-on', !!(user && user.teacher));
  }

  function applyUser(token, claims, teacher) {
    user = {
      email: String(claims.email || '').trim().toLowerCase(),
      name: claims.name || '',
      picture: claims.picture || '',
      teacher: !!teacher,
      idToken: token,
      exp: Number(claims.exp) || 0
    };
    showGate(false);
    renderAccount();
    if (onSignedInCb) onSignedInCb(user, booted);
    booted = true;
  }

  function verifyThenApply(token) {
    var claims = parseJwt(token);
    if (!claims || !claims.email) {
      return Promise.reject(new Error('Google 登入沒有信箱，請改用其他帳號'));
    }
    var teacherGuess = isTeacherEmail(claims.email);
    applyUser(token, claims, teacherGuess);
    if (typeof CloudStore === 'undefined' || !CloudStore.verifyAuth) {
      return Promise.resolve(user);
    }
    return CloudStore.verifyAuth(token).then(function (data) {
      if (data && data.email) {
        user.email = String(data.email).trim().toLowerCase();
        user.teacher = !!data.teacher;
        renderAccount();
        if (onSignedInCb) onSignedInCb(user, true);
      }
      return user;
    }).catch(function () {
      return user;
    });
  }

  function handleCredential(response) {
    if (!response || !response.credential) return;
    verifyThenApply(response.credential).catch(function (err) {
      var hint = document.getElementById('loginGateHint');
      if (hint) hint.textContent = err && err.message ? err.message : '登入失敗，請再試一次';
    });
  }

  function updateSetupUi() {
    var setup = document.getElementById('googleClientSetup');
    var wrap = document.getElementById('googleSignInWrap');
    var has = !!clientId();
    if (setup) setup.hidden = has;
    if (wrap) wrap.hidden = !has;
  }

  function renderButton() {
    var host = document.getElementById('googleSignInBtn');
    if (!host || !window.google || !google.accounts || !google.accounts.id) return;
    if (!clientId()) return;
    host.innerHTML = '';
    google.accounts.id.initialize({
      client_id: clientId(),
      callback: handleCredential,
      auto_select: false,
      ux_mode: 'popup',
      context: 'signin',
      login_hint: teacherEmails()[0] || '',
      cancel_on_tap_outside: true
    });
    google.accounts.id.renderButton(host, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      logo_alignment: 'left',
      locale: 'zh-TW',
      width: 280
    });
    paintExtraButtons();
    if (!user) {
      try {
        google.accounts.id.prompt();
      } catch (err) {}
    }
  }

  function paintExtraButtons() {
    var extra = document.getElementById('googleSignInBtnSettings');
    if (!extra || !window.google || !google.accounts || !google.accounts.id || !clientId()) return;
    extra.innerHTML = '';
    google.accounts.id.initialize({
      client_id: clientId(),
      callback: handleCredential,
      auto_select: false,
      ux_mode: 'popup',
      context: 'signin',
      login_hint: teacherEmails()[0] || '',
      cancel_on_tap_outside: true
    });
    google.accounts.id.renderButton(extra, {
      type: 'standard',
      theme: 'outline',
      size: 'medium',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      locale: 'zh-TW',
      width: 260
    });
  }

  function waitGsi(cb) {
    var n = 0;
    (function tick() {
      if (window.google && google.accounts && google.accounts.id) {
        cb();
        return;
      }
      if (++n > 80) {
        cb(new Error('無法載入 Google 登入，請檢查網路'));
        return;
      }
      setTimeout(tick, 100);
    })();
  }

  function bindSetup() {
    var saveBtn = document.getElementById('btnSaveGoogleClient');
    var input = document.getElementById('googleClientIdInput');
    if (input && clientId() && !input.value) input.value = clientId();
    if (!saveBtn) return;
    saveBtn.onclick = function () {
      var id = input ? String(input.value || '').trim() : '';
      if (!id || id.indexOf('.apps.googleusercontent.com') < 0) {
        var hint = document.getElementById('loginGateHint');
        if (hint) hint.textContent = '請貼上結尾是 .apps.googleusercontent.com 的用戶端 ID';
        return;
      }
      try {
        localStorage.setItem(CLIENT_KEY, id);
      } catch (err) {}
      if (global.SEAT_CONFIG) global.SEAT_CONFIG.googleClientId = id;
      updateSetupUi();
      waitGsi(function (err) {
        var hint = document.getElementById('loginGateHint');
        if (err) {
          if (hint) hint.textContent = err.message;
          return;
        }
        if (hint) hint.textContent = '請用 Google 帳號登入';
        renderButton();
      });
    };
  }

  global.GoogleAuth = {
    start: function (opts) {
      onSignedInCb = opts && opts.onSignedIn;
      booted = false;
      showGate(true);
      renderAccount();
      updateSetupUi();
      bindSetup();
      if (!clientId()) return;
      waitGsi(function (err) {
        var hint = document.getElementById('loginGateHint');
        if (err) {
          if (hint) hint.textContent = err.message;
          return;
        }
        renderButton();
      });
    },
    isSignedIn: function () {
      return !!(user && user.email);
    },
    isTeacher: function () {
      return !!(user && user.teacher);
    },
    isViewer: function () {
      return !!(user && user.email && !user.teacher);
    },
    getIdToken: function () {
      return user && user.idToken ? user.idToken : '';
    },
    tokenExpired: function () {
      if (!user || !user.exp) return true;
      return user.exp * 1000 < Date.now() + 60000;
    },
    renderExtraButtons: paintExtraButtons,
    email: function () {
      return user && user.email ? user.email : '';
    },
    teacherEmails: teacherEmails,
    clientId: clientId,
    signOut: function () {
      user = null;
      try {
        if (window.google && google.accounts && google.accounts.id) {
          google.accounts.id.disableAutoSelect();
        }
      } catch (err) {}
      window.location.reload();
    }
  };

  global.TeacherAuth = {
    hasPassword: function () {
      return false;
    },
    isUnlocked: function () {
      return global.GoogleAuth.isTeacher();
    },
    unlock: function () {},
    lock: function () {
      global.GoogleAuth.signOut();
    },
    setPassword: function () {
      return Promise.resolve();
    },
    verify: function () {
      return Promise.resolve(false);
    }
  };
})(window);
