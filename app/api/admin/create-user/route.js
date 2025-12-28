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

    // 1. Determine the Base URL dynamically (e.g., https://your-app.vercel.app)
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;

    // 2. INVITE USER with Redirect
    // This tells Supabase: "When they click the link, send them to /auth/callback, 
    // which will then forward them to /auth/update-password"
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/update-password`
    });

    if (createError) throw createError;

    // 3. Update Role
    if (user && user.user) {
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ role: role })
            .eq('id', user.user.id);
        
        if (profileError) console.error("Profile update failed:", profileError);
    }

    return NextResponse.json({ message: 'User invited successfully' });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}