import React, { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { PIECE_DEFS, buildPieceSet, resolveCombat, getValidMoves,
         HOST_DEPLOY_ROWS, GUEST_DEPLOY_ROWS, ROWS, COLS, QUICK_DEPLOY } from '../lib/gameConstants';

const GAP  = 4;

const PIECE_ICON = {
  FIVE_STAR:'★★★★★', FOUR_STAR:'★★★★', THREE_STAR:'★★★', TWO_STAR:'★★', ONE_STAR:'★',
  COLONEL:'✦✦✦', LT_COL:'✦✦', MAJOR:'✦', CAPTAIN:'▲▲', FIRST_LT:'▲', SECOND_LT:'△',
  SERGEANT:'≡', CORPORAL:'—', PRIVATE:'^', SPY:'◉', FLAG:'⚑',
};

// ── Graveyard: shows ONLY the user's own captured pieces ─────────────────────
function MyGraveyard({ board, playerRole }) {
  const allPieces = buildPieceSet(playerRole);
  const aliveIds  = new Set(board.flat().filter(c => c?.owner === playerRole).map(c => c.id));
  const captured  = allPieces.filter(p => !aliveIds.has(p.id));

  return (
    <div className="glass-panel p-3" style={{ minWidth: 140, flex: 1 }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px',
                       fontWeight: 700, color: '#FF3B30' }}>
          Captured Pieces
        </span>
        <span style={{ float: 'right', fontSize: '0.68rem', color: '#86868B' }}>
          {captured.length} captured
        </span>
      </div>
      {captured.length === 0 ? (
        <div style={{ fontSize: '0.72rem', color: '#86868B', textAlign: 'center', padding: '12px 0' }}>
          No losses yet
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {captured.map(p => (
            <div key={p.id} title={p.label} style={{
              aspectRatio: '1', borderRadius: 6, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 1,
              background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)',
            }}>
              <span style={{ fontSize: '0.75rem', color: '#FF3B30', lineHeight: 1 }}>{PIECE_ICON[p.type]}</span>
              <span style={{ fontSize: '0.35rem', color: '#86868B', lineHeight: 1 }}>{p.abbr}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Light-mode Battle Log (terminal aesthetic, light background) ──────────────
function TerminalLog({ log }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  // Display at least the last 15 entries for better history visibility
  const displayLog = log || [];

  return (
    <div style={{
      background: '#F9F9FB', borderRadius: 10, padding: '10px 14px',
      fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: '0.72rem',
      lineHeight: 1.6, minHeight: 200, maxHeight: 300, overflowY: 'auto',
      border: '1px solid rgba(0,0,0,0.08)', flex: '1 1 200px', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 6, paddingBottom: 6,
                    borderBottom: '1px solid rgba(0,0,0,0.07)', alignItems: 'center' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F57', display: 'inline-block' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FEBC2E', display: 'inline-block' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28C840', display: 'inline-block' }} />
        <span style={{ marginLeft: 8, color: '#AEAEB2', fontSize: '0.6rem', fontFamily: 'sans-serif',
                       textTransform: 'uppercase', letterSpacing: '1px' }}>game.log</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {displayLog.length === 0 ? (
          <span style={{ color: '#AEAEB2' }}>// awaiting first contact...</span>
        ) : (
          displayLog.map((entry, i) => {
            const color = entry.startsWith('HOST:') ? '#056d94'
                        : entry.startsWith('GUEST:') ? '#FF3B30'
                        : '#1D1D1F';
            return (
              <div key={i} style={{ marginBottom: 4, color }}>
                <span style={{ opacity: 0.5, marginRight: 6 }}>&gt;</span>
                {entry.replace(/^(HOST:|GUEST:)\s*/, '')}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function PieceLegend() {
  return (
    <div className="glass-panel p-2" style={{ minWidth: 130, maxWidth: 145, flexShrink: 0 }}>
      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px',
                    fontWeight: 700, color: '#86868B', marginBottom: 6 }}>
        Power Hierarchy
      </div>
      <table style={{ width: '100%', fontSize: '0.62rem', borderCollapse: 'separate', borderSpacing: '0 2px' }}>
        <tbody>
          {PIECE_DEFS.map((p, i) => (
            <tr key={p.type}>
              <td style={{ color: '#AEAEB2', width: 16, fontWeight: 600 }}>
                {p.type === 'FLAG' || p.type === 'SPY' ? '—' : i + 1}
              </td>
              <td style={{ color: '#1D1D1F' }}>{p.label}</td>
              <td style={{ textAlign: 'right', color: '#86868B' }}>×{p.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: '0.58rem', color: '#86868B',
                    background: 'rgba(0,0,0,0.04)', borderRadius: 6, padding: '5px 6px', lineHeight: 1.5 }}>
        <b>Spy</b> beats all ranks<br />
        <b>Private</b> beats Spy<br />
        <b>Flag</b> = objective
      </div>
    </div>
  );
}


const PIECE_COLOR = (type) =>
  type === 'SPY' ? '#5856D6' : type === 'FLAG' ? '#FF9500' : '#056d94';

const PRESETS = [{ id: 'recommended', label: 'Pro Setup', data: QUICK_DEPLOY }];
const COLS_LBL = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));
const ROWS_LBL = Array.from({ length: ROWS }, (_, i) => String(8 - i));

const coord = (r, c) => `${String.fromCharCode(65 + c)}${8 - r}`;

function BoardGrid({ board, playerRole, myDeployRows, phase, selectedCell, validMoves,
                     swapFirst, aiLastMove, lastPlayerMove, deploySelFrom, onCellClick, onCellCtx, cellSize }) {
  const CELL = cellSize;
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
            if (isLastP)  bg = 'rgba(5, 109, 148, 0.1)';
            if (isLastAI) bg = 'rgba(255, 59, 48, 0.1)';
            if (isMine)   bg = PIECE_COLOR(cell.type);
            if (isEnemy)  bg = '#FF3B30';
            
            // Only apply selection background if the cell is EMPTY. Otherwise, use border/box-shadow.
            if (!cell && (isSel || isSwapSel || isDeployHighlight)) {
              bg = 'rgba(0,122,255,0.15)';
            }

            const border = (isSel || isSwapSel || isDeployHighlight) ? '3px solid #007AFF'
                         : isValid && isEnemy ? '3px solid #34C759'
                         : isValid            ? '3px solid rgba(52,199,89,0.5)'
                         : '3px solid transparent';

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
  board, setBoard, phase, setPhase,
  currentTurn, setCurrentTurn,
  playerRole, onMove,
  battleLog, setBattleLog,
  winner, setWinner,
  onTimeout,
  isAI = false, aiLastMove = null,
  gameMode = 'Normal',
  turnStartAt
}) {
  const [unplaced, setUnplaced]             = useState(() => buildPieceSet(playerRole));
  const [selectedPiece, setSelectedPiece]   = useState(null);
  const [selectedPieceFrom, setSelectedPieceFrom] = useState(null);
  const [selectedCell, setSelectedCell]     = useState(null);
  const [validMoves, setValidMoves]         = useState([]);
  const [lastPlayerMove, setLastPlayerMove] = useState(null);
  const [flagBreakthrough, setFlagBreakthrough] = useState({ host: null, guest: null });
  const [swapMode, setSwapMode]   = useState(false);
  const [swapFirst, setSwapFirst] = useState(null);
  const [preset, setPreset]       = useState('');
  const [cellSize, setCellSize]   = useState(64);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 500) setCellSize(38);
      else if (w < 768) setCellSize(48);
      else if (w < 1200) setCellSize(64);
      else if (w < 1500) setCellSize(72);
      else setCellSize(84);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [customPresets, setCustomPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salpakan_presets') || '[]'); }
    catch { return []; }
  });

  const getDuration = (mode) => {
    if (mode === 'Blitz') return 30;
    if (mode === 'Competitive') return 120;
    return 60;
  };

  const [timeLeft, setTimeLeft] = useState(getDuration(gameMode));

  // ── Sync Timer with Server Timestamp ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'battle' || winner) return;

    const interval = setInterval(() => {
      const duration = getDuration(gameMode);
      if (!turnStartAt) {
        setTimeLeft(duration);
        return;
      }

      const start = new Date(turnStartAt).getTime();
      const now   = new Date().getTime();
      const elapsed = Math.floor((now - start) / 1000);
      const remaining = Math.max(0, duration - elapsed);

      setTimeLeft(remaining);

      // Only trigger timeout if it's MY turn (to avoid double skip)
      if (remaining <= 0 && (currentTurn === playerRole || isAI)) {
        clearInterval(interval);
        const nextT = currentTurn === 'host' ? 'guest' : 'host';
        setCurrentTurn(nextT);
        const msg = `${currentTurn.toUpperCase()} timed out!`;
        setBattleLog(prevLog => [...prevLog, msg]);
        if (onTimeout) onTimeout(nextT, msg);
      }
    }, 500); // Check every 500ms for responsiveness

    return () => clearInterval(interval);
  }, [turnStartAt, phase, winner, currentTurn, playerRole, isAI, gameMode]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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

  const savePreset = async () => {
    const { value: name } = await Swal.fire({
      title: 'Save Formation',
      input: 'text',
      inputLabel: 'Give this tactical setup a name:',
      inputPlaceholder: 'e.g., Blitz Defense',
      showCancelButton: true,
      confirmButtonText: 'Save Setup',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#056d94',
      cancelButtonColor: '#86868B',
      inputAttributes: { maxlength: 20 },
      customClass: {
        popup: 'apple-swal',
        title: 'apple-swal-title',
        confirmButton: 'apple-swal-confirm',
        cancelButton: 'apple-swal-cancel',
        input: 'apple-input text-center'
      },
      inputValidator: (value) => {
        if (!value || !value.trim()) return 'Please enter a name!';
      }
    });

    if (!name) return;

    const positions = [];
    board.forEach((row, r) => row.forEach((cell, c) => {
      if (cell?.owner === playerRole) positions.push({ row: r, col: c, type: cell.type });
    }));

    if (positions.length < total) {
      Swal.fire({
        title: 'Incomplete Formation',
        text: 'Deploy all units on the board before saving.',
        icon: 'error',
        confirmButtonColor: '#056d94',
        customClass: { popup: 'apple-swal', title: 'apple-swal-title', confirmButton: 'apple-swal-confirm' }
      });
      return;
    }

    const entry = { id: `custom_${Date.now()}`, label: name.trim(), positions };
    const updated = [...customPresets, entry].slice(-3);
    setCustomPresets(updated);
    localStorage.setItem('salpakan_presets', JSON.stringify(updated));
    
    Swal.fire({
      title: 'Formation Saved',
      text: `"${name}" is now available in your presets.`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
      customClass: { popup: 'apple-swal', title: 'apple-swal-title' }
    });
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
          log = `HOST: Movement to ${coord(row,col)}.`;
          if (mover.type === 'FLAG' && row === enemyBackRow) {
            const fb = { ...flagBreakthrough };
            if (!fb[playerRole]) { fb[playerRole] = currentTurn; setFlagBreakthrough(fb); log += ' 🏁'; }
            else { 
              if (!onMove) setWinner(playerRole); 
              flagCaptured = true; 
              log += ' FLAG BREAKTHROUGH!'; 
            }
          }
        } else {
          const result = resolveCombat(mover.type, target.type);
          if (result === 'attacker') {
            next[row][col] = mover; next[sr][sc] = null;
            log = `HOST: Attack at ${coord(row,col)} successful.`;
            if (target.type === 'FLAG') { 
              if (!onMove) setWinner(playerRole); 
              flagCaptured = true; 
              log += ' (FLAG CAPTURED!)'; 
            }
          } else if (result === 'defender') {
            next[sr][sc] = null; log = `GUEST: Attack at ${coord(row,col)} failed.`;
            if (mover.type === 'FLAG') { 
              const w = playerRole === 'host' ? 'guest' : 'host';
              if (!onMove) setWinner(w); 
              flagCaptured = true; 
              log += ' (FLAG LOST!)'; 
            }
          } else {
            next[row][col] = null; next[sr][sc] = null; log = `TIE: Both pieces eliminated at ${coord(row,col)}.`;
            if (mover.type === 'FLAG' || target.type === 'FLAG') { 
              if (!onMove) setWinner('tie'); 
              flagCaptured = true; 
            }
          }
        }
        setLastPlayerMove({ from:[sr,sc], to:[row,col] });
        setBoard(next);
        const updatedLog = [...battleLog, log];
        setBattleLog(updatedLog);
        if (!flagCaptured) setCurrentTurn(currentTurn === 'host' ? 'guest' : 'host');
        setSelectedCell(null); setValidMoves([]); onMove && onMove(next, flagCaptured, updatedLog);
      } else {
        if (cell?.owner === playerRole) { setSelectedCell([row,col]); setValidMoves(getValidMoves(board,row,col,playerRole)); }
        else { setSelectedCell(null); setValidMoves([]); }
      }
    } else if (cell?.owner === playerRole) { setSelectedCell([row,col]); setValidMoves(getValidMoves(board,row,col,playerRole)); }
  };

  // ── DEPLOYMENT PHASE ────────────────────────────────────────────────────────
  if (phase === 'deployment') return (
    <div className="container-fluid px-0" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', gap: 12, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', gap: 6 }}>
            {[['Randomize', randomize, false], ['✕ Clear', clearBoard, false],
              ['⇄ Swap' + (swapMode ? ' ON' : ''), () => { setSwapMode(v=>!v); setSwapFirst(null); }, swapMode]
             ].map(([label, fn, active]) => (
              <button key={label} onClick={fn} style={{
                background: active ? '#007AFF' : '#fff', color: active ? '#fff' : '#1D1D1F',
                border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '8px 14px', fontSize: '0.8rem',
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: active ? '0 4px 12px rgba(0,122,255,0.3)' : '0 2px 4px rgba(0,0,0,0.05)' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ height: 24, width: 1, background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={preset} onChange={e => { setPreset(e.target.value); if (e.target.value) applyPreset(e.target.value); }}
              className="form-select form-select-sm rounded-pill shadow-sm" 
              style={{ fontSize:'0.8rem', width: 160, background: '#fff', border: '1px solid rgba(0,0,0,0.1)' }}>
              <option value="">— Formations —</option>
              {allPresets.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <button className="btn btn-outline-primary btn-sm rounded-pill px-3" 
              style={{ fontWeight: 600, fontSize: '0.8rem' }} 
              title="Save current setup"
              onClick={savePreset}>💾 Save</button>
          </div>
        </div>
        <button 
          disabled={unplaced.length > 0}
          onClick={() => setPhase('battle')}
          className="transition-all"
          style={{ 
            background: unplaced.length === 0 ? '#34C759' : 'rgba(5, 109, 148, 0.1)', 
            color: unplaced.length === 0 ? '#fff' : '#056d94', 
            borderRadius: 12,
            padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700, 
            border: unplaced.length === 0 ? 'none' : '1px solid rgba(5,109,148,0.2)',
            cursor: unplaced.length === 0 ? 'pointer' : 'default',
            boxShadow: unplaced.length === 0 ? '0 4px 12px rgba(52,199,89,0.3)' : 'none'
          }}>
          {unplaced.length === 0 ? '🚀 CONFIRM SETUP' : `RESERVES: ${unplaced.length} PIECES`}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1100 ? '1fr' : 'auto 1fr', gap: 30, alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <div className="glass-panel" style={{ padding: 20, background: '#fff' }}>
            <BoardGrid board={board} playerRole={playerRole} myDeployRows={myDeployRows}
              phase="deployment" selectedCell={selectedCell} validMoves={[]}
              swapFirst={swapFirst} aiLastMove={null} lastPlayerMove={null} deploySelFrom={selectedPieceFrom}
              onCellClick={handleDeployClick} onCellCtx={handleDeployCtx} cellSize={cellSize} />
          </div>
        </div>

        {/* RIGHT COLUMN: Utility Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Card 1: Available Pieces */}
          <div className="glass-panel p-4" style={{ minHeight: 200, border: unplaced.length === 0 ? '2px solid #056d94' : '1px solid var(--glass-border)' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="fw-bold" style={{ fontSize:'1rem', color: '#1D1D1F' }}>Available Pieces</span>
              <span className={`badge rounded-pill ${unplaced.length === 0 ? 'bg-success' : 'bg-primary'}`} style={{ fontSize: '0.7rem' }}>
                {unplaced.length === 0 ? 'READY' : `${unplaced.length} LEFT`}
              </span>
            </div>

            {unplaced.length === 0 && (
              <button className="apple-btn-primary mb-3 shadow-lg transition-all"
                style={{ background: '#056d94', height: 54, fontSize: '1.1rem' }}
                onClick={() => setPhase('battle')}>
                CONFIRM SETUP
              </button>
            )}

            
            {unplaced.length === 0
              ? <div className="text-center py-4" style={{ fontSize:'0.9rem', color:'#86868B', background: 'rgba(52, 199, 89, 0.05)', borderRadius: 12, border: '1px dashed #34C759' }}>
                  <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: 5 }}>✓</span>
                  All pieces are ready for the match.
                </div>
              : <div style={{ display:'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 8 }}>
                  {unplaced.map(p => (
                    <div key={p.id} onClick={() => { setSelectedPiece(p); setSelectedPieceFrom(null); }} 
                      title={`${p.label} (Rank ${p.type === 'FLAG' || p.type === 'SPY' ? 'Special' : p.type})`}
                      style={{ height: 64, borderRadius: 12, display: 'flex', flexDirection: 'column',
                               alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 2,
                               background: selectedPiece?.id===p.id ? '#056d94' : '#F2F2F7',
                               border: selectedPiece?.id===p.id ? '2px solid #056d94' : '1px solid transparent',
                               transition: 'all 0.2s ease',
                               transform: selectedPiece?.id===p.id ? 'scale(1.05)' : 'scale(1)',
                               boxShadow: selectedPiece?.id===p.id ? '0 4px 12px rgba(5,109,148,0.2)' : 'none' }}>
                      <span style={{ fontSize: '1.1rem', color: selectedPiece?.id===p.id ? '#fff' : '#1D1D1F' }}>{PIECE_ICON[p.type]}</span>
                      <span style={{ fontSize: '0.45rem', fontWeight: 700, color: selectedPiece?.id===p.id ? 'rgba(255,255,255,0.8)' : '#86868B', textTransform: 'uppercase' }}>{p.abbr}</span>
                    </div>
                  ))}
                </div>
            }
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            {/* Card 2: Quick Tips / Legend Toggle */}
            <div className="glass-panel p-3 d-flex flex-row align-items-center gap-3">
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(5,109,148,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
                <Info size={20} color="#056d94" />
              </div>
              <div className="text-start">
                <div className="fw-bold" style={{ fontSize: '0.85rem' }}>Setup Guide</div>
                <p className="mb-0" style={{ fontSize: '0.7rem', color: '#86868B' }}>
                  Place all 21 pieces within the first 3 rows. Drag to move or use setups above.
                </p>
              </div>
            </div>
          </div>

          {/* Piece Legend - Full width at bottom of panels */}
          <div className="glass-panel p-3">
            <div className="fw-bold mb-3" style={{ fontSize:'0.9rem' }}>Power Hierarchy Reference</div>
            <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 5 }}>
              <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <th>PIECE</th>
                    <th className="text-end">RANK</th>
                    <th className="text-end">QTY</th>
                  </tr>
                </thead>
                <tbody>
                  {PIECE_DEFS.map((p, i) => (
                    <tr key={p.type} style={{ verticalAlign: 'middle' }}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1rem' }}>{PIECE_ICON[p.type]}</span>
                        <span>{p.label}</span>
                      </td>
                      <td className="text-end fw-bold text-primary">{p.type === 'FLAG' || p.type === 'SPY' ? '—' : i + 1}</td>
                      <td className="text-end text-muted">×{p.count}</td>
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent: 'center', marginBottom: 15,
                    width: '100%', gap: 12, flexWrap:'wrap' }}>
        {!winner && (
          <div style={{
            background: timeLeft <= 10 ? '#FF3B30' : 'var(--system-blue)', color: '#fff', borderRadius: 8,
            padding: '8px 16px', fontWeight: 700, fontSize: '1rem', letterSpacing: '1px',
            boxShadow: `0 4px 14px ${timeLeft <= 10 ? 'rgba(255,59,48,0.4)' : 'rgba(5, 109, 148, 0.2)'}`,
            transition: 'background 0.3s'
          }}>
            ⏱ {formatTime(timeLeft)}
          </div>
        )}
        {!winner
          ? <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                          gap:8, minWidth: 200,
                          background: isMyTurn ? '#056d94' : '#FF3B30', color:'#fff',
                          borderRadius:999, padding:'8px 24px', fontWeight:700, fontSize:'0.9rem',
                          letterSpacing:'1px',
                          boxShadow:`0 4px 14px ${isMyTurn ? 'rgba(5, 109, 148, 0.4)' : 'rgba(255,59,48,0.4)'}`,
                          transition:'background 0.3s, box-shadow 0.3s' }}>
              {isMyTurn ? 'YOUR TURN' : 'ENEMY TURN'}
            </div>
          : <div style={{ display:'inline-flex', alignItems:'center', gap:8,
                          background: winner===playerRole ? '#34C759' : '#FF3B30', color:'#fff',
                          borderRadius:999, padding:'8px 24px', fontWeight:700, fontSize:'0.9rem' }}>
              {winner===playerRole ? 'VICTORY' : 'DEFEATED'}
            </div>
        }
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
        {/* PANEL 1: Piece Legend - hidden on very small screens to save space */}
        <div style={{ flex: '1 1 145px', maxWidth: 180, display: window.innerWidth < 500 ? 'none' : 'block' }}>
          <PieceLegend />
        </div>

        {/* PANEL 2: Main Board - scales with cellSize */}
        <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', maxWidth: '100%', overflowX:'auto' }}>
          <BoardGrid board={board} playerRole={playerRole} myDeployRows={myDeployRows}
            phase="battle" selectedCell={selectedCell} validMoves={validMoves}
            swapFirst={null} aiLastMove={aiLastMove} lastPlayerMove={lastPlayerMove}
            onCellClick={handleBattleClick} onCellCtx={() => {}} cellSize={cellSize} />
        </div>

        {/* PANEL 3: Graveyard & Battle Log */}
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 350 }}>
          <MyGraveyard board={board} playerRole={playerRole} />
          <TerminalLog log={battleLog} />
        </div>
      </div>
    </div>
  );
}
