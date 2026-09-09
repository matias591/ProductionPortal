import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.N8N_CALLBACK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { seapod_id, success, error: syncError } = await request.json();

    if (!seapod_id) {
      return NextResponse.json({ error: 'seapod_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('seapod_production')
      .update({
        synced_to_netsuite: !!success,
        netsuite_synced_at: new Date().toISOString(),
        last_sync_error: success ? null : (syncError || 'Unknown error')
      })
      .eq('id', seapod_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('seapod-sync-callback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
