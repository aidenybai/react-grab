import { describe, expect, it } from "vite-plus/test";
import { looksTransformed } from "../src/utils/get-source-snippet.js";

describe("looksTransformed", () => {
  it("accepts an authored JSX/TSX source", () => {
    const original = `
import { useState } from "react";

export const TodoItem = ({ todo }: { todo: Todo }) => {
  return (
    <li>
      <span>{todo.title}</span>
    </li>
  );
};
    `;
    expect(looksTransformed(original)).toBe(false);
  });

  it("rejects Vite's HMR-injected transformed output", () => {
    const transformed = `
var _jsxFileName = "/Users/me/proj/src/App.tsx";
import __vite__cjsImport3_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=3dd76975";
var _s = $RefreshSig$();
const TodoItem = ({ todo }) => {
  return _jsxDEV("li", { children: _jsxDEV("span", { children: todo.title }) });
};
    `;
    expect(looksTransformed(transformed)).toBe(true);
  });

  it("rejects Babel/SWC `_jsx(...)` runtime calls", () => {
    const transformed = `
"use strict";
var _jsx = require("react/jsx-runtime").jsx;
exports.TodoItem = function TodoItem({ todo }) {
  return _jsx("li", { children: todo.title });
};
    `;
    expect(looksTransformed(transformed)).toBe(true);
  });

  it("rejects content that imports the React JSX runtime by name", () => {
    const transformed = `
import { jsxRuntime } from "react/jsx-runtime";
const TodoItem = jsxRuntime.jsxDEV("li", null);
    `;
    expect(looksTransformed(transformed)).toBe(true);
  });

  it("only inspects the head of the file so a single transformed token deep in the file does not poison long sources", () => {
    const head = "x".repeat(2_500);
    const tail = "_jsxDEV(";
    expect(looksTransformed(head + tail)).toBe(false);
  });
});
