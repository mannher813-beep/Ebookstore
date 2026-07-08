import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseKeys = !!(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseKeys
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const isClientOnRemoteStaticHost = typeof window !== "undefined" && 
  !window.location.hostname.includes("localhost") && 
  !window.location.hostname.includes("127.0.0.1") && 
  !window.location.hostname.includes(".run.app");

export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 
  (isClientOnRemoteStaticHost ? "https://ais-pre-jzoqfhzna2l5x26a2fetax-1001236786593.europe-west2.run.app" : "");

