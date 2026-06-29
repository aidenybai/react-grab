import {
  CLIP_DURATION_MS,
  RECORDER_MIME_CANDIDATES,
  RECORDER_TIMESLICE_MS,
} from "./trace-constants.js";

interface ReplayBuffer {
  start: () => Promise<void>;
  stop: () => void;
  isRecording: () => boolean;
  getClipBlob: () => Promise<Blob | null>;
  onStop: (listener: () => void) => void;
}

const pickSupportedMimeType = (): string | null => {
  if (typeof MediaRecorder === "undefined") return null;
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return null;
};

export const createReplayBuffer = (): ReplayBuffer => {
  const maxMediaChunks = Math.ceil(CLIP_DURATION_MS / RECORDER_TIMESLICE_MS);
  // The first dataavailable blob carries the WebM initialization segment. It
  // must prefix every assembled clip or the file is unplayable, so it is pinned
  // separately from the rolling window of media clusters.
  let initializationChunk: Blob | null = null;
  let mediaChunks: Blob[] = [];
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let mimeType = "video/webm";
  const stopListeners = new Set<() => void>();

  const teardown = () => {
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = null;
    recorder = null;
    for (const listener of stopListeners) listener();
  };

  const start = async (): Promise<void> => {
    const supportedMimeType = pickSupportedMimeType();
    if (!supportedMimeType) {
      throw new Error("MediaRecorder WebM capture is not supported in this browser.");
    }
    mimeType = supportedMimeType;

    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: false,
    });

    initializationChunk = null;
    mediaChunks = [];

    recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      if (!initializationChunk) {
        initializationChunk = event.data;
        return;
      }
      mediaChunks.push(event.data);
      if (mediaChunks.length > maxMediaChunks) {
        mediaChunks = mediaChunks.slice(mediaChunks.length - maxMediaChunks);
      }
    };
    recorder.onstop = teardown;

    // The user can end the capture from Chrome's native "Stop sharing" bar.
    for (const track of stream.getVideoTracks()) {
      track.addEventListener("ended", () => stop());
    }

    recorder.start(RECORDER_TIMESLICE_MS);
  };

  const stop = () => {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    teardown();
  };

  const flushPendingData = (): Promise<void> =>
    new Promise((resolve) => {
      if (!recorder || recorder.state !== "recording") {
        resolve();
        return;
      }
      const handleData = () => {
        recorder?.removeEventListener("dataavailable", handleData);
        resolve();
      };
      recorder.addEventListener("dataavailable", handleData);
      recorder.requestData();
    });

  const getClipBlob = async (): Promise<Blob | null> => {
    await flushPendingData();
    if (!initializationChunk || mediaChunks.length === 0) return null;
    return new Blob([initializationChunk, ...mediaChunks], { type: mimeType });
  };

  return {
    start,
    stop,
    isRecording: () => recorder?.state === "recording",
    getClipBlob,
    onStop: (listener) => {
      stopListeners.add(listener);
    },
  };
};
