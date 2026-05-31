import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGroupByCode, joinGroupByCode, fetchGroupPredictions, calculatePoints, leaveGroup } from '@/lib/storage';
import { useFilteredMatches } from '@/hooks/useMatches';
import { COMPETITIONS } from '@/lib/competitions';
import { useAuth } from '@/lib/auth';
import { Match, Prediction } from '@/lib/types';
import { ArrowLeft, Crown, CalendarDays, Trophy, Share2, MoreVertical, LogOut, CircleHelp } from 'lucide-react';
import MatchCard from '@/components/MatchCard';
import MatchPredictionsModal from '@/components/MatchPredictionsModal';
import PredictionModal from '@/components/PredictionModal';
import UserMenu from '@/components/UserMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

type GroupTab = 'leaderboard' | 'matches';

export default function GroupPage() {
  const { t, i18n } = useTranslation();
  const { id: code } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, displayName } = useAuth();
  const [activeTab, setActiveTab] = useState<GroupTab>('leaderboard');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [viewMatch, setViewMatch] = useState<Match | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showScoringRules, setShowScoringRules] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    if (!group) return;
    setLeaving(true);
    try {
      await leaveGroup(group.id);
      toast.success(t('groups.leftGroup'));
      qc.invalidateQueries({ queryKey: ['groups'] });
      navigate('/groups');
    } catch (e: any) {
      toast.error(e.message ?? t('groups.couldNotLeave'));
      setLeaving(false);
    }
  };

  // Show join toast only once per mount, not on every refetch
  const joinToastShownRef = useRef(false);

  // Auto-join then load
  const { data: group } = useQuery({
    queryKey: ['group', code],
    queryFn: async () => {
      if (!code) return null;
      const result = await joinGroupByCode(code);
      if (result && !joinToastShownRef.current) {
        joinToastShownRef.current = true;
        if (result.isNewMember) {
          toast.success(t('groups.joined', { groupName: result.group.name }));
        } 
      }
      return result?.group ?? (await fetchGroupByCode(code));
    },
    enabled: !!code && !!user,
  });

  const { allMatches: matches } = useFilteredMatches('all'); //group?.competitionId ?? 'laliga'

  const competitionMatches = useMemo(() => {
    if (!group) return matches;
    const competition = COMPETITIONS.find((c) => c.id === group.competitionId);
    if (!competition) return matches;
    return matches.filter(
      (m) => m.leagueId === competition.leagueId && 
      competition.seasonIds.includes(m.seasonId ?? -1),
    );
  }, [matches, group]);

  const selectedMember = useMemo(
    () => group?.members.find((m) => m.userId === selectedMemberId) ?? null,
    [group, selectedMemberId],
  );

  const competitionMatchCount = competitionMatches.length;

  const selectedMemberCurrentMatchRef = useRef<HTMLDivElement | null>(null);

  const sortedCompetitionMatches = useMemo(() => {
    return competitionMatches.slice().sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [competitionMatches]);

  const currentMatchIndex = useMemo(() => {
    const now = Date.now();
    const liveMatch = sortedCompetitionMatches.find((m) => m.status === 'LIVE' || m.status === 'HT');
    if (liveMatch) {
      return sortedCompetitionMatches.findIndex((m) => m.id === liveMatch.id);
    }
    const nextMatchIndex = sortedCompetitionMatches.findIndex(
      (m) => new Date(m.startTime).getTime() >= now && m.status === 'NS',
    );
    if (nextMatchIndex !== -1) return nextMatchIndex;
    return sortedCompetitionMatches.length - 1;
  }, [sortedCompetitionMatches]);

  const currentMatch = useMemo(() => {
    if (currentMatchIndex < 0 || currentMatchIndex >= sortedCompetitionMatches.length) return null;
    return sortedCompetitionMatches[currentMatchIndex];
  }, [sortedCompetitionMatches, currentMatchIndex]);

  const pastMatches = useMemo(() => {
    if (!currentMatch) return [] as Match[];
    return sortedCompetitionMatches.slice(0, currentMatchIndex).slice().reverse();
  }, [sortedCompetitionMatches, currentMatch, currentMatchIndex]);

  const futureMatches = useMemo(() => {
    if (!currentMatch) return sortedCompetitionMatches;
    return sortedCompetitionMatches.slice(currentMatchIndex + 1);
  }, [sortedCompetitionMatches, currentMatch, currentMatchIndex]);

  const finishedMatchGroups = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const match of sortedCompetitionMatches) {
      if (match.status !== 'FT') continue;
      const round = typeof match.round === 'number' ? match.round : 0;
      if (!map.has(round)) map.set(round, []);
      map.get(round)!.push(match);
    }

    return Array.from(map.entries())
      .map(([round, matches]) => ({
        round,
        matches: matches.slice().sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        ),
      }))
      .sort((a, b) => b.round - a.round);
  }, [pastMatches]);

  const finishedMatchCount = finishedMatchGroups.reduce((count, group) => count + group.matches.length, 0);

  const currentMatchId = currentMatch?.id ?? null;

  useEffect(() => {
    if (!selectedMemberId || !selectedMemberCurrentMatchRef.current) return;
    requestAnimationFrame(() => {
      selectedMemberCurrentMatchRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [selectedMemberId, currentMatchId]);

  useEffect(() => {
    if (!group) {
      setSelectedMemberId(null);
    }
  }, [group]);

  const { data: groupPredictions = [] } = useQuery({
    queryKey: ['predictions', group?.id],
    queryFn: () => (group ? fetchGroupPredictions(group.id) : Promise.resolve([] as Prediction[])),
    enabled: !!group,
  });

  const selectedMemberPredictions = useMemo(() => {
    if (!selectedMemberId) return [] as Prediction[];
    return groupPredictions.filter((p) => p.userId === selectedMemberId);
  }, [groupPredictions, selectedMemberId]);

  const selectedMemberPredictionMap = useMemo(
    () => new Map(selectedMemberPredictions.map((p) => [p.matchId, p] as const)),
    [selectedMemberPredictions],
  );

  const viewMatchPredictions = useMemo(() => {
    if (!viewMatch) return [] as Prediction[];
    return groupPredictions
      .filter((p) => p.matchId === viewMatch.id)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [groupPredictions, viewMatch]);

  const memberPredictionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    groupPredictions.forEach((p) => {
      counts.set(p.userId, (counts.get(p.userId) ?? 0) + 1);
    });
    return counts;
  }, [groupPredictions]);

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
      const round = typeof m.round === 'number' ? m.round : 0;
      if (!map.has(round)) map.set(round, []);
      map.get(round)!.push(m);
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
    const allMatches = roundGroups.flatMap((g) => g.matches);
    const liveMatch = allMatches.find((m) => m.status === 'LIVE' || m.status === 'HT');
    if (liveMatch) {
      return roundGroups.find((g) => g.matches.some((m) => m.id === liveMatch.id))?.round ?? roundGroups[0].round;
    }

    const upcoming = allMatches
      .filter((m) => m.status === 'NS' && new Date(m.startTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    if (upcoming.length > 0) {
      return roundGroups.find((g) => g.matches.some((m) => m.id === upcoming[0].id))?.round ?? roundGroups[0].round;
    }

    const finished = allMatches
      .filter((m) => m.status === 'FT')
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    if (finished.length > 0) {
      return roundGroups.find((g) => g.matches.some((m) => m.id === finished[0].id))?.round ?? roundGroups[roundGroups.length - 1].round;
    }

    return roundGroups[0].round;
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
    { key: 'leaderboard', label: t('groupPage.leaderboard'), icon: <Trophy className="h-4 w-4" /> },
    { key: 'matches', label: t('groupPage.matches'), icon: <CalendarDays className="h-4 w-4" /> },
  ];

  const competitionName = competition
    ? t(`competitions.${competition.id}.name`)
    : t('groupPage.competitionFallback');

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-header border-b border-border/50">
        <div className="px-4 py-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <button onClick={() => navigate(-1)} className="text-header-foreground/70 hover:text-header-foreground mt-1">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold font-display text-header-foreground break-words line-clamp-2">
                {group.name}
              </h1>
              {competition && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 min-w-0">
                  <img src={competition.logo} alt={competitionName} className="h-4 w-4 object-contain shrink-0" />
                  <span className="truncate">{competitionName}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="h-9 w-9 rounded-full bg-secondary/60 flex items-center justify-center text-foreground hover:bg-secondary transition-colors">
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    const link = `https://la-liga-live-bets.vercel.app/group/${group.joinCode}`;
                    navigator.clipboard.writeText(link);
                    toast.success(t('groups.inviteCopied'));
                  }}
                  className="cursor-pointer"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('groups.copyInviteLink')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowScoringRules(true)}
                  className="cursor-pointer"
                >
                  <CircleHelp className="h-4 w-4 mr-2" />
                  {t('groupPage.scoringRules')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setConfirmLeave(true)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('groups.leaveGroup')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-4 py-3 bg-header/50 border-b border-border/30">
        {tabItems.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setActiveTab(tabItem.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === tabItem.key
                ? 'bg-primary text-primary-foreground shadow-lg glow-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {tabItem.icon}
            {tabItem.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {activeTab === 'leaderboard' && (
          <div className="space-y-2">
            {leaderboard.map((member, i) => {
              const memberPredictionCount = memberPredictionCounts.get(member.userId) ?? 0;
              const isCurrentUser = member.userId === user?.id;
              return (
                <motion.button
                  key={member.userId}
                  type="button"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedMemberId(member.userId)}
                  className={`w-full text-left rounded-xl px-4 py-3 transition-all ${
                    i === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-card border border-border/50'
                  } ${!isCurrentUser ? 'hover:border-primary/40 hover:bg-primary/5 cursor-pointer' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {i === 0 ? (
                        <Crown className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                      )}
                      <div>
                        <div className="font-semibold text-sm">
                          {isCurrentUser ? t('common.you') : member.displayName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('groupPage.picks', { count: memberPredictionCount, total: competitionMatchCount })}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-sm font-display">
                      {t('groupPage.pts', { points: member.points })}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-6 overflow-y-auto" style={{ height: 'calc(100vh - 140px)' }}>
            {roundGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">{t('groupPage.noMatchesYet')}</p>
            ) : (
              roundGroups.map(({ round, matches: roundMatches }) => (
                <div
                  key={round}
                  ref={(el) => { roundRefs.current[round] = el; }}
                  data-round={round}
                  className="space-y-3 scroll-mt-8"
                >
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                    {round === 0 ? t('groupPage.roundUnknown') : t('groupPage.round', { round })}
                    {round === currentRound && (
                      <span className="ml-2 text-[10px] font-bold text-primary">{t('groupPage.current')}</span>
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
                        onView={(m) => setViewMatch(m)}
                      />
                    </motion.div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Dialog open={!!selectedMemberId} onOpenChange={(open) => !open && setSelectedMemberId(null)}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>
              {selectedMember
                ? selectedMember.userId === user?.id
                  ? t('groupPage.yourPredictions')
                  : t('groupPage.memberPredictions', { name: selectedMember.displayName })
                : t('groupPage.memberPredictionsFallback')}
            </DialogTitle>
            <DialogDescription>
              {t('groupPage.finishedDescription', { competition: competitionName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-2">
            {finishedMatchCount === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t('groupPage.noFinishedMatches')}</p>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{t('groupPage.finishedMatches')}</span>
                  <span>{finishedMatchCount}</span>
                </div>
                {finishedMatchGroups.map((group) => (
                  <div key={group.round} className="space-y-3">
                    <div className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {group.round === 0 ? t('groupPage.roundUnknown') : t('groupPage.round', { round: group.round })}
                    </div>
                    <div className="space-y-3">
                      {group.matches.map((match) => {
                        const memberPrediction = selectedMemberPredictionMap.get(match.id);
                        const myPrediction = predictionsMap.get(match.id);
                        const actualResult = `${match.homeScore}–${match.awayScore}`;
                        return (
                          <div
                            key={match.id}
                            className="rounded-2xl border border-border/70 bg-card p-4 sm:p-4"
                          >
                            <div className="flex items-center gap-3">
                              <img src={match.homeLogo} alt={match.homeTeam} className="h-8 w-8 rounded-md object-contain" />
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="text-sm font-semibold truncate">
                                  {t('groupPage.matchVs', { home: match.homeTeam, away: match.awayTeam })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(match.startTime).toLocaleString(i18n.language)}
                                </p>
                              </div>
                              <img src={match.awayLogo} alt={match.awayTeam} className="h-8 w-8 rounded-md object-contain" />
                            </div>
                            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                  {t('groupPage.result')}
                                </p>
                                <p className="font-semibold text-base">{actualResult}</p>
                              </div>
                              <div className="text-right">
                                {memberPrediction ? (
                                  <p className="text-sm font-semibold">
                                    {t('groupPage.pick', {
                                      score: `${memberPrediction.homeScore}–${memberPrediction.awayScore}`,
                                    })}
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground">{t('groupPage.noPrediction')}</p>
                                )}
                                {!selectedMember?.userId || selectedMember.userId !== user?.id ? (
                                  <p className="text-xs text-muted-foreground">
                                    {t('groupPage.youPick', {
                                      score: myPrediction
                                        ? `${myPrediction.homeScore}–${myPrediction.awayScore}`
                                        : t('groupPage.noPrediction'),
                                    })}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setSelectedMemberId(null)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showScoringRules} onOpenChange={setShowScoringRules}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>{t('groupPage.howPointsCalculatedTitle')}</DialogTitle>
            <DialogDescription>{t('groupPage.scoringIntro')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <ul className="space-y-1 text-muted-foreground list-disc pl-5">
              <li>{t('groupPage.scoringRuleExact')}</li>
              <li>{t('groupPage.scoringRuleWinnerDiff')}</li>
              <li>{t('groupPage.scoringRuleOutcome')}</li>
              <li>{t('groupPage.scoringRuleWrong')}</li>
            </ul>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('groupPage.scoringExamples')}
              </p>
              <ul className="space-y-1 text-muted-foreground list-disc pl-5">
                <li>{t('groupPage.scoringExampleExact')}</li>
                <li>{t('groupPage.scoringExampleWinnerDiff')}</li>
                <li>{t('groupPage.scoringExampleOutcome')}</li>
                <li>{t('groupPage.scoringExampleWrong')}</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowScoringRules(false)}>
              {t('groupPage.scoringGotIt')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewMatch && (
        <MatchPredictionsModal
          match={viewMatch}
          predictions={viewMatchPredictions}
          onClose={() => setViewMatch(null)}
        />
      )}

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
            <AlertDialogTitle>{t('groups.leaveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {group.createdBy === user?.id
                ? t('groups.leaveOwnerDescription')
                : t('groups.leaveMemberDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} disabled={leaving}>
              {leaving ? t('groups.leaving') : t('groups.leaveGroup')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
