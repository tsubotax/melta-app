/**
 * textfield-structure — TextField の Android 縦センター補正の回帰ガード。
 *
 * styleRefs conformance（値の照合）の対象外である RN 実装補正
 * （INPUT_VERTICAL_FIX）が TextInput に必ず載っていることを render tree で検査する。
 * これが落ちると Android で固定 height + EditText 既定 padding により
 * 入力文字が上寄り・下端切れになる（Pixel 実機で発見・修正した実バグの回帰ガード）。
 */

import { describe, test, expect, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ThemeProvider, TextField } from "../index";
import { resolveInputVerticalFix } from "../components/TextField";

interface Node {
  type: string;
  props?: { style?: unknown };
  children?: (Node | string)[] | null;
}

function flatStyle(node: Node): Record<string, unknown> {
  const s = node.props?.style;
  const list = Array.isArray(s) ? s.flat(Infinity) : [s];
  return Object.assign({}, ...list.filter(Boolean));
}

function children(node: Node): Node[] {
  return (node.children ?? []).filter((c): c is Node => typeof c !== "string");
}

function collect(node: Node, pred: (n: Node) => boolean, acc: Node[] = []): Node[] {
  if (pred(node)) acc.push(node);
  for (const c of children(node)) collect(c, pred, acc);
  return acc;
}

describe("TextField 構造", () => {
  test("TextInput に縦センター補正（paddingVertical 0 + textAlignVertical center）が載る", async () => {
    const { toJSON } = await render(
      <ThemeProvider forcedMode="light">
        <TextField label="ルート名" value="道東 DAY1" onChangeText={() => {}} />
      </ThemeProvider>,
    );
    const root = toJSON() as Node;

    const inputs = collect(root, (n) => n.type === "TextInput");
    expect(inputs).toHaveLength(1);
    const style = flatStyle(inputs[0]);
    expect(style.paddingVertical).toBe(0);
    expect(style.textAlignVertical).toBe("center");
    // 固定 height（size spec）と共存していること（height が消えると補正の前提が変わる）
    expect(typeof style.height).toBe("number");
  });

  test("Android では CJK 光学ナッジ paddingBottom: 2 が入り、iOS では入らない", () => {
    // jest の Platform は ios 固定のため、OS 分岐は純関数を直接検証する（Codex レビュー反映）
    expect(resolveInputVerticalFix("android").paddingBottom).toBe(2);
    expect(resolveInputVerticalFix("ios").paddingBottom).toBeUndefined();
  });

  // ----- 透過 props（入力メソッド系のみ透過する規約。§3.4）-----

  test("onBlur が blur で呼ばれる（内部 focus 制御と合成される）", async () => {
    const onBlur = jest.fn();
    const { getByLabelText } = await render(
      <ThemeProvider forcedMode="light">
        <TextField label="通知先メールアドレス" value="" onChangeText={() => {}} onBlur={onBlur} />
      </ThemeProvider>,
    );
    const input = getByLabelText("通知先メールアドレス");
    await fireEvent(input, "focus");
    await fireEvent(input, "blur");
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  test("keyboardType が TextInput に渡る", async () => {
    const { getByLabelText } = await render(
      <ThemeProvider forcedMode="light">
        <TextField
          label="通知先メールアドレス"
          value=""
          onChangeText={() => {}}
          keyboardType="email-address"
        />
      </ThemeProvider>,
    );
    const input = getByLabelText("通知先メールアドレス");
    expect(input.props.keyboardType).toBe("email-address");
  });
});
