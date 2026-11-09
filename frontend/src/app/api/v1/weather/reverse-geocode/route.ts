import { NextRequest, NextResponse } from 'next/server';
import { INDIAN_CITIES } from '@/lib/openMeteo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');

  let bestCity = INDIAN_CITIES[0];
  let minDist = Infinity;
  for (const c of INDIAN_CITIES) {
    const dist = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
    if (dist < 0.35 && dist < minDist) {
      minDist = dist;
      bestCity = c;
    }
  }

  if (minDist < 0.35) {
    return NextResponse.json({
      name: bestCity.name,
      state: bestCity.state,
      country: 'India',
      lat,
      lon,
      default_persona: bestCity.default_persona,
    });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { 'User-Agent': 'MausamVayuSync/1.0 (SIH-2026-Hackathon)' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.district || addr.county || 'Local Station';
      return NextResponse.json({
        name: city,
        state: addr.state || 'India',
        country: addr.country || 'India',
        lat,
        lon,
        default_persona: 'commuter',
      });
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    name: `Station (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
    state: 'GPS Telemetry',
    country: 'India',
    lat,
    lon,
    default_persona: 'commuter',
  });
}
