import { useState, useEffect } from 'react';
import { Match } from '@/lib/types';
import { getMatches } from '@/lib/matchData';
import { getNickname } from '@/lib/storage';
import MatchCard from '@/components/MatchCard';
import PredictionModal from '@/components/PredictionModal';
import NicknamePrompt from '@/components/NicknamePrompt';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Tab = 'all' | 'upcoming' | 'groups';

export default function LiveMatches() {
  const [matches, setMatches] = useState<Match[]>(getMatches());
  const [tab, setTab] = useState<Tab>('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [nickname, setNickname2] = useState(getNickname());
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setMatches(getMatches());
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const filteredMatches = matches.filter((m) => {
    if (tab === 'upcoming') return m.status === 'NS';
    return true;
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'groups', label: 'My Groups' },
  ];

  if (tab === 'groups') {
    navigate('/groups');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-header text-header-foreground px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-extrabold tracking-tight">GameOn</span>
        <span className="text-sm font-semibold">Live Matches</span>
        <Bell className="h-5 w-5 opacity-70" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Matches */}
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {filteredMatches.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No matches found</p>
        ) : (
          filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onPredict={(m) => {
                if (!nickname) return;
                setSelectedMatch(m);
              }}
            />
          ))
        )}
      </div>

      {/* Prediction Modal */}
      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {/* Nickname prompt */}
      {!nickname && (
        <NicknamePrompt onSet={(n) => setNickname2(n)} />
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 max-w-lg mx-auto">
        <button className="flex flex-col items-center text-primary text-xs font-medium py-1 px-3">
          <span className="text-lg">⚽</span>
          Matches
        </button>
        <button
          onClick={() => navigate('/groups')}
          className="flex flex-col items-center text-muted-foreground text-xs font-medium py-1 px-3"
        >
          <span className="text-lg">👥</span>
          Groups
        </button>
      </div>
    </div>
  );
}
