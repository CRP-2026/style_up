// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force CommonJS entry on web to avoid packages shipping `import.meta` in ESM builds.
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.unstable_enablePackageExports = false;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'zustand') {
    return resolve(context, path.join(__dirname, 'node_modules/zustand/index.js'), platform);
  }
  if (platform === 'web' && moduleName === 'zustand/middleware') {
    return resolve(context, path.join(__dirname, 'node_modules/zustand/middleware.js'), platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
