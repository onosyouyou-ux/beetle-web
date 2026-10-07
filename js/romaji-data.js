/* ============================================================
   romaji-data.js — ローマ字のデータ（単一のデータ源）
   window.ROMAJI_DATA に置く。app 側（romaji.js）はこの形だけを知っていればよい。

   ねらい：2025年12月22日の内閣告示（70年ぶりの改定）で、ローマ字は**ヘボン式（shi・chi・tsu）が基本**に
   なった。小学校学習指導要領解説も同日に更新され、2026年度（令和8年度）からの指導はヘボン式が基本。
   いっぽう、上の学年の子・きょうだい・親は**訓令式（si・ti・tu）**で習っている。
   この「2つある」ことを知らないまま表だけ渡されると、子どもは自分の書き方が間違いだと思ってしまう。
   そこで **いま習うのはヘボン式・訓令式も間違いではない** を一文で出すのがこのアプリの中心。

   形式:
     mora   : かな1文字（拗音は2文字）→ ローマ字の書き方の配列。**先頭がヘボン式（いまの基本）、2つ目以降が訓令式など**
     levels : レベル1〜10の ねらい（メニューに出す）
     words  : { lv: レベル, k: ひらがな, hint: その語のポイント（つまずきの説明）, std: もとからの32語なら1 }
     futatsu: 2通りの書き方がある かな。hepburn（いま）/ kunrei（まえ）と、その一文
   ============================================================ */
window.ROMAJI_DATA = {

  /* ---- かな → ローマ字（先頭がヘボン式＝いま学校で習う形） ---- */
  mora: {
    'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
    'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
    'さ': ['sa'], 'し': ['shi', 'si'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
    'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'を': ['o', 'wo'], 'ん': ['n'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'だ': ['da'], 'ぢ': ['ji', 'di'], 'づ': ['zu', 'du'], 'で': ['de'], 'ど': ['do'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
    'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'],
    'ちゃ': ['cha', 'tya'], 'ちゅ': ['chu', 'tyu'], 'ちょ': ['cho', 'tyo'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'じゃ': ['ja', 'zya', 'jya'], 'じゅ': ['ju', 'zyu', 'jyu'], 'じょ': ['jo', 'zyo', 'jyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
  },

  /* ---- 出題することば（3年生の身のまわり中心）
         lv はレベル（1〜10。2026-10-07）。「レベル しゅぎょう」は えらんだ レベルの 10語を **この並びのまま** 出す。
         シャッフルしないので、おなじ レベルなら クラス全員が おなじ問題を おなじ順番で とける。
         std:1 は もとからの 32語。よむ・うつ・かく は これまでどおり この32語から ランダムに出す（使っている人の手ざわりを変えない）
         hint には「その語で つまずく ところ」を書く。書けないことばは入れない ---- */
  levels: [
    '2もじ・ちいさい字なし',
    '3〜4もじ・ちいさい字なし',
    'shi・chi・tsu・fu・ji',
    'ん',
    'のばす音',
    'ちいさい っ',
    'ちいさい ゃゅょ',
    'ゃゅょ＋のばす音',
    'ん の あとに あ行・や行',
    'ながい ことば',
  ],

  words: [
    // レベル1：2もじ・ちいさい字なし
    { lv: 1, k: 'ねこ', hint: 'ne-ko。ne と ko を つなげて かきます', std: 1 },
    { lv: 1, k: 'いぬ', hint: 'i-nu。「い」は i だけで かきます', std: 1 },
    { lv: 1, k: 'うみ', hint: 'u-mi。「う」は u だけで かきます' },
    { lv: 1, k: 'やま', hint: 'ya-ma。「や」は ya' },
    { lv: 1, k: 'そら', hint: 'so-ra。「ら」は ra' },
    { lv: 1, k: 'はな', hint: 'ha-na。ha と na を つなげて かきます' },
    { lv: 1, k: 'くも', hint: 'ku-mo。ku と mo を つなげて かきます' },
    { lv: 1, k: 'あめ', hint: 'a-me。「あ」は a だけで かきます' },
    { lv: 1, k: 'ゆき', hint: 'yu-ki。「ゆ」は yu' },
    { lv: 1, k: 'とり', hint: 'to-ri。「り」は ri' },
    // レベル2：3〜4もじ・ちいさい字なし（2026-10-07。にごる音のない語が半分あったので名前を合わせた）
    { lv: 2, k: 'さかな', hint: 'sa-ka-na。1つの かなが 1つの まとまりです', std: 1 },
    { lv: 2, k: 'たまご', hint: 'ta-ma-go。にごる 音は g で かきます', std: 1 },
    { lv: 2, k: 'すいか', hint: 'su-i-ka。「い」も 1つの かな として かきます', std: 1 },
    { lv: 2, k: 'やさい', hint: 'ya-sa-i。「や」は ya', std: 1 },
    { lv: 2, k: 'あさひ', hint: 'a-sa-hi。「ひ」は hi', std: 1 },
    { lv: 2, k: 'ゆびわ', hint: 'yu-bi-wa。にごる 音の「び」は bi', std: 1 },
    { lv: 2, k: 'めだか', hint: 'me-da-ka。にごる 音は d で かきます' },
    { lv: 2, k: 'くるま', hint: 'ku-ru-ma。「る」は ru' },
    { lv: 2, k: 'たぬき', hint: 'ta-nu-ki。「ぬ」は nu' },
    { lv: 2, k: 'たいいく', hint: 'ta-i-i-ku。i が 2つ つづきます', std: 1 },  // のばす音ではないので レベル5 から移した
    // レベル3：shi・chi・tsu・fu・ji
    { lv: 3, k: 'しお', hint: '「し」は shi（いま ならう かきかた）。まえは si でした', std: 1 },
    { lv: 3, k: 'つくえ', hint: '「つ」は tsu（いま ならう かきかた）。まえは tu でした', std: 1 },
    { lv: 3, k: 'ふでばこ', hint: '「ふ」は fu（いま ならう かきかた）。まえは hu でした', std: 1 },
    { lv: 3, k: 'くつ', hint: '「つ」は tsu（いま ならう かきかた）。まえは tu でした' },
    { lv: 3, k: 'すし', hint: '「し」は shi（いま ならう かきかた）。sushi・susi' },
    { lv: 3, k: 'ちず', hint: '「ち」は chi（いま ならう かきかた）。chizu・tizu' },
    { lv: 3, k: 'ふね', hint: '「ふ」は fu（いま ならう かきかた）。fune・hune' },
    { lv: 3, k: 'いちご', hint: '「ち」は chi。ichigo・itigo' },
    { lv: 3, k: 'つき', hint: '「つ」は tsu。tsuki・tuki' },
    { lv: 3, k: 'ひつじ', hint: '「つ」は tsu、「じ」は ji。hitsuji・hituzi' },
    // レベル4：ん
    { lv: 4, k: 'みかん', hint: 'mikan。さいごの 「ん」も n', std: 1 },
    { lv: 4, k: 'えんぴつ', hint: '「ん」は n。p の まえでも n の ままで よい きまりです', std: 1 },
    { lv: 4, k: 'しんぶん', hint: '「ん」は n。shinbun（いま）・sinbun（まえ）どちらも 読めます', std: 1 },
    { lv: 4, k: 'せんせい', hint: 'sensei。「ん」の n は そのまま つづけます', std: 1 },
    { lv: 4, k: 'ほん', hint: 'hon。さいごの 「ん」も n' },
    { lv: 4, k: 'てんき', hint: 'tenki。「ん」は n' },
    { lv: 4, k: 'りんご', hint: 'ringo。「ん」は n' },
    { lv: 4, k: 'ぺんぎん', hint: 'pengin。「ぺ」は pe' },
    { lv: 4, k: 'おんがく', hint: 'ongaku。「ん」は n' },
    { lv: 4, k: 'かんじ', hint: '「じ」は ji。kanji・kanzi' },
    // レベル5：のばす音
    { lv: 5, k: 'とけい', hint: 'のばす 音の 「い」は i と かきます', std: 1 },
    { lv: 5, k: 'ふうせん', hint: 'のばす 音は かなの とおり u。fuusen（いま）・huusen（まえ）', std: 1 },
    { lv: 5, k: 'おとうと', hint: 'のばす 音の 「う」も u と かきます', std: 1 },
    { lv: 5, k: 'ひこうき', hint: 'hikouki。のばす 音の 「う」も u', std: 1 },
    { lv: 5, k: 'ろうか', hint: 'のばす 音の 「う」は u。rouka' },
    { lv: 5, k: 'おかあさん', hint: 'のばす 音の 「あ」は a。okaasan' },
    { lv: 5, k: 'おにいさん', hint: 'のばす 音の 「い」は i。oniisan' },
    { lv: 5, k: 'くうき', hint: 'のばす 音の 「う」は u。kuuki' },
    { lv: 5, k: 'ほうき', hint: 'のばす 音の 「う」は u。houki' },
    { lv: 5, k: 'おとうさん', hint: 'のばす 音の 「う」は u。otousan' },
    // レベル6：ちいさい っ
    { lv: 6, k: 'きって', hint: 'ちいさい「っ」は tt。ki-t-te で kitte', std: 1 },
    { lv: 6, k: 'にっき', hint: 'ちいさい「っ」は kk。ni-k-ki で nikki', std: 1 },
    { lv: 6, k: 'らっぱ', hint: 'ちいさい「っ」は pp。ra-p-pa で rappa' },
    { lv: 6, k: 'きっぷ', hint: 'ちいさい「っ」は pp。ki-p-pu で kippu' },
    { lv: 6, k: 'はっぱ', hint: 'ちいさい「っ」は pp。ha-p-pa で happa' },
    { lv: 6, k: 'しっぽ', hint: 'ちいさい「っ」は pp。shippo・sippo' },
    { lv: 6, k: 'ざっし', hint: 'ちいさい「っ」の あとが 「し」なので zasshi。まえの かきかたでは zassi', std: 1 },
    { lv: 6, k: 'がっこう', hint: 'ちいさい「っ」は つぎの 音の 字を 2つ かさねて kk', std: 1 },
    { lv: 6, k: 'いっぽん', hint: 'ちいさい「っ」は pp。ippon' },
    { lv: 6, k: 'ばった', hint: 'ちいさい「っ」は tt。ba-t-ta で batta' },
    // レベル7：ちいさい ゃゅょ
    { lv: 7, k: 'おもちゃ', hint: '「ちゃ」は cha（いま ならう かきかた）。omocha・omotya' },
    { lv: 7, k: 'しゃしん', hint: '「しゃ」は sha（いま ならう かきかた）。shashin・syasin' },
    { lv: 7, k: 'きんぎょ', hint: '「ぎょ」は gyo。ちいさい「ょ」は 前の 字と くっつきます' },
    { lv: 7, k: 'ちゃわん', hint: '「ちゃ」は cha（いま ならう かきかた）。まえは tya でした', std: 1 },
    { lv: 7, k: 'でんしゃ', hint: '「しゃ」は sha（いま ならう かきかた）。まえは sya でした', std: 1 },
    { lv: 7, k: 'じてんしゃ', hint: '「じ」は ji（いま ならう かきかた）。まえは zi でした', std: 1 },
    { lv: 7, k: 'いしゃ', hint: '「しゃ」は sha。isha・isya' },
    { lv: 7, k: 'ひゃく', hint: '「ひゃ」は hya。hyaku' },
    { lv: 7, k: 'じゃんけん', hint: '「じゃ」は ja（いま ならう かきかた）。janken・zyanken' },
    { lv: 7, k: 'かぼちゃ', hint: '「ちゃ」は cha。kabocha・kabotya' },
    // レベル8：ゃゅょ＋のばす音
    { lv: 8, k: 'きょうしつ', hint: '「きょ」は kyo。ちいさい「ょ」は 前の 字と くっつきます', std: 1 },
    { lv: 8, k: 'りょうり', hint: '「りょ」は ryo。ちいさい「ょ」は 1つの まとまりです', std: 1 },
    { lv: 8, k: 'ぎゅうにゅう', hint: '「ぎゅ」は gyu。のばす 音は u を そのまま かきます', std: 1 },
    { lv: 8, k: 'きゅうり', hint: '「きゅ」は kyu。のばす 音は u。kyuuri' },
    { lv: 8, k: 'ちょうちょ', hint: '「ちょ」は cho（いま ならう かきかた）。cho-u-cho で choucho・tyoutyo' },
    { lv: 8, k: 'じゅぎょう', hint: '「じゅ」は ju、「ぎょ」は gyo。jugyou・zyugyou' },
    { lv: 8, k: 'びょういん', hint: '「びょ」は byo。byouin' },
    { lv: 8, k: 'きょうりゅう', hint: '「きょ」は kyo、「りゅ」は ryu。kyouryuu' },
    { lv: 8, k: 'ちゅうしゃ', hint: '「ちゅ」は chu、「しゃ」は sha。chuusha・tyuusya' },
    { lv: 8, k: 'きゅうしょく', hint: '「きゅ」は kyu、「しょ」は sho。kyuushoku・kyuusyoku' },  // としょかん は のばす音が ないので 入れかえ
    // レベル9：ん の あとに あ行・や行
    { lv: 9, k: 'ほんや', hint: '「ん」の あとが 「や」だと n だけでは 区切れない。honnya か hon\'ya', std: 1 },
    { lv: 9, k: 'きんようび', hint: '「ん」の あとが 「よ」だと n だけでは 区切れない。kinnyoubi か kin\'youbi', std: 1 },
    { lv: 9, k: 'きんいろ', hint: '「ん」の あとが 「い」だと n だけでは 区切れない。kinniro か kin\'iro' },
    { lv: 9, k: 'ぎんいろ', hint: '「ん」の あとが 「い」なので ginniro か gin\'iro' },
    { lv: 9, k: 'ぜんいん', hint: '「ん」の あとが 「い」なので zennin か zen\'in' },
    { lv: 9, k: 'しんゆう', hint: '「ん」の あとが 「ゆ」なので shinnyuu か shin\'yuu' },
    { lv: 9, k: 'てんいん', hint: '「ん」の あとが 「い」なので tennin か ten\'in' },
    { lv: 9, k: 'まんいん', hint: '「ん」の あとが 「い」なので mannin か man\'in' },
    { lv: 9, k: 'せんえん', hint: '「ん」の あとが 「え」なので sennen か sen\'en' },
    { lv: 9, k: 'ほんよみ', hint: '「ん」の あとが 「よ」なので honnyomi か hon\'yomi' },
    // レベル10：ながい ことば
    { lv: 10, k: 'しょうがっこう', hint: '「しょ」は sho、ちいさい「っ」は kk。shougakkou' },
    { lv: 10, k: 'ゆうびんきょく', hint: 'yuubinkyoku。「きょ」は kyo' },
    { lv: 10, k: 'しんかんせん', hint: 'shinkansen。「ん」が 3つ あります' },
    { lv: 10, k: 'ゆうえんち', hint: '「ち」は chi。yuuenchi・yuuenti' },
    { lv: 10, k: 'うんどうかい', hint: 'undoukai。のばす 音の 「う」は u' },
    { lv: 10, k: 'たいいくかん', hint: 'taiikukan。i が 2つ つづきます' },
    { lv: 10, k: 'にゅうがくしき', hint: '「にゅ」は nyu、「し」は shi。nyuugakushiki' },
    { lv: 10, k: 'がっきゅう', hint: 'ちいさい「っ」は kk、「きゅ」は kyu。gakkyuu' },
    { lv: 10, k: 'こいのぼり', hint: 'ko-i-no-bo-ri' },
    { lv: 10, k: 'ちょきんばこ', hint: '「ちょ」は cho（いま ならう かきかた）。chokinbako・tyokinbako' },
  ],

  /* ---- 2とおりの 書き方がある かな（このアプリの中心） ---- */
  futatsu: [
    { kana: 'し',   hepburn: 'shi', kunrei: 'si',  ex: 'しお / shio・sio' },
    { kana: 'ち',   hepburn: 'chi', kunrei: 'ti',  ex: 'ちず / chizu・tizu' },
    { kana: 'つ',   hepburn: 'tsu', kunrei: 'tu',  ex: 'つき / tsuki・tuki' },
    { kana: 'ふ',   hepburn: 'fu',  kunrei: 'hu',  ex: 'ふね / fune・hune' },
    { kana: 'じ',   hepburn: 'ji',  kunrei: 'zi',  ex: 'じかん / jikan・zikan' },
    { kana: 'しゃ', hepburn: 'sha', kunrei: 'sya', ex: 'しゃしん / shashin・syasin' },
    { kana: 'ちゃ', hepburn: 'cha', kunrei: 'tya', ex: 'おちゃ / ocha・otya' },
    { kana: 'じゃ', hepburn: 'ja',  kunrei: 'zya', ex: 'じゃぐち / jaguchi・zyaguti' },
  ],

  /* 2とおりある理由（futatsu モードの こたえあわせで 出す） */
  // 短く的確に（2026-10-01 ユーザー指示）。いつから・どちらが基本か・まえの形はまちがいではない、の3点だけ
  whyTwo: '2025年12月から ヘボン式（{hepburn}）が 基本です。まえの 訓令式（{kunrei}）も まちがいでは ありません。',
};
