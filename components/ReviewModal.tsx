import React, { useState } from 'react';
import { Review, Route, UserProfile } from '../types';
import { storageService } from '../services/storageService';

interface ReviewModalProps {
  route: Route;
  profile: UserProfile;
  onSubmitted: (review: Review) => void;
  onSkip: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ route, profile, onSubmitted, onSkip }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const review: Review = {
      id: Math.random().toString(36).substr(2, 9),
      routeId: route.id,
      userId: profile.id,
      username: profile.username,
      rating,
      comment: comment || "Great roast! Highly recommended path.",
      createdAt: Date.now()
    };

    storageService.saveReview(review);
    setTimeout(() => onSubmitted(review), 400);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-8">
      <div className="w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[3.5rem] p-10 space-y-10 card-shadow animate-in zoom-in-95 duration-300">
        <header className="text-center space-y-4">
          <div className="w-20 h-20 bg-amber-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <h2 className="text-4xl font-display font-black tracking-tight text-white uppercase">Rate your roast</h2>
          <p className="text-sm opacity-40 font-bold uppercase tracking-widest leading-relaxed">How was the vibe at <span className="text-[var(--accent-primary)]">{route.name}</span>?</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="flex justify-center gap-4">
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setRating(num)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  num <= rating ? 'bg-amber-400 text-black scale-110' : 'bg-white/5 text-white/20 hover:bg-white/10'
                }`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-2 text-center">Tasting Notes</label>
             <textarea
               value={comment}
               onChange={e => setComment(e.target.value)}
               placeholder="Tell us about the path..."
               className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-6 text-lg font-medium text-white focus:outline-none focus:ring-2 ring-amber-400/40 transition-all placeholder:text-white/10"
               rows={3}
             />
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-400 text-black font-black py-8 rounded-[2.5rem] shadow-2xl shadow-amber-400/20 text-xl tracking-[0.2em] uppercase active:scale-95 transition-all"
            >
              {isSubmitting ? 'BREWING...' : 'SUBMIT REVIEW'}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="w-full py-4 text-[10px] font-black uppercase tracking-[0.4em] opacity-20 hover:opacity-100 transition-opacity"
            >
              Skip this step
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;