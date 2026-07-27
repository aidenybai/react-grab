const TRUNCATION_SUFFIX = "...";

export const truncateEscapedHtml = (escapedHtml: string, maxLength: number): string => {
  if (escapedHtml.length <= maxLength) return escapedHtml;
  const contentLength = Math.max(0, maxLength - TRUNCATION_SUFFIX.length);
  const truncatedContent = escapedHtml.slice(0, contentLength);
  const lastEntityStartIndex = truncatedContent.lastIndexOf("&");
  const lastEntityEndIndex = truncatedContent.lastIndexOf(";");
  const completeEntityContent =
    lastEntityStartIndex > lastEntityEndIndex
      ? truncatedContent.slice(0, lastEntityStartIndex)
      : truncatedContent;
  return `${completeEntityContent}${TRUNCATION_SUFFIX}`.slice(0, maxLength);
};
