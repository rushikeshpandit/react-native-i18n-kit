const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');

const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
});

// Resolve the library from `src/` (the "react-native-i18n-kit-source" export
// condition) instead of the prebuilt `lib/`, so the example always runs the
// current TypeScript sources.
config.resolver = {
  ...config.resolver,
  unstable_conditionNames: [
    'react-native-i18n-kit-source',
    ...(config.resolver?.unstable_conditionNames ?? ['require', 'import']),
  ],
};

module.exports = config;
