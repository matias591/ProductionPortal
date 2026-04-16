import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    const { seapodId } = await request.json();
    
    const { data: seapod } = await supabase.from('seapod_production').select('*').eq('id', seapodId).single();
    const { data: items } = await supabase.from('seapod_items').select('*').eq('seapod_id', seapodId);
    const { data: masterItems } = await supabase.from('items').select('name, netsuite_id');

    // Build the payload
    const payload = {
      assembly_item_id: seapod.assembly_item_id || "",
      bom_id: seapod.bom_id || "",
      seapod_serial: seapod.serial_number || "",
      build_date: seapod.completed_at ? seapod.completed_at.split('T')[0] : new Date().toISOString().split('T')[0],
      components: items.map(item => {
        const master = masterItems.find(m => m.name === item.piece);
        return {
          netsuite_id: master ? master.netsuite_id : "",
          serial_number: item.serial || "",
          description: item.piece || ""
        };
      })
    };

    const webhookUrl = process.env.N8N_SEAPOD_BUILD_WEBHOOK_URL;
    if (webhookUrl) {
      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!n8nResponse.ok) throw new Error(`Webhook failed: ${n8nResponse.statusText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Seapod Build Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}