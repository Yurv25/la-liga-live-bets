import { useState, useMemo } from 'react';
import { Match } from '@/lib/types';
import { getNickname, setNickname, savePrediction, getPredictions } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Minus, Plus, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { isPredictionLocked, LOCK_BEFORE_KICKOFF_MS } from '@/lib/predictionRules';

interface PredictionModalProps {
  match: Match;
  onClose: () => void;
}

const QUICK_PICKS: Array<[number, number]> = [
  [1, 0],
  [2, 1],
  [1, 1],
  [2, 0],
];

function ScoreInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={disabled}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="text-3xl font-bold w-10 text-center font-display tabular-nums">{value}</span>
      <button
        disabled={disabled}
        onClick={() => onChange(Math.min(20, value + 1))}
        className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function PredictionModal({ match, onClose }: PredictionModalProps) {
  const currentNick = getNickname() || '';

  // Pre-fill from existing prediction (if any) for the current user
  const existing = useMemo(() => {
    if (!currentNick) return null;
    return getPredictions().find(p => p.matchId === match.id && p.nickname === currentNick) || null;
  }, [match.id, currentNick]);

  const [homeScore, setHomeScore] = useState(existing?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(existing?.awayScore ?? 0);
  const [nickname, setNick] = useState(currentNick);

  const locked = isPredictionLocked(match);

  const handleQuickPick = (h: number, a: number) => {
    if (locked) return;
    setHomeScore(h);
    setAwayScore(a);
  };

  const handleSubmit = () => {
    if (locked) {
      toast.error('Prediction locked');
      return;
    }
    if (!nickname.trim()) {
      toast.error('Please enter a nickname');
      return;
    }
    setNickname(nickname.trim());
    savePrediction({
      matchId: match.id,
      homeScore,
      awayScore,
      nickname: nickname.trim(),
      timestamp: Date.now(),
    });
    toast.success(existing ? 'Prediction updated!' : 'Prediction saved!', {
      description: `${match.homeTeam} ${homeScore} – ${awayScore} ${match.awayTeam}`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border border-border/50 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/30">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold font-display">
            {existing ? 'Edit Prediction' : 'Make Your Prediction'}
          </h2>
        </div>

        {/* Match Info */}
        <div className="mx-4 mt-4 flex items-center justify-between rounded-xl bg-secondary/50 p-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {match.homeLogo && (
              <img src={match.homeLogo} alt="" className="h-6 w-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <span className="font-semibold text-sm truncate">{match.homeTeam}</span>
          </div>
          {match.status !== 'NS' ? (
            <span className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
              {match.homeScore} – {match.awayScore}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground font-medium px-2 whitespace-nowrap">
              {new Date(match.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="font-semibold text-sm truncate text-right">{match.awayTeam}</span>
            {match.awayLogo && (
              <img src={match.awayLogo} alt="" className="h-6 w-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </div>
        </div>

        {/* Locked banner */}
        {locked && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
            <Lock className="h-4 w-4 text-destructive" />
            <span className="text-xs font-semibold text-destructive">
              Prediction locked ({Math.round(LOCK_BEFORE_KICKOFF_MS / 60000)} min before kickoff)
            </span>
          </div>
        )}

        {/* Nickname */}
        {!getNickname() && (
          <div className="mx-4 mt-4">
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Nickname</label>
            <Input
              value={nickname}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Enter your nickname"
            />
          </div>
        )}

        {/* Score Input */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-center text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">
            Your Prediction
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[80px]">{match.homeTeam.split(' ')[0]}</span>
              <ScoreInput value={homeScore} onChange={setHomeScore} disabled={locked} />
            </div>
            <span className="text-2xl font-bold text-muted-foreground mt-5">–</span>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[80px]">{match.awayTeam.split(' ')[0]}</span>
              <ScoreInput value={awayScore} onChange={setAwayScore} disabled={locked} />
            </div>
          </div>
        </div>

        {/* Quick picks */}
        {!locked && (
          <div className="px-5 pb-2">
            <p className="text-center text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">
              Quick Pick
            </p>
            <div className="flex gap-2 justify-center">
              {QUICK_PICKS.map(([h, a]) => {
                const isActive = homeScore === h && awayScore === a;
                return (
                  <button
                    key={`${h}-${a}`}
                    onClick={() => handleQuickPick(h, a)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold tabular-nums transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {h}-{a}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="p-4">
          <Button
            onClick={handleSubmit}
            disabled={locked}
            className="w-full text-base font-bold py-6 rounded-xl"
          >
            {locked ? 'Locked' : existing ? 'Update Prediction' : 'Submit Prediction'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
