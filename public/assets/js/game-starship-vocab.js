// ============================================================
// PHI THUYỀN VŨ TRỤ (우주 비행) — bản nhúng vào sổ từ vựng
// Dùng CHÍNH danh sách từ đã lưu của user. Tàu bay tự động,
// đâm vào hành tinh sau 1–5 giây ngẫu nhiên → nghe từ Hàn rồi gõ đúng.
// Expose: window.initStarship(list) — list = [{id, word, meaning, ...}]
// ============================================================

let __shpCssInjected = false;
function injectShpCss(){
  if(__shpCssInjected) return;
  __shpCssInjected = true;
  const st = document.createElement('style');
  st.textContent = `
#gameStarship{ display:flex; flex-direction:column; flex:1; min-height:0; }
.shp{ position:relative; flex:1; min-height:0; overflow:hidden; font-family:'Be Vietnam Pro','Pretendard',sans-serif; color:#eef1ff; background:#03040f;
  user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
.shp *{ box-sizing:border-box; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }

.shp-starfield{ position:absolute; inset:0; pointer-events:none; }
.shp-star{ position:absolute; background:#f5f6ff; border-radius:50%; animation:shp-twinkle 3s ease-in-out infinite; }
.shp-star.bright{ background:#ffe38a; box-shadow:0 0 6px rgba(255,227,138,0.8); }
@keyframes shp-twinkle{ 0%,100%{opacity:.15;} 50%{opacity:.9;} }
.shp-sparkle{ position:absolute; color:#ffe38a; animation:shp-spark 3s ease-in-out infinite; }
@keyframes shp-spark{ 0%,100%{opacity:.1; transform:scale(.7);} 50%{opacity:.9; transform:scale(1.1);} }
.shp-nebula{ position:absolute; border-radius:50%; filter:blur(60px); opacity:.5; animation:shp-drift 20s ease-in-out infinite; }
@keyframes shp-drift{ 0%,100%{transform:translate(0,0);} 50%{transform:translate(20px,-14px);} }

.shp-hud{ position:absolute; top:0; left:0; right:0; z-index:20; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 8px 4px; flex-wrap:nowrap; }
.shp-hud-item{ background:rgba(238,241,255,0.06); border:1px solid rgba(79,209,232,0.28); border-radius:8px; padding:5px 10px; font-size:11px; letter-spacing:.5px; color:#9aa3d9; display:flex; align-items:center; gap:6px; white-space:nowrap; }
.shp-hud-item b{ font-size:14px; color:#ffd166; font-weight:700; }
.shp-hud-item.shp-lives b{ color:#ff5d73; letter-spacing:1px; }
.shp-close{ position:absolute; top:10px; left:10px; z-index:21; width:34px; height:34px; border-radius:50%; border:1px solid rgba(79,209,232,0.28); background:rgba(238,241,255,0.06); color:#eef1ff; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.shp-hs-pill{ position:absolute; top:10px; right:10px; z-index:21; font-size:11px; font-weight:800; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,209,102,.35); background:rgba(255,209,102,0.08); color:#ffd166; white-space:nowrap; }

.shp-space{ position:absolute; inset:0; z-index:5; }
.shp-ship{ position:absolute; width:62px; height:62px; left:50%; top:70%; transform:translate(-50%,-50%); z-index:6; pointer-events:none; will-change:left,top,transform; filter:drop-shadow(0 0 10px rgba(79,209,232,0.55)); }
.shp-ship svg{ overflow:visible; }
.shp-engine{ animation:shp-engine 0.6s ease-in-out infinite; }
@keyframes shp-engine{ 0%,100%{opacity:.6;} 50%{opacity:1;} }
.shp-thruster{ position:absolute; width:5px; height:5px; border-radius:50%; background:#4fd1e8; pointer-events:none; z-index:5; }

.shp-obstacle{ position:absolute; transform:translate(-50%,-50%); z-index:4; will-change:left,top; filter:drop-shadow(0 0 14px rgba(255,93,115,0.35)); }
.shp-obstacle svg{ display:block; animation:shp-spin 11s linear infinite; }
@keyframes shp-spin{ from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
.shp-obstacle.engaged{ filter:drop-shadow(0 0 20px rgba(255,209,102,0.8)) !important; }

.shp-burst{ position:absolute; width:6px; height:6px; border-radius:50%; pointer-events:none; z-index:7; }
.shp-flash{ position:absolute; inset:0; background:#ff5d73; opacity:0; pointer-events:none; z-index:9; }
.shp-flash.hit{ animation:shp-flash-hit .4s ease-out; }
@keyframes shp-flash-hit{ 0%{opacity:.35;} 100%{opacity:0;} }
.shp.shake{ animation:shp-shake .35s; }
@keyframes shp-shake{ 10%,90%{transform:translateX(-2px);} 20%,80%{transform:translateX(4px);} 30%,50%,70%{transform:translateX(-8px);} 40%,60%{transform:translateX(8px);} }

.shp-challenge{ position:absolute; inset:0; z-index:30; background:rgba(3,4,15,0.85); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:16px; }
.shp-challenge.hidden{ display:none; }
.shp-ch-box{ width:min(94%,400px); background:linear-gradient(160deg, rgba(26,33,102,0.6), rgba(3,4,15,0.9)); border:1px solid rgba(79,209,232,0.35); border-radius:20px; padding:22px 18px; text-align:center; }
.shp-ch-label{ font-size:11px; letter-spacing:2px; color:#9aa3d9; text-transform:uppercase; font-weight:700; margin-bottom:12px; }
.shp-listen-btn{ border:1px solid rgba(79,209,232,0.4); background:rgba(79,209,232,0.12); color:#4fd1e8; border-radius:999px; padding:10px 24px; font-weight:800; font-size:14px; cursor:pointer; }
.shp-ch-hint{ color:#9aa3d9; font-size:12px; line-height:1.6; margin:10px 0 14px; }
.shp-input{ width:100%; max-width:300px; padding:12px 16px; font-size:17px; font-family:'Noto Sans KR',sans-serif; text-align:center; border:2px solid rgba(79,209,232,0.35); border-radius:12px; background:rgba(238,241,255,0.06); color:#eef1ff; outline:none; }
.shp-input:focus{ border-color:#4fd1e8; box-shadow:0 0 16px rgba(79,209,232,0.35); }
.shp-input.shake{ animation:shp-shake .3s; border-color:#ff5d73; }
.shp-confirm-btn{ border:none; background:linear-gradient(135deg,#ffd166,#ff9d5c); color:#2b1d00; border-radius:999px; padding:12px 30px; font-weight:800; font-size:14px; cursor:pointer; margin-top:12px; }
.shp-feedback{ min-height:22px; font-weight:700; font-size:13px; margin-top:10px; }

.shp-overlay{ position:absolute; inset:0; z-index:40; background:rgba(3,4,15,0.9); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:18px; overflow-y:auto; }
.shp-overlay.hidden{ display:none; }
.shp-title{ font-family:'Noto Sans KR',sans-serif; font-weight:900; font-size:32px; color:#4fd1e8; margin:0 0 4px; }
.shp-title span{ display:block; font-family:'Be Vietnam Pro','Pretendard',sans-serif; font-size:13px; color:#9aa3d9; font-weight:600; margin-top:6px; }
.shp-desc{ max-width:400px; color:#9aa3d9; font-size:13px; line-height:1.7; margin:10px 0 18px; }
.shp-startbtn{ font-family:'Pretendard',sans-serif; font-weight:800; font-size:16px; color:#03040f; background:linear-gradient(180deg,#ffd166,#e8a63d); border:none; padding:13px 36px; border-radius:30px; cursor:pointer; box-shadow:0 4px 0 #8a6410, 0 8px 20px rgba(255,209,102,0.3); }
.shp-startbtn:active{ transform:translateY(3px); }
.shp-ghost{ font-family:'Pretendard',sans-serif; font-weight:700; font-size:14px; color:#9aa3d9; background:transparent; border:2px solid rgba(79,209,232,0.28); padding:10px 26px; border-radius:30px; cursor:pointer; margin-top:12px; }
.shp-final-label{ font-size:11px; letter-spacing:2px; color:#9aa3d9; text-transform:uppercase; }
.shp-final{ font-family:'Pretendard',sans-serif; font-weight:900; font-size:40px; color:#ffd166; margin:4px 0 2px; }
.shp-overmsg{ color:#9aa3d9; font-size:14px; margin:6px 0 16px; }
@media (max-width:600px){
  .shp-hud-item{ font-size:10px; padding:4px 7px; }
  .shp-hud-item b{ font-size:12px; }
  .shp-ship{ width:54px; height:54px; }
}
`;
  document.head.appendChild(st);
}

const SHP_SHIP_SVG = `<svg width="78" height="78" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="shpHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#bdf3ff"/><stop offset="60%" stop-color="#4fd1e8"/><stop offset="100%" stop-color="#1f8fa3"/></linearGradient></defs><polygon points="23,1 34,33 23,26 12,33" fill="url(#shpHull)" stroke="#0a3a42" stroke-width="1.4"/><polygon points="23,6 28,26 23,22 18,26" fill="#e8fbff" opacity="0.35"/><circle cx="23" cy="15" r="5.2" fill="#e8fbff" stroke="#0a3a42" stroke-width="1"/><circle cx="23" cy="15" r="2.6" fill="#0fd7ff"/><polygon points="12,33 5,42 15,37" fill="#ffd166" stroke="#8a5f10" stroke-width="1"/><polygon points="34,33 41,42 31,37" fill="#ffd166" stroke="#8a5f10" stroke-width="1"/><g class="shp-engine"><ellipse cx="19" cy="34" rx="2.4" ry="4" fill="#ffe38a"/><ellipse cx="27" cy="34" rx="2.4" ry="4" fill="#ffe38a"/></g></svg>`;

const SHP_HTML = `
  <div class="shp" id="shp-root">
    <div class="shp-starfield" id="shp-starfield"></div>
    <div class="shp-flash" id="shp-flash"></div>

    <button class="shp-close" id="shp-close" title="Đóng">✕</button>
    <div class="shp-hud">
      <div class="shp-hud-item">ĐIỂM <b id="shp-score">0</b></div>
      <div class="shp-hud-item">CẤP <b id="shp-level">1</b></div>
      <div class="shp-hud-item shp-lives">MẠNG <b id="shp-lives">♥♥♥♥♥</b></div>
      <button class="shp-listen-btn" id="shp-listen-small" style="display:none;">🔊</button>
    </div>
    <div class="shp-hs-pill" id="shp-hs">🏆 0</div>

    <div class="shp-space" id="shp-space">
      <div class="shp-ship" id="shp-ship">${SHP_SHIP_SVG}</div>
    </div>

    <div class="shp-challenge hidden" id="shp-challenge">
      <div class="shp-ch-box">
        <div class="shp-ch-label">NGHE VÀ GÕ TỪ</div>
        <button class="shp-listen-btn" id="shp-listen">🔊 NGHE TỪ</button>
        <p class="shp-ch-hint">Nghe từ tiếng Hàn rồi gõ đúng vào ô bên dưới — đúng thì bay tiếp, sai thì nổ mất 1 mạng.</p>
        <input class="shp-input" id="shp-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ tiếng Hàn...">
        <div><button class="shp-confirm-btn" id="shp-confirm">XÁC NHẬN</button></div>
        <div class="shp-feedback" id="shp-feedback"></div>
      </div>
    </div>

    <div class="shp-overlay" id="shp-start">
      <h2 class="shp-title">우주 비행<span>Phi Thuyền Vũ Trụ · Từ sổ từ vựng của bạn</span></h2>
      <p class="shp-desc" id="shp-desc"></p>
      <button class="shp-startbtn" id="shp-startbtn">BẮT ĐẦU</button>
      <button class="shp-ghost" id="shp-startclose">Đóng</button>
    </div>

    <div class="shp-overlay hidden" id="shp-over">
      <div class="shp-final-label">KẾT THÚC</div>
      <div class="shp-final" id="shp-final">0</div>
      <p class="shp-overmsg" id="shp-overmsg"></p>
      <button class="shp-startbtn" id="shp-retry">CHƠI LẠI</button>
      <button class="shp-ghost" id="shp-overclose">Đóng</button>
    </div>
  </div>
`;

window.initStarship = function(list){
  const userWords = (list || []).map(w => ({ ko:(w.word||'').trim(), vi:(w.meaning||'').trim() })).filter(x => x.ko);
  if(!userWords.length){
    if(window.Swal) Swal.fire('Thông báo', 'Danh sách này không có từ nào hợp lệ để chơi!', 'warning');
    return;
  }
  injectShpCss();
  const wrap = document.getElementById('gameStarship');
  if(!wrap) return;
  wrap.innerHTML = SHP_HTML;
  const root = wrap.querySelector('.shp');
  root.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  const space = root.querySelector('#shp-space');
  const shipEl = root.querySelector('#shp-ship');
  const scoreEl = root.querySelector('#shp-score');
  const levelEl = root.querySelector('#shp-level');
  const livesEl = root.querySelector('#shp-lives');
  const hsEl = root.querySelector('#shp-hs');
  const flash = root.querySelector('#shp-flash');
  const starfieldWrap = root.querySelector('#shp-starfield');
  const startScreen = root.querySelector('#shp-start');
  const overScreen = root.querySelector('#shp-over');
  const finalEl = root.querySelector('#shp-final');
  const overMsg = root.querySelector('#shp-overmsg');
  const challengeOverlay = root.querySelector('#shp-challenge');
  const challengeInput = root.querySelector('#shp-input');
  const challengeFeedback = root.querySelector('#shp-feedback');
  const listenBtn = root.querySelector('#shp-listen');
  const descEl = root.querySelector('#shp-desc');

  const TOTAL_LIVES = 5;
  const MAX_SPEED = 180, STEER_GAIN = 3.2, ARRIVE_RADIUS = 160, SHIP_RADIUS = 30;

  let highScore = 0;
  try{ const v = localStorage.getItem('starship-vocab-best'); if(v) highScore = parseInt(v)||0; }catch(e){}
  hsEl.textContent = '🏆 ' + highScore;

  // sao + tinh vân
  for(let i=0;i<80;i++){
    const s = document.createElement('div');
    const bright = Math.random() < 0.18;
    s.className = 'shp-star' + (bright ? ' bright' : '');
    const size = bright ? (2+Math.random()*1.6) : (1+Math.random()*1.6);
    s.style.width = size+'px'; s.style.height = size+'px';
    s.style.left = Math.random()*100+'%'; s.style.top = Math.random()*100+'%';
    s.style.animationDelay = (Math.random()*3)+'s';
    starfieldWrap.appendChild(s);
  }
  for(let i=0;i<14;i++){
    const sp = document.createElement('div');
    sp.className = 'shp-sparkle'; sp.textContent = '✦';
    sp.style.left = Math.random()*100+'%'; sp.style.top = Math.random()*100+'%';
    sp.style.fontSize = (8+Math.random()*8)+'px';
    sp.style.animationDelay = (Math.random()*3)+'s';
    starfieldWrap.appendChild(sp);
  }
  const nebulaColors = ['rgba(140,92,245,0.5)','rgba(242,79,192,0.5)','rgba(63,224,208,0.5)','rgba(79,125,255,0.5)'];
  for(let i=0;i<4;i++){
    const n = document.createElement('div');
    n.className = 'shp-nebula';
    const size = 150+Math.random()*200;
    n.style.width = size+'px'; n.style.height = size+'px';
    n.style.left = (Math.random()*85)+'%'; n.style.top = (Math.random()*85)+'%';
    n.style.background = nebulaColors[i%nebulaColors.length];
    n.style.animationDelay = (Math.random()*8)+'s';
    starfieldWrap.appendChild(n);
  }

  // state
  let state = null, rafId = null, lastTime = 0, recentKo = [];
  function freshState(){
    return {
      running:false, score:0, level:1, lives:TOTAL_LIVES,
      obstacles:[], maxObstacles:12, obstacleSpeedMult:1,
      activeObstacle:null, cooldownUntil:0, nextCrashAt:0,
      ship:{ x:200, y:300, vx:0, vy:0, targetX:200, targetY:300, hasTarget:false, angle:0 }
    };
  }
  function updateHud(){
    scoreEl.textContent = state.score;
    levelEl.textContent = state.level;
    livesEl.textContent = '♥'.repeat(Math.max(state.lives,0)) + '♡'.repeat(Math.max(TOTAL_LIVES-state.lives,0));
  }

  function pickVocab(){
    const pool = userWords.filter(v => !recentKo.includes(v.ko));
    const bank = pool.length ? pool : userWords;
    const item = bank[Math.floor(Math.random()*bank.length)];
    recentKo.push(item.ko);
    if(recentKo.length > 6) recentKo.shift();
    return item;
  }
  function normalizeKo(s){ return (s||'').replace(/\s+/g,'').replace(/[.,!?~]/g,'').trim(); }

  // obstacle
  function jaggedPoints(cx, cy, baseR, spikes, irregularity){
    const pts = [];
    for(let i=0;i<spikes;i++){
      const angle = (i/spikes)*Math.PI*2;
      const r = baseR * (1 - irregularity/2 + Math.random()*irregularity);
      pts.push((cx+Math.cos(angle)*r).toFixed(1)+','+(cy+Math.sin(angle)*r).toFixed(1));
    }
    return pts.join(' ');
  }
  function spawnObstacle(){
    const w = space.clientWidth, h = space.clientHeight;
    if(w===0||h===0) return;
    const margin = 60;
    let x, y, tries=0;
    do{
      x = margin + Math.random()*(w-margin*2);
      y = margin + Math.random()*(h-margin*2);
      tries++;
    } while(tries<10 && Math.hypot(x-state.ship.x, y-state.ship.y) < 160);
    const roll = Math.random();
    const type = roll < 0.55 ? 'planet' : 'asteroid';
    const el = document.createElement('div');
    el.className = 'shp-obstacle';
    const radius = 26 + Math.random()*12;
    el.style.left = x+'px'; el.style.top = y+'px';
    const vb = 80, c = vb/2;
    const uid = Math.random().toString(36).slice(2);
    if(type === 'planet'){
      const palettes = [
        ['#3a0e0e','#ff6a3d','#ffb27a'], ['#1a0e3a','#8c5cf5','#c9a8ff'],
        ['#0e3a2e','#3fe0d0','#a8fff2'], ['#3a2a0e','#ffd166','#ffe9a8']
      ];
      const [dark,mid,glow] = palettes[Math.floor(Math.random()*palettes.length)];
      el.innerHTML = '<svg width="'+(radius*2)+'" height="'+(radius*2)+'" viewBox="0 0 '+vb+' '+vb+'"><defs><radialGradient id="pg'+uid+'" cx="35%" cy="32%"><stop offset="0%" stop-color="'+glow+'"/><stop offset="45%" stop-color="'+mid+'"/><stop offset="100%" stop-color="'+dark+'"/></radialGradient></defs><circle cx="'+c+'" cy="'+c+'" r="30" fill="url(#pg'+uid+')"/><path d="M 20 30 Q 30 24 40 32 T 58 30" stroke="'+glow+'" stroke-width="2" fill="none" opacity="0.8"/><ellipse cx="'+c+'" cy="'+c+'" rx="44" ry="11" fill="none" stroke="'+glow+'" stroke-width="2.2" opacity="0.7" transform="rotate(-18 '+c+' '+c+')"/></svg>';
    } else {
      const rockPts = jaggedPoints(c,c,32,9,0.45);
      el.innerHTML = '<svg width="'+(radius*2)+'" height="'+(radius*2)+'" viewBox="0 0 '+vb+' '+vb+'"><polygon points="'+rockPts+'" fill="#4a4038" stroke="#221c17" stroke-width="2"/><circle cx="'+(c-9)+'" cy="'+(c-6)+'" r="5" fill="#332a23" opacity="0.7"/><circle cx="'+(c+10)+'" cy="'+(c+8)+'" r="7" fill="#332a23" opacity="0.7"/><path d="M '+(c-16)+' '+(c-2)+' L '+c+' '+c+' L '+(c+14)+' '+(c-10)+'" stroke="#ff5d73" stroke-width="2" fill="none" opacity="0.85"/></svg>';
    }
    space.appendChild(el);
    state.obstacles.push({
      el, type, radius, baseX:x, baseY:y,
      ampX:16+Math.random()*30, ampY:16+Math.random()*30,
      freq:0.5+Math.random()*0.9, phase:Math.random()*Math.PI*2,
      driftVX:(Math.random()-0.5)*70*state.obstacleSpeedMult,
      driftVY:(Math.random()-0.5)*70*state.obstacleSpeedMult,
      jitterTimer:0, nextJitterAt:0.2+Math.random()*0.6,
      x, y, engaged:false
    });
  }
  function removeObstacle(ob){
    const idx = state.obstacles.indexOf(ob);
    if(idx>=0) state.obstacles.splice(idx,1);
    ob.el.remove();
  }

  // hiệu ứng
  function spawnBurst(x,y,color,count){
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'shp-burst';
      p.style.background = color === 'gold' ? '#ffd166' : '#ff5d73';
      p.style.left = x+'px'; p.style.top = y+'px';
      space.appendChild(p);
      const ang = Math.random()*Math.PI*2;
      const dist = 18+Math.random()*36;
      p.animate([
        {transform:'translate(0,0)', opacity:1},
        {transform:'translate('+(Math.cos(ang)*dist)+'px,'+(Math.sin(ang)*dist)+'px)', opacity:0}
      ], {duration:450, easing:'ease-out'}).onfinish=()=>p.remove();
    }
  }

  // autopilot
  function pickNewAutoTarget(){
    const w = space.clientWidth, h = space.clientHeight;
    if(w===0||h===0) return;
    const margin = SHIP_RADIUS + 40;
    state.ship.targetX = margin + Math.random()*(Math.max(w-margin*2,10));
    state.ship.targetY = margin + Math.random()*(Math.max(h-margin*2,10));
    state.ship.hasTarget = true;
    state.ship.retargetTimer = 0;
    state.ship.retargetInterval = 4000 + Math.random()*3000;
  }

  // hẹn giờ đâm 1–5 giây (giây lẻ)
  function scheduleCrash(){
    state.nextCrashAt = performance.now() + (1000 + Math.random()*4000);
  }

  function triggerEncounter(ob){
    const vocab = pickVocab();
    ob.answer = vocab.ko;
    ob.engaged = true;
    ob.el.classList.add('engaged');
    challengeFeedback.textContent = '';
    challengeInput.value = '';
    challengeOverlay.classList.remove('hidden');
    setTimeout(()=>{ challengeInput.focus(); if(window.readKorean) window.readKorean(vocab.ko, 1); }, 150);
  }

  function resolveChallenge(){
    if(!state || !state.activeObstacle) return;
    const ob = state.activeObstacle;
    const raw = challengeInput.value.trim();
    if(!raw) return;
    const correct = normalizeKo(raw) === normalizeKo(ob.answer);
    if(correct){
      challengeFeedback.style.color = '#4fd1e8';
      challengeFeedback.textContent = 'Chính xác! Bay tiếp thôi 🚀';
      const gained = 15 * state.level + ob.answer.length * 2;
      state.score += gained;
      updateHud();
      spawnBurst(ob.x, ob.y, 'gold', 10);
      setTimeout(()=>{ removeObstacle(ob); closeChallenge(); if(state.score >= state.level*130) levelUp(); }, 350);
    } else {
      challengeFeedback.style.color = '#ff5d73';
      challengeFeedback.textContent = 'Sai rồi — tàu nổ mất 1 mạng!';
      challengeInput.classList.remove('shake'); void challengeInput.offsetWidth; challengeInput.classList.add('shake');
      setTimeout(()=>{
        spawnBurst(ob.x, ob.y, 'danger', 10);
        root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake');
        flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit');
        state.lives--;
        updateHud();
        removeObstacle(ob);
        closeChallenge();
        if(state.lives<=0) endGame();
      }, 500);
    }
  }
  function closeChallenge(){
    challengeOverlay.classList.add('hidden');
    state.activeObstacle = null;
    state.cooldownUntil = performance.now() + 500;
    scheduleCrash();
  }
  function levelUp(){
    state.level++;
    state.obstacleSpeedMult = Math.min(state.obstacleSpeedMult + 0.12, 2.2);
    state.maxObstacles = Math.min(state.maxObstacles + (state.level%2===0?1:0), 16);
  }

  function loop(ts){
    if(!state || !state.running) return;
    const dt = Math.min((ts - lastTime)/1000, 0.05) || 0;
    lastTime = ts;
    const w = space.clientWidth, h = space.clientHeight;
    if(!challengeOverlay.classList.contains('hidden')){
      rafId = requestAnimationFrame(loop);
      return;
    }
    const ship = state.ship;
    ship.retargetTimer = (ship.retargetTimer||0) + dt*1000;
    const distToTarget = ship.hasTarget ? Math.hypot(ship.targetX-ship.x, ship.targetY-ship.y) : 999;
    if(!ship.hasTarget || distToTarget < 20 || ship.retargetTimer > (ship.retargetInterval||4500)) pickNewAutoTarget();
    let ax=0, ay=0;
    if(ship.hasTarget){
      const dx = ship.targetX - ship.x, dy = ship.targetY - ship.y;
      const dist = Math.sqrt(dx*dx+dy*dy) || 1;
      const desiredSpeed = dist < ARRIVE_RADIUS ? MAX_SPEED * (dist/ARRIVE_RADIUS) : MAX_SPEED;
      ax = ((dx/dist)*desiredSpeed - ship.vx) * STEER_GAIN;
      ay = ((dy/dist)*desiredSpeed - ship.vy) * STEER_GAIN;
    }
    ship.vx += ax*dt; ship.vy += ay*dt;
    const speed0 = Math.sqrt(ship.vx*ship.vx+ship.vy*ship.vy);
    if(speed0 > MAX_SPEED){ ship.vx = ship.vx/speed0*MAX_SPEED; ship.vy = ship.vy/speed0*MAX_SPEED; }
    ship.x += ship.vx*dt; ship.y += ship.vy*dt;
    if(ship.x < SHIP_RADIUS){ ship.x = SHIP_RADIUS; ship.vx *= -0.3; }
    if(ship.x > w-SHIP_RADIUS){ ship.x = w-SHIP_RADIUS; ship.vx *= -0.3; }
    if(ship.y < SHIP_RADIUS){ ship.y = SHIP_RADIUS; ship.vy *= -0.3; }
    if(ship.y > h-SHIP_RADIUS){ ship.y = h-SHIP_RADIUS; ship.vy *= -0.3; }
    if(speed0 > 6) ship.angle = Math.atan2(ship.vx, -ship.vy)*180/Math.PI;
    shipEl.style.left = ship.x+'px'; shipEl.style.top = ship.y+'px';
    shipEl.style.transform = 'translate(-50%,-50%) rotate('+ship.angle+'deg)';

    // obstacles di chuyển hỗn loạn
    state.obstacles.forEach(ob => {
      if(ob.engaged) return;
      ob.phase += dt*ob.freq;
      ob.baseX += ob.driftVX*dt;
      ob.baseY += ob.driftVY*dt;
      ob.jitterTimer += dt;
      if(ob.jitterTimer > ob.nextJitterAt){
        ob.jitterTimer = 0;
        ob.nextJitterAt = 0.35 + Math.random()*0.8;
        ob.driftVX = (Math.random()-0.5)*90*state.obstacleSpeedMult;
        ob.driftVY = (Math.random()-0.5)*90*state.obstacleSpeedMult;
        ob.ampX = 14 + Math.random()*44;
        ob.ampY = 14 + Math.random()*44;
        ob.freq = 0.6 + Math.random()*1.8;
      }
      const m = ob.radius+10;
      if(ob.baseX < m || ob.baseX > w-m) ob.driftVX *= -1;
      if(ob.baseY < m || ob.baseY > h-m) ob.driftVY *= -1;
      ob.baseX = Math.max(m, Math.min(w-m, ob.baseX));
      ob.baseY = Math.max(m, Math.min(h-m, ob.baseY));
      ob.x = ob.baseX + Math.sin(ob.phase)*ob.ampX;
      ob.y = ob.baseY + Math.cos(ob.phase*0.8)*ob.ampY;
      ob.el.style.left = ob.x+'px';
      ob.el.style.top = ob.y+'px';
    });
    if(state.obstacles.length < state.maxObstacles && Math.random() < dt*1.1) spawnObstacle();

    // đâm hành tinh theo hẹn giờ 1–5s
    if(!state.activeObstacle && ts > state.cooldownUntil && ts >= state.nextCrashAt){
      const candidates = state.obstacles.filter(o=>!o.engaged);
      if(candidates.length){
        let nearest=null, nd=Infinity;
        candidates.forEach(ob=>{ const d=Math.hypot(ship.x-ob.x, ship.y-ob.y); if(d<nd){nd=d;nearest=ob;} });
        ship.x = nearest.x; ship.y = nearest.y;
        shipEl.style.left = ship.x+'px'; shipEl.style.top = ship.y+'px';
        spawnBurst(nearest.x, nearest.y, 'danger', 8);
        flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit');
        state.activeObstacle = nearest;
        triggerEncounter(nearest);
      } else {
        scheduleCrash();
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  function startGame(){
    state = freshState();
    space.querySelectorAll('.shp-obstacle, .shp-burst').forEach(el=>el.remove());
    recentKo = [];
    state.ship.x = space.clientWidth/2 || 200;
    state.ship.y = (space.clientHeight*0.7) || 300;
    state.running = true;
    challengeOverlay.classList.add('hidden');
    updateHud();
    startScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    for(let i=0;i<10;i++) spawnObstacle();
    pickNewAutoTarget();
    scheduleCrash();
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function endGame(){
    state.running = false;
    cancelAnimationFrame(rafId);
    challengeOverlay.classList.add('hidden');
    finalEl.textContent = state.score;
    if(state.score > highScore){
      highScore = state.score;
      hsEl.textContent = '🏆 ' + highScore;
      try{ localStorage.setItem('starship-vocab-best', String(highScore)); }catch(e){}
      overMsg.textContent = 'Kỷ lục mới! Phi công cừ khôi!';
    } else {
      overMsg.textContent = 'Luyện thêm để phá kỷ lục '+highScore+' điểm nhé!';
    }
    setTimeout(()=>{ overScreen.classList.remove('hidden'); }, 300);
  }

  // input events
  listenBtn.addEventListener('click', ()=>{
    if(state && state.activeObstacle && window.readKorean) window.readKorean(state.activeObstacle.answer, 1);
  });
  challengeInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); resolveChallenge(); } });
  root.querySelector('#shp-confirm').addEventListener('click', resolveChallenge);

  descEl.innerHTML = 'Sổ từ vựng của bạn có <b style="color:#ffd166;">'+userWords.length+'</b> từ. Tàu bay tự động — tàu sẽ đâm vào hành tinh sau mỗi <b>1–5 giây</b> ngẫu nhiên, nghe từ tiếng Hàn rồi gõ đúng để bay tiếp. Sai thì nổ mất 1 mạng, hết 5 mạng là thua!';

  root.querySelector('#shp-startbtn').addEventListener('click', startGame);
  root.querySelector('#shp-retry').addEventListener('click', startGame);
  root.querySelector('#shp-close').addEventListener('click', closeStudy);
  root.querySelector('#shp-startclose').addEventListener('click', closeStudy);
  root.querySelector('#shp-overclose').addEventListener('click', closeStudy);

  window.__shpStop = function(){
    if(state) state.running = false;
    cancelAnimationFrame(rafId);
    challengeOverlay.classList.add('hidden');
  };
};
