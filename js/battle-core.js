// ==========================================
// js/battle-core.js (戦闘共通エンジン・リザルト・タイマー・ポーズ)
// ==========================================

import {
    gameState,
    playData,
    rawData,
    rogueData,
    runtimeState,
    RARITY_CAPS,
    EXP_REQ,
    LV_BONUS_RATE,
    saveGame
} from './state.js';

import {
    getDisplayName,
    getGradeMultiplier,
    playSE,
    playBGM,
    stopBGM
} from './utils.js';

export function showCutIn(t) { 
    const str = String(t);
    const d = document.createElement('div'); 
    d.className = 'cutin'; 
    d.innerText = str; 

    if (str.includes('✕')) {
        d.classList.add('cutin-miss');
    } else if (str.startsWith('-') || /^\d+$/.test(str.replace(/^-/, ''))) {
        d.classList.add('cutin-damage');
    } else if (str.includes('+') || str === 'GOOD!') {
        d.classList.add('cutin-heal');
    } else if (str === 'GO!' || /^[1-3]$/.test(str)) {
        d.classList.add('cutin-countdown');
    } else {
        d.classList.add('cutin-damage');
    }

    document.body.appendChild(d); 
    setTimeout(() => d.remove(), 1300); 
}

export function updateUI() { 
    const uiLife = document.getElementById('ui-life'); 
    if (uiLife) uiLife.innerText = '❤️'.repeat(Math.max(0, gameState.lives)); 
    const uiScore = document.getElementById('ui-score'); 
    if (uiScore) uiScore.innerText = playData.isCalculation ? playData.calcQIndex : gameState.score; 
    const uiCombo = document.getElementById('ui-combo'); 
    if (uiCombo) uiCombo.innerText = playData.isCalculation ? playData.calcCorrect : gameState.combo; 
    const uiHp = document.getElementById('ui-hp'); 
    if (uiHp) uiHp.style.width = (gameState.maxHP > 0 ? (gameState.enemyHP / gameState.maxHP * 100) : 0) + '%'; 
    const uiHpText = document.getElementById('ui-hp-text'); 
    if (uiHpText) uiHpText.innerText = `${gameState.enemyHP}/${gameState.maxHP}`; 
}

export function togglePause() { 
    runtimeState.isPaused = !runtimeState.isPaused; 
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.toggle('hidden', !runtimeState.isPaused);
    if (runtimeState.isPaused) {
        const infoBox = document.getElementById('pause-chara-info');
        if (!infoBox) return;
        const charaId = gameState.equipped;
        const chara = rawData.characters ? rawData.characters.find(c => c.id == charaId) : null;
        if (chara) {
            const inv = gameState.charaInventory[charaId] || { level: 1 };
            const baseVal = (inv.isEvolved && inv.customValue) ? inv.customValue : chara.value;
            const r = inv.currentRarity || chara.rarity;
            const name = getDisplayName(chara, inv);
            let val = Number(baseVal) + (inv.level * LV_BONUS_RATE);
            let visual = "";
            if (chara.imageUrl && chara.imageUrl.startsWith('http')) {
                visual = `<img src="${chara.imageUrl}" style="width:60px;height:60px;object-fit:contain;background:#fff;border-radius:5px;">`;
            } else {
                visual = `<div style="font-size:40px;">✏️</div>`;
            }
            infoBox.innerHTML = `<div style="display:flex; align-items:center; gap:10px; text-align:left;">${visual}<div><div style="font-weight:bold; color:#ecf0f1; font-size:0.9em;">${name}</div><div style="color:#f39c12; font-weight:bold; font-size:0.8em;">Lv.${inv.level}</div><div style="font-size:0.7em; color:#bdc3c7;"><span class="rarity-${r}" style="font-weight:bold; font-size:1.2em; margin-right:5px;">${r}</span>効果: x${val.toFixed(2)}</div></div></div>`;
        } else {
            infoBox.innerHTML = `<div style="color:#bdc3c7; font-size:0.8em;">装備なし</div>`;
        }
    }
}

export function resumeGame() { 
    runtimeState.isPaused = false; 
    document.getElementById('pause-overlay')?.classList.add('hidden'); 
}

export async function retryGame() { 
    if (typeof window.showConfirm === 'function') {
        if (!(await window.showConfirm("やり直しますか？"))) return; 
    }
    runtimeState.isGameActive = false; 
    clearInterval(gameState.timer); 
    resumeGame(); 
    gameState.timeLeft = 0;
    
    document.getElementById('calc-layout')?.classList.add('hidden');
    document.getElementById('ui-calc-answer')?.classList.add('hidden');
    document.getElementById('calc-keypad')?.classList.add('hidden');
    document.getElementById('ui-calc-progress')?.classList.add('hidden');
    document.getElementById('ui-choices')?.classList.remove('hidden');
    document.getElementById('ui-typing-area')?.classList.add('hidden');
    const hpFrame = document.querySelector('.enemy-hp-frame'); 
    if (hpFrame) hpFrame.style.display = '';

    const qBox = document.getElementById('ui-question');
    if (qBox) { 
        qBox.style.removeProperty('height'); 
        qBox.style.removeProperty('min-height'); 
    }

    const uiScoreSpan = document.getElementById('ui-score'); 
    if (uiScoreSpan && uiScoreSpan.previousSibling && uiScoreSpan.previousSibling.nodeType === 3) uiScoreSpan.previousSibling.nodeValue = "SCORE ";
    const uiComboSpan = document.getElementById('ui-combo'); 
    if (uiComboSpan && uiComboSpan.previousSibling && uiComboSpan.previousSibling.nodeType === 3) uiComboSpan.previousSibling.nodeValue = "COMBO ";
    const resScoreSpan = document.getElementById('res-score'); 
    if (resScoreSpan && resScoreSpan.previousSibling && resScoreSpan.previousSibling.nodeType === 3) resScoreSpan.previousSibling.nodeValue = "獲得スコア: ";
    
    if (playData.isCalculation) { 
        if (typeof window.startCalcGame === 'function') window.startCalcGame(); 
    } else if (playData.isTyping) { 
        if (typeof window.startTypingGame === 'function') window.startTypingGame(); 
    } else if (playData.isSurvival) {
        if (playData.activeOaths && playData.activeOaths.length > 0) { 
            runtimeState.tempOaths = [...playData.activeOaths]; 
            runtimeState.oathOrigin = 'survival'; 
        }
        if (playData.activeReliefs && playData.activeReliefs.length > 0) { 
            runtimeState.tempReliefs = [...playData.activeReliefs]; 
            runtimeState.oathOrigin = 'survival'; 
        }
        if (typeof window.startSurvivalGame === 'function') window.startSurvivalGame(); 
    } else if (playData.isRandom) { 
        if (typeof window.startRandomGame === 'function') window.startRandomGame(); 
    } else if (playData.activeOaths && playData.activeOaths.length > 0) {
        runtimeState.tempOaths = [...playData.activeOaths];
        if (typeof window.startOathGame === 'function') window.startOathGame(); 
    } else if (playData.activeReliefs && playData.activeReliefs.length > 0) {
        runtimeState.tempReliefs = [...playData.activeReliefs];
        if (typeof window.startReliefGame === 'function') window.startReliefGame(); 
    } else if (playData.isRevenge) { 
        if (typeof window.startRevengeMode === 'function') window.startRevengeMode(); 
    } else if (typeof rogueData !== 'undefined' && rogueData.active) { 
        alert("探索モード中はリトライできません。"); 
        resumeGame(); 
    } else { 
        if (typeof window.startGame === 'function') window.startGame(); 
    }
}

export async function backToTitleFromPause() { 
    if (typeof window.showConfirm === 'function') {
        if (!(await window.showConfirm("戻りますか？"))) return; 
    }
    runtimeState.isGameActive = false; 
    clearInterval(gameState.timer); 
    backToTitle(); 
}

export function startCountdown() {
    const qBox = document.getElementById('ui-question'); 
    const cGrid = document.getElementById('ui-choices');
    if (qBox) qBox.innerText = "READY..."; 
    if (cGrid) cGrid.innerHTML = ""; 
    let count = 3; 
    showCutIn(count); 
    playSE('count'); 
    if (runtimeState.countdownTimer) clearInterval(runtimeState.countdownTimer);
    runtimeState.countdownTimer = setInterval(() => {
        if (document.getElementById('game-screen')?.classList.contains('hidden')) { 
            clearInterval(runtimeState.countdownTimer); 
            return; 
        }
        count--;
        if (count > 0) { 
            showCutIn(count); 
            playSE('count'); 
        } else if (count === 0) { 
            showCutIn("GO!"); 
            playSE('start'); 
        } else {
            clearInterval(runtimeState.countdownTimer); 
            runtimeState.isGameActive = true;
            if (playData.isCalculation) { 
                if (typeof window.nextCalcQuestion === 'function') window.nextCalcQuestion(); 
                if (typeof window.startCalcTimer === 'function') window.startCalcTimer(); 
            } else if (playData.isTyping && !(typeof rogueData !== 'undefined' && rogueData.active)) { 
                if (typeof window.nextTypingQuestion === 'function') window.nextTypingQuestion(); 
            } else { 
                if (typeof window.nextQuestion === 'function') window.nextQuestion(); 
            }
            playBGM();
        }
    }, 1000);
}

export function startTimer() { 
    if (gameState.timer) clearInterval(gameState.timer); 
    if (!runtimeState.isGameActive) return; 
    
    if (!playData.isSurvival) {
        gameState.timeLeft = gameState.maxTime; 
    } else if (!gameState.timeLeft || gameState.timeLeft <= 0) {
        gameState.timeLeft = gameState.maxTime;
    }
    
    const bar = document.getElementById('ui-timer'); 
    gameState.timer = setInterval(() => { 
        if (runtimeState.isPaused || !runtimeState.isGameActive) return; 
        gameState.timeLeft -= 0.1; 
        if (bar) bar.style.width = (gameState.timeLeft / gameState.maxTime * 100) + '%'; 
        const timerText = document.getElementById('ui-timer-text');
        if (timerText) timerText.innerText = Math.max(0, gameState.timeLeft).toFixed(1); 
        if (gameState.timeLeft <= 0) { 
            clearInterval(gameState.timer); 
            if (typeof window.judge === 'function') window.judge(false, null); 
        } 
    }, 100); 
}

export function getCharaStats() {
    let stats = { atk: 1.0, time: 1.0, exp: 1.0 };
    if (rawData.characters && rawData.characters.length > 0) {
        const charaData = rawData.characters.find(c => c.id == gameState.equipped);
        if (charaData) {
            let userChara = gameState.charaInventory[gameState.equipped];
            let level = userChara ? userChara.level : 0;
            let baseVal = (userChara && userChara.isEvolved && userChara.customValue) ? userChara.customValue : Number(charaData.value);
            let finalVal = baseVal + (level * LV_BONUS_RATE);
            let skills = (userChara && userChara.skills && userChara.skills.length > 0) ? userChara.skills : [charaData.type];
            skills.forEach(type => { 
                if (type === 'ALL') { 
                    stats.atk = finalVal; stats.time = finalVal; stats.exp = finalVal; 
                } else { 
                    if (type === 'ATK') stats.atk = finalVal; 
                    if (type === 'TIME') stats.time = finalVal; 
                    if (type === 'EXP') stats.exp = finalVal; 
                } 
            });
        }
    }
    if (gameState.itemLevels && rawData.shopItems) {
        Object.keys(gameState.itemLevels).forEach(itemId => {
            const item = rawData.shopItems.find(i => i.id === itemId); 
            const level = gameState.itemLevels[itemId];
            if (item && level > 0) { 
                if (item.type === 'ATK') stats.atk += (Number(item.value) * level); 
                if (item.type === 'TIME') stats.time += (Number(item.value) * level); 
                if (item.type === 'EXP') stats.exp += (Number(item.value) * level); 
            }
        });
    }
    if (playData.activeOaths && playData.activeOaths.includes('weak') && !playData.isSurvival) stats.atk *= 0.5;
    if (playData.activeReliefs && playData.activeReliefs.includes('power') && !playData.isSurvival) stats.atk *= 2.0;

    // ローグライクモードでのバフフック対応
    if (typeof rogueData !== 'undefined' && rogueData.active) {
        stats.atk *= rogueData.atkBuff;
        stats.atk *= (1.0 + (rogueData.exploreLevel - 1) * 0.005);
    }

    return stats;
}

export function finishGame(isClear) { 
    // ローグライク探索中なら専用の勝利/敗北処理へ分岐
    if (typeof rogueData !== 'undefined' && rogueData.active) {
        runtimeState.isGameActive = false; 
        clearInterval(gameState.timer); 
        if (typeof window.handleTypingInput === 'function') {
            document.removeEventListener('keydown', window.handleTypingInput);
        }
        stopBGM();

        if (isClear) {
            playSE('win');
            const stats = getCharaStats();
            const baseReward = 500;
            const floorBonus = rogueData.floor * 100;
            const currentGrade = playData.questions && playData.questions.length > 0 ? playData.questions[0].grade : '';
            const gradeMultiplier = getGradeMultiplier(currentGrade);
            const earned = Math.floor((baseReward + floorBonus) * stats.exp * (1.0 + rogueData.exploreLevel * 0.005) * gradeMultiplier);
            
            rogueData.earnedXp += earned;

            // 撃破したキャラをインベントリに追加
            const charId = playData.rogueEnemyCharId ? String(playData.rogueEnemyCharId) : null;
            let getMsgHtml = "";
            if (charId && rawData.characters) {
                const c = rawData.characters.find(x => String(x.id) === charId);
                const cName = c ? c.name : "キャラ";
                const cRarity = c ? c.rarity : "N";
                if (!gameState.charaInventory[charId]) {
                    gameState.charaInventory[charId] = { level: 1, count: 1, exp: 0, currentRarity: cRarity };
                } else {
                    gameState.charaInventory[charId].count++;
                }
                getMsgHtml = `<span class="rarity-${cRarity}" style="font-weight:bold;">[${cRarity}]</span> ${cName} × 1`;
            }

            if (typeof window.updateRogueUI === 'function') window.updateRogueUI();
            if (rogueData.isBossBattle) {
                gameState.stats.totalKill = (gameState.stats.totalKill || 0) + 1;
                if (typeof window.updateMissionProgress === 'function') window.updateMissionProgress('kill', 1);
            }
            saveGame();

            const resTitle = document.getElementById('res-title');
            if (resTitle) { 
                resTitle.innerText = rogueData.isBossBattle ? "BOSS BATTLE CLEAR!" : "BATTLE WIN!"; 
                resTitle.style.color = "#f1c40f"; 
            }
            const resIcon = document.getElementById('res-icon');
            if (resIcon) resIcon.innerText = "⚔️";

            const resScoreSpan = document.getElementById('res-score');
            if (resScoreSpan && resScoreSpan.previousSibling && resScoreSpan.previousSibling.nodeType === 3) resScoreSpan.previousSibling.nodeValue = "進行階層: ";
            if (resScoreSpan) resScoreSpan.innerText = rogueData.floor + "F";

            const resDetails = document.getElementById('res-details');
            if (resDetails) {
                let html = `<div style="font-size: 1.2em; font-weight: bold; color: #2c3e50;">獲得探索EXP <span style="color:#e67e22;">+${earned}</span></div>`;
                if (rogueData.isBossBattle) html += `<div style="margin-top:5px; font-weight:bold; color:#c0392b;">🎊 ${rogueData.floor}階層踏破！</div>`;
                resDetails.innerHTML = html; 
                resDetails.style.display = 'block';
            }

            const resDrop = document.getElementById('res-drop');
            if (resDrop) { 
                resDrop.style.display = 'block'; 
                resDrop.innerHTML = getMsgHtml ? `ドロップ: ${getMsgHtml}` : 'ドロップ: なし'; 
            }
            
            const resXpLabel = document.getElementById('res-xp-label');
            if (resXpLabel) resXpLabel.innerText = "現在の一時EXP";
            const resXpSpan = document.getElementById('res-xp');
            if (resXpSpan) { 
                resXpSpan.style.lineHeight = "1.1"; 
                resXpSpan.innerHTML = `<span style="color:#f1c40f;">${rogueData.earnedXp}</span>`; 
            }

            document.getElementById('game-screen')?.classList.add('hidden');
            document.getElementById('result-overlay')?.classList.remove('hidden');
        } else {
            playSE('lose');
            if (typeof window.showAppModal === 'function') {
                window.showAppModal("戦闘敗北...\n全滅したため拠点へ強制送還されます。", 'alert').then(() => {
                    if (typeof window.exitRogueSystem === 'function') window.exitRogueSystem(false);
                });
            }
        }
        return;
    }

    runtimeState.isGameActive = false; 
    clearInterval(gameState.timer); 
    if (typeof window.handleTypingInput === 'function') {
        document.removeEventListener('keydown', window.handleTypingInput);
    }
    stopBGM();

    let dropInfo = { count: 0, icon: '' };
    let calcRank = null;
    let earned = 0;
    let isCampaign = false;

    const resXpLabel = document.getElementById('res-xp-label');
    const resXpSpan = document.getElementById('res-xp');
    const resDrop = document.getElementById('res-drop');
    if (resXpLabel) resXpLabel.innerText = "獲得XP";
    if (resDrop) resDrop.style.display = 'block';
    
    if (playData.isSurvival) {
        const correctCount = gameState.score; 
        let oathMultiplier = 1;
        if (playData.activeOaths.length === 1) oathMultiplier = 2;
        else if (playData.activeOaths.length >= 2) oathMultiplier = 3;

        const eqInv = gameState.charaInventory[gameState.equipped];
        const cMaster = rawData.characters ? rawData.characters.find(c => c.id == gameState.equipped) : null;
        
        let isMax = false;
        if (eqInv && cMaster) {
            const maxL = RARITY_CAPS[eqInv.currentRarity || cMaster.rarity] || 10;
            if (eqInv.level >= maxL) isMax = true;
        }

        let milestoneBonus = isMax ? 0 : Math.floor(correctCount / 50) * 50;
        const currentGrade = playData.questions && playData.questions.length > 0 ? playData.questions[0].grade : '';
        const gradeMultiplier = getGradeMultiplier(currentGrade);
        let earnedExp = Math.floor(((correctCount * oathMultiplier) + milestoneBonus) * gradeMultiplier);
        
        if (playData.activeReliefs && playData.activeReliefs.length > 0) {
            const rCount = playData.activeReliefs.length;
            const penalty = rCount >= 3 ? 0.5 : (rCount === 2 ? 0.7 : 0.9);
            earnedExp = Math.floor(earnedExp * penalty);
        }
        
        let growthResultText = "なし";
        
        if (eqInv && cMaster) {
            const maxL = RARITY_CAPS[eqInv.currentRarity || cMaster.rarity] || 10;
            let startLv = eqInv.level;
            let startExp = Number(eqInv.exp) || 0;
            let startStock = eqInv.count;
            
            eqInv.exp = startExp + earnedExp;
            while (eqInv.exp >= EXP_REQ) {
                eqInv.exp -= EXP_REQ;
                if (eqInv.level < maxL) { 
                    eqInv.level++; 
                } else { 
                    eqInv.count++; 
                }
            }
            
            if (eqInv.level >= maxL && eqInv.count > startStock) {
                growthResultText = `<div style="font-size:0.4em; color:#7f8c8d;">Lv.MAX ストック ${startStock}</div><div style="color:#bdc3c7; font-size:0.4em; margin:5px 0;">↓</div><div style="font-size:0.5em; color:#e67e22;">Lv.MAX ストック ${eqInv.count}</div>`;
            } else {
                growthResultText = `<div style="font-size:0.45em; color:#7f8c8d; line-height:1.2;">Lv.${startLv} ${startExp}EXP</div><div style="color:#bdc3c7; font-size:0.4em; margin:2px 0;">↓</div><div style="font-size:0.5em; color:#e67e22; line-height:1.2;">Lv.${eqInv.level} ${eqInv.exp}EXP</div>`;
            }
        }
        
        gameState.stats.totalPlay = (gameState.stats.totalPlay || 0) + 1;
        if (typeof window.updateMissionProgress === 'function') window.updateMissionProgress('play', 1);
        saveGame();

        const resTitle = document.getElementById('res-title'); 
        if (resTitle) { resTitle.innerText = "SURVIVAL END"; resTitle.style.color = "#e74c3c"; }
        const resIcon = document.getElementById('res-icon'); 
        if (resIcon) resIcon.innerText = "🔥"; 
        
        const resScoreSpan = document.getElementById('res-score');
        if (resScoreSpan && resScoreSpan.previousSibling && resScoreSpan.previousSibling.nodeType === 3) resScoreSpan.previousSibling.nodeValue = "到達WAVE: ";
        if (resScoreSpan) resScoreSpan.innerText = correctCount; 
        
        const resDetails = document.getElementById('res-details');
        if (resDetails) {
            resDetails.innerHTML = `<div style="font-size: 1.2em; font-weight: bold; color: #2c3e50;">特訓EXP +${earnedExp}</div>`;
            resDetails.style.display = 'block';
        }
        
        if (resDrop) resDrop.style.display = 'none';
        if (resXpLabel) resXpLabel.innerText = "成長結果";
        
        if (resXpSpan) {
            resXpSpan.style.lineHeight = "1.1";
            resXpSpan.innerHTML = growthResultText;
        }
        
        document.getElementById('game-screen')?.classList.add('hidden'); 
        document.getElementById('result-overlay')?.classList.remove('hidden'); 
        if (typeof window.checkTitles === 'function') window.checkTitles();
        return; 
    }

    if (playData.isCalculation) {
        playSE(isClear ? 'win' : 'lose');
        const duration = playData.calcMode === '3min' ? 180 - playData.calcTimeLeft : playData.calcElapsed;
        const correct = playData.calcCorrect;
        const totalQ = playData.calcQIndex;
        const accuracy = totalQ > 0 ? (correct / totalQ) * 100 : 0;

        if (playData.calcMode === '3min') {
            if (correct >= 90) calcRank = 'S'; 
            else if (correct >= 75) calcRank = 'A'; 
            else if (correct >= 60) calcRank = 'B'; 
            else if (correct >= 45) calcRank = 'C'; 
            else calcRank = 'D';
        } else {
            if (correct === playData.calcCountTarget) { 
                if (duration <= 90 && accuracy >= 95) calcRank = 'S'; 
                else if (duration <= 120 && accuracy >= 90) calcRank = 'A'; 
                else if (duration <= 150 && accuracy >= 80) calcRank = 'B'; 
                else calcRank = 'C'; 
            } else if (correct >= 90 && accuracy >= 90) calcRank = 'A'; 
            else if (correct >= 80 && accuracy >= 80) calcRank = 'B'; 
            else if (correct >= 70 && accuracy >= 70) calcRank = 'C'; 
            else calcRank = 'D';
        }
        
        if (calcRank === 'S' || calcRank === 'A') gameState.stats.achieved_calcA = true;

        if (typeof window.addCalcRecord === 'function') {
            window.addCalcRecord({ correct, time: duration, date: new Date().toLocaleString('ja-JP') });
        }
        if (correct > 0) {
            const basePage = calcRank === 'S' ? 5 : calcRank === 'A' ? 4 : calcRank === 'B' ? 3 : calcRank === 'C' ? 2 : 1;
            const pageCount = basePage * 10; 
            
            if (!gameState.inventory) gameState.inventory = {};
            if (!gameState.inventory.bluePages) gameState.inventory.bluePages = 0;
            if (!gameState.inventory.redPages) gameState.inventory.redPages = 0;
            
            gameState.inventory.bluePages += pageCount;
            gameState.inventory.redPages += pageCount;
            dropInfo = { count: pageCount, icon: '📕📘', isCalc: true };
        }
        gameState.stats.totalPlay = (gameState.stats.totalPlay || 0) + 1;
        if (typeof window.updateMissionProgress === 'function') window.updateMissionProgress('calc', 1);
        
        if (resXpLabel) resXpLabel.innerText = "最終評価";

    } else {
        if (isClear) {
            playSE('win');
            const eqInv = gameState.charaInventory[gameState.equipped];
            if (eqInv) {
                const cMaster = rawData.characters ? rawData.characters.find(c => c.id == gameState.equipped) : null;
                const maxL = RARITY_CAPS[eqInv.currentRarity || (cMaster ? cMaster.rarity : 'N')] || 10;
                if (eqInv.level < maxL) {
                    eqInv.exp = (Number(eqInv.exp) || 0) + 1;
                    if (eqInv.exp >= EXP_REQ) { 
                        eqInv.exp -= EXP_REQ; 
                        eqInv.level++; 
                    }
                } else {
                    eqInv.exp = 0;
                }
            }
            if (!playData.isRevenge) {
                const subj = (playData.context ? playData.context.subject : "") || "";
                let dType = "";
                if (["国語", "社会", "英語"].some(k => subj.includes(k))) dType = "red";
                else if (["算数", "数学", "理科"].some(k => subj.includes(k))) dType = "blue";
                else dType = Math.random() < 0.5 ? "red" : "blue";
                const dCount = Math.floor(Math.random() * 4) + 2; 
                if (dType === "red") { 
                    gameState.inventory.redPages += dCount; 
                    dropInfo = { count: dCount, icon: '📕' }; 
                } else { 
                    gameState.inventory.bluePages += dCount; 
                    dropInfo = { count: dCount, icon: '📘' }; 
                }
            }
        } else {
            playSE('lose');
        }

        const stats = getCharaStats(); 
        let conditionRate = 1.0;
        const CAMPAIGN_RATE = 3.0;
        if (playData.context && rawData.config && !playData.isRevenge && !playData.isRandom && !playData.isTyping) {
            isCampaign = rawData.config.some(c => c.message && c.message !== "" && String(c.grade) === String(playData.context.grade) && String(c.subject) === String(playData.context.subject) && String(c.unit) === String(playData.context.unit));
        }
        if (playData.activeOaths && playData.activeOaths.length > 0) {
            const count = playData.activeOaths.length;
            if (count >= 3) conditionRate = 2.0; 
            else if (count === 2) conditionRate = 1.75; 
            else conditionRate = 1.5;
            if (isCampaign) conditionRate = Math.max(conditionRate, CAMPAIGN_RATE);
        } else if (playData.isRevenge || playData.isRandom) {
            conditionRate = 1.5;
        } else if (isCampaign) {
            conditionRate = CAMPAIGN_RATE;
        }
        const partA = gameState.score * stats.exp; 
        const partB = isClear ? (gameState.score * 0.2) : 0; 
        const partC = gameState.score * (conditionRate - 1.0);
        const currentGrade = playData.context ? playData.context.grade : (playData.questions && playData.questions.length > 0 ? playData.questions[0].grade : '');
        const gradeMultiplier = getGradeMultiplier(currentGrade);
        earned = Math.floor((partA + partB + partC) * gradeMultiplier);
        
        if (playData.activeReliefs && playData.activeReliefs.length > 0) {
            const rCount = playData.activeReliefs.length;
            const penalty = rCount >= 3 ? 0.5 : (rCount === 2 ? 0.7 : 0.9);
            earned = Math.floor(earned * penalty);
        }
        
        gameState.xp += earned;
        if (playData.context && !playData.isRevenge && !playData.isRandom) {
            const key = `${playData.context.grade}_${playData.context.subject}_${playData.context.unit}`;
            if (!gameState.unitProgress) gameState.unitProgress = {};
            if (!gameState.unitProgress[key]) gameState.unitProgress[key] = { played: false, cleared: false };
            gameState.unitProgress[key].played = true; 
            if (isClear) gameState.unitProgress[key].cleared = true;
        }
        gameState.stats.totalPlay = (gameState.stats.totalPlay || 0) + 1;
        if (isClear) {
            gameState.stats.totalKill = (gameState.stats.totalKill || 0) + 1;
            let requiredLives = 3;
            if (playData.activeReliefs && playData.activeReliefs.includes('life')) requiredLives = 5;
            else if (playData.activeOaths && playData.activeOaths.includes('backwater')) requiredLives = 1;
            if (gameState.lives >= requiredLives) { gameState.stats.achieved_perfect = true; }
            if (playData.isRevenge) gameState.revengeList = [];
            
            if (playData.isRandom) gameState.stats.achieved_random = true;
            if (playData.activeOaths && playData.activeOaths.length > 0) gameState.stats.achieved_oath = true;
        }

        if (typeof window.updateMissionProgress === 'function') {
            if (playData.isTyping) window.updateMissionProgress('typing', 1);
            else window.updateMissionProgress('play', 1);
            if (isClear && !playData.isTyping) window.updateMissionProgress('kill', 1); 
        }
    }

    saveGame(); 
    
    const resTitle = document.getElementById('res-title'); 
    if (resTitle) { 
        resTitle.innerText = isClear ? "QUEST CLEAR!" : "GAME OVER"; 
        resTitle.style.color = isClear ? "#f1c40f" : "#bdc3c7"; 
    }
    const resIcon = document.getElementById('res-icon'); 
    if (resIcon) resIcon.innerText = isClear ? "🎉" : "💔"; 
    
    const resScoreSpan = document.getElementById('res-score');
    if (resScoreSpan && resScoreSpan.previousSibling && resScoreSpan.previousSibling.nodeType === 3) {
        resScoreSpan.previousSibling.nodeValue = playData.isCalculation ? "総問題数: " : "獲得スコア: ";
    }
    if (resScoreSpan) resScoreSpan.innerText = playData.isCalculation ? playData.calcQIndex : gameState.score; 
    
    const dropHtml = dropInfo.count > 0 ? `<span>${dropInfo.icon}</span> ${dropInfo.count} 個` : 'なし';
    if (resDrop) resDrop.innerHTML = `入手アイテム: ${dropHtml}`;
    
    const resDetails = document.getElementById('res-details');
    if (!playData.isSurvival) {
        if (playData.isCalculation) {
            const duration = playData.calcMode === '3min' ? (180 - playData.calcTimeLeft).toFixed(1) : playData.calcElapsed.toFixed(1);
            const totalQ = playData.calcQIndex;
            const accuracy = totalQ > 0 ? ((playData.calcCorrect / totalQ) * 100).toFixed(1) : 0;
            
            if (resXpSpan) resXpSpan.innerHTML = `ランク: <span class="rank-${calcRank}" style="font-size:1.2em;">${calcRank}</span>`;
            if (resDetails) resDetails.innerHTML = `
                <div style="font-size: 0.85em; line-height: 1.6; text-align: left; display: inline-block;">
                    <div>🎯 <b>正解数</b> : ${playData.calcCorrect} 問</div>
                    <div>📊 <b>正解率</b> : ${accuracy} %</div>
                    <div>⏱️ <b>タイム</b> : ${duration} 秒</div>
                </div>
            `;
            
            if (dropInfo.count > 0 && resDrop) {
                resDrop.innerHTML = `入手アイテム: <span style="font-size:1.2em;">📕</span> × ${dropInfo.count} ／ <span style="font-size:1.2em;">📘</span> × ${dropInfo.count}`; 
            }
        } else if (isCampaign && isClear) {
            if (resXpSpan) resXpSpan.innerHTML = `<span style="font-size:0.5em; color:#e74c3c;">CAMPAIGN x3.0</span><br>+${earned}`;
            if (resDetails) resDetails.innerHTML = dropInfo.count > 0 ? `入手アイテム: ${dropInfo.icon} × ${dropInfo.count}` : 'リザルトを確認してください。';
        } else {
            if (resXpSpan) resXpSpan.innerHTML = "+" + earned;
            if (resDetails) resDetails.innerHTML = dropInfo.count > 0 ? `入手アイテム: ${dropInfo.icon} × ${dropInfo.count}` : 'リザルトを確認してください。';
        }
    }
    
    document.getElementById('game-screen')?.classList.add('hidden'); 
    document.getElementById('result-overlay')?.classList.remove('hidden'); 
    if (typeof window.checkTitles === 'function') window.checkTitles();
}

export function handleResultClose() {
    if (typeof rogueData !== 'undefined' && rogueData.active) {
        document.getElementById('result-overlay')?.classList.add('hidden');
        document.getElementById('field-screen')?.classList.remove('hidden');
        
        if (rogueData.isBossBattle) {
            rogueData.floor++;
            if (typeof window.generateRogueFloor === 'function') window.generateRogueFloor();
        } else {
            if (typeof window.drawRogueMap === 'function') window.drawRogueMap();
            if (rogueData.steps <= 0) {
                setTimeout(() => {
                    if (typeof window.showAppModal === 'function') {
                        window.showAppModal("歩数がゼロになりました。拠点に強制送還されます。", "alert").then(() => {
                            if (typeof window.exitRogueSystem === 'function') window.exitRogueSystem(false);
                        });
                    }
                }, 100);
            }
        }
        playBGM();
    } else {
        backToTitle();
    }
}

export function backToTitle() { 
    document.getElementById('result-overlay')?.classList.add('hidden'); 
    document.getElementById('game-screen')?.classList.add('hidden'); 
    document.getElementById('title-screen')?.classList.remove('hidden'); 
    document.getElementById('pause-overlay')?.classList.add('hidden'); 
    document.getElementById('field-screen')?.classList.add('hidden');
    document.getElementById('rogue-shop-overlay')?.classList.add('hidden');
    if (typeof rogueData !== 'undefined') rogueData.active = false;
    if (runtimeState.countdownTimer) clearInterval(runtimeState.countdownTimer);
    clearInterval(gameState.timer); 
    runtimeState.isGameActive = false; 
    runtimeState.isPaused = false; 
    runtimeState.currentCategory = null;
    if (typeof window.handleTypingInput === 'function') {
        document.removeEventListener('keydown', window.handleTypingInput);
    }
    document.getElementById('ui-choices')?.classList.remove('hidden'); 
    document.getElementById('ui-typing-area')?.classList.add('hidden'); 
    document.getElementById('ui-question')?.classList.remove('hidden');
    
    document.getElementById('calc-layout')?.classList.add('hidden');
    document.getElementById('ui-calc-answer')?.classList.add('hidden');
    document.getElementById('calc-keypad')?.classList.add('hidden');
    document.getElementById('ui-calc-progress')?.classList.add('hidden');
    
    const hpFrame = document.querySelector('.enemy-hp-frame'); 
    if (hpFrame) hpFrame.style.display = '';
    const enemyRow = document.querySelector('.enemy-stats-row'); 
    if (enemyRow) enemyRow.style.display = '';

    const qBox = document.getElementById('ui-question');
    if (qBox) {
        qBox.style.removeProperty('height');
        qBox.style.removeProperty('min-height');
    }

    const uiScoreSpan = document.getElementById('ui-score'); 
    if (uiScoreSpan && uiScoreSpan.previousSibling && uiScoreSpan.previousSibling.nodeType === 3) uiScoreSpan.previousSibling.nodeValue = "SCORE ";
    const uiComboSpan = document.getElementById('ui-combo'); 
    if (uiComboSpan && uiComboSpan.previousSibling && uiComboSpan.previousSibling.nodeType === 3) uiComboSpan.previousSibling.nodeValue = "COMBO ";
    const resScoreSpan = document.getElementById('res-score'); 
    if (resScoreSpan && resScoreSpan.previousSibling && resScoreSpan.previousSibling.nodeType === 3) resScoreSpan.previousSibling.nodeValue = "獲得スコア: ";

    playData.isTyping = false; 
    playData.isCalculation = false; 
    playData.isSurvival = false;
    stopBGM(); 
    if (typeof window.updateTitleInfo === 'function') window.updateTitleInfo(); 
    if (typeof window.updateMissionBadge === 'function') window.updateMissionBadge(); 
    if (typeof window.checkTitles === 'function') window.checkTitles();
}
