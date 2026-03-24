import { Match } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface MatchCardProps {
  match: Match;
  onPredict: (match: Match) => void;
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'LIVE') {
    return (
      <span className="text-xs font-semibold text-live">
        {match.minute}' LIVE
      </span>
    );
  }
  if (match.status === 'HT') {
    return (
      <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        HT
      </span>
    );
  }
  if (match.status === 'FT') {
    return (
      <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        FT
      </span>
    );
  }
  // NS
  const hours = Math.round(
    (new Date(match.startTime).getTime() - Date.now()) / (1000 * 60 * 60)
  );
  return (
    <span className="text-xs text-muted-foreground">
      Starts in {hours > 0 ? `${hours}h` : 'soon'}
    </span>
  );
}

export default function MatchCard({ match, onPredict }: MatchCardProps) {
  const showScore = match.status !== 'NS';

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src={match.homeLogo}
            alt={match.homeTeam}
            className="h-8 w-8 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <span className="truncate">{match.homeTeam}</span>
            {showScore ? (
              <span className="font-bold text-base">
                {match.homeScore} – {match.awayScore}
              </span>
            ) : (
              <span className="text-muted-foreground font-normal">vs</span>
            )}
            <span className="truncate">{match.awayTeam}</span>
          </div>
          <img
            src={match.awayLogo}
            alt={match.awayTeam}
            className="h-8 w-8 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <Button
          size="sm"
          className="ml-3 shrink-0"
          onClick={() => onPredict(match)}
        >
          PREDICT
        </Button>
      </div>
      <div className="mt-2 text-center">
        <StatusBadge match={match} />
      </div>
    </div>
  );
}
