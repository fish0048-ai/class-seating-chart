# 把座位表放到 Vercel（學校網路擋 GitHub Pages 時）

正式畫面在 `docs/`。GitHub 仍是程式倉庫；**學校打開的網址改用 Vercel**。

## 正式接法：接 GitHub 後自動更新（請用這個）

`temporary-….vercel.app` 那種「認領臨時站」**不會**跟著 GitHub 更新。要自動更新請重新 Import 一次：

1. 用教師帳號打開 [vercel.com/new](https://vercel.com/new) 並登入（可用 GitHub 登入）
2. 若還沒授權，按 **Authorize GitHub**／Import 倉庫
3. 選 **`fish0048-ai/class-seating-chart`**
4. 按下 **Root Directory** 的 Edit，設成 **`docs`**（很重要）
5. **Framework Preset**：Other  
   **Build Command / Output Directory**：留空
6. 按 **Deploy**
7. 完成後會得到固定網址，例如：  
   `https://class-seating-chart.vercel.app`  
   或 `https://class-seating-chart-xxxxx.vercel.app`

之後只要把程式 `push` 到 GitHub 的 **`master`**，Vercel 就會自動重新部署。學校請改開這個**正式網址**，不要再開 `temporary-…`。

### 檢查是否真的會自動更新

Vercel → 你的專案 → **Settings → Git**  
應看得到連到 `fish0048-ai/class-seating-chart`，Production Branch 是 `master`。

Vercel → **Deployments**：每次 push 後應出現新的 Deployment。

## Google 登入來源（必做）

1. 打開 [Google Cloud 憑證](https://console.cloud.google.com/apis/credentials)
2. 編輯 OAuth「網頁應用程式」用戶端  
   （用戶端 ID 須與 `docs/config.js` 的 `googleClientId` 相同）
3. **授權的 JavaScript 來源**加上正式 Vercel 網址（不要結尾 `/`）：  
   `https://你的專案.vercel.app`  
   必須加在 **與 `docs/config.js` 同一組**的 OAuth 用戶端上（目前是 `346582257660-…` 開頭那一筆）。加錯舊用戶端會出現 `origin_mismatch`。
4. 儲存後用正式網址登入測試

另外：`Code.gs` 裡的 `GOOGLE_CLIENT_ID` 必須與前端相同。改過後請貼上 Apps Script 並**更新同一支部署**，否則登入後端會判定憑證不符。

可同時保留舊的 GitHub Pages、臨時網址來源，不影響。

## 老師怎麼用

- 學校／平板請開 **正式 Vercel 網址**
- 資料仍是同一份試算表與 Apps Script，不必重設
- 教師帳號：`chunhsinkuo@kcis.hc.edu.tw`

## 自訂網域（可選）

Vercel → Project → Settings → Domains。加上後也要把該網域加進 Google OAuth 來源。

## 若打開是 404 或舊畫面

- Root Directory 是否為 `docs`
- Deployments 是否部署最新 `master` commit
- 瀏覽器強制重新整理（Ctrl+F5）
- 確認開的不是舊的 `temporary-….vercel.app`
