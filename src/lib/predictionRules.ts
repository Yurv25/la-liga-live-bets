import { Match } from './types';

// Lock predictions this many ms before kickoff.
// Centralized here so MatchCard, PredictionModal, etc. stay consistent.
export const LOCK_BEFORE_KICKOFF_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Predictions are locked when:
 *  - The match has already started (status !== 'NS'), or
 *  - Kickoff is within LOCK_BEFORE_KICKOFF_MS from now.
 */
export function isPredictionLocked(match: Match, now: number = Date.now()): boolean {
  const kickoff = new Date(match.startTime).getTime();
  // Postponed or cancelled → never lock, allow predictions until rescheduled
  if (match.status === 'PPD' || match.status === 'CANC') {
    return kickoff - now <= LOCK_BEFORE_KICKOFF_MS; // same rule as NS
  }
  if (match.status !== 'NS') return true;
  
  return kickoff - now <= LOCK_BEFORE_KICKOFF_MS;
}
