import { useState, useEffect, useMemo, useRef } from 'react';
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
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [predictionVersion, setPredictionVersion] = useState(0);

  // Centralized match store (handles polling + sim ticks); single source of truth
  const { allMatches: matches } = useFilteredMatches('all');

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

  // Map of current user's predictions, keyed by matchId, for fast lookup on cards
  const predictionsMap = useMemo(() => {
    void predictionVersion;
    const map = new Map<string, Prediction>();
    if (!nickname) return map;
    getPredictions()
      .filter(p => p.nickname === nickname)
      .forEach(p => map.set(p.matchId, p));
    return map;
  }, [nickname, predictionVersion]);

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
  }

  const competition = COMPETITIONS.find((c) => c.id === group.competitionId);

  // Group matches by round_number for the Matches tab
  const roundGroups = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of matches) {
      if (typeof m.round !== 'number') continue;
      if (!map.has(m.round)) map.set(m.round, []);
      map.get(m.round)!.push(m);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, list]) => ({
        round,
        matches: list.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ),
      }));
  }, [matches]);

  const currentRound = useMemo(() => {
    if (roundGroups.length === 0) return null;
    const now = Date.now();
    let bestRound = roundGroups[0].round;
    let bestDiff = Infinity;
    for (const g of roundGroups) {
      for (const m of g.matches) {
        const diff = Math.abs(new Date(m.startTime).getTime() - now);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestRound = g.round;
        }
      }
    }
    return bestRound;
  }, [roundGroups]);

  const roundRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const didAutoScrollRef = useRef(false);

  useEffect(() => {
    if (activeTab !== 'matches') {
      didAutoScrollRef.current = false;
      return;
    }
    if (didAutoScrollRef.current) return;
    if (currentRound == null) return;
    const el = roundRefs.current[currentRound];
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'start', behavior: 'auto' });
      didAutoScrollRef.current = true;
    });
  }, [activeTab, currentRound, roundGroups.length]);

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
          <div className="space-y-6">
            {roundGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">No matches yet</p>
            ) : (
              roundGroups.map(({ round, matches: roundMatches }) => (
                <div
                  key={round}
                  ref={(el) => { roundRefs.current[round] = el; }}
                  data-round={round}
                  className="space-y-3 scroll-mt-24"
                >
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                    Round {round}
                    {round === currentRound && (
                      <span className="ml-2 text-[10px] font-bold text-primary">CURRENT</span>
                    )}
                  </h3>
                  {roundMatches.map((match, i) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <MatchCard
                        match={match}
                        prediction={predictionsMap.get(match.id)}
                        onPredict={(m) => {
                          if (!nickname) return;
                          setSelectedMatch(m);
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              ))
            )}
          </div>
      </div>

      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          onClose={() => {
            setSelectedMatch(null);
            setPredictionVersion((v) => v + 1);
          }}
        />
      )}

      {!nickname && <NicknamePrompt onSet={(n) => setNickname2(n)} />}
    </div>
  );
}

