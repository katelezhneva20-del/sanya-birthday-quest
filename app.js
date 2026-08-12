const SUPABASE_URL = "https://shafcsvwouvemwcjnxoa.supabase.co";
const SUPABASE_KEY = "sb_publishable_cPU6r4RvYc8JG3qFG0OLuQ_WkgdS0oE";

let db = null;
let profile = null;
let lastSashaStage = 0;

const fallback = {
  sasha: {
    1: ["Неразрешённый вопрос", "У тебя есть нерешённый вопрос с одним из присутствующих. Ты сам должен его вычислить, понять испытание и назвать кодовое слово. Кодовое слово известно только тебе и этому человеку. Подсказок не будет."],
    3: ["Ну что, попробуй решить", "Обратись к человеку, который считает, что ты используешь свой мозг не на максимум."],
    4: ["Освежись и сними стресс", "Обратись к Диме. Он знает, что делать дальше."]
  },
  zhenya: {
    1: ["Кодовое слово: РЕВАНШ", "Знаешь его только ты и Саша. Подсказывать нельзя."]
  },
  veronika: {
    3: ["Математика", "Как только Саша обратится к тебе — дай ему жару. Задай задачу, которую он должен решить, а затем отметь результат."]
  },
  dima: {
    4: ["Пивная дегустация", "Проведи слепую дегустацию. Ты тоже участвуешь и соревнуешься с Сашей в угадывании пива."]
  },
  alina: {
    6: ["Ловкость", "Ты ведущая. Палка, два участника. Называй части тела, затем «палка». До 3 побед."]
  },
  katya: {
    5: ["Командный квиз", "Саша выбирает двух участников. Остальные трое соревнуются против них."]
  }
};

function initSupabase() {
  if (!window.supabase || !window.supabase.createClient) return false;
  try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem("quest_profile") || "null");
  } catch {
    return null;
  }
}

function saveProfile(p) {
  profile = p;
  localStorage.setItem("quest_profile", JSON.stringify(p));
}

function showLogin(message = "") {
  document.getElementById("app").innerHTML = `
    <div class="card">
      <span class="badge">SANYA · BIRTHDAY QUEST</span>
      <h1>Твой секретный вход</h1>
      <p>Введи код, который ты получил.</p>
      <form id="loginForm">
        <input id="accessCode" placeholder="Код" autocomplete="off" required>
        <button type="submit">Войти</button>
        <div id="loginError" class="error">${message}</div>
      </form>
    </div>`;

  document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const box = document.getElementById("loginError");
    box.textContent = "Проверяем код…";

    try {
      const result = await db.rpc("claim_room", {
        p_code: document.getElementById("accessCode").value.trim().toUpperCase()
      });

      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error("INVALID");

      const p = result.data[0];
      saveProfile({
        participant_id: p.participant_id,
        display_name: p.display_name,
        role: p.role,
        has_puzzle: Boolean(p.has_puzzle)
      });

      location.href = "room.html";
    } catch (err) {
      console.error(err);
      box.textContent = err.message === "INVALID"
        ? "Неверный код."
        : "Не удалось подключиться к квесту.";
    }
  });
}

async function getState() {
  const result = await db
    .from("quest_state")
    .select("*")
    .eq("id", "main")
    .single();

  if (result.error) throw result.error;
  return result.data;
}

async function getContent(stage) {
  try {
    const result = await db
      .from("stage_content")
      .select("title,body")
      .eq("stage", stage)
      .eq("role", profile.participant_id)
      .maybeSingle();

    if (!result.error && result.data) {
      return [result.data.title, result.data.body];
    }
  } catch (e) {
    console.error(e);
  }

  return fallback[profile.participant_id]?.[stage]
    || ["Квест", "Следуй инструкциям ведущего."];
}

/*
  ВАЖНО:
  Личный экран каждого ведущего теперь определяется его ролью,
  а не глобальным current_stage.
  Поэтому переход Саши на следующий этап НЕ удаляет кнопки ведущего.
*/
function leaderStage() {
  const role = profile.participant_id;

  if (role === "zhenya") return 1;
  if (role === "veronika") return 3;
  if (role === "dima") return 4;
  if (role === "alina") return 6;
  if (role === "katya") return 5;

  return null;
}

function leaderButtons() {
  const role = profile.participant_id;

  if (role === "zhenya") {
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

  if (role === "veronika") {
    return `
      <div class="admin">
        <h2>Результат математики</h2>
        <p>После того как Саша решит задачу, отметь результат.</p>
        <div class="row">
          <button id="mathPass">Сдал</button>
          <button id="mathFail" class="secondary">Не сдал</button>
        </div>
      </div>`;
  }

  return "";
}

async function renderRoom() {
  if (!profile) {
    showLogin();
    return;
  }

  const state = await getState();
  const globalStage = Number(state.current_stage) || 1;

  // Саша получает именно текущий этап квеста.
  // Ведущие получают свой постоянный экран.
  let displayStage = globalStage;

  if (profile.participant_id !== "sasha") {
    displayStage = leaderStage() || globalStage;
  }

  const content = await getContent(displayStage);

  document.getElementById("app").innerHTML = `
    <div class="card">
      <span class="badge">${profile.display_name}</span>
      <div class="stat">${profile.participant_id === "sasha" ? "Этап " + globalStage : "Твоя роль"}</div>
      <h1>${content[0]}</h1>
      <div class="mission">${content[1]}</div>
      ${profile.participant_id === "sasha" ? "" : leaderButtons()}
    </div>`;

  bindLeaderButtons();
  lastSashaStage = globalStage;
}

function bindLeaderButtons() {
  if (profile.participant_id === "zhenya") {
    document.getElementById("sashaWin")?.addEventListener("click", () => finishStage("knb", true));
    document.getElementById("sashaLose")?.addEventListener("click", () => finishStage("knb", false));
  }

  if (profile.participant_id === "veronika") {
    document.getElementById("mathPass")?.addEventListener("click", () => finishStage("math", true));
    document.getElementById("mathFail")?.addEventListener("click", () => finishStage("math", false));
  }
}

async function finishStage(kind, won) {
  document.querySelectorAll("button").forEach(b => b.disabled = true);

  let nextStage = null;

  if (kind === "knb") {
    nextStage = won ? 3 : 1;
  }

  if (kind === "math") {
    nextStage = won ? 4 : 3;
  }

  const result = await db
    .from("quest_state")
    .update({
      current_stage: nextStage,
      stage_status: won ? "active" : "failed",
      stage_result: kind + (won ? "_won" : "_lost"),
      updated_at: new Date().toISOString()
    })
    .eq("id", "main");

  if (result.error) {
    console.error(result.error);
    alert("Не удалось сохранить результат. Попробуйте ещё раз.");
    document.querySelectorAll("button").forEach(b => b.disabled = false);
    return;
  }

  await renderRoom();
}

async function start() {
  initSupabase();
  profile = getProfile();

  if (!profile) {
    showLogin();
    return;
  }

  if (!location.pathname.endsWith("room.html")) {
    location.href = "room.html";
    return;
  }

  await renderRoom();

  // Проверяем изменение общего этапа только для экрана Саши.
  // У ведущих экран не исчезает из-за перехода Саши.
  setInterval(async () => {
    try {
      if (profile.participant_id !== "sasha") return;

      const state = await getState();
      const stage = Number(state.current_stage) || 1;

      if (stage !== lastSashaStage) {
        await renderRoom();
      }
    } catch (e) {
      console.error(e);
    }
  }, 1500);
}

start().catch(error => {
  console.error(error);
  showLogin("Не удалось загрузить квест.");
});
