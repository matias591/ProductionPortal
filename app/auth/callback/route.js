import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next') || '/';
  // Only allow same-site relative paths (blocks //evil.com and @evil.com tricks).
  const next = /^\/(?![\/\\])/.test(nextParam) ? nextParam : '/';

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    }
  }

  // If error, return to login
  return NextResponse.redirect(`${requestUrl.origin}/login`);
}