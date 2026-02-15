import React, { useState, useEffect } from 'react';
import { AppTab, Route, RunHistory, UserProfile, ThemeType, UnitSystem } from './types';
import { storageService } from './services/storageService';
import { formatDistance, formatPace } from './services/unitUtils';
import BottomNav from './components/BottomNav';
import RouteDetail from './components/RouteDetail';
import LiveTracking from './components/LiveTracking';
import RouteCreator from './components/RouteCreator';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import ShareModal from './components/ShareModal';
import ReviewModal from './components/ReviewModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('explore');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [runs, setRuns] = useState<RunHistory[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(() => storageService.getProfile());
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [trackingRoute, setTrackingRoute] = useState<Route | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [sharingItem, setSharingItem] = useState<{ item: Route | RunHistory; type: 'route' | 'run' } | null>(null);
  const [pendingReviewRoute, setPendingReviewRoute] = useState<Route | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(profile?.unitSystem || 'imperial');

  useEffect(() => {
    setRoutes(storageService.getRoutes());
    setRuns(storageService.getRuns());
    if (profile) setUnitSystem(profile.unitSystem || 'imperial');
  }, [profile?.id]);

  const handleFinishRun = (run: RunHistory) => {
    setRuns([run, ...runs]);
    const route = routes.find(r => r.id === run.routeId);
    setTrackingRoute(null);
    setActiveTab('runs');
    setProfile(storageService.getProfile());
    if (route) setTimeout(() => setPendingReviewRoute(route), 1000);
  };

  const handleSaveRoute = (route: Route) => {
    storageService.saveRoute(route);
    setRoutes([route, ...routes]);
    setActiveTab('explore');
  };

  const filteredRoutes = routes.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!profile) return <Login onLogin={setProfile} />;
  if (profile && !profile.isSetup) return <Onboarding onComplete={setProfile} />;

  return (
    <div className="h-screen w-full flex flex-col bg-[#05070a] overflow-hidden">
      <header className="px-8 pt-12 pb-8 flex justify-between items-end z-40 bg-gradient-to-b from-[#05070a] to-transparent shrink-0">
        <div className="space-y-0.5">
          <span className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-40">The Coffee Route</span>
          <h1 className="text-3xl font-display font-bold leading-none tracking-tight text-[#3b82f6]">DASHBOARD</h1>
        </div>
        <button onClick={() => setActiveTab('profile')} className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5 shadow-2xl">
          <img src={profile.avatar} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#3b82f6]" alt="User" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pb-40">
        {activeTab === 'explore' && (
          <div className="space-y-10 fade-slide-up">
            <div className="relative">
              <input type="text" placeholder="Search routes..." className="w-full glass bg-white/5 border border-white/5 rounded-3xl py-6 pl-14 pr-6 text-white font-bold placeholder:opacity-20 focus:outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <svg className="h-6 w-6 absolute left-6 top-1/2 -translate-y-1/2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredRoutes.map(route => (
                <div key={route.id} onClick={() => setSelectedRoute(route)} className="group bg-white/5 rounded-[3rem] border border-white/5 overflow-hidden cursor-pointer shadow-2xl transition-all">
                  <div className="h-56 relative">
                    <img src={`https://picsum.photos/seed/${route.id}/800/600`} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt={route.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
                      <h3 className="text-3xl font-bold text-white tracking-tight">{route.name}</h3>
                      <div className="bg-[#3b82f6] px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-black shadow-xl">
                        {formatDistance(route.distance, unitSystem).value} {formatDistance(route.distance, unitSystem).unit}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredRoutes.length === 0 && (
                <div className="text-center py-20 opacity-20 italic">No routes found matching your criteria.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'runs' && (
          <div className="space-y-10 fade-slide-up">
            <h2 className="text-4xl font-display font-bold text-white uppercase">Past Sessions</h2>
            <div className="space-y-6">
              {runs.map(run => (
                <div key={run.id} onClick={() => setSharingItem({ item: run, type: 'run' })} className="bg-white/5 rounded-[2.5rem] p-8 border border-white/5 flex justify-between items-center shadow-2xl cursor-pointer">
                  <div>
                    <h4 className="text-2xl font-bold">{run.routeName}</h4>
                    <p className="text-[10px] opacity-40 uppercase tracking-widest">{new Date(run.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-display text-[#3b82f6]">{formatDistance(run.distance, unitSystem).value} {formatDistance(run.distance, unitSystem).unit}</div>
                    <div className="text-[9px] font-black opacity-30 uppercase">{formatPace(run.averagePace, unitSystem)} Pace</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto space-y-12 fade-slide-up pb-12">
            <div className="text-center space-y-6 py-12">
               <img src={profile.avatar} className="w-48 h-48 rounded-[4rem] object-cover mx-auto ring-4 ring-[#3b82f6]/20 shadow-2xl" alt="Profile" />
               <h2 className="text-5xl font-extrabold uppercase tracking-tight">{profile.username}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-8 rounded-[2.5rem] text-center border border-white/5">
                <div className="text-4xl font-display text-[#3b82f6]">{formatDistance(profile.stats.totalDistance, unitSystem).value}</div>
                <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Total Distance</div>
              </div>
              <div className="bg-white/5 p-8 rounded-[2.5rem] text-center border border-white/5">
                <div className="text-4xl font-display text-[#10b981]">{runs.length}</div>
                <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Sessions</div>
              </div>
            </div>
            <button onClick={() => storageService.logout()} className="w-full py-6 rounded-3xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">Logout</button>
          </div>
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {selectedRoute && (
        <RouteDetail 
          route={selectedRoute} 
          unitSystem={unitSystem}
          onClose={() => setSelectedRoute(null)} 
          onStart={(r) => { setSelectedRoute(null); setTrackingRoute(r); }}
          onEdit={() => {}}
          onToggleFollow={() => {}}
          isFollowingCreator={false}
          currentUserId={profile.id}
          onOpenShare={() => setSharingItem({ item: selectedRoute, type: 'route' })}
        />
      )}

      {trackingRoute && (
        <LiveTracking 
          route={trackingRoute} 
          unitSystem={unitSystem}
          onFinish={handleFinishRun} 
          onCancel={() => setTrackingRoute(null)} 
        />
      )}

      {(activeTab === 'create') && (
        <RouteCreator 
          unitSystem={unitSystem}
          onSave={handleSaveRoute}
          onCancel={() => setActiveTab('explore')}
        />
      )}

      {sharingItem && (
        <ShareModal item={sharingItem.item} type={sharingItem.type} unitSystem={unitSystem} onClose={() => setSharingItem(null)} />
      )}

      {pendingReviewRoute && (
        <ReviewModal route={pendingReviewRoute} profile={profile} onSubmitted={() => setPendingReviewRoute(null)} onSkip={() => setPendingReviewRoute(null)} />
      )}
    </div>
  );
};

export default App;