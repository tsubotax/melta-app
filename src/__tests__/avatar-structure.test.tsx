/**
 * avatar-structure — Avatar の「構造」テスト（Codex レビュー反映）。
 *
 * styleRefs conformance（値の照合）が拾えない配置の不変条件を RN render tree で検査する:
 *   1. statusDot は clip（overflow hidden の円）の**外側**にある — 内側だと円でクリップされて
 *      右下の dot がほぼ見えなくなる（P3 実装時に踏んだ罠の回帰ガード）
 *   2. Avatar.Group は 2 枚目以降にだけ overlap（負 margin）を適用する
 */

import { describe, test, expect } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { ThemeProvider, Avatar } from "../index.js";
import { AVATAR_GROUP_OVERLAP } from "../components/avatar.styles.js";

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

function children(node: Node): Node[] {
  return (node.children ?? []).filter((c): c is Node => typeof c !== "string");
}

/** 深さ優先で条件に合う node を全部集める。 */
function collect(node: Node, pred: (n: Node) => boolean, acc: Node[] = []): Node[] {
  if (pred(node)) acc.push(node);
  for (const c of children(node)) collect(c, pred, acc);
  return acc;
}

describe("Avatar 構造", () => {
  test("statusDot は overflow:hidden の clip の外（sibling）にある", async () => {
    const { toJSON } = await render(
      <ThemeProvider forcedMode="light">
        <Avatar name="tanaka_pm" source={{ uri: "https://example.com/a.png" }} status="online" />
      </ThemeProvider>,
    );
    const root = toJSON() as Node;

    const clips = collect(root, (n) => flatStyle(n).overflow === "hidden");
    expect(clips).toHaveLength(1);
    // clip の内側に絶対配置 node（= dot）がいない
    const dotsInsideClip = collect(clips[0], (n) => flatStyle(n).position === "absolute");
    expect(dotsInsideClip).toHaveLength(0);
    // tree 全体では dot が1個いる（= clip の外側に出ている）
    const dots = collect(root, (n) => flatStyle(n).position === "absolute");
    expect(dots).toHaveLength(1);
  });

  test("Avatar.Group は 2 枚目以降にだけ overlap（負 margin）を適用する", async () => {
    const { toJSON } = await render(
      <ThemeProvider forcedMode="light">
        <Avatar.Group>
          <Avatar name="A" size="small" />
          <Avatar name="B" size="small" />
          <Avatar name="C" size="small" />
        </Avatar.Group>
      </ThemeProvider>,
    );
    const root = toJSON() as Node;
    expect(flatStyle(root).flexDirection).toBe("row");

    const wrappers = children(root);
    expect(wrappers).toHaveLength(3);
    expect(flatStyle(wrappers[0]).marginLeft).toBeUndefined();
    expect(flatStyle(wrappers[1]).marginLeft).toBe(AVATAR_GROUP_OVERLAP);
    expect(flatStyle(wrappers[2]).marginLeft).toBe(AVATAR_GROUP_OVERLAP);
  });
});
