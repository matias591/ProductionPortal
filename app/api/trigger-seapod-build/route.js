import { requireRole } from '../_lib/requireRole';
import { sendSeapodBuild } from '../_lib/seapodBuild';
import { NextResponse } from 'next/server';

export async function POST(request) {
  // Any signed-in portal user (vendors complete seapod builds); blocks anonymous callers.
  const auth = await requireRole(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const seapodIds = body.seapodIds || (body.seapodId ? [body.seapodId] : []);
    if (seapodIds.length === 0) throw new Error("No seapodId(s) provided");

    const count = await sendSeapodBuild(seapodIds);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Seapod Build Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
