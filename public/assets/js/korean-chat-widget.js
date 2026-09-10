/**
 * SIÊU WIDGET HỌC TẬP & GIAO LƯU CHO VUI HỌC TIẾNG HÀN 2027
 * File: korean-chat-widget.js
 * 100% Dữ liệu thực tế: Bạn bè, Chat, Q&A, Streak, Điểm Uy Tín
 */

(function () {
  function loadScript(src, callback) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = callback;
    document.head.appendChild(s);
  }

  function initFirebaseAndWidget() {
    if (typeof firebase === 'undefined') {
      loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js', function () {
        loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js', function () {
          loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js', function () {
            startWidgetApp();
          });
        });
      });
    } else {
      startWidgetApp();
    }
  }

  function startWidgetApp() {
    // Chế độ FORUM: load widget như 1 trang diễn đàn full-page (thay vì widget nổi)
    var IS_FORUM = window.location.pathname.indexOf('forum.html') > -1;
    if (IS_FORUM) document.body.classList.add('forum-page');

    var widgetContainer = document.createElement('div');
    widgetContainer.id = 'website-chat-container';
    widgetContainer.style.position = 'fixed';
    widgetContainer.style.bottom = '20px';
    widgetContainer.style.right = '20px';
    widgetContainer.style.zIndex = '99999';
    widgetContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    widgetContainer.innerHTML = `
      <style>
        @keyframes gentleSway {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-3deg); }
          75% { transform: translateY(-2px) rotate(3deg); }
        }
        .chat-floating-trigger-red {
          animation: gentleSway 3.5s ease-in-out infinite;
          box-shadow: 0 10px 30px rgba(220, 38, 38, 0.5);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .chat-floating-trigger-red:hover {
          animation-play-state: paused;
          transform: scale(1.06) translateY(-2px);
          box-shadow: 0 15px 35px rgba(220, 38, 38, 0.7);
        }
        .chat-responsive-box {
          width: min(92vw, 380px);
          height: min(calc(100vh - 120px), 500px);
          min-height: 350px;
          transition: width 0.25s ease, height 0.25s ease;
        }
        .chat-responsive-box.expanded {
          width: min(94vw, 640px);
          height: min(calc(100vh - 100px), 660px);
        }
        .flat-btn-edit {
          background: rgba(52, 211, 153, 0.12);
          border: 1px solid rgba(52, 211, 153, 0.28);
          color: #34d399;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 7px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          transition: background 0.15s;
        }
        .flat-btn-edit:hover { background: rgba(52, 211, 153, 0.22); }
        .flat-btn-delete {
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.28);
          color: #fb7185;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 7px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          transition: background 0.15s;
        }
        .flat-btn-delete:hover { background: rgba(244, 63, 94, 0.22); }
        /* ===== CHẾ ĐỘ FORUM FULL-PAGE ===== */
        body.forum-page { background: linear-gradient(135deg, #0f172a, #1e1b4b 60%, #4c1d95); background-attachment: fixed; }
        body.forum-page #website-chat-container {
          position: static !important;
          width: 100% !important;
          height: auto !important;
          z-index: auto !important;
          display: flex !important;
          flex-direction: column;
          align-items: center;
          padding: 0 14px 40px;
          box-sizing: border-box;
        }
        body.forum-page #chat-toggle-btn { display: none !important; }
        body.forum-page #chat-box {
          display: flex !important;
          width: min(860px, 96vw) !important;
          height: min(680px, calc(100vh - 190px)) !important;
          min-height: 460px;
          margin: 0 auto !important;
          border-radius: 24px !important;
          border: 1px solid #334155 !important;
          zoom: 1.18;
        }
        body.forum-page .forum-page-title {
          display: flex !important;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          width: min(860px, 96vw);
          margin: 30px auto 8px;
          background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #7c3aed 100%);
          border-radius: 22px;
          padding: 30px 34px;
          color: #fff;
          box-shadow: 0 18px 40px rgba(220,38,38,.2);
          overflow: hidden;
          box-sizing: border-box;
        }
        body.forum-page .forum-page-title::before {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.13) 1px, transparent 1px);
          background-size: 22px 22px; opacity: .45; pointer-events: none;
        }
        body.forum-page .forum-page-title::after {
          content: ''; position: absolute; width: 240px; height: 240px; border-radius: 50%;
          background: rgba(255,255,255,.18); filter: blur(64px);
          top: -80px; right: -60px; pointer-events: none;
        }
        .fpt-left { position: relative; z-index: 1; min-width: 0; }
        body.forum-page .forum-page-title .fpt-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,.16); color: #fff;
          font-size: .8em; font-weight: 800; padding: 6px 14px; border-radius: 99px;
          letter-spacing: .6px; text-transform: uppercase;
          backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,.24); margin-bottom: 14px;
        }
        body.forum-page .forum-page-title h1 {
          font-size: 2em; font-weight: 900; margin: 0; letter-spacing: -0.5px; line-height: 1.15;
          background: linear-gradient(120deg, #fff 35%, rgba(255,255,255,.5));
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        body.forum-page .forum-page-title p {
          color: rgba(255,255,255,.88); font-size: .95em; margin: 9px 0 0; font-weight: 500;
        }
        .fpt-right { position: relative; z-index: 1; flex-shrink: 0; }
        .fpt-icon {
          width: 110px; height: 110px; border-radius: 50%;
          background: rgba(255,255,255,.16); border: 1.5px solid rgba(255,255,255,.34);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 22px 44px rgba(0,0,0,.22), inset 0 0 34px rgba(255,255,255,.12);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: fptFloat 4s ease-in-out infinite;
        }
        @keyframes fptFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @media (max-width: 768px) {
          body.forum-page #chat-box { zoom: 1; height: calc(100vh - 150px); width: 100% !important; border-radius: 18px !important; }
          body.forum-page .forum-page-title { padding: 24px 22px; flex-direction: column; align-items: flex-start; width: 100%; }
          body.forum-page .forum-page-title .fpt-right { position: absolute; top: 18px; right: 14px; }
          body.forum-page .forum-page-title .fpt-icon { width: 60px; height: 60px; }
          body.forum-page .forum-page-title .fpt-icon svg { width: 30px !important; height: 30px !important; }
          body.forum-page .forum-page-title h1 { padding-right: 64px; }
          body.forum-page .forum-page-title h1 { font-size: 1.5em; }
        }
      </style>

      <!-- TIÊU ĐỀ TRANG (chỉ hiện ở chế độ forum) -->
      <div class="forum-page-title" style="display:none;">
        <div class="fpt-left">
          <div class="fpt-tag">💬 Cộng đồng</div>
          <h1>Diễn Đàn Vui Học Tiếng Hàn</h1>
          <p>Giao lưu, hỏi đáp, kết bạn và nhắn tin cùng cộng đồng</p>
        </div>
        <div class="fpt-right">
          <div class="fpt-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" width="52" height="52" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg>
          </div>
        </div>
      </div>

      <!-- NÚT MỞ PHÒNG CHAT -->
      <button id="chat-toggle-btn" class="chat-floating-trigger-red" onclick="window.vuiHocChat.toggleChatWindow()" style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 50px; padding: 10px 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px;">
        <div style="width: 28px; height: 28px; border-radius: 50%; background: white; padding: 2px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
          <svg viewBox="0 0 100 100" style="width: 22px; height: 22px;">
            <rect x="20" y="15" width="14" height="70" rx="7" fill="#1e3a8a" />
            <path d="M 40 45 A 25 25 0 0 1 78 20" fill="none" stroke="#dc2626" stroke-width="12" stroke-linecap="round" />
            <path d="M 40 55 A 25 25 0 0 0 78 80" fill="none" stroke="#1e3a8a" stroke-width="12" stroke-linecap="round" />
            <circle cx="68" cy="42" r="5" fill="#1e3a8a" />
            <circle cx="68" cy="58" r="5" fill="#1e3a8a" />
          </svg>
        </div>
        <span id="btn-chat-text" style="letter-spacing: 0.2px;">Phòng chat</span>
      </button>

      <!-- KHUNG WIDGET CHÍNH -->
      <div id="chat-box" class="chat-responsive-box" style="display: none; background: #0f172a; border: 1px solid #334155; border-radius: 20px; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8); margin-bottom: 10px;">
        
        <!-- Header -->
        <div style="background: #020617; border-bottom: 1px solid #1e293b; color: white;">
          <div style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <div style="width: 26px; height: 26px; border-radius: 50%; background: white; padding: 2px; display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 100 100" style="width: 20px; height: 20px;">
                  <rect x="20" y="15" width="14" height="70" rx="7" fill="#1e3a8a" />
                  <path d="M 40 45 A 25 25 0 0 1 78 20" fill="none" stroke="#dc2626" stroke-width="12" stroke-linecap="round" />
                  <path d="M 40 55 A 25 25 0 0 0 78 80" fill="none" stroke="#1e3a8a" stroke-width="12" stroke-linecap="round" />
                  <circle cx="68" cy="42" r="5" fill="#1e3a8a" />
                  <circle cx="68" cy="58" r="5" fill="#1e3a8a" />
                </svg>
              </div>
              <div style="min-width: 0;">
                <div style="font-size: 12px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Vui Học Tiếng Hàn</div>
                <div id="chat-user-label" style="font-size: 10px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Đang kết nối Google...</div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
              <button id="btn-expand-modal" onclick="window.vuiHocChat.toggleExpandChatModal()" title="Phóng to / Thu gọn" style="background: #1e293b; border: 1px solid #334155; color: #cbd5e1; border-radius: 6px; width: 26px; height: 26px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center;">⤢</button>
              <button onclick="window.vuiHocChat.toggleChatWindow()" title="Thu nhỏ (-)" style="background: #1e293b; border: 1px solid #334155; color: #cbd5e1; border-radius: 6px; width: 26px; height: 26px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;">−</button>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div style="display: flex; border-top: 1px solid #1e293b; background: #090d16;">
            <button id="tab-btn-chat" onclick="window.vuiHocChat.switchWidgetTab('chat')" style="flex: 1; padding: 8px; font-size: 12px; font-weight: bold; border: none; background: #dc2626; color: white; cursor: pointer;">💬 Chat</button>
            <button id="tab-btn-qa" onclick="window.vuiHocChat.switchWidgetTab('qa')" style="flex: 1; padding: 8px; font-size: 12px; font-weight: bold; border: none; background: transparent; color: #94a3b8; cursor: pointer;">❓ Hỏi Đáp</button>
            <button id="tab-btn-friends" onclick="window.vuiHocChat.switchWidgetTab('friends')" style="flex: 1; padding: 8px; font-size: 12px; font-weight: bold; border: none; background: transparent; color: #94a3b8; cursor: pointer;">👥 Bạn Bè</button>
          </div>
        </div>

        <!-- TAB 1: PHÒNG CHAT CỘNG ĐỒNG -->
        <div id="tab-content-chat" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #0b1120;">
          <div id="chat-messages-stream" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
            <div style="text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">Đang tải tin nhắn...</div>
          </div>
          <form id="chat-form" style="padding: 8px; background: #020617; border-top: 1px solid #1e293b; display: flex; gap: 6px;">
            <input id="chat-input" type="text" placeholder="Nhập tin nhắn..." style="flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: white; padding: 7px 10px; font-size: 12px; outline: none;" disabled />
            <button type="submit" id="chat-send-btn" style="background: #dc2626; color: white; border: none; border-radius: 8px; padding: 7px 12px; font-size: 12px; cursor: pointer; font-weight: bold;" disabled>Gửi</button>
          </form>
        </div>

        <!-- TAB 2: DIỄN ĐÀN HỎI ĐÁP -->
        <div id="tab-content-qa" style="flex: 1; display: none; flex-direction: column; overflow: hidden; background: #0b1120;">
          <div id="qa-list-view" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
            <div style="padding: 8px 12px; background: #0f172a; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; color: #cbd5e1; font-weight: bold;">Diễn đàn Hỏi & Đáp</span>
              <button onclick="window.vuiHocChat.toggleNewQuestionForm()" style="background: #059669; color: white; border: none; border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: bold; cursor: pointer;">+ Đăng Câu Hỏi</button>
            </div>
            <div id="new-question-form" style="display: none; padding: 10px; background: #020617; border-bottom: 1px solid #334155;">
              <input id="qa-title-input" type="text" placeholder="Tiêu đề câu hỏi..." style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #475569; border-radius: 6px; color: white; padding: 6px 8px; font-size: 12px; margin-bottom: 6px; outline: none;" />
              <textarea id="qa-content-input" placeholder="Nội dung chi tiết..." style="width: 100%; box-sizing: border-box; height: 50px; background: #1e293b; border: 1px solid #475569; border-radius: 6px; color: white; padding: 6px 8px; font-size: 12px; resize: none; margin-bottom: 6px; outline: none;"></textarea>
              <button onclick="window.vuiHocChat.submitNewQuestion()" style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: bold; cursor: pointer;">Đăng ngay</button>
            </div>
            <div id="qa-stream" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
              <div style="text-align: center; color: #64748b; font-size: 12px;">Đang tải câu hỏi...</div>
            </div>
          </div>

          <div id="qa-thread-view" style="flex: 1; display: none; flex-direction: column; overflow: hidden; background: #0b1120;">
            <div style="padding: 8px 12px; background: #020617; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between;">
              <button onclick="window.vuiHocChat.closeQAThread()" style="background: none; border: none; color: #f87171; font-size: 12px; cursor: pointer; font-weight: bold;">← Quay lại</button>
              <span style="font-size: 11px; color: #94a3b8;">Thảo luận câu hỏi</span>
            </div>
            <div id="qa-thread-header-content" style="padding: 10px 12px; background: #131d31; border-bottom: 1px solid #1e293b;"></div>
            <div id="qa-comments-stream" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px;"></div>
            <form id="qa-reply-form" style="padding: 8px; background: #020617; border-top: 1px solid #1e293b; display: flex; flex-direction: column; gap: 4px;">
              <div id="reply-indicator" style="display: none; font-size: 11px; color: #f87171; justify-content: space-between; align-items: center; padding: 2px 4px;">
                <span id="reply-indicator-text">Đang trả lời @...</span>
                <button type="button" onclick="window.vuiHocChat.cancelReplyTo()" style="background: none; border: none; color: #f87171; cursor: pointer;">✕ Hủy</button>
              </div>
              <div style="display: flex; gap: 6px;">
                <input id="qa-reply-input" type="text" placeholder="Viết câu trả lời của bạn..." style="flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: white; padding: 6px 10px; font-size: 12px; outline: none;" />
                <button type="submit" style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: bold;">Gửi</button>
              </div>
            </form>
          </div>
        </div>

        <!-- TAB 3: BẠN BÈ & NHẮN TIN RIÊNG (100% REALTIME) -->
        <div id="tab-content-friends" style="flex: 1; display: none; flex-direction: column; overflow: hidden; background: #0b1120;">
          <div id="friends-main-view" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px;">
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #f59e0b; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                <span>📩 LỜI MỜI KẾT BẠN ĐÃ NHẬN</span>
                <span id="badge-received-count" style="background: #f59e0b; color: #020617; font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: bold; display: none;">0</span>
              </div>
              <div id="received-requests-stream" style="display: flex; flex-direction: column; gap: 6px;">
                <div style="font-size: 11px; color: #64748b;">Không có lời mời nào.</div>
              </div>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #94a3b8; margin-bottom: 6px;">
                <span>📤 LỜI MỜI ĐÃ GỬI (ĐANG CHỜ DUYỆT)</span>
              </div>
              <div id="sent-requests-stream" style="display: flex; flex-direction: column; gap: 6px;">
                <div style="font-size: 11px; color: #64748b;">Không có lời mời nào đã gửi.</div>
              </div>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #10b981; margin-bottom: 6px;">
                <span>🤝 BẠN BÈ ĐÃ KẾT NỐI</span>
              </div>
              <div id="friends-list-stream" style="display: flex; flex-direction: column; gap: 6px;">
                <div style="font-size: 11px; color: #64748b;">Chưa có bạn bè. Hãy kết bạn trong khung chat nhé!</div>
              </div>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #818cf8; margin-bottom: 6px;">
                <span>💬 LỊCH SỬ TIN NHẮN RIÊNG</span>
              </div>
              <div id="recent-dms-stream" style="display: flex; flex-direction: column; gap: 6px;">
                <div style="font-size: 11px; color: #64748b;">Chưa có cuộc trò chuyện riêng nào.</div>
              </div>
            </div>
          </div>

          <div id="direct-chat-view" style="flex: 1; display: none; flex-direction: column; background: #0b1120;">
            <div style="padding: 8px 12px; background: #020617; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between;">
              <button onclick="window.vuiHocChat.closeDirectChat()" style="background: none; border: none; color: #f87171; font-size: 12px; cursor: pointer; font-weight: bold;">← Quay lại</button>
              <span id="dm-partner-name" style="font-size: 12px; font-weight: bold; color: white;">Nhắn tin riêng</span>
              <span></span>
            </div>
            <div id="dm-messages-stream" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 6px;"></div>
            <form id="dm-form" style="padding: 8px; background: #020617; border-top: 1px solid #1e293b; display: flex; gap: 6px;">
              <input id="dm-input" type="text" placeholder="Nhập tin nhắn riêng..." style="flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: white; padding: 6px 10px; font-size: 12px; outline: none;" />
              <button type="submit" style="background: #dc2626; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: bold;">Gửi</button>
            </form>
          </div>
        </div>

      </div>

      <!-- PROFILE THÀNH VIÊN VỚI THỐNG KÊ THỰC TẾ -->
      <div id="profile-modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(2,6,23,0.85); backdrop-filter: blur(8px); z-index: 100000; align-items: center; justify-content: center; padding: 14px;">
        <div style="background: #090e1a; border: 1px solid #334155; border-radius: 20px; width: 100%; max-width: 480px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.8); display: flex; flex-direction: column; max-height: 90vh;">
          <div style="height: 48px; background: linear-gradient(135deg, #7f1d1d, #0f172a 60%, #1e1b4b); position: relative; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; flex-shrink: 0;">
            <span style="font-size: 11px; background: rgba(2,6,23,0.75); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; padding: 3px 10px; border-radius: 20px; font-weight: bold;">⭐ Vui Học Tiếng Hàn</span>
            <button onclick="window.vuiHocChat.closeProfileModal()" style="background: rgba(2,6,23,0.7); border: 1px solid #334155; color: #94a3b8; border-radius: 8px; width: 26px; height: 26px; cursor: pointer; font-size: 13px; font-weight: bold; display: flex; align-items: center; justify-content: center;">✕</button>
          </div>

          <div style="padding: 16px 18px 18px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img id="modal-profile-avatar" src="" style="width: 68px; height: 68px; border-radius: 16px; object-fit: cover; border: 2px solid #334155; background: #1e293b; box-shadow: 0 8px 16px rgba(0,0,0,0.4); flex-shrink: 0;" />
              <div style="flex: 1; min-width: 0;">
                <div id="modal-profile-name" style="font-size: 17px; font-weight: 900; color: #ffffff; line-height: 1.2; word-break: break-word;"></div>
                <div id="modal-profile-rank" style="display: inline-block; font-size: 11px; font-weight: 800; color: #fbbf24; background: rgba(120, 53, 15, 0.3); border: 1px solid rgba(180, 83, 9, 0.45); padding: 2px 10px; border-radius: 20px; margin-top: 5px;">🌱 Thường Dân</div>
                <div id="modal-profile-role" style="font-size: 12px; color: #f87171; font-weight: 600; margin-top: 3px;">Thành viên cộng đồng</div>
              </div>
              <span id="modal-profile-status" style="font-size: 11px; color: #34d399; font-weight: bold; background: #022c22; border: 1px solid #065f46; padding: 3px 8px; border-radius: 8px; flex-shrink: 0;">🟢 Trực tuyến</span>
            </div>

            <div id="modal-profile-bio-box" style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; font-weight: bold; color: #94a3b8;">💬 Châm Ngôn & Động Lực Học Tập</span>
                <button id="modal-btn-edit-bio" onclick="window.vuiHocChat.editMyProfileBio()" class="flat-btn-edit" style="display: none;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  <span>Chỉnh sửa status</span>
                </button>
              </div>
              <div id="modal-profile-bio" style="color: #cbd5e1; font-size: 12px; line-height: 1.5; font-style: italic;">
                "Học tiếng Hàn mỗi ngày, chạm tay vào giấc mơ Hàn Quốc! 🇰🇷✨"
              </div>
            </div>

            <!-- 4 THẺ THỐNG KÊ THỰC TẾ -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div style="background: rgba(120, 53, 15, 0.25); border: 1px solid rgba(180, 83, 9, 0.4); border-radius: 12px; padding: 10px;">
                <div style="font-size: 11px; font-weight: bold; color: #fbbf24;">🔥 Streak Chuỗi</div>
                <div id="modal-profile-streak" style="font-size: 16px; font-weight: 900; color: #fef08a; margin-top: 2px;">1 ngày</div>
                <div style="font-size: 10px; color: #d97706;">Học liên tục mỗi ngày</div>
              </div>
              <div style="background: rgba(49, 46, 129, 0.25); border: 1px solid rgba(67, 56, 202, 0.4); border-radius: 12px; padding: 10px;">
                <div style="font-size: 11px; font-weight: bold; color: #818cf8;">⭐ Điểm EXP</div>
                <div id="modal-profile-points" style="font-size: 16px; font-weight: 900; color: #c7d2fe; margin-top: 2px;">0 EXP</div>
                <div style="font-size: 10px; color: #6366f1;">Tích lũy từ hoạt động</div>
              </div>
              <div style="background: rgba(6, 78, 59, 0.25); border: 1px solid rgba(4, 120, 87, 0.4); border-radius: 12px; padding: 10px;">
                <div style="font-size: 11px; font-weight: bold; color: #34d399;">⏱️ Tổng Thời Gian Học</div>
                <div id="modal-profile-active" style="font-size: 13px; font-weight: 800; color: #a7f3d0; margin-top: 2px;">0 phút</div>
                <div id="modal-profile-active-sub" style="font-size: 10px; color: #059669;">Tổng thời gian học tập</div>
              </div>
              <div style="background: rgba(136, 19, 55, 0.25); border: 1px solid rgba(190, 18, 60, 0.4); border-radius: 12px; padding: 10px;">
                <div style="font-size: 11px; font-weight: bold; color: #fb7185;">📚 Học Hôm Nay</div>
                <div id="modal-profile-today" style="font-size: 13px; font-weight: 800; color: #fecdd3; margin-top: 2px;">0 phút</div>
                <div style="font-size: 10px; color: #e11d48;">Thời gian học hôm nay</div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; padding-top: 4px; border-top: 1px solid #1e293b;">
              <button id="modal-btn-friend" onclick="window.vuiHocChat.handleProfileFriendAction()" style="flex: 1; padding: 10px; border-radius: 10px; border: none; font-size: 12px; font-weight: bold; cursor: pointer; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(220,38,38,0.3);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                <span>Kết Bạn</span>
              </button>
              <button id="modal-btn-dm" onclick="window.vuiHocChat.handleProfileDirectMessage()" style="flex: 1; padding: 10px; border-radius: 10px; border: 1px solid #334155; background: #1e293b; color: white; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>Nhắn Tin Riêng</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widgetContainer);

    // Cấu hình Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyCoKD1zD63pQ-QotSTGFn0i8KMQmXzl8EU",
      authDomain: "vuihoctienghan2027.firebaseapp.com",
      projectId: "vuihoctienghan2027",
      storageBucket: "vuihoctienghan2027.firebasestorage.app",
      messagingSenderId: "346757373399",
      appId: "1:346757373399:web:526625b339fc9a1a523f92",
      measurementId: "G-JHCHNDDY1S"
    };

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const db = firebase.firestore();
    const ADMIN_EMAILS = ['nmhieu2526@gmail.com', 'vuihoctienghan27@gmail.com'];

    let chatBoxOpen = false;
    let isChatBoxExpanded = false;
    let currentLoggedUser = null;
    let isCurrentUserAdmin = false;
    let activeDMPartner = null;
    let dmUnsubscribe = null;
    let activeQuestionThreadId = null;
    let qaThreadUnsubscribe = null;
    let replyingToCommentUser = null;
    let modalTargetUser = null;

    const KOREAN_MOTIVATIONAL_QUOTES = [
      "Học tiếng Hàn mỗi ngày, chạm tay vào giấc mơ Hàn Quốc! 🇰🇷✨",
      "Chăm chỉ tích lũy từ vựng hôm nay, ngày mai tự tin giao tiếp cùng người bản xứ! 📚🔥",
      "Không có con đường nào bằng phẳng, mỗi chữ Hangul học được là một bước tiến xa! 🚀",
      "Cùng nhau trao đổi ngữ pháp, luyện đề TOPIK và chinh phục mục tiêu! 🎯",
      "Kiên trì là chìa khóa mở cánh cửa ngôn ngữ mới. Cố lên nhé! 💪🌱",
      "Mỗi ngày 15 phút tiếng Hàn hơn là 3 tiếng một lần mỗi tuần! ⏱️📖",
      "Biến đam mê văn hóa Hàn Quốc thành năng lực giao tiếp thực tế! 🇰🇷🎧",
      "Tập trung vào sự tiến bộ của bản thân, hôm nay tốt hơn hôm qua là thành công! 🌟",
      "Thành công trong tiếng Hàn bắt đầu từ những thói quen học tập nhỏ nhất! 💡",
      "Học một ngôn ngữ mới là mở ra một thế giới mới. Chúc bạn học thật vui! 🌸",
      "Đừng sợ nói sai, sai lầm hôm nay là bài học cho sự lưu loát ngày mai! 🗣️✨",
      "Học tiếng Hàn không khó khi ta có đồng đội cùng tiến bước! 🤝🔥"
    ];

    function getRandomQuoteForUser(userId) {
      if (!userId) return KOREAN_MOTIVATIONAL_QUOTES[0];
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = (hash << 5) - hash + userId.charCodeAt(i);
        hash |= 0;
      }
      return KOREAN_MOTIVATIONAL_QUOTES[Math.abs(hash) % KOREAN_MOTIVATIONAL_QUOTES.length];
    }

    function formatStudyDuration(totalMinutes) {
      totalMinutes = totalMinutes || 0;
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      if (h > 0) return h + ' giờ ' + (m > 0 ? m + ' phút' : '');
      return m + ' phút';
    }

    // Hạng thành viên theo tổng EXP — khớp mypage.html (getLevelInfo)
    function getMemberRank(totalExp) {
      if (totalExp > 3000) return { name: 'Trạng Nguyên', icon: '👑' };
      if (totalExp >= 1001) return { name: 'Thượng Thư', icon: '📜' };
      if (totalExp >= 401) return { name: 'Tú Tài', icon: '🖋️' };
      if (totalExp >= 51) return { name: 'Sĩ Tử', icon: '🕯️' };
      return { name: 'Thường Dân', icon: '🌱' };
    }

    function rewardUserPoints(pointsToAdd) {
      if (!currentLoggedUser) return;
      db.collection('users').doc(currentLoggedUser.uid).set({
        reputation: firebase.firestore.FieldValue.increment(pointsToAdd)
      }, { merge: true });
    }

    /* ============================================================
       ONLINE TRACKER — Tính toàn bộ thời gian online trên web
       (không giới hạn trang/chế độ học)
       - Dừng khi: đổi tab, idle 10 phút
       - Cứ 1 phút hợp lệ → ghi +1 vào totalOnlineMinutes & dailyOnlineData
    ============================================================ */
    var ONLINE_IDLE_MS = 10 * 60 * 1000;
    var onlineLastActivity = Date.now();
    var onlineTabVisible = !document.hidden;
    var onlineTrackerStarted = false;

    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(function(evt) {
      document.addEventListener(evt, function() { onlineLastActivity = Date.now(); }, { passive: true });
    });
    document.addEventListener('visibilitychange', function() {
      onlineTabVisible = !document.hidden;
      if (!document.hidden) onlineLastActivity = Date.now();
    });

    function localDateStr() {
      var d = new Date();
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    }

    function onlineIsIdle() {
      return (Date.now() - onlineLastActivity) > ONLINE_IDLE_MS;
    }

    function onlineTick() {
      if (!currentLoggedUser) return;
      if (!onlineTabVisible || onlineIsIdle()) return;
      var today = localDateStr();
      var updates = {
        totalOnlineMinutes: firebase.firestore.FieldValue.increment(1)
      };
      updates['dailyOnlineData.' + today] = firebase.firestore.FieldValue.increment(1);
      db.collection('users').doc(currentLoggedUser.uid).set(updates, { merge: true })
        .catch(function(e) { console.log('[OnlineTracker] write error', e); });
    }

    function startOnlineTracker() {
      if (onlineTrackerStarted) return;
      onlineTrackerStarted = true;
      setInterval(onlineTick, 60 * 1000);
    }
    /* ============================================================ */

    window.vuiHocChat = {
      toggleChatWindow: function () {
        chatBoxOpen = !chatBoxOpen;
        document.getElementById('chat-box').style.display = chatBoxOpen ? 'flex' : 'none';
        document.getElementById('btn-chat-text').innerText = chatBoxOpen ? 'Đóng phòng chat' : 'Phòng chat';
      },
      toggleExpandChatModal: function () {
        isChatBoxExpanded = !isChatBoxExpanded;
        const box = document.getElementById('chat-box');
        const btn = document.getElementById('btn-expand-modal');
        if (isChatBoxExpanded) {
          box.classList.add('expanded');
          btn.innerText = '⤡';
          btn.title = 'Thu gọn kích thước';
        } else {
          box.classList.remove('expanded');
          btn.innerText = '⤢';
          btn.title = 'Phóng to khung chat';
        }
      },
      switchWidgetTab: function (tabName) {
        ['chat', 'qa', 'friends'].forEach(t => {
          document.getElementById('tab-content-' + t).style.display = (t === tabName) ? 'flex' : 'none';
          const btn = document.getElementById('tab-btn-' + t);
          if (t === tabName) {
            btn.style.background = '#dc2626';
            btn.style.color = 'white';
          } else {
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
          }
        });
        if (tabName === 'qa') window.vuiHocChat.loadQuestionsList();
        if (tabName === 'friends') window.vuiHocChat.loadFriendsAndDMs();
      },
      toggleNewQuestionForm: function () {
        const f = document.getElementById('new-question-form');
        f.style.display = (f.style.display === 'none') ? 'block' : 'none';
      },
      loadQuestionsList: function () {
        const qaStream = document.getElementById('qa-stream');
        db.collection('questions').orderBy('createdAt', 'desc').limit(20).onSnapshot(function (snapshot) {
          qaStream.innerHTML = '';
          if (snapshot.empty) {
            qaStream.innerHTML = '<div style="text-align:center; color:#64748b; font-size:12px; padding:20px;">Chưa có câu hỏi nào. Bấm nút "+ Đăng Câu Hỏi" phía trên nhé!</div>';
            return;
          }
          snapshot.forEach(function (doc) {
            const q = doc.data();
            const isAuthor = currentLoggedUser && currentLoggedUser.uid === q.userId;
            const canManageQ = isAuthor || isCurrentUserAdmin;
            const card = document.createElement('div');
            card.style.background = '#1e293b';
            card.style.padding = '10px 12px';
            card.style.borderRadius = '10px';
            card.style.border = '1px solid #334155';
            card.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
                <div style="font-size: 13px; font-weight: bold; color: #f87171; margin-bottom: 4px; cursor: pointer; flex: 1;" onclick="window.vuiHocChat.openQAThread('${doc.id}', ${JSON.stringify(q).replace(/"/g, '&quot;')})">❓ ${q.title}</div>
                ${canManageQ ? `<div style="display: flex; gap: 4px;"><button onclick="window.vuiHocChat.editQuestion('${doc.id}', '${q.title.replace(/'/g, "\\'")}', '${q.content.replace(/'/g, "\\'")}')" class="flat-btn-edit">Sửa</button><button onclick="window.vuiHocChat.deleteQuestion('${doc.id}')" class="flat-btn-delete">Xóa</button></div>` : ''}
              </div>
              <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer;" onclick="window.vuiHocChat.openQAThread('${doc.id}', ${JSON.stringify(q).replace(/"/g, '&quot;')})">${q.content}</div>
              <div style="font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
                <span>Bởi: <strong>${q.userName}</strong></span>
                <span style="color: #f87171; font-weight: bold; cursor: pointer;" onclick="window.vuiHocChat.openQAThread('${doc.id}', ${JSON.stringify(q).replace(/"/g, '&quot;')})">💬 Xem & Trả lời →</span>
              </div>
            `;
            qaStream.appendChild(card);
          });
        });
      },
      submitNewQuestion: function () {
        if (!currentLoggedUser) return alert("Vui lòng đăng nhập Google để đăng câu hỏi!");
        const title = document.getElementById('qa-title-input').value.trim();
        const content = document.getElementById('qa-content-input').value.trim();
        if (!title || !content) return alert("Vui lòng nhập cả tiêu đề và nội dung!");
        db.collection('questions').add({
          title: title,
          content: content,
          userId: currentLoggedUser.uid,
          userName: currentLoggedUser.displayName || 'Thành viên',
          userAvatar: currentLoggedUser.photoURL || '',
          createdAt: Date.now(),
          timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }).then(function () {
          rewardUserPoints(10);
          document.getElementById('qa-title-input').value = '';
          document.getElementById('qa-content-input').value = '';
          window.vuiHocChat.toggleNewQuestionForm();
        });
      },
      editQuestion: function (qId, oldTitle, oldContent) {
        const newTitle = prompt("Chỉnh sửa tiêu đề câu hỏi:", oldTitle);
        if (!newTitle) return;
        const newContent = prompt("Chỉnh sửa nội dung câu hỏi:", oldContent);
        if (!newContent) return;
        db.collection('questions').doc(qId).update({
          title: newTitle.trim(),
          content: newContent.trim() + ' (đã chỉnh sửa)'
        });
      },
      deleteQuestion: function (qId) {
        if (confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) {
          db.collection('questions').doc(qId).delete();
          if (activeQuestionThreadId === qId) window.vuiHocChat.closeQAThread();
        }
      },
      openQAThread: function (questionId, qData) {
        activeQuestionThreadId = questionId;
        document.getElementById('qa-list-view').style.display = 'none';
        document.getElementById('qa-thread-view').style.display = 'flex';
        document.getElementById('qa-thread-header-content').innerHTML = `
          <div style="font-size: 13px; font-weight: bold; color: #f87171; margin-bottom: 4px;">❓ ${qData.title}</div>
          <div style="font-size: 12px; color: #e2e8f0; line-height: 1.4; margin-bottom: 6px;">${qData.content}</div>
          <div style="font-size: 10px; color: #94a3b8;">Đăng bởi: <strong>${qData.userName}</strong> • ${qData.timestamp}</div>
        `;
        const commentsStream = document.getElementById('qa-comments-stream');
        if (qaThreadUnsubscribe) qaThreadUnsubscribe();
        qaThreadUnsubscribe = db.collection('questions').doc(questionId).collection('comments').orderBy('createdAt', 'asc').onSnapshot(function (snapshot) {
          commentsStream.innerHTML = '';
          if (snapshot.empty) {
            commentsStream.innerHTML = '<div style="text-align:center; color:#64748b; font-size:11px; padding:15px;">Chưa có bình luận nào. Hãy gửi câu trả lời đầu tiên!</div>';
            return;
          }
          snapshot.forEach(function (cDoc) {
            const c = cDoc.data();
            const isMyComment = currentLoggedUser && currentLoggedUser.uid === c.userId;
            const canManage = isMyComment || isCurrentUserAdmin;
            const cDiv = document.createElement('div');
            cDiv.style.background = '#1e293b';
            cDiv.style.padding = '8px 10px';
            cDiv.style.borderRadius = '8px';
            cDiv.style.border = '1px solid #334155';
            cDiv.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: bold; color: #93c5fd; cursor: pointer;" onclick="window.vuiHocChat.openUserProfileModal('${c.userId}', '${c.userName}', '${c.userAvatar}')">${c.userName}</span>
                <span style="font-size: 10px; color: #64748b;">${c.timestamp || ''}</span>
              </div>
              <div style="color: #cbd5e1; font-size: 12px; line-height: 1.4; margin-bottom: 6px; word-break: break-word;">${c.content}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px;">
                <button onclick="window.vuiHocChat.replyToComment('${c.userName}')" style="background: none; border: none; color: #f87171; cursor: pointer; font-weight: bold;">💬 Trả lời</button>
                ${canManage ? `<button onclick="window.vuiHocChat.deleteComment('${cDoc.id}')" class="flat-btn-delete">Xóa</button>` : ''}
              </div>
            `;
            commentsStream.appendChild(cDiv);
          });
          commentsStream.scrollTop = commentsStream.scrollHeight;
        });
      },
      closeQAThread: function () {
        document.getElementById('qa-thread-view').style.display = 'none';
        document.getElementById('qa-list-view').style.display = 'flex';
        if (qaThreadUnsubscribe) qaThreadUnsubscribe();
        window.vuiHocChat.cancelReplyTo();
      },
      replyToComment: function (userName) {
        document.getElementById('reply-indicator').style.display = 'flex';
        document.getElementById('reply-indicator-text').innerText = 'Đang trả lời @' + userName;
        const input = document.getElementById('qa-reply-input');
        input.value = '@' + userName + ' ';
        input.focus();
      },
      cancelReplyTo: function () {
        document.getElementById('reply-indicator').style.display = 'none';
      },
      deleteComment: function (commentId) {
        if (confirm("Bạn có chắc muốn xóa bình luận này?")) {
          db.collection('questions').doc(activeQuestionThreadId).collection('comments').doc(commentId).delete();
        }
      },
      loadFriendsAndDMs: function () {
        if (!currentLoggedUser) return;
        const myUid = currentLoggedUser.uid;

        // Lời mời đã nhận
        db.collection('friend_requests').where('receiverId', '==', myUid).onSnapshot(function (snap) {
          const recStream = document.getElementById('received-requests-stream');
          const badge = document.getElementById('badge-received-count');
          recStream.innerHTML = '';
          if (snap.empty) {
            recStream.innerHTML = '<div style="font-size: 11px; color: #64748b;">Không có lời mời nào.</div>';
            badge.style.display = 'none';
            return;
          }
          badge.style.display = 'inline-block';
          badge.innerText = snap.size;
          snap.forEach(function (doc) {
            const req = doc.data();
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.background = '#1e293b';
            row.style.padding = '6px 8px';
            row.style.borderRadius = '6px';
            row.innerHTML = `
              <div style="display: flex; align-items: center; gap: 6px; cursor: pointer;" onclick="window.vuiHocChat.openUserProfileModal('${req.senderId}', '${req.senderName}', '${req.senderAvatar}')">
                <img src="${req.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" />
                <span style="font-size: 12px; font-weight: bold; color: white;">${req.senderName}</span>
              </div>
              <div style="display: flex; gap: 4px;">
                <button onclick="window.vuiHocChat.acceptFriendRequest('${doc.id}', '${req.senderId}', '${req.senderName.replace(/'/g, "\\'")}', '${req.senderAvatar || ''}')" style="background: #059669; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-weight: bold; cursor: pointer;">Chấp nhận</button>
                <button onclick="window.vuiHocChat.declineFriendRequest('${doc.id}')" style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-weight: bold; cursor: pointer;">Từ chối</button>
              </div>
            `;
            recStream.appendChild(row);
          });
        });

        // Lời mời đã gửi
        db.collection('friend_requests').where('senderId', '==', myUid).onSnapshot(function (snap) {
          const sentStream = document.getElementById('sent-requests-stream');
          sentStream.innerHTML = '';
          if (snap.empty) {
            sentStream.innerHTML = '<div style="font-size: 11px; color: #64748b;">Không có lời mời nào đã gửi.</div>';
            return;
          }
          snap.forEach(function (doc) {
            const req = doc.data();
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.background = '#1e293b';
            row.style.padding = '6px 8px';
            row.style.borderRadius = '6px';
            row.innerHTML = `
              <span style="font-size: 12px; color: white;">${req.receiverName || 'Thành viên'}</span>
              <button onclick="window.vuiHocChat.declineFriendRequest('${doc.id}')" style="background: #475569; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 10px; cursor: pointer;">Hủy</button>
            `;
            sentStream.appendChild(row);
          });
        });

        // Bạn bè đã kết nối (100% Realtime từ bảng friendships)
        db.collection('friendships').where('users', 'array-contains', myUid).onSnapshot(function (snap) {
          const friendsStream = document.getElementById('friends-list-stream');
          friendsStream.innerHTML = '';
          if (snap.empty) {
            friendsStream.innerHTML = '<div style="font-size: 11px; color: #64748b;">Chưa có bạn bè. Hãy kết bạn trong khung chat nhé!</div>';
            return;
          }
          snap.forEach(function (doc) {
            const f = doc.data();
            const partnerId = f.users.find(id => id !== myUid);
            if (!partnerId) return;
            const partnerName = (f.userNames && f.userNames[partnerId]) || 'Bạn bè';
            const partnerAvatar = (f.userAvatars && f.userAvatars[partnerId]) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

            const fRow = document.createElement('div');
            fRow.style.display = 'flex';
            fRow.style.alignItems = 'center';
            fRow.style.justifyContent = 'space-between';
            fRow.style.background = '#1e293b';
            fRow.style.padding = '6px 8px';
            fRow.style.borderRadius = '6px';
            fRow.innerHTML = `
              <div style="display: flex; align-items: center; gap: 6px; cursor: pointer;" onclick="window.vuiHocChat.openUserProfileModal('${partnerId}', '${partnerName.replace(/'/g, "\\'")}', '${partnerAvatar}')">
                <img src="${partnerAvatar}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" />
                <span style="font-size: 12px; font-weight: bold; color: white;">${partnerName}</span>
              </div>
              <div style="display: flex; gap: 4px;">
                <button onclick="window.vuiHocChat.openDirectChat('${partnerId}', '${partnerName.replace(/'/g, "\\'")}')" style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-weight: bold; cursor: pointer;">💬 Nhắn tin</button>
                <button onclick="window.vuiHocChat.unfriendUser('${partnerId}', '${partnerName.replace(/'/g, "\\'")}')" title="Hủy kết bạn" style="background: #334155; color: #94a3b8; border: none; border-radius: 4px; padding: 4px 6px; font-size: 10px; cursor: pointer;">✕</button>
              </div>
            `;
            friendsStream.appendChild(fRow);
          });
        });

        // Lịch sử tin nhắn riêng
        db.collection('direct_chats').where('participants', 'array-contains', myUid).onSnapshot(function (snap) {
          const dmsStream = document.getElementById('recent-dms-stream');
          dmsStream.innerHTML = '';
          if (snap.empty) {
            dmsStream.innerHTML = '<div style="font-size: 11px; color: #64748b;">Chưa có cuộc trò chuyện riêng nào.</div>';
            return;
          }
          snap.forEach(function (doc) {
            const cData = doc.data();
            const partnerId = cData.participants.find(id => id !== myUid);
            if (!partnerId) return;
            db.collection('users').doc(partnerId).get().then(function (pDoc) {
              if (!pDoc.exists) return;
              const p = pDoc.data();
              const dRow = document.createElement('div');
              dRow.style.display = 'flex';
              dRow.style.alignItems = 'center';
              dRow.style.justifyContent = 'space-between';
              dRow.style.background = '#1e293b';
              dRow.style.padding = '6px 8px';
              dRow.style.borderRadius = '6px';
              dRow.style.cursor = 'pointer';
              dRow.onclick = function () { window.vuiHocChat.openDirectChat(p.id, p.name); };
              dRow.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <img src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" />
                  <span style="font-size: 12px; font-weight: bold; color: white;">${p.name}</span>
                </div>
                <span style="font-size: 10px; color: #f87171;">Mở chat →</span>
              `;
              dmsStream.appendChild(dRow);
            });
          });
        });
      },
      acceptFriendRequest: function (reqId, senderId, senderName, senderAvatar) {
        if (!currentLoggedUser) return alert('Vui lòng đăng nhập Google!');
        const myUid = currentLoggedUser.uid;
        const friendshipId = [myUid, senderId].sort().join('_');
        const cleanSenderName = senderName || 'Thành viên';
        const myName = currentLoggedUser.displayName || 'Thành viên';

        db.collection('friendships').doc(friendshipId).set({
          id: friendshipId,
          users: [myUid, senderId],
          userNames: { [myUid]: myName, [senderId]: cleanSenderName },
          userAvatars: { [myUid]: currentLoggedUser.photoURL || '', [senderId]: senderAvatar || '' },
          createdAt: Date.now()
        }, { merge: true }).then(function () {
          if (reqId) db.collection('friend_requests').doc(reqId).delete();
          rewardUserPoints(5);
          alert('✅ Đã kết bạn thành công với ' + cleanSenderName + '!');
        }).catch(function (err) {
          alert('Không thể kết bạn: ' + err.message);
        });
      },
      declineFriendRequest: function (reqId) {
        db.collection('friend_requests').doc(reqId).delete();
      },
      unfriendUser: function (partnerId, partnerName) {
        if (!currentLoggedUser) return;
        if (confirm('Bạn có chắc chắn muốn hủy kết bạn với ' + partnerName + '?')) {
          const friendshipId = [currentLoggedUser.uid, partnerId].sort().join('_');
          db.collection('friendships').doc(friendshipId).delete().then(function () {
            alert('Đã hủy kết bạn với ' + partnerName);
          });
        }
      },
      openDirectChat: function (partnerId, partnerName) {
        if (!currentLoggedUser) return;
        activeDMPartner = { id: partnerId, name: partnerName };
        document.getElementById('friends-main-view').style.display = 'none';
        document.getElementById('direct-chat-view').style.display = 'flex';
        document.getElementById('dm-partner-name').innerText = '💬 ' + partnerName;

        const pairKey = [currentLoggedUser.uid, partnerId].sort().join('_');
        db.collection('direct_chats').doc(pairKey).set({
          participants: [currentLoggedUser.uid, partnerId],
          lastUpdated: Date.now()
        }, { merge: true });

        const dmStream = document.getElementById('dm-messages-stream');
        if (dmUnsubscribe) dmUnsubscribe();
        dmUnsubscribe = db.collection('direct_chats').doc(pairKey).collection('messages').orderBy('createdAt', 'asc').limit(40).onSnapshot(function (snapshot) {
          dmStream.innerHTML = '';
          snapshot.forEach(function (doc) {
            const msg = doc.data();
            const isMe = msg.senderId === currentLoggedUser.uid;
            const msgDiv = document.createElement('div');
            msgDiv.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
            msgDiv.style.background = isMe ? '#dc2626' : '#1e293b';
            msgDiv.style.color = 'white';
            msgDiv.style.padding = '6px 10px';
            msgDiv.style.borderRadius = '10px';
            msgDiv.style.fontSize = '12px';
            msgDiv.style.maxWidth = '80%';
            msgDiv.innerText = msg.content;
            dmStream.appendChild(msgDiv);
          });
          dmStream.scrollTop = dmStream.scrollHeight;
        });
      },
      closeDirectChat: function () {
        document.getElementById('direct-chat-view').style.display = 'none';
        document.getElementById('friends-main-view').style.display = 'flex';
        if (dmUnsubscribe) dmUnsubscribe();
      },
      openUserProfileModal: function (userId, userName, userAvatar) {
        if (!userId) return;
        modalTargetUser = { id: userId, name: userName, avatar: userAvatar };
        document.getElementById('modal-profile-avatar').src = userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
        document.getElementById('modal-profile-name').innerText = userName || 'Thành viên';

        const isMe = currentLoggedUser && currentLoggedUser.uid === userId;
        const myUid = currentLoggedUser ? currentLoggedUser.uid : null;
        const btnEditBio = document.getElementById('modal-btn-edit-bio');
        const btnFriend = document.getElementById('modal-btn-friend');

        if (isMe) {
          if (btnEditBio) btnEditBio.style.display = 'inline-flex';
          if (btnFriend) btnFriend.style.display = 'none';
        } else {
          if (btnEditBio) btnEditBio.style.display = 'none';
          if (btnFriend) {
            btnFriend.style.display = 'flex';
            btnFriend.innerHTML = '<span>⏳ Đang kiểm tra...</span>';
            btnFriend.disabled = true;

            if (myUid) {
              const friendshipId = [myUid, userId].sort().join('_');
              db.collection('friendships').doc(friendshipId).get().then(function (fDoc) {
                if (fDoc.exists) {
                  btnFriend.disabled = false;
                  btnFriend.style.background = '#059669';
                  btnFriend.innerHTML = '<span>✓ Bạn bè (Hủy)</span>';
                  btnFriend.onclick = function () {
                    window.vuiHocChat.unfriendUser(userId, userName);
                    window.vuiHocChat.closeProfileModal();
                  };
                } else {
                  db.collection('friend_requests').where('senderId', '==', myUid).where('receiverId', '==', userId).get().then(function (sentSnap) {
                    if (!sentSnap.empty) {
                      btnFriend.disabled = false;
                      btnFriend.style.background = '#d97706';
                      btnFriend.innerHTML = '<span>⏳ Đã gửi lời mời (Hủy)</span>';
                      btnFriend.onclick = function () {
                        sentSnap.forEach(d => d.ref.delete());
                        alert('Đã hủy lời mời kết bạn!');
                        window.vuiHocChat.closeProfileModal();
                      };
                    } else {
                      db.collection('friend_requests').where('senderId', '==', userId).where('receiverId', '==', myUid).get().then(function (recSnap) {
                        if (!recSnap.empty) {
                          btnFriend.disabled = false;
                          btnFriend.style.background = '#059669';
                          btnFriend.innerHTML = '<span>✅ Chấp nhận kết bạn</span>';
                          btnFriend.onclick = function () {
                            recSnap.forEach(d => window.vuiHocChat.acceptFriendRequest(d.id, userId, userName, userAvatar));
                            window.vuiHocChat.closeProfileModal();
                          };
                        } else {
                          btnFriend.disabled = false;
                          btnFriend.style.background = '#dc2626';
                          btnFriend.innerHTML = '<span>➕ Kết Bạn</span>';
                          btnFriend.onclick = window.vuiHocChat.handleProfileFriendAction;
                        }
                      });
                    }
                  });
                }
              });
            }
          }
        }

        db.collection('users').doc(userId).get().then(function (docSnap) {
          if (docSnap.exists) {
            const u = docSnap.data();
            document.getElementById('modal-profile-role').innerText = u.roleTitle || (u.role === 'admin' ? '👑 Quản Trị Viên (Admin)' : 'Thành viên cộng đồng');
            // Streak — khớp auth.js
            document.getElementById('modal-profile-streak').innerText = (u.streakDays || 1) + ' ngày';
            // Tổng EXP — công thức khớp 100% mypage.html (calcTotalExp)
            const totalExp = Math.max(0, Math.floor((u.totalStudyMinutes || 0) / 10) * 5 + (u.bonusEXP || 0));
            document.getElementById('modal-profile-points').innerText = totalExp.toLocaleString() + ' EXP';
            // Hạng thành viên — khớp mypage.html (getLevelInfo)
            const rank = getMemberRank(totalExp);
            document.getElementById('modal-profile-rank').innerText = rank.icon + ' ' + rank.name;
            // Tổng thời gian học — khớp totalStudyMinutes của mypage
            document.getElementById('modal-profile-active').innerText = formatStudyDuration(u.totalStudyMinutes || 0);
            document.getElementById('modal-profile-active-sub').innerText = 'Tổng thời gian học';
            // Thời gian học hôm nay — khớp dailyStudyData[hôm nay] của mypage (múi giờ thiết bị)
            const now = new Date();
            const todayKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            const todayMins = (u.dailyStudyData && u.dailyStudyData[todayKey]) || 0;
            document.getElementById('modal-profile-today').innerText = formatStudyDuration(todayMins);
            document.getElementById('modal-profile-bio').innerText = u.bio && u.bio.trim() !== '' ? ('"' + u.bio + '"') : ('"' + getRandomQuoteForUser(userId) + '"');
          } else {
            document.getElementById('modal-profile-role').innerText = 'Thành viên mới';
            document.getElementById('modal-profile-streak').innerText = '1 ngày';
            document.getElementById('modal-profile-points').innerText = '0 EXP';
            document.getElementById('modal-profile-rank').innerText = '🌱 Thường Dân';
            document.getElementById('modal-profile-active').innerText = '0 phút';
            document.getElementById('modal-profile-active-sub').innerText = 'Tổng thời gian học';
            document.getElementById('modal-profile-today').innerText = '0 phút';
            document.getElementById('modal-profile-bio').innerText = '"' + getRandomQuoteForUser(userId) + '"';
          }
        });

        document.getElementById('profile-modal-overlay').style.display = 'flex';
      },
      editMyProfileBio: function () {
        if (!currentLoggedUser) return alert("Vui lòng đăng nhập!");
        const currentElem = document.getElementById('modal-profile-bio');
        const oldText = currentElem.innerText.replace(/^"|"$/g, '');
        const newBio = prompt("Nhập châm ngôn hoặc status mới của bạn:", oldText);
        if (newBio && newBio.trim() !== '') {
          const cleanBio = newBio.trim();
          db.collection('users').doc(currentLoggedUser.uid).set({ bio: cleanBio }, { merge: true }).then(function () {
            currentElem.innerText = '"' + cleanBio + '"';
            alert("Đã cập nhật status thành công!");
          });
        }
      },
      closeProfileModal: function () {
        document.getElementById('profile-modal-overlay').style.display = 'none';
      },
      handleProfileFriendAction: function () {
        if (!currentLoggedUser || !modalTargetUser) return alert("Vui lòng đăng nhập Google!");
        if (currentLoggedUser.uid === modalTargetUser.id) return alert("Không thể tự kết bạn với chính mình!");

        const btn = document.getElementById('modal-btn-friend');
        if (btn) { btn.disabled = true; btn.innerText = 'Đang gửi...'; }

        db.collection('friend_requests').add({
          senderId: currentLoggedUser.uid,
          senderName: currentLoggedUser.displayName || 'Thành viên',
          senderAvatar: currentLoggedUser.photoURL || '',
          receiverId: modalTargetUser.id,
          receiverName: modalTargetUser.name,
          createdAt: Date.now()
        }).then(function () {
          alert("Đã gửi lời mời kết bạn đến " + modalTargetUser.name + "!");
          window.vuiHocChat.closeProfileModal();
          window.vuiHocChat.loadFriendsAndDMs();
        }).catch(function (err) {
          alert("Lỗi khi gửi lời mời: " + err.message);
          if (btn) btn.disabled = false;
        });
      },
      handleProfileDirectMessage: function () {
        if (!modalTargetUser) return;
        window.vuiHocChat.closeProfileModal();
        if (window.location.pathname.indexOf('forum.html') > -1) {
          // Đang ở forum → mở tin nhắn ngay tại trang
          window.vuiHocChat.switchWidgetTab('friends');
          window.vuiHocChat.openDirectChat(modalTargetUser.id, modalTargetUser.name);
        } else {
          // Ngoài forum → chuyển sang trang forum và mở tin nhắn riêng
          window.location.href = 'forum.html?dm=' + encodeURIComponent(modalTargetUser.id) +
            '&name=' + encodeURIComponent(modalTargetUser.name || 'Thành viên');
        }
      }
    };

    auth.onAuthStateChanged(function (user) {
      const userLabel = document.getElementById('chat-user-label');
      const chatInput = document.getElementById('chat-input');
      const chatSendBtn = document.getElementById('chat-send-btn');

      if (user) {
        currentLoggedUser = user;
        const userEmail = (user.email || '').toLowerCase();
        isCurrentUserAdmin = ADMIN_EMAILS.includes(userEmail);
        const name = user.displayName || 'Thành viên Google';
        userLabel.innerHTML = `<span style="color: #4ade80;">🟢 ${name} ${isCurrentUserAdmin ? '<span style="color:#fbbf24; font-weight:bold;">👑 Admin</span>' : ''}</span>`;
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.placeholder = `Nhắn tin với tư cách ${name}...`;

        // Lấy ngày gia nhập từ Firebase Auth metadata
        let realJoinDate = new Date().toLocaleDateString('vi-VN');
        if (user.metadata && user.metadata.creationTime) {
          realJoinDate = new Date(user.metadata.creationTime).toLocaleDateString('vi-VN');
        }

        const userRef = db.collection('users').doc(user.uid);

        // Chỉ cập nhật thông tin profile cơ bản — KHÔNG ghi đè streak/EXP
        // (streak được quản lý bởi auth.js, EXP bởi activity-tracker.js)
        userRef.get().then(function (docSnap) {
          if (docSnap.exists) {
            const u = docSnap.data();
            var updateData = {
              name: name,
              avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              role: isCurrentUserAdmin ? 'admin' : (u.role || 'member'),
              roleTitle: isCurrentUserAdmin ? '👑 Quản Trị Viên (Admin)' : (u.roleTitle || 'Thành viên cộng đồng'),
              // joinedDateFromAuth luôn lấy từ Firebase Auth — ghi đè để sửa giá trị sai cũ
              joinedDateFromAuth: realJoinDate,
              // joinedDate giữ nguyên nếu đã có (không ghi đè), chỉ dùng cho backward compat
              joinedDate: u.joinedDate || realJoinDate,
              lastSeen: Date.now()
            };
            // Migrate dữ liệu cũ: nếu có onlineMinutes nhưng chưa có totalOnlineMinutes → chuyển sang
            if (!u.totalOnlineMinutes && u.onlineMinutes) {
              updateData.totalOnlineMinutes = u.onlineMinutes;
            }
            userRef.set(updateData, { merge: true });
          } else {
            // Tài khoản hoàn toàn mới — tạo document lần đầu
            userRef.set({
              id: user.uid,
              name: name,
              avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              role: isCurrentUserAdmin ? 'admin' : 'member',
              roleTitle: isCurrentUserAdmin ? '👑 Quản Trị Viên (Admin)' : 'Thành viên mới',
              joinedDateFromAuth: realJoinDate,
              joinedDate: realJoinDate,
              totalOnlineMinutes: 0,
              lastSeen: Date.now()
            });
          }
        });

        // Bắt đầu đếm thời gian online toàn web
        startOnlineTracker();

        // Deep-link từ nơi khác: forum.html?dm=<uid>&name=<tên> → mở nhắn tin riêng
        if (IS_FORUM) {
          try {
            var qp = new URLSearchParams(window.location.search);
            var dmUid = qp.get('dm');
            var dmName = qp.get('name') || 'Thành viên';
            if (dmUid && dmUid !== user.uid) {
              setTimeout(function () {
                window.vuiHocChat.switchWidgetTab('friends');
                window.vuiHocChat.openDirectChat(dmUid, decodeURIComponent(dmName));
              }, 900);
            }
          } catch (e) { console.log('[Chat] deep-link error', e); }
        }

      } else {
        currentLoggedUser = null;
        isCurrentUserAdmin = false;
        userLabel.innerHTML = `<span style="color: #f87171;">⚠️ Chưa đăng nhập Google trên web</span>`;
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
        chatInput.placeholder = "Cần đăng nhập Google trên web để tương tác...";
      }
    });

    document.getElementById('chat-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const chatInput = document.getElementById('chat-input');
      const text = chatInput.value.trim();
      if (!text || !currentLoggedUser) return;
      db.collection('public_messages').add({
        userId: currentLoggedUser.uid,
        userName: currentLoggedUser.displayName || 'Thành viên',
        userAvatar: currentLoggedUser.photoURL || '',
        content: text,
        createdAt: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      rewardUserPoints(2);
      chatInput.value = '';
    });

    const msgStream = document.getElementById('chat-messages-stream');
    db.collection('public_messages').orderBy('createdAt', 'asc').limit(50).onSnapshot(function (snapshot) {
      msgStream.innerHTML = '';
      if (snapshot.empty) {
        msgStream.innerHTML = '<div style="text-align:center; color:#64748b; font-size:12px; margin-top:20px;">Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!</div>';
        return;
      }
      snapshot.forEach(function (doc) {
        const data = doc.data();
        const isMe = currentLoggedUser && currentLoggedUser.uid === data.userId;
        const canDelete = isMe || isCurrentUserAdmin;
        const msgDiv = document.createElement('div');
        msgDiv.style.display = 'flex';
        msgDiv.style.flexDirection = 'column';
        msgDiv.style.alignItems = isMe ? 'flex-end' : 'flex-start';
        const avatar = data.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

        msgDiv.innerHTML = `
          <div style="font-size: 10px; color: #64748b; margin-bottom: 2px; display: flex; align-items: center; gap: 4px; cursor: pointer;" onclick="window.vuiHocChat.openUserProfileModal('${data.userId}', '${data.userName}', '${avatar}')">
            <img src="${avatar}" style="width:14px; height:14px; border-radius:50%; object-fit:cover;" />
            <span style="font-weight: 600; color: #94a3b8;">${data.userName || 'Thành viên'}</span>
            <span>• ${data.timestamp || ''}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; max-width: 86%;">
            ${isMe && canDelete ? `<button onclick="db.collection('public_messages').doc('${doc.id}').delete()" class="flat-btn-delete">Xóa</button>` : ''}
            <div style="background: ${isMe ? '#dc2626' : '#1e293b'}; color: white; padding: 7px 12px; border-radius: 12px; font-size: 12px; word-break: break-word;">${data.content}</div>
            ${!isMe && canDelete ? `<button onclick="db.collection('public_messages').doc('${doc.id}').delete()" class="flat-btn-delete">Xóa</button>` : ''}
          </div>
        `;
        msgStream.appendChild(msgDiv);
      });
      msgStream.scrollTop = msgStream.scrollHeight;
    });

    document.getElementById('qa-reply-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!currentLoggedUser || !activeQuestionThreadId) return;
      const input = document.getElementById('qa-reply-input');
      const text = input.value.trim();
      if (!text) return;
      db.collection('questions').doc(activeQuestionThreadId).collection('comments').add({
        userId: currentLoggedUser.uid,
        userName: currentLoggedUser.displayName || 'Thành viên',
        userAvatar: currentLoggedUser.photoURL || '',
        content: text,
        createdAt: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      rewardUserPoints(15);
      input.value = '';
      window.vuiHocChat.cancelReplyTo();
    });

    document.getElementById('dm-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const dmInput = document.getElementById('dm-input');
      const text = dmInput.value.trim();
      if (!text || !currentLoggedUser || !activeDMPartner) return;
      const pairKey = [currentLoggedUser.uid, activeDMPartner.id].sort().join('_');
      db.collection('direct_chats').doc(pairKey).collection('messages').add({
        senderId: currentLoggedUser.uid,
        senderName: currentLoggedUser.displayName || 'Thành viên',
        content: text,
        createdAt: Date.now()
      });
      dmInput.value = '';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebaseAndWidget);
  } else {
    initFirebaseAndWidget();
  }
})();