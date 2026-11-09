import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveWeather } from '@/lib/openMeteo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get('lat') || '18.5204');
  const lon = parseFloat(searchParams.get('lon') || '73.8567');
  const city = searchParams.get('city') || undefined;
  const scenario = searchParams.get('scenario') || undefined;

  try {
    const data = await fetchLiveWeather(lat, lon, city, scenario);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch live weather' },
      { status: 500 }
    );
  }
}
