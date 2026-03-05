"use client";

// Define the name of the broadcast channel
const AUTH_CHANNEL_NAME = "brana_auth_channel";

/**
 * Sends a message to other tabs via BroadcastChannel.
 */
export function notifyAuthChange(type: "EMAIL_CONFIRMED" | "RESET_EMAIL_CLICK_SUCCESS") {
  if (typeof window !== "undefined" && window.BroadcastChannel) {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channel.postMessage({ type });
    channel.close();
  }
}

/**
 * Hook to listen for auth changes from other tabs.
 */
import { useEffect } from "react";

export function useAuthListener(onEvent: (type: string) => void) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.BroadcastChannel) return;

    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type) {
        onEvent(event.data.type);
      }
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [onEvent]);
}
