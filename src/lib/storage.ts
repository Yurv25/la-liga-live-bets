import { supabase } from '@/lib/supabaseClient';
import { Group, GroupMember, Prediction } from './types';

function genJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function loadMembers(groupId: string): Promise<GroupMember[]> {
  const { data: members, error } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);
  if (error || !members?.length) return [];
  const ids = members.map((m: any) => m.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', ids);
  const nameMap = new Map<string, string>(
    (profiles ?? []).map((p: any) => [p.user_id, p.display_name])
  );
  return ids.map((id) => ({ userId: id, displayName: nameMap.get(id) ?? id.slice(0, 6) }));
}

function rowToGroup(row: any, members: GroupMember[]): Group {
  return {
    id: row.id,
    joinCode: row.join_code,
    name: row.name,
    competitionId: row.competition_id,
    createdBy: row.created_by,
    members,
  };
}

export async function fetchMyGroups(): Promise<Group[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id);
  const ids = (memberRows ?? []).map((r: any) => r.group_id);
  if (!ids.length) return [];
  const { data: groupRows, error } = await supabase
    .from('groups')
    .select('*')
    .in('id', ids);
  if (error || !groupRows) return [];
  const result: Group[] = [];
  for (const row of groupRows) {
    result.push(rowToGroup(row, await loadMembers(row.id)));
  }
  return result;
}

export async function fetchGroupByCode(code: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return rowToGroup(data, await loadMembers(data.id));
}

export async function createGroup(
  name: string,
  competitionId: string
): Promise<Group | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Try a few times in case of join_code collision
  for (let i = 0; i < 5; i++) {
    const code = genJoinCode();
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name,
        competition_id: competitionId,
        join_code: code,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) {
      if ((error as any).code === '23505') continue; // unique violation, retry
      throw error;
    }
    await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id });
    return rowToGroup(data, await loadMembers(data.id));
  }
  return null;
}
/*
export async function joinGroupByCode(code: string): Promise<Group | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const group = await fetchGroupByCode(code);
  if (!group) return null;
  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id });
    // ignore duplicate key error (user already a member)
    if (error && !error.message.includes('duplicate')) {
      console.error('joinGroup error:', error);
    }
  return await fetchGroupByCode(code);
}*/

export async function joinGroupByCode(code: string): Promise<Group | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const group = await fetchGroupByCode(code);
  if (!group) return null;

  const { data: existing } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id });

    if (error) {
      throw error;
    }
  }

  return group;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
  if (error) throw error;
}

export async function fetchGroupPredictions(groupId: string): Promise<Prediction[]> {
  const members = await loadMembers(groupId);
  if (!members.length) return [];
  const ids = members.map((m) => m.userId);
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .in('user_id', ids);
  if (error || !data) return [];
  const nameMap = new Map(members.map((m) => [m.userId, m.displayName]));
  return data.map((row: any) => ({
    matchId: row.match_id,
    userId: row.user_id,
    displayName: nameMap.get(row.user_id) ?? '',
    homeScore: row.home_score,
    awayScore: row.away_score,
  }));
}

export async function fetchMyPredictions(): Promise<Prediction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from('predictions').select('*').eq('user_id', user.id);
  const displayName =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    user.email ??
    '';
  return (data ?? []).map((row: any) => ({
    matchId: row.match_id,
    userId: row.user_id,
    displayName,
    homeScore: row.home_score,
    awayScore: row.away_score,
  }));
}

export async function savePrediction(input: {
  matchId: string;
  homeScore: number;
  awayScore: number;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('predictions')
    .upsert(
      {
        user_id: user.id,
        match_id: input.matchId,
        home_score: input.homeScore,
        away_score: input.awayScore,
      },
      { onConflict: 'user_id,match_id' }
    );
  if (error) throw error;
}

export function calculatePoints(
  prediction: { homeScore: number; awayScore: number },
  actualHome: number,
  actualAway: number,
  matchStatus: string
): number {
  // Only finished matches count
  if (matchStatus !== 'FT') return 0;

  // Exact score
  if (
    prediction.homeScore === actualHome &&
    prediction.awayScore === actualAway
  ) {
    return 6;
  }

  // Predicted outcome
  const predOutcome =
    prediction.homeScore > prediction.awayScore
      ? 'home'
      : prediction.homeScore < prediction.awayScore
      ? 'away'
      : 'draw';

  // Actual outcome
  const actualOutcome =
    actualHome > actualAway
      ? 'home'
      : actualHome < actualAway
      ? 'away'
      : 'draw';

  // Wrong outcome
  if (predOutcome !== actualOutcome) {
    return 0;
  }

  // Goal difference
  const predDiff = prediction.homeScore - prediction.awayScore;
  const actualDiff = actualHome - actualAway;

  // Correct winner + correct goal difference
  // ONLY for non-draws
  if (
    actualOutcome !== 'draw' &&
    predDiff === actualDiff
  ) {
    return 4;
  }

  // Correct outcome only
  return 3;
}
