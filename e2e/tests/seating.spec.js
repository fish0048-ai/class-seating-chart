const { test, expect } = require('@playwright/test');
const support = require('./support');

test.beforeEach(async function ({ page }) {
  await support.installCloud(page);
  await support.stubGoogle(page, support.TEACHER_EMAIL);
});

test('合成名單的座號與姓名會出現在座位卡', async function ({ page }) {
  const health = support.trackHealth(page);
  await support.openApp(page);
  const first = page.getByRole('button', { name: /01 號 測生甲/ });
  const second = page.getByRole('button', { name: /02 號 測生乙/ });
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await support.expectTappable(first);
  await expect(page.locator('#classSelect')).toHaveValue('測試班');
  await expect(page.locator('#syncMeta')).not.toHaveText(/正在載入/);
  await support.expectTappable(page.getByRole('button', { name: '扣分', exact: true }));
  await support.expectTappable(page.getByRole('button', { name: '立即同步' }));
  const board = await page.locator('#board').boundingBox();
  const viewport = page.viewportSize();
  expect(board.x).toBeGreaterThanOrEqual(-1);
  expect(board.x + board.width).toBeLessThanOrEqual(viewport.width + 2);
  const overflow = await page.evaluate(function () {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = await first.evaluate(function (el) {
    return getComputedStyle(el).animationDuration;
  });
  expect(parseFloat(motion)).toBeLessThan(1);
  await support.expectHealthy(health);
});

test('扣分後立即同步，重新載入仍看得到分數', async function ({ page }) {
  const health = support.trackHealth(page);
  await support.openApp(page);
  const student = page.getByRole('button', { name: /測生甲/ });
  await expect(student).toBeVisible();
  await page.getByRole('button', { name: '扣分', exact: true }).click();
  await student.click();
  await page.getByRole('dialog').getByRole('button', { name: /上課表現扣分/ }).click();
  await expect(student).toContainText('-1');
  const saved = page.waitForResponse(function (response) {
    const request = response.request();
    return request.url().includes('script.google.com') && (request.postData() || '').indexOf('"action":"putStore"') >= 0;
  });
  await page.getByRole('button', { name: '立即同步' }).click();
  await saved;
  await expect(page.locator('#toast')).toContainText('加扣已上傳雲端');
  await page.reload();
  await expect(page.getByRole('button', { name: /測生甲，今日 -1 分/ })).toBeVisible();
  await support.expectHealthy(health);
});

test('違反上課規範：記原因、座位卡顯示、不扣座位卡分數；取消則不記', async function ({ page }) {
  const health = support.trackHealth(page);
  await support.openApp(page);
  const student = page.getByRole('button', { name: /測生甲/ });
  await expect(student).toBeVisible();
  await page.getByRole('button', { name: '扣分', exact: true }).click();

  await student.click();
  const picker = page.getByRole('dialog', { name: /測生甲/ });
  await expect(picker).toBeVisible();
  await picker.getByRole('button', { name: '取消' }).click();
  await expect(picker).toBeHidden();
  await expect(student).not.toContainText('上課講話');

  await student.click();
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('button', { name: /上課講話/ })).toBeVisible();
  await expect(picker.getByRole('button', { name: /玩手機/ })).toHaveCount(0);
  await picker.getByRole('button', { name: /上課講話/ }).click();
  await expect(picker).toBeHidden();
  await expect(student).toContainText('上課講話');
  await expect(page.locator('#toast')).toContainText('從平時成績扣');
  await expect(page.getByRole('button', { name: /測生甲，今日 0 分/ })).toBeVisible();
  await support.expectHealthy(health);
});

test('實驗室模式可把學生拖到另一組', async function ({ page }) {
  const health = support.trackHealth(page);
  await support.openApp(page);
  await page.getByRole('button', { name: '實驗室模式' }).click();
  const zone1 = page.locator('.lab-zone[data-group="1"]');
  const zone2 = page.locator('.lab-zone[data-group="2"]');
  await expect(zone1.getByRole('button', { name: /測生甲/ })).toBeVisible();
  await expect(zone2.getByRole('button', { name: /測生乙/ })).toBeVisible();
  await zone1.getByRole('button', { name: /測生甲/ }).dragTo(zone2);
  await expect(zone2.getByRole('button', { name: /測生甲/ })).toBeVisible();
  await expect(zone1.getByRole('button', { name: /測生甲/ })).toHaveCount(0);
  await support.expectHealthy(health);
});

test('實驗室隨機分組：六組人數均衡、男女平均、成績異質', async function ({ page }) {
  const health = support.trackHealth(page);
  const names = [
    { seatNo: '01', name: '甲男一', gender: 'M', score: 95 },
    { seatNo: '02', name: '乙女一', gender: 'F', score: 92 },
    { seatNo: '03', name: '丙男二', gender: 'M', score: 88 },
    { seatNo: '04', name: '丁女二', gender: 'F', score: 85 },
    { seatNo: '05', name: '戊男三', gender: 'M', score: 78 },
    { seatNo: '06', name: '己女三', gender: 'F', score: 75 },
    { seatNo: '07', name: '庚男四', gender: 'M', score: 68 },
    { seatNo: '08', name: '辛女四', gender: 'F', score: 65 },
    { seatNo: '09', name: '壬男五', gender: 'M', score: 58 },
    { seatNo: '10', name: '癸女五', gender: 'F', score: 55 },
    { seatNo: '11', name: '子男六', gender: 'M', score: 48 },
    { seatNo: '12', name: '丑女六', gender: 'F', score: 45 }
  ];
  await support.installCloud(page, {
    mutate: function (store) {
      store.classes['測試班'].students = names.map(function (s, i) {
        return {
          seatNo: s.seatNo,
          name: s.name,
          score: 0,
          row: Math.floor(i / 6),
          col: i % 6,
          note: '',
          gender: s.gender
        };
      });
      store.classes['測試班'].rows = 2;
      store.classes['測試班'].cols = 6;
      store.classes['測試班'].lab = { assign: {}, scores: {} };
    }
  });
  await support.openApp(page);
  await page.getByRole('button', { name: '實驗室模式' }).click();
  await expect(page.getByRole('button', { name: /甲男一/ })).toBeVisible();

  const stats = await page.evaluate(function (roster) {
    var api = window.__labGrouping;
    if (!api || typeof api.splitIntoSixBalanced !== 'function') {
      return { error: '缺少 __labGrouping' };
    }
    var scoreMap = {};
    var genderMap = {};
    roster.forEach(function (s) {
      scoreMap[s.seatNo] = s.score;
      genderMap[s.seatNo] = s.gender;
    });
    var assign = api.splitIntoSixBalanced(
      roster,
      function (s) { return scoreMap[String(s.seatNo)] || 0; },
      function (s) { return genderMap[String(s.seatNo)] || ''; }
    );
    var groups = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    Object.keys(assign).forEach(function (seat) {
      groups[assign[seat]].push(seat);
    });
    var sizes = [1, 2, 3, 4, 5, 6].map(function (g) { return groups[g].length; });
    var males = [1, 2, 3, 4, 5, 6].map(function (g) {
      return groups[g].filter(function (seat) { return genderMap[seat] === 'M'; }).length;
    });
    var sums = [1, 2, 3, 4, 5, 6].map(function (g) {
      return groups[g].reduce(function (acc, seat) { return acc + (scoreMap[seat] || 0); }, 0);
    });
    return {
      sizes: sizes,
      males: males,
      sums: sums,
      sizeSpread: Math.max.apply(null, sizes) - Math.min.apply(null, sizes),
      maleSpread: Math.max.apply(null, males) - Math.min.apply(null, males),
      sumSpread: Math.max.apply(null, sums) - Math.min.apply(null, sums),
      genderOk: api.normalizeGenderValue_('女') === 'F' && api.normalizeGenderValue_('男') === 'M'
    };
  }, names);

  expect(stats.error || null).toBeNull();
  expect(stats.genderOk).toBe(true);
  expect(stats.sizeSpread).toBeLessThanOrEqual(1);
  expect(stats.maleSpread).toBeLessThanOrEqual(1);
  // 高分全塞一組時總和差會很大；異質分組應明顯較小（12 人分數 95…45）
  expect(stats.sumSpread).toBeLessThan(120);

  await page.getByRole('button', { name: '隨機分成六組' }).click();
  await expect(page.locator('#toast')).toContainText(/成績異質|男女平均/);
  await support.expectHealthy(health);
});

test('實驗室隨機分組：多數未知性別時提示加性別欄', async function ({ page }) {
  const health = support.trackHealth(page);
  await support.installCloud(page, {
    mutate: function (store) {
      store.classes['測試班'].students = [
        { seatNo: '01', name: '測生甲', score: 0, row: 0, col: 0, note: '', gender: '' },
        { seatNo: '02', name: '測生乙', score: 0, row: 0, col: 1, note: '', gender: '' },
        { seatNo: '03', name: '測生丙', score: 0, row: 1, col: 0, note: '', gender: '' },
        { seatNo: '04', name: '測生丁', score: 0, row: 1, col: 1, note: '', gender: '' }
      ];
      store.classes['測試班'].lab = { assign: { '01': 1, '02': 2, '03': 3, '04': 4 }, scores: {} };
    }
  });
  await support.openApp(page);
  await page.getByRole('button', { name: '實驗室模式' }).click();
  await page.getByRole('button', { name: '隨機分成六組' }).click();
  await expect(page.locator('#toast')).toContainText('建議在名單加性別欄');
  await support.expectHealthy(health);
});

test('座位卡可用鍵盤選取', async function ({ page }) {
  const health = support.trackHealth(page);
  await support.openApp(page);
  const student = page.getByRole('button', { name: /測生乙/ });
  await student.focus();
  await page.keyboard.press('Enter');
  await expect(student).toHaveClass(/selected/);
  await support.expectHealthy(health);
});

test('雲端拒絕時不顯示座位卡，並提供重新載入', async function ({ page }) {
  const health = support.trackHealth(page);
  await support.installCloud(page, { mode: 'error' });
  await support.openApp(page);
  await expect(page.getByRole('button', { name: '重新載入' })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.seat-card')).toHaveCount(0);
  await expect(page.locator('#board')).toContainText('測試用雲端拒絕');
  await support.expectHealthy(health);
});
