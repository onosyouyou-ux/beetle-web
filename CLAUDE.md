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
