# Group & UX improvements

## 1. Share invite link from inside the group page
- `GroupPage.tsx`: add a "Share" button in the header that copies `${origin}/group/${group.joinCode}` to clipboard with a sonner toast. Reuse the copy logic pattern from `CreateGroup.tsx`.
- `CreateGroup.tsx` already shows the share link after creation — keep as-is.

## 2. Leave group + ownership transfer
- **DB migration file** `supabase/migrations/002_leave_group.sql` (you run it manually in the Supabase SQL editor, same as `001_initial_schema.sql`):
  - Define `public.leave_group(p_group_id uuid)` as `SECURITY DEFINER`:
    1. Delete the caller (`auth.uid()`) from `group_members`.
    2. If caller was `groups.created_by`:
       - Find the oldest remaining member by `joined_at asc`.
       - If found → `update groups set created_by = <that user>`.
       - If none → `delete from groups where id = p_group_id` (cascades members + predictions).
  - If the `001` trigger `handle_new_user` doesn't already populate `profiles.display_name` from `user_metadata.full_name | name | email`, update it here in the same file.
  - `grant execute on function public.leave_group(uuid) to authenticated;`
- **Storage layer** (`src/lib/storage.ts`): add `leaveGroup(groupId)` calling `supabase.rpc('leave_group', { p_group_id: groupId })`.
- **UI** (`GroupPage.tsx`): add "Leave group" action (kebab menu in header) with an `AlertDialog` confirm. On success → invalidate `['groups']` and `navigate('/groups')`.

## 3. Leaderboard shows real display names
- `loadMembers` currently falls back to `id.slice(0,6)` when a profile row is missing. Two fixes:
  - The `002` migration above ensures the signup trigger fills `display_name` for new users.
  - In `auth.tsx`, on every successful sign-in upsert the current user's `profiles` row with the resolved `displayName` to backfill older accounts.
- `GroupPage.tsx` already renders `member.displayName` — no further change needed once names propagate.

## 4. Header shows current user's display name/avatar
- `LiveMatches.tsx` header: render `{displayName}` (truncated) next to `<UserMenu />`.
- `UserMenu.tsx`: if `user.user_metadata.avatar_url` exists, render an `<img>` inside the trigger circle (fallback to the initial letter on missing/error).

## 5. Fix duplicate match IDs warning
The edge function merges live into events then `.push`es any live not found in events — id type mismatches (number vs string) can produce duplicates.
- `supabase/functions/laliga-matches/index.ts`: deduplicate at the end with a `Map<string, Match>` keyed by `String(m.id)` before responding.
- Belt-and-braces in `matchStore.ts.fetchMatches`: dedupe by id before `setState({ matches })` so the React `key` warning cannot recur.

## Prerequisites (manual)
1. Run `supabase/migrations/002_leave_group.sql` in your Supabase SQL editor after I create it.

## Technical notes
- No new dependencies, no routing changes.
- `leave_group` is `SECURITY DEFINER` so a leaving creator can rewrite `created_by` without an UPDATE policy for non-creators.

## Out of scope
- Kicking other members, renaming groups, group settings page.
- Avatar upload (only use OAuth-provided `avatar_url`).
