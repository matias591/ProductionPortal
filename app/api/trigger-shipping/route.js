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

    // 1. Gather Order, OrderItems, Files
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    
    // --- NEW: Gather Master Items (To map NetSuite IDs) ---
    // We fetch all items to ensure we can look up the ID by name
    const { data: masterItems } = await supabase.from('items').select('name, netsuite_id');

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

    // 3. Seapod Info Lookup (Versions)
    let seapodDetails = {
        serial: null,
        hw_version: null,
        sw_version: null,
        seapod_version: null
    };

    const seapodItem = orderItems.find(i => i.piece && i.piece.toLowerCase().includes('seapod'));

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

    // --- PAYLOAD 1: ORIGINAL (Existing Webhook) ---
    const originalPayload = {
      order: order,
      items: orderItems,
      files: filesWithUrls,
      seapod_info: seapodDetails,
      triggered_at: new Date().toISOString()
    };

    // --- PAYLOAD 2: NETSUITE (New Requirement) ---
    // Mapping items to include the new netsuite_id
    const netsuitePayload = {
        vessel_name: order.vessel,
        order_number: order.order_number,
        type: order.type,
        status: order.status,
        warehouse: order.warehouse,
        items: orderItems.map(item => {
            // Find matching master item to get NetSuite ID
            const master = masterItems.find(m => m.name === item.piece);
            return {
                name: item.piece,
                quantity: item.quantity,
                serial_number: item.serial || '',
                orca_id: item.orca_id || '',
                price: item.price,
                netsuite_id: master ? master.netsuite_id : null // <--- NEW FIELD
            };
        })
    };

    // --- SEND WEBHOOK 1 (Original) ---
    const webhookUrl1 = process.env.N8N_WEBHOOK_URL;
    if (webhookUrl1) {
        try {
            await fetch(webhookUrl1, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(originalPayload) 
            });
        } catch (e) { 
            console.error("Webhook 1 Failed", e); 
            // We do NOT stop execution here, we try webhook 2
        }
    }

    // --- SEND WEBHOOK 2 (NetSuite - NEW) ---
    const webhookUrl2 = process.env.N8N_NETSUITE_WEBHOOK_URL;
    if (webhookUrl2) {
        try {
            await fetch(webhookUrl2, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(netsuitePayload) 
            });
        } catch (e) { 
            console.error("Webhook 2 Failed", e); 
        }
    }

    // 5. Update Status to 'Shipped' (Locking it)
    // Only update DB if at least one webhook didn't crash the script completely
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