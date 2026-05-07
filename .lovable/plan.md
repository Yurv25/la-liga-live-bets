## Goal
Reorganize the Group page **Matches** tab into a round-by-round list driven by the API's `round_number`, with auto-scroll to the current round. No other pages or components change.

## Changes

### 1. `src/lib/types.ts`
Add an optional `round` field to `Match`:
```ts
round?: number | null;
```

### 2. `supabase/functions/laliga-matches/index.ts`
In `mapMatch()`, pass through the round number from the v2 payload:
```ts
round: ev.round_number ?? null,
```
No other edge function changes.

### 3. `src/pages/GroupPage.tsx` (Matches tab only)
Replace the current 3-section layout (Upcoming to predict / Your predictions / Past results) with a **single chronological list grouped by round**.

**Grouping**
- Filter matches to those with a numeric `round` (drop any without).
- Group by `round`, sort rounds ascending.
- Within a round, sort matches by `startTime` ascending.

**Section header** per round:
```
Round {n}
```
(small uppercase tracking, same token styling already used for day headers)

**Cards**
- Reuse existing `<MatchCard>` unchanged → live styling, FT scores, NS predict/locked behavior, prediction badges all keep working as today.
- Pass `predictionsMap.get(match.id)` so the user's prediction (if any) still renders inside the card regardless of round.

**Current round detection**
- "Current round" = the round that contains the match whose `startTime` is closest in absolute time to `Date.now()`. If multiple matches tie (same round), that round wins.
- Fallback if no matches: render empty state ("No matches yet").

**Auto-scroll on tab open**
- Each round section gets `ref={el => roundRefs.current[round] = el}` and `data-round={round}`.
- `useEffect` keyed on `[activeTab, currentRound, matches.length]`:
  - When `activeTab === 'matches'` and `currentRound != null`, call `roundRefs.current[currentRound]?.scrollIntoView({ block: 'start', behavior: 'auto' })` inside a `requestAnimationFrame` (so layout exists).
  - Run only once per tab-open (track with a ref flag that resets when the user leaves the tab) so the user can freely scroll up/down without being snapped back.

### 4. Remove mock data from the live data path
- `src/lib/matchStore.ts`: initial `state.matches` becomes `[]` (not `getMockMatches()`); remove `startSimTick` / `stopSimTick` and the `simTimer` logic; remove the import of `getMockMatches`.
- This guarantees the Group Matches list only ever shows real API matches (no `sim-*` / `fin-*` / `up-*` mocks). `src/lib/matchData.ts` stays on disk but is no longer referenced; safe to leave for now to keep the diff scoped.

## Behavior summary
- Scrolling **up** from the auto-scrolled position → previous rounds with FT scores (already rendered by `MatchCard`).
- Scrolling **down** → future rounds (NS) with predict/locked buttons.
- Live matches sit inside their own round and keep the `glow-live` border + minute badge.
- The Leaderboard tab and all other pages/components are untouched.

## Out of scope
Crests/logos, polling logic, scoring, leaderboard, other tabs, other pages, design tokens, the standalone `LiveMatches`/`Index` pages.
