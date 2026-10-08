'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Check, AlertCircle } from 'lucide-react';
import AuthShell from '../components/AuthShell';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setShakeKey(k => k + 1);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/'), 650);
    }
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/google-callback`,
        queryParams: { hd: 'orca-ai.io', prompt: 'select_account' },
      },
    });
  }

  return (
    <AuthShell key={shakeKey} shake={shakeKey > 0} title="Welcome back" subtitle="Sign in to Production Portal">
      <div className="space-y-6">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 h-10 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.6l-6.5-5.5C29.6 34.6 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.2 5.6l6.5 5.5C41.4 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
          </svg>
          Continue with Google
        </button>
        <p className="text-center text-[11px] text-slate-400 -mt-4">@orca-ai.io accounts only</p>

        <div className="flex items-center gap-3">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-[11px] text-slate-400 uppercase font-bold">or</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
                <input type="email" required className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm outline-none" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Password</label>
                <input type="password" required className="w-full px-3 h-10 border border-slate-200 rounded-xl text-sm outline-none" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                {/* FORGOT PASSWORD LINK */}
                <div className="text-right mt-1">
                    <button type="button" onClick={() => router.push('/login/forgot-password')} className="text-xs text-[#2f7cf6] hover:underline font-bold">
                        Forgot Password?
                    </button>
                </div>
              </div>
          </div>
          {error && (
            <div role="alert" className="bz-fade-up flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
          <button type="submit" disabled={loading || success} className={`w-full flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:cursor-default ${success ? 'bg-[#17915f]' : 'bg-[#2f7cf6] hover:bg-blue-700'}`}>
            {success ? (<><Check size={16} className="bz-check" /> Signed in</>)
              : loading ? (<><span className="bz-spinner inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white" /> Signing in</>)
              : 'Sign in'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
