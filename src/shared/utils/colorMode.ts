/** Matches @adminlte/react ColorModeProvider (`localStorage` key `lte-theme`). */
export type ColorMode = "light" | "dark" | "auto";

const STORAGE_KEY = "lte-theme";

export function readStoredColorMode(fallback: ColorMode = "auto"): ColorMode {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "auto") {
      return saved;
    }
  } catch {
    /* private mode / blocked storage */
  }

  return fallback;
}

export function resolveColorMode(mode: ColorMode): "light" | "dark" {
  if (mode === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return mode;
}
