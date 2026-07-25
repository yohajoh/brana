"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCalendarStatus, useCalendarDisconnect } from "@/lib/hooks/useQueries";
import { API_BASE_URL } from "@/lib/api";
import { useLanguage } from "@/components/providers/LanguageProvider";

// Derive the backend origin URL (always strip trailing /api if present)
// API_BASE_URL is typically "http://localhost:5000/api" — we need just "http://localhost:5000"
const getBackendOrigin = () => {
  const base = (API_BASE_URL || "http://localhost:5000/api").replace(/\/+$/, "");
  return base.endsWith("/api") ? base.slice(0, -4) : base;
};

export const GoogleCalendarSettings = () => {
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useCalendarStatus();
  const disconnect = useCalendarDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);

  const calendarStatus = data?.data;
  const isConnected = calendarStatus?.connected ?? false;

  // After user returns from Google OAuth, check if ?calendar=connected is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      // Remove the query param without reloading the page
      const url = new URL(window.location.href);
      url.searchParams.delete("calendar");
      window.history.replaceState({}, "", url.toString());
      // Refresh status
      void refetch();
      toast.success("Google Calendar connected successfully!");
    }
    if (params.get("error") === "google_calendar_callback_error") {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
      toast.error("Failed to connect Google Calendar. Please try again.");
    }
    if (params.get("error") === "google_calendar_no_refresh_token") {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
      toast.error("Calendar permission not granted. Please try again and allow calendar access.");
    }
  }, [refetch]);

  const handleConnect = () => {
    setIsConnecting(true);
    // Redirect to the backend Google Calendar OAuth flow
    window.location.href = `${getBackendOrigin()}/api/auth/google-calendar`;
  };

  const handleDisconnect = async () => {
    const confirmed = window.confirm(
      String(t("student_settings.calendar_disconnect_confirm"))
    );
    if (!confirmed) return;

    try {
      await disconnect.mutateAsync();
      toast.success(String(t("student_settings.calendar_disconnect_success")));
    } catch {
      toast.error(String(t("student_settings.calendar_disconnect_error")));
    }
  };

  const formattedDate = calendarStatus?.connected_at
    ? new Date(calendarStatus.connected_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-xl font-serif font-extrabold text-primary flex items-center gap-2">
          {/* Google Calendar coloured icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect x="6" y="6" width="36" height="36" rx="4" fill="white" stroke="#E0E0E0" strokeWidth="2" />
            <rect x="6" y="14" width="36" height="2" fill="#4285F4" />
            <rect x="14" y="6" width="2" height="8" rx="1" fill="#DB4437" />
            <rect x="32" y="6" width="2" height="8" rx="1" fill="#DB4437" />
            <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1A73E8">
              {new Date().getDate()}
            </text>
          </svg>
          {String(t("student_settings.calendar_title"))}
        </h3>
        <p className="text-sm text-secondary">
          {String(t("student_settings.calendar_subtitle"))}
        </p>
      </div>

      {/* Status Card */}
      <div className="max-w-2xl rounded-2xl border border-border bg-card p-5 space-y-4">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-5 w-40 bg-muted/50 rounded-lg" />
            <div className="h-4 w-56 bg-muted/50 rounded-lg" />
          </div>
        ) : isError ? (
          <p className="text-sm text-red-600">
            {String(t("student_settings.calendar_status_error"))}
          </p>
        ) : (
          <>
            {/* Connection status row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {/* Status dot */}
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    isConnected ? "bg-green-500" : "bg-secondary/40"
                  }`}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-bold text-primary">
                    {isConnected
                      ? String(t("student_settings.calendar_connected_badge"))
                      : String(t("student_settings.calendar_not_connected"))}
                  </p>
                  {isConnected && calendarStatus?.email && (
                    <p className="text-xs text-secondary mt-0.5">
                      {String(t("student_settings.calendar_connected_label"))}:{" "}
                      <span className="font-semibold text-primary/80">
                        {calendarStatus.email}
                      </span>
                    </p>
                  )}
                  {isConnected && formattedDate && (
                    <p className="text-xs text-secondary/70 mt-0.5">
                      {String(t("student_settings.calendar_connected_since"))}: {formattedDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Action button */}
              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={disconnect.isPending}
                  className="px-5 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-extrabold hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {disconnect.isPending
                    ? String(t("student_settings.calendar_disconnecting"))
                    : String(t("student_settings.calendar_disconnect_btn"))}
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-5 py-2.5 rounded-xl bg-[#1A73E8] text-white text-xs font-extrabold hover:bg-[#1558b0] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm flex items-center gap-2"
                >
                  {/* Google G logo */}
                  {!isConnecting && (
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#fff"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#fff"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#fff"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#fff"
                      />
                    </svg>
                  )}
                  {isConnecting
                    ? String(t("student_settings.calendar_connecting"))
                    : String(t("student_settings.calendar_connect_btn"))}
                </button>
              )}
            </div>

            {/* Info note */}
            {!isConnected && (
              <p className="text-xs text-secondary/70 border-t border-border/50 pt-3">
                {String(t("student_settings.calendar_connect_info"))}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
