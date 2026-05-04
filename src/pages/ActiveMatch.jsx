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
  const { user, profile, refreshProfile } = useAuth();
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
  const [isViewingPieces, setIsViewingPieces] = useState(false);
  const [rrChangeAmount, setRrChangeAmount] = useState(null);
  const matchFinishedRef = useRef(false);
  const swalShownRef = useRef(false);
  const statsProcessedRef = useRef(false);

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
    // Note: guest_id can rejoin if it matches user.id
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
          
          // CRITICAL: If we are in "Viewing Mode", ignore board/phase updates from other players
          // to prevent the UI from reverting back to a previous state.
          if (isViewingPieces && payload.new.status === 'completed') {
            setMatch(prev => ({ ...prev, ...payload.new }));
            return;
          }

          if (payload.new.status === 'completed') matchFinishedRef.current = true;
          setMatch(prev => ({ ...prev, ...payload.new }));
          const gs = payload.new.game_state;
          if (gs) {
            if (gs.winner) matchFinishedRef.current = true;
            
            // Issue 6: During deployment, don't overwrite local pieces with opponent's board update
            if (gs.phase === 'deployment') {
              setBoard(prevBoard => {
                const nextBoard = gs.board || Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
                return prevBoard.map((rowArr, r) => 
                  rowArr.map((cell, c) => {
                    const incomingCell = nextBoard[r][c];
                    if (cell?.owner === role) return cell;
                    if (incomingCell?.owner !== role) return incomingCell;
                    return cell;
                  })
                );
              });
            } else if (!isViewingPieces) {
              // Only update board/phase if NOT viewing pieces
              setBoard(gs.board        ?? []);
              setPhase(gs.phase        ?? 'deployment');
              setCurrentTurn(gs.current_turn ?? 'host');
            }

            setBattleLog(gs.battle_log     ?? []);
            setWinner(gs.winner            ?? null);
            
            if (gs.phase === 'deployment' && gs.host_ready === false && gs.guest_ready === false) {
              setIsReady(false);
            }
          }
        })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [id, phase, winner]);
  
  // ── Lobby Expiration Check (Issue: 3-minute timer) ──────────────────────────
  useEffect(() => {
    if (!match || match.status !== 'waiting' || winner) return;
    
    const checkExpiration = async () => {
      const now = new Date();
      const created = new Date(match.created_at);
      const ageInMins = (now - created) / (1000 * 60);
      
      if (ageInMins > 3) {
        // Only host deletes, guest just leaves (if any, though status 'waiting' usually means no guest)
        if (match.host_id === user.id) {
          await supabase.from('matches').update({ status: 'expired' }).eq('id', id);
        }
        
        Swal.fire({
          title: 'Lobby Expired',
          text: 'This lobby has expired due to inactivity (3-minute limit).',
          icon: 'warning',
          confirmButtonColor: '#056d94',
          customClass: { popup: 'apple-swal', title: 'apple-swal-title', confirmButton: 'apple-swal-confirm' }
        }).then(() => navigate('/lobbies'));
      }
    };

    const interval = setInterval(checkExpiration, 10000); // Check every 10s
    checkExpiration(); // Initial check
    
    return () => clearInterval(interval);
  }, [match, winner, id, user.id]);

  // ── Deployment persistence (Issue 3) ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'deployment' || !role) return;
    const storageKey = `salpakan_deploy_${id}_${role}`;
    
    // On mount, check if we have a saved board
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setBoard(parsed);
      } catch (e) { console.warn('Failed to load saved deployment', e); }
    }
  }, [id, role]); // Run once on role/match load

  useEffect(() => {
    if (phase === 'deployment' && role) {
      const storageKey = `salpakan_deploy_${id}_${role}`;
      localStorage.setItem(storageKey, JSON.stringify(board));
    }
    if (phase === 'battle') {
      localStorage.removeItem(`salpakan_deploy_${id}_${role}`);
    }
  }, [board, phase, id, role]);

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
    if (!winner || !role || swalShownRef.current || rrChangeAmount === null) return;
    swalShownRef.current = true;
    
    const isWin = winner === role;
    const isTie = winner === 'tie';
    const isLossAtZero = !isWin && !isTie && (profile?.command_rating === 0);
    
    const rrText = rrChangeAmount >= 0 ? `+${rrChangeAmount}` : `${rrChangeAmount}`;
    const titleText = isLossAtZero ? 'Skill issue :(' : (isWin ? 'Victory' : (isTie ? 'Draw' : 'Defeated'));
    const bodyText = isLossAtZero 
      ? 'Try mo muna kaya mag AI.'
      : (isWin ? `You outmaneuvered your opponent! (${rrText} RR)` 
           : (isTie ? `Both flags were eliminated in a final stand. (${rrText} RR)` 
           : `${opponentName} captured your flag. (${rrText} RR)`));

    Swal.fire({
      title: titleText,
      text: bodyText,
      icon: isWin ? 'success' : (isTie ? 'info' : 'error'),
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Play Again',
      denyButtonText: 'View Pieces',
      cancelButtonText: 'Leave Lobby',
      confirmButtonColor: '#34C759',
      denyButtonColor: '#007AFF',
      cancelButtonColor: '#8E8E93',
      width: 500,
      customClass: {
        popup: 'apple-swal',
        title: 'apple-swal-title',
        confirmButton: 'apple-swal-confirm',
        cancelButton: 'apple-swal-cancel',
        denyButton: 'apple-swal-deny'
      }
    }).then(async (result) => {
      // Final Sealer safeguard for the host
      if (role === 'host' && match?.status === 'in_progress' && winner) {
        await supabase.from('matches').update({ 
          status: 'completed', 
          winner_id: winner === 'host' ? match.host_id : (winner === 'guest' ? match.guest_id : null)
        }).eq('id', id);
      }
      matchFinishedRef.current = true;
      
      if (result.isConfirmed) navigate('/lobbies', { replace: true });
      else if (result.isDenied) setIsViewingPieces(true);
      else navigate('/lobbies', { replace: true });
    });
  }, [winner, role, opponentName, rrChangeAmount]);

  // Trigger stat update for the current player
  useEffect(() => {
    // Wait until match is officially completed on the server to avoid race conditions
    if (winner && role && match?.status === 'completed' && !statsProcessedRef.current) {
      processEloUpdate(winner);
    }
  }, [winner, role, match?.status]);

  // ── Sealer: Host ensures status=completed if winner exists ────────────────
  useEffect(() => {
    const sealMatch = async () => {
      if (winner && match?.status === 'in_progress' && role === 'host') {
        console.log('Sealer: Attempting to finalize match status...');
        
        const winnerId = winner === 'host' ? match.host_id : (winner === 'guest' ? match.guest_id : null);
        
        // Strategy 1: Combined Update
        const { error: err1 } = await supabase.from('matches').update({ 
          status: 'completed', 
          winner_id: winnerId
        }).eq('id', id);

        if (err1) {
          console.warn('Sealer Strategy 1 failed, trying Strategy 2 (Status only)...', err1);
          // Strategy 2: Status Only
          const { error: err2 } = await supabase.from('matches').update({ status: 'completed' }).eq('id', id);
          if (err2) console.error('Sealer Strategy 2 failed:', err2);
          else console.log('Sealer Strategy 2 Success: Status marked completed.');
        } else {
          console.log('Sealer Strategy 1 Success: Match fully finalized.');
        }
      }
    };
    sealMatch();
  }, [winner, match?.status, role]);

  // ── Process Elo Update (Each player updates their own stats) ───────────────
  const processEloUpdate = async (finalWinnerRole) => {
    // SessionStorage guard is the most reliable way to prevent double-counting across re-renders
    const storageKey = `salpakan_processed_${id}`;
    if (sessionStorage.getItem(storageKey)) {
      console.log('EloUpdate: Match already processed, skipping.');
      return;
    }
    
    if (statsProcessedRef.current) return;
    statsProcessedRef.current = true;
    sessionStorage.setItem(storageKey, 'true');
    
    const hostId = match.host_id;
    const guestId = match.guest_id;
    if (!hostId || !guestId || !profile) return;

    // Fetch latest ratings for both to ensure calculation is accurate
    const { data: hostP } = await supabase.from('user_profiles').select('command_rating, peak_rating, wins, losses, draws').eq('id', hostId).single();
    const { data: guestP } = await supabase.from('user_profiles').select('command_rating, peak_rating, wins, losses, draws').eq('id', guestId).single();
    
    if (!hostP || !guestP) return;

    const hostCR = hostP.command_rating ?? 0;
    const guestCR = guestP.command_rating ?? 0;
    let hostScore = 0.5; // tie
    if (finalWinnerRole === 'host') hostScore = 1;
    else if (finalWinnerRole === 'guest') hostScore = 0;

    const { newA: newHostCR, newB: newGuestCR } = calculateElo(hostCR, guestCR, hostScore);
    
    const isHost = (role === 'host');
    const myNewCR = isHost ? newHostCR : newGuestCR;
    const myProfile = isHost ? hostP : guestP;
    const myScore = isHost ? hostScore : (1 - hostScore);
    const myChange = myNewCR - (isHost ? hostCR : guestCR);
    setRrChangeAmount(myChange);

    try {
      console.log(`StatsUpdate [${role}]: myScore=${myScore}, change=${myChange}`);
      
      const updatePayload = {
        command_rating: myNewCR,
        peak_rating: Math.max(myProfile.peak_rating || 0, myNewCR),
        wins: (myProfile.wins || 0) + (myScore === 1 ? 1 : 0),
        losses: (myProfile.losses || 0) + (myScore === 0 ? 1 : 0),
        draws: (myProfile.draws || 0) + (myScore === 0.5 ? 1 : 0)
      };

      // Update user profile
      const { error: profileError } = await supabase.from('user_profiles').update(updatePayload).eq('id', user.id);
      
      if (profileError) {
        console.error('Self profile update error:', profileError);
      } else {
        console.log('StatsUpdate Success:', updatePayload);
        refreshProfile(); 

        // ALSO update match game_state with the rating change so history can show it
        // We use the atomic RPC function to avoid any race conditions between players
        console.log(`[ELO] Sending RPC update for ${role}: ${myChange} RR`);
        const { error: rpcErr } = await supabase.rpc('update_match_rr', { 
          match_id: id, 
          role: role, 
          rr_change: myChange 
        });

        if (rpcErr) {
          console.warn('RPC update failed, falling back to manual merge:', rpcErr);
          // Fallback if the RPC isn't created yet
          const { data: latestMatch } = await supabase.from('matches').select('game_state').eq('id', id).single();
          if (latestMatch) {
            const currentGs = typeof latestMatch.game_state === 'string' ? JSON.parse(latestMatch.game_state) : (latestMatch.game_state || {});
            const updatedGs = { ...currentGs, [isHost ? 'host_rr_change' : 'guest_rr_change']: myChange };
            await supabase.from('matches').update({ game_state: updatedGs }).eq('id', id);
          }
        }
      }
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
      winner_id: wId
    }).eq('id', id);

    if (updErr) {
      console.warn('Full update failed, falling back to game_state only:', updErr);
      const { error: fallbackErr } = await supabase.from('matches').update({
        game_state: nextGs,
      }).eq('id', id);
      
      if (fallbackErr) console.error('syncToSupabase final failure:', fallbackErr);
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

  const handleSurrender = async () => {
    if (winner || matchFinishedRef.current) { 
      navigate('/lobbies', { replace: true }); 
      return; 
    }

    const isDeployment = phase === 'deployment';
    const isHost = role === 'host';
    
    // Context-aware messages
    let title = 'Surrender Match?';
    let text = 'Are you sure you want to surrender? This will count as a DEFEAT.';
    
    if (isDeployment) {
      if (isHost) {
        title = 'Close Lobby?';
        text = 'Are you sure you want to leave? This lobby will be closed for everyone.';
      } else {
        title = 'Leave Lobby?';
        text = 'Are you sure you want to leave this lobby?';
      }
    }

    const confirm = await Swal.fire({
      title, text, icon: 'warning', showCancelButton: true,
      confirmButtonText: (isDeployment && !isHost) ? 'Yes, leave' : (isDeployment ? 'Yes, close' : 'Yes, surrender'),
      cancelButtonText: 'Cancel', confirmButtonColor: '#FF3B30', cancelButtonColor: '#8E8E93',
      customClass: { popup: 'apple-swal', title: 'apple-swal-title', confirmButton: 'apple-swal-confirm', cancelButton: 'apple-swal-cancel' }
    });

    if (confirm.isConfirmed) {
      const opponentRole = role === 'host' ? 'guest' : 'host';
      const finalWinner = isDeployment ? null : opponentRole;
      
      const { data: matchData } = await supabase.from('matches').select('host_id, guest_id, game_state').eq('id', id).single();
      const currentGs = matchData?.game_state || {};
      
      const newGs = {
        ...currentGs,
        winner: finalWinner,
        winner_id: finalWinner === 'host' ? matchData.host_id : (finalWinner === 'guest' ? matchData.guest_id : null),
        battle_log: [...(currentGs.battle_log || []), `${role.toUpperCase()} ${isDeployment ? 'left' : 'surrendered'}.`]
      };

      const wId = finalWinner === 'host' ? matchData.host_id : (finalWinner === 'guest' ? matchData.guest_id : null);

      if (isDeployment) {
        if (isHost) {
          // Host leaves during deployment -> Cancel match
          await supabase.from('matches').update({ status: 'cancelled', game_state: newGs }).eq('id', id);
        } else {
          // Guest leaves during deployment -> Clear guest slot, don't cancel
          await supabase.from('matches').update({ guest_id: null, status: 'waiting' }).eq('id', id);
        }
        matchFinishedRef.current = true;
        navigate('/lobbies', { replace: true });
      } else {
        // Surrender during battle -> Complete match
        await supabase.from('matches').update({
          status: 'completed',
          game_state: newGs,
          winner_id: wId
        }).eq('id', id);
        
        // IMPORTANT: Process stats for the surrendering player locally
        await processEloUpdate(finalWinner);
        
        // Note: We don't navigate here. The useEffect watching the 'winner' state 
        // will trigger the final Victory/Defeat popup, which handles navigation.
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
                    src={`https://api.dicebear.com/9.x/${profile?.avatar_style || 'big-ears-neutral'}/svg?seed=${profile?.avatar_seed || profile?.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
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
      <div className="d-flex flex-column h-100 p-0">
        <div className="flex-grow-1 overflow-hidden position-relative p-0">
          <div className="h-100 overflow-auto no-scrollbar">
            {/* Header */}
            <div className="px-4 pt-3 pb-2 text-center">
              <h5 className="fw-bold mb-0">
                <span style={{ color: '#056d94' }}>{myName}</span>
                <span className="text-muted mx-2">vs</span>
                <span style={{ color: '#FF3B30' }}>{opponentName}</span>
              </h5>
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                Playing as <strong>{role?.toUpperCase()}</strong> · {isMyTurn ? 'Your turn' : 'Opponent\'s turn'}
              </small>
            </div>
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
              matchCreatedAt={match?.created_at}
              onSurrender={handleSurrender}
              onPlayAgain={() => navigate('/lobbies', { replace: true })}
              onLeave={() => navigate('/lobbies', { replace: true })}
              isViewingPieces={isViewingPieces}
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
