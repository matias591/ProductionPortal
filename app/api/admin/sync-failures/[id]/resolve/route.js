import { requireRole } from '../../../../_lib/requireRole';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Manually marks a failure as resolved (e.g. fixed directly in NetSuite).
export async function POST(request, { params }) {
  const auth = await requireRole(request, ['admin']);
  if (auth.error) return auth.error;
  const { id } = await params;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase.from('sync_failures').update({
    status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: auth.user.email,
  }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
