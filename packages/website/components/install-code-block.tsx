import { highlightCodeSimple } from '@/lib/shiki';

interface InstallCodeBlockProps {
  code: string;
  lang?: string;
}

export async function InstallCodeBlock({
  code,
  lang = 'tsx',
}: InstallCodeBlockProps) {
  const html = await highlightCodeSimple(code.trim(), lang, 'vesper');

  return (
    <div
      style={{
        alignItems: "start",
        backgroundColor: "#0D0D0D",
        borderColor: "#212121",
        borderStyle: "solid",
        borderWidth: "1px",
        boxSizing: "border-box",
        contain: "layout",
        display: "flex",
        flexDirection: "column",
        flexShrink: "0",
        gap: 0,
        height: "fit-content",
        justifyContent: "start",
        overflowX: "auto",
        paddingBlock: "12px",
        paddingInline: "16px",
        transformOrigin: "50% 50%",
        width: "100%",
      }}
      className="shiki-copy-wrapper"
      dangerouslySetInnerHTML={{ __html: html }}
      suppressHydrationWarning
    />
  );
}
