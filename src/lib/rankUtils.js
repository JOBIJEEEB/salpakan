export const RANK_TIERS = [
  { name: 'Novice',          min: 0,    max: 799,      color: '#8E8E93', icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=Novice&backgroundColor=8E8E93' },
  { name: 'Bronze',          min: 800,  max: 1099,     color: '#A52A2A', icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=Bronze&backgroundColor=A52A2A' },
  { name: 'Silver',          min: 1100, max: 1399,     color: '#86868B', icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=Silver&backgroundColor=86868B' },
  { name: 'Gold',            min: 1400, max: 1699,     color: '#FFD700', icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=Gold&backgroundColor=FFD700' },
  { name: 'Platinum',        min: 1700, max: 1999,     color: '#34C759', icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=Platinum&backgroundColor=34C759' },
  { name: 'Diamond',         min: 2000, max: 2299,     color: '#007AFF', icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=Diamond&backgroundColor=007AFF' },
  { name: 'Master',          min: 2300, max: 2599,     color: '#AF52DE', icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=Master&backgroundColor=AF52DE' },
  { name: 'Elite',           min: 2600, max: 9999,     color: '#FF9500', icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=Elite&backgroundColor=FF9500' },
  { name: 'Legend',          min: 10000, max: Infinity, color: '#FF3B30', icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=Legend&backgroundColor=FF3B30' },
];

export function getRankTier(rr) {
  return [...RANK_TIERS].reverse().find((t) => rr >= t.min) || RANK_TIERS[0];
}

export function getNextTier(rr) {
  const idx = RANK_TIERS.findIndex((t) => rr >= t.min && rr <= t.max);
  return idx >= 0 && idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null;
}

export function getProgressToNext(rr) {
  const tier = getRankTier(rr);
  if (tier.max === Infinity) return 100;
  return Math.min(100, Math.round(((rr - tier.min) / (tier.max - tier.min + 1)) * 100));
}

// Standard Elo calculation — returns { newA, newB }
export function calculateElo(ratingA, ratingB, resultA /* 1=win, 0.5=draw, 0=loss */) {
  const kFactor = (r) => (r < 1100 ? 40 : r < 2300 ? 32 : 16);
  const expected = (rA, rB) => 1 / (1 + Math.pow(10, (rB - rA) / 400));
  const eA = expected(ratingA, ratingB);
  const eB = 1 - eA;
  return {
    newA: Math.round(ratingA + kFactor(ratingA) * (resultA - eA)),
    newB: Math.round(ratingB + kFactor(ratingB) * ((1 - resultA) - eB)),
  };
}

export function formatRR(rr) {
  return (rr || 0).toLocaleString();
}
