"use client";

import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Check,
  Gift,
  Leaf,
  LockKeyhole,
  MapPin,
  Search,
} from "lucide-react";
import {
  createExplorationProgress,
  explorationChallenges,
  explorationLocations,
  getExplorationSummary,
  type ExplorationMoment,
  type ExplorationProgress,
} from "@/lib/exploration-progress";
import { travelPlaces } from "@/lib/places";
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
import PhotoImage from "./PhotoImage";
import styles from "./ExploreChallenges.module.css";

const photoBySrc = new Map(
  travelPlaces.flatMap((place) => place.photos).map((p) => [p.src, p]),
);

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
    moment?.kind === "complete" ||
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
  // On body, so it shows over the photo viewer: the fixed explorer is its own stacking context.
  const mounted = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return createPortal(
    <div
      className={`${styles.toastRegion} explorer-overlay`}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {moment && (
          <motion.button
            key={next ? `${moment.key}-next` : moment.key}
            type="button"
            className={styles.toast}
            data-complete={complete && !next}
            data-reward={moment.kind === "complete"}
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
                {moment.kind === "complete" ? (
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
                  ? moment.kind === "complete"
                    ? "Free preset ready"
                    : "Challenge complete"
                  : moment.kind === "location"
                    ? moment.label
                    : moment.kind === "challenge"
                      ? moment.title
                      : "All challenges complete"}
              </strong>
              <span>
                {next
                  ? moment.kind === "complete"
                    ? "Claim it in Challenges"
                    : "View it in Challenges"
                  : moment.kind === "location"
                    ? `${moment.count} of ${moment.goal} places`
                    : moment.kind === "challenge"
                      ? "Found"
                      : `${moment.count} of ${moment.count} challenges`}
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
    </div>,
    document.body,
  );
}
const noSubscribe = () => () => {};

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
        summary.allComplete
          ? "Challenges, all complete, free preset ready"
          : `Challenges, ${summary.doneCount} of ${summary.challengeCount} complete`
      }
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={summary.allComplete ? "gift" : "leaf"}
          className={styles.triggerIcon}
          initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          aria-hidden="true"
        >
          {summary.allComplete ? (
            <Gift size={18} strokeWidth={1.5} />
          ) : (
            <Leaf size={18} strokeWidth={1.5} />
          )}
        </motion.span>
      </AnimatePresence>
      <span
        className={styles.dot}
        data-complete={summary.allComplete}
        data-started={summary.visitedCount > 0 || summary.doneCount > 0}
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
  const visited = progress.visitedLocationIds
    .slice(0, summary.requiredCount)
    .map((id) => explorationLocations.find((l) => l.id === id)!);
  const claimable = claimBoundary.status === "ready" && summary.allComplete;

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
        <div className={styles.reward} data-ready={summary.allComplete}>
          <Item className={styles.rewardRow}>
            <ItemMedia className={styles.rewardIcon} aria-hidden="true">
              <Gift size={18} strokeWidth={1.5} />
            </ItemMedia>
            <ItemContent className={styles.rowContent}>
              <ItemTitle>Free preset</ItemTitle>
              <ItemDescription className={styles.rowDescription}>
                {claimMessage ??
                  (summary.allComplete
                    ? (claimBoundary.status === "unavailable" &&
                        claimBoundary.message) ||
                      `All ${summary.challengeCount} challenges complete`
                    : `${summary.doneCount} of ${summary.challengeCount} challenges`)}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                variant={summary.allComplete ? "default" : "control"}
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
          <div className={styles.segments} aria-hidden="true">
            {Array.from({ length: summary.challengeCount }, (_, i) => (
              <span key={i} data-done={i < summary.doneCount} />
            ))}
          </div>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <ItemGroup className={styles.rows}>
          <Item
            role="listitem"
            className={styles.row}
            data-complete={summary.milestoneComplete}
          >
            <ItemMedia className={styles.tile} aria-hidden="true">
              <MapPin size={18} strokeWidth={1.5} />
              {summary.milestoneComplete && <Badge />}
            </ItemMedia>
            <ItemContent className={styles.rowContent}>
              <ItemTitle>
                Visit {summary.requiredCount} places
                <span className="sr-only">
                  {summary.milestoneComplete ? ", complete" : ""}
                </span>
              </ItemTitle>
              <div className={styles.slots} aria-hidden="true">
                {Array.from({ length: summary.requiredCount }, (_, i) => (
                  <span key={i}>
                    {visited[i] && (
                      <PhotoImage photo={visited[i].cover} sizes="28px" />
                    )}
                  </span>
                ))}
              </div>
            </ItemContent>
            <ItemActions className={styles.count}>
              {Math.min(summary.visitedCount, summary.requiredCount)} of{" "}
              {summary.requiredCount}
            </ItemActions>
          </Item>
          {explorationChallenges.map((challenge) => {
            const src = summary.foundSrcs[challenge.id];
            const photo = src ? photoBySrc.get(src) : undefined;
            return (
              <Item
                key={challenge.id}
                role="listitem"
                className={styles.row}
                data-complete={!!src}
              >
                <ItemMedia className={styles.tile} aria-hidden="true">
                  {photo ? (
                    <>
                      <PhotoImage photo={photo} sizes="48px" />
                      <Badge />
                    </>
                  ) : (
                    <Search size={18} strokeWidth={1.5} />
                  )}
                </ItemMedia>
                <ItemContent className={styles.rowContent}>
                  <ItemTitle>
                    {challenge.title}
                    <span className="sr-only">
                      {src ? ", found" : ", not found"}
                    </span>
                  </ItemTitle>
                  <ItemDescription className={styles.rowDescription}>
                    {src ? challenge.photoTitle : challenge.clue}
                  </ItemDescription>
                </ItemContent>
              </Item>
            );
          })}
        </ItemGroup>
      </div>
    </section>
  );
}

function Badge() {
  return (
    <span className={styles.badge}>
      <Check size={10} strokeWidth={2.5} />
    </span>
  );
}
