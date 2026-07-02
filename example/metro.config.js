/**
 * example の Metro 設定（root=ライブラリ + example が file:.. 消費する monorepo 構成）。
 *
 * react-native-monorepo-config（create-react-native-library と同源）相当を CJS で内製する
 * （本家は ESM のため Expo の config loader が読めない）。やっていること:
 * - watchFolders に root を追加（symlink 先を watch 対象にする Metro の原則）
 * - extraNodeModules["melta-app"] = root で symlink を経由せず実体パスに解決
 *   （example/node_modules/melta-app → .. の symlink 経由だと @expo/metro-file-map が
 *    root 越えパスの collapse に失敗して "Invariant Violation: Failed to collapse" になる）
 * - symlink 自体は blockList で塞ぎ、react / react-native は hoist 先（root/node_modules）に
 *   一本化（peerDeps の二重解決を防ぐ）
 */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const root = path.resolve(projectRoot, "..");

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), root];

config.resolver.blockList = [
  ...[config.resolver.blockList].flat().filter(Boolean),
  // npm workspaces は file:.. を root/node_modules/melta-app → ..（自己参照 symlink）として
  // hoist する。この symlink を metro が辿ると @expo/metro-file-map が未正規化パス
  // （"../node_modules/.." 等）を作って "Failed to collapse" でクラッシュするため、
  // symlink 経由の解決を全部塞ぎ、extraNodeModules の実体パスに一本化する
  new RegExp(`^${escapeRegExp(path.join(root, "node_modules", "melta-app"))}([/\\\\]|$)`),
  new RegExp(`^${escapeRegExp(path.join(root, "node_modules", "melta-app-example"))}([/\\\\]|$)`),
  new RegExp(`^${escapeRegExp(path.join(projectRoot, "node_modules", "melta-app"))}([/\\\\]|$)`),
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "melta-app": root,
  react: path.join(root, "node_modules", "react"),
  "react-native": path.join(root, "node_modules", "react-native"),
};

config.resolver.nodeModulesPaths = [
  path.join(projectRoot, "node_modules"),
  path.join(root, "node_modules"),
];

module.exports = config;
