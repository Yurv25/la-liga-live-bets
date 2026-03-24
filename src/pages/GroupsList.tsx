import { useNavigate } from 'react-router-dom';
import { getGroups, getNickname } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Users, Trophy } from 'lucide-react';
import NicknamePrompt from '@/components/NicknamePrompt';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function GroupsList() {
  const navigate = useNavigate();
  const groups = getGroups();
  const [nickname, setNickname2] = useState(getNickname());

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-header border-b border-border/50 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-header-foreground/70 hover:text-header-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-bold font-display text-header-foreground">My Groups</span>
        </div>
        <button
          onClick={() => navigate('/create-group')}
          className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-3">
        {groups.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No groups yet</p>
            <Button onClick={() => navigate('/create-group')} className="rounded-full">
              Create a Group
            </Button>
          </div>
        ) : (
          groups.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/group/${g.id}`)}
              className="w-full rounded-xl border border-border/50 bg-card p-4 text-left hover:bg-card/80 transition-colors flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-card-foreground">{g.name}</div>
                <div className="text-xs text-muted-foreground">{g.members.length} members</div>
              </div>
            </motion.button>
          ))
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 glass flex justify-around py-3 max-w-lg mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex flex-col items-center text-muted-foreground text-xs font-medium gap-1 hover:text-foreground transition-colors"
        >
          <Trophy className="h-5 w-5" />
          Matches
        </button>
        <button className="flex flex-col items-center text-primary text-xs font-medium gap-1">
          <Users className="h-5 w-5" />
          Groups
        </button>
      </div>

      {!nickname && <NicknamePrompt onSet={(n) => setNickname2(n)} />}
    </div>
  );
}
