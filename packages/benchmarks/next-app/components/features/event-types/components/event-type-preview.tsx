"use client";

interface EventTypePreviewProps {
  title: string;
  duration: number;
  description?: string;
  location?: string;
  color?: string;
  userName: string;
  userAvatar?: string;
}

export function EventTypePreview({
  title,
  duration,
  description,
  location,
  color = "#3b82f6",
  userName,
  userAvatar,
}: EventTypePreviewProps) {
  return (
    <div className="event-type-preview">
      <div
        className="event-type-preview__header"
        style={{ backgroundColor: color }}
      >
        <div className="event-type-preview__user">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="event-type-preview__avatar"
            />
          ) : (
            <span className="event-type-preview__avatar-fallback">
              {userName[0]}
            </span>
          )}
          <span>{userName}</span>
        </div>
      </div>
      <div className="event-type-preview__body">
        <h2 className="event-type-preview__title">{title}</h2>
        <p className="event-type-preview__duration">{duration} min</p>
        {description && (
          <p className="event-type-preview__desc">{description}</p>
        )}
        {location && <p className="event-type-preview__location">{location}</p>}
      </div>
    </div>
  );
}
