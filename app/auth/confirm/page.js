'use client';
import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// 1. The Logic Component (Uses SearchParams)
function ConfirmContent() {
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
    const code = searchParams.get('code');
    
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            setMessage('Error: ' + error.message);
            return;
        }
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        router.push('/auth/update-password');
    } else {
        // Handle implicit flow hash fragments automatically via listener
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session) {
                router.push('/auth/update-password');
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

// 2. The Main Page (Wraps Logic in Suspense to fix Build Error)
export default function AuthConfirm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={48} className="animate-spin text-slate-300" />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}