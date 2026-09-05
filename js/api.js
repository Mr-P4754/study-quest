// ==========================================
// js/api.js (GASバックエンド通信・クラウド同期)
// ==========================================

import { API_URL, rawData, gameState, dailyMissions, runtimeState, saveGame } from './state.js?v=10.0.3';

export async function uploadData() {
    if (typeof window.showConfirm === 'function') {
        if (!(await window.showConfirm("現在のデータをクラウドに保存しますか？\n（同じIDの古いデータは上書きされます）"))) return;
    }
    saveGame();
    const backupData = {
        xp: gameState.xp,
        equipped: gameState.equipped,
        itemLevels: gameState.itemLevels,
        charaInventory: gameState.charaInventory,
        missions: dailyMissions,
        stats: gameState.stats,
        subjectStats: gameState.subjectStats,
        unlockedTitles: gameState.unlockedTitles,
        claimedGifts: gameState.claimedGifts,
        revengeList: gameState.revengeList,
        unitProgress: gameState.unitProgress,
        inventory: gameState.inventory,
        calcRecords: gameState.calcRecords,
        studyel: gameState.studyel
    };
    const btn = document.querySelector('#sync-overlay button');
    const originalText = btn ? btn.innerText : "送信";
    if (btn) { btn.innerText = "送信中..."; btn.disabled = true; }
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'save', userId: runtimeState.currentUserId, data: backupData })
        });
        const json = await res.json();
        if (json.status === 'success') {
            alert("クラウドへの保存が完了しました！");
        } else {
            alert("保存失敗: " + json.message);
        }
    } catch(e) {
        alert("通信エラー: " + e);
    } finally {
        if (btn) { btn.innerText = originalText; btn.disabled = false; }
    }
}

export async function downloadData() {
    const inputId = document.getElementById('input-sync-id')?.value.trim();
    if (!inputId) return alert("IDを入力してください");
    if (typeof window.showConfirm === 'function') {
        if (!(await window.showConfirm("データを読み込みますか？\n現在のデータは上書きされます。"))) return;
    }
    const btns = document.querySelectorAll('#sync-overlay button');
    let btn = null;
    for (let i = 0; i < btns.length; i++) {
        if (btns[i].innerText.includes('ダウンロード')) btn = btns[i];
    }
    if (!btn && btns.length > 0) btn = btns[btns.length - 2]; 
    const originalText = btn ? btn.innerText : "ダウンロード";
    if (btn) { btn.innerText = "受信中..."; btn.disabled = true; }
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'load', userId: inputId })
        });
        const json = await res.json();
        if (json.questions || json.appVersion) return alert("【エラー】\nサーバー設定が反映されていません。");
        if (json.status === 'success') {
            let data = json.data;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e) {}
            }
            if (!data) { alert("データの中身が空でした。"); return; }
            const forceObj = (v) => { if(!v)return{}; if(typeof v==='string'){try{return JSON.parse(v)}catch(e){return{}}} return v; };
            const forceArr = (v) => { if(!v)return[]; if(typeof v==='string'){try{return JSON.parse(v)}catch(e){return[]}} return Array.isArray(v)?v:[]; };
            
            gameState.xp = parseInt(data.xp || 0, 10);
            gameState.equipped = String(data.equipped || '1');
            gameState.itemLevels = forceObj(data.itemLevels);
            gameState.charaInventory = forceObj(data.charaInventory);
            Object.keys(gameState.charaInventory).forEach(id => {
                const item = gameState.charaInventory[id];
                if (item) {
                    if (typeof item.level !== 'number' || item.level < 1) item.level = 1;
                    if (typeof item.count !== 'number' || item.count < 1) item.count = 1;
                    if (typeof item.exp !== 'number' || item.exp < 0) item.exp = 0;
                }
            });
            
            const m = forceObj(data.missions);
            dailyMissions.date = m.date || "";
            dailyMissions.progress = m.progress || dailyMissions.progress;
            dailyMissions.claimed = m.claimed || dailyMissions.claimed;

            gameState.stats = forceObj(data.stats);
            gameState.subjectStats = forceObj(data.subjectStats);
            gameState.unlockedTitles = forceArr(data.unlockedTitles);
            gameState.claimedGifts = forceArr(data.claimedGifts);
            gameState.revengeList = forceArr(data.revengeList);
            gameState.unitProgress = forceObj(data.unitProgress);
            gameState.calcRecords = forceObj(data.calcRecords);
            const cInv = forceObj(data.inventory);
            gameState.inventory = {
                redPages: Number(cInv.redPages) || 0,
                bluePages: Number(cInv.bluePages) || 0,
                xpBookSmall: Number(cInv.xpBookSmall) || 0,
                xpBookMedium: Number(cInv.xpBookMedium) || 0,
                xpBookLarge: Number(cInv.xpBookLarge) || 0
            };
            if (data.studyel) {
                const sData = forceObj(data.studyel);
                Object.assign(gameState.studyel, sData);
            }
            runtimeState.currentUserId = inputId;
            localStorage.setItem('sq_user_id', inputId);
            saveGame();
            alert("データの読み込みに成功しました！\nリロードします。");
            location.reload();
        } else {
            alert("読み込み失敗: " + (json.message || "Unknown error"));
        }
    } catch(e) {
        alert("通信エラー: " + e);
    } finally {
        if (btn) { btn.innerText = originalText; btn.disabled = false; }
    }
}

export async function fetchData() {
    try {
        const isDebug = window.location.search.includes('debug=true');
        const url = isDebug ? ('http://localhost:8000/sample_api.json?t=' + Date.now()) : (API_URL + '?t=' + Date.now());
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP通信エラー: ${res.status}`);
        const data = await res.json();

        const convertDriveUrl = (url) => {
            if (!url || typeof url !== 'string' || !url.startsWith('http')) return url || '';
            if (url.includes('lh3.googleusercontent.com')) return url;
            if (url.includes('drive.google.com')) {
                let id = "";
                const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (match1) id = match1[1];
                else {
                    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                    if (match2) id = match2[1];
                }
                if (id) return `https://lh3.googleusercontent.com/d/${id}`;
            }
            return url;
        };

        const getVal = (obj, keys) => {
            if (!obj) return "";
            for (const k of keys) {
                const v = obj[k];
                if (v !== undefined && v !== null && v !== "") return String(v);
            }
            return "";
        };

        // 1. 通常問題 (questions)
        rawData.questions = [];
        if (Array.isArray(data.questions)) {
            rawData.questions = data.questions.map(q => {
                const qText = q.question || q.q || getVal(q, ['問題', '問題文']);
                const aText = q.answer || q.a || getVal(q, ['正解']);
                const choices = (Array.isArray(q.choices) && q.choices.length > 0)
                    ? q.choices
                    : [
                        aText,
                        q.wrong1 !== undefined ? q.wrong1 : getVal(q, ['誤答1']),
                        q.wrong2 !== undefined ? q.wrong2 : getVal(q, ['誤答2']),
                        q.wrong3 !== undefined ? q.wrong3 : getVal(q, ['誤答3'])
                    ].filter(v => v !== undefined && v !== null && String(v).trim() !== '').map(String);

                return {
                    ...q,
                    id: String(q.id || `q_${Math.abs(generateStringHash(qText + aText))}`),
                    grade: String(q.grade || getVal(q, ['学年']) || ''),
                    unit: String(q.unit || getVal(q, ['単元']) || ''),
                    subject: String(q.subject || getVal(q, ['教科']) || ''),
                    question: qText,
                    q: qText,
                    answer: aText,
                    a: aText,
                    choices: choices,
                    explain: String(q.explain !== undefined ? q.explain : (getVal(q, ['解説']) || ''))
                };
            });
        }

        // 2. タイピング (typing)
        rawData.typing = [];
        const rawTyping = Array.isArray(data.typing) ? data.typing : [];
        rawData.typing = rawTyping.map(t => {
            const jp = String(t.japanese || t.display || getVal(t, ['日本語']) || '');
            const rm = String(t.romaji || t.input || getVal(t, ['ローマ字']) || '').toLowerCase().replace(/\s+/g, '');
            return {
                ...t,
                id: String(t.id || `t_${Math.abs(generateStringHash(jp))}`),
                grade: String(t.grade || getVal(t, ['学年']) || ''),
                unit: String(t.unit || getVal(t, ['単元', '単元/ジャンル']) || '全般'),
                subject: 'タイピング',
                japanese: jp,
                romaji: rm
            };
        }).filter(t => t.japanese && t.romaji);

        // 3. キャラクター (characters)
        rawData.characters = [];
        const rawChars = Array.isArray(data.characters) ? data.characters : [];
        rawData.characters = rawChars.map(c => {
            const strId = String(c.ID !== undefined ? c.ID : (c.id !== undefined ? c.id : ''));
            const name = String(c['名前'] || c.name || 'Unknown');
            const rarity = String(c['レア'] || c.rarity || 'N');
            const type = String(c['タイプ'] || c.type || 'ATK');
            const val = Number(c['補正値'] !== undefined ? c['補正値'] : (c.value !== undefined ? c.value : 1.0));
            const desc = String(c['解説'] || c.desc || '');
            const category = String(c['カテゴリ'] || c.category || '');
            const imgUrl = convertDriveUrl(c['画像URL'] || c.imageUrl || c.image || '');

            return {
                ...c,
                id: strId,
                ID: strId,
                name: name,
                '名前': name,
                rarity: rarity,
                'レア': rarity,
                type: type,
                'タイプ': type,
                value: val,
                '補正値': val,
                desc: desc,
                '解説': desc,
                category: category,
                'カテゴリ': category,
                imageUrl: imgUrl,
                '画像URL': imgUrl
            };
        });

        // 4. ボス (bosses)
        const rawBosses = Array.isArray(data.bosses) ? data.bosses : [];
        rawData.bosses = rawBosses.map(b => ({
            ...b,
            grade: String(b['学年'] || b.grade || ''),
            unit: String(b['単元'] || b.unit || ''),
            name: String(b['ボス名'] || b.name || b.bossName || 'Boss'),
            hp: Number(b['ボスHP'] !== undefined ? b['ボスHP'] : (b.hp !== undefined ? b.hp : (b.bossHP !== undefined ? b.bossHP : 3000))),
            icon: convertDriveUrl(b['ボス画像（絵文字等）'] || b['ボス画像'] || b.icon || '👾'),
            bgmUrl: String(b.bgmUrl || b['bgmUrl'] || '')
        }));

        // 5. ランダムボス (randomBoss / randomBosses)
        const rawRBoss = Array.isArray(data.randomBoss) ? data.randomBoss : (Array.isArray(data.randomBosses) ? data.randomBosses : []);
        rawData.randomBosses = rawRBoss.map(b => ({
            ...b,
            grade: String(b.grade || b['学年'] || ''),
            name: String(b.name || b['名前'] || ''),
            hp: Number(b.hp !== undefined ? b.hp : (b['HP'] !== undefined ? b['HP'] : 3000)),
            icon: convertDriveUrl(b.icon || b['アイコン'] || '👾'),
            bgmUrl: String(b.bgmUrl || b['bgmUrl'] || '')
        }));
        rawData.randomBoss = rawData.randomBosses;

        // 6. ショップ (shop / shopItems)
        const rawShop = Array.isArray(data.shop) ? data.shop : (Array.isArray(data.shopItems) ? data.shopItems : []);
        rawData.shopItems = rawShop.map(i => ({
            ...i,
            id: String(i.ID !== undefined ? i.ID : (i.id !== undefined ? i.id : '')),
            ID: String(i.ID !== undefined ? i.ID : (i.id !== undefined ? i.id : '')),
            name: String(i['アイテム名'] || i.name || 'Item'),
            price: Number(i['価格'] !== undefined ? i['価格'] : (i.price !== undefined ? i.price : 1000)),
            type: String(i['タイプ'] || i.type || 'ATK'),
            value: Number(i['効果値'] !== undefined ? i['効果値'] : (i.value !== undefined ? i.value : 0.1)),
            desc: String(i['説明'] || i.desc || ''),
            icon: String(i['アイコン'] || i.icon || '🎁')
        }));
        rawData.shop = rawData.shopItems;

        // 7. ギフト (gift / gifts)
        const rawGifts = Array.isArray(data.gift) ? data.gift : (Array.isArray(data.gifts) ? data.gifts : []);
        rawData.gifts = rawGifts.map(g => ({
            ...g,
            id: String(g.ID !== undefined ? g.ID : (g.id !== undefined ? g.id : '')),
            title: String(g['タイトル'] || g.title || ''),
            message: String(g['メッセージ'] || g.message || ''),
            exp: Number(g.EXP !== undefined ? g.EXP : (g.exp !== undefined ? g.exp : 0))
        }));
        rawData.gift = rawData.gifts;

        // 8. コンフィグ (config)
        const cfgObj = data.config || {};
        rawData.config = cfgObj;
        // 後方互換エミュレーション: 配列メソッド（filter, some 等）の呼び出しを安全に処理
        if (typeof cfgObj === 'object' && !Array.isArray(cfgObj)) {
            const virtualList = (cfgObj.bannerMessage || cfgObj.message) ? [{
                message: cfgObj.bannerMessage || cfgObj.message || '',
                grade: cfgObj.activeGrade || '',
                subject: cfgObj.activeSubject || '',
                unit: cfgObj.activeUnit || ''
            }] : [];
            Object.defineProperties(rawData.config, {
                filter: { value: (fn) => virtualList.filter(fn), writable: true, configurable: true },
                some: { value: (fn) => virtualList.some(fn), writable: true, configurable: true },
                forEach: { value: (fn) => virtualList.forEach(fn), writable: true, configurable: true },
                find: { value: (fn) => virtualList.find(fn), writable: true, configurable: true },
                length: { value: virtualList.length, writable: true, configurable: true }
            });
        }

        // 9. ボス討伐魔人キャラ枠（未登録の場合の自動補完）
        if (rawData.bosses && rawData.characters) {
            rawData.bosses.forEach(b => {
                const bossCharId = "boss_" + b.name;
                if (!rawData.characters.find(c => String(c.id) === bossCharId)) {
                    rawData.characters.push({
                        id: bossCharId,
                        ID: bossCharId,
                        name: "【魔人】" + b.name,
                        '名前': "【魔人】" + b.name,
                        rarity: "UR",
                        'レア': "UR",
                        type: "ALL",
                        'タイプ': "ALL",
                        value: 1.3,
                        '補正値': 1.3,
                        desc: "かつて立ちはだかった強敵。今は頼もしい味方だ。",
                        '解説': "かつて立ちはだかった強敵。今は頼もしい味方だ。",
                        imageUrl: b.icon,
                        '画像URL': b.icon
                    });
                }
            });
        }

        // ゼロ埋めエイリアス（"001" -> "1"）の解決マップを生成
        normalizeCharacterDictionary();

        // スタディエル復元（UR成体および動的ID chara_... の冪等登録）
        if (typeof window !== 'undefined' && typeof window.StudyelEngine?.restoreCharacters === 'function') {
            window.StudyelEngine.restoreCharacters();
        }

        // 復習リスト（revengeList）のクリーンアップ（存在しない過去問IDによる停止を防止）
        cleanupMissingRevengeIds();

        if (!rawData.questions || rawData.questions.length === 0) throw new Error("問題データが見つかりません。");
        document.getElementById('loading-screen')?.classList.add('hidden');
        document.getElementById('title-screen')?.classList.remove('hidden');

        if (typeof window.checkTitles === 'function') window.checkTitles();
        if (typeof window.checkAdminGifts === 'function') window.checkAdminGifts();

        console.log(`[SQ-Data] 読込完了: 通常${data.questionCount || rawData.questions.length}問 / タイピング${data.typingCount || rawData.typing.length}問 / キャラ${rawData.characters.length}体 (更新: ${data.updatedAt || 'N/A'})`);
    } catch(e) {
        console.error('[SQ-Data] データフェッチ失敗:', e);
        const errBox = document.getElementById('error-message');
        if (errBox) {
            errBox.innerText = e.message;
            errBox.style.display = 'block';
        }
    }
}

/**
 * キャラクターIDのゼロ埋め解決辞書を生成
 */
function normalizeCharacterDictionary() {
    if (!Array.isArray(rawData.characters)) return;
    const aliasMap = {};
    rawData.characters.forEach(c => {
        const strId = (c.id || c.ID || '').toString();
        if (strId) {
            aliasMap[strId] = c;
            const numId = parseInt(strId, 10);
            if (!isNaN(numId)) {
                aliasMap[('000' + numId).slice(-3)] = c; // "001", "002"...
            }
        }
    });
    rawData.characterMap = aliasMap;
}

/**
 * 存在しない問題IDを復習リストから除外
 */
function cleanupMissingRevengeIds() {
    if (!gameState || !Array.isArray(gameState.revengeList)) return;
    const validIds = new Set((rawData.questions || []).map(q => q.id));
    gameState.revengeList = gameState.revengeList.filter(id => validIds.has(id));
}

function generateStringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i) | 0;
    return hash;
}
