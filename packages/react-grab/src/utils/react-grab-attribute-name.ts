import { IS_DEMO } from "./runtime-mode.js";

// Identifies the shadow host and overlay elements. The demo build uses a
// distinct attribute so it can never reuse (or be reused by) a real React Grab
// instance's shadow host on the same page — e.g. the browser extension on
// react-grab.com — which would merge two render trees into one root and
// cross-apply overlay styles (the demo's click-through CSS on the real
// toolbar, or vice versa). Folds to the plain "data-react-grab" in library
// builds, so their behavior is unchanged.
export const REACT_GRAB_ATTRIBUTE_NAME = IS_DEMO ? "data-react-grab-demo" : "data-react-grab";
