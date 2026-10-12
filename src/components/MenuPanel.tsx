"use client";
import { useId } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  Download,
  FileText,
  Instagram,
  Moon,
  Sun,
} from "lucide-react";
import { site } from "@/lib/site";
import { photoUrl, portrait } from "@/lib/photography";
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

// Who Nicholas is and how to hire him, then owned presets, links and appearance.
// Phones open it in the bottom drawer, desktop in the left sheet.
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
        <div className={styles.brand}>
          <div className={styles.brandIdentity}>
            <Image
              className={styles.brandPortrait}
              src={photoUrl(portrait.src)}
              alt={portrait.alt}
              width={56}
              height={56}
              sizes="56px"
            />
            <div>
              <p className={styles.brandName}>{site.name}</p>
              <p className={styles.brandMeta}>Photographer, North Carolina</p>
            </div>
          </div>
          <Button
            className={styles.brandAction}
            onClick={(event) => onContact(event.currentTarget)}
          >
            Work with me
          </Button>
        </div>
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
          <Item className={styles.menuRow}>
            <ItemMedia variant="icon">
              {theme === "light" ? (
                <Sun size={18} strokeWidth={1.5} aria-hidden />
              ) : (
                <Moon size={18} strokeWidth={1.5} aria-hidden />
              )}
            </ItemMedia>
            <ItemContent>
              <ItemTitle id={`${id}-theme`}>Appearance</ItemTitle>
            </ItemContent>
            <ItemActions>
              <ButtonGroup aria-labelledby={`${id}-theme`}>
                {(["light", "dark"] as const).map((option) => (
                  <Button
                    key={option}
                    variant="control"
                    className={styles.menuThemeOption}
                    aria-pressed={theme === option}
                    onClick={() => theme !== option && onTheme()}
                  >
                    {option === "light" ? "Light" : "Dark"}
                  </Button>
                ))}
              </ButtonGroup>
            </ItemActions>
          </Item>
        </ItemGroup>
      </div>
    </section>
  );
}
