'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, AlertCircle, Droplets, ThermometerSun, Activity } from 'lucide-react';

export default function AreaRiskInsights() {
  const [searchArea, setSearchArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Default coordinates (Dadar, Mumbai)
  // Find your fetchRisk function and update it to this:
const fetchRisk = async () => {
  setLoading(true);
  try {
    // Send the text from the search box to the backend
    const url = `http://localhost:8000/area-risk?location=${encodeURIComponent(searchArea || 'Mumbai')}`;
    const res = await fetch(url);
    const result = await res.json();
    setData(result);
  } catch (error) {
    console.error("Fetch error:", error);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => { fetchRisk(); }, []);

  const getRiskColor = (level: string) => {
    if (level === 'High') return 'bg-red-100 text-red-800 border-red-200';
    if (level === 'Medium') return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <Card className="shadow-lg border-t-4 border-blue-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Activity className="h-6 w-6 text-blue-600" />
          Live Flood Intelligence
        </CardTitle>
        <CardDescription>Real-time risk scoring using OpenWeather API</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input 
            placeholder="Search neighborhood (Simulated)..." 
            value={searchArea}
            onChange={(e) => setSearchArea(e.target.value)}
          />
          <Button onClick={() => fetchRisk()} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze Area"}
          </Button>
        </div>

        {data && (
          <>
            <div className="p-6 bg-slate-50 rounded-xl border-2 border-slate-200 relative overflow-hidden">
              {/* Heatmap Simulation Background */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500" />
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <MapPin className="text-red-500" size={20} /> Targeted Zone Analysis
                    </h3>
                    <p className="text-sm text-gray-500">Updated: Just Now</p>
                  </div>
                  <Badge className={`text-sm px-4 py-1 ${getRiskColor(data.riskLevel)}`}>
                    {data.riskLevel} Risk
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Droplets size={16} /> <span className="text-xs font-bold">LIVE RAIN</span>
                    </div>
                    <div className="text-2xl font-bold">{data.liveRain} mm/h</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-orange-600 mb-1">
                      <AlertCircle size={16} /> <span className="text-xs font-bold">RISK SCORE</span>
                    </div>
                    <div className="text-2xl font-bold">{data.riskScore}/10</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <ThermometerSun size={16} /> <span className="text-xs font-bold">HUMIDITY</span>
                    </div>
                    <div className="text-2xl font-bold">{data.humidity}%</div>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
  {/* The '?. ' and '|| []' prevent the "undefined" crash shown in your image */}
  {(data?.warnings || []).map((w: string, i: number) => (
    <div key={i} className="flex items-center gap-2 text-sm bg-white/80 p-2 rounded border">
      <AlertCircle size={14} className="text-orange-500" />
      <span>{w}</span>
    </div>
  ))}
</div>
              </div>
            </div>

            {/* Visual Heatmap Intensity Bar */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Localized Heatmap Intensity</label>
              <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
  {(data?.heatmapPoints || []).map((p: any, i: number) => (
    <div 
      key={i} 
      className="h-full bg-red-500 transition-all duration-1000" 
      style={{ width: `${p.intensity * 100}%`, opacity: p.intensity }}
    />
  ))}
</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}