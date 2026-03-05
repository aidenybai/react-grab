import { AbsoluteFill } from "remotion";
import { BACKGROUND_COLOR } from "./constants";
import { geistFontFamily } from "./utils/fonts";

export const MainComposition: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        fontFamily: geistFontFamily,
      }}
    />
  );
};
