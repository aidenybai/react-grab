import { IME_COMPOSING_KEY_CODE } from "../constants.js";

export const isKeyboardEventComposing = (event: KeyboardEvent): boolean =>
  event.isComposing || event.keyCode === IME_COMPOSING_KEY_CODE;
