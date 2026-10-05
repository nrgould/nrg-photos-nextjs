"use client";
import { useId } from "react";
import { ChevronRight, Mail, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { presetCatalog } from "@/lib/preset-commerce";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import styles from "./ExploreChallenges.module.css";

// Phones keep presets, theme and contact here instead of on the map.
export default function MenuPanel({
  theme,
  onPresets,
  onTheme,
  onContact,
}: {
  theme: "light" | "dark";
  onPresets: (trigger: HTMLElement) => void;
  onTheme: () => void;
  onContact: (trigger: HTMLElement) => void;
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
        <Button
          variant="quiet"
          className={styles.menuTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          onClick={onTheme}
        >
          {theme === "light" ? (
            <Moon size={18} strokeWidth={1.5} aria-hidden />
          ) : (
            <Sun size={18} strokeWidth={1.5} aria-hidden />
          )}
        </Button>
      </header>
      <div className={styles.content}>
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
              <SlidersHorizontal size={18} strokeWidth={1.5} aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>All presets</ItemTitle>
            </ItemContent>
            <ItemActions className={styles.menuTrailing}>
              {presetCatalog.length}
              <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
            </ItemActions>
          </Item>
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
          </Item>
        </ItemGroup>
      </div>
    </section>
  );
}
