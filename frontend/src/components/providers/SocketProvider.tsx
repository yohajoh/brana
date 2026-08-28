"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  triggerDesktopNotification,
  getNotificationTitle,
  getNotificationUrl,
} from "@/lib/desktopNotifications";
import { playNotificationSound } from "@/lib/notificationSound";

type Notification = {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

type SocketContextType = {
  socket: Socket | null;
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
};

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")) ||
  "http://localhost:5000";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      // No explicit token needed — the browser sends the httpOnly JWT cookie
      // automatically on the WebSocket handshake when withCredentials is true.
      // The backend socket middleware reads it from socket.handshake.headers.cookie.
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("[Brana Socket] ✅ Connected:", newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("[Brana Socket] ❌ Connection error:", err.message);
    });

    newSocket.on("notification", (notification: Notification) => {
      // ── In-app state update ──────────────────────────────────────────────
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["all-notifications"] });

      // ── Desktop notification diagnostics ────────────────────────────────
      console.group("[Brana Socket] 🔔 notification event received");
      console.log("  payload   :", notification);
      console.log("  permission:", typeof Notification !== "undefined" ? Notification.permission : "unsupported");
      console.log("  hidden    :", document.hidden, "(true = user is on another tab)");
      console.log("  pathname  :", window.location.pathname);
      console.groupEnd();

      // ── Audible Notification Sound (plays visible or hidden if enabled) ──
      playNotificationSound();

      // ── OS Desktop notification (only fires when tab is in background) ──
      const role: "admin" | "student" = window.location.pathname.startsWith("/dashboard/admin")
        ? "admin"
        : "student";

      triggerDesktopNotification({
        title: getNotificationTitle(notification.type, role),
        body: notification.message,
        dataUrl: getNotificationUrl(notification.type, role, notification.id),
        tag: `brana-${notification.type.toLowerCase()}-${notification.id ?? Date.now()}`,
        ttl: 8000,
      });
    });

    newSocket.on("disconnect", () => {
      console.log("[Brana Socket] 🔌 Disconnected");
      setSocket(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient]);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        setNotifications,
        setUnreadCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}
