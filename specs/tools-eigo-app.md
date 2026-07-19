---
page: えいごよんで！アプリ本体
urls: ["/tools/eigo/"]
canonical: "https://www.beetle-web.jp/tools/eigo/landing.html"
sitemap: false
title_contains: "えいごよんで"
og_image: "/assets/images/og-eigo.jpg"
required_selectors: ["#site-header", "#app"]
e2e: true
---

# えいごよんで！アプリ本体（`tools/eigo/index.html`）

- **目的**: 小学生向け英語発音練習ツール（Web Speech API・サーバー不要）。詳細仕様は `SPEC.md` 参照
- **レイアウト型**: Tool系静的アプリ（[_common.md](_common.md)「アプリ紙面ルール」参照。背景はモザイク・更新日は手動更新）。canonical はランディングに向ける（SEO評価の集約）
- **主な仕様**（SPEC.md より）: 単語/英文モード・3〜6スロット・履歴50件（localStorage `eigoHistory`）・読み上げは en-US
- **挙動（E2Eで検証）**: ページ読込で `#app` にUIが描画される（JSクラッシュ検知）
- **手動確認観点**: 実機での読み上げ音声（自動テストでは音は検証できない）／SPレイアウト
