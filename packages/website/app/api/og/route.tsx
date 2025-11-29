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
  <svg
    width="48"
    height="48"
    viewBox="0 0 294 294"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_og)">
      <mask
        id="mask0_og"
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="294"
        height="294"
      >
        <path d="M294 0H0V294H294V0Z" fill="white" />
      </mask>
      <g mask="url(#mask0_og)">
        <path
          d="M144.599 47.4924C169.712 27.3959 194.548 20.0265 212.132 30.1797C227.847 39.2555 234.881 60.3243 231.926 89.516C231.677 92.0069 231.328 94.5423 230.94 97.1058L228.526 110.14C228.517 110.136 228.505 110.132 228.495 110.127C228.486 110.165 228.479 110.203 228.468 110.24L216.255 105.741C216.256 105.736 216.248 105.728 216.248 105.723C207.915 103.125 199.421 101.075 190.82 99.5888L190.696 99.5588L173.526 97.2648L173.511 97.2631C173.492 97.236 173.467 97.2176 173.447 97.1905C163.862 96.2064 154.233 95.7166 144.599 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8624 138.391 86.939 147.193C90.8624 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245C115.749 197.245 115.758 197.246 115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.507 229.974L144.609 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.472 238.38C154.485 238.392 154.499 238.402 154.513 238.412L143.846 247.482L143.827 247.497C126.56 261.128 109.472 268.745 94.8019 268.745C88.5916 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3164 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3363 185.327 9.52301 167.51 9.52301 147.193C9.52301 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3164 60.3243 61.3496 39.2555 77.0657 30.1797C94.6494 20.0265 119.486 27.3959 144.599 47.4924ZM70.6423 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5176 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8516 207.742 83.0977 205.066 70.6423 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1787 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.9311 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.759 110.203C59.234 110.839 57.7378 111.475 56.27 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9104 147.193C67.822 135.23 63.7566 122.855 60.759 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.854 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.6291 47.6015 67.6975 64.5954 70.0424 87.9446L70.0416 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8263 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.773 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.29 38.512C183.321 38.512 169.34 44.4991 154.444 56.0153C163.93 64.9374 172.634 74.6557 180.462 85.064C193.375 86.6345 206.128 89.3102 218.584 93.0624C218.812 91.4325 219.003 89.8118 219.165 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.552 64.3097C138.104 70.2614 132.054 76.6306 126.443 83.3765C132.39 82.995 138.426 82.8046 144.552 82.8046C150.727 82.8046 156.778 83.0143 162.707 83.3765C157.08 76.6293 151.015 70.2596 144.552 64.3097Z"
          fill={BRAND_PINK}
        />
      </g>
      <mask
        id="mask1_og"
        maskUnits="userSpaceOnUse"
        x="102"
        y="84"
        width="161"
        height="162"
      >
        <path
          d="M235.282 84.827L102.261 112.259L129.693 245.28L262.714 217.848L235.282 84.827Z"
          fill="white"
        />
      </mask>
      <g mask="url(#mask1_og)">
        <path
          d="M136.863 129.916L213.258 141.224C220.669 142.322 222.495 152.179 215.967 155.856L187.592 171.843L184.135 204.227C183.339 211.678 173.564 213.901 169.624 207.526L129.021 141.831C125.503 136.14 130.245 128.936 136.863 129.916Z"
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
    (
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
      </div>
    ),
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
    }
  );
};
