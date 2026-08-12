const SUPABASE_URL="https://shafcsvwouvemwcjnxoa.supabase.co";
const SUPABASE_KEY="sb_publishable_cPU6r4RvYc8JG3qFG0OLuQ_WkgdS0oE";
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const stages={
1:"Неразрешённый вопрос",2:"КНБ",3:"Математика",4:"Пивная дегустация",
5:"Командный квиз",6:"Ловкость",7:"Каллах",8:"Стаканы вслепую",
9:"Минное поле",10:"Финальный квиз",11:"Охота за пазлами",12:"ФИНАЛ"
};

const content={
sasha:{
1:["Неразрешённый вопрос","У тебя есть нерешённый вопрос с одним из присутствующих. Ты сам должен его вычислить, понять испытание и назвать кодовое слово. Кстати, кодовое слово известно только тебе и этому человеку, поэтому подсказок не будет. Пощады не жди."],
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
12:["ФИНАЛ","Собери пазл и получи заветный приз. Или реши оставить пазл себе."]
},
zhenya:{
1:["Кодовое слово: РЕВАНШ","Знаешь его только ты и Саша. Подсказывать нельзя."],
2:["КНБ","Играй честно. Не поддавайся. Саша уже не поддавался тебе."],
7:["КАЛЛАХ","Играй честно и не поддавайся."],
9:["Твоя роль","Сбивай Сашу с толку во время минного поля."]
},
veronika:{
3:["Математика","Как только Саша обратится к тебе — дай ему жару. Задай задачу, которую он должен решить. После испытания отметь: сдал / не сдал."],
8:["Стаканы вслепую","Проведи испытание. Саша сам выбирает соперника. Кто быстрее соберёт стаканы одной рукой — победил."],
9:["Твоя роль","Путаешь Сашу. Например: «На твоём месте я бы хорошо подумала»."]
},
dima:{
4:["Пивная дегустация","Саша должен снять стресс. Проведи слепую дегустацию. Ты тоже участвуешь и соревнуешься с Сашей."],
9:["Минное поле","Расставь разные объекты. Саша проходит поле вслепую. Ты искренне помогаешь, но нельзя говорить: вперёд, назад, влево, вправо, обойди."],
},
alina:{
6:["Ловкость","Ты ведущая. Реквизит: палка. Участников: 2. Называй части тела, затем «палка». Кто схватит быстрее — получает очко. До 3 побед."],
9:["Твоя роль","Контролируешь и можешь помочь Саше только один раз."]
},
katya:{
5:["Командный квиз","Саша выбирает двух участников. Остальные трое соревнуются против них. Отметь победившую команду."],
9:["Твоя роль","Не делай ничего полезного. Отвлекай Сашу разговорами на любые темы."],
11:["Админка","После квиза контролируй обмен пазлами и финальный переход."]
}
};

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

let profile=null, live=null;
const app=document.getElementById("app");
const esc=s=>String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

async function session(){
  let x=await db.auth.getSession();
  if(!x.data.session){
    const r=await db.auth.signInAnonymously();
    if(r.error)throw r.error;
  }
}

function saved(){try{return JSON.parse(localStorage.getItem("quest_profile")||"null")}catch{return null}}
function save(p){localStorage.setItem("quest_profile",JSON.stringify(p));profile=p}

async function login(code){
  await session();
  // The database RPC is added in the next schema step; fallback supports the seeded participant IDs.
  const map={SASHA:"sasha",JENYA:"zhenya",VERONIKA:"veronika",DIMA:"dima",ALINA:"alina",KATYA:"katya"};
  const id=map[String(code).trim().toUpperCase()];
  if(!id)throw new Error("INVALID");
  const {data}=await db.from("participants").select("*").eq("id",id).single();
  if(!data)throw new Error("INVALID");
  save({participant_id:data.id,display_name:data.display_name,role:data.role});
}

async function state(){
  const {data,error}=await db.from("quest_state").select("*").eq("id","main").single();
  if(error)throw error;
  return data;
}

function instruction(stage){
  const c=content[profile?.participant_id]?.[stage];
  if(c)return c;
  return [stages[stage]||"Квест", "Пока здесь нет инструкции. Дождись открытия следующего этапа."];
}

async function renderLogin(){
  app.innerHTML=`<div class="card"><span class="badge">SANYA · BIRTHDAY QUEST</span><h1>Твой секретный вход</h1><p>Введи код, который ты получил. После входа каждый участник видит только свою комнату.</p><form id="f"><input id="code" placeholder="Код" autocomplete="off"><button>Войти</button><div id="e" class="error"></div></form></div>`;
  document.getElementById("f").onsubmit=async e=>{
    e.preventDefault();
    try{await login(document.getElementById("code").value);location.href="room.html"}
    catch{document.getElementById("e").textContent="Неверный код."}
  };
}

async function render(){
  await session();
  if(!profile)profile=saved();
  if(!profile){await renderLogin();return}
  const s=await state(), c=instruction(s.current_stage);
  app.innerHTML=`<div class="card"><span class="badge">${esc(profile.display_name)}</span><div class="stat">Этап ${s.current_stage}/12</div><div class="stat">Пазлов: ${s.puzzle_count}</div><h1>${esc(c[0])}</h1><div class="mission">${esc(c[1]).replace(/\n/g,"<br>")}</div>${profile.participant_id==="sasha"&&s.current_stage===10?quiz(): ""}${profile.participant_id==="katya"?admin(s):""}</div>`;
  subscribe();
  bind();
}

function quiz(){
  return `<div class="mission"><h2>Вопросы</h2>${questions.map((q,i)=>`<div class="q"><b>${i+1}.</b> ${esc(q)}</div>`).join("")}<p>После каждого вопроса Саша отвечает сам, затем проводится проверка.</p></div>`;
}

function admin(s){
  return `<div class="admin"><h2>Админка</h2><p>Текущий этап: <b>${s.current_stage}</b></p><div class="row"><button id="next">Следующий этап</button><button class="secondary" id="winS">Победа команды Саши</button><button class="secondary" id="winO">Победа соперников</button></div></div>`;
}

function bind(){
  document.getElementById("next")?.addEventListener("click",async()=>{
    const s=await state();
    if(s.current_stage<12)await db.from("quest_state").update({current_stage:s.current_stage+1,stage_status:"active",updated_at:new Date().toISOString()}).eq("id","main");
  });
  document.getElementById("winS")?.addEventListener("click",()=>winner("sasha"));
  document.getElementById("winO")?.addEventListener("click",()=>winner("opponents"));
}
async function winner(w){await db.from("quest_state").update({team_winner:w,updated_at:new Date().toISOString()}).eq("id","main");}

function subscribe(){
  if(live)db.removeChannel(live);
  live=db.channel("quest-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"quest_state"},()=>render())
    .on("postgres_changes",{event:"*",schema:"public",table:"participants"},()=>render())
    .subscribe();
}

render().catch(e=>{console.error(e);app.innerHTML=`<div class="card"><h1>Ошибка подключения</h1><p>Проверь подключение к Supabase и обнови страницу.</p></div>`});
