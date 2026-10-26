module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Drizzle migrations are .sql files bundled into the app as strings.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
