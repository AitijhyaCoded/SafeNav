import Link from 'next/link';
import { Cloud, MapPin, Shield, ArrowRight, Droplets, Navigation, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">SafeRoute</span>
          </div>
          <Link href="/auth">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </nav> */}

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6">
            <Droplets className="h-4 w-4" />
            Monsoon Season Protection
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Navigate Safely Through
            <span className="text-blue-600"> Monsoon Season</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Urban flooding creates dangerous travel conditions. Plan your journey with real-time flood risk data and avoid hazardous routes during heavy rainfall.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/home">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8">
                Plan a Safer Route
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8">
              Learn More
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Navigation className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Route Planning</h3>
              <p className="text-gray-600">
                Get alternative routes that avoid flood-prone areas and waterlogged streets in real-time.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <MapPin className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Area Risk Insights</h3>
              <p className="text-gray-600">
                Check flood risk levels for any location before you travel during monsoon season.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Live Weather Alerts</h3>
              <p className="text-gray-600">
                Stay informed with real-time weather updates and monsoon safety warnings.
              </p>
            </div>
          </div>

          <div className="mt-20 p-8 bg-blue-600 rounded-3xl text-white">
            <Cloud className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Why Monsoon-Safe Routes Matter
            </h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              Every year, urban flooding causes travel delays, vehicle damage, and safety risks.
              Our platform helps you make informed decisions and choose safer paths during heavy rainfall.
            </p>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 SafeRoute. Keeping you safe during monsoon season.</p>
        </div>
      </footer>
    </div>
  );
}
