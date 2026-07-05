/**
 * Checkbox.catalog — Checkbox の全 variant / 状態を実レンダ（設計書 §6）。
 * 親子（すべて選択 + indeterminate）のトグルも実演する。
 */

import { useState } from "react";
import { View } from "react-native";
import { Checkbox } from "melta-app";
import { useTheme } from "melta-app";

export function CheckboxCatalog() {
  const { theme } = useTheme();
  const [agreed, setAgreed] = useState(false);
  const [items, setItems] = useState<Record<string, boolean>>({
    東京エリア: true,
    大阪エリア: false,
    名古屋エリア: false,
  });
  const values = Object.values(items);
  const allChecked = values.every(Boolean);
  const someChecked = values.some(Boolean);

  return (
    <View style={{ gap: theme.spacing["3"] }}>
      {/* 基本（checked / unchecked トグル） */}
      <Checkbox label="利用規約に同意する" checked={agreed} onChange={setAgreed} />

      {/* 親子 indeterminate（一部選択で mixed → 親タップで全選択/全解除） */}
      <Checkbox
        label="すべてのエリアを選択"
        checked={allChecked}
        indeterminate={someChecked && !allChecked}
        onChange={() =>
          setItems((c) => {
            const next = !Object.values(c).every(Boolean);
            return Object.fromEntries(Object.keys(c).map((k) => [k, next]));
          })
        }
      />
      <View style={{ paddingLeft: theme.spacing["6"], gap: theme.spacing["2"] }}>
        {Object.keys(items).map((key) => (
          <Checkbox
            key={key}
            label={key}
            checked={items[key]}
            onChange={(next) => setItems((c) => ({ ...c, [key]: next }))}
          />
        ))}
      </View>

      {/* error / disabled 状態 */}
      <Checkbox label="error（未チェック）" checked={false} onChange={() => {}} error />
      <Checkbox label="error（チェック済み）" checked onChange={() => {}} error />
      <Checkbox label="disabled（未チェック）" checked={false} onChange={() => {}} disabled />
      <Checkbox label="disabled（チェック済み）" checked onChange={() => {}} disabled />
      <Checkbox
        label="disabled（indeterminate）"
        checked={false}
        indeterminate
        onChange={() => {}}
        disabled
      />
    </View>
  );
}
