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
        .icon-home,.post-explain-actions,.review-link{display:none!important}

        /* Vocab icon states */
        #globalVocabBtn{color:#6b7280;transition:color .3s}
        body:not(.vocab-disabled):not(.vocab-level-1):not(.vocab-level-2) #globalVocabBtn{color:#2563eb}
        #globalVocabBtn:disabled{color:#9ca3af!important;opacity:.45!important}

        .nav-right{display:flex;align-items:center;gap:6px}

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
        .nav-logo{text-decoration:none;display:flex;align-items:center;gap:8px;white-space:nowrap;margin:0;font-family:'Pretendard','Inter',-apple-system,sans-serif}
        .nav-logo img{height:38px;width:auto;display:block;flex-shrink:0}
        .nav-logo-text .vh{color:#142657}
        .nav-logo-text .th{color:#f95052}
        .nav-logo-text{font-size:1.15em;font-weight:900;display:flex;align-items:center;gap:2px}
        body.dark-mode .nav-logo-text .vh{color:#60a5fa}
        body.dark-mode .nav-logo-text .th{color:#fca5a5}

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
            font-weight:800;
            background:none;
        }
        .nav-link[data-skill="read"]{color:#142657}
        .nav-link[data-skill="listen"]{color:#142657}
        .nav-link[data-skill="write"]{color:#f95052}
        .nav-link[data-skill="grammar"]{color:#f95052}
        .nav-link[data-skill="read"]:hover{color:#f95052!important}
        .nav-link[data-skill="listen"]:hover{color:#f95052!important}
        .nav-link[data-skill="write"]:hover{color:#142657!important}
        .nav-link[data-skill="grammar"]:hover{color:#142657!important}
        @keyframes blink-read{0%,100%{color:#142657}50%{color:#f95052}}
        @keyframes blink-listen{0%,100%{color:#142657}50%{color:#f95052}}
        @keyframes blink-write{0%,100%{color:#f95052}50%{color:#142657}}
        @keyframes blink-grammar{0%,100%{color:#f95052}50%{color:#142657}}
        .nav-link[data-skill="read"].active{animation:blink-read 1.2s infinite}
        .nav-link[data-skill="listen"].active{animation:blink-listen 1.2s infinite}
        .nav-link[data-skill="write"].active{animation:blink-write 1.2s infinite}
        .nav-link[data-skill="grammar"].active{animation:blink-grammar 1.2s infinite}
        body.dark-mode .nav-link{color:#9ca3af}
        body.dark-mode .nav-link.active, body.dark-mode .nav-link:hover{background:none;font-weight:800;}

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
        .drawer-logo{text-decoration:none;display:flex;align-items:center;gap:8px}
        .drawer-logo img{height:30px;width:auto;display:block;flex-shrink:0}
        .drawer-logo-text .vh{color:#142657}
        .drawer-logo-text .th{color:#f95052}
        .drawer-logo-text{font-size:1em;font-weight:900;display:flex;align-items:center;gap:2px}
        body.dark-mode .drawer-logo-text .vh{color:#60a5fa}
        body.dark-mode .drawer-logo-text .th{color:#fca5a5}
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

        /* DRAWER — AUTH CARD */
        .drawer-auth{padding:14px 16px;border-bottom:1px solid rgba(0,0,0,.06)}
        body.dark-mode .drawer-auth{border-bottom-color:rgba(255,255,255,.08)}
        .drawer-auth a{text-decoration:none}
        .auth-login-btn{
            display:flex;align-items:center;justify-content:center;gap:8px;width:100%;
            padding:11px;border:none;border-radius:12px;cursor:pointer;
            background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;
            font-weight:700;font-size:.92em;box-shadow:0 6px 16px rgba(37,99,235,.25);
            transition:transform .15s,box-shadow .15s;
        }
        .auth-login-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(37,99,235,.32)}
        .auth-user{
            display:flex;align-items:center;gap:12px;padding:10px;border-radius:14px;
            background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.15);
            cursor:pointer;transition:background .15s;
        }
        .auth-user:hover{background:rgba(37,99,235,.1)}
        .auth-user img{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.6);flex-shrink:0}
        body.dark-mode .auth-user img{border-color:rgba(255,255,255,.2)}
        .auth-user-info{min-width:0;flex:1}
        .auth-user-name{display:block;font-weight:800;font-size:.95em;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        body.dark-mode .auth-user-name{color:#f1f5f9}
        .auth-user-role{display:block;font-size:.74em;color:#b45309;font-weight:700;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        body.dark-mode .auth-user-role{color:#fbbf24}
        .auth-user-streak{display:block;font-size:.72em;color:#f59e0b;font-weight:800;margin-top:3px}
        .auth-arrow{color:#94a3b8;flex-shrink:0;transition:transform .15s,color .15s}
        .auth-user:hover .auth-arrow{transform:translateX(2px);color:#2563eb}
        .auth-logout-btn{
            display:flex;align-items:center;gap:11px;width:100%;
            padding:9px 18px;background:none;border:none;cursor:pointer;
            color:#dc2626;font-weight:600;font-size:.9em;text-align:left;transition:background .15s;
        }
        .auth-logout-btn:hover{background:rgba(220,38,38,.08)}
        body.dark-mode .auth-logout-btn{color:#f87171}
        body.dark-mode .auth-logout-btn:hover{background:rgba(248,113,113,.12)}

        /* DRAWER — ACCORDION */
        .drawer-acc{border-bottom:1px solid rgba(0,0,0,.06)}
        body.dark-mode .drawer-acc{border-bottom-color:rgba(255,255,255,.08)}
        .drawer-acc-head{
            display:flex;align-items:center;justify-content:space-between;width:100%;
            padding:13px 18px;background:none;border:none;cursor:pointer;
            font-size:.78em;font-weight:800;text-transform:uppercase;letter-spacing:.8px;
            color:#475569;transition:color .15s;
        }
        body.dark-mode .drawer-acc-head{color:#94a3b8}
        .drawer-acc-head:hover{color:#2563eb}
        body.dark-mode .drawer-acc-head:hover{color:#60a5fa}
        .drawer-acc-lbl{display:flex;align-items:center;gap:9px}
        .drawer-chevron{width:14px;height:14px;transition:transform .25s;color:#94a3b8;flex-shrink:0}
        .drawer-acc.open .drawer-chevron{transform:rotate(180deg)}
        .drawer-acc-body{display:none;padding-bottom:6px}
        .drawer-acc.open .drawer-acc-body{display:block}
        .drawer-acc-body .nav-link-side{padding-left:30px;font-size:.9em}

        /* Mọi nút trong drawer kế thừa font của trang (tránh rơi về font mặc định như Arial) */
        .side-drawer button{font-family:inherit}

        /* OVERLAY */
        .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:1000;display:none;opacity:0;transition:opacity .3s}
        .drawer-overlay.show{display:block;opacity:1}

        /* RESPONSIVE — Navbar + Wrapper/Container width sync */
        @media(min-width:769px){
            .container,.wrapper{max-width:900px!important;margin-left:auto!important;margin-right:auto!important;width:auto!important}
        }
        @media(max-width:768px){
            .global-nav{margin-left:4px!important;margin-right:4px!important;width:auto!important;border-radius:16px;}
            .container,.wrapper{margin-left:4px!important;margin-right:4px!important;width:auto!important;padding-left:12px!important;padding-right:12px!important;}
            .top-gradient-mask{height:28px}
            .nav-top-row{height:50px;padding:0 15px}
            .nav-logo-wrapper{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);white-space:nowrap;z-index:1;}
            .nav-desktop-links{display:none}
            .nav-logo img{height:32px}
            .nav-logo-text{font-size:1em;font-weight:900}
            .nav-right .nav-icon-btn{padding:5px;border-radius:8px}
            .nav-right .nav-icon-btn svg{width:17px!important;height:17px!important}
        }
        @media(max-width:600px){
            .global-nav{margin:10px 2px 15px 2px!important;border-radius:12px;top:10px;}
            .container,.wrapper{margin-left:2px!important;margin-right:2px!important;width:auto!important;padding-left:8px!important;padding-right:8px!important;}
            .top-gradient-mask{height:18px}
        }
    `;
    document.head.appendChild(style);

    // Restore vocab toggle state (default: enabled)
    const vocabEnabled = localStorage.getItem('vocabEnabled');
    if (vocabEnabled === 'false') {
        document.body.classList.add('vocab-disabled');
    } else {
        document.body.classList.remove('vocab-disabled');
    }

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
                <a href="${rootPath}index.html" class="nav-logo"><img src="${rootPath}assets/img/logo-navbar.png" alt=""><span class="nav-logo-text"><span class="vh">Vui Học</span><span class="th">Tiếng Hàn</span></span></a>
            </div>

            <div class="nav-desktop-links">
                <a href="${rootPath}reading/home.html" class="nav-link ${isReading?'active':''}" data-skill="read">Đọc</a>
                <a href="${rootPath}listening/home.html" class="nav-link ${isListening?'active':''}" data-skill="listen">Nghe</a>
                <a href="${rootPath}writing/home.html" class="nav-link ${isWriting?'active':''}" data-skill="write">Viết</a>
                <a href="${rootPath}grammar/home.html" class="nav-link ${isGrammar?'active':''}" data-skill="grammar">Ngữ pháp</a>
            </div>

            <div class="nav-right">
                <button class="nav-icon-btn" id="globalVocabBtn" onclick="window.toggleVocab()" title="Bật/Tắt tra từ điển">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        <line x1="12" y1="6" x2="12" y2="14"/>
                        <line x1="8" y1="10" x2="16" y2="10"/>
                    </svg>
                </button>
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
            <a href="${rootPath}index.html" class="drawer-logo" onclick="toggleDrawer(false)"><img src="${rootPath}assets/img/logo-navbar.png" alt=""><span class="drawer-logo-text"><span class="vh">Vui Học</span><span class="th">Tiếng Hàn</span></span></a>
            <button class="drawer-close-btn" onclick="toggleDrawer(false)" aria-label="Đóng">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <div class="drawer-auth" id="drawerAuth"></div>

        <div class="drawer-acc" id="accPractice">
            <button class="drawer-acc-head" onclick="window.toggleAcc('accPractice')">
                <span class="drawer-acc-lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> Luyện tập</span>
                <svg class="drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="drawer-acc-body">
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
            </div>
        </div>

        <div class="drawer-acc" id="accTools">
            <button class="drawer-acc-head" onclick="window.toggleAcc('accTools')">
                <span class="drawer-acc-lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Công cụ</span>
                <svg class="drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="drawer-acc-body">
        <a href="${rootPath}dict.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <span>Tra Từ Điển</span>
        </a>
        <a href="${rootPath}forum.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            <span>Hỏi Đáp</span>
        </a>
        <a href="${rootPath}vocab.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>
            <span>Sổ Từ Vựng</span>
        </a>
        <a href="${rootPath}dailynews.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg></span>
            <span>Đọc Báo</span>
        </a>
        <a href="${rootPath}hanhan.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
            <span>Hán Hàn</span>
        </a>
        <a href="${rootPath}video/home.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16"/></svg></span>
            <span>Học qua Video</span>
        </a>
        <a href="${rootPath}games/home.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="6"/></svg></span>
            <span>Trò Chơi</span>
        </a>
            </div>
        </div>

        <div class="drawer-acc" id="accSettings">
            <button class="drawer-acc-head" onclick="window.toggleAcc('accSettings')">
                <span class="drawer-acc-lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Cài đặt</span>
                <svg class="drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="drawer-acc-body">
        <button class="nav-link-side" onclick="window.THEME && window.THEME.openPopup()">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
            <span>Đổi Giao Diện</span>
        </button>
        <a href="${rootPath}feedback.html" class="nav-link-side" onclick="toggleDrawer(false)">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
            <span>Góp ý</span>
        </a>
        <a href="${rootPath}data.html" class="nav-link-side" id="drawerDashboardLink" onclick="toggleDrawer(false)" style="display:none;">
            <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
            <span>Dashboard</span>
        </a>
        <button class="auth-logout-btn" onclick="window.logoutUser()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Đăng xuất</span>
        </button>
            </div>
        </div>
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
                const drawerAuth = document.getElementById('drawerAuth');
                if (user) {
                    if (btn) {
                        btn.style.cssText += 'color:#2563eb;background:rgba(37,99,235,.1);border-color:rgba(37,99,235,.2)';
                        btn.title = user.displayName || user.email;
                        btn.onclick = () => { 
                            if (window.location.pathname.includes('forum.html')) {
                                if (typeof window.handleAvatarClick === 'function') window.handleAvatarClick();
                            } else {
                                window.location.href = `${rootPath}mypage.html`; 
                            }
                        };
                    }
                    const ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];
                    const dashLink = document.getElementById('drawerDashboardLink');
                    if (dashLink && ADMIN_EMAILS.includes(user.email)) {
                        dashLink.style.display = '';
                    }
                    // Drawer: thẻ người dùng (tên + chức danh + streak) → bấm vào về mypage
                    if (drawerAuth) {
                        const uName = user.displayName || user.email || 'Học viên';
                        const uAvatar = user.photoURL || '';
                        drawerAuth.innerHTML = `
                            <a href="${rootPath}mypage.html" onclick="toggleDrawer(false)" class="auth-user">
                                <img src="${uAvatar || ''}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'">
                                <span class="auth-user-info">
                                    <span class="auth-user-name">${uName.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]))}</span>
                                    <span class="auth-user-role">Đang tải...</span>
                                    <span class="auth-user-streak">🔥 …</span>
                                </span>
                                <svg class="auth-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                            </a>`;
                        try {
                            firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
                                if (!doc.exists) return;
                                const d = doc.data();
                                const roleEl = drawerAuth.querySelector('.auth-user-role');
                                if (roleEl) {
                                    // Chức danh = hạng thành viên theo tổng EXP (Thường Dân → Trạng Nguyên)
                                    const totalExp = Math.max(0, Math.floor((d.totalStudyMinutes || 0) / 10) * 5 + (d.bonusEXP || 0));
                                    roleEl.innerText = memberRank(totalExp);
                                }
                                const streakEl = drawerAuth.querySelector('.auth-user-streak');
                                if (streakEl) streakEl.innerText = '🔥 ' + (d.streakDays || 1) + ' ngày streak';
                            }).catch(function () {});
                        } catch (e) {}
                    }
                } else {
                    // Drawer: nút đăng nhập
                    if (drawerAuth) {
                        drawerAuth.innerHTML = `
                            <button class="auth-login-btn" onclick="window.handleAvatarClick()">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" stroke-width="2" stroke-linecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                                <span>Đăng nhập</span>
                            </button>`;
                    }
                }
            });
        }
    }, 300);

    // Accordion đóng/mở cho drawer
    window.toggleAcc = function (id) {
        const acc = document.getElementById(id);
        if (acc) acc.classList.toggle('open');
    };

    // Hạng thành viên theo tổng EXP (đồng bộ mypage.html getLevelInfo)
    function memberRank(exp) {
        if (exp > 3000) return '👑 Trạng Nguyên';
        if (exp >= 1001) return '📜 Thượng Thư';
        if (exp >= 401) return '🖋️ Tú Tài';
        if (exp >= 51) return '🕯️ Sĩ Tử';
        return '🌱 Thường Dân';
    }

    // Tự mở mục đang active khi load
    setTimeout(function () {
        document.querySelectorAll('.drawer-acc').forEach(function (acc) {
            if (acc.querySelector('.nav-link-side.active')) acc.classList.add('open');
        });
    }, 400);

    // Đăng xuất
    window.logoutUser = function () {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(function () {
                if (typeof toggleDrawer === 'function') toggleDrawer(false);
                window.location.href = rootPath + 'index.html';
            }).catch(function () {
                if (typeof toggleDrawer === 'function') toggleDrawer(false);
                window.location.href = rootPath + 'index.html';
            });
        } else {
            window.location.href = rootPath + 'index.html';
        }
    };

    // Audio player
    const nav = document.getElementById('globalNavbar');
    const player = document.getElementById('sticky-audio-player');
    if (nav && player) { nav.appendChild(player); player.classList.add('integrated-player'); }

    // Vocab toggle button
    window.toggleVocab = function() {
        const btn = document.getElementById('globalVocabBtn');
        if (!btn || btn.disabled) return;
        if (document.body.classList.contains('vocab-disabled')) {
            document.body.classList.remove('vocab-disabled');
        } else {
            document.body.classList.add('vocab-disabled');
        }
        localStorage.setItem('vocabEnabled', !document.body.classList.contains('vocab-disabled'));
    };

    // Global logic & Vocab scripts
    ['user-profile-popup.js', 'vocab-external.js','vocab-dictionary.js','hover-lookup.js','vocab-stats.js'].forEach(f => {
        if (!document.querySelector(`script[src*="${f}"]`)) {
            const s = document.createElement('script');
            s.src = `${rootPath}assets/js/${f}`; s.async = false;
            document.body.appendChild(s);
        }
    });
});
