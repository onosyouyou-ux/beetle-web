---
page: バグ報告の環境情報コピー
urls: ["/tools/env-info/"]
canonical: self
sitemap: true
title_contains: "バグ報告の環境情報コピー"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".site-footer-app", ".footer-heroes", "#tool", "#ei-format", "#ei-template", "#ei-url", "#ei-rows", "#ei-out", "#ei-copy", "#share", "#why", "#faq"]
---

# バグ報告の環境情報コピー（`tools/env-info/`）

- **目的**: 開いた端末のブラウザ・OS・画面サイズ・拡大率・言語・タイムゾーンなどを読み取り、バグ票に貼れる記法でコピーする静的ツール（2026-09-17追加。板のアイデアカードから）
- **レイアウト型**: Reference系（[_common.md](_common.md) 参照）＋インタラクティブ部。組み方は `test-dates` と同じ
- **構成**: `#tool`（環境情報をコピー）→ `#share`（お客さまに開いてもらう）→ `#why`（ブラウザから分からないこともある）→ `#faq`（6問。画面とJSON-LDは同内容）
- **主要素**: `#ei-format`（md / backlog / jira / redmine / text）・`#ei-template`（再現手順のひな形。既定オン）・`#ei-url`（任意。入れると表の先頭に行が増える）・`#ei-rows`（項目ごとに「貼る」チェック）・`#ei-out`・`#ei-copy`・`#ei-refresh`・`#ei-share-copy`
- **芯（変えると意味が消える）**:
  - **分からないものを推測で埋めない**。User-Agent は意図的にぼかされている（Windows 10/11 はどちらも `Windows NT 10.0`、macOS は `10.15.7` 固定、Android は `Android 10; K`）。
    `navigator.userAgentData.getHighEntropyValues` が使えるとき（Chrome・Edge）だけ正確な値を出し、使えないときは「見分けられません」「ブラウザが隠しています」と書く
  - Windows 11 の判定は `platformVersion` の先頭が 13 以上
  - Mac を名乗っていてタッチ点数が2以上なら「iPadOS（Macと名乗っています）」
  - LINE・Instagram・Facebook のアプリ内ブラウザは、中身のエンジンより先にアプリ名を出す（Cookie やログイン状態が分かれるため）
  - **コピーを押した瞬間に読み取り直す**（日時とウィンドウの大きさをコピー時点の値にする）
  - チェックを外した項目は、読み取り直しても外したまま
  - 送信なし・保存なし（localStorage は「使えるか」の確認で1回書いてすぐ消すだけ）
- **記法**: Markdown は `|` を `\|` にエスケープ。Backlog（見出し `**`・番号 `+`・表の見出し行 `|…|h`）、Jira（`h2.`・`#`・`||`）、Redmine（`h2.`・`#`・`|_.`）は `|` を全角の `／` に置き換える
- **検算（2026-09-17）**: Chrome（Windows 11）の実機で全項目を確認。User-Agent を差し替えて
  Firefox/Windows・Safari/macOS・iPad（Mac名乗り）・iPhone の Chrome・Android（縮小UA）・LINE（iPhone）・Edge/Windows 7 の7通りでブラウザ・OS・端末の判定を確認した
- **手動確認観点**: 実機の iPhone・iPad・Android で開いたときの表示／Backlog・Jira・Redmine に実際に貼って表が崩れないか
