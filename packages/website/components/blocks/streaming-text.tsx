"use client";

import { motion } from "motion/react";
import { type ReactElement, type ReactNode } from "react";

interface StreamChunk {
  id: string;
  text: string;
}

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  as?: "span" | "div";
}

const FadeIn = ({
  children,
  delay = 0,
  as = "span",
}: FadeInProps): ReactElement => {
  const Component = motion[as];
  return (
    <Component
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
    >
      {children}
    </Component>
  );
};

interface StreamingChunksProps {
  chunks: StreamChunk[];
}

const StreamingChunks = ({ chunks }: StreamingChunksProps): ReactElement => (
  <>
    {chunks.map((chunk) => (
      <motion.span
        key={chunk.id}
        initial={{ opacity: 0.2 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
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
  const isInstantContent = chunks.length === 0;

  if (Array.isArray(content)) {
    return (
      <>
        {content.map((item, index) => {
          if (typeof item === "string") {
            if (isInstantContent) {
              return (
                <FadeIn key={`text-${index}`} delay={animationDelay}>
                  {item}
                </FadeIn>
              );
            }
            return (
              <span key={`text-${index}`}>
                <StreamingChunks chunks={chunks} />
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
        <FadeIn delay={animationDelay} as="div">
          {content}
        </FadeIn>
      );
    }
    return <>{content}</>;
  }

  if (isInstantContent) {
    return <FadeIn delay={animationDelay}>{content}</FadeIn>;
  }

  return <StreamingChunks chunks={chunks} />;
};

StreamingText.displayName = "StreamingText";
