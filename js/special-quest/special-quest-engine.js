/**
 * ==========================================
 * js/special-quest/special-quest-engine.js
 * チームバトルクエスト（パーティー制バトル）エンジン
 * ==========================================
 */

import { gameState, rawData, saveGame, runtimeState, RARITY_CAPS, LV_BONUS_RATE } from '../state.js?v=10.0.1';
import { getDisplayName, playSE, playBGM, stopBGM, updateMuteButtonsUI } from '../utils.js?v=10.0.1';
import { closeAllCategoryModals, returnToCurrentCategory, showAlert, showConfirm } from '../ui-manager.js?v=10.0.1';

// ----------------------------------------------------
// 内部状態管理
// ----------------------------------------------------
let selectedPartySlot = 0; // 現在選択中の編成スロット (0: 前衛, 1: 後衛1, 2: 後衛2)
let tempParty = [null, null, null]; // 編成画面内での一時パーティー状態
let partySortMode = 'rarity_desc'; // 手持ちキャラクター一覧のソート順

/**
 * パーティー編成画面の手持ちキャラソート順を変更
 * @param {string} mode
 */
export function changePartySort(mode) {
    partySortMode = mode || 'rarity_desc';
    renderPartyZukanGrid();
}

// ----------------------------------------------------
// 画面開閉ロジック
// ----------------------------------------------------

/**
 * チームバトル出撃準備モーダルを開く
 */
export function openTeamBattleSetup() {
    closeAllCategoryModals();
    initTbGradeSelect();
    updateTeamBattleSetupPreview();
    document.getElementById('team-battle-setup-modal')?.classList.remove('hidden');
}

/**
 * チームバトル出撃準備モーダルを閉じる
 */
export function closeTeamBattleSetup() {
    document.getElementById('team-battle-setup-modal')?.classList.add('hidden');
    returnToCurrentCategory();
}

/**
 * パーティー編成モーダルを開く
 */
export function openPartyFormation() {
    // 現在のgameStateから一時パーティーへコピー
    tempParty = [
        gameState.teamParty[0] || null,
        gameState.teamParty[1] || null,
        gameState.teamParty[2] || null
    ];
    selectedPartySlot = 0;
    renderPartyFormation();
    document.getElementById('party-formation-overlay')?.classList.remove('hidden');
}

/**
 * パーティー編成モーダルを閉じる（キャンセル）
 */
export function closePartyFormation() {
    document.getElementById('party-formation-overlay')?.classList.add('hidden');
    updateTeamBattleSetupPreview();
}

/**
 * パーティー編成を保存して閉じる
 */
export function savePartyFormation() {
    gameState.teamParty = [
        tempParty[0] || null,
        tempParty[1] || null,
        tempParty[2] || null
    ];
    saveGame();
    document.getElementById('party-formation-overlay')?.classList.add('hidden');
    updateTeamBattleSetupPreview();
}

// ----------------------------------------------------
// パーティー編成の操作・描画
// ----------------------------------------------------

/**
 * 編成するスロットを選択
 * @param {number} slotIndex (0: 前衛, 1: 後衛1, 2: 後衛2)
 */
export function selectPartySlot(slotIndex) {
    if (slotIndex < 0 || slotIndex > 2) return;
    selectedPartySlot = slotIndex;
    updatePartySlotHighlights();
}

/**
 * 選択中スロットにキャラクターを配置（重複は解除・入替）
 * @param {string} charaId
 */
export function setPartyMember(charaId) {
    if (!charaId) return;
    const strId = String(charaId);

    // すでに他のスロットに同じキャラがいる場合は解除
    for (let i = 0; i < 3; i++) {
        if (tempParty[i] === strId) {
            tempParty[i] = null;
        }
    }

    // 選択中のスロットにセット
    tempParty[selectedPartySlot] = strId;

    // 次の空きスロットがあれば自動フォーカス
    const nextEmpty = tempParty.findIndex(id => id === null);
    if (nextEmpty !== -1) {
        selectedPartySlot = nextEmpty;
    }

    renderPartyFormation();
}

/**
 * 指定スロットのキャラクターを解除
 * @param {number} slotIndex
 * @param {Event} [event]
 */
export function removePartyMember(slotIndex, event) {
    if (event) {
        event.stopPropagation();
    }
    if (slotIndex >= 0 && slotIndex <= 2) {
        tempParty[slotIndex] = null;
        selectedPartySlot = slotIndex;
        renderPartyFormation();
    }
}

/**
 * パーティー編成画面の全描画
 */
export function renderPartyFormation() {
    // 1. 上部3スロットの描画
    for (let i = 0; i < 3; i++) {
        const slotEl = document.getElementById(`party-slot-${i}`);
        if (!slotEl) continue;

        const charId = tempParty[i];
        const charMaster = charId && rawData.characters ? rawData.characters.find(c => String(c.id) === String(charId)) : null;
        const invData = charId ? gameState.charaInventory[charId] : null;

        const imgEl = document.getElementById(`party-slot-${i}-img`);
        const emptyEl = document.getElementById(`party-slot-${i}-empty`);
        const infoEl = document.getElementById(`party-slot-${i}-info`);
        const nameEl = document.getElementById(`party-slot-${i}-name`);
        const rarityEl = document.getElementById(`party-slot-${i}-rarity`);
        const typeEl = document.getElementById(`party-slot-${i}-type`);
        const lvEl = document.getElementById(`party-slot-${i}-lv`);

        if (charMaster && invData) {
            slotEl.classList.add('filled');
            if (emptyEl) emptyEl.classList.add('hidden');
            if (infoEl) infoEl.classList.remove('hidden');

            const currentRarity = invData.currentRarity || charMaster.rarity || 'N';
            const lv = (typeof invData.level === 'number' && invData.level >= 1) ? invData.level : 1;
            const displayName = getDisplayName(charMaster, invData, false);

            if (imgEl) {
                if (charMaster.imageUrl && charMaster.imageUrl.startsWith('http')) {
                    imgEl.src = charMaster.imageUrl;
                    imgEl.classList.remove('hidden');
                } else {
                    imgEl.classList.add('hidden');
                }
            }

            if (nameEl) nameEl.innerText = displayName;
            if (rarityEl) {
                rarityEl.className = `rarity-${currentRarity}`;
                rarityEl.innerText = currentRarity;
            }
            if (typeEl) {
                typeEl.innerText = getTypeEmoji(charMaster.type) + ' ' + (charMaster.type || 'ATK');
            }
            if (lvEl) lvEl.innerText = `Lv.${lv}`;
        } else {
            slotEl.classList.remove('filled');
            if (emptyEl) emptyEl.classList.remove('hidden');
            if (infoEl) infoEl.classList.add('hidden');
            if (imgEl) imgEl.classList.add('hidden');
        }

        // スロットクリック時のハンドラを登録
        slotEl.onclick = () => selectPartySlot(i);

        // 削除ボタンのハンドラを登録
        const removeBtn = slotEl.querySelector('.party-slot-remove-btn');
        if (removeBtn) {
            removeBtn.onclick = (e) => removePartyMember(i, e);
        }
    }

    updatePartySlotHighlights();

    // 2. 下部手持ちキャラ一覧の描画
    renderPartyZukanGrid();
}

/**
 * 選択中スロットのハイライト枠を更新
 */
function updatePartySlotHighlights() {
    for (let i = 0; i < 3; i++) {
        const slotEl = document.getElementById(`party-slot-${i}`);
        if (!slotEl) continue;
        if (i === selectedPartySlot) {
            slotEl.style.outline = '3px solid #38bdf8';
            slotEl.style.outlineOffset = '2px';
        } else {
            slotEl.style.outline = 'none';
        }
    }
}

/**
 * 手持ちキャラクター一覧（図鑑風グリッド）の描画
 */
function renderPartyZukanGrid() {
    const grid = document.getElementById('party-zukan-grid');
    if (!grid || !rawData.characters) return;
    grid.innerHTML = '';

    // 所持キャラのみを抽出
    const ownedCharas = rawData.characters.filter(c => !!gameState.charaInventory[c.id]);

    // ソート順の適用
    const rOrder = { 'UR': 5, 'SSR': 4, 'SR': 3, 'R': 2, 'N': 1 };
    ownedCharas.sort((a, b) => {
        const invA = gameState.charaInventory[a.id];
        const invB = gameState.charaInventory[b.id];
        const rA = (invA && invA.currentRarity) ? invA.currentRarity : a.rarity;
        const rB = (invB && invB.currentRarity) ? invB.currentRarity : b.rarity;
        const lvA = (invA && typeof invA.level === 'number' && invA.level >= 1) ? invA.level : 1;
        const lvB = (invB && typeof invB.level === 'number' && invB.level >= 1) ? invB.level : 1;

        if (partySortMode === 'rarity_desc') {
            const diffR = (rOrder[rB] || 0) - (rOrder[rA] || 0);
            if (diffR !== 0) return diffR;
            return lvB - lvA;
        }
        if (partySortMode === 'rarity_asc') {
            const diffR = (rOrder[rA] || 0) - (rOrder[rB] || 0);
            if (diffR !== 0) return diffR;
            return lvA - lvB;
        }
        if (partySortMode === 'level_desc') {
            if (lvA !== lvB) return lvB - lvA;
            return (rOrder[rB] || 0) - (rOrder[rA] || 0);
        }
        if (partySortMode === 'level_asc') {
            if (lvA !== lvB) return lvA - lvB;
            return (rOrder[rA] || 0) - (rOrder[rB] || 0);
        }
        if (partySortMode === 'type') {
            const typeCompare = (a.type || '').localeCompare(b.type || '');
            if (typeCompare !== 0) return typeCompare;
            return (rOrder[rB] || 0) - (rOrder[rA] || 0);
        }
        // default (図鑑番号順)
        return Number(a.id) - Number(b.id);
    });

    ownedCharas.forEach(c => {
        const inv = gameState.charaInventory[c.id];
        const strId = String(c.id);
        const partyIndex = tempParty.indexOf(strId);
        const isSelected = partyIndex !== -1;

        const card = document.createElement('div');
        card.className = `char-card owned ${isSelected ? 'active' : ''}`;
        if (isSelected) {
            card.style.borderColor = '#f59e0b';
            card.style.background = 'rgba(245, 158, 11, 0.15)';
        }

        const currentR = (inv && inv.currentRarity) ? inv.currentRarity : c.rarity;
        const lv = (inv && typeof inv.level === 'number' && inv.level >= 1) ? inv.level : 1;
        const decoName = getDisplayName(c, inv, false);

        let badgeHtml = '';
        if (partyIndex === 0) {
            badgeHtml = '<div class="party-slot-badge" style="background:#f39c12;left:2px;top:2px;">前衛</div>';
        } else if (partyIndex === 1) {
            badgeHtml = '<div class="party-slot-badge" style="background:#3b82f6;left:2px;top:2px;">後衛1</div>';
        } else if (partyIndex === 2) {
            badgeHtml = '<div class="party-slot-badge" style="background:#8b5cf6;left:2px;top:2px;">後衛2</div>';
        }

        const visual = (c.imageUrl && c.imageUrl.startsWith('http')) 
            ? `<img src="${c.imageUrl}" class="char-img">` 
            : `<div style="font-size:2em;line-height:50px">📦</div>`;

        card.innerHTML = `
            ${badgeHtml}
            <div class="char-lvl-badge">Lv.${lv}</div>
            ${visual}
            <div style="font-weight:bold;font-size:0.75rem;margin-top:2px;"><span class="rarity-${currentR}">${currentR}</span> / ${c.type}</div>
            <div style="font-size:0.68rem; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${decoName}</div>
        `;

        card.onclick = () => setPartyMember(c.id);
        grid.appendChild(card);
    });
}

// ----------------------------------------------------
// 出撃準備画面のプレビュー描画・セレクトボックス連動
// ----------------------------------------------------

/**
 * 出撃準備画面の中央プレビュー枠を更新
 */
export function updateTeamBattleSetupPreview() {
    const container = document.getElementById('tb-setup-preview-slots');
    if (!container) return;

    const labels = ['👑 前衛', '🛡️ 後衛1', '🛡️ 後衛2'];
    let slotsHtml = '';
    let readyCount = 0;

    for (let i = 0; i < 3; i++) {
        const charId = gameState.teamParty[i];
        const charMaster = charId && rawData.characters ? rawData.characters.find(c => String(c.id) === String(charId)) : null;
        const invData = charId ? gameState.charaInventory[charId] : null;

        if (charMaster && invData) {
            readyCount++;
            const currentR = invData.currentRarity || charMaster.rarity || 'N';
            const lv = (typeof invData.level === 'number' && invData.level >= 1) ? invData.level : 1;
            const displayName = getDisplayName(charMaster, invData, false);
            const imgTag = (charMaster.imageUrl && charMaster.imageUrl.startsWith('http'))
                ? `<img src="${charMaster.imageUrl}" class="tb-mini-slot-img">`
                : `<div style="font-size:1.6rem;line-height:36px;">📦</div>`;

            slotsHtml += `
                <div class="tb-mini-slot ${i === 0 ? 'main' : ''}" onclick="openPartyFormation()">
                    <div style="font-size:0.6rem; font-weight:bold; color:#64748b;">${labels[i]}</div>
                    ${imgTag}
                    <div class="tb-mini-slot-name">${displayName}</div>
                    <div style="font-size:0.62rem; color:#64748b;"><span class="rarity-${currentR}">${currentR}</span> Lv.${lv}</div>
                </div>
            `;
        } else {
            slotsHtml += `
                <div class="tb-mini-slot ${i === 0 ? 'main' : ''}" style="border-style:dashed; cursor:pointer;" onclick="openPartyFormation()">
                    <div style="font-size:0.6rem; font-weight:bold; color:#94a3b8;">${labels[i]}</div>
                    <div style="font-size:1.6rem; color:#94a3b8; line-height:36px;">➕</div>
                    <div class="tb-mini-slot-name" style="color:#94a3b8;">未設定</div>
                </div>
            `;
        }
    }

    container.innerHTML = slotsHtml;

    // 出撃ボタンの活性・非活性制御（3体セット完了しているか）
    const startBtn = document.getElementById('tb-start-battle-btn');
    if (startBtn) {
        if (readyCount === 3) {
            startBtn.removeAttribute('disabled');
            startBtn.style.opacity = '1.0';
            startBtn.style.cursor = 'pointer';
        } else {
            startBtn.setAttribute('disabled', 'true');
            startBtn.style.opacity = '0.5';
            startBtn.style.cursor = 'not-allowed';
        }
    }
}

/**
 * 学年セレクトボックス初期化
 */
export function initTbGradeSelect() {
    const sel = document.getElementById('tb-grade-select');
    if (!sel || !rawData.questions) return;
    const grades = [...new Set(rawData.questions.map(q => q.grade))].filter(g => g);
    sel.innerHTML = '<option value="">学年を選択...</option>';
    grades.forEach(g => {
        sel.innerHTML += `<option value="${g}">${g}</option>`;
    });
    filterTbSubjects();
}

/**
 * 教科セレクトボックスの絞り込み
 */
export function filterTbSubjects() {
    const g = document.getElementById('tb-grade-select')?.value;
    const subSel = document.getElementById('tb-subject-select');
    const uSel = document.getElementById('tb-unit-select');
    if (!subSel || !uSel) return;

    subSel.innerHTML = '<option value="">教科を選択...</option>';
    uSel.innerHTML = '<option value="">単元を選択...</option>';
    if (!g || !rawData.questions) return;

    const subjects = [...new Set(rawData.questions.filter(q => q.grade == g).map(q => q.subject))].filter(s => s);
    subjects.forEach(s => {
        subSel.innerHTML += `<option value="${s}">${s}</option>`;
    });
    filterTbUnits();
}

/**
 * 単元セレクトボックスの絞り込み
 */
export function filterTbUnits() {
    const g = document.getElementById('tb-grade-select')?.value;
    const s = document.getElementById('tb-subject-select')?.value;
    const uSel = document.getElementById('tb-unit-select');
    if (!uSel) return;

    uSel.innerHTML = '<option value="">単元を選択...</option>';
    if (!g || !s || !rawData.questions) return;

    const units = [...new Set(rawData.questions.filter(q => q.grade == g && q.subject == s).map(q => q.unit))].filter(u => u);
    units.forEach(u => {
        uSel.innerHTML += `<option value="${u}">${u}</option>`;
    });
}

/**
 * 属性に応じた絵文字を返すヘルパー
 * @param {string} type
 * @returns {string}
 */
export function getTypeEmoji(type) {
    if (!type) return '⚔️';
    const upper = type.toUpperCase();
    if (upper.includes('FIRE') || upper.includes('炎') || upper.includes('ATK')) return '🔥';
    if (upper.includes('WATER') || upper.includes('水') || upper.includes('TIME')) return '💧';
    if (upper.includes('THUNDER') || upper.includes('雷') || upper.includes('EXP')) return '⚡';
    if (upper.includes('ALL')) return '🌈';
    return '⚔️';
}

/**
 * 属性スキル配列を絵文字なしのすっきりとした文字列にフォーマット
 * 例: ['ATK', 'EXP'] -> 'ATK・EXP'
 * 例: ['TIME'] -> 'TIME'
 * 例: ['ALL'] -> 'ALL'
 * @param {string|string[]} skills
 * @returns {string}
 */
export function formatSkillsText(skills) {
    const rawList = Array.isArray(skills) 
        ? skills 
        : (typeof skills === 'string' ? skills.split('・') : ['ATK']);
    
    return rawList.map(s => normalizeType(s)).join('・');
}

// ====================================================
// チームバトル戦闘コアロジック (リアルタイム・相性バトル)
// ====================================================

/**
 * チームバトルの進行状態管理オブジェクト
 */
export const tbState = {
    isActive: false,
    isPaused: false,
    stage: 1,
    maxStage: 3,
    party: [],          // 3体の自陣キャラクター情報
    activeSlot: 0,      // 現在戦闘中のキャラインデックス (0, 1, 2)
    enemy: null,        // 現在の対戦相手
    questions: [],      // クイズ問題プール
    qIndex: 0,
    currentQuestion: null,
    score: 0,
    earnedXp: 0,
    defeatedEnemies: [],// 倒した敵キャラクター一覧
    gameLoopTimer: null,
    timeLeft: 10,
    maxTime: 10,
    tickCount: 0
};

/**
 * キャラクターごとのステータス倍率（ATK, TIME, EXP）を算出する関数
 * @param {Object} partyMember
 * @returns {{ atk: number, time: number, exp: number }}
 */
export function getTbCharaStats(partyMember) {
    let stats = { atk: 1.0, time: 1.0, exp: 1.0 };
    if (!partyMember) return stats;

    const charaData = partyMember.master;
    const userChara = partyMember.inv;

    if (charaData && userChara) {
        const level = (typeof userChara.level === 'number' && userChara.level >= 1) ? userChara.level : 1;
        const baseVal = (userChara.isEvolved && userChara.customValue) ? Number(userChara.customValue) : Number(charaData.value || 1.0);
        const finalVal = baseVal + (level * LV_BONUS_RATE);
        const skills = (userChara.skills && userChara.skills.length > 0) ? userChara.skills : [charaData.type || 'ATK'];

        skills.forEach(type => {
            if (type === 'ALL') {
                stats.atk = finalVal;
                stats.time = finalVal;
                stats.exp = finalVal;
            } else {
                if (type === 'ATK') stats.atk = finalVal;
                if (type === 'TIME') stats.time = finalVal;
                if (type === 'EXP') stats.exp = finalVal;
            }
        });
    }

    // ショップ装備アイテムによるステータス加算（通常クエストと同様）
    if (gameState.itemLevels && rawData.shopItems) {
        Object.keys(gameState.itemLevels).forEach(itemId => {
            const item = rawData.shopItems.find(i => String(i.id) === String(itemId));
            const level = gameState.itemLevels[itemId];
            if (item && level > 0) {
                if (item.type === 'ATK') stats.atk += (Number(item.value) * level);
                if (item.type === 'TIME') stats.time += (Number(item.value) * level);
                if (item.type === 'EXP') stats.exp += (Number(item.value) * level);
            }
        });
    }

    return stats;
}

/**
 * 最大HP算出関数
 * 計算式: Math.floor(1000 * 補正値(value)) + (レベル - 1) * 50
 * @param {Object} target
 * @param {boolean} [isEnemy=false]
 * @returns {number}
 */
export function calcTbMaxHp(target, isEnemy = false) {
    if (!target) return 1000;
    let val = Number(target.value) || 1.0;
    if (!isEnemy && target.isEvolved && target.customValue) {
        val = Number(target.customValue) || val;
    }
    const lv = Number(target.level) || 1;
    return Math.floor(1000 * val) + (lv - 1) * 50;
}

/**
 * 属性リストの展開処理（ALL を ATK, TIME, EXP に展開）
 * @param {string|string[]} skills
 * @returns {{ expanded: string[], hasAll: boolean }}
 */
export function expandTbSkills(skills) {
    const rawList = Array.isArray(skills) 
        ? skills 
        : (typeof skills === 'string' ? skills.split('・') : ['ATK']);
    
    let hasAll = false;
    const expanded = [];

    rawList.forEach(s => {
        const norm = normalizeType(s);
        if (norm === 'ALL') {
            hasAll = true;
            if (!expanded.includes('ATK')) expanded.push('ATK');
            if (!expanded.includes('TIME')) expanded.push('TIME');
            if (!expanded.includes('EXP')) expanded.push('EXP');
        } else {
            if (!expanded.includes(norm)) expanded.push(norm);
        }
    });

    if (expanded.length === 0) expanded.push('ATK');
    return { expanded, hasAll };
}

/**
 * 属性相性倍率の決定（複数属性およびALL属性の相性計算・攻撃/防御対応）
 * @param {string|string[]} attackerSkills
 * @param {string|string[]} defenderSkills
 * @param {boolean} [isAttacking=true] 攻撃時(true)か防御時(false)か
 * @returns {number}
 */
export function getTbAffinityMultiplier(attackerSkills, defenderSkills, isAttacking = true) {
    const a = expandTbSkills(attackerSkills);
    const d = expandTbSkills(defenderSkills);

    if (isAttacking) {
        // 【攻撃時】全所持属性 vs 防御側の全属性で判定し、最も高い倍率（最大値）を採用
        let maxMulti = 0;
        for (const aType of a.expanded) {
            for (const dType of d.expanded) {
                const multi = calcSingleAffinityMultiplier(aType, dType);
                if (multi > maxMulti) maxMulti = multi;
            }
        }
        // 攻撃側に ALL が含まれる場合、1.25倍未満なら1.25倍に補正（1.5倍は維持）
        if (a.hasAll && maxMulti < 1.25) {
            maxMulti = 1.25;
        }
        return maxMulti > 0 ? maxMulti : 1.0;
    } else {
        // 【防御時（被ダメージ時）】敵の攻撃属性 vs 防御側の全属性で判定し、最も低い倍率（最小値・耐性）を採用
        let minMulti = 999;
        for (const aType of a.expanded) {
            for (const dType of d.expanded) {
                const multi = calcSingleAffinityMultiplier(aType, dType);
                if (multi < minMulti) minMulti = multi;
            }
        }
        if (minMulti === 999) minMulti = 1.0;
        // 防御側に ALL が含まれる場合、0.75倍を超えていれば0.75倍に抑制（0.5倍は維持）
        if (d.hasAll && minMulti > 0.75) {
            minMulti = 0.75;
        }
        return minMulti;
    }
}

/**
 * 単一属性同士の相性倍率計算（3すくみ基本ルール）
 * @param {string} attackerType
 * @param {string} defenderType
 * @returns {number}
 */
function calcSingleAffinityMultiplier(attackerType, defenderType) {
    const a = normalizeType(attackerType);
    const d = normalizeType(defenderType);

    // 同一属性
    if (a === d) return 1.0;

    // 3すくみ判定 (ATK(炎) > TIME(水) > EXP(雷) > ATK(炎))
    if (a === 'ATK' && d === 'TIME') return 1.5;
    if (a === 'TIME' && d === 'EXP') return 1.5;
    if (a === 'EXP' && d === 'ATK') return 1.5;

    if (a === 'ATK' && d === 'EXP') return 0.5;
    if (a === 'TIME' && d === 'ATK') return 0.5;
    if (a === 'EXP' && d === 'TIME') return 0.5;

    return 1.0;
}

/**
 * 属性文字列を標準形式（ATK / TIME / EXP / ALL）に正規化
 * @param {string} type
 * @returns {string}
 */
function normalizeType(type) {
    if (!type) return 'ATK';
    const upper = type.toUpperCase();
    if (upper.includes('ALL')) return 'ALL';
    if (upper.includes('TIME') || upper.includes('水')) return 'TIME';
    if (upper.includes('EXP') || upper.includes('雷')) return 'EXP';
    return 'ATK'; // デフォルトはATK(炎)
}

/**
 * 前衛相性ナビUI用のテキストとクラスを返すヘルパー（攻撃・防御相性補正表示）
 * @param {string|string[]} playerSkills
 * @param {string|string[]} enemySkills
 * @returns {{ text: string, className: string, visible: boolean }}
 */
export function getTbAffinityInfo(playerSkills, enemySkills) {
    const atkMulti = getTbAffinityMultiplier(playerSkills, enemySkills, true);
    const defMulti = getTbAffinityMultiplier(enemySkills, playerSkills, false);

    const isAdvantage = (atkMulti > 1.0 || defMulti < 1.0);
    const isDisadvantage = (atkMulti < 1.0 || defMulti > 1.0);

    if (isAdvantage) {
        return { 
            text: `相性:○ ⚔×${atkMulti}/🛡×${defMulti}`, 
            className: 'advantage', 
            visible: true 
        };
    } else if (isDisadvantage) {
        return { 
            text: `相性:△ ⚔×${atkMulti}/🛡×${defMulti}`, 
            className: 'disadvantage', 
            visible: true 
        };
    } else {
        // 攻防ともに等倍 (1.0倍) の時は非表示
        return { text: '', className: '', visible: false };
    }
}

/**
 * 敵からアクティブな味方への基本ダメージ（ペナルティの基準値）計算
 * 計算式: Math.floor(30 * 敵の補正値(value) * 敵のレベル補正 * 属性相性倍率[防御側耐性採用])
 * @param {Object} enemy
 * @param {Object} activePlayer
 * @returns {number}
 */
export function calcTbTickDamage(enemy, activePlayer) {
    if (!enemy || !activePlayer) return 30;
    const val = Number(enemy.value) || 1.0;
    const lv = Number(enemy.level) || 1;
    const lvScale = 1 + (lv - 1) * 0.05;
    const affinity = getTbAffinityMultiplier(enemy.skills || enemy.type, activePlayer.skills || activePlayer.type, false);
    return Math.max(1, Math.floor(30 * val * lvScale * affinity));
}

// ----------------------------------------------------
// バトル開始・ステージ進行
// ----------------------------------------------------

/**
 * チームバトルを開始する（出撃準備画面から呼び出し）
 */
export function startTeamBattle() {
    const g = document.getElementById('tb-grade-select')?.value;
    const s = document.getElementById('tb-subject-select')?.value;
    const u = document.getElementById('tb-unit-select')?.value;

    if (!g) return alert("学年を選択してください。");

    // 問題の抽出
    let qList = (rawData.questions || []).filter(q => {
        if (q.grade != g) return false;
        if (s && q.subject != s) return false;
        if (u && q.unit != u) return false;
        return q.choices && q.choices.length >= 2;
    });

    if (qList.length === 0) {
        // 単元指定で問題がなければ学年全体からフォールバック
        qList = (rawData.questions || []).filter(q => q.grade == g && q.choices && q.choices.length >= 2);
    }
    if (qList.length === 0) return alert("該当する問題がありません。");

    // パーティーのチェック（3体揃っているか）
    const partyIds = gameState.teamParty;
    if (!partyIds[0] || !partyIds[1] || !partyIds[2]) {
        return alert("パーティーを3体編成してください。");
    }

    // 味方3体の戦闘データ初期化
    tbState.party = [];
    for (let i = 0; i < 3; i++) {
        const charId = String(partyIds[i]);
        const cMaster = rawData.characters ? rawData.characters.find(c => String(c.id) === charId) : null;
        const inv = gameState.charaInventory[charId];
        if (!cMaster || !inv) return alert("パーティーキャラクターのデータが見つかりません。");

        const lv = (typeof inv.level === 'number' && inv.level >= 1) ? inv.level : 1;
        const currentRarity = inv.currentRarity || cMaster.rarity || 'N';
        const skills = (inv && inv.skills && inv.skills.length > 0) ? inv.skills : [cMaster.type || 'ATK'];
        const typeStr = skills.join('・');
        const value = (inv.isEvolved && inv.customValue) ? Number(inv.customValue) : Number(cMaster.value || 1.0);
        const name = getDisplayName(cMaster, inv, false);
        const maxHp = calcTbMaxHp({ value, level: lv, isEvolved: inv.isEvolved, customValue: inv.customValue }, false);

        tbState.party.push({
            slotIndex: i,
            charId,
            master: cMaster,
            inv,
            level: lv,
            rarity: currentRarity,
            skills,
            type: typeStr,
            value,
            name,
            imageUrl: cMaster.imageUrl,
            maxHp,
            hp: maxHp,
            isAlive: true
        });
    }

    // バトル状態初期化
    tbState.isActive = true;
    tbState.isPaused = false;
    tbState.stage = 1;
    tbState.maxStage = 3;
    tbState.activeSlot = 0;
    tbState.questions = [...qList].sort(() => Math.random() - 0.5);
    tbState.qIndex = 0;
    tbState.score = 0;
    tbState.earnedXp = 0;
    tbState.tickCount = 0;
    tbState.defeatedEnemies = [];

    // 画面切り替え
    document.getElementById('team-battle-setup-modal')?.classList.add('hidden');
    document.getElementById('title-screen')?.classList.add('hidden');
    document.getElementById('tb-pause-overlay')?.classList.add('hidden');
    document.getElementById('team-battle-screen')?.classList.remove('hidden');

    // ステージ1の敵をセットアップ
    setupTbStage(1);

    // BGM開始
    playBGM();

    // 最初の問題出題
    nextTbQuestion();

    // リアルタイムゲームループ開始 (100ms周期)
    if (tbState.timerId) clearInterval(tbState.timerId);
    tbState.timerId = setInterval(tbGameLoop, 100);

    // 3秒前カウントダウンカットイン開始（開始演出中は時間・操作を完全ロック）
    showTbCountdownCutIn(1);
}

/**
 * 戦闘開始前・敵変更時の3秒前カウントダウンカットイン
 * @param {number} stageNum
 * @returns {Promise<void>}
 */
export function showTbCountdownCutIn(stageNum) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('tb-countdown-overlay');
        const textEl = document.getElementById('tb-countdown-text');
        if (!overlay || !textEl) {
            resolve();
            return;
        }

        // バトル一時停止（タイマー・ダメージをロック）
        tbState.isPaused = true;
        overlay.classList.remove('hidden');

        // 選択肢ボタンを一時非活性化
        const allBtns = document.querySelectorAll('#tb-ui-choices .choice-btn');
        allBtns.forEach(b => b.disabled = true);

        const steps = [
            { text: '3', se: 'count', color: '#f59e0b' },
            { text: '2', se: 'count', color: '#f59e0b' },
            { text: '1', se: 'count', color: '#f59e0b' },
            { text: `STAGE ${stageNum}\nSTART!`, se: 'hit', color: '#ef4444' }
        ];

        let stepIndex = 0;

        function runStep() {
            if (!tbState.isActive) {
                overlay.classList.add('hidden');
                resolve();
                return;
            }

            if (stepIndex >= steps.length) {
                overlay.classList.add('hidden');
                tbState.isPaused = false;
                // 選択肢ボタンを再活性化
                const btns = document.querySelectorAll('#tb-ui-choices .choice-btn');
                btns.forEach(b => b.disabled = false);
                resolve();
                return;
            }

            const cur = steps[stepIndex];
            textEl.innerText = cur.text;
            textEl.style.color = cur.color;
            textEl.style.textShadow = `0 0 25px ${cur.color}, 0 4px 12px rgba(0,0,0,0.9)`;

            // アニメーションを再トリガー
            textEl.style.animation = 'none';
            void textEl.offsetWidth; // リフロー
            textEl.style.animation = 'tbCountdownPop 0.85s ease-out forwards';

            playSE(cur.se);
            stepIndex++;
            setTimeout(runStep, 850);
        }

        runStep();
    });
}

/**
 * チームバトル用：ステージ番号に応じた敵キャラクターのレア度決定
 * STAGE 1: N: 70% / R: 25% / SR: 5% / SSR: 0% / UR: 0%
 * STAGE 2: N: 30% / R: 50% / SR: 18% / SSR: 2% / UR: 0%
 * STAGE 3: N: 0% / R: 40% / SR: 45% / SSR: 13% / UR: 2%
 * @param {number} stageNum
 * @returns {string}
 */
export function getTbStageEnemyRarity(stageNum) {
    const rand = Math.random();
    if (stageNum === 1) {
        if (rand < 0.05) return 'SR';
        if (rand < 0.30) return 'R';
        return 'N';
    } else if (stageNum === 2) {
        if (rand < 0.02) return 'SSR';
        if (rand < 0.20) return 'SR';
        if (rand < 0.70) return 'R';
        return 'N';
    } else {
        // STAGE 3
        if (rand < 0.02) return 'UR';
        if (rand < 0.15) return 'SSR';
        if (rand < 0.60) return 'SR';
        return 'R';
    }
}

/**
 * 指定ステージの敵キャラクターを生成・配置（図鑑キャラからランダム抽出）
 * @param {number} stageNum
 */
function setupTbStage(stageNum) {
    tbState.stage = stageNum;

    // 敵レベルと補正倍率の計算
    const enemyLevel = stageNum * 5 + 5; // Stage 1: Lv.10, Stage 2: Lv.15, Stage 3: Lv.20

    // rawData.characters からステージ別レア度確率テーブルに従ってキャラクターを抽出
    const availableCharas = (rawData.characters && rawData.characters.length > 0) ? rawData.characters : [];
    let pickedChar = null;
    if (availableCharas.length > 0) {
        // ステージ別のレア度抽選
        const targetRarity = getTbStageEnemyRarity(stageNum);
        const candidates = availableCharas.filter(c => c.rarity === targetRarity);
        const pool = (candidates.length > 0) ? candidates : availableCharas;
        pickedChar = pool[Math.floor(Math.random() * pool.length)];
    }

    const enemyName = pickedChar ? pickedChar.name : `モンスター Lv.${enemyLevel}`;
    const assignedType = pickedChar ? (pickedChar.type || 'ATK') : ['ATK', 'TIME', 'EXP'][stageNum - 1];
    const enemyValue = (pickedChar ? Number(pickedChar.value || 1.0) : 1.0) * (0.8 + stageNum * 0.25);
    const enemyMaxHp = calcTbMaxHp({ value: enemyValue, level: enemyLevel }, true);

    tbState.enemy = {
        name: enemyName,
        level: enemyLevel,
        type: assignedType,
        skills: [assignedType],
        rarity: pickedChar ? pickedChar.rarity : 'N',
        value: enemyValue,
        maxHp: enemyMaxHp,
        hp: enemyMaxHp,
        imageUrl: pickedChar ? pickedChar.imageUrl : '',
        icon: '👾',
        master: pickedChar
    };

    // UI更新
    const progressEl = document.getElementById('tb-progress-text');
    if (progressEl) progressEl.innerText = `⚔️ STAGE ${stageNum}/${tbState.maxStage}`;

    updateTbBattleUI();
}

// ----------------------------------------------------
// リアルタイム・ゲームループ（10秒タイマー＆カウントダウン）
// ----------------------------------------------------

/**
 * 100msごとに実行されるリアルタイムバトル処理（タイムリミット監視＋1秒ごとのスリップダメージ）
 */
export function tbGameLoop() {
    // バトル非アクティブ、ポーズ中、敵が存在しない、または敵HPが0以下の場合は即座に完全停止
    if (!tbState.isActive || tbState.isPaused || !tbState.enemy || tbState.enemy.hp <= 0) return;

    // 100ms ごとに 0.1秒減少 & ティックインクリメント
    tbState.timeLeft = Math.max(0, tbState.timeLeft - 0.1);
    tbState.tickCount = (tbState.tickCount || 0) + 1;

    // 1. タイマーバーとテキストの更新（チームバトル専用ID）
    const timerFill = document.getElementById('tb-ui-timer');
    const timerText = document.getElementById('tb-ui-timer-text');
    const ratio = Math.max(0, tbState.timeLeft / (tbState.maxTime || 10));

    if (timerFill) {
        timerFill.style.width = `${ratio * 100}%`;
        if (ratio < 0.25) {
            timerFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        } else if (ratio < 0.5) {
            timerFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        } else {
            timerFill.style.background = 'linear-gradient(90deg, #38bdf8, #22c55e)';
        }
    }

    if (timerText) {
        timerText.innerText = `${tbState.timeLeft.toFixed(1)}s`;
        if (ratio < 0.25) {
            timerText.style.color = '#ef4444';
        } else {
            timerText.style.color = '#ffffff';
        }
    }

    // 2. 1秒ごと（10カウントごと）のスリップダメージ（敵の通常攻撃）
    if (tbState.tickCount % 10 === 0) {
        const activePlayer = tbState.party[tbState.activeSlot];
        if (activePlayer && activePlayer.isAlive) {
            const tickDamage = calcTbTickDamage(tbState.enemy, activePlayer);
            activePlayer.hp = Math.max(0, activePlayer.hp - tickDamage);

            // ダメージポップアップ・SE（発光エフェクトはタイムアップ・不正解時のみ発動）
            showTbDamagePopup(true, tickDamage);
            playSE('miss');

            // 味方HPバー・ステータス更新
            updateTbPlayerStatusUI();
            updateTbReserveUI();

            // HP0判定
            if (activePlayer.hp <= 0) {
                activePlayer.isAlive = false;
                const nextAliveIndex = tbState.party.findIndex(p => p.isAlive);
                if (nextAliveIndex !== -1) {
                    tbState.isPaused = true; // モーダル表示中は完全にポーズ
                    setTimeout(async () => {
                        if (!tbState.isActive) return;
                        await showAlert(`⚠️ ${activePlayer.name} が倒れた！\n${tbState.party[nextAliveIndex].name} が出撃！`);
                        if (!tbState.isActive) return;
                        switchTbActiveChar(nextAliveIndex, true); // 強制交替
                        tbState.isPaused = false;
                        nextTbQuestion();
                    }, 100);
                    return;
                } else {
                    finishTeamBattle(false);
                    return;
                }
            }
        }
    }

    // 3. タイムアップ判定（10倍ペナルティ発動）
    if (tbState.timeLeft <= 0) {
        applyTbPenalty('⏰ 時間切れ！');
    }
}

/**
 * 10倍ペナルティ処理（時間切れ または 不正解時）
 * @param {string} reason
 */
function applyTbPenalty(reason) {
    if (!tbState.isActive || tbState.isPaused || !tbState.enemy || tbState.enemy.hp <= 0) return;

    // 即座にポーズ状態にして、100ms周期の重複実行を完全に防止（1問につき1回のみ発動）
    tbState.isPaused = true;

    const activePlayer = tbState.party[tbState.activeSlot];
    if (!activePlayer || !activePlayer.isAlive) return;

    // 通常スリップダメージの10倍のペナルティダメージ
    const baseDamage = calcTbTickDamage(tbState.enemy, activePlayer);
    const penaltyDamage = baseDamage * 10;

    activePlayer.hp = Math.max(0, activePlayer.hp - penaltyDamage);

    // ダメージポップアップ・被弾演出・SE
    showTbDamagePopup(true, penaltyDamage);
    playSE('miss');
    showPlayerDamageFlash();

    // 味方HPバー・ステータス更新
    updateTbPlayerStatusUI();
    updateTbReserveUI();

    // HPが0になった場合の交替または全滅判定
    if (activePlayer.hp <= 0) {
        activePlayer.isAlive = false;
        const nextAliveIndex = tbState.party.findIndex(p => p.isAlive);
        if (nextAliveIndex !== -1) {
            // 生きている控えキャラへ強制交替（モーダル表示中はポーズを維持）
            setTimeout(async () => {
                if (!tbState.isActive) return;
                await showAlert(`⚠️ ${reason}\n${activePlayer.name} が倒れた！\n${tbState.party[nextAliveIndex].name} が出撃！`);
                if (!tbState.isActive) return;
                switchTbActiveChar(nextAliveIndex, true); // 強制交替
                tbState.isPaused = false;
                nextTbQuestion();
            }, 100);
            return;
        } else {
            // 全滅・敗北
            finishTeamBattle(false);
            return;
        }
    }

    // 即座に次の問題へ移行（タイマーリセット＆ポーズ解除）
    setTimeout(() => {
        if (tbState.isActive) {
            nextTbQuestion(); // nextTbQuestion 冒頭で tbState.isPaused = false に解除される
        }
    }, 600);
}

/**
 * ダメージポップアップ演出の生成と自動削除
 * @param {boolean} isPlayer 自キャラへのダメージか否か (true: 自キャラ, false: 敵キャラ)
 * @param {number} damage ダメージ数値
 */
export function showTbDamagePopup(isPlayer, damage) {
    if (!damage || damage <= 0) return;

    const wrapperSelector = isPlayer ? '#team-battle-screen .tb-player-visual-wrapper' : '#team-battle-screen .tb-enemy-visual-wrapper';
    const wrapper = document.querySelector(wrapperSelector);
    if (!wrapper) return;

    const popup = document.createElement('div');
    popup.className = `tb-damage-popup ${isPlayer ? 'player-dmg' : 'enemy-dmg'}`;
    popup.innerText = `-${damage}`;

    wrapper.appendChild(popup);

    setTimeout(() => {
        if (popup && popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 850);
}

/**
 * 味方被ダメージ時の画面フラッシュ演出
 */
function showPlayerDamageFlash() {
    const visual = document.getElementById('tb-player-visual');
    if (visual) {
        visual.style.filter = 'brightness(2) drop-shadow(0 0 10px #ef4444)';
        setTimeout(() => {
            if (visual) visual.style.filter = '';
        }, 150);
    }
}

// ----------------------------------------------------
// クイズ出題と自陣攻撃
// ----------------------------------------------------

/**
 * 次の問題を出題（通常クエスト共通の q.q / q.choices 描画ロジックとTIMEボーナス適用）
 */
export function nextTbQuestion() {
    if (!tbState.isActive) return;

    tbState.isPaused = false; // ポーズ状態を解除してゲーム再開

    if (tbState.qIndex >= tbState.questions.length) {
        tbState.questions = [...tbState.questions].sort(() => Math.random() - 0.5);
        tbState.qIndex = 0;
    }

    const q = tbState.questions[tbState.qIndex++];
    tbState.currentQuestion = q;
    tbState.tickCount = 0; // 敵の攻撃周期（スリップダメージの1秒タイマー）をリセット

    // 前衛キャラのTIMEボーナスを適用したタイマー初期化（基本10秒 × TIME補正）
    const activePlayer = tbState.party[tbState.activeSlot];
    const stats = getTbCharaStats(activePlayer);
    tbState.maxTime = 10 * (stats.time || 1.0);
    tbState.timeLeft = tbState.maxTime;

    // 通常クエストと完全共通の問題文プロパティ (q.q または q.question)
    const questionText = (q.q !== undefined && q.q !== null) ? q.q : (q.question || '問題文');
    const qBox = document.getElementById('tb-ui-question');
    if (qBox) qBox.innerText = questionText;

    // 選択肢のシャッフルとボタン生成 (通常クエスト共通の choices 配列)
    const choicesGrid = document.getElementById('tb-ui-choices');
    const choicesList = q.choices || q.c || [];
    if (choicesGrid && choicesList.length > 0) {
        choicesGrid.innerHTML = '';
        const shuffledChoices = [...choicesList].sort(() => Math.random() - 0.5);
        shuffledChoices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.type = 'button';
            btn.innerText = choice;
            // クリック時にボタン要素自身を渡して発光エフェクトを有効化
            btn.onclick = () => judgeTbAnswer(choice, btn);
            choicesGrid.appendChild(btn);
        });
    }
}

/**
 * クイズ回答判定と自陣攻撃（通常クエスト共通の q.a 判定・発光エフェクト・500msディレイ・属性補正適用）
 * @param {string} selectedChoice
 * @param {HTMLButtonElement} [buttonElement]
 */
export function judgeTbAnswer(selectedChoice, buttonElement) {
    if (!tbState.isActive || tbState.isPaused || !tbState.currentQuestion) return;

    const q = tbState.currentQuestion;
    // 通常クエスト共通の正解プロパティ (q.a または q.answer)
    const correctAnswer = String((q.a !== undefined && q.a !== null) ? q.a : (q.answer || '')).trim();
    const isCorrect = (String(selectedChoice).trim() === correctAnswer);
    const activePlayer = tbState.party[tbState.activeSlot];

    // チームバトル画面の選択肢ボタンを非活性化
    const allBtns = document.querySelectorAll('#tb-ui-choices .choice-btn');
    allBtns.forEach(b => b.disabled = true);

    // クリックされたボタンに発光クラスを付与
    if (buttonElement) {
        buttonElement.classList.add(isCorrect ? 'btn-correct' : 'btn-wrong');
    }

    if (isCorrect) {
        // 正解！自陣から敵への攻撃
        playSE('hit');
        tbState.score += 100;

        // 通常クエストと完全共通化されたステータス補正計算
        const stats = getTbCharaStats(activePlayer);
        const baseAtk = 120; // 基礎攻撃力
        const rawRatio = Math.max(0, tbState.timeLeft / (tbState.maxTime || 10));
        const timeFactor = 0.5 + (rawRatio * 0.5); // 早い解答ほど高いダメージ
        const affinity = getTbAffinityMultiplier(activePlayer.skills || activePlayer.type, tbState.enemy.skills || tbState.enemy.type, true); // 属性相性倍率（攻撃側最大値採用・ALL保証）
        const statFactor = stats.atk + ((stats.time - 1) * 0.5);
        const comboAdd = Math.min(tbState.score / 1000 * 0.025, 0.5);

        const finalDamage = Math.max(10, Math.floor(baseAtk * timeFactor * (statFactor + comboAdd) * affinity));

        tbState.enemy.hp = Math.max(0, tbState.enemy.hp - finalDamage);

        // ダメージポップアップ・敵被弾演出
        showTbDamagePopup(false, finalDamage);
        showEnemyDamageFlash();

        // 敵HPバー更新
        updateTbEnemyStatusUI();

        // 敵撃破判定
        if (tbState.enemy.hp <= 0) {
            tbState.isPaused = true; // 敵撃破時は即座に時間停止（スリップダメージを完全に阻止）
            playSE('win');

            // 倒した敵キャラクターをリストに記録
            if (tbState.enemy && !tbState.defeatedEnemies.some(e => e.name === tbState.enemy.name)) {
                tbState.defeatedEnemies.push(tbState.enemy);
            }

            // EXPボーナス適用
            const baseExp = 1500 * tbState.stage;
            const earned = Math.floor(baseExp * stats.exp);
            tbState.earnedXp += earned;

            setTimeout(async () => {
                if (!tbState.isActive) return;
                if (tbState.stage < tbState.maxStage) {
                    // 次のステージへ進行（モーダル表示中は完全停止・OKが押されるまで待機）
                    await showAlert(`🎉 STAGE ${tbState.stage} CLEAR!\n次の敵が現れた！`);
                    if (!tbState.isActive) return;
                    setupTbStage(tbState.stage + 1);
                    nextTbQuestion();
                    // 新しい敵登場のカウントダウンカットイン
                    showTbCountdownCutIn(tbState.stage);
                } else {
                    // 全ステージ制覇・完全勝利！
                    finishTeamBattle(true);
                }
            }, 800);
            return;
        }

        // 次の問題へ（発光エフェクトを確認できるように500ms待機）
        setTimeout(() => {
            if (tbState.isActive && !tbState.isPaused) {
                nextTbQuestion();
            }
        }, 500);
    } else {
        // 不正解：正解ボタンを可視化
        allBtns.forEach(b => {
            if (String(b.innerText).trim() === correctAnswer) {
                b.classList.add('btn-miss-answer');
            }
        });

        // 10倍ペナルティ発動
        applyTbPenalty('✕ 不正解！');
    }
}

/**
 * 敵被弾時の演出
 */
function showEnemyDamageFlash() {
    const visual = document.getElementById('tb-enemy-visual');
    if (visual) {
        visual.style.filter = 'brightness(2.5) drop-shadow(0 0 12px #f59e0b)';
        setTimeout(() => {
            if (visual) visual.style.filter = '';
        }, 150);
    }
}

// ----------------------------------------------------
// キャラクター交替とUI更新
// ----------------------------------------------------

/**
 * アクティブな戦闘キャラクターを切り替える（残りタイム割合を正確に引き継ぎ）
 * @param {number} slotIndex (0: 前衛, 1: 後衛1, 2: 後衛2)
 * @param {boolean} [isForce=false] 自動交替等の強制切り替えフラグ（ポーズ中も実行可能）
 */
export function switchTbActiveChar(slotIndex, isForce = false) {
    if (!tbState.isActive) return;
    if (!isForce && tbState.isPaused) return;
    if (slotIndex < 0 || slotIndex >= tbState.party.length) return;
    const targetChar = tbState.party[slotIndex];
    if (!targetChar || (!isForce && !targetChar.isAlive)) {
        return alert("そのキャラクターは戦闘不能です！");
    }

    // 1. 交替前の残りタイム割合（％）を計算・退避
    const currentRatio = (tbState.maxTime > 0) ? Math.max(0, tbState.timeLeft / tbState.maxTime) : 1.0;

    // 2. アクティブキャラを交替
    tbState.activeSlot = slotIndex;
    playSE('count');

    // 3. 新キャラのTIMEボーナスから新しい maxTime を算出
    const stats = getTbCharaStats(targetChar);
    tbState.maxTime = 10 * (stats.time || 1.0);

    // 4. 割合を適用して残り時間を引き継ぎ（強制交替時は満タンにリフレッシュ）
    tbState.timeLeft = isForce ? tbState.maxTime : Math.max(0.1, tbState.maxTime * currentRatio);

    updateTbBattleUI();
}

/**
 * バトル画面全体のUIを更新
 */
export function updateTbBattleUI() {
    updateTbPlayerStatusUI();
    updateTbEnemyStatusUI();
    updateTbReserveUI();
}

/**
 * 自陣アクティブキャラのステータス・グラフィック更新
 */
export function updateTbPlayerStatusUI() {
    const activePlayer = tbState.party[tbState.activeSlot];
    if (!activePlayer) return;

    // 名前・属性・Lv・HP
    const nameEl = document.getElementById('tb-player-name');
    const typeEl = document.getElementById('tb-player-type');
    const lvEl = document.getElementById('tb-player-lv');
    const hpTextEl = document.getElementById('tb-player-hp-text');
    const hpFillEl = document.getElementById('tb-player-hp-fill');
    const affinityBadge = document.getElementById('tb-affinity-badge');
    const visualEl = document.getElementById('tb-player-visual');

    if (nameEl) nameEl.innerText = activePlayer.name;
    // 絵文字なしのすっきりとしたレア度・属性表示（例: SSR / TIME・EXP、UR / ALL）
    if (typeEl) typeEl.innerText = `${activePlayer.rarity || 'N'} / ${formatSkillsText(activePlayer.skills || activePlayer.type)}`;
    if (lvEl) lvEl.innerText = `Lv.${activePlayer.level}`;
    if (hpTextEl) hpTextEl.innerText = `${activePlayer.hp} / ${activePlayer.maxHp}`;

    if (hpFillEl) {
        const hpRatio = Math.max(0, activePlayer.hp / activePlayer.maxHp);
        hpFillEl.style.width = `${hpRatio * 100}%`;
        if (hpRatio < 0.25) {
            hpFillEl.className = 'tb-hp-fill danger';
        } else if (hpRatio < 0.5) {
            hpFillEl.className = 'tb-hp-fill warning';
        } else {
            hpFillEl.className = 'tb-hp-fill';
        }
    }

    // 相性ナビ（等倍時は非表示、有利/不利のみ「相性:○ ×1.5」「相性:△ ×0.5」等を表示）
    if (affinityBadge) {
        if (tbState.enemy) {
            const aff = getTbAffinityInfo(activePlayer.skills || activePlayer.type, tbState.enemy.skills || tbState.enemy.type);
            if (aff.visible) {
                affinityBadge.style.display = 'inline-block';
                affinityBadge.innerText = aff.text;
                affinityBadge.className = `tb-affinity-badge ${aff.className}`;
            } else {
                affinityBadge.style.display = 'none';
            }
        } else {
            affinityBadge.style.display = 'none';
        }
    }

    // グラフィック
    if (visualEl) {
        if (activePlayer.imageUrl && activePlayer.imageUrl.startsWith('http')) {
            visualEl.innerHTML = `<img src="${activePlayer.imageUrl}" class="tb-player-sprite">`;
        } else {
            visualEl.innerHTML = `<div class="tb-player-sprite" style="font-size:3.5rem;line-height:88px;text-align:center;">✏️</div>`;
        }
    }
}

/**
 * 敵ステータス・グラフィック更新（レア度 / 属性を表示）
 */
export function updateTbEnemyStatusUI() {
    const enemy = tbState.enemy;
    if (!enemy) return;

    const nameEl = document.getElementById('tb-enemy-name');
    const typeEl = document.getElementById('tb-enemy-type');
    const lvEl = document.getElementById('tb-enemy-lv');
    const hpTextEl = document.getElementById('tb-enemy-hp-text');
    const hpFillEl = document.getElementById('tb-enemy-hp-fill');
    const visualEl = document.getElementById('tb-enemy-visual');

    if (nameEl) nameEl.innerText = enemy.name;
    // 絵文字なしのすっきりとしたレア度・属性表示（例: SSR / TIME）
    if (typeEl) typeEl.innerText = `${enemy.rarity || 'N'} / ${formatSkillsText(enemy.skills || enemy.type)}`;
    if (lvEl) lvEl.innerText = `Lv.${enemy.level}`;
    if (hpTextEl) hpTextEl.innerText = `${enemy.hp} / ${enemy.maxHp}`;

    if (hpFillEl) {
        const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        hpFillEl.style.width = `${hpRatio * 100}%`;
        if (hpRatio < 0.25) {
            hpFillEl.className = 'tb-hp-fill danger';
        } else if (hpRatio < 0.5) {
            hpFillEl.className = 'tb-hp-fill warning';
        } else {
            hpFillEl.className = 'tb-hp-fill';
        }
    }

    if (visualEl) {
        if (enemy.imageUrl && enemy.imageUrl.startsWith('http')) {
            visualEl.innerHTML = `<img src="${enemy.imageUrl}" class="tb-enemy-sprite">`;
        } else {
            visualEl.innerHTML = `<div class="tb-enemy-sprite" style="font-size:3.2rem;line-height:80px;text-align:center;">👾</div>`;
        }
    }
}

/**
 * 控えキャラ交替パネルの更新（アイコン・Lv・レア度・相性・HPバー表示、戦闘不能時は✕戦闘不能）
 */
export function updateTbReserveUI() {
    const reserveSlots = [0, 1, 2].filter(idx => idx !== tbState.activeSlot);

    reserveSlots.forEach((slotIdx, i) => {
        const char = tbState.party[slotIdx];
        const slotEl = document.getElementById(`tb-reserve-slot-${i + 1}`);
        if (!slotEl || !char) return;

        // アイコン HTML（画像がない場合はシンプルなアイコン）
        const iconHtml = (char.imageUrl && char.imageUrl.startsWith('http'))
            ? `<img src="${char.imageUrl}" class="tb-reserve-img">`
            : `<span style="font-size:1.3rem;">✏️</span>`;

        if (char.isAlive) {
            // 相性判定（複数属性・ALL対応・「相性:○」「相性:△」のみ表示）
            let affBadgeHtml = '';
            if (tbState.enemy) {
                const multi = getTbAffinityMultiplier(char.skills || char.type, tbState.enemy.skills || tbState.enemy.type, true);
                if (multi > 1.0) {
                    affBadgeHtml = `<span class="tb-reserve-aff-badge advantage">相性:○</span>`;
                } else if (multi < 1.0) {
                    affBadgeHtml = `<span class="tb-reserve-aff-badge disadvantage">相性:△</span>`;
                }
            }

            const hpRatio = Math.max(0, char.hp / char.maxHp);
            const hpColorClass = (hpRatio < 0.25) ? 'danger' : (hpRatio < 0.5) ? 'warning' : '';

            slotEl.innerHTML = `
                <div class="tb-reserve-icon">${iconHtml}</div>
                <div class="tb-reserve-body">
                    <div class="tb-reserve-meta-row">
                        <span class="tb-reserve-lv">Lv.${char.level}</span>
                        <span class="tb-reserve-rarity rarity-${char.rarity}">${char.rarity || 'N'}</span>
                        ${affBadgeHtml}
                    </div>
                    <div class="tb-reserve-hp-track">
                        <div class="tb-reserve-hp-fill ${hpColorClass}" style="width: ${hpRatio * 100}%;"></div>
                    </div>
                </div>
            `;
            slotEl.style.opacity = '1.0';
            slotEl.style.cursor = 'pointer';
            slotEl.onclick = () => switchTbActiveChar(slotIdx, false);
        } else {
            // 戦闘不能時の表示: アイコンと赤字で「✕ 戦闘不能」
            slotEl.innerHTML = `
                <div class="tb-reserve-icon tb-reserve-dead-icon">${iconHtml}</div>
                <div class="tb-reserve-body tb-reserve-dead-body">
                    <span class="tb-reserve-dead-text">✕ 戦闘不能</span>
                </div>
            `;
            slotEl.style.opacity = '0.5';
            slotEl.style.cursor = 'not-allowed';
            slotEl.onclick = () => alert('そのキャラクターは戦闘不能です！');
        }
    });
}

// ----------------------------------------------------
// ポーズ機能
// ----------------------------------------------------

/**
 * チームバトルのポーズ切り替え
 */
export function toggleTbPause() {
    if (!tbState.isActive) return;
    tbState.isPaused = !tbState.isPaused;
    const overlay = document.getElementById('tb-pause-overlay');
    if (overlay) {
        if (tbState.isPaused) {
            updateMuteButtonsUI(); // 最新のミュート状態をボタンに反映
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

/**
 * ポーズから再開
 */
export function resumeTbGame() {
    tbState.isPaused = false;
    document.getElementById('tb-pause-overlay')?.classList.add('hidden');
}

/**
 * ポーズ画面から撤退
 */
export async function escapeTeamBattleFromPause() {
    document.getElementById('tb-pause-overlay')?.classList.add('hidden');
    tbState.isPaused = false;
    finishTeamBattle(false, true);
}

// ----------------------------------------------------
// 撤退と勝敗リザルト
// ----------------------------------------------------

/**
 * 撤退確認
 */
export async function escapeTeamBattle() {
    if (!tbState.isActive) return;
    const wasPaused = tbState.isPaused;
    tbState.isPaused = true;

    if (!(await showConfirm("チームバトルから撤退しますか？\n（獲得予定の経験値は破棄されます）"))) {
        tbState.isPaused = wasPaused;
        return;
    }

    finishTeamBattle(false, true);
}

/**
 * バトル終了処理（勝利・敗北・撤退）
 * @param {boolean} isWin
 * @param {boolean} [isEscape=false]
 */
export function finishTeamBattle(isWin, isEscape = false) {
    tbState.isActive = false;
    tbState.isPaused = false;
    if (tbState.timerId) {
        clearInterval(tbState.timerId);
        tbState.timerId = null;
    }
    stopBGM();

    // チームバトル画面・ポーズ画面を隠す
    document.getElementById('tb-pause-overlay')?.classList.add('hidden');
    document.getElementById('team-battle-screen')?.classList.add('hidden');

    // 確実にタイトル画面を表示
    document.getElementById('title-screen')?.classList.remove('hidden');

    if (isEscape) {
        returnToCurrentCategory();
        return;
    }

    if (isWin) {
        playSE('win');
        const finalExp = tbState.earnedXp + 2000;
        gameState.xp += finalExp;

        // 倒した敵キャラクターを図鑑・インベントリに獲得
        const acquiredNames = [];
        if (tbState.defeatedEnemies && tbState.defeatedEnemies.length > 0) {
            tbState.defeatedEnemies.forEach(enemy => {
                if (enemy.master && enemy.master.id) {
                    const charId = String(enemy.master.id);
                    if (!gameState.charaInventory[charId]) {
                        gameState.charaInventory[charId] = {
                            level: 1,
                            count: 1,
                            exp: 0,
                            currentRarity: enemy.master.rarity || 'N'
                        };
                    } else {
                        if (typeof gameState.charaInventory[charId].level !== 'number' || gameState.charaInventory[charId].level < 1) {
                            gameState.charaInventory[charId].level = 1;
                        }
                        gameState.charaInventory[charId].count = (gameState.charaInventory[charId].count || 0) + 1;
                    }
                    acquiredNames.push(`・${enemy.name} (${enemy.rarity || 'N'})`);
                }
            });
        }

        saveGame();

        let rewardText = '';
        if (acquiredNames.length > 0) {
            rewardText = `\n\n🎁 獲得キャラクター:\n${acquiredNames.join('\n')}`;
        }

        showAlert(`🏆 チームバトルクエスト 完全制覇！\n\n獲得スコア: ${tbState.score}\n獲得XP: +${finalExp} XP${rewardText}`);
    } else {
        playSE('lose');
        showAlert("💀 全滅してしまった...\n\nパーティーの編成やレベル、属性相性を見直して再挑戦しよう！");
    }

    returnToCurrentCategory();
}



