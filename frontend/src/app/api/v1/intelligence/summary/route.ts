import { NextRequest, NextResponse } from 'next/server';
import { getFallbackIntelligence } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weather, context } = body;
    if (!weather) {
      return NextResponse.json({ error: 'Missing weather telemetry' }, { status: 400 });
    }
    const intel = getFallbackIntelligence(weather, context || { is_personalized: false });
    return NextResponse.json(intel);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Intelligence calculation failed' },
      { status: 500 }
    );
  }
}
