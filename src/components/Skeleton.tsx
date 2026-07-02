/**
 * Skeleton — ローディングプレースホルダー（設計書 §1）。contract: skeleton。
 *
 * - variant: text（行バー）/ circle（アバター）/ card（Surface 土台 + 中にバー）。
 * - a11y: accessibilityState={{busy:true}} + accessibilityLabel（default "読み込み中"）。
 * - 色・寸法の決定は pure resolver（skeleton.styles.ts）に分離。card の Surface props も
 *   CARD_SURFACE_SPEC（同ファイル）を SSOT として共有し、
 *   recipes/app/skeleton.recipe.json との機械照合は scripts/lib/skeleton-conformance.test.ts が行う。
 * - bg: text/circle は border-default。card は Surface 土台（bg-surface+border+elevation.sm）
 *   の上に border-default のバーを置く（contract に忠実、§1 Agent m2）。
 * - pulse の reduce-motion 順序ハザード（§1）: Animated.Value を opacityFrom（= 非アニメ状態）で
 *   初期化し、effect 内で AccessibilityInfo.isReduceMotionEnabled() を await した後にのみ loop 開始する。
 *   同期的に loop を start すると reduce-motion ON でも一瞬光るため。ON 時は pulse 完全停止 + busy 維持。
 */

import { useEffect, useMemo, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Surface } from "./Surface";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import {
  CARD_SURFACE_SPEC,
  PULSE_OPACITY,
  SKELETON_METRICS,
  resolveSkeletonStates,
  resolveSkeletonVariants,
  type SkeletonVariant,
} from "./skeleton.styles";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  /** text variant の行数。 */
  lines?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Skeleton({
  variant = "text",
  width = "100%",
  lines = 1,
  accessibilityLabel = "読み込み中",
  style,
  testID,
}: SkeletonProps) {
  const { theme, mode } = useTheme();
  const styles = useMemo(() => resolveSkeletonVariants(theme, mode), [theme, mode]);
  // 初期値 opacityFrom = 非アニメ（reduce-motion でも光らない）。reduce-motion OFF を確認後にのみ loop で揺らす。
  const opacity = useRef(new Animated.Value(PULSE_OPACITY.from)).current;

  useEffect(() => {
    let cancelled = false;
    let loop: Animated.CompositeAnimation | null = null;
    // pulse の値（opacity 振れ幅 / duration）は resolver 側が SSOT（recipe states.loading と照合される）。
    const anim = resolveSkeletonStates(theme).loading.animation;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: anim.opacityTo,
            duration: anim.duration,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: anim.opacityFrom,
            duration: anim.duration,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [opacity, theme]);

  // contract a11y role は web の "status"。RN の accessibilityRole に status は無いため、
  // busy state + label で status 相当を表現する（§2 web→RN mapping、skeleton は busy で扱う）。
  const a11y = {
    accessible: true,
    accessibilityState: { busy: true },
    accessibilityLabel,
  };

  if (variant === "circle") {
    return (
      <Animated.View {...a11y} testID={testID} style={[styles.circle.style, { opacity }, style]} />
    );
  }

  if (variant === "card") {
    const { barStyle } = styles.card;
    const { borderWidth, borderColor } = styles.card.style;
    return (
      <Surface
        {...CARD_SURFACE_SPEC}
        // contract skeleton.card は border-default を要求（Surface は border を出さないので Skeleton で付与）。
        style={[{ borderWidth, borderColor }, style]}
        testID={testID}
      >
        <Animated.View {...a11y} style={{ opacity, gap: theme.spacing["3"] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing["3"] }}>
            <View
              style={{
                width: SKELETON_METRICS.circleSize,
                height: SKELETON_METRICS.circleSize,
                borderRadius: theme.radius.full,
                backgroundColor: barStyle.backgroundColor,
              }}
            />
            <View style={{ flex: 1, gap: theme.spacing["2"] }}>
              <View style={[barStyle, { width: "60%" }]} />
              <View style={[barStyle, { width: "40%" }]} />
            </View>
          </View>
          <View style={barStyle} />
          <View style={[barStyle, { width: "80%" }]} />
        </Animated.View>
      </Surface>
    );
  }

  // text（行バー）: recipe は 1 slot（style）に行バー + 行間 gap を併記 → gap はコンテナへ分離。
  const { gap, ...textBar } = styles.text.style;
  return (
    <Animated.View {...a11y} testID={testID} style={[{ gap, opacity }, style]}>
      {Array.from({ length: lines }, (_unused, i) => (
        <View
          key={i}
          style={[
            textBar,
            // 最終行だけ短く（自然な見た目）。
            { width: lines > 1 && i === lines - 1 ? "70%" : width },
          ]}
        />
      ))}
    </Animated.View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Skeleton.__contract = CONTRACTS.skeleton;
