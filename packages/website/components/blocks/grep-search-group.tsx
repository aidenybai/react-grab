"use client";

import { useEffect, useState, type ReactElement } from "react";
import { GREP_SEARCH_DELAY_MS } from "@/constants";
import { Collapsible } from "../ui/collapsible";
import { GrepToolCallBlock } from "./grep-tool-call-block";

interface ExploredHeaderProps {
  completedCount: number;
}

export const ExploredHeader = ({
  completedCount,
}: ExploredHeaderProps): ReactElement => {
  const isExploring = completedCount === 0;
  const label = `${completedCount} search${completedCount === 1 ? "" : "es"}`;

  return (
    <div className="text-[#818181]">
      {isExploring ? (
        "Exploring"
      ) : (
        <>
          Explored <span className="text-[#5b5b5b]">{label}</span>
        </>
      )}
    </div>
  );
};

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

  return (
    <Collapsible
      header={<ExploredHeader completedCount={visibleCount} />}
      defaultExpanded
      isStreaming={isStreaming}
    >
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
