/* floating-chat.js — Side chat for landing page */

(function () {
    var currentUser = null;
    var unsubscribe = null;
    var chatInitialized = false;
    var DB = null;
    var CHAT_WIDTH = 340;

    function waitForFirebase(cb, tries) {
        if (tries === undefined) tries = 0;
        if (tries > 30) return;
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            cb();
        } else {
            setTimeout(function () { waitForFirebase(cb, tries + 1); }, 200);
        }
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, function (tag) {
            var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
            return map[tag] || tag;
        });
    }

    function formatTime(ts) {
        if (!ts) return '';
        var d = ts.toDate ? ts.toDate() : new Date(ts);
        var h = String(d.getHours()).padStart(2, '0');
        var m = String(d.getMinutes()).padStart(2, '0');
        return h + ':' + m;
    }

    function isWideScreen() {
        return window.innerWidth >= 1400;
    }

    function shiftBodyOut() {
        if (!isWideScreen()) return;
        document.body.style.paddingRight = CHAT_WIDTH + 'px';
    }

    function shiftBodyBack() {
        document.body.style.paddingRight = '';
    }

    function injectChatUI() {
        if (document.getElementById('fc-root')) return;

        var html = ''
            + '<div id="fc-root">'
            + '<style>'
            + '#fc-root { position:fixed; top:80px; right:0; z-index:9999; font-family:"Pretendard","Inter",sans-serif; display:flex; flex-direction:column; height:calc(100vh - 120px); width:' + CHAT_WIDTH + 'px; transition:right 0.35s ease,opacity 0.35s ease; }'
            + '@media (max-width: 1399px) { #fc-root { display:none !important; } #fc-collapse-bubble { display:none !important; } }'

            + '#fc-panel { display:flex; flex-direction:column; height:100%; background:rgba(255,255,255,0.92); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.5); border-right:none; border-radius:16px 0 0 16px; box-shadow:-4px 0 20px rgba(0,0,0,0.06); overflow:hidden; }'
            + 'body.dark-mode #fc-panel { background:rgba(15,23,42,0.9); border-color:rgba(255,255,255,0.1); }'

            + '.fc-header { padding:12px 16px; background:linear-gradient(135deg,#2563eb,#4f46e5); color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }'
            + '.fc-header-left { display:flex; align-items:center; gap:8px; }'
            + '.fc-header-title { font-weight:800; font-size:0.95em; }'
            + '.fc-header-sub { font-size:0.7em; opacity:0.8; margin-top:1px; }'

            + '#fc-toggle { background:rgba(255,255,255,0.15); border:none; color:white; cursor:pointer; font-size:1.2em; width:28px; height:28px; border-radius:6px; transition:0.2s; display:flex; align-items:center; justify-content:center; flex-shrink:0; }'
            + '#fc-toggle:hover { background:rgba(255,255,255,0.25); }'

            /* COLLAPSED state → small round button only */
            + '#fc-root.collapsed { width:auto; height:auto; top:auto; bottom:24px; right:16px; }'
            + '#fc-root.collapsed #fc-panel { display:none; }'
            + '#fc-collapse-bubble { display:none; position:fixed; bottom:24px; right:16px; z-index:10000; }'
            + '#fc-root.collapsed + #fc-collapse-bubble { display:block; }'
            + '#fc-bubble-btn { width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,#2563eb,#4f46e5); color:white; border:none; cursor:pointer; font-size:1.3em; box-shadow:0 4px 15px rgba(37,99,235,0.4); transition:0.3s; display:flex; align-items:center; justify-content:center; }'
            + '#fc-bubble-btn:hover { transform:scale(1.1); box-shadow:0 6px 20px rgba(37,99,235,0.5); }'

            + '.fc-msgs { flex:1; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:6px; background:#f8fafc; }'
            + 'body.dark-mode .fc-msgs { background:#0f172a; }'

            + '.fc-msg { max-width:88%; display:flex; flex-direction:column; }'
            + '.fc-msg.mine { align-self:flex-end; }'
            + '.fc-msg.others { align-self:flex-start; }'
            + '.fc-msg-name { font-size:0.68em; font-weight:700; color:#6b7280; margin-bottom:1px; }'
            + 'body.dark-mode .fc-msg-name { color:#94a3b8; }'
            + '.fc-msg.mine .fc-msg-name { text-align:right; }'
            + '.fc-msg-time { font-size:0.62em; color:#9ca3af; margin-bottom:1px; }'
            + 'body.dark-mode .fc-msg-time { color:#64748b; }'
            + '.fc-msg.mine .fc-msg-time { text-align:right; }'
            + '.fc-msg-bubble { padding:7px 12px; border-radius:12px; font-size:0.82em; line-height:1.4; word-break:break-word; }'
            + '.fc-msg.mine .fc-msg-bubble { background:linear-gradient(135deg,#2563eb,#4f46e5); color:white; border-bottom-right-radius:3px; }'
            + '.fc-msg.others .fc-msg-bubble { background:white; color:#1f2937; border:1px solid #e5e7eb; border-bottom-left-radius:3px; }'
            + 'body.dark-mode .fc-msg.others .fc-msg-bubble { background:#1e293b; color:#f8fafc; border-color:#334155; }'

            + '.fc-input-area { display:flex; padding:8px; gap:6px; background:white; border-top:1px solid #e5e7eb; flex-shrink:0; }'
            + 'body.dark-mode .fc-input-area { background:#1e293b; border-color:#334155; }'
            + '#fc-input { flex:1; padding:9px 12px; border:1px solid #e5e7eb; border-radius:16px; outline:none; font-size:0.82em; font-family:inherit; background:#f9fafb; }'
            + 'body.dark-mode #fc-input { background:#0f172a; border-color:#334155; color:#f8fafc; }'
            + '#fc-input:focus { border-color:#2563eb; background:white; }'
            + 'body.dark-mode #fc-input:focus { background:#1e293b; border-color:#60a5fa; }'
            + '#fc-send { background:#2563eb; color:white; border:none; width:34px; height:34px; border-radius:50%; cursor:pointer; font-size:0.9em; display:flex; align-items:center; justify-content:center; transition:0.2s; flex-shrink:0; }'
            + '#fc-send:hover { background:#1d4ed8; }'
            + '#fc-send:disabled { opacity:0.5; cursor:not-allowed; }'

            + '.fc-auth-prompt { padding:8px 12px; text-align:center; font-size:0.75em; color:#6b7280; background:#f9fafb; border-top:1px solid #e5e7eb; flex-shrink:0; }'
            + 'body.dark-mode .fc-auth-prompt { background:#0f172a; color:#94a3b8; border-color:#334155; }'
            + '.fc-auth-prompt a { color:#2563eb; font-weight:700; cursor:pointer; text-decoration:none; }'
            + '.fc-auth-prompt a:hover { text-decoration:underline; }'

            + '.fc-empty { text-align:center; color:#9ca3af; font-size:0.8em; padding:25px 10px; }'
            + '</style>'

            + '<div id="fc-panel">'
            + '<div class="fc-header" id="fc-header">'
            + '<div><div class="fc-header-title">💬 Chat cộng đồng</div><div class="fc-header-sub">Trò chuyện cùng mọi người</div></div>'
            + '<button id="fc-toggle">−</button>'
            + '</div>'
            + '<div class="fc-msgs" id="fc-msgs"><div class="fc-empty">Đang kết nối...</div></div>'
            + '<div id="fc-input-area" class="fc-input-area">'
            + '<input type="text" id="fc-input" placeholder="Nhập tin nhắn..." maxlength="500">'
            + '<button id="fc-send">➤</button>'
            + '</div>'
            + '<div class="fc-auth-prompt" id="fc-auth-prompt" style="display:none;">'
            + '<a id="fc-login-btn">Đăng nhập</a> để gửi tin nhắn'
            + '</div>'
            + '</div>'
            + '</div>'
            + '<div id="fc-collapse-bubble">'
            + '<button id="fc-bubble-btn">💬</button>'
            + '</div>';

        var temp = document.createElement('div');
        temp.innerHTML = html;
        while (temp.firstChild) {
            document.body.appendChild(temp.firstChild);
        }

        document.getElementById('fc-toggle').onclick = function (e) {
            e.stopPropagation();
            togglePanel();
        };
        document.getElementById('fc-header').onclick = function (e) {
            if (document.getElementById('fc-root').classList.contains('collapsed')) {
                togglePanel();
            }
        };
        document.getElementById('fc-bubble-btn').onclick = function () {
            togglePanel();
        };
        document.getElementById('fc-send').onclick = function () { sendMessage(); };
        document.getElementById('fc-input').onkeypress = function (e) {
            if (e.key === 'Enter') sendMessage();
        };
        var loginBtn = document.getElementById('fc-login-btn');
        if (loginBtn) {
            loginBtn.onclick = function () {
                var modal = document.getElementById('authModal');
                if (modal) modal.style.display = 'flex';
            };
        }

        shiftBodyOut();
    }

    function togglePanel() {
        var root = document.getElementById('fc-root');
        if (!root) return;
        var isCollapsed = root.classList.contains('collapsed');

        if (isCollapsed) {
            root.classList.remove('collapsed');
            document.getElementById('fc-toggle').textContent = '−';
            shiftBodyOut();
        } else {
            root.classList.add('collapsed');
            shiftBodyBack();
        }
    }

    function initChat() {
        chatInitialized = true;

        firebase.auth().onAuthStateChanged(function (user) {
            currentUser = user;
            var inputArea = document.getElementById('fc-input-area');
            var authPrompt = document.getElementById('fc-auth-prompt');
            if (user) {
                if (inputArea) inputArea.style.display = 'flex';
                if (authPrompt) authPrompt.style.display = 'none';
            } else {
                if (inputArea) inputArea.style.display = 'none';
                if (authPrompt) authPrompt.style.display = 'block';
            }
        });

        if (unsubscribe) unsubscribe();
        DB = firebase.firestore();

        unsubscribe = DB.collection('global_chats')
            .orderBy('createdAt', 'desc')
            .limit(30)
            .onSnapshot(function (snapshot) {
                var msgs = [];
                snapshot.forEach(function (doc) {
                    msgs.push({ id: doc.id, data: doc.data() });
                });
                msgs.reverse();
                renderMessages(msgs);
            }, function (err) {
                console.warn('Floating chat snapshot error:', err);
                var container = document.getElementById('fc-msgs');
                if (container) {
                    container.innerHTML = '<div class="fc-empty">Mất kết nối. Đang thử lại...</div>';
                }
            });
    }

    function renderMessages(msgs) {
        var container = document.getElementById('fc-msgs');
        if (!container) return;
        container.innerHTML = '';
        if (msgs.length === 0) {
            container.innerHTML = '<div class="fc-empty">Chưa có tin nhắn nào. Hãy là người đầu tiên!</div>';
            return;
        }

        msgs.forEach(function (m) {
            var d = m.data;
            var isMine = currentUser && d.userId === currentUser.uid;
            var div = document.createElement('div');
            div.className = 'fc-msg ' + (isMine ? 'mine' : 'others');
            var nameHtml = !isMine
                ? '<div class="fc-msg-name">' + escapeHTML(d.userName) + '</div>'
                : '';
            div.innerHTML = ''
                + nameHtml
                + '<div class="fc-msg-time">' + formatTime(d.createdAt) + '</div>'
                + '<div class="fc-msg-bubble">' + escapeHTML(d.text) + '</div>';
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    }

    function sendMessage() {
        if (!currentUser) return;
        var input = document.getElementById('fc-input');
        if (!input) return;
        var text = input.value.trim();
        if (!text) return;

        input.value = '';
        var sendBtn = document.getElementById('fc-send');
        if (sendBtn) sendBtn.disabled = true;

        DB.collection('global_chats').add({
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            text: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function (err) {
            console.error('Floating chat send error:', err);
            if (typeof Swal !== 'undefined') Swal.fire('Lỗi', 'Không thể gửi tin nhắn', 'error');
        }).then(function () {
            if (sendBtn) sendBtn.disabled = false;
        });
    }

    window.addEventListener('resize', function () {
        if (isWideScreen()) {
            var root = document.getElementById('fc-root');
            if (root && !root.classList.contains('collapsed')) {
                shiftBodyOut();
            }
        } else {
            shiftBodyBack();
        }
    });

    function boot() {
        injectChatUI();
        waitForFirebase(initChat);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
