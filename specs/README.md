# specs/ — 画面仕様書（テスト連動型）

各画面の仕様書。**frontmatter（`---` で囲まれた部分）が自動テストの期待値**になっており、
`tests/run-static.mjs` がこのディレクトリの全 `.md` を読んで本番URLに対して検証する。

仕様を変えるときは frontmatter を直す → テストが新しい期待値で検証する、の一方通行。
テストコード側に期待値を書かないこと（二重管理禁止）。

## frontmatter の書式

パーサを単純にするため **値は JSON リテラル**（文字列は `"..."`、配列は `["a","b"]`）で書く。

```yaml
---
page: トップLP                     # 画面名（表示用）
base: https://www.beetle-web.jp    # 省略時は本体ドメイン
urls: ["/"]                        # 検証対象パス（複数可。共通仕様を全URLに適用）
canonical: self                    # self=自分自身 / "none" / 明示URL
sitemap: true                      # 本体 sitemap.xml に載っているべきか
title_contains: "BEETLE合同会社"    # <title> に含まれるべき文字列
og_image: "/assets/images/og-top.jpg"  # 期待するog:image。"any"=存在すればOK / "none"
required_selectors: ["#site-header", ".footer-lp"]  # 必須要素（#id / .class）
forbid_inline_style: true          # <style> ブロック禁止（規約）。省略時 true
meta_description: true             # meta description 必須。省略時 true
e2e: false                         # Playwright E2E の対象か（テストは tests/e2e/）
---
```

## 検証内容（run-static.mjs が全URLに対して行うこと）

1. HTTP 200 で応答すること
2. `<title>` が `title_contains` を含むこと
3. canonical が期待値と一致すること
4. og:image が期待値と一致し、その画像URLが 200 で取得できること
5. `required_selectors` の要素がHTMLに存在すること
6. インライン `<style>` が無いこと（コーディング規約）
7. meta description があること
8. sitemap.xml との整合（`sitemap: true` のURLが登録されているか）＋sitemap全URLの死活

## 本文（人間向け仕様）の書き方

frontmatter の下に、画面の目的・構成・自動化できない確認観点を書く。
テンプレート：

- **目的**: この画面が何のためにあるか（1〜2行）
- **レイアウト型**: Reference系 / Tool系 / LP型（CLAUDE.md「ページレイアウト型」参照）
- **主な構成**: セクションの並び
- **手動確認観点**: 自動テストでは拾えない見た目・文言・導線のチェックリスト

## 共通仕様（`_common.md`）

ヘッダー・フッター・レイアウト型・カードルール・SEO共通ルールなど**画面をまたぐ共通パーツは `_common.md` に一元化**してある。

- 各画面の仕様書には共通部分を書かず、`[_common.md](_common.md) 参照` と書く
- 共通部分を変えるときは `_common.md` を直す（参照元すべてに効く）
- `_` 始まりのファイルは run-static.mjs が検証対象外としてスキップする（frontmatter 不要）

## 検証対象外のページ

- `logo-preview.html`・`tools/mock.html` — 開発用プレビュー。sitemap 未登録・仕様書なしで良い
- `google0e723b144d7e79b2.html` — Google Search Console の所有権確認ファイル
- `partials/*.html` — ページではなく共通部品（仕様は `_common.md` に記載）

## 新しい画面を作ったら

1. この形式で `specs/<画面名>.md` を追加（共通部分は書かず `_common.md` を参照）
2. `node tests/run-static.mjs` をローカル実行して green を確認
3. ページ本体と同じコミットに含める
