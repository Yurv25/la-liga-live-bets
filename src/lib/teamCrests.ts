const BZZOIRO_BASE = 'https://sports.bzzoiro.com/img/team';

// Default fallback crest (a simple soccer ball SVG as data URI)
export const DEFAULT_CREST = '/placeholder.svg';

/**
 * Local fallback crest mapping by team name (normalized lowercase).
 * Grouped by league/competition for easy extension.
 * Uses football-data.org as a secondary CDN.
 */
const LOCAL_CRESTS: Record<string, string> = {
  // --- La Liga ---
  'barcelona': 'https://crests.football-data.org/81.png',
  'fc barcelona': 'https://crests.football-data.org/81.png',
  'real madrid': 'https://crests.football-data.org/86.png',
  'atletico madrid': 'https://crests.football-data.org/78.png',
  'atlético madrid': 'https://crests.football-data.org/78.png',
  'atlético de madrid': 'https://crests.football-data.org/78.png',
  'real sociedad': 'https://crests.football-data.org/90.png',
  'real betis': 'https://crests.football-data.org/79.png',
  'athletic bilbao': 'https://crests.football-data.org/77.png',
  'athletic club': 'https://crests.football-data.org/77.png',
  'villarreal': 'https://crests.football-data.org/94.png',
  'girona': 'https://crests.football-data.org/298.png',
  'sevilla': 'https://crests.football-data.org/559.png',
  'valencia': 'https://crests.football-data.org/95.png',
  'osasuna': 'https://crests.football-data.org/89.png',
  'celta vigo': 'https://crests.football-data.org/558.png',
  'getafe': 'https://crests.football-data.org/82.png',
  'mallorca': 'https://crests.football-data.org/89.png',
  'rayo vallecano': 'https://crests.football-data.org/87.png',
  'las palmas': 'https://crests.football-data.org/275.png',
  'alavés': 'https://crests.football-data.org/263.png',
  'alaves': 'https://crests.football-data.org/263.png',
  'real valladolid': 'https://crests.football-data.org/250.png',
  'espanyol': 'https://crests.football-data.org/80.png',
  'leganes': 'https://crests.football-data.org/745.png',
  'leganés': 'https://crests.football-data.org/745.png',

  // --- Premier League ---
  'arsenal': 'https://crests.football-data.org/57.png',
  'manchester city': 'https://crests.football-data.org/65.png',
  'manchester united': 'https://crests.football-data.org/66.png',
  'liverpool': 'https://crests.football-data.org/64.png',
  'chelsea': 'https://crests.football-data.org/61.png',
  'tottenham': 'https://crests.football-data.org/73.png',
  'tottenham hotspur': 'https://crests.football-data.org/73.png',
  'newcastle': 'https://crests.football-data.org/67.png',
  'newcastle united': 'https://crests.football-data.org/67.png',
  'aston villa': 'https://crests.football-data.org/58.png',
  'west ham': 'https://crests.football-data.org/563.png',
  'west ham united': 'https://crests.football-data.org/563.png',
  'brighton': 'https://crests.football-data.org/397.png',

  // --- Serie A ---
  'inter': 'https://crests.football-data.org/108.png',
  'inter milan': 'https://crests.football-data.org/108.png',
  'ac milan': 'https://crests.football-data.org/98.png',
  'milan': 'https://crests.football-data.org/98.png',
  'juventus': 'https://crests.football-data.org/109.png',
  'napoli': 'https://crests.football-data.org/113.png',
  'roma': 'https://crests.football-data.org/100.png',
  'as roma': 'https://crests.football-data.org/100.png',
  'lazio': 'https://crests.football-data.org/110.png',
  'atalanta': 'https://crests.football-data.org/102.png',

  // --- Bundesliga ---
  'bayern munich': 'https://crests.football-data.org/5.png',
  'bayern münchen': 'https://crests.football-data.org/5.png',
  'borussia dortmund': 'https://crests.football-data.org/4.png',
  'bayer leverkusen': 'https://crests.football-data.org/3.png',
  'rb leipzig': 'https://crests.football-data.org/721.png',

  // --- Ligue 1 ---
  'paris saint-germain': 'https://crests.football-data.org/524.png',
  'psg': 'https://crests.football-data.org/524.png',
  'marseille': 'https://crests.football-data.org/516.png',
  'olympique de marseille': 'https://crests.football-data.org/516.png',
  'lyon': 'https://crests.football-data.org/523.png',
  'olympique lyonnais': 'https://crests.football-data.org/523.png',
  'monaco': 'https://crests.football-data.org/548.png',
  'as monaco': 'https://crests.football-data.org/548.png',
};

/**
 * Get the primary crest URL from Bzzoiro API.
 * Returns empty string if no team ID is available.
 */
export function getBzzoiroCrestUrl(teamId?: number | null): string {
  if (!teamId) return '';
  return `${BZZOIRO_BASE}/${teamId}/`;
}

/**
 * Get the local fallback crest URL by team name.
 */
export function getLocalCrestUrl(teamName: string): string {
  return LOCAL_CRESTS[teamName.toLowerCase().trim()] || '';
}

/**
 * Resolve a team crest URL with cascading priority:
 * 1. Bzzoiro API URL (if teamId is available)
 * 2. Local fallback by team name
 * 3. Default placeholder
 */
export function resolveTeamCrest(teamId?: number | null, teamName?: string): string {
  const bzzoiro = getBzzoiroCrestUrl(teamId);
  if (bzzoiro) return bzzoiro;

  if (teamName) {
    const local = getLocalCrestUrl(teamName);
    if (local) return local;
  }

  return DEFAULT_CREST;
}

/**
 * Get the next fallback URL when the current one fails to load.
 * Used in onError handlers for <img> elements.
 */
export function getFallbackCrest(currentSrc: string, teamName: string): string {
  const local = getLocalCrestUrl(teamName);

  // If currently showing Bzzoiro URL, try local fallback
  if (currentSrc.includes('sports.bzzoiro.com') && local) {
    return local;
  }

  // Otherwise use default
  return DEFAULT_CREST;
}
