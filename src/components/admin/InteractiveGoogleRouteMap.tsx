import React, { useState, useEffect, useRef } from 'react';
import { Navigation, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { loadGoogleMapsSdk } from './GoogleAddressPinPicker';

interface RouteStepItem {
  instruction: string;
  distanceMeters: number;
}

interface InteractiveGoogleRouteMapProps {
  routeId: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  moverLat?: number;
  moverLng?: number;
  originLabel?: string;
  destLabel?: string;
  moverLabel?: string;
  travelMode?: 'driving' | 'motorcycle' | 'walking' | 'transit' | 'rideshare';
  encodedPolylineOverride?: string;
  showSimplifiedOnly?: boolean;
  isDark?: boolean;
  adversityLabel?: string | null;
  onRouteResolved?: (info: {
    distanceKm: number;
    etaMinutes: number;
    encodedPolyline: string;
    source: string;
    steps: RouteStepItem[];
  }) => void;
}

const DARK_ROUTE_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#090d16' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#090d16' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

function decodePolylineString(encoded: string): Array<{ lat: number; lng: number }> {
  if (!encoded || typeof encoded !== 'string') return [];
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index <= len);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index <= len);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const InteractiveGoogleRouteMap: React.FC<InteractiveGoogleRouteMapProps> = ({
  routeId,
  originLat,
  originLng,
  destLat,
  destLng,
  moverLat,
  moverLng,
  originLabel = 'Partida',
  destLabel = 'Destino',
  moverLabel = 'Em deslocamento (10s)',
  travelMode = 'driving',
  encodedPolylineOverride,
  showSimplifiedOnly = false,
  isDark = true,
  adversityLabel = null,
  onRouteResolved,
}) => {
  const [sdkReady, setSdkReady] = useState(false);
  const [routeSource, setRouteSource] = useState<string>('Carregando malha viária...');
  const [routeStats, setRouteStats] = useState<{ distanceKm: number; etaMinutes: number } | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const moverMarkerRef = useRef<any>(null);

  const lastFittedRouteKeyRef = useRef<string>('');
  const lastMoverUpdateRef = useRef<{ lat: number; lng: number; timestamp: number }>({
    lat: 0,
    lng: 0,
    timestamp: 0,
  });
  const decodedPathRef = useRef<Array<{ lat: number; lng: number }>>([]);

  useEffect(() => {
    loadGoogleMapsSdk().then((ready) => setSdkReady(ready));
  }, []);

  useEffect(() => {
    if (!sdkReady || !mapContainerRef.current || !window.google?.maps?.Map) return;

    if (!mapRef.current) {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: originLat || -23.561684, lng: originLng || -46.655981 },
        zoom: 14,
        styles: isDark ? DARK_ROUTE_MAP_STYLES : undefined,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });

      const roadPolyline = new window.google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 0.95,
        strokeWeight: 5,
        map: showSimplifiedOnly ? null : map,
      });

      const originMarker = new window.google.maps.Marker({
        position: { lat: originLat, lng: originLng },
        map,
        title: originLabel,
        label: {
          text: 'A',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
        },
      });

      const destMarker = new window.google.maps.Marker({
        position: { lat: destLat, lng: destLng },
        map,
        title: destLabel,
        label: {
          text: 'B',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
        },
      });

      const moverMarker = new window.google.maps.Marker({
        position: { lat: moverLat ?? originLat, lng: moverLng ?? originLng },
        map,
        title: moverLabel,
        zIndex: 999,
      });

      mapRef.current = map;
      polylineRef.current = roadPolyline;
      originMarkerRef.current = originMarker;
      destMarkerRef.current = destMarker;
      moverMarkerRef.current = moverMarker;
    } else {
      mapRef.current.setOptions({
        styles: isDark ? DARK_ROUTE_MAP_STYLES : undefined,
      });
    }
  }, [sdkReady, isDark]);

  useEffect(() => {
    if (!polylineRef.current || !mapRef.current) return;
    polylineRef.current.setMap(showSimplifiedOnly ? null : mapRef.current);
  }, [showSimplifiedOnly]);

  useEffect(() => {
    if (!sdkReady || !mapRef.current) return;

    const routeSignature = `${routeId}|${originLat.toFixed(5)},${originLng.toFixed(5)}->${destLat.toFixed(5)},${destLng.toFixed(5)}|${travelMode}`;
    let cancelled = false;

    const applyPathToMap = (
      pathPoints: Array<{ lat: number; lng: number }>,
      sourceLabel: string,
      distanceKm: number,
      etaMinutes: number,
      encodedPoly: string,
      steps: RouteStepItem[]
    ) => {
      if (cancelled || !mapRef.current || !polylineRef.current) return;

      decodedPathRef.current = pathPoints;
      polylineRef.current.setPath(pathPoints);
      polylineRef.current.setMap(showSimplifiedOnly ? null : mapRef.current);

      if (originMarkerRef.current) {
        originMarkerRef.current.setPosition({ lat: originLat, lng: originLng });
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.setPosition({ lat: destLat, lng: destLng });
      }

      if (lastFittedRouteKeyRef.current !== routeSignature && pathPoints.length > 0) {
        lastFittedRouteKeyRef.current = routeSignature;
        const bounds = new window.google.maps.LatLngBounds();
        pathPoints.forEach((pt) => bounds.extend(pt));
        bounds.extend({ lat: originLat, lng: originLng });
        bounds.extend({ lat: destLat, lng: destLng });
        mapRef.current.fitBounds(bounds, 48);
      }

      setRouteSource(sourceLabel);
      setRouteStats({ distanceKm, etaMinutes });
      if (onRouteResolved) {
        onRouteResolved({
          distanceKm,
          etaMinutes,
          encodedPolyline: encodedPoly,
          source: sourceLabel,
          steps,
        });
      }
    };

    const resolveRoadGeometry = async () => {
      setIsRecalculating(true);
      try {

        if (encodedPolylineOverride && encodedPolylineOverride.length > 12) {
          const pts = decodePolylineString(encodedPolylineOverride);
          if (pts.length > 2) {
            applyPathToMap(pts, 'Polilinha Viária Sincronizada', 2.4, 8, encodedPolylineOverride, []);
            setIsRecalculating(false);
            return;
          }
        }

        let backendData: any = null;
        try {
          const resp = await fetch('/api/geo/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originLat,
              originLng,
              destLat,
              destLng,
              travelMode,
            }),
          });
          if (resp.ok) {
            backendData = await resp.json();
          }
        } catch {}

        if (backendData?.success && backendData?.encodedPolyline && backendData.source === 'google_routes_v2') {
          const pts = decodePolylineString(backendData.encodedPolyline);
          if (pts.length > 2) {
            applyPathToMap(
              pts,
              'Google Routes API v2 (Malha Real)',
              backendData.distanceKm || 2.1,
              backendData.etaMinutes || 7,
              backendData.encodedPolyline,
              backendData.steps || []
            );
            setIsRecalculating(false);
            return;
          }
        }

        if (window.google?.maps?.DirectionsService) {
          const directionsService = new window.google.maps.DirectionsService();
          const gMode =
            travelMode === 'walking'
              ? window.google.maps.TravelMode.WALKING
              : travelMode === 'transit'
              ? window.google.maps.TravelMode.TRANSIT
              : window.google.maps.TravelMode.DRIVING;

          const browserRoute = await new Promise<any>((resolve) => {
            directionsService.route(
              {
                origin: { lat: originLat, lng: originLng },
                destination: { lat: destLat, lng: destLng },
                travelMode: gMode,
              },
              (result: any, status: any) => {
                if (status === 'OK' && result?.routes?.[0]) {
                  resolve(result.routes[0]);
                } else {
                  resolve(null);
                }
              }
            );
          });

          if (browserRoute && Array.isArray(browserRoute.overview_path) && browserRoute.overview_path.length > 2) {
            const pts = browserRoute.overview_path.map((p: any) => ({
              lat: typeof p.lat === 'function' ? p.lat() : Number(p.lat),
              lng: typeof p.lng === 'function' ? p.lng() : Number(p.lng),
            }));
            const leg = browserRoute.legs?.[0];
            const distKm = leg?.distance?.value ? Number((leg.distance.value / 1000).toFixed(2)) : 2.1;
            const etaMin = leg?.duration?.value ? Math.max(1, Math.round(leg.duration.value / 60)) : 8;
            const encodedPoly =
              typeof browserRoute.overview_polyline === 'string'
                ? browserRoute.overview_polyline
                : browserRoute.overview_polyline?.points || '';
            const steps: RouteStepItem[] = (leg?.steps || []).map((st: any) => ({
              instruction: String(st.instructions || '').replace(/<[^>]+>/g, ''),
              distanceMeters: Number(st.distance?.value) || 0,
            }));

            applyPathToMap(pts, 'Google Directions SDK (Malha Real)', distKm, etaMin, encodedPoly, steps);
            setIsRecalculating(false);
            return;
          }
        }

        if (backendData?.success && backendData?.encodedPolyline) {
          const pts = decodePolylineString(backendData.encodedPolyline);
          if (pts.length >= 2) {
            applyPathToMap(
              pts,
              'Malha Viária Real (OSRM)',
              backendData.distanceKm || 2.2,
              backendData.etaMinutes || 8,
              backendData.encodedPolyline,
              backendData.steps || []
            );
            setIsRecalculating(false);
            return;
          }
        }
      } finally {
        if (!cancelled) setIsRecalculating(false);
      }
    };

    resolveRoadGeometry();

    return () => {
      cancelled = true;
    };
  }, [sdkReady, routeId, originLat, originLng, destLat, destLng, travelMode, encodedPolylineOverride]);

  useEffect(() => {
    if (!sdkReady || !moverMarkerRef.current) return;
    const targetLat = moverLat ?? originLat;
    const targetLng = moverLng ?? originLng;
    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) return;

    const now = Date.now();
    const prev = lastMoverUpdateRef.current;
    const movedMeters =
      prev.timestamp === 0 ? 9999 : haversineDistanceMeters(prev.lat, prev.lng, targetLat, targetLng);
    const elapsedMs = now - prev.timestamp;

    if (movedMeters >= 20 || elapsedMs >= 15000 || prev.timestamp === 0) {
      lastMoverUpdateRef.current = { lat: targetLat, lng: targetLng, timestamp: now };
      moverMarkerRef.current.setPosition({ lat: targetLat, lng: targetLng });
    }
  }, [sdkReady, moverLat, moverLng, originLat, originLng]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-72 sm:h-80 bg-slate-900" />

      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/90 text-slate-200 text-[11px] font-bold">
          {isRecalculating ? (
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{routeSource}</span>
        </div>

        {routeStats && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-bold">
            <Navigation className="w-3.5 h-3.5 text-white" />
            <span>
              {routeStats.distanceKm} km • ETA {routeStats.etaMinutes} min
            </span>
          </div>
        )}
      </div>

      {adversityLabel && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-extrabold">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{adversityLabel}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-black">Via Monitorada</span>
        </div>
      )}
    </div>
  );
};
