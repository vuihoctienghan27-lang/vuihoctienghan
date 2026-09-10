/* user-profile-popup.js — Profile giống chatbox (có hạng thành viên, thời gian học) */

(function() {

    function calcTotalExp(d) {
        return Math.max(0, Math.floor((d.totalStudyMinutes || 0) / 10) * 5 + (d.bonusEXP || 0));
    }

    function getMemberRank(totalExp) {
        if (totalExp > 3000) return { name: 'Trạng Nguyên', icon: '👑' };
        if (totalExp >= 1001) return { name: 'Thượng Thư', icon: '📜' };
        if (totalExp >= 401) return { name: 'Tú Tài', icon: '🖋️' };
        if (totalExp >= 51) return { name: 'Sĩ Tử', icon: '🕯️' };
        return { name: 'Thường Dân', icon: '🌱' };
    }

    function getLocalDate() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function formatStudyDuration(totalMinutes) {
        totalMinutes = totalMinutes || 0;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h > 0) return h + ' giờ ' + (m > 0 ? m + ' phút' : '');
        return m + ' phút';
    }

    const STICKERS = ['🐶', '🐱', '🦊', '🐻', '🐼', '🦄', '🐯', '🐰', '🦁', '🐨', '🐸', '🐙', '🦋', '🌸', '⭐', '🔥', '💎', '🌈', '🎯', '🚀'];

    function randomSticker(uid) {
        let hash = 0;
        if (uid) { for (let i = 0; i < uid.length; i++) { hash = (hash << 5) - hash + uid.charCodeAt(i); hash |= 0; } }
        return STICKERS[Math.abs(hash) % STICKERS.length];
    }

    function buildCardHtml(targetName) {
        return `
            <div style="background: #090e1a; border: 1px solid #334155; border-radius: 20px; overflow: hidden; max-width: 460px; width: 100%; color: #e2e8f0; font-family: 'Pretendard', 'Inter', sans-serif; text-align: left;">
                <div style="height: 48px; background: linear-gradient(135deg, #7f1d1d, #0f172a 60%, #1e1b4b); padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b;">
                    <span style="font-size: 11px; background: rgba(2,6,23,0.75); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; padding: 3px 10px; border-radius: 20px; font-weight: bold;">⭐ Vui Học Tiếng Hàn</span>
                    <button onclick="Swal.close()" style="background: rgba(2,6,23,0.7); border: 1px solid #334155; color: #94a3b8; border-radius: 8px; width: 26px; height: 26px; cursor: pointer; font-size: 13px; font-weight: bold; display: flex; align-items: center; justify-content: center;">✕</button>
                </div>
                <div style="padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 14px;">

                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div id="gup-avatar" style="width: 68px; height: 68px; border-radius: 16px; background: #1e293b; border: 2px solid #334155; display: flex; align-items: center; justify-content: center; font-size: 2.4em; flex-shrink: 0;">👤</div>
                        <div style="flex: 1; min-width: 0;">
                            <div id="gup-name" style="font-size: 17px; font-weight: 900; color: #ffffff; line-height: 1.2; word-break: break-word;">${targetName || 'Đang tải...'}</div>
                            <div id="gup-rank" style="display: inline-block; font-size: 11px; font-weight: 800; color: #fbbf24; background: rgba(120, 53, 15, 0.3); border: 1px solid rgba(180, 83, 9, 0.45); padding: 2px 10px; border-radius: 20px; margin-top: 5px;">🌱 Thường Dân</div>
                            <div id="gup-role" style="font-size: 12px; color: #f87171; font-weight: 600; margin-top: 3px;">Thành viên cộng đồng</div>
                        </div>
                    </div>

                    <div id="gup-bio-box" style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 10px 12px;">
                        <div style="font-size: 10px; font-weight: bold; color: #94a3b8; margin-bottom: 4px;">💬 Châm Ngôn & Động Lực Học Tập</div>
                        <div id="gup-bio" style="color: #cbd5e1; font-size: 12px; line-height: 1.5; font-style: italic;">"Học tiếng Hàn mỗi ngày, chạm tay vào giấc mơ Hàn Quốc! 🇰🇷✨"</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div style="background: rgba(120, 53, 15, 0.25); border: 1px solid rgba(180, 83, 9, 0.4); border-radius: 12px; padding: 10px;">
                            <div style="font-size: 11px; font-weight: bold; color: #fbbf24;">🔥 Streak Chuỗi</div>
                            <div id="gup-streak" style="font-size: 16px; font-weight: 900; color: #fef08a; margin-top: 2px;">1 ngày</div>
                            <div style="font-size: 10px; color: #d97706;">Học liên tục mỗi ngày</div>
                        </div>
                        <div style="background: rgba(49, 46, 129, 0.25); border: 1px solid rgba(67, 56, 202, 0.4); border-radius: 12px; padding: 10px;">
                            <div style="font-size: 11px; font-weight: bold; color: #818cf8;">⭐ Điểm EXP</div>
                            <div id="gup-exp" style="font-size: 16px; font-weight: 900; color: #c7d2fe; margin-top: 2px;">0 EXP</div>
                            <div style="font-size: 10px; color: #6366f1;">Tích lũy từ hoạt động</div>
                        </div>
                        <div style="background: rgba(6, 78, 59, 0.25); border: 1px solid rgba(4, 120, 87, 0.4); border-radius: 12px; padding: 10px;">
                            <div style="font-size: 11px; font-weight: bold; color: #34d399;">⏱️ Tổng Thời Gian Học</div>
                            <div id="gup-total" style="font-size: 13px; font-weight: 800; color: #a7f3d0; margin-top: 2px;">0 phút</div>
                            <div style="font-size: 10px; color: #059669;">Tổng thời gian học tập</div>
                        </div>
                        <div style="background: rgba(136, 19, 55, 0.25); border: 1px solid rgba(190, 18, 60, 0.4); border-radius: 12px; padding: 10px;">
                            <div style="font-size: 11px; font-weight: bold; color: #fb7185;">📚 Học Hôm Nay</div>
                            <div id="gup-today" style="font-size: 13px; font-weight: 800; color: #fecdd3; margin-top: 2px;">0 phút</div>
                            <div style="font-size: 10px; color: #e11d48;">Thời gian học hôm nay</div>
                        </div>
                    </div>

                    <div id="gup-action-area" style="min-height: 40px; display: flex; gap: 8px; padding-top: 2px; border-top: 1px solid #1e293b; padding-top: 12px;">
                        <!-- Nút hành động sẽ render ở đây -->
                    </div>
                </div>
            </div>
        `;
    }

    window.showGlobalUserProfile = async function(targetUid, targetName) {
        // window.db do auth.js (hoặc mypage.html) khởi tạo; fallback nếu trang quên export
        const db = window.db || (window.db = firebase.firestore());

        // SweetAlert2 là dependency bắt buộc — tự tải nếu trang chưa có
        if (typeof Swal === 'undefined') {
            await new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
                s.onload = resolve;
                s.onerror = resolve;
                document.head.appendChild(s);
            });
        }
        if (typeof Swal === 'undefined') {
            console.error("Không tải được SweetAlert2.");
            return;
        }

        const currentUser = firebase.auth().currentUser;
        const today = getLocalDate();

        Swal.fire({
            html: buildCardHtml(targetName),
            showConfirmButton: false,
            showCloseButton: false,
            width: '480px',
            background: 'transparent',
            padding: 0,
            backdrop: 'rgba(2,6,23,0.85)',
            didOpen: async () => {
                // Tải dữ liệu user
                try {
                    const userDoc = await db.collection('users').doc(targetUid).get();
                    if (userDoc.exists) {
                        const d = userDoc.data();
                        document.getElementById('gup-name').innerText = d.fullName || d.name || targetName || 'Ẩn danh';
                        document.getElementById('gup-avatar').innerText = d.avatar ? '' : randomSticker(targetUid);
                        if (d.avatar) {
                            document.getElementById('gup-avatar').innerHTML = '<img src="' + d.avatar + '" style="width:100%;height:100%;border-radius:16px;object-fit:cover;" />';
                        }

                        const totalExp = calcTotalExp(d);
                        const rank = getMemberRank(totalExp);
                        document.getElementById('gup-exp').innerText = totalExp.toLocaleString() + ' EXP';
                        document.getElementById('gup-rank').innerText = rank.icon + ' ' + rank.name;
                        document.getElementById('gup-role').innerText = d.roleTitle || (d.role === 'admin' ? '👑 Quản Trị Viên (Admin)' : 'Thành viên cộng đồng');
                        document.getElementById('gup-streak').innerText = (d.streakDays || 1) + ' ngày';
                        document.getElementById('gup-total').innerText = formatStudyDuration(d.totalStudyMinutes || 0);
                        document.getElementById('gup-today').innerText = formatStudyDuration((d.dailyStudyData && d.dailyStudyData[today]) || 0);
                        document.getElementById('gup-bio').innerText = d.bio && d.bio.trim() !== '' ? ('"' + d.bio + '"') : ('"Học tiếng Hàn mỗi ngày, chạm tay vào giấc mơ Hàn Quốc! 🇰🇷✨"');
                    }
                } catch(e) {
                    console.error("Lỗi tải thông tin user:", e);
                }

                // Xử lý nút hành động
                const actionArea = document.getElementById('gup-action-area');
                if (!currentUser) {
                    actionArea.innerHTML = `<button style="flex:1; background:#1e293b; color:#64748b; border:1px solid #334155; padding:10px 20px; border-radius:10px; font-weight:bold; cursor:not-allowed;">Đăng nhập để kết bạn</button>`;
                    return;
                }

                if (currentUser.uid === targetUid) {
                    actionArea.innerHTML = `<button onclick="window.location.href='mypage.html'" style="flex:1; background:#2563eb; color:white; border:none; padding:10px 20px; border-radius:10px; font-weight:bold; cursor:pointer;">Đi đến Trang cá nhân</button>`;
                    return;
                }

                // Kiểm tra quan hệ bạn bè
                try {
                    const snap = await db.collection('friendships')
                        .where('users', 'array-contains', currentUser.uid)
                        .get();

                    let friendship = null;
                    snap.forEach(doc => {
                        const d = doc.data();
                        if (d.users.includes(targetUid)) {
                            friendship = { id: doc.id, ...d };
                        }
                    });

                    // Nút "Nhắn Tin" luôn hiện → chuyển sang trang forum và mở tin nhắn riêng
                    const msgBtn = document.createElement('button');
                    msgBtn.innerText = '💬 Nhắn Tin';
                    msgBtn.style.cssText = 'flex:1; background:#1e293b; color:white; border:1px solid #334155; padding:10px; border-radius:10px; font-weight:bold; cursor:pointer;';
                    msgBtn.onclick = () => {
                        Swal.close();
                        const shownName = (document.getElementById('gup-name') || {}).innerText || targetName || 'Thành viên';
                        window.location.href = 'forum.html?dm=' + encodeURIComponent(targetUid) +
                            '&name=' + encodeURIComponent(shownName);
                    };
                    actionArea.appendChild(msgBtn);

                    const friendBtn = document.createElement('button');
                    friendBtn.style.cssText = 'flex:1; background:#dc2626; color:white; border:none; padding:10px; border-radius:10px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 12px rgba(220,38,38,0.25);';

                    if (!friendship) {
                        // Chưa kết bạn
                        friendBtn.innerText = '➕ Kết Bạn';
                        friendBtn.onclick = async () => {
                            friendBtn.disabled = true;
                            friendBtn.innerText = 'Đang gửi...';
                            try {
                                const myName = currentUser.displayName || currentUser.email.split('@')[0];
                                await db.collection('friendships').add({
                                    users: [currentUser.uid, targetUid],
                                    user1Id: currentUser.uid,
                                    user1Name: myName,
                                    user2Id: targetUid,
                                    user2Name: document.getElementById('gup-name').innerText,
                                    status: 'pending',
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                                friendBtn.innerText = '✅ Đã gửi lời mời';
                                friendBtn.style.background = '#059669';
                            } catch(e) {
                                console.error(e);
                                friendBtn.disabled = false;
                                friendBtn.innerText = 'Lỗi! Thử lại';
                            }
                        };
                        actionArea.appendChild(friendBtn);
                    } else if (friendship.status === 'pending') {
                        if (friendship.user1Id === currentUser.uid) {
                            friendBtn.innerText = '⏳ Đang chờ phản hồi';
                            friendBtn.style.background = '#78350f';
                            friendBtn.style.color = '#fbbf24';
                            friendBtn.disabled = true;
                            actionArea.appendChild(friendBtn);
                        } else {
                            friendBtn.innerText = '✅ Chấp nhận kết bạn';
                            friendBtn.style.background = '#059669';
                            friendBtn.onclick = async () => {
                                try {
                                    await db.collection('friendships').doc(friendship.id).update({ status: 'accepted' });
                                    friendBtn.innerText = '✓ Đã kết bạn';
                                    friendBtn.disabled = true;
                                } catch(e) { console.error(e); }
                            };
                            actionArea.appendChild(friendBtn);
                        }
                    } else if (friendship.status === 'accepted') {
                        // Đã là bạn bè
                        friendBtn.innerText = '❌ Hủy kết bạn';
                        friendBtn.style.cssText = 'flex:1; background:#7f1d1d; color:#fca5a5; border:1px solid #b91c1c; padding:10px; border-radius:10px; font-weight:bold; cursor:pointer;';
                        friendBtn.onclick = async () => {
                            Swal.fire({
                                title: 'Hủy kết bạn?',
                                text: 'Bạn có chắc chắn muốn hủy kết bạn với người này?',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#ef4444',
                                confirmButtonText: 'Đồng ý',
                                cancelButtonText: 'Hủy'
                            }).then(async (result) => {
                                if (result.isConfirmed) {
                                    try {
                                        await db.collection('friendships').doc(friendship.id).delete();
                                        Swal.fire('Đã hủy', 'Đã hủy kết bạn thành công.', 'success');
                                    } catch(e) {
                                        console.error(e);
                                    }
                                }
                            });
                        };
                        actionArea.appendChild(friendBtn);
                    }
                } catch(e) {
                    console.error("Lỗi kiểm tra bạn bè:", e);
                }
            }
        });
    };
})();
