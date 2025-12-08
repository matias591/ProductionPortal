'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Plus, Search, Ship, Calendar, ChevronRight } from 'lucide-react';

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
    // Supabase sorts numbers correctly now
    const { data } = await supabase.from('orders').select('*').order('order_number', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // We DO NOT send order_number. The database generates it now (1001, 1002...)
    const newOrder = {
      vessel: formData.get('vessel') || null, // Sends null if empty
      type: formData.get('type'),
      status: 'New',
      kit: 'Standard'
    };

    const { error } = await supabase.from('orders').insert([newOrder]);
    if (!error) {
      setShowCreateModal(false);
      fetchOrders();
    } else {
      alert("Error: " + error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const filteredOrders = orders.filter(o => 
    o.order_number?.toString().includes(searchTerm) || 
    o.vessel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      
      {/* Professional Header */}
      <header className="border-b border-slate-100 bg-white h-16 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
             {/* New Minimal Logo */}
             <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><path d="M12 2L2 12h20L12 2z"/></svg>
             </div>
             <span className="font-bold text-lg tracking-tight text-slate-900">Orca Production</span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-500 hover:text-black">
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Orders</h1>
            <p className="text-slate-500 mt-1 text-sm">Manage production queue and shipments.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2">
              <RefreshCw size={14} /> Sync
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
            >
              <Plus size={16} /> Create Order
            </button>
          </div>
        </div>

        {/* Search Filter */}
        <div className="mb-6 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          {/* Added pl-10 to prevent overlapping text */}
          <input 
            type="text" 
            placeholder="Search by ID or Vessel..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-slate-400 transition-all"
          />
        </div>

        {/* Clean Table */}
        <div className="border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vessel</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order) => (
                <tr 
                  key={order.id} 
                  onClick={() => router.push(`/order/${order.id}`)}
                  className="group hover:bg-slate-50 cursor-pointer transition-all"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono font-medium text-slate-900">#{order.order_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                      {order.vessel ? (
                        <>
                          <Ship size={14} className="text-slate-400" />
                          {order.vessel}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">No Vessel Name</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {order.type}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                      ${order.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                      {order.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-black transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && !loading && (
             <div className="p-12 text-center text-slate-400 text-sm">No orders found.</div>
          )}
        </div>
      </main>

      {/* Clean Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-xl text-slate-900 mb-6">Create New Order</h3>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vessel Name <span className="text-slate-300 font-normal">(Optional)</span></label>
                <input name="vessel" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" placeholder="e.g. Evergreen" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                <select name="type" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-black outline-none bg-white">
                  <option>Full system</option>
                  <option>Upgrade</option>
                  <option>Replacement</option>
                  <option>Spare Parts</option>
                </select>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-slate-800">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}