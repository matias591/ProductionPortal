'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, UserPlus, Shield, User } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Form State
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

    // Check Profile Role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role !== 'admin') {
      alert("Access Denied: Admins only.");
      router.push('/');
    } else {
      setIsAdmin(true);
    }
  }

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreating(true);

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      body: JSON.stringify({ email: newUserEmail, password: newUserPassword, role: newUserRole }),
    });

    const json = await res.json();
    if (json.error) {
      alert(json.error);
    } else {
      alert("User Created!");
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
    }
    setCreating(false);
  }

  async function deleteUser(id) {
    if(!confirm("Are you sure? This cannot be undone.")) return;
    // Note: Deleting users requires Service Role client-side or another API route. 
    // For this POC, we will just remove them from the profile list view locally or you need an API delete route.
    alert("To fully delete a user, please use the Supabase Dashboard for security.");
  }

  if (!isAdmin) return <div className="p-10">Checking permissions...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
       <button onClick={() => router.push('/')} className="text-xs font-bold text-slate-500 hover:text-black mb-6 flex items-center gap-2">
          <ArrowLeft size={14} /> Back to Dashboard
       </button>

       <div className="max-w-4xl mx-auto">
         <h1 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-2">
            <Shield className="text-blue-600"/> User Management
         </h1>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create User Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
               <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><UserPlus size={18}/> Create New User</h3>
               <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                    <input type="email" required className="w-full border border-slate-200 rounded px-3 py-2 text-sm" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                    <input type="password" required className="w-full border border-slate-200 rounded px-3 py-2 text-sm" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Role</label>
                    <select className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                        <option value="vendor">Vendor</option>
                        <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button type="submit" disabled={creating} className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition-colors">
                     {creating ? 'Creating...' : 'Create User'}
                  </button>
               </form>
            </div>

            {/* User List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 font-bold text-sm text-slate-600">
                  Current Users ({users.length})
               </div>
               <div className="divide-y divide-slate-100">
                  {users.map(u => (
                      <div key={u.id} className="px-6 py-4 flex justify-between items-center">
                          <div>
                             <div className="font-bold text-sm text-slate-800">{u.email}</div>
                             <div className={`text-xs inline-block px-2 py-0.5 rounded mt-1 font-medium capitalize
                                ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                {u.role}
                             </div>
                          </div>
                      </div>
                  ))}
               </div>
            </div>
         </div>
       </div>
    </div>
  );
}