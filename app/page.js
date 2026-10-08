'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Package, CheckCircle, Clock, RefreshCw, Link, Ship, Cpu, ArrowRight, Search, ChevronRight, Filter, LayoutGrid, Download, ClipboardCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Sidebar from './components/Sidebar';
import PageSkeleton from './components/PageSkeleton';
import { useSidebar } from './context/SidebarContext';

export default function Home() {
  const { isCollapsed } = useSidebar();
  
  const [stats, setStats] = useState({ completedSeapods: 0, inProgressAssignedSeapods: 0, inProgressSeapods: 0, assignedUnshippedSeapods: 0, inProgressOrders: 0, readyOrders: 0, shippedOrdersCount: 0, builtSeapodsCount: 0, breakdownInProgress: {}, breakdownReady: {}, breakdownShipped: {}, breakdownAvailable: {}, breakdownInProgressAssigned: {}, breakdownAssigned: {} });
  const [chartData, setChartData] = useState([]);
  const [timeFilter, setTimeFilter] = useState('year'); 
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const router = useRouter();

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => { checkPermission(); fetchMetrics(); }, [timeFilter]);
  useEffect(() => { const i = setInterval(fetchMetrics, 300000); return () => clearInterval(i); }, [timeFilter]);

  async function checkPermission() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (!['admin', 'operation'].includes(profile?.role)) { router.push('/orders'); }
  }

  async function fetchMetrics() {
    const { data: seapods } = await supabase.from('seapod_production').select('serial_number, status, completed_at, created_at, order_number, template_name');
    const { data: orders } = await supabase.from('orders').select('status, shipped_at, type, sub_type, order_number, order_items(piece, serial)');
    if (!seapods || !orders) return;

    // Seapods are only linked in seapod_production once the order reaches In Box/Ready/Shipped,
    // so seapods typed into a New/In preparation order's line items are claimed from the order side.
    const seapodBySerial = {};
    seapods.forEach(s => { if (s.serial_number) seapodBySerial[String(s.serial_number).trim()] = s; });
    const claimedSerials = new Set();
    const lineItemInProgress = [];
    orders.filter(o => o.status === 'New' || o.status === 'In preparation').forEach(o => {
      (o.order_items || []).filter(i => i.piece && i.piece.toLowerCase().includes('seapod') && i.serial && i.serial.trim() && i.serial !== '-').forEach(i => {
        const sp = seapodBySerial[i.serial.trim()];
        if (sp && !claimedSerials.has(String(sp.serial_number).trim())) { claimedSerials.add(String(sp.serial_number).trim()); lineItemInProgress.push(sp); }
      });
    });
    const completedList = seapods.filter(s => s.status === 'Completed' && !claimedSerials.has(String(s.serial_number).trim()));
    const completedSeapods = completedList.length;
    const inProgressSeapods = seapods.filter(s => s.status === 'In Progress').length;
    const inProgressList = orders.filter(o => o.status !== 'Shipped' && o.status !== 'Ready for Pickup');
    const readyList = orders.filter(o => o.status === 'Ready for Pickup');
    const shippedList = orders.filter(o => o.status === 'Shipped');

    const orderStatusByNumber = {};
    orders.forEach(o => { orderStatusByNumber[String(o.order_number)] = o.status; });
    const assignedStatuses = ['Assigned to Order', 'Allocated'];
    const assignedInProgressList = [];
    const assignedUnshippedList = [];
    seapods.filter(s => assignedStatuses.includes(s.status)).forEach(s => {
      const orderStatus = s.order_number ? orderStatusByNumber[String(s.order_number)] : null;
      if (!orderStatus || orderStatus === 'Shipped') return;
      if (orderStatus === 'Ready for Pickup') assignedUnshippedList.push(s);
      else if (!claimedSerials.has(String(s.serial_number).trim())) assignedInProgressList.push(s);
    });
    assignedInProgressList.push(...lineItemInProgress);
    const assignedUnshippedCount = assignedUnshippedList.length;

    const calcBreakdown = (list) => { const counts = {}; list.forEach(o => { const t = o.type || 'Unknown'; const key = o.sub_type ? `${t} - ${o.sub_type}` : t; counts[key] = (counts[key] || 0) + 1; }); return counts; };
    const calcSeapodBreakdown = (list) => { const counts = {}; list.forEach(s => { const key = (s.template_name || 'Unknown').trim(); counts[key] = (counts[key] || 0) + 1; }); return counts; };

    const now = new Date();
    let startDate = new Date();
    if (timeFilter === 'year') startDate = new Date(now.getFullYear(), 0, 1);
    if (timeFilter === 'quarter') startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    if (timeFilter === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (timeFilter === 'week') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    const relevantSeapods = seapods.filter(s => s.completed_at && new Date(s.completed_at) >= startDate);
    const relevantOrders = orders.filter(o => o.shipped_at && new Date(o.shipped_at) >= startDate);

    setStats({ completedSeapods, inProgressAssignedSeapods: assignedInProgressList.length, inProgressSeapods, assignedUnshippedSeapods: assignedUnshippedCount, inProgressOrders: inProgressList.length, readyOrders: readyList.length, shippedOrdersCount: shippedList.length, builtSeapodsCount: relevantSeapods.length, breakdownInProgress: calcBreakdown(inProgressList), breakdownReady: calcBreakdown(readyList), breakdownShipped: calcBreakdown(shippedList), breakdownAvailable: calcSeapodBreakdown(completedList), breakdownInProgressAssigned: calcSeapodBreakdown(assignedInProgressList), breakdownAssigned: calcSeapodBreakdown(assignedUnshippedList) });
    setChartData(processChartData(relevantSeapods, relevantOrders, timeFilter));
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  }

  function processChartData(seapods, orders, filter) {
    const now = new Date();
    const keyOf = (date) => {
      if (filter === 'year' || filter === 'quarter') return date.toLocaleString('en-US', { month: 'short' });
      if (filter === 'month') return `${date.getDate()}`;
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    };
    // Pre-fill buckets in chronological order so the axis never depends on row order
    const dataMap = {};
    const addBucket = (date) => { const k = keyOf(date); if (!dataMap[k]) dataMap[k] = { name: k, Built: 0, Shipped: 0 }; };
    if (filter === 'year') for (let m = 0; m <= now.getMonth(); m++) addBucket(new Date(now.getFullYear(), m, 1));
    else if (filter === 'quarter') for (let m = Math.floor(now.getMonth() / 3) * 3; m <= now.getMonth(); m++) addBucket(new Date(now.getFullYear(), m, 1));
    else if (filter === 'month') for (let d = 1; d <= now.getDate(); d++) addBucket(new Date(now.getFullYear(), now.getMonth(), d));
    else for (let d = 6; d >= 0; d--) addBucket(new Date(now.getFullYear(), now.getMonth(), now.getDate() - d));
    const addToMap = (dateStr, type) => {
        const key = keyOf(new Date(dateStr));
        if (!dataMap[key]) return;
        dataMap[key][type]++;
    };
    seapods.forEach(s => addToMap(s.completed_at, 'Built'));
    orders.forEach(o => addToMap(o.shipped_at, 'Shipped'));
    return Object.values(dataMap);
  }

  if (loading) return <div className="flex min-h-screen bg-[#f5f7fb]"><Sidebar /><div className="ml-64 flex-1"><PageSkeleton /></div></div>;

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans">
      <Sidebar />
      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="flex justify-between items-end mb-8">
            <div><h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1><div className="flex items-center gap-2 mt-1"><p className="text-slate-500 text-sm">Live production metrics.</p>{lastUpdated && (<span className="text-xs text-slate-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-100"><RefreshCw size={10} className="animate-spin-slow"/> Updated: {lastUpdated}</span>)}</div></div>
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                {['year', 'quarter', 'month', 'week'].map((t) => (<button key={t} onClick={() => setTimeFilter(t)} className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${timeFilter === t ? 'bg-[#2f7cf6] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{t}</button>))}
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1"><Cpu size={14}/> Production</div>
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-0.5 overflow-hidden">
                    <DrillDownCard title="Seapods Available" value={stats.completedSeapods} breakdown={stats.breakdownAvailable} icon={<CheckCircle/>} color="text-green-600" bg="bg-green-50" />
                    <DrillDownCard title="Assigned to Order (In Progress)" value={stats.inProgressAssignedSeapods} breakdown={stats.breakdownInProgressAssigned} icon={<ClipboardCheck/>} color="text-amber-600" bg="bg-amber-50" />
                    <DrillDownCard title="Assigned (Pending Shipping)" value={stats.assignedUnshippedSeapods} breakdown={stats.breakdownAssigned} icon={<Link/>} color="text-slate-700" bg="bg-slate-100" />
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1"><TrendingUp size={14}/> Order Pipeline</div>
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 gap-0.5 overflow-hidden">
                    <DrillDownCard title="Orders In Progress" value={stats.inProgressOrders} breakdown={stats.breakdownInProgress} icon={<Clock/>} color="text-blue-600" bg="bg-blue-50" />
                    <DrillDownCard title="Ready for Pickup" value={stats.readyOrders} breakdown={stats.breakdownReady} icon={<Package/>} color="text-teal-700" bg="bg-teal-50" />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><LayoutDashboard size={18} className="text-slate-500"/>Production vs Shipping (This {timeFilter})</h3>
                <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e9f2"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7a99', fontSize: 12}} dy={10}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#6b7a99', fontSize: 12}}/><Tooltip cursor={{fill: '#eef2f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/><Legend /><Bar dataKey="Built" fill="#2f7cf6" radius={[4, 4, 0, 0]} name="Seapods Built" barSize={30}/><Bar dataKey="Shipped" fill="#17915f" radius={[4, 4, 0, 0]} name="Orders Shipped" barSize={30}/></BarChart></ResponsiveContainer></div>
            </div>
            <div className="col-span-1 space-y-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-center"><h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Output (This {timeFilter})</h4><div className="flex items-end gap-2 mb-1"><span className="text-4xl font-bold text-slate-900">{stats.builtSeapodsCount}</span><span className="text-sm font-bold text-slate-500 mb-1.5">Units Built</span></div><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-[#2f7cf6] h-full rounded-full" style={{width: '100%'}}></div></div></div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-center"><h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Shipments (This {timeFilter})</h4><div className="flex items-end gap-2 mb-1"><span className="text-4xl font-bold text-slate-900">{stats.shippedOrdersCount}</span><span className="text-sm font-bold text-slate-500 mb-1.5">Orders Shipped</span></div><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-green-500 h-full rounded-full" style={{width: '100%'}}></div></div></div>
            </div>
        </div>
      </main>
    </div>
  );
}

function DrillDownCard({ title, value, icon, color, bg, breakdown }) { return (<div className="bg-white p-5 flex flex-col justify-between h-full hover:bg-slate-50 transition-colors"><div className="flex items-start gap-4 mb-3"><div className={`w-12 h-12 ${bg} ${color} rounded-lg flex items-center justify-center shrink-0`}>{icon}</div><div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div></div><div className="border-t border-slate-100 pt-3 space-y-1">{Object.entries(breakdown).length > 0 ? Object.entries(breakdown).map(([key, count]) => (<div key={key} className="flex justify-between text-[11px] font-medium text-slate-500"><span>{key}</span><span className="text-slate-700 font-bold">{count}</span></div>)) : <div className="text-[11px] text-slate-300 italic">No data</div>}</div></div>); }