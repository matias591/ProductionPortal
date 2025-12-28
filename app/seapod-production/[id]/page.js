'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Cpu, CheckCircle2, Circle, Upload, Paperclip, FileText, Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from '../../components/Sidebar';

export default function SeapodBuildDetails({ params }) {
  const router = useRouter();
  const [seapodId, setSeapodId] = useState(null);

  const [seapod, setSeapod] = useState(null);
  const [items, setItems] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [showAck, setShowAck] = useState(false);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => { Promise.resolve(params).then((res) => setSeapodId(res.id)); }, [params]);
  useEffect(() => { if (seapodId) fetchData(); }, [seapodId]);

  async function fetchData() {
    const { data: s } = await supabase.from('seapod_production').select('*').eq('id', seapodId).single();
    const { data: i } = await supabase.from('seapod_items').select('*').eq('seapod_id', seapodId).order('sort_order', { ascending: true });
    const { data: f } = await supabase.from('seapod_files').select('*').eq('seapod_id', seapodId).order('created_at', { ascending: false });
    
    setSeapod(s);
    setItems(i || []);
    setFiles(f || []);
    setLoading(false);
  }

  async function handleStatusChange(newStatus) {
    if (newStatus === 'Completed') {
        const missing = items.some(i => !i.serial || i.serial.trim() === '');
        if (missing) { alert("⚠️ Cannot complete: All Item Serial Numbers must be filled."); return; }
        setShowAck(true);
    } else {
        setSeapod(prev => ({ ...prev, status: newStatus }));
        await supabase.from('seapod_production').update({ status: newStatus }).eq('id', seapodId);
    }
  }

  // --- UPDATED COMPLETION LOGIC ---
  async function confirmCompletion() {
    setShowAck(false);
    const now = new Date().toISOString();
    setSeapod(prev => ({ ...prev, status: 'Completed' }));
    
    await supabase.from('seapod_production').update({ 
        status: 'Completed',
        completed_at: now // <--- SAVE DATE
    }).eq('id', seapodId);
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

  async function handleFileUpload(e) {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${seapodId}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('seapod-attachments').upload(filePath, file);
    if (uploadError) { alert(uploadError.message); setUploading(false); return; }
    const { data: fileRecord } = await supabase.from('seapod_files').insert([{ seapod_id: seapodId, file_name: file.name, file_path: filePath, uploaded_by: 'User' }]).select().single();
    if (fileRecord) setFiles([fileRecord, ...files]);
    setUploading(false);
  }

  function openFile(path) {
    const { data } = supabase.storage.from('seapod-attachments').getPublicUrl(path);
    window.open(data.publicUrl, '_blank');
  }

  function exportExcel() {
    const data = items.map(i => ({ "Component": i.piece, "Qty": i.quantity, "Serial": i.serial }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Checklist");
    XLSX.writeFile(wb, `Seapod_${seapod.serial_number}.xlsx`);
  }

  if (loading) return <div className="flex min-h-screen bg-[#F3F4F6]"><Sidebar /><div className="ml-64 p-10 text-slate-500">Loading...</div></div>;

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 ml-64">
        
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
                            <div className="flex gap-2 mt-2">
                                <span className="bg-[#0176D3]/10 text-[#0176D3] border border-[#0176D3]/20 px-2 py-0.5 rounded text-xs font-bold">{seapod.seapod_version || 'No Gen Ver'}</span>
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-xs font-medium">HW: {seapod.hw_version}</span>
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-xs font-medium">SW: {seapod.sw_version}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-end flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                        <select 
                            value={seapod.status} 
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="bg-white border border-slate-300 rounded px-3 py-2 text-sm font-bold focus:border-[#0176D3] outline-none"
                        >
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option disabled>Assigned to Order</option>
                        </select>
                        <button onClick={exportExcel} className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-[#0176D3]"><Download size={12}/> Export Details</button>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-8 max-w-5xl mx-auto grid grid-cols-3 gap-8">
            <div className="col-span-1">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2"><Paperclip size={14}/> Files ({files.length})</h3>
                        <label className="cursor-pointer text-xs font-bold text-[#0176D3] hover:underline flex items-center gap-1">{uploading ? '...' : '+ Upload'}<input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} /></label>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {files.map(file => (
                            <div key={file.id} onClick={() => openFile(file.file_path)} className="px-5 py-3 flex items-center gap-3 hover:bg-blue-50 cursor-pointer transition-colors group">
                                <div className="bg-blue-100 p-1.5 rounded text-blue-600"><FileText size={16}/></div>
                                <div className="overflow-hidden"><p className="text-sm font-medium text-slate-700 truncate group-hover:text-[#0176D3] group-hover:underline">{file.file_name}</p><p className="text-[10px] text-slate-400">By {file.uploaded_by}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="col-span-2">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-sm text-slate-700 uppercase">Components Checklist</h3>
                        <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">{items.length} Items</span>
                    </div>
                    <table className="w-full text-left">
                        <thead className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200"><tr><th className="px-6 py-3 w-16 text-center">Done</th><th className="px-6 py-3">Component</th><th className="px-6 py-3 w-24">Qty</th><th className="px-6 py-3 w-48">Serial Number</th><th className="w-12"></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map(item => (
                                <tr key={item.id} className="group hover:bg-slate-50">
                                    <td className="px-6 py-3 text-center"><button onClick={() => updateItem(item.id, 'is_done', !item.is_done)} className={item.is_done ? "text-green-600" : "text-slate-300 hover:text-slate-400"}>{item.is_done ? <CheckCircle2 size={20}/> : <Circle size={20}/>}</button></td>
                                    <td className="px-6 py-3 text-sm font-medium text-slate-700">{item.piece}</td>
                                    <td className="px-6 py-3 text-sm">{item.quantity}</td>
                                    <td className="px-6 py-3"><input className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:border-[#0176D3] outline-none text-[#0176D3] font-medium placeholder-slate-300" placeholder="Scan Serial" value={item.serial || ''} onChange={(e) => updateItem(item.id, 'serial', e.target.value)} /></td>
                                    <td className="px-4 py-3 text-right"><button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={addItem} className="w-full py-4 text-sm font-bold text-slate-500 hover:text-[#0176D3] border-t border-slate-200 flex items-center justify-center gap-2 transition-colors"><Plus size={16}/> Add Extra Component</button>
                </div>
            </div>
        </div>

        {/* ACKNOWLEDGEMENT MODAL */}
        {showAck && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center border-t-4 border-[#0176D3]">
                    <div className="w-16 h-16 bg-blue-50 text-[#0176D3] rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Build Verification</h2>
                    <p className="text-slate-500 text-sm mb-6">You are marking Seapod <strong>{seapod.serial_number}</strong> as Completed.</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-left">
                        
                        {/* SEAPOD VERSION */}
                        <div className="mb-4 pb-4 border-b border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Seapod Version</span>
                            <span className="text-lg font-bold text-[#0176D3]">{seapod.seapod_version || 'N/A'}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><span className="text-[10px] font-bold text-slate-400 uppercase block">Hardware Ver.</span><span className="text-lg font-bold text-slate-800">{seapod.hw_version || 'N/A'}</span></div>
                            <div><span className="text-[10px] font-bold text-slate-400 uppercase block">Software Ver.</span><span className="text-lg font-bold text-slate-800">{seapod.sw_version || 'N/A'}</span></div>
                        </div>
                    </div>
                    <div className="flex gap-3"><button onClick={() => setShowAck(false)} className="flex-1 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button onClick={confirmCompletion} className="flex-1 py-3 bg-[#0176D3] text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg">Confirm & Complete</button></div>
                    <p className="text-xs text-slate-400 mt-4">By confirming, you acknowledge the Seapod contains these versions.</p>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}