import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseKeys = !!(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseKeys
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Simulated Session Keys for client testing if real Supabase isn't connected yet
export const getSimulatedUser = () => {
  const stored = localStorage.getItem("simulated_user");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const setSimulatedUser = (user: { id: string; email: string; role: 'user' | 'admin' } | null) => {
  if (user) {
    localStorage.setItem("simulated_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("simulated_user");
  }
};
