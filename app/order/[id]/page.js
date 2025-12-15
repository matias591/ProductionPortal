'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Plus, Search, Ship, ChevronRight, Filter, LayoutGrid, Trash2 } from 'lucide-react';
import Sidebar from './components/Sidebar';

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [kitOptions, setKitOptions] = useState([]);
  const [loadingKits, setLoadingKits] = useState(true);
  
  const [selectedType, setSelectedType] = useState('Full system'); 
  const [selectedKitId, setSelectedKitId] = useState(''); 
  const [warehouse, setWarehouse] = useState('Orca');

  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    checkUser();
    fetchOrders();
    fetchKitsFromDB(); 
  }, []);

  useEffect(() => {
    if (kitOptions.length === 0) return;
    const defaults = {
        'Full system': 'MSC003',
        'Upgrade': 'UPGRD',
        'Replacement': 'REP001'
    };
    const targetKitName = defaults[selectedType];
    const targetKit = kitOptions.find(k => k.name === targetKitName);
    if (targetKit) setSelectedKitId(targetKit.id);
    else setSelectedKitId(''); 
  }, [selectedType, kitOptions]);

  async function fetchKitsFromDB() {
    const { data } = await supabase.from('kits').select('*').order('name');
    setKitOptions(data || []);
    setLoadingKits(false);
  }

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    } else {
      setUserEmail(session.user.email);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (profile?.role === 'admin') setIsAdmin(true);
    }
  }

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(piece, serial, orca_id)')
      .order('order_number', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedKitName = kitOptions.find(k => k.id === selectedKitId)?.name || 'Custom';

    const newOrder = {
      vessel: formData.get('vessel') || 'Unknown Vessel',
      type: selectedType,
      kit: selectedKitId ? selectedKitName : 'Custom', 
      warehouse: isAdmin ? formData.get('warehouse') : 'Bazz', 
      status: 'New'
    };

    const { data: orderData, error } = await supabase.from('orders').insert([newOrder]).select().single();
    
    if (error) { alert("Error: " + error.message); return; }

    if (selectedKitId) {
        // FETCH KIT ITEMS ORDERED BY SORT_ORDER
        const { data: templateItems } = await supabase.from('kit_items').select('*').eq('kit_id', selectedKitId).order('sort_order', { ascending: true });
        
        if (templateItems && templateItems.length > 0) {
            const { data: masterList } = await supabase.from('items').select('id, price');

            const itemsToInsert = templateItems.map((item, index) => {
                const masterPrice = masterList?.find(m => m.id === item.item_id)?.price || 0;
                return {
                    order_id: orderData.id,
                    piece: item.piece,
                    quantity: item.quantity,
                    serial: '',
                    is_done: false,
                    price: masterPrice,
                    sort_order: index + 1 // Save the order
                };
            });

            await supabase.from('order_items').insert(itemsToInsert);
        }
    }

    setShowCreateModal(false);
    fetchOrders();
  }

  // --- DELETE ORDER LOGIC ---
  async function handleDeleteOrder(e, order) {
    e.stopPropagation(); // Stop click from opening details
    
    // Status Check
    const allowedStatuses = ['New', 'In preparation', 'In Box'];
    if (!allowedStatuses.includes(order.status)) {
        alert("Cannot delete orders that are Ready, Shipped, or Completed.");
        return;
    }

    if (!confirm(`Are you sure you want to delete Order #${order.order_number}?`)) return;

    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    if (error) alert("Delete failed: " + error.message);
    else fetchOrders();
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
      case 'In Box': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Shipped': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getItemValue = (items, keyword, field) => {
    if (!items) return '-';
    const found = items.find(i => i.piece?.toLowerCase().includes(keyword.toLowerCase()));
    return found ? (found[field] || '-') : '-';
  };

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Orders</h1>
            <p className="text-slate-500 mt-1 text-sm">{orders.length} items • Sorted by Date</p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-[#0176D3] text-white text-sm font-semibold rounded-md hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center gap-2 transition-all">
                <Plus size={16} /> New Order
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-3 rounded-t-lg border border-slate-200 border-b-0 flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by ID or Vessel..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-[#0176D3] focus:border-transparent outline-none transition-all" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-b-lg shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-24">Order #</th>
                <th className="px-6 py-4 w-48">Vessel</th>
                <th className="px-6 py-4">Seapod S/N</th>
                <th className="px-6 py-4">Modem ID</th>
                <th className="px-6 py-4">PU ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} onClick={() => router.push(`/order/${order.id}`)} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                  <td className="px-6 py-4 font-semibold text-[#0176D3] hover:underline">{order.order_number}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                    <div className="flex items-center gap-2">{order.vessel ? <Ship size={14} className="text-slate-400"/> : null}{order.vessel || <span className="text-slate-400 italic">No Vessel Name</span>}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-600">{getItemValue(order.order_items, 'Seapod', 'serial')}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-600">{getItemValue(order.order_items, 'Modem', 'orca_id')}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-600">{getItemValue(order.order_items, 'Asus', 'orca_id')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${getStatusColor(order.status)}`}>{order.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                    {/* VIEW LINK */}
                    <span className="text-slate-400 text-xs group-hover:text-[#0176D3] font-bold uppercase flex items-center justify-end gap-1">
                        View <ChevronRight size={14}/>
                    </span>
                    
                    {/* DELETE BUTTON (Stop propagation to prevent opening row) */}
                    {isAdmin && (
                        <button 
                            onClick={(e) => handleDeleteOrder(e, order)}
                            className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Delete Order"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (<tr><td colSpan={7} className="p-10 text-center text-slate-400">No orders found.</td></tr>)}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal code - Same as before */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">New Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-md"><p className="text-xs text-blue-800 font-semibold">Order Number will be auto-generated by the system.</p></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Vessel Name (Optional)</label><input name="vessel" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none" placeholder="e.g. Evergreen A" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                    <select name="type" value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none bg-white">
                        <option value="Full system">Full system</option><option value="Upgrade">Upgrade</option><option value="Replacement">Replacement</option><option value="Spare Parts">Spare Parts</option>
                    </select>
                </div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Kit Preset</label><select name="kit" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none bg-white" disabled={loadingKits} value={selectedKitId} onChange={(e) => setSelectedKitId(e.target.value)}><option value="">- Custom (Empty) -</option>{loadingKits ? <option>Loading...</option> : (kitOptions.map((kit) => (<option key={kit.id} value={kit.id}>{kit.name}</option>)))}</select></div>
              </div>
              {isAdmin && (<div><label className="block text-xs font-bold text-slate-500 mb-1">Warehouse</label><select name="warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none bg-white"><option value="Orca">Orca</option><option value="Bazz">Bazz</option></select></div>)}
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4"><button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-slate-300 rounded text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button><button type="submit" className="px-4 py-2 bg-[#0176D3] text-white rounded text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all">Save & Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}