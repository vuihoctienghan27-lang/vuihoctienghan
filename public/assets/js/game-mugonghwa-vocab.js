// ============================================================
// HOA DÂM BỤT (무궁화 꽃이 피었습니다) — bản nhúng vào sổ từ vựng
// Dùng CHÍNH danh sách từ đã lưu của user + từ điển 49k làm đáp án gây nhiễu
// Expose: window.initMugonghwa(list) — list = [{id, word, meaning, ...}]
// 3 chế độ: Hàn → Việt | Việt → Hàn | Xáo trộn
// ============================================================

let __mghCssInjected = false;
function injectMghCss(){
  if(__mghCssInjected) return;
  __mghCssInjected = true;
  const st = document.createElement('style');
  st.textContent = `
#gameMugonghwa{ display:flex; flex-direction:column; flex:1; min-height:0; }
.mgh{ position:relative; flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden;
  background: radial-gradient(1200px 800px at 50% -10%, #1c1730 0%, #0d0d16 55%, #08070c 100%);
  font-family:'Pretendard', 'Noto Sans KR', sans-serif; color:#f3ece1;
  user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
.mgh *{ box-sizing:border-box; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }

.mgh-topbar{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; z-index:5; flex-shrink:0; }
.mgh-btn{ border:1px solid rgba(243,236,225,0.14); background:rgba(243,236,225,0.05); color:#f3ece1; border-radius:999px; padding:6px 12px; font-size:13px; cursor:pointer; font-weight:700; font-family:'Pretendard', sans-serif; }
.mgh-lives{ display:flex; gap:4px; }
.mgh-life{ width:13px; height:17px; opacity:.35; }
.mgh-life.on{ opacity:1; }
.mgh-life svg{ width:100%; height:100%; display:block; }
.mgh-status{ width:40px; height:40px; border-radius:50%; border:1px solid rgba(243,236,225,0.14); background:rgba(243,236,225,0.05); display:flex; align-items:center; justify-content:center; }
.mgh-dot{ width:30px; height:30px; border-radius:50%; background:#24e6a0; box-shadow:0 0 20px #24e6a0, 0 0 40px rgba(36,230,160,0.45); transition:background .25s, box-shadow .25s; }
.mgh-status.red .mgh-dot{ background:#ff2f6e; box-shadow:0 0 20px #ff2f6e, 0 0 40px rgba(255,47,110,0.45); }
.mgh-hs{ font-size:12px; font-weight:800; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,207,92,.35); background:rgba(255,207,92,0.08); color:#ffcf5c; white-space:nowrap; }
.mgh-timer{ font-size:12px; font-weight:800; padding:6px 10px; border-radius:999px; border:1px solid rgba(243,236,225,0.14); background:rgba(243,236,225,0.05); color:#f3ece1; font-variant-numeric:tabular-nums; white-space:nowrap; }
.mgh-timer.low{ color:#ff2f6e; border-color:#ff2f6e; }

.mgh-arena{ position:relative; flex:1; min-height:0; margin:0 12px 12px; border-radius:16px; overflow:hidden;
  background: linear-gradient(180deg, #241a35 0%, #180f24 38%, #0e0a17 100%); border:1px solid rgba(243,236,225,0.12); }
.mgh-road{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:1; }
.mgh-road polyline{ fill:none; stroke:#8b7bb0; stroke-width:2.6; stroke-linecap:round; stroke-linejoin:round; opacity:.5; }

.mgh-doll-wrap{ position:absolute; top:2%; left:50%; transform:translateX(-50%); width:104px; height:168px; z-index:4; }
.mgh-doll-head{ position:absolute; left:50%; top:4px; transform:translateX(-50%); width:74px; height:80px; perspective:600px; }
.mgh-doll-head .inner{ position:relative; width:100%; height:100%; transform-style:preserve-3d; transition:transform 1s cubic-bezier(.65,0,.35,1); }
.mgh-doll-head.turned .inner{ transform:rotateY(180deg); }
.mgh-face{ position:absolute; inset:0; backface-visibility:hidden; }
.mgh-face.back{ transform:rotateY(180deg); }
.mgh-face svg{ width:100%; height:100%; display:block; }
.mgh-dress{ position:absolute; left:50%; bottom:0; transform:translateX(-50%); width:88px; }
.mgh-dress svg{ width:100%; display:block; }
.mgh-doll-glow{ position:absolute; left:50%; top:-14px; transform:translateX(-50%); width:140px; height:140px; border-radius:50%; background:radial-gradient(closest-side, rgba(255,47,110,.5), transparent 70%); opacity:0; transition:opacity .3s; pointer-events:none; }
.mgh-doll-glow.active{ opacity:1; }
.mgh-muzzle{ position:absolute; left:50%; top:34%; transform:translate(-50%,-50%) scale(0); width:30px; height:30px; border-radius:50%; background:radial-gradient(circle,#fff 0%,#ffcf5c 35%,transparent 70%); pointer-events:none; opacity:0; z-index:6; }
.mgh-muzzle.fire{ animation:mghMuzzle .28s ease-out; }
@keyframes mghMuzzle{ 0%{opacity:1; transform:translate(-50%,-50%) scale(.2);} 100%{opacity:0; transform:translate(-50%,-50%) scale(1.8);} }

.mgh-finish{ position:absolute; top:24%; left:8%; right:8%; height:8px; background:repeating-linear-gradient(90deg,#ffcf5c 0 12px,#1a1424 12px 24px); border-radius:4px; box-shadow:0 0 14px rgba(255,207,92,.35); z-index:2; }
.mgh-finish-label{ position:absolute; top:calc(24% - 20px); left:8%; font-size:9px; letter-spacing:.16em; color:#ffcf5c; font-weight:700; z-index:2; }

/* Hoạt cảnh trang trí (cây, đèn, cờ) */
.mgh-scenery{ position:absolute; inset:0; pointer-events:none; z-index:1; }
.mgh-scenery svg{ position:absolute; width:40px; height:auto; opacity:.55; filter:saturate(.8); }
.mgh-scenery svg.left{ left:4%; }
.mgh-scenery svg.right{ right:4%; }
.mgh-scenery svg.lamp{ width:24px; }
.mgh-scenery svg.banner{ width:36px; }

/* Thanh tiến độ realtime bên phải */
.mgh-progress{ position:absolute; right:14px; top:8%; bottom:20%; width:6px; background:rgba(243,236,225,.08); border-radius:4px; z-index:2; }
.mgh-progress-fill{ position:absolute; bottom:0; left:0; width:100%; background:linear-gradient(180deg,#24e6a0,#ffcf5c); border-radius:4px; height:0%; transition:height .1s linear; }
.mgh-progress-pct{ position:absolute; top:-22px; left:50%; transform:translateX(-50%); font-size:11px; font-weight:800; color:#ffcf5c; text-shadow:0 0 6px rgba(0,0,0,.7); white-space:nowrap; font-variant-numeric:tabular-nums; }

.mgh-runner{ position:absolute; left:50%; bottom:10%; width:48px; height:76px; transform:translate(-50%,0); transition:bottom .08s linear, left .08s linear; z-index:3; }
.mgh-runner svg{ width:100%; height:100%; display:block; filter:drop-shadow(0 6px 8px rgba(0,0,0,.4)); }
.mgh-runner.hit{ animation:mghShake .35s ease; }
@keyframes mghShake{ 0%,100%{transform:translate(-50%,0) rotate(0);} 25%{transform:translate(-56%,0) rotate(-8deg);} 75%{transform:translate(-44%,0) rotate(8deg);} }

.mgh-laser{ position:absolute; height:3px; transform-origin:left center; background:linear-gradient(90deg, rgba(255,47,110,.05), #ff2f6e 25%, #fff 50%, #ff2f6e 75%, rgba(255,47,110,.05)); box-shadow:0 0 12px rgba(255,47,110,.95); border-radius:2px; opacity:0; z-index:6; pointer-events:none; }
.mgh-laser.fire{ animation:mghLaser .3s ease-out; }
@keyframes mghLaser{ 0%{opacity:1;} 75%{opacity:1;} 100%{opacity:0;} }
.mgh-blood{ position:absolute; width:7px; height:7px; border-radius:50%; background:#c2263f; box-shadow:0 0 6px rgba(194,38,63,.85); pointer-events:none; z-index:7; }

.mgh-footpad{ position:absolute; right:14px; bottom:14px; width:64px; height:64px; border-radius:50%; background:radial-gradient(closest-side,#2a2038,#16101f); border:2px solid #7a1636; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:7; }
.mgh-footpad.active{ transform:scale(.94); border-color:#24e6a0; box-shadow:0 0 0 8px rgba(36,230,160,.12); }
.mgh-footpad svg{ width:34px; height:34px; fill:#f3ece1; }

.mgh-overlay{ position:absolute; inset:0; z-index:10; background:rgba(8,7,12,.93); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:18px; overflow-y:auto; }
.mgh-overlay.hidden{ display:none; }
.mgh-title{ font-family:'Pretendard', sans-serif; font-weight:900; font-size:40px; color:#ff2f6e; margin:0 0 4px; }
.mgh-title small{ display:block; font-family:'Pretendard', sans-serif; font-size:15px; color:rgba(243,236,225,.6); font-weight:600; margin-top:6px; }
.mgh-desc{ max-width:420px; color:rgba(243,236,225,.75); font-size:15px; line-height:1.75; margin:10px 0 18px; }
.mgh-sel-label{ font-size:12px; letter-spacing:2px; text-transform:uppercase; color:rgba(243,236,225,.55); margin:2px 0 10px; }
.mgh-modes{ display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; justify-content:center; }
.mgh-mode{ font-family:'Pretendard', sans-serif; font-weight:800; font-size:15px; color:rgba(243,236,225,.75); background:rgba(243,236,225,.06); border:2px solid rgba(243,236,225,.16); padding:11px 20px; border-radius:24px; cursor:pointer; transition:all .15s; }
.mgh-mode.active{ color:#0d0d16; background:#24e6a0; border-color:#24e6a0; box-shadow:0 0 14px rgba(36,230,160,.4); }
.mgh-startbtn{ font-family:'Pretendard', sans-serif; font-weight:800; font-size:18px; color:#0d0d16; background:linear-gradient(180deg,#ffcf5c,#e0a02e); border:none; padding:15px 40px; border-radius:30px; cursor:pointer; box-shadow:0 4px 0 #8a6a1f, 0 8px 20px rgba(255,207,92,.3); }
.mgh-startbtn:active{ transform:translateY(3px); }
.mgh-ghost{ font-family:'Pretendard', sans-serif; font-weight:700; font-size:15px; color:rgba(243,236,225,.75); background:transparent; border:2px solid rgba(243,236,225,.16); padding:11px 28px; border-radius:30px; cursor:pointer; margin-top:14px; }
.mgh-final-label{ font-size:11px; letter-spacing:2px; color:rgba(243,236,225,.6); text-transform:uppercase; }
.mgh-final{ font-family:'Pretendard', sans-serif; font-weight:900; font-size:40px; color:#24e6a0; margin:4px 0 2px; }
.mgh-overmsg{ color:rgba(243,236,225,.7); font-size:14px; margin:6px 0 16px; }

.mgh-quiz{ position:absolute; inset:0; z-index:11; background:rgba(8,7,12,.88); display:flex; align-items:center; justify-content:center; padding:16px; opacity:0; pointer-events:none; transition:opacity .25s; }
.mgh-quiz.show{ opacity:1; pointer-events:all; }
.mgh-quizcard{ background:#16121f; border:1px solid rgba(243,236,225,.14); border-radius:16px; padding:20px 18px; width:100%; max-width:460px; max-height:86vh; overflow-y:auto; text-align:left; }
.mgh-quizhint{ font-size:11px; letter-spacing:.12em; color:#ffcf5c; font-weight:700; text-transform:uppercase; margin-bottom:8px; }
.mgh-quizq{ font-family:'Noto Sans KR', sans-serif; font-size:24px; font-weight:800; color:#f3ece1; margin:0 0 16px; line-height:1.5; word-break:break-word; }
.mgh-quizopts{ display:flex; flex-direction:column; gap:9px; }
.mgh-opt{ text-align:left; padding:11px 13px; border-radius:11px; border:1px solid rgba(243,236,225,.14); background:rgba(243,236,225,.03); color:#f3ece1; font-size:14px; line-height:1.5; cursor:pointer; font-family:'Pretendard', 'Noto Sans KR', sans-serif; transition:border-color .12s, background .12s; }
.mgh-opt.correct{ border-color:#24e6a0; background:rgba(36,230,160,.14); }
.mgh-opt.wrong{ border-color:#ff2f6e; background:rgba(255,47,110,.14); }

.mgh-caught{ position:absolute; inset:0; z-index:9; background:rgba(255,47,110,.12); display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity .15s; }
.mgh-caught.show{ opacity:1; }
.mgh-caughttext{ font-family:'Pretendard', sans-serif; font-weight:800; font-size:15px; letter-spacing:.1em; color:#ff2f6e; background:rgba(13,13,22,.75); padding:10px 22px; border-radius:999px; border:1px solid #7a1636; }
.mgh-flash{ position:absolute; inset:0; background:#ff2f6e; opacity:0; pointer-events:none; z-index:8; }
@media (max-width:600px){
  .mgh-arena{ margin:0 6px 8px; border-radius:14px; }
  .mgh-topbar{ padding:8px 8px; gap:6px; }
  .mgh-hs, .mgh-timer{ font-size:11px; padding:5px 8px; }
  .mgh-status{ width:34px; height:34px; }
  .mgh-dot{ width:26px; height:26px; }
  .mgh-footpad{ right:10px; bottom:10px; width:56px; height:56px; }
  .mgh-footpad svg{ width:30px; height:30px; }
  .mgh-progress{ right:8px; }
}
`;
  document.head.appendChild(st);
}

const MGH_LIFE_SVG = `<svg viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="5" r="5" fill="#f3ece1"/><path d="M2 20 L4 8 L12 8 L14 20 Z" fill="#ff2f6e"/></svg>`;
function mghRunnerSvg(color){
  return `<svg viewBox="0 0 34 56" xmlns="http://www.w3.org/2000/svg"><circle cx="17" cy="10" r="8" fill="#f3ece1"/><rect x="8" y="18" width="18" height="26" rx="6" fill="${color}"/><rect x="9" y="42" width="7" height="12" rx="3" fill="#241a2d"/><rect x="18" y="42" width="7" height="12" rx="3" fill="#241a2d"/></svg>`;
}
const MGH_DOLL_FRONT = `<svg viewBox="0 0 88 96" xmlns="http://www.w3.org/2000/svg"><path d="M14 30 C14 6 74 6 74 30 C74 30 76 60 68 74 C60 88 28 88 20 74 C12 60 14 30 14 30 Z" fill="#f3ece1"/><path d="M12 26 C12 6 76 6 76 26 C76 14 12 14 12 26Z" fill="#241a2d"/><circle cx="32" cy="42" r="3.6" fill="#0d0d16"/><circle cx="56" cy="42" r="3.6" fill="#0d0d16"/><path d="M32 60 Q44 67 56 60" stroke="#c22a52" stroke-width="3.2" fill="none" stroke-linecap="round"/><rect x="20" y="8" width="48" height="8" rx="4" fill="#ffcf5c"/></svg>`;
const MGH_DOLL_BACK = `<svg viewBox="0 0 88 96" xmlns="http://www.w3.org/2000/svg"><path d="M14 30 C14 6 74 6 74 30 C74 46 72 58 60 66 L44 70 L28 66 C16 58 14 46 14 30Z" fill="#241a2d"/><path d="M20 34 Q44 40 68 34" stroke="#3a2c46" stroke-width="3" fill="none" opacity=".6"/><path d="M20 44 Q44 50 68 44" stroke="#3a2c46" stroke-width="3" fill="none" opacity=".6"/><path d="M20 54 Q44 60 68 54" stroke="#3a2c46" stroke-width="3" fill="none" opacity=".6"/><rect x="20" y="8" width="48" height="8" rx="4" fill="#e0b04a"/></svg>`;
const MGH_DOLL_DRESS = `<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg"><path d="M14 110 L26 20 L74 20 L86 110 Z" fill="#ff2f6e"/><path d="M14 110 L26 20 L50 20 L42 110 Z" fill="#ff5384"/><rect x="18" y="16" width="64" height="10" rx="5" fill="#ffcf5c"/><circle cx="50" cy="21" r="7" fill="#f3ece1"/></svg>`;
const MGH_FOOT = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="40" rx="17" ry="22"/><circle cx="13" cy="18" r="5.5"/><circle cx="23" cy="12" r="6"/><circle cx="34" cy="11" r="6.2"/><circle cx="45" cy="13" r="5.6"/><circle cx="53" cy="19" r="5"/></svg>`;

const MGH_HTML = `
  <div class="mgh" id="mgh-root">
    <div class="mgh-topbar">
      <button class="mgh-btn" id="mgh-close" title="Đóng">✕</button>
      <div class="mgh-lives" id="mgh-lives"></div>
      <div class="mgh-status" id="mgh-status"><span class="mgh-dot" id="mgh-dot"></span></div>
      <div class="mgh-hs">🏆 <b id="mgh-hs">0%</b></div>
      <div class="mgh-timer" id="mgh-timer">⏱ <b>5:00</b></div>
      <button class="mgh-btn" id="mgh-mute" title="Bật/tắt âm thanh">🔊</button>
    </div>

    <div class="mgh-arena" id="mgh-arena">
      <svg class="mgh-road" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline id="mgh-poly"/></svg>

      <div class="mgh-doll-glow" id="mgh-glow"></div>
      <div class="mgh-doll-wrap">
        <div class="mgh-doll-head" id="mgh-doll">
          <div class="inner">
            <div class="mgh-face front">${MGH_DOLL_FRONT}</div>
            <div class="mgh-face back">${MGH_DOLL_BACK}</div>
          </div>
        </div>
        <div class="mgh-dress">${MGH_DOLL_DRESS}</div>
        <div class="mgh-muzzle" id="mgh-muzzle"></div>
      </div>

      <div class="mgh-finish"></div>
      <div class="mgh-finish-label">결승선 · ĐÍCH</div>
      <div class="mgh-progress"><div class="mgh-progress-fill" id="mgh-progress-fill"></div><div class="mgh-progress-pct" id="mgh-progress-pct">0%</div></div>

      <div class="mgh-scenery" aria-hidden="true">
        <svg class="left" style="top:30%" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg"><rect x="17" y="34" width="6" height="26" fill="#4a3350"/><circle cx="20" cy="26" r="17" fill="#3d7a5c"/><circle cx="10" cy="34" r="11" fill="#33684e"/><circle cx="30" cy="34" r="11" fill="#33684e"/></svg>
        <svg class="lamp right" style="top:38%" viewBox="0 0 30 70" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="14" width="4" height="56" fill="#3a2c46"/><circle cx="15" cy="10" r="10" fill="#ffcf5c" opacity="0.9"/><circle cx="15" cy="10" r="16" fill="#ffcf5c" opacity="0.18"/></svg>
        <svg class="right" style="top:50%" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg"><rect x="17" y="34" width="6" height="26" fill="#4a3350"/><circle cx="20" cy="26" r="17" fill="#3d7a5c"/><circle cx="10" cy="34" r="11" fill="#33684e"/><circle cx="30" cy="34" r="11" fill="#33684e"/></svg>
        <svg class="banner left" style="top:60%" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg"><rect x="22" y="4" width="6" height="56" fill="#3a2c46"/><path d="M28 8 L48 14 L28 20 Z" fill="#ff2f6e"/></svg>
        <svg class="lamp left" style="top:70%" viewBox="0 0 30 70" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="14" width="4" height="56" fill="#3a2c46"/><circle cx="15" cy="10" r="10" fill="#ffcf5c" opacity="0.9"/><circle cx="15" cy="10" r="16" fill="#ffcf5c" opacity="0.18"/></svg>
        <svg class="left" style="top:82%" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg"><rect x="17" y="34" width="6" height="26" fill="#4a3350"/><circle cx="20" cy="26" r="17" fill="#3d7a5c"/><circle cx="10" cy="34" r="11" fill="#33684e"/><circle cx="30" cy="34" r="11" fill="#33684e"/></svg>
        <svg class="right" style="top:90%" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg"><rect x="17" y="34" width="6" height="26" fill="#4a3350"/><circle cx="20" cy="26" r="17" fill="#3d7a5c"/><circle cx="10" cy="34" r="11" fill="#33684e"/><circle cx="30" cy="34" r="11" fill="#33684e"/></svg>
      </div>

      <div class="mgh-runner" id="mgh-runner"></div>
      <div class="mgh-laser" id="mgh-laser"></div>
      <div class="mgh-footpad" id="mgh-footpad">${MGH_FOOT}</div>
    </div>

    <div class="mgh-flash" id="mgh-flash"></div>
    <div class="mgh-caught" id="mgh-caught"><div class="mgh-caughttext" id="mgh-caughttext">BỊ PHÁT HIỆN</div></div>

    <div class="mgh-overlay mgh-start" id="mgh-start">
      <h2 class="mgh-title">무궁화<small>Hoa Dâm Bụt · Trò chơi từ vựng</small></h2>
      <p class="mgh-desc" id="mgh-desc"></p>
      <div class="mgh-sel-label">Chế độ chơi</div>
      <div class="mgh-modes">
        <button class="mgh-mode active" data-mode="han2vn">Hàn → Việt</button>
        <button class="mgh-mode" data-mode="vn2han">Việt → Hàn</button>
        <button class="mgh-mode" data-mode="mixed">Xáo trộn</button>
      </div>
      <button class="mgh-startbtn" id="mgh-startbtn">BẮT ĐẦU</button>
      <button class="mgh-ghost" id="mgh-startclose">Đóng</button>
    </div>

    <div class="mgh-overlay hidden" id="mgh-over">
      <div class="mgh-final-label">KẾT THÚC</div>
      <div class="mgh-final" id="mgh-final">0%</div>
      <p class="mgh-overmsg" id="mgh-overmsg"></p>
      <button class="mgh-startbtn" id="mgh-retry">CHƠI LẠI</button>
      <button class="mgh-ghost" id="mgh-overclose">Đóng</button>
    </div>

    <div class="mgh-quiz" id="mgh-quiz">
      <div class="mgh-quizcard">
        <div class="mgh-quizhint" id="mgh-quizhint"></div>
        <div class="mgh-quizq" id="mgh-quizq"></div>
        <div class="mgh-quizopts" id="mgh-quizopts"></div>
      </div>
    </div>
  </div>
`;

window.initMugonghwa = function(list){
  const userWords = (list || []).map(w => ({ id:w.id, word:(w.word||'').trim(), meaning:(w.meaning||'').trim() })).filter(w => w.word && w.meaning);
  if(!userWords.length){
    if(window.Swal) Swal.fire('Thông báo', 'Danh sách này không có từ nào hợp lệ để chơi!', 'warning');
    return;
  }
  injectMghCss();
  const wrap = document.getElementById('gameMugonghwa');
  if(!wrap) return;
  wrap.innerHTML = MGH_HTML;
  const root = wrap.querySelector('.mgh');
  const arena = root.querySelector('#mgh-arena');
  // Vô hiệu hóa menu ngữ cảnh (copy / tra cứu) khi ấn-giữ trong game
  root.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  // ---- refs ----
  const livesEl = root.querySelector('#mgh-lives');
  const statusEl = root.querySelector('#mgh-status');
  const hsEl = root.querySelector('#mgh-hs');
  const timerEl = root.querySelector('#mgh-timer');
  const muteBtn = root.querySelector('#mgh-mute');
  const doll = root.querySelector('#mgh-doll');
  const glow = root.querySelector('#mgh-glow');
  const muzzle = root.querySelector('#mgh-muzzle');
  const runner = root.querySelector('#mgh-runner');
  const laserEl = root.querySelector('#mgh-laser');
  const footpad = root.querySelector('#mgh-footpad');
  const flash = root.querySelector('#mgh-flash');
  const caughtBanner = root.querySelector('#mgh-caught');
  const caughtText = root.querySelector('#mgh-caughttext');
  const startScreen = root.querySelector('#mgh-start');
  const overScreen = root.querySelector('#mgh-over');
  const finalEl = root.querySelector('#mgh-final');
  const overMsg = root.querySelector('#mgh-overmsg');
  const quizModal = root.querySelector('#mgh-quiz');
  const quizHint = root.querySelector('#mgh-quizhint');
  const quizQ = root.querySelector('#mgh-quizq');
  const quizOpts = root.querySelector('#mgh-quizopts');
  const descEl = root.querySelector('#mgh-desc');
  const progressFillEl = root.querySelector('#mgh-progress-fill');
  const progressPctEl = root.querySelector('#mgh-progress-pct');

  // ---- state ----
  const TOTAL_LIVES = 3;
  const WIN_PROGRESS = 100;
  const HOLD_SPEED = 1.4;
  const TIME_LIMIT = 300;
  const START_BOTTOM_PCT = 10;
  const END_BOTTOM_PCT = 74;
  let lives, progress, round, correctCount, holding, lightGreen, roundActive, dollTimer, graceTimer, timerInterval, timeLeft, deathReason;
  let selectedMode = 'han2vn';
  let highScore = 0;
  let muted = false;
  let lastRate = 1;
  try{ const v = localStorage.getItem('mugonghwa-vocab-highscore'); if(v) highScore = parseInt(v)||0; }catch(e){}
  hsEl.textContent = highScore + '%';

  // ---- audio ----
  const audioEl = document.createElement('audio');
  audioEl.preload = 'auto';
  audioEl.src = 'https://principal-teal-puqhqs9m.edgeone.dev/';
  let actx = null;
  function audioCtx(){ if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)(); return actx; }
  function playCall(){
    if(muted) return;
    try{
      const POOL = [0.8,0.9,1.0,1.1,1.2,1.35,1.5,1.65,1.8,2.0];
      lastRate = POOL[Math.floor(Math.random()*POOL.length)];
      audioEl.playbackRate = lastRate;
      audioEl.currentTime = 0;
      audioEl.play();
    }catch(e){}
  }
  function stopCall(){ try{ audioEl.pause(); audioEl.currentTime = 0; }catch(e){} }
  function playGunshot(){
    if(muted) return;
    try{
      const c = audioCtx(); const now = c.currentTime;
      const buf = c.createBuffer(1, Math.floor(c.sampleRate*0.25), c.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<d.length;i++){ const dec = Math.pow(1-i/d.length,3); d[i] = (Math.random()*2-1)*dec; }
      const n = c.createBufferSource(); n.buffer = buf;
      const f = c.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(4200,now); f.frequency.exponentialRampToValueAtTime(300,now+0.22);
      const g = c.createGain(); g.gain.setValueAtTime(0.5,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.26);
      n.connect(f); f.connect(g); g.connect(c.destination); n.start(now);
      const t = c.createOscillator(); t.type='triangle'; t.frequency.setValueAtTime(140,now); t.frequency.exponentialRampToValueAtTime(38,now+0.22);
      const tg = c.createGain(); tg.gain.setValueAtTime(0.55,now); tg.gain.exponentialRampToValueAtTime(0.001,now+0.28);
      t.connect(tg); tg.connect(c.destination); t.start(now); t.stop(now+0.3);
    }catch(e){}
  }
  muteBtn.addEventListener('click', ()=>{ muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊'; if(muted) stopCall(); });

  // ---- difficulty path ----
  // 10 dạng đường ngoằn nghèo / xoắn ốc — mỗi lần vào game chọn ngẫu nhiên 1 dạng
  const PATHS = [
    p => 50 + 30*Math.sin(p*Math.PI*5),
    p => 50 + 30*Math.sin(p*Math.PI*3),
    p => 50 + 28*Math.sin(p*Math.PI*7)*(0.5 + p*0.5),
    p => 50 + 30*Math.sin(p*Math.PI*5 + Math.sin(p*Math.PI*2)*1.3),
    p => 50 + 34*Math.sin(p*Math.PI*2.5),
    p => 50 + 32*Math.sin(p*Math.PI*6)*(1 - p*0.6),
    p => 50 + 32*Math.sin(p*Math.PI*6)*p,
    p => 50 + 30*(2*Math.abs(2*((p*4+0.5)%1)-1)-1),
    p => 50 + 28*Math.sin(p*Math.PI*4 + Math.PI/4),
    p => 50 + 30*Math.sin(p*Math.PI*3 + Math.sin(p*Math.PI*3)*2)
  ];
  let currentPath = PATHS[Math.floor(Math.random()*PATHS.length)];
  function pathX(pct){ return currentPath(pct); }
  function pathBottom(pct){ return START_BOTTOM_PCT + pct*(END_BOTTOM_PCT - START_BOTTOM_PCT); }
  function buildPath(){
    const pts = [];
    for(let i=0;i<=100;i+=2){ const p=i/100; pts.push(pathX(p).toFixed(2)+','+(100-pathBottom(p)).toFixed(2)); }
    const poly = root.querySelector('#mgh-poly');
    if(poly) poly.setAttribute('points', pts.join(' '));
  }
  buildPath();

  // ---- lives / timer / status ----
  function renderLives(){
    livesEl.innerHTML = '';
    for(let i=0;i<TOTAL_LIVES;i++){
      const d = document.createElement('div');
      d.className = 'mgh-life' + (i<lives ? ' on' : '');
      d.innerHTML = MGH_LIFE_SVG;
      livesEl.appendChild(d);
    }
  }
  function updateStatus(){ statusEl.classList.toggle('red', !lightGreen); }
  function updateTimer(){
    timerEl.classList.toggle('low', timeLeft <= 60);
    timerEl.querySelector('b').textContent = Math.floor(timeLeft/60) + ':' + String(timeLeft%60).padStart(2,'0');
  }
  function startTimer(){
    stopTimer();
    timeLeft = TIME_LIMIT; updateTimer();
    timerInterval = setInterval(()=>{
      timeLeft--; updateTimer();
      if(timeLeft <= 0){
        stopTimer(); roundActive = false;
        clearTimeout(dollTimer); clearTimeout(graceTimer);
        stopCall(); holding = false; footpad.classList.remove('active');
        deathReason = 'timeout'; endGame(false);
      }
    }, 1000);
  }
  function stopTimer(){ if(timerInterval){ clearInterval(timerInterval); timerInterval = null; } }

  function saveHighScore(score){
    if(score > highScore){
      highScore = score; hsEl.textContent = highScore + '%';
      try{ localStorage.setItem('mugonghwa-vocab-highscore', String(highScore)); }catch(e){}
    }
  }

  // ---- question builder (user vocab + 49k dictionary distractors) ----
  // Loại các giá trị nhiễu chung chung / placeholder + hạn chế lặp lại ở các câu liên tiếp
  const recentDistractors = [];
  function isBadDistractorVal(val){
    const v = (val || '').trim();
    if(!v) return true;
    if(v.length < 3) return true;
    if(v.indexOf('Không có từ tương ứng') >= 0) return true;
    if(/^[\s,;，、()]+$/.test(v)) return true;
    return false;
  }
  function makeDistractors(target, kind){
    const dist = [];
    // 1) Từ danh sách từ vựng của user (xáo trộn — không luôn lấy 2 từ đầu)
    const others = userWords.filter(w => w.id !== target.id).slice().sort(() => Math.random()-0.5);
    for(const w of others){
      const val = (kind === 'v' ? w.meaning : w.word) || '';
      if(isBadDistractorVal(val)) continue;
      if(val !== target.meaning && val !== target.word && !dist.includes(val)) dist.push(val);
      if(dist.length >= 2) break;
    }
    // 2) Từ từ điển 49k: ngẫu nhiên, loại giá trị chung chung + không trùng đáp án + không lặp lại gần đây
    const dict = window.AutoVocabDictFull;
    let guard = 0;
    while(dist.length < 3 && dict && dict.length && guard < 400){
      guard++;
      const e = dict[Math.floor(Math.random()*dict.length)];
      const val = ((kind === 'v' ? e.m : e.w) || '').trim();
      if(isBadDistractorVal(val)) continue;
      if(val === target.meaning || val === target.word) continue;
      if(dist.includes(val)) continue;
      if(recentDistractors.indexOf(val) >= 0) continue;
      dist.push(val);
    }
    // 3) Nếu chưa đủ 3, bổ sung từ danh sách user
    if(dist.length < 3){
      for(const w of others){
        const val = (kind === 'v' ? w.meaning : w.word) || '';
        if(isBadDistractorVal(val)) continue;
        if(val === target.meaning || val === target.word || dist.includes(val)) continue;
        dist.push(val);
        if(dist.length >= 3) break;
      }
    }
    // Ghi nhớ các đáp án vừa dùng để câu sau không lặp lại ngay (giới hạn 60 giá trị gần nhất)
    dist.forEach(d => {
      recentDistractors.push(d);
      if(recentDistractors.length > 60) recentDistractors.shift();
    });
    return dist;
  }
  function buildQuestion(){
    if(!userWords.length) return null;
    const target = userWords[Math.floor(Math.random()*userWords.length)];
    const dir = selectedMode === 'mixed' ? (Math.random()<0.5 ? 'h2v' : 'v2h') : (selectedMode === 'vn2han' ? 'v2h' : 'h2v');
    let qText, correct, dist;
    if(dir === 'h2v'){
      qText = target.word; correct = target.meaning; dist = makeDistractors(target, 'v');
    } else {
      qText = target.meaning; correct = target.word; dist = makeDistractors(target, 'k');
    }
    if(dist.length < 3) return buildQuestion();
    const opts = [correct, dist[0], dist[1], dist[2]];
    for(let i=opts.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=opts[i]; opts[i]=opts[j]; opts[j]=t; }
    return { qText, opts, a: opts.indexOf(correct), dir };
  }

  // ---- game flow ----
  function setLight(green){
    lightGreen = green;
    updateStatus();
    clearTimeout(dollTimer);
    if(green){
      doll.classList.add('turned');
      glow.classList.remove('active');
      playCall();
      const goRed = ()=>{ audioEl.removeEventListener('ended', goRed); setLight(false); };
      audioEl.addEventListener('ended', goRed);
      const dur = (isFinite(audioEl.duration) && audioEl.duration > 0) ? audioEl.duration : 5.6;
      dollTimer = setTimeout(()=>{ audioEl.removeEventListener('ended', goRed); setLight(false); }, Math.min(Math.max((dur/(lastRate||1)+1.5)*1000, 3000), 12000));
    } else {
      stopCall();
      doll.classList.remove('turned');
      glow.classList.add('active');
      clearTimeout(graceTimer);
      if(holding){
        // Đang di chuyển → bị phát hiện ngay
        graceTimer = setTimeout(caughtByMoving, 260);
      } else {
        // Đứng yên → đợi búp bê quay mặt lại HẲN rồi mới hiện bảng câu hỏi
        graceTimer = setTimeout(openQuiz, 1050);
      }
    }
  }
  function startRound(){ round++; roundActive = true; setLight(true); }

  function tick(){
    if(!roundActive) return;
    if(holding && lightGreen){
      progress = Math.min(WIN_PROGRESS, progress + HOLD_SPEED*(16/1000));
      if(progressFillEl) progressFillEl.style.height = progress + '%';
      if(progressPctEl) progressPctEl.textContent = Math.round(progress) + '%';
      const p = progress/100;
      runner.style.bottom = pathBottom(p) + '%';
      runner.style.left = pathX(p) + '%';
      if(progress >= WIN_PROGRESS){ endGame(true); return; }
    }
  }
  setInterval(tick, 16);

  function hold(on){
    holding = on;
    footpad.classList.toggle('active', on);
    if(on && !lightGreen && roundActive) caughtByMoving();
  }
  footpad.addEventListener('pointerdown', e=>{ e.preventDefault(); if(!roundActive || quizModal.classList.contains('show')) return; hold(true); });
  ['pointerup','pointerleave','pointercancel'].forEach(ev => footpad.addEventListener(ev, ()=>hold(false)));
  function onKeyDown(e){ if(e.code==='Space' && !e.repeat && roundActive && !quizModal.classList.contains('show')){ e.preventDefault(); hold(true); } }
  function onKeyUp(e){ if(e.code==='Space'){ e.preventDefault(); hold(false); } }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function caughtByMoving(){
    if(!roundActive) return;
    roundActive = false;
    clearTimeout(dollTimer); clearTimeout(graceTimer);
    caughtText.textContent = 'BỊ PHÁT HIỆN KHI DI CHUYỂN';
    fireAndLoseLife();
  }

  function fireAndLoseLife(){
    const aRect = arena.getBoundingClientRect();
    const dRect = doll.getBoundingClientRect();
    const rRect = runner.getBoundingClientRect();
    const sx = dRect.left + dRect.width/2 - aRect.left;
    const sy = dRect.top + dRect.height/2 - aRect.top;
    const ex = rRect.left + rRect.width/2 - aRect.left;
    const ey = rRect.top + rRect.height/2 - aRect.top;
    muzzle.classList.remove('fire'); void muzzle.offsetWidth; muzzle.classList.add('fire');
    playGunshot();
    const dx = ex-sx, dy = ey-sy;
    const len = Math.hypot(dx,dy);
    const ang = Math.atan2(dy,dx)*180/Math.PI;
    laserEl.style.left = sx+'px'; laserEl.style.top = sy+'px';
    laserEl.style.width = len+'px';
    laserEl.style.transform = 'translateY(-50%) rotate('+ang+'deg)';
    laserEl.classList.remove('fire'); void laserEl.offsetWidth; laserEl.classList.add('fire');
    setTimeout(()=>{
      laserEl.classList.remove('fire');
      for(let i=0;i<16;i++){
        const p = document.createElement('div'); p.className='mgh-blood';
        p.style.left = ex+'px'; p.style.top = ey+'px';
        const a2 = Math.random()*Math.PI*2; const dist = 14+Math.random()*46;
        arena.appendChild(p);
        p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+(Math.cos(a2)*dist)+'px,'+(Math.sin(a2)*dist-16)+'px) scale(.5)',opacity:0}],{duration:540,easing:'ease-out'}).onfinish=()=>p.remove();
      }
      runner.classList.remove('hit'); void runner.offsetWidth; runner.classList.add('hit');
      loseLife();
    }, 300);
  }

  function loseLife(){
    flash.style.opacity = '0.85';
    caughtBanner.classList.add('show');
    setTimeout(()=>{ flash.style.opacity = '0'; }, 130);
    lives--;
    renderLives();
    setTimeout(()=>{
      caughtBanner.classList.remove('show');
      if(lives <= 0){ endGame(false); }
      else { holding = false; footpad.classList.remove('active'); startRound(); }
    }, 1100);
  }

  function openQuiz(){
    roundActive = false;
    const item = buildQuestion();
    if(!item){ startRound(); return; }
    quizQ.textContent = item.qText;
    quizHint.textContent = item.dir === 'h2v' ? 'Từ này có nghĩa là gì?' : 'Từ tiếng Hàn tương ứng là gì?';
    quizOpts.innerHTML = '';
    item.opts.forEach((opt, idx)=>{
      const b = document.createElement('button');
      b.className = 'mgh-opt';
      b.textContent = opt;
      b.addEventListener('click', ()=>answerQuiz(idx === item.a, b));
      quizOpts.appendChild(b);
    });
    quizModal.classList.add('show');
  }
  function answerQuiz(isCorrect, btnEl){
    Array.from(quizOpts.children).forEach(c=>c.style.pointerEvents='none');
    if(isCorrect){
      btnEl.classList.add('correct');
      correctCount++;
      setTimeout(()=>{ quizModal.classList.remove('show'); startRound(); }, 550);
    } else {
      btnEl.classList.add('wrong');
      caughtText.textContent = 'TRẢ LỜI SAI';
      setTimeout(()=>{
        quizModal.classList.remove('show'); // bảng câu hỏi biến mất trước
      }, 400);
      setTimeout(()=>{
        fireAndLoseLife(); // sau đó búp bê mới bắt đầu bắn
      }, 850);
    }
  }

  function endGame(won){
    roundActive = false;
    stopTimer();
    clearTimeout(dollTimer); clearTimeout(graceTimer);
    stopCall();
    saveHighScore(Math.round(progress));
    finalEl.textContent = Math.round(progress) + '%';
    if(won){
      overMsg.textContent = 'Bạn đã băng qua vạch đích an toàn! 정말 잘했어요 — làm rất tốt!';
    } else {
      overMsg.textContent = deathReason === 'timeout'
        ? '⏱ Hết giờ! Chưa kịp băng qua vạch đích. Thử lại nhanh hơn nhé!'
        : 'Búp bê đã phát hiện ra bạn. Hít một hơi và thử lại nhé!';
    }
    setTimeout(()=>{ overScreen.classList.remove('hidden'); }, 300);
  }

  function startGame(){
    currentPath = PATHS[Math.floor(Math.random()*PATHS.length)];
    buildPath();
    deathReason = 'caught';
    lives = TOTAL_LIVES;
    progress = 0; round = 0; correctCount = 0;
    holding = false; lightGreen = true; roundActive = true;
    runner.innerHTML = mghRunnerSvg('#5cc8ff');
    runner.style.bottom = START_BOTTOM_PCT + '%';
    runner.style.left = pathX(0) + '%';
    if(progressFillEl) progressFillEl.style.height = '0%';
    if(progressPctEl) progressPctEl.textContent = '0%';
    renderLives();
    quizModal.classList.remove('show');
    caughtBanner.classList.remove('show');
    overScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    startTimer();
    startRound();
  }

  // mode select
  root.querySelectorAll('.mgh-mode').forEach(btn => {
    btn.addEventListener('click', ()=>{
      root.querySelectorAll('.mgh-mode').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selectedMode = btn.dataset.mode;
    });
  });

  // desc + word count
  descEl.innerHTML = 'Kho từ vựng của bạn có <b style="color:#ffcf5c;">'+userWords.length+'</b> từ. Giữ bàn chân (hoặc phím <b>Space</b>) để chạy khi búp bê quay lưng, đứng yên khi búp bê quay lại rồi trả lời câu hỏi. Có 3 mạng, 5 phút để về đích!';

  root.querySelector('#mgh-startbtn').addEventListener('click', startGame);
  root.querySelector('#mgh-retry').addEventListener('click', startGame);
  root.querySelector('#mgh-close').addEventListener('click', closeStudy);
  root.querySelector('#mgh-startclose').addEventListener('click', closeStudy);
  root.querySelector('#mgh-overclose').addEventListener('click', closeStudy);

  // dọn dẹp khi đóng modal
  window.__mghStop = function(){
    roundActive = false;
    stopTimer();
    clearTimeout(dollTimer); clearTimeout(graceTimer);
    stopCall();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
};
