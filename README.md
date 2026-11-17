# 每日三分鐘寫作靈感

一個以 AI 為中學生安排每日中文寫作素材的輕量網頁。選擇日期範圍後，AI 會依星期一至星期五的主題，生成文言積累、人物描寫、景物描寫、議論文素材或素材轉化練習；週末不安排內容。

## 部署到 GitHub Pages

1. 將此儲存庫推送至 GitHub 的 `main` 分支。
2. 在儲存庫的 **Settings → Pages** 將建置來源設為 **GitHub Actions**。
3. Actions 部署完成後，開啟 Pages 網址即可使用。

生成素材時，請輸入自己的 [OpenRouter API 金鑰](https://openrouter.ai/settings/keys)。應用程式使用免費模型 `inclusionai/ling-3.2-flash:free`；API 金鑰只保留在目前頁面的記憶體中，直接傳送至 OpenRouter，不會儲存在瀏覽器或本儲存庫。重新載入頁面後需重新輸入。日期範圍最多 31 天。
