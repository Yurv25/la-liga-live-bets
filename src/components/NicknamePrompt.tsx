import { useState } from 'react';
import { setNickname } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

interface Props {
  onSet: (name: string) => void;
}

export default function NicknamePrompt({ onSet }: Props) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl bg-card border border-border/50 p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⚽</span>
          <h2 className="text-xl font-bold text-card-foreground font-display">Welcome to Praedictio!</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Enter a nickname to start predicting</p>
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
          className="w-full font-semibold rounded-xl"
          disabled={!name.trim()}
          onClick={() => {
            setNickname(name.trim());
            onSet(name.trim());
          }}
        >
          Continue
        </Button>
      </motion.div>
    </div>
  );
}
