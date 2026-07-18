import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { HostBounds, HostPoint, HostTargetDescription } from "react-grab/targets";
import {
  NATIVE_CONTROL_BACKGROUND_COLOR,
  NATIVE_CONTROL_BORDER_RADIUS_PX,
  NATIVE_CONTROL_OFFSET_PX,
  NATIVE_CONTROL_PADDING_HORIZONTAL_PX,
  NATIVE_CONTROL_PADDING_VERTICAL_PX,
  NATIVE_CONTROL_TEXT_COLOR,
  NATIVE_CONTROL_Z_INDEX,
  NATIVE_HIGHLIGHT_BACKGROUND_COLOR,
  NATIVE_HIGHLIGHT_BORDER_COLOR,
  NATIVE_HIGHLIGHT_BORDER_WIDTH_PX,
  NATIVE_OVERLAY_Z_INDEX,
  NATIVE_SELECTION_LABEL_BACKGROUND_COLOR,
  NATIVE_SELECTION_LABEL_BORDER_RADIUS_PX,
  NATIVE_SELECTION_LABEL_OFFSET_PX,
  NATIVE_SELECTION_LABEL_PADDING_PX,
} from "./constants";
import type { ReactGrabNativeProps } from "./types";

export const ReactGrabNative = (props: ReactGrabNativeProps) => {
  const [isActive, setIsActive] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<HostBounds | null>(null);
  const [selectionDescription, setSelectionDescription] = useState<HostTargetDescription | null>(
    null,
  );

  const deactivate = () => {
    setIsActive(false);
    setSelectionBounds(null);
    setSelectionDescription(null);
  };

  const selectAtPoint = async (point: HostPoint) => {
    const target = await props.registry.adapter.getTargetAtPoint(point);
    if (!target) {
      setSelectionBounds(null);
      setSelectionDescription(null);
      return;
    }
    const [bounds, description] = await Promise.all([
      target.capabilities.measure(),
      target.capabilities.describe(),
    ]);
    setSelectionBounds(bounds);
    setSelectionDescription(description);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsActive(true)}
        style={styles.control}
        testID="react-grab-native-toggle"
      >
        <Text style={styles.controlText}>{props.activationLabel ?? "Grab"}</Text>
      </Pressable>
      <Modal animationType="none" onRequestClose={deactivate} transparent visible={isActive}>
        <Pressable
          onPress={(event) => {
            void selectAtPoint({
              x: event.nativeEvent.pageX,
              y: event.nativeEvent.pageY,
            });
          }}
          style={styles.selectionLayer}
          testID="react-grab-native-selection-layer"
        >
          {selectionBounds ? (
            <View
              pointerEvents="none"
              style={[
                styles.highlight,
                {
                  height: selectionBounds.height,
                  left: selectionBounds.x,
                  top: selectionBounds.y,
                  width: selectionBounds.width,
                },
              ]}
              testID="react-grab-native-highlight"
            />
          ) : null}
          {selectionDescription ? (
            <View pointerEvents="none" style={styles.selectionLabel}>
              <Text style={styles.controlText} testID="react-grab-native-selection">
                {selectionDescription.testId ?? selectionDescription.name}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={deactivate}
          style={styles.control}
          testID="react-grab-native-close"
        >
          <Text style={styles.controlText}>{props.deactivationLabel ?? "Done"}</Text>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  control: {
    position: "absolute",
    right: NATIVE_CONTROL_OFFSET_PX,
    top: NATIVE_CONTROL_OFFSET_PX,
    zIndex: NATIVE_CONTROL_Z_INDEX,
    backgroundColor: NATIVE_CONTROL_BACKGROUND_COLOR,
    borderRadius: NATIVE_CONTROL_BORDER_RADIUS_PX,
    paddingHorizontal: NATIVE_CONTROL_PADDING_HORIZONTAL_PX,
    paddingVertical: NATIVE_CONTROL_PADDING_VERTICAL_PX,
  },
  controlText: {
    color: NATIVE_CONTROL_TEXT_COLOR,
  },
  highlight: {
    position: "absolute",
    backgroundColor: NATIVE_HIGHLIGHT_BACKGROUND_COLOR,
    borderColor: NATIVE_HIGHLIGHT_BORDER_COLOR,
    borderWidth: NATIVE_HIGHLIGHT_BORDER_WIDTH_PX,
  },
  selectionLabel: {
    position: "absolute",
    bottom: NATIVE_SELECTION_LABEL_OFFSET_PX,
    left: NATIVE_SELECTION_LABEL_OFFSET_PX,
    backgroundColor: NATIVE_SELECTION_LABEL_BACKGROUND_COLOR,
    borderRadius: NATIVE_SELECTION_LABEL_BORDER_RADIUS_PX,
    padding: NATIVE_SELECTION_LABEL_PADDING_PX,
  },
  selectionLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: NATIVE_OVERLAY_Z_INDEX,
  },
});
