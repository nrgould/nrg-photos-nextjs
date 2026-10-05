"use client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContactForm from "./ContactForm";
import styles from "./ExploreChallenges.module.css";

// Contact as a drawer page, so it stacks like the other pages instead of a modal over the drawer.
export default function ContactPanel({
  emailEnabled,
  backLabel,
  onBack,
}: {
  emailEnabled: boolean;
  backLabel?: string;
  onBack?: () => void;
}) {
  return (
    <section
      className={styles.panel}
      data-drawer-scroll
      aria-labelledby="contact-heading"
    >
      <header className={styles.header}>
        {onBack && (
          <Button variant="quiet" className={styles.back} onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
          </Button>
        )}
        <h2 id="contact-heading" className={styles.heading}>
          Contact
        </h2>
      </header>
      <div className={styles.content}>
        <ContactForm emailEnabled={emailEnabled} variant="boxed" />
      </div>
    </section>
  );
}
