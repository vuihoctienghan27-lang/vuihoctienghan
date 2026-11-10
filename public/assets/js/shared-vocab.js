/* ==========================================================================
   SHARED-VOCAB.JS — Quản lý Thư mục Lớp học 1:1 theo Key Code
   - Admin (vuihoctienghan2027@gmail.com): Tạo thư mục có Key Code, tạo bài học, thêm/sửa/xóa từ.
   - Học viên: Nhập Key Code qua icon Chìa khóa nổi (góc trái dưới), mở khóa thư mục.
   - Đồng bộ Realtime (Firestore onSnapshot).
   - Tiến độ học của từng học viên được lưu độc lập trong users/{uid}/shared_progress.
   ========================================================================== */

(function () {
    const TEACHER_EMAIL = 'vuihoctienghan27@gmail.com';

    // Helper: kiểm tra có phải trang vocab.html hay không
    function isVocabPage() {
        const p = window.location.pathname.toLowerCase();
        return p.includes('vocab.html') || p.endsWith('/vocab') || p.endsWith('/vocab/');
    }

    // State
    window.currentSharedFolderId = null;
    window.currentSharedFolderData = null;
    window.currentSharedLesson = null;
    window.currentSharedWords = [];
    window.currentSharedGrammar = [];
    window.studentProgressMap = {}; // docId -> status (0..3)

    let _teacherFolders = [];
    let _studentFolders = [];
    let _sharedFoldersUnsub = null;
    let _sharedWordsUnsub = null;
    let _sharedGrammarUnsub = null;
    let _sharedExerciseUnsub = null;
    let _studentSubmissionUnsub = null;
    let _teacherSubmissionsUnsub = null;
    let _teacherQuizAttemptsUnsub = null; // tiến độ bài tập tương tác (giáo viên)
    let _studentProgressUnsub = null;
    window.currentSharedExercise = null;
    window.currentSharedExerciseId = null;
    let _savedGradingRange = null;

    // Helper: Check admin teacher
    function isTeacher() {
        const u = (window.auth && window.auth.currentUser) ||
                  (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
        return !!(u && u.email && u.email.toLowerCase() === TEACHER_EMAIL.toLowerCase());
    }
    window.isTeacherAdmin = isTeacher;

    // Helper: copy to clipboard
    function copyText(text, msg) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Đã sao chép!',
                        text: msg || `Mã "${text}" đã được sao chép vào bộ nhớ đệm.`,
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            });
        } else {
            prompt("Sao chép mã này:", text);
        }
    }
    window.copyKeyCode = copyText;

    // =========================================================================
    // 1. FLOATING KEY BUTTON (Góc trái phía dưới màn hình - Chỉ hiện ở vocab.html)
    // =========================================================================
    // Cập nhật ẩn/hiện icon chìa khóa và icon sổ tay nháp bài học
    window.updateFloatingKeyVisibility = function () {
        const btn = document.getElementById('floatingKeyBtn');
        const noteBtn = document.getElementById('floatingNoteBookBtn');
        if (!isVocabPage()) {
            if (btn) btn.style.display = 'none';
            if (noteBtn) noteBtn.style.display = 'none';
            return;
        }
        const inShared = !!(window.currentSharedFolderId || window.currentSharedLesson);
        const inFolder = !!(typeof currentFolderName !== 'undefined' && currentFolderName);
        const inLesson = !!(typeof currentListView !== 'undefined' && currentListView);
        const detailView = document.getElementById('vocabDetailView');
        const inDetail = detailView && detailView.style.display !== 'none';

        if (inShared || inFolder || inLesson || inDetail) {
            if (btn) btn.style.display = 'none';
            if (noteBtn) {
                noteBtn.style.display = 'flex';
                noteBtn.style.bottom = '26px';
            }
        } else {
            if (btn) btn.style.display = 'flex';
            if (noteBtn) {
                noteBtn.style.display = 'flex';
                noteBtn.style.bottom = '88px';
            }
        }
    };

    function injectFloatingKeyButton() {
        if (!isVocabPage()) return;
        if (document.getElementById('floatingKeyBtn')) return;

        // CSS
        const style = document.createElement('style');
        style.id = 'floatingKeyStyle';
        style.textContent = `
            .floating-key-btn {
                position: fixed;
                bottom: 26px;
                left: 26px;
                z-index: 99995;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: #ffffff;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 25px rgba(217, 119, 6, 0.45), 0 2px 6px rgba(0, 0, 0, 0.15);
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                border: 2px solid rgba(255, 255, 255, 0.6);
                user-select: none;
            }
            .floating-key-btn:hover {
                transform: scale(1.1) translateY(-3px);
                box-shadow: 0 14px 30px rgba(217, 119, 6, 0.6);
            }
            .floating-key-btn:active {
                transform: scale(0.95);
            }
            .floating-key-btn .key-icon {
                font-size: 24px;
                line-height: 1;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
                animation: keyPulseWiggle 4.5s ease-in-out infinite;
            }
            .floating-key-btn .key-tooltip {
                position: absolute;
                left: 64px;
                background: rgba(15, 23, 42, 0.9);
                color: #ffffff;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 0.82em;
                font-weight: 600;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transform: translateX(-10px);
                transition: all 0.25s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border: 1px solid rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                font-family: 'Pretendard', 'Inter', sans-serif;
            }
            .floating-key-btn:hover .key-tooltip {
                opacity: 1;
                transform: translateX(0);
            }
            @keyframes keyPulseWiggle {
                0%, 80%, 100% { transform: rotate(0deg) scale(1); }
                84% { transform: rotate(-18deg) scale(1.15); }
                88% { transform: rotate(18deg) scale(1.15); }
                92% { transform: rotate(-12deg) scale(1.08); }
                96% { transform: rotate(10deg) scale(1.05); }
            }
            .floating-note-btn {
                position: fixed;
                bottom: 88px;
                left: 26px;
                z-index: 99994;
                background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
                color: #ffffff;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 25px rgba(79, 70, 229, 0.45), 0 2px 6px rgba(0, 0, 0, 0.15);
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                border: 2px solid rgba(255, 255, 255, 0.7);
                user-select: none;
            }
            .floating-note-btn:hover {
                transform: scale(1.1) translateY(-3px);
                box-shadow: 0 14px 30px rgba(79, 70, 229, 0.6);
            }
            .floating-note-btn:active {
                transform: scale(0.95);
            }
            .floating-note-btn .note-icon {
                font-size: 24px;
                line-height: 1;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
                animation: keyPulseWiggle 5s ease-in-out infinite 0.5s;
            }
            .floating-note-btn .note-tooltip {
                position: absolute;
                left: 64px;
                background: rgba(15, 23, 42, 0.92);
                color: #ffffff;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 0.82em;
                font-weight: 700;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transform: translateX(-10px);
                transition: all 0.25s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border: 1px solid rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                font-family: 'Pretendard', 'Inter', sans-serif;
            }
            .floating-note-btn:hover .note-tooltip {
                opacity: 1;
                transform: translateX(0);
            }
            @media (max-width: 600px) {
                .floating-key-btn {
                    bottom: 18px;
                    left: 16px;
                    width: 48px;
                    height: 48px;
                }
                .floating-key-btn .key-icon {
                    font-size: 22px;
                }
                .floating-key-btn .key-tooltip {
                    display: none;
                }
                .floating-note-btn {
                    bottom: 74px;
                    left: 16px;
                    width: 48px;
                    height: 48px;
                }
                .floating-note-btn .note-icon {
                    font-size: 22px;
                }
                .floating-note-btn .note-tooltip {
                    display: none;
                }
            }
            /* Shared card badge & styles */
            .shared-badge-teacher {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                color: #92400e;
                font-size: 0.75em;
                font-weight: 800;
                padding: 3px 8px;
                border-radius: 6px;
                border: 1px solid #f59e0b;
                margin-top: 4px;
            }
            .shared-badge-code {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: rgba(59, 130, 246, 0.1);
                color: #1d4ed8;
                font-size: 0.78em;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 6px;
                cursor: pointer;
                transition: 0.2s;
            }
            .shared-badge-code:hover {
                background: rgba(59, 130, 246, 0.2);
            }
            .shared-section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 25px 0 12px 0;
                padding-bottom: 8px;
                border-bottom: 2px solid rgba(245, 158, 11, 0.35);
            }
            .shared-section-title {
                margin: 0;
                font-size: 1.2em;
                font-weight: 800;
                color: #92400e;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            body.dark-mode .shared-section-title {
                color: #fbbf24;
            }

            /* SweetAlert2 Key Code Popup styling (Fix mobile alignment & width) */
            .swal2-key-code-popup {
                border-radius: 20px !important;
                box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25) !important;
                box-sizing: border-box !important;
                max-width: 92vw !important;
                padding: 24px 18px 20px 18px !important;
            }
            .swal2-key-code-popup .swal2-html-container {
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
            }
            .swal2-key-code-popup .swal2-actions {
                margin-top: 18px !important;
                gap: 10px !important;
                width: 100% !important;
                justify-content: center !important;
                display: flex !important;
            }
            .swal2-key-code-popup .swal2-actions button {
                border-radius: 10px !important;
                font-weight: 700 !important;
                padding: 11px 22px !important;
                font-size: 0.95em !important;
                margin: 0 !important;
            }
            @media (max-width: 480px) {
                .swal2-key-code-popup {
                    width: 92vw !important;
                    padding: 20px 14px 16px 14px !important;
                }
                .swal2-key-code-popup .swal2-actions {
                    display: flex !important;
                    flex-direction: row !important;
                    gap: 8px !important;
                    width: 100% !important;
                }
                .swal2-key-code-popup .swal2-actions button {
                    flex: 1 1 50% !important;
                    padding: 11px 6px !important;
                    font-size: 0.9em !important;
                    min-width: 0 !important;
                }
            }
        `;
        document.head.appendChild(style);

        // HTML: Nút Chìa khóa & Nút Sổ tay nháp bài học
        const btn = document.createElement('div');
        btn.id = 'floatingKeyBtn';
        btn.className = 'floating-key-btn';
        btn.innerHTML = `
            <div class="key-icon">🔑</div>
            <div class="key-tooltip">Nhập Key Code bài học</div>
        `;
        btn.onclick = () => window.openKeyCodeModal();
        document.body.appendChild(btn);

        const noteBtn = document.createElement('div');
        noteBtn.id = 'floatingNoteBookBtn';
        noteBtn.className = 'floating-note-btn';
        noteBtn.innerHTML = `
            <div class="note-icon">📖</div>
            <div class="note-tooltip">📖 Sổ tay nháp bài học</div>
        `;
        noteBtn.onclick = () => window.openLessonNotesModal();
        document.body.appendChild(noteBtn);

        // Theo dõi thay đổi view để tự động ẩn/hiện icon chìa khóa
        try {
            const detailView = document.getElementById('vocabDetailView');
            if (detailView && window.MutationObserver) {
                new MutationObserver(() => window.updateFloatingKeyVisibility())
                    .observe(detailView, { attributes: true, attributeFilter: ['style'] });
            }
            const setsView = document.getElementById('vocabSetsView');
            if (setsView && window.MutationObserver) {
                new MutationObserver(() => window.updateFloatingKeyVisibility())
                    .observe(setsView, { attributes: true, attributeFilter: ['style'] });
            }
        } catch (e) {}

        window.updateFloatingKeyVisibility();
    }

    // =========================================================================
    // 2. MODAL NHẬP KEY CODE & QUẢN LÝ CHO ADMIN
    // =========================================================================
    window.openKeyCodeModal = async function () {
        const auth = (window.auth) || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth());
        const user = auth ? auth.currentUser : null;

        if (!user) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    width: 'min(420px, 92vw)',
                    customClass: { popup: 'swal2-key-code-popup' },
                    title: '🔑 Mã Truy Cập Bài Học',
                    html: `
                        <p style="font-size:0.95em;color:#64748b;line-height:1.6;margin-bottom:15px;">
                            Vui lòng <b>đăng nhập Google</b> để lưu các thư mục bài học giáo viên cấp vào tài khoản của bạn!
                        </p>
                    `,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'Đăng nhập ngay',
                    cancelButtonText: 'Đóng',
                    confirmButtonColor: '#2563eb'
                }).then((r) => {
                    if (r.isConfirmed) {
                        const googleAuthBtn = document.getElementById('googleAuthBtn');
                        const authModal = document.getElementById('authModal');
                        if (authModal) authModal.style.display = 'flex';
                        else if (googleAuthBtn) googleAuthBtn.click();
                        else if (typeof window.handleAvatarClick === 'function') window.handleAvatarClick();
                    }
                });
            } else {
                alert("Vui lòng đăng nhập Google để nhập Key Code!");
            }
            return;
        }

        // Nếu là ADMIN (Thầy/Cô)
        if (isTeacher()) {
            const { value: action } = await Swal.fire({
                width: 'min(420px, 92vw)',
                customClass: { popup: 'swal2-key-code-popup' },
                title: '🎓 Quản Trị Lớp Học 1:1',
                html: `
                    <p style="font-size:0.95em;color:#475569;margin-bottom:15px;">
                        Chào <b>${user.email}</b>! Bạn đang ở quyền Giáo viên/Admin.
                    </p>
                    <div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
                        <button id="adminBtnCreate" class="swal2-confirm swal2-styled" style="background:#f59e0b;margin:0;width:100%;">+ Tạo Thư mục 1:1 có Key Code</button>
                        <button id="adminBtnManage" class="swal2-confirm swal2-styled" style="background:#2563eb;margin:0;width:100%;">📂 Vào Sổ Từ Vựng Quản Lý</button>
                        <button id="adminBtnTest" class="swal2-cancel swal2-styled" style="background:#64748b;margin:0;width:100%;">🔑 Nhập thử mã học viên (Test)</button>
                    </div>
                `,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Đóng',
                didOpen: () => {
                    const c = document.getElementById('adminBtnCreate');
                    const m = document.getElementById('adminBtnManage');
                    const t = document.getElementById('adminBtnTest');
                    if (c) c.onclick = () => { Swal.close(); window.createTeacherSharedFolder(); };
                    if (m) m.onclick = () => { Swal.close(); window.location.href = 'vocab.html?tab=folders'; };
                    if (t) t.onclick = () => { Swal.close(); showStudentInputPrompt(user); };
                }
            });
            return;
        }

        // Nếu là HỌC VIÊN
        showStudentInputPrompt(user);
    };

    // Prompt cho học viên nhập Key Code (Đã tối ưu chuẩn cho điện thoại)
    async function showStudentInputPrompt(user) {
        const { value: code } = await Swal.fire({
            width: 'min(420px, 92vw)',
            customClass: {
                popup: 'swal2-key-code-popup'
            },
            html: `
                <div style="text-align:center;">
                    <div style="font-size:3em;line-height:1;margin-bottom:8px;">🔑</div>
                    <h3 style="margin:0 0 8px 0;font-size:1.25em;color:#1e293b;font-weight:800;">Nhập Key Code Bài Học</h3>
                    <p style="font-size:0.88em;color:#64748b;line-height:1.5;margin:0 0 16px 0;">
                        Nhập mã bảo mật do <b>Giáo viên</b> cấp để mở khóa thư mục và toàn bộ bài học tương ứng:
                    </p>
                    <div style="width:100%;box-sizing:border-box;">
                        <input id="swalKeyCodeInput" type="text" placeholder="VÍ DỤ: LAN-TOPIK2" 
                               style="width:100%;box-sizing:border-box;margin:0;padding:12px 14px;border:2px solid #f59e0b;border-radius:12px;font-size:1.15em;font-weight:800;letter-spacing:2px;text-align:center;text-transform:uppercase;color:#b45309;background:#fffbeb;outline:none;transition:border-color 0.2s, box-shadow 0.2s;box-shadow:0 2px 8px rgba(245,158,11,0.12);" 
                               autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false">
                    </div>
                    <div style="font-size:0.78em;color:#94a3b8;margin-top:8px;">💡 Bấm "Mở khóa" hoặc nhấn Enter để kích hoạt</div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Mở khóa 🔓',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#f59e0b',
            didOpen: () => {
                const inp = document.getElementById('swalKeyCodeInput');
                if (inp) {
                    inp.focus();
                    inp.addEventListener('keyup', (e) => {
                        if (e.key === 'Enter') {
                            const btn = Swal.getConfirmButton();
                            if (btn) btn.click();
                        }
                    });
                }
            },
            preConfirm: () => {
                const inp = document.getElementById('swalKeyCodeInput');
                const val = (inp ? inp.value : '').trim().toUpperCase();
                if (!val) {
                    Swal.showValidationMessage('Vui lòng nhập mã Key Code!');
                    return false;
                }
                return val;
            }
        });

        if (!code) return;

        // Tiến hành xác thực mã
        Swal.fire({
            title: 'Đang kiểm tra...',
            text: `Đang tra cứu mã "${code}" trên hệ thống...`,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const db = firebase.firestore();
            const snap = await db.collection("shared_folders").where("keyCode", "==", code).get();

            if (snap.empty) {
                Swal.fire({
                    icon: 'error',
                    title: 'Mã không đúng',
                    text: `Không tìm thấy thư mục nào có mã "${code}". Vui lòng kiểm tra lại với Giáo viên!`,
                    confirmButtonColor: '#ef4444'
                });
                return;
            }

            const folderDoc = snap.docs[0];
            const folderData = folderDoc.data();
            const folderId = folderDoc.id;

            // Kiểm tra xem học viên đã mở khóa thư mục này chưa
            const userRef = db.collection("users").doc(user.uid);
            const userSnap = await userRef.get();
            const unlockedList = (userSnap.exists && userSnap.data().unlockedSharedFolders) || [];

            if (unlockedList.includes(folderId)) {
                Swal.fire({
                    icon: 'info',
                    title: 'Đã mở khóa trước đó',
                    html: `Bạn đã mở khóa thư mục <b>"${folderData.name}"</b> trước đó rồi!<br>Thư mục đang sẵn sàng trong Sổ từ vựng của bạn.`,
                    confirmButtonText: 'Vào học ngay',
                    confirmButtonColor: '#2563eb'
                }).then(() => {
                    if (window.location.pathname.includes('vocab.html')) {
                        if (typeof window.openSharedFolder === 'function') {
                            window.openSharedFolder(folderId);
                        }
                    } else {
                        window.location.href = 'vocab.html?tab=folders';
                    }
                });
                return;
            }

            // Ghi nhận mở khóa vào user
            await userRef.set({
                unlockedSharedFolders: firebase.firestore.FieldValue.arrayUnion(folderId)
            }, { merge: true });

            // Ghi nhận học viên tham gia vào subcollection students của thư mục chia sẻ
            try {
                await db.collection("shared_folders").doc(folderId).collection("students").doc(user.uid).set({
                    uid: user.uid,
                    email: user.email || '',
                    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Học viên'),
                    photoURL: user.photoURL || '',
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (errStudents) {
                console.warn("Không thể ghi danh học viên:", errStudents);
            }

            // Bắn pháo hoa 🎉
            if (typeof confetti === 'function') {
                try {
                    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                    setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } }), 300);
                } catch (_) {}
            }

            Swal.fire({
                icon: 'success',
                title: '🎉 Mở khóa thành công!',
                html: `
                    Đã mở khóa thư mục: <b style="color:#1e40af;font-size:1.1em;">"${folderData.name}"</b><br>
                    Toàn bộ bài học và từ vựng của Giáo viên đã được thêm vào Sổ từ vựng của bạn!
                `,
                confirmButtonText: 'Vào học ngay 📖',
                confirmButtonColor: '#10b981'
            }).then(() => {
                if (window.location.pathname.includes('vocab.html')) {
                    if (typeof window.switchVocabTab === 'function') {
                        window.switchVocabTab('folders');
                    }
                    if (typeof window.openSharedFolder === 'function') {
                        window.openSharedFolder(folderId);
                    } else {
                        window.location.reload();
                    }
                } else {
                    window.location.href = 'vocab.html?tab=folders';
                }
            });

        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi',
                text: err.message,
                confirmButtonColor: '#ef4444'
            });
        }
    }

    // =========================================================================
    // 3. ADMIN OPERATIONS (Tạo, Sửa, Xóa Thư mục & Bài học)
    // =========================================================================


    // =========================================================================
    // NÂNG CẤP HỌC 1:1 (CLONE THƯ MỤC, COPY/MOVE BÀI HỌC, THƯ MỤC PHÂN CẤP)
    // =========================================================================

    window.currentSharedSubFolder = null;

    // Quản lý Tab hiển thị ở cấp Thư mục mẹ ('folders': Thư mục con, 'lessons': Bài học độc lập)
    window.currentSharedFolderTab = 'folders';

    window.switchSharedFolderTab = function (tabName) {
        window.currentSharedFolderTab = tabName;
        if (window.currentSharedFolderId) {
            // Dùng data mới nhất từ cache (_teacherFolders đã được openSharedFolder cập nhật)
            const freshFolder = (_teacherFolders.concat(_studentFolders)).find(f => f.id === window.currentSharedFolderId);
            const folderToUse = freshFolder || window.currentSharedFolderData;
            if (folderToUse) renderSharedSubLessonsGrid(folderToUse);
        }
    };

    // Mở một Thư mục con / Giai đoạn
    window.openSharedSubFolder = function (subName, folderId) {
        window.currentSharedSubFolder = subName || null;
        const fid = folderId || window.currentSharedFolderId;
        if (fid) {
            window.openSharedFolder(fid);
        }
    };

    // 1. Tạo bản sao Thư mục Giảng dạy 1:1 (Clone toàn bộ bài học, từ vựng, ngữ pháp, bài tập)
    window.duplicateTeacherSharedFolder = async function (folderId, folderName, e) {
        if (e) e.stopPropagation();
        if (!isTeacher()) return;

        const folder = _teacherFolders.find(f => f.id === folderId);
        if (!folder) return;

        const defaultNewName = folder.name + ' (Bản sao)';
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const defaultCode = ((folder.keyCode || 'CLASS').substring(0, 10)) + '-' + randomSuffix;

        const { value: formValues } = await Swal.fire({
            width: 'min(440px, 92vw)',
            customClass: { popup: 'swal2-key-code-popup' },
            title: '📋 Nhân Bản Thư Mục 1:1',
            html: `
                <div style="text-align:left;font-size:0.88em;color:#475569;margin-bottom:6px;font-weight:700;">Tên Thư mục mới:</div>
                <input id="swalCloneFolderName" class="swal2-input" value="${escapeHtml(defaultNewName)}" style="width:100%;box-sizing:border-box;margin:0 0 12px 0;">
                
                <div style="text-align:left;font-size:0.88em;color:#475569;margin-bottom:6px;font-weight:700;">Mã Key Code mới (cho học viên mới):</div>
                <input id="swalCloneFolderCode" class="swal2-input" value="${defaultCode}" 
                       style="width:100%;box-sizing:border-box;margin:0;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#1e40af;">
                <div style="font-size:0.8em;color:#64748b;margin-top:6px;text-align:left;line-height:1.4;">
                    💡 Hệ thống sẽ sao chép toàn bộ các giai đoạn, bài học, từ vựng, ngữ pháp và bài tập sang thư mục mới mà không ảnh hưởng học viên cũ.
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Tạo bản sao',
            confirmButtonColor: '#f59e0b',
            cancelButtonText: 'Hủy',
            preConfirm: () => {
                const name = (document.getElementById('swalCloneFolderName').value || '').trim();
                let code = (document.getElementById('swalCloneFolderCode').value || '').trim().toUpperCase().replace(/\s+/g, '-');
                if (!name) { Swal.showValidationMessage('Vui lòng nhập tên thư mục!'); return false; }
                if (!code || code.length < 3) { Swal.showValidationMessage('Mã Key Code phải có ít nhất 3 ký tự!'); return false; }
                return { name, code };
            }
        });

        if (!formValues) return;

        Swal.fire({
            title: 'Đang tạo bản sao...',
            text: 'Đang sao chép toàn bộ nội dung giáo trình...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const db = firebase.firestore();

            // Kiểm tra trùng mã
            const dupCheck = await db.collection("shared_folders").where("keyCode", "==", formValues.code).get();
            if (!dupCheck.empty) {
                Swal.fire("Lỗi trùng mã", `Mã Key Code "${formValues.code}" đã được sử dụng. Vui lòng chọn mã khác!`, "error");
                return;
            }

            const newFolderId = 'sf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            console.log('[CLONE] Bắt đầu clone', folderId, '→', newFolderId);

            // 1. Tạo document thư mục mới
            await db.collection("shared_folders").doc(newFolderId).set({
                name: formValues.name,
                keyCode: formValues.code,
                ownerEmail: TEACHER_EMAIL,
                ownerUid: window.currentUserUid || '',
                lessons: folder.lessons || [],
                subFolders: folder.subFolders || [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('[CLONE] 1/4 Tạo folder mới OK. Lessons:', (folder.lessons || []).length);

            // 2. Sao chép subcollection words
            const wordsSnap = await db.collection("shared_folders").doc(folderId).collection("words").get();
            console.log('[CLONE] 2/4 Words từ folder gốc:', wordsSnap.size, 'docs');
            if (!wordsSnap.empty) {
                let batch = db.batch();
                let count = 0;
                for (const doc of wordsSnap.docs) {
                    const data = doc.data();
                    const newWordRef = db.collection("shared_folders").doc(newFolderId).collection("words").doc(doc.id);
                    batch.set(newWordRef, data);
                    count++;
                    if (count % 400 === 0) {
                        await batch.commit();
                        batch = db.batch();
                    }
                }
                if (count % 400 !== 0) await batch.commit();
                console.log('[CLONE] 2/4 Words đã copy:', count);
            }

            // 3. Sao chép subcollection grammar
            const grammarSnap = await db.collection("shared_folders").doc(folderId).collection("grammar").get();
            console.log('[CLONE] 3/4 Grammar từ folder gốc:', grammarSnap.size, 'docs');
            if (!grammarSnap.empty) {
                let batch = db.batch();
                let count = 0;
                for (const doc of grammarSnap.docs) {
                    const data = doc.data();
                    const newGrammarRef = db.collection("shared_folders").doc(newFolderId).collection("grammar").doc(doc.id);
                    batch.set(newGrammarRef, data);
                    count++;
                    if (count % 400 === 0) {
                        await batch.commit();
                        batch = db.batch();
                    }
                }
                if (count % 400 !== 0) await batch.commit();
                console.log('[CLONE] 3/4 Grammar đã copy:', count);
            }

            // 4. Sao chép subcollection exercises (chỉ copy đề bài, không copy submissions)
            const exercisesSnap = await db.collection("shared_folders").doc(folderId).collection("exercises").get();
            console.log('[CLONE] 4/4 Exercises từ folder gốc:', exercisesSnap.size, 'docs');
            if (!exercisesSnap.empty) {
                let batch = db.batch();
                let count = 0;
                for (const doc of exercisesSnap.docs) {
                    const data = doc.data();
                    // Chỉ skip doc con submissions (nếu có) - copy toàn bộ fields của đề bài
                    const newExRef = db.collection("shared_folders").doc(newFolderId).collection("exercises").doc(doc.id);
                    batch.set(newExRef, {
                        ...data,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    count++;
                    if (count % 400 === 0) {
                        await batch.commit();
                        batch = db.batch();
                    }
                }
                if (count % 400 !== 0) await batch.commit();
                console.log('[CLONE] 4/4 Exercises đã copy:', count);
            }

            console.log('[CLONE] ✅ Hoàn tất! FolderId mới:', newFolderId);

            // Thêm ngay thư mục mới vào bộ nhớ cache để giao diện thấy ngay mà không phụ thuộc onSnapshot
            const newFolderObj = {
                id: newFolderId,
                name: formValues.name,
                keyCode: formValues.code,
                ownerEmail: TEACHER_EMAIL,
                ownerUid: window.currentUserUid || '',
                lessons: [...(folder.lessons || [])],
                subFolders: [...(folder.subFolders || [])],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const exIdx = _teacherFolders.findIndex(f => f.id === newFolderId);
            if (exIdx !== -1) {
                _teacherFolders[exIdx] = newFolderObj;
            } else {
                _teacherFolders.unshift(newFolderObj);
            }
            if (typeof window.renderSharedFoldersGrid === 'function' && document.getElementById('listsGrid')) {
                window.renderSharedFoldersGrid();
            }

            Swal.close();
            Swal.fire({
                icon: 'success',
                title: '🎉 Nhân bản thành công!',
                html: `
                    Đã tạo thư mục: <b>"${escapeHtml(formValues.name)}"</b>!<br>
                    Mã Key Code mới: <b style="color:#d97706;font-size:1.2em;">${formValues.code}</b><br><br>
                    <button class="swal2-confirm swal2-styled" style="background:#2563eb;padding:8px 16px;font-size:0.9em;" 
                            onclick="copyKeyCode('${formValues.code}')">📋 Sao chép mã gửi học viên</button>
                `,
                confirmButtonText: 'Đóng',
                confirmButtonColor: '#64748b'
            });

        } catch (err) {
            Swal.close();
            console.error("[CLONE] ❌ Lỗi:", err);
            let errMsg = err.message || "Không thể nhân bản thư mục!";
            if (err.code === 'resource-exhausted' || (errMsg && errMsg.includes('Quota exceeded'))) {
                errMsg = "Firestore tạm thời vượt quá giới hạn lượt truy cập trong ngày (Quota exceeded). Vui lòng thử lại sau!";
            }
            Swal.fire("Lỗi", errMsg, "error");
        }
    };

    // 2. Sao chép hoặc Di chuyển Bài học sang Thư mục khác
    window.copyOrMoveSharedLessonDialog = async function (fromFolderId, lessonName, isMove, e) {
        if (e) e.stopPropagation();
        if (!isTeacher()) return;

        const actionText = isMove ? "Di chuyển" : "Sao chép";
        const iconAction = isMove ? "📦" : "📋";

        const fromFolder = _teacherFolders.find(f => f.id === fromFolderId);
        if (!fromFolder) return;

        // Xác định vị trí hiện tại của bài học (Thư mục con hay Thư mục mẹ)
        const fromSubFolders = Array.isArray(fromFolder.subFolders) ? fromFolder.subFolders : [];
        const currentSub = fromSubFolders.find(sf => lessonName.startsWith(sf + '/'));
        const cleanLessonName = currentSub ? lessonName.substring(currentSub.length + 1) : lessonName;
        const currentLocLabel = currentSub ? ('📂 Thư mục con: ' + currentSub) : '📁 Thư mục mẹ (Bài học độc lập)';

        // Xây dựng danh sách điểm đến
        let destinationGroupsHtml = '';

        // Nhóm 1: Trong cùng Lớp học này
        let sameFolderOptionsHtml = '';
        if (currentSub) {
            sameFolderOptionsHtml += `<option value="SAME:::ROOT">📁 Thư mục mẹ (Đưa ra làm bài học độc lập)</option>`;
        }
        fromSubFolders.forEach(sf => {
            if (sf !== currentSub) {
                sameFolderOptionsHtml += `<option value="SAME:::SUB:::${escapeHtml(sf)}">📂 Thư mục con: ${escapeHtml(sf)}</option>`;
            }
        });

        if (sameFolderOptionsHtml) {
            destinationGroupsHtml += `<optgroup label="── Trong Lớp: ${escapeHtml(fromFolder.name)} ──">${sameFolderOptionsHtml}</optgroup>`;
        }

        // Nhóm 2: Sang Thư mục Lớp học khác
        const otherFolders = _teacherFolders.filter(f => f.id !== fromFolderId);
        if (otherFolders.length > 0) {
            let otherOptionsHtml = '';
            otherFolders.forEach(of => {
                otherOptionsHtml += `<option value="${of.id}:::ROOT">🎓 ${escapeHtml(of.name)} ➔ 📁 Thư mục mẹ (Độc lập)</option>`;
                const oSubFolders = Array.isArray(of.subFolders) ? of.subFolders : [];
                oSubFolders.forEach(osf => {
                    otherOptionsHtml += `<option value="${of.id}:::SUB:::${escapeHtml(osf)}">🎓 ${escapeHtml(of.name)} ➔ 📂 ${escapeHtml(osf)}</option>`;
                });
            });
            destinationGroupsHtml += `<optgroup label="── Sang Thư mục Lớp học khác ──">${otherOptionsHtml}</optgroup>`;
        }

        if (!destinationGroupsHtml) {
            Swal.fire({
                title: "Chưa có điểm đến",
                html: "Hiện chưa có Thư mục con hoặc Lớp học nào khác để " + actionText.toLowerCase() + ".<br>Bạn có thể tạo thêm <b>Thư mục con</b> hoặc <b>Lớp học mới</b> trước!",
                icon: "info"
            });
            return;
        }

        const { value: formValues } = await Swal.fire({
            width: 'min(460px, 92vw)',
            customClass: { popup: 'swal2-key-code-popup' },
            title: `${iconAction} ${actionText} Bài Học`,
            html: `
                <div style="text-align:left;font-size:0.85em;color:#64748b;margin-bottom:4px;">Bài học:</div>
                <div style="text-align:left;font-weight:800;color:#1e40af;margin-bottom:8px;font-size:1.05em;">📖 ${escapeHtml(cleanLessonName)}</div>
                
                <div style="text-align:left;font-size:0.82em;color:#94a3b8;margin-bottom:14px;background:#f8fafc;padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0;">
                    Vị trí hiện tại: <b style="color:#334155;">${escapeHtml(currentLocLabel)}</b>
                </div>

                <div style="text-align:left;font-size:0.85em;color:#475569;margin-bottom:6px;font-weight:700;">Chọn Đích đến:</div>
                <select id="swalTargetDestination" class="swal2-input" style="width:100%;box-sizing:border-box;margin:0 0 14px 0;padding:8px 12px;font-size:0.9em;border-radius:8px;">
                    ${destinationGroupsHtml}
                </select>

                <div style="text-align:left;font-size:0.85em;color:#475569;margin-bottom:6px;font-weight:700;">Tên Bài học sau khi ${actionText.toLowerCase()}:</div>
                <input id="swalNewLessonName" class="swal2-input" value="${escapeHtml(cleanLessonName)}" style="width:100%;box-sizing:border-box;margin:0 0 8px 0;">
                
                <div style="font-size:0.8em;color:#64748b;text-align:left;line-height:1.4;">
                    ${isMove ? '⚠️ Bài học cùng toàn bộ từ vựng, ngữ pháp, bài tập sẽ được chuyển sang vị trí mới.' : '💡 Toàn bộ từ vựng, ngữ pháp và bài tập sẽ được sao chép nguyên vẹn sang vị trí mới.'}
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: actionText,
            confirmButtonColor: isMove ? '#0284c7' : '#3b82f6',
            cancelButtonText: 'Hủy',
            preConfirm: () => {
                const destVal = document.getElementById('swalTargetDestination').value;
                const newName = (document.getElementById('swalNewLessonName').value || '').trim();
                if (!destVal) { Swal.showValidationMessage('Vui lòng chọn đích đến!'); return false; }
                if (!newName) { Swal.showValidationMessage('Vui lòng nhập tên bài học!'); return false; }
                return { destVal, newName };
            }
        });

        if (!formValues) return;

        Swal.fire({
            title: `Đang ${actionText.toLowerCase()} bài học...`,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const db = firebase.firestore();
            const { destVal, newName } = formValues;

            const cleanNewName = newName.replace(/[\/]/g, '-');
            const [destFolderCode, destLevel, destSub] = destVal.split(':::');
            const isSameFolder = (destFolderCode === 'SAME');
            const toFolderId = isSameFolder ? fromFolderId : destFolderCode;

            // Tính toán tên lưu trữ chính xác của bài học tại đích
            const finalNewLessonName = (destLevel === 'SUB') ? (destSub + '/' + cleanNewName) : cleanNewName;

            if (isSameFolder && finalNewLessonName === lessonName) {
                Swal.fire("Thông báo", "Bài học đã nằm ở vị trí này rồi!", "info");
                return;
            }

            const toFolderDoc = await db.collection("shared_folders").doc(toFolderId).get();
            if (!toFolderDoc.exists) throw new Error("Thư mục đích không tồn tại!");
            const toLessons = toFolderDoc.data().lessons || [];

            if (toLessons.includes(finalNewLessonName)) {
                Swal.fire("Lỗi trùng tên", `Đã tồn tại bài học "${finalNewLessonName}" ở đích đến. Vui lòng đổi tên khác!`, "error");
                return;
            }

            const fromFolderRef = db.collection("shared_folders").doc(fromFolderId);
            const toFolderRef = db.collection("shared_folders").doc(toFolderId);

            // =========================================================================
            // TRƯỜNG HỢP 1: DI CHUYỂN HOẶC SAO CHÉP TRONG CÙNG 1 THƯ MỤC LỚP HỌC
            // (Ví dụ: Từ Thư mục con ra Thư mục mẹ, hoặc từ Mẹ vào Con, hoặc giữa các Con)
            // =========================================================================
            if (isSameFolder) {
                if (isMove) {
                    // Thay thế tên bài trong mảng lessons
                    const updatedLessons = toLessons.map(l => (l === lessonName ? finalNewLessonName : l));
                    await fromFolderRef.update({
                        lessons: updatedLessons,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Cập nhật listName trong words (for...of để đúng await)
                    const wordsSnap = await fromFolderRef.collection("words").where("listName", "==", lessonName).get();
                    if (!wordsSnap.empty) {
                        let batch = db.batch();
                        let c = 0;
                        for (const d of wordsSnap.docs) {
                            batch.update(d.ref, { listName: finalNewLessonName });
                            c++;
                            if (c % 400 === 0) { await batch.commit(); batch = db.batch(); }
                        }
                        if (c % 400 !== 0) await batch.commit();
                    }

                    // Cập nhật listName trong grammar
                    const grammarSnap = await fromFolderRef.collection("grammar").where("listName", "==", lessonName).get();
                    if (!grammarSnap.empty) {
                        let batch = db.batch();
                        let c = 0;
                        for (const d of grammarSnap.docs) {
                            batch.update(d.ref, { listName: finalNewLessonName });
                            c++;
                            if (c % 400 === 0) { await batch.commit(); batch = db.batch(); }
                        }
                        if (c % 400 !== 0) await batch.commit();
                    }

                    // Cập nhật doc raw grammar (nếu có)
                    const safeOldName = lessonName.replace(/[\/\s\.\'":#?&=+]/g, '_');
                    const safeFinalName = finalNewLessonName.replace(/[\/\s\.\'":#?&=+]/g, '_');
                    const oldRawDoc = await fromFolderRef.collection("grammar").doc('raw_' + safeOldName).get();
                    if (oldRawDoc.exists) {
                        await fromFolderRef.collection("grammar").doc('raw_' + safeFinalName).set({
                            ...oldRawDoc.data(),
                            lessonName: finalNewLessonName,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        if (safeOldName !== safeFinalName) {
                            await oldRawDoc.ref.delete();
                        }
                    }

                    // Cập nhật doc exercises (nếu có)
                    const oldExDoc = await fromFolderRef.collection("exercises").doc('ex_' + safeOldName).get();
                    if (oldExDoc.exists) {
                        await fromFolderRef.collection("exercises").doc('ex_' + safeFinalName).set({
                            ...oldExDoc.data(),
                            listName: finalNewLessonName,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        if (safeOldName !== safeFinalName) {
                            await oldExDoc.ref.delete();
                        }
                    }
                } else {
                    // SAO CHÉP TRONG CÙNG THƯ MỤC
                    await fromFolderRef.update({
                        lessons: firebase.firestore.FieldValue.arrayUnion(finalNewLessonName),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Sao chép Words (dùng counter để tránh trùng ID)
                    const wordsSnap = await fromFolderRef.collection("words").where("listName", "==", lessonName).get();
                    if (!wordsSnap.empty) {
                        let batch = db.batch();
                        let c = 0;
                        for (const d of wordsSnap.docs) {
                            const newId = 'w_' + Date.now() + '_' + c + '_' + Math.random().toString(36).substr(2, 5);
                            const newWordRef = fromFolderRef.collection("words").doc(newId);
                            batch.set(newWordRef, { ...d.data(), listName: finalNewLessonName });
                            c++;
                            if (c % 400 === 0) { await batch.commit(); batch = db.batch(); }
                        }
                        if (c % 400 !== 0) await batch.commit();
                    }

                    // Sao chép Grammar
                    const grammarSnap = await fromFolderRef.collection("grammar").where("listName", "==", lessonName).get();
                    if (!grammarSnap.empty) {
                        let batch = db.batch();
                        let c = 0;
                        for (const d of grammarSnap.docs) {
                            const newId = 'g_' + Date.now() + '_' + c + '_' + Math.random().toString(36).substr(2, 5);
                            const newGrammarRef = fromFolderRef.collection("grammar").doc(newId);
                            batch.set(newGrammarRef, { ...d.data(), listName: finalNewLessonName });
                            c++;
                            if (c % 400 === 0) { await batch.commit(); batch = db.batch(); }
                        }
                        if (c % 400 !== 0) await batch.commit();
                    }

                    const safeOldName = lessonName.replace(/[\/\s\.\'":#?&=+]/g, '_');
                    const safeFinalName = finalNewLessonName.replace(/[\/\s\.\'":#?&=+]/g, '_');
                    const oldRawDoc = await fromFolderRef.collection("grammar").doc('raw_' + safeOldName).get();
                    if (oldRawDoc.exists) {
                        await fromFolderRef.collection("grammar").doc('raw_' + safeFinalName).set({
                            ...oldRawDoc.data(),
                            lessonName: finalNewLessonName,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }

                    const oldExDoc = await fromFolderRef.collection("exercises").doc('ex_' + safeOldName).get();
                    if (oldExDoc.exists) {
                        await fromFolderRef.collection("exercises").doc('ex_' + safeFinalName).set({
                            ...oldExDoc.data(),
                            listName: finalNewLessonName,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            } else {
                // =========================================================================
                // TRƯỜNG HỢP 2: DI CHUYỂN HOẶC SAO CHÉP SANG THƯ MỤC LỚP HỌC KHÁC
                // =========================================================================
                await toFolderRef.update({
                    lessons: firebase.firestore.FieldValue.arrayUnion(finalNewLessonName),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Sao chép Words
                const wordsSnap = await fromFolderRef.collection("words").where("listName", "==", lessonName).get();
                if (!wordsSnap.empty) {
                    let batch = db.batch();
                    let c = 0;
                    for (const d of wordsSnap.docs) {
                        const newId = 'w_' + Date.now() + '_' + c + '_' + Math.random().toString(36).substr(2, 5);
                        const newWordRef = toFolderRef.collection("words").doc(newId);
                        batch.set(newWordRef, { ...d.data(), listName: finalNewLessonName });
                        c++;
                        if (c % 400 === 0) { await batch.commit(); batch = db.batch(); }
                    }
                    if (c % 400 !== 0) await batch.commit();
                }

                // Sao chép Grammar
                const grammarSnap = await fromFolderRef.collection("grammar").where("listName", "==", lessonName).get();
                if (!grammarSnap.empty) {
                    let batch = db.batch();
                    let c = 0;
                    for (const d of grammarSnap.docs) {
                        const newId = 'g_' + Date.now() + '_' + c + '_' + Math.random().toString(36).substr(2, 5);
                        const newGrammarRef = toFolderRef.collection("grammar").doc(newId);
                        batch.set(newGrammarRef, { ...d.data(), listName: finalNewLessonName });
                        c++;
                        if (c % 400 === 0) { await batch.commit(); batch = db.batch(); }
                    }
                    if (c % 400 !== 0) await batch.commit();
                }

                const safeOldName = lessonName.replace(/[\/\s\.\'":#?&=+]/g, '_');
                const safeFinalName = finalNewLessonName.replace(/[\/\s\.\'":#?&=+]/g, '_');
                const oldRawDoc = await fromFolderRef.collection("grammar").doc('raw_' + safeOldName).get();
                if (oldRawDoc.exists) {
                    await toFolderRef.collection("grammar").doc('raw_' + safeFinalName).set({
                        ...oldRawDoc.data(),
                        lessonName: finalNewLessonName,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                const oldExDoc = await fromFolderRef.collection("exercises").doc('ex_' + safeOldName).get();
                if (oldExDoc.exists) {
                    await toFolderRef.collection("exercises").doc('ex_' + safeFinalName).set({
                        ...oldExDoc.data(),
                        listName: finalNewLessonName,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                // Nếu là Move: xóa ở fromFolder
                if (isMove) {
                    await fromFolderRef.update({
                        lessons: firebase.firestore.FieldValue.arrayRemove(lessonName),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    if (!wordsSnap.empty) {
                        let batch = db.batch();
                        let c = 0;
                        for (const d of wordsSnap.docs) {
                            batch.delete(d.ref);
                            c++;
                            if (c % 400 === 0) { await batch.commit(); batch = db.batch(); }
                        }
                        if (c % 400 !== 0) await batch.commit();
                    }
                    if (!grammarSnap.empty) {
                        let batch = db.batch();
                        let c = 0;
                        for (const d of grammarSnap.docs) {
                            batch.delete(d.ref);
                            c++;
                            if (c % 400 === 0) { await batch.commit(); batch = db.batch(); }
                        }
                        if (c % 400 !== 0) await batch.commit();
                    }
                    if (oldRawDoc.exists) await oldRawDoc.ref.delete();
                    if (oldExDoc.exists) await oldExDoc.ref.delete();
                }
            }

            const destLabel = (destLevel === 'SUB') ? `Thư mục con "${destSub}"` : 'Thư mục mẹ (Độc lập)';
            Swal.fire({
                icon: 'success',
                title: `🎉 Đã ${actionText.toLowerCase()} thành công!`,
                text: `Đã ${actionText.toLowerCase()} bài học sang ${destLabel}!`,
                timer: 1800,
                showConfirmButton: false
            });

            // Cập nhật bộ nhớ cache ngay lập tức để không cần đọc lại từ Firestore
            if (isSameFolder) {
                const curF = _teacherFolders.find(f => f.id === fromFolderId);
                if (curF) {
                    if (isMove) {
                        curF.lessons = toLessons.map(l => (l === lessonName ? finalNewLessonName : l));
                    } else {
                        if (!curF.lessons) curF.lessons = [];
                        if (!curF.lessons.includes(finalNewLessonName)) curF.lessons.push(finalNewLessonName);
                    }
                    window.currentSharedFolderData = curF;
                }

                if (destLevel === 'ROOT') {
                    window.currentSharedSubFolder = null;
                    window.currentSharedFolderTab = 'lessons';
                } else {
                    window.currentSharedSubFolder = destSub;
                    window.currentSharedFolderTab = 'folders';
                }
            } else {
                const srcF = _teacherFolders.find(f => f.id === fromFolderId);
                const dstF = _teacherFolders.find(f => f.id === toFolderId);
                if (dstF) {
                    if (!dstF.lessons) dstF.lessons = [];
                    if (!dstF.lessons.includes(finalNewLessonName)) dstF.lessons.push(finalNewLessonName);
                }
                if (isMove && srcF) {
                    srcF.lessons = (srcF.lessons || []).filter(l => l !== lessonName);
                    window.currentSharedFolderData = srcF;
                }
            }

            // Mở lại thư mục đồng bộ ngay lập tức
            window.openSharedFolder(fromFolderId);

        } catch (err) {
            Swal.close();
            console.error("Lỗi copyOrMoveSharedLessonDialog:", err);
            let errMsg = err.message || "Không thể thực hiện!";
            if (err.code === 'resource-exhausted' || (errMsg && errMsg.includes('Quota exceeded'))) {
                errMsg = "Firestore tạm thời vượt quá giới hạn (Quota exceeded). Vui lòng thử lại sau!";
            }
            Swal.fire("Lỗi", errMsg, "error");
        }
    };

    window.createSharedSubFolderDialog = async function (folderId) {
        if (!isTeacher()) return;

        const { value: subName } = await Swal.fire({
            title: '📁 Tạo Thư mục con / Giai đoạn mới',
            input: 'text',
            inputPlaceholder: 'Ví dụ: Giai đoạn 1 - Sơ cấp, Luyện đề...',
            showCancelButton: true,
            confirmButtonText: 'Tạo',
            confirmButtonColor: '#f59e0b',
            cancelButtonText: 'Hủy'
        });
        if (!subName || !subName.trim()) return;

        const name = subName.trim().replace(/[\/]/g, '-');
        try {
            const db = firebase.firestore();
            await db.collection("shared_folders").doc(folderId).update({
                subFolders: firebase.firestore.FieldValue.arrayUnion(name),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Cập nhật ngay trong cache _teacherFolders
            const curF = _teacherFolders.find(f => f.id === folderId);
            if (curF) {
                if (!curF.subFolders) curF.subFolders = [];
                if (!curF.subFolders.includes(name)) curF.subFolders.push(name);
                window.currentSharedFolderData = curF;
            }

            window.currentSharedSubFolder = name;
            window.openSharedFolder(folderId);
            Swal.fire("Thành công", `Đã tạo thư mục con "${name}"!`, "success");
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    window.renameSharedSubFolderDialog = async function (folderId, oldSubName, e) {
        if (e) e.stopPropagation();
        if (!isTeacher()) return;

        const { value: newSubName } = await Swal.fire({
            title: 'Đổi tên Thư mục con / Giai đoạn',
            input: 'text',
            inputValue: oldSubName,
            showCancelButton: true,
            confirmButtonText: 'Lưu',
            confirmButtonColor: '#3b82f6',
            cancelButtonText: 'Hủy'
        });
        if (!newSubName || newSubName.trim() === oldSubName) return;

        const newName = newSubName.trim().replace(/[\/]/g, '-');
        try {
            const db = firebase.firestore();
            const fDoc = await db.collection("shared_folders").doc(folderId).get();
            const data = fDoc.data() || {};
            const oldLessons = data.lessons || [];

            // Đổi tên trong subFolders
            await db.collection("shared_folders").doc(folderId).update({
                subFolders: firebase.firestore.FieldValue.arrayRemove(oldSubName)
            });
            await db.collection("shared_folders").doc(folderId).update({
                subFolders: firebase.firestore.FieldValue.arrayUnion(newName)
            });

            // Cập nhật tiền tố của tất cả bài học thuộc subFolder này
            const prefix = oldSubName + '/';
            const lessonsToUpdate = oldLessons.filter(l => l.startsWith(prefix));

            for (const oldL of lessonsToUpdate) {
                const subLessonPart = oldL.substring(prefix.length);
                const newL = newName + '/' + subLessonPart;

                await db.collection("shared_folders").doc(folderId).update({
                    lessons: firebase.firestore.FieldValue.arrayRemove(oldL)
                });
                await db.collection("shared_folders").doc(folderId).update({
                    lessons: firebase.firestore.FieldValue.arrayUnion(newL)
                });

                // Cập nhật words
                const wordsSnap = await db.collection("shared_folders").doc(folderId).collection("words").where("listName", "==", oldL).get();
                if (!wordsSnap.empty) {
                    let batch = db.batch();
                    wordsSnap.forEach(d => batch.update(d.ref, { listName: newL }));
                    await batch.commit();
                }

                // Cập nhật grammar
                const grammarSnap = await db.collection("shared_folders").doc(folderId).collection("grammar").where("listName", "==", oldL).get();
                if (!grammarSnap.empty) {
                    let batch = db.batch();
                    grammarSnap.forEach(d => batch.update(d.ref, { listName: newL }));
                    await batch.commit();
                }
            }

            // Cập nhật ngay trong cache _teacherFolders
            const curF = _teacherFolders.find(f => f.id === folderId);
            if (curF) {
                if (curF.subFolders) {
                    curF.subFolders = curF.subFolders.map(s => s === oldSubName ? newName : s);
                }
                if (curF.lessons) {
                    curF.lessons = curF.lessons.map(l => l.startsWith(prefix) ? (newName + '/' + l.substring(prefix.length)) : l);
                }
                window.currentSharedFolderData = curF;
            }

            if (window.currentSharedSubFolder === oldSubName) {
                window.currentSharedSubFolder = newName;
            }
            window.openSharedFolder(folderId);
            Swal.fire("Thành công", "Đã cập nhật tên thư mục con!", "success");
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    window.deleteSharedSubFolderDialog = async function (folderId, subName, e) {
        if (e) e.stopPropagation();
        if (!isTeacher()) return;

        const res = await Swal.fire({
            title: 'Xóa Thư mục con / Giai đoạn?',
            html: `Bạn có chắc chắn muốn xóa thư mục con <b>"${escapeHtml(subName)}"</b> cùng toàn bộ bài học bên trong không?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Xóa hết',
            cancelButtonText: 'Hủy'
        });
        if (!res.isConfirmed) return;

        try {
            const db = firebase.firestore();
            const fDoc = await db.collection("shared_folders").doc(folderId).get();
            const data = fDoc.data() || {};
            const oldLessons = data.lessons || [];

            await db.collection("shared_folders").doc(folderId).update({
                subFolders: firebase.firestore.FieldValue.arrayRemove(subName)
            });

            const prefix = subName + '/';
            const lessonsToDelete = oldLessons.filter(l => l.startsWith(prefix));

            for (const oldL of lessonsToDelete) {
                await db.collection("shared_folders").doc(folderId).update({
                    lessons: firebase.firestore.FieldValue.arrayRemove(oldL)
                });

                const wordsSnap = await db.collection("shared_folders").doc(folderId).collection("words").where("listName", "==", oldL).get();
                if (!wordsSnap.empty) {
                    let batch = db.batch();
                    wordsSnap.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                }

                const grammarSnap = await db.collection("shared_folders").doc(folderId).collection("grammar").where("listName", "==", oldL).get();
                if (!grammarSnap.empty) {
                    let batch = db.batch();
                    grammarSnap.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                }
            }

            // Cập nhật ngay trong cache _teacherFolders
            const curF = _teacherFolders.find(f => f.id === folderId);
            if (curF) {
                if (curF.subFolders) {
                    curF.subFolders = curF.subFolders.filter(s => s !== subName);
                }
                if (curF.lessons) {
                    curF.lessons = curF.lessons.filter(l => !l.startsWith(prefix));
                }
                window.currentSharedFolderData = curF;
            }

            if (window.currentSharedSubFolder === subName) {
                window.currentSharedSubFolder = null;
            }
            window.openSharedFolder(folderId);
            Swal.fire("Đã xóa", `Đã xóa thư mục con "${subName}"!`, "success");
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // Tạo Thư mục có Key Code
    window.createTeacherSharedFolder = async function () {
        if (!isTeacher()) return;

        const { value: formValues } = await Swal.fire({
            title: '🔑 Tạo Thư mục Giảng dạy 1:1',
            html: `
                <div style="text-align:left;font-size:0.9em;color:#475569;margin-bottom:8px;">Tên Thư mục / Tên Lớp học:</div>
                <input id="swalFolderName" class="swal2-input" placeholder="Ví dụ: Lớp 1:1 - Lan (TOPIK II)" style="margin-top:0;">
                
                <div style="text-align:left;font-size:0.9em;color:#475569;margin-top:15px;margin-bottom:8px;">
                    Mã Key Code (cho học viên nhập):
                </div>
                <input id="swalFolderCode" class="swal2-input" placeholder="Ví dụ: LAN-TOPIK2" 
                       style="margin-top:0;text-transform:uppercase;font-weight:700;letter-spacing:1px;color:#1e40af;">
                <div style="font-size:0.8em;color:#64748b;margin-top:6px;text-align:left;">
                    * Lưu ý: Mỗi thư mục có 1 mã riêng, học viên chỉ cần nhập mã này là thấy bài học.
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Tạo thư mục',
            confirmButtonColor: '#f59e0b',
            cancelButtonText: 'Hủy',
            preConfirm: () => {
                const name = (document.getElementById('swalFolderName').value || '').trim();
                let code = (document.getElementById('swalFolderCode').value || '').trim().toUpperCase();
                code = code.replace(/\s+/g, '-');
                if (!name) { Swal.showValidationMessage('Vui lòng nhập tên thư mục!'); return false; }
                if (!code || code.length < 3) { Swal.showValidationMessage('Mã Key Code phải có ít nhất 3 ký tự!'); return false; }
                return { name, code };
            }
        });

        if (!formValues) return;

        Swal.fire({ title: 'Đang tạo...', didOpen: () => Swal.showLoading() });

        try {
            const db = firebase.firestore();
            // Kiểm tra trùng mã
            const dupCheck = await db.collection("shared_folders").where("keyCode", "==", formValues.code).get();
            if (!dupCheck.empty) {
                Swal.fire("Lỗi trùng mã", `Mã Key Code "${formValues.code}" đã được sử dụng ở thư mục khác. Vui lòng chọn mã khác!`, "error");
                return;
            }

            const folderId = 'sf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            await db.collection("shared_folders").doc(folderId).set({
                name: formValues.name,
                keyCode: formValues.code,
                ownerEmail: TEACHER_EMAIL,
                ownerUid: window.currentUserUid || '',
                lessons: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Swal.fire({
                icon: 'success',
                title: 'Tạo thành công!',
                html: `
                    Đã tạo thư mục <b>"${formValues.name}"</b>!<br>
                    Mã Key Code: <b style="color:#d97706;font-size:1.2em;">${formValues.code}</b><br><br>
                    <button class="swal2-confirm swal2-styled" style="background:#2563eb;padding:8px 16px;font-size:0.9em;" 
                            onclick="copyKeyCode('${formValues.code}')">📋 Sao chép mã gửi học viên</button>
                `,
                confirmButtonText: 'Đóng',
                confirmButtonColor: '#64748b'
            });
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // Đổi tên Thư mục Shared
    window.renameTeacherSharedFolder = async function (folderId, oldName, e) {
        if (e) e.stopPropagation();
        if (!isTeacher()) return;

        const { value: newName } = await Swal.fire({
            title: 'Đổi tên Thư mục',
            input: 'text',
            inputValue: oldName,
            showCancelButton: true,
            confirmButtonText: 'Lưu',
            confirmButtonColor: '#3b82f6',
            cancelButtonText: 'Hủy'
        });
        if (!newName || newName.trim() === oldName) return;

        try {
            await firebase.firestore().collection("shared_folders").doc(folderId).update({
                name: newName.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            Swal.fire("Thành công", "Đã cập nhật tên thư mục!", "success");
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // Đổi Key Code Thư mục Shared
    window.changeTeacherSharedFolderCode = async function (folderId, oldCode, e) {
        if (e) e.stopPropagation();
        if (!isTeacher()) return;

        const { value: newCode } = await Swal.fire({
            title: 'Đổi Key Code Thư mục',
            input: 'text',
            inputValue: oldCode,
            text: 'Học viên sẽ dùng mã mới này để mở khóa thư mục:',
            showCancelButton: true,
            confirmButtonText: 'Lưu mã mới',
            confirmButtonColor: '#f59e0b',
            cancelButtonText: 'Hủy',
            preConfirm: (val) => {
                let code = (val || '').trim().toUpperCase().replace(/\s+/g, '-');
                if (!code || code.length < 3) {
                    Swal.showValidationMessage('Mã Key Code phải có ít nhất 3 ký tự!');
                    return false;
                }
                return code;
            }
        });
        if (!newCode || newCode === oldCode) return;

        try {
            const db = firebase.firestore();
            const dupCheck = await db.collection("shared_folders").where("keyCode", "==", newCode).get();
            if (!dupCheck.empty && dupCheck.docs[0].id !== folderId) {
                Swal.fire("Lỗi trùng mã", `Mã "${newCode}" đã được sử dụng ở một thư mục khác!`, "error");
                return;
            }

            await db.collection("shared_folders").doc(folderId).update({
                keyCode: newCode,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Swal.fire({
                icon: 'success',
                title: 'Đã đổi mã!',
                html: `Mã mới: <b style="color:#d97706;font-size:1.2em;">${newCode}</b>`
            });
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // Xóa Thư mục Shared
    window.deleteTeacherSharedFolder = async function (folderId, folderName, e) {
        if (e) e.stopPropagation();
        if (!isTeacher()) return;

        const result = await Swal.fire({
            title: "⚠️ Xóa Thư mục Giảng dạy?",
            html: `Xác nhận xóa <b>"${folderName}"</b>?<br>Tất cả bài học và từ vựng bên trong sẽ bị xóa khỏi hệ thống của bạn và học viên!`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: "Xóa vĩnh viễn",
            cancelButtonText: "Hủy"
        });
        if (!result.isConfirmed) return;

        try {
            const db = firebase.firestore();
            // Xóa tất cả từ trong subcollection words
            const wordsSnap = await db.collection("shared_folders").doc(folderId).collection("words").get();
            const batch = db.batch();
            wordsSnap.forEach(d => batch.delete(d.ref));
            batch.delete(db.collection("shared_folders").doc(folderId));
            await batch.commit();

            if (window.currentSharedFolderId === folderId) {
                window.currentSharedFolderId = null;
                if (typeof window.backToSets === 'function') window.backToSets();
            }

            Swal.fire("Đã xóa", `Thư mục "${folderName}" đã bị xóa.`, "success");
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // Học viên rời khỏi Thư mục Shared
    window.leaveStudentSharedFolder = async function (folderId, folderName, e) {
        if (e) e.stopPropagation();
        const uid = window.currentUserUid;
        if (!uid) return;

        const result = await Swal.fire({
            title: "Rời khỏi Thư mục này?",
            html: `Bạn có chắc muốn bỏ thư mục <b>"${folderName}"</b> khỏi danh sách của bạn?<br>(Bạn có thể nhập lại Key Code bất cứ lúc nào để học lại)`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: "Rời khỏi",
            cancelButtonText: "Ở lại"
        });
        if (!result.isConfirmed) return;

        try {
            await firebase.firestore().collection("users").doc(uid).update({
                unlockedSharedFolders: firebase.firestore.FieldValue.arrayRemove(folderId)
            });
            if (window.currentSharedFolderId === folderId) {
                window.currentSharedFolderId = null;
                if (typeof window.backToSets === 'function') window.backToSets();
            }
            Swal.fire("Đã rời", `Đã xóa "${folderName}" khỏi Sổ từ vựng của bạn.`, "success");
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // =========================================================================
    // 4. BÀI HỌC & TỪ VỰNG TRONG SHARED FOLDER
    // =========================================================================

    // Tạo Bài học trong Shared Folder (Hỗ trợ gắn vào Thư mục con / Giai đoạn)
    window.createSharedLessonDialog = async function (folderId) {
        if (!isTeacher()) return;

        const folder = _teacherFolders.find(f => f.id === folderId);
        const subFolders = (folder && folder.subFolders) ? folder.subFolders : [];

        let subFolderOptionsHtml = '';
        if (subFolders.length > 0) {
            let options = `<option value="">📁 Cấp gốc (Không thuộc Giai đoạn nào)</option>`;
            subFolders.forEach(sf => {
                const isSel = (window.currentSharedSubFolder === sf) ? 'selected' : '';
                options += `<option value="${escapeHtml(sf)}" ${isSel}>📂 ${escapeHtml(sf)}</option>`;
            });
            subFolderOptionsHtml = `
                <div style="text-align:left;font-size:0.85em;color:#475569;margin-bottom:6px;font-weight:700;">Giai đoạn / Thư mục con:</div>
                <select id="swalLessonSubFolder" class="swal2-input" style="width:100%;box-sizing:border-box;margin:0 0 14px 0;padding:8px 12px;font-size:0.95em;">
                    ${options}
                </select>
            `;
        }

        const { value: formValues } = await Swal.fire({
            width: 'min(440px, 92vw)',
            customClass: { popup: 'swal2-key-code-popup' },
            title: 'Tạo Bài học mới',
            html: `
                ${subFolderOptionsHtml}
                <div style="text-align:left;font-size:0.85em;color:#475569;margin-bottom:6px;font-weight:700;">Tên Bài học:</div>
                <input id="swalNewLessonInput" class="swal2-input" placeholder="Ví dụ: Bài 1: Kinh tế & Xã hội..." style="width:100%;box-sizing:border-box;margin:0;">
            `,
            showCancelButton: true,
            confirmButtonText: 'Tạo Bài học',
            confirmButtonColor: '#3b82f6',
            cancelButtonText: 'Hủy',
            preConfirm: () => {
                const val = (document.getElementById('swalNewLessonInput').value || '').trim();
                const selSubEl = document.getElementById('swalLessonSubFolder');
                const selSub = selSubEl ? selSubEl.value : (window.currentSharedSubFolder || '');
                if (!val) { Swal.showValidationMessage('Vui lòng nhập tên bài học!'); return false; }
                return { lessonName: val, subFolder: selSub };
            }
        });
        if (!formValues) return;

        let cleanName = formValues.lessonName.replace(/[\/]/g, '-');
        const name = formValues.subFolder ? (formValues.subFolder + '/' + cleanName) : cleanName;
        try {
            const db = firebase.firestore();
            const fDoc = await db.collection("shared_folders").doc(folderId).get();
            const lessons = (fDoc.exists && fDoc.data().lessons) || [];

            if (lessons.includes(name)) {
                Swal.fire("Lỗi", "Bài học này đã tồn tại!", "error");
                return;
            }

            await db.collection("shared_folders").doc(folderId).update({
                lessons: firebase.firestore.FieldValue.arrayUnion(name),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Swal.fire("Thành công", `Đã tạo bài học "${name}"!`, "success");
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // Đổi tên Bài học trong Shared Folder
    window.renameSharedLessonDialog = async function (folderId, oldName, e) {
        if (e) e.stopPropagation();
        if (!isTeacher()) return;

        const folder = _teacherFolders.find(f => f.id === folderId);
        const subFolders = (folder && Array.isArray(folder.subFolders)) ? folder.subFolders : [];
        const currentSub = subFolders.find(sf => oldName.startsWith(sf + '/'));
        const cleanOldName = currentSub ? oldName.substring(currentSub.length + 1) : oldName;

        const { value: newName } = await Swal.fire({
            title: 'Đổi tên Bài học',
            input: 'text',
            inputValue: cleanOldName,
            showCancelButton: true,
            confirmButtonText: 'Lưu',
            confirmButtonColor: '#3b82f6',
            cancelButtonText: 'Hủy'
        });
        if (!newName || !newName.trim() || newName.trim() === cleanOldName) return;

        const cleanNewName = newName.trim().replace(/[\/]/g, '-');
        const n = currentSub ? (currentSub + '/' + cleanNewName) : cleanNewName;
        try {
            const db = firebase.firestore();
            const fRef = db.collection("shared_folders").doc(folderId);
            await fRef.update({
                lessons: firebase.firestore.FieldValue.arrayRemove(oldName)
            });
            await fRef.update({
                lessons: firebase.firestore.FieldValue.arrayUnion(n),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update các từ thuộc bài học này
            const wordsSnap = await fRef.collection("words").where("listName", "==", oldName).get();
            if (!wordsSnap.empty) {
                const batch = db.batch();
                wordsSnap.forEach(d => batch.update(d.ref, { listName: n }));
                await batch.commit();
            }

            // Update ngữ pháp
            const grammarSnap = await fRef.collection("grammar").where("listName", "==", oldName).get();
            if (!grammarSnap.empty) {
                const batch = db.batch();
                grammarSnap.forEach(d => batch.update(d.ref, { listName: n }));
                await batch.commit();
            }

            const safeOldName = oldName.replace(/[\/\s\.'":#?&=+]/g, '_');
            const safeNewName = n.replace(/[\/\s\.'":#?&=+]/g, '_');
            const oldRawDoc = await fRef.collection("grammar").doc('raw_' + safeOldName).get();
            if (oldRawDoc.exists) {
                await fRef.collection("grammar").doc('raw_' + safeNewName).set({
                    ...oldRawDoc.data(),
                    lessonName: n,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                if (safeOldName !== safeNewName) await oldRawDoc.ref.delete();
            }

            const oldExDoc = await fRef.collection("exercises").doc('ex_' + safeOldName).get();
            if (oldExDoc.exists) {
                await fRef.collection("exercises").doc('ex_' + safeNewName).set({
                    ...oldExDoc.data(),
                    listName: n,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                if (safeOldName !== safeNewName) await oldExDoc.ref.delete();
            }

            if (window.currentSharedLesson === oldName) {
                window.currentSharedLesson = n;
                const titleEl = document.getElementById('currentListName');
                if (titleEl) {
                    if (n.includes('/')) {
                        const parts = n.split('/');
                        const sub = parts[0];
                        const clean = parts.slice(1).join('/');
                        titleEl.innerHTML = `📖 <span style="font-size:0.82em;color:#8b5cf6;font-weight:600;">[${escapeHtml(sub)}]</span> ${escapeHtml(clean)}`;
                    } else {
                        titleEl.innerText = '📖 ' + n;
                    }
                }
            }

            Swal.fire("Thành công", "Đã đổi tên bài học!", "success");
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // Xóa Bài học trong Shared Folder
    window.deleteSharedLessonDialog = async function (folderId, lessonName, e) {
        if (e) e.stopPropagation();
        if (!isTeacher()) return;

        const result = await Swal.fire({
            title: "⚠️ Xóa Bài học?",
            html: `Xác nhận xóa bài học <b>"${lessonName}"</b> và tất cả từ vựng bên trong?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy"
        });
        if (!result.isConfirmed) return;

        try {
            const db = firebase.firestore();
            const fRef = db.collection("shared_folders").doc(folderId);
            await fRef.update({
                lessons: firebase.firestore.FieldValue.arrayRemove(lessonName),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const wordsSnap = await fRef.collection("words").where("listName", "==", lessonName).get();
            if (!wordsSnap.empty) {
                const batch = db.batch();
                wordsSnap.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }

            const grammarSnap = await fRef.collection("grammar").where("listName", "==", lessonName).get();
            if (!grammarSnap.empty) {
                const batch = db.batch();
                grammarSnap.forEach(d => batch.delete(d.ref));
                await batch.commit();
            }

            const safeOldName = lessonName.replace(/[\/\s\.'":#?&=+]/g, '_');
            const oldRawDoc = await fRef.collection("grammar").doc('raw_' + safeOldName).get();
            if (oldRawDoc.exists) await oldRawDoc.ref.delete();

            const oldExDoc = await fRef.collection("exercises").doc('ex_' + safeOldName).get();
            if (oldExDoc.exists) await oldExDoc.ref.delete();

            if (window.currentSharedLesson === lessonName) {
                window.currentSharedLesson = null;
                window.openSharedFolder(folderId);
            }

            Swal.fire("Đã xóa", `Bài học "${lessonName}" đã bị xóa.`, "success");
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // Thêm từ đơn lẻ vào Shared Lesson (dành cho Admin)
    window.addWordToCurrentSharedLesson = async function () {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedLesson) return;

        const kr = (document.getElementById('newKrWord').value || '').trim();
        const vn = (document.getElementById('newVnMean').value || '').trim();
        if (!kr || !vn) return Swal.fire("Nhắc nhở", "Vui lòng nhập đủ từ và nghĩa!", "info");

        const btn = document.querySelector('#addWordSection button');
        if (btn) { btn.disabled = true; btn.textContent = 'Đang thêm...'; }

        try {
            let enrichment = { ex_kr: '', ex_vn: '', definition: '' };
            if (typeof window.enrichWordData === 'function') {
                try {
                    enrichment = await window.enrichWordData(kr, vn);
                } catch (e) {
                    console.warn("Lỗi enrichWordData:", e);
                }
            }

            const db = firebase.firestore();
            const wordsCol = db.collection("shared_folders").doc(window.currentSharedFolderId).collection("words");
            const maxOrder = window.currentSharedWords.length > 0
                ? Math.max(...window.currentSharedWords.map(w => w.order || 0)) + 1 : 0;
            const docId = 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

            await wordsCol.doc(docId).set({
                word: kr,
                meaning: vn,
                listName: window.currentSharedLesson,
                ex_kr: enrichment.ex_kr || '',
                ex_vn: enrichment.ex_vn || '',
                definition: enrichment.definition || '',
                order: maxOrder,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.getElementById('newKrWord').value = '';
            document.getElementById('newVnMean').value = '';
            document.getElementById('newKrWord').focus();
            const suggestBox = document.getElementById('suggestBox');
            if (suggestBox) suggestBox.style.display = 'none';

        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Thêm từ'; }
    };

    // Bulk Import từ vào Shared Lesson
    window.bulkImportToCurrentSharedLesson = async function () {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedLesson) return;

        const text = (document.getElementById('bulkImportTextarea').value || '').trim();
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

        const btn = document.getElementById('bulkImportSubmitBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Đang tạo...'; }

        try {
            const db = firebase.firestore();
            const wordsCol = db.collection("shared_folders").doc(window.currentSharedFolderId).collection("words");
            const batch = db.batch();
            const maxOrder = window.currentSharedWords.length;

            pairs.forEach((p, i) => {
                const docId = 'w_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 6);
                let ex_kr = '', definition = '';
                if (typeof _findBestSense === 'function') {
                    const sense = _findBestSense(p.word, p.meaning);
                    if (sense) {
                        definition = sense.d || '';
                        if (sense.x && sense.x.length) {
                            ex_kr = typeof sense.x[0] === 'string' ? sense.x[0] : (sense.x[0].ko || '');
                        }
                    }
                }
                batch.set(wordsCol.doc(docId), {
                    word: p.word,
                    meaning: p.meaning,
                    listName: window.currentSharedLesson,
                    ex_kr: ex_kr,
                    ex_vn: '',
                    definition: definition,
                    order: maxOrder + i,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            const m = document.getElementById('bulkImportModal');
            if (m) m.remove();
            Swal.fire({
                title: "Thành công",
                text: `Đã tạo ${pairs.length} từ mới trong bài học!`,
                icon: "success",
                timer: 2000,
                showConfirmButton: false
            });
        } catch (e) {
            Swal.fire("Lỗi", e.message, "error");
            if (btn) { btn.disabled = false; btn.textContent = '📥 Tạo tất cả'; }
        }
    };

    // Sửa nghĩa từ trong Shared Lesson
    window.editCurrentSharedWord = async function (wordId, oldMean) {
        if (!isTeacher() || !window.currentSharedFolderId) return;

        const { value: newMean } = await Swal.fire({
            title: "Sửa nghĩa:",
            input: "text",
            inputValue: oldMean,
            showCancelButton: true
        });
        if (newMean && newMean.trim() !== oldMean) {
            try {
                await firebase.firestore().collection("shared_folders").doc(window.currentSharedFolderId)
                    .collection("words").doc(wordId).update({ meaning: newMean.trim() });
            } catch (err) {
                Swal.fire("Lỗi", err.message, "error");
            }
        }
    };

    // Xóa từ trong Shared Lesson
    window.deleteCurrentSharedWord = function (wordId) {
        if (!isTeacher() || !window.currentSharedFolderId) return;

        Swal.fire({
            title: "Xóa từ này?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: "Xóa"
        }).then(r => {
            if (r.isConfirmed) {
                firebase.firestore().collection("shared_folders").doc(window.currentSharedFolderId)
                    .collection("words").doc(wordId).delete();
            }
        });
    };

    // Lưu tiến độ học của Học viên đối với từ trong Shared Folder
    window.saveSharedWordStatus = async function (folderId, wordId, status) {
        const uid = window.currentUserUid;
        if (!uid || typeof firebase === 'undefined') return;

        const st = parseInt(status) || 0;
        window.studentProgressMap[wordId] = st;

        try {
            const db = firebase.firestore();
            const user = firebase.auth().currentUser;

            // 1. Lưu vào tài khoản cá nhân của học viên
            const docId = `${folderId}_${wordId}`;
            await db.collection("users").doc(uid)
                .collection("shared_progress").doc(docId).set({
                    folderId: folderId,
                    wordId: wordId,
                    status: st,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            // 2. Đồng bộ về phía Admin (shared_folders/{folderId}/students/{uid}/progress/{wordId})
            const studentRef = db.collection("shared_folders").doc(folderId).collection("students").doc(uid);
            await studentRef.collection("progress").doc(wordId).set({
                wordId: wordId,
                status: st,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Cập nhật thông tin học viên & thời gian học gần nhất
            await studentRef.set({
                uid: uid,
                email: (user && user.email) || '',
                displayName: (user && (user.displayName || (user.email ? user.email.split('@')[0] : 'Học viên'))) || 'Học viên',
                photoURL: (user && user.photoURL) || '',
                lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        } catch (e) {
            console.error("Lỗi lưu tiến độ từ vựng chung:", e);
        }
    };

    // =========================================================================
    // 5. HIỂN THỊ TRÊN GIAO DIỆN VOCAB.HTML
    // =========================================================================

    // Mở một Thư mục Shared (xem danh sách các Bài học bên trong)
    window.openSharedFolder = function (folderId) {
        let folder = (_teacherFolders.concat(_studentFolders)).find(f => f.id === folderId);
        if (!folder && window.currentSharedFolderData && window.currentSharedFolderData.id === folderId) {
            folder = window.currentSharedFolderData;
        }
        if (!folder) return;

        window.currentSharedFolderId = folderId;
        window.currentSharedFolderData = folder;
        window.currentSharedLesson = null;
        if (!window.currentSharedSubFolder && !window.currentSharedFolderTab) {
            window.currentSharedFolderTab = 'folders';
        }
        window.currentListView = null;
        window.currentFolderName = folder.name;
        if (typeof window.updateFloatingKeyVisibility === 'function') window.updateFloatingKeyVisibility();

        // Chuyển view
        const vSets = document.getElementById('vocabSetsView');
        const vDetail = document.getElementById('vocabDetailView');
        const vAll = document.getElementById('viewAllVocab');
        const vFolders = document.getElementById('viewFolders');
        if (vAll) vAll.style.display = 'none';
        if (vFolders) vFolders.style.display = 'block';
        if (vSets) vSets.style.display = 'none';
        if (vDetail) vDetail.style.display = 'block';

        const addSec = document.getElementById('addWordSection');
        if (addSec) addSec.style.display = 'none';

        // Ẩn thanh 3 Tab Từ vựng, Ngữ pháp & Bài tập khi ở cấp Thư mục
        const subTabs = document.getElementById('lessonSubTabs');
        if (subTabs) subTabs.style.display = 'none';
        const vSubContent = document.getElementById('vocabSubTabContent');
        if (vSubContent) vSubContent.style.display = 'block';
        const gSubContent = document.getElementById('grammarSubTabContent');
        if (gSubContent) gSubContent.style.display = 'none';
        const eSubContent = document.getElementById('exerciseSubTabContent');
        if (eSubContent) eSubContent.style.display = 'none';

        // Header Title & Action button
        const titleEl = document.getElementById('currentListName');
        if (titleEl) {
            const codeBadge = isTeacher()
                ? `<span class="shared-badge-code" onclick="copyKeyCode('${folder.keyCode}')" title="Bấm để copy mã gửi học viên">🔑 Mã: ${folder.keyCode} 📋</span>`
                : `<span class="shared-badge-teacher">🎓 Lớp học</span>`;
            if (window.currentSharedSubFolder) {
                titleEl.innerHTML = `📁 ${folder.name} <span style="font-size:0.85em;color:#8b5cf6;font-weight:700;">▸ 📂 ${window.currentSharedSubFolder}</span> ${codeBadge}`;
            } else {
                titleEl.innerHTML = `📁 ${folder.name} ${codeBadge}`;
            }
        }

        const secTitle = document.getElementById('vocabDetailSectionTitle');
        if (secTitle) {
            if (window.currentSharedSubFolder) {
                secTitle.innerHTML = `Danh sách Bài học trong "${window.currentSharedSubFolder}"`;
            } else {
                secTitle.innerHTML = 'Danh sách Bài học & Giai đoạn (' + ((folder.lessons || []).length) + ')';
            }
        }

        if (_sharedWordsUnsub) { _sharedWordsUnsub(); _sharedWordsUnsub = null; }
        if (_sharedGrammarUnsub) { _sharedGrammarUnsub(); _sharedGrammarUnsub = null; }
        if (_sharedExerciseUnsub) { _sharedExerciseUnsub(); _sharedExerciseUnsub = null; }
        if (_studentSubmissionUnsub) { _studentSubmissionUnsub(); _studentSubmissionUnsub = null; }
        if (_teacherSubmissionsUnsub) { _teacherSubmissionsUnsub(); _teacherSubmissionsUnsub = null; }
        if (_teacherQuizAttemptsUnsub) { _teacherQuizAttemptsUnsub(); _teacherQuizAttemptsUnsub = null; }
        window.currentSharedWords = [];
        window.currentSharedGrammar = [];
        window.currentSharedExercise = null;
        window.currentSharedExerciseId = null;
        if (typeof window.setStudyList === 'function') window.setStudyList([]);

        const safeFName = folder.name.replace(/'/g, "\\'");
        const slot = document.getElementById('headerActionBtnSlot');
        if (slot) {
            if (isTeacher()) {
                slot.innerHTML = `
                    <button class="btn-create-list" onclick="createSharedLessonDialog('${folderId}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;background:#f59e0b;border:none;">+ Tạo Bài học</button>
                    <button class="btn-create-list" onclick="createSharedSubFolderDialog('${folderId}')" style="padding:6px 12px;font-size:0.82em;flex:0 0 auto;background:#8b5cf6;border:none;color:#fff;">+ Giai đoạn</button>
                    <button class="btn-edit" onclick="openStudentsProgressModal('${folderId}', '${safeFName}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;background:#eff6ff;color:#2563eb;border-color:#bfdbfe;">👥 Học viên & Tiến độ</button>
                `;
            } else {
                slot.innerHTML = `<span style="font-size:0.85em;color:#64748b;font-weight:600;">Giáo viên: ${folder.ownerEmail || 'Admin'}</span>`;
            }
        }

        renderSharedSubLessonsGrid(folder);
    };

    // Render danh sách Bài học & Thư mục con / Giai đoạn bên trong Shared Folder
    function renderSharedSubLessonsGrid(folder) {
        const grid = document.getElementById('vocabGridDetail');
        if (!grid) return;

        const allLessons = folder.lessons || [];
        // CHỈ LẤY CÁC THƯ MỤC CON DO GIÁO VIÊN CHỦ ĐỘNG TẠO (từ trường subFolders)
        const subFoldersList = Array.isArray(folder.subFolders) ? [...folder.subFolders].sort() : [];

        // Một bài học chỉ thuộc thư mục con nếu nó bắt đầu bằng [TênThưMụcCon]/
        // TẤT CẢ BÀI HỌC CÒN LẠI ĐỀU LÀ BÀI HỌC ĐỘC LẬP THUỘC THƯ MỤC MẸ (bao gồm mọi bài học cũ!)
        const rootLessons = allLessons.filter(l => !subFoldersList.some(sf => l.startsWith(sf + '/')));

        const currentSub = window.currentSharedSubFolder;
        const mainTabsEl = document.getElementById('sharedFolderMainTabs');
        const tabFoldersBtn = document.getElementById('tabSharedFoldersBtn');
        const tabLessonsBtn = document.getElementById('tabSharedLessonsBtn');
        const foldersBadge = document.getElementById('sharedFoldersBadge');
        const lessonsBadge = document.getElementById('sharedLessonsBadge');
        const secTitle = document.getElementById('vocabDetailSectionTitle');
        const slot = document.getElementById('headerActionBtnSlot');
        const safeFName = folder.name.replace(/'/g, "\\'");

        // TRƯỜNG HỢP 1: ĐANG Ở TRONG 1 THƯ MỤC CON / GIAI ĐOẠN
        if (currentSub) {
            if (mainTabsEl) mainTabsEl.style.display = 'none';

            const prefix = currentSub + '/';
            const displayedLessons = allLessons.filter(l => l.startsWith(prefix));

            // Breadcrumb navigation
            if (secTitle) {
                secTitle.innerHTML = `
                    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
                        <span onclick="openSharedSubFolder(null, '${folder.id}')" style="cursor:pointer;color:#2563eb;font-weight:700;">📁 ${escapeHtml(folder.name)}</span>
                        <span style="color:#94a3b8;">/</span>
                        <span style="color:#1e293b;font-weight:800;">📂 ${escapeHtml(currentSub)}</span>
                        <span style="font-size:0.85em;color:#64748b;">(${displayedLessons.length} bài học)</span>
                        <button onclick="openSharedSubFolder(null, '${folder.id}')" class="btn-edit" style="margin-left:auto;padding:3px 10px;font-size:0.78em;">← Về Thư mục chính</button>
                    </div>
                `;
            }

            if (slot && isTeacher()) {
                slot.innerHTML = `
                    <button class="btn-create-list" onclick="createSharedLessonDialog('${folder.id}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;background:#f59e0b;border:none;">+ Tạo Bài học vào "${escapeHtml(currentSub)}"</button>
                    <button class="btn-edit" onclick="openSharedSubFolder(null, '${folder.id}')" style="padding:6px 12px;font-size:0.82em;flex:0 0 auto;">← Thư mục chính</button>
                `;
            }

            if (displayedLessons.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #64748b;">
                        <div style="font-size: 2.2em; margin-bottom: 8px;">📂</div>
                        <div style="font-weight:600; margin-bottom:6px;">Chưa có bài học nào trong thư mục "${escapeHtml(currentSub)}"</div>
                        ${isTeacher() ? `
                            <button class="btn-create-list" onclick="createSharedLessonDialog('${folder.id}')" style="background:#f59e0b;border:none;padding:8px 18px;margin-top:12px;font-size:0.88em;">+ Tạo Bài học đầu tiên</button>
                        ` : ''}
                    </div>
                `;
                return;
            }

            // Render danh sách bài học của SubFolder NGAY LẬP TỨC (không chờ get() mạng)
            let html = '';
            displayedLessons.forEach(lName => {
                const safeLName = lName.replace(/'/g, "\\'");
                const menuId = 'smenu-' + (folder.id + '_' + lName).replace(/[\/\s\.'"]/g, '_');
                const displayTitle = lName.startsWith(prefix) ? lName.substring(prefix.length) : lName;

                let dotsHtml = '';
                if (isTeacher()) {
                    dotsHtml = `
                        <div class="folder-actions" onclick="event.stopPropagation()">
                            <button class="folder-dots-btn" onclick="toggleCardMenu('${menuId}', this, event)">⋮</button>
                            <div id="${menuId}" class="folder-menu">
                                <div class="folder-menu-item" onclick="renameSharedLessonDialog('${folder.id}', '${safeLName}', event)">Đổi tên</div>
                                <div class="folder-menu-item" onclick="copyOrMoveSharedLessonDialog('${folder.id}', '${safeLName}', false, event)">📋 Sao chép bài học</div>
                                <div class="folder-menu-item" onclick="copyOrMoveSharedLessonDialog('${folder.id}', '${safeLName}', true, event)">📦 Di chuyển bài học</div>
                                <div class="folder-menu-item danger" onclick="deleteSharedLessonDialog('${folder.id}', '${safeLName}', event)">Xóa</div>
                            </div>
                        </div>
                    `;
                }

                html += `
                    <div class="list-card" style="position:relative;cursor:pointer;" onclick="openSharedLesson('${folder.id}', '${safeLName}')">
                        <div style="flex:1;">
                            <div class="list-title">📖 ${escapeHtml(displayTitle)}</div>
                            <div class="list-count" id="cnt-${menuId}">... thuật ngữ — 🎓 Lớp học</div>
                        </div>
                        ${dotsHtml}
                    </div>
                `;
            });
            grid.innerHTML = html;

            // Đếm số từ trong background (nếu lỗi quota/offline thì không ảnh hưởng hiển thị)
            const db = firebase.firestore();
            db.collection("shared_folders").doc(folder.id).collection("words").get().then(snap => {
                const countMap = {};
                snap.forEach(d => {
                    const ln = d.data().listName;
                    countMap[ln] = (countMap[ln] || 0) + 1;
                });
                displayedLessons.forEach(lName => {
                    const menuId = 'smenu-' + (folder.id + '_' + lName).replace(/[\/\s\.'"]/g, '_');
                    const el = document.getElementById('cnt-' + menuId);
                    if (el) el.innerText = (countMap[lName] || 0) + ' thuật ngữ — 🎓 Lớp học';
                });
            }).catch(e => {
                displayedLessons.forEach(lName => {
                    const menuId = 'smenu-' + (folder.id + '_' + lName).replace(/[\/\s\.'"]/g, '_');
                    const el = document.getElementById('cnt-' + menuId);
                    if (el) el.innerText = '🎓 Bài học';
                });
            });
            return;
        }

        // TRƯỜNG HỢP 2: ĐANG Ở CẤP THƯ MỤC MẸ (HIỂN THỊ 2 TAB: THƯ MỤC & BÀI HỌC)
        if (mainTabsEl) mainTabsEl.style.display = 'flex';
        if (foldersBadge) foldersBadge.textContent = subFoldersList.length;
        if (lessonsBadge) lessonsBadge.textContent = rootLessons.length;

        // Mặc định luôn ở Tab 'folders' (Thư mục)
        const activeTab = window.currentSharedFolderTab || 'folders';
        if (tabFoldersBtn) tabFoldersBtn.classList.toggle('active', activeTab === 'folders');
        if (tabLessonsBtn) tabLessonsBtn.classList.toggle('active', activeTab === 'lessons');

        // TAB THƯ MỤC CON / GIAI ĐOẠN (MẶC ĐỊNH)
        if (activeTab === 'folders') {
            if (secTitle) {
                secTitle.innerHTML = `Danh sách Thư mục con / Giai đoạn (${subFoldersList.length})`;
            }

            if (slot && isTeacher()) {
                slot.innerHTML = `
                    <button class="btn-create-list" onclick="createSharedSubFolderDialog('${folder.id}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;background:linear-gradient(135deg, #0ea5e9, #0284c7);border:none;">📁 + Tạo Giai đoạn</button>
                    <button class="btn-create-list" onclick="createSharedLessonDialog('${folder.id}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;background:#f59e0b;border:none;">+ Tạo Bài học</button>
                    <button class="btn-edit" onclick="openStudentsProgressModal('${folder.id}', '${safeFName}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;background:#eff6ff;color:#2563eb;border-color:#bfdbfe;">👥 Học viên & Tiến độ</button>
                `;
            }

            if (subFoldersList.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #64748b;">
                        <div style="font-size: 2.2em; margin-bottom: 8px;">📂</div>
                        <div style="font-weight:700; margin-bottom:6px; font-size:1.05em; color:#334155;">Chưa có Thư mục con nào</div>
                        <div style="font-size:0.88em; color:#94a3b8; margin-bottom:16px;">Tất cả các bài học cũ & bài học độc lập nằm ở tab <b>"📖 Bài học (${rootLessons.length})"</b> bên cạnh.</div>
                        ${isTeacher() ? `
                            <button class="btn-create-list" onclick="createSharedSubFolderDialog('${folder.id}')" style="background:#0284c7;border:none;padding:8px 18px;font-size:0.88em;">📁 + Tạo Giai đoạn đầu tiên</button>
                        ` : ''}
                    </div>
                `;
                return;
            }

            let html = '';
            subFoldersList.forEach(subName => {
                const safeSub = subName.replace(/'/g, "\\'");
                const prefix = subName + '/';
                const subLessonsCount = allLessons.filter(l => l.startsWith(prefix)).length;
                const menuId = 'subfmenu-' + (folder.id + '_' + subName).replace(/[\/\s\.'"]/g, '_');

                let subMenuHtml = '';
                if (isTeacher()) {
                    subMenuHtml = `
                        <div class="folder-actions" onclick="event.stopPropagation()">
                            <button class="folder-dots-btn" onclick="toggleCardMenu('${menuId}', this, event)">⋮</button>
                            <div id="${menuId}" class="folder-menu">
                                <div class="folder-menu-item" onclick="renameSharedSubFolderDialog('${folder.id}', '${safeSub}', event)">Đổi tên giai đoạn</div>
                                <div class="folder-menu-item danger" onclick="deleteSharedSubFolderDialog('${folder.id}', '${safeSub}', event)">Xóa giai đoạn</div>
                            </div>
                        </div>
                    `;
                }

                html += `
                    <div class="list-card" style="position:relative;cursor:pointer;background:linear-gradient(135deg, #fffbeb, #fef3c7);border-left:4px solid #f59e0b;" onclick="openSharedSubFolder('${safeSub}', '${folder.id}')">
                        <div style="flex:1;">
                            <div class="list-title" style="color:#b45309;font-weight:800;">📂 ${escapeHtml(subName)}</div>
                            <div class="list-count" style="color:#92400e;">${subLessonsCount} bài học — 📁 Thư mục con</div>
                        </div>
                        ${subMenuHtml}
                    </div>
                `;
            });
            grid.innerHTML = html;
            return;
        }

        // TAB BÀI HỌC ĐỘC LẬP TẠI THƯ MỤC MẸ (CÁC BÀI HỌC CŨ ĐƯỢC GIỮ NGUYÊN TẠI ĐÂY)
        if (activeTab === 'lessons') {
            if (secTitle) {
                secTitle.innerHTML = `Danh sách Bài học độc lập (${rootLessons.length} bài)`;
            }

            if (slot && isTeacher()) {
                slot.innerHTML = `
                    <button class="btn-create-list" onclick="createSharedLessonDialog('${folder.id}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;background:#f59e0b;border:none;">+ Tạo Bài học độc lập</button>
                    <button class="btn-create-list" onclick="createSharedSubFolderDialog('${folder.id}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;background:linear-gradient(135deg, #0ea5e9, #0284c7);border:none;">📁 + Tạo Giai đoạn</button>
                    <button class="btn-edit" onclick="openStudentsProgressModal('${folder.id}', '${safeFName}')" style="padding:6px 14px;font-size:0.82em;flex:0 0 auto;background:#eff6ff;color:#2563eb;border-color:#bfdbfe;">👥 Học viên & Tiến độ</button>
                `;
            }

            if (rootLessons.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #64748b;">
                        <div style="font-size: 2.2em; margin-bottom: 8px;">📖</div>
                        <div style="font-weight:700; margin-bottom:6px; font-size:1.05em; color:#334155;">Chưa có bài học độc lập nào ở Thư mục mẹ</div>
                        <div style="font-size:0.88em; color:#94a3b8; margin-bottom:16px;">Tất cả bài học hiện tại đang nằm trong các <b>"📁 Thư mục con (${subFoldersList.length})"</b> hoặc chưa tạo bài học.</div>
                        ${isTeacher() ? `
                            <button class="btn-create-list" onclick="createSharedLessonDialog('${folder.id}')" style="background:#f59e0b;border:none;padding:8px 18px;font-size:0.88em;">+ Tạo Bài học độc lập</button>
                        ` : ''}
                    </div>
                `;
                return;
            }

            // Render danh sách bài học độc lập NGAY LẬP TỨC (không chờ mạng)
            let html = '';
            rootLessons.forEach(lName => {
                const safeLName = lName.replace(/'/g, "\\'");
                const menuId = 'smenu-' + (folder.id + '_' + lName).replace(/[\/\s\.'"]/g, '_');

                let dotsHtml = '';
                if (isTeacher()) {
                    dotsHtml = `
                        <div class="folder-actions" onclick="event.stopPropagation()">
                            <button class="folder-dots-btn" onclick="toggleCardMenu('${menuId}', this, event)">⋮</button>
                            <div id="${menuId}" class="folder-menu">
                                <div class="folder-menu-item" onclick="renameSharedLessonDialog('${folder.id}', '${safeLName}', event)">Đổi tên</div>
                                <div class="folder-menu-item" onclick="copyOrMoveSharedLessonDialog('${folder.id}', '${safeLName}', false, event)">📋 Sao chép bài học</div>
                                <div class="folder-menu-item" onclick="copyOrMoveSharedLessonDialog('${folder.id}', '${safeLName}', true, event)">📦 Di chuyển bài học</div>
                                <div class="folder-menu-item danger" onclick="deleteSharedLessonDialog('${folder.id}', '${safeLName}', event)">Xóa</div>
                            </div>
                        </div>
                    `;
                }

                html += `
                    <div class="list-card" style="position:relative;cursor:pointer;" onclick="openSharedLesson('${folder.id}', '${safeLName}')">
                        <div style="flex:1;">
                            <div class="list-title">📖 ${escapeHtml(lName)}</div>
                            <div class="list-count" id="cnt-${menuId}">... thuật ngữ — 🎓 Lớp học</div>
                        </div>
                        ${dotsHtml}
                    </div>
                `;
            });
            grid.innerHTML = html;

            // Đếm số từ trong background (nếu lỗi quota/offline thì không ảnh hưởng giao diện)
            const db = firebase.firestore();
            db.collection("shared_folders").doc(folder.id).collection("words").get().then(snap => {
                const countMap = {};
                snap.forEach(d => {
                    const ln = d.data().listName;
                    countMap[ln] = (countMap[ln] || 0) + 1;
                });
                rootLessons.forEach(lName => {
                    const menuId = 'smenu-' + (folder.id + '_' + lName).replace(/[\/\s\.'"]/g, '_');
                    const el = document.getElementById('cnt-' + menuId);
                    if (el) el.innerText = (countMap[lName] || 0) + ' thuật ngữ — 🎓 Lớp học';
                });
            }).catch(e => {
                rootLessons.forEach(lName => {
                    const menuId = 'smenu-' + (folder.id + '_' + lName).replace(/[\/\s\.'"]/g, '_');
                    const el = document.getElementById('cnt-' + menuId);
                    if (el) el.innerText = '🎓 Bài học';
                });
            });
            return;
        }
    }

    // Mở một Bài học trong Shared Folder (chia 2 Tab: Từ vựng & Ngữ pháp)
    window.openSharedLesson = function (folderId, lessonName) {
        const sfTabs = document.getElementById('sharedFolderMainTabs');
        if (sfTabs) sfTabs.style.display = 'none';
        window.currentSharedFolderId = folderId;
        window.currentSharedLesson = lessonName;
        window.currentListView = lessonName;

        const titleEl = document.getElementById('currentListName');
        if (titleEl) {
            if (lessonName.includes('/')) {
                const parts = lessonName.split('/');
                const sub = parts[0];
                const clean = parts.slice(1).join('/');
                titleEl.innerHTML = `📖 <span style="font-size:0.82em;color:#8b5cf6;font-weight:600;">[${escapeHtml(sub)}]</span> ${escapeHtml(clean)}`;
            } else {
                titleEl.innerText = '📖 ' + lessonName;
            }
        }

        const secTitle = document.getElementById('vocabDetailSectionTitle');
        if (secTitle) {
            secTitle.innerHTML = 'Danh sách từ (<span id="totalVocabCountDetail">0</span>)';
        }

        // Hiển thị thanh 2 Tab Từ vựng & Ngữ pháp
        const subTabs = document.getElementById('lessonSubTabs');
        if (subTabs) subTabs.style.display = 'grid';
        switchLessonSubTab('vocab');

        const addSec = document.getElementById('addWordSection');
        const slot = document.getElementById('headerActionBtnSlot');
        const safeLName = lessonName.replace(/'/g, "\\'");
        const folder = (_teacherFolders.concat(_studentFolders)).find(f => f.id === folderId);
        const folderName = (folder && folder.name) || '';
        const safeFName = folderName.replace(/'/g, "\\'");

        if (isTeacher()) {
            if (addSec) addSec.style.display = '';
            if (slot) {
                slot.innerHTML = `
                    <button class="btn-edit" onclick="openBulkImport()" style="padding:6px 12px;font-size:0.82em;flex:0 0 auto;">+ Danh sách</button>
                    <button class="btn-create-list" onclick="openSingleGrammarModal()" style="padding:6px 12px;font-size:0.82em;flex:0 0 auto;background:linear-gradient(135deg, #6366f1, #4f46e5);border:none;">📘 + Ngữ pháp</button>
                    <button class="btn-create-list" onclick="openEditExercisePromptModal()" style="padding:6px 12px;font-size:0.82em;flex:0 0 auto;background:#0284c7;border:none;">📝 + Bài tập</button>
                    <button class="btn-edit" onclick="openStudentsProgressModal('${folderId}', '${safeFName}', '${safeLName}')" style="padding:6px 12px;font-size:0.82em;flex:0 0 auto;background:#eff6ff;color:#2563eb;border-color:#bfdbfe;">📊 Tiến độ học viên</button>
                `;
            }
            const gSlot = document.getElementById('grammarActionButtonsSlot');
            if (gSlot) {
                gSlot.innerHTML = `
                    <button class="btn-create-list" onclick="openGrammarLibraryModal()" style="padding:6px 14px;font-size:0.82em;background:linear-gradient(135deg, #059669, #10b981);border:none;color:#fff;font-weight:700;">🗂️ Thư viện Ngữ pháp</button>
                    <button class="btn-create-list" onclick="openSingleGrammarModal()" style="padding:6px 14px;font-size:0.82em;background:linear-gradient(135deg, #4f46e5, #4338ca);border:none;color:#fff;font-weight:700;">➕ Thêm Ngữ pháp</button>
                    <button class="btn-create-list" onclick="openCombinedGrammarEditor()" style="padding:6px 14px;font-size:0.82em;background:linear-gradient(135deg, #0ea5e9, #0284c7);border:none;">📑 Sửa bản tổng hợp</button>
                    <button class="btn-create-list" onclick="openGrammarImportModal()" style="padding:6px 14px;font-size:0.82em;background:linear-gradient(135deg, #64748b, #475569);border:none;">📋 Nhập nhanh (Dán)</button>
                    <button class="btn-edit" onclick="openStudentsProgressModal('${folderId}', '${safeFName}', '${safeLName}')" style="padding:6px 12px;font-size:0.82em;background:#eff6ff;color:#2563eb;border-color:#bfdbfe;">📊 Tiến độ học viên</button>
                `;
            }
        } else {
            // Học viên: chỉ xem và học, không sửa từ
            if (addSec) addSec.style.display = 'none';
            if (slot) slot.innerHTML = `<span style="font-size:0.8em;color:#10b981;font-weight:700;">🔑 Đã mở khóa</span>`;
            const gSlot = document.getElementById('grammarActionButtonsSlot');
            if (gSlot) gSlot.innerHTML = '';
        }

        // 1. Lắng nghe realtime TỪ VỰNG của bài học này
        if (_sharedWordsUnsub) _sharedWordsUnsub();

        const db = firebase.firestore();
        _sharedWordsUnsub = db.collection("shared_folders").doc(folderId).collection("words")
            .where("listName", "==", lessonName)
            .onSnapshot(snap => {
                const words = [];
                snap.forEach(doc => {
                    const d = doc.data();
                    d.id = doc.id;
                    d._isShared = true;
                    d._sharedFolderId = folderId;
                    d.status = window.studentProgressMap[doc.id] || 0;
                    words.push(d);
                });

                words.sort((a, b) => (a.order || 0) - (b.order || 0));
                window.currentSharedWords = words;
                window.currentStudyList = words;

                const vBadge = document.getElementById('tabVocabBadge');
                if (vBadge) vBadge.innerText = words.length;

                if (typeof window.setStudyList === 'function') {
                    window.setStudyList(words);
                }
                if (typeof window.updateStatsUI === 'function') {
                    window.updateStatsUI(words, 'Thống kê ghi nhớ');
                }
                if (typeof window.renderVocabGridDetail === 'function') {
                    window.renderVocabGridDetail();
                }
            }, err => {
                console.error("Lỗi onSnapshot words:", err);
                if (typeof Swal !== 'undefined') {
                    Swal.fire("Lỗi tải từ vựng", err.message, "error");
                }
            });

        // 2. Lắng nghe realtime NGỮ PHÁP của bài học này
        if (_sharedGrammarUnsub) _sharedGrammarUnsub();

        _sharedGrammarUnsub = db.collection("shared_folders").doc(folderId).collection("grammar")
            .where("listName", "==", lessonName)
            .onSnapshot(snap => {
                const grammarList = [];
                snap.forEach(doc => {
                    const d = doc.data();
                    d.id = doc.id;
                    grammarList.push(d);
                });

                grammarList.sort((a, b) => (a.order || 0) - (b.order || 0));
                window.currentSharedGrammar = grammarList;

                const gBadge = document.getElementById('tabGrammarBadge');
                if (gBadge) gBadge.innerText = grammarList.length;

                const gTotal = document.getElementById('totalGrammarCountDetail');
                if (gTotal) gTotal.innerText = grammarList.length;

                renderGrammarCards(grammarList);
            }, err => {
                console.error("Lỗi onSnapshot grammar:", err);
            });
        // 3. Lắng nghe realtime BÀI TẬP của bài học này
        const exerciseDocId = 'ex_' + (lessonName || 'default').replace(/[\/\s\.'":#?&=+]/g, '_');
        window.currentSharedExerciseId = exerciseDocId;

        if (_sharedExerciseUnsub) { _sharedExerciseUnsub(); _sharedExerciseUnsub = null; }
        if (_studentSubmissionUnsub) { _studentSubmissionUnsub(); _studentSubmissionUnsub = null; }
        if (_teacherSubmissionsUnsub) { _teacherSubmissionsUnsub(); _teacherSubmissionsUnsub = null; }
        if (_teacherQuizAttemptsUnsub) { _teacherQuizAttemptsUnsub(); _teacherQuizAttemptsUnsub = null; }

        _sharedExerciseUnsub = db.collection("shared_folders").doc(folderId).collection("exercises").doc(exerciseDocId)
            .onSnapshot(doc => {
                const exData = doc.exists ? doc.data() : null;
                window.currentSharedExercise = exData;
                renderExercisePromptView(exData);
            }, err => {
                console.error("Lỗi onSnapshot exercise:", err);
            });

        // 4. Lắng nghe BÀI NỘP tùy theo vai trò Giáo viên / Học viên
        const teacherWS = document.getElementById('teacherSubmissionsWorkspace');
        const studentWS = document.getElementById('studentExerciseWorkspace');

        if (isTeacher()) {
            if (teacherWS) teacherWS.style.display = 'block';
            if (studentWS) studentWS.style.display = 'none';

            _teacherSubmissionsUnsub = db.collection("shared_folders").doc(folderId)
                .collection("exercises").doc(exerciseDocId).collection("submissions")
                .onSnapshot(snap => {
                    const subs = [];
                    snap.forEach(d => {
                        const s = d.data();
                        s.studentId = d.id;
                        subs.push(s);
                    });
                    renderTeacherSubmissionsList(subs);
                }, err => {
                    console.error("Lỗi onSnapshot teacher submissions:", err);
                });

            // Tiến độ bài tập tương tác (JSON) của từng học viên — realtime
            window._teacherQuizAttempts = [];
            window._teacherQuizRoster = null;
            renderTeacherQuizProgress();
            _teacherQuizAttemptsUnsub = db.collection("shared_folders").doc(folderId)
                .collection("exercises").doc(exerciseDocId).collection("quiz_attempts")
                .onSnapshot(snap => {
                    const list = [];
                    snap.forEach(d => { const a = d.data(); a.studentId = d.id; list.push(a); });
                    window._teacherQuizAttempts = list;
                    renderTeacherQuizProgress();
                }, err => {
                    console.error("Lỗi onSnapshot quiz_attempts:", err);
                });
            // Danh sách học viên của lớp → để hiện cả người CHƯA làm
            const rosterFolder = folderId;
            db.collection("shared_folders").doc(folderId).collection("students").get().then(snap => {
                if (window.currentSharedFolderId !== rosterFolder) return;
                const roster = [];
                snap.forEach(d => { const st = d.data(); st.studentId = d.id; roster.push(st); });
                window._teacherQuizRoster = roster;
                renderTeacherQuizProgress();
            }).catch(err => console.warn("Không tải được danh sách học viên:", err && err.message));
        } else {
            if (studentWS) studentWS.style.display = 'block';
            if (teacherWS) teacherWS.style.display = 'none';

            const studentUid = window.currentUserUid;
            if (studentUid) {
                _studentSubmissionUnsub = db.collection("shared_folders").doc(folderId)
                    .collection("exercises").doc(exerciseDocId).collection("submissions").doc(studentUid)
                    .onSnapshot(doc => {
                        renderStudentSubmissionView(doc.exists ? doc.data() : null);
                    }, err => {
                        console.error("Lỗi onSnapshot student submission:", err);
                    });
            }
        }
    };

    // Chuyển đổi giữa 3 Tab: Từ vựng, Ngữ pháp & Bài tập trong bài học
    window.switchLessonSubTab = function (tab) {
        const vBtn = document.getElementById('tabLessonVocabBtn');
        const gBtn = document.getElementById('tabLessonGrammarBtn');
        const eBtn = document.getElementById('tabLessonExerciseBtn');
        const vContent = document.getElementById('vocabSubTabContent');
        const gContent = document.getElementById('grammarSubTabContent');
        const eContent = document.getElementById('exerciseSubTabContent');
        const fabContainer = document.getElementById('fabContainer');

        if (tab === 'exercise') {
            if (vBtn) vBtn.classList.remove('active');
            if (gBtn) gBtn.classList.remove('active');
            if (eBtn) eBtn.classList.add('active');
            if (vContent) vContent.style.display = 'none';
            if (gContent) gContent.style.display = 'none';
            if (eContent) eContent.style.display = 'block';
            if (fabContainer) fabContainer.style.display = 'none';
        } else if (tab === 'grammar') {
            if (vBtn) vBtn.classList.remove('active');
            if (eBtn) eBtn.classList.remove('active');
            if (gBtn) gBtn.classList.add('active');
            if (vContent) vContent.style.display = 'none';
            if (eContent) eContent.style.display = 'none';
            if (gContent) gContent.style.display = 'block';
            if (fabContainer) fabContainer.style.display = 'none';
        } else {
            if (gBtn) gBtn.classList.remove('active');
            if (eBtn) eBtn.classList.remove('active');
            if (vBtn) vBtn.classList.add('active');
            if (gContent) gContent.style.display = 'none';
            if (eContent) eContent.style.display = 'none';
            if (vContent) vContent.style.display = 'block';
            if (fabContainer) fabContainer.style.display = '';
        }
    };

    // Helper: Escape HTML string
    function escapeHtml(text) {
        if (text === null || text === undefined || text === '') return '';
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    // Helper: Định dạng thời gian
    function formatTimestamp(ts) {
        if (!ts) return 'Vừa xong';
        try {
            const date = ts.toDate ? ts.toDate() : new Date(ts);
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
                   date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return 'Vừa xong';
        }
    }

    // Helper: Chuyển text bài nộp thành các đoạn văn bản HTML để chấm inline
    function textToParagraphsHtml(text) {
        if (!text) return '<p></p>';
        const lines = text.split('\n');
        return lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '<p><br></p>';
            return `<p>${escapeHtml(line)}</p>`;
        }).join('');
    }

    // =========================================================================
    // BÀI TẬP BUỔI HỌC (TAB DUY NHẤT: ĐỀ BÀI + BÀI LÀM + CHẤM ĐIỂM GOOGLE DOCS)
    // =========================================================================

    // Hiển thị Khung Đề bài tập
    function renderExercisePromptView(exerciseData) {
        const bodyEl = document.getElementById('exercisePromptBody');
        const badgeEl = document.getElementById('tabExerciseBadge');
        const actionsSlot = document.getElementById('exercisePromptActions');
        const topActionsSlot = document.getElementById('exerciseActionButtonsSlot');

        if (!bodyEl) return;

        // Ghi lại bài làm đang dở của đề cũ trước khi vẽ lại khung đề
        flushQuizSave();
        _quizPersist = null;
        // Giáo viên: hiện/ẩn bảng tiến độ bài tập tương tác theo loại đề hiện tại
        if (isTeacher()) renderTeacherQuizProgress();

        const hasPrompt = !!(exerciseData && exerciseData.promptHtml && exerciseData.promptHtml.trim());
        const isInteractive = !!(exerciseData && (
            (Array.isArray(exerciseData.quiz) && exerciseData.quiz.length > 0) ||
            (exerciseData.promptHtml && /class="quiz-(?:section|q|translate-card)"/.test(exerciseData.promptHtml))
        ));

        if (hasPrompt) {
            if (badgeEl) badgeEl.innerHTML = '<span style="color:#10b981;font-weight:900;margin-left:2px;" title="Đã có đề bài tập">✓</span>';
            bodyEl.innerHTML = exerciseData.promptHtml;
            if (isInteractive && !isTeacher()) {
                // Học viên: khôi phục bài làm đã lưu + tự động lưu tiến độ
                setupQuizPersistence(bodyEl);
            } else {
                initQuizInContainerVocab(bodyEl);
            }

            if (isTeacher()) {
                if (actionsSlot) {
                    actionsSlot.innerHTML = `
                        <button class="btn-edit" onclick="openEditExercisePromptModal()" style="padding:4px 12px;font-size:0.82em;">✏️ Sửa đề bài</button>
                        <button class="btn-icon-flat" onclick="deleteExercisePrompt()" title="Xóa đề bài" style="font-size:0.9em;color:#ef4444;padding:4px 8px;">🗑️</button>
                    `;
                }
                if (topActionsSlot) {
                    topActionsSlot.innerHTML = `
                        <button class="btn-create-list" onclick="openEditExercisePromptModal()" style="padding:6px 14px;font-size:0.82em;background:#0284c7;border:none;">✏️ Sửa đề bài</button>
                        <button class="btn-create-list" onclick="openExerciseImportModal()" style="padding:6px 14px;font-size:0.82em;background:linear-gradient(135deg, #059669, #10b981);border:none;">📥 Nhập bài tập (JSON)</button>
                        <button class="btn-create-list" onclick="exportLessonForGemini()" style="padding:6px 14px;font-size:0.82em;background:linear-gradient(135deg, #8b5cf6, #6d28d9);border:none;">🤖 Tạo Prompt Gemini</button>
                    `;
                }
            } else {
                if (actionsSlot) actionsSlot.innerHTML = '';
                if (topActionsSlot) topActionsSlot.innerHTML = '';

                // Với Học viên: Hiển thị card đề bài ở ngoài để xem tổng quan + Sticky bar làm bài cố định trên cùng
                const promptCard = document.getElementById('exercisePromptCard');
                if (promptCard) promptCard.style.display = 'block';

                const stickyHeader = document.getElementById('studentExerciseStickyHeader');
                const studentWS = document.getElementById('studentExerciseWorkspace');
                const editorArea = document.getElementById('studentEditorArea');

                if (isInteractive) {
                    // Bài tập tương tác (JSON): học viên trả lời trực tiếp — KHÔNG có nút "Làm bài / Nộp bài"
                    if (stickyHeader) stickyHeader.style.display = 'none';
                    if (studentWS) studentWS.style.display = 'none';
                    if (editorArea) editorArea.style.display = 'none';
                } else {
                    if (stickyHeader) {
                        stickyHeader.style.display = 'flex';
                        const lessonTitleEl = document.getElementById('studentStickyLessonTitle');
                        if (lessonTitleEl) lessonTitleEl.textContent = 'Bài tập: ' + (window.currentSharedLesson || 'Buổi học');
                    }
                    if (studentWS) studentWS.style.display = 'block';

                    // Ẩn khung soạn thảo cũ ở dưới để học viên làm bài trên popup chuyên nghiệp
                    if (editorArea) editorArea.style.display = 'none';
                }
            }
        } else {
            if (badgeEl) badgeEl.innerHTML = '';
            bodyEl.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #64748b;">
                    <div style="font-size: 2.2em; margin-bottom: 8px;">📝</div>
                    <div style="font-weight: 600; margin-bottom: 6px;">Chưa có đề bài tập nào cho buổi học này.</div>
                    ${isTeacher() ? '<button class="btn-create-list" onclick="openEditExercisePromptModal()" style="margin-top:12px;background:#0284c7;border:none;padding:8px 20px;font-size:0.85em;">📝 + Dán đề bài tập từ Google Docs</button>' : '<div style="font-size:0.9em;color:#94a3b8;">Giáo viên chưa đăng đề bài cho buổi học này.</div>'}
                </div>
            `;
            const promptCard = document.getElementById('exercisePromptCard');
            if (promptCard) promptCard.style.display = 'block';

            if (!isTeacher()) {
                const studentWS = document.getElementById('studentExerciseWorkspace');
                if (studentWS) studentWS.style.display = 'none';
            }

            if (actionsSlot) actionsSlot.innerHTML = '';
            if (topActionsSlot) {
                if (isTeacher()) {
                    topActionsSlot.innerHTML = `
                        <button class="btn-create-list" onclick="openEditExercisePromptModal()" style="padding:6px 14px;font-size:0.82em;background:#0284c7;border:none;">📝 + Dán đề bài tập</button>
                        <button class="btn-create-list" onclick="openExerciseImportModal()" style="padding:6px 14px;font-size:0.82em;background:linear-gradient(135deg, #059669, #10b981);border:none;">📥 Nhập bài tập (JSON)</button>
                        <button class="btn-create-list" onclick="exportLessonForGemini()" style="padding:6px 14px;font-size:0.82em;background:linear-gradient(135deg, #8b5cf6, #6d28d9);border:none;">🤖 Tạo Prompt Gemini</button>
                    `;
                } else {
                    topActionsSlot.innerHTML = '';
                }
            }
        }
    }

    // =========================================================================
    // CÔNG CỤ SOẠN THẢO VÀ CHÈN Ô VÍ DỤ / GHI CHÚ NGANG (FULLSCREEN SHARED TOOL)
    // =========================================================================

    // Đảm bảo nạp CSS dùng chung cho Popup Fullscreen và Ô ví dụ
    function ensureGrammarEditorStyles() {
        if (document.getElementById('_grammarEditorStyles')) return;
        const style = document.createElement('style');
        style.id = '_grammarEditorStyles';
        style.textContent = `
            #_grammarFullScreenModal, #_exercisePromptModal, #_gradeSubmissionModal, #_studentDoExerciseModal, #_lessonNotesModal, #_combinedGrammarEditorModal, #_grammarImportModal {
                position: fixed;
                inset: 0;
                z-index: 999999;
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Pretendard', 'Inter', system-ui, -apple-system, sans-serif;
                color: #0f172a;
                animation: gfmFadeIn 0.2s ease-out;
            }
            @keyframes gfmFadeIn {
                from { opacity: 0; transform: scale(0.99); }
                to { opacity: 1; transform: scale(1); }
            }
            .gfm-container {
                background: #f8fafc;
                display: flex;
                flex-direction: column;
                width: 100vw;
                height: 100vh;
                overflow: hidden;
                box-shadow: 0 25px 60px rgba(0,0,0,0.4);
                transition: all 0.25s ease;
            }
            .gfm-container.is-windowed {
                width: 95vw;
                max-width: 1380px;
                height: 94vh;
                border-radius: 18px;
                border: 1px solid rgba(255,255,255,0.2);
            }
            /* Chế độ chia đôi màn hình: trình soạn thảo thu gọn nửa phải, lộ nội dung bên trái */
            #_lessonNotesModal.is-split {
                background: transparent !important;
                backdrop-filter: none !important;
                justify-content: flex-end !important;
                align-items: stretch !important;
                pointer-events: none !important;
            }
            #_lessonNotesModal.is-split .gfm-container {
                pointer-events: auto !important;
                width: 50vw !important;
                max-width: none !important;
                height: 100vh !important;
                height: 100dvh !important;
                border-radius: 0 !important;
                border: none !important;
                border-left: 2px solid rgba(255,255,255,0.25) !important;
                box-shadow: -16px 0 48px rgba(0,0,0,0.35) !important;
            }
            #_lessonNotesModal.is-split .gfm-editor-content {
                max-width: 100% !important;
                padding: 26px 28px !important;
            }
            .gfm-tool-btn.is-active {
                background: #e0e7ff !important;
                color: #4338ca !important;
            }
            /* Chia đôi: đẩy nội dung trang (wrapper/container) sang nửa trái để có 2 khung cạnh nhau */
            body.lesson-notes-split .wrapper,
            body.lesson-notes-split .container {
                width: 50vw !important;
                max-width: none !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                border-radius: 0 24px 24px 0 !important;
            }
            /* Chia đôi: đẩy navbar sang nửa trái */
            body.lesson-notes-split .global-nav {
                width: 50vw !important;
                max-width: none !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                border-radius: 0 20px 20px 0 !important;
            }
            body.lesson-notes-split .top-gradient-mask {
                right: auto !important;
                width: 50vw !important;
            }
            /* Chia đôi: các popup SweetAlert2 hiển thị trong nửa trái */
            body.lesson-notes-split .swal2-container,
            body.lesson-notes-split .swal2-backdrop {
                left: 0 !important;
                right: auto !important;
                width: 50vw !important;
            }
            /* Chia đôi: modal game vocab hiển thị trong nửa trái */
            body.lesson-notes-split .modal-overlay,
            body.lesson-notes-split #_grammarVocabViewer,
            body.lesson-notes-split #_grammarLibraryModal,
            body.lesson-notes-split #_grammarLibPreviewModal {
                left: 0 !important;
                right: auto !important;
                width: 50vw !important;
            }
            @media (max-width: 768px) {
                #_lessonNotesModal.is-split .gfm-container {
                    width: 100vw !important;
                }
                body.lesson-notes-split .wrapper,
                body.lesson-notes-split .container,
                body.lesson-notes-split .global-nav {
                    width: 100vw !important;
                    border-radius: 16px !important;
                }
                body.lesson-notes-split .swal2-container,
                body.lesson-notes-split .swal2-backdrop,
                body.lesson-notes-split .modal-overlay,
                body.lesson-notes-split #_grammarVocabViewer,
                body.lesson-notes-split #_grammarLibraryModal,
                body.lesson-notes-split #_grammarLibPreviewModal {
                    width: 100vw !important;
                }
            }
            .gfm-header {
                padding: 6px 16px;
                min-height: 44px;
                background: #ffffff;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                flex-shrink: 0;
            }
            .gfm-title-area {
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 0;
            }
            .gfm-badge {
                background: linear-gradient(135deg, #6366f1, #4f46e5);
                color: #ffffff;
                font-size: 0.72em;
                font-weight: 800;
                padding: 3px 8px;
                border-radius: 6px;
                letter-spacing: 0.5px;
                white-space: nowrap;
            }
            .gfm-badge-blue {
                background: linear-gradient(135deg, #0284c7, #0369a1) !important;
            }
            .gfm-badge-green {
                background: linear-gradient(135deg, #16a34a, #15803d) !important;
            }
            .gfm-tabs {
                display: flex;
                background: #f1f5f9;
                padding: 2px;
                border-radius: 8px;
                gap: 3px;
            }
            .gfm-tab-btn {
                background: transparent;
                border: none;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 0.82em;
                font-weight: 700;
                color: #64748b;
                cursor: pointer;
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            .gfm-tab-btn.active {
                background: #ffffff;
                color: #4f46e5;
                box-shadow: 0 2px 6px rgba(0,0,0,0.06);
            }
            .gfm-sub-bar {
                background: #ffffff;
                padding: 6px 20px;
                border-bottom: 1px solid #e2e8f0;
                flex-shrink: 0;
            }
            .gfm-sub-bar-inner {
                max-width: 880px;
                margin: 0 auto;
                width: 100%;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .gfm-title-input {
                flex: 1;
                width: auto;
                min-width: 0;
                font-size: 0.96em;
                font-weight: 700;
                color: #0f172a;
                border: 1.5px solid #cbd5e1;
                border-radius: 8px;
                padding: 6px 12px;
                height: 36px;
                outline: none;
                transition: all 0.2s ease;
                font-family: inherit;
                background: #f8fafc;
                box-sizing: border-box;
            }
            .gfm-title-input:focus {
                border-color: #6366f1;
                background: #ffffff;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
            }
            .gfm-workspace {
                display: flex;
                flex: 1;
                min-height: 0;
                overflow: hidden;
                background: #f1f5f9;
            }
            .gfm-editor-col {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                background: #f1f5f9;
                width: 100%;
                overflow: hidden;
            }
            .gfm-toolbar {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 3px;
                padding: 5px 14px;
                background: #ffffff;
                border-bottom: 1px solid #e2e8f0;
                user-select: none;
                width: 100%;
                box-sizing: border-box;
            }
            .gfm-tool-group {
                display: inline-flex;
                align-items: center;
                gap: 2px;
                background: #ffffff;
                padding: 1px 3px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
            }
            .gfm-tool-sep {
                width: 1px;
                height: 18px;
                background: #cbd5e1;
                margin: 0 3px;
            }
            .gfm-tool-btn {
                background: transparent;
                border: none;
                border-radius: 5px;
                padding: 4px 7px;
                font-size: 0.82em;
                font-weight: 700;
                color: #334155;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 28px;
                height: 28px;
                transition: all 0.15s ease;
            }
            .gfm-tool-btn:hover {
                background: #e2e8f0;
                color: #0f172a;
            }
            .gfm-tool-btn:active {
                background: #cbd5e1;
            }
            .gfm-select {
                border: none;
                background: transparent;
                padding: 3px 5px;
                font-size: 0.82em;
                font-weight: 600;
                color: #334155;
                outline: none;
                cursor: pointer;
                border-radius: 5px;
            }
            .gfm-select:hover {
                background: #f1f5f9;
            }
            .gfm-editor-scroll-wrap {
                flex: 1;
                overflow-y: auto;
                padding: 22px 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
                box-sizing: border-box;
            }
            .gfm-editor-content {
                display: block;
                width: 100%;
                max-width: 880px;
                min-height: 100%;
                height: auto;
                flex-shrink: 0;
                margin: 0 auto 30px auto;
                padding: 32px 40px;
                font-size: 1.15em;
                line-height: 1.85;
                color: #1e293b;
                outline: none;
                word-break: break-word;
                background: #ffffff;
                border-radius: 14px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
                box-sizing: border-box;
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .gfm-editor-content:focus {
                border-color: #cbd5e1;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07);
            }
            .gfm-editor-content:empty:before {
                content: attr(placeholder);
                color: #94a3b8;
                font-style: italic;
            }
            .gfm-footer {
                padding: 12px 24px;
                background: #ffffff;
                border-top: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-shrink: 0;
            }
            .gfm-preview-wrapper {
                flex: 1;
                overflow-y: auto;
                padding: 30px;
                background: #f1f5f9;
                display: flex;
                justify-content: center;
            }
            .gfm-preview-card {
                background: #ffffff;
                border-radius: 16px;
                border: 2px solid #e2e8f0;
                border-left: 6px solid #6366f1;
                padding: 26px 30px;
                max-width: 860px;
                width: 100%;
                box-shadow: 0 10px 30px rgba(0,0,0,0.06);
                align-self: flex-start;
            }
            /* Popover chọn màu sắc ô ví dụ khi ấn giữ */
            .gfm-color-popover {
                position: fixed;
                z-index: 1000005;
                background: #ffffff;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                padding: 8px 10px;
                box-shadow: 0 12px 32px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 200px;
                animation: gfmPopIn 0.15s ease-out;
            }
            @keyframes gfmPopIn {
                from { opacity: 0; transform: translateY(-6px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .gfm-color-popover-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 7px 10px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.86em;
                font-weight: 700;
                color: #334155;
                background: transparent;
                border: none;
                text-align: left;
                width: 100%;
                transition: background 0.12s ease;
            }
            .gfm-color-popover-item:hover {
                background: #f1f5f9;
            }
            .gfm-color-dot {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 2px solid #fff;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
                flex-shrink: 0;
            }

            /* Ô Ví Dụ Ngang Highlight Trong Nội Dung */
            .grammar-example-box {
                margin: 14px 0;
                padding: 14px 18px;
                background: #f0fdf4;
                border: 1.5px solid #86efac;
                border-left: 5px solid #10b981;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);
                transition: all 0.2s ease;
                position: relative;
            }
            .grammar-example-box:hover {
                box-shadow: 0 4px 14px rgba(16, 185, 129, 0.16);
            }
            .grammar-example-box.theme-blue {
                background: #f0f9ff;
                border-color: #7dd3fc;
                border-left-color: #0284c7;
                box-shadow: 0 2px 8px rgba(2, 132, 199, 0.08);
            }
            .grammar-example-box.theme-blue:hover {
                box-shadow: 0 4px 14px rgba(2, 132, 199, 0.16);
            }
            .grammar-example-box.theme-purple {
                background: #faf5ff;
                border-color: #d8b4fe;
                border-left-color: #8b5cf6;
                box-shadow: 0 2px 8px rgba(139, 92, 246, 0.08);
            }
            .grammar-example-box.theme-purple:hover {
                box-shadow: 0 4px 14px rgba(139, 92, 246, 0.16);
            }
            .grammar-example-box.theme-amber {
                background: #fffbeb;
                border-color: #fde68a;
                border-left-color: #f59e0b;
                box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);
            }
            .grammar-example-box.theme-amber:hover {
                box-shadow: 0 4px 14px rgba(245, 158, 11, 0.16);
            }
            .grammar-example-box.theme-yellow {
                background: #fefce8;
                border-color: #fef08a;
                border-left-color: #eab308;
                box-shadow: 0 2px 8px rgba(234, 179, 8, 0.1);
            }
            .grammar-example-box.theme-yellow:hover {
                box-shadow: 0 4px 14px rgba(234, 179, 8, 0.18);
            }
            .grammar-example-box.theme-rose {
                background: #fff1f2;
                border-color: #fecdd3;
                border-left-color: #f43f5e;
                box-shadow: 0 2px 8px rgba(244, 63, 94, 0.1);
            }
            .grammar-example-box.theme-rose:hover {
                box-shadow: 0 4px 14px rgba(244, 63, 94, 0.18);
            }
            .grammar-example-box .example-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-weight: 800;
                font-size: 0.82em;
                color: #15803d;
                background: #dcfce7;
                padding: 3px 10px;
                border-radius: 8px;
                margin-bottom: 8px;
            }
            .grammar-example-box.theme-blue .example-badge {
                color: #0369a1;
                background: #e0f2fe;
            }
            .grammar-example-box.theme-purple .example-badge {
                color: #6d28d9;
                background: #f3e8ff;
            }
            .grammar-example-box.theme-amber .example-badge {
                color: #b45309;
                background: #fef3c7;
            }
            .grammar-example-box.theme-yellow .example-badge {
                color: #a16207;
                background: #fef9c3;
            }
            .grammar-example-box.theme-rose .example-badge {
                color: #be123c;
                background: #ffe4e6;
            }
            .grammar-example-box .example-kr {
                font-size: 1.1em;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 5px;
                line-height: 1.6;
            }
            .grammar-example-box .example-vn {
                font-size: 0.96em;
                color: #334155;
                line-height: 1.5;
            }
            .grammar-example-box .example-content {
                outline: none;
                min-height: 24px;
                line-height: 1.7;
                font-size: 1.05em;
                color: #1e293b;
                word-break: break-word;
            }
            .grammar-example-box .example-content p {
                margin: 4px 0;
            }
            .grammar-example-box .example-content b,
            .grammar-example-box .example-content strong {
                font-weight: 700;
            }
            body.dark-mode .grammar-example-box .example-content {
                color: #f1f5f9 !important;
            }

            /* Google Docs style suggestions */
            .doc-strike {
                color: #ef4444 !important;
                text-decoration: line-through !important;
                background: #fee2e2 !important;
                padding: 1px 4px !important;
                border-radius: 3px !important;
                font-weight: 600 !important;
            }
            .doc-insert {
                color: #15803d !important;
                text-decoration: none !important;
                background: #dcfce7 !important;
                padding: 1px 5px !important;
                border-radius: 3px !important;
                font-weight: 700 !important;
                border-bottom: 2px solid #16a34a !important;
            }
            .doc-comment {
                background: #fef3c7 !important;
                color: #92400e !important;
                padding: 2px 7px !important;
                border-radius: 4px !important;
                font-size: 0.88em !important;
                font-style: italic !important;
                border-left: 3px solid #f59e0b !important;
                display: inline-block !important;
                margin: 2px 4px !important;
            }

            /* Nút mở rộng công cụ cho toolbar gọn gàng */
            .sdm-tool-toggle-btn {
                background: #ffffff;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 4px 10px;
                font-size: 0.82em;
                font-weight: 700;
                color: #334155;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                transition: all 0.15s ease;
                white-space: nowrap;
            }
            .sdm-tool-toggle-btn:hover {
                background: #f1f5f9;
                color: #0f172a;
                border-color: #94a3b8;
            }
            .sdm-tool-toggle-btn.active {
                background: #e0f2fe !important;
                color: #0284c7 !important;
                border-color: #0284c7 !important;
                box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
            }
            .sdm-sub-tool-panel {
                background: #f8fafc;
                border-bottom: 1.5px solid #e2e8f0;
                padding: 8px 14px;
                animation: gfmPopIn 0.15s ease-out;
            }
            .sdm-sub-panel-close-btn {
                background: transparent;
                border: none;
                font-size: 0.95em;
                color: #94a3b8;
                cursor: pointer;
                margin-left: auto;
                padding: 4px 8px;
                border-radius: 6px;
            }
            .sdm-sub-panel-close-btn:hover {
                background: #e2e8f0;
                color: #ef4444;
            }

            /* Responsive tối ưu cho điện thoại di động */
            @media (max-width: 768px) {
                #_studentDoExerciseModal, #_grammarFullScreenModal, #_exercisePromptModal, #_gradeSubmissionModal, #_lessonNotesModal, #_combinedGrammarEditorModal, #_grammarImportModal {
                    padding: 0 !important;
                }
                .gfm-container {
                    width: 100vw !important;
                    height: 100% !important;
                    height: 100dvh !important;
                    border-radius: 0 !important;
                }
                .gfm-header {
                    padding: 8px 12px !important;
                    flex-wrap: wrap !important;
                    gap: 6px !important;
                }
                .gfm-title-area {
                    gap: 6px !important;
                    flex: 1 1 auto !important;
                }
                .sdm-folder-pill, .sdm-fullscreen-btn {
                    display: none !important;
                }
                .gfm-tabs {
                    width: 100% !important;
                    order: 3 !important;
                    margin-top: 2px !important;
                }
                .gfm-tab-btn {
                    flex: 1 !important;
                    justify-content: center !important;
                    padding: 6px 6px !important;
                    font-size: 0.82em !important;
                }
                .sdm-toolbar-main {
                    padding: 5px 8px !important;
                    overflow-x: auto !important;
                    white-space: nowrap !important;
                    flex-wrap: nowrap !important;
                    -webkit-overflow-scrolling: touch !important;
                    scrollbar-width: none !important;
                }
                .sdm-toolbar-main::-webkit-scrollbar {
                    display: none !important;
                }
                .sdm-tool-toggle-btn {
                    padding: 4px 8px !important;
                    font-size: 0.78em !important;
                }
                .gfm-tool-btn {
                    min-width: 28px !important;
                    height: 28px !important;
                    padding: 3px 6px !important;
                    font-size: 0.82em !important;
                }
                .sdm-sub-tool-panel {
                    padding: 6px 10px !important;
                }
                .gfm-editor-scroll-wrap {
                    padding: 0 !important;
                }
                .gfm-editor-content {
                    padding: 14px 14px !important;
                    font-size: 1.05em !important;
                    line-height: 1.65 !important;
                    border-radius: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    min-height: 280px !important;
                }
                .gfm-footer {
                    padding: 8px 10px !important;
                    flex-direction: column !important;
                    gap: 6px !important;
                }
                .sdm-footer-guide {
                    display: none !important;
                }
                .sdm-footer-btn-group {
                    width: 100% !important;
                    display: flex !important;
                    gap: 6px !important;
                    align-items: center !important;
                }
                .sdm-footer-btn-group button {
                    flex: 1 !important;
                    padding: 9px 4px !important;
                    font-size: 0.82em !important;
                    border-radius: 8px !important;
                    text-align: center !important;
                    justify-content: center !important;
                }
                #sdmSubmitBtn {
                    flex: 1.25 !important;
                    font-weight: 800 !important;
                }
                #studentExerciseStickyHeader {
                    padding: 8px 12px !important;
                    margin-bottom: 12px !important;
                    gap: 8px !important;
                }
                #studentExerciseStickyHeader > div:first-child {
                    gap: 8px !important;
                }
                #studentStickyLessonTitle {
                    font-size: 0.92em !important;
                }
                #btnOpenStudentExerciseModal {
                    padding: 7px 16px !important;
                    font-size: 0.88em !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /* =========================================================================
       BỘ GÕ TIẾNG VIỆT TELEX TÍCH HỢP & BẢO VỆ CHỐNG XUNG ĐỘT TIẾNG HÀN / TIẾNG VIỆT
       Cho phép người dùng để EVKey/UniKey ở chế độ E, chỉ cần bấm Alt để đổi giữa
       가 (Hàn) và A (Việt) mà không cần ấn Ctrl + Shift.
       Đồng thời có lớp bảo vệ chặn EVKey tự ý chèn dấu tiếng Việt vào chữ tiếng Hàn.
       ========================================================================= */
    const _TELEX_VOWEL_TABLE = {
        'a': ['a', 'á', 'à', 'ả', 'ã', 'ạ'],
        'ă': ['ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ'],
        'â': ['â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ'],
        'e': ['e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ'],
        'ê': ['ê', 'ế', 'ề', 'ể', 'ễ', 'ệ'],
        'i': ['i', 'í', 'ì', 'ỉ', 'ĩ', 'ị'],
        'o': ['o', 'ó', 'ò', 'ỏ', 'õ', 'ọ'],
        'ô': ['ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ'],
        'ơ': ['ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ'],
        'u': ['u', 'ú', 'ù', 'ủ', 'ũ', 'ụ'],
        'ư': ['ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự'],
        'y': ['y', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ']
    };

    const _TELEX_CHAR_MAP = {};
    for (const [base, row] of Object.entries(_TELEX_VOWEL_TABLE)) {
        row.forEach((ch, tone) => {
            _TELEX_CHAR_MAP[ch] = { base, tone, upper: false };
            _TELEX_CHAR_MAP[ch.toUpperCase()] = { base, tone, upper: true };
        });
    }

    const _TELEX_TONE_KEYS = {
        's': 1, 'S': 1,
        'f': 2, 'F': 2,
        'r': 3, 'R': 3,
        'x': 4, 'X': 4,
        'j': 5, 'J': 5,
        'z': 0, 'Z': 0
    };

    function _isVowel(c) {
        return !!_TELEX_CHAR_MAP[c];
    }
    function _getBase(c) {
        return _TELEX_CHAR_MAP[c] ? _TELEX_CHAR_MAP[c].base : c.toLowerCase();
    }
    function _getTone(c) {
        return _TELEX_CHAR_MAP[c] ? _TELEX_CHAR_MAP[c].tone : 0;
    }
    function _makeChar(base, tone, upper) {
        if (!_TELEX_VOWEL_TABLE[base]) return base;
        const res = _TELEX_VOWEL_TABLE[base][tone] || base;
        return upper ? res.toUpperCase() : res;
    }

    function _findToneVowelIndex(word) {
        const vowelIndices = [];
        for (let i = 0; i < word.length; i++) {
            if (_isVowel(word[i])) vowelIndices.push(i);
        }
        if (vowelIndices.length === 0) return -1;
        if (vowelIndices.length === 1) return vowelIndices[0];

        const vStr = vowelIndices.map(i => _getBase(word[i])).join('');
        const lastVowelIdx = vowelIndices[vowelIndices.length - 1];
        const hasEndingConsonant = lastVowelIdx < word.length - 1;

        if (vowelIndices.length >= 3) {
            if (vStr.startsWith('uye') || vStr.startsWith('uyê')) {
                return vowelIndices[2];
            }
            return vowelIndices[1];
        }

        if (vowelIndices.length === 2) {
            const v1 = _getBase(word[vowelIndices[0]]);
            const v2 = _getBase(word[vowelIndices[1]]);

            if (hasEndingConsonant) {
                return vowelIndices[1];
            } else {
                if ((v1 === 'o' && (v2 === 'a' || v2 === 'e')) || (v1 === 'u' && v2 === 'y')) {
                    return vowelIndices[1];
                }
                if (v2 === 'ê' || v2 === 'ô' || v2 === 'ơ') {
                    return vowelIndices[1];
                }
                if (v2 === 'a') {
                    return vowelIndices[0];
                }
                return vowelIndices[0];
            }
        }
        return vowelIndices[0];
    }

    function _processVietnameseTelex(word, key) {
        if (!word) return null;
        if (/[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]/.test(word)) return null;

        const lowerKey = key.toLowerCase();
        const lastChar = word[word.length - 1];
        const lastBase = _getBase(lastChar);
        const isUpper = lastChar === lastChar.toUpperCase() && lastChar !== lastChar.toLowerCase();

        // 1. Dấu thanh: s, f, r, x, j, z
        if (_TELEX_TONE_KEYS[lowerKey] !== undefined) {
            const targetTone = _TELEX_TONE_KEYS[lowerKey];
            const toneVowelIdx = _findToneVowelIndex(word);

            if (toneVowelIdx !== -1) {
                let existingTone = 0;
                for (let i = 0; i < word.length; i++) {
                    const t = _getTone(word[i]);
                    if (t > 0) { existingTone = t; break; }
                }

                if (existingTone === targetTone && targetTone !== 0) {
                    let clean = '';
                    for (let i = 0; i < word.length; i++) {
                        if (_isVowel(word[i])) {
                            const info = _TELEX_CHAR_MAP[word[i]];
                            clean += _makeChar(info.base, 0, info.upper);
                        } else {
                            clean += word[i];
                        }
                    }
                    return clean + key;
                }

                let newWord = '';
                for (let i = 0; i < word.length; i++) {
                    if (i === toneVowelIdx) {
                        const info = _TELEX_CHAR_MAP[word[i]];
                        newWord += _makeChar(info.base, targetTone, info.upper);
                    } else if (_isVowel(word[i])) {
                        const info = _TELEX_CHAR_MAP[word[i]];
                        newWord += _makeChar(info.base, 0, info.upper);
                    } else {
                        newWord += word[i];
                    }
                }
                return newWord;
            }
        }

        // 2. dd -> đ
        if (lowerKey === 'd') {
            if (lastBase === 'd') {
                return word.slice(0, -1) + (isUpper ? 'Đ' : 'đ');
            } else if (lastChar === 'đ' || lastChar === 'Đ') {
                return word.slice(0, -1) + (isUpper ? 'DD' : 'dd');
            }
        }

        // aa -> â, ee -> ê, oo -> ô
        if (lowerKey === 'a') {
            const tone = _getTone(lastChar);
            if (lastBase === 'a') {
                return word.slice(0, -1) + _makeChar('â', tone, isUpper);
            } else if (lastBase === 'â') {
                return word.slice(0, -1) + _makeChar('a', tone, isUpper) + key;
            }
        }

        if (lowerKey === 'e') {
            const tone = _getTone(lastChar);
            if (lastBase === 'e') {
                return word.slice(0, -1) + _makeChar('ê', tone, isUpper);
            } else if (lastBase === 'ê') {
                return word.slice(0, -1) + _makeChar('e', tone, isUpper) + key;
            }
        }

        if (lowerKey === 'o') {
            if (lastBase === 'ư') {
                const tone = _getTone(lastChar);
                return word.slice(0, -1) + _makeChar('ư', 0, isUpper) + _makeChar('ơ', tone, key === 'O');
            }
            const tone = _getTone(lastChar);
            if (lastBase === 'o') {
                return word.slice(0, -1) + _makeChar('ô', tone, isUpper);
            } else if (lastBase === 'ô') {
                return word.slice(0, -1) + _makeChar('o', tone, isUpper) + key;
            }
        }

        // 'w' transformations:
        if (lowerKey === 'w') {
            if (word.length >= 3) {
                const p3 = _getBase(word[word.length - 3]);
                const p2 = _getBase(word[word.length - 2]);
                const p1 = _getBase(word[word.length - 1]);
                if ((p3 === 'u' || p3 === 'ư') && (p2 === 'o' || p2 === 'ơ') && (p1 === 'i')) {
                    const u3 = word[word.length - 3] === word[word.length - 3].toUpperCase();
                    const u2 = word[word.length - 2] === word[word.length - 2].toUpperCase();
                    const t = _getTone(word[word.length - 2]) || _getTone(word[word.length - 3]);
                    return word.slice(0, -3) + _makeChar('ư', 0, u3) + _makeChar('ơ', t, u2) + word[word.length - 1];
                }
            }
            if (word.length >= 2) {
                const prev2 = _getBase(word[word.length - 2]);
                const prev1 = _getBase(word[word.length - 1]);
                if ((prev2 === 'u' && (prev1 === 'o' || prev1 === 'ơ')) || (prev2 === 'ư' && (prev1 === 'o' || prev1 === 'ơ'))) {
                    const t1 = _getTone(word[word.length - 2]);
                    const t2 = _getTone(word[word.length - 1]);
                    const u1 = word[word.length - 2] === word[word.length - 2].toUpperCase();
                    const u2 = word[word.length - 1] === word[word.length - 1].toUpperCase();
                    return word.slice(0, -2) + _makeChar('ư', t1, u1) + _makeChar('ơ', t2, u2);
                }
                if (prev2 === 'u' && prev1 === 'a') {
                    const t = _getTone(word[word.length - 1]);
                    const u1 = word[word.length - 2] === word[word.length - 2].toUpperCase();
                    return word.slice(0, -2) + _makeChar('ư', 0, u1) + _makeChar('a', t, isUpper);
                }
            }

            const tone = _getTone(lastChar);
            if (lastBase === 'a') {
                return word.slice(0, -1) + _makeChar('ă', tone, isUpper);
            } else if (lastBase === 'ă') {
                return word.slice(0, -1) + _makeChar('a', tone, isUpper) + key;
            } else if (lastBase === 'o') {
                return word.slice(0, -1) + _makeChar('ơ', tone, isUpper);
            } else if (lastBase === 'ơ') {
                return word.slice(0, -1) + _makeChar('o', tone, isUpper) + key;
            } else if (lastBase === 'u') {
                return word.slice(0, -1) + _makeChar('ư', tone, isUpper);
            } else if (lastBase === 'ư') {
                return word.slice(0, -1) + _makeChar('u', tone, isUpper) + key;
            } else {
                return word + (key === 'W' ? 'Ư' : 'ư');
            }
        }

        return null;
    }

    // Trạng thái bật/tắt bộ gõ Telex tích hợp
    window._webTelexEnabled = localStorage.getItem('web_telex_enabled') !== 'false';
    window._isKoreanComposing = false;
    window._lastKoreanTime = 0;

    window.toggleWebTelex = function () {
        window._webTelexEnabled = !window._webTelexEnabled;
        try {
            localStorage.setItem('web_telex_enabled', window._webTelexEnabled ? 'true' : 'false');
        } catch (e) {}
        updateAllTelexUI();
        if (typeof Swal !== 'undefined' && Swal.fire) {
            const toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2800,
                timerProgressBar: true
            });
            toast.fire({
                icon: window._webTelexEnabled ? 'success' : 'info',
                title: window._webTelexEnabled 
                    ? '🇻🇳 Đã bật Telex tích hợp! Bạn có thể để EVKey ở chữ E và dùng Alt để đổi Hàn - Việt' 
                    : '⚪ Đã tắt Telex tích hợp. Hãy dùng EVKey/UniKey bên ngoài.'
            });
        }
    };

    function updateAllTelexUI() {
        const btns = document.querySelectorAll('.gfm-telex-toggle-btn');
        btns.forEach(btn => {
            if (window._webTelexEnabled) {
                btn.style.background = '#eff6ff';
                btn.style.borderColor = '#3b82f6';
                btn.style.color = '#1d4ed8';
                btn.innerHTML = `<span class="telex-status-icon">🇻🇳</span><span class="telex-status-text">Telex: BẬT</span>`;
                btn.title = "Bộ gõ Telex tích hợp đang BẬT: Bạn có thể để EVKey ở chữ E, chỉ cần bấm Alt để đổi giữa gõ tiếng Hàn (가) và tiếng Việt (A)!";
            } else {
                btn.style.background = '#f1f5f9';
                btn.style.borderColor = '#cbd5e1';
                btn.style.color = '#64748b';
                btn.innerHTML = `<span class="telex-status-icon">⚪</span><span class="telex-status-text">Telex: TẮT</span>`;
                btn.title = "Bộ gõ Telex tích hợp đang TẮT. Bấm để bật lại.";
            }
        });
    }

    // --- GLOBAL KEYDOWN LISTENER: ESC TO EXIT & SMART TELEX ---
    function handleGlobalEscape(e) {
        if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
            // Nếu SweetAlert đang mở, để SweetAlert tự đóng trước
            const isSwalOpen = (typeof Swal !== 'undefined' && typeof Swal.isVisible === 'function' && Swal.isVisible())
                || !!document.querySelector('.swal2-container.swal2-shown');
            if (isSwalOpen) return;

            // Nếu popover bảng màu đang mở, đóng bảng màu trước
            const colorPopover = document.querySelector('.gfm-color-popover');
            if (colorPopover) {
                colorPopover.remove();
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Nếu thanh công cụ sửa câu hỏi chấm bài đang mở, đóng thanh đó trước
            const inlineBar = document.getElementById('inlineCorrectionActionBar');
            if (inlineBar && inlineBar.style.display !== 'none') {
                if (typeof window.cancelInlineAction === 'function') window.cancelInlineAction();
                else inlineBar.style.display = 'none';
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Danh sách các modal soạn thảo / cửa sổ học tập
            // (Tuyệt đối không dùng offsetParent vì position:fixed luôn trả về offsetParent = null trong DOM)
            const modals = [
                '_grammarLibraryModal',
                '_studentsProgressModal',
                '_lessonNotesModal',
                '_grammarFullScreenModal',
                '_combinedGrammarEditorModal',
                '_grammarImportModal',
                '_exercisePromptModal',
                '_studentDoExerciseModal',
                '_gradeSubmissionModal'
            ];

            for (const mid of modals) {
                const m = document.getElementById(mid);
                if (m && m.isConnected && m.style.display !== 'none') {
                    e.preventDefault();
                    e.stopPropagation();

                    if (mid === '_lessonNotesModal') {
                        const btn = document.getElementById('lnmCloseBtn') || document.getElementById('lnmCloseModalBtn');
                        if (btn) btn.click(); else m.remove();
                    } else if (mid === '_grammarFullScreenModal') {
                        const btn = document.getElementById('gfmCloseModalBtn') || document.getElementById('gfmCancelBtn');
                        if (btn) btn.click(); else m.remove();
                    } else if (mid === '_exercisePromptModal') {
                        const btn = document.getElementById('epmCloseModalBtn') || document.getElementById('epmCancelBtn');
                        if (btn) btn.click(); else m.remove();
                    } else if (mid === '_studentDoExerciseModal') {
                        const btn = document.getElementById('sdmCloseModalBtn') || document.getElementById('sdmCancelBtn');
                        if (btn) btn.click(); else m.remove();
                    } else if (mid === '_combinedGrammarEditorModal') {
                        const btn = document.getElementById('cgmCloseBtn');
                        if (btn) btn.click(); else m.remove();
                    } else {
                        m.remove();
                    }
                    return;
                }
            }
        }
    }

    window.addEventListener('keydown', handleGlobalEscape, true);
    document.addEventListener('keydown', handleGlobalEscape, true);

    document.addEventListener('keydown', function (e) {
        // 1. Phím Escape đã được xử lý bởi handleGlobalEscape
        if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) return;

        // 2. Bộ gõ Telex thông minh trong trình soạn thảo
        if (!window._webTelexEnabled) return;
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.isComposing || e.key === 'Process' || e.keyCode === 229) return;
        if (e.key.length !== 1) return;
        if (!/^[a-zA-Z]$/.test(e.key)) return;

        const target = e.target;
        if (!target) return;

        // Nếu đang gõ trong input text hoặc textarea
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            if (target.tagName === 'INPUT' && target.type !== 'text' && target.type !== 'search') return;
            const pos = target.selectionStart;
            if (pos === null || pos !== target.selectionEnd) return;
            const text = target.value;
            const textBefore = text.slice(0, pos);
            const match = textBefore.match(/([a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]+)$/);
            if (!match) return;
            const currentWord = match[1];
            const transformed = _processVietnameseTelex(currentWord, e.key);
            if (transformed !== null && transformed !== currentWord + e.key) {
                e.preventDefault();
                const wordStart = pos - currentWord.length;
                target.value = text.slice(0, wordStart) + transformed + text.slice(pos);
                const newPos = wordStart + transformed.length;
                target.setSelectionRange(newPos, newPos);
                target.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
        }

        // Nếu đang gõ trong contenteditable
        const editable = target.closest('[contenteditable="true"]');
        if (editable) {
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
            const node = sel.anchorNode;
            if (!node || node.nodeType !== Node.TEXT_NODE) return;

            const text = node.textContent;
            const offset = sel.anchorOffset;
            const textBefore = text.slice(0, offset);
            const match = textBefore.match(/([a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]+)$/);
            if (!match) return;

            const currentWord = match[1];
            const transformed = _processVietnameseTelex(currentWord, e.key);
            if (transformed !== null && transformed !== currentWord + e.key) {
                e.preventDefault();
                const wordStart = offset - currentWord.length;
                const newText = text.slice(0, wordStart) + transformed + text.slice(offset);
                node.textContent = newText;

                const newCaretPos = wordStart + transformed.length;
                const range = document.createRange();
                range.setStart(node, newCaretPos);
                range.setEnd(node, newCaretPos);
                sel.removeAllRanges();
                sel.addRange(range);

                editable.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }, true);

    // --- 3. KOREAN IME & EVKEY COLLISION GUARD ---
    const _HANGUL_CHARS_REGEX = /[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]/;
    const _VIETNAMESE_ACCENTS_REGEX = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđĐ]/i;

    document.addEventListener('compositionstart', function (e) {
        window._isKoreanComposing = true;
        window._lastKoreanTime = Date.now();
    }, true);

    document.addEventListener('compositionupdate', function (e) {
        window._isKoreanComposing = true;
        if (_HANGUL_CHARS_REGEX.test(e.data || '')) {
            window._lastKoreanTime = Date.now();
        }
    }, true);

    document.addEventListener('compositionend', function (e) {
        window._isKoreanComposing = false;
        if (_HANGUL_CHARS_REGEX.test(e.data || '')) {
            window._lastKoreanTime = Date.now();
        }
    }, true);

    document.addEventListener('beforeinput', function (e) {
        if (!e.data) return;
        if (_VIETNAMESE_ACCENTS_REGEX.test(e.data)) {
            const isRecentKorean = (Date.now() - (window._lastKoreanTime || 0)) < 700;
            if (window._isKoreanComposing || isRecentKorean) {
                e.preventDefault();
                return;
            }

            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const node = sel.anchorNode;
                if (node && node.nodeType === Node.TEXT_NODE) {
                    const textBefore = node.textContent.slice(0, sel.anchorOffset);
                    if (textBefore.length > 0 && _HANGUL_CHARS_REGEX.test(textBefore.slice(-1))) {
                        e.preventDefault();
                        return;
                    }
                }
            }
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                const el = e.target;
                const pos = el.selectionStart;
                if (pos !== null && pos > 0) {
                    const charBefore = el.value.charAt(pos - 1);
                    if (_HANGUL_CHARS_REGEX.test(charBefore)) {
                        e.preventDefault();
                        return;
                    }
                }
            }
        }
    }, true);

    /**
     * Khởi tạo tính năng Ô Ví Dụ Ngang + Chọn màu khi Ấn Giữ
     * @param {object} config - { btn, getEditor, getSavedRange, defaultBadge }
     */
    function setupHorizontalExampleTool(config) {
        const btn = config.btn;
        if (!btn) return;
        const getEditor = config.getEditor;
        const getSavedRange = config.getSavedRange;
        const defaultBadge = config.defaultBadge || '💡 Ví dụ minh họa';

        let activeColor = 'green';
        let pressTimer = null;
        let isLongPress = false;

        const colorMap = {
            green: { name: 'Xanh lá giáo trình', hex: '#10b981' },
            blue: { name: 'Xanh dương hiện đại', hex: '#0284c7' },
            purple: { name: 'Tím nổi bật', hex: '#8b5cf6' },
            amber: { name: 'Cam ấm áp', hex: '#f59e0b' },
            yellow: { name: 'Vàng dạ quang', hex: '#eab308' },
            rose: { name: 'Đỏ hồng lưu ý', hex: '#f43f5e' }
        };

        const dot = btn.querySelector('.gfm-color-dot-indicator');
        function updateDot(c) {
            activeColor = c;
            if (dot && colorMap[c]) {
                dot.style.background = colorMap[c].hex;
                dot.style.boxShadow = `0 0 0 1px ${colorMap[c].hex}`;
            }
        }

        // Chèn 1 ô ngang ví dụ vào vị trí con trỏ
        function insertBox() {
            const editor = getEditor();
            if (!editor) return;
            editor.focus();

            if (typeof getSavedRange === 'function') {
                const r = getSavedRange();
                if (r) {
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(r);
                }
            }

            const sel = window.getSelection();
            let selectedHtml = '';
            let hasSelection = false;

            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (editor.contains(range.commonAncestorContainer) && !range.collapsed) {
                    hasSelection = true;
                    // Lấy chính xác HTML bao gồm in đậm <b>, <strong> và các thẻ xuống dòng <p>, <br>, <div>
                    const fragment = range.cloneContents();
                    const tempDiv = document.createElement("div");
                    tempDiv.appendChild(fragment);
                    selectedHtml = tempDiv.innerHTML.trim();

                    // Nếu text được chọn là văn bản thuần có dấu xuống dòng \n nhưng không có thẻ xuống dòng
                    if (selectedHtml && !/<(p|br|div|h[1-6]|li|tr|table)\b/i.test(selectedHtml) && selectedHtml.includes('\n')) {
                        selectedHtml = selectedHtml.replace(/\r?\n/g, '<br>');
                    }
                }
            }

            // Nếu không có nội dung bôi đen: CHỈ HIỆN Ô TRỐNG (không có ví dụ sẵn)
            // Nếu có nội dung bôi đen: đưa nội dung vào ô ví dụ và giữ nguyên 100% in đậm và cách xuống dòng
            const innerContent = hasSelection ? selectedHtml : '<p><br></p>';

            const boxHtml = `
                <div class="grammar-example-box theme-${activeColor}" style="margin:14px 0;padding:14px 18px;border-radius:12px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;user-select:none;" contenteditable="false">
                        <span class="example-badge">${escapeHtml(defaultBadge)}</span>
                        <span style="font-size:0.75em;color:#64748b;font-weight:600;">(Ấn giữ nút trên thanh công cụ để đổi màu ô)</span>
                    </div>
                    <div class="example-content" style="outline:none;min-height:24px;line-height:1.7;font-size:1.05em;">${innerContent}</div>
                </div>
                <p><br></p>
            `;

            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (editor.contains(range.commonAncestorContainer)) {
                    range.deleteContents();
                    const temp = document.createElement("div");
                    temp.innerHTML = boxHtml;
                    const frag = document.createDocumentFragment();
                    let node, targetContentEl;
                    while ((node = temp.firstChild)) {
                        if (!targetContentEl && node.querySelector) {
                            targetContentEl = node.querySelector('.example-content');
                        }
                        frag.appendChild(node);
                    }
                    range.insertNode(frag);

                    // Đặt con trỏ soạn thảo vào ngay bên trong ô ví dụ
                    if (targetContentEl) {
                        const newRange = document.createRange();
                        newRange.selectNodeContents(targetContentEl);
                        newRange.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                    }
                    return;
                }
            }

            editor.insertAdjacentHTML('beforeend', boxHtml);
        }

        // Mở popover chọn màu sắc ô ví dụ
        function showColorPopover() {
            const old = document.getElementById('_gfmColorPopover');
            if (old) old.remove();

            const pop = document.createElement('div');
            pop.id = '_gfmColorPopover';
            pop.className = 'gfm-color-popover';

            const rect = btn.getBoundingClientRect();
            pop.style.top = (rect.bottom + 6) + 'px';
            pop.style.left = Math.max(10, Math.min(window.innerWidth - 220, rect.left)) + 'px';

            pop.innerHTML = `
                <div style="font-size:0.78em;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;padding:4px 6px 6px;border-bottom:1px solid #e2e8f0;margin-bottom:4px;">
                    🎨 Chọn màu sắc ô ví dụ
                </div>
                ${Object.keys(colorMap).map(k => `
                    <button type="button" class="gfm-color-popover-item" data-theme="${k}">
                        <span class="gfm-color-dot" style="background:${colorMap[k].hex};"></span>
                        <span style="flex:1;">${colorMap[k].name}</span>
                        ${k === activeColor ? '<span style="color:#10b981;font-weight:900;">✓</span>' : ''}
                    </button>
                `).join('')}
            `;

            document.body.appendChild(pop);

            pop.querySelectorAll('.gfm-color-popover-item').forEach(item => {
                item.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const chosen = item.dataset.theme;
                    updateDot(chosen);

                    // Nếu con trỏ đang nằm trong 1 ô ví dụ hiện có -> đổi màu ô đó luôn!
                    const editor = getEditor();
                    if (editor) {
                        const sel = window.getSelection();
                        if (sel && sel.anchorNode) {
                            let curr = sel.anchorNode;
                            while (curr && curr !== editor) {
                                if (curr.classList && curr.classList.contains('grammar-example-box')) {
                                    curr.className = curr.className.replace(/theme-[a-z]+/g, '').trim();
                                    curr.classList.add('theme-' + chosen);
                                    break;
                                }
                                curr = curr.parentNode;
                            }
                        }
                    }

                    if (typeof Swal !== 'undefined' && Swal.mixin) {
                        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1400 });
                        Toast.fire({ icon: 'success', title: `Đã chọn: ${colorMap[chosen].name}` });
                    }

                    pop.remove();
                });
            });

            setTimeout(() => {
                const closeHandler = (ev) => {
                    if (!pop.contains(ev.target) && ev.target !== btn && !btn.contains(ev.target)) {
                        pop.remove();
                        document.removeEventListener('click', closeHandler);
                    }
                };
                document.addEventListener('click', closeHandler);
            }, 50);
        }

        btn.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                showColorPopover();
            }, 350);
        });

        btn.addEventListener('mouseup', () => {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                insertBox();
            }
        });

        btn.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
        });

        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showColorPopover();
        });

        btn.addEventListener('touchstart', () => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                showColorPopover();
            }, 350);
        }, { passive: true });

        btn.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                insertBox();
            }
        });

        updateDot('green');
    }

    // Modal Giao / Sửa Đề bài tập Toàn Màn Hình (Fullscreen Rich Editor)
    window.openEditExercisePromptModal = function () {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedLesson) return;

        ensureGrammarEditorStyles();

        const modalId = '_exercisePromptModal';
        const old = document.getElementById(modalId);
        if (old) old.remove();

        const currentHtml = (window.currentSharedExercise && window.currentSharedExercise.promptHtml) || '';
        let isFullscreen = true;
        let activeTab = 'edit';
        let savedRange = null;

        const folderTitle = window.currentSharedFolderTitle || 'Thư mục giảng dạy';
        const lessonName = window.currentSharedLesson || 'Bài học';

        const overlay = document.createElement('div');
        overlay.id = modalId;

        overlay.innerHTML = `
            <div class="gfm-container" id="epmContainer">
                <!-- TOP HEADER -->
                <div class="gfm-header">
                    <div class="gfm-title-area">
                        <span class="gfm-badge gfm-badge-blue">📝 BÀI TẬP</span>
                        <span style="font-weight:700;font-size:0.9em;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHtml(folderTitle)} / <b style="color:#0284c7;">${escapeHtml(lessonName)}</b>
                        </span>
                    </div>

                    <!-- TABS: SOẠN THẢO & XEM TRƯỚC -->
                    <div class="gfm-tabs">
                        <button type="button" class="gfm-tab-btn active" id="epmTabEdit" onclick="_epmSwitchTab('edit')">
                            <span>✏️ Soạn đề bài</span>
                        </button>
                        <button type="button" class="gfm-tab-btn" id="epmTabPreview" onclick="_epmSwitchTab('preview')">
                            <span>👁️ Xem trước</span>
                        </button>
                    </div>

                    <!-- WINDOW ACTIONS -->
                    <div style="display:flex;align-items:center;gap:4px;">
                        <button type="button" class="gfm-tool-btn" id="epmToggleFullscreenBtn" title="Phóng to / Thu nhỏ" style="font-size:1.05em;padding:3px 6px;">
                            ⛶
                        </button>
                        <button type="button" class="gfm-tool-btn" id="epmCloseModalBtn" title="Đóng cửa sổ" style="font-size:1.25em;color:#ef4444;padding:3px 6px;">
                            &times;
                        </button>
                    </div>
                </div>

                <!-- WORKSPACE -->
                <div class="gfm-workspace" id="epmWorkspace">
                    <div class="gfm-editor-col">
                        <!-- TOOLBAR -->
                        <div class="gfm-toolbar" id="epmToolbar">
                            <!-- FONT FAMILY -->
                            <div class="gfm-tool-group" title="Chọn Font chữ">
                                <select id="epmFontFamily" class="gfm-select">
                                    <option value="'Pretendard', sans-serif">Pretendard (Chuẩn)</option>
                                    <option value="'Nanum Gothic', sans-serif">Nanum Gothic (나눔고딕)</option>
                                    <option value="'Nanum Myeongjo', serif">Nanum Myeongjo (나눔명조)</option>
                                    <option value="Inter, sans-serif">Inter</option>
                                    <option value="Roboto, sans-serif">Roboto</option>
                                    <option value="Arial, sans-serif">Arial</option>
                                    <option value="'Times New Roman', serif">Times New Roman</option>
                                    <option value="'Courier New', monospace">Courier New</option>
                                </select>
                            </div>

                            <!-- FONT SIZE -->
                            <div class="gfm-tool-group" title="Kích thước chữ">
                                <select id="epmFontSize" class="gfm-select">
                                    <option value="14px">14px - Nhỏ</option>
                                    <option value="16px">16px - Vừa</option>
                                    <option value="18px" selected>18px - Chuẩn</option>
                                    <option value="20px">20px - Lớn</option>
                                    <option value="24px">24px - Tiêu đề 3</option>
                                    <option value="28px">28px - Tiêu đề 2</option>
                                </select>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- TEXT COLOR -->
                            <div class="gfm-tool-group" title="Màu chữ">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Chữ:</span>
                                <input type="color" id="epmTextColorPicker" value="#0f172a" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu chữ">
                                <button type="button" class="gfm-tool-btn" data-color="#dc2626" style="color:#dc2626;padding:2px 4px;font-size:0.82em;">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#0284c7" style="color:#0284c7;padding:2px 4px;font-size:0.82em;">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#16a34a" style="color:#16a34a;padding:2px 4px;font-size:0.82em;">A</button>
                            </div>

                            <!-- HIGHLIGHT COLOR -->
                            <div class="gfm-tool-group" title="Màu nền / Highlight">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Nền:</span>
                                <input type="color" id="epmBgColorPicker" value="#fef08a" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu nền">
                                <button type="button" class="gfm-tool-btn" data-bg="#fef08a" style="background:#fef08a;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Vàng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bae6fd" style="background:#bae6fd;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bbf7d0" style="background:#bbf7d0;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh lá nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="transparent" style="font-size:0.75em;color:#64748b;padding:2px 4px;" title="Xóa nền">✕</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- NÚT CHÈN Ô VÍ DỤ / GHI CHÚ NGANG -->
                            <button type="button" class="gfm-tool-btn" id="epmInsertExampleBtn"
                                    title="Bấm: Chèn ô ví dụ / ghi chú | Ấn giữ: Chọn màu sắc ô"
                                    style="background:#f0fdf4;border:1.5px solid #10b981;color:#15803d;padding:3px 9px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:5px;border-radius:6px;cursor:pointer;">
                                <span>💡 Ô ví dụ / Ghi chú</span>
                                <span class="gfm-color-dot-indicator" style="width:9px;height:9px;border-radius:50%;background:#10b981;border:1px solid #fff;box-shadow:0 0 0 1px #10b981;"></span>
                                <span style="font-size:0.7em;opacity:0.7;">▾</span>
                            </button>

                            <span class="gfm-tool-sep"></span>

                            <!-- BASIC STYLES -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="bold" title="In đậm (Ctrl+B)"><b>B</b></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="italic" title="In nghiêng (Ctrl+I)"><i>I</i></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="underline" title="Gạch chân (Ctrl+U)"><u>U</u></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button>
                            </div>

                            <!-- ALIGNMENTS -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyLeft" title="Căn trái">⇤</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyCenter" title="Căn giữa">≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyRight" title="Căn phải">⇥</button>
                            </div>

                            <!-- LISTS -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertUnorderedList" title="Danh sách chấm tròn">•≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="insertOrderedList" title="Danh sách số 1,2,3">1≡</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- UTILITIES -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertHorizontalRule" title="Đường kẻ ngang">―</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="removeFormat" title="Xóa định dạng" style="color:#ef4444;">Tx</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="undo" title="Hoàn tác (Ctrl+Z)">↶</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="redo" title="Làm lại (Ctrl+Y)">↷</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- BỘ GÕ TELEX TÍCH HỢP -->
                            <button type="button" class="gfm-tool-btn gfm-telex-toggle-btn" onclick="window.toggleWebTelex()"
                                    title="Bộ gõ Telex tích hợp: Khi bật, bạn có thể để EVKey ở chữ E, chỉ cần bấm Alt để đổi giữa gõ tiếng Hàn (가) và tiếng Việt (A)!"
                                    style="background:#eff6ff;border:1.5px solid #3b82f6;color:#1d4ed8;padding:3px 8px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:4px;border-radius:6px;cursor:pointer;">
                                <span class="telex-status-icon">🇻🇳</span>
                                <span class="telex-status-text">Telex: BẬT</span>
                            </button>
                        </div>

                        <!-- MAIN CONTENT EDITABLE (CENTERED CANVAS) -->
                        <div class="gfm-editor-scroll-wrap">
                            <div id="exercisePromptPasteBox" class="gfm-editor-content" contenteditable="true"
                                 placeholder="Dán đề bài từ Google Docs/Word (Ctrl+V) hoặc gõ trực tiếp câu hỏi, bài dịch, bài tập tại đây...">${currentHtml}</div>
                        </div>
                    </div>
                </div>

                <!-- PREVIEW CONTAINER -->
                <div class="gfm-preview-wrapper" id="epmStudentPreviewArea" style="display:none;">
                    <div class="gfm-preview-card" style="border-left-color:#0284c7;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                            <span class="gfm-badge gfm-badge-blue">📋 ĐỀ BÀI TẬP</span>
                            <h2 style="margin:0;font-size:1.3em;color:#0369a1;font-weight:800;">Bài học: ${escapeHtml(lessonName)}</h2>
                        </div>
                        <div id="epmStudentPrevBody" class="exercise-prompt-body" style="font-size:1.05em;line-height:1.8;">
                            Nội dung đề bài tập sẽ hiển thị tại đây...
                        </div>
                    </div>
                </div>

                <!-- FOOTER ACTIONS -->
                <div class="gfm-footer">
                    <div></div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button type="button" id="epmCancelBtn" style="padding:7px 16px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.88em;">
                            Hủy bỏ
                        </button>
                        <button type="button" id="btnSaveExercisePrompt" style="padding:7px 20px;background:linear-gradient(135deg, #0284c7, #0369a1);color:#ffffff;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:0.88em;box-shadow:0 3px 10px rgba(2,132,199,0.3);display:flex;align-items:center;gap:6px;">
                            <span>💾 Lưu đề bài tập</span>
                        </button>
                    </div>
                </div>
                        <button type="button" id="epmCancelBtn" style="padding:10px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.9em;">
                            Hủy bỏ
                        </button>
                        <button type="button" id="btnSaveExercisePrompt" style="padding:10px 26px;background:linear-gradient(135deg, #0284c7, #0369a1);color:#ffffff;border:none;border-radius:10px;font-weight:800;cursor:pointer;font-size:0.92em;box-shadow:0 4px 14px rgba(2,132,199,0.35);display:flex;align-items:center;gap:8px;">
                            <span>💾 Lưu đề bài tập</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (typeof updateAllTelexUI === 'function') updateAllTelexUI();

        const container = document.getElementById('epmContainer');
        const editor = document.getElementById('exercisePromptPasteBox');
        const workspace = document.getElementById('epmWorkspace');
        const previewArea = document.getElementById('epmStudentPreviewArea');

        // Khởi tạo nút Ô Ví Dụ Ngang + Ấn giữ chọn màu
        setupHorizontalExampleTool({
            btn: document.getElementById('epmInsertExampleBtn'),
            getEditor: () => editor,
            getSavedRange: () => savedRange,
            defaultBadge: '💡 Ghi chú / Ví dụ mẫu',
            placeholderKr: 'VD mẫu: 비가 와서 우산을 썼어요.',
            placeholderVn: '👉 Dịch nghĩa: Vì trời mưa nên tôi đã che ô.'
        });

        // Track cursor selection
        function saveSelection() {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
                savedRange = sel.getRangeAt(0).cloneRange();
            }
        }
        editor.addEventListener('keyup', saveSelection);
        editor.addEventListener('mouseup', saveSelection);
        editor.addEventListener('touchend', saveSelection);
        editor.addEventListener('blur', saveSelection);

        function restoreSelection() {
            editor.focus();
            if (savedRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedRange);
            }
        }

        // Toolbar formatting commands
        overlay.querySelectorAll('#epmToolbar button[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                document.execCommand(btn.dataset.cmd, false, null);
                saveSelection();
            });
        });

        // Font family
        document.getElementById('epmFontFamily').addEventListener('change', (e) => {
            restoreSelection();
            document.execCommand('fontName', false, e.target.value);
            saveSelection();
        });

        // Font size
        document.getElementById('epmFontSize').addEventListener('change', (e) => {
            restoreSelection();
            const sz = e.target.value;
            document.execCommand('fontSize', false, '7');
            editor.querySelectorAll('font[size="7"]').forEach(f => {
                f.removeAttribute('size');
                f.style.fontSize = sz;
            });
            saveSelection();
        });

        // Text color
        const textColorPicker = document.getElementById('epmTextColorPicker');
        textColorPicker.addEventListener('input', () => {
            restoreSelection();
            document.execCommand('foreColor', false, textColorPicker.value);
            saveSelection();
        });
        overlay.querySelectorAll('#epmToolbar button[data-color]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                document.execCommand('foreColor', false, btn.dataset.color);
                textColorPicker.value = btn.dataset.color;
                saveSelection();
            });
        });

        // Background highlight
        const bgColorPicker = document.getElementById('epmBgColorPicker');
        bgColorPicker.addEventListener('input', () => {
            restoreSelection();
            try { document.execCommand('hiliteColor', false, bgColorPicker.value); }
            catch (e) { document.execCommand('backColor', false, bgColorPicker.value); }
            saveSelection();
        });
        overlay.querySelectorAll('#epmToolbar button[data-bg]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                const bg = btn.dataset.bg;
                if (bg === 'transparent') {
                    document.execCommand('removeFormat', false, null);
                } else {
                    try { document.execCommand('hiliteColor', false, bg); }
                    catch (e) { document.execCommand('backColor', false, bg); }
                }
                saveSelection();
            });
        });

        // Fullscreen toggle
        document.getElementById('epmToggleFullscreenBtn').addEventListener('click', () => {
            isFullscreen = !isFullscreen;
            if (isFullscreen) {
                container.classList.remove('is-windowed');
                document.getElementById('epmToggleFullscreenBtn').textContent = '⛶';
            } else {
                container.classList.add('is-windowed');
                document.getElementById('epmToggleFullscreenBtn').textContent = '🗖';
            }
        });

        // Tab switcher: Edit vs Preview
        window._epmSwitchTab = function (tab) {
            activeTab = tab;
            const tabEdit = document.getElementById('epmTabEdit');
            const tabPrev = document.getElementById('epmTabPreview');
            if (tab === 'preview') {
                tabEdit.classList.remove('active');
                tabPrev.classList.add('active');
                workspace.style.display = 'none';
                previewArea.style.display = 'flex';
                document.getElementById('epmStudentPrevBody').innerHTML = editor.innerHTML || '<p style="color:#94a3b8;font-style:italic;">Chưa có nội dung đề bài.</p>';
            } else {
                tabPrev.classList.remove('active');
                tabEdit.classList.add('active');
                workspace.style.display = 'flex';
                previewArea.style.display = 'none';
            }
        };

        // Close action
        function closeModal() {
            overlay.remove();
        }
        document.getElementById('epmCloseModalBtn').addEventListener('click', () => {
            const currentHtmlNow = (editor.innerHTML || '').trim();
            if (currentHtmlNow && currentHtmlNow !== currentHtml) {
                Swal.fire({
                    title: 'Đóng mà không lưu?',
                    text: 'Nội dung đề bài chưa lưu sẽ bị mất!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'Đóng',
                    cancelButtonText: 'Ở lại'
                }).then(r => { if (r.isConfirmed) closeModal(); });
            } else {
                closeModal();
            }
        });
        document.getElementById('epmCancelBtn').addEventListener('click', () => {
            document.getElementById('epmCloseModalBtn').click();
        });

        // Save action
        document.getElementById('btnSaveExercisePrompt').addEventListener('click', async () => {
            const html = editor.innerHTML.trim();
            const text = editor.innerText.trim();

            if (!text && !html) {
                return Swal.fire("Thông báo", "Vui lòng nhập hoặc dán nội dung đề bài tập!", "warning");
            }

            const btn = document.getElementById('btnSaveExercisePrompt');
            btn.disabled = true;
            btn.innerHTML = `<span>⏳ Đang lưu đề bài...</span>`;

            try {
                const db = firebase.firestore();
                await db.collection("shared_folders").doc(window.currentSharedFolderId)
                    .collection("exercises").doc(window.currentSharedExerciseId).set({
                        listName: window.currentSharedLesson,
                        promptHtml: html,
                        promptText: text,
                        quiz: firebase.firestore.FieldValue.delete(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                closeModal();
                switchLessonSubTab('exercise');
                Swal.fire({
                    icon: 'success',
                    title: 'Đã lưu đề bài tập!',
                    text: 'Học viên đã có thể xem đề và làm bài trực tiếp ngay bây giờ.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (e) {
                console.error("Lỗi lưu đề bài:", e);
                Swal.fire("Lỗi lưu đề bài", e.message, "error");
                btn.disabled = false;
                btn.innerHTML = `<span>💾 Lưu đề bài tập</span>`;
            }
        });

        setTimeout(() => editor.focus(), 150);
    };

    // Xuất dữ liệu Từ vựng + Ngữ pháp của bài học thành Prompt gửi Gemini tạo bài tập
    window.exportLessonForGemini = function () {
        if (!window.currentSharedLesson) {
            Swal.fire("Thông báo", "Vui lòng mở một Bài học trước!", "warning");
            return;
        }
        const folderTitle = window.currentSharedFolderTitle || 'Thư mục giảng dạy';
        const lessonName = window.currentSharedLesson;

        // A. Từ vựng
        const words = (window.currentSharedWords || []).filter(w => w && w.word && w.word !== '__folder_marker__');
        let vocabLines = [];
        words.forEach((w, i) => {
            let line = `${i + 1}. ${w.word} — ${w.meaning || ''}`;
            if (w.ex_kr) line += `\n   Ví dụ: ${w.ex_kr}${w.ex_vn ? ' — ' + w.ex_vn : ''}`;
            if (w.definition) line += `\n   Định nghĩa: ${w.definition}`;
            vocabLines.push(line);
        });
        const vocabText = vocabLines.length ? vocabLines.join('\n') : '(Chưa có từ vựng nào)';

        // B. Ngữ pháp
        const grammar = window.currentSharedGrammar || [];
        let grammarLines = [];
        grammar.forEach((g, i) => {
            const title = g.title || ('Ngữ pháp ' + (g.index || i + 1));
            let block = `${i + 1}. ${title}`;
            const temp = document.createElement('div');
            temp.innerHTML = formatGrammarContentForVocab(g);
            const body = (temp.innerText || temp.textContent || '').trim();
            if (body) {
                block += '\n' + body.split('\n').map(l => l.trim()).filter(Boolean).map(l => '   ' + l).join('\n');
            }
            grammarLines.push(block);
        });
        const grammarText = grammarLines.length ? grammarLines.join('\n') : '(Chưa có ngữ pháp nào)';

        const prompt = `Bạn là giáo viên tiếng Hàn chuyên luyện thi TOPIK cho học viên Việt Nam.
Hãy tạo một bộ BÀI TẬP luyện tập dựa ĐÚNG vào danh sách TỪ VỰNG và NGỮ PHÁP dưới đây của buổi học.

📌 Bài học: ${lessonName}
📂 Thư mục: ${folderTitle}

════════════════════════════════════
A. TỪ VỰNG CẦN ÔN LUYỆN (${words.length} từ)
════════════════════════════════════
${vocabText}

════════════════════════════════════
B. NGỮ PHÁP CẦN ÔN LUYỆN (${grammar.length} mục)
════════════════════════════════════
${grammarText}

════════════════════════════════════
YÊU CẦU TẠO BÀI TẬP
════════════════════════════════════
Hãy soạn bài tập đa dạng, chỉ dùng các từ vựng và ngữ pháp đã liệt kê ở trên, gồm các dạng:
1. Trắc nghiệm chọn từ/ngữ pháp đúng (4 lựa chọn) → type "mc".
2. Điền từ/ngữ pháp vào chỗ trống → type "fill".
3. Câu đúng / sai → type "tf".
4. Nối cặp tương ứng → type "match".
5. Dịch câu → type "translate": ĐÚNG 5 câu dịch Việt → Hàn ("direction": "vi2kr") và ĐÚNG 5 câu dịch Hàn → Việt ("direction": "kr2vi"), tổng cộng 10 câu dịch.

Mỗi câu đều kèm trường "explain" (giải thích ngữ pháp/đáp án ngắn bằng tiếng Việt).

⚠️ QUAN TRỌNG: Xuất kết quả DƯỚI DẠNG MỘT MẢNG JSON DUY NHẤT (chỉ mảng [...], không lời dẫn), theo đúng cấu trúc mẫu:
[
  { "type": "mc", "question": "...", "options": ["...", "...", "...", "..."], "answer": 1, "explain": "..." },
  { "type": "tf", "question": "...", "answer": "t", "explain": "..." },
  { "type": "fill", "question": "...", "answer": "...", "explain": "..." },
  { "type": "match", "question": "Nối ...", "pairs": [ { "left": "...", "right": "..." } ], "explain": "..." },
  { "type": "translate", "direction": "vi2kr", "question": "Dịch sang tiếng Hàn: ...", "answer": "...", "explain": "..." },
  { "type": "translate", "direction": "kr2vi", "question": "Dịch sang tiếng Việt: ...", "answer": "...", "explain": "..." }
]
Lưu ý: "answer" của mc là số thứ tự đáp án đúng (bắt đầu từ 1); của tf là "t" hoặc "f"; của fill/translate là chuỗi đáp án. JSON phải hợp lệ (không thêm chú thích ngoài mảng).`;

        Swal.fire({
            title: '🤖 Prompt Gemini tạo bài tập',
            html: `<div style="text-align:left;font-size:0.86em;color:#475569;margin-bottom:10px;">
                    Đã tổng hợp <b>${words.length} từ vựng</b> và <b>${grammar.length} ngữ pháp</b> từ bài học này. Nhấn <b>"Sao chép Prompt"</b> rồi dán vào Gemini để nhận bài tập.
                </div>
                <textarea id="geminiExportTextarea" readonly style="width:100%;height:340px;font-size:0.8em;line-height:1.55;padding:12px;border:1px solid #e2e8f0;border-radius:10px;font-family:Consolas,monospace;background:#f8fafc;color:#0f172a;box-sizing:border-box;">${escapeHtml(prompt)}</textarea>`,
            width: '720px',
            showCloseButton: true,
            showCancelButton: false,
            showDenyButton: true,
            confirmButtonText: '📋 Sao chép Prompt',
            confirmButtonColor: '#6d28d9',
            denyButtonText: '↗ Mở Gemini',
            denyButtonColor: '#0284c7',
            preConfirm: () => {
                copyText(prompt, 'Đã sao chép Prompt Gemini tạo bài tập!');
            },
            didOpen: () => {
                const ta = document.getElementById('geminiExportTextarea');
                if (ta) ta.focus();
            }
        }).then((result) => {
            if (result.isDenied) {
                window.open('https://gemini.google.com', '_blank');
            }
        });
    };

    // Hiển thị đáp án tham khảo cho câu dịch (translate)
    window.revealTranslateAnswer = function (btn) {
        const card = btn && btn.closest ? btn.closest('.quiz-translate-card') : null;
        if (!card) return;
        const reveal = card.querySelector('.quiz-answer-reveal');
        const explain = card.querySelector('.quiz-explain');
        if (reveal) reveal.style.display = 'block';
        if (explain) explain.classList.add('show');
        if (btn) { btn.disabled = true; btn.textContent = '✅ Đã xem'; }
    };

    // Render mảng JSON bài tập thành HTML tương tác (mc / fill / tf / match / translate)
    function buildExerciseQuizHtml(arr) {
        let html = '<div class="grammar-content"><div class="quiz-section"><h3>📝 Bài tập tương tác</h3>';
        arr.forEach((q, idx) => {
            const qNum = idx + 1;
            const type = q.type || 'mc';
            if (type === 'mc') {
                const opts = q.options || q.opts || [];
                const ans = q.answer || 1;
                html += `<div class="quiz-q" data-type="mc" data-answer="${ans}">`;
                html += `<div class="quiz-stem">Câu ${qNum}: ${escHtmlGrammarVocab(q.question || '')}</div><div class="quiz-opts">`;
                opts.forEach((opt, oIdx) => {
                    html += `<button class="quiz-opt" data-v="${oIdx + 1}">${escHtmlGrammarVocab(opt)}</button>`;
                });
                html += `</div>`;
                if (q.explain) html += `<div class="quiz-explain">${escHtmlGrammarVocab(q.explain)}</div>`;
                html += `<div class="quiz-feedback"></div></div>`;
            } else if (type === 'tf') {
                const ans = (q.answer === true || q.answer === 't' || q.answer === 'đúng') ? 't' : 'f';
                html += `<div class="quiz-q" data-type="tf" data-answer="${ans}">`;
                html += `<div class="quiz-stem">Câu ${qNum}: ${escHtmlGrammarVocab(q.question || '')}</div><div class="quiz-tf"><button data-v="t">⭕ Đúng</button><button data-v="f">❌ Sai</button></div>`;
                if (q.explain) html += `<div class="quiz-explain">${escHtmlGrammarVocab(q.explain)}</div>`;
                html += `<div class="quiz-feedback"></div></div>`;
            } else if (type === 'fill') {
                html += `<div class="quiz-q" data-type="fill" data-answer="${escHtmlGrammarVocab(String(q.answer || ''))}">`;
                html += `<div class="quiz-stem">Câu ${qNum}: ${escHtmlGrammarVocab(q.question || '')}</div><div class="quiz-fill"><input type="text" placeholder="Nhập đáp án..."><button class="quiz-check-btn">Kiểm tra</button></div>`;
                if (q.explain) html += `<div class="quiz-explain">${escHtmlGrammarVocab(q.explain)}</div>`;
                html += `<div class="quiz-feedback"></div></div>`;
            } else if (type === 'match') {
                const pairs = q.pairs || [];
                html += `<div class="quiz-q" data-type="match">`;
                html += `<div class="quiz-stem">Câu ${qNum}: ${escHtmlGrammarVocab(q.question || 'Nối cặp tương ứng:')}</div><div class="quiz-match">`;
                const rights = pairs.map((p, pIdx) => ({ text: p.right, pair: pIdx + 1 }));
                if (rights.length > 1) {
                    const t = rights[0];
                    rights[0] = rights[rights.length - 1];
                    rights[rights.length - 1] = t;
                }
                pairs.forEach((p, pIdx) => {
                    html += `<div class="quiz-match-item" data-side="l" data-pair="${pIdx + 1}">${escHtmlGrammarVocab(p.left)}</div>`;
                    const r = rights[pIdx];
                    html += `<div class="quiz-match-item" data-side="r" data-pair="${r.pair}">${escHtmlGrammarVocab(r.text)}</div>`;
                });
                html += `</div>`;
                if (q.explain) html += `<div class="quiz-explain">${escHtmlGrammarVocab(q.explain)}</div>`;
                html += `<div class="quiz-feedback"></div></div>`;
            } else if (type === 'translate') {
                const dir = (q.direction === 'vi2kr') ? 'Việt → Hàn' : (q.direction === 'kr2vi' ? 'Hàn → Việt' : '');
                html += `<div class="quiz-translate-card">`;
                html += `<div class="quiz-stem">Câu ${qNum}${dir ? ' (' + dir + ')' : ''}: ${escHtmlGrammarVocab(q.question || '')}</div>`;
                html += `<div class="quiz-fill"><textarea class="quiz-translate-input" placeholder="Nhập bản dịch của bạn..."></textarea><button class="quiz-check-btn" onclick="window.revealTranslateAnswer(this)">💡 Xem đáp án</button></div>`;
                html += `<div class="quiz-answer-reveal" style="display:none;">📖 Đáp án tham khảo: <strong>${escHtmlGrammarVocab(String(q.answer || ''))}</strong></div>`;
                if (q.explain) html += `<div class="quiz-explain">${escHtmlGrammarVocab(q.explain)}</div>`;
                html += `</div>`;
            }
        });
        html += '<div class="quiz-score"></div></div></div>';
        return html;
    }

    // Modal nhập bài tập (JSON) từ Gemini → chuyển thành bài tập tương tác
    window.openExerciseImportModal = function () {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedLesson) return;

        const modalId = '_exerciseImportModal';
        const old = document.getElementById(modalId);
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;';

        const lessonName = window.currentSharedLesson || 'Bài học';

        overlay.innerHTML = `
            <div style="background:#fff;border-radius:20px;max-width:860px;width:100%;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);overflow:hidden;">
                <div style="padding:16px 22px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#f8fafc,#edf2f7);">
                    <div>
                        <span style="font-size:0.78em;font-weight:800;padding:3px 10px;border-radius:6px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;">📥 NHẬP BÀI TẬP TỪ GEMINI</span>
                        <h3 style="margin:6px 0 0 0;font-size:1.2em;color:#1e1b4b;font-weight:800;">${escapeHtml(lessonName)}</h3>
                    </div>
                    <button onclick="document.getElementById('${modalId}').remove()" style="background:none;border:none;font-size:1.8em;color:#94a3b8;cursor:pointer;line-height:1;">&times;</button>
                </div>
                <div style="padding:18px 22px;flex:1;overflow-y:auto;">
                    <div style="font-size:0.85em;color:#475569;line-height:1.6;margin-bottom:12px;">
                        Dán <b>mảng JSON</b> bài tập Gemini trả về vào đây (hỗ trợ cả khi Gemini bọc trong khối mã json). Hệ thống sẽ chuyển thành bài tập <b>tương tác</b>: trắc nghiệm, điền, đúng/sai, nối cặp (tự chấm) và dịch (xem đáp án tham khảo) — giống bài tập ở tab Ngữ pháp.
                    </div>
                    <textarea id="exerciseImportTextarea" placeholder='[{"type":"mc","question":"...","options":["..."],"answer":1,"explain":"..."}]' style="width:100%;height:280px;padding:14px;border:2px solid #e2e8f0;border-radius:12px;font-family:Consolas,monospace;font-size:0.85em;line-height:1.6;box-sizing:border-box;outline:none;resize:vertical;"></textarea>
                    <div id="exerciseImportPreview" style="margin-top:12px;"></div>
                </div>
                <div style="padding:14px 22px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;background:#f8fafc;">
                    <button onclick="document.getElementById('${modalId}').remove()" style="background:#f1f5f9;border:none;padding:10px 20px;border-radius:10px;font-weight:700;cursor:pointer;color:#475569;">Hủy</button>
                    <button id="exerciseImportSaveBtn" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none;padding:10px 24px;border-radius:10px;font-weight:700;cursor:pointer;color:#fff;">💾 Lưu bài tập tương tác</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

        const textarea = document.getElementById('exerciseImportTextarea');
        const preview = document.getElementById('exerciseImportPreview');
        const saveBtn = document.getElementById('exerciseImportSaveBtn');

        function parseExercises(raw) {
            let s = (raw || '').trim();
            const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (fence) s = fence[1].trim();
            const first = s.indexOf('[');
            const last = s.lastIndexOf(']');
            if (first !== -1 && last > first) s = s.substring(first, last + 1);
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && Array.isArray(parsed.quiz)) return parsed.quiz;
            if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
            if (parsed && Array.isArray(parsed.exercises)) return parsed.exercises;
            return [];
        }

        textarea.addEventListener('input', function () {
            try {
                const arr = parseExercises(textarea.value);
                if (arr.length) {
                    preview.innerHTML = `<div style="color:#16a34a;font-weight:700;font-size:0.85em;">✅ Nhận diện ${arr.length} câu bài tập.</div>`;
                } else {
                    preview.innerHTML = '';
                }
            } catch (e) {
                preview.innerHTML = '';
            }
        });

        saveBtn.onclick = async function () {
            let arr;
            try {
                arr = parseExercises(textarea.value);
            } catch (e) {
                Swal.fire("Lỗi", "Không phân tích được JSON. Hãy kiểm tra lại định dạng!", "error");
                return;
            }
            if (!arr || !arr.length) {
                Swal.fire("Lỗi", "Không tìm thấy câu hỏi nào trong JSON!", "error");
                return;
            }
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Đang lưu...';
            try {
                const quizHtml = buildExerciseQuizHtml(arr);
                await firebase.firestore().collection("shared_folders").doc(window.currentSharedFolderId)
                    .collection("exercises").doc(window.currentSharedExerciseId).set({
                        listName: window.currentSharedLesson,
                        promptHtml: quizHtml,
                        promptText: JSON.stringify(arr, null, 2),
                        quiz: arr,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                overlay.remove();
                switchLessonSubTab('exercise');
                Swal.fire({ icon: 'success', title: '🎉 Đã lưu bài tập tương tác!', text: `Đã tạo ${arr.length} câu bài tập tương tác cho bài học.`, timer: 2000, showConfirmButton: false });
            } catch (e) {
                console.error("Lỗi lưu bài tập tương tác:", e);
                Swal.fire("Lỗi", e.message, "error");
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Lưu bài tập tương tác';
            }
        };

        setTimeout(() => textarea.focus(), 150);
    };

    // Xóa đề bài tập
    window.deleteExercisePrompt = async function () {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedExerciseId) return;

        const res = await Swal.fire({
            title: "Xóa đề bài tập?",
            text: `Bạn có chắc chắn muốn xóa đề bài tập của bài "${window.currentSharedLesson}" không?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy"
        });
        if (!res.isConfirmed) return;

        try {
            await firebase.firestore().collection("shared_folders").doc(window.currentSharedFolderId)
                .collection("exercises").doc(window.currentSharedExerciseId).delete();
            Swal.fire("Đã xóa", "Đã xóa đề bài tập.", "success");
        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // Khôi phục lại đề bài gốc của Giáo viên vào khung làm bài
    window.resetStudentWorksheetToPrompt = async function () {
        const wsBox = document.getElementById('studentWorksheetBox');
        if (!wsBox) return;

        const conf = await Swal.fire({
            title: "Khôi phục lại đề gốc?",
            html: "Toàn bộ câu trả lời bạn đã gõ vào đề sẽ được xóa và nạp lại đề bài ban đầu của Giáo viên.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Khôi phục",
            confirmButtonColor: "#0284c7",
            cancelButtonText: "Hủy"
        });
        if (!conf.isConfirmed) return;

        const origPrompt = (window.currentSharedExercise && window.currentSharedExercise.promptHtml) || '';
        wsBox.innerHTML = origPrompt;

        try {
            const draftKey = 'draft_ws_' + (window.currentSharedFolderId || '') + '_' + (window.currentSharedExerciseId || '');
            localStorage.removeItem(draftKey);
        } catch (e) {}

        Swal.fire({
            icon: 'success',
            title: 'Đã khôi phục đề gốc!',
            timer: 1500,
            showConfirmButton: false
        });
    };

    // Render khu vực làm bài & xem kết quả chấm của Học viên
    function renderStudentSubmissionView(subData) {
        window._currentStudentSubData = subData;

        const badge = document.getElementById('studentExerciseStatusBadge');
        const stickyBadge = document.getElementById('studentStickyStatusBadge');
        const stickyBtn = document.getElementById('btnOpenStudentExerciseModal');
        const reviewArea = document.getElementById('studentGradedReviewArea');
        const scoreBadge = document.getElementById('studentGradedScoreBadge');
        const feedbackEl = document.getElementById('studentTeacherFeedback');
        const correctedView = document.getElementById('studentCorrectedHtmlView');
        const wsBox = document.getElementById('studentWorksheetBox');
        const submitBtn = document.getElementById('btnSubmitExercise');

        const draftKey = 'draft_ws_' + (window.currentSharedFolderId || '') + '_' + (window.currentSharedExerciseId || '');

        let statusHtml = '';
        let btnText = '✍️ Làm bài tập ngay';
        let btnBg = 'linear-gradient(135deg, #0284c7, #0369a1)';

        if (!subData) {
            statusHtml = `<span style="background:#f1f5f9;color:#64748b;padding:4px 12px;border-radius:12px;font-weight:700;font-size:0.85em;">📝 Chưa nộp bài</span>`;
            if (reviewArea) reviewArea.style.display = 'none';

            btnText = '✍️ Làm bài tập ngay';
            btnBg = 'linear-gradient(135deg, #0284c7, #0369a1)';

            const draft = localStorage.getItem(draftKey);
            if (wsBox) {
                if (draft && draft.trim()) {
                    wsBox.innerHTML = draft;
                } else if (window.currentSharedExercise && window.currentSharedExercise.promptHtml) {
                    wsBox.innerHTML = window.currentSharedExercise.promptHtml;
                }
                wsBox.setAttribute('data-loaded', 'true');
            }
            if (submitBtn) submitBtn.innerHTML = '📤 Nộp bài tập';
        } else if (subData.status === 'submitted') {
            statusHtml = `<span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:12px;font-weight:700;font-size:0.85em;">⏳ Đã nộp — Chờ giáo viên chấm</span>`;
            if (reviewArea) reviewArea.style.display = 'none';

            btnText = '🔄 Xem & Cập nhật bài làm';
            btnBg = 'linear-gradient(135deg, #d97706, #b45309)';

            if (wsBox) {
                if (subData.studentWorksheetHtml) {
                    wsBox.innerHTML = subData.studentWorksheetHtml;
                } else if (subData.originalText) {
                    wsBox.innerHTML = textToParagraphsHtml(subData.originalText);
                }
                wsBox.setAttribute('data-loaded', 'true');
            }
            if (submitBtn) submitBtn.innerHTML = '🔄 Cập nhật lại bài nộp';
        } else if (subData.status === 'graded') {
            statusHtml = `<span style="background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:12px;font-weight:700;font-size:0.85em;">✅ Đã chấm: ${escapeHtml(subData.score || 'Đạt')}</span>`;
            if (reviewArea) reviewArea.style.display = 'block';

            btnText = '🔄 Xem bài & Sửa lại';
            btnBg = 'linear-gradient(135deg, #059669, #047857)';

            if (scoreBadge) {
                scoreBadge.innerHTML = `🎯 Điểm: <b>${escapeHtml(subData.score || 'Đạt')}</b>`;
            }
            if (feedbackEl) {
                const fb = (subData.teacherFeedback || 'Không có nhận xét thêm.').trim();
                feedbackEl.innerHTML = `<b>💬 Lời nhận xét của Giáo viên:</b><br>${escapeHtml(fb).replace(/\n/g, '<br>')}`;
            }
            if (correctedView) {
                correctedView.innerHTML = subData.correctedHtml || subData.studentWorksheetHtml || subData.originalText || '';
            }

            if (wsBox) {
                if (subData.studentWorksheetHtml) {
                    wsBox.innerHTML = subData.studentWorksheetHtml;
                }
                wsBox.setAttribute('data-loaded', 'true');
            }
            if (submitBtn) submitBtn.innerHTML = '🔄 Nộp lại bài làm mới';
        }

        if (badge) badge.innerHTML = statusHtml;
        if (stickyBadge) stickyBadge.innerHTML = statusHtml;
        if (stickyBtn) {
            stickyBtn.innerHTML = btnText;
            stickyBtn.style.background = btnBg;
        }

        // Tự động lưu bản nháp vào localStorage khi học viên gõ ở khung ngoài (nếu có)
        if (wsBox && !wsBox._hasDraftListener) {
            wsBox._hasDraftListener = true;
            wsBox.addEventListener('input', () => {
                try {
                    const dk = 'draft_ws_' + (window.currentSharedFolderId || '') + '_' + (window.currentSharedExerciseId || '');
                    localStorage.setItem(dk, wsBox.innerHTML);
                } catch (e) {}
            });
        }
    }

    // Modal Học viên Làm bài tập Toàn Màn Hình (Fullscreen Student Workspace)
    window.openStudentDoExerciseModal = function () {
        if (!window.currentSharedFolderId || !window.currentSharedExerciseId) {
            return Swal.fire("Thông báo", "Vui lòng chọn thư mục và bài học trước khi làm bài tập!", "warning");
        }

        ensureGrammarEditorStyles();

        const modalId = '_studentDoExerciseModal';
        const old = document.getElementById(modalId);
        if (old) old.remove();

        const promptHtml = (window.currentSharedExercise && window.currentSharedExercise.promptHtml) || '';
        const draftKey = 'draft_ws_' + window.currentSharedFolderId + '_' + window.currentSharedExerciseId;
        const savedDraft = localStorage.getItem(draftKey);
        const subData = window._currentStudentSubData || null;

        let initialWorkHtml = '';
        if (savedDraft && savedDraft.trim()) {
            initialWorkHtml = savedDraft;
        } else if (subData && subData.studentWorksheetHtml) {
            initialWorkHtml = subData.studentWorksheetHtml;
        } else if (subData && subData.originalText) {
            initialWorkHtml = textToParagraphsHtml(subData.originalText);
        } else if (promptHtml) {
            initialWorkHtml = promptHtml;
        }

        let isFullscreen = true;
        let activeTab = 'work'; // 'work' | 'prompt'
        let savedRange = null;

        const folderTitle = window.currentSharedFolderTitle || 'Thư mục học tập';
        const lessonName = window.currentSharedLesson || 'Bài học';

        const overlay = document.createElement('div');
        overlay.id = modalId;

        overlay.innerHTML = `
            <div class="gfm-container" id="sdmContainer">
                <!-- TOP HEADER -->
                <div class="gfm-header" style="background:linear-gradient(135deg, #f0f9ff, #e0f2fe);padding:6px 16px;">
                    <div class="gfm-title-area">
                        <span class="gfm-badge gfm-badge-blue">✍️ LÀM BÀI TẬP</span>
                        <div style="font-weight:700;font-size:0.95em;color:#0369a1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">
                            ${escapeHtml(lessonName)}
                        </div>
                        <span class="sdm-folder-pill" style="font-size:0.8em;color:#64748b;background:#ffffff;padding:2px 8px;border-radius:6px;white-space:nowrap;">
                            📁 ${escapeHtml(folderTitle)}
                        </span>
                    </div>

                    <!-- TABS: LÀM BÀI & XEM ĐỀ GỐC -->
                    <div class="gfm-tabs">
                        <button type="button" class="gfm-tab-btn active" id="sdmTabWork" onclick="_sdmSwitchTab('work')">
                            <span>✏️ Bài làm</span>
                        </button>
                        <button type="button" class="gfm-tab-btn" id="sdmTabPrompt" onclick="_sdmSwitchTab('prompt')">
                            <span>📋 Đề bài</span>
                        </button>
                    </div>

                    <!-- WINDOW ACTIONS -->
                    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                        <button type="button" class="gfm-tool-btn sdm-fullscreen-btn" id="sdmToggleFullscreenBtn" title="Phóng to / Thu nhỏ" style="font-size:1.05em;padding:3px 6px;">
                            ⛶
                        </button>
                        <button type="button" class="gfm-tool-btn" id="sdmCloseModalBtn" title="Đóng" style="font-size:1.25em;color:#ef4444;padding:3px 6px;">
                            &times;
                        </button>
                    </div>
                </div>

                <!-- WORKSPACE -->
                <div class="gfm-workspace" id="sdmWorkspace">
                    <div class="gfm-editor-col">
                        <!-- TOOLBAR CHÍNH: Gọn, luôn hiện -->
                        <div class="gfm-toolbar sdm-toolbar-main" id="sdmToolbar">
                            <!-- Nhóm định dạng cơ bản: luôn hiện -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="bold" title="In đậm"><b>B</b></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="italic" title="In nghiêng"><i>I</i></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="underline" title="Gạch chân"><u>U</u></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- Căn lề -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyLeft" title="Căn trái">⇤</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyCenter" title="Căn giữa">≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyRight" title="Căn phải">⇥</button>
                            </div>

                            <!-- Danh sách -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertUnorderedList" title="Danh sách •">•≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="insertOrderedList" title="Danh sách số">1≡</button>
                            </div>

                            <!-- Hoàn tác -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="undo" title="Hoàn tác">↶</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="redo" title="Làm lại">↷</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="removeFormat" title="Xóa định dạng" style="color:#ef4444;">Tx</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- NÚT MỞ PANEL ĐỊNH DẠNG NÂNG CAO -->
                            <button type="button" class="sdm-tool-toggle-btn" id="sdmToggleFormatBtn" title="Font, Màu sắc, Kích thước chữ">
                                🎨 Định dạng <span style="font-size:0.75em;opacity:0.7;">▾</span>
                            </button>

                            <span class="gfm-tool-sep"></span>

                            <!-- NÚT CHÈN Ô VÍ DỤ -->
                            <button type="button" class="gfm-tool-btn" id="sdmInsertExampleBtn"
                                    title="Bấm: Chèn ô ví dụ | Ấn giữ: Chọn màu ô"
                                    style="background:#f0fdf4;border:1.5px solid #10b981;color:#15803d;padding:4px 10px;font-size:0.84em;font-weight:700;display:inline-flex;align-items:center;gap:4px;border-radius:8px;cursor:pointer;white-space:nowrap;flex-shrink:0;">
                                💡 <span class="sdm-example-label">Ô ví dụ</span>
                                <span class="gfm-color-dot-indicator" style="width:9px;height:9px;border-radius:50%;background:#10b981;border:1px solid #fff;box-shadow:0 0 0 1px #10b981;"></span>
                                <span style="font-size:0.7em;opacity:0.7;">▾</span>
                            </button>

                            <span class="gfm-tool-sep"></span>

                            <!-- BỘ GÕ TELEX TÍCH HỢP -->
                            <button type="button" class="gfm-tool-btn gfm-telex-toggle-btn" onclick="window.toggleWebTelex()"
                                    title="Bộ gõ Telex tích hợp: Khi bật, bạn có thể để EVKey ở chữ E, chỉ cần bấm Alt để đổi giữa gõ tiếng Hàn (가) và tiếng Việt (A)!"
                                    style="background:#eff6ff;border:1.5px solid #3b82f6;color:#1d4ed8;padding:4px 10px;font-size:0.84em;font-weight:700;display:inline-flex;align-items:center;gap:4px;border-radius:8px;cursor:pointer;white-space:nowrap;flex-shrink:0;">
                                <span class="telex-status-icon">🇻🇳</span>
                                <span class="telex-status-text">Telex: BẬT</span>
                            </button>
                        </div>

                        <!-- PANEL ĐỊNH DẠNG NÂNG CAO (ẩn mặc định) -->
                        <div id="sdmFormatPanel" class="sdm-sub-tool-panel" style="display:none;">
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                <!-- Font family -->
                                <div class="gfm-tool-group" title="Chọn Font chữ">
                                    <span style="font-size:0.78em;font-weight:700;color:#64748b;padding:0 2px;">Font:</span>
                                    <select id="sdmFontFamily" class="gfm-select">
                                        <option value="'Pretendard', sans-serif">Pretendard</option>
                                        <option value="'Nanum Gothic', sans-serif">Nanum Gothic</option>
                                        <option value="'Nanum Myeongjo', serif">Nanum Myeongjo</option>
                                        <option value="Inter, sans-serif">Inter</option>
                                        <option value="Roboto, sans-serif">Roboto</option>
                                        <option value="Arial, sans-serif">Arial</option>
                                        <option value="'Times New Roman', serif">Times New Roman</option>
                                        <option value="'Courier New', monospace">Courier New</option>
                                    </select>
                                </div>

                                <!-- Font size -->
                                <div class="gfm-tool-group" title="Kích thước chữ">
                                    <span style="font-size:0.78em;font-weight:700;color:#64748b;padding:0 2px;">Cỡ:</span>
                                    <select id="sdmFontSize" class="gfm-select">
                                        <option value="13px">13px - Nhỏ</option>
                                        <option value="15px">15px</option>
                                        <option value="16px" selected>16px - Chuẩn</option>
                                        <option value="18px">18px - Vừa</option>
                                        <option value="20px">20px - Lớn</option>
                                        <option value="24px">24px - Tiêu đề</option>
                                    </select>
                                </div>

                                <span class="gfm-tool-sep"></span>

                                <!-- Text color -->
                                <div class="gfm-tool-group" title="Màu chữ">
                                    <span style="font-size:0.78em;font-weight:700;color:#64748b;padding:0 2px;">Chữ:</span>
                                    <input type="color" id="sdmTextColorPicker" value="#0f172a" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;" title="Chọn màu chữ">
                                    <button type="button" class="gfm-tool-btn" data-color="#dc2626" style="color:#dc2626;padding:2px 4px;font-size:0.82em;" title="Đỏ">A</button>
                                    <button type="button" class="gfm-tool-btn" data-color="#2563eb" style="color:#2563eb;padding:2px 4px;font-size:0.82em;" title="Xanh">A</button>
                                    <button type="button" class="gfm-tool-btn" data-color="#16a34a" style="color:#16a34a;padding:2px 4px;font-size:0.82em;" title="Xanh lá">A</button>
                                    <button type="button" class="gfm-tool-btn" data-color="#7c3aed" style="color:#7c3aed;padding:2px 4px;font-size:0.82em;" title="Tím">A</button>
                                    <button type="button" class="gfm-tool-btn" data-color="#0f172a" style="color:#0f172a;padding:2px 3px;font-size:0.82em;" title="Đen">A</button>
                                </div>

                                <!-- Highlight color -->
                                <div class="gfm-tool-group" title="Màu nền / Highlight">
                                    <span style="font-size:0.78em;font-weight:700;color:#64748b;padding:0 2px;">Nền:</span>
                                    <input type="color" id="sdmBgColorPicker" value="#fef08a" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;" title="Chọn màu nền">
                                    <button type="button" class="gfm-tool-btn" data-bg="#fef08a" style="background:#fef08a;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Vàng nhạt"></button>
                                    <button type="button" class="gfm-tool-btn" data-bg="#bae6fd" style="background:#bae6fd;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh nhạt"></button>
                                    <button type="button" class="gfm-tool-btn" data-bg="#bbf7d0" style="background:#bbf7d0;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh lá nhạt"></button>
                                    <button type="button" class="gfm-tool-btn" data-bg="#fbcfe8" style="background:#fbcfe8;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Hồng nhạt"></button>
                                    <button type="button" class="gfm-tool-btn" data-bg="transparent" style="font-size:0.75em;color:#64748b;padding:2px 4px;" title="Xóa nền">✕</button>
                                </div>

                                <span class="gfm-tool-sep"></span>

                                <!-- Đường kẻ ngang -->
                                <div class="gfm-tool-group">
                                    <button type="button" class="gfm-tool-btn" data-cmd="insertHorizontalRule" title="Đường kẻ ngang">―</button>
                                </div>

                                <!-- Nút đóng panel -->
                                <button type="button" class="sdm-sub-panel-close-btn" id="sdmCloseFormatPanel">✕ Đóng</button>
                            </div>
                        </div>

                        <!-- MAIN WORK CONTENT EDITABLE (CENTERED PAPER CANVAS) -->
                        <div class="gfm-editor-scroll-wrap">
                            <div id="sdmWorkContentBody" class="gfm-editor-content" contenteditable="true"
                                 placeholder="Nhập câu trả lời hoặc dịch câu trực tiếp vào đây...">${initialWorkHtml}</div>
                        </div>
                    </div>
                </div>

                <!-- TAB XEM ĐỀ BÀI GỐC -->
                <div class="gfm-preview-wrapper" id="sdmPromptPreviewArea" style="display:none;">
                    <div class="gfm-preview-card" style="border-left-color:#0284c7;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                            <span class="gfm-badge gfm-badge-blue">📋 ĐỀ BÀI TẬP</span>
                            <h2 style="margin:0;font-size:1.2em;color:#0369a1;font-weight:800;">${escapeHtml(lessonName)}</h2>
                        </div>
                        <div class="exercise-prompt-body" style="font-size:1.05em;line-height:1.8;">
                            ${promptHtml || '<p style="color:#94a3b8;font-style:italic;">Chưa có đề bài tập.</p>'}
                        </div>
                    </div>
                </div>

                <!-- FOOTER ACTIONS -->
                <div class="gfm-footer">
                    <!-- Dòng hướng dẫn (ẩn trên mobile) -->
                    <div class="sdm-footer-guide" style="display:flex;align-items:center;gap:6px;font-size:0.82em;color:#64748b;">
                        <span>💾 Tự động lưu nháp. Bấm <b>Nộp bài</b> để gửi giáo viên chấm.</span>
                    </div>

                    <!-- Nhóm nút -->
                    <div class="sdm-footer-btn-group" style="display:flex;align-items:center;gap:8px;">
                        <button type="button" id="sdmResetPromptBtn"
                                style="padding:9px 14px;background:#f0f9ff;color:#0284c7;border:1px solid #bae6fd;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.86em;white-space:nowrap;">
                            🔄 Khôi phục
                        </button>
                        <button type="button" id="sdmCancelBtn"
                                style="padding:9px 16px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.88em;white-space:nowrap;">
                            Đóng
                        </button>
                        <button type="button" id="sdmSubmitBtn"
                                style="padding:9px 22px;background:linear-gradient(135deg, #0284c7, #0369a1);color:#ffffff;border:none;border-radius:10px;font-weight:800;cursor:pointer;font-size:0.9em;box-shadow:0 4px 14px rgba(2,132,199,0.3);display:flex;align-items:center;gap:6px;white-space:nowrap;">
                            📤 Nộp bài
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (typeof updateAllTelexUI === 'function') updateAllTelexUI();

        const container = document.getElementById('sdmContainer');
        const editor = document.getElementById('sdmWorkContentBody');
        const workspace = document.getElementById('sdmWorkspace');
        const promptArea = document.getElementById('sdmPromptPreviewArea');

        // Toggle Format Panel (nút "🎨 Định dạng ▾")
        const formatPanel = document.getElementById('sdmFormatPanel');
        const toggleFormatBtn = document.getElementById('sdmToggleFormatBtn');
        const closeFormatPanelBtn = document.getElementById('sdmCloseFormatPanel');

        if (toggleFormatBtn && formatPanel) {
            toggleFormatBtn.addEventListener('click', () => {
                const isOpen = formatPanel.style.display !== 'none';
                formatPanel.style.display = isOpen ? 'none' : 'block';
                toggleFormatBtn.classList.toggle('active', !isOpen);
            });
        }
        if (closeFormatPanelBtn && formatPanel) {
            closeFormatPanelBtn.addEventListener('click', () => {
                formatPanel.style.display = 'none';
                if (toggleFormatBtn) toggleFormatBtn.classList.remove('active');
            });
        }

        // Setup Ô Ví Dụ Ngang trong modal học viên
        setupHorizontalExampleTool({
            btn: document.getElementById('sdmInsertExampleBtn'),
            getEditor: () => editor,
            getSavedRange: () => savedRange,
            defaultBadge: '💡 Ghi chú / Ví dụ bài làm',
            placeholderKr: '',
            placeholderVn: ''
        });

        // Track cursor selection
        function saveSelection() {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
                savedRange = sel.getRangeAt(0).cloneRange();
            }
        }
        editor.addEventListener('keyup', saveSelection);
        editor.addEventListener('mouseup', saveSelection);
        editor.addEventListener('touchend', saveSelection);
        editor.addEventListener('blur', saveSelection);

        // Tự động lưu nháp vào localStorage
        editor.addEventListener('input', () => {
            try {
                localStorage.setItem(draftKey, editor.innerHTML);
            } catch (e) {}
        });

        function restoreSelection() {
            editor.focus();
            if (savedRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedRange);
            }
        }

        // Toolbar formatting commands
        overlay.querySelectorAll('#sdmToolbar button[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                document.execCommand(btn.dataset.cmd, false, null);
                saveSelection();
            });
        });

        // Font family
        const fontSelect = document.getElementById('sdmFontFamily');
        if (fontSelect) {
            fontSelect.addEventListener('change', () => {
                restoreSelection();
                document.execCommand('fontName', false, fontSelect.value);
                saveSelection();
            });
        }

        // Font size
        const fontSizeSelect = document.getElementById('sdmFontSize');
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', () => {
                restoreSelection();
                const sz = fontSizeSelect.value;
                document.execCommand('fontSize', false, '7');
                editor.querySelectorAll('font[size="7"]').forEach(f => {
                    f.removeAttribute('size');
                    f.style.fontSize = sz;
                });
                saveSelection();
            });
        }

        // Text color
        const textColorPicker = document.getElementById('sdmTextColorPicker');
        if (textColorPicker) {
            textColorPicker.addEventListener('input', () => {
                restoreSelection();
                document.execCommand('foreColor', false, textColorPicker.value);
                saveSelection();
            });
            overlay.querySelectorAll('button[data-color]').forEach(btn => {
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', () => {
                    restoreSelection();
                    document.execCommand('foreColor', false, btn.dataset.color);
                    textColorPicker.value = btn.dataset.color;
                    saveSelection();
                });
            });
        }

        // Background highlight
        const bgColorPicker = document.getElementById('sdmBgColorPicker');
        if (bgColorPicker) {
            bgColorPicker.addEventListener('input', () => {
                restoreSelection();
                try { document.execCommand('hiliteColor', false, bgColorPicker.value); }
                catch (e) { document.execCommand('backColor', false, bgColorPicker.value); }
                saveSelection();
            });
            overlay.querySelectorAll('button[data-bg]').forEach(btn => {
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', () => {
                    restoreSelection();
                    const bg = btn.dataset.bg;
                    if (bg === 'transparent') {
                        document.execCommand('removeFormat', false, null);
                    } else {
                        try { document.execCommand('hiliteColor', false, bg); }
                        catch (e) { document.execCommand('backColor', false, bg); }
                    }
                    saveSelection();
                });
            });
        }

        // Fullscreen toggle
        document.getElementById('sdmToggleFullscreenBtn').addEventListener('click', () => {
            isFullscreen = !isFullscreen;
            if (isFullscreen) {
                container.classList.remove('is-windowed');
                document.getElementById('sdmToggleFullscreenBtn').textContent = '⛶';
            } else {
                container.classList.add('is-windowed');
                document.getElementById('sdmToggleFullscreenBtn').textContent = '🗖';
            }
        });

        // Tab switcher: Work vs Prompt
        window._sdmSwitchTab = function (tab) {
            activeTab = tab;
            const tabWork = document.getElementById('sdmTabWork');
            const tabPrompt = document.getElementById('sdmTabPrompt');
            if (tab === 'prompt') {
                tabWork.classList.remove('active');
                tabPrompt.classList.add('active');
                workspace.style.display = 'none';
                promptArea.style.display = 'flex';
            } else {
                tabPrompt.classList.remove('active');
                tabWork.classList.add('active');
                workspace.style.display = 'flex';
                promptArea.style.display = 'none';
            }
        };

        // Reset prompt
        document.getElementById('sdmResetPromptBtn').addEventListener('click', async () => {
            const conf = await Swal.fire({
                title: "Khôi phục lại đề gốc?",
                text: "Toàn bộ bài làm hiện tại trong khung này sẽ được thay bằng đề bài gốc ban đầu của Giáo viên.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#0284c7",
                confirmButtonText: "Khôi phục",
                cancelButtonText: "Hủy"
            });
            if (!conf.isConfirmed) return;

            editor.innerHTML = promptHtml;
            try { localStorage.removeItem(draftKey); } catch (e) {}
            Swal.fire({ icon: 'success', title: 'Đã khôi phục đề gốc!', timer: 1200, showConfirmButton: false });
        });

        // Close action
        function closeModal() {
            overlay.remove();
        }
        document.getElementById('sdmCloseModalBtn').addEventListener('click', closeModal);
        document.getElementById('sdmCancelBtn').addEventListener('click', closeModal);

        // Submit action
        document.getElementById('sdmSubmitBtn').addEventListener('click', async () => {
            const worksheetHtml = editor.innerHTML.trim();
            const worksheetText = editor.innerText.trim();

            if (!worksheetText && !worksheetHtml) {
                return Swal.fire("Chưa có nội dung", "Vui lòng làm bài tập trước khi nộp!", "warning");
            }

            const uid = window.currentUserUid;
            if (!uid || typeof firebase === 'undefined') {
                return Swal.fire("Thông báo", "Vui lòng đăng nhập để nộp bài tập!", "warning");
            }

            const confirmResult = await Swal.fire({
                title: "Nộp bài tập?",
                text: "Toàn bộ bài làm của bạn sẽ được gửi đến Giáo viên để chấm và sửa từng lỗi sai.",
                icon: "question",
                showCancelButton: true,
                confirmButtonColor: "#0284c7",
                confirmButtonText: "Nộp ngay",
                cancelButtonText: "Xem lại"
            });
            if (!confirmResult.isConfirmed) return;

            const submitBtn = document.getElementById('sdmSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang nộp...';

            try {
                const db = firebase.firestore();
                const user = firebase.auth().currentUser;
                const subRef = db.collection("shared_folders").doc(window.currentSharedFolderId)
                    .collection("exercises").doc(window.currentSharedExerciseId)
                    .collection("submissions").doc(uid);

                const newSubData = {
                    studentUid: uid,
                    studentName: (user && (user.displayName || (user.email ? user.email.split('@')[0] : 'Học viên'))) || 'Học viên',
                    studentEmail: (user && user.email) || '',
                    studentPhoto: (user && user.photoURL) || '',
                    studentWorksheetHtml: worksheetHtml,
                    originalText: worksheetText,
                    status: 'submitted',
                    submittedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await subRef.set(newSubData, { merge: true });

                try { localStorage.removeItem(draftKey); } catch (e) {}

                if (typeof confetti === 'function') {
                    try { confetti({ particleCount: 75, spread: 70, origin: { y: 0.65 } }); } catch (e) {}
                }

                closeModal();

                // Cập nhật giao diện bên ngoài
                renderStudentSubmissionView({
                    ...newSubData,
                    submittedAt: { toDate: () => new Date() }
                });

                Swal.fire({
                    icon: 'success',
                    title: '🎉 Nộp bài thành công!',
                    text: 'Giáo viên đã nhận được bài làm của bạn và sẽ sớm chấm điểm, sửa lỗi chi tiết.',
                    timer: 2500,
                    showConfirmButton: false
                });
            } catch (err) {
                console.error("Lỗi nộp bài:", err);
                Swal.fire("Lỗi nộp bài", err.message, "error");
                submitBtn.disabled = false;
                submitBtn.textContent = '📤 Nộp bài tập';
            }
        });

        setTimeout(() => editor.focus(), 150);
    };

    // Học viên nộp bài tập (Toàn bộ đề kèm câu trả lời đã làm trực tiếp)
    window.submitStudentExercise = async function () {
        const uid = window.currentUserUid;
        if (!uid || typeof firebase === 'undefined') {
            return Swal.fire("Thông báo", "Vui lòng đăng nhập để nộp bài tập!", "warning");
        }
        if (!window.currentSharedFolderId || !window.currentSharedExerciseId) {
            return Swal.fire("Lỗi", "Không tìm thấy thông tin bài học!", "error");
        }

        const wsBox = document.getElementById('studentWorksheetBox');
        const worksheetHtml = (wsBox ? wsBox.innerHTML : '').trim();
        const worksheetText = (wsBox ? wsBox.innerText : '').trim();

        if (!worksheetText && !worksheetHtml) {
            return Swal.fire("Chưa có nội dung", "Vui lòng làm bài tập trực tiếp vào đề trước khi nộp!", "warning");
        }

        const confirmResult = await Swal.fire({
            title: "Nộp bài tập?",
            text: "Toàn bộ bài làm của bạn sẽ được gửi đến Giáo viên để chấm và sửa từng lỗi sai.",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#0284c7",
            confirmButtonText: "Nộp ngay",
            cancelButtonText: "Xem lại"
        });
        if (!confirmResult.isConfirmed) return;

        const btn = document.getElementById('btnSubmitExercise');
        if (btn) { btn.disabled = true; btn.textContent = 'Đang nộp...'; }

        try {
            const db = firebase.firestore();
            const user = firebase.auth().currentUser;
            const subRef = db.collection("shared_folders").doc(window.currentSharedFolderId)
                .collection("exercises").doc(window.currentSharedExerciseId)
                .collection("submissions").doc(uid);

            await subRef.set({
                studentUid: uid,
                studentName: (user && (user.displayName || (user.email ? user.email.split('@')[0] : 'Học viên'))) || 'Học viên',
                studentEmail: (user && user.email) || '',
                studentPhoto: (user && user.photoURL) || '',
                studentWorksheetHtml: worksheetHtml,
                originalText: worksheetText,
                status: 'submitted',
                submittedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            try {
                const draftKey = 'draft_ws_' + window.currentSharedFolderId + '_' + window.currentSharedExerciseId;
                localStorage.removeItem(draftKey);
            } catch (e) {}

            if (typeof confetti === 'function') {
                try {
                    confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
                } catch (e) {}
            }

            Swal.fire({
                icon: 'success',
                title: '🎉 Nộp bài thành công!',
                text: 'Giáo viên đã nhận được bài làm của bạn và sẽ sớm chấm điểm, sửa lỗi chi tiết.',
                timer: 2500,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire("Lỗi nộp bài", err.message, "error");
        }
        if (btn) { btn.disabled = false; btn.textContent = '🔄 Cập nhật lại bài nộp'; }
    };

    // Render danh sách học viên nộp bài bên phía Giáo viên
    function renderTeacherSubmissionsList(subs) {
        const container = document.getElementById('teacherSubmissionsListContainer');
        if (!container) return;

        if (!subs || subs.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:35px 15px; color:#64748b; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">
                    <div style="font-size:2.2em; margin-bottom:8px;">📭</div>
                    <div style="font-weight:600; margin-bottom:4px;">Chưa có học viên nào nộp bài tập cho bài học này.</div>
                    <div style="font-size:0.85em; color:#94a3b8;">Khi học viên gửi bài, danh sách và bài làm sẽ tự động hiển thị tại đây để bạn chấm.</div>
                </div>
            `;
            return;
        }

        // Ưu tiên bài chờ chấm lên trước
        subs.sort((a, b) => {
            if (a.status === 'submitted' && b.status !== 'submitted') return -1;
            if (b.status === 'submitted' && a.status !== 'submitted') return 1;
            const ta = a.submittedAt && a.submittedAt.toMillis ? a.submittedAt.toMillis() : 0;
            const tb = b.submittedAt && b.submittedAt.toMillis ? b.submittedAt.toMillis() : 0;
            return tb - ta;
        });

        let html = '';
        subs.forEach(s => {
            const name = s.studentName || (s.studentEmail ? s.studentEmail.split('@')[0] : 'Học viên');
            const email = s.studentEmail || '';
            const photo = s.studentPhoto || '';
            const isGraded = s.status === 'graded';
            const timeStr = formatTimestamp(s.submittedAt);
            const initialLetter = (name.charAt(0) || 'H').toUpperCase();

            const statusBadge = isGraded
                ? `<span style="background:#dcfce7;color:#15803d;padding:4px 12px;border-radius:12px;font-weight:800;font-size:0.85em;display:flex;align-items:center;gap:4px;">✅ Đã chấm: ${escapeHtml(s.score || 'Đạt')}</span>`
                : `<span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:12px;font-weight:800;font-size:0.85em;display:flex;align-items:center;gap:4px;">⏳ Chờ chấm</span>`;

            html += `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.03);flex-wrap:wrap;gap:12px;transition:0.2s;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:44px;height:44px;border-radius:50%;background:#e0f2fe;color:#0369a1;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.15em;overflow:hidden;flex-shrink:0;">
                            ${photo ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;" onerror="this.remove()">` : initialLetter}
                        </div>
                        <div>
                            <div style="font-weight:800;color:#1e293b;font-size:1.02em;">${escapeHtml(name)}</div>
                            <div style="font-size:0.82em;color:#64748b;">${escapeHtml(email)} — <span style="color:#94a3b8;">${timeStr}</span></div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        ${statusBadge}
                        <button onclick="openGradeSubmissionModal('${s.studentId}')" class="btn-create-list" style="padding:7px 16px;font-size:0.85em;background:${isGraded ? '#059669' : '#0284c7'};border:none;box-shadow:none;">
                            ${isGraded ? '✏️ Xem & Sửa chấm' : '✍️ Chấm bài (Sửa lỗi như Docs)'}
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Lưu vùng chọn hiện tại của Giáo viên trong khung soạn thảo chấm bài
    function saveGradingSelection() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const r = sel.getRangeAt(0);
            const box = document.getElementById('gradingEditableBox');
            if (box && box.contains(r.commonAncestorContainer)) {
                _savedGradingRange = r.cloneRange();
            }
        }
    }

    function getOrRestoreGradingRange() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const r = sel.getRangeAt(0);
            const box = document.getElementById('gradingEditableBox');
            if (box && box.contains(r.commonAncestorContainer)) {
                return r;
            }
        }
        if (_savedGradingRange) {
            const box = document.getElementById('gradingEditableBox');
            if (box && box.contains(_savedGradingRange.commonAncestorContainer)) {
                return _savedGradingRange;
            }
        }
        return null;
    }

    function insertHtmlAtRange(range, htmlString) {
        range.deleteContents();
        const tempEl = document.createElement('div');
        tempEl.innerHTML = htmlString;
        const frag = document.createDocumentFragment();
        let node, lastNode;
        while ((node = tempEl.firstChild)) {
            lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
            const newRange = document.createRange();
            newRange.setStartAfter(lastNode);
            newRange.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(newRange);
            _savedGradingRange = newRange;
        }
    }

    let _pendingCorrectionType = null;
    let _pendingCorrectionRange = null;
    let _pendingCorrectionText = '';

    // Áp dụng công cụ sửa lỗi Google Docs (Thay thế, gạch bỏ, chèn, bình luận, xóa sửa)
    window.triggerInlineTool = function (type) {
        const range = getOrRestoreGradingRange();
        const box = document.getElementById('gradingEditableBox');
        if (!box) return;

        if (!range) {
            return Swal.fire({
                title: "Nhắc nhở",
                text: "Vui lòng nhấp chuột hoặc bôi đen từ/câu cần sửa trong khung bài làm của học viên trước!",
                icon: "info",
                timer: 2000,
                showConfirmButton: false
            });
        }

        const selectedText = range.toString().trim();

        // 1. GẠCH BỎ (TỪ THỪA) -> Áp dụng ngay lập tức không cần gõ
        if (type === 'delete') {
            if (!selectedText) {
                return Swal.fire({
                    title: "Nhắc nhở",
                    text: "Vui lòng bôi đen từ thừa của học viên cần gạch bỏ!",
                    icon: "info",
                    timer: 2000,
                    showConfirmButton: false
                });
            }
            const html = `<del class="doc-strike">${escapeHtml(selectedText)}</del>&nbsp;`;
            insertHtmlAtRange(range, html);
            cancelInlineAction();
            return;
        }

        // 2. XÓA SỬA LỖI (REVERT) -> Trả về văn bản gốc
        if (type === 'clear') {
            cancelInlineAction();
            let node = range.commonAncestorContainer;
            if (node.nodeType === 3) node = node.parentNode;
            const parentTag = node.closest('.doc-strike, .doc-insert, .doc-comment');
            if (parentTag) {
                if (parentTag.classList.contains('doc-comment')) {
                    parentTag.remove();
                } else {
                    const txt = parentTag.textContent;
                    const textNode = document.createTextNode(txt);
                    parentTag.parentNode.replaceChild(textNode, parentTag);
                }
            } else if (selectedText) {
                const textNode = document.createTextNode(selectedText);
                range.deleteContents();
                range.insertNode(textNode);
            }
            return;
        }

        // 3. CÁC TÍNH NĂNG CẦN NHẬP NỘI DUNG (REPLACE, INSERT, COMMENT) -> MỞ THANH NHẬP INLINE
        _pendingCorrectionType = type;
        _pendingCorrectionRange = range.cloneRange();
        _pendingCorrectionText = selectedText;

        const bar = document.getElementById('inlineCorrectionActionBar');
        const lbl = document.getElementById('inlineActionPromptLabel');
        const inp = document.getElementById('inlineActionInput');
        if (!bar || !lbl || !inp) return;

        if (type === 'replace') {
            if (!selectedText) {
                return Swal.fire({
                    title: "Nhắc nhở",
                    text: "Vui lòng bôi đen từ/câu mà học viên viết sai cần thay thế!",
                    icon: "info",
                    timer: 2000,
                    showConfirmButton: false
                });
            }
            lbl.innerHTML = `✍️ Thay thế cho từ sai <b style="color:#ef4444;text-decoration:line-through;">"${escapeHtml(selectedText)}"</b>:`;
            inp.placeholder = "Nhập từ/câu đúng thay thế rồi bấm Enter...";
            inp.value = '';
        } else if (type === 'insert') {
            lbl.innerHTML = `🟢 ➕ Chèn từ còn thiếu:`;
            inp.placeholder = "Nhập từ/cụm từ cần chèn vào rồi bấm Enter...";
            inp.value = '';
        } else if (type === 'comment') {
            const targetInfo = selectedText ? `cho "${escapeHtml(selectedText)}"` : 'tại vị trí này';
            lbl.innerHTML = `💬 Thêm ghi chú/nhận xét ${targetInfo}:`;
            inp.placeholder = "Nhập lưu ý ngữ pháp, giải thích lỗi sai rồi bấm Enter...";
            inp.value = '';
        }

        bar.style.display = 'block';
        setTimeout(() => {
            if (inp) { inp.focus(); inp.select(); }
        }, 50);
    };
    window.applyInlineCorrection = window.triggerInlineTool;

    // Xác nhận áp dụng nội dung sửa lỗi
    window.confirmInlineAction = function () {
        if (!_pendingCorrectionType || !_pendingCorrectionRange) return cancelInlineAction();

        const inp = document.getElementById('inlineActionInput');
        const val = (inp ? inp.value : '').trim();

        if (!val) {
            if (inp) inp.focus();
            return;
        }

        if (_pendingCorrectionType === 'replace') {
            const html = `<del class="doc-strike">${escapeHtml(_pendingCorrectionText)}</del>&nbsp;<ins class="doc-insert">${escapeHtml(val)}</ins>&nbsp;`;
            insertHtmlAtRange(_pendingCorrectionRange, html);
        } else if (_pendingCorrectionType === 'insert') {
            const html = `&nbsp;<ins class="doc-insert">${escapeHtml(val)}</ins>&nbsp;`;
            insertHtmlAtRange(_pendingCorrectionRange, html);
        } else if (_pendingCorrectionType === 'comment') {
            const html = `&nbsp;<span class="doc-comment">💬 [GV: ${escapeHtml(val)}]</span>&nbsp;`;
            insertHtmlAtRange(_pendingCorrectionRange, html);
        }

        cancelInlineAction();
    };

    // Hủy bỏ thanh nhập inline
    window.cancelInlineAction = function () {
        _pendingCorrectionType = null;
        _pendingCorrectionRange = null;
        _pendingCorrectionText = '';
        const bar = document.getElementById('inlineCorrectionActionBar');
        if (bar) bar.style.display = 'none';
        const inp = document.getElementById('inlineActionInput');
        if (inp) inp.value = '';
    };

    // Mở Modal Chấm bài học viên Toàn Màn Hình (Fullscreen Grading Studio)
    window.openGradeSubmissionModal = async function (studentId) {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedExerciseId) return;

        ensureGrammarEditorStyles();

        Swal.fire({
            title: 'Đang tải bài làm của học viên...',
            didOpen: () => Swal.showLoading()
        });

        try {
            const db = firebase.firestore();
            const subDoc = await db.collection("shared_folders").doc(window.currentSharedFolderId)
                .collection("exercises").doc(window.currentSharedExerciseId)
                .collection("submissions").doc(studentId).get();

            if (!subDoc.exists) {
                return Swal.fire("Lỗi", "Không tìm thấy bài nộp của học viên này!", "error");
            }

            const sub = subDoc.data();
            Swal.close();

            const modalId = '_gradeSubmissionModal';
            const old = document.getElementById(modalId);
            if (old) old.remove();

            const studentName = sub.studentName || sub.studentEmail || 'Học viên';
            const initialHtml = sub.correctedHtml || sub.studentWorksheetHtml || textToParagraphsHtml(sub.originalText || '');
            const initialScore = sub.score || '';
            const initialFeedback = sub.teacherFeedback || '';
            const submittedTimeStr = formatTimestamp(sub.submittedAt);
            let isFullscreen = true;

            const overlay = document.createElement('div');
            overlay.id = modalId;

            overlay.innerHTML = `
                <div class="gfm-container" id="gsmContainer">
                    <!-- TOP HEADER -->
                    <div class="gfm-header" style="background:linear-gradient(135deg, #f0fdf4, #dcfce7);padding:6px 16px;">
                        <div class="gfm-title-area">
                            <span class="gfm-badge gfm-badge-green">✍️ CHẤM BÀI</span>
                            <span style="font-weight:700;font-size:0.9em;color:#166534;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                ${escapeHtml(studentName)} — <b>${submittedTimeStr}</b>
                            </span>
                        </div>

                        <!-- WINDOW ACTIONS -->
                        <div style="display:flex;align-items:center;gap:4px;">
                            <button type="button" class="gfm-tool-btn" id="gsmToggleFullscreenBtn" title="Phóng to / Thu nhỏ" style="font-size:1.05em;padding:3px 6px;">
                                ⛶
                            </button>
                            <button type="button" class="gfm-tool-btn" onclick="document.getElementById('${modalId}').remove()" title="Đóng cửa sổ" style="font-size:1.25em;color:#ef4444;padding:3px 6px;">
                                &times;
                            </button>
                        </div>
                    </div>

                    <!-- WORKSPACE -->
                    <div class="gfm-workspace" style="flex-direction:column;overflow:hidden;background:#f1f5f9;">
                        <!-- TOOLBARS (ĐẦY ĐỦ NHƯ NGỮ PHÁP + CÔNG CỤ SỬA LỖI DOCS CHUYÊN DỤNG) -->
                        <div class="gfm-toolbar" style="background:#f8fafc;padding:8px 16px;border-bottom:1px solid #e2e8f0;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                            <!-- Google Docs Inline Suggestion Tools -->
                            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;background:#fff;padding:3px 6px;border:1.5px solid #cbd5e1;border-radius:8px;">
                                <span style="font-size:0.8em;font-weight:900;color:#0f172a;letter-spacing:0.3px;margin-right:2px;">🛠️ SỬA LỖI:</span>
                                <button type="button" onmousedown="event.preventDefault()" onclick="triggerInlineTool('delete')" class="btn-edit" 
                                        style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;padding:5px 12px;font-size:0.83em;font-weight:800;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Bôi đen từ thừa/sai để gạch đỏ ngay lập tức">
                                    ❌ Xóa bỏ (Gạch đỏ)
                                </button>
                                <button type="button" onmousedown="event.preventDefault()" onclick="triggerInlineTool('replace')" class="btn-edit" 
                                        style="background:#f0fdf4;color:#15803d;border:1px solid #86efac;padding:5px 12px;font-size:0.83em;font-weight:800;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Bôi đen từ sai và nhập câu đúng để gạch đỏ từ sai và tô xanh câu đúng">
                                    ✏️ Đề xuất sửa (Tô xanh)
                                </button>
                                <button type="button" onmousedown="event.preventDefault()" onclick="triggerInlineTool('insert')" class="btn-edit" 
                                        style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:5px 10px;font-size:0.83em;font-weight:700;border-radius:6px;cursor:pointer;" title="Chèn thêm từ còn thiếu (tô xanh)">
                                    ➕ Chèn từ
                                </button>
                                <button type="button" onmousedown="event.preventDefault()" onclick="triggerInlineTool('comment')" class="btn-edit" 
                                        style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:5px 10px;font-size:0.83em;font-weight:700;border-radius:6px;cursor:pointer;" title="Thêm nhận xét inline">
                                    💬 Nhận xét
                                </button>
                                <button type="button" onmousedown="event.preventDefault()" onclick="triggerInlineTool('clear')" class="btn-edit" 
                                        style="background:#ffffff;color:#64748b;border:1px solid #cbd5e1;padding:5px 8px;font-size:0.83em;border-radius:6px;cursor:pointer;" title="Xóa bỏ sửa lỗi đoạn đã chọn">
                                    ↩️ Xóa sửa
                                </button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- Font Family -->
                            <div class="gfm-tool-group" title="Chọn Font chữ">
                                <select id="gsmFontFamily" class="gfm-select">
                                    <option value="'Pretendard', sans-serif">Pretendard (Chuẩn)</option>
                                    <option value="'Nanum Gothic', sans-serif">Nanum Gothic (나눔고딕)</option>
                                    <option value="'Nanum Myeongjo', serif">Nanum Myeongjo (나눔명조)</option>
                                    <option value="Inter, sans-serif">Inter</option>
                                    <option value="Roboto, sans-serif">Roboto</option>
                                    <option value="Arial, sans-serif">Arial</option>
                                    <option value="'Times New Roman', serif">Times New Roman</option>
                                    <option value="'Courier New', monospace">Courier New</option>
                                </select>
                            </div>

                            <!-- Font Size -->
                            <div class="gfm-tool-group" title="Kích thước chữ">
                                <select id="gsmFontSize" class="gfm-select">
                                    <option value="14px">14px - Nhỏ</option>
                                    <option value="16px">16px - Vừa</option>
                                    <option value="18px" selected>18px - Chuẩn</option>
                                    <option value="20px">20px - Lớn</option>
                                    <option value="24px">24px - Tiêu đề</option>
                                </select>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- Text Color -->
                            <div class="gfm-tool-group" title="Màu chữ">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Chữ:</span>
                                <input type="color" id="gsmTextColorPicker" value="#dc2626" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu chữ">
                                <button type="button" class="gfm-tool-btn" data-color="#dc2626" style="color:#dc2626;padding:2px 4px;font-size:0.82em;" title="Đỏ">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#15803d" style="color:#15803d;padding:2px 4px;font-size:0.82em;" title="Xanh lá">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#0284c7" style="color:#0284c7;padding:2px 4px;font-size:0.82em;" title="Xanh dương">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#7c3aed" style="color:#7c3aed;padding:2px 4px;font-size:0.82em;" title="Tím">A</button>
                            </div>

                            <!-- Highlight Color -->
                            <div class="gfm-tool-group" title="Màu nền / Highlight">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Nền:</span>
                                <input type="color" id="gsmBgColorPicker" value="#fef08a" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu nền">
                                <button type="button" class="gfm-tool-btn" data-bg="#fef08a" style="background:#fef08a;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Vàng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bbf7d0" style="background:#bbf7d0;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh lá nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bae6fd" style="background:#bae6fd;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#fecdd3" style="background:#fecdd3;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Hồng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="transparent" style="font-size:0.75em;color:#64748b;padding:2px 4px;" title="Xóa nền">✕</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- NÚT CHÈN Ô VÍ DỤ / SỬA MẪU NGANG -->
                            <button type="button" class="gfm-tool-btn" id="gsmInsertExampleBtn"
                                    title="Bấm: Chèn ô ví dụ sửa mẫu | Ấn giữ: Chọn màu sắc ô"
                                    style="background:#f0fdf4;border:1.5px solid #10b981;color:#15803d;padding:3px 9px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:5px;border-radius:6px;cursor:pointer;">
                                <span>💡 Ô ví dụ / Sửa mẫu</span>
                                <span class="gfm-color-dot-indicator" style="width:9px;height:9px;border-radius:50%;background:#10b981;border:1px solid #fff;box-shadow:0 0 0 1px #10b981;"></span>
                                <span style="font-size:0.7em;opacity:0.7;">▾</span>
                            </button>

                            <span class="gfm-tool-sep"></span>

                            <!-- Basic Styles -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="bold" title="In đậm (Ctrl+B)"><b>B</b></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="italic" title="In nghiêng (Ctrl+I)"><i>I</i></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="underline" title="Gạch chân (Ctrl+U)"><u>U</u></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button>
                            </div>

                            <!-- Alignments -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyLeft" title="Căn trái">⇤</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyCenter" title="Căn giữa">≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyRight" title="Căn phải">⇥</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyFull" title="Căn đều">⇹</button>
                            </div>

                            <!-- Lists -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertUnorderedList" title="Danh sách chấm tròn">•≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="insertOrderedList" title="Danh sách số 1,2,3">1≡</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- Utilities -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertHorizontalRule" title="Đường kẻ ngang">―</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="removeFormat" title="Xóa định dạng" style="color:#ef4444;">Tx</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="undo" title="Hoàn tác (Ctrl+Z)">↶</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="redo" title="Làm lại (Ctrl+Y)">↷</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- BỘ GÕ TELEX TÍCH HỢP -->
                            <button type="button" class="gfm-tool-btn gfm-telex-toggle-btn" onclick="window.toggleWebTelex()"
                                    title="Bộ gõ Telex tích hợp: Khi bật, bạn có thể để EVKey ở chữ E, chỉ cần bấm Alt để đổi giữa gõ tiếng Hàn (가) và tiếng Việt (A)!"
                                    style="background:#eff6ff;border:1.5px solid #3b82f6;color:#1d4ed8;padding:3px 8px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:4px;border-radius:6px;cursor:pointer;">
                                <span class="telex-status-icon">🇻🇳</span>
                                <span class="telex-status-text">Telex: BẬT</span>
                            </button>
                        </div>

                        <!-- SCROLL WRAPPER (CENTERED DOCUMENT CANVAS) -->
                        <div class="gfm-editor-scroll-wrap">
                            <div style="max-width:880px;width:100%;display:flex;flex-direction:column;gap:18px;">
                                <!-- Dynamic Action Input Bar for Inline Corrections -->
                                <div id="inlineCorrectionActionBar" style="display:none;padding:10px 16px;background:#ffffff;border:2px solid #0284c7;border-radius:10px;box-shadow:0 4px 14px rgba(2,132,199,0.18);">
                                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                        <span id="inlineActionPromptLabel" style="font-size:0.88em;font-weight:700;color:#0369a1;"></span>
                                        <input type="text" id="inlineActionInput" onkeydown="if(event.key==='Enter'){event.preventDefault();confirmInlineAction();}else if(event.key==='Escape'){cancelInlineAction();}" style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.95em;outline:none;" placeholder="...">
                                        <button type="button" onclick="confirmInlineAction()" style="background:#0284c7;color:#ffffff;border:none;padding:8px 18px;border-radius:6px;font-weight:700;font-size:0.88em;cursor:pointer;">
                                            Áp dụng (Enter)
                                        </button>
                                        <button type="button" onclick="cancelInlineAction()" style="background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;padding:8px 12px;border-radius:6px;font-weight:600;font-size:0.88em;cursor:pointer;">
                                            ✕ Hủy
                                        </button>
                                    </div>
                                </div>

                                <!-- Student Worksheet Content Area (Centered Card with margins) -->
                                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.04);padding:24px 28px;display:flex;flex-direction:column;">
                                    <label style="font-weight:800;font-size:0.92em;color:#334155;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
                                        <span>📄 BÀI LÀM CỦA HỌC VIÊN (SỬA TRỰC TIẾP HOẶC BÔI ĐEN ĐỂ SỬA LỖI):</span>
                                    </label>
                                    <div id="gradingEditableBox" contenteditable="true" class="gfm-editor-content"
                                         style="min-height:360px;height:auto;border:1.5px solid #cbd5e1;border-radius:12px;padding:22px 26px;font-size:1.15em;line-height:1.85;box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);max-width:100%;">${initialHtml}</div>
                                </div>

                                <!-- Điểm số & Nhận xét của Giáo viên (Centered Card with margins) -->
                                <div style="display:grid;grid-template-columns:1fr 2fr;gap:18px;padding:20px 24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
                                    <div>
                                        <label style="font-weight:800;font-size:0.88em;color:#1e293b;margin-bottom:6px;display:block;">
                                            🎯 ĐIỂM SỐ / XẾP LOẠI:
                                        </label>
                                        <input type="text" id="gradingScoreInput" value="${escapeHtml(initialScore)}" placeholder="VD: 10/10, 9.5, Đạt..." 
                                               style="width:100%;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:1.05em;font-weight:800;color:#15803d;box-sizing:border-box;margin-bottom:8px;">
                                        <div style="display:flex;flex-wrap:wrap;gap:4px;">
                                            ${['10/10', '9.5', '9/10', '8.5', '8/10', 'Đạt', 'Cần sửa'].map(sc => `
                                                <button type="button" onclick="document.getElementById('gradingScoreInput').value='${sc}'" style="background:#ffffff;border:1px solid #cbd5e1;padding:3px 8px;border-radius:6px;font-size:0.78em;font-weight:700;cursor:pointer;color:#475569;">
                                                    ${sc}
                                                </button>
                                            `).join('')}
                                        </div>
                                    </div>
                                    <div>
                                        <label style="font-weight:800;font-size:0.88em;color:#1e293b;margin-bottom:6px;display:block;">
                                            💬 LỜI NHẬN XÉT CỦA GIÁO VIÊN:
                                        </label>
                                        <textarea id="gradingTeacherFeedback" placeholder="Nhận xét chi tiết về ngữ pháp, lỗi chính tả, từ vựng và lời động viên học viên..." 
                                                  style="width:100%;height:85px;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.95em;line-height:1.5;box-sizing:border-box;font-family:inherit;outline:none;">${escapeHtml(initialFeedback)}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- MODAL FOOTER -->
                    <div class="gfm-footer">
                        <button onclick="document.getElementById('${modalId}').remove()" style="background:#f1f5f9;color:#64748b;border:none;padding:10px 20px;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.9em;">
                            Đóng
                        </button>
                        <button id="btnSaveGrading" onclick="saveGradingSubmissionAction('${studentId}')" style="background:linear-gradient(135deg, #16a34a, #15803d);color:#ffffff;border:none;padding:10px 26px;border-radius:10px;font-weight:800;cursor:pointer;font-size:0.92em;box-shadow:0 4px 14px rgba(22,163,74,0.35);display:flex;align-items:center;gap:8px;">
                            <span>💾 Hoàn tất chấm bài & Gửi kết quả cho học viên</span>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
        if (typeof updateAllTelexUI === 'function') updateAllTelexUI();

            const container = document.getElementById('gsmContainer');
            const gBox = document.getElementById('gradingEditableBox');

            // Setup Ô Ví Dụ Ngang trong Chấm bài
            setupHorizontalExampleTool({
                btn: document.getElementById('gsmInsertExampleBtn'),
                getEditor: () => gBox,
                getSavedRange: () => _savedGradingRange,
                defaultBadge: '💡 Ví dụ sửa mẫu / Cấu trúc chuẩn',
                placeholderKr: 'VD sửa mẫu: [Nhập câu ví dụ hoặc mẫu câu chuẩn...]',
                placeholderVn: '👉 Giải thích: [Nhập lưu ý hoặc nghĩa câu chuẩn...]'
            });

            if (gBox) {
                ['mouseup', 'keyup', 'touchend', 'selectionchange'].forEach(evt => {
                    gBox.addEventListener(evt, saveGradingSelection);
                });
            }

            // Formatting tools in grading modal
            overlay.querySelectorAll('.gfm-toolbar button[data-cmd]').forEach(btn => {
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', () => {
                    const r = getOrRestoreGradingRange();
                    if (r) {
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(r);
                    }
                    document.execCommand(btn.dataset.cmd, false, null);
                    saveGradingSelection();
                });
            });

            // Font family
            const gsmFontFamily = document.getElementById('gsmFontFamily');
            if (gsmFontFamily) {
                gsmFontFamily.addEventListener('change', (e) => {
                    const r = getOrRestoreGradingRange();
                    if (r) {
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(r);
                    }
                    document.execCommand('fontName', false, e.target.value);
                    saveGradingSelection();
                });
            }

            // Font size
            const gsmFontSize = document.getElementById('gsmFontSize');
            if (gsmFontSize) {
                gsmFontSize.addEventListener('change', (e) => {
                    const r = getOrRestoreGradingRange();
                    if (r) {
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(r);
                    }
                    const sz = e.target.value;
                    document.execCommand('fontSize', false, '7');
                    gBox.querySelectorAll('font[size="7"]').forEach(f => {
                        f.removeAttribute('size');
                        f.style.fontSize = sz;
                    });
                    saveGradingSelection();
                });
            }

            // Text color
            const gsmTextColorPicker = document.getElementById('gsmTextColorPicker');
            if (gsmTextColorPicker) {
                gsmTextColorPicker.addEventListener('input', () => {
                    const r = getOrRestoreGradingRange();
                    if (r) {
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(r);
                    }
                    document.execCommand('foreColor', false, gsmTextColorPicker.value);
                    saveGradingSelection();
                });
            }
            overlay.querySelectorAll('.gfm-toolbar button[data-color]').forEach(btn => {
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', () => {
                    const r = getOrRestoreGradingRange();
                    if (r) {
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(r);
                    }
                    document.execCommand('foreColor', false, btn.dataset.color);
                    if (gsmTextColorPicker) gsmTextColorPicker.value = btn.dataset.color;
                    saveGradingSelection();
                });
            });

            // Highlight color
            const gsmBgColorPicker = document.getElementById('gsmBgColorPicker');
            if (gsmBgColorPicker) {
                gsmBgColorPicker.addEventListener('input', () => {
                    const r = getOrRestoreGradingRange();
                    if (r) {
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(r);
                    }
                    try { document.execCommand('hiliteColor', false, gsmBgColorPicker.value); }
                    catch (e) { document.execCommand('backColor', false, gsmBgColorPicker.value); }
                    saveGradingSelection();
                });
            }
            overlay.querySelectorAll('.gfm-toolbar button[data-bg]').forEach(btn => {
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', () => {
                    const r = getOrRestoreGradingRange();
                    if (r) {
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(r);
                    }
                    const color = btn.dataset.bg;
                    if (color === 'transparent') {
                        document.execCommand('removeFormat', false, null);
                    } else {
                        try { document.execCommand('hiliteColor', false, color); }
                        catch (e) { document.execCommand('backColor', false, color); }
                        if (gsmBgColorPicker) gsmBgColorPicker.value = color;
                    }
                    saveGradingSelection();
                });
            });

            // Fullscreen toggle
            document.getElementById('gsmToggleFullscreenBtn').addEventListener('click', () => {
                isFullscreen = !isFullscreen;
                if (isFullscreen) {
                    container.classList.remove('is-windowed');
                    document.getElementById('gsmToggleFullscreenBtn').textContent = '⛶';
                } else {
                    container.classList.add('is-windowed');
                    document.getElementById('gsmToggleFullscreenBtn').textContent = '🗖';
                }
            });

            window.saveGradingSubmissionAction = async function (stId) {
                const box = document.getElementById('gradingEditableBox');
                const scoreInp = document.getElementById('gradingScoreInput');
                const fbText = document.getElementById('gradingTeacherFeedback');
                const btn = document.getElementById('btnSaveGrading');

                if (!box) return;

                const correctedHtml = box.innerHTML;
                const score = (scoreInp ? scoreInp.value : '').trim();
                const feedback = (fbText ? fbText.value : '').trim();

                if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu kết quả...'; }

                try {
                    const db = firebase.firestore();
                    await db.collection("shared_folders").doc(window.currentSharedFolderId)
                        .collection("exercises").doc(window.currentSharedExerciseId)
                        .collection("submissions").doc(stId).set({
                            correctedHtml: correctedHtml,
                            score: score,
                            teacherFeedback: feedback,
                            status: 'graded',
                            gradedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });

                    const m = document.getElementById(modalId);
                    if (m) m.remove();

                    Swal.fire({
                        icon: 'success',
                        title: '🎉 Đã chấm bài thành công!',
                        text: 'Kết quả chấm và các đề xuất sửa lỗi kiểu Google Docs đã được gửi đến học viên.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } catch (e) {
                    Swal.fire("Lỗi lưu chấm bài", e.message, "error");
                    if (btn) { btn.disabled = false; btn.textContent = '💾 Hoàn tất chấm bài & Gửi kết quả'; }
                }
            };

        } catch (err) {
            Swal.fire("Lỗi", err.message, "error");
        }
    };

    // Helper: Phân tích nội dung ngữ pháp dán vào và tự động tách theo số tuần tự 1, 2, 3, 4, 5...
    // Nhận diện chính xác tiêu đề ngữ pháp (có số 1. 2. 3. 4 lớn nhất và in đậm)
    // Và hỗ trợ phân tách từng ngữ pháp bằng dấu --- (hoặc <hr>)
    // Helper: Sửa lỗi newline thật bên trong chuỗi JSON (khi paste từ contenteditable)
    // Trình duyệt chuyển \n trong JSON string thành newline thật, làm JSON.parse thất bại
    function fixNewlinesInsideJsonStrings(jsonStr) {
        var result = '';
        var inString = false;
        var escaped = false;
        for (var i = 0; i < jsonStr.length; i++) {
            var ch = jsonStr[i];
            if (escaped) { result += ch; escaped = false; continue; }
            if (ch === '\\' && inString) { result += ch; escaped = true; continue; }
            if (ch === '"') { inString = !inString; result += ch; continue; }
            if (inString && (ch === '\n' || ch === '\r')) {
                if (ch === '\r' && jsonStr[i + 1] === '\n') i++;
                result += '\\n';
                continue;
            }
            if (inString && ch === '\t') { result += '\\t'; continue; }
            result += ch;
        }
        return result;
    }

    function parsePastedGrammar(rawHtml, rawText) {
        if (!rawHtml && !rawText) return [];

        // 0. HỖ TRỢ DÁN JSON TRỰC TIẾP (Từ Gemini prompt hoặc Admin export)
        let rawStr = (rawText || (rawHtml ? rawHtml.replace(/<[^>]+>/g, ' ') : '')).trim();
        rawStr = rawStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        const firstBracket = rawStr.indexOf('[');
        const lastBracket = rawStr.lastIndexOf(']');
        const firstBrace = rawStr.indexOf('{');
        const lastBrace = rawStr.lastIndexOf('}');

        let jsonCandidate = null;
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            jsonCandidate = rawStr.substring(firstBracket, lastBracket + 1);
        } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonCandidate = rawStr.substring(firstBrace, lastBrace + 1);
        }

        if (jsonCandidate) {
            // Tự động dọn dẹp các lỗi JSON thường gặp từ LLM / Gemini:
            // 0. Sửa newline thật bên trong chuỗi JSON (contenteditable chuyển \n thành newline thật)
            let cleanedJson = fixNewlinesInsideJsonStrings(jsonCandidate);
            // 1. Sửa lỗi escape sai chuẩn JSON: \' -> '
            cleanedJson = cleanedJson
                .replace(/\\+'+/g, "'")
                .replace(/,\s*([\]\}])/g, '$1');

            let parsed = null;
            try {
                parsed = JSON.parse(cleanedJson);
            } catch (err1) {
                try {
                    // 2. Sửa lỗi dấu ngoặc kép không escape trong thẻ HTML
                    const fixedQuotes = cleanedJson.replace(/<([^>]+)>/g, function(tag) {
                        return tag.replace(/(\w+)\s*=\s*"([^"]*)"/g, "$1='$2'");
                    });
                    parsed = JSON.parse(fixedQuotes);
                } catch (err2) {
                    console.warn("Lỗi phân tích JSON ngữ pháp:", err1, err2);
                }
            }

            if (parsed) {
                const arr = Array.isArray(parsed) ? parsed : [parsed];
                const validItems = [];
                arr.forEach((it, idx) => {
                    if (it && (it.korean || it.title || it.meaning || it.content || it.rules)) {
                        const title = it.title || it.korean || (it.vietnamese ? `${it.korean || 'Ngữ pháp'} - ${it.vietnamese}` : `Ngữ pháp ${idx + 1}`);
                        const contentHtml = (it.meaning || it.rules || it.examples || it.quiz)
                            ? buildHtmlFromStructuredDataVocab(it)
                            : formatGrammarContentForVocab(it);
                        validItems.push({
                            index: idx + 1,
                            title: title,
                            contentHtml: contentHtml
                        });
                    }
                });
                if (validItems.length > 0) {
                    return validItems;
                }
            }
        }

        const container = document.createElement('div');
        container.innerHTML = rawHtml || (rawText || '').replace(/\n/g, '<br>');

        function parseNum(val) {
            if (!val) return null;
            val = String(val).trim();
            const d = parseInt(val, 10);
            if (!isNaN(d)) return d;
            const circled = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
            const cIdx = circled.indexOf(val);
            if (cIdx !== -1) return cIdx + 1;
            const roman = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ'];
            const rIdx = roman.indexOf(val);
            if (rIdx !== -1) return rIdx + 1;
            return null;
        }

        const titleNumberRegex = /^\s*(?:(?:Ngữ\s*pháp|Grammar|Mẫu\s*câu|Cấu\s*trúc|Bài|Mục|Phần)\s*)?(?:\[\s*([0-9]{1,2}|[①-⑳]|[Ⅰ-Ⅻ])\s*\]|\(\s*([0-9]{1,2}|[①-⑳]|[Ⅰ-Ⅻ])\s*\)|【\s*([0-9]{1,2}|[①-⑳]|[Ⅰ-Ⅻ])\s*】|([①-⑳]|[Ⅰ-Ⅻ])|([0-9]{1,2}))[\.\:\)\/\-\s\—]/i;
        const dividerPattern = /^\s*(?:-{3,}|={3,}|_{3,}|\*{3,}|#{3,}|[\u2014\u2015]{2,}|(?:–\s*){3,})\s*$/;
        const exampleMarkerPattern = /^\s*(?:Ví\s*dụ|Ví\s*dụ\s*\:|VD\s*\:|VD|예|예문|Example)\b/i;

        // Trích xuất số thứ tự tiêu đề
        function getTitleNumber(txt) {
            if (!txt) return null;
            const clean = txt.trim();
            if (exampleMarkerPattern.test(clean)) return null;
            const m = clean.match(titleNumberRegex);
            if (!m) return null;
            return parseNum(m[1] || m[2] || m[3] || m[4] || m[5]);
        }

        // Kiểm tra xem 1 phần tử có phải là Divider (---) không
        function isDividerEl(el) {
            if (!el) return false;
            if (el.tagName === 'HR') return true;
            const txt = (el.textContent || '').trim();
            return dividerPattern.test(txt);
        }

        // Kiểm tra xem 1 phần tử có phải là "In đậm" hoặc "Chữ lớn / Tiêu đề" không
        function isElementBoldOrHeading(el) {
            if (!el) return false;
            if (/^H[1-6]$/i.test(el.tagName)) return true;
            if (el.querySelector && el.querySelector('b, strong, h1, h2, h3, h4, h5, h6')) return true;
            const style = (el.getAttribute && el.getAttribute('style')) || '';
            if (/font-weight\s*:\s*(bold|[7-9]00)/i.test(style)) return true;
            if (/font-size\s*:\s*([2-9]\dpx|1[8-9]px|1\.[2-9]em|[2-9]em)/i.test(style)) return true;
            if (el.querySelector && el.querySelector('font[size="5"], font[size="6"], font[size="7"]')) return true;
            return false;
        }

        // Lấy danh sách block elements con
        let blocks = Array.from(container.children);
        if (blocks.length === 1 && blocks[0].children && blocks[0].children.length > 1) {
            blocks = Array.from(blocks[0].children);
        }

        // Nếu không có block element (ví dụ plain text hoặc toàn <br>), tách theo dòng văn bản
        if (blocks.length <= 1 && (!container.firstElementChild || container.children.length === 0)) {
            const raw = (rawText || container.innerText || container.innerHTML || '').replace(/<br\s*[\/]?>/gi, '\n');
            const lines = raw.split('\n');
            const newDiv = document.createElement('div');
            lines.forEach(l => {
                const tr = l.trim();
                if (dividerPattern.test(tr)) {
                    newDiv.appendChild(document.createElement('hr'));
                } else if (tr) {
                    const p = document.createElement('p');
                    p.innerHTML = l;
                    newDiv.appendChild(p);
                }
            });
            blocks = Array.from(newDiv.children);
        }

        // =====================================================================
        // TRƯỜNG HỢP 1: NỘI DUNG CÓ DẤU PHÂN CÁCH '---' (HOẶC <hr>)
        // =====================================================================
        const hasDivider = blocks.some(el => isDividerEl(el));

        if (hasDivider) {
            const chunks = [];
            let curChunk = [];

            blocks.forEach(el => {
                if (isDividerEl(el)) {
                    if (curChunk.length > 0) {
                        chunks.push(curChunk);
                        curChunk = [];
                    }
                } else {
                    const t = (el.textContent || '').trim();
                    if (curChunk.length > 0 || t || (el.querySelector && el.querySelector('img, table, iframe'))) {
                        curChunk.push(el);
                    }
                }
            });
            if (curChunk.length > 0) chunks.push(curChunk);

            const items = [];
            chunks.forEach((chunk, chunkIdx) => {
                if (chunk.length === 0) return;

                // Tìm tiêu đề ngữ pháp trong chunk: ưu tiên phần tử có số 1. 2. 3. 4... lớn nhất và in đậm
                let bestTitle = '';
                let bestScore = -1;

                chunk.forEach((el, elIdx) => {
                    const txt = (el.textContent || '').trim();
                    if (!txt) return;

                    const num = getTitleNumber(txt);
                    const isBold = isElementBoldOrHeading(el);

                    let score = 0;
                    if (num !== null) score += 100;
                    if (isBold) score += 50;
                    if (/^H[1-4]$/i.test(el.tagName)) score += 30;
                    if (elIdx === 0) score += 20;

                    if (score > bestScore) {
                        bestScore = score;
                        bestTitle = txt.split('\n')[0].substring(0, 100).trim();
                    }
                });

                if (!bestTitle) {
                    const firstTxt = (chunk[0].textContent || '').trim();
                    bestTitle = firstTxt ? firstTxt.split('\n')[0].substring(0, 100).trim() : `Ngữ pháp ${chunkIdx + 1}`;
                }

                const contentHtml = chunk.map(el => el.outerHTML).join('').trim();
                if (contentHtml) {
                    items.push({
                        index: items.length + 1,
                        title: bestTitle,
                        contentHtml: contentHtml
                    });
                }
            });

            if (items.length > 0) return items;
        }

        // =====================================================================
        // TRƯỜNG HỢP 2: KHÔNG CÓ DẤU '---', TÁCH THEO TIÊU ĐỀ SỐ 1. 2. 3. 4... LỚN NHẤT VÀ IN ĐẬM
        // =====================================================================
        const items = [];
        let currentItem = null;
        let expectedNum = 1;

        function finalizeCurrent() {
            if (currentItem && currentItem.htmlParts.length > 0) {
                const fullHtml = currentItem.htmlParts.join('').trim();
                if (fullHtml) {
                    items.push({
                        index: items.length + 1,
                        title: currentItem.title || `Ngữ pháp ${items.length + 1}`,
                        contentHtml: fullHtml
                    });
                }
            }
        }

        blocks.forEach((el) => {
            const txt = (el.textContent || '').trim();
            if (!txt && el.tagName !== 'HR') {
                if (currentItem) currentItem.htmlParts.push(el.outerHTML);
                return;
            }

            const num = getTitleNumber(txt);
            const isBoldOrHeading = isElementBoldOrHeading(el);

            // Điều kiện để được coi là Tiêu đề của một Ngữ pháp mới:
            // 1. Phải có số thứ tự (num !== null)
            // 2. Và phải là phần tử in đậm hoặc heading hoặc có kích thước lớn
            // 3. Hoặc là mục đầu tiên (num === 1)
            // 4. Hoặc khớp số thứ tự tiếp theo (num === expectedNum || num === items.length + 1)
            const isMainGrammarHeading = (num !== null) && (isBoldOrHeading || num === 1 || num === expectedNum);

            if (isMainGrammarHeading) {
                finalizeCurrent();
                
                const title = txt.split('\n')[0].substring(0, 100).trim();
                expectedNum = num + 1;
                currentItem = {
                    title: title,
                    htmlParts: [el.outerHTML]
                };
                return;
            }

            // Nếu không phải tiêu đề ngữ pháp mới, thêm vào mục hiện tại
            if (!currentItem) {
                currentItem = {
                    title: txt ? txt.split('\n')[0].substring(0, 100).trim() : `Ngữ pháp 1`,
                    htmlParts: []
                };
            }
            currentItem.htmlParts.push(el.outerHTML);
        });

        finalizeCurrent();

        // Nếu vẫn chỉ có <= 1 mục, thử tách lại theo từng dòng văn bản
        if (items.length <= 1) {
            const raw = (rawText || container.innerText || '').split('\n');
            const textLines = raw.map(l => l.trim()).filter(Boolean);
            const tempItems = [];
            let curLines = [];
            let curTitle = '';

            textLines.forEach(line => {
                if (dividerPattern.test(line)) {
                    if (curLines.length > 0) {
                        tempItems.push({
                            index: tempItems.length + 1,
                            title: curTitle || `Ngữ pháp ${tempItems.length + 1}`,
                            contentHtml: curLines.map(l => `<p>${escapeHtml(l)}</p>`).join('')
                        });
                        curLines = [];
                        curTitle = '';
                    }
                    return;
                }

                const num = getTitleNumber(line);
                if (num !== null && (line.length < 80 || line.includes(':') || line.includes('-'))) {
                    if (curLines.length > 0) {
                        tempItems.push({
                            index: tempItems.length + 1,
                            title: curTitle || `Ngữ pháp ${tempItems.length + 1}`,
                            contentHtml: curLines.map(l => `<p>${escapeHtml(l)}</p>`).join('')
                        });
                        curLines = [];
                    }
                    curTitle = line.substring(0, 100);
                    curLines.push(line);
                    return;
                }

                if (!curTitle) curTitle = line.substring(0, 100);
                curLines.push(line);
            });

            if (curLines.length > 0) {
                tempItems.push({
                    index: tempItems.length + 1,
                    title: curTitle || `Ngữ pháp ${tempItems.length + 1}`,
                    contentHtml: curLines.map(l => `<p>${escapeHtml(l)}</p>`).join('')
                });
            }

            if (tempItems.length > items.length) {
                return tempItems;
            }
        }

        // Dự phòng cuối cùng: giữ nguyên làm 1 mục
        if (items.length === 0 && (rawHtml || rawText)) {
            const txt = (container.innerText || rawText || '').trim();
            items.push({
                index: 1,
                title: txt.split('\n')[0].substring(0, 100) || 'Ngữ pháp 1',
                contentHtml: rawHtml || `<p>${escapeHtml(rawText)}</p>`
            });
        }

        return items;
    }

    // ===== BỘ XỬ LÝ & ĐỊNH DẠNG NGỮ PHÁP (HTML & BÀI TẬP INTERACTIVE CHO SỔ TỪ VỰNG) =====
    function escHtmlGrammarVocab(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatLineTitleVocab(rawText) {
        if (!rawText) return '';
        let s = rawText.trim();
        if (s.includes('**')) {
            return s.replace(/\*\*(.*?)\*\*/g, (m, p) => '<strong>' + escHtmlGrammarVocab(p) + '</strong>');
        }
        const colonIdx = s.indexOf(':');
        if (colonIdx > 0 && colonIdx <= 55) {
            const titlePart = s.substring(0, colonIdx).trim();
            const restPart = s.substring(colonIdx + 1);
            return '<strong>' + escHtmlGrammarVocab(titlePart) + ':</strong> ' + escHtmlGrammarVocab(restPart.trim());
        }
        return escHtmlGrammarVocab(s);
    }

    function formatTextBlockVocab(str) {
        if (!str) return '';
        const lines = String(str).split('\n').map(l => l.trim()).filter(Boolean);
        let out = '';
        let inList = false;
        lines.forEach(l => {
            if (l.startsWith('- ') || l.startsWith('• ') || l.startsWith('* ')) {
                if (!inList) { out += '<ul style="margin:6px 0 10px 22px;padding:0;line-height:1.8;">'; inList = true; }
                out += `<li>${formatLineTitleVocab(l.substring(2))}</li>`;
            } else {
                if (inList) { out += '</ul>'; inList = false; }
                out += `<p style="margin:8px 0;line-height:1.8;">${formatLineTitleVocab(l)}</p>`;
            }
        });
        if (inList) out += '</ul>';
        return out || `<p>${escHtmlGrammarVocab(str)}</p>`;
    }

    function buildHtmlFromStructuredDataVocab(item) {
        let html = '';
        const meaning = item.meaning || item.desc || item.definition || '';
        if (meaning) {
            html += `<h3>1. Ý nghĩa &amp; Cách dùng</h3>${formatTextBlockVocab(meaning)}`;
        }
        const rules = item.rules || item.combinations || [];
        if (Array.isArray(rules) && rules.length > 0) {
            html += `<h3>2. Quy tắc chia / Kết hợp</h3>`;
            html += `<table><tr><th>Trường hợp</th><th>Dạng kết hợp</th><th>Ví dụ</th></tr>`;
            rules.forEach((r, idx) => {
                const tagCls = idx % 2 === 0 ? 'g-tag' : 'g-tag green';
                const cond = r.condition || r.type || '';
                const form = r.combine || r.form || '';
                const ex = r.example || '';
                html += `<tr><td><span class="${tagCls}">${escHtmlGrammarVocab(cond)}</span></td><td><strong>${escHtmlGrammarVocab(form)}</strong></td><td>${escHtmlGrammarVocab(ex)}</td></tr>`;
            });
            html += `</table>`;
        }
        const colors = ['', 'blue', 'green', 'orange', 'red'];
        const examples = item.examples || [];
        if (Array.isArray(examples) && examples.length > 0) {
            html += `<h3>3. Ví dụ minh họa</h3>`;
            examples.forEach((ex, idx) => {
                const c = colors[idx % colors.length];
                const cls = c ? `ex-box ${c}` : 'ex-box';
                const kr = ex.kr || ex.korean || '';
                const vi = ex.vi || ex.vietnamese || ex.trans || '';
                html += `<div class="${cls}"><div class="ex-label">💡 Ví dụ:</div><div class="ex-text"><strong>${escHtmlGrammarVocab(kr)}</strong><br><span class="ex-trans">${escHtmlGrammarVocab(vi)}</span></div></div>`;
            });
        }
        const notes = item.notes || item.note || '';
        if (notes) {
            html += `<h3>4. Lưu ý &amp; So sánh</h3>${formatTextBlockVocab(notes)}`;
        }
        const quiz = item.quiz || item.quizzes || [];
        if (Array.isArray(quiz) && quiz.length > 0) {
            html += `<div class="quiz-section"><h3>📝 Bài tập kiểm tra</h3>`;
            quiz.forEach((q, idx) => {
                const qNum = idx + 1;
                const type = q.type || 'mc';
                if (type === 'mc') {
                    const opts = q.options || q.opts || [];
                    const ans = q.answer || 1;
                    html += `<div class="quiz-q" data-type="mc" data-answer="${ans}">`;
                    html += `<div class="quiz-stem">Câu ${qNum}: ${escHtmlGrammarVocab(q.question || '')}</div>`;
                    html += `<div class="quiz-opts">`;
                    opts.forEach((opt, oIdx) => {
                        html += `<button class="quiz-opt" data-v="${oIdx + 1}">${escHtmlGrammarVocab(opt)}</button>`;
                    });
                    html += `</div>`;
                    if (q.explain) html += `<div class="quiz-explain">${escHtmlGrammarVocab(q.explain)}</div>`;
                    html += `<div class="quiz-feedback"></div></div>`;
                } else if (type === 'fill') {
                    const ans = q.answer || '';
                    html += `<div class="quiz-q" data-type="fill" data-answer="${escHtmlGrammarVocab(String(ans))}">`;
                    html += `<div class="quiz-stem">Câu ${qNum}: ${escHtmlGrammarVocab(q.question || '')}</div>`;
                    html += `<div class="quiz-fill"><input type="text" placeholder="Nhập đáp án..."><button class="quiz-check-btn">Kiểm tra</button></div>`;
                    if (q.explain) html += `<div class="quiz-explain">${escHtmlGrammarVocab(q.explain)}</div>`;
                    html += `<div class="quiz-feedback"></div></div>`;
                } else if (type === 'tf') {
                    const ans = (q.answer === true || q.answer === 't' || q.answer === 'đúng') ? 't' : 'f';
                    html += `<div class="quiz-q" data-type="tf" data-answer="${ans}">`;
                    html += `<div class="quiz-stem">Câu ${qNum}: ${escHtmlGrammarVocab(q.question || '')}</div>`;
                    html += `<div class="quiz-tf"><button data-v="t">⭕ Đúng</button><button data-v="f">❌ Sai</button></div>`;
                    if (q.explain) html += `<div class="quiz-explain">${escHtmlGrammarVocab(q.explain)}</div>`;
                    html += `<div class="quiz-feedback"></div></div>`;
                } else if (type === 'match') {
                    const pairs = q.pairs || [];
                    html += `<div class="quiz-q" data-type="match">`;
                    html += `<div class="quiz-stem">Câu ${qNum}: ${escHtmlGrammarVocab(q.question || 'Nối cặp tương ứng:')}</div>`;
                    html += `<div class="quiz-match">`;
                    const rights = pairs.map((p, pIdx) => ({ text: p.right, pair: pIdx + 1 }));
                    if (rights.length > 1) {
                        const temp = rights[0];
                        rights[0] = rights[rights.length - 1];
                        rights[rights.length - 1] = temp;
                    }
                    pairs.forEach((p, pIdx) => {
                        html += `<div class="quiz-match-item" data-side="l" data-pair="${pIdx + 1}">${escHtmlGrammarVocab(p.left)}</div>`;
                        const r = rights[pIdx];
                        html += `<div class="quiz-match-item" data-side="r" data-pair="${r.pair}">${escHtmlGrammarVocab(r.text)}</div>`;
                    });
                    html += `</div>`;
                    if (q.explain) html += `<div class="quiz-explain">${escHtmlGrammarVocab(q.explain)}</div>`;
                    html += `<div class="quiz-feedback"></div></div>`;
                }
            });
            html += `<div class="quiz-score"></div></div>`;
        }
        return html;
    }

    function autoRepairBrokenGeminiHtmlVocab(str) {
        if (!str) return '';
        let s = str.trim();

        // 1. Tự động bóc tách nếu chuỗi content bị dính header JSON e.g. { "korean": ..., "content": "..." }
        if (s.includes('"korean"') && s.includes('"content"')) {
            const idx = s.indexOf('"content":');
            if (idx !== -1) {
                const after = s.substring(idx + 10).trim();
                const startQuote = after.indexOf('"');
                if (startQuote !== -1) {
                    s = after.substring(startQuote + 1);
                    s = s.replace(/"\s*\}?\s*\]?$/, '').replace(/\\"/g, '"');
                }
            }
        }

        // 2. Tự động sửa lỗi thẻ unclosed ex-box của Gemini khiến các hộp bị lồng vào nhau
        if (s.includes('class="ex-box') || s.includes("class='ex-box'")) {
            const openDivCount = (s.match(/<div\b/g) || []).length;
            const closeDivCount = (s.match(/<\/div>/g) || []).length;

            if (openDivCount > closeDivCount) {
                let isFirst = true;
                s = s.replace(/<div\s+class=["']ex-box([^"']*)["']>/g, (match) => {
                    if (isFirst) {
                        isFirst = false;
                        return match;
                    }
                    return `</div></div>${match}`;
                });
                if (s.includes('<div class="quiz-section">') || s.includes("<div class='quiz-section'>")) {
                    s = s.replace(/<div\s+class=["']quiz-section["']>/, '</div></div><div class="quiz-section">');
                } else {
                    s += '</div></div>';
                }
            }
        }

        return s;
    }

    function formatGrammarContentForVocab(item) {
        if (!item) return '<div style="text-align:center;color:#94a3b8;padding:20px;">Chưa có nội dung chi tiết cho mục này.</div>';
        if (item.meaning || item.rules || item.examples || item.quiz) {
            return buildHtmlFromStructuredDataVocab(item);
        }
        let c = (item.contentHtml || item.content || '').trim();
        if (c.startsWith('{') || c.startsWith('[')) {
            try {
                const parsed = JSON.parse(c);
                const target = Array.isArray(parsed) ? parsed[0] : parsed;
                if (target) {
                    if (target.meaning || target.rules || target.examples || target.quiz) {
                        return buildHtmlFromStructuredDataVocab(target);
                    }
                    if (target.content) c = target.content;
                    else if (target.contentHtml) c = target.contentHtml;
                }
            } catch(e) {}
        }
        c = autoRepairBrokenGeminiHtmlVocab(c);
        if (!c) {
            return '<div style="text-align:center;color:#94a3b8;padding:20px;">Chưa có nội dung chi tiết cho mục này.</div>';
        }
        return c;
    }

    // Hiển thị danh sách thẻ Ngữ pháp trên giao diện (Dạng thẻ danh sách bấm mở Popup)
    function renderGrammarCards(grammarList) {
        const container = document.getElementById('grammarCardsContainer');
        if (!container) return;

        if (!grammarList || grammarList.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 45px 20px; color: #64748b; background: rgba(255,255,255,0.7); border-radius: 14px; border: 1px dashed #cbd5e1;">
                    <div style="font-size: 2.2em; margin-bottom: 8px;">📘</div>
                    <div style="font-weight: 600; margin-bottom: 6px;">Chưa có nội dung ngữ pháp nào trong bài học này.</div>
                    ${isTeacher() ? '<button class="btn-create-list" onclick="openGrammarImportModal()" style="margin-top:12px;background:linear-gradient(135deg, #6366f1, #4f46e5);border:none;padding:8px 18px;font-size:0.85em;">📘 + Thêm Ngữ pháp ngay</button>' : '<div style="font-size:0.9em;color:#94a3b8;">Giáo viên chưa đăng tải ngữ pháp cho bài này.</div>'}
                </div>
            `;
            return;
        }

        let html = '';
        grammarList.forEach((g, idx) => {
            const itemNum = g.index || (idx + 1);
            const title = g.title || `Ngữ pháp ${itemNum}`;
            const safeTitle = title.replace(/'/g, "\\'");

            let actions = `
                <button class="btn-icon-flat" onclick="copyGrammarContent('${g.id}')" title="Sao chép nội dung" style="font-size:0.82em;color:#64748b;display:flex;align-items:center;gap:4px;">
                    📋 Sao chép
                </button>
            `;

            if (isTeacher()) {
                actions += `
                    <button class="btn-icon-flat" onclick="editGrammarPoint('${g.id}')" title="Sửa nội dung" style="font-size:0.82em;color:#2563eb;display:flex;align-items:center;gap:4px;">
                        ✏️ Sửa
                    </button>
                    <button class="btn-icon-flat" onclick="deleteGrammarPoint('${g.id}', '${safeTitle}')" title="Xóa" style="font-size:0.82em;color:#ef4444;display:flex;align-items:center;gap:4px;">
                        🗑️ Xóa
                    </button>
                `;
            }

            html += `
                <div class="grammar-card sv-grammar-card" id="grammar-card-${g.id}" onclick="openGrammarDetailModal('${g.id}')" style="cursor:pointer;transition:all 0.2s ease;">
                    <div class="grammar-card-header sv-grammar-header">
                        <div class="grammar-card-title sv-grammar-title">
                            <span class="grammar-index-badge sv-grammar-badge">Ngữ pháp ${itemNum}</span>
                            <span class="sv-grammar-name" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
                        </div>
                        <div class="sv-grammar-tools">
                            <div class="grammar-card-actions sv-grammar-actions" onclick="event.stopPropagation()">
                                ${actions}
                            </div>
                            <button class="btn-icon-flat sv-grammar-view" onclick="event.stopPropagation();openGrammarDetailModal('${g.id}')">
                                👁️ Xem<span class="sv-hide-mobile"> chi tiết</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Modal popup xem chi tiết ngữ pháp + làm bài tập (Chiều ngang bằng navbar ~900px, cao 90vh, hỗ trợ Esc)
    window.openGrammarDetailModal = function (grammarId) {
        const g = (window.currentSharedGrammar || []).find(x => x.id === grammarId);
        if (!g) return;

        const modalId = '_grammarVocabViewer';
        let m = document.getElementById(modalId);
        if (m) m.remove();

        m = document.createElement('div');
        m.id = modalId;
        m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);padding:14px;box-sizing:border-box;';

        const itemNum = g.index || '';
        const title = g.title || (itemNum ? `Ngữ pháp ${itemNum}` : 'Chi tiết ngữ pháp');

        m.innerHTML = `
            <div style="background:#fff;border-radius:20px;max-width:900px;width:100%;height:90vh;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);overflow:hidden;border:1px solid rgba(255,255,255,0.2);">
                <div style="padding:16px 22px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#f8fafc,#edf2f7);flex-shrink:0;">
                    <div style="flex:1;min-width:0;padding-right:12px;">
                        <span style="font-size:0.78em;font-weight:800;padding:3px 10px;border-radius:6px;background:linear-gradient(135deg, #4f46e5, #4338ca);color:#fff;">Ngữ pháp ${itemNum}</span>
                        <h3 style="margin:6px 0 0 0;font-size:1.45em;color:#1e1b4b;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtmlGrammarVocab(title)}</h3>
                    </div>
                    <button id="_closeGrammarVocabBtn" style="background:none;border:none;font-size:1.8em;color:#94a3b8;cursor:pointer;padding:0 4px;line-height:1;transition:color 0.15s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">&times;</button>
                </div>
                <div style="padding:24px;overflow-y:auto;flex:1;color:#334155;background:#ffffff;" class="grammar-content">
                    ${formatGrammarContentForVocab(g)}
                </div>
                <div style="padding:12px 22px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;flex-shrink:0;">
                    <span style="font-size:0.82em;color:#94a3b8;">Nhấn <kbd style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-family:inherit;font-weight:700;">Esc</kbd> để đóng</span>
                    <button id="_closeGrammarVocabFooterBtn" style="padding:9px 24px;border-radius:10px;border:none;background:#2563eb;color:#fff;font-weight:700;font-size:0.92em;cursor:pointer;transition:background 0.15s;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);

        function closeModal() {
            window.removeEventListener('keydown', onKeyDown);
            if (m && m.parentNode) m.remove();
        }

        function onKeyDown(e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                closeModal();
            }
        }

        window.addEventListener('keydown', onKeyDown);
        m.onclick = function(e) {
            if (e.target === m) closeModal();
        };
        const closeBtn = document.getElementById('_closeGrammarVocabBtn');
        if (closeBtn) closeBtn.onclick = closeModal;
        const footerBtn = document.getElementById('_closeGrammarVocabFooterBtn');
        if (footerBtn) footerBtn.onclick = closeModal;

        // Khởi tạo bài tập trắc nghiệm trong modal
        setTimeout(function() {
            initQuizInContainerVocab(m);
        }, 50);
    };

    // Tương thích ngược: toggleGrammarCard chuyển thành mở Popup
    window.toggleGrammarCard = window.openGrammarDetailModal;

    // Quiz Engine danh cho So tu vung
    // hooks (tuỳ chọn): { onChange() } — gọi mỗi khi học viên trả lời / nối cặp (dùng để lưu tiến độ).
    // Mỗi .quiz-q được gắn hàm q._quizApply(state) để khôi phục câu trả lời đã lưu (không gọi onChange).
    function initQuizInContainerVocab(container, hooks) {
        if (!container) return;
        const sections = container.querySelectorAll('.quiz-section');
        sections.forEach(function(sec) { initOneQuizSectionVocab(sec, hooks || {}); });
    }

    function initOneQuizSectionVocab(sec, hooks) {
        hooks = hooks || {};
        const notifyChange = function () { if (typeof hooks.onChange === 'function') hooks.onChange(); };
        const allQs = sec.querySelectorAll('.quiz-q');
        let totalQ = allQs.length;
        let correctCount = 0;
        let answeredCount = 0;

        function checkComplete() {
            answeredCount++;
            const scoreEl = sec.querySelector('.quiz-score');
            if (answeredCount >= totalQ && scoreEl) {
                const pct = Math.round((correctCount / totalQ) * 100);
                let emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
                scoreEl.innerHTML = emoji + ' Kết quả: <strong>' + correctCount + '/' + totalQ + '</strong> câu đúng (' + pct + '%)';
                scoreEl.classList.add('show');
            }
        }

        allQs.forEach(function(q) {
            const type = q.dataset.type || 'mc';
            const answer = q.dataset.answer || '';
            const explainEl = q.querySelector('.quiz-explain');
            const feedbackEl = q.querySelector('.quiz-feedback');

            function showFeedback(isCorrect) {
                if (isCorrect) correctCount++;
                if (feedbackEl) {
                    feedbackEl.textContent = isCorrect ? '✅ Chính xác!' : '❌ Chưa đúng rồi!';
                    feedbackEl.className = 'quiz-feedback show ' + (isCorrect ? 'ok' : 'fail');
                }
                if (explainEl) explainEl.classList.add('show');
                q.classList.add('answered');
                checkComplete();
            }

            if (type === 'mc' || type === '' || !type || type === 'undefined') {
                const opts = q.querySelectorAll('.quiz-opt');
                function applyChoice(chosen) {
                    if (q.classList.contains('answered')) return false;
                    const isCorrect = (chosen === answer);
                    opts.forEach(function(o) {
                        if (o.dataset.v === answer) o.classList.add('correct');
                        if (!isCorrect && o.dataset.v === chosen) o.classList.add('wrong');
                    });
                    showFeedback(isCorrect);
                    return true;
                }
                opts.forEach(function(opt) {
                    opt.addEventListener('click', function() {
                        if (applyChoice(opt.dataset.v)) notifyChange();
                    });
                });
                q._quizApply = function (s) { if (s && s.v != null) applyChoice(String(s.v)); };
            }
            else if (type === 'fill') {
                const input = q.querySelector('.quiz-fill input');
                const checkBtn = q.querySelector('.quiz-check-btn');
                const acceptedAnswers = answer.split('|').map(function(a) { return a.trim().toLowerCase(); });

                function checkFillAnswer() {
                    if (q.classList.contains('answered') || !input) return false;
                    const userVal = input.value.trim().toLowerCase();
                    if (!userVal) return false;
                    const isCorrect = acceptedAnswers.indexOf(userVal) !== -1;
                    input.classList.add(isCorrect ? 'correct' : 'wrong');
                    input.readOnly = true;
                    if (!isCorrect) {
                        const correctSpan = document.createElement('span');
                        correctSpan.style.cssText = 'margin-left:8px;color:#059669;font-weight:700;font-size:0.92em;';
                        correctSpan.textContent = '→ ' + acceptedAnswers[0];
                        input.parentNode.appendChild(correctSpan);
                    }
                    showFeedback(isCorrect);
                    return true;
                }

                if (checkBtn) checkBtn.addEventListener('click', function () { if (checkFillAnswer()) notifyChange(); });
                if (input) {
                    input.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && checkFillAnswer()) notifyChange();
                    });
                    // Lưu cả nội dung đang gõ dở (chưa bấm Kiểm tra)
                    input.addEventListener('input', notifyChange);
                }
                q._quizApply = function (s) {
                    if (!s || !input || q.classList.contains('answered')) return;
                    input.value = s.v || '';
                    if (s.done) checkFillAnswer();
                };
            }
            else if (type === 'tf') {
                const btns = q.querySelectorAll('.quiz-tf button');
                function applyTf(chosen) {
                    if (q.classList.contains('answered')) return false;
                    const isCorrect = (chosen === answer);
                    btns.forEach(function(b) {
                        if (b.dataset.v === answer) b.classList.add('correct');
                        if (!isCorrect && b.dataset.v === chosen) b.classList.add('wrong');
                    });
                    showFeedback(isCorrect);
                    return true;
                }
                btns.forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        if (applyTf(btn.dataset.v)) notifyChange();
                    });
                });
                q._quizApply = function (s) { if (s && s.v != null) applyTf(String(s.v)); };
            }
            else if (type === 'match') {
                const matchContainer = q.querySelector('.quiz-match');
                if (!matchContainer) return;
                const leftItems = matchContainer.querySelectorAll('.quiz-match-item[data-pair]');
                let selectedLeft = null;
                let matchedPairs = 0;
                const totalPairs = Math.floor(leftItems.length / 2);
                const lefts = matchContainer.querySelectorAll('[data-side="l"]');
                const rights = matchContainer.querySelectorAll('[data-side="r"]');

                // Đánh dấu 1 cặp đã nối đúng (dùng khi khôi phục bài làm đã lưu)
                function applyMatchedPair(pair) {
                    const l = matchContainer.querySelector('[data-side="l"][data-pair="' + pair + '"]:not(.matched)');
                    const r = matchContainer.querySelector('[data-side="r"][data-pair="' + pair + '"]:not(.matched)');
                    if (!l || !r) return;
                    l.classList.add('matched');
                    r.classList.add('matched');
                    matchedPairs++;
                    if (matchedPairs >= totalPairs) showFeedback(true);
                }
                q._quizApply = function (s) {
                    if (s && Array.isArray(s.m)) s.m.forEach(function (p) { applyMatchedPair(String(p)); });
                };

                function handleMatchClick(item) {
                    if (item.classList.contains('matched')) return;
                    const side = item.dataset.side;

                    if (!selectedLeft) {
                        selectedLeft = item;
                        item.classList.add('selected');
                    } else {
                        if (selectedLeft.dataset.side === side) {
                            selectedLeft.classList.remove('selected');
                            selectedLeft = item;
                            item.classList.add('selected');
                            return;
                        }

                        const pair1 = selectedLeft.dataset.pair;
                        const pair2 = item.dataset.pair;

                        if (pair1 === pair2) {
                            selectedLeft.classList.remove('selected');
                            selectedLeft.classList.add('matched');
                            item.classList.add('matched');
                            matchedPairs++;

                            // (Trước đây có thêm correctCount++ ở đây → bị cộng điểm 2 lần vì showFeedback đã cộng)
                            if (matchedPairs >= totalPairs) {
                                showFeedback(true);
                            }
                            notifyChange();
                        } else {
                            selectedLeft.classList.add('wrong-flash');
                            item.classList.add('wrong-flash');
                            var prev = selectedLeft;
                            setTimeout(function() {
                                prev.classList.remove('wrong-flash', 'selected');
                                item.classList.remove('wrong-flash');
                            }, 500);
                        }
                        selectedLeft = null;
                    }
                }

                lefts.forEach(function(el) { el.addEventListener('click', function() { handleMatchClick(el); }); });
                rights.forEach(function(el) { el.addEventListener('click', function() { handleMatchClick(el); }); });
            }
        });
    }

    // =========================================================================
    // LƯU TIẾN ĐỘ BÀI TẬP TƯƠNG TÁC (JSON) CỦA HỌC VIÊN
    // Firestore: shared_folders/{folderId}/exercises/{exerciseId}/quiz_attempts/{uid}
    // + bản sao localStorage (khôi phục tức thì, dùng được cả khi mất mạng).
    // Mỗi câu được nhận diện bằng "vị trí + mã băm nội dung đề" → giáo viên sửa đề thì
    // câu đã đổi sẽ không bị điền nhầm đáp án cũ.
    // =========================================================================
    let _quizPersist = null; // { root, ref, localKey, timer, ready, generation }
    let _quizPersistGen = 0;

    function quizHashStr(s) {
        let h = 5381;
        s = String(s || '');
        for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
        return (h >>> 0).toString(36);
    }

    function quizItems(root) {
        return Array.prototype.slice.call(root.querySelectorAll('.quiz-q, .quiz-translate-card'));
    }

    function quizItemKey(el, idx) {
        const stem = el.querySelector('.quiz-stem');
        return idx + '_' + quizHashStr(stem ? stem.textContent.trim() : '');
    }

    // Đọc trạng thái bài làm hiện tại từ giao diện
    function collectQuizState(root) {
        const answers = {};
        let answered = 0, correct = 0, total = 0;
        quizItems(root).forEach(function (el, idx) {
            const key = quizItemKey(el, idx);
            let s = null;
            if (el.classList.contains('quiz-translate-card')) {
                const ta = el.querySelector('textarea');
                const reveal = el.querySelector('.quiz-answer-reveal');
                const revealed = !!(reveal && reveal.style.display === 'block');
                const v = ta ? ta.value : '';
                if (v || revealed) s = { t: 'tr', v: v, r: revealed };
            } else {
                total++;
                const type = el.dataset.type || 'mc';
                const done = el.classList.contains('answered');
                if (type === 'fill') {
                    const inp = el.querySelector('.quiz-fill input');
                    const v = inp ? inp.value : '';
                    if (done) s = { t: 'fill', v: v, done: true };
                    else if (v) s = { t: 'fill', v: v };
                } else if (type === 'match') {
                    const m = Array.prototype.map.call(
                        el.querySelectorAll('[data-side="l"].matched'), function (x) { return x.dataset.pair; });
                    if (m.length) s = { t: 'match', m: m };
                } else if (done) {
                    const wrong = el.querySelector('.quiz-opt.wrong, .quiz-tf button.wrong');
                    s = { t: type, v: wrong ? wrong.dataset.v : el.dataset.answer };
                }
                if (done) {
                    answered++;
                    if (el.querySelector('.quiz-feedback.ok')) correct++;
                }
            }
            if (s) answers[key] = s;
        });
        return { answers: answers, answered: answered, correct: correct, total: total };
    }

    // Áp dụng bài làm đã lưu vào giao diện (chỉ những câu chưa làm)
    function applyQuizState(root, saved) {
        if (!saved || !saved.answers) return;
        quizItems(root).forEach(function (el, idx) {
            const s = saved.answers[quizItemKey(el, idx)];
            if (!s) return;
            if (el.classList.contains('quiz-translate-card')) {
                const ta = el.querySelector('textarea');
                if (ta && !ta.value) ta.value = s.v || '';
                const btn = el.querySelector('.quiz-check-btn');
                if (s.r && btn && !btn.disabled) window.revealTranslateAnswer(btn);
            } else if (typeof el._quizApply === 'function') {
                try { el._quizApply(s); } catch (e) { console.warn('[Quiz] Không khôi phục được câu', idx + 1, e); }
            }
        });
    }

    function renderQuizSaveStatus(root, state, savedAt) {
        let bar = root.querySelector('.quiz-save-status');
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'quiz-save-status';
            bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;' +
                'background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:0.86em;font-weight:600;';
            const firstSection = root.querySelector('.quiz-section');
            if (firstSection && firstSection.parentNode) firstSection.parentNode.insertBefore(bar, firstSection);
            else root.insertBefore(bar, root.firstChild);
        }
        const timeStr = savedAt ? new Date(savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
        const progress = state.total
            ? `Đã làm <b>${state.answered}/${state.total}</b> câu · đúng <b>${state.correct}</b>`
            : 'Bài làm của bạn';
        bar.innerHTML = `<span>💾 ${progress}${timeStr ? ' · đã lưu lúc ' + timeStr : ' · tự động lưu khi bạn làm bài'}</span>` +
            `<button type="button" class="btn-icon-flat" style="color:#0369a1;font-weight:700;font-size:0.95em;padding:4px 8px;" ` +
            `onclick="resetMyQuizAttempt()">↺ Làm lại từ đầu</button>`;
    }

    function readLocalQuizAttempt(key) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    }

    // Ghi ngay (localStorage đồng bộ, Firestore bất đồng bộ)
    function flushQuizSave() {
        const p = _quizPersist;
        if (!p || !p.timer) return;
        clearTimeout(p.timer);
        p.timer = null;
        if (!p.ready) { p.pending = true; return; } // đang tải bài cũ → lưu sau khi khôi phục xong
        if (!p.root.isConnected) return;

        const state = collectQuizState(p.root);
        const savedAt = Date.now();
        try { localStorage.setItem(p.localKey, JSON.stringify(Object.assign({ savedAt: savedAt }, state))); } catch (e) {}
        renderQuizSaveStatus(p.root, state, savedAt);

        if (p.ref) {
            const user = firebase.auth().currentUser;
            p.ref.set({
                answers: state.answers,
                answered: state.answered,
                correct: state.correct,
                total: state.total,
                lessonName: String(window.currentSharedLesson || '').slice(0, 300),
                studentName: String((user && (user.displayName || (user.email || '').split('@')[0])) || '').slice(0, 60),
                studentEmail: String((user && user.email) || '').slice(0, 200),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(function (e) { console.warn('[Quiz] Lưu Firestore lỗi (đã lưu tạm trên máy):', e && e.message); });
        }
    }

    function scheduleQuizSave() {
        const p = _quizPersist;
        if (!p) return;
        if (p.timer) clearTimeout(p.timer);
        p.timer = setTimeout(flushQuizSave, 800);
    }

    // Khởi tạo quiz cho HỌC VIÊN: khôi phục bài làm đã lưu + tự động lưu mỗi khi trả lời
    function setupQuizPersistence(root) {
        flushQuizSave();
        const folderId = window.currentSharedFolderId;
        const exId = window.currentSharedExerciseId;
        const uid = window.currentUserUid || (firebase.auth().currentUser && firebase.auth().currentUser.uid);
        const gen = ++_quizPersistGen;

        const localKey = 'quiz_attempt_' + (folderId || '') + '_' + (exId || '') + '_' + (uid || 'guest');
        const ref = (folderId && exId && uid)
            ? firebase.firestore().collection('shared_folders').doc(folderId)
                .collection('exercises').doc(exId).collection('quiz_attempts').doc(uid)
            : null;

        _quizPersist = { root: root, ref: ref, localKey: localKey, timer: null, ready: false };
        initQuizInContainerVocab(root, { onChange: scheduleQuizSave });

        // Ô dịch (translate) không nằm trong engine quiz → tự lắng nghe
        root.querySelectorAll('.quiz-translate-card textarea').forEach(function (ta) {
            ta.addEventListener('input', scheduleQuizSave);
        });
        root.querySelectorAll('.quiz-translate-card .quiz-check-btn').forEach(function (btn) {
            btn.addEventListener('click', scheduleQuizSave);
        });

        const local = readLocalQuizAttempt(localKey);
        const finish = function (remote) {
            if (gen !== _quizPersistGen || !_quizPersist) return; // đã chuyển sang bài khác
            // Lấy bản mới hơn giữa Firestore và bản lưu trên máy
            const remoteAt = remote && remote.updatedAt && remote.updatedAt.toMillis ? remote.updatedAt.toMillis() : 0;
            const best = (local && (!remote || (local.savedAt || 0) > remoteAt)) ? local : remote;
            applyQuizState(root, best);
            _quizPersist.ready = true;
            renderQuizSaveStatus(root, collectQuizState(root), best ? (best.savedAt || remoteAt) : 0);
            // Bản trên máy mới hơn Firestore (vd. lúc trước mất mạng), hoặc học viên đã thao tác
            // trong lúc đang tải → lưu lại
            if ((best && best === local && ref) || _quizPersist.pending || _quizPersist.timer) {
                _quizPersist.pending = false;
                scheduleQuizSave();
            }
        };

        if (ref) {
            ref.get().then(function (doc) { finish(doc.exists ? doc.data() : null); })
                .catch(function (e) {
                    console.warn('[Quiz] Không đọc được bài làm đã lưu, dùng bản trên máy:', e && e.message);
                    finish(null);
                });
        } else {
            finish(null);
        }
    }

    window.resetMyQuizAttempt = async function () {
        const p = _quizPersist;
        if (!p) return;
        const res = await Swal.fire({
            title: 'Làm lại từ đầu?',
            text: 'Toàn bộ câu trả lời đã lưu của bài tập này sẽ bị xoá.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Làm lại',
            cancelButtonText: 'Huỷ',
            confirmButtonColor: '#0284c7'
        });
        if (!res.isConfirmed) return;
        if (p.timer) { clearTimeout(p.timer); p.timer = null; }
        try { localStorage.removeItem(p.localKey); } catch (e) {}
        if (p.ref) { try { await p.ref.delete(); } catch (e) { console.warn('[Quiz] Xoá bài làm lỗi:', e && e.message); } }
        _quizPersist = null;
        renderExercisePromptView(window.currentSharedExercise);
    };

    // =========================================================================
    // GIÁO VIÊN: XEM TIẾN ĐỘ + BÀI LÀM BÀI TẬP TƯƠNG TÁC CỦA HỌC VIÊN
    // =========================================================================
    function isInteractiveExercise(ex) {
        return !!(ex && (
            (Array.isArray(ex.quiz) && ex.quiz.length > 0) ||
            (ex.promptHtml && /class="quiz-(?:section|q|translate-card)"/.test(ex.promptHtml))
        ));
    }

    function quizTimeAgo(ms) {
        if (!ms) return '';
        const diff = Math.max(0, Date.now() - ms);
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'vừa xong';
        if (min < 60) return min + ' phút trước';
        const h = Math.floor(min / 60);
        if (h < 24) return h + ' giờ trước';
        const d = Math.floor(h / 24);
        if (d < 7) return d + ' ngày trước';
        return new Date(ms).toLocaleDateString('vi-VN');
    }

    // Tổng số câu chấm điểm được của đề hiện tại (không tính câu dịch)
    function currentQuizTotal() {
        const ex = window.currentSharedExercise;
        if (!ex || !ex.promptHtml) return 0;
        const tmp = document.createElement('div');
        tmp.innerHTML = ex.promptHtml;
        return tmp.querySelectorAll('.quiz-q').length;
    }

    function renderTeacherQuizProgress() {
        const card = document.getElementById('teacherQuizProgressCard');
        const box = document.getElementById('teacherQuizProgressContainer');
        const summaryEl = document.getElementById('teacherQuizProgressSummary');
        if (!card || !box) return;
        if (!isTeacher() || !isInteractiveExercise(window.currentSharedExercise)) {
            card.style.display = 'none';
            return;
        }
        card.style.display = 'block';

        const attempts = window._teacherQuizAttempts || [];
        const roster = window._teacherQuizRoster || [];
        const total = currentQuizTotal();
        const byId = {};
        attempts.forEach(a => { byId[a.studentId] = a; });

        // Gộp: học viên đã làm + học viên trong lớp chưa làm
        const rows = attempts.map(a => ({ id: a.studentId, attempt: a, name: a.studentName, email: a.studentEmail }));
        roster.forEach(st => {
            if (!byId[st.studentId]) rows.push({ id: st.studentId, attempt: null, name: st.displayName, email: st.email });
        });
        const at = r => (r.attempt && r.attempt.updatedAt && r.attempt.updatedAt.toMillis) ? r.attempt.updatedAt.toMillis() : 0;
        rows.sort((a, b) => (b.attempt ? 1 : 0) - (a.attempt ? 1 : 0) || at(b) - at(a));

        const started = attempts.length;
        const done = attempts.filter(a => total && (a.answered || 0) >= total).length;
        const pcts = attempts.filter(a => a.answered).map(a => (a.correct || 0) / a.answered);
        const avg = pcts.length ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length * 100) : null;
        if (summaryEl) {
            summaryEl.innerHTML = `${started}${roster.length ? '/' + Math.max(roster.length, started) : ''} học viên đã làm` +
                ` · ${done} hoàn thành` + (avg !== null ? ` · tỉ lệ đúng TB <b>${avg}%</b>` : '');
        }

        if (!rows.length) {
            box.innerHTML = `<div style="text-align:center;padding:26px 12px;color:#64748b;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1;">
                <div style="font-size:1.8em;margin-bottom:6px;">📭</div>Chưa có học viên nào làm bài tập này.</div>`;
            return;
        }

        box.innerHTML = rows.map(r => {
            const a = r.attempt;
            const name = r.name || (r.email ? String(r.email).split('@')[0] : 'Học viên');
            const initial = String(name).charAt(0).toUpperCase() || 'H';
            if (!a) {
                return `<div class="tq-row tq-row-empty">
                    <div class="tq-who"><div class="tq-avatar">${escapeHtml(initial)}</div>
                        <div class="tq-name-wrap"><div class="tq-name">${escapeHtml(name)}</div><div class="tq-sub">${escapeHtml(r.email || '')}</div></div></div>
                    <span class="tq-badge tq-badge-none">Chưa làm</span>
                </div>`;
            }
            const answered = a.answered || 0;
            const correct = a.correct || 0;
            const tot = total || a.total || 0;
            const pctDone = tot ? Math.min(100, Math.round(answered / tot * 100)) : 0;
            const pctRight = answered ? Math.round(correct / answered * 100) : 0;
            const finished = tot && answered >= tot;
            const color = pctRight >= 80 ? '#059669' : pctRight >= 50 ? '#d97706' : '#dc2626';
            return `<div class="tq-row">
                <div class="tq-who"><div class="tq-avatar">${escapeHtml(initial)}</div>
                    <div class="tq-name-wrap"><div class="tq-name">${escapeHtml(name)}</div>
                    <div class="tq-sub">${escapeHtml(r.email || '')}${at(r) ? ' · ' + quizTimeAgo(at(r)) : ''}</div></div></div>
                <div class="tq-progress">
                    <div class="tq-bar"><div style="width:${pctDone}%;background:${finished ? '#10b981' : '#3b82f6'};"></div></div>
                    <div class="tq-stats">${finished ? '✅ Hoàn thành' : `Đã làm ${answered}/${tot}`} · đúng <b style="color:${color};">${correct}/${answered}</b>${answered ? ` (${pctRight}%)` : ''}</div>
                </div>
                <button class="btn-create-list tq-view-btn" onclick="openStudentQuizAttempt(${escapeHtml(JSON.stringify(String(r.id)))})">👁️ Xem bài làm</button>
            </div>`;
        }).join('');
    }

    // Popup xem lại bài làm của 1 học viên: đề bài + đáp án học viên đã chọn/điền (chỉ đọc)
    window.openStudentQuizAttempt = function (studentId) {
        const a = (window._teacherQuizAttempts || []).find(x => x.studentId === studentId);
        const ex = window.currentSharedExercise;
        if (!a || !ex || !ex.promptHtml) return;

        const old = document.getElementById('_tqAttemptModal');
        if (old) old.remove();
        const overlay = document.createElement('div');
        overlay.id = '_tqAttemptModal';
        overlay.className = 'tq-modal-overlay';
        const name = a.studentName || (a.studentEmail ? String(a.studentEmail).split('@')[0] : 'Học viên');
        const updatedMs = a.updatedAt && a.updatedAt.toMillis ? a.updatedAt.toMillis() : 0;
        overlay.innerHTML = `
            <div class="tq-modal">
                <div class="tq-modal-head">
                    <div style="min-width:0;">
                        <div style="font-weight:800;font-size:1.08em;color:#0f172a;">📋 Bài làm của ${escapeHtml(name)}</div>
                        <div style="font-size:0.84em;color:#64748b;">${escapeHtml(a.studentEmail || '')}${updatedMs ? ' · cập nhật ' + quizTimeAgo(updatedMs) : ''}</div>
                    </div>
                    <button class="tq-close" title="Đóng (Esc)">✕</button>
                </div>
                <div class="tq-legend">
                    <span><i style="background:#dcfce7;border-color:#22c55e;"></i>Đáp án đúng</span>
                    <span><i style="background:#fee2e2;border-color:#ef4444;"></i>Học viên chọn sai</span>
                    <span><i style="background:#f1f5f9;border-color:#cbd5e1;"></i>Chưa làm</span>
                </div>
                <div class="tq-modal-body tq-readonly"></div>
            </div>`;
        document.body.appendChild(overlay);

        const body = overlay.querySelector('.tq-modal-body');
        body.innerHTML = ex.promptHtml;
        initQuizInContainerVocab(body);       // không truyền onChange → không ghi gì
        applyQuizState(body, a);

        // Chú thích từng câu cho giáo viên
        quizItems(body).forEach(function (el, idx) {
            const s = (a.answers || {})[quizItemKey(el, idx)];
            const note = document.createElement('div');
            note.className = 'tq-note';
            if (el.classList.contains('quiz-translate-card')) {
                // Giáo viên luôn thấy đáp án tham khảo để so sánh
                const reveal = el.querySelector('.quiz-answer-reveal');
                if (reveal) reveal.style.display = 'block';
                const explain = el.querySelector('.quiz-explain');
                if (explain) explain.classList.add('show');
                if (!s || !s.v) { note.textContent = '⚪ Học viên chưa viết bài dịch'; note.classList.add('tq-note-none'); }
                else { note.textContent = s.r ? '👀 Học viên đã bấm xem đáp án' : '✍️ Học viên chưa xem đáp án'; }
            } else if (!el.classList.contains('answered')) {
                const type = el.dataset.type || 'mc';
                if (type === 'fill' && s && s.v) { note.textContent = '✏️ Đang gõ dở (chưa bấm Kiểm tra): “' + s.v + '”'; }
                else if (type === 'match' && s && s.m && s.m.length) { note.textContent = '🔗 Mới nối đúng ' + s.m.length + ' cặp'; }
                else { note.textContent = '⚪ Chưa làm câu này'; note.classList.add('tq-note-none'); el.classList.add('tq-unanswered'); }
            } else {
                return;
            }
            el.appendChild(note);
        });

        // Chỉ xem: khoá mọi thao tác
        body.querySelectorAll('input, textarea').forEach(i => { i.readOnly = true; });
        body.querySelectorAll('button').forEach(b => { b.disabled = true; });

        const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = e => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        overlay.querySelector('.tq-close').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    };

    // Rời trang / ẩn tab → ghi ngay phần chưa lưu
    document.addEventListener('visibilitychange', function () { if (document.hidden) flushQuizSave(); });
    window.addEventListener('pagehide', flushQuizSave);

    // Sao chép nội dung ngữ pháp
    window.copyGrammarContent = function (grammarId) {
        const g = (window.currentSharedGrammar || []).find(item => item.id === grammarId);
        if (!g) return;
        const temp = document.createElement('div');
        temp.innerHTML = formatGrammarContentForVocab(g);
        const text = (g.title ? g.title + '\n\n' : '') + (temp.innerText || temp.textContent);
        copyText(text, "Đã sao chép nội dung ngữ pháp vào bộ nhớ tạm!");
    };

    // =========================================================================
    // MODAL SOẠN THẢO / CHỈNH SỬA NGỮ PHÁP TOÀN MÀN HÌNH (FULLSCREEN RICH EDITOR)
    // =========================================================================

    /**
     * Mở modal soạn thảo / chỉnh sửa ngữ pháp toàn màn hình
     * @param {object} options - { mode: 'add'|'edit', grammarId: string, initialTitle: string, initialContent: string }
     */
    window.openGrammarEditorModal = function (options = {}) {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedLesson) {
            Swal.fire("Thông báo", "Vui lòng chọn bài học và đăng nhập quyền Giáo viên để chỉnh sửa!", "warning");
            return;
        }

        ensureGrammarEditorStyles();

        const mode = options.mode || 'add';
        const grammarId = options.grammarId || null;
        const initialTitle = options.initialTitle || '';
        const initialContent = options.initialContent || '';

        const modalId = '_grammarFullScreenModal';
        const oldModal = document.getElementById(modalId);
        if (oldModal) oldModal.remove();

        let isFullscreen = true;
        let activeTab = 'edit';
        let savedRange = null;

        const folderTitle = window.currentSharedFolderTitle || 'Thư mục giảng dạy';
        const lessonName = window.currentSharedLesson || 'Bài học';

        const overlay = document.createElement('div');
        overlay.id = modalId;

        overlay.innerHTML = `
            <div class="gfm-container" id="gfmContainer">
                <!-- TOP HEADER -->
                <div class="gfm-header">
                    <div class="gfm-title-area">
                        <span class="gfm-badge">${mode === 'add' ? '📘 THÊM NGỮ PHÁP' : '✏️ SỬA NGỮ PHÁP'}</span>
                        <span style="font-weight:700;font-size:0.9em;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHtml(folderTitle)} / <b style="color:#6366f1;">${escapeHtml(lessonName)}</b>
                        </span>
                    </div>

                    <!-- TABS: SOẠN THẢO & XEM TRƯỚC -->
                    <div class="gfm-tabs">
                        <button type="button" class="gfm-tab-btn active" id="gfmTabEdit" onclick="_gfmSwitchTab('edit')">
                            <span>✍️ Soạn thảo</span>
                        </button>
                        <button type="button" class="gfm-tab-btn" id="gfmTabPreview" onclick="_gfmSwitchTab('preview')">
                            <span>👁️ Xem trước</span>
                        </button>
                    </div>

                    <!-- WINDOW ACTIONS -->
                    <div style="display:flex;align-items:center;gap:4px;">
                        <button type="button" class="gfm-tool-btn" id="gfmToggleFullscreenBtn" title="Phóng to / Thu nhỏ" style="font-size:1.05em;padding:3px 6px;">
                            ⛶
                        </button>
                        <button type="button" class="gfm-tool-btn" id="gfmCloseModalBtn" title="Đóng cửa sổ" style="font-size:1.25em;color:#ef4444;padding:3px 6px;">
                            &times;
                        </button>
                    </div>
                </div>

                <!-- SUB-BAR: TIÊU ĐỀ NGỮ PHÁP (NGANG HÀNG) -->
                <div class="gfm-sub-bar" id="gfmSubBar">
                    <div class="gfm-sub-bar-inner">
                        <label style="font-weight:800;font-size:0.86em;color:#334155;white-space:nowrap;flex-shrink:0;">
                            🏷️ Tiêu đề / Cấu trúc ngữ pháp:
                        </label>
                        <input type="text" id="gfmTitleInput" class="gfm-title-input"
                               placeholder="Nhập tiêu đề hoặc mẫu câu ngữ pháp..."
                               value="${escapeHtml(initialTitle)}" autocomplete="off">
                    </div>
                </div>

                <!-- WORKSPACE (FULL WIDTH DOCUMENT CANVAS) -->
                <div class="gfm-workspace" id="gfmWorkspace">
                    <div class="gfm-editor-col">
                        <!-- TOOLBAR -->
                        <div class="gfm-toolbar" id="gfmToolbar">
                            <!-- FONT FAMILY -->
                            <div class="gfm-tool-group" title="Chọn Font chữ">
                                <select id="gfmFontFamily" class="gfm-select">
                                    <option value="'Pretendard', sans-serif">Pretendard (Chuẩn)</option>
                                    <option value="'Nanum Gothic', sans-serif">Nanum Gothic (나눔고딕)</option>
                                    <option value="'Nanum Myeongjo', serif">Nanum Myeongjo (나눔명조)</option>
                                    <option value="Inter, sans-serif">Inter</option>
                                    <option value="Roboto, sans-serif">Roboto</option>
                                    <option value="Arial, sans-serif">Arial</option>
                                    <option value="'Times New Roman', serif">Times New Roman</option>
                                    <option value="'Courier New', monospace">Courier New</option>
                                </select>
                            </div>

                            <!-- FONT SIZE -->
                            <div class="gfm-tool-group" title="Kích thước chữ">
                                <select id="gfmFontSize" class="gfm-select">
                                    <option value="14px">14px - Nhỏ</option>
                                    <option value="16px">16px - Vừa</option>
                                    <option value="18px" selected>18px - Chuẩn</option>
                                    <option value="20px">20px - Lớn</option>
                                    <option value="24px">24px - Tiêu đề 3</option>
                                    <option value="28px">28px - Tiêu đề 2</option>
                                    <option value="32px">32px - Tiêu đề 1</option>
                                </select>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- TEXT COLOR -->
                            <div class="gfm-tool-group" title="Màu chữ">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Chữ:</span>
                                <input type="color" id="gfmTextColorPicker" value="#0f172a" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu chữ">
                                <button type="button" class="gfm-tool-btn" data-color="#dc2626" style="color:#dc2626;padding:2px 4px;font-size:0.82em;" title="Đỏ">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#2563eb" style="color:#2563eb;padding:2px 4px;font-size:0.82em;" title="Xanh">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#16a34a" style="color:#16a34a;padding:2px 4px;font-size:0.82em;" title="Xanh lá">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#7c3aed" style="color:#7c3aed;padding:2px 4px;font-size:0.82em;" title="Tím">A</button>
                            </div>

                            <!-- HIGHLIGHT COLOR -->
                            <div class="gfm-tool-group" title="Màu nền / Highlight">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Nền:</span>
                                <input type="color" id="gfmBgColorPicker" value="#fef08a" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu nền">
                                <button type="button" class="gfm-tool-btn" data-bg="#fef08a" style="background:#fef08a;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Vàng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bae6fd" style="background:#bae6fd;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bbf7d0" style="background:#bbf7d0;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh lá nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#fbcfe8" style="background:#fbcfe8;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Hồng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="transparent" style="font-size:0.75em;color:#64748b;padding:2px 4px;" title="Xóa nền">✕</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- NÚT CHÈN Ô VÍ DỤ NGANG (NGANG HÀNG VỚI FONT, SIZE, MÀU SẮC) -->
                            <button type="button" class="gfm-tool-btn" id="gfmInsertExampleBtn"
                                    title="Bấm: Chèn ô ví dụ ngang | Ấn giữ: Chọn màu sắc ô"
                                    style="background:#f0fdf4;border:1.5px solid #10b981;color:#15803d;padding:3px 9px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:5px;border-radius:6px;cursor:pointer;">
                                <span>💡 Ô ví dụ</span>
                                <span class="gfm-color-dot-indicator" style="width:9px;height:9px;border-radius:50%;background:#10b981;border:1px solid #fff;box-shadow:0 0 0 1px #10b981;"></span>
                                <span style="font-size:0.7em;opacity:0.7;">▾</span>
                            </button>

                            <span class="gfm-tool-sep"></span>

                            <!-- BASIC STYLES -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="bold" title="In đậm (Ctrl+B)"><b>B</b></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="italic" title="In nghiêng (Ctrl+I)"><i>I</i></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="underline" title="Gạch chân (Ctrl+U)"><u>U</u></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button>
                            </div>

                            <!-- ALIGNMENTS -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyLeft" title="Căn trái">⇤</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyCenter" title="Căn giữa">≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyRight" title="Căn phải">⇥</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyFull" title="Căn đều">⇹</button>
                            </div>

                            <!-- LISTS -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertUnorderedList" title="Danh sách chấm tròn">•≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="insertOrderedList" title="Danh sách số 1,2,3">1≡</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- UTILITIES -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertHorizontalRule" title="Đường kẻ ngang">―</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="removeFormat" title="Xóa định dạng" style="color:#ef4444;">Tx</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="undo" title="Hoàn tác (Ctrl+Z)">↶</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="redo" title="Làm lại (Ctrl+Y)">↷</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- BỘ GÕ TELEX TÍCH HỢP -->
                            <button type="button" class="gfm-tool-btn gfm-telex-toggle-btn" onclick="window.toggleWebTelex()"
                                    title="Bộ gõ Telex tích hợp: Khi bật, bạn có thể để EVKey ở chữ E, chỉ cần bấm Alt để đổi giữa gõ tiếng Hàn (가) và tiếng Việt (A)!"
                                    style="background:#eff6ff;border:1.5px solid #3b82f6;color:#1d4ed8;padding:3px 8px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:4px;border-radius:6px;cursor:pointer;">
                                <span class="telex-status-icon">🇻🇳</span>
                                <span class="telex-status-text">Telex: BẬT</span>
                            </button>
                        </div>

                        <!-- MAIN CONTENT EDITABLE (CENTERED PAPER CANVAS) -->
                        <div class="gfm-editor-scroll-wrap">
                            <div id="gfmContentBody" class="gfm-editor-content grammar-content" contenteditable="true"
                                 placeholder="Nhập nội dung bài giảng ngữ pháp, ý nghĩa, cách chia động từ...">${initialContent}</div>
                        </div>
                    </div>
                </div>

                <!-- PREVIEW CONTAINER (HỌC VIÊN XEM) -->
                <div class="gfm-preview-wrapper" id="gfmStudentPreviewArea" style="display:none;">
                    <div class="gfm-preview-card">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                            <span class="grammar-index-badge">Ngữ pháp</span>
                            <h2 id="gfmStudentPrevTitle" style="margin:0;font-size:1.35em;color:#1e1b4b;font-weight:800;">Tiêu đề ngữ pháp</h2>
                        </div>
                        <div id="gfmStudentPrevBody" class="grammar-card-body grammar-content" style="font-size:1.16em;line-height:1.85;padding:22px;color:#1e293b;">
                            Nội dung ngữ pháp sẽ hiển thị tại đây...
                        </div>
                    </div>
                </div>

                <!-- FOOTER ACTIONS -->
                <div class="gfm-footer">
                    <div></div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button type="button" id="gfmCancelBtn" style="padding:7px 16px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.88em;">
                            Hủy bỏ
                        </button>
                        <button type="button" id="gfmSaveBtn" style="padding:7px 20px;background:linear-gradient(135deg, #4f46e5, #4338ca);color:#ffffff;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:0.88em;box-shadow:0 3px 10px rgba(79,70,229,0.3);display:flex;align-items:center;gap:6px;">
                            <span>💾 Lưu bài học</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (typeof updateAllTelexUI === 'function') updateAllTelexUI();

        // Elements
        const container = document.getElementById('gfmContainer');
        const editor = document.getElementById('gfmContentBody');
        const titleInput = document.getElementById('gfmTitleInput');
        const workspace = document.getElementById('gfmWorkspace');
        const previewArea = document.getElementById('gfmStudentPreviewArea');

        // Setup Ô Ví Dụ Ngang + Ấn Giữ Chọn Màu
        setupHorizontalExampleTool({
            btn: document.getElementById('gfmInsertExampleBtn'),
            getEditor: () => editor,
            getSavedRange: () => savedRange,
            defaultBadge: '💡 Ví dụ minh họa',
            placeholderKr: '한국어를 공부하는 것이 정말 재미있어요.',
            placeholderVn: '👉 Việc học tiếng Hàn thực sự rất thú vị.'
        });

        // Track cursor selection
        function saveSelection() {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
                savedRange = sel.getRangeAt(0).cloneRange();
            }
        }
        editor.addEventListener('keyup', saveSelection);
        editor.addEventListener('mouseup', saveSelection);
        editor.addEventListener('touchend', saveSelection);
        editor.addEventListener('blur', saveSelection);

        function restoreSelection() {
            editor.focus();
            if (savedRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedRange);
            }
        }

        // Toolbar formatting commands
        overlay.querySelectorAll('#gfmToolbar button[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                document.execCommand(btn.dataset.cmd, false, null);
                saveSelection();
            });
        });

        // Font family
        const fontSelect = document.getElementById('gfmFontFamily');
        fontSelect.addEventListener('change', () => {
            restoreSelection();
            document.execCommand('fontName', false, fontSelect.value);
            saveSelection();
        });

        // Font size
        const fontSizeSelect = document.getElementById('gfmFontSize');
        fontSizeSelect.addEventListener('change', () => {
            restoreSelection();
            const sizeVal = fontSizeSelect.value;
            document.execCommand('fontSize', false, '7');
            editor.querySelectorAll('font[size="7"]').forEach(f => {
                f.removeAttribute('size');
                f.style.fontSize = sizeVal;
            });
            saveSelection();
        });

        // Text color picker & quick buttons
        const textColorPicker = document.getElementById('gfmTextColorPicker');
        textColorPicker.addEventListener('input', () => {
            restoreSelection();
            document.execCommand('foreColor', false, textColorPicker.value);
            saveSelection();
        });

        overlay.querySelectorAll('#gfmToolbar button[data-color]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                document.execCommand('foreColor', false, btn.dataset.color);
                textColorPicker.value = btn.dataset.color;
                saveSelection();
            });
        });

        // Background highlight picker & quick buttons
        const bgColorPicker = document.getElementById('gfmBgColorPicker');
        bgColorPicker.addEventListener('input', () => {
            restoreSelection();
            try {
                document.execCommand('hiliteColor', false, bgColorPicker.value);
            } catch (e) {
                document.execCommand('backColor', false, bgColorPicker.value);
            }
            saveSelection();
        });

        overlay.querySelectorAll('#gfmToolbar button[data-bg]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                const bg = btn.dataset.bg;
                if (bg === 'transparent') {
                    document.execCommand('removeFormat', false, null);
                } else {
                    try {
                        document.execCommand('hiliteColor', false, bg);
                    } catch (e) {
                        document.execCommand('backColor', false, bg);
                    }
                }
                saveSelection();
            });
        });

        // Fullscreen toggle
        const toggleFullscreenBtn = document.getElementById('gfmToggleFullscreenBtn');
        toggleFullscreenBtn.addEventListener('click', () => {
            isFullscreen = !isFullscreen;
            if (isFullscreen) {
                container.classList.remove('is-windowed');
                toggleFullscreenBtn.textContent = '⛶';
            } else {
                container.classList.add('is-windowed');
                toggleFullscreenBtn.textContent = '🗖';
            }
        });

        // Tab switcher: Edit vs Preview
        window._gfmSwitchTab = function (tab) {
            activeTab = tab;
            const tabEdit = document.getElementById('gfmTabEdit');
            const tabPrev = document.getElementById('gfmTabPreview');

            if (tab === 'preview') {
                tabEdit.classList.remove('active');
                tabPrev.classList.add('active');
                workspace.style.display = 'none';
                previewArea.style.display = 'flex';

                const currentTitle = (titleInput.value || '').trim() || 'Chưa nhập tiêu đề ngữ pháp';
                const currentHtml = (editor.innerHTML || '').trim() || '<p style="color:#94a3b8;font-style:italic;">Chưa có nội dung bài giảng.</p>';

                document.getElementById('gfmStudentPrevTitle').textContent = currentTitle;
                const prevBody = document.getElementById('gfmStudentPrevBody');
                prevBody.innerHTML = currentHtml;
                setTimeout(function() {
                    if (typeof initQuizInContainerVocab === 'function') {
                        initQuizInContainerVocab(prevBody);
                    }
                }, 50);
            } else {
                tabPrev.classList.remove('active');
                tabEdit.classList.add('active');
                workspace.style.display = 'flex';
                previewArea.style.display = 'none';
            }
        };

        // Close action
        function closeModal(didSave = false) {
            window.removeEventListener('keydown', onEditorKeyDown);
            overlay.remove();
            if (options.returnToLibrary) {
                const lib = document.getElementById('_grammarLibraryModal');
                if (!lib && typeof window.openGrammarLibraryModal === 'function') {
                    window.openGrammarLibraryModal();
                }
            }
        }

        function onEditorKeyDown(e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                const closeBtn = document.getElementById('gfmCloseModalBtn');
                if (closeBtn) closeBtn.click();
            }
        }
        window.addEventListener('keydown', onEditorKeyDown);

        document.getElementById('gfmCloseModalBtn').addEventListener('click', () => {
            const currentTitle = (titleInput.value || '').trim();
            const currentBody = (editor.innerHTML || '').trim();
            if ((currentTitle && currentTitle !== initialTitle) || (currentBody && currentBody !== initialContent)) {
                Swal.fire({
                    title: 'Đóng mà không lưu?',
                    text: 'Các nội dung thay đổi chưa lưu sẽ bị mất!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'Đóng',
                    cancelButtonText: 'Ở lại'
                }).then(r => {
                    if (r.isConfirmed) closeModal();
                });
            } else {
                closeModal();
            }
        });

        document.getElementById('gfmCancelBtn').addEventListener('click', () => {
            document.getElementById('gfmCloseModalBtn').click();
        });

        // Save action
        document.getElementById('gfmSaveBtn').addEventListener('click', async () => {
            const title = (titleInput.value || '').trim();
            const body = (editor.innerHTML || '').trim();

            if (!title) {
                Swal.fire("Lỗi", "Vui lòng nhập tiêu đề ngữ pháp!", "warning");
                titleInput.focus();
                return;
            }
            if (!body || body === '<br>' || body === '<p><br></p>') {
                Swal.fire("Lỗi", "Vui lòng nhập nội dung giải thích ngữ pháp!", "warning");
                editor.focus();
                return;
            }

            const saveBtn = document.getElementById('gfmSaveBtn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<span>⏳ Đang lưu...</span>`;

            try {
                const db = firebase.firestore();
                const folderId = window.currentSharedFolderId;
                const lesson = window.currentSharedLesson;

                if (mode === 'add') {
                    const maxOrder = window.currentSharedGrammar && window.currentSharedGrammar.length > 0
                        ? Math.max(...window.currentSharedGrammar.map(g => g.order || 0)) + 1 : 0;
                    const docId = 'g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

                    await db.collection("shared_folders").doc(folderId).collection("grammar").doc(docId).set({
                        listName: lesson,
                        index: (window.currentSharedGrammar ? window.currentSharedGrammar.length : 0) + 1,
                        title: title,
                        contentHtml: body,
                        order: maxOrder,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    closeModal(true);
                    if (typeof switchLessonSubTab === 'function') {
                        switchLessonSubTab('grammar');
                    }
                    if (options.returnToLibrary) {
                        Swal.fire({
                            icon: 'success',
                            title: '🎉 Đã lưu và chèn vào bài học!',
                            text: `Ngữ pháp "${title}" đã được lưu và thêm vào bài học!`,
                            timer: 1600,
                            showConfirmButton: false
                        });
                        const lib = document.getElementById('_grammarLibraryModal');
                        if (!lib && typeof window.openGrammarLibraryModal === 'function') {
                            window.openGrammarLibraryModal();
                        }
                    } else {
                        Swal.fire("Thành công", "Đã thêm ngữ pháp vào bài học!", "success");
                    }
                } else {
                    await db.collection("shared_folders").doc(folderId).collection("grammar").doc(grammarId).update({
                        title: title,
                        contentHtml: body,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    closeModal();
                    switchLessonSubTab('grammar');
                    Swal.fire("Thành công", "Đã cập nhật ngữ pháp thành công!", "success");
                }
            } catch (err) {
                console.error("Lỗi lưu ngữ pháp:", err);
                Swal.fire("Lỗi lưu bài", err.message, "error");
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<span>💾 Lưu & Cập nhật bài học</span>`;
            }
        });

        setTimeout(() => {
            if (!initialTitle) {
                titleInput.focus();
            } else {
                editor.focus();
            }
        }, 150);
    };

    // =========================================================================
    // SỔ TAY NHÁP BÀI HỌC (LESSON SCRATCHPAD / NOTE NHÁP DÙNG CHUNG GIAO DIỆN NGỮ PHÁP)
    // =========================================================================
    window.openLessonNotesModal = function (targetFolderId, targetLessonName) {
        ensureGrammarEditorStyles();

        const folderId = targetFolderId || window.currentSharedFolderId || (_studentFolders[0]?.id) || (_teacherFolders[0]?.id) || 'general';
        const folder = (_teacherFolders.concat(_studentFolders)).find(f => f.id === folderId);
        const folderTitle = (folder && folder.name) || window.currentSharedFolderTitle || 'Thư mục học tập';
        const lessonName = targetLessonName || window.currentSharedLesson || '';

        const modalId = '_lessonNotesModal';
        const oldModal = document.getElementById(modalId);
        if (oldModal) oldModal.remove();

        const noteKey = 'topik_lesson_note_' + folderId + '_' + (lessonName || 'general').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\uAC00-\uD7AF]/g, '_');
        let savedData = { title: '', content: '' };
        try {
            const raw = localStorage.getItem(noteKey);
            if (raw) savedData = JSON.parse(raw);
        } catch (e) {}

        let isFullscreen = true;
        let activeTab = 'edit';
        let savedRange = null;

        const overlay = document.createElement('div');
        overlay.id = modalId;

        overlay.innerHTML = `
            <div class="gfm-container" id="lnmContainer">
                <!-- TOP HEADER -->
                <div class="gfm-header" style="background:linear-gradient(135deg, #eef2ff, #f8fafc);padding:6px 16px;">
                    <div class="gfm-title-area">
                        <span class="gfm-badge" style="background:linear-gradient(135deg, #4f46e5, #4338ca);">📖 SỔ TAY NHÁP</span>
                        <span style="font-weight:700;font-size:0.9em;color:#1e1b4b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHtml(folderTitle)}${lessonName ? ' / <b style="color:#4f46e5;">' + escapeHtml(lessonName) + '</b>' : ''}
                        </span>
                    </div>

                    <!-- TABS: SOẠN GHI CHÚ & XEM LẠI -->
                    <div class="gfm-tabs">
                        <button type="button" class="gfm-tab-btn active" id="lnmTabEdit" onclick="_lnmSwitchTab('edit')">
                            <span>✍️ Soạn ghi chú</span>
                        </button>
                        <button type="button" class="gfm-tab-btn" id="lnmTabPreview" onclick="_lnmSwitchTab('preview')">
                            <span>👁️ Xem lại</span>
                        </button>
                    </div>

                    <!-- WINDOW ACTIONS -->
                    <div style="display:flex;align-items:center;gap:4px;">
                        <button type="button" class="gfm-tool-btn" id="lnmToggleFullscreenBtn" title="Phóng to / Thu nhỏ" style="font-size:1.05em;padding:3px 6px;">
                            ⛶
                        </button>
                        <button type="button" class="gfm-tool-btn" id="lnmSplitBtn" title="Chia đôi màn hình" style="font-size:1.05em;padding:3px 6px;display:inline-flex;align-items:center;justify-content:center;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
                                <path d="M2 4h5a5 5 0 0 1 5 5v11a5 5 0 0 0-5-5H2z"></path>
                                <path d="M22 4h-5a5 5 0 0 0-5 5v11a5 5 0 0 1 5-5h5z"></path>
                                <line x1="12" y1="4" x2="12" y2="20"></line>
                            </svg>
                        </button>
                        <button type="button" class="gfm-tool-btn" id="lnmCloseModalBtn" title="Đóng cửa sổ" style="font-size:1.25em;color:#ef4444;padding:3px 6px;">
                            &times;
                        </button>
                    </div>
                </div>


                <!-- WORKSPACE (DOCUMENT CANVAS) -->
                <div class="gfm-workspace" id="lnmWorkspace">
                    <div class="gfm-editor-col">
                        <!-- TOOLBAR -->
                        <div class="gfm-toolbar" id="lnmToolbar">
                            <!-- FONT FAMILY -->
                            <div class="gfm-tool-group" title="Chọn Font chữ">
                                <select id="lnmFontFamily" class="gfm-select">
                                    <option value="'Pretendard', sans-serif">Pretendard (Chuẩn)</option>
                                    <option value="'Nanum Gothic', sans-serif">Nanum Gothic (나눔고딕)</option>
                                    <option value="'Nanum Myeongjo', serif">Nanum Myeongjo (나눔명조)</option>
                                    <option value="Inter, sans-serif">Inter</option>
                                    <option value="Roboto, sans-serif">Roboto</option>
                                    <option value="Arial, sans-serif">Arial</option>
                                    <option value="'Times New Roman', serif">Times New Roman</option>
                                    <option value="'Courier New', monospace">Courier New</option>
                                </select>
                            </div>

                            <!-- FONT SIZE -->
                            <div class="gfm-tool-group" title="Kích thước chữ">
                                <select id="lnmFontSize" class="gfm-select">
                                    <option value="14px">14px - Nhỏ</option>
                                    <option value="16px">16px - Vừa</option>
                                    <option value="18px" selected>18px - Chuẩn</option>
                                    <option value="20px">20px - Lớn</option>
                                    <option value="24px">24px - Tiêu đề 3</option>
                                    <option value="28px">28px - Tiêu đề 2</option>
                                    <option value="32px">32px - Tiêu đề 1</option>
                                </select>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- TEXT COLOR -->
                            <div class="gfm-tool-group" title="Màu chữ">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Chữ:</span>
                                <input type="color" id="lnmTextColorPicker" value="#0f172a" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu chữ">
                                <button type="button" class="gfm-tool-btn" data-color="#dc2626" style="color:#dc2626;padding:2px 4px;font-size:0.82em;" title="Đỏ">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#2563eb" style="color:#2563eb;padding:2px 4px;font-size:0.82em;" title="Xanh">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#16a34a" style="color:#16a34a;padding:2px 4px;font-size:0.82em;" title="Xanh lá">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#7c3aed" style="color:#7c3aed;padding:2px 4px;font-size:0.82em;" title="Tím">A</button>
                            </div>

                            <!-- HIGHLIGHT COLOR -->
                            <div class="gfm-tool-group" title="Màu nền / Highlight">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Nền:</span>
                                <input type="color" id="lnmBgColorPicker" value="#fef08a" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu nền">
                                <button type="button" class="gfm-tool-btn" data-bg="#fef08a" style="background:#fef08a;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Vàng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bae6fd" style="background:#bae6fd;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bbf7d0" style="background:#bbf7d0;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh lá nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#fbcfe8" style="background:#fbcfe8;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Hồng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="transparent" style="font-size:0.75em;color:#64748b;padding:2px 4px;" title="Xóa nền">✕</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- NÚT CHÈN Ô GHI CHÚ NỔI BẬT -->
                            <button type="button" class="gfm-tool-btn" id="lnmInsertExampleBtn"
                                    title="Bấm: Chèn ô ghi chú nổi bật | Ấn giữ: Chọn màu sắc ô"
                                    style="background:#f0fdf4;border:1.5px solid #10b981;color:#15803d;padding:3px 9px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:5px;border-radius:6px;cursor:pointer;">
                                <span>💡 Ô ghi chú</span>
                                <span class="gfm-color-dot-indicator" style="width:9px;height:9px;border-radius:50%;background:#10b981;border:1px solid #fff;box-shadow:0 0 0 1px #10b981;"></span>
                                <span style="font-size:0.7em;opacity:0.7;">▾</span>
                            </button>

                            <span class="gfm-tool-sep"></span>

                            <!-- BASIC STYLES -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="bold" title="In đậm (Ctrl+B)"><b>B</b></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="italic" title="In nghiêng (Ctrl+I)"><i>I</i></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="underline" title="Gạch chân (Ctrl+U)"><u>U</u></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button>
                            </div>

                            <!-- ALIGNMENTS -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyLeft" title="Căn trái">⇤</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyCenter" title="Căn giữa">≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyRight" title="Căn phải">⇥</button>
                            </div>

                            <!-- LISTS -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertUnorderedList" title="Danh sách chấm tròn">•≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="insertOrderedList" title="Danh sách số 1,2,3">1≡</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- UTILITIES -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertHorizontalRule" title="Đường kẻ ngang">―</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="removeFormat" title="Xóa định dạng" style="color:#ef4444;">Tx</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="undo" title="Hoàn tác (Ctrl+Z)">↶</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="redo" title="Làm lại (Ctrl+Y)">↷</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- BỘ GÕ TELEX TÍCH HỢP -->
                            <button type="button" class="gfm-tool-btn gfm-telex-toggle-btn" onclick="window.toggleWebTelex()"
                                    title="Bộ gõ Telex tích hợp: Khi bật, bạn có thể để EVKey ở chữ E, chỉ cần bấm Alt để đổi giữa gõ tiếng Hàn (가) và tiếng Việt (A)!"
                                    style="background:#eff6ff;border:1.5px solid #3b82f6;color:#1d4ed8;padding:3px 8px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:4px;border-radius:6px;cursor:pointer;">
                                <span class="telex-status-icon">🇻🇳</span>
                                <span class="telex-status-text">Telex: BẬT</span>
                            </button>
                        </div>

                        <!-- SCROLL WRAPPER (CENTERED CANVAS PAPER) -->
                        <div class="gfm-editor-scroll-wrap">
                            <div id="lnmContentBody" class="gfm-editor-content" contenteditable="true"
                                 placeholder="Nhập nội dung note nháp bài học, từ vựng, ngữ pháp cần nhớ, cấu trúc hoặc dàn bài tại đây...">${savedData.content || ''}</div>
                        </div>
                    </div>
                </div>

                <!-- PREVIEW CONTAINER -->
                <div class="gfm-preview-wrapper" id="lnmStudentPreviewArea" style="display:none;">
                    <div class="gfm-preview-card" style="border-left-color:#4f46e5;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                            <span class="gfm-badge" style="background:#4f46e5;">Ghi chú bài học</span>
                            <h2 id="lnmStudentPrevTitle" style="margin:0;font-size:1.35em;color:#1e1b4b;font-weight:800;">Tiêu đề ghi chú</h2>
                        </div>
                        <div id="lnmStudentPrevBody" class="grammar-card-body" style="font-size:1.15em;line-height:1.85;">
                            Nội dung ghi chú sẽ hiển thị tại đây...
                        </div>
                    </div>
                </div>

                <!-- FOOTER ACTIONS -->
                <div class="gfm-footer">
                    <div id="lnmAutoSaveStatus" style="display:flex;align-items:center;gap:8px;font-size:0.85em;color:#64748b;">
                        <span>💾</span>
                        <span>Tự động lưu nháp vào máy & tài khoản.</span>
                    </div>
                    </div>

                    <div style="display:flex;align-items:center;gap:10px;">
                        <button type="button" id="lnmClearBtn" style="padding:10px 18px;background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.88em;">
                            🗑️ Xóa nháp
                        </button>
                        <button type="button" id="lnmCloseBtn" style="padding:10px 20px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.9em;">
                            Đóng
                        </button>
                        <button type="button" id="lnmSaveBtn" style="padding:10px 26px;background:linear-gradient(135deg, #4f46e5, #4338ca);color:#ffffff;border:none;border-radius:10px;font-weight:800;cursor:pointer;font-size:0.92em;box-shadow:0 4px 14px rgba(79,70,229,0.35);display:flex;align-items:center;gap:8px;">
                            <span>💾 Lưu ghi chú</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (typeof updateAllTelexUI === 'function') updateAllTelexUI();

        const container = document.getElementById('lnmContainer');
        const editor = document.getElementById('lnmContentBody');
        const workspace = document.getElementById('lnmWorkspace');
        const previewArea = document.getElementById('lnmStudentPreviewArea');

        // Setup Ô Ghi Chú Nổi Bật
        setupHorizontalExampleTool({
            btn: document.getElementById('lnmInsertExampleBtn'),
            getEditor: () => editor,
            getSavedRange: () => savedRange,
            defaultBadge: '💡 Ghi chú cần nhớ'
        });

        function saveSelection() {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
                savedRange = sel.getRangeAt(0).cloneRange();
            }
        }
        editor.addEventListener('keyup', saveSelection);
        editor.addEventListener('mouseup', saveSelection);
        editor.addEventListener('touchend', saveSelection);
        editor.addEventListener('blur', saveSelection);

        function restoreSelection() {
            editor.focus();
            if (savedRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedRange);
            }
        }

        // Toolbar formatting commands
        overlay.querySelectorAll('#lnmToolbar button[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                document.execCommand(btn.dataset.cmd, false, null);
                saveSelection();
                triggerAutoSave();
            });
        });

        // Font family
        const fontSelect = document.getElementById('lnmFontFamily');
        fontSelect.addEventListener('change', () => {
            restoreSelection();
            document.execCommand('fontName', false, fontSelect.value);
            saveSelection();
            triggerAutoSave();
        });

        // Font size
        const fontSizeSelect = document.getElementById('lnmFontSize');
        fontSizeSelect.addEventListener('change', () => {
            restoreSelection();
            const sizeVal = fontSizeSelect.value;
            document.execCommand('fontSize', false, '7');
            editor.querySelectorAll('font[size="7"]').forEach(f => {
                f.removeAttribute('size');
                f.style.fontSize = sizeVal;
            });
            saveSelection();
            triggerAutoSave();
        });

        // Text color
        const textColorPicker = document.getElementById('lnmTextColorPicker');
        textColorPicker.addEventListener('input', () => {
            restoreSelection();
            document.execCommand('foreColor', false, textColorPicker.value);
            saveSelection();
            triggerAutoSave();
        });
        overlay.querySelectorAll('#lnmToolbar button[data-color]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                document.execCommand('foreColor', false, btn.dataset.color);
                textColorPicker.value = btn.dataset.color;
                saveSelection();
                triggerAutoSave();
            });
        });

        // Background highlight
        const bgColorPicker = document.getElementById('lnmBgColorPicker');
        bgColorPicker.addEventListener('input', () => {
            restoreSelection();
            try {
                document.execCommand('hiliteColor', false, bgColorPicker.value);
            } catch (e) {
                document.execCommand('backColor', false, bgColorPicker.value);
            }
            saveSelection();
            triggerAutoSave();
        });
        overlay.querySelectorAll('#lnmToolbar button[data-bg]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                restoreSelection();
                const bg = btn.dataset.bg;
                if (bg === 'transparent') {
                    document.execCommand('removeFormat', false, null);
                } else {
                    try {
                        document.execCommand('hiliteColor', false, bg);
                    } catch (e) {
                        document.execCommand('backColor', false, bg);
                    }
                }
                saveSelection();
                triggerAutoSave();
            });
        });

        // Fullscreen toggle
        const toggleFullscreenBtn = document.getElementById('lnmToggleFullscreenBtn');
        toggleFullscreenBtn.addEventListener('click', () => {
            isFullscreen = !isFullscreen;
            if (isFullscreen) {
                container.classList.remove('is-windowed');
                toggleFullscreenBtn.textContent = '⛶';
            } else {
                container.classList.add('is-windowed');
                toggleFullscreenBtn.textContent = '🗖';
            }
            // Thoát chế độ chia đôi nếu đang bật (tránh xung đột trạng thái)
            if (isSplit) {
                isSplit = false;
                overlay.classList.remove('is-split');
                splitBtn.classList.remove('is-active');
                splitBtn.title = 'Chia đôi màn hình';
                document.body.classList.remove('lesson-notes-split');
            }
        });

        // Chia đôi màn hình (split view)
        let isSplit = false;
        const splitBtn = document.getElementById('lnmSplitBtn');
        splitBtn.addEventListener('click', () => {
            isSplit = !isSplit;
            if (isSplit) {
                overlay.classList.add('is-split');
                splitBtn.classList.add('is-active');
                splitBtn.title = 'Trở về chế độ toàn màn hình';
                document.body.classList.add('lesson-notes-split');
                // Khi chia đôi, bỏ trạng thái thu nhỏ để chiếm đúng nửa màn hình phải
                container.classList.remove('is-windowed');
                isFullscreen = true;
                toggleFullscreenBtn.textContent = '⛶';
            } else {
                overlay.classList.remove('is-split');
                splitBtn.classList.remove('is-active');
                splitBtn.title = 'Chia đôi màn hình';
                document.body.classList.remove('lesson-notes-split');
            }
        });

        // Tab switcher
        window._lnmSwitchTab = function (tab) {
            activeTab = tab;
            const tabEdit = document.getElementById('lnmTabEdit');
            const tabPrev = document.getElementById('lnmTabPreview');

            if (tab === 'preview') {
                tabEdit.classList.remove('active');
                tabPrev.classList.add('active');
                workspace.style.display = 'none';
                previewArea.style.display = 'flex';

                const currentTitle = 'Ghi chú bài học';
                const currentHtml = (editor.innerHTML || '').trim() || '<p style="color:#94a3b8;font-style:italic;">Chưa có nội dung ghi chú nào.</p>';

                document.getElementById('lnmStudentPrevTitle').textContent = currentTitle;
                document.getElementById('lnmStudentPrevBody').innerHTML = currentHtml;
            } else {
                tabPrev.classList.remove('active');
                tabEdit.classList.add('active');
                workspace.style.display = 'flex';
                previewArea.style.display = 'none';
            }
        };

        // Auto Save Logic
        let saveTimer = null;
        function saveNote(showToast = false) {
            const content = (editor.innerHTML || '').trim();
            const data = {
                folderId: folderId,
                folderTitle: folderTitle,
                lessonName: lessonName,
                content: content,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(noteKey, JSON.stringify(data));

            // Sync to Firestore if logged in
            const auth = (window.auth) || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth());
            const user = auth && auth.currentUser;
            if (user && typeof firebase !== 'undefined' && firebase.firestore) {
                const safeDocId = (folderId || 'gen') + '_' + (lessonName || 'all').replace(/[^a-zA-Z0-9_-]/g, '_');
                firebase.firestore().collection("users").doc(user.uid)
                    .collection("lesson_notes").doc(safeDocId).set(data, { merge: true }).catch(console.warn);
            }

            const statusEl = document.getElementById('lnmAutoSaveStatus');
            if (statusEl) {
                const now = new Date();
                const timeStr = now.getHours().toString().padStart(2, '0') + ':' +
                                now.getMinutes().toString().padStart(2, '0') + ':' +
                                now.getSeconds().toString().padStart(2, '0');
                statusEl.innerHTML = `<span>💾</span><span style="color:#10b981;font-weight:700;">✓ Đã lưu nháp lúc ${timeStr}</span>`;
            }

            if (showToast && typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Đã lưu ghi chú!',
                    text: 'Ghi chú của bạn đã được lưu an toàn.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        }

        function triggerAutoSave() {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => saveNote(false), 800);
        }

        editor.addEventListener('input', triggerAutoSave);

        // Load remote data from Firestore if exists
        const auth = (window.auth) || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth());
        const user = auth && auth.currentUser;
        if (user && typeof firebase !== 'undefined' && firebase.firestore) {
            const safeDocId = (folderId || 'gen') + '_' + (lessonName || 'all').replace(/[^a-zA-Z0-9_-]/g, '_');
            firebase.firestore().collection("users").doc(user.uid)
                .collection("lesson_notes").doc(safeDocId).get().then(doc => {
                    if (doc.exists) {
                        const r = doc.data();
                        if (r && r.updatedAt && (!savedData.updatedAt || new Date(r.updatedAt) > new Date(savedData.updatedAt))) {
                            if (editor && (!editor.innerHTML || editor.innerHTML === savedData.content)) editor.innerHTML = r.content || '';
                        }
                    }
                }).catch(console.warn);
        }

        // Action buttons
        document.getElementById('lnmCloseModalBtn').addEventListener('click', () => {
            saveNote(false);
            document.body.classList.remove('lesson-notes-split');
            overlay.remove();
        });
        document.getElementById('lnmCloseBtn').addEventListener('click', () => {
            saveNote(false);
            document.body.classList.remove('lesson-notes-split');
            overlay.remove();
        });
        document.getElementById('lnmSaveBtn').addEventListener('click', () => {
            saveNote(true);
        });
        document.getElementById('lnmClearBtn').addEventListener('click', () => {
            Swal.fire({
                title: 'Xóa toàn bộ nội dung nháp?',
                text: 'Hành động này không thể hoàn tác.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'Xóa nháp',
                cancelButtonText: 'Hủy'
            }).then(r => {
                if (r.isConfirmed) {
                    editor.innerHTML = '';
                    saveNote(false);
                    Swal.fire("Đã xóa", "Đã xóa nội dung nháp bài học.", "info");
                }
            });
        });

        setTimeout(() => {
            editor.focus();
        }, 150);
    };

    // Sửa 1 mục ngữ pháp (Gọi popup Fullscreen, bóc tách cấu trúc HTML trực quan như admin)
    window.editGrammarPoint = async function (grammarId) {
        if (!isTeacher() || !window.currentSharedFolderId) return;
        const g = (window.currentSharedGrammar || []).find(item => item.id === grammarId);
        if (!g) return;

        // Bóc tách cấu trúc JSON / HTML chuẩn để hiển thị đầy đủ bố cục (tiêu đề, khung ví dụ, bảng) trong editor
        const formattedContent = formatGrammarContentForVocab(g);

        window.openGrammarEditorModal({
            mode: 'edit',
            grammarId: grammarId,
            initialTitle: g.title || '',
            initialContent: formattedContent
        });
    };

    // Thêm thủ công 1 mục ngữ pháp (Gọi popup Fullscreen)
    window.openSingleGrammarModal = async function () {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedLesson) {
            Swal.fire("Thông báo", "Vui lòng chọn thư mục và bài học trước khi thêm ngữ pháp!", "warning");
            return;
        }

        window.openGrammarEditorModal({
            mode: 'add',
            initialTitle: '',
            initialContent: ''
        });
    };

    // Xóa 1 mục ngữ pháp
    window.deleteGrammarPoint = function (grammarId, title) {
        if (!isTeacher() || !window.currentSharedFolderId) return;

        Swal.fire({
            title: 'Xóa ngữ pháp?',
            html: `Bạn có chắc chắn muốn xóa ngữ pháp <b>"${title}"</b> không?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy'
        }).then(async r => {
            if (r.isConfirmed) {
                try {
                    await firebase.firestore().collection("shared_folders").doc(window.currentSharedFolderId)
                        .collection("grammar").doc(grammarId).delete();
                    Swal.fire("Đã xóa", "Đã xóa mục ngữ pháp thành công!", "success");
                } catch (err) {
                    Swal.fire("Lỗi", err.message, "error");
                }
            }
        });
    };


    // Modal Chỉnh sửa Ngữ pháp (Bản tổng hợp toàn bài lúc chưa bị phân mảnh)
    window.openCombinedGrammarEditor = async function () {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedLesson) {
            Swal.fire("Thông báo", "Vui lòng chọn bài học trước khi sửa bản tổng hợp!", "warning");
            return;
        }
        ensureGrammarEditorStyles();

        const folderId = window.currentSharedFolderId;
        const lessonName = window.currentSharedLesson;
        const folderTitle = window.currentSharedFolderTitle || 'Thư mục giảng dạy';
        const safeLessonName = lessonName.replace(/[\/\s\.'":#?&=+]/g, '_');
        const db = firebase.firestore();

        // Hiển thị trạng thái đang nạp
        Swal.fire({
            title: 'Đang tải bản tổng hợp...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        let initialHtml = '';
        try {
            // Kiểm tra xem đã có bản raw chưa
            const rawDocRef = db.collection("shared_folders").doc(folderId).collection("grammar").doc('raw_' + safeLessonName);
            const rawSnap = await rawDocRef.get();
            if (rawSnap.exists && rawSnap.data().contentHtml) {
                initialHtml = rawSnap.data().contentHtml;
            } else if (window.currentSharedGrammar && window.currentSharedGrammar.length > 0) {
                // Tự động tái tạo bản tổng hợp từ các thẻ hiện có
                let parts = [];
                window.currentSharedGrammar.forEach((g, idx) => {
                    const num = g.index || (idx + 1);
                    const title = g.title || (`Ngữ pháp ${num}`);
                    parts.push(`<div><b>${escapeHtml(title)}</b></div>\n${g.contentHtml || ''}`);
                });
                initialHtml = parts.join('<p><br></p><hr><p><br></p>');
            }
        } catch (e) {
            console.warn("Lỗi đọc rawDoc:", e);
        }

        Swal.close();

        const modalId = '_combinedGrammarEditorModal';
        const old = document.getElementById(modalId);
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = modalId;

        overlay.innerHTML = `
            <div class="gfm-container" id="cgmContainer">
                <!-- TOP HEADER -->
                <div class="gfm-header">
                    <div class="gfm-title-area">
                        <span class="gfm-badge" style="background:linear-gradient(135deg, #0284c7, #0369a1);">📑 BẢN TỔNG HỢP</span>
                        <span style="font-weight:700;font-size:0.9em;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHtml(folderTitle)} / <b style="color:#0284c7;">${escapeHtml(lessonName)}</b>
                        </span>
                    </div>

                    <!-- TABS: SOẠN THẢO & PHÂN TÁCH -->
                    <div class="gfm-tabs">
                        <button type="button" class="gfm-tab-btn active" id="cgmTabEdit" onclick="_cgmSwitchTab('edit')">
                            <span>✍️ Soạn thảo toàn bài</span>
                        </button>
                        <button type="button" class="gfm-tab-btn" id="cgmTabPreview" onclick="_cgmSwitchTab('preview')">
                            <span>🔍 Phân tách danh sách</span>
                        </button>
                    </div>

                    <!-- WINDOW ACTIONS -->
                    <div style="display:flex;align-items:center;gap:4px;">
                        <button type="button" class="gfm-tool-btn" id="cgmToggleFullscreenBtn" title="Phóng to / Thu nhỏ" style="font-size:1.05em;padding:3px 6px;">⛶</button>
                        <button type="button" class="gfm-tool-btn" id="cgmCloseBtn" onclick="document.getElementById('${modalId}').remove()" title="Đóng cửa sổ" style="font-size:1.25em;color:#ef4444;padding:3px 6px;">&times;</button>
                    </div>
                </div>

                <!-- WORKSPACE (FULL WIDTH DOCUMENT CANVAS) -->
                <div class="gfm-workspace" id="cgmWorkspace">
                    <div class="gfm-editor-col">
                        <!-- TOOLBAR -->
                        <div class="gfm-toolbar" id="cgmToolbar">
                            <!-- FONT FAMILY -->
                            <div class="gfm-tool-group" title="Chọn Font chữ">
                                <select id="cgmFontFamily" class="gfm-select">
                                    <option value="'Pretendard', sans-serif">Pretendard (Chuẩn)</option>
                                    <option value="'Nanum Gothic', sans-serif">Nanum Gothic (나눔고딕)</option>
                                    <option value="'Nanum Myeongjo', serif">Nanum Myeongjo (나눔명조)</option>
                                    <option value="Inter, sans-serif">Inter</option>
                                    <option value="Roboto, sans-serif">Roboto</option>
                                    <option value="Arial, sans-serif">Arial</option>
                                    <option value="'Times New Roman', serif">Times New Roman</option>
                                    <option value="'Courier New', monospace">Courier New</option>
                                </select>
                            </div>

                            <!-- FONT SIZE -->
                            <div class="gfm-tool-group" title="Kích thước chữ">
                                <select id="cgmFontSize" class="gfm-select">
                                    <option value="14px">14px - Nhỏ</option>
                                    <option value="16px">16px - Vừa</option>
                                    <option value="18px" selected>18px - Chuẩn</option>
                                    <option value="20px">20px - Lớn</option>
                                    <option value="24px">24px - Tiêu đề 3</option>
                                    <option value="28px">28px - Tiêu đề 2</option>
                                </select>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- TEXT COLOR -->
                            <div class="gfm-tool-group" title="Màu chữ">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Chữ:</span>
                                <input type="color" id="cgmTextColorPicker" value="#0f172a" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu chữ">
                                <button type="button" class="gfm-tool-btn" data-color="#dc2626" style="color:#dc2626;padding:2px 4px;font-size:0.82em;">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#0284c7" style="color:#0284c7;padding:2px 4px;font-size:0.82em;">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#16a34a" style="color:#16a34a;padding:2px 4px;font-size:0.82em;">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#7c3aed" style="color:#7c3aed;padding:2px 4px;font-size:0.82em;">A</button>
                            </div>

                            <!-- HIGHLIGHT COLOR -->
                            <div class="gfm-tool-group" title="Màu nền / Highlight">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Nền:</span>
                                <input type="color" id="cgmBgColorPicker" value="#fef08a" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu nền">
                                <button type="button" class="gfm-tool-btn" data-bg="#fef08a" style="background:#fef08a;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Vàng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bae6fd" style="background:#bae6fd;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bbf7d0" style="background:#bbf7d0;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh lá nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="transparent" style="font-size:0.75em;color:#64748b;padding:2px 4px;" title="Xóa nền">✕</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- NÚT CHÈN Ô VÍ DỤ NGANG (NGANG HÀNG VỚI FONT, SIZE, MÀU SẮC) -->
                            <button type="button" class="gfm-tool-btn" id="cgmInsertExampleBtn"
                                    title="Bấm: Chèn ô ví dụ ngang | Ấn giữ: Chọn màu sắc ô"
                                    style="background:#f0fdf4;border:1.5px solid #10b981;color:#15803d;padding:3px 9px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:5px;border-radius:6px;cursor:pointer;">
                                <span>💡 Ô ví dụ</span>
                                <span class="gfm-color-dot-indicator" style="width:9px;height:9px;border-radius:50%;background:#10b981;border:1px solid #fff;box-shadow:0 0 0 1px #10b981;"></span>
                                <span style="font-size:0.7em;opacity:0.7;">▾</span>
                            </button>

                            <span class="gfm-tool-sep"></span>

                            <!-- BASIC STYLES -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="bold" title="In đậm (Ctrl+B)"><b>B</b></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="italic" title="In nghiêng (Ctrl+I)"><i>I</i></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="underline" title="Gạch chân (Ctrl+U)"><u>U</u></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button>
                            </div>

                            <!-- ALIGNMENTS -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyLeft" title="Căn trái">⇤</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyCenter" title="Căn giữa">≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyRight" title="Căn phải">⇥</button>
                            </div>

                            <!-- LISTS -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertUnorderedList" title="Danh sách chấm tròn">•≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="insertOrderedList" title="Danh sách số 1,2,3">1≡</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- UTILITIES -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertHorizontalRule" title="Đường kẻ ngang">―</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="removeFormat" title="Xóa định dạng" style="color:#ef4444;">Tx</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="undo" title="Hoàn tác (Ctrl+Z)">↶</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="redo" title="Làm lại (Ctrl+Y)">↷</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- BỘ GÕ TELEX TÍCH HỢP -->
                            <button type="button" class="gfm-tool-btn gfm-telex-toggle-btn" onclick="window.toggleWebTelex()"
                                    title="Bộ gõ Telex tích hợp: Khi bật, bạn có thể để EVKey ở chữ E, chỉ cần bấm Alt để đổi giữa gõ tiếng Hàn (가) và tiếng Việt (A)!"
                                    style="background:#eff6ff;border:1.5px solid #3b82f6;color:#1d4ed8;padding:3px 8px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:4px;border-radius:6px;cursor:pointer;">
                                <span class="telex-status-icon">🇻🇳</span>
                                <span class="telex-status-text">Telex: BẬT</span>
                            </button>
                        </div>

                        <!-- MAIN CONTENT EDITABLE (CENTERED PAPER CANVAS) -->
                        <div class="gfm-editor-scroll-wrap">
                            <div id="combinedGrammarBox" class="gfm-editor-content" contenteditable="true"
                                 placeholder="Soạn thảo hoặc dán toàn bộ bài học ngữ pháp tại đây...">${initialHtml}</div>
                        </div>
                    </div>
                </div>

                <!-- PREVIEW CONTAINER (PHÂN TÁCH DANH SÁCH RIÊNG BIỆT) -->
                <div class="gfm-preview-wrapper" id="cgmParsedPreviewWrapper" style="display:none;background:#f1f5f9;padding:24px;overflow-y:auto;flex:1;">
                    <div style="max-width:920px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:14px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:12px 18px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                            <div>
                                <span style="font-weight:800;font-size:1.02em;color:#0f172a;">
                                    ✨ Danh sách ngữ pháp đã phân tách: <span id="combinedParsedCountBadge" style="color:#0284c7;">0 mục</span>
                                </span>
                                <div style="font-size:0.8em;color:#64748b;margin-top:2px;">(Bấm vào từng tiêu đề để mở rộng hoặc thu gọn nội dung chi tiết)</div>
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <button type="button" onclick="expandAllCombinedItems()" style="background:#f0f9ff;border:1px solid #bae6fd;color:#0284c7;padding:5px 12px;border-radius:8px;font-size:0.82em;font-weight:700;cursor:pointer;">
                                    ▾ Mở rộng tất cả
                                </button>
                                <button type="button" onclick="collapseAllCombinedItems()" style="background:#f8fafc;border:1px solid #cbd5e1;color:#64748b;padding:5px 12px;border-radius:8px;font-size:0.82em;font-weight:700;cursor:pointer;">
                                    ▴ Thu gọn tất cả
                                </button>
                                <button type="button" onclick="triggerCombinedParse(true)" style="background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;padding:5px 12px;border-radius:8px;font-size:0.82em;font-weight:700;cursor:pointer;" title="Phân tích lại theo bài soạn thảo gốc">
                                    🔄 Phân tách lại
                                </button>
                            </div>
                        </div>
                        <div id="combinedParsedList" style="display:flex;flex-direction:column;gap:10px;"></div>
                    </div>
                </div>

                <!-- FOOTER ACTIONS -->
                <div class="gfm-footer">
                    <div></div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button type="button" onclick="document.getElementById('${modalId}').remove()" style="padding:7px 16px;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.88em;">
                            Đóng
                        </button>
                        <button id="saveCombinedGrammarBtn" onclick="saveCombinedGrammarAction()" style="padding:7px 20px;background:linear-gradient(135deg, #0284c7, #0369a1);color:#ffffff;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:0.88em;box-shadow:0 3px 10px rgba(2,132,199,0.3);display:flex;align-items:center;gap:6px;">
                            <span>💾 Lưu & Cập nhật bài học</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (typeof updateAllTelexUI === 'function') updateAllTelexUI();

        // Wiring Tab Switcher & Fullscreen
        let cgmIsFullscreen = true;
        const cgmContainer = document.getElementById('cgmContainer');
        const cgmWorkspace = document.getElementById('cgmWorkspace');
        const cgmParsedWrapper = document.getElementById('cgmParsedPreviewWrapper');
        const cgmTabEdit = document.getElementById('cgmTabEdit');
        const cgmTabPreview = document.getElementById('cgmTabPreview');

        window._cgmSwitchTab = function (tab) {
            if (tab === 'preview') {
                cgmTabEdit.classList.remove('active');
                cgmTabPreview.classList.add('active');
                cgmWorkspace.style.display = 'none';
                cgmParsedWrapper.style.display = 'block';
                triggerCombinedParse();
            } else {
                cgmTabPreview.classList.remove('active');
                cgmTabEdit.classList.add('active');
                cgmWorkspace.style.display = 'flex';
                cgmParsedWrapper.style.display = 'none';
            }
        };

        document.getElementById('cgmToggleFullscreenBtn').addEventListener('click', () => {
            cgmIsFullscreen = !cgmIsFullscreen;
            if (cgmIsFullscreen) {
                cgmContainer.classList.remove('is-windowed');
            } else {
                cgmContainer.classList.add('is-windowed');
            }
        });

        // Setup Ô ví dụ tool for combined modal
        const combinedBox = document.getElementById('combinedGrammarBox');
        let cgmSavedRange = null;
        function cgmSaveSelection() {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && combinedBox.contains(sel.anchorNode)) {
                cgmSavedRange = sel.getRangeAt(0).cloneRange();
            }
        }
        combinedBox.addEventListener('keyup', cgmSaveSelection);
        combinedBox.addEventListener('mouseup', cgmSaveSelection);
        combinedBox.addEventListener('blur', cgmSaveSelection);

        function cgmRestoreSelection() {
            combinedBox.focus();
            if (cgmSavedRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(cgmSavedRange);
            }
        }

        setupHorizontalExampleTool({
            btn: document.getElementById('cgmInsertExampleBtn'),
            getEditor: () => combinedBox,
            getSavedRange: () => cgmSavedRange,
            defaultBadge: '💡 Ví dụ minh họa'
        });

        // Toolbar formatting for combined
        overlay.querySelectorAll('#cgmToolbar button[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                cgmRestoreSelection();
                document.execCommand(btn.dataset.cmd, false, null);
                cgmSaveSelection();
            });
        });

        const cgmFontSelect = document.getElementById('cgmFontFamily');
        cgmFontSelect.addEventListener('change', () => {
            cgmRestoreSelection();
            document.execCommand('fontName', false, cgmFontSelect.value);
            cgmSaveSelection();
        });

        const cgmFontSizeSelect = document.getElementById('cgmFontSize');
        cgmFontSizeSelect.addEventListener('change', () => {
            cgmRestoreSelection();
            const sizeVal = cgmFontSizeSelect.value;
            document.execCommand('fontSize', false, '7');
            combinedBox.querySelectorAll('font[size="7"]').forEach(f => {
                f.removeAttribute('size');
                f.style.fontSize = sizeVal;
            });
            cgmSaveSelection();
        });

        const cgmTextColorPicker = document.getElementById('cgmTextColorPicker');
        cgmTextColorPicker.addEventListener('input', () => {
            cgmRestoreSelection();
            document.execCommand('foreColor', false, cgmTextColorPicker.value);
            cgmSaveSelection();
        });
        overlay.querySelectorAll('#cgmToolbar button[data-color]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                cgmRestoreSelection();
                document.execCommand('foreColor', false, btn.dataset.color);
                cgmTextColorPicker.value = btn.dataset.color;
                cgmSaveSelection();
            });
        });

        const cgmBgColorPicker = document.getElementById('cgmBgColorPicker');
        cgmBgColorPicker.addEventListener('input', () => {
            cgmRestoreSelection();
            try {
                document.execCommand('hiliteColor', false, cgmBgColorPicker.value);
            } catch (e) {
                document.execCommand('backColor', false, cgmBgColorPicker.value);
            }
            cgmSaveSelection();
        });
        overlay.querySelectorAll('#cgmToolbar button[data-bg]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                cgmRestoreSelection();
                const bg = btn.dataset.bg;
                if (bg === 'transparent') {
                    document.execCommand('removeFormat', false, null);
                } else {
                    try {
                        document.execCommand('hiliteColor', false, bg);
                    } catch (e) {
                        document.execCommand('backColor', false, bg);
                    }
                    cgmBgColorPicker.value = bg;
                }
                cgmSaveSelection();
            });
        });

        let _combinedParsedItems = [];

        window.triggerCombinedParse = function (showScroll = false) {
            const box = document.getElementById('combinedGrammarBox');
            if (!box) return;
            const rawHtml = box.innerHTML;
            const rawText = box.innerText;
            if (!rawText.trim() && !rawHtml.trim()) return;

            const items = parsePastedGrammar(rawHtml, rawText);
            _combinedParsedItems = items;

            const previewArea = document.getElementById('cgmParsedPreviewWrapper');
            const countBadge = document.getElementById('combinedParsedCountBadge');

            if (items.length === 0) {
                if (previewArea) previewArea.style.display = 'none';
                return;
            }

            if (previewArea) previewArea.style.display = 'block';
            if (countBadge) countBadge.innerText = items.length + ' mục';

            renderCombinedPreviewList();

            if (showScroll && previewArea) {
                previewArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        };

        window.toggleCombinedItemExpand = function (idx) {
            const body = document.getElementById('cgm_body_' + idx);
            const arrow = document.getElementById('cgm_arrow_' + idx);
            const card = document.getElementById('cgm_item_card_' + idx);
            if (!body) return;
            const isHidden = body.style.display === 'none';
            body.style.display = isHidden ? 'block' : 'none';
            if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
            if (card) {
                card.style.borderColor = isHidden ? '#0284c7' : '#e2e8f0';
                card.style.boxShadow = isHidden ? '0 4px 16px rgba(2,132,199,0.1)' : '0 2px 8px rgba(0,0,0,0.03)';
            }
        };

        window.expandAllCombinedItems = function () {
            _combinedParsedItems.forEach((_, idx) => {
                const body = document.getElementById('cgm_body_' + idx);
                const arrow = document.getElementById('cgm_arrow_' + idx);
                const card = document.getElementById('cgm_item_card_' + idx);
                if (body) body.style.display = 'block';
                if (arrow) arrow.textContent = '▲';
                if (card) {
                    card.style.borderColor = '#0284c7';
                    card.style.boxShadow = '0 4px 16px rgba(2,132,199,0.1)';
                }
            });
        };

        window.collapseAllCombinedItems = function () {
            _combinedParsedItems.forEach((_, idx) => {
                const body = document.getElementById('cgm_body_' + idx);
                const arrow = document.getElementById('cgm_arrow_' + idx);
                const card = document.getElementById('cgm_item_card_' + idx);
                if (body) body.style.display = 'none';
                if (arrow) arrow.textContent = '▼';
                if (card) {
                    card.style.borderColor = '#e2e8f0';
                    card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                }
            });
        };

        window.mergeCombinedWithAbove = function (idx) {
            if (idx <= 0 || idx >= _combinedParsedItems.length) return;
            _combinedParsedItems.forEach((it, i) => {
                const inp = document.getElementById('combined_title_' + i);
                if (inp && inp.value.trim()) it.title = inp.value.trim();
                const contentEl = document.getElementById('combined_content_' + i);
                if (contentEl && contentEl.innerHTML.trim()) it.contentHtml = contentEl.innerHTML;
            });
            const prevItem = _combinedParsedItems[idx - 1];
            const curItem = _combinedParsedItems[idx];
            prevItem.contentHtml = prevItem.contentHtml + '<div style="margin-top:12px;padding-top:8px;border-top:1px dashed #cbd5e1;">' + curItem.contentHtml + '</div>';
            _combinedParsedItems.splice(idx, 1);
            _combinedParsedItems.forEach((it, i) => it.index = i + 1);
            renderCombinedPreviewList();
            toggleCombinedItemExpand(idx - 1);
        };

        window.removeCombinedItem = function (idx) {
            _combinedParsedItems.forEach((it, i) => {
                const inp = document.getElementById('combined_title_' + i);
                if (inp && inp.value.trim()) it.title = inp.value.trim();
                const contentEl = document.getElementById('combined_content_' + i);
                if (contentEl && contentEl.innerHTML.trim()) it.contentHtml = contentEl.innerHTML;
            });
            _combinedParsedItems.splice(idx, 1);
            _combinedParsedItems.forEach((it, i) => it.index = i + 1);
            renderCombinedPreviewList();
        };

        function renderCombinedPreviewList() {
            const countBadge = document.getElementById('combinedParsedCountBadge');
            const listEl = document.getElementById('combinedParsedList');
            const previewArea = document.getElementById('cgmParsedPreviewWrapper');
            if (_combinedParsedItems.length === 0) {
                if (previewArea) previewArea.style.display = 'none';
                return;
            }
            if (countBadge) countBadge.innerText = _combinedParsedItems.length + ' mục';
            let html = '';
            _combinedParsedItems.forEach((it, idx) => {
                const titleStr = (it.title || `Ngữ pháp ${idx + 1}`).trim();
                html += `
                    <div class="cgm-item-card" id="cgm_item_card_${idx}" style="background:#ffffff;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.03);transition:all 0.2s ease;">
                        <!-- HEADER DÒNG TIÊU ĐỀ: BẤM ĐỂ MỞ RỘNG / THU GỌN -->
                        <div class="cgm-item-header" onclick="toggleCombinedItemExpand(${idx})" 
                             style="padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;background:#ffffff;user-select:none;transition:background 0.15s ease;"
                             onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#ffffff'">
                            <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                                <span style="background:linear-gradient(135deg, #0284c7, #0369a1);color:#ffffff;font-size:0.75em;font-weight:800;padding:3px 9px;border-radius:6px;white-space:nowrap;flex-shrink:0;">
                                    MỤC ${idx + 1}
                                </span>
                                <span id="cgm_title_display_${idx}" style="font-weight:700;font-size:0.95em;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                    ${escapeHtml(titleStr)}
                                </span>
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;" onclick="event.stopPropagation()">
                                ${idx > 0 ? `
                                    <button type="button" onclick="mergeCombinedWithAbove(${idx})" 
                                            style="background:#f0f9ff;border:1px solid #bae6fd;color:#0284c7;padding:4px 9px;border-radius:6px;cursor:pointer;font-size:0.8em;font-weight:700;display:inline-flex;align-items:center;gap:4px;" 
                                            title="Gộp nội dung mục này vào mục ${idx} phía trên">
                                        🔗 Gộp lên mục ${idx}
                                    </button>
                                ` : ''}
                                <button type="button" onclick="removeCombinedItem(${idx})" 
                                        style="background:#fef2f2;border:1px solid #fecaca;color:#ef4444;padding:4px 9px;border-radius:6px;cursor:pointer;font-size:0.8em;font-weight:700;" 
                                        title="Xóa mục này">
                                    ✕ Xóa
                                </button>
                                <span id="cgm_arrow_${idx}" style="font-size:0.85em;color:#64748b;font-weight:700;width:24px;text-align:center;transition:transform 0.2s ease;cursor:pointer;" onclick="toggleCombinedItemExpand(${idx})">
                                    ▼
                                </span>
                            </div>
                        </div>

                        <!-- KHUNG NỘI DUNG MỞ RỘNG (MẶC ĐỊNH THU GỌN, BẤM VÀO TIÊU ĐỀ ĐỂ MỞ RỘNG) -->
                        <div id="cgm_body_${idx}" style="display:none;padding:16px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;">
                            <div style="margin-bottom:12px;">
                                <label style="display:block;font-size:0.78em;font-weight:800;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.4px;">
                                    🏷️ Tiêu đề / Cấu trúc ngữ pháp:
                                </label>
                                <input type="text" id="combined_title_${idx}" value="${(it.title || '').replace(/"/g, '&quot;')}" 
                                       oninput="document.getElementById('cgm_title_display_${idx}').textContent = this.value.trim() || 'Ngữ pháp ${idx + 1}'"
                                       style="width:100%;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:0.95em;color:#0f172a;background:#ffffff;box-sizing:border-box;outline:none;" 
                                       placeholder="Nhập tiêu đề ngữ pháp...">
                            </div>

                            <div>
                                <label style="display:block;font-size:0.78em;font-weight:800;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.4px;">
                                    📝 Nội dung ngữ pháp & ví dụ:
                                </label>
                                <div id="combined_content_${idx}" class="gfm-editor-content" contenteditable="true"
                                     style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:8px;padding:14px 18px;min-height:120px;max-height:450px;overflow-y:auto;box-shadow:inset 0 1px 3px rgba(0,0,0,0.03);">
                                    ${it.contentHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            if (listEl) listEl.innerHTML = html;
        }

        window.saveCombinedGrammarAction = async function () {
            const box = document.getElementById('combinedGrammarBox');
            if (!box) return;
            const rawHtml = box.innerHTML;
            const rawText = box.innerText;
            if (!rawText.trim() && !rawHtml.trim()) {
                Swal.fire("Lưu ý", "Nội dung bài học đang trống!", "warning");
                return;
            }

            // Tự động phân tích nếu chưa phân tích
            if (_combinedParsedItems.length === 0) {
                _combinedParsedItems = parsePastedGrammar(rawHtml, rawText);
            }

            // Đồng bộ tiêu đề và nội dung từ input nếu có
            _combinedParsedItems.forEach((it, idx) => {
                const inp = document.getElementById(`combined_title_${idx}`);
                if (inp && inp.value.trim()) it.title = inp.value.trim();
                const contentEl = document.getElementById(`combined_content_${idx}`);
                if (contentEl && contentEl.innerHTML.trim()) it.contentHtml = contentEl.innerHTML;
            });

            if (_combinedParsedItems.length === 0) {
                Swal.fire("Lưu ý", "Không tìm thấy nội dung ngữ pháp để lưu!", "warning");
                return;
            }

            const confirmRes = await Swal.fire({
                title: 'Cập nhật lại bài học?',
                html: `Hệ thống sẽ cập nhật lại <b>${_combinedParsedItems.length} mục ngữ pháp</b> của bài học "<b>${escapeHtml(lessonName)}</b>" theo bản tổng hợp này.<br><small style="color:#64748b;">Các tài liệu ngữ pháp cũ của bài này sẽ được thay thế.</small>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Đồng ý cập nhật',
                confirmButtonColor: '#0284c7',
                cancelButtonText: 'Xem lại'
            });

            if (!confirmRes.isConfirmed) return;

            const saveBtn = document.getElementById('saveCombinedGrammarBtn');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Đang lưu vào Firestore...'; }

            try {
                const grammarCol = db.collection("shared_folders").doc(folderId).collection("grammar");

                // 1. Lấy và xóa các doc cũ của bài này
                const oldSnap = await grammarCol.where("listName", "==", lessonName).get();
                const batch = db.batch();
                oldSnap.forEach(doc => {
                    batch.delete(doc.ref);
                });

                // 2. Thêm các doc mới
                _combinedParsedItems.forEach((it, i) => {
                    const docId = 'g_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 6);
                    batch.set(grammarCol.doc(docId), {
                        listName: lessonName,
                        index: i + 1,
                        title: it.title,
                        contentHtml: it.contentHtml,
                        order: i,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });

                // 3. Lưu lại bản raw tổng hợp để lần sau mở ra đúng y nguyên
                const rawDocRef = grammarCol.doc('raw_' + safeLessonName);
                batch.set(rawDocRef, {
                    listName: '__raw__',
                    lessonName: lessonName,
                    contentHtml: rawHtml,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await batch.commit();

                const modal = document.getElementById(modalId);
                if (modal) modal.remove();

                switchLessonSubTab('grammar');

                Swal.fire({
                    icon: 'success',
                    title: '🎉 Đã cập nhật thành công!',
                    text: `Đã cập nhật ${_combinedParsedItems.length} mục ngữ pháp cho bài học "${lessonName}"!`
                });
            } catch (err) {
                console.error("Lỗi cập nhật combined grammar:", err);
                if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Lưu & Cập nhật bài học'; }
                Swal.fire("Lỗi", err.message || "Không thể cập nhật ngữ pháp!", "error");
            }
        };

        // Tự động phân tích sẵn khi vừa mở modal
        setTimeout(() => {
            triggerCombinedParse();
        }, 150);
    };

    // Helper: Copy Siêu Prompt Gemini tạo ngữ pháp tiếng Hàn chuẩn JSON
    window.copyGeminiGrammarPrompt = function () {
        const promptTemplate = `Bạn là chuyên gia sư phạm tiếng Hàn và giảng viên biên soạn giáo trình TOPIK. Bạn đang soạn tài liệu học ngữ pháp chuyên sâu cho học viên Việt Nam tự học trên web, do đó nội dung giải thích phải thật CẶN KẼ, TẬN TÂM, CHI TIẾT TỪNG NGÓC NGÁCH, tránh viết sơ sài 1-2 câu.

Hãy biên soạn bài giảng chi tiết và bài tập kiểm tra cho danh sách cấu trúc ngữ pháp sau:
[Điền danh sách ngữ pháp vào đây, ví dụ:
1. -(으)ㅂ시다
2. 께서
3. -아/어서]

=== NGUYÊN TẮC ĐỊNH DẠNG JSON NGHIÊM NGẶT ===
1. Xuất ra DUY NHẤT một mảng JSON (JSON Array [...]) hợp lệ.
2. TUYỆT ĐỐI KHÔNG dùng thẻ HTML (không dùng <div>, <span>, <h3>, <table>...).
3. TUYỆT ĐỐI KHÔNG dùng ký tự escape \\' (dấu nháy đơn ' trong chuỗi JSON giữ nguyên dạng ', KHÔNG ĐƯỢC viết là \\').
4. Trong các trường văn bản dài ("meaning", "notes"), dùng ký hiệu \\n để xuống dòng giữa các gạch đầu dòng.
5. Mỗi gạch đầu dòng BẮT BUỘC có cấu trúc: - Tiêu đề ngắn: Nội dung giải thích chi tiết (phần trước dấu : sẽ được hệ thống tự động in đậm làm tiêu đề).
6. KHÔNG viết lời chào, lời dẫn hay giải thích ngoài mảng JSON — chỉ xuất duy nhất mảng JSON bắt đầu bằng [ và kết thúc bằng ].

=== CẤU TRÚC MỖI PHẦN TỬ TRONG MẢNG ===
[
  {
    "korean": "Tên cấu trúc (ví dụ: -(으)ㅂ시다)",
    "vietnamese": "Ý nghĩa ngắn gọn tiếng Việt (dưới 8 từ, ví dụ: Chúng ta hãy cùng...)",
    "level": 1, // Số nguyên từ 1 đến 6 (1: Sơ cấp 1, 2: Sơ cấp 2, 3: Trung cấp 3, 4: Trung cấp 4, 5: Cao cấp 5, 6: Cao cấp 6)

    "meaning": "- Khái niệm & Vị trí: Đứng sau từ loại nào, vị trí trong câu, tương đương với nghĩa nào trong tiếng Việt.\\n- Ngữ cảnh & Mục đích giao tiếp 1: Phân tích trường hợp dùng phổ biến nhất trong đời sống/giao tiếp.\\n- Ngữ cảnh & Mục đích giao tiếp 2: Tình huống giao tiếp mở rộng, mức độ trang trọng, lịch sự.\\n- Sắc thái biểu đạt: Tâm lý người nói, sự đồng lòng, tôn kính hay cảm xúc cấu trúc mang lại.",

    "rules": [
      {
        "condition": "Động từ CÓ patchim (trừ ㄹ)",
        "combine": "Gốc từ + 읍시다",
        "example": "먹다 -> 먹읍시다; 읽다 -> 읽읍시다"
      },
      {
        "condition": "Động từ KHÔNG có patchim",
        "combine": "Gốc từ + ㅂ시다",
        "example": "가다 -> 갑시다; 하다 -> 합시다"
      },
      {
        "condition": "Động từ CÓ patchim ㄹ (Bất quy tắc)",
        "combine": "Bỏ ㄹ + ㅂ시다",
        "example": "만들다 -> 만듭시다; 놀다 -> 놉시다"
      }
    ],

    "examples": [
      { "kr": "오늘 저녁에 같이 한국 음식을 먹읍시다.", "vi": "Tối nay chúng ta hãy cùng ăn món Hàn nhé." },
      { "kr": "시간이 없으니까 빨리 갑시다.", "vi": "Vì không có thời gian nên chúng ta hãy đi nhanh lên." },
      { "kr": "이번 주말에 산에 등산하러 갑시다.", "vi": "Cuối tuần này chúng ta cùng đi leo núi nhé." },
      { "kr": "우리 같이 한국어를 열심히 공부합시다.", "vi": "Chúng ta hãy cùng nhau học tiếng Hàn chăm chỉ nhé." }
    ],

    "notes": "- So sánh & Phân biệt: So sánh chi tiết với ngữ pháp dễ nhầm lẫn.\\n- Giới hạn ngữ pháp (Cấm kỵ): KHÔNG DÙNG trong trường hợp nào.\\n- Lỗi sai kinh điển của người Việt: Học viên Việt Nam hay mắc lỗi gì (kèm ví dụ sai ❌ và cách sửa đúng ⭕).\\n- Mẹo ghi nhớ: Cách liên tưởng hoặc quy tắc vàng giúp nhớ lâu.",

    "quiz": [
      {
        "type": "mc",
        "question": "Câu 1: Chia động từ '듣다' (Nghe) với đuôi rủ rê -(으)ㅂ시다:",
        "options": ["듣읍시다", "들읍시다", "듣ㅂ시다", "들ㅂ시다"],
        "answer": 2,
        "explain": "듣다 có patchim ㄷ bất quy tắc -> 들 + 읍시다 = 들읍시다."
      },
      {
        "type": "fill",
        "question": "Câu 2: Điền dạng đúng của 팔다 (bán) vào chỗ trống: 우리 이 자동차를 ___.",
        "answer": "팝시다",
        "explain": "팔다 kết thúc bằng ㄹ -> bỏ ㄹ rồi cộng ㅂ시다 = 팝시다."
      },
      {
        "type": "tf",
        "question": "Câu 3: '할아버지, 같이 영화를 봅시다' — Câu này đúng hay sai ngữ pháp?",
        "answer": "f",
        "explain": "Sai vì -(으)ㅂ시다 không dùng với người lớn tuổi/cấp trên."
      },
      {
        "type": "match",
        "question": "Câu 4: Nối động từ với cách chia -(으)ㅂ시다:",
        "pairs": [
          { "left": "쉬다 (Nghỉ ngơi)", "right": "쉽시다" },
          { "left": "걷다 (Đi bộ)", "right": "걸읍시다" },
          { "left": "살다 (Sống)", "right": "삽시다" },
          { "left": "찍다 (Chụp)", "right": "찍읍시다" }
        ],
        "explain": "쉬다 + ㅂ시다; 걷다 (bqt ㄷ->ㄹ) + 읍시다; 살다 (bỏ ㄹ) + ㅂ시다; 찍다 + 읍시다."
      }
    ]
  }
]`;

        copyText(promptTemplate, 'Đã sao chép Siêu Prompt Gemini 2.0 vào bộ nhớ đệm! Hãy dán vào Gemini, điền danh sách ngữ pháp và yêu cầu tạo.');
    };

    // Modal Dán và Tự động tách Ngữ pháp theo số 1, 2, 3, 4, 5... (Giữ nguyên font chữ, in đậm)
    window.openGrammarImportModal = function () {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedLesson) return;

        const modalId = '_grammarImportModal';
        const old = document.getElementById(modalId);
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = modalId;

        const folderTitle = window.currentSharedFolderTitle || 'Thư mục giảng dạy';
        const lessonName = window.currentSharedLesson || 'Bài học';

        overlay.innerHTML = `
            <div class="gfm-container" id="gimContainer">
                <!-- TOP HEADER -->
                <div class="gfm-header">
                    <div class="gfm-title-area">
                        <span class="gfm-badge" style="background:linear-gradient(135deg, #6366f1, #4f46e5);">⚡ NHẬP NHANH</span>
                        <span style="font-weight:700;font-size:0.9em;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHtml(folderTitle)} / <b style="color:#6366f1;">${escapeHtml(lessonName)}</b>
                        </span>
                    </div>

                    <!-- WINDOW ACTIONS -->
                    <div style="display:flex;align-items:center;gap:4px;">
                        <button type="button" class="gfm-tool-btn" id="gimToggleFullscreenBtn" title="Phóng to / Thu nhỏ" style="font-size:1.05em;padding:3px 6px;">⛶</button>
                        <button type="button" class="gfm-tool-btn" onclick="document.getElementById('${modalId}').remove()" title="Đóng cửa sổ" style="font-size:1.25em;color:#ef4444;padding:3px 6px;">&times;</button>
                    </div>
                </div>

                <!-- WORKSPACE -->
                <div class="gfm-workspace" id="gimWorkspace">
                    <div class="gfm-editor-col">
                        <!-- TOOLBAR -->
                        <div class="gfm-toolbar" id="gimToolbar">
                            <!-- FONT FAMILY -->
                            <div class="gfm-tool-group" title="Chọn Font chữ">
                                <select id="gimFontFamily" class="gfm-select">
                                    <option value="'Pretendard', sans-serif">Pretendard (Chuẩn)</option>
                                    <option value="'Nanum Gothic', sans-serif">Nanum Gothic (나눔고딕)</option>
                                    <option value="'Nanum Myeongjo', serif">Nanum Myeongjo (나눔명조)</option>
                                    <option value="Inter, sans-serif">Inter</option>
                                    <option value="Roboto, sans-serif">Roboto</option>
                                    <option value="Arial, sans-serif">Arial</option>
                                    <option value="'Times New Roman', serif">Times New Roman</option>
                                    <option value="'Courier New', monospace">Courier New</option>
                                </select>
                            </div>

                            <!-- FONT SIZE -->
                            <div class="gfm-tool-group" title="Kích thước chữ">
                                <select id="gimFontSize" class="gfm-select">
                                    <option value="14px">14px - Nhỏ</option>
                                    <option value="16px">16px - Vừa</option>
                                    <option value="18px" selected>18px - Chuẩn</option>
                                    <option value="20px">20px - Lớn</option>
                                    <option value="24px">24px - Tiêu đề 3</option>
                                    <option value="28px">28px - Tiêu đề 2</option>
                                </select>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- TEXT COLOR -->
                            <div class="gfm-tool-group" title="Màu chữ">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Chữ:</span>
                                <input type="color" id="gimTextColorPicker" value="#0f172a" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu chữ">
                                <button type="button" class="gfm-tool-btn" data-color="#dc2626" style="color:#dc2626;padding:2px 4px;font-size:0.82em;">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#0284c7" style="color:#0284c7;padding:2px 4px;font-size:0.82em;">A</button>
                                <button type="button" class="gfm-tool-btn" data-color="#16a34a" style="color:#16a34a;padding:2px 4px;font-size:0.82em;">A</button>
                            </div>

                            <!-- HIGHLIGHT COLOR -->
                            <div class="gfm-tool-group" title="Màu nền / Highlight">
                                <span style="font-size:0.82em;font-weight:700;color:#64748b;padding-left:4px;">Nền:</span>
                                <input type="color" id="gimBgColorPicker" value="#fef08a" style="width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;" title="Bảng màu nền">
                                <button type="button" class="gfm-tool-btn" data-bg="#fef08a" style="background:#fef08a;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Vàng nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bae6fd" style="background:#bae6fd;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="#bbf7d0" style="background:#bbf7d0;width:18px;height:18px;min-width:18px;border-radius:4px;padding:0;" title="Xanh lá nhạt"></button>
                                <button type="button" class="gfm-tool-btn" data-bg="transparent" style="font-size:0.75em;color:#64748b;padding:2px 4px;" title="Xóa nền">✕</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- NÚT CHÈN Ô VÍ DỤ NGANG (NGANG HÀNG VỚI FONT, SIZE, MÀU SẮC) -->
                            <button type="button" class="gfm-tool-btn" id="gimInsertExampleBtn"
                                    title="Bấm: Chèn ô ví dụ ngang | Ấn giữ: Chọn màu sắc ô"
                                    style="background:#f0fdf4;border:1.5px solid #10b981;color:#15803d;padding:3px 9px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:5px;border-radius:6px;cursor:pointer;">
                                <span>💡 Ô ví dụ</span>
                                <span class="gfm-color-dot-indicator" style="width:9px;height:9px;border-radius:50%;background:#10b981;border:1px solid #fff;box-shadow:0 0 0 1px #10b981;"></span>
                                <span style="font-size:0.7em;opacity:0.7;">▾</span>
                            </button>

                            <span class="gfm-tool-sep"></span>

                            <!-- BASIC STYLES -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="bold" title="In đậm (Ctrl+B)"><b>B</b></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="italic" title="In nghiêng (Ctrl+I)"><i>I</i></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="underline" title="Gạch chân (Ctrl+U)"><u>U</u></button>
                                <button type="button" class="gfm-tool-btn" data-cmd="strikeThrough" title="Gạch ngang"><s>S</s></button>
                            </div>

                            <!-- ALIGNMENTS -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyLeft" title="Căn trái">⇤</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyCenter" title="Căn giữa">≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="justifyRight" title="Căn phải">⇥</button>
                            </div>

                            <!-- LISTS -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertUnorderedList" title="Danh sách chấm tròn">•≡</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="insertOrderedList" title="Danh sách số 1,2,3">1≡</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- UTILITIES -->
                            <div class="gfm-tool-group">
                                <button type="button" class="gfm-tool-btn" data-cmd="insertHorizontalRule" title="Đường kẻ ngang">―</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="removeFormat" title="Xóa định dạng" style="color:#ef4444;">Tx</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="undo" title="Hoàn tác (Ctrl+Z)">↶</button>
                                <button type="button" class="gfm-tool-btn" data-cmd="redo" title="Làm lại (Ctrl+Y)">↷</button>
                            </div>

                            <span class="gfm-tool-sep"></span>

                            <!-- BỘ GÕ TELEX TÍCH HỢP -->
                            <button type="button" class="gfm-tool-btn gfm-telex-toggle-btn" onclick="window.toggleWebTelex()"
                                    title="Bộ gõ Telex tích hợp: Khi bật, bạn có thể để EVKey ở chữ E, chỉ cần bấm Alt để đổi giữa gõ tiếng Hàn (가) và tiếng Việt (A)!"
                                    style="background:#eff6ff;border:1.5px solid #3b82f6;color:#1d4ed8;padding:3px 8px;font-size:0.82em;font-weight:700;display:inline-flex;align-items:center;gap:4px;border-radius:6px;cursor:pointer;">
                                <span class="telex-status-icon">🇻🇳</span>
                                <span class="telex-status-text">Telex: BẬT</span>
                            </button>
                        </div>

                        <!-- MAIN CONTENT EDITABLE (CENTERED PAPER CANVAS) -->
                        <div class="gfm-editor-scroll-wrap">
                            <div style="max-width:880px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:16px;">
                                <div id="grammarPasteBox" class="gfm-editor-content" contenteditable="true"
                                     placeholder="Dán JSON từ Gemini hoặc nội dung văn bản (Ctrl + V)... Tự động nhận diện JSON nhiều mục hoặc số 1, 2, 3... để tách. Bấm nút '🤖 Copy Prompt Gemini' ở dưới để lấy mẫu prompt chuẩn."></div>

                                <!-- Preview Area -->
                                <div id="grammarParsedPreviewArea" style="display:none;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #f1f5f9;">
                                        <h4 style="margin:0;font-size:1.02em;color:#1e293b;font-weight:700;">
                                            ✨ Kết quả phân tách tự động (<span id="parsedGrammarCountBadge" style="color:#4f46e5;">0 mục</span>):
                                        </h4>
                                        <span style="font-size:0.82em;color:#64748b;">Bạn có thể chỉnh sửa tiêu đề nếu muốn trước khi lưu</span>
                                    </div>
                                    <div id="grammarParsedList" style="display:flex;flex-direction:column;gap:10px;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- FOOTER ACTIONS -->
                <div class="gfm-footer">
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button onclick="triggerGrammarParse()" style="background:#eff6ff;color:#4f46e5;border:1px solid #c7d2fe;padding:7px 16px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.88em;">
                            🔍 Phân tích lại
                        </button>
                        <button type="button" onclick="window.copyGeminiGrammarPrompt()" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;padding:7px 16px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.88em;display:inline-flex;align-items:center;gap:6px;" title="Sao chép mẫu Prompt Gemini chuẩn sư phạm vào bộ nhớ đệm">
                            🤖 Copy Prompt Gemini
                        </button>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button onclick="document.getElementById('${modalId}').remove()" style="background:#f1f5f9;color:#64748b;border:none;padding:7px 16px;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.88em;">
                            Hủy
                        </button>
                        <button id="saveAllGrammarBtn" onclick="saveAllParsedGrammar()" disabled style="background:#4f46e5;color:#ffffff;border:none;padding:7px 22px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.88em;opacity:0.6;box-shadow:0 3px 10px rgba(79,70,229,0.3);">
                            💾 Lưu tất cả vào Bài học
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (typeof updateAllTelexUI === 'function') updateAllTelexUI();

        let gimIsFullscreen = true;
        const gimContainer = document.getElementById('gimContainer');
        document.getElementById('gimToggleFullscreenBtn').addEventListener('click', () => {
            gimIsFullscreen = !gimIsFullscreen;
            if (gimIsFullscreen) {
                gimContainer.classList.remove('is-windowed');
            } else {
                gimContainer.classList.add('is-windowed');
            }
        });

        // Setup Ô ví dụ tool for import modal
        const pasteBox = document.getElementById('grammarPasteBox');
        let gimSavedRange = null;
        function gimSaveSelection() {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && pasteBox.contains(sel.anchorNode)) {
                gimSavedRange = sel.getRangeAt(0).cloneRange();
            }
        }
        pasteBox.addEventListener('keyup', gimSaveSelection);
        pasteBox.addEventListener('mouseup', gimSaveSelection);
        pasteBox.addEventListener('blur', gimSaveSelection);

        function gimRestoreSelection() {
            pasteBox.focus();
            if (gimSavedRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(gimSavedRange);
            }
        }

        setupHorizontalExampleTool({
            btn: document.getElementById('gimInsertExampleBtn'),
            getEditor: () => pasteBox,
            getSavedRange: () => gimSavedRange,
            defaultBadge: '💡 Ví dụ minh họa'
        });

        // Toolbar formatting for import modal
        overlay.querySelectorAll('#gimToolbar button[data-cmd]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                gimRestoreSelection();
                document.execCommand(btn.dataset.cmd, false, null);
                gimSaveSelection();
            });
        });

        const gimFontSelect = document.getElementById('gimFontFamily');
        gimFontSelect.addEventListener('change', () => {
            gimRestoreSelection();
            document.execCommand('fontName', false, gimFontSelect.value);
            gimSaveSelection();
        });

        const gimFontSizeSelect = document.getElementById('gimFontSize');
        gimFontSizeSelect.addEventListener('change', () => {
            gimRestoreSelection();
            const sizeVal = gimFontSizeSelect.value;
            document.execCommand('fontSize', false, '7');
            pasteBox.querySelectorAll('font[size="7"]').forEach(f => {
                f.removeAttribute('size');
                f.style.fontSize = sizeVal;
            });
            gimSaveSelection();
        });

        const gimTextColorPicker = document.getElementById('gimTextColorPicker');
        gimTextColorPicker.addEventListener('input', () => {
            gimRestoreSelection();
            document.execCommand('foreColor', false, gimTextColorPicker.value);
            gimSaveSelection();
        });
        overlay.querySelectorAll('#gimToolbar button[data-color]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                gimRestoreSelection();
                document.execCommand('foreColor', false, btn.dataset.color);
                gimTextColorPicker.value = btn.dataset.color;
                gimSaveSelection();
            });
        });

        const gimBgColorPicker = document.getElementById('gimBgColorPicker');
        gimBgColorPicker.addEventListener('input', () => {
            gimRestoreSelection();
            try {
                document.execCommand('hiliteColor', false, gimBgColorPicker.value);
            } catch (e) {
                document.execCommand('backColor', false, gimBgColorPicker.value);
            }
            gimSaveSelection();
        });
        overlay.querySelectorAll('#gimToolbar button[data-bg]').forEach(btn => {
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                gimRestoreSelection();
                const bg = btn.dataset.bg;
                if (bg === 'transparent') {
                    document.execCommand('removeFormat', false, null);
                } else {
                    try {
                        document.execCommand('hiliteColor', false, bg);
                    } catch (e) {
                        document.execCommand('backColor', false, bg);
                    }
                    gimBgColorPicker.value = bg;
                }
                gimSaveSelection();
            });
        });

        let _lastParsedItems = [];

        // Tự động phân tích ngay khi dán
        pasteBox.addEventListener('paste', () => {
            setTimeout(() => triggerGrammarParse(), 100);
        });

        window.triggerGrammarParse = function () {
            const box = document.getElementById('grammarPasteBox');
            if (!box) return;
            const rawHtml = box.innerHTML;
            const rawText = box.innerText;

            if (!rawText.trim() && !rawHtml.trim()) return;

            const items = parsePastedGrammar(rawHtml, rawText);
            _lastParsedItems = items;

            const previewArea = document.getElementById('grammarParsedPreviewArea');
            const countBadge = document.getElementById('parsedGrammarCountBadge');
            const saveBtn = document.getElementById('saveAllGrammarBtn');

            if (items.length === 0) {
                if (previewArea) previewArea.style.display = 'none';
                if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.6'; }
                return;
            }

            if (previewArea) previewArea.style.display = 'block';
            if (countBadge) countBadge.innerText = items.length + ' mục';
            if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; }

            renderParsedListOnly();
        };

        window.mergeWithAbove = function (idx) {
            if (idx <= 0 || idx >= _lastParsedItems.length) return;
            // Lưu lại tiêu đề hiện thời đang gõ
            _lastParsedItems.forEach((it, i) => {
                const inp = document.getElementById('parsed_title_' + i);
                if (inp && inp.value.trim()) it.title = inp.value.trim();
            });

            const prevItem = _lastParsedItems[idx - 1];
            const curItem = _lastParsedItems[idx];

            // Nối nội dung HTML của mục hiện tại vào mục trên
            prevItem.contentHtml = prevItem.contentHtml + '<div style="margin-top:12px;padding-top:8px;border-top:1px dashed #cbd5e1;">' + curItem.contentHtml + '</div>';

            // Xóa mục hiện tại
            _lastParsedItems.splice(idx, 1);
            _lastParsedItems.forEach((it, i) => it.index = i + 1);
            renderParsedListOnly();
        };

        window.removeParsedItem = function (idx) {
            _lastParsedItems.splice(idx, 1);
            _lastParsedItems.forEach((it, i) => it.index = i + 1);
            renderParsedListOnly();
        };

        function renderParsedListOnly() {
            const previewArea = document.getElementById('grammarParsedPreviewArea');
            const countBadge = document.getElementById('parsedGrammarCountBadge');
            const listEl = document.getElementById('grammarParsedList');
            const saveBtn = document.getElementById('saveAllGrammarBtn');

            if (_lastParsedItems.length === 0) {
                if (previewArea) previewArea.style.display = 'none';
                if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.6'; }
                return;
            }

            if (countBadge) countBadge.innerText = _lastParsedItems.length + ' mục';
            let html = '';
            _lastParsedItems.forEach((it, idx) => {
                html += `
                    <div class="grammar-preview-card">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-weight:800;color:#4f46e5;font-size:0.85em;">MỤC ${idx + 1}</span>
                            <div style="display:flex;gap:6px;align-items:center;">
                                ${idx > 0 ? `<button onclick="mergeWithAbove(${idx})" style="background:#e0e7ff;border:1px solid #c7d2fe;color:#4338ca;padding:3px 8px;border-radius:6px;cursor:pointer;font-size:0.8em;font-weight:600;" title="Gộp nội dung mục này vào mục ${idx} phía trên">🔗 Gộp vào mục ${idx}</button>` : ''}
                                <button onclick="removeParsedItem(${idx})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.8em;">✕ Xóa</button>
                            </div>
                        </div>
                        <input type="text" id="parsed_title_${idx}" value="${(it.title || '').replace(/"/g, '&quot;')}" 
                               style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-weight:700;font-size:0.95em;margin-bottom:8px;box-sizing:border-box;">
                        <div class="grammar-content" style="max-height:140px;overflow-y:auto;background:rgba(248,250,252,0.8);border:1px solid #e2e8f0;padding:8px 10px;border-radius:6px;font-size:0.88em;line-height:1.5;">
                            ${formatGrammarContentForVocab(it)}
                        </div>
                    </div>
                `;
            });
            if (listEl) listEl.innerHTML = html;
        }

        window.saveAllParsedGrammar = async function () {
            if (_lastParsedItems.length === 0) return;

            // Cập nhật lại tiêu đề người dùng đã gõ trong input
            _lastParsedItems.forEach((it, idx) => {
                const inp = document.getElementById(`parsed_title_${idx}`);
                if (inp && inp.value.trim()) it.title = inp.value.trim();
            });

            const saveBtn = document.getElementById('saveAllGrammarBtn');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Đang lưu vào Firestore...'; }

            try {
                const db = firebase.firestore();
                const grammarCol = db.collection("shared_folders").doc(window.currentSharedFolderId).collection("grammar");
                const batch = db.batch();
                const maxOrder = window.currentSharedGrammar.length;

                // Lưu lại bản tổng hợp raw
                const safeLessonName = (window.currentSharedLesson || '').replace(/[\/\s\.'":#?&=+]/g, '_');
                const pasteBoxEl = document.getElementById('grammarPasteBox');
                if (safeLessonName && pasteBoxEl && pasteBoxEl.innerHTML.trim()) {
                    const rawDocRef = grammarCol.doc('raw_' + safeLessonName);
                    batch.set(rawDocRef, {
                        listName: '__raw__',
                        lessonName: window.currentSharedLesson,
                        contentHtml: pasteBoxEl.innerHTML,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                _lastParsedItems.forEach((it, i) => {
                    const docId = 'g_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 6);
                    batch.set(grammarCol.doc(docId), {
                        listName: window.currentSharedLesson,
                        index: maxOrder + i + 1,
                        title: it.title,
                        contentHtml: it.contentHtml,
                        order: maxOrder + i,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });

                await batch.commit();

                const modal = document.getElementById(modalId);
                if (modal) modal.remove();

                switchLessonSubTab('grammar');

                Swal.fire({
                    icon: 'success',
                    title: '🎉 Đã lưu ngữ pháp!',
                    text: `Đã lưu thành công ${_lastParsedItems.length} mục ngữ pháp vào bài học "${window.currentSharedLesson}"!`,
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (err) {
                Swal.fire("Lỗi lưu ngữ pháp", err.message, "error");
                if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Lưu tất cả vào Bài học'; }
            }
        };
    };

    // =========================================================================
    // THƯ VIỆN NGỮ PHÁP DÙNG CHUNG (Tích hợp tra cứu & chèn vào bài học)
    // =========================================================================
    window.openGrammarLibraryModal = async function () {
        if (!isTeacher() || !window.currentSharedFolderId || !window.currentSharedLesson) {
            Swal.fire("Thông báo", "Vui lòng chọn bài học trước khi mở Thư viện Ngữ pháp!", "warning");
            return;
        }

        // Tải thư viện nếu chưa có trong bộ nhớ
        if (!window.GrammarLibrary || !window.GrammarLibrary.length) {
            try {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = (window.location.pathname.includes('/grammar/') ? '../' : '') + 'assets/js/grammar-library.js?v=' + Date.now();
                    s.onload = resolve;
                    s.onerror = reject;
                    document.head.appendChild(s);
                });
            } catch (e) {
                console.warn("Không thể tải script grammar-library.js:", e);
            }
        }

        const libraryData = window.GrammarLibrary || [];
        const modalId = '_grammarLibraryModal';
        const oldModal = document.getElementById(modalId);
        if (oldModal) oldModal.remove();

        const overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);padding:14px;';

        const LEVEL_CONFIG = {
            1: { name: 'SC1', label: 'Sơ cấp 1', color: '#2563eb', bg: '#eff6ff' },
            2: { name: 'SC2', label: 'Sơ cấp 2', color: '#0891b2', bg: '#ecfeff' },
            3: { name: 'TC3', label: 'Trung cấp 3', color: '#ea580c', bg: '#fff7ed' },
            4: { name: 'TC4', label: 'Trung cấp 4', color: '#dc2626', bg: '#fef2f2' },
            5: { name: 'CC5', label: 'Cao cấp 5', color: '#7c3aed', bg: '#f5f3ff' },
            6: { name: 'CC6', label: 'Cao cấp 6', color: '#db2777', bg: '#fdf2f8' }
        };

        let activeLevel = 'all';
        let searchQuery = '';
        let searchScope = 'both';
        let multiSelectMode = false;
        let selectedIds = new Set();
        let lastFiltered = [];

        overlay.innerHTML = `
            <div style="background:#ffffff;border-radius:20px;max-width:960px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);overflow:hidden;animation:fadeIn 0.2s ease;">
                <!-- HEADER -->
                <div style="padding:16px 22px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg, #f8fafc, #edf2f7);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:1.6em;">🗂️</span>
                        <div>
                            <h3 style="margin:0;font-size:1.18em;color:#0f172a;font-weight:800;">Thư viện Ngữ pháp Dùng chung</h3>
                            <div style="font-size:0.82em;color:#64748b;margin-top:2px;">
                                Chèn ngữ pháp chuẩn vào bài học: <b style="color:#2563eb;">${escapeHtml(window.currentSharedLesson)}</b>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button type="button" id="libMultiSelectToggle" style="padding:6px 12px;border-radius:8px;font-size:0.8em;font-weight:700;color:#0891b2;background:#ecfeff;border:1px solid #a5f3fc;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Bật chế độ chọn nhiều ngữ pháp để chèn cùng lúc">
                            ☑️ Chọn nhiều
                        </button>
                        <a href="/grammar/admin.html" target="_blank" style="padding:6px 12px;border-radius:8px;font-size:0.8em;font-weight:700;color:#4f46e5;background:#eef2ff;border:1px solid #c7d2fe;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Mở trang Quản lý / Chỉnh sửa nội dung Thư viện">
                            ⚙️ Quản lý Thư viện
                        </a>
                        <button onclick="document.getElementById('${modalId}').remove()" style="background:none;border:none;font-size:1.5em;color:#94a3b8;cursor:pointer;line-height:1;padding:2px 6px;">&times;</button>
                    </div>
                </div>

                <!-- TOOLBAR (BỘ LỌC CẤP ĐỘ & TÌM KIẾM) -->
                <div style="padding:14px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;flex-direction:column;gap:10px;">
                    <!-- Thanh tìm kiếm -->
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <div style="position:relative;flex:1;min-width:240px;">
                            <input type="text" id="libSearchInput" placeholder="🔍 Gõ tiêu đề ngữ pháp hoặc từ khóa..." style="width:100%;padding:9px 12px 9px 34px;border:1px solid #cbd5e1;border-radius:10px;font-size:0.9em;outline:none;background:#fff;box-sizing:border-box;">
                            <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;">🔍</span>
                        </div>
                        <select id="libSearchScope" style="padding:9px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:0.85em;background:#fff;color:#334155;font-weight:600;outline:none;cursor:pointer;">
                            <option value="both">🔍 Cả hai (Tiêu đề + Nội dung)</option>
                            <option value="title">📌 Chỉ Tiêu đề tiếng Hàn/Việt</option>
                            <option value="content">📝 Chỉ Nội dung giải thích</option>
                        </select>
                    </div>

                    <!-- Pills cấp độ -->
                    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;" id="libLevelPills">
                        <button type="button" class="lib-pill active" data-level="all" style="padding:5px 12px;border-radius:20px;font-size:0.8em;font-weight:700;border:1px solid #cbd5e1;background:#0f172a;color:#fff;cursor:pointer;white-space:nowrap;">
                            📂 Tất cả (${libraryData.length})
                        </button>
                        ${[1, 2, 3, 4, 5, 6].map(lvl => {
                            const cfg = LEVEL_CONFIG[lvl];
                            const count = libraryData.filter(x => x.level === lvl).length;
                            return `
                                <button type="button" class="lib-pill" data-level="${lvl}" style="padding:5px 12px;border-radius:20px;font-size:0.8em;font-weight:700;border:1px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;white-space:nowrap;">
                                    <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${cfg.color};margin-right:5px;"></span>${cfg.name} (${count})
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- DANH SÁCH THẺ NGỮ PHÁP -->
                <div style="flex:1;overflow-y:auto;padding:18px 22px;background:#ffffff;">
                    <div id="libCardsGrid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:14px;"></div>
                </div>

                <!-- FOOTER -->
                <div style="padding:12px 22px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;font-size:0.85em;color:#64748b;gap:8px;">
                    <span id="libResultCount">Đang hiển thị ${libraryData.length} mục ngữ pháp</span>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button id="libSelectAllBtn" style="display:none;padding:7px 14px;border-radius:8px;border:1px solid #a5f3fc;background:#ecfeff;color:#0891b2;font-weight:700;cursor:pointer;font-size:0.85em;">
                            ✅ Chọn tất cả
                        </button>
                        <button id="libInsertAllBtn" style="display:none;padding:7px 18px;border-radius:8px;border:none;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;font-weight:700;cursor:pointer;font-size:0.85em;" disabled>
                            ⚡ Chèn 0 ngữ pháp đã chọn
                        </button>
                        <button onclick="document.getElementById('${modalId}').remove()" style="padding:7px 18px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-weight:700;cursor:pointer;">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (typeof updateAllTelexUI === 'function') updateAllTelexUI();

        // Render Cards logic
        function renderLibCards() {
            const grid = document.getElementById('libCardsGrid');
            const countEl = document.getElementById('libResultCount');
            if (!grid) return;

            let filtered = libraryData;

            // 1. Lọc theo Level
            if (activeLevel !== 'all') {
                const targetLvl = Number(activeLevel);
                filtered = filtered.filter(x => x.level === targetLvl);
            }

            // 2. Lọc theo Search Query & Scope
            const q = searchQuery.trim().toLowerCase();
            if (q) {
                filtered = filtered.filter(g => {
                    const inTitle = (g.korean || '').toLowerCase().includes(q) || (g.vietnamese || '').toLowerCase().includes(q);
                    const inContent = (g.content || '').toLowerCase().includes(q);
                    if (searchScope === 'title') return inTitle;
                    if (searchScope === 'content') return inContent;
                    return inTitle || inContent;
                });
            }

            lastFiltered = filtered;
            if (countEl) {
                if (multiSelectMode && selectedIds.size > 0) {
                    countEl.textContent = `Đã chọn ${selectedIds.size} / ${filtered.length} ngữ pháp`;
                } else {
                    countEl.textContent = `Đang hiển thị ${filtered.length} mục ngữ pháp`;
                }
            }

            if (filtered.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:#94a3b8;">
                        <div style="font-size:2.5em;margin-bottom:8px;">🔍</div>
                        <div style="font-weight:700;font-size:1.05em;color:#475569;">Không tìm thấy ngữ pháp phù hợp</div>
                        <div style="font-size:0.88em;margin-top:4px;">Thử đổi từ khóa hoặc chọn cấp độ khác nhé!</div>
                    </div>
                `;
                return;
            }

            grid.innerHTML = filtered.map((g, idx) => {
                const cfg = LEVEL_CONFIG[g.level] || { name: 'TOP', label: '', color: '#4f46e5', bg: '#eef2ff' };
                const hasContent = !!(g.content && g.content.trim());
                const cleanPreview = hasContent
                    ? g.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 85) + '...'
                    : 'Chưa có nội dung soạn sẵn (bấm để soạn và chèn)';
                const isSelected = selectedIds.has(g.id);
                const cardBorder = multiSelectMode
                    ? (isSelected ? '2px solid #0891b2' : '2px solid #e2e8f0')
                    : '1px solid #e2e8f0';
                const cardBg = multiSelectMode && isSelected ? '#ecfeff' : '#fff';

                return `
                    <div class="lib-card" data-lib-id="${encodeURIComponent(g.id)}" style="border:${cardBorder};border-radius:14px;padding:14px;background:${cardBg};display:flex;flex-direction:column;justify-content:space-between;gap:10px;box-shadow:0 2px 6px rgba(0,0,0,0.03);transition:all 0.15s ease;position:relative;cursor:${multiSelectMode ? 'pointer' : 'default'};user-select:${multiSelectMode ? 'none' : 'auto'};"
                         onmouseover="this.style.borderColor='${multiSelectMode ? (isSelected ? '#0891b2' : '#93c5fd') : '#93c5fd'}';this.style.transform='translateY(-2px)'"
                         onmouseout="this.style.borderColor='${cardBorder.replace(/'/g, '')}';this.style.transform='translateY(0)'">
                        ${multiSelectMode ? `
                        <div style="position:absolute;top:10px;right:10px;width:24px;height:24px;border-radius:6px;border:2px solid ${isSelected ? '#0891b2' : '#cbd5e1'};background:${isSelected ? '#0891b2' : '#fff'};display:flex;align-items:center;justify-content:center;font-size:0.9em;font-weight:bold;color:#fff;transition:all 0.15s;box-shadow:${isSelected ? '0 2px 6px rgba(8,145,178,0.3)' : 'none'};">
                            ${isSelected ? '✓' : ''}
                        </div>` : ''}
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-right:${multiSelectMode ? '30px' : '0'};">
                                <span style="font-size:0.72em;font-weight:800;padding:2px 8px;border-radius:6px;background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}33;">
                                    ${cfg.name} · ${cfg.label}
                                </span>
                                ${hasContent ? '<span style="font-size:0.75em;color:#10b981;font-weight:600;">✓ Có bài giảng</span>' : '<span style="font-size:0.75em;color:#94a3b8;">Tiêu đề</span>'}
                            </div>
                            <div style="font-size:1.15em;font-weight:800;color:#1e293b;line-height:1.3;margin-bottom:4px;">
                                ${escapeHtml(g.korean)}
                            </div>
                            <div style="font-size:0.85em;color:#64748b;font-weight:600;line-height:1.4;margin-bottom:8px;">
                                ${escapeHtml(g.vietnamese || '')}
                            </div>
                            <div style="font-size:0.8em;color:#94a3b8;line-height:1.5;background:#f8fafc;padding:6px 8px;border-radius:6px;border:1px dashed #e2e8f0;">
                                ${escapeHtml(cleanPreview)}
                            </div>
                        </div>

                        <div style="display:${multiSelectMode ? 'none' : 'flex'};gap:6px;margin-top:4px;">
                            <button type="button" onclick="window.previewGrammarFromLibraryById('${encodeURIComponent(g.id)}')" style="flex:1;padding:7px 10px;border-radius:8px;font-size:0.8em;font-weight:700;color:#fff;background:linear-gradient(135deg, #4f46e5, #4338ca);border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;" title="Mở popup xem trước nội dung, tùy chọn chỉnh sửa hoặc chèn vào bài học">
                                👁️ Xem & Chèn
                            </button>
                            <button type="button" onclick="window.quickInsertGrammarFromLibraryById('${encodeURIComponent(g.id)}')" style="padding:7px 10px;border-radius:8px;font-size:0.8em;font-weight:700;color:#059669;background:#ecfdf5;border:1px solid #a7f3d0;cursor:pointer;" title="Lưu nhanh trực tiếp vào bài học">
                                ⚡ Lưu ngay
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            updateMultiSelectUI();
        }

        function updateMultiSelectUI() {
            const insertBtn = document.getElementById('libInsertAllBtn');
            const selectAllBtn = document.getElementById('libSelectAllBtn');
            const toggleBtn = document.getElementById('libMultiSelectToggle');
            const countEl = document.getElementById('libResultCount');

            if (toggleBtn) {
                if (multiSelectMode) {
                    toggleBtn.innerHTML = '✕ Thoát chọn nhiều';
                    toggleBtn.style.background = '#fef2f2';
                    toggleBtn.style.color = '#ef4444';
                    toggleBtn.style.borderColor = '#fecaca';
                } else {
                    toggleBtn.innerHTML = '☑️ Chọn nhiều';
                    toggleBtn.style.background = '#ecfeff';
                    toggleBtn.style.color = '#0891b2';
                    toggleBtn.style.borderColor = '#a5f3fc';
                }
            }

            if (selectAllBtn) {
                selectAllBtn.style.display = multiSelectMode ? 'inline-flex' : 'none';
                const allSelected = lastFiltered.length > 0 && lastFiltered.every(g => selectedIds.has(g.id));
                selectAllBtn.textContent = allSelected ? '✖ Bỏ chọn tất cả' : '✅ Chọn tất cả';
            }

            if (insertBtn) {
                insertBtn.style.display = multiSelectMode ? 'inline-flex' : 'none';
                insertBtn.disabled = selectedIds.size === 0;
                insertBtn.style.opacity = selectedIds.size === 0 ? '0.6' : '1';
                insertBtn.style.cursor = selectedIds.size === 0 ? 'not-allowed' : 'pointer';
                insertBtn.textContent = `⚡ Chèn ${selectedIds.size} ngữ pháp đã chọn`;
            }

            if (countEl) {
                if (multiSelectMode && selectedIds.size > 0) {
                    countEl.textContent = `Đã chọn ${selectedIds.size} / ${lastFiltered.length} ngữ pháp`;
                } else {
                    countEl.textContent = `Đang hiển thị ${lastFiltered.length} mục ngữ pháp`;
                }
            }
        }

        // Grid click delegation for multi-select
        const cardsGrid = document.getElementById('libCardsGrid');
        if (cardsGrid) {
            cardsGrid.addEventListener('click', (e) => {
                if (!multiSelectMode) return;
                const card = e.target.closest('.lib-card');
                if (!card) return;
                const id = decodeURIComponent(card.dataset.libId || '');
                if (!id) return;
                if (selectedIds.has(id)) {
                    selectedIds.delete(id);
                } else {
                    selectedIds.add(id);
                }
                renderLibCards();
            });
        }

        // Toggle multi-select mode
        const toggleBtn = document.getElementById('libMultiSelectToggle');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                multiSelectMode = !multiSelectMode;
                if (!multiSelectMode) {
                    selectedIds.clear();
                }
                renderLibCards();
            };
        }

        // Select all / Deselect all
        const selectAllBtn = document.getElementById('libSelectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.onclick = () => {
                const allSelected = lastFiltered.length > 0 && lastFiltered.every(g => selectedIds.has(g.id));
                if (allSelected) {
                    lastFiltered.forEach(g => selectedIds.delete(g.id));
                } else {
                    lastFiltered.forEach(g => selectedIds.add(g.id));
                }
                renderLibCards();
            };
        }

        // Insert all selected grammar
        const insertAllBtn = document.getElementById('libInsertAllBtn');
        if (insertAllBtn) {
            insertAllBtn.onclick = async () => {
                if (selectedIds.size === 0) return;
                const toInsert = libraryData.filter(g => selectedIds.has(g.id));
                if (!toInsert.length) return;

                const result = await Swal.fire({
                    title: `Chèn ${toInsert.length} ngữ pháp?`,
                    html: `Bạn có chắc muốn chèn <b>${toInsert.length}</b> ngữ pháp đã chọn vào bài học <b style="color:#2563eb;">${escapeHtml(window.currentSharedLesson)}</b> không?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#0891b2',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: `Đồng ý chèn (${toInsert.length})`,
                    cancelButtonText: 'Hủy'
                });

                if (!result.isConfirmed) return;

                Swal.fire({
                    title: 'Đang lưu vào bài học...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    const db = firebase.firestore();
                    const folderId = window.currentSharedFolderId;
                    const lesson = window.currentSharedLesson;
                    const currentCount = window.currentSharedGrammar ? window.currentSharedGrammar.length : 0;

                    // Chia nhỏ batch nếu > 400
                    const batches = [];
                    let currentBatch = db.batch();
                    let opCount = 0;

                    toInsert.forEach((g, idx) => {
                        const defaultTitle = g.korean + (g.vietnamese ? ' - ' + g.vietnamese : '');
                        const defaultContent = (g.content && g.content.trim())
                            ? g.content
                            : `<p><b>Cấu trúc:</b> ${g.korean}</p><p><b>Ý nghĩa:</b> ${g.vietnamese || ''}</p><div class="h-example-box" style="margin:12px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #4f46e5;border-radius:8px;border:1px solid #e2e8f0;"><div style="font-weight:700;color:#4f46e5;font-size:0.85em;margin-bottom:6px;">💡 Ví dụ:</div><div style="line-height:1.6;">Nhập ví dụ cho học viên ở đây...</div></div>`;

                        const docRef = db.collection("shared_folders").doc(folderId).collection("grammar").doc();
                        currentBatch.set(docRef, {
                            listName: lesson,
                            title: defaultTitle,
                            contentHtml: defaultContent,
                            order: currentCount + idx,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        opCount++;
                        if (opCount === 400) {
                            batches.push(currentBatch);
                            currentBatch = db.batch();
                            opCount = 0;
                        }
                    });

                    if (opCount > 0) {
                        batches.push(currentBatch);
                    }

                    for (const b of batches) {
                        await b.commit();
                    }

                    const libModal = document.getElementById(modalId);
                    if (libModal) libModal.remove();

                    await Swal.fire({
                        icon: 'success',
                        title: '🎉 Đã chèn thành công!',
                        text: `Đã thêm ${toInsert.length} ngữ pháp vào bài học "${lesson}"!`,
                        timer: 1800,
                        showConfirmButton: false
                    });

                    if (typeof switchLessonSubTab === 'function') {
                        switchLessonSubTab('grammar');
                    }
                } catch (err) {
                    console.error("Lỗi khi chèn nhiều ngữ pháp:", err);
                    Swal.fire("Lỗi lưu ngữ pháp", err.message, "error");
                }
            };
        }

        // Đóng bằng phím Esc
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                const m = document.getElementById(modalId);
                if (m) m.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Event listeners
        const searchInput = document.getElementById('libSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderLibCards();
            });
            setTimeout(() => searchInput.focus(), 100);
        }

        const scopeSelect = document.getElementById('libSearchScope');
        if (scopeSelect) {
            scopeSelect.addEventListener('change', (e) => {
                searchScope = e.target.value;
                renderLibCards();
            });
        }

        // Level pill click
        const pillContainer = document.getElementById('libLevelPills');
        if (pillContainer) {
            pillContainer.querySelectorAll('.lib-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    pillContainer.querySelectorAll('.lib-pill').forEach(b => {
                        b.style.background = '#fff';
                        b.style.color = '#475569';
                        b.style.borderColor = '#e2e8f0';
                    });
                    btn.style.background = '#0f172a';
                    btn.style.color = '#fff';
                    btn.style.borderColor = '#0f172a';
                    activeLevel = btn.dataset.level;
                    renderLibCards();
                });
            });
        }

        renderLibCards();
    };

    // Helper mở popup xem trước ngữ pháp từ thư viện theo ID
    window.previewGrammarFromLibraryById = function (encodedId) {
        const id = decodeURIComponent(encodedId || '');
        const g = (window.GrammarLibrary || []).find(x => x.id === id);
        if (g) window.previewGrammarFromLibrary(g);
    };

    // Helper chèn nhanh trực tiếp ngữ pháp từ thư viện theo ID
    window.quickInsertGrammarFromLibraryById = function (encodedId) {
        const id = decodeURIComponent(encodedId || '');
        const g = (window.GrammarLibrary || []).find(x => x.id === id);
        if (g) window.selectGrammarFromLibrary(g, false);
    };

    // Popup xem trước chi tiết ngữ pháp từ Thư viện (Popup riêng biệt, không mở thẳng editor)
    window.previewGrammarFromLibrary = function (g) {
        if (!g || !window.currentSharedFolderId || !window.currentSharedLesson) return;

        const modalId = '_grammarLibPreviewModal';
        const old = document.getElementById(modalId);
        if (old) old.remove();

        const LEVEL_CONFIG = {
            1: { name: 'SC1', label: 'Sơ cấp 1', color: '#2563eb', bg: '#eff6ff' },
            2: { name: 'SC2', label: 'Sơ cấp 2', color: '#0891b2', bg: '#ecfeff' },
            3: { name: 'TC3', label: 'Trung cấp 3', color: '#ea580c', bg: '#fff7ed' },
            4: { name: 'TC4', label: 'Trung cấp 4', color: '#dc2626', bg: '#fef2f2' },
            5: { name: 'CC5', label: 'Cao cấp 5', color: '#7c3aed', bg: '#f5f3ff' },
            6: { name: 'CC6', label: 'Cao cấp 6', color: '#db2777', bg: '#fdf2f8' }
        };
        const cfg = LEVEL_CONFIG[g.level] || { name: 'TOP', label: '', color: '#4f46e5', bg: '#eef2ff' };

        const defaultTitle = g.korean + (g.vietnamese ? ' - ' + g.vietnamese : '');
        const defaultContent = (g.content && g.content.trim())
            ? g.content
            : `<p><b>Cấu trúc:</b> ${g.korean}</p><p><b>Ý nghĩa:</b> ${g.vietnamese || ''}</p><div class="h-example-box" style="margin:12px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #4f46e5;border-radius:8px;border:1px solid #e2e8f0;"><div style="font-weight:700;color:#4f46e5;font-size:0.85em;margin-bottom:6px;">💡 Ví dụ:</div><div style="line-height:1.6;">Nhập ví dụ cho học viên ở đây...</div></div>`;

        const m = document.createElement('div');
        m.id = modalId;
        m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.78);z-index:100000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);padding:14px;box-sizing:border-box;';

        m.innerHTML = `
            <div style="background:#fff;border-radius:20px;max-width:900px;width:100%;height:90vh;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);overflow:hidden;border:1px solid rgba(255,255,255,0.2);animation:fadeIn 0.2s ease;">
                <!-- HEADER -->
                <div style="padding:16px 22px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#f8fafc,#edf2f7);flex-shrink:0;">
                    <div style="flex:1;min-width:0;padding-right:12px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <span style="font-size:0.75em;font-weight:800;padding:2px 8px;border-radius:6px;background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}33;">
                                ${cfg.name} · ${cfg.label}
                            </span>
                            <span style="font-size:0.8em;color:#64748b;">Xem trước thư viện</span>
                        </div>
                        <h3 style="margin:0;font-size:1.45em;color:#1e1b4b;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${escapeHtml(defaultTitle)}
                        </h3>
                    </div>
                    <button id="_closeLibPreviewBtn" style="background:none;border:none;font-size:1.8em;color:#94a3b8;cursor:pointer;padding:0 4px;line-height:1;transition:color 0.15s;" title="Quay lại Thư viện" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">&times;</button>
                </div>

                <!-- BODY NỘI DUNG NGỮ PHÁP -->
                <div style="padding:24px;overflow-y:auto;flex:1;color:#334155;background:#ffffff;" class="grammar-content" id="_libPreviewContentArea">
                    ${formatGrammarContentForVocab({ content: defaultContent })}
                </div>

                <!-- FOOTER HÀNH ĐỘNG -->
                <div style="padding:12px 22px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;flex-shrink:0;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:0.82em;color:#94a3b8;">Nhấn <kbd style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-family:inherit;font-weight:700;">Esc</kbd> để quay lại Thư viện</span>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button id="_btnLibPreviewBack" style="padding:8px 16px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-weight:700;font-size:0.88em;cursor:pointer;">
                            ✕ Quay lại
                        </button>
                        <button id="_btnLibPreviewEdit" style="padding:8px 18px;border-radius:10px;border:1px solid #c7d2fe;background:#eef2ff;color:#4f46e5;font-weight:700;font-size:0.88em;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Chỉnh sửa nội dung trước khi chèn vào bài học">
                            ✏️ Chỉnh sửa
                        </button>
                        <button id="_btnLibPreviewInsert" style="padding:8px 20px;border-radius:10px;border:none;background:linear-gradient(135deg, #2563eb, #1d4ed8);color:#fff;font-weight:700;font-size:0.88em;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 2px 6px rgba(37,99,235,0.25);">
                            ⚡ Chèn vào bài học
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(m);

        function closePreview() {
            window.removeEventListener('keydown', onKeyDown);
            if (m && m.parentNode) m.remove();
        }

        function onKeyDown(e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                e.stopPropagation();
                closePreview();
            }
        }
        window.addEventListener('keydown', onKeyDown);

        m.onclick = function (e) {
            if (e.target === m) closePreview();
        };

        const closeBtn = document.getElementById('_closeLibPreviewBtn');
        if (closeBtn) closeBtn.onclick = closePreview;

        const backBtn = document.getElementById('_btnLibPreviewBack');
        if (backBtn) backBtn.onclick = closePreview;

        // Chỉnh sửa: Đóng popup preview, mở Editor toàn màn hình với returnToLibrary = true
        const editBtn = document.getElementById('_btnLibPreviewEdit');
        if (editBtn) {
            editBtn.onclick = () => {
                closePreview();
                window.openGrammarEditorModal({
                    mode: 'add',
                    initialTitle: defaultTitle,
                    initialContent: defaultContent,
                    returnToLibrary: true
                });
            };
        }

        // Chèn vào bài học: Lưu trực tiếp vào Firestore, đóng preview, giữ nguyên thư viện!
        const insertBtn = document.getElementById('_btnLibPreviewInsert');
        if (insertBtn) {
            insertBtn.onclick = async () => {
                insertBtn.disabled = true;
                insertBtn.innerHTML = `<span>⏳ Đang chèn...</span>`;

                try {
                    const db = firebase.firestore();
                    const folderId = window.currentSharedFolderId;
                    const lesson = window.currentSharedLesson;
                    const maxOrder = window.currentSharedGrammar ? window.currentSharedGrammar.length : 0;

                    await db.collection("shared_folders").doc(folderId).collection("grammar").add({
                        listName: lesson,
                        title: defaultTitle,
                        contentHtml: defaultContent,
                        order: maxOrder,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    closePreview();

                    Swal.fire({
                        icon: 'success',
                        title: '🎉 Đã chèn vào bài học!',
                        text: `Ngữ pháp "${g.korean}" đã được thêm vào bài học "${lesson}"!`,
                        timer: 1600,
                        showConfirmButton: false
                    });

                    if (typeof switchLessonSubTab === 'function') {
                        switchLessonSubTab('grammar');
                    }
                } catch (err) {
                    console.error("Lỗi chèn ngữ pháp:", err);
                    Swal.fire("Lỗi lưu ngữ pháp", err.message, "error");
                    insertBtn.disabled = false;
                    insertBtn.innerHTML = `<span>⚡ Chèn vào bài học</span>`;
                }
            };
        }

        // Khởi tạo quiz nếu có bài tập trong nội dung
        setTimeout(() => {
            if (typeof initQuizInContainerVocab === 'function') {
                initQuizInContainerVocab(m);
            }
        }, 50);
    };

    // Hàm thực hiện chèn ngữ pháp được chọn từ Thư viện (Lưu ngay hoặc mở xem trước)
    window.selectGrammarFromLibrary = async function (g, openEditor) {
        if (!g || !window.currentSharedFolderId || !window.currentSharedLesson) return;

        // Nếu openEditor = true (hoặc gọi từ nơi khác), mở popup preview
        if (openEditor) {
            if (typeof window.previewGrammarFromLibrary === 'function') {
                window.previewGrammarFromLibrary(g);
            }
            return;
        }

        // Lưu ngay vào Firestore của bài học hiện tại mà KHÔNG đóng Thư viện ngữ pháp
        const defaultTitle = g.korean + (g.vietnamese ? ' - ' + g.vietnamese : '');
        const defaultContent = (g.content && g.content.trim())
            ? g.content
            : `<p><b>Cấu trúc:</b> ${g.korean}</p><p><b>Ý nghĩa:</b> ${g.vietnamese || ''}</p><div class="h-example-box" style="margin:12px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #4f46e5;border-radius:8px;border:1px solid #e2e8f0;"><div style="font-weight:700;color:#4f46e5;font-size:0.85em;margin-bottom:6px;">💡 Ví dụ:</div><div style="line-height:1.6;">Nhập ví dụ cho học viên ở đây...</div></div>`;

        try {
            Swal.fire({
                title: 'Đang lưu vào bài học...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const db = firebase.firestore();
            const folderId = window.currentSharedFolderId;
            const lesson = window.currentSharedLesson;
            const maxOrder = window.currentSharedGrammar ? window.currentSharedGrammar.length : 0;

            await db.collection("shared_folders").doc(folderId).collection("grammar").add({
                listName: lesson,
                title: defaultTitle,
                contentHtml: defaultContent,
                order: maxOrder,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Swal.fire({
                icon: 'success',
                title: '🎉 Đã chèn vào bài học!',
                text: `Ngữ pháp "${g.korean}" đã được thêm vào bài học "${lesson}"!`,
                timer: 1600,
                showConfirmButton: false
            });

            if (typeof switchLessonSubTab === 'function') {
                switchLessonSubTab('grammar');
            }
        } catch (err) {
            console.error("Lỗi chèn ngữ pháp:", err);
            Swal.fire("Lỗi lưu ngữ pháp", err.message, "error");
        }
    };

    // =========================================================================
    // THEO DÕI TIẾN ĐỘ HỌC VIÊN (Dành cho Admin - Cập nhật số 2)
    // =========================================================================
    window.openStudentsProgressModal = async function (folderId, folderName, filterLessonName) {
        if (!isTeacher()) return;

        folderId = folderId || window.currentSharedFolderId;
        if (!folderId) return;

        Swal.fire({
            title: 'Đang tải dữ liệu học viên...',
            didOpen: () => Swal.showLoading()
        });

        try {
            const db = firebase.firestore();

            // 1. Lấy danh sách học viên
            const studentsSnap = await db.collection("shared_folders").doc(folderId).collection("students").get();

            // 2. Lấy danh sách từ vựng
            let wordsQuery = db.collection("shared_folders").doc(folderId).collection("words");
            if (filterLessonName) {
                wordsQuery = wordsQuery.where("listName", "==", filterLessonName);
            }
            const wordsSnap = await wordsQuery.get();
            const allWords = [];
            wordsSnap.forEach(d => {
                const data = d.data();
                data.id = d.id;
                allWords.push(data);
            });

            if (studentsSnap.empty) {
                const folder = (_teacherFolders.concat(_studentFolders)).find(f => f.id === folderId);
                const keyCode = (folder && folder.keyCode) || '';
                Swal.fire({
                    title: 'Chưa có học viên',
                    html: `
                        Chưa có học viên nào mở khóa thư mục này.<br><br>
                        Hãy gửi mã Key Code <b style="color:#f59e0b;font-size:1.2em;">${keyCode}</b> cho học viên của bạn để các em tham gia!
                    `,
                    icon: 'info',
                    confirmButtonColor: '#2563eb'
                });
                return;
            }

            // 3. Đọc chi tiết tiến độ từng học viên
            const studentsList = [];
            for (const doc of studentsSnap.docs) {
                const stData = doc.data();
                stData.uid = doc.id;

                const progSnap = await db.collection("shared_folders").doc(folderId)
                    .collection("students").doc(doc.id).collection("progress").get();

                const wordStatusMap = {};
                progSnap.forEach(pd => {
                    wordStatusMap[pd.id] = pd.data().status;
                });
                stData.wordStatusMap = wordStatusMap;

                let counts = [0, 0, 0, 0];
                allWords.forEach(w => {
                    const s = (typeof wordStatusMap[w.id] !== 'undefined') ? wordStatusMap[w.id] : 0;
                    counts[s] = (counts[s] || 0) + 1;
                });
                stData.counts = counts;
                stData.totalWords = allWords.length;
                stData.masteryPercent = allWords.length > 0 ? Math.round((counts[3] / allWords.length) * 100) : 0;

                studentsList.push(stData);
            }

            studentsList.sort((a, b) => b.masteryPercent - a.masteryPercent);

            const modalId = '_studentsProgressModal';
            const old = document.getElementById(modalId);
            if (old) old.remove();

            const overlay = document.createElement('div');
            overlay.id = modalId;
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:15px;';

            const filterTitle = filterLessonName ? ` — Bài: "${filterLessonName}"` : '';

            let studentsHtml = '';
            studentsList.forEach((s, idx) => {
                const total = s.totalWords || 1;
                const p0 = (s.counts[0] / total) * 100;
                const p1 = (s.counts[1] / total) * 100;
                const p2 = (s.counts[2] / total) * 100;
                const p3 = (s.counts[3] / total) * 100;

                let lastActiveStr = 'Chưa hoạt động';
                if (s.lastActiveAt && s.lastActiveAt.toDate) {
                    const dt = s.lastActiveAt.toDate();
                    lastActiveStr = dt.toLocaleDateString('vi-VN') + ' ' + dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                }

                let wordsDetailHtml = allWords.map(w => {
                    const st = (typeof s.wordStatusMap[w.id] !== 'undefined') ? s.wordStatusMap[w.id] : 0;
                    const badges = [
                        '<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:10px;font-size:0.75em;font-weight:700;">⚪ Mới</span>',
                        '<span style="background:#fee2e2;color:#ef4444;padding:2px 8px;border-radius:10px;font-size:0.75em;font-weight:700;">🌸 Đang học</span>',
                        '<span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:10px;font-size:0.75em;font-weight:700;">🔵 Đang ôn</span>',
                        '<span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:0.75em;font-weight:700;">🟢 Thành thạo</span>'
                    ];
                    return `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:0.86em;">
                            <div>
                                <b>${w.word}</b> <span style="color:#64748b;font-size:0.9em;">(${w.meaning || ''})</span>
                            </div>
                            <div>${badges[st]}</div>
                        </div>
                    `;
                }).join('');

                const detailId = `st_words_detail_${idx}`;

                studentsHtml += `
                    <div class="student-prog-card">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, #3b82f6, #1d4ed8);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1em;">
                                    ${escapeHtml(String(s.displayName || 'H')[0].toUpperCase())}
                                </div>
                                <div>
                                    <!-- displayName/email do học viên tự ghi (students/{uid}) → bắt buộc escape -->
                                    <div style="font-weight:800;font-size:1.05em;color:#1e293b;">${escapeHtml(s.displayName || 'Học viên')}</div>
                                    <div style="font-size:0.82em;color:#64748b;">${escapeHtml(s.email || '')} • Học gần nhất: ${lastActiveStr}</div>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <span style="background:#dcfce7;color:#16a34a;font-weight:800;font-size:0.9em;padding:4px 10px;border-radius:12px;">
                                    🎯 ${s.masteryPercent}% Thành thạo
                                </span>
                            </div>
                        </div>

                        <div class="student-prog-bar" title="Thành thạo (Xanh) - Đang ôn (Lam) - Đang học (Hồng) - Mới (Xám)">
                            <div style="width:${p3}%;background:#10b981;"></div>
                            <div style="width:${p2}%;background:#3b82f6;"></div>
                            <div style="width:${p1}%;background:#f43f5e;"></div>
                            <div style="width:${p0}%;background:#cbd5e1;"></div>
                        </div>

                        <div style="display:flex;justify-content:space-between;font-size:0.82em;color:#475569;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
                            <span>🟢 Thuộc: <b>${s.counts[3]}</b></span>
                            <span>🔵 Đang ôn: <b>${s.counts[2]}</b></span>
                            <span>🌸 Đang học: <b>${s.counts[1]}</b></span>
                            <span>⚪ Chưa học: <b>${s.counts[0]}</b></span>
                            <span>Tổng: <b>${s.totalWords} từ</b></span>
                        </div>

                        <button onclick="toggleStudentWordsDetail('${detailId}')" style="background:#f8fafc;border:1px solid #cbd5e1;padding:5px 12px;border-radius:6px;font-size:0.8em;font-weight:600;color:#2563eb;cursor:pointer;">
                            🔍 Xem chi tiết tình trạng từng từ ▾
                        </button>
                        <div id="${detailId}" style="display:none;margin-top:10px;max-height:220px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;background:#ffffff;">
                            ${wordsDetailHtml || '<div style="color:#94a3b8;padding:10px;text-align:center;">Chưa có từ vựng</div>'}
                        </div>
                    </div>
                `;
            });

            overlay.innerHTML = `
                <div style="background:#ffffff;border-radius:18px;max-width:750px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,0.3);overflow:hidden;animation:fadeIn 0.25s ease;">
                    <div style="padding:18px 22px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg, #f8fafc, #edf2f7);">
                        <div>
                            <h3 style="margin:0;font-size:1.2em;color:#1e1b4b;font-weight:800;">
                                👥 Theo dõi Học viên & Tiến độ ghi nhớ
                            </h3>
                            <div style="font-size:0.85em;color:#64748b;margin-top:3px;">
                                ${folderName || 'Thư mục'}${filterTitle} • ${studentsList.length} học viên tham gia
                            </div>
                        </div>
                        <button onclick="document.getElementById('${modalId}').remove()" style="background:none;border:none;font-size:1.6em;color:#94a3b8;cursor:pointer;line-height:1;padding:0 5px;">&times;</button>
                    </div>
                    <div style="padding:20px 22px;overflow-y:auto;flex:1;">
                        ${studentsHtml}
                    </div>
                    <div style="padding:12px 22px;border-top:1px solid #e2e8f0;text-align:right;background:#f8fafc;">
                        <button onclick="document.getElementById('${modalId}').remove()" style="background:#2563eb;color:#ffffff;border:none;padding:8px 20px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.88em;">
                            Đóng
                        </button>
                    </div>
                </div>
            `;

            Swal.close();
            document.body.appendChild(overlay);
        if (typeof updateAllTelexUI === 'function') updateAllTelexUI();

            window.toggleStudentWordsDetail = function (id) {
                const el = document.getElementById(id);
                if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
            };

        } catch (err) {
            Swal.fire("Lỗi tải tiến độ học viên", err.message, "error");
        }
    };

    // Render thêm các Thư mục Shared vào Tab "Thư mục" của vocab.html
    window.renderSharedFoldersGrid = function () {
        const container = document.getElementById('listsGrid');
        if (!container) return;

        // Xóa block shared cũ nếu có
        const oldTeacherBlock = document.getElementById('_sharedTeacherBlock');
        const oldStudentBlock = document.getElementById('_sharedStudentBlock');
        if (oldTeacherBlock) oldTeacherBlock.remove();
        if (oldStudentBlock) oldStudentBlock.remove();

        // 1. Phía ADMIN (Thầy/Cô):
        if (isTeacher()) {
            const block = document.createElement('div');
            block.id = '_sharedTeacherBlock';
            block.style.width = '100%';
            block.style.gridColumn = '1 / -1';

            let itemsHtml = '';
            if (_teacherFolders.length === 0) {
                itemsHtml = `
                    <div style="padding:20px;text-align:center;color:#64748b;background:rgba(255,255,255,0.5);border-radius:12px;border:1px dashed #cbd5e1;">
                        Chưa có Thư mục 1:1 nào. Bấm nút <b>"+ Tạo Thư mục 1:1"</b> để cấp mã cho học viên!
                    </div>
                `;
            } else {
                itemsHtml = '<div class="list-grid" style="margin-top:0;">' + _teacherFolders.map(f => {
                    const safeName = f.name.replace(/'/g, "\\'");
                    const menuId = 'tfmenu-' + f.id;
                    const lessonCount = (f.lessons || []).length;
                    return `
                        <div class="list-card" style="cursor:pointer;border-left:4px solid #f59e0b;display:flex;align-items:center;" onclick="openSharedFolder('${f.id}')">
                            <button type="button" class="btn-folder-book-icon" title="Mở Sổ tay nháp bài học" onclick="event.stopPropagation(); window.openLessonNotesModal('${f.id}', '${safeName}');" style="background:#e0e7ff;border:1.5px solid #c7d2fe;color:#4338ca;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.25em;cursor:pointer;margin-right:12px;flex-shrink:0;">
                                📖
                            </button>
                            <div style="flex:1;min-width:0;">
                                <div class="list-title">🔑 ${f.name}</div>
                                <div class="list-count" style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:4px;">
                                    <span>${lessonCount} bài học</span> — 
                                    <span class="shared-badge-code" onclick="event.stopPropagation();copyKeyCode('${f.keyCode}')" title="Bấm để copy mã gửi học viên">Mã: ${f.keyCode} 📋</span>
                                    <button class="btn-edit" onclick="event.stopPropagation();openStudentsProgressModal('${f.id}', '${safeName}')" style="padding:2px 8px;font-size:0.75em;background:#eff6ff;color:#2563eb;border-color:#bfdbfe;border-radius:6px;cursor:pointer;">👥 Tiến độ</button>
                                </div>
                            </div>
                            <div class="folder-actions" onclick="event.stopPropagation()">
                                <button class="folder-dots-btn" onclick="toggleCardMenu('${menuId}', this, event)">⋮</button>
                                <div id="${menuId}" class="folder-menu">
                                    <div class="folder-menu-item" onclick="openStudentsProgressModal('${f.id}', '${safeName}', event)">👥 Tiến độ học viên</div>
                                    <div class="folder-menu-item" onclick="duplicateTeacherSharedFolder('${f.id}', '${safeName}', event)">📋 Tạo bản sao (Clone)</div>
                                    <div class="folder-menu-item" onclick="renameTeacherSharedFolder('${f.id}', '${safeName}', event)">Đổi tên</div>
                                    <div class="folder-menu-item" onclick="changeTeacherSharedFolderCode('${f.id}', '${f.keyCode}', event)">Đổi mã Key Code</div>
                                    <div class="folder-menu-item danger" onclick="deleteTeacherSharedFolder('${f.id}', '${safeName}', event)">Xóa thư mục</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') + '</div>';
            }

            block.innerHTML = `
                <div class="shared-section-header">
                    <h3 class="shared-section-title">🎓 Thư mục Giảng dạy 1:1 (${_teacherFolders.length})</h3>
                    <button class="btn-create-list" onclick="createTeacherSharedFolder()" style="background:#f59e0b;border:none;padding:8px 16px;font-size:0.85em;">+ Tạo Thư mục 1:1</button>
                </div>
                ${itemsHtml}
                <div class="shared-section-header" style="margin-top:30px;">
                    <h3 style="margin:0;font-size:1.15em;font-weight:700;color:var(--text-main);">📁 Thư mục cá nhân của bạn</h3>
                </div>
            `;

            container.parentNode.insertBefore(block, container);
        }

        // 2. Phía HỌC VIÊN:
        if (!isTeacher() && _studentFolders.length > 0) {
            const block = document.createElement('div');
            block.id = '_sharedStudentBlock';
            block.style.width = '100%';
            block.style.gridColumn = '1 / -1';

            const itemsHtml = '<div class="list-grid" style="margin-top:0;">' + _studentFolders.map(f => {
                const safeName = f.name.replace(/'/g, "\\'");
                const menuId = 'sfmenu-' + f.id;
                const lessonCount = (f.lessons || []).length;
                return `
                    <div class="list-card" style="cursor:pointer;border-left:4px solid #10b981;display:flex;align-items:center;" onclick="openSharedFolder('${f.id}')">
                        <button type="button" class="btn-folder-book-icon" title="Mở Sổ tay nháp bài học" onclick="event.stopPropagation(); window.openLessonNotesModal('${f.id}', '${safeName}');" style="background:#e0e7ff;border:1.5px solid #c7d2fe;color:#4338ca;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.3em;cursor:pointer;margin-right:12px;flex-shrink:0;transition:all 0.2s;">
                            📖
                        </button>
                        <div style="flex:1;min-width:0;">
                            <div class="list-title">🔑 ${f.name}</div>
                            <div class="list-count">${lessonCount} bài học — <span class="shared-badge-teacher">Giáo viên chia sẻ</span></div>
                        </div>
                        <div class="folder-actions" onclick="event.stopPropagation()">
                            <button class="folder-dots-btn" onclick="toggleCardMenu('${menuId}', this, event)">⋮</button>
                            <div id="${menuId}" class="folder-menu">
                                <div class="folder-menu-item danger" onclick="leaveStudentSharedFolder('${f.id}', '${safeName}', event)">Rời khỏi thư mục</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') + '</div>';

            block.innerHTML = `
                <div class="shared-section-header">
                    <h3 class="shared-section-title">🎓 Thư mục Lớp học (${_studentFolders.length})</h3>
                    <button class="btn-create-list" onclick="openKeyCodeModal()" style="background:#f59e0b;border:none;padding:6px 14px;font-size:0.8em;">+ Nhập mã mới</button>
                </div>
                ${itemsHtml}
                <div class="shared-section-header" style="margin-top:30px;">
                    <h3 style="margin:0;font-size:1.15em;font-weight:700;color:var(--text-main);">📁 Thư mục cá nhân của bạn</h3>
                </div>
            `;

            container.parentNode.insertBefore(block, container);
        }
    };

    // =========================================================================
    // 6. KHỞI TẠO REALTIME SYNC KHI ĐĂNG NHẬP
    // =========================================================================
    function initRealtimeSync() {
        const auth = (window.auth) || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth());
        if (!auth) return;

        auth.onAuthStateChanged(user => {
            if (!user) {
                _teacherFolders = [];
                _studentFolders = [];
                if (_sharedFoldersUnsub) _sharedFoldersUnsub();
                if (_studentProgressUnsub) _studentProgressUnsub();
                return;
            }

            const db = firebase.firestore();

            // 1. Nếu là Admin Teacher
            if (isTeacher()) {
                _sharedFoldersUnsub = db.collection("shared_folders")
                    .where("ownerEmail", "==", TEACHER_EMAIL)
                    .onSnapshot(snap => {
                        const list = [];
                        snap.forEach(d => {
                            const data = d.data();
                            data.id = d.id;
                            list.push(data);
                        });
                        list.sort((a, b) => ((b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0) - ((a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0));
                        _teacherFolders = list;

                        if (typeof window.renderSharedFoldersGrid === 'function' && document.getElementById('listsGrid')) {
                            window.renderSharedFoldersGrid();
                        }
                    });
            } else {
                // 2. Nếu là Học viên: Lắng nghe danh sách unlockedSharedFolders
                _sharedFoldersUnsub = db.collection("users").doc(user.uid).onSnapshot(async userDoc => {
                    if (!userDoc.exists) return;
                    const unlocked = userDoc.data().unlockedSharedFolders || [];
                    if (unlocked.length === 0) {
                        _studentFolders = [];
                        if (typeof window.renderSharedFoldersGrid === 'function' && document.getElementById('listsGrid')) {
                            window.renderSharedFoldersGrid();
                        }
                        return;
                    }

                    // Tải dữ liệu các thư mục mà học viên đã mở khóa
                    const folderPromises = unlocked.map(fid => db.collection("shared_folders").doc(fid).get());
                    const folderDocs = await Promise.all(folderPromises);
                    const validFolders = [];
                    folderDocs.forEach(d => {
                        if (d.exists) {
                            const data = d.data();
                            data.id = d.id;
                            validFolders.push(data);
                        }
                    });
                    _studentFolders = validFolders;

                    if (typeof window.renderSharedFoldersGrid === 'function' && document.getElementById('listsGrid')) {
                        window.renderSharedFoldersGrid();
                    }
                });

                // Lắng nghe tiến độ học riêng của học viên
                _studentProgressUnsub = db.collection("users").doc(user.uid).collection("shared_progress")
                    .onSnapshot(snap => {
                        snap.forEach(d => {
                            const data = d.data();
                            if (data.wordId) {
                                window.studentProgressMap[data.wordId] = data.status || 0;
                            }
                        });
                        // Cập nhật lại UI nếu đang mở bài học chung
                        if (window.currentSharedLesson && window.currentSharedWords.length > 0) {
                            window.currentSharedWords.forEach(w => {
                                w.status = window.studentProgressMap[w.id] || 0;
                            });
                            if (typeof window.updateStatsUI === 'function') {
                                window.updateStatsUI(window.currentSharedWords, 'Thống kê ghi nhớ');
                            }
                            if (typeof window.renderVocabGridDetail === 'function') {
                                window.renderVocabGridDetail();
                            }
                        }
                    });
            }
        });
    }

    // Auto load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectFloatingKeyButton();
            initRealtimeSync();
        });
    } else {
        injectFloatingKeyButton();
        initRealtimeSync();
    }

})();
