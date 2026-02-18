import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";

export const { fontFamily: fontFamilySans } = loadGeist("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export const { fontFamily: fontFamilyMono } = loadGeistMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});
