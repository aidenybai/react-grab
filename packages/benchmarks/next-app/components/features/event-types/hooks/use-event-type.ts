"use client";

import { useState, useCallback } from "react";

interface EventType {
  id: string;
  title: string;
  slug: string;
  duration: number;
  isActive: boolean;
  description?: string;
  color: string;
}

export function useEventType(eventTypeId?: string) {
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const update = useCallback(async (data: Partial<EventType>) => {
    setIsLoading(true);
    try {
      setEventType((prev) => (prev ? { ...prev, ...data } : null));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleActive = useCallback(() => {
    setEventType((prev) =>
      prev ? { ...prev, isActive: !prev.isActive } : null,
    );
  }, []);

  const duplicate = useCallback((): EventType | null => {
    if (!eventType) return null;
    return {
      ...eventType,
      id: `et-${Date.now()}`,
      title: `${eventType.title} (Copy)`,
      slug: `${eventType.slug}-copy`,
    };
  }, [eventType]);

  return { eventType, isLoading, update, toggleActive, duplicate };
}
