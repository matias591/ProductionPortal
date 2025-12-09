import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use Service Role to ensure we can read/write everything
  );

  try {
    const { orderId } = await request.json();

    // 1. Gather all Data
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    const { data: files } = await supabase.from('order_files').select('*').eq('order_id', orderId);

    // 2. Prepare Payload for n8n
    const payload = {
      order: order,
      items: items,
      files: files,
      triggered_at: new Date().toISOString()
    };

    // 3. Send to n8n Webhook
    // We utilize the env variable here
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (webhookUrl) {
        const n8nResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!n8nResponse.ok) {
            throw new Error(`n8n Webhook failed: ${n8nResponse.statusText}`);
        }
    }

    // 4. Update Status to 'Shipped' in Database
    const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'Shipped' })
        .eq('id', orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Shipping Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}