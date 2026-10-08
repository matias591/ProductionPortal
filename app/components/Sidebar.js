'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, Users, LogOut, Tag, Cpu, Factory, List, ChevronLeft, ChevronRight, MapPin, Plane, Menu, X } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleSidebar, mobileOpen, setMobileOpen, compact: isCollapsed } = useSidebar();
  
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

  useEffect(() => { setMobileOpen(false); }, [pathname]);

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

  // Real links: keyboard focusable, announced as links, middle-click / open-in-new-tab work
  const NavItem = ({ href, icon: Icon, label }) => (
    <Link href={href} className={getLinkClass(href)} title={isCollapsed ? label : undefined} aria-current={isActive(href) ? 'page' : undefined}>
      <Icon size={20} aria-hidden="true" />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );

  const isActive = (path) => (path === '/' ? pathname === '/' : pathname.startsWith(path));

  const getLinkClass = (path) => {
    const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer mb-1 relative group
      ${isActive ? 'bg-[#e8f0fe] text-[#2f7cf6]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
      ${isCollapsed ? 'justify-center' : ''}
    `;
  };

  return (
    <>
    {/* Mobile / tablet: hamburger + dimmed backdrop; sidebar slides in as a drawer */}
    <button
      onClick={() => setMobileOpen(true)}
      aria-label="Open menu"
      className="fixed left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm backdrop-blur-xl lg:hidden"
    >
      <Menu size={20} aria-hidden="true" />
    </button>
    {mobileOpen && <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-[#0c1f4b]/30 backdrop-blur-sm lg:hidden" aria-hidden="true" />}
    <aside
      aria-label="Main navigation"
      className={`bg-white/90 backdrop-blur-xl border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64
        ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} lg:translate-x-0 lg:shadow-none
      `}
    >
      {mobileOpen && (
        <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden">
          <X size={18} aria-hidden="true" />
        </button>
      )}
      {/* --- LOGO HEADER --- */}
      <div className={`h-16 flex items-center border-b border-slate-200 ${isCollapsed ? 'justify-center px-0' : 'px-5 gap-3'}`}>
         <img src="/bizzapps-symbol.svg" alt="BizzApps" className="h-8 w-auto shrink-0" />
         {!isCollapsed && (
             <div className="leading-tight">
               <p className="text-[15px] font-semibold tracking-tight text-[#0c1f4b]">Production</p>
               <p className="text-[11px] text-slate-500">by BizzApps</p>
             </div>
         )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
        
        {!isCollapsed && <div className="pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider animate-in fade-in">Workspace</div>}

        {role === 'management' ? (
            <NavItem href="/travel" icon={Plane} label="Travel Manifest" />
        ) : (
        <>
        {(role === 'admin' || role === 'operation') && (
            <NavItem href="/" icon={LayoutDashboard} label="Overview" />
        )}

        <NavItem href="/orders" icon={List} label="Orders List" />

        <NavItem href="/seapod-production" icon={Factory} label="Seapod Production" />

        {(role === 'admin' || role === 'operation') && (
            <NavItem href="/admin/addresses" icon={MapPin} label="Addresses" />
        )}

        {isAdmin && (
            <NavItem href="/travel" icon={Plane} label="Travel Manifest" />
        )}
        </>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className={`pt-6 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
               {isCollapsed ? '---' : 'Admin Controls'}
            </div>

            <NavItem href="/admin/items" icon={Tag} label="Master Items" />
            <NavItem href="/admin/kits" icon={Package} label="Manage Kits" />
            <NavItem href="/admin/seapod-templates" icon={Cpu} label="Seapod Templates" />
            <NavItem href="/admin/users" icon={Users} label="User Management" />
          </>
        )}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 pb-4 hidden lg:block">
        <button 
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
      <div className={`p-4 border-t border-slate-200 bg-slate-50/70 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
           <div className="w-8 h-8 rounded-full bg-[#2f7cf6]/20 text-[#2f7cf6] flex items-center justify-center font-bold text-xs border border-[#2f7cf6]/10 shrink-0">
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
    </>
  );
}