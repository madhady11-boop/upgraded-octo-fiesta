/* ==========================================================================
   store.js — طبقة البيانات: الحالة + الوسائط + المزامنة السحابية
   تعمل دائماً محلياً (localStorage) وتتصل بـ Firestore عند الإمكان
   ========================================================================== */
(function () {
    'use strict';

    const LS_STATE = 'hedood_state_v3';
    const LS_MEDIA = 'hedood_media_v3';
    const MEDIA_LIMIT = 3800000; // حد تقريبي للتخزين المحلي

    const Store = {
        state: null,
        media: {},
        cloud: { mode: 'local', status: 'idle', message: 'وضع محلي' },
        ready: null,
        _subs: [],
        _saveTimer: null,
        _backend: null,
        _cloudPromise: null,
        _fb: null,
        _dirty: false
    };

    /* ------------------------------ أدوات محلية --------------------------- */
    function safeParse(str, fallback) {
        try {
            const v = JSON.parse(str);
            return v == null ? fallback : v;
        } catch (e) {
            return fallback;
        }
    }

    function readLocal() {
        const raw = safeParse(localStorage.getItem(LS_STATE), null);
        if (raw) return CFG.normalizeState(raw);
        return CFG.seedData();
    }

    function readLocalMedia() {
        return safeParse(localStorage.getItem(LS_MEDIA), {}) || {};
    }

    function writeLocal() {
        try {
            localStorage.setItem(LS_STATE, JSON.stringify(Store.state));
        } catch (e) {
            console.warn('تعذر الحفظ المحلي للحالة', e);
        }
        try {
            const json = JSON.stringify(Store.media);
            if (json.length <= MEDIA_LIMIT) {
                localStorage.setItem(LS_MEDIA, json);
            } else {
                localStorage.setItem(LS_MEDIA, '{}');
                console.warn('حجم الصور كبير — تم الاكتفاء بالمزامنة السحابية');
            }
        } catch (e) {
            try { localStorage.setItem(LS_MEDIA, '{}'); } catch (e2) {}
        }
    }

    /* ------------------------------- الإشعارات ---------------------------- */
    Store.on = function (cb) {
        Store._subs.push(cb);
        return function () {
            Store._subs = Store._subs.filter(f => f !== cb);
        };
    };

    /** يُزاد عند أي تغيير فعلي في البيانات (لتفادي إعادة الرسم عند تغيّر حالة السحابة فقط) */
    Store.rev = 0;

    Store.touch = function () {
        Store.rev++;
        Store.emit();
    };

    Store.emit = function () {
        Store._subs.forEach(cb => {
            try { cb(Store.state, Store.media); } catch (e) { console.error(e); }
        });
    };

    Store.setCloud = function (mode, status, message) {
        Store.cloud = { mode: mode, status: status, message: message };
        Store.emit();
        document.dispatchEvent(new CustomEvent('store:cloud', { detail: Store.cloud }));
    };

    /* -------------------------------- الحفظ ------------------------------- */
    Store.save = function (immediate) {
        writeLocal();
        Store.state.updatedAt = new Date().toISOString();
        Store._dirty = true;
        Store.touch();
        if (immediate) return Store.saveNow();
        clearTimeout(Store._saveTimer);
        Store._saveTimer = setTimeout(Store.saveNow, 550);
    };

    Store.saveNow = function () {
        clearTimeout(Store._saveTimer);
        writeLocal();
        const b = Store._backend;
        if (!b) return Promise.resolve(false);
        Store.setCloud('cloud', 'sync', 'جارٍ الحفظ السحابي...');
        // تنظيف الحقول غير المعرّفة (Firestore/RTDB لا يقبلان undefined)
        let payload;
        try {
            payload = JSON.parse(JSON.stringify(Store.state));
        } catch (e) {
            payload = Store.state;
        }
        const p = b.kind === 'firestore'
            ? b.ref.set(payload, { merge: false })
            : b.root.child('state').set(payload);
        return p.then(() => {
            Store._dirty = false;
            Store.setCloud('cloud', 'connected', 'متصل — تم الحفظ ✓');
            return true;
        }).catch(err => {
            console.warn('خطأ الحفظ السحابي', err);
            Store._dirty = false;
            Store.setCloud('cloud', 'error', 'تعذر الحفظ السحابي — سيبقى التعديل محفوظاً على جهازك');
            return false;
        });
    };

    /* ------------------------------- الوسائط ------------------------------ */
    Store.setMedia = function (key, dataUrl) {
        Store.media[key] = dataUrl;
        writeLocal();
        Store.touch();
        Store._writeMedia(key, dataUrl);
    };

    Store.delMedia = function (key) {
        delete Store.media[key];
        writeLocal();
        Store.touch();
        Store._deleteMedia(key);
    };

    Store.mediaUrl = function (key) {
        return Store.media[key] || null;
    };

    Store._writeMedia = function (key, dataUrl) {
        const b = Store._backend;
        if (!b) return;
        const payload = { key: key, data: dataUrl, updatedAt: new Date().toISOString() };
        if (JSON.stringify(payload).length > 900000) {
            document.dispatchEvent(new CustomEvent('store:toast', { detail: { msg: 'حجم الصورة كبير جداً للمزامنة السحابية', type: 'err' } }));
            return;
        }
        const p = b.kind === 'firestore'
            ? b.col.doc(key).set(payload, { merge: true })
            : b.root.child('media/' + key).set(dataUrl);
        p.catch(err => {
            console.warn('خطأ رفع الصورة', err);
            document.dispatchEvent(new CustomEvent('store:toast', { detail: { msg: 'تم الحفظ محلياً — تعذر رفع الصورة للسحابة', type: 'err' } }));
        });
    };

    Store._deleteMedia = function (key) {
        const b = Store._backend;
        if (!b) return;
        const p = b.kind === 'firestore' ? b.col.doc(key).delete() : b.root.child('media/' + key).remove();
        p.catch(() => {});
    };

    Store.syncNow = function () {
        if (!Store._backend) {
            return Store.connectCloud(true).then(ok => ok ? Store.saveNow() : false);
        }
        return Store.saveNow();
    };

    /* --------------------------- الاتصال بالسحابة ------------------------- */
    /* يدعم مسارين: Firestore (مع ثلاث تخطيطات مسموحة) ثم Realtime Database كبديل */
    const FB_VERSION = '11.6.1';
    const FB_BASE = 'https://www.gstatic.com/firebasejs/' + FB_VERSION + '/';

    function injectScript(src, timeoutMs) {
        return new Promise((resolve, reject) => {
            const el = document.createElement('script');
            el.src = src;
            let done = false;
            const to = setTimeout(() => { if (!done) { done = true; reject(new Error('timeout')); } }, timeoutMs || 9000);
            el.onload = () => { if (!done) { done = true; clearTimeout(to); resolve(); } };
            el.onerror = () => { if (!done) { done = true; clearTimeout(to); reject(new Error('load-failed')); } };
            document.head.appendChild(el);
        });
    }

    function loadSdk(builders) {
        return builders.filter(Boolean).reduce((chain, src) => {
            return chain.then(() => injectScript(src).catch(() => null));
        }, Promise.resolve());
    }

    function seg(s) { return String(s).split('/').filter(Boolean).length; }

    Store.connectCloud = function (force) {
        if (Store._cloudPromise && !force) return Store._cloudPromise;
        Store.setCloud('local', 'connecting', 'جارٍ الاتصال بالسحابة...');

        const need = [];
        if (!window.firebase) need.push(FB_BASE + 'firebase-app-compat.js');
        if (!window.firebase || !window.firebase.firestore) need.push(FB_BASE + 'firebase-firestore-compat.js');
        if (!window.firebase || !window.firebase.auth) need.push(FB_BASE + 'firebase-auth-compat.js');
        if (!window.firebase || !window.firebase.database) need.push(FB_BASE + 'firebase-database-compat.js');

        Store._cloudPromise = loadSdk(need)
            .then(() => {
                if (!window.firebase) throw new Error('sdk-not-available');
                if (!window.firebase.apps.length) window.firebase.initializeApp(CFG.FIREBASE_CONFIG);
                const app = window.firebase.app();
                const auth = window.firebase.auth ? app.auth() : null;
                const authTry = auth
                    ? auth.signInAnonymously().catch(err => {
                        console.warn('تعذر الدخول المجهول', err && err.code);
                        return null;
                    })
                    : Promise.resolve(null);
                return authTry.then(() => app);
            })
            .then(app => {
                let fired = false;
                const firestore = app.firestore ? app.firestore() : null;
                const chain = firestore ? tryFirestore(firestore) : Promise.resolve(false);
                return chain.then(ok => {
                    if (ok) { fired = true; return true; }
                    const rtdb = app.database ? app.database() : null;
                    if (!rtdb) return false;
                    return tryRealtime(rtdb).then(ok2 => { fired = ok2; return ok2; });
                });
            })
            .then(ok => {
                if (!ok) throw new Error('no-permitted-backend');
                Store.setCloud('cloud', 'connected', 'متصل بالسحابة — التحديثات تظهر لجميع الزوار ✓');
                return true;
            })
            .catch(err => {
                console.warn('وضع محلي:', err && err.message);
                Store.setCloud('local', 'error', 'وضع محلي — تعذّر الوصول لقاعدة البيانات السحابية (تجد كل البيانات محفوظة على جهازك)');
                return false;
            });

        return Store._cloudPromise;
    };

    /* ---------- المحاولة 1: Firestore عبر تخطيطات مسموحة ---------- */
    function tryFirestore(db) {
        const base = ['artifacts', CFG.APP_ID, 'public', 'data'];
        const candidates = [
            { state: base.concat(['state', 'current']), media: base.concat(['media']) },
            { state: base.concat(['main', 'state']), media: base.concat(['media']) },
            { state: base.concat(['app', 'state']), media: base.concat(['app', 'media']) }
        ];
        let i = 0;

        function next() {
            if (i >= candidates.length) return Promise.resolve(false);
            const cand = candidates[i++];
            if (seg(cand.state.join('/')) % 2 !== 0 || seg(cand.media.join('/')) % 2 === 0) return next();
            let ref, col;
            try {
                ref = db.doc(cand.state.join('/'));
                col = db.collection(cand.media.join('/'));
            } catch (e) {
                return next();
            }
            return ref.get().then(snap => {
                if (snap.exists && snap.data()) {
                    Store.state = CFG.normalizeState(snap.data());
                    Store._applyCloudState(Store.state, true);
                } else {
                    return ref.set(Store.state, { merge: false });
                }
                return null;
            }).then(() => {
                Store._backend = { kind: 'firestore', ref: ref, col: col };
                ref.onSnapshot({ includeMetadataChanges: false }, snap => {
                    if (!snap.exists || (snap.metadata && snap.metadata.hasPendingWrites)) return;
                    const data = snap.data();
                    if (data) Store._applyCloudState(CFG.normalizeState(data), false);
                }, err => console.warn('مشكلة المراقبة (Firestore)', err && err.code));

                col.onSnapshot(snap => {
                    let changed = false;
                    snap.docChanges().forEach(ch => {
                        const d = ch.doc.data();
                        const key = (d && d.key) || ch.doc.id;
                        if (!key) return;
                        if (ch.type === 'removed') {
                            if (Store.media[key]) { delete Store.media[key]; changed = true; }
                        } else if (d && d.data && Store.media[key] !== d.data) {
                            Store.media[key] = d.data;
                            changed = true;
                        }
                    });
                    if (changed) {
                        writeLocal();
                        Store.touch();
                        document.dispatchEvent(new CustomEvent('store:media'));
                    }
                }, err => console.warn('مشكلة مراقبة الصور (Firestore)', err && err.code));
                return true;
            }).catch(err => {
                console.warn('تخطيط Firestore غير مسموح:', cand.state.join('/'), err && err.code);
                return next();
            });
        }

        return next();
    }

    /* ---------- المحاولة 2: Realtime Database ---------- */
    function tryRealtime(rtdb) {
        return new Promise(resolve => {
            let settled = false;
            const finish = val => { if (!settled) { settled = true; resolve(val); } };
            const to = setTimeout(() => finish(false), 9000);
            let root;
            try {
                root = rtdb.ref('hedood');
            } catch (e) {
                clearTimeout(to);
                return finish(false);
            }
            root.child('state').once('value', snap => {
                clearTimeout(to);
                const val = snap && snap.val ? snap.val() : null;
                if (val && val.teams) {
                    Store.state = CFG.normalizeState(val);
                    Store._applyCloudState(Store.state, true);
                } else {
                    root.child('state').set(JSON.parse(JSON.stringify(Store.state)));
                }
                Store._backend = { kind: 'rtdb', root: root };
                root.child('state').on('value', s2 => {
                    const v = s2.val();
                    if (v && v.teams) Store._applyCloudState(CFG.normalizeState(v), false);
                });
                root.child('media').on('value', s3 => {
                    const media = s3.val() || {};
                    let changed = false;
                    Object.keys(media).forEach(k => {
                        if (media[k] && Store.media[k] !== media[k]) { Store.media[k] = media[k]; changed = true; }
                    });
                    Object.keys(Store.media).forEach(k => {
                        if (!(k in media)) { delete Store.media[k]; changed = true; }
                    });
                    if (changed) {
                        writeLocal();
                        Store.touch();
                        document.dispatchEvent(new CustomEvent('store:media'));
                    }
                });
                finish(true);
            }, err => {
                clearTimeout(to);
                console.warn('RTDB غير متاح', err && err.code);
                finish(false);
            });
        });
    }

    Store._applyCloudState = function (incoming, isInitial) {
        if (Store._dirty && !isInitial) return; // التعديلات المحلية غير المحفوظة لها الأولوية
        Store.state = incoming;
        if (Store.state.settings && Store.state.settings.autoSquads !== false) {
            if (CFG.ensureSquads(Store.state)) Store.save();
        }
        writeLocal();
        Store.touch();
        document.dispatchEvent(new CustomEvent('store:remote'));
    };

    /* -------------------------------- البدء ------------------------------- */
    Store.init = function () {
        if (Store.ready) return Store.ready;
        Store.state = readLocal();
        Store.media = readLocalMedia();
        writeLocal();
        Store.ready = Promise.resolve().then(() => {
            Store.touch();
            return Store.connectCloud().catch(() => false);
        });
        return Store.ready;
    };

    /* ------------------------------ المستعلمات ---------------------------- */
    Store.team = function (id) {
        return (Store.state.teams || []).find(t => t.id === id) || null;
    };

    Store.player = function (id) {
        return (Store.state.players || []).find(p => p.id === id) || null;
    };

    Store.match = function (id) {
        return (Store.state.matches || []).find(m => m.id === id) || null;
    };

    Store.divisions = function () {
        return Object.keys(Store.state.divisions || {}).map(k => Store.state.divisions[k]);
    };

    Store.divisionName = function (key) {
        const d = Store.state.divisions[key];
        return d ? d.name : key;
    };

    Store.divisionShort = function (key) {
        const d = Store.state.divisions[key];
        return d ? d.short : key;
    };

    Store.teams = function (divKey) {
        const list = (Store.state.teams || []).slice();
        if (!divKey || divKey === 'all') return list;
        return list.filter(t => t.division === divKey);
    };

    Store.squad = function (teamId) {
        return (Store.state.players || [])
            .filter(p => p.teamId === teamId)
            .sort((a, b) => (CFG.ROLE_ORDER[a.role] ?? 9) - (CFG.ROLE_ORDER[b.role] ?? 9) || (a.number || 99) - (b.number || 99));
    };

    Store.matches = function (filter) {
        filter = filter || {};
        let list = (Store.state.matches || []).slice();
        if (filter.division && filter.division !== 'all') list = list.filter(m => m.division === filter.division);
        if (filter.teamId) list = list.filter(m => m.homeTeamId === filter.teamId || m.awayTeamId === filter.teamId);
        if (filter.status) list = list.filter(m => m.status === filter.status);
        if (filter.round) list = list.filter(m => String(m.round) === String(filter.round));
        if (filter.query) {
            const q = filter.query.toLowerCase();
            list = list.filter(m => {
                const h = Store.team(m.homeTeamId), a = Store.team(m.awayTeamId);
                return (h && h.name.toLowerCase().indexOf(q) > -1) || (a && a.name.toLowerCase().indexOf(q) > -1);
            });
        }
        const order = { LIVE: 0, NS: 1, FT: 2 };
        return list.sort((a, b) => {
            const oa = order[a.status] ?? 3, ob = order[b.status] ?? 3;
            if (oa !== ob) return oa - ob;
            const da = (a.date || '') + (a.time || ''), dbd = (b.date || '') + (b.time || '');
            return String(da).localeCompare(String(dbd));
        });
    };

    Store.nextMatchFor = function (teamId) {
        const list = Store.matches({ status: 'NS', teamId: teamId });
        return list[0] || null;
    };

    Store.lastMatchesFor = function (teamId, limit) {
        const list = Store.matches({ teamId: teamId }).filter(m => m.status === 'FT').reverse();
        return list.slice(0, limit || 5);
    };

    /* ------------------------------ جدول الترتيب --------------------------- */
    Store.standings = function (divKey) {
        divKey = divKey || 'premier';
        const teams = Store.teams(divKey);
        const matches = (Store.state.matches || []).filter(m => m.division === divKey && m.status === 'FT');
        const table = {};
        teams.forEach(t => {
            table[t.id] = {
                team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0,
                points: -(t.deductedPoints || 0), form: [], deducted: t.deductedPoints || 0
            };
        });
        matches.forEach(m => {
            const h = table[m.homeTeamId], a = table[m.awayTeamId];
            if (!h || !a) return;
            h.played++; a.played++;
            h.gf += m.homeScore || 0; h.ga += m.awayScore || 0;
            a.gf += m.awayScore || 0; a.ga += m.homeScore || 0;
            if (m.homeScore > m.awayScore) {
                h.won++; h.points += 3; h.form.unshift('W');
                a.lost++; a.form.unshift('L');
            } else if (m.homeScore === m.awayScore) {
                h.drawn++; a.drawn++; h.points += 1; a.points += 1;
                h.form.unshift('D'); a.form.unshift('D');
            } else {
                a.won++; a.points += 3; a.form.unshift('W');
                h.lost++; h.form.unshift('L');
            }
        });
        const rows = Object.keys(table).map(k => table[k]);
        rows.forEach(r => { r.gd = r.gf - r.ga; r.form = r.form.slice(0, 5); });
        rows.sort((x, y) => (y.points - x.points) || (y.gd - x.gd) || (y.gf - x.gf) || x.team.name.localeCompare(y.team.name));
        rows.forEach((r, i) => { r.rank = i + 1; });
        return rows;
    };

    Store.teamRank = function (teamId) {
        const t = Store.team(teamId);
        if (!t) return null;
        const rows = Store.standings(t.division);
        const row = rows.find(r => r.team.id === teamId);
        return row ? row : null;
    };

    /* ------------------------------- الإحصاءات ---------------------------- */
    Store.scorers = function (limit) {
        const list = (Store.state.players || []).slice().sort((a, b) => (b.goals || 0) - (a.goals || 0) || (b.rating || 0) - (a.rating || 0));
        return limit ? list.slice(0, limit) : list;
    };

    Store.assists = function (limit) {
        const list = (Store.state.players || []).slice().sort((a, b) => (b.assists || 0) - (a.assists || 0) || (b.rating || 0) - (a.rating || 0));
        return limit ? list.slice(0, limit) : list;
    };

    Store.suspended = function () {
        return (Store.state.players || []).filter(p => (p.yellowCards || 0) >= 3 || (p.redCards || 0) >= 1);
    };

    Store.totals = function () {
        const matches = Store.state.matches || [];
        const played = matches.filter(m => m.status === 'FT').length;
        const live = matches.filter(m => m.status === 'LIVE').length;
        const goals = matches.reduce((s, m) => s + (Number(m.homeScore) || 0) + (Number(m.awayScore) || 0), 0);
        const yellow = (Store.state.players || []).reduce((s, p) => s + (p.yellowCards || 0), 0);
        const red = (Store.state.players || []).reduce((s, p) => s + (p.redCards || 0), 0);
        return {
            teams: (Store.state.teams || []).length,
            players: (Store.state.players || []).length,
            matches: matches.length,
            played: played,
            live: live,
            upcoming: matches.filter(m => m.status === 'NS').length,
            goals: goals,
            yellow: yellow,
            red: red,
            transfers: (Store.state.transfers || []).length,
            sanctions: (Store.state.sanctions || []).length
        };
    };

    /* ------------------------------ التشكيلات ---------------------------- */
    Store.lineupFor = function (matchId, side) {
        const all = Store.state.lineups || {};
        const entry = all[matchId];
        if (entry && entry[side] && (entry[side].rows || entry[side].gk)) return entry[side];
        const match = Store.match(matchId);
        if (!match) return null;
        const teamId = side === 'away' ? match.awayTeamId : match.homeTeamId;
        return Store.teamDefaultLineup(teamId);
    };

    Store.lineupSource = function (matchId, side) {
        const all = Store.state.lineups || {};
        const entry = all[matchId];
        if (entry && entry[side] && (entry[side].rows || entry[side].gk)) return 'match';
        return 'default';
    };

    Store.teamDefaultLineup = function (teamId) {
        const t = Store.team(teamId);
        if (!t) return null;
        if (t.lineup && (t.lineup.rows || t.lineup.gk)) return t.lineup;
        const squad = Store.squad(teamId);
        if (!squad.length) return null;
        return CFG.autoLineup(squad, t.formation || '4-3-3');
    };

    Store.setMatchLineup = function (matchId, side, lineup) {
        if (!Store.state.lineups) Store.state.lineups = {};
        if (!Store.state.lineups[matchId]) Store.state.lineups[matchId] = {};
        Store.state.lineups[matchId][side] = lineup;
        Store.save(true);
    };

    Store.clearMatchLineup = function (matchId, side) {
        if (Store.state.lineups && Store.state.lineups[matchId]) {
            delete Store.state.lineups[matchId][side];
        }
        Store.save(true);
    };

    /* -------------------------- عمليات التعديل العامة --------------------- */
    Store.mutate = function (fn, opts) {
        fn(Store.state);
        Store.save(opts && opts.immediate === false ? false : true);
    };

    Store.replaceState = function (next) {
        Store.state = CFG.normalizeState(next);
        Store.save(true);
    };

    Store.resetToSeed = function () {
        Store.state = CFG.seedData();
        Store.media = {};
        writeLocal();
        Store.save(true);
    };

    Store.exportJSON = function () {
        return JSON.stringify({ state: Store.state, media: Store.media }, null, 2);
    };

    Store.importJSON = function (text) {
        const parsed = JSON.parse(text);
        if (parsed && parsed.state) {
            Store.state = CFG.normalizeState(parsed.state);
            if (parsed.media) Store.media = parsed.media;
        } else {
            Store.state = CFG.normalizeState(parsed);
        }
        writeLocal();
        Store.save(true);
        return true;
    };

    Store.newId = function (prefix) {
        return (prefix || 'x') + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    };

    window.Store = Store;
})();
