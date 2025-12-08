'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Plus, Search, Ship, Calendar, Box, ChevronRight, X } from 'lucide-react';

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
    checkUser();
    fetchOrders();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) router.push('/login');
  }

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newOrder = {
      order_number: formData.get('order_number'),
      vessel: formData.get('vessel'),
      type: formData.get('type'),
      status: 'New',
      kit: 'Standard'
    };

    const { error } = await supabase.from('orders').insert([newOrder]);
    if (error) {
      alert('Error creating order');
    } else {
      setShowCreateModal(false);
      fetchOrders();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const filteredOrders = orders.filter(o => 
    o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.vessel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans selection:bg-gray-100">
      
      {/* Modern Navbar */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 h-16 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* Logo Concept */}
          <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-bold text-lg tracking-tighter shadow-sm">
            OA
          </div>
          <span className="font-semibold text-sm tracking-tight text-gray-900">Production Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-px bg-gray-200"></div>
          <button onClick={handleLogout} className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors flex items-center gap-2">
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Orders</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage incoming requests and production queues.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 shadow-sm">
              <RefreshCw size={14} /> Sync Salesforce
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus size={16} /> Create Order
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search orders by number or vessel..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 shadow-sm transition-all"
          />
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr 
                  key={order.id} 
                  onClick={() => router.push(`/order/${order.id}`)}
                  className="group hover:bg-gray-50 cursor-pointer transition-all duration-200"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">#{order.order_number}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Ship size={14} className="text-gray-400" />
                      {order.vessel}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {order.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                      ${order.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                        order.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' :
                        'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'New' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-black ml-auto transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && !loading && (
            <div className="p-16 text-center text-gray-500">
              <Box size={40} className="mx-auto mb-4 text-gray-300" />
              <p>No orders found. Create one to get started.</p>
            </div>
          )}
        </div>
      </main>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">New Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-black">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Order Number</label>
                <input name="order_number" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black/5 outline-none" placeholder="e.g. 1564654" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vessel Name</label>
                <input name="vessel" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black/5 outline-none" placeholder="e.g. Evergreen A" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select name="type" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black/5 outline-none">
                  <option>Full system</option>
                  <option>Upgrade - Seapod</option>
                  <option>Replacement</option>
                  <option>Spare Parts</option>
                </select>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors">
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