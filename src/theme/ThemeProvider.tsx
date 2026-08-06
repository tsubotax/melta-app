/**
 * ThemeProvider / useTheme — melta-app の theming 適用基盤（設計書 §3, B-3）。
 *
 * B-3: 形状（mode 非依存）は各 component 側で StyleSheet 化、色は theme.color.semantic[mode] から
 * render 時に取る。Provider は「現在の mode と、その mode の semantic 色」を配る役割。
 * useColorScheme() を Provider 内で1回だけ読む（RN コア、追加依存なし）。
 *
 * context value は useMemo 必須（§3）: 毎レンダで新オブジェクトを配ると全 consumer が再レンダする。
 *
 * theme 注入（Step 2-①）: `theme` を渡すと消費者ブランドの theme で塗り替わる。未指定なら
 * 従来どおり codegen 済みの `nativeTheme`（＝既存消費者に破壊的変更なし）。渡せるのは
 * `defineTheme()` の戻り値だけ（define-theme.ts 参照）。
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { nativeTheme } from "./native-theme.js";
import { defineTheme, isDev, resolveMode, type ResolvedCapabilities, type ResolvedNativeTheme, type ThemeModeViolation } from "./define-theme.js";
import type { NativeTheme, SemanticColors, ThemeMode } from "./types.js";

export type { ThemeMode };

export interface ThemeContextValue {
  /**
   * 正規化済み theme 全体（色以外の形状トークンもここから取る）。
   *
   * 注: 単一 colorScheme の theme を注入した場合、`color.semantic` は**宣言された mode しか持たない**
   * （型は両方あるように見える）。持たない側を直接読むと原因を名指しするエラーで落ちる。
   * 現在 mode の色は `colors` を使うこと。
   */
  theme: NativeTheme;
  /** 現在の表示モード。 */
  mode: ThemeMode;
  /** 現在 mode の semantic 色（= theme.color.semantic[mode]）。最頻アクセスなので展開済みで配る。 */
  colors: SemanticColors;
  /** theme が持つ能力（`color.semantic` のキー集合などから導出済み）。 */
  capabilities: ResolvedCapabilities;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * 既定 theme。melta-contracts 由来の codegen 結果を注入経路と同じ形に通す（自分でも dogfood する）。
 *
 * dev で freeze されるのは **`defineTheme()` の戻り値**（= `useTheme().theme` として配られる
 * 解決済み theme）で、入れ子のトークン群まで再帰的に凍る。公開 export の `nativeTheme` 自体は
 * `defineTheme` 内の `cloneTokenTree` で参照が切り離されているので**凍らない**
 * （0.4.3 で意図的にこう変えた: 凍らせると `{ ...nativeTheme }` からの正当な派生が dev で壊れるため）。
 */
const DEFAULT_THEME: ResolvedNativeTheme = defineTheme({ ...nativeTheme, id: "melta" });

/**
 * 同じ矛盾を毎レンダー報告しないためのラッチ（StrictMode の二重 render も1回に畳む）。
 *
 * キーは **theme の参照**。id 文字列にすると、id 未設定の theme 同士や同じ id を持つ別 theme が
 * 互いの警告を打ち消してしまう（報告されるべき矛盾が黙る）。WeakMap なので theme が捨てられれば
 * エントリも消える＝動的に theme を作るアプリでも溜まらない。
 */
const reportedViolations = new WeakMap<ResolvedNativeTheme, Set<ThemeMode>>();

function reportViolation(theme: ResolvedNativeTheme, violation: ThemeModeViolation): void {
  let reported = reportedViolations.get(theme);
  if (reported === undefined) {
    reported = new Set();
    reportedViolations.set(theme, reported);
  }
  if (reported.has(violation.requested)) return;
  reported.add(violation.requested);
  console.error(
    `melta: forcedMode="${violation.requested}" が指定されたが、この theme は ` +
      `colorScheme=${violation.colorScheme} なので "${violation.resolved}" で描画する。` +
      `useTheme().capabilities.colorScheme を見て、対応していない mode は UI 側で出さないこと。`,
  );
}

interface ThemeProviderProps {
  children: ReactNode;
  /**
   * 明示モード。指定時は OS の colorScheme を無視して固定する。
   * カタログの light/dark トグル（§6）や、特定画面の固定表示に使う。
   *
   * theme が対応していない mode を渡した場合は theme 側の mode に clamp する（描画は止めない）。
   * dev ではその矛盾を console.error で1回だけ報告する。
   */
  forcedMode?: ThemeMode;
  /**
   * 消費者ブランドの theme。未指定なら melta 既定（`nativeTheme`）。
   * `defineTheme()` の戻り値を **module スコープで保持したもの**を渡すこと
   * （render 中に組み立てると毎レンダー参照が変わり、全 consumer が再レンダする）。
   */
  theme?: ResolvedNativeTheme;
}

export function ThemeProvider({ children, forcedMode, theme }: ThemeProviderProps) {
  const system = useColorScheme();
  const activeTheme = theme ?? DEFAULT_THEME;

  const { mode, violation } = resolveMode(
    activeTheme.capabilities.colorScheme,
    forcedMode,
    system === "dark" ? "dark" : "light",
  );
  if (isDev && violation) reportViolation(activeTheme, violation);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = activeTheme.color.semantic[mode];
    if (!colors) {
      // resolveMode が capability に従って選んだ mode なので、ここに来るのは theme が壊れている場合だけ。
      // 色が undefined のまま下流に流れると全 component が別々の場所で死ぬので、ここで落とす。
      throw new Error(
        `melta: theme "${activeTheme.id ?? "(id 未設定)"}" に mode="${mode}" の semantic 色が無い。`,
      );
    }
    return {
      // 配布時の型は NativeTheme のまま（既存の全 style resolver の署名を維持するため）。
      // 単一 colorScheme の theme では持たない mode のキーが実体に無く、型が実体より広い。
      // 到達しうる読みは resolveMode が保証した現在 mode だけで、他 mode を直接読んだ場合は
      // define-theme.ts の guard getter が原因を名指しして落とす。
      theme: activeTheme as unknown as NativeTheme,
      mode,
      colors,
      capabilities: activeTheme.capabilities,
    };
  }, [activeTheme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme は <ThemeProvider> の内側で呼んでください。");
  }
  return ctx;
}
