import type { ReactNode } from "react";
import { PingDot } from "@/components/demo/ping-dot";

interface MotionTileProps {
  label: string;
  children: ReactNode;
}

const MotionTile = ({ label, children }: MotionTileProps) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-line p-5">
    <div className="flex h-14 items-center justify-center">{children}</div>
    <span className="font-mono text-xs uppercase tracking-widest text-faint">{label}</span>
  </div>
);

MotionTile.displayName = "MotionTile";

export const MotionGallery = () => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
    <MotionTile label="Bounce">
      <span className="size-4 rounded-full bg-brand motion-safe:animate-bounce" />
    </MotionTile>
    <MotionTile label="Spin">
      <span className="size-8 rounded-md border-2 border-line border-t-brand motion-safe:animate-spin" />
    </MotionTile>
    <MotionTile label="Ping">
      <PingDot sizeClass="size-4" />
    </MotionTile>
    <MotionTile label="Pulse">
      <span className="size-8 rounded-md bg-code motion-safe:animate-pulse" />
    </MotionTile>
  </div>
);

MotionGallery.displayName = "MotionGallery";
