'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Trash2, Pencil, X } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

export default function AddressManagement() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [form, setForm] = useState({ company_name: '', address: '', phone: '', email: '', pic: '' });
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    checkUser();
    fetchAddresses();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (!['admin', 'operation'].includes(profile?.role)) {
      alert('Access Denied');
      router.push('/');
    }
  }

  async function fetchAddresses() {
    const { data } = await supabase.from('addresses').select('*').order('company_name');
    setAddresses(data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditingAddress(null);
    setForm({ company_name: '', address: '', phone: '', email: '', pic: '' });
    setShowModal(true);
  }

  function openEdit(addr) {
    setEditingAddress(addr);
    setForm({ company_name: addr.company_name, address: addr.address, phone: addr.phone || '', email: addr.email || '', pic: addr.pic || '' });
    setShowModal(true);
  }

  async function saveAddress() {
    if (!form.company_name || !form.address) { alert('Company name and address are required.'); return; }
    if (editingAddress) {
      const { data, error } = await supabase.from('addresses').update(form).eq('id', editingAddress.id).select().single();
      if (error) { alert(error.message); return; }
      setAddresses(prev => prev.map(a => a.id === editingAddress.id ? data : a));
    } else {
      const { data, error } = await supabase.from('addresses').insert([form]).select().single();
      if (error) { alert(error.message); return; }
      setAddresses(prev => [...prev, data].sort((a, b) => a.company_name.localeCompare(b.company_name)));
    }
    setShowModal(false);
  }

  async function deleteAddress(id) {
    if (!confirm('Delete this address?')) return;
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setAddresses(prev => prev.filter(a => a.id !== id));
  }

  if (loading) return (
    <div className="flex min-h-screen bg-[#F3F4F6]">
      <Sidebar />
      <div className="ml-64 p-10 text-slate-500">Loading...</div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <div className="flex-1 ml-64">

        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Receiver Addresses</h1>
                <p className="text-xs text-slate-500">Manage addresses used in commercial invoices</p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[#0176D3] text-white font-bold px-4 py-2 rounded-lg text-sm shadow-sm hover:bg-blue-700"
            >
              <Plus size={16} /> New Address
            </button>
          </div>
        </div>

        {/* TABLE */}
        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            {addresses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm italic">No addresses yet. Create one.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Company</th>
                    <th className="px-5 py-3">Address</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">PIC</th>
                    <th className="px-5 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {addresses.map(addr => (
                    <tr key={addr.id} className="hover:bg-slate-50 group">
                      <td className="px-5 py-3 text-sm font-semibold text-slate-900">{addr.company_name}</td>
                      <td className="px-5 py-3 text-sm text-slate-600 max-w-xs whitespace-pre-wrap">{addr.address}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{addr.phone || '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{addr.email || '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{addr.pic || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(addr)} className="text-slate-400 hover:text-[#0176D3]"><Pencil size={15} /></button>
                          <button onClick={() => deleteAddress(addr.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">{editingAddress ? 'Edit Address' : 'New Address'}</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-3">
                <input
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none"
                  placeholder="Company name *"
                  value={form.company_name}
                  onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                />
                <textarea
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none resize-none"
                  placeholder="Address *"
                  rows={3}
                  value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                />
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase w-14 shrink-0">Phone</span>
                  <input
                    className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none"
                    placeholder="+1 234 567 8900"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase w-14 shrink-0">Email</span>
                  <input
                    className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none"
                    placeholder="contact@company.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase w-14 shrink-0">PIC</span>
                  <input
                    className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none"
                    placeholder="Point of contact name"
                    value={form.pic}
                    onChange={e => setForm(p => ({ ...p, pic: e.target.value }))}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={saveAddress} className="flex-1 px-4 py-2.5 bg-[#0176D3] text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
