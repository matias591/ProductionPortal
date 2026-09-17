'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, LogOut, Palmtree, PlaneTakeoff, MapPin } from 'lucide-react';

const DAY_MS = 86400000;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toUTCDate(dateStr) {
  return dateStr ? new Date(dateStr + 'T00:00:00Z') : null;
}

export default function TravelManifest() {
  const [trips, setTrips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  });

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
      setEmail(session.user.email);

      const { data: rows } = await supabase.from('employee_trips').select('*').order('from_date', { ascending: true });
      if (!active) return;
      setTrips(rows || []);
      setLoaded(true);
    }

    load();
    return () => { active = false; };
  }, [router, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const today = useMemo(() => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z'), []);
  const weekOut = useMemo(() => new Date(today.getTime() + 7 * DAY_MS), [today]);

  function phaseOf(t) {
    const from = toUTCDate(t.from_date);
    const to = toUTCDate(t.to_date);
    if (!from || !to) return 'past';
    if (from <= today && today <= to) return 'underway';
    if (from > today) return 'upcoming';
    return 'past';
  }

  const phased = useMemo(() => trips.map(t => ({ ...t, _phase: phaseOf(t) })), [trips, today]);
  const underway = phased.filter(t => t._phase === 'underway');
  const upcoming = phased.filter(t => t._phase === 'upcoming');
  const departingWeek = upcoming.filter(t => toUTCDate(t.from_date) <= weekOut);
  const onPtoNow = underway.filter(t => t.vacation);

  // --- Timeline month math ---
  const monthStart = useMemo(() => new Date(Date.UTC(cursor.year, cursor.month, 1)), [cursor]);
  const daysInMonth = useMemo(() => new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate(), [cursor]);
  const monthEnd = useMemo(() => new Date(Date.UTC(cursor.year, cursor.month, daysInMonth)), [cursor, daysInMonth]);
  const isCurrentMonth = cursor.year === today.getUTCFullYear() && cursor.month === today.getUTCMonth();
  const todayCol = isCurrentMonth ? today.getUTCDate() : null;

  const monthTrips = useMemo(() => {
    return phased
      .filter(t => {
        const from = toUTCDate(t.from_date), to = toUTCDate(t.to_date);
        if (!from || !to) return false;
        return from <= monthEnd && to >= monthStart;
      })
      .filter(t => {
        if (!searchTerm) return true;
        const hay = `${t.traveler} ${t.origin} ${t.destination}`.toLowerCase();
        return hay.includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => (a.from_date < b.from_date ? -1 : 1));
  }, [phased, monthStart, monthEnd, searchTerm]);

  function barStyle(t) {
    const from = toUTCDate(t.from_date), to = toUTCDate(t.to_date);
    const clipStart = from < monthStart ? monthStart : from;
    const clipEnd = to > monthEnd ? monthEnd : to;
    const startCol = Math.round((clipStart - monthStart) / DAY_MS) + 1;
    const spanDays = Math.round((clipEnd - clipStart) / DAY_MS) + 1;
    return {
      gridColumn: `${startCol} / span ${spanDays}`,
    };
  }

  function fmt(dateStr) {
    if (!dateStr) return '-';
    return toUTCDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function shiftMonth(delta) {
    const d = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    setCursor({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getUTCFullYear(), month: now.getUTCMonth() });
  }

  if (!allowed) return null;

  const dayCols = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0176D3] text-white flex items-center justify-center">
            <PlaneTakeoff size={18} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">Travel Manifest</h1>
            <p className="text-[11px] text-slate-500 leading-tight">Orca AI &middot; synced daily from Mesh</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 hidden sm:inline">{email}</span>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-1.5 rounded border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-emerald-600">{loaded ? underway.length : '-'}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Underway right now</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-[#0176D3]">{loaded ? departingWeek.length : '-'}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Departing next 7 days</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-amber-500">{loaded ? onPtoNow.length : '-'}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">On vacation days, now</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">{loaded ? underway.length + upcoming.length : '-'}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Active + upcoming trips</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Calendar toolbar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-1">
              <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                <ChevronLeft size={18} />
              </button>
              <h2 className="font-bold text-slate-800 w-40 text-center">{MONTH_NAMES[cursor.month]} {cursor.year}</h2>
              <button onClick={() => shiftMonth(1)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                <ChevronRight size={18} />
              </button>
              {!isCurrentMonth && (
                <button onClick={goToday} className="ml-2 text-xs font-bold text-[#0176D3] px-2 py-1 rounded hover:bg-blue-50">Today</button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-[#0176D3] inline-block" /> Upcoming</span>
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Underway</span>
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" /> Returned</span>
                <span className="flex items-center gap-1"><Palmtree size={12} className="text-amber-500" /> PTO</span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
                <input
                  className="pl-8 pr-3 py-1.5 border rounded text-xs outline-none focus:border-[#0176D3] w-44"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Day header */}
          <div className="flex">
            <div className="w-44 shrink-0 border-r border-slate-100" />
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
              {dayCols.map(day => {
                const dow = new Date(Date.UTC(cursor.year, cursor.month, day)).getUTCDay();
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <div
                    key={day}
                    className={`text-center text-[10px] font-bold py-2 border-r border-slate-50 last:border-r-0 ${day === todayCol ? 'text-[#0176D3]' : isWeekend ? 'text-slate-300' : 'text-slate-400'}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline rows */}
          <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
            {!loaded && (
              <div className="py-16 text-center text-sm text-slate-400">Loading manifest&hellip;</div>
            )}
            {loaded && monthTrips.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">No trips overlap {MONTH_NAMES[cursor.month]} {cursor.year}.</div>
            )}
            {monthTrips.map(t => (
              <div key={t.trip_id} className="flex items-stretch hover:bg-slate-50 group">
                <div className="w-44 shrink-0 border-r border-slate-100 px-3 py-2.5 flex flex-col justify-center">
                  <div className="text-xs font-bold text-slate-800 truncate">{t.traveler}</div>
                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                    <MapPin size={9} /> {t.destination?.split(',')[0]}
                  </div>
                </div>
                <div
                  className="flex-1 relative grid py-2.5"
                  style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
                >
                  {todayCol && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-[#0176D3]/40 z-0"
                      style={{ left: `${((todayCol - 0.5) / daysInMonth) * 100}%` }}
                    />
                  )}
                  <div
                    style={barStyle(t)}
                    title={`${t.traveler}: ${t.origin} → ${t.destination} (${fmt(t.from_date)} – ${fmt(t.to_date)})`}
                    className={`relative z-10 h-5 rounded-full flex items-center px-2 gap-1 shadow-sm
                      ${t._phase === 'underway' ? 'bg-emerald-500' : t._phase === 'upcoming' ? 'bg-[#0176D3]' : 'bg-slate-300'}
                      ${t.vacation ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
                    `}
                  >
                    {t.vacation && <Palmtree size={11} className="text-white shrink-0" />}
                    <span className="text-[10px] font-bold text-white truncate">{fmt(t.from_date)}&ndash;{fmt(t.to_date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
