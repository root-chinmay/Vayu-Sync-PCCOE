'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MapPin,
  Layers,
  Filter,
  Search,
  RefreshCw,
  WifiOff,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Compass,
  Navigation,
  ArrowRight,
  CloudRain,
  Thermometer,
  Wind,
  Activity,
  Info,
  Car,
  Building2,
} from 'lucide-react';
import {
  HotspotReport,
  HotspotGridCell,
  HotspotRiskLevel,
  EnvironmentalLayer,
} from '../lib/types';
import { classifyHotspotRisk } from '../lib/hotspotEngine';
import { useTheme } from '../hooks/useTheme';

interface HotspotFinderCardProps {
  hotspotReport?: HotspotReport | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  cityName?: string;
  onNavigateToSection?: (sectionId: string) => void;
  onNavigateToPersonalized?: () => void;
}

// Web Mercator projection helpers
const lon2x = (lon: number, zoom: number) => ((lon + 180) / 360) * Math.pow(2, zoom);
const lat2y = (lat: number, zoom: number) =>
  ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
  Math.pow(2, zoom);

const x2lon = (x: number, zoom: number) => (x / Math.pow(2, zoom)) * 360 - 180;
const y2lat = (y: number, zoom: number) => {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

const TILE_SIZE = 256;

export const HotspotFinderCard: React.FC<HotspotFinderCardProps> = ({
  hotspotReport,
  isLoading = false,
  onRefresh,
  cityName = 'Pune',
  onNavigateToSection,
  onNavigateToPersonalized,
}) => {
  const { isDark } = useTheme();
  const [selectedLayer, setSelectedLayer] = useState<EnvironmentalLayer>('all');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | HotspotRiskLevel>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCell, setSelectedCell] = useState<HotspotGridCell | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HotspotGridCell | null>(null);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(true);
  const [baseMapMode, setBaseMapMode] = useState<'voyager' | 'dark' | 'satellite'>('voyager');

  // Map Viewport state
  const [zoom, setZoom] = useState<number>(11);
  const [center, setCenter] = useState<{ lat: number; lon: number }>({
    lat: hotspotReport?.location?.lat || 18.5204,
    lon: hotspotReport?.location?.lon || 73.8567,
  });

  // Canvas & Tile caching refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; lat: number; lon: number; moved: boolean }>({
    x: 0,
    y: 0,
    lat: 18.5204,
    lon: 73.8567,
    moved: false,
  });
  const [, setRedrawTick] = useState(0);

  // Recenter when city changes
  useEffect(() => {
    if (hotspotReport?.location) {
      setCenter({ lat: hotspotReport.location.lat, lon: hotspotReport.location.lon });
      setZoom(11);
      setSelectedCell(null);
    }
  }, [hotspotReport?.location?.name, hotspotReport?.location?.lat, hotspotReport?.location?.lon]);

  // Compute dynamic layer-specific cell views
  const processedCells = useMemo(() => {
    if (!hotspotReport?.cells) return [];

    return hotspotReport.cells.map((cell) => {
      let layerScore = cell.scores.combined_score;
      let layerMetricDisplay = `${cell.scores.combined_score}/100`;

      if (selectedLayer === 'rainfall') {
        layerScore = cell.scores.rainfall_score;
        layerMetricDisplay = `${cell.observed.rainfall_mm} mm`;
      } else if (selectedLayer === 'temperature') {
        layerScore = cell.scores.temp_score;
        layerMetricDisplay = `${cell.observed.temp_c}°C`;
      } else if (selectedLayer === 'aqi') {
        layerScore = cell.scores.aqi_score;
        layerMetricDisplay = cell.observed.aqi !== undefined ? `AQI ${cell.observed.aqi}` : 'N/A';
      } else if (selectedLayer === 'flood_risk') {
        // Flood-Risk Indicators scale purely from sustained rainfall anomalies
        layerScore = cell.observed.rainfall_mm >= 15 ? Math.min(100, cell.scores.rainfall_score + 15) : cell.scores.rainfall_score;
        layerMetricDisplay = `${cell.observed.rainfall_mm} mm`;
      } else if (selectedLayer === 'storm_risk') {
        const windBoost = (cell.observed.wind_speed_kmh || 0) >= 30 ? 35 : Math.round((cell.observed.wind_speed_kmh || 0) * 0.8);
        layerScore = Math.min(100, Math.round(0.6 * cell.scores.rainfall_score + 0.4 * windBoost));
        layerMetricDisplay = `${cell.observed.wind_speed_kmh ?? 0} km/h`;
      }

      const riskInfo = classifyHotspotRisk(layerScore);

      return {
        ...cell,
        _displayScore: layerScore,
        _displayMetric: layerMetricDisplay,
        _displayRisk: riskInfo.level,
        _displayLabel: riskInfo.label,
        _displayColor: riskInfo.color,
      };
    });
  }, [hotspotReport?.cells, selectedLayer]);

  // Apply Risk Filter & Search Filter
  const visibleCells = useMemo(() => {
    return processedCells.filter((c) => {
      if (selectedRiskFilter !== 'ALL' && c._displayRisk !== selectedRiskFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchSub = (c.sub_region || '').toLowerCase().includes(q);
        if (!matchName && !matchSub) return false;
      }
      return true;
    });
  }, [processedCells, selectedRiskFilter, searchQuery]);

  // Summary counts based on active Environmental Layer
  const layerCounts = useMemo(() => {
    const counts = { normal: 0, low: 0, moderate: 0, high: 0, critical: 0 };
    for (const c of processedCells) {
      if (c._displayRisk === 'NORMAL') counts.normal++;
      else if (c._displayRisk === 'LOW') counts.low++;
      else if (c._displayRisk === 'MODERATE') counts.moderate++;
      else if (c._displayRisk === 'HIGH') counts.high++;
      else if (c._displayRisk === 'CRITICAL') counts.critical++;
    }
    return counts;
  }, [processedCells]);

  // Pixel projection
  const latlonToPixel = useCallback(
    (lat: number, lon: number, canvasW: number, canvasH: number) => {
      const cx = lon2x(center.lon, zoom);
      const cy = lat2y(center.lat, zoom);
      const px = lon2x(lon, zoom);
      const py = lat2y(lat, zoom);
      return {
        x: canvasW / 2 + (px - cx) * TILE_SIZE,
        y: canvasH / 2 + (py - cy) * TILE_SIZE,
      };
    },
    [center, zoom]
  );

  const getTileUrl = useCallback(
    (x: number, y: number, z: number) => {
      const subdomains = ['a', 'b', 'c', 'd'];
      const s = subdomains[Math.abs(x + y) % subdomains.length];
      if (baseMapMode === 'satellite') {
        return `https://mt${Math.abs(x + y) % 4}.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`;
      }
      if (baseMapMode === 'dark') {
        return `https://${s}.basemaps.cartocdn.com/rastertiles/dark_all/${z}/${x}/${y}.png`;
      }
      return `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
    },
    [baseMapMode]
  );

  // Canvas Render Effect
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background fallback
    ctx.fillStyle = baseMapMode === 'dark' ? '#0b1120' : '#e2e8f0';
    ctx.fillRect(0, 0, w, h);

    // 1. Render Base Map Tiles
    const cx = lon2x(center.lon, zoom);
    const cy = lat2y(center.lat, zoom);
    const numTilesX = Math.ceil(w / TILE_SIZE) + 2;
    const numTilesY = Math.ceil(h / TILE_SIZE) + 2;
    const startTileX = Math.floor(cx - numTilesX / 2);
    const startTileY = Math.floor(cy - numTilesY / 2);
    const maxTile = Math.pow(2, zoom);

    for (let tx = startTileX; tx <= startTileX + numTilesX; tx++) {
      for (let ty = startTileY; ty <= startTileY + numTilesY; ty++) {
        if (ty < 0 || ty >= maxTile) continue;
        const wrappedX = ((tx % maxTile) + maxTile) % maxTile;
        const px = Math.floor(w / 2 + (tx - cx) * TILE_SIZE);
        const py = Math.floor(h / 2 + (ty - cy) * TILE_SIZE);
        const url = getTileUrl(wrappedX, ty, zoom);

        let img = tileCacheRef.current.get(url);
        if (!img) {
          img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = url;
          img.onload = () => setRedrawTick((t) => t + 1);
          tileCacheRef.current.set(url, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // 2. Render Color-Coded Geographical Hotspot Cells (Polygons + Heatmap Zones)
    for (const cell of visibleCells) {
      const isSelected = selectedCell?.id === cell.id;
      const isHovered = hoveredCell?.id === cell.id;

      // Draw spatial cell polygon if boundary exists
      if (cell.boundary && cell.boundary.length >= 3) {
        ctx.beginPath();
        cell.boundary.forEach((pt, idx) => {
          const p = latlonToPixel(pt.lat, pt.lon, w, h);
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();

        // Fill translucent risk color
        ctx.save();
        ctx.fillStyle = cell._displayColor;
        ctx.globalAlpha = isSelected ? 0.45 : isHovered ? 0.38 : 0.25;
        ctx.fill();
        ctx.restore();

        // Crisp border
        ctx.strokeStyle = isSelected ? '#ffffff' : cell._displayColor;
        ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1.2;
        ctx.stroke();
      }

      // Draw Center Sensor Node
      const centerPt = latlonToPixel(cell.lat, cell.lon, w, h);
      if (centerPt.x >= -40 && centerPt.x <= w + 40 && centerPt.y >= -40 && centerPt.y <= h + 40) {
        // Outer glow ring for anomalies
        if (cell._displayRisk !== 'NORMAL' || isSelected) {
          ctx.beginPath();
          ctx.arc(centerPt.x, centerPt.y, isSelected ? 18 : 14, 0, Math.PI * 2);
          ctx.fillStyle = cell._displayColor;
          ctx.globalAlpha = 0.28;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        // Core marker pin circle
        ctx.beginPath();
        ctx.arc(centerPt.x, centerPt.y, isSelected ? 9 : 7, 0, Math.PI * 2);
        ctx.fillStyle = cell._displayColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Clean area label + metric badge on canvas
        const shortName = cell.name.split('&')[0].trim();
        ctx.font = isSelected ? 'bold 11px Inter, sans-serif' : '600 10px Inter, sans-serif';
        const labelText = `${shortName} (${cell._displayMetric})`;
        const textWidth = ctx.measureText(labelText).width;

        const boxX = centerPt.x - textWidth / 2 - 6;
        const boxY = centerPt.y + 12;

        ctx.fillStyle = isSelected ? '#0f172a' : 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, textWidth + 12, 18, 5);
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = cell._displayColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, centerPt.x, boxY + 9);
      }
    }

    // 3. Draw Lat/Lon Frame Coordinates (like GIS reference map)
    ctx.fillStyle = baseMapMode === 'dark' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, w, 20);
    ctx.fillStyle = baseMapMode === 'dark' ? '#94a3b8' : '#334155';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${center.lat.toFixed(4)}°N, ${center.lon.toFixed(4)}°E  •  ZOOM ${zoom}x`, 10, 10);
  }, [center, zoom, baseMapMode, visibleCells, selectedCell, hoveredCell, getTileUrl, latlonToPixel]);

  // Resize observer
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      const parent = containerRef.current;
      if (!canvas || !parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      renderCanvas();
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Mouse Interactions (Pan + Click Select Cell)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      lat: center.lat,
      lon: center.lon,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 4) {
        dragStartRef.current.moved = true;
      }
      const startX = lon2x(dragStartRef.current.lon, zoom);
      const startY = lat2y(dragStartRef.current.lat, zoom);
      const newLon = x2lon(startX - dx / TILE_SIZE, zoom);
      const newLat = y2lat(startY - dy / TILE_SIZE, zoom);
      setCenter({ lat: Math.max(-80, Math.min(80, newLat)), lon: newLon });
      return;
    }

    // Hover hit test
    let hit: HotspotGridCell | null = null;
    for (const cell of visibleCells) {
      const pt = latlonToPixel(cell.lat, cell.lon, canvas.width, canvas.height);
      if (Math.hypot(mx - pt.x, my - pt.y) <= 26) {
        hit = cell;
        break;
      }
    }
    setHoveredCell(hit);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStartRef.current.moved) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        let clickedCell: HotspotGridCell | null = null;
        let minDist = Infinity;
        for (const cell of visibleCells) {
          const pt = latlonToPixel(cell.lat, cell.lon, canvas.width, canvas.height);
          const dist = Math.hypot(mx - pt.x, my - pt.y);
          if (dist <= 35 && dist < minDist) {
            minDist = dist;
            clickedCell = cell;
          }
        }
        if (clickedCell) {
          setSelectedCell(clickedCell);
          setIsDetailsExpanded(true);
        }
      }
    }
    setIsDragging(false);
  };

  // Helper badge styling
  const getRiskBadgeClass = (level: HotspotRiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-950 text-red-200 border-red-700';
      case 'HIGH':
        return 'bg-rose-950/80 text-rose-300 border-rose-600/60';
      case 'MODERATE':
        return 'bg-orange-950/70 text-orange-300 border-orange-500/60';
      case 'LOW':
        return 'bg-yellow-950/70 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50';
    }
  };

  return (
    <div className="w-full rounded-3xl bg-[#090D14] border border-slate-800/90 p-5 sm:p-7 text-white shadow-2xl space-y-5 overflow-hidden">
      {/* 1. HEADER BAR (Matching Reference Screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              VayuSync – Hotspot Finder
            </h3>
            {hotspotReport?.is_cached ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-600/50">
                <WifiOff className="w-3 h-3" />
                OFFLINE CACHE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-600/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live data design
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-semibold text-slate-200">{hotspotReport?.location?.name || cityName}</span>
            <span>•</span>
            <span>{hotspotReport?.total_cells || 12} Geographical Micro-Grid Cells</span>
            {hotspotReport?.last_updated && (
              <>
                <span>•</span>
                <span className="font-mono text-slate-500">Synced: {hotspotReport.last_updated}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 transition active:scale-95"
              title="Re-query live multi-coordinate weather & AQI sensors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isLoading ? 'Scanning Grid...' : 'Sync Sensors'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER CONTROLS ROW (Environmental Layer, Risk Filter, Area Search) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Dropdown 1: Environmental layer */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400">Environmental layer</label>
          <div className="relative">
            <select
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value as EnvironmentalLayer)}
              className="w-full appearance-none bg-[#111723] border border-slate-800 hover:border-slate-700 text-slate-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 pr-9 focus:outline-none focus:border-sky-500 transition cursor-pointer"
            >
              <option value="all">All Hotspots (Combined Index)</option>
              <option value="rainfall">Rainfall Anomaly</option>
              <option value="temperature">Temperature Anomaly</option>
              <option value="aqi">Air Quality (US AQI / PM2.5)</option>
              <option value="flood_risk">Flood-Risk Indicators (Precip.)</option>
              <option value="storm_risk">Storm-Risk Indicators (Wind + Rain)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Dropdown 2: Risk filter */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400">Risk filter</label>
          <div className="relative">
            <select
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value as any)}
              className="w-full appearance-none bg-[#111723] border border-slate-800 hover:border-slate-700 text-slate-100 text-xs sm:text-sm font-medium rounded-xl px-3.5 py-2.5 pr-9 focus:outline-none focus:border-sky-500 transition cursor-pointer"
            >
              <option value="ALL">All risk levels ({processedCells.length})</option>
              <option value="NORMAL">Normal ({layerCounts.normal})</option>
              <option value="LOW">Low risk ({layerCounts.low})</option>
              <option value="MODERATE">Moderate ({layerCounts.moderate})</option>
              <option value="HIGH">High risk ({layerCounts.high})</option>
              <option value="CRITICAL">Critical risk ({layerCounts.critical})</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Input 3: Area Search */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400">Search locality or grid zone</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Kothrud, Hinjawadi, Shivajinagar..."
              className="w-full bg-[#111723] border border-slate-800 hover:border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Explicit Scientific Notice when Flood/Storm Indicators Selected */}
      {(selectedLayer === 'flood_risk' || selectedLayer === 'storm_risk') && (
        <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-800/50 flex items-start gap-2.5 text-xs text-sky-200">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>
            {selectedLayer === 'flood_risk'
              ? 'Flood-Risk Indicators evaluate high-percentile precipitation anomalies combined with seasonal norms. Official river-gauge telemetry or civic flood alerts are required to confirm active flooding.'
              : 'Storm-Risk Indicators evaluate convective precipitation coupled with surface wind speed (>30 km/h). Follow official meteorological bulletins for cyclone/severe thunderstorm warnings.'}
          </span>
        </div>
      )}

      {/* 3. INTERACTIVE HOTSPOT MAP CONTAINER */}
      <div
        ref={containerRef}
        className="relative w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-800 bg-[#0b1120] select-none"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setHoveredCell(null);
          }}
          className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : hoveredCell ? 'cursor-pointer' : 'cursor-grab'}`}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
            <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
            <span className="text-xs font-medium text-slate-200">Scanning multi-coordinate grid cells...</span>
          </div>
        )}

        {/* Map Controls (Top Right: Base Layer & Zoom) */}
        <div className="absolute top-8 right-3 z-10 flex flex-col gap-1.5">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 flex flex-col gap-1 shadow-lg">
            <button
              onClick={() => setZoom((z) => Math.min(14, z + 1))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(8, z - 1))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (hotspotReport?.location) {
                  setCenter({ lat: hotspotReport.location.lat, lon: hotspotReport.location.lon });
                  setZoom(11);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-sky-400 transition"
              title="Recenter Grid"
            >
              <Compass className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 flex flex-col gap-1 shadow-lg text-[10px] font-semibold">
            {(['voyager', 'dark', 'satellite'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setBaseMapMode(m)}
                className={`px-2 py-1 rounded-lg capitalize transition ${
                  baseMapMode === m ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'voyager' ? 'Map' : m}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Color Legend Overlay (Bottom Left) */}
        <div className="hidden sm:flex absolute bottom-3 left-3 z-10 items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-[10px] font-semibold">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" /> Normal</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" /> Low</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" /> Moderate</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" /> High</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#991b1b]" /> Critical</span>
        </div>

        {/* Hover Quick Tooltip */}
        {hoveredCell && (
          <div className="absolute bottom-3 right-3 z-10 px-3 py-2 rounded-xl bg-slate-950/95 border border-slate-700 text-xs shadow-xl pointer-events-none max-w-[240px]">
            <p className="font-bold text-white">{hoveredCell.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Rain: <strong className="text-sky-300">{hoveredCell.observed.rainfall_mm}mm</strong> • Temp: <strong className="text-amber-300">{hoveredCell.observed.temp_c}°C</strong>
              {hoveredCell.observed.aqi !== undefined && <> • AQI: <strong className="text-emerald-300">{hoveredCell.observed.aqi}</strong></>}
            </p>
            <p className="text-[10px] text-sky-400 mt-1">Click cell for complete breakdown</p>
          </div>
        )}
      </div>

      {/* Sub-map factual attribution line */}
      <p className="text-[11px] text-slate-400">
        Geographical cells generated from real multi-coordinate API observations ({hotspotReport?.data_sources?.[0] || 'Open-Meteo Multi-Coordinate API'}).
      </p>

      {/* 4. RISK SUMMARY COUNTERS ROW + EXPAND CHEVRON (Matching Reference Image 1 & 2) */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-1">
          <button
            onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'NORMAL' ? 'ALL' : 'NORMAL')}
            className={`text-left p-2.5 rounded-xl border transition ${
              selectedRiskFilter === 'NORMAL' ? 'bg-emerald-950/40 border-emerald-600/60' : 'border-transparent hover:bg-slate-900/60'
            }`}
          >
            <p className="text-xl font-bold text-emerald-400">{layerCounts.normal}</p>
            <p className="text-xs text-slate-400">Normal</p>
          </button>

          <button
            onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'LOW' ? 'ALL' : 'LOW')}
            className={`text-left p-2.5 rounded-xl border transition hidden sm:block ${
              selectedRiskFilter === 'LOW' ? 'bg-yellow-950/40 border-yellow-600/60' : 'border-transparent hover:bg-slate-900/60'
            }`}
          >
            <p className="text-xl font-bold text-yellow-400">{layerCounts.low}</p>
            <p className="text-xs text-slate-400">Low risk</p>
          </button>

          <button
            onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'MODERATE' ? 'ALL' : 'MODERATE')}
            className={`text-left p-2.5 rounded-xl border transition ${
              selectedRiskFilter === 'MODERATE' ? 'bg-orange-950/40 border-orange-600/60' : 'border-transparent hover:bg-slate-900/60'
            }`}
          >
            <p className="text-xl font-bold text-orange-400">{layerCounts.moderate}</p>
            <p className="text-xs text-slate-400">Moderate</p>
          </button>

          <button
            onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'HIGH' ? 'ALL' : 'HIGH')}
            className={`text-left p-2.5 rounded-xl border transition ${
              selectedRiskFilter === 'HIGH' ? 'bg-rose-950/40 border-rose-600/60' : 'border-transparent hover:bg-slate-900/60'
            }`}
          >
            <p className="text-xl font-bold text-rose-400">{layerCounts.high}</p>
            <p className="text-xs text-slate-400">High risk</p>
          </button>

          <button
            onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
            className={`text-left p-2.5 rounded-xl border transition hidden sm:block ${
              selectedRiskFilter === 'CRITICAL' ? 'bg-red-950/60 border-red-600' : 'border-transparent hover:bg-slate-900/60'
            }`}
          >
            <p className="text-xl font-bold text-red-500">{layerCounts.critical}</p>
            <p className="text-xs text-slate-400">Critical</p>
          </button>
        </div>

        {/* Center Chevron Button */}
        <div className="flex justify-center border-t border-slate-800/80 pt-3">
          <button
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 transition shadow-md"
            title={isDetailsExpanded ? 'Collapse hotspot details' : 'Expand hotspot details'}
          >
            {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 5. SELECTED HOTSPOT DETAILS PANEL (Matching Screenshot 1) */}
      {isDetailsExpanded && (
        <div className="space-y-4 pt-1 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3">
            <h4 className="text-sm font-bold text-white">Selected hotspot details</h4>
            {/* Quick selector pills for all cells */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {visibleCells.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCell(c);
                    setCenter({ lat: c.lat, lon: c.lon });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap border transition ${
                    selectedCell?.id === c.id
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {c.name.split('&')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {!selectedCell ? (
            <div className="p-4 rounded-2xl bg-[#111723] border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
              Select an actual detected map cell to view its observed values, historical comparison, anomaly score and recommended precautions.
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[#111723] border border-slate-800 space-y-4 animate-in fade-in">
              {/* Top Row: Area Identity + Combined Score Badge */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-base font-bold text-white">{selectedCell.name}</h5>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getRiskBadgeClass(selectedCell.risk_level)}`}>
                      {selectedCell.risk_label}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    {selectedCell.sub_region} • {selectedCell.lat.toFixed(4)}°N, {selectedCell.lon.toFixed(4)}°E
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Combined Anomaly Score</p>
                  <p className="text-2xl font-black text-white">
                    {selectedCell.scores.combined_score} <span className="text-xs font-normal text-slate-400">/ 100</span>
                  </p>
                </div>
              </div>

              {/* Observed vs Historical Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Rainfall */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                    <span>Observed Rainfall</span>
                  </div>
                  <p className="text-lg font-bold text-white">{selectedCell.observed.rainfall_mm} mm</p>
                  <p className="text-[11px] text-slate-400">
                    Normal: {selectedCell.historical_baseline.avg_rainfall_mm} mm • <span className="text-sky-300 font-mono">Z={selectedCell.statistical.rainfall_z >= 0 ? '+' : ''}{selectedCell.statistical.rainfall_z}</span>
                  </p>
                </div>

                {/* Temperature */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Observed Temp</span>
                  </div>
                  <p className="text-lg font-bold text-white">{selectedCell.observed.temp_c}°C</p>
                  <p className="text-[11px] text-slate-400">
                    Normal: {selectedCell.historical_baseline.avg_temp_c}°C • <span className="text-amber-300 font-mono">P{selectedCell.statistical.temp_pct}</span>
                  </p>
                </div>

                {/* AQI / Wind */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Air Quality (US AQI)</span>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {selectedCell.observed.aqi !== undefined ? selectedCell.observed.aqi : '--'}{' '}
                    <span className="text-xs font-normal text-slate-400">({selectedCell.statistical.aqi_category || 'Synced'})</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    PM2.5: {selectedCell.observed.pm2_5 ?? '--'} µg/m³ • Wind: {selectedCell.observed.wind_speed_kmh ?? '--'} km/h
                  </p>
                </div>
              </div>

              {/* Explanation & Recommendations */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  <strong className="text-sky-400">Primary Driver ({selectedCell.primary_driver}):</strong> {selectedCell.explanation}
                </p>
                {selectedCell.recommendations.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {selectedCell.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Commuter & Verified Civic Relief Facility Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {selectedCell.commuter_impact && (
                  <div className={`p-3 rounded-xl border ${selectedCell.commuter_impact.affects_route ? 'bg-amber-950/30 border-amber-800/60' : 'bg-slate-900/50 border-slate-800'}`}>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
                      <Car className="w-3.5 h-3.5 text-sky-400" />
                      <span>Commuter Route Advisory</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{selectedCell.commuter_impact.advisory}</p>
                    {selectedCell.commuter_impact.detour_note && (
                      <p className="text-[11px] text-amber-300 mt-1">{selectedCell.commuter_impact.detour_note}</p>
                    )}
                  </div>
                )}

                {selectedCell.nearest_shelter && (
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                    <div className="flex items-center justify-between gap-1 font-semibold text-slate-200 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Nearest Civic Facility</span>
                      </span>
                      {selectedCell.nearest_shelter.verified ? (
                        <span className="px-1.5 py-0.5 text-[9px] rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                          Civic Hub
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[9px] rounded bg-slate-800 text-slate-400">
                          Unverified Post
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium">{selectedCell.nearest_shelter.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {selectedCell.nearest_shelter.type} • ~{selectedCell.nearest_shelter.distance_km} km away
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connected Workflow Architecture Strip (From User Suggestion in Reference Image 1) */}
          <div className="pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/90 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Connected Climate Intelligence Pipeline
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                <button
                  onClick={() => onNavigateToSection?.('today-vs-normal')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 transition"
                >
                  Today vs Normal
                </button>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-300">
                  Hotspot Finder
                </span>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <button
                  onClick={() => onNavigateToSection?.('warnings')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition"
                >
                  Personalized Alerts
                </button>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <button
                  onClick={() => onNavigateToPersonalized?.()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 transition"
                >
                  Safe Route Recommendations
                </button>
              </div>
            </div>
          </div>

          {/* Disclaimer Footer */}
          <p className="text-[10px] text-slate-500 leading-relaxed">
            {hotspotReport?.disclaimer ||
              'Geographical hotspot scores combine Open-Meteo multi-coordinate weather telemetry, US AQI data, and 10-year ERA5 baselines. Statistical anomalies do not independently confirm floods or severe storms.'}
          </p>
        </div>
      )}
    </div>
  );
};
