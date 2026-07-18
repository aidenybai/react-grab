import { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";

const CounterFixture = () => {
  const [count, setCount] = useState(0);

  return (
    <View testID="counter-fixture">
      <Text testID="counter-value">{count}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setCount((previousCount) => previousCount + 1)}
        testID="increment-counter"
      >
        <Text>Increment</Text>
      </Pressable>
    </View>
  );
};

const App = () => (
  <SafeAreaView>
    <Text testID="native-harness-title">React Grab Native Harness</Text>
    <Text testID="native-runtime">react-native</Text>
    <CounterFixture />
  </SafeAreaView>
);

export default App;
