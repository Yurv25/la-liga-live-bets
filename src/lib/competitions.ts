export interface Competition {
  id: string;
  name: string;
  country: string;
  logo: string;
  leagueId: number;
  seasonIds: number[];
}

export const COMPETITIONS: Competition[] = [
  {
    id: 'laliga',
    name: 'La Liga',
    country: 'Spain',
    logo: 'https://sports.bzzoiro.com/img/league/3/',
    leagueId: 3,
    seasonIds: [294],
  },
  {
    id: 'worldcup',
    name: 'World Cup',
    country: 'International',
    logo: 'https://sports.bzzoiro.com/img/league/27/',
    leagueId: 27,
    seasonIds: [188, 383],  // Group stages and knockout stages season IDs
  },
];