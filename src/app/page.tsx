'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';

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

// Main component
const PotholeDetector: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Click "Start Monitoring" to begin.');

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
      () => {
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
    <>
      <Head>
        <title>Pothole Reporting System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen flex flex-col items-center p-4 bg-gray-900 text-white font-sans">
        <div className="w-full max-w-2xl mx-auto">
          {/* Header Section */}
          <header className="text-center my-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Pothole Reporting System
            </h1>
            <p className="text-gray-400 mt-2">Using device sensors to map road hazards.</p>
          </header>

          {/* Main Content Area */}
          <main className="bg-gray-800 rounded-xl shadow-2xl p-6">
            {/* Status and Control Section */}
            <div className="flex flex-col items-center text-center">
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

              {!isMonitoring && (
                <button
                  onClick={handleStartMonitoring}
                  className="w-full max-w-xs px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transform transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-purple-300"
                >
                  Start Monitoring
                </button>
              )}
            </div>

            {/* Detected Potholes List Section */}
            {potholes.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-700">
                <h2 className="text-2xl font-semibold text-center mb-4">
                  Detected Potholes
                </h2>
                <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {potholes.map((pothole) => (
                    <li
                      key={`${pothole.latitude}-${pothole.longitude}-${pothole.time.getTime()}`}
                      className="bg-gray-700 p-4 rounded-lg flex items-start space-x-4 shadow-md animate-fade-in"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <LocationIcon className="text-pink-400" />
                      </div>
                      <div>
                        <p className="font-mono text-sm text-green-300">
                          Lat: {pothole.latitude.toFixed(6)}, Lon: {pothole.longitude.toFixed(6)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {pothole.time.toLocaleTimeString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </main>
        </div>
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
      `}</style>
    </>
  );
};

export default PotholeDetector;