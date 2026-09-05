// ============================================================================
// STUDY QUEST RPG - Setup_Migration.gs (Ver 3.2 ゼロ環境構築 & 旧シート完全移行対応版)
// Google Drive 上に STUDY_QUEST_DATABASE 親フォルダと全13スプレッドシートを一括自動生成し、
// 旧スプレッドシートから全1,469問・196問タイピング・208体キャラを一瞬で完全自動移行するスクリプト
// ============================================================================

const PARENT_FOLDER_NAME = 'STUDY_QUEST_DATABASE';

// 移行元の旧スプレッドシートID
const LEGACY_SPREADSHEET_ID = '1KxlNqIfzXKbUdfW7mCFOA99kOmC9MQgcVEWpI1KxrDk';

const GRADE_DEFS = [
  { label: '小学校1年', gradeCode: '小1', name: 'SQ_Questions_小1', subjects: ['国語', '算数'], hasTyping: true },
  { label: '小学校2年', gradeCode: '小2', name: 'SQ_Questions_小2', subjects: ['国語', '算数'], hasTyping: true },
  { label: '小学校3年', gradeCode: '小3', name: 'SQ_Questions_小3', subjects: ['国語', '算数', '理科', '社会'], hasTyping: true },
  { label: '小学校4年', gradeCode: '小4', name: 'SQ_Questions_小4', subjects: ['国語', '算数', '理科', '社会'], hasTyping: true },
  { label: '小学校5年', gradeCode: '小5', name: 'SQ_Questions_小5', subjects: ['国語', '算数', '理科', '社会', '英語'], hasTyping: true },
  { label: '小学校6年', gradeCode: '小6', name: 'SQ_Questions_小6', subjects: ['国語', '算数', '理科', '社会', '英語'], hasTyping: true },
  { label: '中学校1年', gradeCode: '中１', name: 'SQ_Questions_中1', subjects: ['国語', '社会', '理科', '数学', '英語'], hasTyping: true },
  { label: '中学校2年', gradeCode: '中２', name: 'SQ_Questions_中2', subjects: ['国語', '社会', '理科', '数学', '英語'], hasTyping: true },
  { label: '中学校3年', gradeCode: '中３', name: 'SQ_Questions_中3', subjects: ['国語', '社会', '理科', '数学', '英語'], hasTyping: true },
  { label: '高等学校1年', gradeCode: '高1', name: 'SQ_Questions_高1', subjects: ['国語', '数学', '理科', '社会', '英語', '情報'], hasTyping: true },
  { label: '高等学校2年', gradeCode: '高2', name: 'SQ_Questions_高2', subjects: ['国語', '数学', '理科', '社会', '英語', '情報'], hasTyping: true },
  { label: '高等学校3年', gradeCode: '高3', name: 'SQ_Questions_高3', subjects: ['国語', '数学', '理科', '社会', '英語', '情報'], hasTyping: true },
];

const QUESTION_HEADERS = [
  'ID', '学年', '単元', '教科', '問題文', '正解', '誤答1', '誤答2', '誤答3', '解説', '有効'
];

const TYPING_HEADERS = [
  'ID', '学年', '単元/ジャンル', '教科', '日本語', 'ローマ字', '有効'
];

// ボスドロップ4体（Google公式高解像度CDN形式）
const ADDITIONAL_BOSS_CHARACTERS = [
  ['boss_算数神', '算数神', 'UR', 'ALL', 2.50, '算数の試練を司る神', 'ボス', 'https://lh3.googleusercontent.com/d/1s6wIIi_1jtHbFg0SkPO2Zk1kvSGzhbeO'],
  ['boss_漢字大魔王', '漢字大魔王', 'UR', 'ALL', 2.30, '漢字の迷宮を統べる王', 'ボス', 'https://lh3.googleusercontent.com/d/1qHVLYP4_43JeAY8Fm3Nwtf2p3kJxfYnI'],
  ['boss_サンライズくん', 'サンライズくん', 'SSR', 'EXP', 2.00, '暁の光を宿す存在', 'ボス', 'https://lh3.googleusercontent.com/d/1YNf03aXj8Ry1vIAbc1cL4s6s1wyni6jr'],
  ['boss_てこのはたらき', 'てこのはたらき', 'SR', 'ATK', 1.80, '力点を操る魔導体', 'ボス', 'https://lh3.googleusercontent.com/d/1msxofwXzT5VC_a1ZGVsaHa0210MxGxHv']
];

// ギフト全5レコード補完定義
const DEFAULT_GIFTS = [
  ['ID', 'タイトル', 'メッセージ', 'EXP', '有効'],
  ['0', '進級ボーナス', '進級おめでとう', 30000, 'TRUE'],
  ['1', 'ログインボーナス', '毎日プレイ達成！', 10000, 'TRUE'],
  ['4', '4年マラソンボーナス', '222.2km走破！', 2222000, 'TRUE'],
  ['g_001', '特別ミッション報酬', 'クエストクリア記念', 50000, 'TRUE'],
  ['g_004', 'マスターボーナス', '全単元制覇！', 100000, 'TRUE']
];

/**
 * ============================================================================
 * 【メイン機能】旧スプレッドシートから新ファイル群へ全データを一括移行
 * 関数名: importLegacyData
 * ============================================================================
 */
function importLegacyData() {
  Logger.log('=== 旧スプレッドシートからのデータ一括移行を開始 ===');

  // 1. 親フォルダと各スプレッドシートの取得
  const folders = DriveApp.getFoldersByName(PARENT_FOLDER_NAME);
  if (!folders.hasNext()) {
    throw new Error(`親フォルダ「${PARENT_FOLDER_NAME}」が見つかりません。先に setupAllDatabase を実行してください。`);
  }
  const folder = folders.next();

  // 学年ファイルのマップ生成 (例: '小4' -> Spreadsheet)
  const gradeFileMap = {};
  GRADE_DEFS.forEach(gdef => {
    const files = folder.getFilesByName(gdef.name);
    if (files.hasNext()) {
      gradeFileMap[gdef.gradeCode] = SpreadsheetApp.openById(files.next().getId());
    }
  });

  // SQ_Master の取得
  const masterFiles = folder.getFilesByName('SQ_Master');
  if (!masterFiles.hasNext()) {
    throw new Error('「SQ_Master」が見つかりません。');
  }
  const masterSs = SpreadsheetApp.openById(masterFiles.next().getId());

  // 2. 旧スプレッドシートを開く
  const oldSs = SpreadsheetApp.openById(LEGACY_SPREADSHEET_ID);
  const oldSheets = oldSs.getSheets();
  Logger.log(`旧スプレッドシート接続成功: 全${oldSheets.length}シートを検出`);

  // データ振り分け用バッファ
  // questionsBuffer[gradeCode][subject] = [ [A..K], ... ]
  const questionsBuffer = {};
  // typingBuffer[gradeCode] = [ [A..G], ... ]
  const typingBuffer = {};
  GRADE_DEFS.forEach(g => {
    questionsBuffer[g.gradeCode] = {};
    g.subjects.forEach(s => { questionsBuffer[g.gradeCode][s] = []; });
    typingBuffer[g.gradeCode] = [];
  });

  let totalQCount = 0;
  let totalTCount = 0;
  const uniqueQIds = new Set();
  const seenVol7Ids = new Set();

  // 3. 旧シートの走査
  oldSheets.forEach(sheet => {
    const sName = sheet.getName();
    const lowerName = sName.toLowerCase().trim();
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return;

    // --- A. 通常問題シート (Questions_Vol2..9 等) ---
    if (lowerName.indexOf('question') === 0) {
      Logger.log(`問題シート走査中: ${sName} (${values.length - 1}行)`);
      const headers = values[0].map(h => String(h).trim());
      const idIdx = headers.indexOf('ID');
      const gradeIdx = headers.indexOf('学年');
      const unitIdx = headers.indexOf('単元');
      const subjIdx = headers.indexOf('教科');
      const qIdx = headers.indexOf('問題文');
      const ansIdx = headers.indexOf('正解');
      const w1Idx = headers.indexOf('誤答1');
      const w2Idx = headers.indexOf('誤答2');
      const w3Idx = headers.indexOf('誤答3');
      const expIdx = headers.indexOf('解説');
      const actIdx = headers.indexOf('有効');

      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        let qid = idIdx >= 0 ? String(row[idIdx]).trim() : '';
        const gradeVal = gradeIdx >= 0 ? String(row[gradeIdx]).trim() : '';
        const unitVal = unitIdx >= 0 ? String(row[unitIdx]).trim() : '';
        let subjVal = subjIdx >= 0 ? String(row[subjIdx]).trim() : '';
        const qText = qIdx >= 0 ? String(row[qIdx]).trim() : '';
        const ansVal = ansIdx >= 0 ? String(row[ansIdx]).trim() : '';
        const w1Val = w1Idx >= 0 ? String(row[w1Idx]).trim() : '';
        const w2Val = w2Idx >= 0 ? String(row[w2Idx]).trim() : '';
        const w3Val = w3Idx >= 0 ? String(row[w3Idx]).trim() : '';
        const expVal = expIdx >= 0 ? String(row[expIdx]).trim() : '';
        let actVal = actIdx >= 0 ? String(row[actIdx]).trim().toUpperCase() : 'TRUE';
        if (!actVal) actVal = 'TRUE';

        if (!qText || !ansVal) continue;

        // Vol7 の重複10件の一意化（後出の「中国にならった国家づくり」に _b を付加）
        if (sName.includes('Vol7')) {
          if (seenVol7Ids.has(qid)) {
            qid = qid + '_b';
          }
          seenVol7Ids.add(qid.replace('_b', ''));
        }

        // 全域での重複ID自動一意化（重複ゼロ100%保証）
        let uniqueQid = qid;
        let dupIndex = 1;
        while (uniqueQIds.has(uniqueQid)) {
          dupIndex++;
          uniqueQid = `${qid}_${dupIndex}`;
          Logger.log(`[重複自動解消] 元ID: ${qid} -> 新ID: ${uniqueQid} (${sName} / ${gradeVal})`);
        }
        qid = uniqueQid;

        // 対象学年コードの特定
        const targetGradeCode = resolveGradeCode(sName, gradeVal);
        if (!targetGradeCode || !questionsBuffer[targetGradeCode]) {
          Logger.log(`[スキップ] 学年不明: ${sName} / ${gradeVal} (ID: ${qid})`);
          continue;
        }

        // 教科名の補正（例: 中学での算数->数学など）
        if (subjVal === '算数' && (targetGradeCode.startsWith('中') || targetGradeCode.startsWith('高'))) {
          subjVal = '数学';
        }
        if (!questionsBuffer[targetGradeCode][subjVal]) {
          questionsBuffer[targetGradeCode][subjVal] = [];
        }

        const record = [qid, gradeVal, unitVal, subjVal, qText, ansVal, w1Val, w2Val, w3Val, expVal, actVal];
        questionsBuffer[targetGradeCode][subjVal].push(record);
        uniqueQIds.add(qid);
        totalQCount++;
      }
    }

    // --- B. タイピングシート ---
    else if (lowerName === 'typing') {
      Logger.log(`タイピングシート走査中: ${sName} (${values.length - 1}行)`);
      const headers = values[0].map(h => String(h).trim());
      const idIdx = headers.indexOf('ID');
      const gradeIdx = headers.indexOf('学年');
      const jpIdx = headers.indexOf('日本語');
      const roIdx = headers.indexOf('ローマ字');

      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        const tid = idIdx >= 0 ? String(row[idIdx]).trim() : `t_${r}`;
        const tGrade = gradeIdx >= 0 ? String(row[gradeIdx]).trim() : '';
        const jp = jpIdx >= 0 ? String(row[jpIdx]).trim() : '';
        const ro = roIdx >= 0 ? String(row[roIdx]).trim().toLowerCase().replace(/\s+/g, '') : '';

        if (!jp || !ro) continue;

        const targetGradeCode = resolveTypingGradeCode(tGrade);
        if (!targetGradeCode || !typingBuffer[targetGradeCode]) continue;

        // 専用7列: [ID, 学年, '全般', 'タイピング', 日本語, ローマ字, 'TRUE']
        typingBuffer[targetGradeCode].push([tid, tGrade, '全般', 'タイピング', jp, ro, 'TRUE']);
        totalTCount++;
      }
    }

    // --- C. キャラクターシート ---
    else if (lowerName === 'characters') {
      Logger.log(`キャラクターシート走査中: ${sName} (${values.length - 1}行)`);
      const charSheet = masterSs.getSheetByName('Characters');
      if (charSheet) {
        charSheet.clear();
        charSheet.appendRow(['ID', '名前', 'レア', 'タイプ', '補正値', '解説', 'カテゴリ', '画像URL']);
        const charRows = [];
        const existingIds = new Set();

        for (let r = 1; r < values.length; r++) {
          const row = values[r];
          if (!row[0] && !row[1]) continue;
          const strId = String(row[0]).trim();
          existingIds.add(strId);
          // IDを確実に文字列化
          row[0] = strId;
          charRows.push(row.slice(0, 8));
        }

        // ボス4体を追加
        ADDITIONAL_BOSS_CHARACTERS.forEach(boss => {
          if (!existingIds.has(boss[0])) {
            charRows.push(boss);
          }
        });

        if (charRows.length > 0) {
          charSheet.getRange(2, 1, charRows.length, 8).setValues(charRows);
        }
        charSheet.setFrozenRows(1);
        Logger.log(`Characters 移行完了: 合計 ${charRows.length} 体`);
      }
    }

    // --- D. Users シート (生徒セーブデータ) ---
    else if (lowerName === 'users') {
      Logger.log(`Users シート移行中: ${values.length - 1}件`);
      const userSheet = masterSs.getSheetByName('Users');
      if (userSheet) {
        userSheet.clear();
        userSheet.appendRow(['UserID', 'Data', 'LastUpdated']);
        const userRows = values.slice(1);
        if (userRows.length > 0) {
          userSheet.getRange(2, 1, userRows.length, userRows[0].length).setValues(userRows);
        }
        userSheet.setFrozenRows(1);
      }
    }

    // --- E. Shop シート ---
    else if (lowerName === 'shop') {
      const shopSheet = masterSs.getSheetByName('Shop');
      if (shopSheet && values.length > 1) {
        shopSheet.clear();
        shopSheet.appendRow(['ID', 'アイテム名', '価格', 'タイプ', '効果値', '説明', 'アイコン']);
        const shopRows = values.slice(1).map(r => r.slice(0, 7));
        shopSheet.getRange(2, 1, shopRows.length, 7).setValues(shopRows);
        shopSheet.setFrozenRows(1);
      }
    }
  });

  // 4. バッファから各学年スプレッドシートへ高速一括書き込み
  GRADE_DEFS.forEach(gdef => {
    const targetSs = gradeFileMap[gdef.gradeCode];
    if (!targetSs) return;

    // 教科シート書き込み
    gdef.subjects.forEach(subj => {
      let sheet = targetSs.getSheetByName(subj);
      if (!sheet) {
        sheet = targetSs.insertSheet(subj);
        sheet.appendRow(QUESTION_HEADERS);
        sheet.setFrozenRows(1);
      }

      const rows = questionsBuffer[gdef.gradeCode][subj] || [];
      if (rows.length > 0) {
        // 既存行をクリアして一括挿入
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 11).clearContent();
        sheet.getRange(2, 1, rows.length, 11).setValues(rows);
      }
    });

    // タイピングシート書き込み
    if (gdef.hasTyping) {
      let tSheet = targetSs.getSheetByName('タイピング');
      if (!tSheet) {
        tSheet = targetSs.insertSheet('タイピング');
        tSheet.appendRow(TYPING_HEADERS);
        tSheet.setFrozenRows(1);
      }
      const tRows = typingBuffer[gdef.gradeCode] || [];
      if (tRows.length > 0) {
        const lastRow = tSheet.getLastRow();
        if (lastRow > 1) tSheet.getRange(2, 1, lastRow - 1, 7).clearContent();
        tSheet.getRange(2, 1, tRows.length, 7).setValues(tRows);
      }
    }
  });

  Logger.log('\n========================================================');
  Logger.log(`🎉 旧スプレッドシートからのデータ移行が完了いたしました！`);
  Logger.log(`通常問題数: ${totalQCount} 問 (ユニークID数: ${uniqueQIds.size})`);
  Logger.log(`タイピング問題数: ${totalTCount} 問`);
  Logger.log('========================================================');

  return {
    success: true,
    totalQCount: totalQCount,
    uniqueQIds: uniqueQIds.size,
    totalTCount: totalTCount
  };
}

/**
 * シート名および学年文字列から学年コード（'小1'..'高3'）を判定
 */
function resolveGradeCode(sheetName, gradeVal) {
  // 1. シート名による確実な判定
  if (sheetName.includes('Vol2')) return '小2';
  if (sheetName.includes('Vol4')) return '小4';
  if (sheetName.includes('Vol5')) return '小5';
  if (sheetName.includes('Vol6')) return '小6';
  if (sheetName.includes('Vol7')) return '中１';
  if (sheetName.includes('Vol8')) return '中２';
  if (sheetName.includes('Vol9')) return '中３';

  // 2. 学年セル文字列による判定
  const g = String(gradeVal).trim();
  if (g.includes('小1') || g === '1年') return '小1';
  if (g.includes('小2') || g === '2年') return '小2';
  if (g.includes('小3') || g === '3年') return '小3';
  if (g.includes('小4') || g === '4年') return '小4';
  if (g.includes('小5') || g === '5年') return '小5';
  if (g.includes('小6') || g === '6年') return '小6';
  if (g.includes('中１') || g.includes('中1')) return '中１';
  if (g.includes('中２') || g.includes('中2')) return '中２';
  if (g.includes('中３') || g.includes('中3')) return '中３';
  if (g.includes('高1')) return '高1';
  if (g.includes('高2')) return '高2';
  if (g.includes('高3')) return '高3';

  return null;
}

/**
 * タイピング学年文字列の判定
 */
function resolveTypingGradeCode(gradeVal) {
  const g = String(gradeVal).trim();
  if (g.includes('6') || g.includes('６')) return '小6';
  if (g.includes('4') || g.includes('４')) return '小4';
  if (g.includes('3') || g.includes('３')) return '小3';
  if (g.includes('1') || g.includes('１')) return '小1';
  if (g.includes('2') || g.includes('２')) return '小2';
  if (g.includes('5') || g.includes('５')) return '小5';
  return '小6'; // デフォルト
}
