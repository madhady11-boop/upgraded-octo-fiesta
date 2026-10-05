/* ==========================================================================
   home.js — منطق الموقع العام (النتائج، الترتيب، الإحصاءات، الفرق، الانتقالات)
   ========================================================================== */
(function () {
    'use strict';

    const S = window.Store;
    const CFG_ = window.CFG;

    const view = {
        current: 'matches',
        division: 'all',
        statsTab: 'scorers',
        liveOnly: false,
        openMatchId: null,
        matchTab: 'details',
        openTeamId: null,
        teamTab: 'overview',
        openPlayerId: null
    };

    const I = UI.icon;
    const el = id => document.getElementById(id);
    const setHTML = (id, html) => { const e = el(id); if (e) e.innerHTML = html; };

    /* ======================================================================
       1. الشريط العلوي والتنقل
       ====================================================================== */
    function paintChrome() {
        el('btnSearch').innerHTML = I('search');
        el('btnLive').innerHTML = I('bolt');
        document.querySelector('a.tool-btn[href="admin.html"]').innerHTML = I('settings');

        const t = S.totals();
        const season = (S.state.settings && S.state.settings.season) || 'موسم 2026';
        const leagueName = (S.state.settings && S.state.settings.leagueName) || 'دوري الحدود الرياضي';

        el('brandTitle').textContent = leagueName;
        el('brandSub').textContent = season + ' • ' + t.teams + ' نادي';

        const leagueCrest = S.mediaUrl('league_crest');
        el('brandMark').innerHTML = leagueCrest
            ? '<img src="' + leagueCrest + '" alt="شعار الدوري">'
            : I('trophy', '', ' style="width:22px;height:22px"');
        el('heroCrest').innerHTML = el('brandMark').innerHTML;
        el('footerOrganizer').textContent = (S.state.settings && S.state.settings.organizer) || '';
        el('footerYear').textContent = new Date().getFullYear();
        el('seasonBadge').textContent = season;

        const navLabels = {
            matches: { label: 'المباريات', ic: 'ball' },
            standings: { label: 'الترتيب', ic: 'table' },
            stats: { label: 'الهدافون', ic: 'flame' },
            teams: { label: 'الفرق', ic: 'shield' },
            more: { label: 'المزيد', ic: 'bars' }
        };
        document.querySelectorAll('#bottomNav button').forEach(b => {
            const k = b.dataset.view;
            b.innerHTML = I(navLabels[k].ic) + '<span>' + navLabels[k].label + '</span>';
        });

        const chips = [['all', 'الكل']].concat(S.divisions().map(d => [d.id, d.name]));
        setHTML('divChips', chips.map(([key, label]) =>
            '<button class="chip ' + (view.division === key ? 'active' : '') + '" data-div="' + key + '">' + UI.esc(label) + '</button>'
        ).join(''));

        el('divChips').querySelectorAll('[data-div]').forEach(b => {
            b.addEventListener('click', () => { view.division = b.dataset.div; paintChrome(); renderAll(); });
        });

        el('btnLive').classList.toggle('active', view.liveOnly);
        paintCloudStatus();
    }

    function paintCloudStatus() {
        const c = S.cloud;
        const map = {
            connected: ['dot-status', 'متصل بالسحابة — التحديثات تظهر للجميع لحظياً'],
            sync: ['dot-status sync', 'جارٍ الحفظ السحابي...'],
            connecting: ['dot-status sync', 'جارٍ الاتصال بقاعدة البيانات...'],
            error: ['dot-status off', 'وضع محلي — التعديلات محفوظة على هذا الجهاز'],
            idle: ['dot-status off', 'جارٍ التهيئة...']
        };
        const [cls, txt] = map[c.status] || map.idle;
        const e = el('cloudStatus');
        if (e) e.innerHTML = '<span class="' + cls + '" style="display:inline-block;margin-inline-end:6px"></span>' + UI.esc(txt);
    }

    function setView(name, opts) {
        view.current = name;
        ['matches', 'standings', 'stats', 'teams', 'transfers'].forEach(v => {
            const sec = el('view-' + v);
            if (sec) sec.classList.toggle('hidden', v !== name);
        });
        document.querySelectorAll('#bottomNav button').forEach(b => b.classList.toggle('active', b.dataset.view === name));
        document.querySelectorAll('#topTabs button').forEach(b => b.classList.toggle('active', b.dataset.view === name));
        if (!opts || opts.scroll !== false) UI.scrollTop();
        history.replaceState(null, '', '#' + name);
        renderAll();
    }

    /* ======================================================================
       2. الواجهة الرئيسية (المباريات)
       ====================================================================== */
    function renderHero() {
        const st = S.state.settings || {};
        const t = S.totals();
        const banner = S.mediaUrl('league_banner');
        const img = el('heroImg');
        if (banner) { img.src = banner; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }

        el('heroTitle').textContent = st.leagueName || 'دوري الحدود الرياضي';
        el('heroTag').textContent = st.tagline || '';

        const stats = [
            ['shield', 'الأندية', t.teams],
            ['ball', 'مباريات', t.matches],
            ['bolt', 'مباشر الآن', t.live],
            ['flame', 'أهداف', t.goals]
        ];
        setHTML('heroStats', stats.map(([ic, k, v]) =>
            '<span class="hero-stat">' + I(ic) + '<b class="font-num">' + v + '</b>' + UI.esc(k) + '</span>'
        ).join(''));
    }

    function matchRowHTML(m) {
        const home = S.team(m.homeTeamId), away = S.team(m.awayTeamId);
        if (!home || !away) return '';
        const homeWin = m.status === 'FT' && m.homeScore > m.awayScore;
        const awayWin = m.status === 'FT' && m.awayScore > m.homeScore;

        let center = '';
        if (m.status === 'FT') {
            center = '<span class="score-box">' + m.homeScore + ' - ' + m.awayScore + '</span><div class="meta-line ft">انتهت</div>';
        } else if (m.status === 'LIVE') {
            center = '<span class="score-box live">' + (m.homeScore || 0) + ' - ' + (m.awayScore || 0) + '</span>' +
                '<div class="meta-line live"><span class="live-dot"></span>مباشر ' + (m.minute ? m.minute + "'" : '') + '</div>';
        } else {
            center = '<span class="score-box upcoming font-num">' + UI.esc(m.time || '') + '</span><div class="meta-line">' + UI.esc(UI.fmtDate(m.date)) + '</div>';
        }

        return '<div class="match-row" data-match="' + m.id + '">' +
            '<div class="match-side">' + UI.teamCrest(home, 'sm') +
                '<span class="match-name ' + (homeWin ? 'win' : '') + '">' + UI.esc(home.name) + '</span>' +
            '</div>' +
            '<div class="match-center">' + center + '</div>' +
            '<div class="match-side away">' + UI.teamCrest(away, 'sm') +
                '<span class="match-name ' + (awayWin ? 'win' : '') + '">' + UI.esc(away.name) + '</span>' +
            '</div>' +
            '</div>';
    }

    function renderMatches() {
        renderHero();
        let list = S.matches({ division: view.division });
        if (view.liveOnly) list = list.filter(m => m.status === 'LIVE');

        el('dateBannerText').textContent = view.liveOnly ? 'المباريات المباشرة الآن' : (view.division === 'all' ? 'كل مباريات الدوري' : S.divisionName(view.division));
        el('feedCounter').textContent = list.length + ' مباراة';

        if (!list.length) {
            setHTML('matchesFeed', emptyHTML(view.liveOnly ? 'لا توجد مباريات مباشرة في هذه اللحظة' : 'لا توجد مباريات مطابقة'));
            return;
        }

        const groups = {};
        list.forEach(m => { (groups[m.division] = groups[m.division] || []).push(m); });

        setHTML('matchesFeed', Object.keys(groups).map(div => {
            const rows = groups[div];
            const upcomingRound = rows[0].round;
            return '<div class="glass glow-top reveal" style="overflow:hidden">' +
                '<div class="league-head">' +
                    '<span class="crest crest-xs" style="background:linear-gradient(160deg,' + (S.state.divisions[div].accent || '#f7c14b') + ',rgba(0,0,0,.4))">' + I('trophy', '', ' style="width:12px;height:12px"') + '</span>' +
                    '<div><div class="lname">' + UI.esc(S.divisionName(div)) + '</div>' +
                    '<div class="lround">الجولة ' + UI.esc(upcomingRound) + ' • ' + rows.length + ' مباراة</div></div>' +
                    '<span class="card-sub" style="margin-inline-start:auto">365 الحدود</span>' +
                '</div>' +
                rows.map(matchRowHTML).join('') +
                '</div>';
        }).join(''));

        el('matchesFeed').querySelectorAll('[data-match]').forEach(r => {
            r.addEventListener('click', () => openMatch(r.dataset.match));
        });
    }

    function emptyHTML(txt, ic) {
        return '<div class="glass empty">' + I(ic || 'ball') + '<span>' + UI.esc(txt) + '</span></div>';
    }

    /* ======================================================================
       3. جدول الترتيب
       ====================================================================== */
    function renderStandings() {
        const div = view.division === 'all' ? 'premier' : view.division;
        const rows = S.standings(div);
        const relegStart = rows.length - 2;
        el('standingsTitle').textContent = 'ترتيب ' + S.divisionName(div);
        el('standingsSub').textContent = rows.filter(r => r.played > 0).length + ' فريق لديه مباريات مكتملة من أصل ' + rows.length;

        if (!rows.length) { setHTML('standingsBody', '<tr><td colspan="11">' + emptyHTML('لا توجد بيانات') + '</td></tr>'); return; }

        setHTML('standingsBody', rows.map(r => {
            const rankCls = r.rank === 1 ? 'top1' : r.rank === 2 ? 'top2' : r.rank === 3 ? 'top3' : (r.rank > relegStart ? 'rel' : '');
            const gd = r.gd > 0 ? '+' + r.gd : String(r.gd);
            const gdCls = r.gd > 0 ? 'color:var(--emerald)' : r.gd < 0 ? 'color:var(--rose)' : '';
            return '<tr>' +
                '<td class="c"><span class="rank-pill ' + rankCls + '">' + r.rank + '</span></td>' +
                '<td><div class="name-cell" data-team="' + r.team.id + '">' + UI.teamCrest(r.team, 'xs') + '<span>' + UI.esc(r.team.name) + '</span>' +
                    (r.deducted > 0 ? '<span class="badge badge-rose" title="' + UI.esc(r.team.penaltyReason || '') + '">-' + r.deducted + '</span>' : '') +
                '</div></td>' +
                '<td class="c font-num">' + r.played + '</td>' +
                '<td class="c font-num" style="color:var(--emerald)">' + r.won + '</td>' +
                '<td class="c font-num">' + r.drawn + '</td>' +
                '<td class="c font-num" style="color:var(--rose)">' + r.lost + '</td>' +
                '<td class="c font-num">' + r.gf + '</td>' +
                '<td class="c font-num">' + r.ga + '</td>' +
                '<td class="c font-num" style="' + gdCls + '">' + gd + '</td>' +
                '<td class="c font-num" style="color:var(--gold);font-weight:900;font-size:14px">' + r.points + '</td>' +
                '<td class="c">' + UI.formDots(r.form) + '</td>' +
                '</tr>';
        }).join(''));

        el('standingsBody').querySelectorAll('[data-team]').forEach(c => {
            c.addEventListener('click', () => openTeam(c.dataset.team));
        });

        const penalized = rows.filter(r => r.deducted > 0);
        el('penaltyNote').innerHTML = penalized.length
            ? I('gavel') + ' عقوبات سارية: ' + penalized.map(r => UI.esc(r.team.name) + ' (-' + r.deducted + ')').join(' • ')
            : I('check') + ' لا توجد خصومات نقاط سارية حتى الآن.';
    }

    /* ======================================================================
       4. الإحصاءات
       ====================================================================== */
    function renderStats() {
        document.querySelectorAll('#statsTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === view.statsTab));
        const t = view.statsTab;

        if (t === 'cards') {
            const susp = S.suspended();
            const yellow = (S.state.players || []).slice().sort((a, b) => (b.yellowCards || 0) - (a.yellowCards || 0)).slice(0, 10);
            setHTML('statsContent',
                '<div class="glass glow-top" style="overflow:hidden">' +
                    '<div class="card-head"><div class="card-title">' + I('card') + 'المحرومون من المباراة القادمة</div>' +
                    '<span class="badge badge-rose">' + susp.length + ' لاعب</span></div>' +
                    (susp.length ? susp.map(p => {
                        const team = S.team(p.teamId);
                        const reason = (p.redCards || 0) > 0 ? 'طرد مباشر بالبطاقة الحمراء' : 'تراكم 3 بطاقات صفراء (إيقاف تلقائي)';
                        return '<div class="list-row">' +
                            '<div class="list-main">' + UI.playerAvatar(p, 'sm') +
                            '<div><div class="list-title">' + UI.esc(p.name) + '</div>' +
                            '<div class="list-sub">' + UI.esc(team ? team.name : '') + ' • ' + UI.esc(reason) + '</div></div></div>' +
                            '<div class="row" style="gap:5px">' +
                                ((p.yellowCards || 0) > 0 ? UI.badge(UI.num(p.yellowCards) + ' 🟨', 'gold') : '') +
                                ((p.redCards || 0) > 0 ? UI.badge(UI.num(p.redCards) + ' 🟥', 'rose') : '') +
                            '</div></div>';
                    }).join('') : '<div class="empty">' + I('check') + '<span>لا توجد إيقافات حالياً</span></div>') +
                '</div>' +
                '<div class="glass glow-top" style="overflow:hidden">' +
                    '<div class="card-head"><div class="card-title">' + I('target') + 'أكثر اللاعبين إنذاراً</div></div>' +
                    yellow.map((p, i) => {
                        const team = S.team(p.teamId);
                        return '<div class="list-row"><div class="list-main">' +
                            '<span class="rank-pill">' + (i + 1) + '</span>' + UI.playerAvatar(p, 'xs') +
                            '<div><div class="list-title">' + UI.esc(p.name) + '</div><div class="list-sub">' + UI.esc(team ? team.name : '') + '</div></div>' +
                            '</div>' + UI.badge(UI.num(p.yellowCards) + ' إنذار', 'gold') + '</div>';
                    }).join('') +
                '</div>');
            return;
        }

        const list = (t === 'scorers' ? S.scorers() : S.assists()).slice(0, 30);
        const value = p => t === 'scorers' ? (p.goals || 0) : (p.assists || 0);
        const unit = t === 'scorers' ? 'هدف' : 'صناعة';
        const nameKey = t === 'scorers' ? 'هداف البطولة' : 'صانع الأهداف';
        const podium = list.slice(0, 3);

        setHTML('statsContent',
            (podium.length >= 3 ? '<div class="glass glow-top card-pad reveal">' +
                '<div class="card-head" style="border:none;padding:0 0 12px;background:none">' +
                    '<div class="card-title">' + I('trophy') + UI.esc(nameKey) + '</div>' +
                    '<span class="card-sub">' + UI.esc(S.state.settings.season || '') + '</span>' +
                '</div>' +
                '<div class="podium">' +
                    podiumCard(podium[1], 2, value(podium[1]), unit) +
                    podiumCard(podium[0], 1, value(podium[0]), unit) +
                    podiumCard(podium[2], 3, value(podium[2]), unit) +
                '</div></div>' : '') +
            '<div class="glass glow-top" style="overflow:hidden">' +
                '<div class="card-head"><div class="card-title">' + I('list') + 'القائمة الكاملة</div>' +
                '<span class="card-sub">أفضل ' + list.length + ' لاعب</span></div>' +
                list.map((p, i) => {
                    const team = S.team(p.teamId);
                    return '<div class="list-row" data-player="' + p.id + '" style="cursor:pointer">' +
                        '<div class="list-main">' +
                            '<span class="rank-pill ' + (i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '') + '">' + (i + 1) + '</span>' +
                            UI.playerAvatar(p, 'sm') +
                            '<div><div class="list-title">' + UI.esc(p.name) + '</div>' +
                            '<div class="list-sub">' + UI.esc(team ? team.name : '') + ' • ' + UI.esc(p.pos || '') + '</div></div>' +
                        '</div>' +
                        '<div class="row" style="gap:6px">' +
                            (p.rating ? '<span class="badge badge-cyan">' + UI.num(p.rating).toFixed(1) + '</span>' : '') +
                            '<span class="badge badge-gold font-num">' + value(p) + ' ' + unit + '</span>' +
                        '</div></div>';
                }).join('') +
            '</div>');

        el('statsContent').querySelectorAll('[data-player]').forEach(r => {
            r.addEventListener('click', () => openPlayer(r.dataset.player));
        });
    }

    function podiumCard(p, rank, val, unit) {
        if (!p) return '<div></div>';
        const team = S.team(p.teamId);
        const stars = ['★', '★★', '★★★'][Math.min(2, Math.floor((p.rating || 7) - 6))] || '';
        return '<div class="podium-card p' + rank + '" data-player="' + p.id + '">' +
            '<div style="display:flex;justify-content:center">' + UI.playerAvatar(p, rank === 1 ? 'md' : 'sm', { cls: 'crest-ring' }) + '</div>' +
            '<div class="pname">' + UI.esc(UI.shortName(p.name)) + '</div>' +
            '<div class="pteam">' + UI.esc(team ? team.name : '') + '</div>' +
            '<div class="pval font-num">' + val + '</div>' +
            '<div class="card-sub">' + unit + (stars ? ' • <span class="stars">' + stars + '</span>' : '') + '</div>' +
            '</div>';
    }

    /* ======================================================================
       5. الفرق
       ====================================================================== */
    function renderTeams() {
        const teams = S.teams(view.division);
        if (!teams.length) { setHTML('teamsGrid', emptyHTML('لا توجد فرق')); return; }
        setHTML('teamsGrid', teams.map(t => {
            const row = S.teamRank(t.id);
            const squadCount = S.squad(t.id).length;
            return '<div class="glass glow-top hoverable press card-pad" data-team="' + t.id + '" style="cursor:pointer;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px">' +
                UI.teamCrest(t, 'lg', 'crest-ring') +
                '<div style="font-size:12.5px;font-weight:800;color:#fff">' + UI.esc(t.name) + '</div>' +
                '<div class="card-sub">' + UI.esc(S.divisionShort(t.division)) + ' • ' + squadCount + ' لاعب</div>' +
                '<div class="row" style="gap:5px;justify-content:center">' +
                    (row ? '<span class="badge badge-gold font-num">#' + row.rank + '</span><span class="badge badge-plain font-num">' + row.points + ' نقطة</span>' : '') +
                '</div></div>';
        }).join(''));

        el('teamsGrid').querySelectorAll('[data-team]').forEach(c => {
            c.addEventListener('click', () => openTeam(c.dataset.team));
        });
    }

    /* ======================================================================
       6. الانتقالات
       ====================================================================== */
    function renderTransfers() {
        const list = (S.state.transfers || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
        if (!list.length) { setHTML('transfersFeed', emptyHTML('لا توجد انتقالات مسجلة')); return; }
        setHTML('transfersFeed', list.map(tr => {
            const retire = tr.type === 'retirement';
            return '<div class="glass glow-top card-pad reveal" style="border-color:' + (retire ? 'rgba(167,139,250,.35)' : 'var(--glass-brd)') + '">' +
                '<div class="row-between" style="margin-bottom:10px">' +
                    UI.badge(retire ? 'اعتزال رسمي' : 'انتقال رسمي', retire ? 'violet' : 'emerald', retire ? 'star' : 'swap') +
                    '<span class="card-sub">' + UI.esc(UI.relTime(tr.date)) + '</span>' +
                '</div>' +
                '<div class="row" style="gap:11px">' +
                    '<span class="avatar av-md" style="background:' + (retire ? 'linear-gradient(160deg,#7c3aed,#4c1d95)' : 'linear-gradient(160deg,#059669,#065f46)') + '">' + I(retire ? 'star' : 'swap') + '</span>' +
                    '<div style="min-width:0">' +
                        '<div class="list-title" style="font-size:13px">' + UI.esc(tr.playerName) + '</div>' +
                        '<div class="row" style="gap:7px;margin-top:4px;font-size:11px;flex-wrap:wrap">' +
                            '<span style="color:var(--rose);font-weight:700">' + UI.esc(tr.from) + '</span>' +
                            I('chevronLeft', '', ' style="color:var(--txt-4)"') +
                            '<span style="color:var(--emerald);font-weight:700">' + UI.esc(tr.to) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                (tr.fee ? '<div class="row" style="gap:6px;margin-top:10px">' + UI.badge('قيمة الصفقة: ' + tr.fee, 'plain') + '</div>' : '') +
                (tr.note ? '<div class="mini-note" style="margin-top:10px">' + UI.esc(tr.note) + '</div>' : '') +
                '</div>';
        }).join(''));
    }

    /* ======================================================================
       7. نافذة المباراة
       ====================================================================== */
    function matchInfoTiles(m) {
        const tiles = [
            ['calendar', 'التاريخ', UI.fmtDate(m.date) || '—'],
            ['clock', 'التوقيت', m.time || '—'],
            ['pin', 'الملعب', m.venue || '—'],
            ['layers', 'الجولة', 'الجولة ' + (m.round || '-') + ' • ' + S.divisionShort(m.division)]
        ];
        return '<div class="grid-2">' + tiles.map(([ic, k, v]) =>
            '<div class="glass-flat card-pad row" style="gap:9px">' +
                '<span class="kpi-ic" style="background:var(--gold-soft);color:var(--gold)">' + I(ic) + '</span>' +
                '<div><div class="kpi-k">' + k + '</div><div style="font-size:12px;font-weight:800;color:#fff">' + UI.esc(v) + '</div></div>' +
            '</div>').join('') + '</div>';
    }

    function voteWidget(m) {
        const odds = (S.state.settings && S.state.settings.odds) || { home: 1.45, draw: 3.2, away: 4.8 };
        const home = S.team(m.homeTeamId), away = S.team(m.awayTeamId);
        const card = (label, odd, col, ic) =>
            '<button class="glass-flat card-pad press" data-vote="' + label + '" style="display:flex;flex-direction:column;align-items:center;gap:5px">' +
                '<span class="kpi-ic" style="background:rgba(255,255,255,.06);color:' + col + '">' + I(ic) + '</span>' +
                '<span class="card-sub">' + UI.esc(label) + '</span>' +
                '<span class="font-num" style="font-weight:900;color:' + col + '">' + odd + '</span>' +
            '</button>';
        return '<div class="glass glow-top" style="overflow:hidden">' +
            '<div class="card-head"><div class="card-title">' + I('target') + 'مَن سيفوز؟</div>' +
            '<span class="badge badge-cyan">1X2</span></div>' +
            '<div class="card-pad grid-3">' +
                card(UI.shortName(home ? home.name : 'المستضيف'), odds.home, 'var(--emerald)', 'home') +
                card('تعادل', odds.draw, 'var(--amber)', 'close') +
                card(UI.shortName(away ? away.name : 'الزائر'), odds.away, 'var(--rose)', 'arrowUpRight') +
            '</div></div>';
    }

    function keyPlayers(m) {
        const homeTeam = S.team(m.homeTeamId), awayTeam = S.team(m.awayTeamId);
        const best = teamId => {
            const list = S.squad(teamId).slice().sort((a, b) => (b.goals || 0) - (a.goals || 0) || (b.rating || 0) - (a.rating || 0));
            return list[0] || null;
        };
        const h = best(m.homeTeamId), a = best(m.awayTeamId);
        if (!h && !a) return '';
        const side = (p, team, col) => p ? '<div class="vs-side">' +
            UI.playerAvatar(p, 'md', { cls: 'crest-ring' }) +
            '<span class="tname">' + UI.esc(p.name) + '</span>' +
            '<span class="card-sub">' + UI.esc(p.pos || '') + '</span>' +
            '<div class="row" style="gap:5px">' + UI.badge(UI.num(p.goals) + ' هدف', 'gold', 'ball') + UI.badge(UI.num(p.rating).toFixed(1), 'cyan') + '</div>' +
            '</div>' : '';
        return '<div class="glass glow-top" style="overflow:hidden">' +
            '<div class="card-head"><div class="card-title">' + I('star') + 'أهم اللاعبين</div>' +
            '<span class="card-sub">' + UI.esc(homeTeam ? homeTeam.name : '') + ' × ' + UI.esc(awayTeam ? awayTeam.name : '') + '</span></div>' +
            '<div class="card-pad"><div class="grid-2" style="gap:14px">' + side(h, homeTeam) + side(a, awayTeam) + '</div></div>' +
            '</div>';
    }

    function formCard(m) {
        const f = teamId => {
            const last = S.lastMatchesFor(teamId, 5);
            return last.map(x => {
                const isHome = x.homeTeamId === teamId;
                const own = isHome ? x.homeScore : x.awayScore;
                const opp = isHome ? x.awayScore : x.homeScore;
                return own > opp ? 'W' : own === opp ? 'D' : 'L';
            });
        };
        const home = S.team(m.homeTeamId), away = S.team(m.awayTeamId);
        return '<div class="glass glow-top card-pad">' +
            '<div class="card-title" style="margin-bottom:11px">' + I('chart') + 'آخر 5 مباريات</div>' +
            '<div class="row-between">' +
                '<div class="row" style="gap:8px">' + UI.teamCrest(home, 'xs') + UI.formDots(f(m.homeTeamId)) + '</div>' +
                '<span class="card-sub">VS</span>' +
                '<div class="row" style="gap:8px">' + UI.formDots(f(m.awayTeamId)) + UI.teamCrest(away, 'xs') + '</div>' +
            '</div></div>';
    }

    function eventsList(m) {
        const evs = (m.events || []).slice().sort((a, b) => (a.min || 0) - (b.min || 0));
        if (!evs.length) return '<div class="glass empty">' + I('ball') + '<span>لا توجد أحداث مسجلة لهذه المباراة</span></div>';
        const iconFor = t => t === 'goal' ? 'ball' : t === 'yellow' ? 'card' : t === 'red' ? 'card' : 'swap';
        return '<div class="glass glow-top card-pad"><div class="timeline">' +
            evs.map(ev => {
                const team = S.team(ev.teamId);
                return '<div class="tl-item ev-' + UI.esc(ev.type) + '">' +
                    '<div class="row" style="gap:9px">' +
                        '<span class="minute-pill font-num">' + UI.num(ev.min) + "'</span>" +
                        '<span style="color:' + (ev.type === 'yellow' ? 'var(--amber)' : ev.type === 'red' ? 'var(--rose)' : 'var(--gold)') + '">' + I(iconFor(ev.type)) + '</span>' +
                        '<div style="min-width:0">' +
                            '<div class="list-title">' + UI.esc(ev.player || '') + '</div>' +
                            '<div class="list-sub">' + UI.esc(team ? team.name : '') + ' • ' + UI.esc(ev.type === 'goal' ? 'هدف' : ev.type === 'yellow' ? 'بطاقة صفراء' : ev.type === 'red' ? 'بطاقة حمراء' : 'تبديل') + '</div>' +
                        '</div>' +
                    '</div></div>';
            }).join('') + '</div></div>';
    }

    function lineupTab(m) {
        const home = S.team(m.homeTeamId), away = S.team(m.awayTeamId);
        const hl = S.lineupFor(m.id, 'home'), al = S.lineupFor(m.id, 'away');
        if (!hl && !al) {
            return '<div class="glass empty">' + I('users') + '<span>لم تُسجَّل التشكيلات بعد — يمكن إضافتها من لوحة التحكم</span></div>';
        }
        const srcH = S.lineupSource(m.id, 'home'), srcA = S.lineupSource(m.id, 'away');
        const hn = home ? home.name : 'المستضيف', an = away ? away.name : 'الزائر';
        let note;
        if (srcH === 'match' && srcA === 'match') {
            note = '<div class="mini-note">' + I('check') + ' تشكيلتان <b>معتمدتان</b> من اللجنة الفنية لهذه المباراة.</div>';
        } else if (srcH === 'default' && srcA === 'default') {
            note = '<div class="mini-note">' + I('info') + ' المعروض هو <b>التشكيلة الافتراضية</b> للفريقين (خطتا ' +
                UI.esc((hl && hl.formation) || '-') + ' و ' + UI.esc((al && al.formation) || '-') +
                '). يمكن للجنة الفنية تثبيت تشكيلة معتمدة من لوحة التحكم.</div>';
        } else {
            note = '<div class="mini-note">' + I('check') + ' تشكيلة <b>' +
                UI.esc(srcH === 'match' ? hn : an) + '</b> <b>معتمدة</b> لهذه المباراة، وتشكيلة <b>' +
                UI.esc(srcH === 'match' ? an : hn) + '</b> هي الافتراضية للفريق (خطة ' +
                UI.esc(srcH === 'match' ? (al && al.formation) || '-' : (hl && hl.formation) || '-') + ').</div>';
        }

        return note +
            UI.pitchMatch(home, away, hl, al, { height: 560, cls: 'compact-mobile' }) +
            '<div class="grid-2">' +
                '<div class="glass glow-top" style="overflow:hidden">' +
                    '<div class="card-head"><div class="card-title">' + UI.teamCrest(home, 'xs') + 'بدلاء ' + UI.esc(home ? home.name : '') + '</div></div>' +
                    '<div class="card-pad">' + UI.benchHTML(m.homeTeamId, hl) + '</div></div>' +
                '<div class="glass glow-top" style="overflow:hidden">' +
                    '<div class="card-head"><div class="card-title">' + UI.teamCrest(away, 'xs') + 'بدلاء ' + UI.esc(away ? away.name : '') + '</div></div>' +
                    '<div class="card-pad">' + UI.benchHTML(m.awayTeamId, al) + '</div></div>' +
            '</div>';
    }

    function matchModalBody() {
        const m = S.match(view.openMatchId);
        if (!m) return '';
        const home = S.team(m.homeTeamId), away = S.team(m.awayTeamId);
        const statusBadge = m.status === 'FT' ? UI.badge('انتهت المباراة', 'plain', 'check')
            : m.status === 'LIVE' ? UI.badge('مباشر الآن ' + (m.minute ? m.minute + "'" : ''), 'emerald', 'bolt')
            : UI.badge('لم تبدأ بعد', 'cyan', 'clock');
        const score = m.status === 'FT' || m.status === 'LIVE'
            ? '<div class="vs-score font-num">' + UI.num(m.homeScore) + ' - ' + UI.num(m.awayScore) + '</div>'
            : '<div class="vs-score pending font-num">' + UI.esc(m.time || '') + '</div>';

        const head = '<div class="vs-head">' +
            '<div class="vs-side" data-team="' + m.homeTeamId + '" style="cursor:pointer">' + UI.teamCrest(home, 'lg', 'crest-ring') + '<span class="tname">' + UI.esc(home ? home.name : '') + '</span></div>' +
            '<div class="vs-mid">' + score + statusBadge + '<span class="card-sub">' + UI.esc(m.venue || '') + '</span></div>' +
            '<div class="vs-side" data-team="' + m.awayTeamId + '" style="cursor:pointer">' + UI.teamCrest(away, 'lg', 'crest-ring') + '<span class="tname">' + UI.esc(away ? away.name : '') + '</span></div>' +
            '</div>';

        const tabs = '<div class="tabs-line" id="matchTabs">' +
            [['details', 'التفاصيل'], ['lineup', 'التشكيلتان'], ['events', 'أحداث اللقاء']].map(([k, l]) =>
                '<button data-tab="' + k + '" class="' + (view.matchTab === k ? 'active' : '') + '">' + l + '</button>').join('') +
            '</div>';

        let body = '';
        if (view.matchTab === 'details') {
            body = voteWidget(m) + matchInfoTiles(m) + keyPlayers(m) + formCard(m);
        } else if (view.matchTab === 'lineup') {
            body = lineupTab(m);
        } else {
            body = eventsList(m);
        }

        return head + tabs + body;
    }

    function openMatch(id, tab) {
        const m = S.match(id);
        if (!m) return;
        view.openMatchId = id;
        view.matchTab = tab || 'details';
        renderMatchModal();
    }

    function renderMatchModal() {
        const m = S.match(view.openMatchId);
        if (!m) return;
        const home = S.team(m.homeTeamId), away = S.team(m.awayTeamId);
        UI.openModal({
            id: 'matchModal',
            title: UI.esc(S.divisionName(m.division)),
            subtitle: 'الجولة ' + UI.esc(m.round) + ' • ' + UI.esc(UI.fmtDate(m.date)),
            leading: UI.teamCrest(home, 'sm') + UI.teamCrest(away, 'sm'),
            wide: true,
            body: matchModalBody(),
            onMount: () => bindMatchModal()
        });
    }

    function bindMatchModal() {
        const wrap = el('matchModal');
        if (!wrap) return;
        wrap.querySelectorAll('#matchTabs button').forEach(b => {
            b.addEventListener('click', () => { view.matchTab = b.dataset.tab; renderMatchModal(); });
        });
        wrap.querySelectorAll('.vs-side[data-team], .match-side[data-team]').forEach(x => {
            x.addEventListener('click', () => openTeam(x.dataset.team));
        });
        wrap.querySelectorAll('.marker[data-player]').forEach(m => {
            m.addEventListener('click', () => openPlayer(m.dataset.player));
        });
        wrap.querySelectorAll('[data-vote]').forEach(x => {
            x.addEventListener('click', () => UI.toast('تم تسجيل تصويتك: ' + x.dataset.vote, 'ok'));
        });
    }

    /* ======================================================================
       8. نافذة الفريق
       ====================================================================== */
    function teamModalBody() {
        const t = S.team(view.openTeamId);
        if (!t) return '';
        const row = S.teamRank(t.id);
        const squad = S.squad(t.id);
        const next = S.nextMatchFor(t.id);

        const tabs = '<div class="tabs-line" id="teamTabs">' +
            [['overview', 'نظرة عامة'], ['squad', 'اللاعبون'], ['lineup', 'التشكيلة الافتراضية']].map(([k, l]) =>
                '<button data-tab="' + k + '" class="' + (view.teamTab === k ? 'active' : '') + '">' + l + '</button>').join('') +
            '</div>';

        let content = '';

        if (view.teamTab === 'overview') {
            const topScorer = squad.slice().sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];
            const topAssist = squad.slice().sort((a, b) => (b.assists || 0) - (a.assists || 0))[0];
            const best = squad.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
            const tiles = [
                ['table', 'المركز', row ? '#' + row.rank : '—', 'gold'],
                ['star', 'النقاط', row ? row.points : '—', ''],
                ['ball', 'أهداف له', row ? row.gf : '—', 'emerald'],
                ['shield', 'أهداف عليه', row ? row.ga : '—', 'rose']
            ];
            const info = [
                ['user', 'المدرب', t.coach || '—'],
                ['calendar', 'سنة التأسيس', t.founded || '—'],
                ['pin', 'الملعب', t.stadium || '—'],
                ['layers', 'الدرجة', S.divisionName(t.division)]
            ];
            content = '<div class="grid-4">' + tiles.map(([ic, k, v, c]) =>
                    '<div class="stat-tile">' + '<span class="kpi-ic" style="margin:0 auto 6px;background:rgba(255,255,255,.06);color:var(--' + (c === 'gold' ? 'gold' : c || 'txt-2') + ')">' + I(ic) + '</span>' +
                    '<div class="k">' + k + '</div><div class="v ' + c + ' font-num">' + UI.esc(v) + '</div></div>').join('') + '</div>' +
                '<div class="glass glow-top" style="overflow:hidden">' +
                    '<div class="card-head"><div class="card-title">' + I('info') + 'بيانات النادي</div>' +
                    (row ? '<div class="row" style="gap:8px">' + UI.formDots(row.form) + '</div>' : '') + '</div>' +
                    '<div class="grid-2 card-pad">' + info.map(([ic, k, v]) =>
                        '<div class="row" style="gap:9px"><span class="kpi-ic" style="background:var(--violet-soft);color:var(--violet)">' + I(ic) + '</span>' +
                        '<div><div class="kpi-k">' + k + '</div><div style="font-size:12px;font-weight:800;color:#fff">' + UI.esc(v) + '</div></div></div>').join('') +
                    '</div></div>' +
                '<div class="glass glow-top" style="overflow:hidden">' +
                    '<div class="card-head"><div class="card-title">' + I('star') + 'أبرز النجوم</div></div>' +
                    '<div class="card-pad grid-3">' +
                        starTile('الهداف', topScorer) + starTile('الأكثر صناعة', topAssist) + starTile('الأعلى تقييماً', best) +
                    '</div></div>' +
                '<div class="glass glow-top" style="overflow:hidden">' +
                    '<div class="card-head"><div class="card-title">' + I('calendar') + 'المباراة القادمة</div></div>' +
                    '<div class="card-pad">' + (next ? nextMatchHTML(next, t.id) : '<div class="mini-note">لا توجد مباراة مجدولة قادمة</div>') + '</div>' +
                '</div>';
        }

        if (view.teamTab === 'squad') {
            const groups = { GK: [], DF: [], MF: [], FW: [] };
            squad.forEach(p => (groups[p.role] || groups.MF).push(p));
            content = '<div class="glass-flat card-pad row-between">' +
                    '<div class="card-sub">' + squad.length + ' لاعب مسجل في القائمة</div>' +
                    '<div class="row" style="gap:6px">' + UI.badge((squad.reduce((s, p) => s + (p.goals || 0), 0)) + ' أهداف', 'gold', 'ball') +
                        UI.badge((squad.reduce((s, p) => s + (p.assists || 0), 0)) + ' صناعة', 'cyan', 'sparkles') + '</div>' +
                '</div>' +
                Object.keys(groups).map(role => {
                    if (!groups[role].length) return '';
                    return '<div class="glass glow-top" style="overflow:hidden">' +
                        '<div class="card-head"><div class="card-title">' + UI.esc(CFG_.ROLE_LABEL[role]) + '</div>' +
                        '<span class="card-sub">' + groups[role].length + ' لاعب</span></div>' +
                        groups[role].map(p => playerRowHTML(p)).join('') +
                        '</div>';
                }).join('');
            return tabs + content;
        }

        const lineup = S.teamDefaultLineup(t.id);
        if (!lineup) {
            content = '<div class="glass empty">' + I('users') + '<span>لا توجد قائمة لاعبين لهذا الفريق بعد</span></div>';
        } else {
            content = '<div class="mini-note">' + I('info') + ' الخطة المعتمدة: <b>' + UI.esc(lineup.formation) + '</b> — التشكيلة الافتراضية التي تظهر في المباريات غير المسجّلة بتشكيلة خاصة.</div>' +
                UI.pitchSingle(t, lineup, { height: 540 }) +
                '<div class="glass glow-top" style="overflow:hidden">' +
                    '<div class="card-head"><div class="card-title">' + I('users') + 'قائمة البدلاء</div></div>' +
                    '<div class="card-pad">' + UI.benchHTML(t.id, lineup) + '</div>' +
                '</div>';
        }

        return tabs + content;
    }

    function starTile(label, p) {
        if (!p) return '<div class="stat-tile"><div class="k">' + label + '</div><div class="card-sub">—</div></div>';
        return '<div class="stat-tile" data-player="' + p.id + '" style="cursor:pointer">' +
            '<div style="display:flex;justify-content:center;margin-bottom:7px">' + UI.playerAvatar(p, 'sm') + '</div>' +
            '<div class="k">' + label + '</div>' +
            '<div style="font-size:12px;font-weight:800;color:#fff;margin-top:3px">' + UI.esc(UI.shortName(p.name)) + '</div>' +
            '<div class="card-sub">' + UI.num(p.goals) + ' هدف • ' + UI.num(p.assists) + ' صناعة</div>' +
            '</div>';
    }

    function nextMatchHTML(m, myTeamId) {
        const oppId = m.homeTeamId === myTeamId ? m.awayTeamId : m.homeTeamId;
        const opp = S.team(oppId);
        return '<div class="row-between">' +
            '<div class="row" style="gap:9px">' + UI.teamCrest(opp, 'sm') +
                '<div><div class="list-title">ضد ' + UI.esc(opp ? opp.name : '') + '</div>' +
                '<div class="list-sub">' + UI.esc(m.venue || '') + ' • الجولة ' + UI.esc(m.round) + '</div></div></div>' +
            '<div style="text-align:left"><div class="font-num" style="color:var(--gold);font-weight:900">' + UI.esc(m.time || '') + '</div>' +
            '<div class="card-sub">' + UI.esc(UI.fmtDate(m.date)) + '</div></div>' +
            '</div>';
    }

    function playerRowHTML(p) {
        const susp = (p.yellowCards || 0) >= 3 || (p.redCards || 0) >= 1;
        return '<div class="list-row" data-player="' + p.id + '" style="cursor:pointer">' +
            '<div class="list-main">' +
                '<span style="position:relative">' + UI.playerAvatar(p, 'sm') + '</span>' +
                '<div><div class="list-title">' + UI.esc(p.name) +
                    (p.captain ? ' <span class="badge badge-gold">كابتن</span>' : '') + '</div>' +
                '<div class="list-sub">#' + UI.esc(p.number) + ' • ' + UI.esc(p.pos || '') + '</div></div>' +
            '</div>' +
            '<div class="row" style="gap:5px">' +
                (susp ? UI.badge('محروم', 'rose', 'lock') : '') +
                UI.badge(UI.num(p.goals) + ' هدف', 'gold') +
                UI.badge(UI.num(p.assists) + ' صناعة', 'cyan') +
                (p.rating ? UI.badge(UI.num(p.rating).toFixed(1), 'plain') : '') +
            '</div></div>';
    }

    function openTeam(id, tab) {
        if (!S.team(id)) return;
        view.openTeamId = id;
        view.teamTab = tab || 'overview';
        renderTeamModal();
    }

    function renderTeamModal() {
        const t = S.team(view.openTeamId);
        if (!t) return;
        const row = S.teamRank(t.id);
        UI.openModal({
            id: 'teamModal',
            title: UI.esc(t.name),
            subtitle: UI.esc(S.divisionName(t.division)) + (row ? ' • المركز ' + row.rank + ' • ' + row.points + ' نقطة' : ''),
            leading: UI.teamCrest(t, 'md', 'crest-ring'),
            wide: true,
            body: teamModalBody(),
            onMount: bindTeamModal
        });
    }

    function bindTeamModal() {
        const wrap = el('teamModal');
        if (!wrap) return;
        wrap.querySelectorAll('#teamTabs button').forEach(b => {
            b.addEventListener('click', () => { view.teamTab = b.dataset.tab; renderTeamModal(); });
        });
        wrap.querySelectorAll('[data-player], .marker[data-player]').forEach(x => x.addEventListener('click', () => openPlayer(x.dataset.player)));
    }

    /* ======================================================================
       9. نافذة اللاعب
       ====================================================================== */
    function openPlayer(id) {
        const p = S.player(id);
        if (!p) return;
        view.openPlayerId = id;
        renderPlayerModal();
    }

    function renderPlayerModal() {
        const p = S.player(view.openPlayerId);
        if (!p) return;
        const team = S.team(p.teamId);
        const susp = (p.yellowCards || 0) >= 3 || (p.redCards || 0) >= 1;
        const photo = S.mediaUrl('player_' + p.id);
        const tiles = [
            ['ball', 'الأهداف', UI.num(p.goals), 'gold'],
            ['sparkles', 'الصناعة', UI.num(p.assists), 'cyan'],
            ['star', 'التقييم', UI.num(p.rating || 0).toFixed(1), 'emerald'],
            ['card', 'بطاقات', UI.num(p.yellowCards) + ' / ' + UI.num(p.redCards), 'rose']
        ];
        const body =
            '<div class="row" style="gap:14px;align-items:center">' +
                '<span class="avatar av-lg crest-ring">' + (photo ? '<img src="' + photo + '" alt="">' : UI.esc(UI.initials(p.name))) + '</span>' +
                '<div style="min-width:0">' +
                    '<div style="font-size:16px;font-weight:900;color:#fff">' + UI.esc(p.name) + '</div>' +
                    '<div class="card-sub" style="margin-top:4px">#' + UI.esc(p.number) + ' • ' + UI.esc(p.pos || '') + ' • ' + UI.esc(CFG_.ROLE_SHORT[p.role] || '') + '</div>' +
                    '<div class="row" style="gap:6px;margin-top:8px">' +
                        '<span data-team="' + p.teamId + '" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">' + UI.teamCrest(team, 'xs') +
                        '<span style="font-size:11.5px;font-weight:800">' + UI.esc(team ? team.name : '') + '</span></span>' +
                        (susp ? UI.badge('محروم', 'rose', 'lock') : '') +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="grid-4">' + tiles.map(([ic, k, v, c]) =>
                '<div class="stat-tile"><span class="kpi-ic" style="margin:0 auto 6px;background:rgba(255,255,255,.06);color:var(--' + c + ')">' + I(ic) + '</span>' +
                '<div class="k">' + k + '</div><div class="v ' + c + ' font-num">' + UI.esc(v) + '</div></div>').join('') + '</div>' +
            '<div class="mini-note">' + I('info') + ' مشاركات: <b>' + UI.num(p.appearances || 0) + '</b> مباراة — حالة اللاعب تُحدَّث من لوحة التحكم.' + '</div>' +
            '<button class="btn btn-gold btn-block" data-team="' + p.teamId + '">' + I('shield') + 'عرض قائمة الفريق الكاملة</button>';

        UI.openModal({
            id: 'playerModal',
            title: 'بطاقة اللاعب',
            subtitle: UI.esc(team ? team.name : ''),
            narrow: true,
            leading: '<button class="tool-btn" data-back-team="1" title="رجوع إلى ملف الفريق">' + I('chevron') + '</button>',
            body: body,
            onMount: root => {
                root.querySelectorAll('[data-team]').forEach(x => x.addEventListener('click', () => openTeam(x.dataset.team, 'squad')));
                const back = root.querySelector('[data-back-team]');
                if (back) back.addEventListener('click', () => openTeam(p.teamId, 'squad'));
            }
        });
    }

    /* ======================================================================
       10. البحث والقائمة الإضافية
       ====================================================================== */
    function openSearch(initial) {
        const body =
            '<div class="search-input-wrap">' + I('search', 's-ic') +
                '<input class="inp" id="searchInput" placeholder="ابحث عن فريق، لاعب، أو مباراة..." value="' + UI.esc(initial || '') + '" autocomplete="off">' +
                '<button class="s-x" data-close="1">' + I('close') + '</button>' +
            '</div>' +
            '<div id="searchResults" class="stack-sm"></div>';
        UI.openModal({
            title: 'البحث الشامل',
            subtitle: 'في كل الأندية واللاعبين والمباريات',
            sheet: true,
            body: body,
            onMount: root => {
                const input = root.querySelector('#searchInput');
                const run = () => doSearch(input.value);
                input.addEventListener('input', UI.debounce(run, 200));
                input.focus();
                run();
            }
        });
    }

    function doSearch(q) {
        const box = el('searchResults');
        if (!box) return;
        q = (q || '').trim().toLowerCase();
        if (!q) {
            box.innerHTML = '<div class="mini-note">' + I('sparkles') + ' اكتب حرفاً واحداً على الأقل للبحث — يمكنك البحث باسم الفريق أو اللاعب.</div>';
            return;
        }
        const teams = (S.state.teams || []).filter(t => t.name.toLowerCase().indexOf(q) > -1).slice(0, 6);
        const players = (S.state.players || []).filter(p => p.name.toLowerCase().indexOf(q) > -1).slice(0, 10);
        const matches = S.matches({ query: q }).slice(0, 6);

        if (!teams.length && !players.length && !matches.length) {
            box.innerHTML = emptyHTML('لا توجد نتائج مطابقة لبحثك');
            return;
        }

        box.innerHTML =
            (teams.length ? '<div class="glass glow-top" style="overflow:hidden"><div class="card-head"><div class="card-title">' + I('shield') + 'الأندية</div><span class="card-sub">' + teams.length + '</span></div>' +
                teams.map(t => '<div class="list-row" data-team="' + t.id + '" style="cursor:pointer"><div class="list-main">' + UI.teamCrest(t, 'xs') +
                    '<div><div class="list-title">' + UI.esc(t.name) + '</div><div class="list-sub">' + UI.esc(S.divisionName(t.division)) + '</div></div></div>' +
                    I('chevron') + '</div>').join('') + '</div>' : '') +
            (players.length ? '<div class="glass glow-top" style="overflow:hidden"><div class="card-head"><div class="card-title">' + I('user') + 'اللاعبون</div><span class="card-sub">' + players.length + '</span></div>' +
                players.map(p => { const t = S.team(p.teamId); return '<div class="list-row" data-player="' + p.id + '" style="cursor:pointer"><div class="list-main">' + UI.playerAvatar(p, 'xs') +
                    '<div><div class="list-title">' + UI.esc(p.name) + '</div><div class="list-sub">' + UI.esc(t ? t.name : '') + ' • ' + UI.esc(p.pos || '') + '</div></div></div>' +
                    UI.badge(UI.num(p.goals) + ' هدف', 'gold') + '</div>'; }).join('') + '</div>' : '') +
            (matches.length ? '<div class="glass glow-top" style="overflow:hidden"><div class="card-head"><div class="card-title">' + I('ball') + 'المباريات</div></div>' +
                matches.map(m => { const h = S.team(m.homeTeamId), a = S.team(m.awayTeamId);
                    return '<div class="match-row" data-match="' + m.id + '"><div class="match-side">' + UI.teamCrest(h, 'xs') + '<span class="match-name">' + UI.esc(h ? h.name : '') + '</span></div>' +
                    '<div class="match-center"><span class="score-box ' + (m.status === 'FT' ? '' : 'upcoming') + ' font-num">' + (m.status === 'FT' ? m.homeScore + ' - ' + m.awayScore : UI.esc(m.time || '')) + '</span></div>' +
                    '<div class="match-side away">' + UI.teamCrest(a, 'xs') + '<span class="match-name">' + UI.esc(a ? a.name : '') + '</span></div></div>'; }).join('') + '</div>' : '');

        box.querySelectorAll('[data-team]').forEach(x => x.addEventListener('click', () => { UI.closeModal(); openTeam(x.dataset.team); }));
        box.querySelectorAll('[data-player]').forEach(x => x.addEventListener('click', () => { UI.closeModal(); openPlayer(x.dataset.player); }));
        box.querySelectorAll('[data-match]').forEach(x => x.addEventListener('click', () => { UI.closeModal(); openMatch(x.dataset.match); }));
    }

    function openMore() {
        const t = S.totals();
        UI.openModal({
            title: 'المزيد',
            subtitle: 'أدوات وروابط سريعة',
            sheet: true,
            body:
                '<div class="grid-2">' +
                    moreTile('swap', 'سوق الانتقالات', t.transfers + ' عملية', 'view', 'transfers') +
                    moreTile('card', 'المحرومون', t.yellow + ' إنذار', 'view', 'stats') +
                    moreTile('gavel', 'العقوبات', t.sanctions + ' عقوبة', 'view', 'standings') +
                    moreTile('users', 'اللاعبون', t.players + ' لاعب', 'view', 'teams') +
                '</div>' +
                '<div class="mini-note">' + I('sparkles') + ' التصميم الجديد يعمل بتقنية الزجاج (Glassmorphism) ولوحة تحكم مستقلة تماماً عن الموقع العام.</div>' +
                '<a class="btn btn-gold btn-block btn-lg" href="admin.html">' + I('settings') + 'لوحة التحكم المستقلة</a>' +
                '<button class="btn btn-block" id="moreExport">' + I('download') + 'تصدير نسخة احتياطية (JSON)</button>' +
                '<button class="btn btn-block" id="moreAbout">' + I('info') + 'عن الدوري</button>',
            onMount: root => {
                root.querySelectorAll('[data-view]').forEach(x => x.addEventListener('click', () => { setView(x.dataset.view); UI.closeModal(); }));
                root.querySelector('#moreExport').addEventListener('click', () => {
                    UI.download('hedood-backup-' + new Date().toISOString().slice(0, 10) + '.json', S.exportJSON());
                    UI.toast('تم تنزيل النسخة الاحتياطية');
                });
                root.querySelector('#moreAbout').addEventListener('click', openAbout);
            }
        });
    }

    function moreTile(ic, title, sub, attr, val) {
        return '<button class="glass-flat card-pad press" data-' + attr + '="' + val + '" style="text-align:start;display:flex;flex-direction:column;gap:7px">' +
            '<span class="kpi-ic" style="background:var(--gold-soft);color:var(--gold)">' + I(ic) + '</span>' +
            '<span style="font-size:12.5px;font-weight:800;color:#fff">' + UI.esc(title) + '</span>' +
            '<span class="card-sub">' + UI.esc(sub) + '</span></button>';
    }

    function openAbout() {
        const st = S.state.settings || {};
        const t = S.totals();
        UI.openModal({
            title: 'عن الدوري',
            subtitle: UI.esc(st.leagueName || ''),
            body:
                '<div class="mini-note" style="font-size:12px">' + UI.esc(st.tagline || '') + '</div>' +
                '<div class="grid-2">' +
                    '<div class="stat-tile"><div class="k">الأندية</div><div class="v gold font-num">' + t.teams + '</div></div>' +
                    '<div class="stat-tile"><div class="k">اللاعبون</div><div class="v cyan font-num">' + t.players + '</div></div>' +
                    '<div class="stat-tile"><div class="k">المباريات</div><div class="v emerald font-num">' + t.matches + '</div></div>' +
                    '<div class="stat-tile"><div class="k">الأهداف</div><div class="v rose font-num">' + t.goals + '</div></div>' +
                '</div>' +
                '<div class="mini-note">الجهة المنظمة: <b>' + UI.esc(st.organizer || '—') + '</b><br>الموسم الحالي: <b>' + UI.esc(st.season || '—') + '</b></div>'
        });
    }

    /* ======================================================================
       11. التشغيل
       ====================================================================== */
    function renderAll() {
        if (!S.state) return;
        paintChrome();
        if (view.current === 'matches') renderMatches();
        if (view.current === 'standings') renderStandings();
        if (view.current === 'stats') renderStats();
        if (view.current === 'teams') renderTeams();
        if (view.current === 'transfers') renderTransfers();
    }

    function refreshOpenModals() {
        if (el('matchModal')) renderMatchModal();
        if (el('teamModal')) renderTeamModal();
        if (el('playerModal')) renderPlayerModal();
    }

    function bindGlobal() {
        el('btnSearch').addEventListener('click', () => openSearch());
        el('btnLive').addEventListener('click', () => {
            view.liveOnly = !view.liveOnly;
            paintChrome();
            renderAll();
            UI.toast(view.liveOnly ? 'يتم عرض المباريات المباشرة فقط' : 'تم إلغاء فلتر المباشر');
        });
        document.querySelectorAll('#bottomNav button').forEach(b => {
            b.addEventListener('click', () => {
                if (b.dataset.view === 'more') return openMore();
                setView(b.dataset.view);
            });
        });
        document.querySelectorAll('#topTabs button').forEach(b => {
            b.addEventListener('click', () => setView(b.dataset.view));
        });
        el('statsTabs').addEventListener('click', e => {
            const b = e.target.closest('button[data-tab]');
            if (!b) return;
            view.statsTab = b.dataset.tab;
            renderStats();
        });
        el('linkAbout').addEventListener('click', e => { e.preventDefault(); openAbout(); });
        document.addEventListener('keydown', e => {
            const tag = (e.target && e.target.tagName) || '';
            if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
                e.preventDefault();
                openSearch();
            }
        });
        window.addEventListener('hashchange', () => {
            const h = location.hash.replace('#', '');
            if (['matches', 'standings', 'stats', 'teams', 'transfers'].indexOf(h) > -1) setView(h, { scroll: false });
        });
    }

    function boot() {
        S.init();
        bindGlobal();
        const h = location.hash.replace('#', '');
        if (['matches', 'standings', 'stats', 'teams', 'transfers'].indexOf(h) > -1) view.current = h;
        paintChrome();
        setView(view.current, { scroll: false });
        let lastRev = -1;
        S.on(() => {
            if (S.rev !== lastRev) {
                lastRev = S.rev;
                renderAll();
                refreshOpenModals();
            } else {
                paintCloudStatus();
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
