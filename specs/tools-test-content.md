---
page: ダミーファイル生成ツール
urls: ["/tools/test-content/"]
canonical: self
sitemap: true
title_contains: "ダミーファイル"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".site-footer-app", ".footer-heroes", ".faq-item", ".site-description"]
---

# ダミーファイル生成ツール（`tools/test-content/`）

- **目的**: テストデータ・サンプルPDF/CSV/Excelをブラウザ内で生成する静的ツール
- **レイアウト型**: Tool系（本体配信の静的ツール。ランディングなしのためリファレンスボタンは置かない）
- **QA系ツールで実際にいちばん見られているページ**（2026-09-15時点で約65表示/週。CIの水増しを含まない実数）。
  ここを入口に他のツールへ送る役目があるので、**末尾の `.site-description` の導線を消さないこと**
- **画面のFAQとJSON-LDのFAQPageは同内容**（6問）。片方だけ直さない。
  2026-09-15まで **JSON-LDにだけFAQがあり画面には無い**状態だったので、画面側を追加して揃えた
- **正直に書くところ**: 動画・音声で再生できるのは WebM だけで、MP4・MOV・AVI・WMV・MP3・WAV・AAC は
  **サイズ確認用のダミー（再生不可）**。ページとFAQの両方でそう書く。ここを曖昧にすると
  「開けないファイルが作られた」という誤解になる
- **サイズ指定**は「以上／未満」を切り替えられる。上限10MBのような境界値を2本作れるのが実務上の価値
- **手動確認観点**: 生成ファイルが各形式で正しく開けるか／文字コード（CSVのBOM等）／
  FAQの開閉／`.site-description` のリンク先が全部生きているか
