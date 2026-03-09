"use client";
import React, { forwardRef, memo } from "react";
import { motion } from "motion/react";
import styled from "styled-components";
import { withTracking } from "@/components/hoc/with-tracking";
import { withErrorBoundary } from "@/components/hoc/with-error-boundary";
import { withPermissions } from "@/components/hoc/with-permissions";
import { withTooltip } from "@/components/hoc/with-tooltip";

const StyledMotionButton = styled(motion.button)`
  padding: 10px 20px;
  border-radius: 8px;
  border: 2px solid #8b5cf6;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
`;

const InnerButton = memo(
  forwardRef<HTMLButtonElement, { "data-testid"?: string }>(
    function InnerButton({ "data-testid": testId }, ref) {
      return (
        <StyledMotionButton
          ref={ref}
          data-testid={testId}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Russian Doll Button
        </StyledMotionButton>
      );
    },
  ),
);

const Layer1 = withPermissions(
  InnerButton as React.ComponentType<{ "data-testid"?: string }>,
  "read",
);
const Layer2 = withErrorBoundary(Layer1);
const Layer3 = withTracking(Layer2, "russian-doll-1");
const Layer4 = withPermissions(Layer3, "write");
const Layer5 = withErrorBoundary(Layer4);
const Layer6 = withTracking(Layer5, "russian-doll-2");
const Layer7 = withPermissions(Layer6, "admin");
const Layer8 = withErrorBoundary(Layer7);
const Layer9 = withTracking(Layer8, "russian-doll-3");
const Layer10 = withPermissions(Layer9, "superadmin");
const Layer11 = withErrorBoundary(Layer10);
const Layer12 = withTooltip(Layer11, "Deeply wrapped button");
const Layer13 = withTracking(Layer12, "russian-doll-4");
const Layer14 = withPermissions(Layer13, "root");
const RussianDollWrapped = withErrorBoundary(Layer14);

export function RussianDoll() {
  return <RussianDollWrapped data-testid="russian-doll-button" />;
}
