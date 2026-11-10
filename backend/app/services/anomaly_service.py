import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import httpx

# In-memory server cache: coordinate rounded to 2 decimals -> (timestamp, report)
_anomaly_cache: Dict[str, Any] = {}
CACHE_TTL_SECONDS = 12 * 3600  # 12 hours


def calculate_percentile(val: float, distribution: List[float]) -> int:
    if not distribution:
        return 50
    less_count = 0
    equal_count = 0
    for v in distribution:
        if v < val:
            less_count += 1
        elif abs(v - val) < 0.01:
            equal_count += 1
    pct = ((less_count + 0.5 * equal_count) / len(distribution)) * 100.0
    return max(1, min(99, int(round(pct))))


def calculate_stats(values: List[float]) -> Dict[str, float]:
    clean = [v for v in values if v is not None and not math.isnan(v)]
    if not clean:
        return {"mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0, "count": 0}
    mean = sum(clean) / len(clean)
    if len(clean) == 1:
        return {"mean": mean, "std": 0.0, "min": clean[0], "max": clean[0], "count": 1}
    var = sum((v - mean) ** 2 for v in clean) / (len(clean) - 1)
    std = math.sqrt(var)
    return {"mean": mean, "std": std, "min": min(clean), "max": max(clean), "count": len(clean)}


def calculate_z_score(val: float, mean: float, std: float) -> float:
    if std <= 0.01:
        return 0.0
    return round((val - mean) / std, 2)


def classify_anomaly(
    param_key: str,
    param_name: str,
    unit: str,
    current_val: float,
    stats: Dict[str, float],
    pct: int,
    z_score: float,
    sample_count: int,
    city_name: str,
) -> Dict[str, Any]:
    mean = stats["mean"]
    std = stats["std"]
    if z_score >= 2.0 or pct >= 98:
        category = "UNUSUAL"
        category_label = "Unusual High"
        status_color = "rose"
    elif z_score <= -2.0 or pct <= 2:
        category = "UNUSUAL"
        category_label = "Unusual Low"
        status_color = "rose"
    elif z_score >= 1.645 or pct >= 95:
        category = "ABOVE_NORMAL"
        category_label = "Above Normal"
        status_color = "amber"
    elif z_score <= -1.645 or pct <= 5:
        category = "BELOW_NORMAL"
        category_label = "Below Normal"
        status_color = "sky"
    else:
        category = "NORMAL"
        category_label = "Normal"
        status_color = "emerald"

    diff = current_val - mean
    diff_sign = "+" if diff >= 0 else ""
    diff_str = f"{diff_sign}{diff:.1f}{unit}"

    if category == "UNUSUAL":
        explanation = (
            f"{param_name} is outside typical historical boundaries ({pct}th percentile, Z={z_score:+.2f}). "
            f"Observed {current_val:.1f}{unit} vs 10-year baseline mean of {mean:.1f}{unit}."
        )
    elif category == "ABOVE_NORMAL":
        explanation = (
            f"{param_name} is higher than {pct}% of historical observations for this calendar period in {city_name} "
            f"({diff_str} above normal)."
        )
    elif category == "BELOW_NORMAL":
        explanation = (
            f"{param_name} is lower than typical historical patterns in {city_name} ({pct}th percentile, {diff_str})."
        )
    else:
        explanation = (
            f"{param_name} is within the expected historical baseline for this calendar period in {city_name}."
        )

    return {
        "parameter": param_key,
        "parameter_name": param_name,
        "unit": unit,
        "current_value": round(current_val, 1),
        "historical_mean": round(mean, 1),
        "historical_avg": round(mean, 1),
        "historical_std": round(std, 1),
        "historical_min": round(stats["min"], 1),
        "historical_max": round(stats["max"], 1),
        "historical_percentile": pct,
        "z_score": z_score,
        "category": category,
        "category_label": category_label,
        "status_color": status_color,
        "sample_count": sample_count,
        "explanation": explanation,
    }


async def get_historical_anomaly(lat: float, lon: float, city_name: str = "Pune") -> Dict[str, Any]:
    cache_key = f"{round(lat, 2)}_{round(lon, 2)}"
    now = datetime.now()
    now_ts = now.timestamp()

    if cache_key in _anomaly_cache:
        entry = _anomaly_cache[cache_key]
        if now_ts - entry["ts"] < CACHE_TTL_SECONDS:
            return entry["data"]

    # Historical 10-year window: from 10 years ago to 1 year ago
    current_year = now.year
    start_date = f"{current_year - 10}-01-01"
    end_date = f"{current_year - 1}-12-31"

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Fetch 10-year archive
        archive_url = (
            f"https://archive-api.open-meteo.com/v1/archive?"
            f"latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}"
            f"&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,temperature_2m_mean"
            f"&timezone=Asia/Kolkata"
        )
        archive_res = await client.get(archive_url)
        archive_data = archive_res.json() if archive_res.status_code == 200 else {}

        # 2. Fetch past 30 days + today
        forecast_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&past_days=30&forecast_days=1"
            f"&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,temperature_2m_mean"
            f"&timezone=Asia/Kolkata"
        )
        forecast_res = await client.get(forecast_url)
        forecast_data = forecast_res.json() if forecast_res.status_code == 200 else {}

    # Extract historical baseline (calendar day +- 7 days across 10 years)
    target_month = now.month
    target_day = now.day

    baseline_rain: List[float] = []
    baseline_temp_mean: List[float] = []
    baseline_temp_max: List[float] = []
    baseline_temp_min: List[float] = []

    arch_daily = archive_data.get("daily", {})
    arch_times = arch_daily.get("time", [])
    arch_rain = arch_daily.get("precipitation_sum", [])
    arch_temp_mean = arch_daily.get("temperature_2m_mean", [])
    arch_temp_max = arch_daily.get("temperature_2m_max", [])
    arch_temp_min = arch_daily.get("temperature_2m_min", [])

    for i, t_str in enumerate(arch_times):
        try:
            parts = [int(p) for p in t_str.split("-")]
            m, d = parts[1], parts[2]
            # Days difference around calendar year
            d_diff = abs((m - target_month) * 30 + (d - target_day))
            if d_diff <= 7 or d_diff >= 358:
                if i < len(arch_rain) and arch_rain[i] is not None:
                    baseline_rain.append(float(arch_rain[i]))
                if i < len(arch_temp_mean) and arch_temp_mean[i] is not None:
                    baseline_temp_mean.append(float(arch_temp_mean[i]))
                if i < len(arch_temp_max) and arch_temp_max[i] is not None:
                    baseline_temp_max.append(float(arch_temp_max[i]))
                if i < len(arch_temp_min) and arch_temp_min[i] is not None:
                    baseline_temp_min.append(float(arch_temp_min[i]))
        except Exception:
            continue

    # Stats
    rain_stats = calculate_stats(baseline_rain)
    temp_stats = calculate_stats(baseline_temp_mean)
    temp_max_stats = calculate_stats(baseline_temp_max)
    temp_min_stats = calculate_stats(baseline_temp_min)

    # Current today observations
    fc_daily = forecast_data.get("daily", {})
    fc_rain = fc_daily.get("precipitation_sum", [0.0])
    fc_temp_mean = fc_daily.get("temperature_2m_mean", [temp_stats["mean"]])
    fc_temp_max = fc_daily.get("temperature_2m_max", [temp_max_stats["mean"]])
    fc_temp_min = fc_daily.get("temperature_2m_min", [temp_min_stats["mean"]])

    today_rain = float(fc_rain[-1]) if fc_rain and fc_rain[-1] is not None else 0.0
    today_temp = float(fc_temp_mean[-1]) if fc_temp_mean and fc_temp_mean[-1] is not None else temp_stats["mean"]
    today_temp_max = float(fc_temp_max[-1]) if fc_temp_max and fc_temp_max[-1] is not None else temp_max_stats["mean"]
    today_temp_min = float(fc_temp_min[-1]) if fc_temp_min and fc_temp_min[-1] is not None else temp_min_stats["mean"]

    # Percentiles & Z-scores
    rain_pct = calculate_percentile(today_rain, baseline_rain)
    rain_z = calculate_z_score(today_rain, rain_stats["mean"], rain_stats["std"])

    temp_pct = calculate_percentile(today_temp, baseline_temp_mean)
    temp_z = calculate_z_score(today_temp, temp_stats["mean"], temp_stats["std"])

    temp_max_pct = calculate_percentile(today_temp_max, baseline_temp_max)
    temp_max_z = calculate_z_score(today_temp_max, temp_max_stats["mean"], temp_max_stats["std"])

    temp_min_pct = calculate_percentile(today_temp_min, baseline_temp_min)
    temp_min_z = calculate_z_score(today_temp_min, temp_min_stats["mean"], temp_min_stats["std"])

    sample_count = len(baseline_rain)

    # Classifications
    rain_anomaly = classify_anomaly(
        "rainfall", "Daily Rainfall", "mm", today_rain, rain_stats, rain_pct, rain_z, sample_count, city_name
    )
    temp_anomaly = classify_anomaly(
        "temperature", "Mean Temperature", "°C", today_temp, temp_stats, temp_pct, temp_z, sample_count, city_name
    )
    temp_max_anomaly = classify_anomaly(
        "temp_max", "Max Temperature", "°C", today_temp_max, temp_max_stats, temp_max_pct, temp_max_z, sample_count, city_name
    )
    temp_min_anomaly = classify_anomaly(
        "temp_min", "Min Temperature", "°C", today_temp_min, temp_min_stats, temp_min_pct, temp_min_z, sample_count, city_name
    )

    # Overall Classification
    categories = [rain_anomaly["category"], temp_anomaly["category"], temp_max_anomaly["category"], temp_min_anomaly["category"]]
    if "UNUSUAL" in categories:
        overall_status = "UNUSUAL"
        overall_label = "Unusual"
        overall_summary = f"Unusual weather anomaly detected in {city_name} relative to the 10-year seasonal baseline."
    elif "ABOVE_NORMAL" in categories:
        overall_status = "ABOVE_NORMAL"
        overall_label = "Above Normal"
        overall_summary = f"Conditions in {city_name} are tracking above historical seasonal averages."
    elif "BELOW_NORMAL" in categories:
        overall_status = "BELOW_NORMAL"
        overall_label = "Below Normal"
        overall_summary = f"Conditions in {city_name} are tracking below historical seasonal averages."
    else:
        overall_status = "NORMAL"
        overall_label = "Normal"
        overall_summary = f"Weather conditions in {city_name} are operating within the 10-year historical normal range."

    # Build 30-Day Trend Points
    fc_times = fc_daily.get("time", [])
    rainfall_trend = []
    temperature_trend = []

    for idx, t_str in enumerate(fc_times):
        c_rain = float(fc_rain[idx]) if idx < len(fc_rain) and fc_rain[idx] is not None else 0.0
        c_temp = float(fc_temp_mean[idx]) if idx < len(fc_temp_mean) and fc_temp_mean[idx] is not None else temp_stats["mean"]
        day_lbl = t_str.split("-", 1)[-1]

        rainfall_trend.append({
            "date": t_str,
            "day_label": day_lbl,
            "current_val": round(c_rain, 1),
            "historical_avg": round(rain_stats["mean"], 1),
            "historical_lower": 0.0,
            "historical_upper": round(rain_stats["mean"] + rain_stats["std"], 1),
        })

        temperature_trend.append({
            "date": t_str,
            "day_label": day_lbl,
            "current_val": round(c_temp, 1),
            "historical_avg": round(temp_stats["mean"], 1),
            "historical_lower": round(max(0.0, temp_stats["mean"] - temp_stats["std"]), 1),
            "historical_upper": round(temp_stats["mean"] + temp_stats["std"], 1),
        })

    # Cautious Non-Alarmist Advisory Notice
    is_active_advisory = overall_status == "UNUSUAL" or (overall_status == "ABOVE_NORMAL" and today_rain > 15.0)
    affected_param = "Rainfall" if rain_anomaly["category"] != "NORMAL" else "Temperature"
    advisory_notice = {
        "is_active": is_active_advisory,
        "parameter": affected_param,
        "severity": "warning",
        "title": f"Unusual {affected_param} Anomaly in {city_name}",
        "message": f"Statistically unusual {affected_param.lower()} detected in {city_name} relative to the 10-year baseline ({target_day:02d}/{target_month:02d} ±7 days).",
        "recommendation": "Exercise caution in low-lying corridors and verify local meteorological bulletins. Statistical anomalies do not independently constitute declared disasters.",
    } if is_active_advisory else None

    report = {
        "location": {
            "name": city_name,
            "lat": lat,
            "lon": lon,
        },
        "target_date": now.strftime("%Y-%m-%d"),
        "comparison_window": {
            "start_year": current_year - 10,
            "end_year": current_year - 1,
            "total_years": 10,
            "calendar_window_days": 15,
            "total_baseline_samples": sample_count,
        },
        "overall_status": overall_status,
        "overall_status_label": overall_label,
        "overall_summary": overall_summary,
        "advisory_notice": advisory_notice,
        "rainfall": rain_anomaly,
        "temperature": temp_anomaly,
        "temp_max": temp_max_anomaly,
        "temp_min": temp_min_anomaly,
        "rainfall_trend": rainfall_trend,
        "temperature_trend": temperature_trend,
        "data_source": "Open-Meteo Historical Archive & ERA5 Reanalysis",
        "source_attribution": "Open-Meteo ERA5 Reanalysis Dataset (10-Year Climatological Baseline)",
        "last_updated": now.isoformat(),
        "is_cached": False,
    }

    _anomaly_cache[cache_key] = {"ts": now_ts, "data": report}
    return report
