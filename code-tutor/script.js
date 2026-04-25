// ============================================
// NEXUSVAULT BREACH PROTOCOL — GAME ENGINE
// ============================================

// --- QUIZ DATA ---
const concepts = [
  {q:"Which Clerk hook gets the current user object?",a:"useUser",opts:["useState","useUser","useAuth","useClerk"],
   info:"NexusVault uses Clerk's React hooks for authentication.",hint:"Starts with 'use', ends with 'User'."},
  {q:"Which React hook triggers the API fetch for repos?",a:"useEffect",opts:["useMemo","useCallback","useEffect","useReducer"],
   info:"Data fetching happens inside a side-effect hook when the user identifier changes.",hint:"It handles 'side effects'."},
  {q:"What state setter toggles the mobile Command Panel?",a:"setIsMobilePanelOpen",opts:["setMenuOpen","setIsMobilePanelOpen","togglePanel","setMobileView"],
   info:"The Home page has a mobile 'Command Panel' button that controls a boolean state.",hint:"Setter for 'isMobilePanelOpen'."},
  {q:"Which icon library provides <History/> and <Plus/>?",a:"lucide-react",opts:["heroicons","lucide-react","fontawesome","feather"],
   info:"NexusVault uses icon components with an 'institutional' thick-border design.",hint:"Starts with 'L'."},
  {q:"What component renders when the user is NOT logged in?",a:"HeroSection",opts:["LoginForm","HeroSection","Dashboard","LandingPage"],
   info:"If !user is true, a public landing page is shown starting with a flashy hero.",hint:"The 'heroic' section."},
  {q:"Which routing library powers client-side navigation?",a:"react-router-dom",opts:["next/router","react-router-dom","wouter","tanstack-router"],
   info:"NexusVault navigates between Home, Profile, and Repository without page reloads.",hint:"Provides <Link> and <Route>."},
  {q:"Which Node.js framework powers the backend API?",a:"Express",opts:["Fastify","Express","Koa","Hono"],
   info:"The backend in src/server/ handles API requests, routing, and middleware.",hint:"Starts with 'E'."},
  {q:"Which file handles data validation and sanitization?",a:"validation.ts",opts:["security.ts","middleware.ts","validation.ts","utils.ts"],
   info:"Custom logic protects against rate-limiting and unauthorized access.",hint:"Contains readUsername and readRepoName."},
  {q:"What is the largest React page component file?",a:"Repository.tsx",opts:["Home.tsx","Profile.tsx","Repository.tsx","Dashboard.tsx"],
   info:"Viewing files, commits, and branches happens in one massive component.",hint:"Named after what it displays."},
  {q:"What does SEO stand for in SEO.tsx?",a:"Search Engine Optimization",opts:["Search Engine Optimization","Server Event Observer","System Entry Operator","Secure External Output"],
   info:"NexusVault manages document metadata dynamically for search engines.",hint:"Search Engine..."},
  {q:"Which state management library is used in src/store/?",a:"Zustand",opts:["Redux","MobX","Zustand","Jotai"],
   info:"Global state is managed outside React Context using a lightweight library.",hint:"German word for 'state'."},
  {q:"What suffix do test files use in the server directory?",a:".test.ts",opts:[".spec.ts",".test.ts",".unit.ts","_test.ts"],
   info:"Integration tests ensure the API and security rules work correctly.",hint:"Includes the word 'test'."},
  {q:"Which ORM is used for database interactions?",a:"Drizzle",opts:["Prisma","Sequelize","Drizzle","TypeORM"],
   info:"NexusVault executes database queries safely without raw SQL.",hint:"Rhymes with 'fizzle'."},
  {q:"Name an authentication provider used in the middleware.",a:"Clerk",opts:["Auth0","Clerk","Firebase","Passport"],
   info:"Two providers handle auth: one starting with C, another with S.",hint:"One is 'Clerk', the other 'Supabase'."},
  {q:"Which schema table stores code change history?",a:"commits",opts:["changes","history","commits","revisions"],
   info:"Repository changes are tracked in a relational database table.",hint:"Plural of 'commit'."},
  {q:"Which JSON file lists all project dependencies?",a:"package.json",opts:["config.json","package.json","deps.json","node.json"],
   info:"Every Node.js project has a manifest file at its root.",hint:"Deals with 'packages'."},
  {q:"What file locks dependency versions for reproducible builds?",a:"package-lock.json",opts:["package-lock.json","versions.json","deps.lock","node-lock.json"],
   info:"It records exact versions to prevent 'works on my machine' bugs.",hint:"It 'locks' the versions."},
  {q:"Where are custom npm commands defined in package.json?",a:"scripts",opts:["commands","scripts","tasks","bin"],
   info:"Commands like 'npm run dev' and 'npm run build' are defined here.",hint:"Actors read from these..."},
  {q:"Which src/ folder contains Navbar and HeroSection?",a:"components",opts:["ui","components","shared","elements"],
   info:"Reusable UI building blocks are organized in a dedicated folder.",hint:"The individual 'components'."},
  {q:"Which src/ folder has Home.tsx and Profile.tsx?",a:"pages",opts:["views","routes","pages","screens"],
   info:"Full-page route views are separated from smaller components.",hint:"The 'pages' of a book."},
  {q:"Which src/ folder contains the Express backend?",a:"server",opts:["api","backend","server","services"],
   info:"Backend Express code is fully isolated from the frontend.",hint:"Acts as the backend 'server'."},
  {q:"Which root folder holds static assets like robots.txt?",a:"public",opts:["static","assets","public","dist"],
   info:"Files here aren't processed by the JS bundler.",hint:"Open to the 'public'."},
  {q:"Which src/ folder has Zustand's auth.ts?",a:"store",opts:["state","store","context","data"],
   info:"Global state management files live in their own directory.",hint:"Where you 'store' data."},
  {q:"Which build tool powers the dev server?",a:"Vite",opts:["Webpack","Vite","Parcel","Rollup"],
   info:"A lightning-fast tool converts React + TypeScript to browser JS.",hint:"French for 'fast'."},
  {q:"Which CSS framework provides utility classes?",a:"Tailwind CSS",opts:["Bootstrap","Tailwind CSS","Bulma","Chakra UI"],
   info:"Styling uses classes like 'flex items-center text-white' directly in HTML.",hint:"Wind at your back."},
  {q:"Which language adds static typing to JavaScript?",a:"TypeScript",opts:["TypeScript","CoffeeScript","Dart","Flow"],
   info:"Files end in .ts and .tsx to enforce strict types.",hint:"The 'typed' version."},
  {q:"Which database engine stores the relational data?",a:"PostgreSQL",opts:["MySQL","PostgreSQL","MongoDB","SQLite"],
   info:"Drizzle ORM translates queries, but the engine underneath stores the data.",hint:"Starts with 'Post'."},
  {q:"What hidden file stores secret API keys locally?",a:".env",opts:[".env",".secrets",".config",".keys"],
   info:"Keys like CLERK_SECRET_KEY are never committed to GitHub.",hint:"Stands for 'environment'."},
  {q:"Which src/ file is the React app entry point?",a:"main.tsx",opts:["index.tsx","app.tsx","main.tsx","root.tsx"],
   info:"ReactDOM.createRoot is called here to mount the app to the DOM.",hint:"The 'main' file."}
];

// --- STATE ---
let level = 0, score = 0, combo = 0, lives = 3, locked = false;

// --- AUDIO (Web Audio API bleeps) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq, dur, type='square') {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.08, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}
function sfxCorrect(){ beep(600,0.1); setTimeout(()=>beep(900,0.15),100); }
function sfxWrong(){ beep(200,0.25,'sawtooth'); }
function sfxBoot(){ beep(400,0.05); }
function sfxCombo(){ beep(1200,0.08); setTimeout(()=>beep(1500,0.1),80); }

// --- MATRIX RAIN ---
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');
let columns, drops;
function initMatrix(){
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const sz = 14; columns = Math.floor(canvas.width/sz);
  drops = Array(columns).fill(1);
}
function drawMatrix(){
  ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#0f0'; ctx.font = '14px monospace';
  const chars = 'ｱｲｳｴｵｶｷｸｹｺ0123456789NEXUSVAULT';
  for(let i=0;i<drops.length;i++){
    const c = chars[Math.floor(Math.random()*chars.length)];
    ctx.fillText(c, i*14, drops[i]*14);
    if(drops[i]*14 > canvas.height && Math.random()>0.975) drops[i]=0;
    drops[i]++;
  }
}
initMatrix();
setInterval(drawMatrix, 45);
window.addEventListener('resize', initMatrix);

// --- DOM REFS ---
const $ = id => document.getElementById(id);
const el = {
  bootScreen:$('boot-screen'), bootBar:$('boot-bar'), bootStatus:$('boot-status'),
  gameScreen:$('game-screen'), nodeMap:$('node-map'),
  terminal:$('terminal'), termTitle:$('terminal-title'),
  termExpl:$('term-explanation'), termQ:$('term-question'), choices:$('choices'),
  hintBtn:$('hint-btn'), hintText:$('hint-text'),
  hudLevel:$('hud-level'), hudScore:$('hud-score'), xpBar:$('xp-bar'), hearts:$('hearts'),
  comboPop:$('combo-popup'),
  // Confirm phase
  confirmPhase:$('confirm-phase'), confirmInput:$('confirm-input'),
  confirmBtn:$('confirm-btn'), confirmFeedback:$('confirm-feedback'),
  modal:$('modal'), modalTitle:$('modal-title'), modalText:$('modal-text'),
  modalScore:$('modal-score'), modalBtn:$('modal-btn')
};

// --- BOOT SEQUENCE ---
const bootMsgs = [
  'Initializing kernel...','Loading NexusVault modules...','Scanning codebase...',
  'Mapping 29 system nodes...','Decrypting firewall keys...','Breach protocol ready.'
];
async function bootSequence(){
  for(let i=0;i<bootMsgs.length;i++){
    el.bootStatus.textContent = bootMsgs[i];
    el.bootBar.style.width = ((i+1)/bootMsgs.length*100)+'%';
    sfxBoot();
    await sleep(400);
  }
  await sleep(300);
  el.bootScreen.classList.remove('active');
  el.gameScreen.classList.add('active');
  startGame();
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

// --- NODE MAP ---
function buildNodeMap(){
  el.nodeMap.innerHTML = '';
  for(let i=0;i<concepts.length;i++){
    const n = document.createElement('div');
    n.className = 'node';
    if(i < level) n.classList.add('hacked');
    else if(i === level) n.classList.add('current');
    el.nodeMap.appendChild(n);
  }
}

// --- TYPEWRITER ---
async function typewrite(element, text, speed=20){
  element.innerHTML = '';
  element.classList.add('typing-cursor');
  for(let i=0;i<text.length;i++){
    element.innerHTML = text.slice(0, i+1);
    if(i % 3 === 0) beep(300+Math.random()*200, 0.02, 'sine');
    await sleep(speed);
  }
  element.classList.remove('typing-cursor');
}

// --- SHUFFLE ---
function shuffle(arr){
  const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
}

// --- LOAD LEVEL ---
async function loadLevel(){
  locked = true;
  const c = concepts[level];
  
  el.termTitle.textContent = `firewall_0x${(level+1).toString(16).padStart(2,'0')}.sys`;
  el.hudLevel.textContent = `NODE ${level+1}/${concepts.length}`;
  el.xpBar.style.width = (level/concepts.length*100)+'%';
  el.hintText.style.display = 'none';
  el.hintText.textContent = c.hint;
  
  // Reset confirm phase
  el.confirmPhase.classList.remove('active');
  el.confirmInput.value = '';
  el.confirmFeedback.textContent = '';
  el.confirmFeedback.className = 'confirm-feedback';
  el.choices.style.display = 'grid';
  
  buildNodeMap();
  updateHearts();

  // Typewriter effect
  await typewrite(el.termExpl, c.info, 18);
  await typewrite(el.termQ, c.q, 22);
  
  // Render choices
  el.choices.innerHTML = '';
  const shuffled = shuffle(c.opts);
  shuffled.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleChoice(btn, opt, c.a));
    el.choices.appendChild(btn);
  });
  
  locked = false;
}

// --- HANDLE CHOICE ---
let currentAnswer = '';
function handleChoice(btn, picked, answer){
  if(locked) return;
  locked = true;
  
  const allBtns = el.choices.querySelectorAll('.choice-btn');
  
  if(picked === answer){
    // PHASE 1 CORRECT — now require typing
    btn.classList.add('correct');
    allBtns.forEach(b => { if(b!==btn) b.classList.add('disabled'); });
    
    sfxCorrect();
    flashScreen('correct');
    spawnParticles(btn);
    
    currentAnswer = answer;
    
    // Show confirm phase after a short delay
    setTimeout(()=>{
      el.choices.style.display = 'none';
      el.confirmPhase.classList.add('active');
      el.confirmInput.focus();
      locked = false;
    }, 800);
    
  } else {
    // WRONG
    btn.classList.add('wrong');
    combo = 0;
    lives--;
    
    sfxWrong();
    flashScreen('wrong');
    updateHearts();
    
    // Glitch the terminal
    el.terminal.classList.add('glitch');
    setTimeout(()=>el.terminal.classList.remove('glitch'), 300);
    
    if(lives <= 0){
      const nodes = el.nodeMap.querySelectorAll('.node');
      if(nodes[level]) nodes[level].classList.add('failed');
      setTimeout(()=>{
        showModal('SYSTEM LOCKOUT',`Breach failed at node ${level+1}. Intrusion detected.`, score);
      }, 800);
    } else {
      // Let them try again
      setTimeout(()=>{ btn.classList.add('disabled'); locked = false; }, 600);
    }
  }
}

// --- HEARTS ---
function updateHearts(){
  const h = el.hearts.querySelectorAll('.h');
  h.forEach((heart, i) => {
    if(i >= lives) heart.classList.add('dead');
    else heart.classList.remove('dead');
  });
}

// --- FX ---
function flashScreen(type){
  const f = document.createElement('div');
  f.className = `screen-flash ${type}`;
  document.body.appendChild(f);
  setTimeout(()=>f.remove(), 250);
}

function spawnParticles(btn){
  const rect = btn.getBoundingClientRect();
  const cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
  const colors = ['#0f0','#0ff','#ff0','#fff'];
  for(let i=0;i<20;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    const sz = Math.random()*6+3;
    const angle = Math.random()*Math.PI*2;
    const dist = Math.random()*120+40;
    p.style.width=sz+'px'; p.style.height=sz+'px';
    p.style.backgroundColor=colors[Math.floor(Math.random()*colors.length)];
    p.style.left=cx+'px'; p.style.top=cy+'px';
    p.style.setProperty('--tx', Math.cos(angle)*dist+'px');
    p.style.setProperty('--ty', Math.sin(angle)*dist+'px');
    p.style.boxShadow = `0 0 6px ${p.style.backgroundColor}`;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(), 700);
  }
}

function showCombo(c, pts){
  if(c < 2) return;
  sfxCombo();
  el.comboPop.textContent = `x${c} COMBO +${pts}`;
  el.comboPop.style.color = c>=5 ? '#f0f' : c>=3 ? '#0ff' : '#0f0';
  el.comboPop.className = 'combo-popup show';
  setTimeout(()=>el.comboPop.className='combo-popup', 900);
}

// --- HINT ---
el.hintBtn.addEventListener('click', ()=>{
  el.hintText.style.display = 'block';
  el.hintText.classList.add('show');
});

// --- CONFIRM PHASE (Type to prove) ---
function handleConfirm(){
  const typed = el.confirmInput.value.trim();
  if(!typed) return;
  
  // Case-insensitive match
  if(typed.toLowerCase() === currentAnswer.toLowerCase()){
    // Typed correctly — advance!
    combo++;
    const pts = 100 * combo;
    score += pts;
    el.hudScore.textContent = score;
    
    sfxCorrect();
    flashScreen('correct');
    showCombo(combo, pts);
    
    el.confirmFeedback.textContent = '✓ ACCESS GRANTED';
    el.confirmFeedback.className = 'confirm-feedback correct';
    
    // Mark node as hacked
    const nodes = el.nodeMap.querySelectorAll('.node');
    if(nodes[level]) { nodes[level].classList.remove('current'); nodes[level].classList.add('hacked'); }
    
    locked = true;
    setTimeout(()=>{
      level++;
      if(level >= concepts.length){
        showModal('BREACH COMPLETE',`All ${concepts.length} firewalls neutralized.`, score);
      } else {
        loadLevel();
      }
    }, 1000);
  } else {
    // Typed wrong — shake and let them retry
    sfxWrong();
    el.confirmFeedback.textContent = '✗ MISMATCH — Try again';
    el.confirmFeedback.className = 'confirm-feedback wrong';
    el.confirmInput.value = '';
    el.confirmInput.focus();
  }
}

el.confirmBtn.addEventListener('click', handleConfirm);
el.confirmInput.addEventListener('keypress', (e)=>{
  if(e.key === 'Enter') handleConfirm();
});

// --- MODAL ---
function showModal(title, text, finalScore){
  el.modalTitle.textContent = title;
  el.modalText.textContent = text;
  el.modalScore.textContent = finalScore;
  el.modal.classList.add('active');
}
el.modalBtn.addEventListener('click', ()=>{
  el.modal.classList.remove('active');
  level = 0; score = 0; combo = 0; lives = 3;
  el.hudScore.textContent = '0';
  startGame();
});

// --- START ---
function startGame(){
  updateHearts();
  loadLevel();
}

// --- INIT ---
bootSequence();
