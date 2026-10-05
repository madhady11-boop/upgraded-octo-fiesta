/* ==========================================================================
   admin.js — منطق لوحة التحكم المستقلة
   ========================================================================== */
(function () {
    'use strict';

    const S = window.Store;
    const I = UI.icon;
    const el = id => document.getElementById(id);
    const setHTML = (id, html) => { const e = el(id); if (e) e.innerHTML = html; };

    const NAV = [
        { id: 'overview', label: 'نظرة عامة', ic: 'grid', short: 'الرئيسية' },
        { id: 'matches', label: 'المباريات والنتائج', ic: 'ball', short: 'المباريات' },
        { id: 'teams', label: 'الفرق والشعارات', ic: 'shield', short: 'الفرق' },
        { id: 'players', label: 'اللاعبون والصور', ic: 'users', short: 'اللاعبون' },
        { id: 'lineups', label: 'محرر التشكيلات', ic: 'layers', short: 'التشكيلات' },
        { id: 'discipline', label: 'الانضباط والعقوبات', ic: 'gavel', short: 'الانضباط' },
        { id: 'transfers', label: 'الانتقالات', ic: 'swap', short: 'الانتقالات' },
        { id: 'settings', label: 'الإعدادات والنسخ', ic: 'settings', short: 'الإعدادات' }
    ];

    const POSITIONS = ['حارس مرمى', 'حارس احتياطي', 'قلب دفاع', 'مدافع أيمن', 'مدافع أيسر', 'ظهير أيمن', 'ظهير أيسر', 'وسط مدافع', 'لاعب وسط', 'صانع ألعاب', 'جناح أيمن', 'جناح أيسر', 'مهاجم صريح', 'رأس حربة', 'جناح مهاجم'];

    const A = {
        section: 'overview',
        unlocked: false,
        playerTeam: 'all',
        playerQuery: '',
        playerLimit: 60,
        matchEditId: null,
        matchEvents: [],
        lineup: { scope: 'match', matchId: null, teamId: null, side: 'home', formation: '4-3-3', draft: null, slotTeamId: null }
    };

    /* ======================================================================
       بوابة الدخول
       ====================================================================== */
    function paintGateCrest() {
        const c = S.mediaUrl('league_crest');
        el('gateCrest').innerHTML = c ? '<img src="' + c + '" alt="">' : I('lock', '', ' style="width:24px;height:24px"');
    }

    function gateDots() {
        const v = el('gateInput').value || '';
        setHTML('gateDots', Array.from({ length: Math.max(4, v.length) }).map((_, i) => '<span class="pin-dot ' + (i < v.length ? 'filled' : '') + '"></span>').join(''));
    }

    function buildKeypad() {
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'مسح', '0', '⌫'];
        setHTML('gateKeypad', keys.map(k => '<button type="button" data-key="' + k + '">' + k + '</button>').join(''));
        el('gateKeypad').addEventListener('click', e => {
            const b = e.target.closest('[data-key]');
            if (!b) return;
            const k = b.dataset.key;
            const input = el('gateInput');
            if (k === 'مسح') input.value = '';
            else if (k === '⌫') input.value = input.value.slice(0, -1);
            else if (input.value.length < 8) input.value += k;
            gateDots();
        });
        el('gateInput').addEventListener('input', gateDots);
        el('gateConfirm').addEventListener('click', tryUnlock);
        el('gateInput').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
    }

    function tryUnlock() {
        const pin = (S.state.settings && S.state.settings.pin) || '2016';
        if (el('gateInput').value === String(pin)) {
            sessionStorage.setItem('hedood_admin', '1');
            unlock();
        } else {
            el('gateHint').innerHTML = '<span style="color:var(--rose);font-weight:800">رمز المرور غير صحيح، حاول مرة أخرى.</span>';
            el('gateInput').value = '';
            gateDots();
            UI.toast('رمز المرور غير صحيح', 'err');
        }
    }

    function unlock() {
        A.unlocked = true;
        el('gate').remove();
        el('adminTopbar').hidden = false;
        el('adminApp').hidden = false;
        el('adminBottomNav').hidden = false;
        paintChrome();
        setSection(A.section);
        S.on(onData);
    }

    function paintChrome() {
        const c = S.mediaUrl('league_crest');
        el('admBrandMark').innerHTML = c ? '<img src="' + c + '" alt="">' : I('shield', '', ' style="width:22px;height:22px"');
        el('admBrandSub').textContent = (S.state.settings && S.state.settings.leagueName) || 'دوري الحدود الرياضي';
        el('admSyncBtn').innerHTML = I('refresh');
        document.querySelector('a.tool-btn[href="index.html"]').innerHTML = I('arrowUpRight');
        el('admLogout').innerHTML = I('logout');

        setHTML('sideNav', NAV.map(n =>
            '<button data-sec="' + n.id + '" class="' + (A.section === n.id ? 'active' : '') + '">' + I(n.ic) + '<span>' + n.label + '</span></button>'
        ).join(''));
        setHTML('adminBottomNav', NAV.map(n =>
            '<button data-sec="' + n.id + '" class="' + (A.section === n.id ? 'active' : '') + '">' + I(n.ic) + '<span>' + n.short + '</span></button>'
        ).join(''));

        document.querySelectorAll('[data-sec]').forEach(b => {
            b.onclick = () => setSection(b.dataset.sec);
        });
        paintCloudBadge();
    }

    function paintCloudBadge() {
        const c = S.cloud;
        const map = {
            connected: ['badge-emerald', 'متصل بالسحابة'],
            sync: ['badge-gold', 'جارٍ الحفظ...'],
            connecting: ['badge-gold', 'جارٍ الاتصال...'],
            error: ['badge-rose', 'وضع محلي'],
            idle: ['badge-plain', 'تهيئة...']
        };
        const [cls, txt] = map[c.status] || map.idle;
        el('admCloudBadge').className = 'badge ' + cls;
        el('admCloudBadge').textContent = txt;
        const dot = el('ovDot');
        if (dot) dot.className = 'dot-status' + (c.status === 'connected' ? '' : c.status === 'error' ? ' off' : ' sync');
        const tx = el('ovCloudText');
        if (tx) tx.textContent = c.message;
    }

    function setSection(id) {
        A.section = id;
        NAV.forEach(n => {
            const sec = el('sec-' + n.id);
            if (sec) sec.classList.toggle('active', n.id === id);
        });
        paintChrome();
        renderSection(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderSection(id) {
        if (id === 'overview') { renderKpis(); renderCloudCard(); renderQuick(); renderActivity(); }
        if (id === 'matches') { fillDivisionSelects(); renderMatchList(); }
        if (id === 'teams') renderTeamsGrid();
        if (id === 'players') { fillPlayerTeamFilter(); renderPlayersList(); }
        if (id === 'lineups') renderLineupEditor();
        if (id === 'discipline') { fillSanctionSelect(); renderSanctions(); }
        if (id === 'transfers') renderTransfersAdmin();
        if (id === 'settings') renderSettings();
    }

    /* ======================================================================
       نظرة عامة
       ====================================================================== */
    function renderKpis() {
        const t = S.totals();
        const kpis = [
            ['shield', 'الأندية', t.teams, 'var(--violet)', 'var(--violet-soft)'],
            ['users', 'اللاعبون', t.players, 'var(--cyan)', 'var(--cyan-soft)'],
            ['ball', 'المباريات', t.matches, 'var(--gold)', 'var(--gold-soft)'],
            ['bolt', 'مباشر', t.live, 'var(--emerald)', 'var(--emerald-soft)'],
            ['flame', 'الأهداف', t.goals, 'var(--gold)', 'var(--gold-soft)'],
            ['lock', 'المحرومون', S.suspended().length, 'var(--rose)', 'var(--rose-soft)'],
            ['gavel', 'العقوبات', t.sanctions, 'var(--rose)', 'var(--rose-soft)'],
            ['swap', 'الانتقالات', t.transfers, 'var(--emerald)', 'var(--emerald-soft)']
        ];
        setHTML('admKpis', kpis.map(([ic, k, v, col, bg]) =>
            '<div class="glass glow-top kpi">' +
                '<span class="kpi-ic" style="background:' + bg + ';color:' + col + '">' + I(ic) + '</span>' +
                '<div><div class="kpi-v font-num">' + v + '</div><div class="kpi-k">' + k + '</div></div>' +
            '</div>').join(''));
    }

    function renderCloudCard() {
        const c = S.cloud;
        el('ovCloudHelp').innerHTML = c.status === 'connected'
            ? I('check') + ' كل تعديل تحفظه هنا يُنشر مباشرة إلى الموقع العام لجميع الزوار لحظياً.'
            : I('info') + ' أنت تعمل حالياً بالوضع المحلي (البيانات محفوظة على هذا الجهاز). اضغط «إعادة الاتصال» لمحاولة المزامنة السحابية، أو استخدم التصدير للاحتفاظ بنسخة.';
        el('ovDot').className = 'dot-status' + (c.status === 'connected' ? '' : c.status === 'error' ? ' off' : ' sync');
        el('ovCloudText').textContent = c.message;
    }

    function renderQuick() {
        const items = [
            ['plus', 'تسجيل مباراة جديدة', 'matches'],
            ['camera', 'رفع شعارات الفرق', 'teams'],
            ['users', 'رفع صور اللاعبين', 'players'],
            ['layers', 'ترتيب التشكيلة', 'lineups'],
            ['gavel', 'خصم نقاط', 'discipline'],
            ['settings', 'الشعار والبانات', 'settings']
        ];
        setHTML('admQuick', items.map(([ic, label, sec]) =>
            '<button class="glass-flat card-pad press" data-sec="' + sec + '" style="text-align:start;display:flex;align-items:center;gap:10px">' +
                '<span class="kpi-ic" style="background:var(--gold-soft);color:var(--gold)">' + I(ic) + '</span>' +
                '<span style="font-size:12px;font-weight:800">' + label + '</span></button>').join(''));
        el('admQuick').querySelectorAll('[data-sec]').forEach(b => b.onclick = () => setSection(b.dataset.sec));
    }

    function renderActivity() {
        const items = [];
        (S.state.matches || []).filter(m => m.status === 'FT').slice(0, 4).forEach(m => {
            const h = S.team(m.homeTeamId), a = S.team(m.awayTeamId);
            items.push({
                ic: 'ball', col: 'var(--emerald)',
                title: (h ? h.name : '') + ' ' + m.homeScore + ' - ' + m.awayScore + ' ' + (a ? a.name : ''),
                sub: 'نتيجة معتمدة • ' + UI.fmtDate(m.date)
            });
        });
        (S.state.transfers || []).slice(0, 3).forEach(t => items.push({
            ic: t.type === 'retirement' ? 'star' : 'swap', col: 'var(--cyan)',
            title: t.playerName + ' — ' + t.from + ' ← ' + t.to,
            sub: 'انتقالات • ' + UI.relTime(t.date)
        }));
        (S.state.sanctions || []).slice(0, 2).forEach(s => {
            const t = S.team(s.teamId);
            items.push({ ic: 'gavel', col: 'var(--rose)', title: 'خصم ' + s.points + ' نقاط من ' + (t ? t.name : ''), sub: s.reason });
        });
        if (!items.length) { setHTML('admActivity', '<div class="empty">' + I('info') + '<span>لا يوجد نشاط بعد</span></div>'); return; }
        setHTML('admActivity', items.map(it =>
            '<div class="list-row"><div class="list-main">' +
                '<span class="kpi-ic" style="width:34px;height:34px;background:rgba(255,255,255,.05);color:' + it.col + '">' + I(it.ic) + '</span>' +
                '<div><div class="list-title">' + UI.esc(it.title) + '</div><div class="list-sub">' + UI.esc(it.sub) + '</div></div>' +
            '</div></div>').join(''));
    }

    /* ======================================================================
       المباريات
       ====================================================================== */
    function fillDivisionSelects() {
        const options = S.divisions().map(d => '<option value="' + d.id + '">' + UI.esc(d.name) + '</option>').join('');
        const cur = el('mf-division').value;
        el('mf-division').innerHTML = options;
        if (cur) el('mf-division').value = cur;
        const f = el('ml-filterDiv');
        const curF = f.value;
        f.innerHTML = '<option value="all">كل الدرجات</option>' + options;
        f.value = curF || 'all';
        fillMatchTeamSelects();
    }

    function teamsOfDivision(div) {
        return S.teams(div);
    }

    function fillMatchTeamSelects() {
        const div = el('mf-division').value || 'premier';
        const teams = teamsOfDivision(div);
        const opts = teams.map(t => '<option value="' + t.id + '">' + UI.esc(t.name) + '</option>').join('');
        const h = el('mf-home'), a = el('mf-away');
        const hv = h.value, av = a.value;
        h.innerHTML = opts; a.innerHTML = opts;
        if (hv && teams.some(t => t.id === hv)) h.value = hv; else h.selectedIndex = 0;
        if (av && teams.some(t => t.id === av)) a.value = av; else a.selectedIndex = Math.min(1, teams.length - 1);
        paintMatchCrests();
    }

    function paintMatchCrests() {
        el('mf-homeCrest').innerHTML = UI.teamCrest(S.team(el('mf-home').value), 'sm');
        el('mf-awayCrest').innerHTML = UI.teamCrest(S.team(el('mf-away').value), 'sm');
    }

    function eventRowHTML(ev, idx) {
        const home = S.team(el('mf-home').value), away = S.team(el('mf-away').value);
        return '<div class="glass-flat" style="padding:9px" data-ev="' + idx + '">' +
            '<div class="grid-4" style="align-items:end;gap:8px">' +
                '<div class="field"><label>النوع</label><select class="inp ev-type">' +
                    ['goal:⚽ هدف', 'yellow:🟨 إنذار', 'red:🟥 طرد', 'sub:🔁 تبديل'].map(o => {
                        const [v, l] = o.split(':');
                        return '<option value="' + v + '"' + (ev.type === v ? ' selected' : '') + '>' + l + '</option>';
                    }).join('') + '</select></div>' +
                '<div class="field"><label>الفريق</label><select class="inp ev-team">' +
                    '<option value="home"' + (ev.teamId === (home && home.id) ? ' selected' : '') + '>' + UI.esc(home ? home.name : 'المستضيف') + '</option>' +
                    '<option value="away"' + (ev.teamId === (away && away.id) ? ' selected' : '') + '>' + UI.esc(away ? away.name : 'الزائر') + '</option>' +
                '</select></div>' +
                '<div class="field"><label>اللاعب</label><input class="inp ev-player" list="evPlayers' + idx + '" value="' + UI.esc(ev.player || '') + '">' +
                    '<datalist id="evPlayers' + idx + '">' + squadOptions(el('mf-home').value) + squadOptions(el('mf-away').value) + '</datalist></div>' +
                '<div class="field"><label>الدقيقة</label><input type="number" class="inp ev-min" value="' + UI.num(ev.min, 45) + '" min="1" max="130"></div>' +
            '</div>' +
            '<div class="row" style="justify-content:flex-end;margin-top:7px">' +
                '<button type="button" class="btn btn-sm btn-rose" data-remove-ev="' + idx + '">' + I('trash') + 'حذف</button>' +
            '</div></div>';
    }

    function squadOptions(teamId) {
        return S.squad(teamId).map(p => '<option value="' + UI.esc(p.name) + '">' + UI.esc(p.name + ' (#' + p.number + ')') + '</option>').join('');
    }

    function renderMatchEvents() {
        setHTML('mf-events', A.matchEvents.length
            ? A.matchEvents.map((ev, i) => eventRowHTML(ev, i)).join('')
            : '<div class="mini-note">لم تُضف أحداث بعد — الأهداف والبطاقات تسجّل هنا لتظهر في صفحة المباراة.</div>');
    }

    function syncEventsFromDOM() {
        const rows = el('mf-events').querySelectorAll('[data-ev]');
        rows.forEach((r, i) => {
            if (!A.matchEvents[i]) return;
            A.matchEvents[i].type = r.querySelector('.ev-type').value;
            A.matchEvents[i].player = r.querySelector('.ev-player').value.trim();
            A.matchEvents[i].min = UI.num(r.querySelector('.ev-min').value, 45);
            const side = r.querySelector('.ev-team').value;
            A.matchEvents[i].teamId = side === 'away' ? el('mf-away').value : el('mf-home').value;
        });
    }

    function resetMatchForm() {
        A.matchEditId = null;
        A.matchEvents = [];
        el('mf-id').value = '';
        el('mfTitle').textContent = 'تسجيل مباراة جديدة';
        el('mfSubmit').textContent = 'حفظ المباراة';
        el('mf-round').value = 1;
        el('mf-hs').value = 0;
        el('mf-as').value = 0;
        el('mf-minute').value = '';
        el('mf-status').value = 'NS';
        el('mf-date').value = new Date().toISOString().slice(0, 10);
        el('mf-time').value = '09:45 م';
        el('mf-venue').value = 'ملعب الحدود الرئيسي';
        renderMatchEvents();
    }

    function loadMatchIntoForm(id) {
        const m = S.match(id);
        if (!m) return;
        A.matchEditId = id;
        A.matchEvents = (m.events || []).map(e => ({ type: e.type, player: e.player, min: e.min, teamId: e.teamId }));
        el('mfTitle').textContent = 'تعديل مباراة: ' + S.team(m.homeTeamId).name + ' × ' + S.team(m.awayTeamId).name;
        el('mfSubmit').textContent = 'تحديث المباراة';
        el('mf-division').value = m.division;
        fillMatchTeamSelects();
        el('mf-round').value = m.round || 1;
        el('mf-home').value = m.homeTeamId;
        el('mf-away').value = m.awayTeamId;
        el('mf-hs').value = UI.num(m.homeScore);
        el('mf-as').value = UI.num(m.awayScore);
        el('mf-minute').value = m.minute || '';
        el('mf-status').value = m.status || 'NS';
        el('mf-date').value = m.date || new Date().toISOString().slice(0, 10);
        el('mf-time').value = m.time || '';
        el('mf-venue').value = m.venue || '';
        paintMatchCrests();
        renderMatchEvents();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function saveMatch(e) {
        e.preventDefault();
        syncEventsFromDOM();
        const homeId = el('mf-home').value, awayId = el('mf-away').value;
        if (!homeId || !awayId) return UI.toast('اختر الفريقين', 'err');
        if (homeId === awayId) return UI.toast('لا يمكن أن يلعب الفريق مع نفسه', 'err');

        const status = el('mf-status').value;
        const isNew = !A.matchEditId;
        const existing = isNew ? null : S.match(A.matchEditId);

        const payload = {
            id: A.matchEditId || S.newId('m'),
            division: el('mf-division').value,
            round: UI.num(el('mf-round').value, 1),
            homeTeamId: homeId,
            awayTeamId: awayId,
            homeScore: UI.num(el('mf-hs').value),
            awayScore: UI.num(el('mf-as').value),
            minute: el('mf-minute').value ? UI.num(el('mf-minute').value) : undefined,
            status: status,
            time: el('mf-time').value || (status === 'FT' ? 'انتهت' : ''),
            venue: el('mf-venue').value,
            date: el('mf-date').value || new Date().toISOString().slice(0, 10),
            events: A.matchEvents.filter(ev => ev.player),
            statsApplied: existing ? existing.statsApplied : false
        };

        S.mutate(st => {
            if (isNew) {
                st.matches.unshift(payload);
            } else {
                const i = st.matches.findIndex(x => x.id === A.matchEditId);
                if (i > -1) st.matches[i] = Object.assign({}, st.matches[i], payload);
            }
            // تطبيق إحصائيات الأحداث مرة واحدة فقط لكل مباراة
            const target = st.matches.find(x => x.id === payload.id);
            if (!target.statsApplied && (status === 'FT' || status === 'LIVE')) {
                applyEventsToStats(st, target);
                target.statsApplied = true;
            }
        });

        UI.toast(isNew ? 'تمت إضافة المباراة ونشرها' : 'تم تحديث المباراة');
        resetMatchForm();
        renderMatchList();
        if (A.section === 'overview') renderActivity();
    }

    function applyEventsToStats(state, match) {
        (match.events || []).forEach(ev => {
            if (!ev.player) return;
            const p = state.players.find(x => x.name === ev.player && x.teamId === ev.teamId) ||
                state.players.find(x => x.name === ev.player);
            if (!p) return;
            if (ev.type === 'goal') p.goals = (p.goals || 0) + 1;
            if (ev.type === 'yellow') p.yellowCards = (p.yellowCards || 0) + 1;
            if (ev.type === 'red') p.redCards = (p.redCards || 0) + 1;
        });
    }

    function matchListRow(m) {
        const h = S.team(m.homeTeamId), a = S.team(m.awayTeamId);
        const badge = m.status === 'FT' ? UI.badge('انتهت', 'plain', 'check')
            : m.status === 'LIVE' ? UI.badge('مباشر ' + (m.minute ? m.minute + "'" : ''), 'emerald', 'bolt')
            : UI.badge('لم تبدأ', 'cyan', 'clock');
        const score = m.status === 'NS' ? UI.esc(m.time || '') : UI.num(m.homeScore) + ' - ' + UI.num(m.awayScore);
        return '<div class="list-row" style="flex-wrap:wrap;gap:9px">' +
            '<div class="list-main" style="min-width:230px">' +
                UI.teamCrest(h, 'xs') + '<span style="font-size:11.5px;font-weight:700">' + UI.esc(h ? h.name : '') + '</span>' +
                '<span class="score-box font-num" style="font-size:12px">' + score + '</span>' +
                UI.teamCrest(a, 'xs') + '<span style="font-size:11.5px;font-weight:700">' + UI.esc(a ? a.name : '') + '</span>' +
            '</div>' +
            '<div class="row" style="gap:6px">' + badge +
                UI.badge(S.divisionShort(m.division) + ' • ج' + m.round, 'plain') +
                '<span class="card-sub">' + UI.esc(UI.fmtDateShort(m.date)) + '</span>' +
                '<button class="btn btn-sm" data-edit-match="' + m.id + '">' + I('edit') + 'تعديل</button>' +
                '<button class="btn btn-sm btn-rose" data-del-match="' + m.id + '">' + I('trash') + '</button>' +
            '</div></div>';
    }

    function renderMatchList() {
        const div = el('ml-filterDiv').value || 'all';
        const q = (el('ml-search').value || '').trim().toLowerCase();
        let list = S.matches({});
        if (div !== 'all') list = list.filter(m => m.division === div);
        if (q) list = list.filter(m => {
            const h = S.team(m.homeTeamId), a = S.team(m.awayTeamId);
            return (h && h.name.toLowerCase().indexOf(q) > -1) || (a && a.name.toLowerCase().indexOf(q) > -1);
        });
        if (!list.length) { setHTML('matchList', '<div class="empty">' + I('ball') + '<span>لا توجد مباريات مطابقة</span></div>'); return; }
        setHTML('matchList', list.map(matchListRow).join(''));
        el('matchList').querySelectorAll('[data-edit-match]').forEach(b => b.onclick = () => loadMatchIntoForm(b.dataset.editMatch));
        el('matchList').querySelectorAll('[data-del-match]').forEach(b => b.onclick = () => {
            const m = S.match(b.dataset.delMatch);
            UI.confirm('سيتم حذف مباراة ' + S.team(m.homeTeamId).name + ' × ' + S.team(m.awayTeamId).name + ' نهائياً من الموقع.', { danger: true, yes: 'حذف المباراة' })
                .then(ok => {
                    if (!ok) return;
                    S.mutate(st => { st.matches = st.matches.filter(x => x.id !== m.id); });
                    renderMatchList();
                    UI.toast('تم حذف المباراة', 'err');
                });
        });
    }

    /* ======================================================================
       الفرق والشعارات
       ====================================================================== */
    function crestTile(team) {
        const logo = S.mediaUrl('team_' + team.id);
        return '<div class="upload-tile tile-crest" data-crest="' + team.id + '" title="اضغط لرفع شعار ' + UI.esc(team.name) + '">' +
            (logo ? '<img src="' + logo + '" alt="">' : '') +
            '<span class="u-label" style="' + (logo ? 'display:none' : '') + '">' + I('camera') + '<br>شعار الفريق</span>' +
            '</div>';
    }

    function renderTeamsGrid() {
        const teams = S.teams('all');
        setHTML('teamsGrid', teams.map(t => {
            const squad = S.squad(t.id).length;
            const row = S.teamRank(t.id);
            return '<div class="glass glow-top team-admin-card" data-team-card="' + t.id + '">' +
                '<div class="row" style="gap:11px;align-items:flex-start">' +
                    crestTile(t) +
                    '<div style="flex:1;min-width:0" class="stack-sm">' +
                        '<input class="inp" data-tf="name" value="' + UI.esc(t.name) + '" placeholder="اسم النادي">' +
                        '<select class="inp" data-tf="division">' + S.divisions().map(d =>
                            '<option value="' + d.id + '"' + (t.division === d.id ? ' selected' : '') + '>' + UI.esc(d.name) + '</option>').join('') + '</select>' +
                        '<div class="row" style="gap:7px">' +
                            '<input type="color" class="inp" data-tf="color" value="' + UI.esc(t.color || '#2563eb') + '" style="width:52px">' +
                            '<select class="inp" data-tf="formation" style="flex:1">' + CFG.FORMATION_KEYS.map(f =>
                                '<option value="' + f + '"' + ((t.formation || '4-3-3') === f ? ' selected' : '') + '>خطة ' + f + '</option>').join('') + '</select>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="grid-2">' +
                    '<div class="field"><label>المدرب</label><input class="inp" data-tf="coach" value="' + UI.esc(t.coach || '') + '"></div>' +
                    '<div class="field"><label>الملعب</label><input class="inp" data-tf="stadium" value="' + UI.esc(t.stadium || '') + '"></div>' +
                '</div>' +
                '<div class="row-between">' +
                    '<div class="row" style="gap:6px">' +
                        UI.badge(squad + ' لاعب', 'plain', 'users') +
                        (row ? UI.badge('#' + row.rank + ' • ' + row.points + ' نقطة', 'gold', 'table') : '') +
                        (t.deductedPoints ? UI.badge('-' + t.deductedPoints + ' نقاط', 'rose', 'gavel') : '') +
                    '</div>' +
                    '<div class="row" style="gap:6px">' +
                        '<button class="btn btn-sm" data-gen-squad="' + t.id + '">' + I('users') + 'استكمال القائمة</button>' +
                        '<button class="btn btn-sm" data-team-lineup="' + t.id + '">' + I('layers') + 'التشكيلة</button>' +
                        '<button class="btn btn-sm btn-rose" data-del-team="' + t.id + '">' + I('trash') + '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join(''));

        el('teamsGrid').querySelectorAll('[data-crest]').forEach(tile => {
            tile.onclick = () => {
                const id = tile.dataset.crest;
                UI.pickImage({ max: 400, square: true }).then(url => {
                    if (!url) return;
                    S.setMedia('team_' + id, url);
                    UI.toast('تم حفظ شعار ' + S.team(id).name);
                    renderTeamsGrid();
                    paintChrome();
                });
            };
        });

        el('teamsGrid').querySelectorAll('[data-tf]').forEach(inp => {
            inp.addEventListener('change', () => {
                const card = inp.closest('[data-team-card]');
                const id = card.dataset.teamCard;
                const field = inp.dataset.tf;
                S.mutate(st => {
                    const t = st.teams.find(x => x.id === id);
                    if (!t) return;
                    t[field] = inp.value;
                });
                if (field === 'name' || field === 'color' || field === 'formation') renderTeamsGrid();
            });
        });

        el('teamsGrid').querySelectorAll('[data-gen-squad]').forEach(b => b.onclick = () => {
            const id = b.dataset.genSquad;
            S.mutate(st => {
                const before = st.players.filter(p => p.teamId === id).length;
                CFG.ensureSquads({ teams: [st.teams.find(t => t.id === id)], players: st.players });
                const after = st.players.filter(p => p.teamId === id).length;
                UI.toast('تمت إضافة ' + (after - before) + ' لاعباً لقائمة ' + S.team(id).name);
            });
            renderTeamsGrid();
        });

        el('teamsGrid').querySelectorAll('[data-team-lineup]').forEach(b => b.onclick = () => {
            A.lineup.scope = 'team';
            A.lineup.teamId = b.dataset.teamLineup;
            setSection('lineups');
        });

        el('teamsGrid').querySelectorAll('[data-del-team]').forEach(b => b.onclick = () => {
            const id = b.dataset.delTeam;
            const t = S.team(id);
            UI.confirm('حذف نادي ' + t.name + ' مع كل لاعبيه ومبارياته؟ لا يمكن التراجع.', { danger: true, yes: 'حذف النادي' }).then(ok => {
                if (!ok) return;
                S.mutate(st => {
                    st.teams = st.teams.filter(x => x.id !== id);
                    st.players = st.players.filter(p => p.teamId !== id);
                    st.matches = st.matches.filter(m => m.homeTeamId !== id && m.awayTeamId !== id);
                    st.sanctions = st.sanctions.filter(s => s.teamId !== id);
                    if (st.lineups) Object.keys(st.lineups).forEach(k => delete st.lineups[k]);
                });
                renderTeamsGrid();
                UI.toast('تم حذف النادي', 'err');
            });
        });
    }

    /* ======================================================================
       اللاعبون
       ====================================================================== */
    function fillPlayerTeamFilter() {
        const cur = A.playerTeam;
        el('pl-teamFilter').innerHTML = '<option value="all">كل الفرق</option>' +
            S.teams('all').map(t => '<option value="' + t.id + '">' + UI.esc(t.name) + '</option>').join('');
        el('pl-teamFilter').value = cur;
    }

    function playerAdminCard(p) {
        const photo = S.mediaUrl('player_' + p.id);
        const team = S.team(p.teamId);
        const susp = (p.yellowCards || 0) >= 3 || (p.redCards || 0) >= 1;
        return '<div class="glass-flat" style="padding:10px;display:flex;gap:11px;align-items:center;flex-wrap:wrap" data-player-card="' + p.id + '">' +
            '<div class="upload-tile" data-photo="' + p.id + '" style="width:56px;height:56px;min-height:56px;border-radius:50%;padding:0" title="رفع صورة اللاعب">' +
                (photo ? '<img src="' + photo + '" alt="">' : '<span style="font-size:18px;font-weight:900;color:var(--txt-3)">' + UI.esc(UI.initials(p.name)) + '</span>') +
            '</div>' +
            '<div style="flex:1;min-width:200px" class="stack-sm">' +
                '<input class="inp" data-pf="name" value="' + UI.esc(p.name) + '" placeholder="اسم اللاعب">' +
                '<div class="row" style="gap:7px">' +
                    '<input class="inp" data-pf="number" type="number" value="' + UI.num(p.number) + '" style="width:70px" title="رقم القميص">' +
                    '<select class="inp" data-pf="pos" style="flex:1">' + POSITIONS.map(x =>
                        '<option value="' + x + '"' + (p.pos === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select>' +
                '</div>' +
            '</div>' +
            '<div class="row" style="gap:6px;flex-wrap:wrap">' +
                smallNum('goals', 'أهداف', p.goals) +
                smallNum('assists', 'صناعة', p.assists) +
                smallNum('yellowCards', '🟨', p.yellowCards) +
                smallNum('redCards', '🟥', p.redCards) +
                smallNum('rating', 'تقييم', p.rating, 0.1) +
            '</div>' +
            '<div class="row" style="gap:6px">' +
                UI.badge(CFG.ROLE_SHORT[p.role] || '', 'plain') +
                UI.badge(team ? S.divisionShort(team.division) : '', 'plain') +
                (susp ? UI.badge('محروم', 'rose', 'lock') : '') +
                '<button class="btn btn-sm btn-rose" data-del-player="' + p.id + '">' + I('trash') + '</button>' +
            '</div>' +
        '</div>';
    }

    function smallNum(field, label, value, step) {
        return '<label class="field" style="gap:3px"><span style="font-size:9.5px;color:var(--txt-4);font-weight:700">' + label + '</span>' +
            '<input class="inp" data-pf="' + field + '" type="number" step="' + (step || 1) + '" value="' + UI.num(value) + '" style="width:66px;padding:6px;text-align:center"></label>';
    }

    function renderPlayersList() {
        let list = S.state.players.slice();
        if (A.playerTeam !== 'all') list = list.filter(p => p.teamId === A.playerTeam);
        if (A.playerQuery) {
            const q = A.playerQuery.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().indexOf(q) > -1);
        }
        list.sort((a, b) => {
            const ta = S.team(a.teamId), tb = S.team(b.teamId);
            return (ta ? ta.name : '').localeCompare(tb ? tb.name : '') || (a.role > b.role ? 1 : -1) || (a.number || 99) - (b.number || 99);
        });
        const shown = list.slice(0, A.playerLimit);
        el('playersCount').textContent = list.length + ' لاعب' + (A.playerTeam !== 'all' ? ' في ' + S.team(A.playerTeam).name : ' في كل الفرق');
        setHTML('playersList',
            (shown.length ? shown.map(playerAdminCard).join('') : '<div class="empty">' + I('users') + '<span>لا يوجد لاعبون مطابقون</span></div>') +
            (list.length > shown.length ? '<div style="padding:12px;text-align:center"><button class="btn btn-gold" id="plMore">عرض المزيد (' + (list.length - shown.length) + ' متبقٍ)</button></div>' : ''));

        const more = el('plMore');
        if (more) more.onclick = () => { A.playerLimit += 60; renderPlayersList(); };

        el('playersList').querySelectorAll('[data-photo]').forEach(tile => {
            tile.onclick = () => {
                const id = tile.dataset.photo;
                UI.pickImage({ max: 300, square: true }).then(url => {
                    if (!url) return;
                    S.setMedia('player_' + id, url);
                    UI.toast('تم حفظ صورة اللاعب');
                    renderPlayersList();
                });
            };
        });

        el('playersList').querySelectorAll('[data-pf]').forEach(inp => {
            inp.addEventListener('change', () => {
                const card = inp.closest('[data-player-card]');
                const id = card.dataset.playerCard;
                const field = inp.dataset.pf;
                S.mutate(st => {
                    const p = st.players.find(x => x.id === id);
                    if (!p) return;
                    if (field === 'name' || field === 'pos') p[field] = inp.value;
                    else p[field] = UI.num(inp.value);
                    if (field === 'pos') p.role = CFG.roleFromPos(inp.value);
                });
                if (field === 'name' || field === 'pos' || field === 'number') renderPlayersList();
            });
        });

        el('playersList').querySelectorAll('[data-del-player]').forEach(b => b.onclick = () => {
            const id = b.dataset.delPlayer;
            const p = S.player(id);
            UI.confirm('حذف اللاعب ' + p.name + ' من القائمة؟', { danger: true, yes: 'حذف' }).then(ok => {
                if (!ok) return;
                S.mutate(st => { st.players = st.players.filter(x => x.id !== id); });
                S.delMedia('player_' + id);
                renderPlayersList();
                UI.toast('تم حذف اللاعب', 'err');
            });
        });
    }

    function addPlayerDialog() {
        UI.openModal({
            title: 'إضافة لاعب جديد',
            narrow: true,
            body:
                '<div class="field"><label>اسم اللاعب</label><input class="inp" id="np-name" placeholder="الاسم الكامل"></div>' +
                '<div class="field"><label>الفريق</label><select class="inp" id="np-team">' +
                    S.teams('all').map(t => '<option value="' + t.id + '">' + UI.esc(t.name) + '</option>').join('') + '</select></div>' +
                '<div class="grid-2">' +
                    '<div class="field"><label>الرقم</label><input class="inp" type="number" id="np-number" value="10"></div>' +
                    '<div class="field"><label>الموقع</label><select class="inp" id="np-pos">' +
                        POSITIONS.map(x => '<option value="' + x + '">' + x + '</option>').join('') + '</select></div>' +
                '</div>' +
                '<button class="btn btn-gold btn-block btn-lg" id="np-save">' + I('check') + 'إضافة اللاعب</button>',
            onMount: root => {
                root.querySelector('#np-save').onclick = () => {
                    const name = root.querySelector('#np-name').value.trim();
                    if (!name) return UI.toast('اكتب اسم اللاعب', 'err');
                    const teamId = root.querySelector('#np-team').value;
                    const pos = root.querySelector('#np-pos').value;
                    const id = S.newId('p');
                    S.mutate(st => {
                        st.players.push({
                            id: id, teamId: teamId, name: name,
                            number: UI.num(root.querySelector('#np-number').value, 10),
                            pos: pos, role: CFG.roleFromPos(pos),
                            goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 7, appearances: 0
                        });
                    });
                    UI.closeModal();
                    A.playerLimit = 400;
                    renderPlayersList();
                    UI.toast('تمت إضافة اللاعب — يمكنك رفع صورته الآن');
                };
            }
        });
    }

    /* ======================================================================
       محرر التشكيلات
       ====================================================================== */
    function lineupTeamId() {
        const L = A.lineup;
        if (L.scope === 'team') return L.teamId || (S.teams('all')[0] || {}).id;
        const m = S.match(L.matchId);
        if (!m) return null;
        return L.side === 'away' ? m.awayTeamId : m.homeTeamId;
    }

    function renderLineupEditor() {
        const L = A.lineup;
        // تعبئة القوائم
        el('lu-formation').innerHTML = CFG.FORMATION_KEYS.map(f =>
            '<option value="' + f + '"' + (L.formation === f ? ' selected' : '') + '>خطة ' + f + '</option>').join('');
        el('lu-team').innerHTML = S.teams('all').map(t =>
            '<option value="' + t.id + '"' + (L.teamId === t.id ? ' selected' : '') + '>' + UI.esc(t.name) + '</option>').join('');
        const matchOpts = S.matches({}).map(m => {
            const h = S.team(m.homeTeamId), a = S.team(m.awayTeamId);
            return '<option value="' + m.id + '"' + (L.matchId === m.id ? ' selected' : '') + '>' + UI.esc((h ? h.name : '') + ' × ' + (a ? a.name : '')) +
                ' — ' + UI.esc(S.divisionShort(m.division)) + ' ج' + m.round + ' (' + UI.esc(m.status === 'FT' ? 'انتهت' : m.status === 'LIVE' ? 'مباشر' : 'قادمة') + ')</option>';
        }).join('');
        el('lu-match').innerHTML = matchOpts || '<option value="">لا توجد مباريات</option>';
        if (!L.matchId && S.matches({}).length) L.matchId = S.matches({})[0].id;
        el('lu-match').value = L.matchId || '';

        el('lu-scope').value = L.scope;
        el('lu-side').value = L.side;
        el('luMatchField').classList.toggle('hidden', L.scope !== 'match');
        el('luTeamField').classList.toggle('hidden', L.scope !== 'team');
        el('lu-side').parentElement.classList.toggle('hidden', L.scope !== 'match');
        el('luBadge').textContent = L.scope === 'match' ? 'تشكيلة المباراة' : 'التشكيلة الافتراضية للفريق';

        const teamId = lineupTeamId();
        if (!teamId) { setHTML('luSlots', '<div class="mini-note">اختر مباراة أو فريقاً أولاً</div>'); setHTML('luPitchWrap', ''); return; }

        if (!L.draft || L.slotTeamId !== teamId) {
            L.slotTeamId = teamId;
            let base = null;
            if (L.scope === 'match') base = S.lineupFor(L.matchId, L.side);
            else base = S.teamDefaultLineup(teamId);
            L.formation = (base && base.formation) || S.team(teamId).formation || '4-3-3';
            L.draft = base ? JSON.parse(JSON.stringify(base)) : CFG.autoLineup(S.squad(teamId), L.formation);
            el('lu-formation').value = L.formation;
        }

        el('lu-help').innerHTML = I('info') + ' اضغط على أي خانة في الملعب أو في القائمة لاختيار اللاعب من قائمة الفريق. الخطة المختارة تعيد ترتيب الصفوف تلقائياً.';

        paintLineupPitch();
        paintLineupSlots();
    }

    function paintLineupPitch() {
        const teamId = lineupTeamId();
        const team = S.team(teamId);
        const draft = A.lineup.draft || CFG.autoLineup(S.squad(teamId), A.lineup.formation);
        const wrap = el('luPitchWrap');
        wrap.innerHTML = '<div class="card-title" style="margin-bottom:10px">' + I('layers') + 'معاينة مباشرة — ' + UI.esc(team ? team.name : '') + '</div>' +
            UI.pitchSingle(team, draft, { height: 520 });
        wrap.querySelectorAll('.marker').forEach((mk, i) => {
            mk.onclick = () => {
                const slot = i;
                pickPlayerForSlot(slot);
            };
        });
    }

    /** عدد خانات الملعب حسب الخطة المختارة (الحارس + صفوف الخطة) */
    function slotCount() {
        const f = CFG.FORMATIONS[A.lineup.formation] || CFG.FORMATIONS['4-3-3'];
        return 1 + f.rows.reduce((s, r) => s + r.count, 0);
    }

    function slotInfo(index) {
        const f = CFG.FORMATIONS[A.lineup.formation] || CFG.FORMATIONS['4-3-3'];
        if (index === 0) return { role: 'GK', label: 'حارس المرمى' };
        let n = index - 1;
        for (let ri = 0; ri < f.rows.length; ri++) {
            if (n < f.rows[ri].count) {
                return { role: f.rows[ri].role, label: 'صف ' + (ri + 1) + ' — ' + CFG.ROLE_SHORT[f.rows[ri].role] + ' (' + (n + 1) + ')' };
            }
            n -= f.rows[ri].count;
        }
        return { role: 'MF', label: 'خانة' };
    }

    function getSlot(index) {
        const draft = A.lineup.draft;
        if (!draft) return null;
        if (index === 0) return draft.gk;
        let n = index - 1;
        for (let ri = 0; ri < draft.rows.length; ri++) {
            if (n < draft.rows[ri].players.length) return draft.rows[ri].players[n];
            n -= draft.rows[ri].players.length;
        }
        return null;
    }

    function setSlot(index, playerId) {
        const draft = A.lineup.draft;
        if (!draft) return;
        if (index === 0) { draft.gk = playerId; return; }
        let n = index - 1;
        for (let ri = 0; ri < draft.rows.length; ri++) {
            if (n < draft.rows[ri].players.length) { draft.rows[ri].players[n] = playerId; return; }
            n -= draft.rows[ri].players.length;
        }
    }

    function usedIds(exceptIndex) {
        const draft = A.lineup.draft || {};
        const out = {};
        if (draft.gk) out[draft.gk] = 0;
        (draft.rows || []).forEach((r, ri) => r.players.forEach((id, pi) => { if (id) out[id] = 1; }));
        if (exceptIndex !== undefined) delete out[getSlot(exceptIndex)];
        return out;
    }

    function paintLineupSlots() {
        const draft = A.lineup.draft;
        const teamId = lineupTeamId();
        if (!draft) return;
        const total = slotCount();
        el('luSlotCount').textContent = total + ' خانة • ' + A.lineup.formation;
        let html = '';
        for (let i = 0; i < total; i++) {
            const pid = getSlot(i);
            const p = pid ? S.player(pid) : null;
            const info = slotInfo(i);
            html += '<button class="glass-flat press" data-slot="' + i + '" style="display:flex;align-items:center;gap:10px;padding:9px 11px;text-align:start">' +
                '<span class="badge badge-plain" style="min-width:74px;justify-content:center">' + UI.esc(info.label) + '</span>' +
                (p ? UI.playerAvatar(p, 'xs') +
                    '<span style="min-width:0"><span style="display:block;font-size:12px;font-weight:800;color:#fff">' + UI.esc(p.name) + '</span>' +
                    '<span class="card-sub">#' + UI.esc(p.number) + ' • ' + UI.esc(p.pos || '') + '</span></span>'
                    : '<span style="font-size:12px;font-weight:700;color:var(--txt-3)">' + I('plus') + ' اختر لاعباً</span>') +
                '</button>';
        }
        setHTML('luSlots', html);
        el('luSlots').querySelectorAll('[data-slot]').forEach(b => b.onclick = () => pickPlayerForSlot(UI.num(b.dataset.slot)));
    }

    function pickPlayerForSlot(slotIndex) {
        const teamId = lineupTeamId();
        const squad = S.squad(teamId);
        const info = slotInfo(slotIndex);
        const used = usedIds(slotIndex);
        const current = getSlot(slotIndex);

        const listHTML = filter => squad
            .filter(p => !filter || p.name.toLowerCase().indexOf(filter.toLowerCase()) > -1 || String(p.number).indexOf(filter) > -1)
            .map(p => {
                const taken = used[p.id];
                const isCur = current === p.id;
                return '<div class="list-row" data-pick="' + p.id + '" style="cursor:pointer;' + (taken ? 'opacity:.45' : '') + '">' +
                    '<div class="list-main">' + UI.playerAvatar(p, 'xs') +
                        '<div><div class="list-title">' + UI.esc(p.name) + (isCur ? ' <span class="badge badge-emerald">الحالي</span>' : '') + '</div>' +
                        '<div class="list-sub">#' + UI.esc(p.number) + ' • ' + UI.esc(p.pos || '') + ' • ' + UI.esc(CFG.ROLE_SHORT[p.role] || '') +
                        (taken && !isCur ? ' • مستخدم في خانة أخرى' : '') + '</div></div></div>' +
                    '<span>' + I('check') + '</span></div>';
            }).join('') || '<div class="empty">' + I('users') + '<span>لا يوجد لاعبون مطابقون</span></div>';

        UI.openModal({
            title: 'اختيار لاعب — ' + info.label,
            subtitle: UI.esc(S.team(teamId).name),
            sheet: true,
            body: '<div class="search-input-wrap">' + I('search', 's-ic') +
                    '<input class="inp" id="pickSearch" placeholder="بحث بالاسم أو الرقم...">' +
                '</div>' +
                '<div class="row" style="gap:7px;flex-wrap:wrap"><span class="badge badge-gold">متاح للاختيار: ' +
                    squad.filter(p => !used[p.id] || p.id === current).length + ' لاعب</span>' +
                '<button class="btn btn-sm btn-rose" id="pickClear">' + I('trash') + 'تفريغ الخانة</button>' +
                '<button class="btn btn-sm btn-cyan" id="pickAuto">' + I('sparkles') + 'تعبئة تلقائية للخانة</button></div>' +
                '<div id="pickList">' + listHTML('') + '</div>',
            onMount: root => {
                const box = root.querySelector('#pickList');
                const rebind = () => {
                    box.querySelectorAll('[data-pick]').forEach(row => {
                        row.onclick = () => {
                            setSlot(slotIndex, row.dataset.pick);
                            UI.closeModal();
                            paintLineupPitch();
                            paintLineupSlots();
                        };
                    });
                };
                rebind();
                root.querySelector('#pickSearch').addEventListener('input', UI.debounce(e => {
                    box.innerHTML = listHTML(e.target.value);
                    rebind();
                }, 160));
                root.querySelector('#pickClear').onclick = () => {
                    setSlot(slotIndex, null);
                    UI.closeModal(); paintLineupPitch(); paintLineupSlots();
                };
                root.querySelector('#pickAuto').onclick = () => {
                    const p = squad.find(x => x.role === info.role && !usedIds(slotIndex)[x.id]) || squad.find(x => !usedIds(slotIndex)[x.id]);
                    if (p) { setSlot(slotIndex, p.id); UI.closeModal(); paintLineupPitch(); paintLineupSlots(); }
                };
            }
        });
    }

    function bindLineupControls() {
        el('lu-scope').onchange = e => {
            A.lineup.scope = e.target.value;
            A.lineup.draft = null;
            renderLineupEditor();
        };
        el('lu-match').onchange = e => {
            A.lineup.matchId = e.target.value;
            A.lineup.draft = null;
            A.lineup.slotTeamId = null;
            renderLineupEditor();
        };
        el('lu-team').onchange = e => {
            A.lineup.teamId = e.target.value;
            A.lineup.draft = null;
            A.lineup.slotTeamId = null;
            renderLineupEditor();
        };
        el('lu-side').onchange = e => {
            A.lineup.side = e.target.value;
            A.lineup.draft = null;
            A.lineup.slotTeamId = null;
            renderLineupEditor();
        };
        el('lu-formation').onchange = e => {
            A.lineup.formation = e.target.value;
            const teamId = lineupTeamId();
            A.lineup.draft = CFG.autoLineup(S.squad(teamId), A.lineup.formation);
            paintLineupPitch();
            paintLineupSlots();
        };
        el('lu-auto').onclick = () => {
            A.lineup.draft = CFG.autoLineup(S.squad(lineupTeamId()), A.lineup.formation);
            paintLineupPitch(); paintLineupSlots();
            UI.toast('تم توليد التشكيلة تلقائياً — عدّل ما تشاء ثم اضغط حفظ');
        };
        el('lu-clear').onclick = () => {
            const draft = A.lineup.draft;
            draft.gk = null;
            draft.rows.forEach(r => r.players = r.players.map(() => null));
            paintLineupPitch(); paintLineupSlots();
        };
        el('lu-save').onclick = () => {
            const L = A.lineup;
            const teamId = lineupTeamId();
            if (L.scope === 'match') {
                if (!L.matchId) return UI.toast('اختر مباراة أولاً', 'err');
                S.setMatchLineup(L.matchId, L.side, L.draft);
                UI.toast('تم حفظ تشكيلة المباراة (' + (L.side === 'home' ? 'المستضيف' : 'الزائر') + ')');
            } else {
                S.mutate(st => {
                    const t = st.teams.find(x => x.id === teamId);
                    if (t) { t.lineup = L.draft; t.formation = L.formation; }
                });
                UI.toast('تم حفظ التشكيلة الافتراضية للفريق');
            }
        };
        el('lu-resetTeam').onclick = () => {
            const L = A.lineup;
            if (L.scope !== 'match' || !L.matchId) return UI.toast('هذا الخيار لتشكيلات المباريات فقط', 'err');
            S.clearMatchLineup(L.matchId, L.side);
            L.draft = null; L.slotTeamId = null;
            renderLineupEditor();
            UI.toast('تم الرجوع إلى التشكيلة الافتراضية للفريق');
        };
    }

    /* ======================================================================
       الانضباط
       ====================================================================== */
    function fillSanctionSelect() {
        const sel = el('sf-team');
        sel.innerHTML = S.teams('all').map(t => '<option value="' + t.id + '">' + UI.esc(t.name) + ' — ' + UI.esc(S.divisionShort(t.division)) + '</option>').join('');
        if (!el('sf-date').value) el('sf-date').value = new Date().toISOString().slice(0, 10);
    }

    function applySanctions(st) {
        (st.teams || []).forEach(t => { t.deductedPoints = 0; t.penaltyReason = ''; });
        (st.sanctions || []).forEach(sn => {
            const t = st.teams.find(x => x.id === sn.teamId);
            if (!t) return;
            t.deductedPoints = (t.deductedPoints || 0) + UI.num(sn.points);
            t.penaltyReason = sn.reason || t.penaltyReason;
        });
    }

    function renderSanctions() {
        const list = (S.state.sanctions || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
        if (!list.length) { setHTML('sanctionList', '<div class="empty">' + I('gavel') + '<span>لا توجد عقوبات مسجلة</span></div>'); return; }
        setHTML('sanctionList', list.map(sn => {
            const t = S.team(sn.teamId);
            return '<div class="list-row">' +
                '<div class="list-main">' + UI.teamCrest(t, 'xs') +
                    '<div><div class="list-title">' + UI.esc(t ? t.name : 'فريق محذوف') + ' — خصم ' + UI.num(sn.points) + ' نقاط</div>' +
                    '<div class="list-sub">' + UI.esc(sn.reason || '') + ' • ' + UI.esc(UI.fmtDate(sn.date)) + '</div></div></div>' +
                '<button class="btn btn-sm btn-rose" data-del-sanction="' + sn.id + '">' + I('trash') + 'إلغاء</button>' +
            '</div>';
        }).join(''));
        el('sanctionList').querySelectorAll('[data-del-sanction]').forEach(b => b.onclick = () => {
            S.mutate(st => {
                st.sanctions = st.sanctions.filter(x => x.id !== b.dataset.delSanction);
                applySanctions(st);
            });
            renderSanctions();
            UI.toast('تم إلغاء العقوبة وإرجاع النقاط');
        });
    }

    /* ======================================================================
       الانتقالات
       ====================================================================== */
    function renderTransfersAdmin() {
        const list = (S.state.transfers || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
        if (!list.length) { setHTML('transferList', '<div class="empty">' + I('swap') + '<span>لا توجد عمليات مسجلة</span></div>'); return; }
        setHTML('transferList', list.map(tr =>
            '<div class="list-row">' +
                '<div class="list-main">' +
                    '<span class="kpi-ic" style="width:34px;height:34px;background:' + (tr.type === 'retirement' ? 'var(--violet-soft)' : 'var(--emerald-soft)') + ';color:' + (tr.type === 'retirement' ? 'var(--violet)' : 'var(--emerald)') + '">' + I(tr.type === 'retirement' ? 'star' : 'swap') + '</span>' +
                    '<div><div class="list-title">' + UI.esc(tr.playerName) + ' : ' + UI.esc(tr.from) + ' ← ' + UI.esc(tr.to) + '</div>' +
                    '<div class="list-sub">' + UI.esc(UI.fmtDate(tr.date)) + (tr.fee ? ' • ' + UI.esc(tr.fee) : '') + '</div></div>' +
                '</div>' +
                '<button class="btn btn-sm btn-rose" data-del-tr="' + tr.id + '">' + I('trash') + '</button>' +
            '</div>').join(''));
        el('transferList').querySelectorAll('[data-del-tr]').forEach(b => b.onclick = () => {
            S.mutate(st => { st.transfers = st.transfers.filter(x => x.id !== b.dataset.delTr); });
            renderTransfersAdmin();
            UI.toast('تم حذف العملية', 'err');
        });
    }

    /* ======================================================================
       الإعدادات
       ====================================================================== */
    function renderSettings() {
        const st = S.state.settings || {};
        el('se-league').value = st.leagueName || '';
        el('se-season').value = st.season || '';
        el('se-tagline').value = st.tagline || '';
        el('se-organizer').value = st.organizer || '';
        el('se-pin').value = st.pin || '2016';
        const odds = st.odds || { home: 1.45, draw: 3.2, away: 4.8 };
        el('se-oddH').value = odds.home;
        el('se-oddD').value = odds.draw;
        el('se-oddA').value = odds.away;
        el('se-autoSquads').classList.toggle('on', st.autoSquads !== false);

        paintUploadTile('se-crestTile', S.mediaUrl('league_crest'), 'شعار الدوري');
        paintUploadTile('se-bannerTile', S.mediaUrl('league_banner'), 'بانر الصفحة الرئيسية');

        const t = S.totals();
        el('se-stats').innerHTML = I('info') + ' الحجم الحالي: ' + t.teams + ' نادياً • ' + t.players + ' لاعباً • ' +
            t.matches + ' مباراة • ' + Object.keys(S.media).length + ' صورة مرفوعة.';
    }

    function paintUploadTile(id, url, label) {
        const tile = el(id);
        const img = tile.querySelector('img');
        if (img) img.remove();
        const lbl = tile.querySelector('.u-label');
        const hint = tile.querySelector('.u-hint');
        if (url) {
            const i = document.createElement('img');
            i.src = url;
            i.alt = '';
            tile.insertBefore(i, tile.firstChild);
            lbl.style.display = 'none';
            hint.style.display = 'none';
        } else {
            lbl.style.display = '';
            hint.style.display = '';
        }
    }

    function bindSettings() {
        el('se-save').onclick = () => {
            S.mutate(st => {
                st.settings.leagueName = el('se-league').value.trim() || st.settings.leagueName;
                st.settings.season = el('se-season').value.trim();
                st.settings.tagline = el('se-tagline').value.trim();
                st.settings.organizer = el('se-organizer').value.trim();
                const pin = el('se-pin').value.trim();
                if (pin) st.settings.pin = pin;
                st.settings.odds = {
                    home: UI.num(el('se-oddH').value, 1.45),
                    draw: UI.num(el('se-oddD').value, 3.2),
                    away: UI.num(el('se-oddA').value, 4.8)
                };
            });
            paintChrome();
            UI.toast('تم حفظ إعدادات الدوري ونشرها');
        };

        el('se-autoSquads').onclick = () => {
            const on = !el('se-autoSquads').classList.contains('on');
            el('se-autoSquads').classList.toggle('on', on);
            S.mutate(st => { st.settings.autoSquads = on; });
            UI.toast(on ? 'تم تفعيل استكمال القوائم تلقائياً' : 'تم إيقاف الاستكمال التلقائي');
        };

        el('se-reseed').onclick = () => {
            S.mutate(st => {
                st.settings.autoSquads = true;
                CFG.ensureSquads(st);
            });
            UI.toast('تم استكمال قوائم كل الفرق');
            renderKpis();
        };

        el('se-crestTile').onclick = () => UI.pickImage({ max: 420, square: true }).then(url => {
            if (!url) return;
            S.setMedia('league_crest', url);
            renderSettings(); paintChrome();
            UI.toast('تم تحديث شعار الدوري');
        });
        el('se-bannerTile').onclick = () => UI.pickImage({ max: 1400, square: false, quality: 0.82 }).then(url => {
            if (!url) return;
            S.setMedia('league_banner', url);
            renderSettings();
            UI.toast('تم تحديث بانر الصفحة الرئيسية');
        });
        el('se-crestClear').onclick = () => { S.delMedia('league_crest'); renderSettings(); paintChrome(); };
        el('se-bannerClear').onclick = () => { S.delMedia('league_banner'); renderSettings(); };

        el('se-export').onclick = () => {
            UI.download('hedood-backup-' + new Date().toISOString().slice(0, 10) + '.json', S.exportJSON());
            UI.toast('تم تصدير النسخة الاحتياطية');
        };
        el('se-importBtn').onclick = () => el('se-import').click();
        el('se-import').onchange = e => {
            const f = e.target.files[0];
            if (!f) return;
            const fr = new FileReader();
            fr.onload = () => {
                try {
                    S.importJSON(fr.result);
                    UI.toast('تم استيراد البيانات بنجاح');
                    renderSection(A.section);
                    paintChrome();
                } catch (err) {
                    UI.toast('ملف غير صالح', 'err');
                }
            };
            fr.readAsText(f);
            e.target.value = '';
        };
        el('se-reset').onclick = () => {
            UI.confirm('سيتم حذف كل التعديلات والصور والرجوع إلى البيانات الأولية للدوري. متأكد؟', { danger: true, yes: 'إعادة التعيين' })
                .then(ok => {
                    if (!ok) return;
                    S.resetToSeed();
                    try { localStorage.removeItem('hedood_media_v3'); } catch (e) {}
                    S.media = {};
                    renderSection(A.section);
                    paintChrome();
                    UI.toast('تمت إعادة التعيين للبيانات الأولية');
                });
        };
    }

    /* ======================================================================
       الأحداث العامة
       ====================================================================== */
    function bindGlobal() {
        el('mf-division').onchange = () => fillMatchTeamSelects();
        el('mf-home').onchange = () => { paintMatchCrests(); syncEventsFromDOM(); renderMatchEvents(); };
        el('mf-away').onchange = () => { paintMatchCrests(); syncEventsFromDOM(); renderMatchEvents(); };
        el('mf-addEvent').onclick = () => {
            syncEventsFromDOM();
            A.matchEvents.push({ type: 'goal', player: '', min: 45, teamId: el('mf-home').value });
            renderMatchEvents();
        };
        el('mf-events').addEventListener('click', e => {
            const b = e.target.closest('[data-remove-ev]');
            if (!b) return;
            syncEventsFromDOM();
            A.matchEvents.splice(UI.num(b.dataset.removeEv), 1);
            renderMatchEvents();
        });
        el('mf-events').addEventListener('change', syncEventsFromDOM);
        el('mfReset').onclick = resetMatchForm;
        el('matchForm').addEventListener('submit', saveMatch);
        el('ml-filterDiv').onchange = renderMatchList;
        el('ml-search').oninput = UI.debounce(renderMatchList, 220);

        el('pl-teamFilter').onchange = e => { A.playerTeam = e.target.value; A.playerLimit = 60; renderPlayersList(); };
        el('pl-search').oninput = UI.debounce(e => { A.playerQuery = e.target.value; renderPlayersList(); }, 220);
        el('btnAddPlayer').onclick = addPlayerDialog;

        el('btnAddTeam').onclick = () => {
            const name = el('newTeamName').value.trim();
            if (!name) return UI.toast('اكتب اسم النادي', 'err');
            const id = S.newId('t');
            S.mutate(st => {
                st.teams.push({
                    id: id, name: name, division: 'premier', color: '#2563eb', accent: '#60a5fa',
                    coach: '', stadium: '', founded: new Date().getFullYear(), deductedPoints: 0, penaltyReason: '', formation: '4-3-3'
                });
            });
            el('newTeamName').value = '';
            renderTeamsGrid();
            UI.toast('تمت إضافة النادي — ارفع شعاره الآن');
        };

        el('sanctionForm').addEventListener('submit', e => {
            e.preventDefault();
            const teamId = el('sf-team').value;
            const points = UI.num(el('sf-points').value);
            const reason = el('sf-reason').value.trim();
            if (!teamId) return UI.toast('اختر الفريق', 'err');
            if (!points) return UI.toast('حدد عدد النقاط', 'err');
            S.mutate(st => {
                st.sanctions.unshift({ id: S.newId('sn'), teamId: teamId, points: points, reason: reason || 'قرار إداري', date: el('sf-date').value });
                applySanctions(st);
            });
            el('sf-reason').value = '';
            el('sf-points').value = 3;
            renderSanctions();
            UI.toast('تم تطبيق العقوبة وتحديث جدول الترتيب');
        });

        el('transferForm').addEventListener('submit', e => {
            e.preventDefault();
            const payload = {
                id: S.newId('tr'),
                playerName: el('tf-player').value.trim(),
                type: el('tf-type').value,
                from: el('tf-from').value.trim(),
                to: el('tf-to').value.trim(),
                fee: el('tf-fee').value.trim(),
                note: el('tf-note').value.trim() || (el('tf-type').value === 'retirement' ? 'إعلان اعتزال رسمي وتكريم من اللجنة' : 'صفقة انتقال رسمية'),
                date: el('tf-date').value || new Date().toISOString().slice(0, 10)
            };
            if (!payload.playerName || !payload.from || !payload.to) return UI.toast('أكمل الحقول المطلوبة', 'err');
            S.mutate(st => { st.transfers.unshift(payload); });
            e.target.reset();
            el('tf-date').value = new Date().toISOString().slice(0, 10);
            renderTransfersAdmin();
            UI.toast('تم نشر العملية في سوق الانتقالات');
        });

        el('admSyncBtn').onclick = () => {
            S.syncNow().then(() => UI.toast('تمت المزامنة'));
        };
        el('ovSyncNow').onclick = () => S.syncNow().then(() => UI.toast('تم الحفظ والمزامنة'));
        el('ovReconnect').onclick = () => S.connectCloud(true).then(ok => {
            UI.toast(ok ? 'تم الاتصال بالسحابة' : 'تعذر الاتصال — سنبقى بالوضع المحلي', ok ? 'ok' : 'err');
            paintCloudBadge();
        });
        el('admLogout').onclick = () => {
            sessionStorage.removeItem('hedood_admin');
            location.reload();
        };

        bindLineupControls();
        bindSettings();
    }

    let lastRev = -1;
    function onData() {
        paintCloudBadge();
        if (!A.unlocked) { paintGateCrest(); return; }
        if (S.rev === lastRev) return;
        lastRev = S.rev;
        renderSection(A.section);
    }

    /* ======================================================================
       الإقلاع
       ====================================================================== */
    function boot() {
        S.init();
        buildKeypad();
        gateDots();
        const st = (S.state && S.state.settings) || {};
        if (st.pin && st.pin !== '2016') el('gateHint').textContent = 'أدخل رمز المرور المخصص للجنة المنظمة';
        bindGlobal();
        S.on(onData);
        paintGateCrest();
        if (sessionStorage.getItem('hedood_admin') === '1') unlock();
        document.addEventListener('store:remote', () => { if (!A.unlocked) paintGateCrest(); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
