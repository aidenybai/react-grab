"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const blockMainThread = (ms: number) => {
  const start = performance.now();
  while (performance.now() - start < ms) {
    // Intentionally blocking
  }
};

const SlowRenderComponent = ({ delay }: { delay: number }) => {
  blockMainThread(delay);
  return (
    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded text-sm">
      Rendered in {delay}ms (blocking)
    </div>
  );
};

const SlowEffectComponent = ({ delay }: { delay: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    blockMainThread(delay);
  }, [count, delay]);

  return (
    <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded text-sm flex items-center gap-2">
      <span>useEffect blocks for {delay}ms</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setCount((c) => c + 1)}
      >
        Trigger ({count})
      </Button>
    </div>
  );
};

const SlowLayoutEffectComponent = ({ delay }: { delay: number }) => {
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    blockMainThread(delay);
  }, [count, delay]);

  return (
    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded text-sm flex items-center gap-2">
      <span>useLayoutEffect blocks for {delay}ms</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setCount((c) => c + 1)}
      >
        Trigger ({count})
      </Button>
    </div>
  );
};

const CascadeRenderComponent = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded text-sm space-y-1">
      <div className="flex items-center gap-2">
        <span>Cascade render (5 children, 10ms each)</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCount((c) => c + 1)}
        >
          Trigger ({count})
        </Button>
      </div>
      <div className="pl-4 space-y-1">
        {[...Array(5)].map((_, i) => (
          <SlowRenderComponent key={`${count}-${i}`} delay={10} />
        ))}
      </div>
    </div>
  );
};

const UnstablePropComponent = ({
  data,
  onClick,
}: {
  data: { value: number };
  onClick: () => void;
}) => {
  return (
    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded text-sm flex items-center gap-2">
      <span>Value: {data.value}</span>
      <Button size="sm" variant="outline" onClick={onClick}>
        Click
      </Button>
    </div>
  );
};

const UnstablePropsParent = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded text-sm space-y-1">
      <div>Unstable props (inline object + function)</div>
      <UnstablePropComponent
        data={{ value: 42 }}
        onClick={() => setCount((c) => c + 1)}
      />
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Parent renders: {count}
      </div>
    </div>
  );
};

const ForcedLayoutComponent = () => {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    const div = document.createElement("div");
    div.style.width = "100px";
    document.body.appendChild(div);

    for (let i = 0; i < 100; i++) {
      div.style.width = `${100 + i}px`;
      // Force layout by reading offsetWidth
      void div.offsetWidth;
    }

    document.body.removeChild(div);
    setCount((c) => c + 1);
  };

  return (
    <div className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded text-sm flex items-center gap-2">
      <span>Layout thrashing (100 forced reflows)</span>
      <Button size="sm" variant="outline" onClick={handleClick}>
        Trigger ({count})
      </Button>
    </div>
  );
};

const RapidUpdatesComponent = () => {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    let frame = 0;
    const maxFrames = 60;

    const tick = () => {
      if (frame < maxFrames) {
        setCount((c) => c + 1);
        blockMainThread(5);
        frame++;
        requestAnimationFrame(tick);
      } else {
        setIsRunning(false);
      }
    };

    requestAnimationFrame(tick);
  }, [isRunning]);

  return (
    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded text-sm flex items-center gap-2">
      <span>Rapid updates (60 frames, 5ms each)</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsRunning(true)}
        disabled={isRunning}
      >
        {isRunning ? `Running... (${count})` : `Start (${count})`}
      </Button>
    </div>
  );
};

export const PerformanceTest = () => {
  const [showSlowRender, setShowSlowRender] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Performance Test Zone</CardTitle>
        <p className="text-sm text-muted-foreground">
          Intentionally laggy components to test LoAF detection
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showSlowRender ? "destructive" : "outline"}
            onClick={() => setShowSlowRender(!showSlowRender)}
          >
            {showSlowRender ? "Hide" : "Show"} Slow Render (50ms)
          </Button>
        </div>

        {showSlowRender && <SlowRenderComponent delay={50} />}

        <SlowEffectComponent delay={30} />
        <SlowLayoutEffectComponent delay={20} />
        <CascadeRenderComponent />
        <UnstablePropsParent />
        <ForcedLayoutComponent />
        <RapidUpdatesComponent />
      </CardContent>
    </Card>
  );
};
