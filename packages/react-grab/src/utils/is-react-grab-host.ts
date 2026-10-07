const REACT_GRAB_HOST_ATTRIBUTES = ["data-react-grab", "data-react-grab-demo"];

// Checks both the library and demo host attributes (not just this build's
// REACT_GRAB_ATTRIBUTE_NAME): when a real instance and the demo build coexist
// on one page (each with its own host), neither may treat the other's overlay
// as grabbable page content.
export const isReactGrabHost = (element: Element): boolean =>
  REACT_GRAB_HOST_ATTRIBUTES.some((attributeName) => element.hasAttribute(attributeName));
