"use client";
import { useId } from "react";
import { ChevronRight, Mail, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { presetCatalog } from "@/lib/preset-commerce";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
  onContact: () => void;
}) {
  const id = useId();
  const themes = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
  ] as const;
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
      <div className={`${styles.content} ${styles.menu}`}>
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
            render={<button type="button" onClick={onContact} />}
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
        <section aria-labelledby={`${id}-appearance`}>
          <h3 id={`${id}-appearance`} className={styles.savedHeading}>
            Appearance
          </h3>
          <ButtonGroup className={styles.menuThemes}>
            {themes.map(({ value, label, Icon }) => (
              <Button
                key={value}
                variant="control"
                aria-pressed={theme === value}
                onClick={() => theme !== value && onTheme()}
              >
                <Icon size={16} strokeWidth={1.5} aria-hidden />
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </section>
      </div>
    </section>
  );
}
