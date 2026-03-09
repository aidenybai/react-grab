"use client";

import { useState, useCallback } from "react";

interface TeamSettingsFormProps {
  initialName: string;
  initialSlug: string;
  initialDescription?: string;
  onSave: (data: { name: string; slug: string; description: string }) => void;
  isLoading?: boolean;
}

export function TeamSettingsForm({
  initialName,
  initialSlug,
  initialDescription = "",
  onSave,
  isLoading = false,
}: TeamSettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSave({ name, slug, description });
    },
    [name, slug, description, onSave],
  );

  return (
    <form className="team-settings-form" onSubmit={handleSubmit}>
      <div className="team-settings-form__field">
        <label htmlFor="team-name">Team Name</label>
        <input
          id="team-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="team-settings-form__field">
        <label htmlFor="team-slug">URL Slug</label>
        <input
          id="team-slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </div>
      <div className="team-settings-form__field">
        <label htmlFor="team-desc">Description</label>
        <textarea
          id="team-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
