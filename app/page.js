'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, Search, RefreshCw, ChevronRight, User } from 'lucide-react';

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else fetchOrders();
    });
  }, []);

  async function fetchOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) console.error("Error fetching:", error);
    setOrders(data || []);
    setLoading(false);
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // We send minimal data. The DB handles the ID and Order # automatically.
    const newOrder = {
      vessel: formData.get('vessel') || 'Unknown Vessel',
      type: formData.get('type'),
      status: 'New',
    };

    const { error } = await supabase.from('orders').insert([newOrder]);
    
    if (error) {
      alert("Failed to create: " + error.message);
    } else {
      setShowCreateModal(false);
      fetchOrders(); // Refresh the list
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // Filter Logic
  const filteredOrders = orders.filter(o => 
    o.order_number?.toString().includes(searchTerm) || 
    o.vessel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-[#0176D3] text-white p-1.5 rounded-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 12h20"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><path d="M12 2L2 12h20L12 2z"/></svg>
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">Production Portal</span>
        </div>
        <button onClick={handleLogout} className="text-sm font-semibold text-slate-500 hover:text-red-600 flex items-center gap-2">
           <LogOut size={16}/> Sign Out
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
            <p className="text-slate-500 text-sm mt-1">{orders.length} Active Shipments</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-[#0176D3] hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> New Order
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-t-lg border border-gray-200 border-b-0 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by Order # or Vessel..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none"
            />
          </div>
          <button onClick={fetchOrders} className="text-gray-500 hover:text-[#0176D3] p-2 bg-gray-50 rounded border border-gray-200">
            <RefreshCw size={16}/>
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-32">Order #</th>
                <th className="px-6 py-3">Vessel</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr 
                  key={order.id} 
                  onClick={() => router.push(`/order/${order.id}`)}
                  className="hover:bg-blue-50 cursor-pointer group transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-[#0176D3]">
                    #{order.order_number}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    {order.vessel}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {order.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-1 rounded text-xs font-bold">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight className="text-gray-300 group-hover:text-[#0176D3] ml-auto" size={18} />
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">New Production Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-black">✕</button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vessel Name</label>
                <input name="vessel" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#0176D3] outline-none" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Order Type</label>
                <select name="type" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#0176D3] outline-none bg-white">
                  <option>Full system</option>
                  <option>Upgrade</option>
                  <option>Replacement</option>
                  <option>Spare Parts</option>
                </select>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-[#0176D3] text-white font-bold py-2.5 rounded-md hover:bg-blue-700 transition-colors">
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}