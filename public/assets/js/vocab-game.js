// ============================================================
// VOCAB GAME ENGINE (dùng chung)
// Tách ra từ cuối mypage-vocab.js để Sổ từ vựng (vocab.html)
// và trang Đọc báo (news-article.html) dùng CHUNG một engine.
//
// Public API:
//   startStudy(type, list?, startIndex?)
//     - type: flashcard | match | bansung | mugonghwa | froggame |
//             starship | dictation | speaking
//     - list: mảng [{word, meaning, ex_kr?, ex_vn?, definition?}].
//             Nếu bỏ trống -> đọc dữ liệu notebook (currentStudyList...).
//   closeStudy(), speakVocab(), updateWordStatus(), cycleWordStatus(),
//   window.openWordFlashcard(id)
// ============================================================

const gameModalsHTML = `
    <div id="studyModal" class="modal-overlay">
        <div class="modal-box" id="gameModalBox" style="position:relative;">
            <div class="modal-header"><h3 class="modal-title" id="studyTitle">Học từ vựng</h3><button class="close-btn" onclick="closeStudy()">&times;</button></div>
            <div id="gameFlashcard" style="display:none;">
                <div style="text-align:center;font-weight:800;color:var(--text-sub);margin-bottom:8px;font-size:1em;" id="fcCount">1/10</div>
                <div class="fc-container">
                    <button class="fc-nav-btn" onclick="fcMove(-1)">&#10094;</button>
                    <div class="fc-card" id="fcCard" onclick="fcFlip()"><div class="fc-text" id="fcTxt">Word</div><div class="fc-hint" id="fcHint" style="margin-top:10px;">Chạm hoặc Space để lật</div></div>
                    <button class="fc-nav-btn" onclick="fcMove(1)">&#10095;</button>
                </div>
                <div class="fc-controls-flat">
                    <button id="btnFcPlay" onclick="fcTogglePlay()" title="Tự động lật"><svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg></button>
                    <button id="btnFcAudio" onclick="fcToggleAudio()" title="Bật/Tắt âm thanh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg></button>
                    <button id="btnFcShuffle" onclick="fcShuffle()" title="Xáo trộn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg></button>
                </div>
                <div class="assess-grid">
                    <button class="btn-pastel bg-hoc" style="color:#fff;" onclick="fcAssess(1)" title="Phím tắt: 1">Chưa thuộc <span class="fc-kbd-hint">(1)</span></button>
                    <button class="btn-pastel bg-on" style="color:#fff;" onclick="fcAssess(2)" title="Phím tắt: 2">Quen thuộc <span class="fc-kbd-hint">(2)</span></button>
                    <button class="btn-pastel bg-thanh" style="color:#fff;" onclick="fcAssess(3)" title="Phím tắt: 3">Đã thuộc <span class="fc-kbd-hint">(3)</span></button>
                </div>
            </div>
            <div id="gameMatch" style="display:none;flex-direction:column;flex:1;min-height:0;height:100%;overflow:hidden;">
                <div id="matchHeaderStats" style="display:flex;justify-content:space-between;align-items:center;padding:4px 4px 6px 4px;font-size:0.86em;color:#64748b;font-weight:700;flex-shrink:0;">
                    <span id="matchPairsCount" style="color:#2563eb;">Đã ghép: 0 / 0</span>
                    <div style="flex:1;max-width:140px;height:7px;background:#e2e8f0;border-radius:10px;overflow:hidden;margin:0 10px;">
                        <div id="matchProgressBar" style="width:0%;height:100%;background:linear-gradient(90deg,#3b82f6,#10b981);border-radius:10px;transition:width 0.3s ease;"></div>
                    </div>
                    <span id="matchRemainingCount">Còn lại: 0 từ</span>
                </div>
                <div id="matchGrid" class="grid-2x6"></div>
            </div>
            <div id="gameBansung" style="display:none;flex-direction:column;flex:1;min-height:0;"></div>
            <div id="gameMugonghwa" style="display:none;flex-direction:column;flex:1;min-height:0;"></div>
            <div id="gameFroggame" style="display:none;flex-direction:column;flex:1;min-height:0;"></div>
            <div id="gameStarship" style="display:none;flex-direction:column;flex:1;min-height:0;"></div>
            <div id="gameDictationWrapper" style="display:none;"></div>
            <div id="gameSpeakingWrapper" style="display:none;"></div>
        </div>
    </div>
    <div class="modal-overlay" id="matchResult" style="z-index:9999999;flex-direction:column;align-items:center;">
        <div style="background:#fff;padding:50px 40px;border-radius:28px;text-align:center;width:100%;max-width:480px;box-shadow:0 10px 40px rgba(0,0,0,0.2);position:relative;">
            <button onclick="closeStudy()" style="position:absolute;top:15px;right:15px;border:none;background:#f3f4f6;border-radius:50%;width:36px;height:36px;cursor:pointer;">✕</button>
            <div style="font-size:4.5em;margin-bottom:12px;line-height:1;">🎉</div>
            <h2 style="color:#10b981;font-size:2.4em;margin:0 0 10px 0;font-weight:900;">Tuyệt vời!</h2>
            <div style="font-size:1.05em;color:var(--text-sub);font-weight:600;margin-bottom:20px;">Bạn đã hoàn thành trò chơi!</div>
            <div style="font-size:4em;font-weight:900;margin-bottom:30px;color:#3b82f6;" id="matchScoreDisp">0/0</div>
            <div style="display:flex;justify-content:center;gap:10px;">
                <button onclick="document.getElementById('matchResult').style.display='none';startStudy(window.lastRequestedGameType, window.lastStudyList);" style="background:#10b981;color:#fff;border:none;padding:15px 30px;border-radius:10px;font-weight:bold;cursor:pointer;">🔄 Làm lại</button>
                <button onclick="closeStudy()" style="background:#f1f5f9;color:#334155;border:none;padding:15px 30px;border-radius:10px;font-weight:bold;cursor:pointer;">Thoát</button>
            </div>
        </div>
    </div>`;

function __injectGameModals() {
    let c = document.getElementById('gameModalsContainer');
    if (c && !c.dataset.gameReady) {
        c.innerHTML = gameModalsHTML;
        c.dataset.gameReady = '1';
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __injectGameModals);
} else {
    __injectGameModals();
}

// ==================== GAME ENGINE ====================
function speakVocab(text) { if(window.readKorean){ window.readKorean(text, 0.95); return; } if (!window.speechSynthesis) return; window.speechSynthesis.cancel(); let u = new SpeechSynthesisUtterance(text); u.lang='ko-KR'; u.rate=0.85; window.speechSynthesis.speak(u); }
window.lastRequestedGameType = '';
window.lastStudyList = null;

function startStudy(type, list, startIndex) {
    if (typeof toggleFabMenu === 'function') toggleFabMenu();
    const modal = document.getElementById('studyModal');
    if (!modal) return;
    window.lastRequestedGameType = type;
    let currentData = [];
    if (Array.isArray(list) && list.length > 0) {
        // Dữ liệu truyền vào (trang đọc báo, hoặc gọi lại từ nút "Làm lại")
        currentData = list;
    } else {
        // Shared lesson: học viên mở bài học từ giáo viên
        if (!currentListView && window.currentSharedFolderId && Array.isArray(window.currentStudyList) && window.currentStudyList.length > 0) {
            currentData = window.currentStudyList;
        } else {
            // Logic cũ của Sổ từ vựng: đọc từ notebook
            if (!currentListView) return Swal.fire("Thông báo", "Vui lòng mở một Bài học để học!", "info");
            currentData = activeStatusFilter !== null ? currentStudyList.filter(w=>w.status===activeStatusFilter) : currentStudyList;
        }
    }
    if (currentData.length === 0) return Swal.fire("Thông báo", "Danh sách này đang trống!", "warning");
    window.lastStudyList = currentData;
    document.getElementById('studyModal').style.display = 'flex';
    document.getElementById('gameModalBox').classList.remove('large-modal','bansung-modal','match-modal');
    document.getElementById('gameModalBox').style.height=''; document.getElementById('gameModalBox').style.maxHeight='';
    if (type === 'match') document.getElementById('gameModalBox').classList.add('match-modal');
    if (type === 'bansung' || type === 'mugonghwa' || type === 'froggame' || type === 'starship') document.getElementById('gameModalBox').classList.add('large-modal','bansung-modal');
    ['gameFlashcard','gameMatch','gameDictationWrapper','gameSpeakingWrapper','gameBansung','gameMugonghwa','gameFroggame','gameStarship'].forEach(id => { let el=document.getElementById(id); if(el) el.style.display='none'; });
    document.getElementById('matchResult').style.display = 'none';
    if (type==='flashcard') { document.getElementById('gameFlashcard').style.display='block';document.getElementById('studyTitle').innerText="Ôn tập Flashcard";initFc(currentData, startIndex); }
    else if (type==='match') { document.getElementById('gameMatch').style.display='flex'; document.getElementById('studyTitle').innerText="Ghép thẻ từ vựng"; initMatch(currentData); }
    else if (type==='bansung') { document.getElementById('gameBansung').style.display='flex'; document.getElementById('studyTitle').innerText="Bắn từ vựng 🎯"; if(typeof initBansung==='function') initBansung(currentData); }
    else if (type==='mugonghwa') { document.getElementById('gameMugonghwa').style.display='flex'; document.getElementById('studyTitle').innerText="Hoa Dâm Bụt 🌺"; if(typeof initMugonghwa==='function') initMugonghwa(currentData); }
    else if (type==='froggame') { document.getElementById('gameFroggame').style.display='flex'; document.getElementById('studyTitle').innerText="Ếch Săn Từ Vựng 🐸"; if(typeof initFroggame==='function') initFroggame(currentData); }
    else if (type==='starship') { document.getElementById('gameStarship').style.display='flex'; document.getElementById('studyTitle').innerText="Phi Thuyền Vũ Trụ 🚀"; if(typeof initStarship==='function') initStarship(currentData); }
    else if (type==='dictation') { document.getElementById('gameDictationWrapper').style.display='block'; document.getElementById('studyTitle').innerText="Nghe Viết 🎧"; if(typeof initDictation==='function') initDictation(currentData); }
    else if (type==='speaking') { document.getElementById('gameSpeakingWrapper').style.display='block'; document.getElementById('studyTitle').innerText="Luyện Nói 🎤"; if(typeof initSpeaking==='function') initSpeaking(currentData); }
}
window.closeStudy = function() {
    window._srsSession = null; // đóng giữa chừng → huỷ buổi ôn hôm nay
    const m = document.getElementById('studyModal'); if(m) m.style.display='none';
    const r = document.getElementById('matchResult'); if(r) r.style.display='none';
    if (typeof window.__bansungStop==='function') { try{ window.__bansungStop(); window.__bansungStop=null; }catch(e){} }
    if (typeof window.__mghStop==='function') { try{ window.__mghStop(); window.__mghStop=null; }catch(e){} }
    if (typeof window.__frogStop==='function') { try{ window.__frogStop(); window.__frogStop=null; }catch(e){} }
    if (typeof window.__shpStop==='function') { try{ window.__shpStop(); window.__shpStop=null; }catch(e){} }
    if (typeof fcTimer1!=='undefined') clearTimeout(fcTimer1);
    if (typeof fcTimer2!=='undefined') clearTimeout(fcTimer2);
    if (typeof fcAuto!=='undefined') fcAuto=false;
    if (window.speakingRecognition && typeof window.speakingRecognition.stop==='function') { try{window.speakingRecognition.stop();}catch(e){} }
};

// Flashcard
let fcI=0,fcFront=true,fcAuto=false,fcMuted=false,fcTimer1=null,fcTimer2=null,fcGameList=[];
function initFc(list,startIndex){fcI=(typeof startIndex==='number'&&startIndex>=0)?startIndex:0;fcAuto=false;fcGameList=[...list];clearTimeout(fcTimer1);clearTimeout(fcTimer2);drawFc();}
function fcShuffle(){fcGameList.sort(()=>Math.random()-0.5);fcI=0;drawFc();}
function fcSpeak(text){if(!fcMuted)speakVocab(text);}
function drawFc(){fcFront=true;let w=fcGameList[fcI];document.getElementById('fcCard').classList.remove('flipped');document.getElementById('fcCount').innerText=`${fcI+1} / ${fcGameList.length}`;const el=document.getElementById('fcTxt');el.innerHTML='';el.innerText=w.word;el.style.cssText='';document.getElementById('fcHint').style.display='';document.getElementById('fcHint').innerText=(fcI===0)?"Chạm hoặc Space để lật":"";fcSpeak(w.word);}
function fcFlip(){fcFront=!fcFront;document.getElementById('fcCard').classList.toggle('flipped');const w=fcGameList[fcI];const el=document.getElementById('fcTxt');if(fcFront){el.innerHTML='';el.innerText=w.word;el.style.cssText='';document.getElementById('fcHint').style.display='';fcSpeak(w.word);}else{let ex=null;if(w.ex_kr){ex={kr:w.ex_kr,vn:w.ex_vn};}else if(w.examples&&w.examples.length>0){const e=w.examples[0];ex={kr:e.ko||'',vn:e.vi||''};}if(!ex&&window.VOCAB_DATA){const m=window.VOCAB_DATA.find(v=>v.word===w.word);if(m&&m.ex_kr)ex={kr:m.ex_kr,vn:m.ex_vn};}document.getElementById('fcHint').style.display='none';el.style.fontSize='';el.style.color='';el.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 16px;width:100%;height:100%;backface-visibility:hidden;';let html='<div style="font-size:24px;font-weight:800;color:#1e40af;margin-bottom:8px;">'+w.meaning+'</div>';if(w.definition){html+='<div style="font-size:15px;font-weight:400;color:#64748b;line-height:1.5;margin-bottom:10px;text-align:center;max-width:320px;">'+w.definition+'</div>';}if(ex){html+='<div style="font-size:16px;font-weight:400;color:#374151;line-height:1.6;margin-bottom:6px;text-align:center;">'+ex.kr+'</div><div style="font-size:15px;font-weight:400;color:#6b7280;font-style:italic;line-height:1.5;">→ '+ex.vn+'</div>';}el.innerHTML=html;}}
function fcMove(step){fcI=(fcI+step+fcGameList.length)%fcGameList.length;drawFc();}
function fcAssess(st){
    const word=fcGameList[fcI];
    updateWordStatus(word.id,st,'review');
    // Buổi "Ôn tập hôm nay" (srs.js): thẻ "Chưa thuộc" được đưa lại cuối buổi 1 lần, hết thẻ → tổng kết
    const ses=window._srsSession;
    if(ses){
        ses.reviewed=(ses.reviewed||0)+1;
        if(st<=1){
            ses.again=(ses.again||0)+1;
            ses.requeued=ses.requeued||{};
            if(word.id&&!ses.requeued[word.id]){ses.requeued[word.id]=true;fcGameList.push(word);}
        }
        if(fcI>=fcGameList.length-1){
            setTimeout(()=>ses.onDone({reviewed:ses.reviewed,again:ses.again||0}),300);
            return;
        }
        setTimeout(()=>{fcI++;drawFc();},300);
        return;
    }
    if(fcI<fcGameList.length-1){setTimeout(()=>fcMove(1),300);}
}

// ── Cycle word status: 0→1→2→3→0 ──
function cycleWordStatus(id, current) {
    const next = (current + 1) % 4;
    updateWordStatus(id, next);
}

// ── Update word status in Firestore ──
// source = 'review' khi người học tự đánh giá trên flashcard (srs.js tính lịch ôn),
// còn lại (bấm đổi trạng thái thủ công) → đặt lịch ôn theo trạng thái mới
function updateWordStatus(id, status, source) {
    if (!id) return; // từ không thuộc Sổ từ vựng (vd: bài báo) -> bỏ qua
    const uid = window.currentUserUid;
    if (!uid || typeof firebase === 'undefined') return;

    // Nếu đang trong Shared Folder (Lớp 1:1)
    if (window.currentSharedFolderId && typeof window.saveSharedWordStatus === 'function') {
        window.saveSharedWordStatus(window.currentSharedFolderId, id, status);
        const w = (window.currentStudyList || []).find(item => item.id === id);
        if (w) w.status = status;
        if (typeof updateStatsUI === 'function') updateStatsUI(window.currentStudyList, 'Thống kê ghi nhớ');
        if (typeof renderVocabGridDetail === 'function') renderVocabGridDetail();
        return;
    }

    let srsFields = {};
    if (window.SRS) {
        try {
            if (source === 'review') srsFields = window.SRS.recordReview(id, status) || {};
            else {
                const w = (window._allVocabData || []).find(x => x.id === id) || {};
                srsFields = window.SRS.manualFields(w, status) || {};
            }
        } catch (e) { console.warn('[SRS]', e); }
    }
    firebase.firestore().collection("users").doc(uid).collection("vocabulary").doc(id)
        .update(Object.assign({ status: status }, srsFields)).catch(() => {});
}

// ── Flashcard from grid click: open at correct position with full list ──
window.openWordFlashcard = function(id) {
    const studyListSrc = (typeof currentStudyList !== 'undefined' && currentStudyList && currentStudyList.length > 0)
        ? currentStudyList
        : (window.currentStudyList || []);
    let list = activeStatusFilter !== null
        ? studyListSrc.filter(w => w.status === activeStatusFilter)
        : studyListSrc;
    if (!list || list.length === 0) return;

    let targetIdx = list.findIndex(x => x.id === id);
    if (targetIdx === -1) targetIdx = 0;

    document.getElementById('studyModal').style.display = 'flex';
    document.getElementById('gameModalBox').classList.remove('large-modal');
    ['gameFlashcard','gameMatch','gameDictationWrapper','gameSpeakingWrapper'].forEach(id => { let el=document.getElementById(id); if(el) el.style.display='none'; });
    document.getElementById('gameFlashcard').style.display = 'block';
    document.getElementById('studyTitle').innerText = 'Ôn tập Flashcard';
    document.getElementById('fcCount').style.display = '';
    document.querySelectorAll('#gameFlashcard .fc-nav-btn').forEach(b => b.style.display = '');
    var fc = document.querySelector('#gameFlashcard .fc-controls-flat');
    if (fc) fc.style.display = '';

    // Init flashcard with full list, jumping to clicked word
    fcAuto = false;
    clearTimeout(fcTimer1);
    clearTimeout(fcTimer2);
    fcGameList = [...list];
    fcI = targetIdx;
    fcMuted = false;
    window.lastStudyList = fcGameList;
    drawFc();
};
function fcTogglePlay(){fcAuto=!fcAuto;let b=document.getElementById('btnFcPlay');if(fcAuto){b.style.color='#3b82f6';runAutoFc();}else{b.style.color='';clearTimeout(fcTimer1);clearTimeout(fcTimer2);}}
function fcToggleAudio(){fcMuted=!fcMuted;let b=document.getElementById('btnFcAudio');b.style.color=fcMuted?'#ef4444':'';}
function runAutoFc(){if(!fcAuto)return;fcTimer1=setTimeout(()=>{if(!fcAuto)return;fcFlip();fcTimer2=setTimeout(()=>{if(!fcAuto)return;fcMove(1);runAutoFc();},2000);},2000);}

// ============================================================
// MATCH GAME ENGINE (12 thẻ: 2 cột x 6 hàng, tự động nạp thẻ mới, luôn có ít nhất 3 cặp)
// ============================================================
let mFirst = null;
let mScore = 0;
let mPairs = 0;
let matchGameList = [];
let _allMatchCards = [];
let _boardCards = new Array(12).fill(null);
let _isMatchProcessing = false;

function countCompletePairsOnBoard() {
    const krIds = new Set();
    const vnIds = new Set();
    _boardCards.forEach(c => {
        if (c && c.status === 'ON_BOARD') {
            if (c.type === 'kr') krIds.add(c.wordId);
            else vnIds.add(c.wordId);
        }
    });
    let pairs = 0;
    krIds.forEach(id => {
        if (vnIds.has(id)) pairs++;
    });
    return pairs;
}

function updateMatchStats() {
    const pairsEl = document.getElementById('matchPairsCount');
    const barEl = document.getElementById('matchProgressBar');
    const remEl = document.getElementById('matchRemainingCount');
    const total = matchGameList.length;
    const remaining = total - mScore;

    if (pairsEl) pairsEl.innerText = `Đã ghép: ${mScore} / ${total}`;
    if (barEl) {
        const pct = total > 0 ? Math.round((mScore / total) * 100) : 0;
        barEl.style.width = pct + '%';
    }
    if (remEl) remEl.innerText = `Còn lại: ${remaining} từ`;
}

function initMatch(list) {
    // Lọc danh sách từ hợp lệ (bỏ marker nếu có)
    matchGameList = (list || []).filter(w => w && w.word && w.word !== '__folder_marker__');
    if (matchGameList.length < 2) {
        Swal.fire("Lỗi", "Cần ít nhất 2 từ để chơi!", "error");
        return closeStudy();
    }

    const resModal = document.getElementById('matchResult');
    if (resModal) resModal.style.display = 'none';

    mScore = 0;
    mFirst = null;
    mPairs = matchGameList.length;
    _isMatchProcessing = false;
    _boardCards = new Array(12).fill(null);

    // Tạo danh sách thẻ: mỗi từ có 1 thẻ KR và 1 thẻ VN
    _allMatchCards = [];
    matchGameList.forEach((w, idx) => {
        _allMatchCards.push({
            id: 'kr_' + idx,
            wordId: idx,
            type: 'kr',
            text: w.word,
            rawWord: w,
            status: 'UNBORN'
        });
        _allMatchCards.push({
            id: 'vn_' + idx,
            wordId: idx,
            type: 'vn',
            text: w.meaning,
            rawWord: w,
            status: 'UNBORN'
        });
    });

    // Ban đầu: Lấy 6 cặp (hoặc ít hơn nếu tổng số từ < 6)
    const initialPairsCount = Math.min(6, matchGameList.length);
    const initialCards = [];
    for (let i = 0; i < initialPairsCount; i++) {
        const kr = _allMatchCards.find(c => c.wordId === i && c.type === 'kr');
        const vn = _allMatchCards.find(c => c.wordId === i && c.type === 'vn');
        if (kr) { kr.status = 'ON_BOARD'; initialCards.push(kr); }
        if (vn) { vn.status = 'ON_BOARD'; initialCards.push(vn); }
    }

    // Xáo trộn ngẫu nhiên vào 12 slots (2 cột x 6 hàng)
    initialCards.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 12; i++) {
        _boardCards[i] = initialCards[i] || null;
    }

    updateMatchStats();
    renderAllMatchSlots();
}

function renderAllMatchSlots() {
    const grid = document.getElementById('matchGrid');
    if (!grid) return;
    grid.innerHTML = '';
    grid.className = 'grid-2x6';

    for (let slot = 0; slot < 12; slot++) {
        const slotEl = document.createElement('div');
        slotEl.id = 'matchSlot_' + slot;
        slotEl.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
        grid.appendChild(slotEl);
        renderMatchSlot(slot);
    }
}

function renderMatchSlot(slotIndex, animatePop = false) {
    const slotEl = document.getElementById('matchSlot_' + slotIndex);
    if (!slotEl) return;
    slotEl.innerHTML = '';

    const card = _boardCards[slotIndex];
    if (!card || card.status !== 'ON_BOARD') {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'match-card empty-slot';
        slotEl.appendChild(emptyDiv);
        return;
    }

    const d = document.createElement('div');
    d.className = 'match-card' + (animatePop ? ' card-pop-in' : '');
    d.id = 'cardEl_' + slotIndex;
    d.innerText = card.text;
    d.style.color = card.type === 'kr' ? '#2563eb' : '#059669';

    d.onclick = () => onMatchCardClick(slotIndex);

    slotEl.appendChild(d);
}

function onMatchCardClick(slotIndex) {
    if (_isMatchProcessing) return;
    const card = _boardCards[slotIndex];
    if (!card || card.status !== 'ON_BOARD') return;

    const el = document.getElementById('cardEl_' + slotIndex);
    if (!el || el.classList.contains('matched') || el.classList.contains('wrong')) return;

    // Phát âm từ tiếng Hàn khi ấn
    if (card.type === 'kr') {
        speakVocab(card.text);
    }

    // Trường hợp 1: Chưa chọn thẻ nào trước đó
    if (!mFirst) {
        mFirst = { slot: slotIndex, card: card, el: el };
        el.classList.add('selected');
        return;
    }

    // Trường hợp 2: Bấm lại vào chính thẻ đang chọn -> bỏ chọn
    if (mFirst.slot === slotIndex) {
        el.classList.remove('selected');
        mFirst = null;
        return;
    }

    // Trường hợp 3: Chọn thẻ thứ hai
    const first = mFirst;
    mFirst = null;
    el.classList.add('selected');

    // Kiểm tra xem có đúng cặp không (cùng wordId và khác type: 1 KR + 1 VN)
    if (first.card.wordId === card.wordId && first.card.type !== card.type) {
        // GHÉP ĐÚNG!
        _isMatchProcessing = true;
        mScore++;
        updateMatchStats();

        // Phát âm từ tiếng Hàn
        speakVocab(card.type === 'kr' ? card.text : first.card.text);

        // Hiệu ứng hoàn thành
        first.el.classList.remove('selected');
        el.classList.remove('selected');
        first.el.classList.add('matched');
        el.classList.add('matched');

        first.card.status = 'MATCHED';
        card.status = 'MATCHED';

        setTimeout(() => {
            _boardCards[first.slot] = null;
            _boardCards[slotIndex] = null;
            renderMatchSlot(first.slot);
            renderMatchSlot(slotIndex);

            // Kiểm tra chiến thắng
            if (mScore >= matchGameList.length) {
                _isMatchProcessing = false;
                showWin();
                return;
            }

            // Bổ sung thẻ mới vào 2 vị trí vừa ghép
            replenishMatchSlots(first.slot, slotIndex);
            _isMatchProcessing = false;
        }, 280);

    } else {
        // GHÉP SAI!
        _isMatchProcessing = true;
        first.el.classList.add('wrong');
        el.classList.add('wrong');

        setTimeout(() => {
            first.el.classList.remove('selected', 'wrong');
            el.classList.remove('selected', 'wrong');
            _isMatchProcessing = false;
        }, 500);
    }
}

// Bổ sung 1 từ tiếng Hàn và 1 từ tiếng Việt mới vào 2 vị trí trống, đảm bảo luôn có 5/6 cặp ghép được trên bàn
function replenishMatchSlots(slot1, slot2) {
    const unbornKr = _allMatchCards.filter(c => c.status === 'UNBORN' && c.type === 'kr');
    const unbornVn = _allMatchCards.filter(c => c.status === 'UNBORN' && c.type === 'vn');

    if (unbornKr.length === 0 && unbornVn.length === 0) {
        // Đã hết từ mới trong kho -> để trống slots
        return;
    }

    const currentPairs = countCompletePairsOnBoard();
    const remainingUnmatched = matchGameList.length - mScore;
    // Mục tiêu: luôn đảm bảo có ít nhất 5/6 cặp ghép được trên 12 thẻ (hoặc tối đa số từ còn lại nếu kho từ < 5)
    const targetPairs = Math.min(5, remainingUnmatched);

    let chosenKr = null;
    let chosenVn = null;

    // Xem các thẻ lẻ hiện đang có trên bàn
    const krOnBoard = new Set(_boardCards.filter(c => c && c.status === 'ON_BOARD' && c.type === 'kr').map(c => c.wordId));
    const vnOnBoard = new Set(_boardCards.filter(c => c && c.status === 'ON_BOARD' && c.type === 'vn').map(c => c.wordId));

    const krMissingVn = [...krOnBoard].filter(id => !vnOnBoard.has(id));
    const vnMissingKr = [...vnOnBoard].filter(id => !krOnBoard.has(id));

    // Nếu số cặp hiện tại < targetPairs (tức là dưới 5 cặp): BẮT BUỘC ưu tiên bổ sung để tăng số cặp lên 5/6
    if (currentPairs < targetPairs) {
        // Ưu tiên 1: Ghép thẻ đối ứng của thẻ lẻ trên bàn để tạo thành cặp hoàn chỉnh
        if (krMissingVn.length > 0 && unbornVn.some(c => c.wordId === krMissingVn[0])) {
            chosenVn = unbornVn.find(c => c.wordId === krMissingVn[0]);
        }
        if (vnMissingKr.length > 0 && unbornKr.some(c => c.wordId === vnMissingKr[0])) {
            chosenKr = unbornKr.find(c => c.wordId === vnMissingKr[0]);
        }

        // Ưu tiên 2: Lấy cùng 1 wordId cho cả KR và VN từ kho UNBORN (tăng ngay +1 cặp hoàn chỉnh)
        if (!chosenKr && !chosenVn) {
            const commonWordIds = unbornKr.map(c => c.wordId).filter(id => unbornVn.some(v => v.wordId === id));
            if (commonWordIds.length > 0) {
                const pickId = commonWordIds[Math.floor(Math.random() * commonWordIds.length)];
                chosenKr = unbornKr.find(c => c.wordId === pickId);
                chosenVn = unbornVn.find(c => c.wordId === pickId);
            }
        }
    }

    // Nếu đã đạt >= 5 cặp: chọn ngẫu nhiên các thẻ còn lại
    if (!chosenKr && unbornKr.length > 0) {
        chosenKr = unbornKr[Math.floor(Math.random() * unbornKr.length)];
    }
    if (!chosenVn && unbornVn.length > 0) {
        chosenVn = unbornVn[Math.floor(Math.random() * unbornVn.length)];
    }

    // Đặt vào 2 slots
    if (chosenKr) {
        chosenKr.status = 'ON_BOARD';
        _boardCards[slot1] = chosenKr;
        renderMatchSlot(slot1, true);
    }
    if (chosenVn) {
        chosenVn.status = 'ON_BOARD';
        _boardCards[slot2] = chosenVn;
        renderMatchSlot(slot2, true);
    }
}

function showWin() {
    const disp = document.getElementById('matchScoreDisp');
    if (disp) disp.innerText = `${mScore}/${matchGameList.length}`;
    const resModal = document.getElementById('matchResult');
    if (resModal) resModal.style.display = 'flex';
    if (typeof confetti === 'function') {
        confetti({ particleCount: 200, spread: 90, zIndex: 99999999 });
    }
}

// Type
let tMode='kr2vn',tIdx=0,typeList=[];
function setupType(mode,btn,list){if(list)typeList=[...list].sort(()=>Math.random()-0.5);tMode=mode;tIdx=0;let parent=btn.parentElement;if(parent)Array.from(parent.children).forEach(b=>{b.style.background='';b.style.color=''});btn.style.background='#1f2937';btn.style.color='#fff';nextType();}
function nextType(){if(tIdx>=typeList.length){showWinMatchStyle();return;}let w=typeList[tIdx];let isKr=tMode==='kr2vn'?true:(tMode==='vn2kr'?false:Math.random()>0.5);document.getElementById('typeCount').innerText=`${tIdx+1} / ${typeList.length}`;document.getElementById('typeWord').innerText=isKr?w.word:w.meaning;document.getElementById('typeWord').dataset.iskr=isKr;document.getElementById('typeInput').value='';document.getElementById('typeInput').focus();document.getElementById('typeRes').innerText='';if(isKr)speakVocab(w.word);}
function removeVietnameseTones(str){str=str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a");str=str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e");str=str.replace(/ì|í|ị|ỉ|ĩ/g,"i");str=str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o");str=str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u");str=str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y");str=str.replace(/đ/g,"d");return str;}
function checkType(){let inp=document.getElementById('typeInput').value.trim().toLowerCase();if(!inp)return;let w=typeList[tIdx];let isKr=document.getElementById('typeWord').dataset.iskr==='true';let ans=isKr?w.meaning.toLowerCase():w.word.toLowerCase();let res=document.getElementById('typeRes');let cleanInp=removeVietnameseTones(inp);let cleanAns=removeVietnameseTones(ans);if(cleanInp===cleanAns){res.innerText="✅ Chính xác!";res.style.color="#10b981";if(!isKr)speakVocab(w.word);setTimeout(()=>{tIdx++;nextType();},1000);}else{res.innerText=`❌ Sai rồi. Đáp án: ${isKr?w.meaning:w.word}`;res.style.color="#ef4444";document.getElementById('typeInput').value='';}}
function showWinMatchStyle(){document.getElementById('matchScoreDisp').innerText='100%';document.getElementById('matchResult').style.display='flex';if(typeof confetti==='function')confetti({particleCount:200,zIndex:99999999});}

document.addEventListener('keydown',(e)=>{
    let fcView=document.getElementById('gameFlashcard');
    let studyModal=document.getElementById('studyModal');
    if(studyModal&&studyModal.style.display==='flex'&&fcView&&fcView.style.display==='block'){
        if(e.code==='Space'){e.preventDefault();fcFlip();}
        else if(e.code==='ArrowLeft')fcMove(-1);
        else if(e.code==='ArrowRight')fcMove(1);
    }
});
