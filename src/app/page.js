'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RefreshCw, Package, CheckCircle2, Circle, Search } from 'lucide-react';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const { data } = await supabase
      .from('production_orders')
      .select('*')
      .order('product_name');
    setOrders(data || []);
    setLoading(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync');
      const json = await res.json();
      if(json.error) {
        alert("Sync Error: " + json.error);
      } else {
        await fetchOrders();
      }
    } catch (e) {
      alert("System Error during sync");
    }
    setSyncing(false);
  }

  async function updateSerial(id, serialNumber) {
    // Optimistic UI update
    setOrders(orders.map(o => o.id === id ? { ...o, serial_number: serialNumber } : o));
    
    await supabase
      .from('production_orders')
      .update({ serial_number: serialNumber, status: serialNumber ? 'Completed' : 'Pending' })
      .eq('id', id);
  }

  // Filter logic
  const filteredOrders = orders.filter(order => 
    order.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-100">
      
      {/* Top Navigation - Minimal */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="font-semibold text-sm tracking-tight">Production Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">v1.0.0</span>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
              V
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Shipments</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Manage production queue and assign serial numbers.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
              ${syncing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800 shadow-sm hover:shadow'
              }`}
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? 'Syncing...' : 'Sync Salesforce'}
          </button>
        </div>

        {/* Filters & Search */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Search by product or serial..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all"
            />
          </div>
        </div>

        {/* The List (Data Table) */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-gray-500 text-sm">Loading records...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <Package size={32} className="text-gray-300" />
              <p className="text-gray-500 text-sm">No active shipments found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Product / Item</th>
                  <th className="py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Input</th>
                  <th className="py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const isCompleted = !!order.serial_number;
                  return (
                    <tr key={order.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-medium text-sm text-gray-900">{order.product_name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{order.sf_id}</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {order.vendor_name || '—'}
                      </td>
                      <td className="py-4 px-6">
                        <input 
                          type="text" 
                          defaultValue={order.serial_number}
                          onBlur={(e) => updateSerial(order.id, e.target.value)}
                          placeholder="Add serial..."
                          className="w-full bg-transparent border-b border-transparent group-hover:border-gray-300 focus:border-black focus:outline-none py-1 text-sm text-gray-900 placeholder-gray-300 transition-all"
                        />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                          ${isCompleted 
                            ? 'bg-green-50 text-green-700 border-green-100' 
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                          {isCompleted ? 'Ready' : 'Pending'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="mt-6 text-center text-xs text-gray-400">
          Showing {filteredOrders.length} records. Data synced from Salesforce.
        </div>
      </main>
    </div>
  );
}