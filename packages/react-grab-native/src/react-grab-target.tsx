import { useCallback, useLayoutEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type {
  NativeHostHandle,
  NativeTargetMetadata,
  NativeTargetRegistrationHandle,
  ReactGrabTargetProps,
} from "./types";

export const ReactGrabTarget = (props: ReactGrabTargetProps) => {
  const priority = props.priority ?? StyleSheet.flatten(props.viewProps?.style)?.zIndex;
  const metadataRef = useRef<NativeTargetMetadata>({
    description: props.description,
    parentId: props.parentId,
    priority,
  });
  const registrationRef = useRef<NativeTargetRegistrationHandle | null>(null);
  metadataRef.current.description = props.description;
  metadataRef.current.parentId = props.parentId;
  metadataRef.current.priority = priority;

  useLayoutEffect(() => {
    registrationRef.current?.update(metadataRef.current);
  });

  const setHostHandle = useCallback(
    (handle: NativeHostHandle | null) => {
      registrationRef.current?.unregister();
      registrationRef.current = handle
        ? props.registry.register({
            id: props.targetId,
            handle,
            ...metadataRef.current,
          })
        : null;
    },
    [props.registry, props.targetId],
  );

  return (
    <View {...props.viewProps} collapsable={false} ref={setHostHandle}>
      {props.children}
    </View>
  );
};
