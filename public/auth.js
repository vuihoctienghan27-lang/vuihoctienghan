// KIỂM TRA DARK MODE TOÀN CỤC NGAY KHI VỪA MỞ TRANG
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// ========================================================
// 🛑 DÁN FIREBASE CONFIG CỦA BẠN VÀO ĐÂY:
// ========================================================
const firebaseConfig = {
    apiKey: "AIzaSyCoKD1zD63pQ-QotSTGFn0i8KMQmXzl8EU",
    authDomain: "vuihoctienghan2027.firebaseapp.com",
    projectId: "vuihoctienghan2027",
    storageBucket: "vuihoctienghan2027.firebasestorage.app",
    messagingSenderId: "346757373399",
    appId: "1:346757373399:web:526625b339fc9a1a523f92",
    measurementId: "G-JHCHNDDY1S"
};
  
// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Xuất biến toàn cục để script.js có thể tái sử dụng
window.auth = firebase.auth();
window.db = firebase.firestore();

window.db.settings({ experimentalForceLongPolling: true, useFetchStreams: false });

const navLoginBtn = document.getElementById('navLoginBtn');
const navMyPageBtn = document.getElementById('navMyPageBtn');
const authModal = document.getElementById('authModal');
const googleAuthBtn = document.getElementById('googleAuthBtn');

function getLocalYYYYMMDD() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Email lưu ở vùng riêng tư (user_private: chỉ chủ + admin đọc) + chỉ mục tra cứu kết bạn (email_index).
// Mỗi thiết bị chỉ ghi 1 lần cho mỗi tài khoản.
function syncPrivateEmail(user) {
    if (!user || !user.email) return Promise.resolve();
    const key = 'emailSync_v1_' + user.uid;
    try { if (localStorage.getItem(key) === user.email) return Promise.resolve(); } catch (e) {}
    return Promise.all([
        window.db.collection('user_private').doc(user.uid).set({ email: user.email, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }),
        window.db.collection('email_index').doc(user.email.toLowerCase()).set({ uid: user.uid })
    ]).then(() => { try { localStorage.setItem(key, user.email); } catch (e) {} })
      .catch(e => console.warn('[Email] Không lưu được email riêng tư:', e && e.message));
}
window.syncPrivateEmail = syncPrivateEmail;

if(navLoginBtn) navLoginBtn.addEventListener('click', () => { if(authModal) authModal.style.display = 'flex'; });

if (googleAuthBtn) {
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    googleAuthBtn.addEventListener('click', async () => {
        try {
            const result = await window.auth.signInWithPopup(googleProvider);
            const user = result.user;
            if(authModal) authModal.style.display = 'none';

            const userRef = window.db.collection("users").doc(user.uid);
            await userRef.set({
                fullName: user.displayName || "",
                lastLoginAt: new Date().toISOString()
            }, { merge: true });

            if(window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                window.location.href = 'mypage.html';
            }
        } catch (error) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({icon: 'error', title: 'Lỗi đăng nhập', text: error.message, confirmButtonColor: '#2563eb'});
            } else {
                alert("Lỗi đăng nhập: " + error.message);
            }
        }
    });
}

window.auth.onAuthStateChanged(async (user) => {
    if (user) {
        if(navLoginBtn) navLoginBtn.style.display = 'none';
        if(navMyPageBtn) navMyPageBtn.style.display = 'inline-block';
        if(authModal) authModal.style.display = 'none';

        const userRef = window.db.collection("users").doc(user.uid);
        
        syncPrivateEmail(user);
        const docSnap = await userRef.get();
        if (docSnap.exists) {
            let data = docSnap.data();

            // Tài liệu cũ / tạo tự động (đăng nhập ở trang đề, ghi thời gian học…) có thể thiếu tên
            // → lấy tên tài khoản Google điền vào chỗ trống, KHÔNG ghi đè tên người dùng đã tự đặt.
            // (Email không chép vào đây vì collection users đọc công khai — Admin xem email qua Cloud Function listAuthUsers.)
            if (!data.fullName && user.displayName) {
                userRef.set({ fullName: String(user.displayName).slice(0, 60) }, { merge: true }).catch(() => {});
            }
            // Tài liệu cũ còn email công khai → chuyển sang vùng riêng tư rồi xoá khỏi users
            if (data.email) {
                try { localStorage.removeItem('emailSync_v1_' + user.uid); } catch (e) {}
                syncPrivateEmail(user).then(() => userRef.update({ email: firebase.firestore.FieldValue.delete() })).catch(() => {});
            }
            let today = getLocalYYYYMMDD();
            let lastDate = data.lastLoginDate || "";

            if (lastDate !== today) {
                let streak = data.streakDays || 0;
                let bonusDays = data.streakBonusDays || 0;
                let bonusToAdd = 0;
                
                let yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                let yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                
                let twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                let twoDaysAgoStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;
                
                if (lastDate === yesterdayStr || lastDate === twoDaysAgoStr) {
                    streak++;
                    bonusDays++;
                } else {
                    streak = 1;
                    bonusDays = 1;
                }
                
                if (bonusDays === 3) {
                    bonusToAdd = 50;
                } else if (bonusDays >= 7) {
                    bonusToAdd = 100;
                    bonusDays = 0;
                }

                let updates = { lastLoginDate: today, streakDays: streak, streakBonusDays: bonusDays };
                if (bonusToAdd > 0) {
                    updates.bonusEXP = firebase.firestore.FieldValue.increment(bonusToAdd);
                    updates.bonusEXPAt = firebase.firestore.FieldValue.serverTimestamp(); // firestore.rules yêu cầu
                }

                await userRef.set(updates, { merge: true });
                
                if (bonusToAdd > 0) {
                    setTimeout(() => {
                        const msg = (bonusToAdd === 50) ? `🔥 Tuyệt vời! 3 ngày liên tiếp! Nhận ngay +50 EXP!` : `🏅 Xuất sắc! 7 ngày liên tiếp! Nhận ngay +100 EXP!`;
                        if(typeof Swal !== 'undefined') Swal.fire({icon: 'success', title: 'Chúc mừng!', text: msg, confirmButtonColor: '#2563eb'});
                        else if(typeof alert !== 'undefined') alert(msg);
                    }, 1000);
                }
            }
        }

    } else {
        if(navLoginBtn) navLoginBtn.style.display = 'inline-block';
        if(navMyPageBtn) navMyPageBtn.style.display = 'none';
        
    }
});

