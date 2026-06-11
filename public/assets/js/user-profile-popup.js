/* user-profile-popup.js */

(function() {
    window.showGlobalUserProfile = async function(targetUid, targetName) {
        if (!window.db) {
            console.error("Firestore (window.db) is not initialized.");
            return;
        }

        const currentUser = firebase.auth().currentUser;
        
        // Prepare HTML shell
        let html = `
            <div style="text-align: center; padding: 10px;">
                <div style="font-size: 3em; margin-bottom: 10px;" id="gup-avatar">👤</div>
                <h3 style="margin: 0; font-size: 1.5em;" id="gup-name">${targetName || 'Đang tải...'}</h3>
                <div style="color: #6b7280; font-size: 0.9em; margin-bottom: 15px;" id="gup-level">Đang tải thông tin...</div>
                
                <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f3f4f6; padding: 10px; border-radius: 10px; flex: 1;">
                        <div style="font-size: 0.8em; color: #6b7280; font-weight: bold;">EXP</div>
                        <div style="font-size: 1.2em; font-weight: 900; color: #8b5cf6;" id="gup-exp">0</div>
                    </div>
                    <div style="background: #f3f4f6; padding: 10px; border-radius: 10px; flex: 1;">
                        <div style="font-size: 0.8em; color: #6b7280; font-weight: bold;">Chuỗi</div>
                        <div style="font-size: 1.2em; font-weight: 900; color: #f59e0b;" id="gup-streak">0</div>
                    </div>
                </div>

                <div id="gup-action-area" style="min-height: 40px;">
                    <!-- Nút hành động sẽ render ở đây -->
                </div>
            </div>
        `;

        Swal.fire({
            html: html,
            showConfirmButton: false,
            showCloseButton: true,
            width: '400px',
            didOpen: async () => {
                // Tải dữ liệu user
                try {
                    const userDoc = await window.db.collection('users').doc(targetUid).get();
                    if (userDoc.exists) {
                        const d = userDoc.data();
                        document.getElementById('gup-name').innerText = d.fullName || targetName || 'Ẩn danh';
                        
                        let totalExp = Math.max(0, Math.floor((d.totalStudyMinutes || 0) / 10) * 5 + (d.bonusEXP || 0));
                        document.getElementById('gup-exp').innerText = totalExp;
                        document.getElementById('gup-streak').innerText = d.streakDays || 0;
                        
                        let level = 'Thường Dân 🌱';
                        if (totalExp > 3000) level = 'Trạng Nguyên 👑';
                        else if (totalExp >= 1001) level = 'Thượng Thư 📜';
                        else if (totalExp >= 401) level = 'Tú Tài 🖋️';
                        else if (totalExp >= 51) level = 'Sĩ Tử 🕯️';
                        document.getElementById('gup-level').innerText = level;
                        
                        const STICKERS = ['🐶', '🐱', '🦊', '🐻', '🐼', '🦄', '🐯', '🐰', '🦁', '🐨', '🐸', '🐙', '🦋', '🌸', '⭐', '🔥', '💎', '🌈', '🎯', '🚀'];
                        document.getElementById('gup-avatar').innerText = STICKERS[Math.floor(Math.random() * STICKERS.length)];
                    }
                } catch(e) {
                    console.error("Lỗi tải thông tin user:", e);
                }

                // Xử lý nút hành động
                const actionArea = document.getElementById('gup-action-area');
                if (!currentUser) {
                    actionArea.innerHTML = `<button style="background: #e5e7eb; color: #9ca3af; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; width: 100%;" disabled>Đăng nhập để kết bạn</button>`;
                    return;
                }

                if (currentUser.uid === targetUid) {
                    actionArea.innerHTML = `<button onclick="window.location.href='mypage.html'" style="background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Đi đến Trang cá nhân</button>`;
                    return;
                }

                // Kiểm tra quan hệ bạn bè
                try {
                    const snap = await window.db.collection('friendships')
                        .where('users', 'array-contains', currentUser.uid)
                        .get();
                    
                    let friendship = null;
                    snap.forEach(doc => {
                        const d = doc.data();
                        if (d.users.includes(targetUid)) {
                            friendship = { id: doc.id, ...d };
                        }
                    });

                    if (!friendship) {
                        // Chưa kết bạn
                        const btn = document.createElement('button');
                        btn.innerText = '➕ Gửi lời mời kết bạn';
                        btn.style.cssText = 'background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;';
                        btn.onclick = async () => {
                            btn.disabled = true;
                            btn.innerText = 'Đang gửi...';
                            try {
                                const myName = currentUser.displayName || currentUser.email.split('@')[0];
                                await window.db.collection('friendships').add({
                                    users: [currentUser.uid, targetUid],
                                    user1Id: currentUser.uid,
                                    user1Name: myName,
                                    user2Id: targetUid,
                                    user2Name: document.getElementById('gup-name').innerText,
                                    status: 'pending',
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                                btn.innerText = '✅ Đã gửi lời mời';
                                btn.style.background = '#10b981';
                            } catch(e) {
                                console.error(e);
                                btn.disabled = false;
                                btn.innerText = 'Lỗi! Thử lại';
                            }
                        };
                        actionArea.appendChild(btn);
                    } else if (friendship.status === 'pending') {
                        if (friendship.user1Id === currentUser.uid) {
                            actionArea.innerHTML = `<div style="background: #fef3c7; color: #d97706; padding: 10px; border-radius: 8px; font-weight: bold;">⏳ Đang chờ phản hồi kết bạn</div>`;
                        } else {
                            // Target sent me a request
                            actionArea.innerHTML = `<button onclick="window.location.href='forum.html'" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Vào Diễn đàn để Chấp nhận</button>`;
                        }
                    } else if (friendship.status === 'accepted') {
                        // Đã là bạn bè
                        const wrap = document.createElement('div');
                        wrap.style.display = 'flex';
                        wrap.style.gap = '10px';
                        
                        const msgBtn = document.createElement('button');
                        msgBtn.innerText = '💬 Nhắn tin';
                        msgBtn.style.cssText = 'background: #8b5cf6; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; flex: 1;';
                        msgBtn.onclick = () => {
                            Swal.close();
                            if (window.location.pathname.includes('forum.html') && window.forumApp && window.forumApp.openDmFromOutside) {
                                window.forumApp.openDmFromOutside(friendship.id, document.getElementById('gup-name').innerText);
                            } else {
                                window.location.href = 'forum.html';
                            }
                        };
                        
                        const unfriendBtn = document.createElement('button');
                        unfriendBtn.innerText = '❌ Hủy';
                        unfriendBtn.style.cssText = 'background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;';
                        unfriendBtn.onclick = async () => {
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
                                        await window.db.collection('friendships').doc(friendship.id).delete();
                                        Swal.fire('Đã hủy', 'Đã hủy kết bạn thành công.', 'success');
                                    } catch(e) {
                                        console.error(e);
                                    }
                                }
                            });
                        };
                        
                        wrap.appendChild(msgBtn);
                        wrap.appendChild(unfriendBtn);
                        actionArea.appendChild(wrap);
                    }
                } catch(e) {
                    console.error("Lỗi kiểm tra bạn bè:", e);
                }
            }
        });
    };
})();
