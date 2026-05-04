export const RANK_TIERS = [
  { name: 'Mandirigma', min: 0, max: 99, color: '#8E8E93', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=Mandirigma&baseColor=8E8E93' },
  { name: 'Lakan', min: 100, max: 199, color: '#A52A2A', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=Lakan&baseColor=A52A2A' },
  { name: 'Datu', min: 200, max: 299, color: '#FFD700', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=Datu&baseColor=FFD700' },
  { name: 'Maharlika', min: 300, max: 399, color: '#34C759', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=Maharlika&baseColor=34C759' },
  { name: 'Heneral', min: 400, max: 499, color: '#007AFF', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=Heneral&baseColor=007AFF' },
  { name: 'Bayani', min: 500, max: 599, color: '#AF52DE', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=Supremo&baseColor=AF52DE' },
  { name: 'Supremo', min: 600, max: Infinity, color: '#FF3B30', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=Bayani&baseColor=FF3B30' },
];

export function getRankTier(rr) {
  return [...RANK_TIERS].reverse().find((t) => rr >= t.min) || RANK_TIERS[0];
}

export function getNextTier(rr) {
  const currentTier = getRankTier(rr);
  const idx = RANK_TIERS.findIndex(t => t.name === currentTier.name);
  return idx >= 0 && idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null;
}

export function getProgressToNext(rr) {
  const tier = getRankTier(rr);
  if (tier.max === Infinity) return 100;
  // In this system, every rank is 100 RR wide
  const progress = rr % 100;
  return Math.min(100, Math.max(0, progress));
}

/**
 * Valorant-inspired RR System
 * @param {number} rrA - Player RR
 * @param {number} rrB - Opponent RR
 * @param {number} resultA - 1 for win, 0 for loss, 0.5 for draw
 */
export function calculateElo(rrA, rrB, resultA) {
  // Base gains/losses
  const BASE_WIN = 22;
  const BASE_LOSS = 15;
  const BASE_DRAW = 2;

  // Rank difference bonus (max 3 RR adjustment)
  // If opponent is higher rank, you gain more on win, lose less on loss
  const diff = Math.min(5, Math.max(-5, (rrB - rrA) / 50));
  
  let newA = rrA;
  let newB = rrB;

  if (resultA === 1) {
    // WIN: 20 to 25 RR
    const gain = Math.round(BASE_WIN + diff);
    newA = rrA + Math.max(20, Math.min(25, gain));
    newB = Math.max(0, rrB - Math.max(15, Math.min(20, gain - 5)));
  } else if (resultA === 0) {
    // LOSS: 12 to 18 RR
    const loss = Math.round(BASE_LOSS - diff);
    newA = Math.max(0, rrA - Math.max(12, Math.min(18, loss)));
    newB = rrB + Math.max(20, Math.min(25, loss + 5));
  } else {
    // DRAW: Minimal movement
    newA = rrA + Math.round(BASE_DRAW + (diff / 2));
    newB = rrB + Math.round(BASE_DRAW - (diff / 2));
  }

  return { newA: Math.round(newA), newB: Math.round(newB) };
}

export function formatRR(rr) {
  return (rr || 0).toLocaleString();
}

