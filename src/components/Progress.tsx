/**
 * Progress — リニアプログレスバー（feedback）。contract: progress。
 * track の中を fill が value%（determinate）または往復アニメ（indeterminate variant）で埋める。
 *
 * - variant: primary / success（determinate、value 0〜100 を clamp）/ indeterminate（幅 40% の fill を
 *   Animated.loop の translateX 往復で流す。duration は theme.motion.duration.slow 基準）。
 * - MOTION_REDUCED_MOTION_REQUIRED（contract rule）: AccessibilityInfo.isReduceMotionEnabled() を
 *   初期読取り + reduceMotionChanged 購読で追従し、reduce motion 時は indeterminate のアニメを
 *   止めて静止 40% にする。translateX は 0 初期化なので同期起動でも一瞬動く事故は無い
 *   （Skeleton の順序ハザード対策と同趣旨）。
 * - a11y: accessibilityRole="progressbar" + accessibilityValue {min:0, max:100, now}
 *   （indeterminate は now を渡さない）+ accessibilityLabel=label（契約 required）。
 * - 色・寸法の決定は pure resolver（progress.styles.ts）に分離。track の semantic 色は dark 側解決。
 *   recipes/app/progress.recipe.json との機械照合は scripts/lib/progress-conformance.test.ts が行う。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import {
  PROGRESS_INDETERMINATE_FILL_RATIO,
  clampProgressValue,
  resolveProgressStyles,
  type ProgressVariant,
} from "./progress.styles";

interface ProgressProps {
  /** 進捗タイプ（contract variant）。default "primary"。 */
  variant?: ProgressVariant;
  /** 進捗値 0〜100（determinate 用。範囲外は clamp）。 */
  value?: number;
  /** 読み上げラベル（accessibilityLabel。契約 required）。 */
  label: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Progress({ variant = "primary", value, label, style, testID }: ProgressProps) {
  const { theme, mode } = useTheme();
  const styles = useMemo(() => resolveProgressStyles(theme, mode, variant), [theme, mode, variant]);
  const indeterminate = variant === "indeterminate";
  const clamped = clampProgressValue(value ?? 0);

  // indeterminate の往復アニメ: 0〜1 の進行値を track 実測幅で translateX に interpolate する。
  const progress = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    // reduce motion ON / determinate / 幅未計測 → アニメ無し（fill は左端 40% で静止）。
    if (!indeterminate || reduceMotion || trackWidth <= 0) {
      progress.setValue(0);
      return;
    }
    const duration = theme.motion.duration.slow;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [indeterminate, reduceMotion, trackWidth, progress, theme]);

  const onLayout = indeterminate
    ? (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)
    : undefined;

  // fill(40%) が track 内を左端 → 右端で往復する移動量。
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, trackWidth * (1 - PROGRESS_INDETERMINATE_FILL_RATIO))],
  });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={indeterminate ? { min: 0, max: 100 } : { min: 0, max: 100, now: clamped }}
      accessibilityLabel={label}
      testID={testID}
      onLayout={onLayout}
      style={[styles.trackStyle, style]}
    >
      {indeterminate ? (
        <Animated.View
          style={[
            styles.fillStyle,
            {
              width: `${PROGRESS_INDETERMINATE_FILL_RATIO * 100}%`,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : (
        <View style={[styles.fillStyle, { width: `${clamped}%` }]} />
      )}
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Progress.__contract = CONTRACTS.progress;
