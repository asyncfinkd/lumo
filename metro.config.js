// https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle migrations are .sql files bundled into the app.
config.resolver.sourceExts.push('sql');

module.exports = config;
