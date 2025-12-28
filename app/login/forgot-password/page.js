'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);

    // This sends an email with a link pointing to /auth/callback -> which redirects to /auth/update-password
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <button onClick={() => router.push('/login')} className="text-xs font-bold text-slate-500 hover:text-black mb-6 flex items-center gap-2">
            <ArrowLeft size={14} /> Back to Login
        </button>

        {sent ? (
            <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
                <p className="text-sm text-slate-500 mt-2">We sent a password reset link to <strong>{email}</strong></p>
                <button onClick={() => router.push('/login')} className="mt-8 text-[#0176D3] text-sm font-bold hover:underline">Return to Sign In</button>
            </div>
        ) : (
            <>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Reset Password</h2>
                    <p className="text-sm text-slate-500 mt-2">Enter your email to receive a recovery link.</p>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input 
                                type="email" 
                                required 
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#0176D3] text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-all">
                        {loading ? 'Sending Link...' : 'Send Reset Link'}
                    </button>
                </form>
            </>
        )}
      </div>
    </div>
  );
}