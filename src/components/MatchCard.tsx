import { Match } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface MatchCardProps {
  match: Match;
  onPredict: (match: Match) => void;
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'LIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-live live-dot pl-4">
        {match.minute}' LIVE
      </span>
    );
  }
  if (match.status === 'HT') {
    return (
      <span className="inline-block rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
        HT
      </span>
    );
  }
  if (match.status === 'FT') {
    return (
      <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
        FT
      </span>
    );
  }
  const dt = new Date(match.startTime);
  const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-muted-foreground font-medium">{dateStr}</span>
      <span className="text-xs text-foreground font-semibold">{timeStr}</span>
    </div>
  );
}

function TeamLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-7 w-7 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-lg font-bold text-muted-foreground">${alt.charAt(0)}</span>`;
          }}
        />
      ) : (
        <span className="text-lg font-bold text-muted-foreground">{alt.charAt(0)}</span>
      )}
    </div>
  );
}

export default function MatchCard({ match, onPredict }: MatchCardProps) {
  const showScore = match.status !== 'NS';
  const isLive = match.status === 'LIVE';

  return (
    <div
      className={`rounded-xl border bg-card p-4 transition-all hover:bg-card/80 ${
        isLive ? 'border-live/30 glow-live' : 'border-border/50'
      }`}
    >
      {/* Status */}
      <div className="flex items-center justify-between mb-3">
        <StatusBadge match={match} />
        <Button
          size="sm"
          variant={match.status === 'NS' ? 'default' : 'outline'}
          className="rounded-full text-xs font-semibold h-7 px-3"
          onClick={() => onPredict(match)}
        >
          {match.status === 'NS' ? 'PREDICT' : 'EDIT'}
        </Button>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <TeamLogo src={match.homeLogo} alt={match.homeTeam} />
          <span className="text-sm font-semibold text-card-foreground truncate">{match.homeTeam}</span>
        </div>

        {showScore ? (
          <motion.div
            key={`${match.homeScore}-${match.awayScore}`}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 mx-3"
          >
            <span className="text-2xl font-bold text-foreground font-display tabular-nums">
              {match.homeScore}
            </span>
            <span className="text-muted-foreground text-lg">–</span>
            <span className="text-2xl font-bold text-foreground font-display tabular-nums">
              {match.awayScore}
            </span>
          </motion.div>
        ) : (
          <span className="text-xs text-muted-foreground font-medium mx-3">VS</span>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold text-card-foreground truncate text-right">{match.awayTeam}</span>
          <TeamLogo src={match.awayLogo} alt={match.awayTeam} />
        </div>
      </div>
    </div>
  );
}
