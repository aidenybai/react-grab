import type { Plugin } from "../../types.js";
import { SCAN_ACTION_ID } from "../../constants.js";

// Receives the scan controller's synced stop (not the raw scanner) so plugin
// teardown keeps the toolbar's isScanning state in sync.
export const createScanPlugin = (stopScan: () => void): Plugin => ({
  name: SCAN_ACTION_ID,
  setup: () => ({
    cleanup: () => stopScan(),
  }),
});
