# BEETLE Web プロジェクト メモ

## 作業の進め方

### ブランチ運用

作業はブランチを切って行い、確認できたら main にマージする。

```
git checkout -b fix/やること名
# 作業・確認
git checkout main
git merge fix/やること名
git push origin main
```

やめるときはブランチごと捨てる（main は無傷）：

```
git checkout main
git branch -D fix/やること名
```

### コミット

新しいファイルを追加したら**必ずその場でコミットする**。
未コミットのファイルは `git reset --hard` や `git clean -fd` で消える。

特に以下は作ったらすぐコミット：
- `style/` 以下のCSSファイル
- `assets/` 以下の画像・SVGファイル
- 新しいツールページ（`tools/xxxx/index.html` など）

### デプロイ

**beetle-web 本体（実態はVercel配信。2026-07-13判明）**
`www.beetle-web.jp` のレスポンスヘッダーは `Server: Vercel`。**pushごとにVercelの自動デプロイが走る**（GitHub Actionsの "pages build and deployment" も成功するが、ドメインが向いているのはVercel側）。反映まで通常1〜2分。
プッシュ前に `version.json`（フッターのバージョン表示。`js/common.js` が読む）の日付を更新する。本番反映の確認は `curl -s https://www.beetle-web.jp/version.json` とローカルの比較が確実。

⚠️ **無料枠は1日100デプロイまで**（2026-07-13に実際に到達）。pushごとに自動デプロイが走るため、細かいpushを重ねる日は上限を食い切る。**上限到達後のpushは本番に反映されない**うえ、リセット後も自動では追いつかない（新しいpushか手動デプロイが必要）。対策：作業日はコミットをまとめてpushする、または上限到達に気づいたら翌日に空コミットpushで反映させる。

**Vercelアプリ3つ（2026-07-10 実デプロイで確認済み）**
3プロジェクトで Vercel の Root Directory 設定がばらばらなため、**実行場所を間違えるとエラーになる**。
BashツールはWindows側のGit Bashで動くため、WSLパスに直接 `cd` できない。PowerShell から `wsl` 経由で実行する。

- **gakkyu-tsushin**：root から実行（root の `.vercel/project.json` が gakkyu-tsushin を指す。root の `.vercel/` と `.env.local` は Vercel CLI が管理するので**消さないこと**）
  ```powershell
  wsl -e bash -c "cd /home/owner/projects/beetle-web && npx vercel --prod"
  ```
- **bug-checker**：Vercel 側 Root Directory が `tools/bug-checker` のため、**アプリのディレクトリから実行するとパス二重エラー**（`…/tools/bug-checker/tools/bug-checker does not exist`）になる。root から環境変数でプロジェクト指定する：
  ```powershell
  wsl -e bash -c "cd /home/owner/projects/beetle-web && VERCEL_ORG_ID=team_8TPi9kSLfXez6IXDz6fMHMD5 VERCEL_PROJECT_ID=prj_HJB9hn7GYUUvhm37tbzruCoZw5M9 npx vercel --prod"
  ```
- **rubi-shokunin**：Root Directory 未設定のため、**root から実行すると `npm run vercel-build` exited with 1 で失敗**する。アプリのディレクトリから直接実行する：
  ```powershell
  wsl -e bash -c "cd /home/owner/projects/beetle-web/tools/rubi-shokunin && npx vercel --prod"
  ```

- **shoken-maker（所見メーカー。2026-08-23追加）**：Root Directory は `tools/shoken`。アプリのディレクトリから実行する：
  ```powershell
  wsl -e bash -c "cd /home/owner/projects/beetle-web/tools/shoken && npx vercel --prod"
  ```
  ⚠️ **本番URLは `shoken-maker-topaz.vercel.app`**。`shoken-maker.vercel.app` は他所が使用中で取れなかったため、
  Vercel が `-topaz` 付きのドメインを割り当てている。canonical・robots・sitemap・ランディングのCTAは全部こちらを指す。

URL: https://gakkyu-tsushin.vercel.app / https://bug-checker.vercel.app / https://rubi-shokunin.vercel.app / https://shoken-maker-topaz.vercel.app

※コミット時に毎回出る `geometric repack ... Permission denied` は Git の自動メンテナンスがWSLパスで失敗しているだけで無害（コミット・プッシュは成功している）。

## ファイル構成

```
beetle-web/
├── assets/
│   ├── icons/          ← SVG・アイコン素材のみ
│   └── images/         ← PNG・JPGなど画像ファイル
├── css/
│   ├── common.css      ← ナビ・フッターの共通スタイル
│   └── xxxx.css        ← ページ固有CSS（ページ名に合わせた名前）
├── js/
│   ├── common.js       ← header/footer の fetch ローダー
│   └── xxxx.js         ← ページ固有JS（ページ名に合わせた名前）
├── partials/
│   ├── header.html     ← 共通ナビ（ここを編集すれば全ページ反映）
│   └── footer.html     ← 共通フッター（同上）
├── style/              ← ツール固有のCSS変数（test-patterns用）
└── tools/xxxx/
```

- **SVG・アイコン** → `assets/icons/`、**PNG・JPGなど画像** → `assets/images/`。種類を混在させない。

## 新しいページを作るとき

`<head>` に追加：

```html
<link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/common.css">
```

`<body>` の先頭と末尾に追加：

```html
<div id="site-header"></div>

<!-- ページ固有のコンテンツ -->

<div id="site-footer"></div>
<script src="/js/common.js"></script>
```

ナビ・フッターを変更したいときは `partials/header.html` か `partials/footer.html` だけ編集すればOK。各ページは触らなくていい。

### 仕様書と自動テスト（2026-07-19新設・新規ページ必須）

全画面の仕様書が `specs/` にあり、**frontmatter が自動テストの期待値**（書式は `specs/README.md`）。
`node tests/run-static.mjs` が本番URLに対しメタ・OGP・必須要素・sitemap整合を検証し、
GitHub Actions（`site-tests.yml`）が push 時＋週次で静的チェックと Playwright E2E（`tests/e2e/`）を回す。

- **新規ページを作ったら `specs/` に仕様書も追加**（ブログ記事は不要：sitemap.xml に登録すれば `specs/blog-posts.md` の `urls_from_sitemap` が自動で検証対象に含める。2026-07-19変更）
- 仕様を変えたら仕様書の frontmatter を直す（テストコード側に期待値を書かない）
- **画面をまたぐ共通パーツ（ヘッダー・フッター・レイアウト型・カードルール・SEO共通）は `specs/_common.md` に一元化**（2026-07-19新設）。各画面の仕様書には共通部分を書かず `_common.md` 参照と書く。`_` 始まりのファイルはテスト対象外
- push 前のローカル確認は `node tests/run-static.mjs`（依存ゼロ・数十秒）

### SEOチェックリスト（新規ページ必須）

- `sitemap.xml` に URL を追加（`lastmod` は作成日）。過去にサービスページ4枚が未登録のまま放置された失敗あり
- **既存ページの内容を更新したときも該当 `lastmod` を更新する**。放置されがちなので、気づいたら `git log -1 --format=%cs -- <ファイル>` と突き合わせて棚卸しする（2026-07-13 全URL棚卸し済み）
- `canonical`・`meta description`・OGP・JSON-LD を入れる
- `<img>` には `width`/`height` を付ける。ファーストビュー外の画像は `loading="lazy"` も付ける

### ページレイアウト型

依頼時に「Reference系で」「Tool系で」と指定すると、ヘッダー・フッター・スタイルが型通りに揃う。

**Reference系** — TESTパターン集・UI部品名鑑など「読んで参照する」静的ページ

| 要素 | 内容 |
|---|---|
| ヘッダー | `partials/header.html`（ライトナビ、`common.css` の `.nav`） |
| フッター | `partials/footer.html`（ダークバー、`common.css` の `.site-footer`） |
| ページヘッダー | BEETLEデザインシステムの `page-header` コンポーネント |
| 背景 | `var(--color-bg-primary)` = `#f7f5f0` |
| フォント | Syne（英字見出し）＋ M PLUS 1p（日本語タイトル） |
| CSS管理 | `/css/xxxx.css` に外出し、インライン禁止 |

**Tool系** — bug-checker・えいごよんで など「操作して使う」インタラクティブページ（VercelアプリはNext.js、静的ツールは素のHTML）

| 要素 | 内容 |
|---|---|
| ヘッダー | 本体と同じライトナビ（`.site-nav`）。リファレンスボタンの置き方は「ヘッダー・フッターの固定ルール > アプリのヘッダー統一」参照 |
| フッター | ダークバー（`.site-footer-app`）、BEETLEロゴ＋ナビ＋プライバシーポリシー＋© |
| ページヘッダー | BEETLEデザインシステムの `page-header` コンポーネント（共通） |
| 背景 | `var(--color-bg-primary)` = `#f7f5f0` |
| フォント | Syne + M PLUS 1p（layout.tsx の Google Fonts で読み込み） |
| CSS管理 | `globals.css` にBEETLE変数定義、Tailwind 併用 |

Tool系フッターに必須の要素：
- BEETLEロゴ（BEET＋LEオレンジ）
- ナビリンク: ホーム・ツール・コラム・お問い合わせ
- プライバシーポリシーリンク → `https://www.beetle-web.jp/privacy`
- © 表記

### Vercelアプリの紙面ルール（bug-checkerで確立した標準。2026-07-12〜13決定）

Vercelアプリは「**紙面固定＋余白は背景**」で作る。レイアウトを画面幅で伸縮させない。新アプリも既存アプリの改修もこの型に揃える。迷ったら bug-checker の実装が正。

**紙面と背景**
- **紙面**: `.app-paper`（`max-width: var(--app-paper-width)` = **1180px**・背景 `var(--color-bg-primary)`・`box-shadow: 0 0 32px rgba(28,28,46,.16)`）を中央寄せ。全幅の白ナビ（`.site-nav`）と全幅のダークフッター（`.site-footer-app`）の間に挟む
- **背景**: body のタイル背景はツールの系統で作り分ける（どちらも PowerShell System.Drawing で生成。2026-07-13決定）
  - **テスト検証用ツール**: 青海波 `/images/bg-seigaiha.png`（ベース `#EAE4D5`・線 `#D9D1BE`、`background-size: 160px 40px`）。原本は bug-checker の `public/images/`
  - **学校・子ども向けツール**: モザイクタイル `/images/bg-mosaic.png`（ベース `#ece1cb`・温かいベージュ＋パステルアクセント2割、`background-size: 160px 160px`）。原本は gakkyu-tsushin の `public/images/`（rubi-shokunin へコピー済み）
- **レスポンシブの考え方**: 紙面より広い画面では**余白（背景）だけが伸びる**。紙面幅を下回ったら、そこで初めてコンテンツ側の既存レスポンシブ（1カラム化など）で調整する（余白ファースト）
- 紙面内のコンテンツ幅はツールごとに決めてよい（bug-checker は 720px、gakkyu-tsushin は 1180px 2カラム、rubi-shokunin は 620px）
- 全員集合バナー（`.footer-heroes`。テスト検証用ツールのみ）も紙面幅 1180px に揃える

**紙面内の必須要素**
- **ページヘッダー**: page-header ＋**たたみ機能**（たたむトグルは独立行、タイトル群はその下＝ヒーロー画像と重ねない）。初期表示がノートPC1画面に収まるよう余白を圧縮する
- **使い方3ステップ＋FAQ**: ランディングと同内容をアプリ画面下部にも表示する。ランディング側を変えたらアプリ側も同時に更新（JSON-LD FAQPage も）
- **更新日表記**: 紙面下部に「更新日：YYYY-MM-DD」。日付は `next.config.mjs` の `env.NEXT_PUBLIC_UPDATED_DATE = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })` でビルド日を自動焼き込み（手動更新しない。デプロイすれば勝手に変わる）
- **上に戻るフロートボタン**: 本体 `common.css` と同スタイル（bug-checker の `ScrollTopButton.tsx` を流用）

**実装の注意**
- stickyナビを高さゼロの `<header>` で包まない（スクロール→リサイズ→上に戻るとヘッダーが消えるバグの原因になった。2026-07-12修正済み）

**進捗**: bug-checker（基準アプリ）・gakkyu-tsushin・rubi-shokunin・えいごよんで（静的）の全アプリ適用済み（2026-07-13横展開完了）
- **本体配信の静的アプリ**（えいごよんで）も同じ紙面ルール。モザイク原本は `/assets/images/bg-mosaic.png`。ヘッダーは共通パーシャル（トップ・QA支援・教育支援の3ボタン常設）＋common.jsの `staticApps` 設定で「リファレンス（オレンジ）」を追加注入。更新日は手動更新

### レスポンシブの3段ルール（2026-08-25決定・子ども向け修行アプリで確立）

画面幅の分岐は**この3段に固定**する。アプリごとに 640px・700px・760px とバラバラに決めない
（実際にバラバラになり、iPad縦がPC用の2カラム盤面に押し込まれていた）。

| 段 | メディアクエリ | 盤面 | タップ領域 `--nk-tap` |
|---|---|---|---|
| スマホ | `(max-width:767px)` | 1カラム | 60px |
| タブレット縦 | `(min-width:768px) and (max-width:1179px) and (orientation:portrait)` | 1カラム（大きめ） | 76px |
| タブレット横 | `(min-width:768px) and (max-width:1179px) and (orientation:landscape)` | 2カラム | 76px |
| PC | `(min-width:1180px)` | 2カラム | 68px |

- **タブレットは端末ではなく「画面の向き」で出し分ける**。スマホ横持ちも自動で2カラム側に入るので、寝かせても崩れない
- **タップ領域は変数1本で管理する**（`--nk-tap`）。段ごとに数値を直書きしない
- ノートPC・iPad横の**高さ不足対策は別軸**。`(min-width:768px) and (max-height:820px)` で余白を圧縮する（幅の3段とは独立に効かせる）
- 実装は `css/ninja-kids.css` 末尾の「3段レスポンシブ」節が正。各アプリのCSS（`kanji.css` など）も同じ767pxを使う

**1カラムに積むときの注意（実際に踏んだ落とし穴）**

盤面（`.kj-play` `.tk-play` `.kt-quiz` など）は2カラムのgridで、子要素に `grid-column` / `grid-row` が
**明示指定**されている。1カラム化するときは `grid-template-columns:1fr` だけでは足りず、
**子要素の明示指定も `grid-column:1; grid-row:auto` に戻す**こと。戻し忘れると、
問題文と選択肢が「← メニューにもどる」の下に回り込んで**初期表示が空っぽに見える**（スマホで実際に起きていた）。

- 子要素側のセレクタが詳細度で勝つことがある（例：`.ninja-kids .tk-play>.tk-options` は 0,3,0）。
  `>*` の一括リセット（0,2,0）では負けるので、**個別に同等以上の詳細度で上書きする**
- ○×の全面フィードバック（`.tk-feedback.is-ok` など）は絶対配置なので、リセット後に
  `grid-column:1 / -1; grid-row:1 / -1` を**明示的に戻す**（戻さないと1列ぶんに縮む）

**モバイルは1画面に収める（2026-08-25追加）**

子ども向けアプリは、**縦横どちらに回しても「ナビ＋ヒーロー＋盤面」がスクロールなしで収まる**こと。
端末を寝かせた瞬間に遊べなくなるのを防ぐため、幅の3段とは別に高さの軸を持たせる。

| 軸 | メディアクエリ | やること |
|---|---|---|
| スマホ縦 | `(max-width:767px) and (orientation:portrait)` | ヒーローを1行に畳む（リード文は隠し、マスコットは右に76px） |
| 寝かせた画面 | `(orientation:landscape) and (max-height:500px)` | 盤面を左右2カラムに戻し、ヒーロー・ナビ・余白を詰める |

- **高さは px 固定にせず `clamp(下限, ○dvh, 上限)` で決める**。端末差とアドレスバーの伸縮に追従する。
  例：`min-height:clamp(84px,19dvh,190px)`（問題パネル）、`height:clamp(88px,24dvh,170px)`（時計）
- **スマホ横は幅で判定できない**。iPhone 横は 852px あり幅だけ見るとタブレット扱いになるので、`max-height` で拾う
- ナビも寝かせたときだけ薄くする（`.ninja-kids .nav-inner { padding:6px 14px; }`。クラスは `.nav` / `.nav-inner`、`.site-nav` ではない）
- 検算は「最後の要素の `getBoundingClientRect().bottom` ≦ ビューポート高」で見る。
  **6アプリ×9サイズ（360x640／390x740／430x932／667x375／852x393／932x430／768x1024／1024x768／1440x900）を実測して全部○にする**

**○×のアクション画像が見切れる件（2026-08-25修正）**

絶対配置のグリッド項目は「行・列を明示するとその grid area が包含ブロック」になる。
全面フィードバック（`.tk-feedback.is-ok` など）を `grid-row:1 / -1` で置くと、
**1カラムに積む段では明示行が1本しかないため帯が1行ぶん（約24px）に潰れ、画像が見切れる**。
`grid-column:auto; grid-row:auto` にして包含ブロックを盤面のパディングボックスに固定すること。
画像の大きさは px 固定ではなく `height:min(52%,190px)` のように**盤面の高さに対する割合**で決める。
※ `min-height:100%` の箱（こたえあわせパネル）は高さが不定なので % が効かない。そこは `dvh` で決める。

**確認のしかた**

ローカルに静的サーバを立て、iframe を上記9サイズで並べて実測する。見るのは4点：

1. 横スクロールが出ていないか（`scrollWidth - clientWidth === 0`）
2. 列数が段どおりか（`getComputedStyle(board).gridTemplateColumns`）
3. 1カラムの段で子要素の `top` が単調増加か（回り込みの検出）
4. 最後の要素の `bottom` ≦ ビューポート高（1画面に収まっているか）

※ブラウザ拡張の `resize_window` はウィンドウサイズが反映されないことがあるので、iframe で測るのが確実。
※iframe は前のCSSをキャッシュすることがある。計測前に `fetch(cssUrl,{cache:'reload'})` を1回挟む。

### ヘッダー・フッターの固定ルール（2026-07決定）

- **アプリLPのヘッダー**：共通パーシャル（`<div id="site-header">`＋`common.css` のライトナビ）で固定。LP独自ヘッダーは作らない
- **フッターの系統（2026-07-15改定。PC・スマホ同一レイアウト、全て中央揃え）**：
  - **アプリ共通フッター（全アプリ統一。2026-07-15）**：bug-checker・gakkyu-tsushin・rubi-shokunin・えいごよんで・ダミーファイル生成・正規表現テスター の全アプリ画面で同一（2026-07-19に後者2つを共通パーシャルから統一）。bg `#1a1a1a`・リンク色 `#888`。1段目「BEETLEテキストロゴ＋ナビ（トップ・QA支援・教育支援・コラム・お問い合わせ→`/#contact`）」・2段目「プライバシーポリシー・会社名」。クラスは `.site-footer-app` ＞ `.sfa-row`（ロゴ＋ナビ）＋ `.sfa-copy`。**テスト検証用ツール（bug-checker）だけ浮世絵ヒーローズバナー（`.footer-heroes`）をフッターの上に表示**（バナーは紙面幅1180px）
  - **本体共通パーシャル `#site-footer`**：浮世絵ヒーローズバナー → ナビリンク（トップ・QA支援・教育支援・コラム・お問い合わせ。2026-07-19に旧「ホーム・ツール」から刷新、アプリ共通フッターと同一ラベル）＋プライバシーポリシー・会社名を**1行中央揃え**（狭い画面では折り返し）
  - **LP型2段フッター**（トップ・test-tools・edu-tools・**サービス4ページ**）：BEETLEロゴバー `.footer-skyline-bar`＋リンクバー `.footer-link-bar`。スタイルは `common.css` に共通化済み（`.footer-lp` ほか。2026-07-13にサービスページを共通パーシャルからこちらへ変更）
- **その他ツール（子ども・家庭向け）LPのフッター**（えいごよんで！など）：トップページと同じ2段フッター（BEETLEロゴバー `.footer-skyline-bar`＋リンクバー `.footer-link-bar`）。ロゴ部分は詰めた高さ（`.footer-skyline-inner` padding `16px 20px 12px`）で固定
- 共通ヘッダーのSPナビリンクも中央揃え（ハンバーガー化はしない）
- **アプリのヘッダー統一（2026-07-15改定・全アプリ反映済み）**：全アプリ（bug-checker・gakkyu-tsushin・rubi-shokunin・えいごよんで）のナビはLP側と同じ**テキストリンクのグローバルメニュー**（トップ・QA支援・教育支援・コラム。SPでも4リンクフル表示）。**リファレンスはヘッダーに置かず、メインビジュアル内のタイトル・注釈の直下**にオレンジ `#ef8a3c` 角ボタン（`.ph-ref`）で置く。**ランディングがないツールはリファレンスを置かない**（本体配信の静的ツールは共通パーシャル `#site-header` をそのまま使う。例：ダミーファイル生成ツール）
- **ツールのビジュアルトーン（2026-07-10決定）**：テスト検証用ツールは**歌舞伎絵（浮世絵）風**、その他ツール（子ども・家庭向け）は**温かい雰囲気**で作り分ける

## ブログ記事のヒーロー画像（ChatGPT手動生成 ＋ Claude Code仕上げ。2026-07-12決定）

ブログ記事（`blog/posts/`）を新規作成するときは、**ヒーロー画像もセットで用意する**のが標準フロー。
絵づくりは **ChatGPT（課金済みPlus・追加コスト0円）で手動生成**し、仕上げ以降を Claude Code が全部やる。
※ローカルAI（D:\ComfyUI + LoRA）は品質が及ばずヒーロー画像フローからは**外した**（実験・量産用に温存。詳細は `D:\ComfyUI\beetle-image.ps1`）

**受け渡しルール:**
1. ユーザーが ChatGPT で画像を作り、`C:\Users\owner\Pictures\ヒーロー画像置き場\` に保存して記事名（または記事スラッグ）を伝える
2. Claude Code がフォルダの最新画像を拾って仕上げる：
   - 1200×800 に中央クロップ・リサイズ（PowerShell System.Drawing。WSLにPILは無い）
   - JPG（200KB目安）で `assets/images/blog/{記事スラッグ}.jpg` に保存 → **すぐコミット**
   - 記事の `og:image`（width/height も）と `<img class="post-eyecatch" width="1200" height="800" alt="...">` を設定
   - 使い終わった元画像は置き場に残してよい（次の画像が来たら「最新のファイル」を使う。曖昧なら確認）

**ChatGPTに渡すプロンプトの雛形**（頼まれたら Claude Code が場面文を考えて渡す）:
- 浮世絵歌舞伎絵スタイル・キャラは2人固定（丸メガネお団子のQA女性＋隈取のエンジニア男性）・note画像生成スペック準拠
- 横長（1200×800想定）、文字を入れる場合は日本語タイトルも ChatGPT に描かせてよい（ChatGPT は日本語文字が正確）

## コーディング規約

### CSS・JS はインラインで書かない

- `<style>` ブロックは HTML に書かず、必ず `/css/xxxx.css` に外出しする
- `<script>` ブロックも HTML に書かず、必ず `/js/xxxx.js` に外出しする

例外（インラインのまま残してよい）：
- Google Analytics の `gtag()` スニペット（仕様上インライン必須）
- JSON-LD 構造化データ `<script type="application/ld+json">`（SEO上インライン必須）

### カラー

- アクセントカラーは `common.css` の `:root` で定義
- 各ファイルで `#C0634C` の直書き禁止、必ず `var(--color-accent)` を使う
- 色を変更する場合は `common.css` の1行のみ修正

```css
/* common.css */
:root {
  --color-accent: #C0634C;
}
```

### レスポンシブ・幅広対応

主要コンテンツは `max-width + margin:0 auto` で幅を制限する。

```css
.sw { max-width: 1100px; margin: 0 auto; }
```

ヒーローは背景を全幅に保ちつつ、コンテンツが間延びしないよう `max()` でpadding制約をかける。幅広画面でもコンテンツが860px以内に収まり、背景（ダークバー）は全幅のまま。

```css
.hero {
  padding: 72px max(32px, calc((100% - 860px) / 2)) 64px;
}
```

### ボタン・カードリンクのデザインルール（2026-07-13決定）

- ナビの入口ボタン（QA支援・教育・こども・アプリのリファレンス）は**塗り＋白文字の角ボタン**（radius 2px・hoverで一段明るく/暗く）。**丸ピル（radius 999px）は使わない**。色はQA支援＝黒 `#1c1c2e`・教育＝BEETLE赤 `--color-accent`・リファレンス＝BEETLE赤
- カード末尾のリンク表示は色付きバッジ（緑の「無料」・オレンジの「→ 使ってみる」等）**禁止**。**太字テキストのみ（ボーダー・背景なし）**で統一し、文言は**「詳しく見る →」**・文字色は**アクセント色**（トップ・test-tools・edu-tools・コラムカード共通）
- トップの「自社ツール」セクションは**QA系6カードのみ**（バグ判定・ダミーファイル生成・正規表現テスター＋TESTパターン集・UI部品名鑑・テスト技法カタログ）。教育カードは置かず、下の中央揃え一覧リンク（QAツール一覧／教育・こどもツール一覧）で誘導。対応領域・一覧リンク行は中央揃え
- ホバー演出の丸アイコン＋「クリック」（`.service-peek`）は**スマホでは丸ごと非表示**（common.css / lp.css の media query で対応済み）

### UIテキストのトーン

- ナビやボタンのラベルはカジュアルな表現を優先する
- 例: 「テストとは？」→「**テストってなに？**」

### ツール名の付け方（2026-08-23決定）

- **子ども向けの練習ツールは「〜修行」**で統一する（かんじ修行・とけい修行・カタカナ修行・ローマ字修行・フォニックス修行）。
  「〜ドリル」「〜のれんしゅう」は使わない
- **画面のH1は かな表記**（「かんじしゅぎょう」）。小1でも読めるようにするため。
  `title`・OGP・JSON-LD は検索向けに漢字（「かんじ修行」）とし、**`title` の後半に「練習」「ドリル」「クイズ」など
  実際に検索される語を残す**（ブランド名と検索語は両立させる）
- **QA系ツールは対象外**（JSTQB練習問題・テスト技法ドリルなど）。企業の担当者が見る面なので、
  ふざけた印象になると問い合わせの入口として損をする
- さんすう うちゅうたんけん・えいごよんで！ のような固有名はそのまま（言いかえない）

### アコーディオン（FAQ）

JS不要の `<details>/<summary>` を使う。CSS アニメーションも追加可能。

```html
<details class="faq-item">
  <summary class="faq-q">
    <span>質問文</span>
    <span class="faq-icon">+</span>
  </summary>
  <div class="faq-a">回答文</div>
</details>
```

FAQ をページに追加・変更したときは **JSON-LD の FAQPage も同内容で更新**すること（SEO連動）。

## グローバルメニュー（2026-07-15にボタン→テキストリンク化）

QA事業と教育事業の二本立てに合わせ、入口を分ける。**LP側（共通ヘッダー・トップLP）のヘッダーはテキストリンクのグローバルメニュー**（2026-07-15決定。ボタンを4つ並べたら全部が埋没したため廃止）：

- 共通ヘッダー（`partials/header.html`）は**2段構成**：1段目「ロゴ＋グローバルメニュー」、2段目「ページ内セクションリンク」（`.nav-sections`。common.js がページごとに注入、定義がないページは非表示）
- グローバルメニューは左から **トップ**（`/`）・**QA支援**（`/test-tools.html`）・**教育支援**（`/edu-tools.html`）・**コラム**（`/blog/`）の**素のテキストリンク4つ**（色 `#55555f`・太字・hoverでアクセント色＋下線 `text-underline-offset:6px`。常時下線は入れない）。**現在ページは `aria-current="page"` でアクセント色＋下線**（共通ヘッダーは common.js が付与、トップLPはHTML直書き）。**4リンクとも全画面常設**。SP（480px以下）では「QA」「教育」に短縮表示する（`<span class="nav-trim">支援</span>` をCSSで非表示。そのぶん文字サイズ13pxを維持して押しやすく。2026-07-19決定、旧「短縮しない」ルールを改定）
- 塗りボタンはヘッダーから全廃。**リファレンスはメインビジュアル（page-header）内のタイトル・注釈の直下**にオレンジ `#ef8a3c` 角ボタン（`.ph-ref`）で置く（2026-07-15にヘッダーから移設。common.js のヘッダー注入も廃止）
- 両メインページの末尾はトップLPと同型の**お問い合わせCTA**（`#contact`、メール＋Googleフォーム）。旧 `.to-service` の相互リンク行は廃止
- のぞき丸アイコンの**「クリック」ラベルは全ページ廃止**（`.service-peek-label` display:none。SPは丸アイコンごと非表示）
- トップLP（`index.html`）のヘッダーは2段構成：1段目「ロゴ＋グローバルメニュー（`.header-entry`。共通ヘッダーと同スタイル）」、2段目「サービス・事例・流れ・なぜ今・スタイル・ツール・代表」中央揃え（SPは横スクロール）。相談するCTA・ハンバーガーは廃止。**ヘッダー背景は白**（`rgba(255,255,255,0.96)`。2026-07-15にベージュ→白へ変更、共通ヘッダーと統一）
- 両ページは「ツール集」ではなく**事業のメインページ**。並び順は**「できること」が先頭**（2026-07-13決定）
- **`test-tools.html`＝QA事業メインページ**：01 BEETLEができること → 02 リファレンス → 03 テスト検証用ツール → 04 検証コラム（QA系3本＋オレンジの「コラム一覧」ボタン）→ 05 QA支援サービス4商品（デグレ確認・テスト設計・リリース前診断・月額伴走）。教育系ツールカードは置かない。ヒーロー右端に浮世絵QAキャラのメインビジュアル（`assets/images/qa-support-hero.jpg`、SP非表示）
- **セクション見出しの部分色変え（`<span class="accent">`）は使わない**（2026-07-13決定。単色で書く）。カード内アイコンの線はアクセントのオレンジ
- **`edu-tools.html`＝教育事業メインページ**：01 教育分野でできること（アプリ制作・コンテンツ制作・PTA向けページ制作）→ 02 おうちで使えるツール（えいごよんで・ルビメーカー）→ 03 先生向けツール（学級通信メーカー）。CSSは `test-tools.css` を流用し `/css/edu-tools.css` で温かいオレンジに上書き
- 相互リンク：両ページ末尾の `.to-service` で互いの入口へ誘導

## ツール共通化規約（SEO・URL）

全ツールを「共通の型」に揃える方針。標準は **bug-checker 型**＝「**SEOは本体ドメインの静的ランディング**／**操作するアプリは別Vercel**」。

### 型の分け方

- **AIを使わない静的ツール**（eigo・test-patterns など）→ サーバー不要。`tools/{名前}/` に静的配置して本体ドメインで完結。
- **AIを使うツール**（bug-checker・gakkyu-tsushin など。Claude API を**サーバー側**で叩く＝APIキーを隠す必要がある）→ アプリは **別 Vercel プロジェクト（`*.vercel.app`）のまま**。SEOは下記の静的ランディングが担当。

### 各ツールに「静的ランディング」を本体ドメインで用意（SEOの主役）

- `tools/{名前}/landing.html` を**静的HTML**で作る（本体プロジェクトが配信）。これが検索で当たる集客面。
  - `canonical` / `og:url` は `https://www.beetle-web.jp/tools/{名前}/landing.html`（＝自分自身＝本体）。
  - 見出し・特徴・使い方・FAQ＋ JSON-LD（HowTo / SoftwareApplication）を入れて中身を厚く。
  - CSS は `/css/{名前}-lp.css`、ヘッダー/フッターは `<div id="site-header">`〜`/js/common.js` で共通化。
  - ページ内の CTA ボタンから AIアプリ本体（`https://{名前}.vercel.app`）を別タブで開く。
- 本体 `sitemap.xml` に `/tools/{名前}/landing.html` を登録。トップ・ツール一覧のリンクも `landing.html` に向ける。
  - 例外（2026-07-10決定）：ツール一覧 `test-tools.html` の**テスト検証用ツール**のカードはアプリ本体へ直リンク（`target="_blank" rel="noopener"`）。一覧まで来た人は使う気の人なのでランディングを挟まない。
- レイアウトは「ページレイアウト型 > Tool系」に準拠。

### アプリ側（`*.vercel.app`）の SEO

- アプリの `alternates.canonical` / `og:url` は**ランディングURL**を指す（評価をランディングに集約）。
- `basePath` は**使わない**（proxy しないので不要。資産パスのズレもなく堅牢）。

### やってはいけない（過去の失敗）

- アプリ自体を `basePath` ＋本体 `vercel.json` リライトで `/tools/{名前}/` に透過プロキシする方式は **不採用**。資産/APIパスのズレ・空セグメント404など壊れやすく、SEO的にも「重いJSの殻」が検索対象になり弱い。素直に「静的ランディング＋アプリ別」にする。

### 各ツールの状況

- **bug-checker**: この型（静的ランディング `tools/bug-checker/landing.html` ＋アプリ vercel.app）で運用中。紙面ルールの基準アプリ。
- **gakkyu-tsushin**: `tools/gakkyu-tsushin/index.html` がランディング（canonical: `/tools/gakkyu-tsushin/`）。アプリは vercel.app。`landing.html` は不要なため削除済み。紙面ルール適用済み（2026-07-13）。
- **rubi-shokunin**: `tools/rubi-shokunin/index.html` がランディング（canonical: `/tools/rubi-shokunin/`）。アプリは vercel.app。紙面ルール適用済み（2026-07-13）。
- **shoken-maker（所見メーカー）**: `tools/shoken/index.html` が静的ランディング（canonical: `/tools/shoken/`）。アプリは `shoken-maker-topaz.vercel.app`（Next.js・Claude API はサーバー側）。**`ANTHROPIC_API_KEY` の設定が必須**。
- **えいごよんで（eigo）**: 静的ツール（AIなし）。`tools/eigo/landing.html` がランディング、`index.html` がアプリ本体。どちらも本体ドメイン配信。
- **子ども向けの静的アプリ（さんすう・とけい修行・かんじ修行・カタカナ修行・ローマ字修行・フォニックス修行）**:
  すべて `tools/{名前}/index.html` がアプリ、`landing.html` がSEO面。アプリの canonical はランディングを指す。
  ランディングは **`/css/edu-app-landing.css` を共用**（`eal-` クラス。ヒーロー画像が無いときは `.eal-hero-grid` を
  使わず1カラムで組めば崩れない）。仕様書は「アプリ用」「ランディング用」の**2本**を `specs/` に置く。
  データとロジックは分け、**データ側（`js/{名前}-data.js`）を単一のデータ源**にする（app 側はその形しか知らない）。
