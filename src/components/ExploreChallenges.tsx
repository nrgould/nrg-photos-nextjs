"use client";

import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Check,
  Gift,
  Heart,
  Leaf,
  LockKeyhole,
  MapPin,
  Search,
  ShoppingBag,
} from "lucide-react";
import {
  createExplorationProgress,
  explorationChallenges,
  explorationLocations,
  getExplorationSummary,
  type ExplorationMoment,
  type ExplorationProgress,
} from "@/lib/exploration-progress";
import { getMapNodes } from "@/lib/map-hierarchy";
import { getCatalogPreset, presetCatalog } from "@/lib/preset-commerce";
import type { Photo } from "@/lib/photography";
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
import { SignInDialog } from "./AccountControl";
import PhotoImage from "./PhotoImage";
import styles from "./ExploreChallenges.module.css";

const photoBySrc = new Map(
  travelPlaces.flatMap((place) => place.photos).map((p) => [p.src, p]),
);
/** The thumbnail for anything the heart saved: the photo, or a place's cover. */
const savedCover = new Map<string, Photo>([
  ...photoBySrc,
  ...[
    ...getMapNodes(travelPlaces, "country"),
    ...getMapNodes(travelPlaces, "location"),
  ].map((node): [string, Photo] => [node.id, node.cover]),
]);

export type ExplorationClaimBoundary =
  | { status: "unavailable"; message?: string }
  | {
      /** "sign-in": the account needs a confirmed email before it can claim. */
      status: "sign-in" | "ready";
      /** The server draws the preset; the client only shows it. */
      claim: () => Promise<{ presetId: string }>;
      /** The account's claimed preset for this campaign, once the server confirms it. */
      claimedPresetId: string | null;
    };
const unavailableClaim: ExplorationClaimBoundary = { status: "unavailable" };

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
/** Ticks through the catalog, slowing like a wheel, and stops on the drawn preset. */
async function spin(target: string, show: (id: string) => void) {
  let index = Math.floor(Math.random() * presetCatalog.length);
  for (let step = 0; step < 16; step++) {
    show(presetCatalog[index++ % presetCatalog.length].id);
    await wait(50 + step * step);
  }
  show(target);
}

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

/** Cart progress toward the bulk discount shares the place-count toast. */
export type ExplorationToastMoment = (
  | ExplorationMoment
  | { kind: "discount"; label: string; count: number; goal: number }
) & { key: number };

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
  const counted =
    moment?.kind === "location" || moment?.kind === "discount" ? moment : null;
  const complete =
    moment?.kind === "challenge" ||
    moment?.kind === "complete" ||
    (counted !== null && counted.count === counted.goal);
  // Only challenge progress hands off to Challenges.
  const followsUp = complete && moment?.kind !== "discount";
  const next = moment !== null && followUp === moment.key;
  useEffect(() => {
    if (!moment) return;
    const timer = window.setTimeout(
      followsUp && !next ? () => setFollowUp(moment.key) : onDismiss,
      next ? 5000 : 3200,
    );
    return () => window.clearTimeout(timer);
  }, [moment, followsUp, next, onDismiss]);
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
              <DrawnCheck delay={counted ? 0.35 : 0.05} />
            ) : (
              <span className={styles.toastIcon} aria-hidden="true">
                {moment.kind === "discount" ? (
                  <ShoppingBag size={16} strokeWidth={1.5} />
                ) : (
                  <Leaf size={16} strokeWidth={1.5} />
                )}
              </span>
            )}
            <span className={styles.toastText}>
              <strong>
                {next
                  ? moment.kind === "complete"
                    ? "Free preset ready"
                    : "Challenge complete"
                  : counted
                    ? counted.label
                    : moment.kind === "challenge"
                      ? moment.title
                      : "All challenges complete"}
              </strong>
              <span>
                {next
                  ? moment.kind === "complete"
                    ? "Claim it in Challenges"
                    : "View it in Challenges"
                  : counted
                    ? `${counted.count} of ${counted.goal} ${counted.kind === "location" ? "places" : "presets"}`
                    : moment.kind === "challenge"
                      ? moment.done
                      : `${moment.count} of ${moment.count} challenges`}
              </span>
            </span>
            {counted && !next && (
              <span className={styles.toastTrack} aria-hidden="true">
                <motion.span
                  initial={{
                    scaleX: reducedMotion
                      ? counted.count / counted.goal
                      : (counted.count - 1) / counted.goal,
                  }}
                  animate={{ scaleX: counted.count / counted.goal }}
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
  onOpenPreset,
}: {
  progress: ExplorationProgress;
  onBack?: () => void;
  backLabel?: string;
  claimBoundary?: ExplorationClaimBoundary;
  onOpenPreset?: (id: string) => void;
}) {
  const id = useId();
  const progress = createExplorationProgress(input);
  const summary = getExplorationSummary(progress);
  const [pending, setPending] = useState(false);
  const [reelId, setReelId] = useState<string | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const [error, setError] = useState<string | null>(null);
  const visited = progress.visitedLocationIds
    .slice(0, summary.requiredCount)
    .map((id) => explorationLocations.find((l) => l.id === id)!);
  const claimable =
    claimBoundary.status !== "unavailable" && summary.allComplete;
  const claimed =
    claimedId ??
    (claimBoundary.status === "unavailable"
      ? null
      : claimBoundary.claimedPresetId);
  // The spinning reel, then the claimed preset.
  const reel = getCatalogPreset(reelId ?? claimed);
  // A guest enters an email first; the claim runs once that code is verified.
  const [signingIn, setSigningIn] = useState(false);

  async function claimReward(signedIn = false) {
    if (claimBoundary.status === "unavailable" || !claimable || pending) return;
    if (claimBoundary.status === "sign-in" && !signedIn)
      return setSigningIn(true);
    setPending(true);
    setError(null);
    try {
      const { presetId } = await claimBoundary.claim();
      if (!getCatalogPreset(presetId)) throw new Error("Unknown preset");
      if (reducedMotion) setReelId(presetId);
      else await spin(presetId, setReelId);
      setClaimedId(presetId);
      await wait(reducedMotion ? 0 : 700);
      onOpenPreset?.(presetId);
    } catch {
      setReelId(null);
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
              {reel ? (
                <span className={styles.reelNumber}>
                  {String(reel.number).padStart(2, "0")}
                </span>
              ) : (
                <Gift size={18} strokeWidth={1.5} />
              )}
            </ItemMedia>
            <ItemContent className={styles.rowContent}>
              <ItemTitle className={styles.reelTitle}>
                {reel ? (
                  <motion.span
                    key={reel.id}
                    aria-hidden={pending}
                    initial={{ transform: "translateY(8px)", opacity: 0 }}
                    animate={{ transform: "translateY(0px)", opacity: 1 }}
                    transition={{ duration: 0.08, ease: "easeOut" }}
                  >
                    {reel.name}
                  </motion.span>
                ) : (
                  "Free preset"
                )}
              </ItemTitle>
              <ItemDescription className={styles.rowDescription}>
                {reel
                  ? reel.category
                  : summary.allComplete
                    ? (claimBoundary.status === "unavailable" &&
                        claimBoundary.message) ||
                      `All ${summary.challengeCount} challenges complete`
                    : `${summary.doneCount} of ${summary.challengeCount} challenges`}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                variant={
                  claimed
                    ? "secondary"
                    : summary.allComplete
                      ? "default"
                      : "control"
                }
                className={styles.claim}
                disabled={!claimable || pending || claimed !== null}
                aria-busy={pending}
                onClick={() => void claimReward()}
              >
                {!claimable && (
                  <LockKeyhole size={14} strokeWidth={1.5} aria-hidden="true" />
                )}
                {claimed ? "Claimed" : pending ? "Claiming…" : "Claim"}
              </Button>
            </ItemActions>
          </Item>
          <span className="sr-only" role="status">
            {claimedId && `${getCatalogPreset(claimedId)?.name} claimed`}
          </span>
          <SignInDialog
            open={signingIn}
            onOpenChange={setSigningIn}
            title="Create a free account to claim"
            onSignedIn={() => void claimReward(true)}
          />
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
          <GoalRow
            icon={<MapPin size={18} strokeWidth={1.5} />}
            title={`Visit ${summary.requiredCount} places`}
            covers={visited.map((location) => location.cover)}
            goal={summary.requiredCount}
            count={summary.visitedCount}
          />
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
          <GoalRow
            icon={<Heart size={18} strokeWidth={1.5} />}
            title={`Save ${summary.saveGoal} favorites`}
            covers={summary.savedIds.map((id) => savedCover.get(id)!)}
            goal={summary.saveGoal}
            count={summary.savedIds.length}
          />
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

/** A count goal: its glyph tile, then one slot per step that fills with a cover. */
function GoalRow({
  icon,
  title,
  covers,
  goal,
  count,
}: {
  icon: ReactNode;
  title: string;
  covers: Photo[];
  goal: number;
  count: number;
}) {
  const complete = count >= goal;
  return (
    <Item role="listitem" className={styles.row} data-complete={complete}>
      <ItemMedia className={styles.tile} aria-hidden="true">
        {icon}
        {complete && <Badge />}
      </ItemMedia>
      <ItemContent className={styles.rowContent}>
        <ItemTitle>
          {title}
          <span className="sr-only">{complete ? ", complete" : ""}</span>
        </ItemTitle>
        <div className={styles.slots} aria-hidden="true">
          {Array.from({ length: goal }, (_, i) => (
            <span key={i}>
              {covers[i] && <PhotoImage photo={covers[i]} sizes="28px" />}
            </span>
          ))}
        </div>
      </ItemContent>
      <ItemActions className={styles.count}>
        {Math.min(count, goal)} of {goal}
      </ItemActions>
    </Item>
  );
}
