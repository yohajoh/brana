"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Bell, CheckCircle2, AlertCircle, Play } from "lucide-react";
import {
  useNotificationSoundSetting,
  previewNotificationSound,
} from "@/lib/notificationSound";
import { useDesktopNotifications } from "@/lib/hooks/useDesktopNotifications";

export function NotificationSettings() {
  const [soundEnabled, setSoundEnabled] = useNotificationSoundSetting();
  const { permission, isSupported, requestPermission } = useDesktopNotifications();
  const [requesting, setRequesting] = useState(false);

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState) {
      // Play brief confirmation preview chime when turned ON
      previewNotificationSound();
    }
  };

  const handleEnableDesktop = async () => {
    setRequesting(true);
    try {
      await requestPermission();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-serif font-black text-[#0d0d0d]">Notification Preferences</h3>
        <p className="text-xs text-[#0d0d0d]/45 mt-0.5">
          Customize sound chimes and desktop alert settings for your account.
        </p>
      </div>

      <div className="space-y-4">
        {/* Sound Chime Toggle Block */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-[#f8f7f5] rounded-2xl border border-[#e8e4dc] transition-all hover:border-[#0d0d0d]/20">
          <div className="flex items-start gap-3.5 pr-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                soundEnabled ? "bg-[#142b6f] text-[#f5c518]" : "bg-[#e8e4dc] text-[#0d0d0d]/40"
              }`}
            >
              {soundEnabled ? <Volume2 size={20} strokeWidth={2.2} /> : <VolumeX size={20} strokeWidth={2} />}
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#0d0d0d]">Audible Notification Sound</p>
              <p className="text-[11.5px] text-[#0d0d0d]/50 mt-0.5 leading-relaxed">
                Play an audible chime when new notifications arrive (works in active & background tabs).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Preview Button */}
            <button
              type="button"
              onClick={previewNotificationSound}
              title="Test chime sound"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e8e4dc] bg-white text-[11px] font-bold text-[#0d0d0d] hover:bg-[#f0eeea] active:scale-95 transition-all shadow-sm"
            >
              <Play size={11} className="fill-current text-[#142b6f]" />
              <span>Test Sound</span>
            </button>

            {/* Switch Toggle */}
            <button
              id="student-sound-toggle-btn"
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={handleToggleSound}
              className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                soundEnabled ? "bg-[#142b6f]" : "bg-[#d1d5db]"
              }`}
            >
              <span
                className={`absolute top-0.75 left-0.75 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                  soundEnabled ? "translate-x-5.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Desktop OS Notifications Status Block */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-[#f8f7f5] rounded-2xl border border-[#e8e4dc]">
          <div className="flex items-start gap-3.5 pr-3">
            <div className="w-10 h-10 rounded-xl bg-[#142b6f]/10 text-[#142b6f] flex items-center justify-center shrink-0">
              <Bell size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#0d0d0d]">Desktop OS Notifications</p>
              <p className="text-[11.5px] text-[#0d0d0d]/50 mt-0.5 leading-relaxed">
                Receive native desktop alerts when you are working in another tab or application.
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold">
                {permission === "granted" && (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 size={12} /> Granted & Active
                  </span>
                )}
                {permission === "denied" && (
                  <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <AlertCircle size={12} /> Blocked in Browser Settings
                  </span>
                )}
                {permission === "default" && isSupported && (
                  <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                    Not Prompted Yet
                  </span>
                )}
              </div>
            </div>
          </div>

          {permission !== "granted" && isSupported && (
            <button
              type="button"
              onClick={handleEnableDesktop}
              disabled={requesting || permission === "denied"}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-[#142b6f] text-white text-[12px] font-bold hover:bg-[#1e3a8a] disabled:opacity-50 transition-all shadow-sm"
            >
              {requesting ? "Requesting..." : permission === "denied" ? "Blocked" : "Enable"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
