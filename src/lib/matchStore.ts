import { Match } from './types';
import { fetchAllMatches } from './api';
import { getMatches as getMockMatches } from './matchData';

type Listener = () => void;

interface MatchStoreState {
  matches: Match[];
  loading: boolean;
  lastFetchTime: number;
}

/**
 * === POLLING INTERVALS ===
 * The store uses adaptive polling based on match state:
 * - POLL_LIVE (20s): When there are live or half-time matches
 * - POLL_UPCOMING_SOON (1min): When the next match starts within 30 minutes
 * - POLL_UPCOMING (10min): Default for upcoming/finished matches
 * 
 * Polling starts when the first React component subscribes (via useMatches hook)
 * and stops when the last component unsubscribes. See startPolling() and scheduleNext().
 * 
 * The actual API call happens in api.ts → fetchAllMatches(), which has its own
 * smart retry logic to stop calling after repeated empty responses.
 */
const POLL_LIVE = 20_000;        // 20s for live matches
const POLL_UPCOMING_SOON = 60_000; // 1min when next match within 30min
const POLL_UPCOMING = 600_000;    // 10min for upcoming
const UPCOMING_SOON_THRESHOLD = 30 * 60 * 1000; // 30 minutes

class MatchStore {
  private state: MatchStoreState = {
    matches: getMockMatches(),
    loading: false,
    lastFetchTime: 0,
  };

  private listeners = new Set<Listener>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private refCount = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.refCount++;

    if (this.refCount === 1) {
      this.startPolling();
    }

    return () => {
      this.listeners.delete(listener);
      this.refCount--;
      if (this.refCount === 0) {
        this.stopPolling();
      }
    };
  }

  getSnapshot(): MatchStoreState {
    return this.state;
  }

  // Derived selectors
  getLiveMatches(): Match[] {
    return this.state.matches.filter(m => m.status === 'LIVE' || m.status === 'HT');
  }

  getUpcomingMatches(): Match[] {
    return this.state.matches.filter(m => m.status === 'NS');
  }

  getFinishedMatches(): Match[] {
    return this.state.matches.filter(m => m.status === 'FT');
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  private setState(partial: Partial<MatchStoreState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private async fetchMatches() {
    this.setState({ loading: true });
    try {
      const data = await fetchAllMatches();
      if (data.length > 0) {
        this.setState({ matches: data, lastFetchTime: Date.now(), loading: false });
      } else {
        this.setState({ loading: false });
      }
    } catch {
      this.setState({ loading: false });
    }
  }

  private computeNextPollInterval(): number {
    const matches = this.state.matches;
    const hasLive = matches.some(m => m.status === 'LIVE' || m.status === 'HT');

    if (hasLive) return POLL_LIVE;

    const now = Date.now();
    const hasUpcomingSoon = matches.some(m => {
      if (m.status !== 'NS') return false;
      const start = new Date(m.startTime).getTime();
      return start - now <= UPCOMING_SOON_THRESHOLD && start > now;
    });

    if (hasUpcomingSoon) return POLL_UPCOMING_SOON;

    const hasUpcoming = matches.some(m => m.status === 'NS');
    if (hasUpcoming) return POLL_UPCOMING;

    // All finished — very infrequent
    return POLL_UPCOMING;
  }

  private scheduleNext() {
    const interval = this.computeNextPollInterval();
    const timer = setTimeout(() => {
      if (this.refCount > 0) {
        this.fetchMatches().then(() => this.scheduleNext());
      }
    }, interval);
    this.timers.push(timer);
  }

  private startPolling() {
    // Defer to avoid mutating state during useSyncExternalStore's subscribe call
    const timer = setTimeout(() => {
      if (this.refCount > 0) {
        this.fetchMatches().then(() => this.scheduleNext());
      }
    }, 0);
    this.timers.push(timer);
  }

  private stopPolling() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
  }
}

// Singleton per competition (scalable for future leagues)
const stores = new Map<string, MatchStore>();

export function getMatchStore(competitionId = 'laliga'): MatchStore {
  if (!stores.has(competitionId)) {
    stores.set(competitionId, new MatchStore());
  }
  return stores.get(competitionId)!;
}
