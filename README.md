# 班級座位表

打開網頁就能用。資料存在這個瀏覽器，會自動存檔。

- 上傳班級、座號、姓名（CSV 或 Excel）
- 拖放調座位
- 抽籤
- 加分／扣分（可復原）
- 下載備份／還原備份（換電腦時用）

## 現在就可以用

用瀏覽器打開：

`docs/index.html`

第一次會看到「範例班」。接著按 **上傳名單** 或 **設定**，把你的學生匯入即可。

CSV 欄位：

```
班級,座號,姓名
301,01,陳安安
301,02,林冠宇
```

範本：`docs/學生名單範本.csv`（可用 Excel 打開改完再上傳）

## 放到 GitHub 當網頁

1. 打開 <https://github.com/new>
2. 名稱填 `class-seating-chart`，選 Public，不要勾 README
3. 在這個資料夾執行：

```powershell
git add .
git commit -m "feat: 班級座位表（本機資料庫，打開即用）"
git remote add origin https://github.com/你的帳號/class-seating-chart.git
git push -u origin master
```

4. GitHub：**Settings → Pages** → Deploy from a branch → `master` / `/docs`
5. 網址：`https://你的帳號.github.io/class-seating-chart/`

## 資料怎麼改

| 想做的事 | 怎麼做 |
| --- | --- |
| 匯入名單 | 上傳 CSV／Excel，或在設定裡貼上 |
| 改座位 | 按住學生卡片拖放 |
| 改分數 | 加分／扣分後點學生 |
| 用 Excel 改名單 | 設定 → 下載本班 CSV → 改完再上傳 |
| 換電腦／換平板 | 下載備份 → 到新裝置按還原備份 |

同一個瀏覽器關掉再開都還在。清掉網站資料就會不見，所以重要時請按一次「下載備份」。
