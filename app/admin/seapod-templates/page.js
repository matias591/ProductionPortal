'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Cpu, ChevronRight } from 'lucide-react';
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
    const formData = new FormData(e.target);
    const newTemplate = {
        name: formData.get('name'),
        hw_version: formData.get('hw'), // Save HW
        sw_version: formData.get('sw')  // Save SW
    };

    const { error } = await supabase.from('seapod_templates').insert([newTemplate]);
    if(error) alert(error.message);
    else {
        setShowModal(false);
        fetchTemplates();
    }
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
                            <div>
                                <div className="font-bold text-slate-700">{t.name}</div>
                                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                                    <span className="bg-slate-100 px-1.5 rounded border">HW: {t.hw_version || 'N/A'}</span>
                                    <span className="bg-slate-100 px-1.5 rounded border">SW: {t.sw_version || 'N/A'}</span>
                                </div>
                            </div>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-800">New Seapod Recipe</h3>
                <form onSubmit={createTemplate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Template Name</label>
                        <input name="name" className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-[#0176D3]" placeholder="e.g. Standard Seapod V3" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">HW Version</label>
                            <input name="hw" className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-[#0176D3]" placeholder="v1.0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SW Version</label>
                            <input name="sw" className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-[#0176D3]" placeholder="v2.4.1" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#0176D3] text-white rounded font-bold hover:bg-blue-700">Create</button>
                    </div>
                </form>
            </div>
        </div>
       )}
    </div>
  );
}