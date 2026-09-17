'use client';
import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Google OAuth needs its own callback (separate from /auth/callback, which
// is a server route used by the password-recovery flow): signInWithOAuth
// stores the PKCE code_verifier in the browser's localStorage, so the
// exchange has to happen client-side, in this same browser, to read it back.
function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Signing you in...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    async function exchange() {
      const code = searchParams.get('code');
      if (!code) { setMessage('Missing sign-in code.'); router.push('/login'); return; }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setMessage('Sign-in failed: ' + error.message);
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      router.push('/');
    }

    exchange();
  }, [router, searchParams, supabase]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 font-sans">
      <Loader2 size={48} className="animate-spin text-[#0176D3] mb-4" />
      <h2 className="text-lg font-bold">{message}</h2>
    </div>
  );
}

export default function GoogleCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={48} className="animate-spin text-slate-300" />
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
