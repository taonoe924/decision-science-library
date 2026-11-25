# Decision Science Library

因果推論・意思決定科学の研究を、論文だけでなく Research Question (RQ) から探索する静的Webサイトです。

## 現在の状態

- GitHub リポジトリ作成済み
- 公開前：サイト本体の v1.2 ファイルはまだアップロードされていません
- 元ファイル: `decision_science_site_v12.zip`（このチャットで配布したもの）
- 既存モックのデザイン・日本語／英語タイトル併記・MathJax 数式描画・数式枠なしの仕様を維持します

## v1.2 の配置方法

1. `decision_science_site_v12.zip` をローカルPCで解凍します。
2. 解凍したフォルダ内の **index.html、assets フォルダ、data フォルダ** を GitHub の `Add file → Upload files` へドラッグ＆ドロップします。
3. `Commit changes` を押します。重要：`index.html` はリポジトリのルート（最上位）に配置してください。
4. GitHub の `Settings → Pages → Build and deployment` で Source: `Deploy from a branch`、Branch: `main`、Folder: `/(root)` を選び、Save します。
5. `https://taonoe924.github.io/decision-science-library/` で表示を確認してください。

## 必要なファイル

```
index.html
assets/
  app.js
  papers.js
  style.css
data/
  papers.json
.nojekyll
README.md
```

`data/papers.json` は原著照合前のデータを含みます。確認済みでない書誌情報・定量結果・翻訳は暫定情報として取り扱ってください。

## 更新方針

論文追加や数式・表示修正は v1.2 を基準に進めます。MathJaxの数式ライブラリはCDNから読み込むため、閲覧時のインターネット接続が必要です。
