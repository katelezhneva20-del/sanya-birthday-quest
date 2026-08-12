const SUPABASE_URL="https://shafcsvwouvemwcjnxoa.supabase.co";
const SUPABASE_KEY="sb_publishable_cPU6r4RvYc8JG3qFG0OLuQ_WkgdS0oE";
let db=null, profile=null, live=null;

const fallbackCodes={SASHA:"sasha",JENYA:"zhenya",VERONIKA:"veronika",DIMA:"dima",ALINA:"alina",KATYA:"katya"};
const fallback={
 sasha:{1:["Неразрешённый вопрос","У тебя есть нерешённый вопрос с одним из присутствующих. Ты сам должен его вычислить, понять испытание и назвать кодовое слово. Кодовое слово известно только тебе и этому человеку. Подсказок не будет."]},
 zhenya:{1:["Кодовое слово: РЕВАНШ","Знаешь его только ты и Саша. Подсказывать нельзя."]},
 veronika:{3:["Математика","Как только Саша обратится к тебе — дай ему жару. Задай задачу и после испытания отметь результат."]},
 dima:{4:["Пивная дегустация","Проведи слепую дегустацию. Ты тоже участвуешь и соревнуешься с Сашей."]},
 alina:{6:["Ловкость","Ты ведущая. Палка, два участника. Называй части тела, затем «палка». До 3 побед."]},
 katya:{5:["Командный квиз","Саша выбирает двух участников. Остальные трое соревнуются против них."]}
};

function bootSupabase(){
 try{
   if(!window.supabase?.createClient) return false;
   db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
   return true;
 }catch(e){console.error(e);return false;}
}
function saved(){try{return JSON.parse(localStorage.getItem("quest_profile")||"null")}catch{return null}}
function save(p){profile=p;localStorage.setItem("quest_profile",JSON.stringify(p))}
function esc(s){return String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}

async function login(code){
 const clean=String(code||"").trim().toUpperCase();
 if(!clean) throw Error("EMPTY");
 if(!db) throw Error("SUPABASE_NOT_READY");
 const r=await db.rpc("claim_room",{p_code:clean});
 if(r.error) throw r.error;
 if(!r.data?.length) throw Error("INVALID");
 const p=r.data[0];
 save({participant_id:p.participant_id,display_name:p.display_name,role:p.role,has_puzzle:!!p.has_puzzle});
}

function showLogin(message=""){
 document.getElementById("app").innerHTML=`<div class="card">
 <span class="badge">SANYA · BIRTHDAY QUEST</span>
 <h1>Твой секретный вход</h1>
 <p>Введи код, который ты получил.</p>
 <form id="loginForm">
 <input id="accessCode" placeholder="Код" autocomplete="off" required>
 <button type="submit">Войти</button>
 <div id="loginError" class="error">${esc(message)}</div>
 </form>
 </div>`;
 document.getElementById("loginForm").onsubmit=async e=>{
  e.preventDefault();
  const err=document.getElementById("loginError");
  err.textContent="Проверяем код…";
  try{
   await login(document.getElementById("accessCode").value);
   location.href="room.html";
  }catch(x){
   console.error(x);
   err.textContent=x.message==="INVALID"?"Неверный код.":"Не удалось подключиться к квесту. Обнови страницу.";
  }
 };
}

async function renderRoom(){
 if(!db) bootSupabase();
 profile=saved();
 if(!profile){showLogin();return;}
 let stage=1;
 try{
   const s=await db.from("quest_state").select("*").eq("id","main").single();
   if(!s.error && s.data) stage=s.data.current_stage||1;
 }catch(e){console.error(e)}
 const remote=await db?.from("stage_content").select("title,body").eq("stage",stage).eq("role",profile.participant_id);
 const c=remote?.data?.[0] || fallback[profile.participant_id]?.[stage] || ["Квест","Следуй инструкциям ведущего."];
 document.getElementById("app").innerHTML=`<div class="card">
 <span class="badge">${esc(profile.display_name)}</span>
 <div class="stat">Этап ${stage}</div>
 <h1>${esc(c[0])}</h1>
 <div class="mission">${esc(c[1])}</div>
 </div>`;
}

async function start(){
 bootSupabase();
 profile=saved();
 if(location.pathname.endsWith("room.html")) await renderRoom();
 else if(profile) await renderRoom();
 else showLogin();
}
window.addEventListener("error",e=>console.error("Quest error:",e.error||e.message));
start().catch(e=>{console.error(e);showLogin("Не удалось загрузить квест. Обнови страницу.");});
