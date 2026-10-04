"use client";

import { useId, useState, type Ref } from "react";
import { ArrowLeft, Check, Leaf, LockKeyhole } from "lucide-react";
import {
  createExplorationProgress,
  explorationChallenges,
  explorationLocations,
  getExplorationSummary,
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
  claimBoundary = unavailableClaim,
}: {
  progress: ExplorationProgress;
  onRevealHint: (challengeId: string) => void;
  onBack: () => void;
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
    <section className={styles.panel} aria-labelledby={`${id}-heading`}>
      <header className={styles.header}>
        <Button variant="quiet" className={styles.back} onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to photographs
        </Button>
        <div className={styles.heading}>
          <Leaf size={23} strokeWidth={1.5} aria-hidden="true" />
          <h2 id={`${id}-heading`}>A little further</h2>
        </div>
        <p>Explore places. Notice the small things.</p>
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
          <p>
            Open five different locations on the map to complete this
            exploration milestone.
          </p>
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
                  "Rewards are unavailable in this preview. Exploration progress is local; it does not grant a preset or purchase entitlement.")
                : "Your account and reward eligibility must be confirmed by the server before a preset is granted."}
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
          <h3 id={`${id}-challenges`}>Look a little closer</h3>
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
                  {challenge.status === "planned" && (
                    <span className={styles.planned}>Planned</span>
                  )}
                </div>
                {challenge.status === "planned" ? (
                  <p>{challenge.unavailableReason}</p>
                ) : (
                  <>
                    <p>
                      {found
                        ? `You opened “${challenge.photoTitle}.” A small detail, found.`
                        : challenge.clue}
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
                        ? "Completed in this browser. No purchase or reward was granted."
                        : "Open the photograph to complete this challenge."}
                    </p>
                  </>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </section>
  );
}
