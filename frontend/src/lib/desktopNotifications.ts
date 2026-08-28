/**
 * desktopNotifications.ts
 *
 * Pure utility for OS-level desktop notifications via the Web Notifications API.
 * All functions are SSR-safe (guarded against `typeof window === "undefined"`).
 */

export type DesktopNotificationPayload = {
  /** Title shown in the OS notification. */
  title: string;
  /** Body text shown below the title. */
  body: string;
  /** Optional icon URL. Defaults to the Brana favicon. */
  icon?: string;
  /**
   * Optional URL to navigate to when the notification is clicked.
   * Relative paths (e.g. "/dashboard/admin/alerts") are resolved against `window.location.origin`.
   */
  dataUrl?: string;
  /**
   * Deduplication tag. Notifications with the same tag replace each other on supported platforms.
   * Use e.g. `"brana-rental-${id}"` to avoid stacking identical alerts.
   */
  tag?: string;
  /** Time-to-live in milliseconds before the notification auto-closes. Defaults to 6000. */
  ttl?: number;
};

/**
 * Default Brana icon — must be an absolute URL because the Notifications API
 * does not resolve relative paths against the page origin.
 * We build the full URL at runtime so it works on any host (localhost, prod, etc.).
 */
function getDefaultIcon(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/icon.jpg`;
}

import { useState, useEffect } from "react";

const DESKTOP_NOTIF_STORAGE_KEY = "brana_desktop_notif_enabled";

/**
 * Returns whether desktop OS notifications are enabled in local settings.
 * Defaults to true if permission is granted.
 */
export function isDesktopNotificationEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(DESKTOP_NOTIF_STORAGE_KEY);
  if (stored === null) return true;
  return stored === "true";
}

/**
 * Updates desktop notification enabled setting and dispatches a change event.
 */
export function setDesktopNotificationEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DESKTOP_NOTIF_STORAGE_KEY, String(enabled));
  window.dispatchEvent(
    new CustomEvent("brana_desktop_setting_changed", { detail: { enabled } })
  );
}

/**
 * React Hook for reactive desktop notification setting state.
 */
export function useDesktopNotificationSetting(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    setEnabled(isDesktopNotificationEnabled());

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === "boolean") {
        setEnabled(customEvent.detail.enabled);
      }
    };

    window.addEventListener("brana_desktop_setting_changed", handleCustomEvent);
    return () => {
      window.removeEventListener("brana_desktop_setting_changed", handleCustomEvent);
    };
  }, []);

  const updateSetting = (val: boolean) => {
    setDesktopNotificationEnabled(val);
    setEnabled(val);
  };

  return [enabled, updateSetting];
}

/**
 * Returns `true` if the Web Notifications API is available in this environment.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Returns the current browser notification permission state.
 * Returns `"unsupported"` on SSR or when the API isn't available.
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Requests notification permission from the user.
 * Must be called inside a user-gesture handler (click, keydown, etc.) to
 * avoid being silently blocked by the browser.
 *
 * @returns The resulting permission state, or `"unsupported"`.
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    // Some older browsers use callback-style requestPermission
    return new Promise((resolve) => {
      Notification.requestPermission((result) => resolve(result));
    });
  }
}

/**
 * Fires a native OS desktop notification **only** when:
 *   1. `document.hidden === true` (user is on another tab / window)
 *   2. Permission is `"granted"`
 *   3. The Notifications API is supported
 *
 * Clicking the notification will:
 *   - Focus the browser window / tab
 *   - Navigate to `dataUrl` (if provided)
 *   - Close the notification
 *
 * @returns The `Notification` instance if dispatched, or `null`.
 */
export function triggerDesktopNotification(
  payload: DesktopNotificationPayload
): Notification | null {
  if (!isNotificationSupported()) {
    console.warn("[Brana Notif] ❌ Web Notifications API not supported in this browser.");
    return null;
  }
  if (!isDesktopNotificationEnabled()) {
    console.log("[Brana Notif] 🔕 Desktop notifications disabled in user settings.");
    return null;
  }
  if (Notification.permission !== "granted") {
    console.warn(
      `[Brana Notif] ❌ Permission is "${Notification.permission}" — not "granted". ` +
      `Click the "Enable Desktop Notifications" banner to request access.`
    );
    return null;
  }
  if (typeof document !== "undefined" && !document.hidden) {
    console.info(
      "[Brana Notif] ℹ️ Tab is active (document.hidden = false) — skipping OS notification " +
      "(in-app toast handles active-tab events). Switch to another tab to test."
    );
    return null;
  }

  console.log(
    "[Brana Notif] ✅ Firing OS notification:",
    payload.title,
    "| hidden:", document.hidden,
    "| permission:", Notification.permission
  );

  const {
    title,
    body,
    // Always resolve to an absolute URL — relative paths fail in the Notifications API
    icon = getDefaultIcon(),
    dataUrl,
    tag,
    ttl = 6000,
  } = payload;

  // Ensure icon is absolute (caller may have passed a relative path)
  const resolvedIcon =
    icon && icon.startsWith("/")
      ? `${window.location.origin}${icon}`
      : icon;

  const options: NotificationOptions = {
    body,
    icon: resolvedIcon || undefined,
    tag,
    requireInteraction: false,
    silent: false,
  };

  let n: Notification;
  try {
    n = new Notification(title, options);
  } catch (err) {
    console.error(
      "[Brana Notif] ❌ new Notification() threw — check OS Do Not Disturb or browser restrictions:",
      err
    );
    return null;
  }

  n.onerror = (e) => {
    console.error("[Brana Notif] ❌ Notification error event:", e);
  };

  n.onclick = () => {
    n.close();
    window.focus();
    if (dataUrl) {
      const resolved = dataUrl.startsWith("/")
        ? `${window.location.origin}${dataUrl}`
        : dataUrl;
      window.location.href = resolved;
    }
  };

  // Auto-close after ttl
  const timer = setTimeout(() => n.close(), ttl);
  n.onclose = () => clearTimeout(timer);

  console.log("[Brana Notif] 🎉 Notification created successfully.");
  return n;
}

/**
 * Maps a Brana notification type to a human-readable title prefix.
 */
export function getNotificationTitle(type: string, role: "admin" | "student" = "student"): string {
  const map: Record<string, string> = {
    ALERT:       "⚠️ Alert",
    OVERDUE:     "📅 Overdue Notice",
    REMINDER:    "🔔 Reminder",
    RESERVATION: "📖 Reservation Update",
    WISHLIST:    "💛 Wishlist",
    NEW_BOOK:    "📚 New Book",
    SYSTEM:      "🔧 System",
    INFO:        role === "admin" ? "ℹ️ Admin Notice" : "ℹ️ Notice",
  };
  return map[type] ?? "🔔 Brana";
}

/**
 * Maps a Brana notification type to a deep-link URL.
 */
export function getNotificationUrl(
  type: string,
  role: "admin" | "student",
  notificationId?: string
): string {
  const idSuffix = notificationId ? `?notification=${notificationId}` : "";

  if (role === "admin") {
    const adminMap: Record<string, string> = {
      ALERT:       `/dashboard/admin/alerts?tab=notifications${notificationId ? `&notification=${notificationId}` : ""}`,
      OVERDUE:     `/dashboard/admin/overdue`,
      REMINDER:    `/dashboard/admin/alerts?tab=notifications${idSuffix}`,
      SYSTEM:      `/dashboard/admin/settings`,
    };
    return adminMap[type] ?? `/dashboard/admin/alerts?tab=notifications${idSuffix}`;
  }

  const studentMap: Record<string, string> = {
    ALERT:       `/dashboard/student/notifications${idSuffix}`,
    OVERDUE:     `/dashboard/student/history`,
    REMINDER:    `/dashboard/student/notifications${idSuffix}`,
    RESERVATION: `/dashboard/student/reservations`,
    WISHLIST:    `/dashboard/student/wishlist`,
    NEW_BOOK:    `/books`,
    SYSTEM:      `/dashboard/student/notifications${idSuffix}`,
    INFO:        `/dashboard/student/notifications${idSuffix}`,
  };
  return studentMap[type] ?? `/dashboard/student/notifications${idSuffix}`;
}
