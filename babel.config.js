const path = require('path');

const APP_SOURCE = path.join(__dirname, 'src');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo']],
    overrides: [
      {
        test: (filename) => typeof filename === 'string' && filename.startsWith(APP_SOURCE),
        plugins: [
          ['@babel/plugin-proposal-decorators', { version: 'legacy' }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
          ['@babel/plugin-transform-private-methods', { loose: true }],
          ['@babel/plugin-transform-private-property-in-object', { loose: true }],
        ],
      },
    ],
  };
};
