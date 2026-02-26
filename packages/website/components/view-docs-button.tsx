import { type ReactElement } from "react";
import { BookOpen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export const ViewDocsButton = (): ReactElement => (
  <a
    href="https://github.com/aidenybai/react-grab#readme"
    target="_blank"
    rel="noreferrer"
    className={cn(
      buttonVariants({ variant: "outline", size: "sm" }),
      "hidden border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition-all hover:bg-white/10 hover:text-white active:scale-[0.98] sm:inline-flex sm:text-base",
    )}
  >
    <BookOpen className="h-[15px] w-[15px]" />
    View docs
  </a>
);

ViewDocsButton.displayName = "ViewDocsButton";
