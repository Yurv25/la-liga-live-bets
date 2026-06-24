import { useSyncExternalStore, useMemo, useCallback } from 'react';
import { getMatchStore } from '@/lib/matchStore';
import { Match } from '@/lib/types';

type Tab = 'all' | 'live' | 'upcoming';

export function useMatches(competitionId = 'laliga') {
  const store = useMemo(() => getMatchStore(competitionId), [competitionId]);

  const subscribe = useMemo(() => (cb: () => void) => store.subscribe(cb), [store]);
  const getSnapshot = useMemo(() => () => store.getSnapshot(), [store]);

  const state = useSyncExternalStore(subscribe, getSnapshot);
  const refresh = useCallback(() => store.refresh(), [store]); 

  return {...state, refresh};
}

export function useFilteredMatches(tab: Tab, competitionId = 'laliga') {
  const { matches, loading, refresh } = useMatches(competitionId);

  const filtered = useMemo(() => {
    if (tab === 'live') return matches.filter(m => m.status === 'LIVE' || m.status === 'HT' || m.status === 'ET' || m.status === 'PEN');
    if (tab === 'upcoming') return matches.filter(m => m.status === 'NS');
    return matches;
  }, [matches, tab]);

  const liveCount = useMemo(
    () => matches.filter(m => m.status === 'LIVE' || m.status === 'HT' || m.status === 'ET' || m.status === 'PEN').length,
    [matches]
  );

  return { matches: filtered, allMatches: matches, loading, liveCount, refresh };
}
