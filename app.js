const SUPABASE_URL = "https://shafcsvwouvemwcjnxoa.supabase.co";
const SUPABASE_KEY = "sb_publishable_cPU6r4RvYc8JG3qFG0OLuQ_WkgdS0oE";

let db = null;
let profile = null;

const fallback = {
  sasha: {
    1: [
      "Неразрешённый вопрос",
      "У тебя есть нерешённый вопрос с одним из присутствующих. Ты сам должен его вычислить, понять испытание и назвать кодовое слово. Кодовое слово известно только тебе и этому человеку. Подсказок не будет."
    ]
  },
  zhenya: {
    1: [
      "Кодовое слово: РЕВАНШ",
      "Знаешь его только ты и Саша. Подсказывать нельзя."
    ]
  },
  veronika: {
    3: [
      "Математика",
      "Как только Саша обратится к тебе — дай ему жару. Задай задачу и после испытания отметь результат."
    ]
  },
  dima: {
    4: [
      "Пивная дегустация",
      "Проведи слепую дегустацию. Ты тоже участвуешь и соревнуешься с Сашей."
    ]
  },
  alina: {
    6: [
      "Ловкость",
      "Ты ведущая. Палка, два участника. Называй части тела, затем «палка». До 3 побед."
    ]
  },
  katya: {
    5: [
      "Командный квиз",
      "Саша выбирает двух участников. Остальные трое соревнуются против них."
    ]
  }
};

function bootSupabase() {
  try {
    if (!window.supabase || !window.supabase.createClient) {
      return false;
    }

    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return true;
  } catch (error) {
    console.error("Supabase init error:", error);
    return false;
  }
}

function getSavedProfile() {
  try {
    return JSON.parse(localStorage.getItem("quest_profile") || "null");
  } catch {
    return null;
  }
}

function saveProfile(value) {
  profile = value;
  localStorage.setItem("quest_profile", JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[character]));
}

async function login(code) {
  const clean = String(code || "").trim().toUpperCase();

  if (!clean) {
    throw new Error("EMPTY");
  }

  if (!db) {
    throw new Error("SUPABASE_NOT_READY");
  }

  const result = await db.rpc("claim_room", {
    p_code: clean
  });

  if (result.error) {
    throw result.error;
  }

  if (!result.data || !result.data.length) {
    throw new Error("INVALID");
  }

  const participant = result.data[0];

  saveProfile({
    participant_id: participant.participant_id,
    display_name: participant.display_name,
    role: participant.role,
    has_puzzle: Boolean(participant.has_puzzle)
  });
}

function showLogin(message = "") {
  const app = document.getElementById("app");

  if (!app) {
    document.body.innerHTML = "<h1>Ошибка: элемент #app не найден.</h1>";
    return;
  }

  app.innerHTML = `
    <div class="card">
      <span class="badge">SANYA · BIRTHDAY QUEST</span>
      <h1>Твой секретный вход</h1>
      <p>Введи код, который ты получил.</p>

      <form id="loginForm">
        <input
          id="accessCode"
          placeholder="Код"
          autocomplete="off"
          required
        >
        <button type="submit">Войти</button>
        <div id="loginError" class="error">${escapeHtml(message)}</div>
      </form>
    </div>
  `;

  document.getElementById("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const errorBox = document.getElementById("loginError");
    errorBox.textContent = "Проверяем код…";

    try {
      await login(document.getElementById("accessCode").value);
      window.location.href = "room.html";
    } catch (error) {
      console.error("Login error:", error);

      if (error.message === "INVALID") {
        errorBox.textContent = "Неверный код.";
      } else {
        errorBox.textContent =
          "Не удалось подключиться к квесту. Проверь подключение и попробуй ещё раз.";
      }
    }
  });
}

async function renderRoom() {
  profile = getSavedProfile();

  if (!profile) {
    showLogin();
    return;
  }

  let stage = 1;

  if (db) {
    try {
      const state = await db
        .from("quest_state")
        .select("*")
        .eq("id", "main")
        .single();

      if (!state.error && state.data) {
        stage = state.data.current_stage || 1;
      }
    } catch (error) {
      console.error("State error:", error);
    }
  }

  let content = null;

  if (db) {
    try {
      const remote = await db
        .from("stage_content")
        .select("title, body")
        .eq("stage", stage)
        .eq("role", profile.participant_id)
        .maybeSingle();

      if (!remote.error && remote.data) {
        content = [remote.data.title, remote.data.body];
      }
    } catch (error) {
      console.error("Content error:", error);
    }
  }

  content =
    content ||
    fallback[profile.participant_id]?.[stage] ||
    ["Квест", "Следуй инструкциям ведущего."];

  document.getElementById("app").innerHTML = `
    <div class="card">
      <span class="badge">${escapeHtml(profile.display_name)}</span>
      <div class="stat">Этап ${stage}</div>
      <h1>${escapeHtml(content[0])}</h1>
      <div class="mission">${escapeHtml(content[1])}</div>
    </div>
  `;
}

async function start() {
  bootSupabase();

  profile = getSavedProfile();

  if (window.location.pathname.endsWith("room.html")) {
    await renderRoom();
  } else if (profile) {
    await renderRoom();
  } else {
    showLogin();
  }
}

window.addEventListener("error", event => {
  console.error("Quest error:", event.error || event.message);
});

start().catch(error => {
  console.error("Fatal quest error:", error);
  showLogin("Не удалось загрузить квест. Обнови страницу.");
});
