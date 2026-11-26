# Decision Science Library

因果推論・意思決定科学の論文を、研究課題（RQ）、識別戦略、効果量、意思決定への示唆から探す静的Webライブラリです。

**サイト**：[Decision Science Library](https://taonoe924.github.io/decision-science-library/)

## 現在の状況（2026-11-26）

- 既存ライブラリの論文レコード：**83本**
- 6章構成の機械的チェック：**83/83本**
- 一次公開情報・原著への監査記録と参照リンク：**83/83本**
- 原著のTable/Figureや公式要旨・著者公開結果を**構造化した定量情報：5論文・31項目**
- 定量情報の表示：各論文ページの「一次資料と照合した定量情報」（折りたたみ表）

**重要**：「監査記録あり」は論文の全文・全定理・すべての数値結果・95%CIの検証が終わったという意味ではありません。監査範囲と未確認事項を論文ごとに表示しています。要旨の概数、論文本文の表の数値、著者公開資料の結果を区別してください。

## サイトの主な機能

- 今週の4本、論文ライブラリ、RQ探索、論文比較、研究ネットワーク、配信アーカイブ
- 日本語・英語の論文タイトルを併記
- MathJax数式、Markdown表の横スクロール対応
- 論文単体の6章構成と週次横断コメントの表示上の分離
- 原著照合の範囲と一次資料リンクを表示
- 出典の対応が取れた数値には推定対象、推定値、SE、95%CI、単位、解釈上の注意を記録

## ファイル構成

```text
index.html
assets/
  app.js
  papers.js
  digest-quality.js
  style.css
data/
  digests/
    index.json
    YYYY-MM-DD.json（配信がある日）
scripts/
  quality-audit.mjs
  test-digest-quality.mjs
  validate-library.mjs
  browser-smoke.mjs
.github/workflows/
  library-quality.yml
docs/
  quality-audit-2026-11-26.md
```

## 品質チェック

GitHub Actions の [Decision Science Library quality gate](https://github.com/taonoe924/decision-science-library/actions/workflows/library-quality.yml) で、データ品質と画面表示のチェックを実行する構成です。

- 静的構造、書誌・一次資料リンク、6見出し、重複、テーブル記法、数式区切り
- 定期配信4本の承認・ソース証拠・検証条件
- `quantitative_evidence` の出典、表・図名、効果量・標準誤差・CIの記録構造と数値区間の順序
- Chromiumでのデスクトップ（1280px）・モバイル（390px）描画スモークテストとスクリーンショット（GitHub Actions内）

手元で構造チェックする場合：

```bash
node scripts/quality-audit.mjs
node scripts/test-digest-quality.mjs
node scripts/validate-library.mjs
```

ブラウザのスモークテストはPlaywrightの導入が必要です。自動テストの**設定・実装**とGitHub Actions上の**実行成功**は別です。実行結果はActionsで確認してください。

## 未完了の課題

1. 全83論文について原著のTable/Figure/Appendixと数値・標準誤差・95%CIを網羅的に照合すること
2. 一部の独立した章説明、数式、RQ・仮説・分類を原著原文と詳細に照合すること
3. 公開サイトを実端末で目視確認すること（ローカルChromiumの自動テストだけでは完全に代替できません）
4. 定期配信ごとの新規論文が掲載時点の版と一致しているかを継続監視すること

## 免責

解説には原著未検証の項目が含まれる場合があります。研究・経営判断に使う際には一次資料と、各論文ページに記載した識別仮定・推定対象・不確実性を確認してください。
