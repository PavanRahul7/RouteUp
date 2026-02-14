
import React, { useState, useEffect, useRef } from 'react';
import { LatLng, Route, Difficulty } from '../types';
import { geminiService } from '../services/geminiService';

// Leaflet is global from script tag
declare var L: any;

interface RouteSegment {
  clickPoint: LatLng;
  pathPoints: LatLng[];
  isWaypoint?: boolean;
}

interface RouteCreatorProps {
  onSave: (route: Route) => void;
  onCancel: () => void;
  initialRoute?: Route;
}

const RouteCreator: React.FC<RouteCreatorProps> = ({ onSave, onCancel, initialRoute }) => {
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const allPoints = segments.reduce((acc, seg) => [...acc, ...seg.pathPoints], [] as LatLng[]);
  
  const [distance, setDistance] = useState(initialRoute?.distance || 0);
  const [name, setName] = useState(initialRoute?.name || '');
  const [description, setDescription] = useState(initialRoute?.description || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialRoute?.difficulty || Difficulty.EASY);
  const [tags, setTags] = useState<string[]>(initialRoute?.tags || []);
  const [tagInput, setTagInput] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Context Menu State (Footpath style)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, latlng: LatLng } | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const waypointMarkersRef = useRef<any[]>([]);

  useEffect(() => {
    let timeout: number;
    
    const initMap = () => {
      if (typeof L === 'undefined') {
        timeout = window.setTimeout(initMap, 100);
        return;
      }

      if (mapRef.current && !mapInstance.current) {
        const center = initialRoute?.path?.[0] || { lat: 37.7749, lng: -122.4194 };
        
        mapInstance.current = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false,
          fadeAnimation: true,
        }).setView([center.lat, center.lng], 15);

        // Footpath uses a very clean tile set, we'll use Carto Voyager/Dark depending on theme
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 20
        }).addTo(mapInstance.current);

        polylineRef.current = L.polyline([], {
          color: '#3b82f6',
          weight: 6,
          opacity: 0.9,
          className: 'route-glow'
        }).addTo(mapInstance.current);

        mapInstance.current.on('click', () => setContextMenu(null));

        mapInstance.current.on('contextmenu', (e: any) => {
          const point = mapInstance.current.latLngToContainerPoint(e.latlng);
          setContextMenu({ x: point.x, y: point.y, latlng: e.latlng });
        });

        // Long press support for mobile
        let pressTimer: any;
        mapInstance.current.on('mousedown touchstart', (e: any) => {
          pressTimer = window.setTimeout(() => {
            const point = mapInstance.current.latLngToContainerPoint(e.latlng);
            setContextMenu({ x: point.x, y: point.y, latlng: e.latlng });
          }, 600);
        });
        mapInstance.current.on('mouseup touchend mousemove touchmove', () => {
          clearTimeout(pressTimer);
        });

        if (initialRoute?.path) {
          const initialSegment: RouteSegment = {
            clickPoint: initialRoute.path[initialRoute.path.length - 1],
            pathPoints: initialRoute.path
          };
          setSegments([initialSegment]);
          polylineRef.current.setLatLngs(initialRoute.path);
          updateMarkers(initialRoute.path, []);
          mapInstance.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
          calculateDistance(initialRoute.path);
        }

        window.setTimeout(() => {
          mapInstance.current.invalidateSize();
          setMapReady(true);
        }, 300);
      }
    };

    initMap();

    return () => {
      clearTimeout(timeout);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const fetchRouteSegment = async (start: LatLng, end: LatLng): Promise<LatLng[]> => {
    try {
      const url = `https://router.project-osrm.org/route/v1/walking/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.code === 'Ok') {
        return data.routes[0].geometry.coordinates.map((coord: any) => ({
          lat: coord[1],
          lng: coord[0]
        }));
      }
    } catch (err) {
      console.error('Routing error:', err);
    }
    return [end];
  };

  const handleAddPoint = async (latlng: LatLng, isWaypoint: boolean = false) => {
    setContextMenu(null);
    const newClickPoint = { lat: latlng.lat, lng: latlng.lng };
    
    if (segments.length > 0) {
      setIsSnapping(true);
      const lastSegment = segments[segments.length - 1];
      const lastPoint = lastSegment.pathPoints[lastSegment.pathPoints.length - 1];
      
      const snappedPoints = await fetchRouteSegment(lastPoint, newClickPoint);
      
      const newSegment: RouteSegment = {
        clickPoint: newClickPoint,
        pathPoints: snappedPoints,
        isWaypoint
      };

      setSegments(prev => {
        const next = [...prev, newSegment];
        const flatPoints = next.reduce((acc, seg) => [...acc, ...seg.pathPoints], [] as LatLng[]);
        const waypoints = next.filter(s => s.isWaypoint).map(s => s.clickPoint);
        polylineRef.current.setLatLngs(flatPoints);
        updateMarkers(flatPoints, waypoints);
        calculateDistance(flatPoints);
        return next;
      });
      setIsSnapping(false);
    } else {
      const firstSegment: RouteSegment = {
        clickPoint: newClickPoint,
        pathPoints: [newClickPoint],
        isWaypoint: true
      };
      setSegments([firstSegment]);
      polylineRef.current.setLatLngs([newClickPoint]);
      updateMarkers([newClickPoint], [newClickPoint]);
      calculateDistance([newClickPoint]);
    }
  };

  const updateMarkers = (currentPath: LatLng[], waypoints: LatLng[]) => {
    if (!mapInstance.current || typeof L === 'undefined') return;

    waypointMarkersRef.current.forEach(m => m.remove());
    waypointMarkersRef.current = [];

    const startIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const waypointIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #fff; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    });

    const endIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    if (currentPath.length > 0) {
      if (!startMarkerRef.current) {
        startMarkerRef.current = L.marker([currentPath[0].lat, currentPath[0].lng], { icon: startIcon, zIndexOffset: 1000 }).addTo(mapInstance.current);
      } else {
        startMarkerRef.current.setLatLng([currentPath[0].lat, currentPath[0].lng]);
      }

      waypoints.forEach((wp, idx) => {
        if (idx === 0) return; // Skip start
        if (idx === waypoints.length - 1 && currentPath.length > 1) return; // Skip end
        const marker = L.marker([wp.lat, wp.lng], { icon: waypointIcon }).addTo(mapInstance.current);
        waypointMarkersRef.current.push(marker);
      });

      if (currentPath.length > 1) {
        if (!endMarkerRef.current) {
          endMarkerRef.current = L.marker([currentPath[currentPath.length - 1].lat, currentPath[currentPath.length - 1].lng], { icon: endIcon, zIndexOffset: 1001 }).addTo(mapInstance.current);
        } else {
          endMarkerRef.current.setLatLng([currentPath[currentPath.length - 1].lat, currentPath[currentPath.length - 1].lng]);
        }
      }
    }
  };

  const calculateDistance = (p: LatLng[]) => {
    if (p.length < 2) {
      setDistance(0);
      return;
    }
    let total = 0;
    for (let i = 0; i < p.length - 1; i++) {
      const p1 = L.latLng(p[i].lat, p[i].lng);
      const p2 = L.latLng(p[i + 1].lat, p[i + 1].lng);
      total += p1.distanceTo(p2);
    }
    setDistance(total / 1000);
  };

  const handleLoop = async () => {
    if (segments.length < 2) return;
    handleAddPoint(segments[0].pathPoints[0], true);
  };

  const handleClear = () => {
    setSegments([]);
    setDistance(0);
    polylineRef.current.setLatLngs([]);
    if (startMarkerRef.current) startMarkerRef.current.remove();
    if (endMarkerRef.current) endMarkerRef.current.remove();
    waypointMarkersRef.current.forEach(m => m.remove());
    startMarkerRef.current = null;
    endMarkerRef.current = null;
    waypointMarkersRef.current = [];
  };

  // Fix: Added handleUndo function to revert the last added segment from the route
  const handleUndo = () => {
    if (segments.length === 0) return;
    setSegments(prev => {
      const next = prev.slice(0, -1);
      const flatPoints = next.reduce((acc, seg) => [...acc, ...seg.pathPoints], [] as LatLng[]);
      const waypoints = next.filter(s => s.isWaypoint).map(s => s.clickPoint);
      if (polylineRef.current) polylineRef.current.setLatLngs(flatPoints);
      updateMarkers(flatPoints, waypoints);
      calculateDistance(flatPoints);
      return next;
    });
  };

  // Fix: Added handleSave function to submit the route and generate an AI description if missing
  const handleSave = async () => {
    if (!name || distance === 0) return;
    setIsSaving(true);
    let finalDescription = description;
    if (!finalDescription) {
      const elevation = Math.round(distance * 15);
      finalDescription = await geminiService.generateRouteDescription(name, parseFloat(distance.toFixed(1)), elevation, tags);
    }
    const newRoute: Route = {
      id: initialRoute?.id || Math.random().toString(36).substr(2, 9),
      name,
      description: finalDescription,
      creatorId: 'user_1',
      creatorName: 'RunnerOne',
      path: allPoints,
      distance: parseFloat(distance.toFixed(2)),
      elevationGain: Math.round(distance * 15),
      difficulty,
      tags,
      createdAt: initialRoute?.createdAt || Date.now(),
      rating: initialRoute?.rating || 4.5
    };
    onSave(newRoute);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col overflow-hidden animate-in fade-in">
      <div className="relative flex-1 bg-slate-900">
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Footpath Style Context Menu */}
        {contextMenu && (
          <div 
            className="absolute z-[2000] bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 py-1"
            style={{ 
              left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`, 
              top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px`,
              minWidth: '200px'
            }}
          >
            <button 
              onClick={() => handleAddPoint(contextMenu.latlng)}
              className="w-full text-left px-5 py-3.5 text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100"
            >
              Route to here
            </button>
            <button 
              onClick={() => handleAddPoint(contextMenu.latlng, true)}
              className="w-full text-left px-5 py-3.5 text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100"
            >
              Add waypoint
            </button>
            <button className="w-full text-left px-5 py-3.5 text-slate-400 text-sm font-medium flex items-center justify-between gap-3 group">
              <span className="flex items-center gap-3">Save to favorites</span>
              <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Elite</span>
            </button>
          </div>
        )}

        {/* HUD Overlay - Top Left */}
        <div className="absolute top-6 left-6 z-[1000] flex gap-3 items-center">
          <button onClick={onCancel} className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl text-white shadow-2xl border border-slate-700/50 active:scale-95 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-700/50 shadow-2xl min-w-[200px]">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest font-display block mb-1">ROUTING</span>
            <input 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Adventure Name..."
              className="bg-transparent text-white font-bold text-lg focus:outline-none w-full placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Toolbelt - Right Side */}
        <div className="absolute top-24 right-6 flex flex-col gap-3 z-[1000]">
           <button 
            onClick={handleLoop}
            disabled={segments.length < 2}
            className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl text-blue-400 shadow-2xl border border-slate-700/50 disabled:opacity-20 active:scale-95 transition-all"
            title="Loop"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
           <button 
            onClick={() => handleUndo()}
            disabled={segments.length === 0}
            className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl text-white shadow-2xl border border-slate-700/50 disabled:opacity-20 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button 
            onClick={handleClear}
            className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl text-red-400 shadow-2xl border border-slate-700/50 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Summary Bottom Bar */}
        <div className="absolute bottom-6 left-6 right-6 z-[1000] bg-slate-900/95 backdrop-blur-xl p-8 rounded-[3rem] border border-slate-800 shadow-2xl">
          <div className="flex justify-between items-center">
            <div className="flex gap-10">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest font-display">Distance</span>
                <div className="text-4xl font-display text-white mt-1">{distance.toFixed(2)} <span className="text-base text-slate-600">km</span></div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest font-display">Elevation</span>
                <div className="text-4xl font-display text-emerald-400 mt-1">+{Math.round(distance * 15)} <span className="text-base text-slate-600">m</span></div>
              </div>
            </div>
            <button 
              disabled={distance === 0 || !name || isSaving}
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 px-10 rounded-2xl shadow-xl shadow-blue-900/40 transition-all flex items-center gap-3 active:scale-[0.98] font-display uppercase tracking-widest"
            >
              {isSaving ? 'Saving...' : 'Save Route'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteCreator;
