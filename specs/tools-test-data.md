---
page: 意地悪テストデータ生成器
urls: ["/tools/test-data/"]
canonical: self
sitemap: true
title_contains: "意地悪テストデータ生成器"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".site-footer-app", ".footer-heroes", "#catalog", "#td-len-out", "#td-dummy-out", "#td-count-in", "#td-flags"]
e2e: true
---

# 意地悪テストデータ生成器（`tools/test-data/`）

- **目的**: 入力欄の検証で使う「意地悪データ」（機種依存文字・絵文字・サロゲートペア・不可視文字など）をワンクリックでコピーできる静的ツール。日本向けダミーデータ生成と文字数・バイト数カウンターを同居させ、入力欄まわりの検証をこの1ページで完結させる
- **レイアウト型**: Reference系（[_common.md](_common.md) 参照）＋インタラクティブ部
- **構成**: `#catalog`（意地悪データ集：文字種・エンコード／数値・記号／エスケープ漏れの3グループ）→ `#length`（長さ・境界値の文字列生成）→ `#dummy`（日本向けダミーデータ生成）→ `#counter`（文字数・バイト数カウンター）→ `#faq`
- **主要素**: `.td-copy`（コピーボタン。`data-v`＝そのままの文字列／`data-esc`＝`\n` `\t` `\uXXXX` を含む文字列／`data-target`＝出力欄のid）・`#td-len-out`・`#td-dummy-out`・`#td-dummy-table`・`#td-count-in`・`#td-stats`・`#td-flags`
- **挙動（E2Eで検証）**:
  - カタログのコピーボタンを押すとラベルが「コピーしました」に変わる（クリップボード権限がない環境でも textarea フォールバックで動く）
  - 長さ生成で `256` を指定すると `#td-len-out` が256文字になり、`#td-len-info` にバイト数が出る
  - ダミーデータ生成で件数ぶんの行が `#td-dummy-out` に入り、表は先頭10件のみ表示
  - `#td-count-in` に絵文字やサロゲートペアを入れると `#td-flags` に該当フラグが出る（Shift_JIS換算は「変換不可」表示になる）
- **実装上の約束**: 不可視文字・制御文字の判定はソースに直接書かず `clsRe()` でコードポイントから組み立てる（ソースに生の制御文字が混ざると編集事故になるため）。生成・判定はすべてブラウザ内で完結し、サーバー送信は一切しない
- **手動確認観点**:
  - 各カードのサンプル表示（`.td-sample`）と実際にコピーされる文字列が一致しているか（特に不可視文字系はコピー結果をカウンターに貼って確認）
  - ダミーデータの氏名・住所が実在の個人・法人に見えないか（注意書き `.td-caution` の掲示を維持）
  - Shift_JIS換算が「目安」であることがFAQと画面表記の両方に書かれているか
