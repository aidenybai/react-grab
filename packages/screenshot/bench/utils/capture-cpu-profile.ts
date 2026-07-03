import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CDPSession, Page, TestInfo } from "@playwright/test";
import {
  CPU_PROFILE_CAPTURE_DEADLINE_MS,
  CPU_PROFILE_SAMPLING_INTERVAL_US,
  CPU_PROFILE_STOP_DEADLINE_MS,
} from "../constants";

const BENCH_UTILS_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_PERF_DIR = resolve(BENCH_UTILS_DIR, "../../perf");

const detachQuietly = async (cdpSession: CDPSession): Promise<void> => {
  try {
    await cdpSession.detach();
  } catch {
    // ignore
  }
};

const raceDeadline = <ResultType>(
  work: Promise<ResultType>,
  deadlineMs: number,
): Promise<ResultType | "deadline"> =>
  Promise.race([
    work,
    new Promise<"deadline">((resolveDeadline) => {
      setTimeout(() => resolveDeadline("deadline"), deadlineMs);
    }),
  ]);

const stopCpuProfilerAndWrite = async (
  testInfo: TestInfo,
  profileName: string,
  cdpSession: CDPSession,
): Promise<void> => {
  let profileJson: string | null = null;
  try {
    const { profile } = await cdpSession.send("Profiler.stop");
    profileJson = JSON.stringify(profile);
  } finally {
    await detachQuietly(cdpSession);
  }
  if (!profileJson) return;

  const runLabel = process.env.PERF_LABEL ?? "current";
  await testInfo.attach(`perf-${profileName}.cpuprofile`, {
    body: profileJson,
    contentType: "application/json",
  });
  const labelDirPath = resolve(PACKAGE_PERF_DIR, runLabel);
  await mkdir(labelDirPath, { recursive: true });
  await writeFile(resolve(labelDirPath, `${profileName}.cpuprofile`), profileJson);
};

// V8 sampling profile of a capture pass via the CDP Profiler domain (not the
// Tracing domain, which wedges the headless renderer main thread; see PR #522).
// Deadline-bounded and best-effort: a wedged pass only costs the .cpuprofile.
export const captureCpuProfile = async (
  page: Page,
  testInfo: TestInfo,
  profileName: string,
  profiledBody: () => Promise<void>,
): Promise<void> => {
  let profilerSession: CDPSession | null = null;
  try {
    profilerSession = await page.context().newCDPSession(page);
    await profilerSession.send("Profiler.enable");
    await profilerSession.send("Profiler.setSamplingInterval", {
      interval: CPU_PROFILE_SAMPLING_INTERVAL_US,
    });
    await profilerSession.send("Profiler.start");
    const bodyPromise = profiledBody().then(() => "done" as const);
    bodyPromise.catch(() => {});
    const bodyOutcome = await raceDeadline(bodyPromise, CPU_PROFILE_CAPTURE_DEADLINE_MS);
    if (bodyOutcome === "deadline") {
      console.warn(`[perf] ${profileName}: profiled pass timed out; skipping .cpuprofile`);
      await detachQuietly(profilerSession);
      return;
    }
    const stopOutcome = await raceDeadline(
      stopCpuProfilerAndWrite(testInfo, profileName, profilerSession).then(() => "done" as const),
      CPU_PROFILE_STOP_DEADLINE_MS,
    );
    if (stopOutcome === "deadline") {
      console.warn(`[perf] ${profileName}: Profiler.stop timed out; skipping .cpuprofile`);
      await detachQuietly(profilerSession);
    }
  } catch (captureError) {
    console.warn(`[perf] ${profileName}: cpu profile capture failed:`, captureError);
    if (profilerSession) await detachQuietly(profilerSession);
  }
};
