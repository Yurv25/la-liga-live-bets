export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'LIVE' | 'HT' | 'FT' | 'NS' | 'ET' | 'PEN' | 'PPD' | 'CANC';
  minute: number | null;
  startTime: string;
  homeLogo: string;
  awayLogo: string;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  round?: number | null;
  leagueId?: number | null;
  seasonId?: number | null;
}

export interface Prediction {
  matchId: string;
  userId: string;
  displayName: string;
  homeScore: number;
  awayScore: number;
}

export interface GroupMember {
  userId: string;
  displayName: string;
}

export interface Group {
  id: string;
  joinCode: string;
  name: string;
  competitionId: string;
  createdBy: string;
  members: GroupMember[];
  pointsFrom?: string | null;
}
