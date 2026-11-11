/* ==========================================================================
   UI-ICONS.JS — Bộ icon duotone (2 lớp đậm / nhạt) + ô icon gradient
   Dùng cho: Sổ câu sai, Thi đấu 1-1, Báo cáo tuần
   API:
     UIIcons.svg(name)                    → <svg> tô bằng currentColor
     UIIcons.tile(name, tone, size)       → ô gradient bo góc, icon trắng
                                            tone: blue|navy|coral|orange|green|amber|violet|cyan|pink|slate
                                            size: '' | 'sm' | 'lg'
     UIIcons.hydrate(root)                → thay [data-ic] (svg) và [data-tile] (ô gradient)
   ========================================================================== */
(function () {
    'use strict';
    if (window.UIIcons) return;
    const L = ' opacity=".42"';       // lớp nhạt
    const S = ' fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

    const P = {
        flame: `<path${L} d="M12 2c.7 3.3 2.7 5.1 4.5 7 1.8 1.9 3 3.9 3 6.5a7.5 7.5 0 0 1-15 0c0-2.6 1.3-4.6 3-6.2.3 1.8 1.2 3 2.5 3.6C9.4 9.4 10 5.4 12 2Z"/>
                <path d="M12 11.6c1.8 1.5 3.2 3 3.2 5a3.2 3.2 0 0 1-6.4 0c0-1.8 1.4-3.4 3.2-5Z"/>`,
        clock: `<circle${L} cx="12" cy="12.5" r="9.5"/><path${S} d="M12 7.5v5l3.2 2"/><rect x="9" y="1" width="6" height="2.4" rx="1.2"/>`,
        calendar: `<rect${L} x="3" y="4.5" width="18" height="17" rx="3.5"/><path d="M3 8a3.5 3.5 0 0 1 3.5-3.5h11A3.5 3.5 0 0 1 21 8v2H3Z"/>
                <rect x="7" y="2" width="2.4" height="5" rx="1.2"/><rect x="14.6" y="2" width="2.4" height="5" rx="1.2"/>
                <rect x="7" y="13" width="3" height="3" rx="1"/><rect x="11.5" y="13" width="3" height="3" rx="1"/><rect x="7" y="17" width="3" height="2.5" rx="1"/>`,
        book: `<path${L} d="M2.5 5.2C2.5 4.5 3 4 3.7 4H8a4 4 0 0 1 4 4v12.5a2.6 2.6 0 0 0-2.6-2.4H3.7a1.2 1.2 0 0 1-1.2-1.2Z"/>
                <path d="M21.5 5.2c0-.7-.5-1.2-1.2-1.2H16a4 4 0 0 0-4 4v12.5a2.6 2.6 0 0 1 2.6-2.4h5.7c.7 0 1.2-.5 1.2-1.2Z"/>`,
        notebook: `<rect${L} x="4" y="2" width="16" height="20" rx="3"/><path d="M8 2h9a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H8Z"/>
                <rect x="2.5" y="6" width="4" height="2.2" rx="1.1"/><rect x="2.5" y="11" width="4" height="2.2" rx="1.1"/><rect x="2.5" y="16" width="4" height="2.2" rx="1.1"/>`,
        gem: `<path${L} d="M7 3h10l4.5 6.2H2.5Z"/><path d="M2.5 9.2h19L12 21.5Z"/><path${L} d="M8.6 9.2 12 21.5l3.4-12.3Z" fill="#fff"/>`,
        repeat: `<path${S}${L} d="M4.2 13A8 8 0 0 1 17.6 6.3"/><path d="M20.6 3.4v6.2h-6.2Z"/><path${S} d="M19.8 11a8 8 0 0 1-13.4 6.7"/><path d="M3.4 20.6v-6.2h6.2Z"/>`,
        checkCircle: `<circle${L} cx="12" cy="12" r="10"/><path${S} stroke-width="2.6" d="m7.5 12.3 3 3 6-6.3"/>`,
        exam: `<path${L} d="M6 2h8.5L20 7.5V19a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z"/><path d="M14.5 2v3.5a2 2 0 0 0 2 2H20Z"/>
                <rect x="7.5" y="11.5" width="9" height="2.2" rx="1.1"/><rect x="7.5" y="15.8" width="6" height="2.2" rx="1.1"/>`,
        layers: `<path${L} d="m12 13.5 9.5-4.8V12L12 16.8 2.5 12V8.7Z"/><path${L} d="m12 18 9.5-4.8v3.3L12 21.3l-9.5-4.8v-3.3Z"/><path d="M12 2.7 21.5 7.5 12 12.3 2.5 7.5Z"/>`,
        target: `<circle${L} cx="12" cy="12" r="10"/><circle${L} cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="3.2"/>`,
        trophy: `<path${L} d="M7 5H4.2a.7.7 0 0 0-.7.8A5 5 0 0 0 8 10.3M17 5h2.8c.4 0 .8.4.7.8a5 5 0 0 1-4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.2"/>
                <path d="M6.5 2.5h11V8a5.5 5.5 0 0 1-11 0Z"/><path${L} d="M10 13.2h4v4.3h-4Z"/><rect x="6.5" y="17.5" width="11" height="4" rx="1.5"/>`,
        shield: `<path${L} d="M12 2 4 5v6.5c0 5 3.4 8.8 8 10.5 4.6-1.7 8-5.5 8-10.5V5Z"/><path d="M12 2v20c4.6-1.7 8-5.5 8-10.5V5Z"/>`,
        mic: `<rect x="8.5" y="2" width="7" height="12.5" rx="3.5"/><path${S}${L} d="M5 11a7 7 0 0 0 14 0"/><rect${L} x="10.9" y="17.5" width="2.2" height="4.5" rx="1.1"/>`,
        crown: `<path d="M3 7.5 7.5 11 12 4l4.5 7L21 7.5 19.2 17H4.8Z"/><rect${L} x="4.8" y="18.5" width="14.4" height="3" rx="1.5"/>
                <circle${L} cx="3" cy="7" r="1.8"/><circle${L} cx="21" cy="7" r="1.8"/><circle${L} cx="12" cy="3.4" r="1.8"/>`,
        scroll: `<path${L} d="M6 3h11a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6Z"/><path d="M6 3a3 3 0 0 0-3 3v1.5h6V6a3 3 0 0 0-3-3Z"/>
                <rect x="9" y="9" width="8" height="2" rx="1"/><rect x="9" y="13" width="6" height="2" rx="1"/><path d="M14 21a3 3 0 0 1-3-3h9a3 3 0 0 1-3 3Z"/>`,
        feather: `<path${L} d="M20.2 3.8C14 2.5 7 6.5 6 14.5L4 20l5.5-2C17.5 17 21.5 10 20.2 3.8Z"/><path${S} d="M16 8 4 20"/>`,
        bolt: `<path${L} d="M13.5 2 4 14h7l-1 8 10-12.5h-7Z"/><path d="M13.5 2 11 14h-7Z"/><path d="M10 22 20 9.5h-7Z"/>`,
        swords: `<g${L} transform="rotate(45 12 12)"><path d="M12 .8 13.5 3.5v11.3h-3V3.5Z"/><rect x="7.6" y="14.8" width="8.8" height="2.3" rx="1.15"/><rect x="10.9" y="17.1" width="2.2" height="3.6" rx="1"/><circle cx="12" cy="21.7" r="1.4"/></g>
                <g transform="rotate(-45 12 12)"><path d="M12 .8 13.5 3.5v11.3h-3V3.5Z"/><rect x="7.6" y="14.8" width="8.8" height="2.3" rx="1.15"/><rect x="10.9" y="17.1" width="2.2" height="3.6" rx="1"/><circle cx="12" cy="21.7" r="1.4"/></g>`,
        home: `<path${L} d="M3 10.6 12 3l9 7.6V19a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Z"/><path d="M9.5 22v-5.5a2.5 2.5 0 0 1 5 0V22Z"/><path d="M12 3 3 10.6V8.4L12 1l9 7.4v2.2Z"/>`,
        key: `<circle${L} cx="8" cy="15" r="6"/><circle cx="8" cy="15" r="2.3"/><path d="m11.5 10.7 8-8 2 2-1.6 1.6 1.6 1.6-2.2 2.2-1.6-1.6-1.4 1.4 1.4 1.4-2 2-1.4-1.4-1 1Z"/>`,
        lock: `<path${S}${L} stroke-width="2.6" d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11"/><rect x="4" y="10" width="16" height="12" rx="3.5"/>
                <circle cx="12" cy="15.4" r="1.8" fill="#fff" opacity=".85"/>`,
        link: `<path${S} stroke-width="2.4" d="M10 13.5a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.4 1.4"/><path${S}${L} stroke-width="2.4" d="M14 10.5a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.4-1.4"/>`,
        send: `<path${L} d="M21.5 2.5 2.5 10l7.3 3.2Z"/><path d="M21.5 2.5 14 21.5l-4.2-8.3Z"/>`,
        users: `<circle${L} cx="16.5" cy="7.5" r="3.5"/><path${L} d="M14 14.2c.8-.2 1.6-.2 2.5-.2 3.5 0 6 1.9 6 4.5V21h-6"/><circle cx="9" cy="7.5" r="4"/><path d="M1.5 19c0-3 3.2-5 7.5-5s7.5 2 7.5 5v2h-15Z"/>`,
        user: `<circle cx="12" cy="7.5" r="4.5"/><path${L} d="M3.5 20c0-3.6 3.8-6 8.5-6s8.5 2.4 8.5 6v1.5h-17Z"/>`,
        eye: `<path${L} d="M1.5 12S5.3 4.5 12 4.5 22.5 12 22.5 12 18.7 19.5 12 19.5 1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="4"/><circle cx="13.4" cy="10.6" r="1.3" fill="#fff" opacity=".8"/>`,
        trash: `<path${L} d="M5 7h14l-1 12.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19.5Z"/><rect x="3" y="4.5" width="18" height="3" rx="1.5"/><path d="M9 4.5V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5v1Z"/>
                <rect x="9.3" y="10.5" width="2" height="7" rx="1"/><rect x="12.7" y="10.5" width="2" height="7" rx="1"/>`,
        external: `<path${L} d="M5 4h6v3H6v11h11v-5h3v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M14 2.5h7.5V10l-2.8-2.8-6 6-1.9-1.9 6-6Z"/>`,
        play: `<circle${L} cx="12" cy="12" r="10"/><path d="M10 7.8v8.4c0 .6.6.9 1.1.6l6.6-4.2c.4-.3.4-.9 0-1.2L11.1 7.2c-.5-.3-1.1 0-1.1.6Z"/>`,
        inbox: `<path${L} d="M5.5 3.5h13l3.5 9v6.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6.5Z"/><path d="M2 12.5h5.5l1.5 3h6l1.5-3H22V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"/>`,
        sparkle: `<path d="M12 2c.7 4.9 3.1 7.3 8 8-4.9.7-7.3 3.1-8 8-.7-4.9-3.1-7.3-8-8 4.9-.7 7.3-3.1 8-8Z"/><path${L} d="M19 15c.3 2.1 1.4 3.2 3.5 3.5-2.1.3-3.2 1.4-3.5 3.5-.3-2.1-1.4-3.2-3.5-3.5 2.1-.3 3.2-1.4 3.5-3.5Z"/><circle${L} cx="5" cy="4.5" r="1.6"/>`,
        alert: `<path${L} d="M10.3 3.2a2 2 0 0 1 3.4 0l8.4 14.6a2 2 0 0 1-1.7 3H3.6a2 2 0 0 1-1.7-3Z"/><rect x="10.9" y="8" width="2.2" height="6.5" rx="1.1"/><circle cx="12" cy="17.3" r="1.3"/>`,
        trendUp: `<path${L} d="M3 21h18v-2H3Z"/><path${S} stroke-width="2.4" d="m3.5 15 5-5 4 4 7-7"/><path d="M21 4.5V11l-6.5-6.5Z"/>`,
        trendDown: `<path${L} d="M3 21h18v-2H3Z"/><path${S} stroke-width="2.4" d="m3.5 5 5 5 4-4 7 7"/><path d="M21 17.5V11l-6.5 6.5Z"/>`,
        sprout: `<path${L} d="M12 13C12 8.5 9 5.5 3.5 5.5 3.5 10.5 6.5 13 12 13Z"/><path d="M12 11c0-4.5 3-7.5 8.5-7.5 0 5-3 7.5-8.5 7.5Z"/><rect x="10.9" y="9.5" width="2.2" height="12.5" rx="1.1"/>`,
        chart: `<rect${L} x="3" y="11" width="4.5" height="10" rx="1.5"/><rect x="9.75" y="4" width="4.5" height="17" rx="1.5"/><rect${L} x="16.5" y="8" width="4.5" height="13" rx="1.5"/>`,
        list: `<rect${L} x="9" y="4.5" width="12.5" height="3" rx="1.5"/><rect${L} x="9" y="10.5" width="12.5" height="3" rx="1.5"/><rect${L} x="9" y="16.5" width="12.5" height="3" rx="1.5"/>
                <circle cx="4.5" cy="6" r="2"/><circle cx="4.5" cy="12" r="2"/><circle cx="4.5" cy="18" r="2"/>`,
        star: `<path d="m12 2 3 6.3 6.9.9-5 4.8 1.2 6.8L12 17.5l-6.1 3.3L7.1 14 2.1 9.2 9 8.3Z"/><path${L} d="M12 2v15.5l-6.1 3.3L7.1 14 2.1 9.2 9 8.3Z" fill="#fff"/>`,
        headphones: `<path${S}${L} stroke-width="2.4" d="M3.5 15v-3a8.5 8.5 0 0 1 17 0v3"/><rect x="2.5" y="13" width="5.5" height="8.5" rx="2.5"/><rect x="16" y="13" width="5.5" height="8.5" rx="2.5"/>`,
        pencil: `<path${L} d="M3 21h18v-2H3Z"/><path d="M15.2 3.3a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L9 18.5l-5 1 1-5Z"/>`,
        check: `<path${S} stroke-width="2.8" d="m4.5 12.5 5 5 10-11"/>`,
        x: `<path${S} stroke-width="2.6" d="M6 6l12 12M18 6 6 18"/>`,
        arrow: `<path${S} stroke-width="2.4" d="M5 12h14m-6-6 6 6-6 6"/>`,
        chevUp: `<path${S} stroke-width="2.4" d="m6 15 6-6 6 6"/>`,
        chevDown: `<path${S} stroke-width="2.4" d="m6 9 6 6 6-6"/>`,
        up: `<path d="M12 5.5 18.5 14h-13Z"/>`,
        down: `<path d="M12 18.5 5.5 10h13Z"/>`,
        flat: `<rect x="5" y="10.8" width="14" height="2.4" rx="1.2"/>`,
        hourglass: `<path${L} d="M6 2.5h12v3.2a6 6 0 0 1-3 5.2L13.2 12l1.8 1.1a6 6 0 0 1 3 5.2v3.2H6v-3.2a6 6 0 0 1 3-5.2l1.8-1.1L9 10.9a6 6 0 0 1-3-5.2Z"/>
                <path d="M8.5 19.5c0-1.7 1.6-3.3 3.5-4.3 1.9 1 3.5 2.6 3.5 4.3Z"/><rect x="4.5" y="1.5" width="15" height="2.5" rx="1.25"/><rect x="4.5" y="20" width="15" height="2.5" rx="1.25"/>`
    };

    function svg(name, cls) {
        return '<svg class="ui-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + (P[name] || P.sparkle) + '</svg>';
    }
    function tile(name, tone, size) {
        return '<span class="ui-tile t-' + (tone || 'blue') + (size ? ' ' + size : '') + '">' + svg(name) + '</span>';
    }
    function hydrate(root) {
        (root || document).querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = svg(el.dataset.ic); });
        (root || document).querySelectorAll('[data-tile]').forEach(el => {
            const [n, t, s] = el.dataset.tile.split(':');
            el.outerHTML = tile(n, t, s);
        });
    }

    // Ô icon gradient (chèn 1 lần)
    if (!document.getElementById('ui-icons-css')) {
        const st = document.createElement('style');
        st.id = 'ui-icons-css';
        st.textContent = `
            .ui-ic { width: 1em; height: 1em; flex-shrink: 0; display: inline-block; vertical-align: -0.14em; }
            .ui-tile { --g1:#60a5fa; --g2:#2563eb; --gs:37,99,235;
                width: 44px; height: 44px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
                background: linear-gradient(140deg, var(--g1), var(--g2)); color: #fff; font-size: 22px; position: relative; overflow: hidden;
                box-shadow: 0 6px 14px -6px rgba(var(--gs), .55), inset 0 1px 0 rgba(255,255,255,.35); }
            .ui-tile::after { content: ''; position: absolute; inset: 0 0 50% 0; background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0)); pointer-events: none; }
            .ui-tile .ui-ic { position: relative; z-index: 1; filter: drop-shadow(0 1px 1px rgba(0,0,0,.12)); }
            .ui-tile.sm { width: 34px; height: 34px; border-radius: 10px; font-size: 17px; }
            .ui-tile.xs { width: 28px; height: 28px; border-radius: 8px; font-size: 14px; }
            .ui-tile.lg { width: 56px; height: 56px; border-radius: 16px; font-size: 28px; }
            .ui-tile.t-blue   { --g1:#60a5fa; --g2:#2563eb; --gs:37,99,235; }
            .ui-tile.t-navy   { --g1:#3b5bdb; --g2:#142657; --gs:20,38,87; }
            .ui-tile.t-coral  { --g1:#fb7185; --g2:#f95052; --gs:249,80,82; }
            .ui-tile.t-orange { --g1:#fbbf24; --g2:#f97316; --gs:249,115,22; }
            .ui-tile.t-green  { --g1:#34d399; --g2:#059669; --gs:5,150,105; }
            .ui-tile.t-amber  { --g1:#fcd34d; --g2:#d97706; --gs:217,119,6; }
            .ui-tile.t-violet { --g1:#a78bfa; --g2:#7c3aed; --gs:124,58,237; }
            .ui-tile.t-cyan   { --g1:#67e8f9; --g2:#0891b2; --gs:8,145,178; }
            .ui-tile.t-pink   { --g1:#f9a8d4; --g2:#db2777; --gs:219,39,119; }
            .ui-tile.t-slate  { --g1:#cbd5e1; --g2:#64748b; --gs:100,116,139; }
            .ui-tile.t-ghost  { background: #f1f5f9; color: #64748b; box-shadow: inset 0 0 0 1px #e5e7eb; }
            .ui-tile.t-ghost::after { display: none; }
            body.dark-mode .ui-tile.t-ghost { background: #0f172a; color: #94a3b8; box-shadow: inset 0 0 0 1px #334155; }`;
        (document.head || document.documentElement).appendChild(st);
    }

    window.UIIcons = { svg, tile, hydrate, names: Object.keys(P) };
})();
