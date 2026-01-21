"use client";

import { useEffect, useState, type ReactElement } from "react";
import { GREP_SEARCH_DELAY_MS } from "@/constants";
import { Collapsible } from "../collapsible";
import { GrepToolCallBlock } from "./grep-tool-call-block";

interface GrepSearchGroupProps {
  searches: string[];
  onComplete?: () => void;
}

export const GrepSearchGroup = ({
  searches,
  onComplete,
}: GrepSearchGroupProps): ReactElement => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (phase > searches.length) return;

    const timeout = setTimeout(() => {
      const nextPhase = phase + 1;
      setPhase(nextPhase);
      if (nextPhase > searches.length) {
        onComplete?.();
      }
    }, GREP_SEARCH_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [phase, searches.length, onComplete]);

  const visibleCount = Math.min(phase, searches.length);
  const streamingIndex = phase <= searches.length ? phase - 1 : null;
  const isStreaming = streamingIndex !== null && streamingIndex >= 0;

  const searchesLabel = `${visibleCount} search${visibleCount === 1 ? "" : "es"}`;
  const isExploring = phase === 0;

  const header = (
    <div className="text-[#818181]">
      {isExploring ? (
        <>Exploring</>
      ) : (
        <>
          Explored <span className="text-[#5b5b5b]">{searchesLabel}</span>
        </>
      )}
    </div>
  );

  return (
    <Collapsible header={header} defaultExpanded isStreaming={isStreaming}>
      <div className="flex flex-col gap-2 mt-2">
        {searches.slice(0, visibleCount).map((search, index) => (
          <GrepToolCallBlock
            key={search}
            parameter={search}
            isStreaming={index === streamingIndex}
          />
        ))}
      </div>
    </Collapsible>
  );
};

GrepSearchGroup.displayName = "GrepSearchGroup";
