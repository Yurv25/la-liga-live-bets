import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMyGroups } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import UserMenu from '@/components/UserMenu';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function GroupsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: fetchMyGroups,
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-header border-b border-border/50 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-header-foreground/70 hover:text-header-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-bold font-display text-header-foreground">{t('groups.myGroups')}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/create-group')}
            className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label={t('groups.createGroupAria')}
          >
            <Plus className="h-4 w-4" />
          </button>
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">{t('groups.noGroupsYet')}</p>
            <Button onClick={() => navigate('/create-group')} className="rounded-full">
              {t('groups.createAGroup')}
            </Button>
          </div>
        ) : (
          groups.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/group/${g.joinCode}`)}
              className="w-full rounded-xl border border-border/50 bg-card p-4 text-left hover:bg-card/80 transition-colors flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-card-foreground">{g.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t('groups.members', { count: g.members.length })}
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
