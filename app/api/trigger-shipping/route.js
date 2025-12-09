import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  // Initialize Supabase with Service Role (Admin rights)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
  );

  try {
    const { orderId } = await request.json();

    // 1. Gather Order & Items
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    
    // 2. Gather Files AND Generate URLs
    const { data: files } = await supabase.from('order_files').select('*').eq('order_id', orderId);

    const filesWithUrls = files.map(file => {
        // Generate the direct download link
        const { data } = supabase.storage
            .from('order-attachments') // Make sure this matches your bucket name exactly
            .getPublicUrl(file.file_path);
        
        return {
            ...file,
            download_url: data.publicUrl // <--- n8n will use this to grab the file
        };
    });

    // 3. Prepare Payload
    const payload = {
      order: order,
      items: items,
      files: filesWithUrls, // Sending the list with URLs
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
        .update({ status: 'Shipped' })
        .eq('id', orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Shipping Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}