import { requireRole } from '../../../../_lib/requireRole';
import { sendSeapodBuild } from '../../../../_lib/seapodBuild';
import { buildShippingPayloads, sendShippingWebhook } from '../../../../_lib/shipping';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Re-sends the failed sync for one record. The result of seapod builds arrives later through
// /api/seapod-sync-callback; shipping webhooks report immediately.
export async function POST(request, { params }) {
  const auth = await requireRole(request, ['admin']);
  if (auth.error) return auth.error;
  const { id } = await params;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: failure } = await supabase.from('sync_failures').select('*').eq('id', id).maybeSingle();
  if (!failure) return NextResponse.json({ error: 'Failure not found' }, { status: 404 });
  if (failure.status === 'resolved') return NextResponse.json({ error: 'Already resolved' }, { status: 409 });

  const markRetried = () => supabase.from('sync_failures').update({
    status: 'retrying', last_retry_at: new Date().toISOString(),
  }).eq('id', id);

  try {
    if (failure.source === 'seapod_build') {
      await sendSeapodBuild([failure.record_id]);
      await markRetried();
      return NextResponse.json({ success: true, message: 'Retry sent. The result appears here within a minute.' });
    }

    if (failure.source === 'shipping_netsuite' || failure.source === 'shipping_notify') {
      const built = await buildShippingPayloads(failure.record_id);
      if (built.error) return NextResponse.json({ error: built.error }, { status: built.status });
      const result = await sendShippingWebhook(failure.source, built.order, built);
      if (!result.ok) return NextResponse.json({ error: 'Retry failed again. See the updated details.' }, { status: 502 });
      return NextResponse.json({ success: true, message: 'Retry sent successfully.' });
    }

    return NextResponse.json({ error: 'This type of failure cannot be retried from here.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Retry failed: ' + e.message }, { status: 502 });
  }
}
