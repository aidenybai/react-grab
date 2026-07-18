import { createNativeTargetRegistry, ReactGrabNative, ReactGrabTarget } from "@react-grab/native";
import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { COUNTER_TARGET_HEIGHT_PX, FULL_FLEX } from "./constants";

const COUNTER_TARGET_DESCRIPTION = {
  name: "CounterFixture",
  role: null,
  label: "Counter fixture",
  testId: "counter-fixture-target",
};

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

const App = () => {
  const targetRegistry = useMemo(createNativeTargetRegistry, []);

  return (
    <SafeAreaView style={styles.root}>
      <Text testID="native-harness-title">React Grab Native Harness</Text>
      <Text testID="native-runtime">react-native</Text>
      <ReactGrabTarget
        description={COUNTER_TARGET_DESCRIPTION}
        registry={targetRegistry}
        targetId="counter-fixture-target"
        viewProps={{ style: styles.counterTarget, testID: "counter-fixture-target" }}
      >
        <CounterFixture />
      </ReactGrabTarget>
      <ReactGrabNative registry={targetRegistry} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  counterTarget: {
    height: COUNTER_TARGET_HEIGHT_PX,
  },
  root: {
    flex: FULL_FLEX,
  },
});

export default App;
