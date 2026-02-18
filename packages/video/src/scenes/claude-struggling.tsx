import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BACKGROUND_COLOR,
  BLOCK_GAP_PX,
  BODY_FONT_SIZE_PX,
  CONTENT_TOP_PADDING_PX,
  CONTENT_WIDTH_PX,
  DIM_COLOR,
  ERROR_COLOR,
  FADE_IN_FRAMES,
  GREP_ITEM_INTERVAL_FRAMES,
  GREP_SEARCHES,
  MUTED_COLOR,
  OVERLAY_GRADIENT_HEIGHT_PX,
  OVERLAY_TITLE_FONT_SIZE_PX,
  SCENE_STRUGGLING_DURATION_FRAMES,
  TEXT_COLOR,
  USER_MESSAGE_BACKGROUND_COLOR,
  USER_MESSAGE_BORDER_COLOR,
  USER_MESSAGE_BORDER_RADIUS_PX,
  USER_MESSAGE_PADDING,
} from "../constants";
import { fontFamilySans } from "../utils/font";
import { getBottomOverlayGradient } from "../utils/get-bottom-overlay-gradient";

const USER_MESSAGE_APPEAR_FRAME = 10;
const THOUGHT_APPEAR_FRAME = 30;
const THOUGHT_COLLAPSE_FRAME = 58;
const AI_MESSAGE_APPEAR_FRAME = 65;
const GREP_START_FRAME = 85;
const ERROR_APPEAR_FRAME =
  GREP_START_FRAME + GREP_SEARCHES.length * GREP_ITEM_INTERVAL_FRAMES + 18;

const OVERLAY_START_FRAME = Math.floor(SCENE_STRUGGLING_DURATION_FRAMES * 0.6);
const OVERLAY_FADE_IN_FRAMES = 15;

const fadeIn = (localFrame: number) =>
  interpolate(localFrame, [0, FADE_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

export const ClaudeStruggling = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shimmerPosition = interpolate(
    frame % (2 * fps),
    [0, 2 * fps],
    [200, -200],
  );

  const overlayOpacity = interpolate(
    frame,
    [OVERLAY_START_FRAME, OVERLAY_START_FRAME + OVERLAY_FADE_IN_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const overlayTitleOpacity = interpolate(
    frame,
    [OVERLAY_START_FRAME + 5, OVERLAY_START_FRAME + OVERLAY_FADE_IN_FRAMES + 5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  const shimmerStyle = {
    background: `linear-gradient(90deg, ${MUTED_COLOR} 0%, ${MUTED_COLOR} 35%, ${TEXT_COLOR} 50%, ${MUTED_COLOR} 65%, ${MUTED_COLOR} 100%)`,
    backgroundSize: "150% 100%",
    backgroundPosition: `${shimmerPosition}% 0`,
    backgroundClip: "text" as const,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BACKGROUND_COLOR }}>
      <div
        style={{
          width: CONTENT_WIDTH_PX,
          margin: "0 auto",
          paddingTop: CONTENT_TOP_PADDING_PX,
          display: "flex",
          flexDirection: "column",
          gap: BLOCK_GAP_PX,
          fontFamily: fontFamilySans,
          fontSize: BODY_FONT_SIZE_PX,
        }}
      >
        <div
          style={{
            opacity: fadeIn(frame - USER_MESSAGE_APPEAR_FRAME),
            alignSelf: "flex-end",
            maxWidth: "80%",
            backgroundColor: USER_MESSAGE_BACKGROUND_COLOR,
            border: `1px solid ${USER_MESSAGE_BORDER_COLOR}`,
            borderRadius: USER_MESSAGE_BORDER_RADIUS_PX,
            padding: USER_MESSAGE_PADDING,
            color: TEXT_COLOR,
          }}
        >
          Can you make the submit button bigger?
        </div>

        <div style={{ opacity: fadeIn(frame - THOUGHT_APPEAR_FRAME), color: MUTED_COLOR }}>
          {frame >= THOUGHT_COLLAPSE_FRAME ? (
            <span>
              Thought for <span style={{ color: DIM_COLOR }}>3s</span>
            </span>
          ) : (
            <span style={shimmerStyle}>Thinking</span>
          )}
        </div>

        <div style={{ opacity: fadeIn(frame - AI_MESSAGE_APPEAR_FRAME), color: TEXT_COLOR }}>
          Let me search for the submit button in your codebase.
        </div>

        <div style={{ color: MUTED_COLOR, display: "flex", flexDirection: "column", gap: BLOCK_GAP_PX }}>
          {GREP_SEARCHES.map((search, index) => {
            const startFrame = GREP_START_FRAME + index * GREP_ITEM_INTERVAL_FRAMES;
            const opacity = fadeIn(frame - startFrame);
            const isSearching = frame >= startFrame && frame < startFrame + GREP_ITEM_INTERVAL_FRAMES;

            return (
              <div key={search} style={{ opacity, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={isSearching ? shimmerStyle : undefined}>
                  {isSearching ? "Grepping" : "Grepped"}
                </span>
                <span style={{ color: DIM_COLOR }}>{search}</span>
                {!isSearching && opacity > 0 && (
                  <>
                    <span>and found</span>
                    <span style={{ color: DIM_COLOR }}>no matches</span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            opacity: fadeIn(frame - ERROR_APPEAR_FRAME),
            color: ERROR_COLOR,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span>⚠</span>
          <span>I couldn{"'"}t find what you{"'"}re looking for :(</span>
        </div>
      </div>

      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div
          style={{
            width: "100%",
            height: OVERLAY_GRADIENT_HEIGHT_PX,
            background: getBottomOverlayGradient(overlayOpacity),
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            paddingBottom: 72,
          }}
        >
          <div
            style={{
              fontFamily: fontFamilySans,
              fontSize: OVERLAY_TITLE_FONT_SIZE_PX,
              color: TEXT_COLOR,
              opacity: overlayTitleOpacity,
            }}
          >
            Claude Code is struggling to find it...
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
