"use client";

import { useState, useRef } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { motion, AnimatePresence } from "framer-motion";

type Props = { onSearch: (query: string) => void };

export const SearchBar = ({ onSearch }: Props) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (e.target.value.length === 0) onSearch("");
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <motion.div
        animate={{
          boxShadow: focused
            ? "0 0 0 3px rgba(20,43,111,0.12), 0 4px 20px rgba(20,43,111,0.10)"
            : "0 2px 8px rgba(20,43,111,0.06)",
        }}
        transition={{ duration: 0.2 }}
        className="relative flex items-center rounded-2xl border border-[#e2e0e7] bg-white overflow-hidden"
        style={{ borderColor: focused ? "#0d0d0d" : undefined }}
      >
        <div className="pl-4 pr-2 shrink-0">
          <SearchIcon size={18} className={`transition-colors ${focused ? "text-[#0d0d0d]" : "text-[#9ca3af]"}`} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t("shared.search_placeholder") as string}
          className="flex-1 py-3.5 pr-2 text-sm text-[#0d0d0d] placeholder:text-[#b0afc0] bg-transparent outline-none"
        />

        {/* Clear button */}
        <AnimatePresence>
          {query.length > 0 && (
            <motion.button
              type="button"
              onClick={handleClear}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              className="mr-1 p-1.5 rounded-lg text-[#9ca3af] hover:text-[#374151] hover:bg-[#f1f0f4] transition-colors"
            >
              <X size={14} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className="m-1.5 px-4 py-2 rounded-xl bg-[#f5c518] text-[#0d0d0d] text-xs font-black shrink-0 shadow-[0_2px_8px_rgba(245,197,24,0.35)] hover:shadow-[0_4px_14px_rgba(245,197,24,0.50)] transition-shadow"
        >
          <SearchIcon size={14} />
        </motion.button>
      </motion.div>
    </form>
  );
};
