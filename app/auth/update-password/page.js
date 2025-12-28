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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-100 text-[#0176D3] rounded-full flex items-center justify-center mx-auto mb-4">
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
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#0176D3] text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-all flex justify-center">
                {loading ? 'Updating...' : 'Set Password & Login'}
            </button>
        </form>
      </div>
    </div>
  );
}