"use client";

import { useEffect } from "react";
import {
  Agentation,
  identifyElement,
  getNearbyText,
  getElementPath,
  getElementClasses,
  getSourceLocation,
  findNearestComponentSource,
} from "agentation";

export interface SourceResult {
  filePath: string | null;
  componentName: string | null;
  found: boolean;
}

export interface Resolver {
  name: string;
  resolve: (el: HTMLElement) => SourceResult | Promise<SourceResult>;
  identify?: (el: HTMLElement) => { name: string; path: string } | null;
}

const reactGrabResolver: Resolver = {
  name: "react-grab",
  resolve: async (el) => {
    const api = (window as any).__REACT_GRAB__;
    if (!api) return { filePath: null, componentName: null, found: false };
    const src = await api.getSource(el);
    const name = api.getDisplayName(el);
    return {
      filePath: src?.filePath ?? null,
      componentName: name ?? null,
      found: !!src,
    };
  },
  identify: (el) => {
    const api = (window as any).__REACT_GRAB__;
    if (!api) return null;
    const name = api.getDisplayName(el);
    return name ? { name, path: "" } : null;
  },
};

const agentationResolver: Resolver = {
  name: "agentation",
  resolve: (el) => {
    const loc = getSourceLocation(el);
    return {
      filePath: loc.source?.fileName ?? null,
      componentName: loc.source?.componentName ?? null,
      found: loc.found,
    };
  },
  identify: (el) => identifyElement(el),
};

interface BenchAPI {
  resolvers: Map<string, Resolver>;
  register: (r: Resolver) => void;
  unregister: (name: string) => void;
  resolve: (
    el: HTMLElement,
    resolverName?: string,
  ) => Promise<Record<string, SourceResult>>;
  resolveAll: (
    testId: string,
  ) => Promise<Record<string, SourceResult & { ms: number }>>;
  identify: (
    el: HTMLElement,
  ) => Record<string, ReturnType<NonNullable<Resolver["identify"]>>>;
  list: () => string[];
  utils: {
    identifyElement: typeof identifyElement;
    getNearbyText: typeof getNearbyText;
    getElementPath: typeof getElementPath;
    getElementClasses: typeof getElementClasses;
    getSourceLocation: typeof getSourceLocation;
    findNearestComponentSource: typeof findNearestComponentSource;
  };
}

function createBenchAPI(): BenchAPI {
  const resolvers = new Map<string, Resolver>();

  const api: BenchAPI = {
    resolvers,

    register(r) {
      resolvers.set(r.name, r);
    },

    unregister(name) {
      resolvers.delete(name);
    },

    async resolve(el, resolverName) {
      const results: Record<string, SourceResult> = {};
      const targets = resolverName
        ? [resolvers.get(resolverName)].filter(Boolean)
        : [...resolvers.values()];

      for (const r of targets) {
        if (!r) continue;
        try {
          results[r.name] = await r.resolve(el);
        } catch {
          results[r.name] = {
            filePath: null,
            componentName: null,
            found: false,
          };
        }
      }
      return results;
    },

    async resolveAll(testId) {
      const el = document.querySelector(
        `[data-testid="${testId}"]`,
      ) as HTMLElement | null;
      if (!el) return {};

      const results: Record<string, SourceResult & { ms: number }> = {};
      for (const r of resolvers.values()) {
        const start = performance.now();
        try {
          const res = await r.resolve(el);
          results[r.name] = { ...res, ms: performance.now() - start };
        } catch {
          results[r.name] = {
            filePath: null,
            componentName: null,
            found: false,
            ms: performance.now() - start,
          };
        }
      }
      return results;
    },

    identify(el) {
      const results: Record<
        string,
        ReturnType<NonNullable<Resolver["identify"]>>
      > = {};
      for (const r of resolvers.values()) {
        results[r.name] = r.identify?.(el) ?? null;
      }
      return results;
    },

    list: () => [...resolvers.keys()],

    utils: {
      identifyElement,
      getNearbyText,
      getElementPath,
      getElementClasses,
      getSourceLocation,
      findNearestComponentSource,
    },
  };

  api.register(reactGrabResolver);
  api.register(agentationResolver);

  return api;
}

function useBenchHarness() {
  useEffect(() => {
    (window as any).__BENCH__ = createBenchAPI();
    return () => {
      delete (window as any).__BENCH__;
    };
  }, []);
}

export function BenchHarness() {
  useBenchHarness();
  return <Agentation />;
}
