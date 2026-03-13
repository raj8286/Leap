import { create } from "zustand";

const THEMES = ["light", "dark"];
const storedTheme = localStorage.getItem("leap-theme");
const initialTheme = THEMES.includes(storedTheme) ? storedTheme : "light";

export const useThemeStore = create((set, get) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    const safeTheme = THEMES.includes(theme) ? theme : "light";
    localStorage.setItem("leap-theme", safeTheme);
    set({ theme: safeTheme });
  },
  toggleTheme: () => {
    const nextTheme = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("leap-theme", nextTheme);
    set({ theme: nextTheme });
  },
}));
