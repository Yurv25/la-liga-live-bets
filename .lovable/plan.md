# Show all predicted + upcoming matches in group

## Problem

- The main feed (`/`) already shows all La Liga matches in **All** and all upcoming in **Upcoming** — that part works.
- Inside a group (`/group/:id`), the **Matches** tab currently only shows fixtures with status `NS` (not started). Matches the user already predicted that are now LIVE/HT/FT disappear, so there is no way to review past predictions or see all relevant games in one place.

## Goal

In the group's **Matches** tab, show every match that is relevant to the user, split into two clear sections:

1. **Your predictions** — every match the current user has already predicted (any status: LIVE, HT, FT, NS), most recent first by kickoff time.
2. **Upcoming to predict** — remaining `NS` matches the user has not predicted yet, grouped by day (Today / Tomorrow / weekday) like the main Upcoming feed.

No changes to the main `/` page, no changes to scoring, no changes to the edge function.

## Changes

### `src/pages/GroupPage.tsx` (only file touched)

- Replace the single `upcomingMatches` list in the Matches tab with two derived lists from `matches` (already coming from the centralized store):
  - `predictedMatches` = matches whose `id` is in `predictionsMap`, sorted by `startTime` desc.
  - `unpredictedUpcoming` = `status === 'NS'` AND not in `predictionsMap`, sorted by `startTime` asc.
- Render two sections with small headers ("Your predictions", "Upcoming to predict"). Reuse existing `MatchCard` + `PredictionModal` (the modal already locks editing once status leaves `NS`, so no UX regression).
- Group the "Upcoming to predict" list by day using the same `getDayLabel` / `groupMatchesByDay` pattern as `LiveMatches.tsx` (small local helpers, no shared util needed).
- Empty states:
  - If both lists are empty: keep current "No upcoming matches" message, reworded to "No matches yet".
  - If only one is empty: hide that section's header.

## Out of scope

- Edge function logic, polling, scoring, leaderboard, styling system, auth, mock data fallback — all untouched.
