/**
 * lesson-core.js — Shared lesson engine for vuihoctienghan.online
 * 
 * Expects these to be set BEFORE loading this script:
 *   window.LESSON_KEY     — localStorage + Firestore doc key (e.g. 'socap1_bai01_media')
 *   window.LESSON_DOC     — Firestore document path (e.g. 'socap1_bai01')
 *   window.ADMIN_EMAILS   — array of admin email strings
 */
(function() {
'use strict';

/* ================= Media Store (localStorage + Firestore sync) ================= */
const LK = window.LESSON_KEY || 'lesson_media';
const LD = window.LESSON_DOC || LK;

function getMediaStore() {
  try { return JSON.parse(localStorage.getItem(LK) || '{}'); } catch(e) { return {}; }
}
function saveMediaStore(store) {
  try { localStorage.setItem(LK, JSON.stringify(store)); } catch(e) {}
  if (window.db && LD) {
    window.db.collection('lessons_media').doc(LD).set(store, {merge: true}).catch(function(){});
  }
}

function getAnswer(key, fallback) {
  var s = getMediaStore();
  var v = s['ans_' + key];
  return (v === undefined || v === null || v === '') ? fallback : v;
}
function setAnswer(key, value) {
  var s = getMediaStore();
  s['ans_' + key] = value;
  saveMediaStore(s);
}

// Firestore → localStorage sync
if (window.db && LD) {
  window.db.collection('lessons_media').doc(LD).onSnapshot(function(doc) {
    if (doc.exists) {
      var data = doc.data();
      try { localStorage.setItem(LK, JSON.stringify(data)); } catch(e) {}
      document.querySelectorAll('[data-media-key]').forEach(function(el) {
        var key = el.getAttribute('data-media-key');
        if (data[key]) {
          if (el.classList.contains('flip-card')) {
            var emoEl = el.querySelector('.emo');
            if (emoEl) {
              var kr = el.querySelector('.kr') ? el.querySelector('.kr').textContent : '';
              emoEl.outerHTML = '<img src="' + data[key] + '" alt="' + kr + '" class="flip-img">';
            } else {
              var img = el.querySelector('img');
              if (img && img.src !== data[key]) img.src = data[key];
            }
          } else if (el.classList.contains('audio-slot')) {
            var pw = el.querySelector('.audio-player-wrap');
            if (pw && !pw.querySelector('audio')) {
              pw.innerHTML = '<audio controls src="' + data[key] + '"></audio>';
            } else {
              var audio = el.querySelector('audio');
              if (audio && audio.src !== data[key]) audio.src = data[key];
            }
          } else {
            var ph = el.querySelector('.placeholder-text');
            if (ph) {
              ph.outerHTML = '<img src="' + data[key] + '" alt="">';
            } else {
              var img = el.querySelector('img');
              if (img && img.src !== data[key]) img.src = data[key];
            }
          }
        }
      });
    }
  });
}

/* ================= State & Stamps ================= */
window._lessonState = window._lessonState || { stamped: {} };

function stamp(key) {
  if (window._lessonState.stamped[key]) return;
  window._lessonState.stamped[key] = true;
  var slot = document.querySelector('.stamp-slot[data-stamp="' + key + '"]');
  if (slot) slot.classList.add('stamped');
  var pill = document.querySelector('.nav-pill[data-target="sec-' + key + '"]');
  if (pill) pill.classList.add('done');
}
window.stamp = stamp;

/* ================= TTS ================= */
function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR'; u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch(e) {}
}
window.speak = speak;

/* ================= Admin Mode ================= */
var adminEmails = window.ADMIN_EMAILS || ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];
window._isAdmin = false;

function setAdminMode(on) {
  window._isAdmin = on;
  document.body.classList.toggle('admin-on', on);
  var fab = document.getElementById('adminFab');
  if (fab) fab.classList.toggle('admin-active', on);
}

(function waitForFirebase() {
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(function(user) {
      var fab = document.getElementById('adminFab');
      if (user && adminEmails.indexOf(user.email) !== -1) {
        if (fab) fab.classList.add('visible');
      } else {
        if (fab) fab.classList.remove('visible');
        setAdminMode(false);
      }
    });
  } else {
    setTimeout(waitForFirebase, 300);
  }
})();

var adminFab = document.getElementById('adminFab');
if (adminFab) {
  adminFab.addEventListener('click', function() { setAdminMode(!window._isAdmin); });
}

/* ================= TOC Drawer + ScrollSpy ================= */
var tocFab = document.getElementById('tocFab');
var tocCloseBtn = document.getElementById('tocCloseBtn');
if (tocFab) tocFab.addEventListener('click', function() { document.body.classList.toggle('toc-open'); });
if (tocCloseBtn) tocCloseBtn.addEventListener('click', function() { document.body.classList.remove('toc-open'); });

var pills = document.querySelectorAll('.nav-pill');
pills.forEach(function(p) {
  p.addEventListener('click', function() {
    var el = document.getElementById(p.dataset.target);
    if (el) el.scrollIntoView({behavior: 'smooth'});
    if (window.innerWidth < 768) document.body.classList.remove('toc-open');
  });
});

var sectionIds = [];
pills.forEach(function(p) { if (p.dataset.target) sectionIds.push(p.dataset.target); });
var io = new IntersectionObserver(function(entries) {
  entries.forEach(function(en) {
    var pill = document.querySelector('.nav-pill[data-target="' + en.target.id + '"]');
    if (en.isIntersecting && pill) {
      pills.forEach(function(p) { p.classList.remove('active'); });
      pill.classList.add('active');
    }
  });
}, {rootMargin: '-40% 0px -50% 0px'});
sectionIds.forEach(function(id) { var el = document.getElementById(id); if (el) io.observe(el); });

/* ================= Image Slot Builder ================= */
function buildImageSlot(opts) {
  var label = opts.label || '';
  var ratio = opts.ratio || '';
  var compact = opts.compact || false;
  var storageKey = opts.storageKey || label;

  var wrap = document.createElement('div');
  wrap.className = 'img-slot' + (compact ? ' compact' : '');
  wrap.setAttribute('data-media-key', 'img_' + storageKey);
  if (ratio) wrap.style.aspectRatio = ratio;

  var store = getMediaStore();
  var savedUrl = store['img_' + storageKey];

  function applyImage(url) {
    wrap.innerHTML =
      '<img src="' + url + '" alt="' + label + '">' +
      '<button class="pencil-btn" type="button" title="Đổi ảnh">\u270E</button>' +
      '<div class="url-form"><input type="url" placeholder="Dán link ảnh mới..." value="' + url + '"></div>';
    var pencil2 = wrap.querySelector('.pencil-btn');
    var form2 = wrap.querySelector('.url-form');
    var input2 = form2.querySelector('input');
    pencil2.addEventListener('click', function(e) {
      e.stopPropagation(); form2.classList.toggle('open');
      if (form2.classList.contains('open')) { input2.focus(); input2.select(); }
    });
    function saveNew(e) {
      e.stopPropagation();
      var newUrl = input2.value.trim(); if (!newUrl) return;
      if (storageKey) { var s = getMediaStore(); s['img_' + storageKey] = newUrl; saveMediaStore(s); }
      applyImage(newUrl);
    }
    input2.addEventListener('keydown', function(e) { if (e.key === 'Enter') saveNew(e); });
    wrap.addEventListener('click', function(e) { e.stopPropagation(); });
  }

  if (savedUrl) {
    applyImage(savedUrl);
  } else {
    wrap.innerHTML =
      '<div class="placeholder-text">\uD83D\uDDBC\uFE0F<br>' + label + '</div>' +
      '<button class="pencil-btn" type="button" title="Thêm link ảnh">\u270E</button>' +
      '<div class="url-form"><input type="url" placeholder="Dán link rồi nhấn Enter..."></div>';
    var pencil = wrap.querySelector('.pencil-btn');
    var form = wrap.querySelector('.url-form');
    var input = form.querySelector('input');
    pencil.addEventListener('click', function(e) {
      e.stopPropagation(); form.classList.toggle('open');
      if (form.classList.contains('open')) input.focus();
    });
    function save(e) {
      e.stopPropagation();
      var url = input.value.trim(); if (!url) return;
      if (storageKey) { var s = getMediaStore(); s['img_' + storageKey] = url; saveMediaStore(s); }
      applyImage(url);
    }
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') save(e); });
    wrap.addEventListener('click', function(e) { e.stopPropagation(); });
  }
  return wrap;
}
window.buildImageSlot = buildImageSlot;

/* ================= Audio Slot Builder ================= */
function buildAudioSlot(opts) {
  var label = opts.label || '';
  var storageKey = opts.storageKey || label;

  var wrap = document.createElement('div');
  wrap.className = 'audio-slot';
  wrap.setAttribute('data-media-key', 'audio_' + storageKey);

  var store = getMediaStore();
  var savedUrl = store['audio_' + storageKey];

  function buildHead(hasAudio) {
    return '<div class="audio-slot-head">' +
      '<span class="audio-icon">\uD83D\uDD0A</span>' +
      '<span class="audio-label">' + label + '</span>' +
      '<button class="audio-pencil" type="button" title="' + (hasAudio ? 'Đổi audio' : 'Thêm link audio') + '">\u270E</button>' +
      '</div>' +
      '<div class="audio-form"><input type="url" placeholder="Dán link audio rồi nhấn Enter..."' + (hasAudio ? ' value="' + savedUrl + '"' : '') + '></div>' +
      '<div class="audio-player-wrap">' + (hasAudio ? '<audio controls src="' + savedUrl + '"></audio>' : '') + '</div>';
  }

  wrap.innerHTML = buildHead(!!savedUrl);

  (function attachEvents() {
    var pencil = wrap.querySelector('.audio-pencil');
    var form = wrap.querySelector('.audio-form');
    var input = form.querySelector('input');
    var playerWrap = wrap.querySelector('.audio-player-wrap');
    pencil.addEventListener('click', function(e) {
      e.stopPropagation(); form.classList.toggle('open');
      if (form.classList.contains('open')) input.focus();
    });
    function save(e) {
      e.stopPropagation();
      var url = input.value.trim(); if (!url) return;
      if (storageKey) { var s = getMediaStore(); s['audio_' + storageKey] = url; saveMediaStore(s); }
      playerWrap.innerHTML = '<audio controls src="' + url + '"></audio>';
      input.value = url;
      form.classList.remove('open');
    }
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') save(e); });
  })();
  return wrap;
}
window.buildAudioSlot = buildAudioSlot;

/* ================= Fill Checklist Builder ================= */
function buildFillChecklist(container, items, onAnyCheck) {
  if (!items) return;
  items.forEach(function(it, idx) {
    var key = it.key || (container.id || 'fill') + '_' + idx;
    var currentAnswer = getAnswer('fill_' + key, it.answer || '');
    var row = document.createElement('div');
    row.className = 'fill-row';
    row.innerHTML =
      '<div class="fill-prompt">' + it.prompt + ' <button type="button" class="answer-pencil" title="Sửa đáp án chuẩn">\u270E</button></div>' +
      '<div class="fill-input-wrap">' +
      '<input type="text" class="fill-input" placeholder="Nhập câu trả lời bằng tiếng Hàn...">' +
      '<button type="button" class="fill-check-btn">Kiểm tra</button>' +
      '</div>' +
      '<div class="fill-feedback"></div>';
    var input = row.querySelector('.fill-input');
    var btn = row.querySelector('.fill-check-btn');
    var fb = row.querySelector('.fill-feedback');
    var pencil = row.querySelector('.answer-pencil');

    function refreshPencil() {
      pencil.classList.toggle('unset', !currentAnswer);
      pencil.title = currentAnswer ? ('Đáp án chuẩn: ' + currentAnswer + ' — bấm để sửa') : 'Chưa có đáp án chuẩn — bấm để nhập';
    }
    refreshPencil();

    btn.addEventListener('click', function() {
      if (!currentAnswer) { fb.textContent = 'Chưa có đáp án chuẩn cho câu này — bật chế độ quản trị để nhập.'; fb.className = 'fill-feedback no'; return; }
      var norm = function(s) { return (s || '').replace(/\s+/g, '').replace(/[.?!,]/g, ''); };
      var ok = norm(input.value) === norm(currentAnswer);
      fb.textContent = ok ? '\u2713 Chính xác!' : ('Đáp án gợi ý: ' + currentAnswer);
      fb.className = 'fill-feedback ' + (ok ? 'ok' : 'no');
      input.classList.toggle('correct', ok);
      input.classList.toggle('incorrect', !ok);
      if (onAnyCheck) onAnyCheck();
    });

    pencil.addEventListener('click', function(e) {
      e.stopPropagation();
      var existing = row.querySelector('.answer-editor');
      if (existing) { existing.remove(); return; }
      var editor = document.createElement('div'); editor.className = 'answer-editor';
      editor.innerHTML = '<span class="answer-editor-label">Đáp án chuẩn:</span><input type="text" class="answer-editor-input" value="' + (currentAnswer || '') + '" placeholder="Nhập đáp án rồi nhấn Enter...">';
      var ei = editor.querySelector('.answer-editor-input');
      function save() {
        var v = ei.value.trim(); if (!v) return;
        currentAnswer = v; setAnswer('fill_' + key, v);
        fb.textContent = ''; fb.className = 'fill-feedback'; input.classList.remove('correct', 'incorrect');
        refreshPencil(); editor.remove();
      }
      ei.addEventListener('keydown', function(ev) { if (ev.key === 'Enter') save(); });
      row.insertBefore(editor, row.querySelector('.fill-input-wrap'));
      ei.focus(); ei.select();
    });

    container.appendChild(row);
  });
}
window.buildFillChecklist = buildFillChecklist;

/* ================= Choice List Builder (O/X, Yes/No, MCQ base) ================= */
function buildChoiceList(container, items, onAllDone) {
  if (!items) return;
  var doneCount = 0;
  items.forEach(function(it, idx) {
    var key = it.key || (container.id || 'choice') + '_' + idx;
    var currentAnswer = getAnswer('choice_' + key, it.answer || '');
    var row = document.createElement('div');
    row.className = 'ox-row';
    var btnsHtml = it.choices.map(function(c) {
      return '<button type="button" class="ox-btn" data-v="' + c.value + '"' + (c.wide ? ' style="width:auto;"' : '') + '>' + c.label + '</button>';
    }).join('');
    row.innerHTML = '<div class="ox-text">' + it.text + '</div><div class="ox-btns">' + btnsHtml + '<button type="button" class="answer-pencil" title="Sửa đáp án đúng">\u270E</button></div>';
    var btns = row.querySelectorAll('.ox-btn');
    var pencil = row.querySelector('.answer-pencil');

    function refreshPencil() {
      pencil.classList.toggle('unset', !currentAnswer);
      pencil.title = currentAnswer ? ('Đáp án đúng: ' + currentAnswer + ' — bấm để sửa') : 'Chưa đặt đáp án — bấm để chọn';
    }
    refreshPencil();

    btns.forEach(function(b) {
      b.addEventListener('click', function() {
        if (row.dataset.done) return;
        if (currentAnswer) {
          var correct = b.dataset.v === currentAnswer;
          b.classList.add(correct ? 'correct' : 'wrong');
          if (!correct) {
            var correctBtn = Array.from(btns).find(function(x) { return x.dataset.v === currentAnswer; });
            if (correctBtn) correctBtn.classList.add('correct');
          }
        } else {
          b.classList.add('picked-neutral');
        }
        row.dataset.done = '1'; doneCount++;
        if (doneCount === items.length && onAllDone) onAllDone();
      });
    });

    pencil.addEventListener('click', function(e) {
      e.stopPropagation();
      var existing = row.querySelector('.answer-editor');
      if (existing) { existing.remove(); return; }
      var editor = document.createElement('div'); editor.className = 'answer-editor';
      editor.innerHTML = '<span class="answer-editor-label">Đáp án đúng:</span>' +
        it.choices.map(function(c) {
          return '<button type="button" class="answer-editor-opt' + (c.value === currentAnswer ? ' active' : '') + '" data-v="' + c.value + '">' + c.label + '</button>';
        }).join('');
      editor.querySelectorAll('.answer-editor-opt').forEach(function(ob) {
        ob.addEventListener('click', function(ev) {
          ev.stopPropagation();
          currentAnswer = ob.dataset.v; setAnswer('choice_' + key, currentAnswer);
          editor.querySelectorAll('.answer-editor-opt').forEach(function(x) { x.classList.remove('active'); });
          ob.classList.add('active');
          refreshPencil();
          if (row.dataset.done) { doneCount--; row.dataset.done = ''; }
          btns.forEach(function(b) { b.classList.remove('correct', 'wrong', 'picked-neutral'); });
          editor.remove();
        });
      });
      row.appendChild(editor);
    });

    container.appendChild(row);
  });
}
window.buildChoiceList = buildChoiceList;

function buildOXList(container, items, onAllDone) {
  if (!items) return;
  buildChoiceList(container, items.map(function(it, i) {
    return {
      key: it.key || ((container.id || 'ox') + '_' + i),
      text: it.text, answer: it.answer,
      choices: [{value: 'O', label: 'O'}, {value: 'X', label: 'X'}]
    };
  }), onAllDone);
}
window.buildOXList = buildOXList;

function buildYesNoList(container, items, onAllDone) {
  if (!items) return;
  buildChoiceList(container, items.map(function(it, i) {
    return {
      key: it.key || ((container.id || 'yn') + '_' + i),
      text: it.text, answer: it.answer,
      choices: [{value: '네', label: '네', wide: true}, {value: '아니요', label: '아니요', wide: true}]
    };
  }), onAllDone);
}
window.buildYesNoList = buildYesNoList;

/* ================= Open Prompt Builder ================= */
function buildOpenPrompt(container, opts) {
  if (!opts) return;
  var wrap = document.createElement('div');
  wrap.className = 'fill-row';
  wrap.innerHTML =
    '<div class="fill-prompt">' + (opts.prompt || '') + '</div>' +
    '<textarea class="open-textarea ' + (opts.lined ? 'lined-textarea' : '') + '" rows="' + (opts.lines || 3) + '" placeholder="' + (opts.placeholder || '') + '"></textarea>' +
    (opts.hint ? '<button type="button" class="hint-btn">Xem gợi ý</button><div class="hint-box"></div>' : '');
  if (opts.hint) {
    var btn = wrap.querySelector('.hint-btn');
    var box = wrap.querySelector('.hint-box');
    btn.addEventListener('click', function() {
      box.classList.toggle('open');
      box.innerHTML = box.classList.contains('open') ? opts.hint : '';
    });
  }
  container.appendChild(wrap);
}
window.buildOpenPrompt = buildOpenPrompt;

/* ================= Matching Builder ================= */
function buildMatching(leftEl, rightEl, leftItems, rightItems, onAllMatched, graded, matchId) {
  if (!leftItems || !rightItems) return;
  var selected = null, matched = 0;
  graded = graded !== false;

  leftItems.forEach(function(it) {
    var el = document.createElement('div');
    el.className = 'match-item kr'; el.dataset.key = it.key;
    if (it.node) el.appendChild(it.node); else el.innerHTML = it.html;
    el.addEventListener('click', function(e) {
      if (e.target.closest('.img-slot') || e.target.closest('.answer-editor') || e.target.closest('.answer-pencil')) return;
      if (el.classList.contains('paired-correct')) return;
      leftEl.querySelectorAll('.match-item').forEach(function(x) { x.classList.remove('selected'); });
      el.classList.add('selected'); selected = el;
    });
    leftEl.appendChild(el);
  });

  rightItems.forEach(function(it) {
    var el = document.createElement('div');
    el.className = 'match-item';
    var storeKey = matchId ? ('match_' + matchId + '_' + it.key) : null;
    var correctKey = storeKey ? getAnswer(storeKey, it.correctKey || '') : (it.correctKey || '');
    el.dataset.correctKey = correctKey;
    var content = document.createElement('div');
    if (it.node) content.appendChild(it.node); else content.innerHTML = it.html;
    el.appendChild(content);

    if (matchId) {
      var pencil = document.createElement('button');
      pencil.type = 'button'; pencil.className = 'answer-pencil'; pencil.style.cssText = 'margin-top:6px;';
      function refreshPencil() {
        pencil.classList.toggle('unset', !correctKey);
        var l = leftItems.find(function(x) { return x.key === correctKey; });
        pencil.title = correctKey ? ('Đáp án đúng: ' + (l ? l.label : correctKey) + ' — bấm để sửa') : 'Chưa đặt đáp án đúng — bấm để chọn';
        pencil.textContent = '\u270E';
      }
      refreshPencil();
      pencil.addEventListener('click', function(e) {
        e.stopPropagation();
        var existing = el.querySelector('.answer-editor');
        if (existing) { existing.remove(); return; }
        var editor = document.createElement('div'); editor.className = 'answer-editor';
        var sel = document.createElement('select'); sel.className = 'answer-editor-select';
        sel.innerHTML = '<option value="">— chưa chọn —</option>' +
          leftItems.map(function(l) { return '<option value="' + l.key + '"' + (l.key === correctKey ? ' selected' : '') + '>' + (l.label || l.key) + '</option>'; }).join('');
        sel.addEventListener('click', function(ev) { ev.stopPropagation(); });
        sel.addEventListener('change', function() {
          correctKey = sel.value; el.dataset.correctKey = correctKey;
          if (storeKey) setAnswer(storeKey, correctKey);
          el.classList.remove('paired-correct', 'paired-wrong');
          refreshPencil(); editor.remove();
        });
        editor.appendChild(sel);
        el.appendChild(editor);
      });
      el.appendChild(pencil);
    }

    el.addEventListener('click', function(e) {
      if (e.target.closest('.img-slot') || e.target.closest('.answer-editor') || e.target.closest('.answer-pencil')) return;
      if (!selected || el.classList.contains('paired-correct')) return;
      var ck = el.dataset.correctKey;
      var isMatch = (!graded || !ck) ? true : (selected.dataset.key === ck);
      if (isMatch) {
        selected.classList.add('paired-correct'); selected.classList.remove('selected');
        el.classList.add('paired-correct');
        matched++;
        if (matched === leftItems.length && onAllMatched) onAllMatched();
      } else {
        el.classList.add('paired-wrong');
        setTimeout(function() { el.classList.remove('paired-wrong'); }, 500);
      }
      selected = null;
    });

    rightEl.appendChild(el);
  });
}
window.buildMatching = buildMatching;

/* ================= Vocab Flip Grid Builder ================= */
function buildFlipGrid(container, data, imgEditable, vocabState) {
  if (!data || !container) return;
  vocabState = vocabState || window._lessonState;

  data.forEach(function(item) {
    var kr = item[0], emo = item[1], vi = item[2];
    var sKey = 'flip_' + kr;
    var store = getMediaStore();
    var savedImg = imgEditable ? store['img_' + sKey] : null;

    var card = document.createElement('div');
    card.className = 'flip-card';
    if (imgEditable) card.setAttribute('data-media-key', 'img_' + sKey);

    var frontContent;
    if (savedImg) {
      frontContent =
        '<img src="' + savedImg + '" alt="' + kr + '" class="flip-img">' +
        '<div class="kr">' + kr + '</div>' +
        (imgEditable ? '<button class="pencil-btn" type="button" title="Đổi ảnh cho ' + kr + '">\u270E</button>' +
        '<div class="url-form"><input type="url" placeholder="Link mới rồi Enter..."></div>' : '');
    } else {
      frontContent =
        '<div class="emo">' + emo + '</div>' +
        '<div class="kr">' + kr + '</div>' +
        (imgEditable ? '<button class="pencil-btn" type="button" title="Thêm ảnh thật cho ' + kr + '">\u270E</button>' +
        '<div class="url-form"><input type="url" placeholder="Dán link rồi Enter..."></div>' : '');
    }

    card.innerHTML =
      '<div class="flip-inner">' +
      '<div class="flip-face flip-front">' + frontContent + '</div>' +
      '<div class="flip-face flip-back">' +
      '<div class="vi">' + vi + '</div>' +
      '<div class="kr-small">' + kr + ' <span class="speak-btn" data-kr="' + kr + '">\uD83D\uDD0A</span></div>' +
      '</div></div>';

    card.addEventListener('click', function(e) {
      if (e.target.classList.contains('speak-btn')) { speak(e.target.dataset.kr); return; }
      if (imgEditable && (e.target.closest('.pencil-btn') || e.target.closest('.url-form'))) return;
      card.classList.toggle('flipped');
      if (!card.classList.contains('seen')) {
        card.classList.add('seen');
        if (typeof vocabState.seenCount === 'number') vocabState.seenCount++;
        if (typeof vocabState.updateVocabProgress === 'function') vocabState.updateVocabProgress();
      }
    });

    if (imgEditable) {
      (function attachFlipImgEditor() {
        var front = card.querySelector('.flip-front');
        var pencil = front.querySelector('.pencil-btn');
        var form = front.querySelector('.url-form');
        var input = front.querySelector('input');
        if (!pencil || !form || !input) return;

        pencil.addEventListener('click', function(e) {
          e.stopPropagation();
          form.classList.toggle('open');
          if (form.classList.contains('open')) input.focus();
        });
        function saveFlipImg(e) {
          e.stopPropagation();
          var url = input.value.trim(); if (!url) return;
          var s = getMediaStore(); s['img_' + sKey] = url; saveMediaStore(s);
          var emoEl = front.querySelector('.emo');
          var imgEl = front.querySelector('.flip-img');
          if (emoEl) emoEl.outerHTML = '<img src="' + url + '" alt="' + kr + '" class="flip-img">';
          else if (imgEl) imgEl.src = url;
          front.querySelector('.kr').style.display = '';
          form.classList.remove('open');
        }
        input.addEventListener('keydown', function(e) { if (e.key === 'Enter') saveFlipImg(e); });
      })();
    }
    container.appendChild(card);
  });
}
window.buildFlipGrid = buildFlipGrid;

/* ================= Greeting Cards Builder ================= */
function buildGreetGrid(container, greetings) {
  if (!greetings || !container) return;
  greetings.forEach(function(item) {
    var kr = item[0], vi = item[1];
    var d = document.createElement('div');
    d.className = 'greet-card';
    d.innerHTML = '<div class="kr">' + kr + ' <span class="speak-btn" data-kr="' + kr + '">\uD83D\uDD0A</span></div><div class="vi">' + vi + '</div>';
    d.addEventListener('click', function(e) {
      if (e.target.classList.contains('speak-btn')) { e.stopPropagation(); speak(e.target.dataset.kr); return; }
      d.classList.toggle('revealed');
    });
    container.appendChild(d);
  });
}
window.buildGreetGrid = buildGreetGrid;

/* ================= Grammar Cards Builder ================= */
function buildGrammarCards(container, grammarData) {
  if (!grammarData || !container) return;
  grammarData.forEach(function(g) {
    var card = document.createElement('div'); card.className = 'gram-card';
    card.innerHTML =
      '<div class="gram-head"><div><span class="g-title kr">' + g.kr + '</span><br><span class="g-mean">' + g.mean + '</span></div><span class="gram-chevron">\u25BE</span></div>' +
      '<div class="gram-body"><p class="gram-note">' + g.note + '</p>' +
      (g.examples || []).map(function(ex) { return '<div class="ex-row"><span class="kr">' + ex[0] + '</span><span class="vi">' + ex[1] + '</span></div>'; }).join('') +
      '</div>';
    card.querySelector('.gram-head').addEventListener('click', function() { card.classList.toggle('open'); });
    container.appendChild(card);
  });
}
window.buildGrammarCards = buildGrammarCards;

/* ================= Mini Quiz Builder ================= */
function buildMiniQuiz(container, questions, onAllCorrect) {
  if (!questions || !container) return;
  var mqCorrect = 0;
  questions.forEach(function(q, qi) {
    var key = 'mq_' + qi;
    var currentAnswer = getAnswer('choice_' + key, q.answer);
    var row = document.createElement('div'); row.className = 'mq-item';
    row.innerHTML = '<div class="mq-sentence kr">' + q.sentence + ' <button type="button" class="answer-pencil" title="Sửa đáp án đúng">\u270E</button></div><div class="mq-choices"></div>';
    var choicesEl = row.querySelector('.mq-choices');
    var pencil = row.querySelector('.answer-pencil');

    q.choices.forEach(function(c) {
      var btn = document.createElement('button'); btn.className = 'choice-btn'; btn.textContent = c;
      btn.addEventListener('click', function() {
        var btns = choicesEl.querySelectorAll('button');
        btns.forEach(function(b) { b.disabled = true; });
        if (c === currentAnswer) { btn.classList.add('correct'); mqCorrect++; }
        else {
          btn.classList.add('wrong');
          var correctBtn = Array.from(btns).find(function(b) { return b.textContent === currentAnswer; });
          if (correctBtn) correctBtn.classList.add('correct');
        }
        if (mqCorrect === questions.length && onAllCorrect) onAllCorrect();
      });
      choicesEl.appendChild(btn);
    });

    pencil.addEventListener('click', function(e) {
      e.stopPropagation();
      var existing = row.querySelector('.answer-editor');
      if (existing) { existing.remove(); return; }
      var editor = document.createElement('div'); editor.className = 'answer-editor';
      editor.innerHTML = '<span class="answer-editor-label">Đáp án đúng:</span>' +
        q.choices.map(function(c) { return '<button type="button" class="answer-editor-opt' + (c === currentAnswer ? ' active' : '') + '" data-v="' + c + '">' + c + '</button>'; }).join('');
      editor.querySelectorAll('.answer-editor-opt').forEach(function(ob) {
        ob.addEventListener('click', function() {
          currentAnswer = ob.dataset.v; setAnswer('choice_' + key, currentAnswer);
          editor.querySelectorAll('.answer-editor-opt').forEach(function(x) { x.classList.remove('active'); });
          ob.classList.add('active');
          choicesEl.querySelectorAll('button').forEach(function(b) { b.disabled = false; b.classList.remove('correct', 'wrong'); });
          editor.remove();
        });
      });
      row.appendChild(editor);
    });

    container.appendChild(row);
  });
}
window.buildMiniQuiz = buildMiniQuiz;

/* ================= Quiz Builder ================= */
function buildQuiz(container, quizData, submitBtn, resultEl, onPass) {
  if (!quizData || !container) return;
  var picks = {};
  quizData.forEach(function(q, i) {
    var key = 'quiz_' + i;
    q._currentAnswer = getAnswer('choice_' + key, q.answer);
    var wrap = document.createElement('div'); wrap.className = 'quiz-item';
    wrap.innerHTML = '<div class="quiz-q">' + (i + 1) + '. ' + q.q + ' <button type="button" class="answer-pencil" title="Sửa đáp án đúng">\u270E</button></div><div class="quiz-opts"></div>';
    var optsEl = wrap.querySelector('.quiz-opts');
    var pencil = wrap.querySelector('.answer-pencil');

    q.opts.forEach(function(o) {
      var b = document.createElement('button'); b.className = 'quiz-opt'; b.textContent = o;
      b.addEventListener('click', function() {
        optsEl.querySelectorAll('.quiz-opt').forEach(function(x) { x.classList.remove('picked'); });
        b.classList.add('picked'); picks[i] = o;
      });
      optsEl.appendChild(b);
    });

    pencil.addEventListener('click', function(e) {
      e.stopPropagation();
      var existing = wrap.querySelector('.answer-editor');
      if (existing) { existing.remove(); return; }
      var editor = document.createElement('div'); editor.className = 'answer-editor';
      editor.innerHTML = '<span class="answer-editor-label">Đáp án đúng:</span>' +
        q.opts.map(function(o) { return '<button type="button" class="answer-editor-opt' + (o === q._currentAnswer ? ' active' : '') + '" data-v="' + o + '">' + o + '</button>'; }).join('');
      editor.querySelectorAll('.answer-editor-opt').forEach(function(ob) {
        ob.addEventListener('click', function() {
          q._currentAnswer = ob.dataset.v; setAnswer('choice_' + key, q._currentAnswer);
          editor.querySelectorAll('.answer-editor-opt').forEach(function(x) { x.classList.remove('active'); });
          ob.classList.add('active');
          editor.remove();
        });
      });
      wrap.appendChild(editor);
    });

    container.appendChild(wrap);
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', function() {
      var score = 0;
      quizData.forEach(function(q, i) {
        var optsEl = container.children[i].querySelector('.quiz-opts');
        var correctAnswer = q._currentAnswer;
        if (picks[i] === correctAnswer) score++;
        Array.from(optsEl.children).forEach(function(b) {
          b.disabled = true;
          if (b.textContent === correctAnswer) b.classList.add('correct');
          else if (b.textContent === picks[i]) b.classList.add('incorrect');
        });
      });
      if (resultEl) {
        resultEl.classList.add('show');
        resultEl.innerHTML =
          '<div class="score">' + score + '/' + quizData.length + ' câu đúng</div>' +
          '<p style="margin:0.5rem 0 0; color:var(--ink-soft); font-size:0.9rem;">' +
          (score >= Math.ceil(quizData.length * 0.7) ? 'Xuất sắc — bạn đã nắm chắc bài này! Dấu mộc hoàn thành đã được đóng.' : 'Ổn rồi — xem lại các phần chưa chắc rồi thử lại nhé.') +
          '</p>';
      }
      submitBtn.disabled = true;
      if (score >= Math.ceil(quizData.length * 0.7) && onPass) onPass();
    });
  }
}
window.buildQuiz = buildQuiz;

/* ================= New Words Grid Builder ================= */
function buildWordGrid(container, words) {
  if (!words || !container) return;
  words.forEach(function(item) {
    var kr = item[0], vi = item[1];
    var c = document.createElement('div'); c.className = 'word-card';
    c.innerHTML = '<div class="kr">' + kr + ' <span class="speak-btn" data-kr="' + kr + '" style="font-size:12px;">\uD83D\uDD0A</span></div><div class="vi">' + vi + '</div>';
    c.querySelector('.speak-btn').addEventListener('click', function(e) { speak(e.target.dataset.kr); });
    container.appendChild(c);
  });
}
window.buildWordGrid = buildWordGrid;

/* ================= Stamp-Observer Helper ================= */
function stampOnView(sectionId, stampKey) {
  var el = document.getElementById(sectionId);
  if (!el) return;
  new IntersectionObserver(function(entries) {
    entries.forEach(function(en) { if (en.isIntersecting) stamp(stampKey); });
  }, {rootMargin: '-40% 0px -50% 0px'}).observe(el);
}
window.stampOnView = stampOnView;

})();
