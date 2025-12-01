module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'nativewind/babel',
      {
        exclude: /src\/theme\//,
      },
    ],
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@components': './src/components',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
          '@services': './src/services',
          '@utils': './src/utils',
          '@hooks': './src/hooks',
          '@constants': './src/constants',
          '@assets': './src/assets',
          '@types': './src/types',
          '@store': './src/store',
          '@stores': './src/stores',
          '@theme': './src/theme',
        },
      },
    ],
  ],
};
