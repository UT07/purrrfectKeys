module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/stores': './src/stores',
            '@/core': './src/core',
            '@/audio': './src/audio',
            '@/input': './src/input',
            '@/services': './src/services',
            '@/utils': './src/utils',
            '@/content': './content',
          },
        },
      ],
    ],
  };
};
