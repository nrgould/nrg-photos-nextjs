"use client";

import { useEffect, useId, useState, type Ref } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, Gift, Leaf, LockKeyhole } from "lucide-react";
import {
  createExplorationProgress,
  explorationChallenges,
  getExplorationSummary,
  type ExplorationMoment,
  type ExplorationProgress,
} from "@/lib/exploration-progress";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import styles from "./ExploreChallenges.module.css";

export type ExplorationClaimBoundary =
  | { status: "unavailable"; message?: string }
  | {
      status: "ready";
      claim: () => Promise<{ status: "confirmed"; message: string }>;
    };
const unavailableClaim: ExplorationClaimBoundary = { status: "unavailable" };

const toastSpring = { type: "spring", duration: 0.45, bounce: 0.3 } as const;

function DrawnCheck({ delay = 0 }: { delay?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.svg
      className={styles.toastCheck}
      viewBox="0 0 24 24"
      aria-hidden="true"
      initial={reducedMotion ? false : { scale: 0.4 }}
      animate={{ scale: 1 }}
      transition={{ ...toastSpring, delay }}
    >
      <motion.path
        d="M6 12.5l4 4 8-9"
        fill="none"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducedMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: delay + 0.12 }}
      />
    </motion.svg>
  );
}

export type ExplorationToastMoment = ExplorationMoment & { key: number };

export function ExplorationToast({
  moment,
  onOpen,
  onDismiss,
}: {
  moment: ExplorationToastMoment | null;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const reducedMotion = useReducedMotion();
  // A completed toast hands off to a pointer at Challenges, keyed to the moment it follows.
  const [followUp, setFollowUp] = useState<number | null>(null);
  const complete =
    moment?.kind === "challenge" ||
    (moment?.kind === "location" && moment.count === moment.goal);
  const next = moment !== null && followUp === moment.key;
  useEffect(() => {
    if (!moment) return;
    const timer = window.setTimeout(
      complete && !next ? () => setFollowUp(moment.key) : onDismiss,
      next ? 5000 : 3200,
    );
    return () => window.clearTimeout(timer);
  }, [moment, complete, next, onDismiss]);
  return (
    <div className={styles.toastRegion} role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        {moment && (
          <motion.button
            key={next ? `${moment.key}-next` : moment.key}
            type="button"
            className={styles.toast}
            data-complete={complete && !next}
            onClick={onOpen}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -14, scale: 0.94 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: reducedMotion ? 0 : -8,
              transition: { duration: 0.15 },
            }}
            transition={toastSpring}
          >
            {next ? (
              <span className={styles.toastIcon} aria-hidden="true">
                {moment.kind === "location" ? (
                  <Gift size={16} strokeWidth={1.5} />
                ) : (
                  <Leaf size={16} strokeWidth={1.5} />
                )}
              </span>
            ) : complete ? (
              <DrawnCheck delay={moment.kind === "location" ? 0.35 : 0.05} />
            ) : (
              <span className={styles.toastIcon} aria-hidden="true">
                <Leaf size={16} strokeWidth={1.5} />
              </span>
            )}
            <span className={styles.toastText}>
              <strong>
                {next
                  ? moment.kind === "location"
                    ? "Free preset unlocked"
                    : "Challenge complete"
                  : moment.kind === "location"
                    ? moment.label
                    : moment.title}
              </strong>
              <span>
                {next
                  ? moment.kind === "location"
                    ? "Claim it in Challenges"
                    : "View it in Challenges"
                  : moment.kind === "location"
                    ? `${moment.count} of ${moment.goal} places`
                    : "Found"}
              </span>
            </span>
            {moment.kind === "location" && !next && (
              <span className={styles.toastTrack} aria-hidden="true">
                <motion.span
                  initial={{
                    scaleX: reducedMotion
                      ? moment.count / moment.goal
                      : (moment.count - 1) / moment.goal,
                  }}
                  animate={{ scaleX: moment.count / moment.goal }}
                  transition={{ ...toastSpring, duration: 0.6, delay: 0.15 }}
                />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExploreChallengesTrigger({
  progress,
  onClick,
  expanded,
  triggerRef,
}: {
  progress: ExplorationProgress;
  onClick: () => void;
  expanded?: boolean;
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const summary = getExplorationSummary(progress);
  return (
    <Button
      ref={triggerRef}
      variant="control"
      className={styles.trigger}
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={
        summary.milestoneComplete
          ? `Explore challenges, ${summary.visitedCount} locations explored, local milestone complete`
          : `Explore challenges, ${summary.visitedCount} of ${summary.requiredCount} locations explored`
      }
    >
      <Leaf size={18} strokeWidth={1.5} aria-hidden="true" />
      <span
        className={styles.dot}
        data-complete={summary.milestoneComplete}
        data-started={summary.visitedCount > 0}
        aria-hidden="true"
      />
    </Button>
  );
}

export default function ExploreChallenges({
  progress: input,
  onBack,
  backLabel = "Back to photographs",
  claimBoundary = unavailableClaim,
}: {
  progress: ExplorationProgress;
  onBack?: () => void;
  backLabel?: string;
  claimBoundary?: ExplorationClaimBoundary;
}) {
  const id = useId();
  const progress = createExplorationProgress(input);
  const summary = getExplorationSummary(progress);
  const [pending, setPending] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completed = new Set<string>(summary.completedChallengeIds);
  const remaining = summary.requiredCount - summary.visitedCount;
  const claimable =
    claimBoundary.status === "ready" && summary.milestoneComplete;

  async function claimReward() {
    if (claimBoundary.status !== "ready" || !claimable || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await claimBoundary.claim();
      if (result.status !== "confirmed") throw new Error("Unconfirmed reward");
      setClaimMessage(result.message);
    } catch {
      setError("The reward could not be confirmed. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className={styles.panel}
      data-drawer-scroll
      aria-labelledby={`${id}-heading`}
    >
      <header className={styles.header}>
        {onBack && (
          <Button variant="quiet" className={styles.back} onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
          </Button>
        )}
        <h2 id={`${id}-heading`} className={styles.heading}>
          Challenges
        </h2>
      </header>
      <div className={styles.content}>
        <section aria-labelledby={`${id}-places`}>
          <div className={styles.sectionHeading}>
            <h3 id={`${id}-places`}>Places</h3>
            <span className={styles.count}>
              {Math.min(summary.visitedCount, summary.requiredCount)} of{" "}
              {summary.requiredCount}
            </span>
          </div>
          <progress
            className={styles.progress}
            value={Math.min(summary.visitedCount, summary.requiredCount)}
            max={summary.requiredCount}
            aria-label="Places explored toward the free preset"
          />
          <Item className={styles.row}>
            <ItemContent className={styles.rowContent}>
              <ItemTitle>Free preset</ItemTitle>
              <ItemDescription className={styles.rowDescription}>
                {claimMessage ??
                  (!summary.milestoneComplete
                    ? `${remaining} more ${remaining === 1 ? "place" : "places"}`
                    : claimBoundary.status === "unavailable"
                      ? (claimBoundary.message ?? "Unavailable")
                      : "Ready")}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                variant="control"
                className={styles.claim}
                disabled={!claimable || pending || claimMessage !== null}
                aria-busy={pending}
                onClick={claimReward}
              >
                {!claimable && (
                  <LockKeyhole size={14} strokeWidth={1.5} aria-hidden="true" />
                )}
                {pending ? "Claiming…" : claimMessage ? "Claimed" : "Claim"}
              </Button>
            </ItemActions>
          </Item>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </section>
        <section
          className={styles.challenges}
          aria-labelledby={`${id}-challenges`}
        >
          <div className={styles.sectionHeading}>
            <h3 id={`${id}-challenges`}>Photographs</h3>
            <span className={styles.count}>
              {completed.size} of {explorationChallenges.length}
            </span>
          </div>
          <ItemGroup className={styles.rows}>
            {explorationChallenges.map((challenge) => {
              const found = completed.has(challenge.id);
              return (
                <Item
                  key={challenge.id}
                  role="listitem"
                  className={styles.row}
                  data-complete={found}
                >
                  <ItemMedia className={styles.check} aria-hidden="true">
                    {found && <Check size={12} strokeWidth={2} />}
                  </ItemMedia>
                  <ItemContent className={styles.rowContent}>
                    <ItemTitle>
                      {challenge.title}
                      <span className="sr-only">
                        {found ? ", found" : ", not found"}
                      </span>
                    </ItemTitle>
                    <ItemDescription className={styles.rowDescription}>
                      {found ? challenge.photoTitle : challenge.clue}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
        </section>
      </div>
    </section>
  );
}
