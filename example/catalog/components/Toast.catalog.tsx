/**
 * Toast.catalog — Toast の全 variant を実レンダ（設計書 §6）。
 * presentational component なので画面下部固定等はせず、そのまま縦に並べて目視確認する
 * （表示位置・キュー・自動消滅はアプリ層の責務）。description / action 付きの組み合わせも置く。
 */

import { View } from "react-native";
import { Toast } from "melta-app";
import { useTheme } from "melta-app";
import { CONTRACTS } from "melta-app";

export function ToastCatalog() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing["3"] }}>
      {/* variant 別（message + closeButton） */}
      {CONTRACTS.toast.variants.map((v) => (
        <Toast key={v} variant={v} message={`variant ${v}: 保存しました`} onClose={() => {}} />
      ))}
      {/* description 付き */}
      <Toast
        variant="success"
        message="レポートカードを作成しました"
        description="最新のレポートデータを取り込みました。"
        onClose={() => {}}
      />
      {/* action 付き */}
      <Toast
        variant="error"
        message="アップロードに失敗しました"
        actionLabel="再試行"
        onAction={() => {}}
        onClose={() => {}}
      />
    </View>
  );
}
