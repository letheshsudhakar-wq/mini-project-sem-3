import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Navigation,
  Compass
} from 'lucide-react';
import type { Complaint, ComplaintCategory } from '../types';

interface PublicCivicMapProps {
  complaints: Complaint[];
  userLocation: { lat: number; lng: number } | null;
  selectedComplaintId?: string | null;
  onSelectComplaint: (complaint: Complaint) => void;
  className?: string;
}

// Category visual icon & color configurations
const CATEGORY_MARKER_CONFIG: Record<
  ComplaintCategory,
  { color: string; bgGradient: string; svgPath: string }
> = {
  pothole: {
    color: '#ea580c', // Orange-Red
    bgGradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    // Road hazard / cone SVG path
    svgPath: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  },
  streetlight: {
    color: '#d97706', // Amber-Gold
    bgGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    // Lightbulb SVG path
    svgPath: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  },
  drainage: {
    color: '#0284c7', // Cyan-Blue
    bgGradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    // Droplet SVG path
    svgPath: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  },
  garbage: {
    color: '#059669', // Emerald
    bgGradient: 'linear-gradient(135deg, #10b981, #059669)',
    // Trash SVG path
    svgPath: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  },
  water_supply: {
    color: '#0ea5e9',
    bgGradient: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
    svgPath: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><path d="M12 7v10"/><path d="M9 10c1-1 2-1.5 3-1.5s2 .5 3 1.5"/>',
  },
  road_damage: {
    color: '#dc2626',
    bgGradient: 'linear-gradient(135deg, #f87171, #dc2626)',
    svgPath: '<path d="M3 20h18"/><path d="m7 20 3-8 5 8"/><path d="M4 6l4-2 6 4 5-2"/><path d="M8 11h8"/>',
  },
  other: {
    color: '#7c3aed', // Purple
    bgGradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    // Circle Alert SVG path
    svgPath: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  },
};

// Create custom category marker icon
const createCategoryIcon = (category: ComplaintCategory, isSelected = false) => {
  const config = CATEGORY_MARKER_CONFIG[category] || CATEGORY_MARKER_CONFIG.other;
  const size = isSelected ? 46 : 38;
  const anchorY = isSelected ? 46 : 38;
  const anchorX = size / 2;

  return L.divIcon({
    className: 'civicfix-category-pin',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; transform: translate(-50%, -100%); cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <div style="width: ${size}px; height: ${size}px; border-radius: 50% 50% 50% 0; background: ${config.bgGradient}; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 ${isSelected ? '8px 20px' : '4px 12px'} rgba(0,0,0,0.28); border: ${isSelected ? '3.5px solid #ffffff' : '2.5px solid #ffffff'};">
          <svg style="transform: rotate(45deg); width: ${isSelected ? '20px' : '16px'}; height: ${isSelected ? '20px' : '16px'}; stroke: #ffffff; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;">
            ${config.svgPath}
          </svg>
        </div>
        <div style="position: absolute; bottom: -3px; left: calc(50% - 7px); width: 14px; height: 4px; background: rgba(15, 23, 42, 0.35); border-radius: 50%; filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [anchorX, anchorY],
  });
};

// Create User Current Location pulsing marker icon
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'civicfix-user-location-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; transform: translate(-50%, -50%);">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(37, 99, 235, 0.25); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.6);"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export const PublicCivicMap: React.FC<PublicCivicMapProps> = ({
  complaints,
  userLocation,
  selectedComplaintId,
  onSelectComplaint,
  className = 'h-[500px] sm:h-[620px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Default central view (fallback if no user location or complaints)
  const defaultCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : complaints.length > 0 && isFinite(complaints[0].latitude) && isFinite(complaints[0].longitude)
    ? [complaints[0].latitude, complaints[0].longitude]
    : [28.6139, 77.2090]; // New Delhi default

  // 1. Initialize Map instance once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: false, // We'll add custom positioned zoom control
        attributionControl: false,
      });

      // Add OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Add Zoom Control at bottom right to avoid cluttering mobile header
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Create Layer Group for Complaint Markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  // 2. Render Complaint Markers whenever complaints list or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const validCoordinates: L.LatLngExpression[] = [];

    complaints.forEach((comp) => {
      // Validate coordinates
      const lat = comp.latitude;
      const lng = comp.longitude;

      if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        // Skip invalid coordinates safely
        return;
      }

      validCoordinates.push([lat, lng]);
      const isSelected = selectedComplaintId === comp.id;

      const marker = L.marker([lat, lng], {
        icon: createCategoryIcon(comp.category, isSelected),
        zIndexOffset: isSelected ? 1000 : 10,
      });

      // Popup Content
      const dateStr = new Date(comp.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const popupHtml = `
        <div style="font-family: 'Inter', system-ui, sans-serif; min-width: 200px; max-width: 260px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e40af; background: #eff6ff; padding: 2px 6px; border-radius: 6px;">
              ${comp.category}
            </span>
            <span style="font-size: 10px; font-weight: 700; color: ${comp.status === 'reported' ? '#b45309' : '#1d4ed8'}; background: ${comp.status === 'reported' ? '#fef3c7' : '#dbeafe'}; padding: 2px 6px; border-radius: 6px;">
              ${comp.status.replace('_', ' ')}
            </span>
          </div>

          <p style="font-size: 12px; font-weight: 600; color: #0f172a; margin: 0 0 6px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${comp.description}
          </p>

          ${comp.photo_url ? `<div style="width: 100%; height: 75px; border-radius: 8px; overflow: hidden; margin-bottom: 6px; background: #f1f5f9;"><img src="${comp.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ''}

          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748b; margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9;">
            <span>👍 <strong>${comp.upvote_count}</strong></span>
            <span>📅 ${dateStr}</span>
          </div>
          
          <button id="popup-view-btn-${comp.id}" style="width: 100%; margin-top: 8px; padding: 6px 10px; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
            View Details →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: true,
        className: 'civicfix-map-popup',
      });

      marker.on('click', () => {
        onSelectComplaint(comp);
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-view-btn-${comp.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectComplaint(comp);
          };
        }
      });

      markersLayer.addLayer(marker);
    });

    // If a specific complaint is selected, pan smoothly to it
    if (selectedComplaintId) {
      const target = complaints.find((c) => c.id === selectedComplaintId);
      if (target && isFinite(target.latitude) && isFinite(target.longitude)) {
        map.setView([target.latitude, target.longitude], 16, { animate: true });
      }
    }
  }, [complaints, selectedComplaintId, onSelectComplaint]);

  // 3. User Location Marker handling
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation && isFinite(userLocation.lat) && isFinite(userLocation.lng)) {
      if (!userMarkerRef.current) {
        const uMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: createUserLocationIcon(),
          zIndexOffset: 500,
        }).addTo(map);

        uMarker.bindPopup('<strong style="font-size:12px;">📍 You Are Here</strong>');
        userMarkerRef.current = uMarker;
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // Fit all visible markers
  const handleFitAllMarkers = () => {
    const map = mapInstanceRef.current;
    if (!map || complaints.length === 0) return;

    const validBounds = complaints
      .filter((c) => isFinite(c.latitude) && isFinite(c.longitude))
      .map((c) => [c.latitude, c.longitude] as [number, number]);

    if (validBounds.length > 0) {
      map.fitBounds(L.latLngBounds(validBounds), { padding: [40, 40], maxZoom: 16 });
    }
  };

  // Center on user location
  const handleCenterUserLocation = () => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;
    map.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
  };

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 ${className}`}>
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        {userLocation && (
          <button
            type="button"
            onClick={handleCenterUserLocation}
            title="Center on my location"
            className="p-2.5 bg-white/95 backdrop-blur hover:bg-white text-slate-700 hover:text-blue-600 rounded-2xl shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">My Location</span>
          </button>
        )}

        {complaints.length > 0 && (
          <button
            type="button"
            onClick={handleFitAllMarkers}
            title="Fit all visible issues on map"
            className="p-2.5 bg-white/95 backdrop-blur hover:bg-white text-slate-700 hover:text-blue-600 rounded-2xl shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-slate-700" />
            <span className="hidden sm:inline">Fit All ({complaints.length})</span>
          </button>
        )}
      </div>

      {/* Attribution notice */}
      <div className="absolute bottom-2 left-3 z-[400] text-[10px] text-slate-500 bg-white/85 backdrop-blur px-2 py-0.5 rounded-md shadow-2xs pointer-events-none">
        &copy; OpenStreetMap contributors
      </div>
    </div>
  );
};
