// assets/js/game-dictation.js

let dictationList = [];
let dictIdx = 0;

function initDictation(list) {
    dictationList = [...list].sort(() => Math.random() - 0.5);
    dictIdx = 0;
    
    let html = `
        <div style="text-align: center; color: var(--text-sub); font-weight: 600; margin-bottom: 15px;" id="dictCount">1/${dictationList.length}</div>
        <div style="display:flex; justify-content:center; gap:20px; margin-bottom:20px;">
            <button onclick="playDictAudio()" style="background:#eff6ff; color:#3b82f6; border:2px solid #bfdbfe; border-radius:50%; width:60px; height:60px; font-size:1.5em; cursor:pointer;" title="Nghe lại">🔊</button>
            <button onclick="showDictHint()" style="background:#fef9c3; color:#ca8a04; border:2px solid #fef08a; border-radius:50%; width:60px; height:60px; font-size:1.5em; cursor:pointer;" title="Gợi ý nghĩa">💡</button>
        </div>
        <div id="dictHintText" style="text-align:center; font-size:1.2em; font-weight:bold; color:#059669; margin-bottom:20px; min-height:30px;"></div>
        
        <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
            <input type="text" id="dictInput" style="width: 100%; max-width: 300px; padding: 15px; font-size: 1.2em; text-align: center; border: 2px solid var(--border); border-radius: 10px; outline: none; margin-bottom: 15px;" placeholder="Nhập từ bạn nghe được..." onkeydown="if(event.key==='Enter') checkDict()">
            <div style="height: 25px; font-weight: 700; margin-bottom: 15px;" id="dictRes"></div>
            <button style="background: #111827; color: #fff; border: none; padding: 15px 30px; border-radius: 10px; font-weight: bold; width: 100%; max-width: 300px; cursor:pointer;" onclick="checkDict()">Kiểm tra đáp án</button>
        </div>
    `;
    document.getElementById('gameDictationWrapper').innerHTML = html;
    nextDict();
}

function nextDict() {
    if(dictIdx >= dictationList.length) {
        if(typeof showWinMatchStyle === 'function') showWinMatchStyle();
        return;
    }
    document.getElementById('dictCount').innerText = `${dictIdx+1} / ${dictationList.length}`;
    document.getElementById('dictInput').value = '';
    document.getElementById('dictRes').innerText = '';
    document.getElementById('dictHintText').innerText = '';
    setTimeout(() => { playDictAudio(); }, 300);
    setTimeout(() => { document.getElementById('dictInput').focus(); }, 100);
}

function playDictAudio() {
    if(typeof speakVocab === 'function') {
        speakVocab(dictationList[dictIdx].word);
    }
}

function showDictHint() {
    document.getElementById('dictHintText').innerText = dictationList[dictIdx].meaning;
}

function checkDict() {
    let inp = document.getElementById('dictInput').value.trim().toLowerCase();
    if(!inp) return;
    let ans = dictationList[dictIdx].word.toLowerCase();
    let res = document.getElementById('dictRes');
    
    if(inp === ans) {
        res.innerText = "✅ Chính xác!"; res.style.color = "#10b981";
        setTimeout(() => { dictIdx++; nextDict(); }, 1000);
    } else {
        res.innerText = `❌ Sai rồi. Đáp án: ${dictationList[dictIdx].word}`; res.style.color = "#ef4444";
        document.getElementById('dictInput').value = '';
    }
}
