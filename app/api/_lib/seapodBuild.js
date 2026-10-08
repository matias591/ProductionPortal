import { createClient } from '@supabase/supabase-js';
import { logSyncFailure } from './syncFailures';

function buildRecord(seapod, items, masterItems) {
  return {
    seapod_id: seapod.id,
    assembly_item_id: seapod.assembly_item_id || "",
    bom_id: seapod.bom_id || "",
    bom_revision_id: seapod.bom_revision_id || "",
    seapod_serial: seapod.serial_number || "",
    build_date: seapod.completed_at ? seapod.completed_at.split('T')[0] : new Date().toISOString().split('T')[0],
    components: items
      .filter(item => item.seapod_id === seapod.id)
      .filter(item => !masterItems.find(m => m.name === item.piece)?.exclude_from_sync)
      .map(item => {
        const master = masterItems.find(m => m.name === item.piece);
        return {
          netsuite_id: master ? master.netsuite_id : "",
          serial_number: item.serial || "",
          description: item.piece || ""
        };
      })
  };
}

// Builds the n8n payload for the given seapods and posts it to the NetSuite build webhook.
// Delivery failures are recorded in sync_failures; the NetSuite-side result arrives later via /api/seapod-sync-callback.
export async function sendSeapodBuild(seapodIds) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: seapods } = await supabase.from('seapod_production').select('*').in('id', seapodIds);
  const { data: items } = await supabase.from('seapod_items').select('*').in('seapod_id', seapodIds);
  const { data: masterItems } = await supabase.from('items').select('name, netsuite_id, exclude_from_sync');

  const records = (seapods || []).map(seapod => buildRecord(seapod, items || [], masterItems || []));

  const webhookUrl = process.env.N8N_SEAPOD_BUILD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      if (!n8nResponse.ok) throw new Error(`Webhook failed: ${n8nResponse.statusText}`);
    } catch (err) {
      for (const s of seapods || []) {
        await logSyncFailure({ source: 'seapod_build', recordType: 'seapod', recordId: s.id, recordLabel: s.serial_number, rawError: err.message });
      }
      throw err;
    }
  }
  return records.length;
}
