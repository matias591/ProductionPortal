import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { email, role } = await request.json();

    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;

    // --- CHANGE IS HERE ---
    // Point to a new Client-Side page called '/auth/confirm'
    // This page will handle the code exchange in the browser
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/confirm` 
    });

    if (createError) throw createError;

    if (user && user.user) {
        await supabaseAdmin.from('profiles').update({ role: role }).eq('id', user.user.id);
    }

    return NextResponse.json({ message: 'User invited successfully' });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}