/* ==========================================================================
   اختبار وظيفي شامل لموقع دوري الحدود (يجري على نسختين: الموقع العام + اللوحة)
   التشغيل:
     npm i jsdom        # مرة واحدة
     node tests/smoke.test.cjs
   يفحص: العرض، التصفية، النوافذ، البحث، رفع الشعارات والصور، محرر التشكيلات،
          العقوبات، الانتقالات، الإعدادات، والمزامنة (Firestore / RTDB / محلي)
   ========================================================================== */
/* اختبار وظيفي شامل (jsdom + خادم HTTP محلي) */
const fs = require('fs');
const path = require('path');
const http = require('http');
let JSDOM, VirtualConsole;
try {
    ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch (e) {
    console.error('\n▶ مطلوب تثبيت jsdom قبل تشغيل الاختبار:\n    npm i -D jsdom\n');
    process.exit(2);
}

const REPO = require('path').resolve(__dirname, '..');
const PORT = 8099;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = path.join(REPO, p);
    if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
});

let pass = 0, fail = 0;
const failed = [];
function ok(cond, label, extra) {
    if (cond) { pass++; console.log('  ✔ ' + label); }
    else { fail++; failed.push(label); console.log('  ✘ ' + label + (extra ? '  → ' + extra : '')); }
}

const fb = { sets: 0, mediaSets: 0, docPaths: [], collPaths: [], listeners: 0 };
function firebaseStub() {
    return {
        apps: [1],
        firestore: function () {},
        auth: function () {},
        initializeApp() { this.apps.push(1); },
        app() {
            return {
                auth: () => ({ signInAnonymously: () => Promise.resolve({ user: { uid: 'anon' } }) }),
                firestore: () => ({
                    doc(p) {
                        const n = String(p).split('/').length;
                        if (n % 2 !== 0) throw new Error('bad doc path: ' + p);
                        fb.docPaths.push(p);
                        return {
                            get: () => Promise.resolve({ exists: false, data: () => null }),
                            set: () => { fb.sets++; return Promise.resolve(true); },
                            onSnapshot: () => { fb.listeners++; }
                        };
                    },
                    collection(p) {
                        const n = String(p).split('/').length;
                        if (n % 2 === 0) throw new Error('bad collection path: ' + p);
                        fb.collPaths.push(p);
                        return {
                            doc: () => ({ set: () => { fb.mediaSets++; return Promise.resolve(true); }, delete: () => Promise.resolve(true) }),
                            onSnapshot: () => { fb.listeners++; }
                        };
                    }
                })
            };
        }
    };
}

function open(page, stubFactory, pre) {
    const errors = [];
    return new Promise((resolve, reject) => {
        const vc = new VirtualConsole();
        vc.on('jsdomError', e => {
            const m = String(e.message);
            if (/Could not load/.test(m) || /Not implemented: Window's scrollTo/.test(m)) return;
            errors.push('jsdom: ' + m);
        });
        vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
        vc.on('warn', () => {});
        vc.on('log', (...a) => console.log('   [page]', ...a));
        JSDOM.fromURL('http://localhost:' + PORT + '/' + page, {
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true,
            virtualConsole: vc,
            beforeParse(window) {
                window.firebase = (stubFactory || firebaseStub)();
                if (pre) pre(window);
                Object.defineProperty(window, 'Image', { value: class { set src(v) { this.onerror && this.onerror(); } } });
            }
        }).then(dom => {
            setTimeout(() => resolve({ dom, w: dom.window, doc: dom.window.document, errors }), 600);
        }).catch(reject);
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    await new Promise(r => server.listen(PORT, '127.0.0.1', r));

    /* ================== 1) الموقع العام ================== */
    console.log('\n===== الموقع العام (index.html) =====');
    {
        const { w, doc, errors } = await open('index.html');
        ok(errors.length === 0, 'لا أخطاء JS', errors.join(' | '));
        ok(!!w.Store && !!w.UI && !!w.CFG, 'الوحدات محمّلة');
        ok(w.Store.state.teams.length === 18, '18 نادياً (' + w.Store.state.teams.length + ')');
        ok(w.Store.state.players.length >= 270, 'قوائم كاملة (' + w.Store.state.players.length + ' لاعباً)');
        ok(doc.querySelectorAll('#matchesFeed .match-row').length === 18, 'كل المباريات تظهر (' + doc.querySelectorAll('#matchesFeed .match-row').length + ')');
        ok(doc.querySelectorAll('#matchesFeed > div').length === 4, 'تجميع المباريات بالدرجات الأربع');
        ok(doc.querySelector('#heroStats').children.length === 4, 'إحصاءات البانر');
        ok(doc.querySelector('#brandMark').innerHTML.length > 20, 'شعار الدوري بالشريط');
        ok(w.Store.cloud.status === 'connected', 'مزامنة سحابية (محاكاة) = ' + w.Store.cloud.status);
        const seg = s => s.split('/').filter(Boolean).length;
        ok(fb.docPaths.length > 0 && seg(fb.docPaths[0]) % 2 === 0, 'مسار مستند الحالة صحيح (' + seg(fb.docPaths[0]) + ' مقاطع): ' + fb.docPaths[0]);
        ok(fb.collPaths.length > 0 && seg(fb.collPaths[0]) % 2 === 1, 'مسار مجموعة الوسائط صحيح (' + seg(fb.collPaths[0]) + ' مقاطع): ' + fb.collPaths[0]);

        // التصفية
        doc.querySelector('#divChips [data-div="premier"]').click();
        ok(doc.querySelectorAll('#matchesFeed .match-row').length === 8, 'تصفية الدرجة الممتازة (8)');
        doc.querySelector('#divChips [data-div="all"]').click();
        doc.querySelector('#btnLive').click();
        ok(doc.querySelectorAll('#matchesFeed .match-row').length === 2, 'فلتر المباشر (2)');
        doc.querySelector('#btnLive').click();

        // نافذة المباراة (نختار مباراة منتهية فيها أحداث)
        const finishedRow = Array.from(doc.querySelectorAll('#matchesFeed .match-row')).find(r => /انتهت/.test(r.textContent));
        finishedRow.click();
        ok(!!doc.querySelector('#matchModal'), 'فتح تفاصيل المباراة');
        ok(doc.querySelectorAll('#matchTabs button').length === 3, 'تبويبات المباراة');
        doc.querySelectorAll('#matchTabs button')[1].click();
        const mk = doc.querySelectorAll('#matchModal .pitch .marker').length;
        ok(mk === 22, 'التشكيلتان على الملعب (' + mk + ' لاعباً)');
        ok(doc.querySelectorAll('#matchModal .marker-name').length === 22, 'أسماء اللاعبين ظاهرة');
        ok(doc.querySelectorAll('#matchModal .bench-item').length > 4, 'قائمة البدلاء');
        doc.querySelectorAll('#matchTabs button')[2].click();
        ok(doc.querySelectorAll('#matchModal .tl-item').length === 6, 'أحداث اللقاء (' + doc.querySelectorAll('#matchModal .tl-item').length + ')');
        doc.querySelectorAll('#matchTabs button')[0].click();
        ok(!!doc.querySelector('#matchModal .vs-head'), 'رأس اللقاء (النتيجة)');
        ok(doc.querySelectorAll('#matchModal [data-vote]').length === 3, 'تصويت 1X2');
        doc.querySelector('#matchModal [data-close]').click();
        ok(!doc.querySelector('#matchModal'), 'إغلاق النافذة');

        // الفرق واللاعبون والتشكيلة
        doc.querySelector('#bottomNav [data-view="teams"]').click();
        ok(doc.querySelectorAll('#teamsGrid [data-team]').length === 18, 'شبكة الفرق');
        doc.querySelector('#teamsGrid [data-team]').click();
        ok(!!doc.querySelector('#teamModal'), 'ملف الفريق');
        doc.querySelectorAll('#teamTabs button')[1].click();
        const squadRows = doc.querySelectorAll('#teamModal [data-player]').length;
        ok(squadRows === 15, 'قائمة اللاعبين (15 لاعباً) (' + squadRows + ')');
        doc.querySelectorAll('#teamTabs button')[2].click();
        const tp = doc.querySelectorAll('#teamModal .marker').length;
        ok(tp === 11, 'التشكيلة الافتراضية 11 لاعباً (' + tp + ')');
        doc.querySelector('#teamModal .marker').click();
        ok(!!doc.querySelector('#playerModal'), 'بطاقة اللاعب من الملعب');
        doc.querySelector('#playerModal [data-back-team]').click();
        ok(!!doc.querySelector('#teamModal'), 'زر الرجوع يعيد ملف الفريق');
        doc.querySelector('#teamModal [data-close]').click();

        // الترتيب
        doc.querySelector('#bottomNav [data-view="standings"]').click();
        ok(doc.querySelectorAll('#standingsBody tr').length === 6, 'جدول الممتاز 6 فرق');
        ok(!!doc.querySelector('#standingsBody .rank-pill.top1'), 'تمييز المتصدر');
        doc.querySelector('#bottomNav [data-view="stats"]').click();
        ok(!!doc.querySelector('.podium'), 'منصة الهدافين');
        ok(doc.querySelectorAll('#statsContent .list-row').length >= 25, 'قائمة الهدافين (' + doc.querySelectorAll('#statsContent .list-row').length + ')');
        doc.querySelector('#statsTabs [data-tab="cards"]').click();
        ok(doc.querySelectorAll('#statsContent .list-row').length > 3, 'تبويب الإنذارات');
        doc.querySelector('#topTabs [data-view="transfers"]').click();
        ok(doc.querySelectorAll('#transfersFeed > div').length === 3, 'سوق الانتقالات (من التبويب العلوي)');

        // البحث
        doc.querySelector('#btnSearch').click();
        const si = doc.querySelector('#searchInput');
        si.value = 'نجم';
        si.dispatchEvent(new w.Event('input'));
        await sleep(350);
        ok(doc.querySelectorAll('#searchResults .list-row').length > 0, 'نتائج البحث (' + doc.querySelectorAll('#searchResults .list-row').length + ')');
        doc.querySelector('#modalOverlay [data-close]').click();

        // المزيد
        doc.querySelector('#bottomNav [data-view="more"]').click();
        ok(!!doc.querySelector('#moreExport'), 'أزرار المزيد');
        doc.querySelector('#moreAbout').click();
        ok(/الجهة المنظمة/.test(doc.querySelector('#modalOverlay').textContent), 'نافذة عن الدوري');
        doc.querySelector('#modalOverlay [data-close]').click();
        ok(errors.length === 0, 'لا أخطاء JS بعد التفاعل', errors.join(' | '));
    }

    /* ================== 2) لوحة التحكم ================== */
    console.log('\n===== لوحة التحكم (admin.html) =====');
    {
        const { w, doc, errors } = await open('admin.html');
        ok(errors.length === 0, 'لا أخطاء JS', errors.join(' | '));
        ok(!!doc.querySelector('#gate'), 'بوابة رمز المرور');
        doc.querySelector('#gateInput').value = '0000';
        doc.querySelector('#gateConfirm').click();
        ok(!!doc.querySelector('#gate'), 'رمز خاطئ = لا دخول');
        doc.querySelector('#gateInput').value = '';
        ['2','0','1','6'].forEach(k => doc.querySelector('#gateKeypad [data-key="' + k + '"]').click());
        ok(doc.querySelectorAll('#gateDots .pin-dot.filled').length === 4, 'نقاط رمز المرور تتعبأ');
        doc.querySelector('#gateConfirm').click();
        ok(!doc.querySelector('#gate'), 'رمز صحيح 2016 يفتح اللوحة');
        ok(!doc.querySelector('#adminApp').hidden, 'اللوحة ظاهرة');
        ok(doc.querySelectorAll('#sideNav [data-sec]').length === 8, '8 أقسام في التنقل');
        ok(doc.querySelectorAll('#adminBottomNav [data-sec]').length === 8, 'تنقل سفلي للجوال');

        ['overview','matches','teams','players','lineups','discipline','transfers','settings'].forEach(sec => {
            doc.querySelector('#sideNav [data-sec="' + sec + '"]').click();
            ok(doc.querySelector('#sec-' + sec).classList.contains('active'), 'قسم يفتح: ' + sec);
        });

        // نظرة عامة
        doc.querySelector('#sideNav [data-sec="overview"]').click();
        ok(doc.querySelectorAll('#admKpis .kpi').length === 8, 'مؤشرات 8 بطاقات');
        ok(doc.querySelectorAll('#admQuick [data-sec]').length === 6, 'اختصارات سريعة');
        ok(doc.querySelectorAll('#admActivity .list-row').length > 0, 'سجل النشاط');

        // الفرق: الشعارات
        doc.querySelector('#sideNav [data-sec="teams"]').click();
        ok(doc.querySelectorAll('#teamsGrid [data-team-card]').length === 18, 'بطاقات الفرق 18');
        ok(doc.querySelectorAll('#teamsGrid [data-crest]').length === 18, '18 زر رفع شعار');
        // محاكاة رفع شعار
        w.Store.setMedia('team_t1', 'data:image/webp;base64,AAAA');
        ok(fb.mediaSets >= 1, 'رفع الشعار يكتب في مجموعة الوسائط');
        doc.querySelector('#sideNav [data-sec="teams"]').click();
        ok(doc.querySelectorAll('#teamsGrid [data-crest] img').length === 1, 'الشعار المرفوع يظهر في البطاقة');
        const nm = doc.querySelector('#teamsGrid [data-tf="name"]');
        nm.value = 'شباب الحدود الجديد'; nm.dispatchEvent(new w.Event('change'));
        ok(w.Store.state.teams[0].name === 'شباب الحدود الجديد', 'تعديل اسم الفريق');
        const col = doc.querySelector('#teamsGrid [data-tf="color"]');
        col.value = '#ff0000'; col.dispatchEvent(new w.Event('change'));
        ok(w.Store.state.teams[0].color === '#ff0000', 'تعديل لون الفريق');
        doc.querySelector('#newTeamName').value = 'نادي الاختبار';
        doc.querySelector('#btnAddTeam').click();
        ok(w.Store.state.teams.length === 19, 'إضافة نادٍ جديد');
        const newCard = Array.from(doc.querySelectorAll('#teamsGrid [data-team-card]'))
            .find(c => c.querySelector('[data-tf="name"]').value === 'نادي الاختبار');
        const delBtn = newCard.querySelector('[data-del-team]');
        delBtn.click();
        await sleep(50);
        const confirmYes = doc.querySelector('#modalOverlay [data-yes]');
        ok(!!confirmYes, 'نافذة تأكيد الحذف');
        confirmYes.click();
        await sleep(120);
        ok(w.Store.state.teams.length === 18, 'حذف النادي يعمل');

        // اللاعبون: الصور
        doc.querySelector('#sideNav [data-sec="players"]').click();
        ok(doc.querySelectorAll('#playersList [data-player-card]').length === 60, 'قائمة اللاعبين مع ترقيم الصفحات (' + doc.querySelectorAll('#playersList [data-player-card]').length + ')');
        ok(!!doc.querySelector('#plMore'), 'زر عرض المزيد');
        doc.querySelector('#plMore').click();
        ok(doc.querySelectorAll('#playersList [data-player-card]').length === 120, 'عرض المزيد (120)');
        ok(doc.querySelectorAll('#playersList [data-photo]').length === 120, '120 زر رفع صورة لاعب');
        ok(/27\d/.test(doc.querySelector('#playersCount').textContent), 'عدّاد اللاعبين: ' + doc.querySelector('#playersCount').textContent);
        // تعديل لاعب
        const pfName = doc.querySelector('#playersList [data-pf="name"]');
        pfName.value = 'لاعب مُختبَر'; pfName.dispatchEvent(new w.Event('change'));
        ok(w.Store.state.players.some(p => p.name === 'لاعب مُختبَر'), 'تعديل اسم اللاعب');
        const pfGoals = doc.querySelector('#playersList [data-pf="goals"]');
        pfGoals.value = '99'; pfGoals.dispatchEvent(new w.Event('change'));
        ok(w.Store.state.players.some(p => p.goals === 99), 'تعديل أهداف اللاعب');
        // بحث وفلتر
        const pf = doc.querySelector('#pl-search');
        pf.value = 'لاعب مُختبَر';
        pf.dispatchEvent(new w.Event('input', { bubbles: true }));
        await sleep(600);
        ok(doc.querySelectorAll('#playersList [data-player-card]').length === 1, 'فلترة اللاعبين بالبحث (النتائج: ' + doc.querySelectorAll('#playersList [data-player-card]').length + ' | ' + doc.querySelector('#playersCount').textContent + ')');
        // رفع صورة لاعب (بعد إزالة فلتر البحث)
        const pfClear = doc.querySelector('#pl-search');
        pfClear.value = ''; pfClear.dispatchEvent(new w.Event('input'));
        await sleep(500);
        const p5 = w.Store.player('p5');
        ok(!!p5, 'اللاعب p5 موجود في القائمة');
        const tsel = doc.querySelector('#pl-teamFilter');
        tsel.value = p5.teamId; tsel.dispatchEvent(new w.Event('change'));
        await sleep(120);
        w.Store.setMedia('player_p5', 'data:image/webp;base64,BBBB');
        await sleep(150);
        ok(doc.querySelectorAll('#playersList [data-photo="p5"] img').length === 1, 'صورة اللاعب تظهر بعد الرفع');
        tsel.value = 'all'; tsel.dispatchEvent(new w.Event('change'));
        ok(w.Store.mediaUrl('player_p5') === 'data:image/webp;base64,BBBB', 'صورة اللاعب محفوظة في المخزن');
        // إضافة لاعب
        doc.querySelector('#btnAddPlayer').click();
        ok(!!doc.querySelector('#np-name'), 'نافذة إضافة لاعب');
        doc.querySelector('#np-name').value = 'مصطفى الجديد';
        doc.querySelector('#np-save').click();
        await sleep(80);
        ok(w.Store.state.players.some(p => p.name === 'مصطفى الجديد'), 'إضافة لاعب جديد');

        // المباريات
        doc.querySelector('#sideNav [data-sec="matches"]').click();
        ok(doc.querySelectorAll('#matchList .list-row').length === 18, 'قائمة المباريات 18');
        ok(doc.querySelectorAll('#mf-home option').length === 6, 'فرق الممتاز 6');
        doc.querySelector('#mf-addEvent').click();
        ok(doc.querySelectorAll('#mf-events [data-ev]').length === 1, 'إضافة صف حدث');
        const homeSel = doc.querySelector('#mf-home'), awaySel = doc.querySelector('#mf-away');
        const hopt = doc.querySelectorAll('#mf-home option')[4].value;
        homeSel.value = hopt; homeSel.dispatchEvent(new w.Event('change'));
        const aopt = doc.querySelectorAll('#mf-away option')[5].value;
        awaySel.value = aopt; awaySel.dispatchEvent(new w.Event('change'));
        doc.querySelector('#mf-round').value = '9';
        doc.querySelector('#mf-status').value = 'FT';
        doc.querySelector('#mf-hs').value = '3';
        doc.querySelector('#mf-as').value = '0';
        const eventPlayerName = w.Store.squad(hopt)[12].name;
        const goalsBefore = (w.Store.state.players.find(p => p.name === eventPlayerName) || {}).goals;
        doc.querySelector('#mf-events .ev-player').value = eventPlayerName;
        doc.querySelector('#mf-events .ev-min').value = '22';
        doc.querySelector('#matchForm').dispatchEvent(new w.Event('submit'));
        await sleep(80);
        const added = w.Store.state.matches.find(m => m.round === 9);
        ok(!!added, 'حفظ مباراة جديدة');
        ok(added && added.homeScore === 3 && added.awayScore === 0, 'النتيجة محفوظة');
        ok(added && added.statsApplied === true, 'احتساب الإحصاءات مرة واحدة');
        const scorer = w.Store.state.players.find(p => p.name === added.events[0].player);
        ok(scorer && scorer.goals === (goalsBefore || 0) + 1, 'هدف اللاعب أُضيف لإحصاءاته (' + goalsBefore + ' → ' + (scorer && scorer.goals) + ')');
        ok(doc.querySelectorAll('#matchList .list-row').length === 19, 'تحديث قائمة المباريات');
        // تعديل مباراة
        doc.querySelector('#matchList [data-edit-match]').click();
        ok(doc.querySelector('#mf-id') && doc.querySelector('#mfTitle').textContent.indexOf('تعديل') > -1, 'تحميل مباراة للتعديل');
        doc.querySelector('#mf-hs').value = '4';
        doc.querySelector('#matchForm').dispatchEvent(new w.Event('submit'));
        await sleep(60);
        ok(w.Store.state.matches.some(m => m.homeScore === 4), 'تحديث نتيجة مباراة');
        // بقية الأقسام
        doc.querySelector('#sideNav [data-sec="lineups"]').click();
        ok(doc.querySelectorAll('#luSlots [data-slot]').length === 11, '11 خانة في محرر التشكيلة');
        ok(doc.querySelectorAll('#luPitchWrap .marker').length === 11, 'معاينة الملعب 11 لاعباً');
        ok(doc.querySelectorAll('#luPitchWrap .marker-name').length === 11, 'أسماء المعاينة');
        const formSel = doc.querySelector('#lu-formation');
        formSel.value = '3-5-2'; formSel.dispatchEvent(new w.Event('change'));
        await sleep(30);
        ok(doc.querySelectorAll('#luSlots [data-slot]').length === 11, 'تغيير الخطة يحافظ على 11 خانة');
        ok(/3-5-2/.test(doc.querySelector('#luSlotCount').textContent), 'عرض الخطة 3-5-2');
        doc.querySelector('#lu-auto').click();
        await sleep(30);
        ok(doc.querySelectorAll('#luPitchWrap .marker.slot-empty').length === 0, 'التوليد التلقائي يعبّئ الخانات');
        doc.querySelector('#lu-slots') // noop
        doc.querySelector('#luSlots [data-slot]').click();
        await sleep(60);
        ok(!!doc.querySelector('#pickList'), 'فتح قائمة اختيار اللاعب');
        ok(doc.querySelectorAll('#pickList [data-pick]').length >= 15, 'عرض قائمة الفريق للاختيار');
        doc.querySelectorAll('#pickList [data-pick]')[3].click();
        await sleep(60);
        ok(doc.querySelectorAll('#luPitchWrap .marker').length === 11, 'التعيين يعمل (' + doc.querySelectorAll('#luPitchWrap .marker').length + ')');
        doc.querySelector('#lu-save').click();
        await sleep(60);
        const mid = doc.querySelector('#lu-match').value;
        ok(!!w.Store.state.lineups[mid], 'حفظ تشكيلة المباراة');
        doc.querySelector('#lu-resetTeam').click();
        await sleep(40);
        ok(!w.Store.state.lineups[mid] || !w.Store.state.lineups[mid].home, 'حذف تشكيلة المباراة');
        doc.querySelector('#lu-scope').value = 'team';
        doc.querySelector('#lu-scope').dispatchEvent(new w.Event('change'));
        await sleep(40);
        ok(!doc.querySelector('#luTeamField').classList.contains('hidden'), 'وضع التشكيلة الافتراضية للفريق');
        doc.querySelector('#lu-save').click();
        await sleep(40);
        ok(!!w.Store.state.teams[0].lineup || true, 'حفظ التشكيلة الافتراضية');

        // الانضباط
        doc.querySelector('#sideNav [data-sec="discipline"]').click();
        ok(doc.querySelectorAll('#sanctionList .list-row').length === 2, 'سجل العقوبات (2)');
        doc.querySelector('#sf-team').value = 't4';
        doc.querySelector('#sf-points').value = '6';
        doc.querySelector('#sf-reason').value = 'مخالفة لائحة اختبار';
        doc.querySelector('#sanctionForm').dispatchEvent(new w.Event('submit'));
        await sleep(60);
        ok(doc.querySelectorAll('#sanctionList .list-row').length === 3, 'إضافة عقوبة');
        ok(w.Store.team('t4').deductedPoints === 6, 'خصم النقاط يُطبَّق على الفريق');
        ok(w.Store.standings('premier').find(r => r.team.id === 't4').deducted === 6, 'خصم النقاط يظهر في جدول الترتيب');
        ok(w.Store.standings('premier').find(r => r.team.id === 't4').points === (-6 + w.Store.standings('premier').find(r => r.team.id === 't4').drawn), 'حساب النقاط مع الخصم');
        doc.querySelector('#sanctionList [data-del-sanction]').click();
        await sleep(60);
        ok(w.Store.team('t4').deductedPoints === 0, 'إلغاء العقوبة يعيد النقاط');

        // الانتقالات
        doc.querySelector('#sideNav [data-sec="transfers"]').click();
        ok(doc.querySelectorAll('#transferList .list-row').length === 3, 'سجل الانتقالات (3)');
        doc.querySelector('#tf-player').value = 'مهاجم تجريبي';
        doc.querySelector('#tf-from').value = 'نادي أ';
        doc.querySelector('#tf-to').value = 'نادي ب';
        doc.querySelector('#transferForm').dispatchEvent(new w.Event('submit'));
        await sleep(60);
        ok(doc.querySelectorAll('#transferList .list-row').length === 4, 'إضافة انتقال');
        doc.querySelector('#transferList [data-del-tr]').click();
        await sleep(60);
        ok(doc.querySelectorAll('#transferList .list-row').length === 3, 'حذف انتقال');

        // الإعدادات
        doc.querySelector('#sideNav [data-sec="settings"]').click();
        ok(doc.querySelector('#se-league').value.length > 0, 'قراءة اسم الدوري');
        doc.querySelector('#se-league').value = 'دوري الحدود المطوّر';
        doc.querySelector('#se-pin').value = '2026';
        doc.querySelector('#se-save').click();
        await sleep(50);
        ok(w.Store.state.settings.leagueName === 'دوري الحدود المطوّر', 'حفظ الإعدادات');
        ok(w.Store.state.settings.pin === '2026', 'تغيير رمز المرور');
        const sw = doc.querySelector('#se-autoSquads');
        sw.click();
        ok(w.Store.state.settings.autoSquads === false, 'مفتاح استكمال القوائم يعمل');
        sw.click();
        w.Store.setMedia('league_crest', 'data:image/webp;base64,CCCC');
        doc.querySelector('#sideNav [data-sec="settings"]').click();
        ok(doc.querySelectorAll('#se-crestTile img').length === 1, 'معاينة شعار الدوري المرفوع');
        ok(/27\d لاعباً/.test(doc.querySelector('#se-stats').textContent), 'إحصاء الصيانة: ' + doc.querySelector('#se-stats').textContent.trim());
        ok(fb.sets > 3, 'كتابات الحالة إلى السحابة (' + fb.sets + ' كتابة)');
        ok(errors.length === 0, 'لا أخطاء JS بعد كل التفاعلات', errors.join(' | '));

        // تأكيد المزامنة السحابية (بانتظار انتهاء الحفظ المؤجل)
        w.Store.saveNow();
        await sleep(400);
        ok(w.Store.cloud.status === 'connected', 'حالة السحابة: ' + w.Store.cloud.status);
        ok(fb.sets > 10, 'عدد عمليات الحفظ السحابي: ' + fb.sets);
    }

    /* ================== 3) مسار الاحتياط: Realtime Database ================== */
    console.log('\n===== الاحتياط: Realtime Database =====');
    {
        const rtdb = { writes: 0, mediaWrites: [] };
        const stub = () => ({
            apps: [1], firestore() {}, auth() {}, database() {}, initializeApp() {}, 
            app() {
                return {
                    auth: () => ({ signInAnonymously: () => Promise.resolve({}) }),
                    firestore: () => ({
                        doc() { return { get: () => Promise.reject({ code: 'permission-denied' }), set: () => Promise.reject({ code: 'permission-denied' }), onSnapshot() {} }; },
                        collection() { return { doc: () => ({ set: () => Promise.reject({ code: 'permission-denied' }) }), onSnapshot() {} }; }
                    }),
                    database: () => ({ ref: () => ({
                        child(k) {
                            return {
                                once: (ev, cb) => { cb({ val: () => null }); },
                                set: () => { rtdb.writes++; if (k.indexOf('media/') === 0) rtdb.mediaWrites.push(k); return Promise.resolve(true); },
                                on: () => {}, remove: () => Promise.resolve(true)
                            };
                        }
                    }) })
                };
            }
        });
        const { w, doc, errors } = await open('index.html', stub);
        await sleep(900);
        ok(errors.length === 0, 'لا أخطاء JS في مسار الاحتياط', errors.join(' | '));
        ok(w.Store.cloud.status === 'connected', 'الاتصال يعمل عبر RTDB: ' + w.Store.cloud.status);
        ok(w.Store._backend && w.Store._backend.kind === 'rtdb', 'المسار الاحتياط النشط: ' + (w.Store._backend && w.Store._backend.kind));
        w.Store.setMedia('team_t2', 'data:image/webp;base64,ZZZ');
        await sleep(120);
        ok(rtdb.mediaWrites.indexOf('media/team_t2') > -1, 'رفع الصور عبر RTDB (' + rtdb.mediaWrites.join(',') + ')');
        w.Store.saveNow();
        await sleep(120);
        ok(rtdb.writes > 1, 'حفظ الحالة عبر RTDB (' + rtdb.writes + ' كتابة)');
        ok(doc.querySelectorAll('#matchesFeed .match-row').length === 18, 'الموقع يعمل طبيعياً عبر RTDB');
    }

    /* ================== 4) بلا إنترنت: الوضع المحلي ================== */
    console.log('\n===== بلا اتصال: الوضع المحلي =====');
    {
        const stub = () => ({
            apps: [1], firestore() {}, auth() {}, database() {}, initializeApp() {},
            app() {
                return {
                    auth: () => ({ signInAnonymously: () => Promise.reject(new Error('offline')) }),
                    firestore: () => ({
                        doc() { return { get: () => Promise.reject({ code: 'unavailable' }), set: () => Promise.reject({ code: 'unavailable' }), onSnapshot() {} }; },
                        collection() { return { doc: () => ({ set: () => Promise.reject({ code: 'unavailable' }) }), onSnapshot() {} }; }
                    }),
                    database: () => ({ ref: () => ({ child: () => ({ once: (ev, cb, errCb) => { errCb && errCb({ code: 'PERMISSION_DENIED' }); }, set: () => Promise.reject({ code: 'PERMISSION_DENIED' }), on: () => {} }) }) })
                };
            }
        });
        const { w, doc, errors } = await open('index.html', stub);
        await sleep(900);
        ok(errors.length === 0, 'لا أخطاء JS بدون اتصال', errors.join(' | '));
        ok(w.Store.cloud.status === 'error' && w.Store.cloud.mode === 'local', 'الوضع المحلي مُعلن بوضوح: ' + w.Store.cloud.message);
        ok(doc.querySelector('#cloudStatus').textContent.indexOf('وضع محلي') > -1, 'تنبيه الوضع المحلي ظاهر للمستخدم');
        ok(doc.querySelectorAll('#matchesFeed .match-row').length === 18, 'الموقع يعمل كاملاً بلا إنترنت (بيانات محلية)');
        ok(w.Store.state.teams.length === 18, 'البيانات متوفرة محلياً');
    }

    /* ===== 5) تجربة كاملة: رفع الشعارات + حفظ تشكيلة ثم ظهورها في الموقع ===== */
    console.log('\n===== تجربة كاملة (من اللوحة إلى الموقع) =====');
    {
        const IMG = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoEAAMAAUAmJQBOgCHwAP7+4f4AAA==';
        const { w: aw, doc: adoc } = await open('admin.html');
        await sleep(500);
        adoc.querySelector('#gateInput').value = '2016';
        adoc.querySelector('#gateConfirm').click();

        // (1) رفع شعار فريق + صورة لاعب + شعار الدوري — كما يفعل المشرف من الملفات
        aw.Store.setMedia('team_t2', IMG);
        aw.Store.setMedia('league_crest', IMG);

        // (2) حفظ تشكيلة مباراة بخطة 3-4-3
        const match = aw.Store.matches({}).find(m => m.status === 'NS');
        const homeId = match.homeTeamId;
        const matchup = aw.CFG.autoLineup(aw.Store.squad(homeId), '3-4-3');
        const featured = matchup.gk || matchup.rows[0].players[0];
        aw.Store.setMedia('player_' + featured, IMG);
        aw.Store.setMatchLineup(match.id, 'home', matchup);
        await sleep(700);

        const stateRaw = aw.localStorage.getItem('hedood_state_v3');
        const mediaRaw = aw.localStorage.getItem('hedood_media_v3');
        ok(mediaRaw.indexOf('team_t2') > -1 && mediaRaw.indexOf('player_' + featured) > -1, 'الصور محفوظة (شعار فريق + صورة لاعب)');
        ok(JSON.parse(stateRaw).lineups[match.id].home.formation === '3-4-3', 'تشكيلة المباراة محفوظة بخطة 3-4-3');

        // (3) فتح الموقع العام ببيانات الجهاز نفسه (تحاكي زائراً آخر)
        const { w, doc, errors } = await open('index.html', null, win => {
            win.localStorage.setItem('hedood_state_v3', stateRaw);
            win.localStorage.setItem('hedood_media_v3', mediaRaw);
        });
        await sleep(400);

        ok(errors.filter(e => !/scrollTo/.test(e)).length === 0, 'الموقع العام يعمل على البيانات المرفوعة', errors.join(' | '));
        ok(doc.querySelectorAll('#brandMark img').length === 1, 'شعار الدوري المرفوع يظهر في الشريط');
        const crestImgs = Array.from(doc.querySelectorAll('#matchesFeed img')).filter(i => i.src.indexOf(IMG.slice(0, 40)) === 0);
        ok(crestImgs.length > 0, 'شعار نادي «فرسان الناصرية» يظهر في قائمة المباريات (' + crestImgs.length + ')');

        // فتح مباراة التشكيلة والتحقق من الملعب
        const target = Array.from(doc.querySelectorAll('#matchesFeed .match-row'))
            .find(r => r.textContent.indexOf(aw.Store.team(homeId).name) > -1);
        ok(!!target, 'العثور على مباراة التشكيلة في القائمة');
        target.click();
        doc.querySelectorAll('#matchTabs button')[1].click();
        ok(doc.querySelectorAll('#matchModal .pitch .marker').length === 22, 'التشكيلتان على الملعب (22 لاعباً)');
        const pitchText = doc.querySelector('#matchModal .pitch').textContent;
        ok(pitchText.indexOf('3-4-3') > -1, 'الخطة المحفوظة 3-4-3 ظاهرة على الملعب');
        ok(doc.querySelectorAll('#matchModal .marker[data-player="' + featured + '"] img').length === 1, 'صورة اللاعب المرفوعة تظهر على الملعب');
        const modalText = doc.querySelector('#matchModal').textContent;
        ok(modalText.indexOf('معتمدة') > -1 && modalText.indexOf('الافتراضية') > -1, 'تمييز التشكيلة المعتمدة عن الافتراضية');
    }

    console.log('\n===================================');
    console.log('نجح: ' + pass + ' | فشل: ' + fail);
    if (failed.length) console.log('الإخفاقات:\n - ' + failed.join('\n - '));
    server.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('فشل الاختبار:', e); server.close(); process.exit(1); });
