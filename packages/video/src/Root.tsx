import type React from "react";
import { Composition } from "remotion";
import { MainComposition } from "./compositions/main";
import {
  VIDEO_WIDTH_PX,
  VIDEO_HEIGHT_PX,
  VIDEO_FPS,
  TOTAL_DURATION_FRAMES,
} from "./constants";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ReactGrabPromo"
      component={MainComposition}
      durationInFrames={TOTAL_DURATION_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH_PX}
      height={VIDEO_HEIGHT_PX}
    />
  );
};
