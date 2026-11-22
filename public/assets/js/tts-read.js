/* ============================================================
   tts-read.js — Đọc tiếng Hàn dùng chung cho cả hệ thống (flashcard, game, tra từ…)
   Thứ tự ưu tiên:
     1. MP3 đọc sẵn bằng giọng Edge (SunHi / InJoon) — cùng bộ âm thanh với Kho giáo trình
        (tools/curriculum-tts/gen.py → /lesson/audio/<file>.mp3, bảng tra /lesson/audio/index.json)
     2. Google Translate TTS (cho từ chưa có MP3)
     3. speechSynthesis của trình duyệt (khi mất mạng / bị chặn)
   Expose: window.readKorean(text, rate, speaker) → Promise (xong khi đọc xong)
           window.stopKorean()
   ============================================================ */
(function () {
  var AUDIO_BASE = '/lesson/audio/';
  var index = null;
  var indexReady = null;
  function loadIndex() {
    if (!indexReady) {
      indexReady = fetch(AUDIO_BASE + 'index.json', { cache: 'no-cache' }) // bảng tra đổi mỗi lần tạo MP3 mới
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { index = j || { w: {}, d: {} }; })
        .catch(function () { index = { w: {}, d: {} }; });
    }
    return indexReady;
  }
  // tải sẵn bảng tra để lần bấm đầu tiên không bị trễ
  if (document.readyState === 'complete') setTimeout(loadIndex, 300);
  else window.addEventListener('load', function () { setTimeout(loadIndex, 300); });

  function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function fileFor(text, speaker) {
    var ix = index || {}, w = ix.w || {}, d = ix.d || {};
    var t = norm(text);
    var bare = t.replace(/[.?!…~]+$/, '');
    return (speaker && d[speaker + '|' + t]) || w[t] || w[bare] || d['|' + t] || null;
  }
  window.koreanAudioFile = function (text, speaker) { return index ? fileFor(text, speaker) : null; };

  var token = 0;
  function audioEl() { return window.__readKoreanAudio || (window.__readKoreanAudio = new Audio()); }
  window.stopKorean = function () {
    token++;
    try { audioEl().pause(); } catch (e) { }
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { }
  };

  function googleSrc(text) {
    var q = encodeURIComponent(text);
    return 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&total=1&idx=0&textlen=' + q.length + '&q=' + q;
  }

  function browserTTS(text, rate, my) {
    return new Promise(function (resolve) {
      if (!window.speechSynthesis || my !== token) return resolve();
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR';
        u.rate = Math.min(rate || 1, 1.1);
        var ko = window.speechSynthesis.getVoices().filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('ko') === 0; });
        var prefs = ['Google', 'Heami', 'Microsoft', 'Yuna', 'Apple'], best = null;
        for (var i = 0; i < prefs.length && !best; i++) best = ko.find(function (v) { return v.name.indexOf(prefs[i]) >= 0; });
        u.voice = best || ko[0] || null;
        u.onend = u.onerror = function () { resolve(); };
        window.speechSynthesis.speak(u);
        setTimeout(resolve, 2500 + text.length * 250); // phòng khi onend không bắn
      } catch (e) { resolve(); }
    });
  }

  window.readKorean = function (text, rate, speaker) {
    text = norm(text);
    window.stopKorean();
    var my = token;
    if (!text) return Promise.resolve();
    rate = rate || 1;
    return loadIndex().then(function () {
      return new Promise(function (resolve) {
        if (my !== token) return resolve();
        var a = audioEl(), done = false, triedGoogle = false;
        function finish() { if (!done) { done = true; resolve(); } }
        function play(src) {
          a.onended = finish;
          a.onerror = next;
          a.src = src;
          a.playbackRate = Math.min(Math.max(rate, 0.5), 1.4);
          var p = a.play();
          if (p && p.catch) p.catch(next);
        }
        function next() {
          if (done || my !== token) return finish();
          if (!triedGoogle) { triedGoogle = true; play(googleSrc(text)); return; }
          a.onerror = a.onended = null;
          browserTTS(text, rate, my).then(finish);
        }
        var f = fileFor(text, speaker);
        if (f) play(AUDIO_BASE + f); else next();
      });
    });
  };
})();
