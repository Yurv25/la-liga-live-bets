import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGroupById, joinGroup, getNickname, getPredictions, calculatePoints } from '@/lib/storage';
import { getMatches } from '@/lib/matchData';
import { Group } from '@/lib/types';
import { ArrowLeft, Check, X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NicknamePrompt from '@/components/NicknamePrompt';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-header border-b border-border/50 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-header-foreground/70 hover:text-header-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-bold font-display text-header-foreground">{group.name}</span>
        </div>
        <Button variant="outline" size="sm" className="border-border text-xs rounded-full h-7">
          Leave
        </Button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Leaderboard */}
        <div>
          <h3 className="font-bold text-sm mb-3 font-display text-foreground">Leaderboard</h3>
          <div className="space-y-2">
            {leaderboard.map((member, i) => (
              <motion.div
                key={member.nickname}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  i === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-card border border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {i === 0 ? (
                    <Crown className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                  )}
                  <span className="font-semibold text-sm">
                    {member.nickname === nickname ? 'You' : member.nickname}
                  </span>
                </div>
                <span className="font-bold text-sm font-display">{member.points} pts</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Your Predictions */}
        <div>
          <h3 className="font-bold text-sm mb-3 font-display text-foreground">Your Predictions</h3>
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
                    className="flex items-center justify-between rounded-xl bg-card border border-border/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      {match.homeLogo && (
                        <img src={match.homeLogo} alt="" className="h-5 w-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <span className="text-sm font-semibold">{match.homeTeam.split(' ')[0]}</span>
                      <span className="font-bold text-sm font-display">
                        {pred.homeScore} – {pred.awayScore}
                      </span>
                      <span className="text-sm font-semibold">{match.awayTeam.split(' ')[0]}</span>
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
