import { createClient } from '@supabase/supabase-js';
import { classify } from '../../lib/syncPlaybook';

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Records (or updates) the single open failure for a record. Never throws: logging must not break the caller.
export async function logSyncFailure({ source, recordType, recordId, recordLabel, rawError }) {
  try {
    const supabase = db();
    const error = String(rawError || 'Unknown error').slice(0, 4000);
    const category = classify(source, error);
    const { data: open } = await supabase.from('sync_failures').select('id, attempts')
      .eq('source', source).eq('record_id', String(recordId)).neq('status', 'resolved').maybeSingle();
    if (open) {
      await supabase.from('sync_failures').update({
        status: 'open', category, raw_error: error, record_label: recordLabel || null,
        attempts: open.attempts + 1, last_failed_at: new Date().toISOString(),
      }).eq('id', open.id);
    } else {
      await supabase.from('sync_failures').insert({
        source, record_type: recordType, record_id: String(recordId), record_label: recordLabel || null,
        category, raw_error: error,
      });
    }
  } catch (e) {
    console.error('logSyncFailure failed:', e);
  }
}

export async function resolveSyncFailures(source, recordId, resolvedBy = 'auto: sync succeeded') {
  try {
    await db().from('sync_failures').update({
      status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: resolvedBy,
    }).eq('source', source).eq('record_id', String(recordId)).neq('status', 'resolved');
  } catch (e) {
    console.error('resolveSyncFailures failed:', e);
  }
}
