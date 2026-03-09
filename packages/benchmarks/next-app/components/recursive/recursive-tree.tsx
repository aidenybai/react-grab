"use client";
import React from "react";
import styled from "styled-components";
import { motion } from "motion/react";

const TreeLeaf = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 1px;
`;

function TreeNode({
  depth,
  maxDepth,
  path,
  leafTestId,
}: {
  depth: number;
  maxDepth: number;
  path: string;
  leafTestId?: string;
}) {
  if (depth >= maxDepth) {
    return (
      <TreeLeaf data-testid={path === "LLLLLLLL" ? leafTestId : undefined}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: Math.random() * 0.5 }}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "white",
          }}
        />
      </TreeLeaf>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <TreeNode
        depth={depth + 1}
        maxDepth={maxDepth}
        path={path + "L"}
        leafTestId={leafTestId}
      />
      <TreeNode
        depth={depth + 1}
        maxDepth={maxDepth}
        path={path + "R"}
        leafTestId={leafTestId}
      />
    </div>
  );
}

export function RecursiveTree({
  depth = 8,
  "data-testid": testId,
}: {
  depth?: number;
  "data-testid"?: string;
}) {
  return (
    <div data-testid={testId} style={{ overflow: "auto", padding: 8 }}>
      <TreeNode
        depth={0}
        maxDepth={depth}
        path=""
        leafTestId="recursive-tree-leaf"
      />
    </div>
  );
}
