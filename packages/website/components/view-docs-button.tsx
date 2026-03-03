import { type ReactElement } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { BookOpen } from "lucide-react";

export const ViewDocsButton = (): ReactElement => (
  <a
    href="https://github.com/aidenybai/react-grab#readme"
    target="_blank"
    rel="noreferrer"
    className={cn(
      buttonVariants({ variant: "outline" }),
      "hidden h-auto gap-2 px-3 py-1.5 text-sm active:scale-[0.98] sm:inline-flex sm:text-base",
    )}
  >
    <BookOpen className="h-[15px] w-[15px]" />
    View docs
  </a>
);

ViewDocsButton.displayName = "ViewDocsButton";
