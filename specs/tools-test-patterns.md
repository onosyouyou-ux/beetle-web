---
page: TESTパターン集
urls: ["/tools/test-patterns/", "/tools/test-patterns/about/"]
canonical: self
sitemap: true
title_contains: "テスト"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", "#site-footer"]
---

# TESTパターン集（`tools/test-patterns/`）

- **目的**: テストケースの書き方・観点一覧のリファレンス。QA系SEOの主力
- **レイアウト型**: Reference系（[_common.md](_common.md) 参照）。ツール固有のCSS変数は `style/` 以下
- **構成**: 本体（パターン一覧）＋ about/（単体・結合・シナリオの解説ページ）
- **出口の導線（2026-09-15追加）**: 本体ページの末尾に `.site-description` を置き、操作系ツール
  （テストデータ集・ダミーファイル生成・日付ジェネレーター・正規表現テスター・文字化け再現ビューア）と
  テスト技法カタログ・リリース前チェックリストへ送る。
  **このページは8ページから被リンクを受けている参照系のハブなのに、出ていくリンクが1本も無かった**。
  読んだ流れでそのまま試せるようにするための導線なので、消さないこと（`about/` 側には置いていない）
- **手動確認観点**: パターンの内容が現場感とズレていないか／about との相互リンク／
  末尾の導線のリンク先が全部生きているか
