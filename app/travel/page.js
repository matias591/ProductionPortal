'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Search, Plane, PlaneTakeoff, Palmtree, Download, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from '../components/Sidebar';

const STATUS_STYLES = {
  underway: 'bg-green-100 text-green-700 border-green-200',
  upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
  past: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function TravelManifest() {
  const [trips, setTrips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('active');

  const router = useRouter();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (!active) return;
      if (!['admin', 'management'].includes(profile?.role)) { router.push('/orders'); return; }
      setAllowed(true);

      const { data: rows } = await supabase.from('employee_trips').select('*').order('from_date', { ascending: false });
      if (!active) return;
      setTrips(rows || []);
      setLoaded(true);
    }

    load();
    return () => { active = false; };
  }, [router, supabase]);

  const today = useMemo(() => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z'), []);
  const weekOut = useMemo(() => new Date(today.getTime() + 7 * 86400000), [today]);
  const twoWeeksAgo = useMemo(() => new Date(today.getTime() - 14 * 86400000), [today]);

  function phaseOf(t) {
    if (!t.from_date || !t.to_date) return 'past';
    const from = new Date(t.from_date + 'T00:00:00Z');
    const to = new Date(t.to_date + 'T00:00:00Z');
    if (from <= today && today <= to) return 'underway';
    if (from > today) return 'upcoming';
    return 'past';
  }

  const phased = useMemo(() => trips.map(t => ({ ...t, _phase: phaseOf(t) })), [trips, today]);

  const underway = phased.filter(t => t._phase === 'underway');
  const upcoming = phased.filter(t => t._phase === 'upcoming');
  const departingWeek = upcoming.filter(t => new Date(t.from_date + 'T00:00:00Z') <= weekOut);
  const onPtoNow = underway.filter(t => t.vacation);

  const filtered = phased.filter(t => {
    if (filter === 'active' && t._phase === 'past' && new Date(t.to_date + 'T00:00:00Z') < twoWeeksAgo) return false;
    if (filter === 'underway' && t._phase !== 'underway') return false;
    if (filter === 'upcoming' && t._phase !== 'upcoming') return false;
    if (filter === 'past' && t._phase !== 'past') return false;
    if (searchTerm) {
      const hay = `${t.traveler} ${t.origin} ${t.destination}`.toLowerCase();
      if (!hay.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  function fmt(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function exportList() {
    const rows = filtered.map(t => ({
      Traveler: t.traveler, Status: t._phase, Origin: t.origin, Destination: t.destination,
      'From Date': t.from_date, 'To Date': t.to_date, 'Net Days': t.net_days,
      Vacation: t.vacation ? 'Yes' : 'No', 'PTO Days': t.pto_days, 'Trip ID': t.trip_id,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Travel Manifest');
    XLSX.writeFile(wb, 'Travel_Manifest.xlsx');
  }

  if (!allowed) return null;

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Travel Manifest</h1>
            <p className="text-sm text-slate-500 mt-1">Who&apos;s traveling, where, and whether the trip carries paid days off. Synced daily from Mesh.</p>
          </div>
          <button onClick={exportList} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50">
            <Download size={16} /> Export List
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-[#0176D3]">{loaded ? underway.length : '-'}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Underway right now</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">{loaded ? departingWeek.length : '-'}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Departing next 7 days</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">{loaded ? onPtoNow.length : '-'}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">On vacation days, now</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">{loaded ? underway.length + upcoming.length : '-'}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Active + upcoming trips</div>
          </div>
        </div>

        {underway.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <PlaneTakeoff size={16} className="text-[#0176D3]" />
              <h2 className="font-bold text-slate-800 text-sm">Underway ({underway.length})</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {underway.map(t => (
                <div key={t.trip_id} className="px-6 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-bold text-slate-800">{t.traveler}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> {t.origin?.split(',')[0]} &rarr; {t.destination?.split(',')[0]}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.vacation && (
                      <span className="px-2 py-1 rounded text-xs font-bold border bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
                        <Palmtree size={11} /> PTO &times;{t.pto_days}
                      </span>
                    )}
                    <span className="text-xs font-mono text-slate-500">{fmt(t.from_date)} - {fmt(t.to_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="relative max-w-md flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              className="w-full pl-10 pr-4 py-2 border rounded outline-none focus:border-[#0176D3]"
              placeholder="Search traveler or destination..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white">
            <option value="active">Active &amp; upcoming</option>
            <option value="all">All trips</option>
            <option value="underway">Underway only</option>
            <option value="upcoming">Upcoming only</option>
            <option value="past">Recently returned</option>
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">Traveler</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Net Days</th>
                <th className="px-6 py-4">PTO</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loaded && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">Loading manifest&hellip;</td></tr>
              )}
              {loaded && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">No trips match.</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.trip_id} className="hover:bg-blue-50">
                  <td className="px-6 py-4 font-bold text-slate-800">{t.traveler}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {t.origin?.split(',')[0]} <Plane size={11} className="inline mx-1 text-slate-400" /> {t.destination?.split(',')[0]}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">{fmt(t.from_date)} - {fmt(t.to_date)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{t.net_days ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{t.vacation ? `${t.pto_days} d` : '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold border capitalize ${STATUS_STYLES[t._phase]}`}>{t._phase}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
