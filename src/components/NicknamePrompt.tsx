import { useState } from 'react';
import { setNickname } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onSet: (name: string) => void;
}

export default function NicknamePrompt({ onSet }: Props) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-card-foreground mb-2">Welcome to GameOn!</h2>
        <p className="text-sm text-muted-foreground mb-4">Enter a nickname to start predicting</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your nickname"
          className="mb-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              setNickname(name.trim());
              onSet(name.trim());
            }
          }}
        />
        <Button
          className="w-full"
          disabled={!name.trim()}
          onClick={() => {
            setNickname(name.trim());
            onSet(name.trim());
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
