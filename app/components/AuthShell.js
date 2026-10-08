'use client';

// Shared branded card for login / password pages.
export default function AuthShell({ title, subtitle, children, shake = false }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb] px-4 font-sans">
      <div className={`bz-fade-up w-full max-w-md rounded-2xl border border-[#e4e9f2] bg-white p-10 shadow-[0_12px_40px_rgba(12,31,75,0.08)] ${shake ? 'bz-shake' : ''}`}>
        <div className="mb-8 text-center">
          <img src="/bizzapps-symbol.svg" alt="BizzApps" className="mx-auto mb-4 h-12 w-auto" />
          <h2 className="text-2xl font-semibold tracking-tight text-[#0c1f4b]">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
        <p className="mt-8 text-center text-[11px] text-slate-400">Production Portal by BizzApps</p>
      </div>
    </div>
  );
}
