import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "./style.css";

export const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  return (
    <AbsoluteFill className="bg-black flex items-center justify-center">
      <div
        style={{ opacity, transform: `scale(${scale})` }}
        className="text-white text-7xl font-bold tracking-tight"
      >
        React Grab
      </div>
    </AbsoluteFill>
  );
};
