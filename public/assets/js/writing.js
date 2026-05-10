// Kiểm tra mảng từ khóa có tồn tại trong bài làm không
function checkKeywords(text, keywordsArray) {
    return keywordsArray.some(kw => text.includes(kw));
}

// Logic chuyển Tab chung
function openTab(tabId, btn, contentClass) {
    let container = btn.parentElement.parentElement;
    container.querySelectorAll(contentClass).forEach(el => el.classList.remove('active'));
    btn.parentElement.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

// --- LOGIC SÁCH TƯƠNG TÁC CÂU 53 ---
let currentBookPage = 0;
let bookState = "study"; // Các trạng thái: study -> testing -> checked
let globalBookData = []; // Mảng dữ liệu chứa nội dung sách của từng đề thi

// Khởi tạo sách khi mở trang
function initBook(dataArray) {
    globalBookData = dataArray;
    currentBookPage = 0;
    loadBookPage();
}

function loadBookPage() {
    document.getElementById('book-vi').innerText = globalBookData[currentBookPage].vi;
    document.getElementById('book-ko-text').innerText = globalBookData[currentBookPage].ko;
    document.getElementById('book-page-indicator').innerText = `${currentBookPage + 1} / ${globalBookData.length}`;
    
    bookState = "study";
    let btn = document.getElementById('bookToggleBtn');
    btn.innerText = "Luyện tập";
    
    /* CHÍNH LÀ DÒNG NÀY: Giữ lại class action-btn để không bị mất căn giữa */
    btn.className = "btn-action action-btn"; 
    
    btn.style.background = ""; 
    
    document.getElementById('book-ko-text').style.display = "block";
    document.getElementById('book-ko-input-area').style.display = "none";
    document.getElementById('book-input').value = "";
    document.getElementById('diff-result-box').style.display = "none";
    document.getElementById('diff-correct-ans').style.display = "none";
}

function changePage(step) {
    currentBookPage += step;
    if(currentBookPage < 0) currentBookPage = 0;
    if(currentBookPage >= globalBookData.length) currentBookPage = globalBookData.length - 1;
    loadBookPage();
}

function handleBookAction() {
    let btn = document.getElementById('bookToggleBtn');
    let koText = document.getElementById('book-ko-text');
    let inputArea = document.getElementById('book-ko-input-area');

    if (bookState === "study") {
        bookState = "testing";
        btn.innerText = "Đáp án";
        btn.style.background = "#059669"; // Màu Xanh lá
        koText.style.display = "none";
        inputArea.style.display = "block";
        document.getElementById('book-input').focus();
    } else if (bookState === "testing") {
        runDiffCheck();
        bookState = "checked";
        btn.innerText = "Học lại";
        btn.style.background = "#d97706"; // Màu Cam
    } else if (bookState === "checked") {
        loadBookPage();
    }
}

// Thuật toán Diff LCS - Chấm lỗi N ký tự thông minh
function runDiffCheck() {
    let userInput = document.getElementById('book-input').value.trim();
    let correctAns = globalBookData[currentBookPage].ko;
    
    if(userInput === "") { alert("Vui lòng nhập đáp án của bạn trước khi xem!"); return; }

    let a = userInput.split(/\s+/);
    let b = correctAns.split(/\s+/);
    
    let matrix = Array(a.length + 1).fill().map(() => Array(b.length + 1).fill(0));
    for(let i=1; i<=a.length; i++){
        for(let j=1; j<=b.length; j++){
            if(a[i-1] === b[j-1]) matrix[i][j] = matrix[i-1][j-1] + 1;
            else matrix[i][j] = Math.max(matrix[i-1][j], matrix[i][j-1]);
        }
    }

    let i = a.length, j = b.length, res = [];
    while(i>0 || j>0){
        if(i>0 && j>0 && a[i-1] === b[j-1]){ res.unshift(`<span class="diff-correct">${a[i-1]}</span>`); i--; j--; }
        else if (j>0 && (i===0 || matrix[i][j-1] >= matrix[i-1][j])) { res.unshift(`<span class="diff-missing">${b[j-1]}</span>`); j--; }
        else if (i>0 && (j===0 || matrix[i][j-1] < matrix[i-1][j])) { res.unshift(`<span class="diff-added">${a[i-1]}</span>`); i--; }
    }

    let box = document.getElementById('diff-result-box');
    box.innerHTML = res.join(" ");
    box.style.display = 'block';

    let ans = document.getElementById('diff-correct-ans');
    ans.innerText = `Câu chuẩn: ${correctAns}`;
    ans.style.display = 'block';
}