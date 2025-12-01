module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add react-native-reanimated plugin if you use it
      // 'react-native-reanimated/plugin',
    ],
  };
};

