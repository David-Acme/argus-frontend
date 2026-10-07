const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

const COMMONJS_ONLY = {
  punycode: require.resolve('punycode/punycode.js'),
};

config.resolver.resolverMainFields = ['react-native', 'browser', 'module', 'main'];
config.resolver.assetExts = [...config.resolver.assetExts, 'ogg'];

const resolveNext = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const pinned = COMMONJS_ONLY[moduleName.replace(/\/$/, '')];
  if (pinned) return { type: 'sourceFile', filePath: pinned };
  return (resolveNext ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './uniwind-types.d.ts',
});
