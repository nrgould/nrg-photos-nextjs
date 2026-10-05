"use client";
import { useId, type ReactNode } from "react";
import { Mail, Moon, SlidersHorizontal, Sun } from "lucide-react";
import {
  Item,
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
  onContact: () => void;
}) {
  const id = useId();
  const row = (
    icon: ReactNode,
    label: string,
    onClick: (trigger: HTMLElement) => void,
  ) => (
    <Item
      render={
        <button
          type="button"
          onClick={(event) => onClick(event.currentTarget)}
        />
      }
      className={`${styles.row} text-left`}
    >
      <ItemMedia variant="icon">{icon}</ItemMedia>
      <ItemContent className={styles.rowContent}>
        <ItemTitle>{label}</ItemTitle>
      </ItemContent>
    </Item>
  );
  return (
    <section
      className={styles.panel}
      data-drawer-scroll
      aria-labelledby={`${id}-heading`}
    >
      <header className={styles.header}>
        <h2 id={`${id}-heading`} className={styles.heading}>
          Menu
        </h2>
      </header>
      <div className={styles.content}>
        <ItemGroup className={styles.rows}>
          {row(
            <SlidersHorizontal size={18} aria-hidden="true" />,
            "All presets",
            onPresets,
          )}
          {row(
            theme === "light" ? (
              <Moon size={18} aria-hidden="true" />
            ) : (
              <Sun size={18} aria-hidden="true" />
            ),
            `Switch to ${theme === "light" ? "dark" : "light"} mode`,
            onTheme,
          )}
          {row(<Mail size={18} aria-hidden="true" />, "Contact", onContact)}
        </ItemGroup>
      </div>
    </section>
  );
}
