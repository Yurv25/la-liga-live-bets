import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AuthPage() {
  const { t } = useTranslation();
  const { user, loading, signInEmail, signUpEmail, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const redirectTo = location.state?.from || '/';
  const platform = Capacitor.getPlatform();
  const fixedTop = platform === 'web' ? '1rem' : platform === 'ios' ? 'calc(env(safe-area-inset-top, 0px) + 1rem)' : 'calc(28px + 1rem)';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = t('auth.title');
  }, [t]);

  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true });
  }, [user, loading, navigate, redirectTo]);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      toast.error(t('auth.emailPasswordRequired'));
      return;
    }
    setBusy(true);
    const res =
      mode === 'signin'
        ? await signInEmail(email.trim(), password)
        : await signUpEmail(email.trim(), password, name.trim() || undefined);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (mode === 'signup') {
      toast.success(t('auth.accountCreated'));
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const res = await signInGoogle();
    setBusy(false);
    if (res.error) toast.error(res.error);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div
        className="fixed right-4 z-50 flex items-center gap-2"
        style={{ top: fixedTop }}
      >
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl bg-card border border-border/50 p-6 shadow-2xl glass"
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">⚽</span>
          <h1 className="text-2xl font-bold text-card-foreground font-display">{t('common.brand')}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{t('auth.tagline')}</p>

        <Button
          variant="outline"
          className="w-full rounded-xl mb-4 font-semibold"
          onClick={handleGoogle}
          disabled={busy}
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden>
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/>
          </svg>
          {t('auth.continueGoogle')}
        </Button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-border/50" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('auth.or')}</span>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="space-y-3">
            <Input
              placeholder={t('auth.displayNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </TabsContent>

          <div className="space-y-3">
            <Input
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <Button
              onClick={handleSubmit}
              disabled={busy}
              className="w-full font-semibold rounded-xl py-6"
            >
              {busy
                ? t('common.loading')
                : mode === 'signin'
                  ? t('auth.signIn')
                  : t('auth.createAccount')}
            </Button>
          </div>
        </Tabs>
      </motion.div>
    </div>
  );
}
