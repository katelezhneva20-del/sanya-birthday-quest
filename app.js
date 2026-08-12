const SUPABASE_URL = "https://shafcsvwouvemwcjnxoa.supabase.co";
const SUPABASE_KEY = "sb_publishable_cPU6r4RvYc8JG3qFG0OLuQ_WkgdS0oE";

let db = null;
let profile = null;
let lastStage = null;
let timer = null;

const fallback = {
  sasha: {
    1: ["Неразрешённый вопрос", "У тебя есть нерешённый вопрос с одним из присутствующих. Ты сам должен его вычислить, понять испытание и назвать кодовое слово. Кодовое слово известно только тебе и этому человеку. Подсказок не будет."],
    2: ["Ну что, попробуй решить", "Обратись к Веронике и попроси её провести следующее испытание."]
  },
  zhenya: {
    1: ["Кодовое слово: РЕВАНШ", "Знаешь его только ты и Саша. Подсказывать нельзя."]
  },
  veronika: {
    3: ["Математика", "Как только Саша обратится к тебе — дай ему жару. Задай задачу и после испытания отметь результат."]
  },
  dima: {
    4: ["Пивная дегустация", "Проведи слепую дегустацию. Ты тоже участвуешь и соревнуешься с Сашей."]
  },
  alina: {
    6: ["Ловкость", "Ты ведущая. Палка, два участника. Называй части тела, затем «палка». До 3 побед."]
  },
  katya: {
    5: ["Командный квиз", "Саша выбирает двух участников. Остальные трое соревнуются против них."]
  }
};

function bootSupabase() {
  try {
    if (!window.supabase || !window.supabase.createClient) return false;
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function getProfile() {
  try { return JSON.parse(localStorage.getItem("quest_profile") || "null"); }
  catch { return null; }
}

function saveProfile(p) {
  profile = p;
  localStorage.setItem("quest_profile", JSON.stringify(p));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"
  }[c]));
}

async function login(code) {
  if (!db) throw new Error("SUPABASE_NOT_READY");
  const result = await db.rpc("claim_room", {
    p_code: String(code || "").trim().toUpperCase()
  });
  if (result.error) throw result.error;
  if (!result.data || !result.data.length) throw new Error("INVALID");

  const p = result.data[0];
  saveProfile({
    participant_id: p.participant_id,
    display_name: p.display_name,
    role: p.role,
    has_puzzle: Boolean(p.has_puzzle)
  });
}

function showLogin(message = "") {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="card">
      <span class="badge">SANYA · BIRTHDAY QUEST</span>
      <h1>Твой секретный вход</h1>
      <p>Введи код, который ты получил.</p>
      <form id="loginForm">
        <input id="accessCode" placeholder="Код" autocomplete="off" required>
        <button type="submit">Войти</button>
        <div id="loginError" class="error">${esc(message)}</div>
      </form>
    </div>`;

  document.getElementById("loginForm").onsubmit = async e => {
    e.preventDefault();
    const box = document.getElementById("loginError");
    box.textContent = "Проверяем код…";
    try {
      await login(document.getElementById("accessCode").value);
      location.href = "room.html";
    } catch (err) {
      console.error(err);
      box.textContent = err.message === "INVALID"
        ? "Неверный код."
        : "Не удалось подключиться к квесту.";
    }
  };
}

async function getState() {
  const result = await db.from("quest_state").select("*").eq("id", "main").single();
  if (result.error) throw result.error;
  return result.data;
}

async function getContent(stage) {
  try {
    const result = await db.from("stage_content")
      .select("title,body")
      .eq("stage", stage)
      .eq("role", profile.participant_id)
      .maybeSingle();

    if (!result.error && result.data) return [result.data.title, result.data.body];
  } catch (e) {
    console.error(e);
  }
  return fallback[profile.participant_id]?.[stage] || ["Квест", "Следуй инструкциям ведущего."];
}

function buttonsFor(stage) {
  if (profile.participant_id === "zhenya" && stage === 1) {
    return `
      <div class="admin">
        <h2>Результат КНБ</h2>
        <p>После финального раунда выбери результат.</p>
        <div class="row">
          <button id="sashaWin">Саша победил</button>
          <button id="sashaLose" class="secondary">Саша проиграл</button>
        </div>
      </div>`;
  }

  if (profile.participant_id === "sasha" && stage === 2) {
    return `<div class="mission"><b>Следующий шаг разблокирован.</b><br>Теперь обратись к Веронике.</div>`;
  }

  return "";
}

async function render() {
  if (!profile) {
    showLogin();
    return;
  }

  let state;
  try {
    state = await getState();
  } catch (e) {
    console.error(e);
    document.getElementById("app").innerHTML = `
      <div class="card">
        <h1>Не удалось получить состояние квеста</h1>
        <p>Обнови страницу через несколько секунд.</p>
      </div>`;
    return;
  }

  // Until the admin starts the quest, show stage 1 to the participants.
  const stage = Number(state.current_stage) > 0 ? Number(state.current_stage) : 1;

  const content = await getContent(stage);
  const controls = buttonsFor(stage);

  document.getElementById("app").innerHTML = `
    <div class="card">
      <span class="badge">${esc(profile.display_name)}</span>
      <div class="stat">Этап ${stage}</div>
      <h1>${esc(content[0])}</h1>
      <div class="mission">${esc(content[1])}</div>
      ${controls}
    </div>`;

  bindButtons(stage);
  lastStage = stage;
}

function bindButtons(stage) {
  if (profile.participant_id !== "zhenya" || stage !== 1) return;

  document.getElementById("sashaWin")?.addEventListener("click", () => finishKnb(true));
  document.getElementById("sashaLose")?.addEventListener("click", () => finishKnb(false));
}

async function finishKnb(sashaWon) {
  const buttons = document.querySelectorAll("button");
  buttons.forEach(b => b.disabled = true);

  const result = await db.from("quest_state").update({
    current_stage: sashaWon ? 2 : 1,
    stage_status: sashaWon ? "active" : "failed",
    stage_result: sashaWon ? "sasha_won" : "sasha_lost",
    updated_at: new Date().toISOString()
  }).eq("id", "main");

  if (result.error) {
    console.error(result.error);
    alert("Не удалось сохранить результат. Попробуйте ещё раз.");
    buttons.forEach(b => b.disabled = false);
    return;
  }

  await render();
}

async function start() {
  bootSupabase();
  profile = getProfile();

  if (location.pathname.endsWith("room.html")) {
    if (!profile) {
      showLogin();
      return;
    }

    await render();

    // Polling is intentional for this first synchronization test:
    // it works even when Realtime is not enabled for the table.
    timer = setInterval(async () => {
      try {
        const state = await getState();
        const stage = Number(state.current_stage) > 0 ? Number(state.current_stage) : 1;
        if (stage !== lastStage) await render();
      } catch (e) {
        console.error(e);
      }
    }, 1500);

  } else {
    if (profile) {
      location.href = "room.html";
    } else {
      showLogin();
    }
  }
}

window.addEventListener("error", e => console.error("Quest error:", e.error || e.message));
start().catch(e => {
  console.error(e);
  showLogin("Не удалось загрузить квест. Обнови страницу.");
});
