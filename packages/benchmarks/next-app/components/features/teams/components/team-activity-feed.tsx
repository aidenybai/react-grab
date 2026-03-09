"use client";

interface ActivityItem {
  id: string;
  type: "member_joined" | "member_left" | "role_changed" | "settings_updated";
  actorName: string;
  targetName?: string;
  timestamp: Date;
  details?: string;
}

interface TeamActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

function formatActivity(item: ActivityItem): string {
  switch (item.type) {
    case "member_joined":
      return `${item.actorName} joined the team`;
    case "member_left":
      return `${item.actorName} left the team`;
    case "role_changed":
      return `${item.actorName} changed ${item.targetName}'s role`;
    case "settings_updated":
      return `${item.actorName} updated team settings`;
    default:
      return `${item.actorName} performed an action`;
  }
}

export function TeamActivityFeed({
  activities,
  isLoading,
}: TeamActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="team-activity-feed team-activity-feed--loading">
        Loading...
      </div>
    );
  }

  return (
    <div className="team-activity-feed">
      <h3 className="team-activity-feed__title">Recent Activity</h3>
      <ul className="team-activity-feed__list">
        {activities.map((item) => (
          <li key={item.id} className="team-activity-feed__item">
            <p className="team-activity-feed__text">{formatActivity(item)}</p>
            <time className="team-activity-feed__time">
              {item.timestamp.toLocaleDateString()}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
