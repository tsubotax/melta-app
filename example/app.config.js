/**
 * baseUrl（/catalog サブパス配信）は showcase ビルド時だけ付与する。
 * app.json に焼くと expo start の Metro transform options / manifest にも乗るため
 * （Codex レビュー指摘）、SHOWCASE_BASE_URL 環境変数で opt-in にして
 * dev / native の経路には一切漏らさない。
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: process.env.SHOWCASE_BASE_URL
    ? { ...config.experiments, baseUrl: process.env.SHOWCASE_BASE_URL }
    : config.experiments,
});
