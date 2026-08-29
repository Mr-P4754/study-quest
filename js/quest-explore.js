// ==========================================
// js/quest-explore.js (探索・ローグライクエンジン)
// ==========================================

import {
    gameState,
    playData,
    rawData,
    rogueData,
    runtimeState,
    ROGUE_TILES,
    saveGame
} from './state.js';

import {
    playSE,
    playBGM,
    stopBGM
} from './utils.js';

import {
    updateUI,
    startCountdown
} from './battle-core.js';

import {
    showAppModal,
    showAlert,
    showConfirm
} from './ui-manager.js';

export function startRogueMode() {
    const g = document.getElementById('rogue-grade-select')?.value;
    if(!g) return alert("学年を選択してください");
    let qList = (rawData.questions || []).filter(q => q.grade == g && q.choices && q.choices.length >= 2 && q.subject !== 'タイピング' && q.unit !== 'タイピング');
    if(qList.length === 0) return alert("問題がありません");

    playData.rogueQuestions = qList;
    playData.isTyping = false;
    playData.isCalculation = false;
    playData.isSurvival = false;
    playData.isRandom = false;
    playData.isRevenge = false;
    
    if (typeof window !== 'undefined' && typeof window.handleTypingInput === 'function') {
        document.removeEventListener('keydown', window.handleTypingInput);
    }

    rogueData.floor = 1;
    rogueData.earnedXp = 0;
    rogueData.exploreLevel = 1;
    rogueData.atkBuff = 1.0;
    rogueData.bonusSteps = 0;
    rogueData.maxLives = 3;
    rogueData.active = true;
    rogueData.isAnimating = false;
    rogueData.shopBought = false;
    gameState.lives = rogueData.maxLives;
    
    document.getElementById('rogue-menu-overlay')?.classList.add('hidden');
    document.getElementById('title-screen')?.classList.add('hidden');
    document.getElementById('game-screen')?.classList.add('hidden');
    document.getElementById('field-screen')?.classList.remove('hidden');
    document.getElementById('cat-special-overlay')?.classList.add('hidden');
    
    if (typeof window !== 'undefined' && !window.rogueKeyHandlerRegistered) {
        window.addEventListener('keydown', (e) => {
            if (!rogueData.active || 
                !document.getElementById('game-screen')?.classList.contains('hidden') ||
                !document.getElementById('rogue-shop-overlay')?.classList.contains('hidden') ||
                !document.getElementById('app-modal-overlay')?.classList.contains('hidden') ||
                !document.getElementById('result-overlay')?.classList.contains('hidden')
            ) return;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') moveRoguePlayer(0, -1);
            if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') moveRoguePlayer(0, 1);
            if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') moveRoguePlayer(-1, 0);
            if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') moveRoguePlayer(1, 0);
        });
        window.rogueKeyHandlerRegistered = true;
    }
    
    generateRogueFloor();
    playBGM();
}

export function generateRogueFloor() {
    rogueData.maxSteps = 30 + (rogueData.bonusSteps || 0);
    rogueData.steps = rogueData.maxSteps;

    const w = rogueData.mapWidth;
    const h = rogueData.mapHeight;
    rogueData.map = Array.from({ length: h }, () => Array(w).fill(ROGUE_TILES.WALL));

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            rogueData.map[y][x] = ROGUE_TILES.FLOOR;
        }
    }

    rogueData.playerX = 1;
    rogueData.playerY = 1;
    rogueData.map[1][1] = ROGUE_TILES.VISITED;
    rogueData.shopBought = false;

    if (rogueData.floor % 5 === 0) {
        rogueData.map[5][5] = ROGUE_TILES.SHOP;
        rogueData.map[h - 2][w - 2] = ROGUE_TILES.STAIRS;
    } else {
        rogueData.map[h - 2][w - 2] = ROGUE_TILES.STAIRS;
    }

    updateRogueUI();
    drawRogueMap();
}

export function drawRogueMap() {
    const canvas = document.getElementById('rogue-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = rogueData.mapWidth * rogueData.tileSize;
    canvas.height = rogueData.mapHeight * rogueData.tileSize;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${rogueData.tileSize * 0.75}px "BIZ UDPGothic"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = 0; y < rogueData.mapHeight; y++) {
        for (let x = 0; x < rogueData.mapWidth; x++) {
            const px = x * rogueData.tileSize + rogueData.tileSize / 2;
            const py = y * rogueData.tileSize + rogueData.tileSize / 2;
            
            if (x === rogueData.playerX && y === rogueData.playerY) {
                ctx.fillText(ROGUE_TILES.PLAYER, px, py);
            } else {
                ctx.fillText(rogueData.map[y][x], px, py);
            }
        }
    }
}

export function moveRoguePlayer(dx, dy) {
    if (!rogueData.active || rogueData.isAnimating) return;
    if (!document.getElementById('game-screen')?.classList.contains('hidden')) return;
    if (!document.getElementById('rogue-shop-overlay')?.classList.contains('hidden')) return;
    if (!document.getElementById('app-modal-overlay')?.classList.contains('hidden')) return;
    if (!document.getElementById('result-overlay')?.classList.contains('hidden')) return;

    const nx = rogueData.playerX + dx;
    const ny = rogueData.playerY + dy;

    if (nx < 0 || nx >= rogueData.mapWidth || ny < 0 || ny >= rogueData.mapHeight) return;
    if (rogueData.map[ny][nx] === ROGUE_TILES.WALL) return;

    rogueData.playerX = nx;
    rogueData.playerY = ny;
    rogueData.steps--;

    const tile = rogueData.map[ny][nx];
    
    if (tile === ROGUE_TILES.FLOOR) {
        rogueData.map[ny][nx] = ROGUE_TILES.VISITED;
        triggerRogueRNGEvent();
    } else {
        processRogueTile(tile);
    }

    if (rogueData.steps <= 0 && tile !== ROGUE_TILES.STAIRS && rogueData.active && !rogueData.isAnimating && document.getElementById('game-screen')?.classList.contains('hidden')) {
        showAppModal("歩数がゼロになりました。拠点に強制送還されます。", "alert").then(() => {
            exitRogueSystem(false);
        });
        return;
    }

    updateRogueUI();
    drawRogueMap();
}

export function triggerRogueRNGEvent() {
    let eventChance = Math.min(0.8, 0.1 + (rogueData.floor * 0.05));
    if (Math.random() > eventChance) return; 

    let enemyChance = Math.min(0.8, 0.3 + (rogueData.floor * 0.05));
    
    if (Math.random() < enemyChance) {
        rogueData.isAnimating = true;
        showRogueCutIn("敵出現⚠️");
        setTimeout(() => {
            rogueData.isAnimating = false;
            triggerRogueBattle(false);
        }, 800);
    } else {
        const gimmicks = [ROGUE_TILES.FOUNTAIN, ROGUE_TILES.BOOK, ROGUE_TILES.TRAP, ROGUE_TILES.STATUE, ROGUE_TILES.CURSE];
        const g = gimmicks[Math.floor(Math.random() * gimmicks.length)];
        processRogueTile(g);
    }
}

export function processRogueTile(tile) {
    switch (tile) {
        case ROGUE_TILES.STAIRS:
            triggerRogueBattle(true);
            break;
        case ROGUE_TILES.FOUNTAIN:
            if (!rogueData.maxLives) rogueData.maxLives = 3;
            gameState.lives = Math.min(rogueData.maxLives, gameState.lives + 1);
            showRogueCutIn("ライフ❤️ +1");
            break;
        case ROGUE_TILES.BOOK:
            rogueData.exploreLevel++;
            showRogueCutIn("探索レベル📜UP");
            break;
        case ROGUE_TILES.TRAP:
            rogueData.exploreLevel = Math.max(1, rogueData.exploreLevel - 1);
            showRogueCutIn("探索レベル📜DOWN");
            break;
        case ROGUE_TILES.STATUE: {
            const buff = Math.floor(Math.random() * 5) + 1;
            rogueData.atkBuff += (buff / 100);
            showRogueCutIn(`攻撃力⚔️ +${buff}％`);
            break;
        }
        case ROGUE_TILES.CURSE: {
            const debuff = Math.floor(Math.random() * 5) + 1;
            rogueData.atkBuff = Math.max(0.1, rogueData.atkBuff - (debuff / 100));
            showRogueCutIn(`攻撃力⚔️ -${debuff}％`);
            break;
        }
        case ROGUE_TILES.SHOP:
            triggerRogueShop();
            break;
    }
}

export function triggerRogueShop() {
    const shopOverlay = document.getElementById('rogue-shop-overlay');
    if (!shopOverlay) return;
    renderRogueShopContents();
    shopOverlay.classList.remove('hidden');
}

export function closeRogueShop() {
    document.getElementById('rogue-shop-overlay')?.classList.add('hidden');
    drawRogueMap();
}

export function renderRogueShopContents() {
    const xpSpan = document.getElementById('rogue-shop-xp');
    if (xpSpan) xpSpan.innerText = rogueData.earnedXp;

    const list = document.getElementById('rogue-shop-list');
    if (!list) return;

    if (rogueData.shopBought) {
        list.innerHTML = `
            <div style="text-align:center; padding: 20px; font-weight:bold; color:#7f8c8d;">
                この階層の商品は購入済みです。<br>次の階層に進むと再度購入できます。
            </div>
        `;
        return;
    }

    const items = [
        { id: 'heal', name: '全回復ポーション', icon: '🧪', desc: 'ライフを最大まで回復する', cost: 1000 },
        { id: 'step', name: '加速の巻物', icon: '📜', desc: '最大歩数を永続的に +10 する', cost: 1500 },
        { id: 'atk', name: '力の秘薬', icon: '🍷', desc: '攻撃力を永続的に +20% 強化する', cost: 2000 }
    ];

    list.innerHTML = items.map(item => `
        <div class="shop-item">
            <div class="shop-icon">${item.icon}</div>
            <div class="shop-info">
                <div class="shop-name">${item.name}</div>
                <div class="shop-desc">${item.desc}</div>
            </div>
            <div class="shop-right">
                <button class="shop-buy-btn" onclick="buyRogueShopItem('${item.id}', ${item.cost})" ${rogueData.earnedXp < item.cost ? 'disabled' : ''}>
                    ${item.cost} XP
                </button>
            </div>
        </div>
    `).join('');
}

export function buyRogueShopItem(id, cost) {
    if (rogueData.shopBought) return alert("この階層ではすでにアイテムを購入しています。");
    if (rogueData.earnedXp < cost) return alert("獲得XPが足りません！");

    rogueData.earnedXp -= cost;
    rogueData.shopBought = true;

    if (id === 'heal') {
        gameState.lives = rogueData.maxLives || 3;
        alert("ライフが全回復しました！");
    } else if (id === 'step') {
        rogueData.bonusSteps = (rogueData.bonusSteps || 0) + 10;
        rogueData.maxSteps += 10;
        rogueData.steps += 10;
        alert("歩数上限が +10 増加しました！");
    } else if (id === 'atk') {
        rogueData.atkBuff += 0.20;
        alert("攻撃力が +20% 強化されました！");
    }

    updateRogueUI();
    renderRogueShopContents();
}

export function triggerRogueBattle(isBoss) {
    rogueData.isBossBattle = isBoss;
    playData.questions = [...playData.rogueQuestions].sort(() => Math.random() - 0.5);
    playData.qIndex = 0;
    playData.isRevenge = false;
    playData.isRandom = false;
    playData.isTyping = false;
    playData.isCalculation = false;
    playData.isSurvival = false;
    playData.activeOaths = [];
    playData.activeReliefs = [];

    runtimeState.isGameActive = false;
    runtimeState.isPaused = false;
    gameState.score = 0;
    gameState.combo = 0;

    gameState.maxTime = 10;
    gameState.timeLeft = 10;
    
    let hpScale = 1 + (rogueData.floor * 0.1);
    if (isBoss) {
        gameState.maxHP = Math.floor(3000 * hpScale);
    } else {
        gameState.maxHP = Math.floor(1000 * hpScale);
    }
    gameState.enemyHP = gameState.maxHP;

    const uienemyName = document.getElementById('ui-enemy-name');
    const enemyIcon = document.getElementById('ui-enemy-icon');

    if (isBoss) {
        if (uienemyName) uienemyName.innerText = `FLOOR ${rogueData.floor} BOSS`;
        if (enemyIcon) enemyIcon.innerText = "🐉";
        playData.rogueEnemyCharId = null;
    } else {
        let charaPool = (rawData.characters || []).filter(c => c && !String(c.id).startsWith('boss_'));
        let chosenChara = null;
        if (charaPool.length > 0) {
            chosenChara = charaPool[Math.floor(Math.random() * charaPool.length)];
        }

        if (chosenChara) {
            playData.rogueEnemyCharId = chosenChara.id;
            if (uienemyName) uienemyName.innerText = chosenChara.name;
            if (enemyIcon) {
                if (chosenChara.imageUrl && chosenChara.imageUrl.startsWith('http')) {
                    enemyIcon.innerHTML = `<img src="${chosenChara.imageUrl}" style="max-height:100%;max-width:100%;">`;
                } else {
                    enemyIcon.innerText = "👾";
                }
            }
        } else {
            playData.rogueEnemyCharId = null;
            if (uienemyName) uienemyName.innerText = `FLOOR ${rogueData.floor} ENEMY`;
            if (enemyIcon) enemyIcon.innerText = "👾";
        }
    }

    const enemyBox = document.querySelector('.enemy-visual-box');
    if (enemyBox) {
        enemyBox.classList.remove('anim-paused');
        enemyBox.classList.remove('fade-out');
    }

    document.getElementById('field-screen')?.classList.add('hidden');
    document.getElementById('game-screen')?.classList.remove('hidden');

    updateUI();
    startCountdown();
}

export function showRogueCutIn(text) {
    const container = document.getElementById('rogue-canvas-container');
    if (!container) return;
    const d = document.createElement('div');
    d.className = 'cutin rogue-cutin';
    d.innerText = text;
    container.appendChild(d);
    setTimeout(() => d.remove(), 1200);
}

export function updateRogueUI() {
    const lifeEl = document.getElementById('rogue-life');
    if (lifeEl) lifeEl.innerText = '❤️'.repeat(Math.max(0, gameState.lives));

    const floorEl = document.getElementById('rogue-floor');
    if (floorEl) floorEl.innerText = rogueData.floor;

    const stepsEl = document.getElementById('rogue-steps');
    if (stepsEl) stepsEl.innerText = `${rogueData.steps}/${rogueData.maxSteps}`;

    const expLvEl = document.getElementById('rogue-explv');
    if (expLvEl) expLvEl.innerText = rogueData.exploreLevel;

    const xpEl = document.getElementById('rogue-ctxp');
    if (xpEl) xpEl.innerText = rogueData.earnedXp;
}

export async function escapeRogueConfirm() {
    if (await showConfirm("探索を終了して拠点に帰還しますか？\n（獲得したEXPを持ち帰ることができます）")) {
        exitRogueSystem(true);
    }
}

export function exitRogueSystem(isSuccess) {
    rogueData.active = false;
    stopBGM();
    document.getElementById('field-screen')?.classList.add('hidden');
    document.getElementById('game-screen')?.classList.add('hidden');
    document.getElementById('rogue-shop-overlay')?.classList.add('hidden');
    document.getElementById('title-screen')?.classList.remove('hidden');

    if (isSuccess) {
        gameState.xp += rogueData.earnedXp;
        saveGame();
        showAlert(`無事に帰還しました！\n獲得XP: +${rogueData.earnedXp}`);
    } else {
        showAlert("探索失敗...\n獲得XPは破棄されました。");
    }

    if (typeof updateTitleInfo === 'function') updateTitleInfo();
}
