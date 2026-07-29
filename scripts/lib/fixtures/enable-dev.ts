/**
 * enable-dev — node（tsx --test）で `__DEV__` を立てるための副作用モジュール。
 *
 * `src/theme/define-theme.ts` の `isDev` は **モジュール評価時に1回だけ**決まる
 * （そうしないと Metro が prod ビルドで dev ブロックを畳めない）。したがって
 * `globalThis.__DEV__` は define-theme が評価される**前**に立てる必要がある。
 *
 * ESM の静的 import は宣言順に評価されるので、**このモジュールをテストの先頭で
 * import すること**（並べ替えると dev 限定パスのテストが静かに落ちる）。
 * RN / jest では `__DEV__` はランタイム側が最初から用意するのでこの小細工は要らない。
 */

(globalThis as { __DEV__?: boolean }).__DEV__ = true;
