import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export type UserRole = 'master' | 'admin' | 'instructor';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  document_id: string | null;
  role: UserRole;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!supabase || !session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    void supabase
      .from('profiles')
      .select('id, email, full_name, document_id, role')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setProfile((data as UserProfile) || null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase no configurado') };
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ) => {
    if (!supabase) return { error: new Error('Supabase no configurado') };
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  return {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin: profile?.role === 'admin' || profile?.role === 'master',
    isMaster: profile?.role === 'master',
    loading,
    signIn,
    signUp,
    signOut,
  };
}
