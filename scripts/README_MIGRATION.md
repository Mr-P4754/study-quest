# STUDY QUEST RPG スプレッドシート分離・データ移行ガイド (Ver 3.2 最終確定版)

本ガイドでは、仕様書 Ver 3.2 に基づき、Google ドライブ上に `STUDY_QUEST_DATABASE` 親フォルダおよび全13スプレッドシート（マスター ＋ 小1〜高3学年ファイル）を構築し、データを移行する手順を説明します。

---

## 2通りの移行方法

環境やお好みに応じて、以下のどちらの方法でも実行可能です。

* **【推奨・最短】方法A: GASによるワンクリック自動構築（Google Cloud設定不要）**
  * ブラウザ上のGoogle Apps Scriptエディタから関数を実行するだけで、全フォルダ・全13スプレッドシート・統一列設定・ファイル設定自動登録が100%自動完了します。
* **方法B: PythonスクリプトによるCSV直接移行（Antigravity）**
  * ローカルのCSVファイルをGoogle Sheets API経由で直接流し込みます。

---

## 方法A: GASによるワンクリック自動構築手順（推奨）

### 1. 空のスクリプトを作成
1. [Google ドライブ](https://drive.google.com/) を開きます。
2. 画面左上の「新規」 ＞ 「その他」 ＞ 「Google Apps Script」をクリックして新規プロジェクトを作成します。
3. プロジェクト名を `SQ_Database_Setup` 等に変更します。

### 2. コードの貼り付け
1. [`gas/Setup_Migration.gs`](../gas/Setup_Migration.gs) の全コードをエディタに貼り付けます。
2. 上部のツールバーで実行関数として **`setupAllDatabase`** を選択し、「**実行**」ボタンを押します。
   * 初回実行時、「承認が必要です」というダイアログが表示されるので、ご自身のアカウントを選択してアクセスを許可してください。

### 3. 自動構築の確認
* Google ドライブのルートに **`STUDY_QUEST_DATABASE`** フォルダが作成され、その中に以下の13ファイルが生成されます：
  * `SQ_Master`
  * `SQ_Questions_小1` 〜 `SQ_Questions_高3` (計12学年ファイル)
* `SQ_Master` の「ファイル設定」シートを開くと、全12学年ファイルのIDが自動入力されています。

### 4. `SQ_Master` に本番スクリプトを配置 & Web API公開
1. 生成された `SQ_Master` スプレッドシートを開き、メニューの「拡張機能」 ＞ 「Apps Script」を開きます。
2. [`gas/Code.gs`](../gas/Code.gs) の内容を貼り付けます。
3. 画面右上の「**デプロイ**」 ＞ 「**新しいデプロイ**」をクリックします。
   * 種類の選択: **ウェブアプリ**
   * 説明: `STUDY QUEST Web API Ver 3.2`
   * 次のユーザーとして実行: **自分**
   * アクセスできるユーザー: **全員**
4. 表示された **ウェブアプリURL（`https://script.google.com/macros/s/.../exec`）** をコピーします。
5. フロントエンドの [`js/state.js`](../js/state.js) の `API_URL` に設定します。

### 5. 即時ビルドの実行
1. `SQ_Master` スプレッドシートをリロードすると、メニューバーに「**⚔️ STUDY QUEST**」メニューが現れます。
2. 「**⚔️ STUDY QUEST ＞ 🚀 ゲームに即時反映 (buildGameJson)**」をクリックします。
3. ドライブ上に固定キャッシュ `study_quest_data.json` が生成され、配信準備が完了します！

---

## 方法B: PythonスクリプトによるCSV直接移行手順

### 1. 準備
1. Google Cloud Consoleでプロジェクトを作成し、Google Drive API と Google Sheets API を有効化します。
2. サービスアカウントを作成し、JSONキーをダウンロードして `service_account.json` として本リポジトリ直下に配置します。
3. 移行元CSVファイル（`学習ゲームデータ_*.csv`）をカレントディレクトリまたは `data/` フォルダに配置します。

### 2. 実行
```bash
pip install google-api-python-client google-auth google-auth-oauthlib
python scripts/migrate_to_google_drive.py
```

### 3. 実行結果
* 親フォルダIDおよび生成された `SQ_Master` のスプレッドシートIDが表示されます。
* 通常問題1,469問、タイピング196問、キャラクター208体が自動流し込みされ、Vol7の重複10件の一意化（`_b` 付加）も自動処理されます。

---

## 品質検証テスト（Pass基準の確認）

ローカル環境にてデータパイプラインの動作検証を行う場合：
```bash
node test_data_pipeline.js
```
すべて `PASS` が出力されることを確認できます。
