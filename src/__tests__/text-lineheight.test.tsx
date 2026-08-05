/**
 * text-lineheight — Text の行間安全下限が**消費者 style の上書きに勝つ**ことの RN render テスト。
 *
 * pure resolver 側のクランプは scripts/lib/line-height.test.ts が受け持つ。ここで見るのは
 * Text.tsx の合成順の問題: 消費者 style は `[shape, {color}, style]` の最後＝上書きが勝つため、
 * resolver 内のクランプだけでは `style={{lineHeight: 16}}` が素通りする（2026-08-05 の
 * modelog 事故の再現条件）。flatten 後の最終値に下限が掛かっていることを render tree で検査する。
 * 機序と 1.45 の根拠は src/theme/line-height.ts。
 */

import { describe, test, expect } from "@jest/globals";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";
import { ThemeProvider, Text, defineTheme, nativeTheme } from "../index";

/** render().toJSON() の最小 shape（react-test-renderer 型に依存しない）。 */
interface Node {
  type: string;
  props?: { style?: unknown };
  children?: (Node | string)[] | null;
}

/** style（配列 or object）を flatten して plain object にする。 */
function flatStyle(node: Node): Record<string, unknown> {
  const s = node.props?.style;
  const list = Array.isArray(s) ? s.flat(Infinity) : [s];
  return Object.assign({}, ...list.filter(Boolean));
}

async function renderedStyle(ui: React.ReactElement): Promise<Record<string, unknown>> {
  const { toJSON } = await render(<ThemeProvider forcedMode="light">{ui}</ThemeProvider>);
  return flatStyle(toJSON() as unknown as Node);
}

describe("Text 行間の安全下限", () => {
  test("消費者の lineHeight 詰め上書きは下限（fontSize × 1.45 切り上げ）でクランプされる", async () => {
    // xs = 13px、事故時の詰め方（16 ≒ 1.23）を上書きで渡す
    const style = await renderedStyle(
      <Text variant="xs" style={{ lineHeight: 16 }}>
        ギュネイ
      </Text>,
    );
    expect(style.lineHeight).toBe(Math.ceil(13 * 1.45)); // 19
  });

  test("下限以上の上書きはそのまま通る（広げる方向は止めない）", async () => {
    const style = await renderedStyle(
      <Text variant="xs" style={{ lineHeight: 26 }}>
        ギュネイ
      </Text>,
    );
    expect(style.lineHeight).toBe(26);
  });

  test("fontSize を上書きした場合、下限は最終 fontSize から算出される", async () => {
    // fontSize 20 へ拡大 + lineHeight 詰め → 下限は ceil(20 × 1.45) = 29（variant の 13 基準ではない）
    const style = await renderedStyle(
      // eslint-disable-next-line melta/no-raw-fontsize -- 生数値の上書きにクランプが追随することを検証するテスト
      <Text variant="xs" style={{ fontSize: 20, lineHeight: 20 }}>
        ギュネイ
      </Text>,
    );
    expect(style.lineHeight).toBe(29);
  });

  test("上書きなしの既定はクランプ済み theme の値", async () => {
    const style = await renderedStyle(<Text variant="xs">ギュネイ</Text>);
    expect(style.lineHeight).toBe(19); // native-theme（codegen 済み）の xs
  });

  test("StyleSheet.create の registered style でもクランプされる", async () => {
    const s = StyleSheet.create({ tight: { lineHeight: 10 } });
    const style = await renderedStyle(
      <Text variant="xs" style={s.tight}>
        ギュネイ
      </Text>,
    );
    expect(style.lineHeight).toBe(19);
  });

  test("入れ子配列の style でもクランプされる", async () => {
    const style = await renderedStyle(
      <Text variant="xs" style={[[{ lineHeight: 10 }]]}>
        ギュネイ
      </Text>,
    );
    expect(style.lineHeight).toBe(19);
  });

  test("lineHeight: 0 もクランプされる（0 は『無指定』ではなく極端な詰め）", async () => {
    const style = await renderedStyle(
      <Text variant="xs" style={{ lineHeight: 0 }}>
        ギュネイ
      </Text>,
    );
    expect(style.lineHeight).toBe(19);
  });

  test("lineHeight: undefined の明示上書きは自然行高（フォント既定 metrics）に戻り、安全", async () => {
    const style = await renderedStyle(
      <Text variant="xs" style={{ lineHeight: undefined }}>
        ギュネイ
      </Text>,
    );
    expect(style.lineHeight).toBeUndefined();
  });

  test("fontSize: undefined の明示上書きは variant の fontSize に復元される（クランプ基準との齟齬防止）", async () => {
    const style = await renderedStyle(
      <Text variant="xs" style={{ fontSize: undefined, lineHeight: 10 }}>
        ギュネイ
      </Text>,
    );
    expect(style.fontSize).toBe(13); // variant xs の値（RN 既定サイズで描かれる齟齬を作らない）
    expect(style.lineHeight).toBe(19); // クランプ基準も同じ 13
  });

  test("カスタム theme の宣言比率（1.61）が消費者上書きのクランプにも効く", async () => {
    // LINE Seed JP 同梱の消費者を模す。下限 ceil(13 × 1.61) = 21
    const lineSeed = defineTheme({
      ...nativeTheme,
      id: "lineseed-test",
      typography: { ...nativeTheme.typography, minLineHeightRatio: 1.61 },
    });
    const { toJSON } = await render(
      <ThemeProvider theme={lineSeed} forcedMode="light">
        <Text variant="xs" style={{ lineHeight: 19 }}>
          ギュネイ
        </Text>
      </ThemeProvider>,
    );
    const style = flatStyle(toJSON() as unknown as Node);
    expect(style.lineHeight).toBe(21); // 既定 1.45 なら 19 のままのはずが、宣言 1.61 で 21 へ
  });
});
