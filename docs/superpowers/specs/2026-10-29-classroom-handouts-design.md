# 從 Google Classroom 成績表匯入學習講義

日期：2026-10-29  
狀態：已實作

## 目標

讀取各班 Google Classroom 匯出的成績表（Google 試算表），只挑出理化的「學習講義」作業，寫進網站成績簿的「作業」欄。

## 決策

| 項目 | 決定 |
| --- | --- |
| 成績類別 | 作業（`homeworks`，已繳／未繳＋分數） |
| 空白格 | 一律記「未繳交」（0 分）；整欄空白時確認視窗特別警告 |
| 「已繳交」文字 | 記已繳交、沒有分數 |
| 別科講義 | 欄名含公民、地理、歷史、國文、英文、數學、本土語等科名就排除 |
| 網址 | 「設定與上傳」存各班網址，存在雲端 `store.classroomSources`，各裝置共用 |
| 讀取 | 後端 Apps Script `readClassroomHandouts`（教師 token），只讀，絕不寫入該試算表 |

## Classroom 成績表格式（以 115-801 匯出檔為準）

- 第 1 列期限（如「9月17日」）、第 2 列作業名稱、第 3 列滿分
- 學生列有一欄「801-01」班級座號，另有姓名、email、平均
- 後端解析後只回傳講義名稱、期限、滿分、以「801-01」為鍵的分數；不回傳姓名與 email

## 流程

1. 學期成績按「從 Classroom 更新學習講義」
2. 逐班讀取有設定網址的成績表；表內班級代碼與設定班級不符就略過並說明
3. 先試算（`dryRun`）：每班新增／更新幾欄、已繳／未繳筆數、整欄空白、名單沒有的座號
4. 老師確認後寫入：同名作業欄更新（保留原欄 id），沒有就新增；期限用 Classroom 的期限；以 Classroom 為準覆蓋這些座號的紀錄

## 實作位置

| 檔案 | 內容 |
| --- | --- |
| `Code.gs` | `readClassroomHandoutsApi_`、`parseClassroomHandouts_`、`classroomDueDate_`、`mergeCloudClassroomSources_` |
| `docs/cloud.js` | `CloudStore.readClassroomHandouts`（後端未更新時提示貼上 Code.gs） |
| `docs/api.js` | `classroomSources` 正規化與合併、`getClassroomSources`／`saveClassroomSources`／`readClassroomHandouts`／`importClassroomHandouts` |
| `docs/app.js`、`index.html`、`styles.css` | 設定頁網址欄、學期成績按鈕與確認視窗 |

## 不做

- 不寫回 Classroom 或該試算表
- 不匯入學習講義以外的作業
