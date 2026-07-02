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
 * - sheet 群は SafeAreaView で包み下余白（ホームインジケータ）を確保（recipe description 参照）。
 * - sheet 側は onStartShouldSetResponder で touch を claim し、overlay tap でだけ閉じる。
 * - style の決定は pure resolver（action-sheet.styles.ts）に分離 — recipe との機械照合対象。
 */

import { useMemo } from "react";
import {
  Modal as RNModal,
  Pressable,
  SafeAreaView,
  Text as RNText,
  View,
} from "react-native";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import { resolveActionSheetStyle, type ActionSheetStyle } from "./action-sheet.styles";

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

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlayStyle} onPress={onClose} accessible={false}>
        {/* sheet 群（sheet + cancel）: SafeArea で下余白を確保し、touch を claim して overlay へ流さない */}
        <SafeAreaView
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
            <RNText style={styles.cancelTextStyle}>{cancelLabel}</RNText>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </RNModal>
  );
}

ActionSheet.__contract = CONTRACTS.actionSheet;
