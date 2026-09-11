# 把座位表放到 Vercel（學校網路擋 GitHub Pages 時）

正式畫面在 `docs/`。GitHub 仍是程式倉庫；**學校打開的網址改用 Vercel**。

## 1. 在 Vercel 匯入專案（約 3 分鐘）

1. 用教師 Google／GitHub 帳號打開 [vercel.com](https://vercel.com) 並登入
2. **Add New… → Project** → 選 `fish0048-ai/class-seating-chart`（若看不到，先按 Authorize GitHub）
3. 設定（二選一，推薦 A）：
   - **A（推薦）**：**Root Directory** 設成 `docs`；Framework 選 Other；Build 留空  
   - **B**：Root Directory 留空（用倉庫根目錄 `vercel.json` 轉到 `docs/`）
4. 按 **Deploy**
5. 部署完成後複製網址，例如：  
   `https://class-seating-chart-xxxx.vercel.app`

之後每次把程式 `push` 到 GitHub `master`，Vercel 會自動更新。

## 2. 必做：Google 登入來源

否則在 Vercel 網址會無法 Google 登入。

1. 打開 [Google Cloud 憑證](https://console.cloud.google.com/apis/credentials)
2. 編輯現有的「網頁應用程式」OAuth 用戶端  
   （用戶端 ID 與 `docs/config.js` 的 `googleClientId` 相同）
3. **授權的 JavaScript 來源**加上你的 Vercel 網址（完整，含 `https://`）：
   - `https://你的專案.vercel.app`
   - 若有 Production 固定網域也要加（Google **不支援** `*.vercel.app` 萬用字元）
4. 儲存（有時要等幾分鐘才生效）

可同時保留 `https://fish0048-ai.github.io`，不影響。

## 3. 老師怎麼用

- 學校／平板請開 **Vercel 網址**
- 雲端資料庫仍是同一份 Google 試算表與 Apps Script `/exec`，不必重設
- 用教師帳號 `chunhsinkuo@kcis.hc.edu.tw` 登入

## 4. 自訂網域（可選）

Vercel → Project → Settings → Domains。加上後記得把該網域也加進 Google OAuth「授權的 JavaScript 來源」。

## 5. 若打開是空白或 404

- 確認部署的是 `master` 最新 commit
- 確認倉庫有 `docs/index.html` 與根目錄 `vercel.json`
- Framework 請選 **Other**；Output Directory 為 `docs`
