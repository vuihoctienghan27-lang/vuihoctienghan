const state = { stamped:{} };
function stamp(key){
  if(state.stamped[key]) return;
  state.stamped[key]=true;
  const slot = document.querySelector('.stamp-slot[data-stamp="'+key+'"]');
  if(slot) slot.classList.add('stamped');
  const pill = document.querySelector('.nav-pill[data-target="sec-'+key+'"]');
  if(pill) pill.classList.add('done');
}
function speak(text){
  try{
    if(!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang='ko-KR'; u.rate=0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch(e){}
}

/* ================= Admin mode — Firebase Auth ================= */
const ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];
let isAdmin = false;
const adminFab = document.getElementById('adminFab');

function setAdminMode(on) {
  isAdmin = on;
  document.body.classList.toggle('admin-on', on);
  if (adminFab) adminFab.classList.toggle('admin-active', on);
}

// Lắng nghe Firebase Auth
(function waitForFirebase() {
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (user && ADMIN_EMAILS.includes(user.email)) {
        if (adminFab) adminFab.classList.add('visible');
      } else {
        if (adminFab) adminFab.classList.remove('visible');
        setAdminMode(false);
      }
    });
  } else {
    setTimeout(waitForFirebase, 300);
  }
})();

if (adminFab) {
  adminFab.addEventListener('click', () => {
    setAdminMode(!isAdmin);
  });
}

/* ================= Reusable: image slot ================= */
const LESSON_KEY = 'bai01_gapgo_media';
function getMediaStore() {
  try { return JSON.parse(localStorage.getItem(LESSON_KEY) || '{}'); } catch(e){ return {}; }
}
function saveMediaStore(store) {
  try { localStorage.setItem(LESSON_KEY, JSON.stringify(store)); } catch(e){}
  if (window.db) {
    window.db.collection('lessons_media').doc('gapgo_bai01').set(store, {merge: true}).catch(console.error);
  }
}

if (window.db) {
  window.db.collection('lessons_media').doc('gapgo_bai01').onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      try { localStorage.setItem(LESSON_KEY, JSON.stringify(data)); } catch(e){}
      document.querySelectorAll('[data-media-key]').forEach(el => {
        const key = el.getAttribute('data-media-key');
        if (data[key]) {
          if (el.classList.contains('flip-card')) {
            const emoEl = el.querySelector('.emo');
            if (emoEl) {
              const kr = el.querySelector('.kr') ? el.querySelector('.kr').textContent : '';
              emoEl.outerHTML = `<img src="${data[key]}" alt="${kr}" class="flip-img">`;
            } else {
              const img = el.querySelector('img');
              if (img && img.src !== data[key]) img.src = data[key];
            }
          } else if (el.classList.contains('audio-slot')) {
            const pw = el.querySelector('.audio-player-wrap');
            if (pw && !pw.querySelector('audio')) {
              pw.innerHTML = `<audio controls src="${data[key]}"></audio>`;
            } else {
              const audio = el.querySelector('audio');
              if (audio && audio.src !== data[key]) audio.src = data[key];
            }
          } else {
            const ph = el.querySelector('.placeholder-text');
            if (ph) {
              ph.outerHTML = `<img src="${data[key]}" alt="">`;
            } else {
              const img = el.querySelector('img');
              if (img && img.src !== data[key]) img.src = data[key];
            }
          }
        }
      });
    }
  });
}

/* ================= Reusable: answer-key store (same store/sync as media) ================= */
function getAnswer(key, fallback){
  const s = getMediaStore();
  const v = s['ans_' + key];
  return (v === undefined || v === null || v === '') ? fallback : v;
}
function setAnswer(key, value){
  const s = getMediaStore();
  s['ans_' + key] = value;
  saveMediaStore(s);
}

function buildImageSlot({label, ratio, compact, storageKey}){
  storageKey = storageKey || label;
  const wrap = document.createElement('div');
  wrap.className='img-slot' + (compact ? ' compact' : '');
  wrap.setAttribute('data-media-key', 'img_' + storageKey);
  if(ratio) wrap.style.aspectRatio = ratio;

  const store = getMediaStore();
  const savedUrl = store['img_' + storageKey];

  function applyImage(url) {
    wrap.innerHTML = `
      <img src="${url}" alt="${label}">
      <button class="pencil-btn" type="button" title="Đổi ảnh">✎</button>
      <div class="url-form">
        <input type="url" placeholder="Dán link ảnh mới..." value="${url}">
      </div>`;
    const pencil2 = wrap.querySelector('.pencil-btn');
    const form2 = wrap.querySelector('.url-form');
    const input2 = wrap.querySelector('input');
    pencil2.addEventListener('click',(e)=>{ e.stopPropagation(); form2.classList.toggle('open'); if(form2.classList.contains('open')){ input2.focus(); input2.select(); } });
    function saveNew(e){
      e.stopPropagation();
      const newUrl = input2.value.trim(); if(!newUrl) return;
      if(storageKey){ const s=getMediaStore(); s['img_'+storageKey]=newUrl; saveMediaStore(s); }
      applyImage(newUrl);
    }
    input2.addEventListener('keydown',(e)=>{ if(e.key==='Enter') saveNew(e); });
    wrap.addEventListener('click',(e)=>e.stopPropagation());
  }

  if(savedUrl){
    applyImage(savedUrl);
  } else {
    wrap.innerHTML = `
      <div class="placeholder-text">🖼️<br>${label}</div>
      <button class="pencil-btn" type="button" title="Thêm link ảnh">✎</button>
      <div class="url-form">
        <input type="url" placeholder="Dán link rồi nhấn Enter...">
      </div>`;
    const pencil = wrap.querySelector('.pencil-btn');
    const form = wrap.querySelector('.url-form');
    const input = wrap.querySelector('input');
    pencil.addEventListener('click',(e)=>{ e.stopPropagation(); form.classList.toggle('open'); if(form.classList.contains('open')) input.focus(); });
    function save(e){
      e.stopPropagation();
      const url = input.value.trim(); if(!url) return;
      if(storageKey){ const s=getMediaStore(); s['img_'+storageKey]=url; saveMediaStore(s); }
      applyImage(url);
    }
    input.addEventListener('keydown',(e)=>{ if(e.key==='Enter') save(e); });
    wrap.addEventListener('click',(e)=>e.stopPropagation());
  }
  return wrap;
}

/* ================= Reusable: audio slot ================= */
function buildAudioSlot({label, storageKey}){
  storageKey = storageKey || label;
  const wrap = document.createElement('div');
  wrap.className='audio-slot';
  wrap.setAttribute('data-media-key', 'audio_' + storageKey);

  const store = getMediaStore();
  const savedUrl = store['audio_' + storageKey];

  function buildHead(hasAudio) {
    return `
      <div class="audio-slot-head">
        <span class="audio-icon">🔊</span>
        <span class="audio-label">${label}</span>
        <button class="audio-pencil" type="button" title="${hasAudio ? 'Đổi audio' : 'Thêm link audio'}">✎</button>
      </div>
      <div class="audio-form">
        <input type="url" placeholder="Dán link audio rồi nhấn Enter..."${hasAudio ? ' value="'+savedUrl+'"' : ''}>
      </div>
      <div class="audio-player-wrap">${hasAudio ? '<audio controls src="'+savedUrl+'"></audio>' : ''}</div>`;
  }

  wrap.innerHTML = buildHead(!!savedUrl);

  function attachEvents() {
    const pencil = wrap.querySelector('.audio-pencil');
    const form = wrap.querySelector('.audio-form');
    const input = wrap.querySelector('.audio-form input');
    const playerWrap = wrap.querySelector('.audio-player-wrap');
    pencil.addEventListener('click',(e)=>{ e.stopPropagation(); form.classList.toggle('open'); if(form.classList.contains('open')) input.focus(); });
    function save(e){
      e.stopPropagation();
      const url = input.value.trim(); if(!url) return;
      if(storageKey){ const s=getMediaStore(); s['audio_'+storageKey]=url; saveMediaStore(s); }
      playerWrap.innerHTML = `<audio controls src="${url}"></audio>`;
      input.value = url;
      form.classList.remove('open');
    }
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') save(e); });
  }
  attachEvents();
  return wrap;
}

/* ================= Reusable: graded fill-in (with admin-editable correct answer) ================= */
function buildFillChecklist(container, items, onAnyCheck){
  items.forEach((it, idx)=>{
    const key = it.key || (container.id||'fill') + '_' + idx;
    let currentAnswer = getAnswer('fill_'+key, it.answer || '');
    const row = document.createElement('div');
    row.className='fill-row';
    row.innerHTML = `
      <div class="fill-prompt">${it.prompt} <button type="button" class="answer-pencil" title="Sửa đáp án chuẩn">✎</button></div>
      <div class="fill-input-wrap">
        <input type="text" class="fill-input" placeholder="Nhập câu trả lời bằng tiếng Hàn...">
        <button type="button" class="fill-check-btn">Kiểm tra</button>
      </div>
      <div class="fill-feedback"></div>`;
    const input = row.querySelector('.fill-input');
    const btn = row.querySelector('.fill-check-btn');
    const fb = row.querySelector('.fill-feedback');
    const pencil = row.querySelector('.answer-pencil');
    function refreshPencil(){ pencil.classList.toggle('unset', !currentAnswer); pencil.title = currentAnswer ? ('Đáp án chuẩn: '+currentAnswer+' — bấm để sửa') : 'Chưa có đáp án chuẩn — bấm để nhập'; }
    refreshPencil();
    btn.addEventListener('click', ()=>{
      if(!currentAnswer){ fb.textContent='Chưa có đáp án chuẩn cho câu này — bật chế độ quản trị để nhập.'; fb.className='fill-feedback no'; return; }
      const norm = s => (s||'').replace(/\s+/g,'').replace(/[.?!,]/g,'');
      const ok = norm(input.value) === norm(currentAnswer);
      fb.textContent = ok ? '✓ Chính xác!' : ('Đáp án gợi ý: ' + currentAnswer);
      fb.className = 'fill-feedback ' + (ok ? 'ok':'no');
      input.classList.toggle('correct', ok);
      input.classList.toggle('incorrect', !ok);
      if(onAnyCheck) onAnyCheck();
    });
    pencil.addEventListener('click', (e)=>{
      e.stopPropagation();
      const existing = row.querySelector('.answer-editor');
      if(existing){ existing.remove(); return; }
      const editor = document.createElement('div'); editor.className='answer-editor';
      editor.innerHTML = `<span class="answer-editor-label">Đáp án chuẩn:</span><input type="text" class="answer-editor-input" value="${currentAnswer||''}" placeholder="Nhập đáp án rồi nhấn Enter...">`;
      const ei = editor.querySelector('.answer-editor-input');
      function save(){
        const v = ei.value.trim(); if(!v) return;
        currentAnswer = v; setAnswer('fill_'+key, v);
        fb.textContent=''; fb.className='fill-feedback'; input.classList.remove('correct','incorrect');
        refreshPencil(); editor.remove();
      }
      ei.addEventListener('keydown', ev=>{ if(ev.key==='Enter') save(); });
      row.insertBefore(editor, row.querySelector('.fill-input-wrap'));
      ei.focus(); ei.select();
    });
    container.appendChild(row);
  });
}

/* ================= Reusable: choice list (O/X, Yes/No, MCQ...) with admin-editable correct answer ================= */
function buildChoiceList(container, items, onAllDone){
  let doneCount=0;
  items.forEach((it, idx)=>{
    const key = it.key || (container.id||'choice') + '_' + idx;
    let currentAnswer = getAnswer('choice_'+key, it.answer || '');
    const row=document.createElement('div');
    row.className='ox-row';
    const btnsHtml = it.choices.map(c=>`<button type="button" class="ox-btn" data-v="${c.value}"${c.wide?' style="width:auto;"':''}>${c.label}</button>`).join('');
    row.innerHTML = `<div class="ox-text">${it.text}</div><div class="ox-btns">${btnsHtml}<button type="button" class="answer-pencil" title="Sửa đáp án đúng">✎</button></div>`;
    const btns = row.querySelectorAll('.ox-btn');
    const pencil = row.querySelector('.answer-pencil');
    function refreshPencil(){ pencil.classList.toggle('unset', !currentAnswer); pencil.title = currentAnswer ? ('Đáp án đúng: '+currentAnswer+' — bấm để sửa') : 'Chưa đặt đáp án — bấm để chọn'; }
    refreshPencil();
    btns.forEach(b=>b.addEventListener('click', ()=>{
      if(row.dataset.done) return;
      if(currentAnswer){
        const correct = b.dataset.v === currentAnswer;
        b.classList.add(correct?'correct':'wrong');
        if(!correct){ [...btns].find(x=>x.dataset.v===currentAnswer).classList.add('correct'); }
      } else {
        b.classList.add('picked-neutral');
      }
      row.dataset.done='1'; doneCount++;
      if(doneCount===items.length && onAllDone) onAllDone();
    }));
    pencil.addEventListener('click',(e)=>{
      e.stopPropagation();
      const existing = row.querySelector('.answer-editor');
      if(existing){ existing.remove(); return; }
      const editor=document.createElement('div'); editor.className='answer-editor';
      editor.innerHTML = `<span class="answer-editor-label">Đáp án đúng:</span>` + it.choices.map(c=>`<button type="button" class="answer-editor-opt${c.value===currentAnswer?' active':''}" data-v="${c.value}">${c.label}</button>`).join('');
      editor.querySelectorAll('.answer-editor-opt').forEach(ob=>{
        ob.addEventListener('click',(ev)=>{
          ev.stopPropagation();
          currentAnswer = ob.dataset.v; setAnswer('choice_'+key, currentAnswer);
          editor.querySelectorAll('.answer-editor-opt').forEach(x=>x.classList.remove('active'));
          ob.classList.add('active');
          refreshPencil();
          if(row.dataset.done){ doneCount--; row.dataset.done=''; }
          btns.forEach(b=>b.classList.remove('correct','wrong','picked-neutral'));
          editor.remove();
        });
      });
      row.appendChild(editor);
    });
    container.appendChild(row);
  });
}
function buildOXList(container, items, onAllDone){
  buildChoiceList(container, items.map((it,i)=>({key:it.key||((container.id||'ox')+'_'+i), text:it.text, answer:it.answer, choices:[{value:'O',label:'O'},{value:'X',label:'X'}]})), onAllDone);
}
function buildYesNoList(container, items, onAllDone){
  buildChoiceList(container, items.map((it,i)=>({key:it.key||((container.id||'yn')+'_'+i), text:it.text, answer:it.answer, choices:[{value:'네',label:'네',wide:true},{value:'아니요',label:'아니요',wide:true}]})), onAllDone);
}

/* ================= Reusable: open prompt with optional hint ================= */
function buildOpenPrompt(container, {prompt, placeholder, hint, lines, lined}){
  const wrap=document.createElement('div');
  wrap.className='fill-row';
  wrap.innerHTML = `
    <div class="fill-prompt">${prompt||''}</div>
    <textarea class="open-textarea ${lined?'lined-textarea':''}" rows="${lines||3}" placeholder="${placeholder||''}"></textarea>
    ${hint ? `<button type="button" class="hint-btn">Xem gợi ý</button><div class="hint-box"></div>` : ''}`;
  if(hint){
    const btn = wrap.querySelector('.hint-btn');
    const box = wrap.querySelector('.hint-box');
    btn.addEventListener('click', ()=>{
      box.classList.toggle('open');
      box.innerHTML = box.classList.contains('open') ? hint : '';
    });
  }
  container.appendChild(wrap);
}

/* ================= Reusable: generic matching (with admin-editable correct pairing) ================= */
function buildMatching(leftEl, rightEl, leftItems, rightItems, onAllMatched, graded, matchId){
  let selected=null, matched=0;
  leftItems.forEach(it=>{
    const el=document.createElement('div');
    el.className='match-item kr'; el.dataset.key=it.key;
    if(it.node) el.appendChild(it.node); else el.innerHTML = it.html;
    el.addEventListener('click', (e)=>{
      if(e.target.closest('.img-slot') || e.target.closest('.answer-editor') || e.target.closest('.answer-pencil')) return;
      if(el.classList.contains('paired-correct')) return;
      leftEl.querySelectorAll('.match-item').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected'); selected=el;
    });
    leftEl.appendChild(el);
  });
  rightItems.forEach(it=>{
    const el=document.createElement('div');
    el.className='match-item';
    const storeKey = matchId ? ('match_'+matchId+'_'+it.key) : null;
    let correctKey = storeKey ? getAnswer(storeKey, it.correctKey || '') : (it.correctKey || '');
    el.dataset.correctKey = correctKey;
    const content = document.createElement('div');
    if(it.node) content.appendChild(it.node); else content.innerHTML = it.html;
    el.appendChild(content);
    if(matchId){
      const pencil = document.createElement('button');
      pencil.type='button'; pencil.className='answer-pencil'; pencil.style.cssText='margin-top:6px;';
      function refreshPencil(){
        pencil.classList.toggle('unset', !correctKey);
        const l = leftItems.find(x=>x.key===correctKey);
        pencil.title = correctKey ? ('Đáp án đúng: '+(l?l.label:correctKey)+' — bấm để sửa') : 'Chưa đặt đáp án đúng — bấm để chọn';
        pencil.textContent = '✎';
      }
      refreshPencil();
      pencil.addEventListener('click',(e)=>{
        e.stopPropagation();
        const existing = el.querySelector('.answer-editor');
        if(existing){ existing.remove(); return; }
        const editor=document.createElement('div'); editor.className='answer-editor';
        const sel=document.createElement('select'); sel.className='answer-editor-select';
        sel.innerHTML = `<option value="">— chưa chọn —</option>` + leftItems.map(l=>`<option value="${l.key}"${l.key===correctKey?' selected':''}>${l.label||l.key}</option>`).join('');
        sel.addEventListener('click', ev=>ev.stopPropagation());
        sel.addEventListener('change', ()=>{
          correctKey = sel.value; el.dataset.correctKey = correctKey;
          if(storeKey) setAnswer(storeKey, correctKey);
          el.classList.remove('paired-correct','paired-wrong');
          refreshPencil(); editor.remove();
        });
        editor.appendChild(sel);
        el.appendChild(editor);
      });
      el.appendChild(pencil);
    }
    el.addEventListener('click',(e)=>{
      if(e.target.closest('.img-slot') || e.target.closest('.answer-editor') || e.target.closest('.answer-pencil')) return;
      if(!selected || el.classList.contains('paired-correct')) return;
      const ck = el.dataset.correctKey;
      const isMatch = (graded===false || !ck) ? true : (selected.dataset.key===ck);
      if(isMatch){
        selected.classList.add('paired-correct'); selected.classList.remove('selected');
        el.classList.add('paired-correct');
        matched++;
        if(matched===leftItems.length && onAllMatched) onAllMatched();
      } else {
        el.classList.add('paired-wrong');
        setTimeout(()=>el.classList.remove('paired-wrong'),500);
      }
      selected=null;
    });
    rightEl.appendChild(el);
  });
}

/* ================= Reusable: small square image node (for matching lists) ================= */
function iconNode(label, storageKey){
  const n=document.createElement('div'); n.className='img-cap-cell';
  n.appendChild(buildImageSlot({label, ratio:'1/1', compact:true, storageKey}));
  const cap=document.createElement('div'); cap.className='img-grid-cap'; cap.textContent=label;
  n.appendChild(cap);
  return n;
}
/* ================= Reusable: image slot + caption ALWAYS visible outside the image =================
   (so the description stays readable even after an admin uploads a real photo, which would
   otherwise replace the inner placeholder text entirely)
================================================================================================= */
function imageWithCaption({label, ratio, compact, storageKey}){
  const wrap = document.createElement('div'); wrap.className='img-cap-cell';
  wrap.appendChild(buildImageSlot({label, ratio, compact, storageKey}));
  const cap = document.createElement('div'); cap.className='img-grid-cap'; cap.textContent = label;
  wrap.appendChild(cap);
  return wrap;
}

/* ================= Reusable: image + fill-in-the-blank grid (with admin-editable answer) =================
   Fixes: each item gets its own fully independent scope via a dedicated builder function,
   so editing one card's answer never affects, or gets stuck on, another card.
================================================================================================= */
function buildImageAnswerGrid(container, items, cols){
  const grid = document.createElement('div'); grid.className='img-grid' + (cols===2 ? ' cols-2' : '');
  container.appendChild(grid);
  function buildOneCell(it){
    let currentAnswer = getAnswer('fill_'+it.key, it.answer || '');
    const cell=document.createElement('div');
    cell.appendChild(imageWithCaption({label:it.label, ratio:'4/3', compact:true, storageKey: it.storageKey || ('imgfill_'+it.key)}));
    const inputWrap=document.createElement('div'); inputWrap.style.cssText='display:flex; gap:4px; margin-top:4px; align-items:center;';
    inputWrap.innerHTML = `<input type="text" class="fill-input" style="font-size:12px; padding:5px 7px;" placeholder="Viết tiếng Hàn"><button type="button" class="fill-check-btn" style="font-size:11px; padding:0 8px;">✓</button><button type="button" class="answer-pencil" title="Sửa đáp án đúng"></button>`;
    const inp = inputWrap.querySelector('input');
    const btn = inputWrap.querySelector('.fill-check-btn');
    const pencil = inputWrap.querySelector('.answer-pencil');
    function refreshPencil(){
      pencil.classList.toggle('unset', !currentAnswer);
      pencil.title = currentAnswer ? ('Đáp án: '+currentAnswer+' — bấm để sửa') : 'Chưa có đáp án — bấm để nhập';
      pencil.textContent='✎';
    }
    refreshPencil();
    btn.addEventListener('click', ()=>{
      if(!currentAnswer){ inp.title='Chưa có đáp án chuẩn — bật quản trị để nhập.'; return; }
      const norm = s=>(s||'').replace(/\s+/g,'').replace(/[.?!,]/g,'');
      const ok = norm(inp.value)===norm(currentAnswer);
      inp.classList.toggle('correct', ok); inp.classList.toggle('incorrect', !ok);
    });
    pencil.addEventListener('click',(e)=>{
      e.stopPropagation();
      const existing = cell.querySelector('.answer-editor');
      if(existing){ existing.remove(); return; }
      const editor=document.createElement('div'); editor.className='answer-editor'; editor.style.marginTop='4px';
      editor.innerHTML = `<input type="text" class="answer-editor-input" value="${currentAnswer||''}" placeholder="Đáp án, Enter để lưu...">`;
      const ei = editor.querySelector('.answer-editor-input');
      function save(){ const v=ei.value.trim(); if(!v) return; currentAnswer=v; setAnswer('fill_'+it.key, v); inp.classList.remove('correct','incorrect'); refreshPencil(); editor.remove(); }
      ei.addEventListener('keydown', ev=>{ if(ev.key==='Enter') save(); });
      cell.appendChild(editor); ei.focus(); ei.select();
    });
    cell.appendChild(inputWrap);
    return cell;
  }
  items.forEach(it=>{ grid.appendChild(buildOneCell(it)); });
}

/* ================================================================
   HERO PHOTOS
================================================================ */
const heroRow = document.getElementById('heroPhotoRow');
heroRow.appendChild(buildImageSlot({label:'Ảnh 1 · Bắt tay chào khách đến thăm nhà', ratio:'4/3', storageKey:'hero1'}));
heroRow.appendChild(buildImageSlot({label:'Ảnh 2 · Giới thiệu / tặng quà khi thăm viếng', ratio:'4/3', storageKey:'hero2'}));
new IntersectionObserver((entries)=>{ entries.forEach(en=>{ if(en.isIntersecting) stamp('obj'); }); },{rootMargin:'-40% 0px -50% 0px'}).observe(document.getElementById('sec-obj'));

/* ================================================================
   NAV SCROLLSPY
================================================================ */
const tocFab = document.getElementById('tocFab');
const tocCloseBtn = document.getElementById('tocCloseBtn');
if (tocFab) tocFab.addEventListener('click', () => document.body.classList.toggle('toc-open'));
if (tocCloseBtn) tocCloseBtn.addEventListener('click', () => document.body.classList.remove('toc-open'));

const pills = document.querySelectorAll('.nav-pill');
pills.forEach(p => p.addEventListener('click', ()=>{
  document.getElementById(p.dataset.target).scrollIntoView({behavior:'smooth'});
  if (window.innerWidth < 768) document.body.classList.remove('toc-open');
}));
const sectionIds = ['sec-obj','sec-vocab','sec-gram','sec-speak','sec-listen','sec-read','sec-write','sec-pron','sec-culture','sec-newwords','sec-quiz'];
const io = new IntersectionObserver((entries)=>{
  entries.forEach(en=>{
    const pill = document.querySelector('.nav-pill[data-target="'+en.target.id+'"]');
    if(en.isIntersecting && pill){ pills.forEach(p=>p.classList.remove('active')); pill.classList.add('active'); }
  });
},{rootMargin:'-40% 0px -50% 0px'});
sectionIds.forEach(id=>{ const el=document.getElementById(id); if(el) io.observe(el); });

/* ================================================================
   VOCAB
================================================================ */
const relations = [
  ['남편','👨‍💼','chồng'],['아내','👩‍💼','vợ'],['선배','🧑‍🎓','tiền bối (người lớp trước)'],['후배','🧑‍🎓','hậu bối (người lớp sau)'],
  ['주인','🧑‍🍳','chủ nhân'],['손님','🙋','khách'],['상사','💼','thượng cấp (cấp trên)'],['부하','📋','nhân viên (cấp dưới)']
];
const visits = [
  ['초대하다','✉️','mời'],['초대를 받다','📩','nhận lời mời'],['방문하다','🚪','thăm hỏi'],
  ['소개하다','🗣️','giới thiệu'],['소개를 받다','👋','được giới thiệu'],['인사하다','🙇','chào hỏi']
];
const greetings = [
  ['잘 먹겠습니다.','Tôi sẽ ăn rất ngon. (Nói trước khi ăn)'],
  ['잘 먹었습니다.','Tôi đã ăn rất ngon. (Nói sau khi ăn)'],
  ['실례하겠습니다.','Xin lỗi …. (nói trước khi làm phiền / xin phép)'],
  ['실례했습니다.','Xin lỗi đã làm phiền. (nói sau khi đã làm phiền)']
];
let seenCount = 0;
const totalVocab = relations.length + visits.length;
function updateVocabProgress(){
  document.getElementById('vocabProgLabel').textContent = 'Đã xem '+seenCount+'/'+totalVocab+' thẻ';
  document.getElementById('vocabProgFill').style.width = Math.min(100, Math.round(seenCount/totalVocab*100))+'%';
  if(seenCount >= 4) stamp('vocab');
}
function buildFlipGrid(container, data, imgEditable){
  data.forEach(([kr,emo,vi])=>{
    const sKey = 'flip_' + kr;
    const store = getMediaStore();
    const savedImg = imgEditable ? store['img_' + sKey] : null;

    const card = document.createElement('div');
    card.className='flip-card';
    if (imgEditable) card.setAttribute('data-media-key', 'img_' + sKey);

    let frontContent;
    if(savedImg) {
      frontContent = `
        <img src="${savedImg}" alt="${kr}" class="flip-img">
        <div class="kr">${kr}</div>
        ${imgEditable ? `<button class="pencil-btn" type="button" title="Đổi ảnh cho ${kr}">✎</button>
        <div class="url-form"><input type="url" placeholder="Link mới rồi Enter..."></div>` : ''}`;
    } else {
      frontContent = `
        <div class="emo">${emo}</div>
        <div class="kr">${kr}</div>
        ${imgEditable ? `<button class="pencil-btn" type="button" title="Thêm ảnh thật cho ${kr}">✎</button>
        <div class="url-form"><input type="url" placeholder="Dán link rồi Enter..."></div>` : ''}`;
    }

    card.innerHTML = `
      <div class="flip-inner">
        <div class="flip-face flip-front">
          ${frontContent}
        </div>
        <div class="flip-face flip-back">
          <div class="vi">${vi}</div>
          <div class="kr-small">${kr} <span class="speak-btn" data-kr="${kr}">🔊</span></div>
        </div>
      </div>`;

    card.addEventListener('click',(e)=>{
      if(e.target.classList.contains('speak-btn')){ speak(e.target.dataset.kr); return; }
      if(imgEditable && (e.target.closest('.pencil-btn') || e.target.closest('.url-form'))) return;
      card.classList.toggle('flipped');
      if(!card.classList.contains('seen')){ card.classList.add('seen'); seenCount++; updateVocabProgress(); }
    });

    if(imgEditable){
      function attachFlipImgEditor() {
        const front = card.querySelector('.flip-front');
        const pencil = front.querySelector('.pencil-btn');
        const form   = front.querySelector('.url-form');
        const input  = front.querySelector('input');
        if(!pencil || !form || !input) return;
        pencil.addEventListener('click',(e)=>{
          e.stopPropagation();
          form.classList.toggle('open');
          if(form.classList.contains('open')) input.focus();
        });
        function saveFlipImg(e){
          e.stopPropagation();
          const url = input.value.trim(); if(!url) return;
          const s = getMediaStore(); s['img_' + sKey] = url; saveMediaStore(s);
          const emoEl = front.querySelector('.emo');
          const imgEl = front.querySelector('.flip-img');
          if(emoEl) emoEl.outerHTML = `<img src="${url}" alt="${kr}" class="flip-img">`;
          else if(imgEl) imgEl.src = url;
          front.querySelector('.kr').style.display = '';
          form.classList.remove('open');
        }
        input.addEventListener('keydown',(e)=>{ if(e.key==='Enter') saveFlipImg(e); });
      }
      attachFlipImgEditor();
    }
    container.appendChild(card);
  });
}
buildFlipGrid(document.getElementById('grid-relation'), relations, true);
buildFlipGrid(document.getElementById('grid-visit'), visits, true);
const greetGrid = document.getElementById('grid-greet');
greetings.forEach(([kr,vi])=>{
  const d = document.createElement('div');
  d.className='greet-card';
  d.innerHTML = `<div class="kr">${kr} <span class="speak-btn" data-kr="${kr}">🔊</span></div><div class="vi">${vi}</div>`;
  d.addEventListener('click',(e)=>{
    if(e.target.classList.contains('speak-btn')){ e.stopPropagation(); speak(e.target.dataset.kr); return; }
    d.classList.toggle('revealed');
  });
  greetGrid.appendChild(d);
});

/* ================================================================
   GRAMMAR
================================================================ */
const grammar = [
  {kr:'의', mean:'của… (trợ từ sở hữu)', note:'Tiểu từ thể hiện sự phụ thuộc hoặc sở hữu của danh từ đứng trước nó và danh từ đứng sau nó, nghĩa trong tiếng Việt là "của". Có trường hợp 의 có thể được giản lược.',
   examples:[['오늘은 친구의 생일입니다.','Hôm nay là sinh nhật của bạn tôi.'],['김 선생님의 가방이 책상 위에 있어요.','Cặp của thầy Kim ở trên bàn.'],['토요일에 남 씨의 친구를 만나려고 해요.','Tôi muốn gặp bạn của Nam vào thứ bảy.'],['아버지의 동생은 작은아버지입니다.','Em trai của bố là chú.'],['저 책이 흐엉 씨의 것입니다.','Quyển sách kia của Hương.']],
   referNote:'<b>&lt;Tham khảo&gt;</b> Từ 저의 và 나의 có thể rút gọn thành 제 và 내, nghĩa là "của tôi".',
   referExamples:[['제 이름은 흐엉입니다.','Tên tôi là Hương.'],['그 사람은 내 동생이에요.','Người đó là em của tôi.'],['제 가족을 소개하겠습니다.','Tôi sẽ giới thiệu gia đình tôi.'],['이것이 내 전화번호예요.','Đây là số điện thoại của tôi.'],['내 친구의 이름은 유나예요.','Tên bạn tôi là Yuna.']]},
  {kr:'-(으)ㄹ 때', mean:'khi…', note:'Kết hợp với thân của động từ hoặc tính từ để biểu hiện thời điểm xảy ra một sự việc nào đó hoặc thời điểm tiếp tục một trạng thái nào đó. Gắn -을 때 vào sau thân động từ/tính từ kết thúc bằng phụ âm và -ㄹ 때 vào sau thân kết thúc bằng nguyên âm. Thân kết thúc bằng ㄹ thì gắn -ㄹ 때 và loại bỏ ㄹ của từ gốc.',
   examples:[['아플 때 이 약을 드세요.','Lúc (bạn) bị đau thì hãy uống thuốc này nhé.'],['밥을 먹을 때 전화가 왔어요.','Khi (tôi) đang ăn cơm thì điện thoại đến.']],
   dialogues:[{a:['언제 태권도를 배웠어요?','(Bạn) đã học Taekwondo khi nào vậy?'], b:['한국에서 살 때 태권도를 배웠어요.','Tôi đã học Taekwondo khi sống ở Hàn Quốc.']}],
   moreExamples:[['이 옷을 만들 때 정말 힘들었어요.','Tôi đã rất vất vả khi may chiếc áo này.'],['한국말을 들을 때 좀 어려워요.','Tiếng Hàn khi nghe thì hơi khó.'],['날씨가 더울 때 수영장에 가요.','Khi trời nóng thì (tôi) đi bơi.']]},
  {kr:'-아/어 주다', mean:'làm… giúp/cho ai đó', note:'Gắn với thân của động từ để biểu hiện việc thực hiện một hành vi nào đó cho người khác. Thân động từ kết thúc bằng nguyên âm ㅏ hay ㅗ thì thêm -아 주다, trường hợp khác thì thêm -어 주다, với động từ có 하다 thì dùng 해 주다.',
   examples:[['창문을 좀 닫아 주세요.','Xin hãy đóng cửa sổ giúp cho.'],['나는 친구의 가방을 들어 줍니다.','Tôi xách cái túi giúp bạn.'],['초대해 주셔서 감사합니다.','Xin cảm ơn vì (đã) mời.'],['이것 좀 도와주세요.','(Anh) giúp tôi việc này nhé.']],
   dialogues:[{a:['제가 사진을 찍어 드릴까요?','Tôi chụp ảnh cho anh nhé?'], b:['네, 부탁합니다.','Vâng, nhờ anh chụp hộ.']}],
   moreExamples:[['지우개 좀 빌려 주시겠어요?','Cho tôi mượn cục tẩy một chút nhé?']],
   referNote:'<b>&lt;Tham khảo&gt;</b> Nếu người tiếp nhận tác động của hành vi có vị trí cao hơn hoặc nhiều tuổi hơn chủ thể thực hiện hành động thì sử dụng <span class="hl">-아/어 드리다</span> thay cho -아/어 주다.'}
];
const gramList = document.getElementById('gramList');
function renderExRows(list){
  return list.map(([kr,vi])=>`<div class="ex-row"><span class="kr">${kr}</span><span class="vi">${vi}</span></div>`).join('');
}
function renderDialogues(list){
  return list.map(d=>`<div class="ex-row"><span class="kr"><b>A</b> ${d.a[0]}</span><span class="vi">${d.a[1]}</span></div><div class="ex-row"><span class="kr"><b>B</b> ${d.b[0]}</span><span class="vi">${d.b[1]}</span></div>`).join('');
}
grammar.forEach(g=>{
  const card = document.createElement('div'); card.className='gram-card';
  let bodyHtml = `<p class="gram-note">${g.note}</p>`;
  bodyHtml += renderExRows(g.examples);
  if(g.dialogues) bodyHtml += renderDialogues(g.dialogues);
  if(g.moreExamples) bodyHtml += renderExRows(g.moreExamples);
  if(g.referNote) bodyHtml += `<div class="refer-box">${g.referNote}</div>`;
  if(g.referExamples) bodyHtml += `<div style="margin-top:6px;">${renderExRows(g.referExamples)}</div>`;
  card.innerHTML = `<div class="gram-head"><div><span class="g-title kr">${g.kr}</span><br><span class="g-mean">${g.mean}</span></div><span class="gram-chevron">▾</span></div>
    <div class="gram-body">${bodyHtml}</div>`;
  card.querySelector('.gram-head').addEventListener('click',()=>card.classList.toggle('open'));
  gramList.appendChild(card);
});
const mq = [
  {sentence:'오늘은 친구___ 생일입니다.', choices:['의','을'], answer:'의'},
  {sentence:'아플 ___ 이 약을 드세요.', choices:['때','대'], answer:'때'},
  {sentence:'창문을 좀 닫아 ___.', choices:['주세요','주다'], answer:'주세요'}
];
let mqCorrect = 0;
const mqBox = document.getElementById('miniQuiz');
mq.forEach((q,qi)=>{
  const key = 'mq_'+qi;
  let currentAnswer = getAnswer('choice_'+key, q.answer);
  const row = document.createElement('div'); row.className='mq-item';
  row.innerHTML = `<div class="mq-sentence kr">${q.sentence} <button type="button" class="answer-pencil" title="Sửa đáp án đúng">✎</button></div><div class="mq-choices"></div>`;
  const choicesEl = row.querySelector('.mq-choices');
  const pencil = row.querySelector('.answer-pencil');
  q.choices.forEach(c=>{
    const btn = document.createElement('button'); btn.className='choice-btn'; btn.textContent=c;
    btn.addEventListener('click',()=>{
      const btns = choicesEl.querySelectorAll('button'); btns.forEach(b=>b.disabled=true);
      if(c===currentAnswer){ btn.classList.add('correct'); mqCorrect++; }
      else{ btn.classList.add('wrong'); [...btns].find(b=>b.textContent===currentAnswer).classList.add('correct'); }
      if(mqCorrect===mq.length) stamp('gram');
    });
    choicesEl.appendChild(btn);
  });
  pencil.addEventListener('click',(e)=>{
    e.stopPropagation();
    const existing = row.querySelector('.answer-editor');
    if(existing){ existing.remove(); return; }
    const editor=document.createElement('div'); editor.className='answer-editor';
    editor.innerHTML = `<span class="answer-editor-label">Đáp án đúng:</span>` + q.choices.map(c=>`<button type="button" class="answer-editor-opt${c===currentAnswer?' active':''}" data-v="${c}">${c}</button>`).join('');
    editor.querySelectorAll('.answer-editor-opt').forEach(ob=>{
      ob.addEventListener('click',()=>{
        currentAnswer = ob.dataset.v; setAnswer('choice_'+key, currentAnswer);
        editor.querySelectorAll('.answer-editor-opt').forEach(x=>x.classList.remove('active'));
        ob.classList.add('active');
        choicesEl.querySelectorAll('button').forEach(b=>{ b.disabled=false; b.classList.remove('correct','wrong'); });
        editor.remove();
      });
    });
    row.appendChild(editor);
  });
  mqBox.appendChild(row);
});

/* ================================================================
   SPEAKING
================================================================ */
// 1.1 — mẫu + chọn từ quan hệ theo tranh (đáp án để trống, admin xác nhận theo ảnh gốc PDF)
const speakEx11Sample = document.createElement('div'); speakEx11Sample.className='sample-box';
speakEx11Sample.appendChild(buildImageSlot({label:'Ảnh mẫu · 준영/손님', ratio:'1/1', compact:true, storageKey:'speak11_sample'}));
speakEx11Sample.insertAdjacentHTML('beforeend', `<div class="sample-text"><div class="sample-label">Mẫu</div><span class="kr hl">준영의 손님</span>입니다.</div>`);
document.getElementById('speakEx11').before(speakEx11Sample);
buildImageAnswerGrid(document.getElementById('speakEx11'), [
  {key:'sp11_1', label:'(1) Tranh 2학년 → 3학년', answer:'', storageKey:'speak11_sp11_1'},
  {key:'sp11_2', label:'(2) Tranh 1학년 → 2학년', answer:'', storageKey:'speak11_sp11_2'},
  {key:'sp11_3', label:'(3) Tranh gắn với 선생님', answer:'', storageKey:'speak11_sp11_3'},
  {key:'sp11_4', label:'(4) Tranh gắn với 남편', answer:'', storageKey:'speak11_sp11_4'}
], 2);

// 1.2 — mẫu + chọn lời chào theo tranh (2 câu chắc chắn, 2 câu để admin xác nhận)
const speakEx12Sample = document.createElement('div'); speakEx12Sample.className='sample-box';
speakEx12Sample.appendChild(buildImageSlot({label:'Ảnh mẫu · tặng quà', ratio:'1/1', compact:true, storageKey:'speak12_sample'}));
speakEx12Sample.insertAdjacentHTML('beforeend', `<div class="sample-text"><div class="sample-label">Mẫu</div><span class="kr hl">감사합니다.</span></div>`);
document.getElementById('speakEx12').before(speakEx12Sample);
buildImageAnswerGrid(document.getElementById('speakEx12'), [
  {key:'sp12_1', label:'(1) Người ngồi ăn một mình', answer:'', storageKey:'speak12_sp12_1'},
  {key:'sp12_2', label:'(2) Hai người cùng ngồi ăn', answer:'', storageKey:'speak12_sp12_2'},
  {key:'sp12_3', label:'(3) Đi trên cầu thang đông người', answer:'실례하겠습니다.', storageKey:'speak12_sp12_3'},
  {key:'sp12_4', label:'(4) Hai người bắt tay làm quen', answer:'처음 뵙겠습니다.', storageKey:'speak12_sp12_4'}
], 2);

// 2.1
buildFillChecklist(document.getElementById('speakEx21'), [
  {prompt:'① 디엠 / 아내', answer:'디엠 씨의 아내입니다.'},
  {prompt:'② 한지원 / 동료', answer:'한지원 씨의 동료입니다.'},
  {prompt:'③ 남 / 후배', answer:'남 씨의 후배입니다.'},
  {prompt:'④ 김민준 / 동생', answer:'김민준 씨의 동생입니다.'}
]);
document.getElementById('speakEx21').insertAdjacentHTML('afterbegin', `<div class="sample-box"><div class="sample-text"><div class="sample-label">Mẫu · 조민재/친구</div>A 실례지만 누구세요?<br>B <span class="hl">민재 씨의 친구</span>입니다.</div></div>`);

// 2.2 — mẫu + các lựa chọn có ảnh
const speakEx22El = document.getElementById('speakEx22');
speakEx22El.insertAdjacentHTML('beforeend', `<div class="sample-box" id="speakEx22Sample"><div class="sample-text"><div class="sample-label">Mẫu · 친구 집에 가다 / 케이크</div>A 친구 집에 갈 때 뭘 가져갈까요?<br>B <span class="hl">케이크</span>를 가져가세요.</div></div>`);
document.getElementById('speakEx22Sample').prepend(buildImageSlot({label:'Ảnh mẫu · 케이크', ratio:'1/1', compact:true, storageKey:'speak22_sample'}));
const speakEx22Grid = document.createElement('div'); speakEx22Grid.className='img-grid'; speakEx22Grid.style.marginBottom='12px';
speakEx22El.appendChild(speakEx22Grid);
[['① 병원에 가다 / 과일','speak22_1'],['② 학교에 가다 / 사전','speak22_2'],['③ 교수님 댁을 방문하다 / 꽃','speak22_3'],['④ 회사를 방문하다 / 명함','speak22_4']]
  .forEach(([label,sk])=>speakEx22Grid.appendChild(imageWithCaption({label, ratio:'4/3', compact:true, storageKey:sk})));
buildFillChecklist(speakEx22El, [
  {prompt:'① 병원에 가다 / 과일', answer:'병원에 갈 때 뭘 가져갈까요? 과일을 가져가세요.'},
  {prompt:'② 학교에 가다 / 사전', answer:'학교에 갈 때 뭘 가져갈까요? 사전을 가져가세요.'},
  {prompt:'③ 교수님 댁을 방문하다 / 꽃', answer:'교수님 댁을 방문할 때 뭘 가져갈까요? 꽃을 가져가세요.'},
  {prompt:'④ 회사를 방문하다 / 명함', answer:'회사를 방문할 때 뭘 가져갈까요? 명함을 가져가세요.'}
]);

// 2.3 — mẫu + ảnh lựa chọn + luyện tự do (câu hỏi phụ thuộc động từ khác nhau)
const speakEx23El = document.getElementById('speakEx23');
speakEx23El.insertAdjacentHTML('beforeend', `<div class="sample-box" id="speakEx23Sample"><div class="sample-text"><div class="sample-label">Mẫu · 교수님을 만나다 / 양복</div>A 한국 사람들은 교수님을 만날 때 뭘 입어요?<br>B 교수님을 만날 때 <span class="hl">양복</span>을 입어요.</div></div>`);
document.getElementById('speakEx23Sample').prepend(buildImageSlot({label:'Ảnh mẫu · 양복', ratio:'1/1', compact:true, storageKey:'speak23_sample'}));
const speakEx23Grid = document.createElement('div'); speakEx23Grid.className='img-grid'; speakEx23Grid.style.marginBottom='12px';
speakEx23El.appendChild(speakEx23Grid);
[['① 영화를 보다 / 팝콘','speak23_1'],['② 커피를 마시다 / 설탕과 크림','speak23_2'],['③ 밥을 먹다 / 숟가락','speak23_3'],['④ 사진을 찍다 / 김치','speak23_4']]
  .forEach(([label,sk])=>speakEx23Grid.appendChild(imageWithCaption({label, ratio:'4/3', compact:true, storageKey:sk})));
buildOpenPrompt(speakEx23El, {
  prompt:'Luyện nói theo mẫu với 4 tình huống trên.',
  placeholder:'한국 사람들은 영화를 볼 때 뭘 먹어요?\n영화를 볼 때 팝콘을 먹어요.',
  lines:4,
  hint:'① 영화를 볼 때 <span class="hl">팝콘</span>을 먹어요.<br>② 커피를 마실 때 <span class="hl">설탕과 크림</span>을 넣어요.<br>③ 밥을 먹을 때 <span class="hl">숟가락</span>을 사용해요.<br>④ 사진을 찍을 때 <span class="hl">김치</span>라고 말해요.'
});

// 2.4 mẫu ảnh + table + open
const speakEx24El = document.getElementById('speakEx24Open');
speakEx24El.insertAdjacentHTML('beforebegin', `<div class="sample-box" id="speakEx24Sample"><div class="sample-text"><div class="sample-label">Mẫu · 정우 씨 집 / 주스 / 집에 들어가다, 신발을 벗다</div>A 내일 정우 씨 집에 저녁 초대를 받았어요.<br>B 아, 그래요? 남 씨는 한국 사람의 집에 처음 가요?<br>A 네, 그래서 조금 걱정이에요. 정우 씨 집에 갈 때 뭘 가져갈까요?<br>B <span class="hl">주스</span>를 좀 사세요. 참, 한국 사람들은 <span class="hl">집에 들어갈 때 신발을 벗어요.</span><br>A 그래요? 몰랐어요. 고마워요, 수빈 씨.</div></div>`);
document.getElementById('speakEx24Sample').prepend(buildImageSlot({label:'Ảnh mẫu · hai người trò chuyện', ratio:'4/3', compact:true, storageKey:'speak24_sample'}));
const speakEx24Table = document.getElementById('speakEx24Table');
speakEx24Table.innerHTML = `<tr><th></th><th>(1)</th><th>(2)</th><th>(3)</th></tr>
  <tr><td>Nơi đến thăm</td><td>회사 동료의 집</td><td>김 선생님 댁</td><td>최 사장님 댁</td></tr>
  <tr><td>Quà mang theo</td><td>과일</td><td>케이크</td><td>술</td></tr>
  <tr><td>Điều cần chú ý</td><td>밥을 먹다 / 숟가락으로 먹다</td><td>집에 들어가다 / 모자를 벗다</td><td>어른에게 물건을 드리다 / 두 손으로 드리다</td></tr>`;
buildOpenPrompt(speakEx24El, {
  prompt:'Dựa vào bảng trên, luyện hội thoại theo mẫu.',
  placeholder:'내일 정우 씨 집에 저녁 초대를 받았어요...\n...',
  lines:5
});

// 3.1 mẫu ảnh + table + open
const speakEx3El = document.getElementById('speakEx3Open');
speakEx3El.insertAdjacentHTML('beforebegin', `<div class="sample-box" id="speakEx3Sample"><div class="sample-text"><div class="sample-label">Mẫu · A 누나 / B 학교 친구</div>A 어서 오세요, 남 씨. 저는 준영이 <span class="hl">누나</span>예요.<br>B 처음 뵙겠습니다. 저는 준영 씨의 <span class="hl">학교 친구</span>, 남이라고 합니다.<br>A 이야기 많이 들었어요. 만나서 반가워요.<br>B 참, 이거 받으세요. 주스 좀 샀어요.<br>A 그냥 와도 괜찮은데……. 감사합니다. 다음에는 그냥 오세요.<br>C 남 씨, 이쪽으로 앉으세요. 먼저 저녁을 먹읍시다. 한국에서는 밥을 먹을 때 숟가락과 젓가락을 사용해요.<br><br><i style="color:var(--ink-soft); font-size:0.82rem;">Lưu ý: Câu "그냥 와도 괜찮은데……" được dùng khi nói một cách lịch sự rằng người đến thăm mình không cần phải mang quà đến.</i></div></div>`);
document.getElementById('speakEx3Sample').prepend(buildImageSlot({label:'Ảnh mẫu · 3 người ở cửa nhà', ratio:'4/3', compact:true, storageKey:'speak3_sample'}));
const speakEx3Table = document.getElementById('speakEx3Table');
speakEx3Table.innerHTML = `<tr><th>A</th><th>B</th></tr>
  <tr><td>형 / 누나</td><td>친구</td></tr>
  <tr><td>아버지</td><td>선배</td></tr>
  <tr><td>어머니</td><td>후배</td></tr>`;
buildOpenPrompt(speakEx3El, {
  prompt:'Hãy tự giới thiệu về mình với người bạn gặp khi đến thăm nhà một người Hàn Quốc.',
  placeholder:'어서 오세요, 남 씨. 저는 준영이 누나예요...\n...',
  lines:6
});
document.getElementById('sec-speak').addEventListener('click', ()=>stamp('speak'));

/* ================================================================
   LISTENING (audio-dependent → not auto-graded)
================================================================ */
document.getElementById('audioT01').appendChild(buildAudioSlot({label:'CD1 Track 01 — Nghe và nối với bức tranh phù hợp', storageKey:'t01'}));
buildMatching(document.getElementById('listenMatch1Left'), document.getElementById('listenMatch1Right'),
  [{key:'1',label:'(1)',html:'(1)'},{key:'2',label:'(2)',html:'(2)'},{key:'3',label:'(3)',html:'(3)'},{key:'4',label:'(4)',html:'(4)'}],
  [{key:'a', node:iconNode('Tranh ⓐ','listen_t01_a')},{key:'b', node:iconNode('Tranh ⓑ','listen_t01_b')},
   {key:'c', node:iconNode('Tranh ⓒ','listen_t01_c')},{key:'d', node:iconNode('Tranh ⓓ','listen_t01_d')}],
  ()=>{}, true, 'listen_t01');

document.getElementById('audioT02').appendChild(buildAudioSlot({label:'CD1 Track 02 — Nghe đoạn hội thoại và nối quan hệ phù hợp với Jeongu', storageKey:'t02'}));
buildMatching(document.getElementById('listenMatch2Left'), document.getElementById('listenMatch2Right'),
  [{key:'1',label:'(1)',html:'(1)'},{key:'2',label:'(2)',html:'(2)'},{key:'3',label:'(3)',html:'(3)'},{key:'4',label:'(4)',html:'(4)'}],
  [{key:'a',html:'ⓐ 누나'},{key:'b',html:'ⓑ 동생'},{key:'c',html:'ⓒ 선배'},{key:'d',html:'ⓓ 선생님'},{key:'e',html:'ⓔ 어머니'}],
  ()=>{}, true, 'listen_t02');

document.getElementById('audioT03').appendChild(buildAudioSlot({label:'CD1 Track 03 — Nghe 4 đoạn hội thoại, tìm bức tranh phù hợp', storageKey:'t03'}));
buildMatching(document.getElementById('listenMatch3Left'), document.getElementById('listenMatch3Right'),
  [{key:'1',label:'(1)',html:'(1)'},{key:'2',label:'(2)',html:'(2)'},{key:'3',label:'(3)',html:'(3)'},{key:'4',label:'(4)',html:'(4)'}],
  [{key:'a', node:iconNode('Tranh ⓐ','listen_t03_a')},{key:'b', node:iconNode('Tranh ⓑ','listen_t03_b')},
   {key:'c', node:iconNode('Tranh ⓒ','listen_t03_c')},{key:'d', node:iconNode('Tranh ⓓ','listen_t03_d')}],
  ()=>{}, true, 'listen_t03');

document.getElementById('audioT04').appendChild(buildAudioSlot({label:'CD1 Track 04 — Nghe hội thoại, chọn phương án đúng/sai', storageKey:'t04'}));
const listenOXBox = document.getElementById('listenOX');
buildOXList(listenOXBox, [
  {key:'t04_1a', text:'(1)-① 루이엔 씨는 한국 친구를 집에 초대했어요.'},
  {key:'t04_1b', text:'(1)-② 루이엔 씨는 수빈 씨의 동생을 처음 만났어요.'},
  {key:'t04_1c', text:'(1)-③ 루이엔 씨의 동생은 한국대학교에 다녀요.'},
  {key:'t04_2a', text:'(2)-① 뚜안 씨는 지훈 씨의 아내를 처음 만났어요.'},
  {key:'t04_2b', text:'(2)-② 뚜안 씨는 과일을 가져갔어요.'},
  {key:'t04_2c', text:'(2)-③ 뚜안 씨는 점심을 먹으러 갔어요.'}
]);

document.getElementById('audioT05').appendChild(buildAudioSlot({label:'CD1 Track 05 — Nghe và điền vào chỗ trống', storageKey:'t05'}));
const listenFillBox = document.getElementById('listenFillDialog');
const listenFillNote = document.createElement('p');
listenFillNote.style.cssText='font-size:12.5px; color:var(--ink-soft); margin:-4px 0 10px;';
listenFillNote.textContent = 'Chưa có đáp án chuẩn cho các câu dưới đây vì phụ thuộc audio gốc — bật chế độ quản trị, nghe file audio đã dán rồi bấm ✎ để nhập đáp án đúng cho từng dòng.';
listenFillBox.appendChild(listenFillNote);
function dialogFillRows(dialogKey, lines){
  const rows = lines.map(([who, text], i)=>({
    key: dialogKey+'_'+i,
    prompt: `<b class="mono" style="font-size:11px; color:var(--ink-soft);">${who}</b> ${text}`,
    answer: ''
  }));
  buildFillChecklist(listenFillBox, rows);
}
dialogFillRows('t05_d1', [
  ['지훈','뚜안 씨, 어서 들어와요. 이쪽은 _______________ 예요.'],
  ['지훈 아내','어서 오세요, 뚜안 씨. _______________.'],
  ['뚜안','처음 뵙겠습니다. 뚜안입니다. _______________ 감사합니다. 지훈 씨, 이거 받으세요. 과일을 좀 샀어요.'],
  ['지훈','_______________……. 감사합니다.'],
  ['지훈 아내','_______________ 가 끝났어요. 어서 부엌으로 오세요.'],
  ['지훈','그럽시다. 뚜안 씨, 이쪽으로 오세요.']
]);
dialogFillRows('t05_d2', [
  ['풍','김 선생님, 안녕하세요?'],
  ['선생님','안녕하세요? 풍 씨. 여기에서 뭘 하세요?'],
  ['풍','친구와 같이 _______________ 왔어요. 선생님, _______________ 만이에요.'],
  ['만','안녕하세요? 만입니다.'],
  ['선생님','안녕하세요? 만 씨. _______________?'],
  ['만','네, 조금 할 수 있습니다. 베트남대학교에서 배웠어요.'],
  ['선생님','정말 _______________. 저는 풍 씨의 _______________ 이에요.']
]);

document.getElementById('audioT06').appendChild(buildAudioSlot({label:'CD1 Track 06 — Nghe hội thoại và trả lời câu hỏi', storageKey:'t06'}));
buildChoiceList(document.getElementById('listenMCQ'), [
  {key:'t06_1', text:'(1) 풍 씨는 왜 여기에 왔습니까?', choices:[{value:'컴퓨터를 사러',label:'컴퓨터를 사러',wide:true},{value:'점심을 먹으러',label:'점심을 먹으러',wide:true},{value:'김민준 씨를 만나러',label:'김민준 씨를 만나러',wide:true}]},
  {key:'t06_2', text:'(2) 풍 씨는 남자에게 무엇을 주었습니까?', choices:[{value:'돈',label:'돈',wide:true},{value:'명함',label:'명함',wide:true},{value:'선물',label:'선물',wide:true}]}
]);
document.getElementById('sec-listen').addEventListener('click', ()=>{ stamp('listen'); });

/* ================================================================
   READING (gradable from text)
================================================================ */
const readSentences = [
  {key:'r1', text:'(1) 공부할 때 음악을 듣습니다.'},
  {key:'r2', text:'(2) 요리할 때 노래를 합니다.'},
  {key:'r3', text:'(3) 밥을 먹을 때 숟가락으로 먹습니다.'},
  {key:'r4', text:'(4) 운동을 할 때 물을 많이 마십니다.'}
];
const readPics = [
  {letter:'a', label:'Tranh ⓐ (đang lái xe, nghe nhạc)'},
  {letter:'b', label:'Tranh ⓑ (học bài, nghe nhạc bằng tai nghe)'},
  {letter:'c', label:'Tranh ⓒ (nấu ăn, hát)'},
  {letter:'d', label:'Tranh ⓓ (ăn cơm bằng thìa)'},
  {letter:'e', label:'Tranh ⓔ (tập thể dục, uống nước)'}
];
const readLetterToKey = {b:'r1', c:'r2', d:'r3', e:'r4'};
buildMatching(document.getElementById('readMatchLeft'), document.getElementById('readMatchRight'),
  readSentences.map(s=>({key:s.key, label:s.text, html:s.text})),
  readPics.map(r=>{
    const node=document.createElement('div');
    const letterEl=document.createElement('div'); letterEl.style.cssText='font-weight:700; margin-bottom:4px;';
    letterEl.textContent = 'ⓐⓑⓒⓓⓔ'[['a','b','c','d','e'].indexOf(r.letter)];
    node.appendChild(letterEl);
    node.appendChild(imageWithCaption({label:r.label, ratio:'4/3', compact:true, storageKey:'read_ex1_'+r.letter}));
    return {key:'r_'+r.letter, node, correctKey: readLetterToKey[r.letter] || ''};
  }),
  ()=>stamp('read'), true, 'read_ex1');

buildOXList(document.getElementById('readOX1'), [
  {text:'(1)-① 금요일에 학생들은 식당에 갈 수 없습니다.', answer:'X'},
  {text:'(1)-② 금요일에 식당에 갈 때 돈을 가져오세요.', answer:'O'},
  {text:'(2)-① 학생들은 걱정이 있을 때 상담소를 방문할 수 있습니다.', answer:'O'},
  {text:'(2)-② 상담 시간은 여덟 시부터 두 시까지입니다.', answer:'X'}
]);

const readPassage1 = document.getElementById('readPassage1');
readPassage1.innerHTML = `
  <div class="match-wrap">
    <div>
      <p class="sub-heading" style="margin-bottom:6px;">집을 방문할 때</p>
      <div id="readPassageImgHome" style="max-width:180px; margin-bottom:8px;"></div>
      <p style="font-size:0.9rem; color:var(--ink-soft);">한국에서는 남의 집을 방문할 때 보통 <span class="hl">과일, 케이크, 과자</span>를 가져갑니다. 너무 일찍 가지 않습니다. 집에 들어갈 때 신발과 모자를 벗습니다. 집 주인에게 인사하고 선물을 줍니다. 식사할 때 숟가락과 젓가락으로 먹습니다. 먹을 때 소리를 많이 내지 않습니다.</p>
    </div>
    <div>
      <p class="sub-heading" style="margin-bottom:6px;">회사를 방문할 때</p>
      <div id="readPassageImgOffice" style="max-width:180px; margin-bottom:8px;"></div>
      <p style="font-size:0.9rem; color:var(--ink-soft);">회사를 방문할 때는 정장을 입습니다. <span class="hl">5~10분 일찍</span> 회사에 도착합니다. 코트는 사무실 앞에서 벗습니다. 사무실 앞에서 회사 직원에게 전화하고 기다립니다. 식사 시간에는 회사를 방문하지 않습니다.</p>
    </div>
  </div>`;
document.getElementById('readPassageImgHome').appendChild(imageWithCaption({label:'Ảnh · Khách mang quà đến thăm nhà', ratio:'4/3', compact:true, storageKey:'read_passage_home'}));
document.getElementById('readPassageImgOffice').appendChild(imageWithCaption({label:'Ảnh · Đến thăm công ty đúng giờ hẹn', ratio:'4/3', compact:true, storageKey:'read_passage_office'}));
buildChoiceList(document.getElementById('readClassify'), [
  {key:'rc1', text:'(1) 들어갈 때 신발을 벗습니다.', choices:[{value:'집',label:'집',wide:true},{value:'회사',label:'회사',wide:true}], answer:'집'},
  {key:'rc2', text:'(2) 약속 장소에 일찍 도착합니다.', choices:[{value:'집',label:'집',wide:true},{value:'회사',label:'회사',wide:true}], answer:'회사'},
  {key:'rc3', text:'(3) 직원에게 전화하고 기다립니다.', choices:[{value:'집',label:'집',wide:true},{value:'회사',label:'회사',wide:true}], answer:'회사'},
  {key:'rc4', text:'(4) 식사할 때 소리를 많이 내지 않습니다.', choices:[{value:'집',label:'집',wide:true},{value:'회사',label:'회사',wide:true}], answer:'집'}
], ()=>stamp('read'));
buildFillChecklist(document.getElementById('readAnswerFill'), [
  {prompt:'(1) 한국에서는 집을 방문할 때 보통 무엇을 가져갑니까?', answer:'과일, 케이크, 과자를 가져갑니다.'},
  {prompt:'(2) 회사를 방문할 때 어디에서 코트를 벗습니까?', answer:'사무실 앞에서 벗습니다.'},
  {prompt:'(3) 한국에서는 밥을 먹을 때 무엇으로 먹습니까?', answer:'숟가락과 젓가락으로 먹습니다.'}
]);

const readEmails = document.getElementById('readEmails');
readEmails.innerHTML = `
  <div class="card" style="background:var(--paper); margin-bottom:10px;">
    <p style="font-size:11px; color:var(--ink-soft); margin:0 0 4px;">보낸 사람: jiwonhan@hotmail.com · 받는 사람: ban@yahoo.com · 제목: 베트남 방문</p>
    <p class="kr" style="font-size:0.92rem; line-height:1.7; margin:0;">반 씨, 안녕하세요?<br>저는 다음 달 15일부터 18일까지 베트남에 갑니다.<br>우리 회사 동료와 같이 베트남 회사를 방문하려고 합니다.<br>그래서 베트남의 회사 방문 예절을 알고 싶어요. 좀 가르쳐 주세요.<br><span style="color:var(--ink-soft);">한지원 올림</span></p>
  </div>
  <div class="card" style="background:var(--paper);">
    <p style="font-size:11px; color:var(--ink-soft); margin:0 0 4px;">보낸 사람: ban@yahoo.com · 받는 사람: jiwonhan@hotmail.com · 제목: Re: 베트남 방문</p>
    <p class="kr" style="font-size:0.92rem; line-height:1.7; margin:0;">안녕하세요, 지원 씨?<br>베트남 방문 예절이 한국과 비슷해요. 베트남 사람들은 인사할 때 악수하는 것을 좋아해요.<br>베트남 사람들은 이야기할 때 다른 사람의 몸을 만지지 않아요. 조심하세요.<br>베트남 사람들은 손을 씻고 식사를 합니다. 손을 씻을 때는 어른이 먼저 손을 씻어요.<br>그리고 식사할 때 베트남 사람들도 소리를 내지 않아요.</p>
  </div>`;
buildOXList(document.getElementById('readOX2'), [
  {text:'(1) 반 씨는 지원 씨를 집에 초대했습니다.', answer:'X'},
  {text:'(2) 베트남 사람들은 악수하지 않습니다.', answer:'X'},
  {text:'(3) 베트남 사람들은 이야기할 때 다른 사람의 몸을 만지지 않습니다.', answer:'O'},
  {text:'(4) 베트남 사람들은 식사할 때 소리를 많이 냅니다.', answer:'X'}
], ()=>stamp('read'));
buildOpenPrompt(document.getElementById('readOpenVN'), {
  prompt:'Hãy nói những điểm cần chú ý khi đến thăm nhà hoặc công ty ở Việt Nam: (1) 인사할 때 (2) 이야기할 때 (3) 식사할 때',
  placeholder:'(1) 인사할 때: ...\n(2) 이야기할 때: ...\n(3) 식사할 때: ...',
  lines:4
});

/* ================================================================
   WRITING (gradable)
================================================================ */
const writeImgFillData = [
  {key:'w1_1', label:'어머니 / 창문을 닫다', answer:'어머니가 창문을 닫아 줍니다.'},
  {key:'w1_2', label:'동생 / 텔레비전을 켜다', answer:'동생이 텔레비전을 켜 줍니다.'},
  {key:'w1_3', label:'친구 / 가방을 들다', answer:'친구가 가방을 들어 줍니다.'},
  {key:'w1_4', label:'언니 / 숙제를 돕다', answer:'언니가 숙제를 도와 줍니다.'}
];
const writeImgFillEl = document.getElementById('writeImgFill');
const wGrid = document.createElement('div'); wGrid.className='img-grid';
writeImgFillEl.appendChild(wGrid);
writeImgFillData.forEach(it=>{
  let currentAnswer = getAnswer('fill_'+it.key, it.answer);
  const cell=document.createElement('div');
  cell.appendChild(imageWithCaption({label:it.label, ratio:'4/3', compact:true, storageKey:'write1_'+it.key}));
  const inputWrap=document.createElement('div'); inputWrap.style.cssText='display:flex; gap:4px; margin-top:4px; align-items:center;';
  inputWrap.innerHTML = `<input type="text" class="fill-input" style="font-size:12px; padding:5px 7px;" placeholder="Viết tiếng Hàn"><button type="button" class="fill-check-btn" style="font-size:11px; padding:0 8px;">✓</button><button type="button" class="answer-pencil" title="Sửa đáp án đúng"></button>`;
  const inp = inputWrap.querySelector('input'); const btn = inputWrap.querySelector('.fill-check-btn'); const pencil = inputWrap.querySelector('.answer-pencil');
  function refreshPencil(){ pencil.classList.toggle('unset', !currentAnswer); pencil.title = currentAnswer ? ('Đáp án: '+currentAnswer+' — bấm để sửa') : 'Chưa có đáp án — bấm để nhập'; pencil.textContent='✎'; }
  refreshPencil();
  btn.addEventListener('click', ()=>{
    if(!currentAnswer){ inp.title='Chưa có đáp án chuẩn — bật quản trị để nhập.'; return; }
    const norm = s=>(s||'').replace(/\s+/g,'').replace(/[.?!,]/g,'');
    const ok = norm(inp.value)===norm(currentAnswer);
    inp.classList.toggle('correct', ok); inp.classList.toggle('incorrect', !ok);
  });
  pencil.addEventListener('click',(e)=>{
    e.stopPropagation();
    const existing = cell.querySelector('.answer-editor');
    if(existing){ existing.remove(); return; }
    const editor=document.createElement('div'); editor.className='answer-editor'; editor.style.marginTop='4px';
    editor.innerHTML = `<input type="text" class="answer-editor-input" value="${currentAnswer||''}" placeholder="Đáp án, Enter để lưu...">`;
    const ei = editor.querySelector('.answer-editor-input');
    function save(){ const v=ei.value.trim(); if(!v) return; currentAnswer=v; setAnswer('fill_'+it.key, v); inp.classList.remove('correct','incorrect'); refreshPencil(); editor.remove(); }
    ei.addEventListener('keydown', ev=>{ if(ev.key==='Enter') save(); });
    cell.appendChild(editor); ei.focus(); ei.select();
  });
  cell.appendChild(inputWrap);
  wGrid.appendChild(cell);
});

const writeSituations = [
  {key:'ws0', label:'단어를 모르다', html:'단어를 모르다'},
  {key:'ws1', label:'외국에 여행을 가다', html:'(1) 외국에 여행을 가다'},
  {key:'ws2', label:'친구에게 전화하다', html:'(2) 친구에게 전화하다'},
  {key:'ws3', label:'책을 읽다', html:'(3) 책을 읽다'},
  {key:'ws4', label:'사진을 찍다', html:'(4) 사진을 찍다'},
  {key:'ws5', label:'비가 오다', html:'(5) 비가 오다'}
];
const writeObjects = [
  {key:'wo_a', html:'ⓐ 여권', correctKey:'ws1'},
  {key:'wo_b', html:'ⓑ 우산', correctKey:'ws5'},
  {key:'wo_c', html:'ⓒ 안경', correctKey:'ws3'},
  {key:'wo_d', html:'ⓓ 사전', correctKey:'ws0'},
  {key:'wo_e', html:'ⓔ 휴대전화', correctKey:'ws2'},
  {key:'wo_f', html:'ⓕ 카메라', correctKey:'ws4'}
];
buildMatching(document.getElementById('writeMatchLeft'), document.getElementById('writeMatchRight'),
  writeSituations, writeObjects, ()=>{}, true, 'write_ex1');
buildFillChecklist(document.getElementById('writeSentence1'), [
  {prompt:'(1) 외국에 여행을 갈 때 → 여권', answer:'외국에 여행을 갈 때 여권이 필요합니다.'},
  {prompt:'(2) 친구에게 전화할 때 → 휴대전화', answer:'친구에게 전화할 때 휴대전화가 필요합니다.'},
  {prompt:'(3) 책을 읽을 때 → 안경', answer:'책을 읽을 때 안경이 필요합니다.'},
  {prompt:'(4) 사진을 찍을 때 → 카메라', answer:'사진을 찍을 때 카메라가 필요합니다.'},
  {prompt:'(5) 비가 올 때 → 우산', answer:'비가 올 때 우산이 필요합니다.'}
], ()=>stamp('write'));

buildFillChecklist(document.getElementById('writeTranslate'), [
  {prompt:'(1) Người này là bạn của tôi.', answer:'이 사람은 제 친구입니다.'},
  {prompt:'(2) Khi bị đau thì đi bệnh viện.', answer:'아플 때 병원에 가요.'},
  {prompt:'(3) Tôi mua cà phê cho bạn.', answer:'저는 친구에게 커피를 사 줘요.'},
  {prompt:'(4) Bạn bè đã giúp đỡ tôi.', answer:'친구가 저를 도와주었어요.'}
], ()=>stamp('write'));

buildOpenPrompt(document.getElementById('writeOpenFriend'), {
  prompt:'Hãy viết về một người bạn theo mẫu.',
  placeholder:'이 사람은 제 친구, ...입니다.\n...',
  lines:3,
  hint:'이 사람은 제 친구, 이유나입니다. 예쁘고 친절합니다. 우리는 심심할 때 같이 영화를 봅니다.'
});

const writeHelperTable = document.getElementById('writeHelperTable');
writeHelperTable.innerHTML = `
  <tr><th rowspan="3">누가 나를 도와주었습니까?</th><th>이름</th><td>이유나</td></tr>
  <tr><th>직업</th><td>한국대학교 학생</td></tr>
  <tr><th>관계</th><td>친구</td></tr>
  <tr><th>어떤 사람입니까?</th><td colspan="2">친절하다, 착하다</td></tr>
  <tr><th>언제, 어떻게 도와주었습니까?</th><td colspan="2">바쁠 때 – 일을 도와주다 · 아플 때 – 병원에 같이 가 주다 · 걱정이 있을 때 – 내 이야기를 들어 주다</td></tr>`;
const writeAvatarWrap = document.createElement('div'); writeAvatarWrap.style.cssText='width:80px; flex-shrink:0; margin-bottom:10px;';
writeAvatarWrap.appendChild(buildImageSlot({label:'Ảnh 이유나', ratio:'1/1', compact:true, storageKey:'write_helper_avatar'}));
document.getElementById('writeFillPassage').before(writeAvatarWrap);
buildFillChecklist(document.getElementById('writeFillPassage'), [
  {prompt:'이 사람은 이유나 씨입니다. 한국대학교 학생입니다. _______ 입니다.', answer:'친구'},
  {prompt:'유나 씨는 _______.', answer:'친절하고 착합니다'},
  {prompt:'유나 씨는 제가 바쁠 때 제 일을 도와주었습니다. 그리고 _______.', answer:'아플 때 병원에 같이 가 주었습니다'},
  {prompt:'또, _______. 저도 유나 씨가 문제가 있을 때 도와주고 싶습니다.', answer:'걱정이 있을 때 제 이야기를 들어 주었습니다'}
], ()=>stamp('write'));

const writeSelfTable = document.getElementById('writeSelfTable');
writeSelfTable.innerHTML = `
  <tr><th rowspan="3">누가 나를 도와주었습니까?</th><th>이름</th><td><input placeholder="Tên người đó"></td></tr>
  <tr><th>직업</th><td><input placeholder="Nghề nghiệp"></td></tr>
  <tr><th>관계</th><td><input placeholder="Quan hệ với bạn"></td></tr>
  <tr><th colspan="2">어떤 사람입니까?</th><td><input placeholder="Tính cách"></td></tr>
  <tr><th colspan="2">언제, 어떻게 도와주었습니까?</th><td><input placeholder="Khi nào, giúp thế nào"></td></tr>`;

buildOpenPrompt(document.getElementById('writeEssay'), {
  prompt:'Dùng nội dung bảng trên viết thành 1 đoạn giới thiệu về người đã giúp đỡ bạn nhiều nhất.',
  placeholder:'이 사람은 ...입니다.\n...',
  lines:8,
  lined:true
});
document.getElementById('sec-write').addEventListener('click', ()=>{});

/* ================================================================
   PRONUNCIATION
================================================================ */
document.getElementById('audioT07').appendChild(buildAudioSlot({label:'CD1 Track 07 — Nghe và lưu ý phần gạch chân', storageKey:'t07'}));
const pronPairsData = [['의사','[의사]'],['회의','[회의/회이]'],['무늬','[무니]'],['나의 책','[나의 책/나에 책]']];
const pronPairsBox = document.getElementById('pronPairs');
pronPairsData.forEach(([a,b])=>{
  const row=document.createElement('div'); row.className='pron-line';
  row.innerHTML = `<span class="kr">${a}</span><span style="color:var(--line-strong);">→</span><span class="kr">${b}</span><span class="speak-btn" data-kr="${a}">🔊</span>`;
  row.querySelector('.speak-btn').addEventListener('click',(e)=>speak(e.target.dataset.kr));
  pronPairsBox.appendChild(row);
});

document.getElementById('audioT08').appendChild(buildAudioSlot({label:'CD1 Track 08 — Nghe và đọc theo', storageKey:'t08'}));
const pronRepeatData = ['의자가 있어요.','발음에 주의해요.','띄어쓰기를 하세요.','이것은 친구의 가방입니다.'];
const pronRepeatBox = document.getElementById('pronRepeat');
pronRepeatData.forEach((s,i)=>{
  const row=document.createElement('div'); row.className='pron-line';
  row.innerHTML = `<span class="mono" style="font-size:11px; color:var(--ink-soft);">(${i+1})</span><span class="kr" style="flex:1;">${s}</span><span class="speak-btn" data-kr="${s}">🔊</span>`;
  row.querySelector('.speak-btn').addEventListener('click',(e)=>speak(e.target.dataset.kr));
  pronRepeatBox.appendChild(row);
});

document.getElementById('audioT09').appendChild(buildAudioSlot({label:'CD1 Track 09 — Đọc to đoạn văn', storageKey:'t09'}));
const pronParagraphBox = document.getElementById('pronParagraph');
const paragraph = '저는 의사입니다.<br>일할 때 흰 옷을 입습니다.<br>저의 동생도 의사입니다.<br>저희는 회의 시간에 만납니다.';
pronParagraphBox.innerHTML = `<div class="rule-box kr" style="font-size:1rem; line-height:1.9;">${paragraph}</div>`;
const pronSpeakBtn = document.createElement('button'); pronSpeakBtn.className='speak-btn'; pronSpeakBtn.textContent='🔊 Nghe mẫu';
pronSpeakBtn.style.cssText='margin-top:8px; border:1px solid var(--line-strong); border-radius:999px; padding:6px 14px; font-size:12px;';
pronSpeakBtn.addEventListener('click', ()=>speak('저는 의사입니다. 일할 때 흰 옷을 입습니다. 저의 동생도 의사입니다. 저희는 회의 시간에 만납니다.'));
pronParagraphBox.appendChild(pronSpeakBtn);
document.getElementById('sec-pron').addEventListener('click', ()=>stamp('pron'));

/* ================================================================
   CULTURE
================================================================ */
const culturePhotos = document.getElementById('culturePhotos');
['Ảnh khách được mời vào nhà, ngồi trò chuyện','Ảnh bắt tay chào hỏi tại công ty','Ảnh trao quà khi đến thăm'].forEach(l=>{
  culturePhotos.appendChild(imageWithCaption({label:l, ratio:'4/3'}));
});
buildOpenPrompt(document.getElementById('cultureReflect'), {prompt:'Ghi lại điểm giống và khác nhau bạn nhận thấy giữa phép tắc thăm viếng của người Hàn Quốc và người Việt Nam.', placeholder:'Giống: ...\nKhác: ...', lines:4});
new IntersectionObserver((entries)=>{ entries.forEach(en=>{ if(en.isIntersecting) stamp('culture'); }); },{rootMargin:'-40% 0px -50% 0px'}).observe(document.getElementById('sec-culture'));

/* ================================================================
   NEW WORDS
================================================================ */
const newWords = [
  ['가져오다','mang đến, đem đến'],['걱정','lo lắng'],['넣다','cho vào, bỏ vào, để vào'],['닫다','đóng'],
  ['댁','nhà (kính ngữ)'],['들다','cầm, mang (túi, cặp), xách'],['들어가다','đi vào'],['만지다','sờ, chạm vào'],
  ['먼저','trước tiên, đầu tiên'],['명함','danh thiếp'],['벗다','cởi ra, bỏ ra'],['비슷하다','tương tự'],
  ['사용하다','sử dụng'],['상담','tư vấn, bàn bạc'],['상담소','văn phòng tư vấn'],['설탕','đường (ăn)'],
  ['소리를 내다','phát ra tiếng'],['심심하다','buồn chán'],['씻다','rửa'],['악수하다','bắt tay'],
  ['안내','thông báo, chỉ dẫn'],['연락','liên lạc'],['예절','lễ nghi, phép tắc'],['올림','(thường dùng ở cuối thư) kính thư, dâng lên'],
  ['일찍','sớm'],['정장','trang phục trang trọng'],['조심하다','chú tâm, cẩn thận'],['직원','nhân viên'],
  ['찍다','chụp (ảnh)'],['켜다','bật (tivi)'],['크림','kem']
];
const newWordsGrid = document.getElementById('newWordsGrid');
newWords.forEach(([kr,vi])=>{
  const c=document.createElement('div'); c.className='word-card';
  c.innerHTML = `<div class="kr">${kr} <span class="speak-btn" data-kr="${kr}" style="font-size:12px;">🔊</span></div><div class="vi">${vi}</div>`;
  c.querySelector('.speak-btn').addEventListener('click',(e)=>speak(e.target.dataset.kr));
  newWordsGrid.appendChild(c);
});
new IntersectionObserver((entries)=>{ entries.forEach(en=>{ if(en.isIntersecting) stamp('newwords'); }); },{rootMargin:'-40% 0px -50% 0px'}).observe(document.getElementById('sec-newwords'));

/* ================================================================
   QUIZ
================================================================ */
const quizData = [
  {q:'"손님" nghĩa là gì?', opts:['Khách','Chủ nhân','Tiền bối','Hậu bối'], answer:'Khách'},
  {q:'Trợ từ nào mang nghĩa "của" (sở hữu)?', opts:['의','는','을','와'], answer:'의'},
  {q:'"아플 때 이 약을 드세요." nghĩa là gì?', opts:['Khi đau thì uống thuốc này nhé.','Khi vui thì uống thuốc này nhé.','Trước khi đau uống thuốc.','Sau khi đau uống thuốc.'], answer:'Khi đau thì uống thuốc này nhé.'},
  {q:'Cấu trúc nào dùng để nói "làm gì đó giúp ai"?', opts:['-아/어 주다','-(으)ㄹ 때','의','-습니다'], answer:'-아/어 주다'},
  {q:'"초대를 받다" nghĩa là gì?', opts:['Nhận lời mời','Mời','Thăm hỏi','Giới thiệu'], answer:'Nhận lời mời'},
  {q:'Theo bài Văn hoá, khi đến thăm nhà người Hàn nên chuẩn bị quà gì là phù hợp nhất?', opts:['Bánh hoặc hoa quả','Rượu mạnh','Đồ điện tử đắt tiền','Không cần quà'], answer:'Bánh hoặc hoa quả'},
  {q:'Khi đến thăm công ty Hàn Quốc, nên đến trước giờ hẹn bao lâu?', opts:['5~10 phút','30 phút','1 tiếng','Đúng giờ hẹn'], answer:'5~10 phút'},
  {q:'"잘 먹겠습니다." dùng khi nào?', opts:['Trước khi ăn','Sau khi ăn','Khi chào tạm biệt','Khi xin lỗi'], answer:'Trước khi ăn'}
];
function shuffleArray(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
const quizList = document.getElementById('quizList');
const picks = {};
quizData.forEach((q,i)=>{
  const key = 'quiz_'+i;
  q._currentAnswer = getAnswer('choice_'+key, q.answer);
  q.opts = shuffleArray(q.opts);
  const wrap = document.createElement('div'); wrap.className='quiz-item';
  wrap.innerHTML = `<div class="quiz-q">${i+1}. ${q.q} <button type="button" class="answer-pencil" title="Sửa đáp án đúng">✎</button></div><div class="quiz-opts"></div>`;
  const optsEl = wrap.querySelector('.quiz-opts');
  const pencil = wrap.querySelector('.answer-pencil');
  q.opts.forEach(o=>{
    const b = document.createElement('button'); b.className='quiz-opt'; b.textContent=o;
    b.addEventListener('click',()=>{ optsEl.querySelectorAll('.quiz-opt').forEach(x=>x.classList.remove('picked')); b.classList.add('picked'); picks[i]=o; });
    optsEl.appendChild(b);
  });
  pencil.addEventListener('click',(e)=>{
    e.stopPropagation();
    const existing = wrap.querySelector('.answer-editor');
    if(existing){ existing.remove(); return; }
    const editor=document.createElement('div'); editor.className='answer-editor';
    editor.innerHTML = `<span class="answer-editor-label">Đáp án đúng:</span>` + q.opts.map(o=>`<button type="button" class="answer-editor-opt${o===q._currentAnswer?' active':''}" data-v="${o}">${o}</button>`).join('');
    editor.querySelectorAll('.answer-editor-opt').forEach(ob=>{
      ob.addEventListener('click',()=>{
        q._currentAnswer = ob.dataset.v; setAnswer('choice_'+key, q._currentAnswer);
        editor.querySelectorAll('.answer-editor-opt').forEach(x=>x.classList.remove('active'));
        ob.classList.add('active');
        editor.remove();
      });
    });
    wrap.appendChild(editor);
  });
  quizList.appendChild(wrap);
});
document.getElementById('quizSubmit').addEventListener('click',()=>{
  let score=0;
  quizData.forEach((q,i)=>{
    const optsEl = quizList.children[i].querySelector('.quiz-opts');
    const correctAnswer = q._currentAnswer;
    if(picks[i]===correctAnswer) score++;
    [...optsEl.children].forEach(b=>{
      b.disabled=true;
      if(b.textContent===correctAnswer) b.classList.add('correct');
      else if(b.textContent===picks[i]) b.classList.add('incorrect');
    });
  });
  const result = document.getElementById('quizResult');
  result.classList.add('show');
  result.innerHTML = `<div class="score">${score}/${quizData.length} câu đúng</div>
    <p style="margin:0.5rem 0 0; color:var(--ink-soft); font-size:0.9rem;">${score>=6 ? 'Xuất sắc — bạn đã nắm chắc Bài 01! Dấu mộc hoàn thành đã được đóng.' : 'Ổn rồi — xem lại các phần chưa chắc rồi thử lại nhé.'}</p>`;
  document.getElementById('quizSubmit').disabled = true;
  if(score>=6) stamp('quiz');
});
