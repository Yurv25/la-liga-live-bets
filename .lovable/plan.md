# Migrate to Bzzoiro API v2

## Goals

1. Edge function moves from `/api/events/?league=3` + `/api/live/` to v2 (`/api/v2/events/?league_id=3` + `/api/v2/events/live/?league_id=3`).
2. Return the full La Liga season (past finished + upcoming) so the app can show every fixture.
3. Group **Matches** tab: scrolling shows previous fixtures (FT) AND future fixtures, not just NS / predicted.
4. Main **Upcoming** tab: every future fixture of the season.

## Edge function: `supabase/functions/laliga-matches/index.ts`

### Endpoint changes
- Base path: `${BASE_URL}/v2/events/` (BASE_URL = `https://sports.bzzoiro.com/api`).
- Query param: `league_id=3` (was `league=3`).
- Live endpoint: `${BASE_URL}/v2/events/live/?league_id=3`. Response shape is `{ count, events: [...] }` (key is `events`, NOT `results`). Drop the manual `m.league?.id === LA_LIGA_ID` check — v2 filters server-side.

### Pagination (events list)
v2 paginates with `limit` (default 50, max 200) + `offset`, returning `{ count, next, previous, results }`.
- Fetch page 1 with `limit=200`, read `count`, fan out remaining pages in parallel via `Promise.all` using computed offsets.
- Hard cap (e.g. 20 pages = 4000) as a safety net.

### v2 status / period vocabulary (apply to BOTH endpoints)
Per docs (live endpoint, but identical fields on detail/list):
- `status`: `notstarted` | `inprogress` | `penalties` | `finished`
- `period`: `1st_half` | `halftime` | `2nd_half` | `extra_time` | `FT` | `null` (null when status is `notstarted` or `penalties`)
- `current_minute`: int or null (non-null only for `inprogress` and `penalties`)
- `home_score_ht` / `away_score_ht`: int or null
- `event_date`: ISO-8601 UTC with `Z` suffix
- `last_updated`: ISO-8601 UTC with `Z` suffix (live endpoint only)
- `live_websocket`: bool (ignored for now)

Mapping to our internal `Match.status` (`'LIVE' | 'HT' | 'FT' | 'NS'`):
- `period === 'halftime'` → **HT** (check period FIRST so HT wins over inprogress)
- `status === 'inprogress'` or `status === 'penalties'` → **LIVE**
- `status === 'finished'` → **FT**
- `status === 'notstarted'` → **NS**
- anything else → **NS** (defensive default)

### Field mapping (`mapMatch`)
Read v2 fields directly:
- `id` → `String(ev.id)`
- `homeTeam` ← `ev.home_team`, `awayTeam` ← `ev.away_team`
- `homeTeamId` ← `ev.home_team_id`, `awayTeamId` ← `ev.away_team_id`
- `homeScore` ← `ev.home_score ?? 0`, `awayScore` ← `ev.away_score ?? 0`
- `status` ← normalized via the rules above (use `ev.period` and `ev.status`)
- `minute` ← `ev.current_minute ?? null`
- `startTime` ← `ev.event_date`
- `homeLogo` / `awayLogo` ← unchanged `teamLogoUrl(teamId)` (crests untouched)

### Merge live + scheduled
Same pattern as today: `Map` keyed by id from live `events`, override scheduled rows. No client-side league filter.

## Frontend

### `src/pages/GroupPage.tsx`
Add a third bucket so scrolling reveals past results too. Render order:
1. **Upcoming to predict** — `status === 'NS'` and not in `predictionsMap`, grouped by day, soonest first.
2. **Your predictions** — any status, in `predictionsMap`, sorted by `startTime` desc.
3. **Past results** — `status === 'FT'` and NOT in `predictionsMap`, grouped by day, newest first.

Empty state shows only when all three lists are empty. Section headers hidden when their list is empty. No scoring/locking changes — `MatchCard` + `PredictionModal` already handle non-NS correctly.

### Main `Upcoming` tab
No code change needed. Once the edge function returns the full season, the existing `status === 'NS'` filter naturally surfaces every future fixture. Verify nothing slices/limits the list; remove cap if found.

## Files touched
- `supabase/functions/laliga-matches/index.ts` — v2 endpoints, pagination, new status/period mapping, drop live league filter.
- `src/pages/GroupPage.tsx` — add Past results section.

## Out of scope
- Crests/logos, polling cadence, scoring, leaderboard, mock data fallback, auth, design tokens, other leagues.
