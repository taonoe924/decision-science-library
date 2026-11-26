# Decision Science Library — 品質監査サマリー（2026-11-26）

## 対象と結論

GitHub の `assets/papers.js` に登録された **83件**を対象に、データ構造・出典メタデータ・監査範囲の機械的点検を実施。

- 6章構成の見出しを認識可能：**83/83件**
- `detailed_review` を保持：**83/83件**
- 監査記録に一次資料リンクあり：**83/83件**
- 原文にMarkdown表を含む：**63件**（表示後の表件数ではない）
- `detailed_review.status` ごとの内訳：
  - `selected_results_checked_against_original`：20件
  - `selected_results_checked_against_primary_abstract`：7件
  - `selected_results_checked_against_source_excerpt`：1件
  - `selected_theoretical_claims_checked_against_original`：9件
  - `selected_conceptual_claims_checked_against_original`：3件
  - `selected_conceptual_claims_checked_against_publisher`：2件
  - `selected_conceptual_claims_checked_against_primary_abstract`：40件
  - `abstract_level_check_only`：1件

**重要：83/83件は「一次情報の追跡記録がある」という意味であり、原著本文・推定式・全効果量・標準誤差・95%CIをすべて確認済みという意味ではない。** 各論文ページの監査欄で対象範囲と残存する未検証項目を明示する。

## 実施したコード修正

1. 個別論文の第6章の後に続く週次横断コメント・別カテゴリーの見出しを表示時に分離。元データは維持。
2. `3.3%` など数字から始まる本文を章見出しと誤判定しないように見出し抽出を修正。
3. 個別論文ページで、監査対象・一次資料リンク・未確認事項・数値の確認範囲を表示。
4. Markdown表は横スクロール可能な表組として扱い、狭い画面向けの視認性を改善。

## 原著との突合における重点的な注意事項

- **Does Management Matter? Evidence from India**：刊行版QJE要旨では初年度の生産性 **17%増**。旧WPの **11%** と混同しない。
- **Thinking versus Doing**：入院に関する **28%** は要旨上の相対変化であり、28パーセントポイントではない。
- **Quick-Fixing**：**17ドル／四半期**はモデルによる平均機会費用の推計であり、観測された家計損失と同一ではない。
- Methodology論文の「理論的保証」は、識別条件や比較対象の仮定が満たされる場合に限定。

## 未完了の品質ゲート

- サイトの実ブラウザ表示確認（PC・モバイル）。静的コードの点検だけでは表・数式・リンクの表示成功を保証できない。
- 主要数値、サンプルサイズ、標準誤差、95%信頼区間と原著Table/Figure/Appendix番号の1対1対応付け。
- ネットワークタグ、RQ、仮説の著者原文／AI要約の区別と全件の意味的レビュー。
- 表の全セル内容と表中の外部リンクのレンダリング確認。
- 論文更新・版改訂が発生した場合の継続的照合。

## 次の優先順位

1. 実ブラウザでPC／スマートフォン両方の表示検証を実施する。
2. `selected_results_checked_against_original` の20件を起点に、原著Table/Figureと95%CIを追加記録する。
3. `abstract_level_check_only` 等を優先して本文照合し、ステータスを検証根拠に応じて更新する。
4. 定期配信の品質ゲートに、6章・出典URL・数値の出典欄・表示テストを組み込む。

## 追補：原著定量結果の構造化（2026-11-26）

初回の83本の監査記録整備後、**7論文・38個の定量情報レコード**を `quantitative_evidence` に構造化した。対象は以下の7本。

1. Causal Inference for All — arXiv v1のTable 4–5のQoL、SE、bootstrap 95%CI
2. Difference-in-Differences with Bad Controls — 原著Table 1の標本構成、Figure 7に関する本文の概数
3. Robust Signal Maximization in Spillover Experiments — Table 1–2のRMSEとeffective sample size改善率（直接効果の精度悪化も記録）
4. Policy Thresholds as Growth Barriers — NBER公式要旨の約18%・約10%という概数
5. CausalVerify — 著者公開v2 READMEの66/426、15.5%、scenario-clustered 95%CI
6. Impact of LLM Assistance on Physician Decision-Making — npj Digital Medicineの3か国別効果と95%CI（percentage points）
7. Does AI Assistance Enhance or Erode Expertise? — NBER要旨のAI利用中・終了後の標準化効果量とp値

**データ種別を必ず区別すること。** RMSE、標本数、割合、QoL推定値、標準化効果量、percentage pointsは別の尺度であり、同列に比較しない。公式要旨にないCIは推測せず「未確認」として保存する。

### 現在の自動テスト設定

- `scripts/validate-library.mjs` は6章・書誌情報・監査URL・定量情報の必須項目・CI上下限をチェックする。
- GitHub Actions `library-quality.yml` の既存Node品質チェックに新しい検証スクリプトを追加した。
- ChromiumのPC幅1280px、モバイル幅390pxで、論文の6見出し、Markdown表、構造化された定量表、週次まとめの分離、横幅のはみ出しを検証するスモークテストを設定した。
- **CIの実行結果と公開サイトの実端末目視は未確認。** スクリプトを登録しただけで検証完了とはしない。
