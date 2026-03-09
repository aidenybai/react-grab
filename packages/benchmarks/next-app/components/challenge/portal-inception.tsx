"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import { motion } from "motion/react";
import styled from "styled-components";

const InceptionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
`;

function DeepestPortalContent({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const portalTarget =
    typeof document !== "undefined"
      ? document.getElementById("portal-root") || document.body
      : null;

  if (!mounted || !portalTarget) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ position: "fixed", bottom: 80, left: 20, zIndex: 60 }}
    >
      <InceptionBadge data-testid={testId}>Inception Badge</InceptionBadge>
    </motion.div>,
    portalTarget,
  );
}

export function PortalInception() {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Portal>
        <Dialog.Content
          style={{
            position: "fixed",
            bottom: 120,
            left: 20,
            zIndex: 55,
            background: "var(--background)",
            borderRadius: 8,
            padding: 16,
            border: "1px solid var(--border)",
          }}
        >
          <Dialog.Title style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
            Portal Layer 1
          </Dialog.Title>
          <Popover.Root defaultOpen>
            <Popover.Trigger asChild>
              <button
                style={{
                  marginTop: 8,
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--muted)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Open Layer 2
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                sideOffset={5}
                style={{
                  background: "var(--background)",
                  borderRadius: 8,
                  padding: 12,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  zIndex: 56,
                }}
              >
                Portal Layer 2
                <DeepestPortalContent data-testid="portal-inception-badge" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
