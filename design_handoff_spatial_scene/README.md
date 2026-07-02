# Handoff: Spatial Scene Web App — UI / UX

## Overview
ブラウザ上で「1枚の画像から疑似的な空間シーンを生成し、ドラッグで視点移動できる」Webアプリの UI / UX デザイン。アップロード → 深度推定 → 視点移動という一連のフローを、デスクトップ／モバイルの両方でデザインしている。

技術仕様（推奨スタック・パイプライン・データ構造・受け入れ条件など）は同梱の **`implementation.md`** に全て記載されている。このREADMEは **その実装ガイドで定義された仕様に「見た目と振る舞い」を与えるUI/UX設計** であり、必ず両方を併せて読むこと。実装ガイドが「何を作るか」、本デザインが「どう見せ・どう操作させるか」を担う。

## About the Design Files
同梱の `.dc.html` ファイルは **HTMLで作られたデザインリファレンス（プロトタイプ）** であり、本番コードとしてそのままコピーするものではない。意図したレイアウト・色・タイポグラフィ・インタラクションを示す視覚的な指針である。

実装タスクは、これらのHTMLデザインを **実装ガイドで指定された本番環境（TypeScript + Vite + React + Three.js / WebGL2 + ONNX Runtime Web）で再現すること**。スタックは実装ガイドの §3 で確定しているので、その環境の確立されたパターンに沿ってUIを組み直す。HTMLをそのまま出荷しない。

> ⚠️ 重要: デザイン内の「シーン」は、視差レイヤーをCSSで重ねた **見た目の代用品** にすぎない（`Scene.dc.html`）。本番では実装ガイドの通り、Depth Anything V2 による深度推定 → 前景/背景レイヤー・メッシュ生成 → Three.js / WebGL2 で描画する。Scene.dc.html はあくまで「ビューア領域でドラッグすると視差で視点が動く」という体験の質感を伝えるためのもの。

## Fidelity
**High-fidelity (hifi)。** 最終的な配色・タイポグラフィ・余白・角丸・影・インタラクションまで作り込んである。開発者はコードベースの既存ライブラリ／パターンを使って、このUIをピクセル単位で再現する想定。

## デザインの全体像 — 3コンセプト + 採用案

このプロジェクトでは、まず3つのデザイン方向を提示し（`Spatial Scene Concepts.dc.html`）、その中から **Concept A「Studio」** を採用して詳細化した（`Studio Viewer.dc.html`）。

| # | コンセプト | 方向性 | 概要 |
|---|---|---|---|
| A | **Studio** ✅採用 | 明るい / Apple風 | 余白とガラス。写真が主役。操作は下部ドックに集約。没入優先でUIは控えめ。 |
| B | Stage | 暗い / 没入 | 画面を暗転させ奥行きを際立たせる。操作は右ガラスパネル。発光アクセントで状態を伝える。 |
| C | Workbench | 構造的 / プロ向け | 左サイドバーに工程・パラメータを常設。深度マップや数値を可視化。再現性重視のツール志向。 |

**実装は採用案「Studio」を主軸に進める。** Stage / Workbench は将来の拡張の参考として残す（必須ではない）。

---

## Screens / Views（採用案 Studio）

### 共通シェル
全画面で共通の構造：
- **トップバー** — 高さ 56〜60px、下境界 `1px solid rgba(0,0,0,0.06)`。左: アプリアイコン（22〜24px 角丸7px、`linear-gradient(145deg,#0a84ff,#5e5ce6)`）+「Spatial」(Schibsted Grotesk 700) +「空間シーン」(Zen Kaku Gothic New 500 / `#aeaeb2`)。右: 「情報 Info」ボタン（`rgba(0,0,0,0.05)` 背景）と「＋ 新規 New」ボタン（`#1d1d1f` 背景 / 白文字）。
- **ステージ** — 残り領域全体。背景 `#eef1f4`。ここに写真／シーン／状態表示が入る。
- 中身（empty / loading / viewer）だけが入れ替わり、シェルは保たれる。

### 1. ビューア — 画像アスペクト対応（`Studio Viewer.dc.html` セクション 01）
- **目的**: 生成済みの空間シーンをドラッグで視点移動して鑑賞する。縦長・パノラマ・正方形など、ステージとアスペクトの合わない画像でも破綻させない。
- **レイアウト**: カード幅1320px（ステージは可変）。写真は中央に額装（`translate(-50%,-50%)`）。
- **アスペクト戦略（最重要）**:
  - **アンビエント背景（推奨・採用）**: 黒帯（レターボックス）を出さない。画像全体を中央にFitで額装し、余白は **同じ画像をぼかして拡大した背景** で満たす（`transform:scale(1.5)` + `filter:blur(46px) saturate(1.15) brightness(0.97)`）。上に放射状の暗ビネット `radial-gradient(120% 100% at 50% 40%, rgba(255,255,255,0) 50%, rgba(20,24,30,0.16) 100%)`。これは 実装ガイド §17「fallback backdrop」の応用で、追加コストが小さい。
  - **Fit / Fill 自動判定**: 画像とステージのアスペクト差が小さければ Fill（画面を覆い、はみ出しを視差の余白に活用）、差が大きければ Fit（全体表示＋アンビエント）。手動切替も可能。
  - **サイドパネル案**: 別案として記載。自由度は高いがステージが狭まり没入感が落ちる。
  - レイアウト計算ロジックは `Studio Viewer.dc.html` の `layout()` 関数を参照（`pad = 0.86` の余白、`imgAR > stageAR` で縦横を決定）。
- **額装写真**: `border-radius:16px`、`box-shadow:0 4px 14px rgba(0,0,0,0.10), 0 30px 60px -24px rgba(0,0,0,0.45)`、`overflow:hidden`。中にビューア（Three.js canvas）。
- **下部コントロールドック**: ガラス調 `rgba(255,255,255,0.78)` + `blur(24px)`、`border-radius:20px`。
  - 「立体感 Depth」スライダー（幅228px、値 0〜1 step 0.05、初期 0.55、数値は IBM Plex Mono で右肩表示）
  - 区切り線 `1px × 40px / rgba(0,0,0,0.08)`
  - リセットボタン「⟲」（40×40、角丸11px、`rgba(0,0,0,0.05)`）
- **下の解説3カード**（実装には不要な説明用）: アンビエント背景 / Fit・Fill自動判定 / サイドパネル の3戦略を比較。実装時は上記「アンビエント背景」を主軸に。

### 2. 状態 — 読込前 / 読込中（`Studio Viewer.dc.html` セクション 02）
同じシェルのまま中身が入れ替わる。

**読込前（empty）**:
- 大きなドロップゾーン: `1.6px dashed rgba(10,132,255,0.38)`、角丸20px、淡い白グラデ + `backdrop-filter:blur(2px)`。
- 中央に円形アイコン（66px、`rgba(10,132,255,0.1)` 背景、`↑` / `#0a84ff`）。
- 「画像をドロップ」(Zen Kaku 600 20px) + 「Drag & drop an image, or」(`#86868b`)。
- 「ファイルを選択 Choose file」ボタン（高さ42px、`#0a84ff`、白文字）。
- 補足「JPEG · PNG · HEIC — 最大 4096px」(IBM Plex Mono / `#c7c7cc`)。実装ガイド §8 の入力制限と整合。

**読込中（loading）**:
- 黒い空白で待たせない。処理中の画像をぼかして背景に敷く（青〜暖色のグラデ + blur + 前景シルエット）。
- 中央に円形プログレスリング（84px、`border-top-color:#0a84ff` を `ringSpin 0.9s linear infinite` で回転）+ 中央に「62%」(IBM Plex Mono)。
- 「深度を推定中」(Zen Kaku 600 19px) + 「Estimating depth · Depth Anything V2 Base」。
- ステージチップ列（実装ガイド §20 の `ProcessingStage` に対応）: `✓ model` `✓ preprocess`（`#34c759`）/ `◌ depth`（`#0a84ff` 進行中）/ `○ mesh`（`#c7c7cc` 未着手）。
- 「キャンセル Cancel」ボタン（ガラス調、`1px solid rgba(0,0,0,0.12)`）。実装ガイド §20 のキャンセルAPIに対応。

### 3. モバイル（`Studio Viewer.dc.html` セクション 03）
端末枠 300×620、角丸44px、ノッチ116×25px。3状態を提示：
- **読込前**: ドロップゾーン + 「＋ 画像を追加」ボタン（高さ48px = 44px以上のヒット領域確保）。
- **読込中**: デスクトップと同じ構成を縦に凝縮（リング78px、62%、ステージチップ、キャンセル）。
- **ビューア**: ステージを最大化し、操作は **下部シート**（角丸 `24px 24px 0 0`、グラバー、Depthスライダー）に集約。横長画像はアンビエント背景で上下を満たす（黒帯なし）。左下に「全体 Fit · 16:9」のアスペクトバッジ。
- 縦画面では操作を下部シートに集約してステージを最大化する方針。指で直接ドラッグして視点を動かす。

---

## Interactions & Behavior
- **ドラッグ視点移動**: ビューア領域を pointerdown→move でドラッグするとカメラオフセットが動く。release後はイージングで中心へ戻る（`Scene.dc.html` の `loop()` 参照、本番は 実装ガイド §19 `CAMERA_DEFAULTS` に従う: `maxOffset:0.13, smoothing:0.12`）。Pointer Eventsで統一。ジャイロは使わない。
- **スライダー**: input時に右肩の数値表示を更新（`x` フォーマットは `toFixed(2)`）。スライダー上の pointerdown はステージのドラッグへ伝播させない（`e.stopPropagation()`）。
- **キャンセル**: 処理中の結果反映を止める（実装ガイド §20, §25）。
- **アスペクト再計算**: ステージのリサイズを `ResizeObserver` で監視し `layout()` を再実行。
- **アニメーション**: プログレスリング `ringSpin 0.9s linear infinite`。ドラッグヒントは `sceneHintFade 4.5s ease forwards` でフェードアウト、矢印は `sceneFloat 2s ease-in-out infinite`。

## State Management
実装ガイド §7 の `SpatialSceneAsset` を中心に据える。UI側で必要な状態の目安：
- `appState`: `empty | loading | viewer | error`
- `progress`: { stage: ProcessingStage, percent: number }（実装ガイド §20 の `ProcessingStage`）
- `params`: { depthScale, parallaxStrength, edgeCutThreshold }（実装ガイド §22 の調整可能項目）
- `camera`: { offsetX, offsetY }（clamp済み、実装ガイド §19）
- `fitMode`: `fit | fill`（アスペクト戦略）
- `asset`: 現在の `SpatialSceneAsset`
重い処理は Web Worker（実装ガイド §20）。Worker→Main は progress / complete / error イベント。

## Design Tokens

### Colors（採用案 Studio）
- Primary（アクセント青）: `#0a84ff` / グラデ終端 `#0a6fff`
- アイコングラデ: `linear-gradient(145deg,#0a84ff,#5e5ce6)`
- テキスト: 主 `#1d1d1f` / 副 `#6e6e73` / 三次 `#86868b` / 微 `#aeaeb2` / プレースホルダ `#c7c7cc`
- 背景: ページ `#f0f0f3` / ステージ `#eef1f4` / カード `#fff`
- 成功: `#34c759` / 警告: `#ff9f0a`（`#ffb340`）
- ガラス面: `rgba(255,255,255,0.74〜0.78)` + `backdrop-filter:blur(20〜24px)`
- 区切り線: `rgba(0,0,0,0.06〜0.08)`

（参考: Stage案アクセント `#5be1e6`〜`#2bb6d8`、Workbench案アクセント `#4f46e5` / `#6366f1`）

### Typography
- 英: **Hanken Grotesk**（本文・ボタン 400/500/600/700）
- 見出し英: **Schibsted Grotesk**（500/600/700、`letter-spacing:-0.01〜-0.02em`）
- 日本語: **Zen Kaku Gothic New**（400/500/700）
- 数値・ラベル: **IBM Plex Mono**（400/500、`letter-spacing` を広めに）
- スケール例: H1 34px/700, セクション見出し 32px/700, カード見出し 17px/700, 本文 13.5〜16px, ラベル 11〜13px。

### Radius
カード 22〜26px / 写真フレーム 16px / ボタン 9〜14px / ドック 20px / ピル 999px / 端末枠 44px。

### Shadow
- カード: `0 2px 6px rgba(0,0,0,0.05), 0 24〜34px 60〜80px -24〜30px rgba(0,0,0,0.22〜0.30)`
- 写真: `0 4px 14px rgba(0,0,0,0.10), 0 30px 60px -24px rgba(0,0,0,0.45)`
- 青ボタン: `0 4px 14px rgba(10,132,255,0.35〜0.4)`
- ドック: `0 1px 1px rgba(0,0,0,0.04), 0 12px 36px rgba(0,0,0,0.16)`

### Spacing / Sizes
- デスクトップ最大幅: 1320px（採用案）/ 1180px（コンセプト比較ページ）
- トップバー: 56〜60px / モバイルヒット領域: 44px以上
- フォント最小: モバイルでも本文12px以上

## Assets
- フォントは Google Fonts（Hanken Grotesk / Schibsted Grotesk / Zen Kaku Gothic New / IBM Plex Mono）。本番ではコードベースのフォント読み込み方式に合わせる。
- アイコンは絵文字／単純グリフ（↑ ⟲ ✦ ⤡ ✓ ◌ ○ ⚠️）で代用。本番ではコードベースの既存アイコンセットに置換推奨。
- 画像素材は無し。「シーン」はCSS視差レイヤーのプレースホルダ（`Scene.dc.html`）。本番は実画像 + 深度メッシュ（実装ガイド §9〜§18）。
- アプリの深度推定モデルは `public/models/` 配下に配置（実装ガイド §6）。

## Files
同梱ファイル：
- `implementation.md` — **技術実装ガイド（最優先で読む）**。スタック・パイプライン・型・実装計画・受け入れ条件。
- `Studio Viewer.dc.html` — **採用案の詳細デザイン**。ビューア（アスペクト対応）/ 読込前 / 読込中 / モバイル3状態。
- `Spatial Scene Concepts.dc.html` — 3コンセプト比較（Studio / Stage / Workbench）。各案のアップロード・処理・ビューア・モバイルを網羅。
- `Scene.dc.html` — ドラッグ視差シーンのプレースホルダ部品（体験の質感確認用）。
- `support.js` — `.dc.html` をブラウザで開くためのランタイム（デザイン閲覧用。本番には不要）。

`.dc.html` はブラウザで直接開けば動作する（同階層の `support.js` が必要）。実装の出発点は **実装ガイドの実装計画（§24）** とし、見た目は Studio Viewer に合わせる。
