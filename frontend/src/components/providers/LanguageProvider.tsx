"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import en from "@/lib/translations/en.json";
import am from "@/lib/translations/am.json";
import or from "@/lib/translations/or.json";

type Language = "en" | "am" | "or";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, variables?: Record<string, string | number>) => any;
}

const translations = {
  en,
  am,
  or,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "am" || savedLang === "or")) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (path: string, variables?: Record<string, string | number>) => {
    const keys = path.split(".");
    let result: any = translations[language];

    let found = true;
    for (const key of keys) {
      if (result && result[key]) {
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
        if (result && result[key]) {
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

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
