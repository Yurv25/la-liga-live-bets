import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGroup, getNickname } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'sonner';
import NicknamePrompt from '@/components/NicknamePrompt';

export default function CreateGroup() {
  const [groupName, setGroupName] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [nickname, setNickname2] = useState(getNickname());
  const navigate = useNavigate();

  const handleCreate = () => {
    if (!groupName.trim() || !nickname) return;
    const group = createGroup(groupName.trim(), nickname);
    setCreatedId(group.id);
    toast.success('Group created!');
  };

  const shareLink = createdId
    ? `${window.location.origin}/group/${createdId}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied!');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-header text-header-foreground px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-bold">Create Group</span>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        <div>
          <label className="text-sm font-semibold text-foreground block mb-2">Group Name:</label>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Friends League"
          />
        </div>

        <Button onClick={handleCreate} className="w-full font-bold py-6 text-base" disabled={!groupName.trim()}>
          Create Group
        </Button>

        {createdId && (
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Share Link:</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
              <span className="text-sm text-muted-foreground truncate flex-1">{shareLink}</span>
              <button onClick={copyLink} className="text-primary hover:text-primary/80">
                <Copy className="h-5 w-5" />
              </button>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate(`/group/${createdId}`)}
            >
              View Group
            </Button>
          </div>
        )}
      </div>

      {!nickname && <NicknamePrompt onSet={(n) => setNickname2(n)} />}
    </div>
  );
}
