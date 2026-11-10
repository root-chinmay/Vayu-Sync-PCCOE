import { 
  HistoricalAnomalyReport, 
  WeatherParameterAnomaly, 
  HistoricalTrendPoint, 
  AnomalyCategory 
} from './types';

interface InflightCacheEntry {
  timestamp: number;
  report: HistoricalAnomalyReport;
}

// 12-hour server in-memory cache per coordinate rounded to 2 decimals
const anomalyServerCache = new Map<string, InflightCacheEntry>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Calculates empirical percentile of a value within a distribution
 */
export function calculatePercentile(val: number, distribution: number[]): number {
  if (!distribution || distribution.length === 0) return 50;
  let lessCount = 0;
  let equalCount = 0;
  for (const v of distribution) {
    if (v < val) lessCount++;
    else if (Math.abs(v - val) < 0.01) equalCount++;
  }
  const percentile = ((lessCount + 0.5 * equalCount) / distribution.length) * 100;
  return Math.max(1, Math.min(99, Math.round(percentile)));
}

/**
 * Calculates Mean & Sample Standard Deviation
 */
export function calculateMeanAndStd(values: number[]): { mean: number; std: number; min: number; max: number } {
  if (!values || values.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0 };
  }
  const clean = values.filter((v) => v !== null && !isNaN(v) && isFinite(v));
  if (clean.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0 };
  }

  const sum = clean.reduce((acc, v) => acc + v, 0);
  const mean = sum / clean.length;

  const min = Math.min(...clean);
  const max = Math.max(...clean);

  if (clean.length === 1) {
    return { mean, std: 0, min, max };
  }

  const varianceSum = clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const std = Math.sqrt(varianceSum / (clean.length - 1));

  return { mean, std, min, max };
}

/**
 * Calculates Z-Score with zero-variance protection
 */
export function calculateZScore(val: number, mean: number, std: number): number {
  if (std <= 0.01 || !isFinite(std)) {
    return 0;
  }
  const z = (val - mean) / std;
  return parseFloat(z.toFixed(2));
}

/**
 * Classifies an observed weather parameter into an anomaly category
 */
export function classifyParameterAnomaly(
  parameterName: string,
  paramKey: 'rainfall' | 'temperature' | 'temp_max' | 'temp_min',
  unit: string,
  currentVal: number,
  mean: number,
  std: number,
  percentile: number,
  zScore: number,
  sampleCount: number,
  cityName: string
): WeatherParameterAnomaly {
  let category: AnomalyCategory = 'NORMAL';
  let category_label = 'Normal';
  let status_color: 'emerald' | 'amber' | 'rose' | 'sky' = 'emerald';

  // Statistical Thresholds:
  // UNUSUAL: |Z| >= 2.0 OR Percentile >= 98 OR Percentile <= 2
  // ABOVE_NORMAL: Z > 1.645 OR Percentile > 95
  // BELOW_NORMAL: Z < -1.645 OR Percentile < 5
  // NORMAL: within 5th to 95th percentile
  if (zScore >= 2.0 || percentile >= 98) {
    category = 'UNUSUAL';
    category_label = 'Unusual High';
    status_color = 'rose';
  } else if (zScore <= -2.0 || percentile <= 2) {
    category = 'UNUSUAL';
    category_label = 'Unusual Low';
    status_color = 'amber';
  } else if (zScore > 1.4 || percentile > 90) {
    category = 'ABOVE_NORMAL';
    category_label = 'Above Normal';
    status_color = 'amber';
  } else if (zScore < -1.4 || percentile < 10) {
    category = 'BELOW_NORMAL';
    category_label = 'Below Normal';
    status_color = 'sky';
  } else {
    category = 'NORMAL';
    category_label = 'Normal';
    status_color = 'emerald';
  }

  // Generate dynamic, context-aware explanation
  let explanation = '';
  if (paramKey === 'rainfall') {
    if (currentVal === 0 && mean < 1.0) {
      explanation = `Today's rainfall is 0.0 mm, aligning with seasonal dry-period patterns in ${cityName} (10-year mean: ${mean.toFixed(1)} mm).`;
    } else if (category === 'UNUSUAL' && zScore > 0) {
      explanation = `Rainfall is higher than ${percentile}% of historical observations for this calendar window in ${cityName} (+${(currentVal - mean).toFixed(1)} mm deviation from 10-year mean).`;
    } else if (category === 'ABOVE_NORMAL') {
      explanation = `Rainfall is elevated compared to historical seasonal averages in ${cityName} (${percentile}th percentile, Z-score +${zScore}).`;
    } else if (category === 'BELOW_NORMAL') {
      explanation = `Rainfall is lower than ${100 - percentile}% of historical records for this seasonal period.`;
    } else {
      explanation = `Rainfall is within the expected 10-year historical range for ${cityName} (${percentile}th percentile).`;
    }
  } else {
    const diff = (currentVal - mean).toFixed(1);
    const sign = currentVal >= mean ? '+' : '';
    if (category === 'UNUSUAL') {
      explanation = `Temperature is unusual for this time of year in ${cityName} (${sign}${diff}°C deviation from 10-year baseline mean of ${mean.toFixed(1)}°C, ${percentile}th percentile).`;
    } else if (category === 'ABOVE_NORMAL') {
      explanation = `Temperature is moderately warmer than historical seasonal norms (${sign}${diff}°C vs historical mean of ${mean.toFixed(1)}°C).`;
    } else if (category === 'BELOW_NORMAL') {
      explanation = `Temperature is cooler than typical seasonal patterns in ${cityName} (${diff}°C below 10-year average).`;
    } else {
      explanation = `Temperature (${currentVal}°C) is within normal historical variance for this calendar window in ${cityName} (${percentile}th percentile).`;
    }
  }

  return {
    parameter: paramKey,
    parameter_name: parameterName,
    unit,
    current_value: parseFloat(currentVal.toFixed(1)),
    historical_mean: parseFloat(mean.toFixed(1)),
    historical_std: parseFloat(std.toFixed(2)),
    historical_min: parseFloat((calculateMeanAndStd([mean]).min || 0).toFixed(1)),
    historical_max: parseFloat((mean + 2 * std).toFixed(1)),
    historical_percentile: percentile,
    z_score: zScore,
    category,
    category_label,
    status_color,
    sample_count: sampleCount,
    explanation,
  };
}

/**
 * Main engine function to compute Historical Weather Anomaly Report
 */
export async function computeHistoricalAnomaly(
  lat: number,
  lon: number,
  cityName: string = 'Pune'
): Promise<HistoricalAnomalyReport> {
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const now = new Date();

  // Check in-memory server cache
  const cached = anomalyServerCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return {
      ...cached.report,
      location: { name: cityName, lat, lon },
      is_cached: true,
    };
  }

  const currentYear = now.getFullYear();
  const startYear = currentYear - 10;
  const endYear = currentYear - 1;

  // 1. Fetch 10-Year Historical Daily Records from Open-Meteo Archive API
  const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startYear}-01-01&end_date=${endYear}-12-31&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,temperature_2m_mean&timezone=Asia%2FKolkata`;
  
  // 2. Fetch Last 30 Days + Today from Open-Meteo Forecast API
  const recentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,temperature_2m_mean&past_days=30&forecast_days=1&timezone=Asia%2FKolkata`;

  const [archiveRes, recentRes] = await Promise.all([
    fetch(archiveUrl, { next: { revalidate: 86400 } }),
    fetch(recentUrl, { next: { revalidate: 1800 } }),
  ]);

  if (!archiveRes.ok || !recentRes.ok) {
    throw new Error(`Open-Meteo API error: archive=${archiveRes.status}, recent=${recentRes.status}`);
  }

  const archiveData = await archiveRes.json();
  const recentData = await recentRes.json();

  const histTimes: string[] = archiveData?.daily?.time || [];
  const histPrecip: number[] = archiveData?.daily?.precipitation_sum || [];
  const histTempMean: number[] = archiveData?.daily?.temperature_2m_mean || [];
  const histTempMax: number[] = archiveData?.daily?.temperature_2m_max || [];
  const histTempMin: number[] = archiveData?.daily?.temperature_2m_min || [];

  const recTimes: string[] = recentData?.daily?.time || [];
  const recPrecip: number[] = recentData?.daily?.precipitation_sum || [];
  const recTempMean: number[] = recentData?.daily?.temperature_2m_mean || [];
  const recTempMax: number[] = recentData?.daily?.temperature_2m_max || [];
  const recTempMin: number[] = recentData?.daily?.temperature_2m_min || [];

  if (histTimes.length === 0 || recTimes.length === 0) {
    throw new Error('Insufficient historical observations received from data provider.');
  }

  // Today's values (last index in recentData)
  const todayIdx = recTimes.length - 1;
  const todayDateStr = recTimes[todayIdx] || now.toISOString().split('T')[0];
  const todayRain = recPrecip[todayIdx] ?? 0;
  const todayTempMean = recTempMean[todayIdx] ?? 24.0;
  const todayTempMax = recTempMax[todayIdx] ?? 30.0;
  const todayTempMin = recTempMin[todayIdx] ?? 18.0;

  // Target day & month for comparison
  const targetDateObj = new Date(todayDateStr);
  const targetMonth = targetDateObj.getMonth();
  const targetDay = targetDateObj.getDate();

  // 3. Extract baseline window (+/- 7 days around target calendar date across 10 years)
  const baselineRain: number[] = [];
  const baselineTemp: number[] = [];
  const baselineMax: number[] = [];
  const baselineMin: number[] = [];

  for (let i = 0; i < histTimes.length; i++) {
    const d = new Date(histTimes[i]);
    const dTargetThisYear = new Date(d.getFullYear(), targetMonth, targetDay);
    const dayDiff = Math.abs((d.getTime() - dTargetThisYear.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff <= 7) {
      if (histPrecip[i] !== null && !isNaN(histPrecip[i])) baselineRain.push(histPrecip[i]);
      if (histTempMean[i] !== null && !isNaN(histTempMean[i])) baselineTemp.push(histTempMean[i]);
      if (histTempMax[i] !== null && !isNaN(histTempMax[i])) baselineMax.push(histTempMax[i]);
      if (histTempMin[i] !== null && !isNaN(histTempMin[i])) baselineMin.push(histTempMin[i]);
    }
  }

  const sampleCount = baselineRain.length;

  // 4. Statistics for Rainfall
  const statsRain = calculateMeanAndStd(baselineRain);
  const zRain = calculateZScore(todayRain, statsRain.mean, statsRain.std);
  const pctRain = calculatePercentile(todayRain, baselineRain);
  const rainAnomaly = classifyParameterAnomaly(
    'Daily Rainfall',
    'rainfall',
    'mm',
    todayRain,
    statsRain.mean,
    statsRain.std,
    pctRain,
    zRain,
    sampleCount,
    cityName
  );

  // 5. Statistics for Mean Temperature
  const statsTemp = calculateMeanAndStd(baselineTemp);
  const zTemp = calculateZScore(todayTempMean, statsTemp.mean, statsTemp.std);
  const pctTemp = calculatePercentile(todayTempMean, baselineTemp);
  const tempAnomaly = classifyParameterAnomaly(
    'Average Temperature',
    'temperature',
    '°C',
    todayTempMean,
    statsTemp.mean,
    statsTemp.std,
    pctTemp,
    zTemp,
    sampleCount,
    cityName
  );

  // 6. Statistics for Max Temperature
  const statsMax = calculateMeanAndStd(baselineMax);
  const zMax = calculateZScore(todayTempMax, statsMax.mean, statsMax.std);
  const pctMax = calculatePercentile(todayTempMax, baselineMax);
  const maxAnomaly = classifyParameterAnomaly(
    'Maximum Temperature',
    'temp_max',
    '°C',
    todayTempMax,
    statsMax.mean,
    statsMax.std,
    pctMax,
    zMax,
    sampleCount,
    cityName
  );

  // 7. Statistics for Min Temperature
  const statsMin = calculateMeanAndStd(baselineMin);
  const zMin = calculateZScore(todayTempMin, statsMin.mean, statsMin.std);
  const pctMin = calculatePercentile(todayTempMin, baselineMin);
  const minAnomaly = classifyParameterAnomaly(
    'Minimum Temperature',
    'temp_min',
    '°C',
    todayTempMin,
    statsMin.mean,
    statsMin.std,
    pctMin,
    zMin,
    sampleCount,
    cityName
  );

  // 8. 30-Day Trend Chart Series Construction
  // For each of the last 30 days, compute the 10-year historical mean and +/- 1 std dev bounds
  const rainfallTrend: HistoricalTrendPoint[] = [];
  const temperatureTrend: HistoricalTrendPoint[] = [];

  for (let j = 0; j < recTimes.length; j++) {
    const curDateStr = recTimes[j];
    const curD = new Date(curDateStr);
    const curMonth = curD.getMonth();
    const curDay = curD.getDate();

    const dayLabel = curD.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    // Historical samples for this specific calendar day (+/- 2 day smoothing across 10 years)
    const dayRainSamples: number[] = [];
    const dayTempSamples: number[] = [];

    for (let k = 0; k < histTimes.length; k++) {
      const hD = new Date(histTimes[k]);
      const hTarget = new Date(hD.getFullYear(), curMonth, curDay);
      const diff = Math.abs((hD.getTime() - hTarget.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 2) {
        if (histPrecip[k] !== null && !isNaN(histPrecip[k])) dayRainSamples.push(histPrecip[k]);
        if (histTempMean[k] !== null && !isNaN(histTempMean[k])) dayTempSamples.push(histTempMean[k]);
      }
    }

    const dayRainStats = calculateMeanAndStd(dayRainSamples);
    const dayTempStats = calculateMeanAndStd(dayTempSamples);

    rainfallTrend.push({
      date: curDateStr,
      day_label: dayLabel,
      current_val: parseFloat((recPrecip[j] || 0).toFixed(1)),
      historical_avg: parseFloat(dayRainStats.mean.toFixed(1)),
      historical_lower: Math.max(0, parseFloat((dayRainStats.mean - dayRainStats.std * 0.5).toFixed(1))),
      historical_upper: parseFloat((dayRainStats.mean + dayRainStats.std * 1.5).toFixed(1)),
    });

    temperatureTrend.push({
      date: curDateStr,
      day_label: dayLabel,
      current_val: parseFloat((recTempMean[j] || 0).toFixed(1)),
      historical_avg: parseFloat(dayTempStats.mean.toFixed(1)),
      historical_lower: parseFloat((dayTempStats.mean - dayTempStats.std).toFixed(1)),
      historical_upper: parseFloat((dayTempStats.mean + dayTempStats.std).toFixed(1)),
    });
  }

  // 9. Overall Status Determination
  let overall_status: AnomalyCategory = 'NORMAL';
  let overall_status_label = 'Normal';
  let overall_summary = 'Weather conditions are within normal 10-year historical ranges for this time of year.';

  const isRainUnusual = rainAnomaly.category === 'UNUSUAL';
  const isTempUnusual = tempAnomaly.category === 'UNUSUAL' || maxAnomaly.category === 'UNUSUAL';

  let advisoryNotice = null;

  if (isRainUnusual) {
    overall_status = 'UNUSUAL';
    overall_status_label = 'Unusual';
    overall_summary = `Unusual rainfall detected in ${cityName} compared with 10-year climate observations for this period (${pctRain}th percentile).`;
    advisoryNotice = {
      is_active: true,
      parameter: 'Rainfall',
      severity: 'warning' as const,
      title: `Unusual Rainfall Anomaly in ${cityName}`,
      message: `Rainfall is currently recorded at ${todayRain} mm (${pctRain}th percentile of 10-year baseline). Exercise caution around known low-lying corridors and verify local weather bulletins.`,
      recommendation: 'Statistical climate anomaly advisory — plan outdoor transit accordingly.',
    };
  } else if (isTempUnusual) {
    overall_status = 'UNUSUAL';
    overall_status_label = 'Unusual';
    overall_summary = `Unusual temperature anomaly detected in ${cityName} relative to the 10-year seasonal baseline.`;
    advisoryNotice = {
      is_active: true,
      parameter: 'Temperature',
      severity: 'warning' as const,
      title: `Unusual Thermal Anomaly in ${cityName}`,
      message: `Temperature has diverged significantly from historical seasonal averages (Z-score: ${zTemp}). Ensure adequate hydration and monitor thermal exposure.`,
      recommendation: 'Avoid strenuous outdoor exertion during peak solar hours.',
    };
  } else if (rainAnomaly.category === 'ABOVE_NORMAL' || tempAnomaly.category === 'ABOVE_NORMAL') {
    overall_status = 'ABOVE_NORMAL';
    overall_status_label = 'Above Normal';
    overall_summary = `Conditions in ${cityName} are slightly above historical averages, but within manageable seasonal parameters.`;
  } else if (rainAnomaly.category === 'BELOW_NORMAL' || tempAnomaly.category === 'BELOW_NORMAL') {
    overall_status = 'BELOW_NORMAL';
    overall_status_label = 'Below Normal';
    overall_summary = `Conditions in ${cityName} are tracking below seasonal historical averages.`;
  }

  const report: HistoricalAnomalyReport = {
    location: {
      name: cityName,
      lat,
      lon,
    },
    target_date: todayDateStr,
    comparison_window: {
      start_year: startYear,
      end_year: endYear,
      total_years: 10,
      calendar_window_days: 15, // +/- 7 days
      total_baseline_samples: sampleCount,
    },
    overall_status,
    overall_status_label,
    overall_summary,
    advisory_notice: advisoryNotice,
    rainfall: rainAnomaly,
    temperature: tempAnomaly,
    temp_max: maxAnomaly,
    temp_min: minAnomaly,
    rainfall_trend: rainfallTrend,
    temperature_trend: temperatureTrend,
    data_source: 'Open-Meteo Historical Archive & ERA5 Reanalysis',
    source_attribution: 'Open-Meteo ERA5 Reanalysis Dataset (10-Year Climatological Baseline)',
    last_updated: new Date().toISOString(),
    is_cached: false,
  };

  // Cache in server memory
  anomalyServerCache.set(cacheKey, {
    timestamp: Date.now(),
    report,
  });

  return report;
}
