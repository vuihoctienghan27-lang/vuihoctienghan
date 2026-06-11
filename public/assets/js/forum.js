/* forum.js - Improved stability */

(function () {
    let currentUser = null;
    let globalChatUnsubscribe = null;
    let qaUnsubscribe = null;
    let friendsUnsubscribe = null;
    let dmUnsubscribe = null;
    let postRepliesUnsubscribe = null;
    let notifUnsubscribe = null;

    let activeFriendshipId = null;
    let activeFriendName = "";

    let friendships = [];
    let allPosts = [];
    let pendingFriendshipsCount = 0;
    let unreadNotifsCount = 0;
    let allNotifs = [];

    const el = {
        globalChatMessages: document.getElementById('globalChatMessages'),
        globalChatInput: document.getElementById('globalChatInput'),
        globalChatSendBtn: document.getElementById('globalChatSendBtn'),

        qaPostList: document.getElementById('qaPostList'),
        createNewPostBtn: document.getElementById('createNewPostBtn'),
        qaSearchInput: document.getElementById('qaSearchInput'),

        addFriendBtn: document.getElementById('addFriendBtn'),
        friendRequestsBtn: document.getElementById('friendRequestsBtn'),
        reqBadge: document.getElementById('reqBadge'),
        friendsList: document.getElementById('friendsList'),

        dmArea: document.getElementById('dmArea'),
        dmPlaceholder: document.getElementById('dmPlaceholder'),
        dmChatName: document.getElementById('dmChatName'),
        closeDmBtn: document.getElementById('closeDmBtn'),
        dmMessages: document.getElementById('dmMessages'),
        dmInput: document.getElementById('dmInput'),
        dmSendBtn: document.getElementById('dmSendBtn')
    };

    window.forumApp = {
        onTabChanged: function (tabId) {},
        openDmFromOutside: function (friendshipId, otherName, otherUserId) {
            const btn = document.querySelector('.forum-tab-btn[data-tab="tab-friends"]');
            if (btn) btn.click();
            openDm(friendshipId, otherName, otherUserId);
        },
        editPost: async function (postId, oldTitle, oldContent) {
            if (!requireAuth()) return;
            Swal.fire({
                title: 'Sửa Bài Viết',
                html: `
                    <input id="swal-edit-title" class="swal2-input" value="${oldTitle.replace(/"/g, '&quot;')}" style="width: 80%;">
                    <textarea id="swal-edit-content" class="swal2-textarea" style="width: 80%; height: 150px;">${oldContent.replace(/</g, '&lt;')}</textarea>
                `,
                showCancelButton: true,
                confirmButtonText: 'Lưu thay đổi',
                cancelButtonText: 'Hủy',
                preConfirm: () => {
                    const t = document.getElementById('swal-edit-title').value.trim();
                    const c = document.getElementById('swal-edit-content').value.trim();
                    if (!t || !c) return Swal.showValidationMessage('Vui lòng nhập đủ thông tin');
                    return { t, c };
                }
            }).then(async (res) => {
                if (res.isConfirmed) {
                    try {
                        await window.db.collection('forum_posts').doc(postId).update({
                            title: res.value.t,
                            content: res.value.c
                        });
                        Swal.fire('Thành công', 'Đã sửa bài viết', 'success');
                    } catch (e) { console.error(e); Swal.fire('Lỗi', 'Không thể sửa bài viết', 'error'); }
                }
            });
        },
        deletePost: async function (postId) {
            if (!requireAuth()) return;
            Swal.fire({
                title: 'Xóa bài viết?',
                text: 'Hành động này không thể hoàn tác.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Xóa',
                confirmButtonColor: '#ef4444'
            }).then(async (res) => {
                if (res.isConfirmed) {
                    try {
                        await window.db.collection('forum_posts').doc(postId).delete();
                        Swal.fire('Đã xóa', '', 'success');
                    } catch (e) { console.error(e); Swal.fire('Lỗi', 'Không thể xóa', 'error'); }
                }
            });
        },
        editReply: async function (replyId, oldText) {
            if (!requireAuth()) return;
            Swal.fire({
                title: 'Sửa bình luận',
                input: 'textarea',
                inputValue: oldText,
                showCancelButton: true,
                confirmButtonText: 'Lưu'
            }).then(async (res) => {
                if (res.isConfirmed && res.value.trim()) {
                    await window.db.collection('forum_replies').doc(replyId).update({ text: res.value.trim() });
                }
            });
        },
        deleteReply: async function (replyId, postId) {
            if (!requireAuth()) return;
            Swal.fire({
                title: 'Xóa bình luận?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Xóa',
                confirmButtonColor: '#ef4444'
            }).then(async (res) => {
                if (res.isConfirmed) {
                    try {
                        const batch = window.db.batch();
                        batch.delete(window.db.collection('forum_replies').doc(replyId));
                        batch.update(window.db.collection('forum_posts').doc(postId), { replyCount: firebase.firestore.FieldValue.increment(-1) });
                        await batch.commit();
                    } catch (e) { console.error(e); }
                }
            });
        },
        acceptFriend: async function (id, requesterId, requesterName) {
            try {
                await window.db.collection('friendships').doc(id).update({ status: 'accepted' });
                Swal.fire('Thành công', 'Đã chấp nhận kết bạn!', 'success');
                if (requesterId) {
                    await window.db.collection('notifications').add({
                        userId: requesterId,
                        type: 'friend_accept',
                        fromUserId: currentUser.uid,
                        fromUserName: currentUser.displayName || currentUser.email.split('@')[0],
                        read: false,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            } catch (e) {
                console.error(e);
                Swal.fire('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
            }
        },
        rejectFriend: async function (id) {
            try {
                await window.db.collection('friendships').doc(id).delete();
                Swal.fire('Đã từ chối', '', 'success');
            } catch (e) {
                console.error(e);
            }
        }
    };

    function requireAuth() {
        if (!currentUser) {
            Swal.fire({ icon: 'warning', title: 'Yêu cầu đăng nhập', text: 'Bạn cần đăng nhập để sử dụng tính năng này!', confirmButtonColor: '#2563eb' });
            return false;
        }
        return true;
    }

    function formatDate(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return moment(d).fromNow();
    }

    function formatTime(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return h + ':' + m;
    }

    function safeOnSnapshot(query, next, error) {
        try {
            return query.onSnapshot(next, error || function (err) {
                console.warn('Firestore snapshot error:', err);
            });
        } catch (e) {
            console.error('Failed to attach snapshot:', e);
            return null;
        }
    }

    window.auth.onAuthStateChanged(function (user) {
        currentUser = user;
        initGlobalChat();
        initQA();
        if (user) {
            initFriends();
            listenToNotifications();
        } else {
            if (el.friendsList) el.friendsList.innerHTML = '<div style="text-align: center; color: #9ca3af; margin-top: 20px;">Vui lòng đăng nhập để xem bạn bè</div>';
            if (el.reqBadge) el.reqBadge.style.display = 'none';
        }
    });

    // ==========================================
    // 1. GLOBAL CHAT
    // ==========================================
    function initGlobalChat() {
        if (globalChatUnsubscribe) { globalChatUnsubscribe(); globalChatUnsubscribe = null; }

        globalChatUnsubscribe = safeOnSnapshot(
            window.db.collection('global_chats')
                .orderBy('createdAt', 'desc')
                .limit(50),
            function (snapshot) {
                var msgs = [];
                snapshot.forEach(function (doc) {
                    msgs.push({ id: doc.id, data: doc.data() });
                });
                msgs.reverse();
                renderGlobalChat(msgs);
            }
        );

        if (el.globalChatSendBtn) {
            el.globalChatSendBtn.onclick = sendGlobalMessage;
        }
        if (el.globalChatInput) {
            el.globalChatInput.onkeypress = function (e) {
                if (e.key === 'Enter') sendGlobalMessage();
            };
        }
    }

    function renderGlobalChat(msgs) {
        if (!el.globalChatMessages) return;
        el.globalChatMessages.innerHTML = '';
        if (msgs.length === 0) {
            el.globalChatMessages.innerHTML = '<div style="text-align: center; color: #9ca3af; margin-top: 20px;">Chưa có tin nhắn nào. Hãy là người đầu tiên!</div>';
            return;
        }

        msgs.forEach(function (m) {
            var d = m.data;
            var isMine = currentUser && d.userId === currentUser.uid;
            var div = document.createElement('div');
            div.className = 'chat-msg ' + (isMine ? 'mine' : 'others');
            var nameHtml = !isMine
                ? '<div class="chat-name" style="cursor:pointer;" onclick="if(window.showGlobalUserProfile) window.showGlobalUserProfile(\'' + d.userId + '\', \'' + escapeHTML(d.userName) + '\')">' + escapeHTML(d.userName) + '</div>'
                : '';
            div.innerHTML = ''
                + nameHtml
                + '<div class="msg-info">' + formatDate(d.createdAt) + '</div>'
                + '<div class="msg-bubble">' + escapeHTML(d.text) + '</div>';
            el.globalChatMessages.appendChild(div);
        });
        el.globalChatMessages.scrollTop = el.globalChatMessages.scrollHeight;
    }

    async function sendGlobalMessage() {
        if (!requireAuth() || !el.globalChatInput) return;
        var text = el.globalChatInput.value.trim();
        if (!text) return;
        if (text.length > 500) {
            Swal.fire('Lỗi', 'Tin nhắn không được quá 500 ký tự.', 'warning');
            return;
        }

        el.globalChatInput.value = '';
        el.globalChatInput.disabled = true;
        try {
            await window.db.collection('global_chats').add({
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email.split('@')[0],
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error(e);
            Swal.fire('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.', 'error');
        } finally {
            if (el.globalChatInput) el.globalChatInput.disabled = false;
        }
    }

    // ==========================================
    // 2. FORUM Q&A
    // ==========================================
    function initQA() {
        if (qaUnsubscribe) { qaUnsubscribe(); qaUnsubscribe = null; }

        qaUnsubscribe = safeOnSnapshot(
            window.db.collection('forum_posts')
                .orderBy('createdAt', 'desc'),
            function (snapshot) {
                allPosts = [];
                snapshot.forEach(function (doc) {
                    allPosts.push({ id: doc.id, data: doc.data() });
                });
                renderQAPosts(allPosts);
            }
        );

        if (el.createNewPostBtn) el.createNewPostBtn.onclick = createPost;
        if (el.qaSearchInput) {
            el.qaSearchInput.oninput = function () {
                var q = el.qaSearchInput.value.toLowerCase().trim();
                if (!q) {
                    renderQAPosts(allPosts);
                    return;
                }
                var filtered = allPosts.filter(function (p) {
                    var title = (p.data.title || '').toLowerCase();
                    var content = (p.data.content || '').toLowerCase();
                    var name = (p.data.userName || '').toLowerCase();
                    return title.indexOf(q) > -1 || content.indexOf(q) > -1 || name.indexOf(q) > -1;
                });
                renderQAPosts(filtered);
            };
        }
    }

    function renderQAPosts(posts) {
        if (!el.qaPostList) return;
        el.qaPostList.innerHTML = '';
        if (posts.length === 0) {
            el.qaPostList.innerHTML = '<div style="text-align: center; color: #9ca3af; margin-top: 20px;">Chưa có bài viết nào.</div>';
            return;
        }

        posts.forEach(function (p) {
            var d = p.data;
            var isMine = currentUser && d.userId === currentUser.uid;
            var div = document.createElement('div');
            div.className = 'qa-post-card';
            div.onclick = function () { viewPost(p); };

            var actionHtml = '';
            if (isMine) {
                actionHtml = ''
                    + '<div style="margin-top: 10px; display: flex; gap: 10px;">'
                    + '<button class="btn-outline" style="padding: 4px 10px; font-size: 0.8em;" onclick="event.stopPropagation(); window.forumApp.editPost(\'' + p.id + '\', \'' + escapeHTML(d.title).replace(/'/g, "\\'") + '\', \'' + escapeHTML(d.content).replace(/'/g, "\\'") + '\')">Sửa</button>'
                    + '<button class="btn-outline" style="padding: 4px 10px; font-size: 0.8em; color: red; border-color: red;" onclick="event.stopPropagation(); window.forumApp.deletePost(\'' + p.id + '\')">Xóa</button>'
                    + '</div>';
            }

            div.innerHTML = ''
                + '<h3 class="qa-post-title">' + escapeHTML(d.title) + '</h3>'
                + '<div class="qa-post-preview">' + escapeHTML(d.content) + '</div>'
                + '<div class="qa-post-meta">'
                + '<span class="author" style="cursor:pointer;" onclick="event.stopPropagation(); if(window.showGlobalUserProfile) window.showGlobalUserProfile(\'' + d.userId + '\', \'' + escapeHTML(d.userName) + '\')">👤 ' + escapeHTML(d.userName) + '</span>'
                + '<span>🕒 ' + formatDate(d.createdAt) + ' • 💬 ' + (d.replyCount || 0) + ' bình luận</span>'
                + '</div>'
                + actionHtml;
            el.qaPostList.appendChild(div);
        });
    }

    function createPost() {
        if (!requireAuth()) return;
        Swal.fire({
            title: 'Tạo Bài Viết Mới',
            html: ''
                + '<input id="swal-input-title" class="swal2-input" placeholder="Tiêu đề bài viết" style="width: 80%;">'
                + '<textarea id="swal-input-content" class="swal2-textarea" placeholder="Nội dung..." style="width: 80%; height: 150px;"></textarea>',
            showCancelButton: true,
            confirmButtonText: 'Đăng Bài',
            cancelButtonText: 'Hủy',
            confirmButtonColor: '#2563eb',
            preConfirm: function () {
                var title = document.getElementById('swal-input-title').value.trim();
                var content = document.getElementById('swal-input-content').value.trim();
                if (!title || !content) {
                    Swal.showValidationMessage('Vui lòng nhập đủ tiêu đề và nội dung');
                    return false;
                }
                return { title: title, content: content };
            }
        }).then(async function (result) {
            if (result.isConfirmed) {
                try {
                    await window.db.collection('forum_posts').add({
                        title: result.value.title,
                        content: result.value.content,
                        userId: currentUser.uid,
                        userName: currentUser.displayName || currentUser.email.split('@')[0],
                        replyCount: 0,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    Swal.fire('Thành công!', 'Đã đăng bài viết.', 'success');
                } catch (e) {
                    console.error(e);
                    Swal.fire('Lỗi', 'Không thể đăng bài', 'error');
                }
            }
        });
    }

    function viewPost(post) {
        var d = post.data;
        Swal.fire({
            html: ''
                + '<div class="post-detail-container">'
                + '<div class="post-detail-title">' + escapeHTML(d.title) + '</div>'
                + '<div class="post-detail-meta">Đăng bởi <strong style="cursor:pointer; color:#2563eb;" onclick="if(window.showGlobalUserProfile) window.showGlobalUserProfile(\'' + d.userId + '\', \'' + escapeHTML(d.userName) + '\')">' + escapeHTML(d.userName) + '</strong> • ' + formatDate(d.createdAt) + '</div>'
                + '<div class="post-detail-content">' + escapeHTML(d.content) + '</div>'
                + '<div class="replies-section">'
                + '<h4>Bình luận (' + (d.replyCount || 0) + ')</h4>'
                + '<div id="swal-replies-list" style="max-height: 250px; overflow-y: auto; margin-bottom: 15px;"><div style="text-align: center; color: gray; font-size: 0.9em;">Đang tải bình luận...</div></div>'
                + '<div style="display:flex; gap:10px;">'
                + '<input type="text" id="swal-reply-input" class="swal2-input" placeholder="Viết bình luận..." style="margin:0; height:40px; flex:1;">'
                + '<button id="swal-reply-btn" class="btn-primary">Gửi</button>'
                + '</div>'
                + '</div>'
                + '</div>',
            width: '600px',
            showConfirmButton: false,
            showCloseButton: true,
            didOpen: function () {
                var repliesList = document.getElementById('swal-replies-list');
                var replyInput = document.getElementById('swal-reply-input');
                var replyBtn = document.getElementById('swal-reply-btn');

                if (postRepliesUnsubscribe) { postRepliesUnsubscribe(); postRepliesUnsubscribe = null; }
                postRepliesUnsubscribe = safeOnSnapshot(
                    window.db.collection('forum_replies')
                        .where('postId', '==', post.id),
                    function (snapshot) {
                        if (!repliesList) return;
                        repliesList.innerHTML = '';
                        if (snapshot.empty) {
                            repliesList.innerHTML = '<div style="text-align: center; color: gray; font-size: 0.9em;">Chưa có bình luận.</div>';
                            return;
                        }

                        var replies = [];
                        snapshot.forEach(function (doc) { replies.push({ id: doc.id, data: doc.data() }); });

                        replies.sort(function (a, b) {
                            var t1 = a.data.createdAt && a.data.createdAt.toMillis ? a.data.createdAt.toMillis() : 0;
                            var t2 = b.data.createdAt && b.data.createdAt.toMillis ? b.data.createdAt.toMillis() : 0;
                            return t1 - t2;
                        });

                        replies.forEach(function (r) {
                            var rd = r.data;
                            var replyAction = '';
                            if (currentUser && rd.userId === currentUser.uid) {
                                replyAction = ''
                                    + '<div style="margin-top: 5px; text-align: right;">'
                                    + '<span style="cursor:pointer; color:gray; font-size: 0.8em; margin-right: 10px;" onclick="window.forumApp.editReply(\'' + r.id + '\', \'' + escapeHTML(rd.text).replace(/'/g, "\\'") + '\')">Sửa</span>'
                                    + '<span style="cursor:pointer; color:red; font-size: 0.8em;" onclick="window.forumApp.deleteReply(\'' + r.id + '\', \'' + post.id + '\')">Xóa</span>'
                                    + '</div>';
                            }
                            repliesList.innerHTML += ''
                                + '<div class="reply-item">'
                                + '<div class="reply-meta"><strong style="cursor:pointer;" onclick="if(window.showGlobalUserProfile) window.showGlobalUserProfile(\'' + rd.userId + '\', \'' + escapeHTML(rd.userName) + '\')">' + escapeHTML(rd.userName) + '</strong> • ' + formatDate(rd.createdAt) + '</div>'
                                + '<div class="reply-text">' + escapeHTML(rd.text) + '</div>'
                                + replyAction
                                + '</div>';
                        });
                        if (repliesList) repliesList.scrollTop = repliesList.scrollHeight;
                    }
                );

                if (replyBtn) {
                    replyBtn.onclick = async function () {
                        if (!requireAuth() || !replyInput) return;
                        var text = replyInput.value.trim();
                        if (!text) return;
                        replyInput.value = '';
                        try {
                            var batch = window.db.batch();
                            var replyRef = window.db.collection('forum_replies').doc();
                            batch.set(replyRef, {
                                postId: post.id,
                                userId: currentUser.uid,
                                userName: currentUser.displayName || currentUser.email.split('@')[0],
                                text: text,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            var postRef = window.db.collection('forum_posts').doc(post.id);
                            batch.update(postRef, { replyCount: firebase.firestore.FieldValue.increment(1) });

                            if (d.userId !== currentUser.uid) {
                                var notifRef = window.db.collection('notifications').doc();
                                batch.set(notifRef, {
                                    userId: d.userId,
                                    type: 'reply',
                                    postId: post.id,
                                    postTitle: d.title,
                                    fromUserId: currentUser.uid,
                                    fromUserName: currentUser.displayName || currentUser.email.split('@')[0],
                                    read: false,
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }

                            await batch.commit();
                        } catch (e) {
                            console.error(e);
                            Swal.fire('Lỗi', 'Không thể gửi bình luận', 'error');
                        }
                    };
                }
            },
            willClose: function () {
                if (postRepliesUnsubscribe) {
                    postRepliesUnsubscribe();
                    postRepliesUnsubscribe = null;
                }
            }
        });
    }

    // ==========================================
    // 3. FRIENDS & DMs
    // ==========================================
    function initFriends() {
        if (friendsUnsubscribe) { friendsUnsubscribe(); friendsUnsubscribe = null; }

        friendsUnsubscribe = safeOnSnapshot(
            window.db.collection('friendships')
                .where('users', 'array-contains', currentUser.uid),
            function (snapshot) {
                friendships = [];
                pendingFriendshipsCount = 0;

                snapshot.forEach(function (doc) {
                    var data = doc.data();
                    var isPendingForMe = data.status === 'pending' && data.user2Id === currentUser.uid;
                    if (isPendingForMe) pendingFriendshipsCount++;
                    friendships.push({ id: doc.id, data: data });
                });

                if (el.reqBadge) {
                    if (pendingFriendshipsCount > 0) {
                        el.reqBadge.innerText = pendingFriendshipsCount;
                        el.reqBadge.style.display = 'inline-block';
                    } else {
                        el.reqBadge.style.display = 'none';
                    }
                }

                renderFriendsList();
            }
        );

        if (el.addFriendBtn) el.addFriendBtn.onclick = addFriend;
        if (el.friendRequestsBtn) el.friendRequestsBtn.onclick = viewFriendRequests;
        if (el.closeDmBtn) el.closeDmBtn.onclick = closeDm;
        if (el.dmSendBtn) el.dmSendBtn.onclick = sendDm;
        if (el.dmInput) {
            el.dmInput.onkeypress = function (e) {
                if (e.key === 'Enter') sendDm();
            };
        }
    }

    function renderFriendsList() {
        if (!el.friendsList) return;
        var friends = friendships.filter(function (f) { return f.data.status === 'accepted'; });
        el.friendsList.innerHTML = '';

        if (friends.length === 0) {
            el.friendsList.innerHTML = '<div style="text-align: center; color: #9ca3af; margin-top: 20px; font-size: 0.9em;">Chưa có bạn bè</div>';
            return;
        }

        friends.forEach(function (f) {
            var fd = f.data;
            var otherUserId = fd.user1Id === currentUser.uid ? fd.user2Id : fd.user1Id;
            var otherUserName = fd.user1Id === currentUser.uid ? fd.user2Name : fd.user1Name;

            var div = document.createElement('div');
            div.className = 'friend-item' + (activeFriendshipId === f.id ? ' active' : '');
            div.onclick = function () { openDm(f.id, otherUserName, otherUserId); };
            div.innerHTML = ''
                + '<div class="friend-avatar">' + otherUserName.charAt(0).toUpperCase() + '</div>'
                + '<div class="friend-info">'
                + '<div class="friend-name">' + escapeHTML(otherUserName) + '</div>'
                + '<div class="friend-status">Bạn bè</div>'
                + '</div>';
            el.friendsList.appendChild(div);
        });
    }

    function addFriend() {
        if (!requireAuth()) return;
        Swal.fire({
            title: 'Thêm bạn bè',
            input: 'email',
            inputLabel: 'Nhập email của người bạn muốn kết bạn',
            inputPlaceholder: 'email@example.com',
            showCancelButton: true,
            confirmButtonText: 'Gửi yêu cầu',
            confirmButtonColor: '#2563eb',
        }).then(async function (result) {
            if (result.isConfirmed) {
                var targetEmail = result.value.trim().toLowerCase();
                if (targetEmail === currentUser.email.toLowerCase()) {
                    return Swal.fire('Lỗi', 'Bạn không thể tự kết bạn với chính mình!', 'error');
                }

                try {
                    var userQuery = await window.db.collection('users').where('email', '==', targetEmail).limit(1).get();
                    if (userQuery.empty) {
                        return Swal.fire('Không tìm thấy', 'Email này chưa đăng ký tài khoản.', 'error');
                    }

                    var targetUser = userQuery.docs[0];
                    var targetUid = targetUser.id;
                    var targetData = targetUser.data();
                    var myName = currentUser.displayName || currentUser.email.split('@')[0];
                    var targetName = targetData.fullName || targetEmail.split('@')[0];

                    var existQuery = await window.db.collection('friendships')
                        .where('users', 'array-contains', currentUser.uid)
                        .get();

                    var exists = false;
                    existQuery.forEach(function (doc) {
                        var dd = doc.data();
                        if (dd.users && dd.users.indexOf(targetUid) > -1) exists = true;
                    });

                    if (exists) {
                        return Swal.fire('Lỗi', 'Bạn bè hoặc yêu cầu kết bạn đã tồn tại!', 'warning');
                    }

                    await window.db.collection('friendships').add({
                        users: [currentUser.uid, targetUid],
                        user1Id: currentUser.uid,
                        user1Name: myName,
                        user2Id: targetUid,
                        user2Name: targetName,
                        status: 'pending',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    Swal.fire('Thành công', 'Đã gửi lời mời kết bạn!', 'success');
                } catch (e) {
                    console.error(e);
                    Swal.fire('Lỗi', 'Có lỗi xảy ra.', 'error');
                }
            }
        });
    }

    function viewFriendRequests() {
        if (!requireAuth()) return;
        var pendingForMe = friendships.filter(function (f) {
            return f.data.status === 'pending' && f.data.user2Id === currentUser.uid;
        });

        if (pendingForMe.length === 0) {
            Swal.fire('Lời mời kết bạn', 'Bạn không có lời mời kết bạn nào.', 'info');
            return;
        }

        var html = '<div style="display:flex; flex-direction:column; gap:10px;">';
        pendingForMe.forEach(function (f) {
            var fd = f.data;
            html += ''
                + '<div style="display:flex; justify-content:space-between; align-items:center; background:#f9fafb; padding:10px; border-radius:8px; border:1px solid #e5e7eb;">'
                + '<div><strong>' + escapeHTML(fd.user1Name) + '</strong> muốn kết bạn</div>'
                + '<div style="display:flex; gap:5px;">'
                + '<button class="btn-primary" style="padding:5px 10px; font-size:0.85em;" onclick="window.forumApp.acceptFriend(\'' + f.id + '\', \'' + fd.user1Id + '\', \'' + escapeHTML(fd.user1Name) + '\')">Đồng ý</button>'
                + '<button class="btn-outline" style="padding:5px 10px; font-size:0.85em;" onclick="window.forumApp.rejectFriend(\'' + f.id + '\')">Từ chối</button>'
                + '</div>'
                + '</div>';
        });
        html += '</div>';

        Swal.fire({
            title: 'Lời mời kết bạn',
            html: html,
            showConfirmButton: false,
            showCloseButton: true
        });
    }

    function openDm(friendshipId, otherName, otherUserId) {
        activeFriendshipId = friendshipId;
        activeFriendName = otherName;

        renderFriendsList();

        if (el.dmPlaceholder) el.dmPlaceholder.style.display = 'none';
        if (el.dmArea) el.dmArea.style.display = 'flex';
        if (el.dmChatName) {
            el.dmChatName.innerHTML = '<span style="cursor:pointer;" onclick="if(window.showGlobalUserProfile) window.showGlobalUserProfile(\'' + otherUserId + '\', \'' + otherName + '\')">' + otherName + '</span>';
        }

        if (dmUnsubscribe) { dmUnsubscribe(); dmUnsubscribe = null; }

        dmUnsubscribe = safeOnSnapshot(
            window.db.collection('direct_messages')
                .where('friendshipId', '==', friendshipId),
            function (snapshot) {
                var msgs = [];
                snapshot.forEach(function (doc) { msgs.push({ id: doc.id, data: doc.data() }); });

                msgs.sort(function (a, b) {
                    var t1 = a.data.createdAt && a.data.createdAt.toMillis ? a.data.createdAt.toMillis() : 0;
                    var t2 = b.data.createdAt && b.data.createdAt.toMillis ? b.data.createdAt.toMillis() : 0;
                    return t1 - t2;
                });

                if (msgs.length > 50) {
                    msgs.splice(0, msgs.length - 50);
                }

                renderDMs(msgs);
            }
        );
    }

    function closeDm() {
        activeFriendshipId = null;
        if (dmUnsubscribe) { dmUnsubscribe(); dmUnsubscribe = null; }
        renderFriendsList();
        if (el.dmArea) el.dmArea.style.display = 'none';
        if (el.dmPlaceholder) el.dmPlaceholder.style.display = 'flex';
    }

    function renderDMs(msgs) {
        if (!el.dmMessages) return;
        el.dmMessages.innerHTML = '';
        if (msgs.length === 0) {
            el.dmMessages.innerHTML = '<div style="text-align: center; color: #9ca3af; margin-top: 20px;">Hãy gửi tin nhắn chào hỏi!</div>';
            return;
        }

        msgs.forEach(function (m) {
            var md = m.data;
            var isMine = md.senderId === currentUser.uid;
            var div = document.createElement('div');
            div.className = 'chat-msg ' + (isMine ? 'mine' : 'others');
            div.innerHTML = ''
                + '<div class="msg-info">' + formatDate(md.createdAt) + '</div>'
                + '<div class="msg-bubble">' + escapeHTML(md.text) + '</div>';
            el.dmMessages.appendChild(div);
        });
        el.dmMessages.scrollTop = el.dmMessages.scrollHeight;
    }

    async function sendDm() {
        if (!requireAuth() || !activeFriendshipId || !el.dmInput) return;
        var text = el.dmInput.value.trim();
        if (!text) return;
        if (text.length > 500) {
            Swal.fire('Lỗi', 'Tin nhắn không được quá 500 ký tự.', 'warning');
            return;
        }

        el.dmInput.value = '';
        el.dmInput.disabled = true;
        try {
            await window.db.collection('direct_messages').add({
                friendshipId: activeFriendshipId,
                senderId: currentUser.uid,
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error(e);
            Swal.fire('Lỗi', 'Không thể gửi tin nhắn', 'error');
        } finally {
            if (el.dmInput) el.dmInput.disabled = false;
        }
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, function (tag) {
            var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
            return map[tag] || tag;
        });
    }

    // ==========================================
    // 4. NOTIFICATIONS
    // ==========================================

    function listenToNotifications() {
        if (notifUnsubscribe) { notifUnsubscribe(); notifUnsubscribe = null; }

        if (!currentUser) return;

        notifUnsubscribe = safeOnSnapshot(
            window.db.collection('notifications')
                .where('userId', '==', currentUser.uid),
            function (snapshot) {
                allNotifs = [];
                unreadNotifsCount = 0;
                snapshot.forEach(function (doc) {
                    var data = doc.data();
                    allNotifs.push({ id: doc.id, data: data });
                    if (!data.read) unreadNotifsCount++;
                });
                allNotifs.sort(function (a, b) {
                    var t1 = a.data.createdAt && a.data.createdAt.toMillis ? a.data.createdAt.toMillis() : 0;
                    var t2 = b.data.createdAt && b.data.createdAt.toMillis ? b.data.createdAt.toMillis() : 0;
                    return t2 - t1;
                });
                updateBadgeAndDropdown();
            }
        );
    }

    function updateBadgeAndDropdown() {
        var total = pendingFriendshipsCount + unreadNotifsCount;
        var badge = document.getElementById('navAvatarBadge');
        if (badge) {
            badge.innerText = total;
            badge.style.display = total > 0 ? 'inline-block' : 'none';
        }

        var notifTabCount = document.getElementById('ndNotifCount');
        if (notifTabCount) {
            notifTabCount.innerText = '(' + total + ')';
            notifTabCount.style.display = total > 0 ? 'inline' : 'none';
        }

        renderDropdownContent();
    }

    function renderDropdownContent() {
        var area = document.getElementById('ndContentArea');
        if (!area) return;

        area.innerHTML = '';
        if (pendingFriendshipsCount === 0 && allNotifs.length === 0) {
            area.innerHTML = '<div style="text-align:center; color:gray; font-size:0.85em; padding:20px;">Không có thông báo mới</div>';
            return;
        }

        if (pendingFriendshipsCount > 0) {
            var div = document.createElement('div');
            div.className = 'nd-item unread';
            div.onclick = function () {
                var dd = document.getElementById('forumNavDropdown');
                if (dd) dd.classList.remove('show');
                viewFriendRequests();
            };
            div.innerHTML = ''
                + '<div class="nd-item-title">👥 Lời mời kết bạn mới</div>'
                + '<div class="nd-item-desc">Bạn có ' + pendingFriendshipsCount + ' lời mời kết bạn chưa phản hồi. Nhấp để xem.</div>';
            area.appendChild(div);
        }

        allNotifs.forEach(function (n) {
            var nd = n.data;
            var div = document.createElement('div');
            div.className = 'nd-item' + (nd.read ? '' : ' unread');
            div.onclick = function () {
                if (!nd.read) {
                    window.db.collection('notifications').doc(n.id).update({ read: true }).catch(function (e) { console.error(e); });
                }
                var dd = document.getElementById('forumNavDropdown');
                if (dd) dd.classList.remove('show');
                if (nd.type === 'reply') {
                    var btn = document.querySelector('.forum-tab-btn[data-tab="tab-qa"]');
                    if (btn) btn.click();
                } else if (nd.type === 'friend_accept') {
                    var btn = document.querySelector('.forum-tab-btn[data-tab="tab-friends"]');
                    if (btn) btn.click();
                }
            };

            if (nd.type === 'reply') {
                div.innerHTML = ''
                    + '<div class="nd-item-title">💬 Có bình luận mới</div>'
                    + '<div class="nd-item-desc"><strong>' + escapeHTML(nd.fromUserName) + '</strong> đã bình luận vào bài viết "' + escapeHTML(nd.postTitle) + '" của bạn.</div>';
            } else if (nd.type === 'friend_accept') {
                div.innerHTML = ''
                    + '<div class="nd-item-title">✅ Bạn bè mới</div>'
                    + '<div class="nd-item-desc"><strong>' + escapeHTML(nd.fromUserName) + '</strong> đã chấp nhận lời mời kết bạn của bạn.</div>';
            }
            area.appendChild(div);
        });
    }
})();
