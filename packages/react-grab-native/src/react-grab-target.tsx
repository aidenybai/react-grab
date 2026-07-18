import { useCallback, useRef } from "react";
import { View } from "react-native";
import type { NativeHostHandle, ReactGrabTargetProps } from "./types";

const EMPTY_CLEANUP = () => undefined;

export const ReactGrabTarget = (props: ReactGrabTargetProps) => {
  const cleanupRegistration = useRef<() => void>(EMPTY_CLEANUP);

  const setHostHandle = useCallback(
    (handle: NativeHostHandle | null) => {
      cleanupRegistration.current();
      cleanupRegistration.current = handle
        ? props.registry.register({
            id: props.targetId,
            handle,
            description: props.description,
            parentId: props.parentId,
            priority: props.priority,
          })
        : EMPTY_CLEANUP;
    },
    [props.description, props.parentId, props.priority, props.registry, props.targetId],
  );

  return (
    <View {...props.viewProps} collapsable={false} ref={setHostHandle}>
      {props.children}
    </View>
  );
};
