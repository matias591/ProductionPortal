'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function handleUpdate(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Password updated successfully! Redirecting...");
      router.push('/');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb] px-4 font-sans">
      <div className="bz-fade-up max-w-md w-full bg-white p-10 rounded-2xl shadow-[0_12px_40px_rgba(12,31,75,0.08)] border border-slate-200">
        <img src="/bizzapps-symbol.svg" alt="BizzApps" className="mx-auto mb-4 h-10 w-auto" />
        <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-100 text-[#2f7cf6] rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Set New Password</h2>
            <p className="text-sm text-slate-500 mt-2">Please create a secure password for your account.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
            <div className="relative">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        minLength={6}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-[#2f7cf6] focus:ring-1 focus:ring-[#2f7cf6] outline-none" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-10 bg-[#2f7cf6] text-white rounded-xl font-semibold hover:bg-blue-700 shadow-sm flex items-center justify-center">
                {loading ? 'Updating...' : 'Set Password & Login'}
            </button>
        </form>
      </div>
    </div>
  );
}