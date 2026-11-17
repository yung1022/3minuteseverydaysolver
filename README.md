# 每日三分鐘寫作靈感

一個以 AI 為中學生安排每日中文寫作素材的輕量網頁。選擇日期範圍後，AI 會依星期一至星期五的主題，生成文言積累、人物描寫、景物描寫、議論文素材或素材轉化練習；週末不安排內容。

## 啟動

需要 Node.js 18 或更新版本。

```sh
OPENROUTER_API_KEY=your-api-key node server.js
```

開啟 <http://localhost:3000>。預設使用 OpenRouter 的免費模型 `inclusionai/ling-3.2-flash:free`。可選擇設定 `PORT`、`OPENROUTER_MODEL` 或 `OPENROUTER_BASE_URL`（預設 OpenRouter Chat Completions API URL）。API 金鑰只在伺服器使用，不會傳送到瀏覽器。日期範圍最多 31 天。

未設定 `OPENROUTER_API_KEY` 時，網站仍可瀏覽範例；提交生成時會顯示設定提示。
