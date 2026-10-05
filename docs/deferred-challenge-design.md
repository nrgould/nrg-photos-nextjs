# Deferred exploration challenge ideas

Design planning only. No challenge or reward implementation belongs to the map correction/filter checkpoints.

- Proposed placement: one small Lucide Leaf button in the top controls, labeled “Explore challenges.” Open a Challenges mode in the existing drawer; keep clues, hints and progress inside it. Prefer a small progress/unlock dot over a map banner.
- Requested challenge category: “Find the dog,” linked to a specific verified portfolio photograph. The exact photo ID has not been supplied or confirmed; do not invent one. Opening that verified photograph could complete local exploration progress, followed by a brief subtle celebration.
- Dark green Leaf beside challenge progress and a restrained unlock flourish remain design ideas, not current functional map/filter icons.
- Local exploration progress is separate from free-preset entitlement. Actual rewards require later server validation, authentication, once-per-account claim rules and delivery configuration. Do not represent a local UI event as an earned or delivered purchase entitlement.

The user has now authorized sequential overnight implementation after the map checkpoints; this document remains design context until that stage. The current map still contains four regional collections.

2026-10-05: the client now asks for every challenge (five places, three saves, and each photo find) before it shows the free preset as ready, but `src/lib/server/commerce/service.ts` still checks only five verified places. When the claim is wired, the server check must add the saves and the photo finds. Claim stays disabled until then, since nothing passes a `claimBoundary`.
