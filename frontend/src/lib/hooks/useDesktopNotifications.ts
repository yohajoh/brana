/**
 * useDesktopNotifications.ts
 *
 * React hook that:
 *  - Tracks notification permission state reactively
 *  - Exposes `requestPermission()` for explicit user-gesture triggers
 *  - Exposes `notify()` — a type-aware wrapper that builds the correct
 *    title, body, icon and dataUrl and delegates to `triggerDesktopNotification`
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  triggerDesktopNotification,
  getNotificationTitle,
  getNotificationUrl,
  type DesktopNotificationPayload,
} from "@/lib/desktopNotifications";

export type NotificationPermissionState =
  | NotificationPermission
  | "unsupported";

export type NotifyOptions = {
  /** The raw notification object from the socket / API. */
  notification: {
    id: string;
    message: string;
    type: string;
  };
  /** Which portal is triggering this — determines deep-link routing. */
  role: "admin" | "student";
  /** Override options (merged on top of defaults). */
  overrides?: Partial<DesktopNotificationPayload>;
};

export function useDesktopNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    () => (typeof window !== "undefined" ? getNotificationPermission() : "unsupported")
  );

  // Stay in sync if the user grants/denies from browser settings while the tab is open
  useEffect(() => {
    if (!isNotificationSupported()) return;

    // PermissionStatus is not always available, guard defensively
    let permStatus: PermissionStatus | null = null;

    navigator.permissions
      ?.query({ name: "notifications" as PermissionName })
      .then((ps) => {
        permStatus = ps;
        const update = () =>
          setPermission(ps.state === "prompt" ? "default" : (ps.state as NotificationPermission));
        ps.addEventListener("change", update);
      })
      .catch(() => {
        /* non-fatal — some browsers don't support permissions.query for notifications */
      });

    return () => {
      if (permStatus) {
        permStatus.removeEventListener("change", () => {});
      }
    };
  }, []);

  /**
   * Must be called inside a user gesture (button click etc.).
   * Returns the new permission state.
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  /**
   * Fires a desktop notification for a Brana notification object.
   * Safe to call unconditionally — internally checks `document.hidden` and
   * `Notification.permission` before doing anything.
   */
  const notify = useCallback(
    ({ notification, role, overrides }: NotifyOptions): Notification | null => {
      return triggerDesktopNotification({
        title: getNotificationTitle(notification.type, role),
        body: notification.message,
        dataUrl: getNotificationUrl(notification.type, role, notification.id),
        tag: `brana-${notification.type.toLowerCase()}-${notification.id}`,
        ttl: 8000,
        ...overrides,
      });
    },
    []
  );

  return {
    /** Current OS permission state. */
    permission,
    /** Whether the Notifications API is supported in this browser. */
    isSupported: isNotificationSupported(),
    /** Whether permission has already been granted. */
    isGranted: permission === "granted",
    /** Whether permission was explicitly denied (cannot re-prompt). */
    isDenied: permission === "denied",
    /** Whether we can still ask (never asked, or "default" state). */
    canRequest: permission === "default",
    /** Request permission — call only from a user-gesture handler. */
    requestPermission,
    /** Dispatch a desktop notification for a Brana notification payload. */
    notify,
  };
}
