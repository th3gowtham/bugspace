import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "bugspace_theme";
const DEFAULT_THEME: Theme = "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "light" || saved === "dark" ? saved : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  // Apply / remove the "dark" class on <html> whenever theme changes.
  // Using the root html element matches how Tailwind's darkMode: ["class"] works
  // and also allows a pre-load script in index.html to set the class before
  // React renders, preventing any flash-of-wrong-theme.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable in private-browsing edge cases
    }
  }, [theme]);

  const toggleTheme = () => {
    const root = document.documentElement;
    // Add transitioning class to trigger the ::before fade-wash overlay
    root.classList.add("theme-transitioning");
    // Small delay lets the wash overlay begin its fade-in before the class swap
    // so all colour variables change while the overlay is at peak opacity.
    setTimeout(() => {
      setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }, 40);
    // Remove the transitioning class once the animation (450 ms) completes
    setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 480);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
