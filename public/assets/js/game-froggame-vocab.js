// ============================================================
// ẾCH SĂN TỪ VỰNG (개구리 사냥꾼) — bản nhúng vào sổ từ vựng
// Dùng CHÍNH danh sách từ đã lưu của user. Khác biệt với bản /games:
//  - Không chọn cấp độ (toàn bộ từ của user là kho)
//  - Không có bảng xếp hạng
// Expose: window.initFroggame(list) — list = [{id, word, meaning, ...}]
// ============================================================

let __frgCssInjected = false;
function injectFrgCss(){
  if(__frgCssInjected) return;
  __frgCssInjected = true;
  const st = document.createElement('style');
  st.textContent = `
#gameFroggame{ display:flex; flex-direction:column; flex:1; min-height:0; }
.frg{ position:relative; flex:1; min-height:0; overflow:hidden; font-family:'Inter','Pretendard',sans-serif; color:#EAF6EF; background:#071812;
  user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
.frg *{ box-sizing:border-box; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }

.frg-pond{ position:absolute; inset:0; overflow:hidden;
  background:radial-gradient(ellipse 90% 60% at 50% -10%, rgba(107,231,255,0.10), transparent 60%), radial-gradient(ellipse 120% 80% at 50% 120%, #123a2f, #071812 70%), linear-gradient(180deg,#071812 0%,#0d2921 55%,#123a2f 100%); }
.frg-moon{ position:absolute; top:6%; right:10%; width:60px; height:60px; border-radius:50%; background:radial-gradient(circle at 35% 30%, #fffef4, #dff5e6 60%, transparent 72%); box-shadow:0 0 50px 14px rgba(223,245,230,0.18); opacity:0.85; }
.frg-water{ position:absolute; left:0; right:0; bottom:0; height:46%; background:repeating-linear-gradient(100deg, rgba(107,231,255,0.05) 0px, rgba(107,231,255,0.05) 2px, transparent 2px, transparent 60px); animation:frg-shimmer 9s linear infinite; pointer-events:none; }
@keyframes frg-shimmer{ 0%{ background-position-x:0; } 100%{ background-position-x:600px; } }
.frg-lilypad{ position:absolute; border-radius:50%; background:radial-gradient(circle at 35% 30%, rgba(124,255,178,0.16), rgba(124,255,178,0.05) 70%); border:1px solid rgba(124,255,178,0.14); }
.frg-lilypad.a{ width:130px; height:52px; left:6%; bottom:8%; transform:rotate(-6deg); }
.frg-lilypad.b{ width:95px; height:38px; right:10%; bottom:16%; transform:rotate(8deg); }
.frg-lilypad.c{ width:80px; height:32px; left:38%; bottom:4%; transform:rotate(-3deg); }
.frg-fireflies{ position:absolute; inset:0; pointer-events:none; }
.frg-firefly{ position:absolute; width:4px; height:4px; border-radius:50%; background:#FFD97C; box-shadow:0 0 8px 2px rgba(255,217,124,0.7); animation:frg-firefly-float linear infinite; opacity:0.8; }
@keyframes frg-firefly-float{ 0%{ transform:translate(0,0); opacity:0.2; } 25%{ opacity:0.9; } 50%{ transform:translate(var(--fx), var(--fy)); opacity:0.5; } 75%{ opacity:0.9; } 100%{ transform:translate(0,0); opacity:0.2; } }

.frg-hud{ position:absolute; top:0; left:0; right:0; z-index:20; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; background:linear-gradient(180deg, rgba(7,24,18,0.55), transparent); }
.frg-hud-left{ display:flex; align-items:center; gap:8px; }
.frg-titles{ display:flex; flex-direction:column; line-height:1.15; }
.frg-title{ font-family:'Noto Sans KR',sans-serif; font-weight:900; font-size:15px; color:#7CFFB2; }
.frg-subtitle{ font-size:10px; color:#9FC9B8; }
.frg-hud-center{ font-weight:700; font-size:10px; padding:5px 10px; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(180,255,220,0.16); color:#FFD97C; white-space:nowrap; }
.frg-hud-right{ display:flex; align-items:center; gap:8px; }
.frg-stat{ display:flex; flex-direction:column; align-items:center; padding:3px 10px; background:rgba(255,255,255,0.06); border:1px solid rgba(180,255,220,0.16); border-radius:12px; min-width:48px; }
.frg-stat-label{ font-size:8px; color:#9FC9B8; text-transform:uppercase; letter-spacing:0.6px; }
.frg-stat-value{ font-weight:700; font-size:16px; color:#EAF6EF; }
.frg-lives{ display:flex; gap:4px; }
.frg-life{ width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,0.14); border:1px solid rgba(180,255,220,0.16); }
.frg-life.filled{ background:#FF8B6B; box-shadow:0 0 8px rgba(255,139,107,0.6); }
.frg-icon-btn{ width:32px; height:32px; border-radius:50%; border:1px solid rgba(180,255,220,0.16); background:rgba(255,255,255,0.06); color:#EAF6EF; font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; }

.frg-area{ position:absolute; inset:0; z-index:5; }
.frg-frog{ position:absolute; bottom:8%; left:44%; width:96px; transition:left 1.1s cubic-bezier(.5,.05,.25,1); z-index:12; transform-origin:center bottom; animation:frg-idle 2.6s ease-in-out infinite; }
.frg-frog.facing-left svg{ transform:scaleX(-1); }
.frg-frog.hop{ animation:frg-hop .5s ease-out; }
@keyframes frg-idle{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-4px); } }
@keyframes frg-hop{ 0%{ transform:translateY(0) scale(1,1); } 30%{ transform:translateY(-16px) scale(0.94,1.08); } 55%{ transform:translateY(-16px) scale(1.05,0.95); } 100%{ transform:translateY(0) scale(1,1); } }
.frg-frog svg{ width:100%; height:auto; display:block; filter:drop-shadow(0 10px 14px rgba(0,0,0,0.35)); }

.frg-tongue{ position:absolute; height:9px; width:0; border-radius:6px; background:linear-gradient(90deg, #FF8FA3, #FFB0C0); box-shadow:0 0 10px rgba(255,143,163,0.7); transform-origin:left center; z-index:11; top:0; left:0; }
.frg-tongue::after{ content:''; position:absolute; right:-5px; top:50%; width:13px; height:13px; border-radius:50%; background:#FF8FA3; transform:translateY(-50%); }

.frg-word{ position:absolute; z-index:10; padding:9px 15px; min-width:64px; text-align:center; border-radius:999px; cursor:pointer; background:rgba(255,255,255,0.06); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border:1px solid rgba(180,255,220,0.16); box-shadow:0 6px 22px rgba(0,0,0,0.25); transition:box-shadow .2s, border-color .2s; will-change:top; }
.frg-word .fw-main{ font-family:'Noto Sans KR',sans-serif; font-weight:700; font-size:17px; color:#EAF6EF; }
.frg-word[data-mode="vi"] .fw-main{ font-family:'Inter',sans-serif; font-weight:600; }
.frg-word .fw-sub{ font-size:8px; color:#9FC9B8; margin-top:2px; }
.frg-word .fw-speak{ position:absolute; top:-9px; right:-9px; width:22px; height:22px; border-radius:50%; background:rgba(255,255,255,0.10); border:1px solid rgba(180,255,220,0.16); font-size:11px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.frg-word.selected{ border-color:#6BE7FF; box-shadow:0 0 0 3px rgba(107,231,255,0.18), 0 6px 22px rgba(0,0,0,0.3); }
.frg-word.listening{ border-color:#FFD97C; animation:frg-pulse 1s ease-in-out infinite; }
.frg-word.wrong{ animation:frg-shake .4s ease; border-color:#FF8B6B; }
.frg-word.correct{ animation:frg-pop .38s ease forwards; }
.frg-word.missed{ animation:frg-sink .5s ease forwards; }
@keyframes frg-pulse{ 0%,100%{ box-shadow:0 0 0 0 rgba(255,217,124,0.35);} 50%{ box-shadow:0 0 0 8px rgba(255,217,124,0);} }
@keyframes frg-shake{ 0%,100%{ transform:translateX(0);} 20%{ transform:translateX(-6px);} 40%{ transform:translateX(6px);} 60%{ transform:translateX(-4px);} 80%{ transform:translateX(4px);} }
@keyframes frg-pop{ to{ transform:scale(0.2); opacity:0; } }
@keyframes frg-sink{ to{ transform:translateY(14px) scale(0.7); opacity:0; } }

.frg-particle{ position:absolute; width:6px; height:6px; border-radius:50%; background:#7CFFB2; pointer-events:none; z-index:9; animation:frg-burst .6s ease-out forwards; }
@keyframes frg-burst{ to{ transform:translate(var(--dx),var(--dy)) scale(0); opacity:0; } }
.frg-ripple{ position:absolute; width:10px; height:10px; border-radius:50%; border:2px solid #6BE7FF; pointer-events:none; z-index:8; animation:frg-ripple .7s ease-out forwards; }
@keyframes frg-ripple{ to{ width:70px; height:70px; margin-left:-30px; margin-top:-30px; opacity:0; } }
.frg-pts{ position:absolute; z-index:13; font-weight:700; color:#7CFFB2; pointer-events:none; animation:frg-up .8s ease-out forwards; }
@keyframes frg-up{ to{ transform:translateY(-38px); opacity:0; } }

.frg-toast{ position:absolute; top:64px; left:50%; transform:translateX(-50%) translateY(-10px); padding:7px 18px; border-radius:999px; background:rgba(255,255,255,0.10); border:1px solid rgba(180,255,220,0.16); font-size:12px; font-weight:600; z-index:30; opacity:0; transition:opacity .25s, transform .25s; pointer-events:none; white-space:nowrap; }
.frg-toast.show{ opacity:1; transform:translateX(-50%) translateY(0); }

.frg-textpanel{ position:absolute; left:50%; bottom:22%; transform:translateX(-50%); z-index:25; display:flex; gap:8px; padding:9px; background:rgba(255,255,255,0.10); border:1px solid rgba(180,255,220,0.16); border-radius:999px; backdrop-filter:blur(10px); }
.frg-textpanel input{ background:transparent; border:none; outline:none; color:#EAF6EF; font-family:'Noto Sans KR',sans-serif; font-size:15px; width:min(46vw,220px); padding:4px 8px; }
.frg-textpanel input::placeholder{ color:#9FC9B8; }
.frg-textpanel button{ border:none; border-radius:999px; padding:6px 16px; background:#7CFFB2; color:#06231a; font-weight:700; font-size:12px; cursor:pointer; }

.frg-overlay{ position:absolute; inset:0; z-index:50; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(4,14,10,0.82); backdrop-filter:blur(4px); text-align:center; padding:18px; overflow-y:auto; }
.frg-overlay.hidden{ display:none; }
.frg-big{ font-family:'Noto Sans KR',sans-serif; font-weight:900; font-size:32px; margin:0 0 4px; color:#7CFFB2; }
.frg-big span{ display:block; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; color:#9FC9B8; margin-top:6px; }
.frg-desc{ max-width:400px; color:#9FC9B8; font-size:13px; line-height:1.7; margin:10px 0 16px; }
.frg-option{ margin-bottom:16px; text-align:left; }
.frg-opt-label{ display:block; font-size:10px; color:#9FC9B8; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px; }
.frg-pills{ display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
.frg-pill{ padding:9px 12px; border-radius:999px; border:1px solid rgba(180,255,220,0.16); background:rgba(255,255,255,0.06); color:#9FC9B8; font-size:12px; font-weight:600; cursor:pointer; }
.frg-pill.active{ background:#7CFFB2; color:#06231a; border-color:#7CFFB2; }
.frg-play{ width:100%; max-width:340px; padding:14px; border:none; border-radius:999px; margin-top:6px; background:linear-gradient(135deg,#7CFFB2,#6BE7FF); color:#06231a; font-weight:800; font-size:16px; cursor:pointer; display:block; text-align:center; }
.frg-ghost{ width:100%; max-width:340px; padding:11px; border:1.5px solid rgba(180,255,220,0.16); border-radius:999px; background:transparent; color:#9FC9B8; font-weight:700; font-size:13px; cursor:pointer; margin-top:10px; }
.frg-mic{ font-size:11px; color:#9FC9B8; margin:10px 0 0; }
.frg-panel{ width:min(94%,460px); background:linear-gradient(160deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03)); border:1px solid rgba(180,255,220,0.16); border-radius:26px; padding:26px 22px; }
.frg-panel h2{ font-size:20px; margin:0 0 14px; }
.frg-stats{ display:flex; gap:10px; justify-content:center; margin-bottom:14px; flex-wrap:wrap; }
.frg-stats > div{ background:rgba(255,255,255,0.05); border:1px solid rgba(180,255,220,0.16); border-radius:14px; padding:10px 16px; min-width:90px; }
.frg-stats span{ display:block; font-size:22px; font-weight:800; color:#7CFFB2; }
.frg-stats label{ font-size:10px; color:#9FC9B8; text-transform:uppercase; letter-spacing:0.5px; }
#frg-recordmsg{ color:#9FC9B8; font-size:13px; margin:0 0 14px; }
@media (max-width:600px){
  .frg-hud{ padding:8px; gap:6px; }
  .frg-title{ font-size:13px; }
  .frg-subtitle{ display:none; }
  .frg-frog{ width:80px; }
}
`;
  document.head.appendChild(st);
}

const FRG_FROG_SVG = `<svg viewBox="0 0 140 110" xmlns="http://www.w3.org/2000/svg"><ellipse cx="70" cy="88" rx="46" ry="14" fill="rgba(0,0,0,0.25)"></ellipse><path d="M20 70 Q10 40 40 28 Q70 14 100 28 Q130 40 120 70 Q120 95 70 95 Q20 95 20 70 Z" fill="#4CD98A"></path><path d="M30 72 Q70 92 110 72 Q108 90 70 92 Q32 90 30 72Z" fill="#DFFFEA"></path><circle cx="42" cy="26" r="15" fill="#4CD98A"></circle><circle cx="98" cy="26" r="15" fill="#4CD98A"></circle><circle cx="42" cy="24" r="8" fill="#0B2B1E"></circle><circle cx="98" cy="24" r="8" fill="#0B2B1E"></circle><circle cx="45" cy="21" r="2.6" fill="#fff"></circle><circle cx="101" cy="21" r="2.6" fill="#fff"></circle><path d="M46 62 Q70 76 94 62" stroke="#0B2B1E" stroke-width="3" fill="none" stroke-linecap="round"></path><ellipse cx="18" cy="66" rx="7" ry="5" fill="#3FC97D"></ellipse><ellipse cx="122" cy="66" rx="7" ry="5" fill="#3FC97D"></ellipse></svg>`;

const FRG_HTML = `
  <div class="frg" id="frg-root">
    <div class="frg-pond">
      <div class="frg-moon"></div>
      <div class="frg-water"></div>
      <div class="frg-lilypad a"></div>
      <div class="frg-lilypad b"></div>
      <div class="frg-lilypad c"></div>
      <div class="frg-fireflies" id="frg-fireflies"></div>
    </div>

    <header class="frg-hud">
      <div class="frg-hud-left">
        <button class="frg-icon-btn" id="frg-close" title="Đóng">✕</button>
        <div class="frg-hud-center" id="frg-record">🏆 Kỷ lục: 0</div>
      </div>
      <div class="frg-hud-right">
        <div class="frg-stat"><span class="frg-stat-label">Điểm</span><span class="frg-stat-value" id="frg-score">0</span></div>
        <div class="frg-lives" id="frg-lives"></div>
        <button class="frg-icon-btn" id="frg-mute" title="Bật/tắt nhạc nền">🔊</button>
      </div>
    </header>

    <main class="frg-area" id="frg-area">
      <div class="frg-frog" id="frg-frog">${FRG_FROG_SVG}</div>
    </main>

    <div class="frg-toast" id="frg-toast"></div>

    <div class="frg-overlay frg-start" id="frg-start">
      <h1 class="frg-big">개구리 사냥꾼<span>Ếch Săn Từ Vựng · Từ sổ từ vựng của bạn</span></h1>
      <p class="frg-desc" id="frg-desc"></p>
      <div class="frg-option">
        <span class="frg-opt-label">Chọn chế độ</span>
        <div class="frg-pills" id="frg-mode">
          <button class="frg-pill active" data-mode="ko">한국어 → nói Hàn</button>
          <button class="frg-pill" data-mode="vi">Tiếng Việt → nói Hàn</button>
          <button class="frg-pill" data-mode="mix">Trộn cả hai</button>
        </div>
      </div>
      <button class="frg-play" id="frg-play">Bắt đầu chơi</button>
      <p class="frg-mic" id="frg-mic"></p>
      <button class="frg-ghost" id="frg-startclose">Đóng</button>
    </div>

    <div class="frg-overlay hidden" id="frg-over">
      <div class="frg-panel">
        <h2>Kết thúc lượt chơi 🐸</h2>
        <div class="frg-stats">
          <div><span id="frg-final">0</span><label>Điểm</label></div>
          <div><span id="frg-acc">0%</span><label>Chính xác</label></div>
          <div><span id="frg-best">0</span><label>Chuỗi dài nhất</label></div>
        </div>
        <p id="frg-recordmsg"></p>
        <button class="frg-play" id="frg-retry">Chơi lại</button>
        <button class="frg-ghost" id="frg-overclose">Đóng</button>
      </div>
    </div>
  </div>
`;

window.initFroggame = function(list){
  const userWords = (list || []).map(w => ({ ko:(w.word||'').trim(), vi:(w.meaning||'').trim() })).filter(x => x.ko && x.vi && x.ko.replace(/\s/g,'').length >= 2);
  if(!userWords.length){
    if(window.Swal) Swal.fire('Thông báo', 'Danh sách này không có từ nào hợp lệ để chơi!', 'warning');
    return;
  }
  injectFrgCss();
  const wrap = document.getElementById('gameFroggame');
  if(!wrap) return;
  wrap.innerHTML = FRG_HTML;
  const root = wrap.querySelector('.frg');
  root.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  const gameArea = root.querySelector('#frg-area');
  const frog = root.querySelector('#frg-frog');
  const scoreVal = root.querySelector('#frg-score');
  const livesEl = root.querySelector('#frg-lives');
  const recordBadge = root.querySelector('#frg-record');
  const toastEl = root.querySelector('#frg-toast');
  const startOverlay = root.querySelector('#frg-start');
  const overOverlay = root.querySelector('#frg-over');
  const micNote = root.querySelector('#frg-mic');
  const firefliesWrap = root.querySelector('#frg-fireflies');
  const muteBtn = root.querySelector('#frg-mute');
  const descEl = root.querySelector('#frg-desc');

  const TOTAL_LIVES = 5;
  const PRESET = { fallSpeed: 42, spawnInterval: 3000 };

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const supportsSTT = !!SpeechRecognitionCtor;

  // đom đóm
  for (let i = 0; i < 12; i++) {
    const f = document.createElement('div');
    f.className = 'frg-firefly';
    f.style.left = (Math.random()*100) + '%';
    f.style.top = (10 + Math.random()*70) + '%';
    f.style.setProperty('--fx', (Math.random()*60-30) + 'px');
    f.style.setProperty('--fy', (Math.random()*60-30) + 'px');
    f.style.animationDuration = (4 + Math.random()*5) + 's';
    f.style.animationDelay = (Math.random()*4) + 's';
    firefliesWrap.appendChild(f);
  }

  const state = {
    mode: 'ko', running: false, score: 0, lives: TOTAL_LIVES,
    streak: 0, bestStreak: 0, correctCount: 0, attemptCount: 0, missCount: 0,
    words: [], selectedId: null, isListening: false, speedMultiplier: 1,
    lastVocabIndex: -1, activeTextPanel: null, bestScoreEver: 0, inputType: supportsSTT ? 'voice' : 'text'
  };
  try{ const b = localStorage.getItem('frog_vocab_best'); if (b) state.bestScoreEver = parseInt(b) || 0; }catch(e){}

  // nhạc nền
  let audioCtx = null, masterGain = null, musicStarted = false, musicMuted = false, twinkleTimer = null, ducked = false;
  function currentTargetGain(){ return (musicMuted || ducked) ? 0 : 0.07; }
  function applyMusicGain(dur){ if (!audioCtx || !masterGain) return; masterGain.gain.cancelScheduledValues(audioCtx.currentTime); masterGain.gain.linearRampToValueAtTime(currentTargetGain(), audioCtx.currentTime + (dur || 0.3)); }
  function ensureAudioStarted(){
    if (musicStarted) { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); return; }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      masterGain = audioCtx.createGain(); masterGain.gain.value = musicMuted ? 0 : 0.07; masterGain.connect(audioCtx.destination);
      const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900; filter.connect(masterGain);
      [196.00, 246.94, 293.66].forEach(function(freq, idx){
        const osc = audioCtx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
        const og = audioCtx.createGain(); og.gain.value = 0.0001; osc.connect(og); og.connect(filter); osc.start();
        og.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + 1.1 + idx * 0.3);
        const lfo = audioCtx.createOscillator(); lfo.frequency.value = 0.05 + idx * 0.02;
        const lg = audioCtx.createGain(); lg.gain.value = 0.05; lfo.connect(lg); lg.connect(og.gain); lfo.start();
      });
      scheduleTwinkle();
      musicStarted = true;
    } catch(e){}
  }
  function scheduleTwinkle(){
    function playTwinkle(){
      if (!audioCtx || musicMuted || ducked) { twinkleTimer = setTimeout(playTwinkle, 3500); return; }
      try {
        const scale = [523.25, 587.33, 659.25, 784.00, 880.00];
        const freq = scale[Math.floor(Math.random() * scale.length)];
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
        const g = audioCtx.createGain(); g.gain.value = 0; osc.connect(g);
        g.connect(masterGain);
        osc.start(t);
        g.gain.linearRampToValueAtTime(0.12, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        osc.stop(t + 1.7);
      } catch(e){}
      twinkleTimer = setTimeout(playTwinkle, 3500 + Math.random() * 5000);
    }
    twinkleTimer = setTimeout(playTwinkle, 1500);
  }
  function stopMusic(){ if (twinkleTimer) clearTimeout(twinkleTimer); if (audioCtx && audioCtx.state === 'running') audioCtx.suspend(); }
  muteBtn.addEventListener('click', function(){ musicMuted = !musicMuted; muteBtn.textContent = musicMuted ? '🔇' : '🔊'; applyMusicGain(0.3); });

  // helpers
  function normalizeKo(str){ return (str || '').replace(/[\s.,!?~ㆍ·。，！？]/g, '').trim(); }
  function isMatch(transcript, target){
    const t = normalizeKo(transcript), g = normalizeKo(target);
    if (!t) return false;
    if (t === g) return true;
    if (g.length >= 2 && (t.indexOf(g) !== -1 || g.indexOf(t) !== -1)) return true;
    return false;
  }
  function pickVocab(){
    let idx;
    do { idx = Math.floor(Math.random() * userWords.length); }
    while (userWords.length > 3 && idx === state.lastVocabIndex);
    state.lastVocabIndex = idx;
    return userWords[idx];
  }
  function showToast(text, ms){
    toastEl.textContent = text; toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function(){ toastEl.classList.remove('show'); }, ms || 1500);
  }
  function updateHUD(){
    scoreVal.textContent = state.score;
    livesEl.innerHTML = '';
    for (let i = 0; i < TOTAL_LIVES; i++) {
      const d = document.createElement('div');
      d.className = 'frg-life' + (i < state.lives ? ' filled' : '');
      livesEl.appendChild(d);
    }
  }
  function updateRecordBadge(){ recordBadge.textContent = '🏆 Kỷ lục: ' + state.bestScoreEver; }
  function speak(text){
    if(window.readKorean){ window.readKorean(text, 1); return; }
    if (!('speechSynthesis' in window)) return;
    try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.85; window.speechSynthesis.speak(u); } catch(e){}
  }

  function moveFrogRandomly(){
    const a = gameArea.getBoundingClientRect();
    const fw = frog.offsetWidth;
    const max = a.width - fw - 16, min = 16;
    const old = parseFloat(frog.style.left) || (a.width * 0.44);
    const target = min + Math.random() * (max - min);
    frog.style.left = target + 'px';
    frog.classList.toggle('facing-left', target < old);
    frog.classList.remove('hop'); void frog.offsetWidth; frog.classList.add('hop');
  }

  function spawnWord(){
    if (state.words.length >= 4) return;
    const vocab = pickVocab();
    const displayMode = state.mode === 'mix' ? (Math.random() < 0.5 ? 'ko' : 'vi') : state.mode;
    const a = gameArea.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'frg-word';
    el.setAttribute('data-mode', displayMode);
    const main = document.createElement('div'); main.className = 'fw-main'; main.textContent = displayMode === 'ko' ? vocab.ko : vocab.vi;
    const sub = document.createElement('div'); sub.className = 'fw-sub'; sub.textContent = displayMode === 'ko' ? '읽어보세요' : 'Nói bằng tiếng Hàn';
    const speakBtn = document.createElement('div'); speakBtn.className = 'fw-speak'; speakBtn.textContent = '🔊'; speakBtn.title = 'Nghe cách phát âm';
    el.appendChild(main); el.appendChild(sub); el.appendChild(speakBtn);
    gameArea.appendChild(el);
    const bw = el.offsetWidth || 80;
    const x = 10 + Math.random() * Math.max(10, a.width - bw - 20);
    const word = { id: Date.now() + Math.floor(Math.random()*9999), ko: vocab.ko, vi: vocab.vi, mode: displayMode, el, x, y: -70, caught: false };
    el.style.left = x + 'px';
    el.style.top = word.y + 'px';
    speakBtn.addEventListener('click', function(ev){ ev.stopPropagation(); speak(word.ko); });
    el.addEventListener('click', function(){ selectWord(word); });
    state.words.push(word);
  }
  function removeWord(word, cls){
    if (cls) word.el.classList.add(cls);
    const el = word.el;
    setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 600);
    state.words = state.words.filter(function(w){ return w.id !== word.id; });
    if (state.selectedId === word.id) { state.selectedId = null; closeTextPanel(); }
  }

  function selectWord(word){
    if (!state.running || state.isListening) return;
    if (state.selectedId != null) {
      const prev = state.words.find(function(w){ return w.id === state.selectedId; });
      if (prev) prev.el.classList.remove('selected');
    }
    state.selectedId = word.id;
    word.el.classList.add('selected');
    if (state.inputType === 'voice' && supportsSTT) startVoiceRecognition(word);
    else openTextPanel(word);
  }

  function openTextPanel(word){
    closeTextPanel();
    const panel = document.createElement('div');
    panel.className = 'frg-textpanel';
    const input = document.createElement('input'); input.type = 'text'; input.placeholder = '한국어 입력...';
    const btn = document.createElement('button'); btn.textContent = 'Kiểm tra';
    panel.appendChild(input); panel.appendChild(btn);
    gameArea.appendChild(panel);
    state.activeTextPanel = panel;
    setTimeout(function(){ input.focus(); }, 30);
    function submit(){
      const val = input.value;
      if (!val.trim()) return;
      state.attemptCount++;
      if (isMatch(val, word.ko)) handleCorrect(word); else handleWrong(word);
    }
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function(e){ if (e.key === 'Enter') submit(); });
  }
  function closeTextPanel(){
    if (state.activeTextPanel && state.activeTextPanel.parentNode) state.activeTextPanel.parentNode.removeChild(state.activeTextPanel);
    state.activeTextPanel = null;
  }

  function startVoiceRecognition(word){
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'ko-KR'; recognition.maxAlternatives = 5; recognition.interimResults = false;
      word.el.classList.add('listening');
      state.isListening = true;
      ducked = true; applyMusicGain(0.12);
      showToast('🎤 Đang nghe... hãy nói: ' + (word.mode === 'ko' ? word.ko : '(từ tiếng Hàn tương ứng)'), 2500);
      let finished = false;
      const safety = setTimeout(function(){ if (!finished) { try { recognition.stop(); } catch(e){} } }, 6000);
      recognition.onresult = function(e){
        finished = true; clearTimeout(safety);
        const results = e.results[0]; let matched = false;
        for (let i = 0; i < results.length; i++) { if (isMatch(results[i].transcript, word.ko)) { matched = true; break; } }
        state.attemptCount++;
        word.el.classList.remove('listening');
        state.isListening = false; ducked = false; applyMusicGain(0.5);
        if (matched) handleCorrect(word); else handleWrong(word);
      };
      recognition.onerror = function(){
        finished = true; clearTimeout(safety);
        word.el.classList.remove('listening'); state.isListening = false; ducked = false; applyMusicGain(0.5);
        showToast('⚠️ Không nghe rõ, thử lại nhé!', 1600);
      };
      recognition.onend = function(){ word.el.classList.remove('listening'); state.isListening = false; ducked = false; applyMusicGain(0.5); };
      recognition.start();
    } catch (err) {
      state.isListening = false; ducked = false;
      word.el.classList.remove('listening');
      showToast('⚠️ Không thể dùng micro, chuyển sang gõ chữ.', 2000);
      state.inputType = 'text';
      openTextPanel(word);
    }
  }

  function handleCorrect(word){
    word.el.classList.remove('wrong', 'listening');
    state.score += 10 + Math.min(state.streak * 2, 20);
    state.streak++; state.correctCount++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    state.speedMultiplier = 1 + Math.min(state.correctCount * 0.03, 0.8);
    fireTongue(word);
    burst(word.x + word.el.offsetWidth / 2, word.y + word.el.offsetHeight / 2);
    floatPoints(word.x + word.el.offsetWidth / 2, word.y, '+' + (10 + Math.min((state.streak-1)*2, 20)));
    showToast(state.streak >= 3 ? ('🔥 Chuỗi ' + state.streak + '! Chính xác!') : '✅ Chính xác!', 1200);
    removeWord(word, 'correct');
    closeTextPanel();
    updateHUD();
  }
  function handleWrong(word){
    state.streak = 0;
    word.el.classList.add('wrong');
    setTimeout(function(){ word.el.classList.remove('wrong'); }, 420);
    showToast('❌ Chưa đúng, thử lại nhé!', 1200);
    updateHUD();
  }
  function missWord(word){
    ripple(word.x + word.el.offsetWidth / 2, (gameArea.getBoundingClientRect().height - 30));
    state.streak = 0; state.missCount++; state.lives--;
    removeWord(word, 'missed');
    showToast('💧 "' + word.ko + '" đã chìm mất rồi!', 1300);
    updateHUD();
    if (state.lives <= 0) endGame();
  }

  function fireTongue(word){
    const frogRect = frog.getBoundingClientRect();
    const a = gameArea.getBoundingClientRect();
    const facingLeft = frog.classList.contains('facing-left');
    const mouthX = frogRect.left + frogRect.width * (facingLeft ? 0.22 : 0.82) - a.left;
    const mouthY = frogRect.top + frogRect.height * 0.42 - a.top;
    const targetX = word.x + word.el.offsetWidth / 2, targetY = word.y + word.el.offsetHeight / 2;
    const dx = targetX - mouthX, dy = targetY - mouthY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const tongue = document.createElement('div');
    tongue.className = 'frg-tongue';
    tongue.style.left = mouthX + 'px';
    tongue.style.top = mouthY + 'px';
    tongue.style.transform = 'rotate(' + angle + 'deg)';
    gameArea.appendChild(tongue);
    const anim = tongue.animate([
      { width: '0px' }, { width: dist + 'px', offset: 0.45 }, { width: dist + 'px', offset: 0.6 }, { width: '0px' }
    ], { duration: 420, easing: 'cubic-bezier(.25,.8,.3,1)' });
    anim.onfinish = function(){ if (tongue.parentNode) tongue.parentNode.removeChild(tongue); };
  }
  function burst(x, y){
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('span');
      p.className = 'frg-particle';
      const ang = Math.random() * Math.PI * 2, dist = 18 + Math.random() * 36;
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      p.style.background = i % 2 ? '#6BE7FF' : '#7CFFB2';
      gameArea.appendChild(p);
      (function(el){ el.addEventListener('animationend', function(){ if (el.parentNode) el.parentNode.removeChild(el); }); })(p);
    }
  }
  function ripple(x, y){
    const r = document.createElement('div');
    r.className = 'frg-ripple'; r.style.left = x + 'px'; r.style.top = y + 'px';
    gameArea.appendChild(r);
    r.addEventListener('animationend', function(){ if (r.parentNode) r.parentNode.removeChild(r); });
  }
  function floatPoints(x, y, text){
    const el = document.createElement('div');
    el.className = 'frg-pts'; el.textContent = text; el.style.left = x + 'px'; el.style.top = y + 'px';
    gameArea.appendChild(el);
    el.addEventListener('animationend', function(){ if (el.parentNode) el.parentNode.removeChild(el); });
  }

  let rafId = null, lastTs = null;
  const acc = { spawn: 0, frog: 0 };
  let nextSpawnAt = 900, nextFrogAt = 1500;

  function tick(ts){
    if (!state.running) return;
    if (lastTs == null) lastTs = ts;
    const dt = ts - lastTs; lastTs = ts;
    const a = gameArea.getBoundingClientRect();
    acc.spawn += dt;
    if (acc.spawn >= nextSpawnAt) { spawnWord(); acc.spawn = 0; nextSpawnAt = PRESET.spawnInterval * (0.8 + Math.random() * 0.4); }
    acc.frog += dt;
    if (acc.frog >= nextFrogAt) { moveFrogRandomly(); acc.frog = 0; nextFrogAt = 2200 + Math.random() * 2200; }
    const speedPxPerMs = (PRESET.fallSpeed * state.speedMultiplier) / 1000;
    state.words.slice().forEach(function(w){
      w.y += speedPxPerMs * dt;
      w.el.style.top = w.y + 'px';
      if (w.y > a.height - 60) missWord(w);
    });
    rafId = requestAnimationFrame(tick);
  }

  function resetState(){
    state.words.forEach(function(w){ if (w.el.parentNode) w.el.parentNode.removeChild(w.el); });
    state.words = []; state.score = 0; state.streak = 0; state.bestStreak = 0;
    state.correctCount = 0; state.attemptCount = 0; state.missCount = 0;
    state.speedMultiplier = 1; state.selectedId = null; state.lives = TOTAL_LIVES;
    acc.spawn = 0; acc.frog = 0; nextSpawnAt = 900; nextFrogAt = 1500; lastTs = null;
    closeTextPanel();
    updateHUD();
  }

  function startGame(){
    ensureAudioStarted();
    resetState();
    state.running = true;
    startOverlay.classList.add('hidden');
    overOverlay.classList.add('hidden');
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function endGame(){
    state.running = false;
    if (rafId) cancelAnimationFrame(rafId);
    const accPct = state.attemptCount > 0 ? Math.round((state.correctCount / state.attemptCount) * 100) : 0;
    const isNewRecord = state.score > state.bestScoreEver;
    if (isNewRecord) { state.bestScoreEver = state.score; try{ localStorage.setItem('frog_vocab_best', String(state.bestScoreEver)); }catch(e){} }
    updateRecordBadge();
    root.querySelector('#frg-final').textContent = state.score;
    root.querySelector('#frg-acc').textContent = accPct + '%';
    root.querySelector('#frg-best').textContent = state.bestStreak;
    root.querySelector('#frg-recordmsg').textContent = isNewRecord
      ? '🎉 Kỷ lục mới! Bạn vừa đạt ' + state.score + ' điểm.'
      : 'Luyện thêm để phá kỷ lục ' + state.bestScoreEver + ' điểm nhé!';
    overOverlay.classList.remove('hidden');
    closeTextPanel();
  }

  // mode select
  root.querySelectorAll('#frg-mode .frg-pill').forEach(function(btn){
    btn.addEventListener('click', function(){
      root.querySelectorAll('#frg-mode .frg-pill').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      state.mode = btn.getAttribute('data-mode');
    });
  });

  // mic note
  micNote.textContent = supportsSTT
    ? '🎤 Trò chơi dùng micro để nhận diện phát âm — trình duyệt sẽ xin quyền khi bạn bắt đầu chơi.'
    : '⌨️ Trình duyệt này chưa hỗ trợ nhận diện giọng nói, bạn sẽ trả lời bằng cách gõ chữ tiếng Hàn.';

  descEl.innerHTML = 'Sổ từ vựng của bạn có <b style="color:#7CFFB2;">' + userWords.length + '</b> từ. Từ rơi chầm chậm từ trên xuống — chọn một từ rồi phát âm thật đúng (hoặc gõ chữ Hàn) để chú ếch lè lưỡi bắt lấy!';

  root.querySelector('#frg-play').addEventListener('click', startGame);
  root.querySelector('#frg-retry').addEventListener('click', startGame);
  root.querySelector('#frg-close').addEventListener('click', closeStudy);
  root.querySelector('#frg-startclose').addEventListener('click', closeStudy);
  root.querySelector('#frg-overclose').addEventListener('click', closeStudy);

  // dọn dẹp khi đóng modal
  window.__frogStop = function(){
    state.running = false;
    if (rafId) cancelAnimationFrame(rafId);
    stopMusic();
  };
};
