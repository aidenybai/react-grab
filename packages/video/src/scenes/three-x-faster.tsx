import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BACKGROUND_COLOR,
  BODY_FONT_SIZE_PX,
  HERO_FONT_SIZE_PX,
  SHIMMER_GRADIENT_STOPS,
  TEXT_COLOR,
} from "../constants";
import { fontFamilySans } from "../utils/font";

const SUBTITLE_APPEAR_FRAME = 12;
const SUBTITLE_FADE_FRAMES = 10;
const HERO_APPEAR_FRAME = 42;
const SHIMMER_SWEEP_START_FRAME = 48;
const SHIMMER_SWEEP_DURATION_FRAMES = 50;

export const ThreeXFaster = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const subtitleOpacity = interpolate(
    frame,
    [SUBTITLE_APPEAR_FRAME, SUBTITLE_APPEAR_FRAME + SUBTITLE_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  const heroProgress = spring({
    frame: frame - HERO_APPEAR_FRAME,
    fps,
    config: { damping: 200 },
  });

  const heroOpacity = interpolate(
    frame,
    [HERO_APPEAR_FRAME, HERO_APPEAR_FRAME + 6],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const shimmerPosition = interpolate(
    frame,
    [SHIMMER_SWEEP_START_FRAME, SHIMMER_SWEEP_START_FRAME + SHIMMER_SWEEP_DURATION_FRAMES],
    [200, -100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div
          style={{
            fontFamily: fontFamilySans,
            fontSize: BODY_FONT_SIZE_PX,
            color: TEXT_COLOR,
            opacity: subtitleOpacity,
          }}
        >
          What if you could make it...
        </div>

        <div
          style={{
            fontFamily: fontFamilySans,
            fontSize: HERO_FONT_SIZE_PX,
            fontWeight: 700,
            opacity: heroOpacity,
            transform: `scale(${heroProgress})`,
            background: `linear-gradient(90deg, ${SHIMMER_GRADIENT_STOPS[0]} 0%, ${SHIMMER_GRADIENT_STOPS[1]} 25%, ${SHIMMER_GRADIENT_STOPS[2]} 50%, ${SHIMMER_GRADIENT_STOPS[3]} 75%, ${SHIMMER_GRADIENT_STOPS[4]} 100%)`,
            backgroundSize: "200% 100%",
            backgroundPosition: `${shimmerPosition}% 0`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          3× faster
        </div>
      </div>
    </AbsoluteFill>
  );
};
