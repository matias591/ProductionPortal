'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Plus, Search, Ship, ChevronRight, UserCog, UserCircle, Filter, LayoutGrid } from 'lucide-react';

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // User State
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); // <--- Controls what buttons they see
  
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
    if (!session) {
      router.push('/login');
    } else {
      setUserEmail(session.user.email);
      
      // CHECK ROLE FROM PROFILES TABLE
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.role === 'admin') {
        setIsAdmin(true);
      }
    }
  }

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('order_number', { ascending: false }); // Latest numbers first
    setOrders(data || []);
    setLoading(false);
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Auto-generate a random ID for the DB (The DB Serial will handle the official number)
    const newOrder = {
      vessel: formData.get('vessel') || 'Unknown Vessel',
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
      
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#0176D3] rounded-lg flex items-center justify-center shadow-lg shadow-blue-200/50">
             <span className="text-white font-bold text-lg tracking-tight">OA</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-none">Production Portal</h1>
            <p className="text-xs text-slate-500 mt-1">Vendor Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right">
            <div className="hidden md:block">
                <p className="text-xs font-semibold text-slate-700">{userEmail}</p>
                <p className="text-[10px] text-slate-400 capitalize">{isAdmin ? 'Administrator' : 'Vendor'}</p>
            </div>
            <UserCircle size={32} className="text-slate-400" />
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-slate-500 hover:text-red-600 border-l border-slate-200 pl-4 ml-2 flex items-center gap-1">
            <LogOut size={14}/> Log Out
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        
        {/* Header Actions - HIDDEN FOR VENDORS */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <span>Home</span>
              <span className="text-slate-300">/</span>
              <span>Orders</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">All Shipments</h2>
            <p className="text-sm text-slate-500">{orders.length} items • Sorted by Date</p>
          </div>
          
          <div className="flex gap-3">
            {/* ONLY ADMINS SEE THESE BUTTONS */}
            {isAdmin && (
              <>
                <button 
                  onClick={() => router.push('/admin/users')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <UserCog size={16} /> Users
                </button>
                <button className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-all">
                  <RefreshCw size={14} /> Sync
                </button>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-[#0176D3] text-white text-sm font-semibold rounded-md hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center gap-2 transition-all"
                >
                  <Plus size={16} /> New Order
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="bg-white p-3 rounded-t-lg border border-slate-200 border-b-0 flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by ID or Vessel..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#0176D3] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded border border-slate-200"><Filter size={16}/></button>
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded border border-slate-200"><LayoutGrid size={16}/></button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-slate-200 rounded-b-lg shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200">
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
                  <td className="px-4 py-3 font-semibold text-[#0176D3] hover:underline">
                    {order.order_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                    <div className="flex items-center gap-2">
                       {order.vessel ? <Ship size={14} className="text-slate-400"/> : null}
                       {order.vessel || <span className="text-slate-400 italic">No Vessel Name</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {order.type}
                  </td>
                   <td className="px-4 py-3 text-sm text-slate-600">
                    {order.pickup_date || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-slate-400 text-xs group-hover:text-[#0176D3] font-bold uppercase flex items-center justify-end gap-1">
                        View <ChevronRight size={14}/>
                    </span>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400">
                        No orders found.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create Modal (Only Admin can trigger this via button) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">New Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                 <p className="text-xs text-blue-800 font-semibold">
                    Order Number will be auto-generated by the system.
                 </p>
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Vessel Name (Optional)</label>
                 <input name="vessel" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none" placeholder="e.g. Evergreen A" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                 <select name="type" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none bg-white">
                   <option>Full system</option>
                   <option>Upgrade</option>
                   <option>Replacement</option>
                   <option>Spare Parts</option>
                 </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-slate-300 rounded text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#0176D3] text-white rounded text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all">Save Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}