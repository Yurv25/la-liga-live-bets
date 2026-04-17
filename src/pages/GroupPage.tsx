import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGroupById, joinGroup, getNickname, getPredictions, calculatePoints } from '@/lib/storage';
import { useFilteredMatches } from '@/hooks/useMatches';
import { COMPETITIONS } from '@/lib/competitions';
import { Group, Match, Prediction } from '@/lib/types';
import { ArrowLeft, Crown, CalendarDays, Trophy } from 'lucide-react';
import NicknamePrompt from '@/components/NicknamePrompt';
import MatchCard from '@/components/MatchCard';
import PredictionModal from '@/components/PredictionModal';
import { motion } from 'framer-motion';

type GroupTab = 'leaderboard' | 'matches';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [nickname, setNickname2] = useState(getNickname());
  const [activeTab, setActiveTab] = useState<GroupTab>('leaderboard');
  const [matches, setMatches] = useState<Match[]>(getMatches());
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (!id) return;
    const g = getGroupById(id);
    if (g && nickname) {
      joinGroup(id, nickname);
      setGroup(getGroupById(id));
    } else if (g) {
      setGroup(g);
    }
  }, [id, nickname]);

  const loadMatches = useCallback(async () => {
    try {
      const data = await fetchAllMatches();
      if (data.length > 0) setMatches(data);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 30000);
    return () => clearInterval(interval);
  }, [loadMatches]);

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
  }

  const competition = COMPETITIONS.find((c) => c.id === group.competitionId);
  const upcomingMatches = matches.filter((m) => m.status === 'NS');

  const leaderboard = group.members
    .map((member) => {
      const memberPredictions = getPredictions().filter((p) => p.nickname === member.nickname);
      let points = 0;
      memberPredictions.forEach((pred) => {
        const match = matches.find((m) => m.id === pred.matchId);
        if (match) {
          points += calculatePoints(pred, match.homeScore, match.awayScore, match.status);
        }
      });
      return { ...member, points, predictions: memberPredictions };
    })
    .sort((a, b) => b.points - a.points);

  const tabItems: { key: GroupTab; label: string; icon: React.ReactNode }[] = [
    { key: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="h-4 w-4" /> },
    { key: 'matches', label: 'Matches', icon: <CalendarDays className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-header border-b border-border/50 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-header-foreground/70 hover:text-header-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="text-lg font-bold font-display text-header-foreground block">{group.name}</span>
            {competition && (
              <span className="text-xs text-muted-foreground">
                {competition.logo} {competition.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 bg-header/50 border-b border-border/30">
        {tabItems.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {activeTab === 'leaderboard' && (
          <div className="space-y-2">
            {leaderboard.map((member, i) => (
              <motion.div
                key={member.nickname}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  i === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-card border border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {i === 0 ? (
                    <Crown className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                  )}
                  <span className="font-semibold text-sm">
                    {member.nickname === nickname ? 'You' : member.nickname}
                  </span>
                </div>
                <span className="font-bold text-sm font-display">{member.points} pts</span>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-3">
            {upcomingMatches.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">No upcoming matches</p>
            ) : (
              upcomingMatches.map((match, i) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <MatchCard
                    match={match}
                    onPredict={(m) => {
                      if (!nickname) return;
                      setSelectedMatch(m);
                    }}
                  />
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedMatch && (
        <PredictionModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}

      {!nickname && <NicknamePrompt onSet={(n) => setNickname2(n)} />}
    </div>
  );
}
