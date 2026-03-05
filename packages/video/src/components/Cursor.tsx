import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { GRAB_PURPLE, VIDEO_HEIGHT_PX, VIDEO_WIDTH_PX } from "../constants";

export type CursorType = "default" | "crosshair" | "grabbing";

const CURSOR_OFFSET_PX = 5;

const DefaultCursor: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fill="none" fillRule="evenodd" transform="translate(10 7)">
      <path
        d="m6.148 18.473 1.863-1.003 1.615-.839-2.568-4.816h4.332l-11.379-11.408v16.015l3.316-3.221z"
        fill="#fff"
      />
      <path
        d="m6.431 17 1.765-.941-2.775-5.202h3.604l-8.025-8.043v11.188l2.53-2.442z"
        fill="#000"
      />
    </g>
  </svg>
);

const CrosshairCursor: React.FC = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fill="none" transform="translate(9 9)">
      <path
        d="m15 6h-6.01v-6h-2.98v6h-6.01v3h6.01v6h2.98v-6h6.01z"
        fill="#fff"
      />
      <path
        d="m13.99 7.01h-6v-6.01h-.98v6.01h-6v.98h6v6.01h.98v-6.01h6z"
        fill="#231f1f"
      />
    </g>
  </svg>
);

const GrabbingCursor: React.FC = () => {
  const frame = useCurrentFrame();
  const rotation = interpolate(frame, [0, 40], [0, 360], {
    extrapolateRight: "extend",
  });

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <defs>
        <linearGradient id="busya" x1="50%" x2="50%" y1="0%" y2="100%">
          <stop offset="0" stopColor="#4ab4ef" />
          <stop offset="1" stopColor="#3582e5" />
        </linearGradient>
        <linearGradient id="busyb" x1="50%" x2="50%" y1="0%" y2="100%">
          <stop offset="0" stopColor="#3481e4" />
          <stop offset="1" stopColor="#2051db" />
        </linearGradient>
        <linearGradient id="busyc" x1="50%" x2="50%" y1="0%" y2="100%">
          <stop offset="0" stopColor="#6bdcfc" />
          <stop offset="1" stopColor="#4dc6fa" />
        </linearGradient>
        <linearGradient id="busyd" x1="50%" x2="50%" y1="0%" y2="100%">
          <stop offset="0" stopColor="#4bc5f9" />
          <stop offset="1" stopColor="#2fb0f8" />
        </linearGradient>
        <mask id="busye" fill="#fff">
          <path
            d="m1 23c0 4.971 4.03 9 9 9 4.97 0 9-4.029 9-9 0-4.971-4.03-9-9-9-4.97 0-9 4.029-9 9z"
            fill="#fff"
            fillRule="evenodd"
          />
        </mask>
      </defs>
      <g fill="none" fillRule="evenodd" transform="translate(7)">
        <g
          mask="url(#busye)"
          style={{
            transformOrigin: "10px 23px",
            transform: `rotate(${rotation}deg)`,
          }}
        >
          <g transform="translate(1 14)">
            <path d="m0 0h9v9h-9z" fill="url(#busya)" />
            <path d="m9 9h9v9h-9z" fill="url(#busyb)" />
            <path d="m9 0h9v9h-9z" fill="url(#busyc)" />
            <path d="m0 9h9v9h-9z" fill="url(#busyd)" />
          </g>
        </g>
        <g fillRule="nonzero">
          <path
            d="m0 16.422v-16.015l11.591 11.619h-7.041l-.151.124z"
            fill="#fff"
          />
          <path
            d="m1 2.814v11.188l2.969-2.866.16-.139h5.036z"
            fill="#000"
          />
        </g>
      </g>
    </svg>
  );
};

const CursorIcon: React.FC<{ type: CursorType }> = ({ type }) => {
  if (type === "default") return <DefaultCursor />;
  if (type === "crosshair") return <CrosshairCursor />;
  if (type === "grabbing") return <GrabbingCursor />;
  return null;
};

export interface CursorProps {
  x: number;
  y: number;
  type: CursorType;
  visible: boolean;
}

export const Cursor: React.FC<CursorProps> = ({ x, y, type, visible }) => {
  const opacity = visible ? 1 : 0;

  return (
    <>
      {/* Crosshair lines — full viewport */}
      {type === "crosshair" && visible && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            pointerEvents: "none",
            opacity,
          }}
        >
          {/* Horizontal line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              width: VIDEO_WIDTH_PX,
              height: 1,
              backgroundColor: GRAB_PURPLE,
              top: y,
            }}
          />
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              height: VIDEO_HEIGHT_PX,
              width: 1,
              backgroundColor: GRAB_PURPLE,
              left: x,
            }}
          />
        </div>
      )}

      {/* Cursor icon */}
      <div
        style={{
          position: "absolute",
          zIndex: 60,
          pointerEvents: "none",
          opacity,
          left: x - CURSOR_OFFSET_PX,
          top: y - CURSOR_OFFSET_PX,
        }}
      >
        <CursorIcon type={type} />
      </div>
    </>
  );
};
