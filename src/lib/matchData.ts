import { Match } from './types';

// Team logos using football crests from a public API
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
};

const getLogo = (team: string) => teamLogos[team] || '';

const initialMatches: Match[] = [
  {
    id: '1',
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    homeScore: 2,
    awayScore: 1,
    status: 'LIVE',
    minute: 75,
    startTime: new Date().toISOString(),
    homeLogo: getLogo('Barcelona'),
    awayLogo: getLogo('Real Madrid'),
  },
  {
    id: '2',
    homeTeam: 'Atletico Madrid',
    awayTeam: 'Real Sociedad',
    homeScore: 0,
    awayScore: 0,
    status: 'HT',
    minute: 45,
    startTime: new Date().toISOString(),
    homeLogo: getLogo('Atletico Madrid'),
    awayLogo: getLogo('Real Sociedad'),
  },
  {
    id: '3',
    homeTeam: 'Real Betis',
    awayTeam: 'Athletic Bilbao',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    homeLogo: getLogo('Real Betis'),
    awayLogo: getLogo('Athletic Bilbao'),
  },
  {
    id: '4',
    homeTeam: 'Villarreal',
    awayTeam: 'Girona',
    homeScore: 1,
    awayScore: 3,
    status: 'FT',
    minute: 90,
    startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    homeLogo: getLogo('Villarreal'),
    awayLogo: getLogo('Girona'),
  },
  {
    id: '5',
    homeTeam: 'Sevilla',
    awayTeam: 'Valencia',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    homeLogo: getLogo('Sevilla'),
    awayLogo: getLogo('Valencia'),
  },
];

let matches = [...initialMatches];

// Simulate live match updates
function simulateUpdates(): Match[] {
  matches = matches.map((match) => {
    if (match.status === 'LIVE' && match.minute !== null) {
      const newMinute = match.minute + 1;
      if (newMinute >= 90) {
        return { ...match, status: 'FT' as const, minute: 90 };
      }
      if (newMinute === 45) {
        return { ...match, status: 'HT' as const, minute: 45 };
      }
      // Random goal chance ~2%
      const goalChance = Math.random();
      if (goalChance < 0.01) {
        return { ...match, minute: newMinute, homeScore: match.homeScore + 1 };
      } else if (goalChance < 0.02) {
        return { ...match, minute: newMinute, awayScore: match.awayScore + 1 };
      }
      return { ...match, minute: newMinute };
    }
    if (match.status === 'HT') {
      // Randomly resume after HT
      if (Math.random() < 0.05) {
        return { ...match, status: 'LIVE' as const, minute: 46 };
      }
    }
    return match;
  });
  return matches;
}

export function getMatches(): Match[] {
  return simulateUpdates();
}

export function getMatchById(id: string): Match | undefined {
  return matches.find((m) => m.id === id);
}
