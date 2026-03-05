interface Notification {
  id: number;
  title: string;
  description: string;
  timestamp: string;
  variant: "info" | "success" | "warning" | "error";
  isRead: boolean;
}

const VARIANT_ICON_CLASSES: Record<Notification["variant"], string> = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-amber-500",
  error: "text-red-500",
};

interface NotificationIconProps {
  variant: Notification["variant"];
}

const NotificationIcon = (props: NotificationIconProps) => {
  const iconColorClassName = VARIANT_ICON_CLASSES[props.variant];

  if (props.variant === "info") {
    return (
      <svg
        className={`w-5 h-5 shrink-0 ${iconColorClassName}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  if (props.variant === "success") {
    return (
      <svg
        className={`w-5 h-5 shrink-0 ${iconColorClassName}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  if (props.variant === "warning") {
    return (
      <svg
        className={`w-5 h-5 shrink-0 ${iconColorClassName}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`w-5 h-5 shrink-0 ${iconColorClassName}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
};

interface NotificationItemProps {
  notification: Notification;
}

const NotificationItem = (props: NotificationItemProps) => {
  const descriptionClassName =
    props.notification.variant === "success"
      ? "text-green-200"
      : "text-muted-foreground";

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-muted overflow-hidden relative">
      <NotificationIcon variant={props.notification.variant} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{props.notification.title}</p>
        <p className={`text-sm ${descriptionClassName}`}>
          {props.notification.description}
        </p>
      </div>

      <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
        {props.notification.timestamp}
      </span>

      {!props.notification.isRead && (
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary" />
      )}
    </div>
  );
};

const NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    title: "New comment on your post",
    description: "Alex replied to your design review",
    timestamp: "2 min ago",
    variant: "info",
    isRead: false,
  },
  {
    id: 2,
    title: "Deployment successful",
    description: "v2.4.0 deployed to production",
    timestamp: "15 min ago",
    variant: "success",
    isRead: false,
  },
  {
    id: 3,
    title: "Storage almost full",
    description: "You've used 90% of your storage",
    timestamp: "1 hour ago",
    variant: "warning",
    isRead: true,
  },
  {
    id: 4,
    title: "Build failed",
    description: "CI pipeline failed on main branch",
    timestamp: "2 hours ago",
    variant: "error",
    isRead: true,
  },
  {
    id: 5,
    title: "Team meeting in 30 min",
    description: "Daily standup starting soon",
    timestamp: "25 min ago",
    variant: "info",
    isRead: false,
  },
  {
    id: 6,
    title: "Payment received",
    description: "$49.00 from Acme Corp",
    timestamp: "3 hours ago",
    variant: "success",
    isRead: true,
  },
];

export const NotificationFeed = () => {
  const unreadCount = NOTIFICATIONS.filter(
    (notification) => !notification.isRead,
  ).length;

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm max-w-lg">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        <button className="text-sm text-muted-foreground hover:text-foreground">
          Mark all read
        </button>
      </div>

      <div className="divide-y divide-border">
        {NOTIFICATIONS.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  );
};
