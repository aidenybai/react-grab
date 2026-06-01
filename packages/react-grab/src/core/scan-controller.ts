import { createSignal, onCleanup, type Accessor } from "solid-js";
import { FEEDBACK_DURATION_MS } from "../constants.js";
import { copyContent } from "../utils/copy-content.js";
import { serializeScanTrace } from "../utils/serialize-scan-trace.js";
import { createScanner, isScanAvailable, onScanAvailable } from "./scanner.js";

export interface ScanController {
  // Whether a React renderer is instrumented; the scan button hides when false.
  isScanAvailable: Accessor<boolean>;
  isScanning: Accessor<boolean>;
  // A fresh token per successful copy (null when no toast). The toolbar keys
  // its toast on this so each copy replays the fade, even back-to-back.
  scanCopiedToken: Accessor<number | null>;
  toggle: () => void;
  stop: () => void;
}

// Owns the scan lifecycle: the canvas scanner, the reactive scanning state,
// clipboard copy of the trace on stop, and the transient "copied" toast.
// Must run inside a reactive owner.
export const createScanController = (): ScanController => {
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

  const stop = () => {
    if (!scanner.isScanning()) return;
    scanner.stop();
    setIsScanning(false);
  };

  const toggle = () => {
    if (scanner.isScanning()) {
      stop();
      const trace = scanner.takeTrace();
      if (trace && copyContent(serializeScanTrace(trace), { componentName: "ReactGrabScan" })) {
        flashCopied();
      }
      return;
    }
    scanner.start();
    setIsScanning(true);
  };

  onCleanup(() => {
    clearTimeout(scanCopiedTimeout);
    stop();
  });

  return { isScanAvailable: scanAvailable, isScanning, scanCopiedToken, toggle, stop };
};
