/**
 * Modal.catalog — Modal をサイズ別に実レンダ（§6）。
 * オーバーレイ系のため「開く」ボタン + useState visible で実際に開閉できる形にする。
 * variant（confirmation/form/alert）は意味分類で style 共通のため、size 3 段の確認を主にする。
 */

import { useState } from "react";
import { View } from "react-native";
import { Button, Modal, Text, useTheme, CONTRACTS } from "melta-app";

type ModalSize = (typeof CONTRACTS.modal.sizes)[number];

export function ModalCatalog() {
  const { theme } = useTheme();
  const [size, setSize] = useState<ModalSize | null>(null);
  const close = () => setSize(null);

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["2"] }}>
      {CONTRACTS.modal.sizes.map((s) => (
        <Button key={s} variant="outlined" label={`open ${s}`} onPress={() => setSize(s)} />
      ))}
      <Modal
        visible={size != null}
        onClose={close}
        title="操作の確認"
        size={size ?? "medium"}
        footer={
          <>
            <Button variant="neutral" label="キャンセル" onPress={close} />
            <Button label="実行" onPress={close} />
          </>
        }
      >
        <Text>この操作を実行しますか？（size: {size}。overlay tap / × / Android back でも閉じる）</Text>
      </Modal>
    </View>
  );
}
