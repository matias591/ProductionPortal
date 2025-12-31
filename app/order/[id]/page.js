'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Box, Calendar, Ship, Upload, FileText, Paperclip, Lock, Download, Building2, Loader2, Warehouse, Cpu, Check, AlertTriangle, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from '../../components/Sidebar';

export default function OrderDetails({ params }) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(null);

  // --- DATA STATE ---
  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [files, setFiles] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- PERMISSIONS STATE ---
  const [isAdmin, setIsAdmin] = useState(false); 
  const [canShip, setCanShip] = useState(false); // Admin OR Operation

  // --- UI STATE ---
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [shipping, setShipping] = useState(false); 
  const [showShipModal, setShowShipModal] = useState(false);
  const [checkingVessel, setCheckingVessel] = useState(false);

  // --- SEAPOD WIZARD STATE ---
  const [showSeapodModal, setShowSeapodModal] = useState(false);
  const [seapodStep, setSeapodStep] = useState(1);
  const [missingSeapodSerial, setMissingSeapodSerial] = useState('');
  const [seapodTemplates, setSeapodTemplates] = useState([]);
  const [selectedSeapodTemplate, setSelectedSeapodTemplate] = useState('');
  
  // Wizard Data
  const [newSeapodItems, setNewSeapodItems] = useState([]);
  const [newSeapodId, setNewSeapodId] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null); 
  const [tplDetails, setTplDetails] = useState(null);

  // --- CONFLICT MODAL STATE ---
  const [showAssignedModal, setShowAssignedModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // 1. Safe Params Unwrap
  useEffect(() => {
    Promise.resolve(params).then((r) => setOrderId(r.id));
  }, [params]);

  // 2. Fetch Data
  useEffect(() => {
    if (orderId) fetchData();
  }, [orderId]);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
       if (profile?.role === 'admin') setIsAdmin(true);
       if (['admin', 'operation'].includes(profile?.role)) setCanShip(true);
    }

    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    
    // Fetch Items (Respect Sort Order)
    const { data: itemData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
    
    const { data: fileData } = await supabase.from('order_files').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
    const { data: allItems } = await supabase.from('items').select('*').order('name');
    
    // Fetch Templates
    const { data: tpls } = await supabase.from('seapod_templates').select('*').order('name');
    setSeapodTemplates(tpls || []);
    if (tpls?.length > 0) setSelectedSeapodTemplate(tpls[0].id);

    setOrder(orderData);
    setItems(itemData || []);
    setFiles(fileData || []);
    setMasterItems(allItems || []);
    setLoading(false);
  }

  // --- LOCKED LOGIC ---
  const isLocked = order?.status === 'Shipped' && !isAdmin;

  // --- VESSEL CHECK ---
  async function handleVesselBlur() {
    if (isLocked || !canShip || !order.vessel || order.vessel.trim() === '') return;
    setCheckingVessel(true);
    try {
        const res = await fetch('/api/check-vessel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vessel: order.vessel })
        });
        const data = await res.json();
        
        if (data.account && data.account !== "Account Empty") {
            setOrder(prev => ({ ...prev, account_name: data.account }));
            await supabase.from('orders').update({ account_name: data.account }).eq('id', orderId);
        } else {
            alert(`⚠️ Vessel "${order.vessel}" does not exist in Salesforce.`);
            setOrder(prev => ({ ...prev, vessel: '', account_name: '' }));
            await supabase.from('orders').update({ vessel: null, account_name: null }).eq('id', orderId);
        }
    } catch (e) {
        console.error("Vessel Check Failed", e);
    }
    setCheckingVessel(false);
  }

  // --- UPDATE ORDER LOGIC (Status Change Interceptor) ---
  async function updateOrder(field, value) {
    if (isLocked) return;

    // 1. SEAPOD VALIDATION GATE (Runs for In Box, Ready, and Shipped)
    // Updated Logic: Check for ANY advanced status
    const statusesRequiringSeapod = ['In Box', 'Ready for Pickup', 'Shipped'];

    if (field === 'status' && statusesRequiringSeapod.includes(value)) {
        const seapodItem = items.find(i => i.piece && i.piece.toLowerCase().includes('seapod'));
        
        if (seapodItem) {
            // Check for Serial Presence
            if (!seapodItem.serial || seapodItem.serial.trim() === '' || seapodItem.serial === '-') {
                alert("⚠️ Seapod Item exists but has no Serial Number. Fill it first."); return;
            }

            // Check DB for Existence
            const { data: existingSeapod } = await supabase
                .from('seapod_production')
                .select('id, status, order_number')
                .eq('serial_number', seapodItem.serial)
                .single();

            if (!existingSeapod) {
                // Not Found -> Trigger Wizard
                setMissingSeapodSerial(seapodItem.serial);
                setPendingStatus(value);
                setSeapodStep(1); 
                setShowSeapodModal(true);
                return; // STOP
            } else {
                // Found -> Validate Status
                if (existingSeapod.status !== 'Completed') {
                    alert(`⚠️ Seapod ${seapodItem.serial} status is '${existingSeapod.status}'. It must be 'Completed' first.`);
                    return; // STOP
                }
                
                // Found -> Validate Ownership (Conflict)
                if (existingSeapod.order_number && existingSeapod.order_number !== order.order_number) {
                    setConflictDetails({
                        serial: seapodItem.serial,
                        assignedTo: existingSeapod.order_number,
                        itemId: seapodItem.id
                    });
                    setShowAssignedModal(true);
                    return; // STOP
                }
                
                // Valid -> Link it
                await supabase.from('seapod_production').update({ 
                    order_number: order.order_number, 
                    status: 'Assigned to Order' 
                }).eq('id', existingSeapod.id);
            }
        }
    }

    // 2. SHIPPING SPECIFIC LOGIC (Vessel Check + Confirmation)
    if (field === 'status' && value === 'Shipped') {
        if (!order.vessel || order.vessel === 'Unknown Vessel') {
            alert("⚠️ Cannot Ship: Vessel Name is required.");
            return; 
        }
        setShowShipModal(true); 
        return; 
    }

    // Normal Save (For other statuses or field updates)
    setOrder({ ...order, [field]: value });
    await supabase.from('orders').update({ [field]: value }).eq('id', orderId);
  }

  // --- SEAPOD WIZARD LOGIC ---
  function goToAckStep() {
    const tpl = seapodTemplates.find(t => t.id === selectedSeapodTemplate);
    setTplDetails(tpl);
    
    // Create Header (In Progress)
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
                    setSeapodStep(2); // Go to Step 2
                });
            });
        });
    });
  }

  async function updateSeapodItemSerial(itemId, newSerial) {
    setNewSeapodItems(prev => prev.map(i => i.id === itemId ? { ...i, serial: newSerial } : i));
    await supabase.from('seapod_items').update({ serial: newSerial }).eq('id', itemId);
  }

  async function handleWizardComplete() {
    const missing = newSeapodItems.some(i => !i.serial || i.serial.trim() === '');
    if (missing) { alert("Please fill ALL serial numbers."); return; }
    setSeapodStep(3); // Go to Ack
  }

  async function finalWizardSubmit() {
    // Complete & Assign
    await supabase.from('seapod_production').update({ 
        status: 'Assigned to Order', 
        order_number: order.order_number,
        completed_at: new Date().toISOString()
    }).eq('id', newSeapodId);

    setShowSeapodModal(false);
    
    // Update Order Status
    if (pendingStatus) {
        setOrder(prev => ({ ...prev, status: pendingStatus }));
        await supabase.from('orders').update({ status: pendingStatus }).eq('id', orderId);
        setPendingStatus(null);
    }
  }

  // --- SHIPPING ACTIONS ---
  async function confirmShipping() {
    setShipping(true);
    try {
        const res = await fetch('/api/trigger-shipping', { method: 'POST', body: JSON.stringify({ orderId: orderId }) });
        const json = await res.json();
        
        if (json.error) {
             alert("Error: " + json.error);
        } else {
             setOrder({ ...order, status: 'Shipped' });
             await supabase.from('orders').update({ 
                 status: 'Shipped',
                 shipped_at: new Date().toISOString()
             }).eq('id', orderId);
             setShowShipModal(false); 
        }
    } catch (e) { alert(e.message); }
    setShipping(false);
  }

  // --- CONFLICT ACTIONS ---
  async function handleClearConflict() {
    setItems(prev => prev.map(i => i.id === conflictDetails.itemId ? { ...i, serial: '' } : i));
    await supabase.from('order_items').update({ serial: '' }).eq('id', conflictDetails.itemId);
    setShowAssignedModal(false);
    setConflictDetails(null);
  }

  // --- FILE DRAG & DROP ---
  async function performUpload(file) {
    if (isLocked) return;
    setUploading(true);
    const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${file.name.split('.').pop()}`;
    const filePath = `${orderId}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('order-attachments').upload(filePath, file);
    if (uploadError) { alert(uploadError.message); setUploading(false); return; }
    const { data: fileRecord } = await supabase.from('order_files').insert([{ order_id: orderId, file_name: file.name, file_path: filePath, uploaded_by: isAdmin ? 'Admin' : 'User' }]).select().single();
    if (fileRecord) setFiles([fileRecord, ...files]);
    setUploading(false);
  }
  const onFileSelect = (e) => { if (e.target.files && e.target.files.length > 0) performUpload(e.target.files[0]); };
  const onDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) performUpload(e.dataTransfer.files[0]); };
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  function openFile(path) {
    const { data } = supabase.storage.from('order-attachments').getPublicUrl(path);
    if (data?.publicUrl) window.open(data.publicUrl, '_blank');
  }

  // --- ITEM ACTIONS (Update / Add / Delete) ---
  function exportToExcel() {
    const dataToExport = items.map(item => ({
        "Order #": order.order_number, "Vessel": order.vessel, "Account": order.account_name || '-', "Warehouse": order.warehouse || '-',
        "Item Name": item.piece, "SKU": masterItems.find(m => m.name === item.piece)?.sku || '-', 
        "Serial Number": item.serial || '-', "Quantity": item.quantity,
        ...(isAdmin ? { "Unit Price": item.price, "Total Price": item.price * item.quantity } : {})
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Order Details");
    XLSX.writeFile(workbook, `Order_${order.order_number}.xlsx`);
  }

  async function updateItem(itemId, field, value) {
    if (isLocked) return;
    let updateData = { [field]: value };
    if (field === 'piece') {
        const selectedMaster = masterItems.find(m => m.name === value);
        if (selectedMaster) updateData.price = selectedMaster.price;
    }
    const newItems = items.map(i => i.id === itemId ? { ...i, ...updateData } : i);
    setItems(newItems);
    await supabase.from('order_items').update(updateData).eq('id', itemId);
  }

  async function addItem() {
    if (isLocked) return;
    const firstMaster = masterItems[0];
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1;
    const newItem = { order_id: orderId, piece: firstMaster ? firstMaster.name : 'New Item', quantity: 1, serial: '', price: firstMaster ? firstMaster.price : 0, is_done: false, sort_order: nextOrder };
    const { data } = await supabase.from('order_items').insert([newItem]).select().single();
    if(data) setItems([...items, data]);
  }

  async function deleteItem(itemId) {
    if (isLocked) return;
    
    // --- PERMISSIONS CHECK ---
    if (!isAdmin) {
        if (!canShip) { 
            alert("Permission Denied: Only Admins or Operations can delete items."); 
            return; 
        }
        // Ops Restriction
        const restrictedStatuses = ['In Box', 'Ready for Pickup', 'Shipped'];
        if (restrictedStatuses.includes(order.status)) {
            alert(`Operations cannot delete items when status is '${order.status}'. Please contact an Admin.`);
            return;
        }
    }
    
    if(!confirm('Remove this item?')) return;
    setItems(items.filter(i => i.id !== itemId));
    await supabase.from('order_items').delete().eq('id', itemId);
  }

  // --- RENDER ---
  if (loading) return <div className="flex min-h-screen bg-[#F3F4F6]"><Sidebar /><div className="ml-64 p-10 text-slate-500">Loading Order...</div></div>;
  if (!order) return <div className="flex min-h-screen bg-[#F3F4F6]"><Sidebar /><div className="ml-64 p-10 text-red-500">Order not found.</div></div>;
  const totalCost = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
  const isLockedOrder = order.status === 'Shipped' && !isAdmin;

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <div className="flex-1 ml-64">
          <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
            <div className="max-w-[1600px] mx-auto px-6 py-4">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-[#0176D3]/10 text-[#0176D3] border border-[#0176D3]/20 rounded-lg flex items-center justify-center"><Box size={24} /></div>
                   <div>
                     <div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-slate-900">{order.vessel || 'No Vessel Name'}</h1>{isLockedOrder && <Lock size={18} className="text-red-500" title="Order Locked" />}</div>
                     <div className="flex items-center gap-3 text-sm text-slate-500 mt-1"><span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 text-slate-600">#{order.order_number}</span><span className="flex items-center gap-1 text-slate-600 font-medium"><Building2 size={12} /> {order.account_name || 'No Account'}</span></div>
                   </div>
                </div>
                <div className="flex items-end gap-3">
                    <button onClick={exportToExcel} className="bg-white border border-slate-300 text-slate-700 font-bold px-3 py-2 rounded-md text-sm shadow-sm hover:bg-slate-50 flex items-center gap-2"><Download size={16}/> Export Excel</button>
                    <div className="flex flex-col items-end">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                        <select value={order.status || 'New'} onChange={(e) => updateOrder('status', e.target.value)} disabled={isLockedOrder && !canShip} className={`bg-white border border-slate-300 text-slate-900 text-sm font-bold rounded-md shadow-sm focus:ring-2 focus:ring-[#0176D3] block w-44 p-2 outline-none ${isLockedOrder ? 'bg-gray-100 text-gray-500' : ''}`}>
                        <option value="New">New</option><option value="In preparation">In preparation</option><option value="In Box">In Box</option><option value="Ready for Pickup">Ready for Pickup</option>{(canShip || order.status === 'Shipped') && <option value="Shipped">Shipped</option>}
                        </select>
                    </div>
                </div>
              </div>
            </div>
          </div>

          <main className="max-w-[1600px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Order Details</h3></div>
                    <div className="p-5 space-y-5">
                        <div><label className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-1.5"><span className="flex items-center gap-2"><Ship size={14} /> Vessel Name <span className="text-red-500">*</span></span>{checkingVessel && <span className="text-[#0176D3] flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Checking...</span>}</label><input className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none text-slate-900" placeholder="Enter Name & Click Away" value={order.vessel || ''} disabled={!canShip || isLockedOrder || checkingVessel} onChange={(e) => updateOrder('vessel', e.target.value)} onBlur={handleVesselBlur} /></div>
                        <div><label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5"><Building2 size={14} /> Account Name</label><input className="w-full text-sm font-medium border border-slate-200 bg-slate-50 rounded px-3 py-2 text-slate-500 cursor-not-allowed" value={order.account_name || ''} readOnly placeholder="Auto-filled" /></div>
                        {isAdmin && (<div><label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5"><Warehouse size={14} /> Warehouse</label><select className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none bg-white text-slate-900" value={order.warehouse || 'Orca'} onChange={(e) => updateOrder('warehouse', e.target.value)} disabled={isLockedOrder}><option value="Orca">Orca</option><option value="Baz">Baz</option></select></div>)}
                        <div><label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5"><Calendar size={14} /> Pickup Date</label><input type="date" className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none text-slate-700" value={order.pickup_date || ''} disabled={isLockedOrder} onChange={(e) => updateOrder('pickup_date', e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Kit Type</label><select className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none bg-white" value={order.type || ''} disabled={isLockedOrder} onChange={(e) => updateOrder('type', e.target.value)} ><option>Full system</option><option>Upgrade</option><option>Replacement</option><option>Spare Parts</option></select></div>
                    </div>
                </div>
                <div className={`bg-white border rounded-lg shadow-sm overflow-hidden transition-colors ${isDragging && !isLockedOrder ? 'border-[#0176D3] bg-blue-50/50' : 'border-slate-200'}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2"><Paperclip size={14}/> Attachments ({files.length})</h3>{canShip && !isLockedOrder && (<label className="cursor-pointer text-xs font-bold text-[#0176D3] hover:underline flex items-center gap-1">{uploading ? 'Uploading...' : '+ Upload'}<input type="file" className="hidden" onChange={onFileSelect} disabled={uploading || isLockedOrder} /></label>)}</div>
                    {isDragging && !isLockedOrder && <div className="p-4 text-center text-[#0176D3] font-bold text-sm bg-blue-50">Drop files here to upload</div>}
                    <div className="divide-y divide-slate-50">{files.map(file => (<div key={file.id} onClick={() => openFile(file.file_path)} className="px-5 py-3 flex items-center gap-3 hover:bg-blue-50 cursor-pointer transition-colors group"><div className="bg-blue-100 p-1.5 rounded text-blue-600"><FileText size={16}/></div><div className="overflow-hidden"><p className="text-sm font-medium text-slate-700 truncate group-hover:text-[#0176D3] group-hover:underline">{file.file_name}</p><p className="text-[10px] text-slate-400">Uploaded by {file.uploaded_by}</p></div></div>))}{files.length === 0 && !isDragging && <div className="p-6 text-center text-slate-400 text-xs italic">No files attached. Drag & drop here.</div>}</div>
                </div>
            </div>

            <div className="lg:col-span-2">
               <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                   <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center"><h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Line Items</h3><div className="flex items-center gap-4">{isAdmin && (<div className="text-sm font-bold text-slate-700">Total: <span className="text-[#0176D3]">${totalCost.toFixed(2)}</span></div>)}<span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-1 rounded">{items.length} Items</span></div></div>
                   <table className="w-full text-left border-collapse">
                     <thead className="bg-white border-b border-slate-200 text-xs uppercase text-slate-400 font-bold">
                        <tr>
                            <th className="px-6 py-3">Item</th><th className="px-6 py-3 w-20">Qty</th><th className="px-6 py-3 w-32">Serial #</th><th className="px-6 py-3 w-32">Orca ID</th>{isAdmin && <th className="px-6 py-3 w-24 text-right">Price</th>}<th className="w-10"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                       {items.map((item) => (
                         <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3"><select className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-medium text-slate-900" value={item.piece || ''} disabled={isLockedOrder} onChange={(e) => updateItem(item.id, 'piece', e.target.value)}><option value="">Select Item...</option>{masterItems.map(m => <option key={m.id} value={m.name}>{m.sku} - {m.name}</option>)}</select></td>
                            <td className="px-6 py-3"><input type="number" className="w-full bg-transparent border-none outline-none" value={item.quantity || 1} disabled={isLockedOrder} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} /></td>
                            <td className="px-6 py-3"><input className="w-full bg-transparent border-none outline-none text-[#0176D3] font-medium placeholder-slate-300" value={item.serial || ''} disabled={isLockedOrder} onChange={(e) => updateItem(item.id, 'serial', e.target.value)} placeholder="---" /></td>
                            <td className="px-6 py-3"><input className="w-full bg-transparent border-none outline-none text-slate-600 placeholder-slate-300" value={item.orca_id || ''} disabled={isLockedOrder} onChange={(e) => updateItem(item.id, 'orca_id', e.target.value)} placeholder="---" /></td>
                            {isAdmin && (<td className="px-6 py-3 text-right text-xs font-mono text-slate-600">${(item.price * item.quantity).toFixed(2)}</td>)}
                            <td className="px-4 py-3 text-right">
                                {isAdmin && !isLockedOrder ? (
                                   <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                ) : canShip && !isLockedOrder && !['In Box', 'Ready for Pickup', 'Shipped'].includes(order.status) && (
                                   <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                )}
                            </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                   {!isLockedOrder && (<button onClick={addItem} className="w-full py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-[#0176D3] transition-colors flex items-center justify-center gap-2 border-t border-slate-200"><Plus size={16} /> Add New Line Item</button>)}
                </div>
            </div>
          </main>

          {/* SHIP MODAL */}
          {showShipModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200 border border-slate-200">
                <div className="flex flex-col items-center text-center"><div className="w-12 h-12 bg-blue-100 text-[#0176D3] rounded-full flex items-center justify-center mb-4"><Ship size={24} /></div><h3 className="text-lg font-bold text-slate-900">Confirm Shipment?</h3><p className="text-sm text-slate-500 mt-2 mb-6">This will <strong>lock the order</strong> and send data. Cannot be undone.</p><div className="flex gap-3 w-full"><button onClick={() => setShowShipModal(false)} disabled={shipping} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button onClick={confirmShipping} disabled={shipping} className="flex-1 px-4 py-2.5 bg-[#0176D3] text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">{shipping ? 'Processing...' : 'Confirm & Ship'}</button></div></div>
              </div>
            </div>
          )}

          {/* CONFLICT MODAL */}
          {showAssignedModal && conflictDetails && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 border border-red-200">
                <div className="flex flex-col items-center text-center"><div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><XCircle size={24} /></div><h3 className="text-lg font-bold text-slate-900">Seapod Already Assigned</h3><p className="text-sm text-slate-500 mt-2 mb-6">Seapod <strong>{conflictDetails.serial}</strong> is already assigned to <strong>Order #{conflictDetails.assignedTo}</strong>.<br/>Please use a different Seapod or check the number.</p><div className="flex gap-3 w-full"><button onClick={handleClearConflict} className="flex-1 px-4 py-2.5 bg-[#0176D3] text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">OK, Clear Serial</button></div></div>
              </div>
            </div>
          )}

          {/* SEAPOD WIZARD MODAL */}
          {showSeapodModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl border border-blue-100 h-[80vh] flex flex-col">
                    <div className="flex flex-col items-center text-center mb-6"><div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2"><Cpu size={24} /></div><h3 className="text-xl font-bold text-slate-900">{seapodStep === 1 ? "Seapod Not Found" : seapodStep === 3 ? "Verify Versions" : `Build: ${missingSeapodSerial}`}</h3>{seapodStep === 1 && <p className="text-sm text-slate-500">Seapod <strong>{missingSeapodSerial}</strong> does not exist. Create it now to proceed.</p>}</div>
                    {seapodStep === 1 && (<div className="flex-1 flex flex-col justify-center"><label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-center">Select Template</label><select className="w-full max-w-sm mx-auto border border-slate-300 rounded px-3 py-2 text-sm font-medium" value={selectedSeapodTemplate} onChange={(e) => setSelectedSeapodTemplate(e.target.value)}>{seapodTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select><div className="mt-8 flex gap-3 max-w-sm mx-auto w-full"><button onClick={() => setShowSeapodModal(false)} className="flex-1 px-4 py-2 border rounded font-bold text-slate-700">Cancel</button><button onClick={goToAckStep} className="flex-1 px-4 py-2 bg-[#0176D3] text-white rounded font-bold shadow">Start Build</button></div></div>)}
                    {seapodStep === 2 && (<div className="flex-1 flex flex-col overflow-hidden"><div className="overflow-y-auto flex-1 border border-slate-200 rounded-lg mb-6"><table className="w-full text-left"><thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b sticky top-0"><tr><th className="px-4 py-2">Item</th><th className="px-4 py-2 w-20">Qty</th><th className="px-4 py-2">Serial Number</th></tr></thead><tbody className="divide-y divide-slate-100">{newSeapodItems.map(item => (<tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-2 text-sm">{item.piece}</td><td className="px-4 py-2 text-sm">{item.quantity}</td><td className="px-4 py-2"><input className="w-full border rounded px-2 py-1 text-sm focus:border-[#0176D3] outline-none font-medium text-[#0176D3]" value={item.serial || ''} onChange={(e) => updateSeapodItemSerial(item.id, e.target.value)} placeholder="Enter Serial..." /></td></tr>))}</tbody></table></div><button onClick={handleWizardComplete} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center justify-center gap-2"><Check size={20}/> Complete Build</button></div>)}
                    {seapodStep === 3 && tplDetails && (<div className="flex-1 flex flex-col justify-center text-center px-8"><div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8 text-left"><div className="mb-4 pb-4 border-b border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase block">Seapod Version</span><span className="text-lg font-bold text-[#0176D3]">{tplDetails.seapod_version || 'N/A'}</span></div><div className="grid grid-cols-2 gap-4"><div><span className="text-[10px] font-bold text-slate-400 uppercase block">HW Ver</span><span className="text-xl font-bold text-slate-900">{tplDetails.hw_version}</span></div><div><span className="text-[10px] font-bold text-slate-400 uppercase block">SW Ver</span><span className="text-xl font-bold text-slate-900">{tplDetails.sw_version}</span></div></div></div><div className="flex gap-3 max-w-sm mx-auto w-full"><button onClick={() => setSeapodStep(2)} className="flex-1 px-4 py-2 border rounded font-bold text-slate-700">Back</button><button onClick={finalWizardSubmit} className="flex-1 px-4 py-2 bg-[#0176D3] text-white rounded font-bold shadow">I Acknowledge</button></div></div>)}
                </div>
            </div>
          )}
      </div>
    </div>
  );
}