"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  imageSrc?: string;
  /** Custom button label. Defaults to "Got it". */
  buttonLabel?: string;
  /** When provided, the button navigates to this URL instead of closing. */
  buttonHref?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  imageSrc = "/auth/image copy.png",
  buttonLabel = "Got it",
  buttonHref,
}) => {
  if (!isOpen) return null;

  const buttonClass =
    "w-full rounded-xl bg-[#4A2B0B] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#5B3410] active:scale-95 transition-all duration-200 flex items-center justify-center";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#2B1A10]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-[#FFF7EA] p-8 shadow-2xl border border-[#D2BFA3] animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative h-20 w-20 transform hover:scale-105 transition-transform duration-300">
            <Image
              src={imageSrc}
              alt="Confirmation"
              fill
              className="object-cover rounded-2xl"
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-bold text-[#3B2718]">{title}</h3>
            <p className="text-sm leading-relaxed text-[#8B6B4A]">
              {message}
            </p>
          </div>

          {buttonHref ? (
            <Link href={buttonHref} className={buttonClass}>
              {buttonLabel}
            </Link>
          ) : (
            <button onClick={onClose} className={buttonClass}>
              {buttonLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
