// Bzzoiro API service for La Liga live data
// Get your free API key at: https://sports.bzzoiro.com/register/

const BASE_URL = 'https://sports.bzzoiro.com/api';
const LA_LIGA_ID = 3;

// Store API key - user will configure this
let apiKey: string | null = localStorage.getItem('bzzoiro_api_key');

export function setApiKey(key: string) {
  apiKey = key;
  localStorage.setItem('bzzoiro_api_key', key);
}

export function getApiKey(): string | null {
  return apiKey;
}

function headers() {
  if (!apiKey) throw new Error('API key not configured');
  return { Authorization: `Token ${apiKey}` };
}

export interface BzzoiroEvent {
  id: number;
  home_team: string;
  away_team: string;
  home_team_id?: number;
  away_team_id?: number;
  league: { name: string; country: string };
  event_date: string;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
  minute?: number | null;
  incidents?: unknown[];
  statistics?: unknown;
}

export interface BzzoiroLive {
  id: number;
  home_team: string;
  away_team: string;
  home_team_id?: number;
  away_team_id?: number;
  home_score: number;
  away_score: number;
  status: string;
  minute: number | null;
  league: { name: string; country: string };
}

// Normalize status from API to our app status
function normalizeStatus(status: string): 'LIVE' | 'HT' | 'FT' | 'NS' {
  const s = status.toLowerCase();
  if (s === 'inprogress' || s === 'live' || s === 'in progress') return 'LIVE';
  if (s === 'halftime' || s === 'ht' || s === 'half time') return 'HT';
  if (s === 'finished' || s === 'ft' || s === 'ended') return 'FT';
  return 'NS';
}

function teamLogoUrl(teamId?: number): string {
  if (!teamId) return '';
  return `https://sports.bzzoiro.com/img/team/${teamId}/`;
}

import { Match } from './types';

export async function fetchLaLigaEvents(): Promise<Match[]> {
  try {
    const res = await fetch(`${BASE_URL}/events/?league=${LA_LIGA_ID}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const events: BzzoiroEvent[] = data.results || data;
    
    return events.map((ev) => ({
      id: String(ev.id),
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      homeScore: ev.home_score ?? 0,
      awayScore: ev.away_score ?? 0,
      status: normalizeStatus(ev.status),
      minute: ev.minute ?? null,
      startTime: ev.event_date,
      homeLogo: teamLogoUrl(ev.home_team_id),
      awayLogo: teamLogoUrl(ev.away_team_id),
    }));
  } catch (err) {
    console.error('Failed to fetch La Liga events:', err);
    return [];
  }
}

export async function fetchLiveMatches(): Promise<Match[]> {
  try {
    const res = await fetch(`${BASE_URL}/live/`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const matches: BzzoiroLive[] = (data.results || data).filter(
      (m: BzzoiroLive) => m.league?.name === 'La Liga'
    );

    return matches.map((m) => ({
      id: String(m.id),
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeScore: m.home_score,
      awayScore: m.away_score,
      status: normalizeStatus(m.status),
      minute: m.minute,
      startTime: new Date().toISOString(),
      homeLogo: teamLogoUrl(m.home_team_id),
      awayLogo: teamLogoUrl(m.away_team_id),
    }));
  } catch (err) {
    console.error('Failed to fetch live matches:', err);
    return [];
  }
}

// Combined: merge live data into events list
export async function fetchAllMatches(): Promise<Match[]> {
  const [events, live] = await Promise.all([
    fetchLaLigaEvents(),
    fetchLiveMatches(),
  ]);

  // Merge live data over events
  const liveMap = new Map(live.map((m) => [m.id, m]));
  const merged = events.map((ev) => liveMap.get(ev.id) || ev);
  
  // Add any live matches not in events
  live.forEach((m) => {
    if (!events.find((ev) => ev.id === m.id)) {
      merged.push(m);
    }
  });

  return merged;
}
