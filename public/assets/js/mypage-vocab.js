/* ==========================================================================
   MODULE SỔ TỪ VỰNG — Thư mục → Bài học → Từ vựng hierarchy
   ========================================================================== */

let userFolders = ['Đã lưu'];        // Thư mục (top-level folders)
let allVocabData = [];
let currentListView = null;         // current Bài học listName
let currentFolderName = null;       // current Thư mục being browsed
let currentStudyList = [];
let activeStatusFilter = null;
let sortableInstance = null;
let _dailyVocabFromLessons = false;

function setStudyList(list) {
    currentStudyList = Array.isArray(list) ? list : [];
    window.currentStudyList = currentStudyList;
}
window.setStudyList = setStudyList;

function defaultFolder() { return 'Đã lưu'; }

// ==================== MIGRATION ====================
async function migrateOldData() {
    const uid = window.currentUserUid;
    if (!uid || typeof firebase === 'undefined') return;
    const db = firebase.firestore();
    const userRef = db.collection("users").doc(uid);
    const vocabRef = userRef.collection("vocabulary");

    try {
        // Ensure "Đã lưu" exists in vocabLists
        const userDoc = await userRef.get();
        let lists = (userDoc.exists && userDoc.data().vocabLists) || [];
        // Remove old flat names that are now Bài học under Đã lưu
        const reserved = ['Daily Vocab', 'Đã lưu'];
        const needsMigration = lists.filter(l => !reserved.includes(l) && !l.includes('/'));
        if (needsMigration.length > 0 || !lists.includes('Đã lưu')) {
            // merge: true — chỉ thay mảng vocabLists; merge: false sẽ XÓA SẠCH EXP/streak/hồ sơ của user
            await userRef.set({ vocabLists: ['Đã lưu', 'Daily Vocab'] }, { merge: true }).catch(()=>{});
        }

        // Migrate words: flat listName → "Đã lưu/oldListName"
        const snap = await vocabRef.get();
        const batch = db.batch();
        let count = 0;
        snap.forEach(doc => {
            const d = doc.data();
            const ln = d.listName || '';
            if (ln && !ln.includes('/') && ln !== '__folder_marker__') {
                const newLn = 'Đã lưu/' + ln;
                // Only update if doc doesn't already exist with new name
                batch.update(doc.ref, { listName: newLn });
                count++;
            }
        });
        if (count > 0) await batch.commit().catch(()=>{});
    } catch(e) { console.log('Migration error:', e); }
}

// ==================== TAB SWITCHER ====================
function switchVocabTab(tab) {
    if (typeof window.updateFloatingKeyVisibility === 'function') {
        setTimeout(window.updateFloatingKeyVisibility, 50);
    }
    _dailyVocabFromLessons = false;
    document.getElementById('tabAllBtn').classList.remove('active');
    document.getElementById('tabFoldersBtn').classList.remove('active');
    document.getElementById('viewAllVocab').style.display = 'none';
    document.getElementById('viewFolders').style.display = 'none';

    if (tab === 'all') {
        // Tab "Bài học" — flat list of all Bài học
        document.getElementById('tabAllBtn').classList.add('active');
        document.getElementById('viewAllVocab').style.display = 'block';
        currentListView = null;
        currentFolderName = null;
        activeStatusFilter = null;
        updateStatsUI(allVocabData, "Thống kê ghi nhớ");
        renderLessonsGrid();
    } else {
        // Tab "Thư mục" — folder hierarchy
        document.getElementById('tabFoldersBtn').classList.add('active');
        document.getElementById('viewFolders').style.display = 'block';
        document.getElementById('vocabSetsView').style.display = 'block';
        document.getElementById('vocabDetailView').style.display = 'none';
        currentListView = null;
        currentFolderName = null;
        activeStatusFilter = null;
        updateStatsUI(allVocabData, "Thống kê ghi nhớ");
        renderFoldersGrid();
    }
}

// ==================== DATA SYNC ====================
function setVocabLists(lists) {
    userFolders = lists.length > 0 ? lists : ['Đã lưu'];
    window.userVocabLists = [...userFolders];
    if (document.getElementById('viewFolders').style.display === 'block' && !currentListView && !currentFolderName) {
        renderFoldersGrid();
    }
    if (document.getElementById('viewAllVocab').style.display !== 'none' && !currentListView) {
        renderLessonsGrid();
    }
}

function setVocabData(data) {
    allVocabData = data;
    window._allVocabData = data;
    let skel = document.getElementById('vocabSkeleton');
    if (skel) skel.style.display = 'none';

    if (document.getElementById('viewAllVocab').style.display !== 'none') {
        if (currentListView) {
            currentStudyList = allVocabData.filter(w => w.listName === currentListView);
            updateStatsUI(currentStudyList, 'Thống kê ghi nhớ');
            renderVocabGridDetail();
        } else {
            updateStatsUI(allVocabData, 'Thống kê ghi nhớ');
            renderLessonsGrid();
        }
    } else {
        if (currentListView) {
            currentStudyList = allVocabData.filter(w => w.listName === currentListView);
            updateStatsUI(currentStudyList, 'Thống kê ghi nhớ');
            renderVocabGridDetail();
        } else if (currentFolderName) {
            renderSubLessonsGrid(currentFolderName);
        } else {
            updateStatsUI(allVocabData, 'Thống kê ghi nhớ');
            renderFoldersGrid();
        }
    }
}

// ==================== FAB ====================
function toggleFabMenu() {
    const fab = document.getElementById('fabContainer');
    fab.classList.toggle('open');
    document.getElementById('fabMainBtn').innerText = fab.classList.contains('open') ? '✕' : '📖';
}
document.addEventListener('click', (e) => {
    if (!e.target.closest('.fab-container')) {
        document.getElementById('fabContainer').classList.remove('open');
        document.getElementById('fabMainBtn').innerText = '📖';
    }
});

// ==================== STATS ====================
function updateStatsUI(dataArray, title) {
    let filtered = dataArray.filter(w => w.word !== '__folder_marker__');
    let titleEl = document.getElementById('statTotalTitle');
    if (titleEl) titleEl.innerText = title;
    let counts = [0,0,0,0];
    filtered.forEach(w => { let st = parseInt(w.status)||0; if(st>=0&&st<=3) counts[st]++; });
    let total = filtered.length || 1;
    for (let i=0; i<4; i++) {
        let el = document.getElementById(`c${i}`), bar = document.getElementById(`bar${i}`);
        if (el) el.innerText = counts[i];
        if (bar) bar.style.width = (counts[i]/total*100)+'%';
    }
    let totalEl = document.getElementById('totalVocabCountGlobal');
    if (totalEl) totalEl.innerText = filtered.length;
}

function filterByStatus(status) {
    activeStatusFilter = activeStatusFilter === status ? null : status;
    document.querySelectorAll('.legend-item').forEach((el,idx) => el.classList.toggle('filter-active', activeStatusFilter===idx));
    document.getElementById('clearFilterBtn').style.display = activeStatusFilter !== null ? 'block' : 'none';
    if (document.getElementById('viewAllVocab').style.display !== 'none') {
        renderVocabGridDetail();
    } else if (currentListView) {
        renderVocabGridDetail();
    }
}

// ==================== TAB BÀI HỌC (flat list) ====================
function getAllLessons() {
    const map = new Map();
    allVocabData.forEach(w => {
        const ln = w.listName || '';
        if (!ln || w.word === '__folder_marker__') return;
        // Ẩn các bài học Daily Vocab (chỉ hiển thị bên trong thư mục Daily Vocab)
        if (ln.startsWith('Daily Vocab/')) return;
        if (!map.has(ln)) map.set(ln, { count: 0, folder: ln.includes('/') ? ln.split('/')[0] : defaultFolder() });
        map.get(ln).count++;
    });
    return Array.from(map.entries()).map(([name, info]) => ({ name, ...info }));
}

function renderLessonsGrid() {
    const grid = document.getElementById('vocabGridGlobal');
    const lessons = getAllLessons();
    document.getElementById('totalVocabCountGlobal').innerText = lessons.length;

    let html = '';
    // Thư mục Daily Vocab (gói gọn — ấn vào mới mở danh sách các ngày)
    html += `<div class="list-card" style="position:relative;">
        <div style="flex:1;cursor:pointer;" onclick="openDailyVocabFromLessons()">
            <div class="list-title">🗓️ Daily Vocab</div>
            <div class="list-count">Từ vựng mỗi ngày — ấn để mở</div>
        </div>
    </div>`;

    if (lessons.length === 0) {
        html += `<p style="color:#6b7280;font-style:italic;padding:20px;">Chưa có Bài học nào.</p>`;
    } else {
        lessons.sort((a,b) => a.name.localeCompare(b.name));
        lessons.forEach(l => {
            const displayName = l.name.includes('/') ? l.name.split('/')[1] : l.name;
            const safeName = l.name.replace(/'/g,"\\'");
            const menuId = 'lmenu-' + l.name.replace(/[\/\s\.'"]/g,'_');
            html += `<div class="list-card" style="position:relative;">
                <div style="flex:1;cursor:pointer;" onclick="openLesson('${safeName}')">
                    <div class="list-title">📖 ${displayName}</div>
                    <div class="list-count">${l.count} từ — 📁 ${l.folder}</div>
                </div>
                <div class="folder-actions" onclick="event.stopPropagation()">
                    <button class="folder-dots-btn" onclick="toggleCardMenu('${menuId}', this, event)">⋮</button>
                    <div id="${menuId}" class="folder-menu">
                        <div class="folder-menu-item" onclick="renameLesson('${safeName}', event)">Đổi tên</div>
                        <div class="folder-menu-item" onclick="moveLesson('${safeName}', event)">Chuyển thư mục</div>
                        <div class="folder-menu-item danger" onclick="deleteLesson('${safeName}', event)">Xóa</div>
                    </div>
                </div>
            </div>`;
        });
    }
    grid.innerHTML = html;
}

// ==================== GLOBAL DROPDOWN MENU ====================
// backdrop-filter on .list-card creates a containing block for position:fixed.
// Fix: use a single menu element attached directly to document.body.
let _gMenuEl = null;
let _gMenuSourceId = null;

function _initGlobalMenu() {
    if (_gMenuEl) return;
    _gMenuEl = document.createElement('div');
    _gMenuEl.id = '_vocabGlobalMenu';
    _gMenuEl.style.cssText = 'display:none;position:fixed;z-index:999999;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.15);min-width:160px;overflow:hidden;font-family:Pretendard,Inter,sans-serif;';
    document.body.appendChild(_gMenuEl);
}

// Register a single capture-phase listener to dismiss the menu when clicking outside
document.addEventListener('click', function(e) {
    if (!_gMenuEl || _gMenuEl.style.display !== 'block') return;
    // Allow clicks on the menu itself or on any ⋮ button (handled by toggleCardMenu)
    if (_gMenuEl.contains(e.target) || e.target.closest('.folder-dots-btn')) return;
    _closeGlobalMenu();
}, true);

document.addEventListener('DOMContentLoaded', _initGlobalMenu);

function _closeGlobalMenu() {
    if (_gMenuEl) {
        _gMenuEl.style.display = 'none';
        _gMenuEl.innerHTML = '';
    }
    _gMenuSourceId = null;
}

function toggleCardMenu(menuId, btn, e) {
    if (e) { e.stopPropagation(); }
    _initGlobalMenu();

    // Toggle: if this same menu is already open, close it
    if (_gMenuSourceId === menuId && _gMenuEl.style.display === 'block') {
        _closeGlobalMenu();
        return;
    }

    // Find the template menu element (hidden in DOM as data source)
    const templateMenu = document.getElementById(menuId);
    if (!templateMenu) { console.warn('toggleCardMenu: menu not found:', menuId); return; }

    // Clone content into global menu
    _gMenuEl.innerHTML = templateMenu.innerHTML;
    _gMenuSourceId = menuId;

    // Position relative to viewport (safe from backdrop-filter containing block)
    const rect = btn.getBoundingClientRect();
    const menuWidth = 165;
    let leftPos = rect.right - menuWidth;
    if (leftPos < 8) leftPos = 8;
    if (leftPos + menuWidth > window.innerWidth - 8) leftPos = window.innerWidth - menuWidth - 8;
    let topPos = rect.bottom + 4;
    if (topPos + 160 > window.innerHeight - 8) topPos = rect.top - 164;

    _gMenuEl.style.top = topPos + 'px';
    _gMenuEl.style.left = leftPos + 'px';
    _gMenuEl.style.display = 'block';
}


function closeAllMenus() {
    _closeGlobalMenu();
    document.querySelectorAll('.folder-menu').forEach(m => {
        m.style.cssText = '';
        m.classList.remove('show');
    });
    document.querySelectorAll('.v-dropdown-menu').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.v-card').forEach(c => c.style.zIndex = '');
}

async function createLesson(parentFolder) {
    const folderName = parentFolder || null;
    let html = '<select id="swalFolderSelect" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:10px;">';
    userFolders.forEach(f => { html += `<option value="${f}" ${f===folderName?'selected':''}>📁 ${f}</option>`; });
    html += '</select>';
    const { value: lessonName } = await Swal.fire({
        title: parentFolder ? `Tạo Bài học trong "${parentFolder}"` : 'Tạo Bài học mới',
        html: html + '<input id="swalLessonInput" class="swal2-input" placeholder="Tên Bài học...">',
        focusConfirm: false,
        showCancelButton: true, confirmButtonColor: '#3b82f6', confirmButtonText: 'Tạo',
        preConfirm: () => {
            const f = document.getElementById('swalFolderSelect').value;
            const n = document.getElementById('swalLessonInput').value.trim();
            if (!n) { Swal.showValidationMessage('Vui lòng nhập tên'); return false; }
            return { folder: f, name: n };
        }
    });
    if (!lessonName || !lessonName.name) return;
    const fullPath = lessonName.folder + '/' + lessonName.name;
    if (allVocabData.some(w => w.listName === fullPath)) return Swal.fire("Lỗi", "Bài học này đã tồn tại!", "error");
    const markerId = '__folder__' + fullPath.replace(/[\/\s]/g, '_');
    await firebase.firestore().collection("users").doc(window.currentUserUid).collection("vocabulary").doc(markerId).set({
        word: '__folder_marker__', meaning: '', listName: fullPath, status: 0, order: -1,
        savedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    Swal.fire("Thành công", `Đã tạo Bài học "${lessonName.name}"!`, "success");
}

async function renameLesson(fullPath, e) {
    e.stopPropagation();
    const parts = fullPath.split('/');
    const oldName = parts.slice(1).join('/');
    const { value: newName } = await Swal.fire({
        title: 'Đổi tên Bài học', input: 'text', inputValue: oldName,
        showCancelButton: true, confirmButtonColor: '#3b82f6', confirmButtonText: 'Lưu'
    });
    if (!newName || newName.trim() === oldName) return;
    const newPath = parts[0] + '/' + newName.trim();
    if (allVocabData.some(w => w.listName === newPath)) return Swal.fire("Lỗi", "Tên này đã tồn tại!", "error");
    try {
        const snap = await firebase.firestore().collection("users").doc(window.currentUserUid).collection("vocabulary").where("listName", "==", fullPath).get();
        const batch = firebase.firestore().batch();
        snap.forEach(doc => batch.update(doc.ref, { listName: newPath }));
        await batch.commit();
        if (currentListView === fullPath) currentListView = newPath;
        Swal.fire("Thành công", "Đã đổi tên!", "success");
    } catch(err) { Swal.fire("Lỗi", err.message, "error"); }
}

async function deleteLesson(fullPath, e) {
    e.stopPropagation();
    const result = await Swal.fire({
        title: "⚠️ Xóa Bài học?", text: `"${fullPath}" và tất cả từ bên trong sẽ bị xóa!`,
        icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Xóa"
    });
    if (!result.isConfirmed) return;
    try {
        const snap = await firebase.firestore().collection("users").doc(window.currentUserUid).collection("vocabulary").where("listName", "==", fullPath).get();
        const batch = firebase.firestore().batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        if (currentListView === fullPath) backToSets();
        Swal.fire("Đã xóa", "Bài học đã bị xóa.", "success");
    } catch(err) { Swal.fire("Lỗi", err.message, "error"); }
}

async function moveLesson(fullPath, e) {
    e.stopPropagation();
    closeAllMenus();
    const parts = fullPath.split('/');
    const lessonName = parts.slice(1).join('/');
    
    let html = '<select id="swalMoveFolderSelect" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;margin-bottom:10px;">';
    userFolders.forEach(f => {
        if (f !== parts[0]) html += `<option value="${f}">📁 ${f}</option>`;
    });
    html += '</select>';
    
    if (userFolders.length <= 1) {
        return Swal.fire("Thông báo", "Bạn chưa có thư mục nào khác để chuyển đến. Hãy tạo thêm thư mục trước.", "info");
    }

    const { value: targetFolder } = await Swal.fire({
        title: `Chuyển "${lessonName}"`,
        html: html,
        focusConfirm: false,
        showCancelButton: true, confirmButtonColor: '#3b82f6', confirmButtonText: 'Chuyển',
        preConfirm: () => document.getElementById('swalMoveFolderSelect').value
    });
    
    if (!targetFolder) return;
    
    const newPath = targetFolder + '/' + lessonName;
    if (allVocabData.some(w => w.listName === newPath)) return Swal.fire("Lỗi", "Bài học này đã tồn tại ở thư mục đích!", "error");
    
    try {
        const snap = await firebase.firestore().collection("users").doc(window.currentUserUid).collection("vocabulary").where("listName", "==", fullPath).get();
        const batch = firebase.firestore().batch();
        snap.forEach(doc => batch.update(doc.ref, { listName: newPath }));
        await batch.commit();
        
        if (currentListView === fullPath) currentListView = newPath;
        if (currentFolderName === parts[0]) renderSubLessonsGrid(currentFolderName);
        Swal.fire("Thành công", "Đã chuyển bài học!", "success");
    } catch(err) { Swal.fire("Lỗi", err.message, "error"); }
}

function openLesson(fullPath) {
    if (typeof window.updateFloatingKeyVisibility === 'function') {
        setTimeout(window.updateFloatingKeyVisibility, 50);
    }
    currentListView = fullPath;
    currentFolderName = null;
    // Switch to detail view (inside viewFolders container)
    document.getElementById('viewAllVocab').style.display = 'none';
    document.getElementById('viewFolders').style.display = 'block';
    document.getElementById('vocabSetsView').style.display = 'none';
    document.getElementById('vocabDetailView').style.display = 'block';
    document.getElementById('currentListName').innerText = '📖 ' + fullPath;
    document.getElementById('addWordSection').style.display = '';
    document.getElementById('headerActionBtnSlot').innerHTML = `<button class="btn-edit" onclick="openBulkImport()" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;">+ Danh sách</button>`;
    currentStudyList = allVocabData.filter(w => w.listName === fullPath && w.word !== '__folder_marker__');
    activeStatusFilter = null;
    document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('filter-active'));
    document.getElementById('clearFilterBtn').style.display = 'none';
    updateStatsUI(currentStudyList, 'Thống kê ghi nhớ');
    renderVocabGridDetail();
}

function backToLessons() {
    if (typeof window.updateFloatingKeyVisibility === 'function') {
        setTimeout(window.updateFloatingKeyVisibility, 50);
    }
    currentListView = null;
    document.getElementById('vocabSetsView').style.display = 'block';
    document.getElementById('vocabDetailView').style.display = 'none';
    document.getElementById('viewAllVocab').style.display = 'block';
    document.getElementById('viewFolders').style.display = 'none';
    updateStatsUI(allVocabData, 'Thống kê ghi nhớ');
    renderLessonsGrid();
}

// ==================== TAB THƯ MỤC ====================
function renderFoldersGrid() {
    let html = '';
    userFolders.forEach(folderName => {
        const count = allVocabData.filter(w => (w.listName||'').startsWith(folderName + '/') && w.word !== '__folder_marker__').length;
        const subCount = new Set(allVocabData.filter(w => (w.listName||'').startsWith(folderName + '/') && w.word !== '__folder_marker__').map(w => w.listName)).size;
        const icon = folderName === 'Daily Vocab' ? '🗓️' : '📁';
        const desc = `${count} từ / ${subCount} bài học`;
        const safeName = folderName.replace(/'/g, "\\'");
        let dotsHtml = '';
        if (folderName === 'Daily Vocab') {
            dotsHtml = `<span style="color:#94a3b8;font-size:0.8em;font-weight:600;">Tự động</span>`;
        } else if (folderName !== 'Đã lưu') {
            const menuId = 'fmenu-' + folderName.replace(/[\/\s\.'"]/g,'_');
            dotsHtml = `<div class="folder-actions" onclick="event.stopPropagation()">
                <button class="folder-dots-btn" onclick="toggleCardMenu('${menuId}', this, event)">⋮</button>
                <div id="${menuId}" class="folder-menu">
                    <div class="folder-menu-item" onclick="renameFolder('${safeName}', event)">Đổi tên</div>
                    <div class="folder-menu-item danger" onclick="deleteFolder('${safeName}', event)">Xóa thư mục</div>
                </div>
            </div>`;
        }
        html += `<div class="list-card" style="cursor:pointer;" onclick="openFolder('${safeName}')">
            <div style="flex:1;"><div class="list-title">${icon} ${folderName}</div><div class="list-count">${desc}</div></div>
            ${dotsHtml}</div>`;
    });
    document.getElementById('listsGrid').innerHTML = html;
    if (typeof window.renderSharedFoldersGrid === 'function') {
        window.renderSharedFoldersGrid();
    }
}

async function createFolderDialog() {
    const { value: name } = await Swal.fire({
        title: "Tạo Thư mục mới", input: "text", inputPlaceholder: "Tên thư mục...",
        showCancelButton: true, confirmButtonColor: '#3b82f6', confirmButtonText: 'Tạo'
    });
    if (!name || !name.trim()) return;
    const n = name.trim();
    if (userFolders.includes(n)) return Swal.fire("Lỗi", "Tên thư mục đã tồn tại!", "error");
    await firebase.firestore().collection("users").doc(window.currentUserUid).set({
        vocabLists: firebase.firestore.FieldValue.arrayUnion(n)
    }, { merge: true });
    Swal.fire("Thành công", `Đã tạo thư mục "${n}"!`, "success");
}
async function renameFolder(oldName, e) {
    e.stopPropagation();
    const { value: newName } = await Swal.fire({
        title: 'Đổi tên Thư mục', input: 'text', inputValue: oldName,
        showCancelButton: true, confirmButtonColor: '#3b82f6', confirmButtonText: 'Lưu'
    });
    if (!newName || newName.trim() === oldName) return;
    const n = newName.trim();
    if (userFolders.includes(n)) return Swal.fire("Lỗi", "Tên đã tồn tại!", "error");
    try {
        const userRef = firebase.firestore().collection("users").doc(window.currentUserUid);
        await userRef.update({ vocabLists: firebase.firestore.FieldValue.arrayRemove(oldName) });
        await userRef.update({ vocabLists: firebase.firestore.FieldValue.arrayUnion(n) });
        const snap = await userRef.collection("vocabulary").where("listName", ">=", oldName + "/").where("listName", "<=", oldName + "/\uf8ff").get();
        const batch = firebase.firestore().batch();
        snap.forEach(doc => {
            const d = doc.data();
            batch.update(doc.ref, { listName: n + '/' + d.listName.substring(oldName.length + 1) });
        });
        await batch.commit();
        Swal.fire("Thành công", "Đã đổi tên thư mục!", "success");
    } catch(err) { Swal.fire("Lỗi", err.message, "error"); }
}

async function deleteFolder(folderName, e) {
    e.stopPropagation();
    const result = await Swal.fire({
        title: "⚠️ Xóa Thư mục?", text: `"${folderName}" và tất cả Bài học, từ vựng bên trong sẽ bị xóa!`,
        icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Xóa"
    });
    if (!result.isConfirmed) return;
    try {
        const userRef = firebase.firestore().collection("users").doc(window.currentUserUid);
        await userRef.update({ vocabLists: firebase.firestore.FieldValue.arrayRemove(folderName) });
        const snap = await userRef.collection("vocabulary").where("listName", ">=", folderName + "/").where("listName", "<=", folderName + "/\uf8ff").get();
        const batch = firebase.firestore().batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        if (currentFolderName === folderName) backToSets();
        Swal.fire("Đã xóa", "Thư mục đã bị xóa.", "success");
    } catch(err) { Swal.fire("Lỗi", err.message, "error"); }
}

function openFolder(folderName) {
    if (typeof window.updateFloatingKeyVisibility === 'function') {
        setTimeout(window.updateFloatingKeyVisibility, 50);
    }
    if (folderName === 'Daily Vocab') {
        openDailyVocab();
        return;
    }
    currentFolderName = folderName;
    currentListView = null;
    document.getElementById('vocabSetsView').style.display = 'none';
    document.getElementById('vocabDetailView').style.display = 'block';
    document.getElementById('currentListName').innerText = '📁 ' + folderName;
    document.getElementById('addWordSection').style.display = 'none';
    const sfTabs = document.getElementById('sharedFolderMainTabs');
    if (sfTabs) sfTabs.style.display = 'none';
    // Set action button
    const slot = document.getElementById('headerActionBtnSlot');
    slot.innerHTML = `<button class="btn-create-list" onclick="createLesson('${folderName}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;">+ Tạo Bài học</button>`;
    renderSubLessonsGrid(folderName);
}

function renderSubLessonsGrid(folderName) {
    const prefix = folderName + '/';
    const lessons = new Set();
    allVocabData.forEach(w => {
        const ln = w.listName || '';
        if (ln.startsWith(prefix)) lessons.add(ln);
    });

    const grid = document.getElementById('vocabGridDetail');
    let html = '';
    if (lessons.size === 0) {
        html = `<p style="color:#6b7280;font-style:italic;padding:20px;">Chưa có Bài học nào.</p>`;
    } else {
        html = Array.from(lessons).sort().map(subPath => {
            const displayName = subPath.substring(prefix.length);
            const count = allVocabData.filter(w => w.listName === subPath && w.word !== '__folder_marker__').length;
            const safePath = subPath.replace(/'/g,"\\'");
            const menuId = 'lmenu-' + subPath.replace(/[\/\s\.'"]/g,'_');
            return `<div class="list-card" style="position:relative;">
                <div style="flex:1;cursor:pointer;" onclick="openSubLesson('${safePath}')">
                    <div class="list-title">📖 ${displayName}</div>
                    <div class="list-count">${count} thuật ngữ</div>
                </div>
                <div class="folder-actions" onclick="event.stopPropagation()">
                    <button class="folder-dots-btn" onclick="toggleCardMenu('${menuId}', this, event)">⋮</button>
                    <div id="${menuId}" class="folder-menu">
                        <div class="folder-menu-item" onclick="renameLesson('${safePath}', event)">Đổi tên</div>
                        <div class="folder-menu-item" onclick="moveLesson('${safePath}', event)">Chuyển thư mục</div>
                        <div class="folder-menu-item danger" onclick="deleteLesson('${safePath}', event)">Xóa</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
    grid.innerHTML = html;
}

function openSubLesson(fullPath) {
    currentListView = fullPath;
    document.getElementById('currentListName').innerText = '📖 ' + fullPath;
    document.getElementById('addWordSection').style.display = '';
    document.getElementById('headerActionBtnSlot').innerHTML = `<button class="btn-edit" onclick="openBulkImport()" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;">+ Danh sách</button>`;
    currentStudyList = allVocabData.filter(w => w.listName === fullPath && w.word !== '__folder_marker__');
    activeStatusFilter = null;
    document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('filter-active'));
    document.getElementById('clearFilterBtn').style.display = 'none';
    updateStatsUI(currentStudyList, 'Thống kê ghi nhớ');
    renderVocabGridDetail();
}

// ==================== BULK IMPORT ====================
function openBulkImport() {
    const modal = document.getElementById('bulkImportModal');
    if (modal) { modal.style.display = 'flex'; document.getElementById('bulkImportTextarea').value = ''; document.getElementById('bulkImportTextarea').focus(); return; }

    const div = document.createElement('div');
    div.id = 'bulkImportModal';
    div.className = 'modal-overlay';
    div.style.cssText = 'display:flex;z-index:100001;';
    div.innerHTML = `<div class="modal-box" style="max-width:550px;padding:25px;">
        <div class="modal-header"><h3 class="modal-title">📋 Nhập từ hàng loạt</h3><button class="close-btn" onclick="document.getElementById('bulkImportModal').remove()">&times;</button></div>
        <div style="font-size:0.85em;color:var(--text-sub);margin-bottom:12px;line-height:1.6;">
            Mỗi dòng 1 từ, cách nghĩa bằng dấu <b>:</b><br>
            <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">가다:đi</code>
            <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;margin-left:4px;">살다:sống</code>
        </div>
        <textarea id="bulkImportTextarea" style="width:100%;height:200px;padding:12px;border:2px solid var(--border);border-radius:10px;font-size:0.95em;outline:none;resize:vertical;font-family:inherit;" placeholder="가다:đi&#10;먹다:ăn&#10;살다:sống"></textarea>
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
            <button onclick="document.getElementById('bulkImportModal').remove()" style="background:#f1f5f9;border:none;padding:12px 20px;border-radius:8px;font-weight:700;cursor:pointer;">Hủy</button>
            <button id="bulkImportSubmitBtn" style="background:#10b981;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:700;cursor:pointer;">📥 Tạo tất cả</button>
        </div></div>`;
    document.body.appendChild(div);
    document.getElementById('bulkImportSubmitBtn').onclick = bulkImportWords;
    document.getElementById('bulkImportTextarea').focus();
    div.addEventListener('click', function(e) { if (e.target === div) div.remove(); });
}

async function bulkImportWords() {
    if (window.currentSharedFolderId && typeof window.bulkImportToCurrentSharedLesson === 'function') {
        return window.bulkImportToCurrentSharedLesson();
    }
    const text = document.getElementById('bulkImportTextarea').value.trim();
    if (!text) return Swal.fire("Lỗi", "Vui lòng nhập danh sách từ!", "error");
    const lines = text.split('\n').filter(l => l.trim());
    const pairs = [];
    for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const word = line.substring(0, idx).trim();
        const meaning = line.substring(idx + 1).trim();
        if (word && meaning) pairs.push({ word, meaning });
    }
    if (pairs.length === 0) return Swal.fire("Lỗi", "Không tìm thấy từ hợp lệ! Định dạng: từ:nghĩa", "error");
    if (!currentListView) return Swal.fire("Lỗi", "Vui lòng mở một Bài học trước!", "error");

    const btn = document.getElementById('bulkImportSubmitBtn');
    btn.disabled = true; btn.textContent = 'Đang tạo...';
    try {
        const uid = window.currentUserUid;
        const batch = firebase.firestore().batch();
        const vocabRef = firebase.firestore().collection("users").doc(uid).collection("vocabulary");
        const maxOrder = currentStudyList.length;
        pairs.forEach((p, i) => {
            const safeId = (currentListView || '').replace(/[/\s]/g, '_') + '_' + p.word;
            var sense = _findBestSense(p.word, p.meaning);
            var ex_kr = '', definition = '';
            if (sense) {
                definition = sense.d || '';
                if (sense.x && sense.x.length)
                    ex_kr = typeof sense.x[0] === 'string' ? sense.x[0] : (sense.x[0].ko || '');
            }
            if (!ex_kr) { var legacy = getExampleForWord(p.word); ex_kr = legacy.ex_kr || ''; }
            batch.set(vocabRef.doc(safeId), {
                word: p.word, meaning: p.meaning, listName: currentListView,
                status: 0, order: maxOrder + i,
                ex_kr: ex_kr, ex_vn: '',
                definition: definition,
                savedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        await batch.commit();
        document.getElementById('bulkImportModal').remove();
        Swal.fire({ title: "Thành công", text: `Đã tạo ${pairs.length} từ mới!`, icon: "success", timer: 2000, showConfirmButton: false });
    } catch(e) {
        Swal.fire("Lỗi", e.message, "error");
        btn.disabled = false; btn.textContent = '📥 Tạo tất cả';
    }
}

// ==================== DAILY VOCAB ====================
function openDailyVocab() {
    currentFolderName = 'Daily Vocab';
    currentListView = null;
    document.getElementById('vocabSetsView').style.display = 'none';
    document.getElementById('vocabDetailView').style.display = 'block';
    document.getElementById('currentListName').innerHTML = `🗓️ Daily Vocab <button class="btn-edit" onclick="if(window.syncDailyVocab)syncDailyVocab()" style="padding:4px 12px;font-size:0.75em;margin-left:8px;">🔄 Đồng bộ</button>`;
    document.getElementById('addWordSection').style.display = 'none';
    document.getElementById('headerActionBtnSlot').innerHTML = '';

    const grid = document.getElementById('vocabGridDetail');
    let html = '';
    for (let offset = 0; offset < 10; offset++) {
        const d = new Date(); d.setDate(d.getDate() - offset);
        const displayName = `Ngày ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
        const listName = 'Daily Vocab/' + displayName;
        html += `<div class="list-card" onclick="openSubFolder('${listName}', ${-offset})">
            <div><div class="list-title">📖 ${displayName}</div><div class="list-count">10 thuật ngữ</div></div></div>`;
    }
    grid.innerHTML = html;
}

// Mở Daily Vocab từ tab "Bài học" (gói gọn trong 1 thư mục)
function openDailyVocabFromLessons() {
    _dailyVocabFromLessons = true;
    document.getElementById('viewAllVocab').style.display = 'none';
    document.getElementById('viewFolders').style.display = 'block';
    document.getElementById('vocabSetsView').style.display = 'none';
    document.getElementById('vocabDetailView').style.display = 'block';
    openDailyVocab();
}

function openSubFolder(subPath, dailyOffset) {
    currentListView = subPath;
    document.getElementById('currentListName').innerText = '📖 ' + subPath;
    document.getElementById('addWordSection').style.display = 'none';
    document.getElementById('headerActionBtnSlot').innerHTML = `<button class="btn-edit" onclick="openBulkImport()" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;">+ Danh sách</button>`;
    if (dailyOffset !== undefined && window.getDailyVocab) {
        const words = window.getDailyVocab(dailyOffset);
        const existingFS = allVocabData.filter(w => w.listName === subPath);
        currentStudyList = words.map((w, i) => {
            const safeId = subPath.replace(/[/\s]/g, '_') + '_' + w.word;
            const persisted = existingFS.find(fw => fw.id === safeId || fw.word === w.word);
            return { id: safeId, word: w.word, meaning: w.meaning, listName: subPath, status: persisted ? (persisted.status||0) : 0, order: i, ex_kr: w.ex_kr, ex_vn: w.ex_vn };
        });
    } else {
        document.getElementById('addWordSection').style.display = '';
        currentStudyList = allVocabData.filter(w => w.listName === subPath);
    }
    activeStatusFilter = null;
    document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('filter-active'));
    document.getElementById('clearFilterBtn').style.display = 'none';
    updateStatsUI(currentStudyList, 'Thống kê ghi nhớ');
    renderVocabGridDetail();
}

function backToSets() {
    if (typeof window.updateFloatingKeyVisibility === 'function') {
        setTimeout(window.updateFloatingKeyVisibility, 50);
    }
    // Ẩn thanh tab Từ vựng / Ngữ pháp / Bài tập
    const subTabs = document.getElementById('lessonSubTabs');
    const vContent = document.getElementById('vocabSubTabContent');
    const gContent = document.getElementById('grammarSubTabContent');
    const eContent = document.getElementById('exerciseSubTabContent');
    if (subTabs) subTabs.style.display = 'none';
    if (vContent) vContent.style.display = 'block';
    if (gContent) gContent.style.display = 'none';
    if (eContent) eContent.style.display = 'none';

    // Nếu đang trong Shared Folder
    if (window.currentSharedFolderId) {
        if (window.currentSharedLesson) {
            window.currentSharedLesson = null;
            window.currentListView = null;
            window.openSharedFolder(window.currentSharedFolderId);
            return;
        } else if (window.currentSharedSubFolder) {
            // Đang ở trong Thư mục con/Giai đoạn -> quay ra cấp Thư mục chính, về tab Thư mục
            window.currentSharedSubFolder = null;
            window.currentSharedFolderTab = 'folders';
            window.openSharedFolder(window.currentSharedFolderId);
            return;
        } else {
            window.currentSharedFolderId = null;
            window.currentSharedFolderData = null;
            window.currentSharedSubFolder = null;
            window.currentSharedFolderTab = 'folders';
            window.currentFolderName = null;
            const sfTabs = document.getElementById('sharedFolderMainTabs');
            if (sfTabs) sfTabs.style.display = 'none';
            document.getElementById('vocabSetsView').style.display = 'block';
            document.getElementById('vocabDetailView').style.display = 'none';
            document.getElementById('addWordSection').style.display = '';
            renderFoldersGrid();
            return;
        }
    }

    // Mở Daily Vocab từ tab "Bài học" → nút Quay Lại đưa về tab Bài học
    if (_dailyVocabFromLessons && !currentListView && currentFolderName === 'Daily Vocab') {
        _dailyVocabFromLessons = false;
        currentFolderName = null;
        backToLessons();
        return;
    }
    // If we came from Bài học tab (no currentFolderName)
    if (currentListView && !currentFolderName) {
        backToLessons();
        return;
    }
    // If deep in Thư mục tab hierarchy
    if (currentListView && currentFolderName) {
        currentListView = null;
        document.getElementById('addWordSection').style.display = 'none';
        if (currentFolderName === 'Daily Vocab') { openDailyVocab(); return; }
        const slot = document.getElementById('headerActionBtnSlot');
        slot.innerHTML = `<button class="btn-create-list" onclick="createLesson('${currentFolderName}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;">+ Tạo Bài học</button>`;
        document.getElementById('currentListName').innerText = '📁 ' + currentFolderName;
        renderSubLessonsGrid(currentFolderName);
        return;
    }
    // Back to folder list
    currentListView = null;
    currentFolderName = null;
    document.getElementById('vocabSetsView').style.display = 'block';
    document.getElementById('vocabDetailView').style.display = 'none';
    document.getElementById('addWordSection').style.display = '';
    activeStatusFilter = null;
    document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('filter-active'));
    document.getElementById('clearFilterBtn').style.display = 'none';
    updateStatsUI(allVocabData, 'Thống kê ghi nhớ');
}

// ==================== VOCAB WORD GRID ====================
function renderVocabGridDetail() {
    if (window.currentSharedFolderId && Array.isArray(window.currentSharedWords)) {
        currentStudyList = window.currentSharedWords;
        window.currentStudyList = currentStudyList;
    }
    let listToRender = activeStatusFilter !== null ? currentStudyList.filter(w => w.status === activeStatusFilter) : currentStudyList;
    listToRender = listToRender.filter(w => w.word !== '__folder_marker__');
    const totalEl = document.getElementById('totalVocabCountDetail');
    if (totalEl) totalEl.innerText = listToRender.length;
    let html = '';
    const svgDots = `<svg class="drag-handle" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>`;
    const svgOpts = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>`;
    const svgTrash = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    const colors = ['bg-moi','bg-hoc','bg-on','bg-thanh'];

    listToRender.forEach(w => {
        const safeMean = (w.meaning||'').replace(/'/g,"\\'");
        const isShared = !!w._isShared;
        const canEdit = !isShared || (typeof isTeacherAdmin === 'function' && isTeacherAdmin());

        const actionsHtml = canEdit ? `
            <div class="v-actions">
                <button class="btn-icon-flat" style="color:#64748b;" onclick="toggleMenu('${w.id}',event)">${svgOpts}</button>
                <button class="btn-icon-flat" onclick="deleteVocab('${w.id}')">${svgTrash}</button>
                <div id="menu-${w.id}" class="v-dropdown-menu">
                    <div class="v-menu-item" onclick="editVocab('${w.id}','${safeMean}')">Sửa nghĩa</div>
                    ${!isShared ? `<div class="v-menu-item" onclick="openMoveModal('${w.id}')">Chuyển Bài học</div>` : ''}
                </div>
            </div>` : '';

        const dragHandleHtml = canEdit ? svgDots : '';

        html += `<div class="v-card" id="card-${w.id}" data-id="${w.id}">
            ${dragHandleHtml}
            <div class="v-status-dot ${colors[w.status||0]}" style="flex-shrink:0;margin:0 10px 0 0;cursor:pointer;" onclick="event.stopPropagation();cycleWordStatus('${w.id}',${w.status||0})" title="Chu kỳ: Mới → Đang học → Đang ôn → Thành thạo"></div>
            <div style="flex:1;cursor:pointer;" onclick="openWordFlashcard('${w.id}')"><div class="v-word">${w.word}</div><div class="v-mean">${w.meaning}</div></div>
            ${actionsHtml}
        </div>`;
    });

    let grid = document.getElementById('vocabGridDetail');
    if (grid) {
        grid.innerHTML = html || `<p style="color:#6b7280;font-style:italic;">Danh sách trống.</p>`;
    }

    if (sortableInstance) sortableInstance.destroy();
    if (activeStatusFilter === null && window.Sortable && grid) {
        sortableInstance = Sortable.create(grid, {
            handle: '.drag-handle', animation: 150, ghostClass: 'sortable-ghost',
            onEnd: async function(evt) {
                if (evt.oldIndex === evt.newIndex) return;
                const items = grid.querySelectorAll('.v-card');
                let batch = firebase.firestore().batch();
                items.forEach((item, index) => {
                    let docId = item.getAttribute('data-id');
                    let ref;
                    if (window.currentSharedFolderId) {
                        ref = firebase.firestore().collection("shared_folders").doc(window.currentSharedFolderId).collection("words").doc(docId);
                    } else {
                        ref = firebase.firestore().collection("users").doc(window.currentUserUid).collection("vocabulary").doc(docId);
                    }
                    batch.update(ref, { order: index });
                });
                try { await batch.commit(); } catch(e) {}
            }
        });
    }
}

function toggleMenu(id, e) {
    e.stopPropagation();
    document.querySelectorAll('.v-dropdown-menu').forEach(m => { if (m.id !== `menu-${id}`) m.classList.remove('show'); });
    document.querySelectorAll('.v-card').forEach(c => c.style.zIndex = '');
    const menuEl = document.getElementById(`menu-${id}`);
    menuEl.classList.toggle('show');
    if (menuEl.classList.contains('show')) {
        let card = document.getElementById(`card-${id}`);
        if (card) { card.style.position = 'relative'; card.style.zIndex = '100'; }
    }
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.v-actions')) {
        document.querySelectorAll('.v-dropdown-menu').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.v-card').forEach(c => c.style.zIndex = '');
    }
});


function deleteVocab(id) {
    if (window.currentSharedFolderId && typeof window.deleteCurrentSharedWord === 'function') {
        return window.deleteCurrentSharedWord(id);
    }
    Swal.fire({ title:"Xóa từ này?", icon:"warning", showCancelButton:true, confirmButtonColor:"#ef4444", confirmButtonText:"Xóa" })
        .then(r => { if (r.isConfirmed) firebase.firestore().collection("users").doc(window.currentUserUid).collection("vocabulary").doc(id).delete(); });
}

async function editVocab(id, oldMean) {
    if (window.currentSharedFolderId && typeof window.editCurrentSharedWord === 'function') {
        return window.editCurrentSharedWord(id, oldMean);
    }
    const { value: newMean } = await Swal.fire({ title:"Sửa nghĩa:", input:"text", inputValue:oldMean, showCancelButton:true });
    if (newMean && newMean.trim() !== oldMean) firebase.firestore().collection("users").doc(window.currentUserUid).collection("vocabulary").doc(id).update({ meaning:newMean.trim() });
}

function openMoveModal(id) {
    const select = document.getElementById('moveSelect'); select.innerHTML = '';
    const lessons = getAllLessons();
    lessons.forEach(l => {
        let opt = document.createElement('option'); opt.value = l.name;
        opt.innerText = `📖 ${l.name.includes('/')?l.name.split('/')[1]:l.name} (📁 ${l.folder})`;
        if (l.name === currentListView) opt.disabled = true;
        select.appendChild(opt);
    });
    document.getElementById('moveModal').style.display = 'flex';
    document.getElementById('confirmMoveBtn').onclick = async function() {
        let target = select.value; if (!target) return;
        try {
            await firebase.firestore().collection("users").doc(window.currentUserUid).collection("vocabulary").doc(id).update({ listName: target });
            document.getElementById('moveModal').style.display = 'none';
            Swal.fire({ title:"Thành công", text:"Đã chuyển Bài học!", icon:"success", timer:1500, showConfirmButton:false });
        } catch(e) { Swal.fire("Lỗi", e.message, "error"); }
    };
}

// ==================== ADD WORD ====================

// ── KRDict lookup helpers ──
var _fullDictMap=null;
function _buildFullDictMap(){
    if(_fullDictMap||!window.AutoVocabDictFull||!Array.isArray(window.AutoVocabDictFull))return;
    _fullDictMap=new Map();
    window.AutoVocabDictFull.forEach(function(e){_fullDictMap.set(e.w,e);});
}
function _findInFullDict(word){
    if(!_fullDictMap)_buildFullDictMap();
    return _fullDictMap?_fullDictMap.get(word):null;
}
window.addEventListener('fulldictready',_buildFullDictMap);
if(window.AutoVocabDictFull)_buildFullDictMap();

// ── Find best matching sense (hand-edited + KRDict) ──
function _findBestSense(word, meaning){
    // 0. Hand-edited dict
    if(window.AutoVocabDict){
        var hf=window.AutoVocabDict.find(function(e){return e.base===word;});
        if(hf){
            if(!meaning)return {m:hf.meaning,d:'',x:hf.examples||[],_source:'hand'};
            if(hf.meaning===meaning)return {m:hf.meaning,d:'',x:hf.examples||[],_source:'hand'};
            if(hf.meaning&&meaning&&(hf.meaning.indexOf(meaning)!==-1||meaning.indexOf(hf.meaning)!==-1))
                return {m:hf.meaning,d:'',x:hf.examples||[],_source:'hand'};
        }
    }
    // 1. KRDict
    var full=_findInFullDict(word);
    if(!full)return null;
    var senses=full.s||[{m:full.m,d:full.d,x:full.x}];
    if(!meaning)return senses[0];
    for(var i=0;i<senses.length;i++){if(senses[i].m===meaning)return senses[i];}
    for(var i=0;i<senses.length;i++){
        if(senses[i].m&&(senses[i].m.indexOf(meaning)!==-1||meaning.indexOf(senses[i].m)!==-1))return senses[i];
    }
    return senses[0];
}

let suggestTimeout;
async function fetchSuggestion() {
    clearTimeout(suggestTimeout);
    const word = document.getElementById('newKrWord').value.trim();
    const suggestBox = document.getElementById('suggestBox');
    if (!word) { suggestBox.style.display = 'none'; return; }
    let sl='ko', tl='vi';
    if (!/[\u3131-\uD79D]/.test(word)) { sl='vi'; tl='ko'; }
    suggestTimeout = setTimeout(async () => {
        if(sl==='ko'){
            var html='';
            // 1. Hand-edited dict
            if(window.AutoVocabDict){
                var hf=window.AutoVocabDict.find(function(e){return e.base===word;});
                if(hf){
                    html+='<div class="suggest-item" onclick="selectSuggestHand(\''+hf.meaning.replace(/'/g,"\\'")+'\',\''+word.replace(/'/g,"\\'")+'\')" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;"><span>✏️ '+hf.meaning+'</span><span style="font-size:0.7em;color:#10b981;white-space:nowrap;">Thủ công</span></div>';
                }
            }
            // 2. KRDict
            var full=_findInFullDict(word);
            if(full){
                var senses=full.s||[{m:full.m,d:full.d}];
                var seen={};if(hf)seen[hf.meaning]=true;
                for(var i=0;i<senses.length;i++){
                    var m=senses[i].m||'';
                    if(!m||seen[m])continue;
                    seen[m]=true;
                    html+='<div class="suggest-item" onclick="selectSuggest(\''+m.replace(/'/g,"\\'")+'\',\'ko\',\''+word.replace(/'/g,"\\'")+'\','+i+')" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;"><span>📚 '+m+'</span><span style="font-size:0.7em;color:#94a3b8;white-space:nowrap;">NGHĨA '+(i+1)+'</span></div>';
                }
            }
            if(html){suggestBox.innerHTML=html;suggestBox.style.display='block';return;}
        }
        // Fallback to Google Translate
        try {
            const res = await fetch(`https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}&q=${encodeURIComponent(word)}`);
            const data = await res.json();
            let translated = '';
            if (Array.isArray(data)) translated = typeof data[0] === 'string' ? data[0] : (Array.isArray(data[0]) ? data[0][0] : '');
            else if (typeof data === 'string') translated = data;
            if (translated && translated.toLowerCase() !== word.toLowerCase()) {
                suggestBox.innerHTML = `<div class="suggest-item" onclick="selectSuggest('${translated.replace(/'/g,"\\'")}','${sl}')">✨ ${translated}</div>`;
                suggestBox.style.display = 'block';
            }
        } catch(e) {}
    }, 500);
}
function selectSuggest(text, sl, krdictWord, senseIdx) {
    if (sl==='vi') { document.getElementById('newVnMean').value = document.getElementById('newKrWord').value; document.getElementById('newKrWord').value = text; }
    else {
        document.getElementById('newVnMean').value = text;
        // Store KRDict sense if available
        if(krdictWord&&senseIdx!==undefined){
            var full=_findInFullDict(krdictWord);
            if(full){
                var senses=full.s||[{m:full.m,d:full.d,x:full.x}];
                var sense=senses[senseIdx];
                window._pendingVocabEnrichment={
                    source:'krdict',
                    definition:sense.d||full.d||'',
                    exKr:sense.x&&sense.x.length?(typeof sense.x[0]==='string'?sense.x[0]:(sense.x[0].ko||'')):'',
                    pos:full.t||''
                };
                document.getElementById('suggestBox').style.display = 'none';
                return;
            }
        }
    }
    window._pendingVocabEnrichment=null;
    document.getElementById('suggestBox').style.display = 'none';
}
function selectSuggestHand(text, word){
    document.getElementById('newVnMean').value = text;
    if(window.AutoVocabDict){
        var hf=window.AutoVocabDict.find(function(e){return e.base===word;});
        if(hf){
            window._pendingVocabEnrichment={
                source:'hand',
                definition:'',
                exKr:hf.examples&&hf.examples.length?hf.examples[0]:'',
                pos:''
            };
        }
    }
    document.getElementById('suggestBox').style.display = 'none';
}
document.addEventListener('click', (e) => { if (!e.target.closest('#suggestBox') && e.target.id !== 'newKrWord') { let b = document.getElementById('suggestBox'); if (b) b.style.display = 'none'; } });
document.addEventListener('DOMContentLoaded', () => {
    const vnInput = document.getElementById('newVnMean');
    if (vnInput) {
        vnInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') addWordToList();
        });
    }
});

async function _translateKoVi(text){
    if(!text)return'';
    try{
        var resp=await fetch('https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=ko&tl=vi&q='+encodeURIComponent(text));
        var data=await resp.json();
        if(typeof data==='string')return data;
        if(Array.isArray(data))return data.map(function(seg){return Array.isArray(seg)?(seg[0]||''):(typeof seg==='string'?seg:'');}).join('');
        return '';
    }catch(_){return'';}
}

async function addWordToList() {
    if (window.currentSharedFolderId && typeof window.addWordToCurrentSharedLesson === 'function') {
        return window.addWordToCurrentSharedLesson();
    }
    let kr = document.getElementById('newKrWord').value.trim(), vn = document.getElementById('newVnMean').value.trim();
    if (!kr || !vn) return Swal.fire("Nhắc nhở", "Vui lòng nhập đủ từ và nghĩa!", "info");
    let maxOrder = currentStudyList.length > 0 ? Math.max(...currentStudyList.map(v => v.order||0)) + 1 : 0;
    const safeId = (currentListView||'').replace(/[/\s]/g,'_') + '_' + kr;
    // Show loading
    var btn=document.querySelector('#addWordSection button');
    if(btn){btn.disabled=true;btn.textContent='Đang thêm...';}
    try {
        var enrichment = await enrichWordData(kr, vn);
        await firebase.firestore().collection("users").doc(window.currentUserUid).collection("vocabulary").doc(safeId).set({
            word: kr, meaning: vn, listName: currentListView, status: 0, order: maxOrder,
            ex_kr: enrichment.ex_kr || '', ex_vn: enrichment.ex_vn || '',
            definition: enrichment.definition || '',
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        window._pendingVocabEnrichment=null;
        document.getElementById('newKrWord').value = ''; document.getElementById('newVnMean').value = '';
        document.getElementById('newKrWord').focus(); document.getElementById('suggestBox').style.display = 'none';
    } catch(err) { Swal.fire("Lỗi", err.message, "error"); }
    if(btn){btn.disabled=false;btn.textContent='Thêm từ';}
}

// ── Enrich word data (used by both single add and bulk import) ──
async function enrichWordData(word, meaning){
    var result={ex_kr:'',ex_vn:'',definition:''};
    // 0. Use stored sense from suggestion click
    if(window._pendingVocabEnrichment){
        var se=window._pendingVocabEnrichment;
        result.definition=se.definition||'';
        result.ex_kr=se.exKr||'';
        if(result.ex_kr)result.ex_vn=await _translateKoVi(result.ex_kr);
        return result;
    }
    // 1. VOCAB_DATA
    if(window.VOCAB_DATA){
        var m=window.VOCAB_DATA.find(function(v){return v.word===word;});
        if(m&&m.ex_kr){result.ex_kr=m.ex_kr;result.ex_vn=m.ex_vn||'';return result;}
    }
    // 2. Hand-edited dict
    if(window.AutoVocabDict){
        var f=window.AutoVocabDict.find(function(e){return e.base===word;});
        if(f&&f.examples&&f.examples.length){result.ex_kr=f.examples[0];result.ex_vn=await _translateKoVi(result.ex_kr);return result;}
    }
    // 3. KRDict full dict — match by meaning
    var sense=_findBestSense(word,meaning);
    if(sense){
        if(sense.d)result.definition=sense.d;
        if(sense.x&&sense.x.length){
            result.ex_kr=typeof sense.x[0]==='string'?sense.x[0]:(sense.x[0].ko||'');
            if(result.ex_kr)result.ex_vn=await _translateKoVi(result.ex_kr);
        }
    }
    return result;
}
window.enrichWordData = enrichWordData;

// ==================== GAME MODALS ====================
function getExampleForWord(word) {
    // 1. VOCAB_DATA (hardcoded 200 words with ex_kr+ex_vn)
    if (window.VOCAB_DATA) {
        const m = window.VOCAB_DATA.find(v => v.word === word);
        if (m && m.ex_kr) return { ex_kr: m.ex_kr, ex_vn: m.ex_vn };
    }
    // 2. Hand-edited dictionary
    if (window.AutoVocabDict) {
        var f = window.AutoVocabDict.find(function(e){return e.base===word;});
        if (f && f.examples && f.examples.length) return { ex_kr: f.examples[0], ex_vn: '' };
    }
    // 3. KRDict full dictionary
    var full = _findInFullDict(word);
    if (full) {
        var example = '';
        if (full.x && full.x.length) example = typeof full.x[0]==='string' ? full.x[0] : (full.x[0].ko||'');
        else if (full.s && full.s[0] && full.s[0].x && full.s[0].x.length)
            example = typeof full.s[0].x[0]==='string' ? full.s[0].x[0] : (full.s[0].x[0].ko||'');
        if (example) return { ex_kr: example, ex_vn: '' };
    }
    return {};
}

// (Game engine đã được tách sang assets/js/vocab-game.js — dùng chung với trang Đọc báo)
