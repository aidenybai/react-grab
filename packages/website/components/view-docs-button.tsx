import { type ReactElement } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ViewDocsButton = (): ReactElement => (
  <Button
    asChild
    variant="secondary"
    size="sm"
    className="hidden sm:inline-flex h-auto gap-2 px-3 py-1.5 text-sm sm:text-base"
  >
    <a href="https://github.com/aidenybai/react-grab#readme" target="_blank" rel="noreferrer">
      <BookOpen className="size-[15px]" />
      View docs
    </a>
  </Button>
);

ViewDocsButton.displayName = "ViewDocsButton";
