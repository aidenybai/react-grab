import { type ReactElement } from "react";
import { BookOpen } from "lucide-react";

export const ViewDocsButton = (): ReactElement => (
  <a
    href="https://github.com/aidenybai/react-grab#readme"
    target="_blank"
    rel="noreferrer"
    className="hidden sm:inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition-all hover:bg-white/10 active:scale-[0.98] sm:text-base"
  >
    <BookOpen className="h-[15px] w-[15px]" />
    View docs
  </a>
);

ViewDocsButton.displayName = "ViewDocsButton";
