import { useNavigate } from 'react-router-dom';
import { getGroups, getNickname } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import NicknamePrompt from '@/components/NicknamePrompt';
import { useState } from 'react';

export default function GroupsList() {
  const navigate = useNavigate();
  const groups = getGroups();
  const [nickname, setNickname2] = useState(getNickname());

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-header text-header-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-bold">My Groups</span>
        </div>
        <button onClick={() => navigate('/create-group')}>
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-3">
        {groups.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">No groups yet</p>
            <Button onClick={() => navigate('/create-group')}>
              Create a Group
            </Button>
          </div>
        ) : (
          groups.map((g) => (
            <button
              key={g.id}
              onClick={() => navigate(`/group/${g.id}`)}
              className="w-full rounded-lg border border-border bg-card p-4 text-left hover:bg-muted transition-colors"
            >
              <div className="font-semibold text-card-foreground">{g.name}</div>
              <div className="text-sm text-muted-foreground">{g.members.length} members</div>
            </button>
          ))
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 max-w-lg mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex flex-col items-center text-muted-foreground text-xs font-medium py-1 px-3"
        >
          <span className="text-lg">⚽</span>
          Matches
        </button>
        <button className="flex flex-col items-center text-primary text-xs font-medium py-1 px-3">
          <span className="text-lg">👥</span>
          Groups
        </button>
      </div>

      {!nickname && <NicknamePrompt onSet={(n) => setNickname2(n)} />}
    </div>
  );
}
