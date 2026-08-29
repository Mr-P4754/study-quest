// ==========================================
// js/ui-manager.js (カテゴリー遷移・モーダル・プレイガイド・成績表・ギフト)
// ==========================================

import {
    gameState,
    rawData,
    dailyMissions,
    runtimeState,
    GUIDE_DATA,
    saveGame
} from './state.js';

import {
    getDisplayName,
    drawRadarChart
} from './utils.js';

// ==========================================
// タイトル初期化・カテゴリー制御
// ==========================================
export function initTitle() {
    if(!rawData.questions || rawData.questions.length === 0) return;
    const grades = [...new Set(rawData.questions.map(q => q.grade))].filter(g => g);
    
    // 通常クエスト用
    const gSelect = document.getElementById('grade-select'); 
    if(gSelect) {
        gSelect.innerHTML = '<option value="">学年を選択</option>';
        grades.forEach(g => gSelect.innerHTML += `<option value="${g}">${g}</option>`);
    }
    
    // サバイバル用初期化
    const survSelect = document.getElementById('survival-grade-select');
    if(survSelect) {
        survSelect.innerHTML = '<option value="">学年を選択...</option>';
        grades.forEach(g => survSelect.innerHTML += `<option value="${g}">${g}</option>`);
    }

    // ランダム用初期化
    const randSelect = document.getElementById('random-grade-select');
    if(randSelect) {
        randSelect.innerHTML = '<option value="">学年を選択...</option>';
        grades.forEach(g => randSelect.innerHTML += `<option value="${g}">${g}</option>`);
    }

    // 探索用初期化
    const rogueSelect = document.getElementById('rogue-grade-select');
    if(rogueSelect) {
        rogueSelect.innerHTML = '<option value="">学年を選択...</option>';
        grades.forEach(g => rogueSelect.innerHTML += `<option value="${g}">${g}</option>`);
    }

    filterSubjects(); 
    updateTitleInfo();
}

export function filterSubjects() {
    const gSelect = document.getElementById('grade-select'); 
    if(!gSelect) return;
    const gVal = gSelect.value;
    const sSelect = document.getElementById('subject-select'); 
    if(!sSelect) return; 
    sSelect.innerHTML = '<option value="">教科を選択</option>';
    const uSelect = document.getElementById('unit-select'); 
    if(uSelect) uSelect.innerHTML = '<option value="">単元を選択</option>';
    if(!gVal) return;
    
    let targetList = rawData.questions.filter(q => q.grade == gVal);
    const subjects = [...new Set(targetList.map(q => q.subject))].filter(s => s);
    subjects.forEach(s => sSelect.innerHTML += `<option value="${s}">${s}</option>`);
}

export function filterUnits() {
    const gSelect = document.getElementById('grade-select'); 
    const sSelect = document.getElementById('subject-select'); 
    if(!gSelect || !sSelect) return;
    const gVal = gSelect.value; 
    const sVal = sSelect.value;
    const uSelect = document.getElementById('unit-select'); 
    if(!uSelect) return; 
    uSelect.innerHTML = '<option value="">単元を選択</option>';
    if(!gVal || !sVal) return;
    
    let targetList = rawData.questions.filter(q => q.grade == gVal && q.subject == sVal);
    const units = [...new Set(targetList.map(q => q.unit))].filter(u => u);
    const activeConfigs = rawData.config ? rawData.config.filter(c => c.message && c.message !== "") : [];
    
    units.forEach(u => {
        let label = u; 
        const isTarget = activeConfigs.some(c => String(c.grade) === String(gVal) && String(c.subject) === String(sVal) && String(c.unit) === String(u));
        if (isTarget) label = "★ " + u;
        if (gameState.unitProgress) { 
            const key = `${gVal}_${sVal}_${u}`; 
            const prog = gameState.unitProgress[key]; 
            if (prog) { 
                if (prog.cleared) label += " ◎"; 
                else if (prog.played) label += " ◯"; 
            } 
        }
        uSelect.innerHTML += `<option value="${u}">${label}</option>`;
    });
}

export function updateTitleInfo() {
    const chara = (rawData.characters && rawData.characters.length > 0) ? rawData.characters.find(c => String(c.id) == String(gameState.equipped)) : null;
    const inv = gameState.charaInventory[gameState.equipped] || (chara ? gameState.charaInventory[chara.id] : null);
    let lv = (inv && inv.level) ? inv.level : 0;
    const displayName = (chara && typeof getDisplayName === 'function') ? getDisplayName(chara, inv) : (chara ? chara.name : "なし");
    const tEquippedName = document.getElementById('title-equipped-name'); 
    if(tEquippedName) tEquippedName.innerHTML = displayName + (chara ? " Lv." + lv : "");
    const tXp = document.getElementById('title-xp'); 
    if(tXp) tXp.innerText = gameState.xp;
    const imgContainer = document.getElementById('title-chara-img');
    if(imgContainer) {
        if(chara?.imageUrl && chara.imageUrl.startsWith('http')) {
            imgContainer.innerHTML = `<img src="${chara.imageUrl}" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            imgContainer.innerHTML = `<div style="text-align:center;line-height:40px;">✏️</div>`;
        }
    }
    
    const rBadge = document.getElementById('revenge-badge'); 
    const rCount = (gameState.revengeList || []).length;
    if(rBadge) {
        if (rCount > 0) { 
            rBadge.innerText = rCount; 
            rBadge.classList.remove('hidden'); 
        } else { 
            rBadge.innerText = '0'; 
            rBadge.classList.add('hidden'); 
        }
        const rBtn = rBadge.closest('button');
        if (rBtn) rBtn.disabled = (rCount === 0);
    }

    const banner = document.getElementById('campaign-banner'); 
    const bannerText = document.getElementById('campaign-text');
    let activeConfigs = []; 
    if (rawData.config) activeConfigs = rawData.config.filter(c => c.message && c.message !== "");
    if(banner && bannerText) {
        if (activeConfigs.length > 0) { 
            banner.classList.remove('hidden'); 
            banner.style.display = 'block'; 
            const combinedText = activeConfigs.map(c => `📢 ${c.message} （強化対象: ${c.grade} ${c.subject} ${c.unit}）`).join("   "); 
            bannerText.innerText = combinedText; 
        } else { 
            banner.style.display = 'none'; 
        }
    }
    
    updateCategoryBadges();
}

export function updateCategoryBadges() {
    const revenge = document.getElementById('revenge-badge');
    const badgeSpecial = document.getElementById('badge-special');
    if (badgeSpecial) {
        if (revenge && !revenge.classList.contains('hidden')) badgeSpecial.classList.remove('hidden');
        else badgeSpecial.classList.add('hidden');
    }

    const mission = document.getElementById('mission-badge');
    const title = document.getElementById('title-badge');
    const gift = document.getElementById('gift-badge');
    const badgeAchievement = document.getElementById('badge-achievement');
    if (badgeAchievement) {
        const hasMission = mission && !mission.classList.contains('hidden');
        const hasTitle = title && !title.classList.contains('hidden');
        const hasGift = gift && !gift.classList.contains('hidden');
        if (hasMission || hasTitle || hasGift) badgeAchievement.classList.remove('hidden');
        else badgeAchievement.classList.add('hidden');
    }
}

export function openCategory(categoryId) {
    runtimeState.currentCategory = categoryId;
    document.getElementById('cat-' + categoryId + '-overlay')?.classList.remove('hidden');
}

export function closeCategory(categoryId) {
    runtimeState.currentCategory = null;
    document.getElementById('cat-' + categoryId + '-overlay')?.classList.add('hidden');
}

export function closeAllCategoryModals() {
    ['main', 'special', 'gacha', 'achievement', 'guide'].forEach(c => {
        document.getElementById(`cat-${c}-overlay`)?.classList.add('hidden');
    });
}

export function hideCurrentCategoryOverlay() {
    if (runtimeState.currentCategory) {
        document.getElementById(`cat-${runtimeState.currentCategory}-overlay`)?.classList.add('hidden');
    }
}

export function returnToCurrentCategory() {
    if (runtimeState.currentCategory) {
        document.getElementById(`cat-${runtimeState.currentCategory}-overlay`)?.classList.remove('hidden');
    }
}

// ==========================================
// モード選択モーダル開閉制御
// ==========================================
export function openUnitSelection() { 
    hideCurrentCategoryOverlay();
    const unitTitle = document.getElementById('unit-select-title'); 
    if(unitTitle) { unitTitle.innerText = "クエスト出発"; unitTitle.style.color = "#2c3e50"; } 
    document.getElementById('unit-select-overlay')?.classList.remove('hidden'); 
}
export function closeUnitSelection() { 
    document.getElementById('unit-select-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function openRandomMenu() { 
    hideCurrentCategoryOverlay();
    document.getElementById('random-overlay')?.classList.remove('hidden'); 
}
export function closeRandomMenu() { 
    document.getElementById('random-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function openTypingMenu() { 
    if(!rawData.typing || rawData.typing.length === 0) return alert("タイピング問題データが見つかりません");
    const grades = [...new Set(rawData.typing.map(t => t.grade))].filter(g => g);
    const sel = document.getElementById('typing-grade-select'); 
    if(!sel) return; 
    sel.innerHTML = '<option value="">学年を選択...</option>';
    grades.forEach(g => sel.innerHTML += `<option value="${g}">${g}</option>`);
    hideCurrentCategoryOverlay();
    document.getElementById('typing-menu-overlay')?.classList.remove('hidden'); 
}
export function closeTypingMenu() { 
    document.getElementById('typing-menu-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function openSurvivalMenu() { 
    hideCurrentCategoryOverlay();
    document.getElementById('survival-overlay')?.classList.remove('hidden'); 
}
export function closeSurvivalMenu() { 
    document.getElementById('survival-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function openCalcMenu() { 
    hideCurrentCategoryOverlay();
    document.getElementById('calc-overlay')?.classList.remove('hidden'); 
}
export function closeCalcMenu() { 
    document.getElementById('calc-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function openRogueMenu() { 
    hideCurrentCategoryOverlay();
    document.getElementById('rogue-menu-overlay')?.classList.remove('hidden'); 
}
export function closeRogueMenu() { 
    document.getElementById('rogue-menu-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function openOathMenu() {
    runtimeState.tempOaths = [];
    document.querySelectorAll('.oath-option').forEach(el => el.classList.remove('selected'));
    document.getElementById('oath-overlay')?.classList.remove('hidden');
}
export function closeOathMenu() {
    document.getElementById('oath-overlay')?.classList.add('hidden');
    if (runtimeState.oathOrigin === 'survival') {
        openSurvivalMenu();
    } else {
        openUnitSelection();
    }
}

export function openReliefMenu() {
    runtimeState.tempReliefs = [];
    document.querySelectorAll('.oath-option').forEach(el => el.classList.remove('selected'));
    document.getElementById('relief-overlay')?.classList.remove('hidden');
}
export function closeReliefMenu() {
    document.getElementById('relief-overlay')?.classList.add('hidden');
    if (runtimeState.oathOrigin === 'survival') {
        openSurvivalMenu();
    } else {
        openUnitSelection();
    }
}

export function openSyncMenu() {
    const idEl = document.getElementById('my-user-id');
    if (idEl) idEl.innerText = runtimeState.currentUserId || '--------';
    document.getElementById('sync-overlay')?.classList.remove('hidden');
}
export function closeSyncMenu() {
    document.getElementById('sync-overlay')?.classList.add('hidden');
}

export function openVersionHistory() { 
    hideCurrentCategoryOverlay();
    document.getElementById('version-overlay')?.classList.remove('hidden'); 
}
export function closeVersionHistory() { 
    document.getElementById('version-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

// ==========================================
// ギフトシステム
// ==========================================
export function openGiftMenu() { 
    hideCurrentCategoryOverlay();
    document.getElementById('gift-overlay')?.classList.remove('hidden'); 
    renderGiftList(); 
}
export function closeGiftMenu() { 
    document.getElementById('gift-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function renderGiftList() {
    const list = document.getElementById('gift-list');
    if (!list) return;
    list.innerHTML = '';
    
    let gifts = rawData.gifts || [];
    let unclaimed = gifts.filter(g => g.id && !gameState.claimedGifts.includes(g.id));
    
    if (unclaimed.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#7f8c8d;">受け取れるギフトはありません。</div>';
        return;
    }
    
    unclaimed.forEach(g => {
        list.innerHTML += `
            <div class="gift-item">
                <div class="gift-header">
                    <span class="gift-title">${g.title || 'プレゼント'}</span>
                    <span class="gift-exp">+${g.exp || 0} XP</span>
                </div>
                <div class="gift-msg">${g.message || ''}</div>
            </div>
        `;
    });
}

export function receiveAllGifts() {
    let gifts = rawData.gifts || [];
    let unclaimed = gifts.filter(g => g.id && !gameState.claimedGifts.includes(g.id));
    if (unclaimed.length === 0) return alert("受け取れるギフトがありません。");
    
    let totalExp = 0;
    unclaimed.forEach(g => {
        gameState.claimedGifts.push(g.id);
        totalExp += Number(g.exp || 0);
    });
    
    gameState.xp += totalExp;
    saveGame();
    renderGiftList();
    updateTitleInfo();
    checkAdminGifts();
    alert(`合計 ${totalExp} XP のギフトを受け取りました！`);
}

export function checkAdminGifts() {
    let gifts = rawData.gifts || [];
    let count = gifts.filter(g => g.id && !gameState.claimedGifts.includes(g.id)).length;
    const badge = document.getElementById('gift-badge');
    if (badge) {
        if (count > 0) {
            badge.innerText = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    updateCategoryBadges();
}

// ==========================================
// 成績表・学力レポート
// ==========================================
export function openRecord() { 
    hideCurrentCategoryOverlay();
    document.getElementById('record-overlay')?.classList.remove('hidden'); 
    renderRecord(); 
}
export function closeRecord() { 
    document.getElementById('record-overlay')?.classList.add('hidden'); 
    returnToCurrentCategory();
}

export function renderRecord() {
    const summaryBox = document.getElementById('record-summary');
    const tbody = document.getElementById('grade-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const statsObj = gameState.subjectStats || {};
    const subjects = Object.keys(statsObj).sort();
    
    let grandTotal = 0;
    let grandCorrect = 0;
    
    if (subjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-10 text-gray">データがありません。<br>クエストをプレイしてください。</td></tr>';
        drawRadarChart([], []);
    } else {
        const labels = [];
        const dataPoints = [];
        subjects.forEach(subj => {
            const d = statsObj[subj] || { correct: 0, total: 0 };
            const total = Number(d.total) || 0;
            const correct = Number(d.correct) || 0;
            grandTotal += total;
            grandCorrect += correct;
            const rate = total > 0 ? (correct / total * 100) : 0;
            
            let rank = 'G';
            if (rate >= 90) rank = 'S';
            else if (rate >= 80) rank = 'A';
            else if (rate >= 70) rank = 'B';
            else if (rate >= 60) rank = 'C';
            else if (rate >= 50) rank = 'D';
            else if (rate >= 40) rank = 'E';
            else if (rate >= 20) rank = 'F';
            
            labels.push(subj);
            dataPoints.push(rate);
            tbody.innerHTML += `<tr><td class="font-bold">${subj}</td><td>${rate.toFixed(1)}% <span class="record-sub-stat">(${correct}/${total})</span></td><td class="rank-${rank}">${rank}</td></tr>`;
        });
        drawRadarChart(labels, dataPoints);
    }
    
    if (summaryBox) {
        const grandRate = grandTotal > 0 ? (grandCorrect / grandTotal * 100) : 0;
        let grandRank = 'G';
        if (grandRate >= 90) grandRank = 'S';
        else if (grandRate >= 80) grandRank = 'A';
        else if (grandRate >= 70) grandRank = 'B';
        else if (grandRate >= 60) grandRank = 'C';
        else if (grandRate >= 50) grandRank = 'D';
        else if (grandRate >= 40) grandRank = 'E';
        else if (grandRate >= 20) grandRank = 'F';
        
        summaryBox.innerHTML = `
            <div class="record-summary-row">
                <div class="record-summary-card">
                    <div class="record-summary-label">総合正答率</div>
                    <div class="record-summary-val text-purple">${grandRate.toFixed(1)}% <span class="rank-${grandRank} text-lg">(${grandRank})</span></div>
                </div>
                <div class="record-summary-card">
                    <div class="record-summary-label">総解答数</div>
                    <div class="record-summary-val text-dark">${grandCorrect} / ${grandTotal}</div>
                </div>
            </div>
        `;
    }
    
    const recordList = document.getElementById('calc-record-list');
    if (!recordList) return;
    recordList.innerHTML = '';
    
    const calcObj = gameState.calcRecords || {};
    const keys = Object.keys(calcObj);
    if (keys.length === 0) {
        recordList.innerHTML = '<div class="text-gray p-5">計算クエストの記録はありません。</div>';
        return;
    }
    
    keys.forEach(key => {
        const parts = key.split('_');
        const mode = parts.pop();
        const type = parts.join('_');
        const title = {
            addition: 'たし算',
            subtraction: 'ひき算',
            multiplication: 'かけ算',
            division: '割り算(あまりなし)',
            division_remainder: '割り算(あまりあり)',
            random: 'ランダム'
        }[type] || type;
        const modeLabel = mode === '100q' ? '100問' : '3分';
        const list = calcObj[key];
        if (!Array.isArray(list) || list.length === 0) return;
        
        let html = `<div class="calc-record-group"><div class="calc-record-title">⚡ ${title} / ${modeLabel}</div>`;
        list.forEach((item, index) => {
            const timeNum = Number(item.time) || 0;
            const correctNum = Number(item.correct) || 0;
            const dateStr = item.date ? `<span class="calc-record-date">${item.date}</span>` : '';
            html += `<div class="calc-record-item"><span class="calc-record-rank">${index + 1}.</span> <span>${correctNum}正解 / ${timeNum.toFixed(1)}秒</span> ${dateStr}</div>`;
        });
        html += '</div>';
        recordList.innerHTML += html;
    });
}

export function addCalcRecord(entry) {
    const key = `${playData.calcType}_${playData.calcMode}`;
    if (!gameState.calcRecords) gameState.calcRecords = {}; 
    if (!gameState.calcRecords[key]) gameState.calcRecords[key] = [];
    gameState.calcRecords[key].push(entry); 
    gameState.calcRecords[key].sort((a,b) => { 
        if (a.correct !== b.correct) return b.correct - a.correct; 
        return a.time - b.time; 
    });
    gameState.calcRecords[key] = gameState.calcRecords[key].slice(0, 10);
    saveGame();
}

// ==========================================
// 汎用アプリモーダルダイアログ
// ==========================================
export function showAppModal(message, type = 'alert') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('app-modal-overlay');
        const msgBox = document.getElementById('app-modal-message');
        const okBtn = document.getElementById('app-modal-ok');
        const cancelBtn = document.getElementById('app-modal-cancel');
        if (!overlay || !msgBox || !okBtn || !cancelBtn) {
            if (type === 'confirm') resolve(window.confirm(message));
            else { window.alert(message); resolve(true); }
            return;
        }
        msgBox.innerText = message;
        if (type === 'alert') {
            cancelBtn.style.display = 'none';
            okBtn.style.width = '100%';
            okBtn.innerText = 'OK';
        } else {
            cancelBtn.style.display = 'block';
            okBtn.style.width = '';
            okBtn.innerText = 'はい';
            cancelBtn.innerText = 'いいえ';
        }
        runtimeState.appModalResolve = resolve;
        overlay.classList.remove('hidden');
        
        okBtn.onclick = () => {
            overlay.classList.add('hidden');
            if (runtimeState.appModalResolve) runtimeState.appModalResolve(true);
        };
        cancelBtn.onclick = () => {
            overlay.classList.add('hidden');
            if (runtimeState.appModalResolve) runtimeState.appModalResolve(false);
        };
    });
}

export function showAlert(msg) { return showAppModal(msg, 'alert'); }
export function showConfirm(msg) { return showAppModal(msg, 'confirm'); }

// ==========================================
// プレイガイドモジュール
// ==========================================
export const GuideModule = {
    open: function(topicId = null) {
        hideCurrentCategoryOverlay();
        const existing = document.getElementById('guide-overlay');
        if (existing) existing.remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'guide-overlay';
        overlay.className = 'overlay overlay-z400';
        
        const modal = document.createElement('div');
        modal.className = 'modal modal-w500';
        
        if (topicId && GUIDE_DATA.topics[topicId]) {
            modal.innerHTML = this.getTopicDetailHtml(topicId);
        } else {
            modal.innerHTML = this.getCategoryListHtml();
        }
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    },
    
    close: function() {
        const overlay = document.getElementById('guide-overlay');
        if (overlay) overlay.remove();
        returnToCurrentCategory();
    },
    
    showCategoryList: function() {
        const modal = document.querySelector('#guide-overlay .modal');
        if (modal) modal.innerHTML = this.getCategoryListHtml();
    },
    
    showTopicDetail: function(topicId) {
        const modal = document.querySelector('#guide-overlay .modal');
        if (modal) modal.innerHTML = this.getTopicDetailHtml(topicId);
    },
    
    getCategoryListHtml: function() {
        let html = `
            <div class="guide-header">
                <h2 class="m-0 text-cyan">📖 プレイガイド</h2>
                <button class="guide-close-x" onclick="GuideModule.close()">✕</button>
            </div>
            <div class="modal-scroll-area text-left">
        `;
        
        GUIDE_DATA.categories.forEach(cat => {
            html += `
                <div class="guide-category-section">
                    <div class="guide-category-title font-bold">${cat.icon} ${cat.name}</div>
                    <div class="guide-card-grid">
            `;
            
            Object.keys(GUIDE_DATA.topics).forEach(tid => {
                const t = GUIDE_DATA.topics[tid];
                if (t.categoryId === cat.id) {
                    html += `
                        <div class="guide-card-item" onclick="GuideModule.showTopicDetail('${tid}')">
                            <div class="guide-card-icon">${t.icon}</div>
                            <div class="guide-card-text">
                                <div class="guide-card-title">${t.title}</div>
                                <div class="guide-card-sub">${t.summary}</div>
                            </div>
                        </div>
                    `;
                }
            });
            
            html += `</div></div>`;
        });
        
        html += `
            </div>
            <button class="menu-btn mt-15 btn-gray" onclick="GuideModule.close()">閉じる</button>
        `;
        return html;
    },
    
    getTopicDetailHtml: function(topicId) {
        const t = GUIDE_DATA.topics[topicId];
        if (!t) return this.getCategoryListHtml();
        
        return `
            <div class="guide-header">
                <h3 class="m-0 text-cyan">${t.icon} ${t.title}</h3>
                <button class="guide-close-x" onclick="GuideModule.close()">✕</button>
            </div>
            <div class="guide-detail-body">
                ${t.contentHtml}
            </div>
            <div class="modal-btn-grid mt-15">
                <button class="menu-btn btn-navy" onclick="GuideModule.showCategoryList()">◀ 一覧に戻る</button>
                <button class="menu-btn btn-gray" onclick="GuideModule.close()">閉じる</button>
            </div>
        `;
    }
};
