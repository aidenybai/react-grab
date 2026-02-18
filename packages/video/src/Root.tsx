import { Composition } from "remotion";
import { Main } from "./compositions/main";
import {
  TOTAL_DURATION_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT_PX,
  VIDEO_WIDTH_PX,
} from "./constants";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Main"
      component={Main}
      durationInFrames={TOTAL_DURATION_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH_PX}
      height={VIDEO_HEIGHT_PX}
    />
  );
};
