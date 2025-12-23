'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Cpu, CheckCircle2, Circle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

export default function SeapodBuildDetails({ params }) {
  const router = useRouter();
  const [seapodId, setSeapodId] = useState(null);

  const [seapod, setSeapod] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => { Promise.resolve(params).then((res) => setSeapodId(res.id)); }, [params]);
  useEffect(() => { if (seapodId) fetchData(); }, [seapodId]);

  async function fetchData() {
    const { data: s } = await supabase.from('seapod_production').select('*').eq('id', seapodId).single();
    const { data: i } = await supabase.from('seapod_items').select('*').eq('seapod_id', seapodId).order('sort_order', { ascending: true });
    
    setSeapod(s);
    setItems(i || []);
    setLoading(false);
  }

  async function updateHeader(field, value) {
    setSeapod({ ...seapod, [field]: value });
    await supabase.from('seapod_production').update({ [field]: value }).eq('id', seapodId);
  }

  async function updateItem(itemId, field, value) {
    const newItems = items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
    setItems(newItems);
    await supabase.from('seapod_items').update({ [field]: value }).eq('id', itemId);
  }

  async function deleteItem(itemId) {
    if(!confirm("Remove item?")) return;
    setItems(items.filter(i => i.id !== itemId));
    await supabase.from('seapod_items').delete().eq('id', itemId);
  }

  async function addItem() {
    const newItem = { seapod_id: seapodId, piece: 'New Component', quantity: 1, serial: '', is_done: false };
    const { data } = await supabase.from('seapod_items').insert([newItem]).select().single();
    if(data) setItems([...items, data]);
  }

  if (loading) return <div className="flex min-h-screen bg-[#F3F4F6]"><Sidebar /><div className="ml-64 p-10 text-slate-500">Loading...</div></div>;

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 ml-64">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
            <div className="px-8 py-4 max-w-5xl mx-auto">
                <button onClick={() => router.push('/seapod-production')} className="text-xs font-bold text-[#0176D3] hover:underline mb-2 flex items-center gap-1">
                    <ArrowLeft size={12}/> Back to List
                </button>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center border border-orange-200">
                            <Cpu size={28}/>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{seapod.serial_number}</h1>
                            <div className="text-sm text-slate-500 mt-1">
                                Template: <span className="font-medium text-slate-800">{seapod.template_name}</span>
                            </div>
                            
                            {/* VERSION BADGES */}
                            <div className="flex gap-2 mt-2">
                                <span className="bg-[#0176D3]/10 text-[#0176D3] border border-[#0176D3]/20 px-2 py-0.5 rounded text-xs font-bold">
                                    {seapod.seapod_version || 'No Gen Ver'}
                                </span>
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-xs font-medium">
                                    HW: {seapod.hw_version || 'N/A'}
                                </span>
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-xs font-medium">
                                    SW: {seapod.sw_version || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block text-right">Status</label>
                        <select 
                            value={seapod.status} 
                            onChange={(e) => updateHeader('status', e.target.value)}
                            className="bg-white border border-slate-300 rounded px-3 py-2 text-sm font-bold focus:border-[#0176D3] outline-none"
                        >
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>Failed / Scrapped</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* Content (Unchanged) */}
        <div className="p-8 max-w-5xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-slate-700 uppercase">Components Checklist</h3>
                    <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">{items.length} Items</span>
                </div>
                <table className="w-full text-left">
                    <thead className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200">
                        <tr><th className="px-6 py-3 w-16 text-center">Done</th><th className="px-6 py-3">Component</th><th className="px-6 py-3 w-24">Qty</th><th className="px-6 py-3 w-48">Serial Number</th><th className="w-12"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                            <tr key={item.id} className="group hover:bg-slate-50">
                                <td className="px-6 py-3 text-center">
                                    <button onClick={() => updateItem(item.id, 'is_done', !item.is_done)} className={item.is_done ? "text-green-600" : "text-slate-300 hover:text-slate-400"}>
                                        {item.is_done ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                                    </button>
                                </td>
                                <td className="px-6 py-3 text-sm font-medium text-slate-700">{item.piece}</td>
                                <td className="px-6 py-3 text-sm">{item.quantity}</td>
                                <td className="px-6 py-3">
                                    <input className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:border-[#0176D3] outline-none text-[#0176D3] font-medium placeholder-slate-300" placeholder="Scan / Enter Serial" value={item.serial || ''} onChange={(e) => updateItem(item.id, 'serial', e.target.value)} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button onClick={addItem} className="w-full py-4 text-sm font-bold text-slate-500 hover:text-[#0176D3] border-t border-slate-200 flex items-center justify-center gap-2 transition-colors"><Plus size={16}/> Add Extra Component</button>
            </div>
        </div>

      </main>
    </div>
  );
}