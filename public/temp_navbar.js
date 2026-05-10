/* ==========================================================================
   NAVBAR.JS — Auto-inject Global Navbar & Sidebar vào trang đề thi
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    // Không inject vào mypage, index
    if (path.includes('mypage.html') || path.endsWith('index.html') || path === '/' || path.endsWith('.com/')) return;
    if (document.getElementById('globalNavbar')) return;

    let rootPath = '';
    let publicIndex = path.indexOf('/public/');
    if (publicIndex !== -1) {
        let subPath = path.substring(publicIndex + 8);
        const depth = subPath.split('/').length - 1;
        rootPath = depth > 0 ? '../'.repeat(depth) : '';
    } else {
        const parts = path.split('/');
        // Bỏ phần tử cuối (tên file), sau đó đếm số thư mục
        // Nếu chạy local server tại public folder thì path sẽ như /reading/topik_ii/type_1_2.html
        let depth = parts.filter(p => p !== "").length - 1;
        if(depth < 0) depth = 0;
        rootPath = depth > 0 ? '../'.repeat(depth) : '';
    }

    // Inject CSS cho navbar (chỉ dùng trên trang đề thi)
    const style = document.createElement('style');
    style.innerHTML = `
        /* Ẩn các khối cũ */
        .vocab-toggle-container, .icon-home, .post-explain-actions, .review-link { display: none !important; }

        .global-nav { position: sticky; top: 20px; z-index: 1000; background: rgba(255,255,255,0.4); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.6); border-radius: 20px; box-shadow: 0 8px 32px 0 rgba(31,38,135,0.07); font-family: 'Pretendard', 'Inter', sans-serif; max-width: 900px; margin: 20px auto 30px auto; }
        body.dark-mode .global-nav { background: rgba(15,23,42,0.6); border-color: #334155; }
        
        .nav-top-row { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; height: 55px; position: relative; }
        
        .nav-left { display: flex; align-items: center; gap: 12px; }
        .nav-icon-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 8px; transition: 0.2s; color: #0f172a; flex-shrink: 0; }
        .nav-icon-btn:hover { background: rgba(255,255,255,0.5); }
        body.dark-mode .nav-icon-btn { color: #f9fafb; }
        
        .nav-logo { font-size: 1.3em; font-weight: 800; color: #1f2937; text-decoration: none; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
        body.dark-mode .nav-logo { color: #f9fafb; }
        
        .nav-desktop-links { display: flex; gap: 30px; }
        .nav-link { text-decoration: none; color: #6b7280; font-weight: 700; font-size: 1.15em; transition: 0.2s; }
        .nav-link.active, .nav-link:hover { color: #2563eb; font-weight: 800; }
        body.dark-mode .nav-link { color: #9ca3af; }
        body.dark-mode .nav-link.active, body.dark-mode .nav-link:hover { color: #60a5fa; }
        
        .nav-right { display: flex; align-items: center; gap: 10px; }
        .vocab-slider-container input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: white; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: 0.3s; }
        .vocab-slider-container input[type=range]::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: white; cursor: pointer; border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: 0.3s; }
        @media (max-width: 768px) {
            .global-nav { margin: 20px 15px 25px 15px; border-radius: 16px; }
            .nav-top-row { height: 50px; padding: 0 15px; position: relative; display: flex; align-items: center; justify-content: space-between; }
            .nav-logo-wrapper { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); white-space: nowrap; z-index: 1; }
            .nav-left, .nav-right { position: relative; z-index: 2; }
            .nav-logo { font-size: 1.15em; margin: 0;}
            .nav-desktop-links { display: none; }
            .vocab-text { display: none !important; }
        }
        @media (max-width: 600px) {
            .global-nav { margin: 15px 15px 20px 15px; top: 15px; }
        }

        .side-drawer { position: fixed; top: 0; left: -300px; width: 280px; height: 100vh; background: #fff; box-shadow: 4px 0 15px rgba(0,0,0,0.1); z-index: 1001; transition: 0.3s ease; padding: 20px; box-sizing: border-box; }
        body.dark-mode .side-drawer { background: #0f172a; }
        .side-drawer.open { left: 0; }
        .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: none; opacity: 0; transition: 0.3s; }
        .drawer-overlay.show { display: block; opacity: 1; }
        .nav-link-side { display: block; text-decoration: none; color: #64748b; font-weight: 700; font-size: 1.05em; padding: 14px 12px; border-radius: 8px; margin-bottom: 4px; transition: 0.2s; }
        .nav-link-side:hover { background: #f1f5f9; color: #2563eb; }
    `;
    document.head.appendChild(style);

    const navHTML = `
        <nav class="global-nav" id="globalNavbar">
            <div class="nav-top-row">
                <div class="nav-left">
                    <button class="nav-icon-btn" onclick="toggleDrawer(true)" title="Mở menu" aria-label="Menu">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="nav-logo-wrapper">
                    <a href="${rootPath}index.html" class="nav-logo">📚 Vui Học Tiếng Hàn</a>
                </div>

                <div class="nav-desktop-links">
                    <a href="${rootPath}index.html" class="nav-link active">Đọc</a>
                    <a href="#" class="nav-link" onclick="alert('Đang cập nhật!'); return false;">Nghe</a>
                    <a href="#" class="nav-link" onclick="alert('Đang cập nhật!'); return false;">Viết</a>
                    <a href="#" class="nav-link" onclick="alert('Đang cập nhật!'); return false;">Ngữ pháp</a>
                </div>

                <div class="nav-right">
                    ${(path.includes('dict.html') || path.includes('forum.html') || path.includes('leaderboard.html')) ? `
                        <button class="nav-icon-btn" id="navAvatarBtn" onclick="window.location.href='${rootPath}mypage.html'" title="Tài khoản">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </button>
                    ` : `
                        <button id="globalVocabBtn" data-level="2" onclick="cycleVocabLevel()" style="background: #10b981; color: white; border: none; padding: 4px 0; border-radius: 10px; font-weight: 700; font-size: 0.8em; cursor: pointer; transition: all 0.2s; white-space: nowrap; height: 26px; width: 62px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex-shrink: 0;" title="Bật/Tắt tra từ vựng">Mức 2</button>
                    `}
                </div>
            </div>
        </nav>
        <div class="drawer-overlay" id="drawerOverlay" onclick="toggleDrawer(false)"></div>
        <div class="side-drawer" id="sideDrawer">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
                <h2 style="margin: 0; color: #2563eb; font-weight: 800; font-size: 1.3em;">MENU</h2>
                <button class="nav-icon-btn" onclick="toggleDrawer(false)" style="font-size: 1.8em; padding: 0; line-height:1;">&times;</button>
            </div>
            <div style="display: flex; flex-direction: column;">
                <a href="javascript:history.back()" class="nav-link-side">🔙 Quay lại trang trước</a>
                <a href="${rootPath}index.html" class="nav-link-side">🏠 Trang chủ</a>
                <a href="${rootPath}index.html" class="nav-link-side" style="color:#2563eb;background:#eff6ff;">📖 Luyện Đọc</a>
                <a href="#" class="nav-link-side" onclick="alert('Đang cập nhật!'); return false;">🎧 Luyện Nghe</a>
                <a href="#" class="nav-link-side" onclick="alert('Đang cập nhật!'); return false;">✍️ Luyện Viết</a>
                <a href="#" class="nav-link-side" onclick="alert('Đang cập nhật!'); return false;">📚 Ngữ Pháp</a>
                <a href="${rootPath}dict.html" class="nav-link-side">🔎 Tra Từ Điển</a>
                <a href="${rootPath}forum.html" class="nav-link-side">💬 Forum</a>
                <div style="height:1px;background:#f1f5f9;margin:10px 0;"></div>
                <a href="${rootPath}mypage.html" class="nav-link-side">👤 Trang Cá Nhân</a>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // Tự động kéo trình phát âm thanh nằm trọn bên trong navbar
    const nav = document.getElementById('globalNavbar');
    const player = document.getElementById('sticky-audio-player');
    if (nav && player) {
        nav.appendChild(player);
        player.classList.add('integrated-player');
    }

    // Tiêm các script từ vựng tự động (đảm bảo thứ tự dictionary -> autowrap)
    if (!document.querySelector('script[src*="vocab-external.js"]')) {
        let sc0 = document.createElement('script');
        sc0.src = `${rootPath}assets/js/vocab-external.js`;
        sc0.async = false;
        document.body.appendChild(sc0);
    }
    if (!document.querySelector('script[src*="vocab-dictionary.js"]')) {
        let sc1 = document.createElement('script');
        sc1.src = `${rootPath}assets/js/vocab-dictionary.js`;
        sc1.async = false;
        document.body.appendChild(sc1);
    }
    if (!document.querySelector('script[src*="vocab-autowrap.js"]')) {
        let sc2 = document.createElement('script');
        sc2.src = `${rootPath}assets/js/vocab-autowrap.js`;
        sc2.async = false;
        document.body.appendChild(sc2);
    }
});

// Điều khiển Sidebar
window.toggleDrawer = (isOpen) => {
    const d = document.getElementById('sideDrawer'), o = document.getElementById('drawerOverlay');
    if (isOpen) { d.classList.add('open'); o.classList.add('show'); }
    else { d.classList.remove('open'); o.classList.remove('show'); }
};
