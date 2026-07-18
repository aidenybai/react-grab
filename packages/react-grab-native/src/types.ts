import type { ReactNode } from "react";
import type { ViewProps } from "react-native";
import type {
  HostBounds,
  HostTarget,
  HostTargetAdapter,
  HostTargetDescription,
} from "react-grab/targets";

export interface NativeHostHandle {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
}

export interface NativeTargetRegistration {
  id: string;
  handle: NativeHostHandle;
  description: HostTargetDescription;
  parentId?: string;
  priority?: number;
}

export interface NativeTargetEntry extends NativeTargetRegistration {
  registrationOrder: number;
}

export interface MeasuredNativeTarget {
  target: HostTarget;
  bounds: HostBounds;
  priority: number;
  registrationOrder: number;
}

export interface NativeTargetRegistry {
  readonly adapter: HostTargetAdapter;
  register: (registration: NativeTargetRegistration) => () => void;
  getTarget: (targetId: string) => HostTarget | null;
}

export interface ReactGrabTargetProps {
  children?: ReactNode;
  description: HostTargetDescription;
  registry: NativeTargetRegistry;
  targetId: string;
  parentId?: string;
  priority?: number;
  viewProps?: ViewProps;
}

export interface ReactGrabNativeProps {
  registry: NativeTargetRegistry;
  activationLabel?: string;
  deactivationLabel?: string;
}
