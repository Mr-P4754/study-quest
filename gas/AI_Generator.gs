function doGet() {
  // シートのデータを自動でJSON形式に変換して配信するスクリプト
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  
  const sheets = ss.getSheets();
  sheets.forEach(sheet => {
    const name = sheet.getName();
    const data = sheet.getDataRange().getValues();
    
    // データがない、またはヘッダーしかない場合はスキップ
    if (data.length < 2) return;

    const headers = data[0]; // 1行目をヘッダー名として取得
    const body = data.slice(1); // 2行目以降をデータ本体として取得
    
    // ヘッダー名をキーにしてデータを紐付け（列が増えても自動対応）
    const list = body.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        // 空欄は空文字として処理
        obj[header] = (row[index] === "" || row[index] === undefined) ? "" : row[index];
      });
      return obj;
    });

    // シート名を小文字にして格納 (例: Questions → result.questions)
    result[name.toLowerCase()] = list;
  });

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
