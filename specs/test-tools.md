---
page: QA支援メインページ
urls: ["/test-tools.html"]
canonical: self
sitemap: true
title_contains: "QA支援"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".footer-skyline-bar", ".footer-link-bar", "#contact"]
---

# QA支援メインページ（`test-tools.html`）

- **目的**: QA事業のメインページ。サービスとQA系ツール・リファレンスへの入口
- **レイアウト型**: 共通ヘッダー＋LP型2段フッター
- **主な構成**: 01 BEETLEができること → 02 リファレンス → 03 テスト検証用ツール → 04 検証コラム（QA系3本＋コラム一覧ボタン）→ 05 QA支援サービス4商品 → お問い合わせCTA
- **固定ルール**:
  - テスト検証用ツールのカードはアプリ本体（*.vercel.app）へ直リンク（target="_blank" rel="noopener"）。ランディングを挟まない
  - 教育系ツールカードは置かない
  - セクション見出しの部分色変え（span.accent）は使わない
  - ヒーロー右端に浮世絵QAキャラ（assets/images/qa-support-hero.jpg、SP非表示）
  - SP（600px以下）ではツールカードの説明文をアコーディオン化（▼ボタンで開閉。`js/tool-card-accordion.js` が▼を注入、CSSは test-tools.css。カード全体が`<a>`のため▼タップでは遷移しない。2026-07-19）
- **手動確認観点**: 各ツールカードのリンク先が生きているか／コラム3本の選定が古くなっていないか／SPで▼開閉が動き、▼タップでページ遷移しないか
