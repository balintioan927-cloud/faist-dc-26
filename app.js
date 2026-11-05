const STORE = 'faist_dc26_demo_v1';
const demoUsers = [
  {id:'u1',name:'Alex Marin',username:'alexmarin',email:'alex@faist.demo',password:'demo12345',bio:'Fotografie, muzică și momente reale.',initial:'A'},
  {id:'u2',name:'Mara D.',username:'mara.d',email:'mara@faist.demo',password:'demo12345',bio:'Îmi place să surprind lumea în imagini.',initial:'M'},
  {id:'u3',name:'David G.',username:'davidg',email:'david@faist.demo',password:'demo12345',bio:'Create. Share. Repeat.',initial:'D'}
];
const starterPosts = [
  {id:'p1',userId:'u2',caption:'Uneori, liniștea spune tot. 🌌',image:'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=85',visibility:'public',createdAt:Date.now()-3600000,likes:['u1'],comments:[{id:'c1',userId:'u1',text:'Cadru superb!'}]},
  {id:'p2',userId:'u3',caption:'Noaptea are propriile culori.',image:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&q=85',visibility:'public',createdAt:Date.now()-7200000,likes:[],comments:[]}
];
let state = loadState();
let currentUser = null;
let currentPage = 'home';
let commentPostId = null;
let selectedImageData = null;
let activeChatUser = 'u2';

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if(saved) return {...saved, users:[...demoUsers,...(saved.users||[]).filter(u=>!demoUsers.some(d=>d.id===u.id))]};
  } catch(e){}
  return {users:demoUsers,posts:starterPosts,messages:[]};
}
function persist(){localStorage.setItem(STORE,JSON.stringify(state));}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function userById(id){return state.users.find(u=>u.id===id)||{name:'Utilizator',username:'user',initial:'U'};}
function avatar(user,size=''){return `<div class="avatar ${size}" aria-label="${esc(user.name)}">${esc(user.initial||user.name?.[0]||'U')}</div>`;}
function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2400);}
function render(){
  const app=document.getElementById('app');
  if(!currentUser){renderAuth();return;}
  app.innerHTML=`<div class="app-shell">
    <header class="topbar"><div class="topbrand">FAIST <span>DC 26</span></div><div class="row">${avatar(currentUser)}<span class="small muted">${esc(currentUser.name)}</span></div></header>
    <main class="content" id="content">${pageContent()}</main>
    <nav class="bottom-nav">
      ${nav('home','⌂','Acasă')}${nav('create','＋','Postează')}${nav('messages','✉','Mesaje')}${nav('profile','●','Profil')}
    </nav>
  </div>`;
  bindPage();
}
function nav(id,icon,label){return `<button class="nav-btn ${currentPage===id?'active':''}" data-page="${id}"><b>${icon}</b>${label}</button>`;}
function renderAuth(){
  document.getElementById('app').innerHTML=`<div class="auth-wrap"><section class="auth-card">
    <div class="brand-small">FAIST <span>DC 26</span></div><p class="muted center">Your social world</p>
    <div class="segmented"><button class="selected" data-auth="login">Autentificare</button><button data-auth="register">Creează cont</button></div>
    <div id="auth-fields"></div>
    <p class="muted center small">DEMO LOCAL · Datele rămân în acest browser</p>
  </section></div>`;
  document.querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>showAuth(b.dataset.auth));
  showAuth('login');
}
function showAuth(mode){
  document.querySelectorAll('[data-auth]').forEach(b=>b.classList.toggle('selected',b.dataset.auth===mode));
  const box=document.getElementById('auth-fields');
  if(mode==='login'){
    box.innerHTML=`<input id="email" class="field" type="email" placeholder="Email" value="alex@faist.demo"/><input id="password" class="field" type="password" placeholder="Parolă" value="demo12345"/><button id="login" class="primary wide">Intră în cont</button><button id="demo" class="secondary wide">Intră ca vizitator demo</button><p class="muted small center">Cont demo: alex@faist.demo · demo12345</p>`;
    document.getElementById('login').onclick=login;
    document.getElementById('demo').onclick=()=>{currentUser=userById('u1');currentPage='home';render();};
  } else {
    box.innerHTML=`<input id="name" class="field" placeholder="Numele tău"/><input id="username" class="field" placeholder="Username"/><input id="email" class="field" type="email" placeholder="Email"/><input id="password" class="field" type="password" placeholder="Parolă (minim 8 caractere)"/><button id="register" class="primary wide">Creează cont</button><p class="muted small center">Contul este demonstrativ și se salvează doar pe acest dispozitiv.</p>`;
    document.getElementById('register').onclick=register;
  }
}
function login(){
  const email=document.getElementById('email').value.trim().toLowerCase(), password=document.getElementById('password').value;
  const user=state.users.find(u=>u.email.toLowerCase()===email&&u.password===password);
  if(!user)return toast('Email sau parolă incorectă.');
  currentUser=user;currentPage='home';render();
}
function register(){
  const name=document.getElementById('name').value.trim(),username=document.getElementById('username').value.trim().toLowerCase(),email=document.getElementById('email').value.trim().toLowerCase(),password=document.getElementById('password').value;
  if(!name||!username||!email||!password)return toast('Completează toate câmpurile.');
  if(password.length<8)return toast('Parola trebuie să aibă minimum 8 caractere.');
  if(!/^[a-z0-9_]{3,24}$/.test(username))return toast('Username: 3–24 litere, cifre sau underscore.');
  if(state.users.some(u=>u.email.toLowerCase()===email||u.username===username))return toast('Emailul sau username-ul există deja.');
  const user={id:'u'+Date.now(),name,username,email,password,bio:'',initial:name[0].toUpperCase()};
  state.users.push(user);persist();currentUser=user;currentPage='home';render();toast('Cont demo creat!');
}
function pageContent(){
  if(currentPage==='home')return homePage();
  if(currentPage==='create')return createPage();
  if(currentPage==='messages')return messagesPage();
  if(currentPage==='profile')return profilePage();
  if(currentPage==='comments')return commentsPage();
  return homePage();
}
function homePage(){
  const posts=state.posts.filter(p=>p.visibility==='public'||p.userId===currentUser.id||p.visibility==='followers');
  return `<div class="welcome"><h1>Bine ai venit, ${esc(currentUser.name.split(' ')[0])} 👋</h1><div class="muted">Descoperă ce distribuie comunitatea FAIST.</div></div>
  <div class="card"><div class="row"><div style="flex:1"><strong>Ai o fotografie de împărtășit?</strong><div class="muted small">Publică un moment nou.</div></div><button class="primary" data-goto="create">＋ Postează</button></div></div>
  ${posts.sort((a,b)=>b.createdAt-a.createdAt).map(postCard).join('')||'<div class="empty">Nu există postări încă.</div>'}`;
}
function postCard(p){
  const u=userById(p.userId), liked=p.likes.includes(currentUser.id);
  return `<article class="card"><div class="post-head">${avatar(u)}<div><div class="post-name">${esc(u.name)}</div><div class="post-date">@${esc(u.username)} · ${new Date(p.createdAt).toLocaleString('ro-RO')}</div></div></div>
    <img class="post-image" src="${esc(p.image)}" alt="Fotografie publicată" onerror="this.style.display='none'"/>
    ${p.caption?`<div class="post-caption">${esc(p.caption)}</div>`:''}
    <div class="actions"><button class="action ${liked?'confirmed':''}" data-like="${p.id}">${liked?'✓ Confirmat':'♡ Confirmă'} · ${p.likes.length}</button><button class="action" data-comments="${p.id}">Comentarii · ${p.comments.length}</button><span class="muted small right">${p.visibility==='private'?'Privat':p.visibility==='followers'?'Urmăritori':'Public'}</span></div>
  </article>`;
}
function createPage(){
  return `<h1>Publică o fotografie</h1><p class="muted">Împărtășește un moment cu comunitatea.</p>
  <section class="card"><button class="secondary wide" id="choose-photo">▧ Alege fotografie din dispozitiv</button><img id="preview" class="photo-preview" style="display:${selectedImageData?'block':'none'}" src="${selectedImageData||''}"/>
  <textarea id="caption" class="field" rows="3" placeholder="Scrie o descriere..."></textarea>
  <strong>Cine poate vedea fotografia?</strong><div class="segmented"><button class="selected" data-vis="public">Public</button><button data-vis="followers">Urmăritori</button><button data-vis="private">Doar eu</button></div>
  <button id="publish" class="primary wide">Publică fotografia</button><p class="muted small">În demo, fotografia și postarea se salvează local în browser.</p></section>`;
}
function messagesPage(){
  const others=state.users.filter(u=>u.id!==currentUser.id);
  return `<h1>Mesaje</h1><p class="muted">Conversații demonstrative între utilizatori.</p>
  <div class="card"><label class="muted small">Alege un utilizator</label><select id="chat-user" class="field">${others.map(u=>`<option value="${u.id}" ${u.id===activeChatUser?'selected':''}>${esc(u.name)} · @${esc(u.username)}</option>`).join('')}</select><div id="chat-thread">${chatThread()}</div><div class="row"><input id="message-text" class="field" placeholder="Scrie un mesaj..."/><button id="send-message" class="primary">Trimite</button></div></div>`;
}
function chatThread(){
  const msgs=state.messages.filter(m=>(m.from===currentUser.id&&m.to===activeChatUser)||(m.from===activeChatUser&&m.to===currentUser.id));
  if(!msgs.length)return '<div class="empty">Începe conversația.</div>';
  return `<div style="max-height:390px;overflow:auto;margin:12px 0">${msgs.map(m=>`<div class="message ${m.from===currentUser.id?'mine':''}">${esc(m.text)}<small>${m.from===currentUser.id?'Tu':esc(userById(m.from).name)} · ${new Date(m.at).toLocaleTimeString('ro-RO',{hour:'2-digit',minute:'2-digit'})}</small></div>`).join('')}</div>`;
}
function profilePage(){
  const mine=state.posts.filter(p=>p.userId===currentUser.id);
  return `<section class="card profile-hero"><div class="profile-avatar">${esc(currentUser.initial)}</div><h2>${esc(currentUser.name)}</h2><div class="muted">@${esc(currentUser.username)}</div><p class="muted">${esc(currentUser.bio||'Adaugă o descriere profilului tău.')}</p><div class="grid-two"><div><strong>${mine.length}</strong><div class="muted small">Postări</div></div><div><strong>${mine.reduce((n,p)=>n+p.likes.length,0)}</strong><div class="muted small">Aprecieri</div></div></div></section>
  <section class="card"><h3>Editează profilul</h3><input id="profile-name" class="field" value="${esc(currentUser.name)}" placeholder="Nume"/><textarea id="profile-bio" class="field" rows="3" placeholder="Descriere">${esc(currentUser.bio||'')}</textarea><button id="save-profile" class="primary wide">Salvează</button></section>
  <section class="card"><h3>Cont</h3><div class="muted small">Acesta este un cont local de demonstrație. Datele nu sunt publicate online.</div><button id="logout" class="danger wide">Deconectare</button></section>
  <h3>Postările mele</h3>${mine.map(postCard).join('')||'<div class="empty">Nu ai publicat încă fotografii.</div>'}`;
}
function commentsPage(){
  const p=state.posts.find(x=>x.id===commentPostId);if(!p)return '<div class="empty">Postarea nu mai există.</div>';
  return `<button class="ghost" data-goto="home">← Înapoi la feed</button><h1>Comentarii</h1><section class="card">${p.comments.map(c=>`<div class="comment"><strong>${esc(userById(c.userId).name)}</strong><p>${esc(c.text)}</p></div>`).join('')||'<div class="empty">Fii primul care comentează.</div>'}<div class="row" style="margin-top:14px"><input id="comment-text" class="field" placeholder="Scrie un comentariu..."/><button id="send-comment" class="primary">Publică</button></div></section>`;
}
function bindPage(){
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{currentPage=b.dataset.page;render();});
  document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>{currentPage=b.dataset.goto;render();});
  document.querySelectorAll('[data-like]').forEach(b=>b.onclick=()=>{const p=state.posts.find(p=>p.id===b.dataset.like);if(p.likes.includes(currentUser.id))p.likes=p.likes.filter(id=>id!==currentUser.id);else p.likes.push(currentUser.id);persist();render();});
  document.querySelectorAll('[data-comments]').forEach(b=>b.onclick=()=>{commentPostId=b.dataset.comments;currentPage='comments';render();});
  if(currentPage==='create'){
    let visibility='public';
    document.getElementById('choose-photo').onclick=()=>document.getElementById('photo-picker').click();
    document.querySelectorAll('[data-vis]').forEach(b=>b.onclick=()=>{visibility=b.dataset.vis;document.querySelectorAll('[data-vis]').forEach(x=>x.classList.toggle('selected',x===b));});
    document.getElementById('publish').onclick=()=>{
      if(!selectedImageData)return toast('Alege mai întâi o fotografie.');
      state.posts.push({id:'p'+Date.now(),userId:currentUser.id,caption:document.getElementById('caption').value.trim(),image:selectedImageData,visibility,createdAt:Date.now(),likes:[],comments:[]});
      persist();selectedImageData=null;currentPage='home';render();toast('Fotografia a fost publicată!');
    };
  }
  if(currentPage==='messages'){
    document.getElementById('chat-user').onchange=e=>{activeChatUser=e.target.value;document.getElementById('chat-thread').innerHTML=chatThread();};
    document.getElementById('send-message').onclick=()=>{const input=document.getElementById('message-text'),text=input.value.trim();if(!text)return;state.messages.push({id:'m'+Date.now(),from:currentUser.id,to:activeChatUser,text,at:Date.now()});persist();render();};
  }
  if(currentPage==='profile'){
    document.getElementById('save-profile').onclick=()=>{currentUser.name=document.getElementById('profile-name').value.trim()||currentUser.name;currentUser.bio=document.getElementById('profile-bio').value.trim();currentUser.initial=currentUser.name[0].toUpperCase();persist();render();toast('Profil salvat!');};
    document.getElementById('logout').onclick=()=>{currentUser=null;render();};
  }
  if(currentPage==='comments'){
    document.getElementById('send-comment').onclick=()=>{const input=document.getElementById('comment-text'),text=input.value.trim();if(!text)return;const p=state.posts.find(p=>p.id===commentPostId);p.comments.push({id:'c'+Date.now(),userId:currentUser.id,text});persist();render();};
  }
}
document.getElementById('photo-picker').addEventListener('change',e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/'))return toast('Alege un fișier imagine.');
  if(file.size>6*1024*1024)return toast('Pentru demo, alege o fotografie sub 6 MB.');
  const reader=new FileReader();reader.onload=()=>{selectedImageData=reader.result;if(currentPage==='create'){const img=document.getElementById('preview');img.src=selectedImageData;img.style.display='block';}};reader.readAsDataURL(file);
});
setTimeout(()=>{render();},950);
