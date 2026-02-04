"use client";

import { useState, useEffect, useRef, type ReactElement } from "react";
import { cn } from "@/utils/cn";

const ANIMATION_RESTART_DELAY_MS = 200;
const SELECTION_PADDING_PX = 4;
const DRAG_PADDING_PX = 6;
const CURSOR_OFFSET_PX = 16;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface BoxState {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

const HIDDEN_BOX: BoxState = {
  visible: false,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

interface LabelState {
  visible: boolean;
  x: number;
  y: number;
  componentName: string;
  tagName: string;
}

const HIDDEN_LABEL: LabelState = {
  visible: false,
  x: 0,
  y: 0,
  componentName: "",
  tagName: "",
};

type LabelMode = "idle" | "selecting" | "grabbing" | "copied" | "fading";
type CursorType = "default" | "crosshair" | "drag" | "grabbing";

const ACTIVITY_DATA = [
  { label: "New signup", time: "2m ago", component: "SignupRow" },
  { label: "Order placed", time: "5m ago", component: "OrderRow" },
  { label: "Payment received", time: "12m ago", component: "PaymentRow" },
];

const createSelectionBox = (position: Position, padding: number): BoxState => ({
  visible: true,
  x: position.x - padding,
  y: position.y - padding,
  width: position.width + padding * 2,
  height: position.height + padding * 2,
});

const getElementCenter = (position: Position): { x: number; y: number } => ({
  x: position.x + position.width / 2,
  y: position.y + position.height / 2,
});

const CheckIcon = (): ReactElement => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 21 21"
    fill="none"
    className="shrink-0 text-black/85"
  >
    <path
      d="M20.1767 10.0875C20.1767 15.6478 15.6576 20.175 10.0875 20.175C4.52715 20.175 0 15.6478 0 10.0875C0 4.51914 4.52715 0 10.0875 0C15.6576 0 20.1767 4.51914 20.1767 10.0875ZM13.0051 6.23867L8.96699 12.7041L7.08476 10.3143C6.83358 9.99199 6.59941 9.88828 6.28984 9.88828C5.79414 9.88828 5.39961 10.2918 5.39961 10.7893C5.39961 11.0367 5.48925 11.2621 5.66386 11.4855L8.05703 14.3967C8.33027 14.7508 8.63183 14.9103 8.99902 14.9103C9.36445 14.9103 9.68105 14.7312 9.90546 14.3896L14.4742 7.27206C14.6107 7.04765 14.7289 6.80898 14.7289 6.58359C14.7289 6.07187 14.281 5.72968 13.7934 5.72968C13.4937 5.72968 13.217 5.90527 13.0051 6.23867Z"
      fill="currentColor"
    />
  </svg>
);

const LoaderIcon = (): ReactElement => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 text-[#71717a]"
  >
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "0ms" }}
      d="M12 2v4"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-42ms" }}
      d="M15 6.8l2-3.5"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-83ms" }}
      d="M17.2 9l3.5-2"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-125ms" }}
      d="M18 12h4"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-167ms" }}
      d="M17.2 15l3.5 2"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-208ms" }}
      d="M15 17.2l2 3.5"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-250ms" }}
      d="M12 18v4"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-292ms" }}
      d="M9 17.2l-2 3.5"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-333ms" }}
      d="M6.8 15l-3.5 2"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-375ms" }}
      d="M2 12h4"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-417ms" }}
      d="M6.8 9l-3.5-2"
    />
    <path
      className="animate-loader-bar"
      style={{ animationDelay: "-458ms" }}
      d="M9 6.8l-2-3.5"
    />
  </svg>
);

const DefaultCursor = (): ReactElement => (
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

const CrosshairCursor = (): ReactElement => (
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

const GrabbingCursor = (): ReactElement => (
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
      <g mask="url(#busye)" className="origin-[10px_23px] animate-spin">
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
        <path d="m1 2.814v11.188l2.969-2.866.16-.139h5.036z" fill="#000" />
      </g>
    </g>
  </svg>
);

const CursorIcon = ({ type }: { type: CursorType }): ReactElement | null => {
  if (type === "default") return <DefaultCursor />;
  if (type === "crosshair" || type === "drag") return <CrosshairCursor />;
  if (type === "grabbing") return <GrabbingCursor />;
  return null;
};

export const MobileDemoAnimation = (): ReactElement => {
  const [cursorPos, setCursorPos] = useState({ x: 150, y: 80 });
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  const [selectionBox, setSelectionBox] = useState<BoxState>(HIDDEN_BOX);
  const [dragBox, setDragBox] = useState<BoxState>(HIDDEN_BOX);
  const [isDragging, setIsDragging] = useState(false);
  const [successFlash, setSuccessFlash] = useState<BoxState>(HIDDEN_BOX);
  const [label, setLabel] = useState<LabelState>(HIDDEN_LABEL);
  const [labelMode, setLabelMode] = useState<LabelMode>("idle");
  const [cursorType, setCursorType] = useState<CursorType>("default");

  const containerRef = useRef<HTMLDivElement>(null);
  const metricCardRef = useRef<HTMLDivElement>(null);
  const metricValueRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLDivElement>(null);
  const activityRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const metricCardPosition = useRef<Position>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const metricValuePosition = useRef<Position>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const exportButtonPosition = useRef<Position>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const activityRowPositions = useRef<Position[]>([]);

  const measureElementPositions = (): void => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    const measureRelativePosition = (
      element: HTMLElement | null,
      positionRef: React.MutableRefObject<Position>,
    ): void => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      positionRef.current = {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      };
    };

    measureRelativePosition(metricCardRef.current, metricCardPosition);
    measureRelativePosition(metricValueRef.current, metricValuePosition);
    measureRelativePosition(exportButtonRef.current, exportButtonPosition);

    activityRowPositions.current = activityRowRefs.current
      .filter((ref): ref is HTMLDivElement => ref !== null)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        };
      });
  };

  useEffect(() => {
    const measurementTimer = setTimeout(measureElementPositions, 100);
    window.addEventListener("resize", measureElementPositions);
    return () => {
      clearTimeout(measurementTimer);
      window.removeEventListener("resize", measureElementPositions);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const resetAnimationState = (): void => {
      setCursorPos({ x: 150, y: 80 });
      setIsCursorVisible(false);
      setCursorType("default");
      setSelectionBox(HIDDEN_BOX);
      setDragBox(HIDDEN_BOX);
      setIsDragging(false);
      setSuccessFlash(HIDDEN_BOX);
      setLabel(HIDDEN_LABEL);
      setLabelMode("idle");
    };

    const displaySelectionLabel = (
      x: number,
      y: number,
      componentName: string,
      tagName: string,
    ): void => {
      setLabel({ visible: true, x, y, componentName, tagName });
      setLabelMode("selecting");
    };

    const fadeOutSelectionLabel = async (): Promise<void> => {
      setLabelMode("fading");
      await wait(300);
      setLabel(HIDDEN_LABEL);
      setLabelMode("idle");
    };

    const simulateClickAndCopy = async (position: Position): Promise<void> => {
      setSelectionBox(HIDDEN_BOX);
      setLabelMode("grabbing");
      setCursorType("grabbing");
      setSuccessFlash(createSelectionBox(position, SELECTION_PADDING_PX));
      await wait(400);
      if (isCancelled) return;

      setLabelMode("copied");
      await wait(500);
      if (isCancelled) return;

      setSuccessFlash(HIDDEN_BOX);
      await fadeOutSelectionLabel();
      setCursorType("crosshair");
    };

    const animateDragSelection = async (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
    ): Promise<void> => {
      const dragSteps = 14;
      for (let step = 1; step <= dragSteps; step++) {
        if (isCancelled) return;
        const progress = step / dragSteps;
        const currentX = startX + (endX - startX) * progress;
        const currentY = startY + (endY - startY) * progress;
        setCursorPos({ x: currentX, y: currentY });
        setDragBox({
          visible: true,
          x: startX,
          y: startY,
          width: currentX - startX,
          height: currentY - startY,
        });
        await wait(30);
      }
    };

    const executeAnimationSequence = async (): Promise<void> => {
      resetAnimationState();
      measureElementPositions();

      if (isCancelled) return;
      await wait(500);
      if (isCancelled) return;

      setIsCursorVisible(true);
      setCursorType("crosshair");
      await wait(300);
      if (isCancelled) return;

      const buttonPos = exportButtonPosition.current;
      const buttonCenter = getElementCenter(buttonPos);
      setCursorPos(buttonCenter);
      await wait(450);
      if (isCancelled) return;

      setSelectionBox(createSelectionBox(buttonPos, SELECTION_PADDING_PX));
      displaySelectionLabel(
        buttonCenter.x,
        buttonPos.y + buttonPos.height + 10,
        "ExportBtn",
        "button",
      );
      await wait(600);
      if (isCancelled) return;

      await simulateClickAndCopy(buttonPos);
      await wait(300);
      if (isCancelled) return;

      const cardPos = metricCardPosition.current;
      const dragStartX = cardPos.x - DRAG_PADDING_PX;
      const dragStartY = cardPos.y - DRAG_PADDING_PX;
      const dragEndX = cardPos.x + cardPos.width + DRAG_PADDING_PX;
      const dragEndY = cardPos.y + cardPos.height + DRAG_PADDING_PX;

      setCursorPos({ x: dragStartX, y: dragStartY });
      await wait(500);
      if (isCancelled) return;

      setIsDragging(true);
      setCursorType("drag");
      setDragBox({
        visible: true,
        x: dragStartX,
        y: dragStartY,
        width: 0,
        height: 0,
      });
      await animateDragSelection(dragStartX, dragStartY, dragEndX, dragEndY);
      if (isCancelled) return;
      await wait(200);
      if (isCancelled) return;

      setIsDragging(false);
      setDragBox(HIDDEN_BOX);
      setCursorType("grabbing");
      setSuccessFlash(createSelectionBox(cardPos, SELECTION_PADDING_PX));
      displaySelectionLabel(
        cardPos.x + cardPos.width / 2,
        cardPos.y - 10,
        "MetricCard",
        "div",
      );
      setLabelMode("grabbing");
      await wait(500);
      if (isCancelled) return;

      setLabelMode("copied");
      await wait(500);
      if (isCancelled) return;

      setSuccessFlash(HIDDEN_BOX);
      await fadeOutSelectionLabel();
      setCursorType("crosshair");
      await wait(300);
      if (isCancelled) return;

      const valuePos = metricValuePosition.current;
      const valueCenter = getElementCenter(valuePos);
      setCursorPos(valueCenter);
      await wait(500);
      if (isCancelled) return;

      setSelectionBox(createSelectionBox(valuePos, SELECTION_PADDING_PX));
      displaySelectionLabel(
        valuePos.x + valuePos.width + 10,
        valueCenter.y - 10,
        "StatValue",
        "span",
      );
      await wait(600);
      if (isCancelled) return;

      await simulateClickAndCopy(valuePos);
      if (isCancelled) return;

      // Animate through table rows
      for (let i = 0; i < activityRowPositions.current.length; i++) {
        if (isCancelled) return;
        const rowPos = activityRowPositions.current[i];
        if (!rowPos) continue;

        const rowCenter = getElementCenter(rowPos);
        setCursorPos(rowCenter);
        await wait(350);
        if (isCancelled) return;

        setSelectionBox(createSelectionBox(rowPos, SELECTION_PADDING_PX));
        displaySelectionLabel(
          rowPos.x + rowPos.width / 2,
          rowPos.y + rowPos.height + 10,
          ACTIVITY_DATA[i]?.component ?? "TableRow",
          "div",
        );
        await wait(400);
        if (isCancelled) return;

        await simulateClickAndCopy(rowPos);
        if (isCancelled) return;
      }

      setIsCursorVisible(false);
      setCursorType("default");
      await wait(ANIMATION_RESTART_DELAY_MS);
    };

    const runAnimationLoop = async (): Promise<void> => {
      while (!isCancelled) {
        await executeAnimationSequence();
      }
    };

    const initializeAnimationLoop = (): void => {
      isCancelled = false;
      runAnimationLoop();
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        isCancelled = true;
        resetAnimationState();
        setTimeout(initializeAnimationLoop, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    initializeAnimationLoop();

    return () => {
      isCancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const isLabelVisible = label.visible && labelMode !== "fading";

  return (
    <div className="mt-3">
      <style>{`
        @keyframes loader-bar {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 0.2; }
        }
        .animate-loader-bar {
          animation: loader-bar 0.5s linear infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #818181 0%, #818181 35%, #ffffff 50%, #818181 65%, #818181 100%);
          background-size: 150% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer 1s ease-in-out infinite;
        }
      `}</style>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-lg shadow-black/20">
        <div ref={containerRef} className="relative p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-white">
                Overview
              </div>
              <div className="text-[11px] text-white/40">Last 30 days</div>
            </div>
            <div
              ref={exportButtonRef}
              className="rounded-md bg-white/20 px-3 py-1.5 text-[11px] font-medium text-white/70"
            >
              Export
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <div
              ref={metricCardRef}
              className="rounded-lg border border-white/10 bg-white/5 p-2.5"
            >
              <div className="mb-1 text-[10px] font-medium text-white/50">
                Revenue
              </div>
              <div
                ref={metricValueRef}
                className="text-[18px] font-semibold tabular-nums text-white"
              >
                $12.4k
              </div>
              <div className="mt-1 text-[10px] text-white/50">+12.5%</div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="mb-1 text-[10px] font-medium text-white/50">
                Users
              </div>
              <div className="text-[18px] font-semibold tabular-nums text-white">
                2,847
              </div>
              <div className="mt-1 text-[10px] text-white/50">+8.2%</div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="mb-1 text-[10px] font-medium text-white/50">
                Orders
              </div>
              <div className="text-[18px] font-semibold tabular-nums text-white">
                384
              </div>
              <div className="mt-1 text-[10px] text-white/50">-2.1%</div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10">
            <div className="border-b border-white/10 px-3 py-2">
              <div className="text-[11px] font-medium text-white/70">
                Recent Activity
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {ACTIVITY_DATA.map((activity, index) => (
                <div
                  key={activity.label}
                  ref={(el) => {
                    activityRowRefs.current[index] = el;
                  }}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-white/10" />
                    <span className="text-[11px] text-white/70">
                      {activity.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-50 transition-opacity duration-200",
              cursorType === "crosshair" ? "opacity-100" : "opacity-0",
            )}
          >
            <div
              className="absolute left-0 right-0 h-px bg-[#d239c0]"
              style={{ top: cursorPos.y }}
            />
            <div
              className="absolute bottom-0 top-0 w-px bg-[#d239c0]"
              style={{ left: cursorPos.x }}
            />
          </div>

          <div
            className={cn(
              "pointer-events-none absolute z-60 transition-opacity duration-200",
              isCursorVisible ? "opacity-100" : "opacity-0",
            )}
            style={{
              left: cursorPos.x - CURSOR_OFFSET_PX,
              top: cursorPos.y - CURSOR_OFFSET_PX,
            }}
          >
            <CursorIcon type={cursorType} />
          </div>

          <div
            className={cn(
              "pointer-events-none absolute z-40 rounded-lg border-2 border-[#d239c0]/50 bg-[#d239c0]/8 transition-[opacity,transform] duration-150",
              selectionBox.visible
                ? "scale-100 opacity-100"
                : "scale-[0.98] opacity-0",
            )}
            style={{
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height,
            }}
          />

          {dragBox.visible && (
            <div
              className="pointer-events-none absolute z-45 rounded-md border-[1.5px] border-dashed border-[#d239c0]/40 bg-[#d239c0]/5"
              style={{
                left: dragBox.x,
                top: dragBox.y,
                width: dragBox.width,
                height: dragBox.height,
              }}
            />
          )}

          <div
            className={cn(
              "pointer-events-none absolute z-42 rounded-lg border-2 border-[#d239c0] bg-[#d239c0]/15 transition-[opacity,transform] duration-200",
              successFlash.visible
                ? "scale-100 opacity-100"
                : "scale-[1.02] opacity-0",
            )}
            style={{
              left: successFlash.x,
              top: successFlash.y,
              width: successFlash.width,
              height: successFlash.height,
            }}
          />

          <div
            className={cn(
              "pointer-events-none absolute z-55 flex items-center gap-[5px] rounded-[10px] bg-white py-1.5 px-2 shadow-[0_1px_2px_#51515140] transition-[opacity,transform] duration-300 ease-out",
              isLabelVisible ? "scale-100 opacity-100" : "scale-95 opacity-0",
            )}
            style={{
              left: label.x,
              top: label.y,
              transform: "translateX(-50%)",
            }}
          >
            {labelMode === "selecting" && (
              <>
                <span className="text-[13px] leading-4 font-medium text-black">
                  {label.componentName}
                </span>
                <span className="text-[13px] leading-4 font-medium text-black/50">
                  .{label.tagName}
                </span>
              </>
            )}
            {labelMode === "grabbing" && (
              <>
                <LoaderIcon />
                <span className="shimmer-text text-[13px] leading-4 font-medium">
                  Grabbing…
                </span>
              </>
            )}
            {(labelMode === "copied" || labelMode === "fading") && (
              <>
                <CheckIcon />
                <span className="text-[13px] leading-4 font-medium text-black">
                  Copied
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-1.5 text-sm text-white/30">
        This website is best viewed on desktop
      </p>
    </div>
  );
};
