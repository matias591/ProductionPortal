'use client';
import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Calendar, Ship, Box } from 'lucide-react';

export default function OrderDetails({ params }) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Supabase inside component
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

  // Update Order Meta Data (Status, Vessel, etc)
  async function updateOrder(field, value) {
    setOrder({ ...order, [field]: value }); // Optimistic UI
    await supabase.from('orders').update({ [field]: value }).eq('id', orderId);
  }

  // Update a Line Item
  async function updateItem(itemId, field, value) {
    const newItems = items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
    setItems(newItems);
    await supabase.from('order_items').update({ [field]: value }).eq('id', itemId);
  }

  // Add a new Item
  async function addItem() {
    const newItem = {
      order_id: orderId,
      piece: 'New Item',
      quantity: 1,
      serial: '',
      is_done: false
    };
    
    // Optimistic add to UI
    const tempId = Math.random(); 
    setItems([...items, { ...newItem, id: tempId }]);

    // Save to DB and refresh to get real ID
    const { data } = await supabase.from('order_items').insert([newItem]).select().single();
    if(data) {
        // Replace temp item with real DB item
        setItems(prev => prev.map(i => i.id === tempId ? data : i));
    }
  }

  // Delete an Item
  async function deleteItem(itemId) {
    if(!confirm('Delete this item?')) return;
    setItems(items.filter(i => i.id !== itemId));
    await supabase.from('order_items').delete().eq('id', itemId);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading details...</div>;

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans">
      <div className="max-w-5xl mx-auto px-6 py-10">
        
        {/* Navigation */}
        <button onClick={() => router.push('/')} className="group flex items-center text-sm text-gray-500 hover:text-black mb-8 transition-colors">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform"/> 
          Back to Dashboard
        </button>

        {/* Editable Order Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 pb-6 border-b border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Order Number</label>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">#{order.order_number}</h1>
            </div>
            
            {/* Status Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Status</label>
              <select 
                value={order.status || 'New'} 
                onChange={(e) => updateOrder('status', e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block w-40 p-2.5 font-medium"
              >
                <option value="New">New</option>
                <option value="In preparation">In preparation</option>
                <option value="Ready for Pickup">Ready for Pickup</option>
                <option value="Shipped">Shipped</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                <Ship size={14} /> Vessel Name
              </label>
              <input 
                type="text" 
                value={order.vessel || ''} 
                onChange={(e) => updateOrder('vessel', e.target.value)}
                className="w-full border-b border-gray-200 py-1 text-sm font-medium focus:border-black focus:outline-none bg-transparent transition-colors hover:border-gray-300"
              />
            </div>
            <div className="group">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                <Box size={14} /> Type / Kit
              </label>
              <select 
                value={order.type || ''} 
                onChange={(e) => updateOrder('type', e.target.value)}
                className="w-full border-b border-gray-200 py-1 text-sm font-medium focus:border-black focus:outline-none bg-transparent"
              >
                <option>Full system</option>
                <option>Upgrade - Seapod</option>
                <option>Replacement</option>
                <option>Spare Parts</option>
              </select>
            </div>
            <div className="group">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                <Calendar size={14} /> Pickup Date
              </label>
              <input 
                type="date" 
                value={order.pickup_date || ''} 
                onChange={(e) => updateOrder('pickup_date', e.target.value)}
                className="w-full border-b border-gray-200 py-1 text-sm font-medium focus:border-black focus:outline-none bg-transparent text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Order Items</h3>
            <span className="text-xs text-gray-500">{items.length} items</span>
          </div>
          
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Piece</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-24">Qty</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Serial Number</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Orca ID</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Done</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <input 
                      type="text" 
                      value={item.piece || ''} 
                      onChange={(e) => updateItem(item.id, 'piece', e.target.value)}
                      className="w-full bg-transparent font-medium text-gray-900 text-sm focus:outline-none border-b border-transparent focus:border-black placeholder-gray-300"
                      placeholder="Item Name"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input 
                      type="number" 
                      value={item.quantity || 1} 
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      className="w-full bg-transparent text-sm focus:outline-none border-b border-transparent focus:border-black"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input 
                      type="text" 
                      value={item.serial || ''} 
                      onChange={(e) => updateItem(item.id, 'serial', e.target.value)}
                      className="w-full bg-transparent text-sm focus:outline-none border-b border-transparent focus:border-blue-500 text-blue-600 placeholder-gray-300"
                      placeholder="---"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input 
                      type="text" 
                      value={item.orca_id || ''} 
                      onChange={(e) => updateItem(item.id, 'orca_id', e.target.value)}
                      className="w-full bg-transparent text-sm focus:outline-none border-b border-transparent focus:border-blue-500 placeholder-gray-300"
                      placeholder="---"
                    />
                  </td>
                  <td className="px-6 py-3 text-center">
                    <input 
                      type="checkbox"
                      checked={item.is_done || false}
                      onChange={(e) => updateItem(item.id, 'is_done', e.target.checked)}
                      className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black accent-black cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Add Item Button */}
          <button 
            onClick={addItem}
            className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-t border-gray-100"
          >
            <Plus size={14} /> Add Line Item
          </button>
        </div>
      </div>
    </div>
  );
}