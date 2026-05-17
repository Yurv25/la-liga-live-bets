import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGroupByCode, joinGroupByCode, fetchGroupPredictions, calculatePoints, leaveGroup } from '@/lib/storage';
import { useFilteredMatches } from '@/hooks/useMatches';
import { COMPETITIONS } from '@/lib/competitions';
import { useAuth } from '@/lib/auth';
import { Match, Prediction } from '@/lib/types';
import { ArrowLeft, Crown, CalendarDays, Trophy, Share2, MoreVertical, LogOut } from 'lucide-react';
import MatchCard from '@/components/MatchCard';
import PredictionModal from '@/components/PredictionModal';
import UserMenu from '@/components/UserMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

type GroupTab = 'leaderboard' | 'matches';

export default function GroupPage() {
  const { id: code } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, displayName } = useAuth();
  const [activeTab, setActiveTab] = useState<GroupTab>('leaderboard');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    if (!group) return;
    setLeaving(true);
    try {
      await leaveGroup(group.id);
      toast.success('You left the group');
      qc.invalidateQueries({ queryKey: ['groups'] });
      navigate('/groups');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not leave group');
      setLeaving(false);
    }
  };

  const { allMatches: matches } = useFilteredMatches('all');

  // Auto-join then load
  const { data: group } = useQuery({
    queryKey: ['group', code],
    queryFn: async () => {
      if (!code) return null;
      const g = await joinGroupByCode(code);
      return g ?? (await fetchGroupByCode(code));
    },
    enabled: !!code && !!user,
  });

  const competitionMatches = useMemo(() => {
    if (!group) return matches;
    if (group.competitionId === 'laliga') return matches.filter(m => m.leagueId === 3);
    if (group.competitionId === 'worldcup') return matches.filter(m => m.leagueId === 27);
    return matches;
  }, [matches, group]);

  const { data: groupPredictions = [] } = useQuery({
    queryKey: ['predictions', group?.id],
    queryFn: () => (group ? fetchGroupPredictions(group.id) : Promise.resolve([] as Prediction[])),
    enabled: !!group,
  });

  const predictionsMap = useMemo(() => {
    const map = new Map<string, Prediction>();
    if (!user) return map;
    groupPredictions.filter((p) => p.userId === user.id).forEach((p) => map.set(p.matchId, p));
    return map;
  }, [groupPredictions, user]);

  const competition = group ? COMPETITIONS.find((c) => c.id === group.competitionId) : undefined;

  const roundGroups = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of competitionMatches) {
      if (typeof m.round !== 'number') continue;
      if (!map.has(m.round)) map.set(m.round, []);
      map.get(m.round)!.push(m);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, list]) => ({
        round,
        matches: list.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ),
      }));
  }, [competitionMatches]);

  const currentRound = useMemo(() => {
    if (roundGroups.length === 0) return null;
    const now = Date.now();
    let bestRound = roundGroups[0].round;
    let bestDiff = Infinity;
    for (const g of roundGroups) {
      for (const m of g.matches) {
        const diff = Math.abs(new Date(m.startTime).getTime() - now);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestRound = g.round;
        }
      }
    }
    return bestRound;
  }, [roundGroups]);

  const roundRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const didAutoScrollRef = useRef(false);

  useEffect(() => {
    if (activeTab !== 'matches') {
      didAutoScrollRef.current = false;
      return;
    }
    if (didAutoScrollRef.current) return;
    if (currentRound == null) return;
    const el = roundRefs.current[currentRound];
    if (!el) return;
    requestAnimationFrame(() => {
      const container = el.closest('.overflow-y-auto');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        container.scrollTop = container.scrollTop + elRect.top - containerRect.top;
      } else {
        el.scrollIntoView({ block: 'start', behavior: 'auto' });
      }
      didAutoScrollRef.current = true;
    });
  }, [activeTab, currentRound, roundGroups.length]);

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const leaderboard = group.members
    .map((member) => {
      const memberPreds = groupPredictions.filter((p) => p.userId === member.userId);
      let points = 0;
      memberPreds.forEach((pred) => {
        const match = competitionMatches.find((m) => m.id === pred.matchId);
        if (match) {
          points += calculatePoints(pred, match.homeScore, match.awayScore, match.status);
        }
      });
      return { ...member, points };
    })
    .sort((a, b) => b.points - a.points);

  const tabItems: { key: GroupTab; label: string; icon: React.ReactNode }[] = [
    { key: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="h-4 w-4" /> },
    { key: 'matches', label: 'Matches', icon: <CalendarDays className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-header border-b border-border/50 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-header-foreground/70 hover:text-header-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="text-lg font-bold font-display text-header-foreground block">{group.name}</span>
            {competition && (
              <span className="text-xs text-muted-foreground">
                <img src={competition.logo} alt={competition.name} className="h-4 w-4 object-contain inline mr-1" />
                  {competition.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const link = `${window.location.origin}/group/${group.joinCode}`;
              navigator.clipboard.writeText(link);
              toast.success('Invite link copied!');
            }}
            className="h-9 w-9 rounded-full bg-secondary/60 flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
            aria-label="Share invite link"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-9 rounded-full bg-secondary/60 flex items-center justify-center text-foreground hover:bg-secondary transition-colors">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setConfirmLeave(true)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <UserMenu />
        </div>
      </div>

      <div className="flex gap-2 px-4 py-3 bg-header/50 border-b border-border/30">
        {tabItems.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {activeTab === 'leaderboard' && (
          <div className="space-y-2">
            {leaderboard.map((member, i) => (
              <motion.div
                key={member.userId}
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
                    {member.userId === user?.id ? 'You' : member.displayName}
                  </span>
                </div>
                <span className="font-bold text-sm font-display">{member.points} pts</span>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6 overflow-y-auto" style={{ height: 'calc(100vh - 140px)' }}>
            {roundGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">No matches yet</p>
            ) : (
              roundGroups.map(({ round, matches: roundMatches }) => (
                <div
                  key={round}
                  ref={(el) => { roundRefs.current[round] = el; }}
                  data-round={round}
                  className="space-y-3 scroll-mt-8"
                >
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                    Round {round}
                    {round === currentRound && (
                      <span className="ml-2 text-[10px] font-bold text-primary">CURRENT</span>
                    )}
                  </h3>
                  {roundMatches.map((match, i) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <MatchCard
                        match={match}
                        prediction={predictionsMap.get(match.id)}
                        onPredict={(m) => setSelectedMatch(m)}
                      />
                    </motion.div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          onClose={() => {
            setSelectedMatch(null);
            qc.invalidateQueries({ queryKey: ['predictions', group.id] });
          }}
        />
      )}

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this group?</AlertDialogTitle>
            <AlertDialogDescription>
              {group.createdBy === user?.id
                ? 'You created this group. Ownership will transfer to the longest-standing member, or the group will be deleted if you are the last member.'
                : 'You can rejoin later with the invite link.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} disabled={leaving}>
              {leaving ? 'Leaving...' : 'Leave group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
