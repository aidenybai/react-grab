"use client";

import { useState, useCallback } from "react";

interface EventTypeFormData {
  title: string;
  slug: string;
  description: string;
  duration: number;
  color: string;
  location: string;
  requiresConfirmation: boolean;
}

interface EventTypeFormProps {
  initialData?: Partial<EventTypeFormData>;
  onSubmit: (data: EventTypeFormData) => void;
  isLoading?: boolean;
}

export function EventTypeForm({
  initialData,
  onSubmit,
  isLoading,
}: EventTypeFormProps) {
  const [form, setForm] = useState<EventTypeFormData>({
    title: initialData?.title ?? "",
    slug: initialData?.slug ?? "",
    description: initialData?.description ?? "",
    duration: initialData?.duration ?? 30,
    color: initialData?.color ?? "#3b82f6",
    location: initialData?.location ?? "",
    requiresConfirmation: initialData?.requiresConfirmation ?? false,
  });

  const handleChange = useCallback(
    (field: keyof EventTypeFormData, value: unknown) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(form);
    },
    [form, onSubmit],
  );

  return (
    <form className="event-type-form" onSubmit={handleSubmit}>
      <div className="event-type-form__field">
        <label>Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </div>
      <div className="event-type-form__field">
        <label>URL Slug</label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => handleChange("slug", e.target.value)}
        />
      </div>
      <div className="event-type-form__field">
        <label>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={3}
        />
      </div>
      <div className="event-type-form__field">
        <label>Duration (minutes)</label>
        <input
          type="number"
          value={form.duration}
          onChange={(e) => handleChange("duration", Number(e.target.value))}
          min={5}
        />
      </div>
      <div className="event-type-form__field">
        <label>Color</label>
        <input
          type="color"
          value={form.color}
          onChange={(e) => handleChange("color", e.target.value)}
        />
      </div>
      <div className="event-type-form__field">
        <label>
          <input
            type="checkbox"
            checked={form.requiresConfirmation}
            onChange={(e) =>
              handleChange("requiresConfirmation", e.target.checked)
            }
          />
          Requires confirmation
        </label>
      </div>
      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Event Type"}
      </button>
    </form>
  );
}
