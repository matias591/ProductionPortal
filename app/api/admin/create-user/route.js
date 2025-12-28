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

    // 1. INVITE USER (Sends email automatically)
    // We set a dummy redirect URL, but the user clicks the link in email to set password
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (createError) throw createError;

    // 2. Update Role in Profiles Table
    // The profile is created automatically by the DB trigger, we just need to set the role
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