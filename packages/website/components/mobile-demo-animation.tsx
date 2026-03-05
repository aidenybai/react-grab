"use client";

import { useState, useEffect, useRef, useCallback, type ReactElement } from "react";
import { useWebHaptics } from "web-haptics/react";
import { cn } from "@/utils/cn";
import {
  VIBRATION_DURATION_MS,
  TAP_FEEDBACK_DISPLAY_MS,
  TAP_FEEDBACK_FADE_MS,
  LABEL_OFFSET_BELOW_PX,
  ANIMATION_RESTART_DELAY_MS,
  SELECTION_PADDING_PX,
  CURSOR_OFFSET_PX,
  HINT_OVERLAY_DELAY_MS,
} from "@/constants";

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BoxState extends Position {
  visible: boolean;
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

type LabelMode =
  | "idle"
  | "selecting"
  | "grabbing"
  | "copied"
  | "commenting"
  | "submitted"
  | "fading";
type CursorType = "default" | "crosshair" | "grabbing";

interface HitElement {
  position: Position;
  name: string;
  tag: string;
}

const METRIC_CARD_NAMES = ["RevenueCard", "UsersCard", "OrdersCard"];

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

const INITIAL_CURSOR_POSITION = { x: 150, y: 80 };

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

const SubmitIcon = (): ReactElement => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    className="shrink-0 text-white"
  >
    <path
      d="M12 19V5M5 12l7-7 7 7"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
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
  if (type === "crosshair") return <CrosshairCursor />;
  if (type === "grabbing") return <GrabbingCursor />;
  return null;
};

export const MobileDemoAnimation = (): ReactElement => {
  const { trigger: triggerHaptic } = useWebHaptics();
  const [cursorPos, setCursorPos] = useState(INITIAL_CURSOR_POSITION);
  const [isCursorVisible, setIsCursorVisible] = useState(false);
  const [selectionBox, setSelectionBox] = useState<BoxState>(HIDDEN_BOX);
  const [successFlash, setSuccessFlash] = useState<BoxState>(HIDDEN_BOX);
  const [label, setLabel] = useState<LabelState>(HIDDEN_LABEL);
  const [labelMode, setLabelMode] = useState<LabelMode>("idle");
  const [cursorType, setCursorType] = useState<CursorType>("default");
  const [commentText, setCommentText] = useState("");
  const [isHintVisible, setIsHintVisible] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const metricCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const metricValueRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLDivElement>(null);
  const activityRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isCancelledRef = useRef(false);
  const animationLoopRef = useRef<(() => void) | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimerInnerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const metricCardPositions = useRef<(Position | null)[]>([]);
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
  const activityRowPositions = useRef<(Position | null)[]>([]);

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

    measureRelativePosition(metricValueRef.current, metricValuePosition);
    measureRelativePosition(exportButtonRef.current, exportButtonPosition);

    const measureRefArray = (
      refs: (HTMLElement | null)[],
    ): (Position | null)[] =>
      refs.map((ref) => {
        if (!ref) return null;
        const rect = ref.getBoundingClientRect();
        return {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        };
      });

    metricCardPositions.current = measureRefArray(metricCardRefs.current);
    activityRowPositions.current = measureRefArray(activityRowRefs.current);
  };

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const measurementTimer = setTimeout(measureElementPositions, 100);
    window.addEventListener("resize", measureElementPositions);
    visualViewport?.addEventListener("resize", measureElementPositions);
    visualViewport?.addEventListener("scroll", measureElementPositions);
    return () => {
      clearTimeout(measurementTimer);
      window.removeEventListener("resize", measureElementPositions);
      visualViewport?.removeEventListener("resize", measureElementPositions);
      visualViewport?.removeEventListener("scroll", measureElementPositions);
    };
  }, []);

  useEffect(() => {
    hintTimerRef.current = setTimeout(() => {
      setIsHintVisible(true);
    }, HINT_OVERLAY_DELAY_MS);
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  const resetAnimationState = useCallback((): void => {
    setCursorPos(INITIAL_CURSOR_POSITION);
    setIsCursorVisible(false);
    setCursorType("default");
    setSelectionBox(HIDDEN_BOX);
    setSuccessFlash(HIDDEN_BOX);
    setLabel(HIDDEN_LABEL);
    setLabelMode("idle");
    setCommentText("");
  }, []);

  useEffect(() => {
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
      if (isCancelledRef.current) return;

      setLabelMode("copied");
      await wait(500);
      if (isCancelledRef.current) return;

      setSuccessFlash(HIDDEN_BOX);
      await fadeOutSelectionLabel();
      setCursorType("crosshair");
    };

    const simulateComment = async (
      position: Position,
      comment: string,
    ): Promise<void> => {
      await wait(300);
      if (isCancelledRef.current) return;

      setLabelMode("commenting");
      setCommentText("");
      await wait(200);
      if (isCancelledRef.current) return;

      for (let charIndex = 0; charIndex <= comment.length; charIndex++) {
        if (isCancelledRef.current) return;
        setCommentText(comment.slice(0, charIndex));
        await wait(50);
      }
      await wait(300);
      if (isCancelledRef.current) return;

      setLabelMode("submitted");
      setSuccessFlash(createSelectionBox(position, SELECTION_PADDING_PX));
      await wait(500);
      if (isCancelledRef.current) return;

      setSuccessFlash(HIDDEN_BOX);
      setSelectionBox(HIDDEN_BOX);
      await fadeOutSelectionLabel();
      setCommentText("");
    };

    const executeAnimationSequence = async (): Promise<void> => {
      resetAnimationState();
      measureElementPositions();

      if (isCancelledRef.current) return;
      await wait(500);
      if (isCancelledRef.current) return;

      setIsCursorVisible(true);
      setCursorType("crosshair");
      await wait(300);
      if (isCancelledRef.current) return;

      const buttonPos = exportButtonPosition.current;
      const buttonCenter = getElementCenter(buttonPos);
      setCursorPos(buttonCenter);
      await wait(400);
      if (isCancelledRef.current) return;

      setSelectionBox(createSelectionBox(buttonPos, SELECTION_PADDING_PX));
      displaySelectionLabel(
        buttonCenter.x,
        buttonPos.y + buttonPos.height + LABEL_OFFSET_BELOW_PX,
        "ExportBtn",
        "button",
      );
      await simulateClickAndCopy(buttonPos);
      if (isCancelledRef.current) return;

      const cardPos = metricCardPositions.current[0];
      if (!cardPos) return;
      const cardCenter = getElementCenter(cardPos);
      setCursorPos(cardCenter);
      await wait(400);
      if (isCancelledRef.current) return;

      setSelectionBox(createSelectionBox(cardPos, SELECTION_PADDING_PX));
      displaySelectionLabel(
        cardPos.x + cardPos.width / 2,
        cardPos.y + cardPos.height + LABEL_OFFSET_BELOW_PX,
        "MetricCard",
        "div",
      );
      await simulateComment(cardPos, "show graph");
      if (isCancelledRef.current) return;

      const valuePos = metricValuePosition.current;
      const valueCenter = getElementCenter(valuePos);
      setCursorPos(valueCenter);
      await wait(400);
      if (isCancelledRef.current) return;

      setSelectionBox(createSelectionBox(valuePos, SELECTION_PADDING_PX));
      displaySelectionLabel(
        valuePos.x + valuePos.width / 2,
        valuePos.y + valuePos.height + LABEL_OFFSET_BELOW_PX,
        "StatValue",
        "span",
      );
      await simulateComment(valuePos, "format as USD");
      if (isCancelledRef.current) return;

      const signupRowPos = activityRowPositions.current[0];
      if (signupRowPos) {
        const signupCenter = getElementCenter(signupRowPos);
        setCursorPos(signupCenter);
        await wait(400);
        if (isCancelledRef.current) return;

        setSelectionBox(createSelectionBox(signupRowPos, SELECTION_PADDING_PX));
        displaySelectionLabel(
          signupCenter.x,
          signupRowPos.y + signupRowPos.height + LABEL_OFFSET_BELOW_PX,
          "SignupRow",
          "div",
        );
        await simulateComment(signupRowPos, "add avatar");
        if (isCancelledRef.current) return;
      }

      const orderRowPos = activityRowPositions.current[1];
      if (orderRowPos) {
        const orderCenter = getElementCenter(orderRowPos);
        setCursorPos(orderCenter);
        await wait(400);
        if (isCancelledRef.current) return;

        setSelectionBox(createSelectionBox(orderRowPos, SELECTION_PADDING_PX));
        displaySelectionLabel(
          orderCenter.x,
          orderRowPos.y + orderRowPos.height + LABEL_OFFSET_BELOW_PX,
          "OrderRow",
          "div",
        );
        await wait(400);
        if (isCancelledRef.current) return;

        await simulateClickAndCopy(orderRowPos);
        if (isCancelledRef.current) return;
      }

      setIsCursorVisible(false);
      setCursorType("default");
      await wait(ANIMATION_RESTART_DELAY_MS);
    };

    const runAnimationLoop = async (): Promise<void> => {
      while (!isCancelledRef.current) {
        await executeAnimationSequence();
      }
    };

    animationLoopRef.current = () => {
      isCancelledRef.current = false;
      runAnimationLoop();
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        isCancelledRef.current = true;
        resetAnimationState();
        isCancelledRef.current = false;
        runAnimationLoop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    isCancelledRef.current = false;
    runAnimationLoop();

    return () => {
      isCancelledRef.current = true;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (tapTimerInnerRef.current) clearTimeout(tapTimerInnerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resetAnimationState]);

  const handleTap = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (tapTimerInnerRef.current) clearTimeout(tapTimerInnerRef.current);
      isCancelledRef.current = true;

      triggerHaptic(VIBRATION_DURATION_MS);

      setIsCursorVisible(false);
      setIsHintVisible(false);
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
      setCursorType("default");
      setCommentText("");

      const containerRect = container.getBoundingClientRect();
      const tapX = event.clientX - containerRect.left;
      const tapY = event.clientY - containerRect.top;

      const distanceToPosition = (position: Position): number => {
        const clampedX = Math.max(position.x, Math.min(tapX, position.x + position.width));
        const clampedY = Math.max(position.y, Math.min(tapY, position.y + position.height));
        return Math.hypot(tapX - clampedX, tapY - clampedY);
      };

      const allElements: HitElement[] = [
        { position: exportButtonPosition.current, name: "ExportBtn", tag: "button" },
        { position: metricValuePosition.current, name: "StatValue", tag: "span" },
        ...metricCardPositions.current
          .map((cardPosition, index) =>
            cardPosition
              ? { position: cardPosition, name: METRIC_CARD_NAMES[index], tag: "div" }
              : null,
          )
          .filter((element): element is HitElement => element !== null),
        ...activityRowPositions.current
          .map((rowPosition, index) =>
            rowPosition
              ? { position: rowPosition, name: ACTIVITY_DATA[index].component, tag: "div" }
              : null,
          )
          .filter((element): element is HitElement => element !== null),
      ];

      let closestElement = allElements[0];
      let closestDistance = distanceToPosition(closestElement.position);

      const areaOf = (position: Position): number => position.width * position.height;

      for (let index = 1; index < allElements.length; index++) {
        const distance = distanceToPosition(allElements[index].position);
        const isSameDistance = distance === closestDistance;
        const isSmallerElement = isSameDistance && areaOf(allElements[index].position) < areaOf(closestElement.position);
        if (distance < closestDistance || isSmallerElement) {
          closestDistance = distance;
          closestElement = allElements[index];
        }
      }

      const targetPosition = closestElement.position;
      const labelX = getElementCenter(targetPosition).x;
      const labelY = targetPosition.y + targetPosition.height + LABEL_OFFSET_BELOW_PX;
      const selectionBounds = createSelectionBox(targetPosition, SELECTION_PADDING_PX);

      setSelectionBox(selectionBounds);
      setSuccessFlash(selectionBounds);
      setLabel({
        visible: true,
        x: labelX,
        y: labelY,
        componentName: closestElement.name,
        tagName: closestElement.tag,
      });
      setLabelMode("copied");

      tapTimerRef.current = setTimeout(() => {
        if (isCancelledRef.current) {
          setLabelMode("fading");
          setSuccessFlash(HIDDEN_BOX);

          tapTimerInnerRef.current = setTimeout(() => {
            setSelectionBox(HIDDEN_BOX);
            setLabel(HIDDEN_LABEL);
            setLabelMode("idle");
          }, TAP_FEEDBACK_FADE_MS);
        }
      }, TAP_FEEDBACK_DISPLAY_MS);
    },
    [triggerHaptic],
  );

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

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/20">
        <div ref={containerRef} onClick={handleTap} className="relative p-4 pb-14">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-foreground">
                Overview
              </div>
              <div className="text-[11px] text-muted-foreground">Last 30 days</div>
            </div>
            <div
              ref={exportButtonRef}
              className="rounded-md bg-muted px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
            >
              Export
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <div
              ref={(el) => { metricCardRefs.current[0] = el; }}
              className="rounded-lg border border-border bg-muted/50 p-2.5"
            >
              <div className="mb-1 text-[10px] font-medium text-muted-foreground">
                Revenue
              </div>
              <div
                ref={metricValueRef}
                className="text-[18px] font-semibold tabular-nums text-foreground"
              >
                $12.4k
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">+12.5%</div>
            </div>

            <div
              ref={(el) => { metricCardRefs.current[1] = el; }}
              className="rounded-lg border border-border bg-muted/50 p-2.5"
            >
              <div className="mb-1 text-[10px] font-medium text-muted-foreground">
                Users
              </div>
              <div className="text-[18px] font-semibold tabular-nums text-foreground">
                2,847
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">+8.2%</div>
            </div>

            <div
              ref={(el) => { metricCardRefs.current[2] = el; }}
              className="rounded-lg border border-border bg-muted/50 p-2.5"
            >
              <div className="mb-1 text-[10px] font-medium text-muted-foreground">
                Orders
              </div>
              <div className="text-[18px] font-semibold tabular-nums text-foreground">
                384
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">-2.1%</div>
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-3 py-2">
              <div className="text-[11px] font-medium text-muted-foreground">
                Recent Activity
              </div>
            </div>
            <div className="divide-y divide-border">
              {ACTIVITY_DATA.map((activity, activityIndex) => (
                <div
                  key={activity.label}
                  ref={(el) => {
                    activityRowRefs.current[activityIndex] = el;
                  }}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-muted/50" />
                    <span className="text-[11px] text-muted-foreground">
                      {activity.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-[70] flex items-center justify-center bg-gradient-to-t from-card via-card/90 to-card/0 pb-3 pt-8 transition-opacity duration-700",
              isHintVisible ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            <span className="rounded-full bg-foreground/10 px-3 py-1.5 text-[12px] font-medium text-muted-foreground">
              👆 Tap any element to copy
            </span>
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
              "pointer-events-none absolute z-55 rounded-[10px] bg-white shadow-[0_1px_2px_#51515140] transition-[opacity,transform] duration-300 ease-out",
              isLabelVisible ? "scale-100 opacity-100" : "scale-95 opacity-0",
            )}
            style={{
              left: label.x,
              top: label.y,
              transform: "translateX(-50%)",
            }}
          >
            <div
              className="absolute left-1/2 h-0 w-0 -translate-x-1/2"
              style={{
                top: -5,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderBottom: "5px solid white",
              }}
            />
            {labelMode === "selecting" && (
              <div className="flex items-center py-1.5 px-2">
                <span className="text-[13px] leading-4 font-medium text-black">
                  {label.componentName}
                </span>
                <span className="text-[13px] leading-4 font-medium text-black/50">
                  .{label.tagName}
                </span>
              </div>
            )}
            {labelMode === "grabbing" && (
              <div className="flex items-center gap-[5px] py-1.5 px-2">
                <LoaderIcon />
                <span className="shimmer-text text-[13px] leading-4 font-medium">
                  Grabbing…
                </span>
              </div>
            )}
            {(labelMode === "copied" || labelMode === "submitted" || labelMode === "fading") && (
              <div className="flex items-center gap-[5px] py-1.5 px-2">
                <CheckIcon />
                <span className="text-[13px] leading-4 font-medium text-black">
                  Copied
                </span>
              </div>
            )}
            {labelMode === "commenting" && (
              <div className="flex flex-col min-w-[140px]">
                <div className="flex items-center pt-1.5 pb-1 px-2">
                  <span className="text-[13px] leading-4 font-medium text-black">
                    {label.componentName}
                  </span>
                  <span className="text-[13px] leading-4 font-medium text-black/50">
                    .{label.tagName}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-2 px-2 pb-1.5 border-t border-black/5 pt-1">
                  <span
                    className={cn(
                      "text-[13px] leading-4 font-medium",
                      commentText ? "text-black" : "text-black/40",
                    )}
                  >
                    {commentText || "Add context"}
                  </span>
                  <div className="shrink-0 flex items-center justify-center size-4 rounded-full bg-black">
                    <SubmitIcon />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-1.5 text-sm text-muted-foreground/60">
        This website is best viewed on desktop
      </p>
    </div>
  );
};
