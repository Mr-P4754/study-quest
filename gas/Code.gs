// ============================================================================
// STUDY QUEST RPG - SQ_Master: Code.gs (Ver 3.2 統合FIX確定版)
// 全学年ファイル巡回ビルド・Googleドライブ固定JSON高速配信・生徒セーブ/ロードWeb API
// ============================================================================

const DEPLOY_FOLDER_ID = '【Googleドライブ親フォルダID】';
const JSON_FILE_NAME = 'study_quest_data.json'; // 旧互換統合ファイル名
const MASTER_JSON_NAME = 'study_quest_master.json'; // 共通マスターファイル名
const GRADE_JSON_PREFIX = 'study_quest_q_'; // 学年別問題ファイル名接頭辞

/**
 * 全角英数を半角に変換
 */
function toHalfWidth(str) {
  if (!str) return '';
  return str.toString().replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
}

/**
 * 半角英数を全角に変換
 */
function toFullWidth(str) {
  if (!str) return '';
  return str.toString().replace(/[!-~]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
}

/**
 * 学年コードの正規化（全角半角・末尾の「年」を吸収）
 */
function normalizeGradeCode(grade) {
  if (!grade) return '';
  return toHalfWidth(grade.toString().trim()).replace(/年$/, '');
}

/**
 * 学年別ファイル名の生成ヘルパー
 */
function getGradeJsonName(gradeCode) {
  const g = gradeCode ? gradeCode.toString().trim() : '';
  return `${GRADE_JSON_PREFIX}${g}.json`;
}

/**
 * スプレッドシート起動時のカスタムメニュー
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚔️ STUDY QUEST')
    .addItem('🚀 ゲームに即時反映 (全学年集約ビルド)', 'manualBuildGameJson')
    .addItem('⚡ 共通マスターのみ即時反映 (buildMasterJson)', 'manualBuildMasterJson')
    .addToUi();
}

/**
 * 手動即時反映メニュー関数（全学年）
 */
function manualBuildGameJson() {
  const ui = SpreadsheetApp.getUi();
  try {
    const res = buildGameJson();
    ui.alert('全学年ビルド成功', `通常問題: ${res.qCount}問\nタイピング: ${res.tCount}問\n更新日時: ${res.updatedAt}\n\nゲームに即時反映されました！`, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('ビルド失敗', err.message, ui.ButtonSet.OK);
  }
}

/**
 * 手動即時反映メニュー関数（共通マスターのみ）
 */
function manualBuildMasterJson() {
  const ui = SpreadsheetApp.getUi();
  try {
    const res = buildMasterJson();
    ui.alert('共通マスター反映成功', `更新日時: ${res.updatedAt}\nキャラクター・ボス・ショップ等のマスターデータが即時反映されました！`, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('反映失敗', err.message, ui.ButtonSet.OK);
  }
}

/**
 * 共通マスターデータ（キャラ・ボス・ショップ・ギフト・Config等）の単独高速ビルド (所要時間: 1〜2秒)
 */
function buildMasterJson(ss) {
  const masterSs = ss || SpreadsheetApp.getActiveSpreadsheet();
  const buildTime = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  const payload = {
    version: Date.now().toString(),
    updatedAt: buildTime,
    characters: getSheetJson(masterSs, 'Characters'),
    bosses: getSheetJson(masterSs, 'Bosses'),
    randomBoss: getSheetJson(masterSs, 'RandomBoss'),
    shop: getSheetJson(masterSs, 'Shop'),
    gift: getSheetJson(masterSs, 'Gift'),
    config: parseKeyValueConfig(masterSs)
  };

  const file = saveJsonToDrive(payload, MASTER_JSON_NAME);
  return { success: true, updatedAt: buildTime, file: file, payloadStr: JSON.stringify(payload) };
}

/**
 * 特定学年のみの単独高速ビルド (所要時間: 2〜3秒)
 */
function buildGradeJson(targetGradeCode) {
  if (!targetGradeCode) throw new Error('学年コードが指定されていません。');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('ファイル設定');
  if (!configSheet) throw new Error('「ファイル設定」シートがありません。');

  const configs = configSheet.getDataRange().getValues();
  const buildTime = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  let targetRow = null;

  // 学年コード（'小4', '4年', '中1', '中３' 等）の表記ゆれ（全角半角・「年」有無）を正規化して該当行を検索
  const cleanTarget = normalizeGradeCode(targetGradeCode);
  for (let i = 1; i < configs.length; i++) {
    const [label, fileId, gradeCode, subjectStr, hasTyping, active] = configs[i];
    if (!fileId || active === false || active === 'FALSE') continue;
    const cleanG = normalizeGradeCode(gradeCode || label || '');
    if (cleanG === cleanTarget || cleanG.includes(cleanTarget) || cleanTarget.includes(cleanG)) {
      targetRow = configs[i];
      break;
    }
  }

  if (!targetRow) {
    throw new Error(`指定学年 [${targetGradeCode}] に該当するファイル設定が見つかりません。`);
  }

  const [label, fileId, gradeCode, subjectStr, hasTyping] = targetRow;
  const targetSs = SpreadsheetApp.openById(fileId.toString().trim());
  const allQuestions = [];
  const allTyping = [];
  let qCount = 0;
  let tCount = 0;

  // 1. 通常教科シートの走査
  const configuredSubjects = subjectStr ? subjectStr.toString().split(',').map(s => s.trim()).filter(Boolean) : [];
  const ignoreSheets = ['タイピング', 'ファイル設定', 'Users', 'Config', 'ログ', 'シート1', 'Sheet1'];
  const subjectNamesToScan = new Set(configuredSubjects);
  targetSs.getSheets().forEach(s => {
    const sName = s.getName().trim();
    if (!ignoreSheets.includes(sName)) subjectNamesToScan.add(sName);
  });

  subjectNamesToScan.forEach(subjectName => {
    const sheet = targetSs.getSheetByName(subjectName);
    if (!sheet) return;
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return;

    for (let r = 1; r < rows.length; r++) {
      const [id, grade, unit, subject, question, ans, w1, w2, w3, explain, rowActive] = rows[r];
      if (!question || ans === undefined || ans === null || String(ans).trim() === '') continue;
      if (rowActive === false || rowActive === 'FALSE') continue;

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

  const payload = {
    grade: targetGradeCode,
    gradeCode: gradeCode,
    label: label,
    version: Date.now().toString(),
    updatedAt: buildTime,
    questionCount: qCount,
    typingCount: tCount,
    questions: allQuestions,
    typing: allTyping
  };

  const fileName = getGradeJsonName(targetGradeCode);
  const file = saveJsonToDrive(payload, fileName);
  return {
    success: true,
    grade: targetGradeCode,
    qCount: qCount,
    tCount: tCount,
    updatedAt: buildTime,
    file: file,
    payloadStr: JSON.stringify(payload)
  };
}

/**
 * ゲームデータの集約ビルド関数（特定学年単独ビルド、または全学年＋共通マスター一括ビルド）
 */
function buildGameJson(targetGrade) {
  // 引数で学年が指定された場合は超高速単独ビルドを実行
  if (targetGrade) {
    return buildGradeJson(targetGrade);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('ファイル設定');
  if (!configSheet) throw new Error('「ファイル設定」シートがありません。');

  // 1. 共通マスターのビルド
  buildMasterJson(ss);

  // 2. 各学年ファイルの個別ビルド
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
      const gradeResult = buildGradeJson(gradeCode || label);
      const gradeData = JSON.parse(gradeResult.payloadStr);
      allQuestions.push(...gradeData.questions);
      allTyping.push(...gradeData.typing);
      qCount += gradeResult.qCount;
      tCount += gradeResult.tCount;
    } catch (e) {
      Logger.log(`学年別ビルドスキップ [${label}]: ${e.message}`);
    }
  }

  // 3. 旧クライアント互換用の全学年統合ファイルも更新
  const legacyPayload = {
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

  const file = saveJsonToDrive(legacyPayload, JSON_FILE_NAME);
  return { success: true, qCount: qCount, tCount: tCount, updatedAt: buildTime, file: file, payloadStr: JSON.stringify(legacyPayload) };
}

/**
 * Web API エンドポイント (GET: キャッシュ配信 / load 互換 / 分割取得)
 */
function doGet(e) {
  // 生徒データ読込 (action === 'load')
  if (e && e.parameter && e.parameter.action === 'load') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return loadUserData(e.parameter.userId, ss);
  }

  try {
    const folder = getDeployFolder();
    let targetFileName = JSON_FILE_NAME;

    // 1. 学年別問題データの要求 (?grade=小4 または ?grade=中３)
    if (e && e.parameter && e.parameter.grade) {
      const rawGrade = e.parameter.grade.toString().trim();
      const halfGrade = toHalfWidth(rawGrade);
      const fullGrade = toFullWidth(rawGrade);

      // 全角・半角の両方のファイル名候補を用意（重複除外）
      const candidateNames = [...new Set([
        getGradeJsonName(rawGrade),
        getGradeJsonName(halfGrade),
        getGradeJsonName(fullGrade)
      ])];

      let targetFile = null;
      for (const fname of candidateNames) {
        const files = folder.getFilesByName(fname);
        if (files.hasNext()) {
          targetFile = files.next();
          break;
        }
      }

      if (targetFile) {
        return ContentService.createTextOutput(targetFile.getBlob().getDataAsString())
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        // 未作成の場合はオンデマンドビルド
        const buildRes = buildGradeJson(rawGrade);
        return ContentService.createTextOutput(buildRes.payloadStr)
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 2. 共通マスターデータの要求 (?action=master)
    if (e && e.parameter && e.parameter.action === 'master') {
      targetFileName = MASTER_JSON_NAME;
      const files = folder.getFilesByName(targetFileName);
      if (files.hasNext()) {
        return ContentService.createTextOutput(files.next().getBlob().getDataAsString())
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        const buildRes = buildMasterJson();
        return ContentService.createTextOutput(buildRes.payloadStr)
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 3. デフォルト（旧形式互換: study_quest_data.json または master）
    const legacyFiles = folder.getFilesByName(JSON_FILE_NAME);
    if (legacyFiles.hasNext()) {
      return ContentService.createTextOutput(legacyFiles.next().getBlob().getDataAsString())
        .setMimeType(ContentService.MimeType.JSON);
    }

    const masterFiles = folder.getFilesByName(MASTER_JSON_NAME);
    if (masterFiles.hasNext()) {
      return ContentService.createTextOutput(masterFiles.next().getBlob().getDataAsString())
        .setMimeType(ContentService.MimeType.JSON);
    }

    const buildResult = buildGameJson();
    return ContentService.createTextOutput(buildResult.payloadStr)
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
      // 学年が指定されている場合は超高速単独ビルド (2〜3秒)
      if (json.grade) {
        const res = buildGradeJson(json.grade);
        return response({
          status: 'success',
          message: `Grade [${json.grade}] build completed`,
          grade: json.grade,
          qCount: res.qCount,
          tCount: res.tCount,
          updatedAt: res.updatedAt
        });
      }

      // 学年未指定の場合は全学年ビルド
      const res = buildGameJson();
      return response({
        status: 'success',
        message: 'All grades build completed',
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
function saveJsonToDrive(data, customFileName) {
  const fileName = customFileName || JSON_FILE_NAME;
  const folder = getDeployFolder();
  const files = folder.getFilesByName(fileName);
  const content = JSON.stringify(data);
  let targetFile = null;
  while (files.hasNext()) {
    const file = files.next();
    if (!targetFile) {
      targetFile = file;
      targetFile.setContent(content);
    } else {
      // 過去の重複ファイルを整理して配信の不整合を防止
      file.setTrashed(true);
    }
  }
  if (targetFile) {
    return targetFile;
  } else {
    return folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
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
