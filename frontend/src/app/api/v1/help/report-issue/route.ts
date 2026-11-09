import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      status: 'success',
      ticket_id: 'RPT-' + Math.floor(100000 + Math.random() * 900000),
      message: 'Citizen issue report recorded. Meteorological review dispatched.',
      created_at: new Date().toISOString(),
      report: body,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to submit report' },
      { status: 500 }
    );
  }
}
