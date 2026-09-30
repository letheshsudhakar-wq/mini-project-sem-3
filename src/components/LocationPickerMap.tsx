import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

// Custom modern SVG marker icon avoiding Leaflet default icon asset bundle path issues
const createCustomMarkerIcon = () => {
  return L.divIcon({
    className: 'civicfix-map-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; transform: translate(-50%, -100%); cursor: grab;">
        <div style="width: 36px; height: 36px; border-radius: 50% 50% 50% 0; background: #2563eb; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); border: 2.5px solid #ffffff;">
          <div style="width: 12px; height: 12px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
        </div>
        <div style="position: absolute; bottom: -4px; width: 14px; height: 4px; background: rgba(15, 23, 42, 0.25); border-radius: 50%; filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude,
  longitude,
  onLocationChange,
  className = 'h-72 sm:h-96',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize Leaflet Map
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: true,
        attributionControl: false,
      });

      // Add OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Add Draggable Marker
      const marker = L.marker([latitude, longitude], {
        icon: createCustomMarkerIcon(),
        draggable: true,
      }).addTo(map);

      // Listen for marker dragend
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onLocationChange({ lat: position.lat, lng: position.lng });
      });

      // Listen for map click to reposition marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onLocationChange({ lat, lng });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate size after initial render
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    } else {
      // Update marker and map position if coordinates change externally
      const map = mapInstanceRef.current;
      const marker = markerRef.current;
      if (marker && map) {
        const currentPos = marker.getLatLng();
        const dist = Math.abs(currentPos.lat - latitude) + Math.abs(currentPos.lng - longitude);
        if (dist > 0.00001) {
          marker.setLatLng([latitude, longitude]);
          map.setView([latitude, longitude], map.getZoom() < 14 ? 15 : map.getZoom(), {
            animate: true,
          });
        }
      }
    }

    return () => {
      // Cleanup on unmount
    };
  }, [latitude, longitude, onLocationChange]);

  const handleCenterOnMarker = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
    }
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Recenter / Focus Controls */}
      <div className="absolute bottom-3 right-3 z-[400] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleCenterOnMarker}
          title="Center on selected pin"
          className="p-2.5 bg-white/95 backdrop-blur hover:bg-white text-slate-700 hover:text-blue-600 rounded-xl shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
        >
          <Navigation className="w-4 h-4 text-blue-600" />
          <span className="hidden sm:inline">Center Pin</span>
        </button>
      </div>

      {/* Helper Map Badge */}
      <div className="absolute top-3 left-3 z-[400] bg-slate-900/85 backdrop-blur text-white px-3 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5 shadow-sm">
        <MapPin className="w-3.5 h-3.5 text-blue-400" />
        <span>Click or drag pin to adjust issue location</span>
      </div>
    </div>
  );
};
