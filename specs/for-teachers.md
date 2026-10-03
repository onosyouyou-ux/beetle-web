---
page: 先生向けのご案内
urls: ["/for-teachers.html"]
canonical: self
sitemap: true
title_contains: "先生向け"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".brand-hero", "#promise", "#apps", ".ft-app", ".ft-copy", "#print", "#contact", ".footer-link-bar"]
---

# 先生向けのご案内（`for-teachers.html`）

- **目的**: こども向けの修行アプリ8本を、先生が授業・宿題で配りやすくする（#96。ロイロノート経由で授業でも使われ始めたため。2026-10-03新設）
- **レイアウト型**: Reference系。`edu-tools.html` と同じ土台（`test-tools.css` ＋ `edu-tools.css`）に、差分を `/css/for-teachers.css` に持つ。フッターは LP型2段（[_common.md](_common.md)）
- **構成**: 01 安心して配っていただくために（約束6つ）／02 アプリと配りかた（8本のカード）／03 配布用プリント（PDF）／04 FAQ（JSON-LD FAQPage と同内容）／お問い合わせCTA
- **01 の約束は、コードで確かめた事実だけを書く**（2026-10-03 確認）
  - 外部への送信（fetch・XHR・sendBeacon）がない。fetch は共通のヘッダー・フッターと version.json だけ
  - 広告タグ（adsbygoogle・doubleclick・googlesyndication）がない
  - localStorage に成績を残すのは さんすう・さくらんぼざん だけ（ほかは「おおきく かく」の大きさだけ）
  - 外部につなぐのは Google アナリティクスと Google Fonts（さんすう・さくらんぼざん の書体と common.css）だけ。FAQ にもそう書く
  - GA4 のカスタムイベント（#97：どの練習を何問正解で終えたか）を前提に「数だけ計測」と書いている
  - **アプリのしくみを変えたら（保存・送信・外部の読み込み）、ここの文言も見直す**
- **02 のカード・QR・PDF は `data/teacher-apps.json` が単一のデータ源**。`node scripts/teacher-kit/build.mjs` で
  ページのカード（`<!-- teacher-apps:start -->`〜`end` の間）・`assets/images/qr/{id}.svg`・`assets/pdf/teacher-kit-*.pdf` をまとめて作り直す。**カードは手で直さない**
  - 実行は Windows の node から（PDF に Chrome を使う。WSL の Chromium は共有ライブラリが足りず起動しない）。qrcode は `scripts/teacher-kit` で `npm install`
  - 一覧版が1枚・個別版がアプリ数ぶんのページに収まらないと、スクリプトが止まる
- **リンクとQR**
  - 「リンクをコピー」は utm なしの素のURL（子どもにも読める形）
  - ページのQR（電子黒板に映す用）：`?utm_source=teacher_page&utm_medium=qr&utm_campaign=for_teachers`
  - 印刷のQR：`?utm_source=print&utm_medium=qr&utm_campaign=teacher_pdf`。誤り訂正 M・黒白。外部のQR APIは使わない
- **PDF**: A4・白黒で読める配色。書体は BIZ UDPゴシック（Windows の Chrome で出力するため）。
  一覧版＝8本を1枚（QR 32mm）／個別版＝1アプリ1枚（QR 90mm・子ども向けのひとこと・おうちのかた向けの説明）
- **入口**: `edu-tools.html` の 03 こども向け・04 先生向け の見出しの下、`apps.html` の 02 先生向け の見出しの下（`.teacher-guide-link`）。グローバルメニューには足さない
- **手動確認観点**: PDF のQRをスマホのカメラで読んで、utm 付きのアプリURLが開くか／「リンクをコピー」で素のURLがコピーされるか／アプリを足したら8→9本の文言（title・description・PDFの見出し）も直したか
