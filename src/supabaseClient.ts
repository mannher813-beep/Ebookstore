import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseKeys = !!(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseKeys
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || "";

