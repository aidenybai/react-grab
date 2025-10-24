"use client";

import { useEffect, useState } from "react";
import { IconCursor } from "@/components/icon-cursor";

/**
 * Code exported from Paper
 * https://app.paper.design/file/01K8B7DN5Q87ENAZCG11HMYXKQ?node=01K8BFNQRHNWXJET51BPR11G5Z
 * on Oct 25, 2025 at 1:10 AM.
 */
export default function Frame() {
  const [isHolding, setIsHolding] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"app" | "pages" | "vite">("app");

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeBlocks = {
    script: `<script
  src="//unpkg.com/react-grab/dist/index.global.js"
  crossorigin="anonymous"
  data-enabled="true"
></script>`,
    nextAppRouter: `import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}`,
    nextPagesRouter: `import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}`,
    vite: `import { reactGrab } from "react-grab/plugins/vite";

export default defineConfig({
  plugins: [
    reactGrab(),
  ],
});`
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "c") {
        event.preventDefault();
        if (!timeoutId) {
          setIsHolding(true);
          timeoutId = setTimeout(() => {
            setIsActivated(true);
          }, 500);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        setIsHolding(false);
        setIsActivated(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  return (
    <div
      style={{
        alignItems: "flex-start",
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
        padding: "80px 20px 20px",
      }}
    >
      <div
        style={{
          alignItems: "start",
          boxSizing: "border-box",
          contain: "layout",
          display: "flex",
          flexDirection: "column",
          gap: "17px",
          height: "fit-content",
          justifyContent: "start",
          overflowWrap: "break-word",
          paddingBlock: 0,
          paddingInline: 0,
          transformOrigin: "0% 0%",
          width: "100%",
          maxWidth: "450px",
        }}
      >
        <div
          style={{
            alignItems: "start",
            boxSizing: "border-box",
            contain: "layout",
            display: "flex",
            flexDirection: "column",
            flexShrink: "0",
            gap: "20px",
            height: "fit-content",
            justifyContent: "start",
            overflowWrap: "break-word",
            paddingBlock: 0,
            paddingInline: 0,
            transformOrigin: "50% 50%",
            width: "fit-content",
          }}
        >
          <div
            style={{
              alignItems: "start",
              boxSizing: "border-box",
              contain: "layout",
              display: "flex",
              flexDirection: "column",
              flexShrink: "0",
              gap: "6px",
              height: "fit-content",
              justifyContent: "end",
              overflowWrap: "break-word",
              paddingBlock: 0,
              paddingInline: 0,
              transformOrigin: "50% 50%",
              width: "fit-content",
            }}
          >
            <div
              style={{
                alignItems: "center",
                boxSizing: "border-box",
                contain: "layout",
                display: "flex",
                flexDirection: "row",
                flexShrink: "0",
                gap: "2px",
                height: "29px",
                justifyContent: "space-between",
                overflowWrap: "break-word",
                paddingBlock: 0,
                paddingInline: 0,
                transformOrigin: "50% 50%",
                width: "fit-content",
              }}
            >
              <div
                style={{
                  backgroundImage:
                    'url("https://workers.paper.design/file-assets/01K8B7DN5Q87ENAZCG11HMYXKQ/01K8BG8C2M5N2229GF1ZS47FGA.svg")',
                  backgroundPosition: "center center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                  boxSizing: "border-box",
                  flexShrink: "0",
                  height: "17px",
                  maxHeight: "none",
                  maxWidth: "none",
                  position: "relative",
                  transformOrigin: "50% 50%",
                  width: "17px",
                }}
              />
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#DDDDDD",
                  flexShrink: "0",
                  fontFamily:
                    '"Enduro-Medium", "Enduro Medium", system-ui, sans-serif',
                  fontSize: "16px",
                  fontSynthesis: "none",
                  fontWeight: 500,
                  height: "fit-content",
                  lineHeight: "150%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre",
                  width: "fit-content",
                }}
              >
                React Grab
              </div>
            </div>
            <div
              style={{
                alignItems: "center",
                boxSizing: "border-box",
                contain: "layout",
                display: "flex",
                flexDirection: "row",
                flexShrink: "0",
                gap: 5,
                height: "fit-content",
                justifyContent: "start",
                overflowWrap: "break-word",
                paddingBlock: 0,
                paddingInline: 0,
                transformOrigin: "50% 50%",
                width: "100%",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#9D9D9D",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "14px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  lineHeight: "150%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "nowrap",
                  width: "fit-content",
                }}
              >
                Copy elements on your app as context for
              </div>
              <div
                style={{
                  alignItems: "center",
                  boxSizing: "border-box",
                  contain: "layout",
                  display: "flex",
                  flexDirection: "row",
                  flexShrink: "0",
                  gap: "4px",
                  height: "20px",
                  justifyContent: "start",
                  overflowWrap: "break-word",
                  paddingBlock: 0,
                  paddingInline: 0,
                  transformOrigin: "50% 50%",
                  width: "fit-content",
                }}
              >
                <div
                  style={{
                    backgroundImage:
                      'url("https://workers.paper.design/file-assets/01K8B7DN5Q87ENAZCG11HMYXKQ/01K8B8K3PGH6GEC5E8RD0GJ6TE.svg")',
                    backgroundPosition: "center center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover",
                    boxSizing: "border-box",
                    flexShrink: "0",
                    height: "10px",
                    maxHeight: "none",
                    maxWidth: "none",
                    opacity: "100%",
                    position: "relative",
                    transformOrigin: "50% 50%",
                    width: "9px",
                  }}
                />
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#ECECEC",
                    flexShrink: "0",
                    fontFamily:
                      '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                    fontSize: "14px",
                    fontSynthesis: "none",
                    fontWeight: 400,
                    height: "fit-content",
                    lineHeight: "150%",
                    MozOsxFontSmoothing: "grayscale",
                    transformOrigin: "50% 50%",
                    WebkitFontSmoothing: "antialiased",
                    whiteSpace: "pre-wrap",
                    width: "100%",
                    wordBreak: "break-all",
                  }}
                >
                  Cursor,
                </div>
              </div>
              <div
                style={{
                  alignItems: "center",
                  boxSizing: "border-box",
                  contain: "layout",
                  display: "flex",
                  flexDirection: "row",
                  flexShrink: "0",
                  gap: "3px",
                  height: "20px",
                  justifyContent: "start",
                  overflowWrap: "break-word",
                  paddingBlock: 0,
                  paddingInline: 0,
                  transformOrigin: "50% 50%",
                  width: "fit-content",
                }}
              >
                <div
                  style={{
                    backgroundImage:
                      'url("https://workers.paper.design/file-assets/01K8B7DN5Q87ENAZCG11HMYXKQ/01K8B93QBHWB9G2Y6G0ZTRV539.svg")',
                    backgroundPosition: "center center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover",
                    boxSizing: "border-box",
                    flexShrink: "0",
                    height: "10px",
                    maxHeight: "none",
                    maxWidth: "none",
                    position: "relative",
                    transformOrigin: "50% 50%",
                    width: "10px",
                  }}
                />
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#ECECEC",
                    flexShrink: "0",
                    fontFamily:
                      '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                    fontSize: "14px",
                    fontSynthesis: "none",
                    fontWeight: 400,
                    height: "fit-content",
                    lineHeight: "150%",
                    MozOsxFontSmoothing: "grayscale",
                    transformOrigin: "50% 50%",
                    WebkitFontSmoothing: "antialiased",
                    whiteSpace: "pre-wrap",
                    width: "100%",
                    wordBreak: "break-all",
                  }}
                >
                  Claude,
                </div>
              </div>
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#9D9D9D",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "14px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  height: "20px",
                  lineHeight: "150%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre",
                  width: "fit-content",
                }}
              >
                etc
              </div>
            </div>
          </div>
          <div
            style={{
              alignItems: "start",
              borderColor: "#6F0064",
              borderStyle: "solid",
              borderWidth: "1px",
              boxSizing: "border-box",
              contain: "layout",
              display: "flex",
              flexDirection: "column",
              flexShrink: "0",
              gap: 0,
              height: "fit-content",
              justifyContent: "start",
              overflowWrap: "break-word",
              paddingBlock: "6px",
              paddingInline: "11px",
              transformOrigin: "50% 50%",
              width: "100%",
              maxWidth: "180px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                background: isHolding
                  ? "rgba(143, 0, 119, 0.1)"
                  : "transparent",
                border: isHolding
                  ? "0.3px solid #8F0077"
                  : "0px solid transparent",
                width: isHolding ? "100%" : "0%",
                transition: isHolding
                  ? "width 0.5s linear, border 0s"
                  : "width 0.2s ease-out, border 0s",
              }}
            />
            <div
              style={{
                alignItems: "center",
                boxSizing: "border-box",
                contain: "layout",
                display: "flex",
                flexDirection: "row",
                flexShrink: "0",
                height: "20px",
                justifyContent: "space-between",
                overflowWrap: "break-word",
                paddingBlock: 0,
                paddingInline: 0,
                transformOrigin: "50% 50%",
                width: "100%",
                position: "relative",
              }}
            >
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#FFCDF4",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "13px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  lineHeight: "150%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "nowrap",
                  width: "55px",
                }}
              >
                {isActivated ? "Click to grab" : "Activate"}
              </div>
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#FF8FEC",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "13px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  lineHeight: "150%",
                  MozOsxFontSmoothing: "grayscale",
                  opacity: 0.99,
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "nowrap",
                  width: "fit-content",
                }}
              >
                Hold ⌘C
              </div>
            </div>
          </div>
          <div
            style={{
              boxSizing: "border-box",
              color: "#9D9D9D",
              flexShrink: "0",
              fontFamily:
                '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
              fontSize: "14px",
              fontSynthesis: "none",
              fontWeight: 400,
              lineHeight: "176%",
              MozOsxFontSmoothing: "grayscale",
              transformOrigin: "50% 50%",
              WebkitFontSmoothing: "antialiased",
              whiteSpace: "pre-wrap",
              width: "100%",
              maxWidth: "402px",
            }}
          >
            By default coding agents cannot access elements on your page. React
            Grab fixes this - just point and click to provide context!
          </div>
        </div>
        <div
          style={{
            alignItems: "start",
            borderColor: "#212121",
            borderStyle: "solid",
            borderWidth: "1px",
            boxSizing: "border-box",
            contain: "layout",
            display: "flex",
            flexDirection: "row",
            flexShrink: "0",
            gap: "clamp(20px, 5vw, 67px)",
            height: "fit-content",
            justifyContent: "center",
            overflowWrap: "break-word",
            paddingBlock: "13px",
            paddingInline: "20px",
            transformOrigin: "50% 50%",
            width: "100%",
            maxWidth: "389px",
          }}
        >
          <div
            style={{
              alignItems: "start",
              boxSizing: "border-box",
              contain: "layout",
              display: "flex",
              flexDirection: "column",
              flexShrink: "0",
              gap: 0,
              height: "fit-content",
              justifyContent: "start",
              overflowWrap: "break-word",
              padding: "42px 0px 0px",
              paddingBottom: "0px",
              paddingLeft: 0,
              paddingRight: 0,
              paddingTop: "42px",
              transformOrigin: "50% 50%",
              width: "fit-content",
            }}
          >
            <div
              style={{
                alignItems: "start",
                boxSizing: "border-box",
                contain: "layout",
                display: "flex",
                flexDirection: "column",
                flexShrink: "0",
                gap: "6px",
                height: "fit-content",
                justifyContent: "center",
                overflowWrap: "break-word",
                paddingBlock: 0,
                paddingInline: 0,
                transformOrigin: "50% 50%",
                width: "fit-content",
              }}
            >
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#9D9D9D",
                  flexShrink: "0",
                  fontFamily:
                    '"EKModenaMono-Regular", "EK Modena Mono", system-ui, sans-serif',
                  fontSize: "11px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  height: "16px",
                  lineHeight: "171%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre",
                  width: "fit-content",
                }}
              >
                Agent
              </div>
              <div
                style={{
                  alignItems: "start",
                  borderColor: "#2A2A2A",
                  borderStyle: "solid",
                  borderWidth: "0.5px",
                  boxSizing: "border-box",
                  contain: "layout",
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: "0",
                  gap: 0,
                  height: "fit-content",
                  justifyContent: "start",
                  overflowWrap: "break-word",
                  paddingBlock: "4px",
                  paddingInline: "9px",
                  transformOrigin: "50% 50%",
                  width: "fit-content",
                }}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#C6C6C6",
                    flexShrink: "0",
                    fontFamily:
                      '"EKModenaMono-Regular", "EK Modena Mono", system-ui, sans-serif',
                    fontSize: "12px",
                    fontSynthesis: "none",
                    fontWeight: 400,
                    height: "20px",
                    lineHeight: "171%",
                    MozOsxFontSmoothing: "grayscale",
                    transformOrigin: "50% 50%",
                    WebkitFontSmoothing: "antialiased",
                    whiteSpace: "pre-wrap",
                    width: "100%",
                    wordBreak: "break-all",
                  }}
                >
                  Which one?
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              alignItems: "end",
              boxSizing: "border-box",
              contain: "layout",
              display: "flex",
              flexDirection: "column",
              flexShrink: "0",
              gap: "6px",
              height: "fit-content",
              justifyContent: "center",
              overflowWrap: "break-word",
              paddingBlock: 0,
              paddingInline: 0,
              transformOrigin: "50% 50%",
              width: "fit-content",
            }}
          >
            <div
              style={{
                boxSizing: "border-box",
                color: "#9D9D9D",
                flexShrink: "0",
                fontFamily:
                  '"EKModenaMono-Regular", "EK Modena Mono", system-ui, sans-serif',
                fontSize: "11px",
                fontSynthesis: "none",
                fontWeight: 400,
                height: "16px",
                lineHeight: "171%",
                MozOsxFontSmoothing: "grayscale",
                transformOrigin: "50% 50%",
                WebkitFontSmoothing: "antialiased",
                whiteSpace: "pre",
                width: "fit-content",
              }}
            >
              You
            </div>
            <div
              style={{
                alignItems: "start",
                backgroundColor: "#181818",
                boxSizing: "border-box",
                contain: "layout",
                display: "flex",
                flexDirection: "column",
                flexShrink: "0",
                gap: 0,
                height: "fit-content",
                justifyContent: "start",
                overflowWrap: "break-word",
                paddingBlock: "4px",
                paddingInline: "9px",
                transformOrigin: "50% 50%",
                width: "fit-content",
              }}
            >
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#C6C6C6",
                  flexShrink: "0",
                  fontFamily:
                    '"EKModenaMono-Regular", "EK Modena Mono", system-ui, sans-serif',
                  fontSize: "12px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  height: "20px",
                  lineHeight: "171%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre",
                  width: "fit-content",
                }}
              >
                make the button bigger!
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            alignItems: "start",
            boxSizing: "border-box",
            contain: "layout",
            display: "flex",
            flexDirection: "column",
            flexShrink: "0",
            gap: 0,
            height: "fit-content",
            justifyContent: "center",
            overflowWrap: "break-word",
            paddingBlock: 0,
            paddingInline: 0,
            transformOrigin: "50% 50%",
            width: "fit-content",
          }}
        >
          <div
            style={{
              alignItems: "center",
              boxSizing: "border-box",
              contain: "layout",
              display: "flex",
              flexDirection: "row",
              flexShrink: "0",
              gap: 4,
              height: "fit-content",
              justifyContent: "start",
              overflowWrap: "break-word",
              paddingBlock: 0,
              paddingInline: 0,
              transformOrigin: "50% 50%",
              width: "fit-content",
            }}
          >
            <div
              style={{
                boxSizing: "border-box",
                color: "#9D9D9D",
                flexShrink: "0",
                fontFamily:
                  '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                fontSize: "14px",
                fontSynthesis: "none",
                fontWeight: 400,
                height: "20px",
                lineHeight: "150%",
                MozOsxFontSmoothing: "grayscale",
                transformOrigin: "50% 50%",
                WebkitFontSmoothing: "antialiased",
                whiteSpace: "pre",
                width: "fit-content",
              }}
            >
              With
            </div>
            <div
              style={{
                alignItems: "center",
                boxSizing: "border-box",
                contain: "layout",
                display: "flex",
                flexDirection: "row",
                flexShrink: "0",
                gap: "1px",
                height: "fit-content",
                justifyContent: "start",
                overflowWrap: "break-word",
                paddingBlock: 0,
                paddingInline: 0,
                transformOrigin: "50% 50%",
                width: "fit-content",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  boxSizing: "border-box",
                  contain: "layout",
                  display: "flex",
                  flexDirection: "row",
                  flexShrink: "0",
                  height: "29px",
                  justifyContent: "space-between",
                  overflowWrap: "break-word",
                  paddingBlock: 0,
                  paddingInline: 0,
                  transformOrigin: "50% 50%",
                  width: "fit-content",
                }}
              >
                <div
                  style={{
                    backgroundImage:
                      'url("https://workers.paper.design/file-assets/01K8B7DN5Q87ENAZCG11HMYXKQ/01K8BG8C2M5N2229GF1ZS47FGA.svg")',
                    backgroundPosition: "center center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover",
                    boxSizing: "border-box",
                    flexShrink: "0",
                    height: "15px",
                    maxHeight: "none",
                    maxWidth: "none",
                    position: "relative",
                    transformOrigin: "50% 50%",
                    width: "15px",
                  }}
                />
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#DDDDDD",
                    flexShrink: "0",
                    fontFamily:
                      '"Enduro-Medium", "Enduro Medium", system-ui, sans-serif',
                    fontSize: "13.5px",
                    fontSynthesis: "none",
                    fontWeight: 500,
                    height: "fit-content",
                    lineHeight: "150%",
                    MozOsxFontSmoothing: "grayscale",
                    transformOrigin: "50% 50%",
                    WebkitFontSmoothing: "antialiased",
                    whiteSpace: "pre-wrap",
                    width: "100%",
                    wordBreak: "break-all",
                  }}
                >
                  React Grab
                </div>
              </div>
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#9D9D9D",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "14px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  height: "20px",
                  lineHeight: "150%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre",
                  width: "fit-content",
                }}
              >
                :
              </div>
            </div>
          </div>
          <div
            style={{
              boxSizing: "border-box",
              color: "#9D9D9D",
              flexShrink: "0",
              fontFamily:
                '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
              fontSize: "14px",
              fontSynthesis: "none",
              fontWeight: 400,
              lineHeight: "176%",
              MozOsxFontSmoothing: "grayscale",
              transformOrigin: "50% 50%",
              WebkitFontSmoothing: "antialiased",
              whiteSpace: "pre-wrap",
              width: "100%",
            }}
          >
            {
              "• Hold ⌘C and click to grab the element \n• Use with any tool you want: Cursor, Claude Code, OpenCode\n• Just a single script tag (it's just JavaScript!)"
            }
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "10px",
            alignItems: "center",
            marginTop: "20px",
          }}
        >
          <a
            href="https://github.com/aidenybai/react-grab"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", cursor: "pointer" }}
          >
            <div
              onMouseEnter={() => setIsHoveringButton(true)}
              onMouseLeave={() => setIsHoveringButton(false)}
              style={{
                alignItems: "center",
                backgroundColor: isHoveringButton ? "#C9C9C9" : "#DDDDDD",
                boxSizing: "border-box",
                contain: "layout",
                display: "flex",
                flexDirection: "row",
                gap: "3px",
                height: "fit-content",
                justifyContent: "start",
                overflowWrap: "break-word",
                paddingBlock: "4px",
                paddingInline: "10px",
                transformOrigin: "0% 0%",
                width: "fit-content",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
              }}
            >
              <div
                style={{
                  backgroundImage:
                    'url("https://workers.paper.design/file-assets/01K8B7DN5Q87ENAZCG11HMYXKQ/01K8BGT50758JY4WNS5DBMC8Y7.svg")',
                  backgroundPosition: "center center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                  boxSizing: "border-box",
                  flexShrink: "0",
                  height: "12px",
                  maxHeight: "none",
                  maxWidth: "none",
                  position: "relative",
                  transformOrigin: "50% 50%",
                  width: "12px",
                }}
              />
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#090909",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "13px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  lineHeight: "176%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre",
                  width: "fit-content",
                }}
              >
                View on GitHub
              </div>
            </div>
          </a>
          <a
            href="https://cursor.com/link/prompt?text=1.+Search+in+this+codebase+for+the+project%0A2.+Determine+if+the+project+is+using+Next.js+app%2Fpages+router%2C+or+Vite%2C+or+something+else%0A3.+Scrape%3A+https%3A%2F%2Fraw.githubusercontent.com%2Faidenybai%2Freact-grab%2Frefs%2Fheads%2Fmain%2FREADME.md%0A4.+Find+the+installation+instructions+in+the+scraped+content+and+install+it+in+the+user%27s+project%0A"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", cursor: "pointer" }}
          >
            <div
              onMouseEnter={() => setIsHoveringButton(true)}
              onMouseLeave={() => setIsHoveringButton(false)}
              style={{
                alignItems: "center",
                backgroundColor: isHoveringButton
                  ? "rgba(221, 221, 221, 0.1)"
                  : "transparent",
                borderColor: isHoveringButton ? "#C9C9C9" : "#9D9D9D",
                borderStyle: "solid",
                borderWidth: "1px",
                boxSizing: "border-box",
                contain: "layout",
                display: "flex",
                flexDirection: "row",
                gap: "3px",
                height: "fit-content",
                justifyContent: "start",
                overflowWrap: "break-word",
                paddingBlock: "4px",
                paddingInline: "10px",
                transformOrigin: "0% 0%",
                width: "fit-content",
                cursor: "pointer",
                transition:
                  "background-color 0.2s ease, border-color 0.2s ease",
              }}
            >
              <IconCursor width={12} height={12} />
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#DDDDDD",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "13px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  lineHeight: "176%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre",
                  width: "fit-content",
                }}
              >
                Install using Cursor
              </div>
            </div>
          </a>
        </div>
        <div
          style={{
            alignItems: "start",
            boxSizing: "border-box",
            contain: "layout",
            display: "flex",
            flexDirection: "column",
            flexShrink: "0",
            gap: "12px",
            height: "fit-content",
            justifyContent: "start",
            overflowWrap: "break-word",
            paddingBlock: 0,
            paddingInline: 0,
            transformOrigin: "50% 50%",
            width: "100%",
            marginTop: "30px",
          }}
        >
          <div
            style={{
              boxSizing: "border-box",
              color: "#DDDDDD",
              flexShrink: "0",
              fontFamily:
                '"Enduro-Medium", "Enduro Medium", system-ui, sans-serif',
              fontSize: "16px",
              fontSynthesis: "none",
              fontWeight: 500,
              lineHeight: "150%",
              MozOsxFontSmoothing: "grayscale",
              transformOrigin: "50% 50%",
              WebkitFontSmoothing: "antialiased",
              whiteSpace: "pre",
              width: "fit-content",
            }}
          >
            Install
          </div>
          <div
            style={{
              boxSizing: "border-box",
              color: "#9D9D9D",
              flexShrink: "0",
              fontFamily:
                '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
              fontSize: "14px",
              fontSynthesis: "none",
              fontWeight: 400,
              lineHeight: "176%",
              MozOsxFontSmoothing: "grayscale",
              transformOrigin: "50% 50%",
              WebkitFontSmoothing: "antialiased",
              whiteSpace: "pre-wrap",
              width: "100%",
              maxWidth: "402px",
            }}
          >
            Get started in 1 minute by adding this script tag to your app:
          </div>
          <div
            style={{
              alignItems: "start",
              backgroundColor: "#0D0D0D",
              borderColor: "#212121",
              borderStyle: "solid",
              borderWidth: "1px",
              boxSizing: "border-box",
              contain: "layout",
              display: "flex",
              flexDirection: "column",
              flexShrink: "0",
              gap: 0,
              height: "fit-content",
              justifyContent: "start",
              paddingBlock: "12px",
              paddingInline: "16px",
              transformOrigin: "50% 50%",
              width: "100%",
              maxWidth: "402px",
            }}
          >
            <div
              style={{
                boxSizing: "border-box",
                color: "#C6C6C6",
                flexShrink: "0",
                fontFamily:
                  '"EKModenaMono-Regular", "EK Modena Mono", system-ui, monospace',
                fontSize: "12px",
                fontSynthesis: "none",
                fontWeight: 400,
                lineHeight: "171%",
                MozOsxFontSmoothing: "grayscale",
                transformOrigin: "50% 50%",
                WebkitFontSmoothing: "antialiased",
                whiteSpace: "pre-wrap",
                width: "100%",
                wordBreak: "break-all",
              }}
            >
              <span style={{ color: "#9f9f9f" }}>&lt;</span>
              <span style={{ color: "#ffa0f3" }}>script</span>
              {"\n  "}
              <span style={{ color: "#ffa0f3" }}>src</span>
              <span style={{ color: "#9f9f9f" }}>=</span>
              <span style={{ color: "#99FFE4" }}>&quot;//unpkg.com/react-grab/dist/index.global.js&quot;</span>
              {"\n  "}
              <span style={{ color: "#ffa0f3" }}>crossorigin</span>
              <span style={{ color: "#9f9f9f" }}>=</span>
              <span style={{ color: "#99FFE4" }}>&quot;anonymous&quot;</span>
              {"\n  "}
              <span style={{ color: "#ffa0f3" }}>data-enabled</span>
              <span style={{ color: "#9f9f9f" }}>=</span>
              <span style={{ color: "#99FFE4" }}>&quot;true&quot;</span>
              {"\n"}
              <span style={{ color: "#9f9f9f" }}>&gt;&lt;/</span>
              <span style={{ color: "#ffa0f3" }}>script</span>
              <span style={{ color: "#9f9f9f" }}>&gt;</span>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(codeBlocks.script, 0)}
            style={{
              padding: "4px 10px",
              backgroundColor: copiedIndex === 0 ? "#2A2A2A" : "transparent",
              border: "1px solid #2A2A2A",
              color: "#9D9D9D",
              fontFamily: '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
              fontSize: "11px",
              cursor: "pointer",
              transition: "background-color 0.2s ease",
              marginTop: "4px",
            }}
            onMouseEnter={(e) => {
              if (copiedIndex !== 0) e.currentTarget.style.backgroundColor = "#2A2A2A";
            }}
            onMouseLeave={(e) => {
              if (copiedIndex !== 0) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {copiedIndex === 0 ? "Copied!" : "Copy code"}
          </button>
          <div
            style={{
              boxSizing: "border-box",
              color: "#9D9D9D",
              flexShrink: "0",
              fontFamily:
                '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
              fontSize: "14px",
              fontSynthesis: "none",
              fontWeight: 400,
              lineHeight: "176%",
              MozOsxFontSmoothing: "grayscale",
              transformOrigin: "50% 50%",
              WebkitFontSmoothing: "antialiased",
              whiteSpace: "pre-wrap",
              width: "100%",
              maxWidth: "402px",
              marginTop: "16px",
            }}
          >
            If you&apos;re using a React framework or build tool:
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "12px",
              borderBottom: "1px solid #212121",
              paddingBottom: "8px",
              width: "100%",
              maxWidth: "402px",
            }}
          >
            <button
              onClick={() => setActiveTab("app")}
              style={{
                padding: "4px 12px",
                backgroundColor: "transparent",
                border: "1px solid " + (activeTab === "app" ? "#9D9D9D" : "#2A2A2A"),
                color: activeTab === "app" ? "#DDDDDD" : "#9D9D9D",
                fontFamily: '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Next.js App
            </button>
            <button
              onClick={() => setActiveTab("pages")}
              style={{
                padding: "4px 12px",
                backgroundColor: "transparent",
                border: "1px solid " + (activeTab === "pages" ? "#9D9D9D" : "#2A2A2A"),
                color: activeTab === "pages" ? "#DDDDDD" : "#9D9D9D",
                fontFamily: '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Next.js Pages
            </button>
            <button
              onClick={() => setActiveTab("vite")}
              style={{
                padding: "4px 12px",
                backgroundColor: "transparent",
                border: "1px solid " + (activeTab === "vite" ? "#9D9D9D" : "#2A2A2A"),
                color: activeTab === "vite" ? "#DDDDDD" : "#9D9D9D",
                fontFamily: '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Vite
            </button>
          </div>
          <div
            style={{
              alignItems: "start",
              boxSizing: "border-box",
              contain: "layout",
              display: "flex",
              flexDirection: "column",
              flexShrink: "0",
              gap: "8px",
              height: "fit-content",
              justifyContent: "start",
              overflowWrap: "break-word",
              paddingBlock: 0,
              paddingInline: 0,
              transformOrigin: "50% 50%",
              width: "100%",
              maxWidth: "402px",
              marginTop: "12px",
            }}
          >
            {activeTab === "app" && (
            <>
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#DDDDDD",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "14px",
                  fontSynthesis: "none",
                  fontWeight: 500,
                  lineHeight: "150%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre",
                  width: "fit-content",
                }}
              >
                Next.js (App Router)
              </div>
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#9D9D9D",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "14px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  lineHeight: "176%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre-wrap",
                  width: "100%",
                }}
              >
                Add this inside of your app/layout.tsx:
              </div>
              <div
                style={{
                  alignItems: "start",
                  backgroundColor: "#0D0D0D",
                  borderColor: "#212121",
                  borderStyle: "solid",
                  borderWidth: "1px",
                  boxSizing: "border-box",
                  contain: "layout",
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: "0",
                  gap: 0,
                  height: "fit-content",
                  justifyContent: "start",
                  paddingBlock: "12px",
                  paddingInline: "16px",
                  transformOrigin: "50% 50%",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#C6C6C6",
                    flexShrink: "0",
                    fontFamily:
                      '"EKModenaMono-Regular", "EK Modena Mono", system-ui, monospace',
                    fontSize: "11px",
                    fontSynthesis: "none",
                    fontWeight: 400,
                    lineHeight: "171%",
                    MozOsxFontSmoothing: "grayscale",
                    transformOrigin: "50% 50%",
                    WebkitFontSmoothing: "antialiased",
                    whiteSpace: "pre-wrap",
                    width: "100%",
                    wordBreak: "break-all",
                  }}
                >
                    <span style={{ color: "#ffa0f3" }}>import</span> Script <span style={{ color: "#ffa0f3" }}>from</span> <span style={{ color: "#99FFE4" }}>&quot;next/script&quot;</span>;{"\n\n"}
                  <span style={{ color: "#ffa0f3" }}>export</span> <span style={{ color: "#ffa0f3" }}>default</span> <span style={{ color: "#ffa0f3" }}>function</span> <span style={{ color: "#FFD494" }}>RootLayout</span>{"("}{"{"} children {"}"}{") "}{"{\n"}
                  {"  "}<span style={{ color: "#ffa0f3" }}>return</span> {"(\n"}
                  {"    "}<span style={{ color: "#9f9f9f" }}>&lt;</span><span style={{ color: "#ffa0f3" }}>html</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"      "}<span style={{ color: "#9f9f9f" }}>&lt;</span><span style={{ color: "#ffa0f3" }}>head</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"        "}{"{"}<span style={{ color: "#ffa0f3" }}>process</span>.env.NODE_ENV === <span style={{ color: "#99FFE4" }}>&quot;development&quot;</span> && {"(\n"}
                  {"          "}<span style={{ color: "#9f9f9f" }}>&lt;</span><span style={{ color: "#ffa0f3" }}>Script</span>{"\n"}
                  {"            "}<span style={{ color: "#FFD494" }}>src</span>=<span style={{ color: "#99FFE4" }}>&quot;//unpkg.com/react-grab/dist/index.global.js&quot;</span>{"\n"}
                  {"            "}<span style={{ color: "#FFD494" }}>crossOrigin</span>=<span style={{ color: "#99FFE4" }}>&quot;anonymous&quot;</span>{"\n"}
                  {"            "}<span style={{ color: "#FFD494" }}>strategy</span>=<span style={{ color: "#99FFE4" }}>&quot;beforeInteractive&quot;</span>{"\n"}
                  {"            "}<span style={{ color: "#FFD494" }}>data-enabled</span>=<span style={{ color: "#99FFE4" }}>&quot;true&quot;</span>{"\n"}
                  {"          "}<span style={{ color: "#9f9f9f" }}>{"/>"}</span>{"\n"}
                  {"        "}{")"}{"}"}
                  {"\n"}
                  {"      "}<span style={{ color: "#9f9f9f" }}>&lt;/</span><span style={{ color: "#ffa0f3" }}>head</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"      "}<span style={{ color: "#9f9f9f" }}>&lt;</span><span style={{ color: "#ffa0f3" }}>body</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"{"}children{"}"}<span style={{ color: "#9f9f9f" }}>&lt;/</span><span style={{ color: "#ffa0f3" }}>body</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"    "}<span style={{ color: "#9f9f9f" }}>&lt;/</span><span style={{ color: "#ffa0f3" }}>html</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"  "}{")\n"}
                  {"}"}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(codeBlocks.nextAppRouter, 1)}
                style={{
                  padding: "4px 10px",
                  backgroundColor: copiedIndex === 1 ? "#2A2A2A" : "transparent",
                  border: "1px solid #2A2A2A",
                  color: "#9D9D9D",
                  fontFamily: '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "11px",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                  marginTop: "4px",
                }}
                onMouseEnter={(e) => {
                  if (copiedIndex !== 1) e.currentTarget.style.backgroundColor = "#2A2A2A";
                }}
                onMouseLeave={(e) => {
                  if (copiedIndex !== 1) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {copiedIndex === 1 ? "Copied!" : "Copy code"}
              </button>
            </>
            )}
            {activeTab === "pages" && (
            <>
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#DDDDDD",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "14px",
                  fontSynthesis: "none",
                  fontWeight: 500,
                  lineHeight: "150%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre",
                  width: "fit-content",
                }}
              >
                Next.js (Pages Router)
              </div>
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#9D9D9D",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "14px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  lineHeight: "176%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre-wrap",
                  width: "100%",
                }}
              >
                Add this into your pages/_document.tsx:
              </div>
              <div
                style={{
                  alignItems: "start",
                  backgroundColor: "#0D0D0D",
                  borderColor: "#212121",
                  borderStyle: "solid",
                  borderWidth: "1px",
                  boxSizing: "border-box",
                  contain: "layout",
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: "0",
                  gap: 0,
                  height: "fit-content",
                  justifyContent: "start",
                  paddingBlock: "12px",
                  paddingInline: "16px",
                  transformOrigin: "50% 50%",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#C6C6C6",
                    flexShrink: "0",
                    fontFamily:
                      '"EKModenaMono-Regular", "EK Modena Mono", system-ui, monospace',
                    fontSize: "11px",
                    fontSynthesis: "none",
                    fontWeight: 400,
                    lineHeight: "171%",
                    MozOsxFontSmoothing: "grayscale",
                    transformOrigin: "50% 50%",
                    WebkitFontSmoothing: "antialiased",
                    whiteSpace: "pre-wrap",
                    width: "100%",
                    wordBreak: "break-all",
                  }}
                >
                    <span style={{ color: "#ffa0f3" }}>import</span> {"{"} Html, Head, Main, NextScript {"}"} <span style={{ color: "#ffa0f3" }}>from</span> <span style={{ color: "#99FFE4" }}>&quot;next/document&quot;</span>;{"\n"}
                  <span style={{ color: "#ffa0f3" }}>import</span> Script <span style={{ color: "#ffa0f3" }}>from</span> <span style={{ color: "#99FFE4" }}>&quot;next/script&quot;</span>;{"\n\n"}
                  <span style={{ color: "#ffa0f3" }}>export</span> <span style={{ color: "#ffa0f3" }}>default</span> <span style={{ color: "#ffa0f3" }}>function</span> <span style={{ color: "#FFD494" }}>Document</span>{"() "}{"{\n"}
                  {"  "}<span style={{ color: "#ffa0f3" }}>return</span> {"(\n"}
                  {"    "}<span style={{ color: "#9f9f9f" }}>&lt;</span><span style={{ color: "#ffa0f3" }}>Html</span> <span style={{ color: "#FFD494" }}>lang</span>=<span style={{ color: "#99FFE4" }}>&quot;en&quot;</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"      "}<span style={{ color: "#9f9f9f" }}>&lt;</span><span style={{ color: "#ffa0f3" }}>Head</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"        "}{"{"}<span style={{ color: "#ffa0f3" }}>process</span>.env.NODE_ENV === <span style={{ color: "#99FFE4" }}>&quot;development&quot;</span> && {"(\n"}
                  {"          "}<span style={{ color: "#9f9f9f" }}>&lt;</span><span style={{ color: "#ffa0f3" }}>Script</span>{"\n"}
                  {"            "}<span style={{ color: "#FFD494" }}>src</span>=<span style={{ color: "#99FFE4" }}>&quot;//unpkg.com/react-grab/dist/index.global.js&quot;</span>{"\n"}
                  {"            "}<span style={{ color: "#FFD494" }}>crossOrigin</span>=<span style={{ color: "#99FFE4" }}>&quot;anonymous&quot;</span>{"\n"}
                  {"            "}<span style={{ color: "#FFD494" }}>strategy</span>=<span style={{ color: "#99FFE4" }}>&quot;beforeInteractive&quot;</span>{"\n"}
                  {"            "}<span style={{ color: "#FFD494" }}>data-enabled</span>=<span style={{ color: "#99FFE4" }}>&quot;true&quot;</span>{"\n"}
                  {"          "}<span style={{ color: "#9f9f9f" }}>{"/>"}</span>{"\n"}
                  {"        "}{")"}{"}"}
                  {"\n"}
                  {"      "}<span style={{ color: "#9f9f9f" }}>&lt;/</span><span style={{ color: "#ffa0f3" }}>Head</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"      "}<span style={{ color: "#9f9f9f" }}>&lt;</span><span style={{ color: "#ffa0f3" }}>body</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"        "}<span style={{ color: "#9f9f9f" }}>&lt;</span><span style={{ color: "#ffa0f3" }}>Main</span> <span style={{ color: "#9f9f9f" }}>{"/>"}</span>{"\n"}
                  {"        "}<span style={{ color: "#9f9f9f" }}>&lt;</span><span style={{ color: "#ffa0f3" }}>NextScript</span> <span style={{ color: "#9f9f9f" }}>{"/>"}</span>{"\n"}
                  {"      "}<span style={{ color: "#9f9f9f" }}>&lt;/</span><span style={{ color: "#ffa0f3" }}>body</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"    "}<span style={{ color: "#9f9f9f" }}>&lt;/</span><span style={{ color: "#ffa0f3" }}>Html</span><span style={{ color: "#9f9f9f" }}>&gt;</span>{"\n"}
                  {"  "}{")\n"}
                  {"}"}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(codeBlocks.nextPagesRouter, 2)}
                style={{
                  padding: "4px 10px",
                  backgroundColor: copiedIndex === 2 ? "#2A2A2A" : "transparent",
                  border: "1px solid #2A2A2A",
                  color: "#9D9D9D",
                  fontFamily: '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "11px",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                  marginTop: "4px",
                }}
                onMouseEnter={(e) => {
                  if (copiedIndex !== 2) e.currentTarget.style.backgroundColor = "#2A2A2A";
                }}
                onMouseLeave={(e) => {
                  if (copiedIndex !== 2) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {copiedIndex === 2 ? "Copied!" : "Copy code"}
              </button>
            </>
            )}
            {activeTab === "vite" && (
            <>
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#DDDDDD",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "14px",
                  fontSynthesis: "none",
                  fontWeight: 500,
                  lineHeight: "150%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre",
                  width: "fit-content",
                }}
              >
                Vite
              </div>
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#9D9D9D",
                  flexShrink: "0",
                  fontFamily:
                    '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "14px",
                  fontSynthesis: "none",
                  fontWeight: 400,
                  lineHeight: "176%",
                  MozOsxFontSmoothing: "grayscale",
                  transformOrigin: "50% 50%",
                  WebkitFontSmoothing: "antialiased",
                  whiteSpace: "pre-wrap",
                  width: "100%",
                }}
              >
                Run npm i react-grab@latest, then add this to your vite.config.ts:
              </div>
              <div
                style={{
                  alignItems: "start",
                  backgroundColor: "#0D0D0D",
                  borderColor: "#212121",
                  borderStyle: "solid",
                  borderWidth: "1px",
                  boxSizing: "border-box",
                  contain: "layout",
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: "0",
                  gap: 0,
                  height: "fit-content",
                  justifyContent: "start",
                  paddingBlock: "12px",
                  paddingInline: "16px",
                  transformOrigin: "50% 50%",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#C6C6C6",
                    flexShrink: "0",
                    fontFamily:
                      '"EKModenaMono-Regular", "EK Modena Mono", system-ui, monospace',
                    fontSize: "11px",
                    fontSynthesis: "none",
                    fontWeight: 400,
                    lineHeight: "171%",
                    MozOsxFontSmoothing: "grayscale",
                    transformOrigin: "50% 50%",
                    WebkitFontSmoothing: "antialiased",
                    whiteSpace: "pre-wrap",
                    width: "100%",
                    wordBreak: "break-all",
                  }}
                >
                    <span style={{ color: "#ffa0f3" }}>import</span> {"{"} reactGrab {"}"} <span style={{ color: "#ffa0f3" }}>from</span> <span style={{ color: "#99FFE4" }}>&quot;react-grab/plugins/vite&quot;</span>;{"\n\n"}
                  <span style={{ color: "#ffa0f3" }}>export</span> <span style={{ color: "#ffa0f3" }}>default</span> <span style={{ color: "#FFD494" }}>defineConfig</span>{"("}{"{\n"}
                  {"  "}plugins: {"[\n"}
                  {"    "}<span style={{ color: "#FFD494" }}>reactGrab</span>{"(),\n"}
                  {"  "}{"]\n"}
                  {"}"}{")"}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(codeBlocks.vite, 3)}
                style={{
                  padding: "4px 10px",
                  backgroundColor: copiedIndex === 3 ? "#2A2A2A" : "transparent",
                  border: "1px solid #2A2A2A",
                  color: "#9D9D9D",
                  fontFamily: '"TestDie-Grotesk-VF", "Test Die Grotesk VF", system-ui, sans-serif',
                  fontSize: "11px",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                  marginTop: "4px",
                }}
                onMouseEnter={(e) => {
                  if (copiedIndex !== 3) e.currentTarget.style.backgroundColor = "#2A2A2A";
                }}
                onMouseLeave={(e) => {
                  if (copiedIndex !== 3) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {copiedIndex === 3 ? "Copied!" : "Copy code"}
              </button>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
