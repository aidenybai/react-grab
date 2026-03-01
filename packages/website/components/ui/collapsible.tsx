"use client";

import { useState, useMemo, type ReactElement, type ReactNode } from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollapsibleProps {
  header: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  isStreaming?: boolean;
  autoExpandOnStreaming?: boolean;
}

export const Collapsible = ({
  header,
  children,
  defaultExpanded = true,
  isStreaming = false,
  autoExpandOnStreaming = true,
}: CollapsibleProps): ReactElement => {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);

  const isExpanded = useMemo(() => {
    if (manualExpanded !== null) {
      return manualExpanded;
    }
    if (isStreaming && autoExpandOnStreaming) {
      return true;
    }
    return defaultExpanded;
  }, [manualExpanded, isStreaming, defaultExpanded, autoExpandOnStreaming]);

  return (
    <CollapsiblePrimitive.Root
      open={isExpanded}
      onOpenChange={setManualExpanded}
    >
      <CollapsiblePrimitive.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="group relative h-auto w-full justify-start px-0 py-0 text-left text-[#818181] hover:bg-transparent hover:text-[#a4a4a4]"
        >
          {header}
          {isExpanded ? (
            <span className="ml-2 opacity-50">
              <ChevronDown className="size-3" />
            </span>
          ) : (
            <span className="ml-2 opacity-0 transition-opacity group-hover:opacity-50">
              <ChevronRight className="size-3" />
            </span>
          )}
        </Button>
      </CollapsiblePrimitive.Trigger>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <CollapsiblePrimitive.Content forceMount asChild>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          </CollapsiblePrimitive.Content>
        )}
      </AnimatePresence>
    </CollapsiblePrimitive.Root>
  );
};

Collapsible.displayName = "Collapsible";
