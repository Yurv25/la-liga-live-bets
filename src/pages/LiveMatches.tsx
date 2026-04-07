import { useState, useEffect, useCallback } from 'react';
import { Match } from '@/lib/types';
import { getMatches } from '@/lib/matchData';
import { fetchAllMatches } from '@/lib/api';
import { getNickname } from '@/lib/storage';
import MatchCard from '@/components/MatchCard';
import PredictionModal from '@/components/PredictionModal';
import NicknamePrompt from '@/components/NicknamePrompt';
import { Trophy, Zap, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'all' | 'live' | 'upcoming';

export default function LiveMatches() {
  const [matches, setMatches] = useState<Match[]>(getMatches());
  const [tab, setTab] = useState<Tab>('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [nickname, setNickname2] = useState(getNickname());
  const [loading, setLoading] = useState(false);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllMatches();
      if (data.length > 0) setMatches(data);
    } catch {
      // fallback to mock
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 20000);
    return () => clearInterval(interval);
  }, [loadMatches]);

  const filteredMatches = matches.filter((m) => {
    if (tab === 'live') return m.status === 'LIVE' || m.status === 'HT';
    if (tab === 'upcoming') return m.status === 'NS';
    return true;
  });

  const liveCount = matches.filter((m) => m.status === 'LIVE' || m.status === 'HT').length;

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'all', label: 'All', icon: <Trophy className="h-4 w-4" /> },
    { key: 'live', label: 'Live', icon: <Zap className="h-4 w-4" />, count: liveCount },
    { key: 'upcoming', label: 'Upcoming', icon: <CalendarDays className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-header border-b border-border/50 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">⚽</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-header-foreground font-display">
            Praedictio
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">La Liga</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 bg-header/50 border-b border-border/30">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                tab === t.key ? 'bg-primary-foreground/20' : 'bg-live text-destructive-foreground'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* Matches */}
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {filteredMatches.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground py-12 text-sm"
            >
              {tab === 'live' ? 'No live matches right now' : 'No matches found'}
            </motion.p>
          ) : (
            filteredMatches.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
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
        </AnimatePresence>
      </div>

      {/* Prediction Modal */}
      {selectedMatch && (
        <PredictionModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}

      {/* Nickname prompt */}
      {!nickname && <NicknamePrompt onSet={(n) => setNickname2(n)} />}
    </div>
  );
}
