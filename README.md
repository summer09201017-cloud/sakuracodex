# 櫻花鼠尾

這是一個可在手機與電腦上互動的櫻花尾巴 PWA。

## 直接遊玩

1. 用瀏覽器開啟 `index.html`。
2. 在畫布上移動滑鼠或用手指拖曳，即可看到櫻花落雪長尾巴。
3. 右側控制面板可切換配色、尾巴模式、花瓣樣式、密度、長度與風感。

## 安裝到手機

PWA 安裝需要在 `https://` 網址下使用，或在本機 `localhost` 測試。

- Android / Chrome：開啟網站後按頁面內的安裝按鈕即可。
- iPhone / iPad：請使用 Safari，點分享後選「加入主畫面」。

## 檔案

- `index.html`：頁面結構
- `styles.css`：介面與排版風格
- `app.js`：櫻花尾巴互動與設定切換
- `manifest.webmanifest`：PWA 安裝資訊
- `sw.js`：離線快取
- `netlify.toml`：Netlify 發布與快取標頭設定
- `scripts/deploy-github.ps1`：用 GitHub API 將專案內容推到倉庫
- `scripts/deploy-netlify.ps1`：用 Netlify CLI 直接部署到正式站
