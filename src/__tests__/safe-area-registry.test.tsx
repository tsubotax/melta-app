/**
 * safe-area-registry — edges ファクトリの契約を検証する。
 *
 * 主眼は **memo（参照安定）**。resolveSafeAreaView() は render 中に呼ばれるので、同じ edges
 * 集合に毎回別のコンポーネント型を返すと React が subtree を unmount/remount する
 * （state・入力中テキストが消える）。ここが壊れても画面は「動いてはいる」ので、
 * 機械で固定しないと気づけない。
 */

import { describe, expect, jest, test } from "@jest/globals";
import type { SafeAreaEdge, SafeAreaViewLike } from "../components/safe-area-registry.js";

type Registry = typeof import("../components/safe-area-registry.js");

/**
 * グローバル 1 個の registry を各テストで独立させる（登録は解除できないため module ごと作り直す）。
 * 動的 import ではなく require なのは、jest が ESM VM modules 無効で動いているため
 * （`import()` は "dynamic import callback was invoked without --experimental-vm-modules" になる）。
 */
function freshRegistry(): Registry {
  jest.resetModules();
  return require("../components/safe-area-registry.js") as Registry;
}

/** 呼ばれた edges を記録するファクトリ（毎回別コンポーネントを返す = memo が無いと参照が変わる）。 */
function trackingFactory() {
  const calls: SafeAreaEdge[][] = [];
  const factory = (edges: readonly SafeAreaEdge[]): SafeAreaViewLike => {
    calls.push([...edges]);
    const Component: SafeAreaViewLike = () => null;
    return Component;
  };
  return { factory, calls };
}

describe("resolveSafeAreaView", () => {
  test("同じ edges 集合には同じ参照を返す（順序・重複は正規化）", () => {
    const registry = freshRegistry();
    const { factory, calls } = trackingFactory();
    registry.setSafeAreaView(factory);

    const first = registry.resolveSafeAreaView(["bottom", "left", "right"]);
    const reordered = registry.resolveSafeAreaView(["right", "bottom", "left", "bottom"]);

    expect(reordered).toBe(first);
    // ファクトリ呼び出しは 1 回だけ（2 回目は memo ヒット）。渡る edges は正規化済み
    expect(calls).toEqual([["right", "bottom", "left"]]);
  });

  test("edges が違えば別の実装を返す", () => {
    const registry = freshRegistry();
    const { factory } = trackingFactory();
    registry.setSafeAreaView(factory);

    expect(registry.resolveSafeAreaView(["top"])).not.toBe(
      registry.resolveSafeAreaView(["bottom"]),
    );
  });

  test("edges 省略時は登録時の既定 edges を使う（Screen の既定）", () => {
    const registry = freshRegistry();
    const { factory, calls } = trackingFactory();
    registry.setSafeAreaView(factory, ["top"]);

    const byDefault = registry.resolveSafeAreaView();
    const explicit = registry.resolveSafeAreaView(["top"]);

    expect(explicit).toBe(byDefault);
    expect(calls).toEqual([["top"]]);
  });

  test("再登録（setSafeAreaView）で memo が無効化される", () => {
    const registry = freshRegistry();
    const before = trackingFactory();
    registry.setSafeAreaView(before.factory);
    const old = registry.resolveSafeAreaView(["bottom"]);

    const after = trackingFactory();
    registry.setSafeAreaView(after.factory);
    const fresh = registry.resolveSafeAreaView(["bottom"]);

    expect(fresh).not.toBe(old);
    expect(after.calls).toEqual([["bottom"]]);
  });

  test("未登録なら edges に関わらず RN core SafeAreaView（フォールバックは辺を選べない）", () => {
    const registry = freshRegistry();
    const { SafeAreaView } = require("react-native") as typeof import("react-native");

    expect(registry.resolveSafeAreaView(["bottom"])).toBe(SafeAreaView);
    expect(registry.resolveSafeAreaView()).toBe(SafeAreaView);
  });
});
