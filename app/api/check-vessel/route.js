import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { vessel } = await request.json();

    if (!vessel) {
        return NextResponse.json({ error: 'Vessel name is required' }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_VESSEL_CHECK_URL;

    if (!webhookUrl) {
        console.warn("No N8N_VESSEL_CHECK_URL set.");
        return NextResponse.json({ account: null }); 
    }

    // Call n8n
    const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vessel: vessel })
    });

    if (!n8nResponse.ok) {
        // If n8n errors out, treat as not found
        return NextResponse.json({ account: null });
    }

    // Parse the raw response from n8n (Salesforce format)
    const rawData = await n8nResponse.json();
    let accountName = null;

    // LOGIC: Dig through the Salesforce structure
    // 1. Check if it's an Array (List)
    if (Array.isArray(rawData) && rawData.length > 0) {
        const record = rawData[0]; // Get first result
        // 2. Look for the Relationship Object (Account__r)
        if (record.Account__r && record.Account__r.Name) {
            accountName = record.Account__r.Name;
        }
    } 
    // 3. Fallback: Sometimes n8n returns just the object, not an array
    else if (rawData && rawData.Account__r && rawData.Account__r.Name) {
        accountName = rawData.Account__r.Name;
    }

    // Return in the simple format the Frontend expects
    return NextResponse.json({ account: accountName });

  } catch (error) {
    console.error("Vessel Check Error:", error);
    // Return null so the UI handles it gracefully (Not found)
    return NextResponse.json({ account: null });
  }
}