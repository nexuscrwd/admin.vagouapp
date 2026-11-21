import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Compass, RefreshCw, CheckCircle2, Navigation } from 'lucide-react';
import { geocodeAddressViaApi } from '../../services/supabaseApi';

declare global {
  interface Window {
    google?: any;
    __vagouGoogleMapsPromise?: Promise<boolean>;
  }
}

const DEFAULT_FALLBACK_KEY = 'AIzaSyALBO6b_ItojRZXURGdNVUeKOrOuKAOfI8';

export async function loadGoogleMapsSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.google?.maps?.Map) return true;
  if (window.__vagouGoogleMapsPromise) return window.__vagouGoogleMapsPromise;

  window.__vagouGoogleMapsPromise = (async () => {
    let key = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!key) {
      try {
        const res = await fetch('/api/geo/config');
        if (res.ok) {
          const data = await res.json();
          if (data?.apiKey) key = data.apiKey;
        }
      } catch {}
    }
    if (!key) key = DEFAULT_FALLBACK_KEY;

    return new Promise<boolean>((resolve) => {
      const existing = document.getElementById('vagou-google-maps-sdk') as HTMLScriptElement | null;
      if (existing) {
        if (window.google?.maps?.Map) {
          resolve(true);
          return;
        }
        existing.addEventListener('load', () => resolve(Boolean(window.google?.maps?.Map)));
        existing.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.id = 'vagou-google-maps-sdk';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=geometry,places&language=pt-BR&region=BR`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(Boolean(window.google?.maps?.Map));
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  })();

  return window.__vagouGoogleMapsPromise;
}

const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

interface GoogleAddressPinPickerProps {
  cep?: string;
  address?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
  onCoordinatesChange: (coords: {
    latitude: number;
    longitude: number;
    formattedAddress?: string;
    placeId?: string;
  }) => void;
  label?: string;
  compact?: boolean;
}

export const GoogleAddressPinPicker: React.FC<GoogleAddressPinPickerProps> = ({
  cep = '',
  address = '',
  streetNumber = '',
  neighborhood = '',
  city = '',
  state = '',
  latitude,
  longitude,
  onCoordinatesChange,
  label = 'Geolocalização Exata (Google Maps)',
  compact = false,
}) => {
  const [sdkReady, setSdkReady] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geoSource, setGeoSource] = useState<string>('');
  const [formattedAddr, setFormattedAddr] = useState<string>('');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const lastGeocodedQueryRef = useRef<string>('');

  const hasValidCoords =
    latitude !== undefined &&
    latitude !== null &&
    longitude !== undefined &&
    longitude !== null &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Math.abs(Number(latitude)) > 0.0001 &&
    Math.abs(Number(longitude)) > 0.0001;

  useEffect(() => {
    loadGoogleMapsSdk().then((ready) => setSdkReady(ready));
  }, []);

  const runGeocode = useCallback(
    async (force = false) => {
      const cleanCep = String(cep || '').replace(/\D/g, '');
      const cleanAddress = String(address || '').trim();
      const cleanNum = String(streetNumber || '').trim();
      const cleanCity = String(city || '').trim();
      const cleanState = String(state || '').trim();

      if (!cleanAddress && cleanCep.length < 8) return;

      const querySignature = `${cleanCep}|${cleanAddress}|${cleanNum}|${neighborhood}|${cleanCity}|${cleanState}`;
      if (!force && querySignature === lastGeocodedQueryRef.current && hasValidCoords) {
        return;
      }
      lastGeocodedQueryRef.current = querySignature;
      setIsGeocoding(true);

      try {

        if (window.google?.maps?.Geocoder) {
          const fullAddressQuery = [
            cleanAddress ? `${cleanAddress}${cleanNum ? `, ${cleanNum}` : ''}` : '',
            neighborhood,
            cleanCity,
            cleanState,
            cleanCep ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}` : '',
            'Brasil',
          ]
            .filter(Boolean)
            .join(', ');

          const geocoder = new window.google.maps.Geocoder();
          const browserResult = await new Promise<{
            lat: number;
            lng: number;
            formatted: string;
            placeId?: string;
          } | null>((resolve) => {
            geocoder.geocode({ address: fullAddressQuery, region: 'BR' }, (results: any, status: any) => {
              if (status === 'OK' && results && results[0]?.geometry?.location) {
                const loc = results[0].geometry.location;
                const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
                const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                  resolve({
                    lat: Number(lat.toFixed(6)),
                    lng: Number(lng.toFixed(6)),
                    formatted: results[0].formatted_address || fullAddressQuery,
                    placeId: results[0].place_id,
                  });
                  return;
                }
              }
              resolve(null);
            });
          });

          if (browserResult) {
            setGeoSource('Google Maps');
            setFormattedAddr(browserResult.formatted);
            onCoordinatesChange({
              latitude: browserResult.lat,
              longitude: browserResult.lng,
              formattedAddress: browserResult.formatted,
              placeId: browserResult.placeId,
            });
            setIsGeocoding(false);
            return;
          }
        }

        const apiRes = await geocodeAddressViaApi({
          cep: cleanCep,
          address: cleanAddress,
          street_number: cleanNum,
          neighborhood,
          city: cleanCity,
          state: cleanState,
        });

        if (apiRes.success && apiRes.latitude && apiRes.longitude) {
          setGeoSource(apiRes.source === 'google_maps_geocoding' ? 'Google Maps' : 'Geocoder');
          if (apiRes.formatted_address) setFormattedAddr(apiRes.formatted_address);
          onCoordinatesChange({
            latitude: Number(apiRes.latitude),
            longitude: Number(apiRes.longitude),
            formattedAddress: apiRes.formatted_address || undefined,
            placeId: apiRes.google_place_id || undefined,
          });
        }
      } finally {
        setIsGeocoding(false);
      }
    },
    [cep, address, streetNumber, neighborhood, city, state, hasValidCoords, onCoordinatesChange]
  );

  useEffect(() => {
    const cleanCep = String(cep || '').replace(/\D/g, '');
    const hasEnoughAddress = (address && address.trim().length >= 3 && city) || cleanCep.length === 8;
    if (!hasEnoughAddress) return;

    const timer = setTimeout(() => {
      runGeocode(false);
    }, 650);

    return () => clearTimeout(timer);
  }, [cep, address, streetNumber, neighborhood, city, state, runGeocode]);

  useEffect(() => {
    if (!showMap || !sdkReady || !mapContainerRef.current || !window.google?.maps?.Map) return;

    const initialLat = hasValidCoords ? Number(latitude) : -23.561684;
    const initialLng = hasValidCoords ? Number(longitude) : -46.655981;
    const center = { lat: initialLat, lng: initialLng };

    if (!mapInstanceRef.current) {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom: 17,
        styles: DARK_MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });

      const marker = new window.google.maps.Marker({
        position: center,
        map,
        draggable: true,
        title: 'Arraste para ajustar o ponto exato',
      });

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (!pos) return;
        const newLat = Number(pos.lat().toFixed(6));
        const newLng = Number(pos.lng().toFixed(6));
        setGeoSource('Pino Ajustado');
        onCoordinatesChange({ latitude: newLat, longitude: newLng });
      });

      map.addListener('click', (e: any) => {
        if (!e?.latLng) return;
        const newLat = Number(e.latLng.lat().toFixed(6));
        const newLng = Number(e.latLng.lng().toFixed(6));
        marker.setPosition({ lat: newLat, lng: newLng });
        setGeoSource('Pino Ajustado');
        onCoordinatesChange({ latitude: newLat, longitude: newLng });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setCenter(center);
      if (markerRef.current) {
        markerRef.current.setPosition(center);
      }
    }
  }, [showMap, sdkReady, hasValidCoords, latitude, longitude, onCoordinatesChange]);

  useEffect(() => {
    if (!showMap) {
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [showMap]);

  const handleUseBrowserGps = () => {
    if (!navigator.geolocation) return;
    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));
        setGeoSource('GPS Atual');
        onCoordinatesChange({ latitude: newLat, longitude: newLng });
        setIsGeocoding(false);
        setShowMap(true);
      },
      () => {
        setIsGeocoding(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="pt-2 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-200">{label}</span>
          {hasValidCoords ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3 text-white" />
              {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
              {geoSource ? ` • ${geoSource}` : ''}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">
              {isGeocoding ? 'Calculando coordenadas...' : 'Preencha CEP e Número para localizar'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => runGeocode(true)}
            disabled={isGeocoding}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors whitespace-nowrap disabled:opacity-50"
            title="Recalcular coordenadas pelo endereço digitado"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isGeocoding ? 'animate-spin' : ''}`} />
            {!compact && <span>Geocodificar</span>}
          </button>

          <button
            type="button"
            onClick={handleUseBrowserGps}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors whitespace-nowrap"
            title="Usar minha localização GPS atual"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span>GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMap((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
              showMap
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${showMap ? 'text-white' : 'text-emerald-400'}`} />
            <span>{showMap ? 'Ocultar Mapa' : 'Ajustar Pino no Mapa'}</span>
          </button>
        </div>
      </div>

      {formattedAddr && !compact && (
        <p className="text-[11px] text-slate-400 truncate">
          Localizado: <span className="text-slate-300">{formattedAddr}</span>
        </p>
      )}

      {showMap && (
        <div className="space-y-1.5">
          <div
            ref={mapContainerRef}
            className="w-full h-52 rounded-xl overflow-hidden bg-slate-900"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Clique ou arraste o pino para cravar a fachada exata</span>
            {hasValidCoords && (
              <span className="font-mono text-emerald-400">
                Lat: {Number(latitude).toFixed(6)} | Lng: {Number(longitude).toFixed(6)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
