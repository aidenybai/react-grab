import { KEYFRAME_COUNT, KEYFRAME_JPEG_QUALITY, KEYFRAME_MAX_WIDTH_PX } from "./trace-constants.js";

const loadVideo = (blob: Blob): Promise<HTMLVideoElement> =>
  new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = URL.createObjectURL(blob);
    video.addEventListener("loadeddata", () => resolve(video), { once: true });
    video.addEventListener("error", () => reject(new Error("Clip video failed to decode.")), {
      once: true,
    });
  });

const seekTo = (video: HTMLVideoElement, time: number): Promise<void> =>
  new Promise((resolve) => {
    const handleSeeked = () => {
      video.removeEventListener("seeked", handleSeeked);
      resolve();
    };
    video.addEventListener("seeked", handleSeeked);
    video.currentTime = time;
  });

// WebM blobs assembled from a sliding chunk window often report an infinite or
// missing duration because the trailing Cues/duration metadata was never
// written. Forcing a seek past the end coerces the browser into resolving the
// real duration of the buffered media.
const resolveDuration = async (video: HTMLVideoElement): Promise<number> => {
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
  await seekTo(video, Number.MAX_SAFE_INTEGER);
  return Number.isFinite(video.duration) ? video.duration : video.currentTime;
};

export const extractKeyframes = async (
  blob: Blob,
  jankTimestampsMs: number[] = [],
): Promise<string[]> => {
  let video: HTMLVideoElement | null = null;
  try {
    video = await loadVideo(blob);
    const duration = await resolveDuration(video);
    if (!Number.isFinite(duration) || duration <= 0) return [];

    const scale = Math.min(1, KEYFRAME_MAX_WIDTH_PX / (video.videoWidth || KEYFRAME_MAX_WIDTH_PX));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return [];

    const sampleTimes =
      jankTimestampsMs.length > 0
        ? jankTimestampsMs.slice(0, KEYFRAME_COUNT)
        : Array.from(
            { length: KEYFRAME_COUNT },
            (_unused, index) => (duration * (index + 0.5)) / KEYFRAME_COUNT,
          );

    const frames: string[] = [];
    for (const time of sampleTimes) {
      await seekTo(video, Math.max(0, Math.min(time, duration - 0.01)));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", KEYFRAME_JPEG_QUALITY));
    }
    return frames;
  } catch {
    return [];
  } finally {
    if (video) URL.revokeObjectURL(video.src);
  }
};
