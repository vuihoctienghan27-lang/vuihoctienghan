/* ============================================================
   tts-read.js — Đọc tiếng Hàn CHẤT LƯỢNG CAO
   Ưu tiên Google Translate TTS (giọng Hàn rõ ràng, tự nhiên)
   qua thẻ audio ẩn; nếu mất mạng / bị chặn thì fallback về
   speechSynthesis của trình duyệt (chọn giọng Hàn tốt nhất).
   Expose: window.readKorean(text, rate)
   ============================================================ */
window.readKorean = function(text, rate){
  text = (text || '').trim();
  if (!text) return;
  rate = rate || 1;

  var audio = window.__readKoreanAudio || (window.__readKoreanAudio = new Audio());
  audio.pause();
  audio.onerror = null;
  audio.onended = null;

  var q = encodeURIComponent(text);
  audio.src = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&total=1&idx=0&textlen=' + q.length + '&q=' + q;
  audio.playbackRate = Math.min(rate, 1.4);

  audio.onerror = function(){ fallbackKoreanTTS(text, rate); };
  var p = audio.play();
  if (p && p.catch) {
    p.catch(function(){ fallbackKoreanTTS(text, rate); });
  }
};

function fallbackKoreanTTS(text, rate){
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = Math.min(rate || 1, 1.1);
    var voices = window.speechSynthesis.getVoices();
    var ko = voices.filter(function(v){ return v.lang && v.lang.toLowerCase().indexOf('ko') === 0; });
    var prefs = ['Google', 'Heami', 'Microsoft', 'Yuna', 'Apple'];
    var best = null;
    for (var i = 0; i < prefs.length; i++) {
      best = ko.find(function(v){ return v.name.indexOf(prefs[i]) >= 0; });
      if (best) break;
    }
    u.voice = best || ko[0] || null;
    window.speechSynthesis.speak(u);
  } catch(e){}
}
