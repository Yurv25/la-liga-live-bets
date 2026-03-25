import { supabase } from '@/integrations/supabase/client';
import { Match } from './types';

export async function fetchAllMatches(): Promise<Match[]> {
  try {
    const { data, error } = await supabase.functions.invoke('laliga-matches');
    
    if (error) {
      console.error('Edge function error:', error);
      return [];
    }

    if (!Array.isArray(data)) {
      console.error('Unexpected response:', data);
      return [];
    }

    return data as Match[];
  } catch (err) {
    console.error('Failed to fetch matches:', err);
    return [];
  }
}
