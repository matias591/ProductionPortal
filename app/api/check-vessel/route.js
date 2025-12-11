import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { vessel } = await request.json();

    if (!vessel) {
        return NextResponse.json({ error: 'Vessel name is required' }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_VESSEL_CHECK_URL;

    if (!webhookUrl) {
        // Fallback for testing if no URL is set
        console.warn("No N8N_VESSEL_CHECK_URL set. Returning mock data.");
        return NextResponse.json({ account: "Test Account (Mock)" }); 
    }

    // Call n8n
    const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vessel: vessel })
    });

    if (!n8nResponse.ok) {
        throw new Error("Failed to connect to n8n");
    }

    // Expecting n8n to return JSON like: { "account": "MSC" } or { "account": null }
    const data = await n8nResponse.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error("Vessel Check Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}