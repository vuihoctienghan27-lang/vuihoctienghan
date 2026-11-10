/* ==========================================================================
   AUTH-GUARD.JS — Bắt buộc đăng nhập cho phần Viết và Ngữ pháp
   Tự kích hoạt khi đường dẫn chứa /writing/ hoặc /grammar/.
   Được navbar.js nạp trên mọi trang; các trang khác sẽ không làm gì.
   ========================================================================== */
(function () {
    'use strict';

    var path = window.location.pathname;
    var needsAuth = path.indexOf('/writing/') !== -1 || path.indexOf('/grammar/') !== -1;
    if (!needsAuth) return;

    var overlay = null;
    var _locked = false;

    function lockScroll() {
        if (_locked) return;
        _locked = true;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }
    function unlockScroll() {
        if (!_locked) return;
        _locked = false;
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }

    function showGate() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.id = 'auth-gate-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;';
        overlay.innerHTML =
            '<div style="background:#fff;border-radius:20px;max-width:420px;width:100%;padding:36px 28px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:Pretendard,Inter,sans-serif;">' +
                '<div style="font-size:3em;margin-bottom:12px;">🔒</div>' +
                '<h2 style="margin:0 0 8px;font-size:1.4em;font-weight:800;color:#1e293b;">Yêu cầu đăng nhập</h2>' +
                '<p style="color:#64748b;margin:0 0 24px;font-size:0.95em;line-height:1.5;">Bạn cần đăng nhập để sử dụng phần Viết và Ngữ pháp.</p>' +
                '<button id="authGateLoginBtn" style="background:#fff;color:#1f2937;border:1.5px solid #e2e8f0;padding:13px 28px;border-radius:10px;font-weight:700;font-size:1em;cursor:pointer;display:inline-flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">' +
                    '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>' +
                    'Đăng nhập bằng Google' +
                '</button>' +
                '<div style="margin-top:16px;"><a href="/index.html" style="color:#64748b;font-size:0.85em;text-decoration:none;font-weight:600;">← Về trang chủ</a></div>' +
            '</div>';
        document.body.appendChild(overlay);
        lockScroll();

        var btn = document.getElementById('authGateLoginBtn');
        if (btn) btn.addEventListener('click', function () {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                window.location.href = '/index.html';
                return;
            }
            btn.disabled = true;
            btn.style.opacity = '0.7';
            var provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider).catch(function (e) {
                btn.disabled = false;
                btn.style.opacity = '';
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ icon: 'error', title: 'Lỗi đăng nhập', text: e.message, confirmButtonColor: '#2563eb' });
                } else {
                    alert('Lỗi đăng nhập: ' + e.message);
                }
            });
        });
    }

    function hideGate() {
        if (overlay) { overlay.remove(); overlay = null; }
        unlockScroll();
    }

    // Chờ Firebase sẵn sàng rồi kiểm tra trạng thái đăng nhập
    var tries = 0;
    (function wait() {
        tries++;
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function (user) {
                if (user) hideGate();
                else showGate();
            });
        } else if (tries < 100) {
            setTimeout(wait, 100);
        } else {
            // Không tải được Firebase → vẫn chặn để đảm bảo yêu cầu đăng nhập
            showGate();
        }
    })();
})();
