---
page: ルビメーカー（アプリ）
base: https://rubi-shokunin.vercel.app
urls: ["/"]
canonical: "https://www.beetle-web.jp/tools/rubi-shokunin/"
sitemap: false
title_contains: "ルビメーカー"
og_image: "any"
required_selectors: [".app-paper", ".site-footer-app"]
e2e: true
---

# ルビメーカー（https://rubi-shokunin.vercel.app）

- **目的**: 文章を貼ると漢字にルビを自動付与。画像からの読み込み（OCR）にも対応するアプリ
- **構成**: Next.js（deployはアプリディレクトリから `npx vercel --prod`）。紙面内コンテンツ幅620px
- **紙面ルール**: [_common.md](_common.md)「アプリ紙面ルール」に従う。このアプリ固有: 背景は**モザイク**（学校・子ども向け）・ヒーローズバナー**なし**
- **SEO**: canonical はランディング（/tools/rubi-shokunin/）へ集約（[_common.md](_common.md)「Tool系ランディング」）
- **挙動（E2Eで検証）**: ページ読込で紙面・入力UI・フッターが表示される（AI処理は実行しない）
- **手動確認観点**: ルビの精度（固有名詞・熟語）／画像OCRの精度／ふりがな表示の行間
