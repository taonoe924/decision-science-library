# Decision Science Library｜詳細監査バックログ

更新日：2026-11-25

> **進捗追記（2026-11-25、20論文バッチ第2弾）**：以下の「詳細監査20件・未実施63件」は本ファイル作成時点の基準値です。その後、[batch_02_20_papers_2026-11-25.json](../audit/batch_02_20_papers_2026-11-25.json)で選定した20件のうち、**5件を原著本文に対する部分詳細照合済み**（うち定量結果を照合した論文3件、識別・理論条件を照合した論文5件）としています。**全体では25/83件に何らかの部分詳細監査の記録、未実施58件**。今回の20件はMarkdown機械整形済みですが、PC/スマホ表示確認や原著全文・付録の完全監査が完了したものではありません。残り15件の詳細監査→別の43件→全頁表示検証→定期配信の継続運用確認の順で進めます。最新値は上記バッチファイルと各レコードの `detailed_review` を参照してください。

> **追加進捗（2026-11-25）**：次バッチで Policy Scale-up（paper-def930c5de）の原著2026-09-30版 Tables 3–4 とAppendix Fを部分照合し、**部分詳細監査済み26/83件、今回の20件バッチ6/20件、未実施57件**となりました。Survival Transportability（paper-85e9fc2e70）は原著公開要旨のみ再確認し、具体的数値は本文Tableが未照合のため詳細監査完了に算入しません。進捗の細目は[batch-02監査記録](../audit/batch_02_20_papers_2026-11-25.json)を参照してください。

## 完了条件と対象範囲

基礎データ83件のうち、詳細監査は20件、未実施は63件。詳細監査には数値・推定量を照合するもの、研究設計・理論だけを照合するものが含まれ、後者を全数値検証済みとはみなさない。

優先判定は学習・研究上の再利用可能性と、誤解した場合の意思決定上の影響に基づく暫定分類。論文の品質ランキングではない。

各論文について、原著の版・RQ・Design・Estimand・識別仮定、データ/単位/N、効果量と95%CI/SE、表番号、未確認事項を記録する。理論論文の場合は定理と仮定を優先する。

## 次に詳細監査する優先候補（P0）

| 論文ID | 論文（原著リンク） | 基本確認 |
|---|---|---|
| paper-9be0b9fd8f | [Difference-in-differences for mediation analysis using double machine learning](https://doi.org/10.48550/ARXIV.2602.23877) | 基本照合済み |
| paper-85e9fc2e70 | [Efficient transport and generalization of survival treatment effects](https://arxiv.org/abs/2609.18764) | 基本照合済み |
| paper-5b78f0b3ca | [Bayesian Fusion Forests for Heterogeneous Treatment Effects on Survival from Randomised and Real-World Data](https://arxiv.org/abs/2607.29295) | 基本照合済み |
| paper-23ddb1867c | [Policy Learning With Observational Data](https://doi.org/10.3982/ECTA15732) | 基本照合済み |
| paper-c79dc0a5e2 | [Conformal Policy Learning with Distribution-Free Safety Guarantees](https://arxiv.org/abs/2609.17296) | 基本照合済み |
| paper-def930c5de | [Incentives, Evidence, and Reminders for Bureaucrats: Overcoming Barriers to Policy Scale Up](https://www.nber.org/papers/w35291) | 基本照合済み |
| paper-f39eae36a4 | [Identification and Estimation of Staggered Difference-in-Differences with Network Spillovers](https://arxiv.org/html/2605.15119) | 基本照合済み |

## 残る論文（P1：順次精査）

| 論文ID | 論文（原著リンク） | 基本確認 |
|---|---|---|
| paper-382caf1ae2 | [Policy Thresholds as Growth Barriers: Theory and Evidence from a Payroll Tax Notch](https://www.nber.org/papers/w35484) | 基本照合済み |
| paper-62ca0acf9a | [Causal Inference for All: Marginal Estimands for Outcomes Truncated by Death](https://arxiv.org/abs/2607.00222) | 基本照合済み |
| paper-8db14dc31c | [Inference on Counterfactual Distributions Using Martingale Posteriors](https://arxiv.org/abs/2607.24143) | 基本照合済み |
| paper-260bb098e8 | [Generalised Transportability via Causal Abstractions](https://arxiv.org/abs/2608.15645) | 基本照合済み |
| paper-e53343e16f | [A Bayesian Approach to Partial Homogeneity in Staggered Difference-in-Difference](https://www.ashoka.edu.in/research/a-bayesian-approach-to-partial-homogeneity-in-staggered-difference-in-difference/) | 基本照合済み |
| paper-48724c28e5 | [Robust Signal Maximization in Spillover Experiments](https://www.nber.org/papers/w35570) | 基本照合済み |
| paper-8fba52c564 | [Which Policy Works, and Where? Estimation and Inference for State-Level Treatment Effects in Difference-in-Differences](https://arxiv.org/abs/2609.01467v1) | 基本照合済み |
| paper-8da38f287b | [Off-policy causal estimation in networks](https://arxiv.org/abs/2609.02756v1) | 基本照合済み |
| paper-b28db29cef | [Causal Foundation Models](https://arxiv.org/abs/2609.03003v1) | 基本照合済み |
| paper-1dec3c647c | [Difference-in-differences with unit-specific trends: Bias in post-treatment estimates and a simple alternative](https://doi.org/10.1016/j.econlet.2026.113121) | 基本照合済み |
| paper-b7ba3b5524 | [Identifying Policy Causal Effects from Rule Changes](https://www.nber.org/papers/w35615) | 基本照合済み |
| paper-9f6d9ca5d6 | [Average Treatment Effect Localization: Projection Methods in Synthetic Control](https://arxiv.org/abs/2609.10617) | 基本照合済み |
| paper-fb57ffda6e | [Optimal Covariate Adjustment beyond the Average Treatment Effect: Treated-Population and Overlap-Weighted Estimands](https://arxiv.org/abs/2609.11222) | 基本照合済み |
| paper-235e73a026 | [Quantile Treatment Effects in Difference-in-Discontinuities Designs](https://doi.org/10.1093/ectj/utag028) | 基本照合済み |
| paper-07919c7d40 | [PLRD: Partially Linear Regression Discontinuity Inference](https://www.nber.org/papers/w35699) | 基本照合済み |
| paper-5445c52194 | [Omitted Variable Bias in Difference-in-Differences Designs](https://arxiv.org/abs/2609.19386) | 基本照合済み |
| paper-c90ea9c9ca | [Heterogeneous Policy Effects in Comparative Case Studies with Treated-Unit Microdata](https://arxiv.org/abs/2609.28678) | 基本照合済み |
| paper-6582247bcc | [Thinking versus Doing: Cognitive Capacity, Decision Making and Medical Diagnosis](https://www.nber.org/papers/w35034) | 基本照合済み |
| paper-21bfea85b2 | [Triple Difference Designs with Heterogeneous Treatment Effects](https://arxiv.org/abs/2502.19620) | 基本照合済み |
| paper-99c4958bc6 | [Are Guidelines Worth Following? Decision-Making Under Incomplete Evidence](https://www.nber.org/papers/w35798) | 基本照合済み |
| paper-bb858e1205 | [Geodesic Difference-in-Differences](https://doi.org/10.1093/biomet/asag054) | 基本照合済み |
| paper-5b0863ec2d | [Causal Inference for Spatial Treatments](https://onlinelibrary.wiley.com/doi/full/10.3982/ECTA21571) | 基本照合済み |
| paper-fad50f3029 | [Understanding Expert Choices Using Decision Time](https://www.nber.org/papers/w32515) | 基本照合済み |
| paper-1d8263bd82 | [Causal Survival Forests with Negative Controls](https://arxiv.org/abs/2608.19749) | 基本照合済み |
| paper-3213b8fc54 | [Optimal Sequential Decision-Making with Initiation Regimes](https://arxiv.org/abs/2609.29844) | 基本照合済み |
| paper-81e90efb7e | [Retrieval Failures and Consumption Smoothing: A Field Experiment on Seasonal Poverty](https://www.nber.org/papers/w35430) | 基本照合済み |
| paper-ff993d84fc | [Efficient Inference for Incremental Causal Effects of Time to Treatment](https://arxiv.org/abs/2605.29348) | 基本照合済み |
| paper-aec80c656f | [When Are Decisions Improvable? An Evaluation of Diagnostic Methods](https://www.nber.org/papers/w34979) | 基本照合済み |
| paper-cf94b5d051 | [Is Money Overrated? Misperceived Satisfaction from Income](https://www.nber.org/papers/w35423) | 基本照合済み |
| paper-dac0ca69ca | [Policy Learning under Unobserved Confounding: A Robust and Efficient Approach](https://arxiv.org/abs/2507.20550) | 基本照合済み |
| paper-b7fe6b96d3 | [A Joint Test of Unconfoundedness and Common Trends](https://doi.org/10.1002/jae.70068) | 基本照合済み |
| paper-bda44147e2 | [The Economic Consequences of Increasing Sleep Among the Urban Poor](https://www.nber.org/papers/w26746) | 基本照合済み |
| paper-3ada9d3a18 | [Diagnosing Physician Error: A Machine Learning Approach to Low-Value Health Care](https://pmc.ncbi.nlm.nih.gov/articles/PMC12497445/) | 基本照合済み |
| paper-f1ad1fb3a4 | [TEA-Time: Transporting Effects Across Time](https://arxiv.org/abs/2603.07018) | 基本照合済み |
| paper-92bc6de864 | [Transportable Causal Effect Estimation across Networks under Interference](https://arxiv.org/abs/2608.18932) | 基本照合済み |
| paper-0bdefac09e | [Behavioral Attenuation](https://www.zora.uzh.ch/bitstreams/fc7e186d-c67a-4213-b425-06384b9231c6/download) | 基本照合済み |
| paper-83b0e41aa8 | [Heterogeneous Treatment Effect in Time-to-Event Outcomes: Harnessing Censored Data with Recursively Imputed Trees](https://arxiv.org/abs/2502.01575) | 基本照合済み |
| paper-4d71ad1dbd | [Quick-Fixing: Near-Rationality in Consumption and Savings Behavior](https://www.karthiksastry.com/files/Quick_Fixing_may26_web.pdf) | 基本照合済み |
| paper-a7f60207fb | [Leave No One Undermined: Policy Targeting with Regret Aversion](https://arxiv.org/html/2506.16430) | 基本照合済み |
| paper-dc007de13d | [Texting for Taxes: Field Evidence on Loss-Framed Nudges in Japan](https://www.jstage.jst.go.jp/article/jbef/18/Special_issue/18_18.S5.pp.S1-S4/_article/-char/en) | 基本照合済み |
| paper-bd820a3c55 | [Designing Consent: Choice Architecture and Consumer Welfare in Data Sharing](https://www.nber.org/papers/w34025) | 基本照合済み |
| paper-7f69adc37d | [Time-Varying Causal Survival Learning](https://arxiv.org/html/2503.00730) | 基本照合済み |
| paper-db679cffd0 | [A Meta-learner for Heterogeneous Effects in Difference-in-Differences](https://proceedings.mlr.press/v267/lan25a.html) | 基本照合済み |
| paper-ea9249a409 | [Nudge Me! A Field Experiment on Reminders for Medication Adherence](https://doi.org/10.1016/j.jebo.2025.107368) | 基本照合済み |
| paper-05ff915c4d | [Salience and Taxation: Theory and Evidence](https://doi.org/10.1257/aer.99.4.1145) | 基本照合済み |
| paper-c638566481 | [A Megastudy of Text-Based Nudges Encouraging Patients to Get Vaccinated at an Upcoming Doctor's Appointment](https://doi.org/10.1073/pnas.2101165118) | 基本照合済み |
| paper-63007291f5 | [Human Decisions and Machine Predictions](https://doi.org/10.1093/qje/qjx032) | 基本照合済み |
| paper-aa9f672349 | [Efficient Generalization and Transportation](https://doi.org/10.1214/24-STS972) | 基本照合済み |
| paper-c8d65e4984 | [Rational Habit Formation: Experimental Evidence from Handwashing in India](https://doi.org/10.1257/app.20190568) | 基本照合済み |
| paper-3567d68f2d | [Tying Odysseus to the Mast: Evidence from a Commitment Savings Product in the Philippines](https://doi.org/10.1162/qjec.2006.121.2.635) | 基本照合済み |
| paper-45a7b98e64 | [Does Management Matter? Evidence from India](https://doi.org/10.1093/qje/qjs044) | 基本照合済み |
| paper-dd46e1bd34 | [Getting to the Top of Mind: How Reminders Increase Saving](https://doi.org/10.1287/mnsc.2015.2296) | 基本照合済み |
| paper-def53679c7 | [Does Price Matter in Charitable Giving? Evidence from a Large-Scale Natural Field Experiment](https://doi.org/10.1257/aer.97.5.1774) | 基本照合済み |
| paper-0fe4ab82a9 | [Understanding Mechanisms Underlying Peer Effects: Evidence from a Field Experiment on Financial Decisions](https://doi.org/10.3982/ECTA11991) | 基本照合済み |
| paper-3376f0baf3 | [PAC-Bayesian Treatment Allocation Under Budget Constraints](https://arxiv.org/abs/2212.09007) | 基本照合済み |
| paper-6bc882df2c | [Predicting Experimental Results: Who Knows What?](https://doi.org/10.1086/699976) | 基本照合済み |

## 監査済み論文

| 論文ID | 論文 | 重点監査区分 |
|---|---|---|
| paper-4ba1548978 | [Difference-in-Differences with “Bad Controls”](https://arxiv.org/abs/2608.03881) | selected_results_checked_against_original |
| paper-44a219aa63 | [Using Pre-Trends for Inference in Difference-in-Differences](https://arxiv.org/abs/2607.21312) | selected_theoretical_claims_checked_against_original |
| paper-061d1b0eff | [CausalVerify: An Execution-Grounded Benchmark for LLM Causal Inference Workflows](https://arxiv.org/abs/2609.07944) | selected_results_checked_against_original |
| paper-ec4e9eeabb | [Impact of LLM Assistance on Physician Decision-Making: A Multi-Country Randomized Controlled Trial](https://www.nature.com/articles/s41746-026-03111-5) | selected_results_checked_against_primary_abstract |
| paper-e539e49ca6 | [Does AI Assistance Enhance or Erode Expertise? Evidence from a Three-Month Field Experiment in Patent Drafting](https://www.nber.org/papers/w35720) | selected_results_checked_against_original |
| paper-730aa60651 | [Designing Human-AI Collaboration: A Sufficient-Statistic Approach](https://www.nber.org/papers/w33949) | selected_results_checked_against_primary_abstract |
| paper-399d8b695e | [How Do Habits Form? Experimental Evidence from Health Screenings](https://www.nber.org/papers/w32745) | selected_results_checked_against_primary_abstract |
| paper-6575c5dfe1 | [Policy Learning with Confidence](https://arxiv.org/abs/2502.10653) | selected_results_checked_against_original |
| paper-63f74ad77b | [Mechanism Design for Personalized Policy: A Field Experiment Incentivizing Exercise](https://onlinelibrary.wiley.com/doi/full/10.3982/ECTA21926) | selected_results_checked_against_original |
| paper-56160473d1 | [An Experimental Comparison of Cognitive Forcing Functions for Execution Plans in AI-Assisted Writing](https://arxiv.org/html/2601.18033) | selected_results_checked_against_original |
| paper-87f8569164 | [Generative AI without guardrails can harm learning: Evidence from high school mathematics](https://doi.org/10.1073/pnas.2422633122) | selected_results_checked_against_original |
| paper-d76aeef591 | [Double Reinforcement Learning for Efficient Off-Policy Evaluation in Markov Decision Processes](https://www.jmlr.org/papers/v21/19-827.html) | selected_theoretical_claims_checked_against_original |
| paper-d7f08665d5 | [Estimating Dynamic Treatment Effects in Event Studies with Heterogeneous Treatment Effects](https://doi.org/10.1016/j.jeconom.2020.09.006) | selected_theoretical_claims_checked_against_original |
| paper-f3d53a169f | [Navigating the Jagged Technological Frontier: Field Experimental Evidence of the Effects of AI on Knowledge Worker Productivity and Quality](https://doi.org/10.1287/orsc.2025.21838) | selected_results_checked_against_original |
| paper-8b8144db83 | [Double/Debiased Machine Learning for Treatment and Structural Parameters](https://doi.org/10.1111/ectj.12097) | selected_results_checked_against_original |
| paper-8da7742b2f | [Revisiting Event-Study Designs: Robust and Efficient Estimation](https://doi.org/10.1093/restud/rdae007) | selected_results_checked_against_original |
| paper-4d0da668f3 | [A Sensitivity Analysis of the Surrogate Index Approach for Estimating Long-Term Treatment Effects](https://arxiv.org/abs/2603.00580) | selected_results_checked_against_source_excerpt |
| paper-22ffd85d70 | [Inferring the Long-Term Causal Effects of Long-Term Treatments from Short-Term Experiments](https://proceedings.mlr.press/v235/tran24b.html) | selected_theoretical_claims_checked_against_original |
| paper-8ba0782922 | [Provision of Social Norm Feedback to High Prescribers of Antibiotics in General Practice](https://doi.org/10.1016/S0140-6736(16)00215-4) | selected_results_checked_against_original |
| paper-028ecc4f15 | [Megastudies Improve the Impact of Applied Behavioural Science](https://doi.org/10.1038/s41586-021-04128-4) | selected_results_checked_against_original |

## 品質管理上の注意

- 原著・出版社要旨などとの基本照合と、原著本文・Table/Figure/Appendixの詳細監査を区別する。
- 推定効果・95%CI・標準誤差の未確認値は推測で埋めない。
- GitHub Pages表示確認とGitHub Actions実行確認は別途必要。
- 新規配信には公開前審査を適用し、確認不能な論文は掲載を保留する。
