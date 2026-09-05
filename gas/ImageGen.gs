// ==================================================
// ▼▼▼ 設定エリア ▼▼▼
// ==================================================

// 1. GoogleドライブのフォルダID
const DRIVE_FOLDER_ID = '1Fqi8HtaGjKgnGYvHptic9urONhcrMfHR'; 

// 2. Gemini APIキー (テキスト生成のみに使用します)
const GEMINI_API_KEY = 'AIzaSyBxZz1hvEb3nDr7u1s7W8WIMVikxkbnA8k'; 

// 3. 設定
const TARGET_SHEET_NAME = 'Characters';
const TEXT_MODEL_ID = 'gemini-2.5-flash'; 
const GENERATE_COUNT = 30; // 30体固定

// ==================================================
// ▲▲▲ 設定ここまで ▲▲▲
// ==================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('★開発用')
    .addItem('🤖 1. キャラクター自動考案 (テキスト)', 'generateCharactersWithGemini')
    .addSeparator()
    .addItem('👾 2. 画像を一括生成 (かわいいドット絵)', 'generateImageForSelectedRow')
    .addToUi();
}

/**
 * 【機能1】キャラ自動考案 (テキスト生成 - Gemini使用)
 */
function generateCharactersWithGemini() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) {
    Browser.msgBox("エラー", `${TARGET_SHEET_NAME}シートが見つかりません。`, Browser.Buttons.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  let startId = 101;
  let existingNames = "";

  if (lastRow > 1) {
    const lastIdVal = sheet.getRange(lastRow, 1).getValue();
    if (!isNaN(lastIdVal)) startId = Number(lastIdVal) + 1;
    
    const nameRange = sheet.getRange(2, 2, lastRow - 1, 1);
    const nameValues = nameRange.getValues();
    existingNames = nameValues.flat().filter(String).join(", ");
  }

  ss.toast(`キャラ設定を考案中...`, "🤖 テキスト生成", 20);

  // ★プロンプト修正: 補正値を0.05刻みに固定
  const prompt = `
あなたは学習ゲーム「STUDY QUEST」のプランナーです。
以下の「構成表」に厳密に従って、30体分のユニークなキャラクターデータをCSV形式で作成してください。

**【作成条件】**
- 合計作成数: 30体
- ID開始番号: ${startId} から連番
- フォーマット: CSV形式 (ヘッダー行は不要)
- カラム順序: ID, 名前, レア, タイプ, 補正値, 解説, カテゴリ, 画像URL

**【重要：構成表（ノルマ）】**
30体の内訳を以下のように固定してください。必ずこの枚数で作ってください。

1. **レアリティ配分 (計30体)**
   - **UR** : 1体
   - **SSR**: 2体
   - **SR** : 5体
   - **R** : 7体
   - **N** : 15体

2. **タイプ配分 (計30体)**
   - **ATK** : 10体
   - **EXP** : 10体
   - **TIME**: 10体
   - ※レアリティとタイプの組み合わせは、偏りがないよう均等に分散させてください。

**【データ詳細ルール】**
1. **名前**: 文房具、給食、学校設備、行事などを擬人化・モンスター化した名前（既存リスト[${existingNames}]にある名前は使用禁止）。
2. **補正値（最重要）**: レア度に応じて以下の範囲内で、**必ず0.05刻み**の数値（例: 1.10, 1.15, 1.20）を設定してください。**1.36のような端数は禁止です。**
   - **N** : 1.05 ～ 1.25
   - **R** : 1.30 ～ 1.50
   - **SR**: 1.55 ～ 1.75
   - **SSR**: 1.80 ～ 2.00
   - **UR** : 2.10 ～ 2.25
3. **解説**: 20文字以内の面白い説明（半角カンマ禁止）。
4. **カテゴリ**: 文具, 給食, 設備, 行事, その他。
5. **画像URL**: **すべて \`TODO\` と記入してください。**

**【出力例】**
${startId},消しゴムスライム,N,EXP,1.15,こすると増える。,文具,TODO
${startId+1},伝説のカレーパン,SR,ATK,1.60,激辛スパイス攻撃。,給食,TODO

CSVデータのみを出力してください。
`;

  try {
    const responseText = callGeminiTextApi(prompt);
    const cleanCsv = responseText.replace(/```csv/g, '').replace(/```/g, '').trim();
    const newRows = Utilities.parseCsv(cleanCsv);

    if (newRows.length === 0) {
      Browser.msgBox("エラー", "データ生成失敗: 空の応答でした。", Browser.Buttons.OK);
      return;
    }

    if (newRows.length !== GENERATE_COUNT) {
      ss.toast(`警告: 生成数が${newRows.length}件でした（指定は${GENERATE_COUNT}件）`, "⚠️ 数不一致", 5);
    }

    sheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    Browser.msgBox("完了", `${newRows.length}体を追加しました！\n補正値は0.05刻みになっています。`, Browser.Buttons.OK);

  } catch (e) {
    Browser.msgBox("エラー発生", e.toString(), Browser.Buttons.OK);
  }
}

/**
 * 【機能2】画像一括生成 (Pollinations AI使用 - かわいいドット絵・IDファイル名)
 */
function generateImageForSelectedRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TARGET_SHEET_NAME);
  const activeRange = sheet.getActiveRange();
  
  const startRow = activeRange.getRow();
  const numRows = activeRange.getNumRows();

  if (startRow < 2) {
    Browser.msgBox("エラー", "ヘッダー行以外を選択してください。", Browser.Buttons.OK);
    return;
  }
  
  if (!DRIVE_FOLDER_ID) {
    Browser.msgBox("エラー", "DRIVE_FOLDER_ID が設定されていません。", Browser.Buttons.OK);
    return;
  }

  ss.toast(`${numRows}件の画像生成を開始します（かわいいドット絵）`, "👾 開始", 5);

  for (let i = 0; i < numRows; i++) {
    const currentRow = startRow + i;
    
    // IDを取得するために1列目も読み込みます
    const charaId   = sheet.getRange(currentRow, 1).getValue();
    const charaName = sheet.getRange(currentRow, 2).getValue();
    const charaDesc = sheet.getRange(currentRow, 6).getValue();
    const charaCat  = sheet.getRange(currentRow, 7).getValue();
    const currentUrl = sheet.getRange(currentRow, 8).getValue();

    // 既にURLがある、または名前がない場合はスキップ
    if (!charaName || (currentUrl && currentUrl !== 'TODO')) {
      continue;
    }

    ss.toast(`${charaName} (${i+1}/${numRows}) を生成中...`, "👾 生成中", -1);

    // プロンプト：かわいいドット絵モンスター
    const prompt = `cute chibi monster, 8-bit pixel art, retro game sprite, kawaii mascot, ${charaName}, ${charaCat}, ${charaDesc}, low resolution dot pict, NES style, simple, white background, full body, isolated, no text`;
    
    try {
      const blob = callPollinationsApi(prompt);
      
      if (blob) {
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        
        // ファイル名にIDを含める (例: chara_101_消しゴムスライム.png)
        const fileName = `chara_${charaId}_${charaName}.png`;
        
        const file = folder.createFile(blob).setName(fileName);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        const fileId = file.getId();
        const driveUrl = `https://drive.google.com/file/d/${fileId}/view?usp=drive_link`;
        sheet.getRange(currentRow, 8).setValue(driveUrl);
      }
      
      Utilities.sleep(1500);

    } catch (e) {
      console.error(`Error generating ${charaName}: ${e.message}`);
      sheet.getRange(currentRow, 8).setNote(`生成エラー: ${e.toString()}`);
    }
  }
  
  ss.toast("すべての処理が完了しました！", "✅ 完了", 5);
}

// ▼ API通信部 ▼

// 1. テキスト生成 (Gemini)
function callGeminiTextApi(promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    "contents": [{ "parts": [{ "text": promptText }] }],
    "generationConfig": { "temperature": 0.9 }
  };
  const options = {
    'method': 'post', 'contentType': 'application/json',
    'payload': JSON.stringify(payload), 'muteHttpExceptions': true
  };
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  
  if (json.error) throw new Error(`Text API Error: ${json.error.message}`);
  return json.candidates[0].content.parts[0].text;
}

// 2. 画像生成 (Pollinations.ai)
function callPollinationsApi(promptText) {
  const encodedPrompt = encodeURIComponent(promptText);
  const seed = Math.floor(Math.random() * 100000);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&nologo=true&seed=${seed}`;
  
  const options = {
    'method': 'get',
    'muteHttpExceptions': true
  };

  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();

      if (code === 200) {
        return response.getBlob();
      } else {
        throw new Error(`Status ${code}`);
      }

    } catch (e) {
      console.warn(`Attempt ${attempt} failed: ${e.message}`);
      if (attempt === maxRetries) {
        throw new Error(`API Error after ${maxRetries} attempts: ${e.message}`);
      }
      Utilities.sleep(2000 * attempt);
    }
  }
}
