// ==========================================
// js/gacha-shop.js (ガチャ・図鑑・育成・ショップ・実績)
// ==========================================

import {
    gameState,
    rawData,
    dailyMissions,
    runtimeState,
    RARITY_CAPS,
    EVO_COST_XP,
    EVO_STOCK_REQ,
    REBORN_COST_XP,
    RARITY_ORDER,
    LV_BONUS_RATE,
    EXP_REQ,
    MAT_EXP,
    SELL_PRICES,
    LOGIN_BONUS_EXP,
    MAX_ITEM_LEVEL,
    MASTER_COUNT,
    TITLES,
    MISSIONS,
    MISSION_ALL_CLEAR,
    saveGame
} from './state.js';

import {
    getRarityIndex,
    getDisplayName
} from './utils.js';

import {
    showAppModal,
    showAlert,
    showConfirm,
    updateTitleInfo,
    hideCurrentCategoryOverlay,
    returnToCurrentCategory,
    updateCategoryBadges
} from './ui-manager.js';

// ==========================================
// ガチャ＆図鑑
// ==========================================
export function openGacha() { 
    hideCurrentCategoryOverlay();
    document.getElementById('gacha-overlay')?.classList.remove('hidden'); 
    renderZukan(); 
    const xpSpan = document.getElementById('gacha-xp');
    if (xpSpan) xpSpan.innerText = gameState.xp; 
}

export function closeGacha() { 
    document.getElementById('gacha-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function rollGacha(count) {
    const cost = count === 10 ? 30000 : 3000;
    if (gameState.xp < cost) return alert("EXPが足りません！");
    gameState.xp -= cost;
    const results = [];
    const pool = rawData.characters ? rawData.characters.filter(c => c && !String(c.id).startsWith('boss_')) : [];
    if (pool.length === 0) return alert("キャラデータがありません");
    
    for (let i = 0; i < count; i++) {
        const rand = Math.random() * 100;
        let targetRarity = 'N';
        if (rand < 1) targetRarity = 'UR';
        else if (rand < 6) targetRarity = 'SSR';
        else if (rand < 26) targetRarity = 'SR';
        else if (rand < 66) targetRarity = 'R';
        
        let rarityPool = pool.filter(c => c.rarity === targetRarity);
        if (rarityPool.length === 0) rarityPool = pool;
        const chara = rarityPool[Math.floor(Math.random() * rarityPool.length)];
        results.push(chara);
        
        if (!gameState.charaInventory[chara.id]) {
            gameState.charaInventory[chara.id] = { level: 1, count: 1, exp: 0, currentRarity: chara.rarity };
        } else {
            gameState.charaInventory[chara.id].count++;
        }
    }
    
    gameState.stats.totalPlay = (gameState.stats.totalPlay || 0) + 1;
    updateMissionProgress('gacha', count);
    saveGame();
    showGachaResult(results);
    renderZukan();
    const gXp = document.getElementById('gacha-xp');
    if(gXp) gXp.innerText = gameState.xp;
    checkTitles();
}

export function rollGuaranteedTenGacha(targetRarity, cost) {
    if (gameState.xp < cost) return alert("EXPが足りません！");
    gameState.xp -= cost;
    const results = [];
    const pool = rawData.characters ? rawData.characters.filter(c => c && !String(c.id).startsWith('boss_')) : [];
    if (pool.length === 0) return alert("キャラデータがありません");
    
    for (let i = 0; i < 9; i++) {
        const rand = Math.random() * 100;
        let r = 'N';
        if (rand < 1) r = 'UR';
        else if (rand < 6) r = 'SSR';
        else if (rand < 26) r = 'SR';
        else if (rand < 66) r = 'R';
        
        let rarityPool = pool.filter(c => c.rarity === r);
        if (rarityPool.length === 0) rarityPool = pool;
        const chara = rarityPool[Math.floor(Math.random() * rarityPool.length)];
        results.push(chara);
        
        if (!gameState.charaInventory[chara.id]) {
            gameState.charaInventory[chara.id] = { level: 1, count: 1, exp: 0, currentRarity: chara.rarity };
        } else {
            gameState.charaInventory[chara.id].count++;
        }
    }
    
    let guaranteedPool = pool.filter(c => c.rarity === targetRarity);
    if (guaranteedPool.length === 0) guaranteedPool = pool;
    const lastChara = guaranteedPool[Math.floor(Math.random() * guaranteedPool.length)];
    results.push(lastChara);
    
    if (!gameState.charaInventory[lastChara.id]) {
        gameState.charaInventory[lastChara.id] = { level: 1, count: 1, exp: 0, currentRarity: lastChara.rarity };
    } else {
        gameState.charaInventory[lastChara.id].count++;
    }
    
    gameState.stats.totalPlay = (gameState.stats.totalPlay || 0) + 1;
    updateMissionProgress('gacha', 10);
    saveGame();
    showGachaResult(results);
    renderZukan();
    const gXp = document.getElementById('gacha-xp');
    if(gXp) gXp.innerText = gameState.xp;
    checkTitles();
}

export function showGachaResult(charas) {
    const container = document.getElementById('gr-container');
    if (!container) return;
    if (charas.length === 1) {
        const c = charas[0];
        let imgTag = "";
        if (c.imageUrl && c.imageUrl.startsWith('http')) {
            imgTag = `<img src="${c.imageUrl}" style="width:100px;height:100px;object-fit:contain;margin:10px auto;display:block;">`;
        } else {
            imgTag = `<div style="font-size:60px;margin:10px 0;">✏️</div>`;
        }
        container.innerHTML = `
            <div class="gacha-result-card">
                <div class="rarity-${c.rarity}" style="font-size:1.5em; font-weight:bold;">${c.rarity}</div>
                ${imgTag}
                <div style="font-size:1.2em; font-weight:bold; color:#2c3e50;">${c.name}</div>
                <div style="font-size:0.85em; color:#7f8c8d; margin-top:5px;">${c.desc || ''}</div>
            </div>
        `;
    } else {
        let gridHtml = `<div class="gr-grid">`;
        charas.forEach((c, index) => {
            let imgTag = "";
            if (c.imageUrl && c.imageUrl.startsWith('http')) {
                imgTag = `<img src="${c.imageUrl}" class="gr-mini-img">`;
            } else {
                imgTag = `<div style="font-size:30px; margin:5px 0;">✏️</div>`;
            }
            const isLast = (index === 9);
            const extraStyle = isLast ? 'border: 2px solid #f1c40f; background: #fffbe6;' : '';
            gridHtml += `
                <div class="gr-mini-card" style="${extraStyle}">
                    <div class="rarity-${c.rarity}" style="font-size:0.8em; font-weight:bold;">${c.rarity}</div>
                    ${imgTag}
                    <div style="font-size:0.75em; font-weight:bold; color:#2c3e50; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${c.name}</div>
                </div>
            `;
        });
        gridHtml += `</div>`;
        container.innerHTML = gridHtml;
    }
    document.getElementById('gacha-result-overlay')?.classList.remove('hidden');
}

export function closeGachaResult() { 
    document.getElementById('gacha-result-overlay')?.classList.add('hidden'); 
}

export function renderZukan() {
    const grid = document.getElementById('zukan-grid');
    if (!grid || !rawData.characters) return;
    grid.innerHTML = '';
    
    let list = [...rawData.characters];
    
    const filter = runtimeState.zukanCurrentFilter || 'ALL';
    if (filter !== 'ALL') {
        list = list.filter(c => {
            const inv = gameState.charaInventory[c.id];
            const skills = (inv && inv.skills && inv.skills.length > 0) ? inv.skills : [c.type];
            return skills.includes(filter);
        });
    }
    
    const sort = runtimeState.zukanCurrentSort || 'default';
    list.sort((a, b) => {
        const invA = gameState.charaInventory[a.id];
        const invB = gameState.charaInventory[b.id];
        const rA = invA?.currentRarity || a.rarity;
        const rB = invB?.currentRarity || b.rarity;
        
        if (sort === 'rarity_desc') return getRarityIndex(rB) - getRarityIndex(rA);
        if (sort === 'rarity_asc') return getRarityIndex(rA) - getRarityIndex(rB);
        if (sort === 'level') return (invB?.level || 0) - (invA?.level || 0);
        if (sort === 'stock') return (invB?.count || 0) - (invA?.count || 0);
        if (sort === 'type') return (a.type || '').localeCompare(b.type || '');
        return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
    });
    
    list.forEach(c => {
        const inv = gameState.charaInventory[c.id];
        const isOwned = !!inv;
        const isEquipped = String(gameState.equipped) === String(c.id);
        const currentR = inv?.currentRarity || c.rarity;
        const isMastered = inv && inv.count >= MASTER_COUNT;
        
        let cardClass = `char-card ${isOwned ? 'owned' : ''} ${isEquipped ? 'active' : ''} ${isMastered ? 'mastered' : ''}`;
        let imgHtml = (c.imageUrl && c.imageUrl.startsWith('http')) 
            ? `<img src="${c.imageUrl}" class="char-img">` 
            : `<div style="font-size:30px; margin-bottom:4px;">✏️</div>`;
            
        let badgeHtml = isOwned ? `<div class="char-lvl-badge">Lv.${inv.level}</div>` : '';
        let stockHtml = (isOwned && inv.count > 0) ? `<div class="char-stock-badge">${isMastered ? '★' : ''}${inv.count}</div>` : '';
        let nameHtml = getDisplayName(c, inv);
        
        grid.innerHTML += `
            <div class="${cardClass}" onclick="openCharaDetail('${c.id}')">
                ${badgeHtml}
                ${stockHtml}
                ${imgHtml}
                <div class="rarity-${currentR}" style="font-weight:bold; font-size:0.8em;">${currentR}</div>
                <div style="font-weight:bold; color:#2c3e50; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${nameHtml}</div>
            </div>
        `;
    });
}

export function changeZukanSort() {
    const sel = document.getElementById('zukan-sort-select');
    if (!sel) return;
    runtimeState.zukanCurrentSort = sel.value;
    renderZukan();
}

// ==========================================
// キャラ詳細・強化合成・進化・転生
// ==========================================
export function openCharaDetail(id) {
    const c = rawData.characters ? rawData.characters.find(x => String(x.id) === String(id)) : null;
    if (!c) return;
    runtimeState.viewingCharaId = id;
    const inv = gameState.charaInventory[id];
    const isOwned = !!inv;
    const currentR = inv?.currentRarity || c.rarity;
    const maxL = RARITY_CAPS[currentR] || 10;
    const lv = inv ? inv.level : 0;
    const exp = inv ? (Number(inv.exp) || 0) : 0;
    const stock = inv ? inv.count : 0;
    
    const cdName = document.getElementById('cd-name');
    if (cdName) cdName.innerHTML = getDisplayName(c, inv);
    const cdRarity = document.getElementById('cd-rarity');
    if (cdRarity) {
        cdRarity.className = `rarity-${currentR} mb-10`;
        cdRarity.innerText = currentR;
    }
    const cdImg = document.getElementById('cd-img');
    if (cdImg) {
        if (c.imageUrl && c.imageUrl.startsWith('http')) {
            cdImg.src = c.imageUrl;
            cdImg.style.display = 'block';
        } else {
            cdImg.style.display = 'none';
        }
    }
    
    const cdLv = document.getElementById('cd-lv');
    if (cdLv) cdLv.innerText = `Lv.${lv} / ${maxL}`;
    const cdExpBar = document.getElementById('cd-exp-bar');
    if (cdExpBar) cdExpBar.style.width = `${Math.min(100, (exp / EXP_REQ) * 100)}%`;
    const cdExpText = document.getElementById('cd-exp-text');
    if (cdExpText) cdExpText.innerText = `${exp} / ${EXP_REQ}`;
    
    const skills = (inv && inv.skills && inv.skills.length > 0) ? inv.skills : [c.type];
    const cdType = document.getElementById('cd-type');
    if (cdType) {
        cdType.innerHTML = `<div class="skill-tag-container">${skills.map(s => `<span class="skill-tag ${s}">${s}</span>`).join('')}</div>`;
    }
    
    const baseVal = (inv && inv.isEvolved && inv.customValue) ? inv.customValue : Number(c.value);
    const finalVal = baseVal + (lv * LV_BONUS_RATE);
    const cdVal = document.getElementById('cd-val');
    if (cdVal) cdVal.innerText = `x${finalVal.toFixed(2)}`;
    
    const cdStock = document.getElementById('cd-stock');
    if (cdStock) cdStock.innerText = `${stock}個`;
    const cdDesc = document.getElementById('cd-desc');
    if (cdDesc) cdDesc.innerText = c.desc || "説明文なし";
    
    const btnEquip = document.getElementById('btn-equip');
    const btnEnhance = document.getElementById('btn-enhance');
    const btnSell = document.getElementById('btn-sell');
    
    if (btnEquip) btnEquip.disabled = !isOwned;
    if (btnEnhance) btnEnhance.disabled = !isOwned || lv >= maxL;
    if (btnSell) btnSell.disabled = !isOwned || stock <= 1;
    
    renderEvoContainer(c, inv);
    document.getElementById('chara-detail-overlay')?.classList.remove('hidden');
}

export function closeCharaDetail() {
    document.getElementById('chara-detail-overlay')?.classList.add('hidden');
    runtimeState.viewingCharaId = null;
}

export function equipCurrentChara() {
    if (!runtimeState.viewingCharaId) return;
    gameState.equipped = String(runtimeState.viewingCharaId);
    saveGame();
    updateTitleInfo();
    renderZukan();
    alert("装備を変更しました！");
    closeCharaDetail();
}

export function renderEvoContainer(chara, inv) {
    const container = document.getElementById('evo-container');
    if (!container || !inv) {
        if(container) container.classList.add('hidden');
        return;
    }
    
    const currentR = inv.currentRarity || chara.rarity;
    const maxL = RARITY_CAPS[currentR] || 10;
    const canEvolve = (inv.level >= maxL && inv.count >= EVO_STOCK_REQ && currentR !== 'UR');
    const canReborn = (currentR === 'UR' && inv.level >= maxL);
    
    if (!canEvolve && !canReborn) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    
    container.classList.remove('hidden');
    if (canEvolve) {
        const nextR = RARITY_ORDER[getRarityIndex(currentR) + 1];
        const cost = EVO_COST_XP[currentR] || 100000;
        container.innerHTML = `
            <button class="evo-btn btn-evolution" onclick="executeEvolution('${chara.id}')">
                ✨ 限界突破・進化 (${nextR})<br>
                <small>在庫 ${EVO_STOCK_REQ}個 + ${cost} XP</small>
            </button>
        `;
    } else if (canReborn) {
        container.innerHTML = `
            <button class="evo-btn btn-reincarnation" onclick="executeReincarnation('${chara.id}')">
                🪽 転生を行う<br>
                <small>${REBORN_COST_XP} XP を消費して更なる高みへ</small>
            </button>
        `;
    }
}

export async function executeEvolution(id) {
    const c = rawData.characters ? rawData.characters.find(x => String(x.id) === String(id)) : null;
    const inv = gameState.charaInventory[id];
    if (!c || !inv) return;
    
    const currentR = inv.currentRarity || c.rarity;
    const cost = EVO_COST_XP[currentR] || 100000;
    if (gameState.xp < cost) return alert("進化に必要なXPが足りません！");
    if (inv.count < EVO_STOCK_REQ) return alert("進化に必要な在庫数が足りません！");
    
    if (!await showConfirm(`このキャラを進化させますか？\nレアリティが上がり、Lv上限が解放されます。\n（在庫 ${EVO_STOCK_REQ}個と ${cost} XPを消費）`)) return;
    
    gameState.xp -= cost;
    inv.count -= EVO_STOCK_REQ;
    const nextR = RARITY_ORDER[getRarityIndex(currentR) + 1];
    inv.currentRarity = nextR;
    inv.isEvolved = true;
    
    gameState.stats.achieved_evolve = true;
    saveGame();
    alert(`進化成功！ ${c.name} は [${nextR}] に進化しました！`);
    openCharaDetail(id);
    renderZukan();
    updateTitleInfo();
    checkTitles();
}

export async function executeReincarnation(id) {
    const c = rawData.characters ? rawData.characters.find(x => String(x.id) === String(id)) : null;
    const inv = gameState.charaInventory[id];
    if (!c || !inv) return;
    
    if (gameState.xp < REBORN_COST_XP) return alert("転生に必要なXPが足りません！");
    if (!await showConfirm(`【転生】を行いますか？\nLv.1に戻りますが、追加スキルを獲得し永続強化されます。\n（消費: ${REBORN_COST_XP} XP）`)) return;
    
    gameState.xp -= REBORN_COST_XP;
    inv.level = 1;
    inv.exp = 0;
    inv.reincarnationCount = (inv.reincarnationCount || 0) + 1;
    
    if (!inv.skills) inv.skills = [c.type];
    const availableSkills = ['ATK', 'TIME', 'EXP'].filter(s => !inv.skills.includes(s));
    if (availableSkills.length > 0) {
        const newSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
        inv.skills.push(newSkill);
    }
    
    gameState.stats.achieved_reborn = true;
    saveGame();
    alert(`転生完了！ ${c.name} は転生し、新たな力を宿しました！`);
    openCharaDetail(id);
    renderZukan();
    updateTitleInfo();
    checkTitles();
}

export function openEnhanceMenu() {
    if (!runtimeState.viewingCharaId) return;
    runtimeState.selectedMaterialIds = [];
    document.getElementById('material-select-overlay')?.classList.remove('hidden');
    renderMaterialList();
    updateEnhancePreview();
}

export function closeEnhanceMenu() {
    document.getElementById('material-select-overlay')?.classList.add('hidden');
    runtimeState.selectedMaterialIds = [];
}

export function renderMaterialList() {
    const container = document.getElementById('material-list');
    if (!container) return;
    container.innerHTML = '';
    
    const targetId = String(runtimeState.viewingCharaId);
    
    // アイテム（書物）素材の表示
    const books = [
        { type: 'redPages', name: '赤のページ', exp: 50, count: gameState.inventory?.redPages || 0, icon: '📕' },
        { type: 'bluePages', name: '青のページ', exp: 50, count: gameState.inventory?.bluePages || 0, icon: '📘' },
        { type: 'xpBookSmall', name: '知識の書(小)', exp: 200, count: gameState.inventory?.xpBookSmall || 0, icon: '📗' },
        { type: 'xpBookMedium', name: '知識の書(中)', exp: 500, count: gameState.inventory?.xpBookMedium || 0, icon: '📙' },
        { type: 'xpBookLarge', name: '知識の書(大)', exp: 1200, count: gameState.inventory?.xpBookLarge || 0, icon: '📓' }
    ];
    
    books.forEach(b => {
        if (b.count > 0) {
            const isSel = runtimeState.selectedMaterialIds.includes(b.type);
            container.innerHTML += `
                <div class="mat-card ${isSel ? 'selected' : ''}" onclick="toggleMaterialSelection('${b.type}')">
                    <div style="font-size:2.0em;">${b.icon}</div>
                    <div style="font-weight:bold;">${b.name}</div>
                    <div style="color:#7f8c8d;">所持: ${b.count}</div>
                    <div style="color:#27ae60; font-weight:bold;">+${b.exp}EXP</div>
                </div>
            `;
        }
    });
    
    // 不要キャラ素材の表示
    Object.keys(gameState.charaInventory).forEach(id => {
        if (id === targetId) return;
        const inv = gameState.charaInventory[id];
        if (!inv || inv.count <= 0) return;
        const c = rawData.characters ? rawData.characters.find(x => String(x.id) === String(id)) : null;
        if (!c) return;
        
        const isSel = runtimeState.selectedMaterialIds.includes(id);
        const currentR = inv.currentRarity || c.rarity;
        const expVal = MAT_EXP[currentR] || 25;
        
        let imgHtml = (c.imageUrl && c.imageUrl.startsWith('http'))
            ? `<img src="${c.imageUrl}" style="width:40px;height:40px;object-fit:contain;">`
            : `<div style="font-size:24px;">✏️</div>`;
            
        container.innerHTML += `
            <div class="mat-card ${isSel ? 'selected' : ''}" onclick="toggleMaterialSelection('${id}')">
                ${imgHtml}
                <div class="rarity-${currentR}" style="font-weight:bold;">${currentR}</div>
                <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
                <div style="color:#7f8c8d;">在庫: ${inv.count}</div>
                <div style="color:#27ae60; font-weight:bold;">+${expVal}EXP</div>
            </div>
        `;
    });
}

export function toggleMaterialSelection(id) {
    if (runtimeState.selectedMaterialIds.includes(id)) {
        runtimeState.selectedMaterialIds = runtimeState.selectedMaterialIds.filter(x => x !== id);
    } else {
        runtimeState.selectedMaterialIds.push(id);
    }
    renderMaterialList();
    updateEnhancePreview();
}

export function updateEnhancePreview() {
    let totalExp = 0;
    runtimeState.selectedMaterialIds.forEach(id => {
        if (id === 'redPages' || id === 'bluePages') totalExp += 50;
        else if (id === 'xpBookSmall') totalExp += 200;
        else if (id === 'xpBookMedium') totalExp += 500;
        else if (id === 'xpBookLarge') totalExp += 1200;
        else {
            const inv = gameState.charaInventory[id];
            const c = rawData.characters ? rawData.characters.find(x => String(x.id) === String(id)) : null;
            if (inv && c) {
                const r = inv.currentRarity || c.rarity;
                totalExp += (MAT_EXP[r] || 25);
            }
        }
    });
    
    const expSpan = document.getElementById('enhance-total-exp');
    if (expSpan) expSpan.innerText = totalExp;
    
    const targetInv = gameState.charaInventory[runtimeState.viewingCharaId];
    const targetMaster = rawData.characters ? rawData.characters.find(x => String(x.id) === String(runtimeState.viewingCharaId)) : null;
    
    const lvPrev = document.getElementById('enhance-lv-preview');
    if (lvPrev && targetInv && targetMaster) {
        const maxL = RARITY_CAPS[targetInv.currentRarity || targetMaster.rarity] || 10;
        let simExp = (Number(targetInv.exp) || 0) + totalExp;
        let simLv = targetInv.level;
        while (simExp >= EXP_REQ && simLv < maxL) {
            simExp -= EXP_REQ;
            simLv++;
        }
        lvPrev.innerText = `Lv.${targetInv.level} → Lv.${simLv}`;
    }
}

export async function executeBulkEnhance() {
    if (runtimeState.selectedMaterialIds.length === 0) return alert("強化素材を選択してください。");
    const targetInv = gameState.charaInventory[runtimeState.viewingCharaId];
    const targetMaster = rawData.characters ? rawData.characters.find(x => String(x.id) === String(runtimeState.viewingCharaId)) : null;
    if (!targetInv || !targetMaster) return;
    
    let totalExp = 0;
    runtimeState.selectedMaterialIds.forEach(id => {
        if (id === 'redPages') { gameState.inventory.redPages--; totalExp += 50; }
        else if (id === 'bluePages') { gameState.inventory.bluePages--; totalExp += 50; }
        else if (id === 'xpBookSmall') { gameState.inventory.xpBookSmall--; totalExp += 200; }
        else if (id === 'xpBookMedium') { gameState.inventory.xpBookMedium--; totalExp += 500; }
        else if (id === 'xpBookLarge') { gameState.inventory.xpBookLarge--; totalExp += 1200; }
        else {
            const inv = gameState.charaInventory[id];
            const c = rawData.characters ? rawData.characters.find(x => String(x.id) === String(id)) : null;
            if (inv && c) {
                const r = inv.currentRarity || c.rarity;
                totalExp += (MAT_EXP[r] || 25);
                inv.count--;
                if (inv.count <= 0) delete gameState.charaInventory[id];
            }
        }
    });
    
    const maxL = RARITY_CAPS[targetInv.currentRarity || targetMaster.rarity] || 10;
    targetInv.exp = (Number(targetInv.exp) || 0) + totalExp;
    while (targetInv.exp >= EXP_REQ && targetInv.level < maxL) {
        targetInv.exp -= EXP_REQ;
        targetInv.level++;
    }
    if (targetInv.level >= maxL) targetInv.exp = 0;
    
    updateMissionProgress('enhance', 1);
    saveGame();
    alert("強化が完了しました！");
    closeEnhanceMenu();
    openCharaDetail(runtimeState.viewingCharaId);
    renderZukan();
    updateTitleInfo();
    checkTitles();
}

export async function sellCharaStock() {
    const id = runtimeState.viewingCharaId;
    const inv = gameState.charaInventory[id];
    const c = rawData.characters ? rawData.characters.find(x => String(x.id) === String(id)) : null;
    if (!inv || !c || inv.count <= 1) return alert("売却できる余剰在庫がありません。");
    
    const r = inv.currentRarity || c.rarity;
    const price = SELL_PRICES[r] || 250;
    
    if (!await showConfirm(`余剰在庫を1個売却して ${price} XP に変換しますか？\n（残り在庫: ${inv.count - 1}個になります）`)) return;
    
    inv.count--;
    gameState.xp += price;
    saveGame();
    alert(`売却完了！ +${price} XP を獲得しました。`);
    openCharaDetail(id);
    renderZukan();
    updateTitleInfo();
    checkTitles();
}

// ==========================================
// ショップ
// ==========================================
export function openShop() { 
    hideCurrentCategoryOverlay();
    document.getElementById('shop-overlay')?.classList.remove('hidden'); 
    renderShop(); 
}

export function closeShop() { 
    document.getElementById('shop-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function renderShop() {
    const list = document.getElementById('shop-list');
    const xpSpan = document.getElementById('shop-xp');
    if (xpSpan) xpSpan.innerText = gameState.xp;
    if (!list || !rawData.shopItems) return;
    
    list.innerHTML = '';
    rawData.shopItems.forEach(item => {
        const lv = gameState.itemLevels[item.id] || 0;
        const isMax = lv >= MAX_ITEM_LEVEL;
        const cost = item.price * (lv + 1);
        const canBuy = gameState.xp >= cost && !isMax;
        
        list.innerHTML += `
            <div class="shop-item">
                <div class="shop-icon">${item.icon}</div>
                <div class="shop-info">
                    <div class="shop-name">${item.name}</div>
                    <div class="shop-desc">${item.desc}</div>
                </div>
                <div class="shop-right">
                    <div class="shop-level-tag">Lv.${lv}/${MAX_ITEM_LEVEL}</div>
                    <button class="shop-buy-btn" onclick="buyShopItem('${item.id}', ${cost})" ${!canBuy ? 'disabled' : ''}>
                        ${isMax ? 'MAX' : cost + ' XP'}
                    </button>
                </div>
            </div>
        `;
    });
}

export function buyShopItem(id, cost) {
    const item = rawData.shopItems ? rawData.shopItems.find(x => String(x.id) === String(id)) : null;
    if (!item) return;
    if (gameState.xp < cost) return alert("XPが足りません！");
    
    const curLv = gameState.itemLevels[id] || 0;
    if (curLv >= MAX_ITEM_LEVEL) return alert("すでに最大レベルです。");
    
    gameState.xp -= cost;
    gameState.itemLevels[id] = curLv + 1;
    updateMissionProgress('shop', 1);
    saveGame();
    renderShop();
    updateTitleInfo();
    checkTitles();
}

// ==========================================
// ミッション・称号・ログインボーナス
// ==========================================
export function openMissions() { 
    hideCurrentCategoryOverlay();
    document.getElementById('mission-overlay')?.classList.remove('hidden'); 
    renderMissions(); 
}

export function closeMissions() { 
    document.getElementById('mission-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function renderMissions() { 
    const l = document.getElementById('mission-list'); 
    if(!l) return; 
    l.innerHTML = ''; 
    let all = true; 
    MISSIONS.forEach(m => { 
        const p = dailyMissions.progress[m.id] || 0; 
        const fin = p >= m.target; 
        const clm = dailyMissions.claimed[m.id]; 
        if(!fin) all = false; 
        l.innerHTML += `
            <div class="mission-item">
                <div class="mission-title">
                    <span>${m.title}</span>
                    <span class="mission-reward">+${m.reward} XP</span>
                </div>
                <div class="text-xs text-gray mt-5">${m.desc}</div>
                <div class="mission-progress-bg">
                    <div class="mission-progress-fill" style="width:${Math.min(100, (p / m.target) * 100)}%;"></div>
                </div>
                <button class="mission-btn ${fin && !clm ? 'active' : 'disabled'}" onclick="claimMission('${m.id}', ${m.reward})">
                    ${clm ? '受取済' : (fin ? '報酬を受け取る' : `進行中 (${p}/${m.target})`)}
                </button>
            </div>
        `; 
    }); 
    if(all) { 
        const isClaimed = dailyMissions.claimed.allClear;
        let btnStyle = isClaimed ? '' : 'background:#f1c40f; border-color:#d35400;'; 
        let btnClass = isClaimed ? 'disabled' : ''; 
        let btnText = isClaimed ? '受取済' : `${MISSION_ALL_CLEAR} EXPを受け取る`;
        let btnAction = isClaimed ? '' : 'onclick="claimAllClear()"';
        l.innerHTML += `
            <div style="margin-top:10px; padding:10px; background:#fef5e7; border:2px solid #e67e22; border-radius:10px;">
                <div style="font-weight:bold; color:#e67e22;">🎉 オールクリアボーナス</div>
                <button class="mission-btn ${btnClass}" style="width:100%; margin-top:5px; ${btnStyle}" ${btnAction}>
                    ${btnText}
                </button>
            </div>
        `; 
    } 
}

export function claimMission(id, r) { 
    if(dailyMissions.claimed[id]) return; 
    dailyMissions.claimed[id] = true; 
    gameState.xp += r; 
    saveGame(); 
    renderMissions(); 
    updateTitleInfo(); 
    updateMissionBadge(); 
    alert(r + " XP を獲得しました！"); 
}

export function claimAllClear() { 
    if(dailyMissions.claimed.allClear) return; 
    dailyMissions.claimed.allClear = true; 
    gameState.xp += MISSION_ALL_CLEAR; 
    saveGame(); 
    renderMissions(); 
    updateTitleInfo(); 
    updateMissionBadge(); 
    alert(MISSION_ALL_CLEAR + " XP を獲得しました！"); 
}

export function updateMissionProgress(t, v) { 
    if(t === 'maxCombo') dailyMissions.progress[t] = Math.max(dailyMissions.progress[t] || 0, v); 
    else dailyMissions.progress[t] = (dailyMissions.progress[t] || 0) + v; 
    saveGame(); 
    updateMissionBadge(); 
}

export function updateMissionBadge() { 
    let c = 0; 
    MISSIONS.forEach(m => { 
        if((dailyMissions.progress[m.id] || 0) >= m.target && !dailyMissions.claimed[m.id]) c++; 
    }); 
    document.getElementById('mission-badge')?.classList.toggle('hidden', c === 0); 
    updateCategoryBadges();
}

export function openTitles() { 
    hideCurrentCategoryOverlay();
    document.getElementById('titles-overlay')?.classList.remove('hidden'); 
    renderTitles(); 
}

export function closeTitles() { 
    document.getElementById('titles-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function renderTitles() {
    const list = document.getElementById('titles-list'); 
    if(!list) return; 
    list.innerHTML = '';
    let collectionCount = 0; 
    let hasSSR = false; 
    let hasUR = false; 
    let hasLvMax = false; 
    let hasMastered = false;
    
    if(gameState.charaInventory) {
        collectionCount = Object.keys(gameState.charaInventory).length;
        Object.keys(gameState.charaInventory).forEach(id => {
            const c = rawData.characters ? rawData.characters.find(x => x.id === id) : null;
            const inv = gameState.charaInventory[id];
            if(c && c.rarity === 'SSR') hasSSR = true;
            if(c && c.rarity === 'UR') hasUR = true;
            if(inv && inv.level >= 20) hasLvMax = true;
            if(inv && inv.count >= MASTER_COUNT) hasMastered = true;
        });
    }

    TITLES.forEach(t => {
        const isClaimed = gameState.unlockedTitles.includes(t.id); 
        let isUnlocked = false;
        if (isClaimed) isUnlocked = true;
        else {
            if (t.req.includes('collection') && collectionCount >= t.val) isUnlocked = true;
            else if (t.req.includes('xp') && gameState.xp >= t.val) isUnlocked = true;
            else if (t.req === 'ssr' && hasSSR) isUnlocked = true;
            else if (t.req === 'ur' && hasUR) isUnlocked = true;
            else if (t.req === 'lvMax' && hasLvMax) isUnlocked = true;
            else if (t.req === 'itemMax' && Object.values(gameState.itemLevels).some(lv => lv >= MAX_ITEM_LEVEL)) isUnlocked = true;
            else if (t.req === 'perfect' && gameState.stats.achieved_perfect) isUnlocked = true;
            else if (t.req === 'speed' && gameState.stats.achieved_speed) isUnlocked = true;
            else if (t.req === 'randomClear' && gameState.stats.achieved_random) isUnlocked = true;
            else if (t.req === 'oathClear' && gameState.stats.achieved_oath) isUnlocked = true;
            else if (t.req === 'evolved' && gameState.stats.achieved_evolve) isUnlocked = true;
            else if (t.req === 'mastered' && hasMastered) isUnlocked = true;
            else if (t.req === 'reborn' && gameState.stats.achieved_reborn) isUnlocked = true;
            else if (t.req === 'calcA' && gameState.stats.achieved_calcA) isUnlocked = true;
            else { 
                const match = t.req.match(/^[a-zA-Z]+/);
                if(match) {
                    const key = match[0]; 
                    if ((gameState.stats[key] || 0) >= t.val) isUnlocked = true; 
                }
            }
        }
        let statusClass = isClaimed ? 'claimed' : (isUnlocked ? 'unlocked' : '');
        let btnText = isClaimed ? '受取済' : (isUnlocked ? `受取: ${t.reward}XP` : '未達成');
        let btnAction = (isUnlocked && !isClaimed) ? `onclick="claimTitle('${t.id}', ${t.reward})"` : '';
        list.innerHTML += `
            <div class="title-item ${statusClass}">
                <div class="title-header">
                    <span class="title-name">${t.name}</span>
                    <button class="title-reward-btn" ${btnAction}>${btnText}</button>
                </div>
                <div class="title-req">${t.desc}</div>
            </div>
        `;
    });
}

export function claimTitle(id, reward) {
    if(gameState.unlockedTitles.includes(id)) return;
    gameState.unlockedTitles.push(id); 
    gameState.xp += reward; 
    saveGame(); 
    renderTitles(); 
    updateTitleInfo(); 
    checkTitles();
    alert(`称号を獲得しました！\n報酬: ${reward} XP`);
}

export function checkTitles() {
    let count = 0; 
    let collectionCount = 0; 
    let hasSSR = false; 
    let hasUR = false; 
    let hasLvMax = false; 
    let hasMastered = false;
    
    if(gameState.charaInventory && rawData.characters && rawData.characters.length > 0) {
        collectionCount = Object.keys(gameState.charaInventory).length;
        Object.keys(gameState.charaInventory).forEach(id => {
            const c = rawData.characters.find(x => x.id === id); 
            const inv = gameState.charaInventory[id];
            if(c && c.rarity === 'SSR') hasSSR = true;
            if(c && c.rarity === 'UR') hasUR = true;
            if(inv && inv.level >= 20) hasLvMax = true;
            if(inv && inv.count >= MASTER_COUNT) hasMastered = true;
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
        else if (t.req === 'ur' && hasUR) cleared = true;
        else if (t.req === 'lvMax' && hasLvMax) cleared = true;
        else if (t.req === 'itemMax' && hasItemMax) cleared = true;
        else if (t.req === 'randomClear' && gameState.stats.achieved_random) cleared = true;
        else if (t.req === 'oathClear' && gameState.stats.achieved_oath) cleared = true;
        else if (t.req === 'evolved' && gameState.stats.achieved_evolve) cleared = true;
        else if (t.req === 'mastered' && hasMastered) cleared = true;
        else if (t.req === 'reborn' && gameState.stats.achieved_reborn) cleared = true;
        else if (t.req === 'calcA' && gameState.stats.achieved_calcA) cleared = true;
        else if (t.req.includes('collection')) { if (collectionCount >= t.val) cleared = true; }
        else if (t.req.includes('xp')) { if (gameState.xp >= t.val) cleared = true; }
        else { 
            try { 
                const match = t.req.match(/^[a-zA-Z]+/);
                if(match) {
                    const key = match[0];
                    const val = gameState.stats[key] || 0; 
                    if (val >= t.val) cleared = true; 
                }
            } catch(e){} 
        }
        if (cleared) count++;
    });
    const badge = document.getElementById('title-badge');
    if(badge) {
        if(count > 0) { 
            badge.classList.remove('hidden'); 
            badge.innerText = count > 9 ? '!' : count; 
        } else { 
            badge.classList.add('hidden'); 
        }
    }

    updateCategoryBadges();
}

export function checkLoginBonus() { 
    const d = new Date().toLocaleDateString('ja-JP'); 
    if(localStorage.getItem('sq_last_login') !== d){ 
        gameState.xp += LOGIN_BONUS_EXP; 
        localStorage.setItem('sq_last_login', d); 
        gameState.stats.loginDays = (gameState.stats.loginDays || 0) + 1;
        saveGame(); 
        document.getElementById('login-bonus-overlay')?.classList.remove('hidden'); 
        updateTitleInfo(); 
        checkTitles();
    } 
}

export function closeLoginBonus() { 
    document.getElementById('login-bonus-overlay')?.classList.add('hidden'); 
}

export function checkMissionDate() { 
    const d = new Date().toLocaleDateString('ja-JP'); 
    const saved = localStorage.getItem('sq_missions');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            dailyMissions.date = parsed.date || "";
            dailyMissions.progress = parsed.progress || dailyMissions.progress;
            dailyMissions.claimed = parsed.claimed || dailyMissions.claimed;
        } catch(e) {}
    }
    if(dailyMissions.date !== d){ 
        dailyMissions.date = d;
        dailyMissions.progress = { play: 0, kill: 0, correct: 0, maxCombo: 0, enhance: 0, typing: 0, calc: 0, gacha: 0, shop: 0 };
        dailyMissions.claimed = { play: false, kill: false, correct: false, maxCombo: false, enhance: false, typing: false, calc: false, gacha: false, shop: false, allClear: false };
        saveGame(); 
    } 
    updateMissionBadge(); 
}
