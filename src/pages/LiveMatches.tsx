import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Match } from '@/lib/types';
import { fetchMyPredictions } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import { useFilteredMatches } from '@/hooks/useMatches';
import { COMPETITIONS } from '@/lib/competitions';
import MatchCard from '@/components/MatchCard';
import PredictionModal from '@/components/PredictionModal';
import UserMenu from '@/components/UserMenu';
import DateStrip from '@/components/DateStrip';
import { Calendar, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'schedule' | 'live';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function LiveMatches() {
  const [tab, setTab] = useState<Tab>('schedule');
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const { user, displayName } = useAuth();

  const { allMatches, loading, liveCount } = useFilteredMatches('all');

  const { data: myPredictions = [], refetch } = useQuery({
    queryKey: ['my-predictions', user?.id],
    queryFn: fetchMyPredictions,
    enabled: !!user,
  });

  const predictionsMap = useMemo(() => {
    const map = new Map<string, typeof myPredictions[0]>();
    myPredictions.forEach((p) => map.set(p.matchId, p));
    return map;
  }, [myPredictions]);

  const liveMatches = useMemo(
    () => allMatches.filter((m) => m.status === 'LIVE' || m.status === 'HT'),
    [allMatches]
  );

  const dayMatches = useMemo(() => {
    const target = selectedDate.toDateString();
    return allMatches.filter((m) => new Date(m.startTime).toDateString() === target);
  }, [allMatches, selectedDate]);

  const grouped = useMemo(() => {
    return COMPETITIONS
      .map((c) => ({
        competition: c,
        matches: dayMatches
          .filter((m) => m.leagueId === c.leagueId)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
      }))
      .filter((g) => g.matches.length > 0);
  }, [dayMatches]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'schedule', label: 'Schedule', icon: <Calendar className="h-4 w-4" /> },
    { key: 'live', label: 'Live', icon: <Zap className="h-4 w-4" />, count: liveCount },
  ];

  const renderMatchCard = (match: Match, i: number) => (
    <motion.div
      key={match.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.3 }}
    >
      <MatchCard
        match={match}
        prediction={predictionsMap.get(match.id)}
        onPredict={(m) => setSelectedMatch(m)}
      />
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-header border-b border-border/50 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">⚽</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-header-foreground font-display">
            Praedictio
          </span>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          {displayName && (
            <span className="text-sm font-medium text-header-foreground truncate max-w-[140px]">
              {displayName}
            </span>
          )}
          <UserMenu />
        </div>
      </div>

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

      {tab === 'schedule' && (
        <DateStrip selected={selectedDate} onSelect={setSelectedDate} />
      )}

      {loading && (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {tab === 'live' ? (
            liveMatches.length === 0 ? (
              <motion.p
                key="no-live"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground py-12 text-sm"
              >
                No live matches right now
              </motion.p>
            ) : (
              <motion.div key="live-list" className="space-y-3">
                {liveMatches.map((m, i) => renderMatchCard(m, i))}
              </motion.div>
            )
          ) : grouped.length === 0 ? (
            <motion.p
              key="no-day"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground py-12 text-sm"
            >
              No matches today
            </motion.p>
          ) : (
            <motion.div key="schedule-list" className="space-y-6">
              {grouped.map(({ competition, matches }) => (
                <div key={competition.id} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <img
                      src={competition.logo}
                      alt={competition.name}
                      className="h-6 w-6 object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {competition.name}
                    </span>
                    <div className="flex-1 h-px bg-border/40 ml-2" />
                  </div>
                  <div className="space-y-3">
                    {matches.map((m, i) => renderMatchCard(m, i))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          onClose={() => {
            setSelectedMatch(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
