import { requireRole } from '../_lib/requireRole';
import { buildShippingPayloads, sendShippingWebhook } from '../_lib/shipping';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const auth = await requireRole(request, ['admin', 'operation']);
  if (auth.error) return auth.error;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { orderId } = await request.json();

    const built = await buildShippingPayloads(orderId);
    if (built.error) return NextResponse.json({ error: built.error }, { status: built.status });

    // A failed webhook is logged (Admin > Sync Issues) but does not stop the other webhook or the Shipped update.
    await sendShippingWebhook('shipping_notify', built.order, built);
    await sendShippingWebhook('shipping_netsuite', built.order, built);

    // Update Status to 'Shipped' (Locking it)
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            status: 'Shipped',
            shipped_at: new Date().toISOString()
        })
        .eq('id', orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Shipping Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
