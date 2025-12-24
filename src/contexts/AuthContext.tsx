import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { closeDatabase, getDatabase } from '../db/database';
import { SyncService } from '../services/syncService';
import { SyncManager } from '../services/syncManager';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAnonymous: boolean;
  userId: string | null; // null means not ready yet
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  dataMigrated: boolean; // Flag to indicate when migration completes
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataMigrated, setDataMigrated] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // If user is logged in, check if we need to download their data
      if (session?.user) {
        // Keep loading true until download completes
        await handleUserLogin(session.user.id);
        // Start background sync manager
        SyncManager.start(session.user.id);
      }

      // Now safe to set loading false - data is ready
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Handle sign-in: download data from Supabase if exists
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true); // Keep loading during download
        await handleUserLogin(session.user.id);
        // Start background sync manager
        SyncManager.start(session.user.id);
      }

      // Handle sign-out: stop sync manager
      if (event === 'SIGNED_OUT') {
        SyncManager.stop();
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Handle user login - check if data exists locally or in Supabase
   */
  const handleUserLogin = async (userId: string) => {
    try {
      console.log('[AuthContext] handleUserLogin starting for user:', userId.substring(0, 8));
      const db = await getDatabase();

      // Check if we have any local data for this user
      const localData = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM ranking WHERE user_id = ?',
        [userId]
      );
      console.log('[AuthContext] Local data count:', localData?.count || 0);

      // Check if we have anonymous data to migrate
      const anonymousData = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM ranking WHERE user_id = ?',
        ['anonymous']
      );
      console.log('[AuthContext] Anonymous data count:', anonymousData?.count || 0);

      // If user has anonymous data, migrate it
      if (anonymousData && anonymousData.count > 0) {
        console.log(`[AuthContext] Migrating ${anonymousData.count} anonymous rankings...`);
        await SyncService.migrateAnonymousData(userId);
        setDataMigrated(true); // Trigger UI refresh
        console.log('[AuthContext] Migration complete');
        return;
      }

      // If user has no local data, check Supabase
      if (!localData || localData.count === 0) {
        console.log('[AuthContext] No local data, checking Supabase...');
        const hasSupabaseData = await SyncService.hasSupabaseData(userId);

        if (hasSupabaseData) {
          console.log('[AuthContext] Downloading data from Supabase...');
          await SyncService.downloadFromSupabase(userId);
          console.log('[AuthContext] Download complete');
        } else {
          console.log('[AuthContext] No data in Supabase either');
        }
      } else {
        console.log('[AuthContext] Using existing local data');
      }
      // Note: No need to manually sync - SyncManager will process queue automatically
    } catch (error) {
      console.error('[AuthContext] Error handling user login:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // If signup successful and user exists, migrate anonymous data
    if (data.user) {
      try {
        const db = await getDatabase();

        // Check if we have anonymous data to migrate
        const anonymousData = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM ranking WHERE user_id = ?',
          ['anonymous']
        );

        if (anonymousData && anonymousData.count > 0) {
          console.log(`Migrating ${anonymousData.count} anonymous rankings to new account...`);
          await SyncService.migrateAnonymousData(data.user.id);
          setDataMigrated(true); // Trigger UI refresh
        }
      } catch (err) {
        console.error('Error migrating data during signup:', err);
        // Don't throw - signup was successful even if migration failed
      }
    }
  };

  const signOut = async () => {
    // Stop sync manager
    SyncManager.stop();

    // Close and wipe local database
    await closeDatabase();

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  };

  const syncNow = async () => {
    if (user?.id) {
      await SyncManager.syncNow(user.id);
    }
  };

  const value = {
    user,
    session,
    loading,
    isAnonymous: !user,
    userId: loading ? null : (user?.id || 'anonymous'), // null while loading, then set to real userId or 'anonymous'
    signIn,
    signUp,
    signOut,
    syncNow,
    dataMigrated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
