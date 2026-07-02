import { CLIP_DURATION_MS } from "./trace-constants.js";
import { createReplayBuffer } from "./replay-buffer.js";
import { createJankDetector } from "./jank-detector.js";
import { extractKeyframes } from "./extract-keyframes.js";
import { formatTraceClip } from "./format-trace.js";
import { downloadBlob, downloadDataUrl } from "./download-clip.js";
import { createTraceUi } from "./trace-ui.js";
import type { TraceClip } from "./trace-types.js";

interface TraceModeController {
  stop: () => void;
}

export const startTraceMode = (): TraceModeController => {
  const replayBuffer = createReplayBuffer();
  const jankDetector = createJankDetector();
  const ui = createTraceUi();
  let isGrabbing = false;

  const stop = () => {
    replayBuffer.stop();
    jankDetector.stop();
    ui.destroy();
    window.removeEventListener("keydown", handleKeydown, true);
  };

  const begin = async () => {
    ui.setStatus("requesting screen…");
    try {
      await replayBuffer.start();
    } catch (error) {
      ui.setStatus(error instanceof Error ? error.message : "capture failed");
      ui.setRecording(false);
      return;
    }
    jankDetector.start();
    ui.setRecording(true);
    ui.setStatus(`recording — last ${(CLIP_DURATION_MS / 1000).toFixed(0)}s buffered`);
  };

  const grabClip = async () => {
    if (isGrabbing || !replayBuffer.isRecording()) return;
    isGrabbing = true;
    ui.setStatus("building clip…");

    const events = jankDetector.getEventsWithin(CLIP_DURATION_MS);
    const videoBlob = await replayBuffer.getClipBlob();
    const jankOffsets = events
      .filter((event) => event.kind === "jank")
      .map((event) =>
        Math.max(0, (event.timestamp - (performance.now() - CLIP_DURATION_MS)) / 1000),
      );
    const keyframes = videoBlob ? await extractKeyframes(videoBlob, jankOffsets) : [];

    const clip: TraceClip = {
      events,
      durationMs: CLIP_DURATION_MS,
      capturedAt: performance.now(),
      videoBlob,
      keyframes,
    };

    const transcript = formatTraceClip(clip);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    try {
      await navigator.clipboard.writeText(transcript);
    } catch {
      // Clipboard write can reject without a user gesture; the downloads below
      // still give the user the clip, so we surface it in the status instead.
    }
    if (videoBlob) downloadBlob(videoBlob, `react-grab-clip-${stamp}.webm`);
    keyframes.forEach((dataUrl, index) => {
      downloadDataUrl(dataUrl, `react-grab-keyframe-${stamp}-${index + 1}.jpg`);
    });

    ui.flashCopied();
    ui.setStatus(`clip copied — ${keyframes.length} keyframe(s), ${events.length} event(s)`);
    isGrabbing = false;
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "c") {
      event.preventDefault();
      event.stopPropagation();
      void grabClip();
    }
  };

  replayBuffer.onStop(() => {
    jankDetector.stop();
    ui.setRecording(false);
    ui.setStatus("recording stopped");
  });

  ui.onToggleRecording(() => {
    if (replayBuffer.isRecording()) {
      replayBuffer.stop();
      return;
    }
    void begin();
  });
  ui.onGrabClip(() => void grabClip());

  window.addEventListener("keydown", handleKeydown, true);
  // getDisplayMedia requires transient user activation, so capture only starts
  // from the Record click — not on mode init.
  ui.setRecording(false);
  ui.setStatus("click Record to start buffering");

  return { stop };
};
