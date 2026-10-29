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
