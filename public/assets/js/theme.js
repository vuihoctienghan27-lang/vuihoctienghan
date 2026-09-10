// ===== TỰ ĐỘNG BƠM FOOTER VÀO CUỐI MỌI TRANG =====
document.addEventListener("DOMContentLoaded", function() {
    if (!document.querySelector('footer.global-footer')) {
        const style = document.createElement('style');
        style.innerHTML = `
            .global-footer { max-width:950px;margin:20px auto 30px;background:rgba(255,255,255,0.25);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.4);border-radius:20px;padding:18px 20px;display:flex;justify-content:center;align-items:center;box-shadow:0 10px 25px rgba(0,0,0,0.05); }
            body.dark-mode .global-footer { background:rgba(15,23,42,0.4);border-color:rgba(255,255,255,0.1); }
            .global-footer a.footer-link { display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;font-weight:700;font-size:1.05em;transition:0.2s; }
            .global-footer a.footer-link:hover { transform:translateY(-2px);color:#1877f2; }
            .global-footer .footer-fb-icon { width:24px;height:24px;fill:currentColor; }
            @media(max-width:1399px) { .global-footer { max-width:950px; } }
            @media(max-width:768px) { .global-footer { margin:15px 4px 25px;border-radius:18px; } }
        `;
        document.head.appendChild(style);

        const footerHTML = `
<footer class="global-footer" id="global-auto-footer">
    <a href="https://www.facebook.com/groups/vuihoctienghan.online" target="_blank" rel="noopener noreferrer" class="footer-link">
        <span>📚 Vui Học Tiếng Hàn</span>
        <svg class="footer-fb-icon" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    </a>
</footer>
        `;
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }
});