import { UnitSystem } from '../types';

export const kmToMi = (km: number) => km * 0.621371;
export const mToFt = (m: number) => m * 3.28084;

export const formatDistance = (km: number, system: UnitSystem = 'metric') => {
  if (system === 'imperial') {
    return { value: kmToMi(km).toFixed(2), unit: 'MI' };
  }
  return { value: km.toFixed(2), unit: 'KM' };
};

export const formatElevation = (m: number, system: UnitSystem = 'metric') => {
  if (system === 'imperial') {
    return { value: Math.round(mToFt(m)), unit: 'FT' };
  }
  return { value: Math.round(m), unit: 'M' };
};

export const formatPace = (paceMinKm: string, system: UnitSystem = 'metric') => {
  if (!paceMinKm || paceMinKm === '0:00') return '0:00';
  if (system === 'imperial') {
    const [mins, secs] = paceMinKm.split(':').map(Number);
    const totalSecondsPerKm = mins * 60 + secs;
    const totalSecondsPerMi = totalSecondsPerKm / 0.621371;
    const mMi = Math.floor(totalSecondsPerMi / 60);
    const sMi = Math.round(totalSecondsPerMi % 60);
    return `${mMi}:${sMi.toString().padStart(2, '0')}`;
  }
  return paceMinKm;
};

export const getPaceUnit = (system: UnitSystem = 'metric') => {
  return system === 'imperial' ? 'MIN/MI' : 'MIN/KM';
};