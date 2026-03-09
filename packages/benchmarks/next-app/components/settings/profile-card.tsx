"use client";

import React, { useState } from "react";

interface ProfileData {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
}

interface ProfileCardProps {
  profile: ProfileData;
  onSave?: (profile: ProfileData) => void;
  editable?: boolean;
  className?: string;
}

export function ProfileCard({
  profile: initialProfile,
  onSave,
  editable = true,
  className,
}: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(initialProfile);

  const handleSave = () => {
    onSave?.(profile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setProfile(initialProfile);
    setIsEditing(false);
  };

  return (
    <div className={`rounded-lg border bg-white p-6 ${className ?? ""}`}>
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-medium text-gray-500">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <input
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                className="w-full rounded border px-2 py-1 text-sm"
                placeholder="Name"
              />
              <input
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                className="w-full rounded border px-2 py-1 text-sm"
                placeholder="Email"
              />
              <textarea
                value={profile.bio ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, bio: e.target.value })
                }
                className="w-full rounded border px-2 py-1 text-sm"
                placeholder="Bio"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900">
                {profile.name}
              </h3>
              <p className="text-sm text-gray-500">{profile.email}</p>
              {profile.bio && (
                <p className="mt-2 text-sm text-gray-600">{profile.bio}</p>
              )}
              {profile.location && (
                <p className="mt-1 text-xs text-gray-400">{profile.location}</p>
              )}
              {editable && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-3 text-sm text-indigo-600 hover:underline"
                >
                  Edit profile
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileCard;
