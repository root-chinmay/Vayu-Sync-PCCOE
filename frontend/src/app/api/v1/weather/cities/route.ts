import { NextResponse } from 'next/server';
import { INDIAN_CITIES } from '@/lib/openMeteo';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ cities: INDIAN_CITIES });
}
