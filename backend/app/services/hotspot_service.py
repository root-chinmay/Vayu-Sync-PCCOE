import math
from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx

from .anomaly_service import get_historical_anomaly, calculate_z_score, calculate_percentile

_hotspot_cache: Dict[str, Any] = {}
HOTSPOT_CACHE_TTL_SECONDS = 900  # 15 minutes


def generate_city_grid(lat: float, lon: float, city_name: str) -> List[Dict[str, Any]]:
    is_pune = "pune" in city_name.lower() or (abs(lat - 18.5204) < 0.25 and abs(lon - 73.8567) < 0.25)

    if is_pune:
        return [
            {"id": "pune-shivajinagar", "name": "Shivajinagar & Central Core", "sub_region": "PMC Central", "lat": 18.5308, "lon": 73.8475, "corridor": "JM Road / FC Road", "hub": {"name": "COEP & PMC Central Relief Center", "type": "Municipal Civic Hub", "distance_km": 0.8, "verified": True}},
            {"id": "pune-khadki", "name": "Khadki Cantonment", "sub_region": "North Central", "lat": 18.5642, "lon": 73.8340, "corridor": "Old Mumbai-Pune Hwy (NH-48)", "hub": {"name": "Khadki Cantonment General Hospital Hub", "type": "Cantonment Civic Shelter", "distance_km": 1.1, "verified": True}},
            {"id": "pune-cantonment", "name": "Pune Cantonment & Camp", "sub_region": "East Central", "lat": 18.5135, "lon": 73.8825, "corridor": "MG Road / Solapur Bazaar", "hub": {"name": "Pune Cantonment Board Civic Facility", "type": "Civic Assembly Point", "distance_km": 0.9, "verified": True}},
            {"id": "pune-kothrud", "name": "Kothrud & Karve Nagar", "sub_region": "West Pune", "lat": 18.5074, "lon": 73.8077, "corridor": "Paud Road / Karve Road", "hub": {"name": "PMC Kothrud Ward Office Relief Hub", "type": "Municipal Civic Center", "distance_km": 0.7, "verified": True}},
            {"id": "pune-hadapsar", "name": "Hadapsar & Manjri", "sub_region": "South-East Corridor", "lat": 18.5089, "lon": 73.9260, "corridor": "Pune-Solapur Highway", "hub": {"name": "PMC Hadapsar Ward Community Shelter", "type": "Municipal Shelter", "distance_km": 1.4, "verified": True}},
            {"id": "pune-viman-nagar", "name": "Viman Nagar & Kalyani Nagar", "sub_region": "North-East Corridor", "lat": 18.5679, "lon": 73.9143, "corridor": "Nagar Road / Airport Approach", "hub": {"name": "Viman Nagar PMC Emergency Center", "type": "Municipal Facility", "distance_km": 1.0, "verified": True}},
            {"id": "pune-hinjawadi", "name": "Hinjawadi & Sus", "sub_region": "West IT Belt", "lat": 18.5912, "lon": 73.7389, "corridor": "Wakad-Hinjawadi Flyover", "hub": {"name": "PMRDA Hinjawadi Emergency Post", "type": "District Disaster Post", "distance_km": 1.6, "verified": True}},
            {"id": "pune-pcmc", "name": "Pimpri-Chinchwad (PCMC)", "sub_region": "North-West Metro", "lat": 18.6279, "lon": 73.8009, "corridor": "PCMC Spine Road & Metro", "hub": {"name": "PCMC Auto Cluster Relief Facility", "type": "Municipal Disaster Hub", "distance_km": 1.3, "verified": True}},
            {"id": "pune-aundh-baner", "name": "Aundh & Baner", "sub_region": "North-West Zone", "lat": 18.5590, "lon": 73.7868, "corridor": "Baner Road / Balewadi High St", "hub": {"name": "Balewadi Sports Complex Civic Shelter", "type": "High-Capacity Hub", "distance_km": 1.9, "verified": True}},
            {"id": "pune-wagholi", "name": "Wagholi Sector", "sub_region": "Far East", "lat": 18.5808, "lon": 73.9808, "corridor": "Pune-Ahmednagar Hwy", "hub": {"name": "Wagholi Gram Panchayat / PMC Sub-Center", "type": "Civic Assembly Post", "distance_km": 1.5, "verified": False}},
            {"id": "pune-katraj", "name": "Katraj & Dhankawadi", "sub_region": "South Gateway", "lat": 18.4575, "lon": 73.8677, "corridor": "Satara Road / Katraj Tunnel", "hub": {"name": "PMC Katraj Ward Emergency Hub", "type": "Municipal Facility", "distance_km": 1.2, "verified": True}},
            {"id": "pune-sinhagad", "name": "Sinhagad Road & Vadgaon", "sub_region": "South-West Riverfront", "lat": 18.4722, "lon": 73.8211, "corridor": "Sinhagad Road / Mutha Bank", "hub": {"name": "PMC Sinhagad Road School Shelter", "type": "Designated Shelter", "distance_km": 0.9, "verified": True}},
        ]

    step = 0.055
    offsets = [
        ("center", f"{city_name} Central Core", "Urban Core", 0, 0, "Primary city arterial network"),
        ("north", f"{city_name} North Sector", "North Zone", step * 1.4, 0, "Northern transit highway"),
        ("south", f"{city_name} South Sector", "South Zone", -step * 1.4, 0, "Southern expressway corridor"),
        ("east", f"{city_name} East Sector", "East Zone", 0, step * 1.5, "Eastern ring road"),
        ("west", f"{city_name} West Sector", "West Zone", 0, -step * 1.5, "Western suburban corridor"),
        ("ne", f"{city_name} North-East", "NE Quadrant", step, step, "NE arterial bypass"),
        ("nw", f"{city_name} North-West", "NW Quadrant", step, -step, "NW connector corridor"),
        ("se", f"{city_name} South-East", "SE Quadrant", -step, step, "SE transit corridor"),
        ("sw", f"{city_name} South-West", "SW Quadrant", -step, -step, "SW ring road approach"),
        ("outer-n", f"{city_name} Outer North", "Peri-Urban N", step * 2.1, step * 0.4, "Outer northern highway"),
        ("outer-s", f"{city_name} Outer South", "Peri-Urban S", -step * 2.1, -step * 0.4, "Outer southern perimeter"),
        ("outer-e", f"{city_name} Outer East", "Peri-Urban E", -step * 0.3, step * 2.2, "Outer eastern bypass"),
    ]

    slug = "".join(c for c in city_name.lower() if c.isalnum())
    return [
        {
            "id": f"{slug}-{o[0]}",
            "name": o[1],
            "sub_region": o[2],
            "lat": round(lat + o[3], 4),
            "lon": round(lon + o[4], 4),
            "corridor": o[5],
            "hub": {"name": f"{o[1]} Municipal Civic Center", "type": "Local Civic Facility", "distance_km": 1.5, "verified": False},
        }
        for o in offsets
    ]


def normalize_aqi(aqi: float):
    if aqi <= 50:
        return int(round((aqi / 50.0) * 15.0)), "Good"
    if aqi <= 100:
        return int(round(15.0 + ((aqi - 50.0) / 50.0) * 20.0)), "Moderate"
    if aqi <= 150:
        return int(round(35.0 + ((aqi - 100.0) / 50.0) * 25.0)), "Poor (Sensitive)"
    if aqi <= 200:
        return int(round(60.0 + ((aqi - 150.0) / 50.0) * 25.0)), "Unhealthy"
    return min(100, int(round(85.0 + ((aqi - 200.0) / 100.0) * 15.0))), "Severe / Critical"


def classify_risk(score: int):
    if score >= 85:
        return "CRITICAL", "Critical Risk", "#991b1b"
    if score >= 70:
        return "HIGH", "High Risk", "#dc2626"
    if score >= 45:
        return "MODERATE", "Moderate", "#ea580c"
    if score >= 25:
        return "LOW", "Low Risk", "#eab308"
    return "NORMAL", "Normal", "#16a34a"


async def get_geographical_hotspots(lat: float, lon: float, city_name: str = "Pune", force: bool = False) -> Dict[str, Any]:
    cache_key = f"{round(lat, 2)}_{round(lon, 2)}"
    now = datetime.now()
    now_ts = now.timestamp()

    if not force and cache_key in _hotspot_cache:
        entry = _hotspot_cache[cache_key]
        if now_ts - entry["ts"] < HOTSPOT_CACHE_TTL_SECONDS:
            data = dict(entry["data"])
            data["is_cached"] = True
            return data

    grid = generate_city_grid(lat, lon, city_name)
    lats_str = ",".join(str(g["lat"]) for g in grid)
    lons_str = ",".join(str(g["lon"]) for g in grid)

    w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lats_str}&longitude={lons_str}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia/Kolkata"
    a_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lats_str}&longitude={lons_str}&current=pm10,pm2_5,us_aqi&timezone=Asia/Kolkata"

    async with httpx.AsyncClient(timeout=15.0) as client:
        w_res = await client.get(w_url)
        w_raw = w_res.json() if w_res.status_code == 200 else []
        w_list = w_raw if isinstance(w_raw, list) else [w_raw]

        try:
            a_res = await client.get(a_url)
            a_raw = a_res.json() if a_res.status_code == 200 else []
            a_list = a_raw if isinstance(a_raw, list) else [a_raw]
        except Exception:
            a_list = []

    baseline = await get_historical_anomaly(lat, lon, city_name)
    base_rain_avg = baseline.get("rainfall", {}).get("historical_mean", baseline.get("rainfall", {}).get("historical_avg", 0.5))
    base_rain_std = baseline.get("rainfall", {}).get("historical_std", 1.5)
    base_temp_avg = baseline.get("temperature", {}).get("historical_mean", baseline.get("temperature", {}).get("historical_avg", 25.0))
    base_temp_std = max(1.2, baseline.get("temperature", {}).get("historical_std", 1.8))
    sample_count = baseline.get("comparison_window", {}).get("total_baseline_samples", baseline.get("sample_count", 150))

    rain_dist = [p["current_val"] for p in baseline.get("rainfall_trend", [])] or [base_rain_avg]
    temp_dist = [p["current_val"] for p in baseline.get("temperature_trend", [])] or [base_temp_avg]

    counts = {"normal": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0}
    cells = []

    for i, zone in enumerate(grid):
        w_cur = (w_list[i].get("current") if i < len(w_list) else w_list[0].get("current")) if w_list else {}
        a_cur = (a_list[i].get("current") if i < len(a_list) else a_list[0].get("current")) if a_list else {}

        rain_mm = round(float(w_cur.get("precipitation") or 0.0), 2)
        temp_c = round(float(w_cur.get("temperature_2m") or base_temp_avg), 1)
        wind_kmh = round(float(w_cur.get("wind_speed_10m") or 0.0), 1)
        w_code = int(w_cur.get("weather_code") or 0)

        us_aqi = int(round(a_cur["us_aqi"])) if a_cur and a_cur.get("us_aqi") is not None else None
        pm25 = round(float(a_cur["pm2_5"]), 1) if a_cur and a_cur.get("pm2_5") is not None else None
        pm10 = round(float(a_cur["pm10"]), 1) if a_cur and a_cur.get("pm10") is not None else None

        rain_z = 0.0 if (rain_mm == 0 and base_rain_avg < 1.0) else calculate_z_score(rain_mm, base_rain_avg, max(1.0, base_rain_std))
        rain_pct = 50 if (rain_mm == 0 and base_rain_avg < 0.5) else calculate_percentile(rain_mm, rain_dist)

        temp_z = calculate_z_score(temp_c, base_temp_avg, base_temp_std)
        temp_pct = calculate_percentile(temp_c, temp_dist)

        rain_score = min(100, max(0, int(round(rain_z * 18 + min(45.0, rain_mm * 2.2))))) if rain_mm > 0 else 0
        temp_score = min(100, max(0, int(round(abs(temp_z) * 20.0))))
        aqi_score, aqi_cat = normalize_aqi(us_aqi) if us_aqi is not None else (0, "Unavailable")

        if us_aqi is not None:
            combined = int(round(0.40 * rain_score + 0.30 * temp_score + 0.30 * aqi_score))
        else:
            combined = int(round(0.55 * rain_score + 0.45 * temp_score))

        max_driver = max(rain_score, temp_score, aqi_score)
        if max_driver >= 70 and combined < max_driver * 0.85:
            combined = int(round(max_driver * 0.85))
        if wind_kmh > 35 and rain_mm > 2.0:
            combined = min(100, combined + 15)

        level, label, color = classify_risk(combined)
        counts[level.lower()] += 1

        driver = "Normal Seasonal Balance"
        if rain_score >= temp_score and rain_score >= aqi_score and rain_score >= 25:
            driver = "Rainfall Anomaly"
        elif aqi_score >= rain_score and aqi_score >= temp_score and aqi_score >= 25:
            driver = "Elevated Air Quality (AQI)"
        elif temp_score >= 25:
            driver = "Elevated Temperature" if temp_z >= 0 else "Unusually Cool Anomaly"

        if level == "NORMAL":
            explanation = f"{zone['name']} is operating within normal seasonal expectations relative to the 10-year historical baseline."
            recs = ["Standard outdoor activities and transit routes face no anomalous climate interference."]
        elif driver == "Rainfall Anomaly":
            explanation = f"Observed rainfall of {rain_mm} mm in {zone['name']} exceeds the 10-year seasonal baseline mean ({base_rain_avg} mm, {rain_pct}th percentile, Z={rain_z:+.2f})."
            recs = ["Exercise caution along low-lying road stretches near drainage corridors.", "Allow extra transit buffer time."]
        elif driver == "Elevated Air Quality (AQI)":
            explanation = f"Verified AQI reading of {us_aqi} ({aqi_cat}) detected in {zone['name']} with PM2.5 at {pm25} µg/m³."
            recs = ["Sensitive individuals should limit prolonged outdoor physical exertion.", "Keep vehicle cabin ventilation in recirculation mode."]
        else:
            explanation = f"Observed temperature of {temp_c}°C in {zone['name']} diverges from the 10-year historical average ({base_temp_avg}°C, Z={temp_z:+.2f})."
            recs = ["Stay hydrated during solar peak hours." if temp_z >= 0 else "Wear appropriate thermal layers."]

        d_box = 0.022
        boundary = [
            {"lat": round(zone["lat"] + d_box, 4), "lon": round(zone["lon"] - d_box, 4)},
            {"lat": round(zone["lat"] + d_box, 4), "lon": round(zone["lon"] + d_box, 4)},
            {"lat": round(zone["lat"] - d_box, 4), "lon": round(zone["lon"] + d_box, 4)},
            {"lat": round(zone["lat"] - d_box, 4), "lon": round(zone["lon"] - d_box, 4)},
        ]

        affects = level in ("MODERATE", "HIGH", "CRITICAL")

        cells.append({
            "id": zone["id"],
            "name": zone["name"],
            "sub_region": zone["sub_region"],
            "lat": zone["lat"],
            "lon": zone["lon"],
            "boundary": boundary,
            "observed": {
                "rainfall_mm": rain_mm,
                "temp_c": temp_c,
                "aqi": us_aqi,
                "pm2_5": pm25,
                "pm10": pm10,
                "wind_speed_kmh": wind_kmh,
                "weather_code": w_code,
            },
            "historical_baseline": {
                "avg_rainfall_mm": base_rain_avg,
                "avg_temp_c": base_temp_avg,
                "baseline_samples": sample_count,
            },
            "statistical": {
                "rainfall_z": rain_z,
                "rainfall_pct": rain_pct,
                "rainfall_category": "UNUSUAL" if rain_score >= 70 else "ABOVE_NORMAL" if rain_score >= 45 else "NORMAL",
                "temp_z": temp_z,
                "temp_pct": temp_pct,
                "temp_category": "UNUSUAL" if temp_score >= 70 else "ABOVE_NORMAL" if temp_score >= 45 else "NORMAL",
                "aqi_category": aqi_cat,
            },
            "scores": {
                "rainfall_score": rain_score,
                "temp_score": temp_score,
                "aqi_score": aqi_score,
                "combined_score": combined,
            },
            "risk_level": level,
            "risk_label": label,
            "risk_color": color,
            "primary_driver": driver,
            "explanation": explanation,
            "recommendations": recs,
            "commuter_impact": {
                "affects_route": affects,
                "advisory": f"{label} anomaly affecting {zone['corridor']}." if affects else f"Clear operating conditions along {zone['corridor']}.",
                "detour_note": f"Prefer elevated arterial routes or Metro bypasses near {zone['name']}." if affects else None,
            },
            "nearest_shelter": zone["hub"],
        })

    highest = max(cells, key=lambda c: c["scores"]["combined_score"]) if cells else None

    report = {
        "location": {"name": city_name, "lat": lat, "lon": lon},
        "timestamp": now.isoformat(),
        "last_updated": now.strftime("%I:%M %p"),
        "total_cells": len(cells),
        "counts": counts,
        "active_layer": "all",
        "cells": cells,
        "highest_risk_cell": highest,
        "data_sources": [
            "Open-Meteo Multi-Coordinate Forecast API",
            "Open-Meteo Air Quality (CAMS/US-AQI) API",
            "Open-Meteo ERA5 10-Year Historical Reanalysis",
        ],
        "disclaimer": "Geographical hotspot risk scores represent normalized statistical anomalies across multi-point grid observations and air quality sensors. High rainfall or temperature anomalies do not independently constitute declared floods or emergency disasters without official civil authority verification.",
        "is_cached": False,
    }

    _hotspot_cache[cache_key] = {"ts": now_ts, "data": report}
    return report
