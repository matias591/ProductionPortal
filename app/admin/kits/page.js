'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Package, Trash2, ChevronRight } from 'lucide-react';
import Sidebar from '../../components/Sidebar'; // Note: ../../ because we are 2 levels deep

export default function KitManagement() {
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    fetchKits();
  }, []);

  async function fetchKits() {
    const { data } = await supabase.from('kits').select('*').order('created_at', { ascending: false });
    setKits(data || []);
    setLoading(false);
  }

  async function handleCreateKit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const { error } = await supabase.from('kits').insert([{ name }]);
    if (error) alert(error.message);
    else { setShowModal(false); fetchKits(); }
  }

  async function deleteKit(id) {
    if(!confirm("Delete this kit?")) return;
    await supabase.from('kits').delete().eq('id', id);
    fetchKits();
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
       <Sidebar />
       <main className="flex-1 ml-64 p-8">
         <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        Kit Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage presets for faster order creation.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-[#0176D3] text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-blue-700">
                    <Plus size={16}/> Create New Kit
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                        <tr>
                            <th className="px-6 py-4">Kit Name</th>
                            <th className="px-6 py-4">Created</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {kits.map(kit => (
                            <tr key={kit.id} onClick={() => router.push(`/admin/kits/${kit.id}`)} className="group hover:bg-blue-50 cursor-pointer transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-blue-100 text-[#0176D3] flex items-center justify-center"><Package size={16}/></div>
                                    {kit.name}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">{new Date(kit.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right flex justify-end items-center gap-4">
                                    <span className="text-xs font-bold text-[#0176D3] flex items-center gap-1 group-hover:underline">Edit Items <ChevronRight size={14}/></span>
                                    <button onClick={(e) => { e.stopPropagation(); deleteKit(kit.id); }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
         </div>
       </main>

       {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-800">New Kit Preset</h3>
                <form onSubmit={handleCreateKit}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kit Name</label>
                    <input name="name" autoFocus className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3]" placeholder="e.g. Standard Seapod System" required />
                    <div className="mt-6 flex justify-end gap-2">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#0176D3] hover:bg-blue-700 rounded">Create</button>
                    </div>
                </form>
            </div>
        </div>
       )}
    </div>
  );
}