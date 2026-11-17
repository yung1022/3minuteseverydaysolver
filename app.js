const examples = [
  {
    date: "2026-09-07",
    weekday: "星期一",
    category: "文言積累",
    content: "【字詞】「適」：① 前往；② 剛好。\n【例句】「余自京師適江南」——此處的「適」解作「前往」。",
  },
  {
    date: "2026-09-08",
    weekday: "星期二",
    category: "人物描寫",
    content: "【佳句】老人的手佈滿青筋，像一棵老樹盤錯的根，微微顫抖著接過茶杯。\n【手法】外貌描寫、比喻。",
  },
  {
    date: "2026-09-09",
    weekday: "星期三",
    category: "景物描寫",
    content: "【佳句】夜色從街角蔓延開來，遠處霓虹燈在濕漉漉的地面折射出斑駁的彩光。\n【手法】視覺描寫、擬物。",
  },
  {
    date: "2026-09-10",
    weekday: "星期四",
    category: "議論文素材",
    content: "【素材】「未曾哭過長夜的人，不足以語人生。」\n【適用主題】逆境、挫折、成長。",
  },
  {
    date: "2026-09-11",
    weekday: "星期五",
    category: "素材轉化",
    content: "面對困境，我們不應逃避。經歷痛楚與掙扎，才能鍛造出更堅韌的靈魂；每一次勇敢前行，都讓我們更靠近理想中的自己。",
  },
];

const form = document.querySelector("#planner-form");
const startInput = document.querySelector("#start-date");
const endInput = document.querySelector("#end-date");
const apiKeyInput = document.querySelector("#api-key");
const list = document.querySelector("#schedule-list");
const message = document.querySelector("#message");
const count = document.querySelector("#result-count");
const sampleNote = document.querySelector("#sample-note");
const button = form.querySelector("button");
const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const categories = {
  1: "文言積累",
  2: "人物描寫",
  3: "景物描寫",
  4: "議論文素材",
  5: "素材轉化",
};
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "inclusionai/ling-3.2-flash:free";

function toLocalDateInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function setDefaultDates() {
  const today = new Date();
  const monday = new Date(today);
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
  monday.setDate(today.getDate() + daysUntilMonday);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  startInput.value = toLocalDateInput(monday);
  endInput.value = toLocalDateInput(friday);
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return `${month}月${day}日`;
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
    if (categories[weekday]) {
      plan.push({
        date: date.toISOString().slice(0, 10),
        weekday: weekdays[weekday],
        category: categories[weekday],
      });
    }
  }
  return plan;
}

function renderItems(items) {
  list.replaceChildren(...items.map((item, index) => {
    const card = document.createElement("article");
    card.className = "day-card";
    card.style.animationDelay = `${Math.min(index, 8) * 45}ms`;

    const date = document.createElement("div");
    date.className = "day-date";
    const weekday = document.createElement("span");
    weekday.className = "day-weekday";
    weekday.textContent = item.weekday;
    const calendar = document.createElement("span");
    calendar.className = "day-calendar";
    calendar.textContent = formatDate(item.date);
    date.append(weekday, calendar);

    const content = document.createElement("div");
    content.className = "day-content";
    const category = document.createElement("div");
    category.className = "day-category";
    const mark = document.createElement("span");
    mark.className = "category-mark";
    category.append(mark, document.createTextNode(`類別：${item.category}`));
    const text = document.createElement("p");
    text.className = "day-text";
    text.textContent = item.content;
    content.append(category, text);
    card.append(date, content);
    return card;
  }));
  count.textContent = `${items.length} 天`;
}

function showMessage(text, loading = false) {
  message.textContent = text;
  message.className = `message visible${loading ? " loading" : ""}`;
}

setDefaultDates();
renderItems(examples);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showMessage("請輸入 OpenRouter API 金鑰後再生成。");
    apiKeyInput.focus();
    return;
  }

  const plan = getWeekdayPlan(startInput.value, endInput.value);
  if (!plan) {
    showMessage("請選擇有效日期，結束日期不得早於開始日期，且日期範圍不能超過 31 天。");
    endInput.focus();
    return;
  }
  if (plan.length === 0) {
    showMessage("所選日期範圍沒有星期一至星期五，請重新選擇。");
    startInput.focus();
    return;
  }

  button.disabled = true;
  button.innerHTML = '<span class="button-spark">✳</span> 正在準備靈感…';
  message.className = "message";
  showMessage("AI 正在為你整理每日寫作素材，請稍候片刻。", true);
  sampleNote.hidden = true;

  try {
    const schedule = plan
      .map(({ date, weekday, category }) => `${date}（${weekday}）：${category}`)
      .join("\n");
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是繁體中文寫作老師，為中學生製作每日三分鐘的寫作素材。只輸出 JSON 物件，格式為 {\"items\":[{\"date\":\"YYYY-MM-DD\",\"weekday\":\"星期一\",\"category\":\"文言積累\",\"content\":\"...\"}]}。日期、星期和類別必須與提供的清單完全一致。內容精簡、原創、適合學生；引用名言時避免無法核實的作者歸屬。",
          },
          {
            role: "user",
            content: `請為以下每個上課日各撰寫一則可直接使用的寫作練習，依類別選擇相應格式：文言積累提供實詞、意思及例句；人物描寫和景物描寫提供佳句及手法；議論文素材提供名言或事例及適用主題；素材轉化寫至少 50 個中文字的短文。只包含清單中日期，不需生成週末內容。\n\n${schedule}`,
          },
        ],
      }),
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("OpenRouter 回傳格式無效，請稍後再試。");
    }
    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? "OpenRouter 免費模型目前繁忙或額度已用完，請稍後再試。"
          : result.error?.message || "AI 生成失敗，請確認 API 金鑰及 OpenRouter 設定。",
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(result.choices?.[0]?.message?.content);
    } catch {
      throw new Error("AI 回傳格式無效，請再試一次。");
    }
    if (!Array.isArray(parsed?.items) || parsed.items.length !== plan.length) {
      throw new Error("AI 回傳格式無效，請再試一次。");
    }
    const expectedItems = new Map(plan.map((item) => [item.date, item]));
    const seenDates = new Set();
    const items = parsed.items.map((item) => {
      if (!item || typeof item !== "object") {
        throw new Error("AI 回傳格式無效，請再試一次。");
      }
      const expected = expectedItems.get(item.date);
      if (
        !expected ||
        seenDates.has(item.date) ||
        item.weekday !== expected.weekday ||
        item.category !== expected.category ||
        typeof item.content !== "string"
      ) {
        throw new Error("AI 回傳格式無效，請再試一次。");
      }
      seenDates.add(item.date);
      return item;
    });
    renderItems(items);
    message.className = "message";
  } catch (error) {
    showMessage(error.message || "目前無法連接 AI 服務，請稍後再試。");
  } finally {
    button.disabled = false;
    button.innerHTML = '<span class="button-spark">✳</span> 生成我的素材 <span class="button-arrow">↗</span>';
  }
});
