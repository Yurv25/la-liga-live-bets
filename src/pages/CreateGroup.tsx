import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGroup, getNickname } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import NicknamePrompt from '@/components/NicknamePrompt';
import { motion } from 'framer-motion';

export default function CreateGroup() {
  const [groupName, setGroupName] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [nickname, setNickname2] = useState(getNickname());
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCreate = () => {
    if (!groupName.trim() || !nickname) return;
    const group = createGroup(groupName.trim(), nickname);
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
    <div className="min-h-screen bg-background">
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
