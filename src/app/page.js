'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const { data } = await supabase.from('production_orders').select('*').order('product_name');
    setOrders(data || []);
    setLoading(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync');
      const json = await res.json();
      if(json.error) alert("Sync Error: " + json.error);
      await fetchOrders(); 
    } catch (e) {
      alert("System Error during sync");
    }
    setSyncing(false);
  }

  async function updateSerial(id, serialNumber) {
    // Optimistic UI update (feels faster)
    setOrders(orders.map(o => o.id === id ? { ...o, serial_number: serialNumber } : o));
    
    await supabase
      .from('production_orders')
      .update({ serial_number: serialNumber, status: serialNumber ? 'Completed' : 'Pending' })
      .eq('id', id);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="font-bold text-xl tracking-tight">Production Portal</div>
            <div className="text-sm text-gray-400">Logged in as Vendor</div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header Section */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Production Orders
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage serial numbers and track status.
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${syncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
              `}
            >
              {syncing ? 'Syncing...' : 'Sync Salesforce'}
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading data...</div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No orders found. Click "Sync" to pull from Salesforce.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.product_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.vendor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${order.serial_number ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.serial_number ? 'Completed' : 'Action Required'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <input 
                        type="text" 
                        defaultValue={order.serial_number}
                        onBlur={(e) => updateSerial(order.id, e.target.value)}
                        placeholder="Scan or Type..."
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}