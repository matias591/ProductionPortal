'use client';
import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Box, Calendar, Ship, Upload, FileText, Paperclip, Check } from 'lucide-react';

export default function OrderDetails({ params }) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  const router = useRouter();

  // Data State
  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin/File State
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // 1. Get User Session & Role
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
       const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
       if (profile?.role === 'admin') setIsAdmin(true);
    }

    // 2. Fetch Order Data
    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    
    // 3. Fetch Items
    const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    
    // 4. Fetch Files
    const { data: fileData } = await supabase.from('order_files').select('*').eq('order_id', orderId).order('created_at', { ascending: false });

    setOrder(orderData);
    setItems(itemData || []);
    setFiles(fileData || []);
    setLoading(false);
  }

  // --- ORDER LOGIC ---
  async function updateOrder(field, value) {
    setOrder({ ...order, [field]: value });
    await supabase.from('orders').update({ [field]: value }).eq('id', orderId);
  }

  // --- ITEM LOGIC ---
  async function updateItem(itemId, field, value) {
    const newItems = items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
    setItems(newItems);
    await supabase.from('order_items').update({ [field]: value }).eq('id', itemId);
  }

  async function addItem() {
    const newItem = { order_id: orderId, piece: '', quantity: 1, serial: '', is_done: false };
    const { data } = await supabase.from('order_items').insert([newItem]).select().single();
    if(data) setItems([...items, data]);
  }

  async function deleteItem(itemId) {
    if(!confirm('Remove this item?')) return;
    setItems(items.filter(i => i.id !== itemId));
    await supabase.from('order_items').delete().eq('id', itemId);
  }

  // --- FILE LOGIC ---
  async function handleFileUpload(e) {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    
    const file = e.target.files[0];
    // Sanitize filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${fileExt}`;
    const filePath = `${orderId}/${fileName}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, file);

    if (uploadError) {
        alert("Upload failed: " + uploadError.message);
        setUploading(false);
        return;
    }

    // 2. Save Metadata to DB
    const { data: fileRecord, error: dbError } = await supabase.from('order_files').insert([{
        order_id: orderId,
        file_name: file.name,
        file_path: filePath,
        uploaded_by: 'Admin' 
    }]).select().single();

    if (fileRecord) setFiles([fileRecord, ...files]);
    setUploading(false);
  }

  function openFile(path) {
    const { data } = supabase.storage.from('order-attachments').getPublicUrl(path);
    if (data?.publicUrl) window.open(data.publicUrl, '_blank');
  }

  if (loading) return <div className="p-10 text-center text-slate-500 font-sans">Loading Order...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* Header Panel (Sticky) */}
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
                 </div>
                 <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 text-slate-600">
                        #{order.order_number}
                    </span>
                    <span>Created: {new Date(order.created_at).toLocaleDateString()}</span>
                 </div>
               </div>
            </div>

            {/* Status Dropdown */}
            <div className="flex flex-col items-end">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                <select 
                  value={order.status || 'New'} 
                  onChange={(e) => updateOrder('status', e.target.value)}
                  className="bg-white border border-slate-300 text-slate-900 text-sm font-bold rounded-md shadow-sm focus:ring-2 focus:ring-[#0176D3] focus:border-transparent block w-44 p-2 cursor-pointer outline-none transition-all"
                >
                  <option value="New">New</option>
                  <option value="In preparation">In preparation</option>
                  <option value="Ready for Pickup">Ready for Pickup</option>
                  <option value="Shipped">Shipped</option>
                </select>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details & Files */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* Order Details Card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Order Details</h3>
                </div>
                <div className="p-5 space-y-5">
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5">
                            <Ship size={14} /> Vessel Name
                        </label>
                        <input 
                        className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none text-slate-900 placeholder-slate-300"
                        placeholder="Optional"
                        value={order.vessel || ''} 
                        onChange={(e) => updateOrder('vessel', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1.5">
                            <Calendar size={14} /> Pickup Date
                        </label>
                        <input 
                        type="date"
                        className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none text-slate-700"
                        value={order.pickup_date || ''} 
                        onChange={(e) => updateOrder('pickup_date', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Kit Type</label>
                        <select 
                        className="w-full text-sm font-medium border border-slate-200 rounded px-3 py-2 focus:border-[#0176D3] outline-none bg-white" 
                        value={order.type || ''} 
                        onChange={(e) => updateOrder('type', e.target.value)}
                        >
                        <option>Full system</option>
                        <option>Upgrade</option>
                        <option>Replacement</option>
                        <option>Spare Parts</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Attachments Card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <Paperclip size={14}/> Attachments ({files.length})
                    </h3>
                    {/* Only Admin can see Upload Button */}
                    {isAdmin && (
                        <label className="cursor-pointer text-xs font-bold text-[#0176D3] hover:underline flex items-center gap-1">
                            {uploading ? 'Uploading...' : '+ Upload'}
                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    )}
                </div>
                <div className="divide-y divide-slate-50">
                    {files.map(file => (
                        <div 
                            key={file.id} 
                            onClick={() => openFile(file.file_path)} 
                            className="px-5 py-3 flex items-center gap-3 hover:bg-blue-50 cursor-pointer transition-colors group"
                        >
                            <div className="bg-blue-100 p-1.5 rounded text-blue-600">
                                <FileText size={16}/>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-slate-700 truncate group-hover:text-[#0176D3] group-hover:underline">{file.file_name}</p>
                                <p className="text-[10px] text-slate-400">Uploaded by {file.uploaded_by}</p>
                            </div>
                        </div>
                    ))}
                    {files.length === 0 && (
                        <div className="p-6 text-center text-slate-400 text-xs italic">
                            No files attached yet.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right Column: Line Items */}
        <div className="lg:col-span-2">
           <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Line Items</h3>
                  <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-1 rounded">
                    {items.length} Items
                  </span>
               </div>
               
               <table className="w-full text-left border-collapse">
                 <thead className="bg-white border-b border-slate-200 text-xs uppercase text-slate-400 font-bold">
                   <tr>
                     <th className="px-6 py-3 w-16 text-center">Done</th>
                     <th className="px-6 py-3">Item / Piece</th>
                     <th className="px-6 py-3 w-24">Qty</th>
                     <th className="px-6 py-3">Serial #</th>
                     <th className="px-6 py-3">Orca ID</th>
                     <th className="w-12"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {items.map((item) => (
                     <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-center">
                           <input 
                             type="checkbox"
                             checked={item.is_done || false}
                             onChange={(e) => updateItem(item.id, 'is_done', e.target.checked)}
                             className="w-5 h-5 rounded border-slate-300 text-[#0176D3] focus:ring-[#0176D3] accent-[#0176D3] cursor-pointer"
                           />
                        </td>
                        <td className="px-6 py-3">
                           <input 
                             className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-[#0176D3] rounded px-2 py-1.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder-slate-300"
                             value={item.piece || ''}
                             onChange={(e) => updateItem(item.id, 'piece', e.target.value)}
                             placeholder="Item Name"
                           />
                        </td>
                        <td className="px-6 py-3">
                           <input 
                             type="number"
                             className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-[#0176D3] rounded px-2 py-1.5 text-sm outline-none transition-all"
                             value={item.quantity || 1}
                             onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                           />
                        </td>
                        <td className="px-6 py-3">
                           <input 
                             className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-[#0176D3] rounded px-2 py-1.5 text-sm font-medium text-[#0176D3] outline-none transition-all placeholder-slate-300"
                             value={item.serial || ''}
                             onChange={(e) => updateItem(item.id, 'serial', e.target.value)}
                             placeholder="---"
                           />
                        </td>
                        <td className="px-6 py-3">
                           <input 
                             className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-[#0176D3] rounded px-2 py-1.5 text-sm text-slate-600 outline-none transition-all placeholder-slate-300"
                             value={item.orca_id || ''}
                             onChange={(e) => updateItem(item.id, 'orca_id', e.target.value)}
                             placeholder="---"
                           />
                        </td>
                        <td className="px-4 py-3 text-right">
                           <button 
                             onClick={() => deleteItem(item.id)} 
                             className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                             title="Remove Item"
                           >
                             <Trash2 size={16}/>
                           </button>
                        </td>
                     </tr>
                   ))}
                   {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 text-sm italic">
                          No items in this order.
                        </td>
                      </tr>
                   )}
                 </tbody>
               </table>
               
               <button 
                 onClick={addItem}
                 className="w-full py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-[#0176D3] transition-colors flex items-center justify-center gap-2 border-t border-slate-200"
               >
                 <Plus size={16} /> Add New Line Item
               </button>
            </div>
        </div>

      </main>
    </div>
  );
}