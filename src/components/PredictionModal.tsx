import { useState } from 'react';
import { Match } from '@/lib/types';
import { getNickname, setNickname, savePrediction } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

interface PredictionModalProps {
  match: Match;
  onClose: () => void;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-surface-dark text-surface-dark-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/20">
          <button onClick={onClose} className="text-surface-dark-foreground/70 hover:text-surface-dark-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold">Make Your Prediction</h2>
        </div>

        {/* Match Info */}
        <div className="mx-4 mt-4 flex items-center justify-center gap-3 rounded-lg bg-black/20 p-3">
          <img src={match.homeLogo} alt="" className="h-7 w-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="font-semibold text-sm">{match.homeTeam}</span>
          {match.status !== 'NS' && (
            <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
              {match.homeScore} – {match.awayScore}
            </span>
          )}
          <span className="font-semibold text-sm">{match.awayTeam}</span>
          <img src={match.awayLogo} alt="" className="h-7 w-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>

        {/* Nickname */}
        {!getNickname() && (
          <div className="mx-4 mt-4">
            <label className="text-xs text-surface-dark-foreground/60 mb-1 block">Nickname</label>
            <Input
              value={nickname}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Enter your nickname"
              className="bg-black/20 border-border/30 text-surface-dark-foreground"
            />
          </div>
        )}

        {/* Score Input */}
        <div className="p-4">
          <p className="text-center text-sm text-surface-dark-foreground/60 mb-3 italic">Your Prediction</p>
          <div className="flex items-center justify-center gap-4">
            <Input
              type="number"
              min={0}
              max={20}
              value={homeScore}
              onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 text-center text-2xl font-bold bg-card text-card-foreground border-2"
            />
            <span className="text-2xl font-bold">–</span>
            <Input
              type="number"
              min={0}
              max={20}
              value={awayScore}
              onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 text-center text-2xl font-bold bg-card text-card-foreground border-2"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="p-4 pt-0">
          <Button onClick={handleSubmit} className="w-full text-base font-bold py-6">
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
