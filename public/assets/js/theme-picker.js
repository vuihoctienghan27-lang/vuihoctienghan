/* ==========================================================================
   THEME-PICKER.JS — Random gradient + Dark mode + Popup chọn theme
   Chạy ngay khi script load (không cần DOMContentLoaded)
   ========================================================================== */

window.THEME = (() => {
    const LS_KEY = 'userTheme';

    const GRADIENTS = [
        // Pastel nhẹ
        { name: 'Tím & Xanh dương',   value: 'linear-gradient(135deg,#e0c3fc,#8ec5fc)' },
        { name: 'Hồng & Xanh lơ',     value: 'linear-gradient(135deg,#fbc2eb,#a6c1ee)' },
        { name: 'Xanh biển & Ngọc',   value: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)' },
        { name: 'Cam & Hồng đào',     value: 'linear-gradient(135deg,#ffecd2,#fcb69f)' },
        { name: 'Chanh & Xanh lá',    value: 'linear-gradient(135deg,#d4fc79,#96e6a1)' },
        { name: 'Hồng & Trắng hồng',  value: 'linear-gradient(135deg,#ff9a9e,#fecfef)' },
        { name: 'Tím đậm & Hồng',     value: 'linear-gradient(135deg,#a18cd1,#fbc2eb)' },
        { name: 'Mint & Xanh dương',  value: 'linear-gradient(135deg,#84fab0,#8fd3f4)' },
        { name: 'Cam sữa & Tím',      value: 'linear-gradient(135deg,#fccb90,#d57eeb)' },
        { name: 'Vàng nắng & Ngọc',   value: 'linear-gradient(135deg,#f8ffae,#43c6ac)' },
        { name: 'Bạc sương & Trắng',  value: 'linear-gradient(135deg,#c3cfe2,#f5f7fa)' },
        { name: 'Vàng mật & Băng',    value: 'linear-gradient(135deg,#fddb92,#d1fdff)' },
        // Rực rỡ
        { name: 'San hô & Vàng',      value: 'linear-gradient(135deg,#ff6b6b,#feca57)' },
        { name: 'Dương xỉ & Ngọc',    value: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
        { name: 'Tím hoàng hôn',      value: 'linear-gradient(135deg,#667eea,#764ba2)' },
        { name: 'Cam cháy & Vàng',    value: 'linear-gradient(135deg,#f83600,#f9d423)' },
        { name: 'Xanh dương đậm',     value: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
        { name: 'Hồng rubi & Tím',    value: 'linear-gradient(135deg,#f093fb,#f5576c)' },
        { name: 'Xanh lá & Vàng',     value: 'linear-gradient(135deg,#11998e,#38ef7d)' },
        { name: 'Hồng cánh sen',      value: 'linear-gradient(135deg,#fddb92,#ff758c)' },
        { name: 'Biển đêm',           value: 'linear-gradient(135deg,#2193b0,#6dd5ed)' },
        { name: 'Mây tím',            value: 'linear-gradient(135deg,#cc2b5e,#753a88)' },
        { name: 'Bình minh',          value: 'linear-gradient(135deg,#f7971e,#ffd200)' },
        { name: 'Lá mùa thu',         value: 'linear-gradient(135deg,#f46b45,#eea849)' },
        // Đa sắc
        { name: 'Cầu vồng nhạt',      value: 'linear-gradient(135deg,#ffeaa7,#a29bfe,#fd79a8)' },
        { name: 'Hoa oải hương',      value: 'linear-gradient(135deg,#dfe6e9,#b2bec3,#a29bfe)' },
        { name: 'Xanh ngọc tươi',     value: 'linear-gradient(135deg,#0cebeb,#20e3b2,#29ffc6)' },
        { name: 'Lá thư mùa xuân',   value: 'linear-gradient(135deg,#c6f6d5,#bee3f8,#e9d8fd)' },
        { name: 'Mưa hồng',           value: 'linear-gradient(135deg,#e0c3fc,#fbc2eb,#a1c4fd)' },
        { name: 'Hoàng hôn đỏ',       value: 'linear-gradient(135deg,#ff9966,#ff5e62)' },
        { name: 'Bầu trời đêm',       value: 'linear-gradient(135deg,#373b44,#4286f4)' },
        { name: 'Xuân xanh',          value: 'linear-gradient(135deg,#c1dfc4,#deecdd)' },
        { name: 'Cam ánh hồng',       value: 'linear-gradient(135deg,#fda085,#f6d365)' },
        { name: 'Xanh lam nhạt',      value: 'linear-gradient(135deg,#89f7fe,#66a6ff)' },
        { name: 'Hoa anh đào',        value: 'linear-gradient(135deg,#f8cdda,#1d2b64)' },
        { name: 'Tím bạo',            value: 'linear-gradient(135deg,#da22ff,#9733ee)' },
        { name: 'Xanh dương Navy',    value: 'linear-gradient(135deg,#1e3c72,#2a5298)' },
        { name: 'Xanh lá đậm',        value: 'linear-gradient(135deg,#134e5e,#71b280)' },
        { name: 'Hoa mặt trời',       value: 'linear-gradient(135deg,#f2994a,#f2c94c)' },
        { name: 'Xanh đại dương',     value: 'linear-gradient(135deg,#005c97,#363795)' },
        { name: 'Hoa cúc trắng',      value: 'linear-gradient(135deg,#ffffff,#e0e0e0)' },
    ];

    function getSaved() { return localStorage.getItem(LS_KEY); }

    function applyGrad(g) {
        // Đồng bộ tất cả cùng lúc: html + body + mask → không bị seam
        document.documentElement.style.setProperty('--random-bg-gradient', g);
        // html element: dùng backgroundImage để background-attachment:fixed hoạt động đúng
        document.documentElement.style.backgroundImage = g.startsWith('linear') || g.startsWith('radial') ? g : 'none';
        document.documentElement.style.backgroundAttachment = 'fixed';
        document.documentElement.style.backgroundSize = 'cover';
        if (document.body) {
            document.body.style.cssText += `;background:${g}!important;background-attachment:fixed!important;`;
            document.body.classList.remove('dark-mode');
        }
        // Sync mask ngay lập tức
        const mask = document.getElementById('topGradientMask');
        if (mask) {
            mask.style.background = g;
            mask.style.backgroundAttachment = 'fixed';
        }
    }

    function applyDark() {
        const dark = 'linear-gradient(135deg,#0f172a,#1e293b)';
        document.documentElement.style.setProperty('--random-bg-gradient', dark);
        document.documentElement.style.backgroundImage = 'none';
        document.documentElement.style.backgroundAttachment = 'fixed';
        if (document.body) {
            document.body.style.cssText += `;background:${dark}!important;background-attachment:fixed!important;`;
            document.body.classList.add('dark-mode');
        }
        const mask = document.getElementById('topGradientMask');
        if (mask) {
            mask.style.background = dark;
            mask.style.backgroundAttachment = 'fixed';
        }
    }

    function init() {
        const saved = getSaved();
        if (saved === 'dark') {
            // Set CSS var early, apply body after DOM
            document.documentElement.style.setProperty('--random-bg-gradient', 'linear-gradient(135deg,#0f172a,#1e293b)');
            document.documentElement.style.background = 'linear-gradient(135deg,#0f172a,#1e293b)';
            document.addEventListener('DOMContentLoaded', applyDark);
        } else if (saved && saved.startsWith('gradient:')) {
            const g = saved.slice(9);
            document.documentElement.style.setProperty('--random-bg-gradient', g);
            document.documentElement.style.background = g;
            document.addEventListener('DOMContentLoaded', () => applyGrad(g));
        } else {
            // Mặc định: Tím & Xanh dương (lần đầu truy cập)
            const defaultGrad = 'linear-gradient(135deg,#e0c3fc,#8ec5fc)';
            document.documentElement.style.setProperty('--random-bg-gradient', defaultGrad);
            document.documentElement.style.background = defaultGrad;
            document.addEventListener('DOMContentLoaded', () => applyGrad(defaultGrad));
        }
    }

    function selectGradient(g) {
        localStorage.setItem(LS_KEY, 'gradient:' + g);
        applyGrad(g);
        closePopup();
    }

    function selectDark() {
        localStorage.setItem(LS_KEY, 'dark');
        applyDark();
        closePopup();
    }

    function selectRandom() {
        localStorage.removeItem(LS_KEY);
        const chosen = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)].value;
        applyGrad(chosen);
        closePopup();
    }

    function openPopup() {
        // Xóa popup cũ nếu có (cho phép mở lại)
        closePopup();

        const saved = getSaved();
        const isDark = saved === 'dark';
        const currentG = saved && saved.startsWith('gradient:') ? saved.slice(9) : '';

        const overlay = document.createElement('div');
        overlay.id = 'themePickerOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });

        const tc = isDark ? '#f1f5f9' : '#1f2937';
        const sc = isDark ? '#94a3b8' : '#6b7280';
        const boxBg = isDark ? 'rgba(15,23,42,0.93)' : 'rgba(255,255,255,0.88)';
        const boxBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)';
        const divBg = isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc';
        const rndBg = 'rgba(37,99,235,0.1)';
        const drkBorderC = isDark ? '#60a5fa' : 'rgba(0,0,0,0.12)';
        const drkBg = isDark ? 'rgba(96,165,250,0.15)' : 'rgba(15,23,42,0.08)';
        const drkTc = isDark ? '#60a5fa' : '#374151';

        const box = document.createElement('div');
        box.style.cssText = `background:${boxBg};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid ${boxBorder};border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,0.2);padding:24px;width:min(540px,93vw);max-height:82vh;overflow-y:auto;font-family:"Pretendard","Inter",sans-serif;`;

        box.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
                <div>
                    <div style="font-size:1.1em;font-weight:800;color:${tc};">Chọn Giao Diện</div>
                    <div style="font-size:0.78em;color:${sc};margin-top:2px;">Lựa chọn được lưu tự động</div>
                </div>
                <button id="themePickerClose" style="width:30px;height:30px;background:rgba(0,0,0,.06);border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:${sc};">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div style="font-size:0.7em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${sc};margin-bottom:8px;">Chế độ</div>
            <div style="display:flex;gap:8px;margin-bottom:18px;">
                <button id="btnPickRandom" style="flex:1;padding:9px;border-radius:10px;border:2px solid rgba(37,99,235,0.3);background:${rndBg};color:#2563eb;font-weight:700;font-size:0.85em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    Ngẫu nhiên
                </button>
                <button id="btnPickDark" style="flex:1;padding:9px;border-radius:10px;border:2px solid ${drkBorderC};background:${drkBg};color:${drkTc};font-weight:700;font-size:0.85em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    Chế độ tối
                </button>
            </div>
            <div style="font-size:0.7em;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${sc};margin-bottom:10px;">Màu nền</div>
            <div id="gradientGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:8px;"></div>
        `;

        const grid = box.querySelector('#gradientGrid');
        GRADIENTS.forEach(g => {
            const btn = document.createElement('button');
            const isActive = g.value === currentG;
            btn.title = g.name;
            btn.style.cssText = `height:52px;border-radius:10px;background:${g.value};border:${isActive ? '3px solid #2563eb' : '2px solid rgba(255,255,255,0.4)'};cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.1);transition:transform 0.15s;position:relative;overflow:hidden;`;
            if (isActive) btn.innerHTML = '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.1em;text-shadow:0 1px 3px rgba(0,0,0,0.5);">✓</span>';
            btn.onmouseenter = () => { btn.style.transform = 'scale(1.08)'; };
            btn.onmouseleave = () => { btn.style.transform = ''; };
            btn.onclick = (e) => { e.stopPropagation(); selectGradient(g.value); };
            grid.appendChild(btn);
        });

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        box.querySelector('#themePickerClose').onclick = closePopup;
        box.querySelector('#btnPickRandom').onclick = (e) => { e.stopPropagation(); selectRandom(); };
        box.querySelector('#btnPickDark').onclick = (e) => { e.stopPropagation(); selectDark(); };
    }

    function closePopup() {
        const el = document.getElementById('themePickerOverlay');
        if (el) el.remove();
    }

    // Chạy ngay
    init();

    return { openPopup, closePopup, selectGradient, selectDark, selectRandom, GRADIENTS, getSaved };
})();
