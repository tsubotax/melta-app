/**
 * AvatarIcon.catalog — Avatar / Icon の実レンダ（設計書 §6）。
 * Icon は subpath エントリ（melta-app/icons、react-native-svg 隔離）からの import — 利用者と同経路。
 */

import { Avatar, Row, Stack, Text } from "melta-app";
import { useTheme } from "melta-app";
import { CONTRACTS } from "melta-app";
import { Icon, ICON_NAMES } from "melta-app/icons";

export function AvatarIconCatalog() {
  const { theme } = useTheme();
  return (
    <Stack gap="4">
      {/* Avatar: サイズ × initials */}
      <Row gap="3">
        {CONTRACTS.avatar.sizes.map((s) => (
          <Avatar key={s} name="Taro Tanaka" size={s} />
        ))}
        <Avatar name="ezo_rider" source={{ uri: "https://placehold.co/96x96/2b70ef/ffffff/png" }} />
      </Row>

      {/* Avatar: status dot（online / away / offline） */}
      <Row gap="3">
        <Avatar name="online" status="online" />
        <Avatar name="away" status="away" />
        <Avatar name="offline" status="offline" />
      </Row>

      {/* Avatar.Group: 重ね表示 */}
      <Avatar.Group>
        <Avatar name="Alice" size="small" />
        <Avatar name="Bob" size="small" />
        <Avatar name="Carol" size="small" />
      </Avatar.Group>

      {/* Icon: サイズ段階 */}
      <Row gap="3">
        <Icon name="like-on" size="sm" accessibilityLabel="いいね sm" />
        <Icon name="like-on" size="md" accessibilityLabel="いいね md" />
        <Icon name="like-on" size="lg" accessibilityLabel="いいね lg" />
        <Icon name="warning" size="lg" color="text-muted" />
      </Row>

      {/* Icon: 全グリフ一覧（glyphs.ts = codegen 生成物の目視確認） */}
      <Row gap="3" wrap>
        {ICON_NAMES.map((n) => (
          <Stack key={n} gap="1" align="center" style={{ width: theme.spacing["16"] }}>
            <Icon name={n} />
            <Text variant="xs" color="text-muted" numberOfLines={1}>
              {n}
            </Text>
          </Stack>
        ))}
      </Row>
    </Stack>
  );
}
