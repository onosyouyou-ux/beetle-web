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

**beetle-web 本体（GitHub Pages）**
`git push origin main` で自動デプロイが走る。反映まで通常 1〜2 分。
デプロイ状況は GitHub リポジトリの **Actions** タブで確認できる。
プッシュ前に `version.json`（フッターのバージョン表示。`js/common.js` が読む）の日付を更新する。

**gakkyu-tsushin アプリ（Vercel）**
Vercel プロジェクトは**リポジトリ root に紐付いている**（root の `.vercel/project.json` が gakkyu-tsushin を指す。root の `.vercel/` と `.env.local` は Vercel CLI が管理するので**消さないこと**）。
BashツールはWindows側のGit Bashで動くため、WSLパスに直接 `cd` できない。
PowerShell から `wsl` 経由で実行する：

```powershell
wsl -e bash -c "cd /home/owner/projects/beetle-web && npx vercel --prod"
```

URL: https://gakkyu-tsushin.vercel.app

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

### SEOチェックリスト（新規ページ必須）

- `sitemap.xml` に URL を追加（`lastmod` は作成日）。過去にサービスページ4枚が未登録のまま放置された失敗あり
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

**Tool系** — bug-checker・えいごよんで など「操作して使う」インタラクティブページ（Next.js）

| 要素 | 内容 |
|---|---|
| ヘッダー | 本体と同じライトナビ（`.site-nav`）：BEETLEテキストロゴ＋ホーム・ツール・コラム・**使い方（アクセント色ピル→ランディングへ）**・お問い合わせ。旧ダークバー`.bc-nav`は廃止（2026-07-10統一） |
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

### ヘッダー・フッターの固定ルール（2026-07決定）

- **アプリLPのヘッダー**：共通パーシャル（`<div id="site-header">`＋`common.css` のライトナビ）で固定。LP独自ヘッダーは作らない
- **テスト検証用ツールのフッター**（これってバグなの？・テストコンテンツ作成ツール・正規表現テスター）：共通パーシャル（`<div id="site-footer">`＝浮世絵ヒーローズ画像＋ダークバー）で固定
- **その他ツール（子ども・家庭向け）LPのフッター**（えいごよんで！など）：トップページと同じ2段フッター（BEETLEロゴバー `.footer-skyline-bar`＋リンクバー `.footer-link-bar`）。ロゴ部分は詰めた高さ（`.footer-skyline-inner` padding `16px 20px 12px`）で固定
- **スマホ共通フッター（2026-07-10決定）**：全ページ「浮世絵バナー縮小（全幅フィット）→ ナビリンク → プライバシーポリシー・©」の順で全て中央揃え（BEETLEテキストロゴ行はバナーに焼き込み済みのためSPでは非表示）。2段フッターLPはSP時のみ `.footer-heroes-sp` でバナー表示（トップLPは出さない）。共通ヘッダーのSPナビリンクも中央揃え（ハンバーガー化はしない）
- **アプリのヘッダー統一（2026-07-10決定）**：Vercelアプリ（bug-checker・gakkyu-tsushin・rubi-shokunin）のヘッダーは本体ライトナビと同型の `.site-nav`。「使い方」ピルボタンで各ランディングへ誘導。**使い方ページ（ランディング）がないツールはボタンを置かない**（本体配信の静的ツールは共通パーシャル `#site-header` をそのまま使う。例：テストコンテンツ作成ツール）
- **ツールのビジュアルトーン（2026-07-10決定）**：テスト検証用ツールは**歌舞伎絵（浮世絵）風**、その他ツール（子ども・家庭向け）は**温かい雰囲気**で作り分ける

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

### UIテキストのトーン

- ナビやボタンのラベルはカジュアルな表現を優先する
- 例: 「テストとは？」→「**テストってなに？**」

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

- **bug-checker**: この型（静的ランディング `tools/bug-checker/landing.html` ＋アプリ vercel.app）で運用中。
- **gakkyu-tsushin**: `tools/gakkyu-tsushin/index.html` がランディングページ（canonical: `/tools/gakkyu-tsushin/`）。アプリは vercel.app。`landing.html` は不要なため削除済み。
