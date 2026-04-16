'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Package, CheckCircle, Clock, RefreshCw, Link, Ship, Cpu, ArrowRight, Plus, Search, ChevronRight, Filter, LayoutGrid, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Sidebar from './components/Sidebar';
import { useSidebar } from './context/SidebarContext';

export default function Home() {
  const { isCollapsed } = useSidebar();
  
  const [stats, setStats] = useState({ completedSeapods: 0, inProgressSeapods: 0, assignedUnshippedSeapods: 0, inProgressOrders: 0, readyOrders: 0, shippedOrdersCount: 0, builtSeapodsCount: 0, breakdownInProgress: {}, breakdownReady: {}, breakdownShipped: {} });
  const [chartData, setChartData] = useState([]);
  const [timeFilter, setTimeFilter] = useState('year'); 
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const router = useRouter();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [kitOptions, setKitOptions] = useState([]);
  const [loadingKits, setLoadingKits] = useState(true);
  const [selectedType, setSelectedType] = useState('Full system'); 
  const [selectedKitId, setSelectedKitId] = useState(''); 
  const [warehouse, setWarehouse] = useState('Orca');
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [canCreate, setCanCreate] = useState(false);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => { checkPermission(); fetchMetrics(); fetchKitsFromDB(); }, [timeFilter]);
  useEffect(() => { const i = setInterval(fetchMetrics, 300000); return () => clearInterval(i); }, [timeFilter]); 
  useEffect(() => {
    if (kitOptions.length === 0) return;
    const defaults = { 'Full system': 'MSC002', 'Upgrade': 'UPGRD', 'Replacement': 'REP001' };
    const targetKit = kitOptions.find(k => k.name === defaults[selectedType]);
    if (targetKit) setSelectedKitId(targetKit.id); else setSelectedKitId(''); 
  }, [selectedType, kitOptions]);

  async function fetchKitsFromDB() { const { data } = await supabase.from('kits').select('*').order('name'); setKitOptions(data || []); setLoadingKits(false); }

  async function checkPermission() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    setUserEmail(session.user.email);
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role === 'admin') setIsAdmin(true);
    if (['admin', 'operation'].includes(profile?.role)) setCanCreate(true);
    if (!['admin', 'operation'].includes(profile?.role)) { router.push('/orders'); }
  }

  async function fetchMetrics() {
    const { data: seapods } = await supabase.from('seapod_production').select('status, completed_at, created_at, order_number');
    const { data: orders } = await supabase.from('orders').select('status, shipped_at, type, order_number');
    if (!seapods || !orders) return;

    const completedSeapods = seapods.filter(s => s.status === 'Completed').length; 
    const inProgressSeapods = seapods.filter(s => s.status === 'In Progress').length;
    const inProgressList = orders.filter(o => o.status !== 'Shipped' && o.status !== 'Ready for Pickup');
    const readyList = orders.filter(o => o.status === 'Ready for Pickup');
    const shippedList = orders.filter(o => o.status === 'Shipped');

    const activeOrderNumbers = orders.filter(o => o.status !== 'Shipped').map(o => String(o.order_number));
    const assignedUnshippedCount = seapods.filter(s => s.status === 'Assigned to Order' && s.order_number && activeOrderNumbers.includes(String(s.order_number))).length;

    const calcBreakdown = (list) => { const counts = {}; list.forEach(o => { const t = o.type || 'Unknown'; counts[t] = (counts[t] || 0) + 1; }); return counts; };

    const now = new Date();
    let startDate = new Date();
    if (timeFilter === 'year') startDate.setFullYear(now.getFullYear(), 0, 1);
    if (timeFilter === 'quarter') startDate.setMonth(now.getMonth() - 3);
    if (timeFilter === 'month') startDate.setMonth(now.getMonth(), 1);
    if (timeFilter === 'week') startDate.setDate(now.getDate() - 7);

    const relevantSeapods = seapods.filter(s => s.completed_at && new Date(s.completed_at) >= startDate);
    const relevantOrders = orders.filter(o => o.shipped_at && new Date(o.shipped_at) >= startDate);

    setStats({ completedSeapods, inProgressSeapods, assignedUnshippedSeapods: assignedUnshippedCount, inProgressOrders: inProgressList.length, readyOrders: readyList.length, shippedOrdersCount: shippedList.length, builtSeapodsCount: relevantSeapods.length, breakdownInProgress: calcBreakdown(inProgressList), breakdownReady: calcBreakdown(readyList), breakdownShipped: calcBreakdown(shippedList) });
    setChartData(processChartData(relevantSeapods, relevantOrders, timeFilter));
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  }

  function processChartData(seapods, orders, filter) {
    const dataMap = {};
    const addToMap = (dateStr, type) => {
        const date = new Date(dateStr);
        let key = '';
        if (filter === 'year' || filter === 'quarter') key = date.toLocaleString('default', { month: 'short' });
        else if (filter === 'month') key = `${date.getDate()}`; 
        else if (filter === 'week') key = date.toLocaleDateString('en-US', { weekday: 'short' }); 
        if (!dataMap[key]) dataMap[key] = { name: key, Built: 0, Shipped: 0 };
        dataMap[key][type]++;
    };
    seapods.forEach(s => addToMap(s.completed_at, 'Built'));
    orders.forEach(o => addToMap(o.shipped_at, 'Shipped'));
    return Object.values(dataMap);
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedKitName = kitOptions.find(k => k.id === selectedKitId)?.name || 'Custom';
    const newOrder = { vessel: formData.get('vessel') || 'Unknown Vessel', type: selectedType, kit: selectedKitId ? selectedKitName : 'Custom', warehouse: isAdmin ? formData.get('warehouse') : 'Baz', status: 'New', created_by: userEmail };
    const { data: orderData, error } = await supabase.from('orders').insert([newOrder]).select().single();
    if (error) { alert("Error: " + error.message); return; }
    if (selectedKitId) {
        const { data: templateItems } = await supabase.from('kit_items').select('*').eq('kit_id', selectedKitId).order('sort_order', { ascending: true });
        if (templateItems && templateItems.length > 0) {
            const { data: masterList } = await supabase.from('items').select('id, price');
            const itemsToInsert = templateItems.map((item, index) => {
                const masterPrice = masterList?.find(m => m.id === item.item_id)?.price || 0;
                return { order_id: orderData.id, piece: item.piece, quantity: item.quantity, serial: '', is_done: false, price: masterPrice, sort_order: index + 1 };
            });
            await supabase.from('order_items').insert(itemsToInsert);
        }
    }
    setShowCreateModal(false);
    fetchMetrics();
  }

  if (loading) return <div className="flex min-h-screen bg-[#F3F4F6]"><Sidebar /><div className={`ml-64 p-10 text-slate-500`}>Loading Dashboard...</div></div>;

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="flex justify-between items-end mb-8">
            <div><h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1><div className="flex items-center gap-2 mt-1"><p className="text-slate-500 text-sm">Live production metrics.</p>{lastUpdated && (<span className="text-xs text-slate-400 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-100"><RefreshCw size={10} className="animate-spin-slow"/> Updated: {lastUpdated}</span>)}</div></div>
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                {['year', 'quarter', 'month', 'week'].map((t) => (<button key={t} onClick={() => setTimeFilter(t)} className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${timeFilter === t ? 'bg-[#0176D3] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{t}</button>))}
            </div>
        </div>

        {canCreate && (
            <div className="mb-6 flex justify-end">
                <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-[#0176D3] text-white text-sm font-semibold rounded-md hover:bg-blue-700 shadow-md flex items-center gap-2"><Plus size={16} /> New Order</button>
            </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1"><Cpu size={14}/> Seapod Production</div>
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 gap-0.5 overflow-hidden">
                    <MetricCard title="Seapods Available" value={stats.completedSeapods} icon={<CheckCircle/>} color="text-green-600" bg="bg-green-50" />
                    <MetricCard title="Assigned (Pending)" value={stats.assignedUnshippedSeapods} icon={<Link/>} color="text-indigo-600" bg="bg-indigo-50" />
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1"><TrendingUp size={14}/> Order Pipeline</div>
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 gap-0.5 overflow-hidden">
                    <DrillDownCard title="Orders In Progress" value={stats.inProgressOrders} breakdown={stats.breakdownInProgress} icon={<Clock/>} color="text-blue-600" bg="bg-blue-50" />
                    <DrillDownCard title="Ready for Pickup" value={stats.readyOrders} breakdown={stats.breakdownReady} icon={<Package/>} color="text-purple-600" bg="bg-purple-50" />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><LayoutDashboard size={18} className="text-slate-400"/>Production vs Shipping (This {timeFilter})</h3>
                <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}}/><Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/><Legend /><Bar dataKey="Built" fill="#0176D3" radius={[4, 4, 0, 0]} name="Seapods Built" barSize={30}/><Bar dataKey="Shipped" fill="#10B981" radius={[4, 4, 0, 0]} name="Orders Shipped" barSize={30}/></BarChart></ResponsiveContainer></div>
            </div>
            <div className="col-span-1 space-y-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-center"><h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Output (This {timeFilter})</h4><div className="flex items-end gap-2 mb-1"><span className="text-4xl font-bold text-slate-900">{stats.builtSeapodsCount}</span><span className="text-sm font-bold text-slate-500 mb-1.5">Units Built</span></div><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-[#0176D3] h-full rounded-full" style={{width: '100%'}}></div></div></div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-center"><h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Shipments (This {timeFilter})</h4><div className="flex items-end gap-2 mb-1"><span className="text-4xl font-bold text-slate-900">{stats.shippedOrdersCount}</span><span className="text-sm font-bold text-slate-500 mb-1.5">Orders Shipped</span></div><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-green-500 h-full rounded-full" style={{width: '100%'}}></div></div></div>
            </div>
        </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 text-lg">New Order</h3><button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">✕</button></div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-md"><p className="text-xs text-blue-800 font-semibold">Order Number will be auto-generated by the system.</p></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">Vessel Name (Optional)</label><input name="vessel" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3] outline-none" placeholder="e.g. Evergreen A" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Type</label><select name="type" value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none bg-white"><option value="Full system">Full system</option><option value="Upgrade">Upgrade</option><option value="Replacement">Replacement</option><option value="Spare Parts">Spare Parts</option></select></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Kit Preset</label><select name="kit" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none bg-white" disabled={loadingKits} value={selectedKitId} onChange={(e) => setSelectedKitId(e.target.value)}><option value="">- Custom (Empty) -</option>{loadingKits ? <option>Loading...</option> : (kitOptions.map((kit) => (<option key={kit.id} value={kit.id}>{kit.name}</option>)))}</select></div>
              </div>
              {isAdmin && (<div><label className="block text-xs font-bold text-slate-500 mb-1">Warehouse</label><select name="warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-[#0176D3] outline-none bg-white"><option value="Orca">Orca</option><option value="Baz">Baz</option><option value="JNSU">JNSU</option></select></div>)}
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4"><button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-slate-300 rounded text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button><button type="submit" className="px-4 py-2 bg-[#0176D3] text-white rounded text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all">Save & Create</button></div>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

function MetricCard({ title, value, icon, color, bg }) { return (<div className="bg-white p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors"><div className={`w-12 h-12 ${bg} ${color} rounded-lg flex items-center justify-center shrink-0`}>{icon}</div><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div></div>); }
function DrillDownCard({ title, value, icon, color, bg, breakdown }) { return (<div className="bg-white p-5 flex flex-col justify-between h-full hover:bg-slate-50 transition-colors"><div className="flex items-start gap-4 mb-3"><div className={`w-12 h-12 ${bg} ${color} rounded-lg flex items-center justify-center shrink-0`}>{icon}</div><div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div></div><div className="border-t border-slate-100 pt-3 space-y-1">{Object.entries(breakdown).length > 0 ? Object.entries(breakdown).map(([key, count]) => (<div key={key} className="flex justify-between text-[10px] font-medium text-slate-500"><span>{key}</span><span className="text-slate-700 font-bold">{count}</span></div>)) : <div className="text-[10px] text-slate-300 italic">No orders</div>}</div></div>); }