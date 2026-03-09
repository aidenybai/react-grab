"use client";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import styled from "styled-components";
import * as Accordion from "@radix-ui/react-accordion";

const MazeOuterWrap = styled.div`
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
`;

const MazeInnerWrap = styled.div`
  padding: 16px;
  background: var(--muted);
`;

const MazeContent = styled.div`
  padding: 12px;
  font-size: 14px;
  color: var(--foreground);
  background: var(--background);
  border-radius: 8px;
`;

export function AnimationMaze({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <MazeOuterWrap>
          <Accordion.Root type="single" defaultValue="maze-item" collapsible>
            <Accordion.Item value="maze-item">
              <Accordion.Header>
                <Accordion.Trigger
                  style={{
                    display: "flex",
                    width: "100%",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Animation Maze
                  <span>▼</span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <MazeInnerWrap>
                    <MazeContent data-testid={testId}>
                      You navigated the animation maze! This content is wrapped
                      in: AnimatePresence → motion.div → styled → Radix
                      Accordion.Item → Accordion.Content (forceMount) →
                      motion.div → styled → styled content.
                    </MazeContent>
                  </MazeInnerWrap>
                </motion.div>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </MazeOuterWrap>
      </motion.div>
    </AnimatePresence>
  );
}
