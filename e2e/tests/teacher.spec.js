const { test, expect } = require('@playwright/test');
const support = require('./support');

test('教師模式可查看名單、成績、日誌、缺交與課表', async function ({ page }) {
  const health = support.trackHealth(page);
  const sheetWrites = [];
  page.on('request', function (request) {
    const url = request.url();
    if (request.method() !== 'GET' && /docs\.google\.com|13VrWBx6hoKpUON/.test(url)) {
      sheetWrites.push(request.method() + ' ' + url);
    }
  });
  await support.installCloud(page);
  await support.stubGoogle(page, support.TEACHER_EMAIL);
  await support.openApp(page);

  await page.getByRole('button', { name: '教師模式', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教師模式' })).toBeVisible();
  await expect(page.locator('#dbBody input[data-col="name"]').first()).toHaveValue('測生甲');
  await support.expectTappable(page.getByRole('button', { name: '名單', exact: true }));

  await page.getByRole('button', { name: '缺交作業', exact: true }).click();
  await expect(page.locator('#missingList')).toContainText('還沒有缺交名單');

  await page.getByRole('button', { name: '教學日誌', exact: true }).click();
  await expect(page.locator('#journalOverview')).toContainText('測試班');

  await page.getByRole('button', { name: '成績', exact: true }).click();
  await expect(page.getByRole('button', { name: '學期成績', exact: true })).toBeVisible();
  await expect(page.locator('#gradeTermView')).toBeVisible();

  await page.getByRole('button', { name: '設定與上傳', exact: true }).click();
  await expect(page.getByRole('heading', { name: '雲端資料庫（平板與筆電共用）' })).toBeVisible();

  await page.getByRole('button', { name: '課表', exact: true }).click();
  await expect(page.locator('#timetableStatus')).toContainText('不是成績資料庫');
  await expect(page.locator('#timetableStatus')).toContainText('備援課表', { timeout: 15000 });
  expect(sheetWrites, '測試不應寫入課表試算表').toEqual([]);

  const overflow = await page.evaluate(function () {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(2);
  await support.expectHealthy(health);
});
