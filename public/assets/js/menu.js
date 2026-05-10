/* ==========================================================================
   MENU.JS — Chỉ export hàm toggleDrawer (HTML được navbar.js inject)
   ========================================================================== */

window.toggleDrawer = function(isOpen) {
    const d = document.getElementById('sideDrawer');
    const o = document.getElementById('drawerOverlay');
    if (!d || !o) return;
    if (isOpen) {
        d.classList.add('open');
        o.classList.add('show');
        document.body.style.overflow = 'hidden'; // Khóa scroll khi drawer mở
    } else {
        d.classList.remove('open');
        o.classList.remove('show');
        document.body.style.overflow = '';
    }
};

// Đóng drawer khi nhấn ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.toggleDrawer(false);
});
