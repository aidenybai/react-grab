import { Collapsible } from "../collapsible";

interface GrepToolCallBlockProps {
  parameter: string;
  result?: string;
  isStreaming?: boolean;
}

export const GrepToolCallBlock = ({
  parameter,
  result = "0 matches",
  isStreaming = false,
}: GrepToolCallBlockProps) => {
  const displayName = isStreaming ? "Grepping" : "Grepped";
  const hasNoMatches = result === "0 matches";
  const displayResult = hasNoMatches ? "Could not find any matches" : result;

  return (
    <Collapsible
      header={
        <div className="flex flex-wrap gap-1">
          <span className={isStreaming ? "shimmer-text" : ""}>
            {displayName}
          </span>
          {isStreaming ? (
            <span className="text-[#5b5b5b]">{parameter}</span>
          ) : (
            <>
              <span className="text-[#5b5b5b]">{parameter}</span>
              <span>and found</span>
              <span className="text-[#5b5b5b]">
                {hasNoMatches ? "no matches" : result}
              </span>
            </>
          )}
        </div>
      }
      defaultExpanded={false}
      isStreaming={isStreaming}
      autoExpandOnStreaming={false}
    >
      <div className="text-[#5b5b5b] mt-1">{displayResult}</div>
    </Collapsible>
  );
};

GrepToolCallBlock.displayName = "GrepToolCallBlock";
