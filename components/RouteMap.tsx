'use client';

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Navigation, Clock, Droplets, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface RouteMapProps {
  startLocation: string;
  destination: string;
  routeMode: 'safest' | 'shortest';
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

const reportIcon = L.divIcon({
  html: `
    <div style="
      background: #f97316;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
    </div>
  `,
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

interface Report {
  id: string;
  lat: number;
  lng: number;
  issue_type: string;
  description: string;
  image_url: string | null;
  timestamp: string;
}

function riskText(level: number) {
  if (level === 2) return "HIGH";
  if (level === 1) return "MEDIUM";
  return "LOW";
}

export default function RouteMap({ startLocation, destination, routeMode }: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const reportsLayerRef = useRef<L.LayerGroup | null>(null);

  const [viewMode, setViewMode] = useState<'live' | 'monsoon'>('live');
  const [mlResult, setMlResult] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch('http://localhost:8000/reports');
        const data = await res.json();
        setReports(data);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      }
    }
    fetchReports();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!reportsLayerRef.current) {
      reportsLayerRef.current = L.layerGroup().addTo(mapRef.current);
    } else {
      reportsLayerRef.current.clearLayers();
    }

    reports.forEach(report => {
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-bold text-sm mb-1 capitalize">${report.issue_type}</h3>
          <p class="text-xs text-gray-600 mb-2">${report.description}</p>
          ${report.image_url ? `<img src="${report.image_url}" class="w-full h-32 object-cover rounded-md" alt="Report Image" />` : ''}
          <p class="text-[10px] text-gray-400 mt-1">${new Date(report.timestamp).toLocaleString()}</p>
        </div>
      `;

      L.marker([report.lat, report.lng], { icon: reportIcon })
        .addTo(reportsLayerRef.current!)
        .bindPopup(popupContent);
    });
  }, [reports]);

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

        if (routeMode === 'shortest') {
          // Use Dijkstra's algorithm for optimal path
          const response = await fetch("http://127.0.0.1:8000/dijkstra-multi-route", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              routes: routePayload,
              mode: viewMode,
            }),
          });

          const dijkstraResult = await response.json();

          if (cancelled) return;

          console.log("DIJKSTRA RESULT FROM BACKEND:", dijkstraResult);

          if (dijkstraResult.success && dijkstraResult.path) {
            // Draw the optimal path from Dijkstra
            L.polyline(dijkstraResult.path as L.LatLngExpression[], {
              color: "#22c55e",
              weight: 6,
              opacity: 1,
            }).addTo(routeLayerRef.current!);

            // Draw original routes as faded background for reference
            routePayload.forEach((route) => {
              L.polyline(route.coordinates as L.LatLngExpression[], {
                color: "#94a3b8",
                weight: 3,
                opacity: 0.3,
                dashArray: "5,5",
              }).addTo(routeLayerRef.current!);
            });

            // Format result for display
            setMlResult({
              mode: dijkstraResult.mode,
              routes: [{
                route_index: 0,
                severity: dijkstraResult.total_risk,
                risk_level: dijkstraResult.risk_level === "HIGH" ? 2 : 
                           dijkstraResult.risk_level === "MEDIUM" ? 1 : 0,
                insights: dijkstraResult.insights,
                distance_km: dijkstraResult.distance_km,
                isOptimal: true
              }],
              recommended_route: 0
            });
          } else {
            // Fallback to showing original routes if Dijkstra fails
            console.warn("Dijkstra failed, showing original routes");
            
            routePayload.forEach((route, index) => {
              L.polyline(route.coordinates as L.LatLngExpression[], {
                color: index === 0 ? "green" : "red",
                weight: 5,
                dashArray: index === 0 ? undefined : "8,6",
              }).addTo(routeLayerRef.current!);
            });

            setMlResult({
              mode: viewMode,
              routes: routePayload.map((_, idx) => ({
                route_index: idx,
                severity: 0,
                risk_level: 0,
                insights: ["Route analysis unavailable"]
              })),
              recommended_route: 0
            });
          }
        } else {
          // Use original scoring method (safest route only)
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
        }

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

  }, [startLocation, destination, viewMode, routeMode]);

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
    <Card className="shadow-2xl border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-b-2 border-blue-100 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-3 mb-4 lg:mb-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
              <Navigation className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl lg:text-3xl">Safe Route Finder</CardTitle>
              <CardDescription className="text-base mt-1">
                From <span className="font-semibold text-gray-700">{startLocation}</span> to{' '}
                <span className="font-semibold text-gray-700">{destination}</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:w-auto">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'live' | 'monsoon')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
                <TabsTrigger value="live" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Live Conditions</TabsTrigger>
                <TabsTrigger value="monsoon" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Monsoon Prep</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
              <div className={`w-3 h-3 rounded-full ${routeMode === 'shortest' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                Mode: {routeMode === 'shortest' ? 'Shortest & Safest' : 'Safest Route'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div
              id="route-map"
              className="aspect-video lg:aspect-auto lg:h-[600px] rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            />
          </div>
          <div className="space-y-4 lg:max-h-[600px] lg:overflow-y-auto">
            {mlResult && (
              <>
                <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-gray-700">Analysis Complete</span>
                </div>
                {mlResult.routes.map((r: any, idx: number) => {
                  const isRecommended = idx === mlResult.recommended_route;
                  const isOptimal = r.isOptimal;
                  const style = routeStyle(r.risk_level, isRecommended);

                  return (
                    <div key={idx} className={`p-5 border-2 rounded-2xl transition-all duration-300 hover:shadow-lg ${style.bg}`}>
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {isOptimal ? (
                            <>
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                                <Zap className="h-4 w-4 text-white" />
                              </div>
                              Optimal Path
                            </>
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">{idx + 1}</span>
                              </div>
                              Route {idx + 1}
                            </>
                          )}
                        </h3>
                        <Badge className={`${style.badgeClass} px-3 py-1 text-xs font-bold rounded-full`}>{style.badge}</Badge>
                      </div>
                      
                      {r.distance_km && (
                        <div className="space-y-2 mb-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Navigation className="h-4 w-4 text-blue-600" />
                            <span><strong>{r.distance_km}</strong> km</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <span>Risk Score: <strong>{r.severity.toFixed(2)}</strong></span>
                          </div>
                        </div>
                      )}
                      
                      {r.insights && (
                        <div className="mt-4 space-y-2 border-t pt-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                            AI Analysis
                          </div>
                          {r.insights.map((text: string, i: number) => (
                            <p key={i} className="text-xs text-gray-600 pl-3 border-l-2 border-gray-300">
                              • {text}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

          </div>
        </div>
      </CardContent>
    </Card>  );
}
