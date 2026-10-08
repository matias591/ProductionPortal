'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, LogOut, Palmtree, PlaneTakeoff, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from '../components/Sidebar';

const DAY_MS = 86400000;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toUTCDate(dateStr) {
  return dateStr ? new Date(dateStr + 'T00:00:00Z') : null;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function TravelManifest() {
  const [trips, setTrips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  });

  const router = useRouter();

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
      setRole(profile.role);
      setEmail(session.user.email);

      const { data: rows } = await supabase.from('employee_trips').select('*').order('from_date', { ascending: true });
      if (!active) return;
      setTrips(rows || []);
      setLoaded(true);
    }

    load();
    return () => { active = false; };
  }, [router]);

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

  const monthTripsUnfiltered = useMemo(() => {
    return phased.filter(t => {
      const from = toUTCDate(t.from_date), to = toUTCDate(t.to_date);
      if (!from || !to) return false;
      return from <= monthEnd && to >= monthStart;
    });
  }, [phased, monthStart, monthEnd]);

  const cityOptions = useMemo(() => {
    const cities = new Set();
    monthTripsUnfiltered.forEach(t => {
      const city = t.destination?.split(',')[0]?.trim();
      if (city) cities.add(city);
    });
    return Array.from(cities).sort();
  }, [monthTripsUnfiltered]);

  const monthTrips = useMemo(() => {
    return monthTripsUnfiltered
      .filter(t => {
        if (!searchTerm) return true;
        const hay = `${t.traveler} ${t.origin} ${t.destination}`.toLowerCase();
        return hay.includes(searchTerm.toLowerCase());
      })
      .filter(t => !cityFilter || t.destination?.split(',')[0]?.trim() === cityFilter)
      .sort((a, b) => (a.from_date < b.from_date ? -1 : 1));
  }, [monthTripsUnfiltered, searchTerm, cityFilter]);

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

  function cityCode(str) {
    if (!str) return '';
    const parts = str.split(',').map(s => s.trim());
    const code = parts.slice(1).find(p => /^[A-Z]{2,4}$/.test(p));
    return code || parts[0];
  }

  const rowsByPerson = useMemo(() => {
    const map = new Map();
    monthTrips.forEach(t => {
      const key = t.email || t.traveler;
      if (!map.has(key)) map.set(key, { key, traveler: t.traveler, trips: [] });
      map.get(key).trips.push(t);
    });
    return Array.from(map.values()).sort((a, b) => a.traveler.localeCompare(b.traveler));
  }, [monthTrips]);

  function openExport() {
    const pad = n => String(n).padStart(2, '0');
    const last = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
    setExportFrom(`${cursor.year}-${pad(cursor.month + 1)}-01`);
    setExportTo(`${cursor.year}-${pad(cursor.month + 1)}-${pad(last)}`);
    setExportOpen(o => !o);
  }

  // Trips overlapping [exportFrom, exportTo] (ISO date strings compare correctly as text)
  const exportTrips = useMemo(() => {
    if (!exportFrom || !exportTo || exportFrom > exportTo) return [];
    return trips
      .filter(t => t.from_date <= exportTo && t.to_date >= exportFrom)
      .sort((a, b) => a.traveler.localeCompare(b.traveler) || (a.from_date < b.from_date ? -1 : 1));
  }, [trips, exportFrom, exportTo]);

  // Collapse a trip's flight segments into journeys: a segment continues the previous one
  // (connection) when it departs from where that one landed within 24h. Only the first
  // departure and last arrival of each journey are exported.
  function toJourneys(flights) {
    const segs = (Array.isArray(flights) ? flights : [])
      .filter(f => f.departure && f.arrival)
      .sort((a, b) => (a.departure < b.departure ? -1 : 1));
    const journeys = [];
    for (const f of segs) {
      const cur = journeys[journeys.length - 1];
      const last = cur && cur[cur.length - 1];
      const gap = last ? new Date(f.departure) - new Date(last.arrival) : Infinity;
      if (last && last.to === f.from && gap >= 0 && gap <= 24 * 3600 * 1000) cur.push(f);
      else journeys.push([f]);
    }
    return journeys;
  }

  // UTC -> Israel time, "YYYY-MM-DD HH:mm"
  const ilFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  function fmtIL(iso) {
    const d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return '';
    const p = Object.fromEntries(ilFmt.formatToParts(d).map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
  }

  function handleExport() {
    const header = ['Traveler', 'From', 'To', 'From Date', 'To Date', 'Airline', 'Flight', 'Departure Airport', 'Departure (Israel time)', 'Arrival Airport', 'Arrival (Israel time)', 'Source'];
    // One row per flight journey. Trips with no flight booking in Mesh get an outbound and a return row
    // dated from the trip request (date only, no time/airline/flight number).
    const data = exportTrips.flatMap(t => {
      const base = { Traveler: t.traveler, From: t.origin || '', To: t.destination || '', 'From Date': t.from_date, 'To Date': t.to_date };
      const journeys = toJourneys(t.flights);
      if (!journeys.length) return [
        { ...base, 'Departure Airport': t.origin || '', 'Departure (Israel time)': t.from_date, 'Arrival Airport': t.destination || '', 'Arrival (Israel time)': t.from_date, Source: 'Trip dates (no flight booked in Mesh)' },
        { ...base, 'Departure Airport': t.destination || '', 'Departure (Israel time)': t.to_date, 'Arrival Airport': t.origin || '', 'Arrival (Israel time)': t.to_date, Source: 'Trip dates (no flight booked in Mesh)' },
      ];
      return journeys.map(j => ({
        ...base,
        Source: 'Flight booking',
        Airline: [...new Set(j.map(f => f.airline).filter(Boolean))].join(' / '),
        Flight: j.map(f => `${f.airline || ''}${f.flight_number || ''}`).join(' + '),
        'Departure Airport': j[0].from || '',
        'Departure (Israel time)': fmtIL(j[0].departure),
        'Arrival Airport': j[j.length - 1].to || '',
        'Arrival (Israel time)': fmtIL(j[j.length - 1].arrival),
      }));
    });
    const ws = XLSX.utils.json_to_sheet(data, { header });
    ws['!cols'] = [{ wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 22 }, { wch: 10 }, { wch: 22 }, { wch: 38 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Travel');
    XLSX.writeFile(wb, `Travel_${exportFrom}_to_${exportTo}.xlsx`);
    setExportOpen(false);
  }

  function shiftMonth(delta) {
    const d = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    setCursor({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
    setCityFilter('');
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getUTCFullYear(), month: now.getUTCMonth() });
    setCityFilter('');
  }

  if (!allowed) return null;

  const dayCols = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const isWeekendDay = d => {
    const dow = new Date(Date.UTC(cursor.year, cursor.month, d)).getUTCDay();
    return dow === 0 || dow === 6;
  };
  const gridCols = { gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` };

  const stats = [
    { label: 'Underway now', value: underway.length, dot: 'bg-[#17915f]' },
    { label: 'Departing in 7 days', value: departingWeek.length, dot: 'bg-[#2f7cf6]' },
    { label: 'On vacation days now', value: onPtoNow.length, dot: 'bg-[#b97a0a]' },
    { label: 'Active and upcoming', value: underway.length + upcoming.length, dot: 'bg-[#0c1f4b]' },
  ];

  const control = 'h-8 rounded-lg border border-[#e4e9f2] bg-white text-xs text-[#0c1f4b] outline-none transition-colors hover:bg-[#f5f7fb] focus-visible:ring-2 focus-visible:ring-[#2f7cf6]/40 motion-reduce:transition-none';

  // Admins reach Travel from the sidebar, so keep the sidebar for them (management sees Travel only)
  const withSidebar = role === 'admin';

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#0c1f4b] antialiased font-sans">
      {withSidebar && <Sidebar />}
      <div className={withSidebar ? 'ml-64 bz-has-drawer' : ''}>
      <header className="sticky top-0 z-20 border-b border-[#e4e9f2] bg-white/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <img src="/bizzapps-symbol.svg" alt="BizzApps" className="h-8 w-auto" />
            <div>
              <h1 className="text-[15px] font-semibold leading-tight tracking-tight text-[#0c1f4b]">Travel Overview</h1>
              <p className="text-[12px] leading-tight text-[#5f6e8e]">by BizzApps</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[#5f6e8e] sm:inline">{email}</span>
            <button
              onClick={handleSignOut}
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[#41507a] transition-colors hover:bg-[#f5f7fb] focus-visible:ring-2 focus-visible:ring-[#2f7cf6]/40 outline-none motion-reduce:transition-none"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border border-[#e4e9f2] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex items-center gap-2 text-xs font-medium text-[#5f6e8e]">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {s.label}
              </div>
              <div className="mt-2 text-[32px] font-semibold leading-none tracking-tight tabular-nums text-[#0c1f4b]">
                {loaded ? s.value : <span className="text-[#cfd8e8]">&ndash;</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e4e9f2] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-1">
              <h2 className="mr-2 min-w-[11rem] text-xl font-semibold tracking-tight text-[#0c1f4b]">{MONTH_NAMES[cursor.month]} {cursor.year}</h2>
              <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className={`${control} flex w-8 items-center justify-center`}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => shiftMonth(1)} aria-label="Next month" className={`${control} flex w-8 items-center justify-center`}>
                <ChevronRight size={16} />
              </button>
              {!isCurrentMonth && (
                <button onClick={goToday} className={`${control} ml-1 px-3 font-medium text-[#2f7cf6]`}>Today</button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 text-[#6b7a99]" size={14} />
                <input
                  className={`${control} w-44 pl-8 pr-3 placeholder:text-[#6b7a99] focus:bg-white focus:ring-2`}
                  placeholder="Search"
                  aria-label="Search trips"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                aria-label="Filter by destination"
                className={`${control} max-w-[160px] px-2.5`}
              >
                <option value="">All destinations</option>
                {cityOptions.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <div className="relative">
                <button onClick={openExport} className={`${control} flex items-center gap-1.5 px-3 font-medium`}>
                  <Download size={14} /> Export
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-10 z-30 w-72 rounded-2xl border border-[#e4e9f2] bg-white/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
                    <div className="mb-3 text-sm font-semibold tracking-tight">Export to Excel</div>
                    <div className="mb-3 grid grid-cols-2 gap-3">
                      <label className="text-[12px] font-medium text-[#5f6e8e]">
                        From
                        <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                          className="mt-1 h-8 w-full rounded-lg border border-[#e4e9f2] bg-white px-2 text-xs text-[#0c1f4b] outline-none focus:ring-2 focus:ring-[#2f7cf6]/40" />
                      </label>
                      <label className="text-[12px] font-medium text-[#5f6e8e]">
                        To
                        <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                          className="mt-1 h-8 w-full rounded-lg border border-[#e4e9f2] bg-white px-2 text-xs text-[#0c1f4b] outline-none focus:ring-2 focus:ring-[#2f7cf6]/40" />
                      </label>
                    </div>
                    <p className="mb-4 text-xs text-[#5f6e8e]">
                      {exportFrom > exportTo ? 'From date must be before To date.' : `${exportTrips.length} trip${exportTrips.length === 1 ? '' : 's'} in this period.`}
                    </p>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setExportOpen(false)} className="h-8 rounded-lg px-3 text-xs font-medium text-[#41507a] transition-colors hover:bg-[#f5f7fb] motion-reduce:transition-none">Cancel</button>
                      <button onClick={handleExport} disabled={!exportTrips.length}
                        className="h-8 rounded-lg bg-[#0c1f4b] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#142a5e] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none">
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 pb-3 text-[12px] text-[#5f6e8e]">
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-[#2f7cf6]" /> Upcoming</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-[#17915f]" /> Underway</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-[#cfd8e8]" /> Returned</span>
            <span className="flex items-center gap-1.5"><Palmtree size={12} className="text-[#b97a0a]" /> Includes vacation days</span>
          </div>

          <div className="overflow-x-auto border-t border-[#e4e9f2]">
            <div className="min-w-[860px]">
              {/* Day header */}
              <div className="flex">
                <div className="w-48 shrink-0" />
                <div className="grid flex-1" style={gridCols}>
                  {dayCols.map(day => (
                    <div key={day} className="flex justify-center py-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums
                          ${day === todayCol ? 'bg-[#2f7cf6] font-semibold text-white' : isWeekendDay(day) ? 'text-[#9aa7c2]' : 'text-[#5f6e8e]'}`}
                      >
                        {day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* One row per person */}
              <div>
                {!loaded && (
                  <div className="py-20 text-center text-sm text-[#6b7a99]">Loading trips&hellip;</div>
                )}
                {loaded && rowsByPerson.length === 0 && (
                  <div className="py-20 text-center text-sm text-[#6b7a99]">No trips in {MONTH_NAMES[cursor.month]} {cursor.year}.</div>
                )}
                {rowsByPerson.map(row => (
                  <div key={row.key} className="group flex items-stretch border-t border-[#eef2f9] transition-colors hover:bg-[#f9fafd] motion-reduce:transition-none">
                    <div className="flex w-48 shrink-0 items-center gap-2 px-5 py-2">
                      <div className="truncate text-[13px] font-medium text-[#0c1f4b]">{row.traveler}</div>
                      {row.trips.length > 1 && (
                        <span className="shrink-0 rounded-full bg-[#eef2f9] px-1.5 text-[11px] font-medium tabular-nums text-[#5f6e8e]">{row.trips.length}</span>
                      )}
                    </div>
                    <div className="relative grid flex-1 py-2" style={{ ...gridCols, gridAutoRows: '24px', rowGap: '4px' }}>
                      <div className="pointer-events-none absolute inset-0 grid" style={gridCols}>
                        {dayCols.map(d => (
                          <div key={d} className={d === todayCol ? 'bg-[#e8f0fe]' : isWeekendDay(d) ? 'bg-[#f5f7fb]' : ''} />
                        ))}
                      </div>
                      {row.trips.map(t => (
                        <div
                          key={t.trip_id}
                          style={barStyle(t)}
                          title={`${row.traveler}\n${t.origin} → ${t.destination}\n${fmt(t.from_date)} – ${fmt(t.to_date)}${t.vacation ? ` (includes ${t.pto_days}d PTO)` : ''}`}
                          className={`relative z-10 flex h-6 items-center gap-1 overflow-hidden rounded-lg border px-2.5 transition-[filter] hover:brightness-95 motion-reduce:transition-none
                            ${t._phase === 'underway' ? 'border-[#17915f]/30 bg-[#e4f6ee] text-[#0f6b45]' : t._phase === 'upcoming' ? 'border-[#2f7cf6]/30 bg-[#e8f0fe] text-[#16306b]' : 'border-[#e4e9f2] bg-[#eef2f9] text-[#5f6e8e]'}
                            ${t.vacation ? 'ring-1 ring-[#b97a0a]/70' : ''}
                          `}
                        >
                          {t.vacation && <Palmtree size={11} className="shrink-0 text-[#b97a0a]" />}
                          <span className="truncate text-[12px] font-medium">{cityCode(t.origin)} &rarr; {cityCode(t.destination)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-6 text-[12px] text-[#6b7a99]">
          <span>Times in the Excel export are Israel time</span>
        </footer>
      </main>
      </div>
    </div>
  );
}
