import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

export const authService = {
  /**
   * Get current authenticated user session
   */
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return { data: data as Profile | null, error };
  },

  /**
   * Update profile (name, phone)
   */
  async updateProfile(userId: string, updates: { name?: string; phone?: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    return { data: data as Profile | null, error };
  },
};
