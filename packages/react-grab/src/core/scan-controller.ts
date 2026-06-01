import { createSignal, onCleanup, type Accessor } from "solid-js";
import { FEEDBACK_DURATION_MS } from "../constants.js";
import { copyContent } from "../utils/copy-content.js";
import { serializeScanTrace } from "../utils/serialize-scan-trace.js";
import { loadScanActive, saveScanActive } from "../utils/scan-active-storage.js";
import {
  createScanner,
  isScanAvailable,
  onScanAvailable,
  type ScannerController,
} from "./scanner.js";

interface ScanControllerOptions {
  // Whether there is a toolbar to stop the scan from; a persisted scan only
  // resumes when true, so it can never run with no way to turn it off.
  isToolbarEnabled: () => boolean;
}

export interface ScanController {
  scanner: ScannerController;
  // Whether a React renderer is instrumented; the scan button hides when false.
  isScanAvailable: Accessor<boolean>;
  isScanning: Accessor<boolean>;
  // A fresh token per successful copy (null when no toast). The toolbar keys
  // its toast on this so each copy replays the fade, even back-to-back.
  scanCopiedToken: Accessor<number | null>;
  toggle: () => void;
  stop: () => void;
}

// Owns the full scan lifecycle: the canvas scanner, the reactive scanning
// state, clipboard copy of the trace on stop, the transient "copied" toast,
// and persistence across reloads. Must run inside a reactive owner.
export const createScanController = (options: ScanControllerOptions): ScanController => {
  const scanner = createScanner();
  const [scanAvailable, setScanAvailable] = createSignal(isScanAvailable());
  onCleanup(onScanAvailable(() => setScanAvailable(true)));
  const [isScanning, setIsScanning] = createSignal(false);
  const [scanCopiedToken, setScanCopiedToken] = createSignal<number | null>(null);
  let scanCopiedCount = 0;
  let scanCopiedTimeout: ReturnType<typeof setTimeout> | undefined;

  const flashCopied = () => {
    scanCopiedCount += 1;
    setScanCopiedToken(scanCopiedCount);
    clearTimeout(scanCopiedTimeout);
    scanCopiedTimeout = setTimeout(() => setScanCopiedToken(null), FEEDBACK_DURATION_MS);
  };

  // Stops the scanner and syncs the in-memory flag, but never writes persisted
  // intent. sessionStorage is written only by an explicit user toggle, so a
  // scan survives teardown/reload and resumes on the next init - and teardown
  // ordering can't leave the persisted state inconsistent.
  const stop = () => {
    if (!scanner.isScanning()) return;
    scanner.stop();
    setIsScanning(false);
  };

  const toggle = () => {
    if (scanner.isScanning()) {
      scanner.stop();
      setIsScanning(false);
      saveScanActive(false);
      const trace = scanner.takeTrace();
      if (trace && copyContent(serializeScanTrace(trace), { componentName: "ReactGrabScan" })) {
        flashCopied();
      }
      return;
    }
    scanner.start();
    setIsScanning(true);
    saveScanActive(true);
  };

  // Resume a persisted scan across reloads/HMR. Deferred to DOMContentLoaded so
  // the scanner's canvas has a document.body to attach to.
  const restore = () => {
    if (!loadScanActive() || scanner.isScanning() || !options.isToolbarEnabled()) return;
    scanner.start();
    setIsScanning(true);
  };
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", restore, { once: true });
      onCleanup(() => document.removeEventListener("DOMContentLoaded", restore));
    } else {
      restore();
    }
  }

  onCleanup(() => {
    clearTimeout(scanCopiedTimeout);
    stop();
  });

  return { scanner, isScanAvailable: scanAvailable, isScanning, scanCopiedToken, toggle, stop };
};
