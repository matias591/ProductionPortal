'use client';
import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Check, Box } from 'lucide-react';

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
    if(!confirm('Remove item?')) return;
    setItems(items.filter(i => i.id !== itemId));
    await supabase.from('order_items').delete().eq('id', itemId);
  }

  if (loading) return <div className="p-10 text-slate-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      
      {/* Header Panel */}
      <div className="border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button onClick={() => router.push('/')} className="text-xs font-bold text-slate-400 hover:text-black mb-4 flex items-center gap-2">
            <ArrowLeft size={14} /> Back to Orders
          </button>
          
          <div className="flex justify-between items-start">
            <div>
               <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                 Order #{order.order_number}
                 <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-full">
                   {order.type}
                 </span>
               </h1>
               <p className="text-slate-500 mt-1 text-sm">Created on {new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Status</div>
                <select 
                  value={order.status || 'New'} 
                  onChange={(e) => updateOrder('status', e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-lg focus:ring-black focus:border-black block p-2.5 outline-none"
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

      <main className="max-w-5xl mx-auto px-6 py-8">
        
        {/* Detail Form */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Vessel Name</label>
            <input 
              className="w-full text-lg font-medium border-b border-slate-200 py-1 focus:border-black focus:outline-none placeholder-slate-300"
              placeholder="No vessel name"
              value={order.vessel || ''} 
              onChange={(e) => updateOrder('vessel', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Pickup Date</label>
            <input 
              type="date"
              className="w-full text-lg font-medium border-b border-slate-200 py-1 focus:border-black focus:outline-none text-slate-700"
              value={order.pickup_date || ''} 
              onChange={(e) => updateOrder('pickup_date', e.target.value)}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
           <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-700">Line Items</h3>
           </div>
           
           <table className="w-full text-left">
             <thead className="bg-white border-b border-slate-100 text-xs uppercase text-slate-400 font-semibold">
               <tr>
                 <th className="px-6 py-3 w-12">Done</th>
                 <th className="px-6 py-3">Item Name</th>
                 <th className="px-6 py-3 w-24">Qty</th>
                 <th className="px-6 py-3">Serial #</th>
                 <th className="px-6 py-3">Orca ID</th>
                 <th className="w-10"></th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {items.map((item) => (
                 <tr key={item.id} className="group hover:bg-slate-50">
                    <td className="px-6 py-3 text-center">
                       <input 
                         type="checkbox"
                         checked={item.is_done || false}
                         onChange={(e) => updateItem(item.id, 'is_done', e.target.checked)}
                         className="w-5 h-5 rounded border-slate-300 text-black focus:ring-black accent-black cursor-pointer"
                       />
                    </td>
                    <td className="px-6 py-3">
                       <input 
                         className="w-full bg-transparent border-none focus:ring-0 font-medium text-slate-900 placeholder-slate-300 p-0"
                         value={item.piece || ''}
                         onChange={(e) => updateItem(item.id, 'piece', e.target.value)}
                         placeholder="Item Name"
                       />
                    </td>
                    <td className="px-6 py-3">
                       <input 
                         type="number"
                         className="w-full bg-transparent border-none focus:ring-0 p-0"
                         value={item.quantity || 1}
                         onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                       />
                    </td>
                    <td className="px-6 py-3">
                       <input 
                         className="w-full bg-transparent border-none focus:ring-0 text-blue-600 font-medium placeholder-slate-300 p-0"
                         value={item.serial || ''}
                         onChange={(e) => updateItem(item.id, 'serial', e.target.value)}
                         placeholder="---"
                       />
                    </td>
                    <td className="px-6 py-3">
                       <input 
                         className="w-full bg-transparent border-none focus:ring-0 text-slate-600 placeholder-slate-300 p-0"
                         value={item.orca_id || ''}
                         onChange={(e) => updateItem(item.id, 'orca_id', e.target.value)}
                         placeholder="---"
                       />
                    </td>
                    <td className="px-4 py-3 text-right">
                       <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                         <Trash2 size={16}/>
                       </button>
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
           
           <button 
             onClick={addItem}
             className="w-full py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-black transition-colors flex items-center justify-center gap-2 border-t border-slate-100"
           >
             <Plus size={16} /> Add Item
           </button>
        </div>

      </main>
    </div>
  );
}