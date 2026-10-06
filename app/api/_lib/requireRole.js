import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Verifies the caller's Supabase access token and checks their profiles.role.
// Usage: const auth = await requireRole(request, ['admin']); if (auth.error) return auth.error;
export async function requireRole(request, allowedRoles) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin.from('profiles').select('role').eq('id', data.user.id).single();
  const role = profile?.role;
  if (!role || (allowedRoles && !allowedRoles.includes(role))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user: data.user, role };
}
