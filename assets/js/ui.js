/* ==========================================================================
   ui.js — طبقة الواجهة: أيقونات، تنبيهات، نوافذ، ضغط الصور، الملعب
   ========================================================================== */
(function () {
    'use strict';

    /* -------------------------------- الأيقونات --------------------------- */
    const PATHS = {
        search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/>',
        close: '<path d="M18 6L6 18M6 6l12 12"/>',
        chevron: '<path d="M15 18l-6-6 6-6"/>',
        chevronLeft: '<path d="M9 18l6-6-6-6"/>',
        arrowUpRight: '<path d="M7 17L17 7M17 7H9M17 7v8"/>',
        trophy: '<path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0V4z"/><path d="M6 6H4a2 2 0 0 0 2 2M18 6h2a2 2 0 0 1-2 2"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
        bolt: '<path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z"/>',
        shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z"/>',
        list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        table: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18M3 15h18M9 4v16"/>',
        flame: '<path d="M12 22c4 0 6-2.6 6-6 0-4-3-6-3-9 0 0-3 1.5-3 5 0-1-1-3-2-4 0 3-4 4.5-4 8 0 3.4 2 6 6 6z"/>',
        bars: '<path d="M4 7h16M4 12h16M4 17h16"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
        users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 5.2a3.3 3.3 0 0 1 0 6.4M18.5 20a6 6 0 0 0-2-4.4"/>',
        cloud: '<path d="M7 18h9.5a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 7.3 9.2 3.9 3.9 0 0 0 7 18z"/>',
        upload: '<path d="M12 16V4m0 0L8 8m4-4l4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
        camera: '<path d="M4 8h2.5l1.4-2h8.2L17.5 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',
        trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        check: '<path d="M20 6L9 17l-5-5"/>',
        edit: '<path d="M4 20h4L20 8l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
        lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
        key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 3l3 3M14 6l2 2"/>',
        settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3"/>',
        gavel: '<path d="M14 4l6 6-3 3-6-6 3-3z"/><path d="M9.5 8.5L4 14l3 3 5.5-5.5"/><path d="M3 21h9"/>',
        handshake: '<path d="M3 11l4-4 3 2 2-2 2 2 2-2 3 3-4 5-3-2-2 1-2-1-2 2-3-4z"/>',
        ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7l3 2-1 4h-4l-1-4 3-2z"/><path d="M12 3v4M4.5 9l3.5 4M19.5 9L16 13M7 19l4-4M17 19l-4-4"/>',
        target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/>',
        layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
        download: '<path d="M12 4v12m0 0l-4-4m4 4l4-4"/><path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/>',
        refresh: '<path d="M20 11a8 8 0 1 0-2.4 5.7M20 11h-5"/>',
        star: '<path d="M12 3.5l2.6 5.6 6 .7-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.8l6-.7L12 3.5z"/>',
        bell: '<path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5 1.5 5h-15S6 13 6 9z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
        clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
        pin: '<path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10z"/><circle cx="12" cy="11" r="2.2"/>',
        sparkles: '<path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
        chart: '<path d="M4 20V9M10 20V4M16 20v-7M22 20H2"/>',
        eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
        copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-6A3.5 3.5 0 0 0 3 6.5v6A2.5 2.5 0 0 0 5.5 15"/>',
        card: '<rect x="6" y="3" width="12" height="18" rx="2.5"/>',
        whistle: '<path d="M14 8h6a2 2 0 0 1 0 4h-4"/><circle cx="8" cy="14" r="5"/><path d="M13 12.5L21 6"/>',
        home: '<path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8z"/><path d="M9.5 21v-6h5v6"/>',
        logout: '<path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 8l4 4-4 4M20 12H10"/>',
        swap: '<path d="M7 4v13m0 0l-3-3m3 3l3-3"/><path d="M17 20V7m0 0l3 3m-3-3l-3 3"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
        filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
        save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-6h8v6"/>',
        grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>'
    };

    function icon(name, cls, extra) {
        const p = PATHS[name];
        if (!p) return '';
        return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"' + (extra || '') + '>' + p + '</svg>';
    }

    /* -------------------------------- أدوات ------------------------------- */
    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function num(v, fallback) {
        const n = Number(v);
        return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
    }

    function initials(name) {
        if (!name) return '؟';
        const parts = String(name).trim().split(/\s+/);
        return parts[0].charAt(0) || '؟';
    }

    function fmtDate(iso) {
        if (!iso) return '';
        const d = new Date(iso + 'T00:00:00');
        if (isNaN(d.getTime())) return iso;
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
        return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
    }

    function fmtDateShort(iso) {
        if (!iso) return '';
        const parts = String(iso).split('-');
        if (parts.length < 3) return iso;
        return parts[2] + '/' + parts[1];
    }

    function relTime(iso) {
        if (!iso) return '';
        const then = new Date(iso).getTime();
        if (isNaN(then)) return iso;
        const diff = Math.floor((Date.now() - then) / 1000);
        if (diff < 60) return 'قبل لحظات';
        if (diff < 3600) return 'قبل ' + Math.floor(diff / 60) + ' دقيقة';
        if (diff < 86400) return 'قبل ' + Math.floor(diff / 3600) + ' ساعة';
        if (diff < 2592000) return 'قبل ' + Math.floor(diff / 86400) + ' يوم';
        return fmtDate(iso.slice(0, 10));
    }

    function debounce(fn, ms) {
        let t;
        return function () {
            const args = arguments, self = this;
            clearTimeout(t);
            t = setTimeout(() => fn.apply(self, args), ms || 260);
        };
    }

    /* ------------------------------- التنبيهات ---------------------------- */
    function toastWrap() {
        let el = document.getElementById('toastWrap');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toastWrap';
            el.className = 'toast-wrap';
            document.body.appendChild(el);
        }
        return el;
    }

    function toast(msg, type) {
        const wrap = toastWrap();
        const el = document.createElement('div');
        el.className = 'toast ' + (type || 'ok');
        const ic = type === 'err' ? 'info' : (type === 'warn' ? 'info' : 'check');
        el.innerHTML = icon(ic) + '<span>' + esc(msg) + '</span>';
        wrap.appendChild(el);
        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 320);
        }, 2600);
    }

    document.addEventListener('store:toast', e => {
        if (e.detail && e.detail.msg) toast(e.detail.msg, e.detail.type);
    });

    /* -------------------------------- النوافذ ----------------------------- */
    function openModal(opts) {
        closeModal();
        const wrap = document.createElement('div');
        wrap.className = 'overlay' + (opts.sheet ? ' sheet-mode' : '');
        wrap.id = 'modalOverlay';
        const innerIdAttr = opts.id ? ' id="' + opts.id + '"' : '';
        wrap.innerHTML =
            '<div' + innerIdAttr + ' class="modal ' + (opts.wide ? 'wide' : '') + ' ' + (opts.narrow ? 'narrow' : '') + ' ' + (opts.sheet ? 'sheet' : '') + ' glass-deep glow-top" role="dialog" aria-modal="true">' +
                '<div class="modal-top">' +
                    '<div class="row" style="gap:8px;min-width:0">' +
                        (opts.leading || '') +
                        '<div style="min-width:0">' +
                            '<div class="card-title" style="font-size:13px">' + (opts.title || '') + '</div>' +
                            (opts.subtitle ? '<div class="card-sub">' + opts.subtitle + '</div>' : '') +
                        '</div>' +
                    '</div>' +
                    '<button class="tool-btn" data-close="1" aria-label="إغلاق">' + icon('close') + '</button>' +
                '</div>' +
                '<div class="modal-body">' + (opts.body || '') + '</div>' +
            '</div>';

        document.body.appendChild(wrap);
        document.body.style.overflow = 'hidden';

        wrap.addEventListener('click', e => {
            if (e.target === wrap || e.target.closest('[data-close]')) closeModal();
        });
        const esc_ = e => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc_); } };
        document.addEventListener('keydown', esc_);

        if (typeof opts.onMount === 'function') opts.onMount(wrap);
        return wrap;
    }

    function closeModal() {
        const el = document.getElementById('modalOverlay');
        if (el) el.remove();
        document.body.style.overflow = '';
    }

    function confirmDialog(message, opts) {
        opts = opts || {};
        return new Promise(resolve => {
            const wrap = openModal({
                narrow: true,
                title: esc(opts.title || 'تأكيد العملية'),
                body: '<p style="font-size:12.5px;color:var(--txt-2);line-height:2">' + esc(message) + '</p>' +
                    '<div class="row" style="gap:8px;margin-top:6px">' +
                    '<button class="btn ' + (opts.danger ? 'btn-rose' : 'btn-gold') + ' btn-block" data-yes="1">' + icon('check') + (opts.yes || 'نعم، تأكيد') + '</button>' +
                    '<button class="btn btn-block" data-close="1">إلغاء</button>' +
                    '</div>',
                onMount: root => {
                    root.querySelector('[data-yes]').addEventListener('click', () => { closeModal(); resolve(true); });
                    root.addEventListener('click', e => { if (e.target.closest('[data-close]')) resolve(false); });
                }
            });
            wrap.addEventListener('click', e => { if (e.target === wrap) resolve(false); });
        });
    }

    /* ------------------------------ ضغط الصور ---------------------------- */
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = () => reject(new Error('read-error'));
            fr.readAsDataURL(file);
        });
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('image-error'));
            img.src = src;
        });
    }

    /**
     * ضغط وتقليل حجم الصورة → Data URL صغير مناسب للتخزين السحابي
     * @param {File} file
     * @param {{max?:number, square?:boolean, quality?:number, format?:string}} opts
     */
    function compressImage(file, opts) {
        opts = opts || {};
        const max = opts.max || 360;
        const square = opts.square !== false;
        const quality = opts.quality || 0.86;
        return readFileAsDataURL(file).then(src => loadImage(src)).then(img => {
            const canvas = document.createElement('canvas');
            let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
            if (square) {
                const side = Math.min(w, h);
                const sx = (w - side) / 2, sy = (h - side) / 2;
                w = h = Math.min(max, side);
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, w, h);
            } else {
                const scale = Math.min(1, max / Math.max(w, h));
                w = Math.round(w * scale); h = Math.round(h * scale);
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            }
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            let out = canvas.toDataURL('image/webp', quality);
            if (!out || out.indexOf('data:image/webp') !== 0) {
                out = canvas.toDataURL('image/jpeg', quality);
            }
            return out;
        });
    }

    /** اختيار صورة من ملف → يعيد Data URL مضغوط أو null */
    function pickImage(opts) {
        opts = opts || {};
        return new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = opts.accept || 'image/*';
            input.style.display = 'none';
            document.body.appendChild(input);
            input.addEventListener('change', () => {
                const file = input.files && input.files[0];
                input.remove();
                if (!file) return resolve(null);
                if (!/^image\//.test(file.type)) { toast('الملف المختار ليس صورة', 'err'); return resolve(null); }
                compressImage(file, opts)
                    .then(url => resolve(url))
                    .catch(err => { console.error(err); toast('تعذر معالجة الصورة', 'err'); resolve(null); });
            });
            input.click();
        });
    }

    /* --------------------------- عناصر الفرق واللاعبين ------------------- */
    function teamCrest(team, size, cls) {
        if (!team) return '';
        const s = size || 'md';
        const logo = Store.mediaUrl('team_' + team.id);
        const style = logo ? '' : 'background:linear-gradient(160deg,' + (team.color || '#1e3a8a') + ',' + shade(team.color || '#1e3a8a', -32) + ')';
        return '<span class="crest crest-' + s + ' ' + (cls || '') + '" style="' + style + '">' +
            (logo ? '<img src="' + logo + '" alt="' + esc(team.name) + '">' : '<span>' + esc(initials(team.name)) + '</span>') +
            '</span>';
    }

    function playerAvatar(player, size, opts) {
        if (!player) return '';
        opts = opts || {};
        const s = size || 'sm';
        const photo = Store.mediaUrl('player_' + player.id);
        const team = Store.team(player.teamId);
        const bg = team ? 'background:linear-gradient(160deg,' + (team.color || '#1e3a8a') + ',' + shade(team.color || '#1e3a8a', -30) + ')' : '';
        return '<span class="avatar av-' + s + ' ' + (opts.cls || '') + '" style="' + bg + '">' +
            (photo ? '<img src="' + photo + '" alt="' + esc(player.name) + '">' : '<span>' + esc(initials(player.name)) + '</span>') +
            '</span>';
    }

    function shade(hex, percent) {
        try {
            const c = String(hex).replace('#', '');
            const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
            const n = parseInt(full, 16);
            let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
            r = Math.max(0, Math.min(255, Math.round(r + (255 * percent / 100))));
            g = Math.max(0, Math.min(255, Math.round(g + (255 * percent / 100))));
            b = Math.max(0, Math.min(255, Math.round(b + (255 * percent / 100))));
            return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        } catch (e) {
            return hex;
        }
    }

    /* ------------------------------- الملعب ------------------------------- */
    function rowY(side, index, total) {
        if (side === 'away') {
            const start = 24, end = 46;
            if (total <= 1) return (start + end) / 2;
            return start + index * (end - start) / (total - 1);
        }
        const start = 76, end = 54;
        if (total <= 1) return (start + end) / 2;
        return start - index * (start - end) / (total - 1);
    }

    function slotX(index, total) {
        if (total <= 1) return 50;
        const pad = total > 4 ? 8 : 12;
        const usable = 100 - pad * 2;
        return pad + (usable * (index + 0.5)) / total;
    }

    function markerHTML(player, x, y, side, extraCls) {
        if (!player) {
            return '<div class="marker slot-empty ' + (extraCls || '') + '" style="left:' + x + '%;top:' + y + '%">' +
                '<div class="marker-face">' + icon('plus') + '</div>' +
                '<span class="marker-name">شاغر</span>' +
                '</div>';
        }
        const photo = Store.mediaUrl('player_' + player.id);
        return '<div class="marker ' + side + ' ' + (extraCls || '') + '" data-player="' + esc(player.id) + '" style="left:' + x + '%;top:' + y + '%" title="' + esc(player.name + ' — ' + (player.pos || '')) + '">' +
            '<div class="marker-face">' +
                (photo ? '<img src="' + photo + '" alt="' + esc(player.name) + '">' : esc(player.number != null ? player.number : initials(player.name))) +
                (photo ? '<span class="marker-num">' + esc(player.number != null ? player.number : '') + '</span>' : '') +
            '</div>' +
            '<span class="marker-name">' + esc(shortName(player.name)) + '</span>' +
            '</div>';
    }

    function shortName(name) {
        if (!name) return '';
        const parts = String(name).trim().split(/\s+/);
        if (parts.length === 1) return parts[0];
        return parts[0] + ' ' + parts[1];
    }

    /**
     * يرسم تشكيلة فريق واحد على ملعب كامل
     */
    function pitchSingle(team, lineup, opts) {
        opts = opts || {};
        // الحارس أولاً ثم الصفوف — نفس ترتيب خانات المحرر
        let html = '';
        const gk = lineup && lineup.gk ? Store.player(lineup.gk) : null;
        html += markerHTML(gk, 50, 89, 'home');
        const rows = (lineup && lineup.rows) || [];
        rows.forEach((row, ri) => {
            row.players.forEach((pid, pi) => {
                const p = pid ? Store.player(pid) : null;
                html += markerHTML(p, slotX(pi, row.players.length), rowY('home', ri, rows.length), 'home');
            });
        });
        return '<div class="pitch ' + (opts.cls || '') + '" style="' + (opts.height ? '--pitch-h:' + opts.height + 'px' : '') + '">' +
            '<div class="pitch-half"></div>' +
            '<div class="pitch-box top"></div><div class="pitch-box bottom"></div>' +
            '<span class="pitch-team-label bottom">' + esc(team ? team.name : '') + ' — ' + esc((lineup && lineup.formation) || '') + '</span>' +
            html +
            '</div>';
    }

    /**
     * يرسم تشكيلة مباراة كاملة (الفريقان على ملعب واحد)
     */
    function pitchMatch(homeTeam, awayTeam, homeLineup, awayLineup, opts) {
        opts = opts || {};
        const paint = (lineup, side) => {
            if (!lineup) return '';
            let out = '';
            (lineup.rows || []).forEach((row, ri) => {
                row.players.forEach((pid, pi) => {
                    const p = pid ? Store.player(pid) : null;
                    out += markerHTML(p, slotX(pi, row.players.length), rowY(side, ri, lineup.rows.length), side);
                });
            });
            const gk = lineup.gk ? Store.player(lineup.gk) : null;
            out += markerHTML(gk, 50, side === 'away' ? 10 : 90, side);
            return out;
        };
        return '<div class="pitch ' + (opts.cls || '') + '" style="' + (opts.height ? '--pitch-h:' + opts.height + 'px' : '') + '">' +
            '<div class="pitch-half"></div>' +
            '<div class="pitch-box top"></div><div class="pitch-box bottom"></div>' +
            '<span class="pitch-team-label top">' + esc(awayTeam ? awayTeam.name : '') + ' — ' + esc((awayLineup && awayLineup.formation) || '') + '</span>' +
            '<span class="pitch-team-label bottom">' + esc(homeTeam ? homeTeam.name : '') + ' — ' + esc((homeLineup && homeLineup.formation) || '') + '</span>' +
            paint(awayLineup, 'away') + paint(homeLineup, 'home') +
            '</div>';
    }

    /**
     * قائمة البدلاء: كل من ليس في التشكيلة الأساسية
     */
    function benchList(teamId, lineup) {
        const squad = Store.squad(teamId);
        const used = {};
        if (lineup) {
            if (lineup.gk) used[lineup.gk] = true;
            (lineup.rows || []).forEach(r => r.players.forEach(id => { if (id) used[id] = true; }));
        }
        const bench = squad.filter(p => !used[p.id]);
        return bench;
    }

    function benchHTML(teamId, lineup) {
        const bench = benchList(teamId, lineup);
        if (!bench.length) return '<div class="mini-note">لا يوجد بدلاء مسجلون لهذا الفريق بعد.</div>';
        return '<div class="bench-grid">' + bench.map(p =>
            '<div class="bench-item">' +
                playerAvatar(p, 'xs') +
                '<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(shortName(p.name)) + '</span>' +
                '<span class="font-num" style="color:var(--gold);margin-inline-start:auto">' + esc(p.number) + '</span>' +
            '</div>'
        ).join('') + '</div>';
    }

    /* ------------------------------ أدوات متنوعة -------------------------- */
    function formDots(form) {
        if (!form || !form.length) return '<span style="color:var(--txt-4)">—</span>';
        return '<span class="form-dots">' + form.map(f =>
            '<span class="form-dot ' + (f === 'W' ? 'fd-w' : f === 'D' ? 'fd-d' : 'fd-l') + '"></span>'
        ).join('') + '</span>';
    }

    function badge(text, kind, ic) {
        return '<span class="badge badge-' + (kind || 'plain') + '">' + (ic ? icon(ic) : '') + esc(text) + '</span>';
    }

    function copyText(text) {
        if (navigator.clipboard) return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
        return Promise.resolve(false);
    }

    function download(filename, content, mime) {
        const blob = new Blob([content], { type: mime || 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    function scrollTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.UI = {
        icon: icon,
        esc: esc,
        num: num,
        initials: initials,
        fmtDate: fmtDate,
        fmtDateShort: fmtDateShort,
        relTime: relTime,
        debounce: debounce,
        toast: toast,
        openModal: openModal,
        closeModal: closeModal,
        confirm: confirmDialog,
        compressImage: compressImage,
        pickImage: pickImage,
        teamCrest: teamCrest,
        playerAvatar: playerAvatar,
        shade: shade,
        pitchSingle: pitchSingle,
        pitchMatch: pitchMatch,
        benchList: benchList,
        benchHTML: benchHTML,
        markerHTML: markerHTML,
        formDots: formDots,
        badge: badge,
        shortName: shortName,
        copyText: copyText,
        download: download,
        scrollTop: scrollTop
    };
})();
