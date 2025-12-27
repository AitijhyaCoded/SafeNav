'use client';

import { useState } from 'react';
import { Shield, LogOut, MapPin, Navigation, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RouteMap from '@/components/RouteMap';
import AreaRiskInsights from '@/components/AreaRiskInsights';

export default function HomePage() {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleCheckSafety = (e: React.FormEvent) => {
    e.preventDefault();
    if (startLocation && destination) {
      setShowResults(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">SafeRoute</span>
            </div>
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Plan Your Safe Journey
          </h1>
          <p className="text-gray-600 text-lg">
            Enter your route details to check flood risks and find safer alternatives
          </p>
        </div>

        <Card className="mb-8 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Route Information
            </CardTitle>
            <CardDescription>
              Enter your start and destination to analyze route safety
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleCheckSafety} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="start" className="text-base font-medium">
                    Start Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="start"
                      type="text"
                      placeholder="e.g., MG Road, Mumbai"
                      className="h-12 pl-10"
                      value={startLocation}
                      onChange={(e) => setStartLocation(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination" className="text-base font-medium">
                    Destination
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="destination"
                      type="text"
                      placeholder="e.g., Bandra Station, Mumbai"
                      className="h-12 pl-10"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full md:w-auto h-12 px-8">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Check Safety
              </Button>
            </form>
          </CardContent>
        </Card>

        {showResults && (
          <div className="space-y-8">
            <RouteMap startLocation={startLocation} destination={destination} />
            <AreaRiskInsights />
          </div>
        )}
      </main>
    </div>
  );
}
