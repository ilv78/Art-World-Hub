import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

export type Palette =
  | "sunset" | "ocean" | "forest" | "royal" | "rose" | "crimson"
  | "amber" | "teal" | "indigo" | "slate" | "coral" | "lavender";

export const palettes: { id: Palette; label: string; color: string }[] = [
  { id: "sunset", label: "Sunset Orange", color: "hsl(25, 95%, 53%)" },
  { id: "ocean", label: "Ocean Blue", color: "hsl(210, 90%, 50%)" },
  { id: "forest", label: "Forest Green", color: "hsl(150, 70%, 40%)" },
  { id: "royal", label: "Royal Purple", color: "hsl(270, 70%, 55%)" },
  { id: "rose", label: "Rose Pink", color: "hsl(345, 80%, 55%)" },
  { id: "crimson", label: "Crimson Red", color: "hsl(0, 85%, 50%)" },
  { id: "amber", label: "Amber Gold", color: "hsl(45, 95%, 50%)" },
  { id: "teal", label: "Teal", color: "hsl(175, 75%, 40%)" },
  { id: "indigo", label: "Indigo", color: "hsl(240, 65%, 55%)" },
  { id: "slate", label: "Slate", color: "hsl(215, 20%, 50%)" },
  { id: "coral", label: "Coral", color: "hsl(16, 90%, 60%)" },
  { id: "lavender", label: "Lavender", color: "hsl(280, 55%, 65%)" },
];

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultPalette?: Palette;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  palette: Palette;
  setPalette: (palette: Palette) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  palette: "sunset",
  setPalette: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  defaultPalette = "sunset",
  storageKey = "artverse-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  const [palette, setPalette] = useState<Palette>(
    () => (getCookie("artverse-palette") as Palette) || defaultPalette
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const paletteClasses = palettes.map((p) => `palette-${p.id}`);
    root.classList.remove(...paletteClasses);
    if (palette !== "sunset") {
      root.classList.add(`palette-${palette}`);
    }
  }, [palette]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    palette,
    setPalette: (palette: Palette) => {
      setCookie("artverse-palette", palette);
      setPalette(palette);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
