// ==========================================
// js/api.js (GASバックエンド通信・クラウド同期)
// ==========================================

import { API_URL, rawData, gameState, dailyMissions, runtimeState, saveGame } from './state.js?v=9.4.0';

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
        calcRecords: gameState.calcRecords
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
        const url = isDebug ? ('http://localhost:8000/sample_api.json?t=' + new Date().getTime()) : (API_URL + '?t=' + new Date().getTime());
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        const getVal = (obj, keys) => {
            for (const k of keys) {
                const v = obj[k];
                if (v !== undefined && v !== null && v !== "") return String(v);
            }
            return "";
        };
        const getFuzzyVal = (obj, keyword, defaultVal) => {
            const key = Object.keys(obj).find(k => k.includes(keyword));
            const val = key ? obj[key] : "";
            return (val !== undefined && val !== null && val !== "") ? String(val) : defaultVal;
        };
        const convertDriveUrl = (url) => {
            if (!url || !url.startsWith('http')) return url;
            if (url.includes('drive.google.com') && (url.includes('/file/d/') || url.includes('id='))) {
                let id = "";
                const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (match1) id = match1[1];
                else {
                    const match2 = url.match(/id=([a-zA-Z0-9_-]+)/);
                    if (match2) id = match2[1];
                }
                if (id) return `https://drive.google.com/thumbnail?sz=w1000&id=${id}`;
            }
            return url;
        };
        
        rawData.questions = [];
        rawData.characters = [];
        rawData.bosses = [];
        rawData.shopItems = [];
        rawData.typing = [];
        rawData.randomBosses = [];
        rawData.config = [];
        rawData.gifts = [];

        const generateHashId = (str, prefix) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i) | 0;
            return prefix + "_" + Math.abs(hash);
        };

        for (let key in data) {
            const lowerKey = key.toLowerCase();
            try {
                if (lowerKey.includes('questions') || lowerKey.includes('question')) {
                    const newQs = data[key].filter(d => d).map(q => {
                        const qText = getVal(q, ['q', 'question', '問題', '問題文']);
                        const aText = getVal(q, ['a', 'answer', '正解']);
                        let hash = 0;
                        const str = qText + aText;
                        for (let i = 0; i < str.length; i++) {
                            hash = ((hash << 5) - hash) + str.charCodeAt(i);
                            hash |= 0;
                        }
                        return {
                            id: "q_" + Math.abs(hash),
                            grade: getVal(q, ['grade', '学年']),
                            subject: getVal(q, ['subject', '教科']),
                            unit: getVal(q, ['unit', '単元']),
                            q: qText,
                            a: aText,
                            choices: q.choices ? String(q.choices).split(',') : [
                                getVal(q, ['誤答1']),
                                getVal(q, ['誤答2']),
                                getVal(q, ['誤答3']),
                                getVal(q, ['a', '正解'])
                            ].filter(x => x !== "")
                        };
                    });
                    rawData.questions = rawData.questions.concat(newQs);
                } else if (lowerKey.includes('character')) {
                    rawData.characters = data[key].filter(d => d).map(c => {
                        const name = getVal(c, ['name', '名前']) || "Unknown";
                        return {
                            id: String(c.id || c.ID || generateHashId(name, 'chara')),
                            name: name,
                            rarity: getVal(c, ['rarity', 'レア']) || "N",
                            type: getVal(c, ['type', 'タイプ']) || "ATK",
                            value: Number(getVal(c, ['value', '補正値', '効果値']) || 1.0),
                            desc: getVal(c, ['desc', '解説']),
                            imageUrl: convertDriveUrl(getVal(c, ['imageUrl', '画像URL', '画像']))
                        };
                    });
                } else if (lowerKey.includes('boss')) {
                    rawData.bosses = data[key].filter(d => d).map(b => ({
                        grade: getVal(b, ['grade', '学年']),
                        unit: getVal(b, ['unit', '単元']),
                        name: getVal(b, ['name', 'bossName', 'ボス名']) || "Boss",
                        hp: Number(getVal(b, ['hp', 'bossHP', 'ボスHP']) || 3000),
                        icon: convertDriveUrl(getFuzzyVal(b, 'ボス画像', "👾"))
                    }));
                } else if (lowerKey.includes('shop')) {
                    rawData.shopItems = data[key].filter(d => d).map(i => {
                        const name = getVal(i, ['name', 'アイテム名']) || "Item";
                        return {
                            id: String(i.id || i.ID || generateHashId(name, 'item')),
                            name: name,
                            price: Number(getVal(i, ['price', '価格']) || 1000),
                            type: getVal(i, ['type', 'タイプ']) || "ATK",
                            value: Number(getVal(i, ['value', '効果値']) || 0.1),
                            desc: getVal(i, ['desc', '説明']),
                            icon: getVal(i, ['icon', 'アイコン']) || "🎁"
                        };
                    });
                } else if (lowerKey.includes('typing')) {
                    rawData.typing = data[key].filter(d => d).map(t => ({
                        id: String(t.id || t.ID || generateHashId(getVal(t, ['japanese','日本語']), 'type')),
                        japanese: getVal(t, ['japanese', '日本語', 'display']),
                        romaji: getVal(t, ['romaji', 'ローマ字', 'input']).toLowerCase().replace(/\s+/g, ''),
                        grade: getVal(t, ['grade', '学年'])
                    })).filter(t => t.japanese && t.romaji);
                } else if (lowerKey.includes('randomboss')) {
                    rawData.randomBosses = data[key].map(b => ({...b}));
                } else if (lowerKey.includes('config')) {
                    rawData.config = data[key];
                } else if (lowerKey.includes('gift')) {
                    rawData.gifts = data[key];
                }
            } catch(e) {}
        }

        if (rawData.bosses && rawData.characters) {
            rawData.bosses.forEach(b => {
                const bossCharId = "boss_" + b.name;
                if (!rawData.characters.find(c => c.id === bossCharId)) {
                    rawData.characters.push({
                        id: bossCharId,
                        name: "【魔人】" + b.name,
                        rarity: "UR",
                        type: "ALL",
                        value: 1.3,
                        desc: "かつて立ちはだかった強敵。今は頼もしい味方だ。",
                        imageUrl: b.icon
                    });
                }
            });
        }
        if (!rawData.questions || rawData.questions.length === 0) throw new Error("Questions not found.");
        document.getElementById('loading-screen')?.classList.add('hidden');
        document.getElementById('title-screen')?.classList.remove('hidden');
        
        if (typeof window.checkTitles === 'function') window.checkTitles(); 
        if (typeof window.checkAdminGifts === 'function') window.checkAdminGifts();
    } catch(e) {
        const errBox = document.getElementById('error-message');
        if (errBox) {
            errBox.innerText = e.message;
            errBox.style.display = 'block';
        }
    }
}
