// DC Work — interfață exclusiv demonstrativă; datele rămân pe acest dispozitiv.
document.body.classList.add('auth-locked');
document.body.insertAdjacentHTML('afterbegin', `
<section id="authGate" class="auth-gate">
 <div class="auth-card">
  <div class="auth-brand">DC <span>Work</span></div>
  <p class="auth-tagline">Conectează-te cu comunitatea ta.</p>
  <div class="auth-switch"><button type="button" class="selected" data-auth="login">Autentificare</button><button type="button" data-auth="register">Creează cont</button></div>
  <form id="loginForm" class="auth-form">
   <h2>Bine ai revenit!</h2>
   <label>Email sau nume de utilizator<input type="text" autocomplete="username" placeholder="Email sau utilizator" required></label>
   <label>Parolă demo<input type="password" autocomplete="current-password" placeholder="Introdu orice parolă demo" required></label>
   <button class="auth-primary" type="submit">Intră în DC Work</button>
   <button class="auth-link" id="forgotPassword" type="button">Ai uitat parola?</button>
  </form>
  <form id="registerForm" class="auth-form" hidden>
   <h2>Creează profil demo</h2>
   <label>Numele complet<input type="text" autocomplete="name" placeholder="Numele tău" required></label>
   <label>Nume de utilizator<input type="text" autocomplete="username" placeholder="ex. nume_utilizator" required></label>
   <label>Adresă de email<input type="email" autocomplete="email" placeholder="nume@email.com" required></label>
   <label>Vârsta<input type="number" min="1" max="100" inputmode="numeric" placeholder="Vârsta" required></label>
   <label>Gen<select required><option value="">Selectează genul</option><option value="Femeie">Femeie</option><option value="Bărbat">Bărbat</option></select></label>
   <label>Departament<select required><option value="">Selectează departamentul</option><option>Admin</option><option>Inginer DC</option><option>Tehnician DC</option><option>Operator DC</option><option>Shift Leader</option><option>Quality DC</option><option>Mentenanță</option><option>Electrician</option></select></label>
   <label>Parolă demo<input type="password" autocomplete="new-password" minlength="4" placeholder="Minimum 4 caractere" required></label>
   <button class="auth-primary" type="submit">Creează profilul demo</button>
   <p class="auth-note">Profilul se salvează doar în memoria locală a acestui browser. Nu este un cont real.</p>
  </form>
  <div id="resetPanel" hidden><h2>Ai uitat parola?</h2><p class="auth-note">În modul demo nu există resetare de parolă. Creează un profil demo nou sau intră ca vizitator.</p><button id="backLogin" class="auth-link" type="button">Înapoi la autentificare</button></div>
  <div class="auth-divider"><span>sau</span></div>
  <button id="demoEnter" class="auth-demo" type="button">Intră ca vizitator (demo)</button>
  <p class="auth-foot">DC Work este în modul DEMO. Nu se creează conturi reale și nu se transmit date către un server.</p>
 </div>
</section>`);
const gate=document.querySelector('#authGate');
const getAccounts=()=>{try{return JSON.parse(localStorage.getItem('dcDemoAccounts')||'[]')}catch{return []}};
const enterDemo=(account)=>{if(account){localStorage.setItem('dcName',account.name);localStorage.setItem('dcBio','Bun venit pe profilul meu DC Work!');localStorage.setItem('dcDemoUser',account.username);localStorage.setItem('dcAge',String(account.age||''));localStorage.setItem('dcGender',account.gender||'');localStorage.setItem('dcDepartment',account.department||'')}localStorage.setItem('dcDemoSession','1');gate.remove();document.body.classList.remove('auth-locked')};
document.querySelectorAll('[data-auth]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-auth]').forEach(x=>x.classList.toggle('selected',x===btn));document.querySelector('#loginForm').hidden=btn.dataset.auth!=='login';document.querySelector('#registerForm').hidden=btn.dataset.auth!=='register';document.querySelector('#resetPanel').hidden=true}));
document.querySelector('#loginForm').addEventListener('submit',e=>{e.preventDefault();const [identifier]=[...e.currentTarget.querySelectorAll('input')].map(x=>x.value.trim());const account=getAccounts().find(a=>a.email.toLowerCase()===identifier.toLowerCase()||a.username.toLowerCase()===identifier.toLowerCase());if(!account){alert('Nu am găsit acest profil demo pe acest dispozitiv. Creează un profil sau intră ca vizitator.');return}enterDemo(account)});
document.querySelector('#registerForm').addEventListener('submit',e=>{e.preventDefault();const v=[...e.currentTarget.querySelectorAll('input,select')].map(x=>x.value.trim());const [name,username,email,age,gender,department]=v;const accounts=getAccounts();if(accounts.some(a=>a.email.toLowerCase()===email.toLowerCase()||a.username.toLowerCase()===username.toLowerCase())){alert('Există deja un profil demo cu acest email sau nume de utilizator.');return}const account={name,username,email,age:Number(age),gender,department};accounts.push(account);localStorage.setItem('dcDemoAccounts',JSON.stringify(accounts));enterDemo(account)});
document.querySelector('#forgotPassword').onclick=()=>{document.querySelector('#loginForm').hidden=true;document.querySelector('#registerForm').hidden=true;document.querySelector('#resetPanel').hidden=false};
document.querySelector('#backLogin').onclick=()=>{document.querySelector('#resetPanel').hidden=true;document.querySelector('#loginForm').hidden=false;document.querySelectorAll('[data-auth]').forEach(x=>x.classList.toggle('selected',x.dataset.auth==='login'))};
document.querySelector('#demoEnter').onclick=()=>enterDemo(null);
if(localStorage.getItem('dcDemoSession')==='1'){gate.remove();document.body.classList.remove('auth-locked')}
const feed=document.querySelector('#feed');let chosen=null;let active='home';let profileName=localStorage.getItem('dcName')||'tu';let profileBio=localStorage.getItem('dcBio')||'Bun venit pe profilul meu DC Work!';
const samples=[
 {user:'andreea.m',initial:'AM',text:'Bun venit pe DC Work! ✨ Locul unde împărtășim momente și idei.',likes:128,color:'linear-gradient(135deg,#f9d5e5,#d8d7ff)',comments:[{user:'vlad.life',text:'Super! 💜'}]},
 {user:'vlad.life',initial:'VL',text:'O zi bună începe cu energie pozitivă. 💜',likes:86,color:'linear-gradient(135deg,#d5f5e3,#d7e7ff)',comments:[{user:'andreea.m',text:'Așa este!'}]}
];
const demoStories=[
 {user:'andreea.m',initial:'AM',text:'Bună dimineața! ☀️',bg:'linear-gradient(145deg,#ff9a9e,#fad0c4,#fbc2eb)'},
 {user:'vlad.life',initial:'VL',text:'Keep going. ✨',bg:'linear-gradient(145deg,#667eea,#764ba2,#b06ab3)'},
 {user:'ioana.o',initial:'IO',text:'Little moments, big memories 💗',bg:'linear-gradient(145deg,#f6d365,#fda085,#fbc2eb)'},
 {user:'marius.r',initial:'MR',text:'Weekend mood 🌴',bg:'linear-gradient(145deg,#43cea2,#185a9d)'}
];
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function card(p){
 const el=document.createElement('article');el.className='post';
 const comments=(p.comments||[]).map(c=>'<p class="comment-line"><b>'+safe(c.user)+'</b> '+safe(c.text)+'</p>').join('');
 el.innerHTML='<div class="posthead"><div class="avatar">'+safe(p.initial)+'</div><div class="username">'+safe(p.user)+'</div><span class="dots">···</span></div>'+(p.image?'<img class="postimg" src="'+p.image+'">':'<div class="placeholder" style="background:'+p.color+'">DC WORK</div>')+'<div class="actions"><button class="like" aria-label="Stea">☆</button><button class="comment" aria-label="Comentarii">▢</button><button class="share">➤</button><button style="margin-left:auto">♧</button></div><div class="likes"><b>'+p.likes+' stele</b></div><div class="caption"><b>'+safe(p.user)+'</b> '+safe(p.text)+'</div><div class="comments-area"><div class="comment-list">'+comments+'</div><form class="comment-form"><input type="text" maxlength="180" placeholder="Adaugă un comentariu..." aria-label="Comentariu"><button type="submit">Publică</button></form></div>';
 el.querySelector('.like').onclick=e=>{const btn=e.currentTarget;btn.classList.toggle('liked');btn.textContent=btn.classList.contains('liked')?'★':'☆';const n=el.querySelector('.likes b');let v=Number(n.textContent.split(' ')[0]);n.textContent=(v+(btn.classList.contains('liked')?1:-1))+' stele'};
 el.querySelector('.comment').onclick=()=>el.querySelector('.comment-form input').focus();
 el.querySelector('.comment-form').onsubmit=e=>{e.preventDefault();const input=e.currentTarget.querySelector('input');const value=input.value.trim();if(!value)return;const line=document.createElement('p');line.className='comment-line';const who=document.createElement('b');who.textContent=localStorage.getItem('dcDemoUser')||profileName;line.append(who,document.createTextNode(' '+value));el.querySelector('.comment-list').append(line);input.value=''};
 el.querySelector('.share').onclick=()=>navigator.share?navigator.share({title:'DC Work',text:p.text}):alert('Distribuire: '+p.text);
 feed.append(el)
}
function openStory(index){
 const old=document.querySelector('.story-viewer');if(old)old.remove();
 let current=index;
 const overlay=document.createElement('div');overlay.className='story-viewer';overlay.innerHTML='<div class="story-viewer-card"><button class="story-close" aria-label="Închide">×</button><div class="story-progress"><span></span></div><div class="story-user"></div><div class="story-content"></div><button class="story-prev" aria-label="Povestea anterioară">‹</button><button class="story-next" aria-label="Povestea următoare">›</button></div>';
 document.body.append(overlay);
 const render=()=>{const story=demoStories[current];overlay.querySelector('.story-viewer-card').style.background=story.bg;overlay.querySelector('.story-user').textContent=story.initial+'  '+story.user;overlay.querySelector('.story-content').textContent=story.text;overlay.querySelector('.story-progress span').style.width=((current+1)/demoStories.length*100)+'%'};
 const close=()=>overlay.remove();overlay.querySelector('.story-close').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};overlay.querySelector('.story-prev').onclick=()=>{current=(current-1+demoStories.length)%demoStories.length;render()};overlay.querySelector('.story-next').onclick=()=>{current=(current+1)%demoStories.length;render()};render()
}
samples.forEach(card);
function showProfile(){document.querySelector('.stories').hidden=true;document.querySelector('.composer').hidden=true;feed.innerHTML='<section class="profile"><div class="profile-head"><div class="profile-avatar">TU</div><div class="profile-numbers"><div><b>'+feed.querySelectorAll('.post').length+'</b><small>postări</small></div><div><b>0</b><small>urmăritori</small></div><div><b>0</b><small>urmărești</small></div></div></div><h2 id="profileName">'+profileName+'</h2><p id="profileBio">'+profileBio+'</p><div class="profile-buttons"><button id="editProfile">Editează profilul</button><button id="shareProfile">Distribuie profilul</button></div><div class="profile-tabs"><b>▦ Postări</b><span>▤ Salvate</span><span>♡ Aprecieri</span></div><div class="profile-empty">Fotografiile și postările tale vor apărea aici.</div></section>';document.querySelector('#editProfile').onclick=()=>{let n=prompt('Numele profilului:',profileName);if(n!==null&&n.trim()){profileName=n.trim();localStorage.setItem('dcName',profileName)}let b=prompt('Descriere:',profileBio);if(b!==null){profileBio=b;localStorage.setItem('dcBio',profileBio)}showProfile()};document.querySelector('#shareProfile').onclick=()=>{let url=location.href;if(navigator.share)navigator.share({title:'Profil DC Work',url});else if(navigator.clipboard)navigator.clipboard.writeText(url).then(()=>alert('Link copiat!'));else alert(url)}}function showHome(){document.querySelector('.stories').hidden=false;document.querySelector('.composer').hidden=false;feed.innerHTML='';samples.forEach(card);active='home'}function showSection(name){active=name;document.querySelector('.stories').hidden=true;document.querySelector('.composer').hidden=true;if(name==='profile'){showProfile();return}if(name==='home'){showHome();return}if(name==='search'){feed.innerHTML='<section class="simple-screen"><h2>Caută</h2><input id="searchUsers" placeholder="Caută persoane și postări"><p>Descoperă comunitatea DC Work.</p></section>';document.querySelector('#searchUsers').oninput=e=>{let q=e.target.value.toLowerCase();feed.querySelector('.search-results')?.remove();let box=document.createElement('div');box.className='search-results';samples.filter(p=>(p.user+' '+p.text).toLowerCase().includes(q)).forEach(p=>{let row=document.createElement('p');row.textContent=p.user+' — '+p.text;box.append(row)});feed.append(box)};return}if(name==='reels'){feed.innerHTML='<section class="simple-screen"><h2>Reels</h2><div class="reel-placeholder">▶<br>Clipurile video vor apărea aici</div><p>În curând vei putea derula videoclipuri verticale.</p></section>';return}}document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');showSection(b.dataset.tab)});document.querySelector('#photo').onchange=e=>{let f=e.target.files[0];if(f)chosen=URL.createObjectURL(f)};document.querySelector('#publish').onclick=()=>{let text=document.querySelector('#caption').value.trim();if(!text&&!chosen)return alert('Adaugă un text sau o fotografie.');let p={user:profileName,initial:profileName.slice(0,2).toUpperCase(),text,likes:0,image:chosen,color:'#eee'};let old=[...feed.children];feed.innerHTML='';card(p);old.forEach(x=>feed.append(x));document.querySelector('#caption').value='';document.querySelector('#photo').value='';chosen=null};document.querySelector('#addPost').onclick=()=>{document.querySelector('[data-tab="home"]').click();document.querySelector('#caption').focus()};document.querySelector('#inbox').onclick=()=>alert('Mesajele private vor fi activate după conectarea bazei de date.');document.querySelectorAll('.story').forEach((s,i)=>s.onclick=()=>{if(i===0){openStory(0)}else{openStory(Math.min(i-1,demoStories.length-1))}});