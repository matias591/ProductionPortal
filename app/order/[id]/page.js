'use client';
import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Box, Calendar, Ship, Upload, FileText, Paperclip, Lock, Download, Building2, Loader2, Warehouse } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function OrderDetails({ params }) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [files, setFiles] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shipping, setShipping] = useState(false); 
  const [showShipModal, setShowShipModal] = useState(false);
  const [checkingVessel, setCheckingVessel] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
       if (profile?.role === 'admin') setIsAdmin(true);
    }

    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    const { data: fileData } = await supabase.from('order_files').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
    const { data: allItems } = await supabase.from('items').select('*').order('name');

    setOrder(orderData);
    setItems(itemData || []);
    setFiles(fileData || []);
    setMasterItems(allItems || []);
    setLoading(false);
  }

  const isLocked = order?.status === 'Shipped' && !isAdmin;

  // --- VESSEL CHECK LOGIC ---
  async function handleVesselBlur() {
    if (isLocked || !order.vessel || order.vessel.trim() === '') return;
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

  async function updateOrder(field, value) {
    if (isLocked) return;

    if (field === 'status' && value === 'Shipped') {
        if (!order.vessel || order.vessel.trim() === '' || order.vessel === 'Unknown Vessel') {
            alert("⚠️ Cannot Ship: Vessel Name is required.");
            return; 
        }
        setShowShipModal(true); 
        return; 
    }

    setOrder({ ...order, [field]: value });
    await supabase.from('orders').update({ [field]: value }).eq('id', orderId);
  }

  async function confirmShipping() {
    setShipping(true);
    try {
        const res = await fetch('/api/trigger-shipping', { method: 'POST', body: JSON.stringify({ orderId: orderId }) });
        const json = await res.json();
        if (json.error) alert("Error: " + json.error);
        else { setOrder({ ...order, status: 'Shipped' }); setShowShipModal(false); }
    } catch (e) { alert(e.message); }
    setShipping(false);
  }

  function exportToExcel() {
    const dataToExport = items.map(item => ({
        "Order #": order.order_number, 
        "Vessel": order.vessel, 
        "Account": order.account_name || '-',
        "Warehouse": order.warehouse || '-', // Exporting Warehouse
        "Item Name": item.piece,
        "SKU": masterItems.find(m => m.name === item.piece)?.sku || '-', 
        "Serial Number": item.serial || '-',
        "Quantity": item.quantity,
        ...(isAdmin ? { "Unit Price": item.price, "Total Price": item.price * item.quantity } : {})
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Order Details");
    XLSX.writeFile(workbook, `Order_${order.order_number}.xlsx`);
  }

  // ... (Item/File/Delete Functions unchanged) ...
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
    const newItem = { order_id: orderId, piece: firstMaster ? firstMaster.name : 'New Item', quantity: 1, serial: '', price: firstMaster ? firstMaster.price : 0, is_done: false };
    const { data } = await supabase.from('order_items').insert([newItem]).select().single();
    if(data) setItems([...items, data]);
  }

  async function deleteItem(itemId) {
    if (isLocked) return;
    if(!confirm('Remove this item?')) return;
    setItems(items.filter(i => i.id !== itemId));
    await supabase.from('order_items').delete().eq('id', itemId);
  }

  async function handleFileUpload(e) {
    if (isLocked) return;
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${fileExt}`;
    const filePath = `${orderId}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('order-attachments').upload(filePath, file);
    if (uploadError) { alert(uploadError.message); setUploading(false); return; }
    const { data: fileRecord } = await supabase.from('order_files').insert([{ order_id: orderId, file_name: file.name, file_path: filePath, uploaded_by: isAdmin ? 'Admin' : 'Vendor' }]).select().single();
    if (fileRecord) setFiles([fileRecord, ...files]);
    setUploading(false);
  }

  function openFile(path) {
    const { data } = supabase.storage.from('order-attachments').getPublicUrl(path);
    if (data?.publicUrl) window.open(data.publicUrl, '_blank');
  }

  if (loading) return <div className="p-10 text-center text-slate-500 font-sans">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <button onClick={() => router.push('/')} className="text-xs font-bold text-[#0176D3] hover:underline mb-3 flex items-center gap-1 uppercase tracking-wide">
            <ArrowLeft size={12} /> Back to List
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-[#0176D3]/10 text-[#0176D3] border border-[#0176D3]/20 rounded-lg flex items-center justify-center">
                 <Box size={24} />
               </div>
               <div>
                 <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900">{order.vessel || 'No Vessel Name'}</h1>
                    {isLocked && <Lock size={18} className="text-red-500" title="Order Locked" />}
                 </div>
                 <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 text-slate-600">#{order.order_number}</span>
                    <span className="flex items-center gap-1 text-slate-600 font-medium"><Building2 size={12} /> {order.account_name || 'No Account'}</span>
                 </div>
               </div>
            </div>

            <div className="flex items-end gap-3">
                <button onClick={exportToExcel} className="bg-white border border-slate-300 text-slate-700 font-bold px-3 py-2 rounded-md text-sm shadow-sm hover:bg-slate-50 flex items-center gap-2">
                    <Download size={16}/> Export Excel
                </button>

                <div className="flex flex-col items-end">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select 
                    value={order.status || 'New'} 
                    onChange={(e) => updateOrder('status', e.target.value)}
                    disabled={isLocked} // Still checks lock logic
                    className={`bg-white border border-slate-300 text-slate-900 text-sm font-bold rounded-md shadow-sm focus:ring-2 focus:ring-[#0176D3] block w-44 p-2 outline-none ${isLocked ? 'bg-gray-100 text-gray-500' : ''}`}
                    >
                    <option value="New">New</option>
                    <option value="In preparation">In preparation</option>
                    <option value="In Box">In Box</option>
                    <option value="Ready for Pickup">Ready for Pickup</option>
                    {/* ONLY ADMIN CAN SEE SHIPPED OPTION */}
                    {isAdmin && <option value="Shipped">Shipped</option>}
                    {/* IF IT IS ALREADY SHIPPED, SHOW IT SO IT DOESNT BREAK */}
                    {order.status === 'Shipped' && !isAdmin && <option value="Shipped">Shipped</option>}
                    </select>
                </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Order Details</h3>
                </div>
                <div className="p-5 space-y-5">
                    <div>
                        <label className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-1.5">
                            <span className="flex items-center gap-2"><Ship size={14} /> Vessel Name <span className="text-red-500">*</span></span>
                            {checkingVessel && <span className="text-[#0176D3] flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Checking...</span>}
                        </label>
                        <input className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none text-slate-900" placeholder="Enter Name & Click Away" value={order.vessel || ''} disabled={isLocked || checkingVessel} onChange={(e) => updateOrder('vessel', e.target.value)} onBlur={handleVesselBlur} />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5"><Building2 size={14} /> Account Name</label>
                        <input className="w-full text-sm font-medium border border-slate-200 bg-slate-50 rounded px-3 py-2 text-slate-500 cursor-not-allowed" value={order.account_name || ''} readOnly placeholder="Auto-filled from Salesforce" />
                    </div>

                    {/* WAREHOUSE (ADMIN ONLY) */}
                    {isAdmin && (
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5"><Warehouse size={14} /> Warehouse</label>
                            <select 
                                className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none bg-white text-slate-900"
                                value={order.warehouse || 'Orca'}
                                onChange={(e) => updateOrder('warehouse', e.target.value)}
                                disabled={isLocked}
                            >
                                <option value="Orca">Orca</option>
                                <option value="Bazz">Bazz</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5"><Calendar size={14} /> Pickup Date</label>
                        <input type="date" className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none text-slate-700" value={order.pickup_date || ''} disabled={isLocked} onChange={(e) => updateOrder('pickup_date', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Kit Type</label>
                        <select className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none bg-white" value={order.type || ''} disabled={isLocked} onChange={(e) => updateOrder('type', e.target.value)} >
                        <option>Full system</option><option>Upgrade</option><option>Replacement</option><option>Spare Parts</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* File Upload (Same as before) */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2"><Paperclip size={14}/> Attachments ({files.length})</h3>
                    {isAdmin && !isLocked && (<label className="cursor-pointer text-xs font-bold text-[#0176D3] hover:underline flex items-center gap-1">{uploading ? 'Uploading...' : '+ Upload'}<input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading || isLocked} /></label>)}
                </div>
                <div className="divide-y divide-slate-50">
                    {files.map(file => (
                        <div key={file.id} onClick={() => openFile(file.file_path)} className="px-5 py-3 flex items-center gap-3 hover:bg-blue-50 cursor-pointer transition-colors group">
                            <div className="bg-blue-100 p-1.5 rounded text-blue-600"><FileText size={16}/></div>
                            <div className="overflow-hidden"><p className="text-sm font-medium text-slate-700 truncate group-hover:text-[#0176D3] group-hover:underline">{file.file_name}</p><p className="text-[10px] text-slate-400">Uploaded by {file.uploaded_by}</p></div>
                        </div>
                    ))}
                    {files.length === 0 && <div className="p-6 text-center text-slate-400 text-xs italic">No files attached.</div>}
                </div>
            </div>
        </div>

        {/* Right Column: Items (Same logic) */}
        <div className="lg:col-span-2">
           <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Line Items</h3>
                  <div className="flex items-center gap-4">
                      {isAdmin && (<div className="text-sm font-bold text-slate-700">Total: <span className="text-[#0176D3]">${totalCost.toFixed(2)}</span></div>)}
                      <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-1 rounded">{items.length} Items</span>
                  </div>
               </div>
               
               <table className="w-full text-left border-collapse">
                 <thead className="bg-white border-b border-slate-200 text-xs uppercase text-slate-400 font-bold">
                   <tr>
                     <th className="px-6 py-3 w-10 text-center"></th>
                     <th className="px-6 py-3">Item</th>
                     <th className="px-6 py-3 w-20">Qty</th>
                     <th className="px-6 py-3 w-32">Serial #</th>
                     <th className="px-6 py-3 w-32">Orca ID</th>
                     {isAdmin && <th className="px-6 py-3 w-24 text-right">Price</th>}
                     <th className="w-10"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {items.map((item) => (
                     <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-center">
                           <input type="checkbox" checked={item.is_done || false} onChange={(e) => updateItem(item.id, 'is_done', e.target.checked)} disabled={isLocked} className="w-5 h-5 rounded border-slate-300 text-[#0176D3] focus:ring-[#0176D3] accent-[#0176D3] cursor-pointer" />
                        </td>
                        <td className="px-6 py-3">
                           <select className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-medium text-slate-900" value={item.piece || ''} disabled={isLocked} onChange={(e) => updateItem(item.id, 'piece', e.target.value)}>
                                <option value="">Select Item...</option>
                                {masterItems.map(m => <option key={m.id} value={m.name}>{m.sku} - {m.name}</option>)}
                           </select>
                        </td>
                        <td className="px-6 py-3">
                           <input type="number" className="w-full bg-transparent border-none outline-none" value={item.quantity || 1} disabled={isLocked} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} />
                        </td>
                        <td className="px-6 py-3">
                           <input className="w-full bg-transparent border-none outline-none text-[#0176D3] font-medium placeholder-slate-300" value={item.serial || ''} disabled={isLocked} onChange={(e) => updateItem(item.id, 'serial', e.target.value)} placeholder="---" />
                        </td>
                        <td className="px-6 py-3">
                           <input className="w-full bg-transparent border-none outline-none text-slate-600 placeholder-slate-300" value={item.orca_id || ''} disabled={isLocked} onChange={(e) => updateItem(item.id, 'orca_id', e.target.value)} placeholder="---" />
                        </td>
                        {isAdmin && (<td className="px-6 py-3 text-right text-xs font-mono text-slate-600">${(item.price * item.quantity).toFixed(2)}</td>)}
                        <td className="px-4 py-3 text-right">
                           {!isLocked && (<button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>)}
                        </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               
               {!isLocked && (
                   <button onClick={addItem} className="w-full py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-[#0176D3] transition-colors flex items-center justify-center gap-2 border-t border-slate-200"><Plus size={16} /> Add New Line Item</button>
               )}
            </div>
        </div>
      </main>

      {/* Ship Modal (Same as before) */}
      {showShipModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200 border border-slate-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 text-[#0176D3] rounded-full flex items-center justify-center mb-4"><Ship size={24} /></div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Shipment?</h3>
              <p className="text-sm text-slate-500 mt-2 mb-6">This will <strong>lock the order</strong> and send data. Cannot be undone.</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowShipModal(false)} disabled={shipping} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={confirmShipping} disabled={shipping} className="flex-1 px-4 py-2.5 bg-[#0176D3] text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">{shipping ? 'Processing...' : 'Confirm & Ship'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}