// ============================================================================
// STUDY QUEST RPG - Question_Generator.gs
// Gemini 3.8 Flash 最適化版（全教科完全対応・学年別単元マスター・表記ゆれ防止）
// 国語・算数/数学・理科・社会・英語・情報に加え、
// 保健体育・家庭科・音楽・美術/図工・技術・生活・道徳など全教科を網羅
// ============================================================================

const GEMINI_MODEL = 'gemini-3.8-flash';

const QUESTION_HEADERS = [
  'ID', '学年', '単元', '教科', '問題文', '正解', '誤答1', '誤答2', '誤答3', '解説', '有効'
];

const TYPING_HEADERS = [
  'ID', '学年', '単元/ジャンル', '教科', '日本語', 'ローマ字', '有効'
];

/**
 * 文部科学省学習指導要領準拠 学年別・全教科 標準単元マスター（全角10文字以内・学年配当漢字準拠）
 * 主要教科だけでなく、保健体育・家庭科・音楽・美術/図工・技術・生活・道徳まで網羅
 */
const STANDARD_UNITS_BY_GRADE = {
  // ==========================================================================
  // 小学校1年 (小1)
  // ==========================================================================
  '小1': {
    '算数': [
      'かずとすうじ', 'いくつといくつ', '10までのたしざん', '10までのひきざん',
      '20までのかず', 'とけい(1)', 'たしざん(くりあがり)', 'ひきざん(くりさがり)',
      'かたちづくり', '100までのかず'
    ],
    '国語': [
      'ひらがな', 'カタカナ', 'ことばをみつけよう', 'ぶんをつくろう',
      'おはなしのどっかい', 'かん字のきほん', 'ようすをあらわすことば', 'おもいだしてかこう'
    ],
    '生活': [
      'がっこうたんけん', 'あさがおをそだてよう', 'なつとあそぼう', 'こうえんへいこう',
      'あきをみつけよう', 'いえのしごと', 'ふゆのあそび', 'もうすぐ2ねんせい'
    ],
    '音楽': [
      'たのしくうたおう', 'はくをかんじよう', 'リズムをうとう', 'がっきをならそう',
      'いろんなおとをきこう', 'すきなうたをみつけよう'
    ],
    '図画工作': [
      'すきなことをかこう', 'ねんどであそぼう', 'かみのかたち', 'ならべてならべて',
      'ひかりのくにのなかま', 'ぺったんコロコロ'
    ],
    '体育': [
      'からだをうごかそう', 'かけっこ・リレー', 'ボールなげあそび', 'マットあそび',
      'てつぼうあそび', 'みずあそび', 'ゆうぐあそび'
    ],
    '道徳': [
      'じぶんのことはじぶんで', 'ともだちとなかよく', 'きまりをまもろう', 'いのちをたいせつに',
      'ありがとうをつたえよう', 'すききらいをなくそう'
    ]
  },

  // ==========================================================================
  // 小学校2年 (小2)
  // ==========================================================================
  '小2': {
    '算数': [
      'たし算のひっ算', 'ひき算のひっ算', '長さ(cmとmm)', '1000までの数',
      '水のかさ(LとdL)', 'かけ算(九九)', '三角形と四角形', '10000までの数',
      '時間と時刻', 'はこの形'
    ],
    '国語': [
      'お話の読解', '説明文の読解', 'かん字の読み書き', 'かん字のなかま',
      '主語とじゅつ語', 'ようすをあらわす言葉', '楽しかったこと', '詩のたのしみ'
    ],
    '生活': [
      '町たんけん', '生きものをそだてよう', 'やさいをそだてよう', 'うごくおもちゃづくり',
      '大きくなったわたし', 'みんながつかう町'
    ],
    '音楽': [
      'リズムをあわせよう', 'せんりつのとくちょう', 'けんばんハーモニカ', 'がっきのおと色',
      'みんなでうたおう', 'たいこをたたこう'
    ],
    '図画工作': [
      'えのぐのつかいかた', 'はさみでチョキチョキ', 'ねんどのなかまたち', 'わくわくおもちゃ',
      '大きくそだて', '光のプレゼント'
    ],
    '体育': [
      '走の運動あそび', 'ボール投げゲーム', 'マット・とび箱あそび', 'てつぼう・うんてい',
      '水あそび(もぐる浮く)', 'おにごっこ・リレー'
    ],
    '道徳': [
      '友だちとたすけあう', '約束やきまりをまもる', '自然や生き物を大切に', 'あきらめない心',
      '家族への感謝', '正しいと思ったこと'
    ]
  },

  // ==========================================================================
  // 小学校3年 (小3)
  // ==========================================================================
  '小3': {
    '算数': [
      '九九を見直そう', 'わり算のきほん', '円と球', 'たし算とひき算の筆算',
      'あまりのあるわり算', '大きい数の計算', 'かけ算の筆算', '長さと重さ',
      '小数', '分数', '時間と秒', 'ぼうグラフ'
    ],
    '国語': [
      '物語の読み取り', '説明文の読み取り', '漢字のへんとつくり', 'ローマ字',
      '短歌と俳句', 'ちいちゃんのかげおくり', 'ことわざ・慣用句', '言葉のまとまり'
    ],
    '理科': [
      '植物を育てよう', 'こん虫のくらし', '風やゴムの力', '光のはたらき',
      '明かりをつけよう', 'じしゃくのふしぎ', '物の重さをしらべよう', '太陽と地面の様子'
    ],
    '社会': [
      'わたしたちの町', '農家のしごと', '店ではたらく人', '工場のしごと',
      '火事からくらしを守る', '事故や事件を防ぐ', '昔のくらしと道具', '市の様子と広がり'
    ],
    '音楽': [
      'リコーダーのきほん', '旋律の重なり', '音符と休符の読み方', '合唱・合奏の楽しさ',
      '音楽の気分と情景', '曲の構成を感じよう'
    ],
    '図画工作': [
      '絵の具のにじみとぼかし', 'のこぎりトントン', '立ち上がる紙の立体', '光サンドイッチ',
      '生まれかわったなかま', 'クミクミックス'
    ],
    '保健体育': [
      '短距離走・リレー', 'プレルボール・ポート', 'マット運動・跳び箱', '鉄棒運動',
      '水泳・浮く運動', '健康な毎日の生活', '体を清潔に保つ'
    ],
    '英語': [
      'Hello!', 'How are you?', 'How many?', 'What do you like?',
      'What sports like?', 'Alphabet letters'
    ],
    '道徳': [
      '思いやりと親切', '規則正しい生活', '郷土への愛着', '個性の伸長',
      '生命の尊重', '進んで働くこと'
    ]
  },

  // ==========================================================================
  // 小学校4年 (小4)
  // ==========================================================================
  '小4': {
    '算数': [
      '一億をこえる数', 'わり算の筆算', '角の大きさ', '小数の仕組みと計算',
      '計算のじゅんじょ', '垂直・平行と四角形', '折れ線グラフ', 'およその数(がい数)',
      '面積(平方cm/m)', '小数のわり算', '分数のたし算ひき算', '直方体と立方体'
    ],
    '国語': [
      '白いぼうし', '漢字の組み立て', '説明文の読解', '手紙の書き方',
      'ごんぎつね', '詩の味わい', 'ことわざ・故事成語', '要約と中心文', '敬語と言葉遣い'
    ],
    '理科': [
      '季節と生き物', '天気のようす', '電気のはたらき', '人の体のつくり',
      '月と星の動き', '金属・水・空気', '物のあたたまり方'
    ],
    '社会': [
      '健康なくらしとごみ', '水はどこから', '火災や地震から守る', 'きょう土の発展',
      '伝統・文化と先人', '県のようす(47都道府県)'
    ],
    '音楽': [
      'いろいろな音階', '二部合唱の響き', '日本の民謡・和楽器', '旋律の呼びかけ答え',
      '曲の構成と表情', '音の重なりと美しさ'
    ],
    '図画工作': [
      '木版画のきほん', 'ギコギコトントン', 'つないで組んで立体', '光とかげの造形',
      '夢のマイタウン', 'コロコロガーレ'
    ],
    '保健体育': [
      'リレー・小型ハードル', 'ラインサッカー・ポート', 'マット・跳び箱運動', '水泳（初歩の泳法）',
      '育ちゆく体とわたし', '病気の予防と清潔', '体の発育と変化'
    ],
    '英語': [
      'What time is it?', 'My favorite day', 'What do you want?',
      'Where is the station?', 'This is my day', 'Alphabet reading'
    ],
    '道徳': [
      '正直・誠実な心', '互いの立場を理解する', '伝統と文化の尊重', '自然を愛する心',
      '公徳心とマナー', '感謝の心と友情'
    ]
  },

  // ==========================================================================
  // 小学校5年 (小5)
  // ==========================================================================
  '小5': {
    '算数': [
      '整数と小数', '体積の求め方', '小数のかけ算', '小数のわり算',
      '合同な図形', '整数の性質(倍数約数)', '分数のたし算ひき算', '平均と単位量',
      '速さの計算', '割合とグラフ', '円周と正多角形'
    ],
    '国語': [
      '物語の読解', '説明文の読解', '和語・漢語・外来語', '古典の世界(竹取物語)',
      '事実と意見', '環境とくらし', '敬語の使い方', '漢字の成り立ち'
    ],
    '理科': [
      '植物の発芽と成長', 'メダカのたんじょう', '花から実へ', '天気の変化と台風',
      '流れる水のはたらき', 'もののとけ方', '電磁石のはたらき', '人のたんじょう'
    ],
    '社会': [
      '日本の国土と気候', '米づくりのさかんな地域', '野菜・くだものづくり', '水産業のさかんな地域',
      '自動車をつくる工業', '情報産業とくらし', '自然災害と防災'
    ],
    '英語': [
      'Alphabet', 'Self Introduction', 'What do you like?', 'Where is it?',
      'What time is it?', 'Can you do this?', 'My Dream'
    ],
    '家庭科': [
      '楽しいクッキング(ゆでる)', 'わくわくミシン', '手ぬいの基本(玉結び)', '毎日の食事と栄養素',
      '気持ちのよい住まい', '物やお金の使い方', '整理・整頓と掃除'
    ],
    '音楽': [
      '合唱のハーモニー', '日本の伝統音楽(箏など)', '古典名曲の鑑賞', '拍子とリズムの工夫',
      '音楽の仕組みと反復', '和音のひびき'
    ],
    '図画工作': [
      '糸のこスイスイ', '心に残る風景画', '版画(彫刻刀の技法)', '立体と空間構成',
      '伝えたい気持ちの造形', '消してかく・見つけてかく'
    ],
    '保健体育': [
      '短距離走・ハードル走', 'バスケット・サッカー', 'マット・跳び箱の発展', '水泳(平泳ぎ・クロール)',
      'けがの防止と手当', '心の健康と不安', '心の発達とストレス'
    ],
    '道徳': [
      '自由と責任', '個性の伸長と自律', '公正・公平な態度', '国際理解と親善',
      'よりよい学校生活', '自然愛護と生命尊重'
    ]
  },

  // ==========================================================================
  // 小学校6年 (小6)
  // ==========================================================================
  '小6': {
    '算数': [
      '対称な図形', '文字と式(xとy)', '分数のかけ算', '分数のわり算',
      '比とその利用', '拡大図と縮図', '円の面積', '角柱と円柱の体積',
      'およその形と体積', '並べ方と組み合わせ', 'データの調べ方'
    ],
    '国語': [
      'やまなし(宮沢賢治)', '説明文の読解', '熟語の成り立ち', '古典の言葉(平家物語)',
      '主張と根拠の構成', '詩・短歌・俳句', '座右の銘と随筆'
    ],
    '理科': [
      '物の燃え方と空気', '植物の養分と水', '人の体(呼吸と消化)', '生物どうしの関わり',
      '月と太陽', '水溶液の性質', 'てこの規則性', '土地のつくりと変化', '電気の利用'
    ],
    '社会': [
      '縄文・弥生・古墳時代', '武士の世の始まり', '戦国から天下統一', '江戸幕府と鎖国',
      '明治維新と近代国家', '日清・日露と第一次大戦', '戦後の復興と日本', '日本国憲法と政治', '世界の国々と日本'
    ],
    '英語': [
      'Summer Vacation', 'My Hero', 'Welcome to Japan', 'Junior High School',
      'Past Experience', 'Daily Life'
    ],
    '家庭科': [
      '朝食のおかずを作ろう', '工夫しよう住まいと着方', '快適な衣服の手入れ', 'まかせてね今日の食事',
      '環境にやさしい生活', '地域の生活と交流', 'クッキング(炒める)'
    ],
    '音楽': [
      '三部合唱の響き', '雅楽と日本の音楽', 'オーケストラの楽器', '旋律の創作と工夫',
      '卒業の歌と合唱', '世界の諸民族の音楽'
    ],
    '図画工作': [
      '未来へタイムスリップ', '木と金属の造形', '光のハーモニー', '自分を見つめる自画像',
      '卒業記念制作', '墨と筆の絵'
    ],
    '保健体育': [
      '陸上運動(走・跳)', 'ボール運動(サッカー等)', '器械運動の技の発展', '病気の予防と感染症',
      '喫煙・飲酒・薬物の害', '地域の保健活動', 'ライフステージと健康'
    ],
    '道徳': [
      '法やきまりの意義', 'よりよい社会の実現', '生命の連続性と尊さ', '平和な国際社会',
      '感謝と敬愛の心', '夢に向かって'
    ]
  },

  // ==========================================================================
  // 中学校1年 (中１)
  // ==========================================================================
  '中１': {
    '数学': [
      '正負の数の計算', '正負の数の利用', '文字と式', '一次方程式の解き方',
      '一次方程式の文章題', '比例と反比例', '平面図形と作図', '空間図形の性質',
      '立体と表面積・体積', 'データの活用'
    ],
    '国語': [
      '文学的文章の読解', '説明的文章の読解', '言葉の単位と文法', '品詞の識別',
      '古典(竹取物語・故事成語)', '漢字・熟語の構成', '詩の鑑賞と技法'
    ],
    '理科': [
      '植物のからだと花', '種子をつくらない植物', '物質のすがたと密度', '気体の発生と性質',
      '水溶液と再結晶', '光の反射と屈折', '凸レンズと実像', '音の伝わり方',
      '力のはたらきと圧力', '火山と地震', '地層と大地の変化'
    ],
    '社会': [
      '世界の地域区分', 'アジア州とヨーロッパ', 'アフリカとアメリカ', '日本のすがたと地域区分',
      '旧石器から奈良時代', '平安貴族と武士の台頭', '鎌倉幕府と武士の政治', '室町文化と戦乱の世'
    ],
    '英語': [
      'be動詞の文', '一般動詞の文', '複数形と代名詞', '命令文と疑問詞',
      'canの用法', '現在進行形', '過去形(規則・不規則)', '過去進行形'
    ],
    '保健体育': [
      '短距離走・リレー', '長距離走・ペース配分', '走り幅跳び・走り高跳び', '器械運動(マット・跳び箱)',
      '球技(バスケ・サッカー)', '武道(柔道・剣道)', '呼吸器・循環器の発達', '運動と休養・睡眠',
      '食生活と健康', '応急手当の基本'
    ],
    '技術': [
      '材料と加工の技術', '木材の特徴と性質', '設計と等角図・キャビネット図', '工具の使い方と安全',
      '木材加工・組み立て', '製品の保守点検'
    ],
    '家庭科': [
      '中学生の食生活と栄養', '五大栄養素の働き', '日常食の献立と調理', '食品の選び方と保存',
      '衣服の選択と手入れ', '住まいの機能と安全'
    ],
    '音楽': [
      'アルトリコーダーの奏法', '混声合唱の基本', '日本の伝統音楽(雅楽)', '西洋音楽の歴史(バロック)',
      '音符と記号の正確な読譜', '旋律の反復と変化'
    ],
    '美術': [
      'デッサンと立体感', '遠近法と構図', '色彩の三属性と配色', '自然物・人工物の写生',
      'デザインとレタリング', '工芸と素材の美'
    ],
    '道徳': [
      '自己を見つめ自律する', '思いやりと感謝の心', '友情と信頼', 'よりよい学校生活',
      '生命の尊厳', '遵法精神と公徳心'
    ]
  },

  // ==========================================================================
  // 中学校2年 (中２)
  // ==========================================================================
  '中２': {
    '数学': [
      '単項式と多項式', '式の加法と減法', '文字式の利用', '連立方程式の解法',
      '連立方程式の応用', '一次関数のグラフ', '一次関数の式・交点', '平行線と角',
      '三角形の合同条件', '平行四辺形の性質', '確率の求め方'
    ],
    '国語': [
      '走れメロス(読解)', '論理的な文章の読解', '用言の活用(動詞)', '助動詞と助詞',
      '平家物語・枕草子', '漢詩の鑑賞', '敬語の体系的理解'
    ],
    '理科': [
      '物質の成り立ち(原子分子)', '化合と化学反応式', '酸化と還元', '化学変化と熱',
      '細胞と生物のからだ', '消化と呼吸・血液循環', '刺激と反応(神経骨格)', '気圧と前線・天気の変化',
      '回路と電圧・電流・抵抗', '電流がつくる磁界と誘導電流'
    ],
    '社会': [
      '日本の諸地域(地理考察)', '身近な地域の調査', 'ヨーロッパのアジア進出', '天下統一と江戸の確立',
      '幕藩体制の展開', '産業の発達と化政文化', '開国と幕末の動乱', '明治維新と富国強兵', '近代産業と日清・日露'
    ],
    '英語': [
      'be going toとwill', '助動詞must/should', '接続詞that/when/if', '不定詞(名詞・副詞・形容詞)',
      '動名詞(-ing)', '助動詞have to', '比較(as-as/er-est)', '受動態(受け身)', 'There is/are'
    ],
    '保健体育': [
      '陸上競技(ハードル・走高跳)', '球技(バレー・卓球等)', 'マット運動(連続技)', '武道(基本技と乱取り)',
      'ダンス・現代的なリズム', '生活習慣病の予防', '喫煙・飲酒の健康影響', '心肺蘇生法とAED',
      '環境汚染と健康'
    ],
    '技術': [
      'エネルギー変換の技術', '電気回路の仕組みと安全', 'センサとアクチュエータ', '発電と送電の仕組み',
      '電気・エネルギーの有効利用', 'エネルギー技術の評価'
    ],
    '家庭科': [
      '日常着の手入れと保管', 'ミシンとまつり縫いの技法', '布を用いた製作実習', '中学生の発達と自立',
      '家族・家庭の機能', '住居の安全と防災'
    ],
    '音楽': [
      '混声三部合唱の響き', '日本の伝統音楽(能・狂言)', '古典派・ロマン派の音楽', '音階と調性の仕組み',
      '歌詞と旋律の調和', '管弦楽の楽器構成'
    ],
    '美術': [
      '水彩画の重なりと明暗', '自画像と内面の表現', '版画(木版・ドライポイント)', '日本美術の鑑賞',
      'マーク・シンボルのデザイン', '木彫・粘土による立体'
    ],
    '道徳': [
      '向上心と個性の伸長', '公正・公平と正義', '勤労と社会奉仕', '伝統と文化の継承',
      '国際理解と親善', '自然愛護と環境保全'
    ]
  },

  // ==========================================================================
  // 中学校3年 (中３)
  // ==========================================================================
  '中３': {
    '数学': [
      '式の展開と因数分解', '素因数分解と計算工夫', '平方根の計算と利用', '二次方程式の解法',
      '二次方程式の文章題', '関数 y=ax^2', '関数の変域と変化の割合', '相似な図形と比',
      '平行線と線分の比', '円周角の定理', '三平方の定理と応用', '標本調査と推測'
    ],
    '国語': [
      '故郷(魯迅)', '論説文・批評の読解', '握手(井上ひさし)', 'おくのほそ道・和歌',
      '古典文法の基本', '漢文の訓読と句法', '言葉の多様性とメディア'
    ],
    '理科': [
      '水溶液とイオン', '酸・アルカリと中和', '化学変化と電池', '生物の成長と細胞分裂',
      '遺伝の規則性とDNA', '運動の規則性と速さ', '力と運動・慣性', '仕事と力学的エネルギー',
      '天体の動きと地球の自転公転', '太陽系と恒星', '自然と人間・生態系'
    ],
    '社会': [
      '第一次大戦と大正デモ', '世界恐慌と軍部の台頭', '第二次大戦と終戦', '戦後民主化と日本',
      '冷戦と国際社会', '現代の日本国憲法と人権', '三権分立と民主政治', '地方自治と住民参加',
      '市場経済と価格の働き', '金融と財政・税金', '国際社会と持続可能な開発'
    ],
    '英語': [
      '現在完了形(完了・継続・経験)', '現在完了進行形', '原形不定詞・知覚使役動詞', '後置修飾(分詞の修飾)',
      '関係代名詞(主格・目的格)', '関係代名詞which/who/that', '間接疑問文', '仮定法過去'
    ],
    '保健体育': [
      '陸上・球技の総合実践', '器械運動・発展技', '武道の攻防と礼法', 'ダンスの構成と発表',
      '健康と環境・感染症対策', '精神の健康と自己管理', '生涯を通じる健康づくり', '応急手当の実践',
      '労働と健康・公害対策'
    ],
    '技術': [
      '情報の技術と生活', 'ネットワークと通信の仕組み', '情報セキュリティと著作権', '計測・制御のプログラミング',
      '双方向性のあるコンテンツ', '社会と技術の調和'
    ],
    '家庭科': [
      '幼児の発達と遊び', '幼児の心と体の成長', '地域における子どもと子育て', '消費生活と契約の基本',
      '消費者トラブルと対処法', '生活と環境・循環型社会'
    ],
    '音楽': [
      '卒業の混声合唱', '歌舞伎・文楽の伝統音楽', '近現代の音楽と多様性', '管弦楽の名曲鑑賞',
      '旋律の創作と工夫', '音楽と文化の結びつき'
    ],
    '美術': [
      '自己の探求と表現', '現代美術の鑑賞', '立体造形と空間構成', 'パッケージ・ポスター制作',
      '工芸と生活文化', '卒業記念作品の制作'
    ],
    '道徳': [
      '自己実現と将来の生き方', '社会参画と公共の精神', '平和と人類の福祉', '生命の有限性と永遠性',
      '国際平和と人類愛', '持続可能な未来へ'
    ]
  },

  // ==========================================================================
  // 高等学校1年 (高1)
  // ==========================================================================
  '高1': {
    '情報': [
      '情報社会の倫理と法', '情報デザインの基本', '文字・画像・音のデジタル化', 'コンピュータの基本構成',
      'OSとファイルシステム', 'ネットワークの通信規格', '情報セキュリティと暗号化', 'アルゴリズムと流れ図',
      'Pythonプログラミング', 'データの収集と集計', 'データ視覚化と分析'
    ],
    '数学': [
      '数と式(展開・因数分解)', '実数と根号を含む計算', '一次不等式の解法', '集合と命題の論理',
      '二次関数のグラフと頂点', '二次関数の最大最小', '二次方程式と判別式', '二次不等式',
      '三角比(sin, cos, tan)', '正弦定理と余弦定理', 'データの散布図と相関', '場合の数(順列と組合せ)', '確率の基本性質'
    ],
    '英語': [
      '基本文型と動詞の語法', '時制(完了形・完了進行形)', '助動詞の推量表現', '仮定法(過去・過去完了)',
      '受動態の応用', '不定詞の完了・受動形', '分詞構文の用法', '関係副詞と複合関係詞', '比較の慣用表現', '論理的な英文読解'
    ],
    '国語': [
      '現代文(評論・論説)', '現代文(小説・随筆)', '古典文法(用言・助動詞)', '古文読解の基礎',
      '漢文の基本句法', '漢詩の読解と押韻'
    ],
    '理科': [
      '物質の構成と周期表', '化学結合と結晶', '物質量(mol)の計算', '力と等加速度直線運動',
      '運動方程式(F=ma)', '細胞の構造と機能', '遺伝情報とDNA', '地球の構造とプレート'
    ],
    '社会': [
      '現代の民主政治', '基本的人権と法', '現代の市場経済', '地球環境と持続可能性',
      '近現代史の展開', '国際社会の課題'
    ],
    '保健体育': [
      '現代社会と健康の成り立ち', '生活習慣病の要因と予防', '感染症の予防と免疫', '精神の健康と心の適応',
      '救急処置とAED心肺蘇生', '生涯スポーツの意義', '体力の向上とトレーニング'
    ],
    '家庭科': [
      '生涯の生活設計と家族', '青年の自立と人間関係', '食生活の科学と健康管理', '衣生活の機能と手入れ',
      '住まいと地域環境', '消費行動と生活経済'
    ],
    '音楽': [
      '声楽・発声の基礎技法', '器楽・アンサンブルの響き', '西洋音楽史(ルネサンス〜)', '楽典とコードの基礎',
      '世界の伝統音楽の鑑賞', '旋律・和声の創作'
    ],
    '美術': [
      '造形表現とデッサン力', '色彩理論と配色設計', '絵画表現と構図の研究', '立体造形・工芸の素材',
      '日本美術・西洋美術史', 'ビジュアルデザイン'
    ]
  },

  // ==========================================================================
  // 高等学校2年 (高2)
  // ==========================================================================
  '高2': {
    '情報': [
      '情報技術と社会課題', '暗号化技術と電子署名', 'ネットワークプロトコル', '関係データベースとSQL',
      'オブジェクト指向の基本', 'アルゴリズムの計算量', '統計分析と機械学習', '情報システムの構築'
    ],
    '数学': [
      '式と証明・複素数', '高次方程式の解法', '点と直線の方程式', '円の方程式',
      '軌跡と領域', '三角関数のグラフと加法定理', '指数関数と対数関数', '微分係数と導関数',
      '導関数の利用(増減表)', '不定積分と定積分', '面積の計算', '数列(等差・等比・漸化式)', 'ベクトルの演算と内積'
    ],
    '英語': [
      '複文構造の精密読解', '名詞節・副詞節の識別', '倒置・強調・省略構文', '抽象度の高い論説文読解',
      'アカデミックライティング', 'ディスカッション英語'
    ],
    '国語': [
      '論理国語(批評と論文)', '文学国語(近代小説)', '古典探究(平安文学)', '古典文法の完成',
      '漢文の思想と諸子百家', '言語文化の探究'
    ],
    '理科': [
      '化学反応と量的関係', '酸と塩基・中和滴定', '酸化還元反応と電池', '運動量と力積',
      '力学的エネルギー保存則', '波の干渉とドップラー効果', '代謝とエネルギー(呼吸・光合成)', '遺伝子の発現とタンパク質'
    ],
    '社会': [
      '国際政治と安全保障', '国際経済と為替・貿易', '日本経済の歴史と課題', '社会保障と少子高齢化',
      '世界史総合探究', '日本史総合探究'
    ],
    '保健体育': [
      '生涯を通じる健康づくり', '加齢と健康・エイジング', '労働と健康管理', '環境問題と健康被害',
      '医薬品の適正使用', '医療機関の利用と保険', 'スポーツマネジメント'
    ],
    '家庭科': [
      '子どもの発達と保育実習', '高齢者の生活と福祉・介護', '持続可能な衣食住の工夫', '消費者の権利と責任',
      '家計管理と資産形成', '共生社会と地域支援'
    ],
    '音楽': [
      '合唱・独唱の表現技術', '管弦楽・合奏の高度な調和', '近現代音楽の多様性', '楽曲分析とアナリーゼ',
      '民族音楽の比較研究', '編曲とアンサンブル制作'
    ],
    '美術': [
      '油彩・水彩の高度な表現', '版画・シルクスクリーンの技法', '彫刻と空間インスタレーション', '美術批評と作品分析',
      '情報メディアデザイン', '工芸と伝統技術の継承'
    ]
  },

  // ==========================================================================
  // 高等学校3年 (高3)
  // ==========================================================================
  '高3': {
    '情報': [
      '情報システム開発の流れ', 'AI倫理とデータガバナンス', 'ビッグデータ解析と可視化', 'ネットワーク設計とセキュリティ', '総合実践プロジェクト'
    ],
    '数学': [
      '関数の極限と連続性', '積・商の微分法', '合成関数・逆関数の微分', '三角・指数・対数の導関数',
      'グラフの凹凸と変曲点', '置換積分法と部分積分法', '定積分と体積・弧長', '微分方程式の初歩',
      '複素数平面と極形式', 'ド・モアブルの定理', '二次曲線(放物線・楕円・双曲線)'
    ],
    '英語': [
      '大学入試レベル長文総合演習', '論理展開の把握(ディスコースマーカー)', '要約問題の解法', '自由英作文の論述技術', '時事英語・リスニング実践'
    ],
    '国語': [
      '大学入学共通テスト総合演習', '現代文の精密読解', '古典探究の完成', '漢文の論述対策',
      '小論文の構成と論述', '文学史と古典常識'
    ],
    '理科': [
      '化学平衡と電離平衡', '有機化合物の構造決定', '高分子化合物と生体物質', '電磁気学(電場・磁場・電磁誘導)',
      '原子物理と量子論', '生態系とバイオーム', '進化と系統分類'
    ],
    '社会': [
      '大学入学共通テスト総合演習', '現代社会の複合的諸課題の考察', '政治・経済の論述対策', '歴史資料の読解と論述'
    ],
    '保健体育': [
      '健康課題の総合的探究', '国際社会とグローバルヘルス', '生涯を通じた運動の実践', 'スポーツ文化の発展と未来',
      '健康とウェルビーイング', '地域の保健課題の解決'
    ],
    '家庭科': [
      '生涯を通じたライフデザイン', '多文化共生と家族の未来', '食の安全と持続可能な社会', '持続可能な消費生活',
      '地域社会と福祉のネットワーク', '家庭総合演習'
    ],
    '音楽': [
      '総合的な音楽表現と発表', '音楽を通じた自己実現', '音楽文化の探究と批評', '楽曲制作・演奏実習'
    ],
    '美術': [
      '卒業制作・総合造形表現', '自己の表現世界の深化', '近現代美術の批評と鑑賞', 'デザインと社会問題解決'
    ]
  }
};

/**
 * 学年の発達段階に合わせた全教科タイピングテーマ・ジャンルリスト
 */
const STANDARD_TYPING_THEMES_BY_GRADE = {
  '小1': [
    'ひらがなのれんしゅう', 'ローマ字のきほん', 'どうぶつのなまえ', 'くだものとやさい',
    'がっこうにあるもの', 'からだのぶぶん', 'きせつとあそび'
  ],
  '小2': [
    'かん字の読み方', '身の回りのことば', '町のしせつとたてもの', 'きせつのことば',
    'かんたんな英単語', 'うごくおもちゃ', 'たべものと栄養'
  ],
  '小3': [
    '47都道府県のなまえ', '植物や昆虫のなまえ', 'ローマ字入力の練習', 'ことわざ・慣用句',
    'カレンダーと曜日', '理科の実験器具', 'リコーダーの音名'
  ],
  '小4': [
    '47都道府県と県庁所在地', '日本の有名な山や川', '星と星座のなまえ', '理科の実験器具',
    'パソコンの基本用語', '音楽の記号と速度', '保健とからだの成長'
  ],
  '小5': [
    '日本の主な工業都市', '米や野菜の産地', '歴史の人物(古代〜戦国)', '小学校の必修英単語',
    '敬語・ていねいな言葉', '家庭科の五大栄養素', '音楽の和音と音階'
  ],
  '小6': [
    '歴史の人物(江戸〜現代)', '日本国憲法の重要語句', '理科の専門用語', '日常会話の英単語',
    '四字熟語', '家庭科・調理の専門用語', '保健・感染症と生活習慣'
  ],
  '中１': [
    '世界の国名と首都', '歴史重要人物(古代・中世)', '植物・動物の分類用語', '中学1年の重要英単語',
    '基礎数学用語', '保健体育・陸上球技用語', '技術科・木材加工用語', '音楽・イタリア語演奏記号'
  ],
  '中２': [
    '歴史重要人物(近世・近代)', '化学式と元素記号', '気象と天気の専門用語', '中学2年の重要英単語',
    '日本の地理的特徴', '家庭科・衣服と住居用語', '美術・色彩と技法用語', '保健・生活習慣病用語'
  ],
  '中３': [
    '歴史重要人物(現代)', '公民・憲法・経済の用語', 'イオンと化学変化', '中学3年の重要英単語',
    '三平方・関数用語', '技術科・プログラミング用語', '家庭科・消費者問題用語', '保健体育・応急手当AED'
  ],
  '高1': [
    '情報社会とセキュリティ用語', 'Pythonキーワード', '高校基本英単語', '科学と物理の単位・用語',
    '現代社会の重要語句', '保健体育・公衆衛生用語', '家庭科・資産形成用語', '美術・芸術史キーワード'
  ],
  '高2': [
    'アルゴリズム・データ構造用語', 'プログラミング専門用語', '高校発展英単語', '日本史・世界史探究用語',
    '数学公式と定理', '保健・医療保険と健康用語', '家庭科・共生福祉用語', '音楽・和声対位法用語'
  ],
  '高3': [
    '大学入試頻出英単語', '時事・国際情勢用語', '情報科学総合用語', '学術論文・論説キーワード',
    '現代思想と哲学用語', '生涯スポーツ健康用語', '環境とサステナビリティ用語'
  ]
};

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
    .addItem('🛠️ この学年に必要な全教科シートを自動作成・修復', 'setupGradeSheets')
    .addSeparator()
    .addItem('🚀 ゲームに即時反映 (リモートビルド)', 'manualTriggerRemoteBuild')
    .addToUi();
}

/**
 * 各学年に必要な全教科シートを自動作成・修復する機能
 * （未作成の教科シートをヘッダー・列幅付きで自動追加し、既存データは完全保持）
 */
function setupGradeSheets() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const grade = resolveGradeCodeFromSpreadsheet(ss);

  const gradeTable = STANDARD_UNITS_BY_GRADE[grade];
  if (!gradeTable) {
    ui.alert('エラー', `学年コード【${grade}】に対応する標準教科マスターが見つかりませんでした。`, ui.ButtonSet.OK);
    return;
  }

  const subjectNames = Object.keys(gradeTable);
  const confirm = ui.alert(
    `🛠️ 全教科シートの自動セットアップ`,
    `このスプレッドシート（${ss.getName()}）を【${grade}】向けにセットアップします。\n\n【対象教科（全${subjectNames.length}教科＋タイピング）】\n${subjectNames.join(', ')}, タイピング\n\n・未作成の教科シートを自動作成（11列ヘッダー・最適列幅・1行目固定）\n・既存シートのデータは一切削除せず、ヘッダーのみ自己修復\n\n実行しますか？`,
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  ss.toast('全教科シートを自動セットアップ中...', '🛠️ セットアップ中', -1);

  let createdCount = 0;
  let verifiedCount = 0;

  // 1. 通常教科シートの作成・修復
  subjectNames.forEach(subj => {
    let sheet = ss.getSheetByName(subj);
    if (!sheet) {
      sheet = ss.insertSheet(subj);
      sheet.getRange(1, 1, 1, QUESTION_HEADERS.length).setValues([QUESTION_HEADERS]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, QUESTION_HEADERS.length)
        .setBackground('#f1f5f9')
        .setFontWeight('bold');
      sheet.setColumnWidth(1, 150); // ID
      sheet.setColumnWidth(2, 60);  // 学年
      sheet.setColumnWidth(3, 130); // 単元
      sheet.setColumnWidth(4, 70);  // 教科
      sheet.setColumnWidth(5, 260); // 問題文
      sheet.setColumnWidth(6, 120); // 正解
      sheet.setColumnWidth(7, 120); // 誤答1
      sheet.setColumnWidth(8, 120); // 誤答2
      sheet.setColumnWidth(9, 120); // 誤答3
      sheet.setColumnWidth(10, 200); // 解説
      sheet.setColumnWidth(11, 60);  // 有効
      createdCount++;
    } else {
      ensureValidHeaders(sheet, QUESTION_HEADERS);
      verifiedCount++;
    }
  });

  // 2. タイピングシートの作成・修復
  let typingSheet = ss.getSheetByName('タイピング');
  if (!typingSheet) {
    typingSheet = ss.insertSheet('タイピング');
    typingSheet.getRange(1, 1, 1, TYPING_HEADERS.length).setValues([TYPING_HEADERS]);
    typingSheet.setFrozenRows(1);
    typingSheet.getRange(1, 1, 1, TYPING_HEADERS.length)
      .setBackground('#f5f3ff')
      .setFontWeight('bold');
    typingSheet.setColumnWidth(1, 150); // ID
    typingSheet.setColumnWidth(2, 60);  // 学年
    typingSheet.setColumnWidth(3, 140); // 単元/ジャンル
    typingSheet.setColumnWidth(4, 80);  // 教科
    typingSheet.setColumnWidth(5, 160); // 日本語
    typingSheet.setColumnWidth(6, 180); // ローマ字
    typingSheet.setColumnWidth(7, 60);  // 有効
    createdCount++;
  } else {
    ensureValidHeaders(typingSheet, TYPING_HEADERS);
    verifiedCount++;
  }

  // 3. 空の初期シート（「シート1」や「Sheet1」）があればクリーンアップ
  const dummySheet = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
  if (dummySheet && ss.getSheets().length > 1 && dummySheet.getLastRow() === 0) {
    try {
      ss.deleteSheet(dummySheet);
    } catch (e) {
      // 無視
    }
  }

  ss.toast('✅ 全教科シートのセットアップが完了しました！', '完了', 5);

  const resultMsg = `🎉 【${grade}】の全教科シートセットアップが完了しました！\n\n` +
    `・新規作成: ${createdCount} シート\n` +
    `・既存確認: ${verifiedCount} シート\n\n` +
    `【準備されたシート一覧】\n${subjectNames.join(', ')}, タイピング\n\n` +
    `※親マスター（SQ_Master）は自動でこれら全教科シートを検知して集約します。\n今すぐゲーム本番（SQ_Master）へ反映しますか？`;

  const buildConfirm = ui.alert('セットアップ完了', resultMsg, ui.ButtonSet.YES_NO);
  if (buildConfirm === ui.Button.YES) {
    manualTriggerRemoteBuild();
  }
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
 * シート名から標準教科マスターのキーを検索・解決するエイリアスマッピング
 * （例: 「体育」→「保健体育」、「図工」→「図画工作」などタブ名の揺れを完全吸収）
 */
function resolveSubjectMasterUnits(gradeTable, subjectName) {
  const s = subjectName.trim();
  
  // 1. 完全一致
  if (gradeTable[s]) return gradeTable[s];

  // 2. 表記ゆれ・エイリアス対応
  const aliases = [
    { match: ['保健体育', '体育', '保健'], keys: ['保健体育', '体育', '保健'] },
    { match: ['家庭科', '家庭', '技術・家庭', '技術家庭'], keys: ['家庭科', '家庭'] },
    { match: ['技術', '技術科'], keys: ['技術', '技術・家庭'] },
    { match: ['美術', '図画工作', '図工', '芸術'], keys: ['美術', '図画工作', '図工'] },
    { match: ['音楽', '音'], keys: ['音楽'] },
    { match: ['道徳', '道徳科'], keys: ['道徳'] },
    { match: ['生活', '生活科'], keys: ['生活'] },
    { match: ['算数', '数学'], keys: ['算数', '数学'] },
    { match: ['英語', '外国語', '外国語活動'], keys: ['英語'] },
    { match: ['情報', '情報I', '情報科'], keys: ['情報'] }
  ];

  for (const group of aliases) {
    if (group.match.some(m => s.includes(m) || m.includes(s))) {
      for (const k of group.keys) {
        if (gradeTable[k]) return gradeTable[k];
      }
    }
  }

  // 3. 部分一致
  for (const key of Object.keys(gradeTable)) {
    if (s.includes(key) || key.includes(s)) {
      return gradeTable[key];
    }
  }

  return [];
}

/**
 * 教科シートから既存の単元名一覧および学年別標準単元を取得（モーダル初期化用）
 */
function getUnitDataForCurrentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const subjectName = sheet.getName().trim();
  const defaultGrade = resolveGradeCodeFromSpreadsheet(ss);

  // システム用管理シートのみを除外し、国語・算数・理科・社会・英語・保健体育・家庭科・音楽など全教科を受け入れ
  const ignoreSheets = ['タイピング', 'ファイル設定', 'Users', 'Config', 'ログ'];
  if (ignoreSheets.includes(subjectName)) {
    return {
      error: `「${subjectName}」シートでは4択問題を生成できません。\n問題を追加したい教科シート（国語、算数、数学、理科、社会、英語、保健体育、家庭科、音楽、美術、技術、情報、生活、道徳など）を開いた状態で実行してください。`
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

  // 2. 学年別マスターから該当学年・教科の標準単元を取得
  const gradeTable = STANDARD_UNITS_BY_GRADE[defaultGrade] || {};
  let standardUnits = resolveSubjectMasterUnits(gradeTable, subjectName);

  // もし学年別に見つからない場合、他学年の同名教科からフォールバック探索
  if (standardUnits.length === 0) {
    for (const g of Object.keys(STANDARD_UNITS_BY_GRADE)) {
      const fallback = resolveSubjectMasterUnits(STANDARD_UNITS_BY_GRADE[g], subjectName);
      if (fallback.length > 0) {
        standardUnits = fallback;
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
主要5教科（国語・算数/数学・理科・社会・英語）はもちろん、実技教科・副教科（保健体育・家庭科・音楽・美術/図工・技術・生活・道徳・情報）においても、指導要領の学習内容と評価基準に忠実に準拠し、思考力を養う良質な4択クイズを作成してください。

【重要な任務】
1. [単元名の決定（全角10文字以内厳守）]:
   ${isCustomUnit ? 
     `入力された単元名を対象学年（${defaultGrade}）の発達段階・学習指導要領に準拠した正式な表記に整え、【必ず全角10文字以内】で決定してください。` : 
     `単元名は指定された【${selectedUnit}】をそのまま確定名称とし、一切変更しないでください。`
   }
   ★スマホ画面のセレクトボックス幅に収めるため、単元名は「必ず全角10文字以内（空白・記号含む）」である必要があります。

2. [学年配当漢字・語彙レベルの厳密な準拠（最重要）]:
   - 対象学年【${defaultGrade}】の児童・生徒が学校で習う漢字レベルと語彙を厳密に守ってください。
   - 小学校低学年（小1〜小2）の場合、未習漢字はすべて「ひらがな」で記述するか、問題文・選択肢・解説ともに分かりやすい表現にしてください。
   - 実技教科（体育、家庭科、音楽など）でも、学年に応じた親しみやすく具体的な表現にしてください。

3. [作問品質と4択のバランス]:
   - 4択（正解1、誤答3）は同程度の文字数・文体にすること（正解だけが長くなる現象を防止）。
   - 誤答1〜3は、児童生徒が実際につまずきやすい誤解や混同しやすい用語、日常的な誤った思い込みを論理的に配置すること。
   - 解説は30〜70文字程度で簡潔かつ明快に記述すること。
   - ゲームの戦闘画面表示のため、問題文は1〜3行（最大90文字以内）で簡潔にすること。`;

  const userPrompt = `
【学年】: ${defaultGrade}
【対象教科】: ${subjectName}
【出題単元】: ${selectedUnit}
【微調整指示（自由記述）】: ${customInstruction || '特になし（学年の標準的難易度）'}
【問題数】: ${count}問

上記条件に合致し、${defaultGrade}の子どもたちが正しく理解・学習できる良問を厳密に${count}問作成し、指定のJSONスキーマで返してください。
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

  // 学年別タイピングテーマを取得
  const standardThemes = STANDARD_TYPING_THEMES_BY_GRADE[defaultGrade] || STANDARD_TYPING_THEMES_BY_GRADE['小4'];
  const filteredStandard = standardThemes.filter(t => !existingThemes.includes(t));

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
対象学年【${defaultGrade}】の発達段階と語彙レベルに合わせ、指定されたテーマに沿った学習単語（日本語表記）と、その正確な標準ヘボン式ローマ字（すべて半角英小文字・スペースや記号なし）のペアを生成してください。`;

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
  const res = ui.alert('🚀 リモートビルド実行', '親マスター（SQ_Master）へ全学年データの集約再構築を要求します。\nよろしいですか？', ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;

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
      <label for="unitSelect">単元名（${escapeHtml(data.grade)} 【${escapeHtml(data.subject)}】向け表記・プルダウン選択）</label>
      <select id="unitSelect" onchange="handleUnitChange()">
        <option value="" disabled selected>-- 単元を選択してください --</option>
        ${existingOptions ? `<optgroup label="📂 このシートで既に使用されている単元">${existingOptions}</optgroup>` : ''}
        ${standardOptions ? `<optgroup label="📚 ${escapeHtml(data.grade)}の標準単元（指導要領準拠）">${standardOptions}</optgroup>` : ''}
        <optgroup label="✏️ 新規登録">
          <option value="__CUSTOM__">＋ 新しい単元を直接入力する...</option>
        </optgroup>
      </select>
      
      <div id="newUnitBox" class="new-unit-box">
        <label for="customUnitInput" style="font-size: 11px; color: #93c5fd;">新規単元名（全角10文字以内）</label>
        <input type="text" id="customUnitInput" maxlength="10" placeholder="例: ボール運動、栄養と健康">
        <div class="hint">※子どもたちが迷わないよう、${escapeHtml(data.grade)}で習う漢字・表現（全角10文字以内）で入力してください。</div>
      </div>
    </div>

    <!-- 内容の微調整（自由記述テキストエリア） -->
    <div class="form-group">
      <label for="customInstruction">内容の微調整指示（テキスト自由記述・空欄可）</label>
      <textarea id="customInstruction" placeholder="【${escapeHtml(data.subject)}】の出題傾向や難易度、ひっかけ等の指示があれば自由に入力してください。&#10;(例: ルールや安全に関する問題を中心にする / 道具や用語の基礎問題 / 基礎8割・応用2割)"></textarea>
      <div class="hint">※空欄の場合は、${escapeHtml(data.grade)}の標準的な学習指導要領難易度・漢字レベルで作問されます。</div>
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
    <div class="overlay-sub">【${escapeHtml(data.grade)} ${escapeHtml(data.subject)}】の学習指導要領に合わせ、思考力を問う4択問題・つまずきやすい誤答・解説を作成しています。数十秒ほどお待ちください。</div>
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
        '<div><strong>学年:</strong> ' + escapeHtml(res.grade) + '</div>' +
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
      <label for="themeSelect">テーマ・単元（${escapeHtml(data.grade)}向け全教科表記・プルダウン選択）</label>
      <select id="themeSelect" onchange="handleThemeChange()">
        <option value="" disabled selected>-- テーマを選択してください --</option>
        ${existingOptions ? `<optgroup label="📂 このシートで既に使用されているテーマ">${existingOptions}</optgroup>` : ''}
        ${standardOptions ? `<optgroup label="📚 ${escapeHtml(data.grade)}の標準テーマ候補">${standardOptions}</optgroup>` : ''}
        <optgroup label="✏️ 新規登録">
          <option value="__CUSTOM__">＋ 新しいテーマを直接入力する...</option>
        </optgroup>
      </select>
      
      <div id="newThemeBox" class="new-theme-box">
        <label for="customThemeInput" style="font-size: 11px; color: #c4b5fd;">新規テーマ名</label>
        <input type="text" id="customThemeInput" placeholder="例: 日本の山地・平野、五大栄養素">
      </div>
    </div>

    <div class="form-group">
      <label for="customInstruction">内容の微調整指示（自由記述・空欄可）</label>
      <textarea id="customInstruction" placeholder="${escapeHtml(data.grade)}の出題単語の傾向や難易度、除外したい語句等の指示を入力できます (空欄可)"></textarea>
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
    <div style="color: var(--text-sub); font-size: 12px;">【${escapeHtml(data.grade)}】向けに標準ヘボン式ローマ字の照合を行っています。</div>
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
            '<div><strong>学年:</strong> ' + escapeHtml(res.grade) + '</div>' +
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
