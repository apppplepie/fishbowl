module.exports = {
  presets: [
    [
      'next/babel',
      {
        'preset-env': {
          targets: {
            browsers: ['>0.3%', 'not dead', 'not op_mini all', 'not IE 11'],
          },
          useBuiltIns: 'usage',
          corejs: 3,
        },
      },
    ],
  ],
};