/**
 * Screen — 画面骨格 primitive（SafeArea + bg-page + content padding）。
 * contract: screen（app 先行定義、melta-contracts）。dogfood 不足-3（SafeAreaView + ScrollView +
 * ヘッダーの毎画面手書き）の解消。
 *
 * - variant="scroll"（default）は content を ScrollView に、"fixed" は flex:1 の View に載せる。
 * - header slot は scroll の外（SafeArea 直下）に固定する。
 * - padding は spacing token キー限定 | "none"（default "4"）。
 * - 決定ロジックは pure resolver（screen.styles.ts）に分離 — recipe との機械照合対象。
 *
 * SafeArea は registry（safe-area-registry.ts）で解決する。default は RN core の
 * SafeAreaView（deprecated / iOS のみの最小対応）で依存ゼロを維持しつつ、
 * react-native-safe-area-context 利用者は subpath "melta-app/safe-area" の
 * enableSafeAreaContext() で context hook + View adapter に差し替えられる
 * （rally-nav dogfood 由来、RN 0.85 Fabric/Android の初回 inset flash 対応）。
 * 適用する edge は `edges` prop（省略時は enableSafeAreaContext の既定）。
 */

import { useEffect, useMemo, type ReactNode, type Ref } from "react";
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { resolveSafeAreaView, type SafeAreaEdge } from "./safe-area-registry.js";
import { isDev } from "../theme/define-theme.js";
import { useTheme } from "../theme/index.js";
import { CONTRACTS, type VariantOf } from "../contracts/contract-types.js";
import { resolveScreenStyle, type ScreenPadding, type ScreenStyle } from "./screen.styles.js";

/** dev 警告の重複抑止（inline object の scrollViewProps で毎 render 鳴らさない）。 */
const warned = new Set<string>();

interface ScreenProps {
  /** 画面の骨格（contract variant）。default "scroll"。 */
  variant?: VariantOf<"screen">;
  /** content の padding（spacing token キー限定 | "none"）。default "4"。 */
  padding?: ScreenPadding;
  /**
   * safe-area を適用する辺。省略時は enableSafeAreaContext({ edges }) の既定。
   * タブバーが bottom を自前処理する画面は `["top"]` のように絞る。
   *
   * ⚠️ adapter 未登録（RN core SafeAreaView）では**無視される**（core は辺を選べない）。
   */
  edges?: readonly SafeAreaEdge[];
  /** scroll 外（SafeArea 直下）に固定されるヘッダー slot（Header を差す想定）。 */
  header?: ReactNode;
  /**
   * 内部 ScrollView への passthrough（variant="scroll" のみ）。children は Screen が持つ。
   *
   * - `contentContainerStyle` は DS の padding と**配列合成**される（渡した側が後勝ち。
   *   意図的な非常口 — DS の padding を残したい場合は padding 系を書かないこと）。
   * - `contentInsetAdjustmentBehavior` は**型で遮断**（safe-area は Screen 側が持つので
   *   iOS の自動 inset と必ず二重になる。正当な用途が無いため Omit）。
   */
  scrollViewProps?: Omit<ScrollViewProps, "children" | "contentInsetAdjustmentBehavior">;
  /**
   * 内部 ScrollView の ref（scrollTo / scrollToEnd 用、variant="scroll" のみ）。
   * Screen 自体は `__contract` 静的プロパティを持つため forwardRef 化せず別 prop にしている。
   */
  scrollViewRef?: Ref<ScrollView>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}

export function Screen({
  variant = "scroll",
  padding = "4",
  edges,
  header,
  scrollViewProps,
  scrollViewRef,
  style,
  testID,
  children,
}: ScreenProps) {
  const { theme, mode } = useTheme();

  const { safeAreaStyle, contentStyle } = useMemo<ScreenStyle>(
    () => resolveScreenStyle(theme, mode, { variant, padding }),
    [theme, mode, variant, padding],
  );

  // fixed には内部 ScrollView が無い＝渡された prop は黙って捨てられる。dev で気づけるようにする。
  const ignoresScrollProps =
    variant === "fixed" && (scrollViewProps != null || scrollViewRef != null);
  useEffect(() => {
    if (!isDev || !ignoresScrollProps) return;
    const message =
      'melta: Screen variant="fixed" では scrollViewProps / scrollViewRef は適用されない' +
      "（内部 ScrollView が無いため）。variant=\"scroll\" にするか prop を外すこと。";
    if (warned.has(message)) return;
    warned.add(message);
    console.warn(message);
  }, [ignoresScrollProps]);

  const SafeArea = resolveSafeAreaView(edges);

  return (
    <SafeArea style={[safeAreaStyle, style]} testID={testID}>
      {header}
      {variant === "scroll" ? (
        <ScrollView
          ref={scrollViewRef}
          // iOS の既定 0 は onScroll が 1 ドラッグ 1 発しか来ない（スクロール連動ヘッダが動かない）。
          // spread より前に置いて消費者が上書きできるようにする。
          scrollEventThrottle={16}
          {...scrollViewProps}
          // contentContainerStyle は素の spread だと DS の padding ごと消えるため配列合成（後勝ち）。
          contentContainerStyle={[contentStyle, scrollViewProps?.contentContainerStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </SafeArea>
  );
}

Screen.__contract = CONTRACTS.screen;
