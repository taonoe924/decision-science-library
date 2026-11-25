# Decision Science Library｜論文データ品質監査 v1

監査日：2026-11-25（JST）  
対象：過去配信から抽出された既存の83レコード（2026-W33〜W46）  
監査結果の機械可読データ：[`quality_audit_2026-11-25.json`](quality_audit_2026-11-25.json)

## 重要な注意

本監査は **論文の書誌情報と元データの構造に関する全件点検** と、**一部の書誌情報に対する原典照合** である。83本の論文本文や定量結果を全件読んで照合したものではない。各論文の6見出しの説明・数値・識別仮定は現状 `not_checked_against_original` のまま維持する。

## 全件点検の結果

| 点検項目 | 件数 | 読み方 |
|---|---:|---|
| 収録レコード | 83 | 論文の一意性を完全保証するものではない |
| DOI登録あり | 25 | 形式上の不備0件、実在性の完全照合は未了 |
| DOI未登録 | 58 | DOIが存在しないことを意味しない |
| 原文URL登録あり | 55 | リンク先の論文一致は全件未確認 |
| 原文URL未登録 | 28 | 原典への導線を追加する必要あり |
| RQの構造化欄が空 | 30 | 元Markdownには記載がある可能性あり |
| 仮説の構造化欄が空 | 73 | 元論文に仮説が無い場合もあるため適切に区別 |
| 手法キーワード欄が空 | 15 | 元の解説と原著で照合 |
| 6見出しの検出が6以外 | 4 | 6見出し本文がないとは限らず分割処理を再点検 |
| 表を含むレコード | 54 | Markdown表の検出 |
| Markdown表 | 94 | 1個は見出しだけの空表 |
| 古いChatGPT参照情報を含む元テキスト | 23 | UIで非表示化済み、元データは保存 |
| 正規化タイトル完全一致重複 | 0 | 類似タイトルや別表記の重複を否定しない |
| DOI完全一致重複 | 0 | DOI欠落分の重複を否定しない |
| 外部書誌情報と照合・修正したレコード | 10 | タイトル・DOIなど部分的な書誌確認のみ |
| 本文結果まで原著照合を完了 | 0 | 今後の品質向上工程 |

## 今回修正した10件

| 対象 | 変更点 | 原典・照合情報 |
|---|---|---|
| Conformal Policy Learning with Distribution-Free Safety Guarantees | リンク名→正式英語名、日本語訳、arXivリンク | https://arxiv.org/abs/2609.17296 |
| Thinking versus Doing: Cognitive Capacity, Decision Making and Medical Diagnosis | “NBER Working Paper”→正式名、日本語訳 | https://www.nber.org/papers/w35034 |
| Geodesic Difference-in-Differences | DOIの末尾に混入したWebページIDを削除 | https://doi.org/10.1093/biomet/asag054 |
| A Joint Test of Unconfoundedness and Common Trends | “論文全文”→正式英語名、日本語訳 | https://doi.org/10.1002/jae.70068 |
| TEA-Time: Transporting Effects Across Time | リンク名→正式名、日本語訳 | https://arxiv.org/abs/2603.07018 |
| Transportable Causal Effect Estimation across Networks under Interference | リンク名→正式名、日本語訳 | https://arxiv.org/abs/2608.18932 |
| Policy Learning with Confidence | リンク名→正式名、日本語訳 | https://arxiv.org/abs/2502.10653 |
| Double Reinforcement Learning for Efficient Off-Policy Evaluation in Markov Decision Processes | 日本語RQが入っていた英語タイトル欄を正式名に変更 | https://www.jmlr.org/papers/v21/19-827.html |
| Provision of Social Norm Feedback to High Prescribers of Antibiotics in General Practice | 途中で切れていたDOI・URLを補修 | https://pubmed.ncbi.nlm.nih.gov/26898856/ |
| Megastudies Improve the Impact of Applied Behavioural Science | 日本語の紹介見出しを正式英語タイトルへ変更、日本語訳・DOI・原典URL追加 | https://www.nature.com/articles/s41586-021-04128-4 |

これらの書誌情報を照合しても、本文の数値・因果解釈・推定式が正しいと検証されたわけではない。日本語訳はサイト用の参考訳であり、公式な邦題ではない。

## 次の処理（推奨順）

1. DOI・正式タイトル・原著リンクを **残り73レコード** について順次検証する。まずタイトル抽出誤りや外部リンク欠落があるものから処理する。
2. RQの構造化欄が空の30件、仮説が空の73件について、元の解説にある記載を失わず、著者の仮説とAIによる推論を明確に分けて整備する。
3. 6見出し検出が想定外の4件（W36の要約形式3件、その他1件）をレビューし、必要に応じて説明内容を補充する。
4. 定量結果・95%CI・サンプル数・識別仮定について、代表論文から順に原著の表・ページと照合する。
5. 定期配信の登録処理に対して、タイトルが汎用リンク名でないこと、IDの重複、リンク、必須フィールドを自動チェックする。新規配信の自動取込は別途運用テストが必要。

**証拠の区別**：`source_text` は過去配信のMarkdown。これは原著の代替にはならない。 `bibliography_status=verified_title_or_doi` は書誌情報の一部確認、`verification=not_checked_against_original` は本文に関する未照合を表す。
