"use client";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { motion } from "motion/react";

const ShapeBox = styled.div<{ $shape: number }>`
  padding: 12px;
  border-radius: ${({ $shape }) => ($shape % 3 === 0 ? "50%" : $shape % 3 === 1 ? "12px" : "0")};
  border: 2px solid ${({ $shape }) => `hsl(${$shape * 60}, 70%, 50%)`};
  background: ${({ $shape }) => `hsl(${$shape * 60}, 70%, 95%)`};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  min-width: 60px;
  min-height: 60px;
`;

function ShapeA({ "data-testid": testId }: { "data-testid"?: string }) {
  return (
    <motion.div
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      <ShapeBox $shape={0} data-testid={testId}>
        A
      </ShapeBox>
    </motion.div>
  );
}

function ShapeB({ "data-testid": testId }: { "data-testid"?: string }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <ShapeBox $shape={1}>B1</ShapeBox>
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
      >
        <ShapeBox $shape={2} data-testid={testId}>
          B2
        </ShapeBox>
      </motion.div>
    </div>
  );
}

function ShapeC({ "data-testid": testId }: { "data-testid"?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 4 }}>
        <ShapeBox $shape={3}>C1</ShapeBox>
        <ShapeBox $shape={4}>C2</ShapeBox>
      </div>
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <ShapeBox $shape={5} data-testid={testId}>
          C3
        </ShapeBox>
      </motion.div>
    </div>
  );
}

const shapes = [ShapeA, ShapeB, ShapeC];

export function Shapeshifter({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  const [shapeIndex, setShapeIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setShapeIndex((prev) => (prev + 1) % shapes.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const ShapeComponent = shapes[shapeIndex];

  return (
    <div
      style={{ minHeight: 100, display: "flex", alignItems: "center", gap: 12 }}
    >
      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
        Shape {shapeIndex + 1}/{shapes.length}
      </span>
      <ShapeComponent data-testid={testId} />
    </div>
  );
}
