/* ==========================================================================
   config.js — إعدادات التطبيق + البيانات الأولية (Seed)
   دوري الحدود الرياضي — نسخة 2026
   ========================================================================== */
(function () {
    'use strict';

    /* ----------------------- إعدادات Firebase (كما هي) --------------------- */
    const FIREBASE_CONFIG = {
        apiKey: 'AIzaSyB5VmaG9Yxe2tf_vNAjJoEzm-Io03RdUag',
        authDomain: 'dore1-a5374.firebaseapp.com',
        databaseURL: 'https://dore1-a5374-default-rtdb.firebaseio.com',
        projectId: 'dore1-a5374',
        storageBucket: 'dore1-a5374.firebasestorage.app',
        messagingSenderId: '11041483354',
        appId: '1:11041483354:web:4ac82b24b1a1d8e6730663',
        measurementId: 'G-G03M2RH7VH'
    };

    const APP_ID = (typeof window.__app_id !== 'undefined' && window.__app_id) ? window.__app_id : 'dore1-a5374';
    const ROOT = 'artifacts/' + APP_ID + '/public/data';
    const STATE_DOC = 'score365_hedood_state';
    const SCHEMA = 3;

    /* ------------------------------- التقسيمات ---------------------------- */
    const DIVISIONS = {
        premier: { id: 'premier', name: 'دوري الحدود الممتاز', short: 'الممتاز', accent: '#f7c14b' },
        first: { id: 'first', name: 'دوري الدرجة الأولى', short: 'الأولى', accent: '#2fd4f0' },
        second: { id: 'second', name: 'دوري الدرجة الثانية', short: 'الثانية', accent: '#a78bfa' },
        third: { id: 'third', name: 'دوري الدرجة الثالثة', short: 'الثالثة', accent: '#34d399' }
    };

    /* --------------------------------- الفرق ------------------------------ */
    const TEAMS = [
        { id: 't1', division: 'premier', name: 'شباب الحدود', color: '#2563eb', accent: '#60a5fa', coach: 'كابتن رائد نايف', founded: 2016, stadium: 'ملعب الحدود الرئيسي', deductedPoints: 0, penaltyReason: '' },
        { id: 't2', division: 'premier', name: 'فرسان الناصرية', color: '#059669', accent: '#34d399', coach: 'كابتن هيثم كاظم', founded: 2014, stadium: 'ملعب الفرسان', deductedPoints: 0, penaltyReason: '' },
        { id: 't3', division: 'premier', name: 'صقور سومر', color: '#dc2626', accent: '#fb7185', coach: 'كابتن عادل جواد', founded: 2012, stadium: 'ملعب سومر الترابي', deductedPoints: 3, penaltyReason: 'خصم 3 نقاط لإشراك لاعب معاقب' },
        { id: 't4', division: 'premier', name: 'أسود الرافدين', color: '#d97706', accent: '#fbbf24', coach: 'كابتن ضياء رشيد', founded: 2011, stadium: 'ملعب الرافدين', deductedPoints: 0, penaltyReason: '' },
        { id: 't5', division: 'premier', name: 'نجوم أور', color: '#7c3aed', accent: '#a78bfa', coach: 'كابتن ميثم عزيز', founded: 2015, stadium: 'ملعب أور الأثري', deductedPoints: 0, penaltyReason: '' },
        { id: 't6', division: 'premier', name: 'أهلي الفرات', color: '#0891b2', accent: '#22d3ee', coach: 'كابتن سعدون طاهر', founded: 2013, stadium: 'ملعب الفرات', deductedPoints: 0, penaltyReason: '' },
        { id: 't7', division: 'first', name: 'شعلة الغراف', color: '#ea580c', accent: '#fb923c', coach: 'كابتن حميد رسن', founded: 2017, stadium: 'ملعب الشعلة', deductedPoints: 0, penaltyReason: '' },
        { id: 't8', division: 'first', name: 'اتحاد البطحاء', color: '#16a34a', accent: '#4ade80', coach: 'كابتن قحطان ناصر', founded: 2015, stadium: 'ملعب البطحاء', deductedPoints: 0, penaltyReason: '' },
        { id: 't9', division: 'first', name: 'وفاق الرفاعي', color: '#2563eb', accent: '#93c5fd', coach: 'كابتن صادق نعيم', founded: 2018, stadium: 'ملعب الوفاق', deductedPoints: 1, penaltyReason: 'خصم نقطة بسبب غياب إداري' },
        { id: 't10', division: 'first', name: 'تضامن الشطرة', color: '#be123c', accent: '#fb7185', coach: 'كابتن سلام شاكر', founded: 2016, stadium: 'ملعب التضامن', deductedPoints: 0, penaltyReason: '' },
        { id: 't11', division: 'second', name: 'أمل سوق الشيوخ', color: '#4f46e5', accent: '#818cf8', coach: 'كابتن كريم فرحان', founded: 2019, stadium: 'ملعب الأمل', deductedPoints: 0, penaltyReason: '' },
        { id: 't12', division: 'second', name: 'رواد الفهود', color: '#0d9488', accent: '#2dd4bf', coach: 'كابتن فالح حسن', founded: 2017, stadium: 'ملعب الفهود', deductedPoints: 0, penaltyReason: '' },
        { id: 't13', division: 'second', name: 'بركان الجبايش', color: '#9f1239', accent: '#fb7185', coach: 'كابتن مؤيد هاشم', founded: 2018, stadium: 'ملعب الجبايش', deductedPoints: 0, penaltyReason: '' },
        { id: 't14', division: 'second', name: 'نجوم الإسكان', color: '#ca8a04', accent: '#facc15', coach: 'كابتن منعم علي', founded: 2020, stadium: 'ملعب الإسكان', deductedPoints: 0, penaltyReason: '' },
        { id: 't15', division: 'third', name: 'براعم المستقبل', color: '#15803d', accent: '#4ade80', coach: 'كابتن عدي سلمان', founded: 2021, stadium: 'ملعب البراعم', deductedPoints: 0, penaltyReason: '' },
        { id: 't16', division: 'third', name: 'شباب الإدارة المحلية', color: '#1d4ed8', accent: '#60a5fa', coach: 'كابتن جاسم محمد', founded: 2019, stadium: 'ملعب الإدارة المحلية', deductedPoints: 0, penaltyReason: '' },
        { id: 't17', division: 'third', name: 'أكاديمية الفرسان', color: '#9333ea', accent: '#c084fc', coach: 'كابتن سامر فلاح', founded: 2020, stadium: 'ملعب الأكاديمية', deductedPoints: 0, penaltyReason: '' },
        { id: 't18', division: 'third', name: 'شروق ذي قار', color: '#c026d3', accent: '#e879f9', coach: 'كابتن هادي راضي', founded: 2018, stadium: 'ملعب الشروق', deductedPoints: 0, penaltyReason: '' }
    ];

    /* --------- اللاعبون الأساسيون (يُستكملون تلقائياً بقوائم كاملة) -------- */
    const CORE_PLAYERS = [
        { id: 'p1', teamId: 't1', name: 'كرار حميد', number: 1, pos: 'حارس مرمى', role: 'GK', goals: 0, assists: 0, yellowCards: 1, redCards: 0, rating: 7.4 },
        { id: 'p2', teamId: 't1', name: 'سجاد علي', number: 4, pos: 'قلب دفاع', role: 'DF', goals: 1, assists: 0, yellowCards: 3, redCards: 0, rating: 6.8 },
        { id: 'p3', teamId: 't1', name: 'حسين جواد', number: 3, pos: 'مدافع أيسر', role: 'DF', goals: 0, assists: 2, yellowCards: 0, redCards: 0, rating: 7.1 },
        { id: 'p4', teamId: 't1', name: 'ضرغام فهد', number: 8, pos: 'لاعب وسط', role: 'MF', goals: 3, assists: 5, yellowCards: 2, redCards: 0, rating: 7.9 },
        { id: 'p5', teamId: 't1', name: 'علي نجم', number: 10, pos: 'مهاجم صريح', role: 'FW', goals: 7, assists: 4, yellowCards: 0, redCards: 0, rating: 8.5, captain: true },
        { id: 'p6', teamId: 't1', name: 'مصطفى كريم', number: 9, pos: 'رأس حربة', role: 'FW', goals: 6, assists: 1, yellowCards: 1, redCards: 0, rating: 8.1 },
        { id: 'p7', teamId: 't2', name: 'أحمد ماجد', number: 1, pos: 'حارس مرمى', role: 'GK', goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 7.2 },
        { id: 'p8', teamId: 't2', name: 'مرتضى سعد', number: 5, pos: 'قلب دفاع', role: 'DF', goals: 0, assists: 0, yellowCards: 0, redCards: 1, rating: 5.5 },
        { id: 'p9', teamId: 't2', name: 'باقر رحيم', number: 7, pos: 'جناح أيمن', role: 'FW', goals: 5, assists: 3, yellowCards: 1, redCards: 0, rating: 7.8 },
        { id: 'p10', teamId: 't2', name: 'حيدر صباح', number: 9, pos: 'مهاجم صريح', role: 'FW', goals: 8, assists: 2, yellowCards: 1, redCards: 0, rating: 8.4 },
        { id: 'p11', teamId: 't3', name: 'عباس فاضل', number: 10, pos: 'صانع ألعاب', role: 'MF', goals: 4, assists: 6, yellowCards: 3, redCards: 0, rating: 8.2 },
        { id: 'p12', teamId: 't3', name: 'ليث كامل', number: 9, pos: 'مهاجم صريح', role: 'FW', goals: 5, assists: 1, yellowCards: 0, redCards: 0, rating: 7.6 },
        { id: 'p13', teamId: 't3', name: 'ياسر عمار', number: 11, pos: 'جناح أيسر', role: 'FW', goals: 4, assists: 3, yellowCards: 0, redCards: 0, rating: 7.5 }
    ];

    /* --------------------------------- المباريات -------------------------- */
    const MATCHES = [
        {
            id: 'm1', division: 'premier', round: 3, homeTeamId: 't1', awayTeamId: 't2',
            homeScore: 3, awayScore: 2, time: '09:45 م', status: 'FT', venue: 'ملعب الحدود الرئيسي',
            date: '2026-09-26', attendance: 2400,
            events: [
                { min: 14, type: 'goal', player: 'علي نجم', teamId: 't1' },
                { min: 38, type: 'yellow', player: 'ضرغام فهد', teamId: 't1' },
                { min: 45, type: 'goal', player: 'حيدر صباح', teamId: 't2' },
                { min: 62, type: 'red', player: 'مرتضى سعد', teamId: 't2' },
                { min: 78, type: 'goal', player: 'مصطفى كريم', teamId: 't1' },
                { min: 89, type: 'goal', player: 'باقر رحيم', teamId: 't2' }
            ]
        },
        {
            id: 'm2', division: 'premier', round: 3, homeTeamId: 't3', awayTeamId: 't4',
            homeScore: 1, awayScore: 1, time: '09:45 م', status: 'FT', venue: 'ملعب سومر الترابي',
            date: '2026-09-26', events: [
                { min: 23, type: 'goal', player: 'عباس فاضل', teamId: 't3' },
                { min: 85, type: 'goal', player: 'ياسر عمار', teamId: 't4' },
                { min: 89, type: 'yellow', player: 'عباس فاضل', teamId: 't3' }
            ]
        },
        {
            id: 'm3', division: 'premier', round: 4, homeTeamId: 't5', awayTeamId: 't6',
            homeScore: 2, awayScore: 0, time: '09:45 م', status: 'FT', venue: 'ملعب الإدارة المحلية',
            date: '2026-10-01', events: []
        },
        {
            id: 'm4', division: 'first', round: 3, homeTeamId: 't7', awayTeamId: 't8',
            homeScore: 2, awayScore: 1, time: '09:30 م', status: 'FT', venue: 'ملعب الشعلة',
            date: '2026-09-27', events: []
        },
        {
            id: 'm5', division: 'second', round: 3, homeTeamId: 't11', awayTeamId: 't12',
            homeScore: 1, awayScore: 0, time: '07:00 م', status: 'FT', venue: 'ملعب الفهود',
            date: '2026-09-27', events: []
        },
        {
            id: 'm6', division: 'third', round: 3, homeTeamId: 't15', awayTeamId: 't16',
            homeScore: 0, awayScore: 0, time: '04:30 م', status: 'FT', venue: 'ملعب البراعم',
            date: '2026-09-27', events: []
        },
        {
            id: 'm7', division: 'premier', round: 4, homeTeamId: 't1', awayTeamId: 't3',
            homeScore: 1, awayScore: 0, time: '09:00 م', status: 'LIVE', minute: 67,
            venue: 'ملعب الحدود الرئيسي', date: '2026-10-05',
            events: [{ min: 52, type: 'goal', player: 'علي نجم', teamId: 't1' }]
        },
        {
            id: 'm8', division: 'premier', round: 4, homeTeamId: 't2', awayTeamId: 't5',
            homeScore: 0, awayScore: 0, time: '07:15 م', status: 'LIVE', minute: 31,
            venue: 'ملعب الفرسان', date: '2026-10-05', events: []
        },
        {
            id: 'm9', division: 'premier', round: 4, homeTeamId: 't4', awayTeamId: 't6',
            homeScore: 0, awayScore: 0, time: '09:45 م', status: 'NS', venue: 'ملعب الرافدين الرئيسي',
            date: '2026-10-05', events: []
        },
        {
            id: 'm10', division: 'first', round: 4, homeTeamId: 't9', awayTeamId: 't10',
            homeScore: 0, awayScore: 0, time: '08:30 م', status: 'NS', venue: 'ملعب الوفاق',
            date: '2026-10-05', events: []
        },
        {
            id: 'm11', division: 'first', round: 4, homeTeamId: 't8', awayTeamId: 't7',
            homeScore: 0, awayScore: 0, time: '06:45 م', status: 'NS', venue: 'ملعب البطحاء',
            date: '2026-10-06', events: []
        },
        {
            id: 'm12', division: 'second', round: 4, homeTeamId: 't13', awayTeamId: 't14',
            homeScore: 0, awayScore: 0, time: '07:30 م', status: 'NS', venue: 'ملعب الجبايش',
            date: '2026-10-06', events: []
        },
        {
            id: 'm13', division: 'second', round: 4, homeTeamId: 't12', awayTeamId: 't11',
            homeScore: 0, awayScore: 0, time: '05:15 م', status: 'NS', venue: 'ملعب الفهود',
            date: '2026-10-07', events: []
        },
        {
            id: 'm14', division: 'third', round: 4, homeTeamId: 't17', awayTeamId: 't18',
            homeScore: 0, awayScore: 0, time: '04:00 م', status: 'NS', venue: 'ملعب الأكاديمية',
            date: '2026-10-07', events: []
        },
        {
            id: 'm15', division: 'third', round: 4, homeTeamId: 't16', awayTeamId: 't15',
            homeScore: 0, awayScore: 0, time: '04:00 م', status: 'NS', venue: 'ملعب الإدارة المحلية',
            date: '2026-10-08', events: []
        },
        {
            id: 'm16', division: 'premier', round: 5, homeTeamId: 't6', awayTeamId: 't1',
            homeScore: 0, awayScore: 0, time: '09:45 م', status: 'NS', venue: 'ملعب الفرات',
            date: '2026-10-12', events: []
        },
        {
            id: 'm17', division: 'premier', round: 5, homeTeamId: 't3', awayTeamId: 't5',
            homeScore: 0, awayScore: 0, time: '09:45 م', status: 'NS', venue: 'ملعب سومر الترابي',
            date: '2026-10-12', events: []
        },
        {
            id: 'm18', division: 'first', round: 5, homeTeamId: 't10', awayTeamId: 't7',
            homeScore: 0, awayScore: 0, time: '08:00 م', status: 'NS', venue: 'ملعب التضامن',
            date: '2026-10-13', events: []
        }
    ];

    /* -------------------------- الانتقالات والعقوبات ---------------------- */
    const TRANSFERS = [
        { id: 'tr1', playerName: 'حيدر صباح', type: 'transfer', from: 'صقور سومر', to: 'فرسان الناصرية', date: '2026-09-28', note: 'صفقة انتقال حر بعقد لموسم كامل', fee: 'انتقال حر' },
        { id: 'tr2', playerName: 'الكابتن رائد الشاوي', type: 'retirement', from: 'شباب الحدود', to: 'نهاية المسيرة الكروية', date: '2026-09-20', note: 'إعلان اعتزال وتكريم رسمي من الهيئة الإدارية لدوري الحدود', fee: '—' },
        { id: 'tr3', playerName: 'مؤمل جبر', type: 'transfer', from: 'نجوم الإسكان', to: 'أهلي الفرات', date: '2026-09-18', note: 'انتقال مقابل مبلغ رمزي + لاعب مقابل', fee: 'مقابل رمزي' }
    ];

    const SANCTIONS = [
        { id: 'sn1', teamId: 't3', points: 3, reason: 'خصم 3 نقاط لإشراك لاعب معاقب إدارياً', date: '2026-09-25' },
        { id: 'sn2', teamId: 't9', points: 1, reason: 'خصم نقطة بسبب غياب إداري في الاجتماع الفني', date: '2026-09-22' }
    ];

    /* ------------------------------- الإعدادات ---------------------------- */
    const SETTINGS = {
        leagueName: 'دوري الحدود الرياضي',
        season: 'موسم 2026',
        seasonShort: '2026',
        tagline: 'البطولة الرسمية لمنتخبات وأندية الحدود الشعبية — تغطية مباشرة لكافة الدرجات الأربع',
        organizer: 'الهيئة الإدارية لدوري الحدود — ذي قار',
        pin: '2016',
        autoSquads: true,
        odds: { home: 1.45, draw: 3.2, away: 4.8 }
    };

    /* --------------------- التقسيمات: التشكيلات الجاهزة ------------------- */
    const FORMATIONS = {
        '4-3-3': { name: '4-3-3', rows: [{ role: 'DF', count: 4 }, { role: 'MF', count: 3 }, { role: 'FW', count: 3 }] },
        '4-4-2': { name: '4-4-2', rows: [{ role: 'DF', count: 4 }, { role: 'MF', count: 4 }, { role: 'FW', count: 2 }] },
        '4-2-3-1': { name: '4-2-3-1', rows: [{ role: 'DF', count: 4 }, { role: 'MF', count: 2 }, { role: 'MF', count: 3 }, { role: 'FW', count: 1 }] },
        '3-5-2': { name: '3-5-2', rows: [{ role: 'DF', count: 3 }, { role: 'MF', count: 5 }, { role: 'FW', count: 2 }] },
        '3-4-3': { name: '3-4-3', rows: [{ role: 'DF', count: 3 }, { role: 'MF', count: 4 }, { role: 'FW', count: 3 }] },
        '5-3-2': { name: '5-3-2', rows: [{ role: 'DF', count: 5 }, { role: 'MF', count: 3 }, { role: 'FW', count: 2 }] },
        '4-1-4-1': { name: '4-1-4-1', rows: [{ role: 'DF', count: 4 }, { role: 'MF', count: 1 }, { role: 'MF', count: 4 }, { role: 'FW', count: 1 }] }
    };
    const FORMATION_KEYS = Object.keys(FORMATIONS);

    const ROLE_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };
    const ROLE_LABEL = { GK: 'حراس المرمى', DF: 'المدافعون', MF: 'لاعبو الوسط', FW: 'المهاجمون' };
    const ROLE_SHORT = { GK: 'حارس', DF: 'دفاع', MF: 'وسط', FW: 'هجوم' };

    /* ---------------------- مولّد أسماء القوائم الكاملة ------------------- */
    const FIRST = ['علي', 'حسين', 'كرار', 'مصطفى', 'حيدر', 'أحمد', 'مرتضى', 'باقر', 'ضرغام', 'سجاد', 'عباس', 'ليث', 'ياسر', 'أمير', 'مؤمل', 'نزار', 'سلام', 'جاسم', 'رعد', 'فاضل', 'أنور', 'وسام', 'عمار', 'هيثم', 'صفاء', 'منتظر', 'أيوب', 'إبراهيم', 'محمود', 'قاسم', 'طه', 'زيد', 'يوسف', 'أكرم', 'باسم', 'كريم', 'نبيل', 'عماد', 'حمزة', 'رضا'];
    const LAST = ['حميد', 'علي', 'جواد', 'فهد', 'نجم', 'كريم', 'ماجد', 'سعد', 'رحيم', 'صباح', 'فاضل', 'كامل', 'عمار', 'نعمة', 'رشيد', 'عزيز', 'طاهر', 'رسن', 'ناصر', 'نعيم', 'شاكر', 'فرحان', 'حسن', 'هاشم', 'منعم', 'سلمان', 'محمد', 'فلاح', 'راضي', 'عبدالله', 'خضير', 'جبر', 'مهدي', 'نصيف', 'هادي', 'وادي', 'زامل', 'ثامر', 'غانم', 'عبدالزهرة'];

    const SLOTS = [
        { role: 'GK', pos: 'حارس مرمى', number: 1 },
        { role: 'GK', pos: 'حارس احتياطي', number: 22 },
        { role: 'DF', pos: 'قلب دفاع', number: 4 },
        { role: 'DF', pos: 'قلب دفاع', number: 5 },
        { role: 'DF', pos: 'مدافع أيمن', number: 2 },
        { role: 'DF', pos: 'مدافع أيسر', number: 3 },
        { role: 'DF', pos: 'ظهير أيمن', number: 13 },
        { role: 'MF', pos: 'وسط مدافع', number: 6 },
        { role: 'MF', pos: 'لاعب وسط', number: 8 },
        { role: 'MF', pos: 'صانع ألعاب', number: 10 },
        { role: 'MF', pos: 'جناح أيمن', number: 7 },
        { role: 'MF', pos: 'جناح أيسر', number: 11 },
        { role: 'FW', pos: 'مهاجم صريح', number: 9 },
        { role: 'FW', pos: 'رأس حربة', number: 19 },
        { role: 'FW', pos: 'جناح مهاجم', number: 17 }
    ];

    /* مولّد أرقام عشوائية ثابت (نفس النتيجة كل مرة) */
    function rng(seedStr) {
        let h = 2166136261;
        for (let i = 0; i < seedStr.length; i++) {
            h ^= seedStr.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return function () {
            h += 0x6d2b79f5;
            let t = h;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /** يبني لاعباً واحداً بشكل ثابت (نفس الـ id ونفس الاسم دائماً) */
    function generatedPlayer(teamId, idx, usedNames) {
        const r = rng('hedood-' + teamId + '-' + idx);
        let tries = 0;
        let name = '';
        do {
            const f = FIRST[Math.floor(r() * FIRST.length)];
            const l = LAST[Math.floor(r() * LAST.length)];
            name = f + ' ' + l;
            tries++;
        } while (usedNames && usedNames.has(name) && tries < 24);
        const slot = SLOTS[idx % SLOTS.length];
        const role = slot.role;
        const goals = role === 'FW' ? Math.floor(r() * 7) : (role === 'MF' ? Math.floor(r() * 4) : (role === 'DF' ? Math.floor(r() * 2) : 0));
        const assists = role === 'GK' ? 0 : Math.floor(r() * 5);
        const yc = Math.floor(r() * 4);
        const rc = r() > 0.9 ? 1 : 0;
        const rating = Math.round((6.4 + r() * 2.2) * 10) / 10;
        return {
            id: 'g_' + teamId + '_' + idx,
            teamId: teamId,
            name: name,
            number: slot.number + (idx >= SLOTS.length ? 1 : 0),
            pos: slot.pos,
            role: role,
            goals: goals,
            assists: assists,
            yellowCards: yc,
            redCards: rc,
            rating: rating,
            appearances: 3 + Math.floor(r() * 4),
            generated: true
        };
    }

    /** يضمن وجود قائمة كاملة (15 لاعباً) لكل فريق بدون المساس بالبيانات المُدخلة يدوياً */
    function ensureSquads(state) {
        if (!state || !Array.isArray(state.players) || !Array.isArray(state.teams)) return false;
        let changed = false;
        const ids = new Set(state.players.map(p => p.id));

        state.teams.forEach(team => {
            for (let i = 0; i < SLOTS.length; i++) {
                const id = 'g_' + team.id + '_' + i;
                if (ids.has(id)) continue;
                const squad = state.players.filter(p => p.teamId === team.id);
                if (squad.length >= SLOTS.length) break;
                const used = new Set(squad.map(p => p.name));
                const pl = generatedPlayer(team.id, i, used);
                if (used.has(pl.name)) {
                    // ضمان عدم تكرار الأسماء داخل الفريق نفسه
                    const alt = FIRST[(i * 7 + 11) % FIRST.length] + ' ' + LAST[(i * 5 + 3) % LAST.length];
                    pl.name = used.has(alt) ? alt + ' ' + (squad.length + 1) : alt;
                }
                state.players.push(pl);
                ids.add(id);
                changed = true;
            }
        });
        return changed;
    }

    function idxFallback(i) {
        return Math.abs(i) % 3;
    }

    function seedData() {        const data = {
            schema: SCHEMA,
            divisions: JSON.parse(JSON.stringify(DIVISIONS)),
            teams: JSON.parse(JSON.stringify(TEAMS)),
            players: JSON.parse(JSON.stringify(CORE_PLAYERS)),
            matches: JSON.parse(JSON.stringify(MATCHES)),
            transfers: JSON.parse(JSON.stringify(TRANSFERS)),
            sanctions: JSON.parse(JSON.stringify(SANCTIONS)),
            lineups: {},
            settings: JSON.parse(JSON.stringify(SETTINGS)),
            updatedAt: new Date().toISOString()
        };
        ensureSquads(data);
        return data;
    }

    /** دمج آمن: يضمن وجود كل الحقول الجديدة عند تحميل بيانات قديمة من السحابة */
    function normalizeState(state) {
        const seed = {
            schema: SCHEMA,
            divisions: DIVISIONS,
            settings: SETTINGS
        };
        const out = state && typeof state === 'object' ? state : {};
        if (!out.divisions || !out.divisions.premier) out.divisions = seed.divisions;
        if (!out.settings || typeof out.settings !== 'object') out.settings = JSON.parse(JSON.stringify(seed.settings));
        if (!out.settings.pin) out.settings.pin = '2016';
        if (out.settings.autoSquads === undefined) out.settings.autoSquads = true;
        if (!Array.isArray(out.teams)) out.teams = JSON.parse(JSON.stringify(TEAMS));
        if (!Array.isArray(out.players)) out.players = [];
        if (!Array.isArray(out.matches)) out.matches = [];
        if (!Array.isArray(out.transfers)) out.transfers = [];
        if (!Array.isArray(out.sanctions)) out.sanctions = [];
        if (!out.lineups || typeof out.lineups !== 'object') out.lineups = {};
        // استكمال الحقول الناقصة للفرق
        out.teams.forEach((t, i) => {
            const ref = TEAMS.find(x => x.id === t.id) || TEAMS[i % TEAMS.length];
            if (t.division === undefined) t.division = ref.division;
            if (!t.color) t.color = ref.color;
            if (!t.accent) t.accent = ref.accent;
            if (t.deductedPoints === undefined) t.deductedPoints = 0;
            if (t.penaltyReason === undefined) t.penaltyReason = '';
            if (!t.stadium) t.stadium = ref.stadium || '';
        });
        // استكمال الحقول الناقصة للاعبين
        out.players.forEach(p => {
            if (p.yellowCards === undefined) p.yellowCards = 0;
            if (p.redCards === undefined) p.redCards = 0;
            if (p.goals === undefined) p.goals = 0;
            if (p.assists === undefined) p.assists = 0;
            if (!p.role) p.role = roleFromPos(p.pos);
        });
        if (out.settings.autoSquads !== false) ensureSquads(out);
        out.schema = SCHEMA;
        return out;
    }

    function roleFromPos(pos) {
        if (!pos) return 'MF';
        if (pos.indexOf('حارس') > -1) return 'GK';
        if (pos.indexOf('دفاع') > -1 || pos.indexOf('ظهير') > -1) return 'DF';
        if (pos.indexOf('وسط') > -1 || pos.indexOf('صانع') > -1 || pos.indexOf('جناح') > -1) return 'MF';
        return 'FW';
    }

    /* ---------------------- تشكيلة افتراضية تلقائية --------------------- */
    function autoLineup(squad, formationKey) {
        const f = FORMATIONS[formationKey] || FORMATIONS['4-3-3'];
        const used = {};
        const pick = { GK: [], DF: [], MF: [], FW: [] };
        squad.slice().sort((a, b) => (a.number || 99) - (b.number || 99)).forEach(p => {
            const r = p.role || roleFromPos(p.pos);
            (pick[r] || pick.MF).push(p.id);
        });
        const gk = pick.GK.shift() || (squad[0] && squad[0].id) || null;
        const rows = f.rows.map(row => {
            const out = [];
            for (let i = 0; i < row.count; i++) {
                let id = (pick[row.role] || []).shift();
                if (!id) {
                    // خذ أي لاعب متاح
                    const all = Object.keys(pick).reduce((acc, k) => acc.concat(pick[k]), []);
                    id = all.shift() || null;
                    if (id) {
                        Object.keys(pick).forEach(k => {
                            const ix = pick[k].indexOf(id);
                            if (ix > -1) pick[k].splice(ix, 1);
                        });
                    }
                }
                out.push(id && !used[id] ? (used[id] = true, id) : null);
            }
            return { role: row.role, players: out };
        });
        // أحياناً يتكرر نفس اللاعب بسبب قلة العدد → نظّف التكرار
        const seen = {};
        rows.forEach(r => r.players.forEach((id, i) => {
            if (!id || seen[id]) r.players[i] = null;
            else seen[id] = true;
        }));
        return { formation: f.name, gk: gk, rows: rows };
    }

    window.CFG = {
        FIREBASE_CONFIG: FIREBASE_CONFIG,
        APP_ID: APP_ID,
        ROOT: ROOT,
        STATE_DOC: STATE_DOC,
        SCHEMA: SCHEMA,
        DIVISIONS: DIVISIONS,
        TEAMS: TEAMS,
        MATCHES: MATCHES,
        SETTINGS: SETTINGS,
        FORMATIONS: FORMATIONS,
        FORMATION_KEYS: FORMATION_KEYS,
        ROLE_ORDER: ROLE_ORDER,
        ROLE_LABEL: ROLE_LABEL,
        ROLE_SHORT: ROLE_SHORT,
        SLOTS: SLOTS,
        rng: rng,
        seedData: seedData,
        normalizeState: normalizeState,
        ensureSquads: ensureSquads,
        roleFromPos: roleFromPos,
        autoLineup: autoLineup
    };
})();
