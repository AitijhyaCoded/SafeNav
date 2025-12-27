'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

interface RiskMapProps {
  lat: number;
  lng: number;
  riskScore: number;
  rain: number;
  humidity: number;
}

export default function RiskMap({ lat, lng, riskScore, rain, humidity }: RiskMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [activeLayer, setActiveLayer] = useState<'flood' | 'rain' | 'humidity'>('flood');

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('risk-map').setView([lat, lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView([lat, lng], 13);
    }

    const map = mapRef.current;

    // Clear existing layers (except base tile)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });
    
    // Re-add base tile if removed (safety check)
    let hasTile = false;
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) hasTile = true;
    });
    if (!hasTile) {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
    }

    // Add Marker for location
    const icon = L.divIcon({
      html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
      className: '',
      iconSize: [12, 12]
    });
    L.marker([lat, lng], { icon }).addTo(map);

    if (activeLayer === 'flood') {
      // Simulate flood heatmap based on risk score
      // Generate points around the center
      const points: [number, number, number][] = [];
      const intensity = riskScore / 10; // 0 to 1
      
      // Center point
      points.push([lat, lng, intensity]);
      
      // Random points around
      for (let i = 0; i < 50; i++) {
        const rLat = lat + (Math.random() - 0.5) * 0.02;
        const rLng = lng + (Math.random() - 0.5) * 0.02;
        // Intensity drops with distance
        const dist = Math.sqrt(Math.pow(rLat - lat, 2) + Math.pow(rLng - lng, 2));
        const localIntensity = Math.max(0, intensity - (dist * 50));
        points.push([rLat, rLng, localIntensity]);
      }

      (L as any).heatLayer(points, { radius: 25, blur: 15, maxZoom: 13 }).addTo(map);
    } 
    else if (activeLayer === 'rain') {
      // OpenWeatherMap Precipitation Layer
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '27e998ea4044c1aa6536eb1d14c5c021'; // Fallback for demo
      L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`, {
        opacity: 0.8
      }).addTo(map);
    }
    else if (activeLayer === 'humidity') {
       // Simulate humidity heatmap
       // Humidity is usually more uniform, so larger radius
       const points: [number, number, number][] = [];
       const intensity = humidity / 100; 
       
       for (let i = 0; i < 100; i++) {
         const rLat = lat + (Math.random() - 0.5) * 0.05;
         const rLng = lng + (Math.random() - 0.5) * 0.05;
         points.push([rLat, rLng, intensity]);
       }
 
       (L as any).heatLayer(points, { radius: 40, blur: 20, gradient: {0.4: 'blue', 0.65: 'cyan', 1: 'white'} }).addTo(map);
    }

  }, [lat, lng, riskScore, rain, humidity, activeLayer]);

  return (
    <div className="mt-6 border rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700">Live Environmental Heatmap</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveLayer('flood')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${activeLayer === 'flood' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            Flood Risk
          </button>
          <button 
            onClick={() => setActiveLayer('rain')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${activeLayer === 'rain' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            Rainfall
          </button>
          <button 
            onClick={() => setActiveLayer('humidity')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${activeLayer === 'humidity' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            Humidity
          </button>
        </div>
      </div>
      <div id="risk-map" className="h-[400px] w-full bg-gray-100 relative z-0" />
      <div className="p-2 bg-white text-xs text-gray-500 text-center border-t">
        Data provided by OpenWeatherMap & SafeNav AI
      </div>
    </div>
  );
}
