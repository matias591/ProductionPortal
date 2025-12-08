'use client';
import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Box, Calendar, Ship } from 'lucide-react';

export default function OrderDetails({ params }) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Fetch Order
    const { data: orderData, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (orderError) console.error("Order Error:", orderError);

    // Fetch Items
    const { data: itemData, error: itemError } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    if (itemError) console.error("Item Error:", itemError);
    
    setOrder(orderData);
    setItems(itemData || []);
    setLoading(false);
  }

  async function updateOrder(field, value) {
    setOrder({ ...order, [field]: value });
    await supabase.from('orders').update({ [field]: value }).eq('id', orderId);
  }

  async function updateItem(itemId, field, value) {
    // Optimistic Update
    const newItems = items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
    setItems(newItems);
    
    // Database Update
    await supabase.from('order_items').update({ [field]: value }).eq('id', itemId);
  }

  async function addItem() {
    const newItem = { 
      order_id: orderId, 
      piece: '', 
      quantity: 1, 
      serial: '', 
      is_done: false 
    };

    // 1. Insert into DB FIRST to check for errors
    const { data, error } = await supabase.from('order_items').insert([newItem]).select().single();

    if (error) {
      alert("Error saving item: " + error.message);
      console.error(error);
    } else {
      // 2. Only update UI if DB insert worked
      setItems([...items, data]);
    }
  }

  async function deleteItem(itemId) {
    if(!confirm('Remove this item?')) return;
    setItems(items.filter(i => i.id !== itemId));
    await supabase.from('order_items').delete().eq('id', itemId);
  }

  if (loading) return <div className="p-10 text-center font-sans text-gray-500">Loading Order...</div>;

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 font-sans pb-20">
      
      {/* Top Header Panel */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button onClick={() => router.push('/')} className="text-xs font-bold text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1 uppercase tracking-wide">
            <ArrowLeft size={12} /> Back to List
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-4">
               {/* Icon Box */}
               <div className="w-12 h-12 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg flex items-center justify-center">
                 <Box size={24} />
               </div>
               {/* Title Area */}
               <div>
                 <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900">{order.vessel || 'No Vessel Name'}</h1>
                    <span className="text-xl text-slate-400 font-light">#{order.order_number}</span>
                 </div>
                 <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-600 border border-slate-200">
                        {order.type}
                    </span>
                    <span>Created: {new Date(order.created_at).toLocaleDateString()}</span>
                 </div>
               </div>
            </div>

            {/* Status Selector */}
            <div className="flex flex-col items-end">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Status</label>
                <select 
                  value={order.status || 'New'} 
                  onChange={(e) => updateOrder('status', e.target.value)}
                  className="bg-white border border-gray-300 text-slate-900 text-sm font-semibold rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-40 p-2 cursor-pointer outline-none"
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

      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                <Ship size={14} /> Vessel Name
            </label>
            <input 
              className="w-full text-base font-medium border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 placeholder-slate-300"
              placeholder="Enter vessel name..."
              value={order.vessel || ''} 
              onChange={(e) => updateOrder('vessel', e.target.value)}
            />
          </div>
          
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                <Calendar size={14} /> Pickup Date
            </label>
            <input 
              type="date"
              className="w-full text-base font-medium border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700"
              value={order.pickup_date || ''} 
              onChange={(e) => updateOrder('pickup_date', e.target.value)}
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
           <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">Line Items</h3>
              <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-gray-200">
                {items.length} Items
              </span>
           </div>
           
           <table className="w-full text-left border-collapse">
             <thead className="bg-white border-b border-gray-200 text-xs uppercase text-slate-400 font-semibold">
               <tr>
                 <th className="px-6 py-3 w-16 text-center">Status</th>
                 <th className="px-6 py-3">Item Name</th>
                 <th className="px-6 py-3 w-24">Qty</th>
                 <th className="px-6 py-3">Serial #</th>
                 <th className="px-6 py-3">Orca ID</th>
                 <th className="w-16"></th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {items.map((item) => (
                 <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-3 text-center">
                       <input 
                         type="checkbox"
                         checked={item.is_done || false}
                         onChange={(e) => updateItem(item.id, 'is_done', e.target.checked)}
                         className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                       />
                    </td>
                    <td className="px-6 py-3">
                       <input 
                         className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded px-2 py-1.5 text-sm outline-none transition-all font-medium text-slate-900"
                         value={item.piece || ''}
                         onChange={(e) => updateItem(item.id, 'piece', e.target.value)}
                         placeholder="Enter Item Name"
                       />
                    </td>
                    <td className="px-6 py-3">
                       <input 
                         type="number"
                         className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded px-2 py-1.5 text-sm outline-none transition-all"
                         value={item.quantity || 1}
                         onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                       />
                    </td>
                    <td className="px-6 py-3">
                       <input 
                         className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded px-2 py-1.5 text-sm outline-none transition-all text-blue-600 font-medium placeholder-slate-300"
                         value={item.serial || ''}
                         onChange={(e) => updateItem(item.id, 'serial', e.target.value)}
                         placeholder="---"
                       />
                    </td>
                    <td className="px-6 py-3">
                       <input 
                         className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded px-2 py-1.5 text-sm outline-none transition-all text-slate-600 placeholder-slate-300"
                         value={item.orca_id || ''}
                         onChange={(e) => updateItem(item.id, 'orca_id', e.target.value)}
                         placeholder="---"
                       />
                    </td>
                    <td className="px-4 py-3 text-right">
                       <button 
                         onClick={() => deleteItem(item.id)} 
                         className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                         title="Remove Item"
                       >
                         <Trash2 size={16}/>
                       </button>
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
           
           <button 
             onClick={addItem}
             className="w-full py-4 text-sm font-semibold text-slate-600 hover:bg-gray-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 border-t border-gray-200"
           >
             <Plus size={18} /> Add New Line Item
           </button>
        </div>

      </main>
    </div>
  );
}