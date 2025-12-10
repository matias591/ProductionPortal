import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
  }

  // Admin Client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { userId } = await request.json();

    // Delete from Auth (This automatically deletes from Profiles because of Cascade)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) throw error;

    return NextResponse.json({ message: 'User deleted successfully' });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}