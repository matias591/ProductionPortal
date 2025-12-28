'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    } else {
      router.push('/'); 
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#0176D3] rounded-lg flex items-center justify-center shadow-lg shadow-blue-200/50 mx-auto mb-4">
             <span className="text-white font-bold text-xl tracking-tight">OA</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to Orca Production Portal</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                <input type="email" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-[#0176D3] focus:border-[#0176D3] outline-none" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                <input type="password" required className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-[#0176D3] focus:border-[#0176D3] outline-none" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                {/* FORGOT PASSWORD LINK */}
                <div className="text-right mt-1">
                    <button type="button" onClick={() => router.push('/login/forgot-password')} className="text-xs text-[#0176D3] hover:underline font-bold">
                        Forgot Password?
                    </button>
                </div>
              </div>
          </div>
          <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-[#0176D3] hover:bg-blue-700 shadow-sm transition-all focus:outline-none">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}