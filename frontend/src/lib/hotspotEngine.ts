import {
  HotspotGridCell,
  HotspotReport,
  HotspotRiskLevel,
  EnvironmentalLayer,
  HistoricalAnomalyReport,
} from './types';
import { computeHistoricalAnomaly, calculateZScore, calculatePercentile } from './anomalyEngine';

interface HotspotCacheEntry {
  timestamp: number;
  report: HotspotReport;
}

const hotspotCache = new Map<string, HotspotCacheEntry>();
const HOTSPOT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes live refresh cadence

interface SubZoneDefinition {
  id: string;
  name: string;
  sub_region: string;
  lat: number;
  lon: number;
  corridor_note: string;
  civic_hub: { name: string; type: string; distance_km: number; verified: boolean };
}

/**
 * Generates geographically accurate sampling cells for Pune (12 authentic micro-zones)
 * or dynamically generates a 12-cell spatial grid for any selected Indian city / GPS coordinate.
 */
export function generateCityGrid(lat: number, lon: number, cityName: string): SubZoneDefinition[] {
  const isPune = cityName.toLowerCase().includes('pune') || (Math.abs(lat - 18.5204) < 0.25 && Math.abs(lon - 73.8567) < 0.25);

  if (isPune) {
    return [
      {
        id: 'pune-shivajinagar',
        name: 'Shivajinagar & Central Core',
        sub_region: 'PMC Central',
        lat: 18.5308,
        lon: 73.8475,
        corridor_note: 'JM Road / FC Road / University Circle corridor',
        civic_hub: { name: 'COEP & PMC Central Relief Center', type: 'Municipal Civic Hub', distance_km: 0.8, verified: true },
      },
      {
        id: 'pune-khadki',
        name: 'Khadki Cantonment',
        sub_region: 'North Central',
        lat: 18.5642,
        lon: 73.8340,
        corridor_note: 'Old Mumbai-Pune Highway (NH-48) stretch',
        civic_hub: { name: 'Khadki Cantonment General Hospital Hub', type: 'Cantonment Civic Shelter', distance_km: 1.1, verified: true },
      },
      {
        id: 'pune-cantonment',
        name: 'Pune Cantonment & Camp',
        sub_region: 'East Central',
        lat: 18.5135,
        lon: 73.8825,
        corridor_note: 'MG Road / Solapur Bazaar arterial corridor',
        civic_hub: { name: 'Pune Cantonment Board Civic Facility', type: 'Civic Assembly Point', distance_km: 0.9, verified: true },
      },
      {
        id: 'pune-kothrud',
        name: 'Kothrud & Karve Nagar',
        sub_region: 'West Pune',
        lat: 18.5074,
        lon: 73.8077,
        corridor_note: 'Paud Road / Karve Road / Chandni Chowk approach',
        civic_hub: { name: 'PMC Kothrud Ward Office Relief Hub', type: 'Municipal Civic Center', distance_km: 0.7, verified: true },
      },
      {
        id: 'pune-hadapsar',
        name: 'Hadapsar & Manjri',
        sub_region: 'South-East Corridor',
        lat: 18.5089,
        lon: 73.9260,
        corridor_note: 'Pune-Solapur Highway / Magarpatta Bypass',
        civic_hub: { name: 'PMC Hadapsar Ward Community Shelter', type: 'Municipal Shelter', distance_km: 1.4, verified: true },
      },
      {
        id: 'pune-viman-nagar',
        name: 'Viman Nagar & Kalyani Nagar',
        sub_region: 'North-East Corridor',
        lat: 18.5679,
        lon: 73.9143,
        corridor_note: 'Nagar Road / Airport Approach Expressway',
        civic_hub: { name: 'Viman Nagar PMC Emergency Center', type: 'Municipal Facility', distance_km: 1.0, verified: true },
      },
      {
        id: 'pune-hinjawadi',
        name: 'Hinjawadi & Sus',
        sub_region: 'West IT Belt',
        lat: 18.5912,
        lon: 73.7389,
        corridor_note: 'Wakad-Hinjawadi Flyover & Sus Road',
        civic_hub: { name: 'PMRDA Hinjawadi Emergency Response Post', type: 'District Disaster Post', distance_km: 1.6, verified: true },
      },
      {
        id: 'pune-pcmc',
        name: 'Pimpri-Chinchwad (PCMC)',
        sub_region: 'North-West Metro',
        lat: 18.6279,
        lon: 73.8009,
        corridor_note: 'PCMC Spine Road & Metro Corridor',
        civic_hub: { name: 'PCMC Auto Cluster Relief Facility', type: 'Municipal Disaster Hub', distance_km: 1.3, verified: true },
      },
      {
        id: 'pune-aundh-baner',
        name: 'Aundh & Baner',
        sub_region: 'North-West Zone',
        lat: 18.5590,
        lon: 73.7868,
        corridor_note: 'Baner Road / Balewadi High Street corridor',
        civic_hub: { name: 'Balewadi Sports Complex Civic Shelter', type: 'High-Capacity Hub', distance_km: 1.9, verified: true },
      },
      {
        id: 'pune-wagholi',
        name: 'Wagholi Sector',
        sub_region: 'Far East',
        lat: 18.5808,
        lon: 73.9808,
        corridor_note: 'Pune-Ahmednagar Highway (NH-753F)',
        civic_hub: { name: 'Wagholi Gram Panchayat / PMC Sub-Center', type: 'Civic Assembly Post', distance_km: 1.5, verified: false },
      },
      {
        id: 'pune-katraj',
        name: 'Katraj & Dhankawadi',
        sub_region: 'South Gateway',
        lat: 18.4575,
        lon: 73.8677,
        corridor_note: 'Satara Road / Katraj Tunnel Bypass',
        civic_hub: { name: 'PMC Katraj Ward Emergency Hub', type: 'Municipal Facility', distance_km: 1.2, verified: true },
      },
      {
        id: 'pune-sinhagad',
        name: 'Sinhagad Road & Vadgaon',
        sub_region: 'South-West Riverfront',
        lat: 18.4722,
        lon: 73.8211,
        corridor_note: 'Sinhagad Road / Mutha Riverfront Corridor',
        civic_hub: { name: 'PMC Sinhagad Road Regional School Shelter', type: 'Designated School Shelter', distance_km: 0.9, verified: true },
      },
    ];
  }

  // Dynamic 12-Cell Spatial Grid for any other city or user GPS coordinates
  const step = 0.055; // ~6 km spatial separation per cell
  const offsets: Array<{ id: string; name: string; sub: string; dLat: number; dLon: number; corr: string }> = [
    { id: 'center', name: `${cityName} Central Core`, sub: 'Urban Core', dLat: 0, dLon: 0, corr: 'Primary city arterial network' },
    { id: 'north', name: `${cityName} North Sector`, sub: 'North Zone', dLat: step * 1.4, dLon: 0, corr: 'Northern transit highway' },
    { id: 'south', name: `${cityName} South Sector`, sub: 'South Zone', dLat: -step * 1.4, dLon: 0, corr: 'Southern expressway corridor' },
    { id: 'east', name: `${cityName} East Sector`, sub: 'East Zone', dLat: 0, dLon: step * 1.5, corr: 'Eastern industrial & ring road' },
    { id: 'west', name: `${cityName} West Sector`, sub: 'West Zone', dLat: 0, dLon: -step * 1.5, corr: 'Western suburban corridor' },
    { id: 'ne', name: `${cityName} North-East`, sub: 'NE Quadrant', dLat: step, dLon: step, corr: 'NE arterial bypass' },
    { id: 'nw', name: `${cityName} North-West`, sub: 'NW Quadrant', dLat: step, dLon: -step, corr: 'NW connector corridor' },
    { id: 'se', name: `${cityName} South-East`, sub: 'SE Quadrant', dLat: -step, dLon: step, corr: 'SE transit corridor' },
    { id: 'sw', name: `${cityName} South-West`, sub: 'SW Quadrant', dLat: -step, dLon: -step, corr: 'SW ring road approach' },
    { id: 'outer-n', name: `${cityName} Outer North`, sub: 'Peri-Urban N', dLat: step * 2.1, dLon: step * 0.4, corr: 'Outer northern perimeter highway' },
    { id: 'outer-s', name: `${cityName} Outer South`, sub: 'Peri-Urban S', dLat: -step * 2.1, dLon: -step * 0.4, corr: 'Outer southern perimeter route' },
    { id: 'outer-e', name: `${cityName} Outer East`, sub: 'Peri-Urban E', dLat: -step * 0.3, dLon: step * 2.2, corr: 'Outer eastern bypass' },
  ];

  return offsets.map((o) => ({
    id: `${cityName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${o.id}`,
    name: o.name,
    sub_region: o.sub,
    lat: parseFloat((lat + o.dLat).toFixed(4)),
    lon: parseFloat((lon + o.dLon).toFixed(4)),
    corridor_note: o.corr,
    civic_hub: {
      name: `${o.name} Municipal Civic Center`,
      type: 'Local Civic Facility (Verify Emergency Status)',
      distance_km: 1.5,
      verified: false,
    },
  }));
}

/**
 * Normalizes AQI into a 0-100 environmental risk score using US EPA / India AQI benchmarks
 */
export function normalizeAqiScore(aqi: number): { score: number; category: string } {
  if (aqi <= 50) {
    return { score: Math.round((aqi / 50) * 15), category: 'Good' };
  }
  if (aqi <= 100) {
    return { score: Math.round(15 + ((aqi - 50) / 50) * 20), category: 'Moderate' };
  }
  if (aqi <= 150) {
    return { score: Math.round(35 + ((aqi - 100) / 50) * 25), category: 'Poor (Sensitive)' };
  }
  if (aqi <= 200) {
    return { score: Math.round(60 + ((aqi - 150) / 50) * 25), category: 'Unhealthy' };
  }
  return { score: Math.min(100, Math.round(85 + ((aqi - 200) / 100) * 15)), category: 'Severe / Critical' };
}

/**
 * Classifies combined score into 5 Risk Levels matching the UI Legend
 */
export function classifyHotspotRisk(score: number): {
  level: HotspotRiskLevel;
  label: string;
  color: string;
} {
  if (score >= 85) {
    return { level: 'CRITICAL', label: 'Critical Risk', color: '#991b1b' };
  }
  if (score >= 70) {
    return { level: 'HIGH', label: 'High Risk', color: '#dc2626' };
  }
  if (score >= 45) {
    return { level: 'MODERATE', label: 'Moderate', color: '#ea580c' };
  }
  if (score >= 25) {
    return { level: 'LOW', label: 'Low Risk', color: '#eab308' };
  }
  return { level: 'NORMAL', label: 'Normal', color: '#16a34a' };
}

/**
 * Main Engine: Fetches multi-coordinate real-time weather + AQI + 10-year historical baseline
 * Calculates per-cell anomaly scores and constructs interactive geographical HotspotReport
 */
export async function computeGeographicalHotspots(
  lat: number,
  lon: number,
  cityName: string = 'Pune',
  forceRefresh: boolean = false
): Promise<HotspotReport> {
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = hotspotCache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < HOTSPOT_CACHE_TTL_MS) {
    return { ...cached.report, is_cached: true };
  }

  // 1. Generate City Sampling Grid (12 geographic zones)
  const grid = generateCityGrid(lat, lon, cityName);
  const latsParam = grid.map((g) => g.lat).join(',');
  const lonsParam = grid.map((g) => g.lon).join(',');

  // 2. Concurrently fetch:
  //    (A) Multi-point Weather Telemetry from Open-Meteo Forecast API
  //    (B) Multi-point Air Quality Telemetry from Open-Meteo Air Quality API
  //    (C) City-level 10-Year Historical Climate Baseline from AnomalyEngine
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latsParam}&longitude=${lonsParam}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia/Kolkata`;
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latsParam}&longitude=${lonsParam}&current=pm10,pm2_5,us_aqi&timezone=Asia/Kolkata`;

  let weatherResults: any[] = [];
  let aqiResults: any[] = [];
  let historicalBaseline: HistoricalAnomalyReport | null = null;

  const [weatherRes, aqiRes, baselineRes] = await Promise.allSettled([
    fetch(weatherUrl, { cache: 'no-store' }),
    fetch(aqiUrl, { cache: 'no-store' }),
    computeHistoricalAnomaly(lat, lon, cityName),
  ]);

  if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
    const rawW = await weatherRes.value.json();
    weatherResults = Array.isArray(rawW) ? rawW : [rawW];
  } else {
    throw new Error('Failed to fetch multi-coordinate meteorological telemetry');
  }

  if (aqiRes.status === 'fulfilled' && aqiRes.value.ok) {
    const rawA = await aqiRes.value.json();
    aqiResults = Array.isArray(rawA) ? rawA : [rawA];
  }

  if (baselineRes.status === 'fulfilled') {
    historicalBaseline = baselineRes.value;
  }

  // Extract baseline references
  const baseRainAvg = historicalBaseline?.rainfall?.historical_mean ?? 0.5;
  const baseRainStd = historicalBaseline?.rainfall?.historical_std ?? 1.5;
  const baseTempAvg = historicalBaseline?.temperature?.historical_mean ?? 25.0;
  const baseTempStd = Math.max(1.2, historicalBaseline?.temperature?.historical_std ?? 1.8);
  const sampleCount = historicalBaseline?.comparison_window?.total_baseline_samples ?? 150;

  // Build trend distribution arrays if available for accurate empirical percentiles
  const rainDist = historicalBaseline?.rainfall_trend?.map((t) => t.current_val) || [baseRainAvg];
  const tempDist = historicalBaseline?.temperature_trend?.map((t) => t.current_val) || [baseTempAvg];

  // 3. Process Each Geographical Cell Independently
  const counts = { normal: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  const cells: HotspotGridCell[] = [];

  for (let i = 0; i < grid.length; i++) {
    const zone = grid[i];
    const wItem = weatherResults[i]?.current || weatherResults[0]?.current || {};
    const aItem = aqiResults[i]?.current || aqiResults[0]?.current || null;

    const rainMm = typeof wItem.precipitation === 'number' ? parseFloat(wItem.precipitation.toFixed(2)) : 0;
    const tempC = typeof wItem.temperature_2m === 'number' ? parseFloat(wItem.temperature_2m.toFixed(1)) : baseTempAvg;
    const windKmh = typeof wItem.wind_speed_10m === 'number' ? parseFloat(wItem.wind_speed_10m.toFixed(1)) : 0;
    const weatherCode = wItem.weather_code ?? 0;

    const usAqi = aItem && typeof aItem.us_aqi === 'number' ? Math.round(aItem.us_aqi) : undefined;
    const pm25 = aItem && typeof aItem.pm2_5 === 'number' ? parseFloat(aItem.pm2_5.toFixed(1)) : undefined;
    const pm10 = aItem && typeof aItem.pm10 === 'number' ? parseFloat(aItem.pm10.toFixed(1)) : undefined;

    // Statistical Calculations for this cell
    const rainZ = rainMm === 0 && baseRainAvg < 1.0 ? 0 : calculateZScore(rainMm, baseRainAvg, Math.max(1.0, baseRainStd));
    const rainPct = rainMm === 0 && baseRainAvg < 0.5 ? 50 : calculatePercentile(rainMm, rainDist);

    const tempZ = calculateZScore(tempC, baseTempAvg, baseTempStd);
    const tempPct = calculatePercentile(tempC, tempDist);

    // Individual Normalized Parameter Scores (0 - 100)
    // Rainfall Score
    let rainScore = 0;
    if (rainMm > 0) {
      rainScore = Math.min(100, Math.max(0, Math.round(rainZ * 18 + Math.min(45, rainMm * 2.2))));
    }

    // Temperature Score (deviation from 10-year seasonal normal)
    const absTempZ = Math.abs(tempZ);
    const tempScore = Math.min(100, Math.max(0, Math.round(absTempZ * 20)));

    // AQI Score (if available)
    const aqiEval = usAqi !== undefined ? normalizeAqiScore(usAqi) : { score: 0, category: 'Unavailable' };
    const aqiScore = aqiEval.score;

    // Weighted Combined Score
    // Adjust weights cleanly depending on AQI availability
    let combinedScore = 0;
    if (usAqi !== undefined) {
      combinedScore = Math.round(0.40 * rainScore + 0.30 * tempScore + 0.30 * aqiScore);
    } else {
      combinedScore = Math.round(0.55 * rainScore + 0.45 * tempScore);
    }

    // Peak hazard amplification: if any single verified environmental driver is severely elevated, ensure combined score reflects it
    const maxSingleDriver = Math.max(rainScore, tempScore, aqiScore);
    if (maxSingleDriver >= 70 && combinedScore < maxSingleDriver * 0.85) {
      combinedScore = Math.round(maxSingleDriver * 0.85);
    }

    // Wind / Storm Gust Booster (if verified wind gusts > 35 km/h during rain)
    if (windKmh > 35 && rainMm > 2.0) {
      combinedScore = Math.min(100, combinedScore + 15);
    }

    const classification = classifyHotspotRisk(combinedScore);

    // Increment summary counters
    if (classification.level === 'NORMAL') counts.normal++;
    else if (classification.level === 'LOW') counts.low++;
    else if (classification.level === 'MODERATE') counts.moderate++;
    else if (classification.level === 'HIGH') counts.high++;
    else if (classification.level === 'CRITICAL') counts.critical++;

    // Determine Primary Driver & Dynamic Explanation
    let primaryDriver = 'Normal Seasonal Balance';
    if (rainScore >= tempScore && rainScore >= aqiScore && rainScore >= 25) {
      primaryDriver = 'Rainfall Anomaly';
    } else if (aqiScore >= rainScore && aqiScore >= tempScore && aqiScore >= 25) {
      primaryDriver = 'Elevated Air Quality (AQI)';
    } else if (tempScore >= 25) {
      primaryDriver = tempZ >= 0 ? 'Elevated Temperature' : 'Unusually Cool Anomaly';
    }

    let explanation = `${zone.name} is operating within normal seasonal expectations relative to the 10-year historical baseline.`;
    const recommendations: string[] = [];

    if (classification.level !== 'NORMAL') {
      if (primaryDriver === 'Rainfall Anomaly') {
        explanation = `Observed rainfall of ${rainMm} mm in ${zone.name} exceeds the 10-year seasonal baseline mean (${baseRainAvg} mm, ${rainPct}th percentile, Z=${rainZ >= 0 ? '+' : ''}${rainZ}).`;
        recommendations.push('Exercise caution along low-lying road stretches near drainage corridors.');
        recommendations.push('Allow extra transit buffer time and check municipal road advisories.');
      } else if (primaryDriver === 'Elevated Air Quality (AQI)') {
        explanation = `Verified AQI reading of ${usAqi} (${aqiEval.category}) detected in ${zone.name} with PM2.5 at ${pm25 ?? '--'} µg/m³.`;
        recommendations.push('Sensitive individuals should limit prolonged outdoor physical exertion.');
        recommendations.push('Keep vehicle cabin ventilation in recirculation mode along congested roads.');
      } else {
        const dir = tempZ >= 0 ? 'above' : 'below';
        explanation = `Observed temperature of ${tempC}°C in ${zone.name} is ${Math.abs(tempC - baseTempAvg).toFixed(1)}°C ${dir} the 10-year historical average (${baseTempAvg}°C, Z=${tempZ >= 0 ? '+' : ''}${tempZ}).`;
        recommendations.push(tempZ >= 0 ? 'Stay hydrated and avoid direct solar exposure between 12 PM and 3 PM.' : 'Wear appropriate thermal layers during early morning and late evening transit.');
      }
    } else {
      recommendations.push('Standard outdoor activities and transit routes face no anomalous climate interference.');
    }

    // Polygon bounds around each sampling center (~0.024° cell box)
    const dBox = 0.022;
    const boundary = [
      { lat: parseFloat((zone.lat + dBox).toFixed(4)), lon: parseFloat((zone.lon - dBox).toFixed(4)) },
      { lat: parseFloat((zone.lat + dBox).toFixed(4)), lon: parseFloat((zone.lon + dBox).toFixed(4)) },
      { lat: parseFloat((zone.lat - dBox).toFixed(4)), lon: parseFloat((zone.lon + dBox).toFixed(4)) },
      { lat: parseFloat((zone.lat - dBox).toFixed(4)), lon: parseFloat((zone.lon - dBox).toFixed(4)) },
    ];

    const affectsCommute = classification.level === 'MODERATE' || classification.level === 'HIGH' || classification.level === 'CRITICAL';

    cells.push({
      id: zone.id,
      name: zone.name,
      sub_region: zone.sub_region,
      lat: zone.lat,
      lon: zone.lon,
      boundary,
      observed: {
        rainfall_mm: rainMm,
        temp_c: tempC,
        aqi: usAqi,
        pm2_5: pm25,
        pm10: pm10,
        wind_speed_kmh: windKmh,
        weather_code: weatherCode,
      },
      historical_baseline: {
        avg_rainfall_mm: baseRainAvg,
        avg_temp_c: baseTempAvg,
        baseline_samples: sampleCount,
      },
      statistical: {
        rainfall_z: rainZ,
        rainfall_pct: rainPct,
        rainfall_category: rainScore >= 70 ? 'UNUSUAL' : rainScore >= 45 ? 'ABOVE_NORMAL' : 'NORMAL',
        temp_z: tempZ,
        temp_pct: tempPct,
        temp_category: tempScore >= 70 ? 'UNUSUAL' : tempScore >= 45 ? 'ABOVE_NORMAL' : 'NORMAL',
        aqi_category: aqiEval.category,
      },
      scores: {
        rainfall_score: rainScore,
        temp_score: tempScore,
        aqi_score: aqiScore,
        combined_score: combinedScore,
      },
      risk_level: classification.level,
      risk_label: classification.label,
      risk_color: classification.color,
      primary_driver: primaryDriver,
      explanation,
      recommendations,
      commuter_impact: {
        affects_route: affectsCommute,
        advisory: affectsCommute
          ? `${classification.label} anomaly affecting ${zone.corridor_note}.`
          : `Clear operating conditions along ${zone.corridor_note}.`,
        detour_note: affectsCommute
          ? `Prefer elevated arterial routes or Metro bypasses near ${zone.name}.`
          : undefined,
      },
      nearest_shelter: zone.civic_hub,
    });
  }

  // Sort to find highest risk cell
  const sortedByScore = [...cells].sort((a, b) => b.scores.combined_score - a.scores.combined_score);
  const highestRiskCell = sortedByScore[0] || null;

  const nowIso = new Date().toISOString();
  const report: HotspotReport = {
    location: {
      name: cityName,
      lat,
      lon,
    },
    timestamp: nowIso,
    last_updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    total_cells: cells.length,
    counts,
    active_layer: 'all',
    cells,
    highest_risk_cell: highestRiskCell,
    data_sources: [
      'Open-Meteo Multi-Coordinate Forecast API',
      'Open-Meteo Air Quality (CAMS/US-AQI) API',
      'Open-Meteo ERA5 10-Year Historical Reanalysis',
    ],
    disclaimer:
      'Geographical hotspot risk scores represent normalized statistical anomalies across multi-point grid observations and air quality sensors. High rainfall or temperature anomalies do not independently constitute declared floods or emergency disasters without official civil authority verification.',
    is_cached: false,
  };

  hotspotCache.set(cacheKey, { timestamp: Date.now(), report });
  return report;
}
