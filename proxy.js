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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return response;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
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
