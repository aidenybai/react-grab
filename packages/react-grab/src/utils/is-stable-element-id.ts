import { SELECTOR_ATTR_VALUE_MAX_LENGTH_CHARS } from "../constants.js";

const UUID_ELEMENT_ID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const REACT_COLON_ELEMENT_ID_PATTERN = /:r[a-z0-9]+:/i;
const REACT_UNDERSCORE_ELEMENT_ID_PATTERN = /_r_[a-z0-9]+_(?:$|-)/i;
const REACT_GUILLEMET_ELEMENT_ID_PATTERN = /«r[a-z0-9]+»/i;
const GENERATED_FRAMEWORK_ELEMENT_ID_PATTERN =
  /^(?:downshift-\d+(?:-|$)|headlessui-[a-z-]+-\d+(?:-|$)|mui-\d+(?:-|$)|radix-\d+(?:-|$)|react-aria-\d+(?:-|$)|react-select-\d+(?:-|$))/i;
const EMBER_ELEMENT_ID_PATTERN = /^ember\d+$/i;
const NUMERIC_ELEMENT_ID_PATTERN = /^\d+$/;

export const isStableElementId = (elementId: string): boolean =>
  elementId.length > 0 &&
  elementId.length <= SELECTOR_ATTR_VALUE_MAX_LENGTH_CHARS &&
  !REACT_COLON_ELEMENT_ID_PATTERN.test(elementId) &&
  !UUID_ELEMENT_ID_PATTERN.test(elementId) &&
  !REACT_UNDERSCORE_ELEMENT_ID_PATTERN.test(elementId) &&
  !REACT_GUILLEMET_ELEMENT_ID_PATTERN.test(elementId) &&
  !GENERATED_FRAMEWORK_ELEMENT_ID_PATTERN.test(elementId) &&
  !EMBER_ELEMENT_ID_PATTERN.test(elementId) &&
  !NUMERIC_ELEMENT_ID_PATTERN.test(elementId);
