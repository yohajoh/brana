/**
 * notificationSound.ts
 *
 * Audio utility helper for managing and playing notification sound chimes.
 * Works seamlessly across foreground and background tab states.
 * Uses Web Audio API synthesizer with fallback to HTML5 Audio.
 */

import { useState, useEffect } from "react";

const SOUND_STORAGE_KEY = "brana_notification_sound_enabled";

// Shared AudioContext for Web Audio API synthesis
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Global user interaction listener to prime/unlock AudioContext
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };

  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
}

/**
 * Returns whether notification sound is enabled in localStorage.
 * Defaults to `true` if not explicitly configured.
 */
export function getNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(SOUND_STORAGE_KEY);
  if (stored === null) return true;
  return stored === "true";
}

/**
 * Updates notification sound preference and dispatches an event for UI reactivity.
 */
export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  window.dispatchEvent(
    new CustomEvent("brana_sound_setting_changed", { detail: { enabled } })
  );

  // If enabling, prime/unlock audio context
  if (enabled) {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }
}

/**
 * React Hook for reactive notification sound setting state.
 */
export function useNotificationSoundSetting(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    setEnabled(getNotificationSoundEnabled());

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === "boolean") {
        setEnabled(customEvent.detail.enabled);
      }
    };

    window.addEventListener("brana_sound_setting_changed", handleCustomEvent);
    return () => {
      window.removeEventListener("brana_sound_setting_changed", handleCustomEvent);
    };
  }, []);

  const updateSetting = (val: boolean) => {
    setNotificationSoundEnabled(val);
    setEnabled(val);
  };

  return [enabled, updateSetting];
}

/**
 * Synthesizes a pleasant two-tone notification chime using Web Audio API.
 * High-fidelity, zero-latency, zero external network dependency.
 */
function playSynthesizedChime(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: B5 (987.77 Hz) - starting shortly after Tone 1
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.08);
    gain2.gain.setValueAtTime(0.22, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn("[Brana Sound] Web Audio synthesis failed:", err);
  }
}

/**
 * Plays the notification chime.
 * Checks `getNotificationSoundEnabled()` before playing unless `force = true`.
 * Plays regardless of document visibility (`document.hidden`).
 */
export function playNotificationSound(force = false): void {
  if (typeof window === "undefined") return;
  if (!force && !getNotificationSoundEnabled()) {
    console.log("[Brana Sound] 🔇 Sound is disabled by user setting.");
    return;
  }

  console.log("[Brana Sound] 🔊 Playing notification sound chime (hidden:", document.hidden, ")");

  // Try HTML5 Audio first
  const audio = new Audio("/sounds/notification.mp3");
  audio.volume = 0.6;

  const playPromise = audio.play();

  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // If HTML5 Audio play failed (e.g. file missing or autoplay policy block), use Web Audio synth
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === "suspended") {
          ctx.resume().then(() => playSynthesizedChime(ctx)).catch(() => {});
        } else {
          playSynthesizedChime(ctx);
        }
      }
    });
  }
}

/**
 * Plays a preview of the notification sound chime (ignores current disabled setting).
 * Also primes the browser audio context.
 */
export function previewNotificationSound(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().then(() => playNotificationSound(true)).catch(() => playNotificationSound(true));
  } else {
    playNotificationSound(true);
  }
}
