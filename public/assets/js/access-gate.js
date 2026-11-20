/* ==========================================================================
   ACCESS-GATE.JS — Khóa nội dung Nghe / Đọc / Viết / Ngữ pháp cho học viên nội bộ
   --------------------------------------------------------------------------
   - Mở tự do: các trang home + đề 35 (topik35*.html) của mọi phần.
   - Còn lại: chỉ admin hoặc học viên đã được duyệt (approved_students/{email}).
   - Người khác bấm vào đề bị khóa → hiện thông báo liên hệ; mở thẳng URL → trang bị che.
   Được auth.js nạp sớm (trong <head>) và navbar.js nạp dự phòng.
   Lưu ý: đây là khóa phía trình duyệt — nội dung vẫn nằm trong file HTML.
   ========================================================================== */
(function () {
    'use strict';
    if (window.AccessGate) return;

    var ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];
    var ZALO_URL = 'https://zalo.me/0347133251';
    var LOCKED_SECTIONS = ['reading', 'listening', 'writing', 'grammar'];
    var FREE_EXAM = /^topik35(?![0-9])/;   // topik35.html, topik35-test.html, topik35 (cleanUrls)

    // ---------- Xác định trang/đường dẫn bị khóa ----------
    function isLockedPath(pathname) {
        var p;
        try { p = decodeURIComponent(pathname || ''); } catch (e) { p = pathname || ''; }
        p = p.toLowerCase();
        if (p.charAt(p.length - 1) === '/') return false;     // thư mục (vd /grammar/socap/) → trang home
        var parts = p.split('/').filter(Boolean);
        var idx = -1;
        for (var i = 0; i < parts.length; i++) {
            if (LOCKED_SECTIONS.indexOf(parts[i]) !== -1) { idx = i; break; }
        }
        if (idx === -1 || idx === parts.length - 1) return false;   // không thuộc 4 phần, hoặc /reading
        var file = parts[parts.length - 1];
        if (file.indexOf('.') !== -1 && !/\.html?$/.test(file)) return false; // ảnh, js, mp3…
        var base = file.replace(/\.html?$/, '');
        if (base === 'home' || base === 'index') return false;
        if (parts[idx] === 'grammar' && base === 'admin') return false; // trang admin tự kiểm tra quyền
        if (FREE_EXAM.test(base)) return false;
        return true;
    }

    function isLockedUrl(href) {
        if (!href) return false;
        var h = String(href).trim();
        if (/^(javascript:|mailto:|tel:|#)/i.test(h)) return false;
        try {
            var u = new URL(h, window.location.href);
            if (u.origin !== window.location.origin) return false;
            return isLockedPath(u.pathname);
        } catch (e) { return false; }
    }

    var pageLocked = isLockedPath(window.location.pathname);
    var isGrammarHome = /\/grammar\/(home(\.html)?)?$/i.test(window.location.pathname);

    // Che trang ngay lập tức (chạy trong <head>) để không lộ nội dung trong lúc kiểm tra quyền
    var hideStyle = null;
    if (pageLocked) {
        hideStyle = document.createElement('style');
        hideStyle.id = 'ag-hide-style';
        hideStyle.textContent = 'body > *:not(#ag-overlay){visibility:hidden !important;}';
        (document.head || document.documentElement).appendChild(hideStyle);
    }

    // ---------- Kiểm tra quyền ----------
    var accessPromise = null;
    var currentUser = null;

    function waitFirebase() {
        return new Promise(function (resolve) {
            var tries = 0;
            (function check() {
                if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length && firebase.auth && firebase.firestore) {
                    resolve(true);
                } else if (++tries > 150) {
                    resolve(false);
                } else {
                    setTimeout(check, 100);
                }
            })();
        });
    }

    function waitUser() {
        return waitFirebase().then(function (ok) {
            if (!ok) return null;
            return new Promise(function (resolve) {
                var unsub = firebase.auth().onAuthStateChanged(function (user) {
                    unsub();
                    resolve(user || null);
                });
            });
        });
    }

    // Trả về { allowed, user, reason: 'admin'|'student'|'guest'|'pending'|'none'|'offline' }
    function checkAccess(force) {
        if (accessPromise && !force) return accessPromise;
        accessPromise = waitUser().then(function (user) {
            currentUser = user;
            if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
                return { allowed: false, user: null, reason: 'offline' };
            }
            if (!user) return { allowed: false, user: null, reason: 'guest' };
            var email = (user.email || '').toLowerCase();
            if (ADMIN_EMAILS.indexOf(email) !== -1) return { allowed: true, user: user, reason: 'admin' };
            var db = firebase.firestore();
            return db.collection('approved_students').doc(email).get().then(function (snap) {
                if (snap.exists) return { allowed: true, user: user, reason: 'student' };
                return db.collection('student_requests').doc(user.uid).get().then(function (r) {
                    return { allowed: false, user: user, reason: r.exists ? 'pending' : 'none' };
                }).catch(function () { return { allowed: false, user: user, reason: 'none' }; });
            }).catch(function (e) {
                console.warn('[AccessGate] Không kiểm tra được quyền:', e && e.message);
                return { allowed: false, user: user, reason: 'none' };
            });
        });
        return accessPromise;
    }

    // ---------- Giao diện thông báo ----------
    var overlay = null;

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function injectCss() {
        if (document.getElementById('ag-style')) return;
        var css = document.createElement('style');
        css.id = 'ag-style';
        css.textContent =
            '#ag-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;' +
                'background:rgba(15,23,42,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:Pretendard,Inter,system-ui,sans-serif;animation:agFade .18s ease;}' +
            '#ag-overlay.ag-solid{background:rgba(15,23,42,.92);}' +
            '@keyframes agFade{from{opacity:0}to{opacity:1}}' +
            '.ag-box{position:relative;background:#fff;color:#1e293b;border-radius:20px;max-width:440px;width:100%;padding:32px 26px 24px;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.35);max-height:calc(100vh - 32px);overflow:auto;}' +
            '.ag-icon{width:64px;height:64px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;background:linear-gradient(135deg,#eff6ff,#dbeafe);}' +
            '.ag-title{margin:0 0 10px;font-size:1.3em;font-weight:800;}' +
            '.ag-msg{margin:0 0 20px;color:#475569;font-size:.96em;line-height:1.6;}' +
            '.ag-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;padding:13px 18px;border-radius:12px;font-weight:700;font-size:.98em;cursor:pointer;text-decoration:none;border:1.5px solid transparent;transition:transform .15s,box-shadow .15s;margin-top:10px;font-family:inherit;}' +
            '.ag-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.12);}' +
            '.ag-btn:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none;}' +
            '.ag-zalo{background:#0068ff;color:#fff;}' +
            '.ag-sec{background:#fff;color:#1f2937;border-color:#e2e8f0;}' +
            '.ag-note{margin-top:14px;font-size:.84em;color:#64748b;line-height:1.5;}' +
            '.ag-note b{color:#334155;}' +
            '.ag-ok{color:#16a34a;font-weight:700;}' +
            '.ag-close{position:absolute;top:10px;right:12px;width:34px;height:34px;border:none;background:transparent;font-size:24px;line-height:1;color:#94a3b8;cursor:pointer;border-radius:50%;}' +
            '.ag-close:hover{background:#f1f5f9;color:#475569;}' +
            '.ag-home{display:inline-block;margin-top:16px;color:#64748b;font-size:.88em;font-weight:600;text-decoration:none;}' +
            '.ag-spin{width:36px;height:36px;margin:8px auto 14px;border:4px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:agSpin .8s linear infinite;}' +
            '@keyframes agSpin{to{transform:rotate(360deg)}}' +
            'body.dark-mode .ag-box{background:#1e293b;color:#f1f5f9;}' +
            'body.dark-mode .ag-msg,body.dark-mode .ag-note{color:#cbd5e1;}' +
            'body.dark-mode .ag-note b{color:#f1f5f9;}' +
            'body.dark-mode .ag-sec{background:#0f172a;color:#f1f5f9;border-color:#334155;}' +
            'body.dark-mode .ag-icon{background:#0f172a;}' +
            '.ag-locked-card{position:relative;}' +
            '.ag-lock-badge{position:absolute;top:8px;right:8px;z-index:3;font-size:13px;line-height:1;padding:5px 6px;border-radius:8px;background:rgba(15,23,42,.72);color:#fff;pointer-events:none;}' +
            '.ag-lock-host{position:relative !important;overflow:visible !important;}' +
            '.ag-lock-mini{top:auto;right:-5px;bottom:-5px;font-size:10px;padding:3px 4px;border-radius:7px;box-shadow:0 0 0 2px #fff;}';
        (document.head || document.documentElement).appendChild(css);
    }

    function closeOverlay() {
        if (overlay) { overlay.remove(); overlay = null; }
        if (!pageLocked) document.documentElement.style.overflow = '';
    }

    function mountOverlay(html, solid) {
        injectCss();
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', function () { mountOverlay(html, solid); });
            return;
        }
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ag-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            document.body.appendChild(overlay);
        }
        overlay.className = solid ? 'ag-solid' : '';
        overlay.innerHTML = '<div class="ag-box">' + html + '</div>';
        document.documentElement.style.overflow = 'hidden';
    }

    function homeHref() {
        // Về trang home của phần hiện tại (vd /reading/home.html), nếu không có thì về trang chủ
        var m = window.location.pathname.match(/^(.*?\/(reading|listening|writing|grammar)\/)/i);
        return m ? m[1] + 'home.html' : '/index.html';
    }

    function showChecking() {
        mountOverlay('<div class="ag-spin"></div><div class="ag-msg" style="margin:0;">Đang kiểm tra quyền truy cập…</div>', true);
    }

    // targetHref: link người dùng định mở (khi chặn từ trang home); null nếu đang đứng trên trang bị khóa
    function showLocked(state, targetHref) {
        var onLockedPage = !targetHref;
        var user = state && state.user;
        var reason = state ? state.reason : 'guest';

        var html = '';
        if (!onLockedPage) html += '<button class="ag-close" data-ag="close" aria-label="Đóng">&times;</button>';
        html += '<div class="ag-icon">🔒</div>' +
            '<h2 class="ag-title">Nội dung dành cho học viên</h2>' +
            '<p class="ag-msg">Xin lỗi, tính năng chỉ dành cho học viên của hệ thống. Hãy liên hệ với <b>Minh Hiếu</b> để đăng ký khóa học hoặc mua gói sử dụng toàn bộ tính năng của website.</p>' +
            '<a class="ag-btn ag-zalo" href="' + ZALO_URL + '" target="_blank" rel="noopener noreferrer">💬 Liên hệ Zalo: 0347 133 251</a>';

        if (reason === 'guest' || reason === 'offline') {
            html += '<button class="ag-btn ag-sec" data-ag="login">' +
                '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>' +
                'Đã là học viên? Đăng nhập</button>';
            html += '<div class="ag-note">Đề số 35 (TOPIK I &amp; II) được mở miễn phí để bạn làm thử.</div>';
        } else if (reason === 'pending') {
            html += '<div class="ag-note"><span class="ag-ok">✓ Đã gửi yêu cầu kích hoạt</span><br>Tài khoản <b>' + esc(user && user.email) + '</b> đang chờ Minh Hiếu duyệt.</div>';
        } else {
            html += '<button class="ag-btn ag-sec" data-ag="request">🙋 Tôi là học viên — gửi yêu cầu kích hoạt</button>';
            html += '<div class="ag-note">Đang đăng nhập: <b>' + esc(user && user.email) + '</b></div>';
        }
        if (onLockedPage) html += '<a class="ag-home" href="' + homeHref() + '">← Quay lại danh sách đề</a>';

        mountOverlay(html, onLockedPage);
        bindOverlay(targetHref);
    }

    function bindOverlay(targetHref) {
        if (!overlay) return;
        overlay.onclick = function (e) {
            if (e.target === overlay && targetHref) { closeOverlay(); return; }
            var btn = e.target.closest && e.target.closest('[data-ag]');
            if (!btn) return;
            var act = btn.getAttribute('data-ag');
            if (act === 'close') closeOverlay();
            else if (act === 'login') doLogin(btn, targetHref);
            else if (act === 'request') doRequest(btn, targetHref);
        };
    }

    function afterAccessChange(state, targetHref) {
        if (state.allowed) {
            lastState = state;
            closeOverlay();
            clearLockMarks();
            if (targetHref && targetHref !== '#') window.location.href = targetHref;
            else if (!targetHref) unlockPage();
        } else {
            showLocked(state, targetHref);
        }
    }

    function doLogin(btn, targetHref) {
        if (typeof firebase === 'undefined' || !firebase.auth) return;
        btn.disabled = true;
        var provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).then(function (res) {
            var u = res && res.user;
            if (u && window.db) {
                window.db.collection('users').doc(u.uid).set({ fullName: u.displayName || '', lastLoginAt: new Date().toISOString() }, { merge: true }).catch(function () {});
            }
            if (u && window.syncPrivateEmail) window.syncPrivateEmail(u);
            return checkAccess(true);
        }).then(function (state) {
            if (state) afterAccessChange(state, targetHref);
        }).catch(function (e) {
            btn.disabled = false;
            if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
                alert('Lỗi đăng nhập: ' + (e.message || e));
            }
        });
    }

    function doRequest(btn, targetHref) {
        var u = currentUser;
        if (!u) return;
        btn.disabled = true;
        btn.textContent = 'Đang gửi…';
        firebase.firestore().collection('student_requests').doc(u.uid).set({
            email: u.email || '',
            name: (u.displayName || '').slice(0, 100),
            requestedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
            return checkAccess(true);
        }).then(function (state) {
            afterAccessChange(state, targetHref);
        }).catch(function (e) {
            btn.disabled = false;
            btn.textContent = '🙋 Tôi là học viên — gửi yêu cầu kích hoạt';
            alert('Không gửi được yêu cầu: ' + (e && e.message));
        });
    }

    function unlockPage() {
        if (hideStyle) { hideStyle.remove(); hideStyle = null; }
        closeOverlay();
        document.documentElement.style.overflow = '';
    }

    // ---------- Chặn click vào link/đề bị khóa ----------
    function onClickCapture(e) {
        if (e.defaultPrevented || e.button !== 0) return;
        var t = e.target;
        if (!t || !t.closest) return;
        if (overlay && overlay.contains(t)) return;
        var a = t.closest('a[href]');
        var target = null;
        if (a && isLockedUrl(a.getAttribute('href'))) {
            target = a.href;
        } else if (isGrammarHome && t.closest('.grammar-card')) {
            // Ngữ pháp mở chi tiết trong modal (viewGrammarDetail) → cũng khóa
            target = 'about:grammar';
        } else {
            return;
        }
        if (lastState && lastState.allowed) return;   // đã có quyền → cho đi bình thường
        e.preventDefault();
        e.stopImmediatePropagation();
        var card = t.closest('a, .grammar-card');
        checkAccess().then(function (state) {
            lastState = state;
            if (state.allowed) {
                if (target === 'about:grammar') { if (card) card.click(); }
                else window.location.href = target;
                return;
            }
            showLocked(state, target === 'about:grammar' ? '#' : target);
        });
    }

    var lastState = null;
    document.addEventListener('click', onClickCapture, true);

    // Gắn biểu tượng 🔒 lên các thẻ đề bị khóa ở trang home (chỉ khi chưa có quyền)
    function markLockedCards() {
        if (lastState && lastState.allowed) return;
        var links = document.querySelectorAll('a[href]');
        for (var i = 0; i < links.length; i++) {
            var a = links[i];
            if (a.getAttribute('data-ag-marked')) continue;
            var locked = isLockedUrl(a.getAttribute('href')) || (isGrammarHome && a.classList.contains('grammar-card'));
            if (!locked) continue;
            // Chỉ đánh dấu thẻ dạng card (có nội dung lớn), bỏ qua link chữ trong menu
            if (!a.querySelector('div, span, img') || a.closest('nav, #sideDrawer, .side-drawer, footer')) continue;
            a.setAttribute('data-ag-marked', '1');
            a.classList.add('ag-locked-card');
            // Đặt 🔒 vào góc ô bìa (số đề / cấp độ) nếu có, để không đè lên nhãn trạng thái của thẻ
            var host = a.querySelector('[class*="cover"]') || a;
            if (host !== a) host.classList.add('ag-lock-host');
            var b = document.createElement('span');
            b.className = host === a ? 'ag-lock-badge' : 'ag-lock-badge ag-lock-mini';
            b.textContent = '🔒';
            host.appendChild(b);
        }
    }
    function clearLockMarks() {
        var bs = document.querySelectorAll('.ag-lock-badge');
        for (var i = 0; i < bs.length; i++) bs[i].remove();
        var hs = document.querySelectorAll('.ag-lock-host');
        for (var k = 0; k < hs.length; k++) hs[k].classList.remove('ag-lock-host');
        var cs = document.querySelectorAll('[data-ag-marked]');
        for (var j = 0; j < cs.length; j++) { cs[j].removeAttribute('data-ag-marked'); cs[j].classList.remove('ag-locked-card'); }
    }

    var markTimer = null;
    function scheduleMark() {
        if (markTimer) return;
        markTimer = setTimeout(function () { markTimer = null; markLockedCards(); }, 150);
    }

    // ---------- Khởi động ----------
    function start() {
        injectCss();
        if (pageLocked) showChecking();
        checkAccess().then(function (state) {
            lastState = state;
            if (pageLocked) {
                if (state.allowed) unlockPage();
                else showLocked(state, null);
            }
            if (!state.allowed) {
                markLockedCards();
                if (window.MutationObserver) new MutationObserver(scheduleMark).observe(document.body, { childList: true, subtree: true });
            }
        });
        // Đăng nhập/đăng xuất ở nơi khác (navbar) → kiểm tra lại
        waitFirebase().then(function (ok) {
            if (!ok) return;
            var first = true;
            firebase.auth().onAuthStateChanged(function () {
                if (first) { first = false; return; }
                checkAccess(true).then(function (state) {
                    lastState = state;
                    if (state.allowed) { clearLockMarks(); if (pageLocked) unlockPage(); }
                    else { markLockedCards(); if (pageLocked) showLocked(state, null); }
                });
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();

    window.AccessGate = {
        isLockedPath: isLockedPath,
        isLockedUrl: isLockedUrl,
        pageLocked: pageLocked,
        check: checkAccess,
        ZALO_URL: ZALO_URL
    };
})();
