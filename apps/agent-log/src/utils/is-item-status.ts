import { ITEM_STATUSES } from "../constants.js";
import type { ItemStatus } from "../types.js";

export const isItemStatus = (value: unknown): value is ItemStatus =>
  ITEM_STATUSES.some((status) => status === value);
