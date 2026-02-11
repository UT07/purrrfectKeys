const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for JSON files in exercises
config.resolver.assetExts.push('json');

module.exports = config;
