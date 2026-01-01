const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude CSS files from being processed
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'css');

module.exports = config;
