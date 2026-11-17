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
const list = document.querySelector("#schedule-list");
const message = document.querySelector("#message");
const count = document.querySelector("#result-count");
const sampleNote = document.querySelector("#sample-note");
const button = form.querySelector("button");

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
  if (endInput.value < startInput.value) {
    showMessage("結束日期不能早於開始日期，請重新選擇。");
    endInput.focus();
    return;
  }

  button.disabled = true;
  button.innerHTML = '<span class="button-spark">✳</span> 正在準備靈感…';
  message.className = "message";
  showMessage("AI 正在為你整理每日寫作素材，請稍候片刻。", true);
  sampleNote.hidden = true;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: startInput.value, endDate: endInput.value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "生成失敗，請稍後再試。");
    renderItems(result.items);
    message.className = "message";
  } catch (error) {
    showMessage(error.message || "目前無法連接 AI 服務，請稍後再試。");
  } finally {
    button.disabled = false;
    button.innerHTML = '<span class="button-spark">✳</span> 生成我的素材 <span class="button-arrow">↗</span>';
  }
});
