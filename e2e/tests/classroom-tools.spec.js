const { test, expect } = require('@playwright/test');
const support = require('./support');

const ROSTER = [
  { name: '測生甲', seat: '01' },
  { name: '測生乙', seat: '02' }
];

async function signIn(page) {
  const health = support.trackHealth(page);
  await support.installCloud(page);
  await support.stubGoogle(page, support.TEACHER_EMAIL);
  await support.openApp(page);
  await expect(page.getByRole('button', { name: /測生甲/ })).toBeVisible();
  return health;
}

async function clickReady(locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate(function (el) {
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await locator.click();
}

async function expectFits(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const viewport = locator.page().viewportSize();
  expect(box, '面板應在畫面上').toBeTruthy();
  expect(box.width).toBeGreaterThan(0);
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
  const overflow = await locator.page().evaluate(function () {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });
  expect(overflow, '面板不應橫向超出螢幕').toBeLessThanOrEqual(2);
}

async function expectOverlayFits(locator) {
  const box = await locator.boundingBox();
  const viewport = locator.page().viewportSize();
  expect(box, '視窗應在畫面上').toBeTruthy();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 2);
}

async function setChecked(page, selector, checked) {
  await page.locator(selector).evaluate(function (el, value) {
    el.checked = value;
  }, checked);
}

test.describe('抽籤', function () {
  test('可以抽出合成名單中的學生', async function ({ page }) {
    const health = await signIn(page);
    const open = page.getByRole('button', { name: '抽籤', exact: true });
    await expect(open).toBeVisible();
    await support.expectTappable(open);
    await clickReady(open);
    const dialog = page.getByRole('dialog', { name: '隨機抽籤' });
    await expect(dialog).toBeVisible();
    await expectOverlayFits(page.locator('#lotteryCard'));
    await expect(page.locator('#lotteryMeta')).toContainText('就是你！座號');
    const name = (await page.locator('#lotteryName').innerText()).trim();
    const winner = ROSTER.find(function (student) { return student.name === name; });
    expect(winner, '抽出的學生應屬於合成班級').toBeTruthy();
    await expect(page.locator('#lotteryMeta')).toContainText('座號 ' + winner.seat);
    await expect(page.locator('#toast')).toBeHidden();
    await support.expectTappable(page.getByRole('button', { name: '再抽一次' }));
    await support.expectHealthy(health);
  });

  test('未勾選成績區間時不能抽籤', async function ({ page }) {
    const health = await signIn(page);
    await setChecked(page, '#lotteryTierHigh', false);
    await setChecked(page, '#lotteryTierMid', false);
    await setChecked(page, '#lotteryTierLow', false);
    await clickReady(page.getByRole('button', { name: '抽籤', exact: true }));
    await expect(page.locator('#toast')).toContainText('請至少勾選一個成績區間（高／中／低）');
    await expect(page.getByRole('dialog', { name: '隨機抽籤' })).toBeVisible();
    await expect(page.locator('#lotteryName')).toHaveText('？');
    await expectOverlayFits(page.locator('#lotteryCard'));
    await support.expectHealthy(health);
  });

  test('未分組時整組抽籤會提示', async function ({ page }) {
    const health = await signIn(page);
    await setChecked(page, '#lotteryModeGroup', true);
    await clickReady(page.getByRole('button', { name: '抽籤', exact: true }));
    await expect(page.locator('#toast')).toContainText('請先分組再抽整組／組內一人');
    await expect(page.getByRole('dialog', { name: '隨機抽籤' })).toBeVisible();
    await expect(page.locator('#lotteryName')).toHaveText('？');
    await expectOverlayFits(page.locator('#lotteryCard'));
    await support.expectHealthy(health);
  });

  test('未分組時組內一人抽籤會提示', async function ({ page }) {
    const health = await signIn(page);
    await setChecked(page, '#lotteryModeInGroup', true);
    await clickReady(page.getByRole('button', { name: '抽籤', exact: true }));
    await expect(page.locator('#toast')).toContainText('請先分組再抽整組／組內一人');
    await expect(page.locator('#lotteryName')).toHaveText('？');
    await support.expectHealthy(health);
  });
});

test.describe('定時器', function () {
  test('可以設定、暫停、重設，並在時間到後結束', async function ({ page }) {
    await page.clock.install();
    const health = await signIn(page);
    await page.clock.fastForward(2210);

    const open = page.getByRole('button', { name: '定時', exact: true });
    await expect(open).toBeVisible();
    await support.expectTappable(open);
    await clickReady(open);

    const panel = page.locator('#timerPanel');
    await expect(panel).toBeVisible();
    await expect(page.locator('#timerDisplay')).toHaveText('03:00');
    await expect(page.locator('#timerStatus')).toHaveText('可調整時間後按開始');
    await expectFits(panel);
    await support.expectTappable(panel.getByRole('button', { name: '開始', exact: true }));

    await panel.locator('#timerMinutes').fill('0');
    await panel.locator('#timerSeconds').fill('0');
    await clickReady(panel.getByRole('button', { name: '套用' }));
    await expect(page.locator('#toast')).toContainText('時間至少要 1 秒');
    await page.clock.fastForward(2210);

    await clickReady(panel.getByRole('button', { name: '30秒' }));
    await expect(page.locator('#timerDisplay')).toHaveText('00:30');
    await clickReady(panel.getByRole('button', { name: '開始', exact: true }));
    await expect(page.locator('#timerStatus')).toHaveText('作答進行中');
    await expect(page.locator('#timerDisplay')).toHaveText('00:30');
    await expect(panel.getByRole('button', { name: '暫停' })).toBeEnabled();

    await page.clock.fastForward(8000);
    await expect(page.locator('#timerDisplay')).toHaveText('00:22');
    await expect(page.getByRole('button', { name: /定時 00:22/ })).toBeVisible();

    await clickReady(panel.getByRole('button', { name: '暫停' }));
    await expect(page.locator('#timerStatus')).toHaveText('已暫停，可按繼續');
    await expect(page.locator('#toast')).toContainText('已暫停');
    await expect(panel.getByRole('button', { name: '繼續' })).toBeVisible();
    await expect(panel.getByRole('button', { name: '暫停' })).toBeDisabled();
    await page.clock.fastForward(2210);

    await clickReady(panel.getByRole('button', { name: '重設' }));
    await expect(page.locator('#timerDisplay')).toHaveText('00:30');
    await expect(page.locator('#timerStatus')).toHaveText('可調整時間後按開始');
    await expect(page.locator('#toast')).toContainText('已重設為 00:30');
    await page.clock.fastForward(2210);

    await panel.locator('#timerMinutes').fill('0');
    await panel.locator('#timerSeconds').fill('5');
    await clickReady(panel.getByRole('button', { name: '套用' }));
    await expect(page.locator('#timerDisplay')).toHaveText('00:05');
    await page.clock.fastForward(2210);
    await clickReady(panel.getByRole('button', { name: '開始', exact: true }));
    await page.clock.fastForward(5200);
    await expect(panel).toHaveClass(/done/);
    await expect(page.locator('#timerStatus')).toHaveText('時間到！');
    await expect(page.locator('#timerDisplay')).toHaveText('00:00');
    await expect(page.locator('#toast')).toContainText('時間到！');
    await support.expectHealthy(health);
  });
});

function installNoiseMock(page, mode) {
  return page.addInitScript(function (kind) {
    window.__e2eNoise = { stops: 0, closed: false };
    var track = {
      stop: function () { window.__e2eNoise.stops += 1; }
    };
    var stream = {
      getTracks: function () { return [track]; }
    };

    function FakeAnalyser() {
      this.fftSize = 2048;
    }
    FakeAnalyser.prototype.getFloatTimeDomainData = function (arr) {
      var i;
      for (i = 0; i < arr.length; i++) arr[i] = 0.02;
    };
    FakeAnalyser.prototype.connect = function () {};

    function FakeSource() {}
    FakeSource.prototype.connect = function () {};

    function FakeAudioParam() {}
    FakeAudioParam.prototype.setValueAtTime = function () {};
    FakeAudioParam.prototype.exponentialRampToValueAtTime = function () {};

    function FakeNode() {
      this.gain = new FakeAudioParam();
      this.frequency = new FakeAudioParam();
    }
    FakeNode.prototype.connect = function () {};
    FakeNode.prototype.start = function () {};
    FakeNode.prototype.stop = function () {};

    function FakeAudioContext() {
      this.state = 'running';
      this.currentTime = 0;
      this.destination = new FakeNode();
    }
    FakeAudioContext.prototype.createMediaStreamSource = function () { return new FakeSource(); };
    FakeAudioContext.prototype.createAnalyser = function () { return new FakeAnalyser(); };
    FakeAudioContext.prototype.createGain = function () { return new FakeNode(); };
    FakeAudioContext.prototype.createOscillator = function () { return new FakeNode(); };
    FakeAudioContext.prototype.resume = function () { return Promise.resolve(); };
    FakeAudioContext.prototype.close = function () {
      window.__e2eNoise.closed = true;
      return Promise.resolve();
    };
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;

    var devices = kind === 'missing' ? undefined : {
      getUserMedia: function () {
        if (kind === 'denied') return Promise.reject(new Error('denied'));
        return Promise.resolve(stream);
      }
    };
    try {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        get: function () { return devices; }
      });
    } catch (err) {
      navigator.mediaDevices = devices;
    }
  }, mode);
}

test.describe('測分貝', function () {
  test('可以開始測量，停止時會關閉麥克風', async function ({ page }) {
    await installNoiseMock(page, 'ok');
    const health = await signIn(page);
    const open = page.getByRole('button', { name: '測分貝', exact: true });
    await expect(open).toBeVisible();
    await support.expectTappable(open);
    await clickReady(open);

    const panel = page.locator('#noisePanel');
    await expect(panel).toBeVisible();
    await expect(page.locator('#noiseStatus')).toHaveText('尚未開始');
    await expect(page.locator('#noiseDisplay')).toHaveText('—');
    await expectFits(panel);
    const start = panel.getByRole('button', { name: '開始', exact: true });
    await support.expectTappable(start);
    await clickReady(start);

    await expect(page.locator('#toast')).toContainText('測分貝已開始');
    await expect(page.locator('#noiseDisplay')).not.toHaveText('—');
    await expect(panel.getByRole('button', { name: '停止' })).toBeEnabled();
    await clickReady(panel.getByRole('button', { name: '停止' }));
    await expect(page.locator('#noiseDisplay')).toHaveText('—');
    await expect(page.locator('#noiseStatus')).toHaveText('尚未開始');
    const noise = await page.evaluate(function () { return window.__e2eNoise; });
    expect(noise.stops, '停止後應關閉麥克風軌道').toBeGreaterThanOrEqual(1);
    expect(noise.closed, '停止後應關閉音訊處理').toBe(true);
    await support.expectHealthy(health);
  });

  test('拒絕麥克風時會提示', async function ({ page }) {
    await installNoiseMock(page, 'denied');
    const health = await signIn(page);
    await clickReady(page.getByRole('button', { name: '測分貝', exact: true }));
    await expect(page.locator('#noisePanel')).toBeVisible();
    await clickReady(page.locator('#noisePanel').getByRole('button', { name: '開始', exact: true }));
    await expect(page.locator('#toast')).toContainText('請允許麥克風後再按開始');
    await expect(page.locator('#noiseDisplay')).toHaveText('—');
    await expect(page.locator('#btnNoiseStop')).toBeDisabled();
    const noise = await page.evaluate(function () { return window.__e2eNoise; });
    expect(noise.stops).toBe(0);
    await support.expectHealthy(health);
  });

  test('瀏覽器沒有麥克風功能時會提示', async function ({ page }) {
    await installNoiseMock(page, 'missing');
    const health = await signIn(page);
    await clickReady(page.getByRole('button', { name: '測分貝', exact: true }));
    await expect(page.locator('#noisePanel')).toBeVisible();
    await clickReady(page.locator('#noisePanel').getByRole('button', { name: '開始', exact: true }));
    await expect(page.locator('#toast')).toContainText('這個瀏覽器不支援麥克風測分貝');
    await expect(page.locator('#noiseDisplay')).toHaveText('—');
    await support.expectHealthy(health);
  });
});
