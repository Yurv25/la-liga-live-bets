import { Match } from './types';

const teamLogos: Record<string, string> = {
  'Barcelona': 'https://crests.football-data.org/81.png',
  'Real Madrid': 'https://crests.football-data.org/86.png',
  'Atletico Madrid': 'https://crests.football-data.org/78.png',
  'Real Sociedad': 'https://crests.football-data.org/90.png',
  'Real Betis': 'https://crests.football-data.org/79.png',
  'Athletic Bilbao': 'https://crests.football-data.org/77.png',
  'Villarreal': 'https://crests.football-data.org/94.png',
  'Girona': 'https://crests.football-data.org/298.png',
  'Sevilla': 'https://crests.football-data.org/559.png',
  'Valencia': 'https://crests.football-data.org/95.png',
  'Osasuna': 'https://crests.football-data.org/79.png',
  'Celta Vigo': 'https://crests.football-data.org/558.png',
  'Getafe': 'https://crests.football-data.org/82.png',
  'Mallorca': 'https://crests.football-data.org/89.png',
  'Rayo Vallecano': 'https://crests.football-data.org/87.png',
  'Las Palmas': 'https://crests.football-data.org/275.png',
  'Alaves': 'https://crests.football-data.org/263.png',
  'Espanyol': 'https://crests.football-data.org/80.png',
  'Leganes': 'https://crests.football-data.org/745.png',
  'Valladolid': 'https://crests.football-data.org/250.png',
};

const getLogo = (team: string) => teamLogos[team] || '';

// Helper to create a date relative to today at a specific hour
function dayOffset(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Helper to create a date X minutes ago from now (for live/finished sims)
function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

// Helper to create a date X minutes in the future
function minutesFromNow(mins: number): string {
  return new Date(Date.now() + mins * 60_000).toISOString();
}

/**
 * === ACCELERATED LIVE MATCH SIMULATION ===
 * Real matches last 90 minutes. For demo purposes, we compress them so each
 * "live" match lasts ~3-5 minutes of real time. The simulated match minute
 * advances at a configurable speed multiplier.
 *
 * speedMultiplier = 30 means: 1 real second = 30 match seconds
 *   → A 90-minute match completes in 3 real minutes.
 *
 * The match progresses through: NS → LIVE (1-45) → HT (45) → LIVE (45-90) → FT
 *
 * `simStartTime` = the real timestamp when the match kicked off in the demo.
 */
interface SimulatedMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  finalHomeScore: number;
  finalAwayScore: number;
  homeGoalMinutes: number[]; // match minutes when home scored
  awayGoalMinutes: number[]; // match minutes when away scored
  simStartTime: string;       // when this match "kicked off" in demo
  speedMultiplier: number;    // how many match-seconds per real-second
}

// These matches will progress in real-time during the demo session.
// Tweak `simStartTime` (use minutesAgo) and `speedMultiplier` to control state.
const simulatedMatches: SimulatedMatch[] = [
  // Live match: started 1 min ago at 30x speed → currently around minute 30, in progress
  {
    id: 'sim-1',
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    finalHomeScore: 2,
    finalAwayScore: 2,
    homeGoalMinutes: [12, 67],
    awayGoalMinutes: [34, 88],
    simStartTime: minutesAgo(1),
    speedMultiplier: 30, // 90 match-min in 3 real-min
  },
  // Live match nearing halftime: started 1.5 min ago at 30x → around minute 45 (HT soon)
  {
    id: 'sim-2',
    homeTeam: 'Atletico Madrid',
    awayTeam: 'Sevilla',
    finalHomeScore: 1,
    finalAwayScore: 0,
    homeGoalMinutes: [22],
    awayGoalMinutes: [],
    simStartTime: minutesAgo(1.5),
    speedMultiplier: 30,
  },
  // Live match in second half: started 2.5 min ago at 30x → around minute 75
  {
    id: 'sim-3',
    homeTeam: 'Villarreal',
    awayTeam: 'Real Sociedad',
    finalHomeScore: 3,
    finalAwayScore: 1,
    homeGoalMinutes: [8, 41, 70],
    awayGoalMinutes: [55],
    simStartTime: minutesAgo(2.5),
    speedMultiplier: 30,
  },
];

/**
 * Compute the current state of a simulated match based on elapsed real time.
 * Returns the Match with up-to-date status, minute, and score.
 *
 * LOOPING: Once a sim match finishes (FT), it stays "finished" for ~30s of real
 * time so users can see the result, then auto-restarts. This guarantees the
 * Live tab is never empty during demo/MVP usage.
 */
const FT_HOLD_REAL_SEC = 30; // seconds to hold the FT screen before restarting

function computeSimulatedMatch(sim: SimulatedMatch): Match {
  const now = Date.now();
  const startMs = new Date(sim.simStartTime).getTime();
  // Total real-seconds for one full cycle: 90 match-min @ speedMultiplier + FT hold
  const cycleRealSec = (90 * 60) / sim.speedMultiplier + FT_HOLD_REAL_SEC;
  const cycleRealMs = cycleRealSec * 1000;

  // Wrap into the current cycle so the match loops forever.
  const elapsedInCycleMs = ((now - startMs) % cycleRealMs + cycleRealMs) % cycleRealMs;
  const elapsedMatchMin = (elapsedInCycleMs / 1000) * sim.speedMultiplier / 60;

  let status: Match['status'];
  let minute: number | null;
  let homeScore = 0;
  let awayScore = 0;

  if (elapsedMatchMin < 0) {
    // Hasn't started yet
    status = 'NS';
    minute = null;
  } else if (elapsedMatchMin < 45) {
    status = 'LIVE';
    minute = Math.floor(elapsedMatchMin);
  } else if (elapsedMatchMin < 50) {
    // 5-min HT window (in match minutes)
    status = 'HT';
    minute = 45;
  } else if (elapsedMatchMin < 95) {
    status = 'LIVE';
    minute = Math.floor(elapsedMatchMin - 5); // subtract HT
  } else {
    status = 'FT';
    minute = 90;
  }

  // Score progresses based on elapsed match minutes
  const effectiveMin = status === 'FT' ? 90 : (minute ?? 0);
  homeScore = sim.homeGoalMinutes.filter(m => m <= effectiveMin).length;
  awayScore = sim.awayGoalMinutes.filter(m => m <= effectiveMin).length;

  return {
    id: sim.id,
    homeTeam: sim.homeTeam,
    awayTeam: sim.awayTeam,
    homeScore,
    awayScore,
    status,
    minute,
    startTime: sim.simStartTime,
    homeLogo: getLogo(sim.homeTeam),
    awayLogo: getLogo(sim.awayTeam),
  };
}

// Static (non-simulated) matches: finished, upcoming
const staticMatches: Match[] = [
  // === FINISHED EARLIER TODAY (for prediction-result scenarios) ===
  {
    id: 'fin-1',
    homeTeam: 'Real Betis',
    awayTeam: 'Valencia',
    homeScore: 2,
    awayScore: 1,
    status: 'FT',
    minute: 90,
    startTime: dayOffset(0, 12, 0),
    homeLogo: getLogo('Real Betis'),
    awayLogo: getLogo('Valencia'),
  },
  {
    id: 'fin-2',
    homeTeam: 'Athletic Bilbao',
    awayTeam: 'Getafe',
    homeScore: 0,
    awayScore: 0,
    status: 'FT',
    minute: 90,
    startTime: dayOffset(0, 14, 0),
    homeLogo: getLogo('Athletic Bilbao'),
    awayLogo: getLogo('Getafe'),
  },
  {
    id: 'fin-3',
    homeTeam: 'Girona',
    awayTeam: 'Mallorca',
    homeScore: 3,
    awayScore: 2,
    status: 'FT',
    minute: 90,
    startTime: dayOffset(0, 16, 30),
    homeLogo: getLogo('Girona'),
    awayLogo: getLogo('Mallorca'),
  },

  // === UPCOMING TODAY (starting soon — within minutes) ===
  {
    id: 'up-soon-1',
    homeTeam: 'Celta Vigo',
    awayTeam: 'Osasuna',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: minutesFromNow(8), // starts in 8 minutes — for "upcoming soon" polling
    homeLogo: getLogo('Celta Vigo'),
    awayLogo: getLogo('Osasuna'),
  },
  {
    id: 'up-soon-2',
    homeTeam: 'Rayo Vallecano',
    awayTeam: 'Espanyol',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: minutesFromNow(45),
    homeLogo: getLogo('Rayo Vallecano'),
    awayLogo: getLogo('Espanyol'),
  },

  // === TOMORROW ===
  {
    id: 'up-1',
    homeTeam: 'Las Palmas',
    awayTeam: 'Alaves',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(1, 14, 0),
    homeLogo: getLogo('Las Palmas'),
    awayLogo: getLogo('Alaves'),
  },
  {
    id: 'up-2',
    homeTeam: 'Leganes',
    awayTeam: 'Valladolid',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(1, 18, 30),
    homeLogo: getLogo('Leganes'),
    awayLogo: getLogo('Valladolid'),
  },

  // === DAY +2 ===
  {
    id: 'up-3',
    homeTeam: 'Barcelona',
    awayTeam: 'Sevilla',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(2, 21, 0),
    homeLogo: getLogo('Barcelona'),
    awayLogo: getLogo('Sevilla'),
  },

  // === DAY +3 ===
  {
    id: 'up-4',
    homeTeam: 'Real Madrid',
    awayTeam: 'Villarreal',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(3, 16, 15),
    homeLogo: getLogo('Real Madrid'),
    awayLogo: getLogo('Villarreal'),
  },
];

export function getMatches(): Match[] {
  // Compute live state on every call so simulated matches progress in real-time
  return [
    ...simulatedMatches.map(computeSimulatedMatch),
    ...staticMatches,
  ];
}

export function getMatchById(id: string): Match | undefined {
  return getMatches().find((m) => m.id === id);
}

// === SEED DEMO PREDICTIONS ===
// Pre-populate predictions on first load so the user sees realistic group/leaderboard data.
// Mix of correct, partial-credit, and wrong predictions for finished matches,
// plus predictions on live matches (still in progress) and upcoming matches.
export interface SeedPrediction {
  matchId: string;
  homeScore: number;
  awayScore: number;
  nickname: string;
}

export const seedPredictions: SeedPrediction[] = [
  // Finished matches — varied accuracy for leaderboard interest
  { matchId: 'fin-1', homeScore: 2, awayScore: 1, nickname: 'Alex' },    // exact (3pts)
  { matchId: 'fin-1', homeScore: 1, awayScore: 0, nickname: 'Sam' },     // correct winner (1pt)
  { matchId: 'fin-1', homeScore: 0, awayScore: 2, nickname: 'Jordan' },  // wrong (0pts)
  { matchId: 'fin-2', homeScore: 0, awayScore: 0, nickname: 'Alex' },    // exact draw (3pts)
  { matchId: 'fin-2', homeScore: 1, awayScore: 1, nickname: 'Sam' },     // correct draw (1pt)
  { matchId: 'fin-3', homeScore: 2, awayScore: 1, nickname: 'Alex' },    // correct winner (1pt)
  { matchId: 'fin-3', homeScore: 3, awayScore: 2, nickname: 'Jordan' },  // exact (3pts)

  // Live matches — predictions placed before kickoff, awaiting result
  { matchId: 'sim-1', homeScore: 2, awayScore: 1, nickname: 'Alex' },
  { matchId: 'sim-1', homeScore: 1, awayScore: 2, nickname: 'Sam' },
  { matchId: 'sim-2', homeScore: 1, awayScore: 1, nickname: 'Jordan' },
  { matchId: 'sim-3', homeScore: 2, awayScore: 0, nickname: 'Sam' },

  // Upcoming match predictions
  { matchId: 'up-1', homeScore: 1, awayScore: 0, nickname: 'Alex' },
  { matchId: 'up-3', homeScore: 3, awayScore: 1, nickname: 'Jordan' },
];
