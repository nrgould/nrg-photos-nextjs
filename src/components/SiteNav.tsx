"use client";

import { useEffect, useState, type ReactNode, type Ref } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Download,
  Mail,
  Menu as MenuIcon,
  Package,
  Palette,
} from "lucide-react";
import { track } from "@/lib/analytics";
import {
  applyTheme,
  resolveTheme,
  themeKey,
  themes,
  type Theme,
  type ThemeId,
} from "@/lib/themes";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "./ui/item";
import { ThemeSwatch } from "./MenuPanel";
import { usePresetCart } from "./PresetCartProvider";

/** The stored theme, else the system scheme. */
export function currentTheme() {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(themeKey);
  } catch {}
  return resolveTheme(
    stored,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
}

export function switchTheme(next: Theme) {
  track("theme-changed", { theme: next.id });
  const root = document.documentElement;
  root.classList.add("theme-switching");
  applyTheme(next);
  void root.offsetHeight;
  requestAnimationFrame(() => root.classList.remove("theme-switching"));
  try {
    localStorage.setItem(themeKey, next.id);
  } catch {}
}

/** Top-left site nav: the map's toolbar, and the header of the site pages. */
export default function SiteNav({
  search,
  onMenu,
  menuOpen,
  presetsTrigger,
  ownedCount,
  theme,
  onTheme,
  onPresets,
  onLibrary,
  onContact,
  contactOpen,
}: {
  search?: ReactNode;
  /** Phones on the map: one Menu button in place of the rest. */
  onMenu?: (trigger: HTMLElement) => void;
  menuOpen?: boolean;
  presetsTrigger?: Ref<HTMLButtonElement>;
  ownedCount: number;
  theme: ThemeId;
  onTheme: (theme: Theme) => void;
  onPresets: () => void;
  onLibrary: () => void;
  onContact: (trigger: HTMLElement) => void;
  contactOpen?: boolean;
}) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <NavigationMenu
      className="map-toolbar"
      positionerClassName="explorer-overlay"
      aria-label="Site"
      value={value}
      onValueChange={setValue}
    >
      <NavigationMenuList>
        {onMenu ? (
          <NavigationMenuItem>
            <button
              type="button"
              className={navigationMenuTriggerStyle()}
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={(event) => onMenu(event.currentTarget)}
            >
              <MenuIcon size={18} aria-hidden="true" />
            </button>
          </NavigationMenuItem>
        ) : (
          <>
            {search && <NavigationMenuItem>{search}</NavigationMenuItem>}
            <NavigationMenuItem value="presets">
              <NavigationMenuTrigger ref={presetsTrigger}>
                <Package size={18} aria-hidden="true" />
                <span className="map-nav-label">Presets</span>
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ItemGroup className="map-nav-rows">
                  <Item
                    size="xs"
                    render={
                      <button
                        type="button"
                        onClick={() => {
                          setValue(null);
                          onPresets();
                        }}
                      />
                    }
                  >
                    <ItemContent>
                      <ItemTitle>All presets</ItemTitle>
                    </ItemContent>
                  </Item>
                  <Item size="xs" render={<Link href="/presets" />}>
                    <ItemContent>
                      <ItemTitle>Signature Collection</ItemTitle>
                    </ItemContent>
                  </Item>
                  {ownedCount > 0 && (
                    <Item
                      size="xs"
                      render={
                        <button
                          type="button"
                          onClick={() => {
                            setValue(null);
                            onLibrary();
                          }}
                        />
                      }
                    >
                      <ItemMedia variant="icon">
                        <Download size={16} aria-hidden="true" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>Your presets</ItemTitle>
                      </ItemContent>
                      <span className="map-nav-count">{ownedCount}</span>
                    </Item>
                  )}
                </ItemGroup>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="theme">
              <NavigationMenuTrigger aria-label="Theme">
                <Palette size={18} aria-hidden="true" />
                <span className="map-nav-label">Theme</span>
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ItemGroup className="map-nav-rows">
                  {themes.map((option) => (
                    <Item
                      key={option.id}
                      size="xs"
                      render={
                        <button
                          type="button"
                          aria-pressed={theme === option.id}
                          onClick={() => onTheme(option)}
                        />
                      }
                    >
                      <ItemMedia>
                        <ThemeSwatch id={option.id} />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{option.label}</ItemTitle>
                      </ItemContent>
                      {theme === option.id && (
                        <Check size={16} aria-hidden="true" />
                      )}
                    </Item>
                  ))}
                </ItemGroup>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <button
                type="button"
                className={navigationMenuTriggerStyle()}
                aria-label="Contact"
                aria-expanded={contactOpen}
                onClick={(event) => onContact(event.currentTarget)}
              >
                <Mail size={18} aria-hidden="true" />
                <span className="map-nav-label">Contact</span>
              </button>
            </NavigationMenuItem>
          </>
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

/** The site pages' nav: drawer pages open on the map. */
export function SubpageNav() {
  const router = useRouter();
  const { ownedPresetIds } = usePresetCart();
  const [theme, setTheme] = useState<ThemeId>("light");
  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(currentTheme().id));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <header className="page-width site-nav">
      <SiteNav
        ownedCount={ownedPresetIds.length}
        theme={theme}
        onTheme={(next) => {
          switchTheme(next);
          setTheme(next.id);
        }}
        onPresets={() => router.push("/?view=catalog")}
        onLibrary={() => router.push("/?view=library")}
        onContact={() => router.push("/?view=contact")}
      />
    </header>
  );
}
