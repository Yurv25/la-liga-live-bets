import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGroupById, joinGroup, getNickname, getPredictions, calculatePoints } from '@/lib/storage';
import { getMatches } from '@/lib/matchData';
import { Group, Match } from '@/lib/types';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NicknamePrompt from '@/components/NicknamePrompt';

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [nickname, setNickname2] = useState(getNickname());
  const matches = getMatches();

  useEffect(() => {
    if (!id) return;
    const g = getGroupById(id);
    if (g && nickname) {
      joinGroup(id, nickname);
      setGroup(getGroupById(id));
    } else if (g) {
      setGroup(g);
    }
  }, [id, nickname]);

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
  }

  // Calculate points for each member
  const leaderboard = group.members
    .map((member) => {
      const memberPredictions = getPredictions().filter((p) => p.nickname === member.nickname);
      let points = 0;
      memberPredictions.forEach((pred) => {
        const match = matches.find((m) => m.id === pred.matchId);
        if (match) {
          points += calculatePoints(pred, match.homeScore, match.awayScore, match.status);
        }
      });
      return { ...member, points, predictions: memberPredictions };
    })
    .sort((a, b) => b.points - a.points);

  const userPredictions = getPredictions().filter((p) => p.nickname === nickname);

  return (
    <div className="min-h-screen bg-surface-dark text-surface-dark-foreground">
      {/* Header */}
      <div className="bg-header text-header-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-bold">{group.name}</span>
        </div>
        <Button variant="outline" size="sm" className="border-header-foreground/30 text-header-foreground text-xs">
          Leave
        </Button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Leaderboard */}
        <div>
          <h3 className="font-bold text-sm mb-3">Leaderboard</h3>
          <div className="space-y-2">
            {leaderboard.map((member, i) => (
              <div
                key={member.nickname}
                className="flex items-center justify-between rounded-lg bg-black/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground">{i + 1}.</span>
                  <span className="font-semibold text-sm">
                    {member.nickname === nickname ? 'You' : member.nickname}
                  </span>
                </div>
                <span className="font-bold text-sm">{member.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your Predictions */}
        <div>
          <h3 className="font-bold text-sm mb-3">Your Predictions</h3>
          <div className="space-y-2">
            {userPredictions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No predictions yet</p>
            ) : (
              userPredictions.map((pred) => {
                const match = matches.find((m) => m.id === pred.matchId);
                if (!match) return null;
                const pts = calculatePoints(pred, match.homeScore, match.awayScore, match.status);
                const isCorrect = pts > 0;
                const isFinished = match.status === 'FT';

                return (
                  <div
                    key={pred.matchId}
                    className="flex items-center justify-between rounded-lg bg-black/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <img src={match.homeLogo} alt="" className="h-5 w-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <span className="text-sm font-semibold">
                        {match.homeTeam.split(' ')[0]}
                      </span>
                      <span className="font-bold text-sm">
                        {pred.homeScore} – {pred.awayScore}
                      </span>
                      <span className="text-sm font-semibold">
                        {match.awayTeam.split(' ')[0]}
                      </span>
                    </div>
                    {isFinished && (
                      isCorrect ? (
                        <Check className="h-5 w-5 text-success" />
                      ) : (
                        <X className="h-5 w-5 text-live" />
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {!nickname && <NicknamePrompt onSet={(n) => setNickname2(n)} />}
    </div>
  );
}
