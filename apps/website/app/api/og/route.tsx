import { ImageResponse } from "next/og";

export const runtime = "edge";

const BRAND_PINK = "#fc4efd";
const BACKGROUND_DARK_PURPLE = "#1a0815";

const getGoogleFontUrl = (fontFamily: string, weight: number) =>
  `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@${weight}&display=swap`;

const fetchFont = async (fontFamily: string, weight: number) => {
  const cssUrl = getGoogleFontUrl(fontFamily, weight);
  const cssResponse = await fetch(cssUrl);
  const cssText = await cssResponse.text();

  const fontUrlMatch = cssText.match(/src: url\(([^)]+)\)/);
  if (!fontUrlMatch) {
    throw new Error("Could not find font URL in CSS");
  }

  const fontUrl = fontUrlMatch[1];
  const fontResponse = await fetch(fontUrl);
  return fontResponse.arrayBuffer();
};

const ReactGrabLogo = () => (
  <svg width="48" height="48" viewBox="0 0 294 294" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_og)">
      <mask id="mask0_og" maskUnits="userSpaceOnUse" x="0" y="0" width="294" height="294">
        <path d="M294 0H0V294H294V0Z" fill="white" />
      </mask>
      <g mask="url(#mask0_og)">
        <path
          d="M144.6 47.49C169.71 27.4 194.55 20.03 212.13 30.18C227.85 39.26 234.88 60.32 231.93 89.52C231.68 92.01 231.33 94.54 230.94 97.11L228.53 110.14C228.52 110.14 228.5 110.13 228.5 110.13C228.49 110.17 228.48 110.2 228.47 110.24L216.25 105.74C216.26 105.74 216.25 105.73 216.25 105.72C207.91 103.12 199.42 101.08 190.82 99.59L190.7 99.56L173.53 97.26L173.51 97.26C173.49 97.24 173.47 97.22 173.45 97.19C163.86 96.21 154.23 95.72 144.6 95.72C134.94 95.72 125.3 96.22 115.69 97.23C110.08 105.03 104.86 113.12 100.06 121.45C95.24 129.8 90.86 138.39 86.94 147.19C90.86 156 95.24 164.59 100.06 172.93C104.87 181.3 110.1 189.42 115.74 197.25C115.75 197.25 115.76 197.25 115.77 197.25L115.75 197.27L115.75 197.28L115.75 197.3L126.5 211.01L126.57 211.09C132.14 217.77 138.13 224.07 144.51 229.97L144.61 230.08L154.57 238.29C154.54 238.32 154.51 238.35 154.47 238.38C154.49 238.39 154.5 238.4 154.51 238.41L143.85 247.48L143.83 247.5C126.56 261.13 109.47 268.75 94.8 268.75C88.59 268.84 82.47 267.27 77.07 264.21C61.35 255.13 54.32 234.06 57.27 204.87C57.53 202.31 57.88 199.69 58.29 197.05C28.34 185.33 9.52 167.51 9.52 147.19C9.52 129.04 24.25 112.4 50.99 100.38C53.34 99.32 55.79 98.31 58.29 97.35C57.88 94.7 57.53 92.08 57.27 89.52C54.32 60.32 61.35 39.26 77.07 30.18C94.65 20.03 119.49 27.4 144.6 47.49ZM70.64 201.31C70.42 202.96 70.22 204.57 70.07 206.17C67.67 229.57 72.55 246.63 83.36 252.99L83.52 253.06C95.04 259.72 114.02 254.43 134.78 238.38C125.3 229.45 116.59 219.72 108.76 209.31C95.85 207.74 83.1 205.07 70.64 201.31ZM80.35 163.44C77.34 171.68 74.87 180.1 72.95 188.66C81.18 191.22 89.57 193.25 98.06 194.72L98.46 194.81C95.21 189.87 92.02 184.66 88.93 179.38C85.84 174.1 83 168.77 80.35 163.44ZM60.76 110.2C59.23 110.84 57.74 111.47 56.27 112.11C34.78 121.81 22.39 134.59 22.39 147.19C22.39 160.49 36.47 174.3 60.75 184.26C63.74 171.58 67.81 159.18 72.91 147.19C67.82 135.23 63.76 122.86 60.76 110.2ZM98.41 99.64C89.81 101.14 81.31 103.21 72.97 105.81C74.85 114.2 77.27 122.47 80.21 130.55L80.31 130.94C82.99 125.6 85.8 120.34 88.88 115.01C91.96 109.68 95.15 104.57 98.41 99.64ZM94.93 38.52C90.93 38.43 86.99 39.4 83.49 41.32C72.63 47.6 67.7 64.6 70.04 87.94L70.04 88.22C70.19 89.82 70.39 91.43 70.61 93.06C83.07 89.34 95.83 86.67 108.74 85.09C116.57 74.68 125.28 64.95 134.77 56.02C119.88 44.51 105.89 38.52 94.93 38.52ZM205.74 41.31C202.27 39.4 198.35 38.43 194.39 38.51L194.29 38.51C183.32 38.51 169.34 44.5 154.44 56.02C163.93 64.94 172.63 74.66 180.46 85.06C193.38 86.63 206.13 89.31 218.58 93.06C218.81 91.43 219 89.81 219.16 88.21C221.55 64.71 216.65 47.62 205.74 41.31ZM144.55 64.31C138.1 70.26 132.05 76.63 126.44 83.38C132.39 83 138.43 82.8 144.55 82.8C150.73 82.8 156.78 83.01 162.71 83.38C157.08 76.63 151.01 70.26 144.55 64.31Z"
          fill={BRAND_PINK}
        />
      </g>
      <mask id="mask1_og" maskUnits="userSpaceOnUse" x="102" y="84" width="161" height="162">
        <path
          d="M235.28 84.83L102.26 112.26L129.69 245.28L262.71 217.85L235.28 84.83Z"
          fill="white"
        />
      </mask>
      <g mask="url(#mask1_og)">
        <path
          d="M136.86 129.92L213.26 141.22C220.67 142.32 222.5 152.18 215.97 155.86L187.59 171.84L184.13 204.23C183.34 211.68 173.56 213.9 169.62 207.53L129.02 141.83C125.5 136.14 130.25 128.94 136.86 129.92Z"
          fill={BRAND_PINK}
          stroke={BRAND_PINK}
          strokeWidth="0.817337"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>
    <defs>
      <clipPath id="clip0_og">
        <rect width="294" height="294" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "React Grab";
  const subtitle = searchParams.get("subtitle");

  const geistSemiBold = await fetchFont("Geist", 600);
  const geistRegular = await fetchFont("Geist", 400);

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        backgroundColor: BACKGROUND_DARK_PURPLE,
        padding: "80px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "80px",
          left: "80px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <ReactGrabLogo />
        <span
          style={{
            fontSize: 32,
            fontFamily: "Geist",
            fontWeight: 600,
            color: "#ffffff",
            letterSpacing: "-0.02em",
          }}
        >
          React Grab
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "900px",
        }}
      >
        <h1
          style={{
            fontSize: title.length > 40 ? 56 : 72,
            fontFamily: "Geist",
            fontWeight: 600,
            color: "#ffffff",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: 28,
              fontFamily: "Geist",
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.5)",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Geist",
          data: geistSemiBold,
          style: "normal",
          weight: 600,
        },
        {
          name: "Geist",
          data: geistRegular,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
};
