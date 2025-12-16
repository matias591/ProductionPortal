'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Cpu, ChevronRight, Save } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

export default function SeapodTemplates() {
  const [templates, setTemplates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    const { data } = await supabase.from('seapod_templates').select('*').order('created_at', { ascending: false });
    setTemplates(data || []);
  }

  async function createTemplate(e) {
    e.preventDefault();
    const name = new FormData(e.target).get('name');
    await supabase.from('seapod_templates').insert([{ name }]);
    setShowModal(false);
    fetchTemplates();
  }

  async function deleteTemplate(id) {
    if(confirm("Delete this template?")) {
      await supabase.from('seapod_templates').delete().eq('id', id);
      fetchTemplates();
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
       <Sidebar />
       <main className="flex-1 ml-64 p-8">
         <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Cpu className="text-[#0176D3]"/> Seapod Templates
                </h1>
                <button onClick={() => setShowModal(true)} className="bg-[#0176D3] text-white px-4 py-2 rounded font-bold shadow-sm flex items-center gap-2">
                    <Plus size={16}/> New Template
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {templates.map(t => (
                        <div key={t.id} onClick={() => router.push(`/admin/seapod-templates/${t.id}`)} className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer group">
                            <span className="font-bold text-slate-700">{t.name}</span>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-[#0176D3] flex items-center gap-1 group-hover:underline">Edit Items <ChevronRight size={14}/></span>
                                <button onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
         </div>
       </main>
       {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h3 className="font-bold text-lg mb-4">New Seapod Recipe</h3>
                <form onSubmit={createTemplate}>
                    <input name="name" className="w-full border p-2 rounded mb-4 outline-none focus:border-[#0176D3]" placeholder="e.g. Standard Seapod V3" required autoFocus/>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 font-bold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#0176D3] text-white rounded font-bold">Create</button>
                    </div>
                </form>
            </div>
        </div>
       )}
    </div>
  );
}