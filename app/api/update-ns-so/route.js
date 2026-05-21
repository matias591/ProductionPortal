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
    const { order_number, ns_so_number } = await request.json();

    if (!order_number || !ns_so_number) {
      return NextResponse.json({ error: 'order_number and ns_so_number are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('orders')
      .update({ ns_so_number })
      .eq('order_number', order_number);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('update-ns-so error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
