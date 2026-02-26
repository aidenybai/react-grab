declare module "*.svg" {
  import type { StaticImageData } from "next/image";

  const content: StaticImageData;
  export default content;
}

declare module "@react-grab/design-system" {
  export const renderDesignSystemPreview: (
    containerElement: HTMLElement,
  ) => () => void;
}

declare module "react-grab" {
  interface ReactGrabPlugin {
    name: string;
    hooks?: Record<string, (...args: unknown[]) => void>;
  }

  interface ReactGrabApi {
    toggle: () => void;
    deactivate: () => void;
    dispose: () => void;
    registerPlugin: (plugin: ReactGrabPlugin) => void;
  }

  export const init: (options?: Record<string, unknown>) => ReactGrabApi;
  export const getGlobalApi: () => ReactGrabApi | undefined;
  export const setGlobalApi: (api: ReactGrabApi) => void;
}

declare module "react-grab/core" {
  interface ReactGrabCorePlugin {
    name: string;
    hooks?: Record<string, (...args: unknown[]) => void>;
  }

  interface ReactGrabCoreApi {
    registerPlugin: (plugin: ReactGrabCorePlugin) => void;
  }

  export const init: (options?: Record<string, unknown>) => ReactGrabCoreApi;
}
