import React, { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { PIECE_DEFS, buildPieceSet, resolveCombat, getValidMoves,
         HOST_DEPLOY_ROWS, GUEST_DEPLOY_ROWS, ROWS, COLS } from '../lib/gameConstants';

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
function TerminalLog({ log, playerRole }) {
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
            // Issue 9: Fix log colors based on local player role
            const isHostEntry = entry.startsWith('HOST:');
            const isGuestEntry = entry.startsWith('GUEST:');
            const isTie = entry.startsWith('TIE:');
            
            let color = '#1D1D1F'; // Default
            if (isHostEntry) color = '#056d94';
            else if (isGuestEntry) color = '#FF3B30';
            else if (isTie) color = '#AF52DE';

            // If it's the current player's action, use blue, if opponent, use red
            // The user wants: blue for local player, red for opponent.
            // Currently, HOST is blue and GUEST is red.
            // If local player is GUEST, they see red for themselves.
            // Let's adjust:
            const myPrefix = playerRole === 'host' ? 'HOST:' : 'GUEST:';
            const oppPrefix = playerRole === 'host' ? 'GUEST:' : 'HOST:';
            
            if (entry.startsWith(myPrefix)) color = '#056d94'; // Always Blue for self
            else if (entry.startsWith(oppPrefix)) color = '#FF3B30'; // Always Red for opponent

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

function PieceLegend({ onSurrender, onPlayAgain, onLeave, isViewingPieces, winner, phase }) {
  return (
    <div className="battlefield-glass-panel p-3" style={{ minWidth: 160, maxWidth: 180, flexShrink: 0 }}>
      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px',
                    fontWeight: 700, color: '#86868B', marginBottom: 10 }}>
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
      <div style={{ marginTop: 10, fontSize: '0.58rem', color: '#86868B',
                    background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '8px', lineHeight: 1.5 }}>
        <b>Spy</b> beats all ranks<br />
        <b>Private</b> beats Spy<br />
        <b>Flag</b> = objective
      </div>

      <div className="mt-3 d-flex flex-column gap-2">
        {isViewingPieces ? (
          <>
            <button onClick={onPlayAgain} className="btn btn-primary btn-sm rounded-pill py-2" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              Play Again
            </button>
            <button onClick={onLeave} className="btn btn-outline-secondary btn-sm rounded-pill py-2" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              Leave Match
            </button>
          </>
        ) : (
          !winner && phase === 'battle' && (
            <button onClick={onSurrender} className="btn btn-outline-danger btn-sm rounded-pill py-2 w-100" style={{ fontSize: '0.7rem', fontWeight: 700, borderStyle: 'dashed' }}>
              Surrender Match
            </button>
          )
        )}
      </div>
    </div>
  );
}

const PIECE_COLOR = (type, side) => {
  if (side === 'enemy') {
    if (type === 'SPY') return '#AF52DE'; // Purple-ish for enemy spy
    if (type === 'FLAG') return '#FF9500'; // Flag is orange
    return '#FF3B30'; // Red team base
  }
  // Local/Mine side
  if (type === 'SPY') return '#5856D6';
  if (type === 'FLAG') return '#FF9500';
  return '#056d94';
};

const COLS_LBL = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));
const ROWS_LBL = Array.from({ length: ROWS }, (_, i) => String(8 - i));

const coord = (r, c) => `${String.fromCharCode(65 + c)}${8 - r}`;

function BoardGrid({ board, playerRole, myDeployRows, phase, selectedCell, validMoves,
                     swapFirst, aiLastMove, lastPlayerMove, deploySelFrom, onCellClick, onCellCtx, cellSize, isViewingPieces }) {
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

            let bg = isViewingPieces ? 'rgba(0,0,0,0.03)' : '#F2F2F7';
            if (isDeploy && !cell) bg = 'rgba(0,122,255,0.06)';
            if (isLastP)  bg = 'rgba(5, 109, 148, 0.1)';
            if (isLastAI) bg = 'rgba(255, 59, 48, 0.1)';
            if (isMine)   bg = PIECE_COLOR(cell.type, 'mine');
            if (isEnemy)  bg = isViewingPieces ? PIECE_COLOR(cell.type, 'enemy') : '#FF3B30'; 
            
            // Only apply selection background if the cell is EMPTY. Otherwise, use border/box-shadow.
            if (!cell && (isSel || isSwapSel || isDeployHighlight)) {
              bg = 'rgba(0,122,255,0.15)';
            }

            const border = (isSel || isSwapSel || isDeployHighlight) ? '3px solid #007AFF'
                         : isValid && isEnemy ? '3px solid #34C759'
                         : isValid            ? '3px solid rgba(52,199,89,0.5)'
                         : '3px solid transparent';

            const isHovered = hoveredCell?.[0]===ar && hoveredCell?.[1]===ac;
            const canInteract = !isViewingPieces && (isMine || isEnemy || isValid || isDeploy);

            return (
              <div key={`${ar}-${ac}`}
                onClick={() => !isViewingPieces && onCellClick(ar, ac)}
                onContextMenu={e => { e.preventDefault(); !isViewingPieces && onCellCtx(ar, ac); }}
                onMouseEnter={() => setHoveredCell([ar, ac])}
                onMouseLeave={() => setHoveredCell(null)}
                draggable={!isViewingPieces && (isMine || isEnemy)}
                onDragStart={(e) => {
                  if (isViewingPieces || (!isMine && !isEnemy)) return;
                  e.dataTransfer.setData('pieceId', cell.id);
                  e.dataTransfer.setData('fromBoard', 'true');
                  e.dataTransfer.setData('fromRow', ar);
                  e.dataTransfer.setData('fromCol', ac);
                }}
                onDragOver={(e) => {
                  if (isViewingPieces || phase !== 'deployment') return;
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  if (isViewingPieces || phase !== 'deployment') return;
                  e.preventDefault();
                  const pieceId = e.dataTransfer.getData('pieceId');
                  const fromBoard = e.dataTransfer.getData('fromBoard') === 'true';
                  
                  if (fromBoard) {
                    const fr = parseInt(e.dataTransfer.getData('fromRow'));
                    const fc = parseInt(e.dataTransfer.getData('fromCol'));
                    // Swap logic
                    const next = board.map(r => [...r]);
                    [next[ar][ac], next[fr][fc]] = [next[fr][fc], next[ar][ac]];
                    setBoard(next);
                  } else {
                    // Deployment logic from tray
                    const p = unplaced.find(x => x.id === pieceId);
                    if (!p || !myDeployRows.includes(ar)) return;
                    const next = board.map(r => [...r]);
                    const displaced = next[ar][ac]?.owner === playerRole ? next[ar][ac] : null;
                    next[ar][ac] = { ...p, owner: playerRole };
                    setBoard(next);
                    setUnplaced(u => {
                      let updated = u.filter(x => x.id !== p.id);
                      if (displaced) updated = [...updated, displaced];
                      return updated;
                    });
                  }
                }}
                style={{ width: CELL, height: CELL, borderRadius: 8, background: bg, border,
                         display: 'flex', flexDirection: 'column', alignItems: 'center',
                         justifyContent: 'center', cursor: canInteract ? 'pointer' : 'default',
                         userSelect: 'none', gap: 1, position: 'relative', zIndex: isHovered ? 2 : 1,
                         transition: 'all 0.15s ease',
                         transform: isHovered && canInteract ? 'scale(1.08)' : 'scale(1)',
                         boxShadow: isHovered && canInteract ? '0 4px 14px rgba(0,0,0,0.12)' : 'none',
                         opacity: isViewingPieces && !cell ? 0.4 : 1
                }}>
                {(isMine || (isViewingPieces && isEnemy)) && <>
                  <span style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1 }}>{PIECE_ICON[cell.type]}</span>
                  <span style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.2px', lineHeight: 1 }}>{cell.abbr}</span>
                </>}
                {isEnemy && !isViewingPieces && <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)' }}>?</span>}
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
  turnStartAt,
  matchCreatedAt,
  onSurrender, // Pass through
  onPlayAgain,
  onLeave,
  isViewingPieces = false
}) {
  const [unplaced, setUnplaced]             = useState(() => {
    const fullSet = buildPieceSet(playerRole);
    const placedIds = new Set(board.flat().filter(c => c?.owner === playerRole).map(c => c.id));
    return fullSet.filter(p => !placedIds.has(p.id));
  });

  // Sync unplaced pieces when board changes (crucial for persistence/tab-switching)
  useEffect(() => {
    if (phase === 'deployment') {
      const fullSet = buildPieceSet(playerRole);
      const placedIds = new Set(board.flat().filter(c => c?.owner === playerRole).map(c => c.id));
      const nextUnplaced = fullSet.filter(p => !placedIds.has(p.id));
      
      // Only update if the length changed or if we had a full set but board isn't empty
      // to avoid unnecessary state updates during active dragging
      if (nextUnplaced.length !== unplaced.length) {
        setUnplaced(nextUnplaced);
      }
    }
  }, [board, playerRole, phase]);
  const [selectedPiece, setSelectedPiece]   = useState(null);
  const [selectedPieceFrom, setSelectedPieceFrom] = useState(null);
  const [selectedCell, setSelectedCell]     = useState(null);
  const [validMoves, setValidMoves]         = useState([]);
  const [lastPlayerMove, setLastPlayerMove] = useState(null);
  const [flagBreakthrough, setFlagBreakthrough] = useState({ host: null, guest: null });
  const [swapMode, setSwapMode]   = useState(false);
  const [swapFirst, setSwapFirst] = useState(null);
  const [cellSize, setCellSize]   = useState(64);
  const [winnerOfMoveLocal, setWinnerOfMoveLocal] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 500) setCellSize(34);
      else if (w < 768) setCellSize(42);
      else if (w < 1200) setCellSize(52);
      else if (w < 1500) setCellSize(58);
      else setCellSize(64);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDuration = (mode) => {
    if (mode === 'Blitz') return 30;
    if (mode === 'Competitive') return 120;
    return 60;
  };

  const [timeLeft, setTimeLeft] = useState(getDuration(gameMode));

  useEffect(() => {
    if (phase !== 'battle' || winner || winnerOfMoveLocal || isViewingPieces) return;

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

      if (remaining <= 0 && (currentTurn === playerRole || isAI)) {
        clearInterval(interval);
        const nextT = currentTurn === 'host' ? 'guest' : 'host';
        setCurrentTurn(nextT);
        const msg = `${currentTurn.toUpperCase()} timed out!`;
        if (onTimeout) {
          onTimeout(nextT, msg).catch(err => {
            console.error('Timeout sync failed, retrying...', err);
            setTimeout(() => onTimeout(nextT, msg), 1000);
          });
        }
        setBattleLog(prevLog => [...prevLog, msg]);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [turnStartAt, phase, winner, currentTurn, playerRole, isAI, gameMode, isViewingPieces]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const myDeployRows = playerRole === 'host' ? HOST_DEPLOY_ROWS : GUEST_DEPLOY_ROWS;
  const enemyBackRow = playerRole === 'host' ? 0 : 7;
  const isMyTurn     = currentTurn === playerRole;
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
    if (!isMyTurn || winner || winnerOfMoveLocal || isViewingPieces) return;
    const cell = board[row][col];
    if (selectedCell) {
      const [sr, sc] = selectedCell;
      const isValid = validMoves.some(([vr,vc]) => vr===row && vc===col);
      if (isValid) {
        const next = board.map(r => [...r]);
        const mover = next[sr][sc], target = next[row][col]; let log = '';
        let flagCaptured = false; let result = null;
        if (!target) {
          next[row][col] = mover; next[sr][sc] = null;
          log = `${playerRole.toUpperCase()}: Movement to ${coord(row,col)}.`;
          if (mover.type === 'FLAG' && row === enemyBackRow) {
            const fb = { ...flagBreakthrough };
            if (!fb[playerRole]) { fb[playerRole] = currentTurn; setFlagBreakthrough(fb); log += ' 🏁'; }
            else { 
              setWinner(playerRole); 
              flagCaptured = true; 
              log += ' FLAG BREAKTHROUGH!'; 
            }
          }
        } else {
          result = resolveCombat(mover.type, target.type);
          if (result === 'attacker') {
            next[row][col] = mover; next[sr][sc] = null;
            log = `${playerRole.toUpperCase()}: Attack at ${coord(row,col)} successful.`;
            if (target.type === 'FLAG') { 
              setWinner(playerRole); 
              flagCaptured = true; 
              log += ' (FLAG CAPTURED!)'; 
            }
          } else if (result === 'defender') {
            next[sr][sc] = null; log = `${playerRole.toUpperCase()}: Attack at ${coord(row,col)} failed.`;
            if (mover.type === 'FLAG') { 
              const w = playerRole === 'host' ? 'guest' : 'host';
              setWinner(w); 
              flagCaptured = true; 
              log += ' (FLAG CAPTURED!)'; 
            }
          } else {
            next[row][col] = null; next[sr][sc] = null; log = `TIE: Both pieces eliminated at ${coord(row,col)}.`;
            if (mover.type === 'FLAG' || (target && target.type === 'FLAG')) { 
              setWinner('tie'); 
              flagCaptured = true; 
            }
          }
        }
        setLastPlayerMove({ from:[sr,sc], to:[row,col] });
        setBoard(next);
        const updatedLog = [...battleLog, log];
        setBattleLog(updatedLog);
        
        let winnerOfMove = null;
        let nextFb = { ...flagBreakthrough };

        if (flagCaptured) {
          if (mover.type === 'FLAG' && row === enemyBackRow) winnerOfMove = playerRole;
          else if (target?.type === 'FLAG' && result === 'attacker') winnerOfMove = playerRole;
          else if (mover.type === 'FLAG' && result === 'defender') winnerOfMove = playerRole === 'host' ? 'guest' : 'host';
          else if (mover.type === 'FLAG' || (target && target.type === 'FLAG')) winnerOfMove = 'tie';

          if (mover.type === 'FLAG' && result !== 'attacker') nextFb[playerRole] = null;
          if (target?.type === 'FLAG' && result === 'attacker') {
            const enemyRole = playerRole === 'host' ? 'guest' : 'host';
            nextFb[enemyRole] = null;
          }
          setFlagBreakthrough(nextFb);
          setWinnerOfMoveLocal(winnerOfMove);
        }

        if (!flagCaptured) setCurrentTurn(currentTurn === 'host' ? 'guest' : 'host');
        setSelectedCell(null); setValidMoves([]); 
        onMove && onMove(next, flagCaptured, updatedLog, winnerOfMove, nextFb);
      } else {
        if (cell?.owner === playerRole) { setSelectedCell([row,col]); setValidMoves(getValidMoves(board,row,col,playerRole)); }
        else { setSelectedCell(null); setValidMoves([]); }
      }
    } else if (cell?.owner === playerRole) { setSelectedCell([row,col]); setValidMoves(getValidMoves(board,row,col,playerRole)); }
  };

  if (phase === 'deployment') return (
    <div className="container-fluid px-0 d-flex flex-column align-items-center" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%', flexWrap: 'wrap', marginBottom: 20 }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <div className="battlefield-glass-panel" style={{ padding: '0.75rem' }}>
            <PieceLegend winner={null} phase={phase} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          <div className="battlefield-glass-panel" style={{ padding: '0.75rem' }}>
            <BoardGrid board={board} playerRole={playerRole} myDeployRows={myDeployRows}
              phase="deployment" selectedCell={selectedCell} validMoves={[]}
              swapFirst={swapFirst} aiLastMove={null} lastPlayerMove={null} deploySelFrom={selectedPieceFrom}
              onCellClick={handleDeployClick} onCellCtx={handleDeployCtx} cellSize={cellSize} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="battlefield-glass-panel p-3" style={{ minHeight: 200, width: 280, border: unplaced.length === 0 ? '2px solid #056d94' : '1px solid rgba(255,255,255,0.5)' }}>
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
                    <div key={p.id} 
                      onClick={() => { setSelectedPiece(p); setSelectedPieceFrom(null); }} 
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('pieceId', p.id);
                        e.dataTransfer.setData('fromBoard', 'false');
                        setSelectedPiece(p);
                      }}
                      title={`${p.label}`}
                      style={{ height: 48, borderRadius: 10, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', cursor: 'grab', gap: 1,
                                background: selectedPiece?.id===p.id ? '#056d94' : '#F2F2F7',
                                border: selectedPiece?.id===p.id ? '2px solid #056d94' : '1px solid transparent',
                                transition: 'all 0.2s ease',
                                transform: selectedPiece?.id===p.id ? 'scale(1.05)' : 'scale(1)',
                                boxShadow: selectedPiece?.id===p.id ? '0 4px 12px rgba(5,109,148,0.2)' : 'none' }}>
                      <span style={{ fontSize: '0.9rem', color: selectedPiece?.id===p.id ? '#fff' : '#1D1D1F' }}>{PIECE_ICON[p.type]}</span>
                      <span style={{ fontSize: '0.38rem', fontWeight: 700, color: selectedPiece?.id===p.id ? 'rgba(255,255,255,0.8)' : '#86868B', textTransform: 'uppercase' }}>{p.abbr}</span>
                    </div>
                  ))}
                </div>
            }

            {/* In-Panel Setup Guide */}
            <div style={{ marginTop: 20, padding: '12px', borderRadius: 12, background: 'rgba(0, 122, 255, 0.05)', border: '1px solid rgba(0, 122, 255, 0.1)', display: 'flex', gap: 10, alignItems: 'start' }}>
              <Info size={16} style={{ color: '#007AFF', marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: '0.72rem', color: '#424245', lineHeight: 1.4, fontWeight: 500 }}>
                Place all 21 pieces within your first 3 rows. Drag pieces to the board or <b style={{ color: '#007AFF' }}>right-click</b> to remove them.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', marginTop: 20, flexWrap:'wrap', gap: 12, width: '100%' }}>
        <div style={{ display:'flex', gap: 8, flexWrap:'wrap', justifyContent: 'center' }}>
          <button onClick={randomize} style={{
            background: '#007AFF', color: '#fff', border: 'none',
            borderRadius: 12, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)'
          }}>
            Randomize
          </button>

          <button onClick={clearBoard} style={{
            background: '#FFFFFF', color: '#1D1D1F', border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: 12, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
          }}>
            ✕ Clear
          </button>

          <button onClick={() => { setSwapMode(v=>!v); setSwapFirst(null); }} style={{
            background: swapMode ? '#007AFF' : '#FFFFFF', 
            color: swapMode ? '#fff' : '#1D1D1F', 
            border: swapMode ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: 12, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: swapMode ? '0 4px 12px rgba(0,122,255,0.3)' : 'none'
          }}>
            ⇄ Swap {swapMode ? 'ON' : 'OFF'}
          </button>
          
          <button onClick={onSurrender} style={{
            background: '#FF3B30', color: '#fff', border: 'none',
            borderRadius: 12, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)'
          }}>
            {isAI ? 'Exit Practice' : 'Exit Lobby'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width:'100%', marginTop: '20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent: 'center', marginBottom: 15,
                    width: '100%', gap: 12, flexWrap:'wrap' }}>
        {!winner && !isViewingPieces && (
          <div style={{
            background: timeLeft <= 10 ? '#FF3B30' : 'var(--system-blue)', color: '#fff', borderRadius: 8,
            padding: '8px 16px', fontWeight: 700, fontSize: '1rem', letterSpacing: '1px',
            boxShadow: `0 4px 14px ${timeLeft <= 10 ? 'rgba(255,59,48,0.4)' : 'rgba(5, 109, 148, 0.2)'}`,
            transition: 'background 0.3s'
          }}>
            ⏱ {formatTime(timeLeft)}
          </div>
        )}
        {!isViewingPieces && (
          !winner
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
        )}
        {isViewingPieces && (
          <div className="badge rounded-pill bg-dark px-4 py-2" style={{ fontSize: '0.9rem', letterSpacing: '1px' }}>
            VIEWING MODE
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto' }}>
          <PieceLegend onSurrender={onSurrender} onPlayAgain={onPlayAgain} onLeave={onLeave} isViewingPieces={isViewingPieces} winner={winner} phase={phase} />
        </div>

        <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', maxWidth: '100%', overflowX:'auto' }}>
          <div className="battlefield-glass-panel" style={{ padding: '0.75rem' }}>
            <BoardGrid board={board} playerRole={playerRole} myDeployRows={myDeployRows}
              phase="battle" selectedCell={selectedCell} validMoves={validMoves}
              swapFirst={null} aiLastMove={aiLastMove} lastPlayerMove={lastPlayerMove}
              onCellClick={handleBattleClick} onCellCtx={() => {}} cellSize={cellSize} isViewingPieces={isViewingPieces} />
          </div>
        </div>

        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 350 }}>
          <MyGraveyard board={board} playerRole={playerRole} />
          <TerminalLog log={battleLog} playerRole={playerRole} />
        </div>
      </div>
    </div>
  );
}
