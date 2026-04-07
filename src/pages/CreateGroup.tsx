import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGroup, getNickname } from '@/lib/storage';
import { COMPETITIONS } from '@/lib/competitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import NicknamePrompt from '@/components/NicknamePrompt';
import { motion } from 'framer-motion';

export default function CreateGroup() {
  const [groupName, setGroupName] = useState('');
  const [competitionId, setCompetitionId] = useState('laliga');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [nickname, setNickname2] = useState(getNickname());
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCreate = () => {
    if (!groupName.trim() || !nickname) return;
    const group = createGroup(groupName.trim(), nickname, competitionId);
    setCreatedId(group.id);
    toast.success('Group created!');
  };

  const shareLink = createdId ? `${window.location.origin}/group/${createdId}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-header border-b border-border/50 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-header-foreground/70 hover:text-header-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-bold font-display text-header-foreground">Create Group</span>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        <div>
          <label className="text-sm font-semibold text-foreground block mb-2">Group Name</label>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Friends League"
            className="rounded-xl"
          />
        </div>

        {/* Competition Selection */}
        <div>
          <label className="text-sm font-semibold text-foreground block mb-2">Competition</label>
          <div className="grid grid-cols-2 gap-2">
            {COMPETITIONS.map((comp) => (
              <button
                key={comp.id}
                onClick={() => setCompetitionId(comp.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition-all ${
                  competitionId === comp.id
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border/50 bg-card text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                <span className="text-lg">{comp.logo}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{comp.name}</p>
                  <p className="text-[10px] text-muted-foreground">{comp.country}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleCreate}
          className="w-full font-bold py-6 text-base rounded-xl"
          disabled={!groupName.trim()}
        >
          Create Group
        </Button>

        {createdId && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <label className="text-sm font-semibold text-foreground block mb-2">Share Link</label>
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-3">
              <span className="text-sm text-muted-foreground truncate flex-1">{shareLink}</span>
              <button onClick={copyLink} className="text-primary hover:text-primary/80 transition-colors">
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 rounded-xl"
              onClick={() => navigate(`/group/${createdId}`)}
            >
              View Group
            </Button>
          </motion.div>
        )}
      </div>

      {!nickname && <NicknamePrompt onSet={(n) => setNickname2(n)} />}
    </div>
  );
}
