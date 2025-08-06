// Supabase client configuration - kept for future sync implementation
// Currently app works fully offline with SQLite
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/rankings';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);