import { springTiming, TransitionSeries } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import {
  SCENE_CLAUDE_FAST_DURATION_FRAMES,
  SCENE_GRAB_ELEMENTS_DURATION_FRAMES,
  SCENE_STRUGGLING_DURATION_FRAMES,
  SCENE_THREE_X_FASTER_DURATION_FRAMES,
  TRANSITION_DURATION_FRAMES,
} from "../constants";
import { ClaudeFast } from "../scenes/claude-fast";
import { ClaudeStruggling } from "../scenes/claude-struggling";
import { GrabElements } from "../scenes/grab-elements";
import { ThreeXFaster } from "../scenes/three-x-faster";

export const Main = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence
        durationInFrames={SCENE_STRUGGLING_DURATION_FRAMES}
      >
        <ClaudeStruggling />
      </TransitionSeries.Sequence>

      <TransitionSeries.Sequence
        durationInFrames={SCENE_THREE_X_FASTER_DURATION_FRAMES}
      >
        <ThreeXFaster />
      </TransitionSeries.Sequence>

      <TransitionSeries.Sequence
        durationInFrames={SCENE_GRAB_ELEMENTS_DURATION_FRAMES}
      >
        <GrabElements />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: TRANSITION_DURATION_FRAMES,
        })}
      />

      <TransitionSeries.Sequence
        durationInFrames={SCENE_CLAUDE_FAST_DURATION_FRAMES}
      >
        <ClaudeFast />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
