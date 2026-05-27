# UI部品名鑑 — Claude Code 引き継ぎメモ

## このファイルは何か
`tools/ui-parts/index.html` — BEETLEサイトのツールページ。
UIコンポーネントの名前・イラスト・説明・よくあるバグをカード形式で紹介するリファレンスページ。

## プロジェクト情報
- リポジトリ: `~/projects/beetle-web`
- 本番URL: `https://www.beetle-web.jp/tools/ui-parts/`
- デプロイ: git push → Vercel 自動デプロイ

## ページ構成
- ヘッダー（サイト共通ナビ）
- ヒーロー（タイトル・説明）
- スティッキーTOCナビ（アイコン+ラベル、スクロール連動でハイライト）
- カードグリッド（auto-fill, minmax 300px）
- フッター

## カードの構造（1部品 = 1カード）
```html
<div class="card" id="部品ID">
  <div class="card-illo">
    <!-- SVGイラスト (viewBox="0 0 200 80" or 90/100) -->
  </div>
  <div class="card-body">
    <div class="card-label">
      <span class="card-name-jp">日本語名</span>
      <span class="card-name-en">English Name</span>
    </div>
    <p class="card-desc">説明文</p>
    <p class="bug-title">よくあるバグ</p>
    <ul class="bug-list">
      <li>バグの説明</li>
    </ul>
  </div>
</div>
```

## TOCナビの構造（1リンク = 1部品）
```html
<a class="toc-link" href="#部品ID">
  <svg viewBox="0 0 20 20" fill="none"><!-- 20×20 のアイコンSVG --></svg>
  ラベル
</a>
```
TOCに追加したら `.toc-inner` の中に `<a class="toc-link">` を追加するだけでOK。
スクロール連動は末尾の `<script>` が IntersectionObserver で自動処理している。

## デザインルール
- フォント: Zen Kaku Gothic New（本文）/ Syne（h1のみ）
- カラー変数（CSS :root に定義済み）:
  - `--orange: #e06c2a`（アクセント）
  - `--navy: #1c1c2e`（背景・テキスト）
  - `--bg: #f7f5f0`（ページ背景）
  - `--card: #ffffff`（カード背景）
  - `--border: #e8e6e0`（ボーダー）
- イラストの背景色: `#f2f0eb`
- SVGイラストのサイズ: `width="200" height="80"`（一部90・100）

## 現在収録している部品（23種）
button / input / checkbox / radio / toggle / select / modal / tooltip /
tabs / accordion / slider / progress / badge / toast / breadcrumb /
card / pagination / hamburger / skeleton / spinner / searchbar / drawer / carousel

## 追加依頼の例
「〇〇を追加して」と言うだけでOK。追加の手順：
1. カードHTMLを `.grid` の末尾に追加（id属性必須）
2. TOCナビに `<a class="toc-link" href="#id">` を追加
3. git push でデプロイ

## よく使うコマンド
```bash
cd ~/projects/beetle-web
git add .
git commit -m "UI部品名鑑: 〇〇を追加"
git push
```