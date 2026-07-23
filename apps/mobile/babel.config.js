module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 moved its worklet transform into react-native-worklets.
      // This plugin must be listed last.
      'react-native-worklets/plugin',
    ],
  };
};
