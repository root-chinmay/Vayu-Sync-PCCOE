import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, weather } = body;
    const q = (query || '').toLowerCase();
    const rainProb = weather?.current?.precipitation_probability ?? 25;
    const isRainLikely = rainProb > 40;

    if (q.includes('umbrella') || q.includes('rain')) {
      return NextResponse.json({
        query,
        verdict: isRainLikely ? 'YES' : 'NO',
        headline: isRainLikely ? 'Carry an umbrella today' : 'Umbrella not required',
        reason: isRainLikely 
          ? `Precipitation risk is ${rainProb}%. Rain showers expected in the afternoon/evening.`
          : `Precipitation probability is low (${rainProb}%). Predominantly dry conditions expected.`,
        tip: isRainLikely ? 'Keep a compact waterproof umbrella in your bag.' : 'Enjoy the pleasant weather.',
        confidence: 90,
        data_points: {
          'Rain Risk': `${rainProb}%`,
          'Condition': weather?.current?.condition_text || 'Partly Cloudy',
          'Wind': `${weather?.current?.wind_speed || 12} km/h`,
        },
      });
    }

    return NextResponse.json({
      query,
      verdict: 'CONDITIONAL',
      headline: 'Check local weather condition',
      reason: `Ambient temperature is ${weather?.current?.temperature || 28}°C with ${weather?.current?.condition_text || 'fair conditions'}.`,
      tip: 'Monitor real-time radar updates on MAUSAM for sudden convective shifts.',
      confidence: 85,
      data_points: {
        'Temp': `${weather?.current?.temperature || 28}°C`,
        'AQI': `${weather?.current?.aqi || 65} (${weather?.current?.aqi_category || 'Satisfactory'})`,
        'Humidity': `${weather?.current?.humidity || 55}%`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Decision calculation failed' },
      { status: 500 }
    );
  }
}
