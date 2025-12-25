'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Box, Calendar, Ship, Upload, FileText, Paperclip, Lock, Download, Building2, Loader2, Warehouse, Cpu, Check, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from '../../components/Sidebar';

export default function OrderDetails({ params }) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(null);

  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [files, setFiles] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Role State
  const [role, setRole] = useState('vendor');
  const [canShip, setCanShip] = useState(false); // Admin or Operation
  const [isAdmin, setIsAdmin] = useState(false); // Strictly Admin

  const [uploading, setUploading] = useState(false);
  const [shipping, setShipping] = useState(false); 
  const [showShipModal, setShowShipModal] = useState(false);
  const [checkingVessel, setCheckingVessel] = useState(false);

  // SEAPOD WIZARD
  const [showSeapodModal, setShowSeapodModal] = useState(false);
  const [seapodStep, setSeapodStep] = useState(1);
  const [missingSeapodSerial, setMissingSeapodSerial] = useState('');
  const [seapodTemplates, setSeapodTemplates] = useState([]);
  const [selectedSeapodTemplate, setSelectedSeapodTemplate] = useState('');
  
  const [newSeapodItems, setNewSeapodItems] = useState([]);
  const [newSeapodId, setNewSeapodId] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null); 
  const [tplDetails, setTplDetails] = useState(null);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => { Promise.resolve(params).then((r) => setOrderId(r.id)); }, [params]);
  useEffect(() => { if (orderId) fetchData(); }, [orderId]);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
       setRole(profile?.role || 'vendor');
       if (profile?.role === 'admin') setIsAdmin(true);
       if (['admin', 'operation'].includes(profile?.role)) setCanShip(true);
    }

    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('sort_order', { ascending: true });
    const { data: fileData } = await supabase.from('order_files').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
    const { data: allItems } = await supabase.from('items').select('*').order('name');
    const { data: tpls } = await supabase.from('seapod_templates').select('*').order('name');
    
    setSeapodTemplates(tpls || []);
    if (tpls?.length > 0) setSelectedSeapodTemplate(tpls[0].id);

    setOrder(orderData);
    setItems(itemData || []);
    setFiles(fileData || []);
    setMasterItems(allItems || []);
    setLoading(false);
  }

  const isLocked = order?.status === 'Shipped' && !canShip;

  // --- LOGIC: LINK SEAPOD ON "IN BOX" ---
  async function updateOrder(field, value) {
    if (isLocked) return;

    // 1. IN BOX LOGIC
    if (field === 'status' && (value === 'In Box' || value === 'Ready for Pickup' || value === 'Shipped')) {
        const seapodItem = items.find(i => i.piece && i.piece.toLowerCase().includes('seapod'));
        
        if (seapodItem) {
            if (!seapodItem.serial || seapodItem.serial.trim() === '') {
                alert("⚠️ Seapod Item exists but has no Serial Number."); return;
            }

            // Check Seapod Status in DB
            const { data: existingSeapod } = await supabase
                .from('seapod_production')
                .select('id, status, order_number')
                .eq('serial_number', seapodItem.serial)
                .single();

            if (!existingSeapod) {
                // Not found -> Start Wizard
                setMissingSeapodSerial(seapodItem.serial);
                setPendingStatus(value);
                setSeapodStep(1); 
                setShowSeapodModal(true);
                return; 
            } else {
                // Found -> VALIDATE
                if (existingSeapod.status !== 'Completed') {
                    alert(`⚠️ Seapod ${seapodItem.serial} exists but status is '${existingSeapod.status}'. It must be 'Completed' first.`);
                    return;
                }
                if (existingSeapod.order_number && existingSeapod.order_number !== order.order_number) {
                    alert(`⚠️ Seapod ${seapodItem.serial} is already assigned to Order #${existingSeapod.order_number}.`);
                    return;
                }
                
                // VALID -> LINK IT
                await supabase.from('seapod_production').update({ 
                    order_number: order.order_number, 
                    status: 'Assigned to Order' 
                }).eq('id', existingSeapod.id);
            }
        }
    }

    // 2. SHIPPING LOGIC
    if (field === 'status' && value === 'Shipped') {
        if (!order.vessel || order.vessel === 'Unknown Vessel') { alert("Vessel Name required."); return; }
        setShowShipModal(true); return; 
    }

    setOrder({ ...order, [field]: value });
    await supabase.from('orders').update({ [field]: value }).eq('id', orderId);
  }

  // --- WIZARD LOGIC ---
  function goToAckStep() {
    // 1. Create Header
    const tpl = seapodTemplates.find(t => t.id === selectedSeapodTemplate);
    setTplDetails(tpl);
    
    // Create 'In Progress' record
    supabase.from('seapod_production').insert([{
        serial_number: missingSeapodSerial,
        template_name: tpl.name,
        seapod_version: tpl.seapod_version,
        hw_version: tpl.hw_version,
        sw_version: tpl.sw_version,
        status: 'In Progress'
    }]).select().single().then(({data, error}) => {
        if(error) { alert(error.message); return; }
        setNewSeapodId(data.id);
        
        // Copy Items
        supabase.from('seapod_template_items').select('*').eq('template_id', selectedSeapodTemplate).then(({data: tItems}) => {
            const itemsToInsert = tItems.map(i => ({ seapod_id: data.id, piece: i.piece, item_id: i.item_id, quantity: i.quantity, sort_order: i.sort_order }));
            supabase.from('seapod_items').insert(itemsToInsert).then(() => {
                // Fetch for editing
                supabase.from('seapod_items').select('*').eq('seapod_id', data.id).order('sort_order').then(({data: i}) => {
                    setNewSeapodItems(i);
                    setSeapodStep(2); // Go to Edit Items
                });
            });
        });
    });
  }

  async function updateSeapodItemSerial(itemId, newSerial) {
    setNewSeapodItems(prev => prev.map(i => i.id === itemId ? { ...i, serial: newSerial } : i));
    await supabase.from('seapod_items').update({ serial: newSerial }).eq('id', itemId);
  }

  // Clicked "Complete" in Wizard
  async function handleWizardComplete() {
    // 1. Validate All Items
    const missing = newSeapodItems.some(i => !i.serial || i.serial.trim() === '');
    if (missing) { alert("Please fill ALL serial numbers."); return; }

    // 2. Show Ack
    setSeapodStep(3); // Ack Step
  }

  async function finalWizardSubmit() {
    // 3. Mark Seapod Completed AND Assigned
    await supabase.from('seapod_production').update({ 
        status: 'Assigned to Order', // Skip straight to assigned
        order_number: order.order_number 
    }).eq('id', newSeapodId);

    setShowSeapodModal(false);
    
    // 4. Update Order Status
    if (pendingStatus) {
        setOrder(prev => ({ ...prev, status: pendingStatus }));
        await supabase.from('orders').update({ status: pendingStatus }).eq('id', orderId);
        setPendingStatus(null);
    }
  }

  // ... (Rest of component matches previous logic exactly, just ensure isAdmin is used for warehouse/price visibility) ...
  // To save space, I assume you have the rest of the render logic from the previous file. 
  // It is IDENTICAL to the previous file, just replace the imports and the functions above.
  
  // RENDER MODAL:
  // Step 1: Select Template (Start)
  // Step 2: Edit Items
  // Step 3: Acknowledgement
  
  // (Full render code omitted to fit response limit - use the previous file's render but update the Modal section below)

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <div className="flex-1 ml-64">
          {/* ... Header & Main ... */}
          {/* ... Ship Modal ... */}

          {/* SEAPOD WIZARD MODAL */}
          {showSeapodModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl border border-blue-100 h-[80vh] flex flex-col">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2"><Cpu size={24} /></div>
                        <h3 className="text-xl font-bold text-slate-900">
                            {seapodStep === 1 ? "Seapod Not Found" : seapodStep === 3 ? "Verify Versions" : `Build: ${missingSeapodSerial}`}
                        </h3>
                    </div>

                    {seapodStep === 1 && (
                        <div className="flex-1 flex flex-col justify-center">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-center">Select Template</label>
                            <select className="w-full max-w-sm mx-auto border border-slate-300 rounded px-3 py-2 text-sm font-medium" value={selectedSeapodTemplate} onChange={(e) => setSelectedSeapodTemplate(e.target.value)}>
                                {seapodTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <div className="mt-8 flex gap-3 max-w-sm mx-auto w-full">
                                <button onClick={() => setShowSeapodModal(false)} className="flex-1 px-4 py-2 border rounded font-bold text-slate-700">Cancel</button>
                                <button onClick={goToAckStep} className="flex-1 px-4 py-2 bg-[#0176D3] text-white rounded font-bold shadow">Start Build</button>
                            </div>
                        </div>
                    )}

                    {seapodStep === 2 && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-lg mb-6">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b sticky top-0"><tr><th className="px-4 py-2">Item</th><th className="px-4 py-2 w-20">Qty</th><th className="px-4 py-2">Serial Number</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {newSeapodItems.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 text-sm">{item.piece}</td>
                                                <td className="px-4 py-2 text-sm">{item.quantity}</td>
                                                <td className="px-4 py-2"><input className="w-full border rounded px-2 py-1 text-sm focus:border-[#0176D3] outline-none font-medium text-[#0176D3]" value={item.serial || ''} onChange={(e) => updateSeapodItemSerial(item.id, e.target.value)} placeholder="Enter Serial..." /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button onClick={handleWizardComplete} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center justify-center gap-2"><Check size={20}/> Complete Build</button>
                        </div>
                    )}

                    {seapodStep === 3 && tplDetails && (
                        <div className="flex-1 flex flex-col justify-center text-center px-8">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8 text-left grid grid-cols-2 gap-6">
                                <div><span className="text-[10px] font-bold text-slate-400 uppercase block">HW Ver</span><span className="text-xl font-bold text-slate-900">{tplDetails.hw_version}</span></div>
                                <div><span className="text-[10px] font-bold text-slate-400 uppercase block">SW Ver</span><span className="text-xl font-bold text-slate-900">{tplDetails.sw_version}</span></div>
                            </div>
                            <div className="flex gap-3 max-w-sm mx-auto w-full">
                                <button onClick={() => setSeapodStep(2)} className="flex-1 px-4 py-2 border rounded font-bold text-slate-700">Back</button>
                                <button onClick={finalWizardSubmit} className="flex-1 px-4 py-2 bg-[#0176D3] text-white rounded font-bold shadow">I Acknowledge</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          )}
      </div>
    </div>
  );
}