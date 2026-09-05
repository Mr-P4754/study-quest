// ============================================================================
// STUDY QUEST RPG - Setup_Migration.gs (Ver 3.2 ゼロ環境構築対応版)
// Google Drive 上に STUDY_QUEST_DATABASE 親フォルダと全13スプレッドシートを一括自動生成し、
// 統一列フォーマットの構築・ファイル設定の自動バインド・初期ビルドまでを完遂するスクリプト
// ============================================================================

const PARENT_FOLDER_NAME = 'STUDY_QUEST_DATABASE';

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

/**
 * 【ワンクリック初期構築】
 * Googleドライブ上に親フォルダと全13スプレッドシートを自動生成し初期設定を完了する
 */
function setupAllDatabase() {
  Logger.log('=== STUDY QUEST データベース初期自動構築開始 ===');

  // 1. 親フォルダ作成
  let folder;
  const existingFolders = DriveApp.getFoldersByName(PARENT_FOLDER_NAME);
  if (existingFolders.hasNext()) {
    folder = existingFolders.next();
    Logger.log(`既存フォルダを使用: ${PARENT_FOLDER_NAME} (ID: ${folder.getId()})`);
  } else {
    folder = DriveApp.createFolder(PARENT_FOLDER_NAME);
    Logger.log(`親フォルダ新規作成: ${PARENT_FOLDER_NAME} (ID: ${folder.getId()})`);
  }
  const folderId = folder.getId();

  const fileConfigs = [
    ['ファイル区分', 'スプレッドシートID', '学年コード', '通常教科シート名（カンマ区切り）', 'タイピングシート有', '有効']
  ];

  // 2. 学年別スプレッドシート12ファイルの生成
  GRADE_DEFS.forEach(gdef => {
    let ss;
    const existingFiles = folder.getFilesByName(gdef.name);
    if (existingFiles.hasNext()) {
      const f = existingFiles.next();
      ss = SpreadsheetApp.openById(f.getId());
      Logger.log(`既存学年ファイルを使用: ${gdef.name} (ID: ${ss.getId()})`);
    } else {
      ss = SpreadsheetApp.create(gdef.name);
      const file = DriveApp.getFileById(ss.getId());
      file.moveTo(folder);
      Logger.log(`学年ファイル新規作成: ${gdef.name} (ID: ${ss.getId()})`);
    }

    const ssId = ss.getId();
    const subjectStr = gdef.subjects.join(', ');
    fileConfigs.push([gdef.label, ssId, gdef.gradeCode, subjectStr, 'TRUE', 'TRUE']);

    // 各教科シート設定
    gdef.subjects.forEach(subj => {
      let sheet = ss.getSheetByName(subj);
      if (!sheet) {
        sheet = ss.insertSheet(subj);
        sheet.appendRow(QUESTION_HEADERS);
        sheet.setFrozenRows(1);
      }
    });

    // タイピングシート設定
    if (gdef.hasTyping) {
      let tSheet = ss.getSheetByName('タイピング');
      if (!tSheet) {
        tSheet = ss.insertSheet('タイピング');
        tSheet.appendRow(TYPING_HEADERS);
        tSheet.setFrozenRows(1);
      }
    }

    // 初期Sheet1の削除
    const defaultSheet = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  });

  // 3. SQ_Master の生成
  let masterSs;
  const masterFiles = folder.getFilesByName('SQ_Master');
  if (masterFiles.hasNext()) {
    masterSs = SpreadsheetApp.openById(masterFiles.next().getId());
    Logger.log(`既存マスターファイルを使用: SQ_Master (ID: ${masterSs.getId()})`);
  } else {
    masterSs = SpreadsheetApp.create('SQ_Master');
    const masterFile = DriveApp.getFileById(masterSs.getId());
    masterFile.moveTo(folder);
    Logger.log(`マスターファイル新規作成: SQ_Master (ID: ${masterSs.getId()})`);
  }

  setupMasterSheets(masterSs, fileConfigs);

  // プロパティにフォルダIDを保存
  PropertiesService.getScriptProperties().setProperty('DEPLOY_FOLDER_ID', folderId);

  Logger.log('\n=== 全体構築完了 ===');
  Logger.log(`親フォルダID: ${folderId}`);
  Logger.log(`SQ_Master ID: ${masterSs.getId()}`);
  Logger.log(`SQ_Masterのスクリプトプロパティ DEPLOY_FOLDER_ID に ${folderId} を登録しました。`);
}

/**
 * SQ_Master 内の各シート構築
 */
function setupMasterSheets(masterSs, fileConfigs) {
  // 1. ファイル設定
  let configSheet = masterSs.getSheetByName('ファイル設定');
  if (!configSheet) configSheet = masterSs.insertSheet('ファイル設定');
  configSheet.clear();
  fileConfigs.forEach(row => configSheet.appendRow(row));
  configSheet.setFrozenRows(1);

  // 2. 単元マスタ
  if (!masterSs.getSheetByName('単元マスタ')) {
    const s = masterSs.insertSheet('単元マスタ');
    s.appendRow(['学年', '教科', '単元名']);
    s.setFrozenRows(1);
  }

  // 3. Characters
  let charSheet = masterSs.getSheetByName('Characters');
  if (!charSheet) {
    charSheet = masterSs.insertSheet('Characters');
    charSheet.appendRow(['ID', '名前', 'レア', 'タイプ', '補正値', '解説', 'カテゴリ', '画像URL']);
    // ボス4体
    charSheet.appendRow(['boss_算数神', '算数神', 'UR', 'ALL', 2.50, '算数の試練を司る神', 'ボス', 'https://lh3.googleusercontent.com/d/1s6wIIi_1jtHbFg0SkPO2Zk1kvSGzhbeO']);
    charSheet.appendRow(['boss_漢字大魔王', '漢字大魔王', 'UR', 'ALL', 2.30, '漢字の迷宮を統べる王', 'ボス', 'https://lh3.googleusercontent.com/d/1qHVLYP4_43JeAY8Fm3Nwtf2p3kJxfYnI']);
    charSheet.appendRow(['boss_サンライズくん', 'サンライズくん', 'SSR', 'EXP', 2.00, '暁の光を宿す存在', 'ボス', 'https://lh3.googleusercontent.com/d/1YNf03aXj8Ry1vIAbc1cL4s6s1wyni6jr']);
    charSheet.appendRow(['boss_てこのはたらき', 'てこのはたらき', 'SR', 'ATK', 1.80, '力点を操る魔導体', 'ボス', 'https://lh3.googleusercontent.com/d/1msxofwXzT5VC_a1ZGVsaHa0210MxGxHv']);
    charSheet.setFrozenRows(1);
  }

  // 4. Bosses
  if (!masterSs.getSheetByName('Bosses')) {
    const s = masterSs.insertSheet('Bosses');
    s.appendRow(['学年', '単元', 'ボス名', 'ボスHP', 'ボス画像（絵文字等）', '備考', 'bgmUrl']);
    s.setFrozenRows(1);
  }

  // 5. RandomBoss
  if (!masterSs.getSheetByName('RandomBoss')) {
    const s = masterSs.insertSheet('RandomBoss');
    s.appendRow(['grade', 'name', 'hp', 'icon', 'bgmUrl']);
    s.setFrozenRows(1);
  }

  // 6. Shop
  if (!masterSs.getSheetByName('Shop')) {
    const s = masterSs.insertSheet('Shop');
    s.appendRow(['ID', 'アイテム名', '価格', 'タイプ', '効果値', '説明', 'アイコン']);
    s.appendRow(['1', '力の腕輪', 1000, 'ATK', 0.1, '攻撃力が少し上昇する', '⚔️']);
    s.appendRow(['2', '時の砂時計', 1500, 'TIME', 1.0, '制限時間が少し延びる', '⏳']);
    s.appendRow(['3', '賢者の書', 2000, 'EXP', 0.2, '獲得経験値が少し上昇する', '📖']);
    s.setFrozenRows(1);
  }

  // 7. Gift
  if (!masterSs.getSheetByName('Gift')) {
    const s = masterSs.insertSheet('Gift');
    s.appendRow(['ID', 'タイトル', 'メッセージ', 'EXP', '有効']);
    s.appendRow(['0', '進級ボーナス', '進級おめでとう', 30000, 'TRUE']);
    s.appendRow(['1', 'ログインボーナス', '毎日プレイ達成！', 10000, 'TRUE']);
    s.appendRow(['4', '4年マラソンボーナス', '222.2km走破！', 2222000, 'TRUE']);
    s.appendRow(['g_001', '特別ミッション報酬', 'クエストクリア記念', 50000, 'TRUE']);
    s.appendRow(['g_004', 'マスターボーナス', '全単元制覇！', 100000, 'TRUE']);
    s.setFrozenRows(1);
  }

  // 8. Config
  if (!masterSs.getSheetByName('Config')) {
    const s = masterSs.insertSheet('Config');
    s.appendRow(['キー', '設定値']);
    s.appendRow(['defaultBattleBgm', 'https://drive.google.com/uc?export=view&id=10Ad4zJ-9vuBPRoIbbbohzzoSMSL0NDsD']);
    s.appendRow(['exploreBgm', '']);
    s.appendRow(['survivalBgm', '']);
    s.appendRow(['typingBgm', '']);
    s.appendRow(['calcBgm', '']);
    s.appendRow(['randomBgm', '']);
    s.appendRow(['revengeBgm', '']);
    s.appendRow(['activeGrade', '小4']);
    s.appendRow(['activeSubject', '算数']);
    s.appendRow(['activeUnit', '']);
    s.appendRow(['bannerMessage', 'STUDY QUESTへようこそ！']);
    s.setFrozenRows(1);
  }

  // 9. Users
  if (!masterSs.getSheetByName('Users')) {
    const s = masterSs.insertSheet('Users');
    s.appendRow(['UserID', 'Data', 'LastUpdated']);
    s.setFrozenRows(1);
  }

  // 初期シートの削除
  const defaultSheet = masterSs.getSheetByName('シート1') || masterSs.getSheetByName('Sheet1');
  if (defaultSheet && masterSs.getSheets().length > 1) {
    masterSs.deleteSheet(defaultSheet);
  }
}
