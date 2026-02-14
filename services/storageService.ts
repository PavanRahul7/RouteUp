
import { Route, RunHistory, UserProfile, Difficulty } from '../types';

const KEYS = {
  ROUTES: 'velocity_routes',
  RUNS: 'velocity_runs',
  PROFILE: 'velocity_profile',
};

const INITIAL_PROFILE: UserProfile = {
  id: 'user_1',
  username: 'RunnerOne',
  avatar: 'https://picsum.photos/200',
  bio: 'Chasing sunsets and personal bests.',
  stats: {
    totalDistance: 0,
    totalRuns: 0,
    avgPace: '0:00'
  }
};

const INITIAL_ROUTES: Route[] = [
  {
    id: 'r1',
    name: 'Coastal Sprint',
    description: 'A beautiful flat route along the harbor.',
    creatorId: 'user_1',
    creatorName: 'RunnerOne',
    path: [{ lat: 37.7749, lng: -122.4194 }, { lat: 37.7849, lng: -122.4094 }],
    distance: 5.2,
    elevationGain: 12,
    difficulty: Difficulty.EASY,
    tags: ['scenic', 'flat'],
    createdAt: Date.now(),
    rating: 4.5
  },
  {
    id: 'r2',
    name: 'Hill Thriller',
    description: 'Test your lungs on these steep inclines.',
    creatorId: 'user_1',
    creatorName: 'RunnerOne',
    path: [{ lat: 37.7949, lng: -122.4294 }, { lat: 37.8049, lng: -122.4394 }],
    distance: 8.4,
    elevationGain: 245,
    difficulty: Difficulty.HARD,
    tags: ['trail', 'hills'],
    createdAt: Date.now(),
    rating: 4.8
  }
];

export const storageService = {
  getRoutes: (): Route[] => {
    const data = localStorage.getItem(KEYS.ROUTES);
    return data ? JSON.parse(data) : INITIAL_ROUTES;
  },
  saveRoute: (route: Route) => {
    const routes = storageService.getRoutes();
    const updated = [route, ...routes];
    localStorage.setItem(KEYS.ROUTES, JSON.stringify(updated));
  },
  updateRoute: (updatedRoute: Route) => {
    const routes = storageService.getRoutes();
    const updated = routes.map(r => r.id === updatedRoute.id ? updatedRoute : r);
    localStorage.setItem(KEYS.ROUTES, JSON.stringify(updated));
  },
  getRuns: (): RunHistory[] => {
    const data = localStorage.getItem(KEYS.RUNS);
    return data ? JSON.parse(data) : [];
  },
  saveRun: (run: RunHistory) => {
    const runs = storageService.getRuns();
    const updated = [run, ...runs];
    localStorage.setItem(KEYS.RUNS, JSON.stringify(updated));
    
    // Update profile stats
    const profile = storageService.getProfile();
    profile.stats.totalDistance += run.distance;
    profile.stats.totalRuns += 1;
    storageService.saveProfile(profile);
  },
  getProfile: (): UserProfile => {
    const data = localStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : INITIAL_PROFILE;
  },
  saveProfile: (profile: UserProfile) => {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  }
};
