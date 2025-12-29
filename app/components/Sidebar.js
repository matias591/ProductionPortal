'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, Users, LogOut, Tag, Cpu, Factory, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext'; // <--- Use the context

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar(); // <--- Get state
  
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
      if (r === 'admin') setIsAdmin(true);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // Helper to style active vs inactive links
  const getLinkClass = (path) => {
    const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
    return `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer mb-1 relative group
      ${isActive ? 'bg-[#0176D3]/10 text-[#0176D3]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
      ${isCollapsed ? 'justify-center' : ''}
    `;
  };

  return (
    <aside 
      className={`bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Header / Logo */}
      <div className={`h-16 flex items-center border-b border-slate-100 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="w-8 h-8 bg-[#0176D3] rounded-md flex items-center justify-center shadow-sm shrink-0">
           <span className="text-white font-bold text-lg">OA</span>
        </div>
        {!isCollapsed && (
            <span className="font-bold text-slate-800 tracking-tight ml-3 animate-in fade-in duration-300">Production</span>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
        
        {/* Workspace Section */}
        {!isCollapsed && <div className="pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider animate-in fade-in">Workspace</div>}
        
        {(role === 'admin' || role === 'operation') && (
            <div onClick={() => router.push('/')} className={getLinkClass('/')} title={isCollapsed ? "Overview" : ""}>
                <LayoutDashboard size={20} />
                {!isCollapsed && <span>Overview</span>}
            </div>
        )}

        <div onClick={() => router.push('/orders')} className={getLinkClass('/orders')} title={isCollapsed ? "Orders List" : ""}>
          <List size={20} />
          {!isCollapsed && <span>Orders List</span>}
        </div>
        
        <div onClick={() => router.push('/seapod-production')} className={getLinkClass('/seapod-production')} title={isCollapsed ? "Seapod Production" : ""}>
          <Factory size={20} />
          {!isCollapsed && <span>Seapod Production</span>}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className={`pt-6 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
               {isCollapsed ? '---' : 'Admin Controls'}
            </div>

            <div onClick={() => router.push('/admin/items')} className={getLinkClass('/admin/items')} title="Master Items">
                <Tag size={20} />{!isCollapsed && <span>Master Items</span>}
            </div>
            <div onClick={() => router.push('/admin/kits')} className={getLinkClass('/admin/kits')} title="Manage Kits">
                <Package size={20} />{!isCollapsed && <span>Manage Kits</span>}
            </div>
            <div onClick={() => router.push('/admin/seapod-templates')} className={getLinkClass('/admin/seapod-templates')} title="Templates">
                <Cpu size={20} />{!isCollapsed && <span>Seapod Templates</span>}
            </div>
            <div onClick={() => router.push('/admin/users')} className={getLinkClass('/admin/users')} title="Users">
                <Users size={20} />{!isCollapsed && <span>User Management</span>}
            </div>
          </>
        )}
      </nav>

      {/* Collapse Toggle Button */}
      <div className="px-3 pb-4">
        <button 
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
            {isCollapsed ? <ChevronRight size={20} /> : (
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <ChevronLeft size={16} /> <span className="mt-0.5">Collapse Sidebar</span>
                </div>
            )}
        </button>
      </div>

      {/* User Footer */}
      <div className={`p-4 border-t border-slate-100 bg-slate-50 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
           <div className="w-8 h-8 rounded-full bg-[#0176D3]/20 text-[#0176D3] flex items-center justify-center font-bold text-xs border border-[#0176D3]/10 shrink-0">
              {email.charAt(0).toUpperCase()}
           </div>
           {!isCollapsed && (
               <div className="overflow-hidden animate-in fade-in">
                  <p className="text-xs font-bold text-slate-700 truncate">{email}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{role}</p>
               </div>
           )}
        </div>
        <button onClick={handleLogout} className={`flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 py-2 hover:bg-white border border-transparent hover:border-slate-200 rounded transition-all ${isCollapsed ? 'w-10' : 'w-full'}`} title="Sign Out">
          <LogOut size={16} /> {!isCollapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}