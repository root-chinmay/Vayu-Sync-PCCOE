import { NextRequest, NextResponse } from 'next/server';
import { computeGeographicalHotspots } from '@/lib/hotspotEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get('lat') || '18.5204');
  const lon = parseFloat(searchParams.get('lon') || '73.8567');
  const city = searchParams.get('city') || 'Pune';
  const refresh = searchParams.get('refresh') === 'true' || searchParams.has('_t');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'Invalid latitude or longitude coordinate query parameters' },
      { status: 400 }
    );
  }

  try {
    const report = await computeGeographicalHotspots(lat, lon, city, refresh);

    return NextResponse.json(report, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('Geographical Hotspots API Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to compute geographical environmental hotspots',
        fallback_available: true,
      },
      { status: 500 }
    );
  }
}
