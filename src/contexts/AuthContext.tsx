import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile, UserRole } from '../types';
import { MockCivicStore, DEMO_PROFILES } from '../utils/mockData';

interface SignUpParams {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; profile: Profile | null; error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInAsDemo: (role: 'citizen' | 'admin') => Promise<{ user: User | null; profile: Profile | null; error: Error | null }>;
  signUp: (params: SignUpParams) => Promise<{ user: User | null; emailConfirmationRequired: boolean; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_KEY = 'civicfix_local_user_session';

function createMockSupabaseUser(profile: Profile): User {
  return {
    id: profile.id,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { name: profile.name, phone: profile.phone, role: profile.role },
    aud: 'authenticated',
    confirmation_sent_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    created_at: profile.created_at,
    email: profile.email || 'user@civicfix.org',
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    phone: profile.phone || '',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  } as unknown as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch the profile from public.profiles with retry support
  const fetchProfile = useCallback(async (userId: string, retries = 2): Promise<Profile | null> => {
    if (!isSupabaseConfigured) {
      const profiles = MockCivicStore.getProfiles();
      const prof = profiles[userId] || null;
      if (prof) setProfile(prof);
      return prof;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[CivicFix Auth] Error querying profile:', error.message);
        return null;
      }

      if (data) {
        const prof = data as Profile;
        setProfile(prof);
        return prof;
      }

      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        return await fetchProfile(userId, retries - 1);
      }

      // Safe fallback if profile row not yet created in Supabase
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;
      if (currentUser && currentUser.id === userId) {
        const fallbackProf: Profile = {
          id: userId,
          name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Citizen',
          email: currentUser.email || '',
          phone: currentUser.user_metadata?.phone || '',
          role: (currentUser.user_metadata?.role as UserRole) || (currentUser.email?.includes('admin') ? 'admin' : 'citizen'),
          created_at: currentUser.created_at || new Date().toISOString(),
        };
        setProfile(fallbackProf);
        return fallbackProf;
      }

      setProfile(null);
      return null;
    } catch (err) {
      console.error('[CivicFix Auth] Unexpected profile fetch error:', err);
      setProfile(null);
      return null;
    }
  }, []);

  // Initialize session and subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      // Check offline/demo localStorage session
      try {
        const stored = localStorage.getItem(LOCAL_SESSION_KEY);
        if (stored) {
          const prof = JSON.parse(stored) as Profile;
          if (prof && prof.id) {
            const mockUser = createMockSupabaseUser(prof);
            setUser(mockUser);
            setProfile(prof);
          }
        }
      } catch (err) {
        console.warn('[CivicFix Auth] Error loading cached demo session:', err);
      }
      setLoading(false);
      return;
    }

    // 1. Initial Session Retrieval
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        fetchProfile(initialSession.user.id).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Demo 1-click Sign In
  const signInAsDemo = async (demoRole: 'citizen' | 'admin') => {
    setLoading(true);
    const demoProfile = demoRole === 'admin' ? DEMO_PROFILES['demo-admin-id'] : DEMO_PROFILES['demo-citizen-id'];
    
    // Save to local profile registry
    MockCivicStore.saveProfile(demoProfile);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(demoProfile));

    const mockUser = createMockSupabaseUser(demoProfile);
    setUser(mockUser);
    setProfile(demoProfile);
    setLoading(false);

    return { user: mockUser, profile: demoProfile, error: null };
  };

  // Sign in action
  const signIn = async (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();

    // If Supabase is not configured or in offline demo mode, provide instant offline login
    if (!isSupabaseConfigured) {
      setLoading(true);
      const profiles = MockCivicStore.getProfiles();
      let matchedProfile = Object.values(profiles).find((p) => p.email?.toLowerCase() === trimmedEmail);

      // Check admin keywords or defaults
      if (!matchedProfile) {
        const isAdminEmail = trimmedEmail.includes('admin');
        matchedProfile = {
          id: `local-user-${Date.now()}`,
          name: trimmedEmail.split('@')[0].replace(/[._-]/g, ' '),
          email: trimmedEmail,
          phone: '+91 98000 00000',
          role: isAdminEmail ? 'admin' : 'citizen',
          created_at: new Date().toISOString(),
        };
        MockCivicStore.saveProfile(matchedProfile);
      }

      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(matchedProfile));
      const mockUser = createMockSupabaseUser(matchedProfile);
      setUser(mockUser);
      setProfile(matchedProfile);
      setLoading(false);

      return { user: mockUser, profile: matchedProfile, error: null };
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      setLoading(false);
      return { user: null, profile: null, error };
    }

    const authUser = data.user;
    setUser(authUser);
    setSession(data.session);

    let userProfile: Profile | null = null;
    if (authUser) {
      userProfile = await fetchProfile(authUser.id);
    }
    setLoading(false);

    return { user: authUser, profile: userProfile, error: null };
  };

  // Google OAuth sign in action
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Fallback for offline demo mode
        const googleProfile: Profile = {
          id: `google-user-${Date.now()}`,
          name: 'Google Citizen',
          email: 'citizen.google@civicfix.org',
          phone: '',
          role: 'citizen',
          created_at: new Date().toISOString(),
        };
        MockCivicStore.saveProfile(googleProfile);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(googleProfile));

        const mockUser = createMockSupabaseUser(googleProfile);
        setUser(mockUser);
        setProfile(googleProfile);
        setLoading(false);
        return { error: null };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/complaints`,
        },
      });

      if (error) {
        setLoading(false);
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err };
    }
  };

  // Sign up action (Guarantees default citizen role)
  const signUp = async ({ name, email, phone, password }: SignUpParams) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!isSupabaseConfigured) {
      setLoading(true);
      const newProfile: Profile = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: trimmedName,
        email: trimmedEmail,
        phone: phone ? phone.trim() : '',
        role: 'citizen',
        created_at: new Date().toISOString(),
      };

      MockCivicStore.saveProfile(newProfile);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newProfile));

      const mockUser = createMockSupabaseUser(newProfile);
      setUser(mockUser);
      setProfile(newProfile);
      setLoading(false);

      return { user: mockUser, emailConfirmationRequired: false, error: null };
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          phone: phone ? phone.trim() : null,
        },
      },
    });

    if (error) {
      setLoading(false);
      return { user: null, emailConfirmationRequired: false, error };
    }

    const authUser = data.user;
    const emailConfirmationRequired = !data.session && Boolean(authUser);

    if (data.session && authUser) {
      setUser(authUser);
      setSession(data.session);
      await fetchProfile(authUser.id);
    }

    setLoading(false);
    return { user: authUser, emailConfirmationRequired, error: null };
  };

  // Sign out action
  const signOut = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut().catch(() => null);
      }
      localStorage.removeItem(LOCAL_SESSION_KEY);
      setUser(null);
      setSession(null);
      setProfile(null);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Refresh current user profile
  const refreshProfile = async (): Promise<Profile | null> => {
    if (!user) return null;
    return await fetchProfile(user.id);
  };

  const role: UserRole | null = profile?.role ?? (user?.user_metadata?.role as UserRole) ?? (user?.email?.includes('admin') ? 'admin' : (user ? 'citizen' : null));
  const isAuthenticated = Boolean(user);
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        isLoading: loading,
        isAuthenticated,
        isAdmin,
        isConfigured: isSupabaseConfigured,
        isDemoMode: !isSupabaseConfigured,
        signIn,
        signInWithGoogle,
        signInAsDemo,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
