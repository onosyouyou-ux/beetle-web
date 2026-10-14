# 先生向けページ：縦長サムネイルの見本

- 作成日：2026-10-14（日本時間）
- 対象：for-teachers.html の「アプリと配りかた」
- 生成方法：組み込み image_gen
- 見本：assets/images/teacher-thumbs/sansu-portrait-v1.png
- 配置：上に「さんすう」、その下に既存の宇宙忍者とロケットを大きく配置。
- PCの表示目安：幅200px、高さ250px前後（4:5）。現状のサムネイル上端から「リンクをコピー」の少し上までを使う。
- 「くわしい説明」まで伸ばす案も検討したが、操作部分とのバランスからコピー操作の上で止める案とする。
- 8本を同じ構成で揃えるための最初の見本。残り7本の制作、最適化、ページ組み込みはIssueで管理する。
- カードは data/teacher-apps.json と scripts/teacher-kit/build.mjs が生成するため、組み込みはデータ／生成元で行う。
- スマホで縦長画像がカード幅いっぱいに巨大化しないよう表示幅も調整する。

## 最終生成プロンプト

```text
Use case: ads-marketing
Asset type: Portrait thumbnail image for the "Apps and how to distribute them" cards of a teacher-facing Japanese educational website. Final display about 200 px wide by 250 px tall. Create a single finished portrait illustration with a 4:5 aspect ratio.
Input image: character identity reference. Preserve the same smiling child space-ninja: indigo space suit, blue/silver helmet with forehead star plate, purple scarf, large brown eyes, sitting on the white rocket with red nose cone and red fins, blue porthole.
Layout: At the TOP put a single large clear white Japanese title exactly "さんすう". One centered line of bold friendly rounded Japanese lettering, with restrained dark purple outline for readability. Give title its own clean space around the top 18% of the image. Under the title, enlarge the ninja and rocket to fill the remaining image. Character face is the main focus, with helmet/head about 40% image width. Show complete rocket and cheerful ninja in dynamic upward diagonal flight. One hand raised with index finger like the reference. Keep face and title separate; no overlap.
Backdrop: vibrant deep purple space background with a gentle violet gradient, sparse small gold stars and a restrained cyan orbit arc at the bottom. Match the playful glossy cel-shaded style of the reference, bold crisp outlines, rich smooth highlights. The illustration fills the portrait canvas with a rectangular background; no transparency. Full bleed without external margin, no outer button frame. Clear at small sizes.
Text (verbatim): "さんすう"
Constraints: only this title, no subtitle, no captions, no other Japanese or Latin text, no numbers, no CTA, no arrow or chevron, no QR code, no watermark, no logo, no additional characters, no cut-off helmet or rocket nose. This is a large character portrait card illustration, not a horizontal button and not a mockup of the website. Keep the title large and the character larger than the old tiny wide banners.
```
