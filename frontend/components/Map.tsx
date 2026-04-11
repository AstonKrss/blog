"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface City {
  id: number;
  name: string;
  country: string;
  lat: number;
  lng: number;
  date: string;
  notes?: string;
}

interface MapProps {
  cities: City[];
  center: [number, number];
  zoom: number;
  onCityClick?: (city: City) => void;
}

const getCountryColor = (country: string): string => {
  const colors: Record<string, string> = {
    "中国": "#3b82f6",
    "日本": "#f59e0b",
    "韩国": "#f59e0b",
    "法国": "#8b5cf6",
    "英国": "#8b5cf6",
  };
  return colors[country] || "#3b82f6";
};

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      position: relative;
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
      "></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const createGlowIcon = (color: string) => {
  return L.divIcon({
    className: "glow-marker",
    html: `<div style="
      position: relative;
      width: 40px;
      height: 40px;
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 20px ${color}80, 0 0 40px ${color}40;
      "></div>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        animation: pulse 2s infinite;
      "></div>
    </div>
    <style>
      @keyframes pulse {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        50% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
      }
    </style>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export default function Map({ cities, center, zoom, onCityClick }: MapProps) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
      minZoom={2}
      maxZoom={18}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {cities.map((city) => (
        <Marker
          key={city.id}
          position={[city.lat, city.lng]}
          icon={createGlowIcon(getCountryColor(city.country))}
          eventHandlers={{
            click: () => onCityClick?.(city),
          }}
        >
          <Popup>
            <div className="min-w-[120px] text-center p-1">
              <h3 className="font-semibold text-base">{city.name}</h3>
              <p className="text-sm text-gray-500">{city.country}</p>
              <p className="text-xs text-gray-400 mt-1">{city.date}</p>
              {city.notes && <p className="text-xs mt-1 text-gray-600">{city.notes}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}