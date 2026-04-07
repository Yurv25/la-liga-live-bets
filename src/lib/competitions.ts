export interface Competition {
  id: string;
  name: string;
  country: string;
  logo: string;
}

export const COMPETITIONS: Competition[] = [
  { id: 'laliga', name: 'La Liga', country: 'Spain', logo: '🇪🇸' },
  { id: 'premier-league', name: 'Premier League', country: 'England', logo: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'serie-a', name: 'Serie A', country: 'Italy', logo: '🇮🇹' },
  { id: 'bundesliga', name: 'Bundesliga', country: 'Germany', logo: '🇩🇪' },
  { id: 'ligue-1', name: 'Ligue 1', country: 'France', logo: '🇫🇷' },
  { id: 'champions-league', name: 'Champions League', country: 'Europe', logo: '🏆' },
];
