import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const MANAGEMENT_ALLOWED_PATH = '/travel';

export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getSession() reads the cookie locally (no round-trip to Supabase's auth
  // server) — fine here since this is a UX redirect only, not the real
  // security boundary (RLS + the existing client-side role checks are).
  // getUser() would add a network hop on every navigation for every user.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return response;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  const isManagement = profile?.role === 'management';

  if (isManagement && request.nextUrl.pathname !== MANAGEMENT_ALLOWED_PATH) {
    return NextResponse.redirect(new URL(MANAGEMENT_ALLOWED_PATH, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|auth|api).*)',
  ],
};
