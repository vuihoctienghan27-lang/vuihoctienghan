/* ==========================================================================
   NAVBAR.JS — Auto-inject Global Navbar & Side Drawer
   Gradient + Dark mode được quản lý bởi theme-picker.js
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('globalNavbar')) return;

    const path = window.location.pathname;
    let rootPath = '';
    let publicIndex = path.indexOf('/public/');
    if (publicIndex !== -1) {
        let subPath = path.substring(publicIndex + 8);
        const depth = subPath.split('/').length - 1;
        rootPath = depth > 0 ? '../'.repeat(depth) : '';
    } else {
        const parts = path.split('/');
        let depth = parts.filter(p => p !== '').length - 1;
        if (depth < 0) depth = 0;
        rootPath = depth > 0 ? '../'.repeat(depth) : '';
    }

    const isListening = path.includes('/listening/');
    const isReading   = path.includes('/reading/');
    const isWriting   = path.includes('/writing/');
    const isGrammar   = path.includes('/grammar/');

    // === CSS ===
    const style = document.createElement('style');
    style.innerHTML = `
        .vocab-toggle-container,.icon-home,.post-explain-actions,.review-link{display:none!important}
        .switch{position:relative;display:inline-block;width:40px;height:22px}
        .switch input{opacity:0;width:0;height:0}
        .slider{position:absolute;cursor:pointer;inset:0;background:#cbd5e1;transition:.4s;border-radius:22px}
        .slider:before{position:absolute;content:"";height:16px;width:16px;left:3px;bottom:3px;background:#fff;transition:.4s;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.2)}
        input:checked+.slider{background:#10b981}
        input:checked+.slider:before{transform:translateX(18px)}

        /* TOP MASK */
        .top-gradient-mask{
            position:fixed;top:0;left:0;right:0;height:38px;
            background:var(--random-bg-gradient,linear-gradient(135deg,#e0c3fc,#8ec5fc));
            background-attachment:fixed;z-index:998;pointer-events:none;
        }

        /* NAVBAR */
        .global-nav{
            position:sticky;top:14px;z-index:1000;
            background:rgba(255,255,255,.45);
            backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
            border:1px solid rgba(255,255,255,.7);
            border-radius:20px;
            box-shadow:0 4px 24px rgba(0,0,0,.08),0 1px 4px rgba(255,255,255,.6) inset;
            font-family:"Pretendard","Inter",-apple-system,sans-serif;
            width:100%;max-width:900px;margin:14px auto 24px;box-sizing:border-box;
        }
        body.dark-mode .global-nav{
            background:rgba(15,23,42,.65);
            border-color:rgba(255,255,255,.12);
            box-shadow:0 4px 24px rgba(0,0,0,.35);
        }
        /* NAVBAR LAYOUT — 4-item flex layout */
        .nav-top-row{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:55px;position:relative}
        .nav-left{display:flex;align-items:center;gap:12px;position:relative;z-index:2}
        .nav-logo{font-size:1.3em;font-weight:800;color:#1f2937;text-decoration:none;display:flex;align-items:center;gap:6px;white-space:nowrap;margin:0;}
        body.dark-mode .nav-logo{color:#f1f5f9}

        /* ICON BUTTON — Apple flat */
        .nav-icon-btn{
            background:rgba(255,255,255,.35);
            border:1px solid rgba(255,255,255,.55);
            backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
            cursor:pointer;display:flex;align-items:center;justify-content:center;
            padding:7px;border-radius:10px;transition:all .2s;color:#1f2937;
            flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.06);
        }
        .nav-icon-btn:hover{background:rgba(255,255,255,.65);transform:scale(1.05);box-shadow:0 2px 8px rgba(0,0,0,.1)}
        .nav-icon-btn:active{transform:scale(.97)}
        body.dark-mode .nav-icon-btn{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#f1f5f9}
        body.dark-mode .nav-icon-btn:hover{background:rgba(255,255,255,.15)}

        /* DESKTOP LINKS */
        .nav-desktop-links{display:flex;gap:30px;margin:0;}
        .nav-link{
            text-decoration:none;
            color:#6b7280;
            font-weight:700;
            font-size:1.15em;
            transition:0.2s;
            white-space:nowrap;
            padding:0;
            border-radius:0;
            background:none;
        }
        .nav-link.active, .nav-link:hover{
            color:#2563eb;
            font-weight:800;
            background:none;
        }
        body.dark-mode .nav-link{color:#9ca3af}
        body.dark-mode .nav-link.active, body.dark-mode .nav-link:hover{color:#60a5fa;background:none;font-weight:800;}

        /* SIDE DRAWER — Glassmorphism */
        .side-drawer{
            position:fixed;top:0;left:-310px;width:290px;height:100vh;
            background:rgba(255,255,255,.85);
            backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
            border-right:1px solid rgba(255,255,255,.7);
            box-shadow:6px 0 32px rgba(0,0,0,.12);
            z-index:1001;transition:left .3s cubic-bezier(.4,0,.2,1);
            box-sizing:border-box;overflow-y:auto;
        }
        body.dark-mode .side-drawer{
            background:rgba(10,15,30,.9);
            border-right-color:rgba(255,255,255,.1);
            box-shadow:6px 0 32px rgba(0,0,0,.5);
        }
        .side-drawer.open{left:0}

        .drawer-header{display:flex;align-items:center;justify-content:space-between;padding:20px 18px 14px;border-bottom:1px solid rgba(0,0,0,.06)}
        body.dark-mode .drawer-header{border-bottom-color:rgba(255,255,255,.08)}
        .drawer-logo{font-size:1.1em;font-weight:800;color:#1f2937;text-decoration:none;display:flex;align-items:center;gap:8px}
        body.dark-mode .drawer-logo{color:#f1f5f9}

        .drawer-close-btn{width:30px;height:30px;background:rgba(0,0,0,.06);border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#64748b;transition:all .2s}
        .drawer-close-btn:hover{background:rgba(0,0,0,.12);color:#1f2937}
        body.dark-mode .drawer-close-btn{background:rgba(255,255,255,.08);color:#94a3b8}
        body.dark-mode .drawer-close-btn:hover{background:rgba(255,255,255,.15);color:#f1f5f9}

        .drawer-section{font-size:.7em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;padding:14px 18px 6px}
        body.dark-mode .drawer-section{color:#475569}

        .nav-link-side{
            display:flex;align-items:center;gap:11px;text-decoration:none;
            color:#374151;font-weight:600;font-size:.93em;
            padding:9px 18px;transition:background .15s,color .15s;
            cursor:pointer;position:relative;border:none;background:none;width:100%;text-align:left;
        }
        .nav-link-side:hover{background:rgba(37,99,235,.07);color:#2563eb}
        .nav-link-side.active{background:rgba(37,99,235,.1);color:#2563eb}
        .nav-link-side.active::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:3px;background:#2563eb;border-radius:0 3px 3px 0}
        body.dark-mode .nav-link-side{color:#cbd5e1}
        body.dark-mode .nav-link-side:hover{background:rgba(96,165,250,.1);color:#60a5fa}
        body.dark-mode .nav-link-side.active{background:rgba(96,165,250,.12);color:#60a5fa}
        body.dark-mode .nav-link-side.active::before{background:#60a5fa}

        .drawer-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.95em;flex-shrink:0;background:rgba(0,0,0,.04);transition:background .15s}
        body.dark-mode .drawer-icon{background:rgba(255,255,255,.06)}
        .nav-link-side:hover .drawer-icon{background:rgba(37,99,235,.12)}
        body.dark-mode .nav-link-side:hover .drawer-icon{background:rgba(96,165,250,.12)}

        .drawer-divider{height:1px;background:rgba(0,0,0,.06);margin:6px 18px}
        body.dark-mode .drawer-divider{background:rgba(255,255,255,.06)}

        /* OVERLAY */
        .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:1000;display:none;opacity:0;transition:opacity .3s}
        .drawer-overlay.show{display:block;opacity:1}

        /* RESPONSIVE */
        @media(max-width:768px){
            .global-nav{margin-left:15px!important;margin-right:15px!important;width:auto!important;border-radius:16px;}
            .container,.wrapper{margin-left:10px!important;margin-right:10px!important;width:auto!important}
            .top-gradient-mask{height:28px}
            .nav-top-row{height:50px;padding:0 15px}
            .nav-logo-wrapper{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);white-space:nowrap;z-index:1;}
            .nav-desktop-links{display:none}
            .nav-logo{font-size:1.15em;margin:0;}
        }
        @media(max-width:600px){
            .global-nav{margin:15px 15px 20px 15px!important;border-radius:14px;top:15px;}
            .top-gradient-mask{height:22px}
        }
    `;
    document.head.appendChild(style);

    // Inject menu.js (chỉ toggleDrawer)
    if (!document.querySelector('script[src*="menu.js"]')) {
        const s = document.createElement('script');
        s.src = `${rootPath}assets/js/menu.js`; s.async = false;
        document.body.appendChild(s);
    }

    // HTML
    const navHTML = `
    <div class="top-gradient-mask" id="topGradientMask"></div>
    <nav class="global-nav" id="globalNavbar">
        <div class="nav-top-row">
            <div class="nav-left">
                <button class="nav-icon-btn" onclick="toggleDrawer(true)" title="Menu" aria-label="Menu">
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
                <a href="${rootPath}reading/home.html" class="nav-link ${isReading?'active':''}">Đọc</a>
                <a href="${rootPath}listening/home.html" class="nav-link ${isListening?'active':''}">Nghe</a>
                <a href="${rootPath}writing/home.html" class="nav-link ${isWriting?'active':''}">Viết</a>
                <a href="${rootPath}grammar/home.html" class="nav-link ${isGrammar?'active':''}">Ngữ pháp</a>
            </div>

            <div class="nav-right">
                ${path.includes('mypage.html') ? `
                    <button class="nav-icon-btn" onclick="window.location.href='${rootPath}index.html'" title="Trang chủ">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><path d="M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10"/></svg>
                    </button>
                ` : `
                    <button class="nav-icon-btn" id="navAvatarBtn" onclick="handleAvatarClick()" title="Tài khoản">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                    </button>
                `}
            </div>
        </div>
    </nav>
    <div class="drawer-overlay" id="drawerOverlay" onclick="toggleDrawer(false)"></div>
    <div class="side-drawer" id="sideDrawer">
        <div class="drawer-header">
            <a href="${rootPath}index.html" class="drawer-logo" onclick="toggleDrawer(false)">📚 Vui Học Tiếng Hàn</a>
            <button class="drawer-close-btn" onclick="toggleDrawer(false)" aria-label="Đóng">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <div class="drawer-section">Luyện tập</div>
        <a href="${rootPath}reading/home.html" class="nav-link-side ${isReading?'active':''}" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>
            <span>Luyện Đọc</span>
        </a>
        <a href="${rootPath}listening/home.html" class="nav-link-side ${isListening?'active':''}" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></span>
            <span>Luyện Nghe</span>
        </a>
        <a href="${rootPath}writing/home.html" class="nav-link-side ${isWriting?'active':''}" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
            <span>Luyện Viết</span>
        </a>
        <a href="${rootPath}grammar/home.html" class="nav-link-side ${isGrammar?'active':''}" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>
            <span>Ngữ Pháp</span>
        </a>
        <div class="drawer-divider"></div>
        <div class="drawer-section">Công cụ</div>
        <a href="${rootPath}dict.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <span>Tra Từ Điển</span>
        </a>
        <a href="${rootPath}forum.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            <span>Hỏi Đáp</span>
        </a>
        <div class="drawer-divider"></div>
        <div class="drawer-section">Cài đặt</div>
        <button class="nav-link-side" onclick="window.THEME && window.THEME.openPopup()">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
            <span>Đổi Giao Diện</span>
        </button>
        <a href="${rootPath}vocab.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>
            <span>Sổ Từ Vựng</span>
        </a>
    </div>`;

    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // Sync gradient mask
    const syncMask = () => {
        const mask = document.getElementById('topGradientMask');
        if (!mask) return;
        const g = getComputedStyle(document.documentElement).getPropertyValue('--random-bg-gradient').trim()
                  || 'linear-gradient(135deg,#e0c3fc,#8ec5fc)';
        mask.style.background = g;
        mask.style.backgroundAttachment = 'fixed';
    };
    setTimeout(syncMask, 50);

    // Avatar
    window.handleAvatarClick = () => {
        const modal = document.getElementById('authModal');
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            window.location.href = `${rootPath}mypage.html`;
        } else if (modal) { modal.style.display = 'flex'; }
        else { window.location.href = `${rootPath}index.html`; }
    };

    setTimeout(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                const btn = document.getElementById('navAvatarBtn');
                if (!btn) return;
                if (user) {
                    btn.style.cssText += 'color:#2563eb;background:rgba(37,99,235,.1);border-color:rgba(37,99,235,.2)';
                    btn.title = user.displayName || user.email;
                    btn.onclick = () => { window.location.href = `${rootPath}mypage.html`; };
                }
            });
        }
    }, 300);

    // Audio player
    const nav = document.getElementById('globalNavbar');
    const player = document.getElementById('sticky-audio-player');
    if (nav && player) { nav.appendChild(player); player.classList.add('integrated-player'); }

    // Vocab scripts
    ['vocab-external.js','vocab-dictionary.js','vocab-autowrap.js'].forEach(f => {
        if (!document.querySelector(`script[src*="${f}"]`)) {
            const s = document.createElement('script');
            s.src = `${rootPath}assets/js/${f}`; s.async = false;
            document.body.appendChild(s);
        }
    });
});
