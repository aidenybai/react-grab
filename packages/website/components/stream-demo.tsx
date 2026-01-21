"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { TriangleAlert } from "lucide-react";
import {
  DEFAULT_CHUNK_SIZE,
  STREAM_DEMO_BLOCK_DELAY_MS,
  STREAM_DEMO_CHUNK_DELAY_MS,
  STREAM_DEMO_PRELOAD_ANIMATION_DELAY_MULTIPLIER,
} from "@/constants";
import {
  useStream,
  type StreamBlock,
  type StreamRenderedBlock,
} from "@/hooks/use-stream";
import { detectMobile } from "@/utils/detect-mobile";
import { BenchmarkTooltip } from "./benchmark-tooltip";
import { ThoughtBlock } from "./blocks/thought-block";
import { MessageBlock } from "./blocks/message-block";
import { GrepSearchGroup } from "./blocks/grep-search-group";
import { ReadToolCallBlock } from "./blocks/read-tool-call-block";
import { CursorInstallButton } from "./cursor-install-button";
import { DemoFooter } from "./demo-footer";
import { GithubButton } from "./github-button";
import {
  GrabElementButton,
  type SelectedElementInfo,
} from "./grab-element-button";
import { HotkeyProvider } from "./hotkey-context";
import { IconClaude } from "./icon-claude";
import { IconCopilot } from "./icon-copilot";
import { IconCursor } from "./icon-cursor";
import { InstallTabs } from "./install-tabs";
import { ReactGrabLogo } from "./react-grab-logo";
import { UserMessage } from "./user-message";

const GREP_SEARCHES = ["submit", "button", 'type="submit"'];

const FALLBACK_ELEMENT = {
  componentName: "PrimaryButton",
  filePath: "components/ui/primary-button.tsx",
  lineNumber: 42,
};

const PATH_START_MARKERS = ["src", "components", "app", "pages"];

interface BlockConfig {
  type: "user_message" | "thought" | "message";
  content: ReactNode;
  duration?: number;
  check: "visible" | "complete";
  role?:
    | "grep"
    | "grepError"
    | "elementSelect"
    | "elementAnalysis"
    | "elementRead"
    | "footer";
  demoOnly?: boolean;
  hideOnMobile?: boolean;
  wrapperClass?: string;
  animationDelayIndex?: number;
}

const ElementTag = ({ children }: { children: string }): ReactElement => (
  <span className="inline-flex items-center rounded-md bg-[#330039] px-1 py-0.5 text-[13px] font-mono text-[#ff4fff]">
    {children}
  </span>
);

const GrepErrorContent = (): ReactElement => (
  <span className="text-[#ff8080] inline-flex items-center gap-2">
    <TriangleAlert size={16} />
    <span>I couldn&apos;t find what you&apos;re looking for :(</span>
  </span>
);

const Divider = (): ReactElement => <hr className="my-4 border-white/10" />;

const ReactGrabIntro = (): ReactElement => (
  <div className="flex flex-col gap-2">
    <div
      className="inline-flex"
      style={{ padding: "2px", transform: "translateX(-3px)" }}
    >
      <ReactGrabLogo width={44} height={44} className="logo-shimmer-once" />
    </div>
    <div className="text-pretty">
      <span className="font-bold">React&nbsp;Grab</span> lets you select context
      for coding agents directly from your&nbsp;website.
    </div>
  </div>
);

const ToolWithIcon = ({
  icon,
  name,
}: {
  icon: ReactNode;
  name: string;
}): ReactElement => (
  <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
    {icon}
    {name}
  </span>
);

const ToolsList = (): ReactElement => (
  <span className="text-pretty">
    It makes tools like{" "}
    <ToolWithIcon
      icon={<IconCursor width={16} height={16} className="translate-y-[2px]" />}
      name="Cursor"
    />
    ,{" "}
    <ToolWithIcon
      icon={<IconClaude width={16} height={16} className="translate-y-[2px]" />}
      name="Claude Code"
    />
    ,{" "}
    <ToolWithIcon
      icon={
        <IconCopilot width={18} height={18} className="translate-y-[2px]" />
      }
      name="Copilot"
    />{" "}
    run up to{" "}
    <BenchmarkTooltip
      href="/blog/intro"
      className="shimmer-text-pink inline-block touch-manipulation py-1"
    >
      <span className="font-bold">3×</span>&nbsp;faster
    </BenchmarkTooltip>
  </span>
);

const FooterActions = (): ReactElement => (
  <div className="pt-2">
    <div className="flex gap-2">
      <GithubButton />
      <CursorInstallButton />
    </div>
    <DemoFooter />
  </div>
);

const MobileVideoFallback = (): ReactElement => (
  <>
    <video
      src="/demo.webm"
      autoPlay
      loop
      muted
      playsInline
      controls
      className="mt-3 w-full rounded-lg border border-white/10"
    />
    <p className="mt-1 text-sm text-white/30">
      This website is best viewed on desktop
    </p>
  </>
);

interface ElementAnalysisContentProps {
  displayName: string;
  filePath?: string;
  lineNumber?: number;
}

const shortenFilePath = (filePath: string): string => {
  const parts = filePath.split("/");
  const startIndex = parts.findIndex((p) => PATH_START_MARKERS.includes(p));
  return startIndex !== -1
    ? parts.slice(startIndex).join("/")
    : parts.slice(-2).join("/");
};

const getFileName = (filePath: string): string =>
  filePath.split("/").pop() ?? filePath;

const ElementAnalysisContent = ({
  displayName,
  filePath,
  lineNumber,
}: ElementAnalysisContentProps): ReactElement => {
  const shortPath = filePath ? getFileName(filePath) : null;

  return (
    <span>
      I found <ElementTag>{displayName}</ElementTag>
      {shortPath && (
        <>
          {" "}
          at <ElementTag>{shortPath}</ElementTag>
          {lineNumber && (
            <>
              {" "}
              line <ElementTag>{String(lineNumber)}</ElementTag>
            </>
          )}
        </>
      )}
      . Let me take a closer look.
    </span>
  );
};

const TooltipRow = ({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string | number;
  truncate?: boolean;
}): ReactElement => (
  <span className="flex justify-between gap-3">
    <span className="text-white/40">{label}</span>
    <span
      className={`font-mono text-white/90 text-right ${truncate ? "truncate max-w-[120px]" : ""}`}
    >
      {value}
    </span>
  </span>
);

interface ElementSelectContentProps {
  tagName: string;
  componentName?: string;
  filePath?: string;
  lineNumber?: number;
  id?: string;
  className?: string;
}

const ElementSelectContent = ({
  tagName,
  componentName,
  filePath,
  lineNumber,
  id,
  className,
}: ElementSelectContentProps): ReactElement => {
  const shortPath = filePath ? shortenFilePath(filePath) : null;
  const hasMetadata = componentName || shortPath || id || className;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      Here{"'"}s the element{" "}
      <span className="relative group">
        <ElementTag>{`<${tagName}>`}</ElementTag>
        {hasMetadata && (
          <span className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block min-w-[180px] rounded-lg border border-white/10 bg-[#1a1a1a] px-2.5 py-2 text-xs shadow-xl">
            <span className="absolute -top-1.5 left-3 h-3 w-3 rotate-45 border-l border-t border-white/10 bg-[#1a1a1a]" />
            <span className="flex flex-col gap-1">
              {componentName && (
                <TooltipRow label="Component" value={componentName} />
              )}
              {shortPath && <TooltipRow label="File" value={shortPath} />}
              {lineNumber && <TooltipRow label="Line" value={lineNumber} />}
              {id && <TooltipRow label="ID" value={`#${id}`} />}
              {className && (
                <TooltipRow
                  label="Class"
                  value={`.${className.split(" ")[0]}`}
                  truncate
                />
              )}
            </span>
          </span>
        )}
      </span>
    </div>
  );
};

const BLOCK_CONFIGS: BlockConfig[] = [
  {
    type: "user_message",
    content: "Can you make the submit button bigger?",
    check: "visible",
    demoOnly: true,
  },
  {
    type: "thought",
    content:
      "I need to find the submit button in their codebase. Let me search for submit buttons across the project that might satisfy the user's request.",
    duration: 1000,
    check: "visible",
    demoOnly: true,
  },
  {
    type: "message",
    content: "Let me search for the submit button in your codebase.",
    check: "visible",
    demoOnly: true,
  },
  {
    type: "message",
    content: <GrepSearchGroup searches={GREP_SEARCHES} />,
    check: "complete",
    demoOnly: true,
    role: "grep",
  },
  {
    type: "message",
    content: <GrepErrorContent />,
    check: "complete",
    demoOnly: true,
    role: "grepError",
  },
  {
    type: "user_message",
    content: "",
    check: "complete",
    demoOnly: true,
    wrapperClass: "mt-10",
    role: "elementSelect",
  },
  {
    type: "message",
    content: null,
    check: "complete",
    demoOnly: true,
    role: "elementAnalysis",
  },
  {
    type: "message",
    content: null,
    check: "complete",
    demoOnly: true,
    role: "elementRead",
  },
  {
    type: "message",
    content: "Found it. Let me resize it for you.",
    check: "visible",
    demoOnly: true,
  },
  {
    type: "message",
    content: <Divider />,
    check: "complete",
    demoOnly: true,
  },
  {
    type: "message",
    content: <ReactGrabIntro />,
    check: "complete",
    animationDelayIndex: 0,
  },
  {
    type: "message",
    content: <ToolsList />,
    check: "complete",
    animationDelayIndex: 1,
    role: "footer",
  },
  {
    type: "message",
    content: <InstallTabs showHeading showAgentNote />,
    check: "complete",
    hideOnMobile: true,
    animationDelayIndex: 3,
  },
  {
    type: "message",
    content: <FooterActions />,
    check: "complete",
    wrapperClass: "mt-6",
    animationDelayIndex: 4,
  },
];

const toStreamBlocks = (configs: BlockConfig[]): StreamBlock[] =>
  configs.map((config, index) => ({
    id: String(index),
    type: config.type,
    content: config.content,
    duration: config.duration,
  }));

interface RenderBlockProps {
  config: BlockConfig;
  block: StreamRenderedBlock;
  wasPreloaded: boolean;
}

const RenderBlock = ({
  config,
  block,
  wasPreloaded,
}: RenderBlockProps): ReactElement | null => {
  const animationDelay =
    config.animationDelayIndex !== undefined && wasPreloaded
      ? config.animationDelayIndex *
        STREAM_DEMO_PRELOAD_ANIMATION_DELAY_MULTIPLIER
      : 0;

  switch (config.type) {
    case "user_message":
      return <UserMessage block={block} skipAnimation={wasPreloaded} />;
    case "thought":
      return <ThoughtBlock block={block} />;
    case "message":
      return <MessageBlock block={block} animationDelay={animationDelay} />;
    default:
      return null;
  }
};

const GREP_INDEX = BLOCK_CONFIGS.findIndex((c) => c.role === "grep");
const GREP_ERROR_INDEX = BLOCK_CONFIGS.findIndex((c) => c.role === "grepError");

const formatElementSelector = (element: SelectedElementInfo): string => {
  let selector = element.tagName.toLowerCase();
  if (element.id) selector += `#${element.id}`;
  if (element.className) {
    const classes = element.className.split(" ").filter(Boolean).slice(0, 2);
    if (classes.length) selector += `.${classes.join(".")}`;
  }
  return selector;
};

export const StreamDemo = (): ReactElement => {
  const [blockConfigs, setBlockConfigs] = useState(BLOCK_CONFIGS);
  const streamBlocks = useMemo(
    () => toStreamBlocks(blockConfigs),
    [blockConfigs],
  );
  const [isMobile] = useState(detectMobile);
  const [isGrepComplete, setIsGrepComplete] = useState(false);
  const shouldResumeRef = useRef(false);

  const stream = useStream({
    blocks: streamBlocks,
    chunkSize: DEFAULT_CHUNK_SIZE,
    chunkDelayMs: STREAM_DEMO_CHUNK_DELAY_MS,
    blockDelayMs: STREAM_DEMO_BLOCK_DELAY_MS,
    pauseAtBlockId: String(GREP_ERROR_INDEX),
    skipAnimation: isMobile,
  });

  const isVisible = (index: number): boolean =>
    stream.blocks[index]?.status !== "pending";

  const isComplete = (index: number): boolean =>
    stream.blocks[index]?.status === "complete";

  const handleGrepComplete = useCallback(() => {
    setIsGrepComplete(true);
  }, []);

  useEffect(() => {
    const elementSelectConfig = blockConfigs.find(
      (c) => c.role === "elementSelect",
    );
    if (shouldResumeRef.current && elementSelectConfig?.content) {
      shouldResumeRef.current = false;
      stream.resume();
    }
  }, [blockConfigs, stream]);

  const handleElementSelect = useCallback(
    (element: SelectedElementInfo) => {
      const hasReactMetadata = Boolean(
        element.componentName || element.filePath,
      );
      const useFallback = !hasReactMetadata;
      const fallbackElement = useFallback ? FALLBACK_ELEMENT : null;
      const componentName =
        element.componentName ?? fallbackElement?.componentName ?? null;
      const filePath = element.filePath ?? fallbackElement?.filePath ?? null;
      const lineNumber =
        element.lineNumber ?? fallbackElement?.lineNumber ?? null;

      const selector = formatElementSelector(element);
      const displayName = componentName || selector;
      const fileName = filePath ? getFileName(filePath) : displayName;

      const updatedConfigs = blockConfigs.map((config) => {
        switch (config.role) {
          case "elementSelect":
            return {
              ...config,
              content: (
                <ElementSelectContent
                  tagName={element.tagName}
                  componentName={componentName ?? undefined}
                  filePath={filePath ?? undefined}
                  lineNumber={lineNumber ?? undefined}
                  id={element.id}
                  className={element.className}
                />
              ),
            };
          case "elementAnalysis":
            return {
              ...config,
              content: (
                <ElementAnalysisContent
                  displayName={displayName}
                  filePath={filePath ?? undefined}
                  lineNumber={lineNumber ?? undefined}
                />
              ),
            };
          case "elementRead":
            return {
              ...config,
              content: <ReadToolCallBlock parameter={fileName} />,
            };
          default:
            return config;
        }
      });

      shouldResumeRef.current = true;
      setBlockConfigs(updatedConfigs);
    },
    [blockConfigs],
  );

  const shouldShowFullDemo = !stream.wasPreloaded;

  return (
    <HotkeyProvider>
      <div className="min-h-screen bg-black px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 pt-4 text-base sm:pt-8 sm:text-lg">
          {blockConfigs.map((config, index) => {
            const block = stream.blocks[index];
            if (!block) return null;

            const passesCheck =
              config.check === "visible" ? isVisible(index) : isComplete(index);
            const isDynamicRole =
              config.role === "elementSelect" ||
              config.role === "elementAnalysis" ||
              config.role === "elementRead";
            const isGatedByGrep =
              index > GREP_INDEX && config.demoOnly && !stream.wasPreloaded;

            const shouldHide =
              !passesCheck ||
              (config.demoOnly && !shouldShowFullDemo) ||
              (config.hideOnMobile && isMobile) ||
              (isDynamicRole && !config.content) ||
              (isGatedByGrep && !isGrepComplete);

            if (shouldHide) return null;

            const element =
              config.role === "grep" && !stream.wasPreloaded ? (
                <GrepSearchGroup
                  searches={GREP_SEARCHES}
                  onComplete={handleGrepComplete}
                />
              ) : (
                <RenderBlock
                  config={config}
                  block={block}
                  wasPreloaded={stream.wasPreloaded}
                />
              );

            return (
              <Fragment key={index}>
                {config.wrapperClass ? (
                  <div className={config.wrapperClass}>{element}</div>
                ) : (
                  element
                )}

                {config.role === "grepError" &&
                  stream.isPaused &&
                  isGrepComplete &&
                  !stream.wasPreloaded && (
                    <GrabElementButton onSelect={handleElementSelect} />
                  )}

                {config.role === "footer" && isComplete(index) && (
                  <>
                    {isMobile && <MobileVideoFallback />}
                    {stream.wasPreloaded && (
                      <GrabElementButton
                        onSelect={handleElementSelect}
                        showSkip={false}
                        animationDelay={
                          2 * STREAM_DEMO_PRELOAD_ANIMATION_DELAY_MULTIPLIER
                        }
                      />
                    )}
                  </>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </HotkeyProvider>
  );
};

StreamDemo.displayName = "StreamDemo";
