import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculatePoints } from '@/lib/storage';
import { Match, Prediction } from '@/lib/types';

interface MatchPredictionsModalProps {
  match: Match;
  predictions: Prediction[];
  onClose: () => void;
}

export default function MatchPredictionsModal({ match, predictions, onClose }: MatchPredictionsModalProps) {
  const isStarted = match.status !== 'NS';
  const hasPredictions = predictions.length > 0;
  const statusLabel = match.status === 'FT' ? 'Finished' : match.status === 'LIVE' ? 'Live' : 'Upcoming';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-card border border-border/50 shadow-2xl"
      >
        <div className="flex items-center gap-3 p-4 border-b border-border/30">
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-display">
              {match.homeTeam} vs {match.awayTeam}
            </h2>
            <p className="text-xs text-muted-foreground">
              {statusLabel} • {predictions.length} {predictions.length === 1 ? 'prediction' : 'predictions'}
            </p>
          </div>
        </div>

        <div className="px-4 py-4 border-b border-border/30">
          {isStarted ? (
            <p className="text-sm text-muted-foreground">
              Predictions are visible because the match is {match.status === 'FT' ? 'finished' : 'live'}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Predictions are hidden until kickoff. Only users who already predicted are listed.
            </p>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-4 space-y-4">
          {!hasPredictions ? (
            <div className="rounded-2xl border border-border/70 bg-muted p-6 text-center text-sm text-muted-foreground">
              No predictions submitted for this match yet.
            </div>
          ) : (
            <div className="space-y-3">
              {predictions.map((prediction) => {
                const showScores = isStarted;
                const predictionText = showScores
                  ? `${prediction.homeScore} – ${prediction.awayScore}`
                  : '? – ?';
                const points = match.status === 'FT'
                  ? calculatePoints(prediction, match.homeScore, match.awayScore, match.status)
                  : 0;
                const badge = match.status === 'FT'
                  ? points === 3
                    ? 'Exact'
                    : points === 1
                      ? 'Winner'
                      : 'Miss'
                  : null;
                const badgeClass = points === 3
                  ? 'text-primary'
                  : points === 1
                    ? 'text-warning'
                    : 'text-destructive';

                return (
                  <div
                    key={prediction.userId}
                    className="rounded-2xl border border-border/70 bg-card p-4 sm:p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{prediction.displayName}</p>
                        <p className="text-xs text-muted-foreground">{predictionText}</p>
                      </div>
                      {badge ? (
                        <span className={`text-xs font-semibold ${badgeClass}`}>{badge}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
