'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Package, CheckCircle, Clock, RefreshCw, Link, Ship, Cpu, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Sidebar from './components/Sidebar';
import { useSidebar } from './context/SidebarContext';

export default function Home() {
  const { isCollapsed } = useSidebar();
  
  const [stats, setStats] = useState({
    completedSeapods: 0,
    inProgressSeapods: 0,
    assignedUnshippedSeapods: 0, 
    inProgressOrders: 0,
    readyOrders: 0,
    shippedOrdersCount: 0,
    builtSeapodsCount: 0,
    breakdownInProgress: {},
    breakdownReady: {},
    breakdownShipped: {}
  });
  
  const [chartData, setChartData] = useState([]);
  const [timeFilter, setTimeFilter] = useState('year'); 
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    checkPermission();
    fetchMetrics();
  }, [timeFilter]);

  // Auto Refresh
  useEffect(() => {
    const i = setInterval(fetchMetrics, 300000); 
    return () => clearInterval(i);
  }, [timeFilter]); 

  async function checkPermission() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (!['admin', 'operation'].includes(profile?.role)) {
        router.push('/orders'); 
    }
  }

  async function fetchMetrics() {
    const { data: seapods } = await supabase.from('seapod_production').select('status, completed_at, created_at, order_number');
    const { data: orders } = await supabase.from('orders').select('status, shipped_at, type, order_number');

    if (!seapods || !orders) return;

    // 1. Basic Counters
    const completedSeapods = seapods.filter(s => s.status === 'Completed').length; 
    const inProgressSeapods = seapods.filter(s => s.status === 'In Progress').length;
    
    // 2. Order Lists
    const inProgressList = orders.filter(o => o.status !== 'Shipped' && o.status !== 'Ready for Pickup');
    const readyList = orders.filter(o => o.status === 'Ready for Pickup');
    const shippedList = orders.filter(o => o.status === 'Shipped');

    // 3. NEW METRIC: Assigned but NOT Shipped
    const activeOrderNumbers = orders
        .filter(o => o.status !== 'Shipped')
        .map(o => String(o.order_number));

    const assignedUnshippedCount = seapods.filter(s => 
        s.status === 'Assigned to Order' && 
        s.order_number && 
        activeOrderNumbers.includes(String(s.order_number))
    ).length;

    // 4. Breakdowns
    const calcBreakdown = (list) => {
        const counts = {};
        list.forEach(o => {
            const t = o.type || 'Unknown';
            counts[t] = (counts[t] || 0) + 1;
        });
        return counts;
    };

    // 5. Chart Time Filter
    const now = new Date();
    let startDate = new Date();
    if (timeFilter === 'year') startDate.setFullYear(now.getFullYear(), 0, 1);
    if (timeFilter === 'quarter') startDate.setMonth(now.getMonth() - 3);
    if (timeFilter === 'month') startDate.setMonth(now.getMonth(), 1);
    if (timeFilter === 'week') startDate.setDate(now.getDate() - 7);

    const relevantSeapods = seapods.filter(s => s.completed_at && new Date(s.completed_at) >= startDate);
    const relevantOrders = orders.filter(o => o.shipped_at && new Date(o.shipped_at) >= startDate);

    setStats({
        completedSeapods, 
        inProgressSeapods,
        assignedUnshippedSeapods: assignedUnshippedCount,
        inProgressOrders: inProgressList.length,
        readyOrders: readyList.length,
        shippedOrdersCount: shippedList.length, 
        builtSeapodsCount: relevantSeapods.length,
        breakdownInProgress: calcBreakdown(inProgressList),
        breakdownReady: calcBreakdown(readyList),
        breakdownShipped: calcBreakdown(shippedList)
    });

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

  if (loading) return <div className="flex min-h-screen bg-[#F3F4F6]"><Sidebar /><div className={`ml-64 p-10 text-slate-500`}>Loading Dashboard...</div></div>;

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1>
                <div className="flex items-center gap-2 mt-1"><p className="text-slate-500 text-sm">Live production metrics.</p>{lastUpdated && (<span className="text-xs text-slate-400 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-100"><RefreshCw size={10} className="animate-spin-slow"/> Updated: {lastUpdated}</span>)}</div>
            </div>
            
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                {['year', 'quarter', 'month', 'week'].map((t) => (
                    <button key={t} onClick={() => setTimeFilter(t)} className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${timeFilter === t ? 'bg-[#0176D3] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{t}</button>
                ))}
            </div>
        </div>

        {/* --- KPI SPLIT SECTIONS --- */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            
            {/* LEFT SECTION: SEAPOD INVENTORY */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    <Cpu size={14}/> Seapod Production
                </div>
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 gap-0.5 overflow-hidden">
                    <MetricCard title="Seapods Available" value={stats.completedSeapods} icon={<CheckCircle/>} color="text-green-600" bg="bg-green-50" />
                    <MetricCard title="Assigned (Pending)" value={stats.assignedUnshippedSeapods} icon={<Link/>} color="text-indigo-600" bg="bg-indigo-50" />
                </div>
            </div>

            {/* RIGHT SECTION: ORDER PIPELINE */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    <TrendingUp size={14}/> Order Pipeline
                </div>
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 gap-0.5 overflow-hidden">
                    <DrillDownCard 
                        title="Orders In Progress" 
                        value={stats.inProgressOrders} 
                        breakdown={stats.breakdownInProgress}
                        icon={<Clock/>} color="text-blue-600" bg="bg-blue-50" 
                    />
                    <DrillDownCard 
                        title="Ready for Pickup" 
                        value={stats.readyOrders} 
                        breakdown={stats.breakdownReady}
                        icon={<Package/>} color="text-purple-600" bg="bg-purple-50" 
                    />
                </div>
            </div>

        </div>

        {/* --- CHARTS (UNCHANGED) --- */}
        <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><LayoutDashboard size={18} className="text-slate-400"/>Production vs Shipping (This {timeFilter})</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10}/>
                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}}/>
                            <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                            <Legend />
                            <Bar dataKey="Built" fill="#0176D3" radius={[4, 4, 0, 0]} name="Seapods Built" barSize={30}/>
                            <Bar dataKey="Shipped" fill="#10B981" radius={[4, 4, 0, 0]} name="Orders Shipped" barSize={30}/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="col-span-1 space-y-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-center"><h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Output (This {timeFilter})</h4><div className="flex items-end gap-2 mb-1"><span className="text-4xl font-bold text-slate-900">{stats.builtSeapodsCount}</span><span className="text-sm font-bold text-slate-500 mb-1.5">Units Built</span></div><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-[#0176D3] h-full rounded-full" style={{width: '100%'}}></div></div></div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-center"><h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Shipments (This {timeFilter})</h4><div className="flex items-end gap-2 mb-1"><span className="text-4xl font-bold text-slate-900">{stats.shippedOrdersCount}</span><span className="text-sm font-bold text-slate-500 mb-1.5">Orders Shipped</span></div><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-green-500 h-full rounded-full" style={{width: '100%'}}></div></div></div>
            </div>
        </div>
      </main>
    </div>
  );
}

// Simple Metric Card (Removed rounded corners when inside grid to look like one block)
function MetricCard({ title, value, icon, color, bg }) {
    return (
        <div className="bg-white p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors">
            <div className={`w-12 h-12 ${bg} ${color} rounded-lg flex items-center justify-center shrink-0`}>{icon}</div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
        </div>
    );
}

// Drill Down Card
function DrillDownCard({ title, value, icon, color, bg, breakdown }) {
    return (
        <div className="bg-white p-5 flex flex-col justify-between h-full hover:bg-slate-50 transition-colors">
            <div className="flex items-start gap-4 mb-3">
                <div className={`w-12 h-12 ${bg} ${color} rounded-lg flex items-center justify-center shrink-0`}>{icon}</div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                </div>
            </div>
            {/* Breakdown List */}
            <div className="border-t border-slate-100 pt-3 space-y-1">
                {Object.entries(breakdown).length > 0 ? Object.entries(breakdown).map(([key, count]) => (
                    <div key={key} className="flex justify-between text-[10px] font-medium text-slate-500">
                        <span>{key}</span>
                        <span className="text-slate-700 font-bold">{count}</span>
                    </div>
                )) : <div className="text-[10px] text-slate-300 italic">No orders</div>}
            </div>
        </div>
    );
}