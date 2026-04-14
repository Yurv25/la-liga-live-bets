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

// Helper to create a date relative to today at a specific hour (Madrid time approximation)
function dayOffset(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const initialMatches: Match[] = [
  // === TODAY - 1 finished, 1 live ===
  {
    id: '1',
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    homeScore: 2,
    awayScore: 1,
    status: 'FT',
    minute: 90,
    startTime: dayOffset(0, 14, 0),
    homeLogo: getLogo('Barcelona'),
    awayLogo: getLogo('Real Madrid'),
  },
  {
    id: '2',
    homeTeam: 'Atletico Madrid',
    awayTeam: 'Real Sociedad',
    homeScore: 1,
    awayScore: 0,
    status: 'LIVE',
    minute: 62,
    startTime: dayOffset(0, 16, 15),
    homeLogo: getLogo('Atletico Madrid'),
    awayLogo: getLogo('Real Sociedad'),
  },
  {
    id: '3',
    homeTeam: 'Sevilla',
    awayTeam: 'Valencia',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(0, 21, 0),
    homeLogo: getLogo('Sevilla'),
    awayLogo: getLogo('Valencia'),
  },

  // === TOMORROW ===
  {
    id: '4',
    homeTeam: 'Real Betis',
    awayTeam: 'Athletic Bilbao',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(1, 14, 0),
    homeLogo: getLogo('Real Betis'),
    awayLogo: getLogo('Athletic Bilbao'),
  },
  {
    id: '5',
    homeTeam: 'Villarreal',
    awayTeam: 'Girona',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(1, 16, 15),
    homeLogo: getLogo('Villarreal'),
    awayLogo: getLogo('Girona'),
  },
  {
    id: '6',
    homeTeam: 'Getafe',
    awayTeam: 'Osasuna',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(1, 18, 30),
    homeLogo: getLogo('Getafe'),
    awayLogo: getLogo('Osasuna'),
  },

  // === DAY +2 ===
  {
    id: '7',
    homeTeam: 'Celta Vigo',
    awayTeam: 'Mallorca',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(2, 19, 0),
    homeLogo: getLogo('Celta Vigo'),
    awayLogo: getLogo('Mallorca'),
  },
  {
    id: '8',
    homeTeam: 'Rayo Vallecano',
    awayTeam: 'Las Palmas',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(2, 21, 0),
    homeLogo: getLogo('Rayo Vallecano'),
    awayLogo: getLogo('Las Palmas'),
  },

  // === DAY +3 ===
  {
    id: '9',
    homeTeam: 'Alaves',
    awayTeam: 'Espanyol',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(3, 16, 15),
    homeLogo: getLogo('Alaves'),
    awayLogo: getLogo('Espanyol'),
  },
  {
    id: '10',
    homeTeam: 'Leganes',
    awayTeam: 'Valladolid',
    homeScore: 0,
    awayScore: 0,
    status: 'NS',
    minute: null,
    startTime: dayOffset(3, 18, 30),
    homeLogo: getLogo('Leganes'),
    awayLogo: getLogo('Valladolid'),
  },
];

let matches = [...initialMatches];

export function getMatches(): Match[] {
  return [...matches];
}

export function getMatchById(id: string): Match | undefined {
  return matches.find((m) => m.id === id);
}
