export interface Competition {
  id: string;
  name: string;
  country: string;
  logo: string;
  leagueId: number;
}

export const COMPETITIONS: Competition[] = [
  { 
    id: 'laliga', 
    name: 'La Liga', 
    country: 'Spain', 
    logo: 'https://sports.bzzoiro.com/img/league/3/', 
    leagueId: 3 
  },
  { 
    id: 'worldcup', 
    name: 'World Cup', 
    country: 'International', 
    logo: 'https://sports.bzzoiro.com/img/league/27/', 
    leagueId: 27 
  },
];