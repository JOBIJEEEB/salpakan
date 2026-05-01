export const RANK_TIERS = [
  { name: 'Cadet',           min: 0,    max: 799,      color: '#8E8E93', icon: '—'  },
  { name: 'Private',         min: 800,  max: 1099,     color: '#5AC8FA', icon: '▲'  },
  { name: 'Sergeant',        min: 1100, max: 1399,     color: '#007AFF', icon: '▲▲▲'},
  { name: 'Lieutenant',      min: 1400, max: 1699,     color: '#B0B0B0', icon: '|'  },
  { name: 'Captain',         min: 1700, max: 1999,     color: '#B0B0B0', icon: '||' },
  { name: 'Major',           min: 2000, max: 2299,     color: '#FFD700', icon: '✦'  },
  { name: 'Colonel',         min: 2300, max: 2599,     color: '#C0C0C0', icon: '🦅' },
  { name: 'General',         min: 2600, max: 9999,     color: '#FFD700', icon: '★'  },
  { name: 'Five-Star General', min: 10000, max: Infinity, color: '#FFD700', icon: '★★★★★' },
];

export function getRankTier(cr) {
  return [...RANK_TIERS].reverse().find((t) => cr >= t.min) || RANK_TIERS[0];
}

export function getNextTier(cr) {
  const idx = RANK_TIERS.findIndex((t) => cr >= t.min && cr <= t.max);
  return idx >= 0 && idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null;
}

export function getProgressToNext(cr) {
  const tier = getRankTier(cr);
  if (tier.max === Infinity) return 100;
  return Math.min(100, Math.round(((cr - tier.min) / (tier.max - tier.min + 1)) * 100));
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

export function formatCR(cr) {
  return cr.toLocaleString();
}
