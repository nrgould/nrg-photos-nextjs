"use client";
import { useId } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  Download,
  FileText,
  Instagram,
  Mail,
  Moon,
  Sun,
} from "lucide-react";
import { site } from "@/lib/site";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import styles from "./ExploreChallenges.module.css";

// Owned presets, contact, links and the theme toggle. Phones open it in the
// bottom drawer, desktop in the left sheet.
export default function MenuPanel({
  theme,
  ownedCount,
  onLibrary,
  onTheme,
  onContact,
}: {
  theme: "light" | "dark";
  ownedCount: number;
  onLibrary: (trigger: HTMLElement) => void;
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
      </header>
      <div className={styles.content}>
        <ItemGroup className={styles.menuGroup}>
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
              <ItemTitle>Terms and privacy</ItemTitle>
            </ItemContent>
          </Item>
          <Item
            render={<button type="button" onClick={onTheme} />}
            className={styles.menuRow}
          >
            <ItemMedia variant="icon">
              {theme === "light" ? (
                <Moon size={18} strokeWidth={1.5} aria-hidden />
              ) : (
                <Sun size={18} strokeWidth={1.5} aria-hidden />
              )}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                {theme === "light" ? "Dark mode" : "Light mode"}
              </ItemTitle>
            </ItemContent>
          </Item>
        </ItemGroup>
      </div>
    </section>
  );
}
