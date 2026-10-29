const { expect } = require('@playwright/test');

const TEACHER_EMAIL = 'chunhsinkuo@kcis.hc.edu.tw';

function taipeiDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function fakeJwt(email) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    email: email,
    name: '雲端測試',
    exp: Math.floor(Date.now() / 1000) + 60 * 60
  })).toString('base64url');
  return header + '.' + payload + '.e2e';
}

function freshStore() {
  const today = taipeiDate();
  return {
    classes: {
      '測試班': {
        className: '測試班',
        rows: 2,
        cols: 2,
        version: 1,
        updatedAt: today + 'T01:00:00.000Z',
        students: [
          { seatNo: '01', name: '測生甲', score: 0, row: 0, col: 0, note: '' },
          { seatNo: '02', name: '測生乙', score: 0, row: 0, col: 1, note: '' }
        ],
        groups: { size: 4, assign: {}, scores: {} },
        lab: { assign: { '01': 1, '02': 2 }, scores: {} }
      }
    },
    history: [],
    daily: {},
    grades: {},
    scoreDate: today,
    updatedAt: today + 'T01:00:00.000Z'
  };
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': '*',
    'content-type': 'application/json; charset=utf-8'
  };
}

function trackHealth(page) {
  const pageErrors = [];
  const failedResources = [];
  page.on('pageerror', function (error) {
    pageErrors.push(String(error && error.message ? error.message : error));
  });
  page.on('requestfailed', function (request) {
    const url = request.url();
    if (/accounts\.google\.com|script\.google\.com/.test(url)) return;
    failedResources.push(url);
  });
  return { pageErrors: pageErrors, failedResources: failedResources };
}

async function expectHealthy(health) {
  expect(health.pageErrors, '頁面不應有 JavaScript 錯誤').toEqual([]);
  expect(health.failedResources, '主要資源不應載入失敗').toEqual([]);
}

async function blockOutside(page) {
  await page.route('**/*', function (route) {
    const url = route.request().url();
    if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) return route.continue();
    const type = route.request().resourceType();
    if (type === 'script') {
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: '/* e2e skips outside scripts */'
      });
    }
    return route.fulfill({ status: 204, body: '' });
  });
}

function cloudPayload(action, store, body) {
  if (action === 'getStore') return { store: store };
  if (action === 'getStoreMeta') return { updatedAt: store.updatedAt || '', empty: false };
  if (action === 'verifyAuth') return { ok: true, teacher: true, email: TEACHER_EMAIL };
  if (action === 'putStore') return { ok: true, updatedAt: (body.store && body.store.updatedAt) || store.updatedAt || '' };
  if (action === 'getTimetable') return { error: '測試不讀正式課表' };
  return { ok: true };
}

async function installCloud(page, options) {
  const mode = (options && options.mode) || 'ok';
  let store = freshStore();
  page.on('dialog', function (dialog) { return dialog.accept(); });
  await blockOutside(page);
  await page.route('https://script.google.com/**', async function (route) {
    const request = route.request();
    const url = request.url();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }
    if (request.resourceType() === 'script' || url.indexOf('callback=') >= 0) {
      const callback = new URL(url).searchParams.get('callback') || 'seatCloudUnused';
      const body = mode === 'error'
        ? callback + '({error:"測試用雲端拒絕"});'
        : callback + '(' + JSON.stringify(cloudPayload(new URL(url).searchParams.get('action') || 'getStore', store, {})) + ');';
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: body
      });
      return;
    }
    let action = '';
    let body = {};
    try {
      body = JSON.parse(request.postData() || '{}');
      action = body.action || '';
    } catch (err) {
      action = '';
    }
    if (mode === 'error' && (action === 'getStore' || action === 'getStoreMeta')) {
      await route.fulfill({
        status: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ error: '測試用雲端拒絕' })
      });
      return;
    }
    if (action === 'putStore' && body.store) store = body.store;
    await route.fulfill({
      status: 200,
      headers: corsHeaders(),
      body: JSON.stringify(cloudPayload(action, store, body))
    });
  });
}

async function stubGoogle(page, email) {
  const jwt = fakeJwt(email);
  await page.addInitScript(function (token) {
    window.google = {
      accounts: {
        id: {
          initialize: function (opts) {
            if (opts && typeof opts.callback === 'function') opts.callback({ credential: token });
          },
          renderButton: function () {},
          prompt: function () {},
          disableAutoSelect: function () {}
        }
      }
    };
  }, jwt);
}

async function openApp(page) {
  const response = await page.goto('/docs/index.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
  expect(response, '座位表沒有回應').toBeTruthy();
  expect(response.ok(), '座位表頁面應成功載入').toBe(true);
  const css = await page.request.get('/docs/styles.css');
  const script = await page.request.get('/docs/app.js');
  expect(css.ok(), '樣式檔應載入').toBe(true);
  expect(script.ok(), '主程式應載入').toBe(true);
}

async function expectTappable(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box, '元素應在畫面上').toBeTruthy();
  expect(box.height).toBeGreaterThanOrEqual(40);
  expect(box.width).toBeGreaterThanOrEqual(40);
  const viewport = locator.page().viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
  const visible = await locator.evaluate(function (el) {
    const rect = el.getBoundingClientRect();
    const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
    const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + Math.min(rect.height / 2, 20)));
    const top = document.elementFromPoint(x, y);
    return !!(top && (top === el || el.contains(top)));
  });
  expect(visible, '按鈕或座位卡不應被其他元素擋住').toBe(true);
}

module.exports = {
  TEACHER_EMAIL: TEACHER_EMAIL,
  trackHealth: trackHealth,
  expectHealthy: expectHealthy,
  blockOutside: blockOutside,
  installCloud: installCloud,
  stubGoogle: stubGoogle,
  openApp: openApp,
  expectTappable: expectTappable
};
