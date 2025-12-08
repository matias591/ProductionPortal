'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Plus, Search, Ship, Filter, ChevronDown, LayoutGrid, List } from 'lucide-react';

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
    if (!error) {
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

  // Status Badge Helper
  const getStatusColor = (status) => {
    switch(status) {
      case 'New': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'In preparation': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Shipped': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* SF Style Navbar */}
      <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-blue-200 shadow-lg">
             {/* Logo Placeholder */}
             <span className="text-white font-bold text-lg">OA</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-none">Production Portal</h1>
            <p className="text-xs text-slate-500 mt-1">Vendor Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200">
            V
          </div>
          <button onClick={handleLogout} className="text-xs font-medium text-slate-500 hover:text-red-600">
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        
        {/* Page Header / Highlights */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <span>Home</span>
              <span>/</span>
              <span>Orders</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">All Shipments</h2>
            <p className="text-sm text-slate-500">{orders.length} items • Sorted by Date</p>
          </div>
          
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 shadow-sm flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm flex items-center gap-2"
            >
              <Plus size={16} /> New Order
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-3 rounded-t-lg border border-slate-200 border-b-0 flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search list..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded"><Filter size={16}/></button>
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded"><LayoutGrid size={16}/></button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="bg-white border border-slate-200 rounded-b-lg shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-32">Order #</th>
                <th className="px-4 py-3">Vessel Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Pickup Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr 
                  key={order.id} 
                  onClick={() => router.push(`/order/${order.id}`)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 font-medium text-blue-600 hover:underline">
                    {order.order_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                    {order.vessel}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {order.type}
                  </td>
                   <td className="px-4 py-3 text-sm text-slate-600">
                    {order.pickup_date || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-slate-400 text-xs group-hover:text-blue-600 font-medium">View</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Salesforce Style Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">New Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                   <label className="block text-xs font-bold text-slate-500 mb-1">Order Number <span className="text-red-500">*</span></label>
                   <input name="order_number" required className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                   <label className="block text-xs font-bold text-slate-500 mb-1">Vessel Name <span className="text-red-500">*</span></label>
                   <input name="vessel" required className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                   <select name="type" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white">
                     <option>Full system</option>
                     <option>Upgrade - Seapod</option>
                     <option>Replacement</option>
                   </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}