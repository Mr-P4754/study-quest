// ============================================================================
// STUDY QUEST RPG - Question_Generator.gs
// Gemini 3.8 Flash 最適化版（実シート完全整合・10文字以内正規化・自己修復ヘッダー）
// ============================================================================

const GEMINI_MODEL = 'gemini-3.8-flash';

const QUESTION_HEADERS = [
  'ID', '学年', '単元', '教科', '問題文', '正解', '誤答1', '誤答2', '誤答3', '解説', '有効'
];

const TYPING_HEADERS = [
  'ID', '学年', '単元/ジャンル', '教科', '日本語', 'ローマ字', '有効'
];

function getGeminiApiKey() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
}

function getMasterApiUrl() {
  return PropertiesService.getScriptProperties().getProperty('MASTER_API_URL') || '';
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🤖 AI問題生成')
    .addItem('📝 開いている教科の4択問題を生成して追記', 'generateQuestionsDialog')
    .addItem('⌨️ タイピング問題を生成して追記', 'generateTypingDialog')
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
 * 4択問題生成（開いているシート名から教科を自動取得）
 */
function generateQuestionsDialog() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const subjectName = sheet.getName().trim();

  // 作問対象外シートのガード
  const ignoreSheets = ['タイピング', 'ファイル設定', 'Users', 'Config', 'ログ'];
  if (ignoreSheets.includes(subjectName)) {
    ui.alert(
      'シート選択エラー',
      `「${subjectName}」シートでは4択問題を生成できません。\n問題を追加したい教科シート（国語、算数、数学、理科、社会、英語、情報等）を開いた状態で実行してください。`,
      ui.ButtonSet.OK
    );
    return;
  }

  const defaultGrade = resolveGradeCodeFromSpreadsheet(ss);

  // 1. 単元名入力
  const unitPrompt = ui.prompt(
    '1/3: 単元・テーマ入力',
    `【対象学年: ${defaultGrade} ／ 対象教科: ${subjectName}】\n単元名または教材名を入力してください。\n※教科書会社固有の名称も、学習指導要領準拠の【10文字以内】の単元名に自動整理されます。\n(例: 白いぼうし、てこのはたらき、直方体と立方体の体積、江戸幕府の成立と大名):`,
    ui.ButtonSet.OK_CANCEL
  );
  if (unitPrompt.getSelectedButton() !== ui.Button.OK) return;
  const rawUnitName = unitPrompt.getResponseText().trim();
  if (!rawUnitName) return;

  // 2. 問題の微調整指示
  const instructionPrompt = ui.prompt(
    '2/3: 問題の微調整指示（任意）',
    `【${subjectName}】の出題傾向や難易度、ひっかけ等の指示があれば入力してください（空欄可）。\n(例: 計算ミスを誘う選択肢を含める / グラフの読み取りを中心にする / 基本8割・応用2割):`,
    ui.ButtonSet.OK_CANCEL
  );
  if (instructionPrompt.getSelectedButton() !== ui.Button.OK) return;
  const userCustomInstruction = instructionPrompt.getResponseText().trim();

  // 3. 生成問題数
  const countPrompt = ui.prompt('3/3: 問題数', '生成する問題数を入力してください (例: 5〜20):', ui.ButtonSet.OK_CANCEL);
  if (countPrompt.getSelectedButton() !== ui.Button.OK) return;
  const count = parseInt(countPrompt.getResponseText().trim(), 10) || 5;

  ss.toast(`【${subjectName}】の問題を Gemini 3.8 Flash で生成中...`, '🤖 AI生成中', -1);

  // ヘッダー整合性検証および自己修復
  ensureValidHeaders(sheet, QUESTION_HEADERS);

  const systemInstruction = `あなたは文部科学省の学習指導要領を熟知した教育コンテンツ監修者であり、小中高生向け学習RPG「STUDY QUEST」の作問AIです。
指定された【教科】の内容範囲から決して逸脱せず、良質な4択クイズを作成してください。

【重要な任務】
1. [単元名の正規化と文字数制限（全角10文字以内厳守）]:
   入力された単元名や教材名から、学習指導要領に準拠した正式かつ中立的な単元名を決定してください。
   ★【文字数制限】: スマホ画面のセレクトボックス幅に収めるため、単元名は「必ず全角10文字以内（空白・記号含む）」で簡潔にまとめてください。
   ・NG例: 物語の読み取り（場面と登場人物）[17文字]、直方体と立方体の体積の求め方[16文字]
   ・OK例: 物語の読み取り[7文字]、場面と心情[5文字]、てこの規則性[6文字]、立体の体積[5文字]、ごみと環境[5文字]、江戸幕府の成立[7文字]

2. [Flashモデル向けの作問品質担保]:
   - 4択（正解1、誤答3）は同程度の文字数・文体にすること（正解だけが長くなる現象を防止）。
   - 誤答1〜3は、児童生徒が実際につまずきやすい誤解や計算ミス、混同しやすい用語を論理的に配置すること。
   - 解説は30〜70文字程度で簡潔かつ明快に記述すること。
   - ゲームの戦闘画面表示のため、問題文は1〜3行（最大90文字以内）で簡潔にすること。`;

  const userPrompt = `
【学年】: ${defaultGrade}
【対象教科（厳守）】: ${subjectName}
【入力された単元/テーマ】: ${rawUnitName}
【追加指示・微調整】: ${userCustomInstruction || '特になし（学年の標準的難易度）'}
【問題数】: ${count}問

上記条件に合致する良問を厳密に${count}問作成し、学習指導要領準拠の単元名（10文字以内）とともに指定のJSONスキーマで返してください。
`;

  const jsonSchema = {
    type: "OBJECT",
    properties: {
      output_unit_name: {
        type: "STRING",
        description: "学習指導要領に準拠した正式単元名。【必ず全角10文字以内】（例：物語の読み取り、てこの規則性、立体の体積、江戸幕府の成立）"
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

  try {
    const resultObj = callGeminiApi(systemInstruction, userPrompt, jsonSchema);
    const finalizedUnitName = resultObj.output_unit_name || rawUnitName;
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

    ss.toast(`✅ ${subjectName} に ${rowsToInsert.length}問を追加しました`, '完了', 4);

    const confirmBuild = ui.alert(
      '問題追加完了',
      `教科: 【${subjectName}】\n単元名: 【${finalizedUnitName}】\n${rowsToInsert.length}問 を追加しました。\n\n今すぐゲーム本番（SQ_Master）へ反映しますか？`,
      ui.ButtonSet.YES_NO
    );

    if (confirmBuild === ui.Button.YES) {
      triggerRemoteBuild();
    }

  } catch (err) {
    Logger.log(err.stack);
    ui.alert('生成失敗', `エラーが発生しました:\n${err.message}`, ui.ButtonSet.OK);
  }
}

/**
 * タイピング問題生成（「タイピング」シート専用）
 */
function generateTypingDialog() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  if (sheet.getName() !== 'タイピング') {
    ui.alert('「タイピング」シートを開いた状態で実行してください。');
    return;
  }

  const defaultGrade = resolveGradeCodeFromSpreadsheet(ss);

  const themePrompt = ui.prompt('タイピング問題生成', 'テーマまたは単元を入力してください (例: 都道府県庁所在地、理科の実験器具、歴史人物):', ui.ButtonSet.OK_CANCEL);
  if (themePrompt.getSelectedButton() !== ui.Button.OK) return;
  const theme = themePrompt.getResponseText().trim();
  if (!theme) return;

  const countPrompt = ui.prompt('単語数', '何単語生成しますか？ (例: 10〜30):', ui.ButtonSet.OK_CANCEL);
  if (countPrompt.getSelectedButton() !== ui.Button.OK) return;
  const count = parseInt(countPrompt.getResponseText().trim(), 10) || 10;

  ss.toast('タイピング単語を生成中...', '🤖 AI生成中', -1);

  // ヘッダー整合性検証および自己修復
  ensureValidHeaders(sheet, TYPING_HEADERS);

  const systemInstruction = `タイピングゲームの単語データ生成AIです。
テーマに沿った学習単語（日本語表記）と、その正確な標準ヘボン式ローマ字（すべて半角英小文字・スペースや記号なし）のペアを生成してください。`;

  const userPrompt = `
【学年】: ${defaultGrade}
【テーマ】: ${theme}
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

  try {
    const res = callGeminiApi(systemInstruction, userPrompt, jsonSchema);
    const items = res.items || [];
    if (items.length === 0) throw new Error('データが空でした。');

    const timeBase = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
    const rows = items.map((it, idx) => {
      const padNum = ('00' + (idx + 1)).slice(-2);
      return [
        `t_${timeBase}_${padNum}`,
        defaultGrade,
        theme,
        'タイピング',
        it.japanese,
        String(it.romaji).toLowerCase().replace(/[^a-z]/g, ''),
        'TRUE'
      ];
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
    ss.toast(`✅ タイピング単語 ${rows.length}件を追加`, '完了', 4);

    if (ui.alert('完了', `${rows.length}件追加しました。\n今すぐゲーム本番（SQ_Master）へ反映しますか？`, ui.ButtonSet.YES_NO) === ui.Button.YES) {
      triggerRemoteBuild();
    }
  } catch (err) {
    ui.alert('エラー', err.message, ui.ButtonSet.OK);
  }
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
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterUrl = getMasterApiUrl();

  if (!masterUrl) {
    ui.alert('エラー', 'MASTER_API_URL が設定されていません。スクリプトプロパティを確認してください。', ui.ButtonSet.OK);
    return;
  }

  ss.toast('SQ_Master にデータ集約ビルドを要求中...', '🚀 リモートビルド実行中', -1);

  try {
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
      ss.toast('✅ ゲーム反映完了！', 'ビルド成功', 5);
      ui.alert(
        '🚀 反映完了！',
        `全学年データの集約ビルドが正常に完了しました！\n\n・通常問題総数: ${json.qCount}問\n・タイピング総数: ${json.tCount}問\n・更新日時: ${json.updatedAt}\n\nゲーム（study_quest_data.json）へ即座に反映されました。`,
        ui.ButtonSet.OK
      );
    } else {
      throw new Error(json.message || 'ビルド応答エラー');
    }
  } catch (e) {
    ui.alert('ビルド要求失敗', `SQ_Master との通信に失敗しました:\n${e.message}\n\n※SQ_Master側の Code.gs に action === 'build' が追記され、新バージョンでデプロイされているか確認してください。`, ui.ButtonSet.OK);
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
