const SUPABASE_URL = "https://shafcsvwouvemwcjnxoa.supabase.co";
const SUPABASE_KEY = "sb_publishable_cPU6r4RvYc8JG3qFG0OLuQ_WkgdS0oE";

let db = null;
let profile = null;
let lastStage = 0;

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
    3: ["Математика", "Вероника, как только Саша обратится к тебе — дай ему жару. Задай задачу, которую он должен решить, а затем отметь результат."]
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
  } catch (e) {
    return null;
  }
}

function saveProfile(p) {
  profile = p;
  localStorage.setItem("quest_profile", JSON.stringify(p));
}

function showLogin(errorText) {
  document.getElementById("app").innerHTML =
    '<div class="card">' +
      '<span class="badge">SANYA · BIRTHDAY QUEST</span>' +
      '<h1>Твой секретный вход</h1>' +
      '<p>Введи код, который ты получил.</p>' +
      '<form id="loginForm">' +
        '<input id="accessCode" placeholder="Код" autocomplete="off" required>' +
        '<button type="submit">Войти</button>' +
        '<div id="loginError" class="error">' + (errorText || "") + '</div>' +
      '</form>' +
    '</div>';

  document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const box = document.getElementById("loginError");
    box.textContent = "Проверяем код…";

    try {
      if (!db) throw new Error("SUPABASE");
      const result = await db.rpc("claim_room", {
        p_code: document.getElementById("accessCode").value.trim().toUpperCase()
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

      window.location.href = "room.html";
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

async function getStageContent(stage) {
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

  const local = fallback[profile.participant_id];
  return local && local[stage]
    ? local[stage]
    : ["Квест", "Следуй инструкциям ведущего."];
}

function renderButtons(stage) {
  if (profile.participant_id === "zhenya" && stage === 1) {
    return '' +
      '<div class="admin">' +
        '<h2>Результат КНБ</h2>' +
        '<p>После финального раунда выбери результат.</p>' +
        '<div class="row">' +
          '<button id="sashaWin">Саша победил</button>' +
          '<button id="sashaLose" class="secondary">Саша проиграл</button>' +
        '</div>' +
      '</div>';
  }

  if (profile.participant_id === "veronika" && stage === 3) {
    return '' +
      '<div class="admin">' +
        '<h2>Результат математики</h2>' +
        '<p>После того как Саша решит задачу, отметь результат.</p>' +
        '<div class="row">' +
          '<button id="mathPass">Сдал</button>' +
          '<button id="mathFail" class="secondary">Не сдал</button>' +
        '</div>' +
      '</div>';
  }

  return "";
}

async function renderRoom() {
  if (!profile) {
    showLogin("");
    return;
  }

  const state = await getState();
  const stage = Number(state.current_stage) > 0 ? Number(state.current_stage) : 1;
  const content = await getStageContent(stage);

  document.getElementById("app").innerHTML =
    '<div class="card">' +
      '<span class="badge">' + profile.display_name + '</span>' +
      '<div class="stat">Этап ' + stage + '</div>' +
      '<h1>' + content[0] + '</h1>' +
      '<div class="mission">' + content[1] + '</div>' +
      renderButtons(stage) +
    '</div>';

  if (profile.participant_id === "zhenya" && stage === 1) {
    document.getElementById("sashaWin").addEventListener("click", function() {
      finishStage("knb", true);
    });
    document.getElementById("sashaLose").addEventListener("click", function() {
      finishStage("knb", false);
    });
  }

  if (profile.participant_id === "veronika" && stage === 3) {
    document.getElementById("mathPass").addEventListener("click", function() {
      finishStage("math", true);
    });
    document.getElementById("mathFail").addEventListener("click", function() {
      finishStage("math", false);
    });
  }

  lastStage = stage;
}

async function finishStage(kind, won) {
  document.querySelectorAll("button").forEach(function(button) {
    button.disabled = true;
  });

  // KNB: win -> stage 3 (Sasha + Veronika), loss -> stay on stage 1.
  // Math: pass -> stage 4 (Sasha + Dima), fail -> stay on stage 3.
  let nextStage = lastStage;
  if (kind === "knb" && won) nextStage = 3;
  if (kind === "math" && won) nextStage = 4;

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
    document.querySelectorAll("button").forEach(function(button) {
      button.disabled = false;
    });
    return;
  }

  await renderRoom();
}

async function start() {
  initSupabase();
  profile = getProfile();

  if (window.location.pathname.endsWith("room.html")) {
    if (!profile) {
      showLogin("");
      return;
    }

    await renderRoom();

    setInterval(async function() {
      try {
        const state = await getState();
        const stage = Number(state.current_stage) > 0 ? Number(state.current_stage) : 1;
        if (stage !== lastStage) {
          await renderRoom();
        }
      } catch (e) {
        console.error(e);
      }
    }, 1500);
  } else {
    if (profile) {
      window.location.href = "room.html";
    } else {
      showLogin("");
    }
  }
}

start().catch(function(error) {
  console.error(error);
  showLogin("Не удалось загрузить квест.");
});
