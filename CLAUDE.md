# BEETLE Web プロジェクト メモ

## コミットについて

新しいファイルを追加したら**必ずその場でコミットする**。

未コミットのファイルは `git reset --hard` や `git clean -fd` で消える。
特に以下は作ったらすぐコミット：
- `style/` 以下のCSSファイル
- `assets/` 以下の画像・SVGファイル
- 新しいツールページ（`tools/xxxx/index.html` など）

## ブランチ運用

作業はブランチを切って行い、確認できたら main にマージする。

```
git checkout -b fix/やること名
# 作業・確認
git checkout main
git merge fix/やること名
git push origin main
```

やめるときはブランチごと捨てる（main は無傷）：
```
git checkout main
git branch -D fix/やること名
```
