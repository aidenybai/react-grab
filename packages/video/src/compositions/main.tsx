import type React from "react";
import { Series } from "remotion";
import {
  SCENE_1_DURATION,
  SCENE_2_DURATION,
  SCENE_3_DURATION,
  SCENE_4_DURATION,
  SCENE_5_DURATION,
} from "../constants";
import { Scene1 } from "../scenes/Scene1";
import { Scene2 } from "../scenes/Scene2";
import { Scene3 } from "../scenes/Scene3";
import { Scene4 } from "../scenes/Scene4";
import { Scene5 } from "../scenes/Scene5";

/**
 * Main composition — wires together all five scenes via <Series>.
 * Each scene receives useCurrentFrame() relative to its own start.
 * Total: 80 + 160 + 200 + 80 + 80 = 600 frames = 15s @ 40fps.
 */
export const MainComposition: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={SCENE_1_DURATION}>
        <Scene1 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_2_DURATION}>
        <Scene2 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_3_DURATION}>
        <Scene3 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_4_DURATION}>
        <Scene4 />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_5_DURATION}>
        <Scene5 />
      </Series.Sequence>
    </Series>
  );
};
