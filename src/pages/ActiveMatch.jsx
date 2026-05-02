import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import GameBoard from '../components/GameBoard';
import Swal from 'sweetalert2';
import { ROWS, COLS } from '../lib/gameConstants';
import { calculateElo } from '../lib/rankUtils';
import { Gamepad2 } from 'lucide-react';

export default function ActiveMatch() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [match,        setMatch]        = useState(null);
  const [board,        setBoard]        = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [phase,        setPhase]        = useState('deployment');
  const [currentTurn,  setCurrentTurn]  = useState('host');
  const [battleLog,    setBattleLog]    = useState([]);
  const [winner,       setWinner]       = useState(null);
  const [lobbyCode,    setLobbyCode]    = useState('');
  const [role,         setRole]         = useState(null);
  const [opponentName, setOpponentName] = useState('Opponent');
  const [isReady,      setIsReady]      = useState(false);
  const matchFinishedRef = useRef(false);
  const swalShownRef = useRef(false);

  // ── Shared fetch + apply ─────────────────────────────────────────────────────
  const applyMatchData = (data) => {
    if (!data) { navigate('/lobbies'); return; }
    setMatch(data);
    setLobbyCode(data.lobby_code);
    if (data.game_state) {
      const gs = data.game_state;
      setBoard(gs.board      ?? Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
      setPhase(gs.phase      ?? 'deployment');
      setCurrentTurn(gs.current_turn ?? 'host');
      setBattleLog(gs.battle_log     ?? []);
      setWinner(gs.winner            ?? null);
    }
  };

  const fetchMatch = async () => {
    const { data, error } = await supabase.from('matches').select('*').eq('id', id).single();
    if (error || !data) {
      navigate('/lobbies');
      return null;
    }
    
    // Strict security: kick out unauthorized third players
    if (data.host_id !== user.id && data.guest_id && data.guest_id !== user.id) {
      Swal.fire({
        title: 'Lobby Full',
        text: 'This match is already occupied by two players.',
        icon: 'error',
        confirmButtonColor: '#056d94',
        customClass: { popup: 'apple-swal', title: 'apple-swal-title', confirmButton: 'apple-swal-confirm' }
      }).then(() => navigate('/lobbies'));
      return null;
    }

    applyMatchData(data);
    return data;
  };

  // ── Initial load + realtime + visibility ─────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    fetchMatch().then(data => {
      if (!mounted || !data) return;
      const r = data.host_id === user.id ? 'host' : 'guest';
      setRole(r);
    });

    // ── Realtime subscription ──────────────────────────────────────────────
    const channel = supabase
      .channel(`match_${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}` },
        (payload) => {
          if (!mounted) return;
          if (payload.new.status === 'completed') matchFinishedRef.current = true;
          setMatch(prev => ({ ...prev, ...payload.new }));
          const gs = payload.new.game_state;
          if (gs) {
            if (gs.winner) matchFinishedRef.current = true;
            setBoard(gs.board        ?? []);
            setPhase(gs.phase        ?? 'deployment');
            setCurrentTurn(gs.current_turn ?? 'host');
            setBattleLog(gs.battle_log     ?? []);
            setWinner(gs.winner            ?? null);
            // If the phase is back to deployment (e.g. restart), reset ready state
            if (gs.phase === 'deployment' && gs.host_ready === false && gs.guest_ready === false) {
              setIsReady(false);
            }
          }
        })
      .subscribe();

    // ── Tab visibility: re-sync on focus (fixes "tab switching resets state") ──
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchMatch();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [id]);

  // ── Fetch opponent profile once match + role are known ────────────────────
  useEffect(() => {
    if (!match || !role) return;
    const opponentId = role === 'host' ? match.guest_id : match.host_id;
    if (!opponentId) return;
    supabase.from('user_profiles').select('username').eq('id', opponentId).single()
      .then(({ data }) => { if (data?.username) setOpponentName(data.username); });
  }, [match?.guest_id, match?.host_id, role]);

  // ── SweetAlert for win/loss ───────────────────────────────────────────────
  useEffect(() => {
    if (!winner || !role || swalShownRef.current) return;
    swalShownRef.current = true;
    
    const isWin = winner === role;
    const isTie = winner === 'tie';
    
    Swal.fire({
      title: isWin ? 'Victory' : (isTie ? 'Draw' : 'Defeated'),
      text: isWin ? 'You outmaneuvered your opponent!' 
           : (isTie ? 'Both flags were eliminated in a final stand.' 
           : `${opponentName} captured your flag.`),
      icon: isWin ? 'success' : (isTie ? 'info' : 'error'),
      confirmButtonText: 'Back to Lobbies',
      confirmButtonColor: isWin ? '#34C759' : '#056d94',
      customClass: {
        popup: 'apple-swal',
        title: 'apple-swal-title',
        confirmButton: 'apple-swal-confirm',
      }
    }).then(async () => {
      // Final Sealer safeguard for the host
      if (role === 'host' && match?.status === 'in_progress' && winner) {
        await supabase.from('matches').update({ 
          status: 'completed', 
          winner: winner,
          winner_id: winner === 'host' ? match.host_id : (winner === 'guest' ? match.guest_id : null)
        }).eq('id', id);
      }
      matchFinishedRef.current = true;
      navigate('/lobbies', { replace: true });
    });
  }, [winner, role, opponentName]);

  // ── Sealer: Host ensures status=completed if winner exists ────────────────
  useEffect(() => {
    if (winner && match?.status === 'in_progress' && role === 'host') {
      console.log('Sealer: Host finalizing match status...');
      supabase.from('matches').update({ 
        status: 'completed', 
        winner: winner,
        winner_id: winner === 'host' ? match.host_id : (winner === 'guest' ? match.guest_id : null)
      }).eq('id', id).then(({ error }) => {
        if (error) console.error('Sealer error:', error);
      });
    }
  }, [winner, match?.status, role]);

  // ── Process Elo Update ────────────────────────────────────────────────────
  const processEloUpdate = async (finalWinnerRole) => {
    const hostId = match.host_id;
    const guestId = match.guest_id;
    if (!hostId || !guestId) return;

    const { data: hostProfile } = await supabase.from('user_profiles').select('command_rating, wins, losses, draws').eq('id', hostId).single();
    const { data: guestProfile } = await supabase.from('user_profiles').select('command_rating, wins, losses, draws').eq('id', guestId).single();
    
    if (!hostProfile || !guestProfile) return;

    const hostCR = hostProfile.command_rating ?? 1000;
    const guestCR = guestProfile.command_rating ?? 1000;

    let hostScore = 0.5; // tie
    if (finalWinnerRole === 'host') hostScore = 1;
    else if (finalWinnerRole === 'guest') hostScore = 0;

    const { newA: newHostCR, newB: newGuestCR } = calculateElo(hostCR, guestCR, hostScore);

    try {
      const { error: hErr } = await supabase.from('user_profiles').update({
        command_rating: newHostCR,
        wins: hostProfile.wins + (hostScore === 1 ? 1 : 0),
        losses: hostProfile.losses + (hostScore === 0 ? 1 : 0),
        draws: (hostProfile.draws || 0) + (hostScore === 0.5 ? 1 : 0)
      }).eq('id', hostId);
      if (hErr) console.warn('Elo update host error:', hErr);

      const { error: gErr } = await supabase.from('user_profiles').update({
        command_rating: newGuestCR,
        wins: guestProfile.wins + (hostScore === 0 ? 1 : 0),
        losses: guestProfile.losses + (hostScore === 1 ? 1 : 0),
        draws: (guestProfile.draws || 0) + (hostScore === 0.5 ? 1 : 0)
      }).eq('id', guestId);
      if (gErr) console.warn('Elo update guest error:', gErr);
    } catch (err) {
      console.warn('Elo update catch block:', err);
    }
  };

  // ── Persist every board move to Supabase ─────────────────────────────────
  const syncToSupabase = async (newBoard, flagCaptured, latestLog, winnerOfMove, nextFb) => {
    if (matchFinishedRef.current) return;
    
    const finalWinner = flagCaptured ? winnerOfMove : winner;
    const nextStatus = finalWinner ? 'completed' : 'in_progress';
    const nextTurn = finalWinner ? currentTurn : (currentTurn === 'host' ? 'guest' : 'host');
    
    // Set local state immediately for instant feedback
    if (finalWinner) {
      setWinner(finalWinner);
      matchFinishedRef.current = true;
    }

    const { data: matchData, error: fetchErr } = await supabase.from('matches').select('status, game_state, host_id, guest_id').eq('id', id).single();
    if (fetchErr) { console.error('syncToSupabase fetch error:', fetchErr); return; }
    
    if (matchData?.status === 'completed') { 
      matchFinishedRef.current = true;
      return; 
    }
    
    const currentGs = matchData?.game_state || {};
    const nextGs = {
      ...currentGs,
      board: newBoard,
      phase: nextStatus === 'completed' ? 'battle' : phase,
      current_turn: nextTurn,
      battle_log: latestLog || battleLog,
      winner: finalWinner,
      flag_breakthrough: nextFb || currentGs.flag_breakthrough,
      winner_id: finalWinner === 'host' ? matchData.host_id : (finalWinner === 'guest' ? matchData.guest_id : null),
      turn_start_at: new Date().toISOString()
    };
    
    const wId = finalWinner === 'host' ? matchData.host_id : (finalWinner === 'guest' ? matchData.guest_id : null);
    
    console.log('Final Syncing Result:', { finalWinner, wId });

    // Try full update first
    const { error: updErr } = await supabase.from('matches').update({
      status: nextStatus,
      game_state: nextGs,
      winner: finalWinner,
      winner_id: wId
    }).eq('id', id);

    if (updErr) {
      console.warn('Full update failed, falling back to game_state only:', updErr);
      const { error: fallbackErr } = await supabase.from('matches').update({
        game_state: nextGs,
      }).eq('id', id);
      
      if (fallbackErr) console.error('syncToSupabase final failure:', fallbackErr);
    }

    if (finalWinner) {
      if (finalWinner !== 'tie') await processEloUpdate(finalWinner);
    }
  };
  
  const handleTimeout = async (nextTurn, msg) => {
    if (winner || phase !== 'battle') return;
    const { data: matchData, error: fetchErr } = await supabase.from('matches').select('status, game_state').eq('id', id).single();
    if (fetchErr || matchData?.status === 'completed') return;
    const currentGs = matchData?.game_state || {};
    
    const { error: updErr } = await supabase.from('matches').update({
      game_state: {
        ...currentGs,
        board,
        phase,
        current_turn: nextTurn,
        battle_log: [...battleLog, msg],
        winner,
        turn_start_at: new Date().toISOString()
      },
    }).eq('id', id);
    if (updErr) console.error('handleTimeout error:', updErr);
  };

  const handlePhaseChange = async (newPhase) => {
    if (newPhase === 'battle') {
      setIsReady(true);
      const readinessKey = role === 'host' ? 'host_ready' : 'guest_ready';
      
      const { data: matchData } = await supabase.from('matches').select('game_state').eq('id', id).single();
      const currentGs = matchData?.game_state || {};
      
      // Merge my pieces into the master board to avoid overwriting opponent's deployment
      const currentBoard = currentGs.board || Array(8).fill(null).map(() => Array(9).fill(null));
      const mergedBoard = currentBoard.map((rArr, r) => 
        rArr.map((cell, c) => board[r][c]?.owner === role ? board[r][c] : cell)
      );

      const newGs = { 
        ...currentGs, 
        board: mergedBoard, 
        [readinessKey]: true,
        turn_start_at: (currentGs.host_ready || currentGs.guest_ready) ? currentGs.turn_start_at : new Date().toISOString()
      };
      
      if (newGs.host_ready && newGs.guest_ready) {
        newGs.phase = 'battle';
        newGs.turn_start_at = new Date().toISOString(); // Official battle start
      }
      
      await supabase.from('matches').update({ game_state: newGs }).eq('id', id);
    } else {
      setPhase(newPhase);
    }
  };

  const handleForfeit = async () => {
    if (winner || matchFinishedRef.current) { 
      navigate('/lobbies', { replace: true }); 
      return; 
    }

    const isStarting = (phase === 'deployment' || !match?.guest_id);
    const title = isStarting ? 'Leave Lobby?' : 'Forfeit Match?';
    const text  = isStarting 
      ? 'Are you sure you want to leave? This lobby will be closed.'
      : 'Are you sure you want to forfeit? This will count as a DEFEAT.';

    const confirm = await Swal.fire({
      title, text, icon: 'warning', showCancelButton: true,
      confirmButtonText: isStarting ? 'Yes, leave' : 'Yes, forfeit',
      cancelButtonText: 'Cancel', confirmButtonColor: '#FF3B30', cancelButtonColor: '#86868B',
      customClass: { popup: 'apple-swal', title: 'apple-swal-title', confirmButton: 'apple-swal-confirm', cancelButton: 'apple-swal-cancel' }
    });

    if (confirm.isConfirmed) {
      const opponentRole = role === 'host' ? 'guest' : 'host';
      const finalWinner = isStarting ? null : opponentRole;
      
      const { data: matchData } = await supabase.from('matches').select('host_id, guest_id, game_state').eq('id', id).single();
      const currentGs = matchData?.game_state || {};
      
      const newGs = {
        ...currentGs,
        winner: finalWinner,
        winner_id: finalWinner === 'host' ? matchData.host_id : (finalWinner === 'guest' ? matchData.guest_id : null),
        battle_log: [...(currentGs.battle_log || []), `${role.toUpperCase()} ${isStarting ? 'left' : 'forfeited'}.`]
      };

      const wId = finalWinner === 'host' ? matchData.host_id : (finalWinner === 'guest' ? matchData.guest_id : null);

      const { error: updErr } = await supabase.from('matches').update({
        status: isStarting ? 'cancelled' : 'completed',
        game_state: newGs,
        winner: finalWinner,
        winner_id: wId
      }).eq('id', id);

      if (!updErr) {
        matchFinishedRef.current = true;
        if (!isStarting) await processEloUpdate(opponentRole);
        navigate('/lobbies', { replace: true });
      }
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!match || !role) {
    return (
      <div className="container py-5 text-center mt-5">
        <div className="spinner-border text-primary mb-3" />
        <p className="text-muted">Loading match…</p>
      </div>
    );
  }

  // ── Waiting for opponent (Host) ────────────────────────────────────────────
  if (!match.guest_id && role === 'host') {
    return (
      <div className="page-container fit-screen d-flex align-items-center justify-content-center">
        <div className="container" style={{ maxWidth: 600 }}>
          <div className="glass-panel p-5 text-center position-relative overflow-hidden shadow-lg" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="position-relative z-1">
              <div className="mb-4 position-relative d-inline-block">
                <div className="rounded-circle overflow-hidden border border-white border-4 shadow-sm" style={{ width: 100, height: 100, background: '#fff' }}>
                  <img 
                    src={`https://api.dicebear.com/7.x/${profile?.avatar_style || 'notionists'}/svg?seed=${profile?.avatar_seed || profile?.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                    alt="Avatar" 
                    style={{ width: '100%', height: '100%' }} 
                  />
                </div>
                <div className="position-absolute bottom-0 end-0 bg-primary rounded-circle border border-white border-2 pulse-glow" style={{ width: 24, height: 24 }} />
              </div>

              <h3 className="fw-bold mb-1" style={{ letterSpacing: '-1px' }}>Waiting for Opponent</h3>
              <p className="text-muted mb-4">Your tactical lobby is ready. Share the code to begin.</p>
              
              <div className="p-4 rounded-4 mb-4" style={{ background: '#F5F5F7', border: '1px dashed rgba(0,0,0,0.1)' }}>
                <div className="text-muted small fw-bold mb-2" style={{ letterSpacing: '2px' }}>LOBBY CODE</div>
                <div style={{
                  fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: '3rem', letterSpacing: '8px',
                  fontWeight: 800, color: 'var(--system-blue)', textShadow: '0 4px 12px rgba(0, 122, 255, 0.15)'
                }}>
                  {lobbyCode}
                </div>
              </div>

              <div className="d-flex flex-column gap-3 align-items-center">
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <div className="spinner-border spinner-border-sm opacity-50" />
                  <span>Awaiting challenger join…</span>
                </div>
                
                <button className="btn btn-link text-danger text-decoration-none fw-bold small mt-3"
                  onClick={async () => {
                    await supabase.from('matches').update({ status: 'cancelled' }).eq('id', id);
                    navigate('/lobbies');
                  }}>
                  Cancel Matchmaking
                </button>
              </div>
            </div>

            <div style={{ position: 'absolute', top: -50, right: -50, opacity: 0.03, pointerEvents: 'none' }}>
              <Gamepad2 size={250} />
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse-glow {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 122, 255, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
          }
          .pulse-glow { animation: pulse-glow 2s infinite; }
        `}} />
      </div>
    );
  }

  // ── Active Game ────────────────────────────────────────────────────────────
  const myName   = profile?.username ?? (role === 'host' ? 'You' : 'You');
  const isMyTurn = currentTurn === role;

  return (
    <div className="battlefield-container overflow-hidden">
      <div className="d-flex flex-column" style={{ height: '100vh', padding: '0.75rem 1.25rem' }}>

        {/* Header */}
        <div className="d-flex align-items-center mb-3 gap-3">
          <button onClick={handleForfeit}
            className="btn btn-outline-danger btn-sm rounded-pill px-3 shadow-sm"
            style={{ fontSize: '0.78rem', fontWeight: 600 }}>
            {winner ? 'Back to Lobbies' : (phase === 'deployment' ? 'Leave Lobby' : 'Forfeit Match')}
          </button>
          <div>
            <h5 className="fw-bold mb-0">
              <span style={{ color: '#056d94' }}>{myName}</span>
              <span className="text-muted mx-2">vs</span>
              <span style={{ color: '#FF3B30' }}>{opponentName}</span>
            </h5>
            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
              Playing as <strong>{role?.toUpperCase()}</strong> · {isMyTurn ? 'Your turn' : 'Opponent\'s turn'}
            </small>
          </div>
        </div>

        <div className="flex-grow-1 overflow-hidden position-relative glass-panel p-2">
          <div className="h-100 overflow-auto no-scrollbar">
            <GameBoard
          board={board}       setBoard={setBoard}
          phase={phase}       setPhase={handlePhaseChange}
          currentTurn={currentTurn} setCurrentTurn={setCurrentTurn}
          playerRole={role}
          battleLog={battleLog} setBattleLog={setBattleLog}
          winner={winner}     setWinner={setWinner}
          onMove={syncToSupabase}
          onTimeout={handleTimeout}
          gameMode={match?.game_state?.game_mode || 'Normal'}
          turnStartAt={match?.game_state?.turn_start_at}
        />
        {isReady && phase === 'deployment' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(3px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10
          }}>
            <div className="spinner-border text-primary mb-3" />
            <h5 className="fw-bold text-dark">Waiting for opponent to deploy...</h5>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
