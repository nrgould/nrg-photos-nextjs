"use client";
import { useId } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Contrast,
  Download,
  FileText,
  Film,
  Instagram,
  Mail,
  Moon,
  MoonStar,
  Package,
  Sun,
  Sunset,
  Trees,
  type LucideIcon,
} from "lucide-react";
import { site } from "@/lib/site";
import { themes, type Theme, type ThemeId } from "@/lib/themes";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import styles from "./ExploreChallenges.module.css";

const themeIcons: Record<ThemeId, LucideIcon> = {
  light: Sun,
  dark: Moon,
  forest: Trees,
  mono: Contrast,
  "blue-hour": MoonStar,
  "golden-hour": Sunset,
  sepia: Film,
};

/** The theme's icon in its own ink on its own paper; also the desktop Theme dropdown's. */
export function ThemeSwatch({ id }: { id: ThemeId }) {
  const Icon = themeIcons[id];
  return (
    <span className="theme-swatch" data-theme-preview={id} aria-hidden="true">
      <Icon size={16} />
    </span>
  );
}

// The phone nav: presets, contact, links and themes in the bottom drawer.
export default function MenuPanel({
  theme,
  ownedCount,
  onPresets,
  onLibrary,
  onContact,
  onTheme,
}: {
  theme: ThemeId;
  ownedCount: number;
  onPresets: (trigger: HTMLElement) => void;
  onLibrary: (trigger: HTMLElement) => void;
  onContact: (trigger: HTMLElement) => void;
  onTheme: (theme: Theme) => void;
}) {
  const id = useId();
  return (
    <section
      className={styles.panel}
      data-drawer-scroll
      aria-labelledby={`${id}-heading`}
    >
      {/* The drawer's close button overlays the right end of this row. */}
      <header className={`${styles.header} ${styles.menuHeader}`}>
        <h2 id={`${id}-heading`} className={styles.heading}>
          Menu
        </h2>
      </header>
      <div className={`${styles.content} ${styles.menuContent}`}>
        <ItemGroup className={styles.menuGroup}>
          <Item
            render={
              <button
                type="button"
                onClick={(event) => onPresets(event.currentTarget)}
              />
            }
            className={styles.menuRow}
          >
            <ItemMedia variant="icon">
              <Package size={18} strokeWidth={1.5} aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>All presets</ItemTitle>
            </ItemContent>
            <ItemActions className={styles.menuTrailing}>
              <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
            </ItemActions>
          </Item>
          <Item render={<Link href="/presets" />} className={styles.menuRow}>
            <ItemMedia variant="icon">
              <Package size={18} strokeWidth={1.5} aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Preset pack</ItemTitle>
            </ItemContent>
          </Item>
          {ownedCount > 0 && (
            <Item
              render={
                <button
                  type="button"
                  onClick={(event) => onLibrary(event.currentTarget)}
                />
              }
              className={styles.menuRow}
            >
              <ItemMedia variant="icon">
                <Download size={18} strokeWidth={1.5} aria-hidden />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Your presets</ItemTitle>
              </ItemContent>
              <ItemActions className={styles.menuTrailing}>
                {ownedCount}
                <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
              </ItemActions>
            </Item>
          )}
        </ItemGroup>
        <ItemGroup className={styles.menuGroup}>
          <Item
            render={
              <button
                type="button"
                onClick={(event) => onContact(event.currentTarget)}
              />
            }
            className={styles.menuRow}
          >
            <ItemMedia variant="icon">
              <Mail size={18} strokeWidth={1.5} aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Contact</ItemTitle>
            </ItemContent>
            <ItemActions className={styles.menuTrailing}>
              <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
            </ItemActions>
          </Item>
          <Item
            render={
              <a href={site.instagram} target="_blank" rel="noreferrer" />
            }
            className={styles.menuRow}
          >
            <ItemMedia variant="icon">
              <Instagram size={18} strokeWidth={1.5} aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Instagram</ItemTitle>
            </ItemContent>
            <ItemActions className={styles.menuTrailing}>
              @nicholasgould1
              <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden />
            </ItemActions>
          </Item>
          <Item render={<Link href="/terms" />} className={styles.menuRow}>
            <ItemMedia variant="icon">
              <FileText size={18} strokeWidth={1.5} aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Terms</ItemTitle>
            </ItemContent>
          </Item>
        </ItemGroup>
        <h3 className={styles.menuLabel}>Theme</h3>
        <ItemGroup className={styles.menuGroup}>
          {themes.map((option) => (
            <Item
              key={option.id}
              render={
                <button
                  type="button"
                  aria-pressed={theme === option.id}
                  onClick={() => onTheme(option)}
                />
              }
              className={styles.menuRow}
            >
              <ItemMedia>
                <ThemeSwatch id={option.id} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{option.label}</ItemTitle>
              </ItemContent>
              {theme === option.id && (
                <Check size={16} strokeWidth={1.5} aria-hidden />
              )}
            </Item>
          ))}
        </ItemGroup>
      </div>
    </section>
  );
}
