"use client";

import React, { useState } from "react";

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
    role: string;
    department?: string;
    location?: string;
    timezone?: string;
    phone?: string;
    joinDate: string;
    lastActive?: string;
    socialLinks?: { platform: string; url: string }[];
  };
  isOwnProfile?: boolean;
  onUpdate?: (data: Record<string, string>) => void;
  className?: string;
}

export function UserProfile({
  user,
  isOwnProfile = false,
  onUpdate,
  className,
}: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: user.bio || "",
    location: user.location || "",
    phone: user.phone || "",
  });

  const handleSave = () => {
    onUpdate?.(formData);
    setIsEditing(false);
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className={`rounded-lg border bg-white ${className ?? ""}`}>
      <div className="h-32 rounded-t-lg bg-gradient-to-r from-indigo-500 to-purple-600" />

      <div className="relative px-6 pb-6">
        <div className="-mt-12 mb-4 flex items-end gap-4">
          <div className="h-24 w-24 overflow-hidden rounded-xl border-4 border-white bg-gray-200 shadow">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-indigo-100 text-2xl font-bold text-indigo-600">
                {initials}
              </div>
            )}
          </div>
          <div className="mb-1 flex-1">
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">
              {user.role}
              {user.department ? ` - ${user.department}` : ""}
            </p>
          </div>
          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {isEditing ? "Cancel" : "Edit Profile"}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              placeholder="Write a short bio..."
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Location"
                className="rounded-md border px-3 py-2 text-sm"
              />
              <input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Phone"
                className="rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleSave}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <>
            {user.bio && (
              <p className="mb-4 text-sm text-gray-600">{user.bio}</p>
            )}
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-gray-400">Email</div>
              <div className="text-gray-700">{user.email}</div>
              {user.location && (
                <>
                  <div className="text-gray-400">Location</div>
                  <div className="text-gray-700">{user.location}</div>
                </>
              )}
              {user.timezone && (
                <>
                  <div className="text-gray-400">Timezone</div>
                  <div className="text-gray-700">{user.timezone}</div>
                </>
              )}
              {user.phone && (
                <>
                  <div className="text-gray-400">Phone</div>
                  <div className="text-gray-700">{user.phone}</div>
                </>
              )}
              <div className="text-gray-400">Joined</div>
              <div className="text-gray-700">
                {new Date(user.joinDate).toLocaleDateString()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
