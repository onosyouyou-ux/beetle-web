# これってバグなの？（bug-checker） — ランディング作り直し用ブリーフ

スクショを貼るだけで、AIが「バグ／仕様／不明」を判定し、バグならバグ票（タイトル・再現手順・期待値など）を自動生成するWebツール。
登録不要・無料枠あり。テスト中に「これバグ？仕様？」と迷う人、バグ報告の書き方に悩む人向け。

---

## URL・配置（変更しないこと）

- ランディング: `tools/bug-checker/landing.html`（本体ドメインの静的HTML。SEOの主役）
- canonical / og:url: `https://www.beetle-web.jp/tools/bug-checker/landing.html`
- アプリ本体: `https://bug-checker.vercel.app`（CTAから**別タブ**で開く）
- CSS: `/css/bug-checker-lp.css` に外出し（インライン禁止）
- OGP画像: `https://www.beetle-web.jp/assets/images/og-bug-checker.png`（1200×630・既存）
- sitemap.xml 登録済み（URL変更なしなら触らなくてよい。lastmod は更新）

---

## コンセプト・訴求軸

- ペイン：「これバグ？仕様？どっちだろ…」→ 起票しようにも何を書けばいいかわからない → 毎回ゼロから書くのがしんどい
- 解決：スクショを貼るだけ → AIが即判定 → 起票テンプレートを一発生成 → コピーして Jira / Redmine に貼るだけ
- 使い方は3ステップ：①スクショを貼る ②バグスキャン実行 ③起票内容をコピー
- SEOターゲット語：「バグ票 書き方」「バグ報告 書き方」「バグ 起票」「バグ確認 ツール」（現行title/descriptionが実績ある組み合わせなので大きく崩さない）

---

## アプリの実機能（LPに書いてよい事実）

- 画像アップロード（ドラッグ&ドロップ / クリック選択）＋任意の補足メモ入力欄あり
- AI判定は3値：`bug` / `not_bug`（仕様） / `unclear`（不明）＋判定理由（日本語2〜3文）
- 画面上に見える問題は**1症状=1チケット**で複数列挙する方針（1回のスキャンで複数バグ票が出ることがある）
- バグ票の項目：タイトル / 深刻度（Critical・High・Medium・Low）/ カテゴリ（UI・API・Performance・Logic・Security）/ 詳細説明 / 再現手順 / 期待値 / 実際の動作 / 環境情報（画像から推測）
- 無料枠：月1万回まで（サイト全体の共有カウント・JSTで月初リセット）
- サブスク：月額480円で月240回まで（Stripe決済・メールアドレスのみで登録）
- 登録不要・インストール不要・スマホ対応・ブラウザで動く

### 技術（LP本文には不要だが背景知識として）

- Next.js（App Router）＋ Claude API（`claude-haiku-4-5`・サーバー側 `/api/scan` で呼びAPIキー秘匿）
- 使用回数カウントは Vercel KV、課金は Stripe（`/subscribe` → Checkout → webhook）

---

## レイアウト規約（CLAUDE.md「ページレイアウト型 > Tool系」準拠）

- ヘッダー: `<div id="site-header">`、フッター: `<div id="site-footer">` ＋ `/js/common.js`（共通パーシャル）
- ページヘッダーは BEETLE デザインシステムの `page-header` コンポーネント
- 背景 `var(--color-bg-primary)` = `#f7f5f0`、フォント Syne ＋ M PLUS 1p
- アクセントカラーは `var(--color-accent)`（`#C0634C` 直書き禁止）
- 主要コンテンツは `max-width + margin:0 auto`、ヒーローは `padding: 72px max(32px, calc((100% - 860px) / 2)) 64px` 方式
- `<img>` には `width`/`height` 必須、ファーストビュー外は `loading="lazy"`
- 絵文字アイコン（🐛🔍📋など）に頼っている現行デザインは刷新対象。SVG（`/assets/icons/sprites.svg`）やイラストに置き換える想定
- 参考：ふりがなメーカーLP（`tools/rubi-shokunin/index.html`）が直近の「本デザイン」刷新例。イラスト追加＋Tool系レイアウトの前例

## SEO要件（作り直し時に維持・更新すること）

- `<title>`・`meta description`・OGP・twitter card は現行の文言をベースに維持（キーワードを落とさない）
- JSON-LD 2本をインラインで維持：`HowTo`（使い方3ステップ）＋ `SoftwareApplication`（price: 0, JPY）
- FAQを新設する場合は `FAQPage` の JSON-LD も同内容で追加（CLAUDE.mdのルール）
- Google Analytics（gtag・G-N6JXJGQ1Q6）スニペットを維持

---

## 現行LPの構成（2026-07時点・作り直し前の記録）

1. ヒーロー：🐛絵文字＋「BUG DETECTOR」ラベル＋H1「これってバグなの？」＋CTA「🔍 バグスキャンを試す」
2. ペインポイント：吹き出し「これバグ？仕様？どっちだろ…」→ 悩み詳細 → 解決提示
3. できること（3カード）：AIバグ判定 / 起票内容自動生成 / 貼って3秒で完了
4. 使い方（3ステップ・番号付き）
5. バッジ列：月1万回まで無料・スマホ対応・登録不要・ブラウザで動く・インストール不要
6. 下部CTA「🔍 さっそく試してみる」＋注記

---

## 注意・論点メモ

- 「月1万回まで無料」は**ユーザー個人ではなくサイト全体**の月間上限（`FREE_LIMIT`・全ユーザー共有）。LPの表現をどうするかは要判断（現行は「月1万回まで無料」とだけ表記）
- サブスク（月480円/240回）を現行LPは載せていない。作り直しで載せるかは要判断
- アプリ側（bug-checker.vercel.app）の `alternates.canonical` / `og:url` はこのランディングURLを指している。ランディングのURL（`landing.html`）を変えるとアプリ側の修正も必要になるので**変えない**
