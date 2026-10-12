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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import styles from "./ExploreChallenges.module.css";

const services = [
  ["Brand & lifestyle", "Product and lifestyle photography on location"],
  ["Portraits", "Individuals and couples"],
  ["Travel & landscape", "Europe and North Carolina"],
];
const clients = ["Smartwool", "Raven's Brew Coffee", "Eight Angles", "C2Life"];

// Who Nicholas is and how to hire him, then owned presets, theme and links.
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
          <dl className={styles.brandFacts}>
            {services.map(([name, detail]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
            <div>
              <dt>Clients</dt>
              <dd>{clients.join(", ")}</dd>
            </div>
          </dl>
          <Button
            className={styles.brandAction}
            onClick={(event) => onContact(event.currentTarget)}
          >
            Work with me
          </Button>
          <a className={styles.brandEmail} href={`mailto:${site.email}`}>
            {site.email}
          </a>
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
        </ItemGroup>
      </div>
    </section>
  );
}
