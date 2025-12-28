'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, Users, LogOut, Tag, Cpu, Factory, List } from 'lucide-react';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setEmail(session.user.email);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      const r = profile?.role || 'vendor';
      setRole(r);
      if (r === 'admin') {
        setIsAdmin(true);
      }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const getLinkClass = (path) => {
    const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
    return `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer mb-1
      ${isActive ? 'bg-[#0176D3]/10 text-[#0176D3]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col z-50">
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="w-8 h-8 bg-[#0176D3] rounded-md flex items-center justify-center shadow-sm mr-3">
           <span className="text-white font-bold text-lg">OA</span>
        </div>
        <span className="font-bold text-slate-800 tracking-tight">Production</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        
        {/* --- OVERVIEW (Admin OR Operations) --- */}
        {(role === 'admin' || role === 'operation') && (
            <div onClick={() => router.push('/')} className={getLinkClass('/')}>
            <LayoutDashboard size={18} /><span>Overview</span>
            </div>
        )}

        <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace</div>
        
        <div onClick={() => router.push('/orders')} className={getLinkClass('/orders')}>
          <List size={18} /><span>Orders List</span>
        </div>
        
        <div onClick={() => router.push('/seapod-production')} className={getLinkClass('/seapod-production')}>
          <Factory size={18} /><span>Seapod Production</span>
        </div>

        {/* --- ADMIN CONTROLS (Strictly Admin) --- */}
        {isAdmin && (
          <>
            <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admin Controls</div>
            <div onClick={() => router.push('/admin/items')} className={getLinkClass('/admin/items')}><Tag size={18} /><span>Master Items</span></div>
            <div onClick={() => router.push('/admin/kits')} className={getLinkClass('/admin/kits')}><Package size={18} /><span>Manage Kits</span></div>
            <div onClick={() => router.push('/admin/seapod-templates')} className={getLinkClass('/admin/seapod-templates')}><Cpu size={18} /><span>Seapod Templates</span></div>
            <div onClick={() => router.push('/admin/users')} className={getLinkClass('/admin/users')}><Users size={18} /><span>User Management</span></div>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3 mb-3">
           <div className="w-8 h-8 rounded-full bg-[#0176D3]/20 text-[#0176D3] flex items-center justify-center font-bold text-xs border border-[#0176D3]/10">
              {email.charAt(0).toUpperCase()}
           </div>
           <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-700 truncate">{email}</p>
              <p className="text-[10px] text-slate-500 capitalize">{role}</p>
           </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 py-2 hover:bg-white border border-transparent hover:border-slate-200 rounded transition-all">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}