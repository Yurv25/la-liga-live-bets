import { useState } from 'react';
import { setApiKey } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onSet: () => void;
}

export default function ApiKeyPrompt({ onSet }: Props) {
  const [key, setKey] = useState('');

  const handleSubmit = () => {
    if (!key.trim()) return;
    setApiKey(key.trim());
    onSet();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl bg-card border border-border/50 p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-card-foreground">API Key Required</h2>
            <p className="text-xs text-muted-foreground">Free · No rate limits</p>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Enter your Bzzoiro API key to get live La Liga match data.
        </p>
        
        <a
          href="https://sports.bzzoiro.com/register/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 mb-4 font-medium"
        >
          <ExternalLink className="h-4 w-4" />
          Get a free API key
        </a>

        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your API token..."
          className="mb-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
        
        <Button className="w-full font-semibold" disabled={!key.trim()} onClick={handleSubmit}>
          Connect
        </Button>
      </motion.div>
    </div>
  );
}
