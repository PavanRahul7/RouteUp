
import React, { useState, useEffect, useRef } from 'react';
import { Route, LatLng, RunHistory } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';

declare var L: any;

interface LiveTrackingProps {
  route: Route;
  onFinish: (run: RunHistory) => void;
  onCancel: () => void;
}

const LiveTracking: React.FC<LiveTrackingProps> = ({ route, onFinish, onCancel }) => {
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);
  const [actualPath, setActualPath] = useState<LatLng[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [distanceCovered, setDistanceCovered] = useState(0);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const actualLineRef = useRef<any>(null);
  const watchId = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let timeout: number;

    const initMap = () => {
      if (typeof L === 'undefined') {
        timeout = window.setTimeout(initMap, 100);
        return;
      }

      if (mapRef.current && !mapInstance.current) {
        mapInstance.current = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([route.path[0].lat, route.path[0].lng], 18);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);

        // Planned Route (Faded)
        L.polyline(route.path, {
          color: '#3b82f6',
          weight: 8,
          opacity: 0.2
        }).addTo(mapInstance.current);

        // Actual Path (Glowing Green)
        actualLineRef.current = L.polyline([], {
          color: '#10b981',
          weight: 6,
          opacity: 0.9,
          className: 'route-glow'
        }).addTo(mapInstance.current);

        const userIcon = L.divIcon({
          className: 'user-pos-icon',
          html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 25px rgba(59, 130, 246, 0.8);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        markerRef.current = L.marker([route.path[0].lat, route.path[0].lng], { icon: userIcon, zIndexOffset: 2000 }).addTo(mapInstance.current);
        
        window.setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.invalidateSize();
            setMapReady(true);
          }
        }, 300);
      }
    };

    initMap();

    if (navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (isPaused) return;
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentPos(newPos);
          setActualPath(prev => {
            const next = [...prev, newPos];
            if (actualLineRef.current) actualLineRef.current.setLatLngs(next);
            return next;
          });
          
          if (markerRef.current) markerRef.current.setLatLng([newPos.lat, newPos.lng]);
          if (mapInstance.current) mapInstance.current.panTo([newPos.lat, newPos.lng], { animate: true });

          // Simulated distance for demo (ideally calculated between GPS points)
          setDistanceCovered(prev => prev + 0.002); 
          checkOffRoute(newPos);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    timerRef.current = window.setInterval(() => {
      if (!isPaused) setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(timeout);
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [route, isPaused]);

  const checkOffRoute = (pos: LatLng) => {
    if (!L || !pos) return;
    const lPos = L.latLng(pos.lat, pos.lng);
    let minDistance = Infinity;
    
    route.path.forEach(p => {
      const dist = lPos.distanceTo(L.latLng(p.lat, p.lng));
      if (dist < minDistance) minDistance = dist;
    });

    const off = minDistance > 40; // 40 meters off track
    if (off && !isOffRoute) {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
    setIsOffRoute(off);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0 
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatePace = () => {
    if (distanceCovered === 0) return "0:00";
    const mins = elapsedTime / 60;
    const pace = mins / distanceCovered;
    const pMins = Math.floor(pace);
    const pSecs = Math.round((pace - pMins) * 60);
    return `${pMins}:${pSecs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    const pace = calculatePace();
    const run: RunHistory = {
      id: Math.random().toString(36).substr(2, 9),
      routeId: route.id,
      routeName: route.name,
      date: Date.now(),
      duration: elapsedTime,
      distance: parseFloat(distanceCovered.toFixed(2)),
      averagePace: pace,
      actualPath: actualPath,
    };
    
    // Coaching is better with full data
    const tips = await geminiService.getCoachingTips(run);
    run.coachingTips = tips;
    
    storageService.saveRun(run);
    onFinish(run);
  };

  const progress = Math.min((distanceCovered / route.distance) * 100, 100);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-500">
      {/* Map Backdrop */}
      <div className="flex-1 bg-slate-900 relative">
        <div ref={mapRef} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/80 pointer-events-none" />

        {/* HUD Alerts */}
        {isOffRoute && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1005]">
            <div className="bg-red-600/90 backdrop-blur-xl text-white px-8 py-3 rounded-full font-display font-bold text-xs tracking-[0.2em] shadow-2xl animate-pulse flex items-center gap-3 border border-white/20 uppercase">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Off Path Warning
            </div>
          </div>
        )}
      </div>

      {/* Immersive Controls */}
      <div className="bg-slate-950/95 backdrop-blur-3xl border-t border-slate-900 px-8 pt-10 pb-12 space-y-10 relative z-[1010]">
        
        {/* Progress Bar (Immersive) */}
        <div className="absolute -top-1 left-0 right-0 h-1 bg-slate-800">
           <div 
            className="h-full bg-blue-500 shadow-[0_0_15px_#3b82f6] transition-all duration-1000"
            style={{ width: `${progress}%` }}
           />
        </div>

        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] font-display">Distance</span>
            <div className="text-7xl font-display font-bold text-white tracking-tighter leading-none">
              {distanceCovered.toFixed(2)} <span className="text-2xl text-slate-700">KM</span>
            </div>
          </div>
          <div className="text-right space-y-2">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] font-display">Time</span>
            <div className="text-5xl font-display text-blue-400 leading-none">{formatTime(elapsedTime)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5">
            <span className="text-slate-600 text-[10px] uppercase font-bold tracking-widest font-display">Current Pace</span>
            <div className="text-3xl font-display text-emerald-400 mt-2">{calculatePace()} <span className="text-sm">/km</span></div>
          </div>
          <div className="bg-slate-900/60 p-6 rounded-[2.5rem] border border-white/5">
            <span className="text-slate-600 text-[10px] uppercase font-bold tracking-widest font-display">Percentage</span>
            <div className="text-3xl font-display text-white mt-2">{Math.round(progress)}%</div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={`flex-1 py-8 rounded-[2rem] font-display font-bold text-xs tracking-widest transition-all active:scale-[0.98] border ${
              isPaused 
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-500/20' 
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {isPaused ? 'RESUME RUN' : 'PAUSE RUN'}
          </button>
          <button 
            onClick={handleStop}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-8 rounded-[2rem] font-display font-bold text-xs tracking-widest shadow-2xl shadow-red-900/20 active:scale-[0.98] border border-red-500"
          >
            FINISH RUN
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
