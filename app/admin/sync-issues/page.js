'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, Search, ChevronDown, ChevronRight, CheckCircle2, ExternalLink, RotateCw } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import PageSkeleton from '../../components/PageSkeleton';
import { authedFetch } from '../../lib/authedFetch';
import { SOURCES, CATEGORIES } from '../../lib/syncPlaybook';

const FILTERS = [
  { key: 'attention', label: 'Needs attention' },
  { key: 'retrying', label: 'Retrying' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

const STATUS_STYLE = {
  open: { label: 'Needs attention', dot: 'bg-red-500', pill: 'bg-red-50 text-red-700' },
  retrying: { label: 'Retry sent', dot: 'bg-[#b97a0a]', pill: 'bg-amber-50 text-amber-800' },
  resolved: { label: 'Resolved', dot: 'bg-[#17915f]', pill: 'bg-emerald-50 text-emerald-800' },
};

function timeAgo(iso) {
  if (!iso) return '–';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export default function SyncIssues() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState([]);
  const [filter, setFilter] = useState('attention');
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const res = await authedFetch('/api/admin/sync-failures');
    const json = await res.json();
    if (json.failures) setFailures(json.failures);
    else if (json.error) alert('Could not load sync issues: ' + json.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (profile?.role !== 'admin') { alert('Access denied'); return router.push('/'); }
      setAllowed(true);
      load();
    })();
  }, [load, router]);

  const counts = useMemo(() => ({
    open: failures.filter(f => f.status === 'open').length,
    retrying: failures.filter(f => f.status === 'retrying').length,
    resolved: failures.filter(f => f.status === 'resolved').length,
  }), [failures]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return failures.filter(f => {
      if (filter === 'attention' && f.status === 'resolved') return false;
      if (filter === 'retrying' && f.status !== 'retrying') return false;
      if (filter === 'resolved' && f.status !== 'resolved') return false;
      if (source !== 'all' && f.source !== source) return false;
      if (q && !`${f.record_label || ''} ${CATEGORIES[f.category]?.title || ''} ${f.raw_error || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [failures, filter, source, search]);

  async function retry(f) {
    setBusy(f.id);
    const res = await authedFetch(`/api/admin/sync-failures/${f.id}/retry`, { method: 'POST' });
    const json = await res.json();
    alert(json.error ? 'Retry failed: ' + json.error : json.message);
    await load();
    setBusy(null);
  }

  async function resolve(f) {
    const ok = await window.bzConfirm(`Mark the sync issue for ${f.record_label || f.record_id} as resolved?\nUse this when it was fixed outside the portal.`, { confirmLabel: 'Mark resolved' });
    if (!ok) return;
    setBusy(f.id);
    const res = await authedFetch(`/api/admin/sync-failures/${f.id}/resolve`, { method: 'POST' });
    const json = await res.json();
    if (json.error) alert('Could not resolve: ' + json.error);
    await load();
    setBusy(null);
  }

  if (!allowed) return <div className="flex min-h-screen bg-[#f5f7fb]"><Sidebar /><div className="ml-64 flex-1"><PageSkeleton /></div></div>;

  const stats = [
    { label: 'Needs attention', value: counts.open, dot: 'bg-red-500' },
    { label: 'Retry sent', value: counts.retrying, dot: 'bg-[#b97a0a]' },
    { label: 'Resolved', value: counts.resolved, dot: 'bg-[#17915f]' },
  ];
  const control = 'h-8 rounded-lg border border-[#e4e9f2] bg-white px-2.5 text-xs text-[#0c1f4b] outline-none focus:ring-2 focus:ring-[#2f7cf6]/40';

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#0c1f4b]"><RefreshCw className="text-[#2f7cf6]" size={22} /> Sync Issues</h1>
              <p className="mt-1 text-sm text-[#5f6e8e]">Syncs between the portal and NetSuite / Salesforce that did not go through, with what to do next.</p>
            </div>
            <button onClick={() => { setLoading(true); load(); }} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#e4e9f2] bg-white px-3 text-xs font-medium text-[#41507a] hover:bg-[#f5f7fb]">
              <RotateCw size={13} className={loading ? 'bz-spinner' : ''} /> Refresh
            </button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
            {stats.map(s => (
              <div key={s.label} className="rounded-xl border border-[#e4e9f2] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className="flex items-center gap-2 text-xs font-medium text-[#5f6e8e]"><span className={`h-2 w-2 rounded-full ${s.dot}`} />{s.label}</div>
                <div className="mt-2 text-[32px] font-semibold leading-none tracking-tight tabular-nums text-[#0c1f4b]">{loading ? <span className="text-[#cfd8e8]">&ndash;</span> : s.value}</div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e4e9f2] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex flex-wrap gap-1" role="tablist">
                {FILTERS.map(f => (
                  <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
                    className={`h-8 rounded-lg px-3 text-xs font-medium ${filter === f.key ? 'bg-[#e8f0fe] text-[#2f7cf6]' : 'text-[#41507a] hover:bg-[#f5f7fb]'}`}>{f.label}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 text-[#6b7a99]" size={14} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" aria-label="Search sync issues" className={`${control} w-44 pl-8`} />
                </div>
                <select value={source} onChange={e => setSource(e.target.value)} aria-label="Filter by flow" className={`${control} max-w-[220px]`}>
                  <option value="all">All flows</option>
                  {Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border-t border-[#e4e9f2]">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="bg-[#f5f7fb] text-[11px] font-semibold uppercase tracking-wide text-[#5f6e8e]">
                  <tr>
                    <th className="w-8 px-3 py-3" />
                    <th className="px-3 py-3">Record</th>
                    <th className="px-3 py-3">Flow</th>
                    <th className="px-3 py-3">What went wrong</th>
                    <th className="px-3 py-3">Last failed</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2f9]">
                  {rows.map(f => {
                    const cat = CATEGORIES[f.category] || CATEGORIES.unknown;
                    const src = SOURCES[f.source];
                    const st = STATUS_STYLE[f.status] || STATUS_STYLE.open;
                    const isOpen = expanded === f.id;
                    return (
                      <FragmentRow key={f.id}>
                        <tr className="align-top hover:bg-[#f5f7fb]/60">
                          <td className="px-3 py-3.5">
                            <button onClick={() => setExpanded(isOpen ? null : f.id)} aria-expanded={isOpen} aria-label="Show details" className="text-[#9aa7c2] hover:text-[#0c1f4b]">
                              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="text-sm font-semibold text-[#0c1f4b]">{f.record_label || f.record_id}</div>
                            <div className="text-xs text-[#5f6e8e]">{src?.recordType || f.record_type}</div>
                          </td>
                          <td className="px-3 py-3.5 text-sm text-[#41507a]">{src?.label || f.source}</td>
                          <td className="max-w-[360px] px-3 py-3.5">
                            <div className="text-sm font-medium text-[#0c1f4b]">{cat.title}</div>
                            <div className="text-xs text-[#5f6e8e]">{cat.what}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-sm text-[#41507a]" title={new Date(f.last_failed_at).toLocaleString()}>
                            {timeAgo(f.last_failed_at)}
                            {f.attempts > 1 && <div className="text-xs text-[#5f6e8e]">{f.attempts} attempts</div>}
                          </td>
                          <td className="px-3 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${st.pill}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              {f.status !== 'resolved' && src?.retry && (
                                <button onClick={() => retry(f)} disabled={busy === f.id} className="flex h-8 items-center gap-1.5 rounded-lg bg-[#2f7cf6] px-3 text-xs font-semibold text-white hover:bg-[#2a6fe0] disabled:opacity-40">
                                  <RotateCw size={12} className={busy === f.id ? 'bz-spinner' : ''} /> Retry
                                </button>
                              )}
                              {f.status !== 'resolved' && (
                                <button onClick={() => resolve(f)} disabled={busy === f.id} title="Mark as resolved" className="flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-[#41507a] hover:bg-[#f5f7fb] disabled:opacity-40">
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-[#f5f7fb]/70">
                            <td />
                            <td colSpan={6} className="px-3 pb-5 pt-1">
                              <div className="grid gap-4 lg:grid-cols-2">
                                <div>
                                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#5f6e8e]">What to do</div>
                                  <p className="text-sm leading-relaxed text-[#0c1f4b]">{cat.action}</p>
                                  {cat.fix && f.status !== 'resolved' && (
                                    <Link href={cat.fix.href(f)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2f7cf6] hover:underline">{cat.fix.label} <ExternalLink size={12} /></Link>
                                  )}
                                  {!src?.retry && <p className="mt-2 text-xs text-[#5f6e8e]">This lookup runs again whenever the vessel is re-entered; there is nothing to retry here.</p>}
                                  {f.resolved_at && <p className="mt-2 text-xs text-[#5f6e8e]">Resolved {timeAgo(f.resolved_at)} ({f.resolved_by}).</p>}
                                </div>
                                <div>
                                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#5f6e8e]">Technical detail</div>
                                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[#e4e9f2] bg-white p-3 text-xs text-[#41507a]">{f.raw_error || 'No detail recorded.'}</pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    );
                  })}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-[#6b7a99]">
                      {filter === 'attention' ? 'No sync issues. Everything is in sync.' : 'Nothing to show for this filter.'}
                    </td></tr>
                  )}
                  {loading && <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-[#6b7a99]">Loading&hellip;</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// tbody needs rows as direct children; a keyed fragment lets us return the summary + detail rows together.
function FragmentRow({ children }) { return <>{children}</>; }
