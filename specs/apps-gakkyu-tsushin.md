---
page: 学級通信メーカー（アプリ）
base: https://gakkyu-tsushin.vercel.app
urls: ["/"]
canonical: "https://www.beetle-web.jp/tools/gakkyu-tsushin/"
sitemap: false
title_contains: "学級通信メーカー"
og_image: "any"
required_selectors: [".app-paper", ".site-footer-app"]
e2e: true
---

# 学級通信メーカー（https://gakkyu-tsushin.vercel.app）

- **目的**: メモの箇条書きからAIが学級通信（見出し＋文章＋イラスト）を生成しPDF出力するアプリ
- **構成**: Next.js（deployは root から `npx vercel --prod`）。紙面1180px 2カラム
- **紙面ルール**: [_common.md](_common.md)「アプリ紙面ルール」に従う。このアプリ固有: 背景は**モザイク**（学校・子ども向け）・ヒーローズバナー**なし**
- **SEO**: canonical はランディング（/tools/gakkyu-tsushin/）へ集約（[_common.md](_common.md)「Tool系ランディング」）
- **挙動（E2Eで検証）**: ページ読込で紙面・入力UI・フッターが表示される（AI生成は実行しない）
- **手動確認観点**: PDF出力の体裁／イラストの割り当て／長文メモ時のレイアウト崩れ
