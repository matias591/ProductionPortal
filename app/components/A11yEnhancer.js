'use client';
import { useEffect } from 'react';

// Retrofits accessibility on markup that predates the design pass, without touching every page:
//  - <label> not tied to its control -> sets for/id on the next input/select/textarea
//  - icon-only buttons -> aria-label from title, else from the lucide icon name
//  - clickable divs/spans/rows (cursor-pointer) -> keyboard focusable, Enter/Space activates
let uid = 0;
const FIELD = 'input, select, textarea';

function enhance(root) {
  root.querySelectorAll('label:not([for])').forEach(label => {
    if (label.querySelector(FIELD)) return;
    const sib = label.nextElementSibling;
    const field = sib && (sib.matches(FIELD) ? sib : sib.querySelector(FIELD));
    if (!field || field.type === 'hidden') return;
    if (!field.id) field.id = `bz-f-${++uid}`;
    label.htmlFor = field.id;
  });

  root.querySelectorAll('button:not([aria-label])').forEach(btn => {
    if (btn.textContent.trim()) return;
    const title = btn.getAttribute('title');
    if (title) { btn.setAttribute('aria-label', title); return; }
    const icon = btn.querySelector('svg[class*="lucide-"]');
    const name = icon && [...icon.classList].find(c => c.startsWith('lucide-') && c !== 'lucide');
    if (name) btn.setAttribute('aria-label', name.replace('lucide-', '').replace(/[0-9]+$/, '').replace(/-/g, ' '));
  });

  root.querySelectorAll('div.cursor-pointer, span.cursor-pointer, tr.cursor-pointer').forEach(el => {
    if (el.hasAttribute('tabindex') || el.closest('button, a')) return;
    el.tabIndex = 0;
    if (el.tagName !== 'TR') el.setAttribute('role', 'button');
  });
}

export default function A11yEnhancer() {
  useEffect(() => {
    let raf = 0;
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => enhance(document.body)); };
    run();
    const mo = new MutationObserver(run);
    mo.observe(document.body, { childList: true, subtree: true });

    const onKey = e => {
      if ((e.key !== 'Enter' && e.key !== ' ') || e.target !== document.activeElement) return;
      const el = e.target;
      if (el.matches('div.cursor-pointer, span.cursor-pointer, tr.cursor-pointer')) { e.preventDefault(); el.click(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { mo.disconnect(); cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); };
  }, []);
  return null;
}
