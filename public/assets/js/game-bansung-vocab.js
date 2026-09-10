// ============================================================
// BẮN TỪ VỰNG (한글 화차) — phiên bản nhúng vào sổ từ vựng
// Dùng CHÍNH danh sách từ đã lưu của user (từ trong studyModal)
// Expose: window.initBansung(list) — list = [{id, word, meaning}]
// ============================================================

// ---- Âm thanh (Web Audio API) — tái sử dụng nếu đã có ----
window.AudioSys = window.AudioSys || (function(){
  var ctx = null;
  var musicOn = true;
  var sfxOn = true;
  var musicTimer = null;
  var musicStep = 0;
  var MELODY = [261.6, 329.6, 392.0, 523.3, 392.0, 329.6, 293.7, 349.2];

  function ensureCtx(){
    if(!ctx){
      var AC = window.AudioContext || window.webkitAudioContext;
      if(AC) ctx = new AC();
    }
    if(ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, vol, when){
    if(!sfxOn) return;
    var c = ensureCtx(); if(!c) return;
    var t = c.currentTime + (when || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function playShoot(){ beep(880, 0.08, 'square', 0.09); beep(440, 0.1, 'square', 0.07, 0.05); }
  function playExplosion(){
    for(var i=0;i<4;i++){ beep(200 + Math.random()*300, 0.12, 'sawtooth', 0.11, i*0.04); }
    beep(90, 0.25, 'triangle', 0.15);
  }
  function playLoseLife(){ beep(220, 0.2, 'sawtooth', 0.11); beep(150, 0.3, 'sawtooth', 0.11, 0.12); }
  function playLevelUp(){ beep(523, 0.1, 'square', 0.1); beep(659, 0.1, 'square', 0.1, 0.08); beep(784, 0.16, 'square', 0.11, 0.16); }
  function playGameOver(){ beep(392, 0.16, 'sawtooth', 0.1); beep(311, 0.16, 'sawtooth', 0.1, 0.16); beep(233, 0.35, 'sawtooth', 0.11, 0.32); }
  function playStart(){ beep(523, 0.1, 'square', 0.1); beep(659, 0.1, 'square', 0.1, 0.08); beep(784, 0.16, 'square', 0.12, 0.16); }

  function startMusic(){
    if(!musicOn) return;
    ensureCtx(); if(!ctx) return;
    stopMusic();
    musicStep = 0;
    scheduleMusic();
  }
  function scheduleMusic(){
    if(!musicOn || !ctx) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(); var g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = MELODY[musicStep % MELODY.length];
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.45);
    var bo = ctx.createOscillator(); var bg = ctx.createGain();
    bo.type = 'sine'; bo.frequency.value = MELODY[Math.floor(musicStep/2) % MELODY.length] / 2;
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.linearRampToValueAtTime(0.04, t + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    bo.connect(bg); bg.connect(ctx.destination); bo.start(t); bo.stop(t + 0.65);
    musicStep++;
    musicTimer = setTimeout(scheduleMusic, 250);
  }
  function stopMusic(){ if(musicTimer){ clearTimeout(musicTimer); musicTimer = null; } }

  function setMusicOn(on){ musicOn = !!on; if(musicOn) startMusic(); else stopMusic(); }
  function setSfxOn(on){ sfxOn = !!on; }

  return {
    ensureCtx: ensureCtx,
    playShoot: playShoot, playExplosion: playExplosion, playLoseLife: playLoseLife,
    playLevelUp: playLevelUp, playGameOver: playGameOver, playStart: playStart,
    startMusic: startMusic, stopMusic: stopMusic,
    setMusicOn: setMusicOn, setSfxOn: setSfxOn,
    isMusicOn: function(){ return musicOn; }, isSfxOn: function(){ return sfxOn; }
  };
})();

window.storage = window.storage || {
  get: function(k){ try { return Promise.resolve({ value: localStorage.getItem(k) }); } catch(e){ return Promise.resolve({ value: null }); } },
  set: function(k, v){ try { localStorage.setItem(k, v); } catch(e){} return Promise.resolve(); }
};

// ---- CSS (inject 1 lần) ----
let __bansungCssInjected = false;
function injectBansungCss(){
  if(__bansungCssInjected) return;
  __bansungCssInjected = true;
  const st = document.createElement('style');
  st.textContent = `
#gameBansung{ display:flex; flex-direction:column; flex:1; min-height:0; }
.bgb{
  position:relative; flex:1; min-height:0;
  display:flex; flex-direction:column;
  overflow:hidden; border-radius:14px;
  background:radial-gradient(ellipse at 50% 0%, #1f2c5c 0%, #141d42 45%, #0a0f24 100%);
  font-family:'Pretendard', sans-serif; color:#f5f3ea;
}
.bgb-stars{ position:absolute; inset:0; pointer-events:none; }
.bgb-star{ position:absolute; width:2px; height:2px; background:#f5f3ea; border-radius:50%; opacity:.5; animation:bgb-twinkle 3s ease-in-out infinite; }
@keyframes bgb-twinkle{ 0%,100%{opacity:.15;} 50%{opacity:.8;} }
.bgb-flash{ position:absolute; inset:0; background:#ff5d73; opacity:0; pointer-events:none; z-index:8; }
.bgb-flash.hit{ animation:bgb-flash-hit .35s ease-out; }
@keyframes bgb-flash-hit{ 0%{opacity:.35;} 100%{opacity:0;} }

.bgb-hud{
  position:relative; z-index:5;
  display:flex; justify-content:center; gap:6px;
  padding:10px 8px 4px; flex-wrap:nowrap;
}
.bgb-hud-item{
  background:rgba(245,243,234,0.06); border:1px solid rgba(244,185,66,0.25);
  border-radius:8px; padding:5px 12px;
  font-family:'Pretendard', sans-serif; font-size:12px; letter-spacing:.5px; color:#9aa3c9;
  display:flex; align-items:center; gap:6px; white-space:nowrap;
}
.bgb-hud-item b{ font-size:15px; color:#f4b942; font-weight:800; }
.bgb-hud-item.bgb-lives b{ color:#ff5d73; letter-spacing:1px; }
.bgb-sound{ cursor:pointer; border:none; background:transparent; font-size:14px; padding:4px 6px; }

.bgb-field{ position:relative; flex:1; min-height:0; margin:4px 0 0; overflow:hidden; }
.bgb-word{
  position:absolute; transform:translateX(-50%);
  background:linear-gradient(180deg, rgba(31,44,92,.85), rgba(10,15,36,.9));
  border:1.5px solid #4fd1c5; border-radius:12px; padding:7px 14px 6px;
  text-align:center; box-shadow:0 0 14px rgba(79,209,197,.25);
  transition:border-color .15s, box-shadow .15s;
  max-width:78%; white-space:normal; will-change:top;
  cursor:pointer;
}
.bgb-word.matched{ border-color:#f4b942; box-shadow:0 0 20px rgba(244,185,66,.55); }
.bgb-word.life-lost-word{ animation:bgb-sink .35s ease-in forwards; }
@keyframes bgb-sink{ to{ opacity:0; transform:translateX(-50%) translateY(10px) scale(.85); } }
.bgb-ko{ font-family:'Pretendard', sans-serif; font-weight:800; font-size:24px; letter-spacing:.3px; color:#f5f3ea; line-height:1.25; }
.bgb-vi{ font-size:11px; color:#9aa3c9; margin-top:2px; }
.bgb-vi-main{ font-family:'Pretendard', sans-serif; font-weight:800; font-size:18px; letter-spacing:.2px; color:#f5f3ea; line-height:1.25; }

.bgb-particle{ position:absolute; width:5px; height:5px; background:#f4b942; border-radius:1px; pointer-events:none; }
.bgb-impact{ position:absolute; width:60px; height:60px; transform:translate(-50%,-50%); border-radius:50%; pointer-events:none; animation:bgb-impact-fade .4s ease-out forwards; }
@keyframes bgb-impact-fade{ from{opacity:1; transform:translate(-50%,-50%) scale(.4);} to{opacity:0; transform:translate(-50%,-50%) scale(1.6);} }

.bgb-cannon{ position:relative; height:70px; display:flex; justify-content:center; z-index:4; pointer-events:none; }
.bgb-cannon svg{ overflow:visible; }
.bgb-proj{ position:absolute; inset:0; pointer-events:none; z-index:6; }
.bgb-projectile{ position:absolute; width:6px; height:16px; background:linear-gradient(180deg,#f4b942,#fff2c9); border-radius:3px; box-shadow:0 0 8px #f4b942; pointer-events:none; }

.bgb-inputbar{ position:relative; z-index:7; display:flex; justify-content:center; padding:8px 10px 12px; }
.bgb-input{
  width:min(420px, 94%);
  background:rgba(245,243,234,.08); border:2px solid rgba(244,185,66,.25); border-radius:30px;
  padding:11px 18px; font-size:17px; font-family:'Pretendard', sans-serif; font-weight:700;
  color:#f5f3ea; text-align:center; outline:none; appearance:none; -webkit-appearance:none;
  transition:border-color .15s, box-shadow .15s;
}
.bgb-input::placeholder{ font-family:'Pretendard', sans-serif; font-size:13px; color:#9aa3c9; }
.bgb-input:focus{ border-color:#4fd1c5; box-shadow:0 0 16px rgba(79,209,197,.35); }
.bgb-input.shake{ animation:bgb-shake .3s; border-color:#ff5d73; box-shadow:0 0 16px rgba(255,93,115,.45); }
@keyframes bgb-shake{ 0%,100%{transform:translateX(0);} 20%{transform:translateX(-8px);} 40%{transform:translateX(8px);} 60%{transform:translateX(-6px);} 80%{transform:translateX(6px);} }

.bgb-overlay{
  position:absolute; inset:0; z-index:10;
  background:rgba(6,9,24,.92);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center; padding:18px;
  overflow-y:auto;
}
.bgb-overlay.hidden{ display:none; }
.bgb-title{ font-family:'Pretendard', sans-serif; font-weight:900; font-size:42px; color:#f4b942; letter-spacing:1px; margin:0 0 4px; }
.bgb-sub{ display:block; font-family:'Pretendard', sans-serif; font-size:16px; color:#9aa3c9; font-weight:600; margin-top:6px; letter-spacing:.5px; }
.bgb-desc{ max-width:420px; color:#9aa3c9; font-size:16px; line-height:1.7; margin:10px 0 16px; }
.bgb-sel-label{ font-size:13px; letter-spacing:2px; text-transform:uppercase; color:#9aa3c9; margin:2px 0 8px; }
.bgb-modes{ display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; justify-content:center; }
.bgb-mode{
  font-family:'Pretendard', sans-serif; font-weight:600; font-size:15px; color:#9aa3c9;
  background:rgba(245,243,234,.06); border:2px solid rgba(244,185,66,.25); padding:10px 18px; border-radius:24px; cursor:pointer; transition:all .15s;
}
.bgb-mode:hover{ color:#f5f3ea; border-color:#4fd1c5; }
.bgb-mode.active{ color:#0a0f24; background:#4fd1c5; border-color:#4fd1c5; box-shadow:0 0 14px rgba(79,209,197,.4); }
.bgb-btn{
  font-family:'Pretendard', sans-serif; font-weight:800; font-size:18px; color:#0a0f24;
  background:linear-gradient(180deg,#f4b942,#d99a1f); border:none; padding:14px 38px; border-radius:30px;
  cursor:pointer; box-shadow:0 4px 0 #8a6a1f, 0 8px 20px rgba(244,185,66,.3); transition:transform .1s;
}
.bgb-btn:active{ transform:translateY(3px); box-shadow:0 1px 0 #8a6a1f; }
.bgb-btn-ghost{
  font-family:'Pretendard', sans-serif; font-weight:700; font-size:16px; color:#9aa3c9;
  background:transparent; border:2px solid rgba(244,185,66,.25); padding:11px 28px; border-radius:30px;
  cursor:pointer; margin-top:14px; transition:all .15s;
}
.bgb-btn-ghost:hover{ color:#f5f3ea; border-color:#4fd1c5; }
.bgb-final-label{ font-size:12px; letter-spacing:2px; color:#9aa3c9; text-transform:uppercase; }
.bgb-final-score{ font-family:'Pretendard', sans-serif; font-weight:800; font-size:36px; color:#4fd1c5; margin:4px 0 2px; }
.bgb-msg{ color:#9aa3c9; font-size:14px; margin:8px 0 16px; }

/* Compact khi bàn phím mobile mở (thu gọn để từ rơi vẫn nhìn thấy) */
.bgb.bgb-compact .bgb-hud{ padding:5px 4px 2px; gap:4px; }
.bgb.bgb-compact .bgb-hud-item{ padding:3px 7px; font-size:10px; }
.bgb.bgb-compact .bgb-hud-item b{ font-size:12px; }
.bgb.bgb-compact .bgb-cannon{ height:40px; }
.bgb.bgb-compact .bgb-cannon svg{ width:96px; height:46px; }
.bgb.bgb-compact .bgb-inputbar{ padding:5px 8px 7px; }
.bgb.bgb-compact .bgb-input{ padding:8px 14px; font-size:14px; }
.bgb.bgb-compact .bgb-word{ padding:5px 10px 4px; }
.bgb.bgb-compact .bgb-ko{ font-size:16px; }
.bgb.bgb-compact .bgb-vi{ font-size:8px; }
.bgb.bgb-compact .bgb-vi-main{ font-size:14px; }
`;
  document.head.appendChild(st);
}

const BANSUNG_HTML = `
  <div class="bgb" id="bgb-root">
    <div class="bgb-stars"></div>
    <div class="bgb-flash"></div>

    <div class="bgb-hud">
      <div class="bgb-hud-item">ĐIỂM <b class="bgb-score">0</b></div>
      <div class="bgb-hud-item">CẤP <b class="bgb-level">1</b></div>
      <div class="bgb-hud-item bgb-lives">MẠNG <b class="bgb-livesv">♥♥♥♥♥</b></div>
      <div class="bgb-hud-item">KỶ LỤC <b class="bgb-hs">0</b></div>
      <button class="bgb-hud-item bgb-sound" type="button" title="Bật/tắt âm thanh">🔊</button>
    </div>

    <div class="bgb-field"></div>
    <div class="bgb-proj"></div>

    <div class="bgb-cannon">
      <svg width="140" height="74" viewBox="0 0 150 78">
        <circle cx="35" cy="70" r="10" fill="#3a2c1a" stroke="#8a6a1f" stroke-width="2"/>
        <circle cx="115" cy="70" r="10" fill="#3a2c1a" stroke="#8a6a1f" stroke-width="2"/>
        <rect x="20" y="52" width="110" height="18" rx="3" fill="#2a1f10" stroke="#8a6a1f" stroke-width="1.5"/>
        <g stroke="#f4b942" stroke-width="4" stroke-linecap="round">
          <line x1="75" y1="54" x2="30" y2="10"/>
          <line x1="75" y1="54" x2="52" y2="6"/>
          <line x1="75" y1="54" x2="75" y2="4"/>
          <line x1="75" y1="54" x2="98" y2="6"/>
          <line x1="75" y1="54" x2="120" y2="10"/>
        </g>
        <circle cx="75" cy="54" r="9" fill="#3a2c1a" stroke="#f4b942" stroke-width="2"/>
      </svg>
    </div>

    <div class="bgb-inputbar">
      <input class="bgb-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="...">
    </div>

    <div class="bgb-overlay bgb-start">
      <h2 class="bgb-title">한글 화차<small class="bgb-sub">Bắn Từ Vựng · Từ sổ từ vựng của bạn</small></h2>
      <p class="bgb-desc"></p>
      <div class="bgb-sel-label">Chế độ chơi</div>
      <div class="bgb-modes">
        <button class="bgb-mode active" data-mode="kv">Hàn hiện · Gõ Việt</button>
        <button class="bgb-mode" data-mode="vk">Việt hiện · Gõ Hàn</button>
      </div>
      <button class="bgb-btn bgb-start-btn">BẮT ĐẦU</button>
      <button class="bgb-btn-ghost bgb-close">Đóng</button>
    </div>

    <div class="bgb-overlay bgb-over hidden">
      <div class="bgb-final-label">KẾT THÚC</div>
      <div class="bgb-final-score">0</div>
      <p class="bgb-msg"></p>
      <button class="bgb-btn bgb-restart-btn">CHƠI LẠI</button>
      <button class="bgb-btn-ghost bgb-close">Đóng</button>
    </div>
  </div>
`;

// ---- Game engine ----
window.initBansung = function(list){
  const data = (list || []).map(w => ({ ko: (w.word||'').trim(), vi: (w.meaning||'').trim() })).filter(w => w.ko && w.vi);
  if(!data.length){
    if(window.Swal) Swal.fire('Thông báo', 'Danh sách này không có từ nào hợp lệ để chơi!', 'warning');
    return;
  }
  injectBansungCss();
  const wrap = document.getElementById('gameBansung');
  if(!wrap) return;
  wrap.innerHTML = BANSUNG_HTML;
  const root = wrap.querySelector('.bgb');

  const field = root.querySelector('.bgb-field');
  const projLayer = root.querySelector('.bgb-proj');
  const cannonWrap = root.querySelector('.bgb-cannon');
  const input = root.querySelector('.bgb-input');
  const scoreEl = root.querySelector('.bgb-score');
  const levelEl = root.querySelector('.bgb-level');
  const livesEl = root.querySelector('.bgb-livesv');
  const hsEl = root.querySelector('.bgb-hs');
  const startScreen = root.querySelector('.bgb-start');
  const overScreen = root.querySelector('.bgb-over');
  const finalEl = root.querySelector('.bgb-final-score');
  const msgEl = root.querySelector('.bgb-msg');
  const flash = root.querySelector('.bgb-flash');
  const startBtn = root.querySelector('.bgb-start-btn');
  const restartBtn = root.querySelector('.bgb-restart-btn');
  const soundBtn = root.querySelector('.bgb-sound');

  // Sao nền
  const starsWrap = root.querySelector('.bgb-stars');
  for(let i=0;i<36;i++){
    const s = document.createElement('div');
    s.className='bgb-star';
    s.style.left = Math.random()*100+'%';
    s.style.top = Math.random()*70+'%';
    s.style.animationDelay = (Math.random()*3)+'s';
    starsWrap.appendChild(s);
  }

  // Số lượng từ trong kho
  root.querySelector('.bgb-desc').innerHTML = 'Kho từ vựng của bạn có <b style="color:#f4b942;">'+data.length+'</b> từ. Gõ đúng đáp án rồi nhấn <b>Enter</b> để bắn hạ từ trước khi nó chạm đất! Để lỡ 5 từ là thua cuộc. Không biết từ nào? <b>Nhấn vào từ</b> để bỏ qua (mất 1 mạng).';

  // Kỷ lục (localStorage, riêng cho bản sổ từ vựng)
  let highScore = 0;
  try{ const v = localStorage.getItem('vocab-bansung-highscore'); if(v) highScore = parseInt(v)||0; }catch(e){}
  hsEl.textContent = highScore;

  const IS_MOBILE = window.innerWidth <= 768 || ('ontouchstart' in window);
  const MOBILE_SPEED = 0.8;

  let state = null;
  let rafId = null;
  let lastTime = 0;
  let recentKo = [];
  let selectedMode = 'kv'; // 'kv' Hàn hiện gõ Việt | 'vk' Việt hiện gõ Hàn

  const MODE_PLACEHOLDER = {
    kv: 'Gõ nghĩa tiếng Việt của từ đang rơi rồi nhấn Enter',
    vk: 'Gõ từ tiếng Hàn tương ứng rồi nhấn Enter'
  };

  // Chọn chế độ
  root.querySelectorAll('.bgb-mode').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      root.querySelectorAll('.bgb-mode').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selectedMode = btn.dataset.mode;
    });
  });

  function freshState(){
    return {
      running:false, score:0, level:1, lives:5,
      words:[], spawnTimer:1200, spawnInterval:3200,
      fallSpeed:26*(IS_MOBILE?MOBILE_SPEED:1),
      maxWords:2
    };
  }

  function updateHud(){
    scoreEl.textContent = state.score;
    levelEl.textContent = state.level;
    livesEl.textContent = '♥'.repeat(Math.max(state.lives,0)) + '♡'.repeat(Math.max(5-state.lives,0));
  }

  // Chuẩn hóa đáp án: Hàn giữ nguyên, Việt bỏ dấu (tha thứ gõ không dấu)
  function norm(s, isKorean){
    s = (s||'').trim().toLowerCase();
    if(isKorean) return s;
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  }
  function answerPool(a, isKorean){
    const cleaned = (a||'').replace(/\([^)]*\)/g,' ');
    const parts = cleaned.split(/[,\/，、;；]/).map(p=>norm(p,isKorean)).filter(Boolean);
    return parts.length ? parts : [norm(a,isKorean)];
  }

  function pickVocab(){
    const pool = data.filter(v=>!recentKo.includes(v.ko));
    const bank = pool.length ? pool : data;
    const item = bank[Math.floor(Math.random()*bank.length)];
    recentKo.push(item.ko);
    if(recentKo.length > Math.min(6, data.length)) recentKo.shift();
    return item;
  }

  function spawnWord(){
    if(state.words.length >= state.maxWords) return;
    const vocab = pickVocab();
    const el = document.createElement('div');
    el.className='bgb-word';
    let answer, isKorean;
    if(selectedMode === 'vk'){
      el.innerHTML = '<div class="bgb-vi-main">'+vocab.vi+'</div>';
      answer = vocab.ko; isKorean = true;
    } else {
      el.innerHTML = '<div class="bgb-ko">'+vocab.ko+'</div>';
      answer = vocab.vi; isKorean = false;
    }
    field.appendChild(el);
    const fieldW = field.clientWidth;
    const margin = 50;
    const x = margin + Math.random()*Math.max(fieldW - margin*2, margin);
    el.style.left = x+'px';
    el.style.top = '-40px';
    el.style.cursor = 'pointer';
    const wobj = {el, ko:vocab.ko, vi:vocab.vi, answer, isKorean, pool:answerPool(answer, isKorean), y:-40, x, speed:state.fallSpeed*(0.85+Math.random()*0.3)};
    state.words.push(wobj);
    el.addEventListener('click', function(){
      if(!state || !state.running) return;
      const i = state.words.indexOf(wobj);
      if(i>=0) state.words.splice(i,1);
      loseLife(wobj);
    });
  }

  function levelUp(){
    state.level++;
    window.AudioSys.playLevelUp();
    state.fallSpeed = Math.min(state.fallSpeed + 3, 58);
    state.spawnInterval = Math.max(state.spawnInterval - 220, 1800);
    state.maxWords = Math.min(state.maxWords + (state.level%2===0?1:0), 5);
  }

  function loseLife(word){
    state.lives--;
    window.AudioSys.playLoseLife();
    updateHud();
    flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit');
    word.el.classList.add('life-lost-word');
    setTimeout(()=>word.el.remove(), 350);
    if(state.lives<=0) endGame();
  }

  function spawnExplosion(x,y){
    window.AudioSys.playExplosion();
    for(let i=0;i<9;i++){
      const p = document.createElement('div'); p.className='bgb-particle';
      p.style.left = x+'px'; p.style.top = y+'px';
      const ang = Math.random()*Math.PI*2;
      const dist = 18+Math.random()*36;
      const dx = Math.cos(ang)*dist, dy = Math.sin(ang)*dist;
      field.appendChild(p);
      p.animate([
        {transform:'translate(0,0)', opacity:1},
        {transform:'translate('+dx+'px,'+dy+'px)', opacity:0}
      ], {duration:400, easing:'ease-out'}).onfinish = ()=>p.remove();
    }
    const fl = document.createElement('div'); fl.className='bgb-impact';
    fl.style.left = x+'px'; fl.style.top = y+'px';
    fl.style.background = 'radial-gradient(circle, rgba(79,209,197,0.65), transparent 70%)';
    field.appendChild(fl); setTimeout(()=>fl.remove(), 420);
  }

  function fireAt(word){
    window.AudioSys.playShoot();
    const cRect = cannonWrap.getBoundingClientRect();
    const rRect = root.getBoundingClientRect();
    const startX = cRect.left + cRect.width/2 - rRect.left;
    const startY = cRect.top + 20 - rRect.top;
    const wRect = word.el.getBoundingClientRect();
    const fRect = field.getBoundingClientRect();
    const targetX = wRect.left + wRect.width/2 - fRect.left;
    const targetY = wRect.top + wRect.height/2 - fRect.top;
    const proj = document.createElement('div'); proj.className='bgb-projectile';
    proj.style.left = startX+'px'; proj.style.top = startY+'px';
    projLayer.appendChild(proj);
    const dx = (fRect.left - rRect.left) + targetX - startX;
    const dy = (fRect.top - rRect.top) + targetY - startY;
    const angle = Math.atan2(dy,dx)*180/Math.PI + 90;
    proj.style.transform = 'rotate('+angle+'deg)';
    proj.animate([
      {transform:'translate(0,0) rotate('+angle+'deg)'},
      {transform:'translate('+dx+'px,'+dy+'px) rotate('+angle+'deg)'}
    ], {duration:240, easing:'ease-in'}).onfinish = ()=>{ proj.remove(); spawnExplosion(targetX, targetY); };
  }

  function tryShoot(){
    const raw = input.value.trim();
    if(!raw) return;
    const idx = state.words.findIndex(w=>{
      const t = norm(raw, w.isKorean);
      return w.pool.includes(t);
    });
    if(idx >= 0){
      const word = state.words[idx];
      fireAt(word);
      const gained = 10*state.level + word.answer.length;
      state.score += gained;
      state.words.splice(idx,1);
      setTimeout(()=>word.el.remove(), 80);
      updateHud();
      if(state.score >= state.level*60) levelUp();
      input.value='';
    } else {
      input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
      setTimeout(()=>input.classList.remove('shake'), 300);
    }
  }

  input.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      if(state && state.running) tryShoot();
    }
  });
  input.addEventListener('input', ()=>{
    if(!state) return;
    const typed = norm(input.value.trim(), state.words[0] ? state.words[0].isKorean : false);
    state.words.forEach(w=>{
      const t = norm(input.value.trim(), w.isKorean);
      if(t && w.pool.some(p=>p.startsWith(t))) w.el.classList.add('matched');
      else w.el.classList.remove('matched');
    });
  });

  function loop(ts){
    if(!state || !state.running) return;
    const dt = Math.min((ts-lastTime)/1000, 0.05) || 0;
    lastTime = ts;
    state.spawnTimer += dt*1000;
    if(state.spawnTimer >= state.spawnInterval){
      state.spawnTimer = 0;
      spawnWord();
    }
    const fieldH = field.clientHeight;
    for(let i=state.words.length-1;i>=0;i--){
      const w = state.words[i];
      w.y += w.speed*dt;
      w.el.style.top = w.y+'px';
      if(w.y > fieldH - 20){
        state.words.splice(i,1);
        loseLife(w);
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  function startGame(){
    state = freshState();
    window.AudioSys.ensureCtx();
    window.AudioSys.playStart();
    window.AudioSys.startMusic();
    field.innerHTML='';
    recentKo = [];
    state.running = true;
    updateHud();
    startScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    input.placeholder = MODE_PLACEHOLDER[selectedMode] || MODE_PLACEHOLDER.kv;
    input.value='';
    input.disabled = false;
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
    setTimeout(()=>{ try{ input.focus(); }catch(e){} }, 60);
  }

  // Lưu điểm cao nhất lên Firestore để đưa vào bảng xếp hạng điểm game
  function saveGameScore(score){
    if(typeof firebase === 'undefined' || !window.currentUserUid) return;
    try{
      const db = firebase.firestore();
      const userRef = db.collection('users').doc(window.currentUserUid);
      userRef.get().then(doc => {
        const cur = doc.exists ? (doc.data().gameBansungScore || 0) : 0;
        if(score > cur) userRef.set({ gameBansungScore: score }, { merge: true }).catch(() => {});
      }).catch(() => {});
    }catch(e){}
  }

  function endGame(){
    state.running = false;
    cancelAnimationFrame(rafId);
    window.AudioSys.playGameOver();
    window.AudioSys.stopMusic();
    input.disabled = true;
    finalEl.textContent = state.score;
    if(state.score > highScore){
      highScore = state.score;
      hsEl.textContent = highScore;
      try{ localStorage.setItem('vocab-bansung-highscore', String(highScore)); }catch(e){}
      saveGameScore(highScore);
      msgEl.textContent = 'Kỷ lục mới! Xuất sắc lắm!';
    } else {
      msgEl.textContent = 'Luyện thêm để phá kỷ lục '+highScore+' điểm nhé!';
    }
    setTimeout(()=>overScreen.classList.remove('hidden'), 300);
  }

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  root.querySelectorAll('.bgb-close').forEach(b=>b.addEventListener('click', closeStudy));
  if(soundBtn) soundBtn.addEventListener('click', ()=>{
    const on = !window.AudioSys.isMusicOn();
    window.AudioSys.setMusicOn(on);
    window.AudioSys.setSfxOn(on);
    if(on) window.AudioSys.ensureCtx();
    soundBtn.innerHTML = on ? '🔊' : '🔇';
  });

  // Thu nhỏ game khi bàn phím mobile mở (giữ vùng từ rơi nhìn thấy)
  const modalBox = document.getElementById('gameModalBox');
  function fitModal(){
    if(!window.visualViewport) return;
    const vv = window.visualViewport.height;
    if(vv < 520){
      root.classList.add('bgb-compact');
      modalBox.style.height = vv+'px';
      modalBox.style.maxHeight = vv+'px';
    } else {
      root.classList.remove('bgb-compact');
      modalBox.style.height='';
      modalBox.style.maxHeight='';
    }
  }
  document.addEventListener('focusin', fitModal);
  document.addEventListener('focusout', fitModal);
  window.addEventListener('resize', fitModal);
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', fitModal);
    window.visualViewport.addEventListener('scroll', fitModal);
  }

  // Dọn dẹp khi đóng modal (xóa nút × ở header modal)
  window.__bansungStop = function(){
    cancelAnimationFrame(rafId);
    if(state) state.running = false;
    window.AudioSys.stopMusic();
    document.removeEventListener('focusin', fitModal);
    document.removeEventListener('focusout', fitModal);
    window.removeEventListener('resize', fitModal);
    if(window.visualViewport){
      window.visualViewport.removeEventListener('resize', fitModal);
      window.visualViewport.removeEventListener('scroll', fitModal);
    }
    root.querySelectorAll('.bgb-word').forEach(el=>el.remove());
    modalBox.style.height='';
    modalBox.style.maxHeight='';
  };
};
