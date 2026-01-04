'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Package, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Sidebar from './components/Sidebar';
import { useSidebar } from './context/SidebarContext';

export default function Home() {
  const { isCollapsed } = useSidebar();
  
  const [stats, setStats] = useState({
    completedSeapods: 0,
    inProgressSeapods: 0,
    inProgressOrders: 0,
    readyOrders: 0,
    shippedOrdersCount: 0,
    builtSeapodsCount: 0,
    breakdownInProgress: {},
    breakdownReady: {}
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
    const { data: seapods } = await supabase.from('seapod_production').select('status, completed_at, created_at');
    const { data: orders } = await supabase.from('orders').select('status, shipped_at, type');

    if (!seapods || !orders) return;

    // Counters
    const completedSeapods = seapods.filter(s => s.status === 'Completed').length; 
    const inProgressSeapods = seapods.filter(s => s.status === 'In Progress').length;
    
    // Define Categories
    const inProgressList = orders.filter(o => o.status !== 'Shipped' && o.status !== 'Ready for Pickup');
    const readyList = orders.filter(o => o.status === 'Ready for Pickup');

    // Helper to Count Types
    const calcBreakdown = (list) => {
        const counts = {};
        list.forEach(o => {
            const t = o.type || 'Unknown';
            counts[t] = (counts[t] || 0) + 1;
        });
        return counts;
    };

    // Filter Logic for Chart
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
        inProgressOrders: inProgressList.length,
        readyOrders: readyList.length,
        shippedOrdersCount: relevantOrders.length, 
        builtSeapodsCount: relevantSeapods.length,
        breakdownInProgress: calcBreakdown(inProgressList),
        breakdownReady: calcBreakdown(readyList)
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

        {/* --- KPI CARDS --- */}
        <div className="grid grid-cols-4 gap-6 mb-8">
            <MetricCard title="Seapods Available" value={stats.completedSeapods} icon={<CheckCircle/>} color="text-green-600" bg="bg-green-50" />
            <MetricCard title="Seapods In Progress" value={stats.inProgressSeapods} icon={<Clock/>} color="text-orange-600" bg="bg-orange-50" />
            
            {/* DRILL DOWN CARD: Orders In Progress */}
            <DrillDownCard 
                title="Orders In Progress" 
                value={stats.inProgressOrders} 
                breakdown={stats.breakdownInProgress}
                icon={<TrendingUp/>} color="text-blue-600" bg="bg-blue-50" 
            />
            
            {/* DRILL DOWN CARD: Ready for Pickup */}
            <DrillDownCard 
                title="Ready for Pickup" 
                value={stats.readyOrders} 
                breakdown={stats.breakdownReady}
                icon={<Package/>} color="text-purple-600" bg="bg-purple-50" 
            />
        </div>

        {/* --- CHARTS --- */}
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

// Simple Metric Card (No breakdown)
function MetricCard({ title, value, icon, color, bg }) {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-start gap-4">
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
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-full">
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