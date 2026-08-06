/**
 * Card — コンテンツコンテナ component（設計書 §1）。contract: card。
 *
 * - 土台の解決（bg/radius/elevation/border/padding）は pure resolver（card.styles.ts の
 *   resolveCardShape）に一元化し、非インタラクティブ(View)・インタラクティブ(Pressable) の
 *   両分岐で共有する（DRY、形状二重定義を防ぐ）。recipe との機械照合は
 *   scripts/lib/card-conformance.test.ts が行う。
 * - variant: basic/media は非インタラクティブ、action/link は Pressable。
 *   action/link は pressed 時 elevation.sm→md（§2 hover→pressed mapping）。
 *   focus-within は RN 非サポートとして明示 drop（§2）。
 * - 型で action/link は onPress 必須を強制（§4 の DU 精神。無言で非対話に落ちる事故を防ぐ）。
 * - **カード面自体は操作要素にしない**（contract 2.1.0 の a11y.required）。面の Pressable は
 *   `accessibilityRole` を名乗らず `accessible={false}`。理由は2つ:
 *     1. 面に button role を付けると、中に Button を置いたとき web で `<button>` の入れ子になり
 *        hydration error になる（production では minified React error #418 に潰れて原因が読めない）
 *     2. 面はキーボードでもスクリーンリーダーでも押せない。面のタップは**ポインタ向けの近道**で、
 *        他の入力手段からの到達は内包する `primaryAction` が担う
 *   そのため action/link は `primaryAction` を必須にする。書き忘れると「ポインタでしか押せない
 *   カード」が静かに出来上がるので、型で止める。
 * - `role="article"` は contract の a11y.role をそのまま表現したもの（RN の W3C 準拠 prop。
 *   react-native-web では実際に `<article>` 要素になる）。accessibilityRole 系とは別系統。
 * - **focus ring は Card では描かない**。フォーカスを受けるのは `primaryAction` 側で、
 *   melta の Button は自前の ring を持つ。カードにも出すと1回のフォーカスで ring が二重に描かれる。
 *   contract の focus-within は RN 非サポートとして明示 drop 済み（app recipe に記録あり）で、
 *   web だけ動く実装を残すとプラットフォーム非対称になるため、実装ごと持たない。
 * - `accessibilityLabel` は 0.5.0 で削除した。面が `accessible={false}` なので native では
 *   原理的に読まれず、web だけ `aria-label` として効く非対称な prop だった。
 *   名前は操作要素が持つべきなので `primaryAction` 側に付ける。
 * - Card は Image/Metric に依存しない（§1）。media/header/footer/children に呼び出し側が差し込む。
 *   呼び出し側（例: D2I）は用途に応じて slot に Image+Metric を compose する。
 * - media variant は overflow:hidden で角丸に画像をクリップし、body だけにパディング（contract と整合）。
 */

import { useEffect, type ReactElement, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/index.js";
import { CONTRACTS } from "../contracts/contract-types.js";
import { isDev } from "../theme/define-theme.js";
import { CARD_INTERACTIVE, resolveCardShape, resolveCardBodyStyle } from "./card.styles.js";
import { validateCardProps } from "./card.validate.js";

/**
 * 同じ問題を毎レンダー報告しないためのラッチ。
 *
 * **報告は effect の中で行う**（render 中ではない）。render 中だと、React が破棄する
 * speculative render や StrictMode の二重 render でもラッチが消費され、実際に commit された
 * 違反が報告されなくなりうる。検査の中身は card.validate.ts の純関数側でテストする。
 */
const reported = new Set<string>();

interface CardBase {
  header?: ReactNode;
  footer?: ReactNode;
  media?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** body。 */
  children: ReactNode;
}

// action/link（インタラクティブ）は onPress と primaryAction が必須、
// basic/media はどちらも取らない（§4 DU 精神）。
type CardProps = CardBase &
  (
    | { variant?: "basic" | "media"; onPress?: never; primaryAction?: never }
    | {
        variant: "action" | "link";
        onPress: () => void;
        /**
         * 面のタップと同じ遷移先を持つ操作要素（Button 等）。footer 位置に描画される。
         * 面は role を持たないので、キーボード / スクリーンリーダーからの唯一の到達手段になる。
         * 内包する操作要素が他にもある場合、ここに置くのは**主アクション**（contract 2.1.0）。
         */
        primaryAction: ReactElement;
      }
  );

export function Card({
  variant = "basic",
  header,
  footer,
  media,
  onPress,
  primaryAction,
  style,
  testID,
  children,
}: CardProps) {
  const { theme, mode } = useTheme();
  const interactive = CARD_INTERACTIVE[variant] && onPress != null;

  useEffect(() => {
    if (!isDev) return;
    for (const problem of validateCardProps({ variant, onPress, primaryAction })) {
      if (reported.has(problem)) continue;
      reported.add(problem);
      console.error(`melta: ${problem}`);
    }
  }, [variant, onPress, primaryAction]);
  const isMedia = variant === "media";

  const inner = (
    <>
      {media != null && <View>{media}</View>}
      <View style={resolveCardBodyStyle(theme, variant)}>
        {header}
        {children}
        {footer}
        {primaryAction}
      </View>
    </>
  );

  // media は内側 clip View で角丸クリップ（外枠の影を消さないため overflow は内側だけに置く、M-1）。
  // borderRadius は外枠 radius.lg から border 分を引かず同値でクリップ（視覚差は実機で微調整可）。
  const content = isMedia ? (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>{inner}</View>
  ) : (
    inner
  );

  if (!interactive) {
    return (
      <View role="article" testID={testID} style={[resolveCardShape(theme, mode, variant), style]}>
        {content}
      </View>
    );
  }

  // action/link: pressed 時 elevation.sm→md（focus 表示は primaryAction 側が持つ）。
  return (
    <Pressable
      role="article"
      onPress={onPress}
      // 面は「操作要素」ではなく article（contract 2.1.0）。accessibilityRole は名乗らない。
      // accessible={false} で a11y ツリーから子を畳まないことで、内包する primaryAction が
      // 独立した操作要素として読み上げられる（既定の Pressable は子を畳んでしまう）。
      accessible={false}
      testID={testID}
      style={({ pressed }) => [resolveCardShape(theme, mode, variant, pressed), style]}
    >
      {content}
    </Pressable>
  );
}

// conformance test 用の contract メタ（§2 A-3）。scripts/lib/conformance.test.ts が
// 「この宣言が正しい contract を指しているか」を静的スキャンで照合する。
Card.__contract = CONTRACTS.card;
