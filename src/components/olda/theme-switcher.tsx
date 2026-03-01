"use client";

/**
 * ThemeSwitcher — Bascule mode nuit + sélecteur de 6 thèmes couleur
 * ─ Moon/Sun : toggle dark/light via next-themes
 * ─ 6 dots colorés : changent l'accent principal (--primary) via data-color-theme
 * ─ Persistance localStorage pour le thème couleur
 */

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_THEMES = [
  { id: "blue",   color: "#0071e3", label: "Bleu"   },
  { id: "violet", color: "#8b5cf6", label: "Violet" },
  { id: "vert",   color: "#22c55e", label: "Vert"   },
  { id: "orange", color: "#f97316", label: "Orange" },
  { id: "rose",   color: "#ec4899", label: "Rose"   },
  { id: "indigo", color: "#4f46e5", label: "Indigo" },
] as const;

type ColorThemeId = typeof COLOR_THEMES[number]["id"];

const STORAGE_KEY = "olda-color-theme";

function applyColorTheme(id: ColorThemeId) {
  const html = document.documentElement;
  if (id === "blue") {
    html.removeAttribute("data-color-theme");
  } else {
    html.setAttribute("data-color-theme", id);
  }
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [colorTheme, setColorTheme] = useState<ColorThemeId>("blue");

  // Hydration guard
  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem(STORAGE_KEY) ?? "blue") as ColorThemeId;
    const valid = COLOR_THEMES.some((t) => t.id === saved) ? saved : "blue";
    setColorTheme(valid);
    applyColorTheme(valid);
  }, []);

  const handleColorTheme = useCallback((id: ColorThemeId) => {
    setColorTheme(id);
    applyColorTheme(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const toggleDark = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Évite le flash SSR
  if (!mounted) {
    return <div className="h-8 w-40 rounded-xl bg-transparent" />;
  }

  const isDark = theme === "dark";

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl",
      "bg-muted/80 border border-border/60",
      "backdrop-blur-sm"
    )}>
      {/* Toggle mode nuit */}
      <button
        onClick={toggleDark}
        title={isDark ? "Mode clair" : "Mode nuit"}
        className={cn(
          "h-6 w-6 rounded-lg flex items-center justify-center shrink-0",
          "text-muted-foreground hover:text-foreground transition-colors duration-150",
          "hover:bg-background/60"
        )}
        aria-label={isDark ? "Passer en mode clair" : "Passer en mode nuit"}
      >
        {isDark
          ? <Sun  className="h-3.5 w-3.5" />
          : <Moon className="h-3.5 w-3.5" />
        }
      </button>

      {/* Séparateur */}
      <div className="h-4 w-px bg-border/60 shrink-0" />

      {/* Dots couleur */}
      <div className="flex items-center gap-1">
        {COLOR_THEMES.map((t) => {
          const isActive = colorTheme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleColorTheme(t.id)}
              title={t.label}
              aria-label={`Thème ${t.label}`}
              className={cn(
                "h-4 w-4 rounded-full shrink-0 transition-all duration-150",
                "hover:scale-110 active:scale-95",
                isActive
                  ? "ring-2 ring-offset-1 ring-offset-transparent scale-110"
                  : "opacity-70 hover:opacity-100"
              )}
              style={{
                backgroundColor: t.color,
                // ring color matches the dot
                ...(isActive ? { boxShadow: `0 0 0 2px transparent, 0 0 0 3px ${t.color}` } : {}),
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
