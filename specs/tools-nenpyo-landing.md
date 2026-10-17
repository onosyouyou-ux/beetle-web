---
page: 年表修行 ランディング
urls: ["/tools/nenpyo/landing.html"]
canonical: self
sitemap: true
title_contains: "年表修行"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".eal-hero", "#howto", "#for-family", "#faq", ".eal-final", ".eal-footer"]
---

# 年表修行 ランディング（#168・2026-10-15）

- **目的**: 検索・教育ツール一覧から受けるSEO集客面。アプリ本体 `/tools/nenpyo/` への入口。
  検索語は「歴史 年号 暗記」「年表 覚え方」「鎌倉幕府 何年」。**定期テスト前（6・10・11・2月）と中学受験期**に伸びる想定
- **レイアウト型**: 教育系Toolランディング（`/css/edu-app-landing.css` ＋ `/css/ninja-landing.css` を修行と共用。body は `ninja-landing ninja-lp-nenpyo`）
- **構成**: ヒーロー → 3つの とき方 → 年の近い選択肢（WHY）→ 使い方3ステップ → おうちのかたへ → 先生へ → FAQ → CTA
- **とき方の名前はアプリのボタン名にそろえる**（年号 → できごと／できごと → 年号／まぜて とく）。カード見出し・FAQ・meta・JSON-LD も同じ
- **訴求の軸**: 「年号は できごとと セットで、両方の向きから」。語呂合わせアプリとして売らない（語呂は ヒントだけ）
- **鎌倉幕府の年**: 1185年で出すことを FAQ と おうちのかたへ に書く（保護者の世代は1192年で習っているため、ちがって見える）
- **WHY は 絵なしの ポイント4つ**（忍者の絵が できたら `.eal-feature` の2カラムに直す）
- **先生へ**: 配布用PDF・for-teachers.html の節は まだ無いので、ボタンは for-teachers.html への1つだけ
- FAQ を変えたら JSON-LD FAQPage も同じ内容に直す
