const API_URL = 'https://script.google.com/macros/s/AKfycbyG3MnjSn1D1flR3-LR1AzfoijF_ID7GJzZ1d5gYgemZd504kGwou02cV-M8c8kfJwi/exec';

// Settings
const RARITY_CAPS = { 'N': 5, 'R': 10, 'SR': 15, 'SSR': 20, 'UR': 30 };
const EVO_COST_XP = { 'N': 10000, 'R': 50000, 'SR': 200000, 'SSR': 500000 };
const EVO_STOCK_REQ = 10;
const REBORN_COST_XP = 100000;
const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];
const SKILL_TYPES = ['ATK', 'TIME', 'EXP'];
const getRarityIndex = (r) => RARITY_ORDER.indexOf(r);

const LV_BONUS_RATE = 0.01;
const EXP_REQ = 100;
const MAT_EXP = { 'N': 25, 'R': 50, 'SR': 100, 'SSR': 200, 'UR': 500 };
const SELL_PRICES = { 'N': 250, 'R': 500, 'SR': 1000, 'SSR': 2000, 'UR': 5000 };
const LOGIN_BONUS_EXP = 3000;
const MAX_ITEM_LEVEL = 10;
const MASTER_COUNT = 10;

const TITLES = [
    { id:'t01', name:'三日坊主卒業', req:'loginDays>=3', val:3, reward:5000, desc:'通算3日プレイ' },
    { id:'t02', name:'一週間の奇跡', req:'loginDays>=7', val:7, reward:10000, desc:'通算7日プレイ' },
    { id:'t03', name:'習慣化の達人', req:'loginDays>=14', val:14, reward:20000, desc:'通算14日プレイ' },
    { id:'t04', name:'月間MVP', req:'loginDays>=30', val:30, reward:50000, desc:'通算30日プレイ' },
    { id:'t05', name:'季節を超えて', req:'loginDays>=100', val:100, reward:200000, desc:'通算100日プレイ' },
    { id:'t06', name:'伝説の常連', req:'loginDays>=365', val:365, reward:1000000, desc:'通算365日プレイ' },
    { id:'t07', name:'ビギナー', req:'totalKill>=5', val:5, reward:5000, desc:'累計5体撃破' },
    { id:'t08', name:'エース', req:'totalKill>=20', val:20, reward:15000, desc:'累計20体撃破' },
    { id:'t09', name:'ベテラン', req:'totalKill>=50', val:50, reward:40000, desc:'累計50体撃破' },
    { id:'t10', name:'ヒーロー', req:'totalKill>=100', val:100, reward:100000, desc:'累計100体撃破' },
    { id:'t11', name:'破壊神', req:'totalKill>=500', val:500, reward:500000, desc:'累計500体撃破' },
    { id:'t12', name:'知識の芽生え', req:'totalCorrect>=50', val:50, reward:5000, desc:'累計50問正解' },
    { id:'t13', name:'知識の探求者', req:'totalCorrect>=200', val:200, reward:20000, desc:'累計200問正解' },
    { id:'t14', name:'知の巨人', req:'totalCorrect>=500', val:500, reward:50000, desc:'累計500問正解' },
    { id:'t15', name:'歩く百科事典', req:'totalCorrect>=1000', val:1000, reward:100000, desc:'累計1000問正解' },
    { id:'t16', name:'全知全能', req:'totalCorrect>=5000', val:5000, reward:1000000, desc:'累計5000問正解' },
    { id:'t17', name:'集中モード', req:'maxCombo>=20', val:20, reward:10000, desc:'1プレイ20コンボ' },
    { id:'t18', name:'ゾーン突入', req:'maxCombo>=40', val:40, reward:30000, desc:'1プレイ40コンボ' },
    { id:'t19', name:'神の領域', req:'maxCombo>=60', val:60, reward:100000, desc:'1プレイ60コンボ' },
    { id:'t20', name:'完全無欠', req:'perfect', val:1, reward:20000, desc:'HP満タンでクリア' },
    { id:'t21', name:'スピードスター', req:'speed', val:1, reward:5000, desc:'残り9秒以上で正解' },
    { id:'t22', name:'コレクター', req:'collection>=5', val:5, reward:10000, desc:'図鑑5種収集' },
    { id:'t23', name:'マニア', req:'collection>=15', val:15, reward:30000, desc:'図鑑15種収集' },
    { id:'t24', name:'博物館館長', req:'collection>=30', val:30, reward:100000, desc:'図鑑30種収集' },
    { id:'t25', name:'アイテム愛好家', req:'itemMax', val:1, reward:50000, desc:'アイテムLv.MAX' },
    { id:'t26', name:'小金持ち', req:'xp>=100000', val:100000, reward:10000, desc:'所持EXP 10万達成' },
    { id:'t27', name:'大富豪', req:'xp>=1000000', val:1000000, reward:100000, desc:'所持EXP 100万達成' },
    { id:'t28', name:'億万長者', req:'xp>=10000000', val:10000000, reward:1000000, desc:'所持EXP 1000万達成' },
    { id:'t29', name:'奇跡の出会い', req:'ssr', val:1, reward:50000, desc:'SSR入手' },
    { id:'t30', name:'限界突破', req:'lvMax', val:1, reward:50000, desc:'キャラLv.20到達' }
];

const MISSIONS = [
    { id: 'play', target: 1, reward: 500, title: "本日の挑戦", desc: "クエストを1回プレイ" },
    { id: 'kill', target: 1, reward: 1000, title: "ボス撃破！", desc: "ボスを1体倒す" },
    { id: 'correct', target: 10, reward: 1000, title: "修行の成果", desc: "合計10問正解する" },
    { id: 'maxCombo', target: 5, reward: 1000, title: "コンボマスター", desc: "5コンボ以上達成" },
    { id: 'enhance', target: 1, reward: 500, title: "装備のメンテナンス", desc: "キャラを1回強化" }
];
const MISSION_ALL_CLEAR = 3000;

let rawData = { questions: [], characters: [], bosses: [], shopItems: [], typing: [], randomBosses: [], config: [], gifts: [] };
let playData = { questions: [], qIndex: 0, currentBoss: null, isRevenge: false, activeOaths: [], isRandom: false, isTyping: false, typingTarget: null, typingIndex: 0, typingMissed: false, isCalculation: false, calcType: null, calcMode: null, calcQuestions: [], calcQIndex: 0, calcInput: '', calcCorrect: 0, calcElapsed: 0, calcTimeLeft: 0, calcCountTarget: 0 };
let countdownTimer = null;

let gameState = { 
    score: 0, combo: 0, lives: 3, enemyHP: 100, maxHP: 100, timer: null, timeLeft: 0, maxTime: 10, 
    xp: 0, equipped: '1', itemLevels: {}, charaInventory: {},
    stats: { totalPlay:0, totalKill:0, totalCorrect:0, maxCombo:0, loginDays:0, achieved_perfect: false, achieved_speed: false },
    subjectStats: {},
    unlockedTitles: [],
    claimedGifts: [], 
    revengeList: [],
    unitProgress: {},
    inventory: { redPages:0, bluePages:0, xpBookSmall:0, xpBookMedium:0, xpBookLarge:0 },
    calcRecords: {}
};

let dailyMissions = { date: "", progress: { play: 0, kill: 0, correct: 0, maxCombo: 0, enhance: 0 }, claimed: { play: false, kill: false, correct: false, maxCombo: false, enhance: false, allClear: false } };
let currentUserId = ""; 
let viewingCharaId = null, isGameActive = false, isPaused = false;

window.onload = async () => { 
    initUserId(); 
    loadSaveData(); 
    await fetchData(); 
    initTitle(); 
    checkLoginBonus(); 
    checkMissionDate(); 
    checkTitles();
};

let appModalResolve = null;
function closeAppModal(result = false) {
    const overlay = document.getElementById('app-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    if (appModalResolve) { appModalResolve(result); appModalResolve = null; }
}   
function showAppModal(message, type = 'alert') {
    const overlay = document.getElementById('app-modal-overlay');
    const messageBox = document.getElementById('app-modal-message');
    const okBtn = document.getElementById('app-modal-ok');
    const cancelBtn = document.getElementById('app-modal-cancel');
    if (!overlay || !messageBox || !okBtn || !cancelBtn) return Promise.resolve(type === 'confirm' ? false : undefined);
    messageBox.innerText = String(message || '');
    overlay.classList.remove('hidden');
    cancelBtn.style.display = type === 'confirm' ? 'inline-flex' : 'none';
    if (type === 'confirm') { okBtn.innerText = 'はい'; cancelBtn.innerText = 'いいえ'; } else { okBtn.innerText = 'OK'; }
    return new Promise(resolve => {
        appModalResolve = resolve;
        okBtn.onclick = () => closeAppModal(true);
        cancelBtn.onclick = () => closeAppModal(false);
    });
}
function showAlert(message) { showAppModal(message, 'alert'); }
function showConfirm(message) { return showAppModal(message, 'confirm'); }
window.alert = function(message) { showAlert(message); };

function initUserId() {
    let id = localStorage.getItem('sq_user_id');
    if (!id) { id = Math.random().toString(36).substring(2, 10); localStorage.setItem('sq_user_id', id); }
    currentUserId = id;
}

function loadSaveData() {
    const safeParse = (key, defaultVal) => {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined || raw === "undefined") return defaultVal;
            let parsed = JSON.parse(raw);
            if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch(e){} }
            return parsed || defaultVal;
        } catch (e) { return defaultVal; }
    };

    try { gameState.xp = parseInt(localStorage.getItem('sq_xp') || '0', 10); } catch(e) { gameState.xp = 0; }
    gameState.equipped = localStorage.getItem('sq_equip') || '1';
    gameState.itemLevels = safeParse('sq_items_v2', {});
    gameState.charaInventory = safeParse('sq_inventory', {});
    
    if (!gameState.charaInventory || Object.keys(gameState.charaInventory).length === 0) {
        const oldCharas = localStorage.getItem('sq_charas');
        if (oldCharas) {
            try {
                const idList = JSON.parse(oldCharas);
                if (Array.isArray(idList) && idList.length > 0) {
                    idList.forEach(id => { gameState.charaInventory[id] = { level: 1, count: 1, exp: 0 }; });
                    localStorage.setItem('sq_inventory', JSON.stringify(gameState.charaInventory));
                }
            } catch(e) {}
        }
        if (Object.keys(gameState.charaInventory).length === 0) gameState.charaInventory = { "1": { level: 1, count: 1, exp: 0 } };
    }
    
    gameState.stats = safeParse('sq_stats', { totalPlay:0, totalKill:0, totalCorrect:0, maxCombo:0, loginDays:0, achieved_perfect: false, achieved_speed: false });
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
    
    try { dailyMissions = safeParse('sq_missions', { date:"", progress:{ play:0, kill:0, correct:0, maxCombo:0, enhance:0 }, claimed:{ play:false, kill:false, correct:false, maxCombo:false, enhance:false, allClear:false } }); } catch(e){}
}

function saveGame() {
    localStorage.setItem('sq_xp', gameState.xp);
    localStorage.setItem('sq_equip', gameState.equipped);
    localStorage.setItem('sq_items_v2', JSON.stringify(gameState.itemLevels));
    localStorage.setItem('sq_inventory', JSON.stringify(gameState.charaInventory));
    localStorage.setItem('sq_missions', JSON.stringify(dailyMissions));
    localStorage.setItem('sq_stats', JSON.stringify(gameState.stats));
    localStorage.setItem('sq_titles', JSON.stringify(gameState.unlockedTitles));
    localStorage.setItem('sq_claimed_gifts', JSON.stringify(gameState.claimedGifts));
    localStorage.setItem('sq_revenge', JSON.stringify(gameState.revengeList || []));
    localStorage.setItem('sq_unit_progress', JSON.stringify(gameState.unitProgress || {}));
    localStorage.setItem('sq_calc_records', JSON.stringify(gameState.calcRecords || {}));
    localStorage.setItem('sq_item_inventory', JSON.stringify(gameState.inventory));
}

function checkTitles() {
    let count = 0; let collectionCount = 0; let hasSSR = false; let hasLvMax = false;
    if(gameState.charaInventory && rawData.characters) {
        collectionCount = Object.keys(gameState.charaInventory).length;
        Object.keys(gameState.charaInventory).forEach(id => {
            const c = rawData.characters.find(x => x.id === id); const inv = gameState.charaInventory[id];
            if(c && c.rarity === 'SSR') hasSSR = true;
            if(inv && inv.level >= 20) hasLvMax = true;
        });
    }
    let hasItemMax = false;
    if(gameState.itemLevels) Object.values(gameState.itemLevels).forEach(lv => { if(lv >= MAX_ITEM_LEVEL) hasItemMax = true; });

    TITLES.forEach(t => {
        if (gameState.unlockedTitles.includes(t.id)) return;
        let cleared = false;
        if (t.req === 'perfect' && gameState.stats.achieved_perfect) cleared = true;
        else if (t.req === 'speed' && gameState.stats.achieved_speed) cleared = true;
        else if (t.req === 'ssr' && hasSSR) cleared = true;
        else if (t.req === 'lvMax' && hasLvMax) cleared = true;
        else if (t.req === 'itemMax' && hasItemMax) cleared = true;
        else if (t.req.includes('collection')) { if (collectionCount >= t.val) cleared = true; }
        else if (t.req.includes('xp')) { if (gameState.xp >= t.val) cleared = true; }
        else { try { const key = t.req.split(/>=/)[0]; const val = gameState.stats[key] || 0; if (val >= t.val) cleared = true; } catch(e){} }
        if (cleared) count++;
    });
    const badge = document.getElementById('title-badge');
    if(badge) {
        if(count > 0) { badge.classList.remove('hidden'); badge.innerText = count > 9 ? '!' : count; } else { badge.classList.add('hidden'); }
    }
}

function openTitles() { document.getElementById('titles-overlay').classList.remove('hidden'); renderTitles(); }
function closeTitles() { document.getElementById('titles-overlay').classList.add('hidden'); }

function renderTitles() {
    const list = document.getElementById('titles-list'); if(!list) return; list.innerHTML = '';
    let collectionCount = 0; if(gameState.charaInventory) collectionCount = Object.keys(gameState.charaInventory).length;

    TITLES.forEach(t => {
        const isClaimed = gameState.unlockedTitles.includes(t.id); let isUnlocked = false;
        if (isClaimed) isUnlocked = true;
        else {
            if (t.req.includes('collection') && collectionCount >= t.val) isUnlocked = true;
            else if (t.req.includes('xp') && gameState.xp >= t.val) isUnlocked = true;
            else if (t.req === 'ssr' && Object.keys(gameState.charaInventory).some(id => rawData.characters?.find(c=>c.id==id)?.rarity=='SSR')) isUnlocked = true;
            else if (t.req === 'lvMax' && Object.values(gameState.charaInventory).some(inv => inv.level >= 20)) isUnlocked = true;
            else if (t.req === 'itemMax' && Object.values(gameState.itemLevels).some(lv => lv >= MAX_ITEM_LEVEL)) isUnlocked = true;
            else if (t.req === 'perfect' && gameState.stats.achieved_perfect) isUnlocked = true;
            else if (t.req === 'speed' && gameState.stats.achieved_speed) isUnlocked = true;
            else { const key = t.req.split(/>=/)[0]; if ((gameState.stats[key] || 0) >= t.val) isUnlocked = true; }
        }
        let statusClass = isClaimed ? 'claimed' : (isUnlocked ? 'unlocked' : '');
        let btnText = isClaimed ? '受取済' : (isUnlocked ? `受取: ${t.reward}XP` : '未達成');
        let btnAction = (isUnlocked && !isClaimed) ? `onclick="claimTitle('${t.id}', ${t.reward})"` : '';
        list.innerHTML += `<div class="title-item ${statusClass}"><div class="title-header"><span class="title-name">${t.name}</span><button class="title-reward-btn" ${btnAction}>${btnText}</button></div><div class="title-req">${t.desc}</div></div>`;
    });
}

function claimTitle(id, reward) {
    if(gameState.unlockedTitles.includes(id)) return;
    gameState.unlockedTitles.push(id); gameState.xp += reward; saveGame(); renderTitles(); updateTitleInfo(); checkTitles();
    alert(`称号を獲得しました！\n報酬: ${reward} XP`);
}

function openSyncMenu() { document.getElementById('sync-overlay').classList.remove('hidden'); document.getElementById('my-user-id').innerText = currentUserId; }
function closeSyncMenu() { document.getElementById('sync-overlay').classList.add('hidden'); }

async function uploadData() {
    if (!(await showConfirm("現在のデータをクラウドに保存しますか？\n（同じIDの古いデータは上書きされます）"))) return;
    saveGame();
    const backupData = { xp: gameState.xp, equipped: gameState.equipped, itemLevels: gameState.itemLevels, charaInventory: gameState.charaInventory, missions: dailyMissions, stats: gameState.stats, unlockedTitles: gameState.unlockedTitles, claimedGifts: gameState.claimedGifts, revengeList: gameState.revengeList, unitProgress: gameState.unitProgress, inventory: gameState.inventory };
    const btn = document.querySelector('#sync-overlay button'); const originalText = btn ? btn.innerText : "送信"; if(btn) { btn.innerText = "送信中..."; btn.disabled = true; }
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'save', userId: currentUserId, data: backupData }) });
        const json = await res.json();
        if(json.status === 'success') alert("クラウドへの保存が完了しました！"); else alert("保存失敗: " + json.message);
    } catch(e) { alert("通信エラー: " + e); } finally { if(btn) { btn.innerText = originalText; btn.disabled = false; } }
}

async function downloadData() {
    const inputId = document.getElementById('input-sync-id').value.trim(); if(!inputId) return alert("IDを入力してください");
    if (!(await showConfirm("データを読み込みますか？\n現在のデータは上書きされます。"))) return;
    const btns = document.querySelectorAll('#sync-overlay button');
    let btn = null; for(let i=0; i<btns.length; i++) { if(btns[i].innerText.includes('ダウンロード')) btn = btns[i]; }
    if(!btn && btns.length > 0) btn = btns[btns.length - 2]; 
    const originalText = btn ? btn.innerText : "ダウンロード"; if(btn) { btn.innerText = "受信中..."; btn.disabled = true; }
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'load', userId: inputId }) });
        const json = await res.json();
        if (json.questions || json.appVersion) return alert("【エラー】\nサーバー設定が反映されていません。");
        if(json.status === 'success') {
            let data = json.data; if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) {} }
            if(!data) { alert("データの中身が空でした。"); return; }
            const forceObj = (v) => { if(!v)return{}; if(typeof v==='string'){try{return JSON.parse(v)}catch(e){return{}}} return v; };
            const forceArr = (v) => { if(!v)return[]; if(typeof v==='string'){try{return JSON.parse(v)}catch(e){return[]}} return Array.isArray(v)?v:[]; };
            gameState.xp = parseInt(data.xp || 0, 10); gameState.equipped = String(data.equipped || '1');
            gameState.itemLevels = forceObj(data.itemLevels); gameState.charaInventory = forceObj(data.charaInventory);
            dailyMissions = forceObj(data.missions); gameState.stats = forceObj(data.stats);
            gameState.unlockedTitles = forceArr(data.unlockedTitles); gameState.claimedGifts = forceArr(data.claimedGifts);
            gameState.revengeList = forceArr(data.revengeList); gameState.unitProgress = forceObj(data.unitProgress);
            const cInv = forceObj(data.inventory);
            gameState.inventory = { redPages: Number(cInv.redPages) || 0, bluePages: Number(cInv.bluePages) || 0, xpBookSmall: Number(cInv.xpBookSmall) || 0, xpBookMedium: Number(cInv.xpBookMedium) || 0, xpBookLarge: Number(cInv.xpBookLarge) || 0 };
            currentUserId = inputId; localStorage.setItem('sq_user_id', inputId); saveGame();
            alert("データの読み込みに成功しました！\nリロードします。"); location.reload();
        } else alert("読み込み失敗: " + (json.message || "Unknown error"));
    } catch(e) { alert("通信エラー: " + e); } finally { if(btn) { btn.innerText = originalText; btn.disabled = false; } }
}

async function fetchData() {
    try {
        const isDebug = window.location.search.includes('debug=true');
        const url = isDebug ? ('http://localhost:8000/sample_api.json?t=' + new Date().getTime()) : (API_URL + '?t=' + new Date().getTime());
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        const getVal = (obj, keys) => { for (const k of keys) { const v = obj[k]; if (v !== undefined && v !== null && v !== "") return String(v); } return ""; };
        const getFuzzyVal = (obj, keyword, defaultVal) => { const key = Object.keys(obj).find(k => k.includes(keyword)); const val = key ? obj[key] : ""; return (val !== undefined && val !== null && val !== "") ? String(val) : defaultVal; };
        const convertDriveUrl = (url) => { if(!url || !url.startsWith('http')) return url; if(url.includes('drive.google.com') && (url.includes('/file/d/') || url.includes('id='))) { let id = ""; const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/); if(match1) id = match1[1]; else { const match2 = url.match(/id=([a-zA-Z0-9_-]+)/); if(match2) id = match2[1]; } if(id) return `https://drive.google.com/thumbnail?sz=w1000&id=${id}`; } return url; };
        rawData = { questions: [], characters: [], bosses: [], shopItems: [], typing: [], randomBosses: [], config: [], gifts: [] };
        const generateHashId = (str, prefix) => { let hash = 0; for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i) | 0; return prefix + "_" + Math.abs(hash); };

        for (let key in data) {
            const lowerKey = key.toLowerCase();
            try {
                if (lowerKey.includes('questions') || lowerKey.includes('question')) {
                    rawData.questions = data[key].filter(d => d).map(q => {
                        const qText = getVal(q, ['q', 'question', '問題', '問題文']); const aText = getVal(q, ['a', 'answer', '正解']);
                        let hash = 0; const str = qText + aText; for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
                        return { id: "q_" + Math.abs(hash), grade: getVal(q, ['grade', '学年']), subject: getVal(q, ['subject', '教科']), unit: getVal(q, ['unit', '単元']), q: qText, a: aText, choices: q.choices ? String(q.choices).split(',') : [ getVal(q, ['誤答1']), getVal(q, ['誤答2']), getVal(q, ['誤答3']), getVal(q, ['a', '正解']) ].filter(x => x !== "") };
                    });
                } else if (lowerKey.includes('character')) {
                    rawData.characters = data[key].filter(d => d).map(c => { const name = getVal(c, ['name', '名前']) || "Unknown"; return { id: String(c.id || c.ID || generateHashId(name, 'chara')), name: name, rarity: getVal(c, ['rarity', 'レア']) || "N", type: getVal(c, ['type', 'タイプ']) || "ATK", value: Number(getVal(c, ['value', '補正値', '効果値']) || 1.0), desc: getVal(c, ['desc', '解説']), imageUrl: convertDriveUrl(getVal(c, ['imageUrl', '画像URL', '画像'])) }; });
                } else if (lowerKey.includes('boss')) {
                    rawData.bosses = data[key].filter(d => d).map(b => ({ grade: getVal(b,
