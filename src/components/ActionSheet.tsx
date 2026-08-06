/**
 * ActionSheet — 画面下から出るアクション/選択リスト。contract: action-sheet（appFirst、feedback）。
 * RN core Modal（transparent + slide）+ 下端 sheet。web の select / dropdown を APP に
 * adapted 変換する際の受け皿。
 *
 * - actions は縦積み（区切り線 border-default）、cancel は下に分離した独立ブロック
 *   （閉じる手段を複数持つ: cancelAction + overlay tap + Android back = contract a11y required）。
 * - destructive アクションは destructiveTextStyle（status.danger.base）で色を差し替える。
 *   色だけでなくラベル文言でも破壊的操作と分かる文言にするのは呼び出し側の責務（contract a11y）。
 * - 先頭 action の borderTop は title が無い場合は消す（title がある時だけ区切りとして意味を持つ）。
 * - action の onPress 後は onClose も呼ぶ（選択 = シートを閉じる）。
 * - 下余白（ホームインジケータ）は SafeArea で確保する（recipe description 参照）。位置は
 *   **最下部の面である cancel ブロックの内側**（BottomSheet と同じ「内側」方針に統一）。
 *   0.5.x までは sheet 群の外側に置いていたため、iOS では inset 帯に overlay の黒が見えていた。
 *   内側に移したことで inset 帯まで bg-surface で塗られる代わり、cancel ブロックは
 *   inset のぶん背が高くなる（ラベルは上寄りに見える）＝意図した見た目の変更。
 *   edge は bottom + 左右のみ（top は overlay 側で、シートは上端に接しない）。
 *   SafeArea 実装は registry 経由（safe-area-registry.ts）— "melta-app/safe-area" を
 *   有効化したアプリでは Android でも inset が入る（RN core の SafeAreaView は Android で no-op）。
 * - sheet 側は onStartShouldSetResponder で touch を claim し、overlay tap でだけ閉じる。
 * - style の決定は pure resolver（action-sheet.styles.ts）に分離 — recipe との機械照合対象。
 */

import { useMemo } from "react";
import { Modal as RNModal, Pressable, Text as RNText, View } from "react-native";
import { useTheme } from "../theme/index.js";
import { CONTRACTS } from "../contracts/contract-types.js";
import { resolveActionSheetStyle, type ActionSheetStyle } from "./action-sheet.styles.js";
import { resolveSafeAreaView, type SafeAreaEdge } from "./safe-area-registry.js";

/** シートは画面下端に密着するので top inset は不要。 */
const SHEET_EDGES: readonly SafeAreaEdge[] = ["bottom", "left", "right"];

export interface ActionSheetAction {
  label: string;
  onPress: () => void;
  /** 破壊的操作（色を danger に差し替え。文言でも破壊的と分かるようにすること）。 */
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  /** 閉じ要求（cancel / overlay tap / Android back / action 選択後の全経路で呼ばれる）。 */
  onClose: () => void;
  /** シート上部の説明ラベル（任意）。 */
  title?: string;
  /** 縦積みするアクション群。 */
  actions: ActionSheetAction[];
  /** キャンセル行のラベル。default "キャンセル"。 */
  cancelLabel?: string;
  testID?: string;
}

export function ActionSheet({
  visible,
  onClose,
  title,
  actions,
  cancelLabel = "キャンセル",
  testID,
}: ActionSheetProps) {
  const { theme, mode } = useTheme();

  const styles = useMemo<ActionSheetStyle>(
    () => resolveActionSheetStyle(theme, mode),
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
        {/* sheet 群（sheet + cancel）: touch を claim して overlay へ流さない */}
        <View
          accessibilityViewIsModal
          onStartShouldSetResponder={() => true}
          testID={testID}
        >
          <View style={styles.sheetStyle}>
            {title != null && <RNText style={styles.titleStyle}>{title}</RNText>}
            {actions.map((action, index) => (
              <Pressable
                key={`${index}-${action.label}`}
                accessibilityRole="button"
                onPress={() => {
                  action.onPress();
                  onClose();
                }}
                style={[
                  styles.actionStyle,
                  // 先頭 action の区切り線は title がある時だけ意味を持つ
                  index === 0 && title == null ? { borderTopWidth: 0 } : null,
                ]}
              >
                <RNText
                  style={action.destructive ? styles.destructiveTextStyle : styles.actionTextStyle}
                >
                  {action.label}
                </RNText>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelStyle}>
            {/* SafeArea は最下部の面（cancel）の内側 = inset 帯を overlay の黒でなく bg-surface で塗る */}
            <SafeArea>
              <RNText style={styles.cancelTextStyle}>{cancelLabel}</RNText>
            </SafeArea>
          </Pressable>
        </View>
      </Pressable>
    </RNModal>
  );
}

ActionSheet.__contract = CONTRACTS.actionSheet;
