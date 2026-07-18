---
page: バグ判定ツール（アプリ）
base: https://bug-checker.vercel.app
urls: ["/"]
canonical: "https://www.beetle-web.jp/tools/bug-checker/landing.html"
sitemap: false
title_contains: "バグ"
og_image: "any"
required_selectors: [".app-paper", ".site-footer-app", ".footer-heroes"]
e2e: true
---

# バグ判定ツール（https://bug-checker.vercel.app）

- **目的**: スクショを貼るだけでバグ/仕様/不明をAI判定し、起票内容まで自動生成するアプリ。**紙面ルールの基準アプリ**
- **構成**: Next.js。Claude API はサーバー側（ANTHROPIC_API_KEY は Vercel 環境変数）
- **紙面ルール**（詳細は CLAUDE.md）:
  - `.app-paper`（1180px・中央寄せ・影）、背景は青海波タイル
  - page-header にたたみ機能、使い方3ステップ＋FAQ をアプリ下部にも表示
  - 更新日はビルド日自動焼き込み、上に戻るフロートボタン
  - **テスト検証用ツールのみ**フッター上に浮世絵ヒーローズバナー（`.footer-heroes`）
- **SEO**: canonical・og:url はランディングへ集約。basePath は使わない
- **挙動（E2Eで検証）**: ページ読込で紙面・フッターが表示される（AI判定はコストがかかるためE2Eでは実行しない）
- **手動確認観点**: 実際の判定品質／月間利用上限の挙動／画像アップロードの各形式対応
