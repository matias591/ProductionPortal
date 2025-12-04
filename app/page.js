'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Package } from 'lucide-react';

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize Supabase inside component
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    checkUser();
    fetchOrders();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) router.push('/login');
  }

  async function fetchOrders() {
    // We select orders and COUNT the items inside them for the "Kit" column preview
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="border-b border-gray-200 bg-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">Production Portal</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-black flex items-center gap-2">
          <LogOut size={16} /> Sign Out
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Orders</h2>
          <button className="bg-black text-white px-4 py-2 rounded-md text-sm flex items-center gap-2">
            <RefreshCw size={16} /> Sync Salesforce
          </button>
        </div>

        <div className="border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Order Number</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Vessel</th>
                <th className="px-6 py-3">Pickup Date</th>
                <th className="px-6 py-3">Kit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.map((order) => (
                <tr 
                  key={order.id} 
                  onClick={() => router.push(`/order/${order.id}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-blue-600 hover:underline">{order.order_number}</td>
                  <td className="px-6 py-4 text-sm">{order.type}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${order.status === 'New' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{order.vessel}</td>
                  <td className="px-6 py-4 text-sm">{order.pickup_date || '-'}</td>
                  <td className="px-6 py-4 text-sm">{order.kit || 'Standard'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && !loading && (
            <div className="p-10 text-center text-gray-500">No orders found.</div>
          )}
        </div>
      </main>
    </div>
  );
}