import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  // 1. Setup Standard Client (To check who is asking)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // 2. Get the current session from the request headers
  // This verifies the user is actually logged in
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  // 3. Verify User and Role
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  
  if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if they are actually an Admin in the database
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
  }

  // --- SECURITY CHECK PASSED ---

  // 4. Initialize SUPER ADMIN Client (To actually do the work)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const body = await request.json();
    const { email, password, role } = body;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) throw createError;

    if (newUser && newUser.user) {
        await supabaseAdmin.from('profiles').update({ role }).eq('id', newUser.user.id);
    }

    return NextResponse.json({ message: 'User created successfully' });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}