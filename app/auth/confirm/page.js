'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthConfirm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Verifying your invitation...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    handleSessionExchange();
  }, []);

  async function handleSessionExchange() {
    // 1. Check for the 'code' (PKCE Flow)
    const code = searchParams.get('code');
    
    // 2. Check for hash (Implicit Flow - uncommon but possible)
    // Supabase handles hash automatically with onAuthStateChange usually, but code is explicit.

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            setMessage('Error: ' + error.message);
            return;
        }
    }

    // 3. Wait for session to be established
    const { data: { session }, error } = await supabase.auth.getSession();

    if (session) {
        // SUCCESS: You are logged in! Go set your password.
        router.push('/auth/update-password');
    } else {
        // Check if we caught a hash fragment event instead
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session) {
                router.push('/auth/update-password');
            } else {
                // If all fails
                router.push('/login');
            }
        });
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 font-sans">
      <Loader2 size={48} className="animate-spin text-[#0176D3] mb-4" />
      <h2 className="text-lg font-bold">{message}</h2>
    </div>
  );
}