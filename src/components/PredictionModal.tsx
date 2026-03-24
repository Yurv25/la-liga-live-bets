import { useState } from 'react';
import { Match } from '@/lib/types';
import { getNickname, setNickname, savePrediction } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface PredictionModalProps {
  match: Match;
  onClose: () => void;
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="text-3xl font-bold w-10 text-center font-display tabular-nums">{value}</span>
      <button
        onClick={() => onChange(Math.min(20, value + 1))}
        className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function PredictionModal({ match, onClose }: PredictionModalProps) {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [nickname, setNick] = useState(getNickname() || '');

  const handleSubmit = () => {
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
    toast.success('Prediction saved!');
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
          <h2 className="text-lg font-bold font-display">Make Your Prediction</h2>
        </div>

        {/* Match Info */}
        <div className="mx-4 mt-4 flex items-center justify-between rounded-xl bg-secondary/50 p-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {match.homeLogo && (
              <img src={match.homeLogo} alt="" className="h-6 w-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <span className="font-semibold text-sm truncate">{match.homeTeam}</span>
          </div>
          {match.status !== 'NS' && (
            <span className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
              {match.homeScore} – {match.awayScore}
            </span>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="font-semibold text-sm truncate text-right">{match.awayTeam}</span>
            {match.awayLogo && (
              <img src={match.awayLogo} alt="" className="h-6 w-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </div>
        </div>

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
        <div className="p-5">
          <p className="text-center text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">
            Your Prediction
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">{match.homeTeam.split(' ')[0]}</span>
              <ScoreInput value={homeScore} onChange={setHomeScore} />
            </div>
            <span className="text-2xl font-bold text-muted-foreground mt-5">–</span>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">{match.awayTeam.split(' ')[0]}</span>
              <ScoreInput value={awayScore} onChange={setAwayScore} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="p-4 pt-0">
          <Button onClick={handleSubmit} className="w-full text-base font-bold py-6 rounded-xl">
            Submit Prediction
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
