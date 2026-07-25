import type { ThreeElements } from "@react-three/fiber";

declare const THREE_ELEMENTS_TYPE_MARKER: unique symbol;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      readonly [THREE_ELEMENTS_TYPE_MARKER]?: never;
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      readonly [THREE_ELEMENTS_TYPE_MARKER]?: never;
    }
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      readonly [THREE_ELEMENTS_TYPE_MARKER]?: never;
    }
  }
}
