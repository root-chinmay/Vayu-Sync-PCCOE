import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, weather, dashboard_location, conversation_location, input_mode, session_id } = body;
    const loc = conversation_location || dashboard_location || weather?.location?.name || 'Pune';
    const temp = weather?.current?.temperature ?? 28;
    const condition = weather?.current?.condition_text ?? 'Partly Cloudy';
    const rainProb = weather?.current?.precipitation_probability ?? 20;
    const aqi = weather?.current?.aqi ?? 65;
    const aqiCat = weather?.current?.aqi_category ?? 'Satisfactory';

    const msg = (message || '').toLowerCase();
    let reply = `In ${loc}, it is currently ${temp}°C with ${condition}. Air quality is ${aqiCat} (AQI ${aqi}), and rain probability is ${rainProb}%.`;

    if (msg.includes('rain') || msg.includes('umbrella') || msg.includes('barish')) {
      reply = rainProb > 40
        ? `In ${loc}, rain risk is elevated at ${rainProb}%. Carrying an umbrella or rain cover is recommended today.`
        : `In ${loc}, rain chance is low (${rainProb}%). Skies are predominantly ${condition}. An umbrella shouldn't be necessary.`;
    } else if (msg.includes('aqi') || msg.includes('air') || msg.includes('pollution') || msg.includes('hawa')) {
      reply = `The current Air Quality Index (AQI) in ${loc} is ${aqi} (${aqiCat}). ${aqi > 150 ? 'Sensitive individuals and outdoor runners should consider an N95 respirator.' : 'Outdoor physical activities and ventilation are favorable today.'}`;
    } else if (msg.includes('temperature') || msg.includes('garmi') || msg.includes('heat') || msg.includes('temp')) {
      reply = `Current temperature in ${loc} is ${temp}°C (feels like ${weather?.current?.feels_like ?? temp}°C). Today's peak maximum is forecast around ${weather?.daily?.[0]?.temp_max ?? temp + 2}°C.`;
    } else if (msg.includes('run') || msg.includes('exercise') || msg.includes('walk') || msg.includes('jog')) {
      reply = aqi > 200 || temp > 35
        ? `Outdoor running in ${loc} is not optimal right now due to ${aqi > 200 ? 'elevated AQI' : 'high afternoon temperature'}. Early morning before 08:30 IST is the safest window.`
        : `Conditions in ${loc} are good for outdoor exercise! Temperature is ${temp}°C with AQI ${aqi}.`;
    }

    return NextResponse.json({
      success: true,
      reply,
      answer: reply,
      location: { name: loc },
      intent: 'weather_inquiry',
      requested_time: 'current',
      weather: {
        temp,
        condition,
        rain_prob: rainProb,
        aqi,
      },
      data: {
        temperature: temp,
        condition,
        rain_probability: rainProb,
      },
      suggested_actions: ['Will it rain today?', 'Check Air Quality', 'Best time to exercise'],
      source: 'VayuSync Intelligent Sahayak',
      data_timestamp: new Date().toISOString(),
      conversation_location: loc,
      input_mode: input_mode || 'text',
      session_id: session_id || 'v-session-1',
      confidence: 0.98,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Chat service error' },
      { status: 500 }
    );
  }
}
