/**
 * ThemeProvider / useTheme — melta-app の theming 適用基盤（設計書 §3, B-3）。
 *
 * B-3: 形状（mode 非依存）は各 component 側で StyleSheet 化、色は theme.color.semantic[mode] から
 * render 時に取る。Provider は「現在の mode と、その mode の semantic 色」を配る役割。
 * useColorScheme() を Provider 内で1回だけ読む（RN コア、追加依存なし）。
 *
 * context value は useMemo 必須（§3）: 毎レンダで新オブジェクトを配ると全 consumer が再レンダする。
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { nativeTheme } from "./native-theme";
import type { NativeTheme, SemanticColors } from "./types";

export type ThemeMode = "light" | "dark";

export interface ThemeContextValue {
  /** 正規化済み theme 全体（色以外の形状トークンもここから取る）。 */
  theme: NativeTheme;
  /** 現在の表示モード。 */
  mode: ThemeMode;
  /** 現在 mode の semantic 色（= theme.color.semantic[mode]）。最頻アクセスなので展開済みで配る。 */
  colors: SemanticColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  /**
   * 明示モード。指定時は OS の colorScheme を無視して固定する。
   * カタログの light/dark トグル（§6）や、特定画面の固定表示に使う。
   */
  forcedMode?: ThemeMode;
}

export function ThemeProvider({ children, forcedMode }: ThemeProviderProps) {
  const system = useColorScheme();
  const mode: ThemeMode = forcedMode ?? (system === "dark" ? "dark" : "light");

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: nativeTheme,
      mode,
      colors: nativeTheme.color.semantic[mode],
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme は <ThemeProvider> の内側で呼んでください。");
  }
  return ctx;
}
