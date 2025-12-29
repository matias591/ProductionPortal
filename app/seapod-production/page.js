'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Search, Cpu, ChevronRight, Download, Trash2, Box } from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from '../components/Sidebar';

export default function SeapodList() {
  const [seapods, setSeapods] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); // Permission State
  
  const router = useRouter();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => { 
    checkUser();
    fetchSeapods(); 
    fetchTemplates(); 
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
       if (profile?.role === 'admin') setIsAdmin(true);
    }
  }

  async function fetchSeapods() {
    const { data } = await supabase.from('seapod_production').select('*').order('created_at', { ascending: false });
    setSeapods(data || []);
  }
  
  async function fetchTemplates() {
    const { data } = await supabase.from('seapod_templates').select('*');
    setTemplates(data || []);
  }

  function exportList() {
    const dataToExport = seapods.map(s => ({
        "Serial": s.serial_number,
        "Template": s.template_name,
        "Status": s.status,
        "HW Ver": s.hw_version,
        "SW Ver": s.sw_version,
        "Seapod Ver": s.seapod_version,
        "Order #": s.order_number || '-'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Seapod List");
    XLSX.writeFile(workbook, "Seapod_Production_List.xlsx");
  }

  async function handleCreate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const templateId = formData.get('template');
    const serialNumber = formData.get('serial');

    const tpl = templates.find(t => t.id === templateId);
    if(!tpl) return;

    // 1. Create Header
    const { data: newSeapod, error } = await supabase.from('seapod_production').insert([{
        serial_number: serialNumber,
        template_name: tpl.name,
        seapod_version: tpl.seapod_version,
        hw_version: tpl.hw_version,
        sw_version: tpl.sw_version,
        status: 'In Progress'
    }]).select().single();

    if (error) { alert("Error: " + error.message); return; }

    // 2. Copy Items
    const { data: tItems } = await supabase.from('seapod_template_items').select('*').eq('template_id', templateId);
    if (tItems) {
        const itemsToInsert = tItems.map(i => ({
            seapod_id: newSeapod.id,
            piece: i.piece,
            item_id: i.item_id,
            quantity: i.quantity,
            sort_order: i.sort_order
        }));
        await supabase.from('seapod_items').insert(itemsToInsert);
    }

    setShowModal(false);
    router.push(`/seapod-production/${newSeapod.id}`);
  }

  // --- DELETE LOGIC (Admin Only) ---
  async function handleDelete(e, id) {
    e.stopPropagation();
    if(!confirm("Are you sure you want to delete this Seapod record?")) return;
    
    const { error } = await supabase.from('seapod_production').delete().eq('id', id);
    if(error) alert("Delete failed: " + error.message);
    else fetchSeapods();
  }

  const filtered = seapods.filter(s => s.serial_number.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Seapod Production</h1>
            <div className="flex gap-2">
                <button onClick={exportList} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50"><Download size={16}/> Export List</button>
                <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-[#0176D3] text-white rounded font-bold shadow flex items-center gap-2"><Plus size={16}/> Start Build</button>
            </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 text-slate-400" size={18}/><input className="w-full pl-10 pr-4 py-2 border rounded outline-none focus:border-[#0176D3]" placeholder="Search Serial Number..." onChange={e => setSearchTerm(e.target.value)} /></div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <tr>
                        <th className="px-6 py-4">Seapod Serial</th>
                        <th className="px-6 py-4">Template</th>
                        <th className="px-6 py-4">Versions</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filtered.map(s => (
                        <tr key={s.id} onClick={() => router.push(`/seapod-production/${s.id}`)} className="hover:bg-blue-50 cursor-pointer group">
                            <td className="px-6 py-4 font-bold text-[#0176D3]">{s.serial_number}</td>
                            <td className="px-6 py-4 text-sm">{s.template_name}</td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                                <div>Ver: {s.seapod_version || '-'}</div>
                                <div className="text-[10px]">HW: {s.hw_version} | SW: {s.sw_version}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col items-start gap-1.5">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border 
                                        ${s.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' : 
                                        s.status === 'Assigned to Order' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                        'bg-slate-100 text-slate-600'}`}>
                                        {s.status}
                                    </span>
                                    {/* --- SHOW ORDER # IF ASSIGNED --- */}
                                    {s.order_number && (
                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                            <Box size={10} /> Order #{s.order_number}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                <ChevronRight className="text-slate-400" size={18}/>
                                {isAdmin && (
                                    <button onClick={(e) => handleDelete(e, s.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16}/>
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <h3 className="font-bold text-lg mb-4 text-slate-800">Start Seapod Build</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seapod Serial #</label><input name="serial" className="w-full border rounded p-2 outline-none focus:border-[#0176D3]" required placeholder="e.g. SP-29291" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Template</label><select name="template" className="w-full border rounded p-2 bg-white" required>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded font-bold text-slate-600">Cancel</button><button type="submit" className="px-4 py-2 bg-[#0176D3] text-white rounded font-bold">Create</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}