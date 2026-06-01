import { createSignal, onCleanup, type Accessor } from "solid-js";
import { FEEDBACK_DURATION_MS } from "../constants.js";
import { copyContent } from "../utils/copy-content.js";
import { serializeScanTrace } from "../utils/serialize-scan-trace.js";
import { loadScanActive, saveScanActive } from "../utils/scan-active-storage.js";
import { createScanner, type ScannerController } from "./scanner.js";

export interface ScanController {
  scanner: ScannerController;
  isScanning: Accessor<boolean>;
  scanCopied: Accessor<boolean>;
  toggle: () => void;
}

// Owns the full scan lifecycle: the canvas scanner, the reactive scanning
// state, clipboard copy of the trace on stop, the transient "copied" toast,
// and persistence across reloads. Must run inside a reactive owner.
export const createScanController = (): ScanController => {
  const scanner = createScanner();
  const [isScanning, setIsScanning] = createSignal(false);
  const [scanCopied, setScanCopied] = createSignal(false);
  let scanCopiedTimeout: ReturnType<typeof setTimeout> | undefined;

  const flashCopied = () => {
    setScanCopied(true);
    clearTimeout(scanCopiedTimeout);
    scanCopiedTimeout = setTimeout(() => setScanCopied(false), FEEDBACK_DURATION_MS);
  };

  const toggle = () => {
    const wasScanning = scanner.isScanning();
    scanner.toggle();
    const nowScanning = scanner.isScanning();
    setIsScanning(nowScanning);
    saveScanActive(nowScanning);
    if (!wasScanning || nowScanning) return;
    const trace = scanner.takeTrace();
    if (!trace) return;
    if (copyContent(serializeScanTrace(trace), { componentName: "ReactGrabScan" })) {
      flashCopied();
    }
  };

  // Persisting across reloads keeps the scan running through dev-server HMR
  // restarts. Defer to DOMContentLoaded so the scanner's canvas has a
  // document.body to attach to.
  const restore = () => {
    if (!loadScanActive() || scanner.isScanning()) return;
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
    scanner.dispose();
  });

  return { scanner, isScanning, scanCopied, toggle };
};
