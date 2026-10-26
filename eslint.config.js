// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  // Formatting is Prettier's job; turn off the rules that would fight it.
  prettierConfig,
  {
    ignores: ['dist/*', 'spikes/*', '.expo/*', 'src/db/migrations/*'],
  },
  {
    // All user-facing copy goes through i18n (#35): no raw text in JSX.
    files: ['src/**/*.tsx'],
    ignores: ['src/**/__tests__/**'],
    rules: {
      'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }],
    },
  },
]);
