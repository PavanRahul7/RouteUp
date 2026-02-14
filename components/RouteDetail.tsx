
import React, { useEffect, useRef, useState } from 'react';
import { Route } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

declare var L: any;

interface RouteDetailProps {
  route: Route;
  onClose: () => void;
  onStart: (route: Route) => void;
  onEdit: (route: Route) => void;
}

const RouteDetail: React.FC<RouteDetailProps> = ({ route, onClose, onStart, onEdit }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

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
          attributionControl: false,
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          fadeAnimation: true
        }).setView([route.path[0].lat, route.path[0].lng], 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);

        const poly = L.polyline(route.path, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.8
        }).addTo(mapInstance.current);

        mapInstance.current.fitBounds(poly.getBounds(), { padding: [20, 20] });

        window.setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.invalidateSize();
            setMapReady(true);
          }
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
  }, [route]);

  const elevationData = Array.from({ length: 20 }, (_, i) => ({
    dist: (i * route.distance / 19).toFixed(1),
    elev: Math.random() * route.elevationGain
  }));

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col md:max-w-2xl md:mx-auto animate-in slide-in-from-right duration-300">
      <div className="relative h-72 shrink-0 bg-slate-900">
        <div ref={mapRef} className="w-full h-full" />
        
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-[10]">
             <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 bg-slate-900/80 backdrop-blur p-3 rounded-2xl text-white border border-white/10 shadow-xl z-20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-8 -mt-6 relative z-10">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-3xl font-bold text-white tracking-tight leading-none">{route.name}</h2>
            {route.creatorId === 'user_1' && (
              <button 
                onClick={() => onEdit(route)}
                className="bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl border border-blue-500/20 active:scale-95 transition-all"
              >
                Edit Path
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-lg uppercase font-bold tracking-widest border border-emerald-500/20">
              {route.difficulty}
            </span>
            <span className="text-slate-500 text-xs font-medium">Mapped by {route.creatorName}</span>
          </div>
          <p className="text-slate-400 leading-relaxed italic text-sm border-l-2 border-blue-500/50 pl-5">
            "{route.description}"
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800/50">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Distance</span>
            <div className="text-3xl font-display text-white mt-2">{route.distance} <span className="text-xs text-slate-600">km</span></div>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800/50">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Total Gain</span>
            <div className="text-3xl font-display text-emerald-400 mt-2">{route.elevationGain} <span className="text-xs text-slate-600">m</span></div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-6">Elevation Profile</h3>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={elevationData}>
                <defs>
                  <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="elev" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorElev)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pb-10">
          {route.tags.map(tag => (
            <span key={tag} className="px-4 py-2 bg-slate-900 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-800">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="p-8 bg-slate-950/80 backdrop-blur-2xl border-t border-slate-900">
        <button 
          onClick={() => onStart(route)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-[2rem] shadow-2xl shadow-blue-900/40 flex items-center justify-center gap-3 active:scale-[0.98] font-display tracking-[0.2em] uppercase"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
          Record Run
        </button>
      </div>
    </div>
  );
};

export default RouteDetail;
