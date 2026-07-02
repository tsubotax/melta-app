/**
 * TextField.catalog — TextField の全 variant / size / 状態を実レンダ（§6）。
 * variant "disabled" は prop（disabled=true）で表現するため、variant prop の列挙は
 * default / error / success の3つ + disabled 行を分けて置く。
 */

import { useState } from "react";
import { View } from "react-native";
import { TextField } from "melta-app";
import { useTheme } from "melta-app";
import { CONTRACTS } from "melta-app";

export function TextFieldCatalog() {
  const { theme } = useTheme();
  const [value, setValue] = useState("");
  return (
    <View style={{ gap: theme.spacing["4"] }}>
      {/* 操作可能な default（helperText 付き） */}
      <TextField
        label="メールアドレス"
        value={value}
        onChangeText={setValue}
        placeholder="user@example.com"
        helperText="仕事用のアドレスを推奨"
      />
      {/* error（errorText 必須表示 = FORM_NO_COLOR_ONLY_ERROR） */}
      <TextField
        label="メールアドレス"
        value="invalid@"
        variant="error"
        errorText="有効なメールアドレスを入力してください"
      />
      {/* success */}
      <TextField label="メールアドレス" value="user@example.com" variant="success" />
      {/* disabled（prop で variant を上書き） */}
      <TextField label="メールアドレス" value="編集不可の値" disabled helperText="disabled" />
      {/* size 3 段 */}
      <View style={{ gap: theme.spacing["3"] }}>
        {CONTRACTS.textfield.sizes.map((s) => (
          <TextField key={s} label={`size ${s}`} value="" placeholder={s} size={s} />
        ))}
      </View>
    </View>
  );
}
