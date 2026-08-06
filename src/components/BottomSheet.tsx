/**
 * BottomSheet — 画面下から出る汎用シート container（content は自由 slot）。
 * contract: bottom-sheet（appFirst、feedback）。RN core Modal（transparent + slide）+
 * 下端 sheet（上角のみ radius）。ActionSheet がリスト特化なのに対しこちらは容器。
 *
 * - grabber は装飾バー。a11y ツリーから除外する（importantForAccessibility="no" +
 *   accessibilityElementsHidden。recipe description 参照）。
 * - スワイプで閉じるジェスチャは実装しない（overlay tap + Android back で閉じる、Phase 外）。
 * - sheet は下端密着（bg-surface）のため、SafeArea を sheet の内側に置いて
 *   下余白（ホームインジケータ）まで sheet 背景で覆いつつ content を安全域に収める。
 *   edge は bottom + 左右のみ（top は overlay 側で、シートは上端に接しない）。
 *   SafeArea 実装は registry 経由（safe-area-registry.ts）— "melta-app/safe-area" を
 *   有効化したアプリでは Android でも inset が入る（RN core の SafeAreaView は Android で no-op）。
 * - sheet 側は onStartShouldSetResponder で touch を claim し、overlay tap でだけ閉じる。
 * - style の決定は pure resolver（bottom-sheet.styles.ts）に分離 — recipe との機械照合対象。
 */

import { useMemo, type ReactNode } from "react";
import { Modal as RNModal, Pressable, Text as RNText, View } from "react-native";
import { useTheme } from "../theme/index.js";
import { CONTRACTS } from "../contracts/contract-types.js";
import { resolveBottomSheetStyle, type BottomSheetStyle } from "./bottom-sheet.styles.js";
import { resolveSafeAreaView, type SafeAreaEdge } from "./safe-area-registry.js";

/** シートは画面下端に密着するので top inset は不要。 */
const SHEET_EDGES: readonly SafeAreaEdge[] = ["bottom", "left", "right"];

interface BottomSheetProps {
  visible: boolean;
  /** 閉じ要求（overlay tap / Android back の全経路で呼ばれる）。 */
  onClose: () => void;
  /** シート見出し（任意）。 */
  title?: string;
  testID?: string;
  /** content slot（自由）。 */
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, title, testID, children }: BottomSheetProps) {
  const { theme, mode } = useTheme();

  const styles = useMemo<BottomSheetStyle>(
    () => resolveBottomSheetStyle(theme, mode),
    [theme, mode],
  );

  const SafeArea = resolveSafeAreaView(SHEET_EDGES);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlayStyle} onPress={onClose} accessible={false}>
        <View
          style={styles.sheetStyle}
          accessibilityViewIsModal
          onStartShouldSetResponder={() => true}
          testID={testID}
        >
          <SafeArea>
            {/* grabber: 装飾のみ（スワイプ操作は持たないため a11y から隠す） */}
            <View
              style={styles.grabberStyle}
              importantForAccessibility="no"
              accessibilityElementsHidden
            />
            {title != null && (
              <RNText style={styles.titleStyle} accessibilityRole="header">
                {title}
              </RNText>
            )}
            <View style={styles.contentStyle}>{children}</View>
          </SafeArea>
        </View>
      </Pressable>
    </RNModal>
  );
}

BottomSheet.__contract = CONTRACTS.bottomSheet;
