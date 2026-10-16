# 缺交作業繳交期限與工作天顯示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 缺交作業每筆必填繳交期限；上課座位表與缺交條列出各份缺交已過幾個工作天（與學期成績 `workDaysLate` 同一套算法）。

**Architecture:** 擴充 `store.hwMissing` 項目的 `dueDate`；顯示層只採用「完整項目」（有合法期限）。天數即時用 `workDaysLate(dueDate, 今天)` 計算，不寫進雲端。教師分頁仍顯示缺期限舊資料並可補填。

**Tech Stack:** 現有 vanilla JS（`docs/api.js`、`docs/app.js`、`docs/index.html`、`docs/styles.css`）；驗證用 `%TEMP%\seat-check` 無頭 Chrome。

**Spec:** `docs/superpowers/specs/2026-10-16-hw-missing-due-date-design.md`

## Global Constraints

- 正式碼只改 `docs/`；不要改 `legacy/`、不要改 `Code.gs`（本功能不必重新部署後端）
- `normalize()` 必須繼續保留 `classroom.groups` 與 `classroom.lab`
- 不要在 `renderLabBoard`／重繪時 `persistLab` 或存檔
- 腳本順序維持：`config.js` → `cloud.js` → `api.js` → `auth.js` → `app.js`
- 改 `app.js` 後必須確認畫面有座位卡（不要只看截圖）
- Commit 訊息繁體中文，格式 `<type>: <主旨>`；完成後依專案規則 push
- 假日規則沿用 `isNonWorkday`／`TW_HOLIDAYS`／成績規則 `holidays`，不要另做一份
- 抽籤加權不要寫進 UI／README

## File map

| 檔案 | 職責 |
| --- | --- |
| `docs/api.js` | `dueDate` 正規化、儲存驗證 |
| `docs/app.js` | 完整項目篩選、天數顯示、教師表單／補期限、座位卡／缺交條 |
| `docs/index.html` | 新建表單加繳交期限欄 |
| `docs/styles.css` | 多行缺交標籤、請補期限樣式 |
| `docs/專案現況.md` | 行為說明 |
| `%TEMP%\seat-check\__run.js`（本機驗證用，不 commit） | 新增 `hwdue` 情境 |

---

### Task 1: 資料層保留並驗證 `dueDate`

**Files:**
- Modify: `docs/api.js`（`normalizeHwMissingItem_`、`saveHwMissing`）
- Test: `%TEMP%\seat-check` 透過 `SeatDB`／`api('saveHwMissing')`（Task 5 一併跑；本任務先用本機快速檢查）

**Interfaces:**
- Consumes: 既有 `normalizeHwMissingItem_(raw, className)`、`saveHwMissing`
- Produces:
  - 項目欄位 `dueDate: string`（`YYYY-MM-DD` 或 `''`）
  - `saveHwMissing` 在 `dueDate` 空白或不合法時拋 `Error('請填繳交期限')`

- [ ] **Step 1: 在 `normalizeHwMissingItem_` 保留 `dueDate`**

把回傳物件改成（其餘欄位維持）：

```javascript
return {
  id: id,
  className: String(raw.className || className || '').trim(),
  title: String(raw.title || '').trim().slice(0, 60) || '缺交作業',
  seats: normalizeHwSeatList_(raw.seats),
  note: String(raw.note || '').trim().slice(0, 120),
  dueDate: normalizeHwDueDate_(raw.dueDate),
  deleted: !!raw.deleted,
  createdAt: String(raw.createdAt || nowIso()),
  updatedAt: String(raw.updatedAt || raw.createdAt || nowIso())
};
```

在同檔案、該函式上方新增：

```javascript
function normalizeHwDueDate_(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  var d = new Date(s.slice(0, 4), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  if (isNaN(d.getTime())) return '';
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  var key = y + '-' + m + '-' + day;
  return key === s ? s : '';
}
```

- [ ] **Step 2: `saveHwMissing` 拒絕空期限**

在 `item.seats.length` 檢查之後、寫入 store 之前加：

```javascript
if (!item.dueDate) throw new Error('請填繳交期限');
```

刪除（`deleteHwMissing`）路徑不必要求 `dueDate`。

- [ ] **Step 3: 本機快速檢查 normalize**

在瀏覽器主控台或臨時腳本（勿 commit）確認：

```javascript
// 期望：dueDate 為 '2026-10-10'
normalize 後項目含合法 dueDate
// 期望：'2026-13-40' → ''
// 期望：save 無 dueDate → 錯誤「請填繳交期限」
```

若一時無法開主控台，可留到 Task 5 的 `hwdue` 情境一併驗證；但此任務結束前程式必須已改完。

- [ ] **Step 4: Commit**

```bash
git add docs/api.js
git commit -m "feat: 缺交作業資料保留繳交期限並在儲存時必填"
git push origin master
```

---

### Task 2: 完整項目篩選與座位／缺交條顯示

**Files:**
- Modify: `docs/app.js`（`activeHwMissingItems` 附近、`studentCardHtml`、`labSeatCard`、`renderHwMissingBanner`）
- Modify: `docs/styles.css`（座位卡多行缺交）

**Interfaces:**
- Consumes: `workDaysLate(dueKey, submittedKey)`、`formatDateKey`、`isNonWorkday`（已存在，函式宣告會提升）
- Produces:
  - `hasHwDueDate_(item) -> boolean`
  - `completeHwMissingItems(className) -> item[]`（有期限的完整項目）
  - `hwMissingDaysLate_(item) -> number`（`workDaysLate(item.dueDate, formatDateKey(new Date()))`）
  - `hwMissingBadgeHtml(seatNo) -> string`（多行標籤 HTML）
  - `hwMissingSeatSet`／`isSeatHwMissing` 改為只看完整項目（缺期限不上座位表）

- [ ] **Step 1: 在 `activeHwMissingItems` 下方新增輔助函式**

```javascript
function hasHwDueDate_(item) {
  return !!(item && /^\d{4}-\d{2}-\d{2}$/.test(String(item.dueDate || '').trim()));
}

function completeHwMissingItems(className) {
  return activeHwMissingItems(className).filter(hasHwDueDate_);
}

function hwMissingDaysLate_(item) {
  if (!hasHwDueDate_(item)) return 0;
  return workDaysLate(item.dueDate, formatDateKey(new Date()));
}

function hwMissingLinesForSeat_(seatNo, className) {
  className = className || (App.classroom && App.classroom.className) || '';
  var seat = normalizeDisplaySeat_(seatNo);
  var lines = [];
  completeHwMissingItems(className).forEach(function (item) {
    var seats = (item.seats || []).map(normalizeDisplaySeat_);
    if (seats.indexOf(seat) < 0 && seats.indexOf(String(Number(seatNo) || '')) < 0) return;
    lines.push({
      title: item.title || '缺交',
      days: hwMissingDaysLate_(item)
    });
  });
  return lines;
}

function hwMissingBadgeHtml(seatNo) {
  var lines = hwMissingLinesForSeat_(seatNo);
  if (!lines.length) return '';
  return '<span class="seat-hw-missing-stack">' + lines.map(function (line) {
    return '<span class="seat-hw-missing">缺交 ' + escapeHtml(line.title) + ' ' +
      line.days + '天</span>';
  }).join('') + '</span>';
}
```

- [ ] **Step 2: `hwMissingSeatSet` 改用完整項目**

```javascript
function hwMissingSeatSet(className) {
  var set = {};
  completeHwMissingItems(className).forEach(function (item) {
    (item.seats || []).forEach(function (seat) {
      set[normalizeDisplaySeat_(seat)] = true;
      set[String(Number(seat) || seat)] = true;
    });
  });
  return set;
}
```

- [ ] **Step 3: 座位卡改用 `hwMissingBadgeHtml`**

`studentCardHtml` 與 `labSeatCard` 內：

```javascript
var missingCls = isSeatHwMissing(student.seatNo) ? ' hw-missing' : '';
var missingBadge = hwMissingBadgeHtml(student.seatNo);
```

不要再寫死 `'<span class="seat-hw-missing">缺交</span>'`。

- [ ] **Step 4: 更新 `renderHwMissingBanner`**

```javascript
function renderHwMissingBanner() {
  var el = document.getElementById('hwMissingBanner');
  if (!el) return;
  if (!App.classroom || App.appView === 'teacher') {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  var items = completeHwMissingItems(App.classroom.className);
  if (!items.length) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  el.innerHTML = '<strong>缺交作業</strong>' + items.map(function (item) {
    var days = hwMissingDaysLate_(item);
    return '<span class="hw-missing-line">' +
      escapeHtml(item.title || '缺交') + '（缺 ' + days + ' 天）：' +
      escapeHtml((item.seats || []).join('、')) +
      '</span>';
  }).join('');
}
```

- [ ] **Step 5: CSS 支援多行標籤**

在 `docs/styles.css` 既有 `.seat-hw-missing` 附近改為：

```css
.seat-hw-missing-stack {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  max-width: 72%;
  z-index: 2;
}

.seat-hw-missing {
  position: static;
  padding: 1px 6px;
  border-radius: 999px;
  background: #c56a00;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.35;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 6: Commit**

```bash
git add docs/app.js docs/styles.css
git commit -m "feat: 座位表缺交列出各份作業與工作天數"
git push origin master
```

---

### Task 3: 教師模式表單、補期限與提示

**Files:**
- Modify: `docs/index.html`（缺交表單）
- Modify: `docs/app.js`（`renderHwMissingTab`、`saveHwMissingFromForm`、`toggleHwMissingItemSeat`、補期限處理）
- Modify: `docs/styles.css`（請補期限提示）

**Interfaces:**
- Consumes: Task 1 的 `dueDate` 驗證；Task 2 的 `hasHwDueDate_`／`completeHwMissingItems`
- Produces:
  - `#missingDue` 日期輸入
  - 名單項目可補 `#missing-due-patch` 並儲存
  - `#missingDueWarn` 顯示缺期限筆數

- [ ] **Step 1: HTML 表單加期限與警告區**

在 `docs/index.html` 的 `#tabMissing` 表單（`missingTitle` 旁）加入：

```html
<label>繳交期限
  <input id="missingDue" type="date" required />
</label>
```

在「本班缺交名單」標題上方加：

```html
<p id="missingDueWarn" class="missing-due-warn" hidden></p>
```

- [ ] **Step 2: `saveHwMissingFromForm` 帶上期限**

```javascript
var dueEl = document.getElementById('missingDue');
var dueDate = dueEl ? String(dueEl.value || '').trim() : '';
if (!dueDate) {
  toast('請填繳交期限');
  return;
}
api('saveHwMissing', [{
  className: className,
  title: titleEl ? titleEl.value : '',
  note: noteEl ? noteEl.value : '',
  dueDate: dueDate,
  seats: seats
}]).then(function (data) {
  // ...既有成功處理...
  if (dueEl) dueEl.value = '';
});
```

- [ ] **Step 3: `toggleHwMissingItemSeat` 帶上既有 `dueDate`**

```javascript
api('saveHwMissing', [{
  id: item.id,
  className: className,
  title: item.title || '',
  note: item.note || '',
  dueDate: item.dueDate || '',
  seats: next,
  createdAt: item.createdAt || ''
}])
```

若該筆尚無 `dueDate`，在呼叫前：

```javascript
if (!hasHwDueDate_(item)) {
  toast('請先補這筆的繳交期限');
  return;
}
```

（避免 API 丟「請填繳交期限」卻看不出是哪一筆。）

- [ ] **Step 4: 重寫 `renderHwMissingTab` 名單列**

每一項 head 改為含期限／補期限 UI，概念如下：

```javascript
var dueOk = hasHwDueDate_(item);
var dueHtml = dueOk
  ? ('<span class="missing-due">期限 ' + escapeHtml(item.dueDate) +
     '（已缺 ' + hwMissingDaysLate_(item) + ' 工作天）</span>')
  : ('<span class="missing-due missing-due-need">請補期限</span>' +
     '<label class="missing-due-patch">補繳交期限' +
     '<input type="date" data-missing-due-id="' + escapeHtml(item.id) +
     '" data-missing-due-class="' + escapeHtml(className) + '" />' +
     '<button type="button" class="tool" data-missing-due-save="' + escapeHtml(item.id) +
     '" data-missing-due-class="' + escapeHtml(className) + '">儲存期限</button></label>');
```

座位點選區：無期限時仍可顯示座號，但依 Step 3 點了會 toast 要求先補期限（或你可改成 disabled + title「請先補期限」——擇一，建議 disabled 較不易誤觸）：

```javascript
var disabled = dueOk ? '' : ' disabled';
// button 加上 disabled 與 title="請先補繳交期限"
```

分頁頂部警告：

```javascript
var incomplete = activeHwMissingItems(className).filter(function (item) {
  return !hasHwDueDate_(item);
}).length;
var warn = document.getElementById('missingDueWarn');
if (warn) {
  if (incomplete > 0) {
    warn.hidden = false;
    warn.textContent = '有 ' + incomplete + ' 筆缺交還沒填繳交期限，補齊前不會出現在座位表。';
  } else {
    warn.hidden = true;
    warn.textContent = '';
  }
}
```

- [ ] **Step 5: 綁定「儲存期限」點擊**

在既有 `missingList` 事件委派處（或新增 listener）處理 `data-missing-due-save`：

```javascript
function saveHwMissingDuePatch(className, itemId) {
  var item = findHwMissingItem_(className, itemId);
  if (!item) {
    toast('找不到這筆缺交名單');
    return;
  }
  var input = document.querySelector(
    'input[data-missing-due-id="' + itemId + '"][data-missing-due-class="' + className + '"]'
  );
  var dueDate = input ? String(input.value || '').trim() : '';
  if (!dueDate) {
    toast('請填繳交期限');
    return;
  }
  api('saveHwMissing', [{
    id: item.id,
    className: className,
    title: item.title || '',
    note: item.note || '',
    dueDate: dueDate,
    seats: item.seats || [],
    createdAt: item.createdAt || ''
  }]).then(function (data) {
    if (data && data.hwMissing) {
      App.hwMissing = mergeHwMissingClient_(App.hwMissing, data.hwMissing);
    }
    renderHwMissingTab();
    renderHwMissingBanner();
    if (App.classroom && App.classroom.className === className) renderBoard();
    toast('已補上繳交期限');
  }).catch(function (err) {
    toast(err && err.message ? err.message : '儲存失敗');
  });
}
```

- [ ] **Step 6: 警告樣式**

```css
.missing-due-warn {
  margin: 0 0 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fff3cd;
  color: #7a4d00;
  font-weight: 700;
}

.missing-due-need {
  color: #b42318;
  font-weight: 800;
}

.missing-due-patch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 6px 0;
}
```

- [ ] **Step 7: Commit**

```bash
git add docs/index.html docs/app.js docs/styles.css
git commit -m "feat: 缺交作業必填繳交期限，舊資料可補填後才上座位表"
git push origin master
```

---

### Task 4: 文件與端對端驗證

**Files:**
- Modify: `docs/專案現況.md`（缺交作業說明）
- Test: `%TEMP%\seat-check\__run.js` 新增 `hwdue`（不 commit 到 repo，除非已有 harness 在 repo）

**Interfaces:**
- Consumes: Tasks 1–3 全部行為
- Produces: 更新後的專案現況；驗證輸出 JSON

- [ ] **Step 1: 更新 `docs/專案現況.md`**

把缺交作業那句改成類似：

```markdown
- **缺交作業**：教師模式登錄各班缺交名單（必填繳交期限）；已建立項目可點座號增減；上課模式只顯示「有期限」的項目，座位卡與缺交條列出各份名稱與已缺工作天數（期限當天＝0；週末／國定假日／成績額外假日不算）。無期限的舊資料在教師分頁提示補填，補齊前不上座位表。
```

並在資料結構處補：`store.hwMissing{班:[]}  缺交作業（名稱＋座號＋dueDate；上課只顯示有期限者）`

- [ ] **Step 2: 在 `%TEMP%\seat-check\__run.js` 加 `hwdue` 情境**

在 `stats` 分支後加入（日期請依執行當天調整「今天」與預期天數；下列假設執行日為工作日，且 `duePast` 為上一個工作日）：

```javascript
if (scenario === 'hwdue') {
  var today = new Date();
  function ymd(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  var dueToday = ymd(today);
  var duePast = new Date(today.getTime());
  duePast.setDate(duePast.getDate() - 1);
  while (duePast.getDay() === 0 || duePast.getDay() === 6) {
    duePast.setDate(duePast.getDate() - 1);
  }
  var duePastKey = ymd(duePast);
  App.hwMissing = {
    '801': [
      { id: 'H1', title: '講義A', seats: ['01'], dueDate: dueToday, deleted: false },
      { id: 'H2', title: '習題B', seats: ['01'], dueDate: duePastKey, deleted: false },
      { id: 'H3', title: '舊資料', seats: ['02'], dueDate: '', deleted: false }
    ]
  };
  if (typeof renderBoard === 'function') renderBoard();
  if (typeof renderHwMissingBanner === 'function') renderHwMissingBanner();
  return wait(200).then(function () {
    var card01 = document.querySelector('.seat-card[data-seat="01"]');
    var card02 = document.querySelector('.seat-card[data-seat="02"]');
    r.card01 = card01 ? card01.textContent.replace(/\s+/g, ' ') : '';
    r.card02 = card02 ? card02.textContent.replace(/\s+/g, ' ') : '';
    r.banner = (document.getElementById('hwMissingBanner') || {}).innerText || '';
    r.card01HasA = r.card01.indexOf('講義A') >= 0 && r.card01.indexOf('0天') >= 0;
    r.card01HasB = r.card01.indexOf('習題B') >= 0 && r.card01.indexOf('1天') >= 0;
    r.card02NoOld = r.card02.indexOf('舊資料') < 0 && r.card02.indexOf('缺交') < 0;
    r.ok = !!(r.card01HasA && r.card01HasB && r.card02NoOld && r.seatCards > 0);
  });
}
```

注意：若 `renderBoard`／`App` 不在全域，改為透過頁面已暴露的 API，或在 `__run.js` 裡觸發等同重繪的 UI 路徑。實作時以實際可呼叫的符號為準；目標斷言不變。

另加一個 API 負向檢查（可同情境或另跑）：

```javascript
return api('saveHwMissing', [{
  className: '801', title: '無期限', seats: ['03'], dueDate: ''
}]).then(function () {
  r.saveEmptyDueRejected = false;
}).catch(function (err) {
  r.saveEmptyDueRejected = String(err.message || err).indexOf('繳交期限') >= 0;
});
```

- [ ] **Step 3: 執行驗證**

```powershell
powershell -File "$env:TEMP\seat-check\run.ps1" -Scenario hwdue -Src "C:\Users\chunhsinkuo\google\google試算表\docs"
```

Expected JSON 重點：

- `seatCards` > 0
- `card01HasA` = true
- `card01HasB` = true
- `card02NoOld` = true
- `ok` = true
- `errors` 為空陣列
- （若有跑）`saveEmptyDueRejected` = true

- [ ] **Step 4: 手動抽查（若無頭測通過可略，但跨週末假日建議手測一次）**

1. 教師帳號打開缺交分頁：沒填期限不能存  
2. 同一人兩份缺交：座位卡兩行  
3. 舊資料無期限：教師分頁「請補期限」；補前座位表沒有  

- [ ] **Step 5: Commit 文件**

```bash
git add docs/專案現況.md
git commit -m "docs: 說明缺交作業繳交期限與工作天顯示"
git push origin master
```

---

## Spec coverage checklist

| Spec 要求 | Task |
| --- | --- |
| `dueDate` 欄位、normalize 保留 | Task 1 |
| 儲存必填期限 | Task 1、3 |
| `workDaysLate`、當天＝0 | Task 2 |
| 完整項目才上座位表／缺交條 | Task 2 |
| 座位卡逐份列出名稱＋天數 | Task 2 |
| 缺交條「名稱（缺 N 天）：座號」 | Task 2 |
| 教師表單期限、警告、補填 | Task 3 |
| 點座號沿用期限／無期限先擋 | Task 3 |
| 專案現況更新 | Task 4 |
| 不改 Code.gs | 全計畫遵守 |
| 驗證座位卡存在 | Task 4 |

## Self-review notes

- 無 TBD／placeholder
- `completeHwMissingItems`／`hasHwDueDate_`／`hwMissingBadgeHtml` 命名在 Task 2–3 一致
- `toggle` 無期限時前端先擋，避免與 API 錯誤訊息打架
