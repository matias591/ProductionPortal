'use client';
import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

export default function OrderDetails({ params }) {
  // Unwrap params for Next.js 15+ support
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;

  const [items, setItems] = useState([]);
  const [order, setOrder] = useState(null);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // 1. Get Order Info
    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    setOrder(orderData);

    // 2. Get Items
    const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('piece');
    setItems(itemData || []);
  }

  async function updateItem(itemId, field, value) {
    // Optimistic Update
    const newItems = items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
    setItems(newItems);

    // Save to DB
    await supabase.from('order_items').update({ [field]: value }).eq('id', itemId);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <div className="max-w-5xl mx-auto px-6 py-10">
        
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-black mb-6">
          <ArrowLeft size={16} className="mr-2"/> Back to Orders
        </button>

        {order && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h1 className="text-2xl font-bold mb-4">Order #{order.order_number}</h1>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold">Vessel:</span> {order.vessel}</div>
              <div><span className="font-semibold">Type:</span> {order.type}</div>
            </div>
          </div>
        )}

        <table className="w-full text-left border border-gray-200 rounded-lg">
          <thead className="bg-gray-100 text-xs uppercase font-medium text-gray-600">
            <tr>
              <th className="px-4 py-3">Piece</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Serial</th>
              <th className="px-4 py-3">OrcaID</th>
              <th className="px-4 py-3 text-center">Done?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.piece}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                
                {/* Serial Input */}
                <td className="px-4 py-3">
                  <input 
                    type="text" 
                    value={item.serial || ''}
                    onChange={(e) => updateItem(item.id, 'serial', e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 w-full text-sm focus:border-black focus:outline-none"
                    placeholder="Enter Serial"
                  />
                </td>

                {/* OrcaID Input */}
                <td className="px-4 py-3">
                  <input 
                    type="text" 
                    value={item.orca_id || ''}
                    onChange={(e) => updateItem(item.id, 'orca_id', e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 w-full text-sm focus:border-black focus:outline-none"
                    placeholder="O-xxxx"
                  />
                </td>

                {/* Checkbox */}
                <td className="px-4 py-3 text-center">
                  <input 
                    type="checkbox"
                    checked={item.is_done || false}
                    onChange={(e) => updateItem(item.id, 'is_done', e.target.checked)}
                    className="w-5 h-5 text-black rounded focus:ring-black"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}