import { supabase } from '@/integrations/supabase/client';
import { Match } from './types';

/**
 * === API CALL ENTRY POINT ===
 * 
 * This function is the ONLY place that calls the backend edge function.
 * It is invoked by MatchStore.fetchMatches() in matchStore.ts, which 
 * handles polling intervals (20s live / 1min upcoming soon / 10min otherwise).
 * 
 * Smart retry logic:
 * - Tracks consecutive empty responses per calendar day
 * - After MAX_EMPTY_RETRIES consecutive empties, stops calling for the rest of the day
 * - Resets at midnight (new day = fresh retries)
 * - If the API returns data at any point, the counter resets
 */

const MAX_EMPTY_RETRIES = 3; // Stop after 3 consecutive empty responses in one day

// Track empty responses per day to avoid hammering a broken API
let consecutiveEmpties = 0;
let lastEmptyDate: string | null = null; // YYYY-MM-DD of the day we started counting
let apiDisabledUntilTomorrow = false;

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function resetIfNewDay() {
  const today = getTodayKey();
  if (lastEmptyDate !== today) {
    // New day — reset everything, give the API another chance
    consecutiveEmpties = 0;
    apiDisabledUntilTomorrow = false;
    lastEmptyDate = today;
  }
}

export async function fetchAllMatches(): Promise<Match[]> {
  // Check if we should skip calling the API today
  resetIfNewDay();

  if (apiDisabledUntilTomorrow) {
    console.log('[API] Skipping — API returned empty too many times today, using mock data');
    return [];
  }

  try {
    // This calls the Supabase edge function: supabase/functions/laliga-matches/index.ts
    // The edge function proxies to the Bzzoiro sports API and merges live + scheduled data
    const { data, error } = await supabase.functions.invoke('laliga-matches');
    //console.log("BACKEND RESPONSE:", data);
    console.log("RAW STATUSES:", data?.debug?.rawStatuses);
    const matches = Array.isArray(data) ? data : data?.data;
    if (error) {
      console.error('[API] Edge function error:', error);
      consecutiveEmpties++;
      lastEmptyDate = getTodayKey();
      if (consecutiveEmpties >= MAX_EMPTY_RETRIES) {
        apiDisabledUntilTomorrow = true;
        console.warn(`[API] Disabled for today after ${MAX_EMPTY_RETRIES} consecutive failures`);
      }
      return [];
    }

    if (!Array.isArray(data)) {
      console.error('[API] Unexpected response (not an array):', data);
      consecutiveEmpties++;
      lastEmptyDate = getTodayKey();
      if (consecutiveEmpties >= MAX_EMPTY_RETRIES) {
        apiDisabledUntilTomorrow = true;
        console.warn(`[API] Disabled for today after ${MAX_EMPTY_RETRIES} consecutive non-array responses`);
      }
      return [];
    }

    if (data.length === 0) {
      // API returned an empty array — could mean no matches or API issue
      consecutiveEmpties++;
      lastEmptyDate = getTodayKey();
      console.warn(`[API] Empty response (${consecutiveEmpties}/${MAX_EMPTY_RETRIES} retries)`);
      if (consecutiveEmpties >= MAX_EMPTY_RETRIES) {
        apiDisabledUntilTomorrow = true;
        console.warn(`[API] Disabled for today — will retry tomorrow`);
      }
      return [];
    }

    // Success! API returned real match data — reset the empty counter
    consecutiveEmpties = 0;
    console.log(`[API] Fetched ${data.length} matches successfully`);
    return data as Match[];

  } catch (err) {
    console.error('[API] Network/fetch error:', err);
    consecutiveEmpties++;
    lastEmptyDate = getTodayKey();
    if (consecutiveEmpties >= MAX_EMPTY_RETRIES) {
      apiDisabledUntilTomorrow = true;
      console.warn(`[API] Disabled for today after ${MAX_EMPTY_RETRIES} consecutive errors`);
    }
    return [];
  }
}
