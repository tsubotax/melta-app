// ⚠️ 自動生成ファイル — 手で編集しないこと。
// 生成元: scripts/generate-contract-types.ts（入力 melta-contracts/components/*.contract.json）
// 各 component の variant/size/state を contract から codegen した型 + 実行時メタ(__contract 用)。

/** 各 contract メタの shape（§2 A-3: 生成結果が shape から逸脱したら型で検知する）。 */
export interface ContractShape {
  id: string;
  version: string;
  variants: readonly string[];
  sizes: readonly string[];
  states: readonly string[];
}

export const CONTRACTS = {
  text: {
    id: "text",
    version: "0.1.0",
    variants: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"],
    sizes: [],
    states: ["default"],
  },
  button: {
    id: "button",
    version: "2.0.0",
    variants: ["contained", "outlined", "brand-outline", "neutral", "lighted", "danger", "subtle"],
    sizes: ["small", "medium", "large"],
    states: ["default", "hover", "focus", "disabled", "loading"],
  },
  tag: {
    id: "tag",
    version: "2.0.0",
    variants: ["basic", "removable", "filter-chip"],
    sizes: [],
    states: ["default", "active", "inactive", "hover", "focus"],
  },
  card: {
    id: "card",
    version: "2.0.0",
    variants: ["basic", "media", "action", "link"],
    sizes: [],
    states: ["default", "hover", "focus-within"],
  },
  image: {
    id: "image",
    version: "0.1.0",
    variants: ["default"],
    sizes: [],
    states: ["default", "error"],
  },
  surface: {
    id: "surface",
    version: "0.1.0",
    variants: ["default"],
    sizes: [],
    states: ["default"],
  },
  skeleton: {
    id: "skeleton",
    version: "2.0.0",
    variants: ["text", "card", "circle"],
    sizes: [],
    states: ["default", "loading", "loaded"],
  },
  emptyState: {
    id: "empty-state",
    version: "0.1.0",
    variants: ["default"],
    sizes: [],
    states: ["default"],
  },
  metric: {
    id: "metric",
    version: "0.1.0",
    variants: ["default"],
    sizes: ["sm", "md", "lg"],
    states: ["default"],
  },
} as const satisfies Record<string, ContractShape>;

export type ContractId = keyof typeof CONTRACTS;

/** contract の variant キー union（例: VariantOf<"text"> = "xs" | ... | "3xl"）。空なら never。 */
export type VariantOf<K extends ContractId> = (typeof CONTRACTS)[K]["variants"][number];
/** contract の size キー union（空なら never）。 */
export type SizeOf<K extends ContractId> = (typeof CONTRACTS)[K]["sizes"][number];
/** contract の state キー union。 */
export type StateOf<K extends ContractId> = (typeof CONTRACTS)[K]["states"][number];
