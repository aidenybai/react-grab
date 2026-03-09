"use client";
import { useState, useCallback } from "react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: Date;
}

export const useNotificationsList = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const add = useCallback(
    (title: string, message: string, type: Notification["type"] = "info") => {
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title,
          message,
          type,
          read: false,
          createdAt: new Date(),
        },
        ...prev,
      ]);
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    add,
    markRead,
    markAllRead,
    remove,
    clearAll,
    unreadCount,
  };
};
