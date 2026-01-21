import { highlightCode } from "../../lib/shiki";

interface CodeProps {
  code: string;
  lang: string;
  showLineNumbers?: boolean;
}

export async function Code({ code, lang, showLineNumbers = false }: CodeProps) {
  const html = await highlightCode({ code, lang, showLineNumbers });

  return (
    <div
      className="overflow-x-auto font-mono text-[13px] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

Code.displayName = "Code";
