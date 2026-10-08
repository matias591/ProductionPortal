import { createClient } from '@supabase/supabase-js';
import { logSyncFailure, resolveSyncFailures } from './syncFailures';

const norm = (s) => (s || '').trim().toLowerCase();

// Builds both shipping payloads for an order. Returns { error, status } when an order line has no NetSuite ID.
export async function buildShippingPayloads(orderId) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
  const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', orderId);
  const { data: masterItems } = await supabase.from('items').select('name, netsuite_id, exclude_from_sync');

  const { data: files } = await supabase.from('order_files').select('*').eq('order_id', orderId);
  const filesWithUrls = files.map(file => {
    const { data } = supabase.storage.from('order-attachments').getPublicUrl(file.file_path);
    return { ...file, download_url: data.publicUrl };
  });

  let seapodDetails = { serial: null, hw_version: null, sw_version: null, seapod_version: null };
  const seapodItem = orderItems.find(i => i.piece && i.piece.toLowerCase().includes('seapod'));
  if (seapodItem && seapodItem.serial) {
    const { data: productionRecord } = await supabase
      .from('seapod_production')
      .select('hw_version, sw_version, seapod_version')
      .eq('serial_number', seapodItem.serial)
      .single();
    if (productionRecord) {
      seapodDetails = {
        serial: seapodItem.serial,
        hw_version: productionRecord.hw_version,
        sw_version: productionRecord.sw_version,
        seapod_version: productionRecord.seapod_version
      };
    }
  }

  const originalPayload = {
    order, items: orderItems, files: filesWithUrls, seapod_info: seapodDetails,
    triggered_at: new Date().toISOString()
  };

  // Match order lines to master items on a normalized name (trim + case-insensitive),
  // so stray spaces in either name don't drop the NetSuite ID.
  const masterByName = new Map(masterItems.map(m => [norm(m.name), m]));
  const syncLines = orderItems.filter(item => !masterByName.get(norm(item.piece))?.exclude_from_sync);
  const missingNsId = syncLines.filter(item => !masterByName.get(norm(item.piece))?.netsuite_id);
  if (missingNsId.length > 0) {
    const names = [...new Set(missingNsId.map(i => i.piece))];
    return { error: `Missing NetSuite ID for: ${names.join(', ')}. Fix the item in Admin > Items, then ship again.`, status: 422 };
  }

  const netsuitePayload = {
    vessel_name: order.vessel,
    order_number: order.order_number,
    type: order.type,
    status: order.status,
    warehouse: order.warehouse,
    items: syncLines.map(item => ({
      name: item.piece,
      quantity: item.quantity,
      serial_number: item.serial || '',
      orca_id: item.orca_id || '',
      price: item.price,
      netsuite_id: masterByName.get(norm(item.piece)).netsuite_id
    }))
  };

  return { order, originalPayload, netsuitePayload };
}

const TARGETS = {
  shipping_notify:   { env: 'N8N_WEBHOOK_URL',            payload: 'originalPayload' },
  shipping_netsuite: { env: 'N8N_NETSUITE_WEBHOOK_URL',   payload: 'netsuitePayload' },
};

// Posts one shipping webhook. Failures (network error or non-2xx) are logged and returned, never thrown,
// so shipping is not blocked (same behaviour as before). Success clears any open failure for the order.
export async function sendShippingWebhook(source, order, payloads) {
  const url = process.env[TARGETS[source].env];
  if (!url) return { ok: true, skipped: true };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloads[TARGETS[source].payload])
    });
    if (!res.ok) throw new Error(`Webhook failed: ${res.status} ${res.statusText}`);
    await resolveSyncFailures(source, order.id);
    return { ok: true };
  } catch (e) {
    console.error(`${source} webhook failed`, e);
    await logSyncFailure({ source, recordType: 'order', recordId: order.id, recordLabel: order.order_number, rawError: e.message });
    return { ok: false, error: e.message };
  }
}
