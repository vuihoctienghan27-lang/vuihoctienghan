// assets/js/game-speaking.js

let speakList = [];
let speakIdx = 0;
window.speakingRecognition = null; 

function initSpeaking(list) {
    speakList = [...list].sort(() => Math.random() - 0.5);
    speakIdx = 0;
    
    let html = `
        <div style="text-align: center; color: var(--text-sub); font-weight: 600; margin-bottom: 15px;" id="speakCount">1/${speakList.length}</div>
        <div style="font-size: 2.5em; font-weight: 900; margin-bottom: 10px; text-align:center; color:#2563eb;" id="speakWord">Word</div>
        <div style="font-size: 1.1em; color: var(--text-sub); font-weight: 500; margin-bottom: 30px; text-align:center;" id="speakMeaning">Meaning</div>
        
        <div style="display:flex; justify-content:center; margin-bottom:20px;">
            <button id="micBtn" onclick="toggleMic()" style="background:#fef2f2; color:#ef4444; border:2px solid #fca5a5; border-radius:50%; width:80px; height:80px; font-size:2em; cursor:pointer; transition:0.2s;" title="Nhấn để nói">🎤</button>
        </div>
        
        <div id="speakTranscriptWrapper" style="text-align:center; font-size:1.8em; font-weight:bold; min-height:45px; margin-bottom:5px; display:flex; justify-content:center; gap:4px; flex-wrap:wrap;"></div>
        <div id="speakScore" style="text-align:center; font-size:1.2em; font-weight:bold; color:#3b82f6; margin-bottom:15px; min-height:25px;"></div>
        
        <div style="display:flex; justify-content:center; gap:10px;">
            <button onclick="skipSpeak()" style="background: #f1f5f9; color: #334155; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor:pointer;">Bỏ qua</button>
        </div>
    `;
    document.getElementById('gameSpeakingWrapper').innerHTML = html;
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        Swal.fire("Không hỗ trợ", "Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng dùng Google Chrome, Safari hoặc Edge phiên bản mới.", "error");
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    window.speakingRecognition = new SpeechRecognition();
    window.speakingRecognition.lang = 'ko-KR';
    window.speakingRecognition.continuous = false;
    window.speakingRecognition.interimResults = false;
    
    window.speakingRecognition.onstart = function() {
        document.getElementById('micBtn').style.transform = "scale(1.1)";
        document.getElementById('micBtn').style.background = "#fee2e2";
        document.getElementById('speakScore').innerText = "Đang nghe...";
        document.getElementById('speakScore').style.color = "#8b5cf6";
        document.getElementById('speakTranscriptWrapper').innerHTML = '';
    }

    window.speakingRecognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.trim();
        evalSpeakResult(transcript);
        resetMicUI();
    };
    
    window.speakingRecognition.onerror = function(event) {
        document.getElementById('speakScore').innerText = "Không nghe rõ. Hãy thử lại!";
        document.getElementById('speakScore').style.color = "#ef4444";
        resetMicUI();
    };
    
    window.speakingRecognition.onend = function() {
        resetMicUI();
    };

    nextSpeak();
}

function resetMicUI() {
    let btn = document.getElementById('micBtn');
    if(btn) {
        btn.style.transform = "scale(1)";
        btn.style.background = "#fef2f2";
    }
}

function nextSpeak() {
    if(speakIdx >= speakList.length) {
        if(typeof showWinMatchStyle === 'function') showWinMatchStyle();
        return;
    }
    document.getElementById('speakCount').innerText = `${speakIdx+1} / ${speakList.length}`;
    document.getElementById('speakWord').innerText = speakList[speakIdx].word;
    document.getElementById('speakMeaning').innerText = speakList[speakIdx].meaning;
    document.getElementById('speakTranscriptWrapper').innerHTML = '';
    document.getElementById('speakScore').innerText = '';
}

function skipSpeak() {
    speakIdx++;
    nextSpeak();
}

function toggleMic() {
    if(window.speakingRecognition) {
        try {
            window.speakingRecognition.start();
        } catch(e) {
            window.speakingRecognition.stop();
        }
    }
}

function evalSpeakResult(transcript) {
    let target = speakList[speakIdx].word;
    
    // Xóa khoảng trắng để so sánh chuẩn xác hơn
    let tChars = target.replace(/\s+/g, '').split('');
    let rChars = transcript.replace(/\s+/g, '').split('');
    
    let html = '';
    let correctCount = 0;
    
    for(let i = 0; i < tChars.length; i++) {
        let expected = tChars[i];
        let actual = rChars[i] || '';
        
        let color = '#ef4444'; // Red (Sai hoàn toàn)
        
        if(expected === actual) {
            color = '#10b981'; // Green (Đúng 100%)
            correctCount++;
        } else if (actual !== '') {
            // Kiểm tra "Âm gần đúng" (Cùng Choseong & Jungseong - Khác Batchim)
            let eCode = expected.charCodeAt(0);
            let aCode = actual.charCodeAt(0);
            
            // Dải ký tự Hangul là từ 44032 đến 55203
            if(eCode >= 44032 && eCode <= 55203 && aCode >= 44032 && aCode <= 55203) {
                let eBase = Math.floor((eCode - 44032) / 28);
                let aBase = Math.floor((aCode - 44032) / 28);
                if (eBase === aBase) {
                    color = '#3b82f6'; // Xanh Dương (Gần đúng)
                    correctCount += 0.5;
                }
            }
        }
        
        let displayChar = expected;
        html += `<span style="color: ${color}; margin: 0 1px;">${displayChar}</span>`;
    }
    
    document.getElementById('speakTranscriptWrapper').innerHTML = html;
    
    let subHtml = `<div style="width:100%; text-align:center; font-size:0.5em; color:var(--text-sub); font-weight:normal; margin-top:8px;">(Bạn đọc: ${transcript})</div>`;
    document.getElementById('speakTranscriptWrapper').innerHTML += subHtml;
    
    let score = Math.round((correctCount / tChars.length) * 100);
    document.getElementById('speakScore').innerText = `Điểm: ${score}/100`;
    
    if(score >= 80) {
        document.getElementById('speakScore').style.color = "#10b981";
        setTimeout(() => { speakIdx++; nextSpeak(); }, 2000);
    } else {
        document.getElementById('speakScore').style.color = "#ef4444";
        document.getElementById('speakScore').innerText += " - Thử lại nhé!";
    }
}
