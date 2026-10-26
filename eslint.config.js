// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  // Formatting is Prettier's job; turn off the rules that would fight it.
  prettierConfig,
  {
    ignores: ['dist/*', 'spikes/*', '.expo/*'],
  },
]);
