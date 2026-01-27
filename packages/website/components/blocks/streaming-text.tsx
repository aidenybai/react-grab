"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactElement, type ReactNode } from "react";

interface StreamChunk {
  id: string;
  text: string;
}

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  as?: "span" | "div";
  shouldReduceMotion?: boolean;
}

const FadeIn = ({
  children,
  delay = 0,
  as = "span",
  shouldReduceMotion = false,
}: FadeInProps): ReactElement => {
  const Component = motion[as];
  return (
    <Component
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.4, ease: "easeOut", delay }
      }
    >
      {children}
    </Component>
  );
};

interface StreamingChunksProps {
  chunks: StreamChunk[];
  shouldReduceMotion?: boolean;
}

const StreamingChunks = ({
  chunks,
  shouldReduceMotion = false,
}: StreamingChunksProps): ReactElement => (
  <>
    {chunks.map((chunk) => (
      <motion.span
        key={chunk.id}
        initial={shouldReduceMotion ? false : { opacity: 0.2 }}
        animate={{ opacity: 1 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.25, ease: "easeOut" }
        }
      >
        {chunk.text}
      </motion.span>
    ))}
  </>
);

interface StreamingTextProps {
  content: string | ReactNode | Array<string | ReactNode>;
  chunks: StreamChunk[];
  animationDelay?: number;
}

export const StreamingText = ({
  content,
  chunks,
  animationDelay = 0,
}: StreamingTextProps): ReactElement => {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const isInstantContent = chunks.length === 0;

  if (Array.isArray(content)) {
    return (
      <>
        {content.map((item, index) => {
          if (typeof item === "string") {
            if (isInstantContent) {
              return (
                <FadeIn
                  key={`text-${index}`}
                  delay={animationDelay}
                  shouldReduceMotion={shouldReduceMotion}
                >
                  {item}
                </FadeIn>
              );
            }
            return (
              <span key={`text-${index}`}>
                <StreamingChunks
                  chunks={chunks}
                  shouldReduceMotion={shouldReduceMotion}
                />
              </span>
            );
          }
          return <span key={`node-${index}`}>{item}</span>;
        })}
      </>
    );
  }

  if (typeof content !== "string") {
    if (isInstantContent) {
      return (
        <FadeIn
          delay={animationDelay}
          as="div"
          shouldReduceMotion={shouldReduceMotion}
        >
          {content}
        </FadeIn>
      );
    }
    return <>{content}</>;
  }

  if (isInstantContent) {
    return (
      <FadeIn delay={animationDelay} shouldReduceMotion={shouldReduceMotion}>
        {content}
      </FadeIn>
    );
  }

  return (
    <StreamingChunks chunks={chunks} shouldReduceMotion={shouldReduceMotion} />
  );
};

StreamingText.displayName = "StreamingText";
