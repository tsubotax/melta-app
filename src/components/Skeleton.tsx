/**
 * Skeleton — ローディングプレースホルダー（設計書 §1）。contract: skeleton。
 *
 * - variant: text（行バー）/ circle（アバター）/ card（Surface 土台 + 中にバー）。
 * - a11y: accessibilityState={{busy:true}} + accessibilityLabel（default "読み込み中"）。
 * - bg: text/circle は border-default（#e2e8f0）。card は Surface 土台（bg-surface+border+elevation.sm）
 *   の上に border-default のバーを置く（contract に忠実、§1 Agent m2）。
 * - pulse の reduce-motion 順序ハザード（§1）: Animated.Value を 1（= 非アニメ状態）で初期化し、
 *   effect 内で AccessibilityInfo.isReduceMotionEnabled() を await した後にのみ loop 開始する。
 *   同期的に loop を start すると reduce-motion ON でも一瞬光るため。ON 時は pulse 完全停止 + busy 維持。
 */

import { useEffect, useRef } from "react";
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

type SkeletonVariant = "text" | "circle" | "card";

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
  const { theme, colors } = useTheme();
  // 初期値 1 = 非アニメ（reduce-motion でも光らない）。reduce-motion OFF を確認後にのみ loop で揺らす。
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: theme.motion.duration.slow,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: theme.motion.duration.slow,
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

  const bar = colors["border-default"];
  const a11y = {
    accessible: true,
    accessibilityRole: "image" as const,
    accessibilityState: { busy: true },
    accessibilityLabel,
  };

  if (variant === "circle") {
    return (
      <Animated.View
        {...a11y}
        testID={testID}
        style={[{ width: 40, height: 40, borderRadius: theme.radius.full, backgroundColor: bar, opacity }, style]}
      />
    );
  }

  if (variant === "card") {
    return (
      <Surface radius="lg" elevation="sm" padding="6" style={style} testID={testID}>
        <Animated.View {...a11y} style={{ opacity, gap: theme.spacing["3"] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing["3"] }}>
            <View style={{ width: 40, height: 40, borderRadius: theme.radius.full, backgroundColor: bar }} />
            <View style={{ flex: 1, gap: theme.spacing["2"] }}>
              <View style={{ height: 12, borderRadius: theme.radius.sm, backgroundColor: bar, width: "60%" }} />
              <View style={{ height: 12, borderRadius: theme.radius.sm, backgroundColor: bar, width: "40%" }} />
            </View>
          </View>
          <View style={{ height: 12, borderRadius: theme.radius.sm, backgroundColor: bar }} />
          <View style={{ height: 12, borderRadius: theme.radius.sm, backgroundColor: bar, width: "80%" }} />
        </Animated.View>
      </Surface>
    );
  }

  // text（行バー）
  return (
    <Animated.View {...a11y} testID={testID} style={[{ gap: theme.spacing["2"], opacity }, style]}>
      {Array.from({ length: lines }, (_unused, i) => (
        <View
          key={i}
          style={{
            height: 14,
            borderRadius: theme.radius.sm,
            backgroundColor: bar,
            // 最終行だけ短く（自然な見た目）。
            width: lines > 1 && i === lines - 1 ? "70%" : width,
          }}
        />
      ))}
    </Animated.View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Skeleton.__contract = CONTRACTS.skeleton;
