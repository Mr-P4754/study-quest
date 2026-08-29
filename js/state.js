// ==========================================
// js/state.js (マスター定数・ゲーム状態管理)
// ==========================================

export const API_URL = 'https://script.google.com/macros/s/AKfycbyG3MnjSn1D1flR3-LR1AzfoijF_ID7GJzZ1d5gYgemZd504kGwou02cV-M8c8kfJwi/exec';

// Settings & Constants
export const RARITY_CAPS = { 'N': 5, 'R': 10, 'SR': 15, 'SSR': 20, 'UR': 30 };
export const EVO_COST_XP = { 'N': 10000, 'R': 50000, 'SR': 200000, 'SSR': 500000 };
export const EVO_STOCK_REQ = 10;
export const REBORN_COST_XP = 100000;
export const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];
export const SKILL_TYPES = ['ATK', 'TIME', 'EXP'];

export const LV_BONUS_RATE = 0.01;
export const EXP_REQ = 100;
export const MAT_EXP = { 'N': 25, 'R': 50, 'SR': 100, 'SSR': 200, 'UR': 500 };
export const SELL_PRICES = { 'N': 250, 'R': 500, 'SR': 1000, 'SSR': 2000, 'UR': 5000 };
export const LOGIN_BONUS_EXP = 30000;
export const MAX_ITEM_LEVEL = 10;
export const MASTER_COUNT = 10;

export const TITLES = [
    { id:'t01', name:'三日坊主卒業', req:'loginDays>=3', val:3, reward:30000, desc:'通算3日プレイ' },
    { id:'t02', name:'一週間の奇跡', req:'loginDays>=7', val:7, reward:50000, desc:'通算7日プレイ' },
    { id:'t03', name:'習慣化の達人', req:'loginDays>=14', val:14, reward:100000, desc:'通算14日プレイ' },
    { id:'t04', name:'月間MVP', req:'loginDays>=30', val:30, reward:300000, desc:'通算30日プレイ' },
    { id:'t05', name:'季節を超えて', req:'loginDays>=100', val:100, reward:1000000, desc:'通算100日プレイ' },
    { id:'t06', name:'伝説の常連', req:'loginDays>=365', val:365, reward:5000000, desc:'通算365日プレイ' },
    { id:'t07', name:'ビギナー', req:'totalKill>=5', val:5, reward:30000, desc:'累計5体撃破' },
    { id:'t08', name:'エース', req:'totalKill>=20', val:20, reward:50000, desc:'累計20体撃破' },
    { id:'t09', name:'ベテラン', req:'totalKill>=50', val:50, reward:100000, desc:'累計50体撃破' },
    { id:'t10', name:'ヒーロー', req:'totalKill>=100', val:100, reward:300000, desc:'累計100体撃破' },
    { id:'t11', name:'破壊神', req:'totalKill>=500', val:500, reward:1000000, desc:'累計500体撃破' },
    { id:'t12', name:'知識の芽生え', req:'totalCorrect>=50', val:50, reward:30000, desc:'累計50問正解' },
    { id:'t13', name:'知識の探求者', req:'totalCorrect>=200', val:200, reward:50000, desc:'累計200問正解' },
    { id:'t14', name:'知の巨人', req:'totalCorrect>=500', val:500, reward:100000, desc:'累計500問正解' },
    { id:'t15', name:'歩く百科事典', req:'totalCorrect>=1000', val:1000, reward:300000, desc:'累計1000問正解' },
    { id:'t16', name:'全知全能', req:'totalCorrect>=5000', val:5000, reward:5000000, desc:'累計5000問正解' },
    { id:'t17', name:'集中モード', req:'maxCombo>=20', val:20, reward:30000, desc:'1プレイ20コンボ' },
    { id:'t18', name:'ゾーン突入', req:'maxCombo>=40', val:40, reward:50000, desc:'1プレイ40コンボ' },
    { id:'t19', name:'神の領域', req:'maxCombo>=60', val:60, reward:100000, desc:'1プレイ60コンボ' },
    { id:'t20', name:'完全無欠', req:'perfect', val:1, reward:50000, desc:'HP満タンでクリア' },
    { id:'t21', name:'スピードスター', req:'speed', val:1, reward:50000, desc:'残り9秒以上で正解' },
    { id:'t22', name:'コレクター', req:'collection>=5', val:5, reward:30000, desc:'図鑑5種収集' },
    { id:'t23', name:'マニア', req:'collection>=15', val:15, reward:100000, desc:'図鑑15種収集' },
    { id:'t24', name:'博物館館長', req:'collection>=30', val:30, reward:300000, desc:'図鑑30種収集' },
    { id:'t25', name:'アイテム愛好家', req:'itemMax', val:1, reward:100000, desc:'アイテムLv.MAX' },
    { id:'t26', name:'小金持ち', req:'xp>=100000', val:100000, reward:30000, desc:'所持EXP 10万達成' },
    { id:'t27', name:'大富豪', req:'xp>=1000000', val:1000000, reward:100000, desc:'所持EXP 100万達成' },
    { id:'t28', name:'億万長者', req:'xp>=10000000', val:10000000, reward:500000, desc:'所持EXP 1000万達成' },
    { id:'t29', name:'奇跡の出会い', req:'ssr', val:1, reward:100000, desc:'SSR入手' },
    { id:'t30', name:'限界突破', req:'lvMax', val:1, reward:100000, desc:'キャラLv.20到達' },
    { id:'t31', name:'未知との遭遇', req:'randomClear', val:1, reward:30000, desc:'ランダムモードクリア' },
    { id:'t32', name:'自ら縛る者', req:'oathClear', val:1, reward:30000, desc:'誓約付きクリア' },
    { id:'t33', name:'限界のその先へ', req:'evolved', val:1, reward:100000, desc:'キャラを進化させる' },
    { id:'t34', name:'愛着の証', req:'mastered', val:1, reward:100000, desc:'キャラをマスター(10個)にする' },
    { id:'t35', name:'神引きの右腕', req:'ur', val:1, reward:150000, desc:'UR入手' },
    { id:'t36', name:'輪廻転生', req:'reborn', val:1, reward:300000, desc:'URキャラを転生させる' },
    { id:'t37', name:'計算の神様', req:'calcA', val:1, reward:50000, desc:'計算クエストでランクA以上' }
];

export const MISSIONS = [
    { id: 'play', target: 1, reward: 5000, title: "本日の挑戦", desc: "クエストを1回プレイ" },
    { id: 'kill', target: 1, reward: 10000, title: "ボス撃破！", desc: "ボスを1体倒す" },
    { id: 'correct', target: 10, reward: 10000, title: "修行の成果", desc: "合計10問正解する" },
    { id: 'maxCombo', target: 5, reward: 10000, title: "コンボマスター", desc: "5コンボ以上達成" },
    { id: 'enhance', target: 1, reward: 5000, title: "装備のメンテナンス", desc: "キャラを1回強化" },
    { id: 'typing', target: 1, reward: 5000, title: "指先の体操", desc: "タイピングを1回プレイ" },
    { id: 'calc', target: 1, reward: 5000, title: "脳の準備運動", desc: "計算クエストを1回プレイ" },
    { id: 'gacha', target: 1, reward: 5000, title: "本日の運試し", desc: "ガチャを1回引く" },
    { id: 'shop', target: 1, reward: 5000, title: "購買意欲", desc: "ショップでアイテム購入/交換" }
];
export const MISSION_ALL_CLEAR = 60000;

export const ROGUE_TILES = {
    WALL: '🌲', FLOOR: '🟫', VISITED: '🟫', ENEMY: '👾', STAIRS: '🚪', PLAYER: '🧙',
    FOUNTAIN: '⛲', BOOK: '📜', TRAP: '🕸️', STATUE: '🗿', CURSE: '💀', SHOP: '🛍️'
};

export const GUIDE_DATA = {
    categories: [
        { id: 'main', name: '▶ メインクエスト', icon: '⚔️' },
        { id: 'special', name: '✨ スペシャルクエスト', icon: '🌟' },
        { id: 'gacha', name: '💎 ガチャ・育成', icon: '📦' },
        { id: 'system', name: '⚙️ システム・その他', icon: '🔧' }
    ],
    topics: {
        'normal': {
            categoryId: 'main',
            title: '通常クエスト',
            icon: '⚔️',
            summary: '学習の基本モード。敵を倒してXPや強化アイテムを獲得！',
            contentHtml: `
                <h4>① 基本ルール</h4>
                <p>学年・教科・単元を選択して出撃します。出題される問題に正解すると敵にダメージを与えられます。</p>
                <h4>② ドロップアイテム</h4>
                <p>敵を撃破すると、強化素材として使用できる<b>「赤のページ (📕)」「青のページ (📘)」</b>などがドロップします。</p>
                <h4>③ 制限時間とライフ</h4>
                <p>問題ごとに制限時間があります。時間切れまたは誤答でライフ (❤️) が減少します。</p>
            `
        },
        'random': {
            categoryId: 'main',
            title: 'ランダムモード',
            icon: '🎲',
            summary: '指定した学年の全範囲から出題！EXP1.5倍！',
            contentHtml: `
                <h4>① モード概要</h4>
                <p>選択した学年の全教科・全単元から問題がランダムに出題される実力試しモードです。</p>
                <h4>② 特典</h4>
                <p>クリア時の<b>獲得EXPが通常の1.5倍</b>になります！総合的な学力を高めるのに最適です。</p>
            `
        },
        'typing': {
            categoryId: 'main',
            title: 'タイピングクエスト',
            icon: '⌨️',
            summary: 'PCキーボード専用！タイピングで敵を撃破！',
            contentHtml: `
                <h4>① 必須環境</h4>
                <p>このモードは<b>物理キーボード（PC等）が必須</b>です。フリック入力や画面キーボードでは動作しません。</p>
                <h4>② 遊び方</h4>
                <p>画面に表示されたローマ字を正確にタイピングしてください。ミスなく打ち切ると敵に大ダメージを与えます。</p>
            `
        },
        'rogue': {
            categoryId: 'special',
            title: '探索クエスト（ローグライク）',
            icon: '🧭',
            summary: 'ダンジョンを探索して大量のXPと限定アイテムを獲得！',
            contentHtml: `
                <h4>① ダンジョンの進み方</h4>
                <p>十字キーでプレイヤーを操作し、未踏破のマスを開拓しながら<b>🚪（階段）</b>を目指します。</p>
                <h4>② 歩数制限と強制送還</h4>
                <p>1階層ごとに歩数上限があります。歩数が0になると<b>拠点へ強制送還</b>されるため、計画的に移動しましょう。</p>
                <h4>③ イベントマス</h4>
                <p><b>⛲ (ライフ回復)</b>、<b>📜 (探索LvUP)</b>、<b>🛍️ (中間ショップ)</b> などのイベントをうまく活用しましょう！</p>
                <h4>④ 階層ボス</h4>
                <p>5階層ごとに強力なボスが出現します。撃破すると大きなボーナスを獲得できます。</p>
            `
        },
        'survival': {
            categoryId: 'special',
            title: 'サバイバルモード',
            icon: '🔥',
            summary: 'ライフが尽きるまでエンドレス特訓！装備キャラが直接成長！',
            contentHtml: `
                <h4>① モードの仕組み</h4>
                <p>次々と出題される問題を解き続けるエンドレスモードです。正解すると残り時間が少し回復します。</p>
                <h4>② キャラの直接育成</h4>
                <p>このモードでは、現在装備している<b>文房具キャラが直接経験値を獲得してレベルアップ</b>します！</p>
            `
        },
        'calc': {
            categoryId: 'special',
            title: '計算クエスト',
            icon: '🧮',
            summary: 'タイムアタック！成績に応じて強化アイテムを大量獲得！',
            contentHtml: `
                <h4>① 2つのモード</h4>
                <p><b>100問タイムアタック</b>と<b>3分間タイムアタック</b>から選んで挑戦できます。</p>
                <h4>② 獲得報酬</h4>
                <p>クリア時の評価ランク (S〜D) に応じて、<b>📕/📘 ページ</b>がまとめて手に入ります。</p>
                <h4>③ 利き手設定</h4>
                <p>テンキーの位置を「右手用」「左手用」に切替可能です。操作しやすい方を選びましょう。</p>
            `
        },
        'oath': {
            categoryId: 'special',
            title: '誓約・救済の儀',
            icon: '😈',
            summary: '難易度を変化させて倍率やクリアしやすさを調整！',
            contentHtml: `
                <h4>😈 誓約の儀（ハンデ）</h4>
                <p>制限時間短縮や攻撃力半減などのペナルティを課す代わりに、<b>獲得EXPが1.5〜2.0倍</b>にアップします。</p>
                <h4>🕊️ 救済の儀（加護）</h4>
                <p>制限時間2倍やライフ増加などのサポートを受けられます（※獲得EXPは少し低下します）。苦手な単元の克服に活用しましょう！</p>
            `
        },
        'gacha': {
            categoryId: 'gacha',
            title: 'ガチャ＆文房具図鑑',
            icon: '💎',
            summary: 'XPを使ってキャラを獲得・育成・強化！',
            contentHtml: `
                <h4>① ガチャ</h4>
                <p>クエストで溜めたXPを使ってガチャを引くことができます。高レアリティ (SSR/UR) の文房具を獲得しましょう。</p>
                <h4>② キャラ効果</h4>
                <p>装備したキャラは<b>「攻撃力アップ」「時間延長」「XP獲得量アップ」</b>などのスキルを発揮します。</p>
            `
        },
        'enhance': {
            categoryId: 'gacha',
            title: '強化・進化・転生',
            icon: '🌟',
            summary: 'キャラを極限まで鍛え上げる3つのステップ！',
            contentHtml: `
                <h4>① 強化合成</h4>
                <p>強化用の書物（📕📘）や不要なキャラを消費して、キャラのレベルを上げます。</p>
                <h4>② 限界突破・進化</h4>
                <p>レベルMAX＋同キャラの在庫10個で<b>レアリティが1段階アップ</b>します！</p>
                <h4>③ 転生 (UR専用)</h4>
                <p>URキャラがレベルMAXになると<b>「転生」</b>が可能になり、レベル1に戻る代わりに新たなスキルを習得します！</p>
            `
        },
        'system': {
            categoryId: 'system',
            title: 'データ管理・ミッション',
            icon: '☁️',
            summary: 'バックアップとやり込み報酬について',
            contentHtml: `
                <h4>☁️ クラウドセーブの重要性</h4>
                <p>データはブラウザに保存されています。キャッシュ消去等による消失を防ぐため、<b>「データ管理」から定期的にクラウドへ保存</b>してください。発行されたIDで別端末への引き継ぎも可能です。</p>
                <h4>📝 ミッション・称号</h4>
                <p>毎日のデイリーミッションや実績（称号）を達成することで、大量のXPを受け取ることができます。</p>
            `
        }
    }
};

// Reactive Game State Variables
export const rawData = {
    questions: [],
    characters: [],
    bosses: [],
    shopItems: [],
    typing: [],
    randomBosses: [],
    config: [],
    gifts: []
};

export const playData = { 
    questions: [],
    qIndex: 0,
    currentBoss: null,
    isRevenge: false,
    activeOaths: [],
    activeReliefs: [],
    isRandom: false,
    isTyping: false,
    isCalculation: false,
    isSurvival: false, 
    typingTarget: null,
    typingIndex: 0,
    typingMissed: false, 
    calcType: null,
    calcMode: null,
    calcQuestions: [],
    calcQIndex: 0,
    calcInput: '',
    calcCorrect: 0,
    calcElapsed: 0,
    calcTimeLeft: 0,
    calcCountTarget: 0,
    context: null,
    selectedBossHp: null,
    currentQ: null,
    rogueQuestions: [],
    rogueEnemyCharId: null,
    handPreference: 'right'
};

export const gameState = { 
    score: 0,
    combo: 0,
    lives: 3,
    enemyHP: 100,
    maxHP: 100,
    timer: null,
    timeLeft: 0,
    maxTime: 10, 
    xp: 0,
    equipped: '1',
    itemLevels: {},
    charaInventory: {},
    stats: {
        totalPlay: 0,
        totalKill: 0,
        totalCorrect: 0,
        maxCombo: 0,
        loginDays: 0,
        achieved_perfect: false,
        achieved_speed: false,
        achieved_random: false,
        achieved_oath: false,
        achieved_evolve: false,
        achieved_reborn: false,
        achieved_calcA: false
    },
    subjectStats: {},
    unlockedTitles: [],
    claimedGifts: [], 
    revengeList: [],
    unitProgress: {},
    inventory: {
        redPages: 0,
        bluePages: 0,
        xpBookSmall: 0,
        xpBookMedium: 0,
        xpBookLarge: 0
    },
    calcRecords: {}
};

export const dailyMissions = {
    date: "",
    progress: { play: 0, kill: 0, correct: 0, maxCombo: 0, enhance: 0, typing: 0, calc: 0, gacha: 0, shop: 0 },
    claimed: { play: false, kill: false, correct: false, maxCombo: false, enhance: false, typing: false, calc: false, gacha: false, shop: false, allClear: false }
};

export const rogueData = {
    floor: 1,
    steps: 0,
    maxSteps: 30,
    playerX: 0,
    playerY: 0,
    map: [],
    mapWidth: 11,
    mapHeight: 11,
    earnedXp: 0,
    exploreLevel: 1,
    atkBuff: 1.0,
    bonusSteps: 0,
    active: false,
    tileSize: 32,
    isAnimating: false,
    shopBought: false,
    maxLives: 3,
    isBossBattle: false
};

// Runtime UI / Game Flags
export const runtimeState = {
    currentUserId: "",
    currentCategory: null,
    viewingCharaId: null,
    isGameActive: false,
    isPaused: false,
    tempOaths: [],
    tempReliefs: [],
    oathOrigin: 'normal',
    currentShopTab: 'buy',
    countdownTimer: null,
    appModalResolve: null,
    isMuted: true,
    selectedMaterialIds: [],
    selectedBookType: null,
    selectedBookCount: 0,
    zukanCurrentFilter: 'ALL',
    zukanCurrentSort: 'default'
};

// Data Management Functions
export function initUserId() {
    let id = localStorage.getItem('sq_user_id');
    if (!id) {
        id = Math.random().toString(36).substring(2, 10);
        localStorage.setItem('sq_user_id', id);
    }
    runtimeState.currentUserId = id;
}

export function loadSaveData() {
    const safeParse = (key, defaultVal) => {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined || raw === "undefined") return defaultVal;
            let parsed = JSON.parse(raw);
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch(e){}
            }
            return parsed || defaultVal;
        } catch (e) {
            return defaultVal;
        }
    };

    try {
        gameState.xp = parseInt(localStorage.getItem('sq_xp') || '0', 10);
    } catch(e) {
        gameState.xp = 0;
    }
    gameState.equipped = localStorage.getItem('sq_equip') || '1';
    gameState.itemLevels = safeParse('sq_items_v2', {});
    gameState.charaInventory = safeParse('sq_inventory', {});
    
    if (!gameState.charaInventory || Object.keys(gameState.charaInventory).length === 0) {
        const oldCharas = localStorage.getItem('sq_charas');
        if (oldCharas) {
            try {
                const idList = JSON.parse(oldCharas);
                if (Array.isArray(idList) && idList.length > 0) {
                    idList.forEach(id => {
                        gameState.charaInventory[id] = { level: 1, count: 1, exp: 0 };
                    });
                    localStorage.setItem('sq_inventory', JSON.stringify(gameState.charaInventory));
                }
            } catch(e) {}
        }
        if (Object.keys(gameState.charaInventory).length === 0) {
            gameState.charaInventory = { "1": { level: 1, count: 1, exp: 0 } };
        }
    }
    
    // 全所持キャラクターのレベル最低値保証（Lv.1未満または未設定ならLv.1に補正）
    if (gameState.charaInventory) {
        Object.keys(gameState.charaInventory).forEach(id => {
            const item = gameState.charaInventory[id];
            if (item) {
                if (typeof item.level !== 'number' || item.level < 1) item.level = 1;
                if (typeof item.count !== 'number' || item.count < 1) item.count = 1;
                if (typeof item.exp !== 'number' || item.exp < 0) item.exp = 0;
            }
        });
    }
    
    gameState.stats = safeParse('sq_stats', {
        totalPlay: 0,
        totalKill: 0,
        totalCorrect: 0,
        maxCombo: 0,
        loginDays: 0,
        achieved_perfect: false,
        achieved_speed: false,
        achieved_random: false,
        achieved_oath: false,
        achieved_evolve: false,
        achieved_reborn: false,
        achieved_calcA: false
    });
    gameState.subjectStats = safeParse('sq_subject_stats', {});
    gameState.unlockedTitles = safeParse('sq_titles', []);
    gameState.claimedGifts = safeParse('sq_claimed_gifts', []);
    gameState.revengeList = safeParse('sq_revenge', []);
    gameState.unitProgress = safeParse('sq_unit_progress', {});
    gameState.calcRecords = safeParse('sq_calc_records', {});
    
    const loadedInv = safeParse('sq_item_inventory', {});
    gameState.inventory = {
        redPages: Number(loadedInv.redPages) || 0,
        bluePages: Number(loadedInv.bluePages) || 0,
        xpBookSmall: Number(loadedInv.xpBookSmall) || 0,
        xpBookMedium: Number(loadedInv.xpBookMedium) || 0,
        xpBookLarge: Number(loadedInv.xpBookLarge) || 0
    };
    
    try {
        const parsedMissions = safeParse('sq_missions', {
            date: "",
            progress: { play: 0, kill: 0, correct: 0, maxCombo: 0, enhance: 0, typing: 0, calc: 0, gacha: 0, shop: 0 },
            claimed: { play: false, kill: false, correct: false, maxCombo: false, enhance: false, typing: false, calc: false, gacha: false, shop: false, allClear: false }
        });
        dailyMissions.date = parsedMissions.date || "";
        dailyMissions.progress = parsedMissions.progress || { play: 0, kill: 0, correct: 0, maxCombo: 0, enhance: 0, typing: 0, calc: 0, gacha: 0, shop: 0 };
        dailyMissions.claimed = parsedMissions.claimed || { play: false, kill: false, correct: false, maxCombo: false, enhance: false, typing: false, calc: false, gacha: false, shop: false, allClear: false };
    } catch(e) {}
}

export function saveGame() {
    localStorage.setItem('sq_xp', gameState.xp);
    localStorage.setItem('sq_equip', gameState.equipped);
    localStorage.setItem('sq_items_v2', JSON.stringify(gameState.itemLevels));
    localStorage.setItem('sq_inventory', JSON.stringify(gameState.charaInventory));
    localStorage.setItem('sq_missions', JSON.stringify(dailyMissions));
    localStorage.setItem('sq_stats', JSON.stringify(gameState.stats));
    localStorage.setItem('sq_subject_stats', JSON.stringify(gameState.subjectStats || {}));
    localStorage.setItem('sq_titles', JSON.stringify(gameState.unlockedTitles));
    localStorage.setItem('sq_claimed_gifts', JSON.stringify(gameState.claimedGifts));
    localStorage.setItem('sq_revenge', JSON.stringify(gameState.revengeList || []));
    localStorage.setItem('sq_unit_progress', JSON.stringify(gameState.unitProgress || {}));
    localStorage.setItem('sq_calc_records', JSON.stringify(gameState.calcRecords || {}));
    localStorage.setItem('sq_item_inventory', JSON.stringify(gameState.inventory));
}
