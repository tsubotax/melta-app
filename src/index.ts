/**
 * melta-app — melta デザインシステムの React Native 実装（公開エントリ）。
 *
 * 契約（npm: melta-contracts）を SSOT とし、theme（トークンの RN 正規化）/
 * primitives / components がその契約を満たす。契約との整合は conformance テストが機械照合する。
 * アプリ本体ではなく UI kit。使い方はルートを ThemeProvider で包み、コンポーネントを import する。
 */

// theme: トークン（melta-contracts/tokens.json 由来、codegen 済み）+ Provider + helpers
export * from "./theme/index.js";

// primitives / components（契約 appStatus=implemented の集合と一致。conformance が担保）
export * from "./primitives/index.js";
export * from "./components/index.js";

// 契約メタ（variant/size/state の実行時参照 + 型。__contract 照合にも使う）
export {
  CONTRACTS,
  type ContractId,
  type ContractShape,
  type VariantOf,
  type SizeOf,
  type StateOf,
} from "./contracts/contract-types.js";
