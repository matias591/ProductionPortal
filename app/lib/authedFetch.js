import { createClient } from '@supabase/supabase-js';

let supabase;

// fetch() that attaches the current user's Supabase access token for /api routes.
export async function authedFetch(url, options = {}) {
  supabase ||= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { ...options, headers });
}
