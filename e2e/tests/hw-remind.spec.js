const { test, expect } = require('@playwright/test');
const support = require('./support');

/** 合成資料：今天往前推幾天的日期（台北）。 */
function daysAgo(n) {
  const d = new Date(support.taipeiDate() + 'T12:00:00+08:00');
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function homework(id, title, due, records, extra) {
  return Object.assign({ id: id, title: title, date: due, dueDate: due, max: 100, records: records }, extra || {});
}

function addClass(store, className, students) {
  store.classes[className] = {
    className: className,
    rows: 2,
    cols: 2,
    version: 1,
    updatedAt: store.updatedAt,
    students: students,
    groups: { size: 4, assign: {}, scores: {} },
    lab: { assign: {}, scores: {} }
  };
}

/** 頁面物件：缺交提醒視窗。 */
class HwRemindPage {
  constructor(page) {
    this.page = page;
    this.dialog = page.getByRole('dialog', { name: /缺交作業/ });
    this.okButton = page.getByRole('button', { name: '知道了' });
    this.classPicker = page.getByRole('combobox', { name: '選擇班級' });
  }

  async open(mutate) {
    await support.installCloud(this.page, { mutate: mutate });
    await support.stubGoogle(this.page, support.TEACHER_EMAIL);
    await support.openApp(this.page);
  }

  seatCard(name) {
    return this.page.getByRole('button', { name: new RegExp(name) }).first();
  }

  async switchClass(className) {
    await this.classPicker.selectOption(className);
  }
}

test('進到班級時跳出缺交名單（姓名、作業、天數，嚴重的排前面）', async function ({ page }) {
  const health = support.trackHealth(page);
  const remind = new HwRemindPage(page);
  await remind.open(function (store) {
    store.classes['測試班'].students.push({ seatNo: '03', name: '測生丙', score: 0, row: 1, col: 0, note: '' });
    store.grades['測試班'] = {
      homeworks: [
        homework('h1', '學習講義 9-1', daysAgo(30), { '01': { status: 'missing' }, '02': { status: 'submitted', score: 90 }, '03': { status: 'submitted' } }),
        homework('h2', '學習講義 9-2', daysAgo(6), { '01': { status: 'missing' }, '03': { status: 'missing' }, '02': { status: 'submitted', score: 80 } })
      ]
    };
  });

  await expect(remind.dialog).toBeVisible();
  await expect(remind.dialog).toContainText('測試班 有 2 位同學缺交作業（其中 1 位嚴重缺交）');
  await expect(remind.dialog).toContainText('01 測生甲');
  await expect(remind.dialog).toContainText('學習講義 9-1');
  await expect(remind.dialog).toContainText('03 測生丙');
  await expect(remind.dialog).not.toContainText('測生乙');
  const rows = remind.dialog.getByRole('listitem');
  await expect(rows.first()).toContainText('01 測生甲');

  await remind.okButton.click();
  await expect(remind.dialog).toBeHidden();
  await support.expectTappable(remind.seatCard('測生甲'));
  await support.expectHealthy(health);
});

test('沒有過期未繳時不跳提醒（還沒到期、暫不計、都已繳）', async function ({ page }) {
  const health = support.trackHealth(page);
  const remind = new HwRemindPage(page);
  await remind.open(function (store) {
    store.grades['測試班'] = {
      homeworks: [
        homework('f1', '還沒到期', daysAgo(-3), { '01': { status: 'missing' } }),
        homework('x1', '暫不計的講義', daysAgo(20), { '01': { status: 'missing' } }, { excluded: true }),
        homework('s1', '都已繳', daysAgo(20), { '01': { status: 'submitted', score: 100 }, '02': { status: 'submitted', score: 70 } })
      ]
    };
  });

  await expect(remind.seatCard('測生甲')).toBeVisible();
  await expect(remind.dialog).toBeHidden();
  await support.expectTappable(remind.seatCard('測生甲'));
  await support.expectHealthy(health);
});

test('按 Esc 可關閉；同一班切走再切回來不會重複提醒，切到別班會提醒那一班', async function ({ page }) {
  const health = support.trackHealth(page);
  const remind = new HwRemindPage(page);
  // 班名「測試班」排在「測試班二」前面，打開網站時先進「測試班」；過了期限沒紀錄也算未繳，所以每人都給紀錄
  await remind.open(function (store) {
    addClass(store, '測試班二', [
      { seatNo: '01', name: '二班甲', score: 0, row: 0, col: 0, note: '' },
      { seatNo: '02', name: '二班乙', score: 0, row: 0, col: 1, note: '' }
    ]);
    store.grades['測試班'] = { homeworks: [homework('a1', '講義 A', daysAgo(6), {
      '01': { status: 'submitted', score: 90 }, '02': { status: 'missing' } })] };
    store.grades['測試班二'] = { homeworks: [homework('b1', '講義 B', daysAgo(6), {
      '01': { status: 'missing' }, '02': { status: 'submitted', score: 85 } })] };
  });

  await expect(remind.dialog).toBeVisible();
  await expect(remind.dialog).toContainText('測試班 有 1 位同學缺交作業');
  await expect(remind.dialog).toContainText('02 測生乙');
  await expect(remind.dialog).not.toContainText('測生甲');
  await page.keyboard.press('Escape');
  await expect(remind.dialog).toBeHidden();

  await remind.switchClass('測試班二');
  await expect(remind.dialog).toBeVisible();
  await expect(remind.dialog).toContainText('測試班二 有 1 位同學缺交作業');
  await expect(remind.dialog).toContainText('01 二班甲');
  await expect(remind.dialog).not.toContainText('二班乙');
  await remind.okButton.click();
  await expect(remind.dialog).toBeHidden();

  await remind.switchClass('測試班');
  await expect(remind.seatCard('測生乙')).toBeVisible();
  await expect(remind.dialog).toBeHidden();
  await support.expectHealthy(health);
});
