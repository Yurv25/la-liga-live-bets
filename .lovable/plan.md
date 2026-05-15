## Authentication + cloud persistence plan

Adds Supabase Auth (email/password + Google) and migrates groups, memberships, and predictions from localStorage to Supabase with RLS so the same account works across devices. Match display, edge functions, API integration, leaderboard math, and group page layout stay untouched.

### A. SQL migration — `supabase/migrations/001_initial_schema.sql`

Created on build approval. Full contents:

```sql
-- =========================================================
-- Praedictio: initial auth + persistence schema
-- =========================================================

-- ---------- profiles ----------
create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles readable by authenticated"
  on public.profiles for select
  to authenticated using (true);

create policy "users insert own profile"
  on public.profiles for insert
  to authenticated with check (auth.uid() = user_id);

create policy "users update own profile"
  on public.profiles for update
  to authenticated using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.email
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- groups ----------
create table public.groups (
  id             uuid primary key default gen_random_uuid(),
  join_code      text unique not null,
  name           text not null,
  competition_id text not null default 'laliga',
  created_by     uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now()
);

alter table public.groups enable row level security;

-- ---------- group_members ----------
create table public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

-- Security-definer membership check (avoids RLS recursion)
create or replace function public.is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = _user_id
  );
$$;

-- groups policies
create policy "members can view their groups"
  on public.groups for select
  to authenticated
  using (created_by = auth.uid() or public.is_group_member(id, auth.uid()));

create policy "any authenticated can create groups"
  on public.groups for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "creator can update group"
  on public.groups for update
  to authenticated
  using (created_by = auth.uid());

create policy "creator can delete group"
  on public.groups for delete
  to authenticated
  using (created_by = auth.uid());

-- group_members policies
create policy "members can view co-members"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id, auth.uid()));

create policy "users join themselves"
  on public.group_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users leave themselves"
  on public.group_members for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------- predictions ----------
create table public.predictions (
  user_id    uuid not null references auth.users(id) on delete cascade,
  match_id   text not null,
  home_score smallint not null check (home_score between 0 and 20),
  away_score smallint not null check (away_score between 0 and 20),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

alter table public.predictions enable row level security;

-- Helper: do two users share at least one group?
create or replace function public.shares_group_with(_other_user uuid, _self uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = _self and b.user_id = _other_user
  );
$$;

create policy "users see own and co-member predictions"
  on public.predictions for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.shares_group_with(user_id, auth.uid())
  );

create policy "users insert own predictions"
  on public.predictions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users update own predictions"
  on public.predictions for update
  to authenticated
  using (user_id = auth.uid());

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger predictions_touch_updated_at
  before update on public.predictions
  for each row execute function public.touch_updated_at();

-- ---------- indexes ----------
create index group_members_user_idx on public.group_members(user_id);
create index predictions_match_idx  on public.predictions(match_id);
create index groups_join_code_idx   on public.groups(join_code);
```

### B. Auth wiring

- `src/lib/supabaseClient.ts` used as-is. You add `VITE_APP_SUPABASE_URL` / `VITE_APP_SUPABASE_ANON_KEY` to `.env.local`.
- `src/lib/auth.tsx` (new) — `AuthProvider` + `useAuth()`. Registers `onAuthStateChange` first, then `getSession()`. Exposes `user`, `session`, `loading`, `displayName`, `signInEmail`, `signUpEmail`, `signInGoogle` (`supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo: window.location.origin}})`), `signOut`. `displayName = user.user_metadata.full_name ?? user.user_metadata.name ?? user.email`.
- `src/pages/Auth.tsx` (new, route `/auth`) — Tabbed Sign in / Sign up card with Google button on top, email + password fields. Uses existing tokens (`bg-card`, `glass`, `font-display`). Errors via `sonner`. SEO title + single H1.
- `src/components/RequireAuth.tsx` (new) — spinner while `loading`; redirect to `/auth` if no user; otherwise `<Outlet/>`.
- `src/App.tsx` — wrap router in `<AuthProvider>`; `/`, `/groups`, `/create-group`, `/group/:id` under `<RequireAuth>`. `BottomNav` only when authenticated.

### C. Storage layer rewrite (`src/lib/storage.ts` → async Supabase)

- `getGroups()` — `groups` joined with `group_members` for current user.
- `getGroupById(idOrCode)` — fetch group + members (display_names via `profiles`).
- `createGroup(name, competitionId)` — insert `groups` (random 6-char `join_code`) + insert self into `group_members`.
- `joinGroupByCode(code)` — look up group; upsert `group_members` row.
- `getPredictionsForGroup(groupId)` — RLS auto-filters to co-members.
- `savePrediction({matchId, homeScore, awayScore})` — upsert keyed `(user_id, match_id)`.
- `calculatePoints(...)` — unchanged (pure).
- Old nickname / localStorage helpers removed.

### D. UI updates (minimal)

- **`GroupPage.tsx`**: React Query (`useQuery(['group', code])`, `useQuery(['predictions', groupId])`). `nickname` from `useAuth().displayName`. Mount-time `joinGroupByCode(urlCode)`. Round grouping, MatchCard, leaderboard math, layout — unchanged.
- **`GroupsList.tsx`**: `useQuery(['groups'])`. Same UI.
- **`CreateGroup.tsx`**: async `createGroup`; `shareLink = origin + '/group/' + group.joinCode`. Remove `NicknamePrompt`.
- **`PredictionModal.tsx`**: drop nickname field; async `savePrediction` + invalidate `['predictions', groupId]`. Lock logic untouched.
- **Header logout**: avatar → shadcn `dropdown-menu` on `GroupsList` / `GroupPage` / `Index` with display name + Sign out.
- `NicknamePrompt.tsx` no longer rendered.

### E. Routing change

Group share URLs: `/group/<join_code>` (6-char text). Old localStorage groups are not migrated — acceptable for MVP.

### F. Out of scope

`supabase/functions/laliga-matches/*`, `src/lib/api.ts`, `src/lib/matchStore.ts`, `MatchCard`, scoring formula, polling, crests. No new npm deps.

### G. Prerequisites

1. `.env.local`:
   ```
   VITE_APP_SUPABASE_URL=...
   VITE_APP_SUPABASE_ANON_KEY=...
   ```
2. Run `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor.
3. Supabase → Authentication → Providers → enable **Google** with your OAuth client ID/secret; add app origin + `http://localhost:*` to redirect URLs.
4. (Optional) Disable "Confirm email" for instant sign-in during testing.

### Implementation order on approval

1. Write `supabase/migrations/001_initial_schema.sql` (full SQL above).
2. Add `AuthProvider`, `RequireAuth`, `Auth` page, wire `App.tsx`.
3. Rewrite `storage.ts` to async Supabase.
4. Update `GroupsList`, `CreateGroup`, `GroupPage`, `PredictionModal`.
5. Add header logout menu.
