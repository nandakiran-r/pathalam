'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// TypeScript interfaces
interface Pothole {
  id?: string;
  latitude: number;
  longitude: number;
  time: Date;
  created_at?: string;
}

interface DeviceMotionEventWithPermission extends DeviceMotionEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

// Extend the global DeviceMotionEvent to include requestPermission
declare global {
  interface DeviceMotionEventConstructor {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
}

// Supabase configuration - Replace with your actual values
const SUPABASE_URL = 'https://ahecqqpoxwwbexkpwihj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZWNxcXBveHd3YmV4a3B3aWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MDM0MTAsImV4cCI6MjA2OTA3OTQxMH0.iLqeqs8eB9c7CJeD3IguahpOji5xVWASNUzU8Bces3w';

// Simple Supabase client
class SupabaseClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(url: string, key: string) {
    this.baseUrl = url;
    this.apiKey = key;
  }

  async insert(table: string, data: any) {
    try {
      const response = await fetch(`${this.baseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
  }

  async select(table: string, query: string = '*') {
    try {
      const response = await fetch(`${this.baseUrl}/rest/v1/${table}?select=${query}&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Supabase select error:', error);
      throw error;
    }
  }
}

// Initialize Supabase client
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Custom hook for device motion detection
const useDeviceMotion = (
  isMonitoring: boolean,
  onPotholeDetected: (severity: 'normal' | 'high') => void
) => {
  const shakeTimestamps = useRef<number[]>([]);
  const lastDetectionTimestamp = useRef<number>(0);

  const SHAKE_MAGNITUDE_THRESHOLD = 18; // Shake sensitivity
  const SHAKING_WINDOW = 5000; // 5 seconds
  const REQUIRED_SHAKES_FOR_ACCIDENT = 8; // Number of shakes in 5s to trigger accident
  const COOLDOWN_PERIOD = 3000; // Debounce period between detections

  const handleMotionEvent = useCallback((event: DeviceMotionEvent) => {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;

    const x = acceleration.x ?? 0;
    const y = acceleration.y ?? 0;
    const z = acceleration.z ?? 0;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    const now = Date.now();

    // Remove outdated shake timestamps older than the window
    shakeTimestamps.current = shakeTimestamps.current.filter(
      (timestamp) => now - timestamp <= SHAKING_WINDOW
    );

    if (magnitude > SHAKE_MAGNITUDE_THRESHOLD) {
      shakeTimestamps.current.push(now);
    }

    const recentShakes = shakeTimestamps.current.length;

    if (recentShakes >= REQUIRED_SHAKES_FOR_ACCIDENT) {
      if (now - lastDetectionTimestamp.current > COOLDOWN_PERIOD) {
        console.log('🚨 Sustained irregular shaking detected — Accident assumed.');
        lastDetectionTimestamp.current = now;
        shakeTimestamps.current = []; // Reset after trigger
        onPotholeDetected('high');
      }
    } else if (magnitude > SHAKE_MAGNITUDE_THRESHOLD) {
      if (now - lastDetectionTimestamp.current > COOLDOWN_PERIOD) {
        console.log('⚠️ Normal pothole detected with magnitude:', magnitude.toFixed(2));
        lastDetectionTimestamp.current = now;
        onPotholeDetected('normal');
      }
    }
  }, [onPotholeDetected]);

  useEffect(() => {
    if (isMonitoring) {
      window.addEventListener('devicemotion', handleMotionEvent);
      console.log('Device motion listener added.');

      return () => {
        window.removeEventListener('devicemotion', handleMotionEvent);
        console.log('Device motion listener removed.');
      };
    }
  }, [isMonitoring, handleMotionEvent]);
};


// Icons as React components
const ZapIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="32" 
    height="32" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="32" 
    height="32" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const LocationIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const MapIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
    <line x1="8" y1="2" x2="8" y2="18"></line>
    <line x1="16" y1="6" x2="16" y2="22"></line>
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
  </svg>
);

const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

// Map Component
const OSRMMap: React.FC<{ 
  localPotholes: Pothole[]; 
  allPotholes: Pothole[]; 
  currentLocation: { lat: number; lng: number } | null;
  onRefreshData: () => void;
  isLoading: boolean;
}> = ({ localPotholes, allPotholes, currentLocation, onRefreshData, isLoading }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Function to calculate the centroid of potholes
  const getPotholesCentroid = useCallback((potholes: Pothole[]) => {
    if (potholes.length === 0) return null;
    
    let latSum = 0;
    let lngSum = 0;
    
    potholes.forEach(pothole => {
      latSum += pothole.latitude;
      lngSum += pothole.longitude;
    });
    
    return {
      lat: latSum / potholes.length,
      lng: lngSum / potholes.length
    };
  }, []);

  // Function to find the area with highest pothole concentration
  const getHighestConcentrationArea = useCallback((potholes: Pothole[]) => {
    if (potholes.length === 0) return null;
    
    // Simple grid-based clustering
    const gridSize = 0.01; // ~1km grid at equator
    const gridCounts: Record<string, { count: number, latSum: number, lngSum: number }> = {};
    
    potholes.forEach(pothole => {
      const gridX = Math.floor(pothole.latitude / gridSize);
      const gridY = Math.floor(pothole.longitude / gridSize);
      const gridKey = `${gridX},${gridY}`;
      
      if (!gridCounts[gridKey]) {
        gridCounts[gridKey] = { count: 0, latSum: 0, lngSum: 0 };
      }
      
      gridCounts[gridKey].count++;
      gridCounts[gridKey].latSum += pothole.latitude;
      gridCounts[gridKey].lngSum += pothole.longitude;
    });
    
    // Find the grid with most potholes
    let maxCount = 0;
    let bestGrid = null;
    
    for (const gridKey in gridCounts) {
      if (gridCounts[gridKey].count > maxCount) {
        maxCount = gridCounts[gridKey].count;
        bestGrid = gridKey;
      }
    }
    
    if (bestGrid) {
      return {
        lat: gridCounts[bestGrid].latSum / gridCounts[bestGrid].count,
        lng: gridCounts[bestGrid].lngSum / gridCounts[bestGrid].count
      };
    }
    
    return getPotholesCentroid(potholes);
  }, [getPotholesCentroid]);

  useEffect(() => {
    // Load Leaflet CSS and JS
    const loadLeaflet = async () => {
      // Load CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
        document.head.appendChild(cssLink);
      }

      // Load JS
      if (!(window as any).L) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        script.onload = initializeMap;
        document.head.appendChild(script);
      } else {
        initializeMap();
      }
    };

    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const L = (window as any).L;
      
      // Determine the best initial view
      let defaultLat = 9.9312; // Default Kochi latitude
      let defaultLng = 76.2673; // Default Kochi longitude
      let defaultZoom = 13;
      
      // Try to use the highest concentration area first
      const concentrationCenter = getHighestConcentrationArea(allPotholes);
      if (concentrationCenter) {
        defaultLat = concentrationCenter.lat;
        defaultLng = concentrationCenter.lng;
        defaultZoom = 14; // Zoom in a bit more for concentration areas
      } 
      // Otherwise, use current location if available
      else if (currentLocation) {
        defaultLat = currentLocation.lat;
        defaultLng = currentLocation.lng;
      }
      
      mapInstanceRef.current = L.map(mapRef.current).setView([defaultLat, defaultLng], defaultZoom);

      // Add OpenStreetMap tiles with OSRM routing capability
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors | OSRM Routing | Supabase Storage',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);

      // Add current location marker if available
      if (currentLocation) {
        const userIcon = L.divIcon({
          html: '<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          className: 'user-location-marker',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        L.marker([currentLocation.lat, currentLocation.lng], { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('Your Current Location')
          .openPopup();
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [allPotholes, currentLocation, getHighestConcentrationArea]);

  // Update pothole markers when potholes change
  useEffect(() => {
    if (!mapInstanceRef.current || !(window as any).L) return;

    const L = (window as any).L;

    // Clear existing pothole markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Add all potholes from database (historical data)
    allPotholes.forEach((pothole) => {
      const isLocal = localPotholes.some(local => 
        Math.abs(local.latitude - pothole.latitude) < 0.00001 && 
        Math.abs(local.longitude - pothole.longitude) < 0.00001
      );

      const potholeIcon = L.divIcon({
        html: `<div style="background-color: ${isLocal ? '#ef4444' : '#f97316'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">!</div>`,
        className: 'pothole-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const potholeDate = pothole.created_at ? new Date(pothole.created_at) : pothole.time;
      const timeAgo = getTimeAgo(potholeDate);

      const marker = L.marker([pothole.latitude, pothole.longitude], { icon: potholeIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif;">
            <h3 style="margin: 0 0 8px 0; color: ${isLocal ? '#ef4444' : '#f97316'}; font-size: 14px;">
              ${isLocal ? 'Your Detection' : 'Community Report'}
            </h3>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Location:</strong> ${pothole.latitude.toFixed(6)}, ${pothole.longitude.toFixed(6)}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Detected:</strong> ${timeAgo}</p>
            <p style="margin: 4px 0; font-size: 11px; color: #666;">${isLocal ? 'Detected by you' : 'Shared by the community'}</p>
          </div>
        `);

      markersRef.current.push(marker);
    });

    // If there's a new local pothole, center the map on it
    if (localPotholes.length > 0) {
      const latestLocal = localPotholes[0];
      mapInstanceRef.current.setView([latestLocal.latitude, latestLocal.longitude], 16);
    }
  }, [localPotholes, allPotholes]);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">
          Community Pothole Map
        </h2>
        <button
          onClick={onRefreshData}
          disabled={isLoading}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshIcon className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      <div className="w-full h-96 rounded-lg overflow-hidden shadow-lg mb-4">
        <div ref={mapRef} className="w-full h-full" />
      </div>
      
      <div className="flex justify-between text-sm text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
            <span>Your Detections ({localPotholes.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
            <span>Community Reports ({allPotholes.length - localPotholes.length})</span>
          </div>
        </div>
        <span>Total: {allPotholes.length} potholes</span>
      </div>
    </div>
  );
};

// Main component
const PotholeDetector: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [localPotholes, setLocalPotholes] = useState<Pothole[]>([]);
  const [allPotholes, setAllPotholes] = useState<Pothole[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Click "Start Monitoring" to begin.');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(false);
  const [showEmergencyAlert, setShowEmergencyAlert] = useState<boolean>(false);
  const [emergencyAlertMessage, setEmergencyAlertMessage] = useState<string>('');

  // Check if Supabase is configured
  useEffect(() => {
    const configured = SUPABASE_URL.includes('supabase.co') && 
                     SUPABASE_ANON_KEY.length > 50 && 
                     !SUPABASE_ANON_KEY.includes('YOUR_ACTUAL_KEY_HERE');
    setIsSupabaseConfigured(configured);
    
    if (configured) {
      loadAllPotholes();
    }
  }, []);

  const loadAllPotholes = async () => {
    if (!isSupabaseConfigured) return;
    
    setIsLoading(true);
    try {
      const data = await supabase.select('potholes', '*');
      const formattedData = data.map((pothole: any) => ({
        id: pothole.id,
        latitude: pothole.latitude,
        longitude: pothole.longitude,
        time: new Date(pothole.created_at),
        created_at: pothole.created_at
      }));
      setAllPotholes(formattedData);
      console.log('Loaded potholes from Supabase:', formattedData.length);
    } catch (error) {
      console.error('Error loading potholes:', error);
      setStatusMessage('Error loading community data. Check your Supabase configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const savePotholeToSupabase = async (pothole: Pothole) => {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, skipping save');
      return;
    }

    try {
      const potholeData = {
        latitude: pothole.latitude,
        longitude: pothole.longitude,
        created_at: new Date().toISOString()
      };

      await supabase.insert('potholes', potholeData);
      console.log('Pothole saved to Supabase successfully');
      
      // Refresh the data to show the new pothole
      await loadAllPotholes();
    } catch (error) {
      console.error('Error saving pothole to Supabase:', error);
    }
  };

  const recordPotholeLocation = useCallback((severity: 'normal' | 'high') => {
    if (!navigator.geolocation) {
      setStatusMessage('Error: Geolocation is not supported by your browser.');
      return;
    }

    if (severity === 'high') {
      setEmergencyAlertMessage('Severe impact detected! Possible accident risk!');
      setShowEmergencyAlert(true);
      setTimeout(() => setShowEmergencyAlert(false), 5000);
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newPothole: Pothole = { 
          latitude, 
          longitude, 
          time: new Date() 
        };

        console.log('Pothole Location:', newPothole);
        
        // Add the new pothole to local list
        setLocalPotholes(prev => [newPothole, ...prev]);
        setStatusMessage(severity === 'high' 
          ? 'Severe impact recorded! Saving to database...' 
          : 'Location recorded! Saving to community database...');
        
        // Update current location
        setCurrentLocation({ lat: latitude, lng: longitude });

        // Save to Supabase
        await savePotholeToSupabase(newPothole);
        setStatusMessage(severity === 'high' 
          ? 'Severe impact saved to database!' 
          : 'Saved to community database! Monitoring...');
      },
      (error) => {
        console.error("Error getting location:", error);
        setStatusMessage(`Error: Could not get location. ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [isSupabaseConfigured]);

  // Custom hook for handling device motion
  const onPotholeDetected = useCallback((severity: 'normal' | 'high') => {
    setStatusMessage(severity === 'high' 
      ? 'Severe impact detected! Getting location...' 
      : 'Pothole detected! Getting location...');
    recordPotholeLocation(severity);
  }, [recordPotholeLocation]);

  useDeviceMotion(isMonitoring, onPotholeDetected);

  const handleStartMonitoring = async () => {
    setStatusMessage('Requesting permissions...');

    // Step 1: Request Motion Sensor Permission (for iOS 13.3+)
    if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
      try {
        const permissionState = await (DeviceMotionEvent as unknown as DeviceMotionEventWithPermission).requestPermission?.();
        if (permissionState !== 'granted') {
          setStatusMessage('Error: Motion sensor permission denied.');
          return;
        }
      } catch (error) {
        console.error("Error requesting motion permission:", error);
        setStatusMessage('Error: Could not get motion permissions.');
        return;
      }
    }

    // Step 2: Request Geolocation Permission
    if (!navigator.geolocation) {
      setStatusMessage("Error: Geolocation is not supported by your browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Set initial current location
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        
        // Permissions granted, now update UI and start monitoring
        setStatusMessage('Permissions granted. Monitoring for potholes...');
        setIsMonitoring(true);
      },
      (error) => {
        setStatusMessage(`Error: Geolocation permission denied. ${error.message}`);
        console.error("Geolocation permission error:", error);
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gray-900 text-white font-sans">
      {/* Emergency Alert Banner */}
      {showEmergencyAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
          <div className="bg-red-600 text-white p-4 shadow-lg flex items-center justify-center gap-3">
            <AlertTriangleIcon className="text-white" />
            <span className="font-bold">{emergencyAlertMessage}</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto">
        {/* Header Section */}
        <header className="text-center my-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Community Pothole Reporter
          </h1>
          <p className="text-gray-400 mt-2">
            Mapping road hazards together with real-time community data
          </p>
          {!isSupabaseConfigured && (
            <div className="mt-4 p-4 bg-yellow-900 border border-yellow-600 rounded-lg">
              <p className="text-yellow-200 text-sm mb-2">
                ⚠️ Conneting Supabase...
              </p>
              <details className="text-xs text-yellow-300">
                <summary className="cursor-pointer hover:text-yellow-100">Setup Instructions</summary>
                <div className="mt-2 space-y-2">
                  <p>1. Create a Supabase project at supabase.com</p>
                  <p>2. Create a 'potholes' table with 'latitude' and 'longitude' columns (both float8)</p>
                  <p>3. Enable RLS and create policies for public read/insert access</p>
                  <p>4. Get your Project URL and anon key from Settings → API</p>
                  <p>5. Replace the values in the code configuration</p>
                </div>
              </details>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main className="bg-gray-800 rounded-xl shadow-2xl p-6">
          {/* Status and Control Section */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-700 mb-4">
              {!isMonitoring ? (
                <ZapIcon className="text-yellow-400" />
              ) : (
                <BellIcon className="text-green-400 animate-pulse" />
              )}
            </div>
            
            <p className="text-gray-300 mb-6 h-10">
              {statusMessage}
            </p>

            <div className="flex gap-4 flex-wrap justify-center">
              {!isMonitoring && (
                <button
                  onClick={handleStartMonitoring}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-purple-300"
                >
                  Start Monitoring
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowMap(!showMap);
                  if (!showMap && isSupabaseConfigured) {
                    loadAllPotholes();
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center gap-2"
              >
                <MapIcon />
                {showMap ? 'Hide Map' : 'Show Community Map'}
              </button>
            </div>
          </div>

          {/* Map Section */}
          {showMap && (
            <div className="mb-8">
              <OSRMMap 
                localPotholes={localPotholes} 
                allPotholes={allPotholes}
                currentLocation={currentLocation} 
                onRefreshData={loadAllPotholes}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Your Detections List Section */}
          {localPotholes.length > 0 && (
            <div className="pt-6 border-t border-gray-700">
              <h2 className="text-2xl font-semibold text-center mb-4">
                Your Detections ({localPotholes.length})
              </h2>
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {localPotholes.map((pothole, index) => (
                  <li
                    key={`${pothole.latitude}-${pothole.longitude}-${pothole.time.getTime()}`}
                    className="bg-gray-700 p-4 rounded-lg flex items-start space-x-4 shadow-md animate-fade-in"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <LocationIcon className="text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-mono text-sm text-green-300">
                        Lat: {pothole.latitude.toFixed(6)}, Lon: {pothole.longitude.toFixed(6)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {pothole.time.toLocaleString()}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {index === 0 && (
                          <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                            Latest
                          </span>
                        )}
                        {isSupabaseConfigured && (
                          <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                            Shared with Community
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {localPotholes.length === 0 && isMonitoring && (
            <div className="text-center py-8">
              <p className="text-gray-400">No potholes detected yet. Drive around to start mapping!</p>
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { 
            opacity: 0; 
            transform: translateY(-10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes slide-down {
          from { 
            opacity: 0; 
            transform: translateY(-100%); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }
        
        .user-location-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .pothole-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default PotholeDetector;