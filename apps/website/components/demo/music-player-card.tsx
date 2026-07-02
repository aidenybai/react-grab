"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const EQUALIZER_BAR_COUNT = 14;
const EQUALIZER_STAGGER_MS = 90;

export const MusicPlayerCard = () => {
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Now playing</CardTitle>
        <CardDescription>Grab Anything — The Fibers</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex h-16 items-end justify-center gap-1 rounded-lg border border-line bg-canvas px-4 py-3">
          {Array.from({ length: EQUALIZER_BAR_COUNT }, (_, barIndex) => (
            <span
              key={barIndex}
              className={`h-full w-1.5 origin-bottom animate-equalize rounded-full bg-brand ${
                isPlaying ? "" : "[animation-play-state:paused]"
              }`}
              style={{ animationDelay: `${barIndex * EQUALIZER_STAGGER_MS}ms` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="ghost" aria-label="Previous track">
            <SkipBack />
          </Button>
          <Button
            size="icon"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => setIsPlaying((wasPlaying) => !wasPlaying)}
          >
            {isPlaying ? <Pause /> : <Play />}
          </Button>
          <Button size="icon" variant="ghost" aria-label="Next track">
            <SkipForward />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

MusicPlayerCard.displayName = "MusicPlayerCard";
