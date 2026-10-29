const { test, expect } = require('@playwright/test');

test('這支測試故意失敗，用來確認 master 不能合併', function () {
  expect(false).toBe(true);
});
