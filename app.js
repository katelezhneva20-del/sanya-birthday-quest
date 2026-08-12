const SUPABASE_URL="https://shafcsvwouvemwcjnxoa.supabase.co";
const SUPABASE_KEY="sb_publishable_cPU6r4RvYc8JG3qFG0OLuQ_WkgdS0oE";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const stages={
  1:"Неразрешённый вопрос",2:"КНБ",3:"Математика",4:"Пивная дегустация",
  5:"Командный квиз",6:"Ловкость",7:"Каллах",8:"Стаканы вслепую",
  9:"Минное поле",10:"Финальный квиз",11:"Охота за пазлами",12:"ФИНАЛ"
};

const fallback={
  sasha:{
    1:["Неразрешённый вопрос","У тебя есть нерешённый вопрос с одним из присутствующих. Ты сам должен его вычислить, понять испытание и назвать кодовое слово. Кодовое слово известно только тебе и этому человеку. Подсказок не будет."],
    2:["РЕВАНШ","Теперь реванш нужен тебе. Найди человека, который знает кодовое слово, и сыграй с ним в камень, ножницы, бумагу."],
    3:["Ну что, попробуй решить","Обратись к Веронике и попроси провести следующее испытание."],
    4:["Нужно освежиться","Обратись к человеку, который может помочь тебе снять стресс."],
    5:["Будь осторожен","Найди двух участников себе в команду. Но пока ты не знаешь, какое испытание тебя ждёт."],
    6:["ЛОВКОСТЬ","Познакомься с Алиной и попроси её провести испытание."],
    7:["КАЛЛАХ","Теперь реванш нужен не Жене, а тебе. Обыграй Женю в Каллах, чтобы продвинуться дальше."],
    8:["СТАКАНЫ ВСЛЕПУЮ","Сними очки и приготовься. Сам выбери соперника."],
    9:["МИННОЕ ПОЛЕ","Приготовься пройти поле вслепую. Все вокруг получили свои роли."],
    10:["ФИНАЛЬНЫЙ КВИЗ","Собери всех участников и проведи квиз на знание тебя."],
    11:["ПАЗЛЫ","Проверь, есть ли у тебя 6 деталей. Если нет — вычисли, у кого они, и торгуйся."],
    12:["ФИНАЛ","Собери пазл и получи заветный приз."]
  },
  zhenya:{
    1:["Кодовое слово: РЕВАНШ","Знаешь его только ты и Саша. Подсказывать нельзя."],
    2:["КНБ","Играй честно. Не поддавайся. Саша уже не поддавался тебе."],
    7:["КАЛЛАХ","Играй честно и не поддавайся."],
    9:["Твоя роль","Сбивай Сашу с толку."]
  },
  veronika:{
    3:["Математика","Как только Саша обратится к тебе — дай ему жару. Задай задачу и после испытания отметь результат."],
    8:["Стаканы вслепую","Проведи испытание. Саша сам выбирает соперника. Кто быстрее соберёт стаканы одной рукой — победил."],
    9:["Твоя роль","Путай Сашу и заставляй сомневаться."]
  },
  dima:{
    4:["Пивная дегустация","Проведи слепую дегустацию. Ты тоже участвуешь и соревнуешься с Сашей."],
    9:["Минное поле","Расставь объекты. Саша проходит поле вслепую. Помогай искренне, но не говори вперёд, назад, влево, вправо или «обойди»."]
  },
  alina:{
    6:["Ловкость","Ты ведущая. Палка, два участника. Называй части тела, затем «палка». До 3 побед."],
    9:["Твоя роль","Контролируй и можешь помочь Саше только один раз."]
  },
  katya:{
    5:["Командный квиз","Саша выбирает двух участников. Остальные трое соревнуются против них."],
    9:["Твоя роль","Не помогай. Отвлекай Сашу разговорами."],
    11:["Админка","Контролируй обмен пазлами и финальный переход."]
  }
};

let profile=null, live=null;
const app=document.getElementById("app");
const esc=s=>String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

async function startSession(){
  const cur=await db.auth.getSession();
  if(!cur.data.session){
    const r=await db.auth.signInAnonymously();
    if(r.error) throw r.error;
  }
}

function getSaved(){try{return JSON.parse(localStorage.getItem("quest_profile")||"null")}catch{return null}}
function saveProfile(p){profile=p;localStorage.setItem("quest_profile",JSON.stringify(p))}

async function login(code){
  await startSession();
  const clean=String(code||"").trim().toUpperCase();
  const {data,error}=await db.rpc("claim_room",{p_code:clean});
  if(error) throw error;
  if(!data || !data.length) throw new Error("INVALID_CODE");
  const p=data[0];
  saveProfile({
    participant_id:p.participant_id,
    display_name:p.display_name,
    role:p.role,
    has_puzzle:!!p.has_puzzle
  });
}

async function getState(){
  const {data,error}=await db.from("quest_state").select("*").eq("id","main").single();
  if(error) throw error;
  return data;
}

async function getRemoteContent(stage){
  const {data,error}=await db.from("stage_content")
    .select("stage,role,title,body")
    .eq("stage",stage);
  if(error) return null;
  return (data||[]).find(x=>x.role===profile.participant_id) || null;
}

async function instruction(stage){
  const remote=await getRemoteContent(stage);
  if(remote) return [remote.title,remote.body];
  return fallback[profile.participant_id]?.[stage] || [
    stages[stage]||"Квест",
    "На этом этапе пока нет отдельной инструкции."
  ];
}

const questions=[
"BMW или Mercedes?","Если завтра можно бесплатно улететь куда угодно — куда полетит Саша?",
"100 € сейчас или 1000 € через год?","От какой бытовой обязанности Саша навсегда избавился бы?",
"Если ему подарят миллион — на что он потратит первую тысячу?",
"Никогда больше не пользоваться телефоном или никогда больше не путешествовать?",
"Какой навык Саша мгновенно освоил бы?","Сколько будильников он обычно ставит?",
"Что Саша делает, когда не знает ответа?","Какую музыку Саша включит, если никто не возражает?",
"С кем из известных людей он хотел бы провести один день?",
"Кто из присутствующих больше всего похож на Сашу по характеру?",
"Кому он точно не дал бы выбрать ему отпуск?","Кого взял бы на необитаемый остров?",
"Кому доверил бы телефон без пароля?","Кто думает, что знает Сашу лучше, чем на самом деле?",
"Кого удалил бы из группового чата на неделю?","Какой автомобиль хотел бы иметь без ограничения денег?",
"Какое желание исполнил бы прямо сейчас?","С кем в комнате поменялся бы жизнью на день?",
"Телепортация или остановка времени?","Если бы получил €10 000 и должен потратить за 24 часа — на что?"
];

async function showLogin(){
  app.innerHTML=`<div class="card">
    <span class="badge">SANYA · BIRTHDAY QUEST</span>
    <h1>Твой секретный вход</h1>
    <p>Введи код, который ты получил.</p>
    <form id="loginForm">
      <input id="accessCode" placeholder="Код" autocomplete="off" required>
      <button type="submit">Войти</button>
      <div id="loginError" class="error"></div>
    </form>
  </div>`;
  document.getElementById("loginForm").onsubmit=async e=>{
    e.preventDefault();
    const err=document.getElementById("loginError");
    err.textContent="Проверяем код…";
    try{
      await login(document.getElementById("accessCode").value);
      location.href="room.html";
    }catch(e){
      console.error(e);
      err.textContent="Неверный код или вход пока не настроен.";
    }
  };
}

function quiz(){
  return `<div class="mission"><h2>Финальный квиз</h2>
  ${questions.map((q,i)=>`<div class="q"><b>${i+1}.</b> ${esc(q)}</div>`).join("")}
  <p>После каждого вопроса все пишут ответ на бумаге, затем Саша отвечает сам и проводится проверка.</p>
  </div>`;
}

async function renderRoom(){
  await startSession();
  if(!profile) profile=getSaved();
  if(!profile){await showLogin();return;}

  const state=await getState();
  const c=await instruction(state.current_stage);

  let extra="";
  if(profile.participant_id==="sasha" && state.current_stage===10) extra=quiz();
  if(profile.participant_id==="katya") extra=admin(state);

  app.innerHTML=`<div class="card">
    <span class="badge">${esc(profile.display_name)}</span>
    <div class="stat">Этап ${state.current_stage}/12</div>
    <div class="stat">Пазлов: ${state.puzzle_count||0}</div>
    <h1>${esc(c[0])}</h1>
    <div class="mission">${esc(c[1]).replace(/\n/g,"<br>")}</div>
    ${extra}
  </div>`;

  bindAdmin();
  subscribe();
}

function admin(state){
  return `<div class="admin">
    <h2>Админка</h2>
    <p>Текущий этап: <b>${state.current_stage}</b></p>
    <div class="row">
      <button id="nextStage">Следующий этап</button>
      <button class="secondary" id="winSasha">Победа команды Саши</button>
      <button class="secondary" id="winOpp">Победа соперников</button>
    </div>
  </div>`;
}

function bindAdmin(){
  document.getElementById("nextStage")?.addEventListener("click",async()=>{
    const s=await getState();
    if(s.current_stage<12){
      await db.from("quest_state").update({
        current_stage:s.current_stage+1,
        stage_status:"active",
        updated_at:new Date().toISOString()
      }).eq("id","main");
    }
  });

  document.getElementById("winSasha")?.addEventListener("click",async()=>{
    await db.from("quest_state").update({team_winner:"sasha",updated_at:new Date().toISOString()}).eq("id","main");
  });

  document.getElementById("winOpp")?.addEventListener("click",async()=>{
    await db.from("quest_state").update({team_winner:"opponents",updated_at:new Date().toISOString()}).eq("id","main");
  });
}

function subscribe(){
  if(live) db.removeChannel(live);
  live=db.channel("quest-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"quest_state"},()=>renderRoom())
    .on("postgres_changes",{event:"*",schema:"public",table:"participants"},()=>renderRoom())
    .subscribe();
}

(async()=>{
  try{
    profile=getSaved();
    if(location.pathname.endsWith("room.html")){
      await renderRoom();
    }else{
      if(profile) await renderRoom();
      else await showLogin();
    }
  }catch(e){
    console.error(e);
    app.innerHTML=`<div class="card"><h1>Ошибка подключения</h1><p>Обнови страницу. Если ошибка останется — пришли мне скриншот.</p></div>`;
  }
})();