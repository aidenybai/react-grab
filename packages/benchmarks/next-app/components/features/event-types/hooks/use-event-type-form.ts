"use client";

import { useState, useCallback, useMemo } from "react";

interface EventTypeFormState {
  title: string;
  slug: string;
  description: string;
  duration: number;
  color: string;
  location: string;
  requiresConfirmation: boolean;
}

export function useEventTypeForm(initialValues?: Partial<EventTypeFormState>) {
  const [values, setValues] = useState<EventTypeFormState>({
    title: initialValues?.title ?? "",
    slug: initialValues?.slug ?? "",
    description: initialValues?.description ?? "",
    duration: initialValues?.duration ?? 30,
    color: initialValues?.color ?? "#3b82f6",
    location: initialValues?.location ?? "",
    requiresConfirmation: initialValues?.requiresConfirmation ?? false,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof EventTypeFormState, string>>
  >({});

  const setField = useCallback(
    <K extends keyof EventTypeFormState>(
      field: K,
      value: EventTypeFormState[K],
    ) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  const validate = useCallback((): boolean => {
    const newErrors: typeof errors = {};
    if (!values.title.trim()) newErrors.title = "Title is required";
    if (values.duration < 5)
      newErrors.duration = "Duration must be at least 5 minutes";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  return { values, errors, setField, validate, isDirty };
}
