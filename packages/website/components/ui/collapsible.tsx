"use client";

import { useState, useMemo, type ReactElement, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

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

  const handleToggle = () => {
    setManualExpanded(!isExpanded);
  };

  return (
    <div>
      <Button
        variant="ghost"
        onClick={handleToggle}
        className="h-auto w-full justify-start p-0 text-left group relative"
      >
        <div className="flex items-center text-muted-foreground">
          {header}
          {isExpanded ? (
            <span className="ml-2 opacity-50">
              <ChevronDown className="w-3 h-3" />
            </span>
          ) : (
            <span className="ml-2 opacity-0 group-hover:opacity-50 transition-opacity">
              <ChevronRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </Button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

Collapsible.displayName = "Collapsible";
