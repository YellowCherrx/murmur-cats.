/* Облачное сохранение прогресса (Supabase). Публичный ключ можно хранить в коде. */
(function(){
var URL_="https://njrfjmfeewnabketacjy.supabase.co",KEY="sb_publishable_c-ZeiFc_dRSD3Mldxv365w_NPqBWWSu";
var LS="murmur_progress",C={user:null,data:{},cbs:[],status:"",admin:false},sb=null,timer=null,lastUid=null;
try{sb=window.supabase.createClient(URL_,KEY)}catch(e){}
try{C.data=JSON.parse(localStorage.getItem(LS))||{}}catch(e){}
function merge(a,b){
  var r={},k;a=a||{};b=b||{};
  for(k in a)r[k]=a[k];
  for(k in b){
    if(typeof r[k]==="number"&&typeof b[k]==="number")r[k]=Math.max(r[k],b[k]);
    else if(r[k]===undefined||r[k]===null)r[k]=b[k];
  }
  return r;
}
function emit(){C.cbs.forEach(function(f){try{f()}catch(e){}})}
C.onChange=function(f){C.cbs.push(f)};
function push(){
  sb.from("progress").upsert({user_id:C.user.id,data:C.data,updated_at:new Date().toISOString()}).then(function(r){
    C.status=r.error?"Не удалось сохранить в облако":"Сохранено ☁️";emit();
  });
}
C.save=function(now){
  try{localStorage.setItem(LS,JSON.stringify(C.data))}catch(e){}
  if(!sb||!C.user)return;
  clearTimeout(timer);timer=setTimeout(push,now?0:1500);
};
function pull(){
  sb.from("progress").select("data").maybeSingle().then(function(r){
    if(r.error)return;
    C.data=merge(C.data,r.data&&r.data.data);C.save(true);emit();if(C.syncPets)C.syncPets();
  });
}
function checkAdmin(){
  sb.from("admins").select("user_id").maybeSingle().then(function(r){C.admin=!!(r&&r.data);emit()});
}
function setUser(u){
  C.user=u||null;
  if(C.user&&sb){pull();checkAdmin()}else C.admin=false;
  emit();
}
if(sb){
  sb.auth.getSession().then(function(r){setUser(r.data&&r.data.session&&r.data.session.user)});
  sb.auth.onAuthStateChange(function(ev,s){setUser(s&&s.user)});
}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function ensureCss(){
  if(!document.getElementById("cl-css")){
    var st=document.createElement("style");st.id="cl-css";
    st.textContent=".cl-ov{position:fixed;inset:0;background:rgba(29,27,58,.45);display:grid;place-items:center;padding:20px;z-index:50;font-family:Fredoka,system-ui,sans-serif}"+
    ".cl-p{position:relative;background:#fff;color:#1d1b3a;border-radius:24px;padding:22px;width:min(380px,100%);display:grid;gap:10px}"+
    ".cl-p h2{margin:0}.cl-p p{margin:0;color:#6b6890}"+
    ".cl-x{position:absolute;right:12px;top:12px;width:36px;height:36px;border:0;border-radius:50%;background:#f6f1fd;cursor:pointer;font-size:1rem}"+
    ".cl-b{font:inherit;font-weight:500;border:0;border-radius:999px;padding:12px 18px;background:#ff8fb1;color:#1d1b3a;cursor:pointer}"+
    ".cl-g{background:#f6f1fd}.cl-i{font:inherit;padding:12px 14px;border:2px solid #ece7f7;border-radius:14px}.cl-m{min-height:1.3em}"+
    ".cl-l{max-height:46vh;overflow:auto;display:grid;gap:2px;margin:0;padding:0;list-style:none}.cl-r{display:grid;grid-template-columns:2.4rem 1fr auto;gap:8px;padding:6px 8px;border-radius:12px;color:#1d1b3a}.cl-r.me{background:#f6f1fd;font-weight:700}.cl-t{display:grid;grid-template-columns:1fr 1fr;gap:8px}";
    document.head.appendChild(st);
  }
}
C.nick=function(){
  if(!C.data.name){C.data.name="Котик "+(100+Math.floor(Math.random()*900));C.save()}
  return C.data.name;
};
C.submitScore=function(score,level){
  if(!sb||!C.user||!(score>0))return Promise.resolve();
  return Promise.resolve(sb.rpc("submit_score",{p_name:C.nick(),p_score:Math.floor(score),p_level:level||1})).then(function(r){
    if(r&&r.error){C.status="Не удалось отправить в рейтинг";emit()}
  });
};
var pt=null;
C.submitPets=function(){
  if(!sb||!C.user||!(C.data.pets>0))return Promise.resolve();
  return Promise.resolve(sb.rpc("submit_pets",{p_name:C.nick(),p_pets:Math.floor(C.data.pets)})).then(function(r){
    if(r&&r.error){C.status="Не удалось отправить в рейтинг";emit()}
  });
};
C.syncPets=function(now){clearTimeout(pt);pt=setTimeout(function(){C.submitPets()},now?0:6000)};
C.openBoard=function(kind){
  ensureCss();
  var m=document.createElement("div");m.className="cl-ov";document.body.appendChild(m);
  var k=kind==="pets"?"pets":"fish",rows=null,rank=null,req=0;
  var F={
    fish:{col:"user_id,name,score,level",key:"score",my:function(){return C.data.fishBest||0},
      line:function(r){return esc(r.name)+" · ур. "+(r.level||1)},val:function(r){return r.score}},
    pets:{col:"user_id,name,pets",key:"pets",my:function(){return C.data.pets||0},
      line:function(r){return esc(r.name)},val:function(r){return r.pets.toLocaleString("ru-RU")+" 💗"}}
  };
  function close(){m.remove()}
  function render(msg){
    var u=C.user,me=u&&u.id,f=F[k];
    m.innerHTML='<div class="cl-p" role="dialog" aria-modal="true" aria-label="Рейтинг"><button class="cl-x" data-a="close" aria-label="Закрыть">✕</button><h2>🏆 Рейтинг</h2>'+
      '<div class="cl-t"><button class="cl-b'+(k==="fish"?'':' cl-g')+'" data-a="tab" data-k="fish">🐟 Рыбки</button><button class="cl-b'+(k==="pets"?'':' cl-g')+'" data-a="tab" data-k="pets">💗 Ласковые</button></div>'+
      (rows===null?'<p>Загружаю…</p>':rows.length?'<ol class="cl-l">'+rows.map(function(r,i){return '<li class="cl-r'+(r.user_id===me?' me':'')+'"><span>#'+(i+1)+'</span><span>'+f.line(r)+'</span><span>'+f.val(r)+'</span></li>'}).join("")+'</ol>':'<p>Пока никого нет. Стань первым!</p>')+
      (u?'<p>Твой результат: '+f.my().toLocaleString("ru-RU")+(rank?' · место '+rank:'')+'</p><input class="cl-i" maxlength="16" value="'+esc(C.nick())+'" aria-label="Ник"><button class="cl-b cl-g" data-a="nick">Сменить ник</button>':
         '<p>Чтобы попасть в рейтинг, нужен аккаунт.</p><button class="cl-b" data-a="join">Войти как гость и попасть в рейтинг</button>')+
      '<p class="cl-m" aria-live="polite">'+esc(msg||"")+'</p></div>';
  }
  function load(msg){
    if(!sb){rows=[];render("Рейтинг сейчас недоступен");return}
    var my=++req,f=F[k];rows=null;rank=null;render();
    var go=(k==="pets"&&C.user)?C.submitPets():Promise.resolve();
    go.then(function(){
      return sb.from("leaderboard").select(f.col).gt(f.key,0).order(f.key,{ascending:false}).limit(20);
    }).then(function(r){
      if(my!==req)return;
      rows=r.error?[]:r.data;render(r.error?"Не получилось загрузить рейтинг":msg);
      var mine=f.my();
      if(C.user&&mine>0)sb.from("leaderboard").select("user_id",{count:"exact",head:true}).gt(f.key,mine).then(function(x){
        if(my===req&&!x.error&&x.count!==null){rank=x.count+1;render(msg)}
      });
    });
  }
  function sendAll(){return Promise.all([C.submitScore(C.data.fishBest||0,C.data.fishLevel||1),C.submitPets()])}
  m.addEventListener("click",function(e){
    if(e.target===m){close();return}
    var b=e.target.closest("[data-a]");if(!b)return;var a=b.dataset.a;
    if(a==="close")close();
    else if(a==="tab"){k=b.dataset.k;load("")}
    else if(a==="nick"){
      var v=m.querySelector("input").value.trim().slice(0,16);
      if(!v){render("Впиши ник");return}
      C.data.name=v;C.save(true);
      sendAll().then(function(){load("Ник сохранён")});
    }else if(a==="join"){
      sb.auth.signInAnonymously().then(function(r){
        if(r.error){render("Ошибка: "+r.error.message);return}
        C.user=r.data.user;
        return sendAll().then(function(){load("Ты в рейтинге!")});
      });
    }
  });
  document.addEventListener("keydown",function kk(e){if(!m.isConnected){document.removeEventListener("keydown",kk);return}if(e.key==="Escape")close()});
  load("");
};
C.openLogin=function(){
  ensureCss();
  var m=document.createElement("div");m.className="cl-ov";document.body.appendChild(m);
  function close(){m.remove()}
  function render(msg){
    var u=C.user,an=u&&u.is_anonymous;lastUid=u&&u.id;
    m.innerHTML='<div class="cl-p" role="dialog" aria-modal="true" aria-label="Аккаунт"><button class="cl-x" data-a="close" aria-label="Закрыть">✕</button><h2>Аккаунт</h2>'+
      (!sb?'<p>Вход пока недоступен.</p>':
       (u?'<p>'+(an?'Ты играешь как гость. Прогресс хранится на этом устройстве и в облаке. Привяжи почту, чтобы не потерять его.':'Ты вошёл: <b>'+esc(u.email||"")+'</b>')+'</p>':'<p>Войди, чтобы прогресс сохранялся и не терялся.</p>')+
       (!u?'<button class="cl-b" data-a="guest">Играть как гость</button>':'')+
       (!u||an?'<input class="cl-i" type="email" placeholder="твоя почта" autocomplete="email"><button class="cl-b" data-a="mail">'+(an?'Привязать почту':'Войти по ссылке из письма')+'</button>':'')+
       (u?'<button class="cl-b cl-g" data-a="out">Выйти</button>':''))+
      '<p class="cl-m" aria-live="polite">'+esc(msg||C.status||"")+'</p></div>';
  }
  m.addEventListener("click",function(e){
    if(e.target===m){close();return}
    var b=e.target.closest("[data-a]");if(!b)return;var a=b.dataset.a;
    if(a==="close")close();
    else if(a==="guest")sb.auth.signInAnonymously().then(function(r){render(r.error?"Не получилось: "+r.error.message:"Готово! Ты в игре.")});
    else if(a==="out")sb.auth.signOut().then(function(){render("Ты вышел")});
    else if(a==="mail"){
      var em=m.querySelector("input").value.trim();
      if(!em){render("Впиши почту");return}
      var to=location.origin+location.pathname,p=C.user&&C.user.is_anonymous?sb.auth.updateUser({email:em},{emailRedirectTo:to}):sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:to}});
      p.then(function(r){render(r.error?"Ошибка: "+r.error.message:"Письмо отправлено. Открой ссылку из него.")});
    }
  });
  document.addEventListener("keydown",function k(e){if(!m.isConnected){document.removeEventListener("keydown",k);return}if(e.key==="Escape")close()});
  C.onChange(function(){if(m.isConnected&&(C.user&&C.user.id)!==lastUid)render()});
  render();
};
window.Cloud=C;
})();
