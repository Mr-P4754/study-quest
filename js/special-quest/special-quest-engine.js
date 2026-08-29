/**
 * ==========================================
 * js/special-quest/special-quest-engine.js
 * チームバトルクエスト（パーティー制バトル）エンジン
 * ==========================================
 */

import { gameState, rawData, saveGame, runtimeState, RARITY_CAPS } from '../state.js?v=9.3.1';
import { getDisplayName, playSE, playBGM, stopBGM } from '../utils.js?v=9.3.1';
import { closeAllCategoryModals, returnToCurrentCategory, showAlert, showConfirm } from '../ui-manager.js?v=9.3.1';

// ----------------------------------------------------
// 内部状態管理
// ----------------------------------------------------
let selectedPartySlot = 0; // 現在選択中の編成スロット (0: 前衛, 1: 後衛1, 2: 後衛2)
let tempParty = [null, null, null]; // 編成画面内での一時パーティー状態

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

    // レア度・レベル順にソート
    const rOrder = { 'UR': 5, 'SSR': 4, 'SR': 3, 'R': 2, 'N': 1 };
    ownedCharas.sort((a, b) => {
        const invA = gameState.charaInventory[a.id];
        const invB = gameState.charaInventory[b.id];
        const rA = (invA && invA.currentRarity) ? invA.currentRarity : a.rarity;
        const rB = (invB && invB.currentRarity) ? invB.currentRarity : b.rarity;
        const diffR = (rOrder[rB] || 0) - (rOrder[rA] || 0);
        if (diffR !== 0) return diffR;
        const lvA = invA ? invA.level : 1;
        const lvB = invB ? invB.level : 1;
        return lvB - lvA;
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
function getTypeEmoji(type) {
    if (!type) return '⚔️';
    const upper = type.toUpperCase();
    if (upper.includes('FIRE') || upper.includes('炎') || upper.includes('ATK')) return '🔥';
    if (upper.includes('WATER') || upper.includes('水') || upper.includes('TIME')) return '💧';
    if (upper.includes('THUNDER') || upper.includes('雷') || upper.includes('EXP')) return '⚡';
    if (upper.includes('ALL')) return '✨';
    return '⚔️';
}

// ====================================================
// チームバトル戦闘コアロジック (リアルタイム・相性バトル)
// ====================================================

/**
 * チームバトルの進行状態管理オブジェクト
 */
export const tbState = {
    isActive: false,
    stage: 1,
    maxStage: 3,
    activeSlot: 0, // 現在戦っている味方スロット (0: 前衛, 1: 後衛1, 2: 後衛2)
    enemy: null, // 現在の敵データ
    party: [], // 味方3体の戦闘用データ配列
    timerId: null,
    tickCount: 0, // 0.1秒カウンター
    graceTicks: 20, // 思考猶予カウント (20 = 2.0秒)
    currentQuestion: null,
    questions: [],
    qIndex: 0,
    score: 0,
    earnedXp: 0
};

/**
 * 最大HP算出関数
 * 計算式: Math.floor(1000 * 補正値(value) * (1 + (レベル - 1) * 0.1))
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
    return Math.floor(1000 * val * (1 + (lv - 1) * 0.1));
}

/**
 * 属性相性倍率の決定
 * 【最優先】同一属性: 1.0倍
 * 【優先2】攻撃側が ALL: 1.25倍
 * 【優先2】防御側が ALL: 0.75倍
 * 【優先3】3すくみ判定: 有利 1.5倍 / 不利 0.5倍
 * @param {string} attackerType
 * @param {string} defenderType
 * @returns {number}
 */
export function getTbAffinityMultiplier(attackerType, defenderType) {
    const a = normalizeType(attackerType);
    const d = normalizeType(defenderType);

    // 【最優先】同一属性
    if (a === d) return 1.0;

    // 【優先2】ALL判定
    if (a === 'ALL') return 1.25;
    if (d === 'ALL') return 0.75;

    // 【優先3】3すくみ判定 (ATK(炎) > TIME(水) > EXP(雷) > ATK(炎))
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
 * 相性ナビUI用のテキストとクラスを返すヘルパー
 * @param {string} playerType
 * @param {string} enemyType
 * @returns {{ text: string, className: string }}
 */
export function getTbAffinityInfo(playerType, enemyType) {
    const multi = getTbAffinityMultiplier(playerType, enemyType);
    if (multi > 1.0) {
        return { text: `有利 ⚔️ ${multi}倍`, className: 'advantage' };
    } else if (multi < 1.0) {
        return { text: `不利 💧 ${multi}倍`, className: 'disadvantage' };
    } else {
        return { text: '相性 ⚖️ 等倍 (1.0倍)', className: '' };
    }
}

/**
 * 敵からアクティブな味方へのスリップダメージ計算
 * 計算式: Math.floor(30 * 敵の補正値(value) * 敵のレベル補正 * 属性相性倍率)
 * @param {Object} enemy
 * @param {Object} activePlayer
 * @returns {number}
 */
export function calcTbTickDamage(enemy, activePlayer) {
    if (!enemy || !activePlayer) return 30;
    const val = Number(enemy.value) || 1.0;
    const lv = Number(enemy.level) || 1;
    const lvScale = 1 + (lv - 1) * 0.05;
    const affinity = getTbAffinityMultiplier(enemy.type, activePlayer.type);
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
        const type = cMaster.type || 'ATK';
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
            type,
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
    tbState.stage = 1;
    tbState.maxStage = 3;
    tbState.activeSlot = 0;
    tbState.questions = [...qList].sort(() => Math.random() - 0.5);
    tbState.qIndex = 0;
    tbState.score = 0;
    tbState.earnedXp = 0;
    tbState.tickCount = 0;

    // 画面切り替え
    document.getElementById('team-battle-setup-modal')?.classList.add('hidden');
    document.getElementById('title-screen')?.classList.add('hidden');
    document.getElementById('team-battle-screen')?.classList.remove('hidden');

    // 撤退ボタンのイベント紐付け
    const escapeBtn = document.getElementById('tb-escape-btn');
    if (escapeBtn) {
        escapeBtn.onclick = () => escapeTeamBattle();
    }

    // ステージ1の敵をセットアップ
    setupTbStage(1);

    // BGM開始
    playBGM();

    // 最初の問題出題
    nextTbQuestion();

    // リアルタイムゲームループ開始 (100ms周期)
    if (tbState.timerId) clearInterval(tbState.timerId);
    tbState.timerId = setInterval(tbGameLoop, 100);
}

/**
 * 指定ステージの敵キャラクターを生成・配置
 * @param {number} stageNum
 */
function setupTbStage(stageNum) {
    tbState.stage = stageNum;
    tbState.tickCount = 0; // 思考猶予リセット

    // 敵の生成（ステージ数に応じて強化）
    const enemyTypes = ['ATK', 'TIME', 'EXP'];
    const assignedType = enemyTypes[(stageNum - 1) % enemyTypes.length];
    const enemyNames = [
        ['スライムウォリアー', 'フォレストウルフ', 'フレイムリザード'],
        ['アイアンゴーレム', 'アクアサーペント', 'サンダーバード'],
        ['ダークキメラ', '冥界の魔導士', 'シャドウドラゴン']
    ];
    const stageNameList = enemyNames[stageNum - 1] || enemyNames[0];
    const enemyName = stageNameList[Math.floor(Math.random() * stageNameList.length)];
    const enemyLevel = stageNum * 5 + 5; // Stage 1: Lv.10, Stage 2: Lv.15, Stage 3: Lv.20
    const enemyValue = 0.9 + stageNum * 0.25; // 1.15, 1.4, 1.65
    const enemyMaxHp = calcTbMaxHp({ value: enemyValue, level: enemyLevel }, true);

    const enemyIcons = ['👾', '🐉', '👿', '👺', '👹', '💀'];
    const enemyIcon = enemyIcons[(stageNum - 1) % enemyIcons.length];

    tbState.enemy = {
        name: enemyName,
        level: enemyLevel,
        type: assignedType,
        value: enemyValue,
        maxHp: enemyMaxHp,
        hp: enemyMaxHp,
        icon: enemyIcon
    };

    // UI更新
    const progressEl = document.getElementById('tb-progress-text');
    if (progressEl) progressEl.innerText = `⚔️ STAGE ${stageNum}/${tbState.maxStage}`;

    updateTbBattleUI();
}

// ----------------------------------------------------
// リアルタイム・ゲームループ
// ----------------------------------------------------

/**
 * 100msごとに実行されるリアルタイムバトル処理
 */
export function tbGameLoop() {
    if (!tbState.isActive) return;

    tbState.tickCount++;

    const timerFill = document.getElementById('tb-timer-fill');
    const activePlayer = tbState.party[tbState.activeSlot];

    // 1. 思考猶予時間（最初の2秒 = 20カウント）
    if (tbState.tickCount <= tbState.graceTicks) {
        const remainingRatio = 1 - (tbState.tickCount / tbState.graceTicks);
        if (timerFill) {
            timerFill.style.width = `${Math.max(0, remainingRatio * 100)}%`;
            timerFill.style.background = 'linear-gradient(90deg, #38bdf8, #22c55e)';
        }
    } 
    // 2. 猶予終了後：スリップダメージ発生
    else {
        if (timerFill) {
            timerFill.style.width = '100%';
            timerFill.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
        }

        // 10カウント (1.0秒) ごとにスリップダメージ発生
        if ((tbState.tickCount - tbState.graceTicks) % 10 === 0) {
            if (activePlayer && activePlayer.isAlive) {
                const tickDamage = calcTbTickDamage(tbState.enemy, activePlayer);
                activePlayer.hp = Math.max(0, activePlayer.hp - tickDamage);

                // 被弾エフェクト・SE
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
                        // 生きている控えキャラへ強制交替
                        showAlert(`⚠️ ${activePlayer.name} が倒れた！<br>${tbState.party[nextAliveIndex].name} が出撃！`);
                        switchTbActiveChar(nextAliveIndex);
                    } else {
                        // 全滅・敗北
                        finishTeamBattle(false);
                    }
                }
            }
        }
    }
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
 * 次の問題を出題
 */
export function nextTbQuestion() {
    if (!tbState.isActive) return;

    if (tbState.qIndex >= tbState.questions.length) {
        tbState.questions = [...tbState.questions].sort(() => Math.random() - 0.5);
        tbState.qIndex = 0;
    }

    const q = tbState.questions[tbState.qIndex++];
    tbState.currentQuestion = q;
    tbState.tickCount = 0; // 猶予時間カウントをリセット

    const qBox = document.getElementById('tb-question-text');
    if (qBox) qBox.innerText = q.question || '問題文';

    const choicesGrid = document.getElementById('tb-choices-grid');
    if (choicesGrid && q.choices) {
        choicesGrid.innerHTML = '';
        const shuffledChoices = [...q.choices].sort(() => Math.random() - 0.5);
        shuffledChoices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'tb-choice-btn';
            btn.type = 'button';
            btn.innerText = choice;
            btn.onclick = () => judgeTbAnswer(choice);
            choicesGrid.appendChild(btn);
        });
    }
}

/**
 * クイズ回答判定と自陣攻撃
 * @param {string} selectedChoice
 */
export function judgeTbAnswer(selectedChoice) {
    if (!tbState.isActive || !tbState.currentQuestion) return;

    const q = tbState.currentQuestion;
    const isCorrect = (String(selectedChoice).trim() === String(q.answer).trim());
    const activePlayer = tbState.party[tbState.activeSlot];

    if (isCorrect) {
        // 正解！自陣から敵への攻撃
        playSE('hit');
        tbState.score += 100;

        // 味方攻撃側 → 敵防御側の相性倍率
        const affinity = getTbAffinityMultiplier(activePlayer.type, tbState.enemy.type);
        const baseAtk = Math.floor(150 * activePlayer.value * (1 + (activePlayer.level - 1) * 0.1));
        const finalDamage = Math.max(10, Math.floor(baseAtk * affinity));

        tbState.enemy.hp = Math.max(0, tbState.enemy.hp - finalDamage);

        // 敵被弾演出
        showEnemyDamageFlash();

        // 敵HPバー更新
        updateTbEnemyStatusUI();

        // 敵撃破判定
        if (tbState.enemy.hp <= 0) {
            playSE('win');
            tbState.earnedXp += 1500 * tbState.stage;

            if (tbState.stage < tbState.maxStage) {
                // 次のステージへ進行
                showAlert(`🎉 STAGE ${tbState.stage} CLEAR!<br>次の敵が現れた！`);
                setupTbStage(tbState.stage + 1);
                nextTbQuestion();
            } else {
                // 全ステージ制覇・完全勝利！
                finishTeamBattle(true);
            }
            return;
        }

        // 次の問題へ
        nextTbQuestion();
    } else {
        // 不正解
        playSE('miss');
        // 不正解時はペナルティとして即座に猶予時間を消費（猶予終了へ）
        tbState.tickCount = tbState.graceTicks;
        nextTbQuestion();
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
 * アクティブな戦闘キャラクターを切り替える
 * @param {number} slotIndex (0: 前衛, 1: 後衛1, 2: 後衛2)
 */
export function switchTbActiveChar(slotIndex) {
    if (!tbState.isActive) return;
    if (slotIndex < 0 || slotIndex >= tbState.party.length) return;
    const targetChar = tbState.party[slotIndex];
    if (!targetChar || !targetChar.isAlive) {
        return alert("そのキャラクターは戦闘不能です！");
    }

    tbState.activeSlot = slotIndex;
    playSE('count');

    // 交代演出・思考猶予をリセット
    tbState.tickCount = 0;

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
    if (typeEl) typeEl.innerText = getTypeEmoji(activePlayer.type) + ' ' + activePlayer.type;
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

    // 相性ナビ
    if (affinityBadge && tbState.enemy) {
        const aff = getTbAffinityInfo(activePlayer.type, tbState.enemy.type);
        affinityBadge.innerText = aff.text;
        affinityBadge.className = `tb-affinity-badge ${aff.className}`;
    }

    // グラフィック
    if (visualEl) {
        if (activePlayer.imageUrl && activePlayer.imageUrl.startsWith('http')) {
            visualEl.innerHTML = `<img src="${activePlayer.imageUrl}" style="width:100%;height:100%;object-fit:contain;">`;
        } else {
            visualEl.innerHTML = `<div style="font-size:3.5rem;line-height:96px;">✏️</div>`;
        }
    }
}

/**
 * 敵ステータス・グラフィック更新
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
    if (typeEl) typeEl.innerText = getTypeEmoji(enemy.type) + ' ' + enemy.type;
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
        visualEl.innerHTML = `<div style="font-size:3.2rem;line-height:88px;">${enemy.icon || '👾'}</div>`;
    }
}

/**
 * 控えキャラ交替パネルの更新
 */
export function updateTbReserveUI() {
    const reserveSlots = [0, 1, 2].filter(idx => idx !== tbState.activeSlot);

    reserveSlots.forEach((slotIdx, i) => {
        const char = tbState.party[slotIdx];
        const slotEl = document.getElementById(`tb-reserve-slot-${i + 1}`);
        if (!slotEl || !char) return;

        const iconEl = slotEl.querySelector('.tb-reserve-icon');
        const nameEl = slotEl.querySelector('.tb-reserve-name');
        const hpFillEl = slotEl.querySelector('.tb-reserve-hp-fill');
        const tagEl = slotEl.querySelector('.tb-swap-hint-tag');

        if (iconEl) {
            iconEl.innerHTML = (char.imageUrl && char.imageUrl.startsWith('http'))
                ? `<img src="${char.imageUrl}" style="width:24px;height:24px;object-fit:contain;">`
                : `<span>${getTypeEmoji(char.type)}</span>`;
        }

        if (nameEl) {
            nameEl.innerText = char.isAlive ? char.name : '戦闘不能';
            nameEl.style.color = char.isAlive ? '#f1f5f9' : '#ef4444';
        }

        if (hpFillEl) {
            const ratio = Math.max(0, char.hp / char.maxHp);
            hpFillEl.style.width = `${ratio * 100}%`;
            hpFillEl.style.background = char.isAlive ? '#22c55e' : '#64748b';
        }

        if (tagEl) {
            tagEl.innerText = char.isAlive ? '交替' : '✕';
            tagEl.style.color = char.isAlive ? '#38bdf8' : '#ef4444';
        }

        // クリックで交替
        slotEl.onclick = () => switchTbActiveChar(slotIdx);
        slotEl.style.opacity = char.isAlive ? '1.0' : '0.4';
        slotEl.style.cursor = char.isAlive ? 'pointer' : 'not-allowed';
    });
}

// ----------------------------------------------------
// 撤退と勝敗リザルト
// ----------------------------------------------------

/**
 * 撤退確認
 */
export async function escapeTeamBattle() {
    if (!tbState.isActive) return;
    if (!(await showConfirm("チームバトルから撤退しますか？<br>（獲得予定の経験値は破棄されます）"))) return;

    finishTeamBattle(false, true);
}

/**
 * バトル終了処理（勝利・敗北・撤退）
 * @param {boolean} isWin
 * @param {boolean} [isEscape=false]
 */
export function finishTeamBattle(isWin, isEscape = false) {
    tbState.isActive = false;
    if (tbState.timerId) {
        clearInterval(tbState.timerId);
        tbState.timerId = null;
    }
    stopBGM();

    document.getElementById('team-battle-screen')?.classList.add('hidden');

    if (isEscape) {
        returnToCurrentCategory();
        return;
    }

    if (isWin) {
        playSE('win');
        const finalExp = tbState.earnedXp + 2000;
        gameState.xp += finalExp;
        saveGame();

        showAlert(`🏆 チームバトルクエスト 完全制覇！<br><br>獲得スコア: ${tbState.score}<br>獲得XP: <span style="color:#f39c12;font-weight:bold;">+${finalExp} XP</span>`);
    } else {
        playSE('lose');
        showAlert("💀 全滅してしまった...<br><br>パーティーの編成やレベル、属性相性を見直して再挑戦しよう！");
    }

    returnToCurrentCategory();
}

