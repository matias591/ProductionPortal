import { requireRole } from '../../_lib/requireRole';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const RETENTION_DAYS = 90;

// Admin-only list of sync failures. ?count=1 returns just the number of unresolved ones (sidebar badge).
export async function GET(request) {
  const auth = await requireRole(request, ['admin']);
  if (auth.error) return auth.error;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(request.url);

  if (url.searchParams.get('count')) {
    const { count } = await supabase.from('sync_failures').select('id', { count: 'exact', head: true }).neq('status', 'resolved');
    return NextResponse.json({ open: count || 0 });
  }

  // Keep the table small: drop resolved rows past retention while we're here.
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
  await supabase.from('sync_failures').delete().eq('status', 'resolved').lt('resolved_at', cutoff);

  const { data, error } = await supabase.from('sync_failures').select('*').order('last_failed_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ failures: data });
}
