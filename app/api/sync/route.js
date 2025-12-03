import { NextResponse } from 'next/server';
import jsforce from 'jsforce';
import { createClient } from '@supabase/supabase-js';

// 1. Setup Database Connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// This function runs when you click "Sync"
export async function GET() {
  // 2. Setup Salesforce Connection (using the variables from env.local)
  const conn = new jsforce.Connection({
    oauth2: {
      loginUrl: process.env.SF_LOGIN_URL,
      clientId: process.env.SF_CLIENT_ID,
      clientSecret: process.env.SF_CLIENT_SECRET,
    },
  });

  try {
    // 3. Log in to Salesforce
    await conn.login(process.env.SF_USER, process.env.SF_PASSWORD);

    // 4. Query Salesforce
    // Querying Opportunities just to test the connection.
    // Later, you will change 'Opportunity' to your object name (e.g., 'Shipment__c')
    const q = "SELECT Id, Name FROM Vessel_Engagement__c LIMIT 5"; 
    const result = await conn.query(q);

    // 5. Save results to Supabase Database
    for (const record of result.records) {
      const { error } = await supabase
        .from('production_orders')
        .upsert({
          sf_id: record.Id,
          product_name: record.Name, 
          vendor_name: 'Vendor A',   
          status: 'Pending'
        }, { onConflict: 'sf_id' }); // Prevents creating the same order twice
        
      if (error) console.error('Supabase Error:', error);
    }

    // 6. Respond to the browser that it worked
    return NextResponse.json({ message: 'Sync Successful', count: result.totalSize });
    
  } catch (err) {
    console.error("Sync Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}