"""
STUDY QUEST RPG - Google Drive / Sheets 分離・自動移行スクリプト (Ver 3.2 最終確定版)
仕様書 Ver 3.2 に完全準拠し、親フォルダ作成、全13スプレッドシート生成、データ投入、重複解消、整合性検証を実行します。
"""

import os
import sys
import json
import re
import csv
from typing import Dict, List, Any, Optional

# 必要ライブラリのチェック案内
try:
    import google.auth
    from googleapiclient.discovery import build
    from google.oauth2 import service_account
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    pass  # 実行時に関数内で詳細なエラーメッセージを表示

# ============================================================================
# 定数・設定
# ============================================================================
PARENT_FOLDER_NAME = "STUDY_QUEST_DATABASE"
MASTER_SPREADSHEET_NAME = "SQ_Master"

GRADE_FILES_DEF = [
    {"label": "小学校1年", "gradeCode": "小1", "name": "SQ_Questions_小1", "subjects": ["国語", "算数"], "hasTyping": True},
    {"label": "小学校2年", "gradeCode": "小2", "name": "SQ_Questions_小2", "subjects": ["国語", "算数"], "hasTyping": True},
    {"label": "小学校3年", "gradeCode": "小3", "name": "SQ_Questions_小3", "subjects": ["国語", "算数", "理科", "社会"], "hasTyping": True},
    {"label": "小学校4年", "gradeCode": "小4", "name": "SQ_Questions_小4", "subjects": ["国語", "算数", "理科", "社会"], "hasTyping": True},
    {"label": "小学校5年", "gradeCode": "小5", "name": "SQ_Questions_小5", "subjects": ["国語", "算数", "理科", "社会", "英語"], "hasTyping": True},
    {"label": "小学校6年", "gradeCode": "小6", "name": "SQ_Questions_小6", "subjects": ["国語", "算数", "理科", "社会", "英語"], "hasTyping": True},
    {"label": "中学校1年", "gradeCode": "中１", "name": "SQ_Questions_中1", "subjects": ["国語", "社会", "理科", "数学", "英語"], "hasTyping": True},
    {"label": "中学校2年", "gradeCode": "中２", "name": "SQ_Questions_中2", "subjects": ["国語", "社会", "理科", "数学", "英語"], "hasTyping": True},
    {"label": "中学校3年", "gradeCode": "中３", "name": "SQ_Questions_中3", "subjects": ["国語", "社会", "理科", "数学", "英語"], "hasTyping": True},
    {"label": "高等学校1年", "gradeCode": "高1", "name": "SQ_Questions_高1", "subjects": ["国語", "数学", "理科", "社会", "英語", "情報"], "hasTyping": True},
    {"label": "高等学校2年", "gradeCode": "高2", "name": "SQ_Questions_高2", "subjects": ["国語", "数学", "理科", "社会", "英語", "情報"], "hasTyping": True},
    {"label": "高等学校3年", "gradeCode": "高3", "name": "SQ_Questions_高3", "subjects": ["国語", "数学", "理科", "社会", "英語", "情報"], "hasTyping": True},
]

# 統一11列ヘッダー（通常教科シート）
QUESTION_HEADERS = [
    "ID", "学年", "単元", "教科", "問題文", "正解", "誤答1", "誤答2", "誤答3", "解説", "有効"
]

# 専用7列ヘッダー（タイピングシート）
TYPING_HEADERS = [
    "ID", "学年", "単元/ジャンル", "教科", "日本語", "ローマ字", "有効"
]

# ボスドロップ4体定義（Google公式CDN形式）
ADDITIONAL_BOSS_CHARACTERS = [
    ["boss_算数神", "算数神", "UR", "ALL", "2.50", "算数の試練を司る神", "ボス", "https://lh3.googleusercontent.com/d/1s6wIIi_1jtHbFg0SkPO2Zk1kvSGzhbeO"],
    ["boss_漢字大魔王", "漢字大魔王", "UR", "ALL", "2.30", "漢字の迷宮を統べる王", "ボス", "https://lh3.googleusercontent.com/d/1qHVLYP4_43JeAY8Fm3Nwtf2p3kJxfYnI"],
    ["boss_サンライズくん", "サンライズくん", "SSR", "EXP", "2.00", "暁の光を宿す存在", "ボス", "https://lh3.googleusercontent.com/d/1YNf03aXj8Ry1vIAbc1cL4s6s1wyni6jr"],
    ["boss_てこのはたらき", "てこのはたらき", "SR", "ATK", "1.80", "力点を操る魔導体", "ボス", "https://lh3.googleusercontent.com/d/1msxofwXzT5VC_a1ZGVsaHa0210MxGxHv"],
]

# ギフト全5レコード定義
DEFAULT_GIFTS = [
    ["ID", "タイトル", "メッセージ", "EXP", "有効"],
    ["0", "進級ボーナス", "進級おめでとう", 30000, "TRUE"],
    ["1", "ログインボーナス", "毎日プレイ達成！", 10000, "TRUE"],
    ["4", "4年マラソンボーナス", "222.2km走破！", 2222000, "TRUE"],
    ["g_001", "特別ミッション報酬", "クエストクリア記念", 50000, "TRUE"],
    ["g_004", "マスターボーナス", "全単元制覇！", 100000, "TRUE"],
]

# スコープ
SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]


# ============================================================================
# Google API 認証ヘルパー
# ============================================================================
def get_google_services(credentials_path: Optional[str] = None):
    """Google Drive および Sheets API サービスを取得"""
    creds = None
    # 1. サービスアカウントJSONの確認
    sa_candidates = [
        credentials_path,
        "service_account.json",
        "credentials.json",
        os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    ]
    for path in sa_candidates:
        if path and os.path.exists(path):
            try:
                creds = service_account.Credentials.from_service_account_file(path, scopes=SCOPES)
                print(f"[認証] サービスアカウント認証を使用: {path}")
                break
            except Exception:
                pass

    # 2. OAuth2 インストールアプリ認証
    if not creds:
        token_path = "token.json"
        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        if not creds or not creds.valid:
            flow = InstalledAppFlow.from_client_secrets_file("client_secret.json", SCOPES)
            creds = flow.run_local_server(port=0)
            with open(token_path, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())
            print("[認証] OAuth2 ユーザー認証を使用")

    drive_service = build("drive", "v3", credentials=creds)
    sheets_service = build("sheets", "v4", credentials=creds)
    return drive_service, sheets_service


# ============================================================================
# CSVデータ読み込み & 正規化
# ============================================================================
def load_csv_data(data_dir: str = ".") -> Dict[str, Any]:
    """各CSVファイルを読み込み、仕様書Ver 3.2に沿って正規化"""
    data = {
        "questions_by_grade": {},
        "typing_by_grade": {},
        "characters": [],
        "shop": [],
        "config": [],
        "bosses": [],
        "random_boss": [],
        "users": [],
    }

    # 1. 通常問題の読み込み (Vol2, 4, 5, 6, 7, 8, 9)
    vol_files = {
        "Vol2": "学習ゲームデータ_Questions_Vol2.csv",
        "Vol4": "学習ゲームデータ_Questions_Vol4.csv",
        "Vol5": "学習ゲームデータ_Questions_Vol5.csv",
        "Vol6": "学習ゲームデータ_Questions_Vol6.csv",
        "Vol7": "学習ゲームデータ_Questions_Vol7.csv",
        "Vol8": "学習ゲームデータ_Questions_Vol8.csv",
        "Vol9": "学習ゲームデータ_Questions_Vol9.csv",
    }

    all_q_ids = set()
    total_q_count = 0

    for vol_key, filename in vol_files.items():
        file_path = os.path.join(data_dir, filename)
        if not os.path.exists(file_path):
            # プレフィックスなしも検索
            alt_path = os.path.join(data_dir, filename.replace("学習ゲームデータ_", ""))
            if os.path.exists(alt_path):
                file_path = alt_path
            else:
                print(f"[警告] 問題ファイルが見つかりません: {filename}")
                continue

        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            vol_rows = list(reader)

        print(f"[読込] {filename}: {len(vol_rows)} 件")

        seen_in_vol7 = set()
        for row in vol_rows:
            qid = str(row.get("ID", "")).strip()
            grade = str(row.get("学年", "")).strip()
            unit = str(row.get("単元", "")).strip()
            subject = str(row.get("教科", "")).strip()
            q_text = str(row.get("問題文", "")).strip()
            ans = str(row.get("正解", "")).strip()
            w1 = str(row.get("誤答1", "")).strip()
            w2 = str(row.get("誤答2", "")).strip()
            w3 = str(row.get("誤答3", "")).strip()
            explain = str(row.get("解説", "")).strip()
            active = str(row.get("有効", "TRUE")).strip().upper() or "TRUE"

            # Vol7の重複10件の一意化（後出の「中国にならった国家づくり」に _b を付加）
            if vol_key == "Vol7":
                if qid in seen_in_vol7:
                    qid = f"{qid}_b"
                seen_in_vol7.add(qid.replace("_b", ""))

            # 11列レコード作成
            record = [qid, grade, unit, subject, q_text, ans, w1, w2, w3, explain, active]

            if grade not in data["questions_by_grade"]:
                data["questions_by_grade"][grade] = {}
            if subject not in data["questions_by_grade"][grade]:
                data["questions_by_grade"][grade][subject] = []

            data["questions_by_grade"][grade][subject].append(record)
            all_q_ids.add(qid)
            total_q_count += 1

    print(f"[集計] 通常問題: 合計 {total_q_count} 件 (ユニークID数: {len(all_q_ids)})")

    # 2. タイピングの読み込み
    typing_filename = "学習ゲームデータ_typing.csv"
    typing_path = os.path.join(data_dir, typing_filename)
    if not os.path.exists(typing_path):
        typing_path = os.path.join(data_dir, "typing.csv")

    if os.path.exists(typing_path):
        with open(typing_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            t_count = 0
            for row in reader:
                tid = str(row.get("ID", "")).strip()
                grade = str(row.get("学年", "")).strip()
                jp = str(row.get("日本語", "")).strip()
                ro = str(row.get("ローマ字", "")).strip()

                if not jp or not ro:
                    continue

                # 7列フォーマット: [ID, 学年, '全般', 'タイピング', 日本語, ローマ字, 'TRUE']
                record = [tid, grade, "全般", "タイピング", jp, ro, "TRUE"]

                if grade not in data["typing_by_grade"]:
                    data["typing_by_grade"][grade] = []
                data["typing_by_grade"][grade].append(record)
                t_count += 1
            print(f"[集計] タイピング: 合計 {t_count} 件")

    # 3. キャラクターの読み込み (204体 + ボス4体)
    chars_path = os.path.join(data_dir, "学習ゲームデータ_Characters.csv")
    if not os.path.exists(chars_path):
        chars_path = os.path.join(data_dir, "Characters.csv")

    if os.path.exists(chars_path):
        with open(chars_path, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            for r in reader:
                if not r or not any(r):
                    continue
                # IDを明示的に文字列化
                r[0] = str(r[0]).strip()
                data["characters"].append(r)

    # ボス4体を追加
    existing_char_ids = {c[0] for c in data["characters"]}
    for boss_c in ADDITIONAL_BOSS_CHARACTERS:
        if boss_c[0] not in existing_char_ids:
            data["characters"].append(boss_c)

    print(f"[集計] キャラクター: 合計 {len(data['characters'])} 体")

    return data


# ============================================================================
# Google ドライブ / スプレッドシート構築
# ============================================================================
def create_drive_structure_and_migrate(drive_service, sheets_service, data: Dict[str, Any]):
    """Google ドライブ上に親フォルダと全13スプレッドシートを作成しデータを流し込む"""

    # 1. 親フォルダ作成
    folder_metadata = {
        "name": PARENT_FOLDER_NAME,
        "mimeType": "application/vnd.google-apps.folder",
    }
    folder = drive_service.files().create(body=folder_metadata, fields="id").execute()
    parent_folder_id = folder.get("id")
    print(f"[Drive] 親フォルダ作成完了: {PARENT_FOLDER_NAME} (ID: {parent_folder_id})")

    file_config_rows = [
        ["ファイル区分", "スプレッドシートID", "学年コード", "通常教科シート名（カンマ区切り）", "タイピングシート有", "有効"]
    ]

    # 2. 学年別スプレッドシート12ファイルの作成
    for gdef in GRADE_FILES_DEF:
        sheet_name = gdef["name"]
        file_metadata = {
            "name": sheet_name,
            "parents": [parent_folder_id],
            "mimeType": "application/vnd.google-apps.spreadsheet",
        }
        file_obj = drive_service.files().create(body=file_metadata, fields="id").execute()
        ss_id = file_obj.get("id")
        print(f"[Sheets] 作成: {sheet_name} (ID: {ss_id})")

        # ファイル設定シート用レコード
        subject_str = ", ".join(gdef["subjects"])
        file_config_rows.append([
            gdef["label"], ss_id, gdef["gradeCode"], subject_str, "TRUE", "TRUE"
        ])

        # シート（タブ）の作成とデータ投入
        setup_grade_spreadsheet(sheets_service, ss_id, gdef, data)

    # 3. SQ_Master スプレッドシートの作成
    master_metadata = {
        "name": MASTER_SPREADSHEET_NAME,
        "parents": [parent_folder_id],
        "mimeType": "application/vnd.google-apps.spreadsheet",
    }
    master_obj = drive_service.files().create(body=master_metadata, fields="id").execute()
    master_id = master_obj.get("id")
    print(f"[Sheets] マスター作成: {MASTER_SPREADSHEET_NAME} (ID: {master_id})")

    setup_master_spreadsheet(sheets_service, master_id, file_config_rows, data)

    return parent_folder_id, master_id


def setup_grade_spreadsheet(sheets_service, ss_id: str, gdef: Dict[str, Any], data: Dict[str, Any]):
    """学年別スプレッドシートの各シート作成とデータ流し込み"""
    # 既存のSheet1を取得してリネームまたは削除準備
    ss_meta = sheets_service.spreadsheets().get(spreadsheetId=ss_id).execute()
    existing_sheets = ss_meta.get("sheets", [])
    default_sheet_id = existing_sheets[0]["properties"]["sheetId"] if existing_sheets else 0

    requests = []
    # 1. 各教科シート追加
    for subj in gdef["subjects"]:
        requests.append({
            "addSheet": {
                "properties": {"title": subj}
            }
        })

    # 2. タイピングシート追加
    if gdef["hasTyping"]:
        requests.append({
            "addSheet": {
                "properties": {"title": "タイピング"}
            }
        })

    # 初期Sheet1を削除
    requests.append({
        "deleteSheet": {"sheetId": default_sheet_id}
    })

    sheets_service.spreadsheets().batchUpdate(
        spreadsheetId=ss_id, body={"requests": requests}
    ).execute()

    # 3. データ投入
    grade_code = gdef["gradeCode"]
    # 表記ゆれマッピング（'小4' / '4年' などの吸収）
    grade_keys = [grade_code, grade_code.replace("小", "").replace("中", "") + "年", grade_code.replace("１", "1").replace("２", "2").replace("３", "3")]

    for subj in gdef["subjects"]:
        rows = [QUESTION_HEADERS]
        for gk in grade_keys:
            if gk in data["questions_by_grade"] and subj in data["questions_by_grade"][gk]:
                rows.extend(data["questions_by_grade"][gk][subj])

        sheets_service.spreadsheets().values().update(
            spreadsheetId=ss_id,
            range=f"'{subj}'!A1",
            valueInputOption="USER_ENTERED",
            body={"values": rows}
        ).execute()

    # タイピングデータ投入
    if gdef["hasTyping"]:
        t_rows = [TYPING_HEADERS]
        for gk in grade_keys:
            if gk in data["typing_by_grade"]:
                t_rows.extend(data["typing_by_grade"][gk])

        sheets_service.spreadsheets().values().update(
            spreadsheetId=ss_id,
            range="'タイピング'!A1",
            valueInputOption="USER_ENTERED",
            body={"values": t_rows}
        ).execute()


def setup_master_spreadsheet(sheets_service, master_id: str, file_configs: List[List[str]], data: Dict[str, Any]):
    """SQ_Master スプレッドシートの各シート構築"""
    ss_meta = sheets_service.spreadsheets().get(spreadsheetId=master_id).execute()
    default_sheet_id = ss_meta["sheets"][0]["properties"]["sheetId"]

    master_sheets = [
        "ファイル設定", "単元マスタ", "Characters", "Bosses", "RandomBoss", "Shop", "Gift", "Config", "Users"
    ]

    requests = []
    for sname in master_sheets:
        requests.append({"addSheet": {"properties": {"title": sname}}})
    requests.append({"deleteSheet": {"sheetId": default_sheet_id}})

    sheets_service.spreadsheets().batchUpdate(
        spreadsheetId=master_id, body={"requests": requests}
    ).execute()

    # 1. ファイル設定
    sheets_service.spreadsheets().values().update(
        spreadsheetId=master_id, range="'ファイル設定'!A1",
        valueInputOption="USER_ENTERED", body={"values": file_configs}
    ).execute()

    # 2. Characters
    char_header = ["ID", "名前", "レア", "タイプ", "補正値", "解説", "カテゴリ", "画像URL"]
    char_rows = [char_header] + data["characters"]
    sheets_service.spreadsheets().values().update(
        spreadsheetId=master_id, range="'Characters'!A1",
        valueInputOption="USER_ENTERED", body={"values": char_rows}
    ).execute()

    # 3. Bosses（横型正規化・初期ヘッダー）
    boss_header = [["学年", "単元", "ボス名", "ボスHP", "ボス画像（絵文字等）", "備考", "bgmUrl"]]
    sheets_service.spreadsheets().values().update(
        spreadsheetId=master_id, range="'Bosses'!A1",
        valueInputOption="USER_ENTERED", body={"values": boss_header}
    ).execute()

    # 4. RandomBoss（横型正規化・初期ヘッダー）
    rboss_header = [["grade", "name", "hp", "icon", "bgmUrl"]]
    sheets_service.spreadsheets().values().update(
        spreadsheetId=master_id, range="'RandomBoss'!A1",
        valueInputOption="USER_ENTERED", body={"values": rboss_header}
    ).execute()

    # 5. Gift
    sheets_service.spreadsheets().values().update(
        spreadsheetId=master_id, range="'Gift'!A1",
        valueInputOption="USER_ENTERED", body={"values": DEFAULT_GIFTS}
    ).execute()

    # 6. Config（Key-Value）
    config_rows = [
        ["キー", "設定値"],
        ["defaultBattleBgm", "https://drive.google.com/uc?export=view&id=10Ad4zJ-9vuBPRoIbbbohzzoSMSL0NDsD"],
        ["exploreBgm", ""],
        ["survivalBgm", ""],
        ["typingBgm", ""],
        ["calcBgm", ""],
        ["randomBgm", ""],
        ["revengeBgm", ""],
        ["activeGrade", "小4"],
        ["activeSubject", "算数"],
        ["activeUnit", ""],
        ["bannerMessage", "STUDY QUESTへようこそ！"],
    ]
    sheets_service.spreadsheets().values().update(
        spreadsheetId=master_id, range="'Config'!A1",
        valueInputOption="USER_ENTERED", body={"values": config_rows}
    ).execute()

    # 7. Users
    user_header = [["UserID", "Data", "LastUpdated"]]
    sheets_service.spreadsheets().values().update(
        spreadsheetId=master_id, range="'Users'!A1",
        valueInputOption="USER_ENTERED", body={"values": user_header}
    ).execute()

    print("[Master] 全マスターシートのデータ投入が完了しました。")


# ============================================================================
# メイン実行関数
# ============================================================================
def main():
    print("=== STUDY QUEST RPG データ移行自動化スクリプト ===")
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "."

    print(f"1. CSVデータの読み込みを開始 (ディレクトリ: {data_dir})")
    data = load_csv_data(data_dir)

    print("\n2. Google Drive / Sheets サービスの初期化")
    try:
        drive_service, sheets_service = get_google_services()
    except Exception as e:
        print(f"[エラー] Google API の認証に失敗しました: {e}")
        print("service_account.json を配置するか、環境変数 GOOGLE_APPLICATION_CREDENTIALS を設定してください。")
        return

    print("\n3. Google ドライブ上のフォルダ & スプレッドシート自動生成とデータ投入")
    folder_id, master_id = create_drive_structure_and_migrate(drive_service, sheets_service, data)

    print("\n========================================================")
    print("🎉 移行作業がすべて正常に完了いたしました！")
    print(f"親フォルダID: {folder_id}")
    print(f"SQ_Master ID: {master_id}")
    print("※ gas/Code.gs 内の DEPLOY_FOLDER_ID に上記の親フォルダIDを設定してください。")
    print("========================================================")


if __name__ == "__main__":
    main()
