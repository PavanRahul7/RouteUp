import React, { useState } from 'react';
import { UserProfile } from '../types';
import { storageService } from '../services/storageService';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const COFFEE_AVATARS = [
  'https://img.freepik.com/free-vector/cute-coffee-cup-running-cartoon-vector-icon-illustration-food-drink-icon-concept-isolated-flat_138676-4318.jpg?w=740', // Running coffee cup
  'https://img.freepik.com/free-vector/cute-coffee-cup-holding-coffee-bean-cartoon-vector-icon-illustration-food-drink-icon-concept-isolated_138676-4444.jpg?w=740', // Coffee mascot with bean
  'https://img.freepik.com/free-vector/hand-drawn-retro-cartoon-coffee-character_23-2150682896.jpg?w=740', // Groovy walking/running cup
  'https://img.freepik.com/free-vector/hand-drawn-retro-cartoon-cup-coffee-illustration_23-2150682894.jpg?w=740', // Smiling mascot
  'https://img.freepik.com/free-vector/hand-drawn-retro-cartoon-coffee-bean-illustration_23-2150682898.jpg?w=740', // Bean character
  'https://img.freepik.com/free-vector/vintage-retro-cartoon-coffee-mascot_23-2150711904.jpg?w=740'  // Coffee cup with attitude
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(COFFEE_AVATARS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    const profile = storageService.getProfile();
    const updatedProfile: UserProfile = {
      ...profile,
      username,
      bio: bio || 'Running from our problems toward caffeine.',
      avatar,
      isSetup: true
    };
    storageService.saveProfile(updatedProfile);
    onComplete(updatedProfile);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[var(--bg-color)] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700 overflow-y-auto">
      <div className="max-w-md w-full space-y-10 my-auto">
        <header className="space-y-4">
          <div className="text-[var(--accent-primary)] font-display text-8xl leading-none animate-pulse">CR</div>
          <h1 className="text-4xl font-display font-black tracking-tight uppercase">Welcome to the Roast</h1>
          <p className="text-sm opacity-60 font-bold uppercase tracking-[0.2em]">Running from our problems toward caffeine</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-40 h-40 rounded-[3rem] overflow-hidden ring-4 ring-[var(--accent-primary)]/20 shadow-2xl rotate-3 transition-transform duration-500 hover:rotate-0 bg-white">
              <img src={avatar} className="w-full h-full object-contain p-2" alt="Profile Preview" />
            </div>
            
            <div className="space-y-3 w-full">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block">Select your roast character</label>
              <div className="grid grid-cols-3 gap-3">
                {COFFEE_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatar(url)}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all bg-white ${
                      avatar === url ? 'border-[var(--accent-primary)] scale-105 shadow-lg shadow-[var(--accent-primary)]/20' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={url} className="w-full h-full object-contain p-1" alt={`Option ${i}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block">Or paste custom URL</label>
              <input 
                value={avatar} 
                onChange={e => setAvatar(e.target.value)}
                placeholder="Paste Avatar URL..." 
                className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-mono text-center focus:outline-none focus:ring-1 ring-[var(--accent-primary)]/40"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-4">Runner Handle</label>
            <input 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. ESPRESSO_CHASER" 
              className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-6 text-2xl font-black text-center text-white focus:outline-none focus:ring-4 ring-[var(--accent-primary)]/20 placeholder:text-white/10 uppercase"
              required
            />
          </div>

          <div className="space-y-2 text-left">
             <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-4">Tasting Notes (Bio)</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)}
              placeholder="Your runner's bio..." 
              className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-6 text-center text-white/60 focus:outline-none"
              rows={2}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-[var(--accent-primary)] text-[var(--bg-color)] font-black py-8 rounded-[2.5rem] shadow-2xl shadow-[var(--accent-primary)]/30 text-2xl tracking-widest uppercase active:scale-95 transition-all"
          >
            START BREWING
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;