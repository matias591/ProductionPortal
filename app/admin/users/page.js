'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Trash2, UserPlus, Shield, User, CheckCircle, AlertCircle, X, AlertTriangle, Mail } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  // NEW FORM STATE (No Password)
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('vendor');
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState(null);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => { checkPermission(); fetchUsers(); }, []);

  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  async function checkPermission() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role !== 'admin') { alert("Access Denied"); router.push('/'); } else { setIsAdmin(true); }
  }

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function handleInviteUser(e) {
    e.preventDefault();
    setProcessing(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call the updated API (No password sent)
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: newUserEmail, role: newUserRole }),
    });

    const json = await res.json();
    if (json.error) showToast('error', json.error);
    else { 
        showToast('success', 'Invitation sent successfully!'); 
        setNewUserEmail(''); 
        setShowCreateModal(false); 
        fetchUsers(); 
    }
    setProcessing(false);
  }

  function confirmDelete(user) { setUserToDelete(user); setShowDeleteModal(true); }

  async function executeDelete() {
    if (!userToDelete) return;
    setProcessing(true);
    const res = await fetch('/api/admin/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: userToDelete.id }) });
    const json = await res.json();
    if (json.error) showToast('error', json.error);
    else { showToast('success', 'User removed'); setShowDeleteModal(false); setUserToDelete(null); fetchUsers(); }
    setProcessing(false);
  }

  if (!isAdmin) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><div className="ml-64 p-10 text-slate-500">Checking permissions...</div></div>;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
       <Sidebar />
       <main className="flex-1 ml-64 p-8 relative">
         <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div><h1 className="text-2xl font-bold text-slate-800 mb-1 flex items-center gap-2"><Shield className="text-[#0176D3]"/> User Management</h1><p className="text-slate-500 text-sm">Manage system access and roles.</p></div>
                <button onClick={() => setShowCreateModal(true)} className="bg-[#0176D3] text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-all"><UserPlus size={18}/> Invite New User</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase"><div className="col-span-5">Email</div><div className="col-span-3">Role</div><div className="col-span-3">Created</div><div className="col-span-1 text-right">Action</div></div>
                <div className="divide-y divide-slate-100">
                    {users.map(u => (
                        <div key={u.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 transition-colors group">
                            <div className="col-span-5 font-bold text-sm text-slate-800 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User size={16}/></div>{u.email}</div>
                            <div className="col-span-3"><span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'operation' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{u.role}</span></div>
                            <div className="col-span-3 text-sm text-slate-500">{new Date(u.created_at).toLocaleDateString()}</div>
                            <div className="col-span-1 text-right"><button onClick={() => confirmDelete(u)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded transition-all opacity-0 group-hover:opacity-100" title="Delete User"><Trash2 size={16} /></button></div>
                        </div>
                    ))}
                </div>
            </div>
         </div>
         {showCreateModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-slate-800">Invite User</h3><button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button></div>
                    <form onSubmit={handleInviteUser} className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 mb-4">User will receive an email to set their own password.</div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label><input type="email" required className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} /></div>
                        {/* PASSWORD INPUT REMOVED */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                            <select className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white focus:border-[#0176D3] outline-none" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                                <option value="vendor">Vendor</option>
                                <option value="operation">Operation</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="pt-4 flex gap-3"><button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 border border-slate-300 rounded text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" disabled={processing} className="flex-1 py-2 bg-[#0176D3] text-white rounded text-sm font-bold hover:bg-blue-700 shadow-sm flex justify-center items-center gap-2"><Mail size={16}/> {processing ? 'Sending...' : 'Send Invitation'}</button></div>
                    </form>
                </div>
            </div>
         )}
         {/* Delete Modal is same as before */}
         {showDeleteModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200 border border-slate-200">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
                        <h3 className="text-lg font-bold text-slate-900">Remove User?</h3>
                        <p className="text-sm text-slate-500 mt-2 mb-6">Are you sure you want to delete <span className="font-bold text-slate-800">{userToDelete?.email}</span>? This action cannot be undone.</p>
                        <div className="flex gap-3 w-full"><button onClick={() => setShowDeleteModal(false)} disabled={processing} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button onClick={executeDelete} disabled={processing} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-sm">{processing ? 'Deleting...' : 'Delete User'}</button></div>
                    </div>
                </div>
            </div>
         )}
         {notification && (<div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-50 ${notification.type === 'success' ? 'bg-white border-green-200 text-green-800' : 'bg-white border-red-200 text-red-800'}`}>{notification.type === 'success' ? <CheckCircle size={20} className="text-green-500"/> : <AlertCircle size={20} className="text-red-500"/>}<span className="text-sm font-bold">{notification.message}</span></div>)}
       </main>
    </div>
  );
}