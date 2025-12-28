import Link from 'next/link';
import { Cloud, MapPin, Shield, ArrowRight, Droplets, Navigation, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-10 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: "2s"}}></div>
        <div className="absolute -bottom-8 left-1/2 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: "4s"}}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-4 py-6 border-b border-white/10 sticky top-0 backdrop-blur-md bg-slate-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg blur opacity-75"></div>
              <div className="relative px-3 py-1 bg-slate-900 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">SafeNav</span>
          </div>
          <Link href="/home">
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 h-10">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-4 py-12 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-cyan-300 text-sm font-medium mb-8">
            <Droplets className="h-4 w-4" />
            Monsoon Season Protection • Real-Time AI Analysis
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            Navigate Safely
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400">Through Monsoon Season</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl">
            Intelligent route planning powered by AI, real-time flood detection, and community reports. Stay safe during heavy rainfall with data-driven decisions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-start mb-20">
            <Link href="/home" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-lg h-14 px-8 border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                Plan a Safer Route
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 border-white/30 text-white hover:bg-white/10">
              View Features
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 mb-20">
            {[
              { icon: Navigation, title: "Smart Route Planning", desc: "Get alternative routes that avoid flood-prone areas and waterlogged streets in real-time.", color: "from-blue-500 to-blue-600" },
              { icon: MapPin, title: "Area Risk Insights", desc: "Check flood risk levels for any location before you travel during monsoon season.", color: "from-cyan-500 to-cyan-600" },
              { icon: AlertTriangle, title: "Live Weather Alerts", desc: "Stay informed with real-time weather updates and monsoon safety warnings.", color: "from-orange-500 to-orange-600" },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-all duration-300"></div>
                  <div className="relative p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 group-hover:border-white/40 transition-all duration-300 h-full">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">{feature.title}</h3>
                    <p className="text-gray-300 group-hover:text-gray-100 transition-colors">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 py-12 border-y border-white/10">
            {[
              { number: "50K+", label: "Routes Analyzed" },
              { number: "99.2%", label: "Accuracy Rate" },
              { number: "24/7", label: "Live Monitoring" },
              { number: "15K+", label: "Community Users" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-cyan-300 mb-1">{stat.number}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="relative p-8 md:p-16 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 backdrop-blur-sm rounded-3xl border border-white/20 text-center">
            <Cloud className="h-16 w-16 mx-auto mb-6 text-cyan-300" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Why Monsoon-Safe Routes Matter
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
              Every year, urban flooding causes travel delays, vehicle damage, and safety risks. Our AI-powered platform helps you make informed decisions and choose safer paths during heavy rainfall.
            </p>
            <Link href="/home">
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 h-12 px-8 text-base">
                Start Planning Now
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-4 py-12 mt-20 border-t border-white/10">
        <div className="text-center text-gray-400">
          <p>&copy; 2025 SafeNav. Stay safe during monsoon season with AI-powered navigation.</p>
        </div>
      </footer>
    </div>
  );
}
