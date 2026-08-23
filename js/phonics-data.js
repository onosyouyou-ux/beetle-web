/* ============================================================
   phonics-data.js — フォニックス（英語の 文字と 音）のデータ（単一のデータ源）
   window.PHONICS_DATA に置く。app 側（phonics.js）はこの形だけを知っていればよい。

   ねらい：ABC は 言えるのに 単語が 読めない、を なくす。
   原因は2つ。
     1. 学校で ならうのは 文字の「名前」（エー・ビー・シー）。単語を 読むのに いるのは 文字の「音」（ア・ブ・ク）
     2. さきに ローマ字を ならうので、a＝ア の 対応が じゃまをする（name を「ナメ」と 読んでしまう）
   だから この アプリは「名前と音は ちがう」「ローマ字読みとは ちがう」を まいかい 一文で 出す。

   形式:
     letters: { l: 文字, oto: 音のカタカナ近似, name: 文字の名前, ex: 例のことば, ja: その意味 }
     cvc    : { w: 3文字のことば, ja: 意味, near: [まちがえやすい ことば×3] }
     mahou  : { w: ことば, yomi: 正しい読み, romaji: ローマ字読みしたときの まちがい, eYomi: さいごのeも読んだ まちがい, ja: 意味 }
   ============================================================ */
window.PHONICS_DATA = {

  /* ---- 文字の 音（母音は みじかい音）---- */
  letters: [
    { l: 'a', oto: 'ア',   name: 'エー',   ex: 'apple',  ja: 'りんご' },
    { l: 'b', oto: 'ブ',   name: 'ビー',   ex: 'ball',   ja: 'ボール' },
    { l: 'c', oto: 'ク',   name: 'シー',   ex: 'cat',    ja: 'ねこ' },
    { l: 'd', oto: 'ドゥ', name: 'ディー', ex: 'dog',    ja: 'いぬ' },
    { l: 'e', oto: 'エ',   name: 'イー',   ex: 'egg',    ja: 'たまご' },
    { l: 'f', oto: 'フ',   name: 'エフ',   ex: 'fish',   ja: 'さかな' },
    { l: 'g', oto: 'グ',   name: 'ジー',   ex: 'goat',   ja: 'やぎ' },
    { l: 'h', oto: 'ハ',   name: 'エイチ', ex: 'hat',    ja: 'ぼうし' },
    { l: 'i', oto: 'イ',   name: 'アイ',   ex: 'ink',    ja: 'インク' },
    { l: 'j', oto: 'ジュ', name: 'ジェー', ex: 'jam',    ja: 'ジャム' },
    { l: 'k', oto: 'ク',   name: 'ケー',   ex: 'king',   ja: 'おうさま' },
    { l: 'l', oto: 'ル',   name: 'エル',   ex: 'lion',   ja: 'ライオン' },
    { l: 'm', oto: 'ム',   name: 'エム',   ex: 'moon',   ja: 'つき' },
    { l: 'n', oto: 'ヌ',   name: 'エヌ',   ex: 'nose',   ja: 'はな' },
    { l: 'o', oto: 'オ',   name: 'オー',   ex: 'octopus', ja: 'たこ' },
    { l: 'p', oto: 'プ',   name: 'ピー',   ex: 'pen',    ja: 'ペン' },
    { l: 'q', oto: 'クゥ', name: 'キュー', ex: 'queen',  ja: 'じょおう' },
    { l: 'r', oto: 'ル',   name: 'アール', ex: 'rain',   ja: 'あめ' },
    { l: 's', oto: 'ス',   name: 'エス',   ex: 'sun',    ja: 'たいよう' },
    { l: 't', oto: 'トゥ', name: 'ティー', ex: 'tiger',  ja: 'とら' },
    { l: 'u', oto: 'ア',   name: 'ユー',   ex: 'umbrella', ja: 'かさ' },
    { l: 'v', oto: 'ヴ',   name: 'ブイ',   ex: 'van',    ja: 'バン' },
    { l: 'w', oto: 'ウ',   name: 'ダブリュー', ex: 'water', ja: 'みず' },
    { l: 'x', oto: 'クス', name: 'エックス', ex: 'box',   ja: 'はこ' },
    { l: 'y', oto: 'ユ',   name: 'ワイ',   ex: 'yellow', ja: 'きいろ' },
    { l: 'z', oto: 'ズ',   name: 'ゼット', ex: 'zebra',  ja: 'しまうま' },
  ],

  /* ---- 3つの音を つなげて 読む ことば（CVC）
         near は 1文字だけ ちがう ほんとうの ことば。まん中の 母音を 聞き分ける 練習になる ---- */
  cvc: [
    { w: 'cat', ja: 'ねこ',     near: ['cut', 'cot', 'cap'] },
    { w: 'dog', ja: 'いぬ',     near: ['dig', 'dot', 'log'] },
    { w: 'pen', ja: 'ペン',     near: ['pan', 'pin', 'pet'] },
    { w: 'sun', ja: 'たいよう', near: ['sit', 'sat', 'bun'] },
    { w: 'big', ja: 'おおきい', near: ['bag', 'bug', 'bit'] },
    { w: 'hat', ja: 'ぼうし',   near: ['hit', 'hot', 'ham'] },
    { w: 'red', ja: 'あかい',   near: ['rod', 'bed', 'rid'] },
    { w: 'cup', ja: 'コップ',   near: ['cap', 'cop', 'cut'] },
    { w: 'fox', ja: 'きつね',   near: ['fix', 'box', 'fog'] },
    { w: 'map', ja: 'ちず',     near: ['mop', 'man', 'cap'] },
    { w: 'net', ja: 'あみ',     near: ['not', 'nut', 'met'] },
    { w: 'pig', ja: 'ぶた',     near: ['peg', 'pin', 'big'] },
    { w: 'run', ja: 'はしる',   near: ['ran', 'rub', 'sun'] },
    { w: 'top', ja: 'いちばん上', near: ['tap', 'tip', 'ton'] },
    { w: 'web', ja: 'くもの巣', near: ['wed', 'wet', 'wig'] },
    { w: 'jam', ja: 'ジャム',   near: ['jab', 'jog', 'ham'] },
    { w: 'kid', ja: 'こども',   near: ['kit', 'lid', 'kin'] },
    { w: 'log', ja: 'まるた',   near: ['leg', 'lot', 'dog'] },
    { w: 'mud', ja: 'どろ',     near: ['mad', 'mug', 'bud'] },
    { w: 'bag', ja: 'かばん',   near: ['bug', 'big', 'bad'] },
  ],

  /* ---- まほうの e（さいごの e は 読まないが、まえの 母音を 名前の 音に かえる）
         romaji には「ローマ字読みしたら こうなる」を 入れる。ここが 日本の子の つまずき ---- */
  mahou: [
    { w: 'name', yomi: 'ネイム', romaji: 'ナメ',   eYomi: 'ネイメ', ja: 'なまえ' },
    { w: 'cake', yomi: 'ケイク', romaji: 'カケ',   eYomi: 'ケイケ', ja: 'ケーキ' },
    { w: 'game', yomi: 'ゲイム', romaji: 'ガメ',   eYomi: 'ゲイメ', ja: 'ゲーム' },
    { w: 'tape', yomi: 'テイプ', romaji: 'タペ',   eYomi: 'テイペ', ja: 'テープ' },
    { w: 'bike', yomi: 'バイク', romaji: 'ビケ',   eYomi: 'バイケ', ja: 'じてんしゃ' },
    { w: 'time', yomi: 'タイム', romaji: 'ティメ', eYomi: 'タイメ', ja: 'じかん' },
    { w: 'line', yomi: 'ライン', romaji: 'リネ',   eYomi: 'ライネ', ja: 'せん' },
    { w: 'five', yomi: 'ファイヴ', romaji: 'フィヴェ', eYomi: 'ファイヴェ', ja: '5' },
    { w: 'note', yomi: 'ノウト', romaji: 'ノテ',   eYomi: 'ノウテ', ja: 'メモ' },
    { w: 'nose', yomi: 'ノウズ', romaji: 'ノセ',   eYomi: 'ノウゼ', ja: 'はな' },
    { w: 'home', yomi: 'ホウム', romaji: 'ホメ',   eYomi: 'ホウメ', ja: 'いえ' },
    { w: 'hope', yomi: 'ホウプ', romaji: 'ホペ',   eYomi: 'ホウペ', ja: 'のぞみ' },
    { w: 'cute', yomi: 'キュート', romaji: 'クテ', eYomi: 'キュウテ', ja: 'かわいい' },
    { w: 'rice', yomi: 'ライス', romaji: 'リセ',   eYomi: 'ライセ', ja: 'こめ' },
  ],
};
