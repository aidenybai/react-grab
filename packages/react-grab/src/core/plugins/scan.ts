import type { Plugin } from "../../types.js";
import { SCAN_ACTION_ID } from "../../constants.js";

// Takes the controller's synced stop (not the raw scanner) so teardown keeps
// isScanning in sync.
export const createScanPlugin = (stopScan: () => void): Plugin => ({
  name: SCAN_ACTION_ID,
  setup: () => ({
    cleanup: () => stopScan(),
  }),
});
