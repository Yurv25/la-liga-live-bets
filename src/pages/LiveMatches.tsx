import { useState, useEffect, useCallback } from 'react';
import { Match } from '@/lib/types';
import { getMatches } from '@/lib/matchData';
import { fetchAllMatches, getApiKey } from '@/lib/api';
import { getNickname } from '@/lib/storage';
import MatchCard from '@/components/MatchCard';
import PredictionModal from '@/components/PredictionModal';
import NicknamePrompt from '@/components/NicknamePrompt';
import ApiKeyPrompt from '@/components/ApiKeyPrompt';
import { Trophy, Zap, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'all' | 'live' | 'upcoming';

export default function LiveMatches() {
  const [matches, setMatches] = useState<Match[]>(getMatches());
  const [tab, setTab] = useState<Tab>('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [nickname, setNickname2] = useState(getNickname());
  const [hasApiKey, setHasApiKey] = useState(!!getApiKey());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadMatches = useCallback(async () => {
    if (getApiKey()) {
      setLoading(true);
      try {
        const data = await fetchAllMatches();
        if (data.length > 0) setMatches(data);
      } catch {
        // fallback to mock
      }
      setLoading(false);
    } else {
      setMatches(getMatches());
    }
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
        <div className="flex items-center gap-2">
          {hasApiKey && (
            <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
              LIVE
            </span>
          )}
          <span className="text-xs text-muted-foreground font-medium">La Liga</span>
        </div>
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

      {/* API key prompt */}
      {!hasApiKey && nickname && (
        <ApiKeyPrompt onSet={() => { setHasApiKey(true); loadMatches(); }} />
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 glass flex justify-around py-3 max-w-lg mx-auto safe-area-inset-bottom">
        <button className="flex flex-col items-center text-primary text-xs font-medium gap-1">
          <Trophy className="h-5 w-5" />
          Matches
        </button>
        <button
          onClick={() => navigate('/groups')}
          className="flex flex-col items-center text-muted-foreground text-xs font-medium gap-1 hover:text-foreground transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Groups
        </button>
      </div>
    </div>
  );
}
