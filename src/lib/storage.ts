import { Prediction, Group, GroupMember } from './types';

const NICKNAME_KEY = 'gameon_nickname';
const PREDICTIONS_KEY = 'gameon_predictions';
const GROUPS_KEY = 'gameon_groups';

export function getNickname(): string | null {
  return localStorage.getItem(NICKNAME_KEY);
}

export function setNickname(name: string): void {
  localStorage.setItem(NICKNAME_KEY, name);
}

export function getPredictions(): Prediction[] {
  const data = localStorage.getItem(PREDICTIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function savePrediction(prediction: Prediction): void {
  const predictions = getPredictions();
  const existing = predictions.findIndex(
    (p) => p.matchId === prediction.matchId && p.nickname === prediction.nickname
  );
  if (existing >= 0) {
    predictions[existing] = prediction;
  } else {
    predictions.push(prediction);
  }
  localStorage.setItem(PREDICTIONS_KEY, JSON.stringify(predictions));
}

export function getGroups(): Group[] {
  const data = localStorage.getItem(GROUPS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveGroups(groups: Group[]): void {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function createGroup(name: string, creatorNickname: string, competitionId: string = 'laliga'): Group {
  const groups = getGroups();
  const group: Group = {
    id: Math.random().toString(36).substring(2, 8).toUpperCase(),
    name,
    competitionId,
    members: [{ nickname: creatorNickname, predictions: [], points: 0 }],
  };
  groups.push(group);
  saveGroups(groups);
  return group;
}

export function joinGroup(groupId: string, nickname: string): Group | null {
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  if (!group.members.find((m) => m.nickname === nickname)) {
    group.members.push({ nickname, predictions: [], points: 0 });
    saveGroups(groups);
  }
  return group;
}

export function getGroupById(id: string): Group | null {
  return getGroups().find((g) => g.id === id) || null;
}

export function updateGroupMemberPredictions(
  groupId: string,
  nickname: string,
  predictions: Prediction[]
): void {
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  const member = group.members.find((m) => m.nickname === nickname);
  if (member) {
    member.predictions = predictions;
  }
  saveGroups(groups);
}

export function calculatePoints(
  prediction: Prediction,
  actualHome: number,
  actualAway: number,
  matchStatus: string
): number {
  if (matchStatus !== 'FT') return 0;
  if (prediction.homeScore === actualHome && prediction.awayScore === actualAway) {
    return 3;
  }
  const predWinner =
    prediction.homeScore > prediction.awayScore
      ? 'home'
      : prediction.homeScore < prediction.awayScore
        ? 'away'
        : 'draw';
  const actualWinner =
    actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';
  if (predWinner === actualWinner) return 1;
  return 0;
}
