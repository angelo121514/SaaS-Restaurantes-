import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
      aria-label="Toggle theme"
    >
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all absolute ${
          isDark ? "scale-0 rotate-90" : "scale-100 rotate-0"
        }`}
      />
      <Moon
        className={`h-[1.2rem] w-[1.2rem] transition-all absolute ${
          isDark ? "scale-100 rotate-0" : "scale-0 -rotate-90"
        }`}
      />
    </button>
  );
}
