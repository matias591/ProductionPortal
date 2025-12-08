import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  // 1. Initialize SUPER ADMIN Client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const body = await request.json();
    const { email, password, role } = body;

    // 2. Create the User in Supabase Auth
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (createError) throw createError;

    // 3. Update their Role in the Profiles table
    if (user && user.user) {
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ role: role })
            .eq('id', user.user.id);
        
        if (profileError) throw profileError;
    }

    return NextResponse.json({ message: 'User created successfully' });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}