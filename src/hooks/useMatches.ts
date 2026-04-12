import { useSyncExternalStore, useMemo } from 'react';
import { getMatchStore } from '@/lib/matchStore';
import { Match } from '@/lib/types';

type Tab = 'all' | 'live' | 'upcoming';

export function useMatches(competitionId = 'laliga') {
  const store = useMemo(() => getMatchStore(competitionId), [competitionId]);

  const state = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getSnapshot()
  );

  return state;
}

export function useFilteredMatches(tab: Tab, competitionId = 'laliga') {
  const { matches, loading } = useMatches(competitionId);

  const filtered = useMemo(() => {
    if (tab === 'live') return matches.filter(m => m.status === 'LIVE' || m.status === 'HT');
    if (tab === 'upcoming') return matches.filter(m => m.status === 'NS');
    return matches;
  }, [matches, tab]);

  const liveCount = useMemo(
    () => matches.filter(m => m.status === 'LIVE' || m.status === 'HT').length,
    [matches]
  );

  return { matches: filtered, allMatches: matches, loading, liveCount };
}
