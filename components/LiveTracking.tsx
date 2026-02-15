import React, { useState, useEffect, useRef } from 'react';
import { Route, LatLng, RunHistory, UnitSystem } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { formatDistance, formatPace } from '../services/unitUtils';

declare var L: any;

interface Step {
  instruction: string;
  distance: number;
  location: LatLng;
}

interface LiveTrackingProps {
  route: Route;
  unitSystem: UnitSystem;
  onFinish: (run: RunHistory) => void;
  onCancel: () => void;
}

const LiveTracking: React.FC<LiveTrackingProps> = ({ route, unitSystem, onFinish, onCancel }) => {
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);
  const [actualPath, setActualPath] = useState<LatLng[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [distanceCovered, setDistanceCovered] = useState(0); 
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [cafesNearby, setCafesNearby] = useState<any[]>([]);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const actualLineRef = useRef<any>(null);
  const watchId = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastCoords = useRef<LatLng | null>(null);
  const alertedCafes = useRef<Set<string>>(new Set());

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const fetchDirections = async () => {
      // Sample coordinates to avoid long URL
      const sampled = route.path.filter((_, i) => i % 10 === 0 || i === route.path.length - 1);
      const coords = sampled.map(p => `${p.lng},${p.lat}`).join(';');
      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/foot/${coords}?steps=true&overview=full&geometries=geojson`);
        const data = await response.json();
        if (data.code === 'Ok') {
          const fetchedSteps: Step[] = data.routes[0].legs.flatMap((leg: any) => 
            leg.steps.map((s: any) => ({
              instruction: s.maneuver.instruction,
              distance: s.distance,
              location: { lat: s.maneuver.location[1], lng: s.maneuver.location[0] }
            }))
          );
          setSteps(fetchedSteps);
        }
      } catch (e) { console.error("OSRM steps fetch failed", e); }
    };

    const fetchCafes = async () => {
      const mid = route.path[Math.floor(route.path.length / 2)];
      const query = `[out:json];node["amenity"="cafe"](around:1000,${mid.lat},${mid.lng});out;`;
      try {
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await response.json();
        setCafesNearby(data.elements || []);
      } catch (e) { console.error("Cafe alerts fetch failed", e); }
    };

    fetchDirections();
    fetchCafes();
  }, [route.id]);

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([route.path[0].lat, route.path[0].lng], 18);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);

      L.polyline(route.path, { color: '#d4943a', weight: 10, opacity: 0.15, lineCap: 'round' }).addTo(mapInstance.current);
      actualLineRef.current = L.polyline([], { color: '#10b981', weight: 6, opacity: 0.9, lineCap: 'round' }).addTo(mapInstance.current);

      const userIcon = L.divIcon({
        className: 'user-pos-icon',
        html: `<div style="background-color: #d4943a; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #1a1210; box-shadow: 0 0 15px rgba(212, 148, 58, 0.6);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      markerRef.current = L.marker([route.path[0].lat, route.path[0].lng], { icon: userIcon }).addTo(mapInstance.current);
    }

    if (navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (isPaused) return;
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentPos(newPos);
          
          if (lastCoords.current) {
            const dist = L.latLng(lastCoords.current.lat, lastCoords.current.lng).distanceTo(L.latLng(newPos.lat, newPos.lng));
            setDistanceCovered(prev => prev + (dist / 1000));
          }
          lastCoords.current = newPos;

          setActualPath(prev => {
            const next = [...prev, newPos];
            if (actualLineRef.current) actualLineRef.current.setLatLngs(next);
            return next;
          });
          
          if (markerRef.current) markerRef.current.setLatLng([newPos.lat, newPos.lng]);
          if (mapInstance.current) mapInstance.current.panTo([newPos.lat, newPos.lng], { animate: true });

          checkNavigationUpdates(newPos);
          checkCoffeeAlerts(newPos);
          checkOffRoute(newPos);
        },
        (err) => console.warn("GPS error", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      timerRef.current = window.setInterval(() => {
        if (!isPaused) setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [isPaused, route.id]);

  const checkNavigationUpdates = (pos: LatLng) => {
    if (steps.length === 0) return;
    const nextStep = steps[currentStepIndex];
    if (!nextStep) return;
    const distToTurn = L.latLng(pos.lat, pos.lng).distanceTo(L.latLng(nextStep.location.lat, nextStep.location.lng));
    if (distToTurn < 25) {
      const nextIdx = currentStepIndex + 1;
      if (nextIdx < steps.length) {
        setCurrentStepIndex(nextIdx);
        speak(steps[nextIdx].instruction);
      }
    }
  };

  const checkCoffeeAlerts = (pos: LatLng) => {
    cafesNearby.forEach(cafe => {
      if (alertedCafes.current.has(cafe.id)) return;
      const dist = L.latLng(pos.lat, pos.lng).distanceTo(L.latLng(cafe.lat, cafe.lon));
      if (dist < 100) {
        speak(`Pit stop ahead: ${cafe.tags.name || 'Coffee shop'}`);
        alertedCafes.current.add(cafe.id);
      }
    });
  };

  const checkOffRoute = (pos: LatLng) => {
    let minDistance = Infinity;
    route.path.forEach(p => {
      const d = L.latLng(pos.lat, pos.lng).distanceTo(L.latLng(p.lat, p.lng));
      if (d < minDistance) minDistance = d;
    });
    const off = minDistance > 50;
    if (off && !isOffRoute) {
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
      speak("You are off route. Check the map.");
    }
    setIsOffRoute(off);
  };

  const handleStop = async () => {
    const run: RunHistory = {
      id: Math.random().toString(36).substr(2, 9),
      routeId: route.id,
      routeName: route.name,
      date: Date.now(),
      duration: elapsedTime,
      distance: parseFloat(distanceCovered.toFixed(2)),
      averagePace: (elapsedTime / 60 / (distanceCovered || 1)).toFixed(2),
      actualPath: actualPath,
    };
    run.coachingTips = await geminiService.getCoachingTips(run);
    storageService.saveRun(run);
    onFinish(run);
  };

  const progress = Math.min((distanceCovered / route.distance) * 100, 100);

  return (
    <div className="fixed inset-0 z-[200] bg-[#1a1210] flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Turn Direction Banner */}
        <div className="absolute top-16 left-8 right-8 z-[1010]">
          <div className="glass p-5 rounded-[2.5rem] border-white/10 flex items-center gap-5 shadow-3xl">
            <div className="w-14 h-14 bg-[#d4943a] rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
              <svg className="w-8 h-8 text-[#1a1210]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            </div>
            <div className="overflow-hidden">
              <div className="text-[7px] font-black uppercase tracking-widest opacity-40">Next Move</div>
              <div className="text-base font-bold text-[#f5e6d0] leading-tight truncate">{steps[currentStepIndex]?.instruction || 'Continue on route'}</div>
            </div>
          </div>
        </div>

        {isOffRoute && (
          <div className="absolute top-40 left-8 right-8 z-[1005]">
            <div className="bg-red-600/90 backdrop-blur-md p-3 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.3em] animate-pulse shadow-2xl text-white">
              OFF ROUTE ALERT
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#1a1210] border-t border-amber-900/10 px-8 pt-10 pb-12 space-y-10 relative z-[1020] shadow-3xl">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5 overflow-hidden">
           <div className="h-full bg-[#d4943a] transition-all duration-1000 shadow-[0_0_10px_#d4943a]" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Elapsed Time</span>
            <div className="text-6xl font-display text-white leading-none">
              {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </div>
          </div>
          <div className="text-right space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">{formatDistance(distanceCovered, unitSystem).unit}S EARNED</span>
            <div className="text-6xl font-display text-[#d4943a] leading-none">
              {formatDistance(distanceCovered, unitSystem).value}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
           <div className="glass bg-white/5 p-6 rounded-[2rem] text-center border-amber-900/10 shadow-lg">
             <div className="text-[8px] font-black opacity-30 uppercase tracking-[0.3em] mb-1">Live Pace</div>
             <div className="text-3xl font-display text-[#10b981]">{formatPace((elapsedTime / 60 / (distanceCovered || 1)).toString(), unitSystem)}</div>
           </div>
           <div className="glass bg-white/5 p-6 rounded-[2rem] text-center border-amber-900/10 shadow-lg">
             <div className="text-[8px] font-black opacity-30 uppercase tracking-[0.3em] mb-1">Session Progress</div>
             <div className="text-3xl font-display text-white">{Math.round(progress)}%</div>
           </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setIsPaused(!isPaused)} className={`flex-1 py-7 rounded-3xl font-black uppercase tracking-widest text-xs border transition-all active:scale-95 ${isPaused ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-900/40' : 'bg-white/5 border-white/10 opacity-60 text-white'}`}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={handleStop} className="flex-[1.5] bg-red-600 text-white py-7 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all shadow-red-900/40">Finish Roast</button>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;