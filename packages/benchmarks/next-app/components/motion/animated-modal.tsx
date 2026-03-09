"use client";
import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

export function AnimatedModal({
  open,
  onClose,
  children,
  "data-testid": testId,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 100,
            }}
          />
          <motion.div
            data-testid={testId}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--background)",
              borderRadius: 12,
              padding: 24,
              minWidth: 400,
              zIndex: 101,
              border: "1px solid var(--border)",
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
