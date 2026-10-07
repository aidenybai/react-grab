import { LIST_ITEM_KEY_MAX_LENGTH_CHARS } from "../constants.js";
import { truncateString } from "./truncate-string.js";

export const formatListItemKey = (listItemKey: string): string =>
  JSON.stringify(truncateString(listItemKey, LIST_ITEM_KEY_MAX_LENGTH_CHARS));
