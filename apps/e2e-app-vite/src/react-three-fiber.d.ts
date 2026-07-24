import type { ThreeElements } from "@react-three/fiber";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      mesh: ThreeElements["mesh"];
    }
  }
}
