// Jest setup for @dealpilot/mobile.
//
// jest-expo already wires up the React Native + Expo environment. We add the
// gesture-handler jest setup (required whenever react-native-gesture-handler is
// in the tree, which it is via expo-router) and silence the reanimated logger.

import '@testing-library/react-native';

// react-native-gesture-handler ships a jest setup that mocks its native module.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('react-native-gesture-handler/jestSetup');

// In-memory AsyncStorage so persistence round-trips work under jest without a
// native module. The community package ships this official mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
