function showCutIn(t) { const d = document.createElement('div'); d.className='cutin'; d.innerText=t; if(String(t).includes('MISS')) { d.style.color='#bdc3c7'; d.style.webkitTextStroke='2px #2c3e50'; } document.body.appendChild(d); setTimeout(()=>d.remove(), 1500); }
function updateUI() { 
    document.getElementById('ui-life').innerText = '❤️'.repeat(Math.max(0, gameState.lives)); 
    document.getElementById('ui-score').innerText = playData.isCalculation ? playData.calcQIndex : gameState.score; 
    document.getElementById('ui-combo').innerText = playData.isCalculation ? playData.calcCorrect : gameState.combo; 
    document.getElementById('ui-hp').style.width = (gameState.enemyHP/gameState.maxHP*100)+'%'; 
    document.getElementById('ui-hp-text').innerText = `${gameState.enemyHP}/${gameState.maxHP}`; 
}

function togglePause() { 
    isPaused = !isPaused; document.getElementById('pause-overlay').classList.toggle('hidden', !isPaused);
    if(isPaused) {
        const infoBox = document.getElementById('pause-chara-info');
        const charaId = gameState.equipped;
        const chara = rawData.characters ? rawData.characters.find(c => c.id == charaId) : null;
        if(chara) {
            const inv = gameState.charaInventory[charaId] || { level: 1 };
            const baseVal = (inv.isEvolved && inv.customValue) ? inv.customValue : chara.value;
            const r = inv.currentRarity || chara.rarity;
            const name = getDisplayName(chara, inv);
            let val = Number(baseVal) + (inv.level * LV_BONUS_RATE);
            let visual = "";
            if(chara.imageUrl && chara.imageUrl.startsWith('http')) visual = `<img src="${chara.imageUrl}" style="width:60px;height:60px;object-fit:contain;background:#fff;border-radius:5px;">`; else visual = `<div style="font-size:40px;">✏️</div>`;
            infoBox.innerHTML = `<div style="display:flex; align-items:center; gap:10px; text-align:left;">${visual}<div><div style="font-weight:bold; color:#ecf0f1; font-size:0.9em;">${name}</div><div style="color:#f39c12; font-weight:bold; font-size:0.8em;">Lv.${inv.level}</div><div style="font-size:0.7em; color:#bdc3c7;"><span class="rarity-${r}" style="font-weight:bold; font-size:1.2em; margin-right:5px;">${r}</span>効果: x${val.toFixed(2)}</div></div></div>`;
        } else { infoBox.innerHTML = `<div style="color:#bdc3c7; font-size:0.8em;">装備なし</div>`; }
    }
}

function resumeGame() { isPaused = false; document.getElementById('pause-overlay').classList.add('hidden'); }
async function retryGame() { 
    if (!(await showConfirm("やり直しますか？"))) return; 
    isGameActive=false; clearInterval(gameState.timer); resumeGame(); 
    
    document.getElementById('calc-layout').classList.add('hidden');
    document.getElementById('ui-calc-answer').classList.add('hidden');
    document.getElementById('calc-keypad').classList.add('hidden');
    document.getElementById('ui-calc-progress').classList.add('hidden');
    document.getElementById('ui-choices').classList.remove('hidden');
    document.getElementById('ui-typing-area').classList.add('hidden');
    document.querySelector('.enemy-stats-row').style.display = '';

    const qBox = document.getElementById('ui-question');
    if (qBox) { qBox.style.removeProperty('height'); qBox.style.removeProperty('min-height'); }

    const uiScoreSpan = document.getElementById('ui-score'); if(uiScoreSpan && uiScoreSpan.previousSibling) uiScoreSpan.previousSibling.nodeValue = "SCORE ";
    const uiComboSpan = document.getElementById('ui-combo'); if(uiComboSpan && uiComboSpan.previousSibling) uiComboSpan.previousSibling.nodeValue = "COMBO ";
    const resScoreSpan = document.getElementById('res-score'); if(resScoreSpan && resScoreSpan.previousSibling) resScoreSpan.previousSibling.nodeValue = "獲得スコア: ";
    
    if (playData.isCalculation) { startCalcGame(); }
    else if (playData.isTyping) { startTypingGame(); }
    else if (playData.isRandom) { startRandomGame(); }
    else if (playData.activeOaths && playData.activeOaths.length > 0) { startOathGame(); }
    else if (playData.isRevenge) { startRevengeMode(); }
    else { startGame(); }
}
async function backToTitleFromPause() { if (!(await showConfirm("戻りますか？"))) return; isGameActive=false; clearInterval(gameState.timer); backToTitle(); }

function finishGame(isClear) { 
    isGameActive=false; clearInterval(gameState.timer); 
    document.removeEventListener('keydown', handleTypingInput);
    stopBGM();

    let dropInfo = { count: 0, icon: '' };
    let calcRank = null;
    let earned = 0;
    let isCampaign = false;

    if (playData.isCalculation) {
        playSE(isClear ? 'win' : 'lose');
        const duration = playData.calcMode === '3min' ? 180 - playData.calcTimeLeft : playData.calcElapsed;
        const correct = playData.calcCorrect;
        const totalQ = playData.calcQIndex;
        const accuracy = totalQ > 0 ? (correct / totalQ) * 100 : 0;

        if (playData.calcMode === '3min') {
            if (correct >= 90) calcRank = 'S'; else if (correct >= 75) calcRank = 'A'; else if (correct >= 60) calcRank = 'B'; else if (correct >= 45) calcRank = 'C'; else calcRank = 'D';
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
        addCalcRecord({ correct, time: duration, date: new Date().toLocaleString('ja-JP') });
        if (correct > 0) {
            const basePage = calcRank === 'S' ? 5 : calcRank === 'A' ? 4 : calcRank === 'B' ? 3 : calcRank === 'C' ? 2 : 1;
            const pageCount = basePage * 10; // 基本量の10倍
            
            if (!gameState.inventory) gameState.inventory = {};
            if (!gameState.inventory.bluePages) gameState.inventory.bluePages = 0;
            if (!gameState.inventory.redPages) gameState.inventory.redPages = 0;
            
            // 赤と青の両方を加算
            gameState.inventory.bluePages += pageCount;
            gameState.inventory.redPages += pageCount;
            
            dropInfo = { count: pageCount, icon: '📕📘', isCalc: true };
        }
        gameState.stats.totalPlay = (gameState.stats.totalPlay || 0) + 1;
    } else {
        if(isClear) {
            playSE('win');
            const eqInv = gameState.charaInventory[gameState.equipped];
            if (eqInv) {
                eqInv.exp = (Number(eqInv.exp) || 0) + 1;
                const cMaster = rawData.characters.find(c => c.id == gameState.equipped);
                const maxL = RARITY_CAPS[eqInv.currentRarity || cMaster.rarity] || 10;
                if (eqInv.exp >= EXP_REQ && eqInv.level < maxL) { eqInv.exp -= EXP_REQ; eqInv.level++; }
            }
            if (!playData.isRevenge) {
                const subj = (playData.context ? playData.context.subject : "") || "";
                let dType = "";
                if (["国語", "社会", "英語"].some(k => subj.includes(k))) dType = "red";
                else if (["算数", "数学", "理科"].some(k => subj.includes(k))) dType = "blue";
                else dType = Math.random() < 0.5 ? "red" : "blue";
                const dCount = Math.floor(Math.random() * 4) + 2; 
                if (dType === "red") { gameState.inventory.redPages += dCount; dropInfo = { count: dCount, icon: '📕' }; }
                else { gameState.inventory.bluePages += dCount; dropInfo = { count: dCount, icon: '📘' }; }
            }
        } else playSE('lose');

        const stats = getCharaStats(); 
        let conditionRate = 1.0;
        const CAMPAIGN_RATE = 3.0;
        if (playData.context && rawData.config && !playData.isRevenge && !playData.isRandom && !playData.isTyping) {
            isCampaign = rawData.config.some(c => c.message && c.message !== "" && String(c.grade) === String(playData.context.grade) && String(c.subject) === String(playData.context.subject) && String(c.unit) === String(playData.context.unit));
        }
        if (playData.activeOaths && playData.activeOaths.length > 0) {
            const count = playData.activeOaths.length;
            if (count >= 3) conditionRate = 2.0; else if (count === 2) conditionRate = 1.75; else conditionRate = 1.5;
            if (isCampaign) conditionRate = Math.max(conditionRate, CAMPAIGN_RATE);
        } else if (playData.isRevenge || playData.isRandom) {
            conditionRate = 1.5;
        } else if (isCampaign) {
            conditionRate = CAMPAIGN_RATE;
        }
        const partA = gameState.score * stats.exp; const partB = isClear ? (gameState.score * 0.2) : 0; const partC = gameState.score * (conditionRate - 1.0);
        earned = Math.floor(partA + partB + partC);
        gameState.xp += earned;
        if (playData.context && !playData.isRevenge && !playData.isRandom) {
            const key = `${playData.context.grade}_${playData.context.subject}_${playData.context.unit}`;
            if (!gameState.unitProgress) gameState.unitProgress = {};
            if (!gameState.unitProgress[key]) gameState.unitProgress[key] = { played: false, cleared: false };
            gameState.unitProgress[key].played = true; if (isClear) gameState.unitProgress[key].cleared = true;
        }
        gameState.stats.totalPlay = (gameState.stats.totalPlay || 0) + 1;
        if(isClear) {
            gameState.stats.totalKill = (gameState.stats.totalKill || 0) + 1;
            let requiredLives = 3;
            if (playData.activeOaths && playData.activeOaths.includes('backwater')) requiredLives = 1;
            if (gameState.lives >= requiredLives) { gameState.stats.achieved_perfect = true; saveGame(); }
            if (playData.isRevenge) gameState.revengeList = [];
        }
    }

    saveGame(); 
    updateMissionProgress('play',1); if(isClear && !playData.isCalculation) updateMissionProgress('kill',1); 
    document.getElementById('res-title').innerText=isClear?"QUEST CLEAR!":"GAME OVER"; 
    document.getElementById('res-icon').innerText=isClear?"🎉":"💔"; 
    document.getElementById('res-title').style.color=isClear?"#f1c40f":"#bdc3c7"; 
    
    const resScoreSpan = document.getElementById('res-score');
    if (resScoreSpan && resScoreSpan.previousSibling) {
        resScoreSpan.previousSibling.nodeValue = playData.isCalculation ? "総問題数: " : "獲得スコア: ";
    }
    document.getElementById('res-score').innerText = playData.isCalculation ? playData.calcQIndex : gameState.score; 
    
    const dropText = dropInfo.count > 0 ? `<div style="font-size:0.9em;">${dropInfo.icon} × ${dropInfo.count}</div>` : `<div style="font-size:0.9em; color:#7f8c8d;">入手なし</div>`;
    const dropHtml = dropInfo.count > 0 ? `<span>${dropInfo.icon}</span> ${dropInfo.count} 個` : 'なし';
    document.getElementById('res-drop').innerHTML = `入手アイテム: ${dropHtml}`;
    
    if (playData.isCalculation) {
        const duration = playData.calcMode === '3min' ? (180 - playData.calcTimeLeft).toFixed(1) : playData.calcElapsed.toFixed(1);
        const totalQ = playData.calcQIndex;
        const accuracy = totalQ > 0 ? ((playData.calcCorrect / totalQ) * 100).toFixed(1) : 0;
        
        document.getElementById('res-xp').innerHTML = `ランク: <span class="rank-${calcRank}" style="font-size:1.2em;">${calcRank}</span>`;
        document.getElementById('res-details').innerHTML = `
            <div style="font-size: 0.85em; line-height: 1.6; text-align: left; display: inline-block;">
                <div>🎯 <b>正解数</b> : ${playData.calcCorrect} 問</div>
                <div>📊 <b>正解率</b> : ${accuracy} %</div>
                <div>⏱️ <b>タイム</b> : ${duration} 秒</div>
            </div>
        `;
        
        // --- 修正: 赤と青の両方を確定で表示 ---
        if (dropInfo.count > 0) {
            document.getElementById('res-drop').innerHTML = `入手アイテム: <span style="font-size:1.2em;">📕</span> × ${dropInfo.count} ／ <span style="font-size:1.2em;">📘</span> × ${dropInfo.count}`; 
        }
        
    } else if (isCampaign && isClear) {
        document.getElementById('res-xp').innerHTML = `<span style="font-size:0.5em; color:#e74c3c;">CAMPAIGN x3.0</span><br>+${earned}`;
        document.getElementById('res-details').innerHTML = dropInfo.count > 0 ? `入手アイテム: ${dropInfo.icon} × ${dropInfo.count}` : 'リザルトを確認してください。';
    } else {
        document.getElementById('res-xp').innerHTML = "+" + earned;
        document.getElementById('res-details').innerHTML = dropInfo.count > 0 ? `入手アイテム: ${dropInfo.icon} × ${dropInfo.count}` : 'リザルトを確認してください。';
    }
    
    document.getElementById('game-screen').classList.add('hidden'); document.getElementById('result-overlay').classList.remove('hidden'); checkTitles();
}

function backToTitle() { 
    document.getElementById('result-overlay').classList.add('hidden'); document.getElementById('game-screen').classList.add('hidden'); document.getElementById('title-screen').classList.remove('hidden'); document.getElementById('pause-overlay').classList.add('hidden'); 
    if (countdownTimer) clearInterval(countdownTimer);
    clearInterval(gameState.timer); 
    isGameActive = false; isPaused = false; 
    document.removeEventListener('keydown', handleTypingInput);
    document.getElementById('ui-choices').classList.remove('hidden'); document.getElementById('ui-typing-area').classList.add('hidden'); document.getElementById('ui-question').classList.remove('hidden');
    
    document.getElementById('calc-layout').classList.add('hidden');
    document.getElementById('ui-calc-answer').classList.add('hidden');
    document.getElementById('calc-keypad').classList.add('hidden');
    document.getElementById('ui-calc-progress').classList.add('hidden');
    document.querySelector('.enemy-stats-row').style.display = '';

    const qBox = document.getElementById('ui-question');
    if (qBox) {
        qBox.style.removeProperty('height');
        qBox.style.removeProperty('min-height');
    }

    const uiScoreSpan = document.getElementById('ui-score'); if(uiScoreSpan && uiScoreSpan.previousSibling) uiScoreSpan.previousSibling.nodeValue = "SCORE ";
    const uiComboSpan = document.getElementById('ui-combo'); if(uiComboSpan && uiComboSpan.previousSibling) uiComboSpan.previousSibling.nodeValue = "COMBO ";
    const resScoreSpan = document.getElementById('res-score'); if(resScoreSpan && resScoreSpan.previousSibling) resScoreSpan.previousSibling.nodeValue = "獲得スコア: ";

    playData.isTyping = false; playData.isCalculation = false;
    stopBGM(); updateTitleInfo(); updateMissionBadge(); checkTitles();
}

function checkLoginBonus() { 
    const d=new Date().toLocaleDateString('ja-JP'); 
    if(localStorage.getItem('sq_last_login')!==d){ 
        gameState.xp+=LOGIN_BONUS_EXP; localStorage.setItem('sq_last_login',d); 
        gameState.stats.loginDays = (gameState.stats.loginDays || 0) + 1;
        saveGame(); document.getElementById('login-bonus-overlay').classList.remove('hidden'); updateTitleInfo(); checkTitles();
    } 
}
function closeLoginBonus() { document.getElementById('login-bonus-overlay').classList.add('hidden'); }
function checkMissionDate() { const d=new Date().toLocaleDateString('ja-JP'); dailyMissions=JSON.parse(localStorage.getItem('sq_missions')||'{"date":"","progress":{},"claimed":{}}'); if(dailyMissions.date!==d){ dailyMissions={date:d,progress:{play:0,kill:0,correct:0,maxCombo:0,enhance:0},claimed:{}}; saveGame(); } updateMissionBadge(); }
function updateMissionProgress(t,v) { if(t==='maxCombo') dailyMissions.progress[t]=Math.max(dailyMissions.progress[t]||0,v); else dailyMissions.progress[t]=(dailyMissions.progress[t]||0)+v; saveGame(); updateMissionBadge(); }
function updateMissionBadge() { let c=0; MISSIONS.forEach(m=>{ if((dailyMissions.progress[m.id]||0)>=m.target && !dailyMissions.claimed[m.id]) c++; }); document.getElementById('mission-badge').classList.toggle('hidden', c===0); }

function openMissions() { document.getElementById('mission-overlay').classList.remove('hidden'); renderMissions(); }
function closeMissions() { document.getElementById('mission-overlay').classList.add('hidden'); }
function renderMissions() { const l=document.getElementById('mission-list'); l.innerHTML=''; let all=true; MISSIONS.forEach(m=>{ const p=dailyMissions.progress[m.id]||0; const fin=p>=m.target; const clm=dailyMissions.claimed[m.id]; if(!fin)all=false; l.innerHTML+=`<div class="mission-item"><b>${m.title}</b> (${p}/${m.target})<br><small>${m.desc}</small><button class="mission-btn ${fin&&!clm?'active':'disabled'}" onclick="claimMission('${m.id}',${m.reward})">${clm?'受取済':'受取'}</button></div>`; }); 
    const ac=document.getElementById('mission-all-clear'); if(all){ 
        const isClaimed = dailyMissions.claimed.allClear;
        let btnStyle = isClaimed ? '' : 'background:#f1c40f; border-color:#d35400;'; 
        let btnClass = isClaimed ? 'disabled' : ''; 
        let btnText = isClaimed ? '受取済' : `${MISSION_ALL_CLEAR} EXPを受け取る`;
        let btnAction = isClaimed ? '' : 'onclick="claimAllClear()"';
        l.innerHTML += `<div style="margin-top:10px; padding:10px; background:#fef5e7; border:2px solid #e67e22; border-radius:10px;"><div style="font-weight:bold; color:#e67e22;">コンプリート報酬</div><button class="mission-btn ${btnClass}" style="width:100%; margin-top:5px; ${btnStyle}" ${btnAction}>${btnText}</button></div>`; 
    } 
}
function claimMission(id,r) { if(dailyMissions.claimed[id])return; dailyMissions.claimed[id]=true; gameState.xp+=r; saveGame(); renderMissions(); updateTitleInfo(); updateMissionBadge(); alert(r+"EXP獲得"); }
function claimAllClear() { if(dailyMissions.claimed.allClear)return; dailyMissions.claimed.allClear=true; gameState.xp+=MISSION_ALL_CLEAR; saveGame(); renderMissions(); updateTitleInfo(); updateMissionBadge(); alert(MISSION_ALL_CLEAR+"EXP獲得"); }

function openGacha() { document.getElementById('gacha-overlay').classList.remove('hidden'); document.getElementById('gacha-xp').innerText=gameState.xp; renderZukan(); }
function closeGacha() { document.getElementById('gacha-overlay').classList.add('hidden'); updateTitleInfo(); }

function rollGacha(count) {
    const cost = 3000 * count;
    if (gameState.xp < cost) return alert("EXPが足りません！\n必要: " + cost + " EXP");
    gameState.xp -= cost; let results = [];
    for (let i = 0; i < count; i++) {
        let rand = Math.random(), rarity = 'N';
        if (rand < 0.01) rarity = 'UR'; else if (rand < 0.04) rarity = 'SSR'; else if (rand < 0.15) rarity = 'SR'; else if (rand < 0.45) rarity = 'R';
        let targets = rawData.characters.filter(c => c.rarity === rarity);
        if (targets.length === 0) targets = rawData.characters;
        const hit = targets[Math.floor(Math.random() * targets.length)];
        if (!gameState.charaInventory[hit.id]) { gameState.charaInventory[hit.id] = { level: 0, count: 0, exp: 0 }; results.push({ char: hit, isNew: true }); } 
        else { gameState.charaInventory[hit.id].count++; results.push({ char: hit, isNew: false }); }
    }
    saveGame(); renderZukan(); updateTitleInfo(); checkTitles(); showGachaResults(results);
}

async function rollGuaranteedTenGacha(guaranteedRarity, cost) {
    if (gameState.xp < cost) return alert("XPが足りません！\n必要: " + cost + " EXP");
    if (!(await showConfirm(`【確認】\n${cost} EXPを消費して、\n${guaranteedRarity}以上確定10連スカウトを行いますか？`))) return;
    gameState.xp -= cost; let results = [];
    const addResult = (char) => { if (!gameState.charaInventory[char.id]) { gameState.charaInventory[char.id] = { level: 0, count: 0, exp: 0 }; results.push({ char: char, isNew: true }); } else { gameState.charaInventory[char.id].count++; results.push({ char: char, isNew: false }); } };
    for (let i = 0; i < 9; i++) {
        let rand = Math.random(); let r = 'N';
        if (rand < 0.003) r = 'UR'; else if (rand < 0.033) r = 'SSR'; else if (rand < 0.133) r = 'SR'; else if (rand < 0.433) r = 'R';
        let targets = rawData.characters.filter(c => c.rarity === r); if (targets.length === 0) targets = rawData.characters; 
        const hit = targets[Math.floor(Math.random() * targets.length)]; addResult(hit);
    }
    let guaranteedTargets = []; if (guaranteedRarity === 'UR') { guaranteedTargets = rawData.characters.filter(c => c.rarity === 'UR'); } else { guaranteedTargets = rawData.characters.filter(c => c.rarity === 'SSR'); }
    if (guaranteedTargets.length === 0) guaranteedTargets = rawData.characters;
    const finalHit = guaranteedTargets[Math.floor(Math.random() * guaranteedTargets.length)]; addResult(finalHit);
    saveGame(); renderZukan(); updateTitleInfo(); checkTitles(); playSE('win'); showGachaResults(results);
}

function showGachaResults(results) {
    const container = document.getElementById('gr-container');
    if(results.length === 1) {
        const r = results[0]; let visual = (r.char.imageUrl && r.char.imageUrl.startsWith('http')) ? `<img src="${r.char.imageUrl}" style="width:120px;height:120px;">` : `<div style="font-size:80px;">📦</div>`;
        container.innerHTML = `<div class="gacha-result-card">${r.isNew?'<div class="gr-new">NEW!</div>':''}<div class="gr-rarity rarity-${r.char.rarity}">★ ${r.char.rarity}</div>${visual}<div style="font-weight:bold;font-size:1.5em;">${r.char.name}</div><div style="color:#7f8c8d;">${r.isNew?'新規入手':'在庫(素材)+1'}</div></div>`; 
    } else { 
        let html = '<h3 style="color:#f1c40f;">10連結果!</h3><div class="gr-grid">'; 
        results.forEach(r => { let visual = (r.char.imageUrl && r.char.imageUrl.startsWith('http')) ? `<img src="${r.char.imageUrl}" class="gr-mini-img">` : `<div style="font-size:30px;">📦</div>`; html += `<div class="gr-mini-card">${r.isNew?'<div class="gr-mini-new">NEW</div>':''}<div class="rarity-${r.char.rarity}" style="font-size:0.8em;">${r.char.rarity}</div>${visual}<div style="font-size:0.7em;font-weight:bold;">${r.char.name}</div></div>`; }); 
        container.innerHTML = html + '</div>'; 
    }
    document.getElementById('gacha-overlay').classList.add('hidden'); document.getElementById('gacha-result-overlay').classList.remove('hidden');
}
function closeGachaResult() { document.getElementById('gacha-result-overlay').classList.add('hidden'); document.getElementById('gacha-overlay').classList.remove('hidden'); document.getElementById('gacha-xp').innerText = gameState.xp; renderZukan(); }

let zukanSortMode = 'default';
function changeZukanSort() { const sel = document.getElementById('zukan-sort-select'); if(sel) zukanSortMode = sel.value; renderZukan(); }

function renderZukan() { 
    const g=document.getElementById('zukan-grid'); g.innerHTML=''; 
    if(!rawData.characters) return;
    let list = [...rawData.characters];
    list.sort((a, b) => {
        const invA = gameState.charaInventory[a.id]; const invB = gameState.charaInventory[b.id];
        if (zukanSortMode === 'rarity_desc' || zukanSortMode === 'rarity_asc') { const rOrder = { 'UR':5, 'SSR':4, 'SR':3, 'R':2, 'N':1 }; const valA = rOrder[a.rarity] || 0; const valB = rOrder[b.rarity] || 0; return zukanSortMode === 'rarity_desc' ? valB - valA : valA - valB; }
        if (zukanSortMode === 'type') { return a.type.localeCompare(b.type); }
        if (zukanSortMode === 'level') { const lvA = invA ? invA.level : -1; const lvB = invB ? invB.level : -1; if (lvA !== lvB) return lvB - lvA; }
        if (zukanSortMode === 'stock') { const cntA = invA ? invA.count : -1; const cntB = invB ? invB.count : -1; if (cntA !== cntB) return cntB - cntA; }
        return 0;
    });
    list.forEach(c=>{ 
        const data = gameState.charaInventory[c.id]; const isOwned = !!data; const div = document.createElement('div');
        let masterClass = ''; if (isOwned && data.count >= MASTER_COUNT) masterClass = 'mastered';
        div.className = `char-card ${isOwned?'owned':''} ${gameState.equipped==c.id?'active':''} ${masterClass}`;
        let visual, nameText, lvlBadge = '', stockBadge = ''; let decoName = "???"; 
        if(isOwned) {
            visual = (c.imageUrl && c.imageUrl.startsWith('http')) ? `<img src="${c.imageUrl}" class="char-img">` : `<div style="font-size:2em;line-height:50px">📦</div>`;
            const currentRarity = data.currentRarity || c.rarity; decoName = getDisplayName(c, data); nameText = `<span class="rarity-${currentRarity}">${currentRarity}</span> / ${c.type}`;
            lvlBadge = `<div class="char-lvl-badge">Lv.${data.level}</div>`; if(data.count > 0) stockBadge = `<div class="char-stock-badge">+${data.count}</div>`;
            div.onclick = () => openCharaDetail(c.id);
        } else { visual = `<div style="font-size:2em;line-height:50px;color:#bdc3c7;">?</div>`; nameText = "???"; }
        div.innerHTML = `${lvlBadge}${stockBadge}${visual}<div style="font-weight:bold;font-size:0.8em;">${nameText}</div><div style="font-size:0.7em; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${decoName}</div>`;
        g.appendChild(div);
    });
}

function openCharaDetail(id) { 
    viewingCharaId=id; const c=rawData.characters.find(x=>x.id==id); const o=gameState.charaInventory[id]; if(!c||!o)return; 
    const currentR = o.currentRarity || c.rarity; const currentSkills = (o.skills && o.skills.length > 0) ? o.skills : [c.type];
    const baseVal = (o.isEvolved && o.customValue) ? o.customValue : Number(c.value);
    document.getElementById('cd-name').innerHTML = getDisplayName(c, o);
    document.getElementById('cd-rarity').innerText = currentR; document.getElementById('cd-rarity').className = "rarity-" + currentR; 
    const maxLv = RARITY_CAPS[currentR] || 10;
    document.getElementById('cd-lv').innerText = 'Lv.' + o.level + ' / ' + maxLv;
    let skillHtml = ''; currentSkills.forEach(s => { skillHtml += `<span class="skill-tag ${s}">${s}</span>`; });
    document.getElementById('cd-type').innerHTML = `<div class="skill-tag-container">${skillHtml}</div>`;
    let val = baseVal + (o.level * LV_BONUS_RATE); document.getElementById('cd-val').innerText='x'+val.toFixed(2); 
    document.getElementById('cd-stock').innerText=o.count + "個"; document.getElementById('cd-desc').innerText = c.desc || "";
    
    const detailBtnRow = document.querySelector('.detail-btn-row');
    if (document.querySelector('.item-use-area')) document.querySelector('.item-use-area').remove();
    detailBtnRow.insertAdjacentHTML('beforebegin', `<div class="item-use-area"><div style="font-weight:bold; font-size:0.8em; color:#2c3e50; margin-bottom:5px;">育成アイテム</div><div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px;"><button class="book-use-btn" onclick="useExpItem('xpBookSmall', 200)" ${(gameState.inventory.xpBookSmall||0)>0?'':'disabled'}>小(${gameState.inventory.xpBookSmall||0})</button><button class="book-use-btn" onclick="useExpItem('xpBookMedium', 500)" ${(gameState.inventory.xpBookMedium||0)>0?'':'disabled'}>中(${gameState.inventory.xpBookMedium||0})</button><button class="book-use-btn" onclick="useExpItem('xpBookLarge', 1000)" ${(gameState.inventory.xpBookLarge||0)>0?'':'disabled'}>大(${gameState.inventory.xpBookLarge||0})</button></div></div>`);
    
    document.getElementById('cd-exp-text').innerText = o.exp + ' / ' + EXP_REQ; document.getElementById('cd-exp-bar').style.width = (o.exp / EXP_REQ * 100) + '%';
    if(c.imageUrl.startsWith('http')) document.getElementById('cd-img').src=c.imageUrl; else document.getElementById('cd-img').src=''; 
    document.getElementById('chara-detail-overlay').classList.remove('hidden'); 
    
    const evoContainer = document.getElementById('evo-container'); evoContainer.innerHTML = ''; evoContainer.classList.add('hidden');
    if (o.level >= maxLv && o.count >= EVO_STOCK_REQ && currentR !== 'UR') {
        const cost = EVO_COST_XP[currentR]; const btn = document.createElement('button'); btn.className = 'detail-btn'; btn.style.background = 'linear-gradient(to bottom, #f1c40f, #e67e22)'; btn.style.borderBottom = '5px solid #d35400'; btn.style.marginBottom = '10px'; btn.style.height = '60px'; 
        btn.innerHTML = `🌟 限界突破・進化！<br><span style="font-size:0.75em">消費: ${cost.toLocaleString()} XP ／ 素材 ${EVO_STOCK_REQ}個</span>`; btn.onclick = executeEvolution; evoContainer.appendChild(btn); evoContainer.classList.remove('hidden');
    }
    if (currentR === 'UR' && c.rarity !== 'UR') {
        const btn = document.createElement('button'); btn.className = 'detail-btn'; btn.style.background = 'linear-gradient(to right, #3498db, #8e44ad)'; btn.style.borderBottom = '5px solid #5b2c6f'; btn.style.marginBottom = '10px'; btn.style.height = '60px';
        btn.innerHTML = `🪽 転生する<br><span style="font-size:0.75em">消費: ${REBORN_COST_XP.toLocaleString()} XP ／ スキル継承</span>`; btn.onclick = executeReincarnation; evoContainer.appendChild(btn); evoContainer.classList.remove('hidden');
    }
}

function closeCharaDetail() { document.getElementById('chara-detail-overlay').classList.add('hidden'); renderZukan(); }
function equipCurrentChara() { gameState.equipped=viewingCharaId; saveGame(); alert("装備しました"); closeCharaDetail(); renderZukan(); updateTitleInfo(); }
async function sellCharaStock() { const o=gameState.charaInventory[viewingCharaId]; if (o.count > 0 && !(await showConfirm("売却しますか？"))) return; if(o.count>0){ o.count--; gameState.xp+=200; saveGame(); openCharaDetail(viewingCharaId); } }

async function useExpItem(itemId, gain) {
    if ((gameState.inventory[itemId] || 0) <= 0) return;
    const itemNames = { 'xpBookSmall':'小の書', 'xpBookMedium':'中の書', 'xpBookLarge':'大の書' };
    const itemName = itemNames[itemId] || '経験値アイテム';
    if (!(await showConfirm(`【確認】\n${itemName} を使用して、経験値を +${gain} しますか？`))) return;

    const inv = gameState.charaInventory[viewingCharaId];
    const master = rawData.characters.find(c => c.id == viewingCharaId);
    const maxL = RARITY_CAPS[inv.currentRarity || master.rarity] || 10;
    
    if (inv.level >= maxL) return alert("Lv.MAXです");

    gameState.inventory[itemId]--;
    inv.exp = (Number(inv.exp) || 0) + gain;
    
    let lvUp = 0;
    while (inv.exp >= EXP_REQ && inv.level < maxL) { inv.exp -= EXP_REQ; inv.level++; lvUp++; }
    if (inv.level >= maxL) inv.exp = 0;
    
    saveGame(); playSE('start'); 
    if (lvUp > 0) alert(`レベルアップ！ Lv.${inv.level}`);
    openCharaDetail(viewingCharaId);
}

let selectedMaterials = {};
function openEnhanceMenu() { selectedMaterials = {}; document.getElementById('material-select-overlay').classList.remove('hidden'); document.getElementById('chara-detail-overlay').classList.add('hidden'); renderEnhanceList(); }
function closeEnhanceMenu() { document.getElementById('material-select-overlay').classList.add('hidden'); openCharaDetail(viewingCharaId); }

function renderEnhanceList() {
    const list = document.getElementById('material-list'); list.innerHTML = ''; let totalGain = 0;
    rawData.characters.forEach(c => {
        if (c.id === viewingCharaId) return; const inv = gameState.charaInventory[c.id]; if (!inv || inv.count <= 0) return;
        const selectCount = selectedMaterials[c.id] || 0; const expVal = MAT_EXP[c.rarity] || 25; if(selectCount > 0) totalGain += (expVal * selectCount);
        let visual = (c.imageUrl && c.imageUrl.startsWith('http')) ? `<img src="${c.imageUrl}" style="width:40px;height:40px;">` : `<span>📦</span>`;
        let activeClass = selectCount > 0 ? 'selected' : ''; let badge = selectCount > 0 ? `<div class="mat-select-badge">${selectCount}</div>` : '';
        list.innerHTML += `<div class="mat-card ${activeClass}" onclick="toggleMaterial('${c.id}', ${inv.count})">${badge}<div class="rarity-${c.rarity}">${c.rarity}</div>${visual}<div style="font-weight:bold; font-size:0.8em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.name}</div><div style="font-size:0.7em;">所持: ${inv.count}</div><div class="mat-exp-val">+${expVal}</div></div>`;
    });
    updateEnhancePreview(totalGain);
}

function toggleMaterial(id, maxCount) { if (!selectedMaterials[id]) selectedMaterials[id] = 0; selectedMaterials[id]++; if (selectedMaterials[id] > maxCount) { selectedMaterials[id] = 0; } renderEnhanceList(); }

function updateEnhancePreview(gainExp) {
    document.getElementById('enhance-total-exp').innerText = gainExp;
    const t = gameState.charaInventory[viewingCharaId]; const chara = rawData.characters.find(x => x.id === viewingCharaId); if (!t || !chara) return;
    const currentR = t.currentRarity || chara.rarity; const maxLv = RARITY_CAPS[currentR] || 10;
    let simExp = t.exp + gainExp; let simLv = t.level;
    while (simExp >= EXP_REQ) { if (simLv >= maxLv) { simExp = 0; break; } simExp -= EXP_REQ; simLv++; }
    const preview = document.getElementById('enhance-lv-preview');
    if (simLv > t.level) { preview.innerHTML = `Lv.${t.level} <span style="font-weight:bold;">➞ ${simLv}</span>`; preview.style.color = '#e67e22'; } else { preview.innerText = `Lv.${t.level} (あと${EXP_REQ - simExp})`; preview.style.color = '#7f8c8d'; }
}

async function executeBulkEnhance() {
    const totalSelected = Object.values(selectedMaterials).reduce((a, b) => a + b, 0); if (totalSelected === 0) return alert("素材を選択してください");
    let totalGain = 0; Object.keys(selectedMaterials).forEach(id => { const count = selectedMaterials[id]; if (count > 0) { const matChar = rawData.characters.find(c => c.id === id); const expVal = MAT_EXP[matChar.rarity] || 25; totalGain += (expVal * count); } });
    if (!(await showConfirm(`選択した${totalSelected}体を消費して強化しますか？\n獲得EXP: ${totalGain}`))) return;
    Object.keys(selectedMaterials).forEach(id => { const count = selectedMaterials[id]; if (gameState.charaInventory[id]) { gameState.charaInventory[id].count -= count; if (gameState.charaInventory[id].count < 0) gameState.charaInventory[id].count = 0; } });
    const t = gameState.charaInventory[viewingCharaId]; const chara = rawData.characters.find(x => x.id === viewingCharaId);
    const currentR = t.currentRarity || chara.rarity; const maxLv = RARITY_CAPS[currentR] || 10;
    t.exp = (Number(t.exp) || 0) + totalGain; let lvUpCount = 0;
    while (t.exp >= EXP_REQ) { if (t.level >= maxLv) { t.exp = 0; break; } t.exp -= EXP_REQ; t.level++; lvUpCount++; }
    updateMissionProgress('enhance', 1); checkTitles(); saveGame();
    alert(`強化完了！\n経験値 +${totalGain} を獲得しました。${lvUpCount > 0 ? '\nレベルアップしました！' : ''}`);
    selectedMaterials = {}; renderEnhanceList(); updateEnhancePreview(0);
    if(chara) {
        document.getElementById('cd-lv').innerText = 'Lv.' + t.level + ' / ' + maxLv; document.getElementById('cd-exp-text').innerText = t.exp + ' / ' + EXP_REQ; document.getElementById('cd-exp-bar').style.width = (t.exp / EXP_REQ * 100) + '%';
        const baseVal = (t.isEvolved && t.customValue) ? t.customValue : Number(chara.value); document.getElementById('cd-val').innerText='x'+(baseVal+(t.level*LV_BONUS_RATE)).toFixed(2);
    }
}

function openShop() { document.getElementById('shop-overlay').classList.remove('hidden'); renderShop(); }
let currentShopTab = 'buy'; 
function renderShop() {
    document.getElementById('shop-xp').innerText = gameState.xp;
    const l=document.getElementById('shop-list'); 
    l.innerHTML=`<div class="page-counter-container"><div class="page-item">📕 <span>${gameState.inventory.redPages||0}</span></div><div class="page-item">📘 <span>${gameState.inventory.bluePages||0}</span></div></div><div class="item-tab-container"><div class="item-tab ${currentShopTab==='buy'?'active':''}" onclick="currentShopTab='buy'; renderShop();">学習アイテム</div><div class="item-tab ${currentShopTab==='exchange'?'active':''}" onclick="currentShopTab='exchange'; renderShop();">アイテム交換</div></div>`; 
    
    if(currentShopTab === 'buy') {
        if(rawData.shopItems) rawData.shopItems.forEach(i=>{ 
            const lv = (gameState.itemLevels && gameState.itemLevels[i.id]) ? gameState.itemLevels[i.id] : 0; const p=i.price*(lv+1); 
            l.innerHTML+=`<div class="shop-item"><div class="shop-icon">${i.icon}</div><div class="shop-info"><div class="shop-name">${i.name}</div><div class="shop-desc">${i.desc}</div></div><div class="shop-right"><div class="shop-level-tag">Lv.${lv} / ${MAX_ITEM_LEVEL}</div><button class="shop-buy-btn" onclick="buyItem('${i.id}',${p})">${lv>=10?'MAX':'⬆ '+p+'XP'}</button></div></div>`; 
        }); 
    } else {
        const rates = [ 
            { id: 'xpBookSmall', name: '小の書', cost: 20, gain: 200, icon: '📔' }, 
            { id: 'xpBookMedium', name: '中の書', cost: 35, gain: 500, icon: '📕' }, 
            { id: 'xpBookLarge', name: '大の書', cost: 50, gain: 1000, icon: '📘' } 
        ];
        rates.forEach(ex => {
            const canEx = (gameState.inventory.redPages >= ex.cost && gameState.inventory.bluePages >= ex.cost);
            const currentCount = gameState.inventory[ex.id] || 0;
            l.innerHTML += `<div class="shop-item"><div class="shop-icon">${ex.icon}</div><div class="shop-info"><div class="shop-name">${ex.name}</div><div class="shop-desc">キャラXP +${ex.gain}</div><div style="font-size:0.8em; color:#7f8c8d;">所持: ${currentCount}冊</div><div style="font-size:0.8em; color:#e67e22; font-weight:bold;">必要: 📕${ex.cost} & 📘${ex.cost}</div></div><div class="shop-right"><button class="shop-buy-btn" ${canEx?'':'disabled'} onclick="exchangeBook('${ex.id}', ${ex.cost})">交換</button></div></div>`;
        });
    }
}
function exchangeBook(bookId, cost) { if (gameState.inventory.redPages < cost || gameState.inventory.bluePages < cost) return; gameState.inventory.redPages -= cost; gameState.inventory.bluePages -= cost; gameState.inventory[bookId]++; saveGame(); renderShop(); playSE('win'); }
function closeShop() { document.getElementById('shop-overlay').classList.add('hidden'); }
function buyItem(id,p) { if (!gameState.itemLevels) gameState.itemLevels = {}; if((gameState.itemLevels[id]||0)>=10)return; if(gameState.xp<p)return alert("XP不足"); gameState.xp-=p; gameState.itemLevels[id]=(gameState.itemLevels[id]||0)+1; saveGame(); openShop(); updateTitleInfo(); checkTitles(); }

function openVersionHistory() { document.getElementById('version-overlay').classList.remove('hidden'); }
function closeVersionHistory() { document.getElementById('version-overlay').classList.add('hidden'); }
function openHowToPlay() { document.getElementById('howto-overlay').classList.remove('hidden'); }
function closeHowToPlay() { document.getElementById('howto-overlay').classList.add('hidden'); }

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let isMuted = true;
function toggleMute() { isMuted = !isMuted; const btn = document.getElementById('btn-mute'); if(isMuted) { btn.innerText = "🔇 音量: OFF"; btn.style.background = "#95a5a6"; btn.style.borderColor = "#7f8c8d"; stopBGM(); } else { btn.innerText = "🔊 音量: ON"; btn.style.background = "#34495e"; btn.style.borderColor = "#2c3e50"; playSE('hit'); if(isGameActive) playBGM(); } }
function playSE(type) {
    if(isMuted) return;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain(); osc.connect(gainNode); gainNode.connect(audioCtx.destination); const now = audioCtx.currentTime;
    if (type === 'type_hit') { osc.type = 'triangle'; osc.frequency.setValueAtTime(1500, now); gainNode.gain.setValueAtTime(0.15, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08); osc.start(now); osc.stop(now + 0.08); }
    else if (type === 'type_miss') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(50, now + 0.15); gainNode.gain.setValueAtTime(0.2, now); gainNode.gain.linearRampToValueAtTime(0.001, now + 0.15); osc.start(now); osc.stop(now + 0.15); }
    else if (type === 'hit') { osc.type = 'sine'; osc.frequency.setValueAtTime(880, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1); gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); } 
    else if (type === 'miss') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(100, now + 0.3); gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); }
    else if (type === 'win') { osc.type = 'square'; gainNode.gain.value = 0.1; [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { const t = now + i * 0.1; const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type = 'square'; o.frequency.value = freq; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.1); o.start(t); o.stop(t + 0.1); }); }
    else if (type === 'lose') { osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(50, now + 1.0); gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 1.0); osc.start(now); osc.stop(now + 1.0); }
    else if (type === 'count') { osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now); gainNode.gain.setValueAtTime(0.1, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    else if (type === 'start') { osc.type = 'square'; osc.frequency.setValueAtTime(880, now); osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3); gainNode.gain.setValueAtTime(0.1, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); }
}

const BGM_MML = "T150 L8 O3 G G > C C D C E F G G A G F E D C < B > C4 R4";
let bgmOscillators = []; let bgmTimeout = null;
function playBGM() {
    if (isMuted) return; stopBGM(); if (audioCtx.state === 'suspended') audioCtx.resume();
    const mml = BGM_MML.replace(/\s+/g, '').toUpperCase(); let index = 0; let nextTime = audioCtx.currentTime + 0.1; let octave = 4; let defaultLen = 4; let tempo = 120;
    const scheduleNote = () => {
        if (!isGameActive) return;
        while (nextTime < audioCtx.currentTime + 2.0 && index < mml.length) {
            let char = mml[index++];
            if (char === 'T') { let num = parseInt(mml.slice(index)); if (!isNaN(num)) { tempo = num; index += String(num).length; } } 
            else if (char === 'L') { let num = parseInt(mml.slice(index)); if (!isNaN(num)) { defaultLen = num; index += String(num).length; } } 
            else if (char === 'O') { let num = parseInt(mml.slice(index)); if (!isNaN(num)) { octave = num; index += String(num).length; } } 
            else if (char === '>') octave++; else if (char === '<') octave--;
            else if (char === 'R') { let len = defaultLen; let num = parseInt(mml.slice(index)); if (!isNaN(num)) { len = num; index += String(num).length; } nextTime += (60 / tempo) * (4 / len); } 
            else if ("CDEFGAB".includes(char)) {
                let note = char; if (mml[index] === '#' || mml[index] === '+') { note += '#'; index++; } else if (mml[index] === '-') { note += '-'; index++; }
                let len = defaultLen; let num = parseInt(mml.slice(index)); if (!isNaN(num)) { len = num; index += String(num).length; }
                const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]; let keyIndex = notes.indexOf(note.replace('-', '')); if (keyIndex === -1) keyIndex = 0;
                const freq = 440 * Math.pow(2, (octave - 4) + (keyIndex - 9) / 12);
                const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = 'square'; osc.frequency.value = freq; osc.connect(gain); gain.connect(audioCtx.destination);
                const duration = (60 / tempo) * (4 / len); osc.start(nextTime); osc.stop(nextTime + duration - 0.05); gain.gain.setValueAtTime(0.05, nextTime); gain.gain.linearRampToValueAtTime(0.02, nextTime + duration - 0.05); gain.gain.setValueAtTime(0, nextTime + duration);
                bgmOscillators.push(osc); nextTime += duration;
            }
        }
        if (index >= mml.length) index = 0; if (isGameActive && !isMuted) bgmTimeout = setTimeout(scheduleNote, 500);
    };
    scheduleNote();
}
function stopBGM() { if (bgmTimeout) clearTimeout(bgmTimeout); bgmOscillators.forEach(osc => { try { osc.stop(); } catch(e){} }); bgmOscillators = []; }

function openRecord() { document.getElementById('record-overlay').classList.remove('hidden'); renderRecord(); }
function closeRecord() { document.getElementById('record-overlay').classList.add('hidden'); }
function drawRadarChart(labels, data) {
    const canvas = document.getElementById('radar-chart'); if (!canvas) return; const ctx = canvas.getContext('2d');
    const w = canvas.width; const h = canvas.height; const cx = w / 2; const cy = h / 2; const radius = w / 2 - 40;
    ctx.clearRect(0, 0, w, h); const sides = Math.max(5, labels.length); 
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) { const r = radius * (i / 5); ctx.beginPath(); for (let j = 0; j < sides; j++) { const angle = (Math.PI * 2 * j) / sides - Math.PI / 2; const x = cx + Math.cos(angle) * r; const y = cy + Math.sin(angle) * r; if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.stroke(); }
    ctx.fillStyle = '#333'; ctx.font = 'bold 12px "BIZ UDPGothic"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let j = 0; j < sides; j++) {
        const angle = (Math.PI * 2 * j) / sides - Math.PI / 2; const x = cx + Math.cos(angle) * radius; const y = cy + Math.sin(angle) * radius;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
        if (j < labels.length) { const lx = cx + Math.cos(angle) * (radius + 20); const ly = cy + Math.sin(angle) * (radius + 20); ctx.fillText(labels[j], lx, ly); }
    }
    if (data.length === 0) return;
    ctx.beginPath();
    for (let j = 0; j < sides; j++) { if (j >= data.length) break; const val = Math.min(100, Math.max(0, data[j])); const r = radius * (val / 100); const angle = (Math.PI * 2 * j) / sides - Math.PI / 2; const x = cx + Math.cos(angle) * r; const y = cy + Math.sin(angle) * r; if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.closePath(); ctx.fillStyle = 'rgba(142, 68, 173, 0.5)'; ctx.fill(); ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 2; ctx.stroke();
}

let tempOaths = [];
function openOathMenu() { tempOaths = []; document.querySelectorAll('.oath-option').forEach(el => el.classList.remove('selected')); document.getElementById('oath-overlay').classList.remove('hidden'); }
function closeOathMenu() { document.getElementById('oath-overlay').classList.add('hidden'); }
function toggleOath(type) { const el = document.getElementById('oath-' + type); if (tempOaths.includes(type)) { tempOaths = tempOaths.filter(t => t !== type); el.classList.remove('selected'); } else { tempOaths.push(type); el.classList.add('selected'); } }
function startOathGame() {
    if (tempOaths.length === 0) return alert("誓約を1つ以上選択してください");
    const g = document.getElementById('grade-select').value; const s = document.getElementById('subject-select').value; const u = document.getElementById('unit-select').value;
    let qList = rawData.questions.filter(q => q.grade == g && q.subject == s && q.unit == u);
    if(qList.length === 0) return alert("問題がありません");
    let boss = rawData.bosses ? rawData.bosses.find(b => b.unit == u && b.grade == g) : null;
    if(!boss) boss = { name: "試練の魔人", hp: 1500, icon: "👿" };
    playData.questions = qList.sort(() => Math.random() - 0.5); playData.qIndex = 0; playData.currentBoss = boss;
    playData.isRevenge = false; playData.activeOaths = [...tempOaths]; playData.isRandom = false; playData.context = { grade: g, subject: s, unit: u };
    const charaStats = getCharaStats();
    gameState.score = 0; gameState.combo = 0; gameState.lives = playData.activeOaths.includes('backwater') ? 1 : 3;
    gameState.enemyHP = Number(boss.hp)||3000; gameState.maxHP = gameState.enemyHP; 
    let timeMulti = playData.activeOaths.includes('rapid') ? 0.5 : 1.0; gameState.maxTime = 10 * charaStats.time * timeMulti;
    isGameActive = false; isPaused = false;
    document.getElementById('oath-overlay').classList.add('hidden'); document.getElementById('title-screen').classList.add('hidden'); document.getElementById('game-screen').classList.remove('hidden');
    
    document.getElementById('calc-layout').classList.add('hidden');
    document.getElementById('ui-calc-answer').classList.add('hidden');
    document.getElementById('calc-keypad').classList.add('hidden');
    document.getElementById('ui-calc-progress').classList.add('hidden');
    document.getElementById('ui-choices').classList.remove('hidden');
    document.getElementById('ui-typing-area').classList.add('hidden');
    document.querySelector('.enemy-stats-row').style.display = '';

    const enemyBox = document.querySelector('.enemy-visual-box'); const enemyIcon = document.getElementById('ui-enemy-icon');
    enemyBox.classList.remove('anim-paused', 'fade-out'); enemyIcon.classList.remove('shake-anim');
    document.getElementById('ui-enemy-name').innerText = "【誓約】" + boss.name;
    if(boss.icon.startsWith('http')) { enemyIcon.innerHTML = `<img src="${boss.icon}">`; } else { enemyIcon.innerHTML = boss.icon; }
    document.getElementById('ui-timer').style.width = '100%'; document.getElementById('ui-timer-text').innerText = gameState.maxTime.toFixed(1);
    updateUI(); startCountdown();
}

function openRandomMenu() {
    if(!rawData.questions) return;
    const grades = [...new Set(rawData.questions.map(q => q.grade))].filter(g=>g);
    const sel = document.getElementById('random-grade-select'); sel.innerHTML = '<option value="">学年を選択...</option>';
    grades.forEach(g => sel.innerHTML += `<option value="${g}">${g}</option>`);
    document.getElementById('random-overlay').classList.remove('hidden');
}
function closeRandomMenu() { document.getElementById('random-overlay').classList.add('hidden'); }
function startRandomGame() {
    const g = document.getElementById('random-grade-select').value; if(!g) return alert("学年を選択してください");
    const qList = rawData.questions.filter(q => q.grade == g); if(qList.length === 0) return alert("問題が見つかりません");
    let possibleBosses = []; if (rawData.randomBosses) { possibleBosses = rawData.randomBosses.filter(b => b.grade == g || b.grade == '全学年'); }
    let boss; if (possibleBosses.length > 0) { const b = possibleBosses[Math.floor(Math.random() * possibleBosses.length)]; boss = { name: b.name, hp: Number(b.hp) || 3000, icon: b.icon }; } else { boss = { name: "迷宮のヌシ", hp: 3000, icon: "🐲" }; }
    playData.questions = qList.sort(() => Math.random() - 0.5); playData.qIndex = 0; playData.currentBoss = boss;
    playData.isRevenge = false; playData.activeOaths = []; playData.isRandom = true;
    const charaStats = getCharaStats();
    gameState.score = 0; gameState.combo = 0; gameState.lives = 3; gameState.enemyHP = boss.hp; gameState.maxHP = boss.hp; gameState.maxTime = 10 * charaStats.time;
    isGameActive = false; isPaused = false;
    document.getElementById('random-overlay').classList.add('hidden'); document.getElementById('title-screen').classList.add('hidden'); document.getElementById('game-screen').classList.remove('hidden');
    
    document.getElementById('calc-layout').classList.add('hidden');
    document.getElementById('ui-calc-answer').classList.add('hidden');
    document.getElementById('calc-keypad').classList.add('hidden');
    document.getElementById('ui-calc-progress').classList.add('hidden');
    document.getElementById('ui-choices').classList.remove('hidden');
    document.getElementById('ui-typing-area').classList.add('hidden');
    document.querySelector('.enemy-stats-row').style.display = '';

    const enemyBox = document.querySelector('.enemy-visual-box'); const enemyIcon = document.getElementById('ui-enemy-icon');
    enemyBox.classList.remove('anim-paused', 'fade-out'); enemyIcon.classList.remove('shake-anim');
    document.getElementById('ui-enemy-name').innerText = "【迷宮】" + boss.name;
    if(boss.icon && boss.icon.startsWith('http')) { enemyIcon.innerHTML = `<img src="${boss.icon}">`; } else { enemyIcon.innerHTML = boss.icon || "👾"; }
    document.getElementById('ui-timer').style.width = '100%'; document.getElementById('ui-timer-text').innerText = gameState.maxTime.toFixed(1);
    updateUI(); startCountdown();
}

function openTypingMenu() {
    if(!rawData.typing || rawData.typing.length === 0) return alert("タイピング問題データ(typingシート)が見つかりません");
    const grades = [...new Set(rawData.typing.map(t => t.grade))].filter(g=>g);
    const sel = document.getElementById('typing-grade-select'); sel.innerHTML = '<option value="">学年を選択...</option>';
    grades.forEach(g => sel.innerHTML += `<option value="${g}">${g}</option>`);
    document.getElementById('typing-menu-overlay').classList.remove('hidden');
}
function closeTypingMenu() { document.getElementById('typing-menu-overlay').classList.add('hidden'); }
function openCalcMenu() { document.getElementById('calc-overlay').classList.remove('hidden'); }
function closeCalcMenu() { document.getElementById('calc-overlay').classList.add('hidden'); }
function startTypingGame() {
    const g = document.getElementById('typing-grade-select').value; 
    if(!g) return alert("学年を選択してください");
    if (!rawData.typing) return alert("タイピングデータが読み込めていません。リロードしてください。");
    const qList = rawData.typing.filter(t => t.grade == g); 
    if(qList.length === 0) return alert("選択した学年の問題がありません");
    
    let boss = { name: "キーボードの魔人", hp: qList.length * 50, icon: "⌨️" };
    try { 
        if(rawData.bosses) { 
            const specificBoss = rawData.bosses.find(b => b.grade == g && b.unit == 'タイピング'); 
            if(specificBoss) { boss = { ...specificBoss }; if(!boss.hp) boss.hp = qList.length * 50; } 
            else { const gradeBoss = rawData.bosses.find(b => b.grade == g); if(gradeBoss) { boss = { ...gradeBoss }; boss.hp = qList.length * 50; boss.name = "【打鍵】" + boss.name; } } 
        } 
    } catch(e) {}
    
    playData.questions = qList.sort(() => Math.random() - 0.5); playData.qIndex = 0; playData.currentBoss = boss;
    playData.isRevenge = false; playData.activeOaths = []; playData.isRandom = false; playData.isTyping = true; playData.isCalculation = false; playData.context = null;
    
    const charaStats = getCharaStats();
    gameState.score = 0; gameState.combo = 0; gameState.lives = 5; gameState.enemyHP = Number(boss.hp) || 3000; gameState.maxHP = gameState.enemyHP; gameState.maxTime = 10 * charaStats.time; 
    isGameActive = false; isPaused = false;
    
    document.getElementById('typing-menu-overlay').classList.add('hidden'); document.getElementById('title-screen').classList.add('hidden'); document.getElementById('game-screen').classList.remove('hidden');
    
    document.getElementById('ui-choices').classList.add('hidden'); 
    document.getElementById('ui-typing-area').classList.remove('hidden'); 
    document.getElementById('ui-question').classList.add('hidden');
    document.getElementById('ui-calc-answer').classList.add('hidden'); 
    document.getElementById('calc-keypad').classList.add('hidden'); 
    document.getElementById('calc-layout').classList.add('hidden'); 
    document.getElementById('ui-calc-progress').classList.add('hidden');
    document.querySelector('.enemy-stats-row').style.display = '';

    const enemyBox = document.querySelector('.enemy-visual-box'); const enemyIcon = document.getElementById('ui-enemy-icon');
    enemyBox.classList.remove('anim-paused', 'fade-out'); enemyIcon.classList.remove('shake-anim');
    
    document.getElementById('ui-enemy-name').innerText = boss.name;
    if(boss.icon && boss.icon.startsWith('http')) { enemyIcon.innerHTML = `<img src="${boss.icon}">`; } else { enemyIcon.innerHTML = boss.icon || "👾"; }

    document.removeEventListener('keydown', handleTypingInput); document.addEventListener('keydown', handleTypingInput);
    document.getElementById('ui-timer').style.width = '100%'; document.getElementById('ui-timer-text').innerText = gameState.maxTime.toFixed(1);
    document.getElementById('ui-typing-jp').innerText = "READY..."; document.getElementById('ui-typing-romaji').innerHTML = "";

    updateUI(); startCountdown();
}

function startCalcGame() {
    const type = document.getElementById('calc-type-select').value; const mode = document.getElementById('calc-mode-select').value;
    if (!type || !mode) return alert("問題形式とモードを選択してください");
    const hand = document.querySelector('input[name="calc-hand"]:checked')?.value || 'right';
    playData.isCalculation = true; playData.isTyping = false; playData.calcType = type; playData.calcMode = mode; playData.calcQIndex = 0; playData.calcCorrect = 0; playData.calcInput = ''; playData.calcElapsed = 0; playData.calcTimeLeft = mode === '3min' ? 180 : 0; playData.calcCountTarget = mode === '100q' ? 100 : 0; playData.calcQuestions = []; playData.currentQ = null; playData.isRevenge = false; playData.activeOaths = []; playData.isRandom = false; playData.context = null; playData.handPreference = hand;

    gameState.score = 0; gameState.combo = 0; gameState.lives = 0; gameState.enemyHP = 0; gameState.maxHP = 1; gameState.maxTime = playData.calcTimeLeft || 1;
    isGameActive = false; isPaused = false;

    document.getElementById('calc-overlay').classList.add('hidden'); document.getElementById('title-screen').classList.add('hidden'); document.getElementById('game-screen').classList.remove('hidden'); document.getElementById('ui-choices').classList.add('hidden'); document.getElementById('ui-typing-area').classList.add('hidden'); document.getElementById('ui-question').classList.remove('hidden'); document.getElementById('ui-calc-answer').classList.remove('hidden'); document.getElementById('calc-keypad').classList.remove('hidden'); document.getElementById('calc-layout').classList.remove('hidden'); document.getElementById('ui-calc-progress').classList.add('hidden'); document.querySelector('.enemy-stats-row').style.display = 'none';

    const calcLayout = document.getElementById('calc-layout'); if (calcLayout) { calcLayout.classList.remove('left-hand', 'right-hand'); calcLayout.classList.add(hand === 'left' ? 'left-hand' : 'right-hand'); }
    const enemyBox = document.querySelector('.enemy-visual-box'); const enemyIcon = document.getElementById('ui-enemy-icon');
    enemyBox.classList.remove('anim-paused', 'fade-out'); enemyIcon.classList.remove('shake-anim');
    document.getElementById('ui-enemy-name').innerText = '計算クエスト'; enemyIcon.innerHTML = '🧮';
    document.getElementById('ui-timer').style.width = '100%'; document.getElementById('ui-timer-text').innerText = playData.calcMode === '3min' ? '180.0' : '0.0';
    
    const uiScoreSpan = document.getElementById('ui-score'); if(uiScoreSpan && uiScoreSpan.previousSibling) uiScoreSpan.previousSibling.nodeValue = "問題数 ";
    const uiComboSpan = document.getElementById('ui-combo'); if(uiComboSpan && uiComboSpan.previousSibling) uiComboSpan.previousSibling.nodeValue = "正解数 ";

    const qBox = document.getElementById('ui-question');
    if (qBox) {
        qBox.style.setProperty('height', '50px', 'important');
        qBox.style.setProperty('min-height', '50px', 'important');
    }

    document.removeEventListener('keydown', handleTypingInput); document.addEventListener('keydown', handleTypingInput);
    updateUI(); startCountdown();
}

function generateCalcQuestion(type) {
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    let a, b, q = '', answer = 0;
    const actualType = type === 'random' ? ['addition','subtraction','multiplication','division','division_remainder'][Math.floor(Math.random() * 5)] : type;
    if (actualType === 'addition') { a = rand(0, 9); b = rand(0, 9); answer = a + b; q = `${a} + ${b} = ?`; } 
    else if (actualType === 'subtraction') { a = rand(10, 19); b = rand(0, 9); answer = a - b; q = `${a} - ${b} = ?`; } 
    else if (actualType === 'multiplication') { a = rand(1, 9); b = rand(1, 9); answer = a * b; q = `${a} × ${b} = ?`; } 
    else if (actualType === 'division') { b = rand(1, 9); answer = rand(1, 9); a = b * answer; q = `${a} ÷ ${b} = ?`; } 
    else if (actualType === 'division_remainder') { b = rand(1, 9); const quotient = rand(0, 9); const remainder = rand(0, b - 1); a = b * quotient + remainder; answer = quotient; q = `${a} ÷ ${b} = ?  (余り${remainder})`; }
    return { q, answer, type: actualType };
}

function renderCalcInput() { document.getElementById('ui-calc-answer').innerText = playData.calcInput || '---'; }

function renderCalcProgress() {
    const progress = playData.calcMode === '100q' ? `${playData.calcQIndex}/${playData.calcCountTarget} 問` : `${playData.calcCorrect} 正解`; 
    const timeText = playData.calcMode === '3min' ? `${Math.max(0, playData.calcTimeLeft).toFixed(1)}秒` : `${playData.calcElapsed.toFixed(1)}秒`;
    document.getElementById('ui-calc-progress').innerText = `${progress} ／ ${timeText}`;
    const bar = document.getElementById('ui-timer');
    if (playData.calcMode === '100q' && playData.calcCountTarget > 0) { bar.style.width = Math.min(100, (playData.calcQIndex / playData.calcCountTarget) * 100) + '%'; } else if (playData.calcMode === '3min') { bar.style.width = Math.max(0, playData.calcTimeLeft / 180 * 100) + '%'; }
}

function handleCalcButton(value) {
    if (!playData.isCalculation || isPaused) return;
    if (value === 'C') { playData.calcInput = ''; } else if (value === 'OK') { submitCalcAnswer(); return; } else { if (playData.calcInput.length < 5) playData.calcInput += value; }
    renderCalcInput();
}

function submitCalcAnswer() {
    if (!playData.currentQ || playData.calcInput === '') return;
    const userValue = parseInt(playData.calcInput, 10); const isCorrect = userValue === playData.currentQ.answer;
    const answerBox = document.getElementById('ui-calc-answer'); answerBox.classList.remove('correct', 'wrong');
    const enemyIcon = document.getElementById('ui-enemy-icon');
    if (isCorrect) {
        playSE('hit'); playData.calcCorrect += 1; gameState.score += 1; answerBox.classList.add('correct');
        if (enemyIcon) { enemyIcon.classList.remove('shake-anim'); void enemyIcon.offsetWidth; enemyIcon.classList.add('shake-anim'); } showCutIn('GOOD!');
    } else { playSE('miss'); answerBox.classList.add('wrong'); showCutIn('MISS'); }
    
    playData.calcQIndex += 1; 
    playData.calcInput = ''; 
    renderCalcInput(); 
    updateUI();
    setTimeout(() => answerBox.classList.remove('correct', 'wrong'), 420);
    
    if (playData.calcMode === '100q' && playData.calcQIndex >= playData.calcCountTarget) { finishGame(true); return; }
    nextCalcQuestion();
}

function nextCalcQuestion() {
    if (!playData.isCalculation) return;
    playData.currentQ = generateCalcQuestion(playData.calcType); document.getElementById('ui-question').innerText = playData.currentQ.q; renderCalcInput(); renderCalcProgress();
}

function addCalcRecord(entry) {
    const key = `${playData.calcType}_${playData.calcMode}`;
    if (!gameState.calcRecords) gameState.calcRecords = {}; if (!gameState.calcRecords[key]) gameState.calcRecords[key] = [];
    gameState.calcRecords[key].push(entry); gameState.calcRecords[key].sort((a,b) => { if (a.correct !== b.correct) return b.correct - a.correct; return a.time - b.time; });
    gameState.calcRecords[key] = gameState.calcRecords[key].slice(0, 10);
}

function renderRecord() {
    const tbody = document.getElementById('grade-tbody'); tbody.innerHTML = ''; const subjects = Object.keys(gameState.subjectStats).sort();
    if (subjects.length === 0) { tbody.innerHTML = '<tr><td colspan="3">データがありません。<br>クエストをプレイしてください。</td></tr>'; drawRadarChart([], []); }
    else {
        const labels = []; const dataPoints = [];
        subjects.forEach(subj => {
            const d = gameState.subjectStats[subj]; const rate = d.total > 0 ? (d.correct / d.total * 100) : 0;
            let rank = 'G'; if (rate >= 90) rank = 'S'; else if (rate >= 80) rank = 'A'; else if (rate >= 70) rank = 'B'; else if (rate >= 60) rank = 'C'; else if (rate >= 50) rank = 'D'; else if (rate >= 40) rank = 'E'; else if (rate >= 20) rank = 'F';
            labels.push(subj); dataPoints.push(rate);
            tbody.innerHTML += `<tr><td>${subj}</td><td>${rate.toFixed(1)}% <span style="font-size:0.8em; color:#7f8c8d;">(${d.correct}/${d.total})</span></td><td class="rank-${rank}">${rank}</td></tr>`;
        });
        drawRadarChart(labels, dataPoints);
    }
    const recordList = document.getElementById('calc-record-list'); recordList.innerHTML = '';
    const keys = Object.keys(gameState.calcRecords || {});
    if (keys.length === 0) { recordList.innerHTML = '<div>計算クエストの記録はありません。</div>'; return; }
    keys.forEach(key => {
        const parts = key.split('_'); const mode = parts.pop(); const type = parts.join('_');
        const title = { addition: 'たし算', subtraction: 'ひき算', multiplication: 'かけ算', division: '割り算(あまりなし)', division_remainder: '割り算(あまりあり)', random: 'ランダム' }[type] || type;
        const modeLabel = mode === '100q' ? '100問' : '3分'; const list = gameState.calcRecords[key];
        let html = `<div style="margin-bottom:10px;"><strong>${title} / ${modeLabel}</strong><br>`;
        list.forEach((item, index) => { html += `<div style="font-size:0.85em; color:#34495e;">${index+1}. ${item.correct}正解 / ${item.time.toFixed(1)}秒</div>`; }); html += '</div>'; recordList.innerHTML += html;
    });
}

function renderTypingUI() {
    const q = playData.typingTarget; const idx = playData.typingIndex; const str = q.romaji;
    document.getElementById('ui-typing-jp').innerText = q.japanese;
    let html = ''; for(let i=0; i<str.length; i++) { if(i < idx) html += `<span class="typing-char-done">${str[i]}</span>`; else if(i === idx) html += `<span class="typing-char-current">${str[i]}</span>`; else html += `<span class="typing-char-rest">${str[i]}</span>`; }
    document.getElementById('ui-typing-romaji').innerHTML = html;
}

function handleTypingInput(e) {
    if (!isGameActive || isPaused) return;
    if (playData.isCalculation && !playData.isTyping) {
        if (e.key >= '0' && e.key <= '9') { if (playData.calcInput.length < 5) playData.calcInput += e.key; renderCalcInput(); return; }
        if (e.key === 'Backspace') { playData.calcInput = playData.calcInput.slice(0, -1); renderCalcInput(); return; }
        if (e.key === 'Enter') { submitCalcAnswer(); return; }
        if (e.key.toLowerCase() === 'c') { playData.calcInput = ''; renderCalcInput(); return; } return;
    }
    if(!playData.isTyping) return; if(e.key.length > 1) return;
    const inputKey = e.key.toLowerCase(); let targetStr = playData.typingTarget.romaji; let idx = playData.typingIndex;
    let isMatch = (inputKey === targetStr[idx]);
    if (!isMatch) {
        const remainder = targetStr.substring(idx);
        const startPatterns = [ {t:'chi', r:'ti'}, {t:'tsu', r:'tu'}, {t:'fu', r:'hu'}, {t:'ji', r:'zi'}, {t:'ka', r:'ca'}, {t:'ku', r:'cu'}, {t:'ko', r:'co'}, {t:'se', r:'ce'}, {t:'ja', r:'zya'}, {t:'ju', r:'zyu'}, {t:'jo', r:'zyo'}, {t:'cha', r:'tya'}, {t:'chu', r:'tyu'}, {t:'cho', r:'tyo'} ];
        for (let p of startPatterns) { if (remainder.startsWith(p.t) && p.r.startsWith(inputKey)) { const newStr = targetStr.substring(0, idx) + p.r + targetStr.substring(idx + p.t.length); playData.typingTarget.romaji = newStr; targetStr = newStr; renderTypingUI(); isMatch = true; break; } }
        if (!isMatch && idx > 0) {
            const context = targetStr.substring(idx - 1); 
            const skipPatterns = [ {t:'shi', r:'si'}, {t:'tsu', r:'tu'}, {t:'chi', r:'ti'}, {t:'sha', r:'sya'}, {t:'shu', r:'syu'}, {t:'sho', r:'syo'}, {t:'sya', r:'sha'}, {t:'syu', r:'shu'}, {t:'syo', r:'sho'}, {t:'cha', r:'cya'}, {t:'chu', r:'cyu'}, {t:'cho', r:'cyo'}, {t:'cya', r:'cha'}, {t:'cyu', r:'chu'}, {t:'cyo', r:'cho'}, {t:'ja', r:'jya'}, {t:'ju', r:'jyu'}, {t:'jo', r:'jyo'}, {t:'jya', r:'ja'}, {t:'jyu', r:'ju'}, {t:'jyo', r:'jo'} ];
            for (let s of skipPatterns) { if (context.startsWith(s.t) && s.r[1] === inputKey) { const pre = targetStr.substring(0, idx - 1); const post = targetStr.substring(idx - 1 + s.t.length); const newStr = pre + s.r + post; playData.typingTarget.romaji = newStr; targetStr = newStr; renderTypingUI(); isMatch = true; break; } }
        }
        if (!isMatch && inputKey === 'n' && idx > 0) { if (targetStr[idx-1] === 'n') { const pre = targetStr.substring(0, idx); const post = targetStr.substring(idx); const newStr = pre + 'n' + post; playData.typingTarget.romaji = newStr; targetStr = newStr; renderTypingUI(); isMatch = true; } }
    }
    if(isMatch) {
        playData.typingIndex++; playSE('type_hit'); renderTypingUI();
        if(playData.typingIndex >= playData.typingTarget.romaji.length) {
            clearInterval(gameState.timer);
            const stats = getCharaStats(); const baseAtk = 100; const rawRatio = gameState.timeLeft / gameState.maxTime; const timeFactor = 0.2 + (rawRatio * 0.8);
            const statFactor = stats.atk + ((stats.time - 1) * 0.5); const comboAdd = Math.min(gameState.combo * 0.025, 1.0);
            let damage = Math.floor(baseAtk * timeFactor * (statFactor + comboAdd));
            gameState.enemyHP = Math.max(0, gameState.enemyHP - damage); gameState.score += damage; gameState.combo++; showCutIn("-" + damage);
            const enemyIcon = document.getElementById('ui-enemy-icon'); enemyIcon.classList.remove('shake-anim'); void enemyIcon.offsetWidth; enemyIcon.classList.add('shake-anim'); updateUI();
            if(gameState.enemyHP <= 0) { setTimeout(() => isGameActive && finishGame(true), 500); } else { playData.qIndex++; setTimeout(() => { if(isGameActive) nextTypingQuestion(); }, 200); }
        }
    } else { playSE('type_miss'); if (!playData.typingMissed) { gameState.lives--; playData.typingMissed = true; } gameState.combo = 0; showCutIn("MISS"); updateUI(); const romeBox = document.getElementById('ui-typing-romaji'); romeBox.classList.add('shake-anim'); setTimeout(()=>romeBox.classList.remove('shake-anim'), 400); if(gameState.lives <= 0) { finishGame(false); } }
}

function openUnitSelection() { document.getElementById('unit-select-title').innerText = "クエスト出発"; document.getElementById('unit-select-title').style.color = "#2c3e50"; document.getElementById('unit-select-overlay').classList.remove('hidden'); }
function closeUnitSelection() { document.getElementById('unit-select-overlay').classList.add('hidden'); }
function startNormalGameCheck() { const g = document.getElementById('grade-select').value; const s = document.getElementById('subject-select').value; const u = document.getElementById('unit-select').value; const hp = document.getElementById('boss-hp-select').value; if(!g || !s || !u || !hp) return alert("全ての項目を選択してください"); playData.selectedBossHp = Number(hp); closeUnitSelection(); startGame(); }
function goToOathMenuCheck() { const g = document.getElementById('grade-select').value; const s = document.getElementById('subject-select').value; const u = document.getElementById('unit-select').value; if(!g || !s || !u) return alert("全ての項目を選択してください"); closeUnitSelection(); openOathMenu(); }

function checkAdminGifts() { 
    if (!rawData.gifts || rawData.gifts.length === 0) { updateGiftButtonState(); return; }
    const unclaimed = rawData.gifts.filter(g => { const id = g.id || g['ID']; return id && !gameState.claimedGifts.includes(id); });
    updateGiftButtonState(); if (unclaimed.length > 0) openGiftMenu(unclaimed);
}
function openGiftMenu(giftsToShow = null) {
    if (!giftsToShow) { if (!rawData.gifts) return; giftsToShow = rawData.gifts.filter(g => { const id = g.id || g['ID']; return id && !gameState.claimedGifts.includes(id); }); }
    if (giftsToShow.length === 0) { alert("受け取るプレゼントはありません。"); updateGiftButtonState(); return; }
    const list = document.getElementById('gift-list'); list.innerHTML = '';
    giftsToShow.forEach(g => { const id = g.id || g['ID'] || 'unknown'; const title = g.title || g['タイトル'] || 'No Title'; const msg = g.message || g['メッセージ'] || 'No Message'; const exp = g.exp || g['EXP'] || 0; list.innerHTML += `<div class="gift-item" data-id="${id}" data-exp="${exp}"><div class="gift-header"><span class="gift-title">${title}</span><span class="gift-exp">+${exp} XP</span></div><div class="gift-msg">${msg}</div></div>`; });
    document.getElementById('gift-overlay').classList.remove('hidden');
}
function closeGiftMenu() { document.getElementById('gift-overlay').classList.add('hidden'); }
function receiveAllGifts() {
    const items = document.querySelectorAll('.gift-item'); if (items.length === 0) return; let totalExp = 0; let count = 0;
    items.forEach(item => { const id = item.getAttribute('data-id'); const expVal = item.getAttribute('data-exp'); const exp = parseInt(expVal, 10); if (id && id !== 'undefined' && id !== 'unknown' && !gameState.claimedGifts.includes(id)) { gameState.claimedGifts.push(id); if (!isNaN(exp)) totalExp += exp; count++; } });
    if (count > 0) { gameState.xp += totalExp; saveGame(); updateTitleInfo(); playSE('win'); alert(`🎁 ギフトを${count}件受け取りました！\n合計: +${totalExp} XP`); closeGiftMenu(); checkTitles(); updateGiftButtonState(); } else { closeGiftMenu(); }
}
function updateGiftButtonState() { if (!rawData.gifts) return; const unclaimed = rawData.gifts.filter(g => { const id = g.id || g['ID']; return id && !gameState.claimedGifts.includes(id); }); const btn = document.getElementById('btn-gift'); const badge = document.getElementById('gift-badge'); if (unclaimed.length > 0) { btn.disabled = false; btn.style.opacity = "1.0"; btn.style.filter = "none"; badge.innerText = unclaimed.length; badge.classList.remove('hidden'); } else { btn.disabled = true; btn.style.opacity = "0.7"; badge.classList.add('hidden'); } }
