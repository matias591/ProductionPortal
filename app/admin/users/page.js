'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Trash2, UserPlus, Shield } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('vendor');
  const [creating, setCreating] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    checkPermission();
    fetchUsers();
  }, []);

  async function checkPermission() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role !== 'admin') { alert("Access Denied"); router.push('/'); } 
    else setIsAdmin(true);
  }

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: newUserEmail, password: newUserPassword, role: newUserRole }),
    });
    const json = await res.json();
    if (json.error) alert("Error: " + json.error);
    else { alert("User Created!"); setNewUserEmail(''); setNewUserPassword(''); fetchUsers(); }
    setCreating(false);
  }

  if (!isAdmin) return <div className="p-10 text-slate-500">Checking permissions...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
       <Sidebar />
       <main className="flex-1 ml-64 p-8">
         <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-1">User Management</h1>
            <p className="text-slate-500 text-sm mb-8">Manage system access and roles.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form */}
                <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                   <h3 className="font-bold text-sm text-slate-700 mb-4 uppercase tracking-wide flex items-center gap-2"><UserPlus size={16}/> Add New User</h3>
                   <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                        <input type="email" required className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                        <input type="password" required className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Role</label>
                        <select className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white focus:border-[#0176D3] outline-none" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                            <option value="vendor">Vendor</option>
                            <option value="admin">Admin</option>
                        </select>
                      </div>
                      <button type="submit" disabled={creating} className="w-full bg-[#0176D3] text-white font-bold py-2 rounded hover:bg-blue-700 transition-colors shadow-sm text-sm">
                         {creating ? 'Creating...' : 'Create User'}
                      </button>
                   </form>
                </div>

                {/* List */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 font-bold text-xs text-slate-500 uppercase">
                      System Users ({users.length})
                   </div>
                   <div className="divide-y divide-slate-100">
                      {users.map(u => (
                          <div key={u.id} className="px-6 py-4 flex justify-between items-center group hover:bg-slate-50">
                              <div>
                                 <div className="font-bold text-sm text-slate-800">{u.email}</div>
                                 <div className={`text-[10px] inline-block px-2 py-0.5 rounded mt-1 font-bold uppercase tracking-wider
                                    ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {u.role}
                                 </div>
                              </div>
                          </div>
                      ))}
                   </div>
                </div>
            </div>
         </div>
       </main>
    </div>
  );
}