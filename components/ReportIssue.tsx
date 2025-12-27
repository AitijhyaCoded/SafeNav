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
        <Button variant="destructive" className="gap-2 shadow-lg hover:shadow-xl transition-all">
          <Camera className="h-4 w-4" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Report Road Hazard
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Issue Type</Label>
            <Select name="issue_type" required>
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pothole">Pothole</SelectItem>
                <SelectItem value="waterlogging">Waterlogging / Flood</SelectItem>
                <SelectItem value="accident">Accident / Blockage</SelectItem>
                <SelectItem value="construction">Construction Work</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              name="description" 
              placeholder="Describe the issue (e.g., deep pothole on left lane)..." 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <div className="flex flex-col gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full gap-2"
                onClick={getCurrentLocation}
              >
                <MapPin className="h-4 w-4 text-blue-500" />
                {location ? "Update Location (GPS)" : "Detect My Location"}
              </Button>

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-2 text-xs text-gray-400">OR</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <div className="flex gap-2">
                <Input 
                  placeholder="Enter location manually (e.g. MG Road)" 
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleManualLocation} 
                  disabled={isGeocoding || !manualAddress}
                >
                  {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set"}
                </Button>
              </div>
            </div>
            {location && (
              <p className="text-xs text-green-600 font-medium mt-1">
                ✓ Selected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Upload Photo (Optional)</Label>
            <div 
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {image ? (
                <p className="text-sm text-green-600 font-medium truncate">{image.name}</p>
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-500">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-xs">Click to upload image</span>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageChange}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !location}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


