import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  // Initialize Supabase with Service Role (Admin rights to read all tables)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
  );

  try {
    const { orderId } = await request.json();

    // 1. Gather Order, Items, Files
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    
    // 2. Gather Files AND Generate Download URLs
    const { data: files } = await supabase.from('order_files').select('*').eq('order_id', orderId);

    const filesWithUrls = files.map(file => {
        const { data } = supabase.storage
            .from('order-attachments')
            .getPublicUrl(file.file_path);
        
        return {
            ...file,
            download_url: data.publicUrl
        };
    });

    // --- NEW LOGIC: FETCH SEAPOD VERSIONS ---
    let seapodDetails = {
        serial: null,
        hw_version: null,
        sw_version: null,
        seapod_version: null
    };

    // Find the item that looks like a Seapod
    const seapodItem = items.find(i => i.piece && i.piece.toLowerCase().includes('seapod'));

    if (seapodItem && seapodItem.serial) {
        // Fetch the production record for this specific serial
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

    // 3. Prepare Payload
    const payload = {
      order: order,
      items: items,
      files: filesWithUrls,
      seapod_info: seapodDetails, // <--- NEW BLOCK WITH VERSIONS
      triggered_at: new Date().toISOString()
    };

    // 4. Send to n8n
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

    // 5. Update Status to 'Shipped' (Locking it)
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