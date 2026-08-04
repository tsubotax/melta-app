# 変更履歴

このファイルが変更履歴の正本。npm に公開したバージョンだけを記録する。

形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/)、版番は [Semantic Versioning](https://semver.org/lang/ja/) に従う。
0.x 系なので**破壊的変更は minor で表現する**（`0.4.x` → `0.5.0`）。

---

## 0.5.3 — 2026-08-04

既存 API（コンポーネント・subpath）の変更なし。**lint plugin に推奨 config を追加**。
外部消費者 rally-nav での実導入フィードバック（`melta-harness-install-log.md` の T6 / T11 / T12）由来。

### 追加

- **`meltaPlugin.configs.recommended` を追加した。** これまで推奨 severity
  （color / radius = error、spacing / fontsize = warn）は `eslint-rules/melta.mjs` 先頭の
  **コメントにしか無く**、消費者は README から手で書き写すしかなかった＝ドリフト源。
  flat config 形式の config オブジェクト（plugin 登録 + ルール 4 本）を配布物に含めたので、
  `export default [meltaPlugin.configs.recommended];` の 1 行で導入できる。
  適用範囲（`files`）はあえて持たせておらず、消費者側で spread して上書きする
- check-installability に `configs.recommended` の検査を追加（存在 + `plugins.melta` の自己参照 +
  ルール 4 本の severity 値まで照合）。config はあるが空・severity が入れ替わった、を検出する

### 内部

- **PostToolUse hook を bash から node 実装へ差し替えた**（`scripts/hook-lint.sh` →
  `scripts/hook-lint.mjs`）。旧実装は `|| true` と `2>/dev/null` で eslint の実行失敗
  （設定の構文エラー・plugin 解決失敗・強制終了）を握り潰し、**クリーン時と同じ無出力**を
  返していた＝ハーネスが死んでも誰も気づかず違反が素通りする。新実装は eslint 不在・
  exit 2 以上・出力破損・入力 JSON 破損をすべて `additionalContext` で必ず表に出す（fail-loud）。
  `file_path` は `grep`/`sed` ではなく `JSON.parse` で取るので、引用符や `\uXXXX` を含むパスでも
  途中打ち切りにならない。bash 依存も落とした（Windows 互換）
- hook の入出力契約の E2E を追加（`scripts/lib/hook-lint.test.ts`、13 ケース）。
  「無出力を期待する」ケースだけでは hook が常に無出力になるバグを見逃すため、
  **故障系の陽性確認**（eslint 不在 / exit 2 / 出力破損 / 入力 JSON 破損 / 引用符入りパス）を含む
- このリポ自身の `eslint.config.mjs` を `configs.recommended` の spread に切り替えた（ドッグフード）

## 0.5.2 — 2026-08-04

既存 API（コンポーネント・subpath）の変更なし。**lint plugin の公開 subpath を新規追加**。

### 追加

- **`eslint-rules/` を npm 配布に含めるようにした。** これまで tarball に入っておらず、
  melta-app を npm 依存する消費者プロジェクトへ **lint 強制層を配る手段が無かった**
  （コピペ配布は契約と実装が離れるので採らない）。`files` に `eslint-rules` を追加し、
  `exports` に subpath を開いた。**推奨エントリは論理名 `melta-app/eslint-plugin`**
  （物理ファイル名を互換性契約にしないため。`./eslint-rules/melta.mjs` も互換用に併設）:
  `import { meltaPlugin } from "melta-app/eslint-plugin";` で flat config に組み込める
- check-installability に eslint plugin の**実 import 検査**を追加（両 subpath から import し
  `meltaPlugin.rules` の 4 キーまで照合）。存在チェックだけでは exports 誤記・export 名変更・
  ルール欠落を検出できないため。`release` チェーンにも `check:installability` を組み込み、
  publish 前の必須ゲートにした

## 0.5.1 — 2026-07-29

公開 API の変更なし。開発時の診断とテストの追加のみ。

### 追加

- **Card の props を開発時に検査するようになった。** 型は TypeScript を使う利用者にしか
  効かないので、JavaScript から contract 2.1.0 の要求が静かに破られるのを防ぐ。
  検出するのは `primaryAction` / `onPress` の欠落と型違い、非インタラクティブ variant への
  誤った prop、存在しない variant（typo）。production では実行されない
- example カタログに**二重発火の手動 smoke** を追加。面と `primaryAction` に独立した
  カウンタを出し、`primaryAction` を1回タップして内側だけ +1 になることを実機で確認できる

### 内部

- 入れ子の押下（面と `primaryAction`）の回帰テストを追加。
  ⚠️ RNTL の `fireEvent` は responder negotiation を再現しないため、保証できるのは
  「RNTL が内側のハンドラを選び、面のハンドラを直接は呼ばない」という構造まで。
  実機の二重発火はカタログの手動 smoke が担う（web は react-native-web が
  `stopPropagation` を呼ぶことをソースで確認済み）

## 0.5.0 — 2026-07-29

### 破壊的変更

**Card の `variant="action"` / `"link"` に `primaryAction` が必須になった。`accessibilityLabel` prop を削除した。**

カード面自体を操作要素にするのをやめた。面に `accessibilityRole="button"` を付けていたため、
中に `Button` を置くと web で `<button>` の入れ子になり hydration error が出ていた
（production ビルドでは minified React error #418 に潰れて原因が読めなかった）。

面はキーボードでもスクリーンリーダーでも押せない。**面のタップはポインタ利用者向けの近道**であって、
他の入力手段からの到達手段にはならない。そのため「カード全体を押せるが、中に操作要素が無い」
状態を作れないよう、`primaryAction` を型で必須にした。

#### 移行

```diff
- <Card variant="action" onPress={openLog} accessibilityLabel="製作ログを開く">
-   <Text>工房 #12</Text>
- </Card>
+ <Card
+   variant="action"
+   onPress={openLog}
+   primaryAction={<Button label="製作ログを見る" onPress={openLog} />}
+ >
+   <Text>工房 #12</Text>
+ </Card>
```

- **`primaryAction` は面の `onPress` と同じ操作**を指す。別の遷移先にしない
- **`accessibilityLabel` は `primaryAction` 側に付ける**。名前は操作要素が持つ
- カード内に操作要素が複数ある場合、`primaryAction` に置くのは**主アクション**（面を押したときの遷移先と一致するもの）
- `variant="basic"` / `"media"` は変更なし

`primaryAction` の型は `ReactElement`。`null` や文字列は受け付けない
（「操作要素を必ず内包する」を型で成立させるため）。

### 変更

- Card の面が `role="article"` を名乗るようになった（契約の `a11y.role` をそのまま表現。
  react-native-web では `<article>` 要素になる）
- Card 自身の focus ring を削除。フォーカスを受けるのは `primaryAction` 側で、
  `Button` は自前の ring を持つ。カードにも出すと1回のフォーカスで ring が二重に描かれるため

### 契約の対応

| melta-app | melta-contracts | card contract |
|---|---|---|
| 0.5.0 | ^0.6.0 | 2.1.0 |
| 0.4.x | ^0.4.3 | 2.0.0 |

### 内部

- 契約の `a11y.role` と実装の `accessibilityRole` / `role` を機械照合する conformance 層を追加。
  今回の乖離は「conformance が styleRefs しか見ていなかった」ために長期間発見されなかった

---

## 0.4.3 — 2026-07-29

### 修正

- `defineTheme()` が入力オブジェクトと参照を共有していたため、開発時の再帰 freeze が
  呼び出し側の theme と melta 自身の `nativeTheme` の入れ子まで凍らせていた。
  `const derived = { ...nativeTheme }; derived.spacing["4"] = 8;` のような正当な派生が
  開発時に TypeError になっていた
- `validateTheme` は data property のときだけ値を検査するようにした（accessor は呼ばない）
- `supportedModes` / `resolveMode` が未知の値を黙って light 扱いにせず throw するようにした

## 0.4.2 — 2026-07-29

### 修正

- `declaredModes()` が解決後の theme に対して両 mode を返していた
  （`hasOwnProperty` が non-enumerable な番人の getter を値として数えていた）

> 0.4.0 / 0.4.1 は非推奨。0.4.0 は上の不具合を含み、0.4.1 は修正がビルド出力に入らないまま公開された。

## 0.4.0 — 2026-07-29

### 追加

- **`defineTheme()` と `<ThemeProvider theme={...}>`** — 消費者ブランドの theme を注入する口。
  未指定なら従来どおり melta 既定なので既存利用に影響はない
- 配色の能力（`colorScheme`）は `color.semantic` のキー集合から**導出**する。宣言する欄は無い。
  持っていない mode は書かない（単一 dark のブランドが light を嘘の値で埋めずに済む）
- `useTheme().capabilities` を追加

## 0.3.0 以前

`git log` を参照。
