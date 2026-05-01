// All piece definitions — rank is the numeric power used in combat resolution
export const PIECE_DEFS = [
  { type: 'FIVE_STAR',  label: '5★ General',    abbr: '5★',  rank: 15, count: 1 },
  { type: 'FOUR_STAR',  label: '4★ General',    abbr: '4★',  rank: 14, count: 1 },
  { type: 'THREE_STAR', label: '3★ General',    abbr: '3★',  rank: 13, count: 1 },
  { type: 'TWO_STAR',   label: '2★ General',    abbr: '2★',  rank: 12, count: 1 },
  { type: 'ONE_STAR',   label: '1★ General',    abbr: '1★',  rank: 11, count: 1 },
  { type: 'COLONEL',    label: 'Colonel',        abbr: 'COL', rank: 10, count: 1 },
  { type: 'LT_COL',     label: 'Lt. Colonel',   abbr: 'LTC', rank: 9,  count: 1 },
  { type: 'MAJOR',      label: 'Major',          abbr: 'MAJ', rank: 8,  count: 1 },
  { type: 'CAPTAIN',    label: 'Captain',        abbr: 'CPT', rank: 7,  count: 1 },
  { type: 'FIRST_LT',   label: '1st Lieutenant', abbr: '1LT', rank: 6,  count: 1 },
  { type: 'SECOND_LT',  label: '2nd Lieutenant', abbr: '2LT', rank: 5,  count: 1 },
  { type: 'SERGEANT',   label: 'Sergeant',       abbr: 'SGT', rank: 4,  count: 1 },
  { type: 'CORPORAL',   label: 'Corporal',       abbr: 'CPL', rank: 3,  count: 1 },
  { type: 'PRIVATE',    label: 'Private',        abbr: 'PVT', rank: 2,  count: 6 },
  { type: 'SPY',        label: 'Spy',            abbr: 'SPY', rank: 1,  count: 2 },
  { type: 'FLAG',       label: 'Flag',           abbr: 'FLG', rank: 0,  count: 1 },
];

export const ROWS = 8;
export const COLS = 9;
export const HOST_DEPLOY_ROWS = [5, 6, 7];
export const GUEST_DEPLOY_ROWS = [0, 1, 2];

// Build the initial unplaced piece inventory for a player
export function buildPieceSet(owner) {
  return PIECE_DEFS.flatMap((def) =>
    Array.from({ length: def.count }, (_, i) => ({
      id: `${owner}_${def.type}_${i}`,
      type: def.type,
      label: def.label,
      abbr: def.abbr,
      rank: def.rank,
      owner,
    }))
  );
}

// Returns 'attacker' | 'defender' | 'tie'
export function resolveCombat(attackerType, defenderType) {
  if (attackerType === 'SPY') {
    if (defenderType === 'PRIVATE') return 'defender';
    return 'attacker'; // Spy beats all officers + Flag
  }
  if (defenderType === 'SPY') {
    if (attackerType === 'PRIVATE') return 'attacker';
    return 'defender';
  }
  if (attackerType === 'FLAG') return 'defender';
  if (defenderType === 'FLAG') return 'attacker';

  const aDef = PIECE_DEFS.find((p) => p.type === attackerType);
  const dDef = PIECE_DEFS.find((p) => p.type === defenderType);
  if (aDef.rank > dDef.rank) return 'attacker';
  if (dDef.rank > aDef.rank) return 'defender';
  return 'tie';
}

// Get all valid destination squares for a piece at (row, col)
export function getValidMoves(board, row, col, ownerRole) {
  return [[-1,0],[1,0],[0,-1],[0,1]].reduce((acc, [dr, dc]) => {
    const nr = row + dr, nc = col + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return acc;
    const cell = board[nr][nc];
    if (!cell || cell.owner !== ownerRole) acc.push([nr, nc]);
    return acc;
  }, []);
}

// Quick-deploy preset formations (host perspective — rows 5,6,7)
export const QUICK_DEPLOY = {
  label: 'Recommended Formation',
  positions: [
    // Row 5 (front line — Private wall + Spies on flanks)
    { row:5, col:0, type:'PRIVATE'   }, { row:5, col:1, type:'SPY'      },
    { row:5, col:2, type:'PRIVATE'   }, { row:5, col:3, type:'PRIVATE'  },
    { row:5, col:4, type:'SERGEANT'  }, { row:5, col:5, type:'PRIVATE'  },
    { row:5, col:6, type:'PRIVATE'   }, { row:5, col:7, type:'SPY'      },
    { row:5, col:8, type:'PRIVATE'   },
    // Row 6 (mid — colonels and generals)
    { row:6, col:0, type:'CORPORAL'  }, { row:6, col:1, type:'LT_COL'   },
    { row:6, col:2, type:'COLONEL'   }, { row:6, col:3, type:'ONE_STAR' },
    { row:6, col:4, type:'TWO_STAR'  }, { row:6, col:5, type:'ONE_STAR' },
    { row:6, col:6, type:'COLONEL'   }, { row:6, col:7, type:'LT_COL'   },
    { row:6, col:8, type:'CORPORAL'  },
    // Row 7 (back — high generals + Flag in center)
    { row:7, col:0, type:'CAPTAIN'   }, { row:7, col:1, type:'MAJOR'    },
    { row:7, col:2, type:'THREE_STAR'}, { row:7, col:3, type:'FOUR_STAR'},
    { row:7, col:4, type:'FLAG'      }, { row:7, col:5, type:'FIVE_STAR'},
    { row:7, col:6, type:'THREE_STAR'}, { row:7, col:7, type:'FIRST_LT' },
    { row:7, col:8, type:'SECOND_LT' },
  ],
};
