---
page: アプリ一覧
urls: ["/apps.html"]
canonical: self
sitemap: true
title_contains: "アプリ一覧"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", "#site-footer", ".brand-hero", ".tools-grid", "#kids", "#teacher", "#qa-apps", "#qa-ref"]
---

# アプリ一覧（`apps.html`）

- **目的**: BEETLEが作ったアプリ・ツールを**分野をまたいで1ページで見せる**入口。
  「教育支援」「QA支援」は事業の説明ページなので、**作ったものを端から見たい人**の受け皿がなかった（2026-09-10新設・板 #2）
- **ヘッダーの位置づけ**: グローバルメニューは **トップ・QA支援・教育支援・アプリ・コラム の5つ**。
  「アプリ」がこのページを指す（2026-09-10に4つ→5つへ。[_common.md](_common.md) 参照）
- **レイアウト型**: Reference系に準拠。`brand-hero` ＋ `.section` ＋ `.tools-grid`。
  カードとグリッドは `/css/test-tools.css` を流用し、差分だけ `/css/apps.css` に持つ
- **構成（4セクション）**:
  - `#kids` 01 こども・おうち向けアプリ（とけい・かんじ・カタカナ・ローマ字・フォニックスの修行5本＋さんすう＋えいご）
  - `#teacher` 02 先生・おうちのかた向けアプリ（学級通信・所見・席替え・班分け・ルビメーカー）
  - `#qa-apps` 03 検証ツール（操作して使う。bug-checker ほか）
  - `#qa-ref` 04 検証ツール（読んで参照する。TESTパターン集ほか）
- **カードの文言は `edu-tools.html` / `test-tools.html` と同じものを使う**。
  片方だけ直すと説明がずれるので、**ツールの説明を変えるときは3ページとも直す**
  （生成スクリプトは残していない。2ページからカードを抜き出して作った）
- **リンク先はランディングがあるものはランディングへ**。アプリ本体へ直リンクするのは
  `test-tools.html` の検証ツールと同じ扱い（bug-checker のみ別タブ）
- **カード末尾は「詳しく見る →」**（[_common.md](_common.md) のカードルール）。バッジは使わない
- **手動確認観点**: ヘッダーの「アプリ」に `aria-current="page"` が付くこと／
  2段目のセクションリンク（こども・先生・検証ツール・リファレンス）が出ること（`js/common.js` が注入）
