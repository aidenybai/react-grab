import type { BenchLibrarySpec } from "./types";

export const OUR_LIBRARY_ID = "react-grab-screenshot";

export const benchLibraries: BenchLibrarySpec[] = [
  {
    id: OUR_LIBRARY_ID,
    bundleRelativePath: "dist/index.global.js",
    adapterKey: "react-grab",
  },
  {
    id: "snapdom",
    bundleRelativePath: "node_modules/@zumer/snapdom/dist/snapdom.js",
    adapterKey: "snapdom",
  },
  {
    id: "modern-screenshot",
    bundleRelativePath: "node_modules/modern-screenshot/dist/index.js",
    adapterKey: "modern-screenshot",
  },
  {
    id: "html-to-image",
    bundleRelativePath: "node_modules/html-to-image/dist/html-to-image.js",
    adapterKey: "html-to-image",
  },
  {
    id: "html2canvas",
    bundleRelativePath: "node_modules/html2canvas/dist/html2canvas.js",
    adapterKey: "html2canvas",
  },
  {
    id: "dom-to-image-more",
    bundleRelativePath: "node_modules/dom-to-image-more/dist/dom-to-image-more.min.js",
    adapterKey: "dom-to-image-more",
  },
];

export const benchFixtureIds: string[] = [
  "10-typography",
  "20-flex-layout",
  "40-images",
  "41-background-images",
  "60-kitchen-sink",
  "70-stress",
];
