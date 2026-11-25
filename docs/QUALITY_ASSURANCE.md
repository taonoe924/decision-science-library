# Decision Science Library — 品質管理基準

最終更新：2026-11-25

## 目的
本ライブラリは研究を探索し、研究設計や意思決定を検討するための二次資料です。原論文そのものや、査読済みの系統的レビューを代替しません。研究の定量的な意思決定に使用する場合は、原著のTable/Figure/Appendixも必ず参照してください。

## 原著照合の区分
| 管理値 `substantive_verification` | 意味 |
| --- | --- |
| `not_checked_against_original` | 原著の確認未実施 |
| `partial_abstract_or_primary_source_checked` | 原著・出版社要旨・大学等の一次公開情報の一部を照合。全数値・推定式の正しさは未保証 |
| `partially_checked_against_primary_sources` | 指定した原著本文の箇所に対して、方法論・定量結果の一部を照合。論文全体の網羅的な監査ではない |

2026-11-25時点の基礎データ83件には部分照合の記録がありますが、**全83件について原著全文の完全検証が終わったことを意味しません。** 一部では出版社要旨・研究機関の公開紹介に限って照合しています。

## 原著照合ノートに記録すること
- 原著へのリンク（出版社、学会、arXiv、学術機関など）
- 確認箇所（要旨、本文の節、Table番号、Figure番号など）
- 確認した論点：正式タイトル・RQ・対象集団・デザイン・識別仮定・Outcome・主要結果
- 未確認の論点（数字、単位、母数、CI、頑健性、付録など）
- 自分の応用・考察と、著者が実証した結果を区別する

## 定量結果の取り扱い
1. 効果の尺度と比較対象を記す（差、比率、率、HR/OR/IRR、ATE/ATTなど）
2. 分母、対象期間、サンプル数、95%CI/SEを原著で確認し、出典位置を記す
3. 有意差なしを「効果がゼロ」と書き換えない
4. 信頼区間、識別集合、事後信用区間を混同しない
5. 原著に記載がない数字は推測・再構成で埋めない
6. 著者の主張と、解説者による応用例・政策的含意を区別する

## 構造的な品質ゲート
`node scripts/quality-audit.mjs` でローカル検査可能です。GitHub Actionsワークフロー `.github/workflows/library-quality.yml` も設定しています。ここでは**データ構造**を点検します：ID・重複・日付・URL・本文有無・Markdownの表の列数・数式区切り・確認状態・配信マニフェスト。

**重要：この機械検査だけでは原著との真偽・リンク先の公開状況・ブラウザ上の表示・数式の意味は検証できません。** 新規論文の登録時は、別途、原著の実物に基づく内容照合が必要です。記録の自己申告だけでは学術的な正確性を保証できません。

## 未完了の品質課題
- 83論文全体の効果量、95%CI、識別仮定、標本サイズ、数式の全文照合
- 個別論文ページの配信横断総括の分離は34件対応済み。今後の新規配信でも分離する運用を維持
- 表の本体行が存在しない原稿の追跡（個別論文本文は解消済み。配信全体の総括には別途原文を保持）
- PCとスマートフォンの公開サイトにおける表示テスト、外部リンク疎通テスト
- GitHub Actionsワークフローの実行結果を確認すること

## 更新手順
1. 原著（または一次公開要旨）を開く
2. 記述と出典箇所を照合し、`original_review` に証拠と未確認箇所を記録
3. `substantive_verification` を照合した範囲に応じて更新
4. `node scripts/quality-audit.mjs` で構造チェック
5. GitHub PagesのPC・スマートフォン画面を目視確認し、必要なら修正

## 2026-11-25 STEP 3 実施記録
- 原著・要旨等の部分照合は83/83件。これは基本照合であり、原著全文の監査完了ではない。
- 重点的な数値照合は8論文。 `detailed_review` に出典・本文内の所在・照合範囲を保存。うち2論文は要旨の主要数値のみで、本文の全推定値は未照合。
- 配信横断の考察を個別論文本文から34件分離し、`digest_context` として元の文言を保持。各ページでは折りたたみ表示する。
- 旧配信データの単独の `$` 行で囲まれた数式について、表示時にブロック数式へ正規化する。
- 構造品質チェックの再実行：83件・80表、エラー0件、既知の短報3件の警告。これはブラウザの目視検証ではない。
- GitHub Actionsは登録済みだが、実行成功の確認は別途必要。


## 2026-11-25 新規配信の公開前審査（v1）
定期タスク「Decision Science Papers」は月・水・金曜8時（Asia/Tokyo）に因果推論2本・データ×意思決定2本を紹介する。タスクのプロンプトには、原著照合・結果の数値照合・誤読防止・未達時のサイト公開保留を明記した。

### 公開する手順
1. 原著の正式な書誌情報、RQ、識別条件、処置、比較群、Outcome、主要結果を本文・表・図と照合する。確認できない数値・95%CIを補完しない。
2. 日付別データは `data/digests/YYYY-MM-DD.json` に4件のJSON配列として作る。1〜2件目は `digest_category: "causal"`、3〜4件目は `"decision"`。
3. 各レコードに `publication_status: "approved"`、`substantive_verification: "partially_checked_against_primary_sources"`、`original_review`（出典URL・locator・scope）、`original_review_checked_on`、`quality_review`を入れる。6見出しと具体的な一次資料の照合がそろうまでapprovedにしない。
4. `quality_review` は `schema_version:1`、`approved:true`、`reviewed_on`、6チェック項目のboolean、`evidence`（最低2件、うちdesignとresult各1件）で構成する。各evidenceには `type, source_url, locator, claim` を必ず記録する。
5. `node scripts/test-digest-quality.mjs` と `node scripts/quality-audit.mjs` の両方で確認し、4件すべてが合格した時だけ `data/digests/index.json` の `dates` へ登録する。未達なら日付を登録しない。下書きは `publication_status:"draft"` として保存可能だが、サイトに表示されない。
6. ブラウザ側の `assets/digest-quality.js` でも日付別4件を一括審査する。合格しなかった配信回は、GitHubへファイルが存在しても**公開ページには表示しない**（fail closed）。

### このゲートの限界
この品質ゲートは、**検証記録・6見出し・公開承認・出典箇所等の必須項目の充足を機械的に確認**する。チェック欄や引用箇所の真偽、数値の意味、原著本文の読解を独立に立証する機能はない。公開前に原著の指定箇所を実際に読み照合することが不可欠。

また、GitHubへの保存成功と、GitHub Pagesへの配信完了は別の事象である。定期実行時にGitHubのツール権限がない場合、原著の一部が取得できない場合、GitHub Actionsが失敗した場合は、サイト登録が保留される。運用上、配信日とサイト掲載日が一致しないことがある。

今後の課題：GitHub Actions成功の実績確認、公開サイトのPC・スマートフォン表示検証、残りの論文の数値・識別仮定の深掘り。

### 2026-11-25 STEP 3 詳細照合・追加バッチ
- 重点監査済みは **14/83論文**。最新の追加6件はCausalVerify、DML、Sun–Abraham、DRL、短期実験→長期継続介入、Surrogate Index感度分析。
- 各論文の `detailed_review.status` は対象を区別する：
  - `selected_results_checked_against_original`：指定された原著の数値・推定対象を部分照合
  - `selected_theoretical_claims_checked_against_original`：原著の理論・設計の主張を部分照合（数値性能は未照合の場合がある）
  - `selected_results_checked_against_source_excerpt`：書誌・原著要旨と公開テキストを照合。原著PDF図表の再確認が未完了
- CausalVerifyの**66/426=15.5%**は、40件の許容範囲外推定と26件の対象係数抽出不可を含む。後者を誤推定値の提示と誤記しない。
- DMLの401(k) Table 2は、DML2・Interactive・RF・2-foldのATE=7,770ドル、分割ごとのSE中央値1,276ドル、分割変動調整後SE1,363ドルを区別。
- Surrogate Indexのプレプリントについて、元データに記載された「9月7日改訂版」を削除。公開arXivで確認できる版は2026年2月28日のv1。Worst-case識別区間と両端点の95%CIは別の対象として記録。
- 本文・付録・定理の全件検証は未完了。今後の追加監査では論文版と原著の表番号・尺度を併記。
