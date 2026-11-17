const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MAX_BODY_BYTES = 16 * 1024;
const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const CATEGORIES = {
  1: "文言積累",
  2: "人物描寫",
  3: "景物描寫",
  4: "議論文素材",
  5: "素材轉化",
};

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Please send valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function getWeekdayPlan(startDate, endDate) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(startDate) || !datePattern.test(endDate)) return null;

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start.toISOString().slice(0, 10) !== startDate ||
    end.toISOString().slice(0, 10) !== endDate ||
    end < start
  ) {
    return null;
  }

  const days = (end - start) / 86_400_000;
  if (days > 30) return null;

  const plan = [];
  for (let offset = 0; offset <= days; offset += 1) {
    const date = new Date(start.getTime() + offset * 86_400_000);
    const weekday = date.getUTCDay();
    if (CATEGORIES[weekday]) {
      plan.push({
        date: date.toISOString().slice(0, 10),
        weekday: WEEKDAYS[weekday],
        category: CATEGORIES[weekday],
      });
    }
  }
  return plan;
}

async function generatePlan(request, response) {
  let input;
  try {
    input = await readJson(request);
  } catch (error) {
    return sendJson(response, 400, { error: error.message });
  }

  const apiKey = typeof input?.apiKey === "string" ? input.apiKey.trim() : "";
  if (!apiKey) {
    return sendJson(response, 400, { error: "請輸入 OpenRouter API 金鑰。" });
  }

  const plan = getWeekdayPlan(input?.startDate, input?.endDate);
  if (!plan) {
    return sendJson(response, 400, {
      error: "請選擇有效日期，結束日期不得早於開始日期，且日期範圍不能超過 31 天。",
    });
  }
  if (plan.length === 0) {
    return sendJson(response, 400, { error: "所選日期範圍沒有星期一至星期五，請重新選擇。" });
  }

  const schedule = plan
    .map(({ date, weekday, category }) => `${date}（${weekday}）：${category}`)
    .join("\n");
  let upstream;
  try {
    upstream = await fetch(process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "inclusionai/ling-3.2-flash:free",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是繁體中文寫作老師，為中學生製作每日三分鐘的寫作素材。只輸出 JSON 物件，格式為 {\"items\":[{\"date\":\"YYYY-MM-DD\",\"weekday\":\"星期一\",\"category\":\"文言積累\",\"content\":\"...\"}]}。日期、星期和類別必須與提供的清單完全一致。內容精簡、原創、適合學生；引用名言時避免無法核實的作者歸屬。",
          },
          {
            role: "user",
            content: [
              "請為以下每個上課日各撰寫一則可直接使用的寫作練習。",
              "清單每行格式為「日期（星期X）：類別」，例如「2026-09-07（星期一）：文言積累」。輸出的 weekday 欄位必須包含清單中的星期，例如「星期一」，並且日期、星期和類別必須完全一致。",
              "依類別選擇相應格式：文言積累提供實詞、意思及例句；人物描寫和景物描寫提供佳句及手法；議論文素材提供名言或事例及適用主題；素材轉化寫至少 50 個中文字的短文。",
              "只包含清單中日期，不需生成週末內容。",
              "",
              schedule,
            ].join("\n"),
          },
        ],
      }),
    });
  } catch {
    return sendJson(response, 502, { error: "無法連接 AI 服務，請稍後再試。" });
  }

  if (!upstream.ok) {
    const status = upstream.status === 429 ? 429 : 502;
    return sendJson(response, status, {
      error: upstream.status === 429 ? "AI 服務目前繁忙，請稍後再試。" : "AI 生成失敗，請檢查伺服器設定後再試。",
    });
  }

  let result;
  try {
    result = await upstream.json();
    const content = result.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.items) || parsed.items.length !== plan.length) {
      throw new Error("AI response did not match the requested schedule.");
    }
    const expectedDates = new Set(plan.map((item) => item.date));
    const items = parsed.items.map((item) => {
      if (
        !expectedDates.has(item.date) ||
        typeof item.weekday !== "string" ||
        typeof item.category !== "string" ||
        typeof item.content !== "string"
      ) {
        throw new Error("AI response contained invalid schedule data.");
      }
      return {
        date: item.date,
        weekday: item.weekday,
        category: item.category,
        content: item.content,
      };
    });
    return sendJson(response, 200, { items });
  } catch {
    return sendJson(response, 502, { error: "AI 回傳格式無效，請再試一次。" });
  }
}

function serveStatic(request, response) {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(ROOT, `.${requestedPath}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403);
    return response.end("Forbidden");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      return response.end("Not found");
    }
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
    response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
}

http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/generate") {
    return generatePlan(request, response);
  }
  if (request.method === "GET") return serveStatic(request, response);
  response.writeHead(405, { Allow: "GET, POST" });
  response.end("Method not allowed");
}).listen(PORT, () => {
  console.log(`每日三分鐘寫作靈感已啟動：http://localhost:${PORT}`);
});
