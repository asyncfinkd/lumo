// Reanimated (and the worklets it runs on) in Jest: https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/
require('react-native-reanimated').setUpTests();
// Gesture Handler: https://docs.swmansion.com/react-native-gesture-handler/docs/guides/testing
require('react-native-gesture-handler/jestSetup');
// There's no native UI runtime in Jest; use Gesture Handler's own no-op from its web build.
jest.mock(
  'react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings',
  () =>
    require('react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings.web'),
);
