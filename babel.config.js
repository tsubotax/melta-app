/**
 * jest（mount smoke）用の babel 設定。
 * bob build は configFile:false で独自 preset を使うため、この設定はライブラリのビルドに影響しない。
 * example/ は Expo 側の babel 設定が別途効く。
 */
module.exports = {
  presets: ["module:@react-native/babel-preset"],
};
