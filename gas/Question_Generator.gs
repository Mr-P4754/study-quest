// ============================================================================
// STUDY QUEST RPG - Question_Generator.gs
// Gemini 3.8 Flash 最適化版（単元プルダウン選択・微調整自由記述・自己修復ヘッダー）
// ============================================================================

const GEMINI_MODEL = 'gemini-3.8-flash';

const QUESTION_HEADERS = [
  'ID', '学年', '単元', '教科', '問題文', '正解', '誤答1', '誤答2', '誤答3', '解説', '有効'
];

const TYPING_HEADERS = [
  'ID', '学年', '単元/ジャンル', '教科', '日本語', 'ローマ字', '有効'
];

/**
 * 文部科学省学習指導要領準拠 標準単元マスター（全角10文字以内・表記ゆれ防止用）
 */
const STANDARD_UNITS = {
  '国語': [
    '物語の読解', '説明文の読解', '場面と心情', '要約と要点', '詩・短歌・俳句',
    '漢字の成り立ち', '敬語と言葉遣い', '古典・漢文', '言葉のきまり', '論説文の読解'
  ],
  '算数': [
    '一億をこえる数', '大きな数', 'たし算とひき算', 'かけ算とわり算', '小数の計算',
    '分数の計算', '図形と角度', '面積と体積', '直方体と立方体', '比と割合',
    '速さと時間', '角の大きさ', '折れ線グラフ', 'データの整理'
  ],
  '数学': [
    '正負の数', '文字と式', '一次方程式', '連立方程式', '一次関数',
    '平行と合同', '三角形と四角形', '相似な図形', '円周角の定理', '三平方の定理',
    '二次方程式', '二次関数', '確率と標本調査', '数と式', '集合と命題',
    '図形と計量', 'データの分析', '場合の数と確率'
  ],
  '理科': [
    '季節と生き物', '人の体のつくり', '天気の変化', '星と月', '空気と水',
    '金属・水・空気', '電気のはたらき', '植物の生活', '動物の分類', '光と音の性質',
    '力の働き', '物質のすがた', '化学変化と原子', '水溶液とイオン', '生命の連続性',
    '運動と力', '地球と宇宙', '自然と人間'
  ],
  '社会': [
    '健康なくらし', '安全なくらし', '地域の発展', '伝統と文化', '47都道府県',
    '日本の農林水産業', '日本の工業・情報', '世界の地理と生活', '日本の地理と気候',
    '古代から近世', '江戸幕府の成立', '近代の日本', '現代の日本と世界',
    '日本国憲法と政治', '現代の経済', '国際社会と平和'
  ],
  '英語': [
    'be動詞と一般動詞', '助動詞の用法', '進行形と過去形', '未来を表す表現',
    '比較と最上級', '不定詞と動名詞', '受動態の文', '現在完了形',
    '関係代名詞', '会話表現と挨拶', '基本語彙と熟語'
  ],
  '情報': [
    '情報社会とマナー', '情報デザイン', 'デジタルデータ', 'コンピュータの構成',
    'ネットワークと通信', '情報セキュリティ', 'アルゴリズムと処理', 'プログラミング基礎',
    'モデル化とシミュ', 'データ分析とAI'
  ]
};

/**
 * 代表的なタイピングテーマ・ジャンルリスト
 */
const STANDARD_TYPING_THEMES = [
  '47都道府県と県庁', '世界の国名と首都', '歴史人物（日本史）', '歴史人物（世界史）',
  '理科の実験器具', '植物・動物の名称', '基本英単語（中学）', '数学・科学用語',
  '慣用句・四字熟語', 'プログラミング用語', '情報セキュリティ用語'
];

function getGeminiApiKey() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
}

function getMasterApiUrl() {
  return PropertiesService.getScriptProperties().getProperty('MASTER_API_URL') || '';
}

/**
 * スプレッドシート起動時のカスタムメニュー
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🤖 AI問題生成')
    .addItem('📝 開いている教科の4択問題を生成', 'showQuestionGeneratorModal')
    .addItem('⌨️ タイピング問題を生成', 'showTypingGeneratorModal')
    .addSeparator()
    .addItem('🚀 ゲームに即時反映 (リモートビルド)', 'triggerRemoteBuild')
    .addToUi();
}

/**
 * スプレッドシート名から SQ_Master 準拠の学年コードを取得
 */
function resolveGradeCodeFromSpreadsheet(ss) {
  const name = ss.getName();
  if (name.includes('小1')) return '小1';
  if (name.includes('小2')) return '小2';
  if (name.includes('小3')) return '小3';
  if (name.includes('小4')) return '小4';
  if (name.includes('小5')) return '小5';
  if (name.includes('小6')) return '小6';
  if (name.includes('中1') || name.includes('中１')) return '中１';
  if (name.includes('中2') || name.includes('中２')) return '中２';
  if (name.includes('中3') || name.includes('中３')) return '中３';
  if (name.includes('高1')) return '高1';
  if (name.includes('高2')) return '高2';
  if (name.includes('高3')) return '高3';
  return '小4';
}

/**
 * 教科シートから既存の単元名一覧および標準単元を取得（モーダル初期化用）
 */
function getUnitDataForCurrentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const subjectName = sheet.getName().trim();
  const defaultGrade = resolveGradeCodeFromSpreadsheet(ss);

  const ignoreSheets = ['タイピング', 'ファイル設定', 'Users', 'Config', 'ログ'];
  if (ignoreSheets.includes(subjectName)) {
    return {
      error: `「${subjectName}」シートでは4択問題を生成できません。\n問題を追加したい教科シート（国語、算数、数学、理科、社会、英語、情報等）を開いた状態で実行してください。`
    };
  }

  // 1. C列（単元）から既存の単元名を抽出
  const existingUnits = [];
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
    const set = new Set();
    values.forEach(r => {
      const u = (r[0] || '').toString().trim();
      if (u && !set.has(u)) {
        set.add(u);
        existingUnits.push(u);
      }
    });
  }

  // 2. 標準単元マスターから該当教科の候補を取得
  let standardUnits = STANDARD_UNITS[subjectName] || [];
  if (standardUnits.length === 0) {
    // 部分一致で検索（例: "中学数学" → "数学"）
    for (const key of Object.keys(STANDARD_UNITS)) {
      if (subjectName.includes(key) || key.includes(subjectName)) {
        standardUnits = STANDARD_UNITS[key];
        break;
      }
    }
  }

  // 既存単元に含まれていない標準単元を抽出
  const filteredStandard = standardUnits.filter(u => !existingUnits.includes(u));

  return {
    grade: defaultGrade,
    subject: subjectName,
    existingUnits: existingUnits,
    standardUnits: filteredStandard
  };
}

/**
 * 4択問題生成モーダルダイアログの表示
 */
function showQuestionGeneratorModal() {
  const ui = SpreadsheetApp.getUi();
  const data = getUnitDataForCurrentSheet();
  if (data.error) {
    ui.alert('シート選択エラー', data.error, ui.ButtonSet.OK);
    return;
  }

  const html = getQuestionGeneratorHtml(data);
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(580)
    .setHeight(620);
  ui.showModalDialog(htmlOutput, `🤖 AI問題生成 - 【${data.grade} ${data.subject}】`);
}

/**
 * 4択問題生成の実行（モーダル内のクライアント側から呼び出し）
 */
function executeGenerateQuestions(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const subjectName = sheet.getName().trim();
  const defaultGrade = resolveGradeCodeFromSpreadsheet(ss);

  let selectedUnit = (params.unit || '').trim();
  const isCustomUnit = params.isCustomUnit;
  const customInstruction = (params.customInstruction || '').trim();
  const count = parseInt(params.count, 10) || 5;

  if (!selectedUnit) {
    throw new Error('単元名が指定されていません。');
  }

  // ヘッダー整合性検証および自己修復
  ensureValidHeaders(sheet, QUESTION_HEADERS);

  const systemInstruction = `あなたは文部科学省の学習指導要領を熟知した教育コンテンツ監修者であり、小中高生向け学習RPG「STUDY QUEST」の作問AIです。
指定された【教科】の内容範囲から決して逸脱せず、良質な4択クイズを作成してください。

【重要な任務】
1. [単元名の決定（全角10文字以内厳守）]:
   ${isCustomUnit ? 
     '入力された単元名を学習指導要領に準拠した正式な名称に整え、【必ず全角10文字以内】で決定してください。' : 
     `単元名は指定された【${selectedUnit}】をそのまま確定名称とし、変更しないでください。`
   }
   ★スマホ画面のセレクトボックス幅に収めるため、単元名は「必ず全角10文字以内（空白・記号含む）」である必要があります。

2. [Flashモデル向けの作問品質担保]:
   - 4択（正解1、誤答3）は同程度の文字数・文体にすること（正解だけが長くなる現象を防止）。
   - 誤答1〜3は、児童生徒が実際につまずきやすい誤解や計算ミス、混同しやすい用語を論理的に配置すること。
   - 解説は30〜70文字程度で簡潔かつ明快に記述すること。
   - ゲームの戦闘画面表示のため、問題文は1〜3行（最大90文字以内）で簡潔にすること。`;

  const userPrompt = `
【学年】: ${defaultGrade}
【対象教科（厳守）】: ${subjectName}
【出題単元】: ${selectedUnit}
【微調整指示（自由記述）】: ${customInstruction || '特になし（学年の標準的難易度）'}
【問題数】: ${count}問

上記条件に合致する良問を厳密に${count}問作成し、単元名とともに指定のJSONスキーマで返してください。
`;

  const jsonSchema = {
    type: "OBJECT",
    properties: {
      output_unit_name: {
        type: "STRING",
        description: "学習指導要領準拠の単元名。【必ず全角10文字以内】"
      },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question: { type: "STRING", description: "簡潔で分かりやすい問題文（90文字以内）" },
            answer: { type: "STRING", description: "正解の選択肢" },
            wrong1: { type: "STRING", description: "つまずきやすい誤答1" },
            wrong2: { type: "STRING", description: "つまずきやすい誤答2" },
            wrong3: { type: "STRING", description: "つまずきやすい誤答3" },
            explain: { type: "STRING", description: "30〜70文字の明快な解説" }
          },
          required: ["question", "answer", "wrong1", "wrong2", "wrong3", "explain"]
        }
      }
    },
    required: ["output_unit_name", "items"]
  };

  const resultObj = callGeminiApi(systemInstruction, userPrompt, jsonSchema);
  // プルダウンから選んだ場合はその文字列を最優先で確定（表記ゆれゼロ保証）
  const finalizedUnitName = isCustomUnit ? (resultObj.output_unit_name || selectedUnit).slice(0, 10) : selectedUnit;
  const questions = resultObj.items || [];

  if (questions.length === 0) throw new Error('生成された問題が0件でした。');

  // 実データ整合タイムスタンプID採番 (例: q_260905_220000_01)
  const timeBase = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyMMdd_HHmmss');
  const rowsToInsert = questions.map((item, idx) => {
    const padNum = ('00' + (idx + 1)).slice(-2);
    return [
      `q_${timeBase}_${padNum}`,
      defaultGrade,
      finalizedUnitName,
      subjectName,
      item.question,
      String(item.answer),
      String(item.wrong1),
      String(item.wrong2),
      String(item.wrong3),
      item.explain,
      'TRUE'
    ];
  });

  const targetRow = sheet.getLastRow() + 1;
  sheet.getRange(targetRow, 1, rowsToInsert.length, 11).setValues(rowsToInsert);

  return {
    success: true,
    addedCount: rowsToInsert.length,
    unitName: finalizedUnitName,
    subjectName: subjectName,
    grade: defaultGrade
  };
}

/**
 * タイピングシートから既存のテーマ一覧を取得（モーダル初期化用）
 */
function getTypingDataForCurrentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const defaultGrade = resolveGradeCodeFromSpreadsheet(ss);

  if (sheet.getName() !== 'タイピング') {
    return {
      error: '「タイピング」シートを開いた状態で実行してください。'
    };
  }

  // C列（単元/ジャンル）から既存テーマを抽出
  const existingThemes = [];
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
    const set = new Set();
    values.forEach(r => {
      const t = (r[0] || '').toString().trim();
      if (t && !set.has(t)) {
        set.add(t);
        existingThemes.push(t);
      }
    });
  }

  const filteredStandard = STANDARD_TYPING_THEMES.filter(t => !existingThemes.includes(t));

  return {
    grade: defaultGrade,
    existingThemes: existingThemes,
    standardThemes: filteredStandard
  };
}

/**
 * タイピング問題生成モーダルダイアログの表示
 */
function showTypingGeneratorModal() {
  const ui = SpreadsheetApp.getUi();
  const data = getTypingDataForCurrentSheet();
  if (data.error) {
    ui.alert('シート選択エラー', data.error, ui.ButtonSet.OK);
    return;
  }

  const html = getTypingGeneratorHtml(data);
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(580)
    .setHeight(600);
  ui.showModalDialog(htmlOutput, `⌨️ タイピング問題生成 - 【${data.grade}】`);
}

/**
 * タイピング問題生成の実行（モーダル内のクライアント側から呼び出し）
 */
function executeGenerateTyping(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const defaultGrade = resolveGradeCodeFromSpreadsheet(ss);

  let selectedTheme = (params.theme || '').trim();
  const isCustomTheme = params.isCustomTheme;
  const customInstruction = (params.customInstruction || '').trim();
  const count = parseInt(params.count, 10) || 10;

  if (!selectedTheme) {
    throw new Error('テーマが指定されていません。');
  }

  // ヘッダー整合性検証および自己修復
  ensureValidHeaders(sheet, TYPING_HEADERS);

  const systemInstruction = `タイピングゲームの単語データ生成AIです。
指定されたテーマに沿った学習単語（日本語表記）と、その正確な標準ヘボン式ローマ字（すべて半角英小文字・スペースや記号なし）のペアを生成してください。`;

  const userPrompt = `
【学年】: ${defaultGrade}
【テーマ】: ${selectedTheme}
【微調整指示（自由記述）】: ${customInstruction || '特になし'}
【単語数】: ${count}件
`;

  const jsonSchema = {
    type: "OBJECT",
    properties: {
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            japanese: { type: "STRING", description: "表示する日本語（漢字・ひらがな等）" },
            romaji: { type: "STRING", description: "すべて英小文字のローマ字（例: tokyo, odanobunaga）" }
          },
          required: ["japanese", "romaji"]
        }
      }
    },
    required: ["items"]
  };

  const res = callGeminiApi(systemInstruction, userPrompt, jsonSchema);
  const items = res.items || [];
  if (items.length === 0) throw new Error('データが空でした。');

  const timeBase = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
  const rows = items.map((it, idx) => {
    const padNum = ('00' + (idx + 1)).slice(-2);
    return [
      `t_${timeBase}_${padNum}`,
      defaultGrade,
      selectedTheme,
      'タイピング',
      it.japanese,
      String(it.romaji).toLowerCase().replace(/[^a-z]/g, ''),
      'TRUE'
    ];
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);

  return {
    success: true,
    addedCount: rows.length,
    theme: selectedTheme,
    grade: defaultGrade
  };
}

/**
 * ヘッダーの整合性チェックと自動修復
 * （未登録シートでヘッダーが未設定・破損している場合の安全ガード）
 */
function ensureValidHeaders(sheet, expectedHeaders) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  let needsReset = false;
  if (lastRow === 0 || lastCol < expectedHeaders.length) {
    needsReset = true;
  } else {
    const currentFirstRow = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
    if (currentFirstRow[0] !== expectedHeaders[0] || currentFirstRow[1] !== expectedHeaders[1]) {
      needsReset = true;
    }
  }

  if (needsReset) {
    if (lastRow === 11 && lastCol === 1) {
      // 縦並びヘッダーのクリーンアップ
      sheet.clear();
    }
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.setFrozenRows(1);
  }
}

/**
 * リモートビルド実行（SQ_Masterへ集約要求を送信）
 */
function triggerRemoteBuild() {
  const masterUrl = getMasterApiUrl();

  if (!masterUrl) {
    throw new Error('MASTER_API_URL が設定されていません。「プロジェクトの設定」のスクリプトプロパティを確認してください。');
  }

  const payload = { action: 'build' };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(masterUrl, options);
  const json = JSON.parse(response.getContentText());

  if (json.status === 'success') {
    return json;
  } else {
    throw new Error(json.message || 'ビルド応答エラー');
  }
}

/**
 * メニューから直接リモートビルドを実行した際のラッパー
 */
function manualTriggerRemoteBuild() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('ビルド実行', '親マスター（SQ_Master）へデータ集約を要求します。', ui.ButtonSet.OK);
  try {
    const json = triggerRemoteBuild();
    ui.alert(
      '🚀 反映完了！',
      `全学年データの集約ビルドが正常に完了しました！\n\n・通常問題総数: ${json.qCount}問\n・タイピング総数: ${json.tCount}問\n・更新日時: ${json.updatedAt}\n\nゲーム（study_quest_data.json）へ即座に反映されました。`,
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('ビルド要求失敗', err.message, ui.ButtonSet.OK);
  }
}

/**
 * Gemini 3.8 Flash API 呼出
 */
function callGeminiApi(systemInstruction, userPrompt, responseSchema) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません。「プロジェクトの設定」のスクリプトプロパティに登録してください。');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.6
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const text = res.getContentText();

  if (code !== 200) {
    throw new Error(`Gemini API Error (HTTP ${code}): ${text}`);
  }

  const data = JSON.parse(text);
  const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) throw new Error('APIの応答テキストが空でした。');

  return JSON.parse(jsonText);
}

// ============================================================================
// HTMLモーダルダイアログ テンプレート
// ============================================================================

/**
 * 4択問題生成モーダル HTML
 */
function getQuestionGeneratorHtml(data) {
  const existingOptions = data.existingUnits.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');
  const standardOptions = data.standardUnits.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-main: #f8fafc;
      --text-sub: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --accent: #10b981;
      --danger: #ef4444;
      --input-bg: #0f172a;
      --input-border: #475569;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 16px;
      background: var(--bg-color);
      color: var(--text-main);
      font-size: 13px;
      line-height: 1.5;
    }
    .badge-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      background: #1e3a8a;
      color: #93c5fd;
      border: 1px solid #3b82f6;
    }
    .badge.subject {
      background: #064e3b;
      color: #6ee7b7;
      border-color: #10b981;
    }
    .form-group {
      margin-bottom: 14px;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: #e2e8f0;
      font-size: 12px;
    }
    .hint {
      font-size: 11px;
      color: var(--text-sub);
      margin-top: 4px;
    }
    select, input[type="text"], textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 12px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      color: var(--text-main);
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    select:focus, input[type="text"]:focus, textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }
    textarea {
      resize: vertical;
      min-height: 64px;
    }
    .new-unit-box {
      display: none;
      margin-top: 8px;
      padding: 10px;
      background: rgba(59, 130, 246, 0.08);
      border: 1px dashed #3b82f6;
      border-radius: 6px;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 18px;
    }
    button {
      flex: 1;
      padding: 11px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      border: none;
      transition: background 0.2s, transform 0.1s;
    }
    button:active {
      transform: scale(0.98);
    }
    .btn-primary {
      background: var(--primary);
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #334155;
      color: #cbd5e1;
      flex: 0 0 80px;
    }
    .btn-secondary:hover {
      background: #475569;
    }

    /* ローディング & 完了オーバーレイ */
    .overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.95);
      z-index: 100;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #334155;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .overlay-title {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .overlay-sub {
      font-size: 12px;
      color: var(--text-sub);
      max-width: 400px;
      line-height: 1.6;
    }
    .result-box {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      width: 100%;
      max-width: 420px;
      text-align: left;
    }
  </style>
</head>
<body>

  <div class="badge-bar">
    <span class="badge">学年: ${escapeHtml(data.grade)}</span>
    <span class="badge subject">教科: ${escapeHtml(data.subject)}</span>
  </div>

  <div id="formContainer">
    <!-- 単元プルダウン選択 -->
    <div class="form-group">
      <label for="unitSelect">単元名（表記ゆれ防止のためプルダウンから選択）</label>
      <select id="unitSelect" onchange="handleUnitChange()">
        <option value="" disabled selected>-- 単元を選択してください --</option>
        ${existingOptions ? `<optgroup label="📂 このシートで既に使用されている単元">${existingOptions}</optgroup>` : ''}
        ${standardOptions ? `<optgroup label="📚 学習指導要領・標準単元候補">${standardOptions}</optgroup>` : ''}
        <optgroup label="✏️ 新規登録">
          <option value="__CUSTOM__">＋ 新しい単元を直接入力する...</option>
        </optgroup>
      </select>
      
      <div id="newUnitBox" class="new-unit-box">
        <label for="customUnitInput" style="font-size: 11px; color: #93c5fd;">新規単元名（全角10文字以内）</label>
        <input type="text" id="customUnitInput" maxlength="10" placeholder="例: てこの規則性、立体の体積">
        <div class="hint">※ゲーム画面のセレクトボックス幅に合わせ、必ず【10文字以内】で入力してください。</div>
      </div>
    </div>

    <!-- 内容の微調整（自由記述テキストエリア） -->
    <div class="form-group">
      <label for="customInstruction">内容の微調整指示（テキスト自由記述・空欄可）</label>
      <textarea id="customInstruction" placeholder="出題傾向や難易度、ひっかけ等の指示があれば自由に入力してください。&#10;(例: 計算ミスを誘う選択肢を含める / グラフの読み取りを中心にする / 基礎8割・応用2割)"></textarea>
      <div class="hint">※空欄の場合は、学年の標準的な学習指導要領難易度でバランスよく作問されます。</div>
    </div>

    <!-- 生成問題数 -->
    <div class="form-group">
      <label for="questionCount">生成する問題数</label>
      <select id="questionCount">
        <option value="5" selected>5問 （推奨・すばやく追加）</option>
        <option value="10">10問 （1単元の基本セット）</option>
        <option value="15">15問 （充実セット）</option>
        <option value="20">20問 （大ボリューム）</option>
      </select>
    </div>

    <!-- アクションボタン -->
    <div class="actions">
      <button class="btn-secondary" onclick="google.script.host.close()">閉じる</button>
      <button id="submitBtn" class="btn-primary" onclick="submitGenerate()">✨ AI問題を生成して追記</button>
    </div>
  </div>

  <!-- ローディングオーバーレイ -->
  <div id="loadingOverlay" class="overlay">
    <div class="spinner"></div>
    <div class="overlay-title">Gemini 3.8 Flash で作問中...</div>
    <div class="overlay-sub">文部科学省の指導要領に準拠し、思考力を問う4択問題・つまずきやすい誤答・解説を作成しています。数十秒ほどお待ちください。</div>
  </div>

  <!-- 完了オーバーレイ -->
  <div id="successOverlay" class="overlay">
    <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
    <div class="overlay-title" id="successTitle">問題の追加が完了しました！</div>
    <div class="result-box" id="resultDetails"></div>
    <div class="actions" style="width: 100%; max-width: 420px;">
      <button class="btn-secondary" onclick="google.script.host.close()">閉じる</button>
      <button id="buildBtn" class="btn-primary" style="background: var(--accent);" onclick="submitRemoteBuild()">🚀 ゲームに即時反映 (SQ_Master)</button>
    </div>
  </div>

  <script>
    function handleUnitChange() {
      const select = document.getElementById('unitSelect');
      const box = document.getElementById('newUnitBox');
      if (select.value === '__CUSTOM__') {
        box.style.display = 'block';
        document.getElementById('customUnitInput').focus();
      } else {
        box.style.display = 'none';
      }
    }

    function submitGenerate() {
      const select = document.getElementById('unitSelect');
      let unit = select.value;
      const isCustom = (unit === '__CUSTOM__');

      if (!unit) {
        alert('単元名を選択してください。');
        return;
      }

      if (isCustom) {
        unit = document.getElementById('customUnitInput').value.trim();
        if (!unit) {
          alert('新規単元名を入力してください。');
          return;
        }
        if (unit.length > 10) {
          alert('単元名は全角10文字以内で入力してください（現在: ' + unit.length + '文字）。');
          return;
        }
      }

      const customInstruction = document.getElementById('customInstruction').value.trim();
      const count = document.getElementById('questionCount').value;

      document.getElementById('loadingOverlay').style.display = 'flex';

      google.script.run
        .withSuccessHandler(onGenerateSuccess)
        .withFailureHandler(onGenerateError)
        .executeGenerateQuestions({
          unit: unit,
          isCustomUnit: isCustom,
          customInstruction: customInstruction,
          count: count
        });
    }

    function onGenerateSuccess(res) {
      document.getElementById('loadingOverlay').style.display = 'none';
      const details = document.getElementById('resultDetails');
      details.innerHTML = 
        '<div><strong>教科:</strong> ' + escapeHtml(res.subjectName) + '</div>' +
        '<div><strong>単元:</strong> ' + escapeHtml(res.unitName) + '</div>' +
        '<div><strong>追加問題数:</strong> ' + res.addedCount + '問</div>' +
        '<div style="margin-top: 6px; color: #10b981; font-size: 11px;">✅ シートの末尾に正常に書き込まれました。</div>';
      document.getElementById('successOverlay').style.display = 'flex';
    }

    function onGenerateError(err) {
      document.getElementById('loadingOverlay').style.display = 'none';
      alert('生成エラー:\\n' + (err.message || err));
    }

    function submitRemoteBuild() {
      const btn = document.getElementById('buildBtn');
      btn.disabled = true;
      btn.textContent = '🚀 反映処理中...';

      google.script.run
        .withSuccessHandler(function(res) {
          alert('🚀 反映完了！\\n全学年データの集約ビルドが正常に完了しました！\\n\\n通常問題総数: ' + res.qCount + '問\\nタイピング総数: ' + res.tCount + '問\\n更新日時: ' + res.updatedAt + '\\n\\nゲーム（study_quest_data.json）へ即座に反映されました。');
          google.script.host.close();
        })
        .withFailureHandler(function(err) {
          btn.disabled = false;
          btn.textContent = '🚀 ゲームに即時反映 (再試行)';
          alert('リモートビルド失敗:\\n' + (err.message || err));
        })
        .triggerRemoteBuild();
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  </script>
</body>
</html>`;
}

/**
 * タイピング問題生成モーダル HTML
 */
function getTypingGeneratorHtml(data) {
  const existingOptions = data.existingThemes.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  const standardOptions = data.standardThemes.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-main: #f8fafc;
      --text-sub: #94a3b8;
      --primary: #8b5cf6;
      --primary-hover: #7c3aed;
      --accent: #10b981;
      --input-bg: #0f172a;
      --input-border: #475569;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 16px;
      background: var(--bg-color);
      color: var(--text-main);
      font-size: 13px;
      line-height: 1.5;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      background: #4c1d95;
      color: #c4b5fd;
      border: 1px solid #8b5cf6;
      margin-bottom: 12px;
    }
    .form-group {
      margin-bottom: 14px;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: #e2e8f0;
      font-size: 12px;
    }
    .hint {
      font-size: 11px;
      color: var(--text-sub);
      margin-top: 4px;
    }
    select, input[type="text"], textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 12px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      color: var(--text-main);
      font-size: 13px;
      outline: none;
    }
    select:focus, input[type="text"]:focus, textarea:focus {
      border-color: var(--primary);
    }
    textarea {
      resize: vertical;
      min-height: 60px;
    }
    .new-theme-box {
      display: none;
      margin-top: 8px;
      padding: 10px;
      background: rgba(139, 92, 246, 0.08);
      border: 1px dashed #8b5cf6;
      border-radius: 6px;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 18px;
    }
    button {
      flex: 1;
      padding: 11px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      border: none;
    }
    .btn-primary {
      background: var(--primary);
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover);
    }
    .btn-secondary {
      background: #334155;
      color: #cbd5e1;
      flex: 0 0 80px;
    }
    .overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.95);
      z-index: 100;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #334155;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="badge">学年: ${escapeHtml(data.grade)} ／ 教科: タイピング</div>

  <div id="formContainer">
    <div class="form-group">
      <label for="themeSelect">テーマ・単元（プルダウンから選択）</label>
      <select id="themeSelect" onchange="handleThemeChange()">
        <option value="" disabled selected>-- テーマを選択してください --</option>
        ${existingOptions ? `<optgroup label="📂 このシートで既に使用されているテーマ">${existingOptions}</optgroup>` : ''}
        ${standardOptions ? `<optgroup label="📚 標準テーマ候補">${standardOptions}</optgroup>` : ''}
        <optgroup label="✏️ 新規登録">
          <option value="__CUSTOM__">＋ 新しいテーマを直接入力する...</option>
        </optgroup>
      </select>
      
      <div id="newThemeBox" class="new-theme-box">
        <label for="customThemeInput" style="font-size: 11px; color: #c4b5fd;">新規テーマ名</label>
        <input type="text" id="customThemeInput" placeholder="例: 日本の山地・平野、プログラミング言語">
      </div>
    </div>

    <div class="form-group">
      <label for="customInstruction">内容の微調整指示（自由記述・空欄可）</label>
      <textarea id="customInstruction" placeholder="出題単語の傾向や難易度、除外したい語句等の指示を入力できます (空欄可)"></textarea>
    </div>

    <div class="form-group">
      <label for="wordCount">生成する単語数</label>
      <select id="wordCount">
        <option value="10" selected>10単語 （手軽に追加）</option>
        <option value="20">20単語 （標準セット）</option>
        <option value="30">30単語 （しっかり練習）</option>
      </select>
    </div>

    <div class="actions">
      <button class="btn-secondary" onclick="google.script.host.close()">閉じる</button>
      <button id="submitBtn" class="btn-primary" onclick="submitGenerate()">⌨️ タイピング単語を生成して追記</button>
    </div>
  </div>

  <div id="loadingOverlay" class="overlay">
    <div class="spinner"></div>
    <div style="font-weight: 700; margin-bottom: 8px;">タイピング単語を生成中...</div>
    <div style="color: var(--text-sub); font-size: 12px;">標準ヘボン式ローマ字の照合を行っています。</div>
  </div>

  <div id="successOverlay" class="overlay">
    <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
    <div style="font-weight: 700; margin-bottom: 12px;">タイピング単語を追加しました！</div>
    <div id="resultDetails" style="background: var(--card-bg); padding: 14px; border-radius: 6px; margin-bottom: 16px; text-align: left; width: 100%; max-width: 360px;"></div>
    <div class="actions" style="width: 100%; max-width: 360px;">
      <button class="btn-secondary" onclick="google.script.host.close()">閉じる</button>
      <button id="buildBtn" class="btn-primary" style="background: var(--accent);" onclick="submitRemoteBuild()">🚀 ゲームに即時反映</button>
    </div>
  </div>

  <script>
    function handleThemeChange() {
      const select = document.getElementById('themeSelect');
      const box = document.getElementById('newThemeBox');
      if (select.value === '__CUSTOM__') {
        box.style.display = 'block';
        document.getElementById('customThemeInput').focus();
      } else {
        box.style.display = 'none';
      }
    }

    function submitGenerate() {
      const select = document.getElementById('themeSelect');
      let theme = select.value;
      const isCustom = (theme === '__CUSTOM__');

      if (!theme) {
        alert('テーマを選択してください。');
        return;
      }

      if (isCustom) {
        theme = document.getElementById('customThemeInput').value.trim();
        if (!theme) {
          alert('新規テーマ名を入力してください。');
          return;
        }
      }

      const customInstruction = document.getElementById('customInstruction').value.trim();
      const count = document.getElementById('wordCount').value;

      document.getElementById('loadingOverlay').style.display = 'flex';

      google.script.run
        .withSuccessHandler(function(res) {
          document.getElementById('loadingOverlay').style.display = 'none';
          document.getElementById('resultDetails').innerHTML = 
            '<div><strong>テーマ:</strong> ' + escapeHtml(res.theme) + '</div>' +
            '<div><strong>追加単語数:</strong> ' + res.addedCount + '件</div>';
          document.getElementById('successOverlay').style.display = 'flex';
        })
        .withFailureHandler(function(err) {
          document.getElementById('loadingOverlay').style.display = 'none';
          alert('生成エラー:\\n' + (err.message || err));
        })
        .executeGenerateTyping({
          theme: theme,
          isCustomTheme: isCustom,
          customInstruction: customInstruction,
          count: count
        });
    }

    function submitRemoteBuild() {
      const btn = document.getElementById('buildBtn');
      btn.disabled = true;
      btn.textContent = '🚀 反映処理中...';

      google.script.run
        .withSuccessHandler(function(res) {
          alert('🚀 反映完了！\\n通常問題総数: ' + res.qCount + '問\\nタイピング総数: ' + res.tCount + '問\\n\\nゲームへ即座に反映されました。');
          google.script.host.close();
        })
        .withFailureHandler(function(err) {
          btn.disabled = false;
          btn.textContent = '🚀 ゲームに即時反映 (再試行)';
          alert('リモートビルド失敗:\\n' + (err.message || err));
        })
        .triggerRemoteBuild();
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
