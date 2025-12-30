'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, AlertCircle, Droplets, ThermometerSun, Activity, TrendingUp, Wind } from 'lucide-react';
import RiskMap from './RiskMap';

export default function AreaRiskInsights() {
  const [searchArea, setSearchArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchRisk = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const url = `${backendUrl}/area-risk?location=${encodeURIComponent(searchArea || 'Mumbai')}`;
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
    if (level === 'High') return 'bg-red-600 text-white border-red-700 shadow-lg shadow-red-600/50';
    if (level === 'Medium') return 'bg-orange-600 text-white border-orange-700 shadow-lg shadow-orange-600/50';
    return 'bg-green-600 text-white border-green-700 shadow-lg shadow-green-600/50';
  };

  const getRiskBgColor = (level: string) => {
    if (level === 'High') return 'bg-red-50 border-red-200';
    if (level === 'Medium') return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  return (
    <Card className="shadow-2xl border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 border-b-2 border-purple-100 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl lg:text-3xl">Live Flood Intelligence</CardTitle>
            <CardDescription>Real-time environmental risk assessment</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-8 pb-8 space-y-8">
        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              placeholder="Search neighborhood or area..." 
              className="h-12 pl-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              value={searchArea}
              onChange={(e) => setSearchArea(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchRisk()}
            />
          </div>
          <Button 
            onClick={() => fetchRisk()} 
            disabled={loading}
            className="h-12 px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-5 w-5" />
                Analyze
              </>
            )}
          </Button>
        </div>

        {data && (
          <>
            {/* Main Stats Card */}
            <div className={`p-8 rounded-2xl border-2 relative overflow-hidden transition-all duration-300 ${getRiskBgColor(data.riskLevel)}`}>
              {/* Animated background gradient */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500 animate-pulse" style={{animationDuration: "4s"}} />
              </div>

              <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2 text-gray-900 mb-2">
                      <MapPin className="h-6 w-6 text-blue-600" /> 
                      Targeted Zone Analysis
                    </h3>
                    <p className="text-sm text-gray-600">Updated: Just now</p>
                  </div>
                  <Badge className={`text-lg px-6 py-2 rounded-full font-bold ${getRiskColor(data.riskLevel)}`}>
                    {data.riskLevel} RISK
                  </Badge>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border-2 border-blue-100 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <Droplets className="h-5 w-5" /> 
                      <span className="text-xs font-bold uppercase tracking-wide">Live Rain</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{data.liveRain} <span className="text-base font-normal text-gray-600">mm/h</span></div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border-2 border-orange-100 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-2 text-orange-700 mb-2">
                      <AlertCircle className="h-5 w-5" /> 
                      <span className="text-xs font-bold uppercase tracking-wide">Risk Score</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{data.riskScore}<span className="text-base font-normal text-gray-600">/10</span></div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border-2 border-cyan-100 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-2 text-cyan-700 mb-2">
                      <ThermometerSun className="h-5 w-5" /> 
                      <span className="text-xs font-bold uppercase tracking-wide">Humidity</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{data.humidity}<span className="text-base font-normal text-gray-600">%</span></div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border-2 border-green-100 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <Wind className="h-5 w-5" /> 
                      <span className="text-xs font-bold uppercase tracking-wide">Wind Speed</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">12 <span className="text-base font-normal text-gray-600">km/h</span></div>
                  </div>
                </div>

                {/* Warnings Section */}
                {(data?.warnings || []).length > 0 && (
                  <div className="space-y-3 border-t-2 border-white/30 pt-6">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      Active Warnings
                    </h4>
                    {(data?.warnings || []).map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 bg-white/60 backdrop-blur-sm p-4 rounded-lg border border-orange-200">
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                        <span className="text-gray-700 text-sm leading-relaxed">{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Heatmap Intensity Bar */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Localized Risk Intensity</label>
                <span className="text-xs text-gray-600">Live Data</span>
              </div>
              <div className="h-6 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full overflow-hidden flex shadow-md">
                {(data?.heatmapPoints || []).map((p: any, i: number) => (
                  <div 
                    key={i} 
                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-1000" 
                    style={{ width: `${(p.intensity || 0) * 100}%`, opacity: Math.max(0.3, p.intensity || 0) }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-600 px-1">
                <span>Low</span>
                <span>Moderate</span>
                <span>High</span>
              </div>
            </div>

            {/* Interactive Map */}
            {data?.heatmapPoints && data.heatmapPoints.length > 0 && (
              <RiskMap 
                lat={data.heatmapPoints[0].lat} 
                lng={data.heatmapPoints[0].lng} 
                riskScore={data.riskScore}
                rain={data.liveRain}
                humidity={data.humidity}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}