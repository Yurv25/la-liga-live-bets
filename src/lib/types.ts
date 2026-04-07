export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'LIVE' | 'HT' | 'FT' | 'NS'; // Not Started
  minute: number | null;
  startTime: string;
  homeLogo: string;
  awayLogo: string;
}

export interface Prediction {
  matchId: string;
  homeScore: number;
  awayScore: number;
  nickname: string;
  timestamp: number;
}

export interface Group {
  id: string;
  name: string;
  competitionId: string;
  members: GroupMember[];
}

export interface GroupMember {
  nickname: string;
  predictions: Prediction[];
  points: number;
}
