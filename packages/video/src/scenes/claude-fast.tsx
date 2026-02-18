import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  BACKGROUND_COLOR,
  BLOCK_GAP_PX,
  BODY_FONT_SIZE_PX,
  CLAUDE_ASCII_ART_LINE_1,
  CLAUDE_ASCII_ART_LINE_2,
  CLAUDE_ASCII_ART_LINE_3,
  CLAUDE_ASCII_COLOR,
  CLAUDE_HEADER_FONT_SIZE_PX,
  CONTENT_TOP_PADDING_PX,
  CONTENT_WIDTH_PX,
  DIM_COLOR,
  DIVIDER_COLOR,
  ELEMENT_TAG_BACKGROUND_COLOR,
  ELEMENT_TAG_BORDER_RADIUS_PX,
  ELEMENT_TAG_FONT_SIZE_PX,
  ELEMENT_TAG_PADDING,
  ELEMENT_TAG_TEXT_COLOR,
  FADE_IN_FRAMES,
  MUTED_COLOR,
  OVERLAY_GRADIENT_HEIGHT_PX,
  OVERLAY_TITLE_FONT_SIZE_PX,
  SCENE_CLAUDE_FAST_DURATION_FRAMES,
  SHIMMER_GRADIENT_STOPS,
  TEXT_COLOR,
} from "../constants";
import { fontFamilyMono, fontFamilySans } from "../utils/font";
import { getBottomOverlayGradient } from "../utils/get-bottom-overlay-gradient";

const PROMPT_DELAY_FRAMES = 14;
const THOUGHT_FRAME = 24;
const ELEMENT_FOUND_FRAME = 34;
const READ_FRAME = 42;
const DONE_FRAME = 52;

const OVERLAY_START_FRAME = Math.floor(SCENE_CLAUDE_FAST_DURATION_FRAMES * 0.45);
const OVERLAY_FADE_IN_FRAMES = 15;

const fadeIn = (localFrame: number) =>
  interpolate(localFrame, [0, FADE_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const tagStyle = {
  display: "inline-flex" as const,
  alignItems: "center" as const,
  borderRadius: ELEMENT_TAG_BORDER_RADIUS_PX,
  backgroundColor: ELEMENT_TAG_BACKGROUND_COLOR,
  padding: ELEMENT_TAG_PADDING,
  fontSize: ELEMENT_TAG_FONT_SIZE_PX,
  fontFamily: fontFamilyMono,
  color: ELEMENT_TAG_TEXT_COLOR,
};

export const ClaudeFast = () => {
  const frame = useCurrentFrame();

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

  const shimmerPosition = interpolate(
    frame,
    [OVERLAY_START_FRAME + 10, OVERLAY_START_FRAME + 55],
    [200, -100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

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
          fontSize: BODY_FONT_SIZE_PX,
        }}
      >
        <div
          style={{
            fontFamily: fontFamilyMono,
            fontSize: CLAUDE_HEADER_FONT_SIZE_PX,
            lineHeight: 1.4,
            opacity: fadeIn(frame),
            whiteSpace: "pre",
          }}
        >
          <div>
            <span style={{ color: CLAUDE_ASCII_COLOR }}>{CLAUDE_ASCII_ART_LINE_1}</span>
            <span style={{ color: TEXT_COLOR }}>   Claude Code</span>
          </div>
          <div>
            <span style={{ color: CLAUDE_ASCII_COLOR }}>{CLAUDE_ASCII_ART_LINE_2}</span>
            <span style={{ color: MUTED_COLOR }}>{"  "}Opus 4.6 · Claude API</span>
          </div>
          <div>
            <span style={{ color: CLAUDE_ASCII_COLOR }}>{CLAUDE_ASCII_ART_LINE_3}</span>
            <span style={{ color: MUTED_COLOR }}>{"    "}/Users/you/my-app</span>
          </div>
        </div>

        <div
          style={{
            fontFamily: fontFamilyMono,
            color: TEXT_COLOR,
            opacity: fadeIn(frame - PROMPT_DELAY_FRAMES),
            borderTop: `1px solid ${DIVIDER_COLOR}`,
            paddingTop: 14,
          }}
        >
          <span style={{ color: MUTED_COLOR }}>❯ </span>
          Make the submit button bigger
        </div>

        <div style={{ opacity: fadeIn(frame - THOUGHT_FRAME), fontFamily: fontFamilySans, color: MUTED_COLOR }}>
          Thought for <span style={{ color: DIM_COLOR }}>1s</span>
        </div>

        <div
          style={{
            opacity: fadeIn(frame - ELEMENT_FOUND_FRAME),
            fontFamily: fontFamilySans,
            color: TEXT_COLOR,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          I found <span style={tagStyle}>PrimaryButton</span> at{" "}
          <span style={tagStyle}>primary-button.tsx</span>
        </div>

        <div
          style={{
            opacity: fadeIn(frame - READ_FRAME),
            fontFamily: fontFamilySans,
            color: MUTED_COLOR,
            display: "flex",
            gap: 8,
          }}
        >
          <span>Read</span>
          <span style={{ color: DIM_COLOR }}>primary-button.tsx</span>
        </div>

        <div
          style={{
            opacity: fadeIn(frame - DONE_FRAME),
            fontFamily: fontFamilySans,
            color: TEXT_COLOR,
          }}
        >
          Found it. Let me resize it for you.
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
              opacity: overlayTitleOpacity,
              background: `linear-gradient(90deg, ${SHIMMER_GRADIENT_STOPS[0]} 0%, ${SHIMMER_GRADIENT_STOPS[1]} 25%, ${SHIMMER_GRADIENT_STOPS[2]} 50%, ${SHIMMER_GRADIENT_STOPS[3]} 75%, ${SHIMMER_GRADIENT_STOPS[4]} 100%)`,
              backgroundSize: "200% 100%",
              backgroundPosition: `${shimmerPosition}% 0`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            React Grab makes your agent 3× faster
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
