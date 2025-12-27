'use client';

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Navigation, Clock, Droplets, AlertTriangle, CheckCircle } from 'lucide-react';

interface RouteMapProps {
  startLocation: string;
  destination: string;
}

async function geocodePlace(place: string) {
  const res = await fetch(
    `https://api.openrouteservice.org/geocode/search?text=${encodeURIComponent(
      place
    )}&size=1`,
    {
      headers: {
        Authorization: process.env.NEXT_PUBLIC_ORS_KEY || "",
      },
    }
  );

  const data = await res.json();
  return data.features[0].geometry.coordinates; // [lng, lat]
}


async function fetchRoutes(start: number[], end: number[]) {
  const response = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: {
        Authorization: process.env.NEXT_PUBLIC_ORS_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [start, end],
        alternative_routes: {
          target_count: 2,
        },
        geometry_simplify: false,
        instructions: false,
        elevation: false,
        geometry: true
      }),
    }
  );

  return response.json();
}

// 👉 PUT ICONS HERE (ZONE 2)

const startIcon = L.divIcon({
  html: `
    <div style="
      background: #22c55e;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">
      <svg xmlns="http://www.w3.org/2000/svg"
        width="18" height="18"
        fill="none" stroke="white"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        viewBox="0 0 24 24">
        <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10z"/>
        <circle cx="12" cy="11" r="2"/>
      </svg>
    </div>
  `,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const endIcon = L.divIcon({
  html: `
    <div style="
      background: #ef4444;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">
      <svg xmlns="http://www.w3.org/2000/svg"
        width="18" height="18"
        fill="none" stroke="white"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        viewBox="0 0 24 24">
        <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10z"/>
        <circle cx="12" cy="11" r="2"/>
      </svg>
    </div>
  `,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function riskText(level: number) {
  if (level === 2) return "HIGH";
  if (level === 1) return "MEDIUM";
  return "LOW";
}

export default function RouteMap({ startLocation, destination }: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const [viewMode, setViewMode] = useState<'live' | 'monsoon'>('live');
  const [mlResult, setMlResult] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    if (!startLocation || !destination) return;
    setMlResult(null); 


    // ✅ Create map ONLY ONCE
    if (!mapRef.current) {
      mapRef.current = L.map("route-map").setView([22.5726, 88.3639], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapRef.current);
    }

    if (!routeLayerRef.current) {
      routeLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    const map = mapRef.current;
    if (!map) return;

    async function loadRoutes() {
      try {
        if (routeLayerRef.current) {
          routeLayerRef.current.clearLayers();
          map.removeLayer(routeLayerRef.current);
        }

        routeLayerRef.current = L.layerGroup().addTo(map);


        const startCoords = await geocodePlace(startLocation);
        const endCoords = await geocodePlace(destination);

        L.marker([startCoords[1], startCoords[0]], { icon: startIcon })
          .addTo(routeLayerRef.current!)
          .bindPopup("Start Location");

        L.marker([endCoords[1], endCoords[0]], { icon: endIcon })
          .addTo(routeLayerRef.current!)
          .bindPopup("Destination");

        const data = await fetchRoutes(startCoords, endCoords);

        const routePayload: { coordinates: number[][] }[] = [];

        data.features.forEach((feature: any) => {
          const points = feature.geometry.coordinates.map(
            (c: number[]) => [c[1], c[0]]
          );
          routePayload.push({ coordinates: points });
        });

        const response = await fetch("http://127.0.0.1:8000/score-routes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            routes: routePayload,
            mode: viewMode,
          }),
        });

        const result = await response.json();

        if (cancelled) return;

        setMlResult(result);
        console.log("ML RESULT FROM BACKEND:", result);

        routePayload.forEach((route, index) => {
          const isRecommended = index === result.recommended_route;

          L.polyline(route.coordinates as L.LatLngExpression[], {
            color: isRecommended ? "green" : "red",
            weight: 5,
            dashArray: isRecommended ? undefined : "8,6",
          }).addTo(routeLayerRef.current!);
        });

        map.fitBounds([
          [startCoords[1], startCoords[0]],
          [endCoords[1], endCoords[0]],
        ]);
      } catch (err) {
        console.error(err);
      }
    }


    loadRoutes();

    return () => {
      cancelled = true;
    };

  }, [startLocation, destination, viewMode]);


  console.log("ORS KEY:", process.env.NEXT_PUBLIC_ORS_KEY);

  function routeStyle(risk: number, isRecommended: boolean) {
    if (isRecommended) {
      return {
        bg: "bg-green-50 border-green-200",
        badge: "Recommended",
        badgeClass: "bg-green-600",
        icon: CheckCircle,
        text: "text-green-800",
      };
    }

    if (risk === 2) {
      return {
        bg: "bg-red-50 border-red-200",
        badge: "High Risk",
        badgeClass: "destructive",
        icon: AlertTriangle,
        text: "text-red-800",
      };
    }

    if (risk === 1) {
      return {
        bg: "bg-yellow-50 border-yellow-200",
        badge: "Medium Risk",
        badgeClass: "bg-yellow-500",
        icon: AlertTriangle,
        text: "text-yellow-800",
      };
    }

    return {
      bg: "bg-green-50 border-green-200",
      badge: "Low Risk",
      badgeClass: "bg-green-600",
      icon: CheckCircle,
      text: "text-green-800",
    };
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl mb-2">
              <Navigation className="h-6 w-6 text-blue-600" />
              Safe Route Finder
            </CardTitle>
            <CardDescription className="text-base">
              Comparing routes from <span className="font-semibold">{startLocation}</span> to{' '}
              <span className="font-semibold">{destination}</span>
            </CardDescription>
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'live' | 'monsoon')}>
            <TabsList>
              <TabsTrigger value="live">Live Conditions</TabsTrigger>
              <TabsTrigger value="monsoon">Monsoon Preparedness</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            id="route-map"
            className="aspect-video rounded-xl border-2 border-gray-300"
          />
          {mlResult && (
            <div className="space-y-4">
              {mlResult.routes.map((r: any, idx: number) => {
                const isRecommended = idx === mlResult.recommended_route;
                const style = routeStyle(r.risk_level, isRecommended);

                return (
                  <div key={idx} className={`p-5 border-2 rounded-xl ${style.bg}`}>
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold">Route {idx + 1}</h3>
                      <Badge>{style.badge}</Badge>
                    </div>
                    <p className={`text-sm ${style.text}`}>
                      Severity: {r.severity.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}
