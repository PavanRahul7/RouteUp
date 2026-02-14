
import React, { useState, useEffect } from 'react';
import { AppTab, Route, RunHistory, UserProfile, Difficulty } from './types';
import { storageService } from './services/storageService';
import BottomNav from './components/BottomNav';
import RouteDetail from './components/RouteDetail';
import LiveTracking from './components/LiveTracking';
import RouteCreator from './components/RouteCreator';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('explore');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [runs, setRuns] = useState<RunHistory[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [trackingRoute, setTrackingRoute] = useState<Route | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setRoutes(storageService.getRoutes());
    setRuns(storageService.getRuns());
    setProfile(storageService.getProfile());
  }, []);

  const handleFinishRun = (run: RunHistory) => {
    setRuns([run, ...runs]);
    setTrackingRoute(null);
    setActiveTab('runs');
    setProfile(storageService.getProfile());
  };

  const handleSaveRoute = (route: Route) => {
    if (editingRoute) {
      storageService.updateRoute(route);
      setRoutes(routes.map(r => r.id === route.id ? route : r));
      setEditingRoute(null);
    } else {
      storageService.saveRoute(route);
      setRoutes([route, ...routes]);
    }
    setActiveTab('explore');
  };

  const handleEditRoute = (route: Route) => {
    setSelectedRoute(null);
    setEditingRoute(route);
  };

  const filteredRoutes = routes.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col pb-16 overflow-hidden">
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-slate-950/80 backdrop-blur-lg sticky top-0 z-40 border-b border-slate-900">
        <h1 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tighter">
          VELOCITY
        </h1>
        {profile && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden xs:block">
              <div className="text-sm font-bold leading-tight">{profile.username}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{profile.stats.totalDistance.toFixed(1)} KM</div>
            </div>
            <img src={profile.avatar} className="w-10 h-10 rounded-full border-2 border-emerald-500/50 p-0.5 shadow-lg shadow-emerald-500/10" alt="Avatar" />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'explore' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="relative group">
              <input 
                type="text"
                placeholder="Find your next path..."
                className="w-full bg-slate-900/50 border border-slate-800/80 rounded-2xl py-4 pl-12 pr-4 text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 focus:bg-slate-900"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <svg className="h-5 w-5 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="grid grid-cols-1 gap-6 pb-20">
              {filteredRoutes.map(route => (
                <div 
                  key={route.id} 
                  onClick={() => setSelectedRoute(route)}
                  className="bg-slate-900/40 rounded-[2rem] overflow-hidden border border-slate-800/50 hover:border-blue-500/30 transition-all cursor-pointer group hover:shadow-2xl hover:shadow-blue-500/5"
                >
                  <div className="h-44 bg-slate-800 relative overflow-hidden">
                    <img 
                      src={`https://picsum.photos/seed/${route.id}/800/600`} 
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" 
                      alt="Route preview" 
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase backdrop-blur-md border ${
                        route.difficulty === Difficulty.HARD ? 'bg-red-500/20 border-red-500/30 text-red-400' : 
                        route.difficulty === Difficulty.MODERATE ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {route.difficulty}
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-display text-blue-400 border border-white/5">
                      {route.distance.toFixed(1)} KM
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-bold mb-1 group-hover:text-blue-400 transition-colors">{route.name}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2 italic mb-4 font-medium leading-relaxed">
                      "{route.description}"
                    </p>
                    <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        {route.creatorName}
                      </span>
                      <div className="flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {route.rating}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'runs' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h2 className="text-2xl font-display font-bold">ACTIVITY LOG</h2>
            {runs.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/30 rounded-[2.5rem] border border-dashed border-slate-800">
                <div className="mb-4 text-slate-500 font-medium">No runs recorded yet.<br/>Time to hit the pavement!</div>
                <button onClick={() => setActiveTab('explore')} className="text-blue-400 font-bold uppercase tracking-widest text-xs hover:text-blue-300 transition-colors">Find a path</button>
              </div>
            ) : (
              runs.map(run => (
                <div key={run.id} className="bg-slate-900/50 rounded-[2rem] p-6 border border-slate-800 flex flex-col gap-4 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg text-white mb-0.5">{run.routeName}</h4>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {new Date(run.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-display text-blue-400">{run.distance.toFixed(1)} <span className="text-xs">km</span></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Duration</span>
                      <span className="font-display text-white text-lg">
                        {Math.floor(run.duration / 60)}:{(run.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Avg Pace</span>
                      <span className="font-display text-emerald-400 text-lg">{run.averagePace} /km</span>
                    </div>
                  </div>

                  {run.coachingTips && (
                    <div className="bg-blue-500/5 border-l-2 border-blue-500 p-4 rounded-r-2xl">
                      <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        COACHING REPORT
                      </div>
                      <p className="text-xs text-slate-300 italic leading-relaxed">{run.coachingTips}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'profile' && profile && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            <div className="text-center">
              <div className="relative inline-block">
                <img src={profile.avatar} className="w-32 h-32 rounded-full border-4 border-slate-900 p-1 mx-auto shadow-2xl" alt="Large Avatar" />
                <div className="absolute bottom-1 right-1 bg-blue-500 p-2.5 rounded-full text-white shadow-xl border-4 border-slate-950">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold mt-6 tracking-tight">{profile.username}</h2>
              <p className="text-slate-500 text-sm mt-2 font-medium">{profile.bio}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/60 p-5 rounded-[2rem] text-center border border-slate-800 shadow-lg">
                <div className="text-2xl font-display text-blue-400 mb-0.5">{profile.stats.totalDistance.toFixed(0)}</div>
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em]">KM TOTAL</div>
              </div>
              <div className="bg-slate-900/60 p-5 rounded-[2rem] text-center border border-slate-800 shadow-lg">
                <div className="text-2xl font-display text-emerald-400 mb-0.5">{profile.stats.totalRuns}</div>
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em]">RUNS</div>
              </div>
              <div className="bg-slate-900/60 p-5 rounded-[2rem] text-center border border-slate-800 shadow-lg">
                <div className="text-2xl font-display text-amber-400 mb-0.5">4:52</div>
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em]">PACE</div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Settings</h3>
              <div className="space-y-2">
                {['Security & Privacy', 'Push Notifications', 'Health Kit Integration', 'Help Center'].map(item => (
                  <button key={item} className="w-full text-left p-5 bg-slate-900/40 rounded-2xl flex justify-between items-center text-slate-300 border border-slate-800/50 hover:bg-slate-900/80 transition-all">
                    <span className="text-sm font-semibold">{item}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button for Creating Route - Shown only on Explore tab */}
      {activeTab === 'explore' && !editingRoute && (
        <button 
          onClick={() => setActiveTab('create')}
          className="fixed right-6 bottom-24 bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-4.5 rounded-3xl shadow-2xl shadow-emerald-500/20 z-40 transition-all active:scale-90 hover:rotate-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Overlays */}
      {selectedRoute && (
        <RouteDetail 
          route={selectedRoute} 
          onClose={() => setSelectedRoute(null)} 
          onStart={(r) => {
            setSelectedRoute(null);
            setTrackingRoute(r);
          }}
          onEdit={handleEditRoute}
        />
      )}

      {trackingRoute && (
        <LiveTracking 
          route={trackingRoute} 
          onFinish={handleFinishRun}
          onCancel={() => setTrackingRoute(null)}
        />
      )}

      {(activeTab === 'create' || editingRoute) && (
        <RouteCreator 
          onSave={handleSaveRoute}
          onCancel={() => {
            setActiveTab('explore');
            setEditingRoute(null);
          }}
          initialRoute={editingRoute || undefined}
        />
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
