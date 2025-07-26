'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// TypeScript interfaces
interface Pothole {
  latitude: number;
  longitude: number;
  time: Date;
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

// Custom hook for device motion detection
const useDeviceMotion = (
  isMonitoring: boolean,
  onPotholeDetected: () => void
) => {
  const lastDetectionTimestamp = useRef<number>(0);
  const SHAKE_THRESHOLD = 30; // m/s^2
  const COOLDOWN_PERIOD = 3000; // 3 seconds

  const handleMotionEvent = useCallback((event: DeviceMotionEvent) => {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration || !acceleration.z) return;

    const currentTime = Date.now();
    if (currentTime - lastDetectionTimestamp.current < COOLDOWN_PERIOD) {
      return; // Still in cooldown period
    }

    if (Math.abs(acceleration.z) > SHAKE_THRESHOLD) {
      console.log('Shake detected with Z-acceleration:', acceleration.z);
      lastDetectionTimestamp.current = currentTime;
      onPotholeDetected();
    }
  }, [onPotholeDetected, COOLDOWN_PERIOD, SHAKE_THRESHOLD]);

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

// Map Component
const OSRMMap: React.FC<{ potholes: Pothole[]; currentLocation: { lat: number; lng: number } | null }> = ({ potholes, currentLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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
      
      // Initialize map with default location (Kochi, Kerala)
      const defaultLat = currentLocation?.lat || 9.9312;
      const defaultLng = currentLocation?.lng || 76.2673;
      
      mapInstanceRef.current = L.map(mapRef.current).setView([defaultLat, defaultLng], 13);

      // Add OpenStreetMap tiles with OSRM routing capability
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors | OSRM Routing',
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
  }, [currentLocation]);

  // Update pothole markers when potholes change
  useEffect(() => {
    if (!mapInstanceRef.current || !(window as any).L) return;

    const L = (window as any).L;

    // Clear existing pothole markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Add new pothole markers
    potholes.forEach((pothole, index) => {
      const potholeIcon = L.divIcon({
        html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">!</div>`,
        className: 'pothole-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([pothole.latitude, pothole.longitude], { icon: potholeIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif;">
            <h3 style="margin: 0 0 8px 0; color: #ef4444; font-size: 14px;">Pothole Detected</h3>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Location:</strong> ${pothole.latitude.toFixed(6)}, ${pothole.longitude.toFixed(6)}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Time:</strong> ${pothole.time.toLocaleString()}</p>
          </div>
        `);

      markersRef.current.push(marker);

      // If this is the newest pothole, center the map on it and open popup
      if (index === 0 && potholes.length > 0) {
        mapInstanceRef.current.setView([pothole.latitude, pothole.longitude], 16);
        marker.openPopup();
      }
    });
  }, [potholes]);

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden shadow-lg">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

// Main component
const PotholeDetector: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Click "Start Monitoring" to begin.');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);

  const recordPotholeLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatusMessage('Error: Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPothole: Pothole = { 
          latitude, 
          longitude, 
          time: new Date() 
        };

        console.log('Pothole Location:', newPothole);
        
        // Add the new pothole to the beginning of the list
        setPotholes(prev => [newPothole, ...prev]);
        setStatusMessage('Location recorded! Monitoring...');
        
        // Update current location
        setCurrentLocation({ lat: latitude, lng: longitude });
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
  }, []);

  // Custom hook for handling device motion
  const onPotholeDetected = useCallback(() => {
    setStatusMessage('Pothole detected! Getting location...');
    recordPotholeLocation();
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
      <div className="w-full max-w-4xl mx-auto">
        {/* Header Section */}
        <header className="text-center my-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Pothole Reporting System
          </h1>
          <p className="text-gray-400 mt-2">Using device sensors to map road hazards with OSRM routing.</p>
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
              
              {potholes.length > 0 && (
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center gap-2"
                >
                  <MapIcon />
                  {showMap ? 'Hide Map' : 'Show Map'}
                </button>
              )}
            </div>
          </div>

          {/* Map Section */}
          {showMap && potholes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-center mb-4">
                Pothole Locations Map
              </h2>
              <OSRMMap potholes={potholes} currentLocation={currentLocation} />
              <p className="text-sm text-gray-400 text-center mt-2">
                Red markers show detected potholes. Blue marker shows your location.
              </p>
            </div>
          )}

          {/* Detected Potholes List Section */}
          {potholes.length > 0 && (
            <div className="pt-6 border-t border-gray-700">
              <h2 className="text-2xl font-semibold text-center mb-4">
                Detected Potholes ({potholes.length})
              </h2>
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {potholes.map((pothole, index) => (
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
                      {index === 0 && (
                        <span className="inline-block mt-1 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                          Latest
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {potholes.length === 0 && isMonitoring && (
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
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
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