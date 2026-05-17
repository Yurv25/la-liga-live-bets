# Schedule tab on LiveMatches

Scope is limited to `src/pages/LiveMatches.tsx` plus one small new component for the date strip. No API, polling, store, or edge function changes.

## Changes

### 1. Tabs
- Replace `Tab` type: `'schedule' | 'live'`.
- Default `useState<Tab>('schedule')`.
- Tab order: Schedule (Calendar icon), Live (Zap icon, with live count badge).
- Remove the `All` tab entirely.

### 2. Date strip (new component `src/components/DateStrip.tsx`)
- Horizontal scrollable row, 11 days: today − 5 … today + 5.
- Each pill shows weekday abbr + day number (`Mon 12`) via `toLocaleDateString`.
- Selected day uses `bg-primary text-primary-foreground` with subtle glow; others `bg-secondary text-muted-foreground`.
- Today gets a small dot indicator under the label when not selected.
- Props: `selected: Date`, `onSelect: (d: Date) => void`.
- Container: `flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none`, snap-x for nicer mobile feel.
- On mount, scroll the "today" pill into view (centered) via a ref.

### 3. Schedule view logic (inline in LiveMatches.tsx)
- Local state: `selectedDate: Date` (init `new Date()` truncated to local midnight).
- Derive `dayMatches` from `allMatches` from `useFilteredMatches` (use existing hook, ignore its `matches` for schedule tab and use `allMatches` instead):
  - Same-day filter using local `toDateString()` comparison against `match.startTime`.
- Group by competition using a hardcoded order pulled from `src/lib/competitions.ts` (`COMPETITIONS`): La Liga (3), then World Cup (27). Skip groups with zero matches.
- Within each group, sort by `startTime` ascending.

### 4. Group header
- Row with league logo `<img src={`https://sports.bzzoiro.com/img/league/${leagueId}/`} />` (h-6 w-6, rounded, with simple onError → hide), league name in `text-sm font-semibold text-muted-foreground uppercase tracking-wide`, divider line.

### 5. Empty state
- If `dayMatches.length === 0`: centered `No matches today` message (reuse existing styling from the current empty state).

### 6. Live tab
- Unchanged behavior: shows live + HT matches via existing filter logic.

### 7. Cleanup
- Remove `tab === 'all'` branches.
- Keep `MatchCard`, `PredictionModal`, `UserMenu`, header, polling, and prediction query intact.

## Technical notes

- No new dependencies.
- All filtering/grouping is `useMemo` over `allMatches` and `selectedDate`.
- Match cards remain wrapped in the same Framer Motion fade-in.
- `leagueId` is already on the `Match` type and populated by the edge function/store.

## Out of scope
- Changing edge functions, store, polling, types, MatchCard, or any other page.
- Swipe gestures on the date strip (native scroll only).
