"use client";

import { useEffect, useId, useState, type Ref } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, Leaf, LockKeyhole } from "lucide-react";
import {
  createExplorationProgress,
  explorationChallenges,
  explorationLocations,
  getExplorationSummary,
  type ExplorationMoment,
  type ExplorationProgress,
} from "@/lib/exploration-progress";
import { Button } from "@/components/ui/button";
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
  useEffect(() => {
    if (!moment) return;
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [moment, onDismiss]);
  const complete =
    moment?.kind === "challenge" ||
    (moment?.kind === "location" && moment.count === moment.goal);
  return (
    <div className={styles.toastRegion} role="status" aria-live="polite">
      <AnimatePresence>
        {moment && (
          <motion.button
            key={moment.key}
            type="button"
            className={styles.toast}
            data-complete={complete}
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
            {complete ? (
              <DrawnCheck delay={moment.kind === "location" ? 0.35 : 0.05} />
            ) : (
              <span className={styles.toastIcon} aria-hidden="true">
                <Leaf size={16} strokeWidth={1.5} />
              </span>
            )}
            <span className={styles.toastText}>
              <strong>
                {moment.kind === "location" ? moment.label : moment.title}
              </strong>
              <span>
                {moment.kind === "location"
                  ? `${moment.count} of ${moment.goal} places`
                  : "Found"}
              </span>
            </span>
            {moment.kind === "location" && (
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
  onRevealHint,
  onBack,
  backLabel = "Back to photographs",
  claimBoundary = unavailableClaim,
}: {
  progress: ExplorationProgress;
  onRevealHint: (challengeId: string) => void;
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

  async function claimReward() {
    if (
      claimBoundary.status !== "ready" ||
      !summary.milestoneComplete ||
      pending
    )
      return;
    setPending(true);
    setError(null);
    try {
      const result = await claimBoundary.claim();
      if (result.status !== "confirmed") throw new Error("Unconfirmed reward");
      setClaimMessage(result.message);
    } catch {
      setError(
        "The reward could not be confirmed. Your exploration progress is still here.",
      );
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
        <div className={styles.heading}>
          <Leaf size={23} strokeWidth={1.5} aria-hidden="true" />
          <h2 id={`${id}-heading`}>Challenges</h2>
        </div>
      </header>
      <div className={styles.content}>
        <section
          className={styles.milestone}
          aria-labelledby={`${id}-milestone`}
          data-complete={summary.milestoneComplete}
        >
          <div className={styles.sectionHeading}>
            <h3 id={`${id}-milestone`}>Visit five places</h3>
            {summary.milestoneComplete && (
              <Check size={18} aria-hidden="true" />
            )}
          </div>
          <progress
            className={styles.progress}
            value={Math.min(summary.visitedCount, summary.requiredCount)}
            max={summary.requiredCount}
            aria-label="Locations explored toward the five-place milestone"
          />
          <p className={styles.progressLabel} role="status">
            {summary.milestoneComplete
              ? `${summary.visitedCount} places explored · milestone complete`
              : `${summary.visitedCount} of ${summary.requiredCount} places explored`}
          </p>
          <ul className={styles.locations} aria-label="Exploration locations">
            {explorationLocations.map((location) => {
              const visited = progress.visitedLocationIds.includes(location.id);
              return (
                <li key={location.id} data-visited={visited}>
                  <span className={styles.locationCheck} aria-hidden="true">
                    {visited && <Check size={12} />}
                  </span>
                  <span>{location.label}</span>
                  <span className="sr-only">
                    {visited ? ", explored" : ", not explored yet"}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className={styles.reward}>
            <Button
              variant="control"
              className={styles.claim}
              disabled={
                claimBoundary.status === "unavailable" ||
                !summary.milestoneComplete ||
                pending ||
                claimMessage !== null
              }
              aria-busy={pending}
              onClick={claimReward}
            >
              <LockKeyhole size={16} aria-hidden="true" />
              {pending
                ? "Checking reward…"
                : claimMessage
                  ? "Reward confirmed"
                  : "Claim a free preset"}
            </Button>
            <p className={styles.notice}>
              {claimBoundary.status === "unavailable"
                ? (claimBoundary.message ??
                  "Rewards unavailable. Progress is saved in this browser.")
                : "Sign in to claim your reward."}
            </p>
            {claimMessage && (
              <p className={styles.notice} role="status">
                {claimMessage}
              </p>
            )}
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>
        </section>
        <section
          className={styles.challenges}
          aria-labelledby={`${id}-challenges`}
        >
          <h3 id={`${id}-challenges`}>Photo challenges</h3>
          {explorationChallenges.map((challenge) => {
            const found = completed.has(challenge.id);
            const hintRevealed = progress.revealedHintIds.includes(
              challenge.id,
            );
            return (
              <article
                key={challenge.id}
                className={styles.challenge}
                data-complete={found}
              >
                <div className={styles.sectionHeading}>
                  <h4>{challenge.title}</h4>
                  {found && (
                    <span className={styles.found}>
                      <Check size={14} aria-hidden="true" /> Found
                    </span>
                  )}
                </div>
                <p>
                  {found ? `Found in ${challenge.photoTitle}.` : challenge.clue}
                </p>
                {!found && (
                  <>
                    <Button
                      variant="quiet"
                      className={styles.hintButton}
                      aria-expanded={hintRevealed}
                      aria-controls={`${id}-${challenge.id}-hint`}
                      disabled={hintRevealed}
                      onClick={() => onRevealHint(challenge.id)}
                    >
                      {hintRevealed ? "Hint revealed" : "Show a hint"}
                    </Button>
                    <p
                      id={`${id}-${challenge.id}-hint`}
                      className={styles.hint}
                      hidden={!hintRevealed}
                    >
                      {challenge.hint}
                    </p>
                  </>
                )}
                <p className={styles.caption}>
                  {found
                    ? "Saved in this browser."
                    : "Open the photo to complete."}
                </p>
              </article>
            );
          })}
        </section>
      </div>
    </section>
  );
}
