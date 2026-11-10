import { NextRequest, NextResponse } from 'next/server';
import { computeHistoricalAnomaly } from '@/lib/anomalyEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get('lat') || '18.5204');
  const lon = parseFloat(searchParams.get('lon') || '73.8567');
  const city = searchParams.get('city') || 'Pune';

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'Invalid latitude or longitude parameters' },
      { status: 400 }
    );
  }

  try {
    const anomalyReport = await computeHistoricalAnomaly(lat, lon, city);

    return NextResponse.json(anomalyReport, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('Historical Anomaly API Error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to compute historical weather anomaly',
        fallback_available: true
      },
      { status: 500 }
    );
  }
}
