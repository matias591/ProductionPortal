'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const ERROR_RE = /\b(error|fail|failed|invalid|unable|cannot|can't|denied|missing|required|not allowed|wrong)\b/i;

// Non-blocking replacement for window.alert: existing alert() calls across the portal
// show an animated toast instead of a blocking browser dialog. Messages that look like
// errors get the red style, everything else the green "saved" style.
export default function ToastProvider() {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);

  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (msg) => {
      const text = String(msg ?? '');
      const kind = ERROR_RE.test(text) ? 'error' : 'success';
      const id = nextId.current++;
      setToasts(t => [...t.slice(-3), { id, text, kind }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
    };
    return () => { window.alert = nativeAlert; };
  }, [dismiss]);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
          className="bz-toast pointer-events-auto flex items-start gap-3 rounded-xl border border-[#e4e9f2] bg-white/90 px-4 py-3 shadow-[0_12px_40px_rgba(12,31,75,0.14)] backdrop-blur-xl">
          {t.kind === 'error'
            ? <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
            : <CheckCircle2 size={18} className="bz-check mt-0.5 shrink-0 text-[#17915f]" />}
          <p className="flex-1 whitespace-pre-line text-[13px] leading-snug text-[#0c1f4b]">{t.text}</p>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 text-[#9aa7c2] hover:text-[#0c1f4b]"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
