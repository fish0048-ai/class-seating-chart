const { test, expect } = require('@playwright/test');
const support = require('./support');

test.beforeEach(async function ({ page }) {
  await support.blockOutside(page);
  await page.addInitScript(function () {
    window.google = {
      accounts: {
        id: {
          initialize: function () {},
          renderButton: function () {},
          prompt: function () {},
          disableAutoSelect: function () {}
        }
      }
    };
  });
});

test('登入頁能載入，教師登入按鈕看得到也點得到', async function ({ page }) {
  const health = support.trackHealth(page);
  await support.openApp(page);
  await expect(page).toHaveTitle('班級座位表');
  const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewportMeta || '').not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/);
  await expect(page.getByRole('heading', { name: '班級座位表' })).toBeVisible();
  const login = page.getByRole('button', { name: '按此用 Google 登入' });
  await expect(login).toBeVisible();
  await support.expectTappable(login);
  await expect(page.locator('body')).toHaveClass(/need-login/);
  await expect(page.locator('#board')).toBeHidden();
  const overflow = await page.evaluate(function () {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(2);
  await support.expectHealthy(health);
});

test('非教師帳號停在登入頁並說明沒有權限', async function ({ page }) {
  const health = support.trackHealth(page);
  await support.stubGoogle(page, 'not-a-teacher@example.com');
  await support.openApp(page);
  await expect(page.locator('#loginGateHint')).toContainText('沒有權限');
  await expect(page.locator('body')).toHaveClass(/need-login/);
  await expect(page.locator('.seat-card')).toHaveCount(0);
  await support.expectHealthy(health);
});
