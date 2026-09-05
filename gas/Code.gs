// ============================================================================
// STUDY QUEST RPG - SQ_Master: Code.gs (Ver 3.2 統合FIX確定版)
// 全学年ファイル巡回ビルド・Googleドライブ固定JSON高速配信・生徒セーブ/ロードWeb API
// ============================================================================

const DEPLOY_FOLDER_ID = '【Googleドライブ親フォルダID】';
const JSON_FILE_NAME = 'study_quest_data.json';

/**
 * スプレッドシート起動時のカスタムメニュー
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚔️ STUDY QUEST')
    .addItem('🚀 ゲームに即時反映 (buildGameJson)', 'manualBuildGameJson')
    .addToUi();
}

/**
 * 手動即時反映メニュー関数
 */
function manualBuildGameJson() {
  const ui = SpreadsheetApp.getUi();
  try {
    const res = buildGameJson();
    ui.alert('ビルド成功', `通常問題: ${res.qCount}問\nタイピング: ${res.tCount}問\n更新日時: ${res.updatedAt}\n\nゲームに即時反映されました！`, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('ビルド失敗', err.message, ui.ButtonSet.OK);
  }
}

/**
 * 全学年ファイルの集約ビルド関数
 */
function buildGameJson() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('ファイル設定');
  if (!configSheet) throw new Error('「ファイル設定」シートがありません。');

  const configs = configSheet.getDataRange().getValues();
  const allQuestions = [];
  const allTyping = [];
  const buildTime = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  let qCount = 0;
  let tCount = 0;

  for (let i = 1; i < configs.length; i++) {
    const [label, fileId, gradeCode, subjectStr, hasTyping, active] = configs[i];
    if (!fileId || active === false || active === 'FALSE') continue;

    try {
      const targetSs = SpreadsheetApp.openById(fileId.toString().trim());
      const subjects = subjectStr.toString().split(',').map(s => s.trim());

      // 1. 通常教科シートの走査
      subjects.forEach(subjectName => {
        const sheet = targetSs.getSheetByName(subjectName);
        if (!sheet) return;
        const rows = sheet.getDataRange().getValues();
        if (rows.length <= 1) return;

        for (let r = 1; r < rows.length; r++) {
          const [id, grade, unit, subject, question, ans, w1, w2, w3, explain, rowActive] = rows[r];
          if (!question || ans === undefined || ans === null || String(ans).trim() === '') continue;
          if (rowActive === false || rowActive === 'FALSE') continue;

          // 安全な選択肢配列生成（null/undefined除外）
          const safeChoices = [ans, w1, w2, w3]
            .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
            .map(String);

          allQuestions.push({
            id: id ? id.toString() : `q_${gradeCode}_${r}`,
            grade: grade ? grade.toString() : gradeCode,
            unit: unit ? unit.toString() : '',
            subject: subject ? subject.toString() : subjectName,
            question: question.toString(),
            answer: ans.toString(),
            wrong1: (w1 !== undefined && w1 !== null) ? w1.toString() : '',
            wrong2: (w2 !== undefined && w2 !== null) ? w2.toString() : '',
            wrong3: (w3 !== undefined && w3 !== null) ? w3.toString() : '',
            choices: safeChoices,
            explain: (explain !== undefined && explain !== null) ? explain.toString() : ''
          });
          qCount++;
        }
      });

      // 2. タイピングシートの走査
      if (hasTyping === true || hasTyping === 'TRUE') {
        const typingSheet = targetSs.getSheetByName('タイピング');
        if (typingSheet) {
          const tRows = typingSheet.getDataRange().getValues();
          for (let tr = 1; tr < tRows.length; tr++) {
            const [tId, tGrade, tUnit, tSubject, japanese, romaji, tActive] = tRows[tr];
            if (!japanese || !romaji) continue;
            if (tActive === false || tActive === 'FALSE') continue;

            allTyping.push({
              id: tId ? tId.toString() : `t_${gradeCode}_${tr}`,
              grade: tGrade ? tGrade.toString() : gradeCode,
              unit: tUnit ? tUnit.toString() : '全般',
              subject: 'タイピング',
              japanese: japanese.toString(),
              romaji: romaji.toString()
            });
            tCount++;
          }
        }
      }
    } catch (e) {
      Logger.log(`巡回エラー [${label}]: ${e.message}`);
    }
  }

  const payload = {
    version: Date.now().toString(),
    updatedAt: buildTime,
    questionCount: qCount,
    typingCount: tCount,
    characters: getSheetJson(ss, 'Characters'),
    bosses: getSheetJson(ss, 'Bosses'),
    randomBoss: getSheetJson(ss, 'RandomBoss'),
    shop: getSheetJson(ss, 'Shop'),
    gift: getSheetJson(ss, 'Gift'),
    config: parseKeyValueConfig(ss),
    questions: allQuestions,
    typing: allTyping
  };

  const file = saveJsonToDrive(payload);
  return { success: true, qCount: qCount, tCount: tCount, updatedAt: buildTime, file: file, payloadStr: JSON.stringify(payload) };
}

/**
 * Web API エンドポイント (GET: キャッシュ配信 / load 互換)
 */
function doGet(e) {
  // 後方互換: e.parameter.action === 'load' の場合は生徒データ読込
  if (e && e.parameter && e.parameter.action === 'load') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return loadUserData(e.parameter.userId, ss);
  }

  try {
    const folder = getDeployFolder();
    const files = folder.getFilesByName(JSON_FILE_NAME);
    let content = '';

    if (files.hasNext()) {
      content = files.next().getBlob().getDataAsString();
    } else {
      const buildResult = buildGameJson();
      content = buildResult.payloadStr;
    }

    return ContentService.createTextOutput(content)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Web API エンドポイント (POST: 生徒データのセーブ/ロード/リモートビルド)
 */
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    const json = JSON.parse(e.postData.contents);
    if (json.action === 'save') return saveUserData(json.userId, json.data, ss);
    if (json.action === 'load') return loadUserData(json.userId, ss);
    
    // ▼ 学年別シートからのリモートビルド要求受付 ▼
    if (json.action === 'build') {
      const res = buildGameJson();
      return response({
        status: 'success',
        message: 'Build completed',
        qCount: res.qCount,
        tCount: res.tCount,
        updatedAt: res.updatedAt
      });
    }
    
    return response({ status: 'error', message: '無効なアクションです: ' + json.action });
  } catch (err) {
    return response({ status: 'error', message: err.toString() });
  }
}

/**
 * 生徒データのクラウド保存
 */
function saveUserData(userId, data, ss) {
  let sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    sheet.appendRow(['UserID', 'Data', 'LastUpdated']);
  }
  const lastRow = sheet.getLastRow();
  let rowIndex = -1;
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(userId)) {
        rowIndex = i + 2;
        break;
      }
    }
  }
  const dataStr = JSON.stringify(data);
  const time = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 2).setValue(dataStr);
    sheet.getRange(rowIndex, 3).setValue(time);
  } else {
    sheet.appendRow([userId, dataStr, time]);
  }
  return response({ status: 'success', message: 'Saved' });
}

/**
 * 生徒データのクラウド読込
 */
function loadUserData(userId, ss) {
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return response({ status: 'error', message: 'Users sheet not found' });
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return response({ status: 'error', message: 'User not found' });
  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      return response({ status: 'success', data: data[i][1] });
    }
  }
  return response({ status: 'error', message: 'User ID not found' });
}

/**
 * デプロイ先Googleドライブフォルダの取得
 */
function getDeployFolder() {
  const folderId = PropertiesService.getScriptProperties().getProperty('DEPLOY_FOLDER_ID') || DEPLOY_FOLDER_ID;
  if (folderId && !folderId.includes('【')) {
    return DriveApp.getFolderById(folderId);
  }
  const parents = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents();
  if (parents.hasNext()) {
    return parents.next();
  }
  return DriveApp.getRootFolder();
}

/**
 * ドライブ固定JSONの書き込み/更新
 */
function saveJsonToDrive(data) {
  const folder = getDeployFolder();
  const files = folder.getFilesByName(JSON_FILE_NAME);
  const content = JSON.stringify(data);
  if (files.hasNext()) {
    const file = files.next();
    file.setContent(content);
    return file;
  } else {
    return folder.createFile(JSON_FILE_NAME, content, MimeType.PLAIN_TEXT);
  }
}

/**
 * シートデータをキー・バリュー形式のJSON配列として取得
 */
function getSheetJson(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, idx) => {
      if (h) {
        const val = r[idx];
        // ID列は常に文字列型として出力し厳密等価比較の破綻を防止
        o[h] = (h === 'ID' && val !== undefined && val !== null) ? val.toString() : val;
      }
    });
    return o;
  });
}

/**
 * Configシート（Key-Value型）をオブジェクトとしてパース
 */
function parseKeyValueConfig(ss) {
  const sheet = ss.getSheetByName('Config');
  if (!sheet) return {};
  const rows = sheet.getDataRange().getValues();
  const config = {};
  for (let r = 0; r < rows.length; r++) {
    const key = rows[r][0];
    const val = rows[r][1];
    if (key) config[key.toString().trim()] = val !== undefined ? val.toString().trim() : '';
  }
  return config;
}

/**
 * JSONレスポンス生成ヘルパー
 */
function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
