# AI／Classroom 職責拆分 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 檢查只寫 Classroom 草稿；網站缺交／分數只靠「從 Classroom 更新學習講義」。

**Architecture:** 刪除 AI→網站寫入路徑（`applyAiCheckScores`、`syncAiMissingAfterCheck_`、`fromAiCheck`）；UI 以「寫成 Classroom 草稿」為主按鈕；文件與成對規則改回只描述 Classroom 更新。缺交顯示靠老師手動或早上自動「更新學習講義」。

**Tech Stack:** vanilla JS（`docs/`）、Apps Script `Code.gs`（本計畫原則上不改後端邏輯）、Playwright e2e、GitHub PR。

## Global Constraints

- 正式碼只在 `docs/` 與根目錄 `Code.gs`；不要改 `legacy/`
- 不要在 `renderLabBoard`／重繪時 `persistLab`
- 課表試算表只讀；成績庫才寫
- 改 `Code.gs` 才提醒部署；本計畫若只動前端則合併後 Vercel 即可
- Commit 繁中 `<type>: <主旨>`；經 PR 合併 master
- 對照 spec：`docs/superpowers/specs/2026-11-20-ai-classroom-handout-roles-design.md`

## File map

| 檔案 | 責任 |
| --- | --- |
| `docs/index.html` | 拿掉寫網站按鈕；選單小字 |
| `docs/app.js` | 移除寫網站路徑；Classroom 寫入提示；render 只控 Classroom 按鈕 |
| `docs/api.js` | 移除 `fromAiCheck` |
| `docs/專案現況.md` | 職責與成對規則文案 |
| `.github/scripts/check-front-back-sync.ps1` | 成對檢查能辨識 `name: function`（修 PR #71 留下的誤報） |

---

### Task 1: 拿掉 AI 寫網站 UI 與路徑

**Files:**
- Modify: `docs/index.html`（匯入選單小字、`btnAiCheckApply`）
- Modify: `docs/app.js`（listener、`renderAiCheck`、`writeAiScoresToClassroom`、刪除 apply／sync／helper）
- Modify: `docs/api.js`（`fromAiCheck`）

**Interfaces:**
- Produces: AI 視窗只剩 `btnAiCheckClassroom` 作為寫分主按鈕；`importClassroomHandouts` 不再接受 `fromAiCheck`

- [ ] **Step 1: 改 `docs/index.html` 選單與按鈕**

`btnClassroomHandouts` 的 `<small>` 改為：`同步繳交／缺交到網站（成績也一併更新）`  
`btnAiCheck` 的 `<small>` 改為：`檢查未評分的繳交，分數寫進 Classroom 草稿`  
刪除整行：`<button ... id="btnAiCheckApply" ...>把分數寫進網站</button>`

- [ ] **Step 2: 改 `docs/app.js` 綁定與 render**

刪除 `btnAiCheckApply` 的 `getElementById`／`addEventListener`（約 809–810 行）。  
`renderAiCheck`：刪除對 `btnAiCheckApply` 的處理；只保留 `btnAiCheckClassroom.hidden = !sum.passes.length`。  
空白結果分支也不再碰 apply。

- [ ] **Step 3: 強化 `writeAiScoresToClassroom` 成功提示**

成功 toast／status 末尾加上：`網站要看到分數或缺交，請再按「從 Classroom 更新學習講義」（或等早上自動）。`  
舊作業無法寫入時既有錯誤訊息保留；確認對話框可改為強調「不會寫進網站」。

- [ ] **Step 4: 刪除寫網站函式與呼叫**

刪除：`aiCheckScoresForWebsite_`、`applyAiCheckScores`、`syncAiMissingAfterCheck_`、`aiWebsiteHwRec_`（若僅被上述使用）。  
`startAiCheck` 的 `.then` 改回只 `renderAiCheck`＋原本 `reused` toast，**不要**再呼叫 `syncAiMissingAfterCheck_`：

```javascript
api('startHandoutCheck', [Object.assign({ recheck: !!recheck }, t)]).then(function (data) {
  App.aiCheck = { className: t.className, title: t.title, data: data };
  renderAiCheck(data);
  if (!recheck && data && data.reused != null) {
    toast('沿用之前結果 ' + data.reused + ' 位，新送 AI 檢查 ' + (data.newChecks || 0) + ' 位', 6000);
  }
}).catch(...).then(function () { setAiCheckButtons(false); });
```

- [ ] **Step 5: 移除 `docs/api.js` 的 `fromAiCheck`**

刪除註解與 `var fromAiCheck = !!body.fromAiCheck`；整欄空白判斷改回只靠 `!hasAny` 就 `blankColumns` 並 return（與自動更新行為一致）。註解改為只寫與 `Code.gs` `applyHandoutColumns_` 成對、供 Classroom 更新使用。

- [ ] **Step 6: 括號與搜尋確認**

PowerShell 確認 `docs/app.js`、`docs/api.js` `{`／`}` 數量相等。  
全專案搜尋不得再有：`btnAiCheckApply`、`applyAiCheckScores`、`fromAiCheck`、`syncAiMissingAfterCheck_`、`aiCheckScoresForWebsite_`。

- [ ] **Step 7: Commit（功能分支，稍後一次 PR）**

```bash
git checkout -b fix/ai-classroom-roles origin/master
git add docs/index.html docs/app.js docs/api.js
git commit -m "fix: AI 檢查改只寫 Classroom，網站分數改靠更新學習講義"
```

---

### Task 2: 文件與成對檢查

**Files:**
- Modify: `docs/專案現況.md`
- Modify: `.github/scripts/check-front-back-sync.ps1`
- Modify: `docs/superpowers/specs/2026-11-20-ai-classroom-handout-roles-design.md`（狀態改「已實作」）

- [ ] **Step 1: 更新 `專案現況.md` AI／Classroom 段落**

- AI 檢查：刪除「把通過的分數寫進網站」與「與 Classroom 更新共用 import…」；改為分數寫 Classroom 草稿後靠更新同步；紙本／自動 AI 若寫「寫進網站」改成對齊新流程  
- 成對規則列改為：`學習講義寫進作業欄（分數／已繳／未繳）`｜`api.js` `importClassroomHandouts`｜`Code.gs` `applyHandoutColumns_`｜不一致會怎樣：缺交或分數與 Classroom 不符

- [ ] **Step 2: 修 `Test-FunctionDefined` 辨識物件方法**

在 `check-front-back-sync.ps1`：

```powershell
function Test-FunctionDefined {
  param([string]$Text, [string]$Name)
  if (-not $Text) { return $false }
  if ([regex]::IsMatch($Text, '(?m)^\s*function\s+' + [regex]::Escape($Name) + '\s*\(')) { return $true }
  # api.js 的 Store API 用 name: function (...) 寫法
  return [regex]::IsMatch($Text, '(?m)^\s*' + [regex]::Escape($Name) + '\s*:\s*function\s*\(')
}
```

本機跑：`powershell -File .github/scripts/check-front-back-sync.ps1`  
Expected：通過（含成對函式表）。

- [ ] **Step 3: spec 狀態改「已實作」並 commit**

```bash
git add docs/專案現況.md .github/scripts/check-front-back-sync.ps1 docs/superpowers/specs/2026-11-20-ai-classroom-handout-roles-design.md
git commit -m "docs: 對齊 AI／Classroom 職責拆分與成對檢查"
```

---

### Task 3: 驗證與合併

- [ ] **Step 1: 本機快速檢查**

- `docs/app.js`／`api.js` 括號成對  
- `check-front-back-sync.ps1` 通過  
- 若有 Playwright：`npx playwright test` 或依 repo 既有 e2e 指令（無 AI 專測則靠雲端「座位表雲端測試」）

- [ ] **Step 2: PR、等雲端測試、合併**

依 `github-sync`：push 分支、`gh pr create`、等「座位表雲端測試」通過後 `gh pr merge --merge --delete-branch`，再 `git checkout master && git pull --ff-only`。

- [ ] **Step 3: 回報老師**

- 前端會跟 Vercel 更新  
- **不必**重部 Code.gs（若本 PR 未改後端邏輯）  
- 使用方式：AI 寫 Classroom → 再按「更新學習講義」才會在網站看到分數／缺交

---

## Spec coverage (self-review)

| Spec 要求 | Task |
| --- | --- |
| 移除寫進網站 | Task 1 |
| Classroom 為網站唯一寫入 | Task 1–2 |
| 選單小字／主按鈕／成功提示 | Task 1 |
| 舊作業手動清單 | 既有 `aiEntryListHtml` 保留 |
| 文件／成對規則 | Task 2 |
| 缺交判斷後端沿用 | 不改 Code.gs 邏輯 |
| 雲端測試 | Task 3 |
