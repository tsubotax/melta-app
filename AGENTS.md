# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# style resolver の規約

見た目の値を決めるロジックは component（`.tsx`）に書かず、隣の `<component>.styles.ts` に **pure module**
として置く。resolver は3世代が混在しているので、**現行世代を規範とする**。

- 規範（form / feedback 世代）: `alert.styles.ts` / `toast.styles.ts` / `textfield.styles.ts` /
  `empty-state.styles.ts` / `progress.styles.ts`
- 規範ではない（機構の初代。触るときに寄せる）: `button.styles.ts` / `tag.styles.ts` / `card.styles.ts`

1. **pure に保つ** — react-native の値 import は禁止（`import type` のみ可）。node の `tsx --test` から
   直接実行できることが conformance テストの前提。theme の helper も `../theme`（index）ではなく
   pure module（`../theme/line-height` / `../theme/letter-spacing`）から取る。index は ThemeProvider 経由で
   react-native を引き込む。
2. **token キーは `<COMPONENT>_SPEC` に集約** — `as const satisfies { padding: SpacingKey; radius: RadiusKey; … }`
   で theme のキー型に固定する。component 側も同じ定数を読む（component と resolver が別々にキーを持つと
   静かに drift する）。汎用名（`SIZE_SPEC` のような前置きなし）は使わない。
3. **戻り値は slot 単位の named interface** — `export interface XStyles { containerStyle: {…}; titleStyle: {…} }`。
   recipe（`recipes/app/<id>.recipe.json`）の styleRefs と 1:1 に対応させる。色だけの断片を返して
   寸法は component 側で組む、という分け方はしない（初代の形）。
4. **命名** — 全 slot を返す本体は `resolve<Component>Style` / `resolve<Component>Styles`、state 差分だけを
   返す補助は用途を名前に出す（`resolveTextFieldFocusStyle`）。定数は `<COMPONENT>_` 前置き。
5. **引数順は `(theme, mode, props)`** — mode 非依存の resolver は mode を取らない（`resolveTextShape`）。
6. **生値を直書きしない** — 色 / spacing / radius / fontSize は theme から引く。recipe 側が literal を持つ
   寸法（height 等）だけ SPEC に literal を置き、conformance で recipe と照合する。
7. **横断ロジックは共有 module へ** — status 色は `components/status-colors.ts`、行間の安全下限は
   `theme/line-height.ts`（`minRatioOf` / `clampLineHeight`）、letterSpacing は `theme/letter-spacing.ts`。
   同じ写像を2箇所に書かない。
8. **contract 由来の値の解決は SSOT を経由する** — 契約パッケージの所在は `scripts/lib/contracts-root.ts`、
   実装対象の allowlist は `scripts/generate-contract-types.ts` の `MVP_COMPONENTS` が SSOT。
9. **テストを同時に足す** — 新しい resolver には `scripts/lib/<id>-conformance.test.ts` を追加し、
   recipe の styleRefs と機械照合する（button だけは経緯上 `recipe-conformance.test.ts` に同居）。
