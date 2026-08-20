# 班級座位表

畫面放在 **GitHub Pages**，資料庫是你本來就在用的 **Google 試算表**。  
學生、座號、分數、座位都可以直接打開試算表查看和修改。

```
平板 / 電腦  →  GitHub 網頁（座位表畫面）
                 ↓
              Apps Script API（只要 Code.gs）
                 ↓
              Google 試算表（你看得到、改得到的資料庫）
```

## 1. 先準備試算表資料庫

1. 開一份 Google 試算表（建議專給座位表用）。
2. **擴充功能 → Apps Script**，把本專案的 `Code.gs` 整份貼上並儲存。
3. 回到試算表重新整理，選 **座位表 → 初始化／修復工作表**。
4. 在 `學生` 工作表填：

| 班級 | 座號 | 姓名 | 分數 | 列 | 欄 |
| --- | --- | --- | --- | --- | --- |
| 301 | 01 | 陳安安 | 0 |  |  |

5. Apps Script：**部署 → 新增部署作業 → 網頁應用程式**
   - 執行身分：我
   - 誰可以存取：任何人
   - 複製網址（結尾是 `/exec`）

這個網址是資料庫 API，不是給學生看的座位表畫面。

## 2. 把畫面放到 GitHub

1. 到 [GitHub New repository](https://github.com/new) 新增一個儲存庫（例如 `class-seating-chart`）。
2. 把本專案推上去：

```powershell
git add .
git commit -m "feat: 以 GitHub Pages 顯示座位表並用試算表當資料庫"
git branch -M main
git remote add origin https://github.com/你的帳號/class-seating-chart.git
git push -u origin main
```

3. 編輯 GitHub 上的 `docs/config.js`：

```javascript
window.SEAT_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/你的部署ID/exec',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/你的試算表ID/edit'
};
```

4. GitHub 儲存庫：**Settings → Pages**
   - Source：Deploy from a branch
   - Branch：`main` / 資料夾 `/docs`
5. 等一兩分鐘，用這個網址開座位表（給平板用）：

`https://你的帳號.github.io/class-seating-chart/`

## 3. 之後怎麼改資料

- 按網頁上的 **開啟資料庫**：直接進 Google 試算表。
- 在試算表改姓名、加學生、改分數都可以。
- 改完回到座位表按 **同步**（網頁也會約每 20 秒自動同步）。
- 在平板拖放座位、加扣分、存檔，也會寫回同一份試算表。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `Code.gs` | 試算表 API（貼到 Apps Script） |
| `docs/index.html` | GitHub Pages 座位表畫面 |
| `docs/config.js` | 填 API 網址與試算表網址 |
| `座位表.html` | 不上網、不連試算表的本機版 |
