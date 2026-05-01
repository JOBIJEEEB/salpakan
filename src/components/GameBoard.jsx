import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { PIECE_DEFS, buildPieceSet, resolveCombat, getValidMoves,
         HOST_DEPLOY_ROWS, GUEST_DEPLOY_ROWS, ROWS, COLS, QUICK_DEPLOY } from '../lib/gameConstants';

const CELL = 56;
const GAP  = 4;

const PIECE_ICON = {
  FIVE_STAR:'★★★★★', FOUR_STAR:'★★★★', THREE_STAR:'★★★', TWO_STAR:'★★', ONE_STAR:'★',
  COLONEL:'✦✦✦', LT_COL:'✦✦', MAJOR:'✦', CAPTAIN:'▲▲', FIRST_LT:'▲', SECOND_LT:'△',
  SERGEANT:'≡', CORPORAL:'—', PRIVATE:'^', SPY:'◉', FLAG:'⚑',
};

const PIECE_COLOR = (type) =>
  type === 'SPY' ? '#5856D6' : type === 'FLAG' ? '#FF9500' : '#007AFF';

const PRESETS = [{ id: 'recommended', label: 'Recommended Formation', data: QUICK_DEPLOY }];
const COLS_LBL = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));
const ROWS_LBL = Array.from({ length: ROWS }, (_, i) => String(8 - i));

const coord = (r, c) => `${String.fromCharCode(65 + c)}${8 - r}`;

function BoardGrid({ board, playerRole, myDeployRows, phase, selectedCell, validMoves,
                     swapFirst, aiLastMove, lastPlayerMove, deploySelFrom, onCellClick, onCellCtx }) {
  const [hoveredCell, setHoveredCell] = React.useState(null);
  const dispBoard  = playerRole === 'guest' ? [...board].reverse().map(r => [...r].reverse()) : board;
  const dispCols   = playerRole === 'guest' ? [...COLS_LBL].reverse() : COLS_LBL;
  const dispRows   = playerRole === 'guest' ? [...ROWS_LBL].reverse() : ROWS_LBL;

  return (
    <div style={{ display: 'inline-block' }}>
      {/* Col labels top */}
      <div style={{ display: 'flex', marginLeft: 22, gap: GAP, marginBottom: 2 }}>
        {dispCols.map(l => <div key={l} style={{ width: CELL, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#AEAEB2' }}>{l}</div>)}
      </div>
      <div style={{ display: 'flex', gap: GAP }}>
        {/* Row labels left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
          {dispRows.map(l => <div key={l} style={{ width: 18, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#AEAEB2' }}>{l}</div>)}
        </div>
        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gap: GAP }}>
          {dispBoard.map((rowArr, r) => rowArr.map((cell, c) => {
            const ar = playerRole === 'guest' ? ROWS-1-r : r;
            const ac = playerRole === 'guest' ? COLS-1-c : c;
            const isMine    = cell?.owner === playerRole;
            const isEnemy   = cell?.owner && !isMine;
            const isSel     = selectedCell?.[0]===ar && selectedCell?.[1]===ac;
            const isSwapSel = swapFirst?.[0]===ar && swapFirst?.[1]===ac;
            const isValid   = validMoves?.some(([vr,vc]) => vr===ar && vc===ac);
            const isDeploy  = phase==='deployment' && myDeployRows.includes(ar);
            const isLastP   = lastPlayerMove && [lastPlayerMove.from, lastPlayerMove.to].some(([r2,c2]) => r2===ar && c2===ac);
            const isLastAI  = aiLastMove && [aiLastMove.from, aiLastMove.to].some(([r2,c2]) => r2===ar && c2===ac);
            const isDeployHighlight = deploySelFrom?.[0]===ar && deploySelFrom?.[1]===ac;

            let bg = '#F2F2F7';
            if (isDeploy && !cell) bg = 'rgba(0,122,255,0.06)';
            if (isLastP)  bg = 'rgba(59,130,246,0.15)';
            if (isLastAI) bg = 'rgba(251,146,60,0.15)';
            if (isMine)   bg = PIECE_COLOR(cell.type);
            if (isEnemy)  bg = '#FF3B30';
            if (isSel || isSwapSel || isDeployHighlight) bg = 'rgba(0,122,255,0.25)';

            const border = (isSel || isSwapSel || isDeployHighlight) ? '2px solid #007AFF'
                         : isValid && isEnemy ? '2px solid #34C759'
                         : isValid            ? '2px solid rgba(52,199,89,0.5)'
                         : '2px solid transparent';

            const isHovered = hoveredCell?.[0]===ar && hoveredCell?.[1]===ac;
            const canInteract = isMine || isEnemy || isValid || isDeploy;

            return (
              <div key={`${ar}-${ac}`}
                onClick={() => onCellClick(ar, ac)}
                onContextMenu={e => { e.preventDefault(); onCellCtx(ar, ac); }}
                onMouseEnter={() => setHoveredCell([ar, ac])}
                onMouseLeave={() => setHoveredCell(null)}
                style={{ width: CELL, height: CELL, borderRadius: 8, background: bg, border,
                         display: 'flex', flexDirection: 'column', alignItems: 'center',
                         justifyContent: 'center', cursor: canInteract ? 'pointer' : 'default',
                         userSelect: 'none', gap: 1, position: 'relative', zIndex: isHovered ? 2 : 1,
                         transition: 'all 0.15s ease',
                         transform: isHovered && canInteract ? 'scale(1.08)' : 'scale(1)',
                         boxShadow: isHovered && canInteract ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
                }}>
                {isMine && <>
                  <span style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1 }}>{PIECE_ICON[cell.type]}</span>
                  <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.2px', lineHeight: 1 }}>{cell.abbr}</span>
                </>}
                {isEnemy && <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)' }}>?</span>}
                {!cell && isValid && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(52,199,89,0.8)', boxShadow: '0 0 6px rgba(52,199,89,0.5)' }} />}
              </div>
            );
          }))}
        </div>
        {/* Row labels right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
          {dispRows.map(l => <div key={l} style={{ width: 18, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#AEAEB2' }}>{l}</div>)}
        </div>
      </div>
      {/* Col labels bottom */}
      <div style={{ display: 'flex', marginLeft: 22, gap: GAP, marginTop: 2 }}>
        {dispCols.map(l => <div key={l} style={{ width: CELL, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#AEAEB2' }}>{l}</div>)}
      </div>
    </div>
  );
}

export default function GameBoard({
  board, setBoard, phase, setPhase, currentTurn, setCurrentTurn,
  playerRole, battleLog, setBattleLog, winner, setWinner,
  onMove, isAI = false, aiLastMove = null,
}) {
  const [unplaced, setUnplaced]             = useState(() => buildPieceSet(playerRole));
  const [selectedPiece, setSelectedPiece]   = useState(null);
  const [selectedPieceFrom, setSelectedPieceFrom] = useState(null); // [row,col] if from board
  const [selectedCell, setSelectedCell]     = useState(null);
  const [validMoves, setValidMoves]         = useState([]);
  const [lastPlayerMove, setLastPlayerMove] = useState(null);
  const [flagBreakthrough, setFlagBreakthrough] = useState({ host: null, guest: null });
  const [swapMode, setSwapMode]   = useState(false);
  const [swapFirst, setSwapFirst] = useState(null);
  const [preset, setPreset]       = useState('');
  const [customPresets, setCustomPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salpakan_presets') || '[]'); }
    catch { return []; }
  });

  const myDeployRows = playerRole === 'host' ? HOST_DEPLOY_ROWS : GUEST_DEPLOY_ROWS;
  const enemyBackRow = playerRole === 'host' ? 0 : 7;
  const isMyTurn     = currentTurn === playerRole;
  const placedCount  = board.flat().filter(c => c?.owner === playerRole).length;
  const total        = PIECE_DEFS.reduce((s, p) => s + p.count, 0);

  const randomize = () => {
    const next = board.map(r => [...r]);
    const pool = [...unplaced];
    next.forEach((row, r) => row.forEach((cell, c) => { if (cell?.owner === playerRole) { pool.push(cell); next[r][c] = null; } }));
    const slots = myDeployRows.flatMap(r => Array.from({ length: COLS }, (_, c) => [r, c]));
    for (let i = slots.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [slots[i],slots[j]]=[slots[j],slots[i]]; }
    pool.forEach((p, i) => { const [r,c] = slots[i]; next[r][c] = { ...p, owner: playerRole }; });
    setBoard(next); setUnplaced([]);
  };

  const clearBoard = () => {
    const next = board.map(r => [...r]); const removed = [];
    next.forEach((row, r) => row.forEach((cell, c) => { if (cell?.owner === playerRole) { removed.push(cell); next[r][c] = null; } }));
    setBoard(next); setUnplaced(u => [...u, ...removed]); setSwapFirst(null);
  };

  const allPresets = [...PRESETS, ...customPresets];

  const savePreset = () => {
    const name = window.prompt('Name this formation (max 20 chars):');
    if (!name?.trim()) return;
    const positions = [];
    board.forEach((row, r) => row.forEach((cell, c) => {
      if (cell?.owner === playerRole) positions.push({ row: r, col: c, type: cell.type });
    }));
    if (positions.length < total) { window.alert('Deploy all pieces first.'); return; }
    const entry = { id: `custom_${Date.now()}`, label: name.trim().slice(0, 20), positions };
    const updated = [...customPresets, entry].slice(-3);
    setCustomPresets(updated);
    localStorage.setItem('salpakan_presets', JSON.stringify(updated));
  };

  const applyPreset = (id) => {
    const found = allPresets.find(p => p.id === id); if (!found) return;
    const positions = found.data?.positions ?? found.positions;
    const next = board.map(r => r.map(() => null));
    const pieces = buildPieceSet(playerRole); const used = {};
    positions.forEach(({ row: r, col: c, type }) => {
      const ar = playerRole === 'guest' ? 7-r : r;
      const p = pieces.find(p => p.type === type && !used[p.id]);
      if (p) { used[p.id] = true; next[ar][c] = { ...p, owner: playerRole }; }
    });
    setBoard(next); setUnplaced([]);
  };

  const handleDeployClick = (row, col) => {
    const cell = board[row][col];
    if (swapMode) {
      if (!cell || cell.owner !== playerRole) { setSwapFirst(null); return; }
      if (!swapFirst) { setSwapFirst([row, col]); return; }
      const [fr, fc] = swapFirst;
      if (fr === row && fc === col) { setSwapFirst(null); return; }
      const next = board.map(r => [...r]); [next[row][col], next[fr][fc]] = [next[fr][fc], next[row][col]];
      setBoard(next); setSwapFirst(null); return;
    }
    if (!myDeployRows.includes(row)) return;
    if (selectedPiece) {
      if (cell?.id === selectedPiece.id) {
        // Click same piece on board — deselect
        setSelectedPiece(null); setSelectedPieceFrom(null); return;
      }
      const next = board.map(r => [...r]);
      if (selectedPieceFrom) next[selectedPieceFrom[0]][selectedPieceFrom[1]] = null;
      const displaced = cell?.owner === playerRole ? cell : null;
      next[row][col] = { ...selectedPiece, owner: playerRole };
      setBoard(next);
      setUnplaced(u => {
        let updated = u.filter(p => p.id !== selectedPiece.id);
        if (displaced) updated = [...updated, displaced];
        return updated;
      });
      setSelectedPiece(null); setSelectedPieceFrom(null);
    } else if (cell?.owner === playerRole) {
      // Highlight in-place (don't remove from board)
      setSelectedPiece(cell); setSelectedPieceFrom([row, col]);
    }
  };

  const handleDeployCtx = (row, col) => {
    const cell = board[row][col]; if (!cell || cell.owner !== playerRole) return;
    const next = board.map(r => [...r]); next[row][col] = null;
    setBoard(next); setUnplaced(u => [...u, cell]);
  };

  const handleBattleClick = (row, col) => {
    if (!isMyTurn || winner) return;
    const cell = board[row][col];
    if (selectedCell) {
      const [sr, sc] = selectedCell;
      const isValid = validMoves.some(([vr,vc]) => vr===row && vc===col);
      if (isValid) {
        const next = board.map(r => [...r]);
        const mover = next[sr][sc], target = next[row][col]; let log = '';
        let flagCaptured = false;
        if (!target) {
          next[row][col] = mover; next[sr][sc] = null;
          log = `🔵 ${mover.abbr} → ${coord(row,col)}.`;
          if (mover.type === 'FLAG' && row === enemyBackRow) {
            const fb = { ...flagBreakthrough };
            if (!fb[playerRole]) { fb[playerRole] = currentTurn; setFlagBreakthrough(fb); log += ' 🏁'; }
            else { setWinner(playerRole); flagCaptured = true; log += ' FLAG BREAKTHROUGH!'; }
          }
        } else {
          const result = resolveCombat(mover.type, target.type);
          if (result === 'attacker') {
            next[row][col] = mover; next[sr][sc] = null;
            log = `🔵 ${mover.abbr} defeated ${target.abbr} at ${coord(row,col)}.`;
            if (target.type === 'FLAG') { setWinner(playerRole); flagCaptured = true; log = `🔵 ${mover.abbr} captured enemy FLAG! 🚩`; }
          } else if (result === 'defender') {
            next[sr][sc] = null; log = `🔴 ${mover.abbr} lost at ${coord(row,col)}.`;
          } else {
            next[row][col] = null; next[sr][sc] = null; log = `💥 Tie at ${coord(row,col)}.`;
          }
        }
        setLastPlayerMove({ from:[sr,sc], to:[row,col] });
        setBoard(next);
        setBattleLog([...battleLog, log]);
        if (!flagCaptured) setCurrentTurn(currentTurn === 'host' ? 'guest' : 'host');
        setSelectedCell(null); setValidMoves([]); onMove && onMove(next);
      } else {
        if (cell?.owner === playerRole) { setSelectedCell([row,col]); setValidMoves(getValidMoves(board,row,col,playerRole)); }
        else { setSelectedCell(null); setValidMoves([]); }
      }
    } else if (cell?.owner === playerRole) { setSelectedCell([row,col]); setValidMoves(getValidMoves(board,row,col,playerRole)); }
  };

  // ── DEPLOYMENT PHASE ────────────────────────────────────────────────────────
  if (phase === 'deployment') return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
        <div style={{ display:'flex', gap: 6 }}>
          {[['🎲 Randomize', randomize, false], ['✕ Clear', clearBoard, false],
            ['⇄ Swap' + (swapMode ? ' ON' : ''), () => { setSwapMode(v=>!v); setSwapFirst(null); }, swapMode]
           ].map(([label, fn, active]) => (
            <button key={label} onClick={fn} style={{
              background: active ? '#007AFF' : '#F2F2F7', color: active ? '#fff' : '#1D1D1F',
              border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: '0.78rem',
              fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ background: '#F2F2F7', color: '#1D1D1F', borderRadius: 999,
                      padding: '6px 16px', fontSize: '0.78rem', fontWeight: 600 }}>
          RESERVES: {unplaced.length} UNITS
        </div>
      </div>

      {/* Main workspace */}
      <div style={{ display:'flex', gap:'1rem', alignItems:'flex-start' }}>

        {/* Left: Board container */}
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '1rem', flex:'0 0 auto' }}>
          {swapMode && (
            <div style={{ background:'rgba(0,122,255,0.15)', border:'1px solid rgba(0,122,255,0.3)',
                          borderRadius:8, padding:'6px 12px', fontSize:'0.72rem', color:'#5AC8FA', marginBottom:10 }}>
              ⇄ Click two of your pieces to swap positions. Right-click a piece to return it.
            </div>
          )}
          <BoardGrid board={board} playerRole={playerRole} myDeployRows={myDeployRows}
            phase="deployment" selectedCell={null} validMoves={[]} swapFirst={swapFirst}
            aiLastMove={null} lastPlayerMove={null} deploySelFrom={selectedPieceFrom}
            onCellClick={handleDeployClick} onCellCtx={handleDeployCtx} />
          <button
            onClick={() => placedCount >= total && setPhase('battle')}
            disabled={placedCount < total}
            style={{ marginTop: 12, background: placedCount >= total ? '#007AFF' : '#3A3A3C',
                     color: placedCount >= total ? '#fff' : '#636366',
                     border:'none', borderRadius:999, padding:'8px 24px',
                     fontSize:'0.82rem', fontWeight:700, cursor: placedCount >= total ? 'pointer' : 'default',
                     display:'block', marginLeft:'auto', marginRight:'auto' }}>
            {placedCount < total ? `Place ${total - placedCount} more pieces` : 'Confirm Deployment →'}
          </button>
        </div>

        {/* Right: Utility cards */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'0.75rem', minWidth:0 }}>

          {/* Card 1: Available Pieces */}
          <div className="glass-panel p-3">
            <div className="fw-semibold mb-2" style={{ fontSize:'0.82rem' }}>
              Available Pieces ({unplaced.length})
              {selectedPiece && <span style={{ marginLeft:8, fontSize:'0.7rem', color:'var(--system-blue)', fontWeight:400 }}>Selected: {selectedPiece.label}</span>}
            </div>
            {unplaced.length === 0
              ? <div style={{ fontSize:'0.75rem', color:'#86868B' }}>All pieces placed ✓</div>
              : <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {unplaced.map(p => (
                    <div key={p.id} onClick={() => setSelectedPiece(p)} title={p.label}
                      style={{ width:42, height:42, borderRadius:8, display:'flex', flexDirection:'column',
                               alignItems:'center', justifyContent:'center', cursor:'pointer', gap:1,
                               background: selectedPiece?.id===p.id ? '#007AFF' : '#F2F2F7',
                               outline: selectedPiece?.id===p.id ? '2px solid #007AFF' : 'none' }}>
                      <span style={{ fontSize:'0.7rem', color: selectedPiece?.id===p.id ? '#fff' : '#1D1D1F' }}>{PIECE_ICON[p.type]}</span>
                      <span style={{ fontSize:'0.38rem', color: selectedPiece?.id===p.id ? 'rgba(255,255,255,0.8)' : '#86868B', lineHeight:1 }}>{p.abbr}</span>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Card 2: Setup Presets */}
          <div className="glass-panel p-3">
            <div className="fw-semibold mb-2" style={{ fontSize:'0.82rem' }}>Setup Presets</div>
            <div style={{ display:'flex', gap:6 }}>
              <select value={preset}
                onChange={e => { setPreset(e.target.value); if (e.target.value) applyPreset(e.target.value); }}
                className="form-select form-select-sm rounded-3" style={{ fontSize:'0.78rem', flex:1 }}>
                <option value="">— Select Preset —</option>
                {allPresets.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <button className="btn btn-primary btn-sm rounded-pill px-3"
                style={{ fontSize:'0.75rem', whiteSpace:'nowrap' }}
                onClick={savePreset}>
                💾 Save
              </button>
            </div>
          </div>

          {/* Card 3: Piece Legend */}
          <div className="glass-panel p-3">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span className="fw-semibold" style={{ fontSize:'0.82rem' }}>Piece Legend</span>
              <Info size={13} color="#86868B" />
            </div>
            <div style={{ maxHeight:200, overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:'0 3px', fontSize:'0.72rem' }}>
                <thead>
                  <tr>{['Icon','Name','Rank','×'].map(h => <th key={h} style={{ color:'#86868B', fontWeight:500, paddingBottom:4, textAlign: h==='Rank'||h==='×' ? 'right' : 'left' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {PIECE_DEFS.map((p, i) => (
                    <tr key={p.type}>
                      <td><span style={{ fontSize:'0.8rem' }}>{PIECE_ICON[p.type]}</span></td>
                      <td style={{ paddingLeft:6 }}>
                        {p.label}
                        {p.type==='SPY' && <span style={{ marginLeft:4, fontSize:'0.6rem', color:'#FF3B30' }}>Special</span>}
                        {p.type==='PRIVATE' && <span style={{ marginLeft:4, fontSize:'0.6rem', color:'#34C759' }}>Beats Spy</span>}
                        {p.type==='FLAG' && <span style={{ marginLeft:4, fontSize:'0.6rem', color:'#FF9500' }}>Win</span>}
                      </td>
                      <td style={{ textAlign:'right', color:'var(--system-blue)', fontWeight:600 }}>
                        {p.type === 'FLAG' || p.type === 'SPY' ? '—' : i + 1}
                      </td>
                      <td style={{ textAlign:'right', color:'#86868B' }}>×{p.count}</td>
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── BATTLE PHASE ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Turn Pill — fixed height prevents layout shift on turn change */}
      <div style={{ height: 44, display:'flex', alignItems:'center', marginBottom: 10 }}>
        {!winner
          ? <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                          background: isMyTurn ? '#007AFF' : '#FF3B30', color:'#fff',
                          borderRadius:999, padding:'7px 20px', fontWeight:700, fontSize:'0.8rem',
                          letterSpacing:'1px',
                          boxShadow:`0 4px 14px ${isMyTurn ? 'rgba(0,122,255,0.4)' : 'rgba(255,59,48,0.4)'}`,
                          transition:'background 0.3s, box-shadow 0.3s' }}>
              {isMyTurn ? '⚔️  YOUR TURN' : '⏳  ENEMY TURN'}
            </div>
          : <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                          background: winner===playerRole ? '#34C759' : '#FF3B30', color:'#fff',
                          borderRadius:999, padding:'7px 20px', fontWeight:700, fontSize:'0.8rem' }}>
              {winner===playerRole ? '🏆  VICTORY' : '💀  DEFEATED'}
            </div>
        }
      </div>

      {/* Board — no dark wrapper */}
      <div style={{ display:'flex', justifyContent:'center' }}>
        <BoardGrid board={board} playerRole={playerRole} myDeployRows={myDeployRows}
          phase="battle" selectedCell={selectedCell} validMoves={validMoves}
          swapFirst={null} aiLastMove={aiLastMove} lastPlayerMove={lastPlayerMove}
          onCellClick={handleBattleClick} onCellCtx={() => {}} />
      </div>
    </div>
  );
}
