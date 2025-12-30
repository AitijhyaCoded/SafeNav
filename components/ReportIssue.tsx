'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, MapPin, Upload, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportIssue() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast.success("Location detected!");
        },
        (error) => {
          toast.error("Unable to retrieve location.");
          console.error(error);
        }
      );
    } else {
      toast.error("Geolocation is not supported by this browser.");
    }
  };

  const handleManualLocation = async () => {
    if (!manualAddress) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://api.openrouteservice.org/geocode/search?text=${encodeURIComponent(
          manualAddress
        )}&size=1`,
        {
          headers: {
            Authorization: process.env.NEXT_PUBLIC_ORS_KEY || "",
          },
        }
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        setLocation({ lat, lng });
        toast.success(`Location set to: ${data.features[0].properties.label || manualAddress}`);
      } else {
        toast.error("Location not found.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to geocode location.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!location) {
      toast.error("Please enable location services to report an issue.");
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append('lat', location.lat.toString());
    formData.append('lng', location.lng.toString());
    if (image) {
      formData.append('image', image);
    }

    try {
      const res = await fetch('http://localhost:8000/report-issue', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast.success("Issue reported successfully! Thank you for helping the community.");
        setIsOpen(false);
        setImage(null);
        setLocation(null);
      } else {
        toast.error("Failed to submit report.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold h-10">
          <Camera className="h-4 w-4" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="bg-gradient-to-r from-orange-50 to-red-50 -m-6 mb-6 p-6 rounded-t-2xl border-b border-orange-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Report a Hazard</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">Help the community by reporting flood hazards and incidents</p>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Issue Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">1</div>
              Issue Type
            </Label>
            <Select name="issue_type" required>
              <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all">
                <SelectValue placeholder="Select issue type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waterlogging">🌊 Waterlogging</SelectItem>
                <SelectItem value="flooding">🏚️ Flooding</SelectItem>
                <SelectItem value="blocked_drain">🚫 Blocked Drain</SelectItem>
                <SelectItem value="damaged_road">🛣️ Damaged Road</SelectItem>
                <SelectItem value="debris">🪨 Debris on Road</SelectItem>
                <SelectItem value="other">⚠️ Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</div>
              Location
            </Label>
            <div className="space-y-3">
              <Button
                type="button"
                onClick={getCurrentLocation}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Use Current Location
              </Button>

              <div className="relative">
                <span className="text-xs text-gray-500 font-semibold uppercase">Or enter manually</span>
              </div>

              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g., Kolkata, India"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="h-11 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <Button
                  type="button"
                  onClick={handleManualLocation}
                  disabled={isGeocoding}
                  variant="outline"
                  className="h-11 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-semibold"
                >
                  {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set"}
                </Button>
              </div>

              {location && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-700 font-semibold text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-600"></div>
                  Location Selected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">3</div>
              Description
            </Label>
            <Textarea
              name="description"
              placeholder="Describe the hazard in detail (e.g., water depth, traffic impact, accessibility issues...)"
              className="min-h-[100px] border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
              required
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-bold">4</div>
              Photo (Optional)
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-pink-500 hover:bg-pink-50 transition-all duration-200 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                aria-label="Upload photo"
              />
              {image ? (
                <div className="flex items-center justify-center gap-2 text-pink-600 font-semibold">
                  <Upload className="h-5 w-5" />
                  {image.name}
                </div>
              ) : (
                <div className="space-y-2">
                  <Camera className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-gray-600 font-medium">Click to upload an image</p>
                  <p className="text-xs text-gray-500">or drag and drop</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !location}
            className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Submit Report
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


