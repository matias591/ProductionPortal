'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, X, Trash2, HelpCircle } from 'lucide-react';

const ERROR_RE = /\b(error|fail|failed|invalid|unable|cannot|can't|denied|missing|required|not allowed|wrong)\b/i;

// Non-blocking replacement for window.alert: existing alert() calls across the portal
// show an animated toast instead of a blocking browser dialog. Messages that look like
// errors get the red style, everything else the green "saved" style.
export default function ToastProvider() {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
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
    // Styled, promise-based replacement for window.confirm: `await window.bzConfirm(msg, opts)`
    window.bzConfirm = (message, opts = {}) => new Promise(resolve => {
      const text = String(message ?? '');
      setDialog({ text, destructive: /\b(delete|remove)\b/i.test(text), confirmLabel: opts.confirmLabel, cancelLabel: opts.cancelLabel, resolve });
    });
    return () => { window.alert = nativeAlert; delete window.bzConfirm; };
  }, [dismiss]);

  const answer = useCallback((value) => {
    setDialog(d => { d?.resolve(value); return null; });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = e => { if (e.key === 'Escape') answer(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, answer]);

  return (
    <>
    {dialog && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0c1f4b]/30 p-4 backdrop-blur-sm" onClick={() => answer(false)}>
        <div role="alertdialog" aria-modal="true" aria-label="Confirm" onClick={e => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-[#e4e9f2] bg-white p-6 shadow-[0_24px_60px_rgba(12,31,75,0.22)]">
          <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${dialog.destructive ? 'bg-red-50 text-red-500' : 'bg-[#e8f0fe] text-[#2f7cf6]'}`}>
            {dialog.destructive ? <Trash2 size={18} /> : <HelpCircle size={18} />}
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[#0c1f4b]">{dialog.text}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button autoFocus={dialog.destructive} onClick={() => answer(false)} className="h-10 rounded-xl px-4 text-sm font-medium text-[#41507a] hover:bg-[#f5f7fb]">{dialog.cancelLabel || 'Cancel'}</button>
            <button autoFocus={!dialog.destructive} onClick={() => answer(true)}
              className={`h-10 rounded-xl px-4 text-sm font-semibold text-white ${dialog.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2f7cf6] hover:bg-blue-700'}`}>
              {dialog.confirmLabel || (dialog.destructive ? (/\bremove\b/i.test(dialog.text) ? 'Remove' : 'Delete') : 'Confirm')}
            </button>
          </div>
        </div>
      </div>
    )}
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
    </>
  );
}
