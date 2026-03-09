"use client";

import { useState, useCallback } from "react";

interface OrgSettingsFormProps {
  initialName: string;
  initialSlug: string;
  initialDescription?: string;
  initialLogoUrl?: string;
  onSave: (data: { name: string; slug: string; description: string }) => void;
  isLoading?: boolean;
}

export function OrgSettingsForm({
  initialName,
  initialSlug,
  initialDescription = "",
  initialLogoUrl,
  onSave,
  isLoading,
}: OrgSettingsFormProps) {
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
    <form className="org-settings-form" onSubmit={handleSubmit}>
      <div className="org-settings-form__logo">
        {initialLogoUrl ? (
          <img src={initialLogoUrl} alt="Logo" width={64} height={64} />
        ) : (
          <div className="org-settings-form__logo-placeholder">Upload Logo</div>
        )}
      </div>
      <div className="org-settings-form__field">
        <label>Organization Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="org-settings-form__field">
        <label>URL Slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
      </div>
      <div className="org-settings-form__field">
        <label>Description</label>
        <textarea
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
