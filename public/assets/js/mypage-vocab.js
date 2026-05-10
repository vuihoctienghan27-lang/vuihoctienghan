/* ==========================================================================
   MODULE SỔ TỪ VỰNG DÀNH RIÊNG CHO VOCAB.HTML (Tích hợp Kéo thả & Game)
   ========================================================================== */

let userVocabLists = ['Đã lưu']; 
let allVocabData = []; 
let currentListView = null; 
let currentStudyList = []; 
let activeStatusFilter = null; 
let sortableInstance = null;

// Tab switcher
function switchVocabTab(tab) {
    document.getElementById('tabAllBtn').classList.remove('active');
    document.getElementById('tabFoldersBtn').classList.remove('active');
    document.getElementById('viewAllVocab').style.display = 'none';
    document.getElementById('viewFolders').style.display = 'none';
    
    if(tab === 'all') {
        document.getElementById('tabAllBtn').classList.add('active');
        document.getElementById('viewAllVocab').style.display = 'block';
        currentListView = null;
        activeStatusFilter = null;
        updateStatsUI(allVocabData, "Thống kê ghi nhớ");
        renderVocabGridGlobal();
    } else {
        document.getElementById('tabFoldersBtn').classList.add('active');
        document.getElementById('viewFolders').style.display = 'block';
        
        // Reset view folder to lists
        document.getElementById('vocabSetsView').style.display = 'block';
        document.getElementById('vocabDetailView').style.display = 'none';
        currentListView = null;
        activeStatusFilter = null;
        updateStatsUI(allVocabData, "Thống kê ghi nhớ");
        renderSetsGrid();
    }
}

// Nhận dữ liệu từ vocab.html
function setVocabLists(lists) {
    userVocabLists = lists;
    if(document.getElementById('viewFolders').style.display === 'block' && currentListView === null) {
        renderSetsGrid();
    }
}

function setVocabData(data) {
    allVocabData = data;
    let skel = document.getElementById('vocabSkeleton');
    if (skel) skel.style.display = 'none';
    
    // Nếu đang ở Tab All
    if(document.getElementById('viewAllVocab').style.display !== 'none') {
        updateStatsUI(allVocabData, "Thống kê ghi nhớ"); 
        renderVocabGridGlobal();
    } else {
        if(currentListView) {
            currentStudyList = allVocabData.filter(w => w.listName === currentListView);
            updateStatsUI(currentStudyList, `Thống kê ghi nhớ`);
            renderVocabGridDetail();
        } else {
            updateStatsUI(allVocabData, "Thống kê ghi nhớ");
            renderSetsGrid();
        }
    }
}

// FAB Menu Logic
function toggleFabMenu() {
    const fab = document.getElementById('fabContainer');
    fab.classList.toggle('open');
    if(fab.classList.contains('open')) {
        document.getElementById('fabMainBtn').innerText = '✕';
    } else {
        document.getElementById('fabMainBtn').innerText = '📖';
    }
}

// Ẩn menu FAB khi click ra ngoài
document.addEventListener('click', (e) => {
    if (!e.target.closest('.fab-container')) {
        document.getElementById('fabContainer').classList.remove('open');
        document.getElementById('fabMainBtn').innerText = '📖';
    }
});


// ================= THỐNG KÊ & LỌC =================
function updateStatsUI(dataArray, title) {
    let titleEl = document.getElementById('statTotalTitle');
    let allTitleEl = document.getElementById('allVocabTitle');
    if(titleEl) titleEl.innerText = title;
    
    let counts = [0, 0, 0, 0];
    dataArray.forEach(w => {
        let st = parseInt(w.status) || 0;
        if(st >= 0 && st <= 3) counts[st]++;
    });
    let total = dataArray.length || 1;
    for(let i=0; i<4; i++) {
        let el = document.getElementById(`c${i}`);
        let bar = document.getElementById(`bar${i}`);
        if(el) el.innerText = counts[i];
        if(bar) bar.style.width = (counts[i]/total*100) + '%';
    }
}

function filterByStatus(status) {
    if (activeStatusFilter === status) activeStatusFilter = null; 
    else activeStatusFilter = status; 

    document.querySelectorAll('.legend-item').forEach((el, idx) => {
        if(activeStatusFilter === idx) el.classList.add('filter-active');
        else el.classList.remove('filter-active');
    });
    
    document.getElementById('clearFilterBtn').style.display = activeStatusFilter !== null ? 'block' : 'none';

    // Xác định tab nào đang hiển thị
    if(document.getElementById('viewAllVocab').style.display !== 'none') {
        renderVocabGridGlobal();
    } else {
        if(!currentListView) {
            // Đang ở màn thư mục ngoài cùng, mà user ấn lọc -> Chuyển vào viewAllVocab ảo
            // Hoặc chặn ko cho lọc khi phân thư mục. Ở đây mình làm đơn giản là chỉ filter currentStudyList
            Swal.fire("Lưu ý", "Vui lòng chọn một thư mục để lọc, hoặc chuyển sang tab Từ Vựng.", "info");
            activeStatusFilter = null;
            document.querySelectorAll('.legend-item').forEach(el=>el.classList.remove('filter-active'));
        } else {
            renderVocabGridDetail();
        }
    }
}

// ================= RENDER GRID GLOBAL =================
function renderVocabGridGlobal() {
    let listToRender = activeStatusFilter !== null ? allVocabData.filter(w => w.status === activeStatusFilter) : allVocabData;
    document.getElementById('totalVocabCountGlobal').innerText = listToRender.length;
    let html = '';
    const svgOpts = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>`;
    const svgTrash = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    const colors = ['bg-moi', 'bg-hoc', 'bg-on', 'bg-thanh'];

    listToRender.forEach(w => {
        const safeMean = (w.meaning || '').replace(/'/g, "\\'");
        html += `
            <div class="v-card" id="card-${w.id}" style="padding-left: 20px;"> <!-- Bỏ drag handle ở view global -->
                <div class="v-status-dot ${colors[w.status || 0]}" style="left:12px;"></div>
                <div style="flex: 1; margin-left: 10px;">
                    <div class="v-word">${w.word}</div>
                    <div class="v-mean">${w.meaning}</div>
                </div>
                <div class="v-actions">
                    <button class="btn-icon-flat" style="color:#64748b;" onclick="toggleMenu('${w.id}', event)" title="Tùy chọn">${svgOpts}</button>
                    <button class="btn-icon-flat" onclick="deleteVocab('${w.id}')" title="Xóa">${svgTrash}</button>
                    <div id="menu-${w.id}" class="v-dropdown-menu">
                        <div class="v-menu-item" onclick="editVocab('${w.id}', '${safeMean}')">Sửa nghĩa</div>
                        <div class="v-menu-item" onclick="openMoveModal('${w.id}')">Chuyển thư mục</div>
                    </div>
                </div>
            </div>`;
    });
    document.getElementById('vocabGridGlobal').innerHTML = html || `<p style="color:#6b7280; font-style:italic;">Không tìm thấy từ vựng nào.</p>`;
}

// ================= QUẢN LÝ TẬP HỢP FOLDERS =================
function renderSetsGrid() {
    let html = '';
    userVocabLists.forEach(listName => {
        let count = allVocabData.filter(w => w.listName === listName).length;
        let dotsHtml = '';
        if(listName !== 'Đã lưu') {
            dotsHtml = `
                <div class="folder-actions">
                    <button class="folder-dots-btn" onclick="toggleFolderMenu('${listName}', event)">⋮</button>
                    <div id="fmenu-${listName}" class="folder-menu">
                        <div class="folder-menu-item" onclick="renameFolder('${listName}', event)">Đổi tên</div>
                        <div class="folder-menu-item danger" onclick="deleteFolder('${listName}', event)">Xóa thư mục</div>
                    </div>
                </div>
            `;
        }
        html += `
            <div class="list-card" onclick="openList('${listName}')">
                <div>
                    <div class="list-title">📁 ${listName}</div>
                    <div class="list-count">${count} thuật ngữ</div>
                </div>
                ${dotsHtml}
            </div>`;
    });
    let grid = document.getElementById('listsGrid');
    if(grid) grid.innerHTML = html;
}

function toggleFolderMenu(id, e) {
    e.stopPropagation();
    document.querySelectorAll('.folder-menu').forEach(m => { if(m.id !== `fmenu-${id}`) m.classList.remove('show'); });
    document.getElementById(`fmenu-${id}`).classList.toggle('show');
}

// Create/Rename/Delete functions truncated for brevity from mypage-vocab.js, keeping exact same mechanics
async function renameFolder(oldName, e) {
    e.stopPropagation();
    const { value: newNameInput } = await Swal.fire({
        title: `Đổi tên thư mục`, input: 'text', inputValue: oldName,
        showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonColor: '#9ca3af', confirmButtonText: 'Lưu', cancelButtonText: 'Hủy'
    });
    if (!newNameInput || newNameInput.trim() === oldName) return;
    let newName = newNameInput.trim();
    if(userVocabLists.includes(newName)) return Swal.fire("Lỗi", "Tên thư mục đã tồn tại!", "error");
    try {
        await firebase.firestore().collection("users").doc(currentUserUid).update({ vocabLists: firebase.firestore.FieldValue.arrayRemove(oldName) });
        await firebase.firestore().collection("users").doc(currentUserUid).update({ vocabLists: firebase.firestore.FieldValue.arrayUnion(newName) });
        const snap = await firebase.firestore().collection("users").doc(currentUserUid).collection("vocabulary").where("listName", "==", oldName).get();
        const batch = firebase.firestore().batch();
        snap.forEach(doc => batch.update(doc.ref, { listName: newName }));
        await batch.commit();
        Swal.fire("Thành công", "Đã đổi tên thư mục!", "success");
    } catch(err) { Swal.fire("Lỗi", err.message, "error"); }
}

async function deleteFolder(listName, e) {
    e.stopPropagation();
    const result = await Swal.fire({
        title: "⚠️ CẢNH BÁO", text: `Xóa thư mục "${listName}"?\n(TẤT CẢ từ vựng bên trong sẽ XÓA VĨNH VIỄN!)`, icon: "warning",
        showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#9ca3af", confirmButtonText: "Xóa vĩnh viễn", cancelButtonText: "Hủy"
    });
    if(!result.isConfirmed) return;
    try {
        await firebase.firestore().collection("users").doc(currentUserUid).update({ vocabLists: firebase.firestore.FieldValue.arrayRemove(listName) });
        const snap = await firebase.firestore().collection("users").doc(currentUserUid).collection("vocabulary").where("listName", "==", listName).get();
        const batch = firebase.firestore().batch();
        snap.forEach(doc => batch.delete(doc.ref)); 
        await batch.commit();
        if (currentListView === listName) backToSets();
        Swal.fire("Đã xóa", "Thư mục và các từ vựng đã bị xóa sạch.", "success");
    } catch(err) { Swal.fire("Lỗi", err.message, "error"); }
}

async function createNewList() {
    const { value: nameInput } = await Swal.fire({
        title: "Tạo thư mục mới", input: "text", inputPlaceholder: "Ví dụ: Bài 1, Động từ...",
        showCancelButton: true, confirmButtonColor: '#3b82f6', confirmButtonText: 'Tạo', cancelButtonText: 'Hủy'
    });
    if(nameInput && nameInput.trim()) {
        let name = nameInput.trim();
        if(userVocabLists.includes(name)) return Swal.fire("Lỗi", "Tên danh sách đã tồn tại!", "error");
        await firebase.firestore().collection("users").doc(currentUserUid).set({ vocabLists: firebase.firestore.FieldValue.arrayUnion(name) }, {merge: true});
        Swal.fire("Thành công", `Đã tạo thư mục "${name}"!`, "success");
    }
}

function openList(listName) {
    currentListView = listName;
    document.getElementById('vocabSetsView').style.display = 'none';
    document.getElementById('vocabDetailView').style.display = 'block';
    document.getElementById('currentListName').innerText = listName;
    
    currentStudyList = allVocabData.filter(w => w.listName === listName);
    activeStatusFilter = null; 
    document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('filter-active'));
    document.getElementById('clearFilterBtn').style.display = 'none';
    
    updateStatsUI(currentStudyList, `Thống kê ghi nhớ`);
    renderVocabGridDetail();
}

function backToSets() {
    currentListView = null;
    document.getElementById('vocabSetsView').style.display = 'block';
    document.getElementById('vocabDetailView').style.display = 'none';
    activeStatusFilter = null;
    document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('filter-active'));
    document.getElementById('clearFilterBtn').style.display = 'none';
    updateStatsUI(allVocabData, "Thống kê ghi nhớ");
}

// ================= RENDER GRID TRONG FOLDER (Drag & Drop) =================
function renderVocabGridDetail() {
    let listToRender = activeStatusFilter !== null ? currentStudyList.filter(w => w.status === activeStatusFilter) : currentStudyList;
    document.getElementById('totalVocabCountDetail').innerText = listToRender.length;
    let html = '';
    const svgDots = `<svg class="drag-handle" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>`;
    const svgOpts = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>`;
    const svgTrash = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    const colors = ['bg-moi', 'bg-hoc', 'bg-on', 'bg-thanh'];

    listToRender.forEach(w => {
        const safeMean = (w.meaning || '').replace(/'/g, "\\'");
        html += `
            <div class="v-card" id="card-${w.id}" data-id="${w.id}">
                ${svgDots}
                <div class="v-status-dot ${colors[w.status || 0]}"></div>
                <div style="flex: 1;">
                    <div class="v-word">${w.word}</div>
                    <div class="v-mean">${w.meaning}</div>
                </div>
                <div class="v-actions">
                    <button class="btn-icon-flat" style="color:#64748b;" onclick="toggleMenu('${w.id}', event)" title="Tùy chọn">${svgOpts}</button>
                    <button class="btn-icon-flat" onclick="deleteVocab('${w.id}')" title="Xóa">${svgTrash}</button>
                    <div id="menu-${w.id}" class="v-dropdown-menu">
                        <div class="v-menu-item" onclick="editVocab('${w.id}', '${safeMean}')">Sửa nghĩa</div>
                        <div class="v-menu-item" onclick="openMoveModal('${w.id}')">Chuyển thư mục</div>
                    </div>
                </div>
            </div>`;
    });
    
    let grid = document.getElementById('vocabGridDetail');
    grid.innerHTML = html || `<p style="color:#6b7280; font-style:italic;">Thư mục này hiện đang trống.</p>`;
    
    // Khởi tạo Sortable
    if(sortableInstance) sortableInstance.destroy();
    
    // Chỉ bật drag & drop nếu không bật filter (để tránh lỗi ghi đè index)
    if(activeStatusFilter === null && window.Sortable) {
        sortableInstance = Sortable.create(grid, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async function(evt) {
                if(evt.oldIndex === evt.newIndex) return;
                
                // Lấy trật tự ID mới từ DOM
                const items = grid.querySelectorAll('.v-card');
                let batch = firebase.firestore().batch();
                
                // Cập nhật lại field 'order' trên firestore
                items.forEach((item, index) => {
                    let docId = item.getAttribute('data-id');
                    let ref = firebase.firestore().collection("users").doc(currentUserUid).collection("vocabulary").doc(docId);
                    batch.update(ref, { order: index });
                });
                
                try {
                    await batch.commit();
                } catch(e) {
                    console.error("Lỗi khi lưu vị trí", e);
                }
            }
        });
    }
}

function toggleMenu(id, e) {
    e.stopPropagation();
    document.querySelectorAll('.v-dropdown-menu').forEach(m => { if(m.id !== `menu-${id}`) m.classList.remove('show'); });
    document.querySelectorAll('.v-card').forEach(c => c.style.zIndex = '');
    const menuEl = document.getElementById(`menu-${id}`);
    menuEl.classList.toggle('show');
    if (menuEl.classList.contains('show')) {
        let card = document.getElementById(`card-${id}`);
        if(card) { card.style.position = 'relative'; card.style.zIndex = '100'; }
    }
}

// Bấm ra ngoài là tắt menu nhỏ
document.addEventListener('click', (e) => {
    if(!e.target.closest('.v-actions')) {
        document.querySelectorAll('.v-dropdown-menu').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.v-card').forEach(c => c.style.zIndex = '');
    }
    if(!e.target.closest('.folder-actions')) document.querySelectorAll('.folder-menu').forEach(m => m.classList.remove('show'));
});

function deleteVocab(id) { 
    Swal.fire({
        title: "Xóa từ này?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Xóa", cancelButtonText: "Hủy"
    }).then((result) => {
        if(result.isConfirmed) firebase.firestore().collection("users").doc(currentUserUid).collection("vocabulary").doc(id).delete();
    });
}

async function editVocab(id, oldMean) { 
    const { value: newMean } = await Swal.fire({ title: "Sửa nghĩa:", input: "text", inputValue: oldMean, showCancelButton: true });
    if(newMean && newMean.trim() !== oldMean) firebase.firestore().collection("users").doc(currentUserUid).collection("vocabulary").doc(id).update({ meaning: newMean.trim() }); 
}

function openMoveModal(id) {
    let select = document.getElementById('moveSelect'); select.innerHTML = '';
    userVocabLists.forEach(list => {
        let opt = document.createElement('option'); opt.value = list; opt.innerText = `📁 ${list}`;
        if(list === currentListView) opt.disabled = true;
        select.appendChild(opt);
    });
    document.getElementById('moveModal').style.display = 'flex';
    document.getElementById('confirmMoveBtn').onclick = async function() {
        let targetList = select.value; if(!targetList) return;
        try {
            await firebase.firestore().collection("users").doc(currentUserUid).collection("vocabulary").doc(id).update({ listName: targetList });
            document.getElementById('moveModal').style.display = 'none';
            Swal.fire({ title: "Thành công", text: "Đã chuyển thư mục!", icon: "success", timer: 1500, showConfirmButton: false });
        } catch(e) { Swal.fire("Lỗi", e.message, "error"); }
    };
}

// ================= GỢI Ý DỊCH (Translate) =================
let suggestTimeout;
async function fetchSuggestion() {
    clearTimeout(suggestTimeout);
    const word = document.getElementById('newKrWord').value.trim();
    const suggestBox = document.getElementById('suggestBox');
    if(!word) { suggestBox.style.display = 'none'; return; }
    
    // Auto detect language: if contains Korean, sl=ko&tl=vi. Else sl=vi&tl=ko
    let sl = 'ko', tl = 'vi';
    if (!/[\u3131-\uD79D]/.test(word)) { sl = 'vi'; tl = 'ko'; }

    suggestTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(word)}`);
            const data = await res.json();
            const translated = data[0][0][0];
            if(translated && translated.toLowerCase() !== word.toLowerCase()) {
                suggestBox.innerHTML = `<div class="suggest-item" onclick="selectSuggest('${translated.replace(/'/g, "\\'")}','${sl}')">✨ ${translated}</div>`;
                suggestBox.style.display = 'block';
            }
        } catch(e) {}
    }, 500); 
}
function selectSuggest(text, sl) { 
    if (sl === 'vi') { 
        document.getElementById('newVnMean').value = document.getElementById('newKrWord').value; 
        document.getElementById('newKrWord').value = text; 
    } else { 
        document.getElementById('newVnMean').value = text; 
    }
    document.getElementById('suggestBox').style.display = 'none'; 
}
document.addEventListener('click', (e) => { if(!e.target.closest('#suggestBox') && e.target.id !== 'newKrWord') { let b = document.getElementById('suggestBox'); if(b) b.style.display = 'none'; } });

async function addWordToList() {
    let kr = document.getElementById('newKrWord').value.trim(); let vn = document.getElementById('newVnMean').value.trim();
    if(!kr || !vn) return Swal.fire("Nhắc nhở", "Vui lòng nhập đủ từ và nghĩa!", "info");
    
    // Lấy order to nhất trong current list
    let maxOrder = currentStudyList.length > 0 ? Math.max(...currentStudyList.map(v => v.order || 0)) + 1 : 0;
    
    try {
        await firebase.firestore().collection("users").doc(currentUserUid).collection("vocabulary").doc(kr).set({ 
            word: kr, meaning: vn, listName: currentListView, status: 0, order: maxOrder, savedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
        document.getElementById('newKrWord').value = ''; document.getElementById('newVnMean').value = ''; 
        document.getElementById('newKrWord').focus(); document.getElementById('suggestBox').style.display = 'none';
    } catch (err) { Swal.fire("Lỗi", err.message, "error"); }
}

// INJECT HTML GAME MODALS
const gameModalsHTML = `
    <div id="studyModal" class="modal-overlay">
        <div class="modal-box" id="gameModalBox" style="position: relative; overflow: hidden;">
            <div class="modal-header">
                <h3 class="modal-title" id="studyTitle">Học từ vựng</h3>
                <button class="close-btn" onclick="closeStudy()">&times;</button>
            </div>
            
            <div id="gameFlashcard" style="display: none;">
                <div style="text-align: center; font-weight: 800; color: var(--text-sub); margin-bottom: 10px; font-size: 1.1em;" id="fcCount">1/10</div>
                <div class="fc-container">
                    <button class="fc-nav-btn" onclick="fcMove(-1)">&#10094;</button>
                    <div class="fc-card" id="fcCard" onclick="fcFlip()">
                        <div class="fc-text" id="fcTxt">Word</div>
                        <div class="fc-hint" id="fcHint" style="margin-top: 10px;">Chạm hoặc Space để lật</div>
                    </div>
                    <button class="fc-nav-btn" onclick="fcMove(1)">&#10095;</button>
                </div>
                <div class="fc-controls-flat">
                    <button id="btnFcPlay" onclick="fcTogglePlay()" title="Tự động lật"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg></button>
                    <button id="btnFcAudio" onclick="fcToggleAudio()" title="Bật/Tắt âm thanh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg></button>
                    <button id="btnFcShuffle" onclick="fcShuffle()" title="Xáo trộn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg></button>
                </div>
                <div class="assess-grid">
                    <button class="btn-pastel bg-hoc" style="color:#fff;" onclick="fcAssess(1)">Chưa thuộc</button>
                    <button class="btn-pastel bg-on" style="color:#fff;" onclick="fcAssess(2)">Quen thuộc</button>
                    <button class="btn-pastel bg-thanh" style="color:#fff;" onclick="fcAssess(3)">Đã thuộc</button>
                </div>
            </div>

            <div id="gameMatch" style="display: none; flex-direction: column; flex: 1; min-height: 0;">
                <div style="display: flex; flex-wrap: wrap; justify-content: center; align-content: flex-start; gap: 15px; overflow-y: auto; padding: 5px; min-height:300px;" id="matchGrid"></div>
            </div>

            <div id="gameType" style="display: none;">
                <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;">
                    <button class="btn-edit" id="btnT1" onclick="setupType('kr2vn', this)">Hàn → Việt</button>
                    <button class="btn-edit" id="btnT2" onclick="setupType('vn2kr', this)">Việt → Hàn</button>
                    <button class="btn-edit" id="btnT3" onclick="setupType('mix', this)">Ngẫu nhiên</button>
                </div>
                <div style="text-align: center; color: var(--text-sub); font-weight: 600; margin-bottom: 15px;" id="typeCount">1/10</div>
                <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                    <div style="font-size: 2.2em; font-weight: 900; margin-bottom: 20px;" id="typeWord">Word</div>
                    <input type="text" id="typeInput" style="width: 100%; max-width: 300px; padding: 15px; font-size: 1.2em; text-align: center; border: 2px solid var(--border); border-radius: 10px; outline: none; margin-bottom: 15px;" placeholder="Nhập đáp án vào đây..." onkeydown="if(event.key==='Enter') checkType()">
                    <div style="height: 25px; font-weight: 700; margin-bottom: 15px;" id="typeRes"></div>
                    <button style="background: #111827; color: #fff; border: none; padding: 15px 30px; border-radius: 10px; font-weight: bold; width: 100%; max-width: 300px; cursor:pointer;" onclick="checkType()">Kiểm tra đáp án</button>
                </div>
            </div>
            
            <div id="gameDictationWrapper" style="display:none;"></div>
            <div id="gameSpeakingWrapper" style="display:none;"></div>
        </div>
    </div>
    
    <div class="modal-overlay" id="matchResult" style="z-index: 9999999; flex-direction: column; align-items: center;">
        <div style="background: #fff; padding: 50px 40px; border-radius: 28px; text-align: center; width: 100%; max-width: 480px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); position: relative;">
            <button onclick="closeStudy()" style="position:absolute; top:15px; right:15px; border:none; background:#f3f4f6; border-radius:50%; width:36px; height:36px; cursor:pointer;">✕</button>
            <div style="font-size: 4.5em; margin-bottom: 12px; line-height: 1;">🎉</div>
            <h2 style="color: #10b981; font-size: 2.4em; margin: 0 0 10px 0; font-weight: 900;">Tuyệt vời!</h2>
            <div style="font-size: 1.05em; color: var(--text-sub); font-weight: 600; margin-bottom: 20px;">Bạn đã hoàn thành trò chơi!</div>
            <div style="font-size: 4em; font-weight: 900; margin-bottom: 30px; color:#3b82f6;" id="matchScoreDisp">0/0</div>
            <div style="display:flex; justify-content:center; gap:10px;">
                <button onclick="document.getElementById('matchResult').style.display='none'; startStudy(window.lastRequestedGameType);" style="background:#10b981; color:#fff; border:none; padding:15px 30px; border-radius:10px; font-weight:bold; cursor:pointer;">🔄 Làm lại</button>
                <button onclick="closeStudy()" style="background:#f1f5f9; color:#334155; border:none; padding:15px 30px; border-radius:10px; font-weight:bold; cursor:pointer;">Thoát</button>
            </div>
        </div>
    </div>
`;
document.addEventListener('DOMContentLoaded', () => {
    let c = document.getElementById('gameModalsContainer');
    if(c) c.innerHTML = gameModalsHTML;
});

// ================= HỆ THỐNG TRÒ CHƠI =================
function speakVocab(text) { if (!window.speechSynthesis) return; window.speechSynthesis.cancel(); let u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.85; window.speechSynthesis.speak(u); }

window.lastRequestedGameType = ''; // Track to play again

function startStudy(type) {
    toggleFabMenu(); // Đóng menu nếu đang mở
    window.lastRequestedGameType = type;
    
    // Lấy data dựa trên tab hiện tại
    let currentData = [];
    if(document.getElementById('viewAllVocab').style.display !== 'none') {
        currentData = activeStatusFilter !== null ? allVocabData.filter(w=>w.status===activeStatusFilter) : allVocabData;
    } else {
        if(!currentListView) return Swal.fire("Thông báo", "Vui lòng chọn hoặc mở một thư mục để học!", "info");
        currentData = activeStatusFilter !== null ? currentStudyList.filter(w=>w.status===activeStatusFilter) : currentStudyList;
    }
    
    if(currentData.length === 0) return Swal.fire("Thông báo", "Danh sách này đang trống!", "warning");
    
    document.getElementById('studyModal').style.display = 'flex';
    document.getElementById('gameModalBox').classList.remove('large-modal');
    if(type === 'match') document.getElementById('gameModalBox').classList.add('large-modal');

    // Ẩn tất cả views cũ
    ['gameFlashcard', 'gameMatch', 'gameType', 'gameDictationWrapper', 'gameSpeakingWrapper'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    
    document.getElementById('matchResult').style.display = 'none';
    
    // Khởi chạy game tương ứng
    if(type === 'flashcard') { document.getElementById('gameFlashcard').style.display = 'block'; document.getElementById('studyTitle').innerText = "Ôn tập Flashcard"; initFc(currentData); }
    else if(type === 'match') { document.getElementById('gameMatch').style.display = 'flex'; document.getElementById('studyTitle').innerText = "Ghép thẻ từ vựng"; initMatch(currentData); }
    else if(type === 'type') { document.getElementById('gameType').style.display = 'block'; document.getElementById('studyTitle').innerText = "Nhập từ"; document.querySelectorAll('.btn-edit').forEach(b=>b.classList.remove('active')); document.getElementById('btnT1').classList.add('active'); setupType('kr2vn', document.getElementById('btnT1'), currentData); }
    else if(type === 'dictation') { document.getElementById('gameDictationWrapper').style.display = 'block'; document.getElementById('studyTitle').innerText = "Nghe Viết 🎧"; if(typeof initDictation === 'function') initDictation(currentData); }
    else if(type === 'speaking') { document.getElementById('gameSpeakingWrapper').style.display = 'block'; document.getElementById('studyTitle').innerText = "Luyện Nói 🎤"; if(typeof initSpeaking === 'function') initSpeaking(currentData); }
    
    // Tính giờ đơn giản nếu cần (đã track ở activity-tracker nên có thể bỏ qua)
}

window.closeStudy = function() {
    const studyModal = document.getElementById('studyModal');
    if (studyModal) studyModal.style.display = 'none';

    const matchRes = document.getElementById('matchResult');
    if (matchRes) matchRes.style.display = 'none';

    if (typeof fcTimer1 !== 'undefined') clearTimeout(fcTimer1); 
    if (typeof fcTimer2 !== 'undefined') clearTimeout(fcTimer2); 
    if (typeof fcAuto !== 'undefined') fcAuto = false;
    
    // Tắt mic game speaking nếu đang thu
    if (window.speakingRecognition && typeof window.speakingRecognition.stop === 'function') {
        try { window.speakingRecognition.stop(); } catch(e){}
    }
};

// --- CHESKPOINT: FLASHCARD ---
let fcI = 0, fcFront = true, fcAuto = false, fcMuted = false; 
let fcTimer1 = null, fcTimer2 = null; let fcGameList = []; 
function initFc(list) { fcI = 0; fcAuto = false; fcGameList = [...list]; clearTimeout(fcTimer1); clearTimeout(fcTimer2); drawFc(); }
function fcShuffle() { fcGameList.sort(() => Math.random() - 0.5); fcI = 0; drawFc(); }
function fcSpeak(text) { if(!fcMuted) speakVocab(text); }

function drawFc() { fcFront = true; let w = fcGameList[fcI]; document.getElementById('fcCard').classList.remove('flipped'); document.getElementById('fcCount').innerText = `${fcI+1} / ${fcGameList.length}`; document.getElementById('fcTxt').innerText = w.word; document.getElementById('fcHint').innerText = (fcI === 0) ? "Chạm hoặc Space để lật" : ""; fcSpeak(w.word); }
function fcFlip() { fcFront = !fcFront; document.getElementById('fcCard').classList.toggle('flipped'); document.getElementById('fcTxt').innerText = fcFront ? fcGameList[fcI].word : fcGameList[fcI].meaning; if(fcFront) fcSpeak(fcGameList[fcI].word); }
function fcMove(step) { fcI = (fcI + step + fcGameList.length) % fcGameList.length; drawFc(); }
function fcAssess(st) { firebase.firestore().collection("users").doc(currentUserUid).collection("vocabulary").doc(fcGameList[fcI].id).update({status: st}); fcMove(1); }

function fcTogglePlay() { fcAuto = !fcAuto; let btn = document.getElementById('btnFcPlay'); if(fcAuto) { btn.style.color = '#3b82f6'; runAutoFc(); } else { btn.style.color = ''; clearTimeout(fcTimer1); clearTimeout(fcTimer2); } }
function fcToggleAudio() { fcMuted = !fcMuted; let btn = document.getElementById('btnFcAudio'); if(fcMuted) btn.style.color = '#ef4444'; else btn.style.color = ''; }
function runAutoFc() { if (!fcAuto) return; fcTimer1 = setTimeout(() => { if (!fcAuto) return; fcFlip(); fcTimer2 = setTimeout(() => { if (!fcAuto) return; fcMove(1); runAutoFc(); }, 2000); }, 2000); }

// --- CHESKPOINT: MATCH GAME ---
let mFirst = null, mScore = 0, mPairs = 0; let matchGameList = [];
function initMatch(list) { 
    matchGameList = list;
    if(matchGameList.length < 2) { 
        Swal.fire("Lỗi", "Cần ít nhất 2 từ để chơi!", "error"); return closeStudy(); 
    } 
    document.getElementById('matchResult').style.display = 'none'; mScore = 0; mFirst = null; mPairs = matchGameList.length; 
    let grid = document.getElementById('matchGrid'); grid.innerHTML = ''; let arr = []; 
    matchGameList.forEach(w => { arr.push({i: w.word, t: 'kr', tx: w.word}); arr.push({i: w.word, t: 'vn', tx: w.meaning}); }); 
    arr.sort(() => Math.random() - 0.5); 
    arr.forEach(c => { 
        let d = document.createElement('div'); d.className = `match-card`; d.style.cssText = "width:130px; height:130px; background:#fff; border:2px solid var(--border); border-radius:10px; padding:15px; text-align:center; font-weight:800; cursor:pointer; user-select:none; display:flex; align-items:center; justify-content:center; box-sizing:border-box;";
        if(c.t === 'kr') d.style.color = '#2563eb'; else d.style.color = '#059669';
        d.innerText = c.tx; 
        d.onclick = () => { 
            if(d.style.opacity === '0' || d.style.borderColor === '#3b82f6') return; 
            d.style.borderColor = '#3b82f6'; d.style.background = '#eff6ff';
            if(c.t === 'kr') speakVocab(c.tx); 
            if(!mFirst) mFirst = {el: d, id: c.i, t: c.t}; else { 
                let e1 = mFirst.el, e2 = d; 
                if(mFirst.id === c.i && mFirst.t !== c.t) { 
                    mScore++; speakVocab(c.t === 'kr' ? c.tx : e1.innerText); 
                    setTimeout(() => { e1.style.opacity = 0; e2.style.opacity = 0; mPairs--; if(!mPairs) showWin(); }, 300); 
                } else { 
                    e1.style.borderColor = '#ef4444'; e2.style.borderColor = '#ef4444'; e1.style.background = '#fef2f2'; e2.style.background = '#fef2f2';
                    setTimeout(() => { 
                        e1.style.borderColor = 'var(--border)'; e2.style.borderColor = 'var(--border)'; 
                        e1.style.background = '#fff'; e2.style.background = '#fff';
                    }, 600); 
                } 
                mFirst = null; 
            } 
        }; 
        grid.appendChild(d); 
    }); 
}

function showWin() { 
    document.getElementById('matchScoreDisp').innerText = `${mScore}/${matchGameList.length}`; 
    document.getElementById('matchResult').style.display = 'flex'; 
    if(typeof confetti === 'function') confetti({ particleCount: 200, spread: 90, zIndex: 99999999 }); 
}

// --- CHEKSPOINT: TYPE GAME ---
let tMode = 'kr2vn', tIdx = 0, typeList = [];
function setupType(mode, btn, list) { 
    if(list) typeList = [...list].sort(() => Math.random() - 0.5); 
    tMode = mode; tIdx = 0; 
    let parent = btn.parentElement; if(parent) Array.from(parent.children).forEach(b => {b.style.background='#fff'; b.style.color='#1f2937';}); 
    btn.style.background='#1f2937'; btn.style.color='#fff'; 
    nextType(); 
}
function nextType() { 
    if(tIdx >= typeList.length) { 
        showWinMatchStyle();
        return; 
    } 
    let w = typeList[tIdx]; let isKr = tMode === 'kr2vn' ? true : (tMode === 'vn2kr' ? false : Math.random() > 0.5); 
    document.getElementById('typeCount').innerText = `${tIdx+1} / ${typeList.length}`; 
    document.getElementById('typeWord').innerText = isKr ? w.word : w.meaning; document.getElementById('typeWord').dataset.iskr = isKr; 
    document.getElementById('typeInput').value = ''; document.getElementById('typeInput').focus(); document.getElementById('typeRes').innerText = ''; 
    if(isKr) speakVocab(w.word); 
}
function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str;
}
function checkType() { 
    let inp = document.getElementById('typeInput').value.trim().toLowerCase(); if(!inp) return; 
    let w = typeList[tIdx]; let isKr = document.getElementById('typeWord').dataset.iskr === 'true'; 
    let ans = isKr ? w.meaning.toLowerCase() : w.word.toLowerCase(); let res = document.getElementById('typeRes'); 
    let cleanInp = removeVietnameseTones(inp);
    let cleanAns = removeVietnameseTones(ans);
    
    // Exact match (ignoring tones if VN)
    if(cleanInp === cleanAns) { 
        res.innerText = "✅ Chính xác!"; res.style.color = "#10b981"; 
        if(!isKr) speakVocab(w.word); setTimeout(() => { tIdx++; nextType(); }, 1000); 
    } else { 
        res.innerText = `❌ Sai rồi. Đáp án: ${isKr ? w.meaning : w.word}`; res.style.color = "#ef4444"; document.getElementById('typeInput').value = ''; 
    } 
}

function showWinMatchStyle() {
    document.getElementById('matchScoreDisp').innerText = `100%`;
    document.getElementById('matchResult').style.display = 'flex';
    if(typeof confetti === 'function') confetti({ particleCount: 200, zIndex: 99999999 }); 
}

document.addEventListener('keydown', (e) => {
    let fcView = document.getElementById('gameFlashcard');
    let studyModal = document.getElementById('studyModal');
    if(studyModal && studyModal.style.display === 'flex' && fcView && fcView.style.display === 'block') {
        if(e.code === 'Space') { e.preventDefault(); fcFlip(); }
        else if(e.code === 'ArrowLeft') fcMove(-1);
        else if(e.code === 'ArrowRight') fcMove(1);
    }
});