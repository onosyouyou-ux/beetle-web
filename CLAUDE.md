# BEETLE Web プロジェクト メモ

## コミットについて

新しいファイルを追加したら**必ずその場でコミットする**。

未コミットのファイルは `git reset --hard` や `git clean -fd` で消える。
特に以下は作ったらすぐコミット：
- `style/` 以下のCSSファイル
- `assets/` 以下の画像・SVGファイル
- 新しいツールページ（`tools/xxxx/index.html` など）

## ファイル構成ルール

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

## CSS・JS のお作法

### インラインは書かない
- `<style>` ブロックは HTML に書かず、必ず `/css/xxxx.css` に外出しする
- `<script>` ブロックも HTML に書かず、必ず `/js/xxxx.js` に外出しする

### インラインのまま残してよい例外
- Google Analytics の `gtag()` スニペット（仕様上インライン必須）
- JSON-LD 構造化データ `<script type="application/ld+json">`（SEO上インライン必須）

## アセットのお作法

- **SVG・アイコン** → `assets/icons/`
- **PNG・JPGなど画像** → `assets/images/`
- 種類を混在させない

### 新しいページを作るとき

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

## ページレイアウト型

依頼時に「Reference系で」「Tool系で」と指定すると、ヘッダー・フッター・スタイルが型通りに揃う。

### Reference系
対象: TESTパターン集・UI部品名鑑など「読んで参照する」静的ページ

| 要素 | 内容 |
|---|---|
| ヘッダー | `partials/header.html`（ライトナビ、`common.css` の `.nav`） |
| フッター | `partials/footer.html`（ダークバー、`common.css` の `.site-footer`） |
| ページヘッダー | BEETLEデザインシステムの `page-header` コンポーネント |
| 背景 | `var(--color-bg-primary)` = `#f7f5f0` |
| フォント | Syne（英字見出し）＋ M PLUS 1p（日本語タイトル） |
| CSS管理 | `/css/xxxx.css` に外出し、インライン禁止 |

### Tool系
対象: bug-checker・えいごよんで など「操作して使う」インタラクティブページ（Next.js）

| 要素 | 内容 |
|---|---|
| ヘッダー | ダークバー `#1c1c2e`（`.bc-nav`）、BEETLEロゴ＋パンくず＋右端リファレンスリンク |
| フッター | ダークバー（`.site-footer-app`）、BEETLEロゴ＋ナビ＋プライバシーポリシー＋© |
| ページヘッダー | BEETLEデザインシステムの `page-header` コンポーネント（共通） |
| 背景 | `var(--color-bg-primary)` = `#f7f5f0` |
| フォント | Syne + M PLUS 1p（layout.tsx の Google Fonts で読み込み） |
| CSS管理 | `globals.css` にBEETLE変数定義、Tailwind 併用 |

**フッターに必須の要素（Tool系）**
- BEETLEロゴ（BEET＋LEオレンジ）
- ナビリンク: ホーム・ツール・コラム・お問い合わせ
- プライバシーポリシーリンク → `https://www.beetle-web.jp/privacy`
- © 表記

## カラー運用ルール

- アクセントカラーは `common.css` の `:root` で定義
- 各ファイルで `#C0634C` の直書き禁止、必ず `var(--color-accent)` を使う
- 色を変更する場合は `common.css` の1行のみ修正

```css
/* common.css */
:root {
  --color-accent: #C0634C;
}
```

## レスポンシブ・幅広対応のお作法

### コンテンツエリアの幅制限
ページの主要コンテンツは `max-width + margin:0 auto` で幅を制限する。

```css
.sw { max-width: 1100px; margin: 0 auto; }
```

### ヒーローの幅広対応
ヒーローは背景を全幅に保ちつつ、コンテンツが間延びしないよう `max()` でpadding制約をかける。

```css
.hero {
  padding: 72px max(32px, calc((100% - 860px) / 2)) 64px;
}
```

これで幅広画面でもコンテンツが860px以内に収まる。背景（ダークバー）は全幅のまま。

## UIテキストのトーン

- ナビやボタンのラベルはカジュアルな表現を優先する
- 例: 「テストとは？」→「**テストってなに？**」

## アコーディオン（FAQ）の実装

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

FAQ をページに追加するときは **JSON-LD の FAQPage も同内容で更新**すること（SEO連動）。

## ツール共通化規約（SEO・URL）

全ツールを「共通の型」に揃える方針。**アプリ（デプロイ単位）は別のままでよい**が、URL と SEO 宣言は必ず本体ドメインに寄せる。

### 公開URLは必ず本体ドメイン配下
- 公開URLは `https://www.beetle-web.jp/tools/{名前}/` に統一。`*.vercel.app` を直接リンク・直接公開しない。
- 静的ツール（eigo など）はそのまま `tools/{名前}/` に置く。
- インタラクティブ系（Next.js：bug-checker・gakkyu-tsushin など）は **別 Vercel プロジェクトのまま**でよいが、本体から **リライト（透過プロキシ）** で `/tools/{名前}/` 配下に出す。
  - ❌ リダイレクトにしない（クロスホスト 3xx だと SEO 評価が `*.vercel.app` に逃げ、本体ドメインに集約されない）。
  - 実装: 本体 repo root の `vercel.json` に
    `{ "source": "/tools/{名前}/:path*", "destination": "https://{名前}.vercel.app/:path*" }`
  - 各ツールの `next.config` に `basePath: '/tools/{名前}'`（プロキシ時に `_next` などの資産パスが解決するように）。

### SEO 宣言は全部「本体ブランドURL」を向ける
- 各ツールの `metadataBase` / `alternates.canonical` / `sitemap.ts` / `robots.ts` は
  `https://www.beetle-web.jp/tools/{名前}` を指す（`*.vercel.app` を向けない）。
- 素の `*.vercel.app` は重複コンテンツ防止のため **noindex**（middleware で host が vercel.app のとき `X-Robots-Tag: noindex`）か、本体へ 308 リダイレクト。
- 本体 `sitemap.xml` に `/tools/{名前}/` を登録。トップ・ツール一覧からのリンクも `/tools/{名前}/...` に統一。

### レイアウト
- ヘッダー / フッター / `page-header` / デザイン変数 / フォントは「ページレイアウト型 > Tool系」に準拠して揃える。

### 既知の未対応（移行ToDo）
- **bug-checker**: 現状 `/tools/bug-checker/` は vercel.app への**リダイレクト**、canonical も vercel.app。→ リライト＋本体 canonical へ移行すると評価を本体に集約できる。
- **gakkyu-tsushin**: 現状 `gakkyu-tsushin.vercel.app` を直リンク・本体 sitemap 未登録・全 SEO 参照が vercel.app。→ 上記の型へ移行。

## デプロイ

ホスティング: **GitHub Pages**（`main` ブランチを直接公開）

```
git push origin main
```

プッシュすると自動デプロイが走る。反映まで通常 1〜2 分。

デプロイ状況は GitHub リポジトリの **Actions** タブで確認できる。

## ブランチ運用

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
