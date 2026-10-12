// Each theme names its scheme (which light/dark rules apply) and, through its
// id, the token block in globals.css that recolors the explorer and the map.
export const themes = [
  { id: "light", label: "Light", scheme: "light" },
  { id: "dark", label: "Dark", scheme: "dark" },
  { id: "forest", label: "Forest", scheme: "dark" },
  { id: "mono", label: "Mono", scheme: "light" },
  { id: "blue-hour", label: "Blue hour", scheme: "dark" },
  { id: "golden-hour", label: "Golden hour", scheme: "light" },
  { id: "sepia", label: "Sepia", scheme: "dark" },
] as const;
export type Theme = (typeof themes)[number];
export type ThemeId = Theme["id"];
export const themeKey = "photography-theme";

/** A stored theme, else the system scheme. */
export function resolveTheme(stored: string | null, prefersDark: boolean) {
  return (
    themes.find((theme) => theme.id === stored) ?? themes[prefersDark ? 1 : 0]
  );
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement.dataset;
  root.photoTheme = theme.scheme;
  root.photoPalette = theme.id;
}

/** The pre-paint script: applies resolveTheme's choice before React hydrates. */
export const themeBootScript = `try{const s=${JSON.stringify(
  Object.fromEntries(themes.map((theme) => [theme.id, theme.scheme])),
)};let t=localStorage.getItem('${themeKey}');if(!s[t])t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';const d=document.documentElement.dataset;d.photoTheme=s[t];d.photoPalette=t}catch{}`;
