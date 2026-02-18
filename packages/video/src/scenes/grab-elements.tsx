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
  BLOCK_GAP_PX,
  BODY_FONT_SIZE_PX,
  CONTENT_TOP_PADDING_PX,
  CONTENT_WIDTH_PX,
  DIM_COLOR,
  ELEMENT_TAG_BACKGROUND_COLOR,
  ELEMENT_TAG_BORDER_RADIUS_PX,
  ELEMENT_TAG_FONT_SIZE_PX,
  ELEMENT_TAG_PADDING,
  ELEMENT_TAG_TEXT_COLOR,
  FADE_IN_FRAMES,
  GRAB_BUTTON_BORDER_COLOR,
  GRAB_BUTTON_SHADOW,
  MUTED_COLOR,
  OVERLAY_GRADIENT_HEIGHT_PX,
  OVERLAY_TITLE_FONT_SIZE_PX,
  SCENE_GRAB_ELEMENTS_DURATION_FRAMES,
  TEXT_COLOR,
} from "../constants";
import { fontFamilyMono, fontFamilySans } from "../utils/font";
import { getBottomOverlayGradient } from "../utils/get-bottom-overlay-gradient";

const BUTTON_APPEAR_FRAME = 10;
const ELEMENT_SELECT_FRAME = 38;
const ANALYSIS_FRAME = 58;
const READ_FRAME = 78;

const OVERLAY_START_FRAME = Math.floor(SCENE_GRAB_ELEMENTS_DURATION_FRAMES * 0.58);
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

export const GrabElements = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const buttonScale = spring({
    frame: frame - BUTTON_APPEAR_FRAME,
    fps,
    config: { damping: 200 },
  });

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
            opacity: fadeIn(frame - BUTTON_APPEAR_FRAME),
            transform: `scale(${buttonScale})`,
            transformOrigin: "left top",
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderRadius: 16,
            padding: "16px 24px",
            backgroundColor: ELEMENT_TAG_BACKGROUND_COLOR,
            border: `1px solid ${GRAB_BUTTON_BORDER_COLOR}`,
            boxShadow: GRAB_BUTTON_SHADOW,
            color: TEXT_COLOR,
          }}
        >
          <span>Hold</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {["⌘", "C"].map((key) => (
              <span
                key={key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 42,
                  height: 42,
                  borderRadius: 6,
                  backgroundColor: "rgba(255,255,255,0.1)",
                }}
              >
                {key}
              </span>
            ))}
          </span>
        </div>

        <div
          style={{
            opacity: fadeIn(frame - ELEMENT_SELECT_FRAME),
            color: TEXT_COLOR,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          Here{"'"}s the element <span style={tagStyle}>{"<button>"}</span>
        </div>

        <div
          style={{
            opacity: fadeIn(frame - ANALYSIS_FRAME),
            color: TEXT_COLOR,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          I found <span style={tagStyle}>PrimaryButton</span> at{" "}
          <span style={tagStyle}>primary-button.tsx</span> line{" "}
          <span style={tagStyle}>42</span>. Let me take a closer look.
        </div>

        <div
          style={{
            opacity: fadeIn(frame - READ_FRAME),
            color: MUTED_COLOR,
            display: "flex",
            gap: 8,
          }}
        >
          <span>Read</span>
          <span style={{ color: DIM_COLOR }}>primary-button.tsx</span>
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
            Copy context for your coding agent
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
