import { arch, cpus, platform, release, totalmem } from "node:os";
import type { Page } from "@playwright/test";
import { roundTo3 } from "./perf-statistics.js";

declare global {
  interface Navigator {
    readonly deviceMemory?: number;
  }
}

export interface PerfGpuDevice {
  vendorId: number;
  deviceId: number;
  vendorString: string;
  deviceString: string;
  driverVendor: string;
  driverVersion: string;
}

export interface PerfBrowserGpuInfo {
  available: boolean;
  devices: PerfGpuDevice[];
  featureStatus: Record<string, string>;
  driverBugWorkarounds: string[];
  commandLine: string;
  error?: string;
}

export interface PerfPageEnvironment {
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  deviceMemoryGb?: number;
  visibilityState: DocumentVisibilityState;
  hasFocus: boolean;
  refreshIntervalMs: number;
  refreshRateHz: number;
}

export interface PerfOperatingSystemEnvironment {
  platform: string;
  release: string;
  architecture: string;
}

export interface PerfHostEnvironment {
  cpuModel: string;
  logicalCpuCount: number;
  totalMemoryMb: number;
}

export interface PerfNodeEnvironment {
  version: string;
  pid: number;
}

export interface PerfBrowserEnvironment {
  product: string;
  revision: string;
  protocolVersion: string;
  jsVersion: string;
  userAgent?: string;
}

export interface PerfEnvironment {
  capturedAt: string;
  operatingSystem: PerfOperatingSystemEnvironment;
  host: PerfHostEnvironment;
  node: PerfNodeEnvironment;
  browser: PerfBrowserEnvironment;
  page: PerfPageEnvironment;
  gpu: PerfBrowserGpuInfo;
}

interface BrowserVersionResponse {
  product: string;
  revision: string;
  protocolVersion: string;
  jsVersion: string;
  userAgent?: string;
}

interface SystemInfoGpuResponse {
  gpu: {
    devices?: PerfGpuDevice[];
    featureStatus?: Record<string, string>;
    driverBugWorkarounds?: string[];
  };
  commandLine?: string;
}

const refreshIntervalCalibrationByPage = new WeakMap<Page, Promise<number>>();

const measureRefreshInterval = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      new Promise<number>((resolveRefreshInterval) => {
        const frameTimestamps: number[] = [];
        const collectFrame = (timestamp: number): void => {
          frameTimestamps.push(timestamp);
          if (frameTimestamps.length < 13) {
            requestAnimationFrame(collectFrame);
            return;
          }
          const frameDeltas: number[] = [];
          for (let index = 1; index < frameTimestamps.length; index++) {
            frameDeltas.push(frameTimestamps[index] - frameTimestamps[index - 1]);
          }
          frameDeltas.sort((leftValue, rightValue) => leftValue - rightValue);
          const refreshIntervalMs = frameDeltas[Math.floor(frameDeltas.length / 2)] ?? 16.667;
          resolveRefreshInterval(Number(refreshIntervalMs.toFixed(3)));
        };
        requestAnimationFrame(collectFrame);
      }),
  );

export const calibratePerfRefreshInterval = (page: Page): Promise<number> => {
  const existingCalibration = refreshIntervalCalibrationByPage.get(page);
  if (existingCalibration) return existingCalibration;
  const calibration = measureRefreshInterval(page);
  refreshIntervalCalibrationByPage.set(page, calibration);
  return calibration;
};

const capturePageEnvironment = async (page: Page): Promise<PerfPageEnvironment> => {
  const refreshIntervalMs = await calibratePerfRefreshInterval(page);
  return page.evaluate(
    (calibratedRefreshIntervalMs) => ({
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGb: navigator.deviceMemory,
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
      refreshIntervalMs: calibratedRefreshIntervalMs,
      refreshRateHz: Number((1000 / calibratedRefreshIntervalMs).toFixed(3)),
    }),
    refreshIntervalMs,
  );
};

export const capturePerfEnvironment = async (page: Page): Promise<PerfEnvironment> => {
  const pageEnvironment = await capturePageEnvironment(page);
  const browser = page.context().browser();
  let browserVersion: BrowserVersionResponse = {
    product: browser?.browserType().name() ?? "unknown",
    revision: "unknown",
    protocolVersion: "unknown",
    jsVersion: "unknown",
  };
  let gpuInfo: PerfBrowserGpuInfo = {
    available: false,
    devices: [],
    featureStatus: {},
    driverBugWorkarounds: [],
    commandLine: "",
    error: "Browser-level CDP session unavailable",
  };

  if (browser) {
    try {
      const browserSession = await browser.newBrowserCDPSession();
      try {
        browserVersion = await browserSession.send("Browser.getVersion");
        const systemInfo: SystemInfoGpuResponse = await browserSession.send("SystemInfo.getInfo");
        gpuInfo = {
          available: true,
          devices: systemInfo.gpu.devices ?? [],
          featureStatus: systemInfo.gpu.featureStatus ?? {},
          driverBugWorkarounds: systemInfo.gpu.driverBugWorkarounds ?? [],
          commandLine: systemInfo.commandLine ?? "",
        };
      } finally {
        await browserSession.detach();
      }
    } catch (captureError) {
      gpuInfo.error = captureError instanceof Error ? captureError.message : String(captureError);
    }
  }

  const logicalCpus = cpus();
  return {
    capturedAt: new Date().toISOString(),
    operatingSystem: {
      platform: platform(),
      release: release(),
      architecture: arch(),
    },
    host: {
      cpuModel: logicalCpus[0]?.model ?? "unknown",
      logicalCpuCount: logicalCpus.length,
      totalMemoryMb: Math.round(totalmem() / 1024 / 1024),
    },
    node: {
      version: process.version,
      pid: process.pid,
    },
    browser: browserVersion,
    page: {
      ...pageEnvironment,
      refreshIntervalMs: roundTo3(pageEnvironment.refreshIntervalMs),
      refreshRateHz: roundTo3(pageEnvironment.refreshRateHz),
    },
    gpu: gpuInfo,
  };
};
