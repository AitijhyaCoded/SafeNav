'use client';

import { useState } from 'react';
import { Shield, LogOut, MapPin, Navigation, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RouteMap from '@/components/RouteMap';
import AreaRiskInsights from '@/components/AreaRiskInsights';
import ReportIssue from '@/components/ReportIssue';
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function HomePage() {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckSafety = (e: React.FormEvent) => {
    e.preventDefault();
    if (startLocation && destination) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 500);
      setShowResults(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-50"></div>
                <div className="relative px-3 py-1 bg-white rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">SafeNav</span>
            </div>
            <div className="flex items-center gap-4">
              <ReportIssue />
              <SignedOut>
                <SignInButton>
                  <Button variant="ghost" className="text-gray-700 hover:bg-gray-100">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton>
                  <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 shadow-md">
                    Sign Up
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                Navigate Safely
              </h1>
              <p className="text-lg text-gray-600">
                Enter your route details to check waterlogged roads, flood risks and find safer alternatives
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-3 bg-blue-100 rounded-xl border border-blue-200 text-blue-700">
              <Zap className="h-5 w-5" />
              <span className="font-medium">AI-Powered Analysis</span>
            </div>
          </div>

          {/* Input Card */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                  <Navigation className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>Route Information</CardTitle>
                  <CardDescription>
                    Enter your start and destination to analyze route safety
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleCheckSafety} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Location */}
                  <div className="space-y-3">
                    <Label htmlFor="start" className="text-base font-semibold text-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        Start Location
                      </div>
                    </Label>
                    <div className="relative group">
                      <Input
                        id="start"
                        type="text"
                        placeholder="e.g., Chingrighata, Kolkata"
                        className="h-12 pl-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
                        value={startLocation}
                        onChange={(e) => setStartLocation(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-3">
                    <Label htmlFor="destination" className="text-base font-semibold text-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-red-600" />
                        Destination
                      </div>
                    </Label>
                    <div className="relative group">
                      <Input
                        id="destination"
                        type="text"
                        placeholder="e.g., Techno India, Kolkata"
                        className="h-12 pl-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  size="lg" 
                  className="w-full md:w-auto h-12 px-8 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                      Analyzing Routes...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Check Safety
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {showResults && (
          <div className="space-y-8 animate-fadeIn">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-200 rounded-full text-green-700 text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-green-600"></div>
              Analysis Complete
            </div>
            <RouteMap startLocation={startLocation} destination={destination} />
            <AreaRiskInsights />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 mt-20 text-center text-gray-600 border-t border-gray-200">
        <p>
          SafeNav © 2025 • Your safety is our priority | Built by 
          <a href="https://github.com/AitijhyaCoded" target="_blank" rel="noopener noreferrer"> Aitijhya </a> 
          and  
          <a href="https://github.com/Thorfinn05" target="_blank" rel="noopener noreferrer"> Rudranil </a>
          with 💖
        </p>

      </footer>
    </div>
  );
}
