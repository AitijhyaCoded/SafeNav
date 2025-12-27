'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, AlertCircle, TrendingUp, Droplets, Calendar } from 'lucide-react';

export default function AreaRiskInsights() {
  const [searchArea, setSearchArea] = useState('');
  const [selectedArea, setSelectedArea] = useState('Dadar, Mumbai');

  const areaData = {
    name: 'Dadar, Mumbai',
    riskLevel: 'Medium',
    riskScore: 6.5,
    warnings: [
      'Avoid King Circle area during heavy rain (3+ hours)',
      'Underpass near station frequently waterlogged',
    ],
    seasonalRisk: [
      { month: 'Jun', risk: 7 },
      { month: 'Jul', risk: 9 },
      { month: 'Aug', risk: 8 },
      { month: 'Sep', risk: 6 },
      { month: 'Oct', risk: 4 },
    ],
    historicalData: {
      lastFlood: 'July 2023',
      avgWaterLevel: '2.5 ft',
      floodFrequency: '4 times/year',
    },
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchArea) {
      setSelectedArea(searchArea);
    }
  };

  const maxRisk = Math.max(...areaData.seasonalRisk.map((d) => d.risk));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <MapPin className="h-6 w-6 text-blue-600" />
          Area Flood Risk Insights
        </CardTitle>
        <CardDescription className="text-base">
          Search for any location to view detailed flood risk analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search area or neighborhood..."
              className="h-12 pl-10"
              value={searchArea}
              onChange={(e) => setSearchArea(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-6">
            Search
          </Button>
        </form>

        <div className="p-6 bg-gradient-to-br from-blue-50 to-green-50 rounded-xl border-2 border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{areaData.name}</h3>
              <p className="text-sm text-gray-600">Current flood risk assessment</p>
            </div>
            <Badge className={`text-base px-4 py-2 ${getRiskColor(areaData.riskLevel)} border-2`}>
              {areaData.riskLevel} Risk
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-3xl font-bold text-blue-600 mb-1">{areaData.riskScore}/10</div>
              <div className="text-sm text-gray-600">Risk Score</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-lg font-bold text-gray-900 mb-1">{areaData.historicalData.lastFlood}</div>
              <div className="text-sm text-gray-600">Last Flood</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-lg font-bold text-gray-900 mb-1">{areaData.historicalData.avgWaterLevel}</div>
              <div className="text-sm text-gray-600">Avg. Water Level</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-lg font-bold text-gray-900 mb-1">{areaData.historicalData.floodFrequency}</div>
              <div className="text-sm text-gray-600">Flood Frequency</div>
            </div>
          </div>

          <div className="space-y-3">
            {areaData.warnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-orange-900 font-medium">{warning}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-white border-2 border-gray-200 rounded-xl">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Seasonal Flood Risk (Monsoon)
            </h4>
            <div className="space-y-3">
              {areaData.seasonalRisk.map((data) => (
                <div key={data.month} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-12">{data.month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        data.risk >= 8
                          ? 'bg-red-500'
                          : data.risk >= 6
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${(data.risk / 10) * 100}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {data.risk}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white border-2 border-gray-200 rounded-xl">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Historical Risk Trend
            </h4>
            <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 relative overflow-hidden">
              <svg className="w-full h-full p-4" viewBox="0 0 300 150">
                <polyline
                  points="20,100 70,90 120,70 170,85 220,95 270,80"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                />
                <polyline
                  points="20,100 70,90 120,70 170,85 220,95 270,80"
                  fill="url(#gradient)"
                  opacity="0.2"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>

                {[20, 70, 120, 170, 220, 270].map((x, i) => (
                  <circle key={i} cx={x} cy={[100, 90, 70, 85, 95, 80][i]} r="4" fill="#3b82f6" />
                ))}
              </svg>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-500 font-medium">
                2019 → 2024
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Flood incidents have decreased by 15% over the past 5 years due to improved drainage systems.
            </p>
          </div>
        </div>

        <div className="p-5 bg-blue-600 text-white rounded-xl">
          <div className="flex items-start gap-3">
            <Droplets className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-lg mb-2">Safety Recommendations</h4>
              <ul className="space-y-1 text-sm text-blue-50">
                <li>• Avoid travel during peak monsoon hours (2 PM - 6 PM)</li>
                <li>• Keep emergency contacts saved for local authorities</li>
                <li>• Monitor weather updates before starting your journey</li>
                <li>• Use elevated parking spots if staying in this area</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
