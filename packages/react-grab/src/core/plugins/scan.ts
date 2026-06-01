import type { Plugin } from "../../types.js";
import type { ScannerController } from "../scanner.js";
import { SCAN_ACTION_ID } from "../../constants.js";

export const createScanPlugin = (scanner: ScannerController): Plugin => ({
  name: SCAN_ACTION_ID,
  setup: () => ({
    cleanup: () => scanner.stop(),
  }),
});
