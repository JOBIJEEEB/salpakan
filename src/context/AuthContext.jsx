import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);   // user_profiles row
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchingRef = useRef(false);

  // Fetch the user_profiles row for a given user id
  const fetchProfile = async (userId) => {
    if (!userId || fetchingRef.current) {
      if (!userId) {
        setProfile(null);
        setProfileLoading(false);
      }
      return;
    }
    
    fetchingRef.current = true;
    // Only show loading state if we don't have a profile yet to avoid UI flicker on re-sync
    if (!profile) setProfileLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error.message);
      } else if (data) {
        // Only update state if data is different to prevent top-level re-renders
        setProfile(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
    } finally {
      setProfileLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchProfile(session?.user?.id);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchProfile(session?.user?.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Called from UsernameSetup after successfully saving — refreshes profile in context
  const refreshProfile = () => fetchProfile(user?.id);

  // Optimistically update profile
  const updateProfile = async (updates) => {
    if (!user) return;
    setProfile(prev => ({ ...prev, ...updates }));
    const { error } = await supabase.from('user_profiles').update(updates).eq('id', user.id);
    if (error) {
      // Rollback on error
      fetchProfile(user.id);
      throw error;
    }
  };

  const value = {
    session,
    user,
    profile,
    profileLoading,
    loading,
    refreshProfile,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
