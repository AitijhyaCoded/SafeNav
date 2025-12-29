"""
Weather Service Module

Handles all interactions with OpenWeather API including:
- Current weather data fetching
- 5-day forecast retrieval
- In-memory caching with TTL
- Error handling and fallback to cached data
"""

import os
import time
import requests
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class WeatherData(BaseModel):
    """Current weather conditions"""
    temperature: float  # Celsius
    humidity: float  # Percentage
    rainfall: float  # mm per hour
    wind_speed: float  # m/s
    pressure: float  # hPa
    conditions: str  # e.g., "Rain", "Clear"
    timestamp: datetime


class ForecastData(BaseModel):
    """Weather forecast for specific time"""
    timestamp: datetime
    temperature: float
    humidity: float
    rainfall_probability: float  # 0-1
    expected_rainfall: float  # mm
    conditions: str



class WeatherService:
    """Handles all interactions with OpenWeather API"""
    
    def __init__(self, api_key: str, cache_ttl: int = 300):
        """
        Initialize Weather Service
        
        Args:
            api_key: OpenWeather API key
            cache_ttl: Cache time-to-live in seconds (default: 300 = 5 minutes)
        """
        self.api_key = api_key
        self.cache_ttl = cache_ttl
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.base_url = "https://api.openweathermap.org/data/2.5"
    
    def _get_cache_key(self, endpoint: str, lat: float, lon: float) -> str:
        """Generate cache key for location and endpoint"""
        return f"{endpoint}:{lat:.4f}:{lon:.4f}"
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still fresh"""
        if cache_key not in self.cache:
            return False
        
        cached_time = self.cache[cache_key].get("cached_at", 0)
        current_time = time.time()
        
        return (current_time - cached_time) < self.cache_ttl
    
    def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Retrieve data from cache if valid"""
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key].get("data")
        return None
    
    def _save_to_cache(self, cache_key: str, data: Any) -> None:
        """Save data to cache with timestamp"""
        self.cache[cache_key] = {
            "data": data,
            "cached_at": time.time()
        }

    
    def get_current_weather(self, lat: float, lon: float) -> WeatherData:
        """
        Fetch current weather with caching
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            WeatherData object with current conditions
            
        Raises:
            Exception: If API fails and no cached data available
        """
        cache_key = self._get_cache_key("weather", lat, lon)
        
        # Try to get from cache first
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return WeatherData(**cached_data)
        
        # Fetch from API
        try:
            url = f"{self.base_url}/weather"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric"
            }
            
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            # Parse response
            rainfall = 0.0
            if "rain" in data:
                rainfall = data["rain"].get("1h", 0.0)
            
            weather_data = {
                "temperature": data["main"]["temp"],
                "humidity": data["main"]["humidity"],
                "rainfall": rainfall,
                "wind_speed": data["wind"]["speed"],
                "pressure": data["main"]["pressure"],
                "conditions": data["weather"][0]["main"] if data.get("weather") else "Unknown",
                "timestamp": datetime.fromtimestamp(data["dt"])
            }
            
            # Save to cache
            self._save_to_cache(cache_key, weather_data)
            
            return WeatherData(**weather_data)
            
        except requests.exceptions.Timeout:
            # Timeout - try to return stale cache
            if cache_key in self.cache:
                stale_data = self.cache[cache_key].get("data")
                if stale_data:
                    return WeatherData(**stale_data)
            raise Exception("Weather API timeout and no cached data available")
            
        except requests.exceptions.RequestException as e:
            # Other request errors - try to return stale cache
            if cache_key in self.cache:
                stale_data = self.cache[cache_key].get("data")
                if stale_data:
                    return WeatherData(**stale_data)
            raise Exception(f"Weather API error: {str(e)}")
            
        except (KeyError, ValueError) as e:
            # Parsing error - try to return stale cache
            if cache_key in self.cache:
                stale_data = self.cache[cache_key].get("data")
                if stale_data:
                    return WeatherData(**stale_data)
            raise Exception(f"Weather data parsing error: {str(e)}")

    
    def get_forecast(self, lat: float, lon: float) -> List[ForecastData]:
        """
        Fetch 5-day/3-hour forecast (40 data points)
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            List of ForecastData objects (up to 40 entries)
            
        Raises:
            Exception: If API fails and no cached data available
        """
        cache_key = self._get_cache_key("forecast", lat, lon)
        
        # Try to get from cache first
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return [ForecastData(**item) for item in cached_data]
        
        # Fetch from API
        try:
            url = f"{self.base_url}/forecast"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric"
            }
            
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            # Parse forecast list
            forecast_list = []
            for item in data.get("list", []):
                rainfall = 0.0
                if "rain" in item:
                    rainfall = item["rain"].get("3h", 0.0)
                
                # Calculate rainfall probability from clouds/pop
                rainfall_prob = item.get("pop", 0.0)  # Probability of precipitation
                
                forecast_item = {
                    "timestamp": datetime.fromtimestamp(item["dt"]),
                    "temperature": item["main"]["temp"],
                    "humidity": item["main"]["humidity"],
                    "rainfall_probability": rainfall_prob,
                    "expected_rainfall": rainfall,
                    "conditions": item["weather"][0]["main"] if item.get("weather") else "Unknown"
                }
                
                forecast_list.append(forecast_item)
            
            # Save to cache
            self._save_to_cache(cache_key, forecast_list)
            
            return [ForecastData(**item) for item in forecast_list]
            
        except requests.exceptions.Timeout:
            # Timeout - try to return stale cache
            if cache_key in self.cache:
                stale_data = self.cache[cache_key].get("data")
                if stale_data:
                    return [ForecastData(**item) for item in stale_data]
            raise Exception("Weather forecast API timeout and no cached data available")
            
        except requests.exceptions.RequestException as e:
            # Other request errors - try to return stale cache
            if cache_key in self.cache:
                stale_data = self.cache[cache_key].get("data")
                if stale_data:
                    return [ForecastData(**item) for item in stale_data]
            raise Exception(f"Weather forecast API error: {str(e)}")
            
        except (KeyError, ValueError) as e:
            # Parsing error - try to return stale cache
            if cache_key in self.cache:
                stale_data = self.cache[cache_key].get("data")
                if stale_data:
                    return [ForecastData(**item) for item in stale_data]
            raise Exception(f"Weather forecast parsing error: {str(e)}")



# Global instance for use across the application
_weather_service_instance: Optional[WeatherService] = None


def get_weather_service() -> WeatherService:
    """
    Get or create the global WeatherService instance
    
    Returns:
        WeatherService instance
    """
    global _weather_service_instance
    
    if _weather_service_instance is None:
        api_key = os.getenv("OPENWEATHER_API_KEY")
        if not api_key:
            raise ValueError("OPENWEATHER_API_KEY environment variable not set")
        
        _weather_service_instance = WeatherService(api_key=api_key)
    
    return _weather_service_instance
