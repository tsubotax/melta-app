# 変更履歴

このファイルが変更履歴の正本。npm に公開したバージョンだけを記録する。

形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/)、版番は [Semantic Versioning](https://semver.org/lang/ja/) に従う。
0.x 系なので**破壊的変更は minor で表現する**（`0.4.x` → `0.5.0`）。

---

## 0.7.0 — 2026-08-06

**破壊的変更（0.x 運用なので minor で表現）**: `enableSafeAreaContext({ edges })` の `edges` の
意味変更（アプリ全体 → `Screen` の既定値）/ `ActionSheet` の safe-area 位置の変更（見た目が変わる）/
`Checkbox` 行の `minHeight: 44` 化（行が最大 8pt 高くなる）。詳細は下記「変更」。

### 追加

- **`Screen` に `edges` / `scrollViewProps` / `scrollViewRef` を追加**（dogfood 不足-22 / 不足-24 の解消）。
  safe-area を適用する辺を画面ごとに指定でき（`<Screen edges={["top"]}>`）、内部 ScrollView へ
  `onScroll` / `keyboardShouldPersistTaps` / `refreshControl` 等を渡せる（`variant="scroll"` のみ。
  `variant="fixed"` に渡すと dev ビルドで warn）。`contentContainerStyle` は DS の padding と
  **配列合成**（渡した側が後勝ち）なので DS の padding が丸ごと消えない。内部 ScrollView の
  `scrollEventThrottle` 既定は `16`（iOS 既定 0 では `onScroll` が 1 ドラッグ 1 発しか来ず、
  スクロール連動ヘッダが動かないため。上書き可）
- **`Text` に `allowFontScaling` / `maxFontSizeMultiplier` を追加**（RN `Text` へ透過。既定は
  未指定 = RN 既定で OS の文字サイズ設定に追随）
- **`Icon` の `color` が status 色を受けるようになった** — `"status-success"` / `"status-warning"` /
  `"status-error"`（`theme.color.status.*.base` を解決。ActionSheet の destructive ラベルと同じ慣用）。
  `"status-info"` は無い（status token に info の実体が無いため。info 相当は `color="text-accent"`）
- **読み上げラベルの i18n フック**（既定は日本語のまま据え置き = 既存アプリの VoiceOver は不変）:
  `Toast` / `Alert` / `Modal` の `closeAccessibilityLabel?: string`（既定 `"閉じる"`）、
  `TextField` の `formatErrorAccessibilityLabel?: (label, errorText) => string`
  （既定 `` `${label}。エラー: ${errorText}` ``）

### 修正

- **`ActionSheet` / `BottomSheet` の safe-area が Android で効いていなかった**。RN core の
  `SafeAreaView` 直 import で、core は `Platform.select({ ios: native, default: View })` =
  **Android では素の View（完全 no-op）**。シートがジェスチャバーの下に敷かれていた。
  safe-area registry 経由に変更し、`melta-app/safe-area` を有効化したアプリでは Android でも
  下 inset が入る（シートの edge は bottom + 左右で固定。`enableSafeAreaContext` の `edges`
  指定には引きずられない）
- **`Toast` の action と × が押し違いを起こしていた** — 両方に hitSlop 10 が付き、間隔 gap 12 に
  対し当たり判定が **8pt 重なっていた**（重なる帯では × が押し勝ち、「元に戻す」を押したつもりが
  Toast が閉じる）。横方向の hitSlop を gap/2 = 6 に絞り、× は箱の幅下限を 32pt に広げて
  実効 44pt を維持
- **`Modal` の × のタップ標的が実効 29pt しかなかった** — 箱の下限が無く、グリフ幅 + hitSlop 8 のみ。
  Toast / Alert と同じ正典パターン（視覚 24 の箱 + hitSlop 10 = 44pt）へ
- **dark モードで `Tag variant="basic"` がカードに溶けて見えなかった** — dark の `bg-page-alt` が
  `bg-surface` と同値 `#1e293b`（コントラスト比 1.00:1）だったのが原因。melta-contracts 0.7.0 で
  dark `bg-page-alt` = `#334155` に分離され、`native-theme.ts` の再生成で解消
  （`TextField` disabled の背景が同化していた問題も同時に解消。Tag 側のコード変更は無し）
- **OS の文字サイズ拡大で `Button` / `TextField` の文字がクリップしていた** — 高さが `height` 固定
  だった（`Button` medium は fontScale 1.12x からクリップ）。`minHeight` に変更して縦に伸びるように。
  `Button` の iconOnly だけは正方形を保つため width/height 固定のまま（中身が glyph で伸びない）
- **`Avatar` の initials が文字サイズ拡大で円から溢れていた** — 器（円）は伸びないため、size 別の
  `maxFontSizeMultiplier`（small 1.6 / medium 1.5 / large 1.3 = box ÷ lineHeight の切り捨て）で
  溢れだけを止める。拡大自体は許す。利用側の指定は不要
- **`moduleResolution: node16` / `nodenext` の TypeScript 消費者で型が解決できなかった問題を修正**。
  配布する `.d.ts` の相対 import が拡張子なし（`from "./theme"`）で、`lib/typescript/package.json` が
  `{"type":"module"}` のため ESM 扱いになり `TS2834`（Relative import paths need explicit file
  extensions）で落ちていた。**`skipLibCheck: true`（各種テンプレートの既定）の消費者では
  エラーが黙殺され、`melta-app` の export が「存在しないメンバー」として型だけ静かに欠落する**
  という気づきにくい壊れ方をしていた。`src/` の相対 import 193 か所すべてに `.js` 拡張子を
  明示して修正（TS の ESM 規約どおり `./x.js` はソースの `./x.ts` を指す。ディレクトリ import は
  `./x/index.js` に展開）。ランタイムの解決先は変わらないので、Metro / bundler 消費者への影響は無い
- **`melta-app/eslint-plugin` に型が付いた**。`eslint-rules/melta.d.mts` を追加し、exports の
  `./eslint-plugin` / `./eslint-rules/melta.mjs` に `types` 条件を宣言。従来は型が引けず、
  TS 消費者の flat config で暗黙 `any` になっていた（`MeltaPlugin` / `MeltaRuleName` /
  `MeltaFlatConfig` を型として公開。ESLint 本体の型には依存しない）

### 変更

- **実効タップ標的 44pt を全操作要素に横断適用**（視覚寸法は据え置き、当たり判定だけ拡張。
  契約側の根拠は melta-contracts 0.7.0 の `A11Y_MIN_TAP_TARGET_44`）。新たに 44pt を満たすのは
  `Button` small/medium（縦 hitSlop 6/2、iconOnly は四方）/ `Tag filter-chip`（縦 5）/
  `Radio` option 行（`minHeight: 44`）/ `Toggle`（縦 10/8）。従来から満たしていた
  Tag removable × / Toast × / Alert × / Checkbox は不変。破壊的変更ではない
  （props / 型の削除なし。`Button` labeled の `height` → `minHeight` 化により、消費者が
  `style={{ height }}` で上書きしていた場合のみ合成挙動が変わり得る）
- **`Checkbox` のタップ標的を hitSlop 12 から行の `minHeight: 44` へ変更**（Codex レビュー反映）。
  旧実装は行全体の Pressable に四方 hitSlop が付いており、縦積みの隣接 Checkbox と当たり判定が
  最大 24pt 重なっていた。Radio の option 行と同じ手当て（規約 10-(b)）に統一。
  行の高さが最大 8pt 高くなる（背景を持たないため塗りは変わらない）
- **`Screen` の `scrollViewProps` から `contentInsetAdjustmentBehavior` を型で遮断**
  （Codex レビュー反映）。safe-area は Screen 側が持つため iOS の自動 inset と必ず二重になり、
  正当な用途が無い。`contentContainerStyle` の後勝ち合成は意図的な非常口として維持
- **`enableSafeAreaContext({ edges })` の `edges` の意味が変わった**（シグネチャは互換）。
  「アプリ全体で 1 個のグローバル」から「**`Screen` の既定値**」へ。シート系はこの指定に
  関わらず自前の edge を使う。タブバー対応の推奨も「アプリ全体を `edges: ["top"]`」から
  「**タブ配下の画面だけ `<Screen edges={["top"]}>`**」に変更（グローバル top-only は
  シート系の下余白まで削るため推奨から外した）
- **`ActionSheet` の safe-area の位置を `BottomSheet` と同じ「内側」に統一**（見た目が変わる）。
  従来は sheet 群の外側にあり、iOS では inset 帯に overlay の黒が見えていた。最下部の面
  （cancel）の内側に移し、inset 帯まで `bg-surface` で塗られるように。引き換えに cancel
  ブロックは inset のぶん背が高くなる
- **peerDependencies を実態に合わせて宣言**: `react >=18.2.0` / `react-native >=0.71.0`
  （`gap` レイアウトと `role` prop が RN 0.71 導入のため。従来の `"*"` は 0.70 以下でも
  install できてしまい、無言でレイアウトが崩れる状態だった）。README に RN 版対応表を追加
- `engines.node >=22` を宣言（CI・ツール面の検証環境を package.json で機械宣言し、README にも明記）
- 配布物が **ESM のみ**であることを README に明記（CJS dual 出力はしない方針を確定）

### 内部

- normalize-tokens.test の実 tokens 検証を fail-closed 化（npm → 兄弟の順で解決し、
  どちらも無ければ throw。旧実装は兄弟パス直書きのみで、兄弟 melta-ui を意図的に置かない
  CI では **silent skip** されていた）
- README に CI / npm バッジを追加
- **installability ゲートを 3 構成 × 4 fixture に拡張**。従来は `moduleResolution: bundler` しか
  見ておらず、上記の node16/nodenext 型崩れを素通りさせていた。fixture（main / icons /
  safe-area / eslint-plugin）× moduleResolution（bundler / node16 / nodenext）の計 12 回の tsc に
  加えて、[attw](https://github.com/arethetypeswrong/arethetypeswrong.github.io)（`@arethetypeswrong/cli`、
  バージョン固定）で tarball の exports を resolution mode ごとに直接検査する。
  attw の ignore は ESM-only 方針と整合する `node10` / `node16-cjs` の 2 列だけ
  （`--profile esm-only`）で、`node16 (from ESM)` と `bundler` は fail 条件のまま
- jest に `moduleNameMapper`（`^(\.{1,2}/.*)\.js$` → `$1`）を追加。babel-jest は TS の
  `./x.js` → `./x.ts` 規約を解決できないため（jest 公式が ESM+TS 向けに案内している対処）
- README に **bare React Native** 節（optional peer はネイティブモジュールなので
  `npx pod-install` + ネイティブ再ビルドが要る）と **`__DEV__`** 節（Metro 以外では
  dev 検証が自動で無効になる。有効化は `NODE_ENV=development` か define）を追加
- **safe-area registry をファクトリ化**（`resolveSafeAreaView(edges)`）。消費者ごとに必要な
  edge が違う（Screen = 可変 / シート系 = 下端固定）ため。生成物は edges の正規化キーで
  memo（render 中に呼ばれるので、毎回別コンポーネント型を返すと subtree が unmount/remount
  して state が消える）。未登録時のフォールバックは従来どおり RN core SafeAreaView
  （core は辺を選べないため `edges` は無視される — README に明記）
- **`src/a11y/tap-target.ts` を新設**（44pt 方針の数値 SSOT、公開面には出さない）+
  **`tap-target-conformance.test.ts`（51 ケース）**。全操作要素の実効タップ標的 ≥44pt を
  styles resolver の出力 + hitSlop 定数から機械照合。hitSlop 値は各 `*.styles.ts` に
  literal で置く規約（導出関数から自動計算すると視覚寸法の変更に hitSlop が追随して
  検査が構造的に素通りするため）。「定数を export しただけで component が使っていない」
  を塞ぐ参照検査つき。AGENTS.md の resolver 規約に規約 10（タップ標的 3 原則）を追加
- ThemeProvider / defineTheme の docstring を実態へ訂正: dev で入れ子まで freeze されるのは
  `defineTheme()` の戻り値（= `useTheme().theme`）。公開 export の `nativeTheme` は
  `cloneTokenTree` で参照が切られているため凍らない（0.4.3 で意図的に変更済み。
  docstring だけが 0.4.2 以前の記述のまま残っていた）
- `native-theme.ts` を melta-contracts 0.7.0 から再生成（dark `bg-page-alt: #334155`）。
  `BUTTON_SIZE_SPEC` / `TEXTFIELD_SIZE_SPEC` のキーを `minHeight` に改名し（recipe 0.7.0 と
  語彙を統一）、conformance に「recipe に `height` が復活したら落ちる」検査を追加

---

## 0.6.0 — 2026-08-06

**破壊的変更（0.x 運用なので minor で表現）: 8 段中 5 段の lineHeight が +1〜2px 広がる。**
modelog dogfood で実害が出た「行間不足による Android の字形欠け」（濁点 clip、「ギ」が「チ」に
見える）への対策。固定高・行数制限・詰め込みレイアウトを持つ消費者は表示を確認すること。

### 変更

- **行間に安全下限（`minLineHeightRatio`）を導入した。** RN Android の `CustomLineHeightSpan` は
  `lineHeight < ascent + descent` のとき字形の描画領域そのものを削り、`overflow: hidden` で
  はみ出しが消える（機序・実測・既定値の根拠は `src/theme/line-height.ts` のコメント）。
  消費者側に安全な回避策が無い（`includeFontPadding` 等はすべて検証済みで不成立）ため、
  DS 側で下限を持つ:
  - 既定は **1.45** = Android の日本語 system フォント Noto Sans CJK JP の実測 1.448 の切り上げ
    （AOSP 版・Google Fonts 版とも同値、2026-08-06 実測）。melta はフォントを同梱しないので、
    system フォント環境を基準にする。iOS には この clip 機序が無いため基準にしない
  - フォントを同梱する消費者は theme の `typography.minLineHeightRatio` に実測値を宣言する
    （例: LINE Seed JP = 1.61。ラテン専用フォントなら下げる宣言も可）
  - 下限の丸めは**切り上げ**（四捨五入だと 32 × 1.45 = 46.4 → 46 で下限を割る）
- **既定 theme の lineHeight が 5 段変わる**: xxs 14→15 / xs 18→19 / xl 31→32 /
  2xl 36→38 / 3xl 45→47（sm / base / lg は宣言比率が下限より広いため据え置き）。
  web 共有の contracts tokens には手を入れていない（web に clip 機序が無いため、
  下限は native 正規化のポリシーとして normalize-tokens 側で持つ）
- **クランプは 3 か所で効く**: ① codegen（native-theme 生成時）② pure resolver
  （`resolveTextShape` / `resolveMetricStyles` — defineTheme で注入されたカスタム theme の
  未クランプ値への防波堤）③ `Text` の最終 style 合成後（消費者の `style={{lineHeight}}` は
  合成順で resolver に勝つため、flatten 後の最終値に掛ける。fontSize の上書きにも追随する）

### 追加

- theme から `DEFAULT_MIN_LINE_HEIGHT_RATIO` / `minLineHeightFor` / `clampLineHeight` を公開
  （消費者が自前の style 定数を検査する用途にも使える）
- `defineTheme` の validation に `minLineHeightRatio` の形式検査を追加（1 以上の有限数のみ）
- クランプの回帰テスト: pure 層（`scripts/lib/line-height.test.ts`）+ RN render 層
  （`src/__tests__/text-lineheight.test.tsx`、消費者上書きに勝つことの検証）

---

## 0.5.3 — 2026-08-04

既存 API（コンポーネント・subpath）の変更なし。**lint plugin に推奨 config を追加**。
外部消費者 rally-nav での実導入フィードバック（`melta-harness-install-log.md` の T6 / T11 / T12）由来。

### 追加

- **`meltaPlugin.configs.recommended` を追加した。** これまで推奨 severity
  （color / radius = error、spacing / fontsize = warn）は**機械可読な公開 API として
  存在せず**（melta.mjs のコメントと README の記述のみ）、消費者が手で書き写す＝ドリフト源だった。
  flat config 形式の config オブジェクト（plugin 登録 + ルール 4 本）を配布物に含めたので、
  parser を持つ base config の上に `meltaPlugin.configs.recommended` を足すだけで導入できる。
  適用範囲（`files`）と parser はあえて持たせておらず、消費者側の構成に委ねる
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
- hook の入出力契約の E2E を追加（`scripts/lib/hook-lint.test.ts`、14 ケース）。
  「無出力を期待する」ケースだけでは hook が常に無出力になるバグを見逃すため、
  **故障系の陽性確認**（eslint 不在 / exit 2 / **hang（timeout）** / 出力破損 / 入力 JSON 破損 /
  引用符入りパス）を含む。eslint 実行には timeout（既定 30s）と maxBuffer を設定し、
  plugin/parser の hang や巨大出力も「無言の死」にせず additionalContext で表に出す
- 旧 bash 版との意図的な挙動差が 1 つある: 明示指定ファイルが eslint の ignores 対象のときの
  「File ignored」案内は違反ではないため additionalContext に流さなくなった
  （生成物の編集で毎回鳴るのを止めた。parse error はフィルタしない）
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
