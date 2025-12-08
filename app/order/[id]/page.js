'use client';
import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Calendar, Ship, Box, CheckCircle2, Circle } from 'lucide-react';

export default function OrderDetails({ params }) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    setOrder(orderData);
    setItems(itemData || []);
    setLoading(false);
  }

  async function updateOrder(field, value) {
    setOrder({ ...order, [field]: value });
    await supabase.from('orders').update({ [field]: value }).eq('id', orderId);
  }

  async function updateItem(itemId, field, value) {
    const newItems = items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
    setItems(newItems);
    await supabase.from('order_items').update({ [field]: value }).eq('id', itemId);
  }

  async function addItem() {
    const newItem = { order_id: orderId, piece: '', quantity: 1, serial: '', is_done: false };
    const tempId = Math.random(); 
    setItems([...items, { ...newItem, id: tempId }]);
    const { data } = await supabase.from('order_items').insert([newItem]).select().single();
    if(data) setItems(prev => prev.map(i => i.id === tempId ? data : i));
  }

  async function deleteItem(itemId) {
    if(!confirm('Are you sure?')) return;
    setItems(items.filter(i => i.id !== itemId));
    await supabase.from('order_items').delete().eq('id', itemId);
  }

  if (loading) return <div className="p-10 text-slate-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Highlights Panel (Header) */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <button onClick={() => router.push('/')} className="text-xs font-bold text-blue-600 hover:underline mb-3 flex items-center gap-1">
            <ArrowLeft size={12} /> BACK TO LIST
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded flex items-center justify-center">
                 <Box size={24} />
               </div>
               <div>
                 <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                   {order.vessel || 'Unknown Vessel'}
                   <span className="text-lg font-normal text-slate-400">#{order.order_number}</span>
                 </h1>
                 <p className="text-sm text-slate-500 mt-1">Type: {order.type} • Created {new Date(order.created_at).toLocaleDateString()}</p>
               </div>
            </div>

            {/* Status Actions */}
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
               {['New', 'In preparation', 'Ready for Pickup', 'Shipped'].map((status) => (
                 <button
                   key={status}
                   onClick={() => updateOrder('status', status)}
                   className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                     order.status === status 
                     ? 'bg-blue-600 text-white shadow-sm' 
                     : 'text-slate-500 hover:bg-slate-200'
                   }`}
                 >
                   {status}
                 </button>
               ))}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Details Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700">Order Details</h3>
            </div>
            <div className="p-4 space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Vessel Name</label>
                 <input 
                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none" 
                   value={order.vessel || ''} 
                   onChange={(e) => updateOrder('vessel', e.target.value)}
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Pickup Date</label>
                 <input 
                   type="date"
                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-600" 
                   value={order.pickup_date || ''} 
                   onChange={(e) => updateOrder('pickup_date', e.target.value)}
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Kit Type</label>
                 <select 
                   className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white" 
                   value={order.type || ''} 
                   onChange={(e) => updateOrder('type', e.target.value)}
                 >
                   <option>Full system</option>
                   <option>Upgrade</option>
                   <option>Replacement</option>
                 </select>
               </div>
            </div>
          </div>
        </div>

        {/* Right Col: Related List (Items) */}
        <div className="lg:col-span-2">
           <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700">Order Line Items ({items.length})</h3>
                <button onClick={addItem} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                   <Plus size={14}/> Add New
                </button>
              </div>
              
              <table className="w-full text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Done</th>
                    <th className="px-4 py-2 font-semibold">Item / Piece</th>
                    <th className="px-4 py-2 font-semibold w-20">Qty</th>
                    <th className="px-4 py-2 font-semibold">Serial #</th>
                    <th className="px-4 py-2 font-semibold">Orca ID</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50">
                       <td className="px-4 py-3 w-10">
                          <button 
                            onClick={() => updateItem(item.id, 'is_done', !item.is_done)}
                            className={item.is_done ? "text-green-600" : "text-slate-300 hover:text-slate-400"}
                          >
                            {item.is_done ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                          </button>
                       </td>
                       <td className="px-4 py-2">
                          <input 
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-500 rounded px-2 py-1 text-sm outline-none transition-all"
                            value={item.piece || ''}
                            onChange={(e) => updateItem(item.id, 'piece', e.target.value)}
                            placeholder="Item Name"
                          />
                       </td>
                       <td className="px-4 py-2">
                          <input 
                            type="number"
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-500 rounded px-2 py-1 text-sm outline-none transition-all"
                            value={item.quantity || 1}
                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          />
                       </td>
                       <td className="px-4 py-2">
                          <input 
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-500 rounded px-2 py-1 text-sm outline-none transition-all text-blue-600 font-medium"
                            value={item.serial || ''}
                            onChange={(e) => updateItem(item.id, 'serial', e.target.value)}
                            placeholder="Enter Serial"
                          />
                       </td>
                       <td className="px-4 py-2">
                          <input 
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-500 rounded px-2 py-1 text-sm outline-none transition-all"
                            value={item.orca_id || ''}
                            onChange={(e) => updateItem(item.id, 'orca_id', e.target.value)}
                            placeholder="O-xxxx"
                          />
                       </td>
                       <td className="px-4 py-2 text-right">
                          <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14}/>
                          </button>
                       </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                     <tr>
                       <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm italic">
                         No items yet. Click "Add New" to start.
                       </td>
                     </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      </main>
    </div>
  );
}