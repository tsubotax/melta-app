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
    version: "0.2.0",
    variants: ["xxs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl"],
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
  stack: {
    id: "stack",
    version: "0.1.0",
    variants: ["default"],
    sizes: [],
    states: ["default"],
  },
  row: {
    id: "row",
    version: "0.1.0",
    variants: ["default"],
    sizes: [],
    states: ["default"],
  },
  screen: {
    id: "screen",
    version: "0.1.0",
    variants: ["fixed", "scroll"],
    sizes: [],
    states: ["default"],
  },
  header: {
    id: "header",
    version: "0.1.0",
    variants: ["default"],
    sizes: [],
    states: ["default"],
  },
  icon: {
    id: "icon",
    version: "0.1.0",
    variants: ["default"],
    sizes: ["sm", "md", "lg"],
    states: ["default"],
  },
  avatar: {
    id: "avatar",
    version: "2.0.0",
    variants: ["image", "initials", "group"],
    sizes: ["small", "medium", "large"],
    states: ["default", "online", "away", "offline"],
  },
  textfield: {
    id: "textfield",
    version: "2.0.0",
    variants: ["default", "error", "disabled", "success"],
    sizes: ["small", "medium", "large"],
    states: ["default", "hover", "focus", "error", "disabled", "success"],
  },
  toggle: {
    id: "toggle",
    version: "2.0.0",
    variants: ["off", "on"],
    sizes: ["medium", "large"],
    states: ["off", "on", "hover", "focus", "disabled"],
  },
  checkbox: {
    id: "checkbox",
    version: "2.0.0",
    variants: ["default", "disabled", "indeterminate"],
    sizes: [],
    states: ["default", "checked", "unchecked", "indeterminate", "disabled", "error", "focus"],
  },
  radio: {
    id: "radio",
    version: "2.0.0",
    variants: ["vertical", "horizontal", "card-style"],
    sizes: [],
    states: ["default", "selected", "unselected", "disabled", "error", "focus"],
  },
  alert: {
    id: "alert",
    version: "2.0.0",
    variants: ["info", "success", "warning", "error"],
    sizes: [],
    states: ["default", "dismissing"],
  },
  toast: {
    id: "toast",
    version: "2.0.0",
    variants: ["success", "error", "warning", "info"],
    sizes: [],
    states: ["default", "entering", "visible", "dismissing", "hover"],
  },
  progress: {
    id: "progress",
    version: "2.0.0",
    variants: ["primary", "success", "indeterminate"],
    sizes: [],
    states: ["default", "determinate", "indeterminate", "complete"],
  },
  modal: {
    id: "modal",
    version: "2.0.0",
    variants: ["confirmation", "form", "alert"],
    sizes: ["small", "medium", "large"],
    states: ["default", "open", "closing"],
  },
  actionSheet: {
    id: "action-sheet",
    version: "0.1.0",
    variants: ["default"],
    sizes: [],
    states: ["default"],
  },
  bottomSheet: {
    id: "bottom-sheet",
    version: "0.1.0",
    variants: ["default"],
    sizes: [],
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
