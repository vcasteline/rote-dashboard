import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // TODO: Replace with your Supabase URL and Anon Key from .env.local
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
} 