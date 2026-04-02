"use client";

import React, { createContext, useContext, useState } from "react";
import en from "@/lib/translations/en.json";
import am from "@/lib/translations/am.json";
import or from "@/lib/translations/or.json";

type Language = "en" | "am" | "or";
type TranslationValue = string | number | boolean | null | TranslationMap | TranslationValue[];
type TranslationMap = { [key: string]: TranslationValue };

const isLanguage = (value: string | null): value is Language => value === "en" || value === "am" || value === "or";

const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") return "en";
  const savedLang = localStorage.getItem("language");
  return isLanguage(savedLang) ? savedLang : "en";
};

const isTranslationMap = (value: TranslationValue): value is TranslationMap =>
  typeof value === "object" && value !== null && !Array.isArray(value);

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, variables?: Record<string, string | number>) => TranslationValue;
}

const translations: Record<Language, TranslationMap> = {
  en: en as TranslationMap,
  am: am as TranslationMap,
  or: or as TranslationMap,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (path: string, variables?: Record<string, string | number>): TranslationValue => {
    const keys = path.split(".");
    let result: TranslationValue = translations[language];

    let found = true;
    for (const key of keys) {
      if (isTranslationMap(result) && key in result) {
        result = result[key];
      } else {
        found = false;
        break;
      }
    }

    if (!found) {
      // Fallback to English if translation is missing
      result = translations["en"];
      for (const key of keys) {
        if (isTranslationMap(result) && key in result) {
          result = result[key];
        } else {
          return path; // Return path if even fallback fails
        }
      }
    }

    if (typeof result === "string" && variables) {
      Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{${key}}`, "g"), String(value));
      });
    }

    return result;
  };

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
