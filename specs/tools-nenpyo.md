---
page: 年表修行（アプリ）
urls: ["/tools/nenpyo/"]
canonical: "https://www.beetle-web.jp/tools/nenpyo/landing.html"
sitemap: false
title_contains: "年表修行"
og_image: "/assets/images/OG.jpg"
required_selectors: ["#site-header", ".app-paper", ".site-footer-app", "#kk-app", "#howto", ".paper-release"]
---

# 年表修行（`tools/nenpyo/`。#168・2026-10-14）

- **目的**: 歴史の年号を 4択で おぼえる。小学校（小6の社会）と 中学校の 歴史に対応
- **メニュー**（2まい）
  - 1まいめ：がっこう（しょうがっこう／ちゅうがっこう）。押すと そのまま 2まいめへ
  - 2まいめ：とき方（年号 → できごと／できごと → 年号／まぜて）と じだい（古代〜平安／鎌倉〜江戸／明治〜いま／ぜんぶ）。
    **両方えらぶまで スタートは押せない**。画面に来たときは 何も えらんでいない（修行アプリ共通の約束）
- **出しかた**: 1セット10もん。えらんだ じだいの できごとから 重ならずに 10こ。
  まちがいの選択肢は **年が近い できごと6こから3こ**（遠いと 時代だけで 当てられるため）。「まぜて」は 1もんごとに 交互
- **まちがえたとき**: 正解（年＋できごと）・時代・ひとこと せつめい、ある時は「おぼえかた：」で 語呂合わせ。
  **語呂合わせは 問題文には出さない**（語呂がないと 答えられない子に しないため）
- **データ**: `js/nenpyo-data.js`（`NENPYO_DATA`）が 単一の データ源。`{ y, e, era, band, chu?, note?, goro? }`。
  `chu: true` は 中学校だけで出す。小学校48こ・中学校は それを ふくめて89こ（2026-10-14）。同じ年は 入れない
  - **鎌倉幕府は 1185年**（守護・地頭）。「いいくにつくろう 1192」は「源頼朝が 征夷大将軍になる」として 別に入れる
- **見た目**: 盤面と けっか は かけざん修行の部品（`kk-`。`kuku.css`＋`ninja-kids.css`）を借り、差分は `css/nenpyo.css`。
  body は `ninja-kids ninja-kuku ninja-nenpyo`。箱の id は `#kk-app`（共通の指定を借りるため）。色は こげ茶 `#9a5a2c`
- **GA4**: `app: 'nenpyo'`・`mode: year|event|mix`・`level: sho|chu:じだい`（例 `chu:bushi`）
- **レスポンシブ**: [_common.md](_common.md) の共通ルール。2まいめは PC で とき方3つ・じだい4つを 横1列、スマホは とき方3つ横・じだい2×2。
  1440x900・1366x657・1093x520・768x1024・852x393・390x660 で スタートが1画面に入り、窓が中でスクロールしないことを実測（2026-10-14）
- **ランディング**: `tools/nenpyo/landing.html`（[tools-nenpyo-landing.md](tools-nenpyo-landing.md)）。アプリの canonical / og:url はランディングを指す
- **まだ**: 忍者の絵（いまは 全員集合の絵を借りている）・OGP画像・修行いちらん／きょうの修行／app-dates への追加
- **手動確認観点**: 年号が いまの教科書と合っているか／選択肢の できごとが 4つとも ちがう年か／長い できごと名が ボタンから はみ出さないか
