'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Search, Cpu, ChevronRight, AlertTriangle } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function SeapodList() {
  const [seapods, setSeapods] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ACKNOWLEDGEMENT STATES
  const [showAck, setShowAck] = useState(false);
  const [pendingData, setPendingData] = useState(null); // Holds form data while waiting for ack
  const [selectedTemplateDetails, setSelectedTemplateDetails] = useState(null);

  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => { fetchSeapods(); fetchTemplates(); }, []);

  async function fetchSeapods() {
    const { data } = await supabase.from('seapod_production').select('*').order('created_at', { ascending: false });
    setSeapods(data || []);
  }
  
  async function fetchTemplates() {
    const { data } = await supabase.from('seapod_templates').select('*');
    setTemplates(data || []);
  }

  // Step 1: Capture form data and show Ack Modal
  function handlePreCreate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const templateId = formData.get('template');
    const serialNumber = formData.get('serial');

    const tpl = templates.find(t => t.id === templateId);
    if(!tpl) return;

    setPendingData({ templateId, serialNumber });
    setSelectedTemplateDetails(tpl);
    setShowModal(false); // Hide input form
    setShowAck(true);    // Show Ack form
  }

  // Step 2: Actually Create & REDIRECT
  async function handleFinalCreate() {
    const { templateId, serialNumber } = pendingData;
    const tpl = selectedTemplateDetails;

    // 1. Create Header (Including Versions)
    const { data: newSeapod, error } = await supabase.from('seapod_production').insert([{
        serial_number: serialNumber,
        template_name: tpl.name,
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

    setShowAck(false);
    
    // --- FIX: Redirect to the new record instead of staying on list ---
    router.push(`/seapod-production/${newSeapod.id}`);
  }

  const filtered = seapods.filter(s => s.serial_number.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Seapod Production</h1>
            <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-[#0176D3] text-white rounded font-bold shadow flex items-center gap-2">
                <Plus size={16}/> Start Build
            </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                <input className="w-full pl-10 pr-4 py-2 border rounded outline-none focus:border-[#0176D3]" placeholder="Search Serial Number..." onChange={e => setSearchTerm(e.target.value)} />
            </div>
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
                        <tr key={s.id} onClick={() => router.push(`/seapod-production/${s.id}`)} className="hover:bg-blue-50 cursor-pointer">
                            <td className="px-6 py-4 font-bold text-[#0176D3]">{s.serial_number}</td>
                            <td className="px-6 py-4 text-sm">{s.template_name}</td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                                <div>HW: {s.hw_version || '-'}</div>
                                <div>SW: {s.sw_version || '-'}</div>
                            </td>
                            <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold border">{s.status}</span></td>
                            <td className="px-6 py-4 text-right"><ChevronRight className="ml-auto text-slate-400" size={18}/></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </main>

      {/* INPUT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <h3 className="font-bold text-lg mb-4 text-slate-800">Start Seapod Build</h3>
                <form onSubmit={handlePreCreate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seapod Serial #</label>
                        <input name="serial" className="w-full border border-slate-300 rounded p-2 outline-none focus:border-[#0176D3]" required placeholder="e.g. SP-29291" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Template</label>
                        <select name="template" className="w-full border border-slate-300 rounded p-2 bg-white" required>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#0176D3] text-white rounded font-bold hover:bg-blue-700">Next</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* ACKNOWLEDGEMENT MODAL */}
      {showAck && selectedTemplateDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center border-t-4 border-[#0176D3]">
                <div className="w-16 h-16 bg-blue-50 text-[#0176D3] rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32}/>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Build Verification</h2>
                <p className="text-slate-500 text-sm mb-6">
                    You are starting a build for Seapod <strong>{pendingData.serialNumber}</strong>.
                    Please confirm the installed versions match the template.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-left">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Hardware Version</span>
                            <span className="text-lg font-bold text-slate-800">{selectedTemplateDetails.hw_version || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Software Version</span>
                            <span className="text-lg font-bold text-slate-800">{selectedTemplateDetails.sw_version || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setShowAck(false)} className="flex-1 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button onClick={handleFinalCreate} className="flex-1 py-3 bg-[#0176D3] text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg">Confirm & Build</button>
                </div>
                <p className="text-xs text-slate-400 mt-4">By confirming, you acknowledge the Seapod contains these versions.</p>
            </div>
        </div>
      )}
    </div>
  );
}